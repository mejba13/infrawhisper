package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type AlertRule struct {
	ID          string          `db:"id"`
	TenantID    string          `db:"tenant_id"`
	ClusterID   *string         `db:"cluster_id"`
	Name        string          `db:"name"`
	Description *string         `db:"description"`
	Condition   json.RawMessage `db:"condition"`
	Severity    string          `db:"severity"`
	Enabled     bool            `db:"enabled"`
	Channels    json.RawMessage `db:"channels"`
}

func (db *DB) ListAlertRules(ctx context.Context, tenantID string) ([]AlertRule, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, tenant_id, cluster_id, name, description, condition, severity, enabled, channels
		 FROM alert_rules WHERE tenant_id = $1 ORDER BY created_at DESC`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list alert rules: %w", err)
	}
	defer rows.Close()
	return pgx.CollectRows(rows, pgx.RowToStructByName[AlertRule])
}

func (db *DB) CreateAlertRule(ctx context.Context, r *AlertRule) error {
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO alert_rules (tenant_id, cluster_id, name, description, condition, severity, channels)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		r.TenantID, r.ClusterID, r.Name, r.Description, r.Condition, r.Severity, r.Channels,
	).Scan(&r.ID)
	if err != nil {
		return fmt.Errorf("create alert rule: %w", err)
	}
	return nil
}

func (db *DB) DeleteAlertRule(ctx context.Context, id, tenantID string) error {
	_, err := db.Pool.Exec(ctx,
		`DELETE FROM alert_rules WHERE id = $1 AND tenant_id = $2`, id, tenantID)
	if err != nil {
		return fmt.Errorf("delete alert rule: %w", err)
	}
	return nil
}
