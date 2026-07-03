from fastapi import APIRouter, HTTPException

from api.schemas import ArbitrageRequest, ScrapeRequest
from core.live_scraper import read_cached_prices, scrape_channels

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/prices")
async def get_prices():
    return read_cached_prices()


@router.post("/scrape")
async def run_scrape(req: ScrapeRequest):
    if not req.urls:
        raise HTTPException(400, "No source URLs provided.")
    if len(req.urls) > 50:
        raise HTTPException(400, "Maximum 50 source URLs allowed.")
    items = scrape_channels(req.urls)
    return {"items": items, "count": len(items)}


@router.post("/arbitrage")
async def arbitrage(req: ArbitrageRequest):
    feeds = read_cached_prices()
    priced = [c for c in feeds if c.get("price") is not None]
    if not priced:
        raise HTTPException(404, "No live market prices cached. Run the scraper first.")

    live = priced[0]
    live_price = live["price"]
    currency = live["currency"]
    internal_avg = req.internal_avg

    if currency == "USD" or internal_avg > 10000:
        deviation = round(((internal_avg - live_price) / live_price) * 100, 2)
    else:
        deviation = round(((internal_avg * 50 - live_price) / live_price) * 100, 2)

    if deviation > 5.0:
        status = "alert"
        message = (
            "Your internal sales price is significantly higher than the live market index. "
            "You may lose sales competitiveness — consider reviewing discount margins."
        )
    elif deviation < -5.0:
        status = "opportunity"
        message = (
            "Your internal sales price is significantly lower than the market index. "
            "You have room to increase prices and boost margins on upcoming inquiries."
        )
    else:
        status = "compliance"
        message = "Your prices are well aligned with the latest live market indexes (within 5% margin)."

    return {
        "internal_avg": internal_avg,
        "market_price": live_price,
        "currency": currency,
        "deviation_pct": deviation,
        "status": status,
        "message": message,
    }
