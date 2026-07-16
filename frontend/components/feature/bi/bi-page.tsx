"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import {
  IconAnalytics,
  IconTrendUp,
  IconUsers,
  IconTable,
  IconSpark,
  IconWarning,
  IconChevronDown,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { aggregateRows, aggregateToKpis, EMPTY_FILTERS, hasActiveFilters } from "@/lib/bi-filters";
import { BiEmptyState } from "./bi-empty-state";
import { BiFiltersBar } from "./bi-filters-bar";
import { BiKpiGrid } from "./bi-kpi-grid";
import { BiTrendChart } from "./bi-trend-chart";
import { BiMixPanels } from "./bi-mix-panels";
import { BiRecordsTable } from "./bi-records-table";
import { BiInsightsPanel } from "./bi-insights-panel";
import { BiDatasetSwitcher } from "./bi-dataset-switcher";
import { BiExportMenu } from "./bi-export-menu";
import { useBiData } from "./use-bi-data";

type Tab = "overview" | "trends" | "mix" | "records" | "insights";

const SKIP_REASON_LABEL_KEYS: Record<string, string> = {
  missing_required_columns: "bi.skip_reason_missing_required_columns",
  missing_tonnage_or_price: "bi.skip_reason_missing_tonnage_or_price",
  non_numeric_tonnage_or_price: "bi.skip_reason_non_numeric_tonnage_or_price",
  negative_value: "bi.skip_reason_negative_value",
};

function DataQualityBanner({
  rowsSkipped,
  rowsUsed,
  skippedReasons,
}: {
  rowsSkipped: number;
  rowsUsed: number;
  skippedReasons: Record<string, number>;
}) {
  const t = useTranslations();
  const [open, setOpen] = React.useState(false);
  if (rowsSkipped <= 0) return null;

  return (
    <div className="rounded-md border border-line bg-bg-subtle p-3.5 print:hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2.5 text-start">
        <IconWarning className="size-4 shrink-0 text-warning" />
        <p className="flex-1 text-[13px] text-ink-muted">
          {t("bi.data_quality_summary", { skipped: String(rowsSkipped), used: String(rowsUsed) })}
        </p>
        <IconChevronDown className={cn("size-4 shrink-0 text-ink-subtle transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="mt-3 flex flex-col gap-1 ps-6 text-[12px] text-ink-subtle">
          {Object.entries(skippedReasons).map(([reason, count]) => (
            <li key={reason}>
              {SKIP_REASON_LABEL_KEYS[reason] ? t(SKIP_REASON_LABEL_KEYS[reason]) : reason} ({count})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BiPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [tab, setTab] = React.useState<Tab>("overview");
  const [trendMetric, setTrendMetric] = React.useState<"revenue" | "tonnage">("revenue");
  const bi = useBiData();

  const handleFiles = async (files: File[], mode: "new" | "append" = "new") => {
    const file = files[0];
    if (!file) return;
    try {
      const snap = await bi.upload(file, { label: file.name, mode });
      toast.success(t("bi.processed"), {
        description: t("bi.processed_desc", {
          records: String(snap.rows.length),
          grades: String(snap.byGrade.length),
        }),
      });
    } catch (e) {
      toast.error(t("bi.process_failed"), { description: (e as Error).message });
    }
  };

  const current = bi.current;
  const filtersActive = hasActiveFilters(bi.filters);
  const displayAgg = React.useMemo(
    () => (current ? aggregateRows(bi.filteredRows) : null),
    [current, bi.filteredRows],
  );
  const displayKpis = React.useMemo(() => {
    if (!current) return null;
    return filtersActive && displayAgg ? aggregateToKpis(displayAgg, current.kpis) : current.kpis;
  }, [current, filtersActive, displayAgg]);

  const displayTimeSeries = filtersActive && displayAgg ? displayAgg.byMonth : current?.timeSeries ?? [];
  const displayByGrade = filtersActive && displayAgg ? displayAgg.byGrade : current?.byGrade ?? [];
  const displayByCustomer = filtersActive && displayAgg ? displayAgg.byCustomer : current?.byCustomer ?? [];
  const displayByRegion = filtersActive && displayAgg ? displayAgg.byRegion : current?.byRegion ?? [];

  const currentRows = React.useMemo(() => current?.rows ?? [], [current]);
  const gradeOptions = React.useMemo(
    () => Array.from(new Set(currentRows.map((r) => String(r["rebar grade"] || "")).filter(Boolean))),
    [currentRows],
  );
  const customerOptions = React.useMemo(
    () => Array.from(new Set(currentRows.map((r) => String(r.customer || "")).filter(Boolean))),
    [currentRows],
  );
  const statusOptions = React.useMemo(
    () => Array.from(new Set(currentRows.map((r) => String(r.status || "")).filter(Boolean))),
    [currentRows],
  );

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "overview", label: t("bi.tab_overview"), icon: IconAnalytics },
    { id: "trends", label: t("bi.tab_trends"), icon: IconTrendUp },
    { id: "mix", label: t("bi.tab_mix"), icon: IconUsers },
    { id: "records", label: t("bi.tab_records"), icon: IconTable },
    { id: "insights", label: t("bi.tab_insights"), icon: IconSpark },
  ];

  if (bi.snapshotsLoading || bi.currentLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-32 rounded-md" />
        ))}
      </div>
    );
  }

  if (!current) {
    return <BiEmptyState onFiles={(files) => handleFiles(files)} loading={bi.uploading} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BiDatasetSwitcher
          snapshots={bi.snapshots}
          currentId={current.id}
          onSelect={bi.selectSnapshot}
          onRename={bi.renameSnapshot}
          onDelete={bi.deleteSnapshot}
          onUploadNew={(file) => handleFiles([file], "new")}
          onAppend={(file) => handleFiles([file], "append")}
          uploading={bi.uploading}
        />
        <div className="print:hidden">
          <BiExportMenu snapshot={current} />
        </div>
      </div>

      <DataQualityBanner
        rowsSkipped={current.dataQuality.rows_skipped}
        rowsUsed={current.dataQuality.rows_used}
        skippedReasons={current.dataQuality.skipped_reasons}
      />

      <div className="print:hidden">
        <BiFiltersBar
          filters={bi.filters}
          onChange={bi.setFilters}
          gradeOptions={gradeOptions}
          customerOptions={customerOptions}
          statusOptions={statusOptions}
          compareEnabled={bi.prefs.compareEnabled}
          onCompareToggle={bi.setCompareEnabled}
        />
      </div>

      <div className="inline-flex w-fit flex-wrap gap-1 rounded-sm border border-line bg-card p-1 shadow-[var(--shadow-1)] print:hidden">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={cn(
              "relative flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors",
              tab === tabItem.id ? "text-accent-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {tab === tabItem.id && (
              <motion.span
                layoutId="bi-tab"
                className="absolute inset-0 rounded-sm bg-accent-soft"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <tabItem.icon className="relative size-4" />
            <span className="relative">{tabItem.label}</span>
          </button>
        ))}
      </div>

      <div key={tab} className="flex flex-col gap-5 transition-opacity duration-200">
        {tab === "overview" && displayKpis && (
          <>
            <BiKpiGrid
              kpis={displayKpis}
              timeSeries={displayTimeSeries}
              comparison={bi.prefs.compareEnabled ? bi.comparison : null}
              pinnedKpis={bi.prefs.pinnedKpis}
              onTogglePin={bi.togglePinnedKpi}
            />
            <BiTrendChart
              timeSeries={displayTimeSeries}
              forecast={filtersActive ? null : current.forecast}
              metric={trendMetric}
              onMetricChange={setTrendMetric}
            />
          </>
        )}

        {tab === "trends" && (
          <BiTrendChart
            timeSeries={displayTimeSeries}
            forecast={filtersActive ? null : current.forecast}
            metric={trendMetric}
            onMetricChange={setTrendMetric}
          />
        )}

        {tab === "mix" && (
          <BiMixPanels
            byGrade={displayByGrade}
            byCustomer={displayByCustomer}
            byRep={filtersActive ? [] : current.byRep}
            byRegion={displayByRegion}
            margin={filtersActive ? null : current.margin}
            anomalies={filtersActive ? [] : current.anomalies}
            onGradeClick={(grade) => bi.setFilters({ ...bi.filters, grades: [grade] })}
            onCustomerClick={(customer) => bi.setFilters({ ...bi.filters, customers: [customer] })}
          />
        )}

        {tab === "records" && <BiRecordsTable rows={bi.filteredRows} />}

        {tab === "insights" && (
          <BiInsightsPanel snapshotId={current.id} language={locale === "fa" ? "fa" : "en"} />
        )}
      </div>

      <div className="print:hidden">
        <button
          onClick={() => bi.setFilters(EMPTY_FILTERS)}
          className={cn("text-[12px] text-ink-subtle underline-offset-2 hover:underline", !filtersActive && "hidden")}
        >
          {t("bi.clear_filters")}
        </button>
      </div>
    </div>
  );
}
