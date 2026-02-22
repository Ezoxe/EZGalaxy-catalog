"""EZGalaxy FastAPI Backend — Storage API + React SPA serving."""
import os, json, sqlite3
from datetime import datetime, timezone
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse, JSONResponse, Response

app = FastAPI(title="EZGalaxy App")
DB_PATH = os.environ.get("DB_PATH", "/app/data/database.sqlite")
STATIC_DIR = os.environ.get("STATIC_DIR", "/app/static")

def get_db():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    conn = get_db()
    conn.execute("""CREATE TABLE IF NOT EXISTS storage (
        scope TEXT NOT NULL DEFAULT 'private', collection TEXT NOT NULL,
        record_key TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (scope, collection, record_key))""")
    conn.commit()
    conn.close()

init_db()

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

# Private storage
@app.get("/api/app-storage/{collection}")
def list_records(collection: str, request: Request):
    return _list("private", collection, request)

@app.get("/api/app-storage/{collection}/{key}")
def get_record(collection: str, key: str):
    return _get("private", collection, key)

@app.put("/api/app-storage/{collection}/{key}")
async def set_record(collection: str, key: str, request: Request):
    return _set("private", collection, key, await request.json())

@app.delete("/api/app-storage/{collection}/{key}")
def delete_record(collection: str, key: str):
    return _delete("private", collection, key)

# Shared storage
@app.get("/api/app-storage/@app/{collection}")
def list_shared(collection: str, request: Request):
    return _list("shared", collection, request)

@app.get("/api/app-storage/@app/{collection}/{key}")
def get_shared(collection: str, key: str):
    return _get("shared", collection, key)

@app.put("/api/app-storage/@app/{collection}/{key}")
async def set_shared(collection: str, key: str, request: Request):
    return _set("shared", collection, key, await request.json())

@app.delete("/api/app-storage/@app/{collection}/{key}")
def delete_shared(collection: str, key: str):
    return _delete("shared", collection, key)

# Simple getData/setData
@app.get("/api/app-data/{scope}/{key}")
def get_simple(scope: str, key: str):
    s = "shared" if scope == "app" else "private"
    conn = get_db()
    row = conn.execute(
        "SELECT data FROM storage WHERE scope=? AND collection='_default' AND record_key=?",
        (s, key)
    ).fetchone()
    conn.close()
    return JSONResponse(content=json.loads(row["data"]) if row else None)

@app.put("/api/app-data/{scope}/{key}")
async def set_simple(scope: str, key: str, request: Request):
    s = "shared" if scope == "app" else "private"
    body = await request.json()
    data_str = json.dumps(body.get("data", body))
    conn = get_db()
    conn.execute(
        """INSERT INTO storage (scope,collection,record_key,data,created_at,updated_at)
        VALUES(?,'_default',?,?,datetime('now'),datetime('now'))
        ON CONFLICT(scope,collection,record_key)
        DO UPDATE SET data=excluded.data,updated_at=datetime('now')""",
        (s, key, data_str)
    )
    conn.commit()
    conn.close()
    return {"ok": True}

def _list(scope, collection, request):
    limit = min(int(request.query_params.get("limit", 50)), 200)
    offset = int(request.query_params.get("offset", 0))
    prefix = request.query_params.get("prefix")
    sort_by = "updated_at" if request.query_params.get("sort_by") == "updated_at" else "record_key"
    sort_order = "DESC" if request.query_params.get("sort_order") == "desc" else "ASC"
    conn = get_db()
    params = [scope, collection]
    where = "WHERE scope=? AND collection=?"
    if prefix:
        where += " AND record_key LIKE ?"
        params.append(prefix + "%")
    total = conn.execute(f"SELECT COUNT(*) as c FROM storage {where}", params).fetchone()["c"]
    rows = conn.execute(
        f"SELECT record_key,data,created_at,updated_at FROM storage {where} ORDER BY {sort_by} {sort_order} LIMIT ? OFFSET ?",
        params + [limit, offset]
    ).fetchall()
    conn.close()
    items = [{
        "record_key": r["record_key"], "data": json.loads(r["data"]),
        "created_at": r["created_at"], "updated_at": r["updated_at"]
    } for r in rows]
    return {"collection": collection, "total": total, "offset": offset, "limit": limit, "items": items}

def _get(scope, collection, key):
    conn = get_db()
    row = conn.execute(
        "SELECT record_key,data,created_at,updated_at FROM storage WHERE scope=? AND collection=? AND record_key=?",
        (scope, collection, key)
    ).fetchone()
    conn.close()
    if not row:
        return JSONResponse(content=None)
    return {
        "collection": collection, "record_key": row["record_key"],
        "data": json.loads(row["data"]),
        "created_at": row["created_at"], "updated_at": row["updated_at"]
    }

def _set(scope, collection, key, body):
    data = body.get("data")
    if data is None:
        raise HTTPException(400, 'Missing "data" field')
    conn = get_db()
    conn.execute(
        """INSERT INTO storage (scope,collection,record_key,data,created_at,updated_at)
        VALUES(?,?,?,?,datetime('now'),datetime('now'))
        ON CONFLICT(scope,collection,record_key)
        DO UPDATE SET data=excluded.data,updated_at=datetime('now')""",
        (scope, collection, key, json.dumps(data))
    )
    conn.commit()
    conn.close()
    return {"ok": True, "record_key": key}

def _delete(scope, collection, key):
    conn = get_db()
    conn.execute(
        "DELETE FROM storage WHERE scope=? AND collection=? AND record_key=?",
        (scope, collection, key)
    )
    conn.commit()
    conn.close()
    return {"ok": True}

# SDK shim
SDK_JS = """(function(){'use strict';function bq(o){if(!o)return'';const p=new URLSearchParams();if(o.limit)p.set('limit',o.limit);if(o.offset)p.set('offset',o.offset);if(o.prefix)p.set('prefix',o.prefix);if(o.sort_by)p.set('sort_by',o.sort_by);if(o.sort_order)p.set('sort_order',o.sort_order);const s=p.toString();return s?'?'+s:'';}async function ag(u){const r=await fetch(u);return r.json();}async function ap(u,d){const r=await fetch(u,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:d})});return r.json();}async function ad(u){const r=await fetch(u,{method:'DELETE'});return r.json();}function ns(pfx){return{async get(c,k){return ag('/api/app-storage/'+pfx+encodeURIComponent(c)+'/'+encodeURIComponent(k));},async set(c,k,d){return ap('/api/app-storage/'+pfx+encodeURIComponent(c)+'/'+encodeURIComponent(k),d);},async delete(c,k){return ad('/api/app-storage/'+pfx+encodeURIComponent(c)+'/'+encodeURIComponent(k));},async list(c,o){return ag('/api/app-storage/'+pfx+encodeURIComponent(c)+bq(o));},async getData(k){const s=pfx==='@app/'?'app':'private';return ag('/api/app-data/'+s+'/'+encodeURIComponent(k));},async setData(k,v){const s=pfx==='@app/'?'app':'private';return ap('/api/app-data/'+s+'/'+encodeURIComponent(k),v);}};}window.ezgalaxy={storage:ns(''),app:ns('@app/'),isInsideEZGalaxy:true,async ready(){return{status:'ok',mode:'docker'};},configureMobile(){}};window.dispatchEvent(new CustomEvent('ezgalaxy-ready',{detail:window.ezgalaxy}));})();"""

@app.get("/api/ezgalaxy-sdk.js")
def serve_sdk():
    return Response(content=SDK_JS, media_type="application/javascript")

# Serve React build
if os.path.isdir(STATIC_DIR):
    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        file_path = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index = os.path.join(STATIC_DIR, "index.html")
        if os.path.isfile(index):
            return FileResponse(index)
        return JSONResponse(content={"error": "not found"}, status_code=404)
