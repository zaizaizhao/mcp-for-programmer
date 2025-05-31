import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { initTools } from "./tools/initTools";
import { startStdioMcpServer, startSseMcpServer, startStreamableMcpServer } from "./transportUtils";


export function createMcpServer() {
  const server = new McpServer(
    {
      name: "mcp-for-programmer",
      version: "1.0.0",
      description: "程序员高效MCP",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  initTools(server);

  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });

  return server;
}

export async function runStdioServer(): Promise<void> {
  const server = createMcpServer();
  await startStdioMcpServer(server);
}

export async function runSseServer(
  endpoint = "/sse",
  port = 3322
): Promise<void> {
  const server = createMcpServer();
  await startSseMcpServer(server, endpoint, port);
}

export async function runStreamableServer(
  endpoint = "/mcp",
  port = 3322
): Promise<void> {
  const server = createMcpServer();
  await startStreamableMcpServer(server, endpoint, port);
}
