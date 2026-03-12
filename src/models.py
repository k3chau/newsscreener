"""Domain models for the news screener pipeline."""

from datetime import UTC, datetime
from enum import Enum

from pydantic import BaseModel, Field, HttpUrl


class NewsSource(str, Enum):
    POLYGON = "polygon"
    SCRAPER = "scraper"


class RawArticle(BaseModel):
    """Article as ingested from a source before enrichment."""

    id: str
    title: str
    url: HttpUrl
    source: NewsSource
    publisher: str = ""
    tickers: list[str] = Field(default_factory=list)
    published_at: datetime
    ingested_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    body: str = ""
    keywords: list[str] = Field(default_factory=list)


class SentimentResult(BaseModel):
    label: str  # positive, negative, neutral
    score: float


class IndustryClassification(BaseModel):
    gics_sector: str
    gics_industry_group: str
    confidence: float


class CredibilityScore(BaseModel):
    score: int = Field(ge=0, le=100)
    domain: str
    flags: list[str] = Field(default_factory=list)


class EnrichedArticle(BaseModel):
    """Article after all enrichment stages."""

    raw: RawArticle
    full_text: str = ""
    sentiment: SentimentResult | None = None
    industry: IndustryClassification | None = None
    credibility: CredibilityScore | None = None
    summary: str = ""
    llm_json: dict | None = None
