"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IconAnalytics, IconUsers, IconMapPin, IconGauge, IconActivity } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { formatCompactNumber, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import type { BiAnomaly, BiMargin, CustomerDatum, GradeDatum, RegionDatum, RepDatum } from "@/lib/types";
import { ChartTooltip, useChartTheme } from "./bi-chart-utils";

function BarPanel<T extends object>({
  title,
  icon: Icon,
  data,
  dataKey,
  nameKey,
  formatter,
  onBarClick,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  data: T[];
  dataKey: Extract<keyof T, string>;
  nameKey: Extract<keyof T, string>;
  formatter: (v: number) => string;
  onBarClick?: (name: string) => void;
}) {
  const { gridStroke, tickFill, cursorFill, gradeColors } = useChartTheme();
  if (data.length === 0) return null;

  // Recharts' generic dataKey typing doesn't infer well through this wrapper's
  // own generic T, so the untyped chart primitives below take the row shape
  // as plain records; the public props above stay strongly typed.
  const chartRows = data.slice(0, 10) as unknown as Record<string, unknown>[];

  return (
    <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-4 text-accent" />
        <h3 className="font-display text-base leading-tight tracking-tight text-ink">{title}</h3>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartRows} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis
            dataKey={nameKey}
            tick={{ fill: tickFill, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fill: tickFill, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) => formatCompactNumber(v)}
          />
          <Tooltip cursor={{ fill: cursorFill }} content={<ChartTooltip formatter={formatter} />} />
          <Bar
            dataKey={dataKey}
            name={title}
            radius={[3, 3, 0, 0]}
            maxBarSize={40}
            onClick={(entry) => {
              const d = entry as unknown as Record<string, unknown>;
              onBarClick?.(String(d[nameKey]));
            }}
            cursor={onBarClick ? "pointer" : undefined}
          >
            {chartRows.map((_, i) => (
              <Cell key={i} fill={gradeColors[i % gradeColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MarginCard({ margin }: { margin: BiMargin | null }) {
  const t = useTranslations();
  if (!margin) return null;
  return (
    <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]">
      <div className="mb-3 flex items-center gap-2">
        <IconGauge className="size-4 text-accent" />
        <h3 className="font-display text-base leading-tight tracking-tight text-ink">{t("bi.margin_title")}</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-subtle">
            {t("bi.gross_profit")}
          </div>
          <div className="mt-1 font-display text-2xl tabular-nums text-ink">{formatCurrency(margin.gross_profit)}</div>
        </div>
        <div>
          <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-subtle">
            {t("bi.gross_margin_pct")}
          </div>
          <div className="mt-1 font-display text-2xl tabular-nums text-positive">
            {formatPercent(margin.gross_margin_pct)}
          </div>
        </div>
      </div>
    </div>
  );
}

const ANOMALY_LABEL_KEYS: Record<string, string> = {
  price_outlier: "bi.anomaly_type_price_outlier",
  revenue_drop: "bi.anomaly_type_revenue_drop",
};

function AnomaliesPanel({ anomalies }: { anomalies: BiAnomaly[] }) {
  const t = useTranslations();
  if (anomalies.length === 0) return null;
  return (
    <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]">
      <div className="mb-3 flex items-center gap-2">
        <IconActivity className="size-4 text-warning" />
        <h3 className="font-display text-base leading-tight tracking-tight text-ink">{t("bi.anomalies_title")}</h3>
      </div>
      <div className="flex flex-col gap-2">
        {anomalies.slice(0, 6).map((a, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-sm border-s-2 border-warning bg-bg-subtle p-3">
            <Badge variant={a.type === "revenue_drop" ? "negative" : "warning"} size="sm">
              {ANOMALY_LABEL_KEYS[a.type] ? t(ANOMALY_LABEL_KEYS[a.type]) : a.type}
            </Badge>
            <p className="text-[13px] leading-relaxed text-ink-muted">{a.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BiMixPanels({
  byGrade,
  byCustomer,
  byRep,
  byRegion,
  margin,
  anomalies,
  onGradeClick,
  onCustomerClick,
}: {
  byGrade: GradeDatum[];
  byCustomer: CustomerDatum[];
  byRep: RepDatum[];
  byRegion: RegionDatum[];
  margin: BiMargin | null;
  anomalies: BiAnomaly[];
  onGradeClick: (grade: string) => void;
  onCustomerClick: (customer: string) => void;
}) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <BarPanel
          title={t("bi.tonnage_by_grade")}
          icon={IconAnalytics}
          data={byGrade}
          dataKey="tonnage"
          nameKey="grade"
          formatter={(v) => formatNumber(v, " t")}
          onBarClick={onGradeClick}
        />
        <BarPanel
          title={t("bi.revenue_by_grade")}
          icon={IconAnalytics}
          data={byGrade}
          dataKey="revenue"
          nameKey="grade"
          formatter={formatCurrency}
          onBarClick={onGradeClick}
        />
        <BarPanel
          title={t("bi.top_customers")}
          icon={IconUsers}
          data={byCustomer}
          dataKey="revenue"
          nameKey="customer"
          formatter={formatCurrency}
          onBarClick={onCustomerClick}
        />
        {byRegion.length > 0 && (
          <BarPanel
            title={t("bi.revenue_by_region")}
            icon={IconMapPin}
            data={byRegion}
            dataKey="revenue"
            nameKey="region"
            formatter={formatCurrency}
          />
        )}
        {byRep.length > 0 && (
          <BarPanel
            title={t("bi.rep_leaderboard")}
            icon={IconUsers}
            data={byRep}
            dataKey="revenue"
            nameKey="rep"
            formatter={formatCurrency}
          />
        )}
        <MarginCard margin={margin} />
      </div>
      <AnomaliesPanel anomalies={anomalies} />
    </div>
  );
}
