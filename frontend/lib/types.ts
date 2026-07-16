export type Currency = "USD" | "Tomans" | "Toman" | "IRR" | "Rials" | "Rial" | string;

export interface Kpis {
  revenue: number;
  tonnage: number;
  avg_price: number;
  conversion_rate: number;
  avg_deal_size: number;
  price_volatility: number;
  total_inquiries: number;
  converted_deals: number;
  avg_sales_cycle_days: number | null;
  top5_customer_concentration_pct: number;
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
  rep?: string | null;
  region?: string | null;
  cost?: number | null;
  quote_date?: string | null;
  close_date?: string | null;
  [key: string]: unknown;
}

export interface GradeDatum {
  grade: string;
  tonnage: number;
  revenue: number;
}

export interface CustomerDatum {
  customer: string;
  tonnage: number;
  revenue: number;
  deals: number;
}

export interface RepDatum {
  rep: string;
  tonnage: number;
  revenue: number;
  deals: number;
}

export interface RegionDatum {
  region: string;
  tonnage: number;
  revenue: number;
}

export interface TimeSeriesPoint {
  month: string;
  revenue: number;
  tonnage: number;
  deals: number;
}

export interface BiForecast {
  next_month_revenue: number;
  next_month_tonnage: number;
  based_on_months: number;
}

export interface BiAnomaly {
  type: "price_outlier" | "revenue_drop" | string;
  message: string;
  date: string | null;
  customer: string | null;
}

export interface BiMargin {
  gross_profit: number;
  gross_margin_pct: number;
}

export interface BiDataQuality {
  rows_seen: number;
  rows_used: number;
  rows_skipped: number;
  skipped_reasons: Record<string, number>;
  unmapped_headers: string[];
  missing_required_fields: string[];
  optional_fields_detected: string[];
}

export interface BiResult {
  kpis: Kpis;
  rows: SalesRow[];
  byGrade: GradeDatum[];
  byCustomer: CustomerDatum[];
  byRep: RepDatum[];
  byRegion: RegionDatum[];
  timeSeries: TimeSeriesPoint[];
  forecast: BiForecast | null;
  anomalies: BiAnomaly[];
  margin: BiMargin | null;
  dataQuality: BiDataQuality;
}

export interface BiSnapshot extends BiResult {
  id: string;
  label: string;
  created_at: string;
  updated_at: string;
}

export interface BiSnapshotMeta {
  id: string;
  label: string;
  created_at: string;
  updated_at: string;
  row_count: number;
  date_range: [string, string] | null;
  revenue: number;
  tonnage: number;
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
