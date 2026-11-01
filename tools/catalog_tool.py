#!/usr/bin/env python3
"""Catalog maintenance: keep apps consistent, versioned and deployable.

  python tools/catalog_tool.py sync                 # shared backend, pins, VERSION files, catalog.json
  python tools/catalog_tool.py validate             # fail on any inconsistency (used by CI)
  python tools/catalog_tool.py bump <id> [minor]    # bump one app (patch, minor or major)
  python tools/catalog_tool.py check-bumps <ref>    # every app changed since <ref> must have a new version

EZGalaxy detects updates from the content of each package folder, and shows the
version number to the admin: bump the version whenever an app changes.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "catalog.json"
SHARED_BACKEND = ROOT / "shared" / "app-backend" / "main.py"
PINS = {"fastapi": "0.162.0", "uvicorn[standard]": "0.54.0"}
TEMPLATE_MARKERS = ("Storage API + React SPA serving", "Storage API + SPA serving")
SEMVER = re.compile(r"^\d+\.\d+\.\d+$")


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def packages():
    for pkg in load_json(CATALOG)["packages"]:
        yield pkg, ROOT / pkg["path"]


def manifest(pkg_dir: Path) -> dict:
    return load_json(pkg_dir / "ezcontainer.json")


def is_template_backend(main_py: Path) -> bool:
    if not main_py.is_file():
        return False
    first = main_py.read_text(encoding="utf-8").splitlines()[0]
    return any(marker in first for marker in TEMPLATE_MARKERS)


def shared_sdk_line() -> str:
    return next(line for line in SHARED_BACKEND.read_text(encoding="utf-8").splitlines() if line.startswith("SDK_JS = "))


def add_base_prefix(sdk_line: str, shared_sdk: str) -> str:
    """Make a custom SDK call B+'/api/…' where B is computed like in the shared SDK."""
    base = re.search(r"var B=.*?B=m\?m\[0\]:'';\}", shared_sdk).group(0)
    line = sdk_line.replace("'use strict';", "'use strict';" + base, 1)
    return re.sub(r"(?<![\w+])'/api/", "B+'/api/", line)


def pin_requirements(text: str) -> str:
    out = []
    for line in text.splitlines():
        name = re.split(r"[=<>~!]", line.strip(), 1)[0].strip()
        out.append(f"{name}=={PINS[name]}" if name in PINS else line)
    return "\n".join(out) + "\n"


def bump_version(version: str, level: str = "minor") -> str:
    major, minor, patch = (int(x) for x in version.split("."))
    if level == "major":
        return f"{major + 1}.0.0"
    if level == "patch":
        return f"{major}.{minor}.{patch + 1}"
    return f"{major}.{minor + 1}.0"


def set_version(pkg_id: str, version: str) -> None:
    for pkg, pkg_dir in packages():
        if pkg["id"] == pkg_id:
            data = manifest(pkg_dir)
            data["version"] = version
            write_json(pkg_dir / "ezcontainer.json", data)
            return
    raise SystemExit(f"Unknown app: {pkg_id}")


def cmd_sync() -> int:
    shared = SHARED_BACKEND.read_text(encoding="utf-8")
    sdk = shared_sdk_line()
    catalog = load_json(CATALOG)
    for pkg in catalog["packages"]:
        pkg_dir = ROOT / pkg["path"]
        backend = pkg_dir / "backend"
        main_py = backend / "main.py"
        if is_template_backend(main_py):
            main_py.write_text(shared, encoding="utf-8")
        elif main_py.is_file():
            # Custom backends keep their own SDK; only prefix its API calls with the app folder
            text = main_py.read_text(encoding="utf-8")
            if "SDK_JS = " in text and "document.currentScript" not in text:
                text = re.sub(r"^SDK_JS = .*$", lambda m: add_base_prefix(m.group(0), sdk), text, count=1, flags=re.M)
                main_py.write_text(text, encoding="utf-8")
        req = backend / "requirements.txt"
        if req.is_file():
            req.write_text(pin_requirements(req.read_text(encoding="utf-8")), encoding="utf-8")
        version = manifest(pkg_dir)["version"]
        if backend.is_dir():
            (backend / "VERSION").write_text(version + "\n", encoding="utf-8")
        pkg["version"] = version
    write_json(CATALOG, catalog)
    print("Catalog synced")
    return 0


def cmd_validate() -> int:
    errors = []
    shared = SHARED_BACKEND.read_text(encoding="utf-8")
    seen = set()
    for pkg, pkg_dir in packages():
        pid = pkg["id"]
        err = lambda msg: errors.append(f"{pid}: {msg}")
        if pid in seen:
            err("duplicate id")
        seen.add(pid)
        if pkg_dir.name != pid:
            err(f"folder name {pkg_dir.name} differs from id")
        try:
            man = manifest(pkg_dir)
        except Exception as exc:
            err(f"ezcontainer.json unreadable: {exc}")
            continue
        version = man.get("version", "")
        if man.get("id") != pid:
            err(f"manifest id is {man.get('id')}")
        if not SEMVER.match(version):
            err(f"version {version!r} is not x.y.z")
        if pkg.get("version") != version:
            err(f"catalog.json version {pkg.get('version')} differs from manifest {version} (run sync)")
        docker = man.get("docker") or {}
        dockerfile = pkg_dir / docker.get("dockerfile", "Dockerfile")
        if not dockerfile.is_file():
            err("Dockerfile missing")
        else:
            text = dockerfile.read_text(encoding="utf-8", errors="replace")
            if f"EXPOSE {docker.get('port')}" not in text:
                err(f"Dockerfile does not EXPOSE manifest port {docker.get('port')}")
            for src in re.findall(r"^COPY\s+(?!--)(\S+)", text, re.M):
                if not (pkg_dir / src.rstrip("/")).exists():
                    err(f"Dockerfile copies missing path {src}")
        if not (docker.get("healthcheck") or {}).get("endpoint"):
            err("no healthcheck endpoint")
        backend = pkg_dir / "backend"
        req = backend / "requirements.txt"
        if req.is_file():
            text = req.read_text(encoding="utf-8")
            for line in text.split():
                if line and not line.startswith("#") and "==" not in line:
                    err(f"unpinned dependency {line}")
            if pin_requirements(text) != text:
                err("fastapi/uvicorn pins out of date (run sync)")
        if backend.is_dir():
            vf = backend / "VERSION"
            if not vf.is_file() or vf.read_text(encoding="utf-8").strip() != version:
                err("backend/VERSION missing or out of date (run sync)")
        main_py = backend / "main.py"
        if main_py.is_file():
            code = main_py.read_text(encoding="utf-8")
            if is_template_backend(main_py) and code != shared:
                err("backend/main.py differs from shared/app-backend/main.py (run sync)")
            if "SDK_JS = " in code and "document.currentScript" not in code:
                err("SDK ignores the /p/<slug>/ prefix (run sync)")
    for line in errors:
        print("ERROR", line)
    print(f"{len(seen)} apps checked, {len(errors)} error(s)")
    return 1 if errors else 0


def cmd_bump(pkg_id: str, level: str = "minor") -> int:
    for pkg, pkg_dir in packages():
        if pkg["id"] == pkg_id:
            new = bump_version(manifest(pkg_dir)["version"], level)
            set_version(pkg_id, new)
            print(f"{pkg_id} -> {new}")
            return cmd_sync()
    raise SystemExit(f"Unknown app: {pkg_id}")


def cmd_check_bumps(base: str) -> int:
    changed = subprocess.run(["git", "diff", "--name-only", f"{base}...HEAD"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split()
    missing = []
    for pkg, pkg_dir in packages():
        prefix = pkg["path"].rstrip("/") + "/"
        if not any(path.startswith(prefix) for path in changed):
            continue
        old = subprocess.run(["git", "show", f"{base}:{prefix}ezcontainer.json"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
        if old.returncode != 0:
            continue  # new app
        old_version = json.loads(old.stdout.lstrip("﻿")).get("version")
        if old_version == manifest(pkg_dir)["version"]:
            missing.append(f"{pkg['id']} changed but is still {old_version} (python tools/catalog_tool.py bump {pkg['id']})")
    for line in missing:
        print("ERROR", line)
    return 1 if missing else 0


def main(argv) -> int:
    if not argv:
        print(__doc__)
        return 1
    cmd, args = argv[0], argv[1:]
    if cmd == "sync":
        return cmd_sync()
    if cmd == "validate":
        return cmd_validate()
    if cmd == "bump" and args:
        return cmd_bump(*args[:2])
    if cmd == "check-bumps" and args:
        return cmd_check_bumps(args[0])
    print(__doc__)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
