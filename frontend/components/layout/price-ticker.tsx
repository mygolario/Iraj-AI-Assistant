"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { IconActivity, IconBolt } from "@/components/ui/icons";
import { api } from "@/lib/api";
import type { MarketBriefing, PriceFeed } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type TickerItem = {
  label: string;
  price: number | null;
  currency: string;
  date?: string;
};

function TickerContent({
  items,
  emptyLabel,
}: {
  items: TickerItem[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <span className="inline-flex items-center gap-2 px-4 text-ink-muted">
        <IconBolt className="size-3.5 text-accent" />
        {emptyLabel}
      </span>
    );
  }
  return (
    <>
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-2 px-6">
          <span className="text-ink-subtle">{item.label}</span>
          {item.price != null ? (
            <span className="font-mono font-semibold text-ink">
              {formatCurrency(item.price, item.currency)}
            </span>
          ) : (
            <span className="text-[11px] text-ink-subtle">—</span>
          )}
          {item.date ? (
            <span className="text-[11px] text-ink-subtle">· {item.date}</span>
          ) : null}
          <span className="text-line">|</span>
        </span>
      ))}
    </>
  );
}

function toTickerItems(briefing: MarketBriefing | null, prices: PriceFeed[]): TickerItem[] {
  const fromBrief = (briefing?.prices || [])
    .filter((p) => p.price != null)
    .slice(0, 12)
    .map((p) => ({
      label: p.label || p.product || "Market",
      price: p.price,
      currency: p.currency || "Tomans",
      date: (p.as_of || "").slice(0, 10),
    }));
  if (fromBrief.length) return fromBrief;
  return prices
    .filter((p) => p.price != null)
    .slice(0, 12)
    .map((p) => ({
      label: p.channel,
      price: p.price,
      currency: p.currency,
      date: p.date,
    }));
}

export function PriceTicker() {
  const t = useTranslations();
  const [items, setItems] = useState<TickerItem[] | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [briefing, prices] = await Promise.all([
          api.market.briefing().catch(() => null),
          api.market.prices().catch(() => [] as PriceFeed[]),
        ]);
        if (active) setItems(toTickerItems(briefing, prices));
      } catch {
        if (active) setItems([]);
      }
    };
    load();
    const id = window.setInterval(load, 5 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="flex items-center gap-3 border-e border-line bg-bg-subtle px-3 py-1.5">
      <div className="flex shrink-0 items-center gap-1.5 rounded-sm bg-accent-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-ink">
        <IconActivity className="size-3.5" />
        {t("common.live")}
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="ticker-track">
          {items ? (
            <>
              <TickerContent items={items} emptyLabel={t("ticker.no_prices")} />
              <TickerContent items={items} emptyLabel={t("ticker.no_prices")} />
            </>
          ) : (
            <span className="px-4 text-[13px] text-ink-muted">
              {t("ticker.loading")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
