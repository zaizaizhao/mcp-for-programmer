import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import yaml from 'js-yaml';

const router:Router = express.Router();

// YAML文件目录路径
const PROMPTS_DIR = path.resolve(__dirname, '../../../prompts');

// 获取可用模型列表
router.get('/models', (req: any, res: any) => {
  res.json({
    models: [
      { id: 'model-1', name: '编程助手', description: '帮助解决编程问题的AI模型' },
      { id: 'model-2', name: '代码审查', description: '提供代码审查和优化建议的AI模型' },
      { id: 'model-3', name: '算法专家', description: '专注于算法解析和优化的AI模型' }
    ]
  });
});

router.post('/query', (req: any, res: any) => {
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

// 获取所有可用的提示模板列表
router.get('/prompts', async (req: any, res: any) => {
  try {
    // 读取prompts目录下的所有文件
    const files = await fsPromises.readdir(PROMPTS_DIR);
    
    // 过滤出.yaml文件
    const yamlFiles = files.filter(file => file.endsWith('.yaml'));
    
    // 返回文件名列表
    res.json({
      prompts: yamlFiles.map(file => ({
        id: path.basename(file, '.yaml'),
        name: path.basename(file, '.yaml'),
        path: file
      }))
    });
  } catch (error) {
    console.error('Error reading prompts directory:', error);
    res.status(500).json({ error: '无法读取提示模板列表' });
  }
});

// 获取特定提示模板的内容
router.get('/prompts/:filename', async (req: any, res: any) => {
  try {
    const { filename } = req.params;
    
    // 安全检查，防止目录遍历攻击
    const safeFilename = path.basename(filename);
    const filePath = path.join(PROMPTS_DIR, safeFilename);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '提示模板不存在' });
    }
    
    // 读取文件内容
    const content = await fsPromises.readFile(filePath, 'utf8');
    
    // 根据请求决定返回格式
    const format = req.query.format as string || 'text';
    
    if (format === 'json') {
      try {
        // 解析YAML为JSON
        const jsonContent = yaml.load(content);
        res.json({
          filename: safeFilename,
          content: jsonContent
        });
      } catch (yamlError) {
        console.error('Error parsing YAML:', yamlError);
        res.status(500).json({ error: '无法解析YAML文件' });
      }
    } else {
      // 返回原始YAML文本
      res.type('text/yaml').send(content);
    }
  } catch (error) {
    console.error('Error reading prompt file:', error);
    res.status(500).json({ error: '无法读取提示模板内容' });
  }
});

export default router; 