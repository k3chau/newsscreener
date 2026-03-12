"""SQLAlchemy database models."""

from datetime import UTC, datetime

from sqlalchemy import Float, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from src.db.database import Base


class ArticleDB(Base):
    """Persisted enriched article with all analysis results."""

    __tablename__ = "articles"

    # Primary key
    id: Mapped[str] = mapped_column(String(255), primary_key=True)

    # Article metadata
    title: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    publisher: Mapped[str] = mapped_column(String(255), default="")
    published_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    ingested_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    # Content
    body: Mapped[str] = mapped_column(Text, default="")
    full_text: Mapped[str] = mapped_column(Text, default="")
    summary: Mapped[str] = mapped_column(Text, default="")

    # Tickers and keywords
    tickers: Mapped[list[str]] = mapped_column(JSONB, default=list)
    keywords: Mapped[list[str]] = mapped_column(JSONB, default=list)

    # Sentiment analysis
    sentiment_label: Mapped[str | None] = mapped_column(String(20))
    sentiment_score: Mapped[float | None] = mapped_column(Float)

    # Industry classification
    gics_sector: Mapped[str | None] = mapped_column(String(100))
    gics_industry_group: Mapped[str | None] = mapped_column(String(100))
    industry_confidence: Mapped[float | None] = mapped_column(Float)

    # Credibility scoring
    credibility_score: Mapped[int | None] = mapped_column(Integer)
    credibility_domain: Mapped[str | None] = mapped_column(String(255))
    credibility_flags: Mapped[list[str]] = mapped_column(JSONB, default=list)

    # LLM structured output
    llm_json: Mapped[dict | None] = mapped_column(JSONB)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    # Indexes for common queries
    __table_args__ = (
        Index("ix_articles_published_at", "published_at"),
        Index("ix_articles_sentiment_label", "sentiment_label"),
        Index("ix_articles_gics_sector", "gics_sector"),
        Index("ix_articles_credibility_score", "credibility_score"),
        Index("ix_articles_tickers", "tickers", postgresql_using="gin"),
    )
