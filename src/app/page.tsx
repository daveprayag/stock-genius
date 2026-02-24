"use client";

import { useState } from "react";
import { StockForm } from "@/components/StockForm";
import { MomentumScreener } from "@/components/MomentumScreener";
import { ValueScreener } from "@/components/ValueScreener";
import { TrendingUp, Brain, Zap, Shield, Gem } from "lucide-react";

type Tab = "analyzer" | "momentum" | "value";

export default function Home() {
    const [activeTab, setActiveTab] = useState<Tab>("analyzer");
    const [prefilledSymbol, setPrefilledSymbol] = useState<string>("");

    const handleAnalyzeFromScreener = (symbol: string) => {
        setPrefilledSymbol(symbol);
        setActiveTab("analyzer");
        setTimeout(() => {
            document
                .getElementById("stock-form")
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
    };

    return (
        <div className="min-h-screen bg-neutral-950 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 via-transparent to-green-500/2" />

            {/* Fixed Header */}
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center shadow-lg">
                                <TrendingUp className="w-5 h-5 text-zinc-900" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-100">StockGenius</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                                    AI Powered
                                </span>
                                <span className="text-xs text-zinc-400 font-medium">
                                    🇮🇳 Indian Markets
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tab navigation */}
                    <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 gap-1">
                        <button
                            onClick={() => setActiveTab("analyzer")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                activeTab === "analyzer"
                                    ? "bg-zinc-100 text-zinc-900 shadow-sm"
                                    : "text-zinc-400 hover:text-zinc-200"
                            }`}
                        >
                            <Brain className="w-4 h-4" />
                            <span className="hidden sm:inline">Analyzer</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("momentum")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                activeTab === "momentum"
                                    ? "bg-zinc-100 text-zinc-900 shadow-sm"
                                    : "text-zinc-400 hover:text-zinc-200"
                            }`}
                        >
                            <Zap className="w-4 h-4" />
                            <span className="hidden sm:inline">Momentum</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("value")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                activeTab === "value"
                                    ? "bg-zinc-100 text-zinc-900 shadow-sm"
                                    : "text-zinc-400 hover:text-zinc-200"
                            }`}
                        >
                            <Gem className="w-4 h-4" />
                            <span className="hidden sm:inline">Value</span>
                        </button>
                    </div>

                    {/* Live indicator */}
                    <div className="hidden md:flex items-center gap-2 text-zinc-400">
                        <span className="text-sm font-medium">Live Analysis</span>
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="pt-20 flex-1 relative z-10">
                <div className="max-w-7xl mx-auto px-6 py-12">
                    {activeTab === "value" ? (
                        <div>
                            <div className="mb-8 text-center">
                                <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                                    <span className="text-zinc-100">Value </span>
                                    <span className="text-emerald-400">Screener</span>
                                </h1>
                                <p className="text-zinc-300 text-lg max-w-2xl mx-auto">
                                    NSE stocks ranked by a composite value score — low valuation,
                                    strong fundamentals, and analyst upside.
                                </p>
                                <div className="flex flex-wrap justify-center gap-3 mt-6">
                                    {[
                                        "Low P/E & P/B",
                                        "High ROE",
                                        "Low Debt",
                                        "FCF Positive",
                                        "Analyst Upside",
                                    ].map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 text-zinc-300 rounded-full text-sm"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <ValueScreener onAnalyze={handleAnalyzeFromScreener} />
                        </div>
                    ) : activeTab === "analyzer" ? (
                        <div>
                            {/* Hero */}
                            <div className="text-center mb-16">
                                <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                                    <span className="text-zinc-100">AI Stock </span>
                                    <span className="text-blue-400">Analyzer</span>
                                </h1>
                                <p className="text-xl text-zinc-300 mb-12 max-w-4xl mx-auto leading-relaxed">
                                    Professional-grade AI analysis for Indian stock markets.
                                    Get detailed insights, trend analysis, and trading
                                    recommendations.
                                </p>

                                <div className="flex flex-wrap justify-center gap-4 mb-12">
                                    {[
                                        { icon: Brain, text: "AI-Powered Analysis" },
                                        { icon: Zap, text: "Real-time Insights" },
                                        { icon: Shield, text: "Risk Assessment" },
                                    ].map((feature) => (
                                        <div
                                            key={feature.text}
                                            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 border border-neutral-700 text-zinc-200 rounded-full text-sm font-medium"
                                        >
                                            <feature.icon className="w-4 h-4" />
                                            {feature.text}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Stock Form */}
                            <div id="stock-form" className="mb-16">
                                <StockForm
                                    initialSymbol={prefilledSymbol}
                                    onSymbolConsumed={() => setPrefilledSymbol("")}
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            {/* Momentum tab header */}
                            <div className="mb-8 text-center">
                                <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                                    <span className="text-zinc-100">Momentum </span>
                                    <span className="text-yellow-400">Screener</span>
                                </h1>
                                <p className="text-zinc-300 text-lg max-w-2xl mx-auto">
                                    NSE stocks filtered by strict momentum criteria and ranked
                                    by composite score — built for 3–6 month swing trades.
                                </p>
                                <div className="flex flex-wrap justify-center gap-3 mt-6">
                                    {[
                                        "Price > EMA 50",
                                        "3M Return > 10%",
                                        "Within 10% of 1M High",
                                        "Volume Confirmation",
                                    ].map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 text-zinc-300 rounded-full text-sm"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <MomentumScreener onAnalyze={handleAnalyzeFromScreener} />
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-neutral-800 bg-neutral-950 py-8 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-zinc-300 text-sm">
                            &copy; {new Date().getFullYear()} StockGenius. Professional stock
                            analysis platform.
                        </p>
                        <div className="flex items-center gap-4 text-xs text-zinc-400">
                            <span>Advanced AI</span>
                            <span>•</span>
                            <span>Real-time Data</span>
                            <span>•</span>
                            <span>Professional Analysis</span>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-neutral-800">
                        <p className="text-xs text-zinc-400 text-center">
                            <strong>Disclaimer:</strong> Educational insights only — not
                            investment advice. Quotes may be delayed 5–10 minutes. Always
                            consult a qualified financial advisor before investing.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
