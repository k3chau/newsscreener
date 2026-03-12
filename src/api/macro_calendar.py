"""Endpoint to fetch macro economic calendar events from Financial Modeling Prep."""

import time
from datetime import UTC, datetime, timedelta

import httpx
from fastapi import APIRouter, Query

from config import settings
from src.logging import get_logger

log = get_logger(__name__)

router = APIRouter(prefix="/api/v1/calendar", tags=["calendar"])

FMP_CALENDAR_URL = "https://financialmodelingprep.com/api/v3/economic_calendar"

# Simple in-memory cache: {"key": (timestamp, data)}
_cache: dict[str, tuple[float, list]] = {}
_CACHE_TTL = 300  # 5 minutes


def _cache_key(from_date: str, to_date: str, country: str) -> str:
    return f"{from_date}|{to_date}|{country}"


@router.get("/events")
async def get_calendar_events(
    country: str = Query("US", description="Country code filter (e.g., US, GB, EU)"),
    days_ahead: int = Query(7, ge=1, le=30, description="Number of days ahead to fetch"),
):
    """Fetch upcoming macro economic calendar events."""
    if not settings.fmp_api_key:
        return {"error": "FMP API key not configured", "events": []}

    today = datetime.now(UTC)
    from_date = today.strftime("%Y-%m-%d")
    to_date = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    key = _cache_key(from_date, to_date, country)
    now = time.time()

    # Check cache
    if key in _cache:
        cached_at, cached_data = _cache[key]
        if now - cached_at < _CACHE_TTL:
            return {"count": len(cached_data), "events": cached_data}

    params = {
        "from": from_date,
        "to": to_date,
        "apiKey": settings.fmp_api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(FMP_CALENDAR_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        return {"error": f"FMP API error: {exc.response.status_code}", "events": []}
    except httpx.RequestError as exc:
        return {"error": f"Request failed: {str(exc)}", "events": []}

    # FMP returns a flat list; filter by country
    country_upper = country.upper()
    events = []
    for item in data if isinstance(data, list) else []:
        item_country = (item.get("country") or "").upper()
        if country_upper and item_country != country_upper:
            continue

        impact = (item.get("impact") or "low").lower()
        if impact not in ("low", "medium", "high"):
            impact = "low"

        events.append({
            "date": item.get("date", ""),
            "event": item.get("event", ""),
            "country": item.get("country", ""),
            "actual": item.get("actual"),
            "forecast": item.get("estimate"),
            "previous": item.get("previous"),
            "impact": impact,
        })

    # Sort by date ascending
    events.sort(key=lambda e: e["date"])

    # Update cache
    _cache[key] = (now, events)

    return {"count": len(events), "events": events}
