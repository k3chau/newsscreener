"""Repository pattern for article database operations."""

from datetime import datetime

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import ArticleDB
from src.models import EnrichedArticle


class ArticleRepository:
    """Repository for article CRUD operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, enriched: EnrichedArticle) -> ArticleDB:
        """Create a new article from EnrichedArticle model."""
        article = ArticleDB(
            id=enriched.raw.id,
            title=enriched.raw.title,
            url=str(enriched.raw.url),
            source=enriched.raw.source.value,
            publisher=enriched.raw.publisher,
            published_at=enriched.raw.published_at,
            ingested_at=enriched.raw.ingested_at,
            body=enriched.raw.body,
            full_text=enriched.full_text,
            summary=enriched.summary,
            tickers=enriched.raw.tickers,
            keywords=enriched.raw.keywords,
            sentiment_label=enriched.sentiment.label if enriched.sentiment else None,
            sentiment_score=enriched.sentiment.score if enriched.sentiment else None,
            gics_sector=enriched.industry.gics_sector if enriched.industry else None,
            gics_industry_group=(
                enriched.industry.gics_industry_group if enriched.industry else None
            ),
            industry_confidence=(
                enriched.industry.confidence if enriched.industry else None
            ),
            credibility_score=(
                enriched.credibility.score if enriched.credibility else None
            ),
            credibility_domain=(
                enriched.credibility.domain if enriched.credibility else None
            ),
            credibility_flags=(
                enriched.credibility.flags if enriched.credibility else []
            ),
            llm_json=enriched.llm_json,
        )

        self.session.add(article)
        await self.session.commit()
        await self.session.refresh(article)
        return article

    async def get_by_id(self, article_id: str) -> ArticleDB | None:
        """Get article by ID."""
        result = await self.session.execute(
            select(ArticleDB).where(ArticleDB.id == article_id)
        )
        return result.scalar_one_or_none()

    async def list_articles(
        self,
        limit: int = 50,
        offset: int = 0,
        ticker: str | None = None,
        sector: str | None = None,
        sentiment: str | None = None,
        min_credibility: int | None = None,
        after: datetime | None = None,
    ) -> list[ArticleDB]:
        """List articles with optional filters."""
        query = select(ArticleDB)

        if ticker:
            query = query.where(ArticleDB.tickers.contains([ticker]))
        if sector:
            query = query.where(ArticleDB.gics_sector == sector)
        if sentiment:
            query = query.where(ArticleDB.sentiment_label == sentiment)
        if min_credibility is not None:
            query = query.where(ArticleDB.credibility_score >= min_credibility)
        if after:
            query = query.where(ArticleDB.published_at > after)

        query = query.order_by(desc(ArticleDB.published_at)).limit(limit).offset(offset)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def count_articles(
        self,
        ticker: str | None = None,
        sector: str | None = None,
        sentiment: str | None = None,
        min_credibility: int | None = None,
    ) -> int:
        """Count articles matching filters."""
        query = select(func.count()).select_from(ArticleDB)

        if ticker:
            query = query.where(ArticleDB.tickers.contains([ticker]))
        if sector:
            query = query.where(ArticleDB.gics_sector == sector)
        if sentiment:
            query = query.where(ArticleDB.sentiment_label == sentiment)
        if min_credibility is not None:
            query = query.where(ArticleDB.credibility_score >= min_credibility)

        result = await self.session.execute(query)
        return result.scalar_one()
