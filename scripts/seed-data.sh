#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# seed-data.sh — Populate InfraWhisper dev environment with realistic demo data
#
# Prerequisites: docker compose services running (postgres, clickhouse)
# Usage:         bash scripts/seed-data.sh
###############################################################################

# ── Source .env if present ───────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

# ── Connection defaults ──────────────────────────────────────────────────────
PG_DSN="${POSTGRES_DSN:-postgres://infrawhisper:infrawhisper@localhost:5432/infrawhisper?sslmode=disable}"
CH_HOST="${CLICKHOUSE_HOST:-localhost}"
CH_PORT="${CLICKHOUSE_PORT:-9000}"
CH_DB="${CLICKHOUSE_DB:-infrawhisper}"
CH_USER="${CLICKHOUSE_USER:-infrawhisper}"
CH_PASS="${CLICKHOUSE_PASSWORD:-infrawhisper}"

# ── Helpers ──────────────────────────────────────────────────────────────────
log() { printf '\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m  ! %s\033[0m\n' "$*"; }

run_psql() {
  psql "$PG_DSN" -v ON_ERROR_STOP=1 --quiet "$@"
}

run_ch() {
  clickhouse-client \
    --host "$CH_HOST" --port "$CH_PORT" \
    --database "$CH_DB" --user "$CH_USER" --password "$CH_PASS" \
    --multiquery "$@"
}

# ── Wait for services ───────────────────────────────────────────────────────
wait_for_service() {
  local name="$1" cmd="$2" retries=30
  log "Waiting for $name..."
  for i in $(seq 1 "$retries"); do
    if eval "$cmd" &>/dev/null; then
      log "$name is ready."
      return 0
    fi
    sleep 2
  done
  warn "$name did not become ready after $((retries * 2))s — continuing anyway."
}

wait_for_service "PostgreSQL" "psql '$PG_DSN' -c 'SELECT 1'"
wait_for_service "ClickHouse" "run_ch --query 'SELECT 1'"

###############################################################################
# ██████╗  ██████╗ ███████╗████████╗ ██████╗ ██████╗ ███████╗███████╗
# ██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝██╔════╝ ██╔══██╗██╔════╝██╔════╝
# ██████╔╝██║   ██║███████╗   ██║   ██║  ███╗██████╔╝█████╗  ███████╗
# ██╔═══╝ ██║   ██║╚════██║   ██║   ██║   ██║██╔══██╗██╔══╝  ╚════██║
# ██║     ╚██████╔╝███████║   ██║   ╚██████╔╝██║  ██║███████╗███████║
# ╚═╝      ╚═════╝ ╚══════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝
###############################################################################

log "Seeding PostgreSQL data..."

# ── Tenants ──────────────────────────────────────────────────────────────────
log "  Inserting tenants..."
run_psql <<'SQL'
INSERT INTO tenants (id, name, slug, plan) VALUES
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Acme Corp',  'acme-corp',  'enterprise'),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'StartupIO',  'startup-io', 'pro')
ON CONFLICT (id) DO NOTHING;
SQL

# ── Users ────────────────────────────────────────────────────────────────────
log "  Inserting users..."
run_psql <<'SQL'
INSERT INTO users (id, tenant_id, email, name, role) VALUES
  ('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   'admin@acme.com', 'Alice Admin', 'admin'),
  ('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   'dev@acme.com', 'Bob Developer', 'editor'),
  ('e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   'viewer@acme.com', 'Carol Viewer', 'viewer'),
  ('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f809102',
   'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
   'ops@startup.io', 'Dan OpsLead', 'admin'),
  ('07b8c9d0-e1f2-4a3b-4c5d-6e7f80910213',
   'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
   'eng@startup.io', 'Eve Engineer', 'editor')
ON CONFLICT (id) DO NOTHING;
SQL

# ── Clusters ─────────────────────────────────────────────────────────────────
log "  Inserting clusters..."
run_psql <<'SQL'
INSERT INTO clusters (id, tenant_id, name, provider, region, k8s_version, status, node_count) VALUES
  ('11111111-1111-4111-a111-111111111111',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   'prod-us-east', 'aws', 'us-east-1', '1.29.2', 'connected', 12),
  ('22222222-2222-4222-a222-222222222222',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   'staging-eu', 'aws', 'eu-west-1', '1.28.5', 'connected', 4),
  ('33333333-3333-4333-a333-333333333333',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   'dev-local', 'on-prem', 'local', '1.29.0', 'disconnected', 2),
  ('44444444-4444-4444-a444-444444444444',
   'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
   'prod-gcp', 'gcp', 'us-central1', '1.29.1', 'connected', 8)
ON CONFLICT (id) DO NOTHING;
SQL

# ── Incidents ────────────────────────────────────────────────────────────────
log "  Inserting incidents..."
run_psql <<'SQL'
INSERT INTO incidents (id, tenant_id, cluster_id, title, severity, status, root_cause, ai_summary, signals, resolved_at, created_at) VALUES
  -- Acme / prod-us-east
  ('aaa00001-0000-4000-a000-000000000001',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   '11111111-1111-4111-a111-111111111111',
   'OOMKilled: payment-service pods restarting',
   'critical', 'open', NULL, NULL,
   '{"metrics":["memory_usage"],"pods":["payment-service-7b8f9-xk2lp","payment-service-7b8f9-mn3qr"]}'::jsonb,
   NULL, NOW() - INTERVAL '2 hours'),

  ('aaa00002-0000-4000-a000-000000000002',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   '11111111-1111-4111-a111-111111111111',
   'Node disk pressure on worker-node-03',
   'warning', 'resolved',
   'Log rotation misconfigured — application writing debug logs to emptyDir volume filled the node disk. Fixed by adding log rotation sidecar and increasing ephemeral storage limit.',
   'Worker-node-03 entered DiskPressure condition at 14:32 UTC. Pods began eviction within 8 minutes. Root cause traced to payment-service debug logging filling ephemeral storage. Resolved by ops team at 15:10 UTC.',
   '{"metrics":["disk_usage","node_condition"],"nodes":["worker-node-03"]}'::jsonb,
   NOW() - INTERVAL '20 hours', NOW() - INTERVAL '22 hours'),

  ('aaa00003-0000-4000-a000-000000000003',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   '11111111-1111-4111-a111-111111111111',
   'TLS certificate expiring in 48 hours (*.acme-prod.internal)',
   'warning', 'open', NULL, NULL,
   '{"source":"cert-manager","secret":"acme-prod-tls","namespace":"production"}'::jsonb,
   NULL, NOW() - INTERVAL '6 hours'),

  ('aaa00004-0000-4000-a000-000000000004',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   '11111111-1111-4111-a111-111111111111',
   'API latency spike — p99 > 2s on /api/v1/query',
   'critical', 'resolved',
   'ClickHouse node ran a heavy compaction during peak traffic. Query planner chose a suboptimal merge strategy. Resolved after compaction completed and query cache warmed.',
   'p99 latency for /api/v1/query rose from 180ms to 2.4s between 09:00-09:45 UTC. Correlated with ClickHouse compaction spike. Latency returned to baseline after compaction.',
   '{"metrics":["api_latency_p99"],"services":["api-server","clickhouse"]}'::jsonb,
   NOW() - INTERVAL '30 hours', NOW() - INTERVAL '32 hours'),

  ('aaa00005-0000-4000-a000-000000000005',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   '11111111-1111-4111-a111-111111111111',
   'CrashLoopBackOff: auth-service failing readiness probe',
   'critical', 'open', NULL, NULL,
   '{"metrics":["pod_restart_count"],"pods":["auth-service-5c6d7-ab1cd"],"logs":["panic: runtime error: invalid memory address"]}'::jsonb,
   NULL, NOW() - INTERVAL '1 hour'),

  ('aaa00006-0000-4000-a000-000000000006',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   '11111111-1111-4111-a111-111111111111',
   'Kafka consumer lag > 10000 on infrawhisper.metrics',
   'warning', 'resolved',
   'Stream-processor pod was throttled due to CPU limit of 250m. Increased to 500m and added a second replica to the consumer group.',
   'Consumer group infrawhisper-stream fell behind by 12,400 messages on the metrics topic. Lag began growing at 11:15 UTC when ingest volume doubled during a load test. Resolved after scaling the consumer group.',
   '{"metrics":["kafka_consumer_lag"],"topics":["infrawhisper.metrics"]}'::jsonb,
   NOW() - INTERVAL '10 hours', NOW() - INTERVAL '14 hours'),

  -- Acme / staging-eu
  ('aaa00007-0000-4000-a000-000000000007',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   '22222222-2222-4222-a222-222222222222',
   'ImagePullBackOff: web-frontend using non-existent tag v2.4.0-rc1',
   'info', 'open', NULL, NULL,
   '{"pods":["web-frontend-6f7e8-zz9yy"],"image":"ghcr.io/infrawhisper/web-frontend:v2.4.0-rc1"}'::jsonb,
   NULL, NOW() - INTERVAL '3 hours'),

  -- StartupIO / prod-gcp
  ('aaa00008-0000-4000-a000-000000000008',
   'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
   '44444444-4444-4444-a444-444444444444',
   'Elevated 5xx error rate (8.3%) on api-server',
   'critical', 'open', NULL, NULL,
   '{"metrics":["http_error_rate"],"services":["api-server"]}'::jsonb,
   NULL, NOW() - INTERVAL '45 minutes'),

  ('aaa00009-0000-4000-a000-000000000009',
   'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
   '44444444-4444-4444-a444-444444444444',
   'PVC near capacity — postgres-data at 92% utilization',
   'warning', 'resolved',
   'WAL archiving was disabled after a configuration change. Old WAL segments accumulated. Re-enabled archive_command and manually cleaned stale segments.',
   'Persistent volume claim postgres-data reached 92% utilization. Alert fired at 06:20 UTC. Investigation revealed WAL archiving was inadvertently disabled 3 days prior. Fixed and reclaimed 14 GiB.',
   '{"metrics":["disk_usage"],"pvcs":["postgres-data"]}'::jsonb,
   NOW() - INTERVAL '48 hours', NOW() - INTERVAL '52 hours'),

  ('aaa00010-0000-4000-a000-000000000010',
   'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
   '44444444-4444-4444-a444-444444444444',
   'Node NotReady: gke-prod-pool-a-node-04 unreachable',
   'critical', 'resolved',
   'GCP live migration event caused a 90-second connectivity loss. Node recovered automatically after migration completed.',
   'Node gke-prod-pool-a-node-04 became NotReady at 03:12 UTC. Kubelet stopped reporting within the heartbeat threshold. Node returned to Ready state at 03:14 UTC following a GCP live migration event.',
   '{"metrics":["node_condition"],"nodes":["gke-prod-pool-a-node-04"]}'::jsonb,
   NOW() - INTERVAL '72 hours', NOW() - INTERVAL '71 hours')
ON CONFLICT (id) DO NOTHING;
SQL

# ── Alert Rules ──────────────────────────────────────────────────────────────
log "  Inserting alert rules..."
run_psql <<'SQL'
INSERT INTO alert_rules (id, tenant_id, cluster_id, name, description, condition, severity, enabled, channels) VALUES
  ('bbb00001-0000-4000-b000-000000000001',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   '11111111-1111-4111-a111-111111111111',
   'High CPU Usage',
   'Alert when container CPU exceeds 80% for 5 minutes',
   '{"metric":"cpu_usage","operator":">","threshold":80,"for":"5m"}'::jsonb,
   'warning', true,
   '["slack:#alerts-prod","pagerduty:infra-team"]'::jsonb),

  ('bbb00002-0000-4000-b000-000000000002',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   '11111111-1111-4111-a111-111111111111',
   'Memory Saturation',
   'Alert when container memory exceeds 90% for 3 minutes',
   '{"metric":"memory_usage_percent","operator":">","threshold":90,"for":"3m"}'::jsonb,
   'critical', true,
   '["slack:#alerts-prod","pagerduty:infra-team"]'::jsonb),

  ('bbb00003-0000-4000-b000-000000000003',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   '11111111-1111-4111-a111-111111111111',
   'Pod Restart Storm',
   'Alert when pod restart count exceeds 5 within 10 minutes',
   '{"metric":"pod_restart_count","operator":">","threshold":5,"for":"10m"}'::jsonb,
   'warning', true,
   '["slack:#alerts-prod"]'::jsonb),

  ('bbb00004-0000-4000-b000-000000000004',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   '11111111-1111-4111-a111-111111111111',
   'Error Rate Spike',
   'Alert when HTTP 5xx error rate exceeds 5% for 2 minutes',
   '{"metric":"http_error_rate","operator":">","threshold":5,"for":"2m"}'::jsonb,
   'critical', true,
   '["slack:#alerts-prod","pagerduty:infra-team"]'::jsonb),

  ('bbb00005-0000-4000-b000-000000000005',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   NULL,
   'Node Not Ready',
   'Alert when any node is not ready for more than 1 minute',
   '{"metric":"node_ready","operator":"==","threshold":0,"for":"1m"}'::jsonb,
   'critical', true,
   '["slack:#alerts-prod","pagerduty:infra-team","email:ops@acme.com"]'::jsonb),

  ('bbb00006-0000-4000-b000-000000000006',
   'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
   NULL,
   'Disk Usage Critical',
   'Alert when node disk usage exceeds 85%',
   '{"metric":"disk_usage_percent","operator":">","threshold":85,"for":"5m"}'::jsonb,
   'warning', true,
   '["slack:#alerts-prod"]'::jsonb),

  ('bbb00007-0000-4000-b000-000000000007',
   'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
   '44444444-4444-4444-a444-444444444444',
   'API Latency P99',
   'Alert when API p99 latency exceeds 1000ms for 3 minutes',
   '{"metric":"api_latency_p99","operator":">","threshold":1000,"for":"3m"}'::jsonb,
   'warning', true,
   '["slack:#ops-alerts"]'::jsonb),

  ('bbb00008-0000-4000-b000-000000000008',
   'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
   '44444444-4444-4444-a444-444444444444',
   'Kafka Consumer Lag',
   'Alert when consumer lag exceeds 5000 messages',
   '{"metric":"kafka_consumer_lag","operator":">","threshold":5000,"for":"5m"}'::jsonb,
   'warning', true,
   '["slack:#ops-alerts"]'::jsonb)
ON CONFLICT (id) DO NOTHING;
SQL

# ── Alert Events (a handful of recent firings) ──────────────────────────────
log "  Inserting alert events..."
run_psql <<'SQL'
INSERT INTO alert_events (id, rule_id, cluster_id, state, value, fired_at, resolved_at) VALUES
  ('ccc00001-0000-4000-c000-000000000001',
   'bbb00002-0000-4000-b000-000000000002',
   '11111111-1111-4111-a111-111111111111',
   'firing', 94.7, NOW() - INTERVAL '2 hours', NULL),

  ('ccc00002-0000-4000-c000-000000000002',
   'bbb00001-0000-4000-b000-000000000001',
   '11111111-1111-4111-a111-111111111111',
   'resolved', 86.2, NOW() - INTERVAL '26 hours', NOW() - INTERVAL '25 hours'),

  ('ccc00003-0000-4000-c000-000000000003',
   'bbb00003-0000-4000-b000-000000000003',
   '11111111-1111-4111-a111-111111111111',
   'firing', 8.0, NOW() - INTERVAL '1 hour', NULL),

  ('ccc00004-0000-4000-c000-000000000004',
   'bbb00008-0000-4000-b000-000000000008',
   '44444444-4444-4444-a444-444444444444',
   'resolved', 12400.0, NOW() - INTERVAL '14 hours', NOW() - INTERVAL '10 hours'),

  ('ccc00005-0000-4000-c000-000000000005',
   'bbb00005-0000-4000-b000-000000000005',
   '44444444-4444-4444-a444-444444444444',
   'resolved', 0.0, NOW() - INTERVAL '72 hours', NOW() - INTERVAL '71 hours')
ON CONFLICT (id) DO NOTHING;
SQL

log "PostgreSQL seeding complete."

###############################################################################
#  ██████╗██╗     ██╗ ██████╗██╗  ██╗██╗  ██╗ ██████╗ ██╗   ██╗███████╗███████╗
# ██╔════╝██║     ██║██╔════╝██║ ██╔╝██║  ██║██╔═══██╗██║   ██║██╔════╝██╔════╝
# ██║     ██║     ██║██║     █████╔╝ ███████║██║   ██║██║   ██║███████╗█████╗
# ██║     ██║     ██║██║     ██╔═██╗ ██╔══██║██║   ██║██║   ██║╚════██║██╔══╝
# ╚██████╗███████╗██║╚██████╗██║  ██╗██║  ██║╚██████╔╝╚██████╔╝███████║███████╗
#  ╚═════╝╚══════╝╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝╚══════╝
###############################################################################

log "Seeding ClickHouse data..."

# ── Truncate existing ClickHouse data ────────────────────────────────────────
log "  Truncating ClickHouse tables..."
run_ch --query "TRUNCATE TABLE IF EXISTS infrawhisper.metrics"
run_ch --query "TRUNCATE TABLE IF EXISTS infrawhisper.logs"
run_ch --query "TRUNCATE TABLE IF EXISTS infrawhisper.traces"
run_ch --query "TRUNCATE TABLE IF EXISTS infrawhisper.costs"

# ── Metrics: 48 hours of data, every 5 minutes ──────────────────────────────
# 48h * 60m / 5m = 576 time points
# 4 clusters * 6 metrics * 9 pods * 4 nodes is too many combos — we generate
# a reasonable subset: each time point gets one row per (cluster, metric, pod/node).
log "  Inserting metrics (48h, 5-minute intervals)..."

run_ch <<'CHSQL'
-- We use numbers(576) to get 576 five-minute intervals = 48 hours.
-- For each interval we cross-join clusters, namespaces, pods, nodes, and metrics.

INSERT INTO infrawhisper.metrics
SELECT
    now() - toIntervalMinute(n.number * 5)                           AS timestamp,
    cluster_id,
    tenant_id,
    namespace,
    pod,
    node,
    pod                                                               AS container,
    metric_name,
    -- Generate a realistic value per metric with some variance
    CASE metric_name
        WHEN 'cpu_usage'        THEN 15 + (rand() % 70) + (IF(rand() % 100 < 5, 25, 0))
        WHEN 'memory_usage'     THEN 200 + (rand() % 600)
        WHEN 'network_rx_bytes' THEN 1000 + (rand() % 49000)
        WHEN 'network_tx_bytes' THEN 500  + (rand() % 24500)
        WHEN 'disk_io_read'     THEN 100  + (rand() % 4900)
        WHEN 'disk_io_write'    THEN 50   + (rand() % 2950)
        ELSE 0
    END                                                               AS metric_value,
    map('source', 'seed-script')                                      AS labels
FROM numbers(576) AS n
CROSS JOIN (
    SELECT '11111111-1111-4111-a111-111111111111' AS cluster_id, 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' AS tenant_id
    UNION ALL SELECT '22222222-2222-4222-a222-222222222222', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
    UNION ALL SELECT '33333333-3333-4333-a333-333333333333', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
    UNION ALL SELECT '44444444-4444-4444-a444-444444444444', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
) AS clusters
CROSS JOIN (
    SELECT 'default' AS namespace
    UNION ALL SELECT 'kube-system'
    UNION ALL SELECT 'production'
    UNION ALL SELECT 'staging'
    UNION ALL SELECT 'monitoring'
) AS ns
CROSS JOIN (
    SELECT 'api-server' AS pod UNION ALL SELECT 'web-frontend'
    UNION ALL SELECT 'auth-service'  UNION ALL SELECT 'payment-service'
    UNION ALL SELECT 'worker'        UNION ALL SELECT 'cache-redis'
    UNION ALL SELECT 'db-postgres'   UNION ALL SELECT 'kafka-broker'
    UNION ALL SELECT 'monitoring-agent'
) AS pods
CROSS JOIN (
    SELECT 'worker-node-01' AS node UNION ALL SELECT 'worker-node-02'
    UNION ALL SELECT 'worker-node-03' UNION ALL SELECT 'worker-node-04'
) AS nodes
CROSS JOIN (
    SELECT 'cpu_usage' AS metric_name
    UNION ALL SELECT 'memory_usage'
    UNION ALL SELECT 'network_rx_bytes'
    UNION ALL SELECT 'network_tx_bytes'
    UNION ALL SELECT 'disk_io_read'
    UNION ALL SELECT 'disk_io_write'
) AS metrics
-- Downsample: keep ~1/36 of the full cross product so we don't explode row count.
-- This hashes on the combined dimensions to get a deterministic, evenly-distributed sample.
WHERE cityHash64(cluster_id, namespace, pod, node, metric_name) % 36 = 0
CHSQL

log "  Metrics inserted."

# ── Logs: ~2000 entries across 48 hours ──────────────────────────────────────
log "  Inserting logs (~2000 entries)..."

run_ch <<'CHSQL'
INSERT INTO infrawhisper.logs
SELECT
    now() - toIntervalSecond(rand() % 172800)                         AS timestamp,
    cluster_id,
    tenant_id,
    namespace,
    pod,
    pod                                                               AS container,
    -- Severity distribution: INFO 60%, WARN 25%, ERROR 12%, DEBUG 3%
    multiIf(
        r < 60,  'INFO',
        r < 85,  'WARN',
        r < 97,  'ERROR',
                  'DEBUG'
    )                                                                 AS severity,
    -- Body: pick from realistic messages per severity
    multiIf(
        r < 60, arrayElement(
            ['Handled request successfully in ' || toString(5 + rand() % 200) || 'ms',
             'Health check passed — all dependencies reachable',
             'Reconcile loop completed for ' || pod || ': 0 changes',
             'Connection pool stats: active=12 idle=8 total=20',
             'Scheduled job cron-cleanup-' || toString(rand() % 100) || ' completed',
             'Serving gRPC on :4317',
             'Kafka offset committed: partition=' || toString(rand() % 8) || ' offset=' || toString(10000 + rand() % 50000),
             'Cache hit ratio: ' || toString(70 + rand() % 30) || '%'],
            1 + toUInt64(rand() % 8)),
        r < 85, arrayElement(
            ['Slow query detected: ' || toString(500 + rand() % 2000) || 'ms — consider adding index',
             'Deprecated API v1beta1 called by ' || pod || ' — migrate to v1',
             'Retry attempt ' || toString(1 + rand() % 5) || '/5 for upstream ' || pod,
             'Connection pool nearing limit: 18/20 active connections',
             'Certificate expires in ' || toString(1 + rand() % 72) || ' hours — renewal pending',
             'High GC pause: ' || toString(50 + rand() % 200) || 'ms in last collection cycle',
             'Disk usage at ' || toString(75 + rand() % 15) || '% on /var/lib/data'],
            1 + toUInt64(rand() % 7)),
        r < 97, arrayElement(
            ['Failed to connect to postgres:5432 — connection refused (attempt ' || toString(1 + rand() % 10) || ')',
             'OOMKilled: container ' || pod || ' exceeded memory limit of 512Mi',
             'Context deadline exceeded after 30s calling auth-service:8443/verify',
             'TLS handshake failed: certificate has expired',
             'Kafka producer: message delivery failed — topic infrawhisper.metrics: LEADER_NOT_AVAILABLE',
             'Readiness probe failed: HTTP GET /healthz returned 503'],
            1 + toUInt64(rand() % 6)),
        -- DEBUG
        arrayElement(
            ['Entering handler ServeHTTP method=GET path=/api/v1/clusters',
             'Token claims decoded: sub=c3d4e5f6 tenant=a1b2c3d4 role=admin',
             'Query plan: SeqScan on metrics cost=0.00..1234.56 rows=50000'],
            1 + toUInt64(rand() % 3))
    )                                                                 AS body,
    ''                                                                AS trace_id,
    ''                                                                AS span_id,
    map('source', 'seed-script')                                      AS attributes
FROM (
    SELECT
        number,
        rand() % 100 AS r
    FROM numbers(2000)
) AS seq
CROSS JOIN (
    SELECT '11111111-1111-4111-a111-111111111111' AS cluster_id, 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' AS tenant_id
    UNION ALL SELECT '22222222-2222-4222-a222-222222222222', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
    UNION ALL SELECT '33333333-3333-4333-a333-333333333333', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
    UNION ALL SELECT '44444444-4444-4444-a444-444444444444', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
) AS clusters
CROSS JOIN (
    SELECT 'production' AS namespace UNION ALL SELECT 'kube-system'
    UNION ALL SELECT 'default' UNION ALL SELECT 'monitoring'
) AS ns
CROSS JOIN (
    SELECT 'api-server' AS pod UNION ALL SELECT 'auth-service'
    UNION ALL SELECT 'payment-service' UNION ALL SELECT 'worker'
    UNION ALL SELECT 'cache-redis' UNION ALL SELECT 'kafka-broker'
) AS pods
-- Downsample to roughly 2000 rows total.
-- 2000 base * 4 clusters * 4 ns * 6 pods = 192000; keep 1/96 ≈ 2000
WHERE cityHash64(number, cluster_id, namespace, pod) % 96 = 0
CHSQL

log "  Logs inserted."

# ── Traces: ~100 traces with parent-child spans ─────────────────────────────
log "  Inserting traces (~100 root + child spans)..."

run_ch <<'CHSQL'
-- Generate 100 root spans and 2-4 child spans each.
-- Each trace: root (api-server) -> auth-service -> db/cache

-- Root spans
INSERT INTO infrawhisper.traces
SELECT
    now() - toIntervalSecond(rand() % 172800)                        AS timestamp,
    arrayElement(
        ['11111111-1111-4111-a111-111111111111',
         '22222222-2222-4222-a222-222222222222',
         '44444444-4444-4444-a444-444444444444'],
        1 + toUInt64(rand() % 3))                                    AS cluster_id,
    IF(cluster_id = '44444444-4444-4444-a444-444444444444',
       'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
       'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d')                      AS tenant_id,
    lower(hex(MD5(toString(number))))                                 AS trace_id,
    lower(hex(MD5(concat('root-', toString(number)))))                AS span_id,
    ''                                                                AS parent_span_id,
    arrayElement(
        ['GET /api/v1/clusters',
         'POST /api/v1/query',
         'GET /health',
         'GET /api/v1/incidents',
         'POST /api/v1/alerts'],
        1 + toUInt64(rand() % 5))                                    AS operation_name,
    'api-server'                                                      AS service_name,
    toFloat64(5 + rand() % 495 + IF(rand() % 100 < 8, 1000 + rand() % 2000, 0)) AS duration_ms,
    IF(rand() % 100 < 95, 0, 2)                                      AS status_code,
    map('source', 'seed-script', 'http.method', IF(operation_name LIKE 'POST%', 'POST', 'GET')) AS tags
FROM numbers(100) AS n;

-- Child span 1: auth-service
INSERT INTO infrawhisper.traces
SELECT
    now() - toIntervalSecond(rand() % 172800)                        AS timestamp,
    arrayElement(
        ['11111111-1111-4111-a111-111111111111',
         '22222222-2222-4222-a222-222222222222',
         '44444444-4444-4444-a444-444444444444'],
        1 + toUInt64(rand() % 3))                                    AS cluster_id,
    IF(cluster_id = '44444444-4444-4444-a444-444444444444',
       'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
       'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d')                      AS tenant_id,
    lower(hex(MD5(toString(number))))                                 AS trace_id,
    lower(hex(MD5(concat('auth-', toString(number)))))                AS span_id,
    lower(hex(MD5(concat('root-', toString(number)))))                AS parent_span_id,
    'auth.VerifyToken'                                                AS operation_name,
    'auth-service'                                                    AS service_name,
    toFloat64(2 + rand() % 50)                                       AS duration_ms,
    IF(rand() % 100 < 97, 0, 2)                                      AS status_code,
    map('source', 'seed-script')                                      AS tags
FROM numbers(100) AS n;

-- Child span 2: postgres query
INSERT INTO infrawhisper.traces
SELECT
    now() - toIntervalSecond(rand() % 172800)                        AS timestamp,
    arrayElement(
        ['11111111-1111-4111-a111-111111111111',
         '22222222-2222-4222-a222-222222222222',
         '44444444-4444-4444-a444-444444444444'],
        1 + toUInt64(rand() % 3))                                    AS cluster_id,
    IF(cluster_id = '44444444-4444-4444-a444-444444444444',
       'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
       'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d')                      AS tenant_id,
    lower(hex(MD5(toString(number))))                                 AS trace_id,
    lower(hex(MD5(concat('pg-', toString(number)))))                  AS span_id,
    lower(hex(MD5(concat('root-', toString(number)))))                AS parent_span_id,
    arrayElement(
        ['SELECT clusters', 'SELECT incidents', 'INSERT alert_events', 'SELECT users'],
        1 + toUInt64(rand() % 4))                                    AS operation_name,
    'postgres'                                                        AS service_name,
    toFloat64(1 + rand() % 80)                                       AS duration_ms,
    0                                                                 AS status_code,
    map('source', 'seed-script', 'db.system', 'postgresql')           AS tags
FROM numbers(100) AS n;

-- Child span 3: redis cache lookup
INSERT INTO infrawhisper.traces
SELECT
    now() - toIntervalSecond(rand() % 172800)                        AS timestamp,
    arrayElement(
        ['11111111-1111-4111-a111-111111111111',
         '22222222-2222-4222-a222-222222222222',
         '44444444-4444-4444-a444-444444444444'],
        1 + toUInt64(rand() % 3))                                    AS cluster_id,
    IF(cluster_id = '44444444-4444-4444-a444-444444444444',
       'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
       'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d')                      AS tenant_id,
    lower(hex(MD5(toString(number))))                                 AS trace_id,
    lower(hex(MD5(concat('redis-', toString(number)))))               AS span_id,
    lower(hex(MD5(concat('root-', toString(number)))))                AS parent_span_id,
    arrayElement(
        ['cache.GET', 'cache.SET', 'cache.DEL'],
        1 + toUInt64(rand() % 3))                                    AS operation_name,
    'redis'                                                           AS service_name,
    toFloat64(rand() % 5 + 1)                                        AS duration_ms,
    0                                                                 AS status_code,
    map('source', 'seed-script', 'db.system', 'redis')               AS tags
FROM numbers(100) AS n;

-- Child span 4: clickhouse query (only for /api/v1/query traces — ~20%)
INSERT INTO infrawhisper.traces
SELECT
    now() - toIntervalSecond(rand() % 172800)                        AS timestamp,
    arrayElement(
        ['11111111-1111-4111-a111-111111111111',
         '22222222-2222-4222-a222-222222222222',
         '44444444-4444-4444-a444-444444444444'],
        1 + toUInt64(rand() % 3))                                    AS cluster_id,
    IF(cluster_id = '44444444-4444-4444-a444-444444444444',
       'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
       'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d')                      AS tenant_id,
    lower(hex(MD5(toString(number))))                                 AS trace_id,
    lower(hex(MD5(concat('ch-', toString(number)))))                  AS span_id,
    lower(hex(MD5(concat('root-', toString(number)))))                AS parent_span_id,
    'SELECT metrics'                                                  AS operation_name,
    'clickhouse'                                                      AS service_name,
    toFloat64(10 + rand() % 300)                                     AS duration_ms,
    0                                                                 AS status_code,
    map('source', 'seed-script', 'db.system', 'clickhouse')           AS tags
FROM numbers(20) AS n;
CHSQL

log "  Traces inserted."

# ── Costs: 30 days of daily cost records ─────────────────────────────────────
log "  Inserting cost data (30 days)..."

run_ch <<'CHSQL'
INSERT INTO infrawhisper.costs
SELECT
    today() - n.number                                                AS date,
    cluster_id,
    tenant_id,
    'production'                                                      AS namespace,
    workload,
    resource_type,
    -- requested: a base amount with small daily variance
    CASE resource_type
        WHEN 'cpu' THEN
            CASE workload
                WHEN 'api-server'     THEN 4.0  + (rand() % 10) / 10.0
                WHEN 'web-frontend'   THEN 2.0  + (rand() % 10) / 10.0
                WHEN 'auth-service'   THEN 2.0  + (rand() % 5)  / 10.0
                WHEN 'payment-service'THEN 3.0  + (rand() % 8)  / 10.0
                WHEN 'worker-pool'    THEN 8.0  + (rand() % 20) / 10.0
                WHEN 'cache-redis'    THEN 1.0  + (rand() % 5)  / 10.0
                WHEN 'db-postgres'    THEN 4.0  + (rand() % 10) / 10.0
                WHEN 'monitoring'     THEN 1.0  + (rand() % 5)  / 10.0
                ELSE 1.0
            END
        ELSE -- memory (GiB)
            CASE workload
                WHEN 'api-server'     THEN 8.0  + (rand() % 20) / 10.0
                WHEN 'web-frontend'   THEN 4.0  + (rand() % 10) / 10.0
                WHEN 'auth-service'   THEN 4.0  + (rand() % 10) / 10.0
                WHEN 'payment-service'THEN 6.0  + (rand() % 15) / 10.0
                WHEN 'worker-pool'    THEN 16.0 + (rand() % 30) / 10.0
                WHEN 'cache-redis'    THEN 8.0  + (rand() % 10) / 10.0
                WHEN 'db-postgres'    THEN 16.0 + (rand() % 20) / 10.0
                WHEN 'monitoring'     THEN 2.0  + (rand() % 10) / 10.0
                ELSE 2.0
            END
    END                                                               AS requested,
    -- used: 30-70% of requested for some workloads (showing waste)
    requested * (0.30 + (rand() % 40) / 100.0)                       AS used,
    -- cost: $0.50 - $25 per workload per day
    CASE resource_type
        WHEN 'cpu' THEN requested * (2.5 + (rand() % 15) / 10.0)
        ELSE            requested * (0.8 + (rand() % 10) / 10.0)
    END                                                               AS cost_usd
FROM numbers(30) AS n
CROSS JOIN (
    SELECT '11111111-1111-4111-a111-111111111111' AS cluster_id, 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' AS tenant_id
    UNION ALL SELECT '22222222-2222-4222-a222-222222222222', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
    UNION ALL SELECT '44444444-4444-4444-a444-444444444444', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
) AS clusters
CROSS JOIN (
    SELECT 'api-server' AS workload
    UNION ALL SELECT 'web-frontend'
    UNION ALL SELECT 'auth-service'
    UNION ALL SELECT 'payment-service'
    UNION ALL SELECT 'worker-pool'
    UNION ALL SELECT 'cache-redis'
    UNION ALL SELECT 'db-postgres'
    UNION ALL SELECT 'monitoring'
) AS workloads
CROSS JOIN (
    SELECT 'cpu' AS resource_type
    UNION ALL SELECT 'memory'
) AS resources
CHSQL

log "  Cost data inserted."

###############################################################################
# Summary
###############################################################################

log "Verifying row counts..."

PG_COUNTS=$(run_psql -t -A <<'SQL'
SELECT 'tenants: '      || count(*) FROM tenants
UNION ALL
SELECT 'users: '        || count(*) FROM users
UNION ALL
SELECT 'clusters: '     || count(*) FROM clusters
UNION ALL
SELECT 'incidents: '    || count(*) FROM incidents
UNION ALL
SELECT 'alert_rules: '  || count(*) FROM alert_rules
UNION ALL
SELECT 'alert_events: ' || count(*) FROM alert_events;
SQL
)

CH_METRICS=$(run_ch --query "SELECT count() FROM infrawhisper.metrics")
CH_LOGS=$(run_ch --query "SELECT count() FROM infrawhisper.logs")
CH_TRACES=$(run_ch --query "SELECT count() FROM infrawhisper.traces")
CH_COSTS=$(run_ch --query "SELECT count() FROM infrawhisper.costs")

echo ""
log "=== Seed Data Summary ==="
echo "── PostgreSQL ──"
echo "$PG_COUNTS"
echo ""
echo "── ClickHouse ──"
echo "  metrics:  $CH_METRICS"
echo "  logs:     $CH_LOGS"
echo "  traces:   $CH_TRACES"
echo "  costs:    $CH_COSTS"
echo ""
log "Seeding complete!"
