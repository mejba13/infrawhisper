package ws

import (
	"context"
	"fmt"
	"net/http"

	"github.com/infrawhisper/infrawhisper/internal/auth"
)

func (h *Hub) ServeLogs(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromCtx(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	clusterID := r.URL.Query().Get("cluster_id")
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Error().Err(err).Msg("ws upgrade logs")
		return
	}
	client := &Client{conn: conn, send: make(chan []byte, 512), tenantID: claims.TenantID, clusterID: clusterID}
	h.register(client)
	go h.pump(client)

	sub := h.redis.Subscribe(context.Background(), fmt.Sprintf("logs:%s:%s", claims.TenantID, clusterID))
	defer sub.Close()

	for {
		select {
		case msg, ok := <-sub.Channel():
			if !ok {
				return
			}
			select {
			case client.send <- []byte(msg.Payload):
			default:
				return
			}
		case <-r.Context().Done():
			return
		}
	}
}
