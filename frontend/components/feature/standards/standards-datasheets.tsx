"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IconCross,
  IconDatasheet,
  IconDownload,
  IconLoader,
} from "@/components/ui/icons";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { api } from "@/lib/api";
import type { DatasheetSpec } from "@/lib/types";
import { downloadText } from "@/lib/utils";

const GRADES = [
  "DIN B500B",
  "ASTM A615 Grade 60",
  "JIS G3112 SD390",
  "SAE J403 Grade 1008",
  "GB/T 1499.2 HRB400",
  "custom",
];

const SPECIFICATION_FIELDS = [
  "yield_strength",
  "tensile_strength",
  "size_range",
  "chemical_composition",
] as const;

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

export function StandardsDatasheets() {
  const t = useTranslations("standardsWorkspace");
  const [grade, setGrade] = React.useState(GRADES[0]);
  const [customGrade, setCustomGrade] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [datasheet, setDatasheet] = React.useState<DatasheetSpec | null>(null);
  const [compiling, setCompiling] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState<Record<string, boolean>>({});

  const effectiveGrade = grade === "custom" ? customGrade.trim() : grade;

  const compile = async () => {
    if (!effectiveGrade) {
      toast.error(t("grade_required"));
      return;
    }
    setCompiling(true);
    setDatasheet(null);
    setConfirmed({});
    try {
      setDatasheet(await api.rag.datasheet(effectiveGrade, company));
    } catch (error) {
      toast.error(t("datasheet_failed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setCompiling(false);
    }
  };

  const availableFields = datasheet
    ? SPECIFICATION_FIELDS.filter((field) => Boolean(datasheet[field]))
    : [];
  const confirmedCount = availableFields.filter((field) => confirmed[field]).length;
  const reviewComplete =
    availableFields.length > 0 && confirmedCount === availableFields.length;

  const download = () => {
    if (!datasheet || !reviewComplete) return;
    const rows = SPECIFICATION_FIELDS.map((field) => {
      const evidence = datasheet.evidence[field];
      const source = evidence
        ? `${evidence.citation.metadata.standard_code}, ${evidence.citation.source}, ${t("page_short", { page: evidence.citation.page })}`
        : t("not_found");
      return `| ${t(`field_${field}`)} | ${escapeMarkdownCell(datasheet[field] ?? t("not_found"))} | ${escapeMarkdownCell(source)} |`;
    }).join("\n");
    const markdown = `# ${t("technical_datasheet")}\n\n**${t("grade")}**: ${datasheet.grade}\n**${t("company")}**: ${datasheet.company || "—"}\n**${t("generated")}**: ${datasheet.date}\n**${t("review_status")}**: ${t("verified")}\n\n| ${t("technical_property")} | ${t("value")} | ${t("source_evidence")} |\n| --- | --- | --- |\n${rows}\n\n${t("datasheet_evidence_note")}\n`;
    downloadText(`${datasheet.grade.replace(/\s+/g, "_")}_verified.md`, markdown);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <Panel className="h-fit">
        <PanelHeader>
          <div>
            <PanelTitle>{t("datasheet_builder")}</PanelTitle>
            <p className="mt-1 text-xs text-ink-subtle">{t("datasheet_builder_body")}</p>
          </div>
        </PanelHeader>
        <PanelBody className="space-y-4 p-5">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <span className="flex size-6 items-center justify-center rounded-full bg-accent text-accent-foreground">
              1
            </span>
            <span className="font-medium">{t("product_and_recipient")}</span>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">{t("grade")}</span>
            <select
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              className="h-10 rounded-sm border border-line bg-bg-sunken px-3 text-sm text-ink outline-none focus:border-accent"
            >
              {GRADES.map((item) => (
                <option key={item} value={item}>
                  {item === "custom" ? t("custom_grade") : item}
                </option>
              ))}
            </select>
          </label>

          {grade === "custom" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted">
                {t("custom_grade")}
              </span>
              <input
                value={customGrade}
                onChange={(event) => setCustomGrade(event.target.value)}
                placeholder={t("grade_placeholder")}
                className="h-10 rounded-sm border border-line bg-bg-sunken px-3 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-accent"
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">
              {t("manufacturer_client")}
            </span>
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder={t("company_placeholder")}
              className="h-10 rounded-sm border border-line bg-bg-sunken px-3 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-accent"
            />
          </label>

          <Button
            className="w-full"
            onClick={() => void compile()}
            disabled={compiling}
          >
            {compiling ? (
              <IconLoader className="size-4 animate-spin" />
            ) : (
              <IconDatasheet className="size-4" />
            )}
            {t("compile_draft")}
          </Button>

          <div className="rounded-sm border border-line bg-bg-subtle p-3">
            <p className="text-xs font-medium text-ink">{t("no_fabrication_title")}</p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">
              {t("no_fabrication_body")}
            </p>
          </div>
        </PanelBody>
      </Panel>

      <Panel className="min-w-0">
        <PanelHeader>
          <div>
            <PanelTitle>{t("evidence_review")}</PanelTitle>
            <p className="mt-1 text-xs text-ink-subtle">{t("evidence_review_body")}</p>
          </div>
          {datasheet?.available && (
            <Badge variant={reviewComplete ? "positive" : "warning"} size="sm">
              {reviewComplete
                ? t("verified")
                : t("review_progress", {
                    confirmed: confirmedCount,
                    total: availableFields.length,
                  })}
            </Badge>
          )}
        </PanelHeader>

        {compiling && (
          <PanelBody className="space-y-3">
            <div className="skeleton h-14 rounded-sm" />
            <div className="skeleton h-24 rounded-sm" />
            <div className="skeleton h-24 rounded-sm" />
            <div className="skeleton h-24 rounded-sm" />
          </PanelBody>
        )}

        {!compiling && !datasheet && (
          <PanelBody className="flex flex-col items-center py-16 text-center">
            <IconDatasheet className="size-9 text-ink-subtle" />
            <p className="mt-3 text-sm font-medium text-ink">
              {t("datasheet_empty_title")}
            </p>
            <p className="mt-1 max-w-md text-sm leading-6 text-ink-muted">
              {t("datasheet_empty_body")}
            </p>
          </PanelBody>
        )}

        {!compiling && datasheet && !datasheet.available && (
          <PanelBody className="flex flex-col items-center py-16 text-center">
            <IconCross className="size-9 text-negative" />
            <p className="mt-3 text-sm font-medium text-ink">
              {t("datasheet_no_evidence")}
            </p>
            <p className="mt-1 max-w-md text-sm leading-6 text-ink-muted">
              {t("datasheet_no_evidence_body", { grade: datasheet.grade })}
            </p>
          </PanelBody>
        )}

        {!compiling && datasheet?.available && (
          <>
            <div className="border-b border-line bg-bg-subtle px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-lg text-ink">{datasheet.grade}</p>
                  <p className="mt-0.5 text-xs text-ink-subtle">
                    {datasheet.company || t("no_recipient")} · {datasheet.date}
                  </p>
                </div>
                <Button
                  variant={reviewComplete ? "primary" : "outline"}
                  disabled={!reviewComplete}
                  onClick={download}
                >
                  <IconDownload className="size-4" />
                  {t("download_verified")}
                </Button>
              </div>
            </div>
            <div className="divide-y divide-line">
              {SPECIFICATION_FIELDS.map((field) => {
                const value = datasheet[field];
                const evidence = datasheet.evidence[field];
                return (
                  <div key={field} className="grid gap-3 p-5 lg:grid-cols-[180px_1fr_auto]">
                    <div>
                      <p className="text-xs font-medium text-ink-muted">
                        {t(`field_${field}`)}
                      </p>
                    </div>
                    <div>
                      {value ? (
                        <>
                          <p className="text-sm leading-6 text-ink">{value}</p>
                          {evidence && (
                            <p className="mt-2 text-xs text-ink-subtle">
                              {evidence.citation.metadata.standard_code} ·{" "}
                              {evidence.citation.source} ·{" "}
                              {t("page_short", { page: evidence.citation.page })}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-sm text-ink-subtle">
                          <IconCross className="size-4" />
                          {t("not_found")}
                        </span>
                      )}
                    </div>
                    <div>
                      {value && (
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
                          <input
                            type="checkbox"
                            checked={Boolean(confirmed[field])}
                            onChange={(event) =>
                              setConfirmed((current) => ({
                                ...current,
                                [field]: event.target.checked,
                              }))
                            }
                            className="size-4 accent-[var(--accent)]"
                          />
                          {t("confirm_value")}
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
