package clickhouse

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
)

type LogEntry struct {
	Timestamp  time.Time         `ch:"timestamp"`
	ClusterID  string            `ch:"cluster_id"`
	TenantID   string            `ch:"tenant_id"`
	Namespace  string            `ch:"namespace"`
	Pod        string            `ch:"pod"`
	Container  string            `ch:"container"`
	Severity   string            `ch:"severity"`
	Body       string            `ch:"body"`
	TraceID    string            `ch:"trace_id"`
	Attributes map[string]string `ch:"attributes"`
}

type LogQuery struct {
	ClusterID string
	TenantID  string
	Namespace string
	Pod       string
	Severity  string
	Search    string
	Start     time.Time
	End       time.Time
	Limit     int
}

func (db *DB) InsertLogs(ctx context.Context, entries []LogEntry) error {
	batch, err := db.Conn.PrepareBatch(ctx, "INSERT INTO infrawhisper.logs")
	if err != nil {
		return fmt.Errorf("prepare logs batch: %w", err)
	}
	for _, e := range entries {
		if err := batch.AppendStruct(&e); err != nil {
			return fmt.Errorf("append log entry: %w", err)
		}
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send logs batch: %w", err)
	}
	return nil
}

func (db *DB) QueryLogs(ctx context.Context, q LogQuery) ([]LogEntry, error) {
	if q.Limit == 0 {
		q.Limit = 500
	}
	query := `SELECT timestamp, cluster_id, tenant_id, namespace, pod, container,
		severity, body, trace_id, attributes FROM infrawhisper.logs
		WHERE cluster_id = @cluster_id AND tenant_id = @tenant_id
		  AND timestamp BETWEEN @start AND @end`
	if q.Namespace != "" {
		query += " AND namespace = @namespace"
	}
	if q.Pod != "" {
		query += " AND pod = @pod"
	}
	if q.Severity != "" {
		query += " AND severity = @severity"
	}
	if q.Search != "" {
		query += " AND hasToken(body, @search)"
	}
	query += " ORDER BY timestamp DESC LIMIT @limit"

	rows, err := db.Conn.Query(ctx, query,
		clickhouse.Named("cluster_id", q.ClusterID),
		clickhouse.Named("tenant_id", q.TenantID),
		clickhouse.Named("start", q.Start),
		clickhouse.Named("end", q.End),
		clickhouse.Named("namespace", q.Namespace),
		clickhouse.Named("pod", q.Pod),
		clickhouse.Named("severity", q.Severity),
		clickhouse.Named("search", q.Search),
		clickhouse.Named("limit", q.Limit),
	)
	if err != nil {
		return nil, fmt.Errorf("query logs: %w", err)
	}
	defer rows.Close()

	var entries []LogEntry
	for rows.Next() {
		var e LogEntry
		if err := rows.ScanStruct(&e); err != nil {
			return nil, fmt.Errorf("scan log row: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}
