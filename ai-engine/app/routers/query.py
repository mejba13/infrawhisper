from fastapi import APIRouter, Depends, HTTPException
from app.models.query import QueryRequest, QueryResponse
from app.services.query_engine import QueryEngine
from app.llm.client import ClaudeClient
from app.utils.clickhouse import get_clickhouse_client, ClickHouseClient

router = APIRouter(prefix="/query", tags=["query"])


def get_query_engine(
    ch: ClickHouseClient = Depends(get_clickhouse_client),
) -> QueryEngine:
    return QueryEngine(ClaudeClient(), ch)


@router.post("", response_model=QueryResponse)
async def natural_language_query(
    request: QueryRequest,
    engine: QueryEngine = Depends(get_query_engine),
) -> QueryResponse:
    try:
        return await engine.run(request)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Query failed: {e}")
