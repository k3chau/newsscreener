"""Tests for NewsGuard credibility scoring."""

import pytest
import respx
from httpx import Response

from src.enrichment.credibility import CredibilityScorer


MOCK_NEWSGUARD_RESPONSE = {
    "score": 85,
    "flags": ["credible", "transparent"],
}


@pytest.mark.asyncio
@respx.mock
async def test_credibility_scorer_with_api():
    api_key = "test-key"
    base_url = "https://api.newsguardtech.com/v3"

    respx.get(f"{base_url}/ratings").mock(
        return_value=Response(200, json=MOCK_NEWSGUARD_RESPONSE)
    )

    scorer = CredibilityScorer(api_key=api_key, base_url=base_url)
    await scorer.start()

    result = await scorer.score("https://reuters.com/article/123")

    assert result.score == 85
    assert result.domain == "reuters.com"
    assert "credible" in result.flags

    await scorer.close()


@pytest.mark.asyncio
async def test_credibility_scorer_without_api_key():
    """When no API key, should use fallback scoring."""
    scorer = CredibilityScorer(api_key="")
    await scorer.start()

    result = await scorer.score("https://reuters.com/article/123")

    assert result.score == 85  # reuters is in trusted list
    assert result.domain == "reuters.com"
    assert "fallback_score" in result.flags

    await scorer.close()


@pytest.mark.asyncio
async def test_credibility_scorer_fallback_trusted_domains():
    """Test fallback scores for known trusted domains."""
    scorer = CredibilityScorer(api_key="")
    await scorer.start()

    test_cases = [
        ("https://reuters.com/news", 85),
        ("https://bloomberg.com/article", 85),
        ("https://wsj.com/news", 85),
        ("https://unknown-site.com/article", 50),  # neutral default
    ]

    for url, expected_score in test_cases:
        result = await scorer.score(url)
        assert result.score == expected_score

    await scorer.close()


@pytest.mark.asyncio
@respx.mock
async def test_credibility_scorer_api_error_falls_back():
    api_key = "test-key"
    base_url = "https://api.newsguardtech.com/v3"

    respx.get(f"{base_url}/ratings").mock(return_value=Response(500))

    scorer = CredibilityScorer(api_key=api_key, base_url=base_url)
    await scorer.start()

    result = await scorer.score("https://reuters.com/article")

    assert result.score == 85  # fallback to trusted list
    assert "fallback_score" in result.flags

    await scorer.close()


@pytest.mark.asyncio
async def test_credibility_scorer_not_started_raises():
    scorer = CredibilityScorer(api_key="test")

    with pytest.raises(RuntimeError, match="not started"):
        await scorer.score("https://example.com")


def test_extract_domain():
    """Test domain extraction from URLs."""
    scorer = CredibilityScorer(api_key="")

    assert scorer._extract_domain("https://reuters.com/article/123") == "reuters.com"
    assert (
        scorer._extract_domain("https://www.bloomberg.com/news")
        == "www.bloomberg.com"
    )
    assert scorer._extract_domain("http://example.com") == "example.com"
