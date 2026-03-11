CREATE DATABASE IF NOT EXISTS infrawhisper;

CREATE TABLE IF NOT EXISTS infrawhisper.metrics (
    timestamp       DateTime64(3, 'UTC'),
    cluster_id      String,
    tenant_id       String,
    namespace       String,
    pod             String,
    node            String,
    container       String,
    metric_name     String,
    metric_value    Float64,
    labels          Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (cluster_id, metric_name, timestamp)
TTL timestamp + INTERVAL 30 DAY
SETTINGS index_granularity = 8192