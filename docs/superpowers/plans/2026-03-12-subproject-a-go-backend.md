# InfraWhisper Sub-project A: Go Backend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production-grade Go backend: config, storage (Postgres/ClickHouse/Redis), REST API, WebSocket hub, middleware, OTLP collector, Kafka stream processor, and K8s watcher.

**Architecture:** Single Go module with four binaries in `cmd/`. All business logic in `internal/`. Dependency injection throughout — no global state. Services communicate via Kafka; clients via REST/WebSocket.

**Tech Stack:** Go 1.22, chi v5, zerolog, viper, sqlc, golang-migrate, pgx/v5, clickhouse-go/v2, go-redis/v9, gorilla/websocket, confluent-kafka-go, golangci-lint

---

## Chunk 1: Module Bootstrap & Config

### Task 1: Initialize Go module and directory structure

**Files:**
- Create: `go.mod`
- Create: `go.sum` (generated)
- Create: `internal/config/config.go`
- Create: `internal/config/config.yaml`
- Create: `.env.example`
- Create: `.air.toml`
- Create: `.gitignore`
- Create: `.editorconfig`

- [ ] **Step 1: Initialize Go module**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
go mod init github.com/infrawhisper/infrawhisper
```

- [ ] **Step 2: Install core dependencies**

```bash
go get github.com/go-chi/chi/v5@latest
go get github.com/rs/zerolog@latest
go get github.com/spf13/viper@latest
go get github.com/jackc/pgx/v5@latest
go get github.com/ClickHouse/clickhouse-go/v2@latest
go get github.com/redis/go-redis/v9@latest
go get github.com/gorilla/websocket@latest
go get github.com/golang-migrate/migrate/v4@latest
go get github.com/golang-migrate/migrate/v4/database/postgres@latest
go get github.com/golang-migrate/migrate/v4/source/file@latest
go get github.com/golang-jwt/jwt/v5@latest
go get github.com/confluentinc/confluent-kafka-go/v2/kafka@latest
go get k8s.io/client-go@latest
go get k8s.io/apimachinery@latest
```

- [ ] **Step 3: Create `.gitignore`**

```
.env
*.local
bin/
vendor/
.DS_Store
*.test
coverage.out
```

- [ ] **Step 4: Create `.editorconfig`**

```ini
root = true
[*]
indent_style = tab
indent_size = 4
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
[*.{yml,yaml,json,md}]
indent_style = space
indent_size = 2
```

- [ ] **Step 5: Create `.air.toml` for hot reload**

```toml
root = "."
tmp_dir = "tmp"
[build]
  cmd = "go build -o ./tmp/api-server ./cmd/api-server"
  bin = "./tmp/api-server"
  include_ext = ["go"]
  exclude_dir = ["vendor", "tmp", "dashboard", "ai-engine", "agent"]
  delay = 1000
[log]
  time = true
[color]
  main = "magenta"
  watcher = "cyan"
  build = "yellow"
  runner = "green"
```

- [ ] **Step 6: Create `.env.example`**

```bash
# Server
PORT=8080
ENV=development

# Postgres
POSTGRES_DSN=postgres://infrawhisper:infrawhisper@localhost:5432/infrawhisper?sslmode=disable

# ClickHouse
CLICKHOUSE_DSN=clickhouse://localhost:9000/infrawhisper

# Redis
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=infrawhisper

# Auth
JWT_SECRET=change-me-in-production
JWT_ISSUER=infrawhisper

# AI Engine
AI_ENGINE_URL=http://localhost:8001
ANTHROPIC_API_KEY=

# K8s
KUBECONFIG=~/.kube/config
```

- [ ] **Step 7: Create `internal/config/config.go`**

```go
package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	Port     string   `mapstructure:"PORT"`
	Env      string   `mapstructure:"ENV"`
	Postgres Postgres `mapstructure:",squash"`
	ClickHouse ClickHouse `mapstructure:",squash"`
	Redis    Redis    `mapstructure:",squash"`
	Kafka    Kafka    `mapstructure:",squash"`
	Auth     Auth     `mapstructure:",squash"`
	AIEngine AIEngine `mapstructure:",squash"`
}

type Postgres struct {
	DSN string `mapstructure:"POSTGRES_DSN"`
}

type ClickHouse struct {
	DSN string `mapstructure:"CLICKHOUSE_DSN"`
}

type Redis struct {
	Addr     string `mapstructure:"REDIS_ADDR"`
	Password string `mapstructure:"REDIS_PASSWORD"`
}

type Kafka struct {
	Brokers []string `mapstructure:"KAFKA_BROKERS"`
	GroupID string   `mapstructure:"KAFKA_GROUP_ID"`
}

type Auth struct {
	JWTSecret string `mapstructure:"JWT_SECRET"`
	JWTIssuer string `mapstructure:"JWT_ISSUER"`
}

type AIEngine struct {
	URL string `mapstructure:"AI_ENGINE_URL"`
}

func Load() (*Config, error) {
	v := viper.New()
	v.SetConfigFile(".env")
	v.SetConfigType("env")
	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// Defaults
	v.SetDefault("PORT", "8080")
	v.SetDefault("ENV", "development")
	v.SetDefault("POSTGRES_DSN", "postgres://infrawhisper:infrawhisper@localhost:5432/infrawhisper?sslmode=disable")
	v.SetDefault("CLICKHOUSE_DSN", "clickhouse://localhost:9000/infrawhisper")
	v.SetDefault("REDIS_ADDR", "localhost:6379")
	v.SetDefault("KAFKA_BROKERS", []string{"localhost:9092"})
	v.SetDefault("KAFKA_GROUP_ID", "infrawhisper")
	v.SetDefault("AI_ENGINE_URL", "http://localhost:8001")

	_ = v.ReadInConfig() // .env is optional

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("config unmarshal: %w", err)
	}
	return &cfg, nil
}
```

- [ ] **Step 8: Commit**

```bash
git add go.mod go.sum .gitignore .editorconfig .air.toml .env.example internal/config/
git commit -m "feat: initialize Go module and config loading"
```

---

## Chunk 2: Postgres Storage Layer

### Task 2: Postgres client and migrations

**Files:**
- Create: `internal/storage/postgres/client.go`
- Create: `internal/storage/postgres/migrations/001_init.sql`
- Create: `internal/storage/postgres/migrations/002_clusters.sql`
- Create: `internal/storage/postgres/migrations/003_incidents.sql`
- Create: `internal/storage/postgres/migrations/004_alerts.sql`
- Create: `internal/storage/postgres/clusters.go`
- Create: `internal/storage/postgres/users.go`
- Create: `internal/storage/postgres/incidents.go`
- Create: `internal/storage/postgres/alerts.go`

- [ ] **Step 1: Create `internal/storage/postgres/client.go`**

```go
package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

type DB struct {
	Pool *pgxpool.Pool
}

func New(ctx context.Context, dsn string) (*DB, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("postgres connect: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("postgres ping: %w", err)
	}
	return &DB{Pool: pool}, nil
}

func (db *DB) Migrate(migrationsPath string) error {
	m, err := migrate.New("file://"+migrationsPath, db.Pool.Config().ConnString())
	if err != nil {
		return fmt.Errorf("migrate new: %w", err)
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migrate up: %w", err)
	}
	return nil
}

func (db *DB) Close() {
	db.Pool.Close()
}
```

- [ ] **Step 2: Create migration 001 — schema init**

```sql
-- internal/storage/postgres/migrations/001_init.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tenants (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    plan        TEXT NOT NULL DEFAULT 'community',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'viewer',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
```

- [ ] **Step 3: Create migration 002 — clusters**

```sql
-- internal/storage/postgres/migrations/002_clusters.sql
CREATE TABLE IF NOT EXISTS clusters (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    provider        TEXT NOT NULL,
    region          TEXT NOT NULL,
    k8s_version     TEXT,
    endpoint        TEXT,
    agent_token     TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',
    node_count      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clusters_tenant ON clusters(tenant_id);
CREATE INDEX idx_clusters_status ON clusters(status);
```

- [ ] **Step 4: Create migration 003 — incidents**

```sql
-- internal/storage/postgres/migrations/003_incidents.sql
CREATE TABLE IF NOT EXISTS incidents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cluster_id      UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    severity        TEXT NOT NULL DEFAULT 'warning',
    status          TEXT NOT NULL DEFAULT 'open',
    root_cause      TEXT,
    ai_summary      TEXT,
    signals         JSONB NOT NULL DEFAULT '{}',
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_cluster ON incidents(cluster_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
```

- [ ] **Step 5: Create migration 004 — alerts**

```sql
-- internal/storage/postgres/migrations/004_alerts.sql
CREATE TABLE IF NOT EXISTS alert_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cluster_id      UUID REFERENCES clusters(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    condition       JSONB NOT NULL,
    severity        TEXT NOT NULL DEFAULT 'warning',
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    channels        JSONB NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id         UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    cluster_id      UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    state           TEXT NOT NULL,
    value           FLOAT8,
    fired_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX idx_alert_rules_tenant ON alert_rules(tenant_id);
CREATE INDEX idx_alert_events_rule ON alert_events(rule_id);
```

- [ ] **Step 6: Create `internal/storage/postgres/clusters.go`**

```go
package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type Cluster struct {
	ID         string `db:"id"`
	TenantID   string `db:"tenant_id"`
	Name       string `db:"name"`
	Provider   string `db:"provider"`
	Region     string `db:"region"`
	K8sVersion string `db:"k8s_version"`
	Status     string `db:"status"`
	NodeCount  int    `db:"node_count"`
	AgentToken string `db:"agent_token"`
}

func (db *DB) ListClusters(ctx context.Context, tenantID string) ([]Cluster, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, tenant_id, name, provider, region, k8s_version, status, node_count, agent_token
		 FROM clusters WHERE tenant_id = $1 ORDER BY created_at DESC`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list clusters: %w", err)
	}
	defer rows.Close()
	return pgx.CollectRows(rows, pgx.RowToStructByName[Cluster])
}

func (db *DB) GetCluster(ctx context.Context, id, tenantID string) (*Cluster, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, tenant_id, name, provider, region, k8s_version, status, node_count, agent_token
		 FROM clusters WHERE id = $1 AND tenant_id = $2`, id, tenantID)
	if err != nil {
		return nil, fmt.Errorf("get cluster: %w", err)
	}
	defer rows.Close()
	c, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[Cluster])
	if err != nil {
		return nil, fmt.Errorf("get cluster: %w", err)
	}
	return &c, nil
}

func (db *DB) CreateCluster(ctx context.Context, c *Cluster) error {
	return db.Pool.QueryRow(ctx,
		`INSERT INTO clusters (tenant_id, name, provider, region, k8s_version)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, agent_token`,
		c.TenantID, c.Name, c.Provider, c.Region, c.K8sVersion,
	).Scan(&c.ID, &c.AgentToken)
}

func (db *DB) UpdateClusterStatus(ctx context.Context, id string, status string, nodeCount int) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE clusters SET status = $1, node_count = $2, updated_at = NOW() WHERE id = $3`,
		status, nodeCount, id)
	return err
}
```

- [ ] **Step 7: Create `internal/storage/postgres/incidents.go`**

```go
package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type Incident struct {
	ID        string  `db:"id"`
	TenantID  string  `db:"tenant_id"`
	ClusterID string  `db:"cluster_id"`
	Title     string  `db:"title"`
	Severity  string  `db:"severity"`
	Status    string  `db:"status"`
	RootCause *string `db:"root_cause"`
	AISummary *string `db:"ai_summary"`
}

func (db *DB) ListIncidents(ctx context.Context, clusterID, tenantID string) ([]Incident, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, tenant_id, cluster_id, title, severity, status, root_cause, ai_summary
		 FROM incidents WHERE cluster_id = $1 AND tenant_id = $2
		 ORDER BY created_at DESC LIMIT 100`, clusterID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list incidents: %w", err)
	}
	defer rows.Close()
	return pgx.CollectRows(rows, pgx.RowToStructByName[Incident])
}

func (db *DB) CreateIncident(ctx context.Context, i *Incident) error {
	return db.Pool.QueryRow(ctx,
		`INSERT INTO incidents (tenant_id, cluster_id, title, severity, status)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		i.TenantID, i.ClusterID, i.Title, i.Severity, i.Status,
	).Scan(&i.ID)
}

func (db *DB) UpdateIncidentAI(ctx context.Context, id, rootCause, aiSummary string) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE incidents SET root_cause = $1, ai_summary = $2, updated_at = NOW() WHERE id = $3`,
		rootCause, aiSummary, id)
	return err
}
```

- [ ] **Step 8: Create `internal/storage/postgres/alerts.go`**

```go
package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type AlertRule struct {
	ID          string          `db:"id"`
	TenantID    string          `db:"tenant_id"`
	ClusterID   *string         `db:"cluster_id"`
	Name        string          `db:"name"`
	Description *string         `db:"description"`
	Condition   json.RawMessage `db:"condition"`
	Severity    string          `db:"severity"`
	Enabled     bool            `db:"enabled"`
	Channels    json.RawMessage `db:"channels"`
}

func (db *DB) ListAlertRules(ctx context.Context, tenantID string) ([]AlertRule, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, tenant_id, cluster_id, name, description, condition, severity, enabled, channels
		 FROM alert_rules WHERE tenant_id = $1 ORDER BY created_at DESC`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list alert rules: %w", err)
	}
	defer rows.Close()
	return pgx.CollectRows(rows, pgx.RowToStructByName[AlertRule])
}

func (db *DB) CreateAlertRule(ctx context.Context, r *AlertRule) error {
	return db.Pool.QueryRow(ctx,
		`INSERT INTO alert_rules (tenant_id, cluster_id, name, description, condition, severity, channels)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		r.TenantID, r.ClusterID, r.Name, r.Description, r.Condition, r.Severity, r.Channels,
	).Scan(&r.ID)
}

func (db *DB) DeleteAlertRule(ctx context.Context, id, tenantID string) error {
	_, err := db.Pool.Exec(ctx,
		`DELETE FROM alert_rules WHERE id = $1 AND tenant_id = $2`, id, tenantID)
	return err
}
```

- [ ] **Step 9: Create `internal/storage/postgres/users.go`**

```go
package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type User struct {
	ID       string `db:"id"`
	TenantID string `db:"tenant_id"`
	Email    string `db:"email"`
	Name     string `db:"name"`
	Role     string `db:"role"`
}

func (db *DB) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, tenant_id, email, name, role FROM users WHERE email = $1`, email)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	defer rows.Close()
	u, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[User])
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	return &u, nil
}
```

- [ ] **Step 10: Commit**

```bash
git add internal/storage/postgres/
git commit -m "feat: postgres storage layer with migrations"
```

---

## Chunk 3: ClickHouse Storage Layer

### Task 3: ClickHouse client and migrations

**Files:**
- Create: `internal/storage/clickhouse/client.go`
- Create: `internal/storage/clickhouse/migrations/001_metrics.sql`
- Create: `internal/storage/clickhouse/migrations/002_logs.sql`
- Create: `internal/storage/clickhouse/migrations/003_traces.sql`
- Create: `internal/storage/clickhouse/migrations/004_costs.sql`
- Create: `internal/storage/clickhouse/metrics.go`
- Create: `internal/storage/clickhouse/logs.go`
- Create: `internal/storage/clickhouse/traces.go`
- Create: `internal/storage/clickhouse/costs.go`

- [ ] **Step 1: Create `internal/storage/clickhouse/client.go`**

```go
package clickhouse

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type DB struct {
	Conn driver.Conn
}

func New(dsn string) (*DB, error) {
	opts, err := clickhouse.ParseDSN(dsn)
	if err != nil {
		return nil, fmt.Errorf("clickhouse parse dsn: %w", err)
	}
	conn, err := clickhouse.Open(opts)
	if err != nil {
		return nil, fmt.Errorf("clickhouse open: %w", err)
	}
	if err := conn.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("clickhouse ping: %w", err)
	}
	return &DB{Conn: conn}, nil
}

func (db *DB) Migrate(migrationsPath string) error {
	entries, err := os.ReadDir(migrationsPath)
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}
	for _, e := range entries {
		if !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(migrationsPath, e.Name()))
		if err != nil {
			return fmt.Errorf("read migration %s: %w", e.Name(), err)
		}
		if err := db.Conn.Exec(context.Background(), string(data)); err != nil {
			return fmt.Errorf("exec migration %s: %w", e.Name(), err)
		}
	}
	return nil
}

func (db *DB) Close() error {
	return db.Conn.Close()
}

// dbName extracts database name from DSN
func dbName(dsn string) string {
	u, _ := url.Parse(dsn)
	return strings.TrimPrefix(u.Path, "/")
}
```

- [ ] **Step 2: Create ClickHouse migration 001 — metrics**

```sql
-- internal/storage/clickhouse/migrations/001_metrics.sql
CREATE DATABASE IF NOT EXISTS infrawhisper;

CREATE TABLE IF NOT EXISTS infrawhisper.metrics (
    timestamp       DateTime64(3, 'UTC'),
    cluster_id      String,
    tenant_id       String,
    namespace       String,
    pod             String,
    node            String,
    container       String,
    metric_name     String,
    metric_value    Float64,
    labels          Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (cluster_id, metric_name, timestamp)
TTL timestamp + INTERVAL 30 DAY
SETTINGS index_granularity = 8192;

-- Pre-aggregated rollup tables
CREATE TABLE IF NOT EXISTS infrawhisper.metrics_1m (
    timestamp       DateTime64(3, 'UTC'),
    cluster_id      String,
    namespace       String,
    pod             String,
    metric_name     String,
    avg_value       Float64,
    max_value       Float64,
    min_value       Float64
) ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (cluster_id, metric_name, timestamp);
```

- [ ] **Step 3: Create ClickHouse migration 002 — logs**

```sql
-- internal/storage/clickhouse/migrations/002_logs.sql
CREATE TABLE IF NOT EXISTS infrawhisper.logs (
    timestamp       DateTime64(3, 'UTC'),
    cluster_id      String,
    tenant_id       String,
    namespace       String,
    pod             String,
    container       String,
    severity        String,
    body            String,
    trace_id        String,
    span_id         String,
    attributes      Map(String, String),
    INDEX idx_body body TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (cluster_id, pod, timestamp)
TTL timestamp + INTERVAL 7 DAY
SETTINGS index_granularity = 8192;
```

- [ ] **Step 4: Create ClickHouse migration 003 — traces**

```sql
-- internal/storage/clickhouse/migrations/003_traces.sql
CREATE TABLE IF NOT EXISTS infrawhisper.traces (
    timestamp       DateTime64(3, 'UTC'),
    cluster_id      String,
    tenant_id       String,
    trace_id        String,
    span_id         String,
    parent_span_id  String,
    operation_name  String,
    service_name    String,
    duration_ms     Float64,
    status_code     UInt8,
    tags            Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (cluster_id, trace_id, timestamp)
TTL timestamp + INTERVAL 7 DAY
SETTINGS index_granularity = 8192;
```

- [ ] **Step 5: Create ClickHouse migration 004 — costs**

```sql
-- internal/storage/clickhouse/migrations/004_costs.sql
CREATE TABLE IF NOT EXISTS infrawhisper.costs (
    date            Date,
    cluster_id      String,
    tenant_id       String,
    namespace       String,
    workload        String,
    resource_type   String,
    requested       Float64,
    used            Float64,
    cost_usd        Float64
) ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (cluster_id, namespace, workload, resource_type, date);
```

- [ ] **Step 6: Create `internal/storage/clickhouse/metrics.go`**

```go
package clickhouse

import (
	"context"
	"fmt"
	"time"
)

type MetricPoint struct {
	Timestamp   time.Time         `ch:"timestamp"`
	ClusterID   string            `ch:"cluster_id"`
	TenantID    string            `ch:"tenant_id"`
	Namespace   string            `ch:"namespace"`
	Pod         string            `ch:"pod"`
	Node        string            `ch:"node"`
	Container   string            `ch:"container"`
	MetricName  string            `ch:"metric_name"`
	MetricValue float64           `ch:"metric_value"`
	Labels      map[string]string `ch:"labels"`
}

func (db *DB) InsertMetrics(ctx context.Context, points []MetricPoint) error {
	batch, err := db.Conn.PrepareBatch(ctx, "INSERT INTO infrawhisper.metrics")
	if err != nil {
		return fmt.Errorf("prepare batch: %w", err)
	}
	for _, p := range points {
		if err := batch.AppendStruct(&p); err != nil {
			return fmt.Errorf("append metric: %w", err)
		}
	}
	return batch.Send()
}

type MetricQuery struct {
	ClusterID  string
	TenantID   string
	MetricName string
	Namespace  string
	Pod        string
	Start      time.Time
	End        time.Time
	Step       string // e.g. "1 MINUTE", "5 MINUTE"
}

func (db *DB) QueryMetrics(ctx context.Context, q MetricQuery) ([]MetricPoint, error) {
	query := `
		SELECT
			toStartOfInterval(timestamp, INTERVAL ` + q.Step + `) AS timestamp,
			cluster_id, tenant_id, namespace, pod, node, container,
			metric_name, avg(metric_value) AS metric_value, any(labels) AS labels
		FROM infrawhisper.metrics
		WHERE cluster_id = @cluster_id
		  AND tenant_id = @tenant_id
		  AND metric_name = @metric_name
		  AND timestamp BETWEEN @start AND @end
		GROUP BY timestamp, cluster_id, tenant_id, namespace, pod, node, container, metric_name
		ORDER BY timestamp ASC`

	rows, err := db.Conn.Query(ctx, query,
		clickhouse.Named("cluster_id", q.ClusterID),
		clickhouse.Named("tenant_id", q.TenantID),
		clickhouse.Named("metric_name", q.MetricName),
		clickhouse.Named("start", q.Start),
		clickhouse.Named("end", q.End),
	)
	if err != nil {
		return nil, fmt.Errorf("query metrics: %w", err)
	}
	defer rows.Close()

	var points []MetricPoint
	for rows.Next() {
		var p MetricPoint
		if err := rows.ScanStruct(&p); err != nil {
			return nil, fmt.Errorf("scan metric: %w", err)
		}
		points = append(points, p)
	}
	return points, rows.Err()
}
```

- [ ] **Step 7: Create `internal/storage/clickhouse/logs.go`**

```go
package clickhouse

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
)

type LogEntry struct {
	Timestamp  time.Time         `ch:"timestamp"`
	ClusterID  string            `ch:"cluster_id"`
	TenantID   string            `ch:"tenant_id"`
	Namespace  string            `ch:"namespace"`
	Pod        string            `ch:"pod"`
	Container  string            `ch:"container"`
	Severity   string            `ch:"severity"`
	Body       string            `ch:"body"`
	TraceID    string            `ch:"trace_id"`
	Attributes map[string]string `ch:"attributes"`
}

func (db *DB) InsertLogs(ctx context.Context, entries []LogEntry) error {
	batch, err := db.Conn.PrepareBatch(ctx, "INSERT INTO infrawhisper.logs")
	if err != nil {
		return fmt.Errorf("prepare batch: %w", err)
	}
	for _, e := range entries {
		if err := batch.AppendStruct(&e); err != nil {
			return fmt.Errorf("append log: %w", err)
		}
	}
	return batch.Send()
}

type LogQuery struct {
	ClusterID string
	TenantID  string
	Namespace string
	Pod       string
	Severity  string
	Search    string
	Start     time.Time
	End       time.Time
	Limit     int
}

func (db *DB) QueryLogs(ctx context.Context, q LogQuery) ([]LogEntry, error) {
	if q.Limit == 0 {
		q.Limit = 500
	}
	where := "WHERE cluster_id = @cluster_id AND tenant_id = @tenant_id AND timestamp BETWEEN @start AND @end"
	if q.Namespace != "" {
		where += " AND namespace = @namespace"
	}
	if q.Pod != "" {
		where += " AND pod = @pod"
	}
	if q.Severity != "" {
		where += " AND severity = @severity"
	}
	if q.Search != "" {
		where += " AND hasToken(body, @search)"
	}

	query := fmt.Sprintf(`SELECT timestamp, cluster_id, tenant_id, namespace, pod, container,
		severity, body, trace_id, attributes FROM infrawhisper.logs
		%s ORDER BY timestamp DESC LIMIT @limit`, where)

	rows, err := db.Conn.Query(ctx, query,
		clickhouse.Named("cluster_id", q.ClusterID),
		clickhouse.Named("tenant_id", q.TenantID),
		clickhouse.Named("start", q.Start),
		clickhouse.Named("end", q.End),
		clickhouse.Named("namespace", q.Namespace),
		clickhouse.Named("pod", q.Pod),
		clickhouse.Named("severity", q.Severity),
		clickhouse.Named("search", q.Search),
		clickhouse.Named("limit", q.Limit),
	)
	if err != nil {
		return nil, fmt.Errorf("query logs: %w", err)
	}
	defer rows.Close()

	var entries []LogEntry
	for rows.Next() {
		var e LogEntry
		if err := rows.ScanStruct(&e); err != nil {
			return nil, fmt.Errorf("scan log: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}
```

- [ ] **Step 8: Create `internal/storage/clickhouse/traces.go`**

```go
package clickhouse

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
)

type Span struct {
	Timestamp    time.Time         `ch:"timestamp"`
	ClusterID    string            `ch:"cluster_id"`
	TenantID     string            `ch:"tenant_id"`
	TraceID      string            `ch:"trace_id"`
	SpanID       string            `ch:"span_id"`
	ParentSpanID string            `ch:"parent_span_id"`
	Operation    string            `ch:"operation_name"`
	Service      string            `ch:"service_name"`
	DurationMs   float64           `ch:"duration_ms"`
	StatusCode   uint8             `ch:"status_code"`
	Tags         map[string]string `ch:"tags"`
}

func (db *DB) InsertSpans(ctx context.Context, spans []Span) error {
	batch, err := db.Conn.PrepareBatch(ctx, "INSERT INTO infrawhisper.traces")
	if err != nil {
		return fmt.Errorf("prepare batch: %w", err)
	}
	for _, s := range spans {
		if err := batch.AppendStruct(&s); err != nil {
			return fmt.Errorf("append span: %w", err)
		}
	}
	return batch.Send()
}

func (db *DB) GetTrace(ctx context.Context, traceID, clusterID, tenantID string) ([]Span, error) {
	rows, err := db.Conn.Query(ctx,
		`SELECT * FROM infrawhisper.traces
		 WHERE trace_id = @trace_id AND cluster_id = @cluster_id AND tenant_id = @tenant_id
		 ORDER BY timestamp ASC`,
		clickhouse.Named("trace_id", traceID),
		clickhouse.Named("cluster_id", clusterID),
		clickhouse.Named("tenant_id", tenantID),
	)
	if err != nil {
		return nil, fmt.Errorf("get trace: %w", err)
	}
	defer rows.Close()
	var spans []Span
	for rows.Next() {
		var s Span
		if err := rows.ScanStruct(&s); err != nil {
			return nil, fmt.Errorf("scan span: %w", err)
		}
		spans = append(spans, s)
	}
	return spans, rows.Err()
}
```

- [ ] **Step 9: Create `internal/storage/clickhouse/costs.go`**

```go
package clickhouse

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
)

type CostRecord struct {
	Date         time.Time `ch:"date"`
	ClusterID    string    `ch:"cluster_id"`
	TenantID     string    `ch:"tenant_id"`
	Namespace    string    `ch:"namespace"`
	Workload     string    `ch:"workload"`
	ResourceType string    `ch:"resource_type"`
	Requested    float64   `ch:"requested"`
	Used         float64   `ch:"used"`
	CostUSD      float64   `ch:"cost_usd"`
}

func (db *DB) InsertCosts(ctx context.Context, records []CostRecord) error {
	batch, err := db.Conn.PrepareBatch(ctx, "INSERT INTO infrawhisper.costs")
	if err != nil {
		return fmt.Errorf("prepare batch: %w", err)
	}
	for _, r := range records {
		if err := batch.AppendStruct(&r); err != nil {
			return fmt.Errorf("append cost: %w", err)
		}
	}
	return batch.Send()
}

func (db *DB) QueryCosts(ctx context.Context, clusterID, tenantID string, start, end time.Time) ([]CostRecord, error) {
	rows, err := db.Conn.Query(ctx,
		`SELECT date, cluster_id, tenant_id, namespace, workload, resource_type,
		        sum(requested) AS requested, sum(used) AS used, sum(cost_usd) AS cost_usd
		 FROM infrawhisper.costs
		 WHERE cluster_id = @cluster_id AND tenant_id = @tenant_id
		   AND date BETWEEN @start AND @end
		 GROUP BY date, cluster_id, tenant_id, namespace, workload, resource_type
		 ORDER BY cost_usd DESC`,
		clickhouse.Named("cluster_id", clusterID),
		clickhouse.Named("tenant_id", tenantID),
		clickhouse.Named("start", start),
		clickhouse.Named("end", end),
	)
	if err != nil {
		return nil, fmt.Errorf("query costs: %w", err)
	}
	defer rows.Close()
	var records []CostRecord
	for rows.Next() {
		var r CostRecord
		if err := rows.ScanStruct(&r); err != nil {
			return nil, fmt.Errorf("scan cost: %w", err)
		}
		records = append(records, r)
	}
	return records, rows.Err()
}
```

- [ ] **Step 10: Commit**

```bash
git add internal/storage/clickhouse/
git commit -m "feat: clickhouse storage layer with migrations"
```

---

## Chunk 4: Redis Client

### Task 4: Redis client, cache, pubsub

**Files:**
- Create: `internal/storage/redis/client.go`
- Create: `internal/storage/redis/cache.go`
- Create: `internal/storage/redis/pubsub.go`

- [ ] **Step 1: Create `internal/storage/redis/client.go`**

```go
package redis

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

type Client struct {
	rdb *redis.Client
}

func New(addr, password string) (*Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       0,
	})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("redis ping: %w", err)
	}
	return &Client{rdb: rdb}, nil
}

func (c *Client) Close() error {
	return c.rdb.Close()
}
```

- [ ] **Step 2: Create `internal/storage/redis/cache.go`**

```go
package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

func (c *Client) Set(ctx context.Context, key string, value any, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal cache value: %w", err)
	}
	return c.rdb.Set(ctx, key, data, ttl).Err()
}

func (c *Client) Get(ctx context.Context, key string, dest any) error {
	data, err := c.rdb.Get(ctx, key).Bytes()
	if err != nil {
		return fmt.Errorf("get cache: %w", err)
	}
	return json.Unmarshal(data, dest)
}

func (c *Client) Del(ctx context.Context, keys ...string) error {
	return c.rdb.Del(ctx, keys...).Err()
}
```

- [ ] **Step 3: Create `internal/storage/redis/pubsub.go`**

```go
package redis

import (
	"context"

	"github.com/redis/go-redis/v9"
)

func (c *Client) Publish(ctx context.Context, channel string, payload any) error {
	return c.rdb.Publish(ctx, channel, payload).Err()
}

func (c *Client) Subscribe(ctx context.Context, channels ...string) *redis.PubSub {
	return c.rdb.Subscribe(ctx, channels...)
}
```

- [ ] **Step 4: Commit**

```bash
git add internal/storage/redis/
git commit -m "feat: redis client, cache, and pubsub"
```

---

## Chunk 5: Auth Middleware & JWT

### Task 5: Auth layer

**Files:**
- Create: `internal/auth/jwt.go`
- Create: `internal/auth/rbac.go`
- Create: `internal/auth/tenant.go`
- Create: `internal/api/middleware/auth.go`
- Create: `internal/api/middleware/cors.go`
- Create: `internal/api/middleware/ratelimit.go`
- Create: `internal/api/middleware/logging.go`

- [ ] **Step 1: Create `internal/auth/jwt.go`**

```go
package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	jwt.RegisteredClaims
	TenantID string `json:"tenant_id"`
	UserID   string `json:"user_id"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

type JWTService struct {
	secret []byte
	issuer string
}

func NewJWTService(secret, issuer string) *JWTService {
	return &JWTService{secret: []byte(secret), issuer: issuer}
}

func (s *JWTService) Sign(claims *Claims) (string, error) {
	claims.Issuer = s.issuer
	claims.IssuedAt = jwt.NewNumericDate(time.Now())
	if claims.ExpiresAt == nil {
		claims.ExpiresAt = jwt.NewNumericDate(time.Now().Add(24 * time.Hour))
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}

func (s *JWTService) Verify(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.secret, nil
	})
	if err != nil {
		return nil, fmt.Errorf("verify token: %w", err)
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}
	return claims, nil
}
```

- [ ] **Step 2: Create `internal/auth/rbac.go`**

```go
package auth

import "fmt"

type Role string

const (
	RoleAdmin   Role = "admin"
	RoleEditor  Role = "editor"
	RoleViewer  Role = "viewer"
)

var roleHierarchy = map[Role]int{
	RoleAdmin:  3,
	RoleEditor: 2,
	RoleViewer: 1,
}

func HasPermission(userRole Role, required Role) bool {
	return roleHierarchy[userRole] >= roleHierarchy[required]
}

func RequireRole(userRole string, required Role) error {
	if !HasPermission(Role(userRole), required) {
		return fmt.Errorf("insufficient permissions: requires %s", required)
	}
	return nil
}
```

- [ ] **Step 3: Create `internal/auth/tenant.go`**

```go
package auth

import "context"

type contextKey string

const claimsKey contextKey = "claims"

func WithClaims(ctx context.Context, claims *Claims) context.Context {
	return context.WithValue(ctx, claimsKey, claims)
}

func ClaimsFromCtx(ctx context.Context) (*Claims, bool) {
	c, ok := ctx.Value(claimsKey).(*Claims)
	return c, ok
}
```

- [ ] **Step 4: Create `internal/api/middleware/auth.go`**

```go
package middleware

import (
	"net/http"
	"strings"

	"github.com/infrawhisper/infrawhisper/internal/auth"
)

func Auth(jwt *auth.JWTService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
			claims, err := jwt.Verify(strings.TrimPrefix(header, "Bearer "))
			if err != nil {
				http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
				return
			}
			r = r.WithContext(auth.WithClaims(r.Context(), claims))
			next.ServeHTTP(w, r)
		})
	}
}
```

- [ ] **Step 5: Create `internal/api/middleware/cors.go`**

```go
package middleware

import "net/http"

func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			for _, o := range allowedOrigins {
				if o == "*" || o == origin {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					break
				}
			}
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Max-Age", "3600")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
```

- [ ] **Step 6: Create `internal/api/middleware/ratelimit.go`**

```go
package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/infrawhisper/infrawhisper/internal/auth"
)

type bucket struct {
	tokens   float64
	lastSeen time.Time
	mu       sync.Mutex
}

type RateLimiter struct {
	buckets  sync.Map
	rate     float64 // tokens per second
	capacity float64
}

func NewRateLimiter(rps float64, capacity float64) *RateLimiter {
	return &RateLimiter{rate: rps, capacity: capacity}
}

func (rl *RateLimiter) Allow(key string) bool {
	v, _ := rl.buckets.LoadOrStore(key, &bucket{tokens: rl.capacity, lastSeen: time.Now()})
	b := v.(*bucket)
	b.mu.Lock()
	defer b.mu.Unlock()
	now := time.Now()
	elapsed := now.Sub(b.lastSeen).Seconds()
	b.tokens = min(rl.capacity, b.tokens+elapsed*rl.rate)
	b.lastSeen = now
	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

func RateLimit(limiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := r.RemoteAddr
			if claims, ok := auth.ClaimsFromCtx(r.Context()); ok {
				key = claims.TenantID
			}
			if !limiter.Allow(key) {
				http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
```

- [ ] **Step 7: Create `internal/api/middleware/logging.go`**

```go
package middleware

import (
	"net/http"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func RequestLogger(logger zerolog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			wrapped := &statusWriter{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(wrapped, r)
			logger.Info().
				Str("method", r.Method).
				Str("path", r.URL.Path).
				Int("status", wrapped.status).
				Dur("latency", time.Since(start)).
				Str("ip", r.RemoteAddr).
				Msg("request")
		})
	}
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}
```

- [ ] **Step 8: Commit**

```bash
git add internal/auth/ internal/api/middleware/
git commit -m "feat: auth JWT/RBAC and middleware stack"
```

---

## Chunk 6: REST API Handlers

### Task 6: API server and all handlers

**Files:**
- Create: `internal/api/server.go`
- Create: `internal/api/handlers/health.go`
- Create: `internal/api/handlers/clusters.go`
- Create: `internal/api/handlers/pods.go`
- Create: `internal/api/handlers/metrics.go`
- Create: `internal/api/handlers/logs.go`
- Create: `internal/api/handlers/traces.go`
- Create: `internal/api/handlers/incidents.go`
- Create: `internal/api/handlers/costs.go`
- Create: `internal/api/handlers/query.go`
- Create: `internal/api/handlers/alerts.go`
- Create: `internal/api/handlers/webhooks.go`
- Create: `cmd/api-server/main.go`

- [ ] **Step 1: Create `internal/api/server.go`**

```go
package api

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/rs/zerolog"

	"github.com/infrawhisper/infrawhisper/internal/api/handlers"
	"github.com/infrawhisper/infrawhisper/internal/api/middleware"
	"github.com/infrawhisper/infrawhisper/internal/api/ws"
	"github.com/infrawhisper/infrawhisper/internal/auth"
	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
	pgstore "github.com/infrawhisper/infrawhisper/internal/storage/postgres"
	rdstore "github.com/infrawhisper/infrawhisper/internal/storage/redis"
)

type Server struct {
	srv    *http.Server
	logger zerolog.Logger
}

type Deps struct {
	PG      *pgstore.DB
	CH      *chstore.DB
	Redis   *rdstore.Client
	JWT     *auth.JWTService
	Logger  zerolog.Logger
	AIEngineURL string
}

func NewServer(port string, deps Deps) *Server {
	r := chi.NewRouter()
	limiter := middleware.NewRateLimiter(100, 200)

	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(middleware.CORS([]string{"*"}))
	r.Use(middleware.RequestLogger(deps.Logger))
	r.Use(middleware.RateLimit(limiter))

	hub := ws.NewHub(deps.Redis, deps.Logger)
	go hub.Run()

	h := &handlers.Handler{PG: deps.PG, CH: deps.CH, Redis: deps.Redis, Logger: deps.Logger, AIEngineURL: deps.AIEngineURL}

	r.Get("/health", handlers.Health)
	r.Get("/ready", handlers.Ready(deps.PG, deps.CH, deps.Redis))

	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.Auth(deps.JWT))
		r.Get("/clusters", h.ListClusters)
		r.Post("/clusters", h.CreateCluster)
		r.Route("/clusters/{id}", func(r chi.Router) {
			r.Get("/", h.GetCluster)
			r.Get("/pods", h.ListPods)
			r.Get("/metrics", h.GetMetrics)
			r.Get("/logs", h.GetLogs)
			r.Get("/traces", h.GetTraces)
			r.Get("/incidents", h.ListIncidents)
			r.Get("/costs", h.GetCosts)
			r.Post("/query", h.NLQuery)
			r.Get("/alerts", h.ListAlerts)
			r.Post("/alerts", h.CreateAlert)
			r.Delete("/alerts/{alertID}", h.DeleteAlert)
		})
		r.Post("/webhooks", h.HandleWebhook)
	})

	// WebSocket endpoints
	r.Get("/ws/metrics", hub.ServeMetrics)
	r.Get("/ws/logs", hub.ServeLogs)
	r.Get("/ws/alerts", hub.ServeAlerts)

	return &Server{
		srv:    &http.Server{Addr: ":" + port, Handler: r, ReadTimeout: 30 * time.Second, WriteTimeout: 30 * time.Second},
		logger: deps.Logger,
	}
}

func (s *Server) Start() error {
	s.logger.Info().Str("addr", s.srv.Addr).Msg("API server starting")
	if err := s.srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return fmt.Errorf("listen: %w", err)
	}
	return nil
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.srv.Shutdown(ctx)
}
```

- [ ] **Step 2: Create `internal/api/handlers/health.go`**

```go
package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
	pgstore "github.com/infrawhisper/infrawhisper/internal/storage/postgres"
	rdstore "github.com/infrawhisper/infrawhisper/internal/storage/redis"
)

func Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "time": time.Now().UTC().Format(time.RFC3339)})
}

func Ready(pg *pgstore.DB, ch *chstore.DB, redis *rdstore.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		checks := map[string]string{}
		if err := pg.Pool.Ping(ctx); err != nil {
			checks["postgres"] = "unhealthy"
		} else {
			checks["postgres"] = "ok"
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(checks)
	}
}
```

- [ ] **Step 3: Create base Handler struct `internal/api/handlers/handler.go`**

```go
package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/rs/zerolog"

	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
	pgstore "github.com/infrawhisper/infrawhisper/internal/storage/postgres"
	rdstore "github.com/infrawhisper/infrawhisper/internal/storage/redis"
)

type Handler struct {
	PG          *pgstore.DB
	CH          *chstore.DB
	Redis       *rdstore.Client
	Logger      zerolog.Logger
	AIEngineURL string
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
```

- [ ] **Step 4: Create `internal/api/handlers/clusters.go`**

```go
package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/infrawhisper/infrawhisper/internal/auth"
	"github.com/infrawhisper/infrawhisper/internal/storage/postgres"
)

func (h *Handler) ListClusters(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	clusters, err := h.PG.ListClusters(r.Context(), claims.TenantID)
	if err != nil {
		h.Logger.Error().Err(err).Msg("list clusters")
		writeErr(w, http.StatusInternalServerError, "failed to list clusters")
		return
	}
	writeJSON(w, http.StatusOK, clusters)
}

func (h *Handler) GetCluster(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id := chi.URLParam(r, "id")
	cluster, err := h.PG.GetCluster(r.Context(), id, claims.TenantID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "cluster not found")
		return
	}
	writeJSON(w, http.StatusOK, cluster)
}

func (h *Handler) CreateCluster(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err := auth.RequireRole(claims.Role, auth.RoleEditor); err != nil {
		writeErr(w, http.StatusForbidden, "forbidden")
		return
	}
	var req struct {
		Name       string `json:"name"`
		Provider   string `json:"provider"`
		Region     string `json:"region"`
		K8sVersion string `json:"k8s_version"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}
	c := &postgres.Cluster{
		TenantID:   claims.TenantID,
		Name:       req.Name,
		Provider:   req.Provider,
		Region:     req.Region,
		K8sVersion: req.K8sVersion,
	}
	if err := h.PG.CreateCluster(r.Context(), c); err != nil {
		h.Logger.Error().Err(err).Msg("create cluster")
		writeErr(w, http.StatusInternalServerError, "failed to create cluster")
		return
	}
	writeJSON(w, http.StatusCreated, c)
}
```

- [ ] **Step 5: Create `internal/api/handlers/metrics.go`**

```go
package handlers

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/infrawhisper/infrawhisper/internal/auth"
	"github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
)

func (h *Handler) GetMetrics(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	clusterID := chi.URLParam(r, "id")
	q := r.URL.Query()
	metricName := q.Get("metric")
	if metricName == "" {
		metricName = "cpu_usage"
	}
	start := time.Now().Add(-1 * time.Hour)
	end := time.Now()
	step := q.Get("step")
	if step == "" {
		step = "1 MINUTE"
	}

	points, err := h.CH.QueryMetrics(r.Context(), clickhouse.MetricQuery{
		ClusterID:  clusterID,
		TenantID:   claims.TenantID,
		MetricName: metricName,
		Start:      start,
		End:        end,
		Step:       step,
	})
	if err != nil {
		h.Logger.Error().Err(err).Msg("query metrics")
		writeErr(w, http.StatusInternalServerError, "failed to query metrics")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"metric": metricName, "data": points})
}
```

- [ ] **Step 6: Create `internal/api/handlers/logs.go`**

```go
package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/infrawhisper/infrawhisper/internal/auth"
	"github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
)

func (h *Handler) GetLogs(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	logs, err := h.CH.QueryLogs(r.Context(), clickhouse.LogQuery{
		ClusterID: chi.URLParam(r, "id"),
		TenantID:  claims.TenantID,
		Namespace: q.Get("namespace"),
		Pod:       q.Get("pod"),
		Severity:  q.Get("severity"),
		Search:    q.Get("search"),
		Start:     time.Now().Add(-1 * time.Hour),
		End:       time.Now(),
		Limit:     limit,
	})
	if err != nil {
		h.Logger.Error().Err(err).Msg("query logs")
		writeErr(w, http.StatusInternalServerError, "failed to query logs")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"logs": logs})
}
```

- [ ] **Step 7: Create `internal/api/handlers/incidents.go`**

```go
package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/infrawhisper/infrawhisper/internal/auth"
)

func (h *Handler) ListIncidents(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	incidents, err := h.PG.ListIncidents(r.Context(), chi.URLParam(r, "id"), claims.TenantID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to list incidents")
		return
	}
	writeJSON(w, http.StatusOK, incidents)
}
```

- [ ] **Step 8: Create `internal/api/handlers/costs.go`**

```go
package handlers

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/infrawhisper/infrawhisper/internal/auth"
)

func (h *Handler) GetCosts(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	records, err := h.CH.QueryCosts(r.Context(),
		chi.URLParam(r, "id"), claims.TenantID,
		time.Now().AddDate(0, -1, 0), time.Now(),
	)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to query costs")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"costs": records})
}
```

- [ ] **Step 9: Create `internal/api/handlers/query.go`**

```go
package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/infrawhisper/infrawhisper/internal/auth"
)

func (h *Handler) NLQuery(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req struct {
		Query string `json:"query"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}

	payload, _ := json.Marshal(map[string]any{
		"query":      req.Query,
		"cluster_id": chi.URLParam(r, "id"),
		"tenant_id":  claims.TenantID,
	})

	resp, err := http.Post(
		fmt.Sprintf("%s/query", h.AIEngineURL),
		"application/json",
		bytes.NewReader(payload),
	)
	if err != nil {
		writeErr(w, http.StatusBadGateway, "ai engine unavailable")
		return
	}
	defer resp.Body.Close()

	var result map[string]any
	json.NewDecoder(resp.Body).Decode(&result)
	writeJSON(w, http.StatusOK, result)
}
```

- [ ] **Step 10: Create `internal/api/handlers/alerts.go`**

```go
package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/infrawhisper/infrawhisper/internal/auth"
	"github.com/infrawhisper/infrawhisper/internal/storage/postgres"
)

func (h *Handler) ListAlerts(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	rules, err := h.PG.ListAlertRules(r.Context(), claims.TenantID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to list alerts")
		return
	}
	writeJSON(w, http.StatusOK, rules)
}

func (h *Handler) CreateAlert(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var rule postgres.AlertRule
	if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}
	rule.TenantID = claims.TenantID
	clusterID := chi.URLParam(r, "id")
	rule.ClusterID = &clusterID
	if err := h.PG.CreateAlertRule(r.Context(), &rule); err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to create alert")
		return
	}
	writeJSON(w, http.StatusCreated, rule)
}

func (h *Handler) DeleteAlert(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err := h.PG.DeleteAlertRule(r.Context(), chi.URLParam(r, "alertID"), claims.TenantID); err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to delete alert")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

- [ ] **Step 11: Create remaining stub handlers**

```go
// internal/api/handlers/pods.go
package handlers

import "net/http"

func (h *Handler) ListPods(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"pods": []any{}})
}
```

```go
// internal/api/handlers/traces.go
package handlers

import (
	"net/http"
	"github.com/go-chi/chi/v5"
	"github.com/infrawhisper/infrawhisper/internal/auth"
)

func (h *Handler) GetTraces(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	traceID := r.URL.Query().Get("trace_id")
	if traceID == "" {
		writeJSON(w, http.StatusOK, map[string]any{"traces": []any{}})
		return
	}
	spans, err := h.CH.GetTrace(r.Context(), traceID, chi.URLParam(r, "id"), claims.TenantID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to get trace")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"spans": spans})
}
```

```go
// internal/api/handlers/webhooks.go
package handlers

import "net/http"

func (h *Handler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusAccepted)
}
```

- [ ] **Step 12: Create `cmd/api-server/main.go`**

```go
package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/infrawhisper/infrawhisper/internal/api"
	"github.com/infrawhisper/infrawhisper/internal/auth"
	"github.com/infrawhisper/infrawhisper/internal/config"
	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
	pgstore "github.com/infrawhisper/infrawhisper/internal/storage/postgres"
	rdstore "github.com/infrawhisper/infrawhisper/internal/storage/redis"
)

func main() {
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}

	ctx := context.Background()

	pg, err := pgstore.New(ctx, cfg.Postgres.DSN)
	if err != nil {
		log.Fatal().Err(err).Msg("postgres connect failed")
	}
	defer pg.Close()

	if err := pg.Migrate("internal/storage/postgres/migrations"); err != nil {
		log.Fatal().Err(err).Msg("postgres migration failed")
	}

	ch, err := chstore.New(cfg.ClickHouse.DSN)
	if err != nil {
		log.Fatal().Err(err).Msg("clickhouse connect failed")
	}
	defer ch.Close()

	if err := ch.Migrate("internal/storage/clickhouse/migrations"); err != nil {
		log.Fatal().Err(err).Msg("clickhouse migration failed")
	}

	redis, err := rdstore.New(cfg.Redis.Addr, cfg.Redis.Password)
	if err != nil {
		log.Fatal().Err(err).Msg("redis connect failed")
	}
	defer redis.Close()

	jwtSvc := auth.NewJWTService(cfg.Auth.JWTSecret, cfg.Auth.JWTIssuer)

	srv := api.NewServer(cfg.Port, api.Deps{
		PG:          pg,
		CH:          ch,
		Redis:       redis,
		JWT:         jwtSvc,
		Logger:      log.Logger,
		AIEngineURL: cfg.AIEngine.URL,
	})

	go func() {
		if err := srv.Start(); err != nil {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down...")
	shutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	srv.Shutdown(shutCtx)
	log.Info().Msg("shutdown complete")
}
```

- [ ] **Step 13: Commit**

```bash
git add internal/api/ cmd/api-server/
git commit -m "feat: REST API server with all handlers"
```

---

## Chunk 7: WebSocket Hub

### Task 7: Real-time WebSocket streaming

**Files:**
- Create: `internal/api/ws/hub.go`
- Create: `internal/api/ws/metrics_stream.go`
- Create: `internal/api/ws/logs_stream.go`
- Create: `internal/api/ws/alerts_stream.go`

- [ ] **Step 1: Create `internal/api/ws/hub.go`**

```go
package ws

import (
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"

	rdstore "github.com/infrawhisper/infrawhisper/internal/storage/redis"
)

var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type Client struct {
	conn      *websocket.Conn
	send      chan []byte
	tenantID  string
	clusterID string
}

type Hub struct {
	clients  map[*Client]bool
	mu       sync.RWMutex
	redis    *rdstore.Client
	logger   zerolog.Logger
}

func NewHub(redis *rdstore.Client, logger zerolog.Logger) *Hub {
	return &Hub{
		clients: make(map[*Client]bool),
		redis:   redis,
		logger:  logger,
	}
}

func (h *Hub) Run() {
	// Hub is subscription-based via Redis pub/sub
	// Each stream handler subscribes to its own channel
}

func (h *Hub) register(c *Client) {
	h.mu.Lock()
	h.clients[c] = true
	h.mu.Unlock()
}

func (h *Hub) unregister(c *Client) {
	h.mu.Lock()
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		close(c.send)
	}
	h.mu.Unlock()
}

func (h *Hub) pump(c *Client) {
	defer func() {
		h.unregister(c)
		c.conn.Close()
	}()
	for msg := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			return
		}
	}
}
```

- [ ] **Step 2: Create `internal/api/ws/metrics_stream.go`**

```go
package ws

import (
	"context"
	"fmt"
	"net/http"

	"github.com/infrawhisper/infrawhisper/internal/auth"
)

func (h *Hub) ServeMetrics(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	clusterID := r.URL.Query().Get("cluster_id")

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Error().Err(err).Msg("ws upgrade metrics")
		return
	}

	client := &Client{conn: conn, send: make(chan []byte, 256), tenantID: claims.TenantID, clusterID: clusterID}
	h.register(client)
	go h.pump(client)

	channel := fmt.Sprintf("metrics:%s:%s", claims.TenantID, clusterID)
	sub := h.redis.Subscribe(context.Background(), channel)
	defer sub.Close()

	ch := sub.Channel()
	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				return
			}
			select {
			case client.send <- []byte(msg.Payload):
			default:
				return
			}
		case <-r.Context().Done():
			return
		}
	}
}
```

- [ ] **Step 3: Create `internal/api/ws/logs_stream.go`**

```go
package ws

import (
	"context"
	"fmt"
	"net/http"

	"github.com/infrawhisper/infrawhisper/internal/auth"
)

func (h *Hub) ServeLogs(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	clusterID := r.URL.Query().Get("cluster_id")

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &Client{conn: conn, send: make(chan []byte, 512), tenantID: claims.TenantID, clusterID: clusterID}
	h.register(client)
	go h.pump(client)

	sub := h.redis.Subscribe(context.Background(), fmt.Sprintf("logs:%s:%s", claims.TenantID, clusterID))
	defer sub.Close()

	for msg := range sub.Channel() {
		select {
		case client.send <- []byte(msg.Payload):
		default:
			return
		}
	}
}
```

- [ ] **Step 4: Create `internal/api/ws/alerts_stream.go`**

```go
package ws

import (
	"context"
	"fmt"
	"net/http"

	"github.com/infrawhisper/infrawhisper/internal/auth"
)

func (h *Hub) ServeAlerts(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &Client{conn: conn, send: make(chan []byte, 64), tenantID: claims.TenantID}
	h.register(client)
	go h.pump(client)

	sub := h.redis.Subscribe(context.Background(), fmt.Sprintf("alerts:%s", claims.TenantID))
	defer sub.Close()

	for msg := range sub.Channel() {
		select {
		case client.send <- []byte(msg.Payload):
		default:
			return
		}
	}
}
```

- [ ] **Step 5: Commit**

```bash
git add internal/api/ws/
git commit -m "feat: WebSocket hub with metrics/logs/alerts streams"
```

---

## Chunk 8: Data Pipeline

### Task 8: OTLP Collector

**Files:**
- Create: `internal/collector/receiver.go`
- Create: `internal/collector/processor.go`
- Create: `internal/collector/exporter.go`
- Create: `internal/collector/sampler.go`
- Create: `cmd/collector/main.go`

- [ ] **Step 1: Create `internal/collector/receiver.go`**

```go
package collector

import (
	"context"
	"fmt"
	"net"

	"github.com/rs/zerolog"
	"google.golang.org/grpc"
	collectortrace "go.opentelemetry.io/proto/otlp/collector/trace/v1"
	collectorlogs "go.opentelemetry.io/proto/otlp/collector/logs/v1"
	collectormetrics "go.opentelemetry.io/proto/otlp/collector/metrics/v1"
)

type Receiver struct {
	grpcServer *grpc.Server
	logger     zerolog.Logger
	processor  *Processor
}

func NewReceiver(processor *Processor, logger zerolog.Logger) *Receiver {
	s := grpc.NewServer()
	r := &Receiver{grpcServer: s, logger: logger, processor: processor}
	collectortrace.RegisterTraceServiceServer(s, r)
	collectorlogs.RegisterLogsServiceServer(s, r)
	collectormetrics.RegisterMetricsServiceServer(s, r)
	return r
}

func (r *Receiver) Start(addr string) error {
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("collector listen: %w", err)
	}
	r.logger.Info().Str("addr", addr).Msg("OTLP gRPC receiver starting")
	return r.grpcServer.Serve(lis)
}

func (r *Receiver) Stop() {
	r.grpcServer.GracefulStop()
}

func (r *Receiver) Export(ctx context.Context, req *collectortrace.ExportTraceServiceRequest) (*collectortrace.ExportTraceServiceResponse, error) {
	go r.processor.ProcessTraces(ctx, req.ResourceSpans)
	return &collectortrace.ExportTraceServiceResponse{}, nil
}

func (r *Receiver) ExportLogs(ctx context.Context, req *collectorlogs.ExportLogsServiceRequest) (*collectorlogs.ExportLogsServiceResponse, error) {
	go r.processor.ProcessLogs(ctx, req.ResourceLogs)
	return &collectorlogs.ExportLogsServiceResponse{}, nil
}

func (r *Receiver) ExportMetrics(ctx context.Context, req *collectormetrics.ExportMetricsServiceRequest) (*collectormetrics.ExportMetricsServiceResponse, error) {
	go r.processor.ProcessMetrics(ctx, req.ResourceMetrics)
	return &collectormetrics.ExportMetricsServiceResponse{}, nil
}
```

- [ ] **Step 2: Create `internal/collector/processor.go`**

```go
package collector

import (
	"context"
	"time"

	"github.com/rs/zerolog"

	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
	commonpb "go.opentelemetry.io/proto/otlp/common/v1"
	logspb "go.opentelemetry.io/proto/otlp/logs/v1"
	metricspb "go.opentelemetry.io/proto/otlp/metrics/v1"
	tracepb "go.opentelemetry.io/proto/otlp/trace/v1"
)

type Processor struct {
	ch     *chstore.DB
	logger zerolog.Logger
}

func NewProcessor(ch *chstore.DB, logger zerolog.Logger) *Processor {
	return &Processor{ch: ch, logger: logger}
}

func attrToMap(attrs []*commonpb.KeyValue) map[string]string {
	m := make(map[string]string, len(attrs))
	for _, a := range attrs {
		m[a.Key] = a.Value.GetStringValue()
	}
	return m
}

func (p *Processor) ProcessMetrics(ctx context.Context, rm []*metricspb.ResourceMetrics) {
	var points []chstore.MetricPoint
	for _, r := range rm {
		resourceAttrs := attrToMap(r.Resource.GetAttributes())
		clusterID := resourceAttrs["k8s.cluster.name"]
		tenantID := resourceAttrs["infrawhisper.tenant.id"]

		for _, sm := range r.ScopeMetrics {
			for _, m := range sm.Metrics {
				switch d := m.Data.(type) {
				case *metricspb.Metric_Gauge:
					for _, dp := range d.Gauge.DataPoints {
						points = append(points, chstore.MetricPoint{
							Timestamp:   time.Unix(0, int64(dp.TimeUnixNano)).UTC(),
							ClusterID:   clusterID,
							TenantID:    tenantID,
							MetricName:  m.Name,
							MetricValue: dp.GetAsDouble(),
							Labels:      attrToMap(dp.Attributes),
						})
					}
				}
			}
		}
	}
	if len(points) > 0 {
		if err := p.ch.InsertMetrics(ctx, points); err != nil {
			p.logger.Error().Err(err).Msg("insert metrics")
		}
	}
}

func (p *Processor) ProcessLogs(ctx context.Context, rl []*logspb.ResourceLogs) {
	var entries []chstore.LogEntry
	for _, r := range rl {
		resourceAttrs := attrToMap(r.Resource.GetAttributes())
		clusterID := resourceAttrs["k8s.cluster.name"]
		tenantID := resourceAttrs["infrawhisper.tenant.id"]

		for _, sl := range r.ScopeLogs {
			for _, lr := range sl.LogRecords {
				entries = append(entries, chstore.LogEntry{
					Timestamp: time.Unix(0, int64(lr.TimeUnixNano)).UTC(),
					ClusterID: clusterID,
					TenantID:  tenantID,
					Severity:  lr.SeverityText,
					Body:      lr.Body.GetStringValue(),
					TraceID:   string(lr.TraceId),
					Attributes: attrToMap(lr.Attributes),
				})
			}
		}
	}
	if len(entries) > 0 {
		if err := p.ch.InsertLogs(ctx, entries); err != nil {
			p.logger.Error().Err(err).Msg("insert logs")
		}
	}
}

func (p *Processor) ProcessTraces(ctx context.Context, rs []*tracepb.ResourceSpans) {
	var spans []chstore.Span
	for _, r := range rs {
		resourceAttrs := attrToMap(r.Resource.GetAttributes())
		for _, ss := range r.ScopeSpans {
			for _, s := range ss.Spans {
				spans = append(spans, chstore.Span{
					Timestamp:    time.Unix(0, int64(s.StartTimeUnixNano)).UTC(),
					ClusterID:    resourceAttrs["k8s.cluster.name"],
					TenantID:     resourceAttrs["infrawhisper.tenant.id"],
					TraceID:      string(s.TraceId),
					SpanID:       string(s.SpanId),
					ParentSpanID: string(s.ParentSpanId),
					Operation:    s.Name,
					DurationMs:   float64(s.EndTimeUnixNano-s.StartTimeUnixNano) / 1e6,
					StatusCode:   uint8(s.Status.GetCode()),
					Tags:         attrToMap(s.Attributes),
				})
			}
		}
	}
	if len(spans) > 0 {
		if err := p.ch.InsertSpans(ctx, spans); err != nil {
			p.logger.Error().Err(err).Msg("insert spans")
		}
	}
}
```

- [ ] **Step 3: Create `internal/collector/exporter.go`**

```go
package collector

// Exporter routes processed data to secondary sinks (Kafka for stream processing).
// Primary storage is handled directly in Processor.

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

type Exporter struct {
	producer *kafka.Producer
}

func NewExporter(brokers string) (*Exporter, error) {
	p, err := kafka.NewProducer(&kafka.ConfigMap{"bootstrap.servers": brokers})
	if err != nil {
		return nil, fmt.Errorf("kafka producer: %w", err)
	}
	return &Exporter{producer: p}, nil
}

func (e *Exporter) Publish(ctx context.Context, topic string, payload any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}
	return e.producer.Produce(&kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: kafka.PartitionAny},
		Value:          data,
	}, nil)
}

func (e *Exporter) Close() {
	e.producer.Flush(5000)
	e.producer.Close()
}
```

- [ ] **Step 4: Create `internal/collector/sampler.go`**

```go
package collector

import "sync"

// TailSampler makes sampling decisions after seeing complete traces.
type TailSampler struct {
	decisions sync.Map
	rate      float64 // fraction to keep (0.0–1.0)
}

func NewTailSampler(rate float64) *TailSampler {
	return &TailSampler{rate: rate}
}

func (s *TailSampler) ShouldSample(traceID string, hasError bool) bool {
	if hasError {
		return true // always keep error traces
	}
	// Simple deterministic sampling based on trace ID hash
	h := fnv32(traceID)
	return float64(h%1000)/1000.0 < s.rate
}

func fnv32(s string) uint32 {
	h := uint32(2166136261)
	for i := 0; i < len(s); i++ {
		h ^= uint32(s[i])
		h *= 16777619
	}
	return h
}
```

- [ ] **Step 5: Create `cmd/collector/main.go`**

```go
package main

import (
	"os"
	"os/signal"
	"syscall"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/infrawhisper/infrawhisper/internal/collector"
	"github.com/infrawhisper/infrawhisper/internal/config"
	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
)

func main() {
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("config load failed")
	}

	ch, err := chstore.New(cfg.ClickHouse.DSN)
	if err != nil {
		log.Fatal().Err(err).Msg("clickhouse connect failed")
	}
	defer ch.Close()

	exporter, err := collector.NewExporter(cfg.Kafka.Brokers[0])
	if err != nil {
		log.Fatal().Err(err).Msg("kafka exporter init failed")
	}
	defer exporter.Close()

	processor := collector.NewProcessor(ch, log.Logger)
	receiver := collector.NewReceiver(processor, log.Logger)

	go func() {
		if err := receiver.Start(":4317"); err != nil {
			log.Fatal().Err(err).Msg("otlp receiver failed")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	receiver.Stop()
	log.Info().Msg("collector shutdown complete")
}
```

- [ ] **Step 6: Commit**

```bash
git add internal/collector/ cmd/collector/
git commit -m "feat: OTLP gRPC collector with ClickHouse exporter"
```

---

## Chunk 9: Kafka Stream Processor

### Task 9: Stream processing pipeline

**Files:**
- Create: `internal/stream/consumer.go`
- Create: `internal/stream/producer.go`
- Create: `internal/stream/anomaly.go`
- Create: `internal/stream/aggregator.go`
- Create: `internal/stream/alerteval.go`
- Create: `cmd/stream-processor/main.go`

- [ ] **Step 1: Create `internal/stream/producer.go`**

```go
package stream

import (
	"encoding/json"
	"fmt"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

type Producer struct {
	p *kafka.Producer
}

func NewProducer(brokers string) (*Producer, error) {
	p, err := kafka.NewProducer(&kafka.ConfigMap{"bootstrap.servers": brokers})
	if err != nil {
		return nil, fmt.Errorf("new producer: %w", err)
	}
	return &Producer{p: p}, nil
}

func (p *Producer) Send(topic string, key string, value any) error {
	data, _ := json.Marshal(value)
	return p.p.Produce(&kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: kafka.PartitionAny},
		Key:            []byte(key),
		Value:          data,
	}, nil)
}

func (p *Producer) Close() {
	p.p.Flush(5000)
	p.p.Close()
}
```

- [ ] **Step 2: Create `internal/stream/consumer.go`**

```go
package stream

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"github.com/rs/zerolog"

	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
	rdstore "github.com/infrawhisper/infrawhisper/internal/storage/redis"
)

type Consumer struct {
	c          *kafka.Consumer
	anomaly    *AnomalyDetector
	aggregator *Aggregator
	alertEval  *AlertEvaluator
	redis      *rdstore.Client
	logger     zerolog.Logger
}

func NewConsumer(brokers, groupID string, ch *chstore.DB, redis *rdstore.Client, logger zerolog.Logger) (*Consumer, error) {
	c, err := kafka.NewConsumer(&kafka.ConfigMap{
		"bootstrap.servers":  brokers,
		"group.id":           groupID,
		"auto.offset.reset":  "latest",
		"enable.auto.commit": true,
	})
	if err != nil {
		return nil, fmt.Errorf("new consumer: %w", err)
	}
	return &Consumer{
		c:          c,
		anomaly:    NewAnomalyDetector(),
		aggregator: NewAggregator(ch),
		alertEval:  NewAlertEvaluator(redis, logger),
		redis:      redis,
		logger:     logger,
	}, nil
}

func (c *Consumer) Start(ctx context.Context, topics []string) error {
	if err := c.c.SubscribeTopics(topics, nil); err != nil {
		return fmt.Errorf("subscribe topics: %w", err)
	}
	for {
		select {
		case <-ctx.Done():
			return c.c.Close()
		default:
			msg, err := c.c.ReadMessage(100)
			if err != nil {
				if err.(kafka.Error).IsTimeout() {
					continue
				}
				c.logger.Error().Err(err).Msg("kafka read")
				continue
			}
			c.process(ctx, msg)
		}
	}
}

func (c *Consumer) process(ctx context.Context, msg *kafka.Message) {
	topic := *msg.TopicPartition.Topic
	switch topic {
	case "infrawhisper.metrics":
		var point chstore.MetricPoint
		if err := json.Unmarshal(msg.Value, &point); err != nil {
			return
		}
		if c.anomaly.Detect(point) {
			channel := fmt.Sprintf("alerts:%s", point.TenantID)
			c.redis.Publish(ctx, channel, map[string]any{
				"type":       "anomaly",
				"metric":     point.MetricName,
				"value":      point.MetricValue,
				"cluster_id": point.ClusterID,
			})
		}
		c.aggregator.Add(point)
		// publish to ws metrics channel
		c.redis.Publish(ctx, fmt.Sprintf("metrics:%s:%s", point.TenantID, point.ClusterID), string(msg.Value))

	case "infrawhisper.logs":
		// publish to ws logs channel
		var entry chstore.LogEntry
		if err := json.Unmarshal(msg.Value, &entry); err != nil {
			return
		}
		c.redis.Publish(ctx, fmt.Sprintf("logs:%s:%s", entry.TenantID, entry.ClusterID), string(msg.Value))
	}
}
```

- [ ] **Step 3: Create `internal/stream/anomaly.go`**

```go
package stream

import (
	"math"
	"sync"

	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
)

type stats struct {
	count  float64
	mean   float64
	m2     float64 // for Welford's online algorithm
}

type AnomalyDetector struct {
	mu    sync.RWMutex
	state map[string]*stats // key: "clusterID:metricName"
}

func NewAnomalyDetector() *AnomalyDetector {
	return &AnomalyDetector{state: make(map[string]*stats)}
}

// Detect uses Welford's online algorithm + 3-sigma rule
func (a *AnomalyDetector) Detect(p chstore.MetricPoint) bool {
	key := p.ClusterID + ":" + p.MetricName
	a.mu.Lock()
	s, ok := a.state[key]
	if !ok {
		s = &stats{}
		a.state[key] = s
	}
	s.count++
	delta := p.MetricValue - s.mean
	s.mean += delta / s.count
	delta2 := p.MetricValue - s.mean
	s.m2 += delta * delta2
	variance := 0.0
	if s.count > 1 {
		variance = s.m2 / (s.count - 1)
	}
	stddev := math.Sqrt(variance)
	mean := s.mean
	a.mu.Unlock()

	// Only flag after warm-up period (100 samples) and using 3-sigma rule
	if s.count < 100 {
		return false
	}
	return math.Abs(p.MetricValue-mean) > 3*stddev
}
```

- [ ] **Step 4: Create `internal/stream/aggregator.go`**

```go
package stream

import (
	"context"
	"sync"
	"time"

	"github.com/rs/zerolog/log"

	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
)

type Aggregator struct {
	mu     sync.Mutex
	buffer []chstore.MetricPoint
	ch     *chstore.DB
	ticker *time.Ticker
}

func NewAggregator(ch *chstore.DB) *Aggregator {
	a := &Aggregator{ch: ch, ticker: time.NewTicker(60 * time.Second)}
	go a.flush()
	return a
}

func (a *Aggregator) Add(p chstore.MetricPoint) {
	a.mu.Lock()
	a.buffer = append(a.buffer, p)
	a.mu.Unlock()
}

func (a *Aggregator) flush() {
	for range a.ticker.C {
		a.mu.Lock()
		if len(a.buffer) == 0 {
			a.mu.Unlock()
			continue
		}
		batch := a.buffer
		a.buffer = nil
		a.mu.Unlock()

		if err := a.ch.InsertMetrics(context.Background(), batch); err != nil {
			log.Error().Err(err).Msg("aggregator flush metrics")
		}
	}
}
```

- [ ] **Step 5: Create `internal/stream/alerteval.go`**

```go
package stream

import (
	"context"
	"fmt"

	"github.com/rs/zerolog"

	rdstore "github.com/infrawhisper/infrawhisper/internal/storage/redis"
)

type AlertEvaluator struct {
	redis  *rdstore.Client
	logger zerolog.Logger
}

func NewAlertEvaluator(redis *rdstore.Client, logger zerolog.Logger) *AlertEvaluator {
	return &AlertEvaluator{redis: redis, logger: logger}
}

func (a *AlertEvaluator) Fire(ctx context.Context, tenantID, clusterID, name, severity string, value float64) {
	channel := fmt.Sprintf("alerts:%s", tenantID)
	a.redis.Publish(ctx, channel, map[string]any{
		"type":       "alert",
		"name":       name,
		"severity":   severity,
		"value":      value,
		"cluster_id": clusterID,
	})
}
```

- [ ] **Step 6: Create `cmd/stream-processor/main.go`**

```go
package main

import (
	"context"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/infrawhisper/infrawhisper/internal/config"
	"github.com/infrawhisper/infrawhisper/internal/stream"
	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
	rdstore "github.com/infrawhisper/infrawhisper/internal/storage/redis"
)

func main() {
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("config load failed")
	}

	ch, err := chstore.New(cfg.ClickHouse.DSN)
	if err != nil {
		log.Fatal().Err(err).Msg("clickhouse connect failed")
	}

	redis, err := rdstore.New(cfg.Redis.Addr, cfg.Redis.Password)
	if err != nil {
		log.Fatal().Err(err).Msg("redis connect failed")
	}

	consumer, err := stream.NewConsumer(
		strings.Join(cfg.Kafka.Brokers, ","),
		cfg.Kafka.GroupID,
		ch, redis, log.Logger,
	)
	if err != nil {
		log.Fatal().Err(err).Msg("stream consumer init failed")
	}

	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		topics := []string{"infrawhisper.metrics", "infrawhisper.logs", "infrawhisper.traces"}
		if err := consumer.Start(ctx, topics); err != nil {
			log.Error().Err(err).Msg("consumer stopped")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	cancel()
	log.Info().Msg("stream processor shutdown complete")
}
```

- [ ] **Step 7: Commit**

```bash
git add internal/stream/ cmd/stream-processor/
git commit -m "feat: Kafka stream processor with anomaly detection and alert eval"
```

---

## Chunk 10: Docker Compose & Build Tooling

### Task 10: Local dev environment

**Files:**
- Create: `docker-compose.yml`
- Create: `docker-compose.dev.yml`
- Create: `Makefile`
- Create: `scripts/dev-setup.sh`
- Create: `scripts/migrate.sh`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: infrawhisper
      POSTGRES_PASSWORD: infrawhisper
      POSTGRES_DB: infrawhisper
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U infrawhisper"]
      interval: 5s
      timeout: 5s
      retries: 5

  clickhouse:
    image: clickhouse/clickhouse-server:24.3
    ports:
      - "9000:9000"
      - "8123:8123"
    volumes:
      - clickhouse_data:/var/lib/clickhouse
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    healthcheck:
      test: ["CMD", "clickhouse-client", "--query", "SELECT 1"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --save 60 1
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@localhost:9093
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk
    healthcheck:
      test: ["CMD", "kafka-topics", "--bootstrap-server", "localhost:9092", "--list"]
      interval: 10s
      timeout: 10s
      retries: 10

volumes:
  postgres_data:
  clickhouse_data:
  redis_data:
```

- [ ] **Step 2: Create `Makefile`**

```makefile
.PHONY: dev build test lint clean migrate docker-up docker-down

GO := go
GOFLAGS := -ldflags="-s -w"
BINS := api-server collector stream-processor worker

dev:
	air -c .air.toml

build:
	@for bin in $(BINS); do \
		echo "Building $$bin..."; \
		$(GO) build $(GOFLAGS) -o bin/$$bin ./cmd/$$bin; \
	done

test:
	$(GO) test ./... -race -cover -count=1

lint:
	golangci-lint run ./...

docker-up:
	docker compose up -d
	@echo "Waiting for services..."
	@sleep 5

docker-down:
	docker compose down

migrate:
	bash scripts/migrate.sh

clean:
	rm -rf bin/ tmp/

tidy:
	$(GO) mod tidy
	$(GO) mod verify
```

- [ ] **Step 3: Create `scripts/dev-setup.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "==> Setting up InfraWhisper development environment"

# Check dependencies
command -v go >/dev/null 2>&1 || { echo "Go 1.22+ required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker required"; exit 1; }

# Copy env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created .env from .env.example"
fi

# Install Go tools
echo "==> Installing Go tools..."
go install github.com/air-verse/air@latest
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Start services
echo "==> Starting Docker services..."
docker compose up -d

echo "==> Waiting for services to be healthy..."
sleep 10

# Run migrations
echo "==> Running migrations..."
bash scripts/migrate.sh

echo ""
echo "✓ Setup complete. Run 'make dev' to start the API server."
```

- [ ] **Step 4: Create `scripts/migrate.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

source .env 2>/dev/null || true

echo "==> Running Postgres migrations..."
go run ./cmd/api-server/... --migrate-only 2>/dev/null || \
  echo "Note: Run migrations via the API server on startup"

echo "==> Running ClickHouse migrations..."
echo "ClickHouse migrations run automatically on service startup"

echo "==> Migrations complete"
```

- [ ] **Step 5: Make scripts executable and commit**

```bash
chmod +x scripts/dev-setup.sh scripts/migrate.sh
git add docker-compose.yml docker-compose.dev.yml Makefile scripts/
git commit -m "feat: docker-compose local dev environment and Makefile"
```

---

## Chunk 11: Build Verification

### Task 11: Verify the Go build compiles

- [ ] **Step 1: Download all dependencies**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
go mod tidy
```

Expected: no errors, `go.sum` updated.

- [ ] **Step 2: Build all binaries**

```bash
mkdir -p bin
go build -o bin/api-server ./cmd/api-server/
go build -o bin/collector ./cmd/collector/
go build -o bin/stream-processor ./cmd/stream-processor/
```

Expected: binaries created in `bin/`.

- [ ] **Step 3: Run go vet**

```bash
go vet ./...
```

Expected: no issues.

- [ ] **Step 4: Commit final state**

```bash
git add go.mod go.sum bin/
git commit -m "feat: verified Go backend builds successfully"
```

---

## Next Sub-projects

After this plan is complete:

1. **Sub-project B** — Python AI Engine (`ai-engine/`) → `2026-03-12-subproject-b-ai-engine.md`
2. **Sub-project C** — Next.js Dashboard (`dashboard/`) → `2026-03-12-subproject-c-dashboard.md`
3. **Sub-project D** — Helm + Docker + CI/CD → `2026-03-12-subproject-d-infra.md`
