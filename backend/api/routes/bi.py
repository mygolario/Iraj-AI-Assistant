import os
import tempfile

from fastapi import APIRouter, HTTPException, UploadFile

from config import UPLOAD_DIR
from core.bi_engine import compute_bi

router = APIRouter(prefix="/api/bi", tags=["bi"])

ALLOWED_SALES_EXT = {".csv", ".xlsx"}


@router.post("/kpis")
async def upload_sales(file: UploadFile):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_SALES_EXT:
        raise HTTPException(400, "Only CSV or XLSX sales sheets are accepted.")

    suffix = ext
    fd, tmp_path = tempfile.mkstemp(suffix=suffix, dir=str(UPLOAD_DIR))
    try:
        with os.fdopen(fd, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                f.write(chunk)
        return compute_bi(tmp_path)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to process sales file: {e}")
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
