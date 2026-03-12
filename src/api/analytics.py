"""Analytics API endpoints for sector heatmap, source leaderboard, and keyword trends."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, cast, Date, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.db.models import ArticleDB

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/sector-heatmap")
async def sector_heatmap(db: AsyncSession = Depends(get_db)):
    """Aggregate articles by GICS sector with sentiment counts."""
    query = (
        select(
            ArticleDB.gics_sector,
            func.count().label("total"),
            func.count(case((ArticleDB.sentiment_label == "positive", 1))).label(
                "positive"
            ),
            func.count(case((ArticleDB.sentiment_label == "negative", 1))).label(
                "negative"
            ),
            func.count(case((ArticleDB.sentiment_label == "neutral", 1))).label(
                "neutral"
            ),
        )
        .where(ArticleDB.gics_sector.isnot(None))
        .group_by(ArticleDB.gics_sector)
    )

    result = await db.execute(query)
    rows = result.all()

    sectors = []
    for row in rows:
        counts = {"positive": row.positive, "negative": row.negative, "neutral": row.neutral}
        dominant = max(counts, key=counts.get) if row.total > 0 else "neutral"
        sectors.append(
            {
                "sector": row.gics_sector,
                "total": row.total,
                "positive": row.positive,
                "negative": row.negative,
                "neutral": row.neutral,
                "dominant_sentiment": dominant,
            }
        )

    return sectors


@router.get("/source-leaderboard")
async def source_leaderboard(db: AsyncSession = Depends(get_db)):
    """Publishers ranked by average credibility score, top 20."""
    query = (
        select(
            ArticleDB.publisher,
            func.avg(ArticleDB.credibility_score).label("avg_credibility"),
            func.count().label("article_count"),
            func.count(case((ArticleDB.sentiment_label == "positive", 1))).label(
                "positive_count"
            ),
            func.count(case((ArticleDB.sentiment_label == "negative", 1))).label(
                "negative_count"
            ),
        )
        .where(
            ArticleDB.publisher.isnot(None),
            ArticleDB.publisher != "",
            ArticleDB.credibility_score.isnot(None),
        )
        .group_by(ArticleDB.publisher)
        .order_by(func.avg(ArticleDB.credibility_score).desc())
        .limit(20)
    )

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "publisher": row.publisher,
            "avg_credibility": round(float(row.avg_credibility), 1),
            "article_count": row.article_count,
            "positive_pct": round(
                row.positive_count / row.article_count * 100, 1
            )
            if row.article_count > 0
            else 0,
            "negative_pct": round(
                row.negative_count / row.article_count * 100, 1
            )
            if row.article_count > 0
            else 0,
        }
        for row in rows
    ]


@router.get("/keyword-trends")
async def keyword_trends(
    days: int = Query(7, ge=1, le=30, description="Number of days to look back"),
    db: AsyncSession = Depends(get_db),
):
    """Top 20 keywords with daily counts and trend direction."""
    cutoff = datetime.now(UTC) - timedelta(days=days)

    # Fetch articles with keywords in the time range
    query = select(
        ArticleDB.keywords,
        cast(ArticleDB.published_at, Date).label("pub_date"),
    ).where(
        ArticleDB.published_at >= cutoff,
        ArticleDB.keywords.isnot(None),
    )

    result = await db.execute(query)
    rows = result.all()

    # Aggregate keyword counts per day
    keyword_daily: dict[str, dict[str, int]] = {}
    keyword_total: dict[str, int] = {}

    for row in rows:
        keywords = row.keywords if isinstance(row.keywords, list) else []
        date_str = str(row.pub_date)
        for kw in keywords:
            kw_lower = kw.lower().strip()
            if not kw_lower:
                continue
            keyword_total[kw_lower] = keyword_total.get(kw_lower, 0) + 1
            if kw_lower not in keyword_daily:
                keyword_daily[kw_lower] = {}
            keyword_daily[kw_lower][date_str] = (
                keyword_daily[kw_lower].get(date_str, 0) + 1
            )

    # Get top 20 keywords by total count
    top_keywords = sorted(keyword_total.items(), key=lambda x: x[1], reverse=True)[:20]

    # Build date range
    date_range = []
    for i in range(days):
        d = (datetime.now(UTC) - timedelta(days=days - 1 - i)).date()
        date_range.append(str(d))

    results = []
    for kw, total in top_keywords:
        daily = keyword_daily.get(kw, {})
        counts = [{"date": d, "count": daily.get(d, 0)} for d in date_range]

        # Determine trend: compare first half vs second half
        mid = len(counts) // 2
        first_half = sum(c["count"] for c in counts[:mid]) if mid > 0 else 0
        second_half = sum(c["count"] for c in counts[mid:])

        if second_half > first_half * 1.2:
            trend = "rising"
        elif first_half > second_half * 1.2:
            trend = "falling"
        else:
            trend = "stable"

        results.append(
            {
                "keyword": kw,
                "counts": counts,
                "total": total,
                "trend": trend,
            }
        )

    return results
