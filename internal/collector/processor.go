package collector

import (
	"github.com/rs/zerolog"

	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
)

type Processor struct {
	ch     *chstore.DB
	logger zerolog.Logger
}

func NewProcessor(ch *chstore.DB, logger zerolog.Logger) *Processor {
	return &Processor{ch: ch, logger: logger}
}
