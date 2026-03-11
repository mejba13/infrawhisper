# InfraWhisper Sub-project A: Go Backend Foundation — Design Spec

> Written: 2026-03-12 | Status: Approved

## Goal

Build the production-grade Go backend monorepo foundation for InfraWhisper: config loading, Postgres + ClickHouse + Redis storage layers, REST API server (chi), WebSocket hub, middleware stack (JWT auth, CORS, rate limiting, structured logging), OTLP collector, Kafka stream processor, and K8s watcher.

## Architecture

The Go backend is a single module (`github.com/infrawhisper/infrawhisper`) containing four binaries (`cmd/api-server`, `cmd/collector`, `cmd/stream-processor`, `cmd/worker`) backed by shared `internal/` packages. Services communicate via Kafka topics; external clients connect via REST or WebSocket. All state lives in Postgres (metadata), ClickHouse (time-series telemetry), and Redis (cache + pub/sub). Dependency injection is used throughout — no package-level globals.

## Tech Stack

- Go 1.22, chi v5, zerolog, viper, sqlc, golang-migrate, gorilla/websocket, confluent-kafka-go, clickhouse-go/v2, pgx/v5, go-redis/v9
- golangci-lint for static analysis

## Decomposition

### Storage layer
- `internal/config/config.go` — Viper-based config with typed structs
- `internal/storage/postgres/client.go` — pgx pool + health check
- `internal/storage/postgres/migrations/` — 4 SQL migration files
- `internal/storage/postgres/clusters.go`, `users.go`, `incidents.go`, `alerts.go`
- `internal/storage/clickhouse/client.go` — clickhouse-go pool
- `internal/storage/clickhouse/migrations/` — 4 SQL migration files
- `internal/storage/clickhouse/metrics.go`, `logs.go`, `traces.go`, `costs.go`
- `internal/storage/redis/client.go`, `cache.go`, `pubsub.go`

### API server
- `internal/api/server.go` — chi router wiring, graceful shutdown
- `internal/api/middleware/auth.go` — JWT parse + RBAC claims injection
- `internal/api/middleware/ratelimit.go` — per-tenant token bucket (redis-backed)
- `internal/api/middleware/cors.go` — configurable CORS
- `internal/api/middleware/logging.go` — zerolog request/response logging
- `internal/api/handlers/` — one file per resource (clusters, pods, metrics, logs, traces, incidents, costs, query, alerts, webhooks, health)
- `internal/api/ws/hub.go` — WebSocket connection manager
- `internal/api/ws/metrics_stream.go`, `logs_stream.go`, `alerts_stream.go`

### Data pipeline
- `internal/collector/receiver.go` — OTLP gRPC receiver
- `internal/collector/processor.go` — K8s metadata enrichment
- `internal/collector/exporter.go` — fan-out to ClickHouse + Kafka
- `internal/collector/sampler.go` — tail-based trace sampling
- `internal/stream/consumer.go`, `producer.go`, `anomaly.go`, `aggregator.go`, `alerteval.go`
- `internal/k8s/watcher.go`, `discovery.go`, `topology.go`

### Entry points
- `cmd/api-server/main.go`
- `cmd/collector/main.go`
- `cmd/stream-processor/main.go`
- `cmd/worker/main.go`

## Data Flow

```
K8s Nodes → Rust Agent → OTLP gRPC → Collector → ClickHouse (raw telemetry)
                                               └→ Kafka (enriched events)
                                                      └→ Stream Processor → anomaly/alert eval
                                                                         └→ Redis pub/sub → WebSocket hub → Dashboard
REST clients → API Server → Postgres (metadata) / ClickHouse (queries) / Redis (cache)
```

## Error Handling

- All handlers return structured JSON errors: `{"error": "message", "code": "ENUM"}` with appropriate HTTP status
- Storage errors wrapped with `fmt.Errorf("context: %w", err)` for stack tracing
- Graceful shutdown: 30s drain on SIGTERM, cancel root context, close all connections

## Testing Strategy

- Unit tests for all handlers using `httptest.NewRecorder`
- Integration tests against real Postgres + ClickHouse + Redis (via Docker Compose in CI)
- Table-driven tests for middleware and stream processing logic
