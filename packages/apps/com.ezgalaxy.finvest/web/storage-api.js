/* ================================================================
   FinVest — storage-api.js  (Direct Backend Storage API)
   Replaces the deprecated ezgalaxy-sdk.js with direct fetch calls
   using relative paths (works behind Nginx reverse proxy).
   Exposes: window.AppStorage      — private storage
            window.AppSharedStorage — shared/app-level storage
   ================================================================ */
(() => {
  'use strict';

  function buildQuery(opts) {
    if (!opts) return '';
    const p = new URLSearchParams();
    if (opts.limit) p.set('limit', opts.limit);
    if (opts.offset) p.set('offset', opts.offset);
    if (opts.prefix) p.set('prefix', opts.prefix);
    if (opts.sort_by) p.set('sort_by', opts.sort_by);
    if (opts.sort_order) p.set('sort_order', opts.sort_order);
    const s = p.toString();
    return s ? '?' + s : '';
  }

  async function parseJSON(r) {
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('text/html')) throw new Error('Le serveur a renvoyé du HTML au lieu de JSON');
    return r.json();
  }

  async function apiGet(url, allow404) {
    const r = await fetch(url);
    if (r.status === 404 && allow404) return null;
    if (!r.ok) {
      let msg = 'API error: ' + r.status;
      try { const e = await r.clone().json(); if (e && e.detail) msg = e.detail; } catch (_) {}
      throw new Error(msg);
    }
    return parseJSON(r);
  }

  async function apiPut(url, data) {
    const r = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: data })
    });
    if (!r.ok) {
      let msg = 'API error: ' + r.status;
      try { const e = await r.clone().json(); if (e && e.detail) msg = e.detail; } catch (_) {}
      throw new Error(msg);
    }
    return parseJSON(r);
  }

  async function apiDelete(url) {
    const r = await fetch(url, { method: 'DELETE' });
    if (!r.ok) {
      let msg = 'API error: ' + r.status;
      try { const e = await r.clone().json(); if (e && e.detail) msg = e.detail; } catch (_) {}
      throw new Error(msg);
    }
    return parseJSON(r);
  }

  function createStorageAPI(prefix) {
    return {
      async get(collection, key) {
        return apiGet('./api/app-storage/' + prefix + encodeURIComponent(collection) + '/' + encodeURIComponent(key), true);
      },
      async set(collection, key, data) {
        return apiPut('./api/app-storage/' + prefix + encodeURIComponent(collection) + '/' + encodeURIComponent(key), data);
      },
      async delete(collection, key) {
        return apiDelete('./api/app-storage/' + prefix + encodeURIComponent(collection) + '/' + encodeURIComponent(key));
      },
      async list(collection, opts) {
        return apiGet('./api/app-storage/' + prefix + encodeURIComponent(collection) + buildQuery(opts), true);
      }
    };
  }

  // Private storage (user-scoped data)
  window.AppStorage = createStorageAPI('');

  // Shared storage (app-level data, e.g., admin permissions, API keys)
  window.AppSharedStorage = createStorageAPI('@app/');
})();
