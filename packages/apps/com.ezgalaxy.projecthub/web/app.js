/* ═══════════════════════════════════════════════════════════════
   Project Hub — App Shell
   v2.0.0 — Routing, sidebar, keyboard shortcuts, auth flow
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const { el, icon, toast, commandPalette, loginModal, taskModal, dropdown } = UI;
  const t = (k, p) => Store.t(k, p);

  /* ── State ──────────────────────────────────────────────── */
  let currentView = 'dashboard';
  let sidebarCollapsed = false;

  /* ── Navigation Items ───────────────────────────────────── */
  const navItems = [
    { id: 'dashboard', icon: 'dashboard', labelKey: 'dashboardView' },
    { id: 'kanban', icon: 'kanban', labelKey: 'kanbanView' },
    { id: 'timeline', icon: 'timeline', labelKey: 'timelineView' },
    { id: 'team', icon: 'team', labelKey: 'teamView' },
    { id: 'budget', icon: 'budget', labelKey: 'budgetView' },
    { id: 'analytics', icon: 'analytics', labelKey: 'analyticsView' },
    { id: 'activity', icon: 'activity', labelKey: 'activityView' },
    { id: 'aiAssistant', icon: 'ai', labelKey: 'aiAssistant' },
    { divider: true },
    { id: 'settings', icon: 'settings', labelKey: 'settingsView' },
  ];

  /* ── Command Palette Commands ───────────────────────────── */
  function getCommands() {
    return [
      { id: 'newTask', label: t('createTask'), icon: 'plus', shortcut: 'Ctrl+N', action: () => createNewTask() },
      { id: 'search', label: t('search'), icon: 'search', shortcut: 'Ctrl+K', action: () => openCommandPalette() },
      { id: 'undo', label: t('undo'), icon: 'undo', shortcut: 'Ctrl+Z', action: () => Store.undo() },
      { id: 'redo', label: t('redo'), icon: 'redo', shortcut: 'Ctrl+Shift+Z', action: () => Store.redo() },
      ...navItems.filter(n => !n.divider).map(n => ({
        id: 'goto-' + n.id, label: 'Aller à ' + t(n.labelKey), icon: n.icon, action: () => navigate(n.id),
      })),
      { id: 'export', label: t('exportData'), icon: 'download', action: () => {
        Store.exportData(); // exportData now handles download internally
        toast(t('exportData') + ' ✓', 'success');
      }},
      { id: 'cloudSync', label: 'Synchroniser (Cloud)', icon: 'cloud', action: async () => {
        if (!Store.getState().auth) { loginModal({ onLogin: () => navigate(currentView) }); return; }
        await Store.cloudSave();
        toast('Synchronisé !', 'success');
      }},
    ];
  }

  /* ── Render App Shell ───────────────────────────────────── */
  function renderShell() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.className = 'app-shell';

    // Sidebar
    const sidebar = el('div', { className: 'sidebar' + (sidebarCollapsed ? ' sidebar-collapsed' : '') });

    // Logo / Brand
    const brand = el('div', { className: 'sidebar-brand' }, [
      el('span', { className: 'brand-icon' }, ['🚀']),
      el('span', { className: 'brand-text' }, ['Project Hub']),
    ]);
    brand.addEventListener('click', () => { sidebarCollapsed = !sidebarCollapsed; sidebar.classList.toggle('sidebar-collapsed'); });
    sidebar.appendChild(brand);

    // Search trigger
    const searchTrigger = el('div', { className: 'sidebar-search', onClick: () => openCommandPalette() }, [
      el('span', { innerHTML: icon('search') }),
      el('span', { className: 'search-hint' }, ['Rechercher…']),
      el('kbd', {}, ['Ctrl+K']),
    ]);
    sidebar.appendChild(searchTrigger);

    // Nav items
    const nav = el('nav', { className: 'sidebar-nav' });
    navItems.forEach(item => {
      if (item.divider) { nav.appendChild(el('div', { className: 'nav-divider' })); return; }
      const navItem = el('a', {
        className: 'nav-item' + (currentView === item.id ? ' nav-active' : ''),
        href: '#' + item.id,
        onClick: (e) => { e.preventDefault(); navigate(item.id); },
      }, [
        el('span', { className: 'nav-icon', innerHTML: icon(item.icon) }),
        el('span', { className: 'nav-label' }, [t(item.labelKey)]),
      ]);
      nav.appendChild(navItem);
    });
    sidebar.appendChild(nav);

    // Sidebar footer
    const sidebarFooter = el('div', { className: 'sidebar-footer' });

    // Cloud status
    const state = Store.getState();
    const isCloudOn = !!state.auth;
    const cloudIcon = isCloudOn ? 'cloud' : 'cloudOff';
    const cloudStatus = el('div', {
      className: 'cloud-status' + (isCloudOn ? ' cloud-online' : ''),
      onClick: () => {
        if (isCloudOn) {
          dropdown(cloudStatus, [
            { label: 'Sauver dans le cloud', icon: 'upload', action: async () => { await Store.cloudSave(); toast('Sauvegardé !', 'success'); } },
            { label: 'Charger du cloud', icon: 'download', action: async () => { await Store.cloudLoad(); toast('Chargé !', 'success'); navigate(currentView); } },
            { divider: true },
            { label: 'Déconnexion', icon: 'cloudOff', danger: true, action: () => { Store.logout(); navigate(currentView); } },
          ]);
        } else {
          loginModal({ onLogin: () => navigate(currentView) });
        }
      }
    }, [
      el('span', { innerHTML: icon(cloudIcon) }),
      el('span', { className: 'cloud-label' }, [isCloudOn ? 'Cloud sync' : 'Hors ligne']),
    ]);
    sidebarFooter.appendChild(cloudStatus);

    // Undo/Redo
    const undoRedo = el('div', { className: 'undo-redo' }, [
      el('button', { className: 'btn-icon', innerHTML: icon('undo'), title: 'Annuler (Ctrl+Z)', onClick: () => Store.undo() }),
      el('button', { className: 'btn-icon', innerHTML: icon('redo'), title: 'Refaire (Ctrl+Shift+Z)', onClick: () => Store.redo() }),
    ]);
    sidebarFooter.appendChild(undoRedo);

    sidebar.appendChild(sidebarFooter);

    // Main content area
    const main = el('div', { className: 'main-content' });

    // Top bar
    const topbar = el('div', { className: 'topbar' }, [
      el('button', { className: 'btn-icon sidebar-toggle', innerHTML: icon('menu'), onClick: () => { sidebarCollapsed = !sidebarCollapsed; sidebar.classList.toggle('sidebar-collapsed'); } }),
      el('h2', { className: 'topbar-title', id: 'topbar-title' }, [t(navItems.find(n => n.id === currentView)?.labelKey || 'dashboardView')]),
      el('div', { className: 'topbar-actions' }, [
        el('button', { className: 'btn btn-primary btn-new-task', innerHTML: icon('plus') + ' ' + t('createTask'), onClick: () => createNewTask() }),
      ]),
    ]);
    main.appendChild(topbar);

    // View container
    const viewContainer = el('div', { className: 'view-container', id: 'view-container' });
    main.appendChild(viewContainer);

    app.appendChild(sidebar);
    app.appendChild(main);

    // Render current view
    renderView();
  }

  /* ── Navigate ───────────────────────────────────────────── */
  function navigate(viewId) {
    currentView = viewId;
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('nav-active', n.getAttribute('href') === '#' + viewId);
    });
    // Update title
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) {
      const navItem = navItems.find(n => n.id === viewId);
      titleEl.textContent = navItem ? t(navItem.labelKey) : viewId;
    }
    renderView();
  }

  function renderView() {
    const vc = document.getElementById('view-container');
    if (!vc) return;

    // Add page transition
    vc.classList.add('view-exit');
    setTimeout(() => {
      vc.classList.remove('view-exit');
      vc.classList.add('view-enter');

      const viewFn = Views[currentView];
      if (viewFn) {
        viewFn(vc);
      } else {
        vc.innerHTML = '<p class="text-muted">Vue non disponible.</p>';
      }

      setTimeout(() => vc.classList.remove('view-enter'), 300);
    }, 150);
  }

  /* ── Actions ────────────────────────────────────────────── */
  function createNewTask() {
    taskModal(null, {
      onSave: (data) => {
        Store.addTask(data);
        toast(t('taskCreated'), 'success');
      }
    });
  }

  function openCommandPalette() {
    commandPalette({
      commands: getCommands(),
      onSelect: (item) => {
        if (item.action) {
          item.action();
        } else if (item.type === 'task') {
          const task = Store.getTask(item.id);
          if (task) {
            navigate('kanban');
            setTimeout(() => {
              taskModal(task, {
                onSave: (d) => { Store.updateTask(d.id, d); toast(t('taskMoved'), 'success'); },
                onDelete: (id) => { Store.deleteTask(id); toast(t('delete'), 'info'); },
              });
            }, 200);
          }
        } else if (item.type === 'collaborator') {
          navigate('team');
        } else if (item.type === 'view' || item.viewId) {
          navigate(item.viewId || item.id);
        }
      }
    });
  }

  /* ── Keyboard Shortcuts ─────────────────────────────────── */
  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Ignore when typing in input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        if (e.key === 'Escape') e.target.blur();
        return;
      }

      // Ctrl+K — Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openCommandPalette(); return; }
      // Ctrl+N — New Task
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); createNewTask(); return; }
      // Ctrl+Z — Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); Store.undo(); return; }
      // Ctrl+Shift+Z — Redo
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') { e.preventDefault(); Store.redo(); return; }

      // Number keys 1-9 for quick nav (only when no modal/overlay is open)
      if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !document.querySelector('.modal-overlay, .command-palette')) {
        const idx = parseInt(e.key) - 1;
        const navItem = navItems.filter(n => !n.divider)[idx];
        if (navItem) navigate(navItem.id);
      }
    });
  }

  /* ── Store Subscription (Re-render on state change) ─────── */
  function setupSubscriptions() {
    Store.subscribe(() => {
      // Only re-render the current view, not the whole shell
      renderView();
    });
  }

  /* ── Load Auth Config ───────────────────────────────────── */
  async function loadAuthConfig() {
    try {
      const resp = await fetch('./ezgalaxy-authorization.json');
      if (resp.ok) {
        const config = await resp.json();
        // EZGalaxy platform injects token at runtime via capabilities
        // If a session token exists, use it
        if (config.token) {
          Store.setToken(config.token);
        }
      }
    } catch (e) {
      // Auth config not available, continue offline
    }
  }

  /* ── Initialize ─────────────────────────────────────────── */
  async function init() {
    // Apply theme
    const state = Store.getState();
    document.body.dataset.theme = (state.settings?.theme === 'light') ? 'light' : 'dark';

    // Load auth
    await loadAuthConfig();

    // Build shell
    renderShell();

    // Setup
    setupKeyboard();
    setupSubscriptions();

    // Handle hash navigation
    const hash = window.location.hash.slice(1);
    if (hash && navItems.some(n => n.id === hash)) {
      navigate(hash);
    }

    window.addEventListener('hashchange', () => {
      const h = window.location.hash.slice(1);
      if (h && h !== currentView) navigate(h);
    });
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── Public ─────────────────────────────────────────────── */
  window.App = { navigate, openCommandPalette, createNewTask };
})();
