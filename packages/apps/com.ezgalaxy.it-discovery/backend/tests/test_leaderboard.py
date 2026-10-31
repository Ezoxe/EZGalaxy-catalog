def lesson(client, headers, module, index):
    return client.post("/api/v2/events/lesson", json={"module": module, "lesson": index}, headers=headers)


def test_season_ranking_and_me(client, register):
    alice = register("Alice")
    bob = register("Bobby")
    lesson(client, alice, "m1", 0)
    lesson(client, alice, "m1", 1)
    lesson(client, bob, "m1", 0)
    board = client.get("/api/v2/leaderboard/season", headers=bob).json()
    assert [e["pseudo"] for e in board["entries"]] == ["Alice", "Bobby"]
    assert board["me"] == {"rank": 2, "xp": 10}
    assert board["entries"][1]["me"] is True and "playerId" not in board["entries"][0]


def test_ties_broken_by_quiz_time(client, register, play):
    slow = register("Slowpoke")
    fast = register("Speedy")
    play(slow, "quiz", "m3", step_seconds=9)
    play(fast, "quiz", "m3", step_seconds=2)
    board = client.get("/api/v2/leaderboard/season").json()
    assert [e["pseudo"] for e in board["entries"]] == ["Speedy", "Slowpoke"]


def test_month_change_closes_season_into_hall_of_fame(client, register, clock):
    alice = register("Alice")
    lesson(client, alice, "m1", 0)
    assert client.get("/api/v2/leaderboard/hall-of-fame").json()["seasons"] == []
    clock.set(2026, 11, 2, 9, 0, 0)
    hall = client.get("/api/v2/leaderboard/hall-of-fame").json()["seasons"]
    assert hall[0]["podium"] == [{"pseudo": "Alice", "xp": 10}]
    assert hall[0]["endsAt"].startswith("2026-11-01T00:00:00")
    board = client.get("/api/v2/leaderboard/season").json()
    assert board["entries"] == [] and board["season"]["startsAt"].startswith("2026-11-01")


def test_deleted_players_are_hidden(client, register):
    alice = register("Alice")
    lesson(client, alice, "m1", 0)
    token = client.post("/api/v2/admin/login", json={"code": "tuteur-secret"}).json()["token"]
    client.delete("/api/v2/admin/players/1", headers={"Authorization": f"Bearer {token}"})
    assert client.get("/api/v2/leaderboard/season").json()["entries"] == []


def test_records(client, register, play):
    alice = register("Alice")
    play(alice, "quiz", "m3")
    records = {r["mode"]: r for r in client.get("/api/v2/leaderboard/records", headers=alice).json()["records"]}
    assert records["quiz:m3"]["holder"] == "Alice" and records["quiz:m3"]["mine"] == 1000
    assert records["speedrun"]["value"] is None


def test_ghost_is_next_time_to_beat(client, register, play):
    a = register("Alice")
    b = register("Bobby")
    c = register("Carla")
    play(a, "quiz", "m3", step_seconds=3)
    play(b, "quiz", "m3", step_seconds=6)
    assert client.get("/api/v2/ghost/m3", headers=c).json()["ghost"]["pseudo"] == "Bobby"
    assert client.get("/api/v2/ghost/m3", headers=b).json()["ghost"]["pseudo"] == "Alice"
    assert client.get("/api/v2/ghost/m3", headers=a).json()["ghost"] is None
    run, summary = play(c, "ghost", "m3", step_seconds=4)
    assert run["ghost"]["pseudo"] == "Bobby" and summary["ghostWon"] is True
