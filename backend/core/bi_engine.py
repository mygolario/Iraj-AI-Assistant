import csv
import math
from typing import Any

from config import UPLOAD_DIR


def _clean_numeric_string(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, float):
        if math.isnan(val):
            return ""
    s = str(val).strip()
    cleaned = s.replace(",", "").replace(" ", "")
    for symbol in ["$", "€", "£"]:
        cleaned = cleaned.replace(symbol, "")
    return cleaned


def _parse_conversion(c_val: Any, status_val: str) -> int:
    if c_val is None:
        return 1 if status_val in ["closed", "converted"] else 0
    if isinstance(c_val, float):
        if math.isnan(c_val):
            return 1 if status_val in ["closed", "converted"] else 0
    s = str(c_val).strip().lower()
    if s == "":
        return 1 if status_val in ["closed", "converted"] else 0
    if s in ["yes", "true", "y", "1", "1.0"]:
        return 1
    if s in ["no", "false", "n", "0", "0.0"]:
        return 0
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return 1 if status_val in ["closed", "converted"] else 0


def _load_rows(file_path: str) -> list[dict]:
    import os

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    if file_path.endswith(".csv"):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                snippet = f.read(1024)
                if "\0" in snippet:
                    raise ValueError("Corrupt file format (binary garbage detected).")
        except UnicodeDecodeError:
            raise ValueError("Corrupt file format (encoding issue).")

    rows: list[dict] = []
    if file_path.endswith(".xlsx"):
        try:
            import pandas as pd

            df = pd.read_excel(file_path)
            df.columns = [str(c).strip().lower() for c in df.columns]
            for _, r in df.iterrows():
                rows.append({k: (None if isinstance(v, float) and math.isnan(v) else v) for k, v in dict(r).items()})
        except ImportError:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    first_line = f.readline()
                    if "," in first_line and "\0" not in first_line:
                        f.seek(0)
                        reader = csv.DictReader(f)
                        if reader.fieldnames is not None:
                            for row in reader:
                                rows.append({k.strip().lower(): v for k, v in row.items() if k})
                    else:
                        raise ValueError(
                            "Failed to parse XLSX: pandas/openpyxl not available and file is not text-based."
                        )
            except Exception as e:
                raise ValueError(f"Failed to parse XLSX: pandas not available. {e}")
        except Exception as e:
            raise ValueError(f"Failed to parse XLSX: {e}")
    else:
        try:
            with open(file_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                if reader.fieldnames is None:
                    return []
                for row in reader:
                    rows.append({k.strip().lower(): v for k, v in row.items() if k})
        except Exception as e:
            raise ValueError(f"Failed to parse CSV: {e}")

    return rows


def _aggregate(rows: list[dict]) -> tuple[dict, list[dict], list[dict]]:
    total_inquiries = 0
    converted_deals = 0
    total_revenue = 0.0
    total_tonnage = 0.0
    grade_data: dict[str, dict[str, float]] = {}
    clean_rows: list[dict] = []

    tonnage_key = "tonnage"
    price_key = "unit price"
    conv_key = "conversion"
    status_key = "status"
    grade_key = "rebar grade"

    for row in rows:
        if not any(v not in (None, "") for v in row.values()):
            continue
        if tonnage_key not in row or price_key not in row:
            continue

        try:
            t_val = row[tonnage_key]
            p_val = row[price_key]
            c_val = row.get(conv_key, 0)
            status_val = str(row.get(status_key, "")).strip().lower()
            grade_val = str(row.get(grade_key, "")).strip()

            if t_val is None or p_val is None or t_val == "" or p_val == "":
                continue

            tonnage = float(_clean_numeric_string(t_val))
            unit_price = float(_clean_numeric_string(p_val))
            conversion = _parse_conversion(c_val, status_val)

            if tonnage < 0 or unit_price < 0:
                continue

            total_inquiries += 1
            clean_rows.append(
                {
                    "date": row.get("date", ""),
                    "customer": row.get("customer", ""),
                    "rebar grade": grade_val,
                    "tonnage": tonnage,
                    "unit price": unit_price,
                    "status": row.get(status_key, ""),
                    "conversion": conversion,
                }
            )

            if conversion == 1 or status_val in ["closed", "converted"]:
                converted_deals += 1
                total_revenue += tonnage * unit_price
                total_tonnage += tonnage
                if grade_val:
                    if grade_val not in grade_data:
                        grade_data[grade_val] = {"tonnage": 0.0, "revenue": 0.0}
                    grade_data[grade_val]["tonnage"] += tonnage
                    grade_data[grade_val]["revenue"] += tonnage * unit_price
        except (ValueError, TypeError):
            continue

    avg_price = total_revenue / total_tonnage if total_tonnage > 0 else 0.0
    conversion_rate = (
        converted_deals / total_inquiries * 100.0 if total_inquiries > 0 else 0.0
    )

    kpis = {
        "revenue": round(total_revenue, 2),
        "tonnage": round(total_tonnage, 2),
        "avg_price": round(avg_price, 2),
        "conversion_rate": round(conversion_rate, 2),
    }
    by_grade = [
        {"grade": g, "tonnage": round(d["tonnage"], 2), "revenue": round(d["revenue"], 2)}
        for g, d in grade_data.items()
    ]
    return kpis, clean_rows, by_grade


def calculate_kpis(file_path: str) -> dict:
    rows = _load_rows(file_path)
    kpis, _, _ = _aggregate(rows)
    return kpis


def compute_bi(file_path: str) -> dict:
    rows = _load_rows(file_path)
    kpis, clean_rows, by_grade = _aggregate(rows)
    return {"kpis": kpis, "rows": clean_rows[:200], "byGrade": by_grade}
