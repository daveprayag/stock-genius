"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cachedGet } from "@/lib/clientCache";
import React from "react";
import {
    BarChart2,
    RefreshCw,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    TrendingDown,
    TrendingUp,
    Minus,
    ArrowUpRight,
} from "lucide-react";
import type { SectorData, SectorStock } from "@/app/api/sectors/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtVal(n: number): string {
    if (n >= 100_000) return (n / 100_000).toFixed(2) + "L";
    if (n >= 1_000)   return (n / 1_000).toFixed(1) + "K";
    return n.toFixed(0);
}

function fmtPct(n: number | null, plus = true): string {
    if (n == null) return "—";
    const sign = n > 0 && plus ? "+" : "";
    return `${sign}${n.toFixed(1)}%`;
}

function labelColor(label: SectorData["valuationLabel"]): string {
    switch (label) {
        case "Strongly Undervalued": return "bg-emerald-100 border-emerald-300 text-emerald-700";
        case "Undervalued":          return "bg-blue-100   border-blue-300   text-blue-700";
        case "Fair Value":           return "bg-stone-100  border-stone-300  text-stone-600";
        case "Elevated":             return "bg-amber-100  border-amber-300  text-amber-700";
        case "Overbought":           return "bg-red-100    border-red-300    text-red-700";
    }
}

function labelDot(label: SectorData["valuationLabel"]): string {
    switch (label) {
        case "Strongly Undervalued": return "bg-emerald-500";
        case "Undervalued":          return "bg-blue-500";
        case "Fair Value":           return "bg-stone-400";
        case "Elevated":             return "bg-amber-500";
        case "Overbought":           return "bg-red-500";
    }
}

function changeColor(n: number): string {
    if (n > 0) return "text-emerald-600";
    if (n < 0) return "text-red-500";
    return "text-stone-500";
}

function upsideColor(n: number): string {
    if (n >= 25) return "text-emerald-600 font-semibold";
    if (n >= 10) return "text-blue-600";
    if (n >= 3)  return "text-stone-600";
    return "text-stone-400";
}

// ─── 52-week position bar ─────────────────────────────────────────────────────
function RangeBar({ position, label }: { position: number; label: SectorData["valuationLabel"] }) {
    const color =
        label === "Strongly Undervalued" ? "bg-emerald-500" :
        label === "Undervalued"          ? "bg-blue-500"    :
        label === "Fair Value"           ? "bg-stone-400"   :
        label === "Elevated"             ? "bg-amber-500"   : "bg-red-500";
    return (
        <div className="flex items-center gap-2 min-w-[110px]">
            <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${position}%` }} />
            </div>
            <span className="text-[10px] text-stone-500 w-7 text-right tabular-nums">{position}%</span>
        </div>
    );
}

// ─── Column header with hover tooltip ────────────────────────────────────────
// Tooltip rendering is handled by the parent component via fixed positioning
// to escape overflow:hidden/auto containers on the table wrapper.
interface TooltipState { tip: string; x: number; y: number }

function ColTh({
    label,
    tip,
    align = "left",
    className = "",
    onShowTip,
    onHideTip,
}: {
    label: string;
    tip: string;
    align?: "left" | "right" | "center";
    className?: string;
    onShowTip: (tip: string, x: number, y: number) => void;
    onHideTip: () => void;
}) {
    const btnRef = useRef<HTMLSpanElement>(null);
    return (
        <th className={`px-3 py-3 text-[10px] sm:text-xs font-medium text-stone-500 whitespace-nowrap ${className}`}>
            <div className={`inline-flex items-center gap-1 cursor-default select-none ${align === "right" ? "flex-row-reverse" : ""}`}>
                <span>{label}</span>
                <span
                    ref={btnRef}
                    className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-stone-200 text-[7px] font-bold text-stone-500 cursor-help transition-colors hover:bg-violet-200 hover:text-violet-600 shrink-0"
                    onMouseEnter={() => {
                        const rect = btnRef.current?.getBoundingClientRect();
                        if (rect) onShowTip(tip, rect.left + rect.width / 2, rect.top);
                    }}
                    onMouseLeave={onHideTip}
                >
                    ?
                </span>
            </div>
        </th>
    );
}

// ─── Constituent stock row ────────────────────────────────────────────────────
function StockRow({ s, onAnalyze }: { s: SectorStock; onAnalyze: (sym: string) => void }) {
    const posLabel: SectorData["valuationLabel"] =
        s.fiftyTwoWeekPosition < 25 ? "Strongly Undervalued" :
        s.fiftyTwoWeekPosition < 40 ? "Undervalued" :
        s.fiftyTwoWeekPosition < 60 ? "Fair Value" :
        s.fiftyTwoWeekPosition < 75 ? "Elevated" : "Overbought";

    return (
        <tr className="hover:bg-stone-50/80 transition-colors">
            {/* Name */}
            <td className="px-3 py-2.5 pl-10">
                <div className="flex flex-col">
                    <span className="font-semibold text-stone-800 text-xs">{s.symbol}</span>
                    <span className="text-[10px] text-stone-400 truncate max-w-[120px]">{s.name}</span>
                </div>
            </td>
            {/* Price */}
            <td className="px-3 py-2.5">
                <span className="text-xs text-stone-700 tabular-nums">
                    ₹{s.price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
            </td>
            {/* Day */}
            <td className="px-3 py-2.5">
                <span className={`text-xs tabular-nums ${changeColor(s.changePercent)}`}>
                    {fmtPct(s.changePercent)}
                </span>
            </td>
            {/* P/E */}
            <td className="px-3 py-2.5">
                <span className={`text-xs tabular-nums ${s.pe != null && s.pe < 15 ? "text-emerald-600 font-semibold" : "text-stone-600"}`}>
                    {s.pe != null ? s.pe.toFixed(1) : "—"}
                </span>
            </td>
            {/* 52W position */}
            <td className="px-3 py-2.5">
                <RangeBar position={s.fiftyTwoWeekPosition} label={posLabel} />
            </td>
            {/* Recovery upside */}
            <td className="px-3 py-2.5">
                {s.upsideTo52wHigh > 1 ? (
                    <span className={`text-xs tabular-nums inline-flex items-center gap-0.5 ${upsideColor(s.upsideTo52wHigh)}`}>
                        <ArrowUpRight className="w-3 h-3" />
                        +{s.upsideTo52wHigh.toFixed(1)}%
                    </span>
                ) : (
                    <span className="text-[10px] text-stone-400">Near High</span>
                )}
            </td>
            {/* AI */}
            <td className="px-3 py-2.5 text-center">
                <button
                    onClick={() => onAnalyze(s.symbol)}
                    className="p-1.5 bg-stone-100 hover:bg-violet-600 border border-stone-200 hover:border-violet-500 text-stone-500 hover:text-white rounded transition-all cursor-pointer"
                    title="Analyze with AI"
                >
                    <ExternalLink className="w-3 h-3" />
                </button>
            </td>
        </tr>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
type CategoryFilter = "all" | "Broad Market" | "Sector" | "Market Cap" | "Theme";
type ValFilter = "all" | "undervalued" | "fair" | "elevated";

interface SectorAnalysisProps {
    onAnalyze: (symbol: string) => void;
}

export function SectorAnalysis({ onAnalyze }: SectorAnalysisProps) {
    const [sectors, setSectors]       = useState<SectorData[]>([]);
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState<string | null>(null);
    const [expanded, setExpanded]     = useState<Set<string>>(new Set());
    const [catFilter, setCatFilter]   = useState<CategoryFilter>("all");
    const [valFilter, setValFilter]   = useState<ValFilter>("all");
    const [tooltip, setTooltip]       = useState<TooltipState | null>(null);

    const showTip = useCallback((tip: string, x: number, y: number) => setTooltip({ tip, x, y }), []);
    const hideTip = useCallback(() => setTooltip(null), []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await cachedGet<{ sectors: SectorData[] }>("/api/sectors", 15 * 60 * 1000);
            setSectors(data.sectors ?? []);
        } catch {
            setError("Failed to load sector data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const toggleExpand = (symbol: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(symbol)) next.delete(symbol); else next.add(symbol);
            return next;
        });
    };

    const filtered = sectors.filter(s => {
        if (catFilter !== "all" && s.category !== catFilter) return false;
        if (valFilter === "undervalued" && !["Strongly Undervalued", "Undervalued"].includes(s.valuationLabel)) return false;
        if (valFilter === "fair"        && s.valuationLabel !== "Fair Value") return false;
        if (valFilter === "elevated"    && !["Elevated", "Overbought"].includes(s.valuationLabel)) return false;
        return true;
    });

    const undervaluedCount = sectors.filter(s =>
        s.valuationLabel === "Strongly Undervalued" || s.valuationLabel === "Undervalued"
    ).length;

    const spotlight = sectors
        .filter(s => s.valuationLabel === "Strongly Undervalued" || s.valuationLabel === "Undervalued")
        .slice(0, 3);

    return (
        <div className="space-y-6 relative">
            {/* Fixed-position tooltip — renders outside overflow containers */}
            {tooltip && (
                <div
                    className="fixed z-[9999] w-60 p-2.5 bg-stone-900 text-white text-[10px] rounded-lg shadow-2xl pointer-events-none leading-relaxed"
                    style={{ left: tooltip.x, top: tooltip.y - 8, transform: "translate(-50%, -100%)" }}
                >
                    {tooltip.tip}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-stone-900 rotate-45" />
                </div>
            )}
            {/* Stats bar + Refresh */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                    <span className="text-stone-500">
                        <span className="font-semibold text-stone-800">{loading ? "—" : sectors.length}</span> indices
                    </span>
                    <span className="text-stone-300">•</span>
                    <span className="text-emerald-600 font-medium">{loading ? "—" : undervaluedCount} undervalued</span>
                    <span className="hidden sm:inline text-stone-300">•</span>
                    <span className="hidden sm:inline text-stone-400 text-[10px]">15 min cache</span>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                    <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-stone-400 shrink-0">Type:</span>
                    {(["all", "Sector", "Market Cap", "Theme", "Broad Market"] as const).map(f => (
                        <button key={f} onClick={() => setCatFilter(f)}
                            className={`px-2 py-1 rounded text-[10px] font-medium transition-all cursor-pointer ${catFilter === f ? "bg-violet-100 text-violet-700 border border-violet-200" : "bg-white border border-stone-200 text-stone-500 hover:text-stone-700"}`}
                        >
                            {f === "all" ? "All" : f}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-stone-400 shrink-0">Valuation:</span>
                    {([
                        { label: "All",         value: "all"        },
                        { label: "Undervalued", value: "undervalued" },
                        { label: "Fair Value",  value: "fair"       },
                        { label: "Elevated",    value: "elevated"   },
                    ] as const).map(f => (
                        <button key={f.value} onClick={() => setValFilter(f.value)}
                            className={`px-2 py-1 rounded text-[10px] font-medium transition-all cursor-pointer ${valFilter === f.value ? "bg-stone-800 text-white border border-stone-800" : "bg-white border border-stone-200 text-stone-500 hover:text-stone-700"}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-red-700 text-sm">{error}</p>
                    <button onClick={fetchData} className="ml-auto text-xs text-red-600 hover:text-red-800 underline cursor-pointer">Retry</button>
                </div>
            )}

            {/* Loading skeleton */}
            {loading && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="bg-white border border-stone-200 rounded-xl p-4 animate-pulse">
                                <div className="w-24 h-3 bg-stone-200 rounded mb-3" />
                                <div className="w-32 h-5 bg-stone-200 rounded mb-2" />
                                <div className="w-20 h-3 bg-stone-100 rounded" />
                            </div>
                        ))}
                    </div>
                    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse border-b border-stone-100 last:border-0">
                                <div className="w-5 h-4 rounded bg-stone-100" />
                                <div className="w-32 h-4 rounded bg-stone-100" />
                                <div className="flex-1 h-4 rounded bg-stone-100" />
                                <div className="w-20 h-4 rounded bg-stone-100" />
                                <div className="w-16 h-5 rounded bg-stone-100" />
                            </div>
                        ))}
                        <div className="px-5 py-4 text-center text-sm text-stone-400">
                            Fetching Nifty indices from Yahoo Finance…
                        </div>
                    </div>
                </div>
            )}

            {!loading && sectors.length > 0 && (
                <>
                    {/* Spotlight — top undervalued sectors */}
                    {spotlight.length > 0 && valFilter === "all" && catFilter === "all" && (
                        <div>
                            <p className="text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wide">
                                Undervalued Right Now — Potential Buy Opportunity
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {spotlight.map(s => (
                                    <div key={s.symbol} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wide">{s.category}</span>
                                                <h3 className="text-sm font-bold text-stone-800 leading-tight">{s.name}</h3>
                                            </div>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${labelColor(s.valuationLabel)}`}>
                                                {s.valuationLabel === "Strongly Undervalued" ? "Strong Buy" : "Undervalued"}
                                            </span>
                                        </div>

                                        <div className="flex items-baseline gap-2 mb-3">
                                            <span className="text-lg font-bold text-stone-800 tabular-nums">{fmtVal(s.currentValue)}</span>
                                            <span className={`text-xs font-medium ${changeColor(s.changePercent)}`}>{fmtPct(s.changePercent)}</span>
                                        </div>

                                        {/* Potential gain — hero number */}
                                        {s.upsideTo52wHigh > 0 && (
                                            <div className="flex items-center gap-2 mb-3 px-2.5 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                <ArrowUpRight className="w-4 h-4 text-emerald-600 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] text-emerald-600 font-medium">Upside to 52W High</p>
                                                    <p className="text-base font-bold text-emerald-700 tabular-nums leading-tight">+{s.upsideTo52wHigh.toFixed(1)}%</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-[10px] text-stone-500">
                                                <span>52W position</span>
                                                <span className="font-medium text-stone-700">{s.fiftyTwoWeekPosition}%</span>
                                            </div>
                                            <RangeBar position={s.fiftyTwoWeekPosition} label={s.valuationLabel} />
                                            {s.fiftyTwoWeekChange != null && (
                                                <div className="flex items-center gap-1 text-[10px] text-stone-500 mt-0.5">
                                                    {s.fiftyTwoWeekChange < 0
                                                        ? <TrendingDown className="w-3 h-3 text-red-400" />
                                                        : <TrendingUp className="w-3 h-3 text-emerald-500" />}
                                                    <span>52W return: <span className={s.fiftyTwoWeekChange < 0 ? "text-red-500 font-medium" : "text-emerald-600 font-medium"}>{fmtPct(s.fiftyTwoWeekChange)}</span></span>
                                                </div>
                                            )}
                                            {s.avgPE != null && (
                                                <div className="text-[10px] text-stone-500">
                                                    Avg P/E: <span className="font-medium text-stone-700">{s.avgPE.toFixed(1)}×</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Main table */}
                    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                        {filtered.length === 0 ? (
                            <div className="py-16 text-center">
                                <BarChart2 className="w-8 h-8 text-stone-300 mx-auto mb-3" />
                                <p className="text-stone-500 text-sm">No sectors match the current filters.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-xs sm:text-sm">
                                    <thead>
                                        <tr className="bg-stone-50 border-b border-stone-200">
                                            {/* Index — sticky on mobile only */}
                                            <th className="sticky sm:static left-0 z-20 sm:z-auto bg-stone-50 px-3 py-3 text-left text-[10px] sm:text-xs font-medium text-stone-500 min-w-[130px] sm:min-w-[160px]">
                                                Index
                                            </th>
                                            <ColTh label="Level" tip="Current index level. Formatted as K (thousands) or L (100 thousands)." onShowTip={showTip} onHideTip={hideTip} />
                                            <ColTh label="Day" tip="Percentage change since the previous market close." onShowTip={showTip} onHideTip={hideTip} />
                                            <ColTh label="52W Return" tip="Drawdown from the 52-week high. e.g. −15% means the index is 15% below its annual peak. Larger drops with a low 52W Range = stronger undervaluation signal." onShowTip={showTip} onHideTip={hideTip} />
                                            <ColTh label="52W Range" tip="Where the index sits between its annual low (0%) and annual high (100%). Below 30% = near yearly bottom, historically a better entry point." onShowTip={showTip} onHideTip={hideTip} />
                                            <ColTh label="Avg P/E" tip="Average trailing P/E of constituent stocks. Lower = cheaper relative to earnings. Sector norms differ (e.g. banks ~12×, pharma ~30×)." onShowTip={showTip} onHideTip={hideTip} />
                                            <ColTh label="Recovery ↑" tip="Potential gain if this index recovers to its 52-week high: (52W High − Current) ÷ Current × 100. Not a prediction." onShowTip={showTip} onHideTip={hideTip} />
                                            <ColTh label="Rating" tip="Valuation score 0–100: 52W range position (60%) + annual return (40%). Strongly Undervalued = near annual lows. Overbought = near annual highs with strong returns." onShowTip={showTip} onHideTip={hideTip} />
                                            <th className="px-3 py-3 w-10" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {filtered.map((s, idx) => {
                                            const isOpen = expanded.has(s.symbol);
                                            return (
                                                <React.Fragment key={s.symbol}>
                                                    <tr
                                                        className="group hover:bg-stone-50 transition-colors cursor-pointer"
                                                        onClick={() => toggleExpand(s.symbol)}
                                                    >
                                                        {/* Index name — sticky on mobile only */}
                                                        <td className="sticky sm:static left-0 z-10 sm:z-auto bg-white sm:bg-transparent group-hover:bg-stone-50 px-3 py-3 transition-colors">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[9px] sm:text-[10px] font-bold text-stone-400 w-4 tabular-nums shrink-0">{idx + 1}</span>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="font-semibold text-stone-800 text-xs sm:text-sm leading-tight">{s.name}</span>
                                                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${labelDot(s.valuationLabel)}`} />
                                                                    </div>
                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                        <span className="text-[10px] text-stone-400 whitespace-nowrap">{s.category}</span>
                                                                        {s.aboveTwoHundredDay != null && (
                                                                            <span className={`shrink-0 text-[9px] px-1 py-0.5 rounded font-medium whitespace-nowrap ${s.aboveTwoHundredDay ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                                                                                {s.aboveTwoHundredDay ? "↑ 200D" : "↓ 200D"}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Level */}
                                                        <td className="px-3 py-3">
                                                            <span className="font-mono text-xs sm:text-sm text-stone-800 tabular-nums">
                                                                {fmtVal(s.currentValue)}
                                                            </span>
                                                        </td>

                                                        {/* Day */}
                                                        <td className="px-3 py-3">
                                                            <span className={`font-medium text-xs tabular-nums ${changeColor(s.changePercent)}`}>
                                                                {fmtPct(s.changePercent)}
                                                            </span>
                                                        </td>

                                                        {/* 52W Return */}
                                                        <td className="px-3 py-3">
                                                            <div className="inline-flex items-center gap-0.5">
                                                                {s.fiftyTwoWeekChange == null ? (
                                                                    <Minus className="w-3 h-3 text-stone-400" />
                                                                ) : s.fiftyTwoWeekChange > 0 ? (
                                                                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                                                                ) : (
                                                                    <TrendingDown className="w-3 h-3 text-red-400" />
                                                                )}
                                                                <span className={`text-xs tabular-nums ${s.fiftyTwoWeekChange == null ? "text-stone-400" : changeColor(s.fiftyTwoWeekChange)}`}>
                                                                    {fmtPct(s.fiftyTwoWeekChange)}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* 52W Range */}
                                                        <td className="px-3 py-3">
                                                            <div className="space-y-0.5">
                                                                <RangeBar position={s.fiftyTwoWeekPosition} label={s.valuationLabel} />
                                                                <div className="flex justify-between text-[9px] text-stone-400 tabular-nums">
                                                                    <span>{fmtVal(s.fiftyTwoWeekLow)}</span>
                                                                    <span>{fmtVal(s.fiftyTwoWeekHigh)}</span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Avg P/E */}
                                                        <td className="px-3 py-3">
                                                            <span className="text-xs text-stone-600 tabular-nums">
                                                                {s.avgPE != null ? `${s.avgPE.toFixed(1)}×` : "—"}
                                                            </span>
                                                        </td>

                                                        {/* Recovery upside */}
                                                        <td className="px-3 py-3">
                                                            {s.upsideTo52wHigh > 1 ? (
                                                                <span className={`inline-flex items-center gap-0.5 text-xs tabular-nums ${upsideColor(s.upsideTo52wHigh)}`}>
                                                                    <ArrowUpRight className="w-3 h-3 shrink-0" />
                                                                    +{s.upsideTo52wHigh.toFixed(1)}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-stone-400">Near High</span>
                                                            )}
                                                        </td>

                                                        {/* Rating badge */}
                                                        <td className="px-3 py-3">
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] sm:text-[10px] font-semibold whitespace-nowrap ${labelColor(s.valuationLabel)}`}>
                                                                {s.valuationLabel}
                                                            </span>
                                                        </td>

                                                        {/* Expand toggle */}
                                                        <td className="px-3 py-3 text-center" onClick={e => { e.stopPropagation(); toggleExpand(s.symbol); }}>
                                                            <button className="p-1 rounded hover:bg-stone-100 transition-colors cursor-pointer">
                                                                {isOpen
                                                                    ? <ChevronUp className="w-4 h-4 text-stone-400" />
                                                                    : <ChevronDown className="w-4 h-4 text-stone-400" />
                                                                }
                                                            </button>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded: top undervalued constituent stocks */}
                                                    {isOpen && (
                                                        <tr>
                                                            <td colSpan={9} className="p-0">
                                                                <div className="bg-stone-50 border-t border-b border-stone-200">
                                                                    {s.topStocks.length === 0 ? (
                                                                        <p className="text-xs text-stone-400 py-3 px-10">No constituent stock data available.</p>
                                                                    ) : (
                                                                        <table className="w-full text-xs">
                                                                            <thead>
                                                                                <tr className="border-b border-stone-200">
                                                                                    <th className="px-3 py-2 pl-10 text-left text-[10px] font-medium text-stone-400 min-w-[150px]">
                                                                                        Most Undervalued in {s.name}
                                                                                    </th>
                                                                                    <th className="px-3 py-2 text-left text-[10px] font-medium text-stone-400">Price</th>
                                                                                    <th className="px-3 py-2 text-left text-[10px] font-medium text-stone-400">Day</th>
                                                                                    <th className="px-3 py-2 text-left text-[10px] font-medium text-stone-400">P/E</th>
                                                                                    <th className="px-3 py-2 text-left text-[10px] font-medium text-stone-400">52W Position</th>
                                                                                    <th className="px-3 py-2 text-left text-[10px] font-medium text-stone-400">Recovery ↑</th>
                                                                                    <th className="px-3 py-2 w-10" />
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-stone-200">
                                                                                {s.topStocks.map(stock => (
                                                                                    <StockRow key={stock.symbol} s={stock} onAnalyze={onAnalyze} />
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between flex-wrap gap-2">
                            <p className="text-[10px] text-stone-400">
                                Hover column headers <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-stone-200 text-[7px] font-bold">?</span> for explanations. Click any row to see top undervalued stocks.
                            </p>
                            <p className="text-[10px] text-stone-400">Recovery ↑ is not a prediction. Not investment advice.</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
