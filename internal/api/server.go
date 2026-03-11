package api

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/rs/zerolog"

	"github.com/infrawhisper/infrawhisper/internal/api/handlers"
	"github.com/infrawhisper/infrawhisper/internal/api/middleware"
	"github.com/infrawhisper/infrawhisper/internal/auth"
	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
	pgstore "github.com/infrawhisper/infrawhisper/internal/storage/postgres"
	rdstore "github.com/infrawhisper/infrawhisper/internal/storage/redis"
)

type Server struct {
	srv    *http.Server
	logger zerolog.Logger
}

type Deps struct {
	PG          *pgstore.DB
	CH          *chstore.DB
	Redis       *rdstore.Client
	JWT         *auth.JWTService
	Logger      zerolog.Logger
	AIEngineURL string
}

func NewServer(port string, deps Deps) *Server {
	r := chi.NewRouter()
	limiter := middleware.NewRateLimiter(100, 200)

	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(middleware.CORS([]string{"*"}))
	r.Use(middleware.RequestLogger(deps.Logger))
	r.Use(middleware.RateLimit(limiter))

	h := &handlers.Handler{
		PG:          deps.PG,
		CH:          deps.CH,
		Redis:       deps.Redis,
		Logger:      deps.Logger,
		AIEngineURL: deps.AIEngineURL,
	}

	r.Get("/health", handlers.Health)
	r.Get("/ready", handlers.Ready(deps.PG, deps.CH, deps.Redis))

	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.Auth(deps.JWT))
		r.Get("/clusters", h.ListClusters)
		r.Post("/clusters", h.CreateCluster)
		r.Route("/clusters/{id}", func(r chi.Router) {
			r.Get("/", h.GetCluster)
			r.Get("/pods", h.ListPods)
			r.Get("/metrics", h.GetMetrics)
			r.Get("/logs", h.GetLogs)
			r.Get("/traces", h.GetTraces)
			r.Get("/incidents", h.ListIncidents)
			r.Get("/costs", h.GetCosts)
			r.Post("/query", h.NLQuery)
			r.Get("/alerts", h.ListAlerts)
			r.Post("/alerts", h.CreateAlert)
			r.Delete("/alerts/{alertID}", h.DeleteAlert)
		})
		r.Post("/webhooks", h.HandleWebhook)
	})

	return &Server{
		srv: &http.Server{
			Addr:         ":" + port,
			Handler:      r,
			ReadTimeout:  30 * time.Second,
			WriteTimeout: 30 * time.Second,
			IdleTimeout:  60 * time.Second,
		},
		logger: deps.Logger,
	}
}

func (s *Server) Start() error {
	s.logger.Info().Str("addr", s.srv.Addr).Msg("API server starting")
	if err := s.srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return fmt.Errorf("listen: %w", err)
	}
	return nil
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.srv.Shutdown(ctx)
}
