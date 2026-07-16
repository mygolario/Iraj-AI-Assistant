import os
import tempfile

from fastapi import APIRouter, HTTPException, Query, UploadFile
from fastapi.responses import Response

from api.schemas import BiAskRequest, BiInsightsRequest, BiSnapshotRename
from config import UPLOAD_DIR
from core.bi_engine import aggregate_from_clean_rows, parse_clean_rows, _load_rows, compute_bi
from core.bi_insights import answer_bi_question, generate_bi_narrative
from core.bi_store import (
    append_to_snapshot,
    delete_snapshot,
    get_snapshot,
    list_snapshots,
    rename_snapshot,
    save_snapshot,
)
from core.sales_consultant import LLMError

router = APIRouter(prefix="/api/bi", tags=["bi"])

ALLOWED_SALES_EXT = {".csv", ".xlsx"}

CSV_TEMPLATE = (
    "Date,Customer,Rebar Grade,Tonnage,Unit Price,Status,Conversion,Sales Rep,Region,Cost\n"
    "2026-01-05,Alborz Construction,A615 Gr60,42,650,Closed,1,Sara Ahmadi,Tehran,590\n"
    "2026-01-12,Pars Steel Traders,A706,18,690,Closed,1,Reza Karimi,Isfahan,610\n"
    "2026-01-20,Kian Builders,A615 Gr60,25,,Open,0,Sara Ahmadi,Tehran,\n"
)


def _recompute_after_merge(merged_rows: list[dict]) -> dict:
    """Re-run aggregation over a merged (already-clean) row set for ledger appends."""
    result = aggregate_from_clean_rows(merged_rows)
    result["dataQuality"] = {
        "rows_seen": len(merged_rows),
        "rows_used": len(merged_rows),
        "rows_skipped": 0,
        "skipped_reasons": {},
        "unmapped_headers": [],
        "missing_required_fields": [],
        "optional_fields_detected": [],
    }
    return result


@router.post("/kpis")
async def upload_sales(
    file: UploadFile,
    label: str = Query(""),
    snapshot_id: str = Query(""),
    mode: str = Query("new"),  # "new" | "append"
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_SALES_EXT:
        raise HTTPException(400, "Only CSV or XLSX sales sheets are accepted.")

    fd, tmp_path = tempfile.mkstemp(suffix=ext, dir=str(UPLOAD_DIR))
    try:
        with os.fdopen(fd, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                f.write(chunk)

        if mode == "append" and snapshot_id:
            rows, fieldnames = _load_rows(tmp_path)
            new_clean_rows, _ = parse_clean_rows(rows, fieldnames)
            snapshot = append_to_snapshot(snapshot_id, new_clean_rows, _recompute_after_merge)
            if snapshot is None:
                raise HTTPException(404, "Snapshot not found for append.")
            return snapshot

        result = compute_bi(tmp_path)
        snapshot = save_snapshot(label or (file.filename or ""), result)
        return snapshot
    except ValueError as e:
        raise HTTPException(400, str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to process sales file: {e}")
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


@router.get("/template")
async def download_template():
    return Response(
        content=CSV_TEMPLATE,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=iraj-sales-template.csv"},
    )


@router.get("/snapshots")
async def get_snapshots():
    return {"items": list_snapshots()}


@router.get("/snapshots/{snapshot_id}")
async def get_one_snapshot(snapshot_id: str):
    snap = get_snapshot(snapshot_id)
    if snap is None:
        raise HTTPException(404, "Snapshot not found")
    return snap


@router.patch("/snapshots/{snapshot_id}")
async def patch_snapshot(snapshot_id: str, req: BiSnapshotRename):
    snap = rename_snapshot(snapshot_id, req.label)
    if snap is None:
        raise HTTPException(404, "Snapshot not found")
    return snap


@router.delete("/snapshots/{snapshot_id}")
async def remove_snapshot(snapshot_id: str):
    if not delete_snapshot(snapshot_id):
        raise HTTPException(404, "Snapshot not found")
    return {"ok": True}


@router.post("/insights")
async def post_insights(req: BiInsightsRequest):
    snap = get_snapshot(req.snapshot_id)
    if snap is None:
        raise HTTPException(404, "Snapshot not found")
    try:
        narrative = generate_bi_narrative(snap, language=req.language)
    except LLMError as e:
        raise HTTPException(503, str(e))
    return {"narrative": narrative}


@router.post("/ask")
async def post_ask(req: BiAskRequest):
    snap = get_snapshot(req.snapshot_id)
    if snap is None:
        raise HTTPException(404, "Snapshot not found")
    try:
        answer = answer_bi_question(snap, req.question, language=req.language)
    except LLMError as e:
        raise HTTPException(503, str(e))
    return {"answer": answer}
