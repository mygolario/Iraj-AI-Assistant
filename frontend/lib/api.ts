import type {
  ArbitrageResult,
  BiResult,
  ChatMessage,
  ChatRequest,
  ContractRequest,
  DatasheetSpec,
  MarketBriefing,
  MarketSource,
  PriceFeed,
  RagResult,
  RoadmapRequest,
  StandardComparison,
  StandardDocument,
  SystemHealth,
} from "./types";

const _raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_BASE = _raw.startsWith("http") ? _raw : `https://${_raw}`;

/** FastAPI default 404 detail, or a generic HTTP 404 from the API client. */
export function isMarketAgentUnavailableError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error ?? ""))
    .trim()
    .toLowerCase();
  return message === "not found" || message === "request failed (404)";
}

export function formatMarketApiError(
  error: unknown,
  unavailableMessage: string,
  fallback: string,
): string {
  if (isMarketAgentUnavailableError(error)) return unavailableMessage;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      detail = data.detail ?? detail;
    } catch {
      /* ignore parse error */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

async function* streamSse(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): AsyncGenerator<Record<string, unknown> | string, void, unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal,
  });
  if (!res.ok || !res.body) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      detail = data.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      if (data.startsWith("[ERROR]")) throw new Error(data.slice(7).trim());
      try {
        const parsed = JSON.parse(data);
        yield parsed as Record<string, unknown>;
      } catch {
        yield data;
      }
    }
  }
}

export const api = {
  health: () => request<SystemHealth>("/api/health"),

  bi: {
    upload: async (file: File): Promise<BiResult> => {
      const form = new FormData();
      form.append("file", file);
      return request<BiResult>("/api/bi/kpis", { method: "POST", body: form });
    },
  },

  rag: {
    state: () =>
      request<{
        records: number;
        files: number;
        files_list: string[];
        ready_files: number;
        needs_review: number;
      }>(
        "/api/rag/state",
      ),
    documents: () =>
      request<{ documents: StandardDocument[] }>("/api/rag/documents"),
    index: async (
      files: File[],
    ): Promise<{
      indexed: string[];
      documents: StandardDocument[];
      failures: { filename: string; reason: string }[];
      total_records: number;
    }> => {
      const form = new FormData();
      for (const f of files) form.append("files", f);
      return request("/api/rag/index", { method: "POST", body: form });
    },
    deleteDocument: (documentId: string) =>
      request<{ ok: boolean }>(`/api/rag/documents/${documentId}`, {
        method: "DELETE",
      }),
    downloadUrl: (documentId: string) =>
      `${API_BASE}/api/rag/documents/${documentId}/download`,
    query: (
      query: string,
      options: {
        document_ids?: string[];
        standards?: string[];
        limit?: number;
      } = {},
    ) =>
      request<RagResult[]>("/api/rag/query", {
        method: "POST",
        body: JSON.stringify({ query, ...options }),
      }),
    datasheet: (
      grade: string,
      company: string,
      documentIds: string[] = [],
    ) =>
      request<DatasheetSpec>("/api/rag/datasheet", {
        method: "POST",
        body: JSON.stringify({
          grade,
          company,
          document_ids: documentIds,
        }),
      }),
    compare: (grades: string[], documentIds: string[] = []) =>
      request<{ comparisons: StandardComparison[] }>("/api/rag/compare", {
        method: "POST",
        body: JSON.stringify({ grades, document_ids: documentIds }),
      }),
  },

  market: {
    prices: () => request<PriceFeed[]>("/api/market/prices"),
    scrape: (urls: string[]) =>
      request<{ items: PriceFeed[]; count: number }>("/api/market/scrape", {
        method: "POST",
        body: JSON.stringify({ urls }),
      }),
    arbitrage: (
      internal_avg: number,
      fx_rate = 1,
      market_price?: number,
      currency = "Tomans",
    ) =>
      request<ArbitrageResult>("/api/market/arbitrage", {
        method: "POST",
        body: JSON.stringify({ internal_avg, fx_rate, market_price, currency }),
      }),
    sources: () => request<{ sources: MarketSource[] }>("/api/market/sources"),
    addSource: (payload: {
      type: string;
      title?: string;
      url?: string;
      text?: string;
      meta?: Record<string, unknown>;
    }) =>
      request<{ source: MarketSource }>("/api/market/sources", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    uploadSource: async (file: File, type: string, title = "") => {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);
      form.append("title", title || file.name);
      return request<{ source: MarketSource }>("/api/market/sources/upload", {
        method: "POST",
        body: form,
      });
    },
    deleteSource: (id: string) =>
      request<{ ok: boolean }>(`/api/market/sources/${id}`, { method: "DELETE" }),
    refreshSource: (id: string) =>
      request<{ source: MarketSource }>(`/api/market/sources/${id}/refresh`, {
        method: "POST",
      }),
    refresh: (source_ids: string[] = []) =>
      request<{ refreshed: number; sources: MarketSource[] }>("/api/market/refresh", {
        method: "POST",
        body: JSON.stringify({ source_ids }),
      }),
    briefing: () => request<MarketBriefing>("/api/market/briefing"),
    buildBriefing: (payload: {
      language?: string;
      mode?: string;
      use_web?: boolean;
      watchlist?: { id: string; label: string; query?: string }[];
    }) =>
      request<MarketBriefing>("/api/market/briefing", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    snapshots: () => request<{ items: unknown[] }>("/api/market/snapshots"),
    askStream: async function* (
      req: {
        message: string;
        mode?: "fast" | "deep";
        source_ids?: string[];
        web?: boolean;
        language?: string;
        messages?: ChatMessage[];
      },
      signal?: AbortSignal,
    ): AsyncGenerator<Record<string, unknown>, void, unknown> {
      for await (const ev of streamSse("/api/market/ask", req, signal)) {
        if (typeof ev === "string") {
          yield { event: "token", token: ev };
        } else if ("token" in ev && !ev.event) {
          yield { event: "token", token: ev.token };
        } else {
          yield ev;
        }
      }
    },
  },

  sales: {
    contract: (req: ContractRequest) =>
      request<{ markdown: string }>("/api/sales/contract", {
        method: "POST",
        body: JSON.stringify(req),
      }),
    roadmap: (req: RoadmapRequest) =>
      request<{ markdown: string }>("/api/sales/roadmap", {
        method: "POST",
        body: JSON.stringify(req),
      }),
  },

  chat: {
    stream: async function* (
      req: ChatRequest,
      signal?: AbortSignal,
    ): AsyncGenerator<string, void, unknown> {
      for await (const ev of streamSse("/api/chat", req, signal)) {
        if (typeof ev === "string") yield ev;
        else if (ev.token) yield String(ev.token);
      }
    },
  },
};

export const INITIAL_CHAT: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Hi! I'm your Iraj Sales Copilot. Ask me about steel standards, live market prices, deal margins, or sales strategy — I can also help draft contracts and roadmaps.",
  },
];

export const DEFAULT_MARKET_WATCHLIST = [
  { id: "a3-14", label: "Rebar A3 Ø14", query: "steel rebar A3 14mm price Iran Tomans" },
  { id: "a3-16", label: "Rebar A3 Ø16", query: "steel rebar A3 16mm price Iran Tomans" },
  { id: "a3-18", label: "Rebar A3 Ø18", query: "steel rebar A3 18mm price Iran" },
];
