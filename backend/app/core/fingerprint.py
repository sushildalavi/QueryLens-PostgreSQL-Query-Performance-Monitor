"""Pure SQL fingerprinting.

Normalizes queries so semantically identical statements share a hash, even when
literals or whitespace differ. Designed to collapse both raw literals and
``pg_stat_statements`` placeholders ($1, $2, ...) onto the same canonical form.
"""

from __future__ import annotations

import hashlib
import re

_BLOCK_COMMENT_RE = re.compile(r"/\*.*?\*/", re.DOTALL)
_LINE_COMMENT_RE = re.compile(r"--[^\n]*")
_STR_RE = re.compile(r"'(?:''|[^'])*'")
_NUM_RE = re.compile(r"\b\d+(?:\.\d+)?\b")
_PG_PLACEHOLDER_RE = re.compile(r"\$\d+")
_WS_RE = re.compile(r"\s+")


def normalize(sql: str) -> str:
    if not sql:
        return ""
    s = _BLOCK_COMMENT_RE.sub(" ", sql)
    s = _LINE_COMMENT_RE.sub(" ", s)
    s = _STR_RE.sub("?", s)
    s = _PG_PLACEHOLDER_RE.sub("?", s)
    s = _NUM_RE.sub("?", s)
    s = _WS_RE.sub(" ", s).strip()
    if s.endswith(";"):
        s = s[:-1].rstrip()
    return s.lower()


def fingerprint(sql: str) -> tuple[str, str]:
    norm = normalize(sql)
    h = hashlib.sha256(norm.encode("utf-8")).hexdigest()
    return norm, h
