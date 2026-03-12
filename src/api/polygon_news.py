"""Endpoint to fetch today's news directly from Polygon.io REST API."""

import re
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from config import settings
from src.logging import get_logger

log = get_logger(__name__)

router = APIRouter(prefix="/api/v1", tags=["polygon"])

POLYGON_NEWS_URL = "https://api.polygon.io/v2/reference/news"

_TICKER_RE = re.compile(r"^[A-Z]{1,5}$")


@router.get("/news/fetch")
async def fetch_polygon_news(
    ticker: str | None = Query(None, description="Filter by ticker (e.g., AAPL)"),
    limit: int = Query(50, ge=1, le=100),
):
    """Fetch today's news articles directly from Polygon.io REST API."""
    if not settings.polygon_api_key:
        return {"error": "Polygon API key not configured", "articles": []}

    if ticker:
        ticker = ticker.upper().strip()
        if not _TICKER_RE.match(ticker):
            raise HTTPException(status_code=400, detail="Invalid ticker format. Use 1-5 uppercase letters (e.g., AAPL).")

    params = {
        "limit": limit,
        "order": "desc",
        "sort": "published_utc",
        "apiKey": settings.polygon_api_key,
    }

    if ticker:
        params["ticker"] = ticker

    # Fetch from today
    today = datetime.now(UTC).strftime("%Y-%m-%d")
    params["published_utc.gte"] = f"{today}T00:00:00Z"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(POLYGON_NEWS_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        return {"error": f"Polygon API error: {exc.response.status_code}", "articles": []}
    except httpx.RequestError as exc:
        return {"error": f"Request failed: {str(exc)}", "articles": []}

    results = data.get("results", [])

    articles = []
    for item in results:
        raw_tickers = item.get("tickers", []) or []
        if raw_tickers and isinstance(raw_tickers[0], dict):
            tickers = [t.get("ticker", "") for t in raw_tickers]
        else:
            tickers = list(raw_tickers)

        articles.append({
            "id": item.get("id", ""),
            "title": item.get("title", ""),
            "url": item.get("article_url", ""),
            "source": "polygon",
            "publisher": item.get("publisher", {}).get("name", "") if isinstance(item.get("publisher"), dict) else str(item.get("publisher", "")),
            "published_at": item.get("published_utc", ""),
            "tickers": tickers,
            "keywords": item.get("keywords", []) or [],
            "summary": item.get("description", ""),
            "image_url": item.get("image_url", ""),
            "sentiment": None,
            "industry": None,
            "credibility": None,
        })

    return {"count": len(articles), "articles": articles}


class AnalyzeRequest(BaseModel):
    title: str
    summary: str = ""
    tickers: list[str] = []
    publisher: str = ""
    published_at: str = ""
    url: str = ""


@router.post("/news/analyze")
async def analyze_article(req: AnalyzeRequest):
    """Use AI (via OpenRouter) to produce a full analysis of a news article."""
    if not settings.openrouter_api_key:
        return {"error": "OpenRouter API key not configured", "analysis": None}

    ticker_str = ", ".join(req.tickers) if req.tickers else "none identified"

    prompt = f"""Analyze this financial news article and provide a structured analysis.

Title: {req.title}
Publisher: {req.publisher}
Published: {req.published_at}
Tickers: {ticker_str}
Summary: {req.summary}
URL: {req.url}

Provide your analysis in this exact format:

**Sentiment**: [Bullish/Bearish/Neutral] - [one sentence explanation]

**Key Takeaways**:
- [takeaway 1]
- [takeaway 2]
- [takeaway 3]

**Ticker Analysis**:
[For each ticker mentioned, provide 1-2 sentences on potential impact]

**Market Impact**: [Low/Medium/High] - [explanation of broader market implications]

**Risk Factors**:
- [risk 1]
- [risk 2]

**Trading Consideration**: [1-2 sentences on what a trader should consider]"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.openrouter_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.openrouter_model,
                    "messages": [
                        {"role": "system", "content": "You are a senior financial analyst. Provide concise, actionable analysis of news articles."},
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 1000,
                    "temperature": 0.3,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        analysis_text = data["choices"][0]["message"]["content"]
        return {"analysis": analysis_text}

    except httpx.HTTPStatusError as exc:
        await log.aerror("analyze_api_error", status=exc.response.status_code)
        return {"error": f"AI API error: {exc.response.status_code}", "analysis": None}
    except Exception as exc:
        await log.aerror("analyze_error", error=str(exc))
        return {"error": f"Analysis failed: {str(exc)}", "analysis": None}
