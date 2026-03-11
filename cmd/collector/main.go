package main

import (
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/infrawhisper/infrawhisper/internal/collector"
	"github.com/infrawhisper/infrawhisper/internal/config"
	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
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
	defer ch.Close()

	exporter, err := collector.NewExporter(strings.Join(cfg.Kafka.Brokers, ","))
	if err != nil {
		log.Fatal().Err(err).Msg("kafka exporter init failed")
	}
	defer exporter.Close()

	processor := collector.NewProcessor(ch, log.Logger)
	receiver := collector.NewReceiver(processor, log.Logger)

	go func() {
		if err := receiver.Start(":4317"); err != nil {
			log.Fatal().Err(err).Msg("otlp receiver failed")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	receiver.Stop()
	log.Info().Msg("collector shutdown complete")
}
