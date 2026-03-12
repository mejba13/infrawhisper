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
    pub async fn run(&self, collector: &OtlpCollector) -> Result<()> {
        info!(
            cluster_id = %self.cluster_id,
            interval_secs = self.scrape_interval_secs,
            "PodWatcher starting (stub)"
        );

        let client = Client::try_default().await?;
        let pods: Api<Pod> = Api::all(client);
        let pod_list = pods.list(&Default::default()).await?;

        info!(
            pod_count = pod_list.items.len(),
            "Connected to Kubernetes API, found pods"
        );

        let _ = collector;
        Ok(())
    }
}
