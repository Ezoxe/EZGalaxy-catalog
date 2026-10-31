/**
 * IT Discovery — application (screens, navigation, game flows).
 * The server (api.js → /api/v2) decides identity, XP, scores and rankings;
 * this file only renders and sends what the player does.
 */
(() => {
  'use strict';

  /* ───────── Helpers ───────── */
  const $id = (id) => document.getElementById(id);
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function escapeHtml(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function shuffleWithSeed(arr, seed) {
    const a = arr.slice();
    let s = seed || 1;
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const fmtInt = (n) => Number(n || 0).toLocaleString('fr-FR');
  const fmtTime = (ms) => {
    if (ms == null) return '—';
    const s = Math.round(ms / 100) / 10;
    if (s < 60) return s.toFixed(1).replace('.', ',') + ' s';
    const m = Math.floor(s / 60);
    return m + ' min ' + String(Math.round(s % 60)).padStart(2, '0');
  };
  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const fmtMonth = (iso) => {
    const d = new Date(iso);
    const s = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const ago = (iso) => {
    if (!iso) return '—';
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days <= 0) return 'aujourd\'hui';
    if (days === 1) return 'hier';
    if (days < 31) return 'il y a ' + days + ' j';
    if (days < 365) return 'il y a ' + Math.floor(days / 30) + ' mois';
    return 'il y a ' + Math.floor(days / 365) + ' an' + (days >= 730 ? 's' : '');
  };

  /* ───────── References ───────── */
  const Data = window.ITData;
  const Effects = window.ITEffects;
  const Api = window.ITApi;
  const Icons = window.ITIcons;
  const Scenes = window.ITScenes;
  const ic = (name, size) => (Icons ? Icons.svg(name, { size: size || 18 }) : '');

  const GUEST_KEY = 'it-discovery-guest-v2';
  const PREF_KEY = 'it-discovery-prefs';
  const LEGACY_KEYS = ['it-discovery-progress', 'it-discovery-user'];
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const LEVELS = [['college', 'Collège'], ['lycee', 'Lycée'], ['but', 'BUT']];
  const XP_LESSON = 10;
  const MODES = {
    quiz: { label: 'Quiz', icon: 'check' },
    ghost: { label: 'Duel fantôme', icon: 'ghost' },
    speedrun: { label: 'Speedrun', icon: 'bolt' },
    survival: { label: 'Survie', icon: 'heart' },
    daily: { label: 'Défi du jour', icon: 'calendar' },
  };

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function writeJson(key, value) {
    try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  /* ───────── State ───────── */
  const State = {
    screen: 'loading',
    module: null,
    lesson: 0,
    user: null,
    progress: null,          // server progress when logged in
    guest: readJson(GUEST_KEY, { lessons: [], quizBest: {} }),
    prefs: readJson(PREF_KEY, { level: 'college' }),
    offline: false,
    run: null,
    board: { tab: 'season', loading: false, season: null, hall: null, records: null, error: '' },
    ghosts: {},
    auth: { mode: 'login', pseudo: '', pin: '', error: '', triesLeft: null, lockedUntil: 0, loading: false },
    pinChange: { pin: '', error: '', loading: false, step: 'current', current: '' },
    admin: { code: '', error: '', loading: false, overview: null, lockedUntil: 0 },
    seenScenes: new Set(),
    sceneCtrls: [],
    timers: [],
  };

  /* ═══════════════════════════════════════════
     PROGRESS (server when logged in, local when guest)
     ═══════════════════════════════════════════ */
  const lessonRef = (mid, i) => mid + ':' + i;

  function computeStatus(lessons, quizBest) {
    const completed = new Set(Data.MODULES
      .filter((m) => quizBest[m.id] && m.lessons.every((_, i) => lessons.has(lessonRef(m.id, i))))
      .map((m) => m.id));
    const unlocked = new Set(Data.MODULES
      .filter((m) => (m.requiredModules || []).every((r) => completed.has(r) || !Data.MODULES.some((x) => x.id === r)))
      .map((m) => m.id));
    return { completed, unlocked };
  }

  function P() {
    if (State.progress) {
      const p = State.progress;
      return {
        xp: p.xp, seasonXp: p.seasonXp, lessons: new Set(p.lessons), scenes: new Set(p.scenes),
        quizBest: p.quizBest || {}, completed: new Set(p.completed), unlocked: new Set(p.unlocked),
        badges: p.badges || [], stats: p.stats || {}, guest: false,
      };
    }
    const lessons = new Set(State.guest.lessons || []);
    const quizBest = State.guest.quizBest || {};
    const { completed, unlocked } = computeStatus(lessons, quizBest);
    const quizXp = Object.values(quizBest).reduce((s, q) => s + q.score * 5 + (q.score >= q.total ? 20 : 0), 0);
    return {
      xp: lessons.size * XP_LESSON + quizXp, seasonXp: 0, lessons, scenes: new Set(), quizBest, completed, unlocked,
      badges: [], stats: {}, guest: true,
    };
  }

  function levelFor(xp) {
    let idx = 0;
    Data.LEVELS.forEach((l, i) => { if (xp >= l.min) idx = i; });
    const cur = Data.LEVELS[idx];
    const next = Data.LEVELS[idx + 1];
    const pct = next ? Math.min(100, ((xp - cur.min) / (next.min - cur.min)) * 100) : 100;
    return { ...cur, index: idx, next, pct };
  }

  function moduleProgress(mod, p) {
    const done = mod.lessons.filter((_, i) => p.lessons.has(lessonRef(mod.id, i))).length + (p.quizBest[mod.id] ? 1 : 0);
    const total = mod.lessons.length + 1;
    return { done, total, pct: Math.round((done / total) * 100) };
  }

  function saveGuest() { writeJson(GUEST_KEY, State.guest); }
  function savePrefs() { writeJson(PREF_KEY, State.prefs); }

  function announceBadges(ids) {
    (ids || []).forEach((id) => {
      const b = Data.BADGES.find((x) => x.id === id);
      if (b) toast('achievement', `${b.icon} Badge débloqué : ${b.title}`);
    });
  }

  function applyProgress(progress, newBadges) {
    const before = State.progress ? levelFor(State.progress.xp).index : null;
    State.progress = progress;
    if (before != null && levelFor(progress.xp).index > before) {
      const lvl = levelFor(progress.xp);
      toast('achievement', `${lvl.icon} Niveau supérieur : tu es maintenant ${lvl.title} !`);
      if (Effects) Effects.confetti();
    }
    announceBadges(newBadges);
  }

  /* ═══════════════════════════════════════════
     SESSION
     ═══════════════════════════════════════════ */
  async function restoreSession() {
    LEGACY_KEYS.forEach((k) => writeJson(k, null));
    if (!Api.hasToken()) return;
    try {
      const me = await Api.me();
      State.user = me.player;
      const flushed = await Api.flushQueue();
      State.progress = flushed ? flushed.progress : await Api.progress();
      State.offline = false;
    } catch (err) {
      if (err.code === 'network') {
        State.offline = true;
        toast('error', err.message);
      } else {
        Api.setToken(null);
        State.user = null;
        State.progress = null;
      }
    }
  }

  async function afterLogin(result, isNew) {
    Api.setToken(result.token);
    State.user = result.player;
    let imported = null;
    if (isNew && (State.guest.lessons || []).length) {
      try { imported = await Api.importGuest(State.guest.lessons); } catch (e) { imported = null; }
    }
    // Guest progress stays on this device only until an account takes it over.
    State.guest = { lessons: [], quizBest: {} };
    saveGuest();
    try { State.progress = imported ? imported.progress : await Api.progress(); } catch (e) { State.progress = null; }
    if (imported && imported.xpGained) toast('success', `Progression invité importée : +${imported.xpGained} XP`);
    toast('success', isNew ? `Bienvenue ${result.player.pseudo} !` : `Content de te revoir, ${result.player.pseudo} !`);
    if (Effects) Effects.confetti();
    navigate(result.player.mustChangePin ? 'pin-change' : 'modules');
  }

  async function logout() {
    await Api.logout();
    Api.setToken(null);
    Api.clearQueue();
    State.user = null;
    State.progress = null;
    State.ghosts = {};
    State.board.season = null;
    State.guest = { lessons: [], quizBest: {} };
    saveGuest();
    toast('info', 'Tu es déconnecté. La progression de cet appareil a été effacée.');
    navigate('home');
  }

  /* ═══════════════════════════════════════════
     TOASTS AND DIALOGS
     ═══════════════════════════════════════════ */
  function toast(type, message) {
    const container = $id('toast-container');
    if (!container) return;
    const icons = { success: 'check', error: 'warning', info: 'bulb', achievement: 'trophy' };
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `<span class="toast-icon">${ic(icons[type] || 'bulb')}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('hiding');
      setTimeout(() => el.remove(), 350);
    }, 4000);
  }

  function dialog(opts) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';
      const field = opts.input
        ? `<label class="field-label" for="dialog-input">${escapeHtml(opts.input.label)}</label>
           <input id="dialog-input" class="auth-input" value="${escapeHtml(opts.input.value || '')}" autocomplete="off">`
        : '';
      overlay.innerHTML = `
        <div class="dialog-box" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <h3 id="dialog-title">${escapeHtml(opts.title)}</h3>
          ${opts.message ? `<p>${escapeHtml(opts.message)}</p>` : ''}
          ${opts.html || ''}
          ${field}
          <div class="dialog-actions">
            ${opts.cancel === false ? '' : '<button type="button" class="btn btn-ghost dialog-cancel">Annuler</button>'}
            <button type="button" class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'} dialog-confirm">${escapeHtml(opts.confirmLabel || 'Confirmer')}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const input = overlay.querySelector('#dialog-input');
      const confirm = overlay.querySelector('.dialog-confirm');
      const close = (value) => { overlay.remove(); document.removeEventListener('keydown', onKey, true); resolve(value); };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); close(null); }
        if (e.key === 'Enter' && input && document.activeElement === input) { e.stopPropagation(); close(input.value); }
      };
      document.addEventListener('keydown', onKey, true);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
      const cancel = overlay.querySelector('.dialog-cancel');
      if (cancel) cancel.addEventListener('click', () => close(null));
      confirm.addEventListener('click', () => close(input ? input.value : true));
      (input || confirm).focus();
    });
  }

  /* ═══════════════════════════════════════════
     NAVIGATION AND RENDER
     ═══════════════════════════════════════════ */
  function clearTimers() {
    State.timers.forEach(clearInterval);
    State.timers = [];
  }

  function navigate(screen, params) {
    if (State.screen === 'run' && screen !== 'run' && screen !== 'run-result' && State.run && !State.run.finished) abandonRun();
    State.screen = screen;
    if (params) {
      if (params.module !== undefined) State.module = params.module;
      if (params.lesson !== undefined) State.lesson = params.lesson;
    }
    const app = $id('app');
    const done = () => { render(); window.scrollTo(0, 0); };
    if (Effects && app) Effects.transition(app, done);
    else done();
  }

  function render() {
    const app = $id('app');
    if (!app) return;
    State.sceneCtrls.forEach((c) => c.destroy());
    State.sceneCtrls = [];
    clearTimers();
    const screens = {
      loading: renderLoading, home: renderHome, auth: renderAuth, 'pin-change': renderPinChange,
      modules: renderModules, module: renderModuleDetail, lesson: renderLesson,
      run: renderRun, 'run-result': renderRunResult, arcade: renderArcade,
      leaderboard: renderLeaderboard, profile: renderProfile, trophies: renderTrophies, tutor: renderTutor,
    };
    const fn = screens[State.screen] || renderHome;
    const bare = ['loading', 'home', 'auth', 'pin-change'].includes(State.screen);
    app.innerHTML = (bare ? '' : renderHeader()) + `<main class="screen screen-${State.screen}" id="main">${fn()}</main>` + (bare ? '' : renderFooter());
    afterRender();
  }

  function afterRender() {
    if (State.screen === 'lesson') mountScenes();
    if (State.screen === 'modules' && Effects) setTimeout(() => Effects.staggerIn('.module-card', 70), 30);
    if (State.screen === 'run') startRunTimers();
    if (State.screen === 'auth' || State.screen === 'tutor') startLockTimer();
    if (State.screen === 'leaderboard') startSeasonCountdown();
    const focusable = $('[data-autofocus]');
    if (focusable) focusable.focus({ preventScroll: true });
  }

  /* ═══════════════════════════════════════════
     HEADER / FOOTER / HOME
     ═══════════════════════════════════════════ */
  function renderHeader() {
    const p = P();
    const lvl = levelFor(p.xp);
    const nav = [['modules', 'map', 'Cours'], ['arcade', 'play', 'Mini-jeux'], ['leaderboard', 'trophy', 'Classement']];
    return `
      <header class="topbar">
        <button type="button" class="brand" data-action="home" aria-label="Accueil IT Discovery">
          <span class="brand-mark">${ic('bulb', 20)}</span><span class="brand-name">IT Discovery</span>
        </button>
        <nav class="topnav" aria-label="Navigation principale">
          ${nav.map(([s, i, l]) => `<button type="button" class="topnav-btn${State.screen === s ? ' on' : ''}" data-action="go" data-screen="${s}">${ic(i)}<span>${l}</span></button>`).join('')}
        </nav>
        <div class="topbar-right">
          <button type="button" class="xp-pill" data-action="go" data-screen="profile" title="Voir ton profil">
            <span class="xp-level">${lvl.icon} ${escapeHtml(lvl.title)}</span>
            <span class="xp-value">${fmtInt(p.xp)} XP</span>
            <span class="xp-bar"><span style="width:${lvl.pct}%"></span></span>
          </button>
          ${State.user
            ? `<button type="button" class="user-btn" data-action="go" data-screen="profile">${ic('user')}<span>${escapeHtml(State.user.pseudo)}</span></button>`
            : `<button type="button" class="user-btn login" data-action="auth">${ic('lock')}<span>Connexion</span></button>`}
        </div>
      </header>
      ${State.offline ? '<div class="offline-banner" role="status">Serveur injoignable : tes actions ne sont pas enregistrées pour l\'instant.</div>' : ''}
      ${!State.user ? '<div class="guest-banner">Mode invité : ta progression reste sur cet appareil et ne compte pas au classement. <button type="button" class="link-btn" data-action="auth">Créer un compte</button></div>' : ''}`;
  }

  function renderFooter() {
    return `<footer class="footer"><span>IT Discovery · apprendre l'informatique en s'amusant</span><button type="button" class="link-btn" data-action="go" data-screen="tutor">Espace tuteur</button></footer>`;
  }

  function renderLoading() {
    return `<div class="loading-screen"><div class="loading-icon">${ic('bulb', 48)}</div><h1 class="loading-title">IT Discovery</h1><p class="loading-sub">Chargement…</p><div class="loading-bar"><div class="loading-bar-inner"></div></div></div>`;
  }

  function renderHome() {
    const p = P();
    const lvl = levelFor(p.xp);
    const lessonsTotal = Data.MODULES.reduce((s, m) => s + m.lessons.length, 0);
    return `
      <section class="home">
        <div class="home-orbit" aria-hidden="true"><span></span><span></span><span></span></div>
        <p class="home-kicker">Du collège au BUT</p>
        <h1 class="home-title">IT Discovery</h1>
        <p class="home-subtitle">Découvre comment marchent vraiment les ordinateurs, Internet, la cybersécurité ou l'IA, grâce à ${Data.MODULES.length} modules animés, des défis et un classement entre stagiaires.</p>
        <div class="home-actions">
          <button type="button" class="btn btn-primary btn-lg" data-action="go" data-screen="modules" data-autofocus>${ic('rocket')} ${p.lessons.size ? 'Continuer l\'aventure' : 'Commencer l\'aventure'}</button>
          ${State.user ? '' : `<button type="button" class="btn btn-ghost btn-lg" data-action="auth">${ic('user')} Se connecter / créer un compte</button>`}
        </div>
        <div class="home-links">
          <button type="button" class="chip-btn" data-action="go" data-screen="arcade">${ic('play')} Mini-jeux</button>
          <button type="button" class="chip-btn" data-action="go" data-screen="leaderboard">${ic('trophy')} Classement</button>
          ${State.user ? `<button type="button" class="chip-btn" data-action="go" data-screen="profile">${ic('user')} ${escapeHtml(State.user.pseudo)}</button>` : ''}
        </div>
        ${p.xp > 0 ? `
          <div class="home-stats">
            <div class="stat"><span class="stat-value">${lvl.icon}</span><span class="stat-label">${escapeHtml(lvl.title)}</span></div>
            <div class="stat"><span class="stat-value">${fmtInt(p.xp)}</span><span class="stat-label">XP</span></div>
            <div class="stat"><span class="stat-value">${p.lessons.size}/${lessonsTotal}</span><span class="stat-label">Leçons</span></div>
            <div class="stat"><span class="stat-value">${p.completed.size}/${Data.MODULES.length}</span><span class="stat-label">Modules</span></div>
          </div>` : ''}
      </section>`;
  }

  /* ═══════════════════════════════════════════
     MODULES
     ═══════════════════════════════════════════ */
  function requirementText(mod) {
    return 'Termine d\'abord : ' + (mod.requiredModules || []).map((id) => {
      const m = Data.MODULES.find((x) => x.id === id);
      return m ? m.title : id;
    }).join(', ');
  }

  function renderModules() {
    const p = P();
    const tiers = {};
    Data.MODULES.forEach((m) => { (tiers[m.tier] = tiers[m.tier] || []).push(m); });
    return `
      <section class="page">
        <div class="page-head">
          <h1>Choisis ton module</h1>
          <p>Chaque module contient des leçons animées et un quiz. Termine-les pour débloquer le niveau suivant.</p>
        </div>
        ${Object.keys(tiers).sort().map((tier) => `
          <div class="tier">
            <h2 class="tier-title"><span class="tier-num">${tier}</span>${escapeHtml(Data.TIERS[tier] || 'Niveau ' + tier)}</h2>
            <div class="modules-grid">
              ${tiers[tier].map((mod) => {
                const unlocked = p.unlocked.has(mod.id);
                const prog = moduleProgress(mod, p);
                const done = p.completed.has(mod.id);
                return `
                  <button type="button" class="module-card${done ? ' completed' : ''}${unlocked ? '' : ' locked'}" style="--module-color:${mod.color}"
                    ${unlocked ? `data-action="open-module" data-module="${mod.id}"` : 'aria-disabled="true"'}>
                    <span class="module-card-icon" aria-hidden="true">${mod.icon}</span>
                    <span class="module-card-title">${escapeHtml(mod.title)}</span>
                    <span class="module-card-desc">${escapeHtml(mod.description)}</span>
                    ${unlocked
                      ? `<span class="module-progress"><span style="width:${prog.pct}%"></span></span><span class="module-progress-text">${done ? 'Terminé' : prog.done + ' / ' + prog.total + ' étapes'}</span>`
                      : `<span class="module-lock">${ic('lock')} ${escapeHtml(requirementText(mod))}</span>`}
                  </button>`;
              }).join('')}
            </div>
          </div>`).join('')}
      </section>`;
  }

  function renderModuleDetail() {
    const mod = Data.MODULES.find((m) => m.id === State.module);
    if (!mod) return renderModules();
    const p = P();
    const best = p.quizBest[mod.id];
    const hasLesson = mod.lessons.some((_, i) => p.lessons.has(lessonRef(mod.id, i)));
    const ghost = State.ghosts[mod.id];
    return `
      <section class="page narrow">
        <button type="button" class="btn-back" data-action="go" data-screen="modules">${ic('prev')} Tous les modules</button>
        <div class="module-hero" style="--module-color:${mod.color}">
          <span class="module-hero-icon" aria-hidden="true">${mod.icon}</span>
          <div><h1>${escapeHtml(mod.title)}</h1><p>${escapeHtml(mod.description)}</p></div>
        </div>
        <ol class="lesson-list">
          ${mod.lessons.map((lesson, i) => {
            const done = p.lessons.has(lessonRef(mod.id, i));
            const scenes = lesson.content.filter((b) => b.type === 'scene').length;
            return `
              <li><button type="button" class="lesson-item${done ? ' completed' : ''}" data-action="open-lesson" data-lesson="${i}">
                <span class="lesson-num">${done ? ic('check') : i + 1}</span>
                <span class="lesson-info"><span class="lesson-title">${escapeHtml(lesson.title)}</span>
                <span class="lesson-meta">${scenes} scène${scenes > 1 ? 's' : ''} animée${scenes > 1 ? 's' : ''} · ${done ? 'terminée' : '+' + XP_LESSON + ' XP'}</span></span>
                <span class="lesson-go">${ic('next')}</span>
              </button></li>`;
          }).join('')}
        </ol>
        <div class="quiz-box">
          <div>
            <h2>${ic('check')} Quiz du module</h2>
            <p>${mod.quizCount} questions corrigées par le serveur. ${best ? `Meilleur score : <strong>${best.score}/${best.total}</strong>${best.perfectTimeMs ? ' · sans-faute en ' + fmtTime(best.perfectTimeMs) : ''}` : 'Pas encore tenté.'}</p>
          </div>
          <button type="button" class="btn btn-primary" ${hasLesson ? 'data-action="start-run" data-kind="quiz"' : 'disabled'}>
            ${hasLesson ? 'Lancer le quiz' : 'Lis au moins une leçon'}
          </button>
        </div>
        ${State.user ? renderGhostCard(mod, ghost) : ''}
      </section>`;
  }

  function renderGhostCard(mod, ghost) {
    if (ghost === undefined) return '<div class="ghost-card muted">Recherche d\'un fantôme à affronter…</div>';
    if (!ghost) {
      const mine = P().quizBest[mod.id];
      return `<div class="ghost-card muted">${ic('ghost', 22)} <span>${mine && mine.perfectTimeMs ? 'Tu détiens le meilleur temps sur ce quiz : personne à battre pour l\'instant !' : 'Aucun fantôme pour ce module : fais un sans-faute pour devenir celui que les prochains devront battre.'}</span></div>`;
    }
    return `
      <div class="ghost-card">
        <span class="ghost-icon">${ic('ghost', 34)}</span>
        <div class="ghost-text">
          <span class="ghost-kicker">Duel fantôme</span>
          <strong>Bats ${escapeHtml(ghost.pseudo)}</strong>
          <span>Sans-faute en ${fmtTime(ghost.durationMs)}${ghost.myBestMs ? ' · ton meilleur : ' + fmtTime(ghost.myBestMs) : ''} · ${fmtMonth(ghost.at)}</span>
        </div>
        <button type="button" class="btn btn-violet" data-action="start-run" data-kind="ghost">Lancer le duel</button>
      </div>`;
  }

  async function loadGhost(moduleId) {
    if (!State.user) return;
    try {
      const res = await Api.ghost(moduleId);
      State.ghosts[moduleId] = res.ghost;
    } catch (e) {
      State.ghosts[moduleId] = null;
    }
    if (State.screen === 'module' && State.module === moduleId) render();
  }

  /* ═══════════════════════════════════════════
     LESSON
     ═══════════════════════════════════════════ */
  function renderBlock(block, bi) {
    const t = escapeHtml;
    switch (block.type) {
      case 'scene':
        return `<div class="content-block scene-mount" data-scene-id="${t(block.id)}"></div>`;
      case 'paragraph':
        return `<p class="content-block content-paragraph">${t(block.text)}</p>`;
      case 'analogy':
        return `<div class="content-block content-analogy">${t(block.text)}</div>`;
      case 'highlight':
        return `<div class="content-block content-highlight">${t(block.text)}</div>`;
      case 'fun-fact':
        return `<div class="content-block content-fun-fact"><span class="fact-label">Le savais-tu ?</span> ${t(block.text)}</div>`;
      case 'list':
        return `<div class="content-block content-list"><div class="content-list-title">${t(block.title)}</div><ul>${block.items.map((i) => `<li>${t(i)}</li>`).join('')}</ul></div>`;
      case 'steps':
        return `<div class="content-block content-steps"><div class="steps-title">${t(block.title)}</div><ol class="steps-flow">${block.steps.map((s, i) => `<li class="step-item" style="animation-delay:${i * 0.12}s"><span class="step-number">${i + 1}</span><span class="step-text">${t(s)}</span></li>`).join('')}</ol></div>`;
      case 'interactive-reveal':
        return `<div class="content-block content-interactive"><div class="interactive-title">${t(block.question)}</div><div class="reveal-options">${block.options.map((o) => `<button type="button" class="reveal-option" data-action="reveal"><span class="reveal-question">${t(o.text)}</span><span class="reveal-answer">${t(o.revealed)}</span></button>`).join('')}</div></div>`;
      case 'drag-sort': {
        const order = shuffleWithSeed(block.items.map((item, i) => ({ item, i })), block.question.length + bi);
        return `<div class="content-block content-interactive content-drag-sort"><div class="interactive-title">${t(block.question)}</div>
          <p class="interactive-hint">Clique sur un élément puis sur un autre pour les échanger.</p>
          <div class="drag-sort-list">${order.map((o, pos) => `<button type="button" class="drag-sort-item" data-action="drag-sort-select" data-sort-idx="${o.i}"><span class="drag-sort-num">${pos + 1}</span><span class="drag-sort-text">${t(o.item)}</span></button>`).join('')}</div>
          <button type="button" class="btn btn-ghost interactive-check-btn" data-action="drag-sort-check">Vérifier l'ordre</button><p class="interactive-feedback" aria-live="polite"></p></div>`;
      }
      case 'drag-match': {
        const defs = shuffleWithSeed(block.pairs.map((p) => p.definition), block.question.length + bi);
        return `<div class="content-block content-interactive content-drag-match"><div class="interactive-title">${t(block.question)}</div>
          <p class="interactive-hint">Clique sur un terme, puis sur sa définition.</p>
          <div class="drag-match-container"><div class="drag-match-terms">${block.pairs.map((p) => `<button type="button" class="drag-match-term" data-action="drag-match-term" data-def="${t(p.definition)}">${t(p.term)}</button>`).join('')}</div>
          <div class="drag-match-defs">${defs.map((d) => `<button type="button" class="drag-match-def" data-action="drag-match-def" data-def="${t(d)}">${t(d)}</button>`).join('')}</div></div></div>`;
      }
      case 'mini-terminal':
        return `<div class="content-block content-interactive content-mini-terminal"><div class="interactive-title">${t(block.title)}</div>
          <div class="mini-terminal"><div class="mini-terminal-output" aria-live="polite"><div class="mini-terminal-line output">Tape une commande puis Entrée (essaie « help »).</div></div>
          <div class="mini-terminal-input-row"><span class="mini-terminal-prompt">$</span>
          <input type="text" class="mini-terminal-input" data-block="${bi}" aria-label="Commande" placeholder="help" autocomplete="off" spellcheck="false"></div></div></div>`;
      case 'flashcard-deck':
        return `<div class="content-block content-interactive content-flashcards"><div class="interactive-title">${t(block.title)}</div><div class="flashcard-deck">${block.cards.map((c) => `<button type="button" class="flashcard" data-action="flashcard-flip" aria-label="Retourner la carte ${t(c.front)}"><span class="flashcard-inner"><span class="flashcard-front">${t(c.front)}</span><span class="flashcard-back">${t(c.back)}</span></span></button>`).join('')}</div></div>`;
      case 'true-false':
        return `<div class="content-block content-interactive content-true-false"><div class="interactive-title">${t(block.title)}</div><div class="true-false-list">${block.statements.map((s) => `<div class="tf-statement" data-tf-answer="${s.answer}" data-tf-explanation="${t(s.explanation)}"><div class="tf-text">${t(s.text)}</div><div class="tf-buttons"><button type="button" class="tf-btn tf-true" data-action="tf-answer" data-tf-val="true">Vrai</button><button type="button" class="tf-btn tf-false" data-action="tf-answer" data-tf-val="false">Faux</button></div><div class="tf-feedback" aria-live="polite"></div></div>`).join('')}</div></div>`;
      case 'interactive-diagram':
        return `<div class="content-block content-interactive content-interactive-diagram"><div class="interactive-title">${t(block.title)}</div><div class="interactive-diagram-container">${block.elements.map((e) => `<button type="button" class="diagram-element" data-action="diagram-click" style="left:${e.x}%;top:${e.y}%"><span class="diagram-el-label">${t(e.label)}</span><span class="diagram-el-info">${t(e.info)}</span></button>`).join('')}</div></div>`;
      default:
        return block.text ? `<p class="content-block content-paragraph">${t(block.text)}</p>` : '';
    }
  }

  function currentLesson() {
    const mod = Data.MODULES.find((m) => m.id === State.module);
    return mod ? { mod, lesson: mod.lessons[State.lesson] } : {};
  }

  function lessonScenesDone(mod, lesson, p) {
    if (p.lessons.has(lessonRef(mod.id, State.lesson))) return true;
    return lesson.content.filter((b) => b.type === 'scene').every((b) => State.seenScenes.has(b.id));
  }

  function renderLesson() {
    const { mod, lesson } = currentLesson();
    if (!mod || !lesson) return renderModules();
    const p = P();
    const isLast = State.lesson >= mod.lessons.length - 1;
    const ready = lessonScenesDone(mod, lesson, p);
    return `
      <section class="page lesson-view">
        <button type="button" class="btn-back" data-action="open-module" data-module="${mod.id}">${ic('prev')} ${escapeHtml(mod.title)}</button>
        <div class="lesson-header">
          <span class="lesson-tag" style="--module-color:${mod.color}">Leçon ${State.lesson + 1} / ${mod.lessons.length}</span>
          <h1 class="lesson-title"><span aria-hidden="true">${lesson.icon}</span> ${escapeHtml(lesson.title)}</h1>
          <div class="level-switch" role="group" aria-label="Niveau d'explication des scènes">
            <span>Niveau d'explication</span>
            ${LEVELS.map(([id, label]) => `<button type="button" class="level-btn${State.prefs.level === id ? ' on' : ''}" data-action="set-level" data-level="${id}" aria-pressed="${State.prefs.level === id}">${label}</button>`).join('')}
          </div>
        </div>
        <div class="lesson-content">${lesson.content.map(renderBlock).join('')}</div>
        <div class="lesson-nav">
          ${State.lesson > 0 ? `<button type="button" class="btn btn-ghost" data-action="prev-lesson">${ic('prev')} Leçon précédente</button>` : '<span></span>'}
          <div class="lesson-finish">
            ${ready ? '' : '<span class="lesson-hint">Regarde chaque scène jusqu\'à la dernière étape pour terminer la leçon.</span>'}
            <button type="button" class="btn btn-primary" data-action="finish-lesson" ${ready ? '' : 'disabled'} id="finish-lesson">
              ${isLast ? 'Terminer le module' : 'Leçon suivante'} ${ic('next')}
            </button>
          </div>
        </div>
      </section>`;
  }

  function mountScenes() {
    const { mod, lesson } = currentLesson();
    if (!mod || !Scenes) return;
    const p = P();
    $$('.scene-mount').forEach((el) => {
      const scene = lesson.content.find((b) => b.type === 'scene' && b.id === el.dataset.sceneId);
      if (!scene) return;
      const ctrl = Scenes.mount(el, scene, {
        level: State.prefs.level,
        answered: p.scenes.has(scene.id),
        onComplete: (id) => {
          State.seenScenes.add(id);
          const btn = $id('finish-lesson');
          if (btn && lessonScenesDone(mod, lesson, P())) {
            btn.disabled = false;
            const hint = $('.lesson-hint');
            if (hint) hint.remove();
          }
        },
        onQuiz: async (id, choice) => {
          const res = await Api.sceneQuiz(id, choice);
          if (res.xpGained && State.progress) {
            State.progress.xp += res.xpGained;
            State.progress.seasonXp += res.xpGained;
            State.progress.scenes = State.progress.scenes.concat(id);
            announceBadges(res.newBadges);
          }
          return res;
        },
      });
      State.sceneCtrls.push(ctrl);
    });
  }

  async function finishLesson() {
    const { mod } = currentLesson();
    if (!mod) return;
    const ref = lessonRef(mod.id, State.lesson);
    const btn = $id('finish-lesson');
    if (btn) btn.disabled = true;
    if (State.user) {
      try {
        const res = await Api.lesson(mod.id, State.lesson);
        applyProgress(res.progress, res.newBadges);
        if (res.xpGained) toast('success', `+${res.xpGained} XP · leçon terminée !`);
      } catch (err) {
        if (err.code === 'network') toast('info', 'Pas de connexion : la leçon sera enregistrée dès le retour du réseau.');
        else { toast('error', err.message); if (btn) btn.disabled = false; return; }
      }
    } else if (!State.guest.lessons.includes(ref)) {
      State.guest.lessons.push(ref);
      saveGuest();
      toast('success', `Leçon terminée ! (+${XP_LESSON} XP en mode invité)`);
    }
    if (State.lesson < mod.lessons.length - 1) navigate('lesson', { lesson: State.lesson + 1 });
    else { navigate('module', { module: mod.id }); loadGhost(mod.id); }
  }

  /* ═══════════════════════════════════════════
     RUNS: quiz, ghost duel, speedrun, survival, daily
     ═══════════════════════════════════════════ */
  let startingRun = false;

  async function startRun(kind, moduleId) {
    if (startingRun) return;
    startingRun = true;
    try {
      const res = await Api.startRun(kind, moduleId);
      State.run = {
        kind, module: moduleId || null, runId: res.runId, questions: res.questions, idx: 0, answered: null,
        score: 0, streak: 0, lives: res.lives, durationMs: res.durationMs, ghost: res.ghost,
        startedAt: performance.now(), finished: false, busy: false, summary: null,
      };
      navigate('run');
    } catch (err) {
      toast('error', err.message);
      if (err.code === 'daily_done' && State.progress) { State.progress.stats.dailyDoneToday = true; render(); }
    }
    startingRun = false;
  }

  const isFixedRun = (kind) => kind === 'quiz' || kind === 'ghost' || kind === 'daily';

  function runQuestion() {
    const r = State.run;
    return r.questions[r.idx % r.questions.length];
  }

  function renderRun() {
    const r = State.run;
    if (!r) return renderArcade();
    const q = runQuestion();
    const mode = MODES[r.kind];
    const total = isFixedRun(r.kind) ? r.questions.length : null;
    let status = '';
    if (r.kind === 'speedrun') status = `<span class="run-stat" id="run-timer">${ic('clock')} <b>60</b> s</span>`;
    if (r.kind === 'survival') status = `<span class="run-stat lives" aria-label="${r.lives} vie${r.lives > 1 ? 's' : ''}">${[0, 1, 2].map((i) => `<span class="${i < r.lives ? 'on' : ''}">${ic('heart')}</span>`).join('')}</span>`;
    if (total) status = `<span class="run-stat">${r.idx + 1} / ${total}</span>`;
    const answered = r.answered;
    const options = q.options.map((opt, i) => {
      let cls = 'answer-btn';
      if (answered) {
        if (i === answered.correctIndex) cls += ' correct';
        else if (i === answered.choice) cls += ' wrong';
      }
      return `<button type="button" class="${cls}" data-action="run-answer" data-index="${i}" ${answered || r.busy ? 'disabled' : ''}><span class="answer-letter">${LETTERS[i]}</span><span>${escapeHtml(opt)}</span></button>`;
    }).join('');
    const ghost = r.kind === 'ghost' && r.ghost ? `
      <div class="ghost-race" aria-hidden="true">
        <div class="race-row"><span>Toi</span><div class="race-track"><span class="race-me" style="width:${((r.idx + (answered ? 1 : 0)) / r.questions.length) * 100}%"></span></div></div>
        <div class="race-row"><span>${ic('ghost')} ${escapeHtml(r.ghost.pseudo)}</span><div class="race-track"><span class="race-ghost" id="race-ghost"></span></div></div>
      </div>` : '';
    const lastFixed = total && r.idx >= total - 1;
    return `
      <section class="page narrow run-view">
        <div class="run-head">
          <span class="run-mode">${ic(mode.icon)} ${mode.label}${(r.kind === 'quiz' || r.kind === 'ghost') ? ' · ' + escapeHtml(q.moduleTitle) : ''}</span>
          <div class="run-stats">${status}<span class="run-stat">${ic('star')} ${r.score} pts</span>${r.streak >= 2 ? `<span class="run-stat streak">${ic('flame')} ×${r.streak}</span>` : ''}</div>
          <button type="button" class="link-btn" data-action="quit-run">Quitter</button>
        </div>
        ${total ? `<div class="run-progress"><span style="width:${((r.idx + (answered ? 1 : 0)) / total) * 100}%"></span></div>` : ''}
        ${ghost}
        <div class="question-card">
          ${r.kind !== 'quiz' && r.kind !== 'ghost' ? `<span class="question-module">${escapeHtml(q.moduleIcon)} ${escapeHtml(q.moduleTitle)}</span>` : ''}
          <h2 class="question-text">${escapeHtml(q.question)}</h2>
          <div class="answers">${options}</div>
          ${answered ? `
            <div class="feedback ${answered.correct ? 'ok' : 'ko'}" role="status">
              <strong>${answered.correct ? 'Bonne réponse !' : 'Pas tout à fait…'}</strong> ${escapeHtml(answered.explanation || '')}
            </div>
            <button type="button" class="btn btn-primary next-btn" data-action="run-next" data-autofocus>${answered.finished || lastFixed ? 'Voir le résultat' : 'Question suivante'} ${ic('next')}</button>` : ''}
        </div>
      </section>`;
  }

  async function runAnswer(choice) {
    const r = State.run;
    if (!r || r.busy || r.answered || r.finished) return;
    r.busy = true;
    $$('.answer-btn').forEach((b) => { b.disabled = true; });
    try {
      const res = await Api.answer(r.runId, r.idx, choice);
      if (res.expired) { r.busy = false; finishRun(); return; }
      r.answered = { choice, correct: res.correct, correctIndex: res.correctIndex, explanation: res.explanation, finished: res.finished };
      r.score = res.score;
      r.streak = res.streak;
      if (res.lives != null) r.lives = res.lives;
    } catch (err) {
      r.busy = false;
      if (err.code === 'run_over') { finishRun(); return; }
      toast('error', err.message);
    }
    r.busy = false;
    if (State.screen === 'run') render();
  }

  function runNext() {
    const r = State.run;
    if (!r || !r.answered) return;
    const fixedDone = isFixedRun(r.kind) && r.idx >= r.questions.length - 1;
    if (r.answered.finished || fixedDone) { finishRun(); return; }
    r.idx += 1;
    r.answered = null;
    render();
  }

  async function finishRun() {
    const r = State.run;
    if (!r || r.finished) return;
    r.finished = true;
    clearTimers();
    try {
      const summary = await Api.finish(r.runId);
      r.summary = summary;
      if (summary.progress) applyProgress(summary.progress, summary.newBadges);
      else if (!State.user && (r.kind === 'quiz' || r.kind === 'ghost') && summary.total && summary.answered === summary.total) {
        const prev = State.guest.quizBest[r.module];
        if (!prev || summary.correct > prev.score) {
          State.guest.quizBest[r.module] = { score: summary.correct, total: summary.total };
          saveGuest();
        }
      }
      if (r.module) delete State.ghosts[r.module];
      State.board.season = null;
    } catch (err) {
      r.summary = { error: err.message, score: r.score };
    }
    navigate('run-result');
  }

  function abandonRun() {
    const r = State.run;
    if (!r || r.finished) return;
    r.finished = true;
    Api.finish(r.runId).then((s) => { if (s.progress) State.progress = s.progress; }).catch(() => null);
  }

  function startRunTimers() {
    const r = State.run;
    if (!r || r.finished) return;
    if (r.kind === 'speedrun') {
      const tick = () => {
        const left = Math.max(0, Math.ceil((r.durationMs - (performance.now() - r.startedAt)) / 1000));
        const el = $id('run-timer');
        if (el) { el.querySelector('b').textContent = left; el.classList.toggle('urgent', left <= 10); }
        if (left <= 0) finishRun();
      };
      tick();
      State.timers.push(setInterval(tick, 250));
    }
    if (r.kind === 'ghost' && r.ghost) {
      const line = r.ghost.timeline || [];
      const tick = () => {
        const t = performance.now() - r.startedAt;
        const done = line.filter((x) => x <= t).length;
        const el = $id('race-ghost');
        if (el) el.style.width = (done / r.questions.length) * 100 + '%';
      };
      tick();
      State.timers.push(setInterval(tick, 200));
    }
  }

  function renderRunResult() {
    const r = State.run;
    if (!r) return renderArcade();
    const s = r.summary || {};
    const mode = MODES[r.kind];
    if (s.error) {
      return `<section class="page narrow"><div class="result-card"><h1>Résultat indisponible</h1><p>${escapeHtml(s.error)}</p><button type="button" class="btn btn-primary" data-action="go" data-screen="arcade">Retour</button></div></section>`;
    }
    const fixed = isFixedRun(r.kind);
    const perfect = fixed && s.total && s.correct === s.total;
    const headline = s.flagged ? 'Partie non comptabilisée'
      : r.kind === 'ghost' ? (s.ghostWon ? 'Fantôme battu !' : 'Le fantôme gagne cette fois…')
        : perfect ? 'Sans-faute !' : s.record ? 'Nouveau record !' : s.personalBest ? 'Record personnel battu !' : 'Partie terminée';
    if ((perfect || s.record || s.ghostWon) && !s.flagged && Effects) setTimeout(() => Effects.confetti(), 300);
    return `
      <section class="page narrow">
        <div class="result-card">
          <span class="result-icon">${ic(s.flagged ? 'warning' : perfect || s.record || s.ghostWon ? 'trophy' : mode.icon, 44)}</span>
          <span class="result-mode">${mode.label}</span>
          <h1>${headline}</h1>
          <div class="result-score">${fixed ? `${s.correct} / ${s.total}` : `${s.score} points`}</div>
          <p class="result-sub">${fixed ? 'en ' + fmtTime(s.durationMs) : 'meilleure série : ' + (s.bestStreak || 0)}</p>
          ${s.flagged ? '<p class="result-warn">Des réponses ont été envoyées trop vite pour être humaines : cette partie ne rapporte pas de points.</p>' : ''}
          ${r.kind === 'ghost' && s.ghost ? `<p class="result-sub">${escapeHtml(s.ghost.pseudo)} : ${fmtTime(s.ghost.durationMs)} · toi : ${fmtTime(s.durationMs)}${perfect ? '' : ' (il faut un sans-faute pour battre un fantôme)'}</p>` : ''}
          ${State.user ? `<div class="xp-gained">+${s.xpGained || 0} XP${s.capReached ? ' · plafond quotidien des mini-jeux atteint' : ''}</div>` : '<p class="result-sub">Mode invité : crée un compte pour gagner des XP et apparaître au classement.</p>'}
          ${(s.newBadges || []).length ? `<div class="badges-earned">${s.newBadges.map((id) => { const b = Data.BADGES.find((x) => x.id === id); return b ? `<span class="badge-pill">${b.icon} ${escapeHtml(b.title)}</span>` : ''; }).join('')}</div>` : ''}
          <div class="result-actions">
            ${r.kind !== 'daily' ? `<button type="button" class="btn btn-primary" data-action="retry-run">${ic('replay')} Rejouer</button>` : ''}
            ${r.module ? `<button type="button" class="btn btn-ghost" data-action="open-module" data-module="${r.module}">Retour au module</button>` : `<button type="button" class="btn btn-ghost" data-action="go" data-screen="arcade">Mini-jeux</button>`}
            <button type="button" class="btn btn-ghost" data-action="go" data-screen="leaderboard">${ic('trophy')} Classement</button>
          </div>
        </div>
      </section>`;
  }

  /* ═══════════════════════════════════════════
     ARCADE
     ═══════════════════════════════════════════ */
  function renderArcade() {
    const p = P();
    const st = p.stats || {};
    const doneToday = !!st.dailyDoneToday;
    const cards = [
      { kind: 'speedrun', title: 'Speedrun', desc: '60 secondes pour répondre au maximum de questions. Bonus tous les 5 bons d\'affilée !', best: st.speedrunBest ? 'Ton record : ' + st.speedrunBest + ' pts' : 'Pas encore de record' },
      { kind: 'survival', title: 'Survie', desc: '3 vies. Chaque erreur en coûte une. Jusqu\'où iras-tu ?', best: st.survivalBest ? 'Ton record : ' + st.survivalBest + ' pts' : 'Pas encore de record' },
      { kind: 'daily', title: 'Défi du jour', desc: doneToday ? 'Déjà fait aujourd\'hui. Reviens demain pour allonger ta série !' : '10 questions, les mêmes pour tout le monde, un seul essai par jour.', best: st.dailyStreak ? 'Série en cours : ' + st.dailyStreak + ' jour' + (st.dailyStreak > 1 ? 's' : '') : 'Commence une série !', disabled: doneToday },
    ];
    return `
      <section class="page">
        <div class="page-head"><h1>Mini-jeux</h1><p>Toutes les questions viennent des quiz des modules. Les réponses sont vérifiées par le serveur.</p></div>
        <div class="arcade-grid">
          ${cards.map((c) => `
            <button type="button" class="arcade-card ${c.kind}" ${c.disabled ? 'aria-disabled="true"' : `data-action="start-run" data-kind="${c.kind}"`}>
              <span class="arcade-icon">${ic(MODES[c.kind].icon, 34)}</span>
              <span class="arcade-title">${c.title}</span>
              <span class="arcade-desc">${c.desc}</span>
              <span class="arcade-best">${c.best}</span>
            </button>`).join('')}
        </div>
        <p class="note">Les mini-jeux rapportent au plus 150 XP par jour : les leçons et les quiz restent le meilleur moyen de grimper au classement.</p>
      </section>`;
  }

  /* ═══════════════════════════════════════════
     LEADERBOARD
     ═══════════════════════════════════════════ */
  async function loadBoard() {
    const b = State.board;
    b.loading = true;
    b.error = '';
    if (State.screen === 'leaderboard') render();
    try {
      const [season, hall, records] = await Promise.all([Api.season(), Api.hallOfFame(), Api.records()]);
      Object.assign(b, { season, hall: hall.seasons, records: records.records });
    } catch (err) {
      b.error = err.message;
    }
    b.loading = false;
    if (State.screen === 'leaderboard') render();
  }

  function seasonEnd() {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  }

  function countdownText() {
    const ms = Math.max(0, seasonEnd() - Date.now());
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${d} j ${String(h).padStart(2, '0')} h ${String(m).padStart(2, '0')} min`;
  }

  function startSeasonCountdown() {
    State.timers.push(setInterval(() => {
      const el = $id('season-countdown');
      if (el) el.textContent = countdownText();
    }, 30000));
  }

  function initials(name) {
    return escapeHtml(String(name).replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?');
  }

  function renderLeaderboard() {
    const b = State.board;
    const tabs = [['season', 'Ce mois-ci'], ['hall', 'Hall of Fame'], ['records', 'Records']];
    let body = '';
    if (b.error) body = `<div class="empty-state">${ic('warning', 28)}<p>${escapeHtml(b.error)}</p><button type="button" class="btn btn-ghost" data-action="refresh-board">Réessayer</button></div>`;
    else if (!b.season) body = '<div class="loading-inline"><span class="spinner"></span> Chargement du classement…</div>';
    else if (b.tab === 'season') body = renderSeasonTab();
    else if (b.tab === 'hall') body = renderHallTab();
    else body = renderRecordsTab();
    return `
      <section class="page">
        <div class="board-head">
          <div>
            <h1>Classement</h1>
            <p>Saison de ${b.season ? fmtMonth(b.season.season.startsAt) : '…'} · fin dans <span class="mono amber" id="season-countdown">${countdownText()}</span></p>
          </div>
          <div class="tabs" role="tablist" aria-label="Type de classement">
            ${tabs.map(([id, label]) => `<button type="button" role="tab" class="tab${b.tab === id ? ' on' : ''}" aria-selected="${b.tab === id}" data-action="board-tab" data-tab="${id}">${label}</button>`).join('')}
          </div>
        </div>
        ${body}
      </section>`;
  }

  function renderSeasonTab() {
    const s = State.board.season;
    const entries = s.entries;
    if (!entries.length) {
      return `<div class="empty-state">${ic('trophy', 34)}<h2>Personne n'a encore marqué de points ce mois-ci</h2><p>Termine une leçon ou un quiz pour prendre la première place !</p>${State.user ? '' : '<button type="button" class="btn btn-primary" data-action="auth">Créer un compte</button>'}</div>`;
    }
    const podium = [entries[1], entries[0], entries[2]];
    const places = [2, 1, 3];
    const rest = entries.slice(3);
    const me = s.me;
    const above = me && me.rank > 1 ? entries[me.rank - 2] : null;
    return `
      <div class="board-layout">
        <div class="board-main">
          <div class="podium">
            ${podium.map((e, i) => e ? `
              <div class="podium-col p${places[i]}${e.me ? ' me' : ''}">
                <span class="avatar">${initials(e.pseudo)}</span>
                <span class="podium-name">${escapeHtml(e.pseudo)}${e.me ? ' (toi)' : ''}</span>
                <span class="podium-xp">${fmtInt(e.xp)} XP</span>
                <span class="podium-bar"><span>${e.rank}</span></span>
              </div>` : `<div class="podium-col p${places[i]} empty"><span class="podium-name">Place libre</span><span class="podium-bar"><span>${places[i]}</span></span></div>`).join('')}
          </div>
          ${rest.length ? `<ol class="rank-list">${rest.map((e) => {
            const lvl = levelFor(e.totalXp);
            return `<li class="rank-row${e.me ? ' me' : ''}"><span class="rank-num">#${e.rank}</span><span class="rank-name">${escapeHtml(e.pseudo)}${e.me ? ' (toi)' : ''}</span><span class="rank-level">${lvl.icon} ${escapeHtml(lvl.title)}</span><span class="rank-xp">${fmtInt(e.xp)} XP</span></li>`;
          }).join('')}</ol>` : ''}
          <p class="note">Seuls les XP gagnés pendant la saison comptent. À égalité, le temps total passé aux quiz départage. Le 1er du mois, le podium entre au Hall of Fame.</p>
        </div>
        <aside class="board-side">
          ${State.user ? `
            <div class="side-card">
              <h2>Ta saison</h2>
              ${me ? `<div class="side-row"><span>Ton rang</span><b>#${me.rank} / ${s.players}</b></div><div class="side-row"><span>XP ce mois-ci</span><b class="amber">${fmtInt(me.xp)}</b></div>
                ${above ? `<div class="side-row"><span>Pour dépasser ${escapeHtml(above.pseudo)}</span><b>${fmtInt(above.xp - me.xp + 1)} XP</b></div>` : '<p class="side-win">Tu es en tête, tiens bon !</p>'}`
                : '<p>Tu n\'as pas encore de points ce mois-ci. Une leçon suffit pour entrer dans le classement !</p>'}
            </div>
            <div class="side-card ghost-side">
              <h2>${ic('ghost')} Duels fantômes</h2>
              <p>Dans chaque module, affronte le meilleur temps d'un ancien stagiaire au quiz. Bats-le avec un sans-faute plus rapide !</p>
              <button type="button" class="btn btn-violet" data-action="go" data-screen="modules">Choisir un module</button>
            </div>` : `
            <div class="side-card">
              <h2>Entre dans la course</h2>
              <p>Crée un compte en 10 secondes pour apparaître au classement et au Hall of Fame.</p>
              <button type="button" class="btn btn-primary" data-action="auth">Créer un compte</button>
            </div>`}
        </aside>
      </div>`;
  }

  function renderHallTab() {
    const hall = State.board.hall || [];
    if (!hall.length) {
      return `<div class="empty-state">${ic('trophy', 34)}<h2>Le Hall of Fame est encore vide</h2><p>À la fin de chaque mois, le podium de la saison y est gravé pour toujours. Le premier nom pourrait être le tien !</p></div>`;
    }
    return `
      <p class="lead">Les champions de chaque saison restent ici pour toujours : les prochains stagiaires verront ton nom.</p>
      <div class="hall-grid">
        ${hall.map((s) => `
          <div class="hall-card">
            <span class="hall-season">${fmtMonth(s.startsAt)}</span>
            <span class="hall-champ">${ic('trophy', 24)} ${escapeHtml(s.podium[0].pseudo)}</span>
            <span class="hall-xp">${fmtInt(s.podium[0].xp)} XP</span>
            ${s.podium.length > 1 ? `<span class="hall-podium">Podium : ${s.podium.slice(1).map((x) => escapeHtml(x.pseudo)).join(', ')}</span>` : ''}
          </div>`).join('')}
      </div>`;
  }

  function renderRecordsTab() {
    const recs = State.board.records || [];
    const fmt = (r, v) => (v == null ? '—' : r.unit === 'ms' ? fmtTime(v) : r.unit === 'jours' ? v + ' j' : fmtInt(v));
    const main = recs.filter((r) => !r.mode.startsWith('quiz:'));
    const quiz = recs.filter((r) => r.mode.startsWith('quiz:'));
    const card = (r) => `
      <div class="record-card">
        <span class="record-mode">${r.icon ? escapeHtml(r.icon) + ' ' : ''}${escapeHtml(r.label)}</span>
        <span class="record-value">${fmt(r, r.value)}</span>
        <span class="record-holder">${r.holder ? 'par <b>' + escapeHtml(r.holder) + '</b>' + (r.at ? ' · ' + fmtMonth(r.at) : '') : 'Record libre : à toi de le prendre !'}</span>
        ${State.user ? `<span class="record-mine">Ton meilleur : ${fmt(r, r.mine)}</span>` : ''}
      </div>`;
    return `
      <div class="records-grid">${main.map(card).join('')}</div>
      <h2 class="section-title">Quiz parfaits les plus rapides</h2>
      <div class="records-grid small">${quiz.map(card).join('')}</div>`;
  }

  /* ═══════════════════════════════════════════
     PROFILE AND TROPHIES
     ═══════════════════════════════════════════ */
  function renderProfile() {
    const p = P();
    const lvl = levelFor(p.xp);
    const st = p.stats || {};
    const lessonsTotal = Data.MODULES.reduce((s, m) => s + m.lessons.length, 0);
    const perfect = Object.values(p.quizBest).filter((q) => q.score >= q.total).length;
    return `
      <section class="page narrow">
        <div class="profile-card">
          <span class="profile-level-icon">${lvl.icon}</span>
          <h1>${State.user ? escapeHtml(State.user.pseudo) : 'Invité'}</h1>
          <p>${escapeHtml(lvl.title)} · niveau ${lvl.index + 1} · ${fmtInt(p.xp)} XP</p>
          <div class="profile-bar"><span style="width:${lvl.pct}%"></span></div>
          <p class="note">${lvl.next ? `Encore ${fmtInt(lvl.next.min - p.xp)} XP pour devenir ${lvl.next.icon} ${escapeHtml(lvl.next.title)}` : 'Niveau maximum atteint !'}</p>
          ${State.user ? `
            <div class="profile-actions">
              <button type="button" class="btn btn-ghost" data-action="change-pin">${ic('key')} Changer mon code PIN</button>
              <button type="button" class="btn btn-ghost" data-action="logout">${ic('logout')} Déconnexion</button>
            </div>` : `<button type="button" class="btn btn-primary" data-action="auth">Créer un compte pour sauvegarder</button>`}
        </div>
        <div class="stats-grid">
          <div class="stat-card"><b>${p.lessons.size}/${lessonsTotal}</b><span>Leçons</span></div>
          <div class="stat-card"><b>${p.completed.size}/${Data.MODULES.length}</b><span>Modules terminés</span></div>
          <div class="stat-card"><b>${perfect}</b><span>Quiz sans faute</span></div>
          <div class="stat-card"><b>${fmtInt(p.seasonXp)}</b><span>XP ce mois-ci</span></div>
          <div class="stat-card"><b>${st.maxStreak || 0}</b><span>Meilleure série</span></div>
          <div class="stat-card"><b>${st.speedrunBest || 0}</b><span>Record Speedrun</span></div>
          <div class="stat-card"><b>${st.survivalBest || 0}</b><span>Record Survie</span></div>
          <div class="stat-card"><b>${st.dailyCount || 0}</b><span>Défis du jour</span></div>
        </div>
        <div class="profile-badges-head">
          <h2>Badges (${p.badges.length}/${Data.BADGES.length})</h2>
          <button type="button" class="btn btn-ghost" data-action="go" data-screen="trophies">Voir tous les badges</button>
        </div>
        <div class="badge-row">${p.badges.length ? p.badges.map((id) => { const b = Data.BADGES.find((x) => x.id === id); return b ? `<span class="badge-pill" title="${escapeHtml(b.desc)}">${b.icon} ${escapeHtml(b.title)}</span>` : ''; }).join('') : '<span class="note">Aucun badge pour l\'instant : termine ta première leçon !</span>'}</div>
      </section>`;
  }

  function renderTrophies() {
    const p = P();
    const groups = { progress: 'Progression', quiz: 'Quiz', streak: 'Séries', xp: 'Expérience', tiers: 'Niveaux', modules: 'Modules', arcade: 'Mini-jeux', special: 'Spécial' };
    const earned = new Set(p.badges);
    return `
      <section class="page">
        <button type="button" class="btn-back" data-action="go" data-screen="profile">${ic('prev')} Profil</button>
        <div class="page-head"><h1>Badges</h1><p>${earned.size} / ${Data.BADGES.length} débloqués${p.guest ? ' · connecte-toi pour en gagner' : ''}</p></div>
        ${Object.entries(groups).map(([g, title]) => {
          const list = Data.BADGES.filter((b) => b.group === g);
          if (!list.length) return '';
          return `<div class="trophy-group"><h2>${title} <span class="note">${list.filter((b) => earned.has(b.id)).length}/${list.length}</span></h2>
            <div class="trophy-grid">${list.map((b) => `<div class="trophy${earned.has(b.id) ? ' earned' : ''}"><span class="trophy-icon">${earned.has(b.id) ? b.icon : ic('lock', 22)}</span><span class="trophy-title">${escapeHtml(b.title)}</span><span class="trophy-desc">${escapeHtml(b.desc)}</span></div>`).join('')}</div></div>`;
        }).join('')}
      </section>`;
  }

  /* ═══════════════════════════════════════════
     AUTH (pseudo + PIN) AND PIN CHANGE
     ═══════════════════════════════════════════ */
  function pinPad(pin, error, prefix) {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'];
    return `
      <div class="pin-dots${error ? ' shake' : ''}" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<span class="pin-dot${i < pin.length ? ' on' : ''}${error ? ' err' : ''}"></span>`).join('')}</div>
      <span class="sr-only" aria-live="polite">${pin.length} chiffre${pin.length > 1 ? 's' : ''} saisi${pin.length > 1 ? 's' : ''} sur 4</span>
      <div class="pin-pad">${keys.map((k) => {
        if (k === 'clear') return `<button type="button" class="pin-key small" data-action="${prefix}-clear" aria-label="Tout effacer">C</button>`;
        if (k === 'back') return `<button type="button" class="pin-key small" data-action="${prefix}-back" aria-label="Effacer le dernier chiffre">${ic('prev')}</button>`;
        return `<button type="button" class="pin-key" data-action="${prefix}-digit" data-digit="${k}">${k}</button>`;
      }).join('')}</div>`;
  }

  function renderAuth() {
    const a = State.auth;
    const isLogin = a.mode === 'login';
    const locked = a.lockedUntil > Date.now();
    const ready = a.pin.length === 4 && a.pseudo.trim().length >= 3 && !a.loading && !locked;
    return `
      <section class="auth-view">
        <div class="auth-side">
          <div class="auth-orbit" aria-hidden="true"><span></span><span></span></div>
          <button type="button" class="btn-back light" data-action="home">${ic('prev')} Accueil</button>
          <div>
            <p class="home-kicker">IT Discovery</p>
            <h1>Ton nom au<br>Hall of Fame</h1>
            <p>Crée ton compte en 10 secondes : ta progression te suit sur n'importe quel ordinateur.</p>
          </div>
          <ul class="auth-points"><li>Pas d'e-mail, pas de mot de passe compliqué</li><li>Ton code PIN est chiffré sur le serveur</li><li>PIN oublié ? Ton tuteur peut le réinitialiser</li></ul>
        </div>
        <div class="auth-card">
          <div class="tabs full" role="tablist" aria-label="Connexion ou inscription">
            <button type="button" role="tab" class="tab${isLogin ? ' on' : ''}" aria-selected="${isLogin}" data-action="auth-mode" data-mode="login">Connexion</button>
            <button type="button" role="tab" class="tab${!isLogin ? ' on' : ''}" aria-selected="${!isLogin}" data-action="auth-mode" data-mode="register">Créer un compte</button>
          </div>
          <label class="field-label" for="auth-pseudo">Pseudo</label>
          <input id="auth-pseudo" class="auth-input" maxlength="16" autocomplete="username" spellcheck="false" value="${escapeHtml(a.pseudo)}" placeholder="Ex. Neo42" ${a.pseudo ? '' : 'data-autofocus'}>
          <span class="field-hint">3 à 16 caractères : lettres, chiffres, _ ou -. Les majuscules ne comptent pas.</span>
          <span class="field-label">Code PIN (4 chiffres)${isLogin ? '' : ' · choisis-en un facile à retenir'}</span>
          ${pinPad(a.pin, a.triesLeft != null && a.pin.length === 0, 'pin')}
          ${a.error ? `<div class="auth-error" role="alert">${escapeHtml(a.error)}${locked ? ' <span class="mono" id="lock-left"></span>' : ''}</div>` : ''}
          <button type="button" class="btn btn-primary btn-block" data-action="auth-submit" ${ready ? '' : 'disabled'}>
            ${a.loading ? '<span class="spinner"></span> Vérification…' : isLogin ? 'Se connecter' : 'Créer mon compte'}
          </button>
          <button type="button" class="link-btn center" data-action="go" data-screen="modules">Continuer en invité</button>
        </div>
      </section>`;
  }

  function renderPinChange() {
    const c = State.pinChange;
    const forced = !!(State.user && State.user.mustChangePin);
    const askCurrent = !forced && c.step !== 'new';
    return `
      <section class="auth-view single">
        <div class="auth-card">
          <h1>${forced ? 'Choisis ton nouveau code PIN' : 'Changer mon code PIN'}</h1>
          <p class="field-hint">${forced ? 'Ton tuteur t\'a donné un code provisoire. Choisis maintenant un code à 4 chiffres que toi seul connais.' : askCurrent ? 'Tape d\'abord ton code actuel.' : 'Tape maintenant ton nouveau code.'}</p>
          ${pinPad(c.pin, !!c.error, 'newpin')}
          ${c.error ? `<div class="auth-error" role="alert">${escapeHtml(c.error)}</div>` : ''}
          <button type="button" class="btn btn-primary btn-block" data-action="newpin-submit" ${c.pin.length === 4 && !c.loading ? '' : 'disabled'}>
            ${c.loading ? '<span class="spinner"></span>' : askCurrent ? 'Continuer' : 'Enregistrer'}
          </button>
          ${forced ? '' : '<button type="button" class="link-btn center" data-action="go" data-screen="profile">Annuler</button>'}
        </div>
      </section>`;
  }

  const lockUntil = (err) => Date.now() + ((err.extra && err.extra.retryAfter) || 300) * 1000;

  async function submitAuth() {
    const a = State.auth;
    if (a.loading || a.pin.length !== 4 || a.pseudo.trim().length < 3 || a.lockedUntil > Date.now()) return;
    a.loading = true;
    a.error = '';
    render();
    try {
      const isNew = a.mode === 'register';
      const res = isNew ? await Api.register(a.pseudo.trim(), a.pin) : await Api.login(a.pseudo.trim(), a.pin);
      State.auth = { mode: 'login', pseudo: '', pin: '', error: '', triesLeft: null, lockedUntil: 0, loading: false };
      await afterLogin(res, isNew);
      return;
    } catch (err) {
      a.pin = '';
      a.triesLeft = err.extra && err.extra.triesLeft != null ? err.extra.triesLeft : null;
      if (err.code === 'locked') {
        a.lockedUntil = lockUntil(err);
        a.error = 'Trop d\'essais ratés. Réessaie dans';
      } else if (err.code === 'bad_pin') {
        a.error = `Code PIN incorrect. Encore ${a.triesLeft} essai${a.triesLeft > 1 ? 's' : ''} avant une pause de 5 minutes. PIN oublié ? Demande à ton tuteur.`;
      } else {
        a.error = err.message;
      }
    }
    a.loading = false;
    render();
  }

  function startLockTimer() {
    const target = State.screen === 'auth' ? State.auth : State.admin;
    if (target.lockedUntil <= Date.now()) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((target.lockedUntil - Date.now()) / 1000));
      const el = $id('lock-left');
      if (el) el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      if (left <= 0) {
        target.lockedUntil = 0;
        target.error = '';
        render();
      }
    };
    tick();
    State.timers.push(setInterval(tick, 1000));
  }

  async function submitPinChange() {
    const c = State.pinChange;
    const forced = !!(State.user && State.user.mustChangePin);
    if (c.pin.length !== 4 || c.loading) return;
    if (!forced && c.step !== 'new') {
      c.current = c.pin;
      c.pin = '';
      c.step = 'new';
      c.error = '';
      render();
      return;
    }
    c.loading = true;
    render();
    try {
      const res = await Api.changePin(forced ? '' : c.current, c.pin);
      State.user = res.player;
      State.pinChange = { pin: '', error: '', loading: false, step: 'current', current: '' };
      toast('success', 'Nouveau code PIN enregistré. Retiens-le bien !');
      navigate(forced ? 'modules' : 'profile');
      return;
    } catch (err) {
      c.error = err.message;
      c.pin = '';
      if (err.code === 'bad_pin') { c.step = 'current'; c.current = ''; }
    }
    c.loading = false;
    render();
  }

  /* ═══════════════════════════════════════════
     TUTOR AREA
     ═══════════════════════════════════════════ */
  async function loadTutor() {
    const a = State.admin;
    if (!Api.hasAdmin()) return;
    a.loading = true;
    try {
      a.overview = await Api.admin.overview();
      a.error = '';
    } catch (err) {
      if (err.code === 'admin_required' || err.code === 'admin_disabled') Api.setAdmin(null);
      a.overview = null;
      a.error = err.message;
    }
    a.loading = false;
    if (State.screen === 'tutor') render();
  }

  function renderTutor() {
    const a = State.admin;
    if (!Api.hasAdmin()) {
      const locked = a.lockedUntil > Date.now();
      return `
        <section class="page narrow">
          <div class="auth-card tutor-login">
            <span class="kicker amber">Espace tuteur</span>
            <h1>Code tuteur</h1>
            <p class="field-hint">Saisis le code défini dans la variable ADMIN_CODE du container.</p>
            <label class="field-label" for="admin-code">Code</label>
            <input id="admin-code" type="password" class="auth-input" autocomplete="current-password" value="${escapeHtml(a.code)}" data-autofocus>
            ${a.error ? `<div class="auth-error" role="alert">${escapeHtml(a.error)}${locked ? ' <span class="mono" id="lock-left"></span>' : ''}</div>` : ''}
            <button type="button" class="btn btn-primary btn-block" data-action="admin-login" ${a.loading || locked ? 'disabled' : ''}>${a.loading ? '<span class="spinner"></span>' : 'Entrer'}</button>
          </div>
        </section>`;
    }
    const o = a.overview;
    if (!o) return `<section class="page"><div class="loading-inline"><span class="spinner"></span> Chargement…</div></section>`;
    return `
      <section class="page">
        <div class="board-head">
          <div><span class="kicker amber">Espace tuteur</span><h1>Suivi des stagiaires</h1><p>Saison en cours depuis le ${fmtDate(o.season.startsAt)}.</p></div>
          <div class="head-actions">
            <button type="button" class="btn btn-ghost" data-action="admin-export">${ic('file')} Exporter en CSV</button>
            <button type="button" class="btn btn-amber" data-action="admin-close-season">${ic('trophy')} Clôturer la saison</button>
            <button type="button" class="btn btn-ghost" data-action="admin-logout">${ic('logout')} Quitter</button>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-card"><b>${o.stats.players}</b><span>Stagiaires inscrits</span></div>
          <div class="stat-card"><b class="green">${o.stats.activeWeek}</b><span>Actifs ces 7 jours</span></div>
          <div class="stat-card"><b>${o.stats.modulesDone}</b><span>Modules terminés (total)</span></div>
          <div class="stat-card"><b class="${o.stats.flagged ? 'red' : ''}">${o.stats.flagged}</b><span>Parties suspectes</span></div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th scope="col">Pseudo</th><th scope="col">Inscrit le</th><th scope="col">Dernière visite</th><th scope="col">Progression</th><th scope="col">XP</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              ${o.players.length ? o.players.map((p) => `
                <tr>
                  <td><b>${escapeHtml(p.pseudo)}</b>${p.mustChangePin ? ' <span class="tag amber">PIN provisoire</span>' : ''}</td>
                  <td class="mono">${fmtDate(p.createdAt)}</td>
                  <td class="mono">${ago(p.lastSeenAt)}</td>
                  <td><div class="mini-progress"><span style="width:${Math.round((p.lessons / Math.max(1, p.lessonsTotal)) * 100)}%"></span></div><span class="mono small">${p.lessons}/${p.lessonsTotal} leçons · ${p.modules}/${p.modulesTotal} modules</span></td>
                  <td class="mono amber">${fmtInt(p.xp)}</td>
                  <td class="row-actions">
                    <button type="button" class="btn-sm" data-action="admin-reset" data-id="${p.id}" data-pseudo="${escapeHtml(p.pseudo)}">Réinit. PIN</button>
                    <button type="button" class="btn-sm" data-action="admin-rename" data-id="${p.id}" data-pseudo="${escapeHtml(p.pseudo)}">Renommer</button>
                    <button type="button" class="btn-sm danger" data-action="admin-delete" data-id="${p.id}" data-pseudo="${escapeHtml(p.pseudo)}">Supprimer</button>
                  </td>
                </tr>`).join('') : '<tr><td colspan="6" class="empty-cell">Aucun stagiaire inscrit pour l\'instant.</td></tr>'}
            </tbody>
          </table>
        </div>
        ${o.flagged.length ? `
          <h2 class="section-title">Parties non comptabilisées (réponses trop rapides)</h2>
          <div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">Pseudo</th><th scope="col">Mode</th><th scope="col">Score</th><th scope="col">Date</th></tr></thead>
          <tbody>${o.flagged.map((f) => `<tr><td>${escapeHtml(f.pseudo || 'invité')}</td><td>${escapeHtml((MODES[f.kind] || {}).label || f.kind)}${f.ref ? ' · ' + escapeHtml(f.ref) : ''}</td><td class="mono">${f.score}</td><td class="mono">${fmtDate(f.finished_at)}</td></tr>`).join('')}</tbody></table></div>` : ''}
        <p class="note">La réinitialisation crée un PIN provisoire de 4 chiffres, que le stagiaire devra changer à sa prochaine connexion.</p>
      </section>`;
  }

  async function adminLogin() {
    const a = State.admin;
    const input = $id('admin-code');
    a.code = input ? input.value : a.code;
    if (!a.code || a.loading || a.lockedUntil > Date.now()) return;
    a.loading = true;
    render();
    try {
      const res = await Api.admin.login(a.code);
      Api.setAdmin(res.token);
      a.code = '';
      a.error = '';
      a.loading = false;
      await loadTutor();
      return;
    } catch (err) {
      if (err.code === 'locked') { a.lockedUntil = lockUntil(err); a.error = 'Trop d\'essais ratés. Réessaie dans'; }
      else if (err.code === 'bad_code') a.error = `Code incorrect. Encore ${err.extra.triesLeft} essai${err.extra.triesLeft > 1 ? 's' : ''}.`;
      else a.error = err.message;
      a.code = '';
    }
    a.loading = false;
    render();
  }

  async function adminAction(fn, success) {
    try {
      const res = await fn();
      if (success) await success(res);
      await loadTutor();
    } catch (err) {
      if (err.code === 'admin_required') { Api.setAdmin(null); State.admin.overview = null; render(); }
      toast('error', err.message);
    }
  }

  async function adminExport() {
    try {
      const res = await Api.admin.exportCsv();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'it-discovery-stagiaires.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast('error', err.message);
    }
  }

  /* ═══════════════════════════════════════════
     EVENTS (bound once — re-rendering never stacks listeners)
     ═══════════════════════════════════════════ */
  function pinInput(digit, action) {
    const isNew = action.startsWith('newpin');
    const s = isNew ? State.pinChange : State.auth;
    if (!isNew && State.auth.lockedUntil > Date.now()) return;
    if (action.endsWith('-digit') && s.pin.length < 4) s.pin += digit;
    else if (action.endsWith('-back')) s.pin = s.pin.slice(0, -1);
    else if (action.endsWith('-clear')) s.pin = '';
    s.error = '';
    if (!isNew) s.triesLeft = null;
    const pseudo = $id('auth-pseudo');
    if (pseudo) State.auth.pseudo = pseudo.value;
    render();
    if (!isNew && s.pin.length === 4 && s.pseudo.trim().length >= 3) submitAuth();
  }

  async function handleClick(e) {
    const target = e.target.closest('[data-action]');
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
    const action = target.dataset.action;
    if (Effects && target.tagName === 'BUTTON' && !target.closest('.scene')) Effects.ripple(e);
    switch (action) {
      case 'home': navigate('home'); break;
      case 'go': {
        const screen = target.dataset.screen;
        navigate(screen);
        if (screen === 'leaderboard') loadBoard();
        if (screen === 'tutor') loadTutor();
        break;
      }
      case 'auth':
        State.auth.error = '';
        State.auth.pin = '';
        navigate('auth');
        break;
      case 'auth-mode':
        State.auth.mode = target.dataset.mode;
        State.auth.error = '';
        State.auth.pin = '';
        State.auth.triesLeft = null;
        render();
        break;
      case 'pin-digit': case 'pin-back': case 'pin-clear':
      case 'newpin-digit': case 'newpin-back': case 'newpin-clear':
        pinInput(target.dataset.digit, action);
        break;
      case 'auth-submit': submitAuth(); break;
      case 'newpin-submit': submitPinChange(); break;
      case 'change-pin':
        State.pinChange = { pin: '', error: '', loading: false, step: 'current', current: '' };
        navigate('pin-change');
        break;
      case 'logout': {
        const ok = await dialog({ title: 'Se déconnecter ?', message: 'Ta progression est sauvegardée sur le serveur. Sur cet appareil, tout sera effacé pour le prochain utilisateur.', confirmLabel: 'Déconnexion' });
        if (ok) logout();
        break;
      }
      case 'open-module':
        navigate('module', { module: target.dataset.module });
        if (State.user && State.ghosts[target.dataset.module] === undefined) loadGhost(target.dataset.module);
        break;
      case 'open-lesson': navigate('lesson', { lesson: parseInt(target.dataset.lesson, 10) }); break;
      case 'prev-lesson': navigate('lesson', { lesson: Math.max(0, State.lesson - 1) }); break;
      case 'finish-lesson': finishLesson(); break;
      case 'set-level':
        State.prefs.level = target.dataset.level;
        savePrefs();
        State.sceneCtrls.forEach((c) => c.setLevel(State.prefs.level));
        $$('.level-btn').forEach((b) => {
          const on = b.dataset.level === State.prefs.level;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on);
        });
        break;
      case 'start-run': {
        const kind = target.dataset.kind;
        startRun(kind, kind === 'quiz' || kind === 'ghost' ? State.module : null);
        break;
      }
      case 'retry-run': if (State.run) startRun(State.run.kind, State.run.module); break;
      case 'run-answer': runAnswer(parseInt(target.dataset.index, 10)); break;
      case 'run-next': runNext(); break;
      case 'quit-run': {
        const ok = await dialog({ title: 'Quitter la partie ?', message: 'La partie s\'arrête ici et ton score actuel est enregistré.', confirmLabel: 'Quitter' });
        if (ok) finishRun();
        break;
      }
      case 'board-tab': State.board.tab = target.dataset.tab; render(); break;
      case 'refresh-board': loadBoard(); break;
      case 'admin-login': adminLogin(); break;
      case 'admin-logout': await Api.admin.logout(); Api.setAdmin(null); State.admin.overview = null; render(); break;
      case 'admin-export': adminExport(); break;
      case 'admin-close-season': {
        const ok = await dialog({ title: 'Clôturer la saison maintenant ?', message: 'Le podium actuel entre au Hall of Fame et une nouvelle saison démarre tout de suite. Les saisons se clôturent aussi toutes seules au début de chaque mois.', confirmLabel: 'Clôturer' });
        if (ok) adminAction(() => Api.admin.closeSeason(), () => toast('success', 'Saison clôturée : le podium est au Hall of Fame.'));
        break;
      }
      case 'admin-reset': {
        const ok = await dialog({ title: `Réinitialiser le PIN de ${target.dataset.pseudo} ?`, message: 'Un PIN provisoire va être généré. Le stagiaire devra en choisir un nouveau à sa prochaine connexion.', confirmLabel: 'Réinitialiser' });
        if (ok) adminAction(() => Api.admin.resetPin(target.dataset.id), (res) => dialog({ title: 'PIN provisoire', html: `<p>Donne ce code à <b>${escapeHtml(res.pseudo)}</b> :</p><p class="big-pin mono">${escapeHtml(res.pin)}</p><p class="note">Il ne sera plus affiché ensuite.</p>`, confirmLabel: 'C\'est noté', cancel: false }));
        break;
      }
      case 'admin-rename': {
        const pseudo = await dialog({ title: 'Renommer le stagiaire', input: { label: 'Nouveau pseudo', value: target.dataset.pseudo }, confirmLabel: 'Renommer' });
        if (pseudo && pseudo.trim() !== target.dataset.pseudo) adminAction(() => Api.admin.rename(target.dataset.id, pseudo.trim()), () => toast('success', 'Pseudo modifié.'));
        break;
      }
      case 'admin-delete': {
        const ok = await dialog({ title: `Supprimer ${target.dataset.pseudo} ?`, message: 'Le compte disparaît du classement et le pseudo redevient libre. Le Hall of Fame déjà gravé ne change pas.', confirmLabel: 'Supprimer', danger: true });
        if (ok) adminAction(() => Api.admin.remove(target.dataset.id), () => toast('success', 'Compte supprimé.'));
        break;
      }

      /* ─── Interactive lesson blocks ─── */
      case 'reveal': target.classList.toggle('revealed'); break;
      case 'flashcard-flip': target.classList.toggle('flipped'); break;
      case 'diagram-click': target.classList.toggle('active'); break;
      case 'drag-sort-select': {
        const list = target.closest('.drag-sort-list');
        const selected = list.querySelector('.drag-sort-item.selected');
        list.querySelectorAll('.drag-sort-item').forEach((el) => el.classList.remove('correct', 'wrong'));
        if (selected && selected !== target) {
          const a = selected.querySelector('.drag-sort-text');
          const b = target.querySelector('.drag-sort-text');
          [a.textContent, b.textContent] = [b.textContent, a.textContent];
          [selected.dataset.sortIdx, target.dataset.sortIdx] = [target.dataset.sortIdx, selected.dataset.sortIdx];
          selected.classList.remove('selected');
        } else {
          list.querySelectorAll('.drag-sort-item').forEach((el) => el.classList.remove('selected'));
          if (selected !== target) target.classList.add('selected');
        }
        break;
      }
      case 'drag-sort-check': {
        const block = target.closest('.content-drag-sort');
        const items = block.querySelectorAll('.drag-sort-item');
        let good = 0;
        items.forEach((item, i) => {
          const ok = parseInt(item.dataset.sortIdx, 10) === i;
          if (ok) good++;
          item.classList.remove('correct', 'wrong', 'selected');
          item.classList.add(ok ? 'correct' : 'wrong');
        });
        block.querySelector('.interactive-feedback').textContent = good === items.length ? 'Parfait, tout est dans le bon ordre !' : `${good} / ${items.length} bien placés : échange les éléments en rouge.`;
        break;
      }
      case 'drag-match-term': {
        const container = target.closest('.drag-match-container');
        container.querySelectorAll('.drag-match-term').forEach((el) => el.classList.remove('selected'));
        target.classList.add('selected');
        break;
      }
      case 'drag-match-def': {
        const container = target.closest('.drag-match-container');
        const term = container.querySelector('.drag-match-term.selected');
        if (!term) break;
        // Compare texts: two terms may share the same definition (e.g. « Entrée »).
        if (term.dataset.def === target.dataset.def) {
          term.classList.remove('selected');
          term.classList.add('matched');
          target.classList.add('matched');
          term.disabled = true;
          target.disabled = true;
        } else {
          target.classList.add('wrong');
          setTimeout(() => target.classList.remove('wrong'), 600);
          term.classList.remove('selected');
        }
        break;
      }
      case 'tf-answer': {
        const stmt = target.closest('.tf-statement');
        if (stmt.classList.contains('answered')) break;
        stmt.classList.add('answered');
        const ok = (stmt.dataset.tfAnswer === 'true') === (target.dataset.tfVal === 'true');
        stmt.classList.add(ok ? 'correct' : 'wrong');
        stmt.querySelectorAll('.tf-btn').forEach((b) => { b.disabled = true; });
        const fb = stmt.querySelector('.tf-feedback');
        fb.textContent = (ok ? 'Exact ! ' : 'Raté. ') + stmt.dataset.tfExplanation;
        fb.style.display = 'block';
        break;
      }
      default: break;
    }
  }

  function handleKeydown(e) {
    if (document.querySelector('.dialog-overlay')) return;
    if (e.target.classList && e.target.classList.contains('mini-terminal-input')) {
      if (e.key === 'Enter') runTerminal(e.target);
      return;
    }
    if (e.target.id === 'admin-code') { if (e.key === 'Enter') adminLogin(); return; }
    const screen = State.screen;
    if (screen !== 'auth' && screen !== 'pin-change') return;
    if (e.target.tagName === 'INPUT') {
      if (e.key === 'Enter' && screen === 'auth') { e.preventDefault(); submitAuth(); }
      return;
    }
    const prefix = screen === 'auth' ? 'pin' : 'newpin';
    if (/^\d$/.test(e.key)) pinInput(e.key, prefix + '-digit');
    else if (e.key === 'Backspace') { e.preventDefault(); pinInput('', prefix + '-back'); }
    else if (e.key === 'Enter') { if (screen === 'auth') submitAuth(); else submitPinChange(); }
  }

  function handleInput(e) {
    if (e.target.id === 'auth-pseudo') {
      State.auth.pseudo = e.target.value;
      const a = State.auth;
      const btn = $('[data-action="auth-submit"]');
      if (btn) btn.disabled = !(a.pin.length === 4 && a.pseudo.trim().length >= 3 && !a.loading && a.lockedUntil <= Date.now());
    }
    if (e.target.id === 'admin-code') State.admin.code = e.target.value;
  }

  function runTerminal(input) {
    const { lesson } = currentLesson();
    const block = lesson && lesson.content[parseInt(input.dataset.block, 10)];
    const val = input.value.trim();
    if (!block || !val) return;
    input.value = '';
    const out = input.closest('.mini-terminal').querySelector('.mini-terminal-output');
    const add = (cls, text) => {
      const line = document.createElement('div');
      line.className = 'mini-terminal-line ' + cls;
      line.textContent = text;
      out.appendChild(line);
    };
    add('prompt', '$ ' + val);
    const cmds = block.commands || {};
    const lower = val.toLowerCase();
    let key = Object.keys(cmds).find((c) => c.toLowerCase() === lower);
    if (!key) key = Object.keys(cmds).find((c) => lower.split(' ')[0] === c.toLowerCase().split(' ')[0]);
    add('output', key ? cmds[key] : 'Commande inconnue. Tape « help » pour voir les commandes disponibles.');
    out.scrollTop = out.scrollHeight;
  }

  /* ═══════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', async () => {
    const app = $id('app');
    app.addEventListener('click', handleClick);
    app.addEventListener('input', handleInput);
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('online', async () => {
      if (!State.user) return;
      State.offline = false;
      const res = await Api.flushQueue().catch(() => null);
      if (res) applyProgress(res.progress, res.newBadges);
      render();
    });
    if (Effects) Effects.initParticles();
    render();
    await restoreSession();
    State.screen = State.user && State.user.mustChangePin ? 'pin-change' : 'home';
    render();
  });
})();
