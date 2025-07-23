import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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
                className={`${inter.variable} ${jetbrainsMono.variable} font-inter antialiased bg-neutral-950 text-zinc-100`}
            >
                {children}
            </body>
        </html>
    );
}
