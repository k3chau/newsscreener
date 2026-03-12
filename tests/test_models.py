"""Tests for domain models."""

from datetime import datetime, timezone

from src.models import NewsSource, RawArticle, SentimentResult, EnrichedArticle


def test_raw_article_creation():
    article = RawArticle(
        id="test-1",
        title="AAPL beats earnings",
        url="https://example.com/article",
        source=NewsSource.POLYGON,
        publisher="Reuters",
        tickers=["AAPL"],
        published_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
    )
    assert article.id == "test-1"
    assert article.source == NewsSource.POLYGON
    assert article.tickers == ["AAPL"]
    assert article.body == ""


def test_raw_article_with_body():
    article = RawArticle(
        id="test-2",
        title="Market update",
        url="https://example.com/update",
        source=NewsSource.SCRAPER,
        published_at=datetime.now(tz=timezone.utc),
        body="Full article text here.",
    )
    assert article.body == "Full article text here."


def test_enriched_article():
    raw = RawArticle(
        id="test-3",
        title="Fed raises rates",
        url="https://example.com/fed",
        source=NewsSource.POLYGON,
        published_at=datetime.now(tz=timezone.utc),
    )
    sentiment = SentimentResult(label="negative", score=0.92)
    enriched = EnrichedArticle(raw=raw, sentiment=sentiment, full_text="The Fed...")

    assert enriched.sentiment.label == "negative"
    assert enriched.full_text == "The Fed..."
    assert enriched.industry is None
