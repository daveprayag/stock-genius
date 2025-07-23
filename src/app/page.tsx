"use client";

import { StockForm } from "@/components/StockForm";
import { motion } from "framer-motion";
import { TrendingUp, Brain, Zap, Shield } from "lucide-react";

export default function Home() {
    return (
        <div className="min-h-screen bg-neutral-950 relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 via-transparent to-green-500/2"></div>

            {/* Radial gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-neutral-950/20"></div>

            {/* Fixed Header */}
            <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-xl"
            >
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <motion.div
                        className="flex items-center gap-3"
                        whileHover={{ scale: 1.02 }}
                        transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 10,
                        }}
                    >
                        <div className="relative">
                            <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center shadow-lg">
                                <TrendingUp className="w-5 h-5 text-zinc-900" />
                            </div>
                            <motion.div
                                className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-100">
                                StockGenius
                            </h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium shadow-sm">
                                    AI Powered
                                </span>
                                <span className="text-xs text-zinc-400 font-medium">
                                    🇮🇳 Indian Markets
                                </span>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div
                        className="hidden md:flex items-center gap-2 text-zinc-400"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <span className="text-sm font-medium">
                            Live Analysis
                        </span>
                        <motion.div
                            className="w-2 h-2 bg-green-500 rounded-full shadow-sm"
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </motion.div>
                </div>
            </motion.header>

            {/* Main Content with top padding for fixed header */}
            <main className="pt-20 flex-1 relative z-10">
                <div className="max-w-7xl mx-auto px-6 py-12">
                    {/* Hero Section */}
                    <motion.div
                        className="text-center mb-16"
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <motion.h1
                            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                        >
                            <span className="text-zinc-100">AI Stock </span>
                            <span className="text-blue-400">Analyzer</span>
                        </motion.h1>
                        <motion.p
                            className="text-xl text-zinc-300 mb-12 max-w-4xl mx-auto leading-relaxed"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                        >
                            Professional-grade AI analysis for Indian stock
                            markets. Get detailed insights, trend analysis, and
                            trading recommendations powered by advanced
                            algorithms.
                        </motion.p>

                        {/* Feature Pills */}
                        <motion.div
                            className="flex flex-wrap justify-center gap-4 mb-12"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.8 }}
                        >
                            {[
                                {
                                    icon: Brain,
                                    text: "AI-Powered Analysis",
                                },
                                {
                                    icon: Zap,
                                    text: "Real-time Insights",
                                },
                                {
                                    icon: Shield,
                                    text: "Risk Assessment",
                                },
                            ].map((feature, index) => (
                                <motion.div
                                    key={feature.text}
                                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 border border-neutral-700 text-zinc-200 rounded-full text-sm font-medium shadow-lg"
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1 + index * 0.1 }}
                                >
                                    <feature.icon className="w-4 h-4" />
                                    {feature.text}
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>

                    {/* How It Works Section */}
                    <motion.div
                        className="mb-20"
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 1.1 }}
                    >
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-4">
                                How It Works
                            </h2>
                            <p className="text-zinc-300 text-lg max-w-2xl mx-auto">
                                Get professional stock analysis in three simple
                                steps
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                {
                                    step: "01",
                                    title: "Enter Stock Symbol",
                                    description:
                                        "Simply type any Indian stock symbol (NSE/BSE) to begin your analysis",
                                    icon: "📊",
                                },
                                {
                                    step: "02",
                                    title: "AI Analysis",
                                    description:
                                        "Our advanced AI processes real-time data, technicals, and market sentiment",
                                    icon: "🤖",
                                },
                                {
                                    step: "03",
                                    title: "Get Insights",
                                    description:
                                        "Receive detailed analysis with trading recommendations and risk assessment",
                                    icon: "📈",
                                },
                            ].map((item, index) => (
                                <motion.div
                                    key={item.step}
                                    className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 text-center backdrop-blur-sm"
                                    initial={{ y: 30, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 1.2 + index * 0.1 }}
                                    whileHover={{ scale: 1.02, y: -4 }}
                                >
                                    <div className="text-3xl mb-4">
                                        {item.icon}
                                    </div>
                                    <div className="text-blue-400 font-bold text-sm mb-2">
                                        STEP {item.step}
                                    </div>
                                    <h3 className="text-zinc-100 font-semibold text-lg mb-3">
                                        {item.title}
                                    </h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        {item.description}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Stock Form */}
                    <motion.div
                        className="mb-16"
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 1.5 }}
                    >
                        <StockForm />
                    </motion.div>
                </div>
            </main>

            {/* Footer */}
            <motion.footer
                className="border-t border-neutral-800 bg-neutral-950 py-8 relative z-10"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.8 }}
            >
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-zinc-300 text-sm">
                            &copy; {new Date().getFullYear()} StockGenius.
                            Professional stock analysis platform.
                        </p>
                        <div className="flex items-center gap-4 text-xs text-zinc-400">
                            <span>Advanced AI</span>
                            <span>•</span>
                            <span>Real-time Data</span>
                            <span>•</span>
                            <span>Professional Analysis</span>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-neutral-800">
                        <p className="text-xs text-zinc-400 text-center">
                            <strong>Disclaimer:</strong> This tool provides
                            educational insights only and should not be
                            considered as investment advice. Real-time quotes
                            may be delayed by 5-10 minutes. Historical data
                            accuracy is subject to exchange corrections and
                            corporate actions. Always consult with a qualified
                            financial advisor before making investment
                            decisions.
                        </p>
                    </div>
                </div>
            </motion.footer>
        </div>
    );
}
