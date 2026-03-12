.PHONY: dev build test lint clean migrate docker-up docker-down tidy docker-build-go helm-lint helm-template helm-install-local helm-uninstall agent-build agent-check

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

# Docker image builds
docker-build-go:
	docker build -f Dockerfile.api-server -t infrawhisper/api-server:local .
	docker build -f Dockerfile.collector -t infrawhisper/collector:local .
	docker build -f Dockerfile.stream-processor -t infrawhisper/stream-processor:local .

# Helm
helm-lint:
	helm lint deploy/helm/infrawhisper/

helm-template:
	helm template infrawhisper deploy/helm/infrawhisper/ --debug

helm-install-local:
	bash deploy/k8s/orbstack-init.sh

helm-uninstall:
	helm uninstall infrawhisper --namespace infrawhisper

# Rust agent
agent-build:
	cd agent && cargo build

agent-check:
	cd agent && cargo check
