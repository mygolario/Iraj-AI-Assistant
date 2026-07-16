"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconFileExport, IconChevronDown, IconDownload } from "@/components/ui/icons";
import { exportSnapshotToExcel, printCurrentView } from "@/lib/bi-export";
import type { BiSnapshot } from "@/lib/types";

export function BiExportMenu({ snapshot }: { snapshot: BiSnapshot }) {
  const t = useTranslations();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1.5 rounded-sm border border-line bg-card px-3 text-[13px] font-medium text-ink-muted shadow-[var(--shadow-1)] transition-colors hover:bg-bg-subtle hover:text-ink"
      >
        <IconFileExport className="size-4" />
        {t("bi.export")}
        <IconChevronDown className="size-3.5" />
      </button>
      {open && (
        <div className="absolute top-full end-0 z-20 mt-1.5 w-52 rounded-md border border-line bg-card p-1.5 shadow-[var(--shadow-3)]">
          <button
            onClick={() => {
              exportSnapshotToExcel(snapshot);
              toast.success(t("bi.excel_exported"));
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-[13px] text-ink hover:bg-bg-subtle"
          >
            <IconDownload className="size-4 text-ink-subtle" />
            {t("bi.export_excel")}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              printCurrentView();
            }}
            className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-[13px] text-ink hover:bg-bg-subtle"
          >
            <IconDownload className="size-4 text-ink-subtle" />
            {t("bi.export_pdf")}
          </button>
        </div>
      )}
    </div>
  );
}
