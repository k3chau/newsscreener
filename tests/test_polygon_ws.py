"""Tests for Polygon.io WebSocket client message parsing."""

from datetime import timezone

from src.ingestion.polygon_ws import PolygonNewsClient
from src.models import NewsSource


class TestParseNewsEvent:
    def test_valid_event(self):
        event = {
            "ev": "N",
            "id": "abc123",
            "title": "AAPL Beats Q3 Earnings",
            "url": "https://example.com/aapl-earnings",
            "publisher": {"name": "Reuters"},
            "tickers": ["AAPL"],
            "timestamp": 1704067200000,  # 2024-01-01T00:00:00Z
            "keywords": ["earnings", "apple"],
        }
        article = PolygonNewsClient._parse_news_event(event)

        assert article is not None
        assert article.id == "abc123"
        assert article.title == "AAPL Beats Q3 Earnings"
        assert str(article.url) == "https://example.com/aapl-earnings"
        assert article.source == NewsSource.POLYGON
        assert article.publisher == "Reuters"
        assert article.tickers == ["AAPL"]
        assert article.published_at.tzinfo == timezone.utc
        assert article.keywords == ["earnings", "apple"]

    def test_missing_url_returns_none(self):
        event = {"ev": "N", "id": "no-url", "title": "No URL article"}
        result = PolygonNewsClient._parse_news_event(event)
        assert result is None

    def test_empty_url_returns_none(self):
        event = {"ev": "N", "id": "empty-url", "title": "Empty", "url": ""}
        result = PolygonNewsClient._parse_news_event(event)
        assert result is None

    def test_missing_timestamp_uses_now(self):
        event = {
            "ev": "N",
            "id": "no-ts",
            "title": "No Timestamp",
            "url": "https://example.com/no-ts",
        }
        article = PolygonNewsClient._parse_news_event(event)
        assert article is not None
        assert article.published_at.tzinfo == timezone.utc

    def test_missing_publisher_defaults_empty(self):
        event = {
            "ev": "N",
            "id": "no-pub",
            "title": "No Publisher",
            "url": "https://example.com/no-pub",
            "timestamp": 1704067200000,
        }
        article = PolygonNewsClient._parse_news_event(event)
        assert article is not None
        assert article.publisher == ""

    def test_missing_tickers_defaults_empty_list(self):
        event = {
            "ev": "N",
            "id": "no-tickers",
            "title": "No Tickers",
            "url": "https://example.com/no-tickers",
            "timestamp": 1704067200000,
        }
        article = PolygonNewsClient._parse_news_event(event)
        assert article is not None
        assert article.tickers == []
