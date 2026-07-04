"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  IconRevenue,
  IconTonnage,
  IconAvgPrice,
  IconConversion,
  IconTable,
  IconAnalytics,
  IconLoader,
} from "@/components/ui/icons";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { api } from "@/lib/api";
import type { BiResult } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { StatCard } from "@/components/ui/stat-card";

// Warm chart palettes — graphite + copper + neutral steps. No indigo/violet/cyan.
// SVG fill/stroke attributes don't resolve CSS vars reliably, so we keep two
// hex palettes and pick via useTheme. Cream ink replaces graphite on dark.
const GRADE_COLORS_LIGHT = [
  "#b45309",
  "#1a1815",
  "#8a8478",
  "#c68a2e",
  "#3f7d52",
  "#3d6b8c",
  "#d6cfc1",
  "#5c574f",
];

const GRADE_COLORS_DARK = [
  "#c68a2e",
  "#f0ebe0",
  "#8a8273",
  "#d97706",
  "#6ea87f",
  "#6b9bb8",
  "#3a352c",
  "#b3ab9a",
];

function ChartTooltip({
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

export function BiPage() {
  const t = useTranslations();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gradeColors = isDark ? GRADE_COLORS_DARK : GRADE_COLORS_LIGHT;
  const gridStroke = isDark ? "rgba(240,235,224,0.08)" : "#e4dfd4";
  const tickFill = isDark ? "#a89f8e" : "#8a8478";
  const cursorFill = isDark ? "rgba(240,235,224,0.04)" : "#f4f1ec";
  const [result, setResult] = React.useState<BiResult | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setLoading(true);
    try {
      const res = await api.bi.upload(file);
      setResult(res);
      try {
        localStorage.setItem("iraj-last-bi", JSON.stringify(res));
      } catch {
        /* ignore */
      }
      toast.success(t("bi.processed"), {
        description: t("bi.processed_desc", { records: String(res.rows.length), grades: String(res.byGrade.length) }),
      });
    } catch (e) {
      toast.error(t("bi.process_failed"), { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const k = result?.kpis;

  return (
    <div className="flex flex-col gap-6">
      <FileDropzone
        accept={{ "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }}
        onFiles={handleUpload}
        label={t("bi.upload_label")}
        hint={t("bi.upload_hint")}
      />

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 rounded-md" />
          ))}
        </div>
      )}

      {!loading && k && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("bi.total_revenue")} value={formatCurrency(k.revenue)} icon={IconRevenue} tone="accent" sub={t("bi.total_revenue_sub")} />
            <StatCard label={t("bi.volume_sold")} value={formatNumber(k.tonnage, " t")} icon={IconTonnage} tone="ink" sub={t("bi.volume_sold_sub")} />
            <StatCard label={t("bi.avg_price")} value={formatCurrency(k.avg_price)} icon={IconAvgPrice} tone="ink" sub={t("bi.avg_price_sub")} />
            <StatCard label={t("bi.conversion")} value={formatPercent(k.conversion_rate)} icon={IconConversion} tone="positive" sub={t("bi.conversion_sub")} />
          </div>

          {result!.byGrade.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]">
                <div className="mb-4 flex items-center gap-2">
                  <IconAnalytics className="size-4 text-accent" />
                  <h3 className="font-display text-base leading-tight tracking-tight text-ink">{t("bi.tonnage_by_grade")}</h3>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={result!.byGrade} margin={{ top: 4, right: 8, bottom: 4, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="grade" tick={{ fill: tickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: tickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: cursorFill }} content={<ChartTooltip formatter={(v: number) => formatNumber(v, " t")} />} />
                    <Bar dataKey="tonnage" name="Tonnage" radius={[3, 3, 0, 0]} maxBarSize={48}>
                      {result!.byGrade.map((_, i) => (
                        <Cell key={i} fill={gradeColors[i % gradeColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]">
                <div className="mb-4 flex items-center gap-2">
                  <IconAnalytics className="size-4 text-ink-muted" />
                  <h3 className="font-display text-base leading-tight tracking-tight text-ink">{t("bi.revenue_by_grade")}</h3>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={result!.byGrade} margin={{ top: 4, right: 8, bottom: 4, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="grade" tick={{ fill: tickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: tickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: cursorFill }} content={<ChartTooltip formatter={(v: number) => formatCurrency(v)} />} />
                    <Bar dataKey="revenue" name="Revenue" radius={[3, 3, 0, 0]} maxBarSize={48}>
                      {result!.byGrade.map((_, i) => (
                        <Cell key={i} fill={gradeColors[(i + 1) % gradeColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {result!.rows.length > 0 && (
            <div className="rounded-md border border-line bg-card shadow-[var(--shadow-1)]">
              <div className="flex items-center gap-2 border-b border-line px-5 py-4">
                <IconTable className="size-4 text-ink-muted" />
                <h3 className="font-display text-base leading-tight tracking-tight text-ink">{t("bi.sales_records")}</h3>
                <span className="ms-auto text-[13px] text-ink-muted">
                  {result!.rows.length} {t("common.records")}
                </span>
              </div>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-start text-sm">
                  <thead className="sticky top-0 bg-bg-subtle">
                    <tr className="text-ink-subtle">
                      {[t("common.date"), t("common.customer"), t("common.grade"), t("common.tonnage"), t("common.unit_price"), t("common.status")].map(
                        (h) => (
                          <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]">
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {result!.rows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-t border-line transition-colors hover:bg-bg-subtle"
                      >
                        <td className="px-4 py-2.5 text-ink-muted">{row.date || "—"}</td>
                        <td className="px-4 py-2.5 font-medium text-ink">
                          {row.customer || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" size="sm" className="font-mono">
                            {row["rebar grade"] || "—"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-ink">{formatNumber(Number(row.tonnage), " t")}</td>
                        <td className="px-4 py-2.5 tabular-nums text-ink">
                          {formatCurrency(Number(row["unit price"]))}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant={
                              String(row.status).toLowerCase().includes("close") ||
                              String(row.status).toLowerCase().includes("convert")
                                ? "positive"
                                : "neutral"
                            }
                            size="sm"
                          >
                            {row.status || "—"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !result && (
        <div className="flex flex-col items-center gap-3 rounded-md border border-line bg-card py-16 text-center shadow-[var(--shadow-1)]">
          <IconLoader className="size-7 text-ink-subtle" />
          <p className="text-sm text-ink-muted">{t("bi.empty_state")}</p>
        </div>
      )}
    </div>
  );
}
