"use client";

import { useState, useEffect, useCallback } from "react";
import { cachedGet, bustCache } from "@/lib/clientCache";
import {
    RefreshCw,
    Search,
    BarChart3,
    ChevronUp,
    ChevronDown,
    Zap,
    Flame,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StockMomentum {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    oneMonthReturn: number;
    threeMonthReturn: number;
    pctBelowOneMonthHigh: number;
    oneMonthHigh: number;
    pctBelow52WkHigh: number | null;
    ema50: number;
    ema50Pct: number;
    ema200: number | null;
    ema200Pct: number | null;
    volume: number;
    avgVolume: number;
    volRatio: number;
    marketCap: number | null;
    pe: number | null;
    momentumScore: number;
    aboveEma200: boolean;
    highVolumeDay: boolean;
    isBreakout: boolean;
}

interface BreakoutStock {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    oneWeekReturn: number;
    oneMonthReturn: number;
    threeMonthReturn: number;
    pctBelow52WkHigh: number;
    fiftyTwoWeekHigh: number;
    ema50Pct: number;
    ema200Pct: number | null;
    volRatio: number;
    volume: number;
    avgVolume: number;
    marketCap: number | null;
    rsi14: number | null;
    breakoutScore: number;
    signals: string[];
}

type ScreenerTab = "momentum" | "breakouts";

type MomentumSortKey =
    | "momentumScore"
    | "threeMonthReturn"
    | "oneMonthReturn"
    | "pctBelowOneMonthHigh"
    | "changePercent"
    | "ema50Pct"
    | "ema200Pct"
    | "volRatio";

type BreakoutSortKey =
    | "breakoutScore"
    | "volRatio"
    | "oneWeekReturn"
    | "oneMonthReturn"
    | "changePercent"
    | "pctBelow52WkHigh"
    | "rsi14";

// Breakout filter types
type VolFilter    = "all" | "1.5" | "2" | "3";
type ReturnFilter = "all" | "5"   | "8" | "15";

// Momentum filter types
type ThreeMonthFilter = "all" | "15" | "25";

interface Props {
    onAnalyze: (symbol: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtPct(v: number | null, showPlus = true) {
    if (v == null) return "—";
    return `${showPlus && v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}
function fmtPrice(v: number) {
    return v >= 1000 ? `₹${(v / 1000).toFixed(2)}K` : `₹${v.toFixed(2)}`;
}
function pctColor(v: number | null) {
    if (v == null) return "text-stone-400";
    if (v > 0) return "text-emerald-600";
    if (v < 0) return "text-red-600";
    return "text-stone-500";
}
function scoreColor(s: number) {
    if (s >= 18) return { text: "text-emerald-700", bg: "bg-emerald-100 border-emerald-300" };
    if (s >= 10) return { text: "text-blue-700", bg: "bg-blue-100 border-blue-300" };
    return { text: "text-stone-600", bg: "bg-stone-100 border-stone-300" };
}
function bScoreColor(s: number) {
    if (s >= 30) return { text: "text-orange-700", bg: "bg-orange-100 border-orange-300" };
    if (s >= 18) return { text: "text-amber-700", bg: "bg-amber-100 border-amber-300" };
    return { text: "text-stone-600", bg: "bg-stone-100 border-stone-300" };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function MomentumScreener({ onAnalyze }: Props) {
    const [stocks, setStocks]       = useState<StockMomentum[]>([]);
    const [breakouts, setBreakouts] = useState<BreakoutStock[]>([]);
    const [loading, setLoading]     = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [error, setError]         = useState<string | null>(null);

    // Tab
    const [activeTab, setActiveTab] = useState<ScreenerTab>("momentum");

    // Shared
    const [search, setSearch] = useState("");

    // Momentum sort + filters
    const [mSortKey, setMSortKey] = useState<MomentumSortKey>("momentumScore");
    const [mSortAsc, setMSortAsc] = useState(false);
    const [filterEma200, setFilterEma200]   = useState(false);
    const [filterHighVol, setFilterHighVol] = useState(false);
    const [filter3M, setFilter3M]           = useState<ThreeMonthFilter>("all");

    // Breakout sort + filters
    const [bSortKey, setBSortKey] = useState<BreakoutSortKey>("breakoutScore");
    const [bSortAsc, setBSortAsc] = useState(false);
    const [bVolFilter, setBVolFilter]       = useState<VolFilter>("all");
    const [bReturnFilter, setBReturnFilter] = useState<ReturnFilter>("all");

    const fetchData = useCallback(async (force = false) => {
        setLoading(true);
        setError(null);
        try {
            const url = `/api/momentum${force ? "?refresh=true" : ""}`;
            if (force) bustCache("/api/momentum");
            const data = await cachedGet<{ stocks: StockMomentum[]; breakouts: BreakoutStock[]; lastUpdated: string | null }>(url, 15 * 60 * 1000);
            setStocks(data.stocks ?? []);
            setBreakouts(data.breakouts ?? []);
            setLastUpdated(data.lastUpdated ?? null);
        } catch {
            setError("Failed to load data. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Sort handlers ──────────────────────────────────────────────────────────
    const handleMSort = (key: MomentumSortKey) => {
        if (mSortKey === key) setMSortAsc((v) => !v);
        else { setMSortKey(key); setMSortAsc(false); }
    };
    const handleBSort = (key: BreakoutSortKey) => {
        if (bSortKey === key) setBSortAsc((v) => !v);
        else { setBSortKey(key); setBSortAsc(false); }
    };

    // ── Filtered + sorted momentum ─────────────────────────────────────────────
    const displayed = stocks
        .filter((s) => !filterEma200 || s.aboveEma200)
        .filter((s) => !filterHighVol || s.volRatio >= 1.5)
        .filter((s) => filter3M === "all" || s.threeMonthReturn >= parseFloat(filter3M))
        .filter((s) => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
        })
        .slice()
        .sort((a, b) => {
            const av = (a[mSortKey] as number | null) ?? -Infinity;
            const bv = (b[mSortKey] as number | null) ?? -Infinity;
            const invert = mSortKey === "pctBelowOneMonthHigh";
            return mSortAsc ? (av - bv) * (invert ? -1 : 1) : (bv - av) * (invert ? -1 : 1);
        });

    // ── Filtered + sorted breakouts ────────────────────────────────────────────
    const displayedBreakouts = breakouts
        .filter((s) => bVolFilter === "all"    || s.volRatio >= parseFloat(bVolFilter))
        .filter((s) => bReturnFilter === "all" || s.oneMonthReturn >= parseFloat(bReturnFilter))
        .filter((s) => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
        })
        .slice()
        .sort((a, b) => {
            const av = (a[bSortKey] as number | null) ?? -Infinity;
            const bv = (b[bSortKey] as number | null) ?? -Infinity;
            const invert = bSortKey === "pctBelow52WkHigh";
            return bSortAsc ? (av - bv) * (invert ? -1 : 1) : (bv - av) * (invert ? -1 : 1);
        });

    // Quick stats
    const avgReturn = stocks.length
        ? stocks.reduce((s, x) => s + x.threeMonthReturn, 0) / stocks.length : 0;

    // ── Sort header components ─────────────────────────────────────────────────
    const MSortTh = ({
        label, k, right, hint, className,
    }: { label: string; k: MomentumSortKey; right?: boolean; hint?: string; className?: string }) => (
        <th
            onClick={() => handleMSort(k)}
            title={hint}
            className={`px-2 sm:px-3 py-2.5 text-[10px] sm:text-xs font-semibold text-stone-500 cursor-pointer hover:text-stone-800 select-none transition-colors whitespace-nowrap ${right ? "text-right" : "text-left"} ${className ?? ""}`}
        >
            <span className={`inline-flex items-center gap-0.5 ${right ? "flex-row-reverse" : ""}`}>
                {label}
                {mSortKey === k
                    ? mSortAsc ? <ChevronUp className="w-2.5 h-2.5 text-blue-600" /> : <ChevronDown className="w-2.5 h-2.5 text-blue-600" />
                    : null}
            </span>
        </th>
    );

    const BSortTh = ({
        label, k, right, hint, className,
    }: { label: string; k: BreakoutSortKey; right?: boolean; hint?: string; className?: string }) => (
        <th
            onClick={() => handleBSort(k)}
            title={hint}
            className={`px-2 sm:px-3 py-2.5 text-[10px] sm:text-xs font-semibold text-stone-500 cursor-pointer hover:text-stone-800 select-none transition-colors whitespace-nowrap ${right ? "text-right" : "text-left"} ${className ?? ""}`}
        >
            <span className={`inline-flex items-center gap-0.5 ${right ? "flex-row-reverse" : ""}`}>
                {label}
                {bSortKey === k
                    ? bSortAsc ? <ChevronUp className="w-2.5 h-2.5 text-orange-600" /> : <ChevronDown className="w-2.5 h-2.5 text-orange-600" />
                    : null}
            </span>
        </th>
    );

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* ── Top controls (shared) ──────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search symbol or company…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-300 text-stone-800 placeholder-stone-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-400/40 focus:border-stone-400 transition-all shadow-sm"
                    />
                </div>

                <div className="sm:ml-auto flex items-center gap-3">
                    {lastUpdated && (
                        <span className="text-xs text-stone-400 whitespace-nowrap hidden sm:block">
                            Updated {new Date(lastUpdated).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                    )}
                    <button
                        onClick={() => fetchData(true)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-600 rounded-xl text-sm font-medium transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap shadow-sm"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        {loading ? "Loading…" : "Refresh"}
                    </button>
                </div>
            </div>

            {/* ── Error ──────────────────────────────────────────────────── */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* ── Stats bar - compact ──────────────────────────────────── */}
            {!loading && (stocks.length > 0 || breakouts.length > 0) && (
                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                    <span className="text-blue-600 font-medium">{stocks.length} momentum</span>
                    <span className="text-stone-300">•</span>
                    <span className="text-emerald-600">avg +{avgReturn.toFixed(1)}%</span>
                    <span className="text-stone-300">•</span>
                    <span className="text-orange-600 font-medium">{breakouts.length} breakouts</span>
                </div>
            )}

            {/* ── Loading skeleton ───────────────────────────────────────── */}
            {loading && stocks.length === 0 && (
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
                            Fetching quotes + 3-month charts… ~5 seconds
                        </p>
                    </div>
                </div>
            )}

            {/* ── Tab switcher ───────────────────────────────────────────── */}
            {!loading && (stocks.length > 0 || breakouts.length > 0) && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                        onClick={() => setActiveTab("momentum")}
                        className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                            activeTab === "momentum"
                                ? "bg-blue-50 border-blue-300 text-blue-700"
                                : "bg-white border-stone-200 text-stone-500 hover:text-stone-700 hover:border-stone-300"
                        }`}
                    >
                        <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="hidden sm:inline">Momentum</span>
                        <span className="sm:hidden">Mom</span>
                        <span className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full font-semibold ${
                            activeTab === "momentum" ? "bg-blue-100 text-blue-700" : "bg-stone-100 text-stone-500"
                        }`}>
                            {displayed.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab("breakouts")}
                        className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                            activeTab === "breakouts"
                                ? "bg-orange-50 border-orange-300 text-orange-700"
                                : "bg-white border-stone-200 text-stone-500 hover:text-stone-700 hover:border-stone-300"
                        }`}
                    >
                        <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="hidden sm:inline">Early Breakouts</span>
                        <span className="sm:hidden">Breakouts</span>
                        <span className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full font-semibold ${
                            activeTab === "breakouts" ? "bg-orange-100 text-orange-700" : "bg-stone-100 text-stone-500"
                        }`}>
                            {displayedBreakouts.length}
                        </span>
                    </button>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                MOMENTUM TAB
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "momentum" && !loading && (
                <div className="space-y-4">
                    {/* Momentum filters - compact */}
                    {stocks.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => setFilterEma200((v) => !v)}
                                className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium transition-all cursor-pointer ${
                                    filterEma200
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-white border border-stone-200 text-stone-500 hover:text-stone-700"
                                }`}
                            >
                                EMA200↑
                            </button>
                            <button
                                onClick={() => setFilterHighVol((v) => !v)}
                                className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium transition-all cursor-pointer ${
                                    filterHighVol
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-white border border-stone-200 text-stone-500 hover:text-stone-700"
                                }`}
                            >
                                Vol≥1.5×
                            </button>
                            <span className="text-stone-300 text-[10px]">|</span>
                            {[
                                { label: "3M≥10%", value: "all" as ThreeMonthFilter },
                                { label: "≥15%", value: "15" as ThreeMonthFilter },
                                { label: "≥25%", value: "25" as ThreeMonthFilter },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setFilter3M(opt.value)}
                                    className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium transition-all cursor-pointer ${
                                        filter3M === opt.value
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-white border border-stone-200 text-stone-500 hover:text-stone-700"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Momentum table */}
                    {displayed.length > 0 ? (
                        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs sm:text-sm">
                                    <thead>
                                        <tr className="bg-stone-50 border-b border-stone-200">
                                            <th className="sticky left-0 z-10 bg-stone-50 px-2 sm:px-3 py-2.5 text-left text-[10px] sm:text-xs font-semibold text-stone-500 min-w-[100px] sm:min-w-[130px]">Stock</th>
                                            <th className="px-2 sm:px-3 py-2.5 text-right text-[10px] sm:text-xs font-semibold text-stone-500 whitespace-nowrap">Price</th>
                                            <MSortTh label="Day" k="changePercent" right hint="1-day change" />
                                            <MSortTh label="3M" k="threeMonthReturn" right hint="3-month return" />
                                            <MSortTh label="1M" k="oneMonthReturn" right hint="1-month return" />
                                            <MSortTh label="vs High" k="pctBelowOneMonthHigh" right hint="% below 1M high" />
                                            <MSortTh label="Vol×" k="volRatio" right hint="Volume ratio" />
                                            <MSortTh label="Score" k="momentumScore" right hint="Momentum score" />
                                            <th className="px-2 sm:px-3 py-2.5 text-center text-[10px] sm:text-xs font-semibold text-stone-500">AI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {displayed.map((s) => {
                                            const sc = scoreColor(s.momentumScore);
                                            return (
                                                <tr key={s.symbol} className="hover:bg-stone-50 transition-colors">
                                                    <td className="sticky left-0 z-10 bg-white px-2 sm:px-3 py-2.5">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-stone-800 text-xs sm:text-sm">{s.symbol}</span>
                                                            <span className="text-[10px] text-stone-400 truncate max-w-[90px] sm:max-w-[120px]">{s.name}</span>
                                                            {(s.isBreakout || s.aboveEma200) && (
                                                                <div className="flex gap-0.5 mt-0.5">
                                                                    {s.isBreakout && <span className="text-[8px] px-1 py-0.5 bg-orange-100 text-orange-700 rounded">BO</span>}
                                                                    {s.aboveEma200 && <span className="text-[8px] px-1 py-0.5 bg-emerald-100 text-emerald-700 rounded">200↑</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5 text-right">
                                                        <span className="font-mono text-stone-700 text-[11px] sm:text-sm">{fmtPrice(s.price)}</span>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5 text-right">
                                                        <span className={`font-mono text-[11px] sm:text-sm ${pctColor(s.changePercent)}`}>
                                                            {fmtPct(s.changePercent)}
                                                        </span>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5 text-right">
                                                        <span className={`font-mono font-medium text-[11px] sm:text-sm ${pctColor(s.threeMonthReturn)}`}>
                                                            {fmtPct(s.threeMonthReturn)}
                                                        </span>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5 text-right">
                                                        <span className={`font-mono text-[11px] sm:text-sm ${pctColor(s.oneMonthReturn)}`}>
                                                            {fmtPct(s.oneMonthReturn)}
                                                        </span>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5 text-right">
                                                        <span className={`font-mono text-[11px] sm:text-sm ${
                                                            s.pctBelowOneMonthHigh <= 3 ? "text-emerald-600" : "text-stone-500"
                                                        }`}>
                                                            -{s.pctBelowOneMonthHigh.toFixed(1)}%
                                                        </span>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5 text-right">
                                                        <span className={`font-mono text-[11px] sm:text-sm ${
                                                            s.volRatio >= 2 ? "text-amber-600" : "text-stone-500"
                                                        }`}>
                                                            {s.volRatio.toFixed(1)}×
                                                        </span>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5 text-right">
                                                        <span className={`inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 rounded border text-[10px] sm:text-xs font-bold ${sc.text} ${sc.bg}`}>
                                                            {s.momentumScore.toFixed(1)}
                                                        </span>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5 text-center">
                                                        <button
                                                            onClick={() => onAnalyze(s.symbol)}
                                                            className="p-1.5 bg-stone-100 hover:bg-blue-600 border border-stone-200 hover:border-blue-500 text-stone-500 hover:text-white rounded transition-all cursor-pointer"
                                                            title={`AI analysis of ${s.symbol}`}
                                                        >
                                                            <BarChart3 className="w-3 h-3" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-3 py-2 border-t border-stone-200 text-[10px] sm:text-xs text-stone-400">
                                {displayed.length} of {stocks.length} stocks
                            </div>
                        </div>
                    ) : (
                        stocks.length > 0 && (
                            <div className="bg-white border border-stone-200 rounded-2xl px-6 py-12 text-center shadow-sm">
                                <p className="text-stone-500 mb-1">No stocks match the active filters.</p>
                                <p className="text-stone-400 text-sm">Try relaxing the filters above.</p>
                            </div>
                        )
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                BREAKOUTS TAB
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "breakouts" && !loading && (
                <div className="space-y-4">
                    {/* Breakout filters - compact */}
                    {breakouts.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] text-stone-400">Vol:</span>
                            {[
                                { label: "Any", value: "all" as VolFilter },
                                { label: "≥2×", value: "2" as VolFilter },
                                { label: "≥3×", value: "3" as VolFilter },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setBVolFilter(opt.value)}
                                    className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium transition-all cursor-pointer ${
                                        bVolFilter === opt.value
                                            ? "bg-orange-100 text-orange-700"
                                            : "bg-white border border-stone-200 text-stone-500 hover:text-stone-700"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                            <span className="text-stone-300 text-[10px]">|</span>
                            <span className="text-[10px] text-stone-400">1M:</span>
                            {[
                                { label: "Any", value: "all" as ReturnFilter },
                                { label: "≥8%", value: "8" as ReturnFilter },
                                { label: "≥15%", value: "15" as ReturnFilter },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setBReturnFilter(opt.value)}
                                    className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium transition-all cursor-pointer ${
                                        bReturnFilter === opt.value
                                            ? "bg-orange-100 text-orange-700"
                                            : "bg-white border border-stone-200 text-stone-500 hover:text-stone-700"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Breakouts table */}
                    {displayedBreakouts.length > 0 ? (
                        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs sm:text-sm">
                                    <thead>
                                        <tr className="bg-stone-50 border-b border-stone-200">
                                            <th className="sticky left-0 z-10 bg-stone-50 px-2 sm:px-3 py-2.5 text-left text-[10px] sm:text-xs font-semibold text-stone-500 min-w-[100px] sm:min-w-[130px]">Stock</th>
                                            <th className="px-2 sm:px-3 py-2.5 text-left text-[10px] sm:text-xs font-semibold text-stone-500">Signals</th>
                                            <th className="px-2 sm:px-3 py-2.5 text-right text-[10px] sm:text-xs font-semibold text-stone-500">Price</th>
                                            <BSortTh label="Day" k="changePercent" right hint="1-day change" />
                                            <BSortTh label="1W" k="oneWeekReturn" right hint="1-week return" />
                                            <BSortTh label="1M" k="oneMonthReturn" right hint="1-month return" />
                                            <BSortTh label="vs 52W" k="pctBelow52WkHigh" right hint="% below 52W high" />
                                            <BSortTh label="Vol×" k="volRatio" right hint="Volume ratio" />
                                            <BSortTh label="Score" k="breakoutScore" right hint="Breakout score" />
                                            <th className="px-2 sm:px-3 py-2.5 text-center text-[10px] sm:text-xs font-semibold text-stone-500">AI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {displayedBreakouts.map((s) => {
                                            const sc = bScoreColor(s.breakoutScore);
                                            return (
                                                <tr key={s.symbol} className="hover:bg-stone-50 transition-colors">
                                                    <td className="sticky left-0 z-10 bg-white px-2 sm:px-3 py-2.5">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-stone-800 text-xs sm:text-sm">{s.symbol}</span>
                                                            <span className="text-[10px] text-stone-400 truncate max-w-[90px] sm:max-w-[120px]">{s.name}</span>
                                                        </div>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5">
                                                        <div className="flex flex-wrap gap-0.5 max-w-[120px] sm:max-w-[160px]">
                                                            {s.signals.slice(0, 3).map((sig) => (
                                                                <span
                                                                    key={sig}
                                                                    className="text-[8px] sm:text-[10px] px-1 py-0.5 bg-orange-100 text-orange-700 rounded font-medium whitespace-nowrap"
                                                                >
                                                                    {sig}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5 text-right">
                                                        <span className="font-mono text-stone-700 text-[11px] sm:text-sm">{fmtPrice(s.price)}</span>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5 text-right">
                                                        <span className={`font-mono text-[11px] sm:text-sm ${pctColor(s.changePercent)}`}>
                                                            {fmtPct(s.changePercent)}
                                                        </span>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5 text-right">
                                                        <span className={`font-mono text-[11px] sm:text-sm ${pctColor(s.oneWeekReturn)}`}>
                                                            {fmtPct(s.oneWeekReturn)}
                                                        </span>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5 text-right">
                                                        <span className={`font-mono text-[11px] sm:text-sm ${pctColor(s.oneMonthReturn)}`}>
                                                            {fmtPct(s.oneMonthReturn)}
                                                        </span>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5 text-right">
                                                        <span className={`font-mono text-[11px] sm:text-sm ${
                                                            s.pctBelow52WkHigh <= 3 ? "text-emerald-600" : "text-stone-500"
                                                        }`}>
                                                            {s.pctBelow52WkHigh <= 0 ? "ATH" : `-${s.pctBelow52WkHigh.toFixed(1)}%`}
                                                        </span>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5 text-right">
                                                        <span className={`font-mono text-[11px] sm:text-sm ${
                                                            s.volRatio >= 2 ? "text-amber-600" : "text-stone-500"
                                                        }`}>
                                                            {s.volRatio.toFixed(1)}×
                                                        </span>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5 text-right">
                                                        <span className={`inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 rounded border text-[10px] sm:text-xs font-bold ${sc.text} ${sc.bg}`}>
                                                            {s.breakoutScore.toFixed(1)}
                                                        </span>
                                                    </td>

                                                    <td className="px-2 sm:px-3 py-2.5 text-center">
                                                        <button
                                                            onClick={() => onAnalyze(s.symbol)}
                                                            className="p-1.5 bg-stone-100 hover:bg-orange-600 border border-stone-200 hover:border-orange-500 text-stone-500 hover:text-white rounded transition-all cursor-pointer"
                                                            title={`AI analysis of ${s.symbol}`}
                                                        >
                                                            <BarChart3 className="w-3 h-3" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-3 py-2 border-t border-stone-200 text-[10px] sm:text-xs text-stone-400">
                                {displayedBreakouts.length} of {breakouts.length} breakouts
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-stone-200 rounded-2xl px-6 py-12 text-center shadow-sm">
                            <Flame className="w-8 h-8 text-stone-300 mx-auto mb-3" />
                            <p className="text-stone-500 mb-1">
                                {breakouts.length === 0
                                    ? "No early breakouts detected right now."
                                    : "No breakouts match the active filters."}
                            </p>
                            <p className="text-stone-400 text-sm">
                                {breakouts.length === 0
                                    ? "Signals: Vol≥2× · 1M≥8% · near 52W high · RSI 58–78 · Day≥2.5% (need ≥2)"
                                    : "Try relaxing the filters above."}
                            </p>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
