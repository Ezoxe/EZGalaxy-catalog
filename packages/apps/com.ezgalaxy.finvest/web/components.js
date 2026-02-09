/* ================================================================
   FinVest — components.js  (Reusable UI Component Library)
   DOM-based component system — zero framework dependency.
   Exposes: window.UI
   ================================================================ */
(() => {
  'use strict';

  /* ---------- DOM helpers ------------------------------------- */
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') node.className = v;
      else if (k === 'innerHTML') node.innerHTML = v;
      else if (k === 'textContent') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'style' && typeof v === 'object') {
        Object.assign(node.style, v);
      } else if (k === 'dataset' && typeof v === 'object') {
        Object.assign(node.dataset, v);
      } else {
        node.setAttribute(k, v);
      }
    }
    for (const child of (Array.isArray(children) ? children : [children])) {
      if (child == null) continue;
      if (typeof child === 'string' || typeof child === 'number') {
        node.appendChild(document.createTextNode(String(child)));
      } else {
        node.appendChild(child);
      }
    }
    return node;
  }

  /* ---------- SVG Icons --------------------------------------- */
  const ICONS = {
    'chart-bar': '<path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8" rx="1"/><rect x="14" y="6" width="3" height="12" rx="1"/>',
    'wallet': '<path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><circle cx="18" cy="14" r="1"/>',
    'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    'alert': '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    'piggy-bank': '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2"/><path d="M2 9.5a.5.5 0 11-1 0 .5.5 0 011 0z"/>',
    'home': '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    'briefcase': '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>',
    'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
    'cloud': '<path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/>',
    'download': '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    'upload': '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    'check': '<polyline points="20 6 9 17 4 12"/>',
    'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    'info': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    'lock': '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
    'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    'minus': '<line x1="5" y1="12" x2="19" y2="12"/>',
    'edit': '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    'trash': '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>',
    'refresh': '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
    'user': '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    'logout': '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    'login': '<path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
    'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
    'chevron-left': '<polyline points="15 18 9 12 15 6"/>',
    'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
    'menu': '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    'pie-chart': '<path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/>',
    'activity': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    'dollar-sign': '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>',
    'percent': '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    'bar-chart-2': '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    'layers': '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    'sparkles': '<path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5L5 19z"/><path d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5L19 3z"/>',
    'clipboard': '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>',
    'newspaper': '<path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8z"/>',
    'external-link': '<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    'rss': '<path d="M4 11a9 9 0 019 9"/><path d="M4 4a16 16 0 0116 16"/><circle cx="5" cy="19" r="1"/>',
    'globe': '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>',
    'book': '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
    'award': '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
    'share': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
    'palette': '<circle cx="13.5" cy="6.5" r="0.5"/><circle cx="17.5" cy="10.5" r="0.5"/><circle cx="8.5" cy="7.5" r="0.5"/><circle cx="6.5" cy="12" r="0.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.8 1.5-1.5 0-.39-.15-.74-.39-1.04-.24-.3-.39-.65-.39-1.04 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.96-4.5-9-10-9z"/>',
    'compass': '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
    'flag': '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
    'calendar': '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    'bell': '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
    'message': '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
    'sun': '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    'moon': '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>'
  };

  function icon(name, size = 20) {
    const svg = ICONS[name];
    if (!svg) return el('span', { textContent: '?' });
    const span = el('span', {
      className: 'icon',
      innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svg}</svg>`
    });
    return span;
  }

  /* ---------- Toast ------------------------------------------- */
  let toastContainer = null;

  function toast(message, type = 'info', duration = 3500) {
    if (!toastContainer) {
      toastContainer = el('div', { className: 'toast-container' });
      document.body.appendChild(toastContainer);
    }
    const colors = { info: 'var(--ez-primary)', success: 'var(--ez-success)', error: 'var(--ez-danger)', warning: 'var(--ez-warning)' };
    const icons = { info: 'info', success: 'check', error: 'alert', warning: 'alert' };
    const t = el('div', { className: 'toast ez-pop', style: { borderLeftColor: colors[type] || colors.info } }, [
      icon(icons[type] || 'info', 18),
      el('span', { textContent: message })
    ]);
    toastContainer.appendChild(t);
    setTimeout(() => { t.classList.add('toast--hide'); setTimeout(() => t.remove(), 300); }, duration);
  }

  /* ---------- Modal ------------------------------------------- */
  function modal({ title, body, actions = [], onClose }) {
    const overlay = el('div', { className: 'modal-overlay ez-fade-in' });
    const content = el('div', { className: 'modal-content ez-pop' }, [
      el('div', { className: 'modal-header' }, [
        el('h3', { textContent: title }),
        el('button', { className: 'modal-close', onClick: close }, [icon('x', 18)])
      ]),
      el('div', { className: 'modal-body' }, Array.isArray(body) ? body : [body]),
      actions.length ? el('div', { className: 'modal-actions' }, actions) : null
    ].filter(Boolean));
    overlay.appendChild(content);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);

    function close() {
      overlay.classList.add('modal-overlay--hide');
      setTimeout(() => { overlay.remove(); if (onClose) onClose(); }, 250);
    }
    return { close, overlay, content };
  }

  /* ---------- Score Gauge (half-circle SVG) ------------------- */
  function scoreGauge(score, label = 'Score', maxScore = 100) {
    const pct = Math.max(0, Math.min(100, (score / maxScore) * 100));
    const color = pct >= 75 ? 'var(--ez-success)' : pct >= 50 ? 'var(--ez-warning)' : 'var(--ez-danger)';
    const radius = 80;
    const circ = Math.PI * radius;
    const offset = circ - (pct / 100) * circ;

    const container = el('div', { className: 'gauge-container' });
    container.innerHTML = `
      <svg viewBox="0 0 200 120" class="gauge-svg">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="14" stroke-linecap="round"/>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"
              stroke-dasharray="${circ}" stroke-dashoffset="${offset}" class="gauge-arc"/>
      </svg>
      <div class="gauge-value" style="color:${color}">${score}</div>
      <div class="gauge-label">${label}</div>
    `;
    return container;
  }

  /* ---------- Progress Ring ----------------------------------- */
  function progressRing(value, max, color, label, size = 80) {
    const pct = max > 0 ? Math.min(1, value / max) : 0;
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - pct * circ;
    const c = el('div', { className: 'progress-ring' });
    c.innerHTML = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="6"
                stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"
                transform="rotate(-90 ${size / 2} ${size / 2})" class="ring-arc"/>
      </svg>
      <div class="ring-label">${Math.round(pct * 100)}%</div>
      ${label ? `<div class="ring-text">${label}</div>` : ''}
    `;
    return c;
  }

  /* ---------- Stat Card --------------------------------------- */
  function statCard({ title, value, subtitle, iconName, color, trend }) {
    const trendEl = trend != null ? el('span', {
      className: `stat-trend ${trend >= 0 ? 'stat-trend--up' : 'stat-trend--down'}`,
      textContent: `${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend)}%`
    }) : null;

    return el('div', { className: 'stat-card ez-fade-in' }, [
      el('div', { className: 'stat-card__header' }, [
        el('div', { className: 'stat-card__icon', style: { color: color || 'var(--ez-primary)' } }, [icon(iconName || 'chart-bar', 22)]),
        trendEl
      ].filter(Boolean)),
      el('div', { className: 'stat-card__value', style: { color: color || 'var(--ez-text)' } }, [value]),
      el('div', { className: 'stat-card__title' }, [title]),
      subtitle ? el('div', { className: 'stat-card__sub' }, [subtitle]) : null
    ].filter(Boolean));
  }

  /* ---------- Step Indicator ---------------------------------- */
  function stepIndicator(steps, current) {
    return el('div', { className: 'steps' }, steps.map((s, i) => {
      const cls = i < current ? 'step step--done' : i === current ? 'step step--active' : 'step';
      return el('div', { className: cls }, [
        el('div', { className: 'step__circle' }, [i < current ? icon('check', 14) : String(i + 1)]),
        el('div', { className: 'step__label' }, [s])
      ]);
    }));
  }

  /* ---------- Question Card ----------------------------------- */
  function questionCard({ id, label, hint, type, options, value, min, max, step, unit, onChange }) {
    const card = el('div', { className: 'question-card ez-fade-in' });

    const labelEl = el('label', { className: 'question-label', textContent: label });
    if (hint) {
      labelEl.appendChild(el('span', { className: 'question-hint', textContent: ` ${hint}` }));
    }
    card.appendChild(labelEl);

    switch (type) {
      case 'number': {
        const wrap = el('div', { className: 'input-group' });
        const input = el('input', {
          type: 'number', className: 'input', value: value || '',
          min: min || 0, max: max || 999999999, step: step || 1,
          placeholder: '0'
        });
        input.addEventListener('input', () => onChange(parseFloat(input.value) || 0));
        wrap.appendChild(input);
        if (unit) wrap.appendChild(el('span', { className: 'input-unit', textContent: unit }));
        card.appendChild(wrap);
        break;
      }
      case 'slider': {
        const display = el('span', { className: 'slider-value', textContent: value || min || 0 });
        const slider = el('input', {
          type: 'range', className: 'slider',
          min: min || 0, max: max || 100, step: step || 1, value: value || min || 0
        });
        slider.addEventListener('input', () => {
          display.textContent = slider.value;
          onChange(parseInt(slider.value));
        });
        card.appendChild(el('div', { className: 'slider-wrap' }, [slider, display]));
        break;
      }
      case 'select': {
        const select = el('select', { className: 'select' });
        for (const opt of (options || [])) {
          const o = el('option', { value: opt.value, textContent: opt.label });
          if (opt.value === value) o.selected = true;
          select.appendChild(o);
        }
        select.addEventListener('change', () => onChange(select.value));
        card.appendChild(select);
        break;
      }
      case 'radio': {
        const group = el('div', { className: 'radio-group' });
        for (const opt of (options || [])) {
          const radio = el('label', { className: `radio-option ${opt.value == value ? 'radio-option--selected' : ''}` }, [
            el('input', { type: 'radio', name: id, value: opt.value, ...(opt.value == value ? { checked: 'checked' } : {}) }),
            el('span', { className: 'radio-label' }, [opt.label])
          ]);
          radio.querySelector('input').addEventListener('change', (e) => {
            group.querySelectorAll('.radio-option').forEach(r => r.classList.remove('radio-option--selected'));
            radio.classList.add('radio-option--selected');
            onChange(isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value));
          });
          group.appendChild(radio);
        }
        card.appendChild(group);
        break;
      }
      case 'text': {
        const input = el('input', { type: 'text', className: 'input', value: value || '', placeholder: hint || '' });
        input.addEventListener('input', () => onChange(input.value));
        card.appendChild(input);
        break;
      }
    }
    return card;
  }

  /* ---------- Advice Card ------------------------------------- */
  function adviceCard(advice) {
    const catColors = { urgent: 'var(--ez-danger)', important: 'var(--ez-warning)', optimization: 'var(--ez-success)', personal: 'var(--accent-purple, #8b5cf6)' };
    const catLabels = { urgent: '🔴 Urgent', important: '🟡 Important', optimization: '🟢 Optimisation', personal: '🟣 Personnalisé' };
    return el('div', { className: `advice-card advice-card--${advice.category}`, style: { borderLeftColor: catColors[advice.category] } }, [
      el('div', { className: 'advice-card__header' }, [
        icon(advice.icon || 'info', 20),
        el('span', { className: 'advice-card__cat', textContent: catLabels[advice.category] || advice.category }),
      ]),
      el('h4', { className: 'advice-card__title', textContent: advice.title }),
      el('p', { className: 'advice-card__desc', textContent: advice.description }),
      advice.action ? el('div', { className: 'advice-card__action' }, [
        icon('chevron-right', 16),
        el('span', { textContent: advice.action })
      ]) : null,
      advice.impact ? el('div', { className: 'advice-card__impact' }, [
        icon('zap', 14),
        el('span', { textContent: `Impact : ${advice.impact}` })
      ]) : null
    ].filter(Boolean));
  }

  /* ---------- Allocation Bar ---------------------------------- */
  function allocationBar(details) {
    const bar = el('div', { className: 'alloc-bar' });
    for (const d of details) {
      if (d.pct <= 0) continue;
      const seg = el('div', {
        className: 'alloc-bar__seg',
        style: { width: `${d.pct}%`, background: d.color },
        title: `${d.label}: ${d.pct.toFixed(1)}%`
      });
      bar.appendChild(seg);
    }
    return el('div', { className: 'alloc-bar-wrap' }, [
      bar,
      el('div', { className: 'alloc-legend' }, details.filter(d => d.pct > 0).map(d =>
        el('span', { className: 'alloc-legend__item' }, [
          el('span', { className: 'alloc-dot', style: { background: d.color } }),
          el('span', { textContent: `${d.label} ${d.pct.toFixed(1)}%` })
        ])
      ))
    ]);
  }

  /* ---------- Data Table -------------------------------------- */
  function dataTable(headers, rows) {
    const table = el('table', { className: 'data-table' });
    const thead = el('thead', {}, [
      el('tr', {}, headers.map(h => el('th', { textContent: typeof h === 'string' ? h : h.label })))
    ]);
    const tbody = el('tbody', {}, rows.map(row =>
      el('tr', {}, row.map((cell, i) =>
        el('td', typeof cell === 'object' ? cell : { textContent: cell })
      ))
    ));
    table.appendChild(thead);
    table.appendChild(tbody);
    return el('div', { className: 'table-wrap' }, [table]);
  }

  /* ---------- Tabs -------------------------------------------- */
  function tabs(items, active, onChange) {
    const bar = el('div', { className: 'tabs' });
    for (const item of items) {
      const btn = el('button', {
        className: `tab ${item.key === active ? 'tab--active' : ''}`,
        onClick: () => onChange(item.key)
      }, [item.icon ? icon(item.icon, 16) : null, el('span', { textContent: item.label })].filter(Boolean));
      bar.appendChild(btn);
    }
    return bar;
  }

  /* ---------- Formatters -------------------------------------- */
  function formatCurrency(n) {
    if (n == null || isNaN(n)) return '0 €';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  }

  function formatPercent(n) {
    if (n == null || isNaN(n)) return '0%';
    return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
  }

  function formatNumber(n) {
    if (n == null || isNaN(n)) return '0';
    return new Intl.NumberFormat('fr-FR').format(Math.round(n));
  }

  function formatYears(n) {
    if (n === Infinity || n == null) return '∞';
    if (n < 12) return `${n} mois`;
    const y = Math.floor(n / 12);
    const m = n % 12;
    return m > 0 ? `${y} an${y > 1 ? 's' : ''} ${m} mois` : `${y} an${y > 1 ? 's' : ''}`;
  }

  /* ---------- ECharts helpers --------------------------------- */
  function initChart(container, options) {
    if (!window.echarts) { console.warn('ECharts not loaded'); return null; }
    const chart = echarts.init(container, null, { renderer: 'canvas' });
    chart.setOption(options);
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(container);
    container._chart = chart;
    container._ro = ro;
    return chart;
  }

  function destroyChart(container) {
    if (container._chart) { container._chart.dispose(); container._chart = null; }
    if (container._ro) { container._ro.disconnect(); container._ro = null; }
  }

  /* ---------- PUBLIC API -------------------------------------- */
  window.UI = {
    el, icon, toast, modal,
    scoreGauge, progressRing, statCard, stepIndicator,
    questionCard, adviceCard, allocationBar,
    dataTable, tabs,
    formatCurrency, formatPercent, formatNumber, formatYears,
    initChart, destroyChart
  };
})();
