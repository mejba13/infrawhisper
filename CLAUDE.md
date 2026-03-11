# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**InfraWhisper** — AI-powered Kubernetes infrastructure observability SaaS. Go monorepo with Python AI engine and Next.js dashboard (to be added in sub-projects B–D).

## Go Module

Module: `github.com/infrawhisper/infrawhisper`
Go: 1.23.4+

## Build Commands

```bash
# Build all binaries
make build

# Build individual binary
go build -o bin/api-server ./cmd/api-server/
go build -o bin/collector ./cmd/collector/
go build -o bin/stream-processor ./cmd/stream-processor/

# Run with hot reload (requires air)
make dev

# Run tests
go test ./... -race -cover

# Lint
golangci-lint run ./...

# Tidy dependencies
go mod tidy
```

## Local Dev Setup

```bash
# One-command setup
bash scripts/dev-setup.sh

# Start dependencies
make docker-up

# Start API server
make dev
```

## Architecture

### Binaries (`cmd/`)
- `api-server` — HTTP REST API (chi) + WebSocket hub. Port 8080.
- `collector` — OTLP gRPC receiver (port 4317) → ClickHouse + Kafka
- `stream-processor` — Kafka consumer → anomaly detection + alert evaluation + Redis pub/sub

### Internal Packages (`internal/`)
- `config/` — Viper config loading from env vars / .env file
- `auth/` — JWT sign/verify, RBAC role hierarchy, context helpers
- `api/server.go` — chi router wiring, graceful shutdown
- `api/handlers/` — REST handlers (one file per resource)
- `api/middleware/` — auth, CORS, rate limit, request logging
- `api/ws/` — WebSocket hub backed by Redis pub/sub
- `collector/` — OTLP receiver, processor, Kafka exporter, tail sampler
- `stream/` — Kafka consumer/producer, Welford anomaly detector, metric aggregator, alert evaluator
- `storage/postgres/` — pgx pool, golang-migrate, CRUD for clusters/incidents/alerts/users
- `storage/clickhouse/` — batch insert + query for metrics/logs/traces/costs
- `storage/redis/` — cache get/set/del, pub/sub

### Data Flow
```
K8s Nodes → Rust Agent → OTLP gRPC → collector → ClickHouse (raw)
                                               └→ Kafka → stream-processor → anomaly/alert
                                                                           └→ Redis pub/sub → WebSocket → Dashboard
REST clients → api-server → Postgres (metadata) / ClickHouse (queries) / Redis (cache)
```

### Storage
- **Postgres** — clusters, tenants, users, incidents, alert_rules, alert_events
- **ClickHouse** — metrics (30d TTL), logs (7d TTL), traces (7d TTL), costs
- **Redis** — query cache, real-time pub/sub for WebSocket feeds
- **Kafka** — topics: `infrawhisper.metrics`, `infrawhisper.logs`, `infrawhisper.traces`

## Conventions
- Dependency injection throughout — no global state
- All errors wrapped with `fmt.Errorf("context: %w", err)`
- Handlers return `{"error": "message"}` JSON with appropriate HTTP status
- Tenant isolation enforced at every storage query
- Context propagated to all storage calls for cancellation/tracing
