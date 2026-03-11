package stream

import (
	"context"
	"fmt"

	"github.com/rs/zerolog"

	rdstore "github.com/infrawhisper/infrawhisper/internal/storage/redis"
)

type AlertEvaluator struct {
	redis  *rdstore.Client
	logger zerolog.Logger
}

func NewAlertEvaluator(redis *rdstore.Client, logger zerolog.Logger) *AlertEvaluator {
	return &AlertEvaluator{redis: redis, logger: logger}
}

func (a *AlertEvaluator) Fire(ctx context.Context, tenantID, clusterID, name, severity string, value float64) {
	channel := fmt.Sprintf("alerts:%s", tenantID)
	if err := a.redis.Publish(ctx, channel, map[string]any{
		"type":       "alert",
		"name":       name,
		"severity":   severity,
		"value":      value,
		"cluster_id": clusterID,
	}); err != nil {
		a.logger.Error().Err(err).Msg("fire alert")
	}
}
