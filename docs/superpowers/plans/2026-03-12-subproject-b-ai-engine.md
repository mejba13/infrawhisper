# InfraWhisper Sub-project B: Python AI Engine Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Python FastAPI AI engine that powers InfraWhisper's incident analysis, natural language infrastructure queries, and cost optimization recommendations using the Claude API.

**Architecture:** A FastAPI service exposing four endpoints (`/analyze`, `/query`, `/optimize`, `/health`) backed by three AI service classes that call the Claude API (claude-sonnet-4-20250514) with structured JSON outputs. The query engine translates natural language to ClickHouse SQL via a two-step LLM call: schema-aware SQL generation followed by result summarization. All Claude calls use `anthropic` Python SDK with async httpx.

**Tech Stack:** Python 3.12, FastAPI, uvicorn, pydantic v2, pydantic-settings, anthropic SDK, asyncio, clickhouse-driver (async), pytest, pytest-asyncio

---

## File Structure

```
ai-engine/
├── Dockerfile
├── pyproject.toml
├── app/
│   ├── main.py                    # FastAPI app + lifespan
│   ├── config.py                  # pydantic-settings config
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── analyze.py             # POST /analyze
│   │   ├── query.py               # POST /query
│   │   ├── optimize.py            # POST /optimize
│   │   └── health.py              # GET /health, GET /ready
│   ├── services/
│   │   ├── __init__.py
│   │   ├── incident_analyzer.py   # Multi-signal incident correlation
│   │   ├── query_engine.py        # NL → ClickHouse SQL → summary
│   │   └── cost_optimizer.py      # Resource analysis + recommendations
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── client.py              # Claude API async wrapper
│   │   ├── prompts.py             # Prompt templates
│   │   └── structured_output.py   # JSON schema response validation
│   ├── models/
│   │   ├── __init__.py
│   │   ├── incident.py            # Incident request/response models
│   │   ├── query.py               # Query request/response models
│   │   └── cost.py                # Cost recommendation models
│   └── utils/
│       ├── __init__.py
│       ├── clickhouse.py          # Async ClickHouse client
│       └── sql_generator.py       # Safe SQL generation helpers
└── tests/
    ├── conftest.py
    ├── test_analyzer.py
    ├── test_query_engine.py
    └── test_cost_optimizer.py
```

---

## Chunk 1: Project Setup & Config

### Task 1: pyproject.toml, Dockerfile, config

**Files:**
- Create: `ai-engine/pyproject.toml`
- Create: `ai-engine/Dockerfile`
- Create: `ai-engine/app/config.py`
- Create: `ai-engine/app/__init__.py`

- [ ] **Step 1: Create `ai-engine/pyproject.toml`**

```toml
[project]
name = "infrawhisper-ai-engine"
version = "0.1.0"
description = "InfraWhisper AI Engine - Claude-powered infrastructure analysis"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "pydantic>=2.10.0",
    "pydantic-settings>=2.7.0",
    "anthropic>=0.40.0",
    "clickhouse-driver>=0.2.9",
    "httpx>=0.28.0",
    "python-dotenv>=1.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.24.0",
    "pytest-mock>=3.14.0",
    "httpx>=0.28.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.hatch.build.targets.wheel]
packages = ["app"]
```

- [ ] **Step 2: Create `ai-engine/app/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Server
    port: int = 8001
    env: str = "development"

    # Claude API
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-20250514"
    claude_max_tokens: int = 4096

    # ClickHouse
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 9000
    clickhouse_database: str = "infrawhisper"
    clickhouse_user: str = "default"
    clickhouse_password: str = ""

    # Go API
    api_url: str = "http://localhost:8080"


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 3: Create `ai-engine/app/__init__.py`** (empty)

```python
```

- [ ] **Step 4: Create `ai-engine/Dockerfile`**

```dockerfile
FROM python:3.12-slim AS builder

WORKDIR /app
RUN pip install --no-cache-dir uv

COPY pyproject.toml .
RUN uv pip install --system --no-cache -r pyproject.toml

FROM python:3.12-slim

WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY --from=builder /usr/local/bin /usr/local/bin
COPY app/ ./app/

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

- [ ] **Step 5: Install dependencies in ai-engine/**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper/ai-engine"
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

- [ ] **Step 6: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add ai-engine/
git commit -m "feat(ai-engine): project setup, pyproject.toml, config, Dockerfile"
```

---

## Chunk 2: Data Models

### Task 2: Pydantic request/response models

**Files:**
- Create: `ai-engine/app/models/__init__.py`
- Create: `ai-engine/app/models/incident.py`
- Create: `ai-engine/app/models/query.py`
- Create: `ai-engine/app/models/cost.py`

- [ ] **Step 1: Create `ai-engine/app/models/__init__.py`** (empty)

- [ ] **Step 2: Create `ai-engine/app/models/incident.py`**

```python
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
    signals: dict[str, Any] = Field(
        description="Multi-signal data: metrics anomalies, log errors, recent events"
    )
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
```

- [ ] **Step 3: Create `ai-engine/app/models/query.py`**

```python
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
```

- [ ] **Step 4: Create `ai-engine/app/models/cost.py`**

```python
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
```

- [ ] **Step 5: Commit**

```bash
git add ai-engine/app/models/
git commit -m "feat(ai-engine): pydantic request/response models"
```

---

## Chunk 3: LLM Client & Prompts

### Task 3: Claude API wrapper and prompt templates

**Files:**
- Create: `ai-engine/app/llm/__init__.py`
- Create: `ai-engine/app/llm/client.py`
- Create: `ai-engine/app/llm/prompts.py`
- Create: `ai-engine/app/llm/structured_output.py`

- [ ] **Step 1: Create `ai-engine/app/llm/__init__.py`** (empty)

- [ ] **Step 2: Create `ai-engine/app/llm/client.py`**

```python
import json
import anthropic
from app.config import get_settings


class ClaudeClient:
    """Async wrapper around the Anthropic Claude API."""

    def __init__(self) -> None:
        settings = get_settings()
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self._model = settings.claude_model
        self._max_tokens = settings.claude_max_tokens

    async def complete(self, system: str, user: str) -> str:
        """Send a prompt and return the text response."""
        message = await self._client.messages.create(
            model=self._model,
            max_tokens=self._max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return message.content[0].text

    async def complete_json(self, system: str, user: str) -> dict:
        """Send a prompt expecting JSON response. Returns parsed dict."""
        # Append JSON instruction to system prompt
        json_system = (
            system
            + "\n\nIMPORTANT: Your response MUST be valid JSON only. "
            "Do not include markdown, code fences, or any text outside the JSON object."
        )
        text = await self.complete(json_system, user)
        # Strip markdown code fences if present
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1])
        return json.loads(text)
```

- [ ] **Step 3: Create `ai-engine/app/llm/prompts.py`**

```python
"""Prompt templates for each AI use case."""

INCIDENT_ANALYZER_SYSTEM = """You are an expert Kubernetes site reliability engineer analyzing infrastructure incidents.
You will be given multi-signal telemetry data (metrics anomalies, error logs, events) and must identify root causes.

Always respond with a JSON object matching this exact schema:
{
  "incident_title": "Brief descriptive title",
  "severity": "critical|high|warning|info",
  "root_causes": [
    {
      "component": "service or component name",
      "description": "what went wrong",
      "confidence": 0.0-1.0
    }
  ],
  "ai_summary": "2-3 sentence executive summary of what happened and why",
  "remediation_steps": [
    {
      "order": 1,
      "action": "human-readable action",
      "command": "kubectl command or null",
      "expected_outcome": "what this fixes"
    }
  ],
  "related_services": ["list of affected services"],
  "estimated_impact": "user-facing impact description",
  "confidence_score": 0.0-1.0
}"""

INCIDENT_ANALYZER_USER = """Analyze this Kubernetes infrastructure incident:

Cluster: {cluster_id}
Time window: last {context_window_minutes} minutes

Signals:
{signals_json}

Identify root causes, assess severity, and provide actionable remediation steps."""


QUERY_ENGINE_SQL_SYSTEM = """You are a ClickHouse SQL expert for Kubernetes observability data.
Generate a single ClickHouse SQL query to answer the user's question.

Available tables in database `infrawhisper`:
- metrics(timestamp DateTime64(3), cluster_id String, tenant_id String, namespace String, pod String, node String, container String, metric_name String, metric_value Float64, labels Map(String,String))
- logs(timestamp DateTime64(3), cluster_id String, tenant_id String, namespace String, pod String, container String, severity String, body String, trace_id String, attributes Map(String,String))
- traces(timestamp DateTime64(3), cluster_id String, tenant_id String, trace_id String, span_id String, operation_name String, service_name String, duration_ms Float64, status_code UInt8)
- costs(date Date, cluster_id String, tenant_id String, namespace String, workload String, resource_type String, requested Float64, used Float64, cost_usd Float64)

Rules:
- ALWAYS filter by cluster_id = '{cluster_id}' AND tenant_id = '{tenant_id}'
- ALWAYS filter by time range using timestamp >= now() - INTERVAL {hours} HOUR
- Use LIMIT 100 unless aggregating
- Return ONLY the SQL query, nothing else"""

QUERY_ENGINE_SQL_USER = """Question: {question}

Generate the ClickHouse SQL query."""


QUERY_ENGINE_SUMMARY_SYSTEM = """You are a helpful Kubernetes infrastructure assistant.
Summarize query results in plain English. Be concise and actionable.
Focus on insights, anomalies, and recommendations.
If the data is empty, say so clearly."""

QUERY_ENGINE_SUMMARY_USER = """Question: {question}

Query executed: {sql}

Results ({row_count} rows):
{results_json}

Provide a clear, concise answer to the question based on this data."""


COST_OPTIMIZER_SYSTEM = """You are a Kubernetes cost optimization expert.
Analyze resource utilization data and generate right-sizing recommendations.

Always respond with a JSON object matching this exact schema:
{
  "total_estimated_monthly_savings_usd": 0.0,
  "recommendations": [
    {
      "namespace": "string",
      "workload": "string",
      "resource_type": "cpu|memory|storage",
      "current_request": 0.0,
      "recommended_request": 0.0,
      "current_limit": 0.0,
      "recommended_limit": 0.0,
      "waste_percentage": 0.0,
      "estimated_monthly_savings_usd": 0.0,
      "reason": "explanation"
    }
  ],
  "summary": "2-3 sentence executive summary",
  "top_offenders": ["workload1", "workload2"]
}

Be conservative: recommend at least 20% buffer above p95 usage.
Only flag workloads where waste_percentage > 30%."""

COST_OPTIMIZER_USER = """Analyze Kubernetes resource utilization for cost optimization:

Cluster: {cluster_id}
Namespace filter: {namespace}
Analysis period: last {days} days

Cost and utilization data:
{cost_data_json}

Identify over-provisioned workloads and generate right-sizing recommendations."""
```

- [ ] **Step 4: Create `ai-engine/app/llm/structured_output.py`**

```python
"""Validates and coerces Claude JSON responses to pydantic models."""
from typing import TypeVar, Type
from pydantic import BaseModel, ValidationError
import json

T = TypeVar("T", bound=BaseModel)


def parse_response(data: dict, model: Type[T]) -> T:
    """Parse and validate a dict into a pydantic model, with helpful errors."""
    try:
        return model.model_validate(data)
    except ValidationError as e:
        raise ValueError(f"Claude response did not match expected schema: {e}") from e


def safe_json_loads(text: str) -> dict:
    """Load JSON, stripping markdown code fences if present."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]).strip()
    return json.loads(text)
```

- [ ] **Step 5: Commit**

```bash
git add ai-engine/app/llm/
git commit -m "feat(ai-engine): Claude API client and prompt templates"
```

---

## Chunk 4: ClickHouse Utility

### Task 4: Async ClickHouse client and SQL generator

**Files:**
- Create: `ai-engine/app/utils/__init__.py`
- Create: `ai-engine/app/utils/clickhouse.py`
- Create: `ai-engine/app/utils/sql_generator.py`

- [ ] **Step 1: Create `ai-engine/app/utils/__init__.py`** (empty)

- [ ] **Step 2: Create `ai-engine/app/utils/clickhouse.py`**

```python
"""Async ClickHouse client wrapper."""
import asyncio
from typing import Any
from functools import lru_cache
from clickhouse_driver import Client
from app.config import get_settings


class ClickHouseClient:
    """Thread-safe synchronous ClickHouse client run in an executor for async use."""

    def __init__(self) -> None:
        settings = get_settings()
        self._settings = settings

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
        """Execute a query and return rows as list of dicts."""
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
```

- [ ] **Step 3: Create `ai-engine/app/utils/sql_generator.py`**

```python
"""Safe SQL generation helpers — prevents injection in dynamic queries."""
import re


# Allowlist of valid ClickHouse table names for infrawhisper
VALID_TABLES = frozenset({"metrics", "logs", "traces", "costs"})

# Allowlist of valid metric names pattern
_SAFE_IDENTIFIER = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_\.]*$')


def validate_identifier(value: str, name: str = "value") -> str:
    """Raise ValueError if value is not a safe SQL identifier."""
    if not _SAFE_IDENTIFIER.match(value):
        raise ValueError(f"Unsafe SQL identifier for {name}: {value!r}")
    return value


def validate_table(table: str) -> str:
    """Ensure table name is in the allowlist."""
    if table not in VALID_TABLES:
        raise ValueError(f"Unknown table: {table!r}. Must be one of {VALID_TABLES}")
    return table


def build_time_filter(hours: int) -> str:
    """Return a safe time filter clause."""
    if not 1 <= hours <= 168:
        raise ValueError(f"hours must be 1-168, got {hours}")
    return f"timestamp >= now() - INTERVAL {hours} HOUR"


def sanitize_sql(sql: str) -> str:
    """
    Basic SQL sanitization: reject obviously dangerous patterns.
    The LLM-generated SQL still runs in a read-only ClickHouse context,
    but we add a defense layer.
    """
    sql_upper = sql.upper().strip()
    dangerous = ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "CREATE", "TRUNCATE", "GRANT", "REVOKE"]
    for keyword in dangerous:
        if re.search(rf'\b{keyword}\b', sql_upper):
            raise ValueError(f"Dangerous SQL keyword detected: {keyword}")
    return sql
```

- [ ] **Step 4: Commit**

```bash
git add ai-engine/app/utils/
git commit -m "feat(ai-engine): ClickHouse async client and SQL sanitization"
```

---

## Chunk 5: AI Services

### Task 5: Incident analyzer service

**Files:**
- Create: `ai-engine/app/services/__init__.py`
- Create: `ai-engine/app/services/incident_analyzer.py`

- [ ] **Step 1: Create `ai-engine/app/services/__init__.py`** (empty)

- [ ] **Step 2: Create `ai-engine/app/services/incident_analyzer.py`**

```python
"""Multi-signal incident correlation and root cause analysis using Claude."""
import json
from app.llm.client import ClaudeClient
from app.llm.prompts import INCIDENT_ANALYZER_SYSTEM, INCIDENT_ANALYZER_USER
from app.llm.structured_output import parse_response
from app.models.incident import AnalyzeRequest, AnalyzeResponse


class IncidentAnalyzer:
    def __init__(self, claude: ClaudeClient) -> None:
        self._claude = claude

    async def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse:
        user_prompt = INCIDENT_ANALYZER_USER.format(
            cluster_id=request.cluster_id,
            context_window_minutes=request.context_window_minutes,
            signals_json=json.dumps(request.signals, indent=2),
        )
        raw = await self._claude.complete_json(
            system=INCIDENT_ANALYZER_SYSTEM,
            user=user_prompt,
        )
        return parse_response(raw, AnalyzeResponse)
```

### Task 6: Query engine service

**Files:**
- Create: `ai-engine/app/services/query_engine.py`

- [ ] **Step 1: Create `ai-engine/app/services/query_engine.py`**

```python
"""Natural language → ClickHouse SQL → plain-English answer pipeline."""
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
        # Step 1: Generate SQL from natural language
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

        # Step 2: Sanitize and execute
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

        # Step 3: Summarize results
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
```

### Task 7: Cost optimizer service

**Files:**
- Create: `ai-engine/app/services/cost_optimizer.py`

- [ ] **Step 1: Create `ai-engine/app/services/cost_optimizer.py`**

```python
"""Resource utilization analysis and right-sizing recommendations using Claude."""
import json
from app.llm.client import ClaudeClient
from app.llm.prompts import COST_OPTIMIZER_SYSTEM, COST_OPTIMIZER_USER
from app.llm.structured_output import parse_response
from app.models.cost import OptimizeRequest, OptimizeResponse
from app.utils.clickhouse import ClickHouseClient


class CostOptimizer:
    def __init__(self, claude: ClaudeClient, ch: ClickHouseClient) -> None:
        self._claude = claude
        self._ch = ch

    async def optimize(self, request: OptimizeRequest) -> OptimizeResponse:
        # Fetch cost + utilization data from ClickHouse
        namespace_filter = ""
        if request.namespace:
            namespace_filter = f"AND namespace = '{request.namespace}'"

        query = f"""
            SELECT
                namespace,
                workload,
                resource_type,
                avg(requested) AS avg_requested,
                avg(used) AS avg_used,
                sum(cost_usd) AS total_cost_usd,
                (1 - avg(used) / nullIf(avg(requested), 0)) * 100 AS waste_pct
            FROM infrawhisper.costs
            WHERE cluster_id = '{request.cluster_id}'
              AND tenant_id = '{request.tenant_id}'
              {namespace_filter}
              AND date >= today() - INTERVAL {request.time_range_days} DAY
            GROUP BY namespace, workload, resource_type
            HAVING waste_pct > 30
            ORDER BY total_cost_usd DESC
            LIMIT 50
        """
        rows = await self._ch.execute(query)

        if not rows:
            return OptimizeResponse(
                total_estimated_monthly_savings_usd=0.0,
                recommendations=[],
                summary="No significant cost optimization opportunities found in the selected time range.",
                top_offenders=[],
            )

        user_prompt = COST_OPTIMIZER_USER.format(
            cluster_id=request.cluster_id,
            namespace=request.namespace or "all",
            days=request.time_range_days,
            cost_data_json=json.dumps(rows, indent=2, default=str),
        )
        raw = await self._claude.complete_json(
            system=COST_OPTIMIZER_SYSTEM,
            user=user_prompt,
        )
        return parse_response(raw, OptimizeResponse)
```

- [ ] **Step 2: Commit**

```bash
git add ai-engine/app/services/
git commit -m "feat(ai-engine): incident analyzer, query engine, cost optimizer services"
```

---

## Chunk 6: FastAPI Routers & App

### Task 8: Routers and main FastAPI app

**Files:**
- Create: `ai-engine/app/routers/__init__.py`
- Create: `ai-engine/app/routers/health.py`
- Create: `ai-engine/app/routers/analyze.py`
- Create: `ai-engine/app/routers/query.py`
- Create: `ai-engine/app/routers/optimize.py`
- Create: `ai-engine/app/main.py`

- [ ] **Step 1: Create `ai-engine/app/routers/__init__.py`** (empty)

- [ ] **Step 2: Create `ai-engine/app/routers/health.py`**

```python
from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@router.get("/ready")
async def ready() -> dict:
    return {"status": "ready"}
```

- [ ] **Step 3: Create `ai-engine/app/routers/analyze.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from app.models.incident import AnalyzeRequest, AnalyzeResponse
from app.services.incident_analyzer import IncidentAnalyzer
from app.llm.client import ClaudeClient
from app.config import get_settings

router = APIRouter(prefix="/analyze", tags=["analyze"])


def get_analyzer() -> IncidentAnalyzer:
    return IncidentAnalyzer(ClaudeClient())


@router.post("", response_model=AnalyzeResponse)
async def analyze_incident(
    request: AnalyzeRequest,
    analyzer: IncidentAnalyzer = Depends(get_analyzer),
) -> AnalyzeResponse:
    try:
        return await analyzer.analyze(request)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {e}")
```

- [ ] **Step 4: Create `ai-engine/app/routers/query.py`**

```python
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
```

- [ ] **Step 5: Create `ai-engine/app/routers/optimize.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from app.models.cost import OptimizeRequest, OptimizeResponse
from app.services.cost_optimizer import CostOptimizer
from app.llm.client import ClaudeClient
from app.utils.clickhouse import get_clickhouse_client, ClickHouseClient

router = APIRouter(prefix="/optimize", tags=["optimize"])


def get_optimizer(
    ch: ClickHouseClient = Depends(get_clickhouse_client),
) -> CostOptimizer:
    return CostOptimizer(ClaudeClient(), ch)


@router.post("", response_model=OptimizeResponse)
async def optimize_costs(
    request: OptimizeRequest,
    optimizer: CostOptimizer = Depends(get_optimizer),
) -> OptimizeResponse:
    try:
        return await optimizer.optimize(request)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Optimization failed: {e}")
```

- [ ] **Step 6: Create `ai-engine/app/main.py`**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.config import get_settings
from app.routers import health, analyze, query, optimize


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    print(f"InfraWhisper AI Engine starting — model: {settings.claude_model}")
    yield
    print("AI Engine shutting down")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="InfraWhisper AI Engine",
        description="Claude-powered Kubernetes infrastructure analysis",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(health.router)
    app.include_router(analyze.router)
    app.include_router(query.router)
    app.include_router(optimize.router)
    return app


app = create_app()
```

- [ ] **Step 7: Verify the app starts (without real API key)**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper/ai-engine"
source .venv/bin/activate
python -c "from app.main import app; print('App created OK:', app.title)"
```

Expected: `App created OK: InfraWhisper AI Engine`

- [ ] **Step 8: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add ai-engine/app/routers/ ai-engine/app/main.py
git commit -m "feat(ai-engine): FastAPI routers and main app wiring"
```

---

## Chunk 7: Tests

### Task 9: Test suite

**Files:**
- Create: `ai-engine/tests/conftest.py`
- Create: `ai-engine/tests/test_analyzer.py`
- Create: `ai-engine/tests/test_query_engine.py`
- Create: `ai-engine/tests/test_cost_optimizer.py`

- [ ] **Step 1: Create `ai-engine/tests/conftest.py`**

```python
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
```

- [ ] **Step 2: Create `ai-engine/tests/test_analyzer.py`**

```python
import pytest
from app.services.incident_analyzer import IncidentAnalyzer
from app.models.incident import AnalyzeRequest


MOCK_ANALYSIS = {
    "incident_title": "OOMKilled pods in payment-service",
    "severity": "high",
    "root_causes": [
        {
            "component": "payment-service",
            "description": "Memory limit too low for traffic spike",
            "confidence": 0.92,
        }
    ],
    "ai_summary": "The payment-service pods are being OOMKilled due to insufficient memory limits.",
    "remediation_steps": [
        {
            "order": 1,
            "action": "Increase memory limit",
            "command": "kubectl set resources deployment/payment-service --limits=memory=512Mi",
            "expected_outcome": "Pods stabilize",
        }
    ],
    "related_services": ["payment-service", "order-service"],
    "estimated_impact": "Checkout failures for ~15% of users",
    "confidence_score": 0.88,
}


@pytest.mark.asyncio
async def test_analyze_returns_structured_response(mock_claude):
    mock_claude.complete_json.return_value = MOCK_ANALYSIS
    analyzer = IncidentAnalyzer(mock_claude)

    request = AnalyzeRequest(
        cluster_id="cluster-1",
        tenant_id="tenant-1",
        signals={"oom_events": 5, "error_rate": 0.45},
    )
    response = await analyzer.analyze(request)

    assert response.incident_title == "OOMKilled pods in payment-service"
    assert response.severity == "high"
    assert len(response.root_causes) == 1
    assert response.confidence_score == 0.88
    mock_claude.complete_json.assert_called_once()


@pytest.mark.asyncio
async def test_analyze_includes_cluster_in_prompt(mock_claude):
    mock_claude.complete_json.return_value = MOCK_ANALYSIS
    analyzer = IncidentAnalyzer(mock_claude)

    request = AnalyzeRequest(
        cluster_id="prod-cluster",
        tenant_id="tenant-abc",
        signals={"cpu_spike": True},
    )
    await analyzer.analyze(request)

    call_args = mock_claude.complete_json.call_args
    user_prompt = call_args[1]["user"] if call_args[1] else call_args[0][1]
    assert "prod-cluster" in user_prompt
```

- [ ] **Step 3: Create `ai-engine/tests/test_query_engine.py`**

```python
import pytest
from app.services.query_engine import QueryEngine
from app.models.query import QueryRequest


@pytest.mark.asyncio
async def test_query_returns_answer(mock_claude, mock_ch):
    mock_claude.complete.side_effect = [
        "SELECT avg(metric_value) FROM infrawhisper.metrics WHERE cluster_id = 'c1'",
        "Average CPU usage is 45% over the last hour.",
    ]
    mock_ch.execute.return_value = [{"avg_cpu": 0.45}]

    engine = QueryEngine(mock_claude, mock_ch)
    request = QueryRequest(
        query="What is the average CPU usage?",
        cluster_id="c1",
        tenant_id="t1",
    )
    response = await engine.run(request)

    assert "45%" in response.answer or response.answer != ""
    assert response.sql_used is not None
    assert response.data_points == 1


@pytest.mark.asyncio
async def test_query_handles_sql_error_gracefully(mock_claude, mock_ch):
    mock_claude.complete.return_value = "SELECT * FROM infrawhisper.metrics"
    mock_ch.execute.side_effect = Exception("Connection refused")

    engine = QueryEngine(mock_claude, mock_ch)
    request = QueryRequest(
        query="Show me all metrics",
        cluster_id="c1",
        tenant_id="t1",
    )
    response = await engine.run(request)

    assert response.confidence == 0.0
    assert "couldn't execute" in response.answer.lower()


@pytest.mark.asyncio
async def test_query_rejects_dangerous_sql(mock_claude, mock_ch):
    mock_claude.complete.return_value = "DROP TABLE infrawhisper.metrics"

    engine = QueryEngine(mock_claude, mock_ch)
    request = QueryRequest(
        query="Delete all data",
        cluster_id="c1",
        tenant_id="t1",
    )
    response = await engine.run(request)

    assert response.confidence == 0.0
    mock_ch.execute.assert_not_called()
```

- [ ] **Step 4: Create `ai-engine/tests/test_cost_optimizer.py`**

```python
import pytest
from app.services.cost_optimizer import CostOptimizer
from app.models.cost import OptimizeRequest


MOCK_COST_ROWS = [
    {
        "namespace": "production",
        "workload": "api-server",
        "resource_type": "memory",
        "avg_requested": 1024.0,
        "avg_used": 256.0,
        "total_cost_usd": 45.0,
        "waste_pct": 75.0,
    }
]

MOCK_OPTIMIZE_RESPONSE = {
    "total_estimated_monthly_savings_usd": 33.75,
    "recommendations": [
        {
            "namespace": "production",
            "workload": "api-server",
            "resource_type": "memory",
            "current_request": 1024.0,
            "recommended_request": 320.0,
            "current_limit": None,
            "recommended_limit": 400.0,
            "waste_percentage": 75.0,
            "estimated_monthly_savings_usd": 33.75,
            "reason": "Memory usage consistently below 25% of request",
        }
    ],
    "summary": "api-server is significantly over-provisioned for memory.",
    "top_offenders": ["api-server"],
}


@pytest.mark.asyncio
async def test_optimize_returns_recommendations(mock_claude, mock_ch):
    mock_ch.execute.return_value = MOCK_COST_ROWS
    mock_claude.complete_json.return_value = MOCK_OPTIMIZE_RESPONSE

    optimizer = CostOptimizer(mock_claude, mock_ch)
    request = OptimizeRequest(cluster_id="c1", tenant_id="t1")
    response = await optimizer.optimize(request)

    assert response.total_estimated_monthly_savings_usd == 33.75
    assert len(response.recommendations) == 1
    assert response.recommendations[0].workload == "api-server"


@pytest.mark.asyncio
async def test_optimize_returns_empty_when_no_waste(mock_claude, mock_ch):
    mock_ch.execute.return_value = []

    optimizer = CostOptimizer(mock_claude, mock_ch)
    request = OptimizeRequest(cluster_id="c1", tenant_id="t1")
    response = await optimizer.optimize(request)

    assert response.total_estimated_monthly_savings_usd == 0.0
    assert response.recommendations == []
    mock_claude.complete_json.assert_not_called()
```

- [ ] **Step 5: Run all tests**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper/ai-engine"
source .venv/bin/activate
pytest tests/ -v
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add ai-engine/tests/
git commit -m "feat(ai-engine): test suite for analyzer, query engine, cost optimizer"
```

---

## Chunk 8: Integration & docker-compose update

### Task 10: Wire ai-engine into docker-compose and update CLAUDE.md

**Files:**
- Modify: `docker-compose.yml` — add ai-engine service
- Modify: `CLAUDE.md` — add ai-engine section

- [ ] **Step 1: Add ai-engine service to `docker-compose.yml`**

Add this service block after the `kafka` service:

```yaml
  ai-engine:
    build:
      context: ./ai-engine
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    environment:
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      CLICKHOUSE_HOST: clickhouse
      CLICKHOUSE_PORT: 9000
      CLICKHOUSE_DATABASE: infrawhisper
      API_URL: http://api-server:8080
    depends_on:
      clickhouse:
        condition: service_healthy
    restart: unless-stopped
```

- [ ] **Step 2: Verify docker-compose is valid**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
docker compose config --quiet && echo "docker-compose OK"
```

Expected: `docker-compose OK`

- [ ] **Step 3: Run final test suite one more time**

```bash
cd ai-engine && source .venv/bin/activate && pytest tests/ -v --tb=short
```

Expected: All tests pass.

- [ ] **Step 4: Commit everything**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add docker-compose.yml CLAUDE.md
git commit -m "feat(ai-engine): wire into docker-compose, final integration"
```

---

## Next Sub-projects

- **Sub-project C** — Next.js 14 Dashboard (`dashboard/`)
- **Sub-project D** — Helm charts, Dockerfiles, GitHub Actions CI/CD
