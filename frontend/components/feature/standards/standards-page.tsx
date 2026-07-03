"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Library,
  Search,
  FileText,
  Download,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { DatasheetSpec, RagResult } from "@/lib/types";
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
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Library className="size-4 text-secondary" />
                {t("standards.index_status")}
              </span>
              {indexing ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-success">
                  <CheckCircle2 className="size-3.5" />
                  {records} {t("common.passages")}
                </span>
              )}
            </div>
            {files.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {files.map((f) => (
                  <span
                    key={f}
                    className="rounded-md bg-secondary/15 px-2 py-1 font-mono text-[10px] text-secondary"
                  >
                    {f}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                {t("standards.no_standards")}
              </p>
            )}
          </div>
        </div>

        <div className="glass gradient-border rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <Search className="size-4 text-primary" />
            <h3 className="font-display text-sm font-semibold">{t("standards.semantic_query")}</h3>
          </div>
          <form onSubmit={handleSearch} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("standards.search_placeholder")}
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-28 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={searching}
              className="absolute right-1.5 top-1.5 flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {searching ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
              {t("common.search")}
            </button>
          </form>

          <div className="mt-4 space-y-2.5">
            {searching &&
              [0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />
              ))}
            {!searching && results && results.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.03] py-8 text-center">
                <XCircle className="size-6 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {t("standards.no_matches")}
                </p>
              </div>
            )}
            {!searching &&
              results &&
              results.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border-l-2 border-primary/50 bg-white/[0.03] p-3.5"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {r.metadata.standard}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {r.metadata.source} · p.{r.metadata.page} · score {r.score}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{r.text}</p>
                </motion.div>
              ))}
            {!searching && !results && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {t("standards.results_hint")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="glass gradient-border rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <FlaskConical className="size-4 text-accent" />
          <h3 className="font-display text-sm font-semibold">{t("standards.datasheet_generator")}</h3>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {t("standards.datasheet_disclaimer")}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("standards.rebar_grade")}</span>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground outline-none focus:border-accent/60"
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g} className="bg-[#12121d]">
                  {g}
                </option>
              ))}
            </select>
          </label>
          {grade === "Custom" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">{t("standards.custom_grade")}</span>
              <input
                value={customGrade}
                onChange={(e) => setCustomGrade(e.target.value)}
                placeholder={t("standards.custom_placeholder")}
                className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground outline-none focus:border-accent/60"
              />
            </label>
          )}
          <label className="flex flex-col gap-1.5 sm:col-span-1">
            <span className="text-xs font-medium text-muted-foreground">{t("standards.manufacturer")}</span>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={t("standards.company_name")}
              className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
            />
          </label>
          <button
            onClick={handleCompile}
            disabled={compiling}
            className="flex h-10 items-center justify-center gap-2 self-end rounded-xl bg-gradient-to-r from-primary to-secondary px-4 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {compiling ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            {t("common.compile")}
          </button>
        </div>

        {datasheet && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
          >
            {datasheet.available ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-success">
                    <CheckCircle2 className="size-4" />
                    {t("standards.datasheet_compiled", { count: datasheet.sources.length })}
                  </span>
                  <button
                    onClick={downloadDatasheet}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/5"
                  >
                    <Download className="size-3.5" />
                    {t("common.download_md")}
                  </button>
                </div>
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <table className="w-full text-left text-xs">
                    <tbody>
                      {[
                        [t("common.grade"), datasheet.grade],
                        [t("standards.min_yield"), datasheet.yield_strength ?? "N/A"],
                        [t("standards.min_tensile"), datasheet.tensile_strength ?? "N/A"],
                        [t("standards.sizes_available"), datasheet.size_range ?? "N/A"],
                        [t("standards.chemical_composition"), datasheet.chemical_composition ?? "N/A"],
                      ].map(([k, v]) => (
                        <tr key={k} className="border-b border-white/[0.06] last:border-0">
                          <td className="bg-white/[0.04] px-3 py-2 font-semibold text-muted-foreground">
                            {k}
                          </td>
                          <td className="px-3 py-2 text-foreground">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="size-4 text-destructive" />
                {t("standards.spec_not_available", { grade: datasheet.grade })}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
