"""Tutor area: follow interns, reset forgotten PINs, moderate, close seasons."""
import csv
import io
import os

from fastapi import APIRouter, Request
from fastapi.responses import Response
from pydantic import BaseModel

import db
import leaderboard
import security
from auth import (LOCK_MINUTES, api_error, bearer_token, check_lock, clear_failures, create_session,
                  record_failure, require_admin)
from content import get_bank
from game import done_lessons, module_status, quiz_best_map, total_xp

router = APIRouter(prefix="/api/v2/admin")

ADMIN_LOCK_KEY = "__admin__"


class AdminLogin(BaseModel):
    code: str = ""


class Rename(BaseModel):
    pseudo: str = ""


def _player_or_404(conn, player_id: int):
    player = conn.execute("SELECT * FROM players WHERE id=? AND deleted_at IS NULL", (player_id,)).fetchone()
    if not player:
        api_error(404, "unknown_player", "Stagiaire introuvable.")
    return player


def _rows(conn):
    bank = get_bank()
    players = conn.execute(
        "SELECT * FROM players WHERE deleted_at IS NULL ORDER BY last_seen_at DESC"
    ).fetchall()
    out = []
    for p in players:
        lessons = done_lessons(conn, p["id"])
        completed, _ = module_status(bank, lessons, quiz_best_map(conn, p["id"]))
        out.append({
            "id": p["id"], "pseudo": p["pseudo"], "createdAt": p["created_at"], "lastSeenAt": p["last_seen_at"],
            "xp": total_xp(conn, p["id"]), "lessons": len(lessons & set(bank.all_lesson_refs())),
            "lessonsTotal": len(bank.all_lesson_refs()), "modules": len(completed),
            "modulesTotal": len(bank.module_order), "mustChangePin": bool(p["pin_temp"]),
        })
    return out


@router.post("/login")
def admin_login(body: AdminLogin):
    expected = os.environ.get("ADMIN_CODE")
    if not expected:
        api_error(404, "admin_disabled", "L'espace tuteur n'est pas activé (variable ADMIN_CODE absente).")
    with db.get_db() as conn:
        check_lock(conn, ADMIN_LOCK_KEY)
        if not security.verify_code(body.code, expected):
            left = record_failure(conn, ADMIN_LOCK_KEY)
            conn.commit()
            if left == 0:
                api_error(429, "locked", "3 essais ratés : pause de 5 minutes.", retryAfter=LOCK_MINUTES * 60)
            api_error(401, "bad_code", "Code tuteur incorrect.", triesLeft=left)
        clear_failures(conn, ADMIN_LOCK_KEY)
        return {"token": create_session(conn, None, kind="admin")}


@router.post("/logout")
def admin_logout(request: Request):
    token = bearer_token(request)
    if token:
        with db.get_db() as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash=? AND kind='admin'", (security.token_hash(token),))
    return {"ok": True}


@router.get("/overview")
def overview(request: Request):
    with db.get_db() as conn:
        require_admin(conn, request)
        rows = _rows(conn)
        week_ago = db.iso(db.plus(db.now(), days=-7))
        flagged = conn.execute(
            """SELECT r.id, r.kind, r.ref, r.score, r.flag_reason, r.finished_at, p.pseudo
               FROM runs r LEFT JOIN players p ON p.id = r.player_id
               WHERE r.status = 'flagged' ORDER BY r.finished_at DESC LIMIT 50"""
        ).fetchall()
        season = leaderboard.current_season(conn)
        return {
            "players": rows,
            "stats": {
                "players": len(rows),
                "activeWeek": sum(1 for r in rows if r["lastSeenAt"] >= week_ago),
                "modulesDone": sum(r["modules"] for r in rows),
                "flagged": len(flagged),
            },
            "flagged": [dict(f) for f in flagged],
            "season": leaderboard.season_payload(season),
        }


@router.post("/players/{player_id}/reset-pin")
def reset_pin(player_id: int, request: Request):
    with db.get_db() as conn:
        require_admin(conn, request)
        player = _player_or_404(conn, player_id)
        pin = security.random_pin()
        pin_hash, pin_salt = security.hash_pin(pin)
        conn.execute("UPDATE players SET pin_hash=?, pin_salt=?, pin_temp=1 WHERE id=?", (pin_hash, pin_salt, player_id))
        conn.execute("DELETE FROM sessions WHERE player_id=?", (player_id,))
        clear_failures(conn, player["pseudo_key"])
        return {"pin": pin, "pseudo": player["pseudo"]}


@router.post("/players/{player_id}/rename")
def rename(player_id: int, body: Rename, request: Request):
    pseudo = (body.pseudo or "").strip()
    error = security.validate_pseudo(pseudo)
    if error:
        api_error(400, "invalid_pseudo", error)
    with db.get_db() as conn:
        require_admin(conn, request)
        _player_or_404(conn, player_id)
        key = security.pseudo_key(pseudo)
        taken = conn.execute("SELECT id FROM players WHERE pseudo_key=? AND id<>?", (key, player_id)).fetchone()
        if taken:
            api_error(409, "pseudo_taken", "Ce pseudo est déjà pris.")
        conn.execute("UPDATE players SET pseudo=?, pseudo_key=? WHERE id=?", (pseudo, key, player_id))
        return {"ok": True}


@router.delete("/players/{player_id}")
def delete_player(player_id: int, request: Request):
    with db.get_db() as conn:
        require_admin(conn, request)
        player = _player_or_404(conn, player_id)
        # Free the pseudo for a future intern while keeping the history intact.
        conn.execute("UPDATE players SET deleted_at=?, pseudo_key=? WHERE id=?",
                     (db.iso(db.now()), f"{player['pseudo_key']}#deleted{player_id}", player_id))
        conn.execute("DELETE FROM sessions WHERE player_id=?", (player_id,))
        return {"ok": True}


@router.post("/seasons/close")
def close_season(request: Request):
    with db.get_db() as conn:
        require_admin(conn, request)
        return {"season": leaderboard.season_payload(leaderboard.close_now(conn))}


@router.get("/export.csv")
def export_csv(request: Request):
    with db.get_db() as conn:
        require_admin(conn, request)
        rows = _rows(conn)
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")
    writer.writerow(["pseudo", "inscrit_le", "derniere_visite", "xp", "lecons", "modules_termines"])
    for r in rows:
        writer.writerow([r["pseudo"], r["createdAt"], r["lastSeenAt"], r["xp"],
                         f"{r['lessons']}/{r['lessonsTotal']}", f"{r['modules']}/{r['modulesTotal']}"])
    return Response(content="﻿" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="it-discovery-stagiaires.csv"'})
