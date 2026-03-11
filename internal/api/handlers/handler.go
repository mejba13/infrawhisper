package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/rs/zerolog"

	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
	pgstore "github.com/infrawhisper/infrawhisper/internal/storage/postgres"
	rdstore "github.com/infrawhisper/infrawhisper/internal/storage/redis"
)

type Handler struct {
	PG          *pgstore.DB
	CH          *chstore.DB
	Redis       *rdstore.Client
	Logger      zerolog.Logger
	AIEngineURL string
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
