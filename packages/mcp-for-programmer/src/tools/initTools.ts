import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { createToolsForAllPrompts, registerCodeExplainerPrompt } from "./promptTools";


export async function initTools(server: McpServer) {
    // 注册提示词
    registerCodeExplainerPrompt(server);
    await createToolsForAllPrompts(server);
    // 其他工具
    server.tool(
        "listMessages",
        { channel: z.string() },
        async ({ channel }) => ({
            content: [{ type: "text", text: "123" }]
        })
    );
}