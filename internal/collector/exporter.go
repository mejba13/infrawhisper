package collector

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

type Exporter struct {
	producer *kafka.Producer
}

func NewExporter(brokers string) (*Exporter, error) {
	p, err := kafka.NewProducer(&kafka.ConfigMap{"bootstrap.servers": brokers})
	if err != nil {
		return nil, fmt.Errorf("kafka producer: %w", err)
	}
	return &Exporter{producer: p}, nil
}

func (e *Exporter) Publish(ctx context.Context, topic string, payload any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}
	return e.producer.Produce(&kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: kafka.PartitionAny},
		Value:          data,
	}, nil)
}

func (e *Exporter) Close() {
	e.producer.Flush(5000)
	e.producer.Close()
}
