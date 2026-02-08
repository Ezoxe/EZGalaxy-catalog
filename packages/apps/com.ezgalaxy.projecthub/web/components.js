/* ═══════════════════════════════════════════════════════════════
   Project Hub — UI Components Library
   v2.0.0 — Enhanced components with animations + smart features
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const t = (k, p) => Store.t(k, p);

  /* ── DOM Factory ────────────────────────────────────────── */
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'className') node.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset' && typeof v === 'object') Object.entries(v).forEach(([dk, dv]) => { node.dataset[dk] = dv; });
      else if (k === 'innerHTML') node.innerHTML = v;
      else node.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      if (typeof c === 'string' || typeof c === 'number') node.appendChild(document.createTextNode(c));
      else node.appendChild(c);
    });
    return node;
  }

  /* ── Formatting ─────────────────────────────────────────── */
  function formatCurrency(v) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(v); }
  function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }
  function formatDateTime(iso) {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return t('justNow');
    if (diff < 3600) return t('minutesAgo', { n: Math.floor(diff / 60) });
    if (diff < 86400) return t('hoursAgo', { n: Math.floor(diff / 3600) });
    if (diff < 172800) return t('yesterday');
    if (diff < 604800) return t('daysAgo', { n: Math.floor(diff / 86400) });
    return formatDate(iso);
  }

  function daysUntil(date) {
    if (!date) return null;
    return Math.ceil((new Date(date) - new Date()) / 86400000);
  }

  /* ── Color Maps ─────────────────────────────────────────── */
  const statusColors = { backlog: '#6b7280', todo: '#3b82f6', 'in-progress': '#f59e0b', review: '#a855f7', done: '#10b981', blocked: '#ef4444' };
  const priorityColors = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#6b7280' };
  const categoryColors = { design: '#ec4899', frontend: '#00d4ff', backend: '#a855f7', devops: '#f59e0b', testing: '#10b981', docs: '#6b7280', research: '#06b6d4', management: '#6366f1' };
  const activityColors = { completed: '#10b981', comment: '#3b82f6', started: '#f59e0b', moved: '#a855f7', created: '#00d4ff', blocked: '#ef4444', review: '#ec4899', deleted: '#6b7280', milestone: '#f59e0b' };

  /* ── Icons (inline SVG) ─────────────────────────────────── */
  const icons = {
    dashboard: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
    kanban: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>',
    timeline: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="12" x2="22" y2="12"/><polyline points="17,7 22,12 17,17"/><rect x="4" y="5" width="8" height="3" rx="1"/><rect x="6" y="16" width="10" height="3" rx="1"/><rect x="3" y="10" width="12" height="3" rx="1"/></svg>',
    team: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    budget: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    analytics: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12c0-4.97-4.03-9-9-9s-9 4.03-9 9"/><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    activity: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    settings: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    ai: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    alert: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    calendar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    target: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    trending: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    filter: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    zap: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    cloud: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>',
    cloudOff: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    bell: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    chevronDown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
    chevronRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>',
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    upload: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    undo: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    redo: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
    command: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>',
    grip: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>',
    user: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    flag: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
    link: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    refresh: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  };

  function icon(name, size) {
    const html = icons[name] || '';
    if (size) return html.replace(/width="\d+"/, `width="${size}"`).replace(/height="\d+"/, `height="${size}"`);
    return html;
  }

  /* ── Toast Notifications ────────────────────────────────── */
  let _toastContainer = null;
  function toast(message, type = 'info', duration = 4000) {
    if (!_toastContainer) {
      _toastContainer = el('div', { className: 'toast-container' });
      document.body.appendChild(_toastContainer);
    }
    const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#00d4ff' };
    const icons = { success: 'check', error: 'alert', warning: 'alert', info: 'zap' };
    const toastEl = el('div', { className: 'toast toast-enter' }, [
      el('div', { className: 'toast-icon', style: { color: colors[type] }, innerHTML: icon(icons[type]) }),
      el('span', { className: 'toast-message' }, [message]),
      el('button', { className: 'toast-close', innerHTML: icon('close'), onClick: () => dismiss() }),
    ]);
    toastEl.style.borderLeftColor = colors[type];
    _toastContainer.appendChild(toastEl);

    function dismiss() {
      toastEl.classList.add('toast-exit');
      setTimeout(() => toastEl.remove(), 300);
    }
    if (duration > 0) setTimeout(dismiss, duration);
    return toastEl;
  }

  /* ── Modal ──────────────────────────────────────────────── */
  function modal({ title = '', content, footer, wide = false, onClose } = {}) {
    const overlay = el('div', { className: 'modal-overlay' });
    const dialog = el('div', { className: 'modal-dialog' + (wide ? ' modal-wide' : '') }, [
      el('div', { className: 'modal-header' }, [
        el('h3', { className: 'modal-title' }, [title]),
        el('button', { className: 'modal-close-btn', innerHTML: icon('close'), onClick: () => close() }),
      ]),
      el('div', { className: 'modal-body' }, [content]),
      footer ? el('div', { className: 'modal-footer' }, Array.isArray(footer) ? footer : [footer]) : null,
    ].filter(Boolean));

    overlay.appendChild(dialog);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    function close() {
      overlay.classList.add('modal-exit');
      setTimeout(() => { overlay.remove(); if (onClose) onClose(); }, 250);
    }

    requestAnimationFrame(() => overlay.classList.add('modal-enter'));
    document.body.appendChild(overlay);
    return { overlay, dialog, close };
  }

  /* ── Dropdown ───────────────────────────────────────────── */
  function dropdown(triggerEl, items, options = {}) {
    const existing = document.querySelector('.dropdown-menu');
    if (existing) existing.remove();

    const menu = el('div', { className: 'dropdown-menu' });
    items.forEach(item => {
      if (item.divider) { menu.appendChild(el('div', { className: 'dropdown-divider' })); return; }
      const itemEl = el('div', {
        className: 'dropdown-item' + (item.danger ? ' dropdown-danger' : '') + (item.active ? ' dropdown-active' : ''),
        onClick: () => { menu.remove(); if (item.action) item.action(); }
      }, [
        item.icon ? el('span', { className: 'dropdown-icon', innerHTML: icon(item.icon) }) : null,
        el('span', {}, [item.label]),
      ].filter(Boolean));
      menu.appendChild(itemEl);
    });

    const rect = triggerEl.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = rect.bottom + 4 + 'px';
    menu.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
    document.body.appendChild(menu);

    const dismiss = (e) => { if (!menu.contains(e.target) && e.target !== triggerEl) { menu.remove(); document.removeEventListener('click', dismiss); } };
    setTimeout(() => document.addEventListener('click', dismiss), 0);
    return menu;
  }

  /* ── Select Dropdown ────────────────────────────────────── */
  function select({ value, options: opts = [], onChange, placeholder = '', className = '' } = {}) {
    const sel = el('select', { className: 'ui-select ' + className });
    if (placeholder) sel.appendChild(el('option', { value: '' }, [placeholder]));
    opts.forEach(o => {
      const opt = el('option', { value: o.value }, [o.label]);
      if (o.value === value) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => { if (onChange) onChange(sel.value); });
    return sel;
  }

  /* ── Task Card (Kanban) ─────────────────────────────────── */
  function taskCard(task, { onClick, onDragStart, compact = false } = {}) {
    const collab = task.assignee ? Store.getCollaborator(task.assignee) : null;
    const daysLeft = daysUntil(task.dueDate);
    const isOverdue = daysLeft !== null && daysLeft < 0 && task.status !== 'done';
    const isApproaching = daysLeft !== null && daysLeft >= 0 && daysLeft <= 2 && task.status !== 'done';

    // Card aging (days since last status change)
    const subtasksDone = task.subtasks ? task.subtasks.filter(s => s.done).length : 0;
    const subtasksTotal = task.subtasks ? task.subtasks.length : 0;

    const card = el('div', {
      className: 'task-card' + (task.status === 'blocked' ? ' task-blocked' : '') + (isOverdue ? ' task-overdue' : '') + (compact ? ' task-compact' : ''),
      draggable: 'true',
      dataset: { taskId: task.id },
      onClick: () => { if (onClick) onClick(task); },
    }, [
      // Header: priority dot + category
      el('div', { className: 'task-card-header' }, [
        el('span', { className: 'task-priority-dot', style: { background: priorityColors[task.priority] }, title: t(task.priority) }),
        el('span', { className: 'task-category', style: { color: categoryColors[task.category] } }, [t('categories.' + task.category) || task.category]),
        isOverdue ? el('span', { className: 'task-overdue-badge', innerHTML: icon('alert') + ' ' + Math.abs(daysLeft) + 'j' }) : null,
        isApproaching ? el('span', { className: 'task-approaching-badge' }, [daysLeft + 'j']) : null,
      ].filter(Boolean)),

      // Title
      el('h4', { className: 'task-card-title' }, [task.title]),

      // Subtasks progress
      subtasksTotal > 0 ? el('div', { className: 'task-subtasks-bar' }, [
        el('div', { className: 'task-subtasks-track' }, [
          el('div', { className: 'task-subtasks-fill', style: { width: (subtasksDone / subtasksTotal * 100) + '%' } }),
        ]),
        el('span', { className: 'task-subtasks-count' }, [`${subtasksDone}/${subtasksTotal}`]),
      ]) : null,

      // Progress bar
      task.progress > 0 && task.progress < 100 ? el('div', { className: 'task-progress-mini' }, [
        el('div', { className: 'task-progress-track' }, [
          el('div', { className: 'task-progress-fill', style: { width: task.progress + '%', background: statusColors[task.status] } }),
        ]),
      ]) : null,

      // Footer: avatar, hours, due date, comments
      el('div', { className: 'task-card-footer' }, [
        collab ? el('span', { className: 'task-avatar', title: collab.name }, [collab.avatar]) : el('span', { className: 'task-avatar task-unassigned', title: t('noAssignee') }, ['👤']),
        task.estimateHours ? el('span', { className: 'task-hours', innerHTML: icon('clock') }, [` ${task.spentHours || 0}/${task.estimateHours}h`]) : null,
        task.dueDate ? el('span', { className: 'task-due' + (isOverdue ? ' overdue' : '') }, [formatDate(task.dueDate)]) : null,
        task.comments > 0 ? el('span', { className: 'task-comments' }, [`💬 ${task.comments}`]) : null,
      ].filter(Boolean)),
    ].filter(Boolean));

    // Drag
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', task.id);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('task-dragging');
      if (onDragStart) onDragStart(task, e);
    });
    card.addEventListener('dragend', () => card.classList.remove('task-dragging'));

    return card;
  }

  /* ── Task Modal (Create / Edit) ─────────────────────────── */
  function taskModal(task, { onSave, onDelete } = {}) {
    const isNew = !task;
    const data = task ? { ...task } : { title: '', description: '', status: 'todo', priority: 'medium', category: 'frontend', assignee: null, estimateHours: 0, dueDate: '', startDate: '', tags: [], subtasks: [] };

    const collabs = Store.getState().collaborators;
    const statusOpts = ['backlog', 'todo', 'in-progress', 'review', 'done', 'blocked'].map(s => ({ value: s, label: t(s) }));
    const prioOpts = ['critical', 'high', 'medium', 'low'].map(p => ({ value: p, label: t(p) }));
    const catOpts = ['design', 'frontend', 'backend', 'devops', 'testing', 'docs', 'research', 'management'].map(c => ({ value: c, label: t('categories.' + c) }));
    const assigneeOpts = [{ value: '', label: t('noAssignee') }, ...collabs.map(c => ({ value: c.id, label: c.avatar + ' ' + c.name }))];

    // Prediction
    const prediction = Predictions.predictDuration(data);

    const form = el('div', { className: 'task-form' }, [
      // Title with autocomplete
      el('div', { className: 'form-group' }, [
        el('label', {}, [t('title')]),
        el('input', { type: 'text', className: 'form-input task-title-input', value: data.title, placeholder: t('title'), onInput: (e) => { data.title = e.target.value; } }),
      ]),
      // Description
      el('div', { className: 'form-group' }, [
        el('label', {}, [t('description')]),
        el('textarea', { className: 'form-input form-textarea', placeholder: t('description'), rows: '3', onInput: (e) => { data.description = e.target.value; } }, [data.description]),
      ]),
      // Row: Status + Priority
      el('div', { className: 'form-row' }, [
        el('div', { className: 'form-group' }, [
          el('label', {}, [t('status')]),
          select({ value: data.status, options: statusOpts, onChange: (v) => { data.status = v; } }),
        ]),
        el('div', { className: 'form-group' }, [
          el('label', {}, [t('priority')]),
          select({ value: data.priority, options: prioOpts, onChange: (v) => { data.priority = v; } }),
        ]),
      ]),
      // Row: Category + Assignee
      el('div', { className: 'form-row' }, [
        el('div', { className: 'form-group' }, [
          el('label', {}, [t('category')]),
          select({ value: data.category, options: catOpts, onChange: (v) => { data.category = v; } }),
        ]),
        el('div', { className: 'form-group' }, [
          el('label', {}, [t('assignee')]),
          select({ value: data.assignee || '', options: assigneeOpts, onChange: (v) => { data.assignee = v || null; } }),
        ]),
      ]),
      // Row: Dates + Estimate
      el('div', { className: 'form-row' }, [
        el('div', { className: 'form-group' }, [
          el('label', {}, [t('startDate')]),
          el('input', { type: 'date', className: 'form-input', value: data.startDate || '', onInput: (e) => { data.startDate = e.target.value; } }),
        ]),
        el('div', { className: 'form-group' }, [
          el('label', {}, [t('dueDate')]),
          el('input', { type: 'date', className: 'form-input', value: data.dueDate || '', onInput: (e) => { data.dueDate = e.target.value; } }),
        ]),
        el('div', { className: 'form-group' }, [
          el('label', {}, [t('estimate')]),
          el('input', { type: 'number', className: 'form-input', value: data.estimateHours || '', min: '0', onInput: (e) => { data.estimateHours = parseInt(e.target.value) || 0; } }),
        ]),
      ]),
      // AI prediction
      prediction.confidence > 0.2 ? el('div', { className: 'task-prediction' }, [
        el('span', { innerHTML: icon('zap') }),
        el('span', {}, [`Durée prédite: ~${prediction.predicted}h (confiance ${Math.round(prediction.confidence * 100)}%)`]),
      ]) : null,
      // Subtasks
      el('div', { className: 'form-group' }, [
        el('label', {}, [t('subtasks')]),
        buildSubtaskEditor(data),
      ]),
    ].filter(Boolean));

    const footerBtns = [
      !isNew && onDelete ? el('button', { className: 'btn btn-danger', onClick: () => { m.close(); onDelete(data.id); } }, [t('delete')]) : null,
      el('div', { style: { flex: '1' } }),
      el('button', { className: 'btn btn-secondary', onClick: () => m.close() }, [t('cancel')]),
      el('button', { className: 'btn btn-primary', onClick: () => { m.close(); if (onSave) onSave(data); } }, [isNew ? t('createTask') : t('save')]),
    ].filter(Boolean);

    const m = modal({ title: isNew ? t('createTask') : t('editTask'), content: form, footer: footerBtns, wide: true });
    // Focus title
    setTimeout(() => { const inp = form.querySelector('.task-title-input'); if (inp) inp.focus(); }, 100);
    return m;
  }

  function buildSubtaskEditor(data) {
    const container = el('div', { className: 'subtask-editor' });

    function render() {
      container.innerHTML = '';
      (data.subtasks || []).forEach((st, i) => {
        container.appendChild(el('div', { className: 'subtask-item' + (st.done ? ' subtask-done' : '') }, [
          el('input', { type: 'checkbox', checked: st.done ? 'checked' : undefined, onChange: () => { st.done = !st.done; render(); } }),
          el('span', { className: 'subtask-title' }, [st.title]),
          el('button', { className: 'subtask-remove', innerHTML: icon('close'), onClick: () => { data.subtasks.splice(i, 1); render(); } }),
        ]));
      });
      // Add subtask input
      const input = el('input', { type: 'text', className: 'form-input subtask-input', placeholder: 'Ajouter une sous-tâche…' });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
          if (!data.subtasks) data.subtasks = [];
          data.subtasks.push({ title: input.value.trim(), done: false });
          render();
        }
      });
      container.appendChild(input);
    }
    render();
    return container;
  }

  /* ── Stat Card ──────────────────────────────────────────── */
  function statCard({ title, value, subtitle, icon: iconName, color = '#00d4ff', trend, sparklineData, onClick } = {}) {
    const valueEl = el('span', { className: 'stat-value' });

    const card = el('div', { className: 'stat-card', onClick: onClick || null }, [
      el('div', { className: 'stat-header' }, [
        el('div', { className: 'stat-icon', style: { background: color + '20', color }, innerHTML: icon(iconName || 'target') }),
        trend !== undefined ? el('span', { className: 'stat-trend ' + (trend >= 0 ? 'trend-up' : 'trend-down') }, [(trend >= 0 ? '↑' : '↓') + ' ' + Math.abs(trend) + '%']) : null,
      ].filter(Boolean)),
      el('div', { className: 'stat-body' }, [
        el('p', { className: 'stat-title' }, [title]),
        valueEl,
        subtitle ? el('p', { className: 'stat-subtitle' }, [subtitle]) : null,
      ].filter(Boolean)),
      sparklineData ? el('div', { className: 'stat-sparkline' }, [Charts.sparkline({ data: sparklineData, width: 100, height: 28, color })]) : null,
    ].filter(Boolean));

    // Animated counter
    const numVal = typeof value === 'number' ? value : parseInt(value);
    if (!isNaN(numVal) && numVal > 0) {
      Charts.animatedNumber(valueEl, numVal, 800, typeof value === 'string' && value.includes('€') ? '' : '', typeof value === 'string' && value.includes('%') ? '%' : '');
    } else {
      valueEl.textContent = value;
    }

    return card;
  }

  /* ── Filter Bar ─────────────────────────────────────────── */
  function filterBar({ onFilterChange } = {}) {
    const state = Store.getState();
    const filters = state.filters;
    const collabs = state.collaborators;

    const bar = el('div', { className: 'filter-bar' }, [
      el('div', { className: 'filter-bar-left' }, [
        el('span', { className: 'filter-icon', innerHTML: icon('filter') }),
        select({
          value: filters.status, className: 'filter-select',
          options: [{ value: 'all', label: t('allStatuses') }, ...['backlog', 'todo', 'in-progress', 'review', 'done', 'blocked'].map(s => ({ value: s, label: t(s) }))],
          onChange: (v) => { Store.setFilter('status', v); if (onFilterChange) onFilterChange(); }
        }),
        select({
          value: filters.priority, className: 'filter-select',
          options: [{ value: 'all', label: t('allPriorities') }, ...['critical', 'high', 'medium', 'low'].map(p => ({ value: p, label: t(p) }))],
          onChange: (v) => { Store.setFilter('priority', v); if (onFilterChange) onFilterChange(); }
        }),
        select({
          value: filters.assignee, className: 'filter-select',
          options: [{ value: 'all', label: t('allAssignees') }, ...collabs.map(c => ({ value: c.id, label: c.avatar + ' ' + c.name }))],
          onChange: (v) => { Store.setFilter('assignee', v); if (onFilterChange) onFilterChange(); }
        }),
        select({
          value: filters.category, className: 'filter-select',
          options: [{ value: 'all', label: t('allCategories') }, ...['design', 'frontend', 'backend', 'devops', 'testing', 'docs', 'research', 'management'].map(c => ({ value: c, label: t('categories.' + c) }))],
          onChange: (v) => { Store.setFilter('category', v); if (onFilterChange) onFilterChange(); }
        }),
      ]),
    ]);

    return bar;
  }

  /* ── NLP Input Bar ──────────────────────────────────────── */
  function nlpInput({ onSubmit, placeholder } = {}) {
    const container = el('div', { className: 'nlp-input-container' });
    const preview = el('div', { className: 'nlp-preview' });
    const input = el('input', {
      type: 'text', className: 'nlp-input',
      placeholder: placeholder || t('quickAdd'),
    });

    let parsed = null;
    input.addEventListener('input', () => {
      const text = input.value.trim();
      if (text.length < 3) { preview.innerHTML = ''; preview.style.display = 'none'; return; }
      parsed = Predictions.parseNaturalTask(text);
      preview.style.display = 'flex';
      preview.innerHTML = '';
      if (parsed.title) preview.appendChild(el('span', { className: 'nlp-tag nlp-title' }, [parsed.title]));
      if (parsed.priority !== 'medium') preview.appendChild(el('span', { className: 'nlp-tag', style: { background: priorityColors[parsed.priority] + '30', color: priorityColors[parsed.priority] } }, [parsed.priority]));
      if (parsed.category) preview.appendChild(el('span', { className: 'nlp-tag', style: { background: categoryColors[parsed.category] + '30', color: categoryColors[parsed.category] } }, [parsed.category]));
      if (parsed.assignee) {
        const c = Store.getCollaborator(parsed.assignee);
        if (c) preview.appendChild(el('span', { className: 'nlp-tag' }, [c.avatar + ' ' + c.name.split(' ')[0]]));
      }
      if (parsed.dueDate) preview.appendChild(el('span', { className: 'nlp-tag' }, ['📅 ' + formatDate(parsed.dueDate)]));
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && parsed && parsed.title) {
        if (onSubmit) onSubmit(parsed);
        input.value = '';
        preview.innerHTML = '';
        preview.style.display = 'none';
        parsed = null;
      }
    });

    container.appendChild(el('span', { className: 'nlp-icon', innerHTML: icon('zap') }));
    container.appendChild(input);
    container.appendChild(preview);
    return container;
  }

  /* ── Command Palette ────────────────────────────────────── */
  function commandPalette({ commands = [], onSelect } = {}) {
    const overlay = el('div', { className: 'cmd-overlay' });
    const dialog = el('div', { className: 'cmd-dialog' });
    const input = el('input', { type: 'text', className: 'cmd-input', placeholder: t('search'), autofocus: 'true' });
    const list = el('div', { className: 'cmd-list' });
    let selectedIdx = 0;

    function render(filter = '') {
      const filtered = filter ? commands.filter(c => c.label.toLowerCase().includes(filter.toLowerCase()) || (c.shortcut || '').toLowerCase().includes(filter.toLowerCase())) : commands;
      // Also search tasks/collabs
      const searchResults = filter.length >= 2 ? Predictions.globalSearch(filter, 5) : [];

      list.innerHTML = '';
      selectedIdx = 0;

      if (filtered.length > 0) {
        list.appendChild(el('div', { className: 'cmd-group-label' }, ['Actions']));
        filtered.forEach((cmd, i) => {
          const item = el('div', {
            className: 'cmd-item' + (i === 0 ? ' cmd-active' : ''),
            onClick: () => { close(); if (cmd.action) cmd.action(); if (onSelect) onSelect(cmd); },
          }, [
            cmd.icon ? el('span', { className: 'cmd-item-icon', innerHTML: icon(cmd.icon) }) : null,
            el('span', { className: 'cmd-item-label' }, [cmd.label]),
            cmd.shortcut ? el('span', { className: 'cmd-shortcut' }, [cmd.shortcut]) : null,
          ].filter(Boolean));
          list.appendChild(item);
        });
      }

      if (searchResults.length > 0) {
        list.appendChild(el('div', { className: 'cmd-group-label' }, ['Résultats']));
        searchResults.forEach(r => {
          const item = el('div', {
            className: 'cmd-item',
            onClick: () => { close(); if (onSelect) onSelect({ type: 'search', ...r }); },
          }, [
            el('span', { className: 'cmd-item-icon', innerHTML: icon(r.type === 'task' ? 'check' : r.type === 'collaborator' ? 'user' : 'dashboard') }),
            el('span', { className: 'cmd-item-label' }, [r.title]),
            el('span', { className: 'cmd-item-sub' }, [r.subtitle]),
          ]);
          list.appendChild(item);
        });
      }

      if (filtered.length === 0 && searchResults.length === 0) {
        list.appendChild(el('div', { className: 'cmd-empty' }, [t('noResults')]));
      }
    }

    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', (e) => {
      const items = list.querySelectorAll('.cmd-item');
      if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx + 1, items.length - 1); updateActive(items); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(selectedIdx - 1, 0); updateActive(items); }
      else if (e.key === 'Enter') { e.preventDefault(); if (items[selectedIdx]) items[selectedIdx].click(); }
      else if (e.key === 'Escape') close();
    });

    function updateActive(items) {
      items.forEach((it, i) => it.classList.toggle('cmd-active', i === selectedIdx));
      if (items[selectedIdx]) items[selectedIdx].scrollIntoView({ block: 'nearest' });
    }

    function close() {
      overlay.classList.add('cmd-exit');
      setTimeout(() => overlay.remove(), 200);
    }

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    dialog.appendChild(input);
    dialog.appendChild(list);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    render();
    setTimeout(() => input.focus(), 50);

    return { close };
  }

  /* ── Login Modal ────────────────────────────────────────── */
  function loginModal({ onLogin } = {}) {
    const emailInput = el('input', { type: 'email', className: 'form-input', placeholder: t('email') });
    const passInput = el('input', { type: 'password', className: 'form-input', placeholder: t('password') });
    const errMsg = el('div', { className: 'login-error' });
    const submitBtn = el('button', { className: 'btn btn-primary btn-full', onClick: doLogin }, [t('login')]);

    async function doLogin() {
      const email = emailInput.value.trim();
      const pass = passInput.value;
      if (!email || !pass) { errMsg.textContent = 'Veuillez remplir tous les champs'; return; }
      submitBtn.disabled = true;
      submitBtn.textContent = t('loading');
      try {
        await Store.login(email, pass);
        m.close();
        toast('Connecté au cloud !', 'success');
        if (onLogin) onLogin();
      } catch (e) {
        errMsg.textContent = e.message || 'Erreur de connexion';
        submitBtn.disabled = false;
        submitBtn.textContent = t('login');
      }
    }

    passInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

    const content = el('div', { className: 'login-form' }, [
      el('div', { className: 'login-icon', innerHTML: icon('cloud') }),
      el('p', { className: 'login-desc' }, ['Connectez-vous pour synchroniser vos données dans le cloud.']),
      errMsg,
      el('div', { className: 'form-group' }, [emailInput]),
      el('div', { className: 'form-group' }, [passInput]),
      submitBtn,
    ]);

    const m = modal({ title: t('loginTitle'), content });
    setTimeout(() => emailInput.focus(), 100);
    return m;
  }

  /* ── Skeleton Loader ────────────────────────────────────── */
  function skeleton(width = '100%', height = '20px', radius = '8px') {
    return el('div', { className: 'skeleton', style: { width, height, borderRadius: radius } });
  }

  /* ── Confirmation Dialog ────────────────────────────────── */
  function confirm(message, { onConfirm, onCancel, danger = false } = {}) {
    const content = el('p', { className: 'confirm-message' }, [message]);
    const m = modal({
      title: 'Confirmation',
      content,
      footer: [
        el('button', { className: 'btn btn-secondary', onClick: () => { m.close(); if (onCancel) onCancel(); } }, [t('cancel')]),
        el('button', { className: 'btn ' + (danger ? 'btn-danger' : 'btn-primary'), onClick: () => { m.close(); if (onConfirm) onConfirm(); } }, [t('confirm')]),
      ],
    });
  }

  /* ── Empty State ────────────────────────────────────────── */
  function emptyState(message, iconName = 'target') {
    return el('div', { className: 'empty-state' }, [
      el('div', { className: 'empty-icon', innerHTML: icon(iconName) }),
      el('p', {}, [message]),
    ]);
  }

  /* ── Public API ─────────────────────────────────────────── */
  window.UI = {
    el, icon, icons,
    formatCurrency, formatDate, formatDateTime, daysUntil,
    statusColors, priorityColors, categoryColors, activityColors,
    toast, modal, dropdown, select, confirm, emptyState, skeleton,
    taskCard, taskModal, statCard, filterBar,
    nlpInput, commandPalette, loginModal,
  };
})();
