package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type User struct {
	ID       string `db:"id"`
	TenantID string `db:"tenant_id"`
	Email    string `db:"email"`
	Name     string `db:"name"`
	Role     string `db:"role"`
}

func (db *DB) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, tenant_id, email, name, role FROM users WHERE email = $1`, email)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	defer rows.Close()
	u, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[User])
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	return &u, nil
}
