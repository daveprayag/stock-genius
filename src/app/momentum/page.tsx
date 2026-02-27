"use client";

import { useRouter } from "next/navigation";
import { MomentumScreener } from "@/components/MomentumScreener";

export default function MomentumPage() {
    const router = useRouter();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-10">
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
                        {["EMA50↑", "3M>10%", "Near High", "Vol✓"].map((tag) => (
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
            <MomentumScreener
                onAnalyze={(symbol) => router.push(`/analyzer?symbol=${symbol}`)}
            />
        </div>
    );
}
