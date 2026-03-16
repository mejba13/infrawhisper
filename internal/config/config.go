package config

import (
	"fmt"
	"strings"

	"github.com/go-viper/mapstructure/v2"
	"github.com/spf13/viper"
)

type Config struct {
	Port       string     `mapstructure:"PORT"`
	Env        string     `mapstructure:"ENV"`
	Postgres   Postgres   `mapstructure:",squash"`
	ClickHouse ClickHouse `mapstructure:",squash"`
	Redis      Redis      `mapstructure:",squash"`
	Kafka      Kafka      `mapstructure:",squash"`
	Auth       Auth       `mapstructure:",squash"`
	AIEngine   AIEngine   `mapstructure:",squash"`
}

type Postgres struct {
	DSN string `mapstructure:"POSTGRES_DSN"`
}

type ClickHouse struct {
	DSN string `mapstructure:"CLICKHOUSE_DSN"`
}

type Redis struct {
	Addr     string `mapstructure:"REDIS_ADDR"`
	Password string `mapstructure:"REDIS_PASSWORD"`
}

type Kafka struct {
	Brokers []string `mapstructure:"KAFKA_BROKERS"`
	GroupID string   `mapstructure:"KAFKA_GROUP_ID"`
}

type Auth struct {
	JWTSecret string `mapstructure:"JWT_SECRET"`
	JWTIssuer string `mapstructure:"JWT_ISSUER"`
}

type AIEngine struct {
	URL string `mapstructure:"AI_ENGINE_URL"`
}

func Load() (*Config, error) {
	v := viper.New()
	v.SetConfigFile(".env")
	v.SetConfigType("env")
	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	v.SetDefault("PORT", "8080")
	v.SetDefault("ENV", "development")
	v.SetDefault("POSTGRES_DSN", "postgres://infrawhisper:infrawhisper@localhost:5432/infrawhisper?sslmode=disable")
	v.SetDefault("CLICKHOUSE_DSN", "clickhouse://infrawhisper:infrawhisper@localhost:9000/infrawhisper")
	v.SetDefault("REDIS_ADDR", "localhost:6379")
	v.SetDefault("KAFKA_BROKERS", []string{"localhost:9092"})
	v.SetDefault("KAFKA_GROUP_ID", "infrawhisper")
	v.SetDefault("AI_ENGINE_URL", "http://localhost:8001")

	_ = v.ReadInConfig()

	var cfg Config
	if err := v.Unmarshal(&cfg, func(dc *mapstructure.DecoderConfig) {
		dc.DecodeHook = mapstructure.ComposeDecodeHookFunc(
			mapstructure.StringToSliceHookFunc(","),
			dc.DecodeHook,
		)
	}); err != nil {
		return nil, fmt.Errorf("config unmarshal: %w", err)
	}
	return &cfg, nil
}
