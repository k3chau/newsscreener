"""NewsGuard API integration for source credibility scoring."""

from urllib.parse import urlparse

import httpx

from config import settings
from src.logging import get_logger
from src.models import CredibilityScore

log = get_logger(__name__)


class CredibilityScorer:
    """Scores news source credibility using NewsGuard API with fallback."""

    def __init__(
        self,
        api_key: str = settings.newsguard_api_key,
        base_url: str = settings.newsguard_base_url,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url
        self._client: httpx.AsyncClient | None = None

    async def start(self) -> None:
        self._client = httpx.AsyncClient(
            timeout=10.0,
            headers={"X-API-Key": self._api_key} if self._api_key else {},
        )
        await log.ainfo("credibility_scorer_started", has_api_key=bool(self._api_key))

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
        await log.ainfo("credibility_scorer_closed")

    async def score(self, url: str) -> CredibilityScore:
        """Score the credibility of a news source from URL."""
        domain = self._extract_domain(url)

        if self._client is None:
            raise RuntimeError("CredibilityScorer not started — call start() first")

        # If no API key, return neutral fallback score
        if not self._api_key:
            return self._fallback_score(domain)

        try:
            response = await self._client.get(
                f"{self._base_url}/ratings",
                params={"url": domain},
            )
            response.raise_for_status()

            data = response.json()
            score_value = data.get("score", 50)
            flags = data.get("flags", [])

            await log.ainfo("credibility_scored", domain=domain, score=score_value)
            return CredibilityScore(score=score_value, domain=domain, flags=flags)

        except httpx.HTTPError as exc:
            await log.awarning(
                "credibility_api_error",
                domain=domain,
                error=str(exc),
                using_fallback=True,
            )
            return self._fallback_score(domain)

    @staticmethod
    def _extract_domain(url: str) -> str:
        """Extract domain from URL."""
        parsed = urlparse(url)
        return parsed.netloc or parsed.path

    @staticmethod
    def _fallback_score(domain: str) -> CredibilityScore:
        """Return a neutral fallback score when API is unavailable."""
        # Basic heuristics for known domains
        trusted_domains = {
            "reuters.com": 85,
            "bloomberg.com": 85,
            "wsj.com": 85,
            "ft.com": 85,
            "apnews.com": 80,
        }

        score = 50  # neutral default
        for trusted, value in trusted_domains.items():
            if trusted in domain.lower():
                score = value
                break

        return CredibilityScore(
            score=score,
            domain=domain,
            flags=["fallback_score"],
        )
