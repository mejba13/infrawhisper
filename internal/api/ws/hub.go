package ws

import (
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"

	rdstore "github.com/infrawhisper/infrawhisper/internal/storage/redis"
)

var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type Client struct {
	conn      *websocket.Conn
	send      chan []byte
	tenantID  string
	clusterID string
}

type Hub struct {
	clients map[*Client]bool
	mu      sync.RWMutex
	redis   *rdstore.Client
	logger  zerolog.Logger
}

func NewHub(redis *rdstore.Client, logger zerolog.Logger) *Hub {
	return &Hub{
		clients: make(map[*Client]bool),
		redis:   redis,
		logger:  logger,
	}
}

func (h *Hub) Run() {}

func (h *Hub) register(c *Client) {
	h.mu.Lock()
	h.clients[c] = true
	h.mu.Unlock()
}

func (h *Hub) unregister(c *Client) {
	h.mu.Lock()
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		close(c.send)
	}
	h.mu.Unlock()
}

func (h *Hub) pump(c *Client) {
	defer func() {
		h.unregister(c)
		c.conn.Close()
	}()
	for msg := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			return
		}
	}
}
