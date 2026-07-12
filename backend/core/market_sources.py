"""Market Sources Library — optional private grounding for Live Market."""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from config import MARKET_LIBRARY_FILE, MARKET_UPLOAD_DIR
from core.live_scraper import scrape_channels

SOURCE_TYPES = {
    "telegram",
    "website",
    "news",
    "pdf",
    "excel",
    "screenshot",
    "paste",
    "internal",
    "competitor",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_library() -> dict[str, Any]:
    if MARKET_LIBRARY_FILE.exists():
        try:
            with open(MARKET_LIBRARY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict) and "sources" in data:
                return data
        except Exception:
            pass
    return {"sources": [], "updated_at": None}


def _save_library(lib: dict[str, Any]) -> None:
    lib["updated_at"] = _now()
    with open(MARKET_LIBRARY_FILE, "w", encoding="utf-8") as f:
        json.dump(lib, f, indent=2, ensure_ascii=False)


def list_sources() -> list[dict[str, Any]]:
    return _load_library()["sources"]


def get_source(source_id: str) -> dict[str, Any] | None:
    for s in list_sources():
        if s.get("id") == source_id:
            return s
    return None


def delete_source(source_id: str) -> bool:
    lib = _load_library()
    before = len(lib["sources"])
    kept = []
    for s in lib["sources"]:
        if s.get("id") == source_id:
            path = s.get("file_path")
            if path:
                try:
                    Path(path).unlink(missing_ok=True)
                except Exception:
                    pass
            continue
        kept.append(s)
    lib["sources"] = kept
    _save_library(lib)
    return len(kept) < before


def _chunk_text(text: str, max_chars: int = 1200) -> list[str]:
    text = (text or "").strip()
    if not text:
        return []
    paras = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    chunks: list[str] = []
    buf = ""
    for p in paras:
        if len(buf) + len(p) + 2 <= max_chars:
            buf = f"{buf}\n\n{p}".strip() if buf else p
        else:
            if buf:
                chunks.append(buf)
            if len(p) <= max_chars:
                buf = p
            else:
                for i in range(0, len(p), max_chars):
                    chunks.append(p[i : i + max_chars])
                buf = ""
    if buf:
        chunks.append(buf)
    return chunks[:80]


def _extract_pdf_text(file_path: str) -> str:
    try:
        import pypdf

        reader = pypdf.PdfReader(file_path)
        parts = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        return "\n".join(parts)
    except Exception:
        return ""


def _extract_excel_text(file_path: str) -> str:
    try:
        import pandas as pd

        frames = []
        xl = pd.ExcelFile(file_path)
        for sheet in xl.sheet_names[:5]:
            df = xl.parse(sheet).head(200)
            frames.append(f"## Sheet: {sheet}\n{df.to_csv(index=False)}")
        return "\n\n".join(frames)
    except Exception:
        try:
            import pandas as pd

            df = pd.read_csv(file_path).head(200)
            return df.to_csv(index=False)
        except Exception:
            return ""


def _fetch_url_text(url: str) -> tuple[str, str | None]:
    """Fetch a public URL and return (text, error)."""
    import urllib.request

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; IrajMarketBot/1.0)"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read()
            ctype = (resp.headers.get("Content-Type") or "").lower()
        text = raw.decode("utf-8", errors="ignore")
        if "html" in ctype or "<html" in text.lower()[:500]:
            text = re.sub(r"(?is)<script.*?>.*?</script>", " ", text)
            text = re.sub(r"(?is)<style.*?>.*?</style>", " ", text)
            text = re.sub(r"<[^>]+>", " ", text)
            text = re.sub(r"\s+", " ", text).strip()
        return text[:50000], None
    except Exception as e:
        return "", str(e)


def _telegram_to_text(url: str) -> tuple[str, list[dict], str | None]:
    items = scrape_channels([url])
    if not items:
        return "", [], "Could not fetch Telegram channel preview"
    lines = []
    for it in items[:40]:
        price = it.get("price")
        cur = it.get("currency") or ""
        price_bit = f" | price={price} {cur}" if price is not None else ""
        lines.append(
            f"[{it.get('date')}] {it.get('channel')}: {it.get('text', '')[:500]}{price_bit}"
        )
    return "\n".join(lines), items, None


def _vision_extract(file_path: str, hint: str = "") -> str:
    """Use vision LLM to extract text/prices from an image."""
    try:
        import base64
        from core.sales_consultant import get_openrouter_client
        from config import MARKET_VISION_MODEL

        client = get_openrouter_client()
        if client is None:
            return ""
        data = Path(file_path).read_bytes()
        b64 = base64.b64encode(data).decode("ascii")
        suffix = Path(file_path).suffix.lower().lstrip(".") or "png"
        mime = "image/png" if suffix == "png" else f"image/{suffix}"
        if suffix in ("jpg", "jpeg"):
            mime = "image/jpeg"
        prompt = (
            "Extract all visible text, prices, product grades, sizes, currencies, "
            "dates, and competitor names from this market/pricing screenshot. "
            "Return plain text suitable for a market intelligence notebook."
        )
        if hint:
            prompt += f"\nContext: {hint}"
        resp = client.chat.completions.create(
            model=MARKET_VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{b64}"},
                        },
                    ],
                }
            ],
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception:
        return ""


def create_source(
    *,
    source_type: str,
    title: str = "",
    url: str | None = None,
    text: str | None = None,
    file_bytes: bytes | None = None,
    filename: str | None = None,
    meta: dict | None = None,
) -> dict[str, Any]:
    source_type = (source_type or "").strip().lower()
    if source_type not in SOURCE_TYPES:
        raise ValueError(f"Unsupported source type: {source_type}")

    source_id = str(uuid.uuid4())
    file_path: str | None = None
    content = (text or "").strip()
    error: str | None = None
    telegram_items: list[dict] = []

    if file_bytes and filename:
        safe = re.sub(r"[^a-zA-Z0-9._-]+", "_", filename)[:120]
        dest = MARKET_UPLOAD_DIR / f"{source_id}_{safe}"
        dest.write_bytes(file_bytes)
        file_path = str(dest)

        lower = filename.lower()
        if source_type == "pdf" or lower.endswith(".pdf"):
            source_type = "pdf"
            content = _extract_pdf_text(str(dest))
            if not content:
                error = "Could not extract text from PDF"
        elif source_type == "excel" or lower.endswith((".xlsx", ".xls", ".csv")):
            source_type = "excel"
            content = _extract_excel_text(str(dest))
            if not content:
                error = "Could not parse spreadsheet"
        elif source_type == "screenshot" or lower.endswith(
            (".png", ".jpg", ".jpeg", ".webp", ".gif")
        ):
            source_type = "screenshot"
            content = _vision_extract(str(dest), hint=title or "")
            if not content:
                error = "Could not extract text from screenshot (vision unavailable)"
        elif not content:
            try:
                content = dest.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                error = "Unsupported file"

    if url and source_type == "telegram":
        content, telegram_items, error = _telegram_to_text(url)
        if not title:
            m = re.search(r"t\.me/(?:s/)?([^/?#]+)", url)
            title = m.group(1) if m else url
    elif url and source_type in ("website", "news"):
        fetched, err = _fetch_url_text(url)
        content = fetched or content
        error = err
        if not title:
            title = urlparse(url).netloc or url

    if source_type in ("paste", "internal", "competitor") and not content:
        error = error or "No text content provided"

    if not title:
        title = filename or url or f"{source_type} source"

    chunks = _chunk_text(content)
    status = "ready" if chunks and not error else ("error" if error else "empty")

    record = {
        "id": source_id,
        "type": source_type,
        "title": title,
        "url": url,
        "filename": filename,
        "file_path": file_path,
        "status": status,
        "error": error,
        "chunk_count": len(chunks),
        "excerpt": (content[:400] if content else ""),
        "chunks": chunks,
        "meta": meta or {},
        "created_at": _now(),
        "updated_at": _now(),
        "telegram_items": telegram_items[:20] if telegram_items else [],
    }

    lib = _load_library()
    lib["sources"].insert(0, record)
    # Cap library size
    lib["sources"] = lib["sources"][:60]
    _save_library(lib)

    # Public-facing record without full chunks dump for list UIs can still include chunks
    return record


def refresh_source(source_id: str) -> dict[str, Any]:
    src = get_source(source_id)
    if not src:
        raise KeyError("Source not found")

    content = ""
    error = None
    telegram_items: list[dict] = []

    if src["type"] == "telegram" and src.get("url"):
        content, telegram_items, error = _telegram_to_text(src["url"])
    elif src["type"] in ("website", "news") and src.get("url"):
        content, error = _fetch_url_text(src["url"])
    elif src.get("file_path") and Path(src["file_path"]).exists():
        path = src["file_path"]
        if src["type"] == "pdf":
            content = _extract_pdf_text(path)
        elif src["type"] == "excel":
            content = _extract_excel_text(path)
        elif src["type"] == "screenshot":
            content = _vision_extract(path, hint=src.get("title") or "")
        else:
            content = Path(path).read_text(encoding="utf-8", errors="ignore")
    else:
        # Static paste/internal — keep existing chunks
        return src

    chunks = _chunk_text(content)
    lib = _load_library()
    for i, s in enumerate(lib["sources"]):
        if s["id"] == source_id:
            s["chunks"] = chunks
            s["chunk_count"] = len(chunks)
            s["excerpt"] = content[:400] if content else ""
            s["error"] = error
            s["status"] = "ready" if chunks and not error else ("error" if error else "empty")
            s["updated_at"] = _now()
            s["telegram_items"] = telegram_items[:20] if telegram_items else s.get("telegram_items", [])
            lib["sources"][i] = s
            _save_library(lib)
            return s
    raise KeyError("Source not found")


def refresh_all_refreshable() -> dict[str, Any]:
    results = []
    for s in list_sources():
        if s.get("type") in ("telegram", "website", "news") or (
            s.get("type") == "screenshot" and s.get("file_path")
        ):
            try:
                results.append(refresh_source(s["id"]))
            except Exception as e:
                results.append({**s, "status": "error", "error": str(e)})
    return {"refreshed": len(results), "sources": [_public_source(r) for r in results]}


def retrieve_chunks(
    query: str,
    source_ids: list[str] | None = None,
    limit: int = 12,
) -> list[dict[str, Any]]:
    """Simple keyword retrieve over source chunks (optional grounding)."""
    q = (query or "").lower()
    terms = [t for t in re.split(r"\W+", q) if len(t) > 2]
    hits: list[dict[str, Any]] = []

    for src in list_sources():
        if source_ids and src["id"] not in source_ids:
            continue
        if src.get("status") not in ("ready", "empty"):
            # still allow ready chunks even if error on last refresh
            if not src.get("chunks"):
                continue
        for idx, chunk in enumerate(src.get("chunks") or []):
            low = chunk.lower()
            score = sum(1 for t in terms if t in low) if terms else 1
            if terms and score == 0:
                # light fallback: include first chunks of selected sources
                if source_ids and idx < 2:
                    score = 0.2
                else:
                    continue
            hits.append(
                {
                    "source_id": src["id"],
                    "source_title": src.get("title"),
                    "source_type": src.get("type"),
                    "url": src.get("url"),
                    "chunk_index": idx,
                    "text": chunk,
                    "score": score,
                }
            )

    hits.sort(key=lambda h: h["score"], reverse=True)
    if not hits and source_ids:
        # If specific sources selected but no keyword hits, return first chunks
        for src in list_sources():
            if src["id"] not in source_ids:
                continue
            for idx, chunk in enumerate((src.get("chunks") or [])[:3]):
                hits.append(
                    {
                        "source_id": src["id"],
                        "source_title": src.get("title"),
                        "source_type": src.get("type"),
                        "url": src.get("url"),
                        "chunk_index": idx,
                        "text": chunk,
                        "score": 0.1,
                    }
                )
    return hits[:limit]


def _public_source(s: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": s.get("id"),
        "type": s.get("type"),
        "title": s.get("title"),
        "url": s.get("url"),
        "filename": s.get("filename"),
        "status": s.get("status"),
        "error": s.get("error"),
        "chunk_count": s.get("chunk_count", 0),
        "excerpt": s.get("excerpt", ""),
        "meta": s.get("meta") or {},
        "created_at": s.get("created_at"),
        "updated_at": s.get("updated_at"),
    }


def list_sources_public() -> list[dict[str, Any]]:
    return [_public_source(s) for s in list_sources()]
