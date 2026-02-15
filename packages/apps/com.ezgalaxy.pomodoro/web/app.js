(() => {
  'use strict';

  const EXTENSION_ID = 'com.ezgalaxy.pomodoro';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ── State ── */
  const state = {
    mode: 'work',        // work | short | long
    running: false,
    timeLeft: 25 * 60,
    totalTime: 25 * 60,
    sessionsCompleted: 0,
    sessionsGoal: 4,
    interval: null,
    settings: { work: 25, short: 5, long: 15, goal: 4, sound: true },
    todaySessions: [],
    history: {}         // { 'YYYY-MM-DD': { sessions: N, totalMinutes: N } }
  };

  /* ── Audio (Web Audio API) ── */
  let audioCtx = null;
  function playNotification() {
    if (!state.settings.sound) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.8);
      // Second beep
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1100, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.6);
      }, 300);
    } catch (e) { /* ignore audio errors */ }
  }

  /* ── Persistence ── */
  async function loadSettings() {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        const res = await ezgalaxy.storage.get('settings', 'config');
        if (res && res.data) Object.assign(state.settings, res.data);
      }
    } catch (e) { console.warn('Pomodoro: settings load failed', e); }
    state.sessionsGoal = state.settings.goal;
    applyMode(state.mode);
  }

  async function saveSettings() {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        await ezgalaxy.storage.set('settings', 'config', { ...state.settings });
      }
    } catch (e) { /* ignore */ }
  }

  async function loadHistory() {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        const res = await ezgalaxy.storage.list('sessions', { limit: 60, sort_by: 'key', sort_order: 'desc' });
        if (res && Array.isArray(res)) {
          res.forEach(r => { state.history[r.key] = r.data; });
        }
      }
    } catch (e) { console.warn('Pomodoro: history load failed', e); }
  }

  async function saveSession() {
    const today = new Date().toISOString().slice(0, 10);
    if (!state.history[today]) state.history[today] = { sessions: 0, totalMinutes: 0 };
    state.history[today].sessions++;
    state.history[today].totalMinutes += state.settings.work;
    try {
      if (typeof ezgalaxy !== 'undefined') {
        await ezgalaxy.storage.set('sessions', today, state.history[today]);
      }
    } catch (e) { /* ignore */ }
  }

  /* ── Timer logic ── */
  function applyMode(mode) {
    state.mode = mode;
    const durations = { work: state.settings.work, short: state.settings.short, long: state.settings.long };
    state.totalTime = durations[mode] * 60;
    state.timeLeft = state.totalTime;
    state.running = false;
    if (state.interval) { clearInterval(state.interval); state.interval = null; }
    render();
  }

  function startTimer() {
    if (state.running) return;
    state.running = true;
    state.interval = setInterval(() => {
      state.timeLeft--;
      if (state.timeLeft <= 0) {
        clearInterval(state.interval);
        state.interval = null;
        state.running = false;
        playNotification();
        if (state.mode === 'work') {
          state.sessionsCompleted++;
          saveSession();
          if (state.sessionsCompleted >= state.sessionsGoal) {
            applyMode('long');
            state.sessionsCompleted = 0;
          } else {
            applyMode('short');
          }
        } else {
          applyMode('work');
        }
        return;
      }
      updateTimerDisplay();
    }, 1000);
    render();
  }

  function pauseTimer() {
    state.running = false;
    if (state.interval) { clearInterval(state.interval); state.interval = null; }
    render();
  }

  function resetTimer() {
    applyMode(state.mode);
  }

  /* ── Formatting ── */
  function fmtTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function getModeLabel(mode) {
    return { work: 'Concentration', short: 'Pause courte', long: 'Pause longue' }[mode] || mode;
  }

  /* ── Chart (simple canvas bar chart) ── */
  function drawChart(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    // Last 14 days
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), ...(state.history[key] || { sessions: 0, totalMinutes: 0 }) });
    }

    const maxVal = Math.max(1, ...days.map(d => d.sessions));
    const barW = Math.floor((w - 40) / days.length) - 4;
    const chartH = h - 40;
    const startX = 30;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = 10 + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(w - 10, y); ctx.stroke();
    }

    // Bars
    days.forEach((d, i) => {
      const x = startX + i * (barW + 4);
      const barH = (d.sessions / maxVal) * (chartH - 10);
      const y = 10 + chartH - barH;

      // Bar
      ctx.fillStyle = d.sessions > 0 ? 'rgba(14,165,164,0.7)' : 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
      ctx.fill();

      // Label
      ctx.fillStyle = 'rgba(229,231,235,0.5)';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barW / 2, h - 4);
    });

    // Y-axis labels
    ctx.fillStyle = 'rgba(229,231,235,0.4)';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = Math.round((maxVal / 4) * (4 - i));
      const y = 10 + (chartH / 4) * i;
      ctx.fillText(val, startX - 6, y + 4);
    }
  }

  /* ── Update timer display without full re-render ── */
  function updateTimerDisplay() {
    const timeEl = $('.pm-time-display .time');
    const progress = $('.pm-circle-progress');
    if (timeEl) timeEl.textContent = fmtTime(state.timeLeft);
    if (progress) {
      const circumference = 2 * Math.PI * 108;
      const offset = circumference * (1 - state.timeLeft / state.totalTime);
      progress.style.strokeDashoffset = offset;
    }
  }

  /* ── Render ── */
  let currentTab = 'timer';

  function render() {
    const root = $('#app');
    const circumference = 2 * Math.PI * 108;
    const offset = circumference * (1 - state.timeLeft / state.totalTime);

    const todayKey = new Date().toISOString().slice(0, 10);
    const todayData = state.history[todayKey] || { sessions: 0, totalMinutes: 0 };

    // Total stats
    let totalSessions = 0, totalMinutes = 0;
    Object.values(state.history).forEach(v => { totalSessions += v.sessions; totalMinutes += v.totalMinutes; });

    root.innerHTML = `
      <div class="pm-header">
        <h1><span>🍅</span> Pomodoro Pro</h1>
      </div>

      <div class="pm-tabs">
        <button class="pm-tab ${currentTab === 'timer' ? 'active' : ''}" data-tab="timer">Timer</button>
        <button class="pm-tab ${currentTab === 'stats' ? 'active' : ''}" data-tab="stats">Statistiques</button>
        <button class="pm-tab ${currentTab === 'settings' ? 'active' : ''}" data-tab="settings">Réglages</button>
      </div>

      <div class="pm-panel ${currentTab === 'timer' ? 'active' : ''}" data-panel="timer">
        <div class="pm-timer-wrap">
          <div class="pm-controls" style="margin-bottom:8px">
            <button class="${state.mode === 'work' ? 'active' : ''}" data-mode="work">Travail</button>
            <button class="${state.mode === 'short' ? 'active' : ''}" data-mode="short">Pause courte</button>
            <button class="${state.mode === 'long' ? 'active' : ''}" data-mode="long">Pause longue</button>
          </div>

          <div class="pm-circle-container">
            <svg class="pm-circle-svg" viewBox="0 0 240 240">
              <circle class="pm-circle-bg" cx="120" cy="120" r="108" />
              <circle class="pm-circle-progress" cx="120" cy="120" r="108"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}" />
            </svg>
            <div class="pm-time-display">
              <div class="time">${fmtTime(state.timeLeft)}</div>
              <div class="label">${getModeLabel(state.mode)}</div>
            </div>
          </div>

          <div class="pm-controls">
            ${state.running
              ? `<button class="pm-btn-start" data-action="pause">⏸ Pause</button>`
              : `<button class="pm-btn-start" data-action="start">▶ Démarrer</button>`
            }
            <button data-action="reset">↻ Réinitialiser</button>
            <button data-action="skip">⏭ Passer</button>
          </div>

          <div class="pm-sessions">
            ${Array.from({ length: state.sessionsGoal }, (_, i) =>
              `<div class="pm-dot ${i < state.sessionsCompleted ? 'done' : ''} ${i === state.sessionsCompleted ? 'current' : ''}"></div>`
            ).join('')}
            <span style="font-size:.78rem;color:var(--ez-muted);margin-left:6px">${state.sessionsCompleted} / ${state.sessionsGoal}</span>
          </div>

          <label class="pm-sound-toggle">
            <input type="checkbox" ${state.settings.sound ? 'checked' : ''} data-action="toggle-sound" />
            🔔 Son de notification
          </label>
        </div>
      </div>

      <div class="pm-panel ${currentTab === 'stats' ? 'active' : ''}" data-panel="stats">
        <div class="ez-card pm-stats-grid" style="margin-bottom:12px">
          <div class="pm-stat"><div class="value">${todayData.sessions}</div><div class="label">Sessions aujourd'hui</div></div>
          <div class="pm-stat"><div class="value">${todayData.totalMinutes}</div><div class="label">Minutes aujourd'hui</div></div>
          <div class="pm-stat"><div class="value">${totalSessions}</div><div class="label">Total sessions</div></div>
        </div>
        <div class="ez-card">
          <h3 style="margin:0 0 10px;font-size:.95rem">📊 Sessions par jour (14 derniers jours)</h3>
          <div class="pm-chart-wrap"><canvas id="pm-chart"></canvas></div>
        </div>
      </div>

      <div class="pm-panel ${currentTab === 'settings' ? 'active' : ''}" data-panel="settings">
        <div class="ez-card">
          <h3 style="margin:0 0 12px;font-size:.95rem">⚙️ Durées (minutes)</h3>
          <div class="pm-settings">
            <div class="pm-setting">
              <label>Travail</label>
              <input type="number" min="1" max="120" value="${state.settings.work}" data-setting="work" />
            </div>
            <div class="pm-setting">
              <label>Pause courte</label>
              <input type="number" min="1" max="30" value="${state.settings.short}" data-setting="short" />
            </div>
            <div class="pm-setting">
              <label>Pause longue</label>
              <input type="number" min="1" max="60" value="${state.settings.long}" data-setting="long" />
            </div>
            <div class="pm-setting">
              <label>Sessions avant longue pause</label>
              <input type="number" min="1" max="12" value="${state.settings.goal}" data-setting="goal" />
            </div>
          </div>
          <button class="ez-btn ez-btn--primary" data-action="save-settings" style="margin-top:14px;width:100%">💾 Sauvegarder les réglages</button>
        </div>
      </div>
    `;

    // Chart
    if (currentTab === 'stats') {
      requestAnimationFrame(() => {
        const canvas = $('#pm-chart');
        if (canvas) drawChart(canvas);
      });
    }

    bindEvents();
  }

  /* ── Events ── */
  function bindEvents() {
    // Tabs
    $$('.pm-tab').forEach(t => t.addEventListener('click', () => {
      currentTab = t.dataset.tab;
      render();
    }));

    // Mode buttons
    $$('[data-mode]').forEach(b => b.addEventListener('click', () => {
      if (!state.running) applyMode(b.dataset.mode);
    }));

    // Actions
    $$('[data-action]').forEach(b => b.addEventListener('click', () => {
      switch (b.dataset.action) {
        case 'start': startTimer(); break;
        case 'pause': pauseTimer(); break;
        case 'reset': resetTimer(); break;
        case 'skip':
          clearInterval(state.interval);
          state.interval = null;
          state.running = false;
          if (state.mode === 'work') {
            state.sessionsCompleted++;
            saveSession();
            if (state.sessionsCompleted >= state.sessionsGoal) {
              applyMode('long');
              state.sessionsCompleted = 0;
            } else {
              applyMode('short');
            }
          } else {
            applyMode('work');
          }
          break;
        case 'toggle-sound':
          state.settings.sound = b.checked !== undefined ? b.checked : !state.settings.sound;
          break;
        case 'save-settings':
          $$('[data-setting]').forEach(inp => {
            const v = parseInt(inp.value, 10);
            if (v > 0) state.settings[inp.dataset.setting] = v;
          });
          state.sessionsGoal = state.settings.goal;
          saveSettings();
          applyMode(state.mode);
          break;
      }
    }));

    // Sound checkbox
    const soundCb = $('[data-action="toggle-sound"]');
    if (soundCb) soundCb.addEventListener('change', () => {
      state.settings.sound = soundCb.checked;
    });
  }

  /* ── Init ── */
  async function init() {
    await loadSettings();
    await loadHistory();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
