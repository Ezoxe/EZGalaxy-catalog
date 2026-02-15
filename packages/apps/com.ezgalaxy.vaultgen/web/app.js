(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const CHARSETS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    digits: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };

  const FRENCH_WORDS = [
    'soleil','montagne','riviere','drapeau','chanson','voyage','amour','jardin','papillon','etoile',
    'chateau','nuage','ocean','musique','histoire','lumiere','silence','aventure','horizon','cascade',
    'diamant','forteresse','mystere','phoenix','tonnerre','aurore','cosmos','enigme','flamme','glacier',
    'harmonie','infini','joyau','kaleidoscope','labyrinthe','meridien','nectar','oasis','paradis','quartz',
    'refuge','saphir','tempete','univers','velours','zenith','archipel','brume','cristal','delta'
  ];

  const state = {
    mode: 'password',  // password | passphrase
    length: 20,
    upper: true,
    lower: true,
    digits: true,
    symbols: true,
    exclude: '',
    wordCount: 4,
    separator: '-',
    password: '',
    history: []
  };

  /* ── Crypto-safe random ── */
  function secureRandom(max) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  }

  function generatePassword() {
    let charset = '';
    if (state.upper) charset += CHARSETS.upper;
    if (state.lower) charset += CHARSETS.lower;
    if (state.digits) charset += CHARSETS.digits;
    if (state.symbols) charset += CHARSETS.symbols;

    // Remove excluded chars
    if (state.exclude) {
      const excluded = new Set(state.exclude.split(''));
      charset = charset.split('').filter(c => !excluded.has(c)).join('');
    }

    if (charset.length === 0) charset = CHARSETS.lower;

    let pw = '';
    for (let i = 0; i < state.length; i++) {
      pw += charset[secureRandom(charset.length)];
    }
    return pw;
  }

  function generatePassphrase() {
    const words = [];
    for (let i = 0; i < state.wordCount; i++) {
      const word = FRENCH_WORDS[secureRandom(FRENCH_WORDS.length)];
      // Capitalize first letter
      words.push(word.charAt(0).toUpperCase() + word.slice(1));
    }
    return words.join(state.separator);
  }

  function generate() {
    state.password = state.mode === 'passphrase' ? generatePassphrase() : generatePassword();
    if (state.history.length >= 10) state.history.pop();
    state.history.unshift(state.password);
    render();
  }

  /* ── Strength evaluation ── */
  function evaluateStrength(pw) {
    if (!pw) return { score: 0, label: '—', color: 'var(--ez-muted)', bits: 0 };

    let poolSize = 0;
    if (/[a-z]/.test(pw)) poolSize += 26;
    if (/[A-Z]/.test(pw)) poolSize += 26;
    if (/[0-9]/.test(pw)) poolSize += 10;
    if (/[^a-zA-Z0-9]/.test(pw)) poolSize += 33;

    const bits = Math.round(pw.length * Math.log2(Math.max(2, poolSize)));
    let score, label, color;

    if (bits < 30) { score = 10; label = 'Très faible'; color = '#ef4444'; }
    else if (bits < 50) { score = 30; label = 'Faible'; color = '#f59e0b'; }
    else if (bits < 70) { score = 55; label = 'Moyen'; color = '#f59e0b'; }
    else if (bits < 100) { score = 75; label = 'Fort'; color = '#22c55e'; }
    else { score = 95; label = 'Très fort'; color = '#3b82f6'; }

    return { score, label, color, bits };
  }

  function colorizePassword(pw) {
    return pw.split('').map(c => {
      if (/[A-Z]/.test(c)) return `<span class="upper">${c}</span>`;
      if (/[0-9]/.test(c)) return `<span class="digit">${c}</span>`;
      if (/[^a-zA-Z0-9]/.test(c)) return `<span class="symbol">${c}</span>`;
      return `<span class="lower">${c}</span>`;
    }).join('');
  }

  /* ── Persistence ── */
  async function loadSettings() {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        const res = await ezgalaxy.storage.get('settings', 'config');
        if (res && res.data) {
          Object.assign(state, res.data);
          state.history = [];
          state.password = '';
        }
      }
    } catch (e) { /* ignore */ }
  }

  async function saveSettings() {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        const { password, history, ...settings } = state;
        await ezgalaxy.storage.set('settings', 'config', settings);
      }
    } catch (e) { /* ignore */ }
  }

  /* ── Render ── */
  function render() {
    const root = $('#app');
    const strength = evaluateStrength(state.password);

    root.innerHTML = `
      <div class="vg-header">
        <h1><span>🔑</span> VaultGen</h1>
        <p>Générateur de mots de passe sécurisé</p>
      </div>

      <div class="vg-password-box">
        <div class="vg-password">${state.password ? colorizePassword(state.password) : '<span style="color:var(--ez-muted)">Cliquez sur Générer</span>'}</div>
        <button class="vg-copy-btn" data-action="copy" title="Copier">📋</button>
      </div>

      ${state.password ? `
        <div class="vg-strength">
          <div class="vg-strength-bar"><div class="fill" style="width:${strength.score}%;background:${strength.color}"></div></div>
          <div class="vg-strength-info">
            <span class="vg-strength-label" style="color:${strength.color}">${strength.label}</span>
            <span class="vg-strength-bits">${strength.bits} bits d'entropie</span>
          </div>
        </div>
      ` : ''}

      <div class="vg-mode-tabs">
        <div class="vg-mode-tab ${state.mode === 'password' ? 'active' : ''}" data-mode="password">🔐 Mot de passe</div>
        <div class="vg-mode-tab ${state.mode === 'passphrase' ? 'active' : ''}" data-mode="passphrase">📝 Passphrase</div>
      </div>

      <div class="ez-card vg-controls">
        ${state.mode === 'password' ? `
          <div class="vg-slider-row">
            <label>Longueur</label>
            <input type="range" min="4" max="128" value="${state.length}" data-slider="length" />
            <span class="val">${state.length}</span>
          </div>

          <div class="vg-toggle-row">
            <label>ABC Majuscules</label>
            <div class="vg-toggle"><input type="checkbox" ${state.upper ? 'checked' : ''} data-toggle="upper" /><span class="slider"></span></div>
          </div>
          <div class="vg-toggle-row">
            <label>abc Minuscules</label>
            <div class="vg-toggle"><input type="checkbox" ${state.lower ? 'checked' : ''} data-toggle="lower" /><span class="slider"></span></div>
          </div>
          <div class="vg-toggle-row">
            <label>123 Chiffres</label>
            <div class="vg-toggle"><input type="checkbox" ${state.digits ? 'checked' : ''} data-toggle="digits" /><span class="slider"></span></div>
          </div>
          <div class="vg-toggle-row">
            <label>!@# Symboles</label>
            <div class="vg-toggle"><input type="checkbox" ${state.symbols ? 'checked' : ''} data-toggle="symbols" /><span class="slider"></span></div>
          </div>

          <div class="vg-exclude-row">
            <label>Exclure</label>
            <input type="text" id="vg-exclude" value="${state.exclude}" placeholder="Caractères à exclure" />
          </div>
        ` : `
          <div class="vg-slider-row">
            <label>Mots</label>
            <input type="range" min="2" max="8" value="${state.wordCount}" data-slider="wordCount" />
            <span class="val">${state.wordCount}</span>
          </div>
          <div class="vg-exclude-row">
            <label>Séparateur</label>
            <input type="text" id="vg-separator" value="${state.separator}" maxlength="3" placeholder="-" style="width:60px;flex:none" />
          </div>
        `}
      </div>

      <div class="vg-actions">
        <button class="vg-btn-generate" data-action="generate">🎲 Générer</button>
        <button class="vg-btn-copy" data-action="copy">📋 Copier</button>
      </div>

      ${state.history.length > 0 ? `
        <div class="vg-history">
          <h3 style="font-size:.85rem;margin:0 0 8px;color:var(--ez-muted)">📜 Historique de session</h3>
          ${state.history.map(pw => `
            <div class="vg-history-item">
              <span class="pw">${pw}</span>
              <button data-copypw="${pw}" title="Copier">📋</button>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    bindEvents();
  }

  /* ── Events ── */
  function bindEvents() {
    $$('[data-mode]').forEach(t => t.addEventListener('click', () => {
      state.mode = t.dataset.mode;
      generate();
    }));

    $$('[data-slider]').forEach(s => {
      s.addEventListener('input', () => {
        state[s.dataset.slider] = parseInt(s.value, 10);
        const valEl = s.parentElement.querySelector('.val');
        if (valEl) valEl.textContent = s.value;
      });
      s.addEventListener('change', () => { saveSettings(); generate(); });
    });

    $$('[data-toggle]').forEach(t => {
      const input = t;
      input.addEventListener('change', () => {
        state[input.dataset.toggle] = input.checked;
        saveSettings();
        generate();
      });
    });

    const excludeInput = $('#vg-exclude');
    if (excludeInput) excludeInput.addEventListener('change', () => {
      state.exclude = excludeInput.value;
      saveSettings();
    });

    const sepInput = $('#vg-separator');
    if (sepInput) sepInput.addEventListener('change', () => {
      state.separator = sepInput.value;
      saveSettings();
    });

    $$('[data-action]').forEach(b => b.addEventListener('click', () => {
      switch (b.dataset.action) {
        case 'generate': generate(); break;
        case 'copy':
          if (state.password) {
            navigator.clipboard.writeText(state.password).catch(() => {});
            const copyBtn = $('.vg-copy-btn');
            if (copyBtn) {
              copyBtn.classList.add('copied');
              copyBtn.textContent = '✓';
              setTimeout(() => { copyBtn.classList.remove('copied'); copyBtn.textContent = '📋'; }, 1500);
            }
          }
          break;
      }
    }));

    $$('[data-copypw]').forEach(b => b.addEventListener('click', () => {
      navigator.clipboard.writeText(b.dataset.copypw).catch(() => {});
      b.textContent = '✓';
      setTimeout(() => { b.textContent = '📋'; }, 1000);
    }));
  }

  /* ── Init ── */
  async function init() {
    await loadSettings();
    generate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
