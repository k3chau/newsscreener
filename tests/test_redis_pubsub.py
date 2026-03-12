"""Tests for Redis Pub/Sub publisher and subscriber."""

import asyncio
from datetime import datetime, timezone

import orjson
import pytest

from src.models import NewsSource, RawArticle
from src.redis_pubsub import RedisPublisher, RedisSubscriber


def _make_article(id: str = "test-1") -> RawArticle:
    return RawArticle(
        id=id,
        title="Test Article",
        url="https://example.com/test",
        source=NewsSource.POLYGON,
        published_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
        tickers=["AAPL"],
    )


@pytest.mark.asyncio
async def test_publish_and_subscribe(redis_url):
    """End-to-end: publish an article and receive it via subscriber."""
    channel = "test:news"
    article = _make_article()

    publisher = RedisPublisher(redis_url=redis_url)
    subscriber = RedisSubscriber(redis_url=redis_url)

    await publisher.connect()
    await subscriber.connect([channel])

    # Give subscriber time to register
    await asyncio.sleep(0.1)

    await publisher.publish(channel, article)

    received = None
    async for ch, art in subscriber.listen():
        received = art
        break  # just get the first one

    assert received is not None
    assert received.id == article.id
    assert received.title == article.title
    assert received.tickers == ["AAPL"]

    await subscriber.close()
    await publisher.close()


@pytest.mark.asyncio
async def test_publisher_not_connected_raises():
    publisher = RedisPublisher(redis_url="redis://localhost:6379/15")
    article = _make_article()

    with pytest.raises(RuntimeError, match="not connected"):
        await publisher.publish("test:ch", article)
