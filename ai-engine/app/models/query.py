from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(description="Natural language infrastructure query")
    cluster_id: str
    tenant_id: str
    time_range_hours: int = Field(default=1, ge=1, le=168)


class QueryResponse(BaseModel):
    answer: str
    sql_used: str | None = None
    data: list[dict] | None = None
    data_points: int = 0
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
