from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1)


class DatasheetRequest(BaseModel):
    grade: str = Field(..., min_length=1)
    company: str = ""


class ScrapeRequest(BaseModel):
    urls: list[str] = Field(default_factory=list)


class ArbitrageRequest(BaseModel):
    internal_avg: float


class ContractRequest(BaseModel):
    buyer: str
    seller: str
    rebar_grade: str
    tonnage: float
    price_per_ton: float


class RoadmapRequest(BaseModel):
    company_name: str
    target_market: str


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    system_prompt: str | None = None
