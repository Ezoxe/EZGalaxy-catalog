"""EZGalaxy FastAPI Backend — Storage API + Auth + React SPA serving."""
import os, json, sqlite3, logging, hashlib, secrets
from datetime import datetime, timezone
from pathlib import Path
from contextlib import contextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse, JSONResponse, Response

app = FastAPI(title="EZGalaxy App")
DB_PATH = os.environ.get("DB_PATH", "/app/data/database.sqlite")
STATIC_DIR = os.path.realpath(os.environ.get("STATIC_DIR", "/app/static"))
MAX_KEY_LENGTH = 256
MAX_COLLECTION_LENGTH = 128
MAX_BODY_SIZE = 1_048_576  # 1 MB

logger = logging.getLogger("ezgalaxy")

@contextmanager
def get_db():
    """Context manager for safe DB connection handling."""
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    try:
        with get_db() as conn:
            conn.execute("""CREATE TABLE IF NOT EXISTS storage (
                scope TEXT NOT NULL DEFAULT 'private', collection TEXT NOT NULL,
                record_key TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                PRIMARY KEY (scope, collection, record_key))""")
            conn.execute("""CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                token TEXT UNIQUE,
                created_at TEXT DEFAULT (datetime('now')))""")
            conn.commit()
    except Exception as e:
        logger.error("Failed to initialize database: %s", e)
        raise

init_db()

# ─── Auth helpers ──────────────────────────────────────────────────
def _hash_password(password: str, salt: str) -> str:
    """Hash a password with SHA-256 + salt."""
    return hashlib.sha256((salt + password).encode()).hexdigest()

def _generate_token() -> str:
    """Generate a secure random token."""
    return secrets.token_hex(32)

@app.post("/api/auth/register")
async def auth_register(request: Request):
    """Register a new user account."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON body")
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not name:
        raise HTTPException(400, detail="Le nom est requis")
    if not email or "@" not in email:
        raise HTTPException(400, detail="Email invalide")
    if len(password) < 4:
        raise HTTPException(400, detail="Le mot de passe doit faire au moins 4 caractères")
    salt = secrets.token_hex(16)
    password_hash = _hash_password(password, salt)
    token = _generate_token()
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO users (name, email, password_hash, salt, token) VALUES (?, ?, ?, ?, ?)",
                (name, email, password_hash, salt, token)
            )
            conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(409, detail="Un compte avec cet email existe déjà")
    except sqlite3.Error as e:
        logger.error("DB error in register: %s", e)
        raise HTTPException(500, "Database error")
    return {"token": token, "user": {"name": name, "email": email}}

@app.post("/api/auth/login")
async def auth_login(request: Request):
    """Authenticate a user and return a token."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON body")
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not email or not password:
        raise HTTPException(400, detail="Email et mot de passe requis")
    try:
        with get_db() as conn:
            row = conn.execute(
                "SELECT id, name, email, password_hash, salt, token FROM users WHERE email = ?",
                (email,)
            ).fetchone()
    except sqlite3.Error as e:
        logger.error("DB error in login: %s", e)
        raise HTTPException(500, "Database error")
    if not row:
        raise HTTPException(401, detail="Identifiants invalides")
    if _hash_password(password, row["salt"]) != row["password_hash"]:
        raise HTTPException(401, detail="Identifiants invalides")
    # Refresh token on each login
    new_token = _generate_token()
    try:
        with get_db() as conn:
            conn.execute("UPDATE users SET token = ? WHERE id = ?", (new_token, row["id"]))
            conn.commit()
    except sqlite3.Error as e:
        logger.error("DB error refreshing token: %s", e)
    return {"token": new_token, "user": {"name": row["name"], "email": row["email"]}}

def _validate_key(key: str, label: str = "key"):
    """Validate collection/key length and characters."""
    max_len = MAX_COLLECTION_LENGTH if label == "collection" else MAX_KEY_LENGTH
    if not key or len(key) > max_len:
        raise HTTPException(400, f'{label} must be 1-{max_len} characters')
    if '\x00' in key:
        raise HTTPException(400, f'{label} must not contain null bytes')

def _safe_json_loads(data_str: str, fallback=None):
    """Safely parse JSON, returning fallback on error."""
    try:
        return json.loads(data_str)
    except (json.JSONDecodeError, TypeError):
        return fallback

def _escape_like(s: str) -> str:
    """Escape LIKE metacharacters for SQLite."""
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

# Private storage
@app.get("/api/app-storage/{collection}")
def list_records(collection: str, request: Request):
    _validate_key(collection, "collection")
    return _list("private", collection, request)

@app.get("/api/app-storage/{collection}/{key}")
def get_record(collection: str, key: str):
    _validate_key(collection, "collection")
    _validate_key(key)
    return _get("private", collection, key)

@app.put("/api/app-storage/{collection}/{key}")
async def set_record(collection: str, key: str, request: Request):
    _validate_key(collection, "collection")
    _validate_key(key)
    body = await _parse_body(request)
    return _set("private", collection, key, body)

@app.delete("/api/app-storage/{collection}/{key}")
def delete_record(collection: str, key: str):
    _validate_key(collection, "collection")
    _validate_key(key)
    return _delete("private", collection, key)

# Shared storage
@app.get("/api/app-storage/@app/{collection}")
def list_shared(collection: str, request: Request):
    _validate_key(collection, "collection")
    return _list("shared", collection, request)

@app.get("/api/app-storage/@app/{collection}/{key}")
def get_shared(collection: str, key: str):
    _validate_key(collection, "collection")
    _validate_key(key)
    return _get("shared", collection, key)

@app.put("/api/app-storage/@app/{collection}/{key}")
async def set_shared(collection: str, key: str, request: Request):
    _validate_key(collection, "collection")
    _validate_key(key)
    body = await _parse_body(request)
    return _set("shared", collection, key, body)

@app.delete("/api/app-storage/@app/{collection}/{key}")
def delete_shared(collection: str, key: str):
    _validate_key(collection, "collection")
    _validate_key(key)
    return _delete("shared", collection, key)

async def _parse_body(request: Request):
    """Parse JSON body with size limit and type validation."""
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_SIZE:
        raise HTTPException(413, f"Request body too large (max {MAX_BODY_SIZE} bytes)")
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON body")
    if not isinstance(body, dict):
        raise HTTPException(400, "Request body must be a JSON object")
    return body

# Simple getData/setData
@app.get("/api/app-data/{scope}/{key}")
def get_simple(scope: str, key: str):
    _validate_key(key)
    s = "shared" if scope == "app" else "private"
    try:
        with get_db() as conn:
            row = conn.execute(
                "SELECT data FROM storage WHERE scope=? AND collection='_default' AND record_key=?",
                (s, key)
            ).fetchone()
    except sqlite3.Error as e:
        logger.error("DB error in get_simple: %s", e)
        raise HTTPException(500, "Database error")
    return JSONResponse(content=_safe_json_loads(row["data"]) if row else None)

@app.put("/api/app-data/{scope}/{key}")
async def set_simple(scope: str, key: str, request: Request):
    _validate_key(key)
    s = "shared" if scope == "app" else "private"
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON body")
    if isinstance(body, dict):
        data_str = json.dumps(body.get("data", body))
    else:
        data_str = json.dumps(body)
    if len(data_str) > MAX_BODY_SIZE:
        raise HTTPException(413, "Data too large")
    try:
        with get_db() as conn:
            conn.execute(
                """INSERT INTO storage (scope,collection,record_key,data,created_at,updated_at)
                VALUES(?,'_default',?,?,datetime('now'),datetime('now'))
                ON CONFLICT(scope,collection,record_key)
                DO UPDATE SET data=excluded.data,updated_at=datetime('now')""",
                (s, key, data_str)
            )
            conn.commit()
    except sqlite3.Error as e:
        logger.error("DB error in set_simple: %s", e)
        raise HTTPException(500, "Database error")
    return {"ok": True}

def _list(scope, collection, request):
    try:
        limit = min(int(request.query_params.get("limit", 50)), 200)
    except (ValueError, TypeError):
        limit = 50
    try:
        offset = max(int(request.query_params.get("offset", 0)), 0)
    except (ValueError, TypeError):
        offset = 0
    prefix = request.query_params.get("prefix")
    sort_by = "updated_at" if request.query_params.get("sort_by") == "updated_at" else "record_key"
    sort_order = "DESC" if request.query_params.get("sort_order") == "desc" else "ASC"
    try:
        with get_db() as conn:
            params = [scope, collection]
            where = "WHERE scope=? AND collection=?"
            if prefix:
                where += " AND record_key LIKE ? ESCAPE '\\'"
                params.append(_escape_like(prefix) + "%")
            total = conn.execute(f"SELECT COUNT(*) as c FROM storage {where}", params).fetchone()["c"]
            rows = conn.execute(
                f"SELECT record_key,data,created_at,updated_at FROM storage {where} ORDER BY {sort_by} {sort_order} LIMIT ? OFFSET ?",
                params + [limit, offset]
            ).fetchall()
    except sqlite3.Error as e:
        logger.error("DB error in _list: %s", e)
        raise HTTPException(500, "Database error")
    items = [{
        "record_key": r["record_key"], "data": _safe_json_loads(r["data"], {}),
        "created_at": r["created_at"], "updated_at": r["updated_at"]
    } for r in rows]
    return {"collection": collection, "total": total, "offset": offset, "limit": limit, "items": items}

def _get(scope, collection, key):
    try:
        with get_db() as conn:
            row = conn.execute(
                "SELECT record_key,data,created_at,updated_at FROM storage WHERE scope=? AND collection=? AND record_key=?",
                (scope, collection, key)
            ).fetchone()
    except sqlite3.Error as e:
        logger.error("DB error in _get: %s", e)
        raise HTTPException(500, "Database error")
    if not row:
        return JSONResponse(content=None)
    return {
        "collection": collection, "record_key": row["record_key"],
        "data": _safe_json_loads(row["data"], {}),
        "created_at": row["created_at"], "updated_at": row["updated_at"]
    }

def _set(scope, collection, key, body):
    data = body.get("data")
    if data is None:
        raise HTTPException(400, 'Missing "data" field')
    data_str = json.dumps(data)
    if len(data_str) > MAX_BODY_SIZE:
        raise HTTPException(413, "Data too large")
    try:
        with get_db() as conn:
            conn.execute(
                """INSERT INTO storage (scope,collection,record_key,data,created_at,updated_at)
                VALUES(?,?,?,?,datetime('now'),datetime('now'))
                ON CONFLICT(scope,collection,record_key)
                DO UPDATE SET data=excluded.data,updated_at=datetime('now')""",
                (scope, collection, key, data_str)
            )
            conn.commit()
    except sqlite3.Error as e:
        logger.error("DB error in _set: %s", e)
        raise HTTPException(500, "Database error")
    return {"ok": True, "record_key": key}

def _delete(scope, collection, key):
    try:
        with get_db() as conn:
            conn.execute(
                "DELETE FROM storage WHERE scope=? AND collection=? AND record_key=?",
                (scope, collection, key)
            )
            conn.commit()
    except sqlite3.Error as e:
        logger.error("DB error in _delete: %s", e)
        raise HTTPException(500, "Database error")
    return {"ok": True}

# SDK shim — with Content-Type validation to prevent cryptic JSON parse errors on HTML responses
SDK_JS = """(function(){'use strict';function bq(o){if(!o)return'';const p=new URLSearchParams();if(o.limit)p.set('limit',o.limit);if(o.offset)p.set('offset',o.offset);if(o.prefix)p.set('prefix',o.prefix);if(o.sort_by)p.set('sort_by',o.sort_by);if(o.sort_order)p.set('sort_order',o.sort_order);const s=p.toString();return s?'?'+s:'';}function ck(r){const ct=r.headers.get('content-type')||'';if(!ct.includes('application/json')){const txt=ct.includes('text/html')?'Le serveur a renvoyé une page HTML au lieu de JSON. Vérifiez que le backend est bien démarré.':'Réponse inattendue du serveur ('+ct+')';throw new Error(txt);}return r.json();}async function ag(u){const r=await fetch(u);if(!r.ok){let msg='API error: '+r.status;try{const e=await r.json();if(e&&e.detail)msg=e.detail;}catch(_){}throw new Error(msg);}return ck(r);}async function ap(u,d){const r=await fetch(u,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:d})});if(!r.ok){let msg='API error: '+r.status;try{const e=await r.json();if(e&&e.detail)msg=e.detail;}catch(_){}throw new Error(msg);}return ck(r);}async function ad(u){const r=await fetch(u,{method:'DELETE'});if(!r.ok){let msg='API error: '+r.status;try{const e=await r.json();if(e&&e.detail)msg=e.detail;}catch(_){}throw new Error(msg);}return ck(r);}function ns(pfx){return{async get(c,k){return ag('/api/app-storage/'+pfx+encodeURIComponent(c)+'/'+encodeURIComponent(k));},async set(c,k,d){return ap('/api/app-storage/'+pfx+encodeURIComponent(c)+'/'+encodeURIComponent(k),d);},async delete(c,k){return ad('/api/app-storage/'+pfx+encodeURIComponent(c)+'/'+encodeURIComponent(k));},async list(c,o){return ag('/api/app-storage/'+pfx+encodeURIComponent(c)+bq(o));},async getData(k){const s=pfx==='@app/'?'app':'private';return ag('/api/app-data/'+s+'/'+encodeURIComponent(k));},async setData(k,v){const s=pfx==='@app/'?'app':'private';return ap('/api/app-data/'+s+'/'+encodeURIComponent(k),v);}};}window.ezgalaxy={storage:ns(''),app:ns('@app/'),isInsideEZGalaxy:true,async ready(){return{status:'ok',mode:'docker'};},configureMobile(){}};window.dispatchEvent(new CustomEvent('ezgalaxy-ready',{detail:window.ezgalaxy}));})();"""

@app.get("/api/ezgalaxy-sdk.js")
def serve_sdk():
    return Response(content=SDK_JS, media_type="application/javascript")

# Serve React build — with path traversal protection
@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    if not os.path.isdir(STATIC_DIR):
        return JSONResponse(content={"error": "static dir not found"}, status_code=404)
    file_path = os.path.realpath(os.path.join(STATIC_DIR, full_path))
    # Path traversal protection: resolved path must be under STATIC_DIR
    if not file_path.startswith(STATIC_DIR + os.sep) and file_path != STATIC_DIR:
        raise HTTPException(403, "Forbidden")
    if full_path and os.path.isfile(file_path):
        return FileResponse(file_path)
    index = os.path.join(STATIC_DIR, "index.html")
    if os.path.isfile(index):
        return FileResponse(index)
    return JSONResponse(content={"error": "not found"}, status_code=404)
