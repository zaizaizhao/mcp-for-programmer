import { runSseServer, runStdioServer, runStreamableServer, createMcpServer } from './server';
import { createExpressServer } from './backend/createExpressServer';
import { parseArgs } from 'node:util';

// 添加调试日志
console.log("MCP for Programmer 启动中...");
console.log("当前工作目录:", process.cwd());
console.log("命令行参数:", process.argv);

// 导出主要API和类型
export { createMcpServer, runSseServer, runStdioServer, runStreamableServer } from './server';
export { createExpressServer } from './backend/createExpressServer';
export * from './tools/initTools';
export * from './transportUtils';

// 创建Express服务器
const { app, server } = createExpressServer();

// 定义端口 - 使用一个不太常用的端口，并添加环境变量支持
const DEFAULT_PORT = 8765; // 使用不太常见的端口号
const PORT = process.env.MCP_EXPRESS_PORT ? parseInt(process.env.MCP_EXPRESS_PORT, 10) : DEFAULT_PORT;

// 判断是否是Inspector模式
const isInspectorMode = process.argv.some(arg => arg.includes('@modelcontextprotocol/inspector'));
console.log("是否为Inspector模式:", isInspectorMode);

const { values } = parseArgs({
  options:{
    transport: {
      type: "string",
      short: "t",
      default: "stdio",
    },
    port: {
      type: "string",
      short: "p",
      default: "1122",
    },
    endpoint: {
      type: "string",
      short: "e",
      default: "", // We'll handle defaults per transport type
    },
    help: {
      type: "boolean",
      short: "h",
    },
  }
})

console.log("解析的命令行选项:", values);

if (values.help) {
  console.log(`
MCP Server Chart CLI

Options:
  --transport, -t  Specify the transport protocol: "stdio", "sse", or "streamable" (default: "stdio")
  --port, -p       Specify the port for SSE or streamable transport (default: 3322)
  --endpoint, -e   Specify the endpoint for the transport:
                   - For SSE: default is "/sse"
                   - For streamable: default is "/mcp"
  --help, -h       Show this help message
  `);
  process.exit(0);
}

const transport = values.transport || "stdio";
console.log("使用传输协议:", transport);

// 启动MCP服务器
async function startServers() {
  try {
    console.log("开始启动服务器...");
    
    // 如果不是Inspector模式，或者明确要求同时启动HTTP服务器，则启动Express
    if (!isInspectorMode || process.env.START_EXPRESS === 'true') {
      // 尝试启动服务器，如果端口被占用，则尝试其他端口
      let currentPort = PORT;
      const maxRetries = 10; // 最多尝试10次
      let retryCount = 0;
      
      const startExpressServer = (port: number) => {
        return new Promise<void>((resolve, reject) => {
          server.once('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
              console.log(`端口 ${port} 已被占用，尝试使用端口 ${port + 1}`);
              if (retryCount < maxRetries) {
                retryCount++;
                server.close();
                startExpressServer(port + 1).then(resolve).catch(reject);
              } else {
                reject(new Error(`在尝试了${maxRetries}次后仍无法找到可用端口`));
              }
            } else {
              reject(err);
            }
          });
          
          server.listen(port, () => {
            console.log(`Express服务器运行在 http://localhost:${port}`);
            resolve();
          });
        });
      };
      
      try {
        await startExpressServer(currentPort);
      } catch (error) {
        console.error('无法启动Express服务器:', error);
      }
    }

    // 始终启动MCP服务器
    console.log(`准备启动 ${transport} 传输协议的MCP服务器...`);
    if (transport === "stdio") {
      await runStdioServer();
      console.log("Stdio MCP服务器已启动");
    } else if (transport === "sse") {
      console.log("SSE MCP服务器启动中...");
      const port = Number.parseInt(values.port as string, 10);
      const endpoint = values.endpoint || "/sse";
      await runSseServer(endpoint, port);
      console.log(`SSE MCP服务器已启动 (端点: ${endpoint}, 端口: ${port})`);
    } else if (transport === "streamable") {
      console.log("Streamable MCP服务器启动中...");
      const port = Number.parseInt(values.port as string, 10);
      const endpoint = values.endpoint || "/mcp";
      await runStreamableServer(endpoint,port);
      console.log(`Streamable MCP服务器已启动 (端点: ${endpoint}, 端口: ${port})`);
    }
    
    console.log("所有服务器启动完成");
  } catch (error) {
    console.error('启动服务器失败:', error);
  }
}

// 处理进程终止信号
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

// 当作为CLI工具直接执行时，启动所有服务器
if (require.main === module) {
  console.log("以CLI模式执行，准备启动服务器...");
  startServers().catch(error => {
    console.error("启动服务器时发生错误:", error);
  });
}