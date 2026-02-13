/* ================================================================
   FinVest — api-connector.js  (API Integration & Quota Pool)
   Connects to: Finnhub, Alpha Vantage, ExchangeRate-API,
                CoinGecko (free), Frankfurter (free)
   Smart rate-limiter with persistent quota tracking via
   EZGalaxy Community Data API.
   Exposes: window.FinAPI
   ================================================================ */
(() => {
  'use strict';

  /* ─────────── API Keys ──────────────────────────────────────── */
  const API_KEYS = {
    finnhub:      'd67quthr01qobepj21t0d67quthr01qobepj21tg',
    alphavantage: 'SQ28RIEJMDYB3J9E',
    exchangerate: 'fde50d4f38a7a06ca9a313cf'
  };

  /* ─────────── Endpoints ─────────────────────────────────────── */
  const BASE = {
    finnhub:      'https://finnhub.io/api/v1',
    alphavantage: 'https://www.alphavantage.co/query',
    exchangerate: 'https://v6.exchangerate-api.com/v6',
    coingecko:    'https://api.coingecko.com/api/v3',
    frankfurter:  'https://api.frankfurter.app'
  };

  /* ─────────── Symbol Mapping ────────────────────────────────── */
  /* Map internal FinVest symbols → Finnhub tickers */
  const FINNHUB_MAP = {
    'AAPL': 'AAPL', 'MSFT': 'MSFT', 'AMZN': 'AMZN', 'NVDA': 'NVDA',
    'LVMH': 'MC.PA', 'TOTALENERGIES': 'TTE.PA', 'AIRBUS': 'AIR.PA',
    'SANOFI': 'SAN.PA', 'CW8': 'CW8.PA', 'EWLD': 'EWLD.PA',
    'PE500': 'PE500.PA', 'LQQ': 'LQQ.PA',
    'GOLD': 'GC=F'  /* futures proxy — may not work on free tier */
  };

  /* Map internal symbols → CoinGecko ids */
  const COINGECKO_MAP = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum'
  };

  /* ─────────── Quota Configuration ───────────────────────────── */
  /*
   * Finnhub   : 60 req/min   → tracked in-memory
   * Alpha V.  : 25 req/day   → persisted (ezgalaxy.storage)
   * ExchRate  : 1 500 req/mo → persisted
   * CoinGecko : ~30 req/min  → tracked in-memory
   * Frankfurter : unlimited
   */
  const QUOTA_CONFIG = {
    finnhub:      { limit: 60,   window: 'minute', ms: 60_000,      throttleAt: 0.80, persist: false },
    alphavantage: { limit: 25,   window: 'day',    ms: 86_400_000,  throttleAt: 0.70, persist: true  },
    exchangerate: { limit: 1500, window: 'month',  ms: 2_592_000_000, throttleAt:0.85, persist: true  },
    coingecko:    { limit: 30,   window: 'minute', ms: 60_000,      throttleAt: 0.80, persist: false },
    frankfurter:  { limit: Infinity, window: 'none', ms: 0,         throttleAt: 1,    persist: false }
  };

  /* ─────────── In-memory state ───────────────────────────────── */
  let quotaPool = {
    finnhub:      { used: 0, resetAt: 0 },
    alphavantage: { used: 0, resetAt: 0 },
    exchangerate: { used: 0, resetAt: 0 },
    coingecko:    { used: 0, resetAt: 0 },
    frankfurter:  { used: 0, resetAt: 0 }
  };

  const cache = new Map();       // key → { data, expiresAt }
  let initialized = false;
  let initPromise = null;

  /* ─────────── Cache TTL (ms) ────────────────────────────────── */
  const CACHE_TTL = {
    quote:        30_000,   // 30 s  — near real-time
    candles:      3_600_000, // 1 h  — historical data rarely changes
    news:         300_000,  // 5 min
    profile:      86_400_000, // 1 day
    search:       600_000,  // 10 min
    crypto:       60_000,   // 1 min
    cryptoHist:   3_600_000,
    fx:           3_600_000, // 1 h
    fxHist:       21_600_000, // 6 h (BCE rates change 1x/day)
    indicator:    3_600_000
  };

  /* ─────────── Safe localStorage (sandbox-proof) ─────────────── */
  const safeLS = window._finvestSafeLS || {
    getItem(k) { try { return localStorage.getItem(k); } catch(_) { return null; } },
    setItem(k,v) { try { localStorage.setItem(k,v); } catch(_) {} },
    removeItem(k) { try { localStorage.removeItem(k); } catch(_) {} }
  };

  /* ================================================================
     QUOTA POOL MANAGEMENT
     ================================================================ */

  /** Load persisted quotas from EZGalaxy storage (or LS fallback) */
  async function loadQuotas() {
    let saved = null;
    try {
      if (typeof ezgalaxy !== 'undefined' && ezgalaxy.storage) {
        const rec = await ezgalaxy.storage.get('api-quotas', 'pool');
        if (rec && rec.data) saved = rec.data;
      }
    } catch (_) {}
    if (!saved) {
      try {
        const raw = safeLS.getItem('finvest_api_quotas');
        if (raw) saved = JSON.parse(raw);
      } catch (_) {}
    }
    if (saved) {
      for (const api of Object.keys(QUOTA_CONFIG)) {
        if (saved[api]) {
          quotaPool[api] = { ...quotaPool[api], ...saved[api] };
        }
      }
    }
    // Reset expired windows
    const now = Date.now();
    for (const [api, cfg] of Object.entries(QUOTA_CONFIG)) {
      if (quotaPool[api].resetAt && now > quotaPool[api].resetAt) {
        quotaPool[api].used = 0;
        quotaPool[api].resetAt = computeResetAt(api);
      } else if (!quotaPool[api].resetAt) {
        quotaPool[api].resetAt = computeResetAt(api);
      }
    }
  }

  /** Compute next reset timestamp for a given API */
  function computeResetAt(api) {
    const cfg = QUOTA_CONFIG[api];
    const now = new Date();
    if (cfg.window === 'minute') return Date.now() + 60_000;
    if (cfg.window === 'day') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.getTime();
    }
    if (cfg.window === 'month') {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return nextMonth.getTime();
    }
    return 0;
  }

  /** Persist quotas (only the ones that need it) */
  async function saveQuotas() {
    const toSave = {};
    for (const [api, cfg] of Object.entries(QUOTA_CONFIG)) {
      if (cfg.persist) {
        toSave[api] = { used: quotaPool[api].used, resetAt: quotaPool[api].resetAt };
      }
    }
    // Always try LS for fast access
    try { safeLS.setItem('finvest_api_quotas', JSON.stringify(toSave)); } catch (_) {}
    // Try EZGalaxy storage
    try {
      if (typeof ezgalaxy !== 'undefined' && ezgalaxy.storage) {
        await ezgalaxy.storage.set('api-quotas', 'pool', toSave);
      }
    } catch (_) {}
  }

  /** Check if we can make a request to an API */
  function canRequest(api) {
    const cfg = QUOTA_CONFIG[api];
    if (!cfg || cfg.limit === Infinity) return true;
    const pool = quotaPool[api];
    // Reset if window expired
    if (Date.now() > pool.resetAt) {
      pool.used = 0;
      pool.resetAt = computeResetAt(api);
    }
    return pool.used < cfg.limit;
  }

  /** Check if we should throttle (save budget for important calls) */
  function shouldThrottle(api) {
    const cfg = QUOTA_CONFIG[api];
    if (!cfg || cfg.limit === Infinity) return false;
    const pool = quotaPool[api];
    const ratio = pool.used / cfg.limit;
    return ratio >= cfg.throttleAt;
  }

  /** Track a request */
  function trackRequest(api) {
    if (!QUOTA_CONFIG[api]) return;
    const pool = quotaPool[api];
    if (Date.now() > pool.resetAt) {
      pool.used = 0;
      pool.resetAt = computeResetAt(api);
    }
    pool.used++;
    // Debounced save for persistent quotas
    if (QUOTA_CONFIG[api].persist) {
      clearTimeout(trackRequest._saveTimer);
      trackRequest._saveTimer = setTimeout(saveQuotas, 2000);
    }
  }
  trackRequest._saveTimer = null;

  /** Get full quota status for UI display */
  function getQuotaStatus() {
    const now = Date.now();
    const result = {};
    for (const [api, cfg] of Object.entries(QUOTA_CONFIG)) {
      const pool = quotaPool[api];
      if (cfg.limit === Infinity) {
        result[api] = { used: 0, limit: '∞', remaining: '∞', pct: 0, resetIn: null, status: 'ok' };
        continue;
      }
      // Auto-reset check
      if (now > pool.resetAt) { pool.used = 0; pool.resetAt = computeResetAt(api); }
      const remaining = Math.max(0, cfg.limit - pool.used);
      const pct = pool.used / cfg.limit;
      const resetIn = Math.max(0, pool.resetAt - now);
      let status = 'ok';
      if (pct >= 1) status = 'exhausted';
      else if (pct >= cfg.throttleAt) status = 'throttled';
      else if (pct >= 0.5) status = 'moderate';
      result[api] = { used: pool.used, limit: cfg.limit, remaining, pct: Math.round(pct * 100), resetIn, status, window: cfg.window };
    }
    return result;
  }

  /* ================================================================
     CACHE LAYER
     ================================================================ */
  function cacheGet(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
    return entry.data;
  }

  function cacheSet(key, data, ttl) {
    cache.set(key, { data, expiresAt: Date.now() + ttl });
    // Also persist critical data to LS for offline access
    if (key.startsWith('quote:') || key.startsWith('crypto:') || key.startsWith('fx:')) {
      try { safeLS.setItem('finvest_cache_' + key, JSON.stringify({ data, expiresAt: Date.now() + ttl })); } catch (_) {}
    }
  }

  function cacheLSGet(key) {
    try {
      const raw = safeLS.getItem('finvest_cache_' + key);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      // LS cache has a more generous expiry (10x TTL)
      if (Date.now() > entry.expiresAt * 10) return null;
      return entry.data;
    } catch (_) { return null; }
  }

  /* ================================================================
     GENERIC FETCH WRAPPER
     ================================================================ */
  async function apiFetch(api, url, cacheKey, ttl) {
    // 1. In-memory cache
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    // 2. Check quota
    if (!canRequest(api)) {
      console.warn(`[FinAPI] ${api} quota exhausted — using fallback`);
      const lsCached = cacheLSGet(cacheKey);
      if (lsCached) return lsCached;
      return null;
    }

    // 3. If throttled and we have LS cache, prefer it
    if (shouldThrottle(api)) {
      const lsCached = cacheLSGet(cacheKey);
      if (lsCached) {
        console.log(`[FinAPI] ${api} throttled — using LS cache for ${cacheKey}`);
        return lsCached;
      }
    }

    // 4. Actual fetch
    try {
      trackRequest(api);
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        console.warn(`[FinAPI] ${api} HTTP ${res.status} for ${cacheKey}`);
        return cacheLSGet(cacheKey);
      }
      const data = await res.json();
      // Check for API error messages
      if (data.error || data['Error Message'] || data.Note) {
        console.warn(`[FinAPI] ${api} error:`, data.error || data['Error Message'] || data.Note);
        return cacheLSGet(cacheKey);
      }
      cacheSet(cacheKey, data, ttl);
      return data;
    } catch (err) {
      console.warn(`[FinAPI] ${api} fetch error:`, err.message);
      return cacheLSGet(cacheKey);
    }
  }

  /* ================================================================
     FINNHUB — Real-time quotes, candles, news, search
     ================================================================ */
  const finnhub = {
    /** Get real-time quote for a symbol */
    async quote(symbol) {
      const fhSymbol = FINNHUB_MAP[symbol] || symbol;
      const url = `${BASE.finnhub}/quote?symbol=${encodeURIComponent(fhSymbol)}&token=${API_KEYS.finnhub}`;
      const data = await apiFetch('finnhub', url, `quote:${symbol}`, CACHE_TTL.quote);
      if (!data || data.c === 0) return null;
      return {
        symbol,
        finnhubSymbol: fhSymbol,
        current: data.c,     // current price
        change: data.d,      // change
        changePct: data.dp,  // change %
        high: data.h,        // day high
        low: data.l,         // day low
        open: data.o,        // open
        prevClose: data.pc,  // previous close
        timestamp: data.t ? new Date(data.t * 1000).toISOString() : new Date().toISOString(),
        source: 'finnhub'
      };
    },

    /** Get historical candles */
    async candles(symbol, days = 90, resolution = 'D') {
      const fhSymbol = FINNHUB_MAP[symbol] || symbol;
      const to = Math.floor(Date.now() / 1000);
      const from = to - days * 86400;
      const url = `${BASE.finnhub}/stock/candle?symbol=${encodeURIComponent(fhSymbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${API_KEYS.finnhub}`;
      const data = await apiFetch('finnhub', url, `candles:${symbol}:${days}`, CACHE_TTL.candles);
      if (!data || data.s !== 'ok') return null;
      const result = [];
      for (let i = 0; i < data.t.length; i++) {
        result.push({
          date: new Date(data.t[i] * 1000).toISOString().slice(0, 10),
          open: data.o[i], high: data.h[i], low: data.l[i], close: data.c[i],
          volume: data.v[i]
        });
      }
      return result;
    },

    /** Company profile */
    async profile(symbol) {
      const fhSymbol = FINNHUB_MAP[symbol] || symbol;
      const url = `${BASE.finnhub}/stock/profile2?symbol=${encodeURIComponent(fhSymbol)}&token=${API_KEYS.finnhub}`;
      return apiFetch('finnhub', url, `profile:${symbol}`, CACHE_TTL.profile);
    },

    /** Market news */
    async news(category = 'general') {
      const url = `${BASE.finnhub}/news?category=${category}&token=${API_KEYS.finnhub}`;
      const data = await apiFetch('finnhub', url, `news:${category}`, CACHE_TTL.news);
      if (!data || !Array.isArray(data)) return [];
      return data.slice(0, 20).map(n => ({
        title: n.headline,
        summary: n.summary,
        url: n.url,
        source: n.source,
        image: n.image,
        date: new Date(n.datetime * 1000).toISOString(),
        category: n.category,
        related: n.related
      }));
    },

    /** Symbol search */
    async search(query) {
      const url = `${BASE.finnhub}/search?q=${encodeURIComponent(query)}&token=${API_KEYS.finnhub}`;
      const data = await apiFetch('finnhub', url, `search:${query}`, CACHE_TTL.search);
      if (!data || !data.result) return [];
      return data.result.slice(0, 10).map(r => ({
        symbol: r.symbol,
        name: r.description,
        type: r.type,
        exchange: r.displaySymbol
      }));
    }
  };

  /* ================================================================
     ALPHA VANTAGE — Historical data & technical indicators
     ================================================================ */
  const alpha = {
    /** Daily time series (last 100 days) */
    async daily(symbol) {
      const avSymbol = FINNHUB_MAP[symbol] || symbol; // Same mapping works often
      const url = `${BASE.alphavantage}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(avSymbol)}&outputsize=compact&apikey=${API_KEYS.alphavantage}`;
      const data = await apiFetch('alphavantage', url, `av-daily:${symbol}`, CACHE_TTL.candles);
      if (!data || !data['Time Series (Daily)']) return null;
      const ts = data['Time Series (Daily)'];
      return Object.entries(ts).map(([date, v]) => ({
        date,
        open: parseFloat(v['1. open']),
        high: parseFloat(v['2. high']),
        low:  parseFloat(v['3. low']),
        close: parseFloat(v['4. close']),
        volume: parseInt(v['5. volume'])
      })).sort((a, b) => a.date.localeCompare(b.date));
    },

    /** Technical indicator (SMA, RSI, MACD, etc.) */
    async indicator(symbol, func = 'SMA', params = {}) {
      const avSymbol = FINNHUB_MAP[symbol] || symbol;
      const { interval = 'daily', timePeriod = 20, seriesType = 'close' } = params;
      const url = `${BASE.alphavantage}?function=${func}&symbol=${encodeURIComponent(avSymbol)}&interval=${interval}&time_period=${timePeriod}&series_type=${seriesType}&apikey=${API_KEYS.alphavantage}`;
      const key = `av-ind:${symbol}:${func}:${timePeriod}`;
      const data = await apiFetch('alphavantage', url, key, CACHE_TTL.indicator);
      if (!data) return null;
      // Alpha Vantage returns different keys for different functions
      const metaKey = Object.keys(data).find(k => k.startsWith('Technical'));
      if (!metaKey) return null;
      return Object.entries(data[metaKey]).map(([date, v]) => ({
        date,
        value: parseFloat(Object.values(v)[0])
      })).sort((a, b) => a.date.localeCompare(b.date));
    }
  };

  /* ================================================================
     EXCHANGERATE-API — Forex rates
     ================================================================ */
  const fx = {
    /** Latest exchange rates from a base currency */
    async rates(base = 'EUR') {
      const url = `${BASE.exchangerate}/${API_KEYS.exchangerate}/latest/${base}`;
      const data = await apiFetch('exchangerate', url, `fx:${base}`, CACHE_TTL.fx);
      if (!data || data.result !== 'success') return null;
      return {
        base: data.base_code,
        rates: data.conversion_rates,
        lastUpdate: data.time_last_update_utc,
        nextUpdate: data.time_next_update_utc,
        source: 'exchangerate-api'
      };
    },

    /** Convert amount from one currency to another */
    async convert(from, to, amount) {
      const url = `${BASE.exchangerate}/${API_KEYS.exchangerate}/pair/${from}/${to}/${amount}`;
      const data = await apiFetch('exchangerate', url, `fx-convert:${from}:${to}:${amount}`, CACHE_TTL.fx);
      if (!data || data.result !== 'success') return null;
      return {
        from, to, amount,
        rate: data.conversion_rate,
        result: data.conversion_result,
        source: 'exchangerate-api'
      };
    }
  };

  /* ================================================================
     COINGECKO — Crypto prices (free, no key)
     ================================================================ */
  const crypto = {
    /** Get current prices for multiple cryptos */
    async prices(ids = ['bitcoin', 'ethereum']) {
      const idsStr = ids.join(',');
      const url = `${BASE.coingecko}/simple/price?ids=${idsStr}&vs_currencies=eur,usd&include_24hr_change=true&include_market_cap=true`;
      const data = await apiFetch('coingecko', url, `crypto:${idsStr}`, CACHE_TTL.crypto);
      if (!data) return null;
      return data;
    },

    /** Get price history for a crypto */
    async history(id = 'bitcoin', days = 30) {
      const url = `${BASE.coingecko}/coins/${id}/market_chart?vs_currency=eur&days=${days}`;
      const data = await apiFetch('coingecko', url, `crypto-hist:${id}:${days}`, CACHE_TTL.cryptoHist);
      if (!data || !data.prices) return null;
      return {
        prices: data.prices.map(([ts, price]) => ({
          date: new Date(ts).toISOString().slice(0, 10),
          price: Math.round(price * 100) / 100
        })),
        marketCaps: data.market_caps,
        volumes: data.total_volumes,
        source: 'coingecko'
      };
    },

    /** Trending cryptos */
    async trending() {
      const url = `${BASE.coingecko}/search/trending`;
      const data = await apiFetch('coingecko', url, 'crypto-trending', CACHE_TTL.crypto);
      if (!data || !data.coins) return [];
      return data.coins.map(c => ({
        id: c.item.id,
        symbol: c.item.symbol,
        name: c.item.name,
        thumb: c.item.thumb,
        rank: c.item.market_cap_rank,
        priceChange24h: c.item.data?.price_change_percentage_24h?.eur
      }));
    }
  };

  /* ================================================================
     FRANKFURTER — BCE rates (free, no key, unlimited)
     ================================================================ */
  const bce = {
    /** Latest ECB rates */
    async latest(from = 'EUR', to = null) {
      let url = `${BASE.frankfurter}/latest?from=${from}`;
      if (to) url += `&to=${to}`;
      const data = await apiFetch('frankfurter', url, `bce:${from}:${to || 'all'}`, CACHE_TTL.fxHist);
      return data; // { amount, base, date, rates: { USD: 1.08, ... } }
    },

    /** Historical rates over a date range */
    async historical(startDate, endDate, from = 'EUR', to = 'USD') {
      const url = `${BASE.frankfurter}/${startDate}..${endDate}?from=${from}&to=${to}`;
      const data = await apiFetch('frankfurter', url, `bce-hist:${from}:${to}:${startDate}:${endDate}`, CACHE_TTL.fxHist);
      return data; // { amount, base, start_date, end_date, rates: { "2026-01-01": { USD: 1.08 }, ... } }
    }
  };

  /* ================================================================
     UNIFIED HELPERS — Smart fallback to simulation
     ================================================================ */

  /** Real-time price cache (used by engine-market.js) */
  const realPriceCache = new Map();  // symbol → { price, change, changePct, high, low, volume, ts }

  /**
   * Fetch real price for any asset. Returns cached data if available.
   * Called by engine-market.js getLivePrice() for transparent integration.
   */
  async function fetchRealPrice(symbol) {
    // Check if fresh data exists
    const existing = realPriceCache.get(symbol);
    if (existing && (Date.now() - existing.ts) < 30_000) return existing;

    let result = null;

    // Crypto → CoinGecko
    if (COINGECKO_MAP[symbol]) {
      const id = COINGECKO_MAP[symbol];
      const data = await crypto.prices([id]);
      if (data && data[id]) {
        result = {
          price: data[id].eur,
          change: null,
          changePct: data[id].eur_24h_change ? Math.round(data[id].eur_24h_change * 100) / 100 : null,
          marketCap: data[id].eur_market_cap,
          high: null, low: null,
          volume: null,
          source: 'coingecko',
          ts: Date.now()
        };
      }
    }
    // Stocks/ETF → Finnhub
    else if (FINNHUB_MAP[symbol]) {
      const quote = await finnhub.quote(symbol);
      if (quote && quote.current > 0) {
        result = {
          price: quote.current,
          change: quote.change,
          changePct: quote.changePct,
          high: quote.high,
          low: quote.low,
          open: quote.open,
          volume: null,
          source: 'finnhub',
          ts: Date.now()
        };
      }
    }

    if (result) {
      realPriceCache.set(symbol, result);
    }
    return result;
  }

  /**
   * Get historical data for any asset.
   * Tries Finnhub candles → Alpha Vantage daily → falls back to simulation.
   */
  async function fetchHistorical(symbol, days = 90) {
    // Crypto → CoinGecko
    if (COINGECKO_MAP[symbol]) {
      const hist = await crypto.history(COINGECKO_MAP[symbol], days);
      if (hist && hist.prices.length > 0) {
        return {
          data: hist.prices.map(p => ({ date: p.date, close: p.price })),
          source: 'coingecko'
        };
      }
    }

    // Stocks → Finnhub candles first (only costs 1 API call)
    if (FINNHUB_MAP[symbol]) {
      const candles = await finnhub.candles(symbol, days);
      if (candles && candles.length > 0) {
        return { data: candles, source: 'finnhub' };
      }
    }

    // Fallback → Alpha Vantage daily (costs 1 precious call)
    if (FINNHUB_MAP[symbol] && !shouldThrottle('alphavantage')) {
      const daily = await alpha.daily(symbol);
      if (daily && daily.length > 0) {
        return { data: daily.slice(-days), source: 'alphavantage' };
      }
    }

    return null; // Fall back to simulation
  }

  /**
   * Batch-fetch real prices for all known assets (smart batching).
   * Used on bourse view load — fetches crypto in one call, stocks one-by-one.
   */
  async function fetchAllPrices() {
    const results = {};
    const promises = [];

    // 1. Batch crypto via CoinGecko (single request for all)
    const cryptoIds = Object.values(COINGECKO_MAP);
    if (cryptoIds.length > 0 && canRequest('coingecko')) {
      promises.push(
        crypto.prices(cryptoIds).then(data => {
          if (!data) return;
          for (const [symbol, cgId] of Object.entries(COINGECKO_MAP)) {
            if (data[cgId]) {
              const r = {
                price: data[cgId].eur,
                changePct: data[cgId].eur_24h_change ? Math.round(data[cgId].eur_24h_change * 100) / 100 : null,
                marketCap: data[cgId].eur_market_cap,
                source: 'coingecko', ts: Date.now()
              };
              realPriceCache.set(symbol, r);
              results[symbol] = r;
            }
          }
        }).catch(() => {})
      );
    }

    // 2. Fetch stocks individually (Finnhub allows 60/min)
    // Only fetch if not throttled — prioritize US stocks
    const stockSymbols = Object.keys(FINNHUB_MAP);
    const usFirst = stockSymbols.sort((a, b) => {
      const aUS = !FINNHUB_MAP[a].includes('.');
      const bUS = !FINNHUB_MAP[b].includes('.');
      return bUS - aUS;
    });

    for (const symbol of usFirst) {
      if (!canRequest('finnhub')) break;
      if (shouldThrottle('finnhub') && realPriceCache.has(symbol)) continue;
      promises.push(
        fetchRealPrice(symbol).then(r => { if (r) results[symbol] = r; }).catch(() => {})
      );
      // Small delay between Finnhub calls to avoid burst
      await new Promise(r => setTimeout(r, 120));
    }

    await Promise.allSettled(promises);
    return results;
  }

  /** Get forex rate EUR → X */
  async function getForexRate(to = 'USD') {
    // Try ExchangeRate-API first
    const conv = await fx.convert('EUR', to, 1);
    if (conv) return { rate: conv.rate, source: 'exchangerate-api' };
    // Fallback to Frankfurter (free, unlimited)
    const bceData = await bce.latest('EUR', to);
    if (bceData && bceData.rates && bceData.rates[to]) return { rate: bceData.rates[to], source: 'frankfurter' };
    return null;
  }

  /* ================================================================
     INITIALIZATION
     ================================================================ */
  async function init() {
    if (initialized) return;
    if (initPromise) return initPromise;
    initPromise = (async () => {
      console.log('[FinAPI] Initializing API connector...');
      await loadQuotas();
      initialized = true;

      const status = getQuotaStatus();
      console.log('[FinAPI] Quota pool loaded:');
      for (const [api, s] of Object.entries(status)) {
        if (s.limit === '∞') { console.log(`  ${api}: unlimited`); continue; }
        const resetStr = s.resetIn ? formatDuration(s.resetIn) : 'now';
        console.log(`  ${api}: ${s.used}/${s.limit} used (${s.pct}%) — resets in ${resetStr} — status: ${s.status}`);
      }

      // Pre-fetch forex rates (Frankfurter is free/unlimited)
      bce.latest('EUR').catch(() => {});

      console.log('[FinAPI] Ready ✓');
    })();
    return initPromise;
  }

  /** Format ms duration to human-readable */
  function formatDuration(ms) {
    if (ms < 60_000) return Math.ceil(ms / 1000) + 's';
    if (ms < 3_600_000) return Math.ceil(ms / 60_000) + 'min';
    if (ms < 86_400_000) return Math.round(ms / 3_600_000) + 'h';
    return Math.round(ms / 86_400_000) + 'j';
  }

  /** Format the reset date for display */
  function formatResetDate(api) {
    const pool = quotaPool[api];
    if (!pool || !pool.resetAt) return '—';
    return new Date(pool.resetAt).toLocaleString('fr-FR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  /* ================================================================
     PUBLIC API
     ================================================================ */
  window.FinAPI = {
    // Core
    init,
    isReady: () => initialized,
    getQuotaStatus,
    formatResetDate,

    // Raw API modules
    finnhub,
    alpha,
    fx,
    crypto,
    bce,

    // Unified smart helpers
    fetchRealPrice,
    fetchHistorical,
    fetchAllPrices,
    getForexRate,

    // Cache for engine-market.js integration
    realPriceCache,

    // Mappings
    FINNHUB_MAP,
    COINGECKO_MAP,

    // Quota
    canRequest,
    shouldThrottle
  };

})();
