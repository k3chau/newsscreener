"""Article body scraper using Trafilatura with async execution."""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from functools import partial

import httpx
import trafilatura

from config import settings
from src.logging import get_logger
from src.models import RawArticle

log = get_logger(__name__)


class ArticleScraper:
    """Scrapes full article text from URLs using Trafilatura.

    Trafilatura is synchronous, so we run extractions in a thread pool
    to avoid blocking the async event loop.
    """

    def __init__(
        self,
        timeout: float = settings.scrape_timeout,
        max_concurrent: int = settings.scrape_max_concurrent,
    ) -> None:
        self._timeout = timeout
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._executor = ThreadPoolExecutor(max_workers=max_concurrent)
        self._http_client: httpx.AsyncClient | None = None

    async def start(self) -> None:
        self._http_client = httpx.AsyncClient(
            timeout=self._timeout,
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; NewsScreenerBot/1.0; "
                    "+https://github.com/news-screener)"
                )
            },
        )
        await log.ainfo("scraper_started", max_concurrent=self._semaphore._value)

    async def close(self) -> None:
        if self._http_client:
            await self._http_client.aclose()
        self._executor.shutdown(wait=False)
        await log.ainfo("scraper_closed")

    async def scrape(self, article: RawArticle) -> str:
        """Fetch and extract the full text for an article.

        Returns the extracted text, or empty string on failure.
        """
        async with self._semaphore:
            try:
                html = await self._fetch_html(str(article.url))
                if not html:
                    return ""

                text = await self._extract_text(html, str(article.url))
                await log.ainfo(
                    "article_scraped",
                    article_id=article.id,
                    url=str(article.url),
                    text_length=len(text) if text else 0,
                )
                return text or ""

            except httpx.HTTPError as exc:
                await log.awarning(
                    "scrape_http_error",
                    article_id=article.id,
                    url=str(article.url),
                    error=str(exc),
                )
                return ""
            except RuntimeError:
                raise
            except Exception as exc:
                await log.awarning(
                    "scrape_error",
                    article_id=article.id,
                    url=str(article.url),
                    error=str(exc),
                )
                return ""

    async def _fetch_html(self, url: str) -> str | None:
        if self._http_client is None:
            raise RuntimeError("Scraper not started — call start() first")

        response = await self._http_client.get(url)
        response.raise_for_status()

        content_type = response.headers.get("content-type", "")
        if "text/html" not in content_type and "application/xhtml" not in content_type:
            await log.adebug("skipping_non_html", url=url, content_type=content_type)
            return None

        return response.text

    async def _extract_text(self, html: str, url: str) -> str | None:
        """Run trafilatura extraction in a thread pool."""
        loop = asyncio.get_running_loop()
        extract_fn = partial(
            trafilatura.extract,
            html,
            url=url,
            include_comments=False,
            include_tables=False,
            favor_recall=True,
        )
        return await loop.run_in_executor(self._executor, extract_fn)
