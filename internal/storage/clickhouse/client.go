package clickhouse

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type DB struct {
	Conn driver.Conn
}

func New(dsn string) (*DB, error) {
	opts, err := clickhouse.ParseDSN(dsn)
	if err != nil {
		return nil, fmt.Errorf("clickhouse parse dsn: %w", err)
	}
	conn, err := clickhouse.Open(opts)
	if err != nil {
		return nil, fmt.Errorf("clickhouse open: %w", err)
	}
	if err := conn.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("clickhouse ping: %w", err)
	}
	return &DB{Conn: conn}, nil
}

func (db *DB) Migrate(migrationsPath string) error {
	entries, err := os.ReadDir(migrationsPath)
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}
	for _, e := range entries {
		if !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(migrationsPath, e.Name()))
		if err != nil {
			return fmt.Errorf("read migration %s: %w", e.Name(), err)
		}
		// Split on semicolons to run multiple statements
		stmts := strings.Split(string(data), ";")
		for _, stmt := range stmts {
			stmt = strings.TrimSpace(stmt)
			if stmt == "" {
				continue
			}
			if err := db.Conn.Exec(context.Background(), stmt); err != nil {
				return fmt.Errorf("exec migration %s: %w", e.Name(), err)
			}
		}
	}
	return nil
}

func (db *DB) Close() error {
	return db.Conn.Close()
}
