import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { createToolsForAllPrompts, registerCodeExplainerPrompt } from "./promptTools";


export async function initTools(server: McpServer) {
    try {
        console.log("开始初始化工具...");
        
        // 注册代码解释器提示词
        // try {
        //     registerCodeExplainerPrompt(server);
        // } catch (error) {
        //     console.error("注册代码解释器提示词失败:", error);
        // }
        
        // 注册所有提示词工具
        try {
            await createToolsForAllPrompts(server);
        } catch (error) {
            console.error("创建提示词工具失败:", error);
        }
        
        // 注册基本工具
        try {
            // 列出消息工具
            server.tool(
                "listMessages",
                { channel: z.string() },
                async ({ channel }) => ({
                    content: [{ type: "text", text: "123" }]
                })
            );
            console.log("基本工具注册成功");
        } catch (error) {
            console.error("注册基本工具失败:", error);
        }
        
        console.log("工具初始化完成");
    } catch (error) {
        console.error("工具初始化失败:", error);
    }
}