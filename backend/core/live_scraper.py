import json
import re
import urllib.error
import urllib.request
from datetime import datetime

from config import PRICE_CACHE_FILE


def clean_html(raw_html: str) -> str:
    clean_r = re.compile("<.*?>")
    text = re.sub(clean_r, " ", raw_html)
    return " ".join(text.split())


def parse_price_value(text: str) -> tuple[float | None, str | None]:
    dollar_match = re.search(r"\$\s*([0-9,]+(?:\.[0-9]+)?)", text)
    if dollar_match:
        return float(dollar_match.group(1).replace(",", "")), "USD"

    toman_match = re.search(
        r"([0-9,]+(?:\.[0-9]+)?)\s*(Tomans|Toman|IRR|Rials|Rial)", text, re.IGNORECASE
    )
    if toman_match:
        return float(toman_match.group(1).replace(",", "")), toman_match.group(2)

    numeric_match = re.search(
        r"(?:size|rebar|\d+mm)?\s*:\s*([0-9,]+(?:\.[0-9]+)?)", text, re.IGNORECASE
    )
    if numeric_match:
        return float(numeric_match.group(1).replace(",", "")), "Tomans"

    numbers = re.findall(r"\b([0-9]{2,3},[0-9]{3})\b", text)
    if numbers:
        return float(numbers[0].replace(",", "")), "Tomans"

    return None, None


def scrape_channels(urls: list[str], *, write_cache: bool = True) -> list[dict]:
    results: list[dict] = []

    for url in urls:
        if "t.me/" in url and "t.me/s/" not in url:
            url = re.sub(r"t\.me/([^/]+)", r"t.me/s/\1", url)

        channel_name = "unknown_channel"
        match = re.search(r"t\.me/s/([^/]+)", url)
        if match:
            channel_name = match.group(1)
        else:
            match = re.search(r"t\.me/([^/]+)", url)
            if match:
                channel_name = match.group(1)

        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                html_content = response.read().decode("utf-8", errors="ignore")
        except Exception:
            continue

        parts = html_content.split("tgme_widget_message_wrap")
        for part in parts[1:]:
            idx_text = part.find("tgme_widget_message_text")
            idx_footer = part.find("tgme_widget_message_footer")
            if idx_text == -1:
                continue

            if idx_footer != -1 and idx_text < idx_footer:
                message_slice = part[idx_text:idx_footer]
            else:
                message_slice = part[idx_text:]

            first_gt = message_slice.find(">")
            if first_gt == -1:
                continue

            raw_text = message_slice[first_gt + 1 :]
            text_cleaned = clean_html(raw_text)

            date_match = re.search(r'<time[^>]*datetime="([^"]+)"', part)
            timestamp = date_match.group(1) if date_match else datetime.now().isoformat()
            date_str = timestamp.split("T")[0] if "T" in timestamp else timestamp

            price, currency = parse_price_value(text_cleaned)

            results.append(
                {
                    "channel": channel_name,
                    "text": text_cleaned,
                    "price": price,
                    "parsed_price": price,
                    "currency": currency or "Tomans",
                    "timestamp": timestamp,
                    "date": date_str,
                }
            )

    if write_cache:
        write_price_cache(results)

    return results


def write_price_cache(items: list[dict]) -> None:
    try:
        with open(PRICE_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(items, f, indent=4)
    except Exception:
        pass


def read_cached_prices() -> list[dict]:
    if PRICE_CACHE_FILE.exists():
        try:
            with open(PRICE_CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []
