# InfraWhisper — K8s Dev Cluster Readiness Design

**Date:** 2026-03-13
**Target:** OrbStack dev cluster
**Approach:** Option B — Full Audit + Fix All Gaps
**Scope:** All 6 services (api-server, collector, stream-processor, dashboard, ai-engine, agent)

---

## 1. Goals

Ensure InfraWhisper can be installed on a local OrbStack Kubernetes cluster via `helm install` with all pods reaching `Running/Ready` state, probes passing, and no crashloops. External dependencies (Postgres, ClickHouse, Redis, Kafka) are pre-provisioned via docker-compose or OrbStack init script.

**Out of scope:** Sealed Secrets / Vault, PodDisruptionBudgets, NetworkPolicies, pod anti-affinity, production TLS.

---

## 2. Current State (Pre-Fix)

| Component | Dockerfile | Helm Template | Probes | Notes |
|-----------|-----------|---------------|--------|-------|
| api-server | ✓ Multi-stage | ✓ Deployment + Service + HPA | ✓ /health, /ready | HPA must be disabled on dev (no metrics-server) |
| collector | ✓ Multi-stage (EXPOSE 4317 already present) | ✓ Deployment + Service | ✗ None | tcpSocket probe needed |
| stream-processor | ✓ Multi-stage | ✓ Deployment | ✗ None | No HTTP server — must add :8081 health goroutine to Go code |
| dashboard | ✓ Node multi-stage | ✓ Deployment + Service | ✗ None | tcpSocket probe safest for Next.js standalone |
| ai-engine | ✓ Python multi-stage | ✓ Deployment + Service | ✓ /health, /ready | Probe delays too short for Python cold start |
| agent | ✓ Rust multi-stage | ✓ DaemonSet + RBAC | ✗ None | SA auto-mount must be true (default) |

**Confirmed blocking gaps:**
1. `POSTGRES_DSN` and `CLICKHOUSE_DSN` missing from ConfigMap — Go config expects DSN strings, not individual host/port/db fields
2. `KAFKA_BROKERS` set as a plain string in ConfigMap but `config.go` maps it to `[]string` — all Go services will panic on startup
3. No health probes on collector, stream-processor, dashboard
4. stream-processor has no HTTP server — probe YAML cannot be written until Go health goroutine is added
5. `ai-engine` probe initialDelaySeconds too short (15s liveness, 10s readiness) for Python/FastAPI cold start
6. HPA enabled by default (`minReplicas: 2`) — will fail on OrbStack without metrics-server
7. `docker-compose.dev.yml` references `Dockerfile.api` (does not exist — should be `Dockerfile.api-server`)

---

## 3. Audit Areas & Fixes

### Area 1 — ConfigMap / Secrets Wiring (Blocking)

The Go config package (`internal/config/config.go`) reads:
- `POSTGRES_DSN` — a full DSN string (e.g., `postgres://user:pass@host:5432/db?sslmode=disable`)
- `CLICKHOUSE_DSN` — a full DSN string (e.g., `clickhouse://host:9000/db`)
- `KAFKA_BROKERS` — expected as `[]string` via mapstructure

The current ConfigMap provides individual fields (`POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, etc.) which are not consumed by the config package. This will cause all Go services to start with empty DSNs and fatal-log on first DB connection.

**Fix:** Add `POSTGRES_DSN` and `CLICKHOUSE_DSN` as composite values to `configmap.yaml` using Helm template string formatting from the existing host/port/db fields:

```yaml
POSTGRES_DSN: "postgres://{{ .Values.config.postgresUser }}:{{ .Values.secrets.postgresPassword }}@{{ .Values.config.postgresHost }}:{{ .Values.config.postgresPort }}/{{ .Values.config.postgresDB }}?sslmode=disable"
CLICKHOUSE_DSN: "clickhouse://{{ .Values.config.clickhouseHost }}:{{ .Values.config.clickhousePort }}/{{ .Values.config.clickhouseDatabase }}"
```

**`KAFKA_BROKERS` fix:** The config struct expects `[]string`. Viper's `AutomaticEnv` reads env vars as strings and cannot split them into a slice without explicit configuration. Fix by ensuring `KAFKA_BROKERS` is a single broker string in the ConfigMap (e.g., `kafka:29092`) and changing the config struct field to `Broker string` (or add `viper.SetDefault` and `strings.Split` in the loader). The simpler fix for a dev cluster is to change the struct field to `string` and pass it as a single-element list to the Kafka client.

---

### Area 2 — Health Probes

**Collector** (`collector-deployment.yaml`) — tcpSocket on port 4317 (no HTTP server needed):
```yaml
livenessProbe:
  tcpSocket:
    port: 4317
  initialDelaySeconds: 15
  periodSeconds: 20
readinessProbe:
  tcpSocket:
    port: 4317
  initialDelaySeconds: 5
  periodSeconds: 10
```

**Stream-processor** — requires Go code change first, then Helm probe:

Step 1 (Go code — `cmd/stream-processor/main.go`): Add a health goroutine before the Kafka consumer loop:
```go
go func() {
    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status":"ok"}`))
    })
    http.ListenAndServe(":8081", nil)
}()
```

Step 2 (Helm — `stream-processor-deployment.yaml`):
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8081
  initialDelaySeconds: 15
  periodSeconds: 20
readinessProbe:
  httpGet:
    path: /health
    port: 8081
  initialDelaySeconds: 5
  periodSeconds: 10
```

**Dashboard** (`dashboard-deployment.yaml`) — tcpSocket is safest for Next.js standalone (avoids fragile `/` route dependency):
```yaml
livenessProbe:
  tcpSocket:
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 20
readinessProbe:
  tcpSocket:
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
```

**AI-engine** (`ai-engine-deployment.yaml`) — increase probe delays for Python cold start:
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8001
  initialDelaySeconds: 30   # was 15
  periodSeconds: 20
readinessProbe:
  httpGet:
    path: /ready
    port: 8001
  initialDelaySeconds: 20   # was 10
  periodSeconds: 10
```

---

### Area 3 — Init Containers for Dependency Readiness

Use `alpine:3.20` (already used by all Go/Rust services) with `nc` for TCP checks. Mapping by service dependency:

**api-server** (depends on Postgres, Redis):
```yaml
initContainers:
  - name: wait-for-postgres
    image: alpine:3.20
    command: ['sh', '-c', 'until nc -z $POSTGRES_HOST 5432; do echo waiting for postgres; sleep 2; done']
  - name: wait-for-redis
    image: alpine:3.20
    command: ['sh', '-c', 'until nc -z $REDIS_HOST 6379; do echo waiting for redis; sleep 2; done']
```

**collector** (depends on Kafka, ClickHouse):
```yaml
initContainers:
  - name: wait-for-kafka
    image: alpine:3.20
    command: ['sh', '-c', 'until nc -z $KAFKA_HOST 9092; do echo waiting for kafka; sleep 2; done']
  - name: wait-for-clickhouse
    image: alpine:3.20
    command: ['sh', '-c', 'until nc -z $CLICKHOUSE_HOST 9000; do echo waiting for clickhouse; sleep 2; done']
```

**stream-processor** (depends on Kafka, Redis, ClickHouse):
```yaml
initContainers:
  - name: wait-for-kafka
    image: alpine:3.20
    command: ['sh', '-c', 'until nc -z $KAFKA_HOST 9092; do echo waiting for kafka; sleep 2; done']
  - name: wait-for-redis
    image: alpine:3.20
    command: ['sh', '-c', 'until nc -z $REDIS_HOST 6379; do echo waiting for redis; sleep 2; done']
  - name: wait-for-clickhouse
    image: alpine:3.20
    command: ['sh', '-c', 'until nc -z $CLICKHOUSE_HOST 9000; do echo waiting for clickhouse; sleep 2; done']
```

**dashboard** (depends on api-server being reachable):
```yaml
initContainers:
  - name: wait-for-api
    image: alpine:3.20
    command: ['sh', '-c', 'until nc -z api-server.infrawhisper.svc.cluster.local 8080; do echo waiting for api-server; sleep 2; done']
```

**ai-engine** — no init containers (stateless, no storage init at startup).

---

### Area 4 — values.dev.yaml (OrbStack Overrides)

Create `deploy/helm/infrawhisper/values.dev.yaml` with mandatory overrides for OrbStack:

```yaml
# OrbStack dev cluster overrides — use with: helm install -f values.yaml -f values.dev.yaml
global:
  imagePullPolicy: Never   # Use locally-built images (no registry push needed)

apiServer:
  replicas: 1
  hpa:
    enabled: false          # OrbStack has no metrics-server by default

collector:
  replicas: 1

streamProcessor:
  replicas: 1

dashboard:
  replicas: 1

aiEngine:
  replicas: 1

agent:
  enabled: true             # Explicitly enable for dev

ingress:
  enabled: true
  className: nginx          # OrbStack uses nginx ingress; Traefik users override to traefik
  host: infrawhisper.local
  tls:
    enabled: false

config:
  postgresHost: host.orbstack.internal   # OrbStack bridge DNS for docker-compose services
  clickhouseHost: host.orbstack.internal
  redisHost: host.orbstack.internal
  kafkaHost: host.orbstack.internal
```

---

### Area 5 — Agent DaemonSet AutoMount

The Rust agent uses `kube-rs` which reads `/var/run/secrets/kubernetes.io/serviceaccount/token` automatically via in-cluster config. This requires `automountServiceAccountToken: true` on the ServiceAccount or Pod spec (Kubernetes default is `true`). The `agent-daemonset.yaml` must either explicitly set this or rely on the default.

**Fix:** Add explicit declaration to `agent-daemonset.yaml`:
```yaml
spec:
  automountServiceAccountToken: true
```

---

### Area 6 — Docker Compose Dev File Fix

`docker-compose.dev.yml` references `Dockerfile.api` on line 7. The actual file is `Dockerfile.api-server`.

**Fix:** Change `dockerfile: Dockerfile.api` → `dockerfile: Dockerfile.api-server`

---

### Area 7 — Smoke Validation Checklist

Run in order after all fixes applied:

```bash
# 1. Start external dependencies
make docker-up
# Wait for all containers healthy (postgres, clickhouse, redis, kafka)

# 2. Build local images (for imagePullPolicy: Never)
make docker-build-go
docker build -t infrawhisper/dashboard:dev ./dashboard
docker build -t infrawhisper/ai-engine:dev ./ai-engine
docker build -t infrawhisper/agent:dev ./agent

# 3. Load images into OrbStack
# (OrbStack shares Docker daemon with K8s — no extra step needed)

# 4. Lint
helm lint deploy/helm/infrawhisper -f deploy/helm/infrawhisper/values.yaml -f deploy/helm/infrawhisper/values.dev.yaml

# 5. Template dry-run
helm template infrawhisper deploy/helm/infrawhisper \
  -f deploy/helm/infrawhisper/values.yaml \
  -f deploy/helm/infrawhisper/values.dev.yaml \
  | kubectl apply --dry-run=client -f -

# 6. Install
helm install infrawhisper deploy/helm/infrawhisper \
  -f deploy/helm/infrawhisper/values.yaml \
  -f deploy/helm/infrawhisper/values.dev.yaml \
  -n infrawhisper --create-namespace

# 7. Verify pods
kubectl get pods -n infrawhisper --watch

# 8. Check probes passing
kubectl describe pod -n infrawhisper -l app=api-server | grep -A5 "Liveness\|Readiness"
kubectl describe pod -n infrawhisper -l app=collector | grep -A5 "Liveness\|Readiness"
kubectl describe pod -n infrawhisper -l app=stream-processor | grep -A5 "Liveness\|Readiness"

# 9. API health check (correct path)
curl http://infrawhisper.local/health      # liveness
curl http://infrawhisper.local/ready       # readiness

# 10. Check logs for errors
kubectl logs -n infrawhisper -l app=api-server --tail=20
kubectl logs -n infrawhisper -l app=collector --tail=20
kubectl logs -n infrawhisper -l app=stream-processor --tail=20
```

**Success criteria:** All pods `Running` + `1/1 Ready` within 2 minutes of install.

---

## 4. Implementation Order

1. **Fix ConfigMap DSN wiring** — add `POSTGRES_DSN`, `CLICKHOUSE_DSN` to `configmap.yaml`; fix `KAFKA_BROKERS` type mismatch in config.go + configmap.yaml
2. **Add HTTP health server to stream-processor** — goroutine in `cmd/stream-processor/main.go` on `:8081`
3. **Add health probes** — collector (tcpSocket), stream-processor (httpGet /health:8081), dashboard (tcpSocket), ai-engine (updated delays)
4. **Add init containers** — per-service dependency mapping (api-server, collector, stream-processor, dashboard)
5. **Create `values.dev.yaml`** — HPA disabled, replicas=1, OrbStack hostnames, agent enabled
6. **Fix agent DaemonSet** — explicit `automountServiceAccountToken: true`
7. **Fix docker-compose.dev.yml** — `Dockerfile.api` → `Dockerfile.api-server`
8. **Update Makefile** — `helm-install-local` target to use `-f values.dev.yaml`
9. **Run smoke validation checklist**

---

## 5. Files to Modify

| File | Change |
|------|--------|
| `internal/config/config.go` | Fix `KAFKA_BROKERS` field type or split logic |
| `cmd/stream-processor/main.go` | Add HTTP health server goroutine on :8081 |
| `deploy/helm/infrawhisper/templates/configmap.yaml` | Add `POSTGRES_DSN`, `CLICKHOUSE_DSN`; fix `KAFKA_BROKERS` |
| `deploy/helm/infrawhisper/templates/collector-deployment.yaml` | Add tcpSocket probes + init containers |
| `deploy/helm/infrawhisper/templates/stream-processor-deployment.yaml` | Add httpGet probes + init containers + port 8081 |
| `deploy/helm/infrawhisper/templates/dashboard-deployment.yaml` | Add tcpSocket probes + init container |
| `deploy/helm/infrawhisper/templates/ai-engine-deployment.yaml` | Increase probe initialDelaySeconds |
| `deploy/helm/infrawhisper/templates/agent-daemonset.yaml` | Add `automountServiceAccountToken: true` |
| `deploy/helm/infrawhisper/values.yaml` | Add health probe config, init container image ref |
| `deploy/helm/infrawhisper/values.dev.yaml` | New: OrbStack-specific overrides |
| `docker-compose.dev.yml` | Fix `Dockerfile.api` → `Dockerfile.api-server` |
| `Makefile` | Update `helm-install-local` to use `-f values.dev.yaml` |

---

## 6. Success Criteria

- `helm lint` passes with no warnings
- `helm template | kubectl apply --dry-run` passes
- All 6 service pods reach `Running/Ready` on OrbStack within 2 minutes
- No crashloops in pod logs
- `GET /health` returns 200; `GET /ready` returns 200
- Agent DaemonSet pod Running on each node
- `GET /health` from all service pods returns 200 via `kubectl exec` or port-forward
