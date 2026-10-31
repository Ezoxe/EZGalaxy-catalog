def code(res):
    return res.json()["detail"]["code"]


def admin(client):
    token = client.post("/api/v2/admin/login", json={"code": "tuteur-secret"}).json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_disabled_without_code(client, monkeypatch):
    monkeypatch.delenv("ADMIN_CODE")
    assert code(client.post("/api/v2/admin/login", json={"code": "x"})) == "admin_disabled"


def test_admin_bad_code_locks(client):
    for left in (2, 1):
        res = client.post("/api/v2/admin/login", json={"code": "nope"})
        assert res.json()["detail"]["triesLeft"] == left
    assert client.post("/api/v2/admin/login", json={"code": "nope"}).status_code == 429
    assert client.post("/api/v2/admin/login", json={"code": "tuteur-secret"}).status_code == 429


def test_player_token_is_not_admin(client, register):
    headers = register()
    assert code(client.get("/api/v2/admin/overview", headers=headers)) == "admin_required"


def test_reset_pin_forces_change(client, register):
    old = register("Neo42", "2580")
    headers = admin(client)
    overview = client.get("/api/v2/admin/overview", headers=headers).json()
    assert overview["stats"]["players"] == 1
    pin = client.post("/api/v2/admin/players/1/reset-pin", headers=headers).json()["pin"]
    assert client.get("/api/v2/me", headers=old).status_code == 401
    login = client.post("/api/v2/auth/login", json={"pseudo": "Neo42", "pin": pin}).json()
    assert login["player"]["mustChangePin"] is True
    player = {"Authorization": f"Bearer {login['token']}"}
    changed = client.post("/api/v2/me/pin", json={"newPin": "9999"}, headers=player).json()
    assert changed["player"]["mustChangePin"] is False


def test_rename_delete_frees_pseudo_and_export(client, register):
    register("Neo42")
    headers = admin(client)
    assert client.post("/api/v2/admin/players/1/rename", json={"pseudo": "Trinity"}, headers=headers).status_code == 200
    csv = client.get("/api/v2/admin/export.csv", headers=headers).text
    assert "Trinity" in csv
    client.delete("/api/v2/admin/players/1", headers=headers)
    assert client.post("/api/v2/auth/register", json={"pseudo": "trinity", "pin": "1111"}).status_code == 200


def test_close_season_now(client, register, clock):
    alice = register("Alice")
    client.post("/api/v2/events/lesson", json={"module": "m1", "lesson": 0}, headers=alice)
    clock.advance(seconds=1)
    client.post("/api/v2/admin/seasons/close", headers=admin(client))
    hall = client.get("/api/v2/leaderboard/hall-of-fame").json()["seasons"]
    assert hall[0]["podium"][0]["pseudo"] == "Alice"
