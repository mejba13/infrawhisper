package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/infrawhisper/infrawhisper/internal/auth"
	"github.com/infrawhisper/infrawhisper/internal/storage/postgres"
)

func (h *Handler) ListClusters(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	clusters, err := h.PG.ListClusters(r.Context(), claims.TenantID)
	if err != nil {
		h.Logger.Error().Err(err).Msg("list clusters")
		writeErr(w, http.StatusInternalServerError, "failed to list clusters")
		return
	}
	writeJSON(w, http.StatusOK, clusters)
}

func (h *Handler) GetCluster(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	cluster, err := h.PG.GetCluster(r.Context(), chi.URLParam(r, "id"), claims.TenantID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "cluster not found")
		return
	}
	writeJSON(w, http.StatusOK, cluster)
}

func (h *Handler) CreateCluster(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err := auth.RequireRole(claims.Role, auth.RoleEditor); err != nil {
		writeErr(w, http.StatusForbidden, "forbidden")
		return
	}
	var req struct {
		Name       string `json:"name"`
		Provider   string `json:"provider"`
		Region     string `json:"region"`
		K8sVersion string `json:"k8s_version"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" || req.Provider == "" || req.Region == "" {
		writeErr(w, http.StatusBadRequest, "name, provider, and region are required")
		return
	}
	c := &postgres.Cluster{
		TenantID:   claims.TenantID,
		Name:       req.Name,
		Provider:   req.Provider,
		Region:     req.Region,
		K8sVersion: req.K8sVersion,
	}
	if err := h.PG.CreateCluster(r.Context(), c); err != nil {
		h.Logger.Error().Err(err).Msg("create cluster")
		writeErr(w, http.StatusInternalServerError, "failed to create cluster")
		return
	}
	writeJSON(w, http.StatusCreated, c)
}
