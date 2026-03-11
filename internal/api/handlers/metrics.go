package handlers

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/infrawhisper/infrawhisper/internal/auth"
	"github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
)

func (h *Handler) GetMetrics(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	q := r.URL.Query()
	metricName := q.Get("metric")
	if metricName == "" {
		metricName = "cpu_usage"
	}
	step := q.Get("step")
	if step == "" {
		step = "1 MINUTE"
	}
	points, err := h.CH.QueryMetrics(r.Context(), clickhouse.MetricQuery{
		ClusterID:  chi.URLParam(r, "id"),
		TenantID:   claims.TenantID,
		MetricName: metricName,
		Start:      time.Now().Add(-1 * time.Hour),
		End:        time.Now(),
		Step:       step,
	})
	if err != nil {
		h.Logger.Error().Err(err).Msg("query metrics")
		writeErr(w, http.StatusInternalServerError, "failed to query metrics")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"metric": metricName, "data": points})
}
