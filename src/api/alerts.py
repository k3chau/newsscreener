"""Alert configuration and notification endpoints."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import redis.asyncio as aioredis

from config import settings
from src.logging import get_logger

log = get_logger(__name__)

router = APIRouter(prefix="/api/v1/alerts", tags=["alerts"])

REDIS_KEY_CONFIG = "alerts:config"
REDIS_KEY_HISTORY = "alerts:history"
HISTORY_MAX = 50


class AlertRule(BaseModel):
    ticker: str
    sentiment: str = "any"  # "positive", "negative", "neutral", "any"
    min_credibility: int = 0
    enabled: bool = True


class AlertConfig(BaseModel):
    email: str | None = None
    rules: list[AlertRule] = []


class AlertHistoryEntry(BaseModel):
    ticker: str
    title: str
    sentiment: str | None = None
    credibility: int | None = None
    matched_rule: dict | None = None
    triggered_at: str


async def _get_redis() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_url, decode_responses=True)


@router.post("/config")
async def save_alert_config(config: AlertConfig):
    """Save alert configuration to Redis."""
    r = await _get_redis()
    try:
        await r.set(REDIS_KEY_CONFIG, config.model_dump_json())
        return {"status": "saved", "rules_count": len(config.rules)}
    finally:
        await r.aclose()


@router.get("/config")
async def get_alert_config():
    """Retrieve current alert configuration."""
    r = await _get_redis()
    try:
        data = await r.get(REDIS_KEY_CONFIG)
        if not data:
            return AlertConfig().model_dump()
        return json.loads(data)
    finally:
        await r.aclose()


@router.get("/history")
async def get_alert_history(limit: int = 50):
    """List recent triggered alerts."""
    r = await _get_redis()
    try:
        entries = await r.lrange(REDIS_KEY_HISTORY, 0, min(limit, HISTORY_MAX) - 1)
        return [json.loads(e) for e in entries]
    finally:
        await r.aclose()


@router.post("/test")
async def test_alert():
    """Trigger a test alert and store it in history."""
    entry = AlertHistoryEntry(
        ticker="TEST",
        title="Test alert - your alert system is working",
        sentiment="neutral",
        credibility=100,
        matched_rule={"ticker": "TEST", "sentiment": "any", "min_credibility": 0},
        triggered_at=datetime.now(timezone.utc).isoformat(),
    )
    r = await _get_redis()
    try:
        await r.lpush(REDIS_KEY_HISTORY, entry.model_dump_json())
        await r.ltrim(REDIS_KEY_HISTORY, 0, HISTORY_MAX - 1)
        return {"status": "sent", "alert": entry.model_dump()}
    finally:
        await r.aclose()


async def check_article_alerts(article: dict) -> list[AlertHistoryEntry]:
    """Check an article against alert rules and store matches in history.

    Args:
        article: dict with keys like tickers, sentiment.label, credibility.score

    Returns:
        List of triggered alert entries.
    """
    r = await _get_redis()
    try:
        data = await r.get(REDIS_KEY_CONFIG)
        if not data:
            return []

        config = AlertConfig.model_validate_json(data)
        if not config.rules:
            return []

        # Extract article fields
        tickers = article.get("tickers") or []
        if not tickers:
            raw = article.get("raw") or {}
            tickers = raw.get("tickers") or []
        tickers_upper = [t.upper() for t in tickers]

        sentiment_data = article.get("sentiment") or {}
        sentiment_label = (
            sentiment_data.get("label") if isinstance(sentiment_data, dict)
            else article.get("sentiment_label") or ""
        )

        credibility_data = article.get("credibility") or {}
        credibility_score = (
            credibility_data.get("score") if isinstance(credibility_data, dict)
            else article.get("credibility_score") or 0
        ) or 0

        title = article.get("title") or (article.get("raw") or {}).get("title") or ""

        triggered = []
        for rule in config.rules:
            if not rule.enabled:
                continue
            if rule.ticker.upper() not in tickers_upper:
                continue
            if rule.sentiment != "any" and sentiment_label != rule.sentiment:
                continue
            if credibility_score < rule.min_credibility:
                continue

            entry = AlertHistoryEntry(
                ticker=rule.ticker.upper(),
                title=title,
                sentiment=sentiment_label,
                credibility=credibility_score,
                matched_rule=rule.model_dump(),
                triggered_at=datetime.now(timezone.utc).isoformat(),
            )
            await r.lpush(REDIS_KEY_HISTORY, entry.model_dump_json())
            await r.ltrim(REDIS_KEY_HISTORY, 0, HISTORY_MAX - 1)
            triggered.append(entry)

            await log.ainfo(
                "alert_triggered",
                ticker=rule.ticker,
                title=title[:80],
                sentiment=sentiment_label,
            )

        # Attempt email if configured
        if triggered and config.email and settings.smtp_host:
            await _send_email_alert(config.email, triggered)

        return triggered
    finally:
        await r.aclose()


async def _send_email_alert(to_email: str, alerts: list[AlertHistoryEntry]) -> None:
    """Send alert notification via email. Fails silently with logging."""
    try:
        import aiosmtplib
        from email.message import EmailMessage

        subject = f"News Screener Alert: {len(alerts)} new match(es)"
        body_lines = []
        for a in alerts:
            body_lines.append(
                f"- [{a.ticker}] {a.title} (sentiment: {a.sentiment}, "
                f"credibility: {a.credibility})"
            )

        msg = EmailMessage()
        msg["From"] = settings.alert_email_from
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content("\n".join(body_lines))

        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=settings.smtp_password or None,
            start_tls=True,
        )
        await log.ainfo("alert_email_sent", to=to_email, count=len(alerts))
    except Exception as exc:
        await log.awarning("alert_email_failed", error=str(exc))
