// lib/fetchStockData.ts
import yahooFinance from "yahoo-finance2";

// Helper to calculate volume trend
export function computeVolumeTrend(volumes: number[]) {
    const avg5 = volumes.slice(-5).reduce((sum, val) => sum + val, 0) / 5;
    const delta: number[] = [];
    for (let i = 1; i < volumes.length; i++) {
        delta.push(volumes[i] - volumes[i - 1]);
    }
    return { avg5, delta };
}

export function calculateEMA(
    prices: number[],
    period: number
): {
    values: number[]; // No nulls anymore
    trend: "rising" | "falling" | "flat";
    slope: number | null;
    current: number | null;
} {
    if (prices.length < period) {
        return {
            values: [],
            trend: "flat",
            slope: null,
            current: null,
        };
    }

    const k = 2 / (period + 1);
    const ema: number[] = [];

    // Start with SMA for the first EMA value
    const sma =
        prices.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
    ema.push(sma); // First EMA

    // Calculate subsequent EMA values
    for (let i = period; i < prices.length; i++) {
        const prev = ema[ema.length - 1];
        const current = prices[i] * k + prev * (1 - k);
        ema.push(current);
    }

    // Compute slope using the last 5 values
    const last5 = ema.slice(-5);
    const deltas: number[] = [];

    for (let i = 1; i < last5.length; i++) {
        deltas.push(last5[i] - last5[i - 1]);
    }

    const slope =
        deltas.length > 0
            ? deltas.reduce((a, b) => a + b, 0) / deltas.length
            : null;

    let trend: "rising" | "falling" | "flat" = "flat";
    if (slope !== null) {
        if (slope > 0.05) trend = "rising";
        else if (slope < -0.05) trend = "falling";
    }

    return {
        values: ema,
        trend,
        slope,
        current: ema.at(-1) ?? null,
    };
}

// Helper EMA function with null padding for initial period
export function calculateEMAWithNullValues(
    prices: number[],
    period: number
): (number | null)[] {
    const k = 2 / (period + 1);
    const ema: (number | null)[] = [];

    let prevEma: number | null = null;

    for (let i = 0; i < prices.length; i++) {
        if (i < period - 1) {
            // Not enough data to calculate EMA
            ema.push(null);
        } else if (i === period - 1) {
            // SMA of first `period` values as initial EMA
            const sma =
                prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
            prevEma = sma;
            ema.push(sma);
        } else {
            // EMA formula
            prevEma =
                (prices[i] - (prevEma ?? prices[i])) * k +
                (prevEma ?? prices[i]);
            ema.push(prevEma);
        }
    }

    return ema;
}

export function calculateRSI(closes: number[], period = 14) {
    const rsi: (number | null)[] = Array(closes.length).fill(null);

    if (closes.length < period + 1) {
        return {
            rsi14: {
                current: null,
                trend: "neutral",
                zone: "neutral",
                previousValues: [],
            },
        };
    }

    let gainSum = 0;
    let lossSum = 0;

    for (let i = 1; i <= period; i++) {
        const delta = closes[i] - closes[i - 1];
        if (delta > 0) gainSum += delta;
        else lossSum -= delta;
    }

    let avgGain = gainSum / period;
    let avgLoss = lossSum / period;
    rsi[period] = 100 - 100 / (1 + avgGain / avgLoss);

    for (let i = period + 1; i < closes.length; i++) {
        const delta = closes[i] - closes[i - 1];
        const gain = delta > 0 ? delta : 0;
        const loss = delta < 0 ? -delta : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi[i] = 100 - 100 / (1 + rs);
    }

    const validRSI = rsi.filter((v): v is number => v !== null);
    const current = parseFloat(validRSI.at(-1)!.toFixed(2));
    const previousValues = validRSI
        .slice(-15, -1)
        .map((v) => parseFloat(v.toFixed(2)));

    // Determine trend with more tolerance (at least 3 out of 5 decreasing/increasing)
    let trend = "neutral";
    const deltas = previousValues
        .map((val, i) => (i === 0 ? 0 : val - previousValues[i - 1]))
        .slice(1);

    const decreasingCount = deltas.filter((d) => d < 0).length;
    const increasingCount = deltas.filter((d) => d > 0).length;

    if (decreasingCount >= 3) trend = "falling";
    else if (increasingCount >= 3) trend = "rising";

    // Adjusted RSI zone thresholds for better reflection
    let zone: "overbought" | "oversold" | "neutral" = "neutral";
    if (current <= 30) zone = "oversold";
    else if (current >= 70) zone = "overbought";

    return {
        current,
        trend,
        zone,
        previousValues,
    };
}

export function calculateMACD(prices: number[]) {
    // Calculate EMAs for 12 and 26 periods
    const ema12 = calculateEMAWithNullValues(prices, 12);
    const ema26 = calculateEMAWithNullValues(prices, 26);

    // MACD line = EMA12 - EMA26 (null if either EMA is null)
    const macdLine: (number | null)[] = prices.map((_, i) => {
        const e12 = ema12[i];
        const e26 = ema26[i];
        if (e12 === null || e26 === null) return null;
        return e12 - e26;
    });

    // Filter MACD line to remove nulls for signal line calculation
    const macdLineForSignal = macdLine.filter((v): v is number => v !== null);
    const signalLineRaw = calculateEMAWithNullValues(macdLineForSignal, 9);

    // Pad signal line with nulls in front to keep length alignment
    const signalLine: (number | null)[] = Array(
        macdLine.length - signalLineRaw.length
    )
        .fill(null)
        .concat(signalLineRaw);

    // Histogram = MACD line - Signal line
    const histogram = macdLine.map((val, i) =>
        val !== null && signalLine[i] !== null ? val - signalLine[i]! : null
    );

    // Find last index with valid MACD and Signal line values
    const lastValidIndex = macdLine
        .map((v, i) => (v !== null && signalLine[i] !== null ? i : -1))
        .filter((i) => i !== -1)
        .pop();

    const macd = lastValidIndex !== undefined ? macdLine[lastValidIndex] : null;
    const signal =
        lastValidIndex !== undefined ? signalLine[lastValidIndex] : null;
    const hist =
        lastValidIndex !== undefined ? histogram[lastValidIndex] : null;

    // Last 3 histogram values for momentum calculation
    const prevHist = histogram.slice(-3).filter((v): v is number => v !== null);

    // Determine crossover state
    const crossover = (() => {
        if (!lastValidIndex || lastValidIndex < 1) return "unknown";

        const prevMacd = macdLine[lastValidIndex - 1];
        const prevSignal = signalLine[lastValidIndex - 1];

        if (
            prevMacd === null ||
            prevSignal === null ||
            macd === null ||
            signal === null
        ) {
            return "unknown";
        }

        const isCurrentlyAbove = macd > signal;
        const wasPreviouslyBelow = prevMacd < prevSignal;
        const wasPreviouslyAbove = prevMacd > prevSignal;

        if (wasPreviouslyBelow && isCurrentlyAbove) return "bullish";
        if (wasPreviouslyAbove && !isCurrentlyAbove) return "bearish";
        if (isCurrentlyAbove) return "above_no_cross";
        if (!isCurrentlyAbove) return "below_no_cross";

        return "neutral";
    })();

    // Determine momentum of histogram
    const momentum = (() => {
        if (prevHist.length < 2) return "flat";
        const [h1, h2] = prevHist.slice(-2);
        if (h2 > h1) return "increasing";
        if (h2 < h1) return "decreasing";
        return "flat";
    })();

    return {
        macdLine: macd !== null ? Number(macd.toFixed(2)) : null,
        signalLine: signal !== null ? Number(signal.toFixed(2)) : null,
        histogram: hist !== null ? Number(hist.toFixed(2)) : null,
        crossover,
        momentum,
        trendPosition:
            macd !== null && signal !== null
                ? macd > signal
                    ? "above"
                    : "below"
                : "unknown",
    };
}

// Bollinger Bands (20 SMA, 2 stddev)
export function calculateBollingerBands(
    prices: number[],
    period = 20,
    mult = 2
) {
    if (prices.length < period) {
        throw new Error("Not enough data points to calculate Bollinger Bands");
    }

    // Calculate SMA (middle band) for the last 'period' prices
    const slice = prices.slice(prices.length - period);
    const mean = slice.reduce((sum, val) => sum + val, 0) / period;

    // Calculate standard deviation for the last 'period' prices
    const stdDev = Math.sqrt(
        slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period
    );

    const upperBand = mean + mult * stdDev;
    const lowerBand = mean - mult * stdDev;

    return {
        upperBand,
        middleBand: mean,
        lowerBand,
    };
}

export async function fetchStockData(symbol: string) {
    console.log(
        `----------------- Fetching stock data for symbol: ${symbol} ----------------------`
    );

    try {
        const modules = [
            "financialData",
            "defaultKeyStatistics",
            "summaryDetail",
            "price",
            "earnings",
            "balanceSheetHistory",
            "cashflowStatementHistory",
            "incomeStatementHistory",
        ];

        const summary = await yahooFinance.quoteSummary(symbol, {
            modules: modules as any,
        });

        // Technical chart data (3 months, daily)
        const period2 = Math.floor(Date.now() / 1000);
        const period1 = Math.floor(
            new Date().setMonth(new Date().getMonth() - 3) / 1000
        );

        const chartResult = await yahooFinance.chart(symbol, {
            period1,
            period2,
            interval: "1d",
        });

        // Extract earnings (revenue and earnings yearly)
        const earningsChart = summary.earnings?.financialsChart?.yearly ?? [];

        const earnings = earningsChart.map((e: any) => ({
            year: e.date,
            revenue: e.revenue ?? null,
            earnings: e.earnings ?? null,
        }));

        // Extract income statement trends
        const incomeStatements =
            summary.incomeStatementHistory?.incomeStatementHistory ?? [];
        const incomeTrend = {
            totalRevenue: incomeStatements.map((s: any) => ({
                date: s.endDate ?? null,
                value: s.totalRevenue ?? null,
            })),
            netIncome: incomeStatements.map((s: any) => ({
                date: s.endDate ?? null,
                value: s.netIncome ?? null,
            })),
        };

        // Extract balance sheet trends
        // const balanceSheets =
        //     summary.balanceSheetHistory?.balanceSheetStatements ?? [];
        // const balanceSheetTrend = {
        //     totalAssets: balanceSheets.map((s: any) => ({
        //         date: s.endDate ?? null,
        //         value: s.totalAssets ?? null,
        //     })),
        //     totalLiabilities: balanceSheets.map((s: any) => ({
        //         date: s.endDate ?? null,
        //         value: s.totalLiabilities ?? null,
        //     })),
        //     shareholderEquity: balanceSheets.map((s: any) => ({
        //         date: s.endDate ?? null,
        //         value: s.totalStockholderEquity ?? null,
        //     })),
        // };

        // Extract cash flow trends
        const cashflows =
            summary.cashflowStatementHistory?.cashflowStatements ?? [];
        const cashflowTrend = {
            netIncome: cashflows.map((s: any) => ({
                date: s.endDate ?? null,
                value: s.netIncome ?? null,
            })),
        };

        // Compute moving averages and volume trends
        const closes = chartResult.quotes
            .map((q) => q.adjclose)
            .filter((v) => v != null);

        const volumes = chartResult?.quotes?.map((d) => d.volume ?? 0) ?? [];
        const volumeTrend = computeVolumeTrend(volumes);

        const ema20 = calculateEMA(closes, 20);
        const ema50 = calculateEMA(closes, 50);
        const rsi14 = calculateRSI(closes);
        const macd = calculateMACD(closes);
        const bollinger = calculateBollingerBands(closes);

        const financials = {
            symbol: summary.price?.symbol ?? null,
            price: summary.price?.regularMarketPrice ?? null,
            volume: summary.summaryDetail?.volume ?? null,
            averageVolume: summary.summaryDetail?.averageVolume ?? null,
            revenueGrowth: summary.financialData?.revenueGrowth ?? null,
            returnOnEquity: summary.financialData?.returnOnEquity ?? null,
            forwardPE: summary.summaryDetail?.forwardPE ?? null,
            trailingPE: summary.summaryDetail?.trailingPE ?? null,
            debtToEquity: summary.financialData?.debtToEquity ?? null,
            freeCashFlow: summary.financialData?.freeCashflow ?? null,
            priceToBook: summary.defaultKeyStatistics?.priceToBook ?? null,
            fiftyTwoWeekHigh: summary.summaryDetail?.fiftyTwoWeekHigh ?? null,
            fiftyTwoWeekLow: summary.summaryDetail?.fiftyTwoWeekLow ?? null,
            marketCap: summary.summaryDetail?.marketCap ?? null,
            ebitda: summary.financialData?.ebitda ?? null,
            earnings,
            incomeTrend,
            cashflowTrend,
        };

        return {
            financials,
            technicalIndicators: {
                volumeTrend,
                ema20,
                ema50,
                rsi14,
                macd,
                bollingerBands: {
                    upper: bollinger.upperBand,
                    middle: bollinger.middleBand,
                    lower: bollinger.lowerBand,
                },
            },
        };
    } catch (err) {
        console.error("Error fetching stock data:", err);
        throw err;
    }
}
