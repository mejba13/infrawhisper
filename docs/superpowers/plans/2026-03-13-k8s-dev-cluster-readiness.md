# K8s Dev Cluster Readiness Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 11 gaps so InfraWhisper installs cleanly on OrbStack with all pods Running/Ready.

**Architecture:** Fix config wiring first (blocking), then add health server to stream-processor, then add probes and init containers to Helm templates, then create dev values override, then smoke-validate end-to-end.

**Tech Stack:** Go 1.23, Helm 3, Kubernetes (OrbStack), chi, zerolog, Viper/mapstructure, alpine:3.20

**Spec:** `docs/superpowers/specs/2026-03-13-k8s-dev-cluster-readiness-design.md`

---

## Chunk 1: Config Wiring Fixes

### Task 1: Fix KAFKA_BROKERS slice unmarshal in config.go

**Problem:** `Kafka.Brokers` is `[]string` but K8s injects `KAFKA_BROKERS` as a plain string (e.g., `"kafka:29092"`). Viper's `AutomaticEnv` reads it as a string, and mapstructure fails to unmarshal it into `[]string` without a decode hook.

**Fix:** Add `mapstructure.StringToSliceHookFunc(",")` decode hook to the `Unmarshal` call. Viper v1.21 uses `github.com/go-viper/mapstructure/v2` (NOT the legacy `mitchellh/mapstructure`).

> Note: `StringToSliceHookFunc(",")` on `"kafka:29092"` (no comma) correctly produces `["kafka:29092"]` — single-element slice, which is the desired behavior.

**Files:**
- Modify: `internal/config/config.go`

- [ ] **Step 1: Add mapstructure import and decode hook**

Edit `internal/config/config.go`. Change the import block:

```go
import (
    "fmt"
    "strings"

    "github.com/go-viper/mapstructure/v2"
    "github.com/spf13/viper"
)
```

Replace line 67:
```go
if err := v.Unmarshal(&cfg); err != nil {
```
With:
```go
if err := v.Unmarshal(&cfg, func(dc *mapstructure.DecoderConfig) {
    dc.DecodeHook = mapstructure.ComposeDecodeHookFunc(
        mapstructure.StringToSliceHookFunc(","),
        dc.DecodeHook,
    )
}); err != nil {
```

- [ ] **Step 2: Verify correct mapstructure package is in go.mod**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
grep "go-viper/mapstructure" go.mod
```

Expected: `github.com/go-viper/mapstructure/v2 v2.x.x` (indirect). It is a Viper v1.21 transitive dep.

- [ ] **Step 3: Build to confirm no compile errors**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
go build ./internal/config/...
```

Expected: no output (clean build).

- [ ] **Step 4: Commit**

```bash
git add internal/config/config.go
git commit -m "fix(config): add StringToSliceHookFunc (go-viper/mapstructure/v2) so KAFKA_BROKERS works in K8s"
```

---

### Task 2: Fix ConfigMap and Secret — add POSTGRES_DSN, CLICKHOUSE_DSN

**Problem:** `configmap.yaml` emits individual fields (`POSTGRES_HOST`, `POSTGRES_PORT`, etc.) but `config.go` reads `POSTGRES_DSN` and `CLICKHOUSE_DSN` as single DSN strings. All Go services start with empty DSNs and crash on first DB connection.

**Fix:**
- `POSTGRES_DSN` (contains password) → goes into `secrets.yaml` (Secret), not ConfigMap
- `CLICKHOUSE_DSN` (no password in default setup) → goes into `configmap.yaml`
- Non-sensitive fields: replace decomposed host/port/db fields with the above two keys plus REDIS_ADDR, KAFKA_BROKERS, KAFKA_GROUP_ID, LOG_LEVEL, AI_ENGINE_URL

**Files:**
- Modify: `deploy/helm/infrawhisper/templates/configmap.yaml`
- Modify: `deploy/helm/infrawhisper/templates/secrets.yaml`

- [ ] **Step 1: Read current secrets.yaml**

```bash
cat "deploy/helm/infrawhisper/templates/secrets.yaml"
```

Note the existing keys (POSTGRES_PASSWORD, JWT_SECRET, etc.) — do not remove any.

- [ ] **Step 2: Add POSTGRES_DSN to secrets.yaml**

In `deploy/helm/infrawhisper/templates/secrets.yaml`, inside the `stringData:` block (NOT `data:`), add. Do NOT use `b64enc` — `stringData:` values are plain text and Kubernetes handles base64 encoding automatically:

```yaml
  POSTGRES_DSN: {{ printf "postgres://%s:%s@%s:%s/%s?sslmode=disable" .Values.config.postgresUser .Values.secrets.postgresPassword .Values.config.postgresHost .Values.config.postgresPort .Values.config.postgresDb | quote }}
```

- [ ] **Step 3: Replace configmap.yaml data block**

Replace the full `data:` block in `deploy/helm/infrawhisper/templates/configmap.yaml` with:

```yaml
data:
  CLICKHOUSE_DSN: {{ printf "clickhouse://%s:%s/%s" .Values.config.clickhouseHost .Values.config.clickhousePort .Values.config.clickhouseDb | quote }}
  REDIS_ADDR: {{ .Values.config.redisAddr | quote }}
  KAFKA_BROKERS: {{ .Values.config.kafkaBrokers | quote }}
  KAFKA_GROUP_ID: {{ .Values.config.kafkaGroupId | quote }}
  LOG_LEVEL: {{ .Values.config.logLevel | quote }}
  AI_ENGINE_URL: {{ .Values.config.aiEngineUrl | quote }}
```

- [ ] **Step 4: Helm template dry-run to verify rendering**

```bash
helm template infrawhisper deploy/helm/infrawhisper/ | grep -E "POSTGRES_DSN|CLICKHOUSE_DSN|KAFKA_BROKERS"
```

Expected: `CLICKHOUSE_DSN` in the ConfigMap output, `POSTGRES_DSN` in the Secret output (base64-encoded value).

- [ ] **Step 5: Commit**

```bash
git add deploy/helm/infrawhisper/templates/configmap.yaml deploy/helm/infrawhisper/templates/secrets.yaml
git commit -m "fix(helm): add POSTGRES_DSN to Secret, CLICKHOUSE_DSN to ConfigMap to match config.go expectations"
```

---

### Task 3: Verify and patch values.yaml config section

**Goal:** Ensure all keys referenced by the new configmap.yaml exist in `values.yaml` with correct defaults for local/dev use.

**Files:**
- Modify: `deploy/helm/infrawhisper/values.yaml`

- [ ] **Step 1: Read the full config section of values.yaml**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
grep -A40 "^config:" deploy/helm/infrawhisper/values.yaml
```

- [ ] **Step 2: Add missing keys to values.yaml**

The following keys are REQUIRED by the updated configmap.yaml/secrets.yaml. Add any that are missing to the `config:` section. Do not remove existing keys.

```yaml
config:
  postgresHost: "postgres"
  postgresPort: "5432"
  postgresDb: "infrawhisper"
  postgresUser: "infrawhisper"
  clickhouseHost: "clickhouse"
  clickhousePort: "9000"
  clickhouseDb: "infrawhisper"
  redisAddr: "redis:6379"
  kafkaBrokers: "kafka:29092"
  kafkaGroupId: "infrawhisper"    # ADD THIS — was missing
  logLevel: "info"
  aiEngineUrl: "http://ai-engine:8001"
```

Also ensure the `secrets:` section has `postgresPassword`:

```yaml
secrets:
  postgresPassword: "infrawhisper"
```

- [ ] **Step 3: Helm lint**

```bash
helm lint deploy/helm/infrawhisper/
```

Expected: `1 chart(s) linted, 0 chart(s) failed`

- [ ] **Step 4: Commit**

```bash
git add deploy/helm/infrawhisper/values.yaml
git commit -m "fix(helm): add kafkaGroupId and ensure all config keys present in values.yaml"
```

---

## Chunk 2: Stream-Processor Health Server

### Task 4: Add minimal HTTP health server to stream-processor

**Problem:** `cmd/stream-processor/main.go` has no HTTP server. Without it, K8s has no way to probe liveness/readiness and will mark the pod as unhealthy.

**Fix:** Start a health goroutine on `:8081` that responds `{"status":"ok"}` to `GET /health` before the Kafka consumer loop starts.

**Files:**
- Modify: `cmd/stream-processor/main.go`

- [ ] **Step 1: Add net/http import**

In `cmd/stream-processor/main.go`, add `"net/http"` to the import block.

- [ ] **Step 2: Add health server with graceful shutdown**

The health server must be wired into the existing SIGTERM shutdown sequence so it doesn't get orphaned. Replace the `main()` body structure as follows.

After `consumer` is initialised (line ~43) and before `ctx, cancel`, insert the health server setup. Then wire shutdown after `<-quit`:

```go
// Health server for K8s liveness/readiness probes
healthSrv := &http.Server{Addr: ":8081"}
mux := http.NewServeMux()
mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"status":"ok"}`))
})
healthSrv.Handler = mux
go func() {
    if err := healthSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        log.Error().Err(err).Msg("health server error")
    }
}()

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
shutCtx, shutCancel := context.WithTimeout(context.Background(), 5*time.Second)
defer shutCancel()
healthSrv.Shutdown(shutCtx)
log.Info().Msg("stream processor shutdown complete")
```

Also add `"time"` to the import block.

- [ ] **Step 3: Build to confirm no compile errors**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
go build -o /dev/null ./cmd/stream-processor/
```

Expected: no output (clean build).

- [ ] **Step 4: Commit**

```bash
git add cmd/stream-processor/main.go
git commit -m "feat(stream-processor): add HTTP health server on :8081 with graceful shutdown for K8s probes"
```

---

## Chunk 3: Health Probes in Helm Templates

### Task 5: Add probes to collector-deployment.yaml

**Fix:** tcpSocket probe using the named port `otlp-grpc` (already defined in the collector ports block — confirming the gRPC listener is up).

**Files:**
- Modify: `deploy/helm/infrawhisper/templates/collector-deployment.yaml`

- [ ] **Step 1: Add probes to collector-deployment.yaml**

After the `resources:` block, add (use named port `otlp-grpc` which is already declared on the container):

```yaml
            livenessProbe:
              tcpSocket:
                port: otlp-grpc
              initialDelaySeconds: 15
              periodSeconds: 20
              failureThreshold: 3
            readinessProbe:
              tcpSocket:
                port: otlp-grpc
              initialDelaySeconds: 5
              periodSeconds: 10
              failureThreshold: 3
```

- [ ] **Step 2: Helm template check**

```bash
helm template infrawhisper deploy/helm/infrawhisper/ | grep -A10 "name: collector" | grep -A5 "livenessProbe\|readinessProbe"
```

Expected: tcpSocket probe blocks with `port: otlp-grpc` visible.

- [ ] **Step 3: Commit**

```bash
git add deploy/helm/infrawhisper/templates/collector-deployment.yaml
git commit -m "feat(helm): add tcpSocket liveness/readiness probes to collector"
```

---

### Task 6: Add probes and health port to stream-processor-deployment.yaml

**Fix:** httpGet probe on `:8081/health` (enabled by the goroutine added in Task 4). Also expose port 8081 in the container spec.

**Files:**
- Modify: `deploy/helm/infrawhisper/templates/stream-processor-deployment.yaml`

- [ ] **Step 1: Add health port and probes to stream-processor-deployment.yaml**

After `imagePullPolicy` line (line 23), add a `ports:` block, then after `resources:` add probes:

```yaml
            ports:
              - containerPort: 8081
                name: health
```

After the `resources:` block, add:

```yaml
            livenessProbe:
              httpGet:
                path: /health
                port: health
              initialDelaySeconds: 15
              periodSeconds: 20
              failureThreshold: 3
            readinessProbe:
              httpGet:
                path: /health
                port: health
              initialDelaySeconds: 5
              periodSeconds: 10
              failureThreshold: 3
```

- [ ] **Step 2: Helm template check**

```bash
helm template infrawhisper deploy/helm/infrawhisper/ | grep -A15 "name: stream-processor" | grep -A5 "livenessProbe\|readinessProbe"
```

- [ ] **Step 3: Commit**

```bash
git add deploy/helm/infrawhisper/templates/stream-processor-deployment.yaml
git commit -m "feat(helm): add httpGet liveness/readiness probes to stream-processor on :8081"
```

---

### Task 7: Add probes to dashboard-deployment.yaml

**Fix:** tcpSocket probe on port 3000 (safest for Next.js standalone — avoids fragile route dependency).

**Files:**
- Modify: `deploy/helm/infrawhisper/templates/dashboard-deployment.yaml`

- [ ] **Step 1: Add probes after resources block**

After the `resources:` block in `dashboard-deployment.yaml`, add:

```yaml
            livenessProbe:
              tcpSocket:
                port: {{ .Values.dashboard.port }}
              initialDelaySeconds: 15
              periodSeconds: 20
              failureThreshold: 3
            readinessProbe:
              tcpSocket:
                port: {{ .Values.dashboard.port }}
              initialDelaySeconds: 10
              periodSeconds: 10
              failureThreshold: 3
```

- [ ] **Step 2: Helm template check**

```bash
helm template infrawhisper deploy/helm/infrawhisper/ | grep -A10 "name: dashboard" | grep -A5 "livenessProbe\|readinessProbe"
```

- [ ] **Step 3: Commit**

```bash
git add deploy/helm/infrawhisper/templates/dashboard-deployment.yaml
git commit -m "feat(helm): add tcpSocket liveness/readiness probes to dashboard"
```

---

### Task 8: Fix ai-engine probe delays

**Fix:** Increase `initialDelaySeconds` for liveness (15→30) and readiness (10→20) to allow Python/FastAPI cold start.

**Files:**
- Modify: `deploy/helm/infrawhisper/templates/ai-engine-deployment.yaml`

- [ ] **Step 1: Update initialDelaySeconds in ai-engine-deployment.yaml**

In `ai-engine-deployment.yaml`:
- Line 36: change `initialDelaySeconds: 15` → `initialDelaySeconds: 30`
- Line 42: change `initialDelaySeconds: 10` → `initialDelaySeconds: 20`

- [ ] **Step 2: Helm template check**

```bash
helm template infrawhisper deploy/helm/infrawhisper/ | grep -A20 "name: ai-engine" | grep "initialDelaySeconds"
```

Expected: `30` for liveness, `20` for readiness.

- [ ] **Step 3: Commit**

```bash
git add deploy/helm/infrawhisper/templates/ai-engine-deployment.yaml
git commit -m "fix(helm): increase ai-engine probe delays for Python cold start (30s/20s)"
```

---

## Chunk 4: Init Containers

### Task 9: Add init containers to api-server, collector, stream-processor, dashboard

**Goal:** Prevent crashloops by holding each service until its dependencies are reachable. Uses `alpine:3.20` (already used by Go/Rust services) with `nc` TCP check.

**Files:**
- Modify: `deploy/helm/infrawhisper/templates/api-server-deployment.yaml`
- Modify: `deploy/helm/infrawhisper/templates/collector-deployment.yaml`
- Modify: `deploy/helm/infrawhisper/templates/stream-processor-deployment.yaml`
- Modify: `deploy/helm/infrawhisper/templates/dashboard-deployment.yaml`

**Dependency mapping:**
- `api-server` → waits for Postgres (:5432), Redis (:6379)
- `collector` → waits for Kafka (:9092), ClickHouse (:9000)
- `stream-processor` → waits for Kafka (:9092), Redis (:6379), ClickHouse (:9000)
- `dashboard` → waits for api-server (:8080)

Use block-string `command` form to avoid YAML single-quote escaping issues:

- [ ] **Step 1: Add init containers to api-server-deployment.yaml**

In `deploy/helm/infrawhisper/templates/api-server-deployment.yaml`, add before the `containers:` block (inside `spec:`):

```yaml
        initContainers:
          - name: wait-for-postgres
            image: alpine:3.20
            command:
              - sh
              - -c
              - |
                until nc -z {{ .Values.config.postgresHost }} {{ .Values.config.postgresPort }}; do
                  echo "waiting for postgres"; sleep 2
                done
          - name: wait-for-redis
            image: alpine:3.20
            command:
              - sh
              - -c
              - |
                REDIS_HOST=$(echo "{{ .Values.config.redisAddr }}" | cut -d: -f1)
                REDIS_PORT=$(echo "{{ .Values.config.redisAddr }}" | cut -d: -f2)
                until nc -z "$REDIS_HOST" "$REDIS_PORT"; do
                  echo "waiting for redis"; sleep 2
                done
```

- [ ] **Step 2: Add init containers to collector-deployment.yaml**

In `deploy/helm/infrawhisper/templates/collector-deployment.yaml`, add before `containers:`:

```yaml
        initContainers:
          - name: wait-for-kafka
            image: alpine:3.20
            command:
              - sh
              - -c
              - |
                KAFKA_HOST=$(echo "{{ .Values.config.kafkaBrokers }}" | cut -d: -f1)
                KAFKA_PORT=$(echo "{{ .Values.config.kafkaBrokers }}" | cut -d: -f2)
                until nc -z "$KAFKA_HOST" "$KAFKA_PORT"; do
                  echo "waiting for kafka"; sleep 2
                done
          - name: wait-for-clickhouse
            image: alpine:3.20
            command:
              - sh
              - -c
              - |
                until nc -z {{ .Values.config.clickhouseHost }} {{ .Values.config.clickhousePort }}; do
                  echo "waiting for clickhouse"; sleep 2
                done
```

- [ ] **Step 3: Add init containers to stream-processor-deployment.yaml**

In `deploy/helm/infrawhisper/templates/stream-processor-deployment.yaml`, add before `containers:`:

```yaml
        initContainers:
          - name: wait-for-kafka
            image: alpine:3.20
            command:
              - sh
              - -c
              - |
                KAFKA_HOST=$(echo "{{ .Values.config.kafkaBrokers }}" | cut -d: -f1)
                KAFKA_PORT=$(echo "{{ .Values.config.kafkaBrokers }}" | cut -d: -f2)
                until nc -z "$KAFKA_HOST" "$KAFKA_PORT"; do
                  echo "waiting for kafka"; sleep 2
                done
          - name: wait-for-redis
            image: alpine:3.20
            command:
              - sh
              - -c
              - |
                REDIS_HOST=$(echo "{{ .Values.config.redisAddr }}" | cut -d: -f1)
                REDIS_PORT=$(echo "{{ .Values.config.redisAddr }}" | cut -d: -f2)
                until nc -z "$REDIS_HOST" "$REDIS_PORT"; do
                  echo "waiting for redis"; sleep 2
                done
          - name: wait-for-clickhouse
            image: alpine:3.20
            command:
              - sh
              - -c
              - |
                until nc -z {{ .Values.config.clickhouseHost }} {{ .Values.config.clickhousePort }}; do
                  echo "waiting for clickhouse"; sleep 2
                done
```

- [ ] **Step 4: Add init container to dashboard-deployment.yaml**

In `deploy/helm/infrawhisper/templates/dashboard-deployment.yaml`, add before `containers:`:

```yaml
        initContainers:
          - name: wait-for-api
            image: alpine:3.20
            command:
              - sh
              - -c
              - |
                until nc -z api-server.{{ .Values.global.namespace }}.svc.cluster.local {{ .Values.apiServer.service.port }}; do
                  echo "waiting for api-server"; sleep 2
                done
```

- [ ] **Step 5: Helm template check — init containers appear**

```bash
helm template infrawhisper deploy/helm/infrawhisper/ | grep -c "initContainers"
```

Expected: `4` (one per service that has init containers).

- [ ] **Step 6: Helm lint**

```bash
helm lint deploy/helm/infrawhisper/
```

Expected: `0 chart(s) failed`

- [ ] **Step 7: Commit**

```bash
git add deploy/helm/infrawhisper/templates/api-server-deployment.yaml \
        deploy/helm/infrawhisper/templates/collector-deployment.yaml \
        deploy/helm/infrawhisper/templates/stream-processor-deployment.yaml \
        deploy/helm/infrawhisper/templates/dashboard-deployment.yaml
git commit -m "feat(helm): add init containers for dependency readiness checks (pg, redis, kafka, ch)"
```

---

## Chunk 5: Dev Values, Agent Fix, Misc Fixes

### Task 10: Create values.dev.yaml for OrbStack

**Goal:** Override defaults that break on OrbStack (HPA requires metrics-server, image pull from registry requires auth, ingress class varies).

**Files:**
- Create: `deploy/helm/infrawhisper/values.dev.yaml`

- [ ] **Step 1: Create values.dev.yaml**

```yaml
# OrbStack dev cluster overrides
# Usage: make helm-install-local
# Or manually: helm upgrade --install infrawhisper deploy/helm/infrawhisper/ \
#   -f deploy/helm/infrawhisper/values.yaml \
#   -f deploy/helm/infrawhisper/values.dev.yaml

global:
  image:
    pullPolicy: Never   # Use locally-built images; OrbStack shares Docker daemon with K8s

apiServer:
  replicas: 1
  hpa:
    enabled: false       # OrbStack has no metrics-server by default

collector:
  replicas: 1

streamProcessor:
  replicas: 1

dashboard:
  replicas: 1

aiEngine:
  replicas: 1

agent:
  enabled: true

ingress:
  enabled: true
  className: nginx
  host: infrawhisper.local
  tls:
    enabled: false

config:
  # OrbStack bridge DNS — exposes docker-compose services to K8s pods
  postgresHost: "host.orbstack.internal"
  clickhouseHost: "host.orbstack.internal"
  redisAddr: "host.orbstack.internal:6379"
  kafkaBrokers: "host.orbstack.internal:9092"   # 9092 = PLAINTEXT_HOST (external) listener
```

- [ ] **Step 2: Helm lint with both value files**

```bash
helm lint deploy/helm/infrawhisper/ \
  -f deploy/helm/infrawhisper/values.yaml \
  -f deploy/helm/infrawhisper/values.dev.yaml
```

Expected: `0 chart(s) failed`

- [ ] **Step 3: Commit**

```bash
git add deploy/helm/infrawhisper/values.dev.yaml
git commit -m "feat(helm): add values.dev.yaml for OrbStack dev cluster (HPA off, local images)"
```

---

### Task 11: Fix agent-daemonset.yaml — explicit automountServiceAccountToken

**Goal:** Make the SA token mount explicit so it works even on clusters with the default changed to false.

**Files:**
- Modify: `deploy/helm/infrawhisper/templates/agent-daemonset.yaml`

- [ ] **Step 1: Add automountServiceAccountToken to pod spec**

In `agent-daemonset.yaml`, after `serviceAccountName: infrawhisper-agent` (line 19), add:

```yaml
        automountServiceAccountToken: true
```

- [ ] **Step 2: Helm template check**

```bash
helm template infrawhisper deploy/helm/infrawhisper/ -f deploy/helm/infrawhisper/values.yaml -f deploy/helm/infrawhisper/values.dev.yaml | grep -A5 "infrawhisper-agent" | grep "automount"
```

Expected: `automountServiceAccountToken: true`

- [ ] **Step 3: Commit**

```bash
git add deploy/helm/infrawhisper/templates/agent-daemonset.yaml
git commit -m "fix(helm): explicit automountServiceAccountToken: true on agent DaemonSet"
```

---

### Task 12: Fix docker-compose.dev.yml wrong Dockerfile name

**Files:**
- Modify: `docker-compose.dev.yml`

- [ ] **Step 1: Fix line 7**

Change `dockerfile: Dockerfile.api` → `dockerfile: Dockerfile.api-server`

- [ ] **Step 2: Verify**

```bash
grep "dockerfile:" docker-compose.dev.yml
```

Expected: `dockerfile: Dockerfile.api-server`

- [ ] **Step 3: Commit**

```bash
git add docker-compose.dev.yml
git commit -m "fix(docker): correct Dockerfile name in docker-compose.dev.yml (api → api-server)"
```

---

### Task 13: Fix orbstack-init.sh and Makefile helm-install-local target

**Problem:** `orbstack-init.sh` currently calls `helm upgrade --install` with `--set` overrides using `host.docker.internal`. The Makefile target also calls `helm upgrade`. Running both causes a double-install with conflicting values. Standardize on one: `orbstack-init.sh` does setup only (namespace, RBAC prep), the Makefile does the single helm install using `values.dev.yaml`.

**Files:**
- Modify: `deploy/k8s/orbstack-init.sh`
- Modify: `Makefile`

- [ ] **Step 1: Read current orbstack-init.sh**

```bash
cat "deploy/k8s/orbstack-init.sh"
```

Identify which lines run `helm upgrade` and which do other setup (kubectl namespace creation, context switching, etc.).

- [ ] **Step 2: Remove helm upgrade from orbstack-init.sh**

Remove (or comment out) any `helm upgrade` / `helm install` lines from `orbstack-init.sh`. Keep only non-helm setup steps (e.g., `kubectl config use-context`, `kubectl create namespace`, image loads if any). Add a comment:

```bash
# Helm install is handled by 'make helm-install-local' — do not add helm commands here
```

- [ ] **Step 3: Update helm-install-local in Makefile**

Replace lines 54-56 in `Makefile`:

```makefile
helm-install-local:
	bash deploy/k8s/orbstack-init.sh
```

With:

```makefile
helm-install-local:
	bash deploy/k8s/orbstack-init.sh
	helm upgrade --install infrawhisper deploy/helm/infrawhisper/ \
		-f deploy/helm/infrawhisper/values.yaml \
		-f deploy/helm/infrawhisper/values.dev.yaml \
		--namespace infrawhisper \
		--create-namespace \
		--wait \
		--timeout 5m
```

- [ ] **Step 4: Verify Makefile syntax**

```bash
make --dry-run helm-install-local 2>&1 | head -15
```

Expected: prints the shell commands (orbstack-init.sh call + helm upgrade) without executing them.

- [ ] **Step 5: Commit**

```bash
git add Makefile deploy/k8s/orbstack-init.sh
git commit -m "fix(makefile,orbstack): single helm install via Makefile with values.dev.yaml; remove duplicate from init script"
```

---

## Chunk 6: Smoke Validation

### Task 14: Full helm lint and template dry-run

- [ ] **Step 1: helm lint with both value files**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
helm lint deploy/helm/infrawhisper/ \
  -f deploy/helm/infrawhisper/values.yaml \
  -f deploy/helm/infrawhisper/values.dev.yaml
```

Expected: `1 chart(s) linted, 0 chart(s) failed`

- [ ] **Step 2: helm template dry-run**

```bash
helm template infrawhisper deploy/helm/infrawhisper/ \
  -f deploy/helm/infrawhisper/values.yaml \
  -f deploy/helm/infrawhisper/values.dev.yaml \
  | kubectl apply --dry-run=client -f -
```

Expected: All resources show `configured (dry run)` or `created (dry run)`. Zero errors.

---

### Task 15: Deploy to OrbStack and verify all pods

**Prerequisites:** OrbStack running, `make docker-up` completed (Postgres, ClickHouse, Redis, Kafka healthy), local images built with `make docker-build-go`.

- [ ] **Step 1: Start external dependencies**

```bash
make docker-up
```

Wait until all containers are healthy:
```bash
docker compose ps
```

Expected: all show `healthy` state.

- [ ] **Step 2: Build all local images**

```bash
make docker-build-go
docker build -f dashboard/Dockerfile -t infrawhisper/dashboard:local ./dashboard
docker build -f ai-engine/Dockerfile -t infrawhisper/ai-engine:local ./ai-engine
docker build -f agent/Dockerfile -t infrawhisper/agent:local ./agent
```

- [ ] **Step 3: Update values.dev.yaml image tags to :local**

Add image tag overrides to `values.dev.yaml`:
```yaml
apiServer:
  image:
    repository: infrawhisper/api-server
    tag: local

collector:
  image:
    repository: infrawhisper/collector
    tag: local

streamProcessor:
  image:
    repository: infrawhisper/stream-processor
    tag: local

dashboard:
  image:
    repository: infrawhisper/dashboard
    tag: local

aiEngine:
  image:
    repository: infrawhisper/ai-engine
    tag: local

agent:
  image:
    repository: infrawhisper/agent
    tag: local
```

- [ ] **Step 4: Install**

```bash
make helm-install-local
```

Expected: helm waits for all pods to become ready (--wait --timeout 5m). Watch progress:
```bash
kubectl get pods -n infrawhisper --watch
```

- [ ] **Step 5: Verify all pods Running/Ready**

```bash
kubectl get pods -n infrawhisper
```

Expected output (all `1/1 Running`):
```
NAME                                READY   STATUS    RESTARTS   AGE
api-server-xxx                      1/1     Running   0          2m
collector-xxx                       1/1     Running   0          2m
stream-processor-xxx                1/1     Running   0          2m
dashboard-xxx                       1/1     Running   0          2m
ai-engine-xxx                       1/1     Running   0          2m
infrawhisper-agent-xxx              1/1     Running   0          2m
```

- [ ] **Step 6: Check probes passing**

```bash
kubectl describe pods -n infrawhisper | grep -E "Liveness|Readiness|probe" | grep -v "^#"
```

Expected: no `Unhealthy` or `Failed` probe events.

- [ ] **Step 7: Health check via API**

```bash
# Port-forward api-server if ingress is not set up
kubectl port-forward -n infrawhisper svc/api-server 8080:8080 &
sleep 2
curl -s http://localhost:8080/health
curl -s http://localhost:8080/ready
kill %1
```

Expected: `{"status":"ok"}` or similar 200 response.

- [ ] **Step 8: Check logs for errors**

```bash
kubectl logs -n infrawhisper -l app=api-server --tail=20
kubectl logs -n infrawhisper -l app=collector --tail=20
kubectl logs -n infrawhisper -l app=stream-processor --tail=20
```

Expected: No `FATAL`, `panic`, or connection refused errors.

- [ ] **Step 9: Final commit**

```bash
git add deploy/helm/infrawhisper/values.dev.yaml
git commit -m "feat(helm): add local image tags to values.dev.yaml for OrbStack"
```

---

## Summary

| Task | File(s) | Type |
|------|---------|------|
| 1 | `internal/config/config.go` | Fix KAFKA_BROKERS slice decode |
| 2 | `templates/configmap.yaml` | Replace with DSN-based config |
| 3 | `values.yaml` | Verify/patch config section |
| 4 | `cmd/stream-processor/main.go` | Add HTTP health server |
| 5 | `templates/collector-deployment.yaml` | Add tcpSocket probes |
| 6 | `templates/stream-processor-deployment.yaml` | Add httpGet probes |
| 7 | `templates/dashboard-deployment.yaml` | Add tcpSocket probes |
| 8 | `templates/ai-engine-deployment.yaml` | Fix probe delays |
| 9 | 4 deployment templates | Add init containers |
| 10 | `values.dev.yaml` (new) | OrbStack dev overrides |
| 11 | `templates/agent-daemonset.yaml` | automountServiceAccountToken |
| 12 | `docker-compose.dev.yml` | Fix Dockerfile name |
| 13 | `Makefile` | Update helm-install-local |
| 14–15 | — | Smoke validation |
