import { runSseServer, runStdioServer, runStreamableServer, createMcpServer } from './server';
import { createExpressServer } from './backend/createExpressServer';
import { parseArgs } from 'node:util';

// 导出主要API和类型
export { createMcpServer, runSseServer, runStdioServer, runStreamableServer } from './server';
export { createExpressServer } from './backend/createExpressServer';
export * from './tools/initTools';
export * from './transportUtils';

// 创建Express服务器
const { app, server } = createExpressServer();

// 定义端口
const PORT = process.env.PORT || 3000;

// 判断是否是Inspector模式
const isInspectorMode = process.argv.some(arg => arg.includes('@modelcontextprotocol/inspector'));

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



// 启动MCP服务器
async function startServers() {
  try {
    // 如果不是Inspector模式，或者明确要求同时启动HTTP服务器，则启动Express
    if (!isInspectorMode || process.env.START_EXPRESS === 'true') {
      server.listen(PORT, () => {
        console.log(`Express服务器运行在 http://localhost:${PORT}`);
      });
    }

    // 始终启动MCP服务器
    if (transport === "stdio") {
      await runStdioServer();
    } else if (transport === "sse") {
      console.log("sse 启动");
      
      const port = Number.parseInt(values.port as string, 10);
      const endpoint = values.endpoint || "/sse";
      await runSseServer(endpoint, port);
    } else if (transport === "streamable") {
      const port = Number.parseInt(values.port as string, 10);
      const endpoint = values.endpoint || "/mcp";
      await runStreamableServer(endpoint,port);
    }
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

// 启动所有服务器
startServers().catch(console.error);