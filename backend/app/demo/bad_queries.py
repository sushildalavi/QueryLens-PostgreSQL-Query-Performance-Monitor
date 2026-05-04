"""Named SQL templates the workload script picks from.

Some hit indexes, some don't. The workload runs a randomized mix and drops the
``orders.user_id`` index midway through to manufacture a regression on
``good_user_orders`` for the dashboard.
"""

from __future__ import annotations

QUERIES: dict[str, str] = {
    "good_user_orders": "SELECT * FROM demo.orders WHERE user_id = {user_id} LIMIT 50",
    "missing_index": "SELECT * FROM demo.orders WHERE shipping_zip = '{zip}'",
    "unindexed_order_by": "SELECT id, total_cents FROM demo.orders ORDER BY total_cents DESC LIMIT 10",
    "like_prefix_wildcard": "SELECT id, email FROM demo.users WHERE email LIKE '%{domain}'",
    "sequential_scan": "SELECT count(*) FROM demo.events WHERE event_type = '{evt}'",
    "large_join": (
        "SELECT u.email, count(*) AS c FROM demo.users u "
        "JOIN demo.orders o ON o.user_id = u.id "
        "JOIN demo.order_items oi ON oi.order_id = o.id "
        "WHERE o.created_at > now() - interval '30 days' "
        "GROUP BY u.email ORDER BY c DESC LIMIT 20"
    ),
}

WEIGHTS: dict[str, int] = {
    "good_user_orders": 5,
    "missing_index": 2,
    "unindexed_order_by": 2,
    "like_prefix_wildcard": 1,
    "sequential_scan": 4,
    "large_join": 1,
}

ZIP_CODES = ["10001", "94103", "60601", "75001", "98101", "30301"]
DOMAINS = ["@gmail.com", "@yahoo.com", "@outlook.com", "@example.com"]
EVENT_TYPES = ["page_view", "click", "purchase", "signup", "logout"]
