(() => {
  'use strict';

  /* ── Storage ── */
  const APP   = window.ezgalaxy ? ezgalaxy.app : null;
  const STORE = window.ezgalaxy ? ezgalaxy.storage : null;

  async function loadPrivate(k, d) {
    try { if (STORE) { const v = await STORE.getData(k); return v ?? d; } } catch(_){}
    try { return JSON.parse(localStorage.getItem('tr_' + k)) || d; } catch(_){ return d; }
  }
  async function savePrivate(k, v) {
    try { if (STORE) return await STORE.setData(k, v); } catch(_){}
    localStorage.setItem('tr_' + k, JSON.stringify(v));
  }
  async function loadShared(k, d) {
    try { if (APP) { const v = await APP.getData(k); return v ?? d; } } catch(_){}
    try { return JSON.parse(localStorage.getItem('trs_' + k)) || d; } catch(_){ return d; }
  }
  async function saveShared(k, v) {
    try { if (APP) return await APP.setData(k, v); } catch(_){}
    localStorage.setItem('trs_' + k, JSON.stringify(v));
  }

  /* ── French texts corpus ── */
  const TEXTS = {
    easy: [
      "Le chat dort sur le canapé et rêve de souris. Il fait beau dehors et les oiseaux chantent dans les arbres. La vie est belle quand on prend le temps de regarder autour de soi.",
      "Le matin, je bois un café chaud et je lis le journal. Les nouvelles sont parfois bonnes et parfois mauvaises. Mais chaque jour est une nouvelle chance de faire mieux.",
      "La mer est calme ce soir. Les vagues caressent doucement le sable de la plage. Au loin, un bateau rentre au port avec sa cargaison de poissons frais.",
      "Dans le jardin, les fleurs commencent à pousser. Le printemps est enfin arrivé après un long hiver. Les enfants jouent dehors et rient aux éclats.",
      "Ma grand-mère fait les meilleurs gâteaux du monde. Sa recette de tarte aux pommes est un délice que toute la famille adore. Elle cuisine avec amour depuis toujours."
    ],
    medium: [
      "L'informatique a transformé notre façon de vivre et de travailler. Les ordinateurs sont devenus des outils indispensables dans presque tous les domaines d'activité. La programmation permet de créer des solutions innovantes pour résoudre des problèmes complexes.",
      "La photographie numérique a révolutionné l'art de capturer des moments précieux. Avec un simple téléphone, chacun peut désormais immortaliser les instants de sa vie quotidienne et les partager instantanément avec le monde entier.",
      "Les énergies renouvelables représentent l'avenir de notre planète. Le solaire, l'éolien et l'hydraulique offrent des alternatives durables aux combustibles fossiles. La transition énergétique est un défi majeur de notre époque.",
      "L'exploration spatiale continue de fasciner l'humanité depuis des décennies. Les missions vers Mars et au-delà repoussent les limites de notre connaissance. Chaque découverte ouvre de nouvelles questions sur notre place dans l'univers.",
      "La gastronomie française est reconnue dans le monde entier pour sa finesse et sa diversité. Chaque région possède ses spécialités culinaires héritées de traditions séculaires. Les chefs étoilés innovent constamment tout en respectant ce patrimoine."
    ],
    hard: [
      "L'intelligence artificielle suscite autant d'enthousiasme que d'interrogations philosophiques fondamentales. Les algorithmes d'apprentissage profond atteignent désormais des performances stupéfiantes dans la reconnaissance d'images, le traitement du langage naturel et la génération de contenu créatif.",
      "La mécanique quantique bouleverse notre compréhension intuitive de la réalité physique. Le principe de superposition et l'intrication quantique défient les lois de la logique classique. Ces phénomènes extraordinaires ouvrent la voie à des technologies révolutionnaires comme l'ordinateur quantique.",
      "La biodiversité constitue un patrimoine naturel irremplaçable dont la préservation nécessite une mobilisation internationale coordonnée. Les écosystèmes interconnectés forment un équilibre fragile que l'activité anthropique menace quotidiennement. La déforestation accélérée provoque l'extinction silencieuse de milliers d'espèces.",
      "L'architecture contemporaine transcende sa fonction utilitaire pour devenir une expression artistique à part entière. Les gratte-ciels emblématiques symbolisent l'ambition démesurée des métropoles mondiales tandis que l'architecture durable réconcilie esthétique et responsabilité environnementale.",
      "La cryptographie asymétrique repose sur des problèmes mathématiques considérés comme intrinsèquement difficiles à résoudre. L'algorithme RSA utilise la factorisation de grands nombres premiers, tandis que les courbes elliptiques offrent une sécurité équivalente avec des clés significativement plus courtes."
    ]
  };

  /* ── State ── */
  let history     = [];
  let leaderboard = [];
  let currentText = '';
  let charIndex   = 0;
  let errors      = 0;
  let totalTyped  = 0;
  let startTime   = 0;
  let timerHandle = 0;
  let running     = false;
  let finished    = false;

  /* ── DOM ── */
  const $ = s => document.querySelector(s);
  const display   = $('#text-display');
  const input     = $('#type-input');
  const btnStart  = $('#btn-start');
  const btnRestart= $('#btn-restart');
  const diffSel   = $('#difficulty');

  /* ── Init ── */
  async function init() {
    history     = await loadPrivate('history', []);
    leaderboard = await loadShared('leaderboard', []);
    bindEvents();
    renderHistory();
    renderLeaderboard();
    showReadyText();
  }

  function showReadyText() {
    display.innerHTML = '<span class="pending">Appuyez sur "Commencer" pour démarrer…</span>';
  }

  /* ── Events ── */
  function bindEvents() {
    btnStart.addEventListener('click', startRace);
    btnRestart.addEventListener('click', startRace);
    input.addEventListener('input', onType);
    input.addEventListener('keydown', e => { if (e.key === 'Tab') e.preventDefault(); });

    // Tabs
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const tab = t.dataset.tab;
      $('#view-history').style.display     = tab === 'history' ? '' : 'none';
      $('#view-leaderboard').style.display = tab === 'leaderboard' ? '' : 'none';
    }));
  }

  /* ── Start ── */
  function startRace() {
    const diff = diffSel.value;
    const pool = TEXTS[diff];
    currentText = pool[Math.floor(Math.random() * pool.length)];
    charIndex = 0; errors = 0; totalTyped = 0; startTime = 0;
    running = false; finished = false;
    input.value = '';
    input.disabled = false;
    input.focus();
    btnStart.style.display   = 'none';
    btnRestart.style.display = '';
    $('#result-panel').style.display = 'none';
    updateStats(0, 100, 0);
    $('#progress-fill').style.width = '0%';
    renderText();
    // Timer starts on first keystroke
  }

  /* ── Render text ── */
  function renderText() {
    let html = '';
    for (let i = 0; i < currentText.length; i++) {
      let cls = 'pending';
      if (i < charIndex) cls = 'correct';
      if (i === charIndex) cls = 'current';
      const ch = currentText[i] === ' ' ? '&nbsp;' : esc(currentText[i]);
      html += `<span class="char ${cls}">${ch}</span>`;
    }
    display.innerHTML = html;
  }

  /* ── Typing handler ── */
  function onType() {
    if (finished) return;
    if (!running) {
      running = true;
      startTime = Date.now();
      timerHandle = setInterval(tick, 200);
    }

    const typed = input.value;
    const lastChar = typed[typed.length - 1];

    // Compare last char typed with expected
    if (typed.length > 0) {
      totalTyped++;
      const expected = currentText[charIndex];
      if (lastChar === expected) {
        charIndex++;
      } else {
        errors++;
        // Mark wrong – we still advance
        markWrong(charIndex);
        charIndex++;
      }
      input.value = '';
    }

    // Update display
    renderTextWithErrors();

    const pct = Math.round(charIndex / currentText.length * 100);
    $('#progress-fill').style.width = pct + '%';

    const elapsed = (Date.now() - startTime) / 1000;
    const wpm = calcWPM(charIndex, elapsed);
    const acc = totalTyped ? Math.round(((totalTyped - errors) / totalTyped) * 100) : 100;
    updateStats(wpm, acc, Math.floor(elapsed));

    // Finished?
    if (charIndex >= currentText.length) {
      finishRace(wpm, acc, elapsed);
    }
  }

  let wrongChars = new Set();
  function markWrong(i) { wrongChars.add(i); }

  function renderTextWithErrors() {
    let html = '';
    for (let i = 0; i < currentText.length; i++) {
      let cls = 'pending';
      if (i < charIndex) cls = wrongChars.has(i) ? 'wrong' : 'correct';
      if (i === charIndex) cls = 'current';
      const ch = currentText[i] === ' ' ? '&nbsp;' : esc(currentText[i]);
      html += `<span class="char ${cls}">${ch}</span>`;
    }
    display.innerHTML = html;
  }

  /* ── Finish ── */
  async function finishRace(wpm, accuracy, elapsed) {
    finished = true;
    running  = false;
    clearInterval(timerHandle);
    input.disabled = true;
    wrongChars = new Set();

    const result = {
      wpm: Math.round(wpm),
      accuracy,
      time: Math.round(elapsed),
      chars: currentText.length,
      errors,
      difficulty: diffSel.value,
      date: Date.now()
    };

    history.unshift(result);
    if (history.length > 50) history = history.slice(0, 50);
    await savePrivate('history', history);

    // Leaderboard (keep top 20)
    leaderboard.push({ wpm: result.wpm, accuracy: result.accuracy, diff: result.difficulty, date: result.date });
    leaderboard.sort((a, b) => b.wpm - a.wpm);
    if (leaderboard.length > 20) leaderboard = leaderboard.slice(0, 20);
    await saveShared('leaderboard', leaderboard);

    showResults(result);
    renderHistory();
    renderLeaderboard();
  }

  /* ── Results ── */
  function showResults(r) {
    const panel = $('#result-panel');
    panel.style.display = '';
    panel.style.animation = 'pop .3s ease';
    const diffLabel = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };
    $('#result-grid').innerHTML = `
      <div class="r-item"><span>Vitesse</span><span class="r-val">${r.wpm} MPM</span></div>
      <div class="r-item"><span>Précision</span><span class="r-val">${r.accuracy}%</span></div>
      <div class="r-item"><span>Temps</span><span class="r-val">${r.time}s</span></div>
      <div class="r-item"><span>Caractères</span><span class="r-val">${r.chars}</span></div>
      <div class="r-item"><span>Erreurs</span><span class="r-val">${r.errors}</span></div>
      <div class="r-item"><span>Difficulté</span><span class="r-val">${diffLabel[r.difficulty]}</span></div>`;
    drawHistoryChart();
  }

  /* ── History chart (last 10 WPMs) ── */
  function drawHistoryChart() {
    const canvas = $('#history-chart');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const last = history.slice(0, 10).reverse();
    if (last.length < 2) return;

    const maxWPM = Math.max(...last.map(h => h.wpm), 10);
    const pad = { l: 40, r: 20, t: 20, b: 30 };
    const cw = W - pad.l - pad.r;
    const ch = H - pad.t - pad.b;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + ch * (1 - i / 4);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillStyle = '#666'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxWPM * i / 4), pad.l - 6, y + 4);
    }

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#0ea5a4';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    last.forEach((h, i) => {
      const x = pad.l + (i / (last.length - 1)) * cw;
      const y = pad.t + ch * (1 - h.wpm / maxWPM);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    last.forEach((h, i) => {
      const x = pad.l + (i / (last.length - 1)) * cw;
      const y = pad.t + ch * (1 - h.wpm / maxWPM);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0ea5a4';
      ctx.fill();
      ctx.fillStyle = '#aaa'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(h.wpm, x, y - 10);
    });
  }

  /* ── History list ── */
  function renderHistory() {
    const container = $('#view-history');
    if (!history.length) { container.innerHTML = '<div class="empty-state">Aucun historique. Lancez votre première course ! 🏎️</div>'; return; }
    const diffLabel = { easy: '🟢', medium: '🟡', hard: '🔴' };
    container.innerHTML = history.slice(0, 15).map((h, i) => `
      <div class="list-row" style="animation-delay:${i * 40}ms">
        <span>${diffLabel[h.difficulty] || ''} ${new Date(h.date).toLocaleDateString('fr')}</span>
        <span class="lr-wpm">${h.wpm} MPM</span>
        <span class="lr-acc">${h.accuracy}%</span>
        <span>${h.time}s</span>
      </div>`).join('');
  }

  /* ── Leaderboard ── */
  function renderLeaderboard() {
    const container = $('#view-leaderboard');
    if (!leaderboard.length) { container.innerHTML = '<div class="empty-state">Pas encore de scores. Soyez le premier ! 🏆</div>'; return; }
    const medals = ['🥇','🥈','🥉'];
    container.innerHTML = leaderboard.map((h, i) => `
      <div class="list-row" style="animation-delay:${i * 40}ms">
        <span class="lr-rank">${medals[i] || (i + 1)}</span>
        <span class="lr-wpm">${h.wpm} MPM</span>
        <span class="lr-acc">${h.accuracy}%</span>
        <span>${new Date(h.date).toLocaleDateString('fr')}</span>
      </div>`).join('');
  }

  /* ── Helpers ── */
  function calcWPM(chars, seconds) { return seconds > 0 ? (chars / 5) / (seconds / 60) : 0; }
  function updateStats(w, a, t) {
    $('#wpm').textContent      = Math.round(w);
    $('#accuracy').textContent  = a;
    $('#timer').textContent     = t;
    $('#chars-done').textContent = charIndex;
  }
  function tick() {
    if (!running) return;
    const el = Math.floor((Date.now() - startTime) / 1000);
    const wpm = calcWPM(charIndex, el);
    const acc = totalTyped ? Math.round(((totalTyped - errors) / totalTyped) * 100) : 100;
    updateStats(wpm, acc, el);
  }
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  /* ── Boot ── */
  init();
})();