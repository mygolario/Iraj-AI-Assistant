"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Zap,
  Settings2,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Calculator,
  Gauge,
  Newspaper,
} from "lucide-react";
import { api } from "@/lib/api";
import type { ArbitrageResult, BiResult, PriceFeed } from "@/lib/types";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { DealCalculator } from "../deal-calculator";

const STATUS_META = {
  opportunity: { icon: TrendingUp, tone: "success" as const, label: "Opportunity" },
  compliance: { icon: Minus, tone: "primary" as const, label: "Compliant" },
  alert: { icon: TrendingDown, tone: "destructive" as const, label: "Alert" },
};

export function MarketPage() {
  const t = useTranslations();

  const [urls, setUrls] = React.useState<string>(() => {
    try {
      const saved = localStorage.getItem("iraj-scraper-urls");
      return saved ? JSON.parse(saved).join("\n") : "";
    } catch { return ""; }
  });
  const [items, setItems] = React.useState<PriceFeed[] | null>(null);
  const [scraping, setScraping] = React.useState(false);
  const [arbitrage, setArbitrage] = React.useState<ArbitrageResult | null>(null);
  const [arbitrageLoading, setArbitrageLoading] = React.useState(false);

  const loadPrices = React.useCallback(async () => {
    try {
      setItems(await api.market.prices());
    } catch {
      setItems([]);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    api.market.prices()
      .then((data) => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  const saveUrls = () => {
    const list = urls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean)
      .slice(0, 50);
    localStorage.setItem("iraj-scraper-urls", JSON.stringify(list));
    toast.success(t("market.saved_feeds", { count: list.length }));
  };

  const runScraper = async () => {
    const list = urls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean)
      .slice(0, 50);
    if (!list.length) {
      toast.error(t("market.add_url_error"));
      return;
    }
    localStorage.setItem("iraj-scraper-urls", JSON.stringify(list));
    setScraping(true);
    try {
      const res = await api.market.scrape(list);
      toast.success(t("market.scraped_posts", { count: res.count }), {
        description: t("common.priced", { count: res.items.filter((i) => i.price != null).length }),
      });
      await loadPrices();
    } catch (e) {
      toast.error(t("market.scrape_failed"), { description: (e as Error).message });
    } finally {
      setScraping(false);
    }
  };

  const runArbitrage = async () => {
    let bi: BiResult | null = null;
    try {
      bi = JSON.parse(localStorage.getItem("iraj-last-bi") || "null");
    } catch {
      /* ignore */
    }
    if (!bi?.kpis?.avg_price) {
      toast.error(t("market.upload_bi_first"), {
        description: t("market.arbitrage_needs_bi"),
      });
      return;
    }
    setArbitrageLoading(true);
    setArbitrage(null);
    try {
      setArbitrage(await api.market.arbitrage(bi.kpis.avg_price));
    } catch (e) {
      toast.error(t("market.arbitrage_failed"), { description: (e as Error).message });
    } finally {
      setArbitrageLoading(false);
    }
  };

  const priced = (items ?? []).filter((i) => i.price != null);

  return (
    <div className="flex flex-col gap-6">
      <div className="glass rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Settings2 className="size-4 text-accent" />
            {t("market.scraper_feeds")}
          </span>
          <span className="text-[10px] text-muted-foreground">{t("market.up_to_channels")}</span>
        </div>
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          rows={4}
          placeholder={"https://t.me/s/your_channel_1\nhttps://t.me/s/your_channel_2"}
          className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] p-3 font-mono text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={saveUrls}
            className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold transition-colors hover:bg-white/5"
          >
            Save feeds
          </button>
          <button
            onClick={runScraper}
            disabled={scraping}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-2 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {scraping ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
            {scraping ? "Scraping…" : "Run live scraper"}
          </button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold">{t("market.pricing_board")}</h3>
          <button
            onClick={loadPrices}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </button>
        </div>
        {!items ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        ) : priced.length === 0 ? (
          <div className="glass flex flex-col items-center gap-3 rounded-2xl py-12 text-center">
            <Newspaper className="size-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {t("market.no_priced")}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {priced.slice(0, 8).map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass gradient-border rounded-2xl border-t-2 border-t-secondary/40 p-4"
              >
                <div className="truncate text-xs font-medium text-muted-foreground">
                  t.me/s/{item.channel}
                </div>
                <div className="mt-1 font-display text-xl font-bold text-primary">
                  {formatCurrency(item.price, item.currency)}
                  {item.currency !== "USD" && (
                    <span className="ml-1 text-xs text-muted-foreground">/{item.currency}</span>
                  )}
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">{item.date}</div>
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/80">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {items && items.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <Newspaper className="size-4 text-muted-foreground" />
            <h3 className="font-display text-sm font-semibold">{t("market.full_feed_log")}</h3>
            <span className="ml-auto text-xs text-muted-foreground">{items.length} posts</span>
          </div>
          <div className="max-h-80 overflow-auto rounded-xl border border-white/[0.06]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#0c0c14]/95 backdrop-blur">
                <tr className="text-muted-foreground">
                  {[t("common.date"), t("common.channel"), t("common.price"), t("common.text")].map((h) => (
                    <th key={h} className="px-3 py-2.5 font-semibold uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{item.date}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground">{item.channel}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono font-semibold text-primary">
                      {item.price != null ? formatCurrency(item.price, item.currency) : "—"}
                    </td>
                    <td className="max-w-md px-3 py-2.5 text-muted-foreground">
                      <span className="line-clamp-2">{item.text}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="glass gradient-border rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Gauge className="size-4 text-secondary" />
            {t("market.arbitrage_check")}
          </span>
          <button
            onClick={runArbitrage}
            disabled={arbitrageLoading}
            className="flex items-center gap-1.5 rounded-lg bg-secondary/15 px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-secondary/25 disabled:opacity-50"
          >
            {arbitrageLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Gauge className="size-3.5" />}
            {t("market.check_deviation")}
          </button>
        </div>
        {arbitrage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-xl p-4",
              arbitrage.status === "opportunity" && "bg-success/10",
              arbitrage.status === "compliance" && "bg-primary/10",
              arbitrage.status === "alert" && "bg-destructive/10",
            )}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("market.internal_avg")}</div>
                <div className="mt-1 font-display text-xl font-bold text-foreground">
                  {formatCurrency(arbitrage.internal_avg)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("market.market_index")}</div>
                <div className="mt-1 font-display text-xl font-bold text-primary">
                  {formatCurrency(arbitrage.market_price, arbitrage.currency)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("market.deviation")}</div>
                <div
                  className={cn(
                    "mt-1 flex items-center gap-1.5 font-display text-xl font-bold",
                    arbitrage.status === "opportunity" && "text-success",
                    arbitrage.status === "compliance" && "text-primary",
                    arbitrage.status === "alert" && "text-destructive",
                  )}
                >
                  {React.createElement(STATUS_META[arbitrage.status].icon, { className: "size-5" })}
                  {arbitrage.deviation_pct > 0 ? "+" : ""}
                  {formatNumber(arbitrage.deviation_pct, "%")}
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{arbitrage.message}</p>
          </motion.div>
        )}
        {!arbitrage && !arbitrageLoading && (
          <p className="text-sm text-muted-foreground">
            {t("market.arbitrage_desc")}
          </p>
        )}
      </div>

      <div className="glass gradient-border rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <Calculator className="size-4 text-primary" />
          <h3 className="font-display text-sm font-semibold">{t("market.deal_calculator")}</h3>
        </div>
        <DealCalculator />
      </div>
    </div>
  );
}
