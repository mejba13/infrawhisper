//go:build tools
// +build tools

package main

import (
	_ "github.com/go-chi/chi/v5"
	_ "github.com/rs/zerolog"
	_ "github.com/jackc/pgx/v5"
	_ "github.com/ClickHouse/clickhouse-go/v2"
	_ "github.com/redis/go-redis/v9"
	_ "github.com/gorilla/websocket"
	_ "github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/golang-jwt/jwt/v5"
	_ "github.com/confluentinc/confluent-kafka-go/v2/kafka"
	_ "k8s.io/client-go"
	_ "k8s.io/apimachinery"
	_ "google.golang.org/grpc"
)
