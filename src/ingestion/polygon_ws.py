"""Polygon.io WebSocket client for real-time news ingestion."""

import asyncio
import uuid
from datetime import datetime, timezone

import orjson
import websockets
from websockets.asyncio.client import ClientConnection

from config import settings
from src.logging import get_logger
from src.models import NewsSource, RawArticle
from src.redis_pubsub import RedisPublisher

log = get_logger(__name__)


class PolygonNewsClient:
    """Connects to Polygon.io news WebSocket, parses events, publishes to Redis."""

    def __init__(
        self,
        api_key: str = settings.polygon_api_key,
        ws_url: str = settings.polygon_ws_url,
        publisher: RedisPublisher | None = None,
        channel: str = settings.redis_channel_raw_news,
    ) -> None:
        self._api_key = api_key
        self._ws_url = ws_url
        self._publisher = publisher or RedisPublisher()
        self._channel = channel
        self._reconnect_delay = settings.polygon_reconnect_delay
        self._max_reconnect_delay = settings.polygon_max_reconnect_delay
        self._running = False
        self._ws: ClientConnection | None = None

    async def start(self) -> None:
        """Connect and start consuming. Reconnects on failure with backoff."""
        await self._publisher.connect()
        self._running = True
        delay = self._reconnect_delay

        while self._running:
            try:
                await self._connect_and_consume()
            except (
                websockets.ConnectionClosed,
                websockets.InvalidStatusCode,
                OSError,
            ) as exc:
                await log.awarning(
                    "polygon_ws_disconnected",
                    error=str(exc),
                    reconnect_in=delay,
                )

            if not self._running:
                break

            await log.ainfo("polygon_ws_reconnecting", delay=delay)
            await asyncio.sleep(delay)
            delay = min(delay * 2, self._max_reconnect_delay)

    async def stop(self) -> None:
        self._running = False
        if self._ws:
            await self._ws.close()
        await self._publisher.close()
        await log.ainfo("polygon_client_stopped")

    async def _connect_and_consume(self) -> None:
        async with websockets.connect(self._ws_url) as ws:
            self._ws = ws
            await log.ainfo("polygon_ws_connected", url=self._ws_url)

            await self._authenticate(ws)
            await self._subscribe(ws)

            async for raw_msg in ws:
                if not self._running:
                    break
                await self._handle_message(raw_msg)

    async def _authenticate(self, ws: ClientConnection) -> None:
        auth_msg = orjson.dumps({"action": "auth", "params": self._api_key})
        await ws.send(auth_msg)

        response = await asyncio.wait_for(ws.recv(), timeout=10.0)
        data = orjson.loads(response)
        events = data if isinstance(data, list) else [data]

        for event in events:
            status = event.get("status")
            if status == "auth_success":
                await log.ainfo("polygon_authenticated")
                return
            if status == "auth_failed":
                raise PermissionError(f"Polygon auth failed: {event.get('message')}")

    async def _subscribe(self, ws: ClientConnection) -> None:
        sub_msg = orjson.dumps({"action": "subscribe", "params": "N.*"})
        await ws.send(sub_msg)
        await log.ainfo("polygon_subscribed", params="N.*")

    async def _handle_message(self, raw_msg: str | bytes) -> None:
        data = orjson.loads(raw_msg)
        events = data if isinstance(data, list) else [data]

        for event in events:
            ev_type = event.get("ev")
            if ev_type != "N":
                continue

            article = self._parse_news_event(event)
            if article:
                await self._publisher.publish(self._channel, article)

    @staticmethod
    def _parse_news_event(event: dict) -> RawArticle | None:
        """Convert a Polygon news event dict into a RawArticle."""
        try:
            article_url = event.get("url", "")
            if not article_url:
                return None

            published_ts = event.get("timestamp")
            if published_ts:
                published_at = datetime.fromtimestamp(
                    published_ts / 1000, tz=timezone.utc
                )
            else:
                published_at = datetime.now(tz=timezone.utc)

            return RawArticle(
                id=event.get("id", str(uuid.uuid4())),
                title=event.get("title", ""),
                url=article_url,
                source=NewsSource.POLYGON,
                publisher=event.get("publisher", {}).get("name", ""),
                tickers=event.get("tickers", []),
                published_at=published_at,
                keywords=event.get("keywords", []),
            )
        except Exception as exc:
            log_sync = get_logger(__name__)
            asyncio.get_event_loop().call_soon(
                lambda: None
            )  # keep sync fallback minimal
            return None
