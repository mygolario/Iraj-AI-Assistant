"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Button } from "@/components/ui/button";
import { IconDownload, IconSpark, IconLoader } from "@/components/ui/icons";
import { api } from "@/lib/api";
import { BI_SAMPLE_CSV, csvToFile } from "@/lib/bi-sample-data";

export function BiEmptyState({
  onFiles,
  loading,
}: {
  onFiles: (files: File[]) => void;
  loading: boolean;
}) {
  const t = useTranslations();

  const loadSample = () => {
    onFiles([csvToFile(BI_SAMPLE_CSV, "sample-sales-data.csv")]);
  };

  return (
    <div className="flex flex-col gap-5">
      <FileDropzone
        accept={{
          "text/csv": [".csv"],
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
        }}
        onFiles={onFiles}
        label={t("bi.upload_label")}
        hint={t("bi.upload_hint")}
      />

      <div className="flex flex-col items-center gap-4 rounded-md border border-line bg-card px-6 py-10 text-center shadow-[var(--shadow-1)]">
        {loading ? (
          <>
            <IconLoader className="size-7 animate-spin text-ink-subtle" />
            <p className="text-sm text-ink-muted">{t("bi.processing")}</p>
          </>
        ) : (
          <>
            <IconSpark className="size-7 text-accent" />
            <div className="max-w-md">
              <p className="text-sm font-medium text-ink">{t("bi.empty_title")}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{t("bi.empty_state")}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = api.bi.templateUrl();
                  a.download = "iraj-sales-template.csv";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  toast.success(t("bi.template_downloaded"));
                }}
              >
                <IconDownload className="size-4" />
                {t("bi.download_template")}
              </Button>
              <Button variant="primary" size="sm" onClick={loadSample}>
                <IconSpark className="size-4" />
                {t("bi.try_sample_data")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
