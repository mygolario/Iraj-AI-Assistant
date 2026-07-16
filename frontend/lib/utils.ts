import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LATIN_LOCALE = "en-US";
const FA_LOCALE = "fa-IR";

function localeFromContext(): string {
  if (typeof document !== "undefined") {
    return document.documentElement.lang === "fa" ? FA_LOCALE : LATIN_LOCALE;
  }
  return LATIN_LOCALE;
}

export function formatCurrency(value: number | null | undefined, currency = "USD"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const locale = localeFromContext();
  if (currency === "USD") {
    return `$${value.toLocaleString(locale, { maximumFractionDigits: 2 })}`;
  }
  return `${value.toLocaleString(locale, { maximumFractionDigits: 2 })} ${currency}`;
}

export function formatNumber(value: number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const locale = localeFromContext();
  return `${value.toLocaleString(locale, { maximumFractionDigits: 2 })}${suffix}`;
}

/** Compact axis-tick formatting (e.g. 125000 -> "125K") — used for chart Y-axes
 * where full precision would be clipped or crowd the plot. */
export function formatCompactNumber(value: number): string {
  const locale = localeFromContext();
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const locale = localeFromContext();
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

export function downloadText(filename: string, content: string, mime = "text/markdown") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
