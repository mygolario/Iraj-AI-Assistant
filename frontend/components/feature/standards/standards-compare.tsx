"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IconActivity,
  IconCheck,
  IconCross,
  IconLoader,
} from "@/components/ui/icons";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { api } from "@/lib/api";
import type { StandardComparison } from "@/lib/types";

const COMPARISON_FIELDS = [
  "yield_strength",
  "tensile_strength",
  "size_range",
  "chemical_composition",
] as const;

export function StandardsCompare() {
  const t = useTranslations("standardsWorkspace");
  const [grades, setGrades] = React.useState(["DIN B500B", "ASTM A615 Grade 60"]);
  const [comparisons, setComparisons] = React.useState<StandardComparison[] | null>(
    null,
  );
  const [loading, setLoading] = React.useState(false);

  const setGrade = (index: number, value: string) => {
    setGrades((current) =>
      current.map((grade, gradeIndex) => (gradeIndex === index ? value : grade)),
    );
  };

  const addGrade = () => {
    if (grades.length < 4) setGrades((current) => [...current, ""]);
  };

  const removeGrade = (index: number) => {
    if (grades.length > 2) {
      setGrades((current) => current.filter((_, gradeIndex) => gradeIndex !== index));
    }
  };

  const compare = async () => {
    const validGrades = grades.map((grade) => grade.trim()).filter(Boolean);
    if (validGrades.length < 2) {
      toast.error(t("compare_requires_two"));
      return;
    }
    setLoading(true);
    setComparisons(null);
    try {
      const response = await api.rag.compare(validGrades);
      setComparisons(response.comparisons);
    } catch (error) {
      toast.error(t("compare_failed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Panel>
        <PanelHeader>
          <div>
            <PanelTitle>{t("compare_title")}</PanelTitle>
            <p className="mt-1 text-xs text-ink-subtle">{t("compare_subtitle")}</p>
          </div>
          <Badge variant="info" size="sm">
            {t("citation_backed")}
          </Badge>
        </PanelHeader>
        <PanelBody className="p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {grades.map((grade, index) => (
              <div key={index} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-ink-muted">
                  <label htmlFor={`comparison-grade-${index}`}>
                    {t("comparison_item", { number: index + 1 })}
                  </label>
                  {grades.length > 2 && (
                    <button
                      type="button"
                      aria-label={t("remove_comparison", { number: index + 1 })}
                      onClick={() => removeGrade(index)}
                      className="text-ink-subtle hover:text-negative"
                    >
                      {t("remove")}
                    </button>
                  )}
                </div>
                <input
                  id={`comparison-grade-${index}`}
                  value={grade}
                  onChange={(event) => setGrade(index, event.target.value)}
                  placeholder={t("grade_placeholder")}
                  className="h-10 rounded-sm border border-line bg-bg-sunken px-3 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-accent focus:bg-card"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => void compare()} disabled={loading}>
              {loading ? (
                <IconLoader className="size-4 animate-spin" />
              ) : (
                <IconActivity className="size-4" />
              )}
              {t("run_comparison")}
            </Button>
            {grades.length < 4 && (
              <Button variant="outline" onClick={addGrade}>
                {t("add_standard")}
              </Button>
            )}
          </div>
        </PanelBody>
      </Panel>

      {loading && <div className="skeleton h-80 rounded-md" />}

      {!loading && comparisons && (
        <Panel className="overflow-hidden">
          <PanelHeader>
            <div>
              <PanelTitle>{t("comparison_results")}</PanelTitle>
              <p className="mt-1 text-xs text-ink-subtle">
                {t("comparison_results_body")}
              </p>
            </div>
          </PanelHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-subtle">
                  <th className="sticky start-0 z-10 min-w-44 bg-bg-subtle px-5 py-3 text-start text-xs font-medium text-ink-muted">
                    {t("technical_property")}
                  </th>
                  {comparisons.map((comparison) => (
                    <th
                      key={comparison.grade}
                      className="min-w-56 px-4 py-3 text-start"
                    >
                      <p className="font-medium text-ink">{comparison.grade}</p>
                      <p className="mt-0.5 text-xs font-normal text-ink-subtle">
                        {t("source_count", { count: comparison.source_count })}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {COMPARISON_FIELDS.map((field) => (
                  <tr key={field}>
                    <th className="sticky start-0 z-10 bg-bg-sunken px-5 py-4 text-start text-xs font-medium text-ink-muted">
                      {t(`field_${field}`)}
                    </th>
                    {comparisons.map((comparison) => {
                      const value = comparison.specifications[field];
                      return (
                        <td
                          key={`${comparison.grade}-${field}`}
                          className="px-4 py-4 align-top"
                        >
                          {value ? (
                            <div>
                              <div className="flex items-start gap-2">
                                <IconCheck className="mt-0.5 size-4 text-positive" />
                                <p className="line-clamp-5 leading-6 text-ink">{value}</p>
                              </div>
                              {comparison.evidence[field] && (
                                <p className="mt-2 text-xs text-ink-subtle">
                                  {comparison.evidence[field]?.citation.metadata.standard_code} ·{" "}
                                  {t("page_short", {
                                    page: comparison.evidence[field]?.citation.page ?? 1,
                                  })}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-ink-subtle">
                              <IconCross className="size-4" />
                              <span>{t("not_found")}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {!loading && comparisons === null && (
        <Panel tone="subtle">
          <PanelBody className="flex flex-col items-center py-14 text-center">
            <IconActivity className="size-9 text-ink-subtle" />
            <p className="mt-3 text-sm font-medium text-ink">
              {t("compare_empty_title")}
            </p>
            <p className="mt-1 max-w-md text-sm leading-6 text-ink-muted">
              {t("compare_empty_body")}
            </p>
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}
