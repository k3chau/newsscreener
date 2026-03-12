"""FinBERT-based sentiment analysis for financial news."""

import asyncio
from functools import lru_cache

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from config import settings
from src.logging import get_logger
from src.models import SentimentResult

log = get_logger(__name__)


@lru_cache(maxsize=1)
def _load_finbert_model():
    """Load FinBERT model and tokenizer (cached singleton)."""
    tokenizer = AutoTokenizer.from_pretrained(settings.finbert_model)
    model = AutoModelForSequenceClassification.from_pretrained(settings.finbert_model)
    model.eval()
    return tokenizer, model


class SentimentAnalyzer:
    """Analyzes sentiment of financial news text using FinBERT."""

    def __init__(self) -> None:
        self._tokenizer = None
        self._model = None
        self._device = "cuda" if torch.cuda.is_available() else "cpu"

    async def start(self) -> None:
        """Load FinBERT model in background thread."""
        loop = asyncio.get_running_loop()
        self._tokenizer, self._model = await loop.run_in_executor(
            None, _load_finbert_model
        )
        if self._device == "cuda":
            self._model = self._model.to(self._device)
        await log.ainfo("sentiment_analyzer_started", device=self._device)

    async def analyze(self, text: str) -> SentimentResult | None:
        """Analyze sentiment of text. Returns None if text is empty."""
        if not text or not text.strip():
            return None

        if self._tokenizer is None or self._model is None:
            raise RuntimeError("SentimentAnalyzer not started — call start() first")

        # Truncate to avoid token limit issues
        text = text[:512]

        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, self._predict, text)

        await log.adebug("sentiment_analyzed", label=result.label, score=result.score)
        return result

    def _predict(self, text: str) -> SentimentResult:
        """Run model inference synchronously (called in thread pool)."""
        inputs = self._tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True,
        )

        if self._device == "cuda":
            inputs = {k: v.to(self._device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = self._model(**inputs)
            logits = outputs.logits

        probs = torch.softmax(logits, dim=-1)
        predicted_class = torch.argmax(probs, dim=-1).item()
        confidence = probs[0, predicted_class].item()

        # FinBERT labels: 0=positive, 1=negative, 2=neutral
        label_map = {0: "positive", 1: "negative", 2: "neutral"}
        label = label_map.get(predicted_class, "neutral")

        return SentimentResult(label=label, score=confidence)
