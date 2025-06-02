# MCP传输协议、可恢复性与重传机制分析

## 目录

- [概述](#概述)
- [MCP传输方式](#mcp传输方式)
  - [stdio传输](#stdio传输)
  - [Streamable HTTP传输](#streamable-http传输)
- [消息传输流程](#消息传输流程)
  - [向服务器发送消息](#向服务器发送消息)
  - [接收服务器消息](#接收服务器消息)
  - [多连接管理](#多连接管理)
- [可恢复性与重传机制](#可恢复性与重传机制)
  - [事件ID机制](#事件id机制)
  - [断线重连实现](#断线重连实现)
  - [Last-Event-ID头部使用](#last-event-id头部使用)
- [会话管理](#会话管理)
  - [会话ID分配](#会话id分配)
  - [会话维护](#会话维护)
  - [会话终止](#会话终止)
- [代码实现参考](#代码实现参考)
  - [可恢复SSE传输实现](#可恢复sse传输实现)
  - [会话管理实现](#会话管理实现)
- [安全注意事项](#安全注意事项)
- [向后兼容性](#向后兼容性)
- [最佳实践](#最佳实践)

## 概述

Model Context Protocol (MCP) 是一种用于AI模型与工具交互的协议，它使用JSON-RPC编码消息，并支持多种传输机制。本文档重点分析MCP的传输协议、可恢复性和重传机制，特别是基于官方规范2025-03-26版本中的内容，并结合本项目的代码实现。

## MCP传输方式

MCP协议定义了两种标准传输机制：stdio和Streamable HTTP。

### stdio传输

stdio传输是一种简单的传输方式，适用于客户端直接启动MCP服务器作为子进程的场景：

- 客户端启动MCP服务器作为子进程
- 服务器从标准输入(stdin)读取JSON-RPC消息，向标准输出(stdout)发送消息
- 消息以换行符分隔，且不能包含嵌入的换行符
- 服务器可以向标准错误(stderr)写入UTF-8字符串用于日志记录

在我们的项目中，stdio传输的实现示例：

```typescript
// src/transportUtils/stdio.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import readline from "readline";

export function createStdioTransport(options: {
  server: McpServer;
}) {
  const { server } = options;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return {
    start: () => {
      // 处理输入消息
      rl.on("line", async (line) => {
        try {
          const message = JSON.parse(line);
          
          await server.handleRequest(message, {
            onContent: (content) => {
              process.stdout.write(JSON.stringify({ type: "content", content }) + "\n");
            },
            onEnd: () => {
              // 流结束时不需要特殊处理
            },
            onError: (error) => {
              process.stdout.write(JSON.stringify({ type: "error", error: error.message }) + "\n");
            }
          });
        } catch (error) {
          process.stdout.write(JSON.stringify({ type: "error", error: error.message }) + "\n");
        }
      });
      
      return Promise.resolve();
    },
    close: () => {
      rl.close();
      return Promise.resolve();
    }
  };
}
```

### Streamable HTTP传输

Streamable HTTP传输是2025-03-26版本中引入的新传输方式，替代了之前版本的HTTP+SSE传输：

- 服务器作为独立进程运行，可以处理多个客户端连接
- 使用HTTP POST和GET请求进行通信
- 支持使用Server-Sent Events (SSE)进行服务器到客户端的流式传输
- 提供单一HTTP端点（MCP端点）同时支持POST和GET方法

## 消息传输流程

### 向服务器发送消息

客户端向服务器发送消息的流程如下：

1. 客户端必须使用HTTP POST向MCP端点发送JSON-RPC消息
2. 请求必须包含Accept头，列出application/json和text/event-stream作为支持的内容类型
3. 请求体可以是单个JSON-RPC请求、通知、响应，或者是这些消息的批处理数组
4. 如果输入仅包含JSON-RPC响应或通知：
   - 服务器接受输入时，必须返回HTTP状态码202 Accepted，无响应体
   - 服务器不接受输入时，必须返回HTTP错误状态码（如400 Bad Request）
5. 如果输入包含任何JSON-RPC请求，服务器必须返回Content-Type: text/event-stream（启动SSE流）或Content-Type: application/json（返回一个JSON对象）

在我们的项目中实现向服务器发送消息的代码示例：

```typescript
// 客户端发送消息的示例代码
async function sendMessageToServer(endpoint, message) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    },
    body: JSON.stringify(message)
  });
  
  // 处理响应
  if (response.headers.get('Content-Type') === 'text/event-stream') {
    // 处理SSE流
    handleSseStream(response);
  } else if (response.headers.get('Content-Type') === 'application/json') {
    // 处理JSON响应
    const jsonResponse = await response.json();
    handleJsonResponse(jsonResponse);
  }
}
```

### 接收服务器消息

客户端接收服务器消息的流程如下：

1. 客户端可以发起HTTP GET请求到MCP端点，打开SSE流以接收服务器消息
2. 请求必须包含Accept头，列出text/event-stream作为支持的内容类型
3. 服务器必须返回Content-Type: text/event-stream或HTTP 405 Method Not Allowed
4. 在SSE流上：
   - 服务器可以发送JSON-RPC请求和通知
   - 这些消息应该与客户端当前运行的JSON-RPC请求无关
   - 服务器不能发送JSON-RPC响应，除非是恢复与先前客户端请求相关的流
   - 服务器和客户端都可以随时关闭SSE流

在我们的项目中实现接收服务器消息的代码示例：

```typescript
// 客户端接收服务器消息的示例代码
function openServerMessageStream(endpoint) {
  const eventSource = new EventSource(endpoint);
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleServerMessage(data);
    } catch (error) {
      console.error('解析服务器消息时出错:', error);
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE连接错误:', error);
    // 实现重连逻辑
    setTimeout(() => {
      eventSource.close();
      openServerMessageStream(endpoint);
    }, 3000);
  };
  
  return eventSource;
}
```

### 多连接管理

MCP协议支持多连接管理：

1. 客户端可以同时保持多个SSE流连接
2. 服务器必须在仅一个连接的流上发送每个JSON-RPC消息，不能广播相同消息到多个流
3. 可以通过使流可恢复来减轻消息丢失的风险

## 可恢复性与重传机制

### 事件ID机制

为了支持断开连接后的恢复和可能丢失的消息重传，MCP协议定义了以下机制：

1. 服务器可以为SSE事件附加id字段，如SSE标准所述
2. 如果存在，ID必须在该会话的所有流中全局唯一，或者在没有会话管理的情况下，在与特定客户端的所有流中全局唯一

### 断线重连实现

当连接断开后，客户端可以通过以下方式恢复连接：

1. 客户端应该向MCP端点发起HTTP GET请求
2. 请求中应包含Last-Event-ID头，指示最后接收到的事件ID
3. 服务器可以使用此头部重放在断开连接的流上本应发送的消息，并从该点恢复流
4. 服务器不能重放本应在不同流上传递的消息

### Last-Event-ID头部使用

Last-Event-ID头部是实现可恢复性的关键：

```typescript
// 断线重连时使用Last-Event-ID的示例代码
function reconnectWithLastEventId(endpoint, lastEventId) {
  const headers = new Headers({
    'Accept': 'text/event-stream'
  });
  
  if (lastEventId) {
    headers.append('Last-Event-ID', lastEventId);
  }
  
  fetch(endpoint, {
    method: 'GET',
    headers: headers
  })
  .then(response => {
    if (response.headers.get('Content-Type') === 'text/event-stream') {
      // 处理恢复的SSE流
      handleReconnectedSseStream(response);
    } else {
      console.error('服务器不支持SSE流恢复');
    }
  })
  .catch(error => {
    console.error('重连失败:', error);
  });
}
```

## 会话管理

### 会话ID分配

MCP会话由客户端和服务器之间的逻辑相关交互组成，从初始化阶段开始：

1. 使用Streamable HTTP传输的服务器可以在初始化时分配会话ID
2. 会话ID通过包含在包含InitializeResult的HTTP响应的Mcp-Session-Id头中分配
3. 会话ID应该是全局唯一且加密安全的（例如，安全生成的UUID、JWT或加密哈希）
4. 会话ID必须仅包含可见的ASCII字符（范围从0x21到0x7E）

### 会话维护

会话维护的关键点：

1. 如果服务器在初始化期间返回Mcp-Session-Id，使用Streamable HTTP传输的客户端必须在所有后续HTTP请求中包含它
2. 需要会话ID的服务器应该对没有Mcp-Session-Id头的请求（初始化除外）响应HTTP 400 Bad Request
3. 服务器可以随时终止会话，之后必须对包含该会话ID的请求响应HTTP 404 Not Found

### 会话终止

会话终止的处理：

1. 当客户端收到对包含Mcp-Session-Id的请求的HTTP 404响应时，必须通过发送不附加会话ID的新InitializeRequest来启动新会话
2. 不再需要特定会话的客户端应该向MCP端点发送带有Mcp-Session-Id头的HTTP DELETE，以显式终止会话
3. 服务器可以对此请求响应HTTP 405 Method Not Allowed，表明服务器不允许客户端终止会话

## 代码实现参考

### 可恢复SSE传输实现

以下是在我们项目中实现可恢复SSE传输的代码示例：

```typescript
// src/transportUtils/resumableSse.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import express from "express";
import http from "http";
import crypto from "crypto";

export function createResumableSseTransport(options: {
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
    res.header("Access-Control-Allow-Headers", "Content-Type, Last-Event-ID, Mcp-Session-Id");
    next();
  });
  
  // 存储客户端连接和事件历史
  const clientConnections = new Map<string, express.Response>();
  const eventHistory = new Map<string, Array<{id: string, event: string, data: any}>>();
  const eventIdCounter = new Map<string, number>();
  
  // 创建SSE端点
  app.get(endpoint, (req, res) => {
    // 获取会话ID
    const sessionId = req.headers['mcp-session-id'] as string;
    if (sessionId && !validateSessionId(sessionId)) {
      return res.status(400).json({ error: "Invalid session ID" });
    }
    
    // 获取Last-Event-ID
    const lastEventId = req.headers['last-event-id'] as string;
    
    // 设置SSE响应头
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    
    // 生成客户端ID
    const clientId = sessionId || crypto.randomUUID();
    
    // 存储客户端连接
    clientConnections.set(clientId, res);
    
    // 如果有Last-Event-ID，发送错过的事件
    if (lastEventId && eventHistory.has(clientId)) {
      const events = eventHistory.get(clientId) || [];
      const missedEvents = events.filter(e => e.id > lastEventId);
      
      for (const event of missedEvents) {
        sendSseEvent(res, event.event, event.data, event.id);
      }
    }
    
    // 发送初始连接成功消息
    const initialEventId = getNextEventId(clientId);
    sendSseEvent(res, "connected", {}, initialEventId);
    
    // 保持连接活跃
    const keepAliveInterval = setInterval(() => {
      res.write(": keepalive\n\n");
    }, 30000);
    
    // 处理连接关闭
    req.on("close", () => {
      clearInterval(keepAliveInterval);
      clientConnections.delete(clientId);
    });
  });
  
  // 创建请求处理端点
  app.post(endpoint, async (req, res) => {
    // 获取会话ID
    const sessionId = req.headers['mcp-session-id'] as string;
    if (sessionId && !validateSessionId(sessionId)) {
      return res.status(400).json({ error: "Invalid session ID" });
    }
    
    // 处理初始化请求
    if (isInitializeRequest(req.body)) {
      try {
        const initResult = await server.handleRequest(req.body, {
          onContent: () => {},
          onEnd: () => {},
          onError: () => {}
        });
        
        // 生成新的会话ID
        const newSessionId = crypto.randomUUID();
        
        // 返回初始化结果和会话ID
        res.setHeader("Mcp-Session-Id", newSessionId);
        res.json(initResult);
        return;
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    }
    
    // 验证会话ID（对于非初始化请求）
    if (!sessionId) {
      return res.status(400).json({ error: "Missing session ID" });
    }
    
    // 查找客户端连接
    const clientRes = clientConnections.get(sessionId);
    if (!clientRes) {
      return res.status(404).json({ error: "Client not connected" });
    }
    
    const requestId = req.body.id || Date.now().toString();
    
    try {
      // 处理请求
      await server.handleRequest(req.body, {
        onContent: (content) => {
          const eventId = getNextEventId(sessionId);
          const event = {
            id: eventId,
            event: "content",
            data: { requestId, content }
          };
          
          // 存储事件历史
          storeEvent(sessionId, event);
          
          // 发送事件
          sendSseEvent(clientRes, event.event, event.data, event.id);
        },
        onEnd: () => {
          const eventId = getNextEventId(sessionId);
          const event = {
            id: eventId,
            event: "end",
            data: { requestId }
          };
          
          // 存储事件历史
          storeEvent(sessionId, event);
          
          // 发送事件
          sendSseEvent(clientRes, event.event, event.data, event.id);
        },
        onError: (error) => {
          const eventId = getNextEventId(sessionId);
          const event = {
            id: eventId,
            event: "error",
            data: { requestId, error: error.message }
          };
          
          // 存储事件历史
          storeEvent(sessionId, event);
          
          // 发送事件
          sendSseEvent(clientRes, event.event, event.data, event.id);
        }
      });
      
      res.json({ success: true, requestId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // 会话终止端点
  app.delete(endpoint, (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string;
    if (!sessionId) {
      return res.status(400).json({ error: "Missing session ID" });
    }
    
    // 清理会话资源
    clientConnections.delete(sessionId);
    eventHistory.delete(sessionId);
    eventIdCounter.delete(sessionId);
    
    res.status(200).json({ success: true });
  });
  
  // 辅助函数
  function validateSessionId(sessionId: string): boolean {
    // 会话ID必须仅包含可见的ASCII字符（范围从0x21到0x7E）
    return /^[\x21-\x7E]+$/.test(sessionId);
  }
  
  function isInitializeRequest(request: any): boolean {
    return request.method === "initialize";
  }
  
  function getNextEventId(clientId: string): string {
    const counter = (eventIdCounter.get(clientId) || 0) + 1;
    eventIdCounter.set(clientId, counter);
    return counter.toString();
  }
  
  function storeEvent(clientId: string, event: {id: string, event: string, data: any}) {
    if (!eventHistory.has(clientId)) {
      eventHistory.set(clientId, []);
    }
    
    const events = eventHistory.get(clientId)!;
    events.push(event);
    
    // 限制历史记录大小
    if (events.length > 1000) {
      events.shift();
    }
  }
  
  function sendSseEvent(res: express.Response, event: string, data: any, id?: string) {
    let message = `event: ${event}\ndata: ${JSON.stringify(data)}\n`;
    if (id) {
      message = `id: ${id}\n${message}`;
    }
    res.write(`${message}\n`);
  }
  
  // 创建HTTP服务器
  const httpServer = http.createServer(app);
  
  return {
    start: () => {
      return new Promise<void>((resolve) => {
        httpServer.listen(port, () => {
          console.log(`可恢复SSE服务器已启动，端口: ${port}，端点: ${endpoint}`);
          resolve();
        });
      });
    },
    close: () => {
      return new Promise<void>((resolve) => {
        httpServer.close(() => {
          console.log("可恢复SSE服务器已关闭");
          resolve();
        });
      });
    }
  };
}
```

### 会话管理实现

以下是在我们项目中实现会话管理的代码示例：

```typescript
// src/sessionManager.ts
import crypto from "crypto";

export class SessionManager {
  private sessions = new Map<string, {
    lastActivity: number;
    data: Record<string, any>;
  }>();
  
  private sessionTimeout = 30 * 60 * 1000; // 30分钟超时
  
  constructor() {
    // 定期清理过期会话
    setInterval(() => this.cleanupSessions(), 5 * 60 * 1000);
  }
  
  /**
   * 创建新会话
   */
  createSession(): string {
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, {
      lastActivity: Date.now(),
      data: {}
    });
    return sessionId;
  }
  
  /**
   * 验证会话是否有效
   */
  validateSession(sessionId: string): boolean {
    if (!this.sessions.has(sessionId)) {
      return false;
    }
    
    const session = this.sessions.get(sessionId)!;
    const now = Date.now();
    
    // 检查会话是否过期
    if (now - session.lastActivity > this.sessionTimeout) {
      this.sessions.delete(sessionId);
      return false;
    }
    
    // 更新最后活动时间
    session.lastActivity = now;
    return true;
  }
  
  /**
   * 终止会话
   */
  terminateSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
  
  /**
   * 获取会话数据
   */
  getSessionData(sessionId: string): Record<string, any> | null {
    if (!this.validateSession(sessionId)) {
      return null;
    }
    
    return this.sessions.get(sessionId)!.data;
  }
  
  /**
   * 设置会话数据
   */
  setSessionData(sessionId: string, key: string, value: any): boolean {
    if (!this.validateSession(sessionId)) {
      return false;
    }
    
    this.sessions.get(sessionId)!.data[key] = value;
    return true;
  }
  
  /**
   * 清理过期会话
   */
  private cleanupSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.sessionTimeout) {
        this.sessions.delete(sessionId);
      }
    }
  }
}
```

## 安全注意事项

实现Streamable HTTP传输时，需要注意以下安全警告：

1. 服务器必须验证所有传入连接的Origin头，以防止DNS重绑定攻击
2. 在本地运行时，服务器应该只绑定到localhost (127.0.0.1)，而不是所有网络接口(0.0.0.0)
3. 服务器应该为所有连接实现适当的身份验证

没有这些保护措施，攻击者可能会使用DNS重绑定从远程网站与本地MCP服务器交互。

在我们的项目中实现安全措施的代码示例：

```typescript
// 安全措施实现示例
app.use((req, res, next) => {
  // 验证Origin头
  const origin = req.headers.origin;
  const allowedOrigins = ['https://example.com', 'http://localhost:3000'];
  
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: "Forbidden: Origin not allowed" });
  }
  
  // 设置CORS头
  res.header("Access-Control-Allow-Origin", origin || "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Last-Event-ID, Mcp-Session-Id");
  next();
});

// 服务器启动时只绑定到localhost
httpServer.listen(port, "127.0.0.1", () => {
  console.log(`安全的MCP服务器已启动，端口: ${port}，端点: ${endpoint}`);
});
```

## 向后兼容性

为了与旧版本的HTTP+SSE传输（来自协议版本2024-11-05）保持向后兼容性：

1. 服务器应该同时托管旧传输的SSE和POST端点，以及新的"MCP端点"
2. 客户端应该接受指向使用旧传输或新传输的服务器的MCP服务器URL
3. 客户端应尝试向服务器URL发送InitializeRequest，如果成功，则假定这是支持新Streamable HTTP传输的服务器
4. 如果失败，客户端应尝试向服务器URL发送GET请求，如果返回SSE流和endpoint事件，则假定这是运行旧HTTP+SSE传输的服务器

## 最佳实践

1. **事件ID管理**：为每个SSE事件分配唯一ID，以支持断线重连和消息重传
2. **会话超时处理**：实现合理的会话超时机制，避免资源泄漏
3. **错误处理**：妥善处理连接错误和消息处理错误
4. **安全验证**：验证所有请求的来源和会话ID
5. **资源清理**：在连接关闭或会话终止时清理相关资源
6. **限制历史记录**：限制存储的事件历史记录大小，避免内存溢出
7. **心跳机制**：实现定期心跳消息，保持连接活跃

通过遵循这些最佳实践和实现MCP协议定义的可恢复性和重传机制，我们可以构建一个可靠、高效的MCP服务器，为AI模型和工具之间提供稳定的通信桥梁。 