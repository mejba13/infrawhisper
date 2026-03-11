#!/usr/bin/env bash
set -euo pipefail

source .env 2>/dev/null || true

echo "==> Migrations run automatically on service startup."
echo "==> To run manually, start the API server once:"
echo "    go run ./cmd/api-server/"
