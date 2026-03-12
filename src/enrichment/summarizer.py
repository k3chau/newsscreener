"""OpenRouter LLM integration for article summarization with structured JSON output."""

import httpx
import orjson

from config import settings
from src.logging import get_logger

log = get_logger(__name__)


SUMMARY_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {
            "type": "string",
            "description": "Concise 2-3 sentence summary of the article",
        },
        "key_points": {
            "type": "array",
            "items": {"type": "string"},
            "description": "3-5 key bullet points",
        },
        "mentioned_companies": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Company names or tickers mentioned",
        },
        "impact": {
            "type": "string",
            "enum": ["positive", "negative", "neutral", "mixed"],
            "description": "Overall market impact",
        },
    },
    "required": ["summary", "key_points", "impact"],
}


class ArticleSummarizer:
    """Generates structured summaries using OpenRouter API."""

    def __init__(
        self,
        api_key: str = settings.openrouter_api_key,
        base_url: str = settings.openrouter_base_url,
        model: str = settings.openrouter_model,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url
        self._model = model
        self._client: httpx.AsyncClient | None = None

    async def start(self) -> None:
        self._client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "HTTP-Referer": "https://github.com/news-screener",
                "X-Title": "News Screener",
            },
        )
        await log.ainfo("summarizer_started", model=self._model)

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
        await log.ainfo("summarizer_closed")

    async def summarize(self, title: str, text: str) -> dict | None:
        """Generate structured summary from article. Returns None if text is empty."""
        if not text or not text.strip():
            return None

        if self._client is None:
            raise RuntimeError("ArticleSummarizer not started — call start() first")

        # Truncate to ~2000 chars to stay within token limits
        text = text[:2000]

        prompt = self._build_prompt(title, text)

        try:
            response = await self._client.post(
                f"{self._base_url}/chat/completions",
                json={
                    "model": self._model,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a financial news analyst. "
                                "Summarize articles into structured JSON."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "response_format": {"type": "json_schema", "schema": SUMMARY_SCHEMA},
                    "temperature": 0.3,
                    "max_tokens": 500,
                },
            )
            response.raise_for_status()

            result = response.json()
            content = result["choices"][0]["message"]["content"]
            summary_json = orjson.loads(content)

            await log.ainfo(
                "article_summarized",
                model=self._model,
                impact=summary_json.get("impact"),
            )
            return summary_json

        except httpx.HTTPError as exc:
            await log.aerror(
                "summarization_http_error",
                error=str(exc),
                status=getattr(exc.response, "status_code", None),
            )
            return None
        except (orjson.JSONDecodeError, KeyError) as exc:
            await log.aerror("summarization_parse_error", error=str(exc))
            return None

    @staticmethod
    def _build_prompt(title: str, text: str) -> str:
        return f"""Analyze this financial news article and provide a structured summary.

Title: {title}

Article:
{text}

Return a JSON object with:
- summary: 2-3 sentence summary
- key_points: 3-5 bullet points
- mentioned_companies: company names/tickers mentioned
- impact: overall market impact (positive/negative/neutral/mixed)
"""
