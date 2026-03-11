package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type Cluster struct {
	ID         string  `db:"id"`
	TenantID   string  `db:"tenant_id"`
	Name       string  `db:"name"`
	Provider   string  `db:"provider"`
	Region     string  `db:"region"`
	K8sVersion string  `db:"k8s_version"`
	Status     string  `db:"status"`
	NodeCount  int     `db:"node_count"`
	AgentToken string  `db:"agent_token"`
}

func (db *DB) ListClusters(ctx context.Context, tenantID string) ([]Cluster, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, tenant_id, name, provider, region, COALESCE(k8s_version, '') as k8s_version, status, node_count, agent_token
		 FROM clusters WHERE tenant_id = $1 ORDER BY created_at DESC`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list clusters: %w", err)
	}
	defer rows.Close()
	return pgx.CollectRows(rows, pgx.RowToStructByName[Cluster])
}

func (db *DB) GetCluster(ctx context.Context, id, tenantID string) (*Cluster, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, tenant_id, name, provider, region, COALESCE(k8s_version, '') as k8s_version, status, node_count, agent_token
		 FROM clusters WHERE id = $1 AND tenant_id = $2`, id, tenantID)
	if err != nil {
		return nil, fmt.Errorf("get cluster: %w", err)
	}
	defer rows.Close()
	c, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[Cluster])
	if err != nil {
		return nil, fmt.Errorf("get cluster: %w", err)
	}
	return &c, nil
}

func (db *DB) CreateCluster(ctx context.Context, c *Cluster) error {
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO clusters (tenant_id, name, provider, region, k8s_version)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, agent_token`,
		c.TenantID, c.Name, c.Provider, c.Region, c.K8sVersion,
	).Scan(&c.ID, &c.AgentToken)
	if err != nil {
		return fmt.Errorf("create cluster: %w", err)
	}
	return nil
}

func (db *DB) UpdateClusterStatus(ctx context.Context, id string, status string, nodeCount int) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE clusters SET status = $1, node_count = $2, updated_at = NOW() WHERE id = $3`,
		status, nodeCount, id)
	if err != nil {
		return fmt.Errorf("update cluster status: %w", err)
	}
	return nil
}
