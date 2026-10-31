"""SQLite access, clock and versioned migrations for IT Discovery."""
import json
import logging
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

import security

logger = logging.getLogger("itdiscovery")

ISO_FMT = "%Y-%m-%dT%H:%M:%S.%fZ"
_clock = None


def db_path() -> str:
    return os.environ.get("DB_PATH", "/app/data/database.sqlite")


def now() -> datetime:
    return _clock() if _clock else datetime.now(timezone.utc)


def set_clock(fn):
    """Tests replace the clock to simulate lockouts and month changes."""
    global _clock
    _clock = fn


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime(ISO_FMT)


def parse_iso(value: str) -> datetime:
    return datetime.strptime(value, ISO_FMT).replace(tzinfo=timezone.utc)


def month_start(dt: datetime) -> datetime:
    return dt.astimezone(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def day_start(dt: datetime) -> datetime:
    return dt.astimezone(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)


def connect() -> sqlite3.Connection:
    Path(db_path()).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path(), timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    """One connection per unit of work: commit on success, roll back on error."""
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


SCHEMA_V1 = """
CREATE TABLE IF NOT EXISTS players(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pseudo TEXT NOT NULL,
    pseudo_key TEXT NOT NULL UNIQUE,
    pin_hash TEXT NOT NULL,
    pin_salt TEXT NOT NULL,
    pin_temp INTEGER NOT NULL DEFAULT 0,
    guest_imported INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions(
    token_hash TEXT PRIMARY KEY,
    player_id INTEGER REFERENCES players(id),
    kind TEXT NOT NULL DEFAULT 'player',
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts(
    key TEXT PRIMARY KEY,
    failures INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT
);
CREATE TABLE IF NOT EXISTS xp_events(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id),
    kind TEXT NOT NULL,
    ref TEXT NOT NULL,
    xp INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(player_id, kind, ref)
);
CREATE INDEX IF NOT EXISTS idx_xp_created ON xp_events(created_at);
CREATE TABLE IF NOT EXISTS quiz_best(
    player_id INTEGER NOT NULL REFERENCES players(id),
    module_id TEXT NOT NULL,
    best_score INTEGER NOT NULL,
    total INTEGER NOT NULL,
    best_time_ms INTEGER,
    perfect_time_ms INTEGER,
    updated_at TEXT NOT NULL,
    PRIMARY KEY(player_id, module_id)
);
CREATE TABLE IF NOT EXISTS runs(
    id TEXT PRIMARY KEY,
    player_id INTEGER REFERENCES players(id),
    kind TEXT NOT NULL,
    ref TEXT,
    questions TEXT NOT NULL,
    answers TEXT NOT NULL DEFAULT '[]',
    lives INTEGER,
    score INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    duration_ms INTEGER,
    status TEXT NOT NULL DEFAULT 'running',
    flag_reason TEXT,
    meta TEXT,
    summary TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_player ON runs(player_id, kind, status);
CREATE TABLE IF NOT EXISTS badges(
    player_id INTEGER NOT NULL REFERENCES players(id),
    badge_id TEXT NOT NULL,
    earned_at TEXT NOT NULL,
    PRIMARY KEY(player_id, badge_id)
);
CREATE TABLE IF NOT EXISTS seasons(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    starts_at TEXT NOT NULL,
    ends_at TEXT,
    podium TEXT
);
"""


def _migration_1(conn):
    # executescript() would commit mid-migration, so run statements one by one.
    for statement in SCHEMA_V1.split(";"):
        if statement.strip():
            conn.execute(statement)


def _legacy_time(value: str) -> str:
    """Legacy rows store SQLite's 'YYYY-MM-DD HH:MM:SS'."""
    try:
        dt = datetime.strptime(value, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        dt = now()
    return iso(dt)


def _unique_key(conn, pseudo: str):
    candidate = pseudo
    n = 2
    while conn.execute("SELECT 1 FROM players WHERE pseudo_key=?", (security.pseudo_key(candidate),)).fetchone():
        suffix = f"-{n}"
        candidate = pseudo[:16 - len(suffix)] + suffix
        n += 1
    return candidate


def _migration_2(conn):
    """Import accounts from the old SDK storage (plain-text PINs, client XP)."""
    has_storage = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='storage'"
    ).fetchone()
    if not has_storage:
        return
    rows = conn.execute(
        "SELECT record_key, data, updated_at FROM storage "
        "WHERE scope='private' AND collection='users' ORDER BY updated_at DESC"
    ).fetchall()
    imported = 0
    for row in rows:
        try:
            data = json.loads(row["data"]) or {}
        except (json.JSONDecodeError, TypeError):
            continue
        if not isinstance(data, dict):
            continue
        pseudo = _unique_key(conn, security.sanitize_legacy_pseudo(str(data.get("pseudo") or row["record_key"])))
        ts = _legacy_time(row["updated_at"])
        pin = str(data.get("pin", ""))
        pin_temp = 0
        if not security.validate_pin(pin):
            pin, pin_temp = security.random_pin(), 1
        pin_hash, pin_salt = security.hash_pin(pin)
        cur = conn.execute(
            "INSERT INTO players(pseudo, pseudo_key, pin_hash, pin_salt, pin_temp, guest_imported, created_at, last_seen_at)"
            " VALUES(?,?,?,?,?,1,?,?)",
            (pseudo, security.pseudo_key(pseudo), pin_hash, pin_salt, pin_temp, ts, ts),
        )
        pid = cur.lastrowid
        xp = data.get("xp")
        if isinstance(xp, (int, float)) and xp > 0:
            conn.execute(
                "INSERT OR IGNORE INTO xp_events(player_id, kind, ref, xp, created_at) VALUES(?,?,?,?,?)",
                (pid, "legacy_import", "legacy", int(xp), ts),
            )
        lessons = data.get("completedLessons") if isinstance(data.get("completedLessons"), dict) else {}
        for key, done in lessons.items():
            if not done or "-" not in key:
                continue
            module_id, idx = key.rsplit("-", 1)
            if idx.isdigit():
                conn.execute(
                    "INSERT OR IGNORE INTO xp_events(player_id, kind, ref, xp, created_at) VALUES(?,?,?,0,?)",
                    (pid, "lesson", f"{module_id}:{int(idx)}", ts),
                )
        quizzes = data.get("completedQuizzes") if isinstance(data.get("completedQuizzes"), dict) else {}
        for module_id, res in quizzes.items():
            if not isinstance(res, dict):
                continue
            score, total = int(res.get("score") or 0), int(res.get("total") or 0)
            if total <= 0:
                continue
            conn.execute(
                "INSERT OR IGNORE INTO quiz_best(player_id, module_id, best_score, total, updated_at) VALUES(?,?,?,?,?)",
                (pid, module_id, min(score, total), total, ts),
            )
        imported += 1
    if imported:
        logger.info("Imported %d legacy accounts", imported)


MIGRATIONS = [(1, _migration_1), (2, _migration_2)]


def migrate():
    conn = connect()
    try:
        conn.execute("CREATE TABLE IF NOT EXISTS schema_version(version INTEGER NOT NULL)")
        current = conn.execute("SELECT COALESCE(MAX(version), 0) FROM schema_version").fetchone()[0]
        for version, step in MIGRATIONS:
            if version <= current:
                continue
            try:
                conn.execute("BEGIN")
                step(conn)
                conn.execute("INSERT INTO schema_version(version) VALUES(?)", (version,))
                conn.commit()
            except Exception:
                conn.rollback()
                logger.exception("Migration %d failed", version)
                raise
    finally:
        conn.close()


def plus(dt: datetime, **kwargs) -> datetime:
    return dt + timedelta(**kwargs)
