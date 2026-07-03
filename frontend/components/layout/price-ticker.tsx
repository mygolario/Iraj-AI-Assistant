"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Activity, Zap } from "lucide-react";
import { api } from "@/lib/api";
import type { PriceFeed } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function TickerContent({ items, noPriceLabel }: { items: PriceFeed[]; noPriceLabel: string }) {
  if (items.length === 0) {
    return (
      <span className="inline-flex items-center gap-2 px-4 text-muted-foreground">
        <Zap className="size-3.5 text-accent" />
        No live prices cached — run the scraper in Live Market to fetch feeds.
      </span>
    );
  }
  return (
    <>
      {items.map((item, i) => {
        const priced = item.price != null;
        return (
          <span key={i} className="inline-flex items-center gap-2 px-6">
            <span className="text-muted-foreground">t.me/s/{item.channel}</span>
            {priced ? (
              <span className="font-mono font-semibold text-primary">
                {formatCurrency(item.price, item.currency)}
                {item.currency !== "USD" && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    /{item.currency}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">{noPriceLabel}</span>
            )}
            <span className="text-xs text-muted-foreground/70">· {item.date}</span>
            <span className="text-white/10">|</span>
          </span>
        );
      })}
    </>
  );
}

export function PriceTicker() {
  const t = useTranslations();
  const [items, setItems] = useState<PriceFeed[] | null>(null);

  useEffect(() => {
    let active = true;
    api.market
      .prices()
      .then((data) => active && setItems(data))
      .catch(() => active && setItems([]));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="glass flex items-center gap-3 rounded-full border-white/[0.06] px-2 py-1">
      <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
        <Activity className="size-3.5" />
        {t("common.live")}
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="ticker-track">
          {items ? (
            <>
              <TickerContent items={items} noPriceLabel={t("common.no_price_parsed")} />
              <TickerContent items={items} noPriceLabel={t("common.no_price_parsed")} />
            </>
          ) : (
            <span className="px-4 text-muted-foreground">
              {t("ticker.loading")}
            </span>
          )}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-transparent to-[#08080d]" />
      </div>
    </div>
  );
}
