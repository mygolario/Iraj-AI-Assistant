import hashlib
import json
import os
import re
import shutil
import threading
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import pypdf
from openai import OpenAI

from config import (
    EMBEDDING_MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    STANDARDS_FILE_DIR,
    STANDARDS_INDEX_FILE,
    STANDARDS_LIBRARY_FILE,
)

_WRITE_LOCK = threading.Lock()
_INGEST_LOCK = threading.Lock()
_DOCUMENT_INDEX: list[dict] = []
_DOCUMENTS: list[dict] = []

_SYNONYMS = {
    "yield strength": ["yield point", "re", "r_e", "minimum yield"],
    "yield point": ["yield strength", "re", "r_e", "minimum yield"],
    "tensile strength": ["tensile", "rm", "r_m", "ultimate strength"],
    "elongation": ["ductility", "a5", "a10"],
    "grade 60": ["gr60", "gr 60", "grade 60"],
    "b500b": ["b500b", "500 mpa", "din 488"],
}

_STANDARD_PATTERNS = (
    ("ASTM", r"\bASTM\s+[A-Z]\s*\d+(?:[/-]\w+)?"),
    ("DIN", r"\bDIN\s+\d+(?:[-/]\d+)*"),
    ("JIS", r"\bJIS\s+[A-Z]\s*\d+"),
    ("GB/T", r"\b(?:GB/T|GBT)\s*\d+(?:\.\d+)?"),
    ("BS", r"\bBS\s+\d+(?:[-:]\d+)*"),
    ("SAE", r"\bSAE\s+[A-Z]?\s*\d+"),
)


def _read_json(path: Path, fallback: list[dict]) -> list[dict]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else fallback
    except (OSError, json.JSONDecodeError):
        return fallback


def _write_json(path: Path, value: list[dict]) -> None:
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    temporary.replace(path)


def _load_library() -> None:
    global _DOCUMENTS, _DOCUMENT_INDEX
    _DOCUMENTS = _read_json(STANDARDS_LIBRARY_FILE, [])
    _DOCUMENT_INDEX = _read_json(STANDARDS_INDEX_FILE, [])


def _persist_library() -> None:
    with _WRITE_LOCK:
        _write_json(STANDARDS_LIBRARY_FILE, _DOCUMENTS)
        _write_json(STANDARDS_INDEX_FILE, _DOCUMENT_INDEX)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _file_hash(file_path: str) -> str:
    digest = hashlib.sha256()
    with open(file_path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def get_embedding(text: str) -> list[float] | None:
    if not OPENROUTER_API_KEY:
        return None
    try:
        client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=OPENROUTER_API_KEY)
        response = client.embeddings.create(model=EMBEDDING_MODEL, input=text)
        return response.data[0].embedding
    except Exception:
        return None


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    if not v1 or not v2:
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_a = sum(a * a for a in v1) ** 0.5
    norm_b = sum(b * b for b in v2) ** 0.5
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot_product / (norm_a * norm_b)


def _detect_metadata(filename: str, sample: str) -> dict:
    combined = f"{filename} {sample}".upper()
    standard = "UNKNOWN"
    standard_code = ""
    for family, pattern in _STANDARD_PATTERNS:
        match = re.search(pattern, combined, re.IGNORECASE)
        if match:
            standard = family
            standard_code = re.sub(r"\s+", " ", match.group(0)).strip()
            break
        if family in combined:
            standard = family

    year_match = re.search(r"(?<!\d)(?:19|20)\d{2}(?!\d)", combined)
    has_persian = bool(re.search(r"[\u0600-\u06ff]", sample))
    return {
        "standard": standard,
        "standard_code": standard_code or standard,
        "edition": year_match.group(0) if year_match else "",
        "language": "fa" if has_persian else "en",
    }


def _extract_pages(file_path: str) -> list[tuple[int, str]]:
    if file_path.lower().endswith(".pdf"):
        try:
            reader = pypdf.PdfReader(file_path)
            return [
                (page_number, page.extract_text() or "")
                for page_number, page in enumerate(reader.pages, start=1)
            ]
        except Exception:
            return []

    try:
        content = Path(file_path).read_text(encoding="utf-8")
    except UnicodeDecodeError:
        content = Path(file_path).read_text(encoding="latin-1")
    except OSError:
        return []
    return [(1, content)]


def _split_long_text(text: str, maximum_length: int, overlap: int = 120) -> list[str]:
    if len(text) <= maximum_length:
        return [text]
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + maximum_length, len(text))
        if end < len(text):
            boundary = text.rfind(" ", start, end)
            if boundary > start + maximum_length // 2:
                end = boundary
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)
    return chunks


def _chunk_page(text: str, maximum_length: int = 1200) -> list[str]:
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n|\n", text) if part.strip()]
    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        if len(paragraph) > maximum_length:
            if current:
                chunks.append(current)
                current = ""
            chunks.extend(_split_long_text(paragraph, maximum_length))
            continue
        candidate = f"{current}\n{paragraph}".strip()
        if current and len(candidate) > maximum_length:
            chunks.append(current)
            current = paragraph
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def _ingest_document(file_path: str, original_name: str | None = None) -> dict:
    if not file_path or not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
        raise ValueError("The uploaded document is empty or unavailable.")

    filename = original_name or os.path.basename(file_path)
    checksum = _file_hash(file_path)
    existing = next((doc for doc in _DOCUMENTS if doc["checksum"] == checksum), None)
    if existing:
        return {**existing, "duplicate": True}

    document_id = uuid4().hex
    extension = Path(filename).suffix.lower()
    stored_path = STANDARDS_FILE_DIR / f"{document_id}{extension}"
    shutil.copyfile(file_path, stored_path)

    pages = _extract_pages(str(stored_path))
    sample = "\n".join(text for _, text in pages)[:12000]
    metadata = _detect_metadata(filename, sample)
    now = _now()
    document = {
        "id": document_id,
        "filename": filename,
        "title": Path(filename).stem.replace("_", " ").replace("-", " "),
        "standard": metadata["standard"],
        "standard_code": metadata["standard_code"],
        "edition": metadata["edition"],
        "language": metadata["language"],
        "status": "processing",
        "processing_status": "extracting",
        "size_bytes": os.path.getsize(file_path),
        "page_count": len(pages),
        "passage_count": 0,
        "checksum": checksum,
        "stored_path": str(stored_path),
        "uploaded_at": now,
        "updated_at": now,
        "duplicate": False,
    }
    _DOCUMENTS.append(document)

    passages: list[dict] = []
    for page_number, page_text in pages:
        for text in _chunk_page(page_text):
            passages.append(
                {
                    "id": uuid4().hex,
                    "document_id": document_id,
                    "text": text,
                    "source": filename,
                    "page": page_number,
                    "standard": metadata["standard"],
                    "standard_code": metadata["standard_code"],
                    "embedding": get_embedding(text),
                }
            )

    _DOCUMENT_INDEX.extend(passages)
    document["passage_count"] = len(passages)
    document["processing_status"] = "ready" if passages else "failed"
    document["status"] = "active" if passages else "needs_review"
    document["updated_at"] = _now()
    _persist_library()
    return dict(document)


def ingest_document(file_path: str, original_name: str | None = None) -> dict:
    with _INGEST_LOCK:
        return _ingest_document(file_path, original_name)


def index_document(file_path: str) -> bool:
    try:
        return ingest_document(file_path)["processing_status"] == "ready"
    except (OSError, ValueError):
        return False


def list_documents() -> list[dict]:
    return [
        {key: value for key, value in document.items() if key != "stored_path"}
        for document in sorted(
            _DOCUMENTS,
            key=lambda item: item.get("uploaded_at", ""),
            reverse=True,
        )
    ]


def get_document(document_id: str) -> dict | None:
    document = next((doc for doc in _DOCUMENTS if doc["id"] == document_id), None)
    return dict(document) if document else None


def delete_document(document_id: str) -> bool:
    with _INGEST_LOCK:
        document = next((doc for doc in _DOCUMENTS if doc["id"] == document_id), None)
        if document is None:
            return False
        removed_passages = [
            passage
            for passage in _DOCUMENT_INDEX
            if passage["document_id"] == document_id
        ]
        _DOCUMENTS.remove(document)
        _DOCUMENT_INDEX[:] = [
            passage
            for passage in _DOCUMENT_INDEX
            if passage["document_id"] != document_id
        ]
        _persist_library()
        try:
            Path(document["stored_path"]).unlink(missing_ok=True)
        except OSError:
            _DOCUMENTS.append(document)
            _DOCUMENT_INDEX.extend(removed_passages)
            _persist_library()
            return False
        return True


def _expanded_terms(query: str) -> list[str]:
    terms = query.lower().split()
    for phrase, synonyms in _SYNONYMS.items():
        if phrase in query.lower():
            terms.extend(synonyms)
    return terms


def query_standards(
    query_str: str,
    document_ids: list[str] | None = None,
    standards: list[str] | None = None,
    limit: int = 20,
) -> list[dict]:
    if not query_str or not query_str.strip():
        return []

    candidates = _DOCUMENT_INDEX
    if document_ids:
        allowed_documents = set(document_ids)
        candidates = [
            item for item in candidates if item["document_id"] in allowed_documents
        ]
    if standards:
        allowed_standards = {standard.upper() for standard in standards}
        candidates = [
            item for item in candidates if item["standard"].upper() in allowed_standards
        ]

    query_embedding = get_embedding(query_str)
    expanded_terms = _expanded_terms(query_str)
    normalized_query = query_str.lower().strip()
    results: list[dict] = []

    for item in candidates:
        text_lower = item["text"].lower()
        keyword_hits = sum(1 for term in expanded_terms if term in text_lower)
        keyword_score = keyword_hits / max(len(expanded_terms), 1)
        if normalized_query in text_lower:
            keyword_score += 1.0

        semantic_score = 0.0
        document_embedding = item.get("embedding")
        if query_embedding is not None and document_embedding is not None:
            semantic_score = cosine_similarity(query_embedding, document_embedding)

        score = max(semantic_score, min(keyword_score, 1.0))
        if score < 0.2:
            continue
        strength = "strong" if score >= 0.7 else "related" if score >= 0.4 else "weak"
        results.append(
            {
                "id": item["id"],
                "document_id": item["document_id"],
                "passage": item["text"],
                "text": item["text"],
                "source": item["source"],
                "page": item["page"],
                "score": round(score, 3),
                "strength": strength,
                "metadata": {
                    "source": item["source"],
                    "standard": item["standard"],
                    "standard_code": item.get("standard_code", item["standard"]),
                    "page": item["page"],
                    "document_id": item["document_id"],
                },
            }
        )

    results.sort(key=lambda result: result["score"], reverse=True)
    return results[: max(1, min(limit, 100))]


def get_index_state() -> dict:
    documents = list_documents()
    return {
        "records": len(_DOCUMENT_INDEX),
        "files": len(documents),
        "files_list": [document["filename"] for document in documents],
        "ready_files": sum(
            document["processing_status"] == "ready" for document in documents
        ),
        "needs_review": sum(
            document["status"] == "needs_review" for document in documents
        ),
    }


_load_library()
