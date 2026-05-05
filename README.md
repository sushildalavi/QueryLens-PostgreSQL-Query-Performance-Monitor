# QueryLens — PostgreSQL Query Performance Monitor

A developer tool that collects PostgreSQL query performance metrics, fingerprints repeated queries, stores execution-plan history, detects query regressions, and surfaces slow queries and plan changes in a React dashboard.

> QueryLens uses deterministic regression rules over `pg_stat_statements` and `EXPLAIN JSON`. The AI layer only turns validated findings into readable reports.

![dashboard](docs/screenshots/dashboard.png)

---

## Problem statement

`pg_stat_statements` is Postgres's built-in query profiler. It gives you raw counters but no history, no regression detection, and no plain-English analysis. QueryLens closes that gap by:

- fingerprinting normalized queries so variants collapse to one row
- snapshotting metrics and execution plans on each collection run
- comparing snapshots to detect latency spikes, plan regressions, and row-estimate mismatches using **deterministic rules**
- rendering plain-English reports (template or optional LLM — never the source of truth)

---

## Architecture

One Postgres instance hosts three schemas. The Python backend reads `pg_stat_statements`, fingerprints, snapshots, and runs deterministic rules. The React UI talks to the FastAPI layer over `/api/*`.

```mermaid
flowchart LR
    subgraph host["Local machine · docker compose"]
      subgraph db["Postgres 16 (port 5434)"]
        pgss["pg_stat_statements<br/><i>extension</i>"]
        demo["demo schema<br/>users · orders · products<br/>order_items · events"]
        ql["querylens schema<br/>query_fingerprints · query_metrics<br/>query_plans · query_regressions<br/>query_reports"]
      end
      subgraph backend["FastAPI backend (port 8765)"]
        api["REST API<br/>/api/queries · /api/regressions<br/>/api/collect/run · /api/reports"]
        coll["Collector<br/><i>app.core.collector</i>"]
        rep["Report generator<br/><i>app.core.report_generator</i>"]
      end
      subgraph workload["Demo workload"]
        wl["app.demo.workload<br/>15 query templates"]
      end
      ui["React + Vite UI<br/>(port 3030)"]
    end
    llm[("Optional LLM<br/>OpenAI / Groq / Ollama")]:::ext

    wl -- "exec SQL" --> demo
    demo -. "stats" .-> pgss
    coll -- "SELECT ... FROM pg_stat_statements" --> pgss
    coll -- "EXPLAIN (FORMAT JSON)" --> demo
    coll -- "INSERT fingerprints / metrics<br/>plans / regressions" --> ql
    api -- "SELECT" --> ql
    rep -- "findings" --> llm
    rep -- "stored report" --> ql
    ui -- "fetch /api/*" --> api

    classDef ext fill:#0a0a0b,stroke:#3a3a42,stroke-dasharray:3 3,color:#a0a0a8;
```

**One Postgres instance, three schemas:**
- `public` — `pg_stat_statements` extension
- `demo` — workload tables (`users`, `orders`, `products`, `order_items`, `events`)
- `querylens` — metadata (`query_fingerprints`, `query_metrics`, `query_plans`, `query_regressions`, `query_reports`)

### Collector pipeline

What happens during a single `make collect` (or `POST /api/collect/run`):

```mermaid
flowchart TD
    s["Start: run_collection()"]
    q["SELECT * FROM pg_stat_statements<br/>WHERE noise filters AND mean_exec_time >= MIN_MEAN_MS<br/>ORDER BY mean_exec_time DESC"]
    loop{"For each row"}
    fp["fingerprint(sql)<br/>strip comments → normalize<br/>literals/$N → SHA-256"]
    upsert["Upsert query_fingerprints"]
    metric["Insert query_metrics<br/>(snapshot of counters)"]
    safe{"_is_safe_select?<br/>(SELECT/WITH, no DML)"}
    explain["_run_explain()<br/>PREPARE + EXPLAIN EXECUTE if $N<br/>else EXPLAIN directly"]
    plan["Insert query_plans<br/>(parsed top-node, seq/idx, cost, rows)"]
    diff["detect_regressions(<br/>prev_metric, new_metric,<br/>prev_plan, new_plan)"]
    persist["Insert query_regressions<br/>(severity, type, message)"]
    done["commit · return counters"]

    s --> q --> loop
    loop -- next row --> fp
    fp --> upsert --> metric --> safe
    safe -- yes --> explain --> plan --> diff
    safe -- no --> diff
    diff --> persist --> loop
    loop -- "no more rows" --> done

    style s fill:#f59e0b,color:#0a0a0b,stroke:#f59e0b
    style done fill:#34d399,color:#0a0a0b,stroke:#34d399
    style safe fill:#16161a,stroke:#3a3a42,color:#e7e7ea
    style loop fill:#16161a,stroke:#3a3a42,color:#e7e7ea
```

### Regression rules

`detect_regressions()` runs every rule against `(prev, new)` snapshots. Latency rules pick the highest matching severity (`severe_latency_spike` suppresses `latency_spike` and `call_spike`).

```mermaid
flowchart LR
    snap["(prev_metric, new_metric,<br/>prev_plan, new_plan)"]:::input

    snap --> r1{"new.mean / prev.mean<br/>≥ 3.0?"}
    r1 -- yes --> sev["severe_latency_spike<br/><b>HIGH</b>"]:::high
    r1 -- no --> r2{"new.mean / prev.mean<br/>≥ 1.5?"}
    r2 -- yes --> lat["latency_spike<br/><b>MEDIUM</b>"]:::med

    snap --> r3{"prev_plan.idx_scan AND<br/>new_plan.seq_scan AND<br/>NOT new_plan.idx_scan?"}
    r3 -- yes --> idx["index_scan_to_seq_scan<br/><b>HIGH</b>"]:::high

    snap --> r4{"actual_rows / estimated<br/>> 10?"}
    r4 -- yes --> row["row_estimate_mismatch<br/><b>MEDIUM</b>"]:::med

    snap --> r5{"Δ temp_blks_written<br/>> 1000?"}
    r5 -- yes --> tmp["temp_spill<br/><b>MEDIUM</b>"]:::med

    snap --> r6{"new.calls / prev.calls<br/>≥ 2.0 AND not severe?"}
    r6 -- yes --> call["call_spike<br/><b>LOW</b>"]:::low

    snap --> r7{"new.cost / prev.cost<br/>≥ 2.0?"}
    r7 -- yes --> cost["cost_spike<br/><b>MEDIUM</b>"]:::med

    classDef input fill:#16161a,stroke:#3a3a42,color:#e7e7ea;
    classDef high fill:#3b1f1f,stroke:#f87171,color:#f87171;
    classDef med fill:#3b2f1f,stroke:#fbbf24,color:#fbbf24;
    classDef low fill:#1f1f24,stroke:#6b6b75,color:#a0a0a8;
```

### Demo lifecycle

`make demo` is reproducible — it always lands the dashboard with the same regressions detected.

```mermaid
sequenceDiagram
    autonumber
    participant Make as make demo
    participant DB as Postgres
    participant W as Workload
    participant C as Collector
    Make->>DB: alembic upgrade head
    Make->>DB: seed_data (idempotent · ~400k rows)
    Make->>DB: pg_stat_statements_reset()
    Make->>DB: TRUNCATE querylens.* CASCADE
    Make->>DB: CREATE INDEX orders_user_id_idx (if missing)
    Make->>W: workload --iterations 400 --no-drop-index
    W->>DB: 400 queries (15 templates, weighted)
    Make->>C: run_collection()  ← baseline snapshot
    C->>DB: INSERT metrics + plans (15+ fingerprints)
    Note over Make: --- baseline collected ---
    Make->>W: workload --iterations 1500 (drop_index=True)
    W->>DB: 750 queries (index present)
    W->>DB: DROP INDEX demo.orders_user_id_idx
    W->>DB: 750 queries (no index → seq scan)
    Make->>C: run_collection()  ← post-drop snapshot
    C->>C: detect_regressions() per fingerprint
    C->>DB: INSERT query_regressions (high/medium/low)
    Note over Make: --- regression snapshot collected ---
    Make-->>Make: open http://localhost:3030
```

---

## Local setup

Requirements: **Docker** and **Docker Compose**.

```bash
git clone https://github.com/sushildalavi/QueryLens-PostgreSQL-Query-Performance-Monitor.git
cd QueryLens-PostgreSQL-Query-Performance-Monitor

# .env is already committed — edit it only if you want to override defaults

docker compose up -d       # starts db + backend + frontend
make demo                  # seeds data, runs workload, runs collector twice
```

Open **http://localhost:3030** — you should see regressions in the dashboard.

To run the collector on-demand:

```bash
make collect
# or
curl -X POST http://localhost:8765/api/collect/run | jq
```

---

## How `pg_stat_statements` works here

`pg_stat_statements` accumulates per-query counters (calls, total/mean execution time, rows, block I/O) across all connections. The collector reads this view on each run, fingerprints each query, stores a metric snapshot, and diffs it against the previous snapshot to detect regressions.

Postgres must be started with:
```
shared_preload_libraries = pg_stat_statements
pg_stat_statements.track = all
```

This is handled automatically by `docker-compose.yml`.

---

## Query fingerprinting

Queries that differ only in literal values are collapsed to the same fingerprint so they share one history.

```
-- two "different" queries:
SELECT * FROM orders WHERE user_id = 123
SELECT * FROM orders WHERE user_id = 456

-- same fingerprint:
select * from orders where user_id = ?
```

Process: strip comments → replace string/numeric literals and `$N` placeholders with `?` → collapse whitespace → lowercase → SHA-256 hash.

`pg_stat_statements` already normalises literals to `$1`, `$2`, ... — the fingerprinter handles both raw literals and placeholders so workload queries and `pg_stat_statements` rows hash identically.

---

## Regression rules

| Type | Trigger | Severity |
|------|---------|----------|
| `severe_latency_spike` | mean exec time ×3+ vs previous | high |
| `latency_spike` | mean exec time ×1.5+ vs previous | medium |
| `index_scan_to_seq_scan` | plan changed from Index Scan → Seq Scan | high |
| `row_estimate_mismatch` | actual / estimated rows > 10 | medium |
| `temp_spill` | temp block writes +1000 vs previous | medium |
| `call_spike` | call count ×2+ vs previous | low |
| `cost_spike` | estimated plan cost ×2+ vs previous | medium |

All rules are implemented in `backend/app/core/regression_detector.py` and are fully unit-tested.

---

## EXPLAIN JSON parsing

For each safe `SELECT` query, the collector runs `EXPLAIN (FORMAT JSON)` (or `EXPLAIN ANALYZE` when `ALLOW_EXPLAIN_ANALYZE=true`) and extracts:

- **Top node type** — root plan node (`Seq Scan`, `Nested Loop`, etc.)
- **`uses_seq_scan`** — any node in the tree is a `Seq Scan`
- **`uses_index_scan`** — any of `Index Scan`, `Index Only Scan`, `Bitmap Index Scan`
- **Estimated/actual rows** — root-level `Plan Rows` and `Actual Rows`
- **Estimated total cost** — root `Total Cost`

For queries from `pg_stat_statements` that use `$N` placeholders, the collector uses `PREPARE` / `EXPLAIN EXECUTE` with `1` as the default parameter so the planner uses real table statistics.

---

## Demo workload

The demo creates ~400k rows across five tables and runs a mix of six named queries:

| Query | What it does |
|-------|-------------|
| `good_user_orders` | Uses `orders.user_id` index — fast |
| `missing_index` | Filters on `shipping_zip` — no index |
| `unindexed_order_by` | `ORDER BY total_cents DESC` — no covering index |
| `like_prefix_wildcard` | `LIKE '%@gmail.com'` — can't use index |
| `sequential_scan` | `count(*) WHERE event_type = ?` — no index |
| `large_join` | users → orders → order_items aggregation |

Halfway through the workload run, the `orders.user_id` index is **dropped**. The next collector run detects an `index_scan_to_seq_scan` regression on `good_user_orders`.

```bash
make demo        # full pipeline: seed → workload → collect × 2
make seed        # just seed data
make workload    # just workload (N=500 default)
make collect     # just run the collector
```

---

## API reference

Full Swagger UI at **http://localhost:8765/docs**

```bash
# health
curl localhost:8765/health

# list slow queries
curl "localhost:8765/api/queries?sort=mean_latency_desc&limit=10" | jq

# list regressions
curl "localhost:8765/api/regressions?severity=high" | jq

# trigger collection
curl -X POST localhost:8765/api/collect/run | jq

# generate report for a query
curl -X POST "localhost:8765/api/reports/<fingerprint_id>/generate" | jq
```

---

## AI report layer

The report generator (`backend/app/core/report_generator.py`) builds a deterministic **findings dict** from ORM objects, then renders it as plain English.

- **Default (no key required):** A deterministic template constructs a 2–4 sentence summary from the findings.
- **Optional LLM:** Set `LLM_ENABLED=true` and provide `OPENAI_API_KEY`. Works with OpenAI, Groq free tier, or a local Ollama instance via `OPENAI_BASE_URL`.

The LLM prompt instructs:
- use only provided facts, never invent numbers or table names
- phrase suggestions as "Candidate optimization: review whether …"
- never claim a fix is guaranteed

---

## Tests

```bash
make test            # all 40 tests (requires Docker for integration)
make test-unit       # 30 pure unit tests (no Docker)
```

Tests cover:
- `test_fingerprint.py` — 11 cases: literals, placeholders, whitespace, stability
- `test_explain_parser.py` — 6 cases: seq scan, index scan, nested loop, no-ANALYZE
- `test_regression_detector.py` — 13 cases: every regression type + edge cases
- `test_collector.py` — 3 integration cases: metrics stored, upsert, index drop → regression
- `test_api_smoke.py` — 7 smoke tests: all routes return correct shape

---

## Screenshots

> **Dashboard** — bento layout with KPI cards, latency landscape, severity breakdown with top regression types, activity feed timeline, and a sortable & filterable slowest-query table.
![dashboard](docs/screenshots/dashboard.png)

> **Command palette** — `⌘K` (or `/`) opens a fuzzy search across queries, regressions, and actions. Arrow keys to navigate, Enter to drill in.
![command palette](docs/screenshots/command-palette.png)

> **Query detail** — SQL with syntax highlighting and line numbers, mean-exec & call-count time series with an animated peak marker, parsed execution plan tree, and full regression history for the fingerprint.
![query-detail](docs/screenshots/query-detail.png)

> **Regressions feed** — every detection by severity and type, with one click to drill into the offending fingerprint.
![regressions](docs/screenshots/regressions.png)

Screenshots are captured headlessly with Playwright (`docs/screenshots/capture.mjs`) against a running stack — they reflect real demo data, not mocks. Run `make screenshots` to regenerate.

---

## Limitations

- Single-tenant, no authentication
- Collector is on-demand (`POST /api/collect/run`). For production, trigger via Cloud Scheduler or a cron job
- `EXPLAIN ANALYZE` is disabled by default (`ALLOW_EXPLAIN_ANALYZE=false`) — enable only against the demo DB
- `pg_stat_statements` parameterized queries use `PREPARE`/`EXPLAIN EXECUTE(1)` — plan may not reflect all query shapes
- Only the latest plan is shown in the UI; plan-diff is roadmap

## Roadmap

- Continuous collector daemon with scheduling UI
- Side-by-side plan diff
- Per-database / multi-DSN support
- Query tagging and ignore-list
- Slack/webhook alerts on high-severity regressions
