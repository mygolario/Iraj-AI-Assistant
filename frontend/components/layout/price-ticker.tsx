"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { IconActivity, IconBolt } from "@/components/ui/icons";
import { api } from "@/lib/api";
import type { PriceFeed } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function TickerContent({ items, noPriceLabel }: { items: PriceFeed[]; noPriceLabel: string }) {
  if (items.length === 0) {
    return (
      <span className="inline-flex items-center gap-2 px-4 text-ink-muted">
        <IconBolt className="size-3.5 text-accent" />
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
            <span className="text-ink-subtle">t.me/s/{item.channel}</span>
            {priced ? (
              <span className="font-mono font-semibold text-ink">
                {formatCurrency(item.price, item.currency)}
                {item.currency !== "USD" && (
                  <span className="ms-1 text-[11px] text-ink-subtle">
                    /{item.currency}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-[11px] text-ink-subtle">{noPriceLabel}</span>
            )}
            <span className="text-[11px] text-ink-subtle">· {item.date}</span>
            <span className="text-line">|</span>
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
    <div className="flex items-center gap-3 border-e border-line bg-bg-subtle px-3 py-1.5">
      <div className="flex shrink-0 items-center gap-1.5 rounded-sm bg-accent-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-ink">
        <IconActivity className="size-3.5" />
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
            <span className="px-4 text-[13px] text-ink-muted">
              {t("ticker.loading")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
