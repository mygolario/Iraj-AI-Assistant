"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import {
  IconCheck,
  IconDocument,
  IconDownload,
  IconLoader,
  IconSearch,
  IconStandards,
  IconTrash,
} from "@/components/ui/icons";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import type { StandardDocument } from "@/lib/types";

interface StandardsLibraryProps {
  documents: StandardDocument[];
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onDelete: (document: StandardDocument) => void;
  getDownloadUrl: (documentId: string) => string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function StandardsLibrary({
  documents,
  uploading,
  onUpload,
  onDelete,
  getDownloadUrl,
}: StandardsLibraryProps) {
  const t = useTranslations("standardsWorkspace");
  const [filter, setFilter] = React.useState("");
  const [standard, setStandard] = React.useState("all");

  const standards = React.useMemo(
    () =>
      Array.from(
        new Set(
          documents
            .map((document) => document.standard)
            .filter((value) => value !== "UNKNOWN"),
        ),
      ).sort(),
    [documents],
  );

  const visibleDocuments = documents.filter((document) => {
    const text = `${document.title} ${document.filename} ${document.standard_code}`
      .toLowerCase();
    return (
      text.includes(filter.toLowerCase()) &&
      (standard === "all" || document.standard === standard)
    );
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <Panel>
          <PanelHeader>
            <PanelTitle>{t("add_documents")}</PanelTitle>
            {uploading && <IconLoader className="size-4 animate-spin text-accent" />}
          </PanelHeader>
          <PanelBody className="p-4">
            <FileDropzone
              accept={{ "application/pdf": [".pdf"], "text/plain": [".txt"] }}
              multiple
              disabled={uploading}
              maxSize={25 * 1024 * 1024}
              onRejected={(rejections) =>
                toast.error(t("upload_rejected"), {
                  description: rejections
                    .slice(0, 3)
                    .map(
                      (rejection) =>
                        `${rejection.file.name}: ${rejection.errors[0]?.message ?? t("invalid_file")}`,
                    )
                    .join("\n"),
                })
              }
              onFiles={onUpload}
              label={uploading ? t("uploading_documents") : t("upload_label")}
              hint={t("upload_hint")}
            />
            <p className="mt-3 text-xs leading-5 text-ink-subtle">
              {t("upload_privacy")}
            </p>
          </PanelBody>
        </Panel>

        <Panel tone="subtle">
          <PanelBody className="p-4">
            <div className="flex items-start gap-3">
              <IconCheck className="mt-0.5 size-4 text-positive" />
              <div>
                <p className="text-sm font-medium text-ink">{t("evidence_policy")}</p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  {t("evidence_policy_body")}
                </p>
              </div>
            </div>
          </PanelBody>
        </Panel>
      </div>

      <Panel className="min-w-0">
        <PanelHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div>
            <PanelTitle>{t("document_library")}</PanelTitle>
            <p className="mt-1 text-xs text-ink-subtle">
              {t("document_count", { count: documents.length })}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <span className="sr-only">{t("filter_documents")}</span>
              <IconSearch className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder={t("filter_documents")}
                className="h-9 w-full rounded-sm border border-line bg-bg-sunken ps-9 pe-3 text-sm text-ink outline-none focus:border-accent sm:w-56"
              />
            </label>
            <label>
              <span className="sr-only">{t("filter_standard")}</span>
              <select
                value={standard}
                onChange={(event) => setStandard(event.target.value)}
                className="h-9 w-full rounded-sm border border-line bg-bg-sunken px-3 text-sm text-ink outline-none focus:border-accent sm:w-36"
              >
                <option value="all">{t("all_standards")}</option>
                {standards.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </PanelHeader>

        {visibleDocuments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-start text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-subtle text-xs text-ink-muted">
                  <th className="px-5 py-3 text-start font-medium">{t("document")}</th>
                  <th className="px-3 py-3 text-start font-medium">{t("standard")}</th>
                  <th className="px-3 py-3 text-start font-medium">{t("edition")}</th>
                  <th className="px-3 py-3 text-start font-medium">{t("content")}</th>
                  <th className="px-3 py-3 text-start font-medium">{t("status")}</th>
                  <th className="px-5 py-3 text-end font-medium">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibleDocuments.map((document) => (
                  <tr key={document.id} className="hover:bg-bg-subtle/70">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-sm border border-line bg-bg-subtle text-accent">
                          <IconDocument className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-64 truncate font-medium text-ink">
                            {document.title}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-subtle">
                            {formatFileSize(document.size_bytes)} · {document.language.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge variant="accent" size="sm">
                        {document.standard_code}
                      </Badge>
                    </td>
                    <td className="px-3 py-3.5 text-ink-muted">
                      {document.edition || t("not_detected")}
                    </td>
                    <td className="px-3 py-3.5 text-ink-muted">
                      {document.page_count} {t("pages")} · {document.passage_count}{" "}
                      {t("passages")}
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge
                        variant={
                          document.processing_status === "ready"
                            ? "positive"
                            : document.processing_status === "failed"
                              ? "negative"
                              : "warning"
                        }
                        size="sm"
                      >
                        {t(`status_${document.processing_status}`)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={getDownloadUrl(document.id)}
                            aria-label={t("download_document", {
                              title: document.title,
                            })}
                          >
                            <IconDownload className="size-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("delete_document", {
                            title: document.title,
                          })}
                          onClick={() => onDelete(document)}
                        >
                          <IconTrash className="size-4 text-negative" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PanelBody className="flex flex-col items-center py-16 text-center">
            <IconStandards className="size-9 text-ink-subtle" />
            <p className="mt-3 text-sm font-medium text-ink">
              {documents.length ? t("no_filtered_documents") : t("empty_library_title")}
            </p>
            <p className="mt-1 max-w-sm text-sm text-ink-muted">
              {documents.length
                ? t("no_filtered_documents_body")
                : t("empty_library_body")}
            </p>
          </PanelBody>
        )}
      </Panel>
    </div>
  );
}
