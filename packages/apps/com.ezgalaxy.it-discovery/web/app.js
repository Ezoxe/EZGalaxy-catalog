/**
 * IT Discovery — Main Application
 * Routing, rendering, gamification, state management
 */
(() => {
  'use strict';

  /* ───────── Helpers ───────── */
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);
  const $id = id => document.getElementById(id);

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /* ───────── Constants ───────── */
  const STORAGE_KEY = 'it-discovery-progress';
  const USER_KEY    = 'it-discovery-user';
  const EXT_ID      = 'com.ezgalaxy.it-discovery';
  const EXPIRY_MS   = 48 * 3600 * 1000; // 48 h in ms

  const XP_LESSON   = 10;
  const XP_CORRECT  = 5;
  const XP_PERFECT  = 20;
  const XP_STREAK   = 3;

  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  /* ───────── State ───────── */
  const State = {
    screen: 'home',
    currentModule: null,
    currentLesson: 0,
    currentQuiz: 0,
    quizAnswers: [],
    quizAnswered: false,
    xp: 0,
    completedLessons: {},
    completedQuizzes: {},
    badges: [],
    streak: 0,
    maxStreak: 0,
    totalCorrect: 0,
    totalAnswered: 0,
    newBadges: [],
    // Auth
    user: null,
    authMode: 'login',
    authPin: '',
    authPseudo: '',
    authError: '',
    authLoading: false,
    // API
    apiAvailable: false,
    apiBase: '',
    apiToken: '',
    // Scoreboard
    scoreboard: [],
    scoreboardLoading: false,
    // Session
    sessionStart: Date.now()
  };

  /* ───────── Data references ───────── */
  const Data    = window.ITData;
  const Effects = window.ITEffects;

  /* ═══════════════════════════════════════════
     COMMUNITY DATA API
     ═══════════════════════════════════════════ */
  function initAPI() {
    try {
      State.apiBase  = localStorage.getItem('ez.community.baseUrl') || '';
      State.apiToken = localStorage.getItem('ez.community.token') || '';
      State.apiAvailable = !!(State.apiBase && State.apiToken);
    } catch (e) { State.apiAvailable = false; }
  }

  async function apiGet(collection, key) {
    if (!State.apiAvailable) return null;
    try {
      const url = key
        ? State.apiBase + '/api/community/' + EXT_ID + '/' + collection + '/' + encodeURIComponent(key)
        : State.apiBase + '/api/community/' + EXT_ID + '/' + collection + '?limit=200';
      const res = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + State.apiToken }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  }

  async function apiPut(collection, key, data) {
    if (!State.apiAvailable) return null;
    try {
      const res = await fetch(
        State.apiBase + '/api/community/' + EXT_ID + '/' + collection + '/' + encodeURIComponent(key),
        {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + State.apiToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: data })
        }
      );
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  }

  /* ═══════════════════════════════════════════
     PERSISTENCE (localStorage + timestamp 48 h)
     ═══════════════════════════════════════════ */
  function buildSaveData() {
    return {
      savedAt: Date.now(),
      xp: State.xp,
      completedLessons: State.completedLessons,
      completedQuizzes: State.completedQuizzes,
      badges: State.badges,
      streak: State.streak,
      maxStreak: State.maxStreak,
      totalCorrect: State.totalCorrect,
      totalAnswered: State.totalAnswered
    };
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildSaveData()));
    } catch (e) { /* quota exceeded or private mode */ }
    if (State.user && State.apiAvailable) syncToAPI();
  }

  function syncToAPI() {
    if (!State.user || !State.apiAvailable) return;
    var data = { pseudo: State.user.pseudo, pin: State.user.pin };
    var sd = buildSaveData();
    for (var k in sd) data[k] = sd[k];
    apiPut('users', State.user.pseudo, data).catch(function(){});
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const save = JSON.parse(raw);
      if (!save) return;
      // Expiry 48 h based on savedAt timestamp
      if (save.savedAt && (Date.now() - save.savedAt > EXPIRY_MS)) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      State.xp              = save.xp || 0;
      State.completedLessons = save.completedLessons || {};
      State.completedQuizzes = save.completedQuizzes || {};
      State.badges           = save.badges || [];
      State.streak           = save.streak || 0;
      State.maxStreak        = save.maxStreak || 0;
      State.totalCorrect     = save.totalCorrect || 0;
      State.totalAnswered    = save.totalAnswered || 0;
    } catch (e) { /* corrupted data */ }
  }

  function loadUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) State.user = JSON.parse(raw);
    } catch (e) { /* ignore */ }
  }

  function saveUser() {
    try {
      if (State.user) localStorage.setItem(USER_KEY, JSON.stringify(State.user));
      else localStorage.removeItem(USER_KEY);
    } catch (e) { /* ignore */ }
  }

  function resetProgress() {
    State.xp = 0;
    State.completedLessons = {};
    State.completedQuizzes = {};
    State.badges = [];
    State.streak = 0;
    State.maxStreak = 0;
    State.totalCorrect = 0;
    State.totalAnswered = 0;
    localStorage.removeItem(STORAGE_KEY);
    if (State.user && State.apiAvailable) syncToAPI();
  }

  /* ═══════════════════════════════════════════
     AUTH HELPERS
     ═══════════════════════════════════════════ */
  async function doRegister(pseudo, pin) {
    const existing = await apiGet('users', pseudo);
    if (existing && existing.data) return { ok: false, error: 'Ce pseudo est déjà pris !' };
    var data = { pseudo: pseudo, pin: pin };
    var sd = buildSaveData();
    for (var k in sd) data[k] = sd[k];
    const result = await apiPut('users', pseudo, data);
    if (!result) return { ok: false, error: 'Erreur serveur. Réessaie plus tard.' };
    State.user = { pseudo: pseudo, pin: pin };
    saveUser();
    return { ok: true };
  }

  async function doLogin(pseudo, pin) {
    const existing = await apiGet('users', pseudo);
    if (!existing || !existing.data) return { ok: false, error: 'Pseudo introuvable.' };
    if (String(existing.data.pin) !== String(pin)) return { ok: false, error: 'Code PIN incorrect.' };
    State.user = { pseudo: pseudo, pin: pin };
    saveUser();
    // Merge : keep highest XP
    if ((existing.data.xp || 0) > State.xp) {
      State.xp              = existing.data.xp || 0;
      State.completedLessons = existing.data.completedLessons || {};
      State.completedQuizzes = existing.data.completedQuizzes || {};
      State.badges           = existing.data.badges || [];
      State.streak           = existing.data.streak || 0;
      State.maxStreak        = existing.data.maxStreak || 0;
      State.totalCorrect     = existing.data.totalCorrect || 0;
      State.totalAnswered    = existing.data.totalAnswered || 0;
      saveProgress();
    } else {
      syncToAPI();
    }
    return { ok: true };
  }

  async function loadScoreboard() {
    State.scoreboardLoading = true;
    render();
    const data = await apiGet('users');
    if (data && data.items) {
      State.scoreboard = data.items
        .filter(function(item) { return item.data && item.data.pseudo; })
        .map(function(item) {
          return {
            pseudo: item.data.pseudo || item.record_key,
            xp: item.data.xp || 0,
            badges: (item.data.badges || []).length,
            completedLessons: Object.keys(item.data.completedLessons || {}).length,
            completedQuizzes: Object.keys(item.data.completedQuizzes || {}).length
          };
        })
        .sort(function(a, b) { return b.xp - a.xp; });
    } else {
      State.scoreboard = [];
    }
    State.scoreboardLoading = false;
    render();
  }

  function doLogout() {
    State.user = null;
    localStorage.removeItem(USER_KEY);
    toast('info', 'Déconnecté');
  }

  async function handleAuthSubmit() {
    State.authLoading = true;
    State.authError = '';
    render();
    var result;
    if (State.authMode === 'login') {
      result = await doLogin(State.authPseudo, State.authPin);
    } else {
      result = await doRegister(State.authPseudo, State.authPin);
    }
    State.authLoading = false;
    if (result.ok) {
      State.authPin = '';
      State.authPseudo = '';
      State.authError = '';
      toast('success', State.authMode === 'login' ? 'Connecté !' : 'Inscription réussie !');
      if (Effects) Effects.confetti();
      navigate('modules');
    } else {
      State.authError = result.error;
      State.authPin = '';
      render();
    }
  }

  /* ═══════════════════════════════════════════
     GAMIFICATION HELPERS
     ═══════════════════════════════════════════ */
  function getLevelForXP(xp) {
    const levels = Data.LEVELS;
    let lvl = levels[0];
    for (const l of levels) {
      if (xp >= l.min) lvl = l;
      else break;
    }
    return lvl;
  }

  function getLevel() {
    return getLevelForXP(State.xp);
  }

  function getLevelIndex() {
    const levels = Data.LEVELS;
    let idx = 0;
    for (let i = 0; i < levels.length; i++) {
      if (State.xp >= levels[i].min) idx = i;
      else break;
    }
    return idx;
  }

  function getLevelProgress() {
    const levels = Data.LEVELS;
    const idx = getLevelIndex();
    const current = levels[idx].min;
    const next = idx < levels.length - 1 ? levels[idx + 1].min : current;
    if (next === current) return 100;
    return Math.min(100, ((State.xp - current) / (next - current)) * 100);
  }

  function addXP(amount) {
    const oldLevel = getLevelIndex();
    State.xp += amount;
    const newLevel = getLevelIndex();
    if (newLevel > oldLevel) {
      const lvl = getLevel();
      toast('achievement', `${lvl.icon} Niveau supérieur ! Tu es maintenant ${lvl.title}`);
      if (Effects) Effects.confetti();
    }
    saveProgress();
  }

  function awardBadge(badgeId) {
    if (State.badges.includes(badgeId)) return false;
    State.badges.push(badgeId);
    State.newBadges.push(badgeId);
    const badge = Data.BADGES.find(b => b.id === badgeId);
    if (badge) {
      toast('achievement', `${badge.icon} Badge débloqué : ${badge.title}`);
    }
    saveProgress();
    return true;
  }

  function checkBadges() {
    const completedCount = Object.keys(State.completedLessons).length;
    const totalLessons = Data.MODULES.reduce((s, m) => s + m.lessons.length, 0);
    const perfectQuizzes = Object.values(State.completedQuizzes).filter(q => q.score === q.total).length;

    if (completedCount >= 1) awardBadge('first-step');
    if (completedCount >= 5) awardBadge('curious');
    if (completedCount >= totalLessons) awardBadge('encyclopedia');
    if (perfectQuizzes >= 1) awardBadge('quiz-master');
    if (perfectQuizzes >= 3) awardBadge('flawless');
    if (State.maxStreak >= 5) awardBadge('unstoppable');

    // Module badges
    for (const mod of Data.MODULES) {
      const allLessons = mod.lessons.every((_, i) => State.completedLessons[mod.id + '-' + i]);
      const quizDone = State.completedQuizzes[mod.id];
      if (allLessons && quizDone) {
        const badgeId = Data.MODULE_BADGES[mod.id];
        if (badgeId) awardBadge(badgeId);
      }
    }
  }

  function getModuleProgress(mod) {
    let done = 0;
    const total = mod.lessons.length + 1; // lessons + quiz
    for (let i = 0; i < mod.lessons.length; i++) {
      if (State.completedLessons[mod.id + '-' + i]) done++;
    }
    if (State.completedQuizzes[mod.id]) done++;
    return { done, total, pct: Math.round((done / total) * 100) };
  }

  /* ═══════════════════════════════════════════
     TOAST SYSTEM
     ═══════════════════════════════════════════ */
  function toast(type, message) {
    const container = $id('toast-container');
    if (!container) return;
    const icons = { success: '✅', error: '❌', info: 'ℹ️', achievement: '🏅' };
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = `<span class="toast-icon">${icons[type] || '💬'}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('hiding');
      setTimeout(() => el.remove(), 350);
    }, 3500);
  }

  /* ═══════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════ */
  function navigate(screen, params) {
    State.screen = screen;
    if (params) {
      if (params.module !== undefined)  State.currentModule = params.module;
      if (params.lesson !== undefined)  State.currentLesson = params.lesson;
      if (params.quiz !== undefined)    State.currentQuiz = params.quiz;
    }
    const app = $id('app');
    if (Effects && app) {
      Effects.transition(app, () => render());
    } else {
      render();
    }
  }

  /* ═══════════════════════════════════════════
     RENDER DISPATCH
     ═══════════════════════════════════════════ */
  function render() {
    const app = $id('app');
    if (!app) return;

    let html = '';
    switch (State.screen) {
      case 'home':       html = renderHome(); break;
      case 'auth':       html = renderAuth(); break;
      case 'modules':    html = renderHeader() + renderModules(); break;
      case 'module':     html = renderHeader() + renderModuleDetail(); break;
      case 'lesson':     html = renderHeader() + renderLesson(); break;
      case 'quiz':       html = renderHeader() + renderQuiz(); break;
      case 'quiz-result': html = renderHeader() + renderQuizResult(); break;
      case 'profile':    html = renderHeader() + renderProfile(); break;
      case 'scoreboard': html = renderHeader() + renderScoreboard(); break;
      default:           html = renderHome();
    }

    app.innerHTML = html;
    bindEvents();

    // Post-render effects
    if (State.screen === 'modules') {
      setTimeout(() => { if (Effects) Effects.staggerIn('.module-card', 100); }, 50);
    }
    if (State.screen === 'home') {
      const titleEl = $('.home-title');
      if (titleEl && Effects) {
        Effects.typewriter(titleEl, 'IT Discovery', 60);
      }
    }
    if (State.screen === 'scoreboard') {
      setTimeout(() => { if (Effects) Effects.staggerIn('.scoreboard-row', 60); }, 50);
    }
    if (State.screen === 'auth') {
      const pseudoInput = $id('auth-pseudo');
      if (pseudoInput) {
        pseudoInput.addEventListener('input', function(e) {
          State.authPseudo = e.target.value.trim();
          updateSubmitButton();
        });
        pseudoInput.focus();
      }
    }
  }

  /* ═══════════════════════════════════════════
     RENDER: HEADER
     ═══════════════════════════════════════════ */
  function renderHeader() {
    const level = getLevel();
    const lvlProg = getLevelProgress();
    const userBadge = State.user
      ? '<span class="header-user" data-action="profile" title="Profil">👤 ' + escapeHtml(State.user.pseudo) + '</span>'
      : '<span class="header-user header-login" data-action="auth" title="Connexion">🔐</span>';
    const scoreboardBtn = '<span class="header-scoreboard" data-action="scoreboard" title="Classement">🏆</span>';
    return '\
      <div class="header">\
        <div class="header-left">\
          <span class="header-logo" data-action="home" title="Accueil">💡</span>\
          <span class="header-title" data-action="modules">IT Discovery</span>\
        </div>\
        <div class="header-right">\
          ' + scoreboardBtn + '\
          <div class="header-xp" data-action="profile" title="Voir le profil">\
            <span class="header-xp-icon">⚡</span>\
            <span class="header-xp-text" id="header-xp-value">' + State.xp + ' XP</span>\
            <div class="header-xp-bar">\
              <div class="header-xp-fill" style="width:' + lvlProg + '%"></div>\
            </div>\
          </div>\
          <div class="header-level" data-action="profile" title="Voir le profil">\
            <span class="header-level-icon">' + level.icon + '</span>\
            <span class="header-level-text">' + level.title + '</span>\
          </div>\
          ' + userBadge + '\
        </div>\
      </div>';
  }

  /* ═══════════════════════════════════════════
     RENDER: HOME
     ═══════════════════════════════════════════ */
  function renderHome() {
    const completedLessons = Object.keys(State.completedLessons).length;
    const totalLessons = Data.MODULES.reduce((s, m) => s + m.lessons.length, 0);
    const completedQuizzes = Object.keys(State.completedQuizzes).length;
    const level = getLevel();

    return `
      <div class="home">
        <div class="home-hero-icon">💡</div>
        <h1 class="home-title">IT Discovery</h1>
        <p class="home-subtitle">
          Explore le monde fascinant de l'informatique à travers 6 modules interactifs,
          des quiz, et un système de progression !
        </p>
        <button class="home-start-btn" data-action="modules">
          🚀 Commencer l'aventure
        </button>
        <div class="home-secondary-actions">
          <button class="home-btn-secondary" data-action="scoreboard">🏆 Classement</button>
          ${State.user
            ? '<button class="home-btn-secondary" data-action="profile">👤 ' + escapeHtml(State.user.pseudo) + '</button>'
            : '<button class="home-btn-secondary" data-action="auth">🔐 Connexion / Inscription</button>'}
        </div>
        ${State.xp > 0 ? `
          <div class="home-stats">
            <div class="home-stat">
              <div class="home-stat-value">${level.icon}</div>
              <div class="home-stat-label">${level.title}</div>
            </div>
            <div class="home-stat">
              <div class="home-stat-value">${State.xp}</div>
              <div class="home-stat-label">Points XP</div>
            </div>
            <div class="home-stat">
              <div class="home-stat-value">${completedLessons}/${totalLessons}</div>
              <div class="home-stat-label">Leçons</div>
            </div>
            <div class="home-stat">
              <div class="home-stat-value">${completedQuizzes}/${Data.MODULES.length}</div>
              <div class="home-stat-label">Quiz</div>
            </div>
            <div class="home-stat">
              <div class="home-stat-value">${State.badges.length}</div>
              <div class="home-stat-label">Badges</div>
            </div>
          </div>
        ` : ''}
      </div>`;
  }

  /* ═══════════════════════════════════════════
     RENDER: MODULES GRID
     ═══════════════════════════════════════════ */
  function renderModules() {
    const cards = Data.MODULES.map(mod => {
      const prog = getModuleProgress(mod);
      const completedClass = prog.pct === 100 ? ' completed' : '';
      return `
        <div class="module-card${completedClass}" data-action="open-module" data-module="${mod.id}"
             style="--module-color: ${mod.color}">
          <span class="module-card-icon">${mod.icon}</span>
          <h3 class="module-card-title">${escapeHtml(mod.title)}</h3>
          <p class="module-card-desc">${escapeHtml(mod.description)}</p>
          <div class="module-progress">
            <div class="module-progress-fill" style="width:${prog.pct}%; background: linear-gradient(90deg, ${mod.color}, ${mod.color}88)"></div>
          </div>
          <div class="module-progress-text">${prog.done}/${prog.total} — ${prog.pct}%</div>
        </div>`;
    }).join('');

    return `
      <div class="modules-page">
        <div class="modules-header">
          <h2>🗺️ Choisis ton module</h2>
          <p>Explore les différents domaines de l'informatique à ton rythme</p>
        </div>
        <div class="modules-grid">${cards}</div>
      </div>`;
  }

  /* ═══════════════════════════════════════════
     RENDER: MODULE DETAIL
     ═══════════════════════════════════════════ */
  function renderModuleDetail() {
    const mod = Data.MODULES.find(m => m.id === State.currentModule);
    if (!mod) return renderModules();

    const lessonsHtml = mod.lessons.map((lesson, i) => {
      const key = mod.id + '-' + i;
      const done = State.completedLessons[key];
      return `
        <div class="lesson-item${done ? ' completed' : ''}" data-action="open-lesson" data-lesson="${i}">
          <span class="lesson-item-icon">${lesson.icon}</span>
          <div class="lesson-item-info">
            <div class="lesson-item-title">${escapeHtml(lesson.title)}</div>
            <div class="lesson-item-status">${done ? '✅ Complétée' : 'Pas encore lue'}</div>
          </div>
          <span class="lesson-item-check">${done ? '✓' : '→'}</span>
        </div>`;
    }).join('');

    const hasReadAtLeastOne = mod.lessons.some((_, i) => State.completedLessons[mod.id + '-' + i]);
    const quizResult = State.completedQuizzes[mod.id];
    const quizLocked = !hasReadAtLeastOne;

    let quizScoreHtml = '';
    if (quizResult) {
      quizScoreHtml = `
        <div class="quiz-previous-score">
          Dernier score : <strong>${quizResult.score}/${quizResult.total}</strong>
          ${quizResult.score === quizResult.total ? ' 🏆 Parfait !' : ' — Tu peux réessayer !'}
        </div>`;
    }

    return `
      <div class="module-detail">
        <button class="btn-back" data-action="modules">← Retour aux modules</button>
        <div class="module-detail-header" style="--module-color: ${mod.color}">
          <span class="module-detail-icon">${mod.icon}</span>
          <h2 class="module-detail-title">${escapeHtml(mod.title)}</h2>
          <p class="module-detail-desc">${escapeHtml(mod.description)}</p>
        </div>
        <div class="lesson-list">${lessonsHtml}</div>
        <button class="quiz-start-btn ${quizLocked ? 'locked' : 'unlocked'}"
                ${quizLocked ? 'disabled' : ''}
                data-action="${quizLocked ? '' : 'start-quiz'}"
                style="--module-color: ${mod.color}">
          ${quizLocked
            ? '🔒 Lis au moins 1 leçon pour débloquer le quiz'
            : '🧠 Lancer le Quiz (' + mod.quiz.length + ' questions)'}
        </button>
        ${quizScoreHtml}
      </div>`;
  }

  /* ═══════════════════════════════════════════
     RENDER: LESSON
     ═══════════════════════════════════════════ */
  function renderLesson() {
    const mod = Data.MODULES.find(m => m.id === State.currentModule);
    if (!mod) return renderModules();
    const lesson = mod.lessons[State.currentLesson];
    if (!lesson) return renderModuleDetail();

    const blocks = lesson.content.map(block => {
      switch (block.type) {
        case 'paragraph':
          return `<div class="content-block content-paragraph">${escapeHtml(block.text)}</div>`;
        case 'analogy':
          return `<div class="content-block content-analogy">${escapeHtml(block.text)}</div>`;
        case 'highlight':
          return `<div class="content-block content-highlight">${escapeHtml(block.text)}</div>`;
        case 'fun-fact':
          return `<div class="content-block content-fun-fact">${escapeHtml(block.text)}</div>`;
        case 'list':
          return `<div class="content-block content-list">
            <div class="content-list-title">${escapeHtml(block.title)}</div>
            <ul>${block.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          </div>`;
        case 'diagram':
          return `<div class="content-block content-diagram">
            <div class="diagram-label">📐 Schéma</div>
            <pre class="diagram-pre">${escapeHtml(block.text)}</pre>
          </div>`;
        case 'steps':
          return `<div class="content-block content-steps">
            <div class="steps-title">🔄 ${escapeHtml(block.title)}</div>
            <div class="steps-flow">${block.steps.map((step, i) =>
              `<div class="step-item" style="animation-delay:${i * 0.15}s">
                <div class="step-number">${i + 1}</div>
                <div class="step-text">${escapeHtml(step)}</div>
                ${i < block.steps.length - 1 ? '<div class="step-arrow">↓</div>' : ''}
              </div>`
            ).join('')}</div>
          </div>`;
        case 'interactive-reveal':
          return `<div class="content-block content-interactive">
            <div class="interactive-title">🤔 ${escapeHtml(block.question)}</div>
            <div class="reveal-options">${block.options.map((opt, i) =>
              `<div class="reveal-option" data-action="reveal">
                <div class="reveal-question">${escapeHtml(opt.text)}</div>
                <div class="reveal-answer">${escapeHtml(opt.revealed)}</div>
              </div>`
            ).join('')}</div>
          </div>`;
        default:
          return `<div class="content-block content-paragraph">${escapeHtml(block.text || '')}</div>`;
      }
    }).join('');

    const isLast = State.currentLesson >= mod.lessons.length - 1;
    const key = mod.id + '-' + State.currentLesson;
    const alreadyDone = State.completedLessons[key];

    return `
      <div class="lesson-view">
        <button class="btn-back" data-action="back-to-module">← Retour au module</button>
        <div class="lesson-header">
          <span class="lesson-tag" style="background:${mod.color}22;color:${mod.color};border:1px solid ${mod.color}44">${escapeHtml(mod.title)}</span>
          <h2 class="lesson-title">
            <span class="lesson-title-icon">${lesson.icon}</span>
            ${escapeHtml(lesson.title)}
          </h2>
        </div>
        <div class="lesson-content">${blocks}</div>
        <div class="lesson-nav">
          ${State.currentLesson > 0
            ? `<button class="lesson-nav-btn secondary" data-action="prev-lesson">← Leçon précédente</button>`
            : '<span></span>'}
          <button class="lesson-nav-btn primary" data-action="${isLast ? 'finish-lesson' : 'next-lesson'}">
            ${isLast ? '✅ Terminer et retour au module' : 'Leçon suivante →'}
          </button>
        </div>
      </div>`;
  }

  /* ═══════════════════════════════════════════
     RENDER: QUIZ
     ═══════════════════════════════════════════ */
  function renderQuiz() {
    const mod = Data.MODULES.find(m => m.id === State.currentModule);
    if (!mod) return renderModules();
    const quiz = mod.quiz;
    const q = quiz[State.currentQuiz];
    if (!q) return renderQuizResult();

    const progress = ((State.currentQuiz) / quiz.length) * 100;

    const optionsHtml = q.options.map((opt, i) => {
      let cls = 'quiz-option';
      if (State.quizAnswered) {
        cls += ' disabled';
        if (i === q.correct) cls += ' correct';
        else if (State.quizAnswers[State.currentQuiz] === i && i !== q.correct) cls += ' wrong';
      }
      return `
        <div class="${cls}" data-action="quiz-answer" data-index="${i}">
          <span class="quiz-option-letter">${LETTERS[i]}</span>
          <span>${escapeHtml(opt)}</span>
        </div>`;
    }).join('');

    let feedbackHtml = '';
    if (State.quizAnswered) {
      const isCorrect = State.quizAnswers[State.currentQuiz] === q.correct;
      feedbackHtml = `
        <div class="quiz-feedback ${isCorrect ? 'correct' : 'wrong'}">
          <span class="quiz-feedback-icon">${isCorrect ? '✅' : '❌'}</span>
          ${isCorrect ? 'Bravo !' : 'Pas tout à fait...'} ${escapeHtml(q.explanation)}
        </div>
        ${State.streak >= 2 ? `<div class="streak-indicator">🔥 Streak : ${State.streak} bonnes réponses !</div>` : ''}
        <button class="quiz-next-btn" data-action="quiz-next">
          ${State.currentQuiz < quiz.length - 1 ? 'Question suivante →' : 'Voir les résultats 🏆'}
        </button>`;
    }

    return `
      <div class="quiz-view">
        <button class="btn-back" data-action="back-to-module">← Quitter le quiz</button>
        <div class="quiz-progress">
          <span class="quiz-progress-text">${State.currentQuiz + 1}/${quiz.length}</span>
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" style="width:${progress}%;background:linear-gradient(90deg,${mod.color},${mod.color}88)"></div>
          </div>
        </div>
        <div class="quiz-card">
          <div class="quiz-question-number">Question ${State.currentQuiz + 1}</div>
          <div class="quiz-question">${escapeHtml(q.question)}</div>
          <div class="quiz-options">${optionsHtml}</div>
          ${feedbackHtml}
        </div>
      </div>`;
  }

  /* ═══════════════════════════════════════════
     RENDER: QUIZ RESULT
     ═══════════════════════════════════════════ */
  function renderQuizResult() {
    const mod = Data.MODULES.find(m => m.id === State.currentModule);
    if (!mod) return renderModules();

    const total = mod.quiz.length;
    const score = State.quizAnswers.reduce((s, a, i) => s + (a === mod.quiz[i].correct ? 1 : 0), 0);
    const pct = Math.round((score / total) * 100);

    // Calculate XP earned
    let xpEarned = score * XP_CORRECT;
    if (score === total) xpEarned += XP_PERFECT;

    let resultIcon, resultTitle;
    if (pct === 100) { resultIcon = '🏆'; resultTitle = 'Parfait ! Incroyable !'; }
    else if (pct >= 80) { resultIcon = '🌟'; resultTitle = 'Excellent travail !'; }
    else if (pct >= 60) { resultIcon = '👍'; resultTitle = 'Bien joué !'; }
    else if (pct >= 40) { resultIcon = '💪'; resultTitle = 'Pas mal, tu progresses !'; }
    else { resultIcon = '📚'; resultTitle = 'Continue d\'apprendre !'; }

    // Save quiz result
    const prev = State.completedQuizzes[mod.id];
    if (!prev || score > prev.score) {
      State.completedQuizzes[mod.id] = { score, total };
    }

    addXP(xpEarned);
    checkBadges();

    // New badges earned
    const newBadgesHtml = State.newBadges.length > 0
      ? `<div class="badges-earned">
          ${State.newBadges.map(bId => {
            const b = Data.BADGES.find(x => x.id === bId);
            return b ? `<div class="badge-earned-item">
              <span class="badge-earned-icon">${b.icon}</span>
              <span class="badge-earned-title">${escapeHtml(b.title)}</span>
            </div>` : '';
          }).join('')}
        </div>` : '';

    State.newBadges = [];

    return `
      <div class="quiz-result">
        <div class="quiz-result-card">
          <div class="quiz-result-icon">${resultIcon}</div>
          <h2 class="quiz-result-title">${resultTitle}</h2>
          <div class="quiz-result-score">${score}/${total}</div>
          <p class="quiz-result-sub">${pct}% de bonnes réponses</p>
          <div class="xp-gained">⚡ +${xpEarned} XP gagnés !</div>
          ${newBadgesHtml}
          <div style="margin-top:28px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            <button class="lesson-nav-btn primary" data-action="retry-quiz">🔄 Réessayer</button>
            <button class="lesson-nav-btn secondary" data-action="back-to-module">← Retour au module</button>
          </div>
        </div>
      </div>`;
  }

  /* ═══════════════════════════════════════════
     RENDER: PROFILE
     ═══════════════════════════════════════════ */
  function renderProfile() {
    const level = getLevel();
    const lvlIdx = getLevelIndex();
    const lvlProg = getLevelProgress();
    const nextLvl = lvlIdx < Data.LEVELS.length - 1 ? Data.LEVELS[lvlIdx + 1] : null;

    const completedLessons = Object.keys(State.completedLessons).length;
    const totalLessons = Data.MODULES.reduce((s, m) => s + m.lessons.length, 0);
    const completedQuizzes = Object.keys(State.completedQuizzes).length;
    const accuracy = State.totalAnswered > 0
      ? Math.round((State.totalCorrect / State.totalAnswered) * 100) : 0;
    const perfectQuizzes = Object.values(State.completedQuizzes).filter(q => q.score === q.total).length;
    const fullModules = Data.MODULES.filter(mod => {
      const allL = mod.lessons.every((_, i) => State.completedLessons[mod.id + '-' + i]);
      return allL && State.completedQuizzes[mod.id];
    }).length;

    const badgesHtml = Data.BADGES.map(b => {
      const earned = State.badges.includes(b.id);
      return `
        <div class="badge-card ${earned ? 'earned' : 'locked'}">
          <span class="badge-card-icon">${b.icon}</span>
          <div class="badge-card-title">${escapeHtml(b.title)}</div>
          <div class="badge-card-desc">${escapeHtml(b.desc)}</div>
        </div>`;
    }).join('');

    const userSection = State.user
      ? `<div class="profile-user-badge">
           <span class="profile-user-icon">👤</span>
           <span class="profile-user-pseudo">${escapeHtml(State.user.pseudo)}</span>
           <button class="profile-logout-btn" data-action="logout">Déconnexion</button>
         </div>`
      : (State.apiAvailable
        ? `<button class="profile-login-btn" data-action="auth">🔐 Se connecter pour sauvegarder en ligne</button>`
        : '');

    return `
      <div class="profile-view">
        <button class="btn-back" data-action="modules">← Retour aux modules</button>

        <div class="profile-header-card">
          ${userSection}
          <span class="profile-level-icon">${level.icon}</span>
          <h2 class="profile-level-title">${level.title}</h2>
          <p class="profile-level-sub">Niveau ${lvlIdx + 1} — ${State.xp} XP</p>
          <div class="profile-xp-bar">
            <div class="profile-xp-fill" style="width:${lvlProg}%"></div>
          </div>
          <div class="profile-xp-text">
            ${nextLvl ? `${State.xp - Data.LEVELS[lvlIdx].min} / ${nextLvl.min - Data.LEVELS[lvlIdx].min} XP vers ${nextLvl.title} ${nextLvl.icon}` : 'Niveau maximum atteint ! 🎉'}
          </div>
        </div>

        <div class="profile-stats">
          <div class="profile-stat">
            <div class="profile-stat-value" style="color:var(--neon-teal)">${State.xp}</div>
            <div class="profile-stat-label">XP Total</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value" style="color:var(--neon-blue)">${completedLessons}/${totalLessons}</div>
            <div class="profile-stat-label">Leçons</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value" style="color:var(--neon-purple)">${completedQuizzes}/${Data.MODULES.length}</div>
            <div class="profile-stat-label">Quiz</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value" style="color:var(--neon-green)">${accuracy}%</div>
            <div class="profile-stat-label">Précision</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value" style="color:var(--neon-amber)">${State.maxStreak}</div>
            <div class="profile-stat-label">Meilleur Streak 🔥</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value" style="color:var(--neon-pink)">${perfectQuizzes}</div>
            <div class="profile-stat-label">Quiz Parfaits 💎</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value" style="color:var(--neon-blue)">${State.totalAnswered}</div>
            <div class="profile-stat-label">Questions 📊</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value" style="color:var(--neon-green)">${fullModules}/${Data.MODULES.length}</div>
            <div class="profile-stat-label">Modules 100% 🎯</div>
          </div>
        </div>

        <div class="profile-badges-title">🏅 Badges (${State.badges.length}/${Data.BADGES.length})</div>
        <div class="profile-badges-grid">${badgesHtml}</div>

        <div class="profile-reset">
          <button class="profile-reset-btn" data-action="reset">🗑️ Réinitialiser la progression</button>
        </div>
      </div>`;
  }

  /* ═══════════════════════════════════════════
     RENDER: AUTH (Login / Register)
     ═══════════════════════════════════════════ */
  function renderAuth() {
    const isLogin = State.authMode === 'login';
    const pinDots = [];
    for (var i = 0; i < 4; i++) {
      pinDots.push('<div class="pin-dot ' + (i < State.authPin.length ? 'filled' : '') + '">' + (i < State.authPin.length ? '●' : '○') + '</div>');
    }
    const numKeys = [1,2,3,4,5,6,7,8,9,null,0,'back'];
    const numpad = numKeys.map(function(n) {
      if (n === null) return '<div class="numpad-key empty"></div>';
      if (n === 'back') return '<div class="numpad-key backspace" data-action="pin-backspace">⌫</div>';
      return '<div class="numpad-key" data-action="pin-digit" data-digit="' + n + '">' + n + '</div>';
    }).join('');

    const ready = State.authPin.length === 4 && State.authPseudo.length > 0;

    return '\
    <div class="auth-view">\
      <div class="auth-card">\
        <div class="auth-hero-icon">🔐</div>\
        <h2 class="auth-title">' + (isLogin ? 'Connexion' : 'Inscription') + '</h2>\
        <p class="auth-subtitle">' + (isLogin ? 'Entre ton pseudo et ton code PIN' : 'Choisis un pseudo et un code PIN à 4 chiffres') + '</p>\
        <div class="auth-tabs">\
          <button class="auth-tab ' + (isLogin ? 'active' : '') + '" data-action="auth-tab" data-mode="login">Connexion</button>\
          <button class="auth-tab ' + (!isLogin ? 'active' : '') + '" data-action="auth-tab" data-mode="register">Inscription</button>\
        </div>\
        <div class="auth-field">\
          <label class="auth-label">Pseudo</label>\
          <input type="text" class="auth-input" id="auth-pseudo" maxlength="20" placeholder="Ton pseudo..." value="' + escapeHtml(State.authPseudo) + '" autocomplete="off">\
        </div>\
        <div class="auth-field">\
          <label class="auth-label">Code PIN (4 chiffres)</label>\
          <div class="pin-display">' + pinDots.join('') + '</div>\
        </div>\
        <div class="numpad">' + numpad + '</div>\
        ' + (State.authError ? '<div class="auth-error">' + escapeHtml(State.authError) + '</div>' : '') + '\
        <button class="auth-submit-btn ' + (State.authLoading ? 'loading' : '') + ' ' + (!ready ? 'disabled' : '') + '"\
                data-action="auth-submit" ' + (!ready || State.authLoading ? 'disabled' : '') + '>\
          ' + (State.authLoading ? '⏳ Chargement...' : (isLogin ? '🔓 Se connecter' : '✨ S\'inscrire')) + '\
        </button>\
        <button class="auth-skip-btn" data-action="modules">Continuer en invité →</button>\
      </div>\
    </div>';
  }

  /* ═══════════════════════════════════════════
     RENDER: SCOREBOARD
     ═══════════════════════════════════════════ */
  function renderScoreboard() {
    // API non disponible → message explicatif
    if (!State.apiAvailable) {
      return '\
        <div class="scoreboard-view">\
          <button class="btn-back" data-action="modules">← Retour</button>\
          <div class="scoreboard-header">\
            <h2>🏆 Classement</h2>\
            <p>Les meilleurs explorateurs IT</p>\
          </div>\
          <div class="scoreboard-offline">\
            <span class="scoreboard-offline-icon">🌐</span>\
            <h3>Classement non disponible</h3>\
            <p>Le classement nécessite une connexion à une instance EZGalaxy.</p>\
            <p class="scoreboard-offline-sub">Quand tu utilises cette app sur une plateforme EZGalaxy,<br>tu peux t\'inscrire, sauvegarder ta progression en ligne<br>et comparer tes stats avec les autres !</p>\
            <div class="scoreboard-offline-features">\
              <div class="scoreboard-feature">🥇 Classement par XP</div>\
              <div class="scoreboard-feature">👤 Pseudo + Code PIN</div>\
              <div class="scoreboard-feature">📊 Comparaison des stats</div>\
              <div class="scoreboard-feature">☁️ Sauvegarde en ligne</div>\
            </div>\
          </div>\
        </div>';
    }

    if (State.scoreboardLoading) {
      return '<div class="scoreboard-view"><div class="scoreboard-loading"><div class="loading-spinner"></div><p>Chargement du classement...</p></div></div>';
    }

    const rows = State.scoreboard.map(function(entry, i) {
      const rank = i + 1;
      var medal = rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : '#' + rank;
      var lvl = getLevelForXP(entry.xp);
      var isMe = State.user && State.user.pseudo === entry.pseudo;
      return '\
        <div class="scoreboard-row ' + (isMe ? 'highlight-me' : '') + ' ' + (rank <= 3 ? 'top-3' : '') + '">\
          <div class="scoreboard-rank">' + medal + '</div>\
          <div class="scoreboard-user">\
            <span class="scoreboard-pseudo">' + escapeHtml(entry.pseudo) + '</span>\
            <span class="scoreboard-level">' + lvl.icon + ' ' + lvl.title + '</span>\
          </div>\
          <div class="scoreboard-xp">⚡ ' + entry.xp + ' XP</div>\
          <div class="scoreboard-badges">🏅 ' + entry.badges + '</div>\
        </div>';
    }).join('');

    var emptyMsg = '<div class="scoreboard-empty"><span class="scoreboard-empty-icon">📭</span><p>Aucun joueur inscrit pour l\'instant.</p><p>Inscris-toi pour apparaître ici !</p></div>';

    return '\
      <div class="scoreboard-view">\
        <button class="btn-back" data-action="modules">← Retour</button>\
        <div class="scoreboard-header">\
          <h2>🏆 Classement</h2>\
          <p>Les meilleurs explorateurs IT</p>\
          <button class="scoreboard-refresh-btn" data-action="refresh-scoreboard">🔄 Actualiser</button>\
        </div>\
        ' + (State.scoreboard.length === 0 ? emptyMsg : '<div class="scoreboard-list">' + rows + '</div>') + '\
        ' + (!State.user ? '<div class="scoreboard-cta"><button class="auth-submit-btn" data-action="auth">🔐 S\'inscrire pour apparaître</button></div>' : '') + '\
      </div>';
  }

  /* ═══════════════════════════════════════════
     PIN/AUTH DOM HELPERS (no full re-render)
     ═══════════════════════════════════════════ */
  function updatePinDisplay() {
    var dots = $$('.pin-dot');
    dots.forEach(function(dot, i) {
      if (i < State.authPin.length) {
        dot.className = 'pin-dot filled';
        dot.textContent = '●';
      } else {
        dot.className = 'pin-dot';
        dot.textContent = '○';
      }
    });
  }

  function updateSubmitButton() {
    var btn = $('.auth-submit-btn');
    if (!btn) return;
    var ready = State.authPin.length === 4 && State.authPseudo.length > 0;
    btn.disabled = !ready || State.authLoading;
    if (ready) btn.classList.remove('disabled');
    else btn.classList.add('disabled');
  }

  /* ═══════════════════════════════════════════
     EVENT BINDING
     ═══════════════════════════════════════════ */
  function bindEvents() {
    const app = $id('app');
    if (!app) return;

    app.addEventListener('click', handleClick);
  }

  function handleClick(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    if (!action) return;

    // Ripple effect
    if (Effects && (target.tagName === 'BUTTON' || target.classList.contains('module-card'))) {
      Effects.ripple(e);
    }

    switch (action) {
      case 'home':
        navigate('home');
        break;

      case 'modules':
        navigate('modules');
        break;

      case 'profile':
        navigate('profile');
        break;

      case 'open-module':
        navigate('module', { module: target.dataset.module });
        break;

      case 'open-lesson':
        navigate('lesson', { lesson: parseInt(target.dataset.lesson, 10) });
        break;

      case 'back-to-module':
        navigate('module', { module: State.currentModule });
        break;

      case 'prev-lesson':
        completeCurrentLesson();
        navigate('lesson', { lesson: State.currentLesson - 1 });
        break;

      case 'next-lesson':
        completeCurrentLesson();
        navigate('lesson', { lesson: State.currentLesson + 1 });
        break;

      case 'finish-lesson':
        completeCurrentLesson();
        navigate('module', { module: State.currentModule });
        break;

      case 'start-quiz':
        State.currentQuiz = 0;
        State.quizAnswers = [];
        State.quizAnswered = false;
        State.newBadges = [];
        navigate('quiz');
        break;

      case 'retry-quiz':
        State.currentQuiz = 0;
        State.quizAnswers = [];
        State.quizAnswered = false;
        State.newBadges = [];
        navigate('quiz');
        break;

      case 'quiz-answer':
        if (State.quizAnswered) return;
        handleQuizAnswer(parseInt(target.dataset.index, 10));
        break;

      case 'quiz-next':
        State.quizAnswered = false;
        if (State.currentQuiz < getCurrentModule().quiz.length - 1) {
          State.currentQuiz++;
          render();
        } else {
          navigate('quiz-result');
        }
        break;

      case 'reset':
        showConfirmDialog(
          'Réinitialiser ?',
          'Toute ta progression, tes XP et tes badges seront supprimés. Cette action est irréversible.',
          () => {
            resetProgress();
            navigate('home');
            toast('info', 'Progression réinitialisée');
          }
        );
        break;

      case 'auth':
        if (!State.apiAvailable) {
          toast('info', 'Connexion disponible uniquement sur une instance EZGalaxy');
          break;
        }
        State.authPin = '';
        State.authPseudo = '';
        State.authError = '';
        State.authLoading = false;
        navigate('auth');
        break;

      case 'auth-tab':
        State.authMode = target.dataset.mode || 'login';
        State.authPin = '';
        State.authError = '';
        render();
        break;

      case 'pin-digit':
        if (State.authPin.length < 4) {
          State.authPin += target.dataset.digit;
          updatePinDisplay();
          updateSubmitButton();
        }
        break;

      case 'pin-backspace':
        if (State.authPin.length > 0) {
          State.authPin = State.authPin.slice(0, -1);
          updatePinDisplay();
          updateSubmitButton();
        }
        break;

      case 'auth-submit':
        if (State.authLoading || State.authPin.length < 4 || !State.authPseudo) break;
        handleAuthSubmit();
        break;

      case 'scoreboard':
        navigate('scoreboard');
        if (State.apiAvailable) loadScoreboard();
        break;

      case 'refresh-scoreboard':
        loadScoreboard();
        break;

      case 'logout':
        doLogout();
        navigate('home');
        break;

      case 'reveal':
        target.closest('.reveal-option').classList.toggle('revealed');
        break;
    }
  }

  /* ═══════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════ */
  function getCurrentModule() {
    return Data.MODULES.find(m => m.id === State.currentModule);
  }

  function completeCurrentLesson() {
    const key = State.currentModule + '-' + State.currentLesson;
    if (!State.completedLessons[key]) {
      State.completedLessons[key] = true;
      addXP(XP_LESSON);
      toast('success', `+${XP_LESSON} XP — Leçon complétée !`);
      checkBadges();
    }
  }

  function handleQuizAnswer(answerIdx) {
    const mod = getCurrentModule();
    if (!mod) return;
    const q = mod.quiz[State.currentQuiz];
    if (!q) return;

    State.quizAnswered = true;
    State.quizAnswers[State.currentQuiz] = answerIdx;
    State.totalAnswered++;

    const isCorrect = answerIdx === q.correct;
    if (isCorrect) {
      State.totalCorrect++;
      State.streak++;
      if (State.streak > State.maxStreak) State.maxStreak = State.streak;
      if (State.streak >= 5) checkBadges();
    } else {
      State.streak = 0;
    }

    saveProgress();
    render(); // re-render with feedback
  }

  /* ═══════════════════════════════════════════
     CONFIRM DIALOG
     ═══════════════════════════════════════════ */
  function showConfirmDialog(title, message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog-box">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <div class="dialog-actions">
          <button class="dialog-btn cancel" id="dialog-cancel">Annuler</button>
          <button class="dialog-btn confirm" id="dialog-confirm">Confirmer</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#dialog-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#dialog-confirm').addEventListener('click', () => {
      overlay.remove();
      onConfirm();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  /* ═══════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    initAPI();
    loadUser();
    loadProgress();

    // Init particle system
    if (Effects) Effects.initParticles();

    // Small delay for loading screen, then render
    setTimeout(() => {
      render();
    }, 600);
  });

})();
