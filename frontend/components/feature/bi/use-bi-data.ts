"use client";

import * as React from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { BiSnapshot, BiSnapshotMeta } from "@/lib/types";
import {
  applyFilters,
  computeComparison,
  EMPTY_FILTERS,
  type BiFilters,
  type PeriodComparison,
} from "@/lib/bi-filters";

const CURRENT_SNAPSHOT_KEY = "iraj-bi-current-snapshot";
const PREFS_KEY = "iraj-bi-prefs";
const LEGACY_LAST_BI_KEY = "iraj-last-bi";

export const KPI_CARD_KEYS = [
  "revenue",
  "tonnage",
  "avg_price",
  "conversion_rate",
  "avg_deal_size",
  "top5_customer_concentration_pct",
  "price_volatility",
  "avg_sales_cycle_days",
] as const;

export type KpiCardKey = (typeof KPI_CARD_KEYS)[number];

export interface BiPrefs {
  pinnedKpis: KpiCardKey[];
  compareEnabled: boolean;
}

const DEFAULT_PREFS: BiPrefs = {
  pinnedKpis: ["revenue", "tonnage", "avg_price", "conversion_rate"],
  compareEnabled: false,
};

function loadPrefs(): BiPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: BiPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function useBiData() {
  const [snapshots, setSnapshots] = React.useState<BiSnapshotMeta[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = React.useState(true);
  const [current, setCurrent] = React.useState<BiSnapshot | null>(null);
  const [currentLoading, setCurrentLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [filters, setFilters] = React.useState<BiFilters>(EMPTY_FILTERS);
  const [prefs, setPrefs] = React.useState<BiPrefs>(DEFAULT_PREFS);

  React.useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const persistPrefs = React.useCallback((next: BiPrefs) => {
    setPrefs(next);
    savePrefs(next);
  }, []);

  const refreshSnapshots = React.useCallback(async () => {
    setSnapshotsLoading(true);
    try {
      const res = await api.bi.snapshots();
      setSnapshots(res.items);
      return res.items;
    } catch {
      setSnapshots([]);
      return [];
    } finally {
      setSnapshotsLoading(false);
    }
  }, []);

  const selectSnapshot = React.useCallback(async (id: string) => {
    setCurrentLoading(true);
    try {
      const snap = await api.bi.snapshot(id);
      setCurrent(snap);
      try {
        localStorage.setItem(CURRENT_SNAPSHOT_KEY, id);
        localStorage.setItem(LEGACY_LAST_BI_KEY, JSON.stringify(snap));
      } catch {
        /* ignore */
      }
      setFilters(EMPTY_FILTERS);
      return snap;
    } catch (e) {
      toast.error("Could not load dataset", { description: (e as Error).message });
      return null;
    } finally {
      setCurrentLoading(false);
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      const items = await refreshSnapshots();
      if (items.length === 0) return;
      const savedId = (() => {
        try {
          return localStorage.getItem(CURRENT_SNAPSHOT_KEY);
        } catch {
          return null;
        }
      })();
      const target = items.find((s) => s.id === savedId) ?? items[0];
      await selectSnapshot(target.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upload = React.useCallback(
    async (file: File, opts?: { label?: string; mode?: "new" | "append" }) => {
      setUploading(true);
      try {
        const snap = await api.bi.upload(file, {
          label: opts?.label,
          mode: opts?.mode ?? "new",
          snapshotId: opts?.mode === "append" ? current?.id : undefined,
        });
        await refreshSnapshots();
        setCurrent(snap);
        setFilters(EMPTY_FILTERS);
        try {
          localStorage.setItem(CURRENT_SNAPSHOT_KEY, snap.id);
          localStorage.setItem(LEGACY_LAST_BI_KEY, JSON.stringify(snap));
        } catch {
          /* ignore */
        }
        return snap;
      } finally {
        setUploading(false);
      }
    },
    [current?.id, refreshSnapshots],
  );

  const renameSnapshot = React.useCallback(
    async (id: string, label: string) => {
      const updated = await api.bi.renameSnapshot(id, label);
      await refreshSnapshots();
      if (current?.id === id) setCurrent(updated);
      return updated;
    },
    [current?.id, refreshSnapshots],
  );

  const deleteSnapshot = React.useCallback(
    async (id: string) => {
      await api.bi.deleteSnapshot(id);
      const items = await refreshSnapshots();
      if (current?.id === id) {
        if (items.length > 0) await selectSnapshot(items[0].id);
        else {
          setCurrent(null);
          try {
            localStorage.removeItem(CURRENT_SNAPSHOT_KEY);
            localStorage.removeItem(LEGACY_LAST_BI_KEY);
          } catch {
            /* ignore */
          }
        }
      }
    },
    [current?.id, refreshSnapshots, selectSnapshot],
  );

  const filteredRows = React.useMemo(
    () => (current ? applyFilters(current.rows, filters) : []),
    [current, filters],
  );

  const comparison = React.useMemo<PeriodComparison | null>(
    () => (current ? computeComparison(current.rows, filters) : null),
    [current, filters],
  );

  const togglePinnedKpi = React.useCallback(
    (key: KpiCardKey) => {
      const isPinned = prefs.pinnedKpis.includes(key);
      const next = isPinned
        ? prefs.pinnedKpis.filter((k) => k !== key)
        : [...prefs.pinnedKpis, key];
      persistPrefs({ ...prefs, pinnedKpis: next });
    },
    [prefs, persistPrefs],
  );

  const setCompareEnabled = React.useCallback(
    (enabled: boolean) => persistPrefs({ ...prefs, compareEnabled: enabled }),
    [prefs, persistPrefs],
  );

  return {
    snapshots,
    snapshotsLoading,
    current,
    currentLoading,
    uploading,
    filters,
    setFilters,
    filteredRows,
    comparison,
    prefs,
    togglePinnedKpi,
    setCompareEnabled,
    upload,
    selectSnapshot,
    renameSnapshot,
    deleteSnapshot,
    refreshSnapshots,
  };
}

export type UseBiData = ReturnType<typeof useBiData>;
