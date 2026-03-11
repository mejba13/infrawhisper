package clickhouse

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
)

type MetricPoint struct {
	Timestamp   time.Time         `ch:"timestamp"`
	ClusterID   string            `ch:"cluster_id"`
	TenantID    string            `ch:"tenant_id"`
	Namespace   string            `ch:"namespace"`
	Pod         string            `ch:"pod"`
	Node        string            `ch:"node"`
	Container   string            `ch:"container"`
	MetricName  string            `ch:"metric_name"`
	MetricValue float64           `ch:"metric_value"`
	Labels      map[string]string `ch:"labels"`
}

func (db *DB) InsertMetrics(ctx context.Context, points []MetricPoint) error {
	batch, err := db.Conn.PrepareBatch(ctx, "INSERT INTO infrawhisper.metrics")
	if err != nil {
		return fmt.Errorf("prepare metrics batch: %w", err)
	}
	for _, p := range points {
		if err := batch.AppendStruct(&p); err != nil {
			return fmt.Errorf("append metric: %w", err)
		}
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send metrics batch: %w", err)
	}
	return nil
}

type MetricQuery struct {
	ClusterID  string
	TenantID   string
	MetricName string
	Namespace  string
	Pod        string
	Start      time.Time
	End        time.Time
	Step       string
}

func (db *DB) QueryMetrics(ctx context.Context, q MetricQuery) ([]MetricPoint, error) {
	if q.Step == "" {
		q.Step = "1 MINUTE"
	}
	query := fmt.Sprintf(`
		SELECT
			toStartOfInterval(timestamp, INTERVAL %s) AS timestamp,
			cluster_id, tenant_id, namespace, pod, node, container,
			metric_name, avg(metric_value) AS metric_value, any(labels) AS labels
		FROM infrawhisper.metrics
		WHERE cluster_id = @cluster_id
		  AND tenant_id = @tenant_id
		  AND metric_name = @metric_name
		  AND timestamp BETWEEN @start AND @end
		GROUP BY timestamp, cluster_id, tenant_id, namespace, pod, node, container, metric_name
		ORDER BY timestamp ASC`, q.Step)

	rows, err := db.Conn.Query(ctx, query,
		clickhouse.Named("cluster_id", q.ClusterID),
		clickhouse.Named("tenant_id", q.TenantID),
		clickhouse.Named("metric_name", q.MetricName),
		clickhouse.Named("start", q.Start),
		clickhouse.Named("end", q.End),
	)
	if err != nil {
		return nil, fmt.Errorf("query metrics: %w", err)
	}
	defer rows.Close()

	var points []MetricPoint
	for rows.Next() {
		var p MetricPoint
		if err := rows.ScanStruct(&p); err != nil {
			return nil, fmt.Errorf("scan metric row: %w", err)
		}
		points = append(points, p)
	}
	return points, rows.Err()
}
