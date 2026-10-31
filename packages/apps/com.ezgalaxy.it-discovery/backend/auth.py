"""Accounts: register, login with PIN lockout, sessions, PIN change."""
import os
import time
from collections import defaultdict, deque

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

import db
import security

router = APIRouter(prefix="/api/v2")

MAX_FAILURES = 3
LOCK_MINUTES = 5
SESSION_DAYS = 180
ADMIN_SESSION_HOURS = 8

_register_hits = defaultdict(deque)


def api_error(status: int, code: str, message: str, **extra):
    raise HTTPException(status_code=status, detail={"code": code, "message": message, **extra})


def _register_limit() -> int:
    return int(os.environ.get("REGISTER_LIMIT_PER_HOUR", "20"))


def _check_register_rate(request: Request):
    ip = request.client.host if request.client else "unknown"
    hits = _register_hits[ip]
    cutoff = time.monotonic() - 3600
    while hits and hits[0] < cutoff:
        hits.popleft()
    if len(hits) >= _register_limit():
        api_error(429, "rate_limited", "Trop de comptes créés depuis cet appareil. Réessaie dans une heure.")
    hits.append(time.monotonic())


# ── Lockout ──────────────────────────────────────────────

def check_lock(conn, key: str):
    row = conn.execute("SELECT locked_until FROM login_attempts WHERE key=?", (key,)).fetchone()
    if row and row["locked_until"]:
        until = db.parse_iso(row["locked_until"])
        remaining = (until - db.now()).total_seconds()
        if remaining > 0:
            api_error(429, "locked", "Trop d'essais ratés. Attends un peu avant de réessayer.",
                      retryAfter=int(remaining) + 1)


def record_failure(conn, key: str) -> int:
    """Return how many tries are left; 0 means the key is now locked."""
    row = conn.execute("SELECT failures FROM login_attempts WHERE key=?", (key,)).fetchone()
    failures = (row["failures"] if row else 0) + 1
    if failures >= MAX_FAILURES:
        until = db.iso(db.plus(db.now(), minutes=LOCK_MINUTES))
        conn.execute(
            "INSERT INTO login_attempts(key, failures, locked_until) VALUES(?,0,?) "
            "ON CONFLICT(key) DO UPDATE SET failures=0, locked_until=excluded.locked_until",
            (key, until),
        )
        return 0
    conn.execute(
        "INSERT INTO login_attempts(key, failures, locked_until) VALUES(?,?,NULL) "
        "ON CONFLICT(key) DO UPDATE SET failures=excluded.failures, locked_until=NULL",
        (key, failures),
    )
    return MAX_FAILURES - failures


def clear_failures(conn, key: str):
    conn.execute("DELETE FROM login_attempts WHERE key=?", (key,))


# ── Sessions ─────────────────────────────────────────────

def create_session(conn, player_id, kind="player") -> str:
    token, token_hash = security.new_token()
    created = db.now()
    lifetime = {"hours": ADMIN_SESSION_HOURS} if kind == "admin" else {"days": SESSION_DAYS}
    conn.execute(
        "INSERT INTO sessions(token_hash, player_id, kind, created_at, expires_at) VALUES(?,?,?,?,?)",
        (token_hash, player_id, kind, db.iso(created), db.iso(db.plus(created, **lifetime))),
    )
    return token


def bearer_token(request: Request):
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip() or None
    return None


def _session(conn, request: Request, kind: str):
    token = bearer_token(request)
    if not token:
        return None
    row = conn.execute(
        "SELECT token_hash, player_id, expires_at FROM sessions WHERE token_hash=? AND kind=?",
        (security.token_hash(token), kind),
    ).fetchone()
    if not row or db.parse_iso(row["expires_at"]) <= db.now():
        return None
    return row


def optional_player(conn, request: Request):
    session = _session(conn, request, "player")
    if not session:
        return None
    player = conn.execute(
        "SELECT * FROM players WHERE id=? AND deleted_at IS NULL", (session["player_id"],)
    ).fetchone()
    if not player:
        return None
    now = db.now()
    # Sliding expiry, written at most once a day per session.
    if db.parse_iso(session["expires_at"]) < db.plus(now, days=SESSION_DAYS - 1):
        conn.execute("UPDATE sessions SET expires_at=? WHERE token_hash=?",
                     (db.iso(db.plus(now, days=SESSION_DAYS)), session["token_hash"]))
        conn.execute("UPDATE players SET last_seen_at=? WHERE id=?", (db.iso(now), player["id"]))
    return player


def current_player(conn, request: Request):
    player = optional_player(conn, request)
    if not player:
        api_error(401, "auth_required", "Ta session a expiré. Reconnecte-toi.")
    return player


def require_admin(conn, request: Request):
    if not os.environ.get("ADMIN_CODE"):
        api_error(404, "admin_disabled", "L'espace tuteur n'est pas activé (variable ADMIN_CODE absente).")
    if not _session(conn, request, "admin"):
        api_error(401, "admin_required", "Session tuteur expirée. Saisis à nouveau le code.")


def player_payload(player) -> dict:
    return {
        "id": player["id"],
        "pseudo": player["pseudo"],
        "createdAt": player["created_at"],
        "mustChangePin": bool(player["pin_temp"]),
        "guestImported": bool(player["guest_imported"]),
    }


def award_badge(conn, player_id: int, badge_id: str) -> bool:
    cur = conn.execute(
        "INSERT OR IGNORE INTO badges(player_id, badge_id, earned_at) VALUES(?,?,?)",
        (player_id, badge_id, db.iso(db.now())),
    )
    return cur.rowcount > 0


# ── Routes ───────────────────────────────────────────────

class Credentials(BaseModel):
    pseudo: str = ""
    pin: str = ""


class PinChange(BaseModel):
    currentPin: str = ""
    newPin: str = ""


@router.post("/auth/register")
def register(body: Credentials, request: Request):
    pseudo = (body.pseudo or "").strip()
    error = security.validate_pseudo(pseudo)
    if error:
        api_error(400, "invalid_pseudo", error)
    if not security.validate_pin(body.pin):
        api_error(400, "invalid_pin", "Le code PIN doit contenir exactement 4 chiffres.")
    _check_register_rate(request)
    key = security.pseudo_key(pseudo)
    with db.get_db() as conn:
        if conn.execute("SELECT 1 FROM players WHERE pseudo_key=?", (key,)).fetchone():
            api_error(409, "pseudo_taken", "Ce pseudo est déjà pris, choisis-en un autre.")
        pin_hash, pin_salt = security.hash_pin(body.pin)
        ts = db.iso(db.now())
        cur = conn.execute(
            "INSERT INTO players(pseudo, pseudo_key, pin_hash, pin_salt, created_at, last_seen_at) VALUES(?,?,?,?,?,?)",
            (pseudo, key, pin_hash, pin_salt, ts, ts),
        )
        player_id = cur.lastrowid
        award_badge(conn, player_id, "first-login")
        token = create_session(conn, player_id)
        player = conn.execute("SELECT * FROM players WHERE id=?", (player_id,)).fetchone()
        return {"token": token, "player": player_payload(player)}


@router.post("/auth/login")
def login(body: Credentials):
    key = security.pseudo_key(body.pseudo)
    if not key:
        api_error(400, "invalid_pseudo", "Entre ton pseudo.")
    if not security.validate_pin(body.pin):
        api_error(400, "invalid_pin", "Le code PIN doit contenir exactement 4 chiffres.")
    with db.get_db() as conn:
        check_lock(conn, key)
        player = conn.execute(
            "SELECT * FROM players WHERE pseudo_key=? AND deleted_at IS NULL", (key,)
        ).fetchone()
        if not player:
            api_error(404, "unknown_pseudo", "Aucun compte avec ce pseudo. Vérifie l'orthographe ou crée un compte.")
        if not security.verify_pin(body.pin, player["pin_hash"], player["pin_salt"]):
            left = record_failure(conn, key)
            conn.commit()
            if left == 0:
                api_error(429, "locked", "3 essais ratés : pause de 5 minutes.",
                          retryAfter=LOCK_MINUTES * 60)
            api_error(401, "bad_pin", "Code PIN incorrect.", triesLeft=left)
        clear_failures(conn, key)
        award_badge(conn, player["id"], "first-login")
        conn.execute("UPDATE players SET last_seen_at=? WHERE id=?", (db.iso(db.now()), player["id"]))
        token = create_session(conn, player["id"])
        return {"token": token, "player": player_payload(player)}


@router.post("/auth/logout")
def logout(request: Request):
    token = bearer_token(request)
    if token:
        with db.get_db() as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash=?", (security.token_hash(token),))
    return {"ok": True}


@router.get("/me")
def me(request: Request):
    with db.get_db() as conn:
        return {"player": player_payload(current_player(conn, request))}


@router.post("/me/pin")
def change_pin(body: PinChange, request: Request):
    if not security.validate_pin(body.newPin):
        api_error(400, "invalid_pin", "Le nouveau code PIN doit contenir exactement 4 chiffres.")
    with db.get_db() as conn:
        player = current_player(conn, request)
        if not player["pin_temp"]:
            if not security.verify_pin(body.currentPin or "", player["pin_hash"], player["pin_salt"]):
                api_error(401, "bad_pin", "Ton code PIN actuel est incorrect.")
        pin_hash, pin_salt = security.hash_pin(body.newPin)
        conn.execute("UPDATE players SET pin_hash=?, pin_salt=?, pin_temp=0 WHERE id=?",
                     (pin_hash, pin_salt, player["id"]))
        player = conn.execute("SELECT * FROM players WHERE id=?", (player["id"],)).fetchone()
        return {"player": player_payload(player)}
