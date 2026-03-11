package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/infrawhisper/infrawhisper/internal/auth"
	"github.com/infrawhisper/infrawhisper/internal/storage/postgres"
)

func (h *Handler) ListAlerts(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	rules, err := h.PG.ListAlertRules(r.Context(), claims.TenantID)
	if err != nil {
		h.Logger.Error().Err(err).Msg("list alerts")
		writeErr(w, http.StatusInternalServerError, "failed to list alerts")
		return
	}
	writeJSON(w, http.StatusOK, rules)
}

func (h *Handler) CreateAlert(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var rule postgres.AlertRule
	if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}
	rule.TenantID = claims.TenantID
	clusterID := chi.URLParam(r, "id")
	rule.ClusterID = &clusterID
	if err := h.PG.CreateAlertRule(r.Context(), &rule); err != nil {
		h.Logger.Error().Err(err).Msg("create alert")
		writeErr(w, http.StatusInternalServerError, "failed to create alert")
		return
	}
	writeJSON(w, http.StatusCreated, rule)
}

func (h *Handler) DeleteAlert(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err := h.PG.DeleteAlertRule(r.Context(), chi.URLParam(r, "alertID"), claims.TenantID); err != nil {
		h.Logger.Error().Err(err).Msg("delete alert")
		writeErr(w, http.StatusInternalServerError, "failed to delete alert")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
