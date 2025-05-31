# MCP-Server for Programmers

English | [简体中文](./README.md)

A Model Context Protocol server designed to help programmers learn and understand code.

## Project Introduction

MCP-Server for Programmers is a server implementation based on the Model Context Protocol (MCP), specifically designed to help programmers understand and learn code. It can parse code through prompt templates, providing code explanations, tech stack analysis, and best practice recommendations to help novice programmers understand complex code more quickly.

## Features

- 🚀 Based on MCP protocol, supporting multiple transport methods (stdio, SSE, streamable)
- 📝 Support for defining prompt templates via YAML files
- 🔧 Automatic conversion of prompts to tools without manual mapping
- 🧩 Template variable replacement with conditional rendering support
- 🌐 Built-in Express server providing REST API
- 🔍 Integration with MCP Inspector for easy debugging

## Installation

```bash
# Clone repository
git clone https://github.com/yourusername/mcp-for-programmer.git
cd mcp-for-programmer

# Install dependencies
pnpm install

# Build project
pnpm build
```

## Usage

### Starting the Server
```bash
# Start with standard input/output (stdio)
pnpm dev

# Start with SSE transport
pnpm dev:sse

# Start with Inspector
pnpm dev:inspector

# Start with Express server
pnpm dev:express
```

### Creating Prompt Templates
Create YAML files in the `prompts` directory, for example `code-explainer.yaml`:

```yaml
name: code-explainer
description: Explain code functionality and implementation details
arguments:
  - name: code
    description: Code snippet to explain
    required: true
    type: string
  - name: language
    description: Programming language of the code
    required: false
    type: string
  - name: context
    description: Context or background information for the code
    required: false
    type: string
messages:
  - role: system
    content:
      text: "You are a professional code interpreter. Please explain the following {{language}} code:\n\n```{{language}}\n{{code}}\n```\n{{#if context}}Code context: {{context}}{{/if}}"
  - role: user
    content:
      text: "Please explain in detail the functionality, implementation principles, and possible optimization points of this code."
```

## API Endpoints

- `GET /api/models` - Get available models
- `POST /api/query` - Send a query to the model
- `GET /api/prompts` - Get all available prompt templates
- `GET /api/prompts/:filename` - Get content of a specific prompt template

## Project Structure

```
mcp-for-programmer/
├── packages/
│   └── mcp-for-programmer/
│       ├── src/
│       │   ├── backend/         # Express server related code
│       │   ├── routes/          # API route definitions
│       │   ├── tools/           # MCP tools and prompt processing
│       │   ├── transportUtils/  # Transport implementations
│       │   ├── index.ts         # Entry file
│       │   └── server.ts        # MCP server creation
│       ├── prompts/             # Prompt template YAML files
│       └── package.json
└── package.json
```

## Tech Stack

- TypeScript
- Node.js
- Express.js
- Model Context Protocol (MCP)
- YAML
- Zod (type validation)

## Contributing

Contributions, bug reports, and feature suggestions are welcome. Please create an issue to discuss your ideas before submitting a pull request.

## License

This project is licensed under the ISC License. See the LICENSE file for details. 