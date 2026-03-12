import json
from app.llm.client import ClaudeClient
from app.llm.prompts import (
    QUERY_ENGINE_SQL_SYSTEM,
    QUERY_ENGINE_SQL_USER,
    QUERY_ENGINE_SUMMARY_SYSTEM,
    QUERY_ENGINE_SUMMARY_USER,
)
from app.models.query import QueryRequest, QueryResponse
from app.utils.clickhouse import ClickHouseClient
from app.utils.sql_generator import sanitize_sql


class QueryEngine:
    def __init__(self, claude: ClaudeClient, ch: ClickHouseClient) -> None:
        self._claude = claude
        self._ch = ch

    async def run(self, request: QueryRequest) -> QueryResponse:
        sql_system = QUERY_ENGINE_SQL_SYSTEM.format(
            cluster_id=request.cluster_id,
            tenant_id=request.tenant_id,
            hours=request.time_range_hours,
        )
        sql = await self._claude.complete(
            system=sql_system,
            user=QUERY_ENGINE_SQL_USER.format(question=request.query),
        )
        sql = sql.strip().rstrip(";")

        try:
            sanitize_sql(sql)
            rows = await self._ch.execute(sql)
        except Exception as e:
            return QueryResponse(
                answer=f"I couldn't execute that query: {e}",
                sql_used=sql,
                data=None,
                data_points=0,
                confidence=0.0,
            )

        summary = await self._claude.complete(
            system=QUERY_ENGINE_SUMMARY_SYSTEM,
            user=QUERY_ENGINE_SUMMARY_USER.format(
                question=request.query,
                sql=sql,
                row_count=len(rows),
                results_json=json.dumps(rows[:20], indent=2, default=str),
            ),
        )

        return QueryResponse(
            answer=summary,
            sql_used=sql,
            data=rows[:100],
            data_points=len(rows),
            confidence=0.9,
        )
