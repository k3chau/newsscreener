"""REST API endpoints for querying enriched articles."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.db.models import ArticleDB
from src.db.repository import ArticleRepository

router = APIRouter(prefix="/api/v1", tags=["articles"])


@router.get("/articles", response_model=list[dict])
async def list_articles(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    ticker: str | None = Query(None, description="Filter by ticker symbol (e.g., AAPL)"),
    sector: str | None = Query(None, description="Filter by GICS sector"),
    sentiment: str | None = Query(
        None, description="Filter by sentiment (positive/negative/neutral)"
    ),
    min_credibility: int | None = Query(
        None, ge=0, le=100, description="Minimum credibility score"
    ),
    after: datetime | None = Query(None, description="Articles published after this datetime"),
    db: AsyncSession = Depends(get_db),
):
    """List enriched articles with optional filters."""
    repo = ArticleRepository(db)
    articles = await repo.list_articles(
        limit=limit,
        offset=offset,
        ticker=ticker,
        sector=sector,
        sentiment=sentiment,
        min_credibility=min_credibility,
        after=after,
    )

    return [_article_to_dict(a) for a in articles]


@router.get("/articles/stats/summary", response_model=dict)
async def get_summary_stats(
    ticker: str | None = None,
    sector: str | None = None,
    sentiment: str | None = None,
    min_credibility: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Get summary statistics for articles matching filters."""
    repo = ArticleRepository(db)
    count = await repo.count_articles(
        ticker=ticker,
        sector=sector,
        sentiment=sentiment,
        min_credibility=min_credibility,
    )

    return {
        "total_count": count,
        "filters": {
            "ticker": ticker,
            "sector": sector,
            "sentiment": sentiment,
            "min_credibility": min_credibility,
        },
    }


@router.get("/articles/{article_id}", response_model=dict)
async def get_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a single article by ID."""
    repo = ArticleRepository(db)
    article = await repo.get_by_id(article_id)

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    return _article_to_dict(article)


def _article_to_dict(article: ArticleDB) -> dict:
    """Convert ArticleDB to response dict."""
    return {
        "id": article.id,
        "title": article.title,
        "url": article.url,
        "source": article.source,
        "publisher": article.publisher,
        "published_at": article.published_at.isoformat(),
        "ingested_at": article.ingested_at.isoformat(),
        "tickers": article.tickers,
        "keywords": article.keywords,
        "summary": article.summary,
        "sentiment": {
            "label": article.sentiment_label,
            "score": article.sentiment_score,
        }
        if article.sentiment_label
        else None,
        "industry": {
            "gics_sector": article.gics_sector,
            "gics_industry_group": article.gics_industry_group,
            "confidence": article.industry_confidence,
        }
        if article.gics_sector
        else None,
        "credibility": {
            "score": article.credibility_score,
            "domain": article.credibility_domain,
            "flags": article.credibility_flags,
        }
        if article.credibility_score is not None
        else None,
        "llm_analysis": article.llm_json,
    }
