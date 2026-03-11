package handlers

import "net/http"

func (h *Handler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusAccepted)
}
