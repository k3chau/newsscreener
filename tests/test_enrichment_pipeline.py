"""Tests for the enrichment pipeline integration."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.enrichment.pipeline import EnrichmentPipeline
from src.models import (
    CredibilityScore,
    IndustryClassification,
    NewsSource,
    RawArticle,
    SentimentResult,
)


def _make_article() -> RawArticle:
    return RawArticle(
        id="test-1",
        title="AAPL Beats Earnings",
        url="https://reuters.com/aapl",
        source=NewsSource.POLYGON,
        published_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
        body="Apple reported strong earnings with revenue up 11%.",
    )


@pytest.mark.asyncio
async def test_process_article_integration(monkeypatch):
    """Test that _process_article orchestrates all enrichments."""
    pipeline = EnrichmentPipeline()

    # Mock all the enricher start methods to avoid loading models
    pipeline._sentiment.start = AsyncMock()
    pipeline._classifier.start = AsyncMock()
    pipeline._summarizer.start = AsyncMock()
    pipeline._credibility.start = AsyncMock()

    # Mock the analyze/classify/summarize/score methods
    pipeline._sentiment.analyze = AsyncMock(
        return_value=SentimentResult(label="positive", score=0.92)
    )
    pipeline._classifier.classify = AsyncMock(
        return_value=IndustryClassification(
            gics_sector="Information Technology",
            gics_industry_group="Information Technology",
            confidence=0.85,
        )
    )
    pipeline._summarizer.summarize = AsyncMock(
        return_value={
            "summary": "Apple beats earnings.",
            "key_points": ["Revenue up 11%"],
            "impact": "positive",
        }
    )
    pipeline._credibility.score = AsyncMock(
        return_value=CredibilityScore(score=85, domain="reuters.com", flags=[])
    )

    # Mock the publisher
    pipeline._publisher.publish = AsyncMock()

    # Process an article
    article = _make_article()
    await pipeline._process_article(article)

    # Verify all enrichers were called
    pipeline._sentiment.analyze.assert_called_once()
    pipeline._classifier.classify.assert_called_once()
    pipeline._summarizer.summarize.assert_called_once()
    pipeline._credibility.score.assert_called_once()

    # Verify enriched article was published
    pipeline._publisher.publish.assert_called_once()
    published_enriched = pipeline._publisher.publish.call_args[0][1]

    assert published_enriched.raw.id == "test-1"
    assert published_enriched.sentiment.label == "positive"
    assert published_enriched.industry.gics_sector == "Information Technology"
    assert published_enriched.credibility.score == 85
    assert published_enriched.summary == "Apple beats earnings."


@pytest.mark.asyncio
async def test_process_article_handles_exceptions(monkeypatch):
    """Test that exceptions in enrichers don't crash the pipeline."""
    pipeline = EnrichmentPipeline()

    # Mock start methods
    pipeline._sentiment.start = AsyncMock()
    pipeline._classifier.start = AsyncMock()
    pipeline._summarizer.start = AsyncMock()
    pipeline._credibility.start = AsyncMock()

    # Make sentiment analyzer raise an exception
    pipeline._sentiment.analyze = AsyncMock(side_effect=RuntimeError("Model error"))
    pipeline._classifier.classify = AsyncMock(
        return_value=IndustryClassification(
            gics_sector="Financials",
            gics_industry_group="Financials",
            confidence=0.7,
        )
    )
    pipeline._summarizer.summarize = AsyncMock(return_value=None)
    pipeline._credibility.score = AsyncMock(
        return_value=CredibilityScore(score=50, domain="test.com", flags=[])
    )
    pipeline._publisher.publish = AsyncMock()

    article = _make_article()
    await pipeline._process_article(article)

    # Should still publish with partial enrichment
    pipeline._publisher.publish.assert_called_once()
    published = pipeline._publisher.publish.call_args[0][1]

    assert published.sentiment is None  # failed
    assert published.industry is not None  # succeeded
    assert published.summary == ""  # no summary
    assert published.credibility is not None  # succeeded


@pytest.mark.asyncio
async def test_process_article_with_empty_body():
    """Test article with no body uses title for enrichment."""
    pipeline = EnrichmentPipeline()

    pipeline._sentiment.start = AsyncMock()
    pipeline._classifier.start = AsyncMock()
    pipeline._summarizer.start = AsyncMock()
    pipeline._credibility.start = AsyncMock()

    pipeline._sentiment.analyze = AsyncMock(
        return_value=SentimentResult(label="neutral", score=0.5)
    )
    pipeline._classifier.classify = AsyncMock(return_value=None)
    pipeline._summarizer.summarize = AsyncMock(return_value=None)
    pipeline._credibility.score = AsyncMock(
        return_value=CredibilityScore(score=50, domain="test.com", flags=[])
    )
    pipeline._publisher.publish = AsyncMock()

    article = RawArticle(
        id="test-2",
        title="Breaking News",
        url="https://example.com/news",
        source=NewsSource.SCRAPER,
        published_at=datetime.now(timezone.utc),
        body="",  # empty body
    )

    await pipeline._process_article(article)

    # Should use title for analysis
    call_text = pipeline._sentiment.analyze.call_args[0][0]
    assert call_text == "Breaking News"
