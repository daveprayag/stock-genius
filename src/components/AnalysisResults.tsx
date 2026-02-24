"use client";

import {
    TrendingUp,
    TrendingDown,
    Target,
    Shield,
    Brain,
    BarChart3,
    AlertTriangle,
    IndianRupee,
    CheckCircle,
    XCircle,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Calendar,
    DollarSign,
} from "lucide-react";

interface AnalysisData {
    result: {
        stockInfo?: {
            symbol: string;
            companyName: string;
            currentPrice: string;
            "52WeekHigh": string;
            "52WeekLow": string;
            sector: string;
        };
        technicalAnalysis?: {
            trend: "Upward" | "Downward" | "Neutral";
            trendStrength: "Strong" | "Moderate" | "Weak";
            breakout: boolean;
            supportLevel: string;
            resistanceLevel: string;
        };
        technicalSignalsSummary?: {
            bullishSignals: string[];
            bearishSignals: string[];
            signalAlignment:
                | "Strongly Bullish"
                | "Bullish"
                | "Mixed"
                | "Bearish"
                | "Strongly Bearish";
        };
        tradingRecommendation?: {
            swingTradeRecommendation: "Buy" | "Hold" | "Sell";
            confidence: "High" | "Medium" | "Low";
            entryPoint: "Good" | "Wait" | "Caution";
            idealEntryRange: string;
            stopLoss: string;
            targets: {
                target1: string;
                target2: string;
                target3: string;
            };
        };
        predictions?: {
            upsidePotential: {
                "1_month": string;
                "3_months": string;
                "6_months": string;
                "12_months": string;
            };
            downsideRisk: {
                "1_month": string;
                "3_months": string;
                "6_months": string;
            };
            priceTargets: {
                conservative: string;
                moderate: string;
                aggressive: string;
            };
        };
        riskAssessment?: {
            riskLevel: "Low" | "Medium" | "High";
            volatility: "Low" | "Medium" | "High";
            keyRiskFactors: string[];
            positionSizing: "Small" | "Medium" | "Large";
        };
        reasoning: string;
    };
    tokensUsed?: number;
}

interface AnalysisResultsProps {
    analysis: AnalysisData;
}

export function AnalysisResults({ analysis }: AnalysisResultsProps) {
    const {
        stockInfo,
        technicalAnalysis,
        technicalSignalsSummary,
        tradingRecommendation,
        predictions,
        riskAssessment,
        reasoning,
    } = analysis.result;

    const getTrendIcon = (trend?: string) => {
        switch (trend) {
            case "Upward":
                return <TrendingUp className="w-4 h-4 text-green-500" />;
            case "Downward":
                return <TrendingDown className="w-4 h-4 text-red-500" />;
            default:
                return <Minus className="w-4 h-4 text-zinc-400" />;
        }
    };

    const getTrendColor = (trend?: string) => {
        switch (trend) {
            case "Upward":
                return "text-green-500 bg-green-500/10 border-green-500/20";
            case "Downward":
                return "text-red-500 bg-red-500/10 border-red-500/20";
            default:
                return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
        }
    };

    const getRecommendationColor = (recommendation?: string) => {
        switch (recommendation) {
            case "Buy":
                return "text-green-500 bg-green-500/10 border-green-500/20";
            case "Sell":
                return "text-red-500 bg-red-500/10 border-red-500/20";
            default:
                return "text-blue-500 bg-blue-500/10 border-blue-500/20";
        }
    };

    const getConfidenceColor = (confidence?: string) => {
        switch (confidence) {
            case "High":
                return "text-green-500";
            case "Medium":
                return "text-blue-500";
            default:
                return "text-red-500";
        }
    };

    const getRiskColor = (risk?: string) => {
        switch (risk) {
            case "Low":
                return "text-green-500 bg-green-500/10 border-green-500/20";
            case "Medium":
                return "text-blue-500 bg-blue-500/10 border-blue-500/20";
            default:
                return "text-red-500 bg-red-500/10 border-red-500/20";
        }
    };

    const getAlignmentColor = (alignment?: string) => {
        switch (alignment) {
            case "Strongly Bullish":
                return "text-green-400 bg-green-500/10 border-green-500/30";
            case "Bullish":
                return "text-green-500 bg-green-500/10 border-green-500/20";
            case "Mixed":
                return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
            case "Bearish":
                return "text-red-500 bg-red-500/10 border-red-500/20";
            case "Strongly Bearish":
                return "text-red-400 bg-red-500/10 border-red-500/30";
            default:
                return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
        }
    };

    return (
        <div className="space-y-6">
            {/* Stock Header Card */}
            {stockInfo && (
                <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-zinc-100">
                                    {stockInfo.symbol}
                                </h1>
                                <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-md font-medium">
                                    NSE
                                </span>
                            </div>
                            <p className="text-zinc-300 mb-1">
                                {stockInfo.companyName}
                            </p>
                            {stockInfo.sector && (
                                <p className="text-zinc-400 text-sm">
                                    Sector: {stockInfo.sector}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-sm text-zinc-400 mb-1">
                                Current Price
                            </p>
                            <div className="flex items-center gap-1">
                                <IndianRupee className="w-5 h-5 text-zinc-100" />
                                <span className="text-2xl font-bold text-zinc-100">
                                    {stockInfo.currentPrice?.replace(
                                        /[₹$]/g,
                                        ""
                                    ) || "N/A"}
                                </span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-zinc-400 mb-1">
                                52W High
                            </p>
                            <p className="text-zinc-100 font-semibold">
                                ₹
                                {stockInfo["52WeekHigh"]?.replace(
                                    /[₹$]/g,
                                    ""
                                ) || "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-zinc-400 mb-1">
                                52W Low
                            </p>
                            <p className="text-zinc-100 font-semibold">
                                ₹
                                {stockInfo["52WeekLow"]?.replace(/[₹$]/g, "") ||
                                    "N/A"}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Trading Recommendation + Technical Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {tradingRecommendation && (
                    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Target className="w-5 h-5 text-blue-500" />
                            <h3 className="text-xl font-bold text-zinc-100">
                                Trading Recommendation
                            </h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-300">
                                    Recommendation:
                                </span>
                                <span
                                    className={`px-3 py-1 rounded-full text-sm font-semibold border ${getRecommendationColor(
                                        tradingRecommendation.swingTradeRecommendation
                                    )}`}
                                >
                                    {
                                        tradingRecommendation.swingTradeRecommendation
                                    }
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-zinc-300">
                                    Confidence:
                                </span>
                                <span
                                    className={`font-semibold ${getConfidenceColor(
                                        tradingRecommendation.confidence
                                    )}`}
                                >
                                    {tradingRecommendation.confidence}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-zinc-300">
                                    Entry Point:
                                </span>
                                <span className="text-zinc-100 font-semibold">
                                    {tradingRecommendation.entryPoint}
                                </span>
                            </div>

                            {tradingRecommendation.idealEntryRange && (
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-300">
                                        Entry Range:
                                    </span>
                                    <span className="text-blue-400 font-semibold">
                                        {tradingRecommendation.idealEntryRange}
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <span className="text-zinc-300">
                                    Stop Loss:
                                </span>
                                <span className="text-red-400 font-semibold">
                                    {tradingRecommendation.stopLoss}
                                </span>
                            </div>
                        </div>

                        {tradingRecommendation.targets && (
                            <div className="mt-6 pt-6 border-t border-neutral-800">
                                <h4 className="text-sm font-semibold text-zinc-200 mb-3">
                                    Price Targets
                                </h4>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-xs text-zinc-400 mb-1">
                                            Target 1
                                        </p>
                                        <p className="text-green-400 font-semibold">
                                            {
                                                tradingRecommendation.targets
                                                    .target1
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-400 mb-1">
                                            Target 2
                                        </p>
                                        <p className="text-green-400 font-semibold">
                                            {
                                                tradingRecommendation.targets
                                                    .target2
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-400 mb-1">
                                            Target 3
                                        </p>
                                        <p className="text-green-400 font-semibold">
                                            {
                                                tradingRecommendation.targets
                                                    .target3
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {technicalAnalysis && (
                    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                            <h3 className="text-xl font-bold text-zinc-100">
                                Technical Analysis
                            </h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-300">Trend:</span>
                                <div className="flex items-center gap-2">
                                    {getTrendIcon(technicalAnalysis.trend)}
                                    <span
                                        className={`px-3 py-1 rounded-full text-sm font-semibold border ${getTrendColor(
                                            technicalAnalysis.trend
                                        )}`}
                                    >
                                        {technicalAnalysis.trend}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-zinc-300">
                                    Trend Strength:
                                </span>
                                <span className="text-zinc-100 font-semibold">
                                    {technicalAnalysis.trendStrength}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-zinc-300">Breakout:</span>
                                <div className="flex items-center gap-1">
                                    {technicalAnalysis.breakout ? (
                                        <>
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                            <span className="text-green-500 font-semibold">
                                                Yes
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-4 h-4 text-red-500" />
                                            <span className="text-red-500 font-semibold">
                                                No
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-zinc-300">
                                    Support Level:
                                </span>
                                <span className="text-green-400 font-semibold">
                                    {technicalAnalysis.supportLevel}
                                </span>
                            </div>

                            {technicalAnalysis.resistanceLevel && (
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-300">
                                        Resistance Level:
                                    </span>
                                    <span className="text-red-400 font-semibold">
                                        {technicalAnalysis.resistanceLevel}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Technical Signals Summary */}
            {technicalSignalsSummary && (
                <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                            <h3 className="text-xl font-bold text-zinc-100">
                                Signal Alignment
                            </h3>
                        </div>
                        {technicalSignalsSummary.signalAlignment && (
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-semibold border ${getAlignmentColor(technicalSignalsSummary.signalAlignment)}`}
                            >
                                {technicalSignalsSummary.signalAlignment}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {technicalSignalsSummary.bullishSignals?.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    Bullish Signals
                                </h4>
                                <div className="space-y-2">
                                    {technicalSignalsSummary.bullishSignals.map(
                                        (signal, i) => (
                                            <div
                                                key={i}
                                                className="flex items-start gap-2"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                                                <span className="text-zinc-300 text-sm">
                                                    {signal}
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        )}

                        {technicalSignalsSummary.bearishSignals?.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-1">
                                    <TrendingDown className="w-3.5 h-3.5" />
                                    Bearish Signals
                                </h4>
                                <div className="space-y-2">
                                    {technicalSignalsSummary.bearishSignals.map(
                                        (signal, i) => (
                                            <div
                                                key={i}
                                                className="flex items-start gap-2"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                                                <span className="text-zinc-300 text-sm">
                                                    {signal}
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Predictions */}
            {predictions && (
                <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        <h3 className="text-xl font-bold text-zinc-100">
                            Price Predictions
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {predictions.upsidePotential && (
                            <div>
                                <h4 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                                    <ArrowUpRight className="w-4 h-4" />
                                    Upside Potential
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-300">
                                            1 month:
                                        </span>
                                        <span className="text-green-400 font-medium">
                                            {
                                                predictions.upsidePotential[
                                                    "1_month"
                                                ]
                                            }
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-300">
                                            3 months:
                                        </span>
                                        <span className="text-green-400 font-medium">
                                            {
                                                predictions.upsidePotential[
                                                    "3_months"
                                                ]
                                            }
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-300">
                                            6 months:
                                        </span>
                                        <span className="text-green-400 font-medium">
                                            {
                                                predictions.upsidePotential[
                                                    "6_months"
                                                ]
                                            }
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-300">
                                            12 months:
                                        </span>
                                        <span className="text-green-400 font-medium">
                                            {
                                                predictions.upsidePotential[
                                                    "12_months"
                                                ]
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {predictions.downsideRisk && (
                            <div>
                                <h4 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                                    <ArrowDownRight className="w-4 h-4" />
                                    Downside Risk
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-300">
                                            1 month:
                                        </span>
                                        <span className="text-red-400 font-medium">
                                            {
                                                predictions.downsideRisk[
                                                    "1_month"
                                                ]
                                            }
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-300">
                                            3 months:
                                        </span>
                                        <span className="text-red-400 font-medium">
                                            {
                                                predictions.downsideRisk[
                                                    "3_months"
                                                ]
                                            }
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-300">
                                            6 months:
                                        </span>
                                        <span className="text-red-400 font-medium">
                                            {
                                                predictions.downsideRisk[
                                                    "6_months"
                                                ]
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {predictions.priceTargets && (
                        <div className="mt-8 pt-6 border-t border-neutral-800">
                            <h4 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                Price Targets
                            </h4>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-sm text-zinc-400 mb-2">
                                        Conservative
                                    </p>
                                    <p className="text-blue-400 font-semibold">
                                        {predictions.priceTargets.conservative}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-400 mb-2">
                                        Moderate
                                    </p>
                                    <p className="text-blue-400 font-semibold">
                                        {predictions.priceTargets.moderate}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-400 mb-2">
                                        Aggressive
                                    </p>
                                    <p className="text-blue-400 font-semibold">
                                        {predictions.priceTargets.aggressive}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Risk Assessment */}
            {riskAssessment && (
                <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Shield className="w-5 h-5 text-blue-500" />
                        <h3 className="text-xl font-bold text-zinc-100">
                            Risk Assessment
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-300">
                                    Risk Level:
                                </span>
                                <span
                                    className={`px-3 py-1 rounded-full text-sm font-semibold border ${getRiskColor(
                                        riskAssessment.riskLevel
                                    )}`}
                                >
                                    {riskAssessment.riskLevel}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-zinc-300">
                                    Volatility:
                                </span>
                                <span className="text-zinc-100 font-semibold">
                                    {riskAssessment.volatility}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-zinc-300">
                                    Position Sizing:
                                </span>
                                <span className="text-zinc-100 font-semibold">
                                    {riskAssessment.positionSizing}
                                </span>
                            </div>
                        </div>

                        {riskAssessment.keyRiskFactors &&
                            riskAssessment.keyRiskFactors.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-zinc-200 mb-3">
                                        Key Risk Factors
                                    </h4>
                                    <div className="space-y-2">
                                        {riskAssessment.keyRiskFactors.map(
                                            (factor, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-start gap-2"
                                                >
                                                    <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                                                    <span className="text-zinc-300 text-sm">
                                                        {factor}
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                    </div>
                </div>
            )}

            {/* AI Reasoning */}
            {reasoning && (
                <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Brain className="w-5 h-5 text-blue-500" />
                        <h3 className="text-xl font-bold text-zinc-100">
                            AI Reasoning
                        </h3>
                    </div>
                    <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">
                        {reasoning}
                    </p>
                </div>
            )}

            {/* Footer */}
            {analysis.tokensUsed !== undefined && (
                <div className="text-center py-4 text-zinc-400 text-sm">
                    Analysis powered by Advanced AI • Tokens used:{" "}
                    {analysis.tokensUsed} • Always conduct your own research
                    before investing
                </div>
            )}
        </div>
    );
}
