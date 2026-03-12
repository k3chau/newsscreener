"""DeBERTa zero-shot classification for GICS industry sectors."""

import asyncio
from functools import lru_cache

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from config import settings
from src.logging import get_logger
from src.models import IndustryClassification

log = get_logger(__name__)

# GICS Level 1 Sectors (11 total)
GICS_SECTORS = [
    "Energy",
    "Materials",
    "Industrials",
    "Consumer Discretionary",
    "Consumer Staples",
    "Health Care",
    "Financials",
    "Information Technology",
    "Communication Services",
    "Utilities",
    "Real Estate",
]


@lru_cache(maxsize=1)
def _load_deberta_model():
    """Load DeBERTa zero-shot model and tokenizer (cached singleton)."""
    tokenizer = AutoTokenizer.from_pretrained(settings.deberta_model)
    model = AutoModelForSequenceClassification.from_pretrained(settings.deberta_model)
    model.eval()
    return tokenizer, model


class IndustryClassifier:
    """Classifies financial news into GICS sectors using DeBERTa zero-shot."""

    def __init__(self) -> None:
        self._tokenizer = None
        self._model = None
        self._device = "cuda" if torch.cuda.is_available() else "cpu"

    async def start(self) -> None:
        """Load DeBERTa model in background thread."""
        loop = asyncio.get_running_loop()
        self._tokenizer, self._model = await loop.run_in_executor(
            None, _load_deberta_model
        )
        if self._device == "cuda":
            self._model = self._model.to(self._device)
        await log.ainfo("industry_classifier_started", device=self._device)

    async def classify(self, text: str) -> IndustryClassification | None:
        """Classify text into GICS sector. Returns None if text is empty."""
        if not text or not text.strip():
            return None

        if self._tokenizer is None or self._model is None:
            raise RuntimeError("IndustryClassifier not started — call start() first")

        # Use title + first 256 chars for classification
        text = text[:256]

        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, self._predict, text)

        await log.adebug(
            "industry_classified",
            sector=result.gics_sector,
            confidence=result.confidence,
        )
        return result

    def _predict(self, text: str) -> IndustryClassification:
        """Run zero-shot classification synchronously (called in thread pool)."""
        # DeBERTa NLI: premise is the text, hypothesis is "This is about {sector}"
        scores = []

        for sector in GICS_SECTORS:
            hypothesis = f"This article is about the {sector} industry sector."
            inputs = self._tokenizer(
                text,
                hypothesis,
                return_tensors="pt",
                truncation=True,
                max_length=512,
            )

            if self._device == "cuda":
                inputs = {k: v.to(self._device) for k, v in inputs.items()}

            with torch.no_grad():
                outputs = self._model(**inputs)
                logits = outputs.logits

            # DeBERTa MNLI: [contradiction, neutral, entailment]
            # We use entailment score (index 2) as confidence
            probs = torch.softmax(logits, dim=-1)
            entailment_score = probs[0, 2].item()
            scores.append((sector, entailment_score))

        # Select sector with highest entailment score
        best_sector, best_score = max(scores, key=lambda x: x[1])

        return IndustryClassification(
            gics_sector=best_sector,
            gics_industry_group=best_sector,  # Using sector as group for now
            confidence=best_score,
        )
