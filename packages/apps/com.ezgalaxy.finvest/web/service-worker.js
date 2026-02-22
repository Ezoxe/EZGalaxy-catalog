/* ================================================================
   FinVest — Service Worker (Online-First PWA)
   Caches the app shell for fast loading. All data stays online.
   ================================================================ */

const CACHE_NAME = 'finvest-shell-v1';

const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './mobile.css',
  './ezgalaxy-base.css',
  './ezgalaxy-animations.css',
  './app.js',
  './mobile-nav.js',
  './store.js',
  './engine.js',
  './engine-extra.js',
  './engine-market.js',
  './api-connector.js',
  './access-control.js',
  './ai-chat.js',
  './components.js',
  './components-extra.js',
  './views.js',
  './views-extra.js',
  './views-new.js',
  './vendor/echarts.min.js',
  './vendor/lz-string.min.js',
  './manifest.json'
];

/* ---------- Install: pre-cache shell ------------------------- */
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL_ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
});

/* ---------- Activate: clean old caches ----------------------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---------- Fetch strategy ----------------------------------- */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls, SDK, auth, external APIs → always network (never cache data)
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname !== self.location.hostname ||
    event.request.method !== 'GET'
  ) {
    return; // Let the browser handle it normally (network only)
  }

  // Shell assets → Network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed → try cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // If it's a navigation request and we have the shell cached, serve index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          // Nothing cached → show offline message
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FinVest — Hors-ligne</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0f1c;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}.c{max-width:400px}.icon{font-size:64px;margin-bottom:16px}h1{font-size:22px;margin-bottom:8px;background:linear-gradient(135deg,#0ea5a4,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent}p{color:#94a3b8;line-height:1.6;margin-bottom:24px}button{background:linear-gradient(135deg,#0ea5a4,#0d9695);color:#fff;border:none;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer}</style></head><body><div class="c"><div class="icon">📡</div><h1>Connexion requise</h1><p>FinVest nécessite une connexion internet pour accéder aux données de marché, à l\'IA et à votre compte cloud.</p><button onclick="location.reload()">↻ Réessayer</button></div></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        });
      })
  );
});
