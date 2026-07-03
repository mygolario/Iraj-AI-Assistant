"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileDropzone({
  accept,
  multiple = false,
  onFiles,
  label = "Drop file here or click to upload",
  hint,
}: {
  accept: Record<string, string[]>;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
}) {
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
        "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all",
        isDragActive
          ? "border-primary/60 bg-primary/[0.06]"
          : "border-white/10 bg-white/[0.02] hover:border-primary/40 hover:bg-white/[0.04]",
      )}
    >
      <input {...getInputProps()} />
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary transition-transform group-hover:scale-110">
        {selected.length ? (
          <FileSpreadsheet className="size-6" />
        ) : (
          <UploadCloud className="size-6" />
        )}
      </div>
      {selected.length ? (
        <div className="text-sm">
          <p className="font-semibold text-foreground">{selected.join(", ")}</p>
          <p className="mt-0.5 text-xs text-success">Ready · drop another to replace</p>
        </div>
      ) : (
        <div className="text-sm">
          <p className="font-medium text-foreground">{label}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      )}
    </div>
  );
}
