"""Tests for WebSocket streaming endpoint."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from src.app import app
from src.api.websocket import ConnectionManager


def test_websocket_connection():
    """Test WebSocket connection establishment."""
    client = TestClient(app)

    with client.websocket_connect("/ws/articles") as websocket:
        # Should receive ping after 30s (mocked in test)
        # For now, just verify connection works
        assert websocket is not None


@pytest.mark.asyncio
async def test_connection_manager_connect():
    """Test ConnectionManager connect functionality."""
    manager = ConnectionManager()

    mock_ws = AsyncMock()
    mock_ws.accept = AsyncMock()

    await manager.connect(mock_ws)

    assert len(manager.active_connections) == 1
    mock_ws.accept.assert_called_once()


@pytest.mark.asyncio
async def test_connection_manager_disconnect():
    """Test ConnectionManager disconnect functionality."""
    manager = ConnectionManager()

    mock_ws = AsyncMock()
    mock_ws.accept = AsyncMock()

    await manager.connect(mock_ws)
    manager.disconnect(mock_ws)

    assert len(manager.active_connections) == 0


@pytest.mark.asyncio
async def test_connection_manager_broadcast():
    """Test broadcasting messages to all connections."""
    manager = ConnectionManager()

    # Connect multiple clients
    mock_ws1 = AsyncMock()
    mock_ws1.accept = AsyncMock()
    mock_ws1.send_json = AsyncMock()

    mock_ws2 = AsyncMock()
    mock_ws2.accept = AsyncMock()
    mock_ws2.send_json = AsyncMock()

    await manager.connect(mock_ws1)
    await manager.connect(mock_ws2)

    # Broadcast message
    message = {"type": "article", "data": {"id": "test-1"}}
    await manager.broadcast(message)

    # Both clients should receive
    mock_ws1.send_json.assert_called_once_with(message)
    mock_ws2.send_json.assert_called_once_with(message)


@pytest.mark.asyncio
async def test_connection_manager_broadcast_handles_disconnected():
    """Test that broadcast cleans up disconnected clients."""
    manager = ConnectionManager()

    # Working connection
    mock_ws1 = AsyncMock()
    mock_ws1.accept = AsyncMock()
    mock_ws1.send_json = AsyncMock()

    # Broken connection (raises exception)
    mock_ws2 = AsyncMock()
    mock_ws2.accept = AsyncMock()
    mock_ws2.send_json = AsyncMock(side_effect=Exception("Connection lost"))

    await manager.connect(mock_ws1)
    await manager.connect(mock_ws2)

    assert len(manager.active_connections) == 2

    # Broadcast should remove broken connection
    await manager.broadcast({"type": "test"})

    assert len(manager.active_connections) == 1
    assert mock_ws1 in manager.active_connections
    assert mock_ws2 not in manager.active_connections
