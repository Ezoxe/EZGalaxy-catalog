const BASE = '';

function buildQuery(options) {
  if (!options) return '';
  const p = new URLSearchParams();
  if (options.limit) p.set('limit', options.limit);
  if (options.offset) p.set('offset', options.offset);
  if (options.prefix) p.set('prefix', options.prefix);
  if (options.sort_by) p.set('sort_by', options.sort_by);
  if (options.sort_order) p.set('sort_order', options.sort_order);
  const s = p.toString();
  return s ? '?' + s : '';
}

async function apiGet(url) {
  const r = await fetch(BASE + url);
  if (!r.ok) throw new Error(`API error ${r.status}: ${r.statusText}`);
  return r.json();
}

async function apiPut(url, data) {
  const r = await fetch(BASE + url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
  if (!r.ok) throw new Error(`API error ${r.status}: ${r.statusText}`);
  return r.json();
}

async function apiDelete(url) {
  const r = await fetch(BASE + url, { method: 'DELETE' });
  if (!r.ok) throw new Error(`API error ${r.status}: ${r.statusText}`);
  return r.json();
}

function createNamespace(prefix) {
  return {
    get: (collection, key) =>
      apiGet(`/api/app-storage/${prefix}${encodeURIComponent(collection)}/${encodeURIComponent(key)}`),
    set: (collection, key, data) =>
      apiPut(`/api/app-storage/${prefix}${encodeURIComponent(collection)}/${encodeURIComponent(key)}`, data),
    delete: (collection, key) =>
      apiDelete(`/api/app-storage/${prefix}${encodeURIComponent(collection)}/${encodeURIComponent(key)}`),
    list: (collection, options) =>
      apiGet(`/api/app-storage/${prefix}${encodeURIComponent(collection)}${buildQuery(options)}`),
    getData: (key) =>
      apiGet(`/api/app-data/${prefix === '@app/' ? 'app' : 'private'}/${encodeURIComponent(key)}`),
    setData: (key, value) =>
      apiPut(`/api/app-data/${prefix === '@app/' ? 'app' : 'private'}/${encodeURIComponent(key)}`, value),
  };
}

export const storage = createNamespace('');
export const appStorage = createNamespace('@app/');
export default { storage, app: appStorage };
