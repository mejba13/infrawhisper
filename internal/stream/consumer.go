package stream

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
	"github.com/rs/zerolog"

	chstore "github.com/infrawhisper/infrawhisper/internal/storage/clickhouse"
	rdstore "github.com/infrawhisper/infrawhisper/internal/storage/redis"
)

type Consumer struct {
	c          *kafka.Consumer
	anomaly    *AnomalyDetector
	aggregator *Aggregator
	alertEval  *AlertEvaluator
	redis      *rdstore.Client
	logger     zerolog.Logger
}

func NewConsumer(brokers, groupID string, ch *chstore.DB, redis *rdstore.Client, logger zerolog.Logger) (*Consumer, error) {
	c, err := kafka.NewConsumer(&kafka.ConfigMap{
		"bootstrap.servers":  brokers,
		"group.id":           groupID,
		"auto.offset.reset":  "latest",
		"enable.auto.commit": true,
	})
	if err != nil {
		return nil, fmt.Errorf("new consumer: %w", err)
	}
	return &Consumer{
		c:          c,
		anomaly:    NewAnomalyDetector(),
		aggregator: NewAggregator(ch),
		alertEval:  NewAlertEvaluator(redis, logger),
		redis:      redis,
		logger:     logger,
	}, nil
}

func (c *Consumer) Start(ctx context.Context, topics []string) error {
	if err := c.c.SubscribeTopics(topics, nil); err != nil {
		return fmt.Errorf("subscribe topics: %w", err)
	}
	for {
		select {
		case <-ctx.Done():
			return c.c.Close()
		default:
			msg, err := c.c.ReadMessage(100)
			if err != nil {
				if kafkaErr, ok := err.(kafka.Error); ok && kafkaErr.IsTimeout() {
					continue
				}
				c.logger.Error().Err(err).Msg("kafka read")
				continue
			}
			c.process(ctx, msg)
		}
	}
}

func (c *Consumer) process(ctx context.Context, msg *kafka.Message) {
	topic := *msg.TopicPartition.Topic
	switch topic {
	case "infrawhisper.metrics":
		var point chstore.MetricPoint
		if err := json.Unmarshal(msg.Value, &point); err != nil {
			return
		}
		if c.anomaly.Detect(point) {
			channel := fmt.Sprintf("alerts:%s", point.TenantID)
			c.redis.Publish(ctx, channel, map[string]any{
				"type":       "anomaly",
				"metric":     point.MetricName,
				"value":      point.MetricValue,
				"cluster_id": point.ClusterID,
			})
		}
		c.aggregator.Add(point)
		c.redis.Publish(ctx, fmt.Sprintf("metrics:%s:%s", point.TenantID, point.ClusterID), string(msg.Value))
	case "infrawhisper.logs":
		var entry chstore.LogEntry
		if err := json.Unmarshal(msg.Value, &entry); err != nil {
			return
		}
		c.redis.Publish(ctx, fmt.Sprintf("logs:%s:%s", entry.TenantID, entry.ClusterID), string(msg.Value))
	}
}
