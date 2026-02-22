/**
 * EZGalaxy — Docker Backend Server
 * Serveur Express compatible avec l'API ezgalaxy-sdk.js
 * Remplace le système centralisé par un stockage SQLite local.
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || '/app/data/database.sqlite';

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables on startup
db.exec(`
  CREATE TABLE IF NOT EXISTS storage (
    scope TEXT NOT NULL DEFAULT 'private',
    collection TEXT NOT NULL,
    record_key TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    PRIMARY KEY (scope, collection, record_key)
  )
`);

app.use(express.json({ limit: '16kb' }));

// Serve static files from web/
app.use(express.static(path.join(__dirname, 'web')));

// Serve the SDK shim
app.get('/api/ezgalaxy-sdk.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'ezgalaxy-sdk.js'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Private storage routes (ezgalaxy.storage) ───

// LIST
app.get('/api/app-storage/:collection', (req, res) => {
  handleList(req, res, 'private');
});

// GET
app.get('/api/app-storage/:collection/:key', (req, res) => {
  handleGet(req, res, 'private');
});

// SET (PUT)
app.put('/api/app-storage/:collection/:key', (req, res) => {
  handleSet(req, res, 'private');
});

// DELETE
app.delete('/api/app-storage/:collection/:key', (req, res) => {
  handleDelete(req, res, 'private');
});

// ─── Shared storage routes (ezgalaxy.app) ───

// LIST
app.get('/api/app-storage/@app/:collection', (req, res) => {
  handleList(req, res, 'shared');
});

// GET
app.get('/api/app-storage/@app/:collection/:key', (req, res) => {
  handleGet(req, res, 'shared');
});

// SET (PUT)
app.put('/api/app-storage/@app/:collection/:key', (req, res) => {
  handleSet(req, res, 'shared');
});

// DELETE
app.delete('/api/app-storage/@app/:collection/:key', (req, res) => {
  handleDelete(req, res, 'shared');
});

// ─── Handler functions ───

function handleList(req, res, scope) {
  const { collection } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const prefix = req.query.prefix || null;
  const sortBy = req.query.sort_by === 'updated_at' ? 'updated_at' : 'record_key';
  const sortOrder = req.query.sort_order === 'desc' ? 'DESC' : 'ASC';

  let countSql = 'SELECT COUNT(*) as total FROM storage WHERE scope = ? AND collection = ?';
  let querySql = `SELECT record_key, data, created_at, updated_at FROM storage WHERE scope = ? AND collection = ?`;
  const params = [scope, collection];

  if (prefix) {
    countSql += ' AND record_key LIKE ?';
    querySql += ' AND record_key LIKE ?';
    params.push(prefix + '%');
  }

  const total = db.prepare(countSql).get(...params).total;
  querySql += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;

  const items = db.prepare(querySql).all(...params, limit, offset).map(row => ({
    record_key: row.record_key,
    data: JSON.parse(row.data),
    created_at: row.created_at,
    updated_at: row.updated_at
  }));

  res.json({ collection, total, offset, limit, items });
}

function handleGet(req, res, scope) {
  const { collection, key } = req.params;
  const row = db.prepare(
    'SELECT record_key, data, created_at, updated_at FROM storage WHERE scope = ? AND collection = ? AND record_key = ?'
  ).get(scope, collection, key);

  if (!row) {
    return res.json(null);
  }

  res.json({
    collection,
    record_key: row.record_key,
    data: JSON.parse(row.data),
    created_at: row.created_at,
    updated_at: row.updated_at
  });
}

function handleSet(req, res, scope) {
  const { collection, key } = req.params;
  const { data } = req.body;

  if (data === undefined) {
    return res.status(400).json({ error: 'Missing "data" field in body' });
  }

  const dataStr = JSON.stringify(data);
  db.prepare(`
    INSERT INTO storage (scope, collection, record_key, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(scope, collection, record_key) DO UPDATE SET
      data = excluded.data,
      updated_at = datetime('now')
  `).run(scope, collection, key, dataStr);

  res.json({ ok: true, record_key: key });
}

function handleDelete(req, res, scope) {
  const { collection, key } = req.params;
  db.prepare(
    'DELETE FROM storage WHERE scope = ? AND collection = ? AND record_key = ?'
  ).run(scope, collection, key);
  res.json({ ok: true });
}

// ─── Simple getData/setData routes ───

// GET single value (simple API)
app.get('/api/app-data/:scope/:key', (req, res) => {
  const { scope, key } = req.params;
  const s = scope === 'app' ? 'shared' : 'private';
  const row = db.prepare(
    'SELECT data FROM storage WHERE scope = ? AND collection = ? AND record_key = ?'
  ).get(s, '_default', key);
  res.json(row ? JSON.parse(row.data) : null);
});

// SET single value (simple API)
app.put('/api/app-data/:scope/:key', (req, res) => {
  const { scope, key } = req.params;
  const s = scope === 'app' ? 'shared' : 'private';
  const dataStr = JSON.stringify(req.body.data !== undefined ? req.body.data : req.body);
  db.prepare(`
    INSERT INTO storage (scope, collection, record_key, data, created_at, updated_at)
    VALUES (?, '_default', ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(scope, collection, record_key) DO UPDATE SET
      data = excluded.data,
      updated_at = datetime('now')
  `).run(s, key, dataStr);
  res.json({ ok: true });
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`EZGalaxy app running on :${PORT}`);
});
