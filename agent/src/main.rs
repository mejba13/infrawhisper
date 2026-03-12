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
