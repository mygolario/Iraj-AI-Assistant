import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from api.schemas import ChatRequest
from core.live_scraper import read_cached_prices
from core.rag_engine import query_standards
from core.sales_consultant import LLMError, consult_sales_stream

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _build_system_prompt(user_msg: str, language: str = "en") -> str:
    context_parts = []

    rag_results = query_standards(user_msg)
    if rag_results:
        rag_ctx = "\n".join(
            f"- Standard: {r['metadata']['standard']} ({r['metadata']['source']}): {r['text']}"
            for r in rag_results[:3]
        )
        context_parts.append(f"Relevant standards from RAG index:\n{rag_ctx}")

    cached = read_cached_prices()
    if cached:
        priced = [c for c in cached if c.get("price")][:3]
        if priced:
            price_ctx = ", ".join(
                f"{c['channel']}: {c['price']} {c['currency']}" for c in priced
            )
            context_parts.append(f"Latest live market prices: {price_ctx}")

    context_block = "\n\n".join(context_parts) if context_parts else "(no live context available)"

    lang_instruction = (
        "Respond in Farsi (Persian). Keep technical terms "
        "(ASTM, DIN, JIS, SAE, GB/T, rebar, tonnage, yield strength, etc.) in English."
        if language == "fa"
        else "Respond in English."
    )

    return (
        "You are Iraj Sales AI Copilot, assisting the Sales Manager of a steel rebar manufacturer. "
        "Provide professional, detailed, context-aware sales insights. "
        "When relevant, reference the standards and live market data below. "
        "If a question is outside your scope, say so clearly rather than guessing.\n\n"
        f"{lang_instruction}\n\n"
        f"{context_block}"
    )


@router.post("")
async def chat(req: ChatRequest, request: Request):
    history = [m.model_dump() for m in req.messages]
    last_user = next(
        (m["content"] for m in reversed(history) if m["role"] == "user"), ""
    )
    system_prompt = req.system_prompt or _build_system_prompt(last_user, req.language)

    async def event_stream():
        try:
            for delta in consult_sales_stream(history, system_prompt):
                if await request.is_disconnected():
                    break
                yield f"data: {json.dumps({'token': delta})}\n\n"
        except LLMError as e:
            yield f"data: [ERROR] {e}\n\n"
            return
        except Exception as e:
            yield f"data: [ERROR] Unexpected error: {e}\n\n"
            return
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
