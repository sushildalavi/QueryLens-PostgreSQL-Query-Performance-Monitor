.PHONY: up down demo seed workload collect test build lint

# --- docker compose ---
up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f backend

# --- full demo pipeline ---
demo: up
	@echo "waiting for db..."
	@sleep 3
	docker compose exec backend alembic upgrade head
	docker compose exec backend python -m app.demo.seed_data
	docker compose exec backend python -m app.demo.workload --iterations 200 --no-drop-index
	docker compose exec backend python -m app.core.collector
	@echo "--- baseline collected ---"
	docker compose exec backend python -m app.demo.workload --iterations 800
	docker compose exec backend python -m app.core.collector
	@echo "--- regression snapshot collected ---"
	@echo "open http://localhost:5173"

seed:
	docker compose exec backend python -m app.demo.seed_data

workload:
	docker compose exec backend python -m app.demo.workload --iterations $(or $(N),500)

collect:
	docker compose exec backend python -m app.core.collector

# --- tests ---
test:
	cd backend && .venv/bin/pytest tests/ -v

test-unit:
	cd backend && .venv/bin/pytest tests/test_fingerprint.py tests/test_explain_parser.py tests/test_regression_detector.py -v

# --- frontend ---
build:
	cd frontend && npm run build

# --- lint ---
lint:
	cd backend && .venv/bin/ruff check app/ tests/

install:
	cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
	cd frontend && npm install
