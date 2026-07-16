"""BI snapshot persistence — flat JSON files, mirroring market_sources.py.

Each processed upload is stored as a "snapshot": a metadata entry in
index.json plus a full-data file under snapshots/<id>.json. This gives the
BI page history, comparisons, and re-open without needing a real database.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any

from config import BI_INDEX_FILE, BI_SNAPSHOTS_DIR


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_index() -> dict[str, Any]:
    if BI_INDEX_FILE.exists():
        try:
            with open(BI_INDEX_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict) and "snapshots" in data:
                return data
        except Exception:
            pass
    return {"snapshots": [], "updated_at": None}


def _save_index(idx: dict[str, Any]) -> None:
    idx["updated_at"] = _now()
    with open(BI_INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(idx, f, indent=2, ensure_ascii=False)


def _snapshot_path(snapshot_id: str) -> Any:
    return BI_SNAPSHOTS_DIR / f"{snapshot_id}.json"


def _row_hash(row: dict) -> str:
    key = f"{row.get('date')}|{row.get('customer')}|{row.get('rebar grade')}|{row.get('tonnage')}|{row.get('unit price')}"
    return hashlib.sha1(key.encode("utf-8")).hexdigest()


def _meta_from(entry: dict) -> dict[str, Any]:
    dates = [r["date"] for r in entry.get("rows", []) if r.get("date")]
    return {
        "id": entry["id"],
        "label": entry["label"],
        "created_at": entry["created_at"],
        "updated_at": entry["updated_at"],
        "row_count": len(entry.get("rows", [])),
        "date_range": [min(dates), max(dates)] if dates else None,
        "revenue": entry.get("kpis", {}).get("revenue", 0),
        "tonnage": entry.get("kpis", {}).get("tonnage", 0),
    }


def list_snapshots() -> list[dict[str, Any]]:
    idx = _load_index()
    return sorted(idx["snapshots"], key=lambda s: s.get("created_at", ""), reverse=True)


def get_snapshot(snapshot_id: str) -> dict[str, Any] | None:
    path = _snapshot_path(snapshot_id)
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def save_snapshot(label: str, bi_result: dict[str, Any]) -> dict[str, Any]:
    snapshot_id = uuid.uuid4().hex[:12]
    now = _now()
    entry = {
        "id": snapshot_id,
        "label": label or f"Upload {now[:10]}",
        "created_at": now,
        "updated_at": now,
        **bi_result,
    }
    with open(_snapshot_path(snapshot_id), "w", encoding="utf-8") as f:
        json.dump(entry, f, indent=2, ensure_ascii=False)

    idx = _load_index()
    idx["snapshots"].append(_meta_from(entry))
    _save_index(idx)
    return entry


def append_to_snapshot(snapshot_id: str, new_rows: list[dict], recompute_fn) -> dict[str, Any] | None:
    """Merge new_rows (already-clean rows) into an existing snapshot's raw rows,
    deduping by row hash, then recompute aggregates via recompute_fn(rows)."""
    existing = get_snapshot(snapshot_id)
    if existing is None:
        return None

    seen = {_row_hash(r) for r in existing.get("rows", [])}
    merged = list(existing.get("rows", []))
    for r in new_rows:
        h = _row_hash(r)
        if h not in seen:
            merged.append(r)
            seen.add(h)

    recomputed = recompute_fn(merged)
    existing.update(recomputed)
    existing["updated_at"] = _now()
    with open(_snapshot_path(snapshot_id), "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2, ensure_ascii=False)

    idx = _load_index()
    idx["snapshots"] = [s for s in idx["snapshots"] if s["id"] != snapshot_id]
    idx["snapshots"].append(_meta_from(existing))
    _save_index(idx)
    return existing


def rename_snapshot(snapshot_id: str, label: str) -> dict[str, Any] | None:
    existing = get_snapshot(snapshot_id)
    if existing is None:
        return None
    existing["label"] = label
    existing["updated_at"] = _now()
    with open(_snapshot_path(snapshot_id), "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2, ensure_ascii=False)

    idx = _load_index()
    for s in idx["snapshots"]:
        if s["id"] == snapshot_id:
            s["label"] = label
            s["updated_at"] = existing["updated_at"]
    _save_index(idx)
    return existing


def delete_snapshot(snapshot_id: str) -> bool:
    path = _snapshot_path(snapshot_id)
    existed = path.exists()
    if existed:
        try:
            path.unlink()
        except OSError:
            pass

    idx = _load_index()
    before = len(idx["snapshots"])
    idx["snapshots"] = [s for s in idx["snapshots"] if s["id"] != snapshot_id]
    _save_index(idx)
    return existed or len(idx["snapshots"]) < before
