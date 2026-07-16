"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  IconChevronDown,
  IconCheck,
  IconEdit,
  IconTrash,
  IconPlus,
  IconUpload,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { BiSnapshotMeta } from "@/lib/types";

export function BiDatasetSwitcher({
  snapshots,
  currentId,
  onSelect,
  onRename,
  onDelete,
  onUploadNew,
  onAppend,
  uploading,
}: {
  snapshots: BiSnapshotMeta[];
  currentId: string | null | undefined;
  onSelect: (id: string) => void;
  onRename: (id: string, label: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onUploadNew: (file: File) => void;
  onAppend: (file: File) => void;
  uploading: boolean;
}) {
  const t = useTranslations();
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const newFileRef = React.useRef<HTMLInputElement>(null);
  const appendFileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditingId(null);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = snapshots.find((s) => s.id === currentId);

  const startRename = (s: BiSnapshotMeta) => {
    setEditingId(s.id);
    setEditValue(s.label);
  };

  const confirmRename = async (id: string) => {
    if (!editValue.trim()) return;
    try {
      await onRename(id, editValue.trim());
      toast.success(t("bi.dataset_renamed"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEditingId(null);
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await onDelete(id);
      toast.success(t("bi.dataset_deleted"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 min-w-56 items-center justify-between gap-2 rounded-sm border border-line bg-card px-3.5 text-sm text-ink shadow-[var(--shadow-1)] transition-colors hover:bg-bg-subtle"
      >
        <span className="truncate font-medium">
          {current?.label ?? t("bi.select_dataset")}
        </span>
        <IconChevronDown className={cn("size-4 text-ink-subtle transition-transform", open && "rotate-180")} />
      </button>

      <input
        ref={newFileRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUploadNew(f);
          e.target.value = "";
        }}
      />
      <input
        ref={appendFileRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onAppend(f);
          e.target.value = "";
        }}
      />

      <Button
        variant="outline"
        size="sm"
        disabled={!current || uploading}
        onClick={() => appendFileRef.current?.click()}
      >
        <IconUpload className="size-4" />
        {t("bi.append_data")}
      </Button>
      <Button variant="primary" size="sm" disabled={uploading} onClick={() => newFileRef.current?.click()}>
        <IconPlus className="size-4" />
        {t("bi.new_dataset")}
      </Button>

      {open && (
        <div className="absolute top-full left-0 z-20 mt-2 w-80 rounded-md border border-line bg-card p-1.5 shadow-[var(--shadow-3)]">
          {snapshots.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-ink-muted">{t("bi.no_datasets")}</p>
          ) : (
            <div className="max-h-80 overflow-auto">
              {snapshots.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-sm px-2.5 py-2 text-sm",
                    s.id === currentId ? "bg-accent-soft" : "hover:bg-bg-subtle",
                  )}
                >
                  {editingId === s.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename(s.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => confirmRename(s.id)}
                      className="h-7 flex-1 rounded-sm border border-accent bg-card px-2 text-sm text-ink outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => {
                        onSelect(s.id);
                        setOpen(false);
                      }}
                      className="flex flex-1 items-center gap-2 truncate text-start"
                    >
                      {s.id === currentId && <IconCheck className="size-3.5 shrink-0 text-accent" />}
                      <span className="truncate font-medium text-ink">{s.label}</span>
                    </button>
                  )}
                  <span className="shrink-0 text-[11px] text-ink-subtle">{formatCurrency(s.revenue)}</span>
                  <span className="hidden shrink-0 text-[11px] text-ink-subtle sm:inline">
                    {formatDate(s.created_at)}
                  </span>
                  <button
                    onClick={() => startRename(s)}
                    className="shrink-0 rounded-sm p-1 text-ink-subtle opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
                    aria-label={t("bi.rename_dataset")}
                  >
                    <IconEdit className="size-3.5" />
                  </button>
                  <button
                    onClick={() => confirmDelete(s.id)}
                    className="shrink-0 rounded-sm p-1 text-ink-subtle opacity-0 transition-opacity hover:text-negative group-hover:opacity-100"
                    aria-label={t("bi.delete_dataset")}
                  >
                    <IconTrash className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
