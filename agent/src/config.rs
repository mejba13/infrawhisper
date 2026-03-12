use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub collector_endpoint: String,
    pub cluster_id: String,
    pub tenant_id: String,
    pub agent_token: String,
    pub scrape_interval_secs: u64,
    pub log_level: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            collector_endpoint: env::var("COLLECTOR_ENDPOINT")
                .unwrap_or_else(|_| "http://collector:4317".to_string()),
            cluster_id: env::var("CLUSTER_ID")
                .map_err(|_| anyhow::anyhow!("CLUSTER_ID is required"))?,
            tenant_id: env::var("TENANT_ID")
                .map_err(|_| anyhow::anyhow!("TENANT_ID is required"))?,
            agent_token: env::var("AGENT_TOKEN")
                .map_err(|_| anyhow::anyhow!("AGENT_TOKEN is required"))?,
            scrape_interval_secs: env::var("SCRAPE_INTERVAL_SECS")
                .unwrap_or_else(|_| "15".to_string())
                .parse()
                .unwrap_or(15),
            log_level: env::var("LOG_LEVEL").unwrap_or_else(|_| "info".to_string()),
        })
    }
}
