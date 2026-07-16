"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconSpark, IconSend, IconLoader, IconBot, IconUser } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { api, formatMarketApiError } from "@/lib/api";

interface QaEntry {
  question: string;
  answer: string;
}

export function BiInsightsPanel({ snapshotId, language }: { snapshotId: string; language: string }) {
  const t = useTranslations();
  const [narrative, setNarrative] = React.useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = React.useState(false);
  const [narrativeError, setNarrativeError] = React.useState<string | null>(null);
  const [question, setQuestion] = React.useState("");
  const [history, setHistory] = React.useState<QaEntry[]>([]);
  const [asking, setAsking] = React.useState(false);

  const loadNarrative = React.useCallback(async (forSnapshotId: string, forLanguage: string) => {
    setNarrativeLoading(true);
    setNarrativeError(null);
    try {
      const res = await api.bi.insights(forSnapshotId, forLanguage);
      setNarrative(res.narrative);
    } catch (e) {
      setNarrativeError(
        formatMarketApiError(e, t("bi.ai_unavailable"), t("bi.insights_failed")),
      );
    } finally {
      setNarrativeLoading(false);
    }
  }, [t]);

  // Reset the narrative/history whenever the dataset changes — derived
  // during render (React's documented pattern for resetting state on prop
  // change) rather than as a side effect.
  const datasetKey = `${snapshotId}:${language}`;
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null);
  if (loadedKey !== datasetKey) {
    setLoadedKey(datasetKey);
    setNarrative(null);
    setHistory([]);
  }

  React.useEffect(() => {
    loadNarrative(snapshotId, language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotId, language]);

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || asking) return;
    const q = question.trim();
    setQuestion("");
    setAsking(true);
    try {
      const res = await api.bi.ask(snapshotId, q, language);
      setHistory((h) => [...h, { question: q, answer: res.answer }]);
    } catch (e) {
      toast.error(formatMarketApiError(e, t("bi.ai_unavailable"), t("bi.ask_failed")));
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-md border border-line bg-accent-soft p-5 shadow-[var(--shadow-1)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconSpark className="size-4 text-accent" />
            <h3 className="font-display text-base leading-tight tracking-tight text-ink">
              {t("bi.executive_summary")}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadNarrative(snapshotId, language)}
            disabled={narrativeLoading}
          >
            {t("common.refresh")}
          </Button>
        </div>
        {narrativeLoading ? (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <IconLoader className="size-4 animate-spin" />
            {t("bi.generating_insights")}
          </div>
        ) : narrativeError ? (
          <p className="text-sm text-ink-muted">{narrativeError}</p>
        ) : (
          <p className="text-[14px] leading-relaxed text-ink">{narrative}</p>
        )}
      </div>

      <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]">
        <h3 className="mb-3 font-display text-base leading-tight tracking-tight text-ink">
          {t("bi.ask_your_data")}
        </h3>
        {history.length > 0 && (
          <div className="mb-4 flex flex-col gap-3">
            {history.map((entry, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <IconUser className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
                  <p className="text-[13px] font-medium text-ink">{entry.question}</p>
                </div>
                <div className="flex items-start gap-2 rounded-sm bg-bg-subtle p-3">
                  <IconBot className="mt-0.5 size-4 shrink-0 text-accent" />
                  <div className="text-[13px] leading-relaxed text-ink-muted">
                    <Markdown>{entry.answer}</Markdown>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={ask} className="flex items-center gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("bi.ask_placeholder")}
            disabled={asking}
            className="h-10 flex-1 rounded-sm border border-line bg-bg-sunken px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-accent focus:bg-card disabled:opacity-60"
          />
          <Button type="submit" variant="primary" size="icon" disabled={asking || !question.trim()}>
            {asking ? <IconLoader className="size-4 animate-spin" /> : <IconSend className="size-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
