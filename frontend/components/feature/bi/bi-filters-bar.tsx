"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { IconTune, IconSearch, IconCross } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EMPTY_FILTERS, hasActiveFilters, type BiFilters } from "@/lib/bi-filters";

const inputCls =
  "h-9 rounded-sm border border-line bg-bg-sunken px-3 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-accent focus:bg-card";

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (options.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          inputCls,
          "flex items-center gap-1.5",
          selected.length > 0 && "border-accent text-accent-ink",
        )}
      >
        {label}
        {selected.length > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
            {selected.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1.5 max-h-64 w-56 overflow-auto rounded-md border border-line bg-card p-1.5 shadow-[var(--shadow-3)]">
          {options.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] text-ink hover:bg-bg-subtle"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange(checked ? selected.filter((s) => s !== opt) : [...selected, opt])
                  }
                  className="size-3.5 accent-[var(--accent)]"
                />
                <span className="truncate">{opt || "—"}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function BiFiltersBar({
  filters,
  onChange,
  gradeOptions,
  customerOptions,
  statusOptions,
  compareEnabled,
  onCompareToggle,
}: {
  filters: BiFilters;
  onChange: (next: BiFilters) => void;
  gradeOptions: string[];
  customerOptions: string[];
  statusOptions: string[];
  compareEnabled: boolean;
  onCompareToggle: (enabled: boolean) => void;
}) {
  const t = useTranslations();
  const active = hasActiveFilters(filters);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-card p-2.5 shadow-[var(--shadow-1)]">
      <div className="flex items-center gap-1.5 px-1 text-ink-subtle">
        <IconTune className="size-4" />
        <span className="text-[12px] font-medium uppercase tracking-[0.06em]">{t("bi.filters")}</span>
      </div>

      <div className="relative">
        <IconSearch className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-subtle" />
        <input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder={t("bi.search_placeholder")}
          className={cn(inputCls, "w-48 ps-8")}
        />
      </div>

      <input
        type="date"
        value={filters.dateFrom ?? ""}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || null })}
        className={inputCls}
        aria-label={t("bi.date_from")}
      />
      <span className="text-ink-subtle">–</span>
      <input
        type="date"
        value={filters.dateTo ?? ""}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value || null })}
        className={inputCls}
        aria-label={t("bi.date_to")}
      />

      <MultiSelect
        label={t("common.grade")}
        options={gradeOptions}
        selected={filters.grades}
        onChange={(grades) => onChange({ ...filters, grades })}
      />
      <MultiSelect
        label={t("common.customer")}
        options={customerOptions}
        selected={filters.customers}
        onChange={(customers) => onChange({ ...filters, customers })}
      />
      <MultiSelect
        label={t("common.status")}
        options={statusOptions}
        selected={filters.statuses}
        onChange={(statuses) => onChange({ ...filters, statuses })}
      />

      <label className="ms-auto flex items-center gap-2 px-1 text-[13px] text-ink-muted">
        <input
          type="checkbox"
          checked={compareEnabled}
          onChange={(e) => onCompareToggle(e.target.checked)}
          className="size-3.5 accent-[var(--accent)]"
        />
        {t("bi.compare_previous_period")}
      </label>

      {active && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="flex items-center gap-1 rounded-sm border border-line-strong px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:bg-bg-subtle hover:text-ink"
        >
          <IconCross className="size-3" />
          {t("bi.clear_filters")}
        </button>
      )}

      {active && (
        <Badge variant="accent" size="sm">
          {t("bi.filters_active")}
        </Badge>
      )}
    </div>
  );
}
