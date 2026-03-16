<div align="center">

# InfraWhisper

**AI-Powered Kubernetes Infrastructure Observability Platform**

[![Go](https://img.shields.io/badge/Go-1.23-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![ClickHouse](https://img.shields.io/badge/ClickHouse-Analytics-FFCC01?style=for-the-badge&logo=clickhouse&logoColor=black)](https://clickhouse.com)
[![Kafka](https://img.shields.io/badge/Kafka-Streaming-231F20?style=for-the-badge&logo=apachekafka&logoColor=white)](https://kafka.apache.org)
[![License](https://img.shields.io/badge/License-MIT-10B981?style=for-the-badge)](LICENSE)

Real-time monitoring, anomaly detection, and intelligent alerting for Kubernetes clusters.

</div>

---

## About

**InfraWhisper** is an AI-powered observability SaaS platform designed to monitor Kubernetes infrastructure in real time. It collects metrics, logs, and traces from your clusters, detects anomalies using intelligent algorithms, and delivers actionable alerts — all through an intuitive Next.js dashboard with an AI query copilot.

Whether you're managing a single cluster or scaling across multiple environments, InfraWhisper gives you deep visibility into your infrastructure's health, performance, and cost.



---

## Key Features

- **Real-Time Monitoring** — Collect metrics, logs, and traces via OTLP gRPC from Kubernetes nodes
- **Anomaly Detection** — Welford-based statistical anomaly detection on streaming data
- **AI Query Copilot** — Natural language interface to ask questions about your infrastructure
- **Intelligent Alerting** — Configurable alert rules with real-time evaluation and notifications
- **WebSocket Live Feeds** — Instant updates pushed to the dashboard via Redis pub/sub
- **Multi-Tenant** — Full tenant isolation enforced at every storage layer
- **Cost Tracking** — Monitor and analyze infrastructure costs across clusters

---

## Architecture

```
K8s Nodes → Rust Agent → OTLP gRPC → Collector → ClickHouse (raw storage)
                                              └→ Kafka → Stream Processor → Anomaly Detection
                                                                          └→ Alert Evaluation
                                                                          └→ Redis Pub/Sub → WebSocket → Dashboard

REST Clients → API Server → Postgres (metadata) / ClickHouse (queries) / Redis (cache)
```

### Services

| Service | Description | Port |
|---------|-------------|------|
| **API Server** | REST API (Chi router) + WebSocket hub | 8080 |
| **Collector** | OTLP gRPC receiver → ClickHouse + Kafka | 4317 |
| **Stream Processor** | Kafka consumer → anomaly detection + alerting | — |
| **Dashboard** | Next.js frontend with AI copilot | 3000 |

### Storage

| Store | Purpose | Retention |
|-------|---------|-----------|
| **PostgreSQL** | Clusters, tenants, users, incidents, alert rules | Persistent |
| **ClickHouse** | Metrics (30d), logs (7d), traces (7d), costs | TTL-based |
| **Redis** | Query cache, real-time pub/sub | In-memory |
| **Kafka** | Event streaming between services | Configurable |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Go 1.23, Chi, pgx, Kafka, gRPC |
| **Frontend** | Next.js 16, React, Tailwind CSS, TanStack Query |
| **Databases** | PostgreSQL, ClickHouse, Redis |
| **Messaging** | Apache Kafka |
| **Infra** | Docker, Docker Compose |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/mejba13/infrawhisper.git
cd infrawhisper

# One-command setup
bash scripts/dev-setup.sh

# Start dependencies (Postgres, ClickHouse, Redis, Kafka)
make docker-up

# Start the API server with hot reload
make dev

# Start the dashboard
cd dashboard && npm install && npm run dev
```

---

## Build

```bash
# Build all binaries
make build

# Run tests
go test ./... -race -cover

# Lint
golangci-lint run ./...
```

---

## Project Structure

```
infrawhisper/
├── cmd/                    # Service entry points
│   ├── api-server/         # HTTP REST API + WebSocket
│   ├── collector/          # OTLP gRPC receiver
│   └── stream-processor/   # Kafka consumer + anomaly detection
├── internal/               # Core packages
│   ├── api/                # Handlers, middleware, WebSocket hub
│   ├── auth/               # JWT, RBAC, context helpers
│   ├── collector/          # OTLP processing pipeline
│   ├── config/             # Viper config loading
│   ├── storage/            # Postgres, ClickHouse, Redis
│   └── stream/             # Kafka consumer/producer, anomaly detector
├── dashboard/              # Next.js frontend
├── migrations/             # Database migrations
├── scripts/                # Dev setup & utilities
└── docker-compose.yml      # Local dev dependencies
```

---

## Developed By

<div align="center">

<img width="380" height="420" alt="engr-mejba-ahmed" src="https://github.com/user-attachments/assets/83e72c39-5eaa-428a-884b-cb4714332487" />


### **Engr Mejba Ahmed**

**AI Developer | Software Engineer | Entrepreneur**

[![Portfolio](https://img.shields.io/badge/Portfolio-mejba.me-10B981?style=for-the-badge&logo=google-chrome&logoColor=white)](https://www.mejba.me)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/mejba)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mejba13)

</div>

---

## Hire / Work With Me

I build AI-powered applications, mobile apps, and enterprise solutions. Let's bring your ideas to life!

| Platform | Description | Link |
|----------|-------------|------|
| **Fiverr** | Custom builds, integrations, performance optimization | [fiverr.com/s/EgxYmWD](https://www.fiverr.com/s/EgxYmWD) |
| **Mejba Personal Portfolio** | Full portfolio & contact | [mejba.me](https://www.mejba.me) |
| **Ramlit Limited** | Software development company | [ramlit.com](https://www.ramlit.com) |
| **ColorPark Creative Agency** | UI/UX & creative solutions | [colorpark.io](https://www.colorpark.io) |
| **xCyberSecurity** | Global cybersecurity services | [xcybersecurity.io](https://www.xcybersecurity.io) |
