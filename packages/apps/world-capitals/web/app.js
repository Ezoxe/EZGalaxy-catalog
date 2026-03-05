(function () {
  'use strict';

  // ES5-compatible build — same architecture as Flag Game but for World Capitals.

  var EXTENSION_ID = 'world-capitals';
  var STORAGE_PSEUDO = 'ez.capitals.pseudo';
  var STORAGE_COUNTRIES_CACHE = 'ez.capitals.countries.cache.v1';
  var STORAGE_LOCAL_LB = 'ez.capitals.leaderboards.local.v1';

  var FLAG_CDN = 'https://flagcdn.com/48x36';
  var RESTCOUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=cca2,name,translations,capital';
  var COUNTRIES_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  var TIMER_DURATION_MS = 8000;

  /* ── Island nations (ISO 3166-1 alpha-2, lowercase) ── */
  var ISLAND_CODES_LIST = [
    'ag','bb','bs','bn','ck','cu','cy','dm','do','fj','fm','gd',
    'id','ie','is','jm','jp','ki','km','kn','lc','lk','mg','mh',
    'mt','mu','mv','mw','nr','nz','pg','ph','pw','sb','sc','sg',
    'st','sz','tl','to','tt','tv','vc','vu','ws','ht','tw','bh',
    'cv','gp','mq','re','yt','nc','pf','wf','as','gu','mp','vi',
    'tc','ky','bm','vg','ai','ms','fk','sh','ck','nu','tk','pn',
    'cx','cc','nf','hm','gb','au'
  ];
  var ISLAND_CODES = {};
  for (var _ic = 0; _ic < ISLAND_CODES_LIST.length; _ic++) {
    ISLAND_CODES[ISLAND_CODES_LIST[_ic]] = true;
  }

  function isIsland(code) {
    return !!ISLAND_CODES[String(code || '').toLowerCase()];
  }

  var MemoryStore = {};
  var StorageState = { persistent: true, warned: false };

  function storageProbe() {
    try {
      var k = '__ez_probe__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  StorageState.persistent = storageProbe();

  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return Object.prototype.hasOwnProperty.call(MemoryStore, key) ? MemoryStore[key] : null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      MemoryStore[key] = value;
      return true;
    } catch (e) {
      MemoryStore[key] = value;
      return false;
    }
  }

  function $id(id) { return document.getElementById(id); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return (root || document).querySelectorAll(sel); }

  function safeJsonParse(s) {
    try { return JSON.parse(s); } catch (e) { return null; }
  }

  function escHtml(text) {
    var div = document.createElement('div');
    div.textContent = String(text == null ? '' : text);
    return div.innerHTML;
  }

  function normalizeText(s) {
    s = String(s == null ? '' : s).toLowerCase();
    if (s.normalize) {
      try {
        s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      } catch (e) { /* ignore */ }
    }
    s = s.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return s;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function levenshtein(a, b) {
    a = String(a || ''); b = String(b || '');
    var m = []; var i, j;
    for (i = 0; i <= b.length; i++) m[i] = [i];
    for (j = 0; j <= a.length; j++) m[0][j] = j;
    for (i = 1; i <= b.length; i++) {
      for (j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) m[i][j] = m[i - 1][j - 1];
        else m[i][j] = Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
      }
    }
    return m[b.length][a.length];
  }

  function toast(kind, message) {
    var container = $id('toast-container');
    if (!container) return;
    var el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.textContent = String(message || '');
    container.appendChild(el);
    window.setTimeout(function () {
      el.className += ' hiding';
      window.setTimeout(function () {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }, 350);
    }, 3000);
  }

  function sdkAvailable() {
    return !!(window.ezgalaxy && window.ezgalaxy.app);
  }

  function updateStorageStatus() {
    var el = $id('storage-status');
    if (!el) return;
    var parts = [];
    parts.push(StorageState.persistent ? '💾 Stockage local: OK' : '💾 Stockage local: BLOQUÉ');
    parts.push(sdkAvailable() ? '☁️ Cloud: SDK disponible' : '☁️ Cloud: SDK non disponible');
    el.textContent = parts.join(' — ');
  }

  /* ═══════════════════════════════════════════
     LEADERBOARD — local + cloud
     ═══════════════════════════════════════════ */
  function getLocalLeaderboards() {
    var parsed = safeJsonParse(storageGet(STORAGE_LOCAL_LB));
    if (!parsed) return { easy: [], normal: [], hard: [] };
    return {
      easy: parsed.easy && parsed.easy.length ? parsed.easy : [],
      normal: parsed.normal && parsed.normal.length ? parsed.normal : [],
      hard: parsed.hard && parsed.hard.length ? parsed.hard : []
    };
  }

  function writeLocalLeaderboards(lbs) {
    storageSet(STORAGE_LOCAL_LB, JSON.stringify(lbs));
  }

  function sanitizeLeaderboard(items) {
    var out = [];
    for (var i = 0; i < (items || []).length; i++) {
      var it = items[i] || {};
      var pseudo = String(it.pseudo || '').trim();
      var score = Number(it.score || 0);
      if (!pseudo || !isFinite(score)) continue;
      out.push({ pseudo: pseudo, score: score, date: it.date });
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, 10);
  }

  function saveLocalScore(mode, pseudo, score) {
    var lbs = getLocalLeaderboards();
    var items = lbs[mode] || [];
    var now = new Date().toISOString();

    var bestExisting = null;
    for (var i = 0; i < items.length; i++) {
      if (normalizeText(items[i].pseudo) === normalizeText(pseudo)) {
        bestExisting = items[i]; break;
      }
    }

    var existingScore = bestExisting ? Number(bestExisting.score || 0) : 0;
    var best = Math.max(existingScore, Number(score || 0));

    var next = [];
    for (i = 0; i < items.length; i++) {
      if (normalizeText(items[i].pseudo) !== normalizeText(pseudo)) next.push(items[i]);
    }
    next.push({ pseudo: pseudo, score: best, date: now });
    next.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    lbs[mode] = next.slice(0, 10);
    writeLocalLeaderboards(lbs);

    return { leaderboard: lbs[mode], best: best, isNew: best > existingScore };
  }

  function fetchLeaderboard(mode, cb) {
    var local = getLocalLeaderboards()[mode] || [];
    if (!sdkAvailable()) return cb(local);

    var recordKey = 'lb_' + mode;
    ezgalaxy.app.get('leaderboards', recordKey).then(function (record) {
      if (!record) return cb(local);
      var items = record.data && record.data.items ? record.data.items : [];
      cb(sanitizeLeaderboard(items));
    }).catch(function () { cb(local); });
  }

  function saveScore(mode, pseudo, score, cb) {
    var localRes = saveLocalScore(mode, pseudo, score);

    if (!sdkAvailable()) {
      if (!StorageState.persistent && !StorageState.warned) {
        StorageState.warned = true;
        toast('error', 'Stockage local bloqué: score non persistant');
      } else {
        toast('info', StorageState.persistent ? 'Score enregistré (local)' : 'Score enregistré (mémoire)');
      }
      return cb({ api: false, local: true, isNew: localRes.isNew, best: localRes.best });
    }

    var recordKey = 'lb_' + mode;
    ezgalaxy.app.get('leaderboards', recordKey).then(function (record) {
      var items = [];
      if (record && record.data && record.data.items) items = record.data.items;
      var merged = sanitizeLeaderboard(items);

      var existingCloudScore = 0;
      for (var i = 0; i < merged.length; i++) {
        if (normalizeText(merged[i].pseudo) === normalizeText(pseudo)) {
          existingCloudScore = merged[i].score; break;
        }
      }

      var bestCloud = Math.max(existingCloudScore, Number(score || 0));
      var next = [];
      for (i = 0; i < merged.length; i++) {
        if (normalizeText(merged[i].pseudo) !== normalizeText(pseudo)) next.push(merged[i]);
      }
      next.push({ pseudo: pseudo, score: bestCloud, date: new Date().toISOString() });
      next.sort(function (a, b) { return b.score - a.score; });
      next = next.slice(0, 10);

      ezgalaxy.app.set('leaderboards', recordKey, { items: next }).then(function () {
        toast('success', 'Score enregistré (cloud)');
        cb({ api: true, local: true, isNew: localRes.isNew || (bestCloud > existingCloudScore), best: Math.max(localRes.best, bestCloud) });
      }).catch(function () {
        toast('error', 'Cloud KO (local OK)');
        cb({ api: false, local: true, isNew: localRes.isNew, best: localRes.best });
      });
    }).catch(function () {
      toast('error', 'Cloud KO (local OK)');
      cb({ api: false, local: true, isNew: localRes.isNew, best: localRes.best });
    });
  }

  /* ═══════════════════════════════════════════
     COUNTRIES / CAPITALS DATA
     ═══════════════════════════════════════════ */
  var COUNTRIES_FALLBACK = [
    { code: 'fr', country: 'France', capital: 'Paris', alt: ['paris'] },
    { code: 'de', country: 'Allemagne', capital: 'Berlin', alt: ['berlin'] },
    { code: 'es', country: 'Espagne', capital: 'Madrid', alt: ['madrid'] },
    { code: 'it', country: 'Italie', capital: 'Rome', alt: ['rome', 'roma'] },
    { code: 'pt', country: 'Portugal', capital: 'Lisbonne', alt: ['lisbonne', 'lisboa', 'lisbon'] },
    { code: 'gb', country: 'Royaume-Uni', capital: 'Londres', alt: ['londres', 'london'] },
    { code: 'jp', country: 'Japon', capital: 'Tokyo', alt: ['tokyo'] },
    { code: 'cn', country: 'Chine', capital: 'Pékin', alt: ['pekin', 'beijing'] },
    { code: 'br', country: 'Brésil', capital: 'Brasília', alt: ['brasilia'] },
    { code: 'ca', country: 'Canada', capital: 'Ottawa', alt: ['ottawa'] },
    { code: 'au', country: 'Australie', capital: 'Canberra', alt: ['canberra'] },
    { code: 'in', country: 'Inde', capital: 'New Delhi', alt: ['new delhi', 'delhi'] },
    { code: 'ru', country: 'Russie', capital: 'Moscou', alt: ['moscou', 'moscow'] },
    { code: 'mx', country: 'Mexique', capital: 'Mexico', alt: ['mexico', 'mexico city'] },
    { code: 'ar', country: 'Argentine', capital: 'Buenos Aires', alt: ['buenos aires'] },
    { code: 'eg', country: 'Égypte', capital: 'Le Caire', alt: ['le caire', 'cairo'] },
    { code: 'ma', country: 'Maroc', capital: 'Rabat', alt: ['rabat'] },
    { code: 'tr', country: 'Turquie', capital: 'Ankara', alt: ['ankara'] },
    { code: 'kr', country: 'Corée du Sud', capital: 'Séoul', alt: ['seoul'] },
    { code: 'th', country: 'Thaïlande', capital: 'Bangkok', alt: ['bangkok'] },
    { code: 'us', country: 'États-Unis', capital: 'Washington D.C.', alt: ['washington', 'washington dc', 'washington d c'] },
    { code: 'za', country: 'Afrique du Sud', capital: 'Pretoria', alt: ['pretoria'] },
    { code: 'se', country: 'Suède', capital: 'Stockholm', alt: ['stockholm'] },
    { code: 'no', country: 'Norvège', capital: 'Oslo', alt: ['oslo'] },
    { code: 'fi', country: 'Finlande', capital: 'Helsinki', alt: ['helsinki'] },
    { code: 'dk', country: 'Danemark', capital: 'Copenhague', alt: ['copenhague', 'copenhagen'] },
    { code: 'pl', country: 'Pologne', capital: 'Varsovie', alt: ['varsovie', 'warsaw', 'warszawa'] },
    { code: 'at', country: 'Autriche', capital: 'Vienne', alt: ['vienne', 'vienna', 'wien'] },
    { code: 'ch', country: 'Suisse', capital: 'Berne', alt: ['berne', 'bern'] },
    { code: 'be', country: 'Belgique', capital: 'Bruxelles', alt: ['bruxelles', 'brussels'] },
    { code: 'nl', country: 'Pays-Bas', capital: 'Amsterdam', alt: ['amsterdam'] },
    { code: 'ie', country: 'Irlande', capital: 'Dublin', alt: ['dublin'] },
    { code: 'gr', country: 'Grèce', capital: 'Athènes', alt: ['athenes', 'athens'] },
    { code: 'cz', country: 'Tchéquie', capital: 'Prague', alt: ['prague', 'praha'] },
    { code: 'ro', country: 'Roumanie', capital: 'Bucarest', alt: ['bucarest', 'bucharest'] },
    { code: 'hu', country: 'Hongrie', capital: 'Budapest', alt: ['budapest'] },
    { code: 'pe', country: 'Pérou', capital: 'Lima', alt: ['lima'] },
    { code: 'co', country: 'Colombie', capital: 'Bogota', alt: ['bogota'] },
    { code: 'cl', country: 'Chili', capital: 'Santiago', alt: ['santiago'] },
    { code: 'ke', country: 'Kenya', capital: 'Nairobi', alt: ['nairobi'] }
  ];

  var Countries = { ready: false, error: null, items: [] };

  function toCapitalShape(c) {
    return {
      code: String(c.code || '').toLowerCase(),
      country: String(c.country || '').trim(),
      capital: String(c.capital || '').trim(),
      alt: c.alt || [],
      flagUrl: c.code ? (FLAG_CDN + '/' + String(c.code).toLowerCase() + '.png') : ''
    };
  }

  function setCountries(items, errorMsg) {
    Countries.items = [];
    for (var i = 0; i < items.length; i++) {
      var cc = toCapitalShape(items[i]);
      if (cc.code && cc.country && cc.capital) Countries.items.push(cc);
    }
    Countries.ready = true;
    Countries.error = errorMsg || null;
    updateCountriesStatus();
    updateStartButton();
  }

  function updateCountriesStatus() {
    var el = $id('countries-status');
    if (!el) return;
    if (!Countries.ready) {
      el.textContent = '🌍 Chargement des pays et capitales…';
      return;
    }
    var n = Countries.items.length;
    if (Countries.error) el.textContent = '⚠️ ' + Countries.error + ' — ' + n + ' capitales dispo';
    else el.textContent = '✅ ' + n + ' capitales chargées';
  }

  /* ── XHR helper (ES5-compatible) ── */
  function xhrJson(method, url, headers, body, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    if (headers) {
      for (var key in headers) {
        if (Object.prototype.hasOwnProperty.call(headers, key)) {
          xhr.setRequestHeader(key, headers[key]);
        }
      }
    }
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      cb(xhr.status, null, xhr.responseText);
    };
    xhr.onerror = function () { cb(0, null, ''); };
    xhr.send(body ? JSON.stringify(body) : null);
  }

  function loadCountries() {
    var cached = safeJsonParse(storageGet(STORAGE_COUNTRIES_CACHE));
    if (cached && cached.at && cached.items && cached.items.length) {
      var age = Date.now() - Number(cached.at);
      if (age >= 0 && age < COUNTRIES_CACHE_TTL_MS && cached.items.length >= 100) {
        return setCountries(cached.items, null);
      }
    }

    xhrJson('GET', RESTCOUNTRIES_URL, null, null, function (status, json, raw) {
      if (status !== 200) {
        setCountries(COUNTRIES_FALLBACK, 'Liste complète indisponible (réseau)');
        return;
      }

      var arr = safeJsonParse(raw);
      if (!arr || !arr.length) {
        setCountries(COUNTRIES_FALLBACK, 'Liste complète invalide');
        return;
      }

      var items = [];
      for (var i = 0; i < arr.length; i++) {
        var c = arr[i] || {};
        var cca2 = String(c.cca2 || '').toLowerCase();
        var nameObj = c.name || {};
        var translations = c.translations || {};
        var fra = translations.fra || {};
        var capitals = c.capital || [];

        if (!cca2 || !capitals.length) continue;

        var nameFr = fra.common || nameObj.common || '';
        var nameCommon = nameObj.common || '';
        var capitalName = capitals[0];

        if (!capitalName || !capitalName.trim()) continue;

        // Build alt names for the capital (all capital entries)
        var alt = [];
        for (var ci = 0; ci < capitals.length; ci++) {
          alt.push(capitals[ci]);
        }

        items.push({
          code: cca2,
          country: String(nameFr || nameCommon || '').trim(),
          capital: capitalName.trim(),
          alt: alt
        });
      }

      if (items.length < 100) {
        setCountries(COUNTRIES_FALLBACK, 'Liste complète trop courte');
        return;
      }

      storageSet(STORAGE_COUNTRIES_CACHE, JSON.stringify({ at: Date.now(), items: items }));
      setCountries(items, null);
    });
  }

  /* ═══════════════════════════════════════════
     APP STATE
     ═══════════════════════════════════════════ */
  var App = {
    pseudo: '',
    mode: null,
    islandFilter: 'all', // 'all' | 'no-islands' | 'only-islands'
    lives: 3,
    score: 0,
    countries: [],
    idx: 0,
    current: null,
    isAnswered: false,
    timerId: null,
    timerStartedAt: 0,
    leaderboard: { easy: [], normal: [], hard: [] },
    lbTab: 'easy'
  };

  /* ═══════════════════════════════════════════
     RENDER — MAIN
     ═══════════════════════════════════════════ */
  function render() {
    var app = $id('app');
    if (!app) return;

    app.innerHTML = ''
      + '<header class="game-header">'
      + '  <h1 class="game-title">🌍 World Capitals</h1>'
      + '  <p class="game-subtitle">Devine la capitale de chaque pays !</p>'
      + '</header>'
      + '<div id="screen-home" class="screen">' + renderHome() + '</div>'
      + '<div id="screen-game" class="screen screen-hidden">' + renderGame() + '</div>'
      + '<div id="screen-gameover" class="screen screen-hidden">' + renderOver() + '</div>';

    bindHomeEvents();
    updateCountriesStatus();
    updateStorageStatus();
    updateStartButton();
    loadLeaderboards();
  }

  function renderHome() {
    var savedPseudo = storageGet(STORAGE_PSEUDO) || '';
    return ''
      + '<div class="ez-card ez-fade-in">'
      + '  <div class="pseudo-section">'
      + '    <h3>👤 Ton pseudo</h3>'
      + '    <div class="input-group">'
      + '      <input type="text" id="pseudo-input" class="input-field" placeholder="Entre ton pseudo..." value="' + escHtml(savedPseudo) + '" maxlength="20">'
      + '    </div>'
      + '  </div>'
      + '  <p id="countries-status" class="ez-muted" style="margin: 0 0 16px 0;"></p>'
      + '  <p id="storage-status" class="ez-muted" style="margin: -6px 0 16px 0;"></p>'
      + '  <div class="mode-section">'
      + '    <h3>🎮 Choisis ton mode</h3>'
      + '    <div class="mode-cards">'
      + '      <div class="mode-card" data-mode="easy"><span class="mode-icon">😊</span><div class="mode-info"><h4>Facile</h4><p>3 propositions au choix</p></div></div>'
      + '      <div class="mode-card" data-mode="normal"><span class="mode-icon">🤔</span><div class="mode-info"><h4>Normal</h4><p>Écris le nom de la capitale</p></div></div>'
      + '      <div class="mode-card" data-mode="hard"><span class="mode-icon">😈</span><div class="mode-info"><h4>Difficile</h4><p>Écris la capitale en 8 secondes</p></div></div>'
      + '    </div>'
      + '  </div>'
      + '  <div class="island-section">'
      + '    <h3>🏝️ Filtre îles</h3>'
      + '    <div class="island-cards">'
      + '      <div class="island-card selected" data-island="all"><span class="island-icon">🌍</span><div class="island-info"><h4>Tous</h4><p>Tous les pays</p></div></div>'
      + '      <div class="island-card" data-island="no-islands"><span class="island-icon">🏔️</span><div class="island-info"><h4>Sans îles</h4><p>Exclure les îles</p></div></div>'
      + '      <div class="island-card" data-island="only-islands"><span class="island-icon">🏝️</span><div class="island-info"><h4>Îles uniquement</h4><p>Mode expert des îles</p></div></div>'
      + '    </div>'
      + '  </div>'
      + '  <div class="leaderboard-section">'
      + '    <h3>🏆 Classement</h3>'
      + '    <div class="leaderboard-tabs">'
      + '      <button class="leaderboard-tab active" data-tab="easy">Facile</button>'
      + '      <button class="leaderboard-tab" data-tab="normal">Normal</button>'
      + '      <button class="leaderboard-tab" data-tab="hard">Difficile</button>'
      + '    </div>'
      + '    <div id="leaderboard-content" class="leaderboard-list"><div class="loading"><span class="spinner"></span> Chargement...</div></div>'
      + '  </div>'
      + '  <button id="start-btn" class="start-btn" disabled>🚀 Commencer la partie</button>'
      + '</div>';
  }

  function renderGame() {
    return ''
      + '<div class="ez-card">'
      + '  <div class="game-hud">'
      + '    <div class="hud-lives" id="lives-display">'
      + '      <span class="heart">❤️</span><span class="heart">❤️</span><span class="heart">❤️</span>'
      + '    </div>'
      + '    <div class="hud-score">Score: <span id="score-display">0</span></div>'
      + '    <div class="hud-mode" id="mode-display">Mode</div>'
      + '  </div>'
      + '  <div id="timer-container" class="timer-container" style="display:none;">'
      + '    <div id="timer-bar" class="timer-bar" style="width:100%;"></div>'
      + '  </div>'
      + '  <div class="country-container">'
      + '    <img id="country-flag" class="country-flag" src="" alt="Drapeau">'
      + '    <h2 id="country-name" class="country-name"></h2>'
      + '  </div>'
      + '  <div id="answer-section" class="answer-section"></div>'
      + '  <div id="feedback" class="feedback" style="display:none;"></div>'
      + '</div>';
  }

  function renderOver() {
    return ''
      + '<div class="ez-card ez-fade-in gameover-content">'
      + '  <h2 class="gameover-title">💀 Game Over</h2>'
      + '  <p>Tu as perdu toutes tes vies !</p>'
      + '  <div class="gameover-score" id="final-score">0</div>'
      + '  <p>points</p>'
      + '  <div id="record-message" class="gameover-record"></div>'
      + '  <div class="gameover-buttons">'
      + '    <button id="replay-btn" class="gameover-btn primary">🔄 Rejouer</button>'
      + '    <button id="home-btn" class="gameover-btn secondary">🏠 Accueil</button>'
      + '  </div>'
      + '</div>';
  }

  /* ═══════════════════════════════════════════
     EVENT BINDING
     ═══════════════════════════════════════════ */
  function bindHomeEvents() {
    var pseudoInput = $id('pseudo-input');
    if (pseudoInput) {
      App.pseudo = String(pseudoInput.value || '').trim();
      pseudoInput.oninput = function (e) {
        App.pseudo = String(e.target.value || '').trim();
        storageSet(STORAGE_PSEUDO, App.pseudo);
        updateStartButton();
      };
    }

    var cards = $all('.mode-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].onclick = function () {
        for (var j = 0; j < cards.length; j++) cards[j].classList.remove('selected');
        this.classList.add('selected');
        App.mode = this.getAttribute('data-mode');
        updateStartButton();
      };
    }

    var tabs = $all('.leaderboard-tab');
    for (i = 0; i < tabs.length; i++) {
      tabs[i].onclick = function () {
        for (var j2 = 0; j2 < tabs.length; j2++) tabs[j2].classList.remove('active');
        this.classList.add('active');
        App.lbTab = this.getAttribute('data-tab');
        updateLeaderboardUI();
      };
    }

    var islandCards = $all('.island-card');
    for (i = 0; i < islandCards.length; i++) {
      islandCards[i].onclick = function () {
        for (var j3 = 0; j3 < islandCards.length; j3++) islandCards[j3].classList.remove('selected');
        this.classList.add('selected');
        App.islandFilter = this.getAttribute('data-island');
        updateStartButton();
      };
    }

    var startBtn = $id('start-btn');
    if (startBtn) startBtn.onclick = startGame;

    var replay = $id('replay-btn');
    if (replay) replay.onclick = function () { startGame(); };
    var home = $id('home-btn');
    if (home) home.onclick = showHome;
  }

  function updateStartButton() {
    var btn = $id('start-btn');
    if (!btn) return;
    var pool = getFilteredCountries();
    btn.disabled = !(App.pseudo && App.mode && Countries.ready && pool.length);
    // Update count hint
    var el = $id('countries-status');
    if (el && Countries.ready) {
      var total = Countries.items.length;
      if (App.islandFilter === 'only-islands') {
        el.textContent = '🏝️ ' + pool.length + ' îles / ' + total + ' pays';
      } else if (App.islandFilter === 'no-islands') {
        el.textContent = '🏔️ ' + pool.length + ' pays (sans îles) / ' + total + ' total';
      } else {
        el.textContent = '✅ ' + total + ' capitales chargées';
      }
    }
  }

  function getFilteredCountries() {
    if (!Countries.items.length) return [];
    if (App.islandFilter === 'only-islands') {
      return Countries.items.filter(function (c) { return isIsland(c.code); });
    }
    if (App.islandFilter === 'no-islands') {
      return Countries.items.filter(function (c) { return !isIsland(c.code); });
    }
    return Countries.items;
  }

  /* ═══════════════════════════════════════════
     SCREEN NAVIGATION
     ═══════════════════════════════════════════ */
  function showHome() {
    $id('screen-home').classList.remove('screen-hidden');
    $id('screen-game').classList.add('screen-hidden');
    $id('screen-gameover').classList.add('screen-hidden');
    loadLeaderboards();
  }

  function showGame() {
    $id('screen-home').classList.add('screen-hidden');
    $id('screen-game').classList.remove('screen-hidden');
    $id('screen-gameover').classList.add('screen-hidden');
  }

  function showOver() {
    $id('screen-home').classList.add('screen-hidden');
    $id('screen-game').classList.add('screen-hidden');
    $id('screen-gameover').classList.remove('screen-hidden');

    $id('final-score').textContent = String(App.score);
    var msg = $id('record-message');
    if (msg) msg.textContent = 'Sauvegarde du score…';

    saveScore(App.mode, App.pseudo, App.score, function (result) {
      if (msg) {
        if (result && result.isNew) msg.textContent = result.api ? '🏆 Nouveau record (cloud) !' : '🏆 Nouveau record (local) !';
        else msg.textContent = 'Record: ' + String(result && typeof result.best !== 'undefined' ? result.best : App.score) + ' pts';
      }
      loadLeaderboards();
    });

    var replay = $id('replay-btn');
    if (replay) replay.onclick = function () { startGame(); };
    var home = $id('home-btn');
    if (home) home.onclick = showHome;
  }

  /* ═══════════════════════════════════════════
     HUD
     ═══════════════════════════════════════════ */
  function updateHUD() {
    $id('score-display').textContent = String(App.score);
    var hearts = $all('.heart');
    for (var i = 0; i < hearts.length; i++) {
      if (hearts[i].classList.contains('losing')) continue; // don't override animation
      if (i >= App.lives) hearts[i].classList.add('lost');
      else { hearts[i].classList.remove('lost'); hearts[i].classList.remove('losing'); }
    }
    var modeNames = { easy: 'Facile', normal: 'Normal', hard: 'Difficile' };
    $id('mode-display').textContent = modeNames[App.mode] || 'Mode';
  }

  function animateHeartLoss() {
    var hearts = $all('.heart');
    var idx = App.lives; // after decrement: lives=2→hearts[2], lives=1→hearts[1], lives=0→hearts[0]
    if (hearts[idx]) {
      hearts[idx].classList.add('losing');
      window.setTimeout(function () {
        if (!hearts[idx]) return;
        hearts[idx].classList.remove('losing');
        hearts[idx].classList.add('lost');
      }, 500);
    }
  }

  /* ═══════════════════════════════════════════
     ANSWER CHECKING — fuzzy matching
     ═══════════════════════════════════════════ */
  function checkAnswer(input) {
    var c = App.current;
    var ans = normalizeText(input);
    var cap = normalizeText(c.capital);

    if (ans === cap) return true;

    for (var i = 0; i < (c.alt || []).length; i++) {
      if (ans === normalizeText(c.alt[i])) return true;
    }

    var maxDist = Math.min(2, Math.floor(cap.length / 4));
    if (levenshtein(ans, cap) <= maxDist) return true;

    for (i = 0; i < (c.alt || []).length; i++) {
      var alt = normalizeText(c.alt[i]);
      var maxDistAlt = Math.min(2, Math.floor(alt.length / 4));
      if (levenshtein(ans, alt) <= maxDistAlt) return true;
    }

    return false;
  }

  /* ═══════════════════════════════════════════
     GAME FLOW
     ═══════════════════════════════════════════ */
  function startGame() {
    var pool = getFilteredCountries();
    if (!Countries.ready || !pool.length) {
      toast('error', 'Pays non chargés');
      return;
    }

    App.lives = 3;
    App.score = 0;
    App.idx = 0;
    App.isAnswered = false;
    App.countries = shuffle(pool);

    showGame();
    updateHUD();

    var timerContainer = $id('timer-container');
    if (timerContainer) timerContainer.style.display = (App.mode === 'hard') ? 'block' : 'none';

    nextQuestion();
  }

  function nextQuestion() {
    if (App.lives <= 0) return showOver();

    App.isAnswered = false;
    if (App.timerId) {
      window.clearInterval(App.timerId);
      App.timerId = null;
    }

    if (App.idx >= App.countries.length) {
      App.countries = shuffle(getFilteredCountries());
      App.idx = 0;
    }

    App.current = App.countries[App.idx++];

    // Show country name and small flag
    var flag = $id('country-flag');
    if (flag) {
      flag.src = App.current.flagUrl;
      flag.alt = App.current.country;
      flag.onerror = function () { flag.style.display = 'none'; };
      flag.style.display = '';
    }

    var nameEl = $id('country-name');
    if (nameEl) {
      nameEl.textContent = App.current.country;
      nameEl.className = 'country-name';
    }

    var feedback = $id('feedback');
    if (feedback) feedback.style.display = 'none';

    renderAnswerSection();

    if (App.mode === 'hard') startTimer();
  }

  function renderAnswerSection() {
    var section = $id('answer-section');
    if (!section) return;

    if (App.mode === 'easy') {
      var choices = generateChoices(App.current, 3);
      var html = '<div class="choices-container">';
      for (var i = 0; i < choices.length; i++) {
        html += '<button class="choice-btn" data-code="' + escHtml(choices[i].code) + '">' + escHtml(choices[i].capital) + '</button>';
      }
      html += '</div>';
      section.innerHTML = html;

      var btns = $all('.choice-btn', section);
      for (i = 0; i < btns.length; i++) {
        btns[i].onclick = function () {
          if (App.isAnswered) return;
          handleChoice(this.getAttribute('data-code'));
        };
      }
    } else {
      section.innerHTML = ''
        + '<div class="answer-input-container">'
        + '  <input type="text" id="answer-input" class="answer-input" placeholder="Nom de la capitale..." autocomplete="off">'
        + '  <button id="submit-answer" class="submit-btn">Valider</button>'
        + '</div>';

      var input = $id('answer-input');
      var submit = $id('submit-answer');
      if (input) input.focus();

      if (input) input.onkeypress = function (e) {
        e = e || window.event;
        var key = e.key || e.keyCode;
        if ((key === 'Enter' || key === 13) && !App.isAnswered) handleInput(this.value);
      };
      if (submit) submit.onclick = function () {
        if (!App.isAnswered) handleInput(input ? input.value : '');
      };
    }
  }

  function generateChoices(correct, count) {
    var pool = [];
    for (var i = 0; i < Countries.items.length; i++) {
      if (Countries.items[i].code !== correct.code) pool.push(Countries.items[i]);
    }
    pool = shuffle(pool);

    var choices = [correct];
    for (i = 0; i < (count - 1) && i < pool.length; i++) choices.push(pool[i]);
    return shuffle(choices);
  }

  function handleChoice(code) {
    App.isAnswered = true;
    stopTimer();

    var correct = (code === App.current.code);
    var buttons = $all('.choice-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = true;
      if (buttons[i].getAttribute('data-code') === App.current.code) buttons[i].classList.add('correct');
      else if (buttons[i].getAttribute('data-code') === code && !correct) buttons[i].classList.add('wrong');
    }

    processAnswer(correct);
  }

  function handleInput(answer) {
    App.isAnswered = true;
    stopTimer();

    var input = $id('answer-input');
    var submit = $id('submit-answer');
    if (input) input.disabled = true;
    if (submit) submit.disabled = true;

    var correct = checkAnswer(answer);
    if (input) input.classList.add(correct ? 'correct' : 'wrong');

    processAnswer(correct);
  }

  function processAnswer(correct) {
    var nameEl = $id('country-name');
    var feedback = $id('feedback');

    if (correct) {
      App.score += 1;
      if (nameEl) nameEl.classList.add('correct');
      if (feedback) {
        feedback.className = 'feedback correct';
        feedback.innerHTML = '✅ Bravo ! C\'est bien <strong>' + escHtml(App.current.capital) + '</strong>';
        feedback.style.display = 'block';
      }
    } else {
      App.lives -= 1;
      if (nameEl) nameEl.classList.add('wrong');
      if (feedback) {
        feedback.className = 'feedback wrong';
        feedback.innerHTML = '❌ Raté ! C\'était <strong>' + escHtml(App.current.capital) + '</strong>';
        feedback.style.display = 'block';
      }
      animateHeartLoss();
    }

    updateHUD();

    window.setTimeout(function () {
      nextQuestion();
    }, 1500);
  }

  /* ═══════════════════════════════════════════
     TIMER (hard mode)
     ═══════════════════════════════════════════ */
  function startTimer() {
    stopTimer();

    var bar = $id('timer-bar');
    if (!bar) return;
    bar.style.width = '100%';
    bar.classList.remove('urgent');

    App.timerStartedAt = Date.now();
    App.timerId = window.setInterval(function () {
      if (App.isAnswered) return;
      var elapsed = Date.now() - App.timerStartedAt;
      var remaining = Math.max(0, TIMER_DURATION_MS - elapsed);
      var pct = (remaining / TIMER_DURATION_MS) * 100;
      bar.style.width = String(pct) + '%';
      if (pct < 30) bar.classList.add('urgent');
      if (remaining <= 0) {
        stopTimer();
        timeUp();
      }
    }, 50);
  }

  function stopTimer() {
    if (App.timerId) {
      window.clearInterval(App.timerId);
      App.timerId = null;
    }
  }

  function timeUp() {
    if (App.isAnswered) return;
    App.isAnswered = true;

    var input = $id('answer-input');
    var submit = $id('submit-answer');
    if (input) input.disabled = true;
    if (submit) submit.disabled = true;

    App.lives -= 1;

    var nameEl = $id('country-name');
    var feedback = $id('feedback');
    if (nameEl) nameEl.classList.add('wrong');
    if (feedback) {
      feedback.className = 'feedback wrong';
      feedback.innerHTML = '⏰ Temps écoulé ! C\'était <strong>' + escHtml(App.current.capital) + '</strong>';
      feedback.style.display = 'block';
    }

    animateHeartLoss();
    updateHUD();

    window.setTimeout(function () { nextQuestion(); }, 1500);
  }

  /* ═══════════════════════════════════════════
     LEADERBOARD UI
     ═══════════════════════════════════════════ */
  function renderLeaderboardList(items) {
    items = items || [];
    if (!items.length) return '<div class="leaderboard-empty">Aucun score enregistré</div>';

    var html = '';
    for (var i = 0; i < items.length; i++) {
      var medal = (i === 0) ? '🥇' : (i === 1) ? '🥈' : (i === 2) ? '🥉' : String(i + 1) + '.';
      html += ''
        + '<div class="leaderboard-item">'
        + '  <span class="leaderboard-rank">' + escHtml(medal) + '</span>'
        + '  <span class="leaderboard-name">' + escHtml(items[i].pseudo) + '</span>'
        + '  <span class="leaderboard-score">' + escHtml(items[i].score) + '</span>'
        + '</div>';
    }
    return html;
  }

  function updateLeaderboardUI() {
    var el = $id('leaderboard-content');
    if (!el) return;
    el.innerHTML = renderLeaderboardList(App.leaderboard[App.lbTab] || []);
  }

  function loadLeaderboards() {
    var modes = ['easy', 'normal', 'hard'];
    var left = modes.length;

    function done() {
      left -= 1;
      if (left <= 0) updateLeaderboardUI();
    }

    for (var i = 0; i < modes.length; i++) {
      (function (mode) {
        fetchLeaderboard(mode, function (items) {
          App.leaderboard[mode] = items;
          done();
        });
      })(modes[i]);
    }
  }

  /* ═══════════════════════════════════════════
     BOOT
     ═══════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    try {
      if (!StorageState.persistent && window.__ezShowError) {
        window.__ezShowError('⚠️ Stockage local bloqué par le WebView.\nLes scores ne seront pas persistants sans API Cloud.');
      }
      render();
      loadCountries();
    } catch (e) {
      try { toast('error', 'Erreur au démarrage'); } catch (e2) {}
      throw e;
    }
  });
})();
