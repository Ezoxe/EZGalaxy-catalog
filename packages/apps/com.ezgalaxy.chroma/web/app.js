(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ── Color utilities (vanilla, no chroma.js needed) ── */
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }

  function luminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  function contrastRatio(rgb1, rgb2) {
    const l1 = luminance(...rgb1);
    const l2 = luminance(...rgb2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function hslColor(h, s, l) {
    const rgb = hslToRgb(((h % 360) + 360) % 360, s, l);
    return rgbToHex(...rgb);
  }

  /* ── Harmony generators ── */
  function generateHarmony(h, s, l, type) {
    const base = { h, s, l, hex: hslColor(h, s, l) };
    switch (type) {
      case 'complementary':
        return [base.hex, hslColor(h + 180, s, l)];
      case 'triadic':
        return [base.hex, hslColor(h + 120, s, l), hslColor(h + 240, s, l)];
      case 'analogous':
        return [hslColor(h - 30, s, l), base.hex, hslColor(h + 30, s, l), hslColor(h + 60, s, l)];
      case 'split':
        return [base.hex, hslColor(h + 150, s, l), hslColor(h + 210, s, l)];
      case 'tetradic':
        return [base.hex, hslColor(h + 90, s, l), hslColor(h + 180, s, l), hslColor(h + 270, s, l)];
      case 'monochrome':
        return [hslColor(h, s, Math.max(10, l - 30)), hslColor(h, s, Math.max(10, l - 15)), base.hex, hslColor(h, s, Math.min(90, l + 15)), hslColor(h, s, Math.min(95, l + 30))];
      default:
        return [base.hex];
    }
  }

  /* ── State ── */
  const state = {
    h: 180, s: 70, l: 50,
    harmony: 'analogous',
    exportTab: 'css',
    savedPalettes: []
  };

  /* ── Persistence ── */
  async function loadPalettes() {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        const list = await ezgalaxy.storage.list('palettes', { limit: 50 });
        if (list && Array.isArray(list)) {
          state.savedPalettes = list.map(r => ({ id: r.key, ...r.data }));
        }
      }
    } catch (e) { console.warn('ChromaLab: load failed', e); }
  }

  async function savePalette(palette) {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        await ezgalaxy.storage.set('palettes', palette.id, palette);
      }
    } catch (e) { /* ignore */ }
  }

  async function deletePalette(id) {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        await ezgalaxy.storage.delete('palettes', id);
      }
    } catch (e) { /* ignore */ }
  }

  /* ── Render ── */
  function render() {
    const root = $('#app');
    const colors = generateHarmony(state.h, state.s, state.l, state.harmony);
    const baseHex = hslColor(state.h, state.s, state.l);
    const harmonies = [
      { key: 'complementary', label: 'Complémentaire' },
      { key: 'triadic', label: 'Triade' },
      { key: 'analogous', label: 'Analogue' },
      { key: 'split', label: 'Split' },
      { key: 'tetradic', label: 'Tétrade' },
      { key: 'monochrome', label: 'Monochrome' }
    ];

    // Contrast checks
    const white = [255, 255, 255];
    const black = [0, 0, 0];
    const contrastCards = colors.map(hex => {
      const rgb = hexToRgb(hex);
      const cw = contrastRatio(rgb, white);
      const cb = contrastRatio(rgb, black);
      return { hex, rgb, whiteRatio: cw, blackRatio: cb };
    });

    // Export
    let exportCode = '';
    if (state.exportTab === 'css') {
      exportCode = `:root {\n${colors.map((c, i) => `  --color-${i + 1}: ${c};`).join('\n')}\n}`;
    } else if (state.exportTab === 'json') {
      exportCode = JSON.stringify({ colors, harmony: state.harmony, base: baseHex }, null, 2);
    } else if (state.exportTab === 'hex') {
      exportCode = colors.join('\n');
    }

    root.innerHTML = `
      <div class="cl-header">
        <h1><span>🎨</span> ChromaLab</h1>
        <p>Créer des palettes de couleurs harmoniques</p>
      </div>

      <div class="cl-section">🎯 Couleur de base</div>
      <div class="ez-card cl-picker-section">
        <div class="cl-color-display" style="background:${baseHex}"></div>
        <div class="cl-sliders">
          <div class="cl-slider-row">
            <label>Teinte</label>
            <input type="range" min="0" max="359" value="${state.h}" data-slider="h" />
            <span class="val">${state.h}°</span>
          </div>
          <div class="cl-slider-row">
            <label>Saturation</label>
            <input type="range" min="0" max="100" value="${state.s}" data-slider="s" />
            <span class="val">${state.s}%</span>
          </div>
          <div class="cl-slider-row">
            <label>Luminosité</label>
            <input type="range" min="0" max="100" value="${state.l}" data-slider="l" />
            <span class="val">${state.l}%</span>
          </div>
        </div>
        <div class="cl-hex-row">
          <input type="text" id="cl-hex-input" value="${baseHex}" maxlength="7" />
          <button class="ez-btn" data-action="random" style="font-size:.8rem">🎲 Aléatoire</button>
        </div>
      </div>

      <div class="cl-section">🔗 Harmonie</div>
      <div class="cl-harmony">
        ${harmonies.map(h => `<button class="${state.harmony === h.key ? 'active' : ''}" data-harmony="${h.key}">${h.label}</button>`).join('')}
      </div>

      <div class="cl-section">🎨 Palette</div>
      <div class="cl-palette">
        ${colors.map(c => `<div class="cl-palette-swatch" style="background:${c}" data-copy="${c}"><span class="hex">${c}</span></div>`).join('')}
      </div>

      <div class="cl-save-row">
        <input type="text" id="cl-palette-name" placeholder="Nom de la palette" maxlength="40" />
        <button class="ez-btn ez-btn--primary" data-action="save" style="white-space:nowrap">💾 Enregistrer</button>
      </div>

      <div class="cl-section">🔍 Contraste WCAG</div>
      <div class="ez-card cl-contrast" style="margin-bottom:16px">
        <div class="cl-contrast-grid">
          ${contrastCards.map(c => `
            <div class="cl-contrast-card">
              <div style="width:100%;height:24px;border-radius:6px;background:${c.hex};margin-bottom:6px"></div>
              <div style="font-size:.72rem;color:var(--ez-muted);margin-bottom:4px">${c.hex}</div>
              <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
                <div>
                  <div style="font-size:.65rem;color:var(--ez-muted)">sur blanc</div>
                  <div class="ratio" style="font-size:1rem">${c.whiteRatio.toFixed(1)}:1</div>
                  <div class="badges">
                    <span class="cl-badge ${c.whiteRatio >= 4.5 ? 'pass' : 'fail'}">AA ${c.whiteRatio >= 4.5 ? '✓' : '✗'}</span>
                    <span class="cl-badge ${c.whiteRatio >= 7 ? 'pass' : 'fail'}">AAA ${c.whiteRatio >= 7 ? '✓' : '✗'}</span>
                  </div>
                </div>
                <div>
                  <div style="font-size:.65rem;color:var(--ez-muted)">sur noir</div>
                  <div class="ratio" style="font-size:1rem">${c.blackRatio.toFixed(1)}:1</div>
                  <div class="badges">
                    <span class="cl-badge ${c.blackRatio >= 4.5 ? 'pass' : 'fail'}">AA ${c.blackRatio >= 4.5 ? '✓' : '✗'}</span>
                    <span class="cl-badge ${c.blackRatio >= 7 ? 'pass' : 'fail'}">AAA ${c.blackRatio >= 7 ? '✓' : '✗'}</span>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="cl-section">📦 Export</div>
      <div class="ez-card cl-export" style="margin-bottom:16px">
        <div class="cl-export-tabs">
          <button class="cl-export-tab ${state.exportTab === 'css' ? 'active' : ''}" data-export="css">CSS Variables</button>
          <button class="cl-export-tab ${state.exportTab === 'json' ? 'active' : ''}" data-export="json">JSON</button>
          <button class="cl-export-tab ${state.exportTab === 'hex' ? 'active' : ''}" data-export="hex">HEX</button>
        </div>
        <pre>${exportCode}</pre>
        <button class="ez-btn" data-action="copy-export" style="margin-top:8px;font-size:.8rem;width:100%">📋 Copier</button>
      </div>

      ${state.savedPalettes.length > 0 ? `
        <div class="cl-section">⭐ Palettes sauvegardées</div>
        <div class="cl-saved-list">
          ${state.savedPalettes.map(p => `
            <div class="cl-saved-item" data-loadpalette="${p.id}">
              <span class="cl-saved-name">${p.name || 'Sans nom'}</span>
              <div class="cl-saved-colors">${(p.colors || []).map(c => `<div style="background:${c}"></div>`).join('')}</div>
              <button class="cl-saved-del" data-delpalette="${p.id}">✕</button>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    bindEvents();
  }

  function updateLive() {
    const baseHex = hslColor(state.h, state.s, state.l);
    const colors = generateHarmony(state.h, state.s, state.l, state.harmony);
    const display = $('.cl-color-display');
    if (display) display.style.background = baseHex;
    const hexInput = $('#cl-hex-input');
    if (hexInput) hexInput.value = baseHex;
    const swatches = $$('.cl-palette-swatch');
    colors.forEach((c, i) => {
      if (swatches[i]) {
        swatches[i].style.background = c;
        swatches[i].dataset.copy = c;
        const hexLabel = swatches[i].querySelector('.hex');
        if (hexLabel) hexLabel.textContent = c;
      }
    });
  }

  /* ── Events ── */
  function bindEvents() {
    $$('[data-slider]').forEach(s => {
      s.addEventListener('input', () => {
        state[s.dataset.slider] = parseInt(s.value, 10);
        const valEl = s.parentElement.querySelector('.val');
        if (valEl) valEl.textContent = s.value + (s.dataset.slider === 'h' ? '°' : '%');
        updateLive();
      });
      s.addEventListener('change', render);
    });

    const hexInput = $('#cl-hex-input');
    if (hexInput) hexInput.addEventListener('change', () => {
      let v = hexInput.value.trim();
      if (!v.startsWith('#')) v = '#' + v;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        const [h, s, l] = rgbToHsl(...hexToRgb(v));
        state.h = h; state.s = s; state.l = l;
        render();
      }
    });

    $$('[data-harmony]').forEach(b => b.addEventListener('click', () => {
      state.harmony = b.dataset.harmony;
      render();
    }));

    $$('[data-copy]').forEach(s => s.addEventListener('click', () => {
      navigator.clipboard.writeText(s.dataset.copy).catch(() => {});
      const existing = s.querySelector('.cl-copied');
      if (existing) existing.remove();
      const el = document.createElement('div');
      el.className = 'cl-copied';
      el.textContent = 'Copié !';
      s.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    }));

    $$('[data-export]').forEach(b => b.addEventListener('click', () => {
      state.exportTab = b.dataset.export;
      render();
    }));

    $$('[data-action]').forEach(b => b.addEventListener('click', () => {
      switch (b.dataset.action) {
        case 'random':
          state.h = Math.floor(Math.random() * 360);
          state.s = 40 + Math.floor(Math.random() * 50);
          state.l = 35 + Math.floor(Math.random() * 35);
          render();
          break;
        case 'save': {
          const nameEl = $('#cl-palette-name');
          const name = nameEl ? nameEl.value.trim() || 'Palette' : 'Palette';
          const colors = generateHarmony(state.h, state.s, state.l, state.harmony);
          const palette = { id: genId(), name, colors, harmony: state.harmony, createdAt: new Date().toISOString() };
          state.savedPalettes.push(palette);
          savePalette(palette);
          render();
          break;
        }
        case 'copy-export': {
          const pre = $('.cl-export pre');
          if (pre) navigator.clipboard.writeText(pre.textContent).catch(() => {});
          break;
        }
      }
    }));

    $$('[data-loadpalette]').forEach(el => el.addEventListener('click', (e) => {
      if (e.target.dataset.delpalette) return;
      const p = state.savedPalettes.find(p => p.id === el.dataset.loadpalette);
      if (p && p.colors && p.colors.length > 0) {
        const [h, s, l] = rgbToHsl(...hexToRgb(p.colors[0]));
        state.h = h; state.s = s; state.l = l;
        if (p.harmony) state.harmony = p.harmony;
        render();
      }
    }));

    $$('[data-delpalette]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = b.dataset.delpalette;
      state.savedPalettes = state.savedPalettes.filter(p => p.id !== id);
      deletePalette(id);
      render();
    }));
  }

  /* ── Init ── */
  async function init() {
    await loadPalettes();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
