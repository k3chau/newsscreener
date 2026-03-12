"""Persistence pipeline: subscribes to Redis and stores to PostgreSQL."""

import asyncio

from config import settings
from src.db.database import AsyncSessionLocal
from src.db.repository import ArticleRepository
from src.logging import get_logger
from src.models import EnrichedArticle
from src.redis_pubsub import RedisSubscriber

log = get_logger(__name__)


class PersistencePipeline:
    """Subscribes to news:scored channel and persists enriched articles to PostgreSQL."""

    def __init__(self) -> None:
        self._subscriber = RedisSubscriber()

    async def start(self) -> None:
        """Start subscribing and persisting articles."""
        await self._subscriber.connect([settings.redis_channel_scored])
        await log.ainfo("persistence_pipeline_started")

        await self._consume_articles()

    async def stop(self) -> None:
        await self._subscriber.close()
        await log.ainfo("persistence_pipeline_stopped")

    async def _consume_articles(self) -> None:
        """Subscribe to scored channel and persist each article."""
        async for channel, raw_data in self._subscriber.listen():
            asyncio.create_task(self._persist_article(raw_data))

    async def _persist_article(self, raw_data) -> None:
        """Persist a single enriched article to the database."""
        try:
            # Parse enriched article from Redis message
            enriched = EnrichedArticle.model_validate(raw_data)

            # Create DB session and repository
            async with AsyncSessionLocal() as session:
                repo = ArticleRepository(session)
                article_db = await repo.create(enriched)

            await log.ainfo(
                "article_persisted",
                article_id=article_db.id,
                title=article_db.title[:80],
                sentiment=article_db.sentiment_label,
                sector=article_db.gics_sector,
            )

        except Exception as exc:
            await log.aerror(
                "persistence_failed",
                error=str(exc),
            )
