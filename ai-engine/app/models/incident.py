from pydantic import BaseModel, Field
from typing import Any
from enum import Enum


class Severity(str, Enum):
    critical = "critical"
    high = "high"
    warning = "warning"
    info = "info"


class AnalyzeRequest(BaseModel):
    cluster_id: str
    tenant_id: str
    signals: dict[str, Any] = Field(description="Multi-signal telemetry data")
    context_window_minutes: int = Field(default=30, ge=1, le=1440)


class RootCause(BaseModel):
    component: str
    description: str
    confidence: float = Field(ge=0.0, le=1.0)


class RemediationStep(BaseModel):
    order: int
    action: str
    command: str | None = None
    expected_outcome: str


class AnalyzeResponse(BaseModel):
    incident_title: str
    severity: Severity
    root_causes: list[RootCause]
    ai_summary: str
    remediation_steps: list[RemediationStep]
    related_services: list[str]
    estimated_impact: str
    confidence_score: float = Field(ge=0.0, le=1.0)
