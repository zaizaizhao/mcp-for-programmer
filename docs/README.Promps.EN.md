[![Star History Chart](https://api.star-history.com/svg?repos=zaizaizhao/mcp-for-programmer&type=Date)](https://star-history.com/#zaizaizhao/mcp-for-programmer&Date)

# MCP Prompt Specification and Usage Guide

This document provides the prompt specification and usage guide for the MCP (Model Context Protocol) server.

[Chinese Version](./README.md)

## File Structure

- `prompt-schema.yaml`: Prompt specification document, detailing the structure and field requirements for prompt files
- `prompt-example.yaml`: Example prompt file, demonstrating how to create a prompt that conforms to the specification

## Prompt File Specification

Each prompt file should follow this basic structure:

```yaml
name: prompt name
description: prompt description
arguments: # optional
  - name: parameter name
    description: parameter description
    required: true/false
    schema:
      type: parameter type
messages:
  - role: role (system/user/assistant)
    content:
      type: content type (text/image)
      text: text content
```

For detailed specifications, please refer to the `prompt-schema.yaml` file.

## How to Create a New Prompt

1. Create a new `.yaml` file in the `prompts` directory
2. The filename should match the prompt name
3. Define the structure and content of the prompt according to the specification
4. Use `prompt-example.yaml` as a template for creating prompts

## How to Use Prompts

After the prompt file is created, the system will automatically load and register it as a tool. You can use these prompts in the following ways:

1. Reference the prompt name in your code
2. Pass the necessary parameters
3. Call the corresponding API

Example code:

```typescript
// Import necessary modules
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { createToolsForAllPrompts } from "./tools/promptTools";

// Initialize MCP server
const server = new McpServer();

// Register all prompt tools
await createToolsForAllPrompts(server);

// Use prompt tool
const result = await server.invoke("gen_prd_prototype_html", {
  productConcept: "A smart home control application"
});

console.log(result);
```

## Prompt Template Variables

Prompt templates support variables and conditional statements using double curly braces `{{}}` syntax:

```yaml
messages:
  - role: user
    content:
      text: |
        Product concept: {{productConcept}}
        {% if targetUsers %}
        Target users: {{targetUsers}}
        {% endif %}
```

## Prompt Types and Uses

Based on different scenarios and requirements, you can create various types of prompts:

1. **Code Explainer Prompts** - For explaining code functionality and implementation details
2. **Product Requirements Document Generators** - For generating product requirement documents and prototype designs
3. **Tech Stack Analysis Prompts** - For analyzing project technology stacks and architectures
4. **Best Practices Recommendation Prompts** - For providing code optimization and best practice suggestions

## Best Practices

1. Prompt names should be concise and reflect their function
2. Descriptions should detail the purpose, inputs, and expected outputs of the prompt
3. Parameters should clearly define types and whether they are required
4. Message content should be structured clearly for understanding and maintenance
5. Regularly review and update prompts to ensure their effectiveness and security
6. Add detailed comments for complex prompts to explain how they work
7. Test prompts under different input conditions to ensure proper behavior

## Notes

- Ensure YAML format is correct and avoid syntax errors
- Avoid including sensitive information or private data in prompts
- Test prompts in different scenarios to ensure their stability and reliability
- Prompts should follow consistent naming conventions for easier management and use
- Regularly update prompts to adapt to new requirements and scenarios 