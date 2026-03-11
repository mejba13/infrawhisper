package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type Incident struct {
	ID        string  `db:"id"`
	TenantID  string  `db:"tenant_id"`
	ClusterID string  `db:"cluster_id"`
	Title     string  `db:"title"`
	Severity  string  `db:"severity"`
	Status    string  `db:"status"`
	RootCause *string `db:"root_cause"`
	AISummary *string `db:"ai_summary"`
}

func (db *DB) ListIncidents(ctx context.Context, clusterID, tenantID string) ([]Incident, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, tenant_id, cluster_id, title, severity, status, root_cause, ai_summary
		 FROM incidents WHERE cluster_id = $1 AND tenant_id = $2
		 ORDER BY created_at DESC LIMIT 100`, clusterID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list incidents: %w", err)
	}
	defer rows.Close()
	return pgx.CollectRows(rows, pgx.RowToStructByName[Incident])
}

func (db *DB) CreateIncident(ctx context.Context, i *Incident) error {
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO incidents (tenant_id, cluster_id, title, severity, status)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		i.TenantID, i.ClusterID, i.Title, i.Severity, i.Status,
	).Scan(&i.ID)
	if err != nil {
		return fmt.Errorf("create incident: %w", err)
	}
	return nil
}

func (db *DB) UpdateIncidentAI(ctx context.Context, id, rootCause, aiSummary string) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE incidents SET root_cause = $1, ai_summary = $2, updated_at = NOW() WHERE id = $3`,
		rootCause, aiSummary, id)
	if err != nil {
		return fmt.Errorf("update incident ai: %w", err)
	}
	return nil
}
