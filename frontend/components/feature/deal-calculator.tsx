"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Calculator, TrendingUp, TrendingDown, Wallet, Percent, DollarSign } from "lucide-react";
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

const FIELDS = [
  { key: "tonnage", label: "Tonnage", suffix: "t", icon: Calculator },
  { key: "salePrice", label: "Sale Price", suffix: "/t", icon: DollarSign },
  { key: "purchaseCost", label: "Purchase Cost", suffix: "/t", icon: Wallet },
  { key: "overhead", label: "Fixed Overheads", suffix: "", icon: Percent },
] as const;

export function DealCalculator({ compact = false }: { compact?: boolean }) {
  const [vals, setVals] = React.useState({
    tonnage: 100,
    salePrice: 600,
    purchaseCost: 500,
    overhead: 2000,
  });

  const r = compute(vals.tonnage, vals.salePrice, vals.purchaseCost, vals.overhead);
  const profitable = r.netProfit >= 0;

  const stats = [
    { label: "Total Revenue", value: formatCurrency(r.revenue), icon: DollarSign, tone: "neutral" },
    { label: "Gross Profit", value: formatCurrency(r.grossProfit), icon: TrendingUp, tone: r.grossProfit >= 0 ? "up" : "down" },
    { label: "Net Profit", value: formatCurrency(r.netProfit), icon: r.netProfit >= 0 ? TrendingUp : TrendingDown, tone: profitable ? "up" : "down" },
    { label: "Net Margin", value: formatPercent(r.margin), icon: Percent, tone: profitable ? "up" : "down" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className={cn("grid gap-3", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <f.icon className="size-3.5" />
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
                className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/20"
              />
              {f.suffix && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {f.suffix}
                </span>
              )}
            </div>
          </label>
        ))}
      </div>

      <div className={cn("grid gap-3", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={cn(
              "glass rounded-xl p-3.5",
              s.tone === "up" && "ring-1 ring-success/20",
              s.tone === "down" && "ring-1 ring-destructive/20",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {s.label}
              </span>
              <s.icon
                className={cn(
                  "size-3.5",
                  s.tone === "up" && "text-success",
                  s.tone === "down" && "text-destructive",
                  s.tone === "neutral" && "text-muted-foreground",
                )}
              />
            </div>
            <div
              className={cn(
                "mt-1.5 font-display text-lg font-bold tabular-nums",
                s.tone === "up" && "text-success",
                s.tone === "down" && "text-destructive",
                s.tone === "neutral" && "text-foreground",
              )}
            >
              {s.value}
            </div>
          </motion.div>
        ))}
      </div>

      <div
        className={cn(
          "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium",
          profitable
            ? "bg-success/10 text-success"
            : "bg-destructive/10 text-destructive",
        )}
      >
        {profitable ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
        {profitable
          ? "Profitable deal — healthy margin."
          : "This deal runs at a loss at the current inputs."}
      </div>
    </div>
  );
}
