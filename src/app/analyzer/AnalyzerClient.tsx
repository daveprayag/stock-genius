"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { StockForm } from "@/components/StockForm";

export function AnalyzerClient() {
    const searchParams = useSearchParams();
    const symbolParam = searchParams.get("symbol") ?? "";
    const [prefilledSymbol, setPrefilledSymbol] = useState(symbolParam);

    // Sync if URL param changes (e.g. from screener navigation)
    useEffect(() => {
        if (symbolParam) setPrefilledSymbol(symbolParam);
    }, [symbolParam]);

    return (
        <StockForm
            initialSymbol={prefilledSymbol}
            onSymbolConsumed={() => setPrefilledSymbol("")}
        />
    );
}
