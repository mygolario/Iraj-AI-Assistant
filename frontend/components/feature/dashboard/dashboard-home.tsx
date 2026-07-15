"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  IconAnalytics,
  IconMarket,
  IconStandards,
  IconCalculator,
  IconSearch,
  IconCopilot,
  IconBolt,
  IconTrendUp,
  IconDatabase,
  IconArrowOut,
} from "@/components/ui/icons";
import { api } from "@/lib/api";
import type { BiResult, MarketBriefing, RagResult } from "@/lib/types";
import { cn, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { DealCalculator } from "../deal-calculator";

function Tile({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]", className)}
    >
      {children}
    </section>
  );
}

function TileHeader({
  icon: Icon,
  title,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  href?: string;
}) {
  const t = useTranslations();
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-sm border border-line bg-bg-subtle text-accent">
          <Icon className="size-4" />
        </div>
        <h3 className="font-display text-base leading-tight tracking-tight text-ink">{title}</h3>
      </div>
      {href && (
        <Link
          href={href}
          className="group flex items-center gap-1 text-[13px] font-medium text-ink-muted transition-colors hover:text-accent"
        >
          {t("common.open")}
          <IconArrowOut className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function BiSummaryTile() {
  const t = useTranslations();
  const [bi, setBi] = React.useState<BiResult | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("iraj-last-bi");
      if (raw) setBi(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const k = bi?.kpis;
  const stats = k
    ? [
        { label: t("dashboard.revenue"), value: formatCurrency(k.revenue) },
        { label: t("dashboard.tonnage"), value: formatNumber(k.tonnage, " t") },
        { label: t("dashboard.avg_price"), value: formatCurrency(k.avg_price) },
        { label: t("dashboard.conversion"), value: formatPercent(k.conversion_rate) },
      ]
    : [];

  return (
    <Tile>
      <TileHeader icon={IconAnalytics} title={t("dashboard.bi_title")} href="/bi" />
      {k ? (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card p-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-subtle">
                {s.label}
              </div>
              <div className="mt-1.5 font-display text-lg leading-none tracking-tight tabular-nums text-ink">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <IconDatabase className="size-7 text-ink-subtle" />
          <p className="text-sm text-ink-muted">{t("dashboard.no_bi_data")}</p>
          <Link
            href="/bi"
            className="inline-flex items-center gap-1.5 rounded-sm bg-accent px-4 py-2 text-[13px] font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            {t("dashboard.upload_sales_sheet")}
            <IconArrowOut className="size-3.5" />
          </Link>
        </div>
      )}
    </Tile>
  );
}

function LivePricesTile() {
  const t = useTranslations();
  const [briefing, setBriefing] = React.useState<MarketBriefing | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    api.market
      .briefing()
      .then(setBriefing)
      .catch(() => setBriefing(null))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const data = await api.market.buildBriefing({ mode: "fast", use_web: true });
      setBriefing(data);
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  };

  const prices = (briefing?.prices || []).filter((p) => p.price != null).slice(0, 3);
  const summary = briefing?.summary?.trim();

  return (
    <Tile>
      <TileHeader icon={IconMarket} title={t("dashboard.market_title")} href="/market" />
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-12 rounded-sm" />
          ))}
        </div>
      ) : summary || prices.length ? (
        <div className="space-y-3">
          {summary ? (
            <p className="line-clamp-3 text-[13px] leading-relaxed text-ink-muted">
              {summary}
            </p>
          ) : null}
          {prices.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-sm border border-line bg-bg-subtle px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-ink">
                  {item.label || item.product || "Market"}
                </div>
                <div className="text-[11px] text-ink-subtle">
                  {(item.as_of || "").slice(0, 10) || item.source_title || ""}
                </div>
              </div>
              <div className="font-mono text-sm font-semibold text-ink tabular-nums">
                {formatCurrency(item.price, item.currency)}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <button
              onClick={refresh}
              disabled={refreshing}
              className="mt-1 flex flex-1 items-center justify-center gap-2 rounded-sm border border-line bg-card py-2 text-[13px] font-medium text-ink-muted transition-colors hover:bg-bg-subtle hover:text-ink disabled:opacity-50"
            >
              <IconBolt className={cn("size-3.5", refreshing && "animate-pulse")} />
              {refreshing ? t("dashboard.scraping") : t("dashboard.refresh_feeds")}
            </button>
            <Link
              href="/market"
              className="mt-1 flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-accent px-3 py-2 text-[13px] font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              {t("dashboard.ask_market")}
              <IconArrowOut className="size-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <IconTrendUp className="size-7 text-ink-subtle" />
          <p className="text-sm text-ink-muted">{t("dashboard.no_prices")}</p>
          <Link
            href="/market"
            className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-card px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-bg-subtle"
          >
            {t("dashboard.configure_feeds")}
            <IconArrowOut className="size-3.5" />
          </Link>
        </div>
      )}
    </Tile>
  );
}

function RagQuickSearchTile() {
  const t = useTranslations();
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
    <Tile>
      <TileHeader icon={IconStandards} title={t("dashboard.standards_title")} href="/standards" />
      <form onSubmit={search} className="relative">
        <IconSearch className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("dashboard.search_placeholder")}
          className="h-10 w-full rounded-sm border border-line bg-bg-sunken ps-9 pe-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-accent focus:bg-card"
        />
      </form>
      {loading && (
        <div className="mt-3 space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-14 rounded-sm" />
          ))}
        </div>
      )}
      {!loading && results && results.length > 0 && (
        <div className="mt-3 space-y-2">
          {results.slice(0, 2).map((r, i) => (
            <div
              key={i}
              className="rounded-sm border-s-2 border-line-strong bg-bg-subtle p-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-accent">
                  {r.metadata.standard}
                </span>
                <span className="text-[11px] text-ink-subtle">
                  score {r.score}
                </span>
              </div>
              <p className="line-clamp-2 text-[13px] text-ink-muted">{r.text}</p>
            </div>
          ))}
        </div>
      )}
      {!loading && results && results.length === 0 && (
        <p className="mt-3 rounded-sm bg-bg-subtle p-3 text-[13px] text-ink-muted">
          {t("dashboard.no_rag_matches")}
        </p>
      )}
      {!loading && !results && (
        <p className="mt-3 text-[13px] text-ink-muted">{t("dashboard.rag_hint")}</p>
      )}
    </Tile>
  );
}

function CalculatorTile() {
  const t = useTranslations();
  return (
    <Tile>
      <TileHeader icon={IconCalculator} title={t("dashboard.calculator_title")} />
      <DealCalculator compact />
    </Tile>
  );
}

export function DashboardHome() {
  const t = useTranslations();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t("dashboard.greeting_morning") : hour < 18 ? t("dashboard.greeting_afternoon") : t("dashboard.greeting_evening");

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <IconCopilot className="size-4 text-accent" />
          <span className="text-[13px] font-medium text-ink-muted">{greeting}</span>
        </div>
        <h2 className="font-display text-3xl leading-tight tracking-tight text-ink sm:text-[40px]">
          {t("dashboard.your")}{" "}
          <span className="text-accent">{t("dashboard.sales_command_center")}</span>
        </h2>
        <p className="max-w-2xl text-[15px] leading-7 text-ink-muted">
          {t("dashboard.subtitle")}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <BiSummaryTile />
        <LivePricesTile />
        <RagQuickSearchTile />
        <CalculatorTile />
      </div>
    </div>
  );
}
