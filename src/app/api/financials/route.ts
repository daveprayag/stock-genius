// app/api/financials/route.ts
import { NextResponse } from "next/server";
import { fetchStockData } from "@/lib/fetchStockData";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const symbol = url.searchParams.get("symbol") + ".NS";

    if (!symbol) {
        return NextResponse.json(
            { error: "You need to mention a stock symbol." },
            { status: 400 }
        );
    }

    const data = await fetchStockData(symbol);
    if (!data) {
        return NextResponse.json(
            { error: "No data found for the given stock symbol." },
            { status: 404 }
        );
    }

    return NextResponse.json(
        {
            financials: data.financials,
            technicalIndicators: data.technicalIndicators,
        },
        { status: 200 }
    );
}
