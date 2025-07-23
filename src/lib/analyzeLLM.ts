// lib/analyzeLLM.ts
import { GoogleGenAI } from "@google/genai";

export async function analyzeLLM(prompt: string) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;

    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set");
    }
    const genAI = new GoogleGenAI({});
    const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            thinkingConfig: {
                thinkingBudget: 0,
            },
        },
    });

    const result = response.text;
    const tokensUsed = response.usageMetadata?.totalTokenCount;
    return { result, tokensUsed };
}
