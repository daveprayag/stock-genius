"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
    Gem,
    RefreshCw,
    ChevronUp,
    ChevronDown,
    AlertCircle,
    ExternalLink,
} from "lucide-react";
import type { ValueStock } from "@/app/api/value/route";

// ─── Filter types ─────────────────────────────────────────────────────────────
type PeFilter = "any" | "lt10" | "lt15" | "lt20" | "lt30";
type RoeFilter = "any" | "gt10" | "gt15" | "gt20";
type DebtFilter = "any" | "low" | "vlow";
type CategoryFilter = "all" | "Deep Value" | "Value";
type SortKey = keyof Pick<
    ValueStock,
    "valueScore" | "pe" | "priceToBook" | "roe" | "debtToEquity" | "analystUpside" | "fcfYield" | "dividendYield" | "operatingMargin"
>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number | null, decimals = 1): string {
    if (n == null) return "—";
    return n.toFixed(decimals);
}

function fmtPct(n: number | null): string {
    if (n == null) return "—";
    return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}


function scoreBg(label: ValueStock["valueLabel"]): string {
    if (label === "Deep Value") return "bg-emerald-100 border-emerald-300 text-emerald-700";
    if (label === "Value") return "bg-blue-100 border-blue-300 text-blue-700";
    return "bg-stone-100 border-stone-300 text-stone-600";
}

function SortTh({
    label,
    sortKey,
    current,
    asc,
    onSort,
    className = "",
}: {
    label: string;
    sortKey: SortKey;
    current: SortKey;
    asc: boolean;
    onSort: (k: SortKey) => void;
    className?: string;
}) {
    const active = current === sortKey;
    return (
        <th
            onClick={() => onSort(sortKey)}
            className={`px-2 sm:px-3 py-2.5 text-right text-[10px] sm:text-xs font-medium text-stone-500 whitespace-nowrap select-none cursor-pointer hover:text-stone-800 transition-colors ${className}`}
        >
            <span className="inline-flex items-center gap-0.5 justify-end">
                {label}
                {active && (asc ? <ChevronUp className="w-2.5 h-2.5 text-emerald-600" /> : <ChevronDown className="w-2.5 h-2.5 text-emerald-600" />)}
            </span>
        </th>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────
interface ValueScreenerProps {
    onAnalyze: (symbol: string) => void;
}

export function ValueScreener({ onAnalyze }: ValueScreenerProps) {
    const [stocks, setStocks] = useState<ValueStock[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [peFilter, setPeFilter] = useState<PeFilter>("any");
    const [roeFilter, setRoeFilter] = useState<RoeFilter>("any");
    const [debtFilter, setDebtFilter] = useState<DebtFilter>("any");
    const [catFilter, setCatFilter] = useState<CategoryFilter>("all");

    // Sort
    const [sortKey, setSortKey] = useState<SortKey>("valueScore");
    const [sortAsc, setSortAsc] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get("/api/value");
            setStocks(res.data.stocks ?? []);
        } catch (e: any) {
            setError(e.response?.data?.error ?? "Failed to load value data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortAsc((a) => !a);
        } else {
            setSortKey(key);
            setSortAsc(false);
        }
    };

    // Apply filters
    const filtered = stocks.filter((s) => {
        if (peFilter !== "any") {
            if (s.pe == null) return false;
            const limits: Record<PeFilter, number> = { any: Infinity, lt10: 10, lt15: 15, lt20: 20, lt30: 30 };
            if (s.pe >= limits[peFilter]) return false;
        }
        if (roeFilter !== "any") {
            if (s.roe == null) return false;
            const roePct = s.roe * 100;
            if (roeFilter === "gt10" && roePct < 10) return false;
            if (roeFilter === "gt15" && roePct < 15) return false;
            if (roeFilter === "gt20" && roePct < 20) return false;
        }
        if (debtFilter !== "any") {
            if (s.debtToEquity == null) return false;
            if (debtFilter === "low" && s.debtToEquity >= 1) return false;
            if (debtFilter === "vlow" && s.debtToEquity >= 0.5) return false;
        }
        if (catFilter !== "all" && s.valueLabel !== catFilter) return false;
        return true;
    });

    // Apply sort
    const displayed = [...filtered].sort((a, b) => {
        const av = a[sortKey] ?? -Infinity;
        const bv = b[sortKey] ?? -Infinity;
        const diff = (av as number) - (bv as number);
        // PE & D/E: lower is better → invert when descending
        const invertKeys: SortKey[] = ["pe", "priceToBook", "debtToEquity", "pegRatio" as any];
        const invert = invertKeys.includes(sortKey) ? -1 : 1;
        return sortAsc ? diff * invert : -diff * invert;
    });

    const deepValueCount = stocks.filter((s) => s.valueLabel === "Deep Value").length;
    const valueCount = stocks.filter((s) => s.valueLabel === "Value").length;

    return (
        <div className="space-y-6">
            {/* Stats bar - compact */}
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                <span className="text-stone-500">
                    Top <span className="font-semibold text-stone-800">{loading ? "—" : displayed.length}</span> value stocks
                </span>
                <span className="text-stone-300">•</span>
                <span className="text-emerald-600 font-medium">{loading ? "—" : deepValueCount} Deep Value</span>
                <span className="text-stone-300">•</span>
                <span className="text-blue-600 font-medium">{loading ? "—" : valueCount} Value</span>
            </div>

            {/* Filters - compact inline */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-stone-400">P/E:</span>
                {[
                    { label: "Any", value: "any" as PeFilter },
                    { label: "<15", value: "lt15" as PeFilter },
                    { label: "<20", value: "lt20" as PeFilter },
                ].map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => setPeFilter(opt.value)}
                        className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium transition-all cursor-pointer ${
                            peFilter === opt.value
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-white border border-stone-200 text-stone-500 hover:text-stone-700"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
                <span className="text-stone-300 text-[10px]">|</span>
                <span className="text-[10px] text-stone-400">ROE:</span>
                {[
                    { label: "Any", value: "any" as RoeFilter },
                    { label: ">15%", value: "gt15" as RoeFilter },
                    { label: ">20%", value: "gt20" as RoeFilter },
                ].map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => setRoeFilter(opt.value)}
                        className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium transition-all cursor-pointer ${
                            roeFilter === opt.value
                                ? "bg-blue-100 text-blue-700"
                                : "bg-white border border-stone-200 text-stone-500 hover:text-stone-700"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
                <span className="text-stone-300 text-[10px]">|</span>
                {[
                    { label: "All", value: "all" as CategoryFilter },
                    { label: "Deep Value", value: "Deep Value" as CategoryFilter },
                    { label: "Value", value: "Value" as CategoryFilter },
                ].map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => setCatFilter(opt.value)}
                        className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium transition-all cursor-pointer ${
                            catFilter === opt.value
                                ? "bg-violet-100 text-violet-700"
                                : "bg-white border border-stone-200 text-stone-500 hover:text-stone-700"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-red-700 text-sm">{error}</p>
                    <button onClick={fetchData} className="ml-auto text-xs text-red-600 hover:text-red-800 underline cursor-pointer">
                        Retry
                    </button>
                </div>
            )}

            {/* Loading skeleton */}
            {loading && (
                <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-6 py-5 border-b border-stone-200">
                        <div className="flex items-center gap-3 animate-pulse">
                            <div className="w-5 h-5 rounded-full bg-stone-200" />
                            <div className="w-48 h-4 rounded bg-stone-200" />
                        </div>
                    </div>
                    <div className="divide-y divide-stone-100">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                                <div className="w-5 h-4 rounded bg-stone-100" />
                                <div className="w-28 h-4 rounded bg-stone-100" />
                                <div className="flex-1 h-4 rounded bg-stone-100" />
                                <div className="w-16 h-4 rounded bg-stone-100" />
                                <div className="w-14 h-4 rounded bg-stone-100" />
                                <div className="w-12 h-4 rounded bg-stone-100" />
                            </div>
                        ))}
                    </div>
                    <div className="px-6 py-4 border-t border-stone-200">
                        <p className="text-sm text-stone-400 text-center">
                            Scanning fundamentals across 330+ NSE stocks… ~10 seconds
                        </p>
                    </div>
                </div>
            )}

            {/* Table */}
            {!loading && (
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                {displayed.length === 0 ? (
                    <div className="py-16 text-center">
                        <Gem className="w-8 h-8 text-stone-300 mx-auto mb-3" />
                        <p className="text-stone-500 text-sm">No stocks match the current filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm">
                            <thead>
                                <tr className="bg-stone-50 border-b border-stone-200">
                                    <th className="sticky left-0 z-10 bg-stone-50 px-2 sm:px-3 py-2.5 text-left text-[10px] sm:text-xs font-medium text-stone-500 min-w-[100px] sm:min-w-[130px]">Stock</th>
                                    <SortTh label="P/E" sortKey="pe" current={sortKey} asc={sortAsc} onSort={handleSort} />
                                    <SortTh label="P/B" sortKey="priceToBook" current={sortKey} asc={sortAsc} onSort={handleSort} />
                                    <SortTh label="ROE" sortKey="roe" current={sortKey} asc={sortAsc} onSort={handleSort} />
                                    <SortTh label="D/E" sortKey="debtToEquity" current={sortKey} asc={sortAsc} onSort={handleSort} />
                                    <SortTh label="Upside" sortKey="analystUpside" current={sortKey} asc={sortAsc} onSort={handleSort} />
                                    <SortTh label="Score" sortKey="valueScore" current={sortKey} asc={sortAsc} onSort={handleSort} />
                                    <th className="px-2 sm:px-3 py-2.5 text-center text-[10px] sm:text-xs font-medium text-stone-500">AI</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {displayed.map((s) => (
                                    <tr
                                        key={s.symbol}
                                        className="hover:bg-stone-50 transition-colors"
                                    >
                                        {/* Stock */}
                                        <td className="sticky left-0 z-10 bg-white px-2 sm:px-3 py-2.5">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-semibold text-stone-800 text-xs sm:text-sm">{s.symbol}</span>
                                                    <span className={`text-[8px] px-1 py-0.5 rounded font-medium ${
                                                        s.valueLabel === "Deep Value" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                                                    }`}>
                                                        {s.valueLabel === "Deep Value" ? "DV" : "V"}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-stone-400 truncate max-w-[90px] sm:max-w-[120px]">{s.name}</span>
                                                <span className="text-[10px] text-stone-600 mt-0.5">₹{s.price.toLocaleString()}</span>
                                            </div>
                                        </td>

                                        {/* P/E */}
                                        <td className="px-2 sm:px-3 py-2.5 text-right">
                                            <span className={`font-mono text-[11px] sm:text-sm ${s.pe != null && s.pe < 15 ? "text-emerald-600" : "text-stone-600"}`}>
                                                {fmt(s.pe)}
                                            </span>
                                        </td>

                                        {/* P/B */}
                                        <td className="px-2 sm:px-3 py-2.5 text-right">
                                            <span className={`font-mono text-[11px] sm:text-sm ${s.priceToBook != null && s.priceToBook < 2 ? "text-emerald-600" : "text-stone-600"}`}>
                                                {fmt(s.priceToBook)}
                                            </span>
                                        </td>

                                        {/* ROE */}
                                        <td className="px-2 sm:px-3 py-2.5 text-right">
                                            <span className={`font-mono text-[11px] sm:text-sm ${s.roe != null && s.roe * 100 >= 20 ? "text-emerald-600" : "text-stone-600"}`}>
                                                {s.roe != null ? `${(s.roe * 100).toFixed(0)}%` : "—"}
                                            </span>
                                        </td>

                                        {/* D/E */}
                                        <td className="px-2 sm:px-3 py-2.5 text-right">
                                            <span className={`font-mono text-[11px] sm:text-sm ${s.debtToEquity != null && s.debtToEquity < 0.5 ? "text-emerald-600" : "text-stone-600"}`}>
                                                {fmt(s.debtToEquity, 1)}
                                            </span>
                                        </td>

                                        {/* Analyst Upside */}
                                        <td className="px-2 sm:px-3 py-2.5 text-right">
                                            <span className={`font-mono text-[11px] sm:text-sm ${s.analystUpside != null && s.analystUpside >= 20 ? "text-emerald-600" : "text-stone-600"}`}>
                                                {s.analystUpside != null ? fmtPct(s.analystUpside) : "—"}
                                            </span>
                                        </td>

                                        {/* Score */}
                                        <td className="px-2 sm:px-3 py-2.5 text-right">
                                            <span className={`inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 rounded border text-[10px] sm:text-xs font-bold ${scoreBg(s.valueLabel)}`}>
                                                {s.valueScore}
                                            </span>
                                        </td>

                                        {/* AI Button */}
                                        <td className="px-2 sm:px-3 py-2.5 text-center">
                                            <button
                                                onClick={() => onAnalyze(s.symbol)}
                                                className="p-1.5 bg-stone-100 hover:bg-emerald-600 border border-stone-200 hover:border-emerald-500 text-stone-500 hover:text-white rounded transition-all cursor-pointer"
                                                title="Analyze with AI"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            )}

        </div>
    );
}
