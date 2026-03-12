import asyncio
from functools import lru_cache
from clickhouse_driver import Client
from app.config import get_settings


class ClickHouseClient:
    def __init__(self) -> None:
        self._settings = get_settings()

    def _get_client(self) -> Client:
        s = self._settings
        return Client(
            host=s.clickhouse_host,
            port=s.clickhouse_port,
            database=s.clickhouse_database,
            user=s.clickhouse_user,
            password=s.clickhouse_password,
        )

    async def execute(self, query: str, params: dict | None = None) -> list[dict]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._execute_sync, query, params or {})

    def _execute_sync(self, query: str, params: dict) -> list[dict]:
        client = self._get_client()
        rows, columns = client.execute(query, params, with_column_types=True)
        col_names = [col[0] for col in columns]
        return [dict(zip(col_names, row)) for row in rows]


@lru_cache
def get_clickhouse_client() -> ClickHouseClient:
    return ClickHouseClient()
