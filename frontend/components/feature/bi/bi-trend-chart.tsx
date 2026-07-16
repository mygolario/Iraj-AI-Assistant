"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IconTrendUp, IconDownload } from "@/components/ui/icons";
import { formatCompactNumber, formatCurrency, formatNumber } from "@/lib/utils";
import type { BiForecast, TimeSeriesPoint } from "@/lib/types";
import { exportChartAsPng } from "@/lib/bi-export";
import { ChartTooltip, useChartTheme } from "./bi-chart-utils";

export function BiTrendChart({
  timeSeries,
  forecast,
  metric,
  onMetricChange,
}: {
  timeSeries: TimeSeriesPoint[];
  forecast: BiForecast | null;
  metric: "revenue" | "tonnage";
  onMetricChange: (metric: "revenue" | "tonnage") => void;
}) {
  const t = useTranslations();
  const { gridStroke, tickFill, cursorFill } = useChartTheme();
  const chartRef = React.useRef<HTMLDivElement>(null);

  const chartData = React.useMemo(() => {
    const points = timeSeries.map((p) => ({ month: p.month, value: p[metric], forecast: null as number | null }));
    if (forecast && points.length > 0) {
      const nextMonthValue = metric === "revenue" ? forecast.next_month_revenue : forecast.next_month_tonnage;
      const last = points[points.length - 1];
      points[points.length - 1] = { ...last, forecast: last.value };
      points.push({ month: t("bi.forecast_label"), value: null as unknown as number, forecast: nextMonthValue });
    }
    return points;
  }, [timeSeries, forecast, metric, t]);

  const formatter = metric === "revenue" ? formatCurrency : (v: number) => formatNumber(v, " t");

  if (timeSeries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-line bg-card py-14 text-center shadow-[var(--shadow-1)]">
        <IconTrendUp className="size-6 text-ink-subtle" />
        <p className="text-sm text-ink-muted">{t("bi.no_trend_data")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconTrendUp className="size-4 text-accent" />
          <h3 className="font-display text-base leading-tight tracking-tight text-ink">{t("bi.trend_title")}</h3>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <div className="inline-flex rounded-sm border border-line bg-bg-subtle p-0.5">
            {(["revenue", "tonnage"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onMetricChange(m)}
                className={`rounded-sm px-3 py-1 text-[12px] font-medium transition-colors ${
                  metric === m ? "bg-card text-accent-ink shadow-[var(--shadow-1)]" : "text-ink-muted hover:text-ink"
                }`}
              >
                {t(m === "revenue" ? "bi.total_revenue" : "bi.volume_sold")}
              </button>
            ))}
          </div>
          <button
            onClick={() => chartRef.current && exportChartAsPng(chartRef.current, `${metric}-trend.png`)}
            className="flex size-8 items-center justify-center rounded-sm border border-line text-ink-subtle transition-colors hover:bg-bg-subtle hover:text-ink"
            aria-label={t("bi.export_chart_png")}
            title={t("bi.export_chart_png")}
          >
            <IconDownload className="size-3.5" />
          </button>
        </div>
      </div>
      <div ref={chartRef}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="bi-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="month" tick={{ fill: tickFill, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fill: tickFill, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => formatCompactNumber(v)}
            />
            <Tooltip cursor={{ fill: cursorFill }} content={<ChartTooltip formatter={formatter} />} />
            <Area
              type="monotone"
              dataKey="value"
              name={t(metric === "revenue" ? "bi.total_revenue" : "bi.volume_sold")}
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#bi-trend-fill)"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name={t("bi.forecast_label")}
              stroke="var(--ink-subtle)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3 }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {forecast && (
        <p className="mt-2 text-[12px] text-ink-subtle">
          {t("bi.forecast_note", { months: String(forecast.based_on_months) })}
        </p>
      )}
    </div>
  );
}
