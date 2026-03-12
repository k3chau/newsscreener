"""Shared test fixtures."""

import pytest


@pytest.fixture
def redis_url():
    """Redis URL for tests. Uses DB 15 to avoid collisions."""
    return "redis://localhost:6379/15"
