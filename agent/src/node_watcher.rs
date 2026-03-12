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
    scrape_interval: Duration,
}

impl NodeWatcher {
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
        info!("NodeWatcher starting");

        let client = Client::try_default()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create K8s client: {e}"))?;

        let mut interval = time::interval(self.scrape_interval);

        loop {
            tokio::select! {
                _ = interval.tick() => {
                    if let Err(e) = scrape_nodes(&client, &collector).await {
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
}

async fn scrape_nodes(client: &Client, collector: &OtlpCollector) -> Result<()> {
    let node_metrics: Api<NodeMetrics> = Api::all(client.clone());

    let list = node_metrics
        .list(&Default::default())
        .await
        .map_err(|e| anyhow::anyhow!("Failed to list NodeMetrics: {e}"))?;

    for nm in &list.items {
        let node = nm.metadata.name.as_deref().unwrap_or("unknown");
        collector.record_node_cpu(node, nm.usage.cpu.to_millicores());
        collector.record_node_memory(node, nm.usage.memory.to_bytes());
    }

    info!(nodes_scraped = list.items.len(), "Node metrics recorded");
    Ok(())
}
