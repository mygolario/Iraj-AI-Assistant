"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IconCheck,
  IconCross,
  IconDocument,
  IconLoader,
  IconSearch,
  IconTune,
} from "@/components/ui/icons";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { api } from "@/lib/api";
import type { RagResult, StandardDocument } from "@/lib/types";

interface StandardsAskProps {
  documents: StandardDocument[];
}

const SUGGESTIONS = [
  "ASTM A615 Grade 60 yield strength",
  "B500B tensile strength and elongation",
  "Compare chemical composition requirements",
  "Which diameters are covered?",
];

export function StandardsAsk({ documents }: StandardsAskProps) {
  const t = useTranslations("standardsWorkspace");
  const [query, setQuery] = React.useState("");
  const [selectedStandard, setSelectedStandard] = React.useState("all");
  const [results, setResults] = React.useState<RagResult[] | null>(null);
  const [selectedResult, setSelectedResult] = React.useState<RagResult | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [error, setError] = React.useState("");

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

  const runSearch = async (searchQuery: string) => {
    const normalized = searchQuery.trim();
    if (!normalized) return;
    setQuery(normalized);
    setSearching(true);
    setError("");
    setResults(null);
    setSelectedResult(null);
    try {
      const nextResults = await api.rag.query(normalized, {
        standards: selectedStandard === "all" ? [] : [selectedStandard],
        limit: 30,
      });
      setResults(nextResults);
      setSelectedResult(nextResults[0] ?? null);
    } catch (searchError) {
      const message =
        searchError instanceof Error ? searchError.message : t("search_failed");
      setError(message);
      toast.error(t("search_failed"), { description: message });
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void runSearch(query);
  };

  return (
    <div className="space-y-5">
      <Panel>
        <PanelBody className="p-5 sm:p-6">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h2 className="font-display text-2xl text-ink">{t("ask_title")}</h2>
              <p className="mt-1 text-sm text-ink-muted">{t("ask_subtitle")}</p>
            </div>
            <form onSubmit={handleSubmit} className="mt-5">
              <label htmlFor="standards-query" className="sr-only">
                {t("ask_library")}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <IconSearch className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-ink-subtle" />
                  <input
                    id="standards-query"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("ask_placeholder")}
                    className="h-12 w-full rounded-sm border border-line-strong bg-bg-sunken ps-12 pe-4 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-accent focus:bg-card"
                  />
                </div>
                <Button type="submit" size="lg" disabled={searching || !query.trim()}>
                  {searching ? (
                    <IconLoader className="size-4 animate-spin" />
                  ) : (
                    <IconSearch className="size-4" />
                  )}
                  {t("search")}
                </Button>
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-xs text-ink-muted">
                  <IconTune className="size-4" />
                  <span>{t("scope")}</span>
                  <select
                    value={selectedStandard}
                    onChange={(event) => setSelectedStandard(event.target.value)}
                    className="h-8 rounded-sm border border-line bg-bg-subtle px-2 text-xs text-ink outline-none focus:border-accent"
                  >
                    <option value="all">{t("all_documents")}</option>
                    {standards.map((standard) => (
                      <option key={standard} value={standard}>
                        {standard}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-1.5 sm:ms-auto">
                  {SUGGESTIONS.slice(0, 2).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void runSearch(suggestion)}
                      className="rounded-sm border border-line bg-bg-subtle px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </PanelBody>
      </Panel>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-negative/30 bg-negative/5 p-4 text-sm text-negative"
        >
          <IconCross className="mt-0.5 size-4" />
          <div>
            <p className="font-medium">{t("search_failed")}</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        </div>
      )}

      {searching && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            <div className="skeleton h-24 rounded-md" />
            <div className="skeleton h-32 rounded-md" />
            <div className="skeleton h-32 rounded-md" />
          </div>
          <div className="skeleton h-80 rounded-md" />
        </div>
      )}

      {!searching && results && results.length > 0 && (
        <div
          className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"
          aria-live="polite"
        >
          <div className="space-y-4">
            <Panel>
              <PanelBody className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-sm border border-line bg-bg-subtle text-positive">
                    <IconCheck className="size-4" />
                  </div>
                  <div>
                    <p className="font-display text-lg text-ink">
                      {t("evidence_found", { count: results.length })}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">
                      {t("evidence_found_body")}
                    </p>
                  </div>
                </div>
              </PanelBody>
            </Panel>

            <div className="space-y-2.5">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => setSelectedResult(result)}
                  className={`w-full rounded-md border p-4 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selectedResult?.id === result.id
                      ? "border-accent bg-accent-soft/60"
                      : "border-line bg-card hover:border-line-strong hover:bg-bg-subtle"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-ink-subtle">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Badge variant="accent" size="sm">
                      {result.metadata.standard_code}
                    </Badge>
                    <Badge
                      variant={
                        result.strength === "strong"
                          ? "positive"
                          : result.strength === "related"
                            ? "info"
                            : "warning"
                      }
                      size="sm"
                    >
                      {t(`match_${result.strength}`)}
                    </Badge>
                    <span className="ms-auto text-xs text-ink-subtle">
                      {t("page_short", { page: result.page })}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-ink-muted">
                    {result.text}
                  </p>
                  <p className="mt-2 truncate text-xs text-ink-subtle">
                    {result.source}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <Panel className="h-fit lg:sticky lg:top-24">
            <PanelHeader>
              <PanelTitle>{t("source_evidence")}</PanelTitle>
            </PanelHeader>
            <PanelBody className="p-5">
              {selectedResult && (
                <>
                  <div className="flex items-center gap-2">
                    <IconDocument className="size-4 text-accent" />
                    <span className="text-sm font-medium text-ink">
                      {selectedResult.metadata.standard_code}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-[90px_1fr] gap-x-3 gap-y-2 text-xs">
                    <dt className="text-ink-subtle">{t("file")}</dt>
                    <dd className="break-words text-ink-muted">{selectedResult.source}</dd>
                    <dt className="text-ink-subtle">{t("page")}</dt>
                    <dd className="text-ink-muted">{selectedResult.page}</dd>
                    <dt className="text-ink-subtle">{t("match_quality")}</dt>
                    <dd className="text-ink-muted">
                      {t(`match_${selectedResult.strength}`)}
                    </dd>
                  </dl>
                  <div className="mt-4 rounded-sm border border-line bg-bg-subtle p-4">
                    <p className="text-sm leading-6 text-ink">{selectedResult.text}</p>
                  </div>
                  <Button variant="outline" className="mt-4 w-full" asChild>
                    <a
                      href={api.rag.downloadUrl(selectedResult.document_id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <IconDocument className="size-4" />
                      {t("open_source_document")}
                    </a>
                  </Button>
                </>
              )}
            </PanelBody>
          </Panel>
        </div>
      )}

      {!searching && results && results.length === 0 && (
        <Panel>
          <PanelBody className="flex flex-col items-center py-14 text-center" aria-live="polite">
            <IconCross className="size-8 text-ink-subtle" />
            <p className="mt-3 text-sm font-medium text-ink">{t("no_evidence_title")}</p>
            <p className="mt-1 max-w-md text-sm leading-6 text-ink-muted">
              {t("no_evidence_body")}
            </p>
          </PanelBody>
        </Panel>
      )}

      {!searching && results === null && !error && (
        <Panel tone="subtle">
          <PanelBody className="grid gap-3 p-4 sm:grid-cols-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void runSearch(suggestion)}
                className="flex items-center gap-3 rounded-sm border border-line bg-card p-3 text-start text-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <IconSearch className="size-4 text-accent" />
                {suggestion}
              </button>
            ))}
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}
