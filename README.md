# MCP-Server for Programmers

简体中文 | [English](./docs/README_EN.md)

一个为程序员学习助力的Model Context Protocol服务器。

[![GitHub stars](https://img.shields.io/github/stars/zaizaizhao/mcp-for-programmer.svg?style=social&label=Star&maxAge=2592000)](https://github.com/zaizaizhao/mcp-for-programmer/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/zaizaizhao/mcp-for-programmer.svg?style=social&label=Fork&maxAge=2592000)](https://github.com/zaizaizhao/mcp-for-programmer/network)
[![GitHub issues](https://img.shields.io/github/issues/zaizaizhao/mcp-for-programmer.svg)](https://github.com/zaizaizhao/mcp-for-programmer/issues)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/mcp-for-programmer.svg)](https://www.npmjs.com/package/mcp-for-programmer)
[![npm downloads](https://img.shields.io/npm/dm/mcp-for-programmer.svg)](https://www.npmjs.com/package/mcp-for-programmer)

## 安装

### 使用NPM包（推荐）

```bash
# 使用npm安装
npm install mcp-for-programmer

# 或使用yarn
yarn add mcp-for-programmer

# 或使用pnpm
pnpm add mcp-for-programmer
```

### 开发者安装

```bash
# 克隆仓库
git clone https://github.com/zaizaizhao/mcp-for-programmer.git
cd mcp-for-programmer

# 安装依赖
pnpm install

# 构建项目
pnpm build
```

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
- 📘 [提示词规范文档](./README.zh-CN.md) - MCP提示词规范与使用指南
- 📦 [NPM包](https://www.npmjs.com/package/mcp-for-programmer) - NPM包页面

## 特性

- 🚀 基于 MCP 协议，支持多种传输方式（stdio、SSE、streamable、HTTP Stream）
- 📝 支持通过 YAML 文件定义提示词模板
- 🔧 自动将提示词转换为工具，无需手动映射
- 🧩 模板变量替换功能，支持条件渲染
- 🌐 内置 Express 服务器，提供 REST API
- 🔍 支持与 MCP Inspector 集成，方便调试
- 📋 标准化的提示词规范，确保一致性和可维护性

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
- ✅ 提示词规范文档与示例

## 待完成功能

- 📋 用户界面优化与交互改进
- 📋 更多专业领域提示词模板
- 📋 代码分析与建议功能增强
- 📋 多语言支持扩展
- 📋 性能优化与缓存机制
- 📋 用户配置文件和个性化设置
- 📋 插件系统支持

## 使用方法

### 启动服务器
```bash
# 使用标准输入输出（stdio）启动
pnpm run dev
# 或直接使用npx
npx mcp-for-programmer

# 使用 SSE 传输启动
pnpm run dev:sse
# 或直接使用npx
npx mcp-for-programmer --transport sse --port 3322 --endpoint /sse

# 使用 Streamable 传输启动
pnpm run dev:streamable

# 使用 HTTP Stream 方式启动
pnpm run dev:stream

# 在指定端口启动 Express 服务器
pnpm run dev:express

# 使用 Inspector 启动（调试模式）
pnpm run dev:inspector
# 或直接使用npx
npx @modelcontextprotocol/inspector mcp-for-programmer
```

### 创建提示词模板
在 `prompts` 目录下创建 YAML 文件，例如 `code-explainer.yaml`：

```yaml
name: code-explainer
description: 解释代码的功能和实现细节
arguments:
  - name: code
    description: 需要解释的代码片段
    required: true
    schema:
      type: string
  - name: language
    description: 代码的编程语言
    required: false
    schema:
      type: string
  - name: context
    description: 代码的上下文或背景信息
    required: false
    schema:
      type: string
messages:
  - role: system
    content:
      type: text
      text: "你是一位专业的代码解释器，请解释以下{{language}}代码：\n\n```{{language}}\n{{code}}\n```\n{{#if context}}代码上下文：{{context}}{{/if}}"
  - role: user
    content:
      type: text
      text: "请详细解释这段代码的功能、实现原理和可能的优化点。"
```

## API 接口

- `GET /api/models` - 获取可用模型列表
- `POST /api/query` - 向模型发送查询
- `GET /api/prompts` - 获取所有可用的提示词模板
- `GET /api/prompts/:filename` - 获取特定提示词模板的内容

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
├── prompt-schema.yaml           # 提示词规范说明文档
├── prompt-example.yaml          # 提示词示例文件
└── package.json
```
# MCP 提示词规范与使用指南

本文档提供了MCP (Model Context Protocol) 服务器的提示词(Prompt)规范和使用指南。

[英文详细文档](./docs/README.Promps.EN.md)

## 文件结构

- `prompt-schema.yaml`: 提示词规范说明文档，详细定义了提示词文件的结构和字段要求
- `prompt-example.yaml`: 提示词示例文件，展示了如何创建符合规范的提示词

## 提示词文件规范

每个提示词文件应遵循以下基本结构:

```yaml
name: 提示词名称
description: 提示词描述
arguments: # 可选
  - name: 参数名称
    description: 参数描述
    required: true/false
    schema:
      type: 参数类型
messages:
  - role: 角色(system/user/assistant)
    content:
      type: 内容类型(text/image)
      text: 文本内容
```

详细规范请参考 `prompt-schema.yaml` 文件。

## 如何创建新的提示词

1. 在 `prompts` 目录下创建一个新的 `.yaml` 文件
2. 文件名应与提示词名称保持一致
3. 按照规范定义提示词的结构和内容
4. 参考 `prompt-example.yaml` 作为创建提示词的模板

## 如何使用提示词

提示词文件创建完成后，系统会自动加载并注册为工具。您可以通过以下方式使用这些提示词:

1. 在代码中引用提示词名称
2. 传递必要的参数
3. 调用相应的API

示例代码:

```typescript
// 引入必要的模块
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { createToolsForAllPrompts } from "./tools/promptTools";

// 初始化MCP服务器
const server = new McpServer();

// 注册所有提示词工具
await createToolsForAllPrompts(server);

// 使用提示词工具
const result = await server.invoke("gen_prd_prototype_html", {
  productConcept: "一个智能家居控制应用"
});

console.log(result);
```

## 提示词模板变量

提示词模板支持使用变量和条件语句，使用双花括号 `{{}}` 语法：

```yaml
messages:
  - role: user
    content:
      text: |
        产品概念：{{productConcept}}
        {% if targetUsers %}
        目标用户：{{targetUsers}}
        {% endif %}
```

## 提示词类型与用途

根据不同场景和需求，您可以创建多种类型的提示词：

1. **代码解释器提示词** - 用于解释代码功能和实现细节
2. **产品需求文档生成器** - 用于生成产品需求文档和原型设计
3. **技术栈分析提示词** - 分析项目使用的技术栈和架构
4. **最佳实践建议提示词** - 提供代码优化和最佳实践建议

## 最佳实践

1. 提示词名称应简洁明了，反映其功能
2. 描述应详细说明提示词的用途、输入和预期输出
3. 参数应明确定义类型和是否必填
4. 消息内容应结构清晰，便于理解和维护
5. 定期审查和更新提示词，确保其有效性和安全性
6. 为复杂提示词添加详细注释，解释其工作原理
7. 测试提示词在不同输入条件下的表现

## 注意事项

- 确保YAML格式正确，避免语法错误
- 避免在提示词中包含敏感信息或私有数据
- 测试提示词在不同场景下的表现，确保其稳定性和可靠性
- 提示词应遵循一致的命名规范，便于管理和使用
- 定期更新提示词以适应新的需求和场景

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

## 许可证

本项目采用 ISC 许可证。详情请参阅 LICENSE 文件。

## Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=zaizaizhao/mcp-for-programmer&type=Date)](https://star-history.com/#zaizaizhao/mcp-for-programmer&Date)
