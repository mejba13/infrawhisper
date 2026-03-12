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
    pub async fn init(&self) -> Result<()> {
        info!(
            endpoint = %self.endpoint,
            cluster_id = %self.cluster_id,
            "OtlpCollector initialized (stub)"
        );
        Ok(())
    }

    /// Send a metric data point to the collector.
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
