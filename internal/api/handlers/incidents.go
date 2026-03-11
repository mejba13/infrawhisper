package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/infrawhisper/infrawhisper/internal/auth"
)

func (h *Handler) ListIncidents(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	incidents, err := h.PG.ListIncidents(r.Context(), chi.URLParam(r, "id"), claims.TenantID)
	if err != nil {
		h.Logger.Error().Err(err).Msg("list incidents")
		writeErr(w, http.StatusInternalServerError, "failed to list incidents")
		return
	}
	writeJSON(w, http.StatusOK, incidents)
}
