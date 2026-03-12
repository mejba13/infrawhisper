use crate::collector::OtlpCollector;
use crate::config::Config;
use crate::metrics_api::PodMetrics;
use anyhow::Result;
use kube::{Api, Client};
use std::sync::Arc;
use std::time::Duration;
use tokio::time;
use tracing::{error, info};

pub struct PodWatcher {
    scrape_interval: Duration,
}

impl PodWatcher {
    pub fn new(config: &Config) -> Self {
        Self {
            scrape_interval: Duration::from_secs(config.scrape_interval_secs),
        }
    }

    pub async fn run(
        &self,
        collector: Arc<OtlpCollector>,
        mut shutdown: tokio::sync::watch::Receiver<bool>,
    ) -> Result<()> {
        info!(interval_secs = ?self.scrape_interval, "PodWatcher starting");

        let client = Client::try_default()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create K8s client: {e}"))?;

        let mut interval = time::interval(self.scrape_interval);

        loop {
            tokio::select! {
                _ = interval.tick() => {
                    if let Err(e) = scrape_pods(&client, &collector).await {
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
}

async fn scrape_pods(client: &Client, collector: &OtlpCollector) -> Result<()> {
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

    info!(containers_scraped = count, "Pod metrics recorded");
    Ok(())
}
