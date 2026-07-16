"use client";

import { useTheme } from "next-themes";

// Warm chart palettes — graphite + copper + neutral steps. No indigo/violet/cyan.
// SVG fill/stroke attributes don't resolve CSS vars reliably, so we keep two
// hex palettes and pick via useTheme.
const GRADE_COLORS_LIGHT = ["#b45309", "#1a1815", "#8a8478", "#c68a2e", "#3f7d52", "#3d6b8c", "#d6cfc1", "#5c574f"];
const GRADE_COLORS_DARK = ["#c68a2e", "#f0ebe0", "#8a8273", "#d97706", "#6ea87f", "#6b9bb8", "#3a352c", "#b3ab9a"];

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return {
    isDark,
    gradeColors: isDark ? GRADE_COLORS_DARK : GRADE_COLORS_LIGHT,
    gridStroke: isDark ? "rgba(240,235,224,0.08)" : "#e4dfd4",
    tickFill: isDark ? "#a89f8e" : "#8a8478",
    cursorFill: isDark ? "rgba(240,235,224,0.04)" : "#f4f1ec",
  };
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-line bg-card px-3 py-2 text-[12px] shadow-[var(--shadow-3)]">
      <div className="mb-1 font-semibold text-ink">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-ink-muted">{p.name}:</span>
          <span className="font-semibold text-ink tabular-nums">{formatter(p.value)}</span>
        </div>
      ))}
    </div>
  );
}
