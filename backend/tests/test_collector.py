"""Integration tests for the collector.

These use a real Postgres 16 container via testcontainers.
"""

from __future__ import annotations

import pytest
from sqlalchemy import text

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def warmed_engine(test_engine):
    """Run queries slow enough to appear in pg_stat_statements."""
    with test_engine.connect() as conn:
        with conn.begin():
            conn.execute(text("SELECT pg_stat_statements_reset()"))
        for i in range(30):
            with conn.begin():
                # pg_sleep accumulates exec time in pg_stat_statements
                conn.execute(text(f"SELECT pg_sleep(0), {i} AS n"))
    return test_engine


@pytest.mark.skipif(
    not __import__("docker", fromlist=[]).from_env().ping(),  # type: ignore[arg-type]
    reason="Docker not reachable",
) if False else lambda f: f  # skip guard is in conftest
def _noop(f):
    return f


# ---------------------------------------------------------------------------
# actual tests
# ---------------------------------------------------------------------------


def test_collector_stores_query_metric(warmed_engine, db_session):
    """Collector reads pg_stat_statements and stores metrics."""
    import app.config as cfg

    orig = cfg.settings.MIN_MEAN_MS
    cfg.settings.MIN_MEAN_MS = 0.0  # pick up all queries, even fast ones
    try:
        from app.core.collector import run_collection

        result = run_collection(db_session, run_explain=False)
    finally:
        cfg.settings.MIN_MEAN_MS = orig

    assert result["fingerprints"] >= 1, f"expected ≥1 fingerprint, got {result}"
    assert result["metrics"] >= 1

    from app.models import QueryMetric

    assert db_session.query(QueryMetric).count() >= 1


def test_collector_upserts_fingerprint_on_repeat(warmed_engine, db_session):
    """Running collection twice should not duplicate fingerprints."""
    import app.config as cfg

    orig = cfg.settings.MIN_MEAN_MS
    cfg.settings.MIN_MEAN_MS = 0.0
    try:
        from app.core.collector import run_collection

        run_collection(db_session, run_explain=False)
        from app.models import QueryFingerprint

        count_first = db_session.query(QueryFingerprint).count()

        # reset stats and run again — same queries so fingerprints stay same
        with warmed_engine.connect() as conn:
            with conn.begin():
                conn.execute(text("SELECT pg_stat_statements_reset()"))
            for i in range(5):
                with conn.begin():
                    conn.execute(text(f"SELECT pg_sleep(0), {i} AS n"))

        run_collection(db_session, run_explain=False)
        count_second = db_session.query(QueryFingerprint).count()
    finally:
        cfg.settings.MIN_MEAN_MS = orig

    assert count_second == count_first, (
        f"fingerprint count grew: {count_first} → {count_second}"
    )


def test_collector_regression_detected_after_index_drop(test_engine, db_session):
    """Full lifecycle: index present → collection → drop index → re-collect → regression."""
    import app.config as cfg

    # --- setup ---
    with test_engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS reg_test_orders CASCADE"))
        conn.execute(
            text("""
            CREATE TABLE reg_test_orders (
                id      BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL
            )
        """)
        )
        conn.execute(text("CREATE INDEX reg_test_user_idx ON reg_test_orders(user_id)"))
        conn.execute(text("INSERT INTO reg_test_orders (user_id) SELECT generate_series(1,10000)"))
        conn.execute(text("ANALYZE reg_test_orders"))

        conn.execute(text("SELECT pg_stat_statements_reset()"))
        for uid in range(1, 50):
            conn.execute(text(f"SELECT * FROM reg_test_orders WHERE user_id = {uid}"))

    orig = cfg.settings.MIN_MEAN_MS
    cfg.settings.MIN_MEAN_MS = 0.0
    try:
        from app.core.collector import run_collection

        # baseline — plan should use Index Scan
        run_collection(db_session, run_explain=True)

        # drop index, re-warm
        with test_engine.begin() as conn:
            conn.execute(text("DROP INDEX IF EXISTS reg_test_user_idx"))
            conn.execute(text("ANALYZE reg_test_orders"))
            conn.execute(text("SELECT pg_stat_statements_reset()"))
            for uid in range(1, 50):
                conn.execute(text(f"SELECT * FROM reg_test_orders WHERE user_id = {uid}"))

        result = run_collection(db_session, run_explain=True)
    finally:
        cfg.settings.MIN_MEAN_MS = orig

    from app.models import QueryRegression

    reg = (
        db_session.query(QueryRegression)
        .filter_by(regression_type="index_scan_to_seq_scan")
        .first()
    )
    assert reg is not None, (
        f"expected index_scan_to_seq_scan. result={result}, "
        f"all_regressions={[r.regression_type for r in db_session.query(QueryRegression).all()]}"
    )
    assert reg.severity == "high"

    # cleanup
    with test_engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS reg_test_orders CASCADE"))
