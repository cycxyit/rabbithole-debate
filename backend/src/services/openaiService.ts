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
    private clients: Map<string, OpenAI[]>;
    private modelConfigs: ModelConfig;

    private constructor() {
        // Support SILICONFLOW_API_KEYS as the primary pool, fallback to GOOGLE_AI_API_KEYS, or a single GOOGLE_AI_API_KEY
        const rawSiliconFlowKeys = process.env.SILICONFLOW_API_KEYS || process.env.GOOGLE_AI_API_KEYS || process.env.GOOGLE_AI_API_KEY || "";
        const siliconFlowKeys = rawSiliconFlowKeys.split(",").map(k => k.trim()).filter(k => k);

        if (siliconFlowKeys.length === 0) {
            throw new Error('SILICONFLOW_API_KEYS or GOOGLE_AI_API_KEY is not set in environment variables');
        }

        this.clients = new Map();

        // Setup initial config (using the first key just for metadata fallback if ever needed)
        this.modelConfigs = {
            gemini: {
                baseURL: "https://api.siliconflow.com/v1",
                apiKey: siliconFlowKeys[0],
                model: "deepseek-ai/DeepSeek-V3.2",
            }
        };

        // Cache the pool of OpenAI clients for Gemini (SiliconFlow)
        const geminiClients = siliconFlowKeys.map(key => new OpenAI({
            baseURL: this.modelConfigs.gemini.baseURL,
            apiKey: key,
        }));

        this.clients.set('gemini', geminiClients);
        console.log(`[SERVICE] Initialized ${geminiClients.length} SiliconFlow API key(s) for Gemini model`);
    }

    public static getInstance(): OpenAIService {
        if (!OpenAIService.instance) {
            OpenAIService.instance = new OpenAIService();
        }
        return OpenAIService.instance;
    }

    private getClient(provider: string): OpenAI {
        if (!this.clients.has(provider) || this.clients.get(provider)!.length === 0) {
            throw new Error(`Provider ${provider} not configured or has no API keys`);
        }

        const pool = this.clients.get(provider)!;
        // Select a random client from the pool
        const randomIndex = Math.floor(Math.random() * pool.length);
        const selectedClient = pool[randomIndex];

        const apiKey = selectedClient.apiKey;
        const keyPreview = apiKey ? (apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4)) : 'unknown';
        console.log(`[SERVICE] Using OpenAI Provider "${provider}" with API Key: ${keyPreview}`);

        return selectedClient;
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