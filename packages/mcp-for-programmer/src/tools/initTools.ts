import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { createToolsForAllPrompts, registerCodeExplainerPrompt } from "./promptTools";


export async function initTools(server: McpServer) {


    // 注册代码解释器提示词
    // try {
    //     registerCodeExplainerPrompt(server);
    //     console.log("代码解释器提示词注册成功");
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
    // try {
    //     // 列出消息工具
    //     server.tool(
    //         "listMessages",
    //         { channel: z.string().describe("频道名称") },
    //         {
    //             usage: "列出指定频道的消息"
    //         },
    //         async ({ channel }) => {
    //             console.log(`调用listMessages工具，频道: ${channel}`);
    //             return {
    //                 content: [{ type: "text", text: `这是${channel}频道的消息` }]
    //             };
    //         }
    //     );

    // } catch (error) {
    //     console.error("注册基本工具失败:", error);
    // }

    console.log("工具初始化完成");
}