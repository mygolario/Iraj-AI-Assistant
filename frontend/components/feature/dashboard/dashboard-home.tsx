"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  LineChart,
  Library,
  Calculator,
  Search,
  Sparkles,
  Zap,
  TrendingUp,
  Database,
} from "lucide-react";
import { api } from "@/lib/api";
import type { BiResult, PriceFeed, RagResult } from "@/lib/types";
import { cn, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { DealCalculator } from "../deal-calculator";

function BentoTile({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("glass gradient-border rounded-2xl p-5", className)}
    >
      {children}
    </motion.section>
  );
}

function TileHeader({
  icon: Icon,
  title,
  href,
  accent = "primary",
}: {
  icon: typeof BarChart3;
  title: string;
  href?: string;
  accent?: "primary" | "secondary" | "accent";
}) {
  const accentClass = {
    primary: "bg-primary/15 text-primary",
    secondary: "bg-secondary/15 text-secondary",
    accent: "bg-accent/15 text-accent",
  }[accent];
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className={cn("flex size-8 items-center justify-center rounded-lg", accentClass)}>
          <Icon className="size-4" />
        </div>
        <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      {href && (
        <Link
          href={href}
          className="group flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Open
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      )}
    </div>
  );
}

function BiSummaryTile() {
  const [bi] = React.useState<BiResult | null>(() => {
    try {
      const raw = localStorage.getItem("iraj-last-bi");
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
  });

  const k = bi?.kpis;
  const stats = k
    ? [
        { label: "Revenue", value: formatCurrency(k.revenue), tone: "primary" },
        { label: "Tonnage", value: formatNumber(k.tonnage, " t"), tone: "secondary" },
        { label: "Avg Price", value: formatCurrency(k.avg_price), tone: "primary" },
        { label: "Conversion", value: formatPercent(k.conversion_rate), tone: "accent" },
      ]
    : [];

  return (
    <BentoTile delay={0.05}>
      <TileHeader icon={BarChart3} title="Business Intelligence" href="/bi" accent="primary" />
      {k ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-white/[0.03] p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {s.label}
              </div>
              <div
                className={cn(
                  "mt-1 font-display text-base font-bold tabular-nums",
                  s.tone === "primary" && "text-primary",
                  s.tone === "secondary" && "text-secondary",
                  s.tone === "accent" && "text-accent",
                )}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Database className="size-7 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No sales data loaded yet.
          </p>
          <Link
            href="/bi"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Upload sales sheet
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      )}
    </BentoTile>
  );
}

function LivePricesTile() {
  const [items, setItems] = React.useState<PriceFeed[] | null>(null);
  const [scraping, setScraping] = React.useState(false);

  const load = React.useCallback(() => {
    api.market.prices().then(setItems).catch(() => setItems([]));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const runScraper = async () => {
    setScraping(true);
    try {
      const urls = JSON.parse(localStorage.getItem("iraj-scraper-urls") || "[]") as string[];
      if (urls.length) await api.market.scrape(urls);
      load();
    } catch {
      /* ignore */
    } finally {
      setScraping(false);
    }
  };

  const priced = (items ?? []).filter((i) => i.price != null).slice(0, 3);

  return (
    <BentoTile delay={0.12}>
      <TileHeader icon={LineChart} title="Live Market Prices" href="/market" accent="accent" />
      {!items ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : priced.length ? (
        <div className="space-y-2">
          {priced.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-foreground">
                  t.me/s/{item.channel}
                </div>
                <div className="text-[10px] text-muted-foreground">{item.date}</div>
              </div>
              <div className="font-mono text-sm font-semibold text-primary">
                {formatCurrency(item.price, item.currency)}
              </div>
            </div>
          ))}
          <button
            onClick={runScraper}
            disabled={scraping}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-50"
          >
            <Zap className={cn("size-3.5", scraping && "animate-pulse")} />
            {scraping ? "Scraping…" : "Refresh feeds"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <TrendingUp className="size-7 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No prices cached.</p>
          <Link
            href="/market"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-white/5"
          >
            Configure feeds
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      )}
    </BentoTile>
  );
}

function RagQuickSearchTile() {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<RagResult[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResults(null);
    try {
      setResults(await api.rag.query(query));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BentoTile delay={0.19}>
      <TileHeader icon={Library} title="Standards Quick Search" href="/standards" accent="secondary" />
      <form onSubmit={search} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. ASTM A615 yield strength"
          className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary/60 focus:ring-2 focus:ring-secondary/20"
        />
      </form>
      {loading && (
        <div className="mt-3 space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      )}
      {!loading && results && results.length > 0 && (
        <div className="mt-3 space-y-2">
          {results.slice(0, 2).map((r, i) => (
            <div
              key={i}
              className="rounded-xl border-l-2 border-secondary/50 bg-white/[0.03] p-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-secondary">
                  {r.metadata.standard}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  score {r.score}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">{r.text}</p>
            </div>
          ))}
        </div>
      )}
      {!loading && results && results.length === 0 && (
        <p className="mt-3 rounded-xl bg-white/[0.03] p-3 text-xs text-muted-foreground">
          No matches. Upload standards in the Standards tab to enable semantic search.
        </p>
      )}
      {!loading && !results && (
        <p className="mt-3 text-xs text-muted-foreground">
          Semantic search across your indexed steel standards.
        </p>
      )}
    </BentoTile>
  );
}

function CalculatorTile() {
  return (
    <BentoTile delay={0.26}>
      <TileHeader icon={Calculator} title="Deal Profitability" accent="primary" />
      <DealCalculator compact />
    </BentoTile>
  );
}

export function DashboardHome() {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-5">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-1"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <span className="text-sm font-medium text-muted-foreground">{greeting}</span>
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Your <span className="text-gradient">sales command center</span>
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          BI intelligence, standards search, live market pricing, and an AI copilot —
          all in one glass dashboard.
        </p>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-2">
        <BiSummaryTile />
        <LivePricesTile />
        <RagQuickSearchTile />
        <CalculatorTile />
      </div>
    </div>
  );
}
