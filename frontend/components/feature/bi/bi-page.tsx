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
  DollarSign,
  Layers,
  Tag,
  Percent,
  Table2,
  BarChart3,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { BiResult } from "@/lib/types";
import { cn, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { StatCard } from "@/components/ui/stat-card";

const GRADE_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#22d3ee",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#60a5fa",
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
    <div className="glass-strong rounded-lg px-3 py-2 text-xs">
      <div className="mb-1 font-semibold text-foreground">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{formatter(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function BiPage() {
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
      toast.success("Sales sheet processed", {
        description: `${res.rows.length} records · ${res.byGrade.length} grades`,
      });
    } catch (e) {
      toast.error("Failed to process file", { description: (e as Error).message });
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
        label="Upload sales log (CSV or XLSX)"
        hint="Columns: Date, Customer, Rebar Grade, Tonnage, Unit Price, Status, Conversion"
      />

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      )}

      {!loading && k && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Revenue" value={formatCurrency(k.revenue)} icon={DollarSign} tone="primary" delay={0} sub="Converted deals" />
            <StatCard label="Volume Sold" value={formatNumber(k.tonnage, " t")} icon={Layers} tone="secondary" delay={60} sub="Converted tonnage" />
            <StatCard label="Avg Price" value={formatCurrency(k.avg_price)} icon={Tag} tone="accent" delay={120} sub="Weighted mean" />
            <StatCard label="Conversion" value={formatPercent(k.conversion_rate)} icon={Percent} tone="success" delay={180} sub="Closed / inquiries" />
          </div>

          {result!.byGrade.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="glass rounded-2xl p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" />
                  <h3 className="font-display text-sm font-semibold">Tonnage by Grade</h3>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={result!.byGrade} margin={{ top: 4, right: 8, bottom: 4, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="grade" tick={{ fill: "#8b90a8", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#8b90a8", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<ChartTooltip formatter={(v: number) => formatNumber(v, " t")} />} />
                    <Bar dataKey="tonnage" name="Tonnage" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {result!.byGrade.map((_, i) => (
                        <Cell key={i} fill={GRADE_COLORS[i % GRADE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="glass rounded-2xl p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="size-4 text-secondary" />
                  <h3 className="font-display text-sm font-semibold">Revenue by Grade</h3>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={result!.byGrade} margin={{ top: 4, right: 8, bottom: 4, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="grade" tick={{ fill: "#8b90a8", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#8b90a8", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<ChartTooltip formatter={(v: number) => formatCurrency(v)} />} />
                    <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {result!.byGrade.map((_, i) => (
                        <Cell key={i} fill={GRADE_COLORS[(i + 1) % GRADE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {result!.rows.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <div className="mb-4 flex items-center gap-2">
                <Table2 className="size-4 text-accent" />
                <h3 className="font-display text-sm font-semibold">Sales Records</h3>
                <span className="ml-auto text-xs text-muted-foreground">
                  {result!.rows.length} records
                </span>
              </div>
              <div className="max-h-96 overflow-auto rounded-xl border border-white/[0.06]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#0c0c14]/95 backdrop-blur">
                    <tr className="text-muted-foreground">
                      {["Date", "Customer", "Grade", "Tonnage", "Unit Price", "Status"].map(
                        (h) => (
                          <th key={h} className="px-3 py-2.5 font-semibold uppercase tracking-wide">
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
                        className="border-t border-white/[0.04] transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-3 py-2.5 text-muted-foreground">{row.date || "—"}</td>
                        <td className="px-3 py-2.5 font-medium text-foreground">
                          {row.customer || "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-md bg-secondary/15 px-2 py-0.5 font-mono text-[10px] text-secondary">
                            {row["rebar grade"] || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">{formatNumber(Number(row.tonnage), " t")}</td>
                        <td className="px-3 py-2.5 tabular-nums text-primary">
                          {formatCurrency(Number(row["unit price"]))}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[10px] font-medium",
                              String(row.status).toLowerCase().includes("close") ||
                                String(row.status).toLowerCase().includes("convert")
                                ? "bg-success/15 text-success"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {row.status || "—"}
                          </span>
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
        <div className="glass flex flex-col items-center gap-3 rounded-2xl py-16 text-center">
          <Loader2 className="size-7 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Upload a sales sheet to compute KPIs, charts, and a records preview.
          </p>
        </div>
      )}
    </div>
  );
}
