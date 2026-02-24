// app/api/value/route.ts
import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getNSEStocks } from "@/lib/getNSEStocks";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// ─── Cache (30-minute TTL) ────────────────────────────────────────────────────
interface CacheEntry {
    data: ValueStock[];
    ts: number;
}
let cache: CacheEntry | null = null;
const CACHE_TTL = 30 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ValueStock {
    symbol: string;
    name: string;
    sector: string;
    price: number;
    changePercent: number;
    marketCap: number | null;
    // Valuation
    pe: number | null;
    forwardPE: number | null;
    priceToBook: number | null;
    pegRatio: number | null;
    // Profitability
    roe: number | null;             // returnOnEquity (decimal)
    operatingMargin: number | null; // decimal
    netMargin: number | null;       // decimal
    // Balance sheet
    debtToEquity: number | null;
    currentRatio: number | null;
    // Cash flow
    freeCashFlow: number | null;
    fcfYield: number | null;        // FCF / marketCap (decimal)
    // Analyst
    analystTargetPrice: number | null;
    analystUpside: number | null;   // % upside to target
    numberOfAnalysts: number | null;
    // Dividend
    dividendYield: number | null;   // decimal
    // Score & label
    valueScore: number;
    valueLabel: "Deep Value" | "Value" | "Fair Value";
}

// ─── Value Scoring ────────────────────────────────────────────────────────────
// Max ~105 points. Calibrated for Indian large/mid caps.
function computeValueScore(s: Omit<ValueStock, "valueScore" | "valueLabel">): number {
    let score = 0;

    // PE ratio (0–25 pts) — lower is better for value
    if (s.pe != null && s.pe > 0) {
        if (s.pe < 10) score += 25;
        else if (s.pe < 15) score += 20;
        else if (s.pe < 20) score += 15;
        else if (s.pe < 25) score += 10;
        else if (s.pe < 30) score += 5;
    }

    // Price-to-Book (0–12 pts)
    if (s.priceToBook != null && s.priceToBook > 0) {
        if (s.priceToBook < 1) score += 12;
        else if (s.priceToBook < 2) score += 9;
        else if (s.priceToBook < 3) score += 6;
        else if (s.priceToBook < 5) score += 3;
    }

    // PEG ratio (0–10 pts) — below 1 = growth at a discount
    if (s.pegRatio != null && s.pegRatio > 0) {
        if (s.pegRatio < 0.5) score += 10;
        else if (s.pegRatio < 1) score += 8;
        else if (s.pegRatio < 1.5) score += 5;
        else if (s.pegRatio < 2) score += 2;
    }

    // ROE (0–20 pts) — strong returns on equity = quality
    if (s.roe != null) {
        const roePct = s.roe * 100;
        if (roePct >= 25) score += 20;
        else if (roePct >= 20) score += 16;
        else if (roePct >= 15) score += 12;
        else if (roePct >= 10) score += 8;
        else if (roePct >= 5) score += 4;
    }

    // Debt to Equity (0–10 pts) — lower debt = safer
    if (s.debtToEquity != null) {
        if (s.debtToEquity < 0.25) score += 10;
        else if (s.debtToEquity < 0.5) score += 8;
        else if (s.debtToEquity < 1) score += 5;
        else if (s.debtToEquity < 1.5) score += 2;
    }

    // Analyst Upside (0–10 pts)
    if (s.analystUpside != null) {
        if (s.analystUpside >= 40) score += 10;
        else if (s.analystUpside >= 25) score += 7;
        else if (s.analystUpside >= 15) score += 4;
        else if (s.analystUpside >= 5) score += 1;
    }

    // FCF Yield (0–7 pts) — positive free cash flow generation
    if (s.fcfYield != null) {
        const fcfPct = s.fcfYield * 100;
        if (fcfPct >= 6) score += 7;
        else if (fcfPct >= 4) score += 5;
        else if (fcfPct >= 2) score += 3;
        else if (fcfPct > 0) score += 1;
    }

    // Dividend Yield (0–5 pts) — income support
    if (s.dividendYield != null) {
        const divPct = s.dividendYield * 100;
        if (divPct >= 4) score += 5;
        else if (divPct >= 2.5) score += 3;
        else if (divPct >= 1) score += 1;
    }

    // Operating Margin (0–6 pts) — business quality
    if (s.operatingMargin != null) {
        const opPct = s.operatingMargin * 100;
        if (opPct >= 25) score += 6;
        else if (opPct >= 15) score += 4;
        else if (opPct >= 10) score += 2;
        else if (opPct >= 5) score += 1;
    }

    return Math.round(score);
}

function valueLabel(score: number): ValueStock["valueLabel"] {
    if (score >= 60) return "Deep Value";
    if (score >= 40) return "Value";
    return "Fair Value";
}

// ─── GET Handler ──────────────────────────────────────────────────────────────
export async function GET() {
    // Serve cache
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
        return NextResponse.json({ stocks: cache.data, cached: true, total: cache.data.length });
    }

    try {
        // Step 1: Dynamic NSE universe via screener (~250 stocks by market cap)
        const quotes = await getNSEStocks();

        // Pre-filter: need a price, marketCap > 5B, trailingPE 0-60 (positive earnings, not absurdly expensive)
        const candidates = quotes.filter((q) =>
            q.regularMarketPrice > 0 &&
            q.marketCap != null && q.marketCap > 5_000_000_000 &&
            q.trailingPE != null && q.trailingPE > 0 && q.trailingPE < 60
        );

        // Step 2: Batch quoteSummary for detailed fundamentals
        const results: ValueStock[] = [];
        const batchSize = 6;

        for (let i = 0; i < candidates.length; i += batchSize) {
            const batch = candidates.slice(i, i + batchSize);

            const batchResults = await Promise.allSettled(
                batch.map(async (q: any) => {
                    try {
                        const summary = await (yahooFinance.quoteSummary as any)(
                            q.symbol,
                            {
                                modules: [
                                    "financialData",
                                    "defaultKeyStatistics",
                                    "summaryDetail",
                                    "summaryProfile",
                                ],
                            },
                            { validateResult: false }
                        ) as any;

                        const fd = summary?.financialData ?? {};
                        const ks = summary?.defaultKeyStatistics ?? {};
                        const sd = summary?.summaryDetail ?? {};
                        const sp = summary?.summaryProfile ?? {};

                        const price: number = q.regularMarketPrice;
                        const cap: number = q.marketCap;

                        // FCF yield
                        const fcf: number | null = fd.freeCashflow ?? null;
                        const fcfYield = fcf != null && cap > 0 ? fcf / cap : null;

                        // Analyst upside
                        const target: number | null = fd.targetMeanPrice ?? null;
                        const analystUpside = target != null && price > 0
                            ? ((target - price) / price) * 100
                            : null;

                        const stock: Omit<ValueStock, "valueScore" | "valueLabel"> = {
                            symbol: q.symbol.replace(".NS", ""),
                            name: q.shortName ?? q.symbol,
                            sector: sp.sector ?? "—",
                            price,
                            changePercent: q.regularMarketChangePercent ?? 0,
                            marketCap: cap,
                            pe: q.trailingPE ?? null,
                            forwardPE: ks.forwardPE ?? null,
                            priceToBook: ks.priceToBook ?? null,
                            pegRatio: ks.pegRatio ?? null,
                            roe: fd.returnOnEquity ?? null,
                            operatingMargin: fd.operatingMargins ?? null,
                            netMargin: fd.profitMargins ?? null,
                            debtToEquity: fd.debtToEquity ?? null,
                            currentRatio: fd.currentRatio ?? null,
                            freeCashFlow: fcf,
                            fcfYield,
                            analystTargetPrice: target,
                            analystUpside,
                            numberOfAnalysts: fd.numberOfAnalystOpinions ?? null,
                            dividendYield: sd.dividendYield ?? null,
                        };

                        const vs = computeValueScore(stock);
                        return { ...stock, valueScore: vs, valueLabel: valueLabel(vs) } as ValueStock;
                    } catch {
                        return null;
                    }
                })
            );

            for (const r of batchResults) {
                if (r.status === "fulfilled" && r.value != null) {
                    results.push(r.value);
                }
            }

            if (i + batchSize < candidates.length) {
                await new Promise((res) => setTimeout(res, 120));
            }
        }

        // Sort by valueScore desc, take top 35
        const sorted = results
            .filter((s) => s.valueScore >= 20) // minimum threshold
            .sort((a, b) => b.valueScore - a.valueScore)
            .slice(0, 35);

        cache = { data: sorted, ts: Date.now() };
        return NextResponse.json({ stocks: sorted, cached: false, total: sorted.length });
    } catch (err: any) {
        console.error("[/api/value] error:", err);
        return NextResponse.json({ error: "Failed to fetch value data." }, { status: 500 });
    }
}
