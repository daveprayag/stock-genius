// lib/fetchStockData.ts
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({
    suppressNotices: ["yahooSurvey"],
});

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
    values: number[];
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
    ema.push(sma);

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

    // Percentage-based slope threshold — works for any price level
    const currentPrice = ema.at(-1) ?? 0;
    let trend: "rising" | "falling" | "flat" = "flat";
    if (slope !== null) {
        const slopePct = currentPrice > 0 ? (slope / currentPrice) * 100 : 0;
        if (slopePct > 0.02) trend = "rising";
        else if (slopePct < -0.02) trend = "falling";
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
            ema.push(null);
        } else if (i === period - 1) {
            const sma =
                prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
            prevEma = sma;
            ema.push(sma);
        } else {
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

    let trend = "neutral";
    const deltas = previousValues
        .map((val, i) => (i === 0 ? 0 : val - previousValues[i - 1]))
        .slice(1);

    const decreasingCount = deltas.filter((d) => d < 0).length;
    const increasingCount = deltas.filter((d) => d > 0).length;

    if (decreasingCount >= 3) trend = "falling";
    else if (increasingCount >= 3) trend = "rising";

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
    const ema12 = calculateEMAWithNullValues(prices, 12);
    const ema26 = calculateEMAWithNullValues(prices, 26);

    const macdLine: (number | null)[] = prices.map((_, i) => {
        const e12 = ema12[i];
        const e26 = ema26[i];
        if (e12 === null || e26 === null) return null;
        return e12 - e26;
    });

    const macdLineForSignal = macdLine.filter((v): v is number => v !== null);
    const signalLineRaw = calculateEMAWithNullValues(macdLineForSignal, 9);

    const signalLine: (number | null)[] = Array(
        macdLine.length - signalLineRaw.length
    )
        .fill(null)
        .concat(signalLineRaw);

    const histogram = macdLine.map((val, i) =>
        val !== null && signalLine[i] !== null ? val - signalLine[i]! : null
    );

    const lastValidIndex = macdLine
        .map((v, i) => (v !== null && signalLine[i] !== null ? i : -1))
        .filter((i) => i !== -1)
        .pop();

    const macd = lastValidIndex !== undefined ? macdLine[lastValidIndex] : null;
    const signal =
        lastValidIndex !== undefined ? signalLine[lastValidIndex] : null;
    const hist =
        lastValidIndex !== undefined ? histogram[lastValidIndex] : null;

    const prevHist = histogram.slice(-3).filter((v): v is number => v !== null);

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

    const slice = prices.slice(prices.length - period);
    const mean = slice.reduce((sum, val) => sum + val, 0) / period;

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

// ATR (Average True Range, Wilder smoothing)
export function calculateATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period = 14
) {
    if (highs.length < period + 1) {
        return {
            current: null,
            percentOfPrice: null,
            interpretation: "insufficient data",
        };
    }

    const trueRanges: number[] = [];
    for (let i = 1; i < closes.length; i++) {
        const hl = highs[i] - lows[i];
        const hpc = Math.abs(highs[i] - closes[i - 1]);
        const lpc = Math.abs(lows[i] - closes[i - 1]);
        trueRanges.push(Math.max(hl, hpc, lpc));
    }

    let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trueRanges.length; i++) {
        atr = (atr * (period - 1) + trueRanges[i]) / period;
    }

    const lastPrice = closes.at(-1) ?? 1;
    const percentOfPrice = (atr / lastPrice) * 100;

    let interpretation = "normal volatility";
    if (percentOfPrice > 3) interpretation = "high volatility";
    else if (percentOfPrice < 1) interpretation = "low volatility";

    return {
        current: parseFloat(atr.toFixed(2)),
        percentOfPrice: parseFloat(percentOfPrice.toFixed(2)),
        interpretation,
    };
}

// ADX (Average Directional Index)
export function calculateADX(
    highs: number[],
    lows: number[],
    closes: number[],
    period = 14
) {
    if (highs.length < period * 2) {
        return {
            adx: null,
            plusDI: null,
            minusDI: null,
            trend: "insufficient data" as const,
        };
    }

    const plusDMs: number[] = [];
    const minusDMs: number[] = [];
    const trueRanges: number[] = [];

    for (let i = 1; i < closes.length; i++) {
        const upMove = highs[i] - highs[i - 1];
        const downMove = lows[i - 1] - lows[i];

        plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
        minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);

        const hl = highs[i] - lows[i];
        const hpc = Math.abs(highs[i] - closes[i - 1]);
        const lpc = Math.abs(lows[i] - closes[i - 1]);
        trueRanges.push(Math.max(hl, hpc, lpc));
    }

    let smPlusDM = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
    let smMinusDM = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);
    let smTR = trueRanges.slice(0, period).reduce((a, b) => a + b, 0);

    let plusDI = smTR > 0 ? (smPlusDM / smTR) * 100 : 0;
    let minusDI = smTR > 0 ? (smMinusDM / smTR) * 100 : 0;
    let dx =
        plusDI + minusDI > 0
            ? (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100
            : 0;
    let adx = dx;

    for (let i = period; i < plusDMs.length; i++) {
        smPlusDM = smPlusDM - smPlusDM / period + plusDMs[i];
        smMinusDM = smMinusDM - smMinusDM / period + minusDMs[i];
        smTR = smTR - smTR / period + trueRanges[i];

        plusDI = smTR > 0 ? (smPlusDM / smTR) * 100 : 0;
        minusDI = smTR > 0 ? (smMinusDM / smTR) * 100 : 0;
        dx =
            plusDI + minusDI > 0
                ? (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100
                : 0;
        adx = (adx * (period - 1) + dx) / period;
    }

    let trendStrength: "strong" | "weak" | "absent" = "absent";
    if (adx > 25) trendStrength = "strong";
    else if (adx > 15) trendStrength = "weak";

    return {
        adx: parseFloat(adx.toFixed(2)),
        plusDI: parseFloat(plusDI.toFixed(2)),
        minusDI: parseFloat(minusDI.toFixed(2)),
        trend: trendStrength,
    };
}

// Stochastic Oscillator (14,3,3)
export function calculateStochastic(
    highs: number[],
    lows: number[],
    closes: number[],
    kPeriod = 14,
    dPeriod = 3
) {
    if (closes.length < kPeriod + dPeriod) {
        return { k: null, d: null, zone: "neutral", crossover: "none" };
    }

    const kValues: number[] = [];
    for (let i = kPeriod - 1; i < closes.length; i++) {
        const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
        const periodLows = lows.slice(i - kPeriod + 1, i + 1);
        const highestHigh = Math.max(...periodHighs);
        const lowestLow = Math.min(...periodLows);
        const k =
            highestHigh === lowestLow
                ? 50
                : ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
        kValues.push(k);
    }

    const dValues: number[] = [];
    for (let i = dPeriod - 1; i < kValues.length; i++) {
        const d =
            kValues.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0) /
            dPeriod;
        dValues.push(d);
    }

    const k = kValues.at(-1)!;
    const d = dValues.at(-1)!;
    const prevK = kValues.at(-2) ?? k;
    const prevD = dValues.at(-2) ?? d;

    let zone: "overbought" | "oversold" | "neutral" = "neutral";
    if (k >= 80) zone = "overbought";
    else if (k <= 20) zone = "oversold";

    let crossover = "none";
    if (prevK <= prevD && k > d) crossover = "bullish";
    else if (prevK >= prevD && k < d) crossover = "bearish";

    return {
        k: parseFloat(k.toFixed(2)),
        d: parseFloat(d.toFixed(2)),
        zone,
        crossover,
    };
}

// OBV (On-Balance Volume)
export function calculateOBV(closes: number[], volumes: number[]) {
    if (closes.length < 2) {
        return { current: null, trend: "flat" as const, divergence: "none" };
    }

    const obvValues: number[] = [0];
    for (let i = 1; i < closes.length; i++) {
        if (closes[i] > closes[i - 1]) {
            obvValues.push(obvValues[i - 1] + volumes[i]);
        } else if (closes[i] < closes[i - 1]) {
            obvValues.push(obvValues[i - 1] - volumes[i]);
        } else {
            obvValues.push(obvValues[i - 1]);
        }
    }

    const current = obvValues.at(-1)!;
    const last20 = obvValues.slice(-20);
    const first10Avg =
        last20.slice(0, 10).reduce((a, b) => a + b, 0) / Math.min(10, last20.length);
    const last10Avg =
        last20.slice(10).reduce((a, b) => a + b, 0) /
        Math.max(1, last20.slice(10).length);

    let trend: "rising" | "falling" | "flat" = "flat";
    const changePct =
        Math.abs(first10Avg) > 0
            ? (Math.abs(last10Avg - first10Avg) / Math.abs(first10Avg)) * 100
            : 0;
    if (changePct > 1) {
        trend = last10Avg > first10Avg ? "rising" : "falling";
    }

    return {
        current: Math.round(current),
        trend,
        divergence: "check manually",
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
        ];

        const summary = (await yahooFinance.quoteSummary(
            symbol,
            { modules: modules as any },
            { validateResult: false }
        )) as any;

        // Technical chart data — 12 months, daily
        const period2 = new Date();
        const period1 = new Date();
        period1.setMonth(period1.getMonth() - 12);

        const chartResult = (await yahooFinance.chart(
            symbol,
            { period1, period2, interval: "1d" },
            { validateResult: false }
        )) as any;

        console.log(
            `Chart data points fetched: ${chartResult.quotes.length} (12 months)`
        );

        // Fundamentals time series — 4 years annual
        let fundamentalsData: any[] = [];
        try {
            fundamentalsData = (await yahooFinance.fundamentalsTimeSeries(
                symbol,
                {
                    period1: new Date(
                        new Date().setFullYear(new Date().getFullYear() - 4)
                    ),
                    period2: new Date(),
                    type: "annual",
                    module: "all",
                },
                { validateResult: false }
            )) as any[];
            console.log(`Fundamentals data fetched: ${fundamentalsData.length} annual periods`);
        } catch (e) {
            console.warn("fundamentalsTimeSeries fetch failed:", e);
        }

        // Extract earnings (revenue and earnings yearly)
        const earningsChart = summary.earnings?.financialsChart?.yearly ?? [];
        const earnings = earningsChart.map((e: any) => ({
            year: e.date,
            revenue: e.revenue ?? null,
            earnings: e.earnings ?? null,
        }));

        // Extract financials from fundamentalsTimeSeries
        const financialsHistory = fundamentalsData
            .filter((d) => d.TYPE === "FINANCIALS" || d.TYPE === "ALL")
            .map((d) => ({
                date: d.date,
                totalRevenue: d.totalRevenue ?? null,
                netIncome: d.netIncome ?? null,
                operatingIncome: d.operatingIncome ?? null,
                ebitda: d.EBITDA ?? null,
                basicEPS: d.basicEPS ?? null,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const balanceSheetHistory = fundamentalsData
            .filter((d) => d.TYPE === "BALANCE_SHEET" || d.TYPE === "ALL")
            .map((d) => ({
                date: d.date,
                totalAssets: d.totalAssets ?? null,
                totalDebt: d.totalDebt ?? null,
                stockholdersEquity: d.stockholdersEquity ?? null,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const cashFlowHistory = fundamentalsData
            .filter((d) => d.TYPE === "CASH_FLOW" || d.TYPE === "ALL")
            .map((d) => ({
                date: d.date,
                freeCashFlow: d.freeCashFlow ?? null,
                operatingCashFlow: d.operatingCashFlow ?? null,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Extract OHLCV arrays
        const closes = (chartResult.quotes as any[])
            .map((q: any) => q.adjclose as number | null)
            .filter((v): v is number => v != null);

        const highs = (chartResult.quotes as any[])
            .map((q: any) => q.high as number | null)
            .filter((v): v is number => v != null);

        const lows = (chartResult.quotes as any[])
            .map((q: any) => q.low as number | null)
            .filter((v): v is number => v != null);

        const volumes = (chartResult.quotes as any[]).map(
            (d: any) => (d.volume as number | null) ?? 0
        );

        const volumeTrend = computeVolumeTrend(volumes);

        // Moving averages
        const ema20 = calculateEMA(closes, 20);
        const ema50 = calculateEMA(closes, 50);
        const ema200 = calculateEMA(closes, 200);

        // Momentum indicators
        const rsi14 = calculateRSI(closes);
        const macd = calculateMACD(closes);
        const stochastic = calculateStochastic(highs, lows, closes);

        // Volatility
        const bollinger = calculateBollingerBands(closes);
        const atr = calculateATR(highs, lows, closes);

        // Trend strength
        const adx = calculateADX(highs, lows, closes);

        // Volume confirmation
        const obv = calculateOBV(closes, volumes);

        // Bollinger %B: 0=at lower, 50=at middle, 100=at upper
        const lastPrice = closes.at(-1) ?? 0;
        const percentB =
            bollinger.upperBand !== bollinger.lowerBand
                ? ((lastPrice - bollinger.lowerBand) /
                      (bollinger.upperBand - bollinger.lowerBand)) *
                  100
                : 50;

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
            financialsHistory,
            balanceSheetHistory,
            cashFlowHistory,
        };

        return {
            financials,
            technicalIndicators: {
                volumeTrend,
                ema20,
                ema50,
                ema200,
                rsi14,
                macd,
                stochastic,
                atr,
                adx,
                obv,
                bollingerBands: {
                    upper: bollinger.upperBand,
                    middle: bollinger.middleBand,
                    lower: bollinger.lowerBand,
                    percentB: parseFloat(percentB.toFixed(2)),
                },
            },
        };
    } catch (err) {
        console.error("Error fetching stock data:", err);
        throw err;
    }
}
