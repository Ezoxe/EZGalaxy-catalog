"""Lessons, scene challenges, quiz and arcade runs. All XP is decided here."""
import json
import random
import secrets
from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel

import db
import leaderboard
from auth import api_error, award_badge, current_player, optional_player
from content import get_bank

router = APIRouter(prefix="/api/v2")

XP_LESSON = 10
XP_SCENE = 5
XP_CORRECT = 5
XP_PERFECT = 20
ARCADE_XP_PER_POINT = 2
ARCADE_DAILY_CAP = 150
DAILY_SIZE = 10
DAILY_BONUS = 10
SPEEDRUN_MS = 60_000
GRACE_MS = 1_500
MIN_ANSWER_MS = 250
SURVIVAL_LIVES = 3
STREAK_BONUS_EVERY = 5

QUIZ_KINDS = ("quiz", "ghost")
FIXED_KINDS = ("quiz", "ghost", "daily")
ARCADE_KINDS = ("speedrun", "survival")
RUN_KINDS = QUIZ_KINDS + ARCADE_KINDS + ("daily",)


# ── Player state ─────────────────────────────────────────

def done_lessons(conn, player_id) -> set:
    rows = conn.execute("SELECT ref FROM xp_events WHERE player_id=? AND kind='lesson'", (player_id,))
    return {r["ref"] for r in rows}


def quiz_best_map(conn, player_id) -> dict:
    rows = conn.execute("SELECT * FROM quiz_best WHERE player_id=?", (player_id,))
    return {r["module_id"]: r for r in rows}


def module_status(bank, lessons: set, quiz_best: dict):
    completed = {
        mid for mid in bank.module_order
        if mid in quiz_best and all(ref in lessons for ref in bank.lesson_refs(mid))
    }
    unlocked = {
        mid for mid, module in bank.modules.items()
        if all(req in completed or req not in bank.modules for req in module["required"])
    }
    return completed, unlocked


def total_xp(conn, player_id) -> int:
    return conn.execute("SELECT COALESCE(SUM(xp),0) FROM xp_events WHERE player_id=?", (player_id,)).fetchone()[0]


def today() -> str:
    return db.day_start(db.now()).date().isoformat()


def _streaks(days):
    """Return (current streak ending today or yesterday, longest streak)."""
    ordered = sorted({date.fromisoformat(d) for d in days})
    longest = run = 0
    prev = None
    for d in ordered:
        run = run + 1 if prev and d - prev == timedelta(days=1) else 1
        longest = max(longest, run)
        prev = d
    current = 0
    if ordered:
        t = date.fromisoformat(today())
        if t - ordered[-1] <= timedelta(days=1):
            current = run
    return current, longest


def daily_days(conn, player_id):
    rows = conn.execute(
        "SELECT ref FROM runs WHERE player_id=? AND kind='daily' AND status='done'", (player_id,)
    )
    return [r["ref"] for r in rows]


def player_stats(conn, player_id) -> dict:
    row = conn.execute(
        "SELECT COALESCE(MAX(best_streak),0) AS streak,"
        " COALESCE(MAX(CASE WHEN kind='speedrun' THEN score END),0) AS speedrun,"
        " COALESCE(MAX(CASE WHEN kind='survival' THEN score END),0) AS survival"
        " FROM runs WHERE player_id=? AND status='done'",
        (player_id,),
    ).fetchone()
    days = daily_days(conn, player_id)
    current, longest = _streaks(days)
    done_today = conn.execute(
        "SELECT 1 FROM xp_events WHERE player_id=? AND kind='daily' AND ref=?", (player_id, today())
    ).fetchone() is not None
    return {
        "maxStreak": row["streak"],
        "speedrunBest": row["speedrun"],
        "survivalBest": row["survival"],
        "dailyCount": len(days),
        "dailyStreak": current,
        "dailyLongest": longest,
        "dailyDoneToday": done_today,
    }


def evaluate_badges(conn, player_id) -> list:
    bank = get_bank()
    lessons = done_lessons(conn, player_id)
    qb = quiz_best_map(conn, player_id)
    completed, unlocked = module_status(bank, lessons, qb)
    perfect = sum(1 for r in qb.values() if r["best_score"] >= r["total"])
    xp = total_xp(conn, player_id)
    stats = player_stats(conn, player_id)
    tiers = {bank.modules[mid]["tier"] for mid in unlocked}
    checks = {
        "first-step": len(lessons) >= 1,
        "curious": len(lessons) >= 5,
        "encyclopedia": set(bank.all_lesson_refs()) <= lessons,
        "quiz-master": perfect >= 1,
        "flawless": perfect >= 3,
        "perfectionist": perfect >= 5,
        "unstoppable": stats["maxStreak"] >= 5,
        "streak-10": stats["maxStreak"] >= 10,
        "streak-20": stats["maxStreak"] >= 20,
        "xp-100": xp >= 100,
        "xp-500": xp >= 500,
        "xp-1000": xp >= 1000,
        "speed-demon": any(r["perfect_time_ms"] is not None and r["perfect_time_ms"] < 30_000 for r in qb.values()),
        "tier-2-unlocked": 2 in tiers,
        "tier-3-unlocked": 3 in tiers,
        "tier-4-unlocked": 4 in tiers,
        "completionist": completed == set(bank.module_order),
        "speedrun-25": stats["speedrunBest"] >= 25,
        "survivor-10": stats["survivalBest"] >= 10,
        "daily-3": stats["dailyCount"] >= 3,
        "daily-7": stats["dailyCount"] >= 7,
    }
    for mid in completed:
        badge = bank.module_badges.get(mid)
        if badge:
            checks[badge] = True
    return [b for b, ok in checks.items() if ok and b in bank.badges and award_badge(conn, player_id, b)]


def progress_payload(conn, player_id) -> dict:
    bank = get_bank()
    lessons = done_lessons(conn, player_id)
    qb = quiz_best_map(conn, player_id)
    completed, unlocked = module_status(bank, lessons, qb)
    season = leaderboard.current_season(conn)
    month_xp = conn.execute(
        "SELECT COALESCE(SUM(xp),0) FROM xp_events WHERE player_id=? AND created_at>=?",
        (player_id, season["starts_at"]),
    ).fetchone()[0]
    scenes = [r["ref"] for r in conn.execute(
        "SELECT ref FROM xp_events WHERE player_id=? AND kind='scene'", (player_id,))]
    badges = [r["badge_id"] for r in conn.execute(
        "SELECT badge_id FROM badges WHERE player_id=? ORDER BY earned_at", (player_id,))]
    return {
        "xp": total_xp(conn, player_id),
        "seasonXp": month_xp,
        "lessons": sorted(lessons),
        "scenes": scenes,
        "quizBest": {
            mid: {"score": r["best_score"], "total": r["total"],
                  "bestTimeMs": r["best_time_ms"], "perfectTimeMs": r["perfect_time_ms"]}
            for mid, r in qb.items()
        },
        "completed": sorted(completed),
        "unlocked": sorted(unlocked),
        "badges": badges,
        "stats": player_stats(conn, player_id),
    }


def _require_unlocked(conn, player_id, module_id):
    bank = get_bank()
    _, unlocked = module_status(bank, done_lessons(conn, player_id), quiz_best_map(conn, player_id))
    if module_id not in unlocked:
        api_error(403, "module_locked", "Termine d'abord les modules requis pour débloquer celui-ci.")


def _add_lesson(conn, player_id, module_id, index) -> int:
    cur = conn.execute(
        "INSERT OR IGNORE INTO xp_events(player_id, kind, ref, xp, created_at) VALUES(?,?,?,?,?)",
        (player_id, "lesson", f"{module_id}:{index}", XP_LESSON, db.iso(db.now())),
    )
    return XP_LESSON if cur.rowcount else 0


# ── Lessons and scene challenges ─────────────────────────

class LessonEvent(BaseModel):
    module: str
    lesson: int


class SceneAnswer(BaseModel):
    scene: str
    choice: int


class GuestImport(BaseModel):
    lessons: List[str] = []


@router.get("/me/progress")
def my_progress(request: Request):
    with db.get_db() as conn:
        player = current_player(conn, request)
        return progress_payload(conn, player["id"])


@router.post("/events/lesson")
def lesson_done(body: LessonEvent, request: Request):
    bank = get_bank()
    module = bank.module(body.module)
    if not module:
        api_error(404, "unknown_module", "Module inconnu.")
    if not 0 <= body.lesson < module["lessons"]:
        api_error(400, "unknown_lesson", "Leçon inconnue.")
    with db.get_db() as conn:
        player = current_player(conn, request)
        _require_unlocked(conn, player["id"], body.module)
        gained = _add_lesson(conn, player["id"], body.module, body.lesson)
        badges = evaluate_badges(conn, player["id"])
        return {"xpGained": gained, "newBadges": badges, "progress": progress_payload(conn, player["id"])}


@router.post("/events/scene-quiz")
def scene_quiz(body: SceneAnswer, request: Request):
    bank = get_bank()
    scene = bank.scenes.get(body.scene)
    if not scene:
        api_error(404, "unknown_scene", "Défi inconnu.")
    correct = body.choice == scene["correct"]
    result = {"correct": correct, "correctIndex": scene["correct"], "explanation": scene["explanation"],
              "xpGained": 0, "newBadges": [], "firstTry": None}
    with db.get_db() as conn:
        player = optional_player(conn, request)
        if player:
            # Only the first answer counts, so retrying after a mistake earns nothing.
            cur = conn.execute(
                "INSERT OR IGNORE INTO xp_events(player_id, kind, ref, xp, created_at) VALUES(?,?,?,?,?)",
                (player["id"], "scene", body.scene, XP_SCENE if correct else 0, db.iso(db.now())),
            )
            result["firstTry"] = cur.rowcount > 0
            if cur.rowcount and correct:
                result["xpGained"] = XP_SCENE
                result["newBadges"] = evaluate_badges(conn, player["id"])
    return result


@router.post("/me/import-guest")
def import_guest(body: GuestImport, request: Request):
    bank = get_bank()
    with db.get_db() as conn:
        player = current_player(conn, request)
        if player["guest_imported"]:
            return {"xpGained": 0, "newBadges": [], "progress": progress_payload(conn, player["id"])}
        wanted = set(body.lessons[:300])
        gained = 0
        for ref in bank.all_lesson_refs():
            if ref not in wanted:
                continue
            module_id, index = ref.split(":")
            lessons = done_lessons(conn, player["id"])
            _, unlocked = module_status(bank, lessons, quiz_best_map(conn, player["id"]))
            if module_id in unlocked:
                gained += _add_lesson(conn, player["id"], module_id, int(index))
        conn.execute("UPDATE players SET guest_imported=1 WHERE id=?", (player["id"],))
        badges = evaluate_badges(conn, player["id"])
        return {"xpGained": gained, "newBadges": badges, "progress": progress_payload(conn, player["id"])}


# ── Runs: module quiz, ghost duel, speedrun, survival, daily ─

class RunStart(BaseModel):
    kind: str
    module: Optional[str] = None


class RunAnswer(BaseModel):
    index: int
    choice: int


def _elapsed_ms(run) -> int:
    return int((db.now() - db.parse_iso(run["started_at"])).total_seconds() * 1000)


def _load_run(conn, run_id: str, request: Request):
    run = conn.execute("SELECT * FROM runs WHERE id=?", (run_id,)).fetchone()
    if not run:
        api_error(404, "unknown_run", "Partie introuvable.")
    if run["player_id"] is not None:
        player = optional_player(conn, request)
        if not player or player["id"] != run["player_id"]:
            api_error(403, "not_your_run", "Cette partie appartient à un autre joueur.")
    return run


@router.post("/runs")
def start_run(body: RunStart, request: Request):
    bank = get_bank()
    if body.kind not in RUN_KINDS:
        api_error(400, "unknown_kind", "Mode de jeu inconnu.")
    with db.get_db() as conn:
        player = optional_player(conn, request)
        player_id = player["id"] if player else None
        ref, meta, ghost = None, None, None
        if body.kind in QUIZ_KINDS:
            module = bank.module(body.module or "")
            if not module:
                api_error(404, "unknown_module", "Module inconnu.")
            if player:
                _require_unlocked(conn, player_id, module["id"])
            qids = [q["id"] for q in module["quiz"]]
            ref = module["id"]
            if body.kind == "ghost":
                ghost = leaderboard.find_ghost(conn, module["id"], player_id)
                if not ghost:
                    api_error(404, "no_ghost", "Aucun fantôme à affronter sur ce module pour l'instant.")
                meta = json.dumps({"ghost": ghost})
        elif body.kind == "daily":
            ref = today()
            pool = sorted(bank.all_question_ids())
            qids = random.Random(int(ref.replace("-", ""))).sample(pool, min(DAILY_SIZE, len(pool)))
            if player:
                cur = conn.execute(
                    "INSERT OR IGNORE INTO xp_events(player_id, kind, ref, xp, created_at) VALUES(?,?,?,0,?)",
                    (player_id, "daily", ref, db.iso(db.now())),
                )
                if not cur.rowcount:
                    api_error(409, "daily_done", "Tu as déjà fait le défi du jour. Reviens demain !")
        else:
            qids = bank.all_question_ids()
            random.Random(secrets.randbits(64)).shuffle(qids)
        run_id = secrets.token_urlsafe(16)
        lives = SURVIVAL_LIVES if body.kind == "survival" else None
        conn.execute(
            "INSERT INTO runs(id, player_id, kind, ref, questions, lives, started_at, meta) VALUES(?,?,?,?,?,?,?,?)",
            (run_id, player_id, body.kind, ref, json.dumps(qids), lives, db.iso(db.now()), meta),
        )
        return {
            "runId": run_id,
            "kind": body.kind,
            "module": ref if body.kind in QUIZ_KINDS else None,
            "questions": [bank.public_question(q) for q in qids],
            "durationMs": SPEEDRUN_MS if body.kind == "speedrun" else None,
            "lives": lives,
            "ghost": ghost,
        }


@router.post("/runs/{run_id}/answer")
def answer_run(run_id: str, body: RunAnswer, request: Request):
    bank = get_bank()
    with db.get_db() as conn:
        run = _load_run(conn, run_id, request)
        if run["status"] != "running":
            api_error(409, "run_over", "Cette partie est terminée.")
        questions = json.loads(run["questions"])
        answers = json.loads(run["answers"])
        if body.index != len(answers):
            api_error(409, "out_of_order", "Réponse inattendue : recharge la partie.")
        if run["kind"] in FIXED_KINDS and body.index >= len(questions):
            api_error(409, "run_over", "Toutes les questions ont déjà une réponse.")
        elapsed = _elapsed_ms(run)
        if run["kind"] == "speedrun" and elapsed > SPEEDRUN_MS + GRACE_MS:
            return {"expired": True, "finished": True, "score": run["score"], "lives": None,
                    "streak": run["streak"], "correct": None, "correctIndex": None, "explanation": None}
        q = bank.questions.get(questions[body.index % len(questions)])
        if not q:
            api_error(410, "question_gone", "Cette question n'existe plus. Lance une nouvelle partie.")
        flag = run["flag_reason"]
        previous = answers[-1]["t"] if answers else 0
        if elapsed - previous < MIN_ANSWER_MS:
            flag = flag or "too_fast"
        correct = body.choice == q["correct"]
        score, streak, lives = run["score"], run["streak"], run["lives"]
        if correct:
            score += 1
            streak += 1
            if run["kind"] in ARCADE_KINDS and streak % STREAK_BONUS_EVERY == 0:
                score += 1
        else:
            streak = 0
            if run["kind"] == "survival":
                lives -= 1
        answers.append({"i": body.index, "c": body.choice, "ok": correct, "t": elapsed})
        finished = (run["kind"] == "survival" and lives <= 0) or (
            run["kind"] in FIXED_KINDS and len(answers) >= len(questions))
        conn.execute(
            "UPDATE runs SET answers=?, score=?, streak=?, best_streak=MAX(best_streak, ?), lives=?, flag_reason=? WHERE id=?",
            (json.dumps(answers), score, streak, streak, lives, flag, run_id),
        )
        return {"correct": correct, "correctIndex": q["correct"], "explanation": q["explanation"],
                "score": score, "streak": streak, "lives": lives, "finished": finished,
                "elapsedMs": elapsed, "expired": False}


def _quiz_xp(score: int, total: int) -> int:
    return score * XP_CORRECT + (XP_PERFECT if total and score >= total else 0)


def _reward(conn, run, answers, duration):
    kind, player_id = run["kind"], run["player_id"]
    questions = json.loads(run["questions"])
    out = {"xpGained": 0, "record": False, "personalBest": False}
    now = db.iso(db.now())
    if kind in QUIZ_KINDS:
        module_id = run["ref"]
        total = len(questions)
        correct = sum(1 for a in answers if a["ok"])
        perfect = correct == total and len(answers) == total
        prev = conn.execute("SELECT * FROM quiz_best WHERE player_id=? AND module_id=?",
                            (player_id, module_id)).fetchone()
        prev_xp = _quiz_xp(min(prev["best_score"], total), total) if prev else 0
        gain = max(0, _quiz_xp(correct, total) - prev_xp)
        if gain:
            conn.execute("INSERT INTO xp_events(player_id, kind, ref, xp, created_at) VALUES(?,?,?,?,?)",
                         (player_id, "quiz", run["id"], gain, now))
        record_before = conn.execute(
            "SELECT MIN(perfect_time_ms) FROM quiz_best WHERE module_id=? AND perfect_time_ms IS NOT NULL",
            (module_id,)).fetchone()[0]
        if prev is None:
            conn.execute(
                "INSERT INTO quiz_best(player_id, module_id, best_score, total, best_time_ms, perfect_time_ms, updated_at)"
                " VALUES(?,?,?,?,?,?,?)",
                (player_id, module_id, correct, total, duration, duration if perfect else None, now))
            out["personalBest"] = True
        else:
            better = correct > prev["best_score"] or (
                correct == prev["best_score"] and (prev["best_time_ms"] is None or duration < prev["best_time_ms"]))
            best_score = max(prev["best_score"], correct)
            best_time = duration if better else prev["best_time_ms"]
            perfect_time = prev["perfect_time_ms"]
            if perfect and (perfect_time is None or duration < perfect_time):
                perfect_time = duration
            conn.execute(
                "UPDATE quiz_best SET best_score=?, total=?, best_time_ms=?, perfect_time_ms=?, updated_at=?"
                " WHERE player_id=? AND module_id=?",
                (best_score, total, best_time, perfect_time, now, player_id, module_id))
            out["personalBest"] = better
        out["record"] = perfect and (record_before is None or duration < record_before)
        if kind == "ghost":
            ghost = json.loads(run["meta"] or "{}").get("ghost") or {}
            out["ghostWon"] = perfect and duration < ghost.get("durationMs", 0)
            out["ghost"] = ghost
        out["xpGained"] = gain
    elif kind in ARCADE_KINDS:
        best_before = conn.execute(
            "SELECT COALESCE(MAX(score),0) FROM runs WHERE kind=? AND status='done' AND id<>?",
            (kind, run["id"])).fetchone()[0]
        mine_before = conn.execute(
            "SELECT COALESCE(MAX(score),0) FROM runs WHERE kind=? AND status='done' AND player_id=? AND id<>?",
            (kind, player_id, run["id"])).fetchone()[0]
        used = conn.execute(
            "SELECT COALESCE(SUM(xp),0) FROM xp_events WHERE player_id=? AND kind='arcade' AND created_at>=?",
            (player_id, db.iso(db.day_start(db.now())))).fetchone()[0]
        gain = min(run["score"] * ARCADE_XP_PER_POINT, max(0, ARCADE_DAILY_CAP - used))
        if gain:
            conn.execute("INSERT INTO xp_events(player_id, kind, ref, xp, created_at) VALUES(?,?,?,?,?)",
                         (player_id, "arcade", run["id"], gain, now))
        out.update(xpGained=gain, record=run["score"] > best_before and run["score"] > 0,
                   personalBest=run["score"] > mine_before, capReached=used + gain >= ARCADE_DAILY_CAP)
    elif kind == "daily":
        gain = run["score"] * XP_CORRECT + (DAILY_BONUS if len(answers) >= len(questions) else 0)
        conn.execute("UPDATE xp_events SET xp=?, created_at=? WHERE player_id=? AND kind='daily' AND ref=?",
                     (gain, now, player_id, run["ref"]))
        out["xpGained"] = gain
    return out


@router.post("/runs/{run_id}/finish")
def finish_run(run_id: str, request: Request):
    with db.get_db() as conn:
        run = _load_run(conn, run_id, request)
        if run["summary"]:
            summary = json.loads(run["summary"])
        else:
            answers = json.loads(run["answers"])
            questions = json.loads(run["questions"])
            duration = answers[-1]["t"] if answers else _elapsed_ms(run)
            if run["kind"] == "speedrun":
                duration = min(duration, SPEEDRUN_MS)
            status = "flagged" if run["flag_reason"] else "done"
            summary = {
                "runId": run_id, "kind": run["kind"], "module": run["ref"] if run["kind"] in QUIZ_KINDS else None,
                "score": run["score"], "answered": len(answers),
                "total": len(questions) if run["kind"] in FIXED_KINDS else None,
                "correct": sum(1 for a in answers if a["ok"]),
                "durationMs": duration, "bestStreak": run["best_streak"],
                "xpGained": 0, "newBadges": [], "record": False, "personalBest": False,
                "flagged": status == "flagged",
            }
            # The status must be written first: badges and records read finished runs.
            conn.execute("UPDATE runs SET status=?, finished_at=?, duration_ms=? WHERE id=?",
                         (status, db.iso(db.now()), duration, run_id))
            if run["player_id"] is not None and status == "done":
                summary.update(_reward(conn, run, answers, duration))
                summary["newBadges"] = evaluate_badges(conn, run["player_id"])
            conn.execute("UPDATE runs SET summary=? WHERE id=?", (json.dumps(summary), run_id))
        if run["player_id"] is not None:
            summary = {**summary, "progress": progress_payload(conn, run["player_id"])}
        return summary
