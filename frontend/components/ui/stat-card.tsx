import * as React from "react";
import { cn } from "@/lib/utils";

export type StatTone = "accent" | "ink" | "positive" | "negative" | "warning" | "info";

const toneText: Record<StatTone, string> = {
  accent: "text-accent",
  ink: "text-ink",
  positive: "text-positive",
  negative: "text-negative",
  warning: "text-warning",
  info: "text-info",
};

const toneIconBg: Record<StatTone, string> = {
  accent: "bg-accent-soft text-accent",
  ink: "bg-bg-subtle text-ink",
  positive: "bg-bg-subtle text-positive",
  negative: "bg-bg-subtle text-negative",
  warning: "bg-bg-subtle text-warning",
  info: "bg-bg-subtle text-info",
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "ink",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-subtle">
          {label}
        </span>
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-sm",
            toneIconBg[tone],
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <div
        className={cn(
          "mt-4 font-display text-[34px] leading-none tracking-tight tabular-nums",
          toneText[tone],
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-2 text-sm text-ink-muted">{sub}</div>}
    </div>
  );
}
