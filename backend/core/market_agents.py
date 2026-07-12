"""Market Intelligence agents — Fast/Deep research, briefing, price extraction."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any, Generator

from config import (
    LLM_MODEL,
    MARKET_BRIEFING_FILE,
    MARKET_LAST_ASK_FILE,
    MARKET_SNAPSHOTS_FILE,
    MARKET_WEB_MODEL,
    PRICE_CACHE_FILE,
)
from core.live_scraper import parse_price_value, read_cached_prices
from core.market_sources import list_sources, retrieve_chunks
from core.sales_consultant import LLMError, _require_client, get_openrouter_client


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_json(path, default):
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return default


def _write_json(path, data) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def read_briefing() -> dict[str, Any]:
    return _read_json(
        MARKET_BRIEFING_FILE,
        {
            "summary": "",
            "prices": [],
            "updated_at": None,
            "mode": None,
            "source_count": 0,
            "web_used": False,
        },
    )


def read_snapshots() -> list[dict[str, Any]]:
    data = _read_json(MARKET_SNAPSHOTS_FILE, {"items": []})
    if isinstance(data, list):
        return data
    return data.get("items") or []


def read_last_ask() -> dict[str, Any] | None:
    data = _read_json(MARKET_LAST_ASK_FILE, None)
    return data if isinstance(data, dict) else None


def save_last_ask(payload: dict[str, Any]) -> None:
    _write_json(MARKET_LAST_ASK_FILE, payload)


def save_briefing(payload: dict[str, Any]) -> None:
    _write_json(MARKET_BRIEFING_FILE, payload)


def save_snapshots(items: list[dict[str, Any]]) -> None:
    # Keep last 200 structured prices; also mirror priced items into legacy cache for ticker compat
    trimmed = items[-200:]
    _write_json(MARKET_SNAPSHOTS_FILE, {"items": trimmed, "updated_at": _now()})
    legacy = []
    for p in reversed(trimmed):
        if p.get("price") is None:
            continue
        legacy.append(
            {
                "channel": p.get("label") or p.get("source_title") or "market",
                "text": p.get("raw") or p.get("product") or "",
                "price": p.get("price"),
                "parsed_price": p.get("price"),
                "currency": p.get("currency") or "Tomans",
                "timestamp": p.get("as_of") or _now(),
                "date": (p.get("as_of") or _now())[:10],
            }
        )
        if len(legacy) >= 40:
            break
    if legacy:
        try:
            with open(PRICE_CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(legacy, f, indent=2, ensure_ascii=False)
        except Exception:
            pass


def sonar_research(query: str, language: str = "en") -> dict[str, Any]:
    """Call Sonar Pro (or configured MARKET_WEB_MODEL) for live web research."""
    client = get_openrouter_client()
    if client is None:
        raise LLMError(
            "OPENROUTER_API_KEY is not configured. Set it in backend/.env to enable web research."
        )

    lang = (
        "Respond in Farsi (Persian). Keep product grades and units in English where helpful."
        if language == "fa"
        else "Respond in English."
    )
    system = (
        "You are a real-time market research assistant for a steel rebar sales manager in Iran/region. "
        "Find current prices, news, and competitor signals. Be specific with numbers, currencies, dates, "
        "and regions when available. Cite sources. If data is uncertain, say so.\n"
        f"{lang}"
    )
    try:
        resp = client.chat.completions.create(
            model=MARKET_WEB_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": query},
            ],
        )
        content = (resp.choices[0].message.content or "").strip()
        citations: list[dict[str, str]] = []
        # OpenRouter/Perplexity may attach annotations; also scrape markdown links
        msg = resp.choices[0].message
        anns = getattr(msg, "annotations", None) or []
        for a in anns:
            if isinstance(a, dict):
                url = (a.get("url") or a.get("citation") or {}).get("url") if isinstance(a.get("url"), dict) else a.get("url")
                title = a.get("title") or a.get("url") or "Web"
                if isinstance(url, str):
                    citations.append({"title": str(title)[:120], "url": url, "kind": "web"})
            else:
                url = getattr(a, "url", None)
                if url:
                    citations.append({"title": str(getattr(a, "title", url))[:120], "url": str(url), "kind": "web"})

        for m in re.finditer(r"\[([^\]]+)\]\((https?://[^)]+)\)", content):
            citations.append({"title": m.group(1)[:120], "url": m.group(2), "kind": "web"})

        # Dedupe by url
        seen = set()
        uniq = []
        for c in citations:
            if c["url"] in seen:
                continue
            seen.add(c["url"])
            uniq.append(c)

        return {"text": content, "citations": uniq[:12], "model": MARKET_WEB_MODEL}
    except LLMError:
        raise
    except Exception as e:
        raise LLMError(f"Web research (Sonar) failed: {e}")


def _extract_prices_regex(text: str, source: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    prices = []
    if not text:
        return prices
    # Split into lines for local context
    for line in text.splitlines():
        line = line.strip()
        if len(line) < 4:
            continue
        price, currency = parse_price_value(line)
        if price is None:
            continue
        product = "rebar"
        grade = None
        size = None
        gm = re.search(r"\b(A[23]|HRB\d+|B500[ABC]?|ASTM\s*A615)\b", line, re.I)
        if gm:
            grade = gm.group(1)
        sm = re.search(r"(?:Ø|Ф|phi|size)?\s*(\d{1,2})\s*mm\b", line, re.I)
        if not sm:
            sm = re.search(r"\b(\d{2})\b", line)
        if sm:
            size = sm.group(1)
        prices.append(
            {
                "product": product,
                "grade": grade,
                "size": size,
                "price": price,
                "currency": currency or "Tomans",
                "unit": "ton",
                "region": None,
                "as_of": _now(),
                "label": " ".join(x for x in [grade, f"Ø{size}" if size else None] if x) or "Market price",
                "source_id": (source or {}).get("source_id"),
                "source_title": (source or {}).get("source_title") or (source or {}).get("title") or "extracted",
                "raw": line[:240],
                "confidence": 0.55,
            }
        )
    return prices[:20]


def extract_prices_llm(texts: list[str], language: str = "en") -> list[dict[str, Any]]:
    """Structured price extraction via LLM; falls back to regex."""
    blob = "\n---\n".join(t[:3000] for t in texts if t)[:12000]
    if not blob.strip():
        return []

    regex_hits = _extract_prices_regex(blob)
    client = get_openrouter_client()
    if client is None:
        return regex_hits

    prompt = (
        "Extract steel/rebar market prices from the text. Return ONLY a JSON array of objects with keys: "
        "product, grade, size, price (number), currency, unit, region, label, confidence (0-1). "
        "If none found return [].\n\nTEXT:\n"
        f"{blob}"
    )
    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        )
        raw = (resp.choices[0].message.content or "").strip()
        m = re.search(r"\[[\s\S]*\]", raw)
        if not m:
            return regex_hits
        parsed = json.loads(m.group(0))
        out = []
        for p in parsed[:30]:
            if not isinstance(p, dict) or p.get("price") is None:
                continue
            out.append(
                {
                    "product": p.get("product") or "rebar",
                    "grade": p.get("grade"),
                    "size": str(p.get("size")) if p.get("size") is not None else None,
                    "price": float(p["price"]),
                    "currency": p.get("currency") or "Tomans",
                    "unit": p.get("unit") or "ton",
                    "region": p.get("region"),
                    "as_of": _now(),
                    "label": p.get("label")
                    or " ".join(
                        x
                        for x in [
                            p.get("grade"),
                            f"Ø{p.get('size')}" if p.get("size") else None,
                        ]
                        if x
                    )
                    or "Market price",
                    "source_id": None,
                    "source_title": "llm",
                    "raw": "",
                    "confidence": float(p.get("confidence") or 0.7),
                }
            )
        return out or regex_hits
    except Exception:
        return regex_hits


def compare_vs_internal(
    internal_avg: float,
    market_price: float | None = None,
    currency: str = "Tomans",
    fx_rate: float = 1.0,
) -> dict[str, Any]:
    """Smart vs Internal — explicit FX, no silent ×50."""
    snaps = read_snapshots()
    briefing = read_briefing()
    if market_price is None:
        prices = briefing.get("prices") or snaps
        priced = [p for p in prices if p.get("price") is not None]
        if not priced:
            legacy = [c for c in read_cached_prices() if c.get("price") is not None]
            if not legacy:
                raise ValueError("No market prices available yet. Run research or add sources.")
            market_price = float(legacy[0]["price"])
            currency = legacy[0].get("currency") or currency
        else:
            market_price = float(priced[0]["price"])
            currency = priced[0].get("currency") or currency

    # Normalize: if currencies may differ, apply fx_rate to internal when user says internal is USD
    # fx_rate = Tomans per 1 USD (user-editable). If internal looks like USD (< 10000) and market Tomans, convert.
    adj_internal = internal_avg
    note = ""
    market_is_toman = str(currency).lower() in ("tomans", "toman", "irr", "rials", "rial")
    if market_is_toman and internal_avg < 10000 and fx_rate and fx_rate > 1:
        adj_internal = internal_avg * fx_rate
        note = f"Internal avg converted with FX rate {fx_rate:,.0f} Tomans/USD."
    elif (not market_is_toman) and internal_avg > 10000 and fx_rate and fx_rate > 1:
        adj_internal = internal_avg / fx_rate
        note = f"Internal avg converted with FX rate {fx_rate:,.0f} Tomans/USD → USD."

    deviation = round(((adj_internal - market_price) / market_price) * 100, 2)
    if deviation > 5.0:
        status = "alert"
        message = (
            "Your internal sales price is significantly higher than the live market index. "
            "You may lose sales competitiveness — consider reviewing discount margins."
        )
    elif deviation < -5.0:
        status = "opportunity"
        message = (
            "Your internal sales price is significantly lower than the market index. "
            "You have room to increase prices and boost margins on upcoming inquiries."
        )
    else:
        status = "compliance"
        message = "Your prices are well aligned with the latest live market indexes (within 5% margin)."

    if note:
        message = f"{message} ({note})"

    return {
        "internal_avg": internal_avg,
        "internal_compared": adj_internal,
        "market_price": market_price,
        "currency": currency,
        "fx_rate": fx_rate,
        "deviation_pct": deviation,
        "status": status,
        "message": message,
    }


DEFAULT_WATCHLIST = [
    {"id": "a3-14", "label": "Rebar A3 Ø14", "query": "steel rebar A3 14mm price Iran Tomans"},
    {"id": "a3-16", "label": "Rebar A3 Ø16", "query": "steel rebar A3 16mm price Iran Tomans"},
    {"id": "a3-18", "label": "Rebar A3 Ø18", "query": "steel rebar A3 18mm price Iran"},
]


def build_briefing(
    *,
    watchlist: list[dict] | None = None,
    language: str = "en",
    use_web: bool = True,
    mode: str = "fast",
) -> dict[str, Any]:
    """Generate Studio Live Briefing from private sources and/or web."""
    watchlist = watchlist or DEFAULT_WATCHLIST
    sources = list_sources()
    citations: list[dict] = []
    all_prices: list[dict] = []
    web_notes: list[str] = []
    private_notes: list[str] = []

    # Private: gather recent telegram + excerpts
    for src in sources[:15]:
        if src.get("chunks"):
            private_notes.append(
                f"[{src.get('type')}] {src.get('title')}: {src['chunks'][0][:500]}"
            )
        for it in src.get("telegram_items") or []:
            if it.get("price") is not None:
                all_prices.append(
                    {
                        "product": "rebar",
                        "grade": None,
                        "size": None,
                        "price": it["price"],
                        "currency": it.get("currency") or "Tomans",
                        "unit": "ton",
                        "region": None,
                        "as_of": it.get("timestamp") or _now(),
                        "label": it.get("channel") or src.get("title"),
                        "source_id": src.get("id"),
                        "source_title": src.get("title"),
                        "raw": (it.get("text") or "")[:200],
                        "confidence": 0.65,
                    }
                )

    if private_notes:
        all_prices.extend(extract_prices_llm(private_notes, language=language)[:15])

    web_used = False
    if use_web:
        try:
            if mode == "deep":
                queries = [w.get("query") or w.get("label") for w in watchlist[:4]]
                queries.append("Iran steel rebar market price today news")
            else:
                queries = [
                    "Current steel rebar prices Iran market today "
                    + ", ".join(w.get("label", "") for w in watchlist[:3])
                ]
            for q in queries:
                if not q:
                    continue
                result = sonar_research(q, language=language)
                web_used = True
                web_notes.append(result["text"])
                citations.extend(result.get("citations") or [])
                all_prices.extend(extract_prices_llm([result["text"]], language=language))
                if mode == "fast":
                    break
        except LLMError as e:
            web_notes.append(f"(Web research unavailable: {e})")

    # Dedupe prices roughly by label+price
    seen = set()
    uniq_prices = []
    for p in all_prices:
        key = (p.get("label"), p.get("price"), p.get("currency"))
        if key in seen:
            continue
        seen.add(key)
        uniq_prices.append(p)

    # Synthesize summary
    summary = ""
    client = get_openrouter_client()
    context = "\n\n".join(
        [
            "PRIVATE SOURCE EXCERPTS:\n" + "\n".join(private_notes[:8]) if private_notes else "No private sources.",
            "WEB RESEARCH:\n" + "\n".join(web_notes[:4]) if web_notes else "No web notes.",
            "EXTRACTED PRICES:\n" + json.dumps(uniq_prices[:12], ensure_ascii=False),
        ]
    )
    lang = "Respond in Farsi." if language == "fa" else "Respond in English."
    if client:
        try:
            resp = client.chat.completions.create(
                model=LLM_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Write a concise market intelligence briefing (max 180 words) for a steel rebar "
                            "sales manager. Highlight key prices, freshness, conflicts, and action tips. "
                            f"{lang}"
                        ),
                    },
                    {"role": "user", "content": context},
                ],
                temperature=0.3,
            )
            summary = (resp.choices[0].message.content or "").strip()
        except Exception:
            summary = ""

    if not summary:
        if uniq_prices:
            bits = [
                f"{p.get('label')}: {p.get('price')} {p.get('currency')}" for p in uniq_prices[:5]
            ]
            summary = "Latest market signals — " + "; ".join(bits)
        elif web_notes:
            summary = web_notes[0][:500]
        else:
            summary = (
                "No market data yet. Ask a question (Fast/Deep research) or add sources to ground answers."
                if language != "fa"
                else "هنوز داده بازاری نیست. سؤال بپرسید یا منبع اضافه کنید."
            )

    # Citation dedupe
    cite_seen = set()
    uniq_cites = []
    for c in citations:
        u = c.get("url") or c.get("title")
        if u in cite_seen:
            continue
        cite_seen.add(u)
        uniq_cites.append(c)

    for src in sources[:8]:
        uniq_cites.append(
            {
                "title": src.get("title") or src.get("type"),
                "url": src.get("url") or "",
                "kind": "private",
                "source_id": src.get("id"),
            }
        )

    briefing = {
        "summary": summary,
        "prices": uniq_prices[:20],
        "citations": uniq_cites[:20],
        "updated_at": _now(),
        "mode": mode,
        "source_count": len(sources),
        "web_used": web_used,
        "watchlist": watchlist,
    }
    save_briefing(briefing)
    if uniq_prices:
        existing = read_snapshots()
        save_snapshots(existing + uniq_prices)
    return briefing


def _deep_plan(question: str, language: str) -> list[str]:
    client = get_openrouter_client()
    if client is None:
        return [
            question,
            f"{question} steel rebar price Iran",
            f"{question} market news competitors",
        ]
    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You plan deep market research. Return ONLY a JSON array of 3-5 short search queries "
                        "to answer the user about steel/rebar markets."
                    ),
                },
                {"role": "user", "content": question},
            ],
            temperature=0.2,
        )
        raw = (resp.choices[0].message.content or "").strip()
        m = re.search(r"\[[\s\S]*\]", raw)
        if m:
            arr = json.loads(m.group(0))
            return [str(x) for x in arr[:5] if x]
    except Exception:
        pass
    return [question, f"{question} price", f"{question} news"]


def ask_market_stream(
    *,
    message: str,
    mode: str = "fast",
    source_ids: list[str] | None = None,
    web: bool = True,
    language: str = "en",
    history: list[dict] | None = None,
) -> Generator[str, None, None]:
    """
    NotebookLM-style ask. Works with zero sources (web-only).
    Yields SSE-friendly text deltas; also yields special progress lines as tokens.
    """
    mode = "deep" if mode == "deep" else "fast"
    history = history or []
    citations: list[dict] = []
    private_hits = retrieve_chunks(message, source_ids=source_ids, limit=12 if mode == "deep" else 6)
    private_block = ""
    if private_hits:
        private_block = "\n\n".join(
            f"[{h.get('source_title')} | {h.get('source_type')}]\n{h.get('text')}"
            for h in private_hits
        )
        for h in private_hits:
            citations.append(
                {
                    "title": h.get("source_title") or "Source",
                    "url": h.get("url") or "",
                    "kind": "private",
                    "source_id": h.get("source_id"),
                }
            )

    web_blocks: list[str] = []
    web_error = None

    if web:
        yield {"event": "progress", "step": "web", "label": "Searching the live web…"}
        queries = [message] if mode == "fast" else _deep_plan(message, language)
        for q in queries:
            try:
                result = sonar_research(q, language=language)
                web_blocks.append(result["text"])
                citations.extend(result.get("citations") or [])
            except LLMError as e:
                web_error = str(e)
                break
            if mode == "fast":
                break
    elif not private_hits:
        yield {
            "event": "error",
            "message": "No sources selected and web research is disabled.",
        }
        return

    if private_hits:
        yield {"event": "progress", "step": "sources", "label": "Reading your sources…"}

    yield {"event": "progress", "step": "synthesize", "label": "Synthesizing answer…"}

    # Extract prices in background for Studio
    texts = web_blocks + ([private_block] if private_block else [])
    prices = extract_prices_llm(texts, language=language) if texts else []
    if prices:
        snaps = read_snapshots()
        save_snapshots(snaps + prices)

    lang = (
        "Respond in Farsi (Persian). Keep technical terms in English when useful."
        if language == "fa"
        else "Respond in English."
    )
    grounding = (
        "You may answer from live web research alone when private sources are empty. "
        "When private sources exist, prefer them for proprietary prices and note conflicts with web data. "
        "Always cite. Never invent exact prices — if unknown, say what is missing."
    )
    system = (
        f"You are Iraj Market Intelligence — a NotebookLM-style research desk for steel rebar sales. "
        f"Mode: {mode}. {grounding}\n{lang}"
    )
    user_ctx = (
        f"QUESTION:\n{message}\n\n"
        f"PRIVATE SOURCES ({'none' if not private_block else 'available'}):\n{private_block or '(none — web-only OK)'}\n\n"
        f"WEB RESEARCH:\n{chr(10).join(web_blocks) if web_blocks else (web_error or '(none)')}\n\n"
        f"EXTRACTED PRICE CANDIDATES:\n{json.dumps(prices[:10], ensure_ascii=False)}"
    )

    client = _require_client()
    messages = [{"role": "system", "content": system}]
    for msg in history[-8:]:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    messages.append({"role": "user", "content": user_ctx})

    # Dedupe citations
    seen = set()
    uniq_cites = []
    for c in citations:
        key = c.get("url") or c.get("title")
        if key in seen:
            continue
        seen.add(key)
        uniq_cites.append(c)

    yield {"event": "meta", "mode": mode, "citations": uniq_cites[:15], "prices": prices[:10], "web_used": bool(web_blocks), "source_hits": len(private_hits)}

    acc = []
    try:
        stream = client.chat.completions.create(
            model=LLM_MODEL, messages=messages, stream=True, temperature=0.3
        )
        for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta.content
            if delta:
                acc.append(delta)
                yield {"event": "token", "token": delta}
    except Exception as e:
        raise LLMError(f"Market ask stream failed: {e}")

    answer = "".join(acc).strip()
    save_last_ask(
        {
            "question": message,
            "answer": answer,
            "mode": mode,
            "citations": uniq_cites[:15],
            "prices": prices[:10],
            "updated_at": _now(),
            "web_used": bool(web_blocks),
            "source_hits": len(private_hits),
        }
    )

    # Light briefing update from this ask
    briefing = read_briefing()
    if prices:
        merged = (prices + (briefing.get("prices") or []))[:20]
        briefing["prices"] = merged
        briefing["updated_at"] = _now()
        if not briefing.get("summary"):
            briefing["summary"] = answer[:400]
        save_briefing(briefing)

    yield {"event": "done"}
