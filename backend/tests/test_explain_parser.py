import json
from pathlib import Path

import pytest

from app.core.explain_parser import parse_explain

FIX = Path(__file__).parent / "fixtures"


def _load(name: str):
    return json.loads((FIX / name).read_text())


def test_explain_parser_detects_seq_scan():
    parsed = parse_explain(_load("explain_seq_scan.json"))
    assert parsed.top_node_type == "Seq Scan"
    assert parsed.uses_seq_scan is True
    assert parsed.uses_index_scan is False
    assert parsed.estimated_rows == 50
    assert parsed.actual_rows == 1000
    assert parsed.estimated_total_cost == pytest.approx(1234.56)
    assert parsed.planning_time_ms == pytest.approx(0.123)
    assert parsed.execution_time_ms == pytest.approx(78.45)
    assert len(parsed.nodes) == 1


def test_explain_parser_detects_index_scan():
    parsed = parse_explain(_load("explain_index_scan.json"))
    assert parsed.top_node_type == "Index Scan"
    assert parsed.uses_index_scan is True
    assert parsed.uses_seq_scan is False


def test_explain_parser_handles_nested_loop():
    parsed = parse_explain(_load("explain_nested_loop.json"))
    assert parsed.top_node_type == "Nested Loop"
    assert parsed.uses_seq_scan is True
    assert parsed.uses_index_scan is True
    assert len(parsed.nodes) == 3
    relations = sorted(n.relation_name for n in parsed.nodes if n.relation_name)
    assert relations == ["events", "users"]


def test_explain_parser_no_actual_rows_when_not_analyze():
    plan = [
        {
            "Plan": {
                "Node Type": "Seq Scan",
                "Relation Name": "t",
                "Plan Rows": 10,
                "Total Cost": 5.0,
            }
        }
    ]
    parsed = parse_explain(plan)
    assert parsed.actual_rows is None
    assert parsed.execution_time_ms is None


def test_explain_parser_handles_empty_input():
    parsed = parse_explain([])
    assert parsed.top_node_type is None
    assert parsed.uses_seq_scan is False
    assert parsed.uses_index_scan is False


def test_explain_parser_accepts_dict_input():
    parsed = parse_explain({"Plan": {"Node Type": "Seq Scan", "Plan Rows": 1, "Total Cost": 1.0}})
    assert parsed.uses_seq_scan is True
