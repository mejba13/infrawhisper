use crate::collector::OtlpCollector;
use crate::config::Config;
use anyhow::Result;
use futures::{AsyncBufReadExt, StreamExt};
use k8s_openapi::api::core::v1::Pod;
use kube::{
    api::{Api, ListParams, LogParams},
    Client,
};
use std::sync::Arc;
use tracing::{info, warn};

pub struct LogTailer {
    cluster_id: String,
}

impl LogTailer {
    pub fn new(config: &Config) -> Self {
        Self {
            cluster_id: config.cluster_id.clone(),
        }
    }

    pub async fn run(
        &self,
        collector: Arc<OtlpCollector>,
        mut shutdown: tokio::sync::watch::Receiver<bool>,
    ) -> Result<()> {
        info!(cluster_id = %self.cluster_id, "LogTailer starting");

        let client = Client::try_default()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create K8s client: {e}"))?;

        let pods: Api<Pod> = Api::all(client.clone());
        let lp = ListParams::default().fields("status.phase=Running");
        let pod_list = pods
            .list(&lp)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to list pods: {e}"))?;

        info!(pod_count = pod_list.items.len(), "Starting log streams");

        for pod in pod_list.items {
            let name = match pod.metadata.name.clone() {
                Some(n) => n,
                None => continue,
            };
            let namespace = pod
                .metadata
                .namespace
                .clone()
                .unwrap_or_else(|| "default".into());
            let containers: Vec<String> = pod
                .spec
                .as_ref()
                .map(|s| s.containers.iter().map(|c| c.name.clone()).collect())
                .unwrap_or_default();

            for container in containers {
                let collector_c = collector.clone();
                let client_c = client.clone();
                let mut sd = shutdown.clone();
                let ns = namespace.clone();
                let pod_name = name.clone();
                let cname = container.clone();

                tokio::spawn(async move {
                    loop {
                        match stream_logs(&client_c, &ns, &pod_name, &cname, &collector_c, &mut sd)
                            .await
                        {
                            Ok(_) => break,
                            Err(e) => {
                                warn!(pod = %pod_name, container = %cname, error = %e, "Log stream ended, retrying in 5s");
                                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                                if *sd.borrow() {
                                    break;
                                }
                            }
                        }
                    }
                });
            }
        }

        // Wait for shutdown
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
        tail_lines: Some(50),
        ..Default::default()
    };

    let reader = pods
        .log_stream(pod, &lp)
        .await
        .map_err(|e| anyhow::anyhow!("log_stream failed for {pod}/{container}: {e}"))?;

    let mut lines = reader.lines();

    loop {
        tokio::select! {
            item = lines.next() => {
                match item {
                    Some(Ok(line)) => {
                        if !line.is_empty() {
                            collector.emit_log(namespace, pod, container, &line);
                        }
                    }
                    Some(Err(e)) => return Err(anyhow::anyhow!("Log stream read error: {e}")),
                    None => break,
                }
            }
            _ = shutdown.changed() => break,
        }
    }
    Ok(())
}
