(() => {
  'use strict';

  const EXTENSION_ID = 'com.ezgalaxy.habits';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const EMOJIS = ['💪','📚','🏃','💧','🧘','🎯','✍️','🥗','😴','🎵','🧹','💊','🌅','📵','🤝','💰'];

  const state = {
    habits: [],    // { id, name, emoji, createdAt }
    logs: {},      // { 'YYYY-MM': { 'YYYY-MM-DD': [habitId, ...] } }
    tab: 'today'
  };

  /* ── Helpers ── */
  function today() { return new Date().toISOString().slice(0, 10); }
  function monthKey(d) { return (d || today()).slice(0, 7); }
  function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function getDayLogs(date) {
    const mk = monthKey(date);
    return (state.logs[mk] && state.logs[mk][date]) || [];
  }

  function setDayLog(date, habitId, done) {
    const mk = monthKey(date);
    if (!state.logs[mk]) state.logs[mk] = {};
    if (!state.logs[mk][date]) state.logs[mk][date] = [];
    const arr = state.logs[mk][date];
    if (done && !arr.includes(habitId)) arr.push(habitId);
    if (!done) state.logs[mk][date] = arr.filter(id => id !== habitId);
  }

  function getStreak(habitId) {
    let streak = 0;
    const d = new Date();
    // Start from yesterday if today not yet done
    const todayLogs = getDayLogs(today());
    if (!todayLogs.includes(habitId)) d.setDate(d.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      const key = d.toISOString().slice(0, 10);
      const logs = getDayLogs(key);
      if (logs.includes(habitId)) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    // Add today if done
    if (todayLogs.includes(habitId)) streak++;
    // Avoid double count
    if (todayLogs.includes(habitId) && streak > 0) return streak;
    return streak;
  }

  /* ── Persistence ── */
  async function loadData() {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        const hRes = await ezgalaxy.storage.get('habits', 'list');
        if (hRes && hRes.data) state.habits = hRes.data;
        const logsList = await ezgalaxy.storage.list('logs', { limit: 24 });
        if (logsList && Array.isArray(logsList)) {
          logsList.forEach(r => { state.logs[r.key] = r.data; });
        }
      }
    } catch (e) { console.warn('HabitForge: load failed', e); }
  }

  async function saveHabits() {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        await ezgalaxy.storage.set('habits', 'list', state.habits);
      }
    } catch (e) { /* ignore */ }
  }

  async function saveLogs(mk) {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        await ezgalaxy.storage.set('logs', mk, state.logs[mk] || {});
      }
    } catch (e) { /* ignore */ }
  }

  /* ── Heatmap data ── */
  function buildHeatmap(habitId) {
    const cells = [];
    const d = new Date();
    d.setDate(d.getDate() - 364);
    for (let i = 0; i < 365; i++) {
      const key = d.toISOString().slice(0, 10);
      const logs = getDayLogs(key);
      let count = 0;
      if (habitId) {
        count = logs.includes(habitId) ? 1 : 0;
      } else {
        count = state.habits.filter(h => logs.includes(h.id)).length;
      }
      cells.push({ date: key, count });
      d.setDate(d.getDate() + 1);
    }
    return cells;
  }

  function heatLevel(count, max) {
    if (count === 0) return '';
    const ratio = count / Math.max(1, max);
    if (ratio <= 0.25) return 'l1';
    if (ratio <= 0.5) return 'l2';
    if (ratio <= 0.75) return 'l3';
    return 'l4';
  }

  /* ── Render ── */
  function render() {
    const root = $('#app');
    const t = today();
    const todayLogs = getDayLogs(t);
    const doneCount = state.habits.filter(h => todayLogs.includes(h.id)).length;
    const total = state.habits.length;
    const pct = total > 0 ? Math.round(doneCount / total * 100) : 0;

    // Best streak
    let bestStreak = 0;
    state.habits.forEach(h => { const s = getStreak(h.id); if (s > bestStreak) bestStreak = s; });

    // Total completions
    let totalCompletions = 0;
    Object.values(state.logs).forEach(month => {
      Object.values(month).forEach(dayArr => { totalCompletions += dayArr.length; });
    });

    root.innerHTML = `
      <div class="hf-header"><h1><span>✅</span> Habit Forge</h1></div>

      <div class="hf-tabs">
        <button class="hf-tab ${state.tab === 'today' ? 'active' : ''}" data-tab="today">Aujourd'hui</button>
        <button class="hf-tab ${state.tab === 'stats' ? 'active' : ''}" data-tab="stats">Statistiques</button>
        <button class="hf-tab ${state.tab === 'manage' ? 'active' : ''}" data-tab="manage">Gérer</button>
      </div>

      <div class="hf-panel ${state.tab === 'today' ? 'active' : ''}" data-panel="today">
        <div class="hf-today-label">
          <span>Progression du jour</span>
          <span>${doneCount}/${total} (${pct}%)</span>
        </div>
        <div class="hf-today-bar"><div class="fill" style="width:${pct}%"></div></div>
        <div class="hf-habits">
          ${state.habits.length === 0 ? `<div class="hf-empty"><div class="big">✨</div>Ajoutez votre première habitude dans l'onglet "Gérer"</div>` :
            state.habits.map(h => {
              const done = todayLogs.includes(h.id);
              const streak = getStreak(h.id);
              return `
              <div class="hf-habit-card">
                <div class="hf-habit-emoji">${h.emoji}</div>
                <div class="hf-habit-info">
                  <div class="hf-habit-name">${h.name}</div>
                  <div class="hf-habit-streak">${streak > 0 ? `<span class="fire">🔥</span> ${streak} jour${streak > 1 ? 's' : ''}` : 'Pas encore de streak'}</div>
                </div>
                <button class="hf-check-btn ${done ? 'done' : ''}" data-toggle="${h.id}" title="${done ? 'Fait !' : 'Marquer comme fait'}">${done ? '✓' : ''}</button>
              </div>`;
            }).join('')
          }
        </div>
      </div>

      <div class="hf-panel ${state.tab === 'stats' ? 'active' : ''}" data-panel="stats">
        <div class="hf-stats-row">
          <div class="hf-stat-card"><div class="val">${doneCount}/${total}</div><div class="lbl">Aujourd'hui</div></div>
          <div class="hf-stat-card"><div class="val">🔥 ${bestStreak}</div><div class="lbl">Meilleur streak</div></div>
          <div class="hf-stat-card"><div class="val">${totalCompletions}</div><div class="lbl">Total complétions</div></div>
        </div>

        <div class="ez-card" style="margin-bottom:16px">
          <h3 style="margin:0 0 10px;font-size:.9rem">📅 Heatmap — Toutes les habitudes (365 jours)</h3>
          ${renderHeatmap(null)}
        </div>

        ${state.habits.map(h => `
          <div class="ez-card" style="margin-bottom:10px">
            <h3 style="margin:0 0 8px;font-size:.85rem">${h.emoji} ${h.name} — Streak: ${getStreak(h.id)} jours</h3>
            ${renderHeatmap(h.id)}
          </div>
        `).join('')}
      </div>

      <div class="hf-panel ${state.tab === 'manage' ? 'active' : ''}" data-panel="manage">
        <div class="ez-card" style="margin-bottom:16px">
          <h3 style="margin:0 0 10px;font-size:.9rem">➕ Nouvelle habitude</h3>
          <div class="hf-add-form">
            <select id="hf-emoji">${EMOJIS.map((e, i) => `<option value="${e}" ${i === 0 ? 'selected' : ''}>${e}</option>`).join('')}</select>
            <input type="text" id="hf-name" placeholder="Nom de l'habitude" maxlength="50" />
            <button class="ez-btn ez-btn--primary" data-action="add">Ajouter</button>
          </div>
        </div>
        <div class="hf-habits">
          ${state.habits.length === 0 ? '<div class="hf-empty">Aucune habitude encore</div>' :
            state.habits.map(h => `
              <div class="hf-habit-card">
                <div class="hf-habit-emoji">${h.emoji}</div>
                <div class="hf-habit-info">
                  <div class="hf-habit-name">${h.name}</div>
                  <div class="hf-habit-streak" style="font-size:.7rem">Créée le ${h.createdAt}</div>
                </div>
                <button class="hf-delete-btn" data-delete="${h.id}" title="Supprimer">🗑</button>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;
    bindEvents();
  }

  function renderHeatmap(habitId) {
    const cells = buildHeatmap(habitId);
    const maxCount = habitId ? 1 : state.habits.length;
    // Group by week columns
    const weeks = [];
    let week = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 364);
    const startDow = startDate.getDay();
    // Pad first week
    for (let i = 0; i < startDow; i++) week.push(null);
    cells.forEach(c => {
      week.push(c);
      if (week.length === 7) { weeks.push(week); week = []; }
    });
    if (week.length > 0) weeks.push(week);

    let html = '<div class="hf-heatmap"><div class="hf-heatmap-grid">';
    // Render by rows (day of week)
    for (let dow = 0; dow < 7; dow++) {
      weeks.forEach(w => {
        const cell = w[dow];
        if (!cell) {
          html += '<div class="hf-hm-cell"></div>';
        } else {
          const lvl = heatLevel(cell.count, maxCount);
          html += `<div class="hf-hm-cell ${lvl}" title="${cell.date}: ${cell.count}/${maxCount}"></div>`;
        }
      });
    }
    html += '</div>';
    html += '<div class="hf-hm-legend">Moins <div class="hf-hm-cell"></div><div class="hf-hm-cell l1"></div><div class="hf-hm-cell l2"></div><div class="hf-hm-cell l3"></div><div class="hf-hm-cell l4"></div> Plus</div>';
    html += '</div>';
    return html;
  }

  /* ── Events ── */
  function bindEvents() {
    $$('.hf-tab').forEach(t => t.addEventListener('click', () => { state.tab = t.dataset.tab; render(); }));

    $$('[data-toggle]').forEach(b => b.addEventListener('click', () => {
      const hid = b.dataset.toggle;
      const t = today();
      const logs = getDayLogs(t);
      const done = logs.includes(hid);
      setDayLog(t, hid, !done);
      saveLogs(monthKey(t));
      render();
    }));

    const addBtn = $('[data-action="add"]');
    if (addBtn) addBtn.addEventListener('click', () => {
      const nameEl = $('#hf-name');
      const emojiEl = $('#hf-emoji');
      const name = nameEl.value.trim();
      if (!name) return;
      state.habits.push({ id: genId(), name, emoji: emojiEl.value, createdAt: today() });
      saveHabits();
      render();
    });

    $$('[data-delete]').forEach(b => b.addEventListener('click', () => {
      state.habits = state.habits.filter(h => h.id !== b.dataset.delete);
      saveHabits();
      render();
    }));
  }

  /* ── Init ── */
  async function init() {
    await loadData();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
