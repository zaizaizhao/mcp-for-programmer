import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { z } from "zod";

// 提示词参数类型
interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
  type: string;
}

// 提示词YAML结构
interface PromptYaml {
  name: string;
  description: string;
  arguments: PromptArgument[];
  messages: any[];
}

// 提示词加载器
export async function loadPrompt(promptName: string): Promise<any> {
  try {
    // 构建提示词文件路径 - 尝试多个可能的位置
    let promptsDir;
    let promptPath;
    let fileContent;
    
    // 尝试的路径列表
    const pathsToTry = [
      path.resolve(__dirname, '../../prompts'), // 开发环境中的路径
      path.resolve(__dirname, '../prompts'),    // 生产环境中的路径
      path.resolve(process.cwd(), 'prompts'),   // 当前工作目录下的prompts
      path.resolve(process.cwd(), '../prompts') // 上级目录的prompts
    ];
    
    // 尝试每个路径
    for (const dir of pathsToTry) {
      try {
        promptPath = path.join(dir, `${promptName}.yaml`);
        if (fs.existsSync(promptPath)) {
          promptsDir = dir;
          fileContent = await fs.promises.readFile(promptPath, 'utf8');
          console.log(`成功从 ${promptPath} 加载提示词`);
          break;
        }
      } catch (err) {
        // 继续尝试下一个路径
      }
    }
    
    // 如果没有找到文件
    if (!fileContent) {
      throw new Error(`无法找到提示词文件 ${promptName}.yaml，已尝试路径: ${pathsToTry.join(', ')}`);
    }
    
    // 解析YAML内容
    const promptData = yaml.load(fileContent);
    return promptData;
  } catch (error) {
    console.error(`加载提示词 ${promptName} 失败:`, error);
    throw error;
  }
}

// 获取prompts目录中的所有YAML文件
export async function getAllPromptFiles(): Promise<string[]> {
  try {
    // 尝试的路径列表
    const pathsToTry = [
      path.resolve(__dirname, '../../prompts'), // 开发环境中的路径
      path.resolve(__dirname, '../prompts'),    // 生产环境中的路径
      path.resolve(process.cwd(), 'prompts'),   // 当前工作目录下的prompts
      path.resolve(process.cwd(), '../prompts') // 上级目录的prompts
    ];
    
    // 尝试每个路径
    for (const dir of pathsToTry) {
      try {
        if (fs.existsSync(dir)) {
          const files = await fs.promises.readdir(dir);
          console.log(`成功从 ${dir} 加载提示词文件列表`);
          return files.filter(file => file.endsWith('.yaml'));
        }
      } catch (err) {
        // 继续尝试下一个路径
      }
    }
    
    console.warn(`未找到prompts目录，已尝试路径: ${pathsToTry.join(', ')}`);
    return [];
  } catch (error) {
    console.error('获取提示词文件失败:', error);
    return [];
  }
}

// 创建Zod验证模式
function createZodSchema(args: PromptArgument[]) {
  const schema: Record<string, any> = {};
  
  // 如果args未定义或不是数组，返回空对象
  if (!args || !Array.isArray(args)) {
    console.warn("警告: 提示词参数未定义或不是数组");
    return schema;
  }
  
  args.forEach(arg => {
    let validator: any;
    
    // 根据参数类型创建相应的Zod验证器
    switch (arg.type.toLowerCase()) {
      case 'string':
        validator = z.string();
        break;
      case 'number':
        validator = z.number();
        break;
      case 'boolean':
        validator = z.boolean();
        break;
      case 'array':
        validator = z.array(z.any());
        break;
      case 'object':
        validator = z.record(z.any());
        break;
      default:
        validator = z.any();
    }
    
    // 如果参数是可选的
    if (!arg.required) {
      validator = validator.optional();
    }
    
    // 添加描述
    validator = validator.describe(arg.description);
    
    // 添加到模式中
    schema[arg.name] = validator;
  });
  
  return schema;
}

// 处理模板变量替换
function processTemplateVariables(text: string, params: Record<string, any>): string {
  let processedText = text;
  
  // 替换简单变量 {{varName}}
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedText = processedText.replace(regex, String(value));
    }
  });
  
  // 处理条件块 {{#if varName}}...{{/if}}
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      // 如果变量存在且为真，保留条件块内容并替换变量
      const conditionalRegex = new RegExp(`{{#if ${key}}}([\\s\\S]*?){{/if}}`, 'g');
      processedText = processedText.replace(conditionalRegex, (_, content) => {
        return content.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      });
    } else {
      // 如果变量不存在或为假，移除整个条件块
      const conditionalRegex = new RegExp(`{{#if ${key}}}[\\s\\S]*?{{/if}}`, 'g');
      processedText = processedText.replace(conditionalRegex, '');
    }
  });
  
  return processedText;
}

// 注册代码解释器提示词
export function registerCodeExplainerPrompt(server: McpServer) {
  server.prompt(
    "code-explainer",
    {
      code: z.string().describe("需要解释的代码片段"),
      language: z.string().optional().describe("代码的编程语言"),
      context: z.string().optional().describe("代码的上下文或背景信息")
    },
    async ({ code, language = "未指定语言", context }) => {
      try {
        // 加载提示词模板
        const promptTemplate = await loadPrompt("code-explainer");
        
        // 构建消息
        const messages = promptTemplate.messages.map((msg: any) => {
          if (msg.content.text) {
            // 替换模板变量
            let text = msg.content.text
              .replace(/{{code}}/g, code)
              .replace(/{{language}}/g, language);
            
            // 有条件地添加上下文
            if (context) {
              text = text.replace(/{{#if context}}([\s\S]*?){{\/if}}/g, `$1`.replace(/{{context}}/g, context));
            } else {
              text = text.replace(/{{#if context}}[\s\S]*?{{\/if}}/g, '');
            }
            
            return {
              ...msg,
              content: {
                ...msg.content,
                text
              }
            };
          }
          return msg;
        });
        
        return { messages };
      } catch (error) {
        console.error("注册代码解释器提示词失败:", error);
        throw error;
      }
    }
  );
  console.log("代码解释器提示词已注册");
}

// 为提示词自动创建工具
export async function createToolForPrompt(server: McpServer, promptFile: string) {
  try {
    // 跳过tool-mappings.yaml文件
    if (promptFile === 'tool-mappings.yaml') {
      console.log("跳过 tool-mappings.yaml 文件");
      return true;
    }
    
    // 尝试的路径列表
    const pathsToTry = [
      path.resolve(__dirname, '../../prompts'), // 开发环境中的路径
      path.resolve(__dirname, '../prompts'),    // 生产环境中的路径
      path.resolve(process.cwd(), 'prompts'),   // 当前工作目录下的prompts
      path.resolve(process.cwd(), '../prompts') // 上级目录的prompts
    ];
    
    let fileContent;
    let promptPath;
    
    // 尝试每个路径
    for (const dir of pathsToTry) {
      try {
        promptPath = path.join(dir, promptFile);
        if (fs.existsSync(promptPath)) {
          fileContent = await fs.promises.readFile(promptPath, 'utf8');
          console.log(`成功从 ${promptPath} 加载提示词文件`);
          break;
        }
      } catch (err) {
        // 继续尝试下一个路径
      }
    }
    
    // 如果没有找到文件
    if (!fileContent) {
      console.warn(`无法找到提示词文件 ${promptFile}，已尝试路径: ${pathsToTry.join(', ')}`);
      return false;
    }
    
    const promptData = yaml.load(fileContent) as PromptYaml;
    
    // 检查是否有效的提示词文件
    if (!promptData || !promptData.name) {
      console.warn(`警告: ${promptFile} 不是有效的提示词文件`);
      return false;
    }
    
    // 提示词名称
    const promptName = promptData.name;
    
    // 创建工具名称 (与提示词名称相同)
    const toolName = promptName;
    
    // 创建参数验证模式
    const schema = createZodSchema(promptData.arguments || []);
    
    // 注册提示词
    // server.prompt(
    //   promptName,
    //   promptData.description || `${promptName}提示词`,
    //   schema,
    //   async (args) => {
    //     // 处理提示词模板
    //     const processedMessages = promptData.messages.map(msg => {
    //       if (msg.content.text) {
    //         return {
    //           ...msg,
    //           content: {
    //             ...msg.content,
    //             text: processTemplateVariables(msg.content.text, args)
    //           }
    //         };
    //       }
    //       return msg;
    //     });
        
    //     return { messages: processedMessages };
    //   }
    // );
    
    // 注册工具
    server.tool(
      toolName,
      promptData.description || `${promptName}工具`,
      schema,
      {
        usage: `当用户需要${promptData.description || promptName}时使用`
      },
      async (args:any, extra:any) => {
        try {
          // 返回结果
          return {
            result: `已使用${promptName}提示词处理请求`,
            content: [{
              type: "text",
              text: `正在使用${promptName}提示词处理您的请求...`,
              prompt: promptData.messages
            }]
          };
        } catch (error: any) {
          console.error(`工具 ${toolName} 处理失败:`, error);
          return {
            result: `处理请求时出错: ${error.message || '未知错误'}`,
            content: [{
              type: "text",
              text: `处理请求时出错: ${error.message || '未知错误'}`
            }]
          };
        }
      }
    );
    
    console.log(`已为提示词 ${promptName} 创建工具 ${toolName}`);
    return true;
  } catch (error: any) {
    console.error(`为提示词 ${promptFile} 创建工具失败:`, error);
    return false;
  }
}

// 自动为所有提示词YAML创建工具
export async function createToolsForAllPrompts(server: McpServer) {
  try {
    // 获取所有提示词文件
    const promptFiles = await getAllPromptFiles();
    
    // 记录成功和失败数量
    let successCount = 0;
    let failCount = 0;
    
    // 为每个提示词创建工具
    for (const promptFile of promptFiles) {
      const success = await createToolForPrompt(server, promptFile);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    console.log(`提示词工具创建完成: 成功 ${successCount}, 失败 ${failCount}`);
  } catch (error) {
    console.error('创建提示词工具失败:', error);
  }
} 