from pydantic import BaseModel, Field
from enum import Enum


class ResourceType(str, Enum):
    cpu = "cpu"
    memory = "memory"
    storage = "storage"


class OptimizeRequest(BaseModel):
    cluster_id: str
    tenant_id: str
    namespace: str | None = None
    time_range_days: int = Field(default=7, ge=1, le=30)


class WorkloadRecommendation(BaseModel):
    namespace: str
    workload: str
    resource_type: ResourceType
    current_request: float
    recommended_request: float
    current_limit: float | None
    recommended_limit: float | None
    waste_percentage: float
    estimated_monthly_savings_usd: float
    reason: str


class OptimizeResponse(BaseModel):
    total_estimated_monthly_savings_usd: float
    recommendations: list[WorkloadRecommendation]
    summary: str
    top_offenders: list[str]
