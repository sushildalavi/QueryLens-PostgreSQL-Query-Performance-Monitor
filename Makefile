.PHONY: up down demo demo-reset seed workload collect test build lint logs install

# --- docker compose ---
up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f backend

# --- full demo pipeline (idempotent) ---
demo: up
	@echo "waiting for db..."
	@sleep 3
	docker compose exec backend alembic upgrade head
	docker compose exec backend python -m app.demo.seed_data
	@echo "--- resetting demo state for reproducible run ---"
	docker compose exec -T db psql -U querylens -d querylens -c "SELECT pg_stat_statements_reset();" >/dev/null
	docker compose exec -T db psql -U querylens -d querylens -c "TRUNCATE querylens.query_regressions, querylens.query_reports, querylens.query_plans, querylens.query_metrics, querylens.query_fingerprints CASCADE;" >/dev/null
	docker compose exec -T db psql -U querylens -d querylens -c "CREATE INDEX IF NOT EXISTS orders_user_id_idx ON demo.orders(user_id);" >/dev/null
	docker compose exec backend python -m app.demo.workload --iterations 400 --no-drop-index
	docker compose exec backend python -m app.core.collector
	@echo "--- baseline collected ---"
	docker compose exec backend python -m app.demo.workload --iterations 1500
	docker compose exec backend python -m app.core.collector
	@echo "--- regression snapshot collected ---"
	@echo "open http://localhost:3030"

# explicit reset (without re-running workload)
demo-reset:
	docker compose exec -T db psql -U querylens -d querylens -c "SELECT pg_stat_statements_reset();" >/dev/null
	docker compose exec -T db psql -U querylens -d querylens -c "TRUNCATE querylens.query_regressions, querylens.query_reports, querylens.query_plans, querylens.query_metrics, querylens.query_fingerprints CASCADE;"
	docker compose exec -T db psql -U querylens -d querylens -c "CREATE INDEX IF NOT EXISTS orders_user_id_idx ON demo.orders(user_id);"
	@echo "reset done"

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
