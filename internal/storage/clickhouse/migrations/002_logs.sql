CREATE TABLE IF NOT EXISTS infrawhisper.logs (
    timestamp       DateTime64(3, 'UTC'),
    cluster_id      String,
    tenant_id       String,
    namespace       String,
    pod             String,
    container       String,
    severity        String,
    body            String,
    trace_id        String,
    span_id         String,
    attributes      Map(String, String),
    INDEX idx_body body TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (cluster_id, pod, timestamp)
TTL toDateTime(timestamp) + INTERVAL 7 DAY
SETTINGS index_granularity = 8192