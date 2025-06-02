# MCP服务器开发与Stream连接指南

本文档提供了如何开发Model Context Protocol (MCP)服务器以及如何建立Stream连接的详细指南。

## 目录

- [什么是MCP](#什么是mcp)
- [MCP服务器架构](#mcp服务器架构)
- [开发MCP服务器](#开发mcp服务器)
  - [基础设置](#基础设置)
  - [创建MCP服务器](#创建mcp服务器)
  - [注册工具](#注册工具)
  - [启动服务器](#启动服务器)
- [建立Stream连接](#建立stream连接)
  - [HTTP Stream方式](#http-stream方式)
  - [SSE传输方式](#sse传输方式)
  - [Streamable传输方式](#streamable传输方式)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

## 什么是MCP

Model Context Protocol (MCP) 是一种用于与AI模型交互的协议，它允许开发者定义和使用工具（tools）来扩展模型的能力。MCP服务器作为模型与工具之间的桥梁，负责处理请求、调用相应的工具，并将结果返回给模型。

## MCP服务器架构

MCP服务器的核心架构包括：

1. **传输层**：处理与客户端的通信，支持多种传输方式（stdio、SSE、HTTP Stream等）
2. **工具注册**：注册和管理可供模型调用的工具
3. **提示词处理**：加载和处理YAML格式的提示词模板
4. **请求处理**：解析请求，调用相应的工具，并返回结果

## 开发MCP服务器

### 基础设置

首先，创建一个新项目并安装必要的依赖：

```bash
# 创建项目目录
mkdir my-mcp-server
cd my-mcp-server

# 初始化项目
npm init -y

# 安装依赖
npm install @modelcontextprotocol/sdk express zod yaml fs-extra
npm install typescript @types/node @types/express --save-dev
```

创建基本的项目结构：

```
my-mcp-server/
├── src/
│   ├── index.ts         # 入口文件
│   ├── server.ts        # MCP服务器创建
│   ├── tools/           # 工具定义
│   └── transportUtils/  # 传输方式实现
├── prompts/             # 提示词模板
├── tsconfig.json        # TypeScript配置
└── package.json
```

### 创建MCP服务器

在`src/server.ts`中创建MCP服务器：

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import path from "path";
import fs from "fs-extra";
import yaml from "yaml";

export async function createMcpServer(options: {
  promptsDir?: string;
}) {
  // 创建MCP服务器实例
  const server = new McpServer();
  
  // 注册工具
  registerTools(server);
  
  // 加载提示词模板
  if (options.promptsDir) {
    await loadPrompts(server, options.promptsDir);
  }
  
  return server;
}

// 注册工具
function registerTools(server: McpServer) {
  // 这里可以注册各种工具
  server.tool(
    "echo",
    { message: z.string().describe("要回显的消息") },
    { usage: "回显消息" },
    async ({ message }) => {
      return {
        content: [{ type: "text", text: message }]
      };
    }
  );
}

// 加载提示词模板
async function loadPrompts(server: McpServer, promptsDir: string) {
  const files = await fs.readdir(promptsDir);
  
  for (const file of files) {
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      const filePath = path.join(promptsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const prompt = yaml.parse(content);
      
      // 将提示词转换为工具
      convertPromptToTool(server, prompt);
    }
  }
}

// 将提示词转换为工具
function convertPromptToTool(server: McpServer, prompt: any) {
  // 实现提示词到工具的转换逻辑
  // ...
}
```

### 注册工具

在`src/tools/index.ts`中定义和注册工具：

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

export function registerTools(server: McpServer) {
  // 注册简单工具
  server.tool(
    "calculator",
    {
      expression: z.string().describe("要计算的数学表达式")
    },
    {
      usage: "计算数学表达式"
    },
    async ({ expression }) => {
      try {
        // 注意：在实际应用中应使用安全的方法进行计算
        const result = eval(expression);
        return {
          content: [{ type: "text", text: `计算结果: ${result}` }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `计算错误: ${error.message}` }]
        };
      }
    }
  );
}
```

### 启动服务器

在`src/index.ts`中创建入口文件：

```typescript
import { createMcpServer } from "./server";
import { createTransport } from "./transportUtils";

async function main() {
  const transportType = process.argv[2] || "stdio";
  const port = parseInt(process.argv[3] || "3000");
  const endpoint = process.argv[4] || "/mcp";
  
  const server = await createMcpServer({
    promptsDir: "./prompts"
  });
  
  const transport = createTransport(transportType, {
    port,
    endpoint,
    server
  });
  
  await transport.start();
  console.log(`MCP服务器已启动，传输方式: ${transportType}`);
}

main().catch(console.error);
```

## 建立Stream连接

MCP服务器支持多种传输方式，包括HTTP Stream、SSE和Streamable。下面我们将详细介绍如何建立这些Stream连接。

### HTTP Stream方式

HTTP Stream是一种基于HTTP长连接的传输方式，它允许服务器向客户端持续发送数据。

在`src/transportUtils/httpStream.ts`中实现HTTP Stream传输：

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import express from "express";
import http from "http";

export function createHttpStreamTransport(options: {
  port: number;
  endpoint: string;
  server: McpServer;
}) {
  const { port, endpoint, server } = options;
  const app = express();
  
  // 解析JSON请求体
  app.use(express.json());
  
  // 设置CORS
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });
  
  // 创建HTTP Stream端点
  app.post(endpoint, async (req, res) => {
    // 设置响应头，启用流传输
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    
    // 创建响应流
    const stream = {
      write: (data: any) => {
        res.write(JSON.stringify(data) + "\n");
      },
      end: () => {
        res.end();
      }
    };
    
    try {
      // 处理请求
      await server.handleRequest(req.body, {
        onContent: (content) => {
          stream.write({ type: "content", content });
        },
        onEnd: () => {
          stream.end();
        },
        onError: (error) => {
          stream.write({ type: "error", error: error.message });
          stream.end();
        }
      });
    } catch (error) {
      stream.write({ type: "error", error: error.message });
      stream.end();
    }
  });
  
  // 创建HTTP服务器
  const httpServer = http.createServer(app);
  
  return {
    start: () => {
      return new Promise<void>((resolve) => {
        httpServer.listen(port, () => {
          console.log(`HTTP Stream服务器已启动，端口: ${port}，端点: ${endpoint}`);
          resolve();
        });
      });
    },
    close: () => {
      return new Promise<void>((resolve) => {
        httpServer.close(() => {
          console.log("HTTP Stream服务器已关闭");
          resolve();
        });
      });
    }
  };
}
```

### SSE传输方式

Server-Sent Events (SSE) 是一种服务器推送技术，允许服务器向客户端推送数据。

在`src/transportUtils/sse.ts`中实现SSE传输：

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import express from "express";
import http from "http";

export function createSseTransport(options: {
  port: number;
  endpoint: string;
  server: McpServer;
}) {
  const { port, endpoint, server } = options;
  const app = express();
  
  // 解析JSON请求体
  app.use(express.json());
  
  // 设置CORS
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });
  
  // 创建SSE端点
  app.get(endpoint, (req, res) => {
    // 设置SSE响应头
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    
    // 发送初始连接成功消息
    res.write("event: connected\ndata: {}\n\n");
    
    // 保持连接活跃
    const keepAliveInterval = setInterval(() => {
      res.write(": keepalive\n\n");
    }, 30000);
    
    // 处理连接关闭
    req.on("close", () => {
      clearInterval(keepAliveInterval);
    });
  });
  
  // 创建请求处理端点
  app.post(`${endpoint}/request`, async (req, res) => {
    const requestId = req.body.id || Date.now().toString();
    const clientId = req.body.clientId || "anonymous";
    
    // 查找客户端连接
    const clientRes = getClientConnection(clientId);
    if (!clientRes) {
      return res.status(404).json({ error: "Client not connected" });
    }
    
    try {
      // 处理请求
      await server.handleRequest(req.body.request, {
        onContent: (content) => {
          sendSseEvent(clientRes, "content", {
            requestId,
            content
          });
        },
        onEnd: () => {
          sendSseEvent(clientRes, "end", { requestId });
        },
        onError: (error) => {
          sendSseEvent(clientRes, "error", {
            requestId,
            error: error.message
          });
        }
      });
      
      res.json({ success: true, requestId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // 客户端连接管理
  const clientConnections = new Map<string, express.Response>();
  
  function getClientConnection(clientId: string) {
    return clientConnections.get(clientId);
  }
  
  function sendSseEvent(res: express.Response, event: string, data: any) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
  
  // 创建HTTP服务器
  const httpServer = http.createServer(app);
  
  return {
    start: () => {
      return new Promise<void>((resolve) => {
        httpServer.listen(port, () => {
          console.log(`SSE服务器已启动，端口: ${port}，端点: ${endpoint}`);
          resolve();
        });
      });
    },
    close: () => {
      return new Promise<void>((resolve) => {
        httpServer.close(() => {
          console.log("SSE服务器已关闭");
          resolve();
        });
      });
    }
  };
}
```

### Streamable传输方式

Streamable是一种更通用的流传输接口，可以适配不同的传输方式。

在`src/transportUtils/streamable.ts`中实现Streamable传输：

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Readable } from "stream";

export function createStreamableTransport(options: {
  server: McpServer;
}) {
  const { server } = options;
  
  return {
    createStream: (request: any) => {
      // 创建可读流
      const readable = new Readable({
        objectMode: true,
        read() {} // 这是必需的，但我们不需要在这里实现任何逻辑
      });
      
      // 处理请求
      server.handleRequest(request, {
        onContent: (content) => {
          readable.push({
            type: "content",
            content
          });
        },
        onEnd: () => {
          readable.push(null); // 表示流结束
        },
        onError: (error) => {
          readable.push({
            type: "error",
            error: error.message
          });
          readable.push(null);
        }
      }).catch((error) => {
        readable.push({
          type: "error",
          error: error.message
        });
        readable.push(null);
      });
      
      return readable;
    },
    
    start: () => Promise.resolve(),
    close: () => Promise.resolve()
  };
}
```

在`src/transportUtils/index.ts`中统一导出所有传输方式：

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { createHttpStreamTransport } from "./httpStream";
import { createSseTransport } from "./sse";
import { createStreamableTransport } from "./streamable";
import { createStdioTransport } from "./stdio";

export function createTransport(type: string, options: {
  port?: number;
  endpoint?: string;
  server: McpServer;
}) {
  const { port = 3000, endpoint = "/mcp", server } = options;
  
  switch (type) {
    case "http":
    case "stream":
      return createHttpStreamTransport({ port, endpoint, server });
    case "sse":
      return createSseTransport({ port, endpoint, server });
    case "streamable":
      return createStreamableTransport({ server });
    case "stdio":
    default:
      return createStdioTransport({ server });
  }
}
```

## 最佳实践

1. **错误处理**：始终在Stream传输中妥善处理错误，确保错误信息被正确传递给客户端。

2. **保持连接活跃**：对于长连接（如SSE），定期发送keepalive消息以防止连接超时。

3. **资源清理**：在连接关闭时，确保清理所有相关资源，如定时器和临时文件。

4. **超时处理**：为请求设置合理的超时时间，避免长时间挂起的请求占用资源。

5. **限流**：实现请求限流机制，防止服务器过载。

## 故障排除

1. **连接断开**：检查网络连接和防火墙设置，确保服务器和客户端之间的连接稳定。

2. **内存泄漏**：监控服务器内存使用情况，确保在处理大量请求时不会出现内存泄漏。

3. **响应延迟**：如果响应时间过长，可能是由于处理逻辑复杂或服务器负载过高，考虑优化代码或增加服务器资源。

4. **CORS问题**：确保正确设置CORS头，允许跨域请求。

5. **数据格式错误**：验证请求和响应的数据格式是否符合预期，特别是在处理复杂的JSON结构时。

---

通过本指南，您应该能够开发一个功能完善的MCP服务器，并使用不同的Stream连接方式与客户端进行通信。如果您有任何问题或需要进一步的帮助，请随时查阅相关文档或联系我们的支持团队。 