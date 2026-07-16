import type { Kpis, SalesRow } from "./types";

export interface BiFilters {
  dateFrom: string | null;
  dateTo: string | null;
  grades: string[];
  customers: string[];
  statuses: string[];
  search: string;
}

export const EMPTY_FILTERS: BiFilters = {
  dateFrom: null,
  dateTo: null,
  grades: [],
  customers: [],
  statuses: [],
  search: "",
};

export function hasActiveFilters(filters: BiFilters): boolean {
  return Boolean(
    filters.dateFrom ||
      filters.dateTo ||
      filters.grades.length ||
      filters.customers.length ||
      filters.statuses.length ||
      filters.search.trim(),
  );
}

function rowMatchesFilters(row: SalesRow, filters: BiFilters): boolean {
  const date = String(row.date || "");
  if (filters.dateFrom && date && date < filters.dateFrom) return false;
  if (filters.dateTo && date && date > filters.dateTo) return false;

  const grade = String(row["rebar grade"] || "");
  if (filters.grades.length && !filters.grades.includes(grade)) return false;

  const customer = String(row.customer || "");
  if (filters.customers.length && !filters.customers.includes(customer)) return false;

  const status = String(row.status || "");
  if (filters.statuses.length && !filters.statuses.includes(status)) return false;

  if (filters.search.trim()) {
    const needle = filters.search.trim().toLowerCase();
    const haystack = `${customer} ${grade} ${status} ${row.rep || ""} ${row.region || ""}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

export function applyFilters(rows: SalesRow[], filters: BiFilters): SalesRow[] {
  if (!hasActiveFilters(filters)) return rows;
  return rows.filter((r) => rowMatchesFilters(r, filters));
}

export interface FilteredAggregate {
  revenue: number;
  tonnage: number;
  avgPrice: number;
  conversionRate: number;
  dealCount: number;
  inquiryCount: number;
  byGrade: { grade: string; tonnage: number; revenue: number }[];
  byCustomer: { customer: string; tonnage: number; revenue: number; deals: number }[];
  byRegion: { region: string; tonnage: number; revenue: number }[];
  byMonth: { month: string; revenue: number; tonnage: number; deals: number }[];
}

export function aggregateRows(rows: SalesRow[]): FilteredAggregate {
  let revenue = 0;
  let tonnage = 0;
  let dealCount = 0;
  const grade: Record<string, { tonnage: number; revenue: number }> = {};
  const customer: Record<string, { tonnage: number; revenue: number; deals: number }> = {};
  const region: Record<string, { tonnage: number; revenue: number }> = {};
  const month: Record<string, { revenue: number; tonnage: number; deals: number }> = {};

  for (const r of rows) {
    const isWon = Number(r.conversion) === 1;
    if (!isWon) continue;
    const t = Number(r.tonnage) || 0;
    const p = Number(r["unit price"]) || 0;
    const rev = t * p;
    revenue += rev;
    tonnage += t;
    dealCount += 1;

    const g = String(r["rebar grade"] || "");
    if (g) {
      grade[g] ??= { tonnage: 0, revenue: 0 };
      grade[g].tonnage += t;
      grade[g].revenue += rev;
    }
    const c = String(r.customer || "");
    if (c) {
      customer[c] ??= { tonnage: 0, revenue: 0, deals: 0 };
      customer[c].tonnage += t;
      customer[c].revenue += rev;
      customer[c].deals += 1;
    }
    const rg = String(r.region || "");
    if (rg) {
      region[rg] ??= { tonnage: 0, revenue: 0 };
      region[rg].tonnage += t;
      region[rg].revenue += rev;
    }
    const m = String(r.date || "").slice(0, 7);
    if (m) {
      month[m] ??= { revenue: 0, tonnage: 0, deals: 0 };
      month[m].revenue += rev;
      month[m].tonnage += t;
      month[m].deals += 1;
    }
  }

  const inquiryCount = rows.length;
  return {
    revenue,
    tonnage,
    avgPrice: tonnage > 0 ? revenue / tonnage : 0,
    conversionRate: inquiryCount > 0 ? (dealCount / inquiryCount) * 100 : 0,
    dealCount,
    inquiryCount,
    byGrade: Object.entries(grade)
      .map(([g, d]) => ({ grade: g, ...d }))
      .sort((a, b) => b.revenue - a.revenue),
    byCustomer: Object.entries(customer)
      .map(([c, d]) => ({ customer: c, ...d }))
      .sort((a, b) => b.revenue - a.revenue),
    byRegion: Object.entries(region)
      .map(([r, d]) => ({ region: r, ...d }))
      .sort((a, b) => b.revenue - a.revenue),
    byMonth: Object.entries(month)
      .map(([m, d]) => ({ month: m, ...d }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  };
}

/** Builds a display-ready Kpis object from a filtered subset. Metrics that
 * can't be meaningfully recomputed client-side (price volatility, sales
 * cycle) fall back to the full-dataset value from the snapshot. */
export function aggregateToKpis(agg: FilteredAggregate, fallback: Kpis): Kpis {
  const top5Revenue = agg.byCustomer.slice(0, 5).reduce((sum, c) => sum + c.revenue, 0);
  return {
    ...fallback,
    revenue: agg.revenue,
    tonnage: agg.tonnage,
    avg_price: agg.avgPrice,
    conversion_rate: agg.conversionRate,
    converted_deals: agg.dealCount,
    total_inquiries: agg.inquiryCount,
    avg_deal_size: agg.dealCount > 0 ? agg.revenue / agg.dealCount : 0,
    top5_customer_concentration_pct: agg.revenue > 0 ? (top5Revenue / agg.revenue) * 100 : 0,
  };
}

export interface PeriodComparison {
  current: FilteredAggregate;
  previous: FilteredAggregate;
  deltas: {
    revenue: number | null;
    tonnage: number | null;
    avgPrice: number | null;
    conversionRate: number | null;
  };
}

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

/** Compares the currently filtered rows against an equal-length window immediately
 * preceding it. If no date filter is active, falls back to the last two months
 * found in the data. */
export function computeComparison(allRows: SalesRow[], filters: BiFilters): PeriodComparison | null {
  const dated = allRows.filter((r) => r.date);
  if (dated.length === 0) return null;

  let currentFrom = filters.dateFrom;
  let currentTo = filters.dateTo;

  if (!currentFrom || !currentTo) {
    const months = Array.from(new Set(dated.map((r) => String(r.date).slice(0, 7)))).sort();
    if (months.length < 2) return null;
    currentTo = `${months[months.length - 1]}-31`;
    currentFrom = `${months[months.length - 1]}-01`;
  }

  const fromDate = new Date(currentFrom);
  const toDate = new Date(currentTo);
  const spanMs = toDate.getTime() - fromDate.getTime();
  if (spanMs <= 0 || Number.isNaN(spanMs)) return null;

  const prevTo = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);
  const prevFrom = new Date(prevTo.getTime() - spanMs);

  const currentFilters: BiFilters = { ...filters, dateFrom: currentFrom, dateTo: currentTo };
  const previousFilters: BiFilters = {
    ...filters,
    dateFrom: prevFrom.toISOString().slice(0, 10),
    dateTo: prevTo.toISOString().slice(0, 10),
  };

  const currentAgg = aggregateRows(applyFilters(allRows, currentFilters));
  const previousAgg = aggregateRows(applyFilters(allRows, previousFilters));

  return {
    current: currentAgg,
    previous: previousAgg,
    deltas: {
      revenue: pctDelta(currentAgg.revenue, previousAgg.revenue),
      tonnage: pctDelta(currentAgg.tonnage, previousAgg.tonnage),
      avgPrice: pctDelta(currentAgg.avgPrice, previousAgg.avgPrice),
      conversionRate: pctDelta(currentAgg.conversionRate, previousAgg.conversionRate),
    },
  };
}
