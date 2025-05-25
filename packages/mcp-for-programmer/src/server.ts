import { Server } from "@modelcontextprotocol/sdk/server/index.js";

export function createServer() {
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
  
  server.onerror = (error) => console.error("[MCP Error]", error);
  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });

  return server;
}


