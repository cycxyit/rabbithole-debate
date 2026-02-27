import express from "express";
import { tavily } from "@tavily/core";
import { openAIService } from "../services/openaiService";
import OpenAI from "openai";

interface RabbitHoleSearchRequest {
    query: string;
    previousConversation?: Array<{
        user?: string;
        assistant?: string;
    }>;
    concept?: string;
    followUpMode?: "expansive" | "focused";
}

interface SearchResponse {
    response: string;
    followUpQuestions: string[];
    contextualQuery: string;
    sources: Array<{
        title: string;
        url: string;
        uri: string;
        author: string;
        image: string;
    }>;
    images: Array<{
        url: string;
        thumbnail: string;
        description: string;
    }>;
}

export function setupRabbitHoleRoutes(_runtime: any) {
    const router = express.Router();

    // Attempt to load multiple keys from TAVILY_API_KEYS or fallback to the single TAVILY_API_KEY.
    const rawTavilyKeys = process.env.TAVILY_API_KEYS || process.env.TAVILY_API_KEY || "";
    const tavilyKeys = rawTavilyKeys.split(",").map(k => k.trim()).filter(k => k);

    if (tavilyKeys.length === 0) {
        console.warn("[WARNING] No Tavily API keys found in environment variables. Searching will fail.");
    }

    router.post("/rabbitholes/search", async (req: express.Request, res: express.Response) => {
        try {
            const {
                query,
                previousConversation,
                concept,
                followUpMode = "expansive",
            } = req.body as RabbitHoleSearchRequest;

            if (tavilyKeys.length === 0) {
                throw new Error("Tavily API Keys are not configured on the server.");
            }

            // Randomly select one Tavily API key from the pool
            const randomTavilyKey = tavilyKeys[Math.floor(Math.random() * tavilyKeys.length)];
            const keyPreview = randomTavilyKey.substring(0, 4) + '...' + randomTavilyKey.substring(randomTavilyKey.length - 4);
            console.log(`[ROUTE] Using Tavily API Key: ${keyPreview} for query "${query}"`);

            const tavilyClient = tavily({ apiKey: randomTavilyKey });

            const searchResults = await tavilyClient.search(query, {
                searchDepth: "basic",
                includeImages: true,
                maxResults: 3,
            });

            const conversationContext = previousConversation
                ? previousConversation
                    .map(
                        (msg) =>
                            (msg.user ? `User: ${msg.user}\n` : "") +
                            (msg.assistant ? `Assistant: ${msg.assistant}\n` : "")
                    )
                    .join("\n")
                : "";

            const messages = [
                {
                    role: "system",
                    content: `你是一位辩论逻辑专家，擅长深度拆解信息，并能将复杂理论转化为通俗易懂的语言。
任务流程：
每当你收到一份资料或观点时，请按以下四个部分进行分析（必须使用 #### 标题）：
#### 背景与结论
简要概述资料的核心背景，并提炼出其最终试图论证的结论。
#### 论证与证据
列出支撑该结论的主要证据或逻辑推导过程。
#### 逻辑漏洞分析
核心环节：审查资料中是否存在逻辑瑕疵。请重点寻找：
* 因果错位（如因果倒置）、概念漂移（偷换概念）、以偏概全（样本偏差）、伪二律背反（二选一陷阱）等。
* 指出漏洞具体出现在哪一步。
#### 生活化例子
感性映射：设计一个极具画面感的日常生活场景，将上述抽象逻辑类比为评委一眼就能看懂的常识，从而形成共识。

最后，请提供 3 个追问（一定要写到"Follow-up Questions"）：
* 实证追问：一个关于资料细节或数据准确性的问题。
* 视角反转：一个从反方立场出发，质疑核心前提的问题。
* 极端假设：一个通过推演极端情况，挖掘逻辑边界的挑战性问题。`,
                },
                {
                    role: "user",
                    content: `Previous conversation:\n${conversationContext}\n\nSearch results about "${query}":\n${JSON.stringify(
                        searchResults
                    )}\n\nPlease provide a comprehensive response about ${concept || query
                        }. Include relevant facts, context, and relationships to other topics. Format the response in markdown with #### headers. The response should be ${followUpMode === "expansive" ? "broad and exploratory" : "focused and specific"
                        }.`,
                },
            ];

            const completion = (await openAIService.createChatCompletion(messages, "gemini")) as OpenAI.Chat.ChatCompletion;
            const response = completion.choices?.[0]?.message?.content ?? "";

            // Extract follow-up questions by matching the section header with a flexible regex
            // Handles variants like: "Follow-up Questions:", "#### Follow-up Questions",
            // "**Follow-up Questions**", "Follow-Up Questions", etc.
            const followUpSectionRegex = /#{0,6}\s*\*{0,2}\s*follow[- ]up questions\s*\*{0,2}\s*:?/i;
            const followUpSplit = response.split(followUpSectionRegex);
            const followUpSection = followUpSplit.length > 1 ? followUpSplit[1] : null;
            console.log("[DEBUG] followUpSection found:", followUpSplit.length > 1);
            console.log("[DEBUG] followUpSection content:", followUpSection?.slice(0, 300));
            const followUpQuestions = followUpSection
                ? followUpSection
                    .trim()
                    .split("\n")
                    .filter((line) => line.trim())
                    // Strip leading markers: "1.", "* ", "- ", "**1.**", bold text, etc.
                    .map((line) => line.replace(/^(\*{1,2})?\s*(\d+\.|-|\*)\s*(\*{1,2})?\s*/, "").replace(/\*{1,2}/g, "").trim())
                    // Accept both ASCII ? and fullwidth ？ (used in Chinese text)
                    .filter((line) => line.includes("?") || line.includes("\uff1f") || line.length > 15)
                    .slice(0, 3)
                : [];
            console.log("[DEBUG] followUpQuestions parsed:", followUpQuestions);

            // Remove the Follow-up Questions section from the main response
            const mainResponse = response.split(followUpSectionRegex)[0].trim();

            const sources = searchResults.results.map((result: any) => ({
                title: result.title || "",
                url: result.url || "",
                uri: result.url || "",
                author: result.author || "",
                image: result.image || "",
            }));

            const images = searchResults.images
                .map((result: any) => ({
                    url: result.url,
                    thumbnail: result.url,
                    description: result.description || "",
                }));

            const searchResponse: SearchResponse = {
                response: mainResponse,
                followUpQuestions,
                contextualQuery: query,
                sources,
                images,
            };

            res.json(searchResponse);
        } catch (error) {
            console.error("Error in rabbithole search endpoint:", error);
            res.status(500).json({
                error: "Failed to process search request",
                details: (error as Error).message,
            });
        }
    });

    return router;
} 