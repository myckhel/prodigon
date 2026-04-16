.PHONY: setup run run-docker test lint clean help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Install dependencies and set up the project
	python -m pip install -e ".[dev]"
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env from .env.example — edit it with your GROQ_API_KEY"; fi

run: ## Run all services locally (no Docker)
	bash scripts/run_all.sh

run-gateway: ## Run API gateway only
	cd baseline && python -m uvicorn api_gateway.app.main:app --host 0.0.0.0 --port 8000 --reload

run-model: ## Run model service only
	cd baseline && python -m uvicorn model_service.app.main:app --host 0.0.0.0 --port 8001 --reload

run-worker: ## Run worker service only
	cd baseline && python -m uvicorn worker_service.app.main:app --host 0.0.0.0 --port 8002 --reload

run-docker: ## Run all services with Docker Compose
	cd baseline && docker-compose up --build

test: ## Run all tests
	cd baseline && python -m pytest tests/ -v

lint: ## Run linter
	ruff check baseline/ workshop/

health: ## Check health of all services
	bash scripts/check_health.sh

install-frontend: ## Install frontend dependencies
	cd frontend && npm install

run-frontend: ## Run frontend dev server
	cd frontend && npm run dev

build-frontend: ## Build frontend for production
	cd frontend && npm run build

clean: ## Remove caches and build artifacts
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name *.egg-info -exec rm -rf {} + 2>/dev/null || true
