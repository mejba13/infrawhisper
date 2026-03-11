package clickhouse

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
)

type Span struct {
	Timestamp    time.Time         `ch:"timestamp"`
	ClusterID    string            `ch:"cluster_id"`
	TenantID     string            `ch:"tenant_id"`
	TraceID      string            `ch:"trace_id"`
	SpanID       string            `ch:"span_id"`
	ParentSpanID string            `ch:"parent_span_id"`
	Operation    string            `ch:"operation_name"`
	Service      string            `ch:"service_name"`
	DurationMs   float64           `ch:"duration_ms"`
	StatusCode   uint8             `ch:"status_code"`
	Tags         map[string]string `ch:"tags"`
}

func (db *DB) InsertSpans(ctx context.Context, spans []Span) error {
	batch, err := db.Conn.PrepareBatch(ctx, "INSERT INTO infrawhisper.traces")
	if err != nil {
		return fmt.Errorf("prepare spans batch: %w", err)
	}
	for _, s := range spans {
		if err := batch.AppendStruct(&s); err != nil {
			return fmt.Errorf("append span: %w", err)
		}
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send spans batch: %w", err)
	}
	return nil
}

func (db *DB) GetTrace(ctx context.Context, traceID, clusterID, tenantID string) ([]Span, error) {
	rows, err := db.Conn.Query(ctx,
		`SELECT timestamp, cluster_id, tenant_id, trace_id, span_id, parent_span_id,
		        operation_name, service_name, duration_ms, status_code, tags
		 FROM infrawhisper.traces
		 WHERE trace_id = @trace_id AND cluster_id = @cluster_id AND tenant_id = @tenant_id
		 ORDER BY timestamp ASC`,
		clickhouse.Named("trace_id", traceID),
		clickhouse.Named("cluster_id", clusterID),
		clickhouse.Named("tenant_id", tenantID),
	)
	if err != nil {
		return nil, fmt.Errorf("get trace: %w", err)
	}
	defer rows.Close()

	var spans []Span
	for rows.Next() {
		var s Span
		if err := rows.ScanStruct(&s); err != nil {
			return nil, fmt.Errorf("scan span row: %w", err)
		}
		spans = append(spans, s)
	}
	return spans, rows.Err()
}
