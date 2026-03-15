.PHONY: help setup dev test build deploy lint clean
.DEFAULT_GOAL := help

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Initial project setup
	@chmod +x scripts/*.sh
	@cp .env.example .env 2>/dev/null || true
	@echo "Edit .env with your configuration, then run: make dev"

dev: ## Start development stack
	docker-compose up -d
	@echo "API:     http://localhost:8080"
	@echo "Web UI:  http://localhost:3000"
	@echo "Grafana: http://localhost:3001"

dev-logs: ## Follow logs
	docker-compose logs -f

test: ## Run all tests
	docker-compose -f docker-compose.yml -f docker-compose.test.yml up --abort-on-container-exit

test-api: ## API unit tests
	cd backend/api && npm test

test-switcher: ## Switcher unit tests
	cd backend/services/switcher && go test -v -race ./...

test-router: ## Router unit tests
	cd backend/services/router && cargo test

test-nmos: ## NMOS unit tests
	cd backend/services/nmos && python -m pytest

test-integration: ## Integration tests
	./scripts/integration-tests.sh

test-load: ## Load tests (5 min)
	./scripts/load-test.sh 5m 1000

build: ## Build all images
	docker-compose build

lint: ## Lint all code
	cd backend/api && npm run lint
	cd backend/services/switcher && golangci-lint run
	cd backend/services/router && cargo clippy -- -D warnings
	cd backend/services/nmos && flake8 src/
	terraform fmt -check -recursive infrastructure/terraform

lint-fix: ## Auto-fix linting
	cd backend/api && npm run lint:fix
	cd backend/services/switcher && gofmt -w .
	cd backend/services/router && cargo fmt
	terraform fmt -recursive infrastructure/terraform

deploy-staging: ## Deploy to staging
	./scripts/deploy.sh staging $(VERSION)

deploy-production: ## Deploy to production
	./scripts/deploy.sh production $(VERSION)

health: ## Run health checks
	./scripts/health-check.sh

shell-api: ## Shell into API container
	docker-compose exec api sh

shell-db: ## PostgreSQL shell
	docker-compose exec postgres psql -U nexus -d nexus

clean: ## Remove containers and volumes
	docker-compose down -v
	docker system prune -f

security-scan: ## Run security scans
	trivy fs --scanners vuln,secret,misconfig .

VERSION ?= latest
