# Deployment Guide

## Prerequisites

- Docker 24+ and Docker Compose v2
- Node.js 20, Go 1.21, Rust 1.75, Python 3.11
- kubectl + kustomize (production)
- Terraform 1.6+ (production)
- AWS CLI (production)

## Local Development

```bash
git clone https://github.com/nexus-broadcast/nexus-v4-deployment
cd nexus-v4-deployment
make setup
make dev
```

Services start at:
- Web UI: http://localhost:3000
- API: http://localhost:8080
- Grafana: http://localhost:3001 (nexus/nexus)
- MinIO: http://localhost:9001 (minioadmin/minioadmin)

## Running Tests

```bash
make test           # all tests
make test-api       # TypeScript/Node.js
make test-switcher  # Go
make test-router    # Rust
make test-nmos      # Python
```

## Production Deployment

### 1. Configure AWS credentials
```bash
aws configure
```

### 2. Bootstrap Terraform state
```bash
aws s3 mb s3://nexus-terraform-state
aws dynamodb create-table \
  --table-name nexus-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### 3. Deploy infrastructure
```bash
cd infrastructure/terraform/environments/production
terraform init
terraform apply
```

### 4. Deploy application
```bash
./scripts/deploy.sh production v4.0.0
```

### 5. Verify
```bash
./scripts/health-check.sh https://api.nexus.control.studio
```

## Deployment Phases

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Infrastructure provisioning | 2 days |
| 2 | Core services deployment | 3 days |
| 3 | Hardware integration (SDI bridges) | 5 days |
| 4 | PTP synchronization | 2 days |
| 5 | NMOS registration | 1 day |
| 6 | Control plane testing | 3 days |
| 7 | Load testing | 2 days |
| 8 | Security audit | 2 days |
| 9 | DR failover test | 1 day |
| 10 | Production cutover | 1 day |

**Total: ~22 days to production**

## Rollback

```bash
# Kubernetes rollback
kubectl rollout undo deployment/nexus-api -n nexus-broadcast

# Terraform rollback
cd infrastructure/terraform/environments/production
terraform apply -var="version=<previous-version>"
```
