export function buildPrompt(symbol: string, financials: any, technicals: any) {
    function safeToFixed(num: any, digits = 2) {
        return typeof num === "number" ? num.toFixed(digits) : "N/A";
    }

    function safeToLocaleString(num: any) {
        return typeof num === "number" ? num.toLocaleString() : "N/A";
    }

    try {
        let prompt = `You are a legendary stock market swing trader and analyst with 20 years of proven experience in the Indian Stock Market. Analyze the stock "${symbol}" based on the following comprehensive financial and technical data (all values are in INR unless specified). The technical data is 3 months old with intervals of 1 day:\n\n`;

        // Financials
        prompt += `🧾 Financials:\n`;
        if (financials.price != null)
            prompt += `- Current Price: ₹${safeToLocaleString(
                financials.price
            )}\n`;
        if (financials.marketCap != null)
            prompt += `- Market Cap: ₹${(financials.marketCap / 1e12).toFixed(
                2
            )} trillion\n`;
        if (financials.volume != null && financials.averageVolume != null)
            prompt += `- Volume: ${safeToLocaleString(
                financials.volume
            )} (Avg Volume: ${safeToLocaleString(financials.averageVolume)})\n`;
        if (financials.revenueGrowth != null)
            prompt += `- Revenue Growth (YoY): ${(
                financials.revenueGrowth * 100
            ).toFixed(2)}%\n`;
        if (financials.returnOnEquity != null)
            prompt += `- Return on Equity (ROE): ${(
                financials.returnOnEquity * 100
            ).toFixed(2)}%\n`;
        if (financials.forwardPE != null)
            prompt += `- Forward PE Ratio: ${safeToFixed(
                financials.forwardPE
            )}\n`;
        if (financials.trailingPE != null)
            prompt += `- Trailing PE Ratio: ${safeToFixed(
                financials.trailingPE
            )}\n`;
        if (financials.debtToEquity != null)
            prompt += `- Debt to Equity Ratio: ${safeToFixed(
                financials.debtToEquity
            )}\n`;
        if (financials.priceToBook != null)
            prompt += `- Price to Book Ratio: ${safeToFixed(
                financials.priceToBook
            )}\n`;
        if (financials.freeCashFlow != null)
            prompt += `- Free Cash Flow: ₹${(
                financials.freeCashFlow / 1e9
            ).toFixed(2)} billion (negative indicates cash outflow)\n`;
        if (financials.ebitda != null)
            prompt += `- EBITDA: ₹${(financials.ebitda / 1e9).toFixed(
                2
            )} billion\n`;
        if (
            financials.fiftyTwoWeekHigh != null &&
            financials.fiftyTwoWeekLow != null
        )
            prompt += `- 52-Week High / Low: ₹${financials.fiftyTwoWeekHigh} / ₹${financials.fiftyTwoWeekLow}\n\n`;

        // Earnings History
        if (financials.earnings?.length) {
            prompt += `📊 Earnings History (Year - Revenue / Earnings in ₹ billions):\n`;
            financials.earnings.forEach((e: any) => {
                if (e.year != null && e.revenue != null && e.earnings != null) {
                    prompt += `- ${e.year}: Revenue ₹${(
                        e.revenue / 1e9
                    ).toFixed(2)}B, Earnings ₹${(e.earnings / 1e9).toFixed(
                        2
                    )}B\n`;
                }
            });
            prompt += `\n`;
        }

        // Income & Net Income Trends
        if (financials.incomeTrend) {
            const totalRev = financials.incomeTrend.totalRevenue ?? [];
            const netInc = financials.incomeTrend.netIncome ?? [];
            if (totalRev.length > 0 || netInc.length > 0) {
                prompt += `📈 Income & Net Income Trends (Recent 4 Years):\n`;
                if (totalRev.length > 0) {
                    prompt += `- Total Revenue:\n`;
                    totalRev.forEach((r: any) => {
                        if (r.date && r.value != null) {
                            prompt += `  • ${new Date(
                                r.date
                            ).getFullYear()}: ₹${(r.value / 1e9).toFixed(
                                2
                            )} billion\n`;
                        }
                    });
                }
                if (netInc.length > 0) {
                    prompt += `- Net Income:\n`;
                    netInc.forEach((n: any) => {
                        if (n.date && n.value != null) {
                            prompt += `  • ${new Date(
                                n.date
                            ).getFullYear()}: ₹${(n.value / 1e9).toFixed(
                                2
                            )} billion\n`;
                        }
                    });
                }
                prompt += `\n`;
            }
        }

        // Cashflow Trend
        if (financials.cashflowTrend?.netIncome?.length) {
            prompt += `📉 Cashflow Trend (Net Income recent 4 years):\n`;
            financials.cashflowTrend.netIncome.forEach((c: any) => {
                if (c.date && c.value != null) {
                    prompt += `- ${new Date(c.date).getFullYear()}: ₹${(
                        c.value / 1e9
                    ).toFixed(2)} billion\n`;
                }
            });
            prompt += `\n`;
        }

        // Technical Indicators
        prompt += `🔧 Technical Indicators:\n`;
        if (technicals.ema20?.current != null)
            prompt += `- EMA 20: Current ₹${safeToFixed(
                technicals.ema20.current
            )}, Trend: ${technicals.ema20.trend ?? "N/A"} (Slope: ${safeToFixed(
                technicals.ema20.slope
            )})\n`;
        if (technicals.ema50?.current != null)
            prompt += `- EMA 50: Current ₹${safeToFixed(
                technicals.ema50.current
            )}, Trend: ${technicals.ema50.trend ?? "N/A"} (Slope: ${safeToFixed(
                technicals.ema50.slope
            )})\n`;
        if (technicals.rsi14?.current != null)
            prompt += `- RSI 14-day: ${safeToFixed(
                technicals.rsi14.current
            )}, Zone: ${technicals.rsi14.zone ?? "N/A"}, Trend: ${
                technicals.rsi14.trend ?? "N/A"
            }\n`;
        if (technicals.macd) {
            const m = technicals.macd;
            if (
                m.macdLine != null &&
                m.signalLine != null &&
                m.histogram != null
            ) {
                prompt += `- MACD:\n`;
                prompt += `  • MACD Line: ${safeToFixed(m.macdLine)}\n`;
                prompt += `  • Signal Line: ${safeToFixed(m.signalLine)}\n`;
                prompt += `  • Histogram: ${safeToFixed(m.histogram)}\n`;
                if (m.crossover) prompt += `  • Crossover: ${m.crossover}\n`;
                if (m.momentum) prompt += `  • Momentum: ${m.momentum}\n`;
                if (m.trendPosition)
                    prompt += `  • Trend Position: ${m.trendPosition}\n`;
            }
        }
        if (technicals.bollingerBands) {
            const b = technicals.bollingerBands;
            if (b.upper != null && b.middle != null && b.lower != null) {
                prompt += `- Bollinger Bands:\n`;
                prompt += `  • Upper: ₹${safeToFixed(b.upper)}\n`;
                prompt += `  • Middle: ₹${safeToFixed(b.middle)}\n`;
                prompt += `  • Lower: ₹${safeToFixed(b.lower)}\n`;
            }
        }
        if (technicals.volumeTrend) {
            prompt += `- Volume Trend:\n`;
            if (technicals.volumeTrend.avg5 != null)
                prompt += `  • 5-day Avg Volume: ${safeToLocaleString(
                    technicals.volumeTrend.avg5
                )}\n`;
            if (technicals.volumeTrend.delta?.length)
                prompt += `  • Recent Changes (delta): [${technicals.volumeTrend.delta
                    .slice(0, 5)
                    .join(", ")} ...]\n`;
        }

        prompt += `Please base your stop-loss recommendation and upside potential estimates on the past 3 months' price action and technical indicators.\n`;

        prompt += `\n---\n\nQuestions:\n`;
        prompt += `1. Based on the financial and technical data, is "${symbol}" currently in a proven upward trend or has it recently experienced a breakout? Provide evidence from volume, RSI14, MACD, and price action.\n`;
        prompt += `2. Would you recommend swing trading this stock at the current price? Explain the reasoning with respect to momentum, volume strength, and risk factors.\n`;
        prompt += `3. Is this a good entry point for swing trading? If not, what conditions or levels should an investor wait for?\n`;
        prompt += `4. Suggest a prudent stop-loss level based on recent support/resistance.\n`;
        prompt += `5. What is the expected upside potential over the next 1, 3, and 6 months?\n\n`;
        prompt += `Provide a concise, data-driven, and actionable analysis as a seasoned Indian stock market swing trader.\n\n`;

        prompt += `Please provide your analysis strictly as a JSON object following this exact format, without any additional explanation or commentary:\n\n`;
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
    "resistanceLevel": string,
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
        prompt += `This comprehensive format will allow me to parse your response programmatically and display detailed analysis with appropriate colors, charts, and UI components for better decision making.`;

        return prompt;
    } catch (error) {
        return `You are a legendary stock market swing trader and analyst with 20 years of experience. Analyze the stock "${symbol}" based on the available data. Provide concise and actionable insights.`;
    }
}
