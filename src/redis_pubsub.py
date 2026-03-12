"""Redis Pub/Sub publisher and subscriber for internal message routing."""

import asyncio
from collections.abc import AsyncIterator, Callable

import orjson
import redis.asyncio as aioredis

from config import settings
from src.logging import get_logger
from pydantic import BaseModel

from src.models import RawArticle

log = get_logger(__name__)


class RedisPublisher:
    """Publishes serialized messages to Redis channels."""

    def __init__(self, redis_url: str = settings.redis_url) -> None:
        self._redis_url = redis_url
        self._client: aioredis.Redis | None = None

    async def connect(self) -> None:
        self._client = aioredis.from_url(
            self._redis_url, decode_responses=False
        )
        await self._client.ping()
        await log.ainfo("redis_publisher_connected", url=self._redis_url)

    async def publish(self, channel: str, message: BaseModel) -> int:
        """Publish a message to a Redis channel. Returns subscriber count."""
        if self._client is None:
            raise RuntimeError("Publisher not connected — call connect() first")

        payload = orjson.dumps(message.model_dump(), default=str)
        count = await self._client.publish(channel, payload)

        # Extract ID if available for logging
        msg_id = getattr(message, "id", None) or getattr(
            getattr(message, "raw", None), "id", "unknown"
        )
        await log.adebug(
            "published",
            channel=channel,
            message_id=msg_id,
            subscribers=count,
        )
        return count

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            await log.ainfo("redis_publisher_closed")


class RedisSubscriber:
    """Subscribes to Redis channels and yields deserialized messages."""

    def __init__(self, redis_url: str = settings.redis_url) -> None:
        self._redis_url = redis_url
        self._client: aioredis.Redis | None = None
        self._pubsub: aioredis.client.PubSub | None = None

    async def connect(self, channels: list[str]) -> None:
        self._client = aioredis.from_url(
            self._redis_url, decode_responses=False
        )
        self._pubsub = self._client.pubsub()
        await self._pubsub.subscribe(*channels)
        await log.ainfo("redis_subscriber_connected", channels=channels)

    async def listen(self) -> AsyncIterator[tuple[str, RawArticle]]:
        """Yield (channel, article) tuples from subscribed channels."""
        if self._pubsub is None:
            raise RuntimeError("Subscriber not connected — call connect() first")

        async for message in self._pubsub.listen():
            if message["type"] != "message":
                continue

            channel = (
                message["channel"].decode()
                if isinstance(message["channel"], bytes)
                else message["channel"]
            )
            data = orjson.loads(message["data"])
            article = RawArticle.model_validate(data)
            yield channel, article

    async def close(self) -> None:
        if self._pubsub:
            await self._pubsub.unsubscribe()
            await self._pubsub.aclose()
        if self._client:
            await self._client.aclose()
        await log.ainfo("redis_subscriber_closed")


async def consume_channel(
    channel: str,
    handler: Callable[[RawArticle], asyncio.Future],
    redis_url: str = settings.redis_url,
) -> None:
    """Convenience: subscribe to one channel and call handler for each message."""
    subscriber = RedisSubscriber(redis_url=redis_url)
    await subscriber.connect([channel])
    try:
        async for _, article in subscriber.listen():
            await handler(article)
    finally:
        await subscriber.close()
