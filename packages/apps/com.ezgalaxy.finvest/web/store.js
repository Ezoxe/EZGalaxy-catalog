/* ================================================================
   FinVest — store.js  (State Management & Persistence)
   Pub/sub store + Cloud sync via Community Data API + localStorage
   Exposes: window.Store
   ================================================================ */
(() => {
  'use strict';

  const EXTENSION_ID = 'com.ezgalaxy.finvest';
  const LS_KEY = 'finvest_state';
  const LS_AUTH = 'finvest_auth';

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
    profile: { ...defaultProfile },
    analysis: null,
    currentView: 'overview',
    settings: { ...defaultSettings },
    auth: { token: null, user: null },
    cloudStatus: 'disconnected' // disconnected | connected | syncing | error
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

  /* ---------- localStorage ------------------------------------ */
  function saveLocal() {
    try {
      const payload = {
        step: state.step,
        questionnaireStep: state.questionnaireStep,
        profile: state.profile,
        analysis: state.analysis,
        currentView: state.currentView,
        settings: state.settings
      };
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch (e) { /* quota exceeded — silent */ }
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      state = {
        ...state,
        step: saved.step || 'welcome',
        questionnaireStep: saved.questionnaireStep || 0,
        profile: { ...defaultProfile, ...saved.profile },
        analysis: saved.analysis || null,
        currentView: saved.currentView || 'overview',
        settings: { ...defaultSettings, ...saved.settings }
      };
      // Restore auth token separately
      try {
        const authRaw = localStorage.getItem(LS_AUTH);
        if (authRaw) {
          const auth = JSON.parse(authRaw);
          state.auth = auth;
          state.cloudStatus = auth.token ? 'connected' : 'disconnected';
        }
      } catch (_) { /* ignore */ }
      return true;
    } catch (e) { return false; }
  }

  /* ---------- Cloud — Community Data API ---------------------- */
  async function communityFetch(url, options = {}) {
    if (!state.auth.token) throw new Error('Non connecté');
    const headers = {
      'Authorization': `Bearer ${state.auth.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      setState({ auth: { token: null, user: null }, cloudStatus: 'disconnected' });
      localStorage.removeItem(LS_AUTH);
      throw new Error('Session expirée — reconnectez-vous');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Erreur ${res.status}`);
    }
    return res;
  }

  async function login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Identifiants invalides');
    }
    const data = await res.json();
    const auth = { token: data.token, user: data.user };
    localStorage.setItem(LS_AUTH, JSON.stringify(auth));
    setState({ auth, cloudStatus: 'connected' });
    return data.user;
  }

  function logout() {
    localStorage.removeItem(LS_AUTH);
    setState({ auth: { token: null, user: null }, cloudStatus: 'disconnected' });
  }

  async function cloudSave() {
    setState({ cloudStatus: 'syncing' });
    try {
      const payload = {
        profile: state.profile,
        analysis: state.analysis,
        settings: state.settings,
        step: state.step,
        questionnaireStep: state.questionnaireStep,
        currentView: state.currentView,
        savedAt: new Date().toISOString()
      };
      const compressed = typeof LZString !== 'undefined'
        ? LZString.compressToUTF16(JSON.stringify(payload))
        : JSON.stringify(payload);

      await communityFetch(`/api/community/${EXTENSION_ID}/profiles/main`, {
        method: 'PUT',
        body: JSON.stringify({ data: { compressed: typeof LZString !== 'undefined', payload: compressed } })
      });
      setState({ cloudStatus: 'connected' });
      return true;
    } catch (e) {
      setState({ cloudStatus: 'error' });
      throw e;
    }
  }

  async function cloudLoad() {
    setState({ cloudStatus: 'syncing' });
    try {
      const res = await communityFetch(`/api/community/${EXTENSION_ID}/profiles/main`);
      const record = await res.json();
      const d = record.data;
      let payload;
      if (d && d.compressed && typeof LZString !== 'undefined') {
        payload = JSON.parse(LZString.decompressFromUTF16(d.payload));
      } else if (d && d.payload) {
        payload = typeof d.payload === 'string' ? JSON.parse(d.payload) : d.payload;
      } else {
        payload = d;
      }
      if (payload && payload.profile) {
        state = {
          ...state,
          profile: { ...defaultProfile, ...payload.profile },
          analysis: payload.analysis || null,
          settings: { ...defaultSettings, ...(payload.settings || {}) },
          step: payload.step || (payload.analysis ? 'dashboard' : 'welcome'),
          questionnaireStep: payload.questionnaireStep || 0,
          currentView: payload.currentView || 'overview'
        };
        saveLocal();
        setState({ cloudStatus: 'connected' });
        notify();
        return true;
      }
      setState({ cloudStatus: 'connected' });
      return false;
    } catch (e) {
      if (e.message && e.message.includes('404')) {
        setState({ cloudStatus: 'connected' });
        return false;
      }
      setState({ cloudStatus: 'error' });
      throw e;
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
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finvest-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
  function init() {
    loadLocal();
    // Log authorization
    fetch('./ezgalaxy-authorization.json')
      .then(r => r.json())
      .then(auth => {
        console.log('[FinVest] Authorization loaded:', auth.capabilities.map(c => `${c.name}:${c.enabled}`).join(', '));
      })
      .catch(() => console.warn('[FinVest] Could not load authorization file'));
    return state;
  }

  /* ---------- PUBLIC API -------------------------------------- */
  window.Store = {
    subscribe, getState, setState,
    setProfile, updateProfile, resetProfile,
    runAnalysis,
    login, logout,
    cloudSave, cloudLoad,
    exportJSON, importJSON,
    init,
    defaultProfile, defaultSettings
  };
})();
