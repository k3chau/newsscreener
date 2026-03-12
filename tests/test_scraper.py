"""Tests for the Trafilatura article scraper."""

from datetime import datetime, timezone

import httpx
import pytest
import respx

from src.ingestion.scraper import ArticleScraper
from src.models import NewsSource, RawArticle


def _make_article(url: str = "https://example.com/article") -> RawArticle:
    return RawArticle(
        id="scrape-test-1",
        title="Test Article",
        url=url,
        source=NewsSource.POLYGON,
        published_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
    )


SAMPLE_HTML = """
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
<article>
<h1>AAPL Beats Earnings</h1>
<p>Apple Inc. reported quarterly earnings that beat analyst expectations.
The company posted revenue of $94.8 billion, up 11% year over year.
CEO Tim Cook praised the strong performance across all product categories.
Services revenue hit an all-time high of $22.3 billion.</p>
</article>
</body>
</html>
"""


@pytest.mark.asyncio
@respx.mock
async def test_scrape_extracts_text():
    url = "https://example.com/aapl-earnings"
    respx.get(url).mock(
        return_value=httpx.Response(
            200,
            text=SAMPLE_HTML,
            headers={"content-type": "text/html; charset=utf-8"},
        )
    )

    scraper = ArticleScraper()
    await scraper.start()

    article = _make_article(url)
    text = await scraper.scrape(article)

    # Trafilatura should extract the article body text
    assert len(text) > 0
    assert "Apple" in text or "earnings" in text.lower()

    await scraper.close()


@pytest.mark.asyncio
@respx.mock
async def test_scrape_http_error_returns_empty():
    url = "https://example.com/404"
    respx.get(url).mock(return_value=httpx.Response(404))

    scraper = ArticleScraper()
    await scraper.start()

    article = _make_article(url)
    text = await scraper.scrape(article)

    assert text == ""
    await scraper.close()


@pytest.mark.asyncio
@respx.mock
async def test_scrape_non_html_returns_empty():
    url = "https://example.com/data.json"
    respx.get(url).mock(
        return_value=httpx.Response(
            200,
            text='{"data": true}',
            headers={"content-type": "application/json"},
        )
    )

    scraper = ArticleScraper()
    await scraper.start()

    article = _make_article(url)
    text = await scraper.scrape(article)

    assert text == ""
    await scraper.close()


@pytest.mark.asyncio
async def test_scraper_not_started_raises():
    scraper = ArticleScraper()
    article = _make_article()

    with pytest.raises(RuntimeError, match="not started"):
        await scraper.scrape(article)
