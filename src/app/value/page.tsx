"use client";

import { useRouter } from "next/navigation";
import { ValueScreener } from "@/components/ValueScreener";

export default function ValuePage() {
    const router = useRouter();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-10">
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
            <ValueScreener
                onAnalyze={(symbol) => router.push(`/analyzer?symbol=${symbol}`)}
            />
        </div>
    );
}
