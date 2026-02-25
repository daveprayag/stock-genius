// app/api/momentum/route.ts
import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { getNSEStocks, clearUniverseCache } from "@/lib/getNSEStocks";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// ─── Cache (15-minute TTL) ────────────────────────────────────────────────────
interface CacheEntry {
    data: ReturnType<typeof buildResponse>;
    ts: number;
}
let cache: CacheEntry | null = null;
const CACHE_TTL = 15 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScreenedStock {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    oneMonthReturn: number;
    threeMonthReturn: number;
    pctBelowOneMonthHigh: number;
    oneMonthHigh: number;
    pctBelow52WkHigh: number;
    ema50: number;
    ema50Pct: number;
    ema200: number | null;
    ema200Pct: number | null;
    volume: number;
    avgVolume: number;
    volRatio: number;
    marketCap: number | null;
    pe: number | null;
    momentumScore: number;
    aboveEma200: boolean;
    highVolumeDay: boolean;
    isBreakout: boolean;
}

interface BreakoutStock {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    oneWeekReturn: number;
    oneMonthReturn: number;
    threeMonthReturn: number;
    pctBelow52WkHigh: number;
    fiftyTwoWeekHigh: number;
    ema50Pct: number;
    ema200Pct: number | null;
    volRatio: number;
    volume: number;
    avgVolume: number;
    marketCap: number | null;
    rsi14: number | null;
    breakoutScore: number;
    signals: string[];
}

function buildResponse(stocks: ScreenedStock[], breakouts: BreakoutStock[]) {
    return {
        stocks,
        breakouts,
        lastUpdated: new Date().toISOString(),
        total: stocks.length,
        breakoutsTotal: breakouts.length,
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function fetchChartBatch(
    symbols: string[],
    period1: Date,
    batchSize = 20
): Promise<PromiseSettledResult<any>[]> {
    const results: PromiseSettledResult<any>[] = [];
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
            batch.map((sym) =>
                yahooFinance.chart(
                    sym,
                    { period1, period2: new Date(), interval: "1d" },
                    { validateResult: false }
                )
            )
        );
        results.push(...batchResults);
        if (i + batchSize < symbols.length) {
            await new Promise((r) => setTimeout(r, 80));
        }
    }
    return results;
}

/** Simple 14-period RSI. Good enough for signal detection. */
function computeRSI(closes: number[], period = 14): number | null {
    if (closes.length < period + 1) return null;
    const slice = closes.slice(-(period + 1));
    let gains = 0, losses = 0;
    for (let i = 1; i < slice.length; i++) {
        const diff = slice[i] - slice[i - 1];
        if (diff > 0) gains += diff; else losses -= diff;
    }
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = (gains / period) / avgLoss;
    return parseFloat((100 - 100 / (1 + rs)).toFixed(1));
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    if (!forceRefresh && cache && Date.now() - cache.ts < CACHE_TTL) {
        return NextResponse.json(cache.data);
    }

    try {
        // ── Step 1: dynamic NSE universe via screener (~250 stocks) ──────────
        if (forceRefresh) clearUniverseCache();
        const rawQuotes = await getNSEStocks();

        // ── Step 2: pre-filter — must be above EMA50 ──────────────────────
        const candidates = rawQuotes.filter(
            (q) =>
                q.regularMarketPrice != null &&
                q.fiftyDayAverage != null &&
                q.regularMarketPrice > q.fiftyDayAverage
        );

        // ── Step 3: parallel chart calls (3-month daily) ───────────────────
        const threeMonthAgo = new Date();
        threeMonthAgo.setMonth(threeMonthAgo.getMonth() - 3);

        const chartResults = await fetchChartBatch(
            candidates.map((q) => q.symbol),
            threeMonthAgo
        );

        // ── Step 4: compute indicators for ALL candidates ──────────────────
        interface ComputedCandidate {
            q: any;
            closes: number[];
            oneWeekReturn: number;
            oneMonthReturn: number;
            threeMonthReturn: number;
            pctBelowOneMonthHigh: number;
            oneMonthHigh: number;
            pctBelow52WkHigh: number;
            ema50Pct: number;
            ema200Pct: number | null;
            volRatio: number;
            rsi14: number | null;
        }

        const allComputed: ComputedCandidate[] = [];

        candidates.forEach((q, i) => {
            const res = chartResults[i];
            if (res.status !== "fulfilled") return;

            const quotes: any[] = (res.value as any)?.quotes ?? [];
            if (quotes.length < 10) return;

            const closes = quotes
                .map((x: any) => (x.adjclose ?? x.close) as number | null)
                .filter((v): v is number => v != null);
            const highs = quotes
                .map((x: any) => x.high as number | null)
                .filter((v): v is number => v != null);

            if (closes.length < 10 || highs.length < 5) return;

            const price: number = q.regularMarketPrice;
            const threeMonthReturn = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;
            // 1W return: last ~5 trading days
            const oneWeekReturn = closes.length >= 6
                ? ((closes[closes.length - 1] - closes[closes.length - 6]) / closes[closes.length - 6]) * 100
                : threeMonthReturn / 12;
            // 1M return: last ~21 trading days
            const oneMonthReturn = closes.length >= 22
                ? ((closes[closes.length - 1] - closes[closes.length - 22]) / closes[closes.length - 22]) * 100
                : threeMonthReturn / 3;

            const oneMonthHighs = highs.slice(-21);
            const oneMonthHigh = Math.max(...oneMonthHighs);
            const pctBelowOneMonthHigh = ((oneMonthHigh - price) / oneMonthHigh) * 100;

            // 52W high proximity (negative = above 52W high, i.e., ATH)
            const fiftyTwoWeekHigh: number = q.fiftyTwoWeekHigh ?? 0;
            const pctBelow52WkHigh = fiftyTwoWeekHigh > 0
                ? ((fiftyTwoWeekHigh - price) / fiftyTwoWeekHigh) * 100
                : 100;

            const ema50Pct: number = q.fiftyDayAverageChangePercent ?? 0;
            const ema200Pct: number | null = q.twoHundredDayAverageChangePercent ?? null;
            const volRatio = q.averageDailyVolume3Month && q.regularMarketVolume > 0
                ? q.regularMarketVolume / q.averageDailyVolume3Month
                : 1;

            const rsi14 = computeRSI(closes);

            allComputed.push({
                q, closes, oneWeekReturn, oneMonthReturn, threeMonthReturn,
                pctBelowOneMonthHigh, oneMonthHigh, pctBelow52WkHigh,
                ema50Pct, ema200Pct, volRatio, rsi14,
            });
        });

        // ── Step 5: momentum stocks (3M criteria) ─────────────────────────
        const screened: ScreenedStock[] = allComputed
            .filter(c =>
                c.threeMonthReturn >= 10 &&
                c.pctBelowOneMonthHigh >= 0 &&
                c.pctBelowOneMonthHigh <= 10
            )
            .map(c => {
                const { q, oneMonthReturn, threeMonthReturn, pctBelowOneMonthHigh,
                    oneMonthHigh, pctBelow52WkHigh, ema50Pct, ema200Pct, volRatio } = c;
                const price: number = q.regularMarketPrice;

                const momentumScore =
                    Math.min(threeMonthReturn, 80) * 0.45 +
                    ema50Pct * 0.25 +
                    ((ema200Pct ?? 0) > 0 ? (ema200Pct ?? 0) * 0.5 : (ema200Pct ?? 0)) * 0.15 +
                    (10 - pctBelowOneMonthHigh) * 0.5 * 0.10 +
                    Math.min(Math.max(volRatio - 1, 0), 2) * 2 * 0.05;

                // Breakout flag: volume surge + (recent 1M strength OR near 52W high)
                const isBreakout = volRatio >= 2.0 &&
                    (oneMonthReturn >= 8 || (q.fiftyTwoWeekHigh != null && pctBelow52WkHigh <= 3));

                return {
                    symbol: (q.symbol as string).replace(".NS", ""),
                    name: (q.shortName || q.longName || q.symbol) as string,
                    price,
                    changePercent: q.regularMarketChangePercent ?? 0,
                    oneMonthReturn: parseFloat(oneMonthReturn.toFixed(2)),
                    threeMonthReturn: parseFloat(threeMonthReturn.toFixed(2)),
                    pctBelowOneMonthHigh: parseFloat(pctBelowOneMonthHigh.toFixed(2)),
                    oneMonthHigh: parseFloat(oneMonthHigh.toFixed(2)),
                    pctBelow52WkHigh: q.fiftyTwoWeekHigh != null
                        ? parseFloat(pctBelow52WkHigh.toFixed(2))
                        : null as any,
                    ema50: q.fiftyDayAverage,
                    ema50Pct: parseFloat(ema50Pct.toFixed(2)),
                    ema200: q.twoHundredDayAverage ?? null,
                    ema200Pct: ema200Pct != null ? parseFloat(ema200Pct.toFixed(2)) : null,
                    volume: q.regularMarketVolume ?? 0,
                    avgVolume: q.averageDailyVolume3Month ?? 0,
                    volRatio: parseFloat(volRatio.toFixed(2)),
                    marketCap: q.marketCap ?? null,
                    pe: q.trailingPE ?? null,
                    momentumScore: parseFloat(momentumScore.toFixed(2)),
                    aboveEma200: price > (q.twoHundredDayAverage ?? 0),
                    highVolumeDay: volRatio >= 1.5,
                    isBreakout,
                } satisfies ScreenedStock;
            })
            .sort((a, b) => b.momentumScore - a.momentumScore);

        // ── Step 6: early breakout stocks (above EMA50, not yet momentum) ──
        const momentumSymbols = new Set(screened.map(s => s.symbol + ".NS"));

        const breakouts: BreakoutStock[] = allComputed
            .filter(c => !momentumSymbols.has(c.q.symbol))
            .filter(c => {
                const changePercent: number = c.q.regularMarketChangePercent ?? 0;
                let count = 0;
                if (c.volRatio >= 2.0) count++;
                if (c.oneMonthReturn >= 8) count++;
                if (c.q.fiftyTwoWeekHigh != null && c.pctBelow52WkHigh <= 5) count++;
                if (changePercent >= 2.5) count++;
                if (c.rsi14 != null && c.rsi14 >= 58 && c.rsi14 <= 78) count++;
                return count >= 2;
            })
            .map(c => {
                const { q, oneWeekReturn, oneMonthReturn, threeMonthReturn, pctBelow52WkHigh,
                    ema50Pct, ema200Pct, volRatio, rsi14 } = c;
                const price: number = q.regularMarketPrice;
                const changePercent: number = q.regularMarketChangePercent ?? 0;

                const signals: string[] = [];
                if (volRatio >= 2.0) signals.push(`Vol ${volRatio.toFixed(1)}×`);
                if (oneMonthReturn >= 8) signals.push(`+${oneMonthReturn.toFixed(1)}% 1M`);
                if (q.fiftyTwoWeekHigh != null && pctBelow52WkHigh <= 5)
                    signals.push(pctBelow52WkHigh <= 0 ? "At ATH" : `${pctBelow52WkHigh.toFixed(1)}% off 52W`);
                if (changePercent >= 2.5) signals.push(`+${changePercent.toFixed(1)}% today`);
                if (rsi14 != null && rsi14 >= 58 && rsi14 <= 78) signals.push(`RSI ${rsi14}`);

                // Score: volume (40 max) + 1M return (15 max) + 52W proximity (12 max) + day move (10 max) + RSI (5 max)
                const breakoutScore =
                    Math.min(Math.max(volRatio - 1, 0), 4) * 10 +
                    Math.min(Math.max(oneMonthReturn, 0), 25) * 0.6 +
                    (q.fiftyTwoWeekHigh != null ? Math.max(8 - pctBelow52WkHigh, 0) * 1.5 : 0) +
                    Math.min(Math.max(changePercent, 0), 5) * 2 +
                    (rsi14 != null && rsi14 >= 58 && rsi14 <= 78 ? 5 : 0);

                return {
                    symbol: (q.symbol as string).replace(".NS", ""),
                    name: (q.shortName || q.longName || q.symbol) as string,
                    price,
                    changePercent: parseFloat(changePercent.toFixed(2)),
                    oneWeekReturn: parseFloat(oneWeekReturn.toFixed(2)),
                    oneMonthReturn: parseFloat(oneMonthReturn.toFixed(2)),
                    threeMonthReturn: parseFloat(threeMonthReturn.toFixed(2)),
                    pctBelow52WkHigh: q.fiftyTwoWeekHigh != null
                        ? parseFloat(pctBelow52WkHigh.toFixed(2))
                        : 100,
                    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? price,
                    ema50Pct: parseFloat(ema50Pct.toFixed(2)),
                    ema200Pct: ema200Pct != null ? parseFloat(ema200Pct.toFixed(2)) : null,
                    volRatio: parseFloat(volRatio.toFixed(2)),
                    volume: q.regularMarketVolume ?? 0,
                    avgVolume: q.averageDailyVolume3Month ?? 0,
                    marketCap: q.marketCap ?? null,
                    rsi14,
                    breakoutScore: parseFloat(breakoutScore.toFixed(2)),
                    signals,
                } satisfies BreakoutStock;
            })
            .sort((a, b) => b.breakoutScore - a.breakoutScore)
            .slice(0, 20);

        const response = buildResponse(screened, breakouts);
        cache = { data: response, ts: Date.now() };
        return NextResponse.json(response);
    } catch (err) {
        console.error("Momentum fetch error:", err);
        return NextResponse.json(
            { error: "Failed to fetch momentum data." },
            { status: 500 }
        );
    }
}
