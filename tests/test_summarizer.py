"""Tests for OpenRouter article summarization."""

import pytest
import respx
from httpx import Response

from src.enrichment.summarizer import SUMMARY_SCHEMA, ArticleSummarizer


MOCK_OPENROUTER_RESPONSE = {
    "choices": [
        {
            "message": {
                "content": """
{
  "summary": "Apple reported strong Q4 earnings beating expectations.",
  "key_points": [
    "Revenue up 11% year over year",
    "iPhone sales exceeded forecasts",
    "Services revenue hit record high"
  ],
  "mentioned_companies": ["Apple", "AAPL"],
  "impact": "positive"
}
                """.strip()
            }
        }
    ]
}


@pytest.mark.asyncio
@respx.mock
async def test_summarizer_success():
    api_key = "test-key"
    base_url = "https://openrouter.ai/api/v1"

    respx.post(f"{base_url}/chat/completions").mock(
        return_value=Response(200, json=MOCK_OPENROUTER_RESPONSE)
    )

    summarizer = ArticleSummarizer(api_key=api_key, base_url=base_url)
    await summarizer.start()

    title = "Apple Beats Earnings"
    text = "Apple Inc. reported strong quarterly results..."
    result = await summarizer.summarize(title, text)

    assert result is not None
    assert "summary" in result
    assert "key_points" in result
    assert "impact" in result
    assert result["impact"] in ["positive", "negative", "neutral", "mixed"]

    await summarizer.close()


@pytest.mark.asyncio
@respx.mock
async def test_summarizer_http_error_returns_none():
    api_key = "test-key"
    base_url = "https://openrouter.ai/api/v1"

    respx.post(f"{base_url}/chat/completions").mock(return_value=Response(429))

    summarizer = ArticleSummarizer(api_key=api_key, base_url=base_url)
    await summarizer.start()

    result = await summarizer.summarize("Title", "Text")
    assert result is None

    await summarizer.close()


@pytest.mark.asyncio
async def test_summarizer_empty_text():
    summarizer = ArticleSummarizer(api_key="test")
    await summarizer.start()

    result = await summarizer.summarize("Title", "")
    assert result is None

    await summarizer.close()


@pytest.mark.asyncio
async def test_summarizer_not_started_raises():
    summarizer = ArticleSummarizer(api_key="test")

    with pytest.raises(RuntimeError, match="not started"):
        await summarizer.summarize("Title", "Text")


def test_summary_schema_structure():
    """Verify schema has required fields."""
    assert SUMMARY_SCHEMA["type"] == "object"
    props = SUMMARY_SCHEMA["properties"]
    assert "summary" in props
    assert "key_points" in props
    assert "impact" in props
    assert set(SUMMARY_SCHEMA["required"]) == {"summary", "key_points", "impact"}
