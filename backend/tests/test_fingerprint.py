from app.core.fingerprint import fingerprint, normalize


def test_fingerprint_replaces_numeric_literals():
    a = fingerprint("SELECT * FROM users WHERE id = 123")
    b = fingerprint("SELECT * FROM users WHERE id = 456")
    assert a == b
    assert "?" in a[0]


def test_fingerprint_replaces_string_literals():
    a = fingerprint("SELECT id FROM users WHERE email = 'a@example.com'")
    b = fingerprint("SELECT id FROM users WHERE email = 'zzz@example.com'")
    assert a == b


def test_fingerprint_handles_escaped_quotes_in_string():
    a = fingerprint("SELECT * FROM t WHERE name = 'O''Brien'")
    b = fingerprint("SELECT * FROM t WHERE name = 'Smith'")
    assert a == b


def test_fingerprint_collapses_whitespace_and_case():
    a = fingerprint("SELECT  *\n FROM Users  WHERE id = 1")
    b = fingerprint("select * from users where id = 99")
    assert a == b


def test_fingerprint_strips_trailing_semicolon():
    a = fingerprint("select 1;")
    b = fingerprint("select 1")
    assert a == b


def test_fingerprint_handles_pg_placeholders():
    a = fingerprint("SELECT * FROM users WHERE id = $1")
    b = fingerprint("SELECT * FROM users WHERE id = 42")
    assert a == b


def test_fingerprint_strips_line_comments():
    a = fingerprint("SELECT 1 -- a comment\nFROM dual")
    b = fingerprint("SELECT 1 FROM dual")
    assert a == b


def test_fingerprint_strips_block_comments():
    a = fingerprint("/* hi */ SELECT 1 /* bye */")
    b = fingerprint("SELECT 1")
    assert a == b


def test_fingerprint_hash_stable():
    norm1, h1 = fingerprint("SELECT * FROM users WHERE id = 1")
    norm2, h2 = fingerprint("SELECT * FROM users WHERE id = 1")
    assert norm1 == norm2
    assert h1 == h2
    assert len(h1) == 64


def test_fingerprint_different_queries_get_different_hashes():
    _, h1 = fingerprint("SELECT * FROM users WHERE id = 1")
    _, h2 = fingerprint("SELECT * FROM orders WHERE id = 1")
    assert h1 != h2


def test_normalize_empty_input():
    assert normalize("") == ""
