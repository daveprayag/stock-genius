import { Suspense } from "react";
import { AnalyzerClient } from "./AnalyzerClient";

export default function AnalyzerPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-10">
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

            <div id="stock-form">
                <Suspense fallback={null}>
                    <AnalyzerClient />
                </Suspense>
            </div>
        </div>
    );
}
