"""Ingestion pipeline: coordinates WebSocket ingest, scraping, and Redis publishing."""

import asyncio

from config import settings
from src.logging import get_logger
from src.models import RawArticle
from src.redis_pubsub import RedisPublisher, RedisSubscriber
from src.ingestion.polygon_ws import PolygonNewsClient
from src.ingestion.scraper import ArticleScraper

log = get_logger(__name__)


class IngestionPipeline:
    """Orchestrates the full ingestion flow:

    1. Polygon WS client pushes RawArticles to Redis `news:raw`
    2. This pipeline subscribes to `news:raw`
    3. For each article, scrapes full text via Trafilatura
    4. Publishes enriched article (with body) to `news:enriched`
    """

    def __init__(self) -> None:
        self._polygon = PolygonNewsClient()
        self._scraper = ArticleScraper()
        self._subscriber = RedisSubscriber()
        self._enriched_publisher = RedisPublisher()

    async def start(self) -> None:
        """Start all pipeline components concurrently."""
        await self._scraper.start()
        await self._enriched_publisher.connect()
        await self._subscriber.connect([settings.redis_channel_raw_news])

        await log.ainfo("ingestion_pipeline_starting")

        await asyncio.gather(
            self._polygon.start(),
            self._consume_raw_articles(),
        )

    async def stop(self) -> None:
        await self._polygon.stop()
        await self._subscriber.close()
        await self._enriched_publisher.close()
        await self._scraper.close()
        await log.ainfo("ingestion_pipeline_stopped")

    async def _consume_raw_articles(self) -> None:
        """Subscribe to raw news channel, scrape each, republish enriched."""
        async for channel, article in self._subscriber.listen():
            asyncio.create_task(self._process_article(article))

    async def _process_article(self, article: RawArticle) -> None:
        try:
            full_text = await self._scraper.scrape(article)
            article.body = full_text

            await self._enriched_publisher.publish(
                settings.redis_channel_enriched, article
            )
            await log.ainfo(
                "article_enriched",
                article_id=article.id,
                title=article.title[:80],
                has_body=bool(full_text),
            )
        except Exception as exc:
            await log.aerror(
                "article_processing_failed",
                article_id=article.id,
                error=str(exc),
            )
