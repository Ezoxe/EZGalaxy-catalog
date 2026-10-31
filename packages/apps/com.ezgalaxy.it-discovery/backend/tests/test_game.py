def code(res):
    return res.json()["detail"]["code"]


def progress(client, headers):
    return client.get("/api/v2/me/progress", headers=headers).json()


def test_lesson_counted_once(client, register):
    headers = register()
    first = client.post("/api/v2/events/lesson", json={"module": "m1", "lesson": 0}, headers=headers).json()
    again = client.post("/api/v2/events/lesson", json={"module": "m1", "lesson": 0}, headers=headers).json()
    assert first["xpGained"] == 10 and again["xpGained"] == 0
    assert "first-step" in first["newBadges"]
    assert progress(client, headers)["xp"] == 10


def test_lesson_requires_account_and_valid_ref(client, register):
    assert client.post("/api/v2/events/lesson", json={"module": "m1", "lesson": 0}).status_code == 401
    headers = register()
    assert code(client.post("/api/v2/events/lesson", json={"module": "zz", "lesson": 0}, headers=headers)) == "unknown_module"
    assert code(client.post("/api/v2/events/lesson", json={"module": "m1", "lesson": 9}, headers=headers)) == "unknown_lesson"


def test_locked_module_refused_until_requirements_done(client, register, play):
    headers = register()
    res = client.post("/api/v2/events/lesson", json={"module": "m2", "lesson": 0}, headers=headers)
    assert res.status_code == 403 and code(res) == "module_locked"
    assert client.post("/api/v2/runs", json={"kind": "quiz", "module": "m2"}, headers=headers).status_code == 403
    for i in range(2):
        client.post("/api/v2/events/lesson", json={"module": "m1", "lesson": i}, headers=headers)
    play(headers, "quiz", "m1", choices=[0, 0])
    assert client.post("/api/v2/events/lesson", json={"module": "m2", "lesson": 0}, headers=headers).status_code == 200
    p = progress(client, headers)
    assert "m1" in p["completed"] and "m2" in p["unlocked"]
    assert "m1-badge" in p["badges"] and "tier-2-unlocked" in p["badges"]


def test_quiz_is_scored_by_server_and_only_improvement_pays(client, register, play):
    headers = register()
    _, half = play(headers, "quiz", "m1", choices=[1, 1])
    assert half["correct"] == 1 and half["xpGained"] == 5
    _, worse = play(headers, "quiz", "m1", choices=[0, 1])
    assert worse["xpGained"] == 0
    _, perfect = play(headers, "quiz", "m1")
    assert perfect["correct"] == 2 and perfect["xpGained"] == 2 * 5 + 20 - 5
    assert perfect["record"] is True
    assert progress(client, headers)["quizBest"]["m1"]["score"] == 2


def test_answers_must_be_sequential_and_run_closes(client, register, clock):
    headers = register()
    run = client.post("/api/v2/runs", json={"kind": "quiz", "module": "m1"}, headers=headers).json()
    assert "correct" not in run["questions"][0]
    assert code(client.post(f"/api/v2/runs/{run['runId']}/answer", json={"index": 1, "choice": 0}, headers=headers)) == "out_of_order"
    clock.advance(seconds=1)
    client.post(f"/api/v2/runs/{run['runId']}/answer", json={"index": 0, "choice": 1}, headers=headers)
    clock.advance(seconds=1)
    last = client.post(f"/api/v2/runs/{run['runId']}/answer", json={"index": 1, "choice": 0}, headers=headers).json()
    assert last["finished"] is True
    first = client.post(f"/api/v2/runs/{run['runId']}/finish", headers=headers).json()
    second = client.post(f"/api/v2/runs/{run['runId']}/finish", headers=headers).json()
    assert first["xpGained"] == 30 and second["xpGained"] == 30
    assert progress(client, headers)["xp"] == 30
    assert code(client.post(f"/api/v2/runs/{run['runId']}/answer", json={"index": 2, "choice": 0}, headers=headers)) == "run_over"


def test_run_belongs_to_its_player(client, register):
    alice = register("Alice")
    bob = register("Bobby")
    run = client.post("/api/v2/runs", json={"kind": "quiz", "module": "m1"}, headers=alice).json()
    res = client.post(f"/api/v2/runs/{run['runId']}/answer", json={"index": 0, "choice": 1}, headers=bob)
    assert res.status_code == 403


def test_too_fast_answers_flag_the_run(client, register, play):
    headers = register()
    _, summary = play(headers, "quiz", "m1", step_seconds=0)
    assert summary["flagged"] is True and summary["xpGained"] == 0
    assert progress(client, headers)["xp"] == 0


def test_speedrun_expires_and_arcade_xp_is_capped(client, register, clock, play):
    headers = register()
    run = client.post("/api/v2/runs", json={"kind": "speedrun"}, headers=headers).json()
    assert run["durationMs"] == 60000
    clock.advance(seconds=62)
    late = client.post(f"/api/v2/runs/{run['runId']}/answer", json={"index": 0, "choice": 0}, headers=headers).json()
    assert late["expired"] is True
    import game
    import db
    with db.get_db() as conn:
        conn.execute("INSERT INTO xp_events(player_id, kind, ref, xp, created_at) VALUES(1,'arcade','x',145,?)",
                     (db.iso(db.now()),))
    _, summary = play(headers, "survival")
    assert summary["xpGained"] <= game.ARCADE_DAILY_CAP - 145


def test_survival_ends_after_three_mistakes(client, register, play):
    headers = register()
    run, summary = play(headers, "survival", choices=[9] * 10)
    assert summary["answered"] == 3 and summary["score"] == 0


def test_daily_only_once_per_day(client, register, clock, play):
    headers = register()
    _, summary = play(headers, "daily")
    assert summary["xpGained"] == 5 * summary["total"] + 10
    assert code(client.post("/api/v2/runs", json={"kind": "daily"}, headers=headers)) == "daily_done"
    clock.advance(days=1)
    assert client.post("/api/v2/runs", json={"kind": "daily"}, headers=headers).status_code == 200


def test_guest_can_play_but_earns_nothing(client):
    run = client.post("/api/v2/runs", json={"kind": "quiz", "module": "m1"}).json()
    out = client.post(f"/api/v2/runs/{run['runId']}/answer", json={"index": 0, "choice": 1}).json()
    assert out["correct"] is True and out["explanation"] == "E0"


def test_scene_quiz_first_try_only(client, register):
    headers = register()
    wrong = client.post("/api/v2/events/scene-quiz", json={"scene": "s1", "choice": 0}, headers=headers).json()
    retry = client.post("/api/v2/events/scene-quiz", json={"scene": "s1", "choice": 1}, headers=headers).json()
    assert wrong["correct"] is False and wrong["xpGained"] == 0
    assert retry["correct"] is True and retry["xpGained"] == 0 and retry["firstTry"] is False


def test_guest_import_happens_once(client, register):
    headers = register()
    res = client.post("/api/v2/me/import-guest", json={"lessons": ["m1:0", "m1:1", "m2:0", "zz:1"]}, headers=headers).json()
    assert res["xpGained"] == 20
    again = client.post("/api/v2/me/import-guest", json={"lessons": ["m3:0"]}, headers=headers).json()
    assert again["xpGained"] == 0
