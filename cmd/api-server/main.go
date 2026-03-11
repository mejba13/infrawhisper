package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/infrawhisper/infrawhisper/internal/api"
	"github.com/infrawhisper/infrawhisper/internal/auth"
	"github.com/infrawhisper/infrawhisper/internal/config"
	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
	pgstore "github.com/infrawhisper/infrawhisper/internal/storage/postgres"
	rdstore "github.com/infrawhisper/infrawhisper/internal/storage/redis"
)

func main() {
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}

	ctx := context.Background()

	pg, err := pgstore.New(ctx, cfg.Postgres.DSN)
	if err != nil {
		log.Fatal().Err(err).Msg("postgres connect failed")
	}
	defer pg.Close()

	if err := pg.Migrate("internal/storage/postgres/migrations"); err != nil {
		log.Warn().Err(err).Msg("postgres migration warning")
	}

	ch, err := chstore.New(cfg.ClickHouse.DSN)
	if err != nil {
		log.Fatal().Err(err).Msg("clickhouse connect failed")
	}
	defer ch.Close()

	if err := ch.Migrate("internal/storage/clickhouse/migrations"); err != nil {
		log.Warn().Err(err).Msg("clickhouse migration warning")
	}

	redis, err := rdstore.New(cfg.Redis.Addr, cfg.Redis.Password)
	if err != nil {
		log.Fatal().Err(err).Msg("redis connect failed")
	}
	defer redis.Close()

	jwtSvc := auth.NewJWTService(cfg.Auth.JWTSecret, cfg.Auth.JWTIssuer)

	srv := api.NewServer(cfg.Port, api.Deps{
		PG:          pg,
		CH:          ch,
		Redis:       redis,
		JWT:         jwtSvc,
		Logger:      log.Logger,
		AIEngineURL: cfg.AIEngine.URL,
	})

	go func() {
		if err := srv.Start(); err != nil {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down...")
	shutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutCtx); err != nil {
		log.Error().Err(err).Msg("shutdown error")
	}
	log.Info().Msg("shutdown complete")
}
