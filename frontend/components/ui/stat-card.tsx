import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Tone = "primary" | "secondary" | "accent" | "success" | "destructive";

const toneMap: Record<Tone, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent",
  success: "text-success",
  destructive: "text-destructive",
};

const bgMap: Record<Tone, string> = {
  primary: "bg-primary/15",
  secondary: "bg-secondary/15",
  accent: "bg-accent/15",
  success: "bg-success/15",
  destructive: "bg-destructive/15",
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "primary",
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: Tone;
  delay?: number;
}) {
  return (
    <div
      className="glass gradient-border rounded-2xl p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            bgMap[tone],
          )}
        >
          <Icon className={cn("size-4", toneMap[tone])} />
        </div>
      </div>
      <div className={cn("mt-3 font-display text-2xl font-bold tabular-nums", toneMap[tone])}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
