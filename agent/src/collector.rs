use crate::config::Config;
use anyhow::{Context, Result};
use opentelemetry::{global, metrics::Gauge, KeyValue};
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::{metrics::SdkMeterProvider, runtime, Resource};
use std::time::Duration;
use tracing::{debug, info};

pub struct OtlpCollector {
    cluster_id: String,
    provider: SdkMeterProvider,
    pod_cpu_gauge: Gauge<f64>,
    pod_memory_gauge: Gauge<f64>,
    node_cpu_gauge: Gauge<f64>,
    node_memory_gauge: Gauge<f64>,
}

impl OtlpCollector {
    pub fn new(config: &Config) -> Result<Self> {
        // Build OTLP metrics pipeline
        let provider = opentelemetry_otlp::new_pipeline()
            .metrics(runtime::Tokio)
            .with_exporter(
                opentelemetry_otlp::new_exporter()
                    .tonic()
                    .with_endpoint(&config.collector_endpoint)
                    .with_timeout(Duration::from_secs(10)),
            )
            .with_period(Duration::from_secs(30))
            .with_resource(Resource::new(vec![
                KeyValue::new("service.name", "infrawhisper-agent"),
                KeyValue::new("k8s.cluster.id", config.cluster_id.clone()),
                KeyValue::new("infrawhisper.tenant.id", config.tenant_id.clone()),
            ]))
            .build()
            .context("Failed to build OTLP metrics pipeline")?;

        global::set_meter_provider(provider.clone());

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
            "OtlpCollector initialized"
        );

        Ok(Self {
            cluster_id: config.cluster_id.clone(),
            provider,
            pod_cpu_gauge,
            pod_memory_gauge,
            node_cpu_gauge,
            node_memory_gauge,
        })
    }

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

    pub fn record_node_cpu(&self, node: &str, millicores: f64) {
        self.node_cpu_gauge.record(
            millicores,
            &[
                KeyValue::new("k8s.node.name", node.to_string()),
                KeyValue::new("k8s.cluster.id", self.cluster_id.clone()),
            ],
        );
    }

    pub fn record_node_memory(&self, node: &str, bytes: f64) {
        self.node_memory_gauge.record(
            bytes,
            &[
                KeyValue::new("k8s.node.name", node.to_string()),
                KeyValue::new("k8s.cluster.id", self.cluster_id.clone()),
            ],
        );
    }

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

    pub fn shutdown(&self) {
        info!("Shutting down OTLP meter provider");
        if let Err(e) = self.provider.shutdown() {
            tracing::warn!(error = %e, "Error shutting down OTLP meter provider");
        }
    }
}
