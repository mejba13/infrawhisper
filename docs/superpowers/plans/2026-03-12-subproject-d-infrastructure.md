# InfraWhisper Sub-project D: Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build production-grade infrastructure: multi-stage Dockerfiles for Go services, a complete Helm chart for Kubernetes deployment, GitHub Actions CI/CD pipelines, an OrbStack local K8s setup script, and a Rust agent skeleton.

**Architecture:** Three layers — local dev (docker-compose, already done), local K8s (OrbStack + Helm), and CI/CD (GitHub Actions). The Helm chart uses a parent chart with per-service sub-charts sharing a single values.yaml. The Rust agent is a `cargo new` skeleton with a basic OTLP gRPC exporter stub and Kubernetes watcher placeholder — no full implementation, just the project scaffold with correct Cargo.toml dependencies.

**Tech Stack:** Docker multi-stage builds (golang:1.23-alpine, node:20-alpine, python:3.12-slim), Helm 3 (Kubernetes 1.28+), GitHub Actions, Rust 1.77+ (tokio, tonic, kube-rs), OrbStack (local K8s)

---

## File Structure

```
deploy/
  helm/
    infrawhisper/
      Chart.yaml                    # parent chart metadata
      values.yaml                   # all service values, single source of truth
      templates/
        _helpers.tpl                # shared template helpers (name, labels, selector)
        namespace.yaml              # infrawhisper namespace
        serviceaccount.yaml         # shared service account
        # api-server
        api-server-deployment.yaml
        api-server-service.yaml
        api-server-hpa.yaml
        # collector
        collector-deployment.yaml
        collector-service.yaml
        # stream-processor
        stream-processor-deployment.yaml
        # dashboard
        dashboard-deployment.yaml
        dashboard-service.yaml
        # ai-engine
        ai-engine-deployment.yaml
        ai-engine-service.yaml
        # secrets
        secrets.yaml                # ExternalSecret or Secret template
        # configmap
        configmap.yaml              # shared env config
        # ingress
        ingress.yaml                # nginx ingress for dashboard + api
  k8s/
    orbstack-init.sh                # OrbStack local cluster bootstrap script

agent/                              # Rust agent skeleton
  Cargo.toml
  src/
    main.rs
    collector.rs                    # OTLP gRPC stub
    watcher.rs                      # kube-rs pod watcher stub
    config.rs                       # config from env

.github/
  workflows/
    ci.yml                          # lint + test + build on PR
    release.yml                     # tag → docker build + push + helm package
    security.yml                    # weekly trivy scan

Dockerfile.api-server               # multi-stage Go build for api-server
Dockerfile.collector                # multi-stage Go build for collector
Dockerfile.stream-processor         # multi-stage Go build for stream-processor
```

---

## Chunk 1: Multi-stage Go Dockerfiles

### Task 1: Production Dockerfiles for all three Go binaries

**Files:**
- Create: `Dockerfile.api-server`
- Create: `Dockerfile.collector`
- Create: `Dockerfile.stream-processor`

- [ ] **Step 1: Create `Dockerfile.api-server`**

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.23-alpine AS builder
WORKDIR /src
RUN apk add --no-cache ca-certificates git gcc musl-dev
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build \
    -ldflags="-s -w -extldflags '-static'" \
    -o /out/api-server ./cmd/api-server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /out/api-server .
EXPOSE 8080
USER nobody
ENTRYPOINT ["./api-server"]
```

Note: CGO_ENABLED=1 is required because confluent-kafka-go uses CGO. `-extldflags '-static'` produces a fully static binary.

- [ ] **Step 2: Create `Dockerfile.collector`**

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.23-alpine AS builder
WORKDIR /src
RUN apk add --no-cache ca-certificates git gcc musl-dev
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build \
    -ldflags="-s -w -extldflags '-static'" \
    -o /out/collector ./cmd/collector

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /out/collector .
EXPOSE 4317
USER nobody
ENTRYPOINT ["./collector"]
```

- [ ] **Step 3: Create `Dockerfile.stream-processor`**

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.23-alpine AS builder
WORKDIR /src
RUN apk add --no-cache ca-certificates git gcc musl-dev
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build \
    -ldflags="-s -w -extldflags '-static'" \
    -o /out/stream-processor ./cmd/stream-processor

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /out/stream-processor .
USER nobody
ENTRYPOINT ["./stream-processor"]
```

- [ ] **Step 4: Verify the api-server Dockerfile builds**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
docker build -f Dockerfile.api-server -t infrawhisper/api-server:local . 2>&1 | tail -5
```

Expected: `Successfully built` or similar. If the build fails due to CGO/librdkafka, add `RUN apk add --no-cache librdkafka-dev` before the `go build` line.

- [ ] **Step 5: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add Dockerfile.api-server Dockerfile.collector Dockerfile.stream-processor
git commit -m "feat(infra): multi-stage production Dockerfiles for Go services"
```

---

## Chunk 2: Helm Chart

### Task 2: Helm chart skeleton — Chart.yaml, values.yaml, helpers

**Files:**
- Create: `deploy/helm/infrawhisper/Chart.yaml`
- Create: `deploy/helm/infrawhisper/values.yaml`
- Create: `deploy/helm/infrawhisper/templates/_helpers.tpl`
- Create: `deploy/helm/infrawhisper/templates/namespace.yaml`
- Create: `deploy/helm/infrawhisper/templates/serviceaccount.yaml`
- Create: `deploy/helm/infrawhisper/templates/configmap.yaml`
- Create: `deploy/helm/infrawhisper/templates/secrets.yaml`

- [ ] **Step 1: Create `deploy/helm/infrawhisper/Chart.yaml`**

```yaml
apiVersion: v2
name: infrawhisper
description: AI-powered Kubernetes observability SaaS
type: application
version: 0.1.0
appVersion: "0.1.0"
keywords:
  - observability
  - kubernetes
  - ai
maintainers:
  - name: InfraWhisper Team
```

- [ ] **Step 2: Create `deploy/helm/infrawhisper/values.yaml`**

```yaml
global:
  image:
    registry: ghcr.io/infrawhisper
    pullPolicy: IfNotPresent
  namespace: infrawhisper

apiServer:
  image:
    repository: ghcr.io/infrawhisper/api-server
    tag: latest
  replicas: 2
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi
  port: 8080
  service:
    type: ClusterIP
    port: 8080
  hpa:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

collector:
  image:
    repository: ghcr.io/infrawhisper/collector
    tag: latest
  replicas: 1
  resources:
    requests:
      cpu: 100m
      memory: 64Mi
    limits:
      cpu: 200m
      memory: 256Mi
  port: 4317
  service:
    type: ClusterIP
    port: 4317

streamProcessor:
  image:
    repository: ghcr.io/infrawhisper/stream-processor
    tag: latest
  replicas: 1
  resources:
    requests:
      cpu: 100m
      memory: 64Mi
    limits:
      cpu: 300m
      memory: 256Mi

dashboard:
  image:
    repository: ghcr.io/infrawhisper/dashboard
    tag: latest
  replicas: 1
  resources:
    requests:
      cpu: 50m
      memory: 128Mi
    limits:
      cpu: 200m
      memory: 256Mi
  port: 3000
  service:
    type: ClusterIP
    port: 3000

aiEngine:
  image:
    repository: ghcr.io/infrawhisper/ai-engine
    tag: latest
  replicas: 1
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  port: 8001
  service:
    type: ClusterIP
    port: 8001

ingress:
  enabled: true
  className: nginx
  host: infrawhisper.local
  tls:
    enabled: false
    secretName: infrawhisper-tls

config:
  postgresHost: postgres
  postgresPort: "5432"
  postgresDb: infrawhisper
  postgresUser: infrawhisper
  clickhouseHost: clickhouse
  clickhousePort: "9000"
  clickhouseDb: infrawhisper
  redisAddr: "redis:6379"
  kafkaBrokers: "kafka:29092"
  logLevel: info
  aiEngineUrl: "http://ai-engine:8001"
  jwtSecret: ""  # override with --set or secrets.yaml

secrets:
  # set via --set secrets.postgresPassword=xxx or external secret manager
  postgresPassword: ""
  anthropicApiKey: ""
  jwtSecret: "change-me-in-production"
```

- [ ] **Step 3: Create `deploy/helm/infrawhisper/templates/_helpers.tpl`**

```
{{/*
Expand the name of the chart.
*/}}
{{- define "infrawhisper.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "infrawhisper.labels" -}}
helm.sh/chart: {{ include "infrawhisper.name" . }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: infrawhisper
{{- end }}

{{/*
Selector labels for a component
*/}}
{{- define "infrawhisper.selectorLabels" -}}
app.kubernetes.io/name: {{ .component }}
app.kubernetes.io/instance: {{ .release }}
{{- end }}

{{/*
Image pull policy
*/}}
{{- define "infrawhisper.pullPolicy" -}}
{{ .Values.global.image.pullPolicy | default "IfNotPresent" }}
{{- end }}
```

- [ ] **Step 4: Create `deploy/helm/infrawhisper/templates/namespace.yaml`**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
```

- [ ] **Step 5: Create `deploy/helm/infrawhisper/templates/serviceaccount.yaml`**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: infrawhisper
  namespace: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
```

- [ ] **Step 6: Create `deploy/helm/infrawhisper/templates/configmap.yaml`**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: infrawhisper-config
  namespace: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
data:
  POSTGRES_HOST: {{ .Values.config.postgresHost | quote }}
  POSTGRES_PORT: {{ .Values.config.postgresPort | quote }}
  POSTGRES_DB: {{ .Values.config.postgresDb | quote }}
  POSTGRES_USER: {{ .Values.config.postgresUser | quote }}
  CLICKHOUSE_HOST: {{ .Values.config.clickhouseHost | quote }}
  CLICKHOUSE_PORT: {{ .Values.config.clickhousePort | quote }}
  CLICKHOUSE_DATABASE: {{ .Values.config.clickhouseDb | quote }}
  REDIS_ADDR: {{ .Values.config.redisAddr | quote }}
  KAFKA_BROKERS: {{ .Values.config.kafkaBrokers | quote }}
  LOG_LEVEL: {{ .Values.config.logLevel | quote }}
  AI_ENGINE_URL: {{ .Values.config.aiEngineUrl | quote }}
```

- [ ] **Step 7: Create `deploy/helm/infrawhisper/templates/secrets.yaml`**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: infrawhisper-secrets
  namespace: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
type: Opaque
stringData:
  POSTGRES_PASSWORD: {{ .Values.secrets.postgresPassword | quote }}
  ANTHROPIC_API_KEY: {{ .Values.secrets.anthropicApiKey | quote }}
  JWT_SECRET: {{ .Values.secrets.jwtSecret | quote }}
```

- [ ] **Step 8: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add deploy/helm/
git commit -m "feat(helm): Chart.yaml, values.yaml, helpers, namespace, configmap, secrets"
```

---

### Task 3: Helm templates — service deployments

**Files:**
- Create: `deploy/helm/infrawhisper/templates/api-server-deployment.yaml`
- Create: `deploy/helm/infrawhisper/templates/api-server-service.yaml`
- Create: `deploy/helm/infrawhisper/templates/api-server-hpa.yaml`
- Create: `deploy/helm/infrawhisper/templates/collector-deployment.yaml`
- Create: `deploy/helm/infrawhisper/templates/collector-service.yaml`
- Create: `deploy/helm/infrawhisper/templates/stream-processor-deployment.yaml`
- Create: `deploy/helm/infrawhisper/templates/dashboard-deployment.yaml`
- Create: `deploy/helm/infrawhisper/templates/dashboard-service.yaml`
- Create: `deploy/helm/infrawhisper/templates/ai-engine-deployment.yaml`
- Create: `deploy/helm/infrawhisper/templates/ai-engine-service.yaml`
- Create: `deploy/helm/infrawhisper/templates/ingress.yaml`

- [ ] **Step 1: Create `deploy/helm/infrawhisper/templates/api-server-deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
    app.kubernetes.io/component: api-server
spec:
  replicas: {{ .Values.apiServer.replicas }}
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
        {{- include "infrawhisper.labels" . | nindent 8 }}
    spec:
      serviceAccountName: infrawhisper
      containers:
        - name: api-server
          image: {{ .Values.apiServer.image.repository }}:{{ .Values.apiServer.image.tag }}
          imagePullPolicy: {{ include "infrawhisper.pullPolicy" . }}
          ports:
            - containerPort: {{ .Values.apiServer.port }}
              name: http
          envFrom:
            - configMapRef:
                name: infrawhisper-config
            - secretRef:
                name: infrawhisper-secrets
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            {{- toYaml .Values.apiServer.resources | nindent 12 }}
```

- [ ] **Step 2: Create `deploy/helm/infrawhisper/templates/api-server-service.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-server
  namespace: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
spec:
  type: {{ .Values.apiServer.service.type }}
  selector:
    app: api-server
  ports:
    - name: http
      port: {{ .Values.apiServer.service.port }}
      targetPort: http
```

- [ ] **Step 3: Create `deploy/helm/infrawhisper/templates/api-server-hpa.yaml`**

```yaml
{{- if .Values.apiServer.hpa.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server
  namespace: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: {{ .Values.apiServer.hpa.minReplicas }}
  maxReplicas: {{ .Values.apiServer.hpa.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.apiServer.hpa.targetCPUUtilizationPercentage }}
{{- end }}
```

- [ ] **Step 4: Create `deploy/helm/infrawhisper/templates/collector-deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: collector
  namespace: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
    app.kubernetes.io/component: collector
spec:
  replicas: {{ .Values.collector.replicas }}
  selector:
    matchLabels:
      app: collector
  template:
    metadata:
      labels:
        app: collector
    spec:
      serviceAccountName: infrawhisper
      containers:
        - name: collector
          image: {{ .Values.collector.image.repository }}:{{ .Values.collector.image.tag }}
          imagePullPolicy: {{ include "infrawhisper.pullPolicy" . }}
          ports:
            - containerPort: {{ .Values.collector.port }}
              name: otlp-grpc
          envFrom:
            - configMapRef:
                name: infrawhisper-config
            - secretRef:
                name: infrawhisper-secrets
          resources:
            {{- toYaml .Values.collector.resources | nindent 12 }}
```

- [ ] **Step 5: Create `deploy/helm/infrawhisper/templates/collector-service.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: collector
  namespace: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
spec:
  type: {{ .Values.collector.service.type }}
  selector:
    app: collector
  ports:
    - name: otlp-grpc
      port: {{ .Values.collector.service.port }}
      targetPort: otlp-grpc
```

- [ ] **Step 6: Create `deploy/helm/infrawhisper/templates/stream-processor-deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stream-processor
  namespace: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
    app.kubernetes.io/component: stream-processor
spec:
  replicas: {{ .Values.streamProcessor.replicas }}
  selector:
    matchLabels:
      app: stream-processor
  template:
    metadata:
      labels:
        app: stream-processor
    spec:
      serviceAccountName: infrawhisper
      containers:
        - name: stream-processor
          image: {{ .Values.streamProcessor.image.repository }}:{{ .Values.streamProcessor.image.tag }}
          imagePullPolicy: {{ include "infrawhisper.pullPolicy" . }}
          envFrom:
            - configMapRef:
                name: infrawhisper-config
            - secretRef:
                name: infrawhisper-secrets
          resources:
            {{- toYaml .Values.streamProcessor.resources | nindent 12 }}
```

- [ ] **Step 7: Create `deploy/helm/infrawhisper/templates/dashboard-deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dashboard
  namespace: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
    app.kubernetes.io/component: dashboard
spec:
  replicas: {{ .Values.dashboard.replicas }}
  selector:
    matchLabels:
      app: dashboard
  template:
    metadata:
      labels:
        app: dashboard
    spec:
      containers:
        - name: dashboard
          image: {{ .Values.dashboard.image.repository }}:{{ .Values.dashboard.image.tag }}
          imagePullPolicy: {{ include "infrawhisper.pullPolicy" . }}
          ports:
            - containerPort: {{ .Values.dashboard.port }}
              name: http
          env:
            - name: NEXT_PUBLIC_API_URL
              value: "http://api-server:{{ .Values.apiServer.service.port }}"
            - name: NEXT_PUBLIC_WS_URL
              value: "ws://api-server:{{ .Values.apiServer.service.port }}"
          resources:
            {{- toYaml .Values.dashboard.resources | nindent 12 }}
```

- [ ] **Step 8: Create `deploy/helm/infrawhisper/templates/dashboard-service.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dashboard
  namespace: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
spec:
  type: {{ .Values.dashboard.service.type }}
  selector:
    app: dashboard
  ports:
    - name: http
      port: {{ .Values.dashboard.service.port }}
      targetPort: http
```

- [ ] **Step 9: Create `deploy/helm/infrawhisper/templates/ai-engine-deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-engine
  namespace: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
    app.kubernetes.io/component: ai-engine
spec:
  replicas: {{ .Values.aiEngine.replicas }}
  selector:
    matchLabels:
      app: ai-engine
  template:
    metadata:
      labels:
        app: ai-engine
    spec:
      serviceAccountName: infrawhisper
      containers:
        - name: ai-engine
          image: {{ .Values.aiEngine.image.repository }}:{{ .Values.aiEngine.image.tag }}
          imagePullPolicy: {{ include "infrawhisper.pullPolicy" . }}
          ports:
            - containerPort: {{ .Values.aiEngine.port }}
              name: http
          envFrom:
            - configMapRef:
                name: infrawhisper-config
            - secretRef:
                name: infrawhisper-secrets
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 10
            periodSeconds: 10
          resources:
            {{- toYaml .Values.aiEngine.resources | nindent 12 }}
```

- [ ] **Step 10: Create `deploy/helm/infrawhisper/templates/ai-engine-service.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ai-engine
  namespace: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
spec:
  type: {{ .Values.aiEngine.service.type }}
  selector:
    app: ai-engine
  ports:
    - name: http
      port: {{ .Values.aiEngine.service.port }}
      targetPort: http
```

- [ ] **Step 11: Create `deploy/helm/infrawhisper/templates/ingress.yaml`**

```yaml
{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: infrawhisper
  namespace: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-http-version: "1.1"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
spec:
  ingressClassName: {{ .Values.ingress.className }}
  {{- if .Values.ingress.tls.enabled }}
  tls:
    - hosts:
        - {{ .Values.ingress.host }}
      secretName: {{ .Values.ingress.tls.secretName }}
  {{- end }}
  rules:
    - host: {{ .Values.ingress.host }}
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-server
                port:
                  name: http
          - path: /ws
            pathType: Prefix
            backend:
              service:
                name: api-server
                port:
                  name: http
          - path: /
            pathType: Prefix
            backend:
              service:
                name: dashboard
                port:
                  name: http
{{- end }}
```

- [ ] **Step 12: Lint the Helm chart**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
helm lint deploy/helm/infrawhisper/ 2>&1
```

Expected: `1 chart(s) linted, 0 chart(s) failed`. Fix any issues before committing.

- [ ] **Step 13: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add deploy/helm/
git commit -m "feat(helm): all service Deployments, Services, HPA, and Ingress templates"
```

---

## Chunk 3: OrbStack K8s Init Script

### Task 4: OrbStack local Kubernetes bootstrap script

**Files:**
- Create: `deploy/k8s/orbstack-init.sh`

- [ ] **Step 1: Create `deploy/k8s/orbstack-init.sh`**

```bash
#!/usr/bin/env bash
# orbstack-init.sh — Bootstrap InfraWhisper on OrbStack local Kubernetes
# Prerequisites: orb, kubectl, helm, docker (all available via OrbStack)
set -euo pipefail

NAMESPACE="infrawhisper"
RELEASE="infrawhisper"
CHART="./deploy/helm/infrawhisper"

# Must be run from the monorepo root
cd "$(dirname "$0")/../.."

echo "==> Switching to OrbStack k8s context"
kubectl config use-context orbstack

echo "==> Creating namespace (idempotent)"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo "==> Installing nginx ingress controller (if not present)"
if ! kubectl get ns ingress-nginx &>/dev/null; then
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml
  echo "Waiting for ingress-nginx to be ready..."
  kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=120s
fi

echo "==> Building local images"
docker build -f Dockerfile.api-server     -t ghcr.io/infrawhisper/api-server:local .
docker build -f Dockerfile.collector      -t ghcr.io/infrawhisper/collector:local .
docker build -f Dockerfile.stream-processor -t ghcr.io/infrawhisper/stream-processor:local .
docker build -f ai-engine/Dockerfile     -t ghcr.io/infrawhisper/ai-engine:local ./ai-engine
docker build -f dashboard/Dockerfile     -t ghcr.io/infrawhisper/dashboard:local ./dashboard

echo "==> Deploying infrastructure services (postgres, clickhouse, redis, kafka) via docker-compose"
echo "    NOTE: For local K8s dev, infrastructure services run in docker-compose on the host."
echo "    OrbStack routes host.docker.internal → host machine services."
echo "    Ensure 'docker compose up -d' has been run before proceeding."

echo "==> Installing/Upgrading Helm release"
helm upgrade --install "$RELEASE" "$CHART" \
  --namespace "$NAMESPACE" \
  --set global.image.pullPolicy=Never \
  --set apiServer.image.tag=local \
  --set collector.image.tag=local \
  --set streamProcessor.image.tag=local \
  --set aiEngine.image.tag=local \
  --set dashboard.image.tag=local \
  --set config.postgresHost=host.docker.internal \
  --set config.clickhouseHost=host.docker.internal \
  --set config.redisAddr="host.docker.internal:6379" \
  --set config.kafkaBrokers="host.docker.internal:9092" \
  --set secrets.postgresPassword=infrawhisper \
  --set secrets.jwtSecret=dev-jwt-secret-change-in-prod \
  --set ingress.host=infrawhisper.local \
  --wait

echo ""
echo "==> InfraWhisper deployed to OrbStack K8s!"
echo "    Add to /etc/hosts:  127.0.0.1  infrawhisper.local"
echo "    Dashboard:  http://infrawhisper.local"
echo "    API:        http://infrawhisper.local/api/v1/health"
echo ""
kubectl get pods -n "$NAMESPACE"
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x "/Users/mejba/Local Storage/AI Development/infrawhisper/deploy/k8s/orbstack-init.sh"
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add deploy/k8s/
git commit -m "feat(infra): OrbStack local K8s bootstrap script"
```

---

## Chunk 4: GitHub Actions CI/CD

### Task 5: GitHub Actions workflows

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`
- Create: `.github/workflows/security.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main, master]
  push:
    branches: [main, master]

jobs:
  go-lint-test:
    name: Go lint + test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: "1.23"
          cache: true

      - name: Install librdkafka (required for confluent-kafka-go CGO)
        run: sudo apt-get install -y librdkafka-dev

      - name: golangci-lint
        uses: golangci/golangci-lint-action@v6
        with:
          version: latest

      - name: Run tests
        run: go test ./... -race -cover -count=1

      - name: Build binaries
        run: |
          CGO_ENABLED=1 go build -o /dev/null ./cmd/api-server
          CGO_ENABLED=1 go build -o /dev/null ./cmd/collector
          CGO_ENABLED=1 go build -o /dev/null ./cmd/stream-processor

  python-lint-test:
    name: Python lint + test
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ai-engine
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install uv
        run: pip install uv

      - name: Install dependencies
        run: uv pip install --system -e ".[dev]"

      - name: Run tests
        run: pytest tests/ -v --tb=short

  dashboard-build:
    name: Dashboard build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: dashboard
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: dashboard/package-lock.json

      - run: npm ci
      - run: npm run build

  helm-lint:
    name: Helm lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: azure/setup-helm@v4
        with:
          version: "3.14.0"

      - name: Lint chart
        run: helm lint deploy/helm/infrawhisper/
```

- [ ] **Step 2: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    tags:
      - "v*.*.*"

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/${{ github.repository_owner }}/infrawhisper

jobs:
  build-push:
    name: Build and push Docker images
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    strategy:
      matrix:
        service:
          - name: api-server
            dockerfile: Dockerfile.api-server
            context: .
          - name: collector
            dockerfile: Dockerfile.collector
            context: .
          - name: stream-processor
            dockerfile: Dockerfile.stream-processor
            context: .
          - name: ai-engine
            dockerfile: ai-engine/Dockerfile
            context: ./ai-engine
          - name: dashboard
            dockerfile: dashboard/Dockerfile
            context: ./dashboard
    steps:
      - uses: actions/checkout@v4

      - name: Install librdkafka (for Go CGO builds)
        if: matrix.service.name != 'ai-engine' && matrix.service.name != 'dashboard'
        run: sudo apt-get install -y librdkafka-dev

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.IMAGE_PREFIX }}/${{ matrix.service.name }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ${{ matrix.service.context }}
          file: ${{ matrix.service.dockerfile }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  helm-package:
    name: Package and publish Helm chart
    runs-on: ubuntu-latest
    needs: build-push
    permissions:
      contents: write
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: azure/setup-helm@v4
        with:
          version: "3.14.0"

      - name: Update chart appVersion
        run: |
          VERSION="${GITHUB_REF_NAME#v}"
          sed -i "s/^appVersion:.*/appVersion: \"${VERSION}\"/" deploy/helm/infrawhisper/Chart.yaml
          sed -i "s/^version:.*/version: ${VERSION}/" deploy/helm/infrawhisper/Chart.yaml

      - name: Package chart
        run: helm package deploy/helm/infrawhisper/ -d /tmp/charts/

      - name: Push chart to GHCR OCI
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | helm registry login ghcr.io -u ${{ github.actor }} --password-stdin
          helm push /tmp/charts/*.tgz oci://ghcr.io/${{ github.repository_owner }}/charts
```

- [ ] **Step 3: Create `.github/workflows/security.yml`**

```yaml
name: Security Scan

on:
  schedule:
    - cron: "0 6 * * 1"  # every Monday at 06:00 UTC
  workflow_dispatch:

jobs:
  trivy-scan:
    name: Trivy vulnerability scan
    runs-on: ubuntu-latest
    strategy:
      matrix:
        target:
          - Dockerfile.api-server
          - Dockerfile.collector
          - Dockerfile.stream-processor
          - ai-engine/Dockerfile
          - dashboard/Dockerfile
    steps:
      - uses: actions/checkout@v4

      - name: Install librdkafka
        if: "!contains(matrix.target, 'ai-engine') && !contains(matrix.target, 'dashboard')"
        run: sudo apt-get install -y librdkafka-dev

      - name: Build image for scanning
        run: |
          NAME=$(echo "${{ matrix.target }}" | sed 's|Dockerfile\.||;s|/Dockerfile||;s|/|-|g')
          CONTEXT="."
          if [[ "${{ matrix.target }}" == "ai-engine/Dockerfile" ]]; then CONTEXT="./ai-engine"; fi
          if [[ "${{ matrix.target }}" == "dashboard/Dockerfile" ]]; then CONTEXT="./dashboard"; fi
          docker build -f "${{ matrix.target }}" -t "scan-target:${NAME}" "${CONTEXT}"
          echo "SCAN_IMAGE=scan-target:${NAME}" >> $GITHUB_ENV

      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.SCAN_IMAGE }}
          format: table
          exit-code: "1"
          ignore-unfixed: true
          vuln-type: "os,library"
          severity: "CRITICAL,HIGH"

  go-govulncheck:
    name: Go vulnerability check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "1.23"
      - run: go install golang.org/x/vuln/cmd/govulncheck@latest
      - run: govulncheck ./...
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add .github/
git commit -m "feat(ci): GitHub Actions CI, release, and security scan workflows"
```

---

## Chunk 5: Rust Agent Skeleton

### Task 6: Rust agent scaffold

**Files:**
- Create: `agent/Cargo.toml`
- Create: `agent/src/main.rs`
- Create: `agent/src/config.rs`
- Create: `agent/src/collector.rs`
- Create: `agent/src/watcher.rs`

The agent is a **skeleton only** — it compiles and has stub implementations. Full implementation is Sub-project E.

- [ ] **Step 1: Create `agent/Cargo.toml`**

```toml
[package]
name = "infrawhisper-agent"
version = "0.1.0"
edition = "2021"
description = "InfraWhisper Kubernetes node agent — collects metrics, logs, and traces"

[[bin]]
name = "infrawhisper-agent"
path = "src/main.rs"

[dependencies]
tokio = { version = "1", features = ["full"] }
tonic = "0.12"
prost = "0.13"
kube = { version = "0.93", features = ["runtime", "derive"] }
k8s-openapi = { version = "0.22", features = ["v1_29"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
anyhow = "1"
opentelemetry = "0.24"
opentelemetry_sdk = { version = "0.24", features = ["rt-tokio"] }
opentelemetry-otlp = { version = "0.17", features = ["grpc-tonic"] }
```

- [ ] **Step 2: Create `agent/src/config.rs`**

```rust
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub collector_endpoint: String,
    pub cluster_id: String,
    pub tenant_id: String,
    pub agent_token: String,
    pub scrape_interval_secs: u64,
    pub log_level: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            collector_endpoint: env::var("COLLECTOR_ENDPOINT")
                .unwrap_or_else(|_| "http://collector:4317".to_string()),
            cluster_id: env::var("CLUSTER_ID")
                .map_err(|_| anyhow::anyhow!("CLUSTER_ID is required"))?,
            tenant_id: env::var("TENANT_ID")
                .map_err(|_| anyhow::anyhow!("TENANT_ID is required"))?,
            agent_token: env::var("AGENT_TOKEN")
                .map_err(|_| anyhow::anyhow!("AGENT_TOKEN is required"))?,
            scrape_interval_secs: env::var("SCRAPE_INTERVAL_SECS")
                .unwrap_or_else(|_| "15".to_string())
                .parse()
                .unwrap_or(15),
            log_level: env::var("LOG_LEVEL").unwrap_or_else(|_| "info".to_string()),
        })
    }
}
```

- [ ] **Step 3: Create `agent/src/collector.rs`**

```rust
use crate::config::Config;
use anyhow::Result;
use tracing::info;

/// OtlpCollector sends metrics, logs, and traces to the InfraWhisper collector
/// via OTLP/gRPC. This is a stub — full implementation in Sub-project E.
pub struct OtlpCollector {
    endpoint: String,
    cluster_id: String,
}

impl OtlpCollector {
    pub fn new(config: &Config) -> Self {
        Self {
            endpoint: config.collector_endpoint.clone(),
            cluster_id: config.cluster_id.clone(),
        }
    }

    /// Initialize the OTLP exporter pipeline.
    /// TODO: configure opentelemetry_sdk pipeline with retry + timeout.
    pub async fn init(&self) -> Result<()> {
        info!(
            endpoint = %self.endpoint,
            cluster_id = %self.cluster_id,
            "OtlpCollector initialized (stub)"
        );
        Ok(())
    }

    /// Send a metric data point to the collector.
    /// TODO: batch and flush via OTLP ExportMetricsServiceRequest.
    pub async fn send_metric(&self, name: &str, value: f64, labels: &[(&str, &str)]) -> Result<()> {
        tracing::debug!(
            metric = name,
            value = value,
            labels = ?labels,
            "send_metric (stub — not yet exported)"
        );
        Ok(())
    }
}
```

- [ ] **Step 4: Create `agent/src/watcher.rs`**

```rust
use crate::collector::OtlpCollector;
use crate::config::Config;
use anyhow::Result;
use kube::{Api, Client};
use k8s_openapi::api::core::v1::Pod;
use tracing::info;

/// PodWatcher watches Kubernetes pods and emits resource metrics.
/// This is a stub — full implementation in Sub-project E.
pub struct PodWatcher {
    cluster_id: String,
    scrape_interval_secs: u64,
}

impl PodWatcher {
    pub fn new(config: &Config) -> Self {
        Self {
            cluster_id: config.cluster_id.clone(),
            scrape_interval_secs: config.scrape_interval_secs,
        }
    }

    /// Start the pod watcher loop.
    /// TODO: use kube-rs reflector + stream to watch Pod events and emit metrics.
    pub async fn run(&self, collector: &OtlpCollector) -> Result<()> {
        info!(
            cluster_id = %self.cluster_id,
            interval_secs = self.scrape_interval_secs,
            "PodWatcher starting (stub)"
        );

        // Stub: verify we can connect to the Kubernetes API
        let client = Client::try_default().await?;
        let pods: Api<Pod> = Api::all(client);
        let pod_list = pods.list(&Default::default()).await?;

        info!(
            pod_count = pod_list.items.len(),
            "Connected to Kubernetes API, found pods"
        );

        // TODO: implement metric collection loop
        // - For each pod, read CPU/memory from metrics-server
        // - Call collector.send_metric()
        // - Sleep scrape_interval_secs
        let _ = collector;
        Ok(())
    }
}
```

- [ ] **Step 5: Create `agent/src/main.rs`**

```rust
mod collector;
mod config;
mod watcher;

use anyhow::Result;
use tracing::info;

#[tokio::main]
async fn main() -> Result<()> {
    let cfg = config::Config::from_env()?;

    tracing_subscriber::fmt()
        .with_env_filter(&cfg.log_level)
        .json()
        .init();

    info!(
        cluster_id = %cfg.cluster_id,
        collector_endpoint = %cfg.collector_endpoint,
        "InfraWhisper agent starting"
    );

    let collector = collector::OtlpCollector::new(&cfg);
    collector.init().await?;

    let watcher = watcher::PodWatcher::new(&cfg);
    watcher.run(&collector).await?;

    Ok(())
}
```

- [ ] **Step 6: Verify the Rust project compiles**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper/agent"
cargo build 2>&1 | tail -10
```

Expected: `Finished dev [unoptimized + debuginfo] target(s)`. If `cargo` is not installed, install with `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && source ~/.cargo/env`. If the build fails due to missing tonic/prost protobuf tooling, add `build-dependencies` section and a simple `build.rs` — but the skeleton should compile without generated proto files since we're not calling any gRPC methods.

- [ ] **Step 7: Add `agent/` to `.gitignore` target binary**

Append to `.gitignore` (or create if missing):
```
agent/target/
```

- [ ] **Step 8: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add agent/ .gitignore
git commit -m "feat(agent): Rust agent skeleton with OTLP collector stub and pod watcher stub"
```

---

## Chunk 6: Makefile & .env updates

### Task 7: Wire everything into Makefile and update .env.example

**Files:**
- Modify: `Makefile`
- Modify: `.env.example`

- [ ] **Step 1: Read current `.env.example`**

```bash
cat "/Users/mejba/Local Storage/AI Development/infrawhisper/.env.example"
```

- [ ] **Step 2: Append Helm/deploy targets to `Makefile`**

Add the following targets after the existing `tidy` target:

```makefile
# Docker image builds
docker-build-go:
	docker build -f Dockerfile.api-server -t infrawhisper/api-server:local .
	docker build -f Dockerfile.collector -t infrawhisper/collector:local .
	docker build -f Dockerfile.stream-processor -t infrawhisper/stream-processor:local .

# Helm
helm-lint:
	helm lint deploy/helm/infrawhisper/

helm-template:
	helm template infrawhisper deploy/helm/infrawhisper/ --debug

helm-install-local:
	bash deploy/k8s/orbstack-init.sh

helm-uninstall:
	helm uninstall infrawhisper --namespace infrawhisper

# Rust agent
agent-build:
	cd agent && cargo build

agent-check:
	cd agent && cargo check
```

- [ ] **Step 3: Update `.env.example`**

Append to the end of `.env.example`:

```bash
# Kubernetes / Helm (agent)
CLUSTER_ID=<your-cluster-uuid>
TENANT_ID=<your-tenant-uuid>
AGENT_TOKEN=<cluster-agent-token-from-api>
COLLECTOR_ENDPOINT=http://localhost:4317
SCRAPE_INTERVAL_SECS=15

# GitHub Container Registry (for release workflow)
# GITHUB_TOKEN is automatically provided by GitHub Actions
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add Makefile .env.example
git commit -m "chore(infra): add Helm and Rust agent targets to Makefile, update .env.example"
```

---

## Next Sub-project

- **Sub-project E** — Full Rust agent implementation: kube-rs metrics collection loop, OTLP batch export, log tail, node resource scraping
