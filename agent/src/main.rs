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

    let collector = Arc::new(
        collector::OtlpCollector::new(&cfg)
            .map_err(|e| anyhow::anyhow!("Failed to init OTLP collector: {e}"))?,
    );

    let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);

    // Ctrl-C handler
    {
        let tx = shutdown_tx.clone();
        tokio::spawn(async move {
            let _ = tokio::signal::ctrl_c().await;
            info!("Ctrl-C received, shutting down");
            let _ = tx.send(true);
        });
    }

    // SIGTERM handler (Unix only)
    #[cfg(unix)]
    {
        use tokio::signal::unix::{signal, SignalKind};
        let tx = shutdown_tx.clone();
        tokio::spawn(async move {
            if let Ok(mut s) = signal(SignalKind::terminate()) {
                s.recv().await;
                info!("SIGTERM received, shutting down");
                let _ = tx.send(true);
            }
        });
    }

    let pod_watcher = watcher::PodWatcher::new(&cfg);
    let node_watcher = node_watcher::NodeWatcher::new(&cfg);
    let log_tailer = log_tail::LogTailer::new(&cfg);

    let h1 = {
        let c = collector.clone();
        let rx = shutdown_rx.clone();
        tokio::spawn(async move {
            if let Err(e) = pod_watcher.run(c, rx).await {
                tracing::error!(error = %e, "PodWatcher error");
            }
        })
    };

    let h2 = {
        let c = collector.clone();
        let rx = shutdown_rx.clone();
        tokio::spawn(async move {
            if let Err(e) = node_watcher.run(c, rx).await {
                tracing::error!(error = %e, "NodeWatcher error");
            }
        })
    };

    let h3 = {
        let c = collector.clone();
        let rx = shutdown_rx.clone();
        tokio::spawn(async move {
            if let Err(e) = log_tailer.run(c, rx).await {
                tracing::error!(error = %e, "LogTailer error");
            }
        })
    };

    let _ = tokio::join!(h1, h2, h3);

    collector.shutdown();
    info!("InfraWhisper agent stopped");
    Ok(())
}
