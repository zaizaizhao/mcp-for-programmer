import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { startStdioMcpServer } from "./transportUtils";
import { initTools } from "./tools/initTools";

export function createMcpServer() {
  const server = new Server(
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

  server.onerror = (error) => console.error("[MCP Error]", error);
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

