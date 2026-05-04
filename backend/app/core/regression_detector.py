"""Pure regression rules over (prev_metric, new_metric, prev_plan, new_plan).

The collector calls this and persists whatever comes back. No DB access here.
Each rule produces a dict with severity / type / message / serialized snapshots.
Severity precedence: when both ``latency_spike`` and ``severe_latency_spike``
would fire, only the severe one is emitted (highest severity wins).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

LATENCY_RATIO_MEDIUM = 1.5
LATENCY_RATIO_HIGH = 3.0
ROW_ESTIMATE_RATIO = 10.0
TEMP_BLKS_DELTA = 1000
CALL_RATIO = 2.0
COST_RATIO = 2.0


@dataclass
class MetricSnapshot:
    calls: int
    mean_ms: float
    total_ms: float
    rows: int
    temp_blks_written: int


@dataclass
class PlanSnapshot:
    uses_seq_scan: bool
    uses_index_scan: bool
    estimated_total_cost: float | None
    actual_rows: int | None
    estimated_rows: int | None
    top_node_type: str | None


def _metric_to_dict(m: MetricSnapshot | None) -> dict[str, Any] | None:
    if m is None:
        return None
    return {
        "calls": m.calls,
        "mean_ms": m.mean_ms,
        "total_ms": m.total_ms,
        "rows": m.rows,
        "temp_blks_written": m.temp_blks_written,
    }


def detect_regressions(
    prev_metric: MetricSnapshot | None,
    new_metric: MetricSnapshot | None,
    prev_plan: PlanSnapshot | None,
    new_plan: PlanSnapshot | None,
) -> list[dict[str, Any]]:
    if new_metric is None:
        return []

    out: list[dict[str, Any]] = []
    old_json = _metric_to_dict(prev_metric)
    new_json = _metric_to_dict(new_metric)

    severe_latency = False
    if prev_metric and prev_metric.mean_ms > 0:
        ratio = new_metric.mean_ms / prev_metric.mean_ms
        if ratio > LATENCY_RATIO_HIGH:
            severe_latency = True
            out.append(
                {
                    "severity": "high",
                    "regression_type": "severe_latency_spike",
                    "message": (
                        f"mean execution time increased severely from "
                        f"{prev_metric.mean_ms:.1f}ms to {new_metric.mean_ms:.1f}ms "
                        f"({ratio:.1f}x)"
                    ),
                    "old_metric_json": old_json,
                    "new_metric_json": new_json,
                }
            )
        elif ratio > LATENCY_RATIO_MEDIUM:
            out.append(
                {
                    "severity": "medium",
                    "regression_type": "latency_spike",
                    "message": (
                        f"mean execution time increased from "
                        f"{prev_metric.mean_ms:.1f}ms to {new_metric.mean_ms:.1f}ms "
                        f"({ratio:.1f}x)"
                    ),
                    "old_metric_json": old_json,
                    "new_metric_json": new_json,
                }
            )

    if (
        prev_plan is not None
        and new_plan is not None
        and prev_plan.uses_index_scan
        and new_plan.uses_seq_scan
        and not new_plan.uses_index_scan
    ):
        msg = "query plan changed from index scan to sequential scan"
        if prev_metric and new_metric and prev_metric.mean_ms > 0:
            msg += f"; mean latency went from {prev_metric.mean_ms:.1f}ms to {new_metric.mean_ms:.1f}ms"
        out.append(
            {
                "severity": "high",
                "regression_type": "index_scan_to_seq_scan",
                "message": msg,
                "old_metric_json": old_json,
                "new_metric_json": new_json,
            }
        )

    if (
        new_plan is not None
        and new_plan.actual_rows is not None
        and new_plan.estimated_rows is not None
    ):
        ratio = new_plan.actual_rows / max(new_plan.estimated_rows, 1)
        if ratio > ROW_ESTIMATE_RATIO:
            out.append(
                {
                    "severity": "medium",
                    "regression_type": "row_estimate_mismatch",
                    "message": (
                        f"row estimate off by {ratio:.1f}x: "
                        f"actual {new_plan.actual_rows} vs estimated {new_plan.estimated_rows}"
                    ),
                    "old_metric_json": old_json,
                    "new_metric_json": new_json,
                }
            )

    if prev_metric is not None:
        delta = new_metric.temp_blks_written - prev_metric.temp_blks_written
        if delta > TEMP_BLKS_DELTA:
            out.append(
                {
                    "severity": "medium",
                    "regression_type": "temp_spill",
                    "message": f"temp block writes increased by {delta} blocks",
                    "old_metric_json": old_json,
                    "new_metric_json": new_json,
                }
            )

    if not severe_latency and prev_metric and prev_metric.calls > 0:
        ratio = new_metric.calls / prev_metric.calls
        if ratio > CALL_RATIO:
            out.append(
                {
                    "severity": "low",
                    "regression_type": "call_spike",
                    "message": (
                        f"call count increased from {prev_metric.calls} to "
                        f"{new_metric.calls} ({ratio:.1f}x)"
                    ),
                    "old_metric_json": old_json,
                    "new_metric_json": new_json,
                }
            )

    if (
        prev_plan is not None
        and new_plan is not None
        and prev_plan.estimated_total_cost
        and new_plan.estimated_total_cost
        and prev_plan.estimated_total_cost > 0
    ):
        ratio = new_plan.estimated_total_cost / prev_plan.estimated_total_cost
        if ratio > COST_RATIO:
            out.append(
                {
                    "severity": "medium",
                    "regression_type": "cost_spike",
                    "message": (
                        f"estimated plan cost increased from "
                        f"{prev_plan.estimated_total_cost:.1f} to "
                        f"{new_plan.estimated_total_cost:.1f} ({ratio:.1f}x)"
                    ),
                    "old_metric_json": old_json,
                    "new_metric_json": new_json,
                }
            )

    return out
