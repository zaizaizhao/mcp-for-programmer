import express, { Request, Response, NextFunction } from 'express';
import * as http from 'http';
import cors from 'cors';
import apiRoutes from '../routes/api';

export function createExpressServer() {
  const app = express();
  
  // 中间件配置
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // CORS中间件
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
  }));
  
  // 基本路由
  app.get('/', (req: Request, res: Response) => {
    res.send('MCP for Programmer API Server');
  });
  
  // 健康检查端点
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });
  
  // API路由
  app.use('/api', apiRoutes);
  
  // 错误处理中间件
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: '服务器内部错误' });
  });
  
  // 创建HTTP服务器
  const server = http.createServer(app);
  
  return { app, server };
} 