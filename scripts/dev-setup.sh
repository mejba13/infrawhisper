#!/usr/bin/env bash
set -euo pipefail

echo "==> Setting up InfraWhisper development environment"

command -v go >/dev/null 2>&1 || { echo "ERROR: Go 1.22+ required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker required"; exit 1; }

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created .env from .env.example"
fi

echo "==> Installing Go tools..."
go install github.com/air-verse/air@latest
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

echo "==> Starting Docker services..."
docker compose up -d

echo "==> Waiting for services to be healthy (30s)..."
sleep 30

echo ""
echo "✓ Setup complete."
echo "  Run 'make dev'   to start the API server with hot reload"
echo "  Run 'make build' to build all binaries"
echo "  Run 'make test'  to run tests"
