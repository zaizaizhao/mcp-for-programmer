import express, { Request, Response, Router } from 'express';

const router: Router = express.Router();

// 获取可用模型列表
router.get('/models', (req: Request, res: Response) => {
  res.json({
    models: [
      { id: 'model-1', name: '编程助手', description: '帮助解决编程问题的AI模型' },
      { id: 'model-2', name: '代码审查', description: '提供代码审查和优化建议的AI模型' },
      { id: 'model-3', name: '算法专家', description: '专注于算法解析和优化的AI模型' }
    ]
  });
});

router.post('/query', (req:any, res:any) => {
  const { question, modelId } = req.body;
  
  if (!question) {
    return res.status(400).json({ error: '问题不能为空' });
  }
  
  // 这里可以添加与MCP的交互逻辑
  
  res.json({
    answer: `这是对问题"${question}"的回答`,
    model: modelId || 'default-model'
  });
});

export default router; 