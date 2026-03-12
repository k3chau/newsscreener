"""Tests for FinBERT sentiment analysis."""

import pytest

from src.enrichment.sentiment import SentimentAnalyzer


@pytest.mark.asyncio
async def test_sentiment_analyzer_positive():
    analyzer = SentimentAnalyzer()
    await analyzer.start()

    text = (
        "Apple Inc. reported record-breaking quarterly earnings, "
        "beating analyst expectations with strong iPhone sales growth."
    )
    result = await analyzer.analyze(text)

    assert result is not None
    assert result.label in ["positive", "negative", "neutral"]
    assert 0.0 <= result.score <= 1.0
    # Should likely be positive given the text
    assert result.label == "positive"


@pytest.mark.asyncio
async def test_sentiment_analyzer_negative():
    analyzer = SentimentAnalyzer()
    await analyzer.start()

    text = (
        "Tesla stock plummeted 15% following disappointing earnings "
        "and concerns about declining demand and production issues."
    )
    result = await analyzer.analyze(text)

    assert result is not None
    assert result.label in ["positive", "negative", "neutral"]
    assert result.label == "negative"


@pytest.mark.asyncio
async def test_sentiment_analyzer_empty_text():
    analyzer = SentimentAnalyzer()
    await analyzer.start()

    result = await analyzer.analyze("")
    assert result is None


@pytest.mark.asyncio
async def test_sentiment_analyzer_not_started_raises():
    analyzer = SentimentAnalyzer()

    with pytest.raises(RuntimeError, match="not started"):
        await analyzer.analyze("Some text")


@pytest.mark.asyncio
async def test_sentiment_analyzer_truncates_long_text():
    analyzer = SentimentAnalyzer()
    await analyzer.start()

    # Create very long text
    long_text = "Great earnings. " * 1000
    result = await analyzer.analyze(long_text)

    assert result is not None
    assert result.label == "positive"
