"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IconActivity,
  IconCheck,
  IconDatasheet,
  IconDocument,
  IconSearch,
  IconStandards,
} from "@/components/ui/icons";
import { Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/ui/panel";
import type { StandardDocument } from "@/lib/types";

export type StandardsView = "overview" | "library" | "ask" | "compare" | "datasheets";
export type StandardsRole = "sales" | "technical" | "quality";

interface StandardsOverviewProps {
  documents: StandardDocument[];
  passages: number;
  needsReview: number;
  role: StandardsRole;
  onNavigate: (view: StandardsView) => void;
}

export function StandardsOverview({
  documents,
  passages,
  needsReview,
  role,
  onNavigate,
}: StandardsOverviewProps) {
  const t = useTranslations("standardsWorkspace");
  const recentDocuments = documents.slice(0, 4);
  const readyDocuments = documents.filter(
    (document) => document.processing_status === "ready",
  ).length;

  const roleCopy = {
    sales: t("role_sales_intro"),
    technical: t("role_technical_intro"),
    quality: t("role_quality_intro"),
  } satisfies Record<StandardsRole, string>;

  return (
    <div className="space-y-5">
      <Panel className="overflow-hidden">
        <PanelBody className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Badge variant="accent" size="sm">
              {t(`role_${role}`)}
            </Badge>
            <h2 className="mt-3 max-w-2xl font-display text-2xl leading-tight text-ink sm:text-3xl">
              {t("overview_title")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              {roleCopy[role]}
            </p>
          </div>
          <Button onClick={() => onNavigate("ask")} className="h-11 lg:min-w-44">
            <IconSearch className="size-4" />
            {t("ask_library")}
          </Button>
        </PanelBody>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: t("active_documents"),
            value: readyDocuments,
            icon: IconStandards,
            detail: t("library_ready"),
          },
          {
            label: t("indexed_passages"),
            value: passages,
            icon: IconDocument,
            detail: t("searchable_evidence"),
          },
          {
            label: t("needs_review"),
            value: needsReview,
            icon: IconActivity,
            detail: t("check_extraction"),
          },
          {
            label: t("verified_outputs"),
            value: 0,
            icon: IconCheck,
            detail: t("datasheets_start_empty"),
          },
        ].map((item) => (
          <Panel key={item.label}>
            <PanelBody className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-ink-muted">{item.label}</p>
                  <p className="mt-1 font-display text-3xl text-ink">{item.value}</p>
                </div>
                <div className="flex size-9 items-center justify-center rounded-sm border border-line bg-bg-subtle text-accent">
                  <item.icon className="size-4" />
                </div>
              </div>
              <p className="mt-3 text-xs text-ink-subtle">{item.detail}</p>
            </PanelBody>
          </Panel>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelHeader>
            <PanelTitle>{t("recent_documents")}</PanelTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("library")}>
              {t("view_library")}
            </Button>
          </PanelHeader>
          <PanelBody className="p-0">
            {recentDocuments.length ? (
              <div className="divide-y divide-line">
                {recentDocuments.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => onNavigate("library")}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-start transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <div className="flex size-9 items-center justify-center rounded-sm border border-line bg-bg-subtle text-accent">
                      <IconDocument className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {document.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-subtle">
                        {document.standard_code} · {document.page_count} {t("pages")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        document.processing_status === "ready" ? "positive" : "warning"
                      }
                      size="sm"
                    >
                      {t(`status_${document.processing_status}`)}
                    </Badge>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <IconStandards className="size-8 text-ink-subtle" />
                <p className="mt-3 text-sm font-medium text-ink">
                  {t("empty_library_title")}
                </p>
                <p className="mt-1 max-w-sm text-sm text-ink-muted">
                  {t("empty_library_body")}
                </p>
                <Button className="mt-4" onClick={() => onNavigate("library")}>
                  {t("upload_first_standard")}
                </Button>
              </div>
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>{t("quick_actions")}</PanelTitle>
          </PanelHeader>
          <PanelBody className="grid gap-2 p-3">
            {[
              {
                view: "ask" as const,
                icon: IconSearch,
                title: t("quick_ask"),
                body: t("quick_ask_body"),
              },
              {
                view: "compare" as const,
                icon: IconActivity,
                title: t("quick_compare"),
                body: t("quick_compare_body"),
              },
              {
                view: "datasheets" as const,
                icon: IconDatasheet,
                title: t("quick_datasheet"),
                body: t("quick_datasheet_body"),
              },
            ].map((action) => (
              <button
                key={action.view}
                type="button"
                onClick={() => onNavigate(action.view)}
                className="flex items-start gap-3 rounded-sm border border-transparent p-3 text-start transition-colors hover:border-line hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <action.icon className="mt-0.5 size-4 text-accent" />
                <span>
                  <span className="block text-sm font-medium text-ink">
                    {action.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-ink-muted">
                    {action.body}
                  </span>
                </span>
              </button>
            ))}
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
