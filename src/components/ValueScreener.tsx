"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
    Gem,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    ChevronUp,
    ChevronDown,
    AlertCircle,
    ExternalLink,
    BarChart2,
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

// ─── FilterPills ──────────────────────────────────────────────────────────────
function FilterPills<T extends string>({
    label,
    options,
    value,
    onChange,
    activeClass = "bg-blue-500/20 border-blue-500/50 text-blue-300",
}: {
    label: string;
    options: { label: string; value: T }[];
    value: T;
    onChange: (v: T) => void;
    activeClass?: string;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium whitespace-nowrap">{label}:</span>
            {options.map((o) => (
                <button
                    key={o.value}
                    onClick={() => onChange(o.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        value === o.value
                            ? activeClass
                            : "bg-neutral-800 border-neutral-700 text-zinc-400 hover:text-zinc-200 hover:border-neutral-500"
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

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
    if (label === "Deep Value") return "bg-emerald-500/15 border-emerald-500/40 text-emerald-400";
    if (label === "Value") return "bg-blue-500/15 border-blue-500/40 text-blue-400";
    return "bg-zinc-800 border-zinc-700 text-zinc-400";
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
            className={`px-3 py-3 text-right text-xs font-medium text-zinc-400 whitespace-nowrap select-none cursor-pointer hover:text-zinc-200 transition-colors ${className}`}
        >
            <span className="inline-flex items-center gap-1 justify-end">
                {label}
                {active ? (
                    asc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                ) : (
                    <ChevronDown className="w-3 h-3 opacity-30" />
                )}
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
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
            setLastUpdated(new Date());
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
            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Screened", value: stocks.length, color: "text-zinc-100" },
                    { label: "Deep Value", value: deepValueCount, color: "text-emerald-400" },
                    { label: "Value", value: valueCount, color: "text-blue-400" },
                    { label: "Filtered", value: displayed.length, color: "text-zinc-100" },
                ].map((s) => (
                    <div key={s.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
                        <div className={`text-2xl font-bold ${s.color}`}>{loading ? "—" : s.value}</div>
                        <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
                <FilterPills<PeFilter>
                    label="P/E"
                    value={peFilter}
                    onChange={setPeFilter}
                    activeClass="bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    options={[
                        { label: "Any", value: "any" },
                        { label: "< 10", value: "lt10" },
                        { label: "< 15", value: "lt15" },
                        { label: "< 20", value: "lt20" },
                        { label: "< 30", value: "lt30" },
                    ]}
                />
                <FilterPills<RoeFilter>
                    label="ROE"
                    value={roeFilter}
                    onChange={setRoeFilter}
                    activeClass="bg-blue-500/15 border-blue-500/40 text-blue-300"
                    options={[
                        { label: "Any", value: "any" },
                        { label: "> 10%", value: "gt10" },
                        { label: "> 15%", value: "gt15" },
                        { label: "> 20%", value: "gt20" },
                    ]}
                />
                <FilterPills<DebtFilter>
                    label="Debt/Equity"
                    value={debtFilter}
                    onChange={setDebtFilter}
                    activeClass="bg-amber-500/15 border-amber-500/40 text-amber-300"
                    options={[
                        { label: "Any", value: "any" },
                        { label: "Low (< 1×)", value: "low" },
                        { label: "Very Low (< 0.5×)", value: "vlow" },
                    ]}
                />
                <FilterPills<CategoryFilter>
                    label="Category"
                    value={catFilter}
                    onChange={setCatFilter}
                    activeClass="bg-violet-500/15 border-violet-500/40 text-violet-300"
                    options={[
                        { label: "All", value: "all" },
                        { label: "Deep Value", value: "Deep Value" },
                        { label: "Value", value: "Value" },
                    ]}
                />
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <p className="text-red-300 text-sm">{error}</p>
                    <button onClick={fetchData} className="ml-auto text-xs text-red-400 hover:text-red-200 underline cursor-pointer">
                        Retry
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                {/* Table header row */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                    <div className="flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium text-zinc-200">
                            {displayed.length} stocks
                        </span>
                        {lastUpdated && !loading && (
                            <span className="text-xs text-zinc-500">
                                · updated {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 border border-neutral-700 text-zinc-300 text-xs rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                        {loading ? "Loading..." : "Refresh"}
                    </button>
                </div>

                {loading ? (
                    <div className="py-16 text-center">
                        <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin mx-auto mb-3" />
                        <p className="text-zinc-400 text-sm">Scanning fundamentals across 75 NSE stocks…</p>
                        <p className="text-zinc-600 text-xs mt-1">This may take 30–60 seconds</p>
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="py-16 text-center">
                        <Gem className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                        <p className="text-zinc-400 text-sm">No stocks match the current filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-800">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 w-8">#</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-zinc-400">Stock</th>
                                    <SortTh label="P/E" sortKey="pe" current={sortKey} asc={sortAsc} onSort={handleSort} />
                                    <SortTh label="P/B" sortKey="priceToBook" current={sortKey} asc={sortAsc} onSort={handleSort} className="hidden sm:table-cell" />
                                    <SortTh label="ROE" sortKey="roe" current={sortKey} asc={sortAsc} onSort={handleSort} />
                                    <SortTh label="D/E" sortKey="debtToEquity" current={sortKey} asc={sortAsc} onSort={handleSort} className="hidden md:table-cell" />
                                    <SortTh label="Op.Margin" sortKey="operatingMargin" current={sortKey} asc={sortAsc} onSort={handleSort} className="hidden lg:table-cell" />
                                    <SortTh label="FCF Yield" sortKey="fcfYield" current={sortKey} asc={sortAsc} onSort={handleSort} className="hidden lg:table-cell" />
                                    <SortTh label="Analyst ↑" sortKey="analystUpside" current={sortKey} asc={sortAsc} onSort={handleSort} className="hidden md:table-cell" />
                                    <SortTh label="Score" sortKey="valueScore" current={sortKey} asc={sortAsc} onSort={handleSort} />
                                    <th className="px-3 py-3 text-center text-xs font-medium text-zinc-400">AI</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {displayed.map((s, idx) => (
                                    <tr
                                        key={s.symbol}
                                        className="hover:bg-neutral-800/40 transition-colors"
                                    >
                                        {/* # */}
                                        <td className="px-4 py-3 text-xs text-zinc-500 tabular-nums">{idx + 1}</td>

                                        {/* Stock */}
                                        <td className="px-3 py-3 min-w-[140px]">
                                            <div className="flex items-start gap-2">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-zinc-100 text-sm">{s.symbol}</span>
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${scoreBg(s.valueLabel)}`}>
                                                            {s.valueLabel}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-zinc-500 truncate max-w-[130px]">{s.name}</div>
                                                    <div className="text-[10px] text-zinc-600">{s.sector}</div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-xs font-medium text-zinc-300">₹{s.price.toLocaleString()}</span>
                                                        <span className={`text-[10px] font-medium flex items-center gap-0.5 ${s.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                            {s.changePercent >= 0
                                                                ? <TrendingUp className="w-3 h-3" />
                                                                : <TrendingDown className="w-3 h-3" />}
                                                            {fmtPct(s.changePercent)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* P/E */}
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            <span className={`text-sm font-medium ${s.pe != null && s.pe < 15 ? "text-emerald-400" : s.pe != null && s.pe < 25 ? "text-zinc-200" : "text-zinc-400"}`}>
                                                {fmt(s.pe)}
                                            </span>
                                        </td>

                                        {/* P/B */}
                                        <td className="px-3 py-3 text-right tabular-nums hidden sm:table-cell">
                                            <span className={`text-sm ${s.priceToBook != null && s.priceToBook < 2 ? "text-emerald-400" : "text-zinc-300"}`}>
                                                {fmt(s.priceToBook)}
                                            </span>
                                        </td>

                                        {/* ROE */}
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            <span className={`text-sm font-medium ${s.roe != null && s.roe * 100 >= 20 ? "text-emerald-400" : s.roe != null && s.roe * 100 >= 12 ? "text-blue-400" : "text-zinc-400"}`}>
                                                {s.roe != null ? `${(s.roe * 100).toFixed(1)}%` : "—"}
                                            </span>
                                        </td>

                                        {/* D/E */}
                                        <td className="px-3 py-3 text-right tabular-nums hidden md:table-cell">
                                            <span className={`text-sm ${s.debtToEquity != null && s.debtToEquity < 0.5 ? "text-emerald-400" : s.debtToEquity != null && s.debtToEquity < 1 ? "text-zinc-300" : "text-amber-400"}`}>
                                                {fmt(s.debtToEquity, 2)}
                                            </span>
                                        </td>

                                        {/* Op. Margin */}
                                        <td className="px-3 py-3 text-right tabular-nums hidden lg:table-cell">
                                            <span className="text-sm text-zinc-300">
                                                {s.operatingMargin != null ? `${(s.operatingMargin * 100).toFixed(1)}%` : "—"}
                                            </span>
                                        </td>

                                        {/* FCF Yield */}
                                        <td className="px-3 py-3 text-right tabular-nums hidden lg:table-cell">
                                            <span className={`text-sm ${s.fcfYield != null && s.fcfYield * 100 >= 3 ? "text-emerald-400" : "text-zinc-300"}`}>
                                                {s.fcfYield != null ? `${(s.fcfYield * 100).toFixed(1)}%` : "—"}
                                            </span>
                                        </td>

                                        {/* Analyst Upside */}
                                        <td className="px-3 py-3 text-right tabular-nums hidden md:table-cell">
                                            {s.analystUpside != null ? (
                                                <div>
                                                    <span className={`text-sm font-medium ${s.analystUpside >= 20 ? "text-emerald-400" : s.analystUpside >= 0 ? "text-zinc-300" : "text-red-400"}`}>
                                                        {fmtPct(s.analystUpside)}
                                                    </span>
                                                    {s.numberOfAnalysts != null && (
                                                        <div className="text-[10px] text-zinc-600">{s.numberOfAnalysts} analysts</div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-zinc-500">—</span>
                                            )}
                                        </td>

                                        {/* Score */}
                                        <td className="px-3 py-3 text-right">
                                            <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold border ${scoreBg(s.valueLabel)}`}>
                                                {s.valueScore}
                                            </span>
                                        </td>

                                        {/* AI Button */}
                                        <td className="px-3 py-3 text-center">
                                            <button
                                                onClick={() => onAnalyze(s.symbol)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-neutral-800 hover:bg-zinc-700 border border-neutral-700 text-zinc-300 text-xs rounded-lg transition-colors cursor-pointer"
                                                title="Analyze with AI"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                <span className="hidden sm:inline">AI</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Deep Value: score ≥ 60 — deeply undervalued with strong fundamentals
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    Value: score 40–59 — reasonably priced quality business
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
                    Fair Value: score 20–39 — fairly priced
                </div>
            </div>
        </div>
    );
}
