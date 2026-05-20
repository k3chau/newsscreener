"""Endpoint to fetch real-time sector ETF performance via yfinance."""

import time
from concurrent.futures import ThreadPoolExecutor

import yfinance as yf
from fastapi import APIRouter

from src.logging import get_logger

log = get_logger(__name__)

router = APIRouter(prefix="/api/v1", tags=["sectors"])

# SPDR sector ETFs mapped to GICS sectors
SECTOR_ETFS = {
    "Energy": "XLE",
    "Materials": "XLB",
    "Industrials": "XLI",
    "Consumer Discretionary": "XLY",
    "Consumer Staples": "XLP",
    "Health Care": "XLV",
    "Financials": "XLF",
    "Information Technology": "XLK",
    "Communication Services": "XLC",
    "Utilities": "XLU",
    "Real Estate": "XLRE",
}

# Cache: (timestamp, data)
_cache: tuple[float, dict] | None = None
_CACHE_TTL = 120  # 2 minutes


def _fetch_etf_change(symbol: str) -> float | None:
    """Fetch today's percent change for a single ETF."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.fast_info
        prev = info.get("previousClose") or info.get("previous_close")
        price = info.get("lastPrice") or info.get("last_price")
        if prev and price and prev > 0:
            return round(((price - prev) / prev) * 100, 2)
    except Exception:
        pass
    return None


@router.get("/sectors/performance")
async def get_sector_performance():
    """Fetch today's performance for each GICS sector via SPDR ETFs."""
    global _cache

    now = time.time()
    if _cache:
        cached_at, cached_data = _cache
        if now - cached_at < _CACHE_TTL:
            return cached_data

    # Fetch all ETFs in parallel using threads (yfinance is sync)
    results = {}
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {
            sector: pool.submit(_fetch_etf_change, symbol)
            for sector, symbol in SECTOR_ETFS.items()
        }
        for sector, future in futures.items():
            try:
                results[sector] = future.result(timeout=15)
            except Exception:
                results[sector] = None

    data = {
        "sectors": {
            sector: {
                "etf": SECTOR_ETFS[sector],
                "change_pct": results.get(sector),
            }
            for sector in SECTOR_ETFS
        }
    }

    _cache = (now, data)
    return data
