package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/infrawhisper/infrawhisper/internal/auth"
	"github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
)

func (h *Handler) GetLogs(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	logs, err := h.CH.QueryLogs(r.Context(), clickhouse.LogQuery{
		ClusterID: chi.URLParam(r, "id"),
		TenantID:  claims.TenantID,
		Namespace: q.Get("namespace"),
		Pod:       q.Get("pod"),
		Severity:  q.Get("severity"),
		Search:    q.Get("search"),
		Start:     time.Now().Add(-1 * time.Hour),
		End:       time.Now(),
		Limit:     limit,
	})
	if err != nil {
		h.Logger.Error().Err(err).Msg("query logs")
		writeErr(w, http.StatusInternalServerError, "failed to query logs")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"logs": logs})
}
