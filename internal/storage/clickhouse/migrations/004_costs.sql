CREATE TABLE IF NOT EXISTS infrawhisper.costs (
    date            Date,
    cluster_id      String,
    tenant_id       String,
    namespace       String,
    workload        String,
    resource_type   String,
    requested       Float64,
    used            Float64,
    cost_usd        Float64
) ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (cluster_id, namespace, workload, resource_type, date)