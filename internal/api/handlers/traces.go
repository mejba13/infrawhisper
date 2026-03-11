package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/infrawhisper/infrawhisper/internal/auth"
)

func (h *Handler) GetTraces(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	traceID := r.URL.Query().Get("trace_id")
	if traceID == "" {
		writeJSON(w, http.StatusOK, map[string]any{"spans": []any{}})
		return
	}
	spans, err := h.CH.GetTrace(r.Context(), traceID, chi.URLParam(r, "id"), claims.TenantID)
	if err != nil {
		h.Logger.Error().Err(err).Msg("get trace")
		writeErr(w, http.StatusInternalServerError, "failed to get trace")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"spans": spans})
}
