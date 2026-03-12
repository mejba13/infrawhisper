#!/usr/bin/env bash
# orbstack-init.sh — Bootstrap InfraWhisper on OrbStack local Kubernetes
# Prerequisites: orb, kubectl, helm, docker (all available via OrbStack)
set -euo pipefail

NAMESPACE="infrawhisper"
RELEASE="infrawhisper"
CHART="./deploy/helm/infrawhisper"

# Must be run from the monorepo root
cd "$(dirname "$0")/../.."

echo "==> Switching to OrbStack k8s context"
kubectl config use-context orbstack

echo "==> Creating namespace (idempotent)"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo "==> Installing nginx ingress controller (if not present)"
if ! kubectl get ns ingress-nginx &>/dev/null; then
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml
  echo "Waiting for ingress-nginx to be ready..."
  kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=120s
fi

echo "==> Building local images"
docker build -f Dockerfile.api-server     -t ghcr.io/infrawhisper/api-server:local .
docker build -f Dockerfile.collector      -t ghcr.io/infrawhisper/collector:local .
docker build -f Dockerfile.stream-processor -t ghcr.io/infrawhisper/stream-processor:local .
docker build -f ai-engine/Dockerfile     -t ghcr.io/infrawhisper/ai-engine:local ./ai-engine
docker build -f dashboard/Dockerfile     -t ghcr.io/infrawhisper/dashboard:local ./dashboard

echo "==> Deploying infrastructure services (postgres, clickhouse, redis, kafka) via docker-compose"
echo "    NOTE: For local K8s dev, infrastructure services run in docker-compose on the host."
echo "    OrbStack routes host.docker.internal -> host machine services."
echo "    Ensure 'docker compose up -d' has been run before proceeding."

echo "==> Installing/Upgrading Helm release"
helm upgrade --install "$RELEASE" "$CHART" \
  --namespace "$NAMESPACE" \
  --set global.image.pullPolicy=Never \
  --set apiServer.image.tag=local \
  --set collector.image.tag=local \
  --set streamProcessor.image.tag=local \
  --set aiEngine.image.tag=local \
  --set dashboard.image.tag=local \
  --set config.postgresHost=host.docker.internal \
  --set config.clickhouseHost=host.docker.internal \
  --set config.redisAddr="host.docker.internal:6379" \
  --set config.kafkaBrokers="host.docker.internal:9092" \
  --set secrets.postgresPassword=infrawhisper \
  --set secrets.jwtSecret=dev-jwt-secret-change-in-prod \
  --set ingress.host=infrawhisper.local \
  --wait

echo ""
echo "==> InfraWhisper deployed to OrbStack K8s!"
echo "    Add to /etc/hosts:  127.0.0.1  infrawhisper.local"
echo "    Dashboard:  http://infrawhisper.local"
echo "    API:        http://infrawhisper.local/api/v1/health"
echo ""
kubectl get pods -n "$NAMESPACE"
