import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

BANK = {
    "modules": [
        {"id": "m1", "title": "Module 1", "icon": "A", "tier": 1, "required": [], "lessons": 2,
         "quiz": [
             {"id": "m1:q0", "question": "Q0", "options": ["a", "b"], "correct": 1, "explanation": "E0"},
             {"id": "m1:q1", "question": "Q1", "options": ["a", "b"], "correct": 0, "explanation": "E1"},
         ]},
        {"id": "m2", "title": "Module 2", "icon": "B", "tier": 2, "required": ["m1"], "lessons": 1,
         "quiz": [
             {"id": "m2:q0", "question": "Q2", "options": ["a", "b", "c"], "correct": 2, "explanation": "E2"},
             {"id": "m2:q1", "question": "Q3", "options": ["a", "b"], "correct": 1, "explanation": "E3"},
         ]},
        {"id": "m3", "title": "Module 3", "icon": "C", "tier": 1, "required": [], "lessons": 1,
         "quiz": [
             {"id": "m3:q0", "question": "Q4", "options": ["a", "b"], "correct": 0, "explanation": "E4"},
         ]},
    ],
    "scenes": {"s1": {"module": "m1", "lesson": 0, "correct": 1, "explanation": "S1"}},
    "badges": ["first-login", "first-step", "curious", "quiz-master", "m1-badge", "tier-2-unlocked",
               "xp-100", "completionist", "unstoppable", "speed-demon"],
    "moduleBadges": {"m1": "m1-badge"},
}


class Clock:
    def __init__(self):
        self.value = datetime(2026, 10, 15, 12, 0, 0, tzinfo=timezone.utc)

    def __call__(self):
        return self.value

    def advance(self, **kwargs):
        self.value += timedelta(**kwargs)

    def set(self, *args):
        self.value = datetime(*args, tzinfo=timezone.utc)


@pytest.fixture()
def env(tmp_path, monkeypatch):
    bank = tmp_path / "bank.json"
    bank.write_text(json.dumps(BANK), encoding="utf-8")
    monkeypatch.setenv("DB_PATH", str(tmp_path / "test.sqlite"))
    monkeypatch.setenv("CONTENT_BANK", str(bank))
    monkeypatch.setenv("ADMIN_CODE", "tuteur-secret")
    monkeypatch.setenv("REGISTER_LIMIT_PER_HOUR", "1000")
    monkeypatch.setenv("STATIC_DIR", str(tmp_path))
    return tmp_path


@pytest.fixture()
def clock(env):
    import db
    c = Clock()
    db.set_clock(c)
    yield c
    db.set_clock(None)


@pytest.fixture()
def client(env, clock, monkeypatch):
    from fastapi.testclient import TestClient
    import content
    import db
    import main
    content.reload_bank()
    monkeypatch.setattr(main, "DB_PATH", os.environ["DB_PATH"])
    main.init_db()
    db.migrate()
    return TestClient(main.app)


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def register(client):
    def _register(pseudo="Neo42", pin="2580"):
        res = client.post("/api/v2/auth/register", json={"pseudo": pseudo, "pin": pin})
        assert res.status_code == 200, res.text
        return auth_header(res.json()["token"])
    return _register


@pytest.fixture()
def play(client, clock):
    """Play a whole run, one answer per second; `choices` may be callables of the question."""
    def _play(headers, kind, module=None, choices=None, step_seconds=1):
        res = client.post("/api/v2/runs", json={"kind": kind, "module": module}, headers=headers)
        assert res.status_code == 200, res.text
        run = res.json()
        import content
        bank = content.get_bank()
        for i, q in enumerate(run["questions"]):
            clock.advance(seconds=step_seconds)
            choice = choices[i] if choices is not None else bank.questions[q["id"]]["correct"]
            out = client.post(f"/api/v2/runs/{run['runId']}/answer", json={"index": i, "choice": choice},
                              headers=headers).json()
            if out.get("finished"):
                break
        return run, client.post(f"/api/v2/runs/{run['runId']}/finish", headers=headers).json()
    return _play
