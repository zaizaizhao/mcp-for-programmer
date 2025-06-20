# mcp-for-programmer

[![npm version](https://img.shields.io/npm/v/mcp-for-programmer.svg)](https://www.npmjs.com/package/mcp-for-programmer)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

程序员高效学习MCP的工具库，基于Model Context Protocol实现。

## 安装

```bash
npm install mcp-for-programmer
# 或
yarn add mcp-for-programmer
# 或
pnpm add mcp-for-programmer
```

## 功能特性

- 🚀 基于MCP协议，支持多种传输方式（stdio、SSE、streamable、HTTP Stream）
- 📝 支持通过YAML文件定义提示词模板
- 🔧 自动将提示词转换为工具，无需手动映射
- 🧩 模板变量替换功能，支持条件渲染
- 🌐 内置Express服务器，提供REST API
- 🔍 支持与MCP Inspector集成，方便调试

## 快速开始

### 基本用法

```typescript
import { createMcpServer } from 'mcp-for-programmer';

// 创建MCP服务器
const server = createMcpServer({
  port: 3000,
  transport: 'stdio', // 可选: 'stdio', 'sse', 'streamable', 'http'
  promptsDir: './prompts' // 提示词模板目录
});

// 启动服务器
server.start();
```

### 使用Express服务器

```typescript
import { createExpressServer } from 'mcp-for-programmer';

// 创建带Express的MCP服务器
const { app, server } = createExpressServer({
  port: 3000,
  promptsDir: './prompts'
});

// 自定义路由
app.get('/custom', (req, res) => {
  res.send('自定义路由');
});

// 启动服务器
server.listen(3000, () => {
  console.log('服务器已启动，端口: 3000');
});
```

### 创建提示词模板

在`prompts`目录下创建YAML文件，例如`code-explainer.yaml`：

```yaml
name: code-explainer
description: 解释代码的功能和实现细节
arguments:
  - name: code
    description: 需要解释的代码片段
    required: true
    type: string
  - name: language
    description: 代码的编程语言
    required: false
    type: string
  - name: context
    description: 代码的上下文或背景信息
    required: false
    type: string
messages:
  - role: system
    content:
      text: "你是一位专业的代码解释器，请解释以下{{language}}代码：\n\n```{{language}}\n{{code}}\n```\n{{#if context}}代码上下文：{{context}}{{/if}}"
  - role: user
    content:
      text: "请详细解释这段代码的功能、实现原理和可能的优化点。"
```

## API参考

### `createMcpServer(options)`

创建一个MCP服务器实例。

**参数：**

- `options` (对象)
  - `port` (数字): 服务器端口号
  - `transport` (字符串): 传输方式，可选 'stdio', 'sse', 'streamable', 'http'
  - `promptsDir` (字符串): 提示词模板目录路径
  - `endpoint` (字符串, 可选): SSE端点路径，默认为'/sse'

**返回值：**

- MCP服务器实例

### `createExpressServer(options)`

创建一个带Express的MCP服务器。

**参数：**

- `options` (对象): 与`createMcpServer`相同

**返回值：**

- 包含`app`(Express应用)和`server`(HTTP服务器)的对象

## 命令行工具

```bash
# 使用标准输入输出（stdio）启动
npx mcp-for-programmer

# 使用SSE传输启动
npx mcp-for-programmer --transport sse --port 3322 --endpoint /sse

# 使用Inspector启动（调试模式）
npx @modelcontextprotocol/inspector mcp-for-programmer
```

## 更多资源

- [GitHub仓库](https://github.com/zaizaizhao/mcp-for-programmer)
- [问题反馈](https://github.com/zaizaizhao/mcp-for-programmer/issues)
- [MCP协议文档](https://modelcontextprotocol.github.io/)

## 许可证

ISC

## 打包与构建

本项目使用Rollup进行库的打包，支持以下功能：

- 生成CommonJS和ES模块两种格式
- 自动生成TypeScript类型声明文件
- 支持监视模式进行开发
- 生产环境构建优化

### 开发模式

运行以下命令启动开发模式，将自动监视文件变更并实时构建：

```bash
npm run dev
```

### 生产构建

运行以下命令进行生产环境构建：

```bash
npm run build
```

生成的文件将输出到各个包的`dist`目录中。

## 项目简介

MCP-Server for Programmers 是一个基于 Model Context Protocol (MCP) 的服务器实现，专为帮助程序员理解和学习代码而设计。它能够通过提示词模板解析代码，提供代码解释、技术栈分析和最佳实践建议，帮助新手程序员更快地理解复杂代码。

## 文档

- 📚 [DeepWiki 详细文档](https://deepwiki.com/zaizaizhao/mcp-for-programmer) - 由 Devin 自动生成的项目详细文档

## 已完成功能

- ✅ MCP 服务器基础架构搭建
- ✅ 多种传输方式支持（stdio、SSE、streamable）
- ✅ YAML 提示词模板加载和解析
- ✅ 提示词自动转换为工具功能
- ✅ 模板变量替换和条件渲染
- ✅ Express REST API 服务
- ✅ 代码解释器提示词实现
- ✅ Rollup构建系统用于库打包
- ✅ HTTP Stream方式调用MCP服务器

## 待完成功能

- 📋 用户界面优化与交互改进
- 📋 更多专业领域提示词模板
- 📋 代码分析与建议功能增强
- 📋 多语言支持扩展
- 📋 性能优化与缓存机制
- 📋 用户配置文件和个性化设置
- 📋 插件系统支持

## 项目结构

```
mcp-for-programmer/
├── packages/
│   └── mcp-for-programmer/
│       ├── src/
│       │   ├── backend/         # Express 服务器相关代码
│       │   ├── routes/          # API 路由定义
│       │   ├── tools/           # MCP 工具和提示词处理
│       │   ├── transportUtils/  # 传输方式实现
│       │   ├── index.ts         # 入口文件
│       │   └── server.ts        # MCP 服务器创建
│       ├── dist/                # 构建输出（不被Git跟踪）
│       ├── prompts/             # 提示词模板 YAML 文件
│       └── package.json
├── scripts/
│   ├── dev.js                   # 开发构建脚本，带监视模式
│   └── build.js                 # 生产环境构建脚本
└── package.json
```

## 技术栈

- TypeScript
- Node.js
- Express.js
- Model Context Protocol (MCP)
- Rollup (构建系统)
- YAML
- Zod (类型验证)

## 贡献

欢迎贡献代码、报告问题或提出新功能建议。请先创建 Issue 讨论您的想法，然后再提交 Pull Request。
