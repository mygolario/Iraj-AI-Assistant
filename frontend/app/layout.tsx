import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AuroraBackground } from "@/components/aurora-background";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Iraj Sales AI — Command Center",
  description:
    "Production multi-agent command center for steel rebar sales: BI & KPIs, standards RAG, live market pricing, contracts, and an AI copilot.",
  applicationName: "Iraj Sales AI",
  authors: [{ name: "Iraj Steel Industries" }],
  keywords: ["steel", "rebar", "sales", "AI", "BI", "RAG", "market pricing"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full font-sans">
        <AuroraBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
