import { runStdioServer } from './server';
import { createExpressServer } from './utils/createExpressServer';

// 创建Express服务器
const { app, server } = createExpressServer();

// 定义端口
const PORT = process.env.PORT || 3001;

// 判断是否是Inspector模式
const isInspectorMode = process.argv.some(arg => arg.includes('@modelcontextprotocol/inspector'));

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
    console.log('正在启动MCP服务器...');
    await runStdioServer();
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