package stream

import (
	"context"
	"sync"
	"time"

	"github.com/rs/zerolog/log"

	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
)

type Aggregator struct {
	mu     sync.Mutex
	buffer []chstore.MetricPoint
	ch     *chstore.DB
	ticker *time.Ticker
}

func NewAggregator(ch *chstore.DB) *Aggregator {
	a := &Aggregator{ch: ch, ticker: time.NewTicker(60 * time.Second)}
	go a.flush()
	return a
}

func (a *Aggregator) Add(p chstore.MetricPoint) {
	a.mu.Lock()
	a.buffer = append(a.buffer, p)
	a.mu.Unlock()
}

func (a *Aggregator) flush() {
	for range a.ticker.C {
		a.mu.Lock()
		if len(a.buffer) == 0 {
			a.mu.Unlock()
			continue
		}
		batch := a.buffer
		a.buffer = nil
		a.mu.Unlock()
		if err := a.ch.InsertMetrics(context.Background(), batch); err != nil {
			log.Error().Err(err).Msg("aggregator flush metrics")
		}
	}
}
