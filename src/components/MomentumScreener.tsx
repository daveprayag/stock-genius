"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Minus,
    Search,
    BarChart3,
    ChevronUp,
    ChevronDown,
    ArrowUpDown,
    CheckCircle2,
    Info,
    Zap,
    Flame,
    SlidersHorizontal,
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
    | "oneMonthReturn"
    | "changePercent"
    | "pctBelow52WkHigh"
    | "rsi14";

// Breakout filter types
type VolFilter    = "all" | "1.5" | "2" | "3";
type ReturnFilter = "all" | "5"   | "8" | "15";
type HighFilter   = "all" | "10"  | "5" | "2";
type RsiFilter    = "all" | "50-65" | "65-78";

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
function fmtCap(v: number | null) {
    if (v == null) return "—";
    if (v >= 1e12) return `₹${(v / 1e12).toFixed(1)}T`;
    if (v >= 1e9)  return `₹${(v / 1e9).toFixed(0)}B`;
    return `₹${(v / 1e6).toFixed(0)}M`;
}
function fmtVol(v: number) {
    if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
    if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
    return v.toLocaleString("en-IN");
}
function pctColor(v: number | null) {
    if (v == null) return "text-zinc-500";
    if (v > 0) return "text-emerald-400";
    if (v < 0) return "text-red-400";
    return "text-zinc-400";
}
function scoreColor(s: number) {
    if (s >= 18) return { text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" };
    if (s >= 10) return { text: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/30" };
    return          { text: "text-zinc-400",    bg: "bg-zinc-500/10 border-zinc-500/20" };
}
function bScoreColor(s: number) {
    if (s >= 30) return { text: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" };
    if (s >= 18) return { text: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" };
    return          { text: "text-zinc-400",    bg: "bg-zinc-500/10 border-zinc-500/20" };
}
function rsiColor(v: number | null) {
    if (v == null) return "text-zinc-500";
    if (v >= 78)   return "text-red-400";
    if (v >= 65)   return "text-emerald-400";
    if (v >= 50)   return "text-blue-400";
    return "text-zinc-500";
}

// ─── FilterPills ──────────────────────────────────────────────────────────────
function FilterPills<T extends string>({
    label,
    options,
    value,
    onChange,
    activeClass = "bg-blue-500/15 text-blue-400 border-blue-500/40",
}: {
    label: string;
    options: { label: string; value: T }[];
    value: T;
    onChange: (v: T) => void;
    activeClass?: string;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500 whitespace-nowrap">{label}</span>
            <div className="flex flex-wrap gap-1">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            value === opt.value
                                ? activeClass
                                : "bg-neutral-800 text-zinc-500 border-neutral-700 hover:text-zinc-300 hover:border-neutral-600"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
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
    const [bHighFilter, setBHighFilter]     = useState<HighFilter>("all");
    const [bRsiFilter, setBRsiFilter]       = useState<RsiFilter>("all");

    const fetchData = useCallback(async (force = false) => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`/api/momentum${force ? "?refresh=true" : ""}`);
            setStocks(res.data.stocks ?? []);
            setBreakouts(res.data.breakouts ?? []);
            setLastUpdated(res.data.lastUpdated ?? null);
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
        .filter((s) => bHighFilter === "all"   || s.pctBelow52WkHigh <= parseFloat(bHighFilter))
        .filter((s) => {
            if (bRsiFilter === "all") return true;
            if (s.rsi14 == null) return false;
            const [lo, hi] = bRsiFilter.split("-").map(Number);
            return s.rsi14 >= lo && s.rsi14 <= hi;
        })
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
    const aboveEma200Count = stocks.filter((s) => s.aboveEma200).length;

    // ── Sort header components ─────────────────────────────────────────────────
    const MSortTh = ({
        label, k, right, hint, className,
    }: { label: string; k: MomentumSortKey; right?: boolean; hint?: string; className?: string }) => (
        <th
            onClick={() => handleMSort(k)}
            title={hint}
            className={`px-4 py-3.5 text-xs font-semibold text-zinc-400 cursor-pointer hover:text-zinc-100 select-none transition-colors whitespace-nowrap ${right ? "text-right" : "text-left"} ${className ?? ""}`}
        >
            <span className={`inline-flex items-center gap-1.5 ${right ? "flex-row-reverse" : ""}`}>
                {label}
                {mSortKey === k
                    ? mSortAsc ? <ChevronUp className="w-3 h-3 text-blue-400" /> : <ChevronDown className="w-3 h-3 text-blue-400" />
                    : <ArrowUpDown className="w-3 h-3 text-zinc-600" />}
            </span>
        </th>
    );

    const BSortTh = ({
        label, k, right, hint, className,
    }: { label: string; k: BreakoutSortKey; right?: boolean; hint?: string; className?: string }) => (
        <th
            onClick={() => handleBSort(k)}
            title={hint}
            className={`px-4 py-3.5 text-xs font-semibold text-zinc-400 cursor-pointer hover:text-zinc-100 select-none transition-colors whitespace-nowrap ${right ? "text-right" : "text-left"} ${className ?? ""}`}
        >
            <span className={`inline-flex items-center gap-1.5 ${right ? "flex-row-reverse" : ""}`}>
                {label}
                {bSortKey === k
                    ? bSortAsc ? <ChevronUp className="w-3 h-3 text-orange-400" /> : <ChevronDown className="w-3 h-3 text-orange-400" />
                    : <ArrowUpDown className="w-3 h-3 text-zinc-600" />}
            </span>
        </th>
    );

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* ── Top controls (shared) ──────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search symbol or company…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 text-zinc-100 placeholder-zinc-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all"
                    />
                </div>

                <div className="sm:ml-auto flex items-center gap-3">
                    {lastUpdated && (
                        <span className="text-xs text-zinc-500 whitespace-nowrap hidden sm:block">
                            Updated {new Date(lastUpdated).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                    )}
                    <button
                        onClick={() => fetchData(true)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 text-zinc-300 rounded-xl text-sm font-medium transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        {loading ? "Loading…" : "Refresh"}
                    </button>
                </div>
            </div>

            {/* ── Error ──────────────────────────────────────────────────── */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3.5 text-red-300 text-sm">
                    {error}
                </div>
            )}

            {/* ── Stats bar ──────────────────────────────────────────────── */}
            {!loading && (stocks.length > 0 || breakouts.length > 0) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Momentum stocks", value: stocks.length.toString(), accent: "text-blue-400" },
                        { label: "Avg 3M return",   value: stocks.length ? `+${avgReturn.toFixed(1)}%` : "—", accent: "text-emerald-400" },
                        { label: "Above EMA 200",   value: `${aboveEma200Count} / ${stocks.length}`, accent: "text-zinc-300" },
                        { label: "Early breakouts", value: breakouts.length.toString(), accent: "text-orange-400" },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
                            <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
                            <p className={`text-lg font-semibold ${stat.accent}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Loading skeleton ───────────────────────────────────────── */}
            {loading && stocks.length === 0 && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-neutral-800">
                        <div className="flex items-center gap-3 animate-pulse">
                            <div className="w-5 h-5 rounded-full bg-neutral-700" />
                            <div className="w-48 h-4 rounded bg-neutral-700" />
                        </div>
                    </div>
                    <div className="divide-y divide-neutral-800">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                                <div className="w-5 h-4 rounded bg-neutral-800" />
                                <div className="w-28 h-4 rounded bg-neutral-800" />
                                <div className="flex-1 h-4 rounded bg-neutral-800" />
                                <div className="w-16 h-4 rounded bg-neutral-800" />
                                <div className="w-14 h-4 rounded bg-neutral-800" />
                                <div className="w-12 h-4 rounded bg-neutral-800" />
                            </div>
                        ))}
                    </div>
                    <div className="px-6 py-4 border-t border-neutral-800">
                        <p className="text-sm text-zinc-500 text-center">
                            Fetching quotes + 3-month charts… ~5 seconds
                        </p>
                    </div>
                </div>
            )}

            {/* ── Tab switcher ───────────────────────────────────────────── */}
            {!loading && (stocks.length > 0 || breakouts.length > 0) && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab("momentum")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                            activeTab === "momentum"
                                ? "bg-blue-500/15 border-blue-500/40 text-blue-400"
                                : "bg-neutral-900 border-neutral-800 text-zinc-400 hover:text-zinc-200 hover:border-neutral-700"
                        }`}
                    >
                        <Zap className="w-3.5 h-3.5" />
                        Momentum
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                            activeTab === "momentum" ? "bg-blue-500/20 text-blue-300" : "bg-neutral-800 text-zinc-500"
                        }`}>
                            {displayed.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab("breakouts")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                            activeTab === "breakouts"
                                ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                                : "bg-neutral-900 border-neutral-800 text-zinc-400 hover:text-zinc-200 hover:border-neutral-700"
                        }`}
                    >
                        <Flame className="w-3.5 h-3.5" />
                        Early Breakouts
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                            activeTab === "breakouts" ? "bg-orange-500/20 text-orange-300" : "bg-neutral-800 text-zinc-500"
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
                    {/* Momentum filters */}
                    {stocks.length > 0 && (
                        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-3 items-center">
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span className="font-medium text-zinc-400">Filters</span>
                            </div>

                            {/* Toggle filters */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setFilterEma200((v) => !v)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                                        filterEma200
                                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                                            : "bg-neutral-800 border-neutral-700 text-zinc-500 hover:text-zinc-300"
                                    }`}
                                >
                                    {filterEma200 && <CheckCircle2 className="w-3 h-3" />}
                                    Above EMA 200
                                </button>
                                <button
                                    onClick={() => setFilterHighVol((v) => !v)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                                        filterHighVol
                                            ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-400"
                                            : "bg-neutral-800 border-neutral-700 text-zinc-500 hover:text-zinc-300"
                                    }`}
                                >
                                    {filterHighVol && <CheckCircle2 className="w-3 h-3" />}
                                    High Vol ≥1.5×
                                </button>
                            </div>

                            {/* 3M return pill filter */}
                            <FilterPills
                                label="3M Return"
                                value={filter3M}
                                onChange={setFilter3M}
                                options={[
                                    { label: "≥10%", value: "all" },
                                    { label: "≥15%", value: "15" },
                                    { label: "≥25%", value: "25" },
                                ]}
                                activeClass="bg-blue-500/15 text-blue-400 border-blue-500/40"
                            />
                        </div>
                    )}

                    {/* Momentum table */}
                    {displayed.length > 0 ? (
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-neutral-950/70 border-b border-neutral-800">
                                            <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-500 w-10">#</th>
                                            <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-400 min-w-[140px]">Stock</th>
                                            <th className="px-4 py-3.5 text-right text-xs font-semibold text-zinc-400 hidden sm:table-cell">Price</th>
                                            <MSortTh label="Day %" k="changePercent" right hint="1-day price change" className="hidden md:table-cell" />
                                            <MSortTh label="1M / 3M" k="threeMonthReturn" right hint="1-month and 3-month returns" className="hidden sm:table-cell" />
                                            <MSortTh label="vs 1M High" k="pctBelowOneMonthHigh" right hint="% below 1-month intraday high" className="hidden md:table-cell" />
                                            <MSortTh label="vs EMA50" k="ema50Pct" right hint="% above 50-day EMA" className="hidden lg:table-cell" />
                                            <MSortTh label="vs EMA200" k="ema200Pct" right hint="% above/below 200-day EMA" className="hidden lg:table-cell" />
                                            <MSortTh label="Vol ×" k="volRatio" right hint="Today ÷ 3-month avg volume" className="hidden md:table-cell" />
                                            <th className="px-4 py-3.5 text-right text-xs font-semibold text-zinc-400 hidden lg:table-cell">Mkt Cap</th>
                                            <MSortTh label="Score" k="momentumScore" right hint="Composite momentum score" />
                                            <th className="px-4 py-3.5 text-center text-xs font-semibold text-zinc-400">AI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800/60">
                                        {displayed.map((s, i) => {
                                            const sc = scoreColor(s.momentumScore);
                                            return (
                                                <tr key={s.symbol} className="hover:bg-neutral-800/40 transition-colors">
                                                    <td className="px-4 py-4 text-zinc-600 text-sm font-mono">{i + 1}</td>

                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-semibold text-zinc-100 text-sm tracking-wide">{s.symbol}</span>
                                                            <span className="text-xs text-zinc-500 truncate max-w-[150px]">{s.name}</span>
                                                            <div className="flex gap-1 flex-wrap mt-0.5">
                                                                {s.isBreakout && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full font-medium">
                                                                        🔥 Breakout
                                                                    </span>
                                                                )}
                                                                {s.aboveEma200 && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-medium">
                                                                        EMA200 ↑
                                                                    </span>
                                                                )}
                                                                {s.highVolumeDay && !s.isBreakout && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full font-medium">
                                                                        Vol ↑
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4 text-right hidden sm:table-cell">
                                                        <span className="font-mono font-medium text-zinc-100 text-sm">{fmtPrice(s.price)}</span>
                                                    </td>

                                                    <td className="px-4 py-4 text-right hidden md:table-cell">
                                                        <span className={`flex items-center justify-end gap-1 text-sm font-medium ${pctColor(s.changePercent)}`}>
                                                            {s.changePercent > 0.05 ? <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                                                            : s.changePercent < -0.05 ? <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />
                                                            : <Minus className="w-3.5 h-3.5 flex-shrink-0" />}
                                                            {fmtPct(s.changePercent)}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-4 text-right hidden sm:table-cell">
                                                        <div className="flex flex-col items-end gap-0.5">
                                                            <span className={`text-sm font-semibold font-mono ${pctColor(s.threeMonthReturn)}`}>
                                                                {fmtPct(s.threeMonthReturn)}
                                                            </span>
                                                            <span className={`text-[10px] font-mono ${pctColor(s.oneMonthReturn)}`}>
                                                                {fmtPct(s.oneMonthReturn)} 1M
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4 text-right hidden md:table-cell">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className={`text-sm font-mono ${
                                                                s.pctBelowOneMonthHigh <= 3 ? "text-emerald-400 font-semibold"
                                                                : s.pctBelowOneMonthHigh <= 7 ? "text-blue-400"
                                                                : "text-zinc-400"
                                                            }`}>
                                                                -{s.pctBelowOneMonthHigh.toFixed(1)}%
                                                            </span>
                                                            <span className="text-[10px] text-zinc-600 font-mono">peak {fmtPrice(s.oneMonthHigh)}</span>
                                                        </div>
                                                    </td>

                                                    <td className={`px-4 py-4 text-right font-mono text-sm hidden lg:table-cell ${pctColor(s.ema50Pct)}`}>
                                                        {fmtPct(s.ema50Pct)}
                                                    </td>

                                                    <td className={`px-4 py-4 text-right font-mono text-sm hidden lg:table-cell ${pctColor(s.ema200Pct)}`}>
                                                        {s.ema200Pct != null ? fmtPct(s.ema200Pct) : <span className="text-zinc-600">—</span>}
                                                    </td>

                                                    <td className="px-4 py-4 text-right hidden md:table-cell">
                                                        <div className="flex flex-col items-end gap-0.5">
                                                            <span className={`text-sm font-mono font-medium ${
                                                                s.volRatio >= 2 ? "text-yellow-400"
                                                                : s.volRatio >= 1.5 ? "text-yellow-400/70"
                                                                : "text-zinc-300"
                                                            }`}>
                                                                {s.volRatio.toFixed(2)}×
                                                            </span>
                                                            <span className="text-[10px] text-zinc-600 font-mono">{fmtVol(s.volume)}</span>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4 text-right text-sm text-zinc-500 hidden lg:table-cell">
                                                        {fmtCap(s.marketCap)}
                                                    </td>

                                                    <td className="px-4 py-4 text-right">
                                                        <span className={`inline-flex items-center justify-center min-w-[52px] px-2.5 py-1 rounded-lg border text-xs font-bold ${sc.text} ${sc.bg}`}>
                                                            {s.momentumScore > 0 ? "+" : ""}{s.momentumScore.toFixed(1)}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-4 text-center">
                                                        <button
                                                            onClick={() => onAnalyze(s.symbol)}
                                                            className="p-2 bg-neutral-800 hover:bg-blue-600 border border-neutral-700 hover:border-blue-500 text-zinc-400 hover:text-white rounded-lg transition-all cursor-pointer"
                                                            title={`AI analysis of ${s.symbol}`}
                                                        >
                                                            <BarChart3 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-6 py-3.5 border-t border-neutral-800 flex items-center justify-between gap-2">
                                <span className="text-xs text-zinc-500">
                                    {displayed.length} of {stocks.length} stocks
                                </span>
                                <span className="text-xs text-zinc-600 flex items-center gap-1.5">
                                    <Info className="w-3 h-3" />
                                    1M / 3M = price return over period
                                </span>
                            </div>
                        </div>
                    ) : (
                        stocks.length > 0 && (
                            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-12 text-center">
                                <p className="text-zinc-400 mb-1">No stocks match the active filters.</p>
                                <p className="text-zinc-600 text-sm">Try relaxing the filters above.</p>
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
                    {/* Breakout filters */}
                    {breakouts.length > 0 && (
                        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl px-4 py-4 space-y-3">
                            <div className="flex items-center gap-1.5 text-xs">
                                <SlidersHorizontal className="w-3.5 h-3.5 text-orange-400" />
                                <span className="font-medium text-zinc-400">Filters</span>
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-3">
                                <FilterPills
                                    label="Volume"
                                    value={bVolFilter}
                                    onChange={setBVolFilter}
                                    options={[
                                        { label: "Any",   value: "all" },
                                        { label: "≥1.5×", value: "1.5" },
                                        { label: "≥2×",   value: "2" },
                                        { label: "≥3×",   value: "3" },
                                    ]}
                                    activeClass="bg-orange-500/15 text-orange-400 border-orange-500/40"
                                />
                                <FilterPills
                                    label="1M Return"
                                    value={bReturnFilter}
                                    onChange={setBReturnFilter}
                                    options={[
                                        { label: "Any",   value: "all" },
                                        { label: "≥5%",   value: "5" },
                                        { label: "≥8%",   value: "8" },
                                        { label: "≥15%",  value: "15" },
                                    ]}
                                    activeClass="bg-orange-500/15 text-orange-400 border-orange-500/40"
                                />
                                <FilterPills
                                    label="vs 52W High"
                                    value={bHighFilter}
                                    onChange={setBHighFilter}
                                    options={[
                                        { label: "Any",   value: "all" },
                                        { label: "≤10%",  value: "10" },
                                        { label: "≤5%",   value: "5" },
                                        { label: "≤2%",   value: "2" },
                                    ]}
                                    activeClass="bg-orange-500/15 text-orange-400 border-orange-500/40"
                                />
                                <FilterPills
                                    label="RSI"
                                    value={bRsiFilter}
                                    onChange={setBRsiFilter}
                                    options={[
                                        { label: "Any",    value: "all" },
                                        { label: "50–65",  value: "50-65" },
                                        { label: "65–78",  value: "65-78" },
                                    ]}
                                    activeClass="bg-orange-500/15 text-orange-400 border-orange-500/40"
                                />
                            </div>
                        </div>
                    )}

                    {/* Breakouts table */}
                    {displayedBreakouts.length > 0 ? (
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-neutral-950/70 border-b border-neutral-800">
                                            <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-500 w-10">#</th>
                                            <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-400 min-w-[140px]">Stock</th>
                                            <th className="px-4 py-3.5 text-left text-xs font-semibold text-zinc-400">Signals</th>
                                            <th className="px-4 py-3.5 text-right text-xs font-semibold text-zinc-400 hidden sm:table-cell">Price</th>
                                            <BSortTh label="Day %" k="changePercent" right hint="1-day price change" className="hidden md:table-cell" />
                                            <BSortTh label="1M Ret" k="oneMonthReturn" right hint="1-month price return" className="hidden sm:table-cell" />
                                            <BSortTh label="vs 52W High" k="pctBelow52WkHigh" right hint="% below 52W high — negative = above / ATH" className="hidden md:table-cell" />
                                            <BSortTh label="Vol ×" k="volRatio" right hint="Today ÷ 3-month avg volume" className="hidden md:table-cell" />
                                            <BSortTh label="RSI" k="rsi14" right hint="14-period RSI" className="hidden lg:table-cell" />
                                            <th className="px-4 py-3.5 text-right text-xs font-semibold text-zinc-400 hidden lg:table-cell">Mkt Cap</th>
                                            <BSortTh label="Score" k="breakoutScore" right hint="Composite breakout score" />
                                            <th className="px-4 py-3.5 text-center text-xs font-semibold text-zinc-400">AI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800/60">
                                        {displayedBreakouts.map((s, i) => {
                                            const sc = bScoreColor(s.breakoutScore);
                                            return (
                                                <tr key={s.symbol} className="hover:bg-neutral-800/40 transition-colors">
                                                    <td className="px-4 py-4 text-zinc-600 text-sm font-mono">{i + 1}</td>

                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-semibold text-zinc-100 text-sm tracking-wide">{s.symbol}</span>
                                                            <span className="text-xs text-zinc-500 truncate max-w-[150px]">{s.name}</span>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                            {s.signals.map((sig) => (
                                                                <span
                                                                    key={sig}
                                                                    className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-300 border border-orange-500/20 rounded-full font-medium whitespace-nowrap"
                                                                >
                                                                    {sig}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4 text-right hidden sm:table-cell">
                                                        <span className="font-mono font-medium text-zinc-100 text-sm">{fmtPrice(s.price)}</span>
                                                    </td>

                                                    <td className="px-4 py-4 text-right hidden md:table-cell">
                                                        <span className={`flex items-center justify-end gap-1 text-sm font-medium ${pctColor(s.changePercent)}`}>
                                                            {s.changePercent > 0.05 ? <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                                                            : s.changePercent < -0.05 ? <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />
                                                            : <Minus className="w-3.5 h-3.5 flex-shrink-0" />}
                                                            {fmtPct(s.changePercent)}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-4 text-right hidden sm:table-cell">
                                                        <span className={`text-sm font-semibold font-mono ${pctColor(s.oneMonthReturn)}`}>
                                                            {fmtPct(s.oneMonthReturn)}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-4 text-right hidden md:table-cell">
                                                        <span className={`text-sm font-mono font-semibold ${
                                                            s.pctBelow52WkHigh <= 0 ? "text-emerald-400"
                                                            : s.pctBelow52WkHigh <= 3 ? "text-emerald-400"
                                                            : s.pctBelow52WkHigh <= 5 ? "text-blue-400"
                                                            : "text-zinc-400"
                                                        }`}>
                                                            {s.pctBelow52WkHigh <= 0 ? "ATH ↑" : `-${s.pctBelow52WkHigh.toFixed(1)}%`}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-4 text-right hidden md:table-cell">
                                                        <div className="flex flex-col items-end gap-0.5">
                                                            <span className={`text-sm font-mono font-medium ${
                                                                s.volRatio >= 3 ? "text-orange-400"
                                                                : s.volRatio >= 2 ? "text-yellow-400"
                                                                : s.volRatio >= 1.5 ? "text-yellow-400/70"
                                                                : "text-zinc-300"
                                                            }`}>
                                                                {s.volRatio.toFixed(2)}×
                                                            </span>
                                                            <span className="text-[10px] text-zinc-600 font-mono">{fmtVol(s.volume)}</span>
                                                        </div>
                                                    </td>

                                                    <td className={`px-4 py-4 text-right text-sm font-mono font-semibold hidden lg:table-cell ${rsiColor(s.rsi14)}`}>
                                                        {s.rsi14 != null ? s.rsi14 : <span className="text-zinc-600">—</span>}
                                                    </td>

                                                    <td className="px-4 py-4 text-right text-sm text-zinc-500 hidden lg:table-cell">
                                                        {fmtCap(s.marketCap)}
                                                    </td>

                                                    <td className="px-4 py-4 text-right">
                                                        <span className={`inline-flex items-center justify-center min-w-[52px] px-2.5 py-1 rounded-lg border text-xs font-bold ${sc.text} ${sc.bg}`}>
                                                            {s.breakoutScore.toFixed(1)}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-4 text-center">
                                                        <button
                                                            onClick={() => onAnalyze(s.symbol)}
                                                            className="p-2 bg-neutral-800 hover:bg-orange-600 border border-neutral-700 hover:border-orange-500 text-zinc-400 hover:text-white rounded-lg transition-all cursor-pointer"
                                                            title={`AI analysis of ${s.symbol}`}
                                                        >
                                                            <BarChart3 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-6 py-3.5 border-t border-neutral-800 flex items-center justify-between gap-2">
                                <span className="text-xs text-zinc-500">
                                    {displayedBreakouts.length} of {breakouts.length} breakouts
                                </span>
                                <span className="text-xs text-zinc-600 flex items-center gap-1.5">
                                    <Info className="w-3 h-3 flex-shrink-0" />
                                    Above EMA50 · not yet in 3M momentum · ≥2 signals fired
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-12 text-center">
                            <Flame className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                            <p className="text-zinc-400 mb-1">
                                {breakouts.length === 0
                                    ? "No early breakouts detected right now."
                                    : "No breakouts match the active filters."}
                            </p>
                            <p className="text-zinc-600 text-sm">
                                {breakouts.length === 0
                                    ? "Signals: Vol≥2× · 1M≥8% · near 52W high · RSI 58–78 · Day≥2.5% (need ≥2)"
                                    : "Try relaxing the filters above."}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Criteria legend ────────────────────────────────────────── */}
            {!loading && (stocks.length > 0 || breakouts.length > 0) && (
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-600 px-1">
                    <span className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-blue-500" />
                        Momentum: Price &gt; EMA50 · 3M return &gt;10% · Within 10% of 1M high
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Flame className="w-3 h-3 text-orange-500" />
                        Breakout: Above EMA50 · ≥2 of: Vol≥2× · 1M≥8% · Near 52W high · RSI 58–78 · Day≥2.5%
                    </span>
                </div>
            )}
        </div>
    );
}
