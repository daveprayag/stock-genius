"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, Brain, Zap, Gem, BarChart2 } from "lucide-react";

const NAV_ITEMS = [
    { href: "/sectors",  label: "Sectors",  Icon: BarChart2 },
    { href: "/momentum", label: "Momentum", Icon: Zap },
    { href: "/value",    label: "Value",    Icon: Gem },
    { href: "/analyzer", label: "Analyze",  Icon: Brain },
] as const;

export function NavBar() {
    const pathname = usePathname();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-stone-300/50 bg-[#edeceb]/95 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
                {/* Logo */}
                <Link href="/sectors" className="flex items-center gap-2 group">
                    <div className="relative">
                        <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-stone-700 transition-colors">
                            <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full" />
                    </div>
                    <span className="text-base font-bold text-stone-800">StockGenius</span>
                </Link>

                {/* Nav */}
                <nav className="flex items-center bg-white/60 border border-stone-300/50 rounded-xl p-1 gap-1 shadow-sm">
                    {NAV_ITEMS.map(({ href, label, Icon }) => {
                        const active = pathname === href || pathname.startsWith(href + "/");
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                    active
                                        ? "bg-stone-800 text-white shadow-sm"
                                        : "text-stone-500 hover:text-stone-700"
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}
