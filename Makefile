.PHONY: help up down logs db-shell redis-shell api web install migrate migrate-down migrate-create seed lint test

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Infrastructure ──────────────────────────────────────────────────
up: ## Start all Docker services
	docker compose up -d
	@echo "Services running:"
	@echo "  Postgres    → localhost:5432"
	@echo "  Redis       → localhost:6379"
	@echo "  MinIO       → localhost:9000 (API) / localhost:9001 (Console)"
	@echo "  Meilisearch → localhost:7700"
	@echo "  Mailhog     → localhost:1025 (SMTP) / localhost:8025 (UI)"

down: ## Stop all Docker services
	docker compose down

down-v: ## Stop and remove volumes
	docker compose down -v

logs: ## Tail all service logs
	docker compose logs -f

logs-%: ## Tail a specific service log (make logs-postgres)
	docker compose logs -f $*

db-shell: ## Open psql shell
	docker compose exec postgres psql -U learnly -d learnly

redis-shell: ## Open redis-cli
	docker compose exec redis redis-cli

minio-init: ## Create MinIO buckets
	docker compose exec minio mc alias set local http://localhost:9000 learnly learnly_dev_secret
	docker compose exec minio mc mb --ignore-existing local/learnly-media
	docker compose exec minio mc anonymous set download local/learnly-media/images

# ── Backend (FastAPI) ────────────────────────────────────────────────
api: ## Run FastAPI dev server
	cd apps/api && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

api-install: ## Install Python dependencies
	cd apps/api && pip install -e ".[dev]"

api-test: ## Run backend tests
	cd apps/api && pytest -v --asyncio-mode=auto

api-lint: ## Run ruff linter + formatter check
	cd apps/api && ruff check . && ruff format --check .

api-fmt: ## Auto-format backend code
	cd apps/api && ruff format .

# ── Database / Alembic ───────────────────────────────────────────────
migrate: ## Run pending migrations
	cd apps/api && alembic upgrade head

migrate-down: ## Rollback last migration
	cd apps/api && alembic downgrade -1

migrate-create: ## Create new migration (usage: make migrate-create name=add_users_table)
	cd apps/api && alembic revision --autogenerate -m "$(name)"

migrate-history: ## Show migration history
	cd apps/api && alembic history --verbose

# ── Frontend (Next.js) ──────────────────────────────────────────────
web: ## Run Next.js dev server
	cd apps/web && pnpm dev

web-install: ## Install frontend dependencies
	cd apps/web && pnpm install

web-build: ## Build Next.js for production
	cd apps/web && pnpm build

web-lint: ## Run ESLint
	cd apps/web && pnpm lint

web-type-check: ## Run TypeScript type check
	cd apps/web && pnpm type-check

web-test: ## Run frontend tests
	cd apps/web && pnpm test

# ── Full Stack ───────────────────────────────────────────────────────
install: api-install web-install ## Install all dependencies

dev: up ## Start infra + run both servers (use two terminals for api and web)
	@echo "Run 'make api' in one terminal and 'make web' in another"

lint: api-lint web-lint ## Lint all code

test: api-test web-test ## Run all tests

# ── Search ───────────────────────────────────────────────────────────
search-reindex: ## Reindex all courses in Meilisearch
	cd apps/api && python -m app.integrations.meilisearch reindex

# ── Misc ─────────────────────────────────────────────────────────────
health: ## Check all services are healthy
	@curl -sf http://localhost:8000/health && echo "API: OK" || echo "API: DOWN"
	@curl -sf http://localhost:7700/health && echo "Meilisearch: OK" || echo "Meilisearch: DOWN"
	@curl -sf http://localhost:9000/minio/health/live && echo "MinIO: OK" || echo "MinIO: DOWN"
