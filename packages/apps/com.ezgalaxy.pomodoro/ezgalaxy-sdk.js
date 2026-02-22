/**
 * EZGalaxy SDK Shim — Drop-in replacement for /api/ezgalaxy-sdk.js
 * Provides the same API as the original SDK but backed by the local Express server.
 */
(function () {
  'use strict';

  const BASE = '';

  function buildQuery(options) {
    if (!options) return '';
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit);
    if (options.offset) params.set('offset', options.offset);
    if (options.prefix) params.set('prefix', options.prefix);
    if (options.sort_by) params.set('sort_by', options.sort_by);
    if (options.sort_order) params.set('sort_order', options.sort_order);
    const qs = params.toString();
    return qs ? '?' + qs : '';
  }

  async function apiGet(url) {
    const res = await fetch(BASE + url);
    return res.json();
  }

  async function apiPut(url, data) {
    const res = await fetch(BASE + url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
    return res.json();
  }

  async function apiDelete(url) {
    const res = await fetch(BASE + url, {
      method: 'DELETE'
    });
    return res.json();
  }

  function createNamespace(prefix) {
    return {
      async get(collection, key) {
        return apiGet(`/api/app-storage/${prefix}${encodeURIComponent(collection)}/${encodeURIComponent(key)}`);
      },

      async set(collection, key, data) {
        return apiPut(`/api/app-storage/${prefix}${encodeURIComponent(collection)}/${encodeURIComponent(key)}`, data);
      },

      async delete(collection, key) {
        return apiDelete(`/api/app-storage/${prefix}${encodeURIComponent(collection)}/${encodeURIComponent(key)}`);
      },

      async list(collection, options) {
        return apiGet(`/api/app-storage/${prefix}${encodeURIComponent(collection)}${buildQuery(options)}`);
      },

      // Simple getData/setData (single-collection shorthand)
      async getData(key) {
        const scope = prefix === '@app/' ? 'app' : 'private';
        const val = await apiGet(`/api/app-data/${scope}/${encodeURIComponent(key)}`);
        return val;
      },

      async setData(key, value) {
        const scope = prefix === '@app/' ? 'app' : 'private';
        return apiPut(`/api/app-data/${scope}/${encodeURIComponent(key)}`, value);
      }
    };
  }

  window.ezgalaxy = {
    storage: createNamespace(''),
    app: createNamespace('@app/'),

    isInsideEZGalaxy: true,

    async ready() {
      return { status: 'ok', mode: 'docker' };
    },

    configureMobile() {
      // No-op in Docker mode
    }
  };

  // Dispatch ready event for apps that listen
  window.dispatchEvent(new CustomEvent('ezgalaxy-ready', { detail: window.ezgalaxy }));
})();
