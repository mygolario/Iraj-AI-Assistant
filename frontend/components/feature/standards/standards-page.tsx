"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { StandardsAsk } from "@/components/feature/standards/standards-ask";
import { StandardsCompare } from "@/components/feature/standards/standards-compare";
import { StandardsDatasheets } from "@/components/feature/standards/standards-datasheets";
import { StandardsLibrary } from "@/components/feature/standards/standards-library";
import {
  StandardsOverview,
  type StandardsRole,
  type StandardsView,
} from "@/components/feature/standards/standards-overview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IconActivity,
  IconCross,
  IconDatasheet,
  IconDocument,
  IconLoader,
  IconRefresh,
  IconSearch,
  IconStandards,
  IconUpload,
} from "@/components/ui/icons";
import { api } from "@/lib/api";
import type { StandardDocument } from "@/lib/types";

const ROLE_STORAGE_KEY = "iraj-standards-role";

const VIEW_ICONS = {
  overview: IconStandards,
  library: IconDocument,
  ask: IconSearch,
  compare: IconActivity,
  datasheets: IconDatasheet,
} satisfies Record<StandardsView, typeof IconStandards>;

export function StandardsPage() {
  const t = useTranslations("standardsWorkspace");
  const [activeView, setActiveView] = React.useState<StandardsView>("overview");
  const [documents, setDocuments] = React.useState<StandardDocument[]>([]);
  const [passages, setPassages] = React.useState(0);
  const [needsReview, setNeedsReview] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [role, setRole] = React.useState<StandardsRole>("sales");
  const [initialQuery, setInitialQuery] = React.useState("");

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedRole = window.localStorage.getItem(ROLE_STORAGE_KEY);
      if (
        storedRole === "sales" ||
        storedRole === "technical" ||
        storedRole === "quality"
      ) {
        setRole(storedRole);
      }
      const query = new URLSearchParams(window.location.search).get("q")?.trim();
      if (query) {
        setInitialQuery(query);
        setActiveView("ask");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadWorkspace = React.useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [library, state] = await Promise.all([
        api.rag.documents(),
        api.rag.state(),
      ]);
      setDocuments(library.documents);
      setPassages(state.records);
      setNeedsReview(state.needs_review);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : t("load_failed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => void loadWorkspace(), 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspace]);

  const changeRole = (nextRole: StandardsRole) => {
    setRole(nextRole);
    window.localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
  };

  const uploadDocuments = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const result = await api.rag.index(files);
      if (result.indexed.length) {
        toast.success(t("upload_complete", { count: result.indexed.length }), {
          description: t("passages_ready", { count: result.total_records }),
        });
      }
      if (result.failures.length) {
        toast.error(t("upload_partial_failure", { count: result.failures.length }), {
          description: result.failures
            .slice(0, 2)
            .map((failure) => `${failure.filename}: ${failure.reason}`)
            .join("\n"),
        });
      }
      if (
        result.documents.length > 0 &&
        result.documents.every((document) => document.duplicate)
      ) {
        toast.info(t("duplicates_skipped"));
      }
      await loadWorkspace();
    } catch (error) {
      toast.error(t("upload_failed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = async (document: StandardDocument) => {
    if (!window.confirm(t("delete_confirmation", { title: document.title }))) return;
    try {
      await api.rag.deleteDocument(document.id);
      toast.success(t("document_deleted"));
      await loadWorkspace();
    } catch (error) {
      toast.error(t("delete_failed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const renderViews = () => (
    <>
      <div hidden={activeView !== "overview"}>
        <StandardsOverview
          documents={documents}
          passages={passages}
          needsReview={needsReview}
          role={role}
          onNavigate={setActiveView}
        />
      </div>
      <div hidden={activeView !== "library"}>
        <StandardsLibrary
          documents={documents}
          uploading={uploading}
          onUpload={(files) => void uploadDocuments(files)}
          onDelete={(document) => void removeDocument(document)}
          getDownloadUrl={api.rag.downloadUrl}
        />
      </div>
      <div hidden={activeView !== "ask"}>
        <StandardsAsk
          key={initialQuery}
          documents={documents}
          initialQuery={initialQuery}
        />
      </div>
      <div hidden={activeView !== "compare"}>
        <StandardsCompare />
      </div>
      <div hidden={activeView !== "datasheets"}>
        <StandardsDatasheets />
      </div>
    </>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent" size="sm">
              {t("workspace")}
            </Badge>
            {!loading && (
              <Badge
                variant={documents.length ? "positive" : "neutral"}
                size="sm"
              >
                {documents.length
                  ? t("library_online", { count: documents.length })
                  : t("library_empty")}
              </Badge>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex h-10 items-center gap-2 rounded-sm border border-line bg-card px-3 text-xs text-ink-muted shadow-[var(--shadow-1)]">
            <span>{t("personalize_for")}</span>
            <select
              value={role}
              onChange={(event) => changeRole(event.target.value as StandardsRole)}
              className="bg-transparent font-medium text-ink outline-none"
            >
              <option value="sales">{t("role_sales")}</option>
              <option value="technical">{t("role_technical")}</option>
              <option value="quality">{t("role_quality")}</option>
            </select>
          </label>
          <Button onClick={() => setActiveView("library")} className="h-10">
            <IconUpload className="size-4" />
            {t("upload_standard")}
          </Button>
        </div>
      </header>

      <nav
        aria-label={t("workspace_navigation")}
        className="overflow-x-auto rounded-md border border-line bg-card p-1 shadow-[var(--shadow-1)]"
      >
        <div className="flex min-w-max gap-1">
          {(Object.keys(VIEW_ICONS) as StandardsView[]).map((view) => {
            const Icon = VIEW_ICONS[view];
            const isActive = activeView === view;
            return (
              <button
                key={view}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => setActiveView(view)}
                className={`flex h-9 items-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? "bg-accent-soft text-accent-ink"
                    : "text-ink-muted hover:bg-bg-subtle hover:text-ink"
                }`}
              >
                <Icon className="size-4" />
                {t(`nav_${view}`)}
              </button>
            );
          })}
        </div>
      </nav>

      {loadError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-md border border-negative/30 bg-negative/5 p-4 text-sm text-negative sm:flex-row sm:items-center"
        >
          <IconCross className="size-4" />
          <div className="flex-1">
            <p className="font-medium">{t("load_failed")}</p>
            <p className="mt-1 text-xs">{loadError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadWorkspace()}>
            <IconRefresh className="size-4" />
            {t("retry")}
          </Button>
        </div>
      )}

      {loading && !loadError ? (
        <div className="flex min-h-80 items-center justify-center rounded-md border border-line bg-card">
          <div className="text-center">
            <IconLoader className="mx-auto size-6 animate-spin text-accent" />
            <p className="mt-3 text-sm text-ink-muted">{t("loading_workspace")}</p>
          </div>
        </div>
      ) : (
        renderViews()
      )}
    </div>
  );
}
