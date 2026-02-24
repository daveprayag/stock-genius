export function buildPrompt(symbol: string, financials: any, technicals: any) {
    function safeToFixed(num: any, digits = 2) {
        return typeof num === "number" ? num.toFixed(digits) : "N/A";
    }

    function safeToLocaleString(num: any) {
        return typeof num === "number" ? num.toLocaleString() : "N/A";
    }

    try {
        let prompt = `You are a legendary stock market swing trader and analyst with 20 years of proven experience in the Indian Stock Market. Analyze the stock "${symbol}" based on the following comprehensive financial and technical data (all values are in INR unless specified). The technical data covers the past 12 months of daily data:\n\n`;

        // Price context first
        prompt += `📌 Price Context:\n`;
        if (financials.price != null)
            prompt += `- Current Price: ₹${safeToLocaleString(financials.price)}\n`;
        if (financials.fiftyTwoWeekHigh != null && financials.fiftyTwoWeekLow != null)
            prompt += `- 52-Week High / Low: ₹${financials.fiftyTwoWeekHigh} / ₹${financials.fiftyTwoWeekLow}\n`;
        if (financials.marketCap != null)
            prompt += `- Market Cap: ₹${(financials.marketCap / 1e12).toFixed(2)} trillion\n`;
        if (financials.volume != null && financials.averageVolume != null)
            prompt += `- Volume: ${safeToLocaleString(financials.volume)} (Avg Volume: ${safeToLocaleString(financials.averageVolume)})\n`;
        prompt += `\n`;

        // Trend indicators — EMA stack
        prompt += `📈 Trend Indicators (EMA Stack):\n`;
        if (technicals.ema20?.current != null)
            prompt += `- EMA 20: ₹${safeToFixed(technicals.ema20.current)}, Trend: ${technicals.ema20.trend ?? "N/A"} (Slope: ${safeToFixed(technicals.ema20.slope)})\n`;
        if (technicals.ema50?.current != null)
            prompt += `- EMA 50: ₹${safeToFixed(technicals.ema50.current)}, Trend: ${technicals.ema50.trend ?? "N/A"} (Slope: ${safeToFixed(technicals.ema50.slope)})\n`;
        if (technicals.ema200?.current != null)
            prompt += `- EMA 200: ₹${safeToFixed(technicals.ema200.current)}, Trend: ${technicals.ema200.trend ?? "N/A"} — This is the key institutional support/resistance level\n`;
        else
            prompt += `- EMA 200: Insufficient data (< 200 days of history)\n`;

        if (technicals.adx) {
            const a = technicals.adx;
            if (a.adx != null)
                prompt += `- ADX (14): ${safeToFixed(a.adx)} — Trend Strength: ${a.trend} (>25 = trending, <20 = ranging)\n`;
            if (a.plusDI != null && a.minusDI != null)
                prompt += `  • +DI: ${safeToFixed(a.plusDI)}, -DI: ${safeToFixed(a.minusDI)}\n`;
        }
        prompt += `\n`;

        // Momentum indicators
        prompt += `⚡ Momentum Indicators:\n`;
        if (technicals.rsi14?.current != null)
            prompt += `- RSI 14: ${safeToFixed(technicals.rsi14.current)}, Zone: ${technicals.rsi14.zone ?? "N/A"}, Trend: ${technicals.rsi14.trend ?? "N/A"}\n`;
        if (technicals.stochastic) {
            const s = technicals.stochastic;
            if (s.k != null && s.d != null)
                prompt += `- Stochastic (14,3): %K=${safeToFixed(s.k)}, %D=${safeToFixed(s.d)}, Zone: ${s.zone}, Crossover: ${s.crossover}\n`;
        }
        prompt += `\n`;

        // MACD
        if (technicals.macd) {
            const m = technicals.macd;
            if (m.macdLine != null && m.signalLine != null && m.histogram != null) {
                prompt += `📊 MACD:\n`;
                prompt += `- MACD Line: ${safeToFixed(m.macdLine)}\n`;
                prompt += `- Signal Line: ${safeToFixed(m.signalLine)}\n`;
                prompt += `- Histogram: ${safeToFixed(m.histogram)}\n`;
                if (m.crossover) prompt += `- Crossover: ${m.crossover}\n`;
                if (m.momentum) prompt += `- Momentum: ${m.momentum}\n`;
                if (m.trendPosition) prompt += `- Trend Position: ${m.trendPosition}\n`;
                prompt += `\n`;
            }
        }

        // Volume & OBV
        prompt += `📦 Volume & OBV:\n`;
        if (technicals.volumeTrend) {
            if (technicals.volumeTrend.avg5 != null)
                prompt += `- 5-day Avg Volume: ${safeToLocaleString(technicals.volumeTrend.avg5)}\n`;
            if (technicals.volumeTrend.delta?.length)
                prompt += `- Recent Volume Changes (delta): [${technicals.volumeTrend.delta.slice(0, 5).join(", ")} ...]\n`;
        }
        if (technicals.obv) {
            const o = technicals.obv;
            if (o.current != null)
                prompt += `- OBV: ${safeToLocaleString(o.current)}, Trend: ${o.trend} — Rising OBV confirms price moves; divergence signals reversal\n`;
        }
        prompt += `\n`;

        // Volatility — ATR + Bollinger
        prompt += `🌡️ Volatility:\n`;
        if (technicals.atr) {
            const a = technicals.atr;
            if (a.current != null)
                prompt += `- ATR (14): ₹${safeToFixed(a.current)} (${safeToFixed(a.percentOfPrice)}% of price) — ${a.interpretation}. Use 1.5–2x ATR below entry for stop-loss placement.\n`;
        }
        if (technicals.bollingerBands) {
            const b = technicals.bollingerBands;
            if (b.upper != null && b.middle != null && b.lower != null) {
                prompt += `- Bollinger Bands (20,2): Upper ₹${safeToFixed(b.upper)}, Middle ₹${safeToFixed(b.middle)}, Lower ₹${safeToFixed(b.lower)}\n`;
                if (b.percentB != null)
                    prompt += `- Bollinger %B: ${safeToFixed(b.percentB)}% (0=at lower band, 50=at middle, 100=at upper band)\n`;
            }
        }
        prompt += `\n`;

        // Fundamental data
        prompt += `🧾 Fundamentals:\n`;
        if (financials.revenueGrowth != null)
            prompt += `- Revenue Growth (YoY): ${(financials.revenueGrowth * 100).toFixed(2)}%\n`;
        if (financials.returnOnEquity != null)
            prompt += `- Return on Equity (ROE): ${(financials.returnOnEquity * 100).toFixed(2)}%\n`;
        if (financials.forwardPE != null)
            prompt += `- Forward PE Ratio: ${safeToFixed(financials.forwardPE)}\n`;
        if (financials.trailingPE != null)
            prompt += `- Trailing PE Ratio: ${safeToFixed(financials.trailingPE)}\n`;
        if (financials.debtToEquity != null)
            prompt += `- Debt to Equity Ratio: ${safeToFixed(financials.debtToEquity)}\n`;
        if (financials.priceToBook != null)
            prompt += `- Price to Book Ratio: ${safeToFixed(financials.priceToBook)}\n`;
        if (financials.freeCashFlow != null)
            prompt += `- Free Cash Flow: ₹${(financials.freeCashFlow / 1e9).toFixed(2)} billion\n`;
        if (financials.ebitda != null)
            prompt += `- EBITDA: ₹${(financials.ebitda / 1e9).toFixed(2)} billion\n`;
        prompt += `\n`;

        // Earnings history
        if (financials.earnings?.length) {
            prompt += `📊 Earnings History (Year - Revenue / Earnings in ₹ billions):\n`;
            financials.earnings.forEach((e: any) => {
                if (e.year != null && e.revenue != null && e.earnings != null) {
                    prompt += `- ${e.year}: Revenue ₹${(e.revenue / 1e9).toFixed(2)}B, Earnings ₹${(e.earnings / 1e9).toFixed(2)}B\n`;
                }
            });
            prompt += `\n`;
        }

        // Financials history from fundamentalsTimeSeries
        if (financials.financialsHistory?.length) {
            prompt += `📈 Annual Financials (from fundamentalsTimeSeries, last 4 years):\n`;
            financials.financialsHistory.forEach((f: any) => {
                const year = f.date ? new Date(f.date).getFullYear() : "N/A";
                const parts: string[] = [];
                if (f.totalRevenue != null) parts.push(`Revenue ₹${(f.totalRevenue / 1e9).toFixed(2)}B`);
                if (f.netIncome != null) parts.push(`Net Income ₹${(f.netIncome / 1e9).toFixed(2)}B`);
                if (f.operatingIncome != null) parts.push(`Op. Income ₹${(f.operatingIncome / 1e9).toFixed(2)}B`);
                if (f.ebitda != null) parts.push(`EBITDA ₹${(f.ebitda / 1e9).toFixed(2)}B`);
                if (f.basicEPS != null) parts.push(`EPS ₹${f.basicEPS.toFixed(2)}`);
                if (parts.length > 0) prompt += `- ${year}: ${parts.join(", ")}\n`;
            });
            prompt += `\n`;
        }

        // Balance sheet history
        if (financials.balanceSheetHistory?.length) {
            prompt += `🏦 Annual Balance Sheet (last 4 years):\n`;
            financials.balanceSheetHistory.forEach((b: any) => {
                const year = b.date ? new Date(b.date).getFullYear() : "N/A";
                const parts: string[] = [];
                if (b.totalAssets != null) parts.push(`Assets ₹${(b.totalAssets / 1e9).toFixed(2)}B`);
                if (b.totalDebt != null) parts.push(`Debt ₹${(b.totalDebt / 1e9).toFixed(2)}B`);
                if (b.stockholdersEquity != null) parts.push(`Equity ₹${(b.stockholdersEquity / 1e9).toFixed(2)}B`);
                if (parts.length > 0) prompt += `- ${year}: ${parts.join(", ")}\n`;
            });
            prompt += `\n`;
        }

        // Analyst instructions
        prompt += `---\n\n`;
        prompt += `Signal Weighting Rules:\n`;
        prompt += `- MACD crossover > RSI/Stochastic for trend direction; RSI/Stochastic for entry timing.\n`;
        prompt += `- ADX > 25 = trending (swing trade eligible); ADX < 20 = ranging (avoid).\n`;
        prompt += `- EMA200 is key institutional level — above = bullish bias, below = bearish bias.\n`;
        prompt += `- ATR-based stop: 1.5× ATR below entry for trend trades.\n`;
        prompt += `- Rising OBV confirms price; OBV divergence is a high-priority warning.\n\n`;

        prompt += `Task: Provide a concise, data-driven swing trade analysis for ${symbol}. Be direct and actionable.\n`;
        prompt += `- "reasoning": 2–3 sentences maximum — state the key thesis, primary supporting signals, and one main risk.\n`;
        prompt += `- "bullishSignals" / "bearishSignals": maximum 3 items each, most impactful signals only.\n\n`;

        prompt += `Respond strictly as a JSON object matching this exact schema:\n\n`;
        prompt += `{
  "stockInfo": {
    "symbol": string,
    "companyName": string,
    "currentPrice": string,
    "52WeekHigh": string,
    "52WeekLow": string,
    "sector": string
  },
  "technicalAnalysis": {
    "trend": "Upward" | "Downward" | "Neutral",
    "trendStrength": "Strong" | "Moderate" | "Weak",
    "breakout": boolean,
    "supportLevel": string,
    "resistanceLevel": string
  },
  "technicalSignalsSummary": {
    "bullishSignals": string[],
    "bearishSignals": string[],
    "signalAlignment": "Strongly Bullish" | "Bullish" | "Mixed" | "Bearish" | "Strongly Bearish"
  },
  "tradingRecommendation": {
    "swingTradeRecommendation": "Buy" | "Hold" | "Sell",
    "confidence": "High" | "Medium" | "Low",
    "entryPoint": "Good" | "Wait" | "Caution",
    "idealEntryRange": string,
    "stopLoss": string,
    "targets": {
      "target1": string,
      "target2": string,
      "target3": string
    }
  },
  "predictions": {
    "upsidePotential": {
      "1_month": string,
      "3_months": string,
      "6_months": string,
      "12_months": string
    },
    "downsideRisk": {
      "1_month": string,
      "3_months": string,
      "6_months": string
    },
    "priceTargets": {
      "conservative": string,
      "moderate": string,
      "aggressive": string
    }
  },
  "riskAssessment": {
    "riskLevel": "Low" | "Medium" | "High",
    "volatility": "Low" | "Medium" | "High",
    "keyRiskFactors": string[],
    "positionSizing": "Small" | "Medium" | "Large"
  },
  "reasoning": string,
  "lastUpdated": string
}\n\n`;
        prompt += `This format allows programmatic parsing and display. Do not include any markdown, code fences, or commentary outside the JSON object.`;

        return prompt;
    } catch {
        return `You are a legendary stock market swing trader and analyst with 20 years of experience. Analyze the stock "${symbol}" based on the available data. Provide concise and actionable insights.`;
    }
}
