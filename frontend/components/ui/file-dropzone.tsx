"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import { IconUpload, IconTable } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export function FileDropzone({
  accept,
  multiple = false,
  onFiles,
  label,
  hint,
}: {
  accept: Record<string, string[]>;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
}) {
  const t = useTranslations();
  const [selected, setSelected] = React.useState<string[]>([]);

  const onDrop = React.useCallback(
    (files: File[]) => {
      setSelected(files.map((f) => f.name));
      onFiles(files);
    },
    [onFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxFiles: multiple ? 50 : 1,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed px-6 py-10 text-center transition-colors",
        isDragActive
          ? "border-accent bg-accent-soft"
          : "border-line-strong bg-bg-subtle hover:border-accent/50 hover:bg-bg-sunken",
      )}
    >
      <input {...getInputProps()} />
      <div className="flex size-11 items-center justify-center rounded-sm border border-line bg-card text-accent shadow-[var(--shadow-1)]">
        {selected.length ? (
          <IconTable className="size-5" />
        ) : (
          <IconUpload className="size-5" />
        )}
      </div>
      {selected.length ? (
        <div className="text-sm">
          <p className="font-medium text-ink">{selected.join(", ")}</p>
          <p className="mt-0.5 text-[13px] text-positive">{t("dropzone.ready")}</p>
        </div>
      ) : (
        <div className="text-sm">
          <p className="font-medium text-ink">{label ?? t("dropzone.default_label")}</p>
          {hint && <p className="mt-0.5 text-[13px] text-ink-muted">{hint}</p>}
        </div>
      )}
    </div>
  );
}
