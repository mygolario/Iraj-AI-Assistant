"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  IconCalculator,
  IconTrendUp,
  IconTrendDown,
  IconAvgPrice,
  IconPercent,
  IconRevenue,
} from "@/components/ui/icons";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

interface Result {
  revenue: number;
  grossProfit: number;
  netProfit: number;
  margin: number;
}

function compute(t: number, sp: number, pc: number, ov: number): Result {
  const revenue = t * sp;
  const grossProfit = t * (sp - pc);
  const netProfit = grossProfit - ov;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  return { revenue, grossProfit, netProfit, margin };
}

const inputCls =
  "h-10 w-full rounded-sm border border-line bg-bg-sunken px-3 text-sm font-medium text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-accent focus:bg-card";

export function DealCalculator({ compact = false }: { compact?: boolean }) {
  const t = useTranslations();
  const [vals, setVals] = React.useState({
    tonnage: 100,
    salePrice: 600,
    purchaseCost: 500,
    overhead: 2000,
  });

  const r = compute(vals.tonnage, vals.salePrice, vals.purchaseCost, vals.overhead);
  const profitable = r.netProfit >= 0;

  const fields = [
    { key: "tonnage" as const, label: t("calculator.tonnage"), suffix: "t", icon: IconCalculator },
    { key: "salePrice" as const, label: t("calculator.sale_price"), suffix: "/t", icon: IconRevenue },
    { key: "purchaseCost" as const, label: t("calculator.purchase_cost"), suffix: "/t", icon: IconAvgPrice },
    { key: "overhead" as const, label: t("calculator.fixed_overheads"), suffix: "", icon: IconPercent },
  ];

  const stats = [
    { label: t("calculator.total_revenue"), value: formatCurrency(r.revenue), icon: IconRevenue, tone: "neutral" as const },
    { label: t("calculator.gross_profit"), value: formatCurrency(r.grossProfit), icon: r.grossProfit >= 0 ? IconTrendUp : IconTrendDown, tone: r.grossProfit >= 0 ? "up" as const : "down" as const },
    { label: t("calculator.net_profit"), value: formatCurrency(r.netProfit), icon: r.netProfit >= 0 ? IconTrendUp : IconTrendDown, tone: profitable ? "up" as const : "down" as const },
    { label: t("calculator.net_margin"), value: formatPercent(r.margin), icon: IconPercent, tone: profitable ? "up" as const : "down" as const },
  ];

  const statText = {
    up: "text-positive",
    down: "text-negative",
    neutral: "text-ink",
  };

  return (
    <div className="flex flex-col gap-4">
      <div className={cn("grid gap-3", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink-muted">
              <f.icon className="size-3.5 text-ink-subtle" />
              {f.label}
            </span>
            <div className="relative">
              <input
                type="number"
                min={0}
                value={vals[f.key]}
                onChange={(e) =>
                  setVals((v) => ({ ...v, [f.key]: Number(e.target.value) || 0 }))
                }
                className={inputCls}
              />
              {f.suffix && (
                <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[12px] text-ink-subtle">
                  {f.suffix}
                </span>
              )}
            </div>
          </label>
        ))}
      </div>

      <div className={cn("grid gap-3", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
        {stats.map((s) => (
          <div
            key={s.label}
            className={cn(
              "rounded-sm border bg-card p-3.5 shadow-[var(--shadow-1)]",
              s.tone === "up" && "border-line",
              s.tone === "down" && "border-line",
              s.tone === "neutral" && "border-line",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-subtle">
                {s.label}
              </span>
              <s.icon className={cn("size-3.5", statText[s.tone])} />
            </div>
            <div
              className={cn(
                "mt-2 font-display text-xl leading-none tracking-tight tabular-nums",
                statText[s.tone],
              )}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div
        className={cn(
          "flex items-center gap-2 rounded-sm border px-4 py-2.5 text-sm font-medium",
          profitable
            ? "border-line bg-bg-subtle text-positive"
            : "border-line bg-bg-subtle text-negative",
        )}
      >
        {profitable ? <IconTrendUp className="size-4" /> : <IconTrendDown className="size-4" />}
        {profitable ? t("calculator.profitable") : t("calculator.loss")}
      </div>
    </div>
  );
}
