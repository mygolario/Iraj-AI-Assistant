import os
import re

from config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL, EMBEDDING_MODEL

_DOCUMENT_INDEX: list[dict] = []
_INDEXED_FILES: set[str] = set()


def get_embedding(text: str) -> list[float] | None:
    if not OPENROUTER_API_KEY:
        return None
    try:
        from openai import OpenAI

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


def index_document(file_path: str) -> bool:
    if not file_path or not os.path.exists(file_path):
        return False

    abs_path = os.path.abspath(file_path)
    if abs_path in _INDEXED_FILES:
        return True

    if os.path.getsize(file_path) == 0:
        return False

    filename = os.path.basename(file_path)

    if file_path.endswith(".pdf"):
        pages_text: list[tuple[int, str]] = []
        try:
            import pypdf

            reader = pypdf.PdfReader(file_path)
            for i, page in enumerate(reader.pages):
                pages_text.append((i + 1, page.extract_text() or ""))
        except Exception:
            pass

        if not any(txt.strip() for _, txt in pages_text):
            try:
                import PyPDF2  # type: ignore

                pages_text = []
                reader = PyPDF2.PdfReader(file_path)
                for i, page in enumerate(reader.pages):
                    pages_text.append((i + 1, page.extract_text() or ""))
            except Exception:
                pass

        if not any(txt.strip() for _, txt in pages_text):
            pages_text = []
            try:
                with open(file_path, "rb") as f:
                    pdf_data = f.read()
                matches = re.findall(rb"\((.*?)\)\s*Tj", pdf_data)
                if matches:
                    txt = " ".join(m.decode("utf-8", errors="ignore") for m in matches)
                    pages_text.append((1, txt))
                else:
                    ascii_txt = "".join(
                        chr(b) for b in pdf_data if 32 <= b <= 126 or b in [10, 13]
                    )
                    pages_text.append((1, ascii_txt))
            except Exception:
                return False

        if not pages_text:
            return False

        for page_num, txt in pages_text:
            if not txt.strip():
                continue
            for p in [para.strip() for para in txt.split("\n") if para.strip()]:
                _DOCUMENT_INDEX.append(
                    {
                        "text": p,
                        "source": filename,
                        "page": page_num,
                        "standard": _detect_standard(filename, p),
                        "embedding": get_embedding(p),
                    }
                )
    else:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            try:
                with open(file_path, "r", encoding="latin-1") as f:
                    content = f.read()
            except Exception:
                return False
        except Exception:
            return False

        if not content.strip():
            return False

        for p in [para.strip() for para in content.split("\n") if para.strip()]:
            _DOCUMENT_INDEX.append(
                {
                    "text": p,
                    "source": filename,
                    "page": 1,
                    "standard": _detect_standard(filename, p),
                    "embedding": get_embedding(p),
                }
            )

    _INDEXED_FILES.add(abs_path)
    return True


def _detect_standard(filename: str, content: str) -> str:
    combined = (filename + " " + content).upper()
    for std in ["DIN", "ASTM", "JIS", "GB/T", "GBT", "BS", "SAE"]:
        if std in combined:
            return std
    return "UNKNOWN"


def query_standards(query_str: str) -> list[dict]:
    if not query_str or not query_str.strip():
        return []

    query_emb = get_embedding(query_str)
    has_embeddings = any(item.get("embedding") is not None for item in _DOCUMENT_INDEX)

    if query_emb is not None and has_embeddings:
        results = []
        for item in _DOCUMENT_INDEX:
            doc_emb = item.get("embedding")
            if doc_emb is not None:
                sim = cosine_similarity(query_emb, doc_emb)
                if sim >= 0.35:
                    results.append(
                        {
                            "passage": item["text"],
                            "text": item["text"],
                            "source": item["source"],
                            "page": item["page"],
                            "score": round(sim, 2),
                            "metadata": {
                                "source": item["source"],
                                "standard": item["standard"],
                                "page": item["page"],
                            },
                        }
                    )
        results.sort(key=lambda x: x["score"], reverse=True)
        return results

    q = query_str.lower().strip()
    synonyms = {
        "yield strength": ["yield point", "re", "r_e", "minimum yield"],
        "yield point": ["yield strength", "re", "r_e", "minimum yield"],
        "tensile strength": ["tensile", "rm", "r_m", "ultimate strength"],
        "grade 60": ["gr60", "gr 60", "grade 60"],
        "b500b": ["b500b", "500 mpa", "din 488"],
    }

    query_words = q.split()
    expanded_words = list(query_words)
    for word, syn_list in synonyms.items():
        if word in q:
            expanded_words.extend(syn_list)

    results = []
    for item in _DOCUMENT_INDEX:
        text_lower = item["text"].lower()
        score = 0.0
        for word in expanded_words:
            if word in text_lower:
                score += 1.0
        if q in text_lower:
            score += 5.0
        if score > 0:
            results.append(
                {
                    "passage": item["text"],
                    "text": item["text"],
                    "source": item["source"],
                    "page": item["page"],
                    "score": round(score / (len(query_words) + 1), 2),
                    "metadata": {
                        "source": item["source"],
                        "standard": item["standard"],
                        "page": item["page"],
                    },
                }
            )

    results.sort(key=lambda x: x["score"], reverse=True)
    return results


def get_index_state() -> dict:
    files = sorted({item["source"] for item in _DOCUMENT_INDEX})
    return {
        "records": len(_DOCUMENT_INDEX),
        "files": len(files),
        "files_list": files,
    }
