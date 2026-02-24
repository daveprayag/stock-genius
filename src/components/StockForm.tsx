"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Search, AlertCircle, Clock } from "lucide-react";
import { AnalysisResults } from "@/components/AnalysisResults";
import { StatusTimeline } from "@/components/StatusTimeline";
import { buildPrompt } from "@/lib/buildPrompt";

type StatusStep = {
    id: string;
    label: string;
    status: "pending" | "active" | "completed" | "error";
    timestamp?: Date;
};

interface StockFormProps {
    initialSymbol?: string;
    onSymbolConsumed?: () => void;
}

export function StockForm({ initialSymbol = "", onSymbolConsumed }: StockFormProps) {
    const [symbol, setSymbol] = useState(initialSymbol);
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<null | {
        result: any;
        tokensUsed?: number;
    }>(null);
    const [error, setError] = useState<string | null>(null);
    const [statusSteps, setStatusSteps] = useState<StatusStep[]>([
        { id: "validate", label: "Validating stock symbol", status: "pending" },
        { id: "fetch", label: "Fetching stock data", status: "pending" },
        {
            id: "compute",
            label: "Computing technical indicators",
            status: "pending",
        },
        { id: "analyze", label: "Analyzing with AI", status: "pending" },
        { id: "complete", label: "Analysis complete", status: "pending" },
    ]);

    const timelineRef = useRef<HTMLDivElement>(null);

    // When a symbol is pre-filled from the Momentum Screener, sync it in
    useEffect(() => {
        if (initialSymbol) {
            setSymbol(initialSymbol);
            onSymbolConsumed?.();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSymbol]);

    const updateStepStatus = (stepId: string, status: StatusStep["status"]) => {
        setStatusSteps((prev) =>
            prev.map((step) =>
                step.id === stepId
                    ? { ...step, status, timestamp: new Date() }
                    : step
            )
        );
    };

    const resetSteps = () => {
        setStatusSteps((prev) =>
            prev.map((step) => ({
                ...step,
                status: "pending",
                timestamp: undefined,
            }))
        );
    };

    const scrollToTimeline = () => {
        setTimeout(() => {
            timelineRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }, 100);
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setAnalysis(null);
        resetSteps();

        const trimmedSymbol = symbol.trim();
        if (!trimmedSymbol) {
            setError("Please enter a valid stock symbol.");
            updateStepStatus("validate", "error");
            return;
        }

        try {
            setLoading(true);
            scrollToTimeline();

            // Step 1: Validate
            updateStepStatus("validate", "active");
            await new Promise((resolve) => setTimeout(resolve, 800));
            updateStepStatus("validate", "completed");

            // Step 2: Fetch data
            updateStepStatus("fetch", "active");
            const response = await axios.get(`/api/financials`, {
                params: { symbol: `${trimmedSymbol}` },
            });

            if (response.status === 400 || response.status === 404) {
                setError(response.data.error || "No data found.");
                updateStepStatus("fetch", "error");
                return;
            }
            updateStepStatus("fetch", "completed");

            // Step 3: Compute indicators
            updateStepStatus("compute", "active");
            const prompt = buildPrompt(
                trimmedSymbol,
                response.data.financials,
                response.data.technicalIndicators
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
            updateStepStatus("compute", "completed");

            // Step 4: AI Analysis
            updateStepStatus("analyze", "active");
            const promptResponse = await axios.post("/api/analyze", { prompt });

            if (promptResponse.status !== 200) {
                setError(promptResponse.data.error || "Analysis failed.");
                updateStepStatus("analyze", "error");
                return;
            }

            console.log("LLM Response:", promptResponse.data.result);

            const parsedResult = JSON.parse(promptResponse.data.result);
            setAnalysis({
                result: parsedResult,
                tokensUsed: promptResponse.data.tokensUsed,
            });

            updateStepStatus("analyze", "completed");

            // Step 5: Complete
            updateStepStatus("complete", "active");
            await new Promise((resolve) => setTimeout(resolve, 500));
            updateStepStatus("complete", "completed");
        } catch (err: any) {
            if (err.message?.includes("GEMINI_API_KEY")) {
                setError("Gemini API key is not set.");
            } else if (axios.isAxiosError(err) && err.response) {
                setError(err.response.data?.error || "Error fetching data.");
            } else {
                console.error("Unexpected error:", err);
                setError("An unexpected error occurred.");
            }

            const activeStep = statusSteps.find(
                (step) => step.status === "active"
            );
            if (activeStep) {
                updateStepStatus(activeStep.id, "error");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full space-y-8">
            {/* Stock Input Card */}
            <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-zinc-100 mb-2">
                        Stock Analysis
                    </h2>
                    <p className="text-zinc-300">
                        Enter an Indian stock symbol for AI-powered analysis
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-200 mb-2">
                                Stock Symbol{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="e.g., TCS, RELIANCE, INFY"
                                    value={symbol}
                                    onChange={(e) =>
                                        setSymbol(e.target.value.toUpperCase())
                                    }
                                    className="w-full pl-12 pr-4 py-4 bg-neutral-800 border border-neutral-700 text-zinc-100 placeholder-zinc-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent transition-all duration-200"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !symbol.trim()}
                            className="w-full bg-zinc-100 hover:bg-zinc-200 cursor-pointer text-zinc-800 font-semibold py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3"
                        >
                            <Search className="w-5 h-5" />
                            <span>
                                {loading ? "Analyzing..." : "Analyze Stock"}
                            </span>
                        </button>

                        {loading && (
                            <div className="flex items-center justify-center gap-2 antialiased text-zinc-300 text-sm">
                                <Clock className="w-4 h-4" />
                                <span>Estimated time: 15-30 seconds</span>
                            </div>
                        )}
                    </div>
                </form>

                <div className="mt-6 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        AI-powered analysis for Indian markets
                    </div>
                </div>
            </div>

            {/* Status Timeline */}
            <div ref={timelineRef}>
                {loading && <StatusTimeline steps={statusSteps} />}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-900/40 rounded-full">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <p className="text-red-300 font-semibold">
                                Analysis Error
                            </p>
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Analysis Results */}
            {analysis && !loading && !error && (
                <AnalysisResults analysis={analysis} />
            )}
        </div>
    );
}
