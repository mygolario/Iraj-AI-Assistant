from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import bi, chat, market, rag, sales
from config import CORS_ORIGINS, api_key_configured
from core.live_scraper import read_cached_prices
from core.market_agents import read_briefing, read_snapshots
from core.market_sources import list_sources_public
from core.rag_engine import get_index_state

app = FastAPI(
    title="Iraj Sales AI — Backend",
    description="Multi-agent backend for steel rebar sales: BI, RAG, market intelligence, contracts, AI copilot.",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    rag = get_index_state()
    cache = read_cached_prices()
    snaps = read_snapshots()
    briefing = read_briefing()
    sources = list_sources_public()
    return {
        "rag_records": rag["records"],
        "rag_files": rag["files"],
        "rag_files_list": rag["files_list"],
        "cache_count": len(snaps) or len(cache),
        "market_sources": len(sources),
        "market_briefing_at": briefing.get("updated_at"),
        "api_key_configured": api_key_configured(),
    }


app.include_router(bi.router)
app.include_router(rag.router)
app.include_router(market.router)
app.include_router(sales.router)
app.include_router(chat.router)


@app.get("/")
async def root():
    return {"name": "Iraj Sales AI Backend", "status": "ok", "docs": "/docs"}
