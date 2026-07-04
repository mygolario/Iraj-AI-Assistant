"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  IconBolt,
  IconTune,
  IconLoader,
  IconRefresh,
  IconTrendUp,
  IconTrendDown,
  IconTrendFlat,
  IconCalculator,
  IconGauge,
  IconFeed,
} from "@/components/ui/icons";
import { api } from "@/lib/api";
import type { ArbitrageResult, BiResult, PriceFeed } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { DealCalculator } from "../deal-calculator";

const STATUS_META = {
  opportunity: { icon: IconTrendUp, label: "Opportunity" },
  compliance: { icon: IconTrendFlat, label: "Compliant" },
  alert: { icon: IconTrendDown, label: "Alert" },
};

const toneByStatus: Record<ArbitrageResult["status"], string> = {
  opportunity: "text-positive",
  compliance: "text-ink",
  alert: "text-negative",
};

const inputCls =
  "w-full rounded-sm border border-line bg-bg-sunken p-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-accent focus:bg-card";

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
      <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-ink">
            <IconTune className="size-4 text-accent" />
            {t("market.scraper_feeds")}
          </span>
          <span className="text-[11px] text-ink-subtle">{t("market.up_to_channels")}</span>
        </div>
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          rows={4}
          placeholder={"https://t.me/s/your_channel_1\nhttps://t.me/s/your_channel_2"}
          className={cn(inputCls, "font-mono text-[13px]")}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={saveUrls}>
            Save feeds
          </Button>
          <Button size="sm" onClick={runScraper} disabled={scraping}>
            {scraping ? <IconLoader className="size-3.5 animate-spin" /> : <IconBolt className="size-3.5" />}
            {scraping ? "Scraping…" : "Run live scraper"}
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base leading-tight tracking-tight text-ink">{t("market.pricing_board")}</h3>
          <button
            onClick={loadPrices}
            className="flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-accent"
          >
            <IconRefresh className="size-3.5" />
            Refresh
          </button>
        </div>
        {!items ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-28 rounded-md" />
            ))}
          </div>
        ) : priced.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-line bg-card py-12 text-center shadow-[var(--shadow-1)]">
            <IconFeed className="size-7 text-ink-subtle" />
            <p className="text-sm text-ink-muted">{t("market.no_priced")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {priced.slice(0, 8).map((item, i) => (
              <div
                key={i}
                className="rounded-md border border-line border-t-2 border-t-accent bg-card p-4 shadow-[var(--shadow-1)]"
              >
                <div className="truncate text-[12px] font-medium text-ink-muted">
                  t.me/s/{item.channel}
                </div>
                <div className="mt-1.5 font-display text-2xl leading-none tracking-tight tabular-nums text-ink">
                  {formatCurrency(item.price, item.currency)}
                  {item.currency !== "USD" && (
                    <span className="ms-1 text-[13px] text-ink-subtle">/{item.currency}</span>
                  )}
                </div>
                <div className="mt-2 text-[11px] text-ink-subtle">{item.date}</div>
                {item.text && (
                  <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-ink-muted">
                    {item.text}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {items && items.length > 0 && (
        <div className="rounded-md border border-line bg-card shadow-[var(--shadow-1)]">
          <div className="flex items-center gap-2 border-b border-line px-5 py-4">
            <IconFeed className="size-4 text-ink-muted" />
            <h3 className="font-display text-base leading-tight tracking-tight text-ink">{t("market.full_feed_log")}</h3>
            <span className="ms-auto text-[13px] text-ink-muted">{items.length} posts</span>
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-start text-sm">
              <thead className="sticky top-0 bg-bg-subtle">
                <tr className="text-ink-subtle">
                  {[t("common.date"), t("common.channel"), t("common.price"), t("common.text")].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-t border-line hover:bg-bg-subtle">
                    <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted">{item.date}</td>
                    <td className="px-4 py-2.5 font-medium text-ink">{item.channel}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono font-semibold text-ink tabular-nums">
                      {item.price != null ? formatCurrency(item.price, item.currency) : "—"}
                    </td>
                    <td className="max-w-md px-4 py-2.5 text-ink-muted">
                      <span className="line-clamp-2">{item.text}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]">
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-ink">
            <IconGauge className="size-4 text-accent" />
            {t("market.arbitrage_check")}
          </span>
          <Button variant="outline" size="sm" onClick={runArbitrage} disabled={arbitrageLoading}>
            {arbitrageLoading ? <IconLoader className="size-3.5 animate-spin" /> : <IconGauge className="size-3.5" />}
            {t("market.check_deviation")}
          </Button>
        </div>
        {arbitrage && (
          <div className="rounded-sm border border-line bg-bg-subtle p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-ink-subtle">{t("market.internal_avg")}</div>
                <div className="mt-1.5 font-display text-xl leading-none tracking-tight tabular-nums text-ink">
                  {formatCurrency(arbitrage.internal_avg)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-ink-subtle">{t("market.market_index")}</div>
                <div className="mt-1.5 font-display text-xl leading-none tracking-tight tabular-nums text-ink">
                  {formatCurrency(arbitrage.market_price, arbitrage.currency)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-ink-subtle">{t("market.deviation")}</div>
                <div className={cn("mt-1.5 flex items-center gap-1.5 font-display text-xl leading-none tracking-tight tabular-nums", toneByStatus[arbitrage.status])}>
                  {React.createElement(STATUS_META[arbitrage.status].icon, { className: "size-5" })}
                  {arbitrage.deviation_pct > 0 ? "+" : ""}
                  {formatNumber(arbitrage.deviation_pct, "%")}
                </div>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-ink-muted">{arbitrage.message}</p>
          </div>
        )}
        {!arbitrage && !arbitrageLoading && (
          <p className="text-sm text-ink-muted">{t("market.arbitrage_desc")}</p>
        )}
      </div>

      <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]">
        <div className="mb-4 flex items-center gap-2">
          <IconCalculator className="size-4 text-accent" />
          <h3 className="font-display text-base leading-tight tracking-tight text-ink">{t("market.deal_calculator")}</h3>
        </div>
        <DealCalculator />
      </div>
    </div>
  );
}
