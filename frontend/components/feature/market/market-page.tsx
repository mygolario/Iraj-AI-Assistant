"use client";

import * as React from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import {
  IconBolt,
  IconRefresh,
  IconTrendUp,
  IconTrendDown,
  IconTrendFlat,
  IconFeed,
  IconTrash,
  IconUpload,
  IconGlobe,
  IconSend,
  IconStop,
  IconLoader,
  IconSpark,
  IconDocument,
  IconClose,
} from "@/components/ui/icons";
import { api, DEFAULT_MARKET_WATCHLIST, formatMarketApiError, isMarketAgentUnavailableError } from "@/lib/api";
import type {
  ArbitrageResult,
  BiResult,
  ChatMessage,
  MarketBriefing,
  MarketCitation,
  MarketSource,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

function IconPlus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

type ResearchMode = "fast" | "deep";
type SourceType =
  | "telegram"
  | "website"
  | "news"
  | "pdf"
  | "excel"
  | "screenshot"
  | "paste"
  | "internal"
  | "competitor";

type AskMsg = ChatMessage & {
  progress?: string;
  citations?: MarketCitation[];
  mode?: ResearchMode;
};

const STATUS_META = {
  opportunity: { icon: IconTrendUp, labelKey: "opportunity" as const },
  compliance: { icon: IconTrendFlat, labelKey: "compliant" as const },
  alert: { icon: IconTrendDown, labelKey: "alert" as const },
};

const toneByStatus: Record<ArbitrageResult["status"], string> = {
  opportunity: "text-positive",
  compliance: "text-ink",
  alert: "text-negative",
};

const inputCls =
  "w-full rounded-sm border border-line bg-bg-sunken p-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-accent focus:bg-card";

const SOURCE_TYPES: { id: SourceType; labelKey: string }[] = [
  { id: "telegram", labelKey: "type_telegram" },
  { id: "website", labelKey: "type_website" },
  { id: "news", labelKey: "type_news" },
  { id: "pdf", labelKey: "type_pdf" },
  { id: "excel", labelKey: "type_excel" },
  { id: "screenshot", labelKey: "type_screenshot" },
  { id: "paste", labelKey: "type_paste" },
  { id: "internal", labelKey: "type_internal" },
  { id: "competitor", labelKey: "type_competitor" },
];

function loadWatchlist() {
  try {
    const raw = localStorage.getItem("iraj-market-watchlist");
    if (raw) return JSON.parse(raw) as typeof DEFAULT_MARKET_WATCHLIST;
  } catch {
    /* ignore */
  }
  return DEFAULT_MARKET_WATCHLIST;
}

function loadFx() {
  try {
    const raw = localStorage.getItem("iraj-market-fx");
    if (raw) return Number(raw) || 1;
  } catch {
    /* ignore */
  }
  return 1;
}

function loadThread(): AskMsg[] {
  try {
    const raw = localStorage.getItem("iraj-market-thread");
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

export function MarketPage() {
  const t = useTranslations("market");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [sources, setSources] = React.useState<MarketSource[]>([]);
  const [briefing, setBriefing] = React.useState<MarketBriefing | null>(null);
  const [mode, setMode] = React.useState<ResearchMode>("fast");
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<AskMsg[]>([]);
  const [streaming, setStreaming] = React.useState(false);
  const [progress, setProgress] = React.useState<string | null>(null);
  const [citationsOpen, setCitationsOpen] = React.useState<MarketCitation[] | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addType, setAddType] = React.useState<SourceType>("telegram");
  const [addTitle, setAddTitle] = React.useState("");
  const [addUrl, setAddUrl] = React.useState("");
  const [addText, setAddText] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [briefLoading, setBriefLoading] = React.useState(false);
  const [watchlist, setWatchlist] = React.useState(DEFAULT_MARKET_WATCHLIST);
  const [fxRate, setFxRate] = React.useState(1);
  const [arbitrage, setArbitrage] = React.useState<ArbitrageResult | null>(null);
  const [arbLoading, setArbLoading] = React.useState(false);
  const [backendMismatch, setBackendMismatch] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const hydrated = React.useRef(false);

  const suggestions = React.useMemo(
    () => [t("suggest_1"), t("suggest_2"), t("suggest_3"), t("suggest_4")],
    [t],
  );

  const marketError = React.useCallback(
    (error: unknown, fallbackKey: "briefing_failed" | "refresh_failed" | "ask_failed" | "source_add_failed" | "delete_failed" | "arbitrage_failed") =>
      formatMarketApiError(error, t("agent_unavailable"), t(fallbackKey)),
    [t],
  );

  const loadSources = React.useCallback(async () => {
    try {
      const data = await api.market.sources();
      setSources(data.sources);
      setBackendMismatch(false);
    } catch (e) {
      setSources([]);
      if (isMarketAgentUnavailableError(e)) setBackendMismatch(true);
    }
  }, []);

  const loadBriefing = React.useCallback(async () => {
    try {
      setBriefing(await api.market.briefing());
    } catch (e) {
      setBriefing(null);
      if (isMarketAgentUnavailableError(e)) setBackendMismatch(true);
    }
  }, []);

  React.useEffect(() => {
    setWatchlist(loadWatchlist());
    setFxRate(loadFx());
    setMessages(loadThread());
    hydrated.current = true;
    loadSources();
    loadBriefing();
  }, [loadSources, loadBriefing]);

  React.useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem("iraj-market-thread", JSON.stringify(messages.slice(-40)));
    } catch {
      /* ignore */
    }
  }, [messages]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, progress]);

  // Auto-refresh briefing every 10 minutes
  React.useEffect(() => {
    const id = window.setInterval(() => {
      void refreshBriefing("fast", true);
    }, 10 * 60 * 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, watchlist]);

  const refreshBriefing = async (m: ResearchMode = mode, silent = false) => {
    setBriefLoading(true);
    try {
      const data = await api.market.buildBriefing({
        language: locale,
        mode: m,
        use_web: true,
        watchlist,
      });
      setBriefing(data);
      if (!silent) toast.success(t("briefing_updated"));
    } catch (e) {
      if (isMarketAgentUnavailableError(e)) setBackendMismatch(true);
      if (!silent) toast.error(marketError(e, "briefing_failed"));
    } finally {
      setBriefLoading(false);
    }
  };

  const refreshSources = async () => {
    setRefreshing(true);
    try {
      const res = await api.market.refresh();
      setSources(res.sources);
      setBackendMismatch(false);
      toast.success(t("sources_refreshed", { count: res.refreshed }));
      await refreshBriefing("fast", true);
    } catch (e) {
      if (isMarketAgentUnavailableError(e)) setBackendMismatch(true);
      toast.error(marketError(e, "refresh_failed"));
    } finally {
      setRefreshing(false);
    }
  };

  const submitAsk = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    const userMsg: AskMsg = { role: "user", content };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "", mode }]);
    setInput("");
    setStreaming(true);
    setProgress(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let acc = "";
      let cites: MarketCitation[] = [];
      for await (const ev of api.market.askStream(
        {
          message: content,
          mode,
          source_ids: sources.map((s) => s.id),
          web: true,
          language: locale,
          messages: history.map(({ role, content: c }) => ({ role, content: c })),
        },
        controller.signal,
      )) {
        if (ev.event === "progress") {
          setProgress(String(ev.label || ""));
        } else if (ev.event === "meta") {
          cites = (ev.citations as MarketCitation[]) || [];
        } else if (ev.event === "token" || ev.token) {
          acc += String(ev.token || "");
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              role: "assistant",
              content: acc,
              citations: cites,
              mode,
            };
            return next;
          });
        }
      }
      setProgress(null);
      await loadBriefing();
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        if (isMarketAgentUnavailableError(e)) setBackendMismatch(true);
        toast.error(marketError(e, "ask_failed"));
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setStreaming(false);
      setProgress(null);
      abortRef.current = null;
    }
  };

  const stopAsk = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setProgress(null);
  };

  const addSource = async () => {
    setAdding(true);
    try {
      if (["pdf", "excel", "screenshot"].includes(addType)) {
        fileRef.current?.click();
        setAdding(false);
        return;
      }
      if (["telegram", "website", "news"].includes(addType) && !addUrl.trim()) {
        toast.error(t("url_required"));
        setAdding(false);
        return;
      }
      if (["paste", "internal", "competitor"].includes(addType) && !addText.trim()) {
        toast.error(t("text_required"));
        setAdding(false);
        return;
      }
      const { source } = await api.market.addSource({
        type: addType,
        title: addTitle,
        url: addUrl || undefined,
        text: addText || undefined,
      });
      setSources((prev) => [source, ...prev]);
      toast.success(t("source_added"));
      setAddOpen(false);
      setAddUrl("");
      setAddText("");
      setAddTitle("");
    } catch (e) {
      if (isMarketAgentUnavailableError(e)) setBackendMismatch(true);
      toast.error(marketError(e, "source_add_failed"));
    } finally {
      setAdding(false);
    }
  };

  const onFilePicked = async (files: FileList | null) => {
    if (!files?.length) return;
    setAdding(true);
    try {
      for (const file of Array.from(files)) {
        let type: SourceType = addType;
        const name = file.name.toLowerCase();
        if (name.endsWith(".pdf")) type = "pdf";
        else if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv"))
          type = "excel";
        else if (/\.(png|jpe?g|webp|gif)$/.test(name)) type = "screenshot";
        const { source } = await api.market.uploadSource(file, type, addTitle || file.name);
        setSources((prev) => [source, ...prev]);
      }
      toast.success(t("source_added"));
      setAddOpen(false);
      setAddTitle("");
    } catch (e) {
      if (isMarketAgentUnavailableError(e)) setBackendMismatch(true);
      toast.error(marketError(e, "source_add_failed"));
    } finally {
      setAdding(false);
    }
  };

  const removeSource = async (id: string) => {
    try {
      await api.market.deleteSource(id);
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      if (isMarketAgentUnavailableError(e)) setBackendMismatch(true);
      toast.error(marketError(e, "delete_failed"));
    }
  };

  const runVsInternal = async () => {
    setArbLoading(true);
    try {
      let avg = 0;
      try {
        const raw = localStorage.getItem("iraj-last-bi");
        if (raw) {
          const bi = JSON.parse(raw) as BiResult;
          avg = bi?.kpis?.avg_price || 0;
        }
      } catch {
        /* ignore */
      }
      if (!avg) {
        toast.error(t("upload_bi_first"));
        return;
      }
      const result = await api.market.arbitrage(avg, fxRate);
      setArbitrage(result);
    } catch (e) {
      if (isMarketAgentUnavailableError(e)) setBackendMismatch(true);
      toast.error(marketError(e, "arbitrage_failed"));
    } finally {
      setArbLoading(false);
    }
  };

  const saveFx = (v: number) => {
    setFxRate(v);
    localStorage.setItem("iraj-market-fx", String(v));
  };

  const groundingChip =
    sources.length === 0 ? t("web_only") : t("web_plus_sources", { count: sources.length });

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
            {t("notebook_kicker")}
          </p>
          <h1 className="font-display text-3xl tracking-tight text-ink md:text-4xl">
            {t("notebook_title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t("notebook_subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-normal">
            {groundingChip}
          </Badge>
          {briefing?.updated_at && (
            <span className="text-[12px] text-ink-subtle">
              {t("updated", { time: new Date(briefing.updated_at).toLocaleString(locale) })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshBriefing(mode)}
            disabled={briefLoading}
          >
            <IconRefresh className={cn("size-3.5", briefLoading && "animate-spin")} />
            {t("refresh_briefing")}
          </Button>
        </div>
      </header>

      {backendMismatch && (
        <div
          role="alert"
          className="rounded-md border border-negative/40 bg-negative/10 px-4 py-3 text-sm text-ink"
        >
          <p className="font-medium text-negative">{t("backend_mismatch_title")}</p>
          <p className="mt-1 text-ink-muted">{t("backend_mismatch_body")}</p>
        </div>
      )}

      {/* Three-pane desk */}
      <div className="grid flex-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        {/* Sources rail */}
        <aside className="flex flex-col rounded-md border border-line bg-card shadow-[var(--shadow-1)]">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <div className="flex items-center gap-2">
              <IconFeed className="size-4 text-accent" />
              <span className="text-sm font-medium text-ink">{t("sources")}</span>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={refreshSources}
                disabled={refreshing}
                className="rounded-sm p-1.5 text-ink-muted hover:bg-bg-subtle hover:text-ink"
                title={tc("refresh")}
              >
                <IconRefresh className={cn("size-3.5", refreshing && "animate-spin")} />
              </button>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="rounded-sm p-1.5 text-ink-muted hover:bg-bg-subtle hover:text-ink"
                title={t("add_source")}
              >
                <IconPlus className="size-3.5" />
              </button>
            </div>
          </div>
          <p className="border-b border-line px-3 py-2 text-[12px] text-ink-subtle">
            {t("sources_optional")}
          </p>
          <div className="flex-1 space-y-1 overflow-y-auto p-2" style={{ maxHeight: "70vh" }}>
            {sources.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
                <IconGlobe className="size-6 text-ink-subtle" />
                <p className="text-[13px] text-ink-muted">{t("no_sources")}</p>
                <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                  {t("add_source")}
                </Button>
              </div>
            ) : (
              sources.map((s) => (
                <div
                  key={s.id}
                  className="group rounded-sm border border-transparent px-2 py-2 hover:border-line hover:bg-bg-subtle"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-ink">{s.title}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-subtle">
                        <span>{t(`type_${s.type}` as "type_telegram")}</span>
                        <span>·</span>
                        <span
                          className={cn(
                            s.status === "ready" && "text-positive",
                            s.status === "error" && "text-negative",
                          )}
                        >
                          {s.status}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSource(s.id)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <IconTrash className="size-3.5 text-ink-subtle hover:text-negative" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Ask — hero */}
        <section className="flex min-h-[520px] flex-col rounded-md border border-line bg-card shadow-[var(--shadow-1)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <IconSpark className="size-4 text-accent" />
              <span className="font-medium text-ink">{t("ask_title")}</span>
            </div>
            <div className="flex rounded-sm border border-line bg-bg-sunken p-0.5">
              {(["fast", "deep"] as ResearchMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-sm px-3 py-1.5 text-[12px] font-medium transition-colors",
                    mode === m
                      ? "bg-card text-ink shadow-[var(--shadow-1)]"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {m === "fast" ? t("mode_fast") : t("mode_deep")}
                </button>
              ))}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-4 text-center">
                <div className="flex size-12 items-center justify-center rounded-sm border border-line bg-bg-subtle text-accent">
                  <IconBolt className="size-5" />
                </div>
                <div>
                  <h2 className="font-display text-2xl tracking-tight text-ink">
                    {t("empty_ask_title")}
                  </h2>
                  <p className="mt-1 max-w-md text-sm text-ink-muted">{t("empty_ask_body")}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => submitAsk(s)}
                      className="rounded-sm border border-line bg-bg-subtle px-3 py-1.5 text-[13px] text-ink-muted transition-colors hover:border-accent/40 hover:text-ink"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-sm px-3 py-2.5 text-sm",
                    m.role === "user"
                      ? "ms-8 bg-accent-soft text-ink"
                      : "me-4 border border-line bg-bg-subtle",
                  )}
                >
                  {m.role === "assistant" ? (
                    <>
                      {m.mode && (
                        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
                          {m.mode === "deep" ? t("mode_deep") : t("mode_fast")}
                        </div>
                      )}
                      {m.content ? (
                        <Markdown>{m.content}</Markdown>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-ink-muted">
                          <IconLoader className="size-3.5 animate-spin" />
                          {progress || tc("loading")}
                        </span>
                      )}
                      {!!m.citations?.length && (
                        <button
                          type="button"
                          onClick={() => setCitationsOpen(m.citations || null)}
                          className="mt-2 text-[12px] font-medium text-accent hover:underline"
                        >
                          {t("view_citations", { count: m.citations.length })}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              ))
            )}
            {progress && streaming && (
              <p className="text-[12px] text-ink-subtle animate-pulse">{progress}</p>
            )}
          </div>

          <form
            className="border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submitAsk();
            }}
          >
            <div className="flex gap-2">
              <input
                className={cn(inputCls, "flex-1")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("ask_placeholder")}
                disabled={streaming}
              />
              {streaming ? (
                <Button type="button" variant="outline" onClick={stopAsk}>
                  <IconStop className="size-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={!input.trim()}>
                  <IconSend className="size-4" />
                </Button>
              )}
            </div>
          </form>
        </section>

        {/* Studio */}
        <aside className="flex flex-col gap-3">
          <div className="rounded-md border border-line bg-card p-4 shadow-[var(--shadow-1)]">
            <div className="mb-3 flex items-center gap-2">
              <IconDocument className="size-4 text-accent" />
              <h3 className="text-sm font-medium text-ink">{t("studio_briefing")}</h3>
            </div>
            {briefLoading && !briefing?.summary ? (
              <div className="space-y-2">
                <div className="skeleton h-3 w-full rounded-sm" />
                <div className="skeleton h-3 w-4/5 rounded-sm" />
                <div className="skeleton h-3 w-3/5 rounded-sm" />
              </div>
            ) : (
              <p className="text-[13px] leading-relaxed text-ink-muted whitespace-pre-wrap">
                {briefing?.summary || t("studio_empty")}
              </p>
            )}
          </div>

          <div className="rounded-md border border-line bg-card p-4 shadow-[var(--shadow-1)]">
            <h3 className="mb-3 text-sm font-medium text-ink">{t("studio_prices")}</h3>
            <div className="space-y-2">
              {(briefing?.prices || []).slice(0, 6).map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-t border-line pt-2 first:border-0 first:pt-0"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-ink">
                      {p.label || p.product || "—"}
                    </div>
                    <div className="text-[11px] text-ink-subtle">
                      {p.source_title || p.currency}
                    </div>
                  </div>
                  <div className="font-mono text-sm font-semibold tabular-nums text-ink">
                    {formatCurrency(p.price, p.currency)}
                  </div>
                </div>
              ))}
              {!briefing?.prices?.length && (
                <p className="text-[13px] text-ink-subtle">{t("no_prices_yet")}</p>
              )}
            </div>
          </div>

          <div className="rounded-md border border-line bg-card p-4 shadow-[var(--shadow-1)]">
            <h3 className="mb-2 text-sm font-medium text-ink">{t("watchlist")}</h3>
            <ul className="space-y-1.5">
              {watchlist.map((w) => (
                <li key={w.id} className="text-[13px] text-ink-muted">
                  {w.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border border-line bg-card p-4 shadow-[var(--shadow-1)]">
            <h3 className="mb-2 text-sm font-medium text-ink">{t("vs_internal")}</h3>
            <p className="mb-3 text-[12px] text-ink-subtle">{t("vs_internal_desc")}</p>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
              {t("fx_rate")}
            </label>
            <input
              type="number"
              className={cn(inputCls, "mb-3")}
              value={fxRate}
              onChange={(e) => saveFx(Number(e.target.value) || 1)}
              min={1}
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={runVsInternal}
              disabled={arbLoading}
            >
              {arbLoading ? <IconLoader className="size-3.5 animate-spin" /> : null}
              {t("check_vs_internal")}
            </Button>
            {arbitrage && (
              <div className="mt-3 space-y-1 border-t border-line pt-3">
                <div className="flex justify-between text-[12px]">
                  <span className="text-ink-subtle">{t("internal_avg")}</span>
                  <span className="font-mono tabular-nums">
                    {formatNumber(arbitrage.internal_compared ?? arbitrage.internal_avg)}
                  </span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-ink-subtle">{t("market_index")}</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(arbitrage.market_price, arbitrage.currency)}
                  </span>
                </div>
                <div
                  className={cn(
                    "mt-2 flex items-center gap-1.5 text-sm font-medium",
                    toneByStatus[arbitrage.status],
                  )}
                >
                  {React.createElement(STATUS_META[arbitrage.status].icon, {
                    className: "size-4",
                  })}
                  {formatNumber(arbitrage.deviation_pct)}% · {t(STATUS_META[arbitrage.status].labelKey)}
                </div>
                <p className="text-[12px] leading-relaxed text-ink-muted">{arbitrage.message}</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Add source modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-lg rounded-md border border-line bg-card p-5 shadow-[var(--shadow-3)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl text-ink">{t("add_source")}</h3>
              <button type="button" onClick={() => setAddOpen(false)}>
                <IconClose className="size-4 text-ink-muted" />
              </button>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {SOURCE_TYPES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setAddType(st.id)}
                  className={cn(
                    "rounded-sm border px-2.5 py-1 text-[12px]",
                    addType === st.id
                      ? "border-accent bg-accent-soft text-accent-ink"
                      : "border-line text-ink-muted hover:text-ink",
                  )}
                >
                  {t(st.labelKey as "type_telegram")}
                </button>
              ))}
            </div>
            <input
              className={cn(inputCls, "mb-2")}
              placeholder={t("source_title_ph")}
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
            />
            {["telegram", "website", "news"].includes(addType) && (
              <input
                className={cn(inputCls, "mb-2")}
                placeholder={
                  addType === "telegram" ? "https://t.me/s/channel" : "https://example.com"
                }
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
              />
            )}
            {["paste", "internal", "competitor"].includes(addType) && (
              <textarea
                className={cn(inputCls, "mb-2 min-h-28 font-mono text-[13px]")}
                placeholder={t("paste_placeholder")}
                value={addText}
                onChange={(e) => setAddText(e.target.value)}
              />
            )}
            {["pdf", "excel", "screenshot"].includes(addType) && (
              <p className="mb-3 text-[13px] text-ink-muted">{t("upload_hint")}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                {tc("cancel")}
              </Button>
              <Button onClick={addSource} disabled={adding}>
                {adding ? <IconLoader className="size-3.5 animate-spin" /> : <IconUpload className="size-3.5" />}
                {["pdf", "excel", "screenshot"].includes(addType) ? t("choose_file") : t("add_source")}
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              multiple
              accept={
                addType === "pdf"
                  ? ".pdf"
                  : addType === "excel"
                    ? ".xlsx,.xls,.csv"
                    : "image/*"
              }
              onChange={(e) => onFilePicked(e.target.files)}
            />
          </div>
        </div>
      )}

      {/* Citations drawer */}
      {citationsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/30">
          <div className="h-full w-full max-w-md border-s border-line bg-card p-5 shadow-[var(--shadow-3)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl text-ink">{t("citations")}</h3>
              <button type="button" onClick={() => setCitationsOpen(null)}>
                <IconClose className="size-4" />
              </button>
            </div>
            <ul className="space-y-3">
              {citationsOpen.map((c, i) => (
                <li key={i} className="rounded-sm border border-line p-3">
                  <div className="text-[11px] uppercase tracking-wider text-ink-subtle">
                    {c.kind || "source"}
                  </div>
                  <div className="mt-1 text-sm font-medium text-ink">{c.title}</div>
                  {c.url ? (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate text-[12px] text-accent hover:underline"
                    >
                      {c.url}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
