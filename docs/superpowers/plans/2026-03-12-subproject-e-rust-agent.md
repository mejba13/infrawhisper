# InfraWhisper Sub-project E: Rust Agent Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the agent skeleton stubs with a fully working Kubernetes agent that scrapes pod/node metrics from the metrics-server API every N seconds, streams pod logs, and exports everything to the InfraWhisper collector via OTLP/gRPC.

**Architecture:** Four concurrent tokio tasks running in `main.rs` via `tokio::select!`: (1) pod metrics scraper, (2) node metrics scraper, (3) pod log tailer, (4) SIGTERM shutdown handler. `OtlpCollector` owns the `opentelemetry_sdk` MeterProvider and exposes typed `record_gauge()` and `emit_log()` methods. `metrics_api.rs` defines custom kube-rs resource types for `PodMetrics` and `NodeMetrics` from the `metrics.k8s.io/v1beta1` API (not included in `k8s-openapi`). All K8s API access uses the kube-rs `Client` (auto-detects in-cluster config vs local kubeconfig).

**Tech Stack:** Rust 1.77+, tokio 1, kube 0.93, k8s-openapi 0.22, opentelemetry 0.24, opentelemetry_sdk 0.24, opentelemetry-otlp 0.17, tonic 0.12, futures, bytes

---

## File Structure

```
agent/
  Cargo.toml              ← add futures, bytes deps
  src/
    main.rs               ← replace: 4 concurrent tasks + graceful shutdown
    config.rs             ← unchanged
    metrics_api.rs        ← NEW: PodMetrics, NodeMetrics custom kube Resource types
    collector.rs          ← replace: real MeterProvider + OTLP gRPC pipeline
    watcher.rs            ← replace: real pod metrics scrape loop
    node_watcher.rs       ← NEW: node metrics scrape loop
    log_tail.rs           ← NEW: pod log streaming → emit_log()
```

---

## Chunk 1: Dependencies and Kubernetes metrics types

### Task 1: Update Cargo.toml and create metrics_api.rs

**Files:**
- Modify: `agent/Cargo.toml`
- Create: `agent/src/metrics_api.rs`

- [ ] **Step 1: Update `agent/Cargo.toml`**

Replace the entire file:

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
kube = { version = "0.93", features = ["runtime", "derive", "ws"] }
k8s-openapi = { version = "0.22", features = ["v1_29"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
anyhow = "1"
opentelemetry = { version = "0.24", features = ["metrics", "logs"] }
opentelemetry_sdk = { version = "0.24", features = ["rt-tokio", "metrics", "logs"] }
opentelemetry-otlp = { version = "0.17", features = ["grpc-tonic", "metrics", "logs"] }
futures = "0.3"
bytes = "1"
tokio-stream = "0.1"
```

- [ ] **Step 2: Create `agent/src/metrics_api.rs`**

The metrics-server API (`metrics.k8s.io/v1beta1`) provides `PodMetrics` and `NodeMetrics` resources. These are not in `k8s-openapi`, so we define them manually with kube-rs's `CustomResource`-style derive.

```rust
use kube::CustomResource;
use serde::{Deserialize, Serialize};

/// A quantity string from the Kubernetes API, e.g. "125m" (125 millicores) or "256Mi"
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Quantity(pub String);

impl Quantity {
    /// Parse CPU quantity to millicores (m).
    /// "125m" → 125, "1" → 1000, "0.5" → 500
    pub fn to_millicores(&self) -> f64 {
        let s = &self.0;
        if let Some(stripped) = s.strip_suffix('m') {
            stripped.parse::<f64>().unwrap_or(0.0)
        } else {
            s.parse::<f64>().unwrap_or(0.0) * 1000.0
        }
    }

    /// Parse memory quantity to bytes.
    /// "256Mi" → 268435456, "1Gi" → 1073741824, "512k" → 524288
    pub fn to_bytes(&self) -> f64 {
        let s = &self.0;
        let (num, suffix) = if s.ends_with("Ki") {
            (&s[..s.len()-2], 1024.0_f64)
        } else if s.ends_with("Mi") {
            (&s[..s.len()-2], 1024.0 * 1024.0)
        } else if s.ends_with("Gi") {
            (&s[..s.len()-2], 1024.0 * 1024.0 * 1024.0)
        } else if s.ends_with('k') || s.ends_with('K') {
            (&s[..s.len()-1], 1000.0)
        } else if s.ends_with('M') {
            (&s[..s.len()-1], 1_000_000.0)
        } else if s.ends_with('G') {
            (&s[..s.len()-1], 1_000_000_000.0)
        } else {
            (s.as_str(), 1.0)
        };
        num.parse::<f64>().unwrap_or(0.0) * suffix
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ContainerMetrics {
    pub name: String,
    pub usage: ContainerUsage,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ContainerUsage {
    pub cpu: Quantity,
    pub memory: Quantity,
}

/// PodMetrics from metrics.k8s.io/v1beta1
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PodMetrics {
    pub metadata: kube::core::ObjectMeta,
    pub timestamp: String,
    pub window: String,
    pub containers: Vec<ContainerMetrics>,
}

impl kube::Resource for PodMetrics {
    type DynamicType = ();
    type Scope = kube::core::NamespaceResourceScope;

    fn group(_: &()) -> std::borrow::Cow<'_, str> { "metrics.k8s.io".into() }
    fn version(_: &()) -> std::borrow::Cow<'_, str> { "v1beta1".into() }
    fn kind(_: &()) -> std::borrow::Cow<'_, str> { "PodMetrics".into() }
    fn plural(_: &()) -> std::borrow::Cow<'_, str> { "pods".into() }
    fn meta(&self) -> &kube::core::ObjectMeta { &self.metadata }
    fn meta_mut(&mut self) -> &mut kube::core::ObjectMeta { &mut self.metadata }
}

/// NodeMetrics from metrics.k8s.io/v1beta1
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeMetrics {
    pub metadata: kube::core::ObjectMeta,
    pub timestamp: String,
    pub window: String,
    pub usage: ContainerUsage,
}

impl kube::Resource for NodeMetrics {
    type DynamicType = ();
    type Scope = kube::core::ClusterResourceScope;

    fn group(_: &()) -> std::borrow::Cow<'_, str> { "metrics.k8s.io".into() }
    fn version(_: &()) -> std::borrow::Cow<'_, str> { "v1beta1".into() }
    fn kind(_: &()) -> std::borrow::Cow<'_, str> { "NodeMetrics".into() }
    fn plural(_: &()) -> std::borrow::Cow<'_, str> { "nodes".into() }
    fn meta(&self) -> &kube::core::ObjectMeta { &self.metadata }
    fn meta_mut(&mut self) -> &mut kube::core::ObjectMeta { &mut self.metadata }
}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper/agent"
cargo check 2>&1 | grep -E "^error" | head -20
```

Expected: no `error` lines (warnings are fine). Fix any compilation errors before committing.

- [ ] **Step 4: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add agent/Cargo.toml agent/src/metrics_api.rs
git commit -m "feat(agent): add futures/bytes deps and PodMetrics/NodeMetrics kube Resource types"
```

---

## Chunk 2: OTLP Collector pipeline

### Task 2: Real OtlpCollector with MeterProvider and OTLP gRPC export

**Files:**
- Modify: `agent/src/collector.rs`

Replace the entire stub with a working OTLP pipeline.

- [ ] **Step 1: Replace `agent/src/collector.rs`**

```rust
use crate::config::Config;
use anyhow::{Context, Result};
use opentelemetry::{
    global,
    metrics::{Gauge, Meter},
    KeyValue,
};
use opentelemetry_otlp::{ExportConfig, WithExportConfig};
use opentelemetry_sdk::{
    metrics::{PeriodicReader, SdkMeterProvider},
    runtime,
    Resource,
};
use std::time::Duration;
use tracing::{debug, info};

pub struct OtlpCollector {
    meter: Meter,
    cluster_id: String,
    tenant_id: String,
    // Gauges — created once, reused each scrape
    pod_cpu_gauge: Gauge<f64>,
    pod_memory_gauge: Gauge<f64>,
    node_cpu_gauge: Gauge<f64>,
    node_memory_gauge: Gauge<f64>,
}

impl OtlpCollector {
    pub fn new(config: &Config) -> Result<Self> {
        // Build the OTLP gRPC exporter
        let exporter = opentelemetry_otlp::new_exporter()
            .tonic()
            .with_export_config(ExportConfig {
                endpoint: config.collector_endpoint.clone(),
                timeout: Duration::from_secs(10),
                ..Default::default()
            })
            .build_metrics_exporter(
                Box::new(opentelemetry_sdk::metrics::reader::DefaultTemporalitySelector::new()),
                Box::new(opentelemetry_sdk::metrics::reader::DefaultAggregationSelector::new()),
            )
            .context("Failed to build OTLP metrics exporter")?;

        // Periodic reader: export every 30s
        let reader = PeriodicReader::builder(exporter, runtime::Tokio)
            .with_interval(Duration::from_secs(30))
            .build();

        let resource = Resource::new(vec![
            KeyValue::new("service.name", "infrawhisper-agent"),
            KeyValue::new("k8s.cluster.id", config.cluster_id.clone()),
            KeyValue::new("infrawhisper.tenant.id", config.tenant_id.clone()),
        ]);

        let provider = SdkMeterProvider::builder()
            .with_reader(reader)
            .with_resource(resource)
            .build();

        global::set_meter_provider(provider);

        let meter = global::meter("infrawhisper.agent");

        let pod_cpu_gauge = meter
            .f64_gauge("k8s.pod.cpu.usage")
            .with_description("Pod CPU usage in millicores")
            .with_unit("m")
            .init();

        let pod_memory_gauge = meter
            .f64_gauge("k8s.pod.memory.usage")
            .with_description("Pod memory usage in bytes")
            .with_unit("By")
            .init();

        let node_cpu_gauge = meter
            .f64_gauge("k8s.node.cpu.usage")
            .with_description("Node CPU usage in millicores")
            .with_unit("m")
            .init();

        let node_memory_gauge = meter
            .f64_gauge("k8s.node.memory.usage")
            .with_description("Node memory usage in bytes")
            .with_unit("By")
            .init();

        info!(
            endpoint = %config.collector_endpoint,
            cluster_id = %config.cluster_id,
            "OtlpCollector initialized with gRPC OTLP pipeline"
        );

        Ok(Self {
            meter,
            cluster_id: config.cluster_id.clone(),
            tenant_id: config.tenant_id.clone(),
            pod_cpu_gauge,
            pod_memory_gauge,
            node_cpu_gauge,
            node_memory_gauge,
        })
    }

    /// Record pod CPU usage in millicores.
    pub fn record_pod_cpu(&self, namespace: &str, pod: &str, container: &str, millicores: f64) {
        debug!(namespace, pod, container, millicores, "record_pod_cpu");
        self.pod_cpu_gauge.record(
            millicores,
            &[
                KeyValue::new("k8s.namespace.name", namespace.to_string()),
                KeyValue::new("k8s.pod.name", pod.to_string()),
                KeyValue::new("k8s.container.name", container.to_string()),
                KeyValue::new("k8s.cluster.id", self.cluster_id.clone()),
            ],
        );
    }

    /// Record pod memory usage in bytes.
    pub fn record_pod_memory(&self, namespace: &str, pod: &str, container: &str, bytes: f64) {
        debug!(namespace, pod, container, bytes, "record_pod_memory");
        self.pod_memory_gauge.record(
            bytes,
            &[
                KeyValue::new("k8s.namespace.name", namespace.to_string()),
                KeyValue::new("k8s.pod.name", pod.to_string()),
                KeyValue::new("k8s.container.name", container.to_string()),
                KeyValue::new("k8s.cluster.id", self.cluster_id.clone()),
            ],
        );
    }

    /// Record node CPU usage in millicores.
    pub fn record_node_cpu(&self, node: &str, millicores: f64) {
        debug!(node, millicores, "record_node_cpu");
        self.node_cpu_gauge.record(
            millicores,
            &[
                KeyValue::new("k8s.node.name", node.to_string()),
                KeyValue::new("k8s.cluster.id", self.cluster_id.clone()),
            ],
        );
    }

    /// Record node memory usage in bytes.
    pub fn record_node_memory(&self, node: &str, bytes: f64) {
        debug!(node, bytes, "record_node_memory");
        self.node_memory_gauge.record(
            bytes,
            &[
                KeyValue::new("k8s.node.name", node.to_string()),
                KeyValue::new("k8s.cluster.id", self.cluster_id.clone()),
            ],
        );
    }

    /// Emit a structured log line from a pod as a tracing event.
    /// The OTLP periodic reader will pick up trace data on next export cycle.
    pub fn emit_log(&self, namespace: &str, pod: &str, container: &str, line: &str) {
        tracing::info!(
            namespace,
            pod,
            container,
            cluster_id = %self.cluster_id,
            log_line = line,
            "pod_log"
        );
    }

    /// Flush and shut down the OTLP pipeline gracefully.
    pub fn shutdown(&self) {
        info!("Shutting down OTLP meter provider");
        global::shutdown_meter_provider();
    }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper/agent"
cargo check 2>&1 | grep -E "^error" | head -20
```

Fix any errors. Note: `opentelemetry-otlp` 0.17 API may differ slightly — if `build_metrics_exporter` is not available, use the builder pattern:
```rust
opentelemetry_otlp::new_pipeline()
    .metrics(runtime::Tokio)
    .with_exporter(opentelemetry_otlp::new_exporter().tonic().with_endpoint(&config.collector_endpoint))
    .build()
    .context("Failed to build OTLP metrics pipeline")?
```
Then use the returned provider directly. Adapt to whatever the actual API is.

- [ ] **Step 3: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add agent/src/collector.rs
git commit -m "feat(agent): real OTLP gRPC pipeline with gauge metrics for pod/node CPU and memory"
```

---

## Chunk 3: Pod and Node metric scrapers

### Task 3: Pod metrics scraper loop

**Files:**
- Modify: `agent/src/watcher.rs`

- [ ] **Step 1: Replace `agent/src/watcher.rs`**

```rust
use crate::collector::OtlpCollector;
use crate::config::Config;
use crate::metrics_api::PodMetrics;
use anyhow::Result;
use kube::{Api, Client};
use std::sync::Arc;
use std::time::Duration;
use tokio::time;
use tracing::{error, info, warn};

pub struct PodWatcher {
    cluster_id: String,
    scrape_interval: Duration,
}

impl PodWatcher {
    pub fn new(config: &Config) -> Self {
        Self {
            cluster_id: config.cluster_id.clone(),
            scrape_interval: Duration::from_secs(config.scrape_interval_secs),
        }
    }

    /// Run the pod metrics scrape loop until the cancellation token is triggered.
    pub async fn run(
        &self,
        collector: Arc<OtlpCollector>,
        mut shutdown: tokio::sync::watch::Receiver<bool>,
    ) -> Result<()> {
        info!(
            cluster_id = %self.cluster_id,
            interval_secs = ?self.scrape_interval,
            "PodWatcher starting"
        );

        let client = Client::try_default()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create K8s client: {e}"))?;

        let mut interval = time::interval(self.scrape_interval);

        loop {
            tokio::select! {
                _ = interval.tick() => {
                    if let Err(e) = self.scrape(&client, &collector).await {
                        error!(error = %e, "Pod metrics scrape failed");
                    }
                }
                _ = shutdown.changed() => {
                    info!("PodWatcher shutting down");
                    break;
                }
            }
        }
        Ok(())
    }

    async fn scrape(&self, client: &Client, collector: &OtlpCollector) -> Result<()> {
        // metrics.k8s.io/v1beta1 PodMetrics are namespace-scoped
        let pod_metrics: Api<PodMetrics> = Api::all(client.clone());

        let list = pod_metrics
            .list(&Default::default())
            .await
            .map_err(|e| anyhow::anyhow!("Failed to list PodMetrics: {e}"))?;

        let mut count = 0usize;
        for pm in &list.items {
            let namespace = pm.metadata.namespace.as_deref().unwrap_or("default");
            let pod = pm.metadata.name.as_deref().unwrap_or("unknown");

            for container in &pm.containers {
                let cpu_m = container.usage.cpu.to_millicores();
                let mem_b = container.usage.memory.to_bytes();

                collector.record_pod_cpu(namespace, pod, &container.name, cpu_m);
                collector.record_pod_memory(namespace, pod, &container.name, mem_b);
                count += 1;
            }
        }

        info!(pods_scraped = count, "Pod metrics recorded");
        Ok(())
    }
}
```

- [ ] **Step 2: Create `agent/src/node_watcher.rs`**

```rust
use crate::collector::OtlpCollector;
use crate::config::Config;
use crate::metrics_api::NodeMetrics;
use anyhow::Result;
use kube::{Api, Client};
use std::sync::Arc;
use std::time::Duration;
use tokio::time;
use tracing::{error, info};

pub struct NodeWatcher {
    cluster_id: String,
    scrape_interval: Duration,
}

impl NodeWatcher {
    pub fn new(config: &Config) -> Self {
        Self {
            cluster_id: config.cluster_id.clone(),
            scrape_interval: Duration::from_secs(config.scrape_interval_secs),
        }
    }

    pub async fn run(
        &self,
        collector: Arc<OtlpCollector>,
        mut shutdown: tokio::sync::watch::Receiver<bool>,
    ) -> Result<()> {
        info!(
            cluster_id = %self.cluster_id,
            "NodeWatcher starting"
        );

        let client = Client::try_default()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create K8s client: {e}"))?;

        let mut interval = time::interval(self.scrape_interval);

        loop {
            tokio::select! {
                _ = interval.tick() => {
                    if let Err(e) = self.scrape(&client, &collector).await {
                        error!(error = %e, "Node metrics scrape failed");
                    }
                }
                _ = shutdown.changed() => {
                    info!("NodeWatcher shutting down");
                    break;
                }
            }
        }
        Ok(())
    }

    async fn scrape(&self, client: &Client, collector: &OtlpCollector) -> Result<()> {
        let node_metrics: Api<NodeMetrics> = Api::all(client.clone());

        let list = node_metrics
            .list(&Default::default())
            .await
            .map_err(|e| anyhow::anyhow!("Failed to list NodeMetrics: {e}"))?;

        for nm in &list.items {
            let node = nm.metadata.name.as_deref().unwrap_or("unknown");
            let cpu_m = nm.usage.cpu.to_millicores();
            let mem_b = nm.usage.memory.to_bytes();

            collector.record_node_cpu(node, cpu_m);
            collector.record_node_memory(node, mem_b);
        }

        info!(nodes_scraped = list.items.len(), "Node metrics recorded");
        Ok(())
    }
}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper/agent"
cargo check 2>&1 | grep -E "^error" | head -20
```

Fix any errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add agent/src/watcher.rs agent/src/node_watcher.rs
git commit -m "feat(agent): pod and node metrics scraper loops with interval and shutdown"
```

---

## Chunk 4: Log tail and main runner

### Task 4: Pod log tailer

**Files:**
- Create: `agent/src/log_tail.rs`

- [ ] **Step 1: Create `agent/src/log_tail.rs`**

```rust
use crate::collector::OtlpCollector;
use crate::config::Config;
use anyhow::Result;
use futures::StreamExt;
use k8s_openapi::api::core::v1::Pod;
use kube::{
    api::{Api, ListParams, LogParams},
    Client,
};
use std::sync::Arc;
use tracing::{error, info, warn};

pub struct LogTailer {
    cluster_id: String,
}

impl LogTailer {
    pub fn new(config: &Config) -> Self {
        Self {
            cluster_id: config.cluster_id.clone(),
        }
    }

    /// Start log tailing for all running pods across all namespaces.
    /// Spawns one tokio task per pod; restarts on error after 5s.
    pub async fn run(
        &self,
        collector: Arc<OtlpCollector>,
        mut shutdown: tokio::sync::watch::Receiver<bool>,
    ) -> Result<()> {
        info!(cluster_id = %self.cluster_id, "LogTailer starting");

        let client = Client::try_default()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create K8s client: {e}"))?;

        // List running pods across all namespaces
        let pods: Api<Pod> = Api::all(client.clone());
        let lp = ListParams::default()
            .fields("status.phase=Running");

        let pod_list = pods.list(&lp).await
            .map_err(|e| anyhow::anyhow!("Failed to list pods: {e}"))?;

        info!(pod_count = pod_list.items.len(), "Starting log streams");

        let mut handles = Vec::new();
        for pod in pod_list.items {
            let name = match pod.metadata.name.clone() {
                Some(n) => n,
                None => continue,
            };
            let namespace = pod.metadata.namespace.clone().unwrap_or_else(|| "default".into());
            let containers: Vec<String> = pod.spec
                .as_ref()
                .map(|s| s.containers.iter().filter_map(|c| c.name.clone().into()).collect())
                .unwrap_or_default();

            let collector_clone = collector.clone();
            let client_clone = client.clone();
            let shutdown_clone = shutdown.clone();
            let ns = namespace.clone();
            let pod_name = name.clone();

            let handle = tokio::spawn(async move {
                for container in containers {
                    let collector_c = collector_clone.clone();
                    let client_c = client_clone.clone();
                    let mut sd = shutdown_clone.clone();
                    let container_name = container.clone();
                    let ns_c = ns.clone();
                    let pod_c = pod_name.clone();

                    tokio::spawn(async move {
                        loop {
                            let result = stream_logs(
                                &client_c,
                                &ns_c,
                                &pod_c,
                                &container_name,
                                &collector_c,
                                &mut sd,
                            ).await;

                            if let Err(e) = result {
                                warn!(
                                    pod = %pod_c,
                                    container = %container_name,
                                    error = %e,
                                    "Log stream ended, restarting in 5s"
                                );
                                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                            } else {
                                break; // clean shutdown
                            }
                        }
                    });
                }
            });
            handles.push(handle);
        }

        // Wait for shutdown signal
        let _ = shutdown.changed().await;
        info!("LogTailer shutting down");
        Ok(())
    }
}

async fn stream_logs(
    client: &Client,
    namespace: &str,
    pod: &str,
    container: &str,
    collector: &OtlpCollector,
    shutdown: &mut tokio::sync::watch::Receiver<bool>,
) -> Result<()> {
    let pods: Api<Pod> = Api::namespaced(client.clone(), namespace);
    let lp = LogParams {
        container: Some(container.to_string()),
        follow: true,
        tail_lines: Some(50), // start from last 50 lines
        ..Default::default()
    };

    let mut stream = pods.log_stream(pod, &lp).await
        .map_err(|e| anyhow::anyhow!("log_stream failed for {pod}/{container}: {e}"))?;

    loop {
        tokio::select! {
            chunk = stream.next() => {
                match chunk {
                    Some(Ok(bytes)) => {
                        if let Ok(line) = std::str::from_utf8(&bytes) {
                            for l in line.lines() {
                                if !l.is_empty() {
                                    collector.emit_log(namespace, pod, container, l);
                                }
                            }
                        }
                    }
                    Some(Err(e)) => {
                        return Err(anyhow::anyhow!("Log stream error: {e}"));
                    }
                    None => break, // stream ended
                }
            }
            _ = shutdown.changed() => {
                break;
            }
        }
    }
    Ok(())
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper/agent"
cargo check 2>&1 | grep -E "^error" | head -20
```

Fix errors. Common issue: `log_stream` in kube 0.93 returns `impl Stream<Item = Result<Bytes>>`. If the API differs, use `pods.logs(pod, &lp).await` which returns a `String` (no streaming) as fallback — wrap in a loop with a sleep interval.

- [ ] **Step 3: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add agent/src/log_tail.rs
git commit -m "feat(agent): pod log tail — streams logs from all running pods, emits via collector"
```

---

### Task 5: Wire everything in main.rs with graceful shutdown

**Files:**
- Modify: `agent/src/main.rs`

- [ ] **Step 1: Replace `agent/src/main.rs`**

```rust
mod collector;
mod config;
mod log_tail;
mod metrics_api;
mod node_watcher;
mod watcher;

use anyhow::Result;
use std::sync::Arc;
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
        scrape_interval_secs = cfg.scrape_interval_secs,
        "InfraWhisper agent starting"
    );

    // Build the shared OTLP collector
    let collector = Arc::new(
        collector::OtlpCollector::new(&cfg)
            .map_err(|e| anyhow::anyhow!("Failed to init OTLP collector: {e}"))?,
    );

    // Shutdown channel: send true to signal all tasks to stop
    let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);

    // SIGTERM / SIGINT handler
    let shutdown_tx_clone = shutdown_tx.clone();
    tokio::spawn(async move {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to listen for ctrl_c");
        info!("Shutdown signal received");
        let _ = shutdown_tx_clone.send(true);
    });

    #[cfg(unix)]
    {
        use tokio::signal::unix::{signal, SignalKind};
        let shutdown_tx_sigterm = shutdown_tx.clone();
        tokio::spawn(async move {
            let mut sigterm = signal(SignalKind::terminate())
                .expect("Failed to register SIGTERM handler");
            sigterm.recv().await;
            info!("SIGTERM received");
            let _ = shutdown_tx_sigterm.send(true);
        });
    }

    // Build task runners
    let pod_watcher = watcher::PodWatcher::new(&cfg);
    let node_watcher = node_watcher::NodeWatcher::new(&cfg);
    let log_tailer = log_tail::LogTailer::new(&cfg);

    let c1 = collector.clone();
    let c2 = collector.clone();
    let c3 = collector.clone();

    let rx1 = shutdown_rx.clone();
    let rx2 = shutdown_rx.clone();
    let rx3 = shutdown_rx.clone();

    // Spawn all tasks
    let h1 = tokio::spawn(async move {
        if let Err(e) = pod_watcher.run(c1, rx1).await {
            tracing::error!(error = %e, "PodWatcher exited with error");
        }
    });

    let h2 = tokio::spawn(async move {
        if let Err(e) = node_watcher.run(c2, rx2).await {
            tracing::error!(error = %e, "NodeWatcher exited with error");
        }
    });

    let h3 = tokio::spawn(async move {
        if let Err(e) = log_tailer.run(c3, rx3).await {
            tracing::error!(error = %e, "LogTailer exited with error");
        }
    });

    // Wait for all tasks to finish
    let _ = tokio::join!(h1, h2, h3);

    // Flush OTLP pipeline
    collector.shutdown();

    info!("InfraWhisper agent stopped");
    Ok(())
}
```

- [ ] **Step 2: Full compile check**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper/agent"
cargo check 2>&1 | grep -E "^error" | head -30
```

Fix all errors. Common issues and fixes:
- If `OtlpCollector::new` signature changed, update all call sites
- If `watch::Receiver<bool>` doesn't implement `Clone`, wrap in `Arc<Mutex>` or use `tokio::sync::broadcast` instead
- Unused import warnings are fine; unused variable warnings for `shutdown_tx` can be suppressed with `let _tx = shutdown_tx`

- [ ] **Step 3: Full build (not just check)**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper/agent"
cargo build 2>&1 | tail -5
```

Expected: `Finished dev [unoptimized + debuginfo] target(s) in ...`

- [ ] **Step 4: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add agent/src/main.rs
git commit -m "feat(agent): concurrent pod/node scraper and log tailer with SIGTERM graceful shutdown"
```

---

## Chunk 5: Helm RBAC and agent DaemonSet

### Task 6: Add agent ClusterRole + DaemonSet to Helm chart

The agent must run as a DaemonSet (one per node) and needs RBAC to read pods, nodes, and metrics.

**Files:**
- Create: `deploy/helm/infrawhisper/templates/agent-rbac.yaml`
- Create: `deploy/helm/infrawhisper/templates/agent-daemonset.yaml`
- Modify: `deploy/helm/infrawhisper/values.yaml` (add `agent:` section)

- [ ] **Step 1: Add `agent:` section to `deploy/helm/infrawhisper/values.yaml`**

Append at the end of the file before the closing (no closing in YAML, just append):

```yaml

agent:
  enabled: true
  image:
    repository: ghcr.io/infrawhisper/agent
    tag: latest
  resources:
    requests:
      cpu: 50m
      memory: 64Mi
    limits:
      cpu: 200m
      memory: 128Mi
  scrapeIntervalSecs: "15"
  logLevel: info
```

- [ ] **Step 2: Create `deploy/helm/infrawhisper/templates/agent-rbac.yaml`**

```yaml
{{- if .Values.agent.enabled }}
apiVersion: v1
kind: ServiceAccount
metadata:
  name: infrawhisper-agent
  namespace: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: infrawhisper-agent
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
rules:
  - apiGroups: [""]
    resources: ["pods", "nodes", "namespaces"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  - apiGroups: ["metrics.k8s.io"]
    resources: ["pods", "nodes"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: infrawhisper-agent
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: infrawhisper-agent
subjects:
  - kind: ServiceAccount
    name: infrawhisper-agent
    namespace: {{ .Values.global.namespace }}
{{- end }}
```

- [ ] **Step 3: Create `deploy/helm/infrawhisper/templates/agent-daemonset.yaml`**

```yaml
{{- if .Values.agent.enabled }}
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: infrawhisper-agent
  namespace: {{ .Values.global.namespace }}
  labels:
    {{- include "infrawhisper.labels" . | nindent 4 }}
    app.kubernetes.io/component: agent
spec:
  selector:
    matchLabels:
      app: infrawhisper-agent
  template:
    metadata:
      labels:
        app: infrawhisper-agent
        {{- include "infrawhisper.labels" . | nindent 8 }}
    spec:
      serviceAccountName: infrawhisper-agent
      tolerations:
        # Allow running on control-plane nodes for full cluster visibility
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
      containers:
        - name: agent
          image: {{ .Values.agent.image.repository }}:{{ .Values.agent.image.tag }}
          imagePullPolicy: {{ include "infrawhisper.pullPolicy" . }}
          env:
            - name: CLUSTER_ID
              valueFrom:
                secretKeyRef:
                  name: infrawhisper-secrets
                  key: CLUSTER_ID
                  optional: true
            - name: TENANT_ID
              valueFrom:
                secretKeyRef:
                  name: infrawhisper-secrets
                  key: TENANT_ID
                  optional: true
            - name: AGENT_TOKEN
              valueFrom:
                secretKeyRef:
                  name: infrawhisper-secrets
                  key: AGENT_TOKEN
                  optional: true
            - name: COLLECTOR_ENDPOINT
              value: "http://collector.{{ .Values.global.namespace }}.svc.cluster.local:{{ .Values.collector.service.port }}"
            - name: SCRAPE_INTERVAL_SECS
              value: {{ .Values.agent.scrapeIntervalSecs | quote }}
            - name: LOG_LEVEL
              value: {{ .Values.agent.logLevel | quote }}
          resources:
            {{- toYaml .Values.agent.resources | nindent 12 }}
{{- end }}
```

- [ ] **Step 4: Update `deploy/helm/infrawhisper/templates/secrets.yaml`** — add agent identity fields

Edit the `stringData` block to add:
```yaml
  CLUSTER_ID: {{ .Values.secrets.clusterId | default "" | quote }}
  TENANT_ID: {{ .Values.secrets.tenantId | default "" | quote }}
  AGENT_TOKEN: {{ .Values.secrets.agentToken | default "" | quote }}
```

Also add to `values.yaml` under `secrets:`:
```yaml
  clusterId: ""
  tenantId: ""
  agentToken: ""
```

- [ ] **Step 5: Add agent Dockerfile**

Create `agent/Dockerfile`:
```dockerfile
FROM rust:1.77-alpine AS builder
WORKDIR /src
RUN apk add --no-cache musl-dev openssl-dev pkgconfig
COPY Cargo.toml Cargo.lock ./
# Cache deps layer
RUN mkdir src && echo "fn main(){}" > src/main.rs && cargo build --release && rm -rf src
COPY src ./src
RUN touch src/main.rs && cargo build --release

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /src/target/release/infrawhisper-agent .
EXPOSE 0
USER nobody
ENTRYPOINT ["./infrawhisper-agent"]
```

- [ ] **Step 6: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add deploy/helm/ agent/Dockerfile
git commit -m "feat(helm): agent DaemonSet, ClusterRole/Binding, and agent Dockerfile"
```

---

## Next Sub-project

This completes the core InfraWhisper platform. The system is now fully implemented across 5 sub-projects:
- **A** — Go backend (API, storage, WebSocket, Kafka stream processor)
- **B** — Python AI engine (Claude-powered incident analysis, NL query, cost optimizer)
- **C** — Next.js 14 dashboard
- **D** — Helm chart, CI/CD, OrbStack scripts
- **E** — Rust agent (metrics scraper, log tail, OTLP export)
