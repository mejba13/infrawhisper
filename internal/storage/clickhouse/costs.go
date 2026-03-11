package clickhouse

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
)

type CostRecord struct {
	Date         time.Time `ch:"date"`
	ClusterID    string    `ch:"cluster_id"`
	TenantID     string    `ch:"tenant_id"`
	Namespace    string    `ch:"namespace"`
	Workload     string    `ch:"workload"`
	ResourceType string    `ch:"resource_type"`
	Requested    float64   `ch:"requested"`
	Used         float64   `ch:"used"`
	CostUSD      float64   `ch:"cost_usd"`
}

func (db *DB) InsertCosts(ctx context.Context, records []CostRecord) error {
	batch, err := db.Conn.PrepareBatch(ctx, "INSERT INTO infrawhisper.costs")
	if err != nil {
		return fmt.Errorf("prepare costs batch: %w", err)
	}
	for _, r := range records {
		if err := batch.AppendStruct(&r); err != nil {
			return fmt.Errorf("append cost record: %w", err)
		}
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send costs batch: %w", err)
	}
	return nil
}

func (db *DB) QueryCosts(ctx context.Context, clusterID, tenantID string, start, end time.Time) ([]CostRecord, error) {
	rows, err := db.Conn.Query(ctx,
		`SELECT date, cluster_id, tenant_id, namespace, workload, resource_type,
		        sum(requested) AS requested, sum(used) AS used, sum(cost_usd) AS cost_usd
		 FROM infrawhisper.costs
		 WHERE cluster_id = @cluster_id AND tenant_id = @tenant_id
		   AND date BETWEEN @start AND @end
		 GROUP BY date, cluster_id, tenant_id, namespace, workload, resource_type
		 ORDER BY cost_usd DESC`,
		clickhouse.Named("cluster_id", clusterID),
		clickhouse.Named("tenant_id", tenantID),
		clickhouse.Named("start", start),
		clickhouse.Named("end", end),
	)
	if err != nil {
		return nil, fmt.Errorf("query costs: %w", err)
	}
	defer rows.Close()

	var records []CostRecord
	for rows.Next() {
		var r CostRecord
		if err := rows.ScanStruct(&r); err != nil {
			return nil, fmt.Errorf("scan cost row: %w", err)
		}
		records = append(records, r)
	}
	return records, rows.Err()
}
