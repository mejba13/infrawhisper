package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/infrawhisper/infrawhisper/internal/auth"
)

func (h *Handler) NLQuery(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req struct {
		Query string `json:"query"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}
	if req.Query == "" {
		writeErr(w, http.StatusBadRequest, "query is required")
		return
	}
	payload, _ := json.Marshal(map[string]any{
		"query":      req.Query,
		"cluster_id": chi.URLParam(r, "id"),
		"tenant_id":  claims.TenantID,
	})
	resp, err := http.Post(
		fmt.Sprintf("%s/query", h.AIEngineURL),
		"application/json",
		bytes.NewReader(payload),
	)
	if err != nil {
		h.Logger.Error().Err(err).Msg("ai engine request")
		writeErr(w, http.StatusBadGateway, "ai engine unavailable")
		return
	}
	defer resp.Body.Close()
	var result map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		writeErr(w, http.StatusBadGateway, "invalid ai engine response")
		return
	}
	writeJSON(w, http.StatusOK, result)
}
