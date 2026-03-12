"""Tests for REST API endpoints."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from src.app import app
from src.db.models import ArticleDB


@pytest.fixture
def mock_db_session(monkeypatch):
    """Mock database session for API tests."""
    mock_session = AsyncMock()

    async def mock_get_db():
        yield mock_session

    # Replace the get_db dependency
    from src.api import routes
    app.dependency_overrides[routes.get_db] = mock_get_db

    yield mock_session

    app.dependency_overrides.clear()


def _make_article_db(article_id: str = "test-1") -> ArticleDB:
    """Create a mock ArticleDB object."""
    article = MagicMock(spec=ArticleDB)
    article.id = article_id
    article.title = "AAPL Beats Earnings"
    article.url = "https://reuters.com/aapl"
    article.source = "polygon"
    article.publisher = "Reuters"
    article.published_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
    article.ingested_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
    article.tickers = ["AAPL"]
    article.keywords = ["earnings"]
    article.summary = "Apple beats earnings."
    article.sentiment_label = "positive"
    article.sentiment_score = 0.92
    article.gics_sector = "Information Technology"
    article.gics_industry_group = "Information Technology"
    article.industry_confidence = 0.88
    article.credibility_score = 85
    article.credibility_domain = "reuters.com"
    article.credibility_flags = []
    article.llm_json = {"impact": "positive"}
    return article


def test_health_endpoint():
    """Test the health check endpoint."""
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_list_articles(mock_db_session):
    """Test listing articles endpoint."""
    # Mock repository response
    mock_repo = AsyncMock()
    mock_repo.list_articles.return_value = [_make_article_db()]

    # Monkeypatch ArticleRepository
    from src.api import routes
    original_repo = routes.ArticleRepository
    routes.ArticleRepository = lambda session: mock_repo

    client = TestClient(app)
    response = client.get("/api/v1/articles")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == "test-1"
    assert data[0]["sentiment"]["label"] == "positive"

    # Restore
    routes.ArticleRepository = original_repo


@pytest.mark.asyncio
async def test_list_articles_with_filters(mock_db_session):
    """Test listing articles with query filters."""
    mock_repo = AsyncMock()
    mock_repo.list_articles.return_value = [_make_article_db()]

    from src.api import routes
    original_repo = routes.ArticleRepository
    routes.ArticleRepository = lambda session: mock_repo

    client = TestClient(app)
    response = client.get(
        "/api/v1/articles",
        params={
            "ticker": "AAPL",
            "sentiment": "positive",
            "min_credibility": 80,
            "limit": 10,
        },
    )

    assert response.status_code == 200
    # Verify filters were passed to repository
    mock_repo.list_articles.assert_called_once()

    routes.ArticleRepository = original_repo


@pytest.mark.asyncio
async def test_get_article_by_id(mock_db_session):
    """Test getting a single article by ID."""
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = _make_article_db()

    from src.api import routes
    original_repo = routes.ArticleRepository
    routes.ArticleRepository = lambda session: mock_repo

    client = TestClient(app)
    response = client.get("/api/v1/articles/test-1")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "test-1"
    assert data["title"] == "AAPL Beats Earnings"

    routes.ArticleRepository = original_repo


@pytest.mark.asyncio
async def test_get_summary_stats(mock_db_session):
    """Test getting summary statistics."""
    mock_repo = AsyncMock()
    mock_repo.count_articles.return_value = 42

    from src.api import routes
    original_repo = routes.ArticleRepository
    routes.ArticleRepository = lambda session: mock_repo

    client = TestClient(app)
    response = client.get(
        "/api/v1/articles/stats/summary",
        params={"ticker": "AAPL", "sentiment": "positive"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 42
    assert data["filters"]["ticker"] == "AAPL"

    routes.ArticleRepository = original_repo
