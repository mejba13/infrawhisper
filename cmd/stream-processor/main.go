package main

import (
	"context"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/infrawhisper/infrawhisper/internal/config"
	"github.com/infrawhisper/infrawhisper/internal/stream"
	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
	rdstore "github.com/infrawhisper/infrawhisper/internal/storage/redis"
)

func main() {
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("config load failed")
	}

	ch, err := chstore.New(cfg.ClickHouse.DSN)
	if err != nil {
		log.Fatal().Err(err).Msg("clickhouse connect failed")
	}

	redis, err := rdstore.New(cfg.Redis.Addr, cfg.Redis.Password)
	if err != nil {
		log.Fatal().Err(err).Msg("redis connect failed")
	}

	consumer, err := stream.NewConsumer(
		strings.Join(cfg.Kafka.Brokers, ","),
		cfg.Kafka.GroupID,
		ch, redis, log.Logger,
	)
	if err != nil {
		log.Fatal().Err(err).Msg("stream consumer init failed")
	}

	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		topics := []string{"infrawhisper.metrics", "infrawhisper.logs", "infrawhisper.traces"}
		if err := consumer.Start(ctx, topics); err != nil {
			log.Error().Err(err).Msg("consumer stopped")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	cancel()
	log.Info().Msg("stream processor shutdown complete")
}
