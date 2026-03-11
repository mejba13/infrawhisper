package stream

import (
	"encoding/json"
	"fmt"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

type Producer struct {
	p *kafka.Producer
}

func NewProducer(brokers string) (*Producer, error) {
	p, err := kafka.NewProducer(&kafka.ConfigMap{"bootstrap.servers": brokers})
	if err != nil {
		return nil, fmt.Errorf("new producer: %w", err)
	}
	return &Producer{p: p}, nil
}

func (p *Producer) Send(topic string, key string, value any) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}
	return p.p.Produce(&kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: kafka.PartitionAny},
		Key:            []byte(key),
		Value:          data,
	}, nil)
}

func (p *Producer) Close() {
	p.p.Flush(5000)
	p.p.Close()
}
