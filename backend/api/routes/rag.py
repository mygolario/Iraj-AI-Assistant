import os
import re
import tempfile
from datetime import datetime
from functools import partial

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool

from api.schemas import DatasheetRequest, QueryRequest, StandardsCompareRequest
from config import UPLOAD_DIR
from core.rag_engine import (
    delete_document,
    get_document,
    get_index_state,
    ingest_document,
    list_documents,
    query_standards,
)

router = APIRouter(prefix="/api/rag", tags=["rag"])

ALLOWED_STD_EXT = {".pdf", ".txt"}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
MAX_UPLOAD_FILES = 20
MAX_REQUEST_BYTES = 100 * 1024 * 1024


@router.post("/index")
async def index_standards(files: list[UploadFile]):
    if not files:
        raise HTTPException(400, "No files provided.")
    if len(files) > MAX_UPLOAD_FILES:
        raise HTTPException(400, f"Upload at most {MAX_UPLOAD_FILES} files at once.")

    indexed: list[str] = []
    documents: list[dict] = []
    failures: list[dict] = []
    request_bytes = 0
    std_dir = UPLOAD_DIR / "standards"
    std_dir.mkdir(parents=True, exist_ok=True)

    for uf in files:
        filename = uf.filename or "untitled"
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_STD_EXT:
            failures.append({"filename": filename, "reason": "Unsupported file type."})
            continue
        fd, tmp_path = tempfile.mkstemp(suffix=ext, dir=str(std_dir))
        try:
            total_bytes = 0
            with os.fdopen(fd, "wb") as f:
                while chunk := await uf.read(1024 * 1024):
                    total_bytes += len(chunk)
                    request_bytes += len(chunk)
                    if total_bytes > MAX_UPLOAD_BYTES:
                        raise ValueError("File exceeds the 25 MB limit.")
                    if request_bytes > MAX_REQUEST_BYTES:
                        raise ValueError("Upload batch exceeds the 100 MB limit.")
                    f.write(chunk)
            document = await run_in_threadpool(
                partial(ingest_document, tmp_path, filename)
            )
            documents.append(
                {key: value for key, value in document.items() if key != "stored_path"}
            )
            if document["processing_status"] != "ready":
                failures.append(
                    {
                        "filename": filename,
                        "reason": "No searchable text could be extracted.",
                    }
                )
            elif not document.get("duplicate"):
                indexed.append(filename)
        except Exception as exc:
            failures.append({"filename": filename, "reason": str(exc)})
        finally:
            try:
                os.remove(tmp_path)
            except OSError:
                pass

    state = get_index_state()
    return {
        "indexed": indexed,
        "documents": documents,
        "failures": failures,
        "total_records": state["records"],
    }


@router.get("/state")
async def rag_state():
    return get_index_state()


@router.get("/documents")
async def standards_documents():
    return {"documents": list_documents()}


@router.get("/documents/{document_id}/download")
async def download_standard(document_id: str):
    document = get_document(document_id)
    if document is None:
        raise HTTPException(404, "Standard document not found.")
    path = document["stored_path"]
    if not os.path.exists(path):
        raise HTTPException(410, "The stored source file is unavailable.")
    return FileResponse(path, filename=document["filename"])


@router.delete("/documents/{document_id}")
async def remove_standard(document_id: str):
    if not delete_document(document_id):
        raise HTTPException(404, "Standard document not found.")
    return {"ok": True}


@router.post("/query")
async def query_standards_endpoint(req: QueryRequest):
    return await run_in_threadpool(
        partial(
            query_standards,
            req.query,
            document_ids=req.document_ids,
            standards=req.standards,
            limit=req.limit,
        )
    )


def _strength_value(text: str, label_pattern: str) -> str | None:
    label = re.search(label_pattern, text, re.IGNORECASE)
    if label is None:
        return None
    following_text = text[label.end() : label.end() + 140]
    match = re.search(
        r"(?:>=|<=|≥|≤|minimum\s+)?"
        r"(\d+(?:\.\d+)?"
        r"(?:\s*(?:-|to)\s*\d+(?:\.\d+)?)?"
        r"\s*(?:MPa|N/mm²|N/mm2))",
        following_text,
        re.IGNORECASE,
    )
    return match.group(1).strip() if match else None


def _extract_specifications(specs: list[dict]) -> dict:
    extracted: dict[str, dict | None] = {
        "yield_strength": None,
        "tensile_strength": None,
        "size_range": None,
        "chemical_composition": None,
    }
    for result in specs:
        text = result["text"]
        if extracted["yield_strength"] is None:
            value = _strength_value(text, r"yield\s+(?:strength|point)")
            if value:
                extracted["yield_strength"] = {"value": value, "citation": result}
        if extracted["tensile_strength"] is None:
            value = _strength_value(text, r"tensile\s+strength")
            if value:
                extracted["tensile_strength"] = {"value": value, "citation": result}
        if extracted["size_range"] is None:
            match = re.search(
                r"(?:sizes?|diameters?|range)[^\d]{0,40}"
                r"(\d+(?:\.\d+)?"
                r"(?:\s*(?:-|to)\s*\d+(?:\.\d+)?)?\s*mm)",
                text,
                re.IGNORECASE,
            )
            if match:
                extracted["size_range"] = {
                    "value": match.group(1).strip(),
                    "citation": result,
                }
        if extracted["chemical_composition"] is None and re.search(
            r"chemical|composition|carbon|manganese", text, re.IGNORECASE
        ):
            extracted["chemical_composition"] = {
                "value": text,
                "citation": result,
            }
    return extracted


def _find_spec_sources(grade: str, document_ids: list[str]) -> list[dict]:
    grade_results = query_standards(
        grade,
        document_ids=document_ids,
        limit=50,
    )
    scoped_document_ids = document_ids or list(
        {result["document_id"] for result in grade_results}
    )
    if not scoped_document_ids:
        return grade_results

    results_by_id = {result["id"]: result for result in grade_results}
    for property_query in (
        "yield strength",
        "tensile strength",
        "diameter size range",
        "chemical composition carbon manganese",
    ):
        property_results = query_standards(
            property_query,
            document_ids=scoped_document_ids,
            limit=20,
        )
        results_by_id.update({result["id"]: result for result in property_results})
    return list(results_by_id.values())


@router.post("/datasheet")
async def compile_datasheet(req: DatasheetRequest):
    specs = await run_in_threadpool(
        partial(_find_spec_sources, req.grade, req.document_ids)
    )
    extracted = _extract_specifications(specs)
    available = any(value is not None for value in extracted.values())

    return {
        "available": available,
        "grade": req.grade,
        "company": req.company,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "yield_strength": (
            extracted["yield_strength"]["value"]
            if extracted["yield_strength"]
            else None
        ),
        "tensile_strength": (
            extracted["tensile_strength"]["value"]
            if extracted["tensile_strength"]
            else None
        ),
        "size_range": (
            extracted["size_range"]["value"] if extracted["size_range"] else None
        ),
        "chemical_composition": (
            extracted["chemical_composition"]["value"]
            if extracted["chemical_composition"]
            else None
        ),
        "evidence": extracted,
        "sources": specs,
    }


@router.post("/compare")
async def compare_standards(req: StandardsCompareRequest):
    comparisons = []
    for grade in req.grades:
        sources = await run_in_threadpool(
            partial(_find_spec_sources, grade, req.document_ids)
        )
        extracted = _extract_specifications(sources)
        comparisons.append(
            {
                "grade": grade,
                "specifications": {
                    key: value["value"] if value else None
                    for key, value in extracted.items()
                },
                "evidence": extracted,
                "source_count": len(sources),
            }
        )
    return {"comparisons": comparisons}
