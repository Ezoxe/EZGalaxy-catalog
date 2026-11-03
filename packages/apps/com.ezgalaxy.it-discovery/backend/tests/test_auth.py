import json
import sqlite3

from conftest import auth_header


def code(res):
    return res.json()["detail"]["code"]


def test_register_rejects_invalid_pseudo_and_pin(client):
    assert code(client.post("/api/v2/auth/register", json={"pseudo": "ab", "pin": "1234"})) == "invalid_pseudo"
    assert code(client.post("/api/v2/auth/register", json={"pseudo": "Neo 42", "pin": "1234"})) == "invalid_pseudo"
    assert code(client.post("/api/v2/auth/register", json={"pseudo": "Neo42", "pin": "12a4"})) == "invalid_pin"
    assert code(client.post("/api/v2/auth/register", json={"pseudo": "SuperAdmin", "pin": "1234"})) == "invalid_pseudo"


def test_pseudo_is_unique_case_insensitive(client, register):
    register("Neo42")
    res = client.post("/api/v2/auth/register", json={"pseudo": "neo42", "pin": "1111"})
    assert res.status_code == 409 and code(res) == "pseudo_taken"


def test_login_is_case_insensitive_and_pin_never_returned(client, register):
    register("Neo42", "2580")
    res = client.post("/api/v2/auth/login", json={"pseudo": "NEO42", "pin": "2580"})
    assert res.status_code == 200
    body = res.json()
    assert body["player"]["pseudo"] == "Neo42"
    assert "pin" not in json.dumps(body["player"]).lower().replace("mustchangepin", "")


def test_pin_is_hashed_in_database(client, register, env):
    register("Neo42", "2580")
    conn = sqlite3.connect(env / "test.sqlite")
    pin_hash, = conn.execute("SELECT pin_hash FROM players").fetchone()
    assert "2580" not in pin_hash and len(pin_hash) == 64


def test_unknown_pseudo(client):
    res = client.post("/api/v2/auth/login", json={"pseudo": "Ghost", "pin": "1234"})
    assert res.status_code == 404 and code(res) == "unknown_pseudo"


def test_lockout_after_three_failures_then_unlock(client, register, clock):
    register("Neo42", "2580")
    first = client.post("/api/v2/auth/login", json={"pseudo": "Neo42", "pin": "0000"})
    assert first.status_code == 401 and first.json()["detail"]["triesLeft"] == 2
    second = client.post("/api/v2/auth/login", json={"pseudo": "Neo42", "pin": "0000"})
    assert second.json()["detail"]["triesLeft"] == 1
    third = client.post("/api/v2/auth/login", json={"pseudo": "Neo42", "pin": "0000"})
    assert third.status_code == 429 and code(third) == "locked"
    # Even the right PIN is refused while locked.
    assert client.post("/api/v2/auth/login", json={"pseudo": "Neo42", "pin": "2580"}).status_code == 429
    clock.advance(minutes=5, seconds=1)
    assert client.post("/api/v2/auth/login", json={"pseudo": "Neo42", "pin": "2580"}).status_code == 200


def test_success_resets_failure_counter(client, register):
    register("Neo42", "2580")
    client.post("/api/v2/auth/login", json={"pseudo": "Neo42", "pin": "0000"})
    client.post("/api/v2/auth/login", json={"pseudo": "Neo42", "pin": "0000"})
    assert client.post("/api/v2/auth/login", json={"pseudo": "Neo42", "pin": "2580"}).status_code == 200
    res = client.post("/api/v2/auth/login", json={"pseudo": "Neo42", "pin": "0000"})
    assert res.json()["detail"]["triesLeft"] == 2


def test_sessions_invalid_expired_and_logout(client, register, clock):
    headers = register()
    assert client.get("/api/v2/me", headers=headers).status_code == 200
    assert client.get("/api/v2/me", headers=auth_header("nope")).status_code == 401
    client.post("/api/v2/auth/logout", headers=headers)
    assert client.get("/api/v2/me", headers=headers).status_code == 401
    headers = auth_header(client.post("/api/v2/auth/login", json={"pseudo": "Neo42", "pin": "2580"}).json()["token"])
    clock.advance(days=181)
    assert client.get("/api/v2/me", headers=headers).status_code == 401


def test_change_pin(client, register):
    headers = register("Neo42", "2580")
    bad = client.post("/api/v2/me/pin", json={"currentPin": "1111", "newPin": "1234"}, headers=headers)
    assert bad.status_code == 401
    assert client.post("/api/v2/me/pin", json={"currentPin": "2580", "newPin": "1234"}, headers=headers).status_code == 200
    assert client.post("/api/v2/auth/login", json={"pseudo": "Neo42", "pin": "1234"}).status_code == 200


def test_legacy_accounts_are_imported_once(env, clock):
    import db
    import main
    conn = sqlite3.connect(env / "test.sqlite")
    conn.execute("""CREATE TABLE storage (scope TEXT NOT NULL DEFAULT 'private', collection TEXT NOT NULL,
        record_key TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}', created_at TEXT, updated_at TEXT,
        PRIMARY KEY (scope, collection, record_key))""")
    rows = [
        ("Max", {"pseudo": "Max", "pin": "1234", "xp": 120, "completedLessons": {"m1-0": True},
                 "completedQuizzes": {"m3": {"score": 1, "total": 1}}}, "2026-09-01 10:00:00"),
        ("max", {"pseudo": "max", "pin": "4321", "xp": 30}, "2026-08-01 10:00:00"),
        ("Bad Name!", {"pseudo": "Bad Name!", "pin": "abc"}, "2026-07-01 10:00:00"),
    ]
    for key, data, ts in rows:
        conn.execute("INSERT INTO storage(scope, collection, record_key, data, updated_at) VALUES('private','users',?,?,?)",
                     (key, json.dumps(data), ts))
    conn.commit()
    conn.close()
    db.migrate()
    db.migrate()
    conn = sqlite3.connect(env / "test.sqlite")
    players = conn.execute("SELECT pseudo, pin_temp FROM players ORDER BY id").fetchall()
    assert players == [("Max", 0), ("max-2", 0), ("Bad_Name_", 1)]
    xp = conn.execute("SELECT SUM(xp) FROM xp_events WHERE kind='legacy_import'").fetchone()[0]
    assert xp == 150
    assert conn.execute("SELECT ref FROM xp_events WHERE kind='lesson'").fetchall() == [("m1:0",)]
    from fastapi.testclient import TestClient
    import content
    content.reload_bank()
    client = TestClient(main.app)
    assert client.post("/api/v2/auth/login", json={"pseudo": "max", "pin": "1234"}).status_code == 200


def test_static_files_are_revalidated_on_every_load(client, env, monkeypatch):
    import main
    (env / "index.html").write_text("<!doctype html>", encoding="utf-8")
    (env / "app.js").write_text("// app", encoding="utf-8")
    monkeypatch.setattr(main, "STATIC_DIR", str(env))
    assert client.get("/app.js").headers["cache-control"] == "no-cache"
    assert client.get("/").headers["cache-control"] == "no-cache"
