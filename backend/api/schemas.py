from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    document_ids: list[str] = Field(default_factory=list)
    standards: list[str] = Field(default_factory=list)
    limit: int = Field(default=20, ge=1, le=100)


class DatasheetRequest(BaseModel):
    grade: str = Field(..., min_length=1)
    company: str = ""
    document_ids: list[str] = Field(default_factory=list)


class StandardsCompareRequest(BaseModel):
    grades: list[str] = Field(..., min_length=2, max_length=4)
    document_ids: list[str] = Field(default_factory=list)


class ScrapeRequest(BaseModel):
    urls: list[str] = Field(default_factory=list)


class ArbitrageRequest(BaseModel):
    internal_avg: float
    fx_rate: float = 1.0
    market_price: float | None = None
    currency: str = "Tomans"


class MarketSourceCreate(BaseModel):
    type: str = Field(..., min_length=1)
    title: str = ""
    url: str | None = None
    text: str | None = None
    meta: dict | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class MarketAskRequest(BaseModel):
    message: str = Field(..., min_length=1)
    mode: str = "fast"  # fast | deep
    source_ids: list[str] = Field(default_factory=list)
    web: bool = True
    language: str = "en"
    messages: list[ChatMessage] = Field(default_factory=list)


class MarketBriefingRequest(BaseModel):
    language: str = "en"
    mode: str = "fast"
    use_web: bool = True
    watchlist: list[dict] | None = None


class MarketRefreshRequest(BaseModel):
    source_ids: list[str] = Field(default_factory=list)


class ContractRequest(BaseModel):
    buyer: str
    seller: str
    rebar_grade: str
    tonnage: float
    price_per_ton: float


class RoadmapRequest(BaseModel):
    company_name: str
    target_market: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    system_prompt: str | None = None
    language: str = "en"


class BiSnapshotRename(BaseModel):
    label: str = Field(..., min_length=1, max_length=120)


class BiInsightsRequest(BaseModel):
    snapshot_id: str
    language: str = "en"


class BiAskRequest(BaseModel):
    snapshot_id: str
    question: str = Field(..., min_length=1)
    language: str = "en"
