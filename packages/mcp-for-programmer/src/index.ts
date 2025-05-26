import { createExpressServer } from './utils/createExpressServer';
// 如果没有@modelcontextprotocol/sdk的类型声明，可以使用require语法
const { MCPServer } = require('@modelcontextprotocol/sdk');

// 创建Express服务器
const { app, server } = createExpressServer();

// 定义端口
const PORT = process.env.PORT || 3000;

// 启动服务器
// server.listen(PORT, () => {
//   console.log(`服务器运行在 http://localhost:${PORT}`);
  
//   // 启动MCP服务器
//   mcpServer.start().then(() => {
//     console.log('MCP服务器已启动');
//   }).catch((error: Error) => {
//     console.error('启动MCP服务器失败:', error);
//   });
// });

// 处理进程终止信号
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
