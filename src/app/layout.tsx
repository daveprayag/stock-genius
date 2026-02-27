import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
    display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-mono",
    subsets: ["latin"],
    display: "swap",
});

export const metadata: Metadata = {
    title: "StockGenius - AI Stock Analyzer",
    description:
        "Professional AI-powered stock analysis for Indian markets. Get detailed insights, trend analysis, and trading recommendations.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="scroll-smooth">
            <body
                className={`${inter.variable} ${jetbrainsMono.variable} font-inter antialiased bg-[#edeceb] text-stone-800 min-h-screen flex flex-col`}
            >
                <NavBar />
                <main className="pt-14 flex-1 relative z-10">
                    {children}
                </main>
                <footer className="border-t border-stone-300/50 bg-[#edeceb] py-4 relative z-10">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-stone-500">
                            <span>&copy; {new Date().getFullYear()} StockGenius</span>
                            <span className="text-stone-400">Not investment advice. Consult a financial advisor.</span>
                        </div>
                    </div>
                </footer>
            </body>
        </html>
    );
}
