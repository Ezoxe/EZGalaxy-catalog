/* ================================================================
   FinVest — app.js  (Main Application Controller)
   IIFE — boots the SPA, handles navigation, sidebar, responsive
   Exposes: window.navigateTo, window.renderApp
   ================================================================ */
(() => {
  'use strict';

  let currentView = null;
  let sidebarCollapsed = false;
  const root = document.getElementById('app');

  /* ---------- Navigation map --------------------------------- */
  const NAV_ITEMS = [
    { key: 'overview',    label: 'Vue d\'ensemble',   icon: 'activity' },
    { key: 'allocation',  label: 'Allocation',        icon: 'pie-chart' },
    { key: 'projections', label: 'Projections',       icon: 'trending-up' },
    { key: 'retirement',  label: 'Retraite',          icon: 'clock' },
    { key: 'debt',        label: 'Dettes',            icon: 'lock' },
    { key: 'advice',      label: 'Conseils',          icon: 'star' },
    { key: 'ai',          label: 'Prompts IA',        icon: 'sparkles' },
    { key: 'news',        label: 'Actualités',        icon: 'newspaper' },
    { key: 'settings',    label: 'Paramètres',        icon: 'settings' }
  ];

  /* ---------- Build shell ------------------------------------ */
  function buildShell() {
    root.innerHTML = '';
    root.className = 'app';

    // Sidebar
    const sidebar = UI.el('aside', { className: 'sidebar', id: 'sidebar' });

    // Sidebar header
    const header = UI.el('div', { className: 'sidebar__header' }, [
      UI.el('span', { className: 'sidebar__logo', textContent: '💹' }),
      UI.el('span', { className: 'sidebar__title', textContent: 'FinVest' })
    ]);
    sidebar.appendChild(header);

    // Nav links
    const nav = UI.el('nav', { className: 'sidebar__nav', id: 'sidebar-nav' });
    for (const item of NAV_ITEMS) {
      const link = UI.el('a', {
        className: 'nav-link',
        href: '#',
        dataset: { view: item.key },
        onClick: e => { e.preventDefault(); navigateTo(item.key); }
      }, [UI.icon(item.icon, 18), UI.el('span', { className: 'nav-link__label', textContent: item.label })]);
      nav.appendChild(link);
    }
    sidebar.appendChild(nav);

    // Sidebar footer
    const footer = UI.el('div', { className: 'sidebar__footer' }, [
      UI.el('button', { className: 'btn btn--ghost btn--sm sidebar__home', onClick: () => {
        Store.setState({ step: 'welcome' });
        renderApp();
      } }, [UI.icon('home', 16), UI.el('span', { className: 'nav-link__label', textContent: 'Accueil' })]),
      UI.el('div', { className: 'sidebar__cloud', id: 'cloud-indicator' })
    ]);
    sidebar.appendChild(footer);

    // Main content
    const main = UI.el('main', { className: 'main', id: 'main-content' });

    // Mobile hamburger
    const hamburger = UI.el('button', { className: 'hamburger', id: 'hamburger', onClick: toggleSidebar }, [UI.icon('menu', 22)]);

    root.appendChild(hamburger);
    root.appendChild(sidebar);
    root.appendChild(main);
  }

  /* ---------- Toggle sidebar (mobile) ------------------------ */
  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('sidebar--open', sidebarCollapsed);
  }

  /* ---------- Update active nav ------------------------------ */
  function updateNav(view) {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    nav.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('nav-link--active', link.dataset.view === view);
    });
  }

  /* ---------- Update cloud indicator ------------------------- */
  function updateCloudIndicator() {
    const el = document.getElementById('cloud-indicator');
    if (!el) return;
    const s = Store.getState();
    const statusMap = {
      connected: { text: '☁️ Connecté', cls: 'cloud-status--connected' },
      syncing: { text: '🔄 Sync...', cls: 'cloud-status--syncing' },
      error: { text: '⚠️ Erreur', cls: 'cloud-status--error' },
      disconnected: { text: '☁️ Hors-ligne', cls: 'cloud-status--disconnected' }
    };
    const info = statusMap[s.cloudStatus] || statusMap.disconnected;
    el.innerHTML = `<span class="cloud-badge ${info.cls}">${info.text}</span>`;
  }

  /* ---------- Render current view ----------------------------- */
  function renderCurrentView(view) {
    const main = document.getElementById('main-content');
    if (!main) return;

    // Fade out current content
    main.classList.add('main--transitioning');

    setTimeout(() => {
      // Destroy old charts
      main.querySelectorAll('.chart-canvas').forEach(c => UI.destroyChart(c));

      // Render new view
      const viewFn = Views[view];
      if (viewFn) {
        viewFn(main);
      } else {
        main.innerHTML = `<div class="empty-state"><h3>Vue inconnue : ${view}</h3></div>`;
      }

      main.classList.remove('main--transitioning');
      updateNav(view);
      currentView = view;

      // Close mobile sidebar after navigation
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.remove('sidebar--open');
      sidebarCollapsed = false;
    }, 150);
  }

  /* ---------- navigateTo -------------------------------------- */
  function navigateTo(view) {
    const s = Store.getState();

    // Determine what to show
    if (view === 'welcome' || s.step === 'welcome') {
      root.className = 'app app--fullscreen';
      hideSidebar();
      Views.welcome(document.getElementById('main-content') || root);
      return;
    }

    if (view === 'questionnaire' || s.step === 'questionnaire') {
      root.className = 'app app--fullscreen';
      hideSidebar();
      const main = document.getElementById('main-content') || root;
      Views.questionnaire(main);
      return;
    }

    // Dashboard mode — show sidebar
    root.className = 'app app--dashboard';
    showSidebar();
    renderCurrentView(view);
    updateCloudIndicator();
  }

  function hideSidebar() {
    const sb = document.getElementById('sidebar');
    const hb = document.getElementById('hamburger');
    if (sb) sb.style.display = 'none';
    if (hb) hb.style.display = 'none';
  }

  function showSidebar() {
    const sb = document.getElementById('sidebar');
    const hb = document.getElementById('hamburger');
    if (sb) sb.style.display = '';
    if (hb) hb.style.display = '';
  }

  /* ---------- renderApp (full redraw) ------------------------ */
  function renderApp() {
    const s = Store.getState();

    if (!document.getElementById('sidebar')) {
      buildShell();
    }

    if (s.step === 'welcome') {
      navigateTo('welcome');
    } else if (s.step === 'questionnaire') {
      navigateTo('questionnaire');
    } else {
      navigateTo(s.currentView || 'overview');
    }
  }

  /* ---------- Init -------------------------------------------- */
  function init() {
    // Initialize store (loads from localStorage)
    Store.init();

    // Load authorization file
    fetch('./ezgalaxy-authorization.json')
      .then(r => r.json())
      .then(auth => {
        console.log('[FinVest] Authorization:', auth.capabilities.map(c => `${c.name}:${c.enabled}`).join(', '));
      })
      .catch(() => {});

    // Build shell and render
    buildShell();
    renderApp();

    // Subscribe to store changes for cloud indicator
    Store.subscribe(() => updateCloudIndicator());

    console.log('[FinVest] Application initialized');
  }

  /* ---------- Expose globals --------------------------------- */
  window.navigateTo = navigateTo;
  window.renderApp = renderApp;

  /* ---------- Boot -------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
