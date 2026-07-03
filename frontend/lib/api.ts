import type {
  ArbitrageResult,
  BiResult,
  ChatMessage,
  ChatRequest,
  ContractRequest,
  DatasheetSpec,
  PriceFeed,
  RagResult,
  RoadmapRequest,
  SystemHealth,
} from "./types";

const _raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_BASE = _raw.startsWith("http") ? _raw : `https://${_raw}`;

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
      request<{ records: number; files: number; files_list: string[] }>(
        "/api/rag/state",
      ),
    index: async (files: File[]): Promise<{ indexed: string[]; total_records: number }> => {
      const form = new FormData();
      for (const f of files) form.append("files", f);
      return request("/api/rag/index", { method: "POST", body: form });
    },
    query: (query: string) =>
      request<RagResult[]>("/api/rag/query", {
        method: "POST",
        body: JSON.stringify({ query }),
      }),
    datasheet: (grade: string, company: string) =>
      request<DatasheetSpec>("/api/rag/datasheet", {
        method: "POST",
        body: JSON.stringify({ grade, company }),
      }),
  },

  market: {
    prices: () => request<PriceFeed[]>("/api/market/prices"),
    scrape: (urls: string[]) =>
      request<{ items: PriceFeed[]; count: number }>("/api/market/scrape", {
        method: "POST",
        body: JSON.stringify({ urls }),
      }),
    arbitrage: (internal_avg: number) =>
      request<ArbitrageResult>("/api/market/arbitrage", {
        method: "POST",
        body: JSON.stringify({ internal_avg }),
      }),
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
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        cache: "no-store",
        signal,
      });
      if (!res.ok || !res.body) {
        let detail = `Chat failed (${res.status})`;
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
            yield parsed.token ?? "";
          } catch {
            yield data;
          }
        }
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
