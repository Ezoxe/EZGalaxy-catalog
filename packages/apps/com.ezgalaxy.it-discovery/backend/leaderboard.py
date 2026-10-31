"""Seasons (monthly by default), Hall of Fame, records and ghost duels."""
import json
from datetime import date, timedelta

from fastapi import APIRouter, Request

import db
from auth import api_error, optional_player
from content import get_bank

router = APIRouter(prefix="/api/v2")

TOP_SIZE = 50


# ── Seasons ──────────────────────────────────────────────

def standings(conn, start: str, end: str):
    rows = conn.execute(
        """
        SELECT p.id, p.pseudo, SUM(e.xp) AS xp, MAX(e.created_at) AS last_gain,
          (SELECT COALESCE(SUM(r.duration_ms), 0) FROM runs r
            WHERE r.player_id = p.id AND r.kind IN ('quiz', 'ghost') AND r.status = 'done'
              AND r.finished_at >= ? AND r.finished_at < ?) AS quiz_ms,
          (SELECT COALESCE(SUM(t.xp), 0) FROM xp_events t WHERE t.player_id = p.id) AS total_xp
        FROM xp_events e JOIN players p ON p.id = e.player_id
        WHERE p.deleted_at IS NULL AND e.created_at >= ? AND e.created_at < ?
        GROUP BY p.id
        HAVING SUM(e.xp) > 0
        ORDER BY xp DESC, quiz_ms ASC, last_gain ASC
        """,
        (start, end, start, end),
    ).fetchall()
    return [
        {"rank": i + 1, "playerId": r["id"], "pseudo": r["pseudo"], "xp": r["xp"], "totalXp": r["total_xp"]}
        for i, r in enumerate(rows)
    ]


def close_season(conn, season, end_iso: str):
    podium = [{"pseudo": s["pseudo"], "xp": s["xp"]} for s in standings(conn, season["starts_at"], end_iso)[:3]]
    conn.execute("UPDATE seasons SET ends_at=?, podium=? WHERE id=?", (end_iso, json.dumps(podium), season["id"]))


def _open_season(conn):
    return conn.execute("SELECT * FROM seasons WHERE ends_at IS NULL ORDER BY id DESC LIMIT 1").fetchone()


def current_season(conn):
    """Return the open season, rolling over to a new one at each month boundary."""
    boundary = db.iso(db.month_start(db.now()))
    season = _open_season(conn)
    if season and season["starts_at"] < boundary:
        close_season(conn, season, boundary)
        season = None
    if not season:
        conn.execute("INSERT INTO seasons(starts_at) VALUES(?)", (boundary,))
        season = _open_season(conn)
    return season


def close_now(conn):
    """Tutor action: end the running season immediately and start a new one."""
    season = current_season(conn)
    now = db.iso(db.now())
    close_season(conn, season, now)
    conn.execute("INSERT INTO seasons(starts_at) VALUES(?)", (now,))
    return _open_season(conn)


def season_payload(season) -> dict:
    return {"id": season["id"], "startsAt": season["starts_at"], "endsAt": season["ends_at"]}


# ── Ghosts and records ───────────────────────────────────

def _perfect_runs(conn, module_id: str):
    """Fastest perfect quiz run of each player on a module."""
    rows = conn.execute(
        """
        SELECT r.id, r.player_id, p.pseudo, r.duration_ms, r.answers, r.finished_at
        FROM runs r JOIN players p ON p.id = r.player_id
        WHERE r.kind IN ('quiz', 'ghost') AND r.ref = ? AND r.status = 'done' AND p.deleted_at IS NULL
          AND json_array_length(r.answers) = json_array_length(r.questions)
          AND r.score = json_array_length(r.questions)
        ORDER BY r.duration_ms ASC
        """,
        (module_id,),
    ).fetchall()
    best = {}
    for r in rows:
        best.setdefault(r["player_id"], r)
    return best


def find_ghost(conn, module_id: str, player_id=None):
    best = _perfect_runs(conn, module_id)
    mine = best.pop(player_id, None) if player_id is not None else None
    others = list(best.values())
    if mine is not None:
        # The next time to beat: the slowest of the runs that are still faster than mine.
        others = [r for r in others if r["duration_ms"] < mine["duration_ms"]]
    if not others:
        return None
    ghost = max(others, key=lambda r: r["duration_ms"])
    return {
        "pseudo": ghost["pseudo"],
        "durationMs": ghost["duration_ms"],
        "timeline": [a["t"] for a in json.loads(ghost["answers"])],
        "at": ghost["finished_at"],
        "myBestMs": mine["duration_ms"] if mine is not None else None,
    }


def _longest_daily_streaks(conn):
    rows = conn.execute(
        """SELECT r.player_id, p.pseudo, r.ref FROM runs r JOIN players p ON p.id = r.player_id
           WHERE r.kind = 'daily' AND r.status = 'done' AND p.deleted_at IS NULL"""
    ).fetchall()
    days = {}
    for r in rows:
        days.setdefault((r["player_id"], r["pseudo"]), set()).add(date.fromisoformat(r["ref"]))
    result = {}
    for (pid, pseudo), dset in days.items():
        longest = run = 0
        prev = None
        for d in sorted(dset):
            run = run + 1 if prev and d - prev == timedelta(days=1) else 1
            longest = max(longest, run)
            prev = d
        result[pid] = (pseudo, longest)
    return result


def records(conn, player_id=None):
    out = []
    for kind, label in (("speedrun", "Speedrun 60 s"), ("survival", "Survie")):
        top = conn.execute(
            """SELECT p.pseudo, r.score, r.finished_at FROM runs r JOIN players p ON p.id = r.player_id
               WHERE r.kind = ? AND r.status = 'done' AND p.deleted_at IS NULL AND r.score > 0
               ORDER BY r.score DESC, r.finished_at ASC LIMIT 1""",
            (kind,),
        ).fetchone()
        mine = conn.execute(
            "SELECT MAX(score) FROM runs WHERE kind=? AND status='done' AND player_id=?", (kind, player_id)
        ).fetchone()[0] if player_id is not None else None
        out.append({"mode": kind, "label": label, "unit": "points",
                    "value": top["score"] if top else None, "holder": top["pseudo"] if top else None,
                    "at": top["finished_at"] if top else None, "mine": mine})
    streaks = _longest_daily_streaks(conn)
    holder = max(streaks.items(), key=lambda kv: kv[1][1], default=None)
    out.append({"mode": "daily", "label": "Série de défis du jour", "unit": "jours",
                "value": holder[1][1] if holder else None, "holder": holder[1][0] if holder else None,
                "at": None, "mine": streaks.get(player_id, (None, None))[1] if player_id is not None else None})
    bank = get_bank()
    for module_id in bank.module_order:
        module = bank.modules[module_id]
        top = conn.execute(
            """SELECT p.pseudo, q.perfect_time_ms, q.updated_at FROM quiz_best q JOIN players p ON p.id = q.player_id
               WHERE q.module_id = ? AND q.perfect_time_ms IS NOT NULL AND p.deleted_at IS NULL
               ORDER BY q.perfect_time_ms ASC LIMIT 1""",
            (module_id,),
        ).fetchone()
        mine = conn.execute(
            "SELECT perfect_time_ms FROM quiz_best WHERE module_id=? AND player_id=?", (module_id, player_id)
        ).fetchone() if player_id is not None else None
        out.append({"mode": f"quiz:{module_id}", "label": f"Quiz parfait · {module['title']}", "unit": "ms",
                    "icon": module["icon"],
                    "value": top["perfect_time_ms"] if top else None, "holder": top["pseudo"] if top else None,
                    "at": top["updated_at"] if top else None, "mine": mine[0] if mine else None})
    return out


# ── Routes ───────────────────────────────────────────────

@router.get("/leaderboard/season")
def season_board(request: Request):
    with db.get_db() as conn:
        player = optional_player(conn, request)
        season = current_season(conn)
        rows = standings(conn, season["starts_at"], "9999")
        me = next((r for r in rows if player and r["playerId"] == player["id"]), None)
        entries = [{**{k: v for k, v in r.items() if k != "playerId"}, "me": r is me} for r in rows[:TOP_SIZE]]
        return {
            "season": season_payload(season),
            "entries": entries,
            "me": {"rank": me["rank"], "xp": me["xp"]} if me else None,
            "players": len(rows),
        }


@router.get("/leaderboard/hall-of-fame")
def hall_of_fame():
    with db.get_db() as conn:
        current_season(conn)
        rows = conn.execute(
            "SELECT * FROM seasons WHERE ends_at IS NOT NULL ORDER BY starts_at DESC"
        ).fetchall()
        seasons = []
        for s in rows:
            podium = json.loads(s["podium"] or "[]")
            if podium:
                seasons.append({**season_payload(s), "podium": podium})
        return {"seasons": seasons}


@router.get("/leaderboard/records")
def records_board(request: Request):
    with db.get_db() as conn:
        player = optional_player(conn, request)
        return {"records": records(conn, player["id"] if player else None)}


@router.get("/ghost/{module_id}")
def ghost(module_id: str, request: Request):
    if not get_bank().module(module_id):
        api_error(404, "unknown_module", "Module inconnu.")
    with db.get_db() as conn:
        player = optional_player(conn, request)
        return {"ghost": find_ghost(conn, module_id, player["id"] if player else None)}
