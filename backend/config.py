import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
LLM_MODEL = os.environ.get("LLM_MODEL", "google/gemini-2.5-flash")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "openai/text-embedding-3-small")
# Live Market web research (Sonar Pro via OpenRouter)
MARKET_WEB_MODEL = os.environ.get("MARKET_WEB_MODEL", "perplexity/sonar-pro")
MARKET_VISION_MODEL = os.environ.get("MARKET_VISION_MODEL", LLM_MODEL)

CACHE_DIR = BACKEND_DIR / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
PRICE_CACHE_FILE = CACHE_DIR / "live_prices.json"

MARKET_CACHE_DIR = CACHE_DIR / "market"
MARKET_CACHE_DIR.mkdir(parents=True, exist_ok=True)
MARKET_LIBRARY_FILE = MARKET_CACHE_DIR / "library.json"
MARKET_BRIEFING_FILE = MARKET_CACHE_DIR / "briefing.json"
MARKET_SNAPSHOTS_FILE = MARKET_CACHE_DIR / "snapshots.json"
MARKET_LAST_ASK_FILE = MARKET_CACHE_DIR / "last_ask.json"
MARKET_UPLOAD_DIR = MARKET_CACHE_DIR / "uploads"
MARKET_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

UPLOAD_DIR = BACKEND_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,https://iraj-ai-assistant-dun.vercel.app",
    ).split(",")
    if o.strip()
]


def api_key_configured() -> bool:
    return bool(OPENROUTER_API_KEY)
