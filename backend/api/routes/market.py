"""Live Market Intelligence API — NotebookLM-style research desk."""

from __future__ import annotations

import json

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse

from api.schemas import (
    ArbitrageRequest,
    MarketAskRequest,
    MarketBriefingRequest,
    MarketRefreshRequest,
    MarketSourceCreate,
    ScrapeRequest,
)
from core.live_scraper import read_cached_prices, scrape_channels, write_price_cache
from core.market_agents import (
    ask_market_stream,
    build_briefing,
    compare_vs_internal,
    read_briefing,
    read_last_ask,
    read_snapshots,
)
from core.market_sources import (
    create_source,
    delete_source,
    get_source,
    list_sources_public,
    refresh_all_refreshable,
    refresh_source,
)
from core.sales_consultant import LLMError

router = APIRouter(prefix="/api/market", tags=["market"])


# --- Legacy scrape/prices (kept for ticker/dashboard compatibility) ---


@router.get("/prices")
async def get_prices():
    snaps = read_snapshots()
    if snaps:
        # Prefer structured snapshots shaped as PriceFeed-compatible
        out = []
        for p in reversed(snaps):
            if p.get("price") is None:
                continue
            out.append(
                {
                    "channel": p.get("label") or p.get("source_title") or "market",
                    "text": p.get("raw") or p.get("product") or "",
                    "price": p.get("price"),
                    "parsed_price": p.get("price"),
                    "currency": p.get("currency") or "Tomans",
                    "timestamp": p.get("as_of") or "",
                    "date": (p.get("as_of") or "")[:10],
                }
            )
            if len(out) >= 40:
                break
        if out:
            return out
    return read_cached_prices()


@router.post("/scrape")
async def run_scrape(req: ScrapeRequest):
    if not req.urls:
        raise HTTPException(400, "No source URLs provided.")
    if len(req.urls) > 50:
        raise HTTPException(400, "Maximum 50 source URLs allowed.")
    items = scrape_channels(req.urls)
    # Also register as telegram sources for the library (must not overwrite combined cache)
    for url in req.urls[:20]:
        try:
            create_source(source_type="telegram", url=url.strip(), title="")
        except Exception:
            pass
    # Ensure ticker/dashboard still see the full multi-channel scrape result
    write_price_cache(items)
    return {"items": items, "count": len(items)}


@router.post("/arbitrage")
async def arbitrage(req: ArbitrageRequest):
    try:
        return compare_vs_internal(
            internal_avg=req.internal_avg,
            market_price=req.market_price,
            currency=req.currency,
            fx_rate=req.fx_rate or 1.0,
        )
    except ValueError as e:
        raise HTTPException(404, str(e))


# --- Sources Library ---


@router.get("/sources")
async def get_sources():
    return {"sources": list_sources_public()}


@router.post("/sources")
async def add_source_json(req: MarketSourceCreate):
    try:
        record = create_source(
            source_type=req.type,
            title=req.title or "",
            url=req.url,
            text=req.text,
            meta=req.meta,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {
        "source": {
            k: record.get(k)
            for k in (
                "id",
                "type",
                "title",
                "url",
                "filename",
                "status",
                "error",
                "chunk_count",
                "excerpt",
                "meta",
                "created_at",
                "updated_at",
            )
        }
    }


@router.post("/sources/upload")
async def add_source_upload(
    type: str = Form("pdf"),
    title: str = Form(""),
    file: UploadFile = File(...),
):
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "Empty file")
    try:
        record = create_source(
            source_type=type,
            title=title or (file.filename or "Upload"),
            file_bytes=raw,
            filename=file.filename or "upload.bin",
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {
        "source": {
            k: record.get(k)
            for k in (
                "id",
                "type",
                "title",
                "url",
                "filename",
                "status",
                "error",
                "chunk_count",
                "excerpt",
                "meta",
                "created_at",
                "updated_at",
            )
        }
    }


@router.delete("/sources/{source_id}")
async def remove_source(source_id: str):
    if not delete_source(source_id):
        raise HTTPException(404, "Source not found")
    return {"ok": True}


@router.post("/sources/{source_id}/refresh")
async def refresh_one(source_id: str):
    if not get_source(source_id):
        raise HTTPException(404, "Source not found")
    try:
        src = refresh_source(source_id)
    except Exception as e:
        raise HTTPException(500, str(e))
    return {
        "source": {
            k: src.get(k)
            for k in (
                "id",
                "type",
                "title",
                "url",
                "filename",
                "status",
                "error",
                "chunk_count",
                "excerpt",
                "meta",
                "created_at",
                "updated_at",
            )
        }
    }


@router.post("/refresh")
async def refresh_batch(req: MarketRefreshRequest | None = None):
    req = req or MarketRefreshRequest()
    if req.source_ids:
        out = []
        for sid in req.source_ids:
            try:
                out.append(refresh_source(sid))
            except Exception:
                pass
        return {"refreshed": len(out), "sources": list_sources_public()}
    return refresh_all_refreshable()


# --- Studio briefing / snapshots ---


@router.get("/briefing")
async def get_briefing():
    return read_briefing()


@router.post("/briefing")
async def post_briefing(req: MarketBriefingRequest):
    try:
        return build_briefing(
            watchlist=req.watchlist,
            language=req.language,
            use_web=req.use_web,
            mode=req.mode if req.mode in ("fast", "deep") else "fast",
        )
    except LLMError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/snapshots")
async def get_snapshots():
    return {"items": read_snapshots()}


@router.get("/last-ask")
async def get_last_ask():
    return read_last_ask() or {}


# --- Ask (SSE) ---


@router.post("/ask")
async def ask_market(req: MarketAskRequest, request: Request):
    history = [m.model_dump() for m in req.messages]

    async def event_stream():
        try:
            for event in ask_market_stream(
                message=req.message,
                mode=req.mode,
                source_ids=req.source_ids or None,
                web=req.web,
                language=req.language,
                history=history,
            ):
                if await request.is_disconnected():
                    break
                if isinstance(event, dict):
                    if event.get("event") == "token":
                        yield f"data: {json.dumps({'token': event.get('token', '')})}\n\n"
                    elif event.get("event") == "done":
                        yield "data: [DONE]\n\n"
                    elif event.get("event") == "error":
                        yield f"data: [ERROR] {event.get('message')}\n\n"
                        return
                    else:
                        yield f"data: {json.dumps(event)}\n\n"
                else:
                    yield f"data: {json.dumps({'token': str(event)})}\n\n"
        except LLMError as e:
            yield f"data: [ERROR] {e}\n\n"
            return
        except Exception as e:
            yield f"data: [ERROR] Unexpected error: {e}\n\n"
            return

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
