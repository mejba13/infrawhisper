.PHONY: dev build test lint clean migrate docker-up docker-down tidy

GO := go
GOFLAGS := -ldflags="-s -w"
BINS := api-server collector stream-processor

dev:
	air -c .air.toml

build:
	@mkdir -p bin
	@for bin in $(BINS); do \
		echo "Building $$bin..."; \
		$(GO) build $(GOFLAGS) -o bin/$$bin ./cmd/$$bin; \
	done

test:
	$(GO) test ./... -race -cover -count=1

lint:
	golangci-lint run ./...

docker-up:
	docker compose up -d
	@echo "Waiting for services to be healthy..."
	@sleep 8

docker-down:
	docker compose down

migrate:
	bash scripts/migrate.sh

clean:
	rm -rf bin/ tmp/

tidy:
	$(GO) mod tidy
	$(GO) mod verify
