"""BI Engine — parses sales spreadsheets into a rich analytics payload.

Design goals (BI & KPI rework):
- Tolerate messy/real-world headers via synonym-based column mapping instead of
  failing silently when a column doesn't match an exact name.
- Never silently drop rows — collect a data-quality report explaining *why*
  a row was skipped, so the UI can surface it.
- Compute a broad set of aggregates (KPIs, time series, breakdowns, funnel,
  margin, forecast, anomalies) in one pass so the frontend can render a full
  multi-tab dashboard without extra round-trips.
- `aggregate_from_clean_rows` is exposed separately so append/ledger merges
  (routes/bi.py) can re-run the exact same aggregation math over a merged
  row set without duplicating any of this logic.
"""

import math
import re
import statistics
from datetime import datetime
from typing import Any

# --- Column mapping -------------------------------------------------------

# Canonical field -> list of accepted header synonyms (already normalized:
# lowercase, punctuation stripped, whitespace collapsed).
COLUMN_SYNONYMS: dict[str, list[str]] = {
    "date": ["date", "order date", "sale date", "transaction date", "invoice date"],
    "customer": ["customer", "client", "buyer", "account", "company"],
    "grade": ["rebar grade", "grade", "product", "sku", "material"],
    "tonnage": ["tonnage", "qty", "quantity", "qty t", "weight", "tons", "ton", "volume", "weight t"],
    "unit_price": ["unit price", "price", "price ton", "unit_price", "rate", "price per ton"],
    "status": ["status", "deal status", "stage"],
    "conversion": ["conversion", "converted", "won", "is won"],
    "cost": ["cost", "unit cost", "cogs", "cost per ton", "cost ton"],
    "rep": ["sales rep", "rep", "salesperson", "sales person", "owner", "account manager"],
    "region": ["region", "branch", "territory", "location", "area"],
    "quote_date": ["quote date", "inquiry date", "lead date"],
    "close_date": ["close date", "closed date", "won date"],
}

REQUIRED_FIELDS = ("tonnage", "unit_price")


def _normalize_header(header: str) -> str:
    h = str(header or "").strip().lower()
    h = re.sub(r"[\(\)\[\]$€£/%]", " ", h)
    h = re.sub(r"[^a-z0-9\s]", " ", h)
    h = re.sub(r"\s+", " ", h).strip()
    return h


def map_columns(fieldnames: list[str]) -> tuple[dict[str, str], list[str]]:
    """Map canonical field -> actual source header. Returns (mapping, unmapped_headers)."""
    normalized = {_normalize_header(f): f for f in fieldnames if f}
    mapping: dict[str, str] = {}
    for canonical, synonyms in COLUMN_SYNONYMS.items():
        for syn in synonyms:
            if syn in normalized:
                mapping[canonical] = normalized[syn]
                break
    used = set(mapping.values())
    unmapped = [f for f in fieldnames if f and f not in used]
    return mapping, unmapped


# --- Value cleaning ---------------------------------------------------------


def _clean_numeric_string(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, float) and math.isnan(val):
        return ""
    s = str(val).strip()
    cleaned = s.replace(",", "").replace(" ", "")
    for symbol in ["$", "€", "£"]:
        cleaned = cleaned.replace(symbol, "")
    return cleaned


def _to_float(val: Any) -> float | None:
    s = _clean_numeric_string(val)
    if s == "":
        return None
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _parse_conversion(c_val: Any, status_val: str) -> int:
    if c_val is None:
        return 1 if status_val in ["closed", "converted", "won"] else 0
    if isinstance(c_val, float) and math.isnan(c_val):
        return 1 if status_val in ["closed", "converted", "won"] else 0
    s = str(c_val).strip().lower()
    if s == "":
        return 1 if status_val in ["closed", "converted", "won"] else 0
    if s in ["yes", "true", "y", "1", "1.0"]:
        return 1
    if s in ["no", "false", "n", "0", "0.0"]:
        return 0
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return 1 if status_val in ["closed", "converted", "won"] else 0


def _parse_date(val: Any) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d", "%b %d, %Y", "%d-%b-%Y"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    # Last resort: keep the first 10 chars if it already looks like an ISO date.
    if re.match(r"^\d{4}-\d{2}-\d{2}", s):
        return s[:10]
    return None


def _month_bucket(date_str: str | None) -> str | None:
    if not date_str:
        return None
    return date_str[:7]  # YYYY-MM


# --- File loading ------------------------------------------------------------


def _load_rows(file_path: str) -> tuple[list[dict], list[str]]:
    """Returns (rows, original_fieldnames)."""
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
    fieldnames: list[str] = []

    if file_path.endswith(".xlsx"):
        try:
            import pandas as pd

            df = pd.read_excel(file_path)
            fieldnames = [str(c).strip() for c in df.columns]
            for _, r in df.iterrows():
                rows.append(
                    {str(k).strip(): (None if isinstance(v, float) and math.isnan(v) else v) for k, v in dict(r).items()}
                )
        except ImportError:
            try:
                import csv as csv_mod

                with open(file_path, "r", encoding="utf-8") as f:
                    first_line = f.readline()
                    if "," in first_line and "\0" not in first_line:
                        f.seek(0)
                        reader = csv_mod.DictReader(f)
                        fieldnames = [c.strip() for c in (reader.fieldnames or [])]
                        for row in reader:
                            rows.append({k.strip(): v for k, v in row.items() if k})
                    else:
                        raise ValueError(
                            "Failed to parse XLSX: pandas/openpyxl not available and file is not text-based."
                        )
            except Exception as e:
                raise ValueError(f"Failed to parse XLSX: pandas not available. {e}")
        except Exception as e:
            raise ValueError(f"Failed to parse XLSX: {e}")
    else:
        import csv as csv_mod

        try:
            with open(file_path, mode="r", encoding="utf-8") as f:
                reader = csv_mod.DictReader(f)
                if reader.fieldnames is None:
                    return [], []
                fieldnames = [c.strip() for c in reader.fieldnames]
                for row in reader:
                    rows.append({k.strip(): v for k, v in row.items() if k})
        except Exception as e:
            raise ValueError(f"Failed to parse CSV: {e}")

    return rows, fieldnames


# --- Stage 1: raw rows -> clean rows + data-quality report -----------------


def parse_clean_rows(rows: list[dict], fieldnames: list[str]) -> tuple[list[dict], dict[str, Any]]:
    """Maps columns, validates each row, and returns (clean_rows, partial_data_quality).

    partial_data_quality still needs `rows_used`/`rows_skipped` filled in by the
    caller once the final clean_rows length is known.
    """
    mapping, unmapped_headers = map_columns(fieldnames)
    missing_required = [f for f in REQUIRED_FIELDS if f not in mapping]
    has_cost = "cost" in mapping

    clean_rows: list[dict] = []
    skipped: dict[str, int] = {}
    total_rows_seen = 0

    def _skip(reason: str) -> None:
        skipped[reason] = skipped.get(reason, 0) + 1

    for row in rows:
        if not any(v not in (None, "") for v in row.values()):
            continue
        total_rows_seen += 1

        if missing_required:
            _skip("missing_required_columns")
            continue

        t_val = row.get(mapping["tonnage"])
        p_val = row.get(mapping["unit_price"])
        if t_val is None or t_val == "" or p_val is None or p_val == "":
            _skip("missing_tonnage_or_price")
            continue

        tonnage = _to_float(t_val)
        unit_price = _to_float(p_val)
        if tonnage is None or unit_price is None:
            _skip("non_numeric_tonnage_or_price")
            continue
        if tonnage < 0 or unit_price < 0:
            _skip("negative_value")
            continue

        status_val = str(row.get(mapping.get("status", ""), "")).strip().lower()
        c_val = row.get(mapping.get("conversion", ""), None)
        conversion = _parse_conversion(c_val, status_val)
        is_won = 1 if (conversion == 1 or status_val in ["closed", "converted", "won"]) else 0
        cost_val = _to_float(row.get(mapping.get("cost", ""))) if has_cost else None

        quote_d = _parse_date(row.get(mapping.get("quote_date", "")))
        close_d = _parse_date(row.get(mapping.get("close_date", "")))
        date_val = _parse_date(row.get(mapping.get("date", "")))

        clean_rows.append(
            {
                "date": date_val or "",
                "customer": str(row.get(mapping.get("customer", ""), "")).strip(),
                "rebar grade": str(row.get(mapping.get("grade", ""), "")).strip(),
                "tonnage": tonnage,
                "unit price": unit_price,
                "status": row.get(mapping.get("status", ""), "") or "",
                "conversion": is_won,
                "rep": str(row.get(mapping.get("rep", ""), "")).strip() or None,
                "region": str(row.get(mapping.get("region", ""), "")).strip() or None,
                "cost": cost_val,
                "quote_date": quote_d,
                "close_date": close_d or date_val,
            }
        )

    data_quality = {
        "rows_seen": total_rows_seen,
        "skipped_reasons": skipped,
        "unmapped_headers": unmapped_headers,
        "missing_required_fields": missing_required,
        "optional_fields_detected": [f for f in mapping if f not in REQUIRED_FIELDS],
    }
    return clean_rows, data_quality


# --- Stage 2: clean rows -> full aggregate payload --------------------------


def aggregate_from_clean_rows(clean_rows: list[dict]) -> dict[str, Any]:
    grade_data: dict[str, dict[str, float]] = {}
    customer_data: dict[str, dict[str, float]] = {}
    rep_data: dict[str, dict[str, float]] = {}
    region_data: dict[str, dict[str, float]] = {}
    month_data: dict[str, dict[str, float]] = {}
    cycle_days: list[float] = []
    prices: list[float] = [r["unit price"] for r in clean_rows]

    total_inquiries = len(clean_rows)
    converted_deals = 0
    total_revenue = 0.0
    total_tonnage = 0.0
    total_cost = 0.0
    has_cost = any(r.get("cost") is not None for r in clean_rows)

    for r in clean_rows:
        if r.get("conversion") != 1:
            continue

        tonnage = r["tonnage"]
        unit_price = r["unit price"]
        revenue = tonnage * unit_price
        grade_val = r.get("rebar grade") or ""
        customer_val = r.get("customer") or ""
        rep_val = r.get("rep") or ""
        region_val = r.get("region") or ""
        cost_val = r.get("cost")

        converted_deals += 1
        total_revenue += revenue
        total_tonnage += tonnage
        if cost_val is not None:
            total_cost += tonnage * cost_val

        if grade_val:
            g = grade_data.setdefault(grade_val, {"tonnage": 0.0, "revenue": 0.0})
            g["tonnage"] += tonnage
            g["revenue"] += revenue
        if customer_val:
            c = customer_data.setdefault(customer_val, {"tonnage": 0.0, "revenue": 0.0, "deals": 0.0})
            c["tonnage"] += tonnage
            c["revenue"] += revenue
            c["deals"] += 1
        if rep_val:
            rp = rep_data.setdefault(rep_val, {"tonnage": 0.0, "revenue": 0.0, "deals": 0.0})
            rp["tonnage"] += tonnage
            rp["revenue"] += revenue
            rp["deals"] += 1
        if region_val:
            rg = region_data.setdefault(region_val, {"tonnage": 0.0, "revenue": 0.0})
            rg["tonnage"] += tonnage
            rg["revenue"] += revenue

        month = _month_bucket(r.get("date"))
        if month:
            m = month_data.setdefault(month, {"tonnage": 0.0, "revenue": 0.0, "deals": 0.0})
            m["tonnage"] += tonnage
            m["revenue"] += revenue
            m["deals"] += 1

        quote_d = r.get("quote_date")
        close_d = r.get("close_date")
        if quote_d and close_d:
            try:
                delta = (datetime.strptime(close_d, "%Y-%m-%d") - datetime.strptime(quote_d, "%Y-%m-%d")).days
                if delta >= 0:
                    cycle_days.append(delta)
            except ValueError:
                pass

    avg_price = total_revenue / total_tonnage if total_tonnage > 0 else 0.0
    conversion_rate = (converted_deals / total_inquiries * 100.0) if total_inquiries > 0 else 0.0
    avg_deal_size = total_revenue / converted_deals if converted_deals > 0 else 0.0
    price_volatility = round(statistics.pstdev(prices), 2) if len(prices) > 1 else 0.0

    by_customer_full = sorted(
        [
            {"customer": c, "tonnage": round(d["tonnage"], 2), "revenue": round(d["revenue"], 2), "deals": int(d["deals"])}
            for c, d in customer_data.items()
        ],
        key=lambda x: x["revenue"],
        reverse=True,
    )
    top5_revenue = sum(c["revenue"] for c in by_customer_full[:5])
    concentration_pct = round((top5_revenue / total_revenue * 100.0), 2) if total_revenue > 0 else 0.0

    kpis = {
        "revenue": round(total_revenue, 2),
        "tonnage": round(total_tonnage, 2),
        "avg_price": round(avg_price, 2),
        "conversion_rate": round(conversion_rate, 2),
        "avg_deal_size": round(avg_deal_size, 2),
        "price_volatility": price_volatility,
        "total_inquiries": total_inquiries,
        "converted_deals": converted_deals,
        "avg_sales_cycle_days": round(statistics.mean(cycle_days), 1) if cycle_days else None,
        "top5_customer_concentration_pct": concentration_pct,
    }

    by_grade = sorted(
        [{"grade": g, "tonnage": round(d["tonnage"], 2), "revenue": round(d["revenue"], 2)} for g, d in grade_data.items()],
        key=lambda x: x["revenue"],
        reverse=True,
    )
    by_rep = sorted(
        [
            {"rep": r, "tonnage": round(d["tonnage"], 2), "revenue": round(d["revenue"], 2), "deals": int(d["deals"])}
            for r, d in rep_data.items()
        ],
        key=lambda x: x["revenue"],
        reverse=True,
    )
    by_region = sorted(
        [{"region": r, "tonnage": round(d["tonnage"], 2), "revenue": round(d["revenue"], 2)} for r, d in region_data.items()],
        key=lambda x: x["revenue"],
        reverse=True,
    )
    time_series = [
        {"month": m, "revenue": round(d["revenue"], 2), "tonnage": round(d["tonnage"], 2), "deals": int(d["deals"])}
        for m, d in sorted(month_data.items())
    ]

    margin = None
    if has_cost and total_tonnage > 0:
        gross_profit = total_revenue - total_cost
        margin = {
            "gross_profit": round(gross_profit, 2),
            "gross_margin_pct": round((gross_profit / total_revenue * 100.0), 2) if total_revenue > 0 else 0.0,
        }

    return {
        "kpis": kpis,
        "rows": clean_rows[:2000],
        "byGrade": by_grade,
        "byCustomer": by_customer_full[:50],
        "byRep": by_rep,
        "byRegion": by_region,
        "timeSeries": time_series,
        "forecast": _forecast_next_period(time_series),
        "anomalies": _detect_anomalies(clean_rows, time_series),
        "margin": margin,
    }


def _forecast_next_period(time_series: list[dict]) -> dict | None:
    """Simple linear trend forecast for the next month using the last few buckets."""
    if len(time_series) < 2:
        return None
    window = time_series[-6:]
    n = len(window)
    xs = list(range(n))
    revs = [w["revenue"] for w in window]
    tons = [w["tonnage"] for w in window]

    def _linear_next(ys: list[float]) -> float:
        mean_x = sum(xs) / n
        mean_y = sum(ys) / n
        denom = sum((x - mean_x) ** 2 for x in xs)
        if denom == 0:
            return mean_y
        slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / denom
        intercept = mean_y - slope * mean_x
        return max(0.0, slope * n + intercept)

    return {
        "next_month_revenue": round(_linear_next(revs), 2),
        "next_month_tonnage": round(_linear_next(tons), 2),
        "based_on_months": n,
    }


def _detect_anomalies(clean_rows: list[dict], time_series: list[dict]) -> list[dict]:
    anomalies: list[dict] = []

    prices = [r["unit price"] for r in clean_rows if r["unit price"] > 0]
    if len(prices) >= 5:
        mean_p = statistics.mean(prices)
        stdev_p = statistics.pstdev(prices)
        if stdev_p > 0:
            for r in clean_rows:
                z = (r["unit price"] - mean_p) / stdev_p
                if abs(z) >= 2.5:
                    anomalies.append(
                        {
                            "type": "price_outlier",
                            "message": f"{r.get('customer') or 'A deal'} priced at {r['unit price']:.2f}/t is {'above' if z > 0 else 'below'} the typical range.",
                            "date": r.get("date") or None,
                            "customer": r.get("customer") or None,
                        }
                    )

    for i in range(1, len(time_series)):
        prev = time_series[i - 1]["revenue"]
        curr = time_series[i]["revenue"]
        if prev > 0:
            change_pct = (curr - prev) / prev * 100.0
            if change_pct <= -30:
                anomalies.append(
                    {
                        "type": "revenue_drop",
                        "message": f"Revenue dropped {abs(change_pct):.0f}% in {time_series[i]['month']} vs the prior month.",
                        "date": time_series[i]["month"],
                        "customer": None,
                    }
                )

    return anomalies[:25]


def _aggregate(rows: list[dict], fieldnames: list[str]) -> dict[str, Any]:
    clean_rows, data_quality = parse_clean_rows(rows, fieldnames)
    result = aggregate_from_clean_rows(clean_rows)
    data_quality["rows_used"] = len(clean_rows)
    data_quality["rows_skipped"] = data_quality["rows_seen"] - len(clean_rows)
    result["dataQuality"] = data_quality
    return result


def calculate_kpis(file_path: str) -> dict:
    rows, fieldnames = _load_rows(file_path)
    return _aggregate(rows, fieldnames)["kpis"]


def compute_bi(file_path: str) -> dict:
    rows, fieldnames = _load_rows(file_path)
    return _aggregate(rows, fieldnames)
