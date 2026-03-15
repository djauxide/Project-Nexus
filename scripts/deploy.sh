#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT=${1:?Usage: deploy.sh <environment> [version]}
VERSION=${2:-latest}
SKIP_TESTS=${SKIP_TESTS:-false}

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

[[ -d "infrastructure/terraform/environments/${ENVIRONMENT}" ]] || err "Unknown environment: ${ENVIRONMENT}"

log "Deploying NEXUS v4 ${VERSION} to ${ENVIRONMENT}"

# Pre-deploy checks
if [[ "$SKIP_TESTS" != "true" ]]; then
  log "Running pre-deployment checks..."
  ./scripts/health-check.sh || warn "Pre-deploy health check had failures"
fi

# Terraform
log "Applying infrastructure..."
cd "infrastructure/terraform/environments/${ENVIRONMENT}"
terraform init -upgrade -input=false
terraform plan -out=tfplan -var="version=${VERSION}" -input=false
terraform apply -auto-approve tfplan
cd -

# Kubernetes
log "Deploying to Kubernetes..."
cd "infrastructure/kubernetes/overlays/${ENVIRONMENT}"
kustomize edit set image \
  nexus-api=ghcr.io/nexus-broadcast/nexus-v4/api:${VERSION} \
  nexus-switcher=ghcr.io/nexus-broadcast/nexus-v4/switcher:${VERSION} \
  nexus-router=ghcr.io/nexus-broadcast/nexus-v4/router:${VERSION}
kustomize build . | kubectl apply --server-side -f -
cd -

# Wait for rollout
log "Waiting for rollout..."
kubectl rollout status deployment/nexus-api -n nexus-broadcast --timeout=300s
kubectl rollout status daemonset/nexus-router -n nexus-broadcast --timeout=300s

# Verify
log "Verifying deployment..."
sleep 10
./scripts/health-check.sh

log "Deployment to ${ENVIRONMENT} complete."
