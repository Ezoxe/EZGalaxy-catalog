(() => {
  'use strict';

  /* ── Storage ── */
  const STORE = window.ezgalaxy ? ezgalaxy.storage : null;
  async function load(k, d) {
    try { if (STORE) { const v = await STORE.getData(k); return v ?? d; } } catch(_){}
    try { return JSON.parse(localStorage.getItem('mt_' + k)) || d; } catch(_){ return d; }
  }
  async function save(k, v) {
    try { if (STORE) return await STORE.setData(k, v); } catch(_){}
    localStorage.setItem('mt_' + k, JSON.stringify(v));
  }

  /* ── Constants ── */
  const MOODS = {
    1: { emoji: '😢', label: 'Terrible', color: '#ef4444' },
    2: { emoji: '😕', label: 'Pas bien', color: '#f97316' },
    3: { emoji: '😐', label: 'Neutre',   color: '#eab308' },
    4: { emoji: '😊', label: 'Bien',     color: '#22c55e' },
    5: { emoji: '🤩', label: 'Super',    color: '#0ea5a4' }
  };

  const TAGS = [
    '💼 Travail','👨‍👩‍👧 Famille','🏃 Sport','🎮 Loisirs','📚 Lecture',
    '🍽️ Nourriture','☀️ Météo','😴 Sommeil','🧘 Méditation','💊 Santé',
    '🎵 Musique','👫 Social','🎯 Productif','😓 Stress','💡 Créatif'
  ];

  const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const DAYS_FR   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  /* ── State ── */
  let entries    = [];   // { date: 'YYYY-MM-DD', mood: 1-5, tags: [], note: '' }
  let calYear, calMonth;
  let selectedMood = 0;
  let selectedTags = [];
  let trendDays    = 7;
  let detailEntry  = null;

  const $ = s => document.querySelector(s);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

  /* ── Init ── */
  async function init() {
    entries = await load('entries', []);
    const now = new Date();
    calYear  = now.getFullYear();
    calMonth = now.getMonth();
    renderTags();
    checkToday();
    renderCalendar();
    renderTrends();
    renderInsights();
    bindEvents();
  }

  /* ── Check if today already logged ── */
  function checkToday() {
    const todayKey = today();
    const entry = entries.find(e => e.date === todayKey);
    if (entry) {
      showSaved(entry);
    }
  }

  function showSaved(entry) {
    selectedMood = entry.mood;
    document.querySelectorAll('.mood-btn').forEach(b => {
      b.classList.toggle('selected', parseInt(b.dataset.mood) === entry.mood);
    });
    $('#mood-label').textContent = MOODS[entry.mood]?.label || '';
    $('#tags-section').style.display = 'none';
    $('#note-section').style.display = 'none';
    $('#today-saved').style.display = '';
  }

  /* ── Tags ── */
  function renderTags() {
    const bar = $('#tags-bar');
    bar.innerHTML = TAGS.map(t => `<span class="tag-chip" data-tag="${t}">${t}</span>`).join('');
  }

  /* ── Events ── */
  function bindEvents() {
    // Mood buttons
    $('#mood-selector').addEventListener('click', e => {
      const btn = e.target.closest('.mood-btn');
      if (!btn) return;
      const todayKey = today();
      if (entries.find(en => en.date === todayKey)) return; // already saved
      selectedMood = parseInt(btn.dataset.mood);
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.toggle('selected', b === btn));
      $('#mood-label').textContent = MOODS[selectedMood]?.label || '';
      $('#tags-section').style.display = '';
      $('#note-section').style.display = '';
    });

    // Tags
    $('#tags-bar').addEventListener('click', e => {
      const chip = e.target.closest('.tag-chip');
      if (!chip) return;
      chip.classList.toggle('selected');
      const tag = chip.dataset.tag;
      if (selectedTags.includes(tag)) selectedTags = selectedTags.filter(t => t !== tag);
      else selectedTags.push(tag);
    });

    // Save
    $('#btn-save').addEventListener('click', saveEntry);

    // Calendar nav
    $('#btn-prev-month').addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); });
    $('#btn-next-month').addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); });

    // Tabs
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const tab = t.dataset.tab;
      document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
      $(`#view-${tab}`).style.display = '';
      if (tab === 'trends') renderTrends();
      if (tab === 'insights') renderInsights();
    }));

    // Trend period
    document.querySelectorAll('.period-btn').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      trendDays = parseInt(b.dataset.days);
      renderTrends();
    }));

    // Detail modal
    $('#btn-close-detail').addEventListener('click', () => $('#modal-detail').style.display = 'none');
    $('#btn-close-detail2').addEventListener('click', () => $('#modal-detail').style.display = 'none');
    $('#btn-delete-entry').addEventListener('click', deleteEntry);
    $('#modal-detail').addEventListener('click', e => { if (e.target.id === 'modal-detail') $('#modal-detail').style.display = 'none'; });

    // Calendar day click
    $('#cal-grid').addEventListener('click', e => {
      const day = e.target.closest('.cal-day.has-entry');
      if (!day) return;
      const dateKey = day.dataset.date;
      const entry = entries.find(en => en.date === dateKey);
      if (entry) openDetail(entry);
    });
  }

  /* ── Save entry ── */
  async function saveEntry() {
    if (!selectedMood) return;
    const todayKey = today();
    // Remove existing if any
    entries = entries.filter(e => e.date !== todayKey);
    entries.push({
      date: todayKey,
      mood: selectedMood,
      tags: [...selectedTags],
      note: $('#mood-note').value.trim()
    });
    await save('entries', entries);
    showSaved(entries.find(e => e.date === todayKey));
    renderCalendar();
    renderTrends();
    renderInsights();
  }

  /* ── Calendar ── */
  function renderCalendar() {
    $('#cal-month').textContent = `${MONTHS_FR[calMonth]} ${calYear}`;
    const grid = $('#cal-grid');
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay  = new Date(calYear, calMonth + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
    const todayKey = today();

    let html = DAYS_FR.map(d => `<div class="cal-header">${d}</div>`).join('');

    // Empty cells before 1st
    for (let i = 0; i < startDow; i++) html += '<div class="cal-day"></div>';

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const entry = entries.find(e => e.date === dateKey);
      const isToday = dateKey === todayKey;
      const moodCls = entry ? ` mood-${entry.mood} has-entry` : '';
      html += `<div class="cal-day${moodCls}${isToday ? ' today' : ''}" data-date="${dateKey}">
        ${entry ? `<span class="day-mood">${MOODS[entry.mood]?.emoji || ''}</span>` : `<span style="color:#555">${d}</span>`}
        <span class="day-num">${d}</span>
      </div>`;
    }
    grid.innerHTML = html;
  }

  /* ── Trends ── */
  function renderTrends() {
    const now = new Date();
    const from = new Date(now); from.setDate(from.getDate() - trendDays);
    const recent = entries.filter(e => new Date(e.date) >= from).sort((a, b) => a.date.localeCompare(b.date));

    drawTrendChart(recent);

    // Stats
    const stats = $('#trend-stats');
    if (!recent.length) { stats.innerHTML = '<div class="empty-state" style="grid-column:1/-1">Pas assez de données</div>'; return; }
    const avg = recent.reduce((s, e) => s + e.mood, 0) / recent.length;
    const best = Math.max(...recent.map(e => e.mood));
    const streak = calcStreak();
    stats.innerHTML = `
      <div class="trend-stat"><span class="ts-val">${avg.toFixed(1)}</span><span class="ts-lbl">Moyenne</span></div>
      <div class="trend-stat"><span class="ts-val">${MOODS[best]?.emoji || best}</span><span class="ts-lbl">Meilleur</span></div>
      <div class="trend-stat"><span class="ts-val">${streak}j</span><span class="ts-lbl">Série</span></div>`;
  }

  function drawTrendChart(data) {
    const canvas = $('#trend-chart');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (data.length < 2) { ctx.fillStyle = '#555'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Continuez à enregistrer pour voir les tendances', W/2, H/2); return; }

    const pad = { l: 35, r: 15, t: 15, b: 30 };
    const cw = W - pad.l - pad.r;
    const ch = H - pad.t - pad.b;

    // Grid
    for (let m = 1; m <= 5; m++) {
      const y = pad.t + ch * (1 - (m - 1) / 4);
      ctx.strokeStyle = 'rgba(255,255,255,.06)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillStyle = '#666'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(MOODS[m]?.emoji || m, pad.l - 6, y + 4);
    }

    // Area gradient
    const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
    grad.addColorStop(0, 'rgba(14,165,164,.25)');
    grad.addColorStop(1, 'rgba(14,165,164,.02)');

    // Area
    ctx.beginPath();
    data.forEach((e, i) => {
      const x = pad.l + (i / (data.length - 1)) * cw;
      const y = pad.t + ch * (1 - (e.mood - 1) / 4);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    const lastX = pad.l + cw;
    ctx.lineTo(lastX, H - pad.b);
    ctx.lineTo(pad.l, H - pad.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#0ea5a4';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    data.forEach((e, i) => {
      const x = pad.l + (i / (data.length - 1)) * cw;
      const y = pad.t + ch * (1 - (e.mood - 1) / 4);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots + mood emojis
    data.forEach((e, i) => {
      const x = pad.l + (i / (data.length - 1)) * cw;
      const y = pad.t + ch * (1 - (e.mood - 1) / 4);
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = MOODS[e.mood]?.color || '#0ea5a4';
      ctx.fill();
    });

    // X labels (dates)
    ctx.fillStyle = '#666'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(data.length / 6));
    data.forEach((e, i) => {
      if (i % step === 0 || i === data.length - 1) {
        const x = pad.l + (i / (data.length - 1)) * cw;
        const d = new Date(e.date);
        ctx.fillText(`${d.getDate()}/${d.getMonth()+1}`, x, H - pad.b + 15);
      }
    });
  }

  function calcStreak() {
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (entries.find(e => e.date === key)) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  }

  /* ── Insights ── */
  function renderInsights() {
    const grid = $('#insights-grid');
    if (entries.length < 3) { grid.innerHTML = '<div class="empty-state">Enregistrez au moins 3 jours pour obtenir des insights 💡</div>'; return; }

    const insights = [];

    // 1. Most common mood
    const moodCounts = {};
    entries.forEach(e => { moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1; });
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
    insights.push({
      title: '🎯 Humeur dominante',
      body: `Votre humeur la plus fréquente est ${MOODS[topMood[0]]?.emoji} ${MOODS[topMood[0]]?.label} (${topMood[1]} fois sur ${entries.length} entrées).`
    });

    // 2. Best day of the week
    const dayAvg = {};
    entries.forEach(e => {
      const dow = (new Date(e.date).getDay() + 6) % 7;
      if (!dayAvg[dow]) dayAvg[dow] = { total: 0, count: 0 };
      dayAvg[dow].total += e.mood;
      dayAvg[dow].count++;
    });
    let bestDay = 0, bestAvg = 0;
    Object.entries(dayAvg).forEach(([d, v]) => {
      const avg = v.total / v.count;
      if (avg > bestAvg) { bestAvg = avg; bestDay = parseInt(d); }
    });
    insights.push({
      title: '📅 Meilleur jour',
      body: `${DAYS_FR[bestDay]} est votre meilleur jour de la semaine avec une moyenne de ${bestAvg.toFixed(1)}/5.`
    });

    // 3. Tag analysis
    const tagMoods = {};
    entries.forEach(e => {
      (e.tags || []).forEach(t => {
        if (!tagMoods[t]) tagMoods[t] = { total: 0, count: 0 };
        tagMoods[t].total += e.mood;
        tagMoods[t].count++;
      });
    });
    const sortedTags = Object.entries(tagMoods).sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count));
    if (sortedTags.length > 0) {
      const best = sortedTags[0];
      const worst = sortedTags[sortedTags.length - 1];
      insights.push({
        title: '🏷️ Activités & humeur',
        body: `"${best[0]}" est associé à votre meilleure humeur (moy. ${(best[1].total / best[1].count).toFixed(1)}).${sortedTags.length > 1 ? ` "${worst[0]}" est associé à la plus basse (moy. ${(worst[1].total / worst[1].count).toFixed(1)}).` : ''}`,
        tags: sortedTags.slice(0, 5).map(t => t[0])
      });
    }

    // 4. Overall average
    const overall = entries.reduce((s, e) => s + e.mood, 0) / entries.length;
    insights.push({
      title: '📊 Score global',
      body: `Votre humeur moyenne est de ${overall.toFixed(2)}/5 sur ${entries.length} entrées. ${overall >= 4 ? 'Excellent ! 🎉' : overall >= 3 ? 'Bien ! Continuez 💪' : 'Prenez soin de vous 💙'}`
    });

    // 5. Streak
    const streak = calcStreak();
    if (streak > 0) {
      insights.push({
        title: '🔥 Série active',
        body: `Vous avez une série de ${streak} jour${streak > 1 ? 's' : ''} consécutif${streak > 1 ? 's' : ''} d'enregistrement ! ${streak >= 7 ? 'Impressionnant ! 🏆' : 'Continuez ! 💪'}`
      });
    }

    grid.innerHTML = insights.map((ins, i) => `
      <div class="insight-card" style="animation-delay:${i * 80}ms">
        <div class="ic-title">${ins.title}</div>
        <div class="ic-body">${ins.body}</div>
        ${ins.tags ? `<div class="ic-tags">${ins.tags.map(t => `<span class="insight-tag">${t}</span>`).join('')}</div>` : ''}
      </div>`).join('');
  }

  /* ── Detail modal ── */
  function openDetail(entry) {
    detailEntry = entry;
    const d = new Date(entry.date);
    $('#detail-date').textContent = `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
    let html = `<div style="text-align:center;font-size:2.5rem;margin:.5rem 0">${MOODS[entry.mood]?.emoji}</div>
      <div style="text-align:center;color:${MOODS[entry.mood]?.color};font-weight:600;margin-bottom:.8rem">${MOODS[entry.mood]?.label}</div>`;
    if (entry.tags && entry.tags.length) {
      html += `<div style="margin-bottom:.6rem"><strong style="font-size:.78rem;color:var(--ez-text-dim)">Tags:</strong><br>${entry.tags.map(t => `<span class="insight-tag" style="margin:2px">${t}</span>`).join('')}</div>`;
    }
    if (entry.note) {
      html += `<div><strong style="font-size:.78rem;color:var(--ez-text-dim)">Note:</strong><p style="margin:.3rem 0;color:#ddd">${esc(entry.note)}</p></div>`;
    }
    $('#detail-body').innerHTML = html;
    $('#modal-detail').style.display = 'flex';
  }

  async function deleteEntry() {
    if (!detailEntry) return;
    entries = entries.filter(e => e.date !== detailEntry.date);
    await save('entries', entries);
    $('#modal-detail').style.display = 'none';
    detailEntry = null;
    renderCalendar();
    renderTrends();
    renderInsights();
    // If deleted today's entry, allow re-entry
    const todayKey = today();
    if (!entries.find(e => e.date === todayKey)) {
      selectedMood = 0; selectedTags = [];
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      $('#mood-label').textContent = '';
      $('#tags-section').style.display = 'none';
      $('#note-section').style.display = 'none';
      $('#today-saved').style.display = 'none';
      $('#mood-note').value = '';
      document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('selected'));
    }
  }

  /* ── Helpers ── */
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  /* ── Boot ── */
  init();
})();