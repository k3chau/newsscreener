"""WebSocket endpoint for real-time article streaming."""

import asyncio

import orjson
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from config import settings
from src.logging import get_logger
from src.redis_pubsub import RedisSubscriber

log = get_logger(__name__)

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        await log.ainfo("ws_client_connected", total_clients=len(self.active_connections))

    def disconnect(self, websocket: WebSocket) -> None:
        try:
            self.active_connections.remove(websocket)
        except ValueError:
            pass

    async def broadcast(self, message: dict) -> None:
        """Broadcast message to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


@router.websocket("/ws/articles")
async def websocket_articles(websocket: WebSocket):
    """WebSocket endpoint for real-time enriched article streaming."""
    await manager.connect(websocket)

    try:
        # Keep connection alive and send ping/pong
        while True:
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await log.ainfo(
            "ws_client_disconnected", total_clients=len(manager.active_connections)
        )


async def broadcast_articles_from_redis():
    """Background task: subscribe to Redis and broadcast to WebSocket clients."""
    subscriber = RedisSubscriber()
    await subscriber.connect([settings.redis_channel_scored])

    await log.ainfo("ws_broadcaster_started")

    async for channel, raw_data in subscriber.listen():
        if not manager.active_connections:
            continue

        # Parse and broadcast enriched article
        try:
            article_dict = orjson.loads(orjson.dumps(raw_data, default=str))
            await manager.broadcast(
                {
                    "type": "article",
                    "data": article_dict,
                }
            )
        except Exception as exc:
            await log.aerror("ws_broadcast_error", error=str(exc))
