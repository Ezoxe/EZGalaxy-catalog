/* ================================================================
   FinVest — store.js  (State Management & Persistence)
   Pub/sub store + Cloud sync via EZGalaxy SDK Storage + localStorage
   Exposes: window.Store
   ================================================================ */
(() => {
  'use strict';

  const EXTENSION_ID = 'com.ezgalaxy.finvest';
  const LS_KEY = 'finvest_state';
  const LS_AUTH = 'finvest_auth';
  const LS_DEVICE_UUID = 'finvest_device_uuid';

  /* ---------- PWA / Mobile detection -------------------------- */
  const _isPWA = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  function _getDeviceUUID() {
    try {
      let uuid = localStorage.getItem(LS_DEVICE_UUID);
      if (!uuid) {
        uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
        localStorage.setItem(LS_DEVICE_UUID, uuid);
      }
      return uuid;
    } catch (_) {
      return 'fallback-' + Date.now();
    }
  }

  function _detectPlatform() {
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    return 'web';
  }

  /* ---------- Safe localStorage wrapper (sandbox-proof) ------- */
  const _mem = {};
  const safeLS = {
    getItem(key) {
      try { return localStorage.getItem(key); } catch (_) { return _mem[key] || null; }
    },
    setItem(key, value) {
      try { localStorage.setItem(key, value); } catch (_) { _mem[key] = value; }
    },
    removeItem(key) {
      try { localStorage.removeItem(key); } catch (_) { delete _mem[key]; }
    }
  };
  // Expose for other modules (themes, etc.)
  window._finvestSafeLS = safeLS;

  /* ---------- default state ----------------------------------- */
  const defaultProfile = {
    age: 30,
    familySituation: 'single',
    dependents: 0,
    monthlyNetIncome: 0,
    otherIncome: 0,
    employmentStability: 'stable',
    fixedExpenses: 0,
    variableExpenses: 0,
    currentSavings: 0,
    investments: [],
    realEstate: [],
    debts: [],
    goals: [],
    riskAnswers: [3, 3, 3, 3, 3, 3, 3],
    retirementAge: 65,
    retirementIncome: 0,
    taxSituation: 'single'
  };

  const defaultSettings = {
    inflationRate: 2.5,
    riskFreeRate: 2.0,
    lifeExpectancy: 85,
    currency: '€',
    monteCarloIterations: 800
  };

  let state = {
    step: 'welcome',          // welcome | questionnaire | dashboard
    questionnaireStep: 0,     // 0-6
    questionnaireMode: null,  // null | 'quick' | 'full'
    profile: { ...defaultProfile },
    analysis: null,
    currentView: 'overview',
    settings: { ...defaultSettings },
    auth: { token: null, user: null },
    cloudStatus: 'disconnected', // disconnected | connected | syncing | error
    // ── New Phase-1 fields ──────────────────────────────────
    xp: 0,
    transactions: [],         // {id, date, amount, category, label, recurring}
    snapshots: [],            // monthly patrimony snapshots
    positions: [],            // portfolio positions {symbol, name, quantity, avgPrice}
    watchlist: [],            // ticker symbols
    completedChallenges: [],  // challenge ids
    journalEntries: [],       // {date, text, mood}
    notifications: [],        // {id, type, title, body, read, date}
    onboardingDone: false
  };

  const listeners = [];

  /* ---------- pub/sub ----------------------------------------- */
  function subscribe(fn) {
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
  }

  function notify() {
    for (const fn of listeners) {
      try { fn(state); } catch (e) { console.error('[Store] listener error', e); }
    }
  }

  function setState(updates) {
    state = { ...state, ...updates };
    saveLocal();
    notify();
  }

  function getState() { return state; }

  /* ---------- profile ----------------------------------------- */
  function setProfile(data) {
    setState({ profile: { ...defaultProfile, ...data } });
  }

  function updateProfile(partial) {
    setState({ profile: { ...state.profile, ...partial } });
  }

  function resetProfile() {
    setState({
      step: 'welcome',
      questionnaireStep: 0,
      questionnaireMode: null,
      profile: { ...defaultProfile },
      analysis: null,
      currentView: 'overview'
    });
  }

  /* ---------- analysis ---------------------------------------- */
  function runAnalysis() {
    const analysis = window.FinEngine.runFullAnalysis(state.profile);
    setState({ analysis, step: 'dashboard', currentView: 'overview' });
    return analysis;
  }

  /* ---------- XP / Gamification -------------------------------- */
  function addXP(amount, action) {
    const newXP = (state.xp || 0) + amount;
    setState({ xp: newXP });
    console.log(`[Store] +${amount} XP (${action}) → total ${newXP}`);
    return newXP;
  }

  /* ---------- Transactions ------------------------------------- */
  function addTransaction(tx) {
    const id = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const transactions = [...(state.transactions || []), { id, date: new Date().toISOString(), ...tx }];
    setState({ transactions });
    addXP(5, 'transaction_added');
    return id;
  }

  function removeTransaction(id) {
    setState({ transactions: (state.transactions || []).filter(t => t.id !== id) });
  }

  /* ---------- Snapshots ---------------------------------------- */
  function addSnapshot(snap) {
    const snapshots = [...(state.snapshots || []), { date: new Date().toISOString(), ...snap }];
    setState({ snapshots });
    addXP(20, 'snapshot_taken');
  }

  /* ---------- Positions ---------------------------------------- */
  function addPosition(pos) {
    const positions = [...(state.positions || [])];
    const existing = positions.find(p => p.symbol === pos.symbol);
    if (existing) {
      const totalQty = existing.quantity + pos.quantity;
      existing.avgPrice = (existing.avgPrice * existing.quantity + pos.avgPrice * pos.quantity) / totalQty;
      existing.quantity = totalQty;
    } else {
      positions.push(pos);
    }
    setState({ positions });
    addXP(10, 'position_added');
  }

  function removePosition(symbol) {
    setState({ positions: (state.positions || []).filter(p => p.symbol !== symbol) });
  }

  /* ---------- Watchlist ---------------------------------------- */
  function toggleWatchlist(symbol) {
    const wl = [...(state.watchlist || [])];
    const idx = wl.indexOf(symbol);
    if (idx >= 0) wl.splice(idx, 1);
    else wl.push(symbol);
    setState({ watchlist: wl });
  }

  /* ---------- Challenges --------------------------------------- */
  function completeChallenge(challengeId) {
    if ((state.completedChallenges || []).includes(challengeId)) return;
    setState({ completedChallenges: [...(state.completedChallenges || []), challengeId] });
    addXP(30, 'challenge_completed');
  }

  /* ---------- Notifications ------------------------------------ */
  function addNotification(notif) {
    const id = Date.now() + '_' + Math.random().toString(36).slice(2, 4);
    const notifications = [{ id, read: false, date: new Date().toISOString(), ...notif }, ...(state.notifications || [])].slice(0, 50);
    setState({ notifications });
  }

  function markNotificationsRead() {
    setState({ notifications: (state.notifications || []).map(n => ({ ...n, read: true })) });
  }

  /* ---------- Journal ----------------------------------------- */
  function addJournalEntry(entry) {
    const id = Date.now() + '_' + Math.random().toString(36).slice(2, 5);
    const journalEntries = [...(state.journalEntries || []), { id, date: new Date().toISOString(), ...entry }];
    setState({ journalEntries });
    addXP(10, 'journal_entry');
    return id;
  }

  function removeJournalEntry(id) {
    setState({ journalEntries: (state.journalEntries || []).filter(e => e.id !== id) });
  }

  /* ---------- localStorage ------------------------------------ */
  function saveLocal() {
    try {
      const payload = {
        step: state.step,
        questionnaireStep: state.questionnaireStep,
        questionnaireMode: state.questionnaireMode,
        profile: state.profile,
        analysis: state.analysis,
        currentView: state.currentView,
        settings: state.settings,
        xp: state.xp || 0,
        transactions: state.transactions || [],
        snapshots: state.snapshots || [],
        positions: state.positions || [],
        watchlist: state.watchlist || [],
        completedChallenges: state.completedChallenges || [],
        journalEntries: state.journalEntries || [],
        notifications: state.notifications || [],
        onboardingDone: state.onboardingDone || false
      };
      safeLS.setItem(LS_KEY, JSON.stringify(payload));
    } catch (e) { /* quota exceeded — silent */ }
  }

  function loadLocal() {
    try {
      const raw = safeLS.getItem(LS_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      state = {
        ...state,
        step: saved.step || 'welcome',
        questionnaireStep: saved.questionnaireStep || 0,
        questionnaireMode: saved.questionnaireMode || null,
        profile: { ...defaultProfile, ...saved.profile },
        analysis: saved.analysis || null,
        currentView: saved.currentView || 'overview',
        settings: { ...defaultSettings, ...saved.settings },
        xp: saved.xp || 0,
        transactions: saved.transactions || [],
        snapshots: saved.snapshots || [],
        positions: saved.positions || [],
        watchlist: saved.watchlist || [],
        completedChallenges: saved.completedChallenges || [],
        journalEntries: saved.journalEntries || [],
        notifications: saved.notifications || [],
        onboardingDone: saved.onboardingDone || false
      };
      // Restore auth token separately
      try {
        const authRaw = safeLS.getItem(LS_AUTH);
        if (authRaw) {
          const auth = JSON.parse(authRaw);
          state.auth = auth;
          state.cloudStatus = auth.token ? 'connected' : 'disconnected';
        }
      } catch (_) { /* ignore */ }
      return true;
    } catch (e) { return false; }
  }

  /* ---------- Cloud — EZGalaxy SDK Storage ---------------------- */

  /** Parse a fetch response as JSON safely, with Content-Type check */
  async function _safeJsonResponse(res) {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      throw new Error('Le serveur a renvoyé une page HTML au lieu de JSON. Vérifiez que le backend est bien démarré.');
    }
    return res.json();
  }

  async function login(email, password) {
    // Block auto-save during login+cloudLoad sequence to prevent overwriting cloud data
    _isCloudOp = true;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'Identifiants invalides');
      }
      const data = await _safeJsonResponse(res);
      const auth = { token: data.token, user: data.user };
      safeLS.setItem(LS_AUTH, JSON.stringify(auth));
      setState({ auth, cloudStatus: 'connected' });
      return data.user;
    } finally {
      // Note: _isCloudOp stays true if cloudLoad follows immediately after login
      // The caller (showLoginModal) will call cloudLoad which also sets _isCloudOp = true
      // If no cloudLoad follows, we reset it here
      _isCloudOp = false;
    }
  }

  async function register(name, email, password) {
    _isCloudOp = true;
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'Erreur lors de l\'inscription');
      }
      const data = await _safeJsonResponse(res);
      const auth = { token: data.token, user: data.user };
      safeLS.setItem(LS_AUTH, JSON.stringify(auth));
      setState({ auth, cloudStatus: 'connected' });
      return data.user;
    } finally {
      _isCloudOp = false;
    }
  }

  function logout() {
    safeLS.removeItem(LS_AUTH);
    setState({ auth: { token: null, user: null }, cloudStatus: 'disconnected' });
  }

  /* ---------- Cloud key helper — scope data per user --------- */
  function _cloudKey() {
    const email = state.auth && state.auth.user && state.auth.user.email;
    if (email) return 'user_' + email.toLowerCase().replace(/[^a-z0-9._@-]/g, '_');
    return 'main';
  }

  async function cloudSave() {
    _isCloudOp = true;
    setState({ cloudStatus: 'syncing' });
    try {
      const payload = {
        profile: state.profile,
        analysis: state.analysis,
        settings: state.settings,
        step: state.step,
        questionnaireStep: state.questionnaireStep,
        questionnaireMode: state.questionnaireMode,
        currentView: state.currentView,
        xp: state.xp || 0,
        transactions: state.transactions || [],
        snapshots: state.snapshots || [],
        positions: state.positions || [],
        watchlist: state.watchlist || [],
        completedChallenges: state.completedChallenges || [],
        journalEntries: state.journalEntries || [],
        notifications: state.notifications || [],
        onboardingDone: state.onboardingDone || false,
        savedAt: new Date().toISOString()
      };
      const compressed = typeof LZString !== 'undefined'
        ? LZString.compressToUTF16(JSON.stringify(payload))
        : JSON.stringify(payload);

      await ezgalaxy.storage.set('profiles', _cloudKey(), { compressed: typeof LZString !== 'undefined', payload: compressed });
      setState({ cloudStatus: 'connected' });
      return true;
    } catch (e) {
      setState({ cloudStatus: 'error' });
      throw e;
    } finally {
      _isCloudOp = false;
    }
  }

  /** Safe wrapper: try to get a storage record, return null on any error (404, network, etc.) */
  async function _safeStorageGet(collection, key) {
    try {
      const rec = await ezgalaxy.storage.get(collection, key);
      return (rec && rec.data) ? rec : null;
    } catch (e) {
      console.warn('[Store] storage.get(' + collection + ', ' + key + ') failed:', e.message);
      return null;
    }
  }

  async function cloudLoad() {
    // Cancel any pending auto-save to prevent race conditions
    if (_autoSaveTimer) { clearTimeout(_autoSaveTimer); _autoSaveTimer = null; }
    _isCloudOp = true;
    setState({ cloudStatus: 'syncing' });
    try {
      const key = _cloudKey();
      // Try user-scoped key first, then fallback to legacy 'main' key
      let effectiveRecord = await _safeStorageGet('profiles', key);
      if (!effectiveRecord && key !== 'main') {
        effectiveRecord = await _safeStorageGet('profiles', 'main');
      }
      if (!effectiveRecord || !effectiveRecord.data) {
        setState({ cloudStatus: 'connected' });
        return false;
      }
      const d = effectiveRecord.data;
      let payload;
      if (d && d.compressed && typeof LZString !== 'undefined') {
        payload = JSON.parse(LZString.decompressFromUTF16(d.payload));
      } else if (d && d.compressed && typeof LZString === 'undefined') {
        // Data is compressed but LZString not available — cannot decompress
        throw new Error('Impossible de décompresser les données (LZString non disponible). Rechargez la page et réessayez.');
      } else if (d && d.payload) {
        payload = typeof d.payload === 'string' ? JSON.parse(d.payload) : d.payload;
      } else {
        payload = d;
      }
      if (payload && payload.profile) {
        // If we have analysis data, always go to dashboard (never stay on welcome)
        const resolvedStep = payload.analysis ? 'dashboard' : (payload.step || 'welcome');
        const resolvedView = resolvedStep === 'dashboard' ? (payload.currentView || 'overview') : 'overview';
        setState({
          profile: { ...defaultProfile, ...payload.profile },
          analysis: payload.analysis || null,
          settings: { ...defaultSettings, ...(payload.settings || {}) },
          step: resolvedStep,
          questionnaireStep: payload.questionnaireStep || 0,
          questionnaireMode: payload.questionnaireMode || null,
          currentView: resolvedView,
          xp: payload.xp || state.xp || 0,
          transactions: payload.transactions || state.transactions || [],
          snapshots: payload.snapshots || state.snapshots || [],
          positions: payload.positions || state.positions || [],
          watchlist: payload.watchlist || state.watchlist || [],
          completedChallenges: payload.completedChallenges || state.completedChallenges || [],
          journalEntries: payload.journalEntries || state.journalEntries || [],
          notifications: payload.notifications || state.notifications || [],
          onboardingDone: payload.onboardingDone || state.onboardingDone || false,
          cloudStatus: 'connected'
        });
        // If we loaded from legacy 'main' key, re-save under user key for future loads
        if (key !== 'main') {
          try { await cloudSave(); } catch (_) { /* best-effort migration */ }
        }
        return true;
      }
      setState({ cloudStatus: 'connected' });
      return false;
    } catch (e) {
      setState({ cloudStatus: 'error' });
      throw e;
    } finally {
      _isCloudOp = false;
    }
  }

  /* ---------- Export / Import --------------------------------- */
  function exportJSON() {
    const payload = {
      app: 'com.ezgalaxy.finvest',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      profile: state.profile,
      analysis: state.analysis,
      settings: state.settings
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const filename = `finvest-export-${new Date().toISOString().slice(0, 10)}.json`;

    // Detect sandboxed iframe (EZGalaxy runs apps in iframes)
    let inSandbox = false;
    try {
      inSandbox = window.self !== window.top;
    } catch (_) { inSandbox = true; }

    // In sandbox, go straight to modal (downloads blocked in iframes)
    if (inSandbox) {
      _showExportModal(jsonStr, filename);
      return;
    }

    // Strategy 1: Blob + click
    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    } catch (_) { /* fallback */ }

    // Strategy 2: data URI
    try {
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr);
      const a = document.createElement('a');
      a.href = dataUri;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    } catch (_) { /* fallback */ }

    // Strategy 3: Copy to clipboard + modal
    _showExportModal(jsonStr, filename);
  }

  function _showExportModal(jsonStr, filename) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(6px)';
    const box = document.createElement('div');
    box.style.cssText = 'background:#1a1f2e;border:1px solid rgba(255,255,255,0.1);border-radius:12px;max-width:640px;width:100%;max-height:80vh;display:flex;flex-direction:column;overflow:hidden';
    const hdr = document.createElement('div');
    hdr.style.cssText = 'padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center';
    hdr.innerHTML = `<strong style="color:#fff">📋 ${filename}</strong>`;
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none;border:none;color:#888;font-size:18px;cursor:pointer';
    closeBtn.onclick = () => overlay.remove();
    hdr.appendChild(closeBtn);
    const ta = document.createElement('textarea');
    ta.value = jsonStr;
    ta.readOnly = true;
    ta.style.cssText = 'flex:1;background:#0d1117;color:#7ee787;border:none;padding:16px 20px;font-family:monospace;font-size:12px;resize:none;min-height:200px;outline:none';
    // Hint for sandbox
    const hint = document.createElement('div');
    hint.style.cssText = 'padding:8px 20px;font-size:12px;color:#94a3b8;text-align:center;background:rgba(255,255,255,0.02)';
    hint.textContent = '💡 L\'application tourne dans un cadre sécurisé. Utilisez « Copier » puis collez dans un fichier, ou « Ouvrir dans un onglet » puis Ctrl+S pour sauvegarder.';

    const ftr = document.createElement('div');
    ftr.style.cssText = 'padding:12px 20px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:8px;justify-content:center;flex-wrap:wrap';

    // PRIMARY: Copy to clipboard (most reliable in sandbox)
    const copyBtn = document.createElement('button');
    copyBtn.innerHTML = '📋 Copier le JSON';
    copyBtn.style.cssText = 'padding:10px 22px;background:#0ea5a4;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;flex:1;max-width:200px';
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(jsonStr);
        copyBtn.innerHTML = '✅ Copié !';
      } catch {
        ta.select();
        document.execCommand('copy');
        copyBtn.innerHTML = '✅ Copié !';
      }
      setTimeout(() => { copyBtn.innerHTML = '📋 Copier le JSON'; }, 2000);
    };
    ftr.appendChild(copyBtn);

    // SECONDARY: Open in new tab (user can Ctrl+S from there)
    const openBtn = document.createElement('button');
    openBtn.innerHTML = '↗ Ouvrir dans un onglet';
    openBtn.style.cssText = 'padding:10px 18px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;flex:1;max-width:200px';
    openBtn.onclick = () => {
      try {
        // Try Blob URL in new window
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const w = window.open(url, '_blank');
        if (w) { openBtn.innerHTML = '✅ Ouvert !'; setTimeout(() => { openBtn.innerHTML = '↗ Ouvrir dans un onglet'; URL.revokeObjectURL(url); }, 3000); return; }
        URL.revokeObjectURL(url);
      } catch(_) {}
      // Try data URI
      try {
        const w = window.open('data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr), '_blank');
        if (w) { openBtn.innerHTML = '✅ Ouvert !'; setTimeout(() => { openBtn.innerHTML = '↗ Ouvrir dans un onglet'; }, 2000); return; }
      } catch(_) {}
      // Try parent message
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'open-url', url: 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr) }, '*');
          openBtn.innerHTML = '📤 Envoyé au parent';
          setTimeout(() => { openBtn.innerHTML = '↗ Ouvrir dans un onglet'; }, 2000);
          return;
        }
      } catch(_) {}
      openBtn.innerHTML = '❌ Bloqué — utilisez Copier';
      setTimeout(() => { openBtn.innerHTML = '↗ Ouvrir dans un onglet'; }, 2500);
    };
    ftr.appendChild(openBtn);

    // TERTIARY: Select all text in textarea
    const selBtn = document.createElement('button');
    selBtn.innerHTML = '🖱️ Tout sélectionner';
    selBtn.style.cssText = 'padding:10px 18px;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;flex:1;max-width:200px';
    selBtn.onclick = () => {
      ta.focus();
      ta.select();
      selBtn.innerHTML = '✅ Sélectionné — Ctrl+C pour copier';
      setTimeout(() => { selBtn.innerHTML = '🖱️ Tout sélectionner'; }, 3000);
    };
    ftr.appendChild(selBtn);

    box.append(hdr, ta, hint, ftr);
    overlay.appendChild(box);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (data.app !== 'com.ezgalaxy.finvest') {
            reject(new Error('Fichier non compatible'));
            return;
          }
          state = {
            ...state,
            profile: { ...defaultProfile, ...data.profile },
            analysis: data.analysis || null,
            settings: { ...defaultSettings, ...(data.settings || {}) },
            step: data.analysis ? 'dashboard' : 'questionnaire',
            questionnaireStep: 0
          };
          saveLocal();
          notify();
          resolve(true);
        } catch (e) { reject(e); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /* ---------- Init -------------------------------------------- */
  let _autoSaveTimer = null;
  let _isCloudOp = false; // guard to prevent auto-save loop during cloud ops
  const AUTO_SAVE_DELAY = 2000; // 2 seconds debounce — save quickly after each action

  function _scheduleAutoSave() {
    // Don't schedule while a cloud operation is in progress (prevents infinite loop)
    if (_isCloudOp) return;
    // Only auto-save if authenticated and ezgalaxy.storage is available
    if (!state.auth || !state.auth.user || typeof ezgalaxy === 'undefined' || !ezgalaxy.storage) return;
    // Don't auto-save if we're on welcome AND have no meaningful data yet
    if (state.step === 'welcome' && !state.analysis && (!state.profile || state.profile.monthlyNetIncome === 0) && (state.transactions || []).length === 0) return;
    if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(async () => {
      _autoSaveTimer = null;
      // Re-check guard (state may have changed during the delay)
      if (_isCloudOp) return;
      if (state.step === 'welcome' && !state.analysis && (!state.profile || state.profile.monthlyNetIncome === 0) && (state.transactions || []).length === 0) return;
      _isCloudOp = true;
      try {
        await cloudSave();
        console.log('[Store] Auto-save completed');
      } catch (e) {
        console.warn('[Store] Auto-save failed:', e.message);
      } finally {
        _isCloudOp = false;
      }
    }, AUTO_SAVE_DELAY);
  }

  function init() {
    loadLocal();

    // ── Configure mobile SDK when running as PWA ─────────────
    if (_isPWA && typeof ezgalaxy !== 'undefined' && typeof ezgalaxy.configureMobile === 'function') {
      const platform = _detectPlatform();
      const deviceUuid = _getDeviceUUID();
      try {
        ezgalaxy.configureMobile({
          serverUrl: window.location.origin,
          appKey: '', // populated at runtime by admin-issued key stored in ezgalaxy.app
          deviceUuid,
          extensionId: EXTENSION_ID,
          platform
        });
        console.log(`[Store] Mobile SDK configured — platform: ${platform}, uuid: ${deviceUuid.slice(0, 8)}…`);
      } catch (e) {
        console.warn('[Store] Mobile SDK configuration failed:', e.message);
      }
    }

    // Log authorization
    fetch('./ezgalaxy-authorization.json')
      .then(r => r.json())
      .then(auth => {
        console.log('[FinVest] Authorization loaded:', auth.capabilities.map(c => `${c.name}:${c.enabled}`).join(', '));
      })
      .catch(() => console.warn('[FinVest] Could not load authorization file'));

    // ── Auto-save: subscribe to all state changes ───────────
    subscribe(() => _scheduleAutoSave());

    // ── Auto-load from cloud on first connect ────────────────
    if (state.auth && state.auth.user && typeof ezgalaxy !== 'undefined' && ezgalaxy.storage) {
      cloudLoad()
        .then(loaded => {
          if (loaded) {
            console.log('[Store] Cloud data loaded on init');
            if (typeof window.renderApp === 'function') window.renderApp();
          }
        })
        .catch(e => console.warn('[Store] Auto-load failed:', e.message));
    }

    return state;
  }

  /* ---------- PUBLIC API -------------------------------------- */
  window.Store = {
    subscribe, getState, setState,
    setProfile, updateProfile, resetProfile,
    runAnalysis,
    login, register, logout,
    cloudSave, cloudLoad,
    exportJSON, importJSON,
    // ── New Phase-1 API ────────────────────────────────────
    addXP,
    addTransaction, removeTransaction,
    addSnapshot,
    addPosition, removePosition,
    toggleWatchlist,
    completeChallenge,
    addNotification, markNotificationsRead,
    addJournalEntry, removeJournalEntry,
    init,
    defaultProfile, defaultSettings,
    // ── Mobile / PWA ──────────────────────────────────────
    isPWA: _isPWA,
    getDeviceUUID: _getDeviceUUID,
    detectPlatform: _detectPlatform
  };
})();
