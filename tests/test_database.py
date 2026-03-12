"""Tests for database models and repository."""

from datetime import datetime, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.db.database import Base
from src.db.models import ArticleDB
from src.db.repository import ArticleRepository
from src.models import (
    CredibilityScore,
    EnrichedArticle,
    IndustryClassification,
    NewsSource,
    RawArticle,
    SentimentResult,
)


@pytest.fixture
async def db_session():
    """Create an in-memory SQLite database for testing."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        yield session

    await engine.dispose()


def _make_enriched_article() -> EnrichedArticle:
    """Create a test enriched article."""
    raw = RawArticle(
        id="test-1",
        title="AAPL Beats Earnings",
        url="https://reuters.com/aapl",
        source=NewsSource.POLYGON,
        publisher="Reuters",
        tickers=["AAPL"],
        published_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
        body="Apple reported strong earnings.",
        keywords=["earnings", "apple"],
    )

    return EnrichedArticle(
        raw=raw,
        full_text="Apple reported strong quarterly earnings.",
        sentiment=SentimentResult(label="positive", score=0.92),
        industry=IndustryClassification(
            gics_sector="Information Technology",
            gics_industry_group="Information Technology",
            confidence=0.88,
        ),
        credibility=CredibilityScore(score=85, domain="reuters.com", flags=[]),
        summary="Apple beats earnings expectations.",
        llm_json={"impact": "positive"},
    )


@pytest.mark.asyncio
async def test_create_article(db_session: AsyncSession):
    """Test creating an article in the database."""
    repo = ArticleRepository(db_session)
    enriched = _make_enriched_article()

    article = await repo.create(enriched)

    assert article.id == "test-1"
    assert article.title == "AAPL Beats Earnings"
    assert article.sentiment_label == "positive"
    assert article.gics_sector == "Information Technology"
    assert article.credibility_score == 85


@pytest.mark.asyncio
async def test_get_article_by_id(db_session: AsyncSession):
    """Test retrieving an article by ID."""
    repo = ArticleRepository(db_session)
    enriched = _make_enriched_article()

    await repo.create(enriched)
    article = await repo.get_by_id("test-1")

    assert article is not None
    assert article.id == "test-1"


@pytest.mark.asyncio
async def test_get_nonexistent_article(db_session: AsyncSession):
    """Test retrieving a nonexistent article returns None."""
    repo = ArticleRepository(db_session)

    article = await repo.get_by_id("nonexistent")
    assert article is None


@pytest.mark.asyncio
async def test_list_articles(db_session: AsyncSession):
    """Test listing articles with pagination."""
    repo = ArticleRepository(db_session)

    # Create multiple articles
    for i in range(5):
        enriched = _make_enriched_article()
        enriched.raw.id = f"test-{i}"
        enriched.raw.published_at = datetime(2024, 1, i + 1, tzinfo=timezone.utc)
        await repo.create(enriched)

    articles = await repo.list_articles(limit=3, offset=0)

    assert len(articles) == 3
    # Should be ordered by published_at desc
    assert articles[0].id == "test-4"


@pytest.mark.asyncio
async def test_filter_by_ticker(db_session: AsyncSession):
    """Test filtering articles by ticker."""
    repo = ArticleRepository(db_session)

    # Create articles with different tickers
    for ticker in ["AAPL", "MSFT", "GOOGL"]:
        enriched = _make_enriched_article()
        enriched.raw.id = f"test-{ticker}"
        enriched.raw.tickers = [ticker]
        await repo.create(enriched)

    articles = await repo.list_articles(ticker="AAPL")

    assert len(articles) == 1
    assert "AAPL" in articles[0].tickers


@pytest.mark.asyncio
async def test_filter_by_sentiment(db_session: AsyncSession):
    """Test filtering articles by sentiment."""
    repo = ArticleRepository(db_session)

    sentiments = ["positive", "negative", "neutral"]
    for sentiment in sentiments:
        enriched = _make_enriched_article()
        enriched.raw.id = f"test-{sentiment}"
        enriched.sentiment = SentimentResult(label=sentiment, score=0.8)
        await repo.create(enriched)

    articles = await repo.list_articles(sentiment="positive")

    assert len(articles) == 1
    assert articles[0].sentiment_label == "positive"


@pytest.mark.asyncio
async def test_filter_by_sector(db_session: AsyncSession):
    """Test filtering articles by GICS sector."""
    repo = ArticleRepository(db_session)

    sectors = ["Information Technology", "Health Care", "Financials"]
    for sector in sectors:
        enriched = _make_enriched_article()
        enriched.raw.id = f"test-{sector.replace(' ', '-')}"
        enriched.industry = IndustryClassification(
            gics_sector=sector, gics_industry_group=sector, confidence=0.9
        )
        await repo.create(enriched)

    articles = await repo.list_articles(sector="Health Care")

    assert len(articles) == 1
    assert articles[0].gics_sector == "Health Care"


@pytest.mark.asyncio
async def test_filter_by_min_credibility(db_session: AsyncSession):
    """Test filtering articles by minimum credibility score."""
    repo = ArticleRepository(db_session)

    scores = [30, 60, 90]
    for score in scores:
        enriched = _make_enriched_article()
        enriched.raw.id = f"test-{score}"
        enriched.credibility = CredibilityScore(score=score, domain="test.com", flags=[])
        await repo.create(enriched)

    articles = await repo.list_articles(min_credibility=70)

    assert len(articles) == 1
    assert articles[0].credibility_score == 90


@pytest.mark.asyncio
async def test_count_articles(db_session: AsyncSession):
    """Test counting articles with filters."""
    repo = ArticleRepository(db_session)

    for i in range(10):
        enriched = _make_enriched_article()
        enriched.raw.id = f"test-{i}"
        await repo.create(enriched)

    count = await repo.count_articles()
    assert count == 10

    count_filtered = await repo.count_articles(sentiment="positive")
    assert count_filtered == 10  # All have positive sentiment
