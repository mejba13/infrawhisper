package handlers

import "net/http"

func (h *Handler) ListPods(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"pods": []any{}})
}
