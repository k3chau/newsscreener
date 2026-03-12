"""Tests for persistence pipeline."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest

from src.db.persistence import PersistencePipeline
from src.models import (
    CredibilityScore,
    EnrichedArticle,
    IndustryClassification,
    NewsSource,
    RawArticle,
    SentimentResult,
)


def _make_enriched_article() -> EnrichedArticle:
    """Create a test enriched article."""
    raw = RawArticle(
        id="test-persist-1",
        title="Test Article",
        url="https://example.com/test",
        source=NewsSource.POLYGON,
        published_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
    )

    return EnrichedArticle(
        raw=raw,
        full_text="Test content",
        sentiment=SentimentResult(label="positive", score=0.9),
        industry=IndustryClassification(
            gics_sector="Technology",
            gics_industry_group="Technology",
            confidence=0.8,
        ),
        credibility=CredibilityScore(score=75, domain="example.com", flags=[]),
        summary="Test summary",
        llm_json={"impact": "neutral"},
    )


@pytest.mark.asyncio
async def test_persist_article():
    """Test that _persist_article creates a database entry."""
    pipeline = PersistencePipeline()

    # Mock the subscriber and repository
    pipeline._subscriber.connect = AsyncMock()

    # Mock AsyncSessionLocal
    from src.db import persistence
    original_session = persistence.AsyncSessionLocal

    mock_session = AsyncMock()
    mock_repo = AsyncMock()
    mock_repo.create = AsyncMock(return_value=AsyncMock(id="test-persist-1"))

    persistence.AsyncSessionLocal = lambda: mock_session
    persistence.ArticleRepository = lambda session: mock_repo

    # Test persist
    enriched = _make_enriched_article()
    await pipeline._persist_article(enriched.model_dump())

    # Should have called repository create
    mock_repo.create.assert_called_once()

    # Restore
    persistence.AsyncSessionLocal = original_session


@pytest.mark.asyncio
async def test_persist_article_handles_errors():
    """Test that persistence errors are logged but don't crash."""
    pipeline = PersistencePipeline()

    # Mock the session to raise an error
    from src.db import persistence
    original_session = persistence.AsyncSessionLocal

    mock_session = AsyncMock()
    mock_session.__aenter__.side_effect = Exception("DB connection failed")

    persistence.AsyncSessionLocal = lambda: mock_session

    # Should not raise, just log error
    enriched = _make_enriched_article()
    await pipeline._persist_article(enriched.model_dump())

    # Restore
    persistence.AsyncSessionLocal = original_session
