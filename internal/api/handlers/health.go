package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
	pgstore "github.com/infrawhisper/infrawhisper/internal/storage/postgres"
	rdstore "github.com/infrawhisper/infrawhisper/internal/storage/redis"
)

func Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "time": time.Now().UTC().Format(time.RFC3339)})
}

func Ready(pg *pgstore.DB, ch *chstore.DB, redis *rdstore.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		checks := map[string]string{}
		if err := pg.Pool.Ping(ctx); err != nil {
			checks["postgres"] = "unhealthy"
		} else {
			checks["postgres"] = "ok"
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(checks)
	}
}
