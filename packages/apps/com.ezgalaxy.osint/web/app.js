(() => {
  'use strict';

  const EXTENSION_ID = 'com.ezgalaxy.osint';

  const DEFAULT_CONNECTORS = {
    compliant: [
      { id: 'dns', label: 'DNS', desc: 'Résolution (A/AAAA/MX/NS/TXT) — requêtes contrôlées via proxy.' },
      { id: 'rdap', label: 'RDAP', desc: 'Données registres (IP/ASN/domaine) — plus propre que du scraping WHOIS.' },
      { id: 'ct', label: 'CT', desc: 'Certificate Transparency — noms/SANs visibles dans les journaux publics.' },
      { id: 'revdns', label: 'Reverse DNS', desc: 'PTR (revDNS) — utile pour contextualiser une IP.' }
    ],
    aggressive: [
      { id: 'content_fetch', label: 'Content Fetch', desc: 'Récupération HTTP plus poussée (risque légal/OPSEC).', needsAdmin: true },
      { id: 'subdomain_enum', label: 'Subdomain Enum', desc: 'Énumération (potentiellement bruyante).', needsAdmin: true },
      { id: 'port_scan', label: 'Port Scan', desc: 'Contrôles de ports (très bruyant) — admin uniquement.', needsAdmin: true }
    ]
  };

  const $ = (sel, root = document) => root.querySelector(sel);

  function uid(prefix = 'id') {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function safeJsonParse(s) {
    try { return JSON.parse(s); } catch { return null; }
  }

  function safeJsonStringify(obj) {
    try { return JSON.stringify(obj); } catch { return 'null'; }
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function fmtWhen(ts) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('fr-FR');
  }

  function toast(kind, title, msg) {
    App.toasts.push({ id: uid('t'), kind, title, msg, at: Date.now() });
    renderToasts();
    window.setTimeout(() => {
      App.toasts = App.toasts.filter((t) => t.at > Date.now() - 7000);
      renderToasts();
    }, 7600);
  }

  function normalizeEntityRef(type, value) {
    const t = String(type || '').trim().toLowerCase();
    const v = String(value || '').trim();
    return `${t}:${v}`.slice(0, 220);
  }

  function detectQueryType(q) {
    const s = String(q || '').trim();
    if (!s) return { queryType: 'unknown', normalized: '' };

    // URL
    if (/^https?:\/\//i.test(s)) {
      try {
        const u = new URL(s);
        return { queryType: 'url', normalized: u.toString() };
      } catch {
        return { queryType: 'url', normalized: s };
      }
    }

    // Email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return { queryType: 'email', normalized: s.toLowerCase() };

    // IPv4
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(s)) return { queryType: 'ip', normalized: s };

    // IPv6 (simple)
    if (/^[0-9a-fA-F:]+$/.test(s) && s.includes(':') && s.length >= 3) return { queryType: 'ip', normalized: s };

    // Domain (basic)
    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(s) && !s.includes('..')) return { queryType: 'domain', normalized: s.toLowerCase() };

    // Username/handle
    if (/^@?[a-zA-Z0-9_\-.]{3,32}$/.test(s)) return { queryType: 'username', normalized: s.replace(/^@/, '') };

    return { queryType: 'text', normalized: s };
  }

  async function apiFetchJson(path, { method = 'GET', headers = {}, body = null, signal = null } = {}) {
    const h = new Headers(headers);
    h.set('Accept', 'application/json');
    if (body != null) h.set('Content-Type', 'application/json');

    if (App.token) h.set('Authorization', `Bearer ${App.token}`);
    if (App.mode === 'aggressive' && App.aggressiveToken) h.set('X-OSINT-Aggressive-Token', App.aggressiveToken);

    const res = await fetch(path, {
      method,
      headers: h,
      body: body == null ? null : JSON.stringify(body),
      signal
    });

    const text = await res.text();
    const json = text ? safeJsonParse(text) : null;

    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.payload = json ?? text;
      throw err;
    }

    return json;
  }

  async function communityList(collection, { limit = 200, offset = 0, prefix = '' } = {}) {
    const qp = new URLSearchParams();
    qp.set('limit', String(clamp(limit, 1, 200)));
    qp.set('offset', String(Math.max(0, offset)));
    if (prefix) qp.set('prefix', prefix);
    return apiFetchJson(`/api/community/${encodeURIComponent(EXTENSION_ID)}/${encodeURIComponent(collection)}?${qp.toString()}`);
  }

  async function communityGet(collection, recordKey) {
    return apiFetchJson(`/api/community/${encodeURIComponent(EXTENSION_ID)}/${encodeURIComponent(collection)}/${encodeURIComponent(recordKey)}`);
  }

  async function communityPut(collection, recordKey, data) {
    return apiFetchJson(`/api/community/${encodeURIComponent(EXTENSION_ID)}/${encodeURIComponent(collection)}/${encodeURIComponent(recordKey)}`,
      {
        method: 'PUT',
        body: { data }
      }
    );
  }

  async function communityDelete(collection, recordKey) {
    return apiFetchJson(`/api/community/${encodeURIComponent(EXTENSION_ID)}/${encodeURIComponent(collection)}/${encodeURIComponent(recordKey)}`,
      { method: 'DELETE' }
    );
  }

  async function loadSettingsFromCloud() {
    if (!App.cloudEnabled || !App.token) return;

    try {
      const rec = await communityGet('settings', 'profile');
      const data = rec?.data;
      if (data && typeof data === 'object') {
        App.settings = {
          schemaVersion: 1,
          ui: {
            autoSearch: Boolean(data?.ui?.autoSearch ?? true),
            defaultMode: String(data?.ui?.defaultMode ?? 'compliant')
          },
          connectors: {
            enabledCompliant: Array.isArray(data?.connectors?.enabledCompliant) ? data.connectors.enabledCompliant : [],
            enabledAggressive: Array.isArray(data?.connectors?.enabledAggressive) ? data.connectors.enabledAggressive : []
          }
        };

        if (App.settings.ui.defaultMode === 'aggressive' && App.canAggressive) {
          App.mode = 'aggressive';
        } else {
          App.mode = 'compliant';
        }
      }
    } catch (e) {
      if (e?.status !== 404) {
        toast('warn', 'Cloud', 'Impossible de charger les réglages cloud.');
      }
    }
  }

  async function saveSettingsToCloud() {
    if (!App.cloudEnabled || !App.token) return;
    const data = {
      schemaVersion: 1,
      ui: {
        autoSearch: App.settings.ui.autoSearch,
        defaultMode: App.mode
      },
      connectors: {
        enabledCompliant: App.settings.connectors.enabledCompliant,
        enabledAggressive: App.settings.connectors.enabledAggressive
      }
    };

    try {
      App.cloudBusy = true;
      render();
      await communityPut('settings', 'profile', data);
      App.cloudBusy = false;
      App.cloudLastSyncAt = new Date().toISOString();
      render();
    } catch {
      App.cloudBusy = false;
      render();
      toast('warn', 'Cloud', 'Échec de la sauvegarde des réglages.');
    }
  }

  async function refreshSavedLists() {
    if (!App.cloudEnabled || !App.token) return;

    try {
      const searches = await communityList('saved_searches', { limit: 200, offset: 0 });
      App.saved.searches = (searches?.items || []).map((x) => ({ key: x.record_key, ...x.data, updated_at: x.updated_at }));

      const entities = await communityList('entities', { limit: 200, offset: 0 });
      App.saved.entities = (entities?.items || []).map((x) => ({ key: x.record_key, ...x.data, updated_at: x.updated_at }));

      const notes = await communityList('notes', { limit: 200, offset: 0 });
      App.saved.notes = (notes?.items || []).map((x) => ({ key: x.record_key, ...x.data, updated_at: x.updated_at }));

      render();
    } catch {
      toast('warn', 'Cloud', 'Impossible de lister les sauvegardes.');
    }
  }

  async function apiLogin(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const text = await res.text();
    const json = text ? safeJsonParse(text) : null;
    if (!res.ok) {
      const err = new Error('Login failed');
      err.status = res.status;
      err.payload = json ?? text;
      throw err;
    }

    return json;
  }

  async function loadCapabilities() {
    if (!App.token) {
      App.capabilities = null;
      App.canAggressive = false;
      App.capabilityConnectors = null;
      return;
    }

    try {
      const caps = await apiFetchJson('/api/osint/capabilities');
      App.capabilities = caps;
      App.canAggressive = Boolean(caps?.osint?.aggressive?.permitted);
      App.user = caps?.user || null;

      const serverConnectors = Array.isArray(caps?.connectors) ? caps.connectors : null;
      App.capabilityConnectors = serverConnectors;

      // If server provides connector list with modes, prefer it.
      if (serverConnectors) {
        const compliant = [];
        const aggressive = [];
        for (const c of serverConnectors) {
          const modes = Array.isArray(c?.modes) ? c.modes : [];
          if (modes.includes('compliant')) compliant.push({ id: c.id, label: c.label || c.id, desc: c.desc || '' });
          if (modes.includes('aggressive')) aggressive.push({ id: c.id, label: c.label || c.id, desc: c.desc || '', needsAdmin: true });
        }
        App.availableConnectors = { compliant, aggressive };
      }

      // Ensure mode respects permissions.
      if (App.mode === 'aggressive' && !App.canAggressive) {
        App.mode = 'compliant';
        App.aggressiveToken = null;
      }

      render();
    } catch (e) {
      // If capabilities endpoint not present, don't block the app.
      App.capabilities = null;
      App.canAggressive = false;
      App.capabilityConnectors = null;
      if (e?.status !== 404) {
        toast('warn', 'Capabilities', 'Impossible de charger les capacités.');
      }
    }
  }

  async function requestAggressiveToken(reason) {
    const res = await apiFetchJson('/api/osint/aggressive-token', {
      method: 'POST',
      body: { reason: String(reason || '').slice(0, 500) }
    });

    const token = String(res?.token || '');
    if (!token) throw new Error('Missing aggressive token');

    App.aggressiveToken = token;
    App.aggressiveExpiresAt = res?.expiresAt || null;
  }

  function enabledConnectorsForMode() {
    const available = App.availableConnectors || DEFAULT_CONNECTORS;
    const list = App.mode === 'aggressive' ? available.aggressive : available.compliant;

    const enabledSet = new Set(
      App.mode === 'aggressive'
        ? (App.settings.connectors.enabledAggressive.length ? App.settings.connectors.enabledAggressive : list.map((c) => c.id))
        : (App.settings.connectors.enabledCompliant.length ? App.settings.connectors.enabledCompliant : list.map((c) => c.id))
    );

    return list.filter((c) => enabledSet.has(c.id)).map((c) => c.id);
  }

  function scheduleAutoSearch() {
    if (!App.settings.ui.autoSearch) return;
    if (App._searchTimer) window.clearTimeout(App._searchTimer);
    App._searchTimer = window.setTimeout(() => {
      runSearch().catch(() => {});
    }, 520);
  }

  async function runSearch() {
    const raw = String(App.q || '').trim();
    if (!raw) return;

    if (App.mode === 'aggressive') {
      if (!App.canAggressive) {
        toast('warn', 'Mode agressif', 'Non autorisé.');
        App.mode = 'compliant';
        render();
        return;
      }
      if (!App.aggressiveToken) {
        toast('warn', 'Mode agressif', 'Token agressif manquant. Active-le dans Settings.');
        return;
      }
    }

    const det = detectQueryType(raw);
    const queryType = App.queryType === 'auto' ? det.queryType : App.queryType;
    const normalized = det.normalized;

    const connectors = enabledConnectorsForMode();

    if (App._abort) App._abort.abort();
    App._abort = new AbortController();

    const requestId = uid('req');
    App.busy = true;
    App.lastError = null;
    App.lastSearchAt = new Date().toISOString();
    render();

    try {
      const payload = {
        query: normalized,
        queryType,
        mode: App.mode,
        connectors,
        options: { maxEntities: 400, timeoutMs: 12000 },
        client: { requestId, uiVersion: '1.0.0' }
      };

      const res = await apiFetchJson('/api/osint/search', { method: 'POST', body: payload, signal: App._abort.signal });

      App.busy = false;
      App.results = {
        requestId,
        query: res?.query || { value: normalized, type: queryType },
        mode: res?.mode || App.mode,
        summary: res?.summary || null,
        connectors: Array.isArray(res?.connectors) ? res.connectors : [],
        entities: Array.isArray(res?.entities) ? res.entities : []
      };

      App.view = 'results';
      App.selectedEntityRef = null;
      render();
    } catch (e) {
      if (e?.name === 'AbortError') return;
      App.busy = false;
      App.lastError = e;
      render();

      const status = e?.status;
      if (status === 401) toast('warn', 'API', 'Accès refusé (401). Connecte-toi dans Settings.');
      else if (status === 403) toast('warn', 'API', 'Interdit (403).');
      else if (status === 429) toast('warn', 'API', 'Trop de requêtes (429).');
      else toast('warn', 'API', 'Erreur pendant la recherche.');
    }
  }

  async function runEnrich(entity) {
    if (!entity) return;

    const ref = entity.ref || normalizeEntityRef(entity.type, entity.value);
    if (App.entityDetails.has(ref)) {
      App.selectedEntityRef = ref;
      App.view = 'entity';
      render();
      return;
    }

    App.entityBusyRef = ref;
    render();

    try {
      const res = await apiFetchJson('/api/osint/enrich', {
        method: 'POST',
        body: {
          entity: { ref, type: entity.type, value: entity.value },
          mode: App.mode,
          connectors: enabledConnectorsForMode(),
          options: { maxItemsPerBlock: 250 }
        }
      });

      App.entityDetails.set(ref, res);
      App.entityBusyRef = null;
      App.selectedEntityRef = ref;
      App.view = 'entity';
      render();
    } catch {
      App.entityBusyRef = null;
      render();
      toast('warn', 'Enrich', 'Échec de l’enrichissement.');
    }
  }

  function buildGlobalExplanation() {
    const r = App.results;
    if (!r || !r.summary) return [];

    const lines = [];
    const entities = r.summary?.entities || null;
    if (entities) {
      const parts = [];
      for (const [k, v] of Object.entries(entities)) {
        if (typeof v === 'number') parts.push(`${k}: ${v}`);
      }
      if (parts.length) {
        lines.push({
          title: 'Résumé global',
          text: `Ce résumé agrège les entités extraites par les connecteurs actifs (${enabledConnectorsForMode().join(', ')}). Les volumes ne signifient pas “vrai” automatiquement : ils indiquent des pistes à valider.`
        });
        lines.push({ title: 'Comptages', text: parts.join(' · ') });
      }
    }

    const highlights = Array.isArray(r.summary?.highlights) ? r.summary.highlights : [];
    for (const h of highlights.slice(0, 8)) {
      lines.push({
        title: h.label || h.kind || 'Highlight',
        text: `Valeur: ${escapeHtml(h.value)}. Interprétation: ce point est un indicateur rapide; ouvre l’analyse pour la distribution et les sources.`
      });
    }

    if (!lines.length) {
      lines.push({ title: 'Résumé', text: 'Aucun résumé fourni par le proxy pour cette requête.' });
    }

    return lines;
  }

  function entityTypeCounts() {
    const m = new Map();
    const ents = App.results?.entities || [];
    for (const e of ents) {
      const t = String(e.type || 'unknown');
      m.set(t, (m.get(t) || 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }

  function connectorStatusCounts() {
    const m = new Map();
    const c = App.results?.connectors || [];
    for (const x of c) {
      const s = String(x.status || 'unknown');
      m.set(s, (m.get(s) || 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }

  function renderBarChart(el, items, { maxBars = 10 } = {}) {
    if (!el) return;

    const data = items.slice(0, maxBars);
    const max = Math.max(1, ...data.map(([, v]) => v));

    const rows = data.map(([k, v]) => {
      const w = clamp((v / max) * 100, 0, 100);
      return `
        <div style="display:flex; gap:10px; align-items:center; margin: 8px 0;">
          <div style="width: 120px; color: var(--muted); font-size: 12px; overflow:hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(k)}</div>
          <div style="flex: 1; border: 1px solid var(--border); border-radius: 999px; overflow:hidden; background: rgba(0,0,0,0.18);">
            <div style="width:${w}%; background: var(--primarySoft); padding: 8px 10px;"> <span class="small">${v}</span></div>
          </div>
        </div>
      `;
    }).join('');

    el.innerHTML = rows || '<div class="small">Pas de données.</div>';
  }

  function buildGraphData() {
    // Minimal relationship graph inferred from entity refs like domain/ip/url.
    // If the proxy returns explicit edges later, we can switch to those.
    const ents = App.results?.entities || [];

    const nodes = new Map();
    const edges = [];

    function addNode(ref, type, label) {
      if (!nodes.has(ref)) nodes.set(ref, { ref, type, label });
    }

    for (const e of ents.slice(0, 80)) {
      const ref = e.ref || normalizeEntityRef(e.type, e.value);
      addNode(ref, String(e.type || 'unknown'), String(e.value || ref));

      // Heuristics: link URLs to domain, emails to domain.
      if (String(e.type) === 'url') {
        try {
          const u = new URL(String(e.value));
          const dref = normalizeEntityRef('domain', u.hostname);
          addNode(dref, 'domain', u.hostname);
          edges.push({ from: ref, to: dref, kind: 'host' });
        } catch { /* ignore */ }
      }

      if (String(e.type) === 'email') {
        const parts = String(e.value || '').split('@');
        if (parts.length === 2) {
          const dref = normalizeEntityRef('domain', parts[1]);
          addNode(dref, 'domain', parts[1]);
          edges.push({ from: ref, to: dref, kind: 'domain' });
        }
      }
    }

    return { nodes: Array.from(nodes.values()).slice(0, 50), edges: edges.slice(0, 80) };
  }

  function renderGraph(el) {
    if (!el) return;

    const { nodes, edges } = buildGraphData();
    if (!nodes.length) {
      el.innerHTML = '<div class="small" style="padding:12px;">Pas assez de données pour un graphe.</div>';
      return;
    }

    const W = el.clientWidth || 800;
    const H = el.clientHeight || 340;

    // Simple circular layout
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) * 0.36;

    const pos = new Map();
    nodes.forEach((n, i) => {
      const a = (i / nodes.length) * Math.PI * 2;
      pos.set(n.ref, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    });

    const svgEdges = edges.map((e) => {
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      if (!a || !b) return '';
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="rgba(229,231,235,0.18)" stroke-width="1" />`;
    }).join('');

    const svgNodes = nodes.map((n) => {
      const p = pos.get(n.ref);
      const label = String(n.label || n.ref);
      return `
        <g data-ref="${escapeHtml(n.ref)}" style="cursor:pointer;">
          <circle cx="${p.x}" cy="${p.y}" r="7" fill="rgba(14,165,164,0.35)" stroke="rgba(229,231,235,0.22)" />
          <text x="${p.x + 10}" y="${p.y + 4}" fill="rgba(229,231,235,0.75)" font-size="11">${escapeHtml(label.slice(0, 22))}</text>
        </g>
      `;
    }).join('');

    el.innerHTML = `
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
        <rect x="0" y="0" width="${W}" height="${H}" fill="rgba(0,0,0,0.12)" />
        ${svgEdges}
        ${svgNodes}
      </svg>
    `;

    el.querySelectorAll('[data-ref]').forEach((g) => {
      g.addEventListener('click', () => {
        const ref = g.getAttribute('data-ref');
        const ent = (App.results?.entities || []).find((x) => (x.ref || normalizeEntityRef(x.type, x.value)) === ref);
        if (ent) runEnrich(ent).catch(() => {});
      });
    });
  }

  function navItems() {
    const base = [
      { id: 'search', label: 'Recherche', pill: App.mode === 'aggressive' ? 'AGRESSIF' : 'CONFORME' },
      { id: 'results', label: 'Résultats', pill: App.results?.entities?.length ? String(App.results.entities.length) : null },
      { id: 'analysis', label: 'Analyse', pill: null },
      { id: 'saved', label: 'Sauvegardes', pill: App.cloudEnabled && App.token ? String((App.saved.searches.length || 0) + (App.saved.entities.length || 0)) : null },
      { id: 'settings', label: 'Settings', pill: App.token ? 'connecté' : 'offline' }
    ];

    if (App.view === 'entity') {
      base.splice(3, 0, { id: 'entity', label: 'Entité', pill: App.selectedEntityRef ? 'détails' : null });
    }

    return base;
  }

  function renderSidebar() {
    const items = navItems();
    const connected = App.token ? 'Connecté' : 'Non connecté';
    const cloud = App.cloudEnabled ? 'Cloud: ON' : 'Cloud: OFF';

    const caps = App.token ? (App.canAggressive ? 'Aggressive: autorisé' : 'Aggressive: non autorisé') : 'Aggressive: n/a';

    const nav = items.map((it) => `
      <button class="navbtn" data-nav="${it.id}" aria-current="${App.view === it.id ? 'page' : 'false'}">
        <span>${escapeHtml(it.label)}</span>
        ${it.pill ? `<span class="pill">${escapeHtml(it.pill)}</span>` : ''}
      </button>
    `).join('');

    return `
      <div class="sidebar">
        <div class="brand">
          <div>
            <div class="brand-title">OSINT Suite</div>
            <div class="brand-sub">Recherche universelle · Résumé · Analyse</div>
          </div>
          <span class="pill">v1.0.0</span>
        </div>

        <div class="card" style="padding: 10px;">
          <div class="small">${escapeHtml(connected)} · ${escapeHtml(cloud)}</div>
          <div class="small" style="margin-top: 6px;">${escapeHtml(caps)}</div>
        </div>

        <div class="nav">${nav}</div>

        <div class="card" style="padding: 12px;">
          <div style="font-weight: 800; margin-bottom: 6px;">Conforme / Legal</div>
          <div class="small">Ce mode limite les actions bruyantes. Toute recherche est routée via ton proxy; aucune collecte directe côté client.</div>
        </div>
      </div>
    `;
  }

  function renderTopbar() {
    const det = detectQueryType(App.q);
    const inferred = det.queryType;
    const qtype = App.queryType === 'auto' ? inferred : App.queryType;

    return `
      <div class="topbar">
        <div class="searchbar">
          <div class="field" style="flex: 1; min-width: 260px;">
            <label>Recherche</label>
            <input id="q" type="text" placeholder="IP, domaine, email, URL, username..." value="${escapeHtml(App.q)}" />
          </div>

          <div class="field">
            <label>Type</label>
            <select id="qtype">
              ${['auto','domain','ip','email','url','username','text'].map((t) => `<option value="${t}" ${App.queryType===t?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>

          <div class="field">
            <label>Mode</label>
            <select id="mode">
              <option value="compliant" ${App.mode==='compliant'?'selected':''}>conforme</option>
              <option value="aggressive" ${App.mode==='aggressive'?'selected':''} ${App.canAggressive ? '' : 'disabled'}>agressif</option>
            </select>
          </div>

          <span class="badge">détecté: ${escapeHtml(qtype)}</span>
          ${App.busy ? `<span class="badge">recherche…</span>` : ''}
        </div>

        <div class="actions">
          <button class="btn" id="run">Rechercher</button>
          <button class="btn" id="clear">Effacer</button>
        </div>
      </div>
    `;
  }

  function renderSearch() {
    const available = App.availableConnectors || DEFAULT_CONNECTORS;
    const list = App.mode === 'aggressive' ? available.aggressive : available.compliant;

    const enabled = new Set(
      App.mode === 'aggressive'
        ? (App.settings.connectors.enabledAggressive.length ? App.settings.connectors.enabledAggressive : list.map((c) => c.id))
        : (App.settings.connectors.enabledCompliant.length ? App.settings.connectors.enabledCompliant : list.map((c) => c.id))
    );

    const rows = list.map((c) => {
      const checked = enabled.has(c.id);
      const disabled = App.mode === 'aggressive' && !App.canAggressive;
      return `
        <tr>
          <td><input type="checkbox" data-connector="${escapeHtml(c.id)}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} /></td>
          <td><strong>${escapeHtml(c.label)}</strong><div class="small">${escapeHtml(c.desc || '')}</div></td>
          <td><span class="badge">${escapeHtml(App.mode)}</span></td>
        </tr>
      `;
    }).join('');

    const auto = App.settings.ui.autoSearch;

    return `
      <div class="grid">
        <div class="card" style="grid-column: span 12;">
          <h3>Connecteurs actifs</h3>
          <div class="small">Le proxy doit permettre ces connecteurs. Le client n’appelle pas directement des sites OSINT externes.</div>
          <hr class="ez-hr" />
          <table class="table">
            <thead>
              <tr><th></th><th>Connecteur</th><th>Mode</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div class="card" style="grid-column: span 6;">
          <h3>Auto-recherche</h3>
          <div class="small">Quand activé, la recherche part automatiquement après un court délai dès que tu saisis une valeur.</div>
          <div style="margin-top: 10px;">
            <button class="btn ${auto ? 'primary' : ''}" id="toggle-auto">${auto ? 'Auto: ON' : 'Auto: OFF'}</button>
          </div>
        </div>

        <div class="card" style="grid-column: span 6;">
          <h3>À propos des résultats</h3>
          <div class="small">Le résumé global est une synthèse: il signale des pistes, pas des certitudes. Utilise “Analyse” et “Entité” pour vérifier les sources, la cohérence et le contexte.</div>
        </div>
      </div>
    `;
  }

  function renderResults() {
    const r = App.results;
    if (!r) {
      return `
        <div class="card">
          <h3>Résultats</h3>
          <div class="small">Aucune recherche exécutée pour le moment.</div>
        </div>
      `;
    }

    const summaryLines = buildGlobalExplanation();
    const summary = summaryLines.map((x) => `
      <div class="card" style="margin-bottom: 10px;">
        <h3>${escapeHtml(x.title)}</h3>
        <div>${escapeHtml(x.text)}</div>
      </div>
    `).join('');

    const connectorRows = (r.connectors || []).map((c) => {
      const st = String(c.status || 'unknown');
      const cls = st === 'ok' ? 'ok' : (st === 'partial' ? 'warn' : (st === 'error' ? 'bad' : ''));
      return `
        <tr>
          <td><strong>${escapeHtml(c.id || '')}</strong></td>
          <td><span class="badge ${cls}">${escapeHtml(st)}</span></td>
          <td class="small">${escapeHtml(c.warning || c.error || '')}</td>
          <td class="small">${escapeHtml(c.durationMs != null ? `${c.durationMs}ms` : '')}</td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="4" class="small">Aucun statut connecteur.</td></tr>`;

    const entities = (r.entities || []);
    const entityRows = entities.slice(0, 250).map((e) => {
      const ref = e.ref || normalizeEntityRef(e.type, e.value);
      const busy = App.entityBusyRef === ref;
      const conf = e.confidence != null ? `${Math.round(Number(e.confidence) * 100)}%` : '';
      return `
        <tr>
          <td><span class="badge">${escapeHtml(e.type || 'unknown')}</span></td>
          <td style="word-break: break-word;"><strong>${escapeHtml(e.value || '')}</strong><div class="small">${escapeHtml(ref)}</div></td>
          <td class="small">${escapeHtml(conf)}</td>
          <td>
            <div style="display:flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn" data-enrich="${escapeHtml(ref)}" ${busy ? 'disabled' : ''}>${busy ? '…' : 'Enrich'}</button>
              <button class="btn" data-save-entity="${escapeHtml(ref)}">Sauver</button>
            </div>
          </td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="4" class="small">Aucune entité.</td></tr>`;

    const qv = escapeHtml(r.query?.value || '');
    const qt = escapeHtml(r.query?.type || '');

    return `
      <div class="grid">
        <div class="card" style="grid-column: span 12;">
          <h3>Requête</h3>
          <div><strong>${qv}</strong> <span class="badge">${qt}</span> <span class="badge">${escapeHtml(r.mode || App.mode)}</span></div>
          <div class="small" style="margin-top: 6px;">Exécuté: ${escapeHtml(fmtWhen(App.lastSearchAt))}</div>
          <div style="margin-top: 10px; display:flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn primary" id="save-search">Sauver la recherche</button>
          </div>
        </div>

        <div class="card" style="grid-column: span 12;">
          <h3>Résumé global (expliqué)</h3>
          ${summary || '<div class="small">Aucun résumé.</div>'}
        </div>

        <div class="card" style="grid-column: span 6;">
          <h3>Statut des connecteurs</h3>
          <table class="table">
            <thead><tr><th>id</th><th>status</th><th>info</th><th>durée</th></tr></thead>
            <tbody>${connectorRows}</tbody>
          </table>
        </div>

        <div class="card" style="grid-column: span 6;">
          <h3>Entités (extrait)</h3>
          <div class="small">Clique “Enrich” pour une analyse plus profonde (blocs par connecteur).</div>
          <table class="table" style="margin-top: 8px;">
            <thead><tr><th>type</th><th>valeur</th><th>conf</th><th></th></tr></thead>
            <tbody>${entityRows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderEntity() {
    const ref = App.selectedEntityRef;
    if (!ref) {
      return `
        <div class="card">
          <h3>Entité</h3>
          <div class="small">Sélectionne une entité depuis “Résultats” ou le graphe.</div>
        </div>
      `;
    }

    const cached = App.entityDetails.get(ref);
    const entity = cached?.entity || null;
    const blocks = Array.isArray(cached?.blocks) ? cached.blocks : [];

    const head = entity
      ? `<div><strong>${escapeHtml(entity.value || '')}</strong> <span class="badge">${escapeHtml(entity.type || '')}</span></div>`
      : `<div><strong>${escapeHtml(ref)}</strong></div>`;

    const blocksHtml = blocks.map((b) => {
      const st = String(b.status || 'unknown');
      const cls = st === 'ok' ? 'ok' : (st === 'partial' ? 'warn' : (st === 'error' ? 'bad' : ''));
      return `
        <div class="card" style="margin-bottom: 10px;">
          <h3>${escapeHtml(b.id || 'block')}</h3>
          <div style="display:flex; gap: 8px; flex-wrap: wrap; align-items:center;">
            <span class="badge ${cls}">${escapeHtml(st)}</span>
            ${b.warning ? `<span class="badge warn">${escapeHtml(b.warning)}</span>` : ''}
            ${b.error ? `<span class="badge bad">${escapeHtml(b.error)}</span>` : ''}
          </div>
          <pre class="ez-pre ez-muted" style="margin-top: 10px;">${escapeHtml(JSON.stringify(b.data ?? null, null, 2))}</pre>
          <div class="small">Explication: ce bloc correspond à la sortie structurée du connecteur. Vérifie cohérence, date de collecte, et biais possibles (cache, rate-limit, données publiques incomplètes).</div>
        </div>
      `;
    }).join('') || `<div class="small">Aucun détail (enrich non exécuté ou proxy n’a rien renvoyé).</div>`;

    const note = (App.saved.notes.find((n) => n.key === ref)?.text) || '';

    return `
      <div class="grid">
        <div class="card" style="grid-column: span 12;">
          <h3>Entité</h3>
          ${head}
          <div class="small" style="margin-top: 6px;">Ref: ${escapeHtml(ref)}</div>
          <div style="margin-top: 10px; display:flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn" data-save-entity="${escapeHtml(ref)}">Sauver l’entité</button>
          </div>
        </div>

        <div class="card" style="grid-column: span 6;">
          <h3>Notes</h3>
          <div class="small">Les notes sont sauvées via Community Data API (opt-in). Sans cloud activé, elles ne sont pas persistées.</div>
          <div class="field" style="margin-top: 10px;">
            <label>Texte</label>
            <textarea id="note" placeholder="Observations, hypothèses, liens…">${escapeHtml(note)}</textarea>
          </div>
          <div style="margin-top: 10px; display:flex; gap: 10px;">
            <button class="btn primary" id="save-note">Sauver note</button>
          </div>
        </div>

        <div class="card" style="grid-column: span 6;">
          <h3>Détails (proxy)</h3>
          ${blocksHtml}
        </div>
      </div>
    `;
  }

  function renderAnalysis() {
    const r = App.results;
    if (!r) {
      return `
        <div class="card">
          <h3>Analyse</h3>
          <div class="small">Lance une recherche pour obtenir des statistiques et un graphe.</div>
        </div>
      `;
    }

    return `
      <div class="grid">
        <div class="card" style="grid-column: span 6;">
          <h3>Répartition des types d’entités</h3>
          <div id="chart-entities"></div>
          <div class="small" style="margin-top: 8px;">Explication: un volume élevé peut indiquer un bon signal… ou du bruit. Compare avec les statuts des connecteurs.</div>
        </div>

        <div class="card" style="grid-column: span 6;">
          <h3>Statuts des connecteurs</h3>
          <div id="chart-connectors"></div>
          <div class="small" style="margin-top: 8px;">Explication: “partial”/“error” peut venir de rate-limits, d’APIs indisponibles, ou de règles de conformité.</div>
        </div>

        <div class="card" style="grid-column: span 12;">
          <h3>Graphe de relations (inféré)</h3>
          <div class="small">Ce graphe est déduit des entités (ex: URL → domaine, email → domaine). Clique un nœud pour enrichir.</div>
          <div class="graphbox" id="graph"></div>
        </div>
      </div>
    `;
  }

  function renderSaved() {
    if (!App.cloudEnabled || !App.token) {
      return `
        <div class="card">
          <h3>Sauvegardes</h3>
          <div class="small">Active le cloud (Settings) + connecte-toi pour gérer tes sauvegardes.</div>
        </div>
      `;
    }

    const searches = App.saved.searches.map((s) => `
      <tr>
        <td><strong>${escapeHtml(s.key)}</strong><div class="small">${escapeHtml(s.query?.value || '')} · ${escapeHtml(s.query?.type || '')}</div></td>
        <td class="small">${escapeHtml(s.mode || '')}</td>
        <td class="small">${escapeHtml(s.updated_at ? fmtWhen(s.updated_at) : '')}</td>
        <td>
          <div style="display:flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn" data-load-search="${escapeHtml(s.key)}">Charger</button>
            <button class="btn danger" data-del-search="${escapeHtml(s.key)}">Suppr</button>
          </div>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="4" class="small">Aucune recherche sauvegardée.</td></tr>`;

    const entities = App.saved.entities.map((e) => `
      <tr>
        <td><strong>${escapeHtml(e.key)}</strong><div class="small">${escapeHtml(e.type || '')}</div></td>
        <td style="word-break: break-word;">${escapeHtml(e.value || '')}</td>
        <td class="small">${escapeHtml(e.updated_at ? fmtWhen(e.updated_at) : '')}</td>
        <td>
          <div style="display:flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn" data-open-entity="${escapeHtml(e.key)}">Ouvrir</button>
            <button class="btn danger" data-del-entity="${escapeHtml(e.key)}">Suppr</button>
          </div>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="4" class="small">Aucune entité sauvegardée.</td></tr>`;

    return `
      <div class="grid">
        <div class="card" style="grid-column: span 12;">
          <h3>Synchronisation</h3>
          <div class="small">Dernier sync: ${escapeHtml(App.cloudLastSyncAt ? fmtWhen(App.cloudLastSyncAt) : '—')}</div>
          <div style="margin-top: 10px; display:flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn primary" id="refresh-saved" ${App.cloudBusy ? 'disabled' : ''}>Rafraîchir</button>
          </div>
        </div>

        <div class="card" style="grid-column: span 12;">
          <h3>Recherches sauvegardées</h3>
          <table class="table">
            <thead><tr><th>id</th><th>mode</th><th>date</th><th></th></tr></thead>
            <tbody>${searches}</tbody>
          </table>
        </div>

        <div class="card" style="grid-column: span 12;">
          <h3>Entités sauvegardées</h3>
          <table class="table">
            <thead><tr><th>ref</th><th>value</th><th>date</th><th></th></tr></thead>
            <tbody>${entities}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderSettings() {
    const cloud = App.cloudEnabled;
    const auto = App.settings.ui.autoSearch;

    const adminBlock = App.token ? `
      <div class="card" style="grid-column: span 12;">
        <h3>Mode agressif (admin uniquement)</h3>
        <div class="small">Le mode agressif doit être autorisé par le serveur et nécessite un token scopé court. Il peut être bruyant et non conforme selon les cas d’usage.</div>

        <div style="margin-top: 10px; display:flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn" id="reload-caps">Recharger capabilities</button>
          <button class="btn danger" id="disable-aggr" ${App.mode !== 'aggressive' ? 'disabled' : ''}>Désactiver agressif</button>
        </div>

        <hr class="ez-hr" />

        <div class="card" style="padding: 12px; background: rgba(0,0,0,0.18);">
          <div style="font-weight: 900;">Avertissement</div>
          <div class="small" style="margin-top: 6px;">Active uniquement si tu as un mandat/autorisation. Toutes les actions doivent passer par le proxy, avec rate-limit, logs et allowlist.</div>
          <div class="field" style="margin-top: 10px;">
            <label>Confirmation</label>
            <input id="aggr-confirm" placeholder="Tape: J'ACCEPTE" value="" />
          </div>
          <div class="field" style="margin-top: 10px;">
            <label>Raison</label>
            <input id="aggr-reason" placeholder="Pourquoi activer (incident, ticket, etc.)" value="" />
          </div>
          <div style="margin-top: 10px; display:flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn primary" id="enable-aggr" ${App.canAggressive ? '' : 'disabled'}>Activer agressif</button>
            ${App.aggressiveExpiresAt ? `<span class="badge">expire: ${escapeHtml(fmtWhen(App.aggressiveExpiresAt))}</span>` : ''}
          </div>
          ${!App.canAggressive ? `<div class="small" style="margin-top: 8px;">Non autorisé par le serveur (capabilities).</div>` : ''}
        </div>
      </div>
    ` : '';

    return `
      <div class="grid">
        <div class="card" style="grid-column: span 12;">
          <h3>Authentification</h3>
          <div class="small">Le token est conservé en mémoire uniquement (perdu au refresh). Pas de stockage de mot de passe.</div>

          <div class="split" style="margin-top: 10px;">
            <div>
              <div class="field">
                <label>Email</label>
                <input id="email" type="email" placeholder="email" value="${escapeHtml(App.login.email)}" />
              </div>
              <div class="field" style="margin-top: 10px;">
                <label>Password</label>
                <input id="password" type="password" placeholder="password" value="" />
              </div>
              <div style="margin-top: 10px; display:flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn primary" id="login">Login</button>
                <button class="btn" id="logout" ${App.token ? '' : 'disabled'}>Logout</button>
              </div>
              ${App.user?.email ? `<div class="small" style="margin-top: 8px;">Utilisateur: ${escapeHtml(App.user.email)}${App.user.is_admin ? ' (admin)' : ''}</div>` : ''}
            </div>

            <div>
              <div style="font-weight: 900;">Cloud (Community Data API)</div>
              <div class="small" style="margin-top: 6px;">Sauvegarde des réglages, recherches, entités et notes — isolée par utilisateur.</div>
              <div style="margin-top: 10px; display:flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn ${cloud ? 'primary' : ''}" id="toggle-cloud" ${App.token ? '' : 'disabled'}>${cloud ? 'Cloud: ON' : 'Cloud: OFF'}</button>
                <button class="btn" id="sync-settings" ${cloud && App.token ? '' : 'disabled'}>${App.cloudBusy ? '…' : 'Sauver réglages'}</button>
              </div>
              <div class="small" style="margin-top: 8px;">Dernière sync: ${escapeHtml(App.cloudLastSyncAt ? fmtWhen(App.cloudLastSyncAt) : '—')}</div>
            </div>
          </div>
        </div>

        <div class="card" style="grid-column: span 6;">
          <h3>Auto-recherche</h3>
          <div class="small">Option UX : recherche automatique à la saisie.</div>
          <div style="margin-top: 10px;">
            <button class="btn ${auto ? 'primary' : ''}" id="toggle-auto">${auto ? 'Auto: ON' : 'Auto: OFF'}</button>
          </div>
        </div>

        <div class="card" style="grid-column: span 6;">
          <h3>Conformité</h3>
          <div class="small">Mode conforme par défaut. Pour le mode agressif: admin + avertissement + token scopé court.</div>
        </div>

        ${adminBlock}
      </div>
    `;
  }

  function renderToasts() {
    const wrap = $('#toasts');
    if (!wrap) return;

    wrap.innerHTML = App.toasts.map((t) => `
      <div class="toast">
        <div class="t-title">${escapeHtml(t.title)}</div>
        <div class="t-msg">${escapeHtml(t.msg)}</div>
      </div>
    `).join('');
  }

  function renderMain() {
    if (App.view === 'search') return renderSearch();
    if (App.view === 'results') return renderResults();
    if (App.view === 'analysis') return renderAnalysis();
    if (App.view === 'entity') return renderEntity();
    if (App.view === 'saved') return renderSaved();
    if (App.view === 'settings') return renderSettings();
    return `<div class="card"><h3>Vue</h3><div class="small">Inconnue.</div></div>`;
  }

  function render() {
    const root = $('#app');
    if (!root) return;

    root.innerHTML = `
      <div class="shell">
        ${renderSidebar()}
        <div class="main">
          ${renderTopbar()}
          ${App.lastError ? `
            <div class="card">
              <h3>Erreur</h3>
              <pre class="ez-pre ez-muted">${escapeHtml(safeJsonStringify(App.lastError.payload ?? String(App.lastError)))}</pre>
            </div>
          ` : ''}
          ${renderMain()}
        </div>
      </div>
      <div id="toasts" class="toastwrap"></div>
    `;

    renderToasts();

    if (App.view === 'analysis') {
      renderBarChart($('#chart-entities'), entityTypeCounts());
      renderBarChart($('#chart-connectors'), connectorStatusCounts());
      renderGraph($('#graph'));
    }
  }

  function setEnabledConnector(mode, id, enabled) {
    const key = mode === 'aggressive' ? 'enabledAggressive' : 'enabledCompliant';
    const list = new Set(App.settings.connectors[key]);

    if (!App.settings.connectors[key].length) {
      // If empty, initialize from defaults.
      const available = App.availableConnectors || DEFAULT_CONNECTORS;
      const full = (mode === 'aggressive' ? available.aggressive : available.compliant).map((c) => c.id);
      for (const x of full) list.add(x);
    }

    if (enabled) list.add(id); else list.delete(id);
    App.settings.connectors[key] = Array.from(list);

    if (App.cloudEnabled && App.token) saveSettingsToCloud().catch(() => {});
  }

  async function saveCurrentSearch() {
    if (!App.cloudEnabled || !App.token) {
      toast('warn', 'Cloud', 'Active le cloud + login pour sauver.');
      return;
    }
    if (!App.results) return;

    const searchId = uid('s');
    const data = {
      v: 1,
      createdAt: new Date().toISOString(),
      query: App.results.query,
      mode: App.results.mode,
      connectors: enabledConnectorsForMode(),
      summary: App.results.summary || null
    };

    try {
      App.cloudBusy = true;
      render();
      await communityPut('saved_searches', searchId, data);
      App.cloudBusy = false;
      App.cloudLastSyncAt = new Date().toISOString();
      toast('ok', 'Sauvegarde', 'Recherche sauvegardée.');
      await refreshSavedLists();
    } catch {
      App.cloudBusy = false;
      render();
      toast('warn', 'Sauvegarde', 'Échec de sauvegarde de la recherche.');
    }
  }

  async function saveEntityByRef(ref) {
    if (!ref) return;

    if (!App.cloudEnabled || !App.token) {
      toast('warn', 'Cloud', 'Active le cloud + login pour sauver.');
      return;
    }

    const ent = (App.results?.entities || []).find((x) => (x.ref || normalizeEntityRef(x.type, x.value)) === ref);
    if (!ent) {
      toast('warn', 'Entité', 'Entité introuvable dans les résultats.');
      return;
    }

    const data = {
      v: 1,
      type: ent.type,
      value: ent.value,
      savedAt: new Date().toISOString(),
      tags: []
    };

    try {
      App.cloudBusy = true;
      render();
      await communityPut('entities', ref, data);
      App.cloudBusy = false;
      App.cloudLastSyncAt = new Date().toISOString();
      toast('ok', 'Sauvegarde', 'Entité sauvegardée.');
      await refreshSavedLists();
    } catch {
      App.cloudBusy = false;
      render();
      toast('warn', 'Sauvegarde', 'Échec de sauvegarde de l’entité.');
    }
  }

  async function saveNote() {
    const ref = App.selectedEntityRef;
    if (!ref) return;

    const text = String($('#note')?.value || '').slice(0, 12000);

    if (!App.cloudEnabled || !App.token) {
      toast('warn', 'Cloud', 'Active le cloud + login pour sauver.');
      return;
    }

    const data = {
      v: 1,
      entityRef: ref,
      text,
      updatedAt: new Date().toISOString()
    };

    try {
      App.cloudBusy = true;
      render();
      await communityPut('notes', ref, data);
      App.cloudBusy = false;
      App.cloudLastSyncAt = new Date().toISOString();
      toast('ok', 'Notes', 'Note sauvegardée.');
      await refreshSavedLists();
    } catch {
      App.cloudBusy = false;
      render();
      toast('warn', 'Notes', 'Échec de sauvegarde de la note.');
    }
  }

  async function loadSavedSearch(key) {
    if (!App.cloudEnabled || !App.token) return;

    try {
      const rec = await communityGet('saved_searches', key);
      const d = rec?.data;
      if (!d) return;
      App.q = d.query?.value || '';
      App.queryType = 'auto';
      App.mode = d.mode === 'aggressive' && App.canAggressive ? 'aggressive' : 'compliant';
      App.view = 'search';
      render();
      scheduleAutoSearch();
    } catch {
      toast('warn', 'Sauvegardes', 'Impossible de charger cette recherche.');
    }
  }

  async function deleteRecord(collection, key) {
    if (!App.cloudEnabled || !App.token) return;

    try {
      App.cloudBusy = true;
      render();
      await communityDelete(collection, key);
      App.cloudBusy = false;
      App.cloudLastSyncAt = new Date().toISOString();
      await refreshSavedLists();
    } catch {
      App.cloudBusy = false;
      render();
      toast('warn', 'Cloud', 'Suppression impossible.');
    }
  }

  function bindEvents() {
    const root = $('#app');

    root.addEventListener('click', (ev) => {
      const t = ev.target;

      const nav = t?.closest?.('[data-nav]');
      if (nav) {
        const v = nav.getAttribute('data-nav');
        App.view = v;
        render();
        return;
      }

      if (t?.id === 'run') {
        runSearch().catch(() => {});
        return;
      }

      if (t?.id === 'clear') {
        App.q = '';
        App.results = null;
        App.selectedEntityRef = null;
        App.view = 'search';
        render();
        return;
      }

      if (t?.id === 'toggle-auto') {
        App.settings.ui.autoSearch = !App.settings.ui.autoSearch;
        render();
        if (App.cloudEnabled && App.token) saveSettingsToCloud().catch(() => {});
        return;
      }

      if (t?.id === 'save-search') {
        saveCurrentSearch().catch(() => {});
        return;
      }

      if (t?.id === 'refresh-saved') {
        refreshSavedLists().catch(() => {});
        return;
      }

      if (t?.id === 'toggle-cloud') {
        App.cloudEnabled = !App.cloudEnabled;
        render();
        if (App.cloudEnabled) {
          loadSettingsFromCloud().then(refreshSavedLists).catch(() => {});
        }
        return;
      }

      if (t?.id === 'sync-settings') {
        saveSettingsToCloud().catch(() => {});
        return;
      }

      if (t?.id === 'login') {
        const email = String($('#email')?.value || '').trim();
        const password = String($('#password')?.value || '');
        if (!email || !password) {
          toast('warn', 'Login', 'Email + password requis.');
          return;
        }
        App.login.email = email;
        apiLogin(email, password)
          .then((j) => {
            App.token = j?.token || null;
            App.user = j?.user || null;
            toast('ok', 'Login', 'Connecté.');
            return loadCapabilities();
          })
          .then(() => {
            if (App.cloudEnabled) return loadSettingsFromCloud();
          })
          .then(() => {
            if (App.cloudEnabled) return refreshSavedLists();
          })
          .catch((e) => {
            if (e?.status === 401) toast('warn', 'Login', 'Identifiants invalides (401).');
            else toast('warn', 'Login', 'Échec de connexion.');
          })
          .finally(() => {
            render();
          });
        return;
      }

      if (t?.id === 'logout') {
        App.token = null;
        App.user = null;
        App.canAggressive = false;
        App.aggressiveToken = null;
        App.aggressiveExpiresAt = null;
        App.cloudEnabled = false;
        App.capabilities = null;
        toast('ok', 'Logout', 'Déconnecté.');
        render();
        return;
      }

      if (t?.id === 'reload-caps') {
        loadCapabilities().catch(() => {});
        return;
      }

      if (t?.id === 'disable-aggr') {
        App.mode = 'compliant';
        App.aggressiveToken = null;
        App.aggressiveExpiresAt = null;
        saveSettingsToCloud().catch(() => {});
        render();
        return;
      }

      if (t?.id === 'enable-aggr') {
        const confirm = String($('#aggr-confirm')?.value || '').trim();
        const reason = String($('#aggr-reason')?.value || '').trim();
        if (confirm !== "J'ACCEPTE") {
          toast('warn', 'Avertissement', "Tape exactement: J'ACCEPTE");
          return;
        }

        requestAggressiveToken(reason)
          .then(() => {
            App.mode = 'aggressive';
            toast('ok', 'Mode agressif', 'Activé (token en mémoire).');
            return saveSettingsToCloud();
          })
          .then(() => {
            render();
          })
          .catch((e) => {
            if (e?.status === 403) toast('warn', 'Mode agressif', 'Non autorisé (403).');
            else toast('warn', 'Mode agressif', 'Impossible d’obtenir un token.');
            render();
          });

        return;
      }

      if (t?.id === 'save-note') {
        saveNote().catch(() => {});
        return;
      }

      const enrichBtn = t?.closest?.('[data-enrich]');
      if (enrichBtn) {
        const ref = enrichBtn.getAttribute('data-enrich');
        const ent = (App.results?.entities || []).find((x) => (x.ref || normalizeEntityRef(x.type, x.value)) === ref);
        if (ent) runEnrich(ent).catch(() => {});
        return;
      }

      const saveEntityBtn = t?.closest?.('[data-save-entity]');
      if (saveEntityBtn) {
        const ref = saveEntityBtn.getAttribute('data-save-entity');
        saveEntityByRef(ref).catch(() => {});
        return;
      }

      const loadSearchBtn = t?.closest?.('[data-load-search]');
      if (loadSearchBtn) {
        loadSavedSearch(loadSearchBtn.getAttribute('data-load-search')).catch(() => {});
        return;
      }

      const delSearchBtn = t?.closest?.('[data-del-search]');
      if (delSearchBtn) {
        deleteRecord('saved_searches', delSearchBtn.getAttribute('data-del-search')).catch(() => {});
        return;
      }

      const openEntityBtn = t?.closest?.('[data-open-entity]');
      if (openEntityBtn) {
        const ref = openEntityBtn.getAttribute('data-open-entity');
        // If we don't have details cached, just navigate and let user enrich.
        App.selectedEntityRef = ref;
        App.view = 'entity';
        render();
        return;
      }

      const delEntityBtn = t?.closest?.('[data-del-entity]');
      if (delEntityBtn) {
        deleteRecord('entities', delEntityBtn.getAttribute('data-del-entity')).catch(() => {});
        return;
      }
    });

    root.addEventListener('input', (ev) => {
      const t = ev.target;
      if (t?.id === 'q') {
        App.q = t.value;
        scheduleAutoSearch();
        return;
      }

      if (t?.id === 'email') {
        App.login.email = t.value;
        return;
      }

      if (t?.matches?.('[data-connector]')) {
        const id = t.getAttribute('data-connector');
        setEnabledConnector(App.mode, id, t.checked);
        render();
        return;
      }
    });

    root.addEventListener('change', (ev) => {
      const t = ev.target;
      if (t?.id === 'qtype') {
        App.queryType = t.value;
        scheduleAutoSearch();
        return;
      }

      if (t?.id === 'mode') {
        const next = t.value;
        if (next === 'aggressive') {
          if (!App.canAggressive) {
            toast('warn', 'Mode', 'Agressif non autorisé.');
            App.mode = 'compliant';
          } else if (!App.aggressiveToken) {
            toast('warn', 'Mode', 'Active le mode agressif dans Settings (token requis).');
            App.mode = 'compliant';
          } else {
            App.mode = 'aggressive';
          }
        } else {
          App.mode = 'compliant';
        }
        saveSettingsToCloud().catch(() => {});
        render();
        scheduleAutoSearch();
      }
    });

    root.addEventListener('keydown', (ev) => {
      const t = ev.target;
      if (t?.id === 'q' && ev.key === 'Enter') {
        runSearch().catch(() => {});
      }
    });
  }

  const App = {
    view: 'search',

    // Query
    q: '',
    queryType: 'auto',
    mode: 'compliant',

    // Proxy/API
    token: null,
    user: null,
    capabilities: null,
    canAggressive: false,
    aggressiveToken: null,
    aggressiveExpiresAt: null,

    // Connectors from capabilities (optional)
    availableConnectors: DEFAULT_CONNECTORS,
    capabilityConnectors: null,

    // Cloud
    cloudEnabled: false,
    cloudBusy: false,
    cloudLastSyncAt: null,

    // Settings
    settings: {
      schemaVersion: 1,
      ui: {
        autoSearch: true,
        defaultMode: 'compliant'
      },
      connectors: {
        enabledCompliant: [],
        enabledAggressive: []
      }
    },

    // UI
    busy: false,
    lastError: null,
    lastSearchAt: null,

    // Results
    results: null,
    selectedEntityRef: null,
    entityDetails: new Map(),
    entityBusyRef: null,

    // Saved lists (cloud)
    saved: {
      searches: [],
      entities: [],
      notes: []
    },

    // Login form state
    login: {
      email: ''
    },

    // Toasts
    toasts: [],

    // Timers
    _searchTimer: null,
    _abort: null
  };

  function boot() {
    render();
    bindEvents();
    // Capabilities only if user logged in.
    loadCapabilities().catch(() => {});
  }

  window.addEventListener('resize', () => {
    if (App.view === 'analysis') {
      renderGraph($('#graph'));
    }
  });

  boot();
})();
