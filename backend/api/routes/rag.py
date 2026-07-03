import os
import re
import tempfile
from datetime import datetime

from fastapi import APIRouter, HTTPException, UploadFile

from api.schemas import DatasheetRequest, QueryRequest
from config import UPLOAD_DIR
from core.rag_engine import get_index_state, index_document, query_standards

router = APIRouter(prefix="/api/rag", tags=["rag"])

ALLOWED_STD_EXT = {".pdf", ".txt"}


@router.post("/index")
async def index_standards(files: list[UploadFile]):
    if not files:
        raise HTTPException(400, "No files provided.")

    indexed: list[str] = []
    std_dir = UPLOAD_DIR / "standards"
    std_dir.mkdir(parents=True, exist_ok=True)

    for uf in files:
        ext = os.path.splitext(uf.filename or "")[1].lower()
        if ext not in ALLOWED_STD_EXT:
            continue
        fd, tmp_path = tempfile.mkstemp(suffix=ext, dir=str(std_dir))
        try:
            with os.fdopen(fd, "wb") as f:
                while chunk := await uf.read(1024 * 1024):
                    f.write(chunk)
            if index_document(tmp_path):
                indexed.append(uf.filename)
        except Exception:
            continue
        finally:
            try:
                os.remove(tmp_path)
            except OSError:
                pass

    state = get_index_state()
    return {"indexed": indexed, "total_records": state["records"]}


@router.get("/state")
async def rag_state():
    return get_index_state()


@router.post("/query")
async def query_standards_endpoint(req: QueryRequest):
    return query_standards(req.query)


@router.post("/datasheet")
async def compile_datasheet(req: DatasheetRequest):
    specs = query_standards(req.grade)

    yield_str: str | None = None
    tensile_str: str | None = None
    chem_composition: str | None = None
    size_range: str | None = None

    for s in specs:
        t = s["text"].lower()
        if "yield" in t:
            match = re.search(
                r"yield\s+(?:strength|point)\s*(?:of|is|>=)?\s*([a-zA-Z0-9\s\u2265\u2264\-]+)",
                t,
            )
            if match:
                yield_str = match.group(1).strip()
        if "tensile" in t:
            match = re.search(
                r"tensile\s+strength\s*(?:of|is|>=)?\s*([a-zA-Z0-9\s\u2265\u2264\-]+)",
                t,
            )
            if match:
                tensile_str = match.group(1).strip()
        if "chemical" in t or "composition" in t or "carbon" in t:
            chem_composition = s["text"]
        if "size" in t or "diameter" in t or "nominal" in t:
            match = re.search(
                r"(?:sizes|diameters|range)\s*(?:from|of|is)?\s*([\d\s\-to,m]+)", t
            )
            if match:
                size_range = match.group(1).strip()

    available = any([yield_str, tensile_str, size_range, chem_composition, specs])

    return {
        "available": available,
        "grade": req.grade,
        "company": req.company,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "yield_strength": yield_str,
        "tensile_strength": tensile_str,
        "size_range": size_range,
        "chemical_composition": chem_composition,
        "sources": specs,
    }
