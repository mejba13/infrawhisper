package handlers

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/infrawhisper/infrawhisper/internal/auth"
)

func (h *Handler) GetCosts(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	records, err := h.CH.QueryCosts(r.Context(),
		chi.URLParam(r, "id"), claims.TenantID,
		time.Now().AddDate(0, -1, 0), time.Now(),
	)
	if err != nil {
		h.Logger.Error().Err(err).Msg("query costs")
		writeErr(w, http.StatusInternalServerError, "failed to query costs")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"costs": records})
}
