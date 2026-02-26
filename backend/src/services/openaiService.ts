import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

export interface OpenAIConfig {
    baseURL: string;
    apiKey: string;
    defaultModel: string;
}

export interface ModelConfig {
    [key: string]: {
        baseURL: string;
        apiKey: string;
        model: string;
    };
}

export class OpenAIService {
    private static instance: OpenAIService;
    private clients: Map<string, OpenAI>;
    private modelConfigs: ModelConfig;

    private constructor() {
        const googleApiKey = process.env.GOOGLE_AI_API_KEY;
        if (!googleApiKey) {
            throw new Error('GOOGLE_AI_API_KEY is not set in environment variables');
        }

        this.clients = new Map();
        this.modelConfigs = {
            gemini: {
                baseURL: "https://api.siliconflow.com/v1",
                apiKey: googleApiKey,
                model: "deepseek-ai/DeepSeek-V3.2",
            }
        };
    }

    public static getInstance(): OpenAIService {
        if (!OpenAIService.instance) {
            OpenAIService.instance = new OpenAIService();
        }
        return OpenAIService.instance;
    }

    private getClient(provider: string): OpenAI {
        if (!this.clients.has(provider)) {
            const config = this.modelConfigs[provider];
            if (!config) {
                throw new Error(`Provider ${provider} not configured`);
            }
            this.clients.set(
                provider,
                new OpenAI({
                    baseURL: config.baseURL,
                    apiKey: config.apiKey,
                })
            );
        }
        return this.clients.get(provider)!;
    }

    public async createChatCompletion(
        messages: Array<{
            role: string;
            content: string | Array<{ type: string; text?: string; imageUrl?: string }>;
        }>,
        provider: string = "gemini",
        options: Partial<OpenAI.Chat.ChatCompletionCreateParams> = {}
    ) {
        const client = this.getClient(provider);
        const config = this.modelConfigs[provider];
        const response = await client.chat.completions.create({
            messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
            model: config.model,
            stream: false,
            ...options,
        });
        return response as OpenAI.Chat.ChatCompletion;
    }

    public async createStreamCompletion(
        messages: Array<{
            role: string;
            content: string | Array<{ type: string; text?: string; imageUrl?: string }>;
        }>,
        provider: string = "gemini",
        options: Partial<OpenAI.Chat.ChatCompletionCreateParams> = {},
        signal?: AbortSignal
    ) {
        const client = this.getClient(provider);
        const config = this.modelConfigs[provider];
        const stream = await client.chat.completions.create(
            {
                messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
                model: config.model,
                stream: true,
                ...options,
            },
            { signal }
        );
        return stream;
    }

    public getModelConfig(provider: string) {
        return this.modelConfigs[provider];
    }
}

export const openAIService = OpenAIService.getInstance(); 