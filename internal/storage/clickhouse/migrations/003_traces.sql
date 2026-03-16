CREATE TABLE IF NOT EXISTS infrawhisper.traces (
    timestamp       DateTime64(3, 'UTC'),
    cluster_id      String,
    tenant_id       String,
    trace_id        String,
    span_id         String,
    parent_span_id  String,
    operation_name  String,
    service_name    String,
    duration_ms     Float64,
    status_code     UInt8,
    tags            Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (cluster_id, trace_id, timestamp)
TTL toDateTime(timestamp) + INTERVAL 7 DAY
SETTINGS index_granularity = 8192