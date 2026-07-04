"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  IconStandards,
  IconSearch,
  IconDatasheet,
  IconDownload,
  IconBeaker,
  IconCheck,
  IconCross,
  IconLoader,
} from "@/components/ui/icons";
import { api } from "@/lib/api";
import type { DatasheetSpec, RagResult } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadText } from "@/lib/utils";
import { FileDropzone } from "@/components/ui/file-dropzone";

const GRADE_OPTIONS = [
  "DIN B500B",
  "ASTM A615 Grade 60",
  "JIS G3112 SD390",
  "SAE J403 Grade 1008",
  "GB/T 1499.2",
  "Custom",
];

const inputCls =
  "h-10 rounded-sm border border-line bg-bg-sunken px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-accent focus:bg-card";

export function StandardsPage() {
  const t = useTranslations();
  const [records, setRecords] = React.useState(0);
  const [files, setFiles] = React.useState<string[]>([]);
  const [indexing, setIndexing] = React.useState(false);

  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<RagResult[] | null>(null);
  const [searching, setSearching] = React.useState(false);

  const [grade, setGrade] = React.useState(GRADE_OPTIONS[0]);
  const [customGrade, setCustomGrade] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [datasheet, setDatasheet] = React.useState<DatasheetSpec | null>(null);
  const [compiling, setCompiling] = React.useState(false);

  React.useEffect(() => {
    api.rag.state().then((s) => {
      setRecords(s.records);
      setFiles(s.files_list);
    }).catch(() => { /* ignore */ });
  }, []);

  const handleIndex = async (uploaded: File[]) => {
    setIndexing(true);
    try {
      const res = await api.rag.index(uploaded);
      toast.success(t("standards.indexed_files", { count: res.indexed.length }), {
        description: t("standards.indexed_desc", { count: res.total_records }),
      });
      const s = await api.rag.state();
      setRecords(s.records);
      setFiles(s.files_list);
    } catch (e) {
      toast.error(t("standards.indexing_failed"), { description: (e as Error).message });
    } finally {
      setIndexing(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResults(null);
    try {
      setResults(await api.rag.query(query));
    } catch (e) {
      toast.error(t("standards.query_failed"), { description: (e as Error).message });
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const effectiveGrade = grade === "Custom" ? customGrade : grade;

  const handleCompile = async () => {
    if (!effectiveGrade.trim()) {
      toast.error(t("standards.select_grade_first"));
      return;
    }
    setCompiling(true);
    setDatasheet(null);
    try {
      setDatasheet(await api.rag.datasheet(effectiveGrade, company));
    } catch (e) {
      toast.error(t("standards.datasheet_failed"), { description: (e as Error).message });
    } finally {
      setCompiling(false);
    }
  };

  const downloadDatasheet = () => {
    if (!datasheet) return;
    const md = `### PRODUCT TECHNICAL DATASHEET\n**Company**: ${datasheet.company || "—"}\n**Date**: ${datasheet.date}\n**Standard Compliance**: ${datasheet.grade}\n\n| Technical Parameter | Specification Limits |\n| :--- | :--- |\n| Product Type | High-Yield Ribbed Steel Rebar for Concrete Reinforcement |\n| Designation Grade | ${datasheet.grade} |\n| Minimum Yield Strength | ${datasheet.yield_strength ?? "N/A"} |\n| Minimum Tensile Strength | ${datasheet.tensile_strength ?? "N/A"} |\n| Standard Sizes Available | ${datasheet.size_range ?? "N/A"} |\n| Chemical Composition | ${datasheet.chemical_composition ?? "N/A"} |\n`;
    downloadText(`${datasheet.grade.replace(/\s+/g, "_")}_datasheet.md`, md);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-4">
          <FileDropzone
            accept={{ "application/pdf": [".pdf"], "text/plain": [".txt"] }}
            multiple
            onFiles={handleIndex}
            label={t("standards.upload_label")}
            hint={t("standards.upload_hint")}
          />
          <div className="rounded-md border border-line bg-card p-4 shadow-[var(--shadow-1)]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                <IconStandards className="size-4 text-accent" />
                {t("standards.index_status")}
              </span>
              {indexing ? (
                <IconLoader className="size-4 animate-spin text-ink-subtle" />
              ) : (
                <span className="flex items-center gap-1.5 text-[13px] text-positive">
                  <IconCheck className="size-3.5" />
                  {records} {t("common.passages")}
                </span>
              )}
            </div>
            {files.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {files.map((f) => (
                  <Badge key={f} variant="neutral" size="sm" className="font-mono">
                    {f}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-ink-muted">
                {t("standards.no_standards")}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]">
          <div className="mb-4 flex items-center gap-2">
            <IconSearch className="size-4 text-accent" />
            <h3 className="font-display text-base leading-tight tracking-tight text-ink">{t("standards.semantic_query")}</h3>
          </div>
          <form onSubmit={handleSearch} className="relative">
            <IconSearch className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("standards.search_placeholder")}
              className="h-11 w-full rounded-sm border border-line bg-bg-sunken ps-9 pe-28 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-accent focus:bg-card"
            />
            <Button
              type="submit"
              disabled={searching}
              size="sm"
              className="absolute end-1.5 top-1.5"
            >
              {searching ? <IconLoader className="size-3.5 animate-spin" /> : <IconSearch className="size-3.5" />}
              {t("common.search")}
            </Button>
          </form>

          <div className="mt-4 space-y-2.5">
            {searching &&
              [0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-20 rounded-sm" />
              ))}
            {!searching && results && results.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-sm border border-line bg-bg-subtle py-8 text-center">
                <IconCross className="size-6 text-ink-subtle" />
                <p className="text-sm text-ink-muted">{t("standards.no_matches")}</p>
              </div>
            )}
            {!searching &&
              results &&
              results.map((r, i) => (
                <div
                  key={i}
                  className="rounded-sm border-s-2 border-line-strong bg-bg-subtle p-3.5"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <Badge variant="accent" size="sm">{r.metadata.standard}</Badge>
                    <span className="text-[11px] text-ink-subtle">
                      {r.metadata.source} · p.{r.metadata.page} · score {r.score}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-ink-muted">{r.text}</p>
                </div>
              ))}
            {!searching && !results && (
              <p className="py-6 text-center text-[13px] text-ink-muted">
                {t("standards.results_hint")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]">
        <div className="mb-4 flex items-center gap-2">
          <IconBeaker className="size-4 text-accent" />
          <h3 className="font-display text-base leading-tight tracking-tight text-ink">{t("standards.datasheet_generator")}</h3>
          <span className="ms-auto text-[11px] text-ink-subtle">
            {t("standards.datasheet_disclaimer")}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-ink-muted">{t("standards.rebar_grade")}</span>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className={inputCls + " cursor-pointer"}
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
          {grade === "Custom" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-ink-muted">{t("standards.custom_grade")}</span>
              <input
                value={customGrade}
                onChange={(e) => setCustomGrade(e.target.value)}
                placeholder={t("standards.custom_placeholder")}
                className={inputCls}
              />
            </label>
          )}
          <label className="flex flex-col gap-1.5 sm:col-span-1">
            <span className="text-[12px] font-medium text-ink-muted">{t("standards.manufacturer")}</span>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={t("standards.company_name")}
              className={inputCls}
            />
          </label>
          <Button
            onClick={handleCompile}
            disabled={compiling}
            className="h-10 self-start sm:self-end"
          >
            {compiling ? <IconLoader className="size-4 animate-spin" /> : <IconDatasheet className="size-4" />}
            {t("common.compile")}
          </Button>
        </div>

        {datasheet && (
          <div className="mt-4 rounded-sm border border-line bg-bg-subtle p-4">
            {datasheet.available ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-positive">
                    <IconCheck className="size-4" />
                    {t("standards.datasheet_compiled", { count: datasheet.sources.length })}
                  </span>
                  <Button variant="outline" size="sm" onClick={downloadDatasheet}>
                    <IconDownload className="size-3.5" />
                    {t("common.download_md")}
                  </Button>
                </div>
                <div className="overflow-hidden rounded-sm border border-line">
                  <table className="w-full text-start text-sm">
                    <tbody>
                      {[
                        [t("common.grade"), datasheet.grade],
                        [t("standards.min_yield"), datasheet.yield_strength ?? "N/A"],
                        [t("standards.min_tensile"), datasheet.tensile_strength ?? "N/A"],
                        [t("standards.sizes_available"), datasheet.size_range ?? "N/A"],
                        [t("standards.chemical_composition"), datasheet.chemical_composition ?? "N/A"],
                      ].map(([k, v]) => (
                        <tr key={k} className="border-b border-line last:border-0">
                          <td className="bg-bg-sunken px-3 py-2 font-medium text-ink-muted">
                            {k}
                          </td>
                          <td className="px-3 py-2 text-ink">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-negative">
                <IconCross className="size-4" />
                {t("standards.spec_not_available", { grade: datasheet.grade })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
