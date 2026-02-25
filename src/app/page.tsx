"use client";

import { useState } from "react";
import { StockForm } from "@/components/StockForm";
import { MomentumScreener } from "@/components/MomentumScreener";
import { ValueScreener } from "@/components/ValueScreener";
import { TrendingUp, Brain, Zap, Gem } from "lucide-react";

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
        <div className="min-h-screen bg-[#edeceb] relative overflow-hidden flex flex-col">
            {/* Background */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />

            {/* Fixed Header */}
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-stone-300/50 bg-[#edeceb]/95 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    {/* Logo */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="relative">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-stone-800 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md">
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2 h-2 sm:w-3 sm:h-3 bg-emerald-500 rounded-full" />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold text-stone-800">StockGenius</h1>
                            <div className="hidden sm:flex items-center gap-2 mt-0.5">
                                <span className="text-xs bg-stone-800 text-white px-2 py-0.5 rounded-full font-medium">
                                    AI Powered
                                </span>
                                <span className="text-xs text-stone-500 font-medium">
                                    🇮🇳 Indian Markets
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tab navigation */}
                    <div className="flex items-center bg-white/60 border border-stone-300/50 rounded-xl p-1 gap-1 shadow-sm">
                        <button
                            onClick={() => setActiveTab("analyzer")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                activeTab === "analyzer"
                                    ? "bg-stone-800 text-white shadow-sm"
                                    : "text-stone-500 hover:text-stone-700"
                            }`}
                        >
                            <Brain className="w-4 h-4" />
                            <span className="hidden sm:inline">Analyzer</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("momentum")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                activeTab === "momentum"
                                    ? "bg-stone-800 text-white shadow-sm"
                                    : "text-stone-500 hover:text-stone-700"
                            }`}
                        >
                            <Zap className="w-4 h-4" />
                            <span className="hidden sm:inline">Momentum</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("value")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                activeTab === "value"
                                    ? "bg-stone-800 text-white shadow-sm"
                                    : "text-stone-500 hover:text-stone-700"
                            }`}
                        >
                            <Gem className="w-4 h-4" />
                            <span className="hidden sm:inline">Value</span>
                        </button>
                    </div>

                </div>
            </header>

            {/* Main */}
            <main className="pt-16 sm:pt-20 flex-1 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-12">
                    {activeTab === "value" ? (
                        <div>
                            {/* Value tab header - minimal */}
                            <div className="mb-4 sm:mb-8">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <h1 className="text-2xl sm:text-4xl font-bold">
                                            <span className="text-stone-800">Value </span>
                                            <span className="text-emerald-600">Screener</span>
                                        </h1>
                                        <p className="text-stone-500 text-sm mt-1 hidden sm:block">
                                            Low valuation • Strong fundamentals • Analyst upside
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {["Low P/E", "High ROE", "Low Debt", "FCF+"].map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-1 bg-white/60 border border-stone-300/50 text-stone-500 rounded text-[10px] font-medium"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <ValueScreener onAnalyze={handleAnalyzeFromScreener} />
                        </div>
                    ) : activeTab === "analyzer" ? (
                        <div>
                            {/* Analyzer header - minimal */}
                            <div className="mb-4 sm:mb-8">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <h1 className="text-2xl sm:text-4xl font-bold">
                                            <span className="text-stone-800">AI </span>
                                            <span className="text-blue-600">Analyzer</span>
                                        </h1>
                                        <p className="text-stone-500 text-sm mt-1 hidden sm:block">
                                            AI-powered insights • Trend analysis • Risk assessment
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {["AI Analysis", "Trends", "Risk"].map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-1 bg-white/60 border border-stone-300/50 text-stone-500 rounded text-[10px] font-medium"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Stock Form */}
                            <div id="stock-form">
                                <StockForm
                                    initialSymbol={prefilledSymbol}
                                    onSymbolConsumed={() => setPrefilledSymbol("")}
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            {/* Momentum tab header - minimal */}
                            <div className="mb-4 sm:mb-8">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <h1 className="text-2xl sm:text-4xl font-bold">
                                            <span className="text-stone-800">Momentum </span>
                                            <span className="text-amber-600">Screener</span>
                                        </h1>
                                        <p className="text-stone-500 text-sm mt-1 hidden sm:block">
                                            3–6 month swing trades • Price &gt; EMA50 • 3M &gt; 10% • Near highs
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {["EMA50↑", "3M&gt;10%", "Near High", "Vol✓"].map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-1 bg-white/60 border border-stone-300/50 text-stone-500 rounded text-[10px] font-medium"
                                                dangerouslySetInnerHTML={{ __html: tag }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <MomentumScreener onAnalyze={handleAnalyzeFromScreener} />
                        </div>
                    )}
                </div>
            </main>

            {/* Footer - minimal */}
            <footer className="border-t border-stone-300/50 bg-[#edeceb] py-4 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-stone-500">
                        <span>&copy; {new Date().getFullYear()} StockGenius</span>
                        <span className="text-stone-400">Not investment advice. Consult a financial advisor.</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
