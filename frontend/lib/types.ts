export type Currency = "USD" | "Tomans" | "Toman" | "IRR" | "Rials" | "Rial" | string;

export interface Kpis {
  revenue: number;
  tonnage: number;
  avg_price: number;
  conversion_rate: number;
}

export interface SalesRow {
  date?: string;
  customer?: string;
  "rebar grade"?: string;
  grade?: string;
  tonnage?: number | string;
  "unit price"?: number | string;
  "unit_price"?: number | string;
  status?: string;
  conversion?: number | string | boolean;
  [key: string]: unknown;
}

export interface GradeDatum {
  grade: string;
  tonnage: number;
  revenue: number;
}

export interface BiResult {
  kpis: Kpis;
  rows: SalesRow[];
  byGrade: GradeDatum[];
}

export interface RagResult {
  text: string;
  passage: string;
  source: string;
  page: number;
  score: number;
  metadata: {
    source: string;
    standard: string;
    page: number;
  };
}

export interface DatasheetSpec {
  available: boolean;
  grade: string;
  company: string;
  date: string;
  yield_strength?: string | null;
  tensile_strength?: string | null;
  size_range?: string | null;
  chemical_composition?: string | null;
  sources: RagResult[];
}

export interface PriceFeed {
  channel: string;
  text: string;
  price: number | null;
  parsed_price: number | null;
  currency: Currency;
  timestamp: string;
  date: string;
}

export interface MarketSource {
  id: string;
  type: string;
  title: string;
  url?: string | null;
  filename?: string | null;
  status: string;
  error?: string | null;
  chunk_count: number;
  excerpt?: string;
  meta?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface MarketCitation {
  title: string;
  url?: string;
  kind?: string;
  source_id?: string;
}

export interface MarketPricePoint {
  product?: string;
  grade?: string | null;
  size?: string | null;
  price: number;
  currency: Currency;
  unit?: string;
  region?: string | null;
  as_of?: string;
  label?: string;
  source_id?: string | null;
  source_title?: string | null;
  raw?: string;
  confidence?: number;
}

export interface MarketBriefing {
  summary: string;
  prices: MarketPricePoint[];
  citations?: MarketCitation[];
  updated_at?: string | null;
  mode?: string | null;
  source_count?: number;
  web_used?: boolean;
  watchlist?: { id: string; label: string; query?: string }[];
}

export interface ArbitrageResult {
  internal_avg: number;
  internal_compared?: number;
  market_price: number;
  currency: Currency;
  fx_rate?: number;
  deviation_pct: number;
  status: "opportunity" | "compliance" | "alert";
  message: string;
}

export interface ContractRequest {
  buyer: string;
  seller: string;
  rebar_grade: string;
  tonnage: number;
  price_per_ton: number;
}

export interface RoadmapRequest {
  company_name: string;
  target_market: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  system_prompt?: string;
  language?: string;
}

export interface SystemHealth {
  rag_records: number;
  rag_files: number;
  rag_files_list: string[];
  cache_count: number;
  market_sources?: number;
  market_briefing_at?: string | null;
  api_key_configured: boolean;
}

export interface ApiError {
  detail: string;
}
