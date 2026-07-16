"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import {
  IconRevenue,
  IconTonnage,
  IconAvgPrice,
  IconConversion,
  IconUsers,
  IconActivity,
  IconRoute,
  IconTrendUp,
  IconTrendDown,
  IconPin,
  IconTune,
} from "@/components/ui/icons";
import { StatCard, type StatTone } from "@/components/ui/stat-card";
import { cn, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import type { Kpis, TimeSeriesPoint } from "@/lib/types";
import type { PeriodComparison } from "@/lib/bi-filters";
import { KPI_CARD_KEYS, type KpiCardKey } from "./use-bi-data";

const KPI_META: Record<
  KpiCardKey,
  {
    icon: React.ComponentType<{ className?: string }>;
    tone: StatTone;
    sparklineKey?: "revenue" | "tonnage" | "deals";
    format: (kpis: Kpis) => string;
    deltaKey?: keyof PeriodComparison["deltas"];
  }
> = {
  revenue: {
    icon: IconRevenue,
    tone: "accent",
    sparklineKey: "revenue",
    format: (k) => formatCurrency(k.revenue),
    deltaKey: "revenue",
  },
  tonnage: {
    icon: IconTonnage,
    tone: "ink",
    sparklineKey: "tonnage",
    format: (k) => formatNumber(k.tonnage, " t"),
    deltaKey: "tonnage",
  },
  avg_price: {
    icon: IconAvgPrice,
    tone: "ink",
    format: (k) => formatCurrency(k.avg_price),
    deltaKey: "avgPrice",
  },
  conversion_rate: {
    icon: IconConversion,
    tone: "positive",
    format: (k) => formatPercent(k.conversion_rate),
    deltaKey: "conversionRate",
  },
  avg_deal_size: {
    icon: IconRoute,
    tone: "info",
    format: (k) => formatCurrency(k.avg_deal_size),
  },
  top5_customer_concentration_pct: {
    icon: IconUsers,
    tone: "warning",
    format: (k) => formatPercent(k.top5_customer_concentration_pct),
  },
  price_volatility: {
    icon: IconActivity,
    tone: "info",
    format: (k) => formatCurrency(k.price_volatility),
  },
  avg_sales_cycle_days: {
    icon: IconRoute,
    tone: "ink",
    format: (k) => (k.avg_sales_cycle_days == null ? "—" : `${k.avg_sales_cycle_days} d`),
  },
};

function Sparkline({ data, dataKey }: { data: TimeSeriesPoint[]; dataKey: "revenue" | "tonnage" | "deals" }) {
  if (data.length < 2) return null;
  return (
    <div className="mt-2 h-8 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="var(--accent)"
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DeltaChip({ value }: { value: number | null }) {
  const t = useTranslations();
  if (value === null) return null;
  const isFlat = Math.abs(value) < 0.5;
  const isUp = value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold",
        isFlat ? "bg-bg-subtle text-ink-subtle" : isUp ? "bg-bg-subtle text-positive" : "bg-bg-subtle text-negative",
      )}
      title={t("bi.vs_previous_period")}
    >
      {!isFlat && (isUp ? <IconTrendUp className="size-3" /> : <IconTrendDown className="size-3" />)}
      {isFlat ? "±0%" : `${isUp ? "+" : ""}${value.toFixed(1)}%`}
    </span>
  );
}

function KpiCard({
  cardKey,
  kpis,
  timeSeries,
  comparison,
  pinned,
  editMode,
  onTogglePin,
}: {
  cardKey: KpiCardKey;
  kpis: Kpis;
  timeSeries: TimeSeriesPoint[];
  comparison: PeriodComparison | null;
  pinned: boolean;
  editMode: boolean;
  onTogglePin: (key: KpiCardKey) => void;
}) {
  const t = useTranslations();
  const meta = KPI_META[cardKey];
  const delta = meta.deltaKey && comparison ? comparison.deltas[meta.deltaKey] : null;

  return (
    <div className="relative">
      <StatCard
        label={t(`bi.kpi.${cardKey}.label`)}
        value={meta.format(kpis)}
        icon={meta.icon}
        tone={meta.tone}
        sub={
          <div className="flex items-center gap-2">
            <span>{t(`bi.kpi.${cardKey}.sub`)}</span>
            <DeltaChip value={delta} />
          </div>
        }
      />
      {meta.sparklineKey && <Sparkline data={timeSeries} dataKey={meta.sparklineKey} />}
      {editMode && (
        <button
          onClick={() => onTogglePin(cardKey)}
          className={cn(
            "absolute top-3 end-3 flex size-6 items-center justify-center rounded-sm border transition-colors",
            pinned
              ? "border-accent bg-accent-soft text-accent"
              : "border-line bg-card text-ink-subtle hover:text-ink",
          )}
          aria-label={t("bi.toggle_pin")}
        >
          <IconPin className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function BiKpiGrid({
  kpis,
  timeSeries,
  comparison,
  pinnedKpis,
  onTogglePin,
}: {
  kpis: Kpis;
  timeSeries: TimeSeriesPoint[];
  comparison: PeriodComparison | null;
  pinnedKpis: KpiCardKey[];
  onTogglePin: (key: KpiCardKey) => void;
}) {
  const t = useTranslations();
  const [editMode, setEditMode] = React.useState(false);
  const visibleKeys = editMode ? KPI_CARD_KEYS : pinnedKpis;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-medium text-ink-muted">
          {editMode ? t("bi.choose_kpis_hint") : t("bi.pinned_kpis")}
        </h3>
        <button
          onClick={() => setEditMode((e) => !e)}
          className="flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:bg-bg-subtle hover:text-ink"
        >
          <IconTune className="size-3.5" />
          {editMode ? t("common.done") : t("bi.customize")}
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visibleKeys.map((key) => (
          <KpiCard
            key={key}
            cardKey={key}
            kpis={kpis}
            timeSeries={timeSeries}
            comparison={comparison}
            pinned={pinnedKpis.includes(key)}
            editMode={editMode}
            onTogglePin={onTogglePin}
          />
        ))}
      </div>
    </div>
  );
}
