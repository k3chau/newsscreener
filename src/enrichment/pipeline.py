"""Enrichment pipeline: sentiment, classification, summarization, credibility."""

import asyncio

from config import settings
from src.logging import get_logger
from src.models import EnrichedArticle, RawArticle
from src.redis_pubsub import RedisPublisher, RedisSubscriber
from src.enrichment.sentiment import SentimentAnalyzer
from src.enrichment.classifier import IndustryClassifier
from src.enrichment.summarizer import ArticleSummarizer
from src.enrichment.credibility import CredibilityScorer

log = get_logger(__name__)


class EnrichmentPipeline:
    """Orchestrates the full enrichment flow:

    1. Subscribe to Redis `news:enriched` channel (scraped articles)
    2. For each article:
       - Analyze sentiment (FinBERT)
       - Classify industry (DeBERTa zero-shot)
       - Generate summary (OpenRouter)
       - Score credibility (NewsGuard)
    3. Publish EnrichedArticle to `news:scored`
    """

    def __init__(self) -> None:
        self._subscriber = RedisSubscriber()
        self._publisher = RedisPublisher()
        self._sentiment = SentimentAnalyzer()
        self._classifier = IndustryClassifier()
        self._summarizer = ArticleSummarizer()
        self._credibility = CredibilityScorer()

    async def start(self) -> None:
        """Start all enrichment components and begin processing."""
        await log.ainfo("enrichment_pipeline_starting")

        # Start all enrichers in parallel
        await asyncio.gather(
            self._sentiment.start(),
            self._classifier.start(),
            self._summarizer.start(),
            self._credibility.start(),
        )

        await self._publisher.connect()
        await self._subscriber.connect([settings.redis_channel_enriched])

        await log.ainfo("enrichment_pipeline_started")

        # Process articles as they arrive
        await self._consume_articles()

    async def stop(self) -> None:
        await self._subscriber.close()
        await self._publisher.close()
        await self._summarizer.close()
        await self._credibility.close()
        await log.ainfo("enrichment_pipeline_stopped")

    async def _consume_articles(self) -> None:
        """Subscribe to raw news channel and enrich each article."""
        async for channel, article in self._subscriber.listen():
            asyncio.create_task(self._process_article(article))

    async def _process_article(self, raw: RawArticle) -> None:
        """Enrich a single article with all analysis layers."""
        try:
            text = raw.body or raw.title

            # Run all enrichments in parallel
            sentiment, industry, summary_json, credibility = await asyncio.gather(
                self._sentiment.analyze(text),
                self._classifier.classify(text),
                self._summarizer.summarize(raw.title, text),
                self._credibility.score(str(raw.url)),
                return_exceptions=True,
            )

            # Handle exceptions from parallel tasks
            sentiment = sentiment if not isinstance(sentiment, Exception) else None
            industry = industry if not isinstance(industry, Exception) else None
            summary_json = (
                summary_json if not isinstance(summary_json, Exception) else None
            )
            credibility = (
                credibility if not isinstance(credibility, Exception) else None
            )

            enriched = EnrichedArticle(
                raw=raw,
                full_text=text,
                sentiment=sentiment,
                industry=industry,
                credibility=credibility,
                summary=summary_json.get("summary", "") if summary_json else "",
                llm_json=summary_json,
            )

            await self._publisher.publish(settings.redis_channel_scored, enriched)

            await log.ainfo(
                "article_enriched",
                article_id=raw.id,
                has_sentiment=sentiment is not None,
                has_industry=industry is not None,
                has_summary=summary_json is not None,
                has_credibility=credibility is not None,
            )

        except Exception as exc:
            await log.aerror(
                "enrichment_failed",
                article_id=raw.id,
                error=str(exc),
            )
