#!/usr/bin/env python3
"""Start every app backend in-process and exercise it like EZGalaxy does.

  pip install -r tools/requirements-test.txt
  python tools/smoke_test.py            # all apps
  python tools/smoke_test.py habits     # apps whose id contains "habits"

Each app runs in its own Python process (apps share module names), with a
temporary database and its web/ folder as static root, as in the Docker image.
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PROBE = r'''
import json, os
from fastapi.testclient import TestClient
import main

client = TestClient(main.app)
errors = []
def check(cond, msg):
    if not cond:
        errors.append(msg)

health = client.get(os.environ["HEALTH"])
check(health.status_code == 200, f"health {os.environ['HEALTH']} returned {health.status_code}")

index = client.get("/")
check(index.status_code == 200 and "<html" in index.text.lower(), f"/ returned {index.status_code}, not the web app")

sdk = client.get("/api/ezgalaxy-sdk.js")
if sdk.status_code == 200:
    check("document.currentScript" in sdk.text, "SDK does not handle the /p/<slug>/ prefix")
    put = client.put("/api/app-storage/smoke/k1", json={"data": {"n": 1}})
    check(put.status_code == 200, f"storage write returned {put.status_code}")
    got = client.get("/api/app-storage/smoke/k1")
    check(got.status_code == 200 and (got.json() or {}).get("data") == {"n": 1}, "storage read did not return the written record")
    listed = client.get("/api/app-storage/smoke?limit=10")
    check(listed.status_code == 200 and listed.json().get("total") == 1, "storage list is wrong")
    check(client.delete("/api/app-storage/smoke/k1").status_code == 200, "storage delete failed")

print(json.dumps({"errors": errors}))
'''


def apps(filter_text: str = ""):
    catalog = json.loads((ROOT / "catalog.json").read_text(encoding="utf-8-sig"))
    for pkg in catalog["packages"]:
        if filter_text in pkg["id"]:
            yield pkg, ROOT / pkg["path"]


def run_app(pkg_dir: Path, health: str) -> list:
    with tempfile.TemporaryDirectory() as tmp:
        env = {
            **os.environ,
            "DB_PATH": str(Path(tmp) / "database.sqlite"),
            "STATIC_DIR": str(pkg_dir / "web"),
            "HEALTH": health,
            "PYTHONDONTWRITEBYTECODE": "1",
        }
        proc = subprocess.run([sys.executable, "-c", PROBE], cwd=pkg_dir / "backend", env=env,
                              capture_output=True, text=True, encoding="utf-8", timeout=120)
    if proc.returncode != 0:
        tail = (proc.stderr or proc.stdout).strip().splitlines()[-3:]
        return ["crashed: " + " | ".join(tail)]
    return json.loads(proc.stdout.strip().splitlines()[-1])["errors"]


def main() -> int:
    filter_text = sys.argv[1] if len(sys.argv) > 1 else ""
    failed = 0
    for pkg, pkg_dir in apps(filter_text):
        if not (pkg_dir / "backend" / "main.py").is_file():
            print(f"SKIP {pkg['id']} (no Python backend)")
            continue
        manifest = json.loads((pkg_dir / "ezcontainer.json").read_text(encoding="utf-8-sig"))
        health = ((manifest.get("docker") or {}).get("healthcheck") or {}).get("endpoint") or "/"
        errors = run_app(pkg_dir, health)
        if errors:
            failed += 1
            print(f"FAIL {pkg['id']}")
            for e in errors:
                print(f"     {e}")
        else:
            print(f"OK   {pkg['id']}")
    print(f"{failed} app(s) failing")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
