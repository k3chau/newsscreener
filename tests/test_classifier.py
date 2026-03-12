"""Tests for DeBERTa industry classification."""

import pytest

from src.enrichment.classifier import GICS_SECTORS, IndustryClassifier


@pytest.mark.asyncio
async def test_industry_classifier_tech():
    classifier = IndustryClassifier()
    await classifier.start()

    text = (
        "Apple announced a new artificial intelligence chip for iPhones, "
        "marking a major advancement in mobile computing technology."
    )
    result = await classifier.classify(text)

    assert result is not None
    assert result.gics_sector in GICS_SECTORS
    assert 0.0 <= result.confidence <= 1.0
    # Should likely classify as Information Technology
    assert result.gics_sector == "Information Technology"


@pytest.mark.asyncio
async def test_industry_classifier_healthcare():
    classifier = IndustryClassifier()
    await classifier.start()

    text = (
        "Pfizer announced positive results from Phase 3 clinical trials "
        "for its new cancer treatment drug, showing significant efficacy."
    )
    result = await classifier.classify(text)

    assert result is not None
    assert result.gics_sector == "Health Care"


@pytest.mark.asyncio
async def test_industry_classifier_financials():
    classifier = IndustryClassifier()
    await classifier.start()

    text = (
        "JPMorgan Chase reported strong quarterly profits driven by "
        "investment banking fees and loan growth across all segments."
    )
    result = await classifier.classify(text)

    assert result is not None
    assert result.gics_sector == "Financials"


@pytest.mark.asyncio
async def test_industry_classifier_empty_text():
    classifier = IndustryClassifier()
    await classifier.start()

    result = await classifier.classify("")
    assert result is None


@pytest.mark.asyncio
async def test_industry_classifier_not_started_raises():
    classifier = IndustryClassifier()

    with pytest.raises(RuntimeError, match="not started"):
        await classifier.classify("Some text")


@pytest.mark.asyncio
async def test_gics_sectors_count():
    """Verify we have all 11 GICS sectors."""
    assert len(GICS_SECTORS) == 11
    assert "Information Technology" in GICS_SECTORS
    assert "Health Care" in GICS_SECTORS
    assert "Financials" in GICS_SECTORS
