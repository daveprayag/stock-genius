// app/api/analyze/route.ts
import { NextResponse } from "next/server";
import { analyzeLLM } from "@/lib/analyzeLLM";

export async function POST(request: Request) {
    const { prompt } = await request.json();

    if (!prompt) {
        return NextResponse.json(
            { error: "Prompt is required" },
            { status: 400 }
        );
    }

    try {
        const response = await analyzeLLM(prompt);
        return NextResponse.json(response);
    } catch (error) {
        console.error("Error in analyzeLLM API:", error);
        return NextResponse.json(
            { error: "Failed to analyze prompt" },
            { status: 500 }
        );
    }
}
