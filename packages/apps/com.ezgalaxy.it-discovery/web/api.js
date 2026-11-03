/**
 * IT Discovery — HTTP client for the game API (/api/v2).
 * Every failure becomes an ApiError with a stable `code`, so the UI can show
 * a clear message instead of a misleading one (a network error is never
 * reported as "unknown pseudo").
 */
(() => {
  'use strict';

  const TOKEN_KEY = 'it-discovery-token';
  const ADMIN_KEY = 'it-discovery-admin';
  const QUEUE_KEY = 'it-discovery-pending';

  const store = {
    get(storage, key) { try { return storage.getItem(key); } catch (e) { return null; } },
    set(storage, key, value) {
      try { if (value == null) storage.removeItem(key); else storage.setItem(key, value); } catch (e) { /* private mode */ }
    },
  };

  class ApiError extends Error {
    constructor(status, code, message, extra) {
      super(message);
      this.status = status;
      this.code = code;
      this.extra = extra || {};
    }
  }

  function base() {
    const path = window.location.pathname;
    return path.endsWith('/') ? path : path.slice(0, path.lastIndexOf('/') + 1);
  }

  async function request(method, path, body, opts) {
    const o = opts || {};
    const headers = {};
    const token = o.admin ? store.get(sessionStorage, ADMIN_KEY) : store.get(localStorage, TOKEN_KEY);
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let res;
    try {
      res = await fetch(base() + 'api/v2/' + path, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw new ApiError(0, 'network', 'Impossible de joindre le serveur. Vérifie ta connexion puis réessaie.');
    }
    if (o.raw) {
      if (!res.ok) throw new ApiError(res.status, 'http_' + res.status, 'Le serveur a répondu par une erreur.');
      return res;
    }
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      const d = (data && data.detail) || {};
      if (typeof d === 'object' && d.code) {
        const { code, message, ...extra } = d;
        if (code === 'auth_required' && Api.onSessionLost) Api.onSessionLost();
        throw new ApiError(res.status, code, message, extra);
      }
      throw new ApiError(res.status, 'http_' + res.status,
        res.status >= 500 ? 'Le serveur a rencontré un problème. Réessaie dans un instant.' : 'Requête refusée par le serveur.');
    }
    return data;
  }

  const get = (p, o) => request('GET', p, undefined, o);
  const post = (p, b, o) => request('POST', p, b === undefined ? {} : b, o);

  /* Lessons finished while the network was down are kept and replayed later. */
  function queue() {
    try { return JSON.parse(store.get(localStorage, QUEUE_KEY) || '[]'); } catch (e) { return []; }
  }
  function setQueue(items) { store.set(localStorage, QUEUE_KEY, items.length ? JSON.stringify(items) : null); }

  const Api = {
    ApiError,
    hasToken: () => !!store.get(localStorage, TOKEN_KEY),
    setToken: (t) => store.set(localStorage, TOKEN_KEY, t),
    hasAdmin: () => !!store.get(sessionStorage, ADMIN_KEY),
    setAdmin: (t) => store.set(sessionStorage, ADMIN_KEY, t),

    register: (pseudo, pin) => post('auth/register', { pseudo, pin }),
    login: (pseudo, pin) => post('auth/login', { pseudo, pin }),
    logout: () => post('auth/logout').catch(() => null),
    me: () => get('me'),
    progress: () => get('me/progress'),
    changePin: (currentPin, newPin) => post('me/pin', { currentPin, newPin }),
    importGuest: (lessons) => post('me/import-guest', { lessons }),

    async lesson(module, lesson) {
      try {
        return await post('events/lesson', { module, lesson });
      } catch (err) {
        if (err.code === 'network') {
          const items = queue().filter((q) => !(q.module === module && q.lesson === lesson));
          items.push({ module, lesson });
          setQueue(items);
        }
        throw err;
      }
    },
    async flushQueue() {
      const items = queue();
      if (!items.length || !Api.hasToken()) return null;
      let last = null;
      const left = [];
      for (const q of items) {
        try { last = await post('events/lesson', q); } catch (err) { if (err.code === 'network') left.push(q); }
      }
      setQueue(left);
      return last;
    },
    clearQueue: () => setQueue([]),

    sceneQuiz: (scene, choice) => post('events/scene-quiz', { scene, choice }),
    startRun: (kind, module) => post('runs', { kind, module: module || null }),
    answer: (runId, index, choice) => post('runs/' + encodeURIComponent(runId) + '/answer', { index, choice }),
    finish: (runId) => post('runs/' + encodeURIComponent(runId) + '/finish'),

    season: () => get('leaderboard/season'),
    hallOfFame: () => get('leaderboard/hall-of-fame'),
    records: () => get('leaderboard/records'),
    ghost: (module) => get('ghost/' + encodeURIComponent(module)),

    admin: {
      login: (code) => post('admin/login', { code }),
      logout: () => post('admin/logout', {}, { admin: true }).catch(() => null),
      overview: () => get('admin/overview', { admin: true }),
      resetPin: (id) => post('admin/players/' + id + '/reset-pin', {}, { admin: true }),
      rename: (id, pseudo) => post('admin/players/' + id + '/rename', { pseudo }, { admin: true }),
      remove: (id) => request('DELETE', 'admin/players/' + id, undefined, { admin: true }),
      closeSeason: () => post('admin/seasons/close', {}, { admin: true }),
      exportCsv: () => request('GET', 'admin/export.csv', undefined, { admin: true, raw: true }),
    },
  };

  window.ITApi = Api;
})();
