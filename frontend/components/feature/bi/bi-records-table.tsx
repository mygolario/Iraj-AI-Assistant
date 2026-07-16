"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { IconTable, IconChevronDown } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { SalesRow } from "@/lib/types";

type SortKey = "date" | "customer" | "rebar grade" | "tonnage" | "unit price" | "status";

const PAGE_SIZE = 25;

export function BiRecordsTable({ rows }: { rows: SalesRow[] }) {
  const t = useTranslations();
  const [sortKey, setSortKey] = React.useState<SortKey>("date");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(0);
  const [rowsRef, setRowsRef] = React.useState(rows);

  // Reset to page 0 whenever the underlying row set changes (new upload,
  // filter change, tab switch) — derived during render rather than in an
  // effect, so there's no extra render/flash of the previous page.
  if (rowsRef !== rows) {
    setRowsRef(rows);
    if (page !== 0) setPage(0);
  }

  const sorted = React.useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const columns: { key: SortKey; label: string }[] = [
    { key: "date", label: t("common.date") },
    { key: "customer", label: t("common.customer") },
    { key: "rebar grade", label: t("common.grade") },
    { key: "tonnage", label: t("common.tonnage") },
    { key: "unit price", label: t("common.unit_price") },
    { key: "status", label: t("common.status") },
  ];

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-line bg-card py-14 text-center shadow-[var(--shadow-1)]">
        <IconTable className="size-6 text-ink-subtle" />
        <p className="text-sm text-ink-muted">{t("bi.no_records_match")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line bg-card shadow-[var(--shadow-1)]">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <IconTable className="size-4 text-ink-muted" />
        <h3 className="font-display text-base leading-tight tracking-tight text-ink">{t("bi.sales_records")}</h3>
        <span className="ms-auto text-[13px] text-ink-muted">
          {rows.length} {t("common.records")}
        </span>
      </div>
      <div className="max-h-[28rem] overflow-auto">
        <table className="w-full text-start text-sm">
          <thead className="sticky top-0 bg-bg-subtle">
            <tr className="text-ink-subtle">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]">
                  <button
                    onClick={() => toggleSort(col.key)}
                    className="flex items-center gap-1 transition-colors hover:text-ink"
                  >
                    {col.label}
                    {sortKey === col.key && (
                      <IconChevronDown className={cn("size-3 transition-transform", sortDir === "asc" && "rotate-180")} />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i} className="border-t border-line transition-colors hover:bg-bg-subtle">
                <td className="px-4 py-2.5 text-ink-muted">{formatDate(row.date) || "—"}</td>
                <td className="px-4 py-2.5 font-medium text-ink">{row.customer || "—"}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" size="sm" className="font-mono">
                    {row["rebar grade"] || "—"}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 tabular-nums text-ink">{formatNumber(Number(row.tonnage), " t")}</td>
                <td className="px-4 py-2.5 tabular-nums text-ink">{formatCurrency(Number(row["unit price"]))}</td>
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
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-line px-5 py-3">
          <span className="text-[13px] text-ink-muted">
            {t("bi.page_of", { current: String(page + 1), total: String(totalPages) })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
