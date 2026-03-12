"""Endpoint to fetch price impact data from Polygon.io aggregates."""

import re
from datetime import UTC, datetime, timedelta

import httpx
from fastapi import APIRouter, HTTPException, Query

from config import settings
from src.logging import get_logger

log = get_logger(__name__)

router = APIRouter(prefix="/api/v1/price", tags=["price"])

POLYGON_AGGS_URL = "https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/minute/{from_date}/{to_date}"

_TICKER_RE = re.compile(r"^[A-Z]{1,5}$")

# US market hours in ET: 9:30 AM - 4:00 PM
_MARKET_OPEN_HOUR = 9
_MARKET_OPEN_MIN = 30
_MARKET_CLOSE_HOUR = 16
_MARKET_CLOSE_MIN = 0

_INTERVALS = [
    {"label": "5m", "minutes": 5},
    {"label": "15m", "minutes": 15},
    {"label": "30m", "minutes": 30},
]


def _is_market_hours(dt: datetime) -> bool:
    """Check if a UTC datetime falls within US market hours (approximate).

    Converts UTC to ET by subtracting 4 hours (EDT) or 5 hours (EST).
    Uses 5-hour offset as a conservative default.
    Weekends are excluded.
    """
    et = dt - timedelta(hours=5)
    if et.weekday() >= 5:  # Saturday=5, Sunday=6
        return False
    market_open = et.replace(hour=_MARKET_OPEN_HOUR, minute=_MARKET_OPEN_MIN, second=0)
    market_close = et.replace(hour=_MARKET_CLOSE_HOUR, minute=_MARKET_CLOSE_MIN, second=0)
    return market_open <= et <= market_close


@router.get("/impact")
async def get_price_impact(
    ticker: str = Query(..., description="Stock ticker (e.g., NVDA)"),
    timestamp: str = Query(..., description="Article publish time in ISO 8601 format"),
):
    """Get price impact at +5m, +15m, +30m after a given timestamp."""
    if not settings.polygon_api_key:
        return {"error": "Polygon API key not configured"}

    ticker = ticker.upper().strip()
    if not _TICKER_RE.match(ticker):
        raise HTTPException(status_code=400, detail="Invalid ticker format. Use 1-5 uppercase letters.")

    try:
        base_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid timestamp format. Use ISO 8601.")

    if not _is_market_hours(base_time):
        return {
            "ticker": ticker,
            "base_price": None,
            "base_time": timestamp,
            "market_closed": True,
            "impacts": [],
        }

    # Fetch 35 minutes of minute-bar data starting from the article time
    from_ts = int(base_time.timestamp() * 1000)
    to_dt = base_time + timedelta(minutes=35)
    to_ts = int(to_dt.timestamp() * 1000)

    from_date = base_time.strftime("%Y-%m-%d")
    to_date = to_dt.strftime("%Y-%m-%d")

    url = POLYGON_AGGS_URL.format(ticker=ticker, from_date=from_date, to_date=to_date)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params={
                "adjusted": "true",
                "sort": "asc",
                "apiKey": settings.polygon_api_key,
            })
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        await log.aerror("polygon_aggs_error", status=exc.response.status_code, ticker=ticker)
        return {"error": f"Polygon API error: {exc.response.status_code}"}
    except httpx.RequestError as exc:
        await log.aerror("polygon_aggs_request_error", error=str(exc), ticker=ticker)
        return {"error": f"Request failed: {str(exc)}"}

    bars = data.get("results") or []
    if not bars:
        return {
            "ticker": ticker,
            "base_price": None,
            "base_time": timestamp,
            "no_data": True,
            "impacts": [],
        }

    # Find the bar closest to (but not after) the article time
    base_bar = None
    for bar in bars:
        bar_ts = bar["t"]  # milliseconds
        if bar_ts <= from_ts:
            base_bar = bar
        else:
            if base_bar is None:
                base_bar = bar
            break

    if base_bar is None:
        base_bar = bars[0]

    base_price = base_bar["c"]  # closing price of the minute bar

    # Calculate impacts at each interval
    impacts = []
    for interval in _INTERVALS:
        target_ts = from_ts + interval["minutes"] * 60 * 1000
        # Find the bar closest to target timestamp
        closest_bar = None
        closest_diff = float("inf")
        for bar in bars:
            diff = abs(bar["t"] - target_ts)
            if diff < closest_diff:
                closest_diff = diff
                closest_bar = bar

        if closest_bar and closest_diff < 120_000:  # within 2 minutes
            impact_price = closest_bar["c"]
            change_pct = round(((impact_price - base_price) / base_price) * 100, 4)
            impacts.append({
                "interval": interval["label"],
                "price": impact_price,
                "change_pct": change_pct,
            })
        else:
            impacts.append({
                "interval": interval["label"],
                "price": None,
                "change_pct": None,
            })

    return {
        "ticker": ticker,
        "base_price": base_price,
        "base_time": timestamp,
        "impacts": impacts,
    }
