import pytest
from unittest.mock import AsyncMock, MagicMock
from app.llm.client import ClaudeClient
from app.utils.clickhouse import ClickHouseClient


@pytest.fixture
def mock_claude() -> ClaudeClient:
    client = MagicMock(spec=ClaudeClient)
    client.complete = AsyncMock()
    client.complete_json = AsyncMock()
    return client


@pytest.fixture
def mock_ch() -> ClickHouseClient:
    client = MagicMock(spec=ClickHouseClient)
    client.execute = AsyncMock()
    return client
