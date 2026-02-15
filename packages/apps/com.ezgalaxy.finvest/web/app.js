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
    { type: 'divider', label: '📊 Tableaux de bord' },
    { key: 'overview',          label: 'Vue d\'ensemble',    icon: 'activity' },
    { key: 'patrimoine',        label: 'Patrimoine',         icon: 'layers' },
    { key: 'performance',       label: 'Performance',        icon: 'trending-up' },
    { key: 'allocation',        label: 'Allocation',         icon: 'pie-chart' },
    { key: 'radar',             label: 'Radar financier',    icon: 'shield' },
    { key: 'scorecard',         label: 'Scorecard',          icon: 'award' },

    { type: 'divider', label: '� Marchés & Investissements' },
    { key: 'bourse',            label: 'Bourse en direct',   icon: 'trending-up', badge: 'LIVE', badgeType: 'live' },
    { key: 'portefeuille',      label: 'Mon portefeuille',   icon: 'briefcase' },
    { key: 'immobilier',        label: 'Simulateur immo',    icon: 'home' },

    { type: 'divider', label: '�🔧 Outils d\'analyse' },
    { key: 'projections',       label: 'Projections',        icon: 'trending-up' },
    { key: 'retirement',        label: 'Retraite',           icon: 'clock' },
    { key: 'retraiteImmersive', label: 'Retraite immersive', icon: 'compass' },
    { key: 'fire',              label: 'FIRE',               icon: 'zap' },
    { key: 'debt',              label: 'Dettes',             icon: 'lock' },
    { key: 'credit',            label: 'Simulateur crédit',  icon: 'home' },
    { key: 'dividendes',        label: 'Dividendes',         icon: 'dollar-sign' },
    { key: 'interets',          label: 'Intérêts composés',  icon: 'percent' },
    { key: 'whatif',             label: 'What-If',            icon: 'zap', badge: 'SIM', badgeType: 'sim' },
    { key: 'comparateur',       label: 'Comparateur',        icon: 'bar-chart-2' },
    { key: 'stresstest',        label: 'Stress Test',        icon: 'alert' },
    { key: 'esg',               label: 'Score ESG',          icon: 'globe' },
    { key: 'fiscalite',         label: 'Optimiseur fiscal',  icon: 'percent' },
    { key: 'heatmap',           label: 'Heatmap',            icon: 'activity' },
    { key: 'benchmark',         label: 'Benchmark',          icon: 'bar-chart-2' },

    { type: 'divider', label: '🎮 Gamification' },
    { key: 'badges',            label: 'Badges',             icon: 'star' },
    { key: 'defis',             label: 'Défis mensuels',     icon: 'target' },
    { key: 'timeline',          label: 'Timeline',           icon: 'clock' },
    { key: 'simulationVie',     label: 'Vie alternative',    icon: 'clock' },

    { type: 'divider', label: '📚 Ressources' },
    { key: 'advice',            label: 'Conseils',           icon: 'star' },
    { key: 'copilot',           label: 'Copilot IA',         icon: 'sparkles', badge: 'IA', badgeType: 'ai' },
    { key: 'ai',                label: 'Prompts IA',         icon: 'sparkles', badge: 'IA', badgeType: 'ai' },
    { key: 'cours',             label: 'Mini-cours',         icon: 'book' },
    { key: 'glossaire',         label: 'Glossaire',          icon: 'book' },
    { key: 'news',              label: 'Actualités',         icon: 'newspaper', badge: 'LIVE', badgeType: 'live' },

    { type: 'divider', label: '📋 Suivi' },
    { key: 'budget',            label: 'Budget mensuel',     icon: 'wallet' },
    { key: 'kanban',            label: 'Objectifs',          icon: 'target' },
    { key: 'alertes',           label: 'Alertes',            icon: 'bell' },
    { key: 'journal',           label: 'Journal',            icon: 'edit' },
    { key: 'partage',           label: 'Partager',           icon: 'share' },

    { type: 'divider', label: '⚙️ Système' },
    { key: 'account',            label: 'Mon compte',        icon: 'user' },
    { key: 'permissions',       label: 'Mes autorisations', icon: 'lock' },
    { key: 'admin',             label: 'Administration',    icon: 'shield', adminOnly: true, badge: 'ADM', badgeType: 'admin' },
    { key: 'themes',            label: 'Thèmes',            icon: 'palette' },
    { key: 'settings',          label: 'Paramètres',        icon: 'settings' }
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
      UI.el('span', { className: 'sidebar__title', textContent: 'FinVest' }),
      UI.createNotificationBell ? UI.createNotificationBell() : UI.el('span')
    ]);
    sidebar.appendChild(header);

    // Search hint
    const searchHint = UI.el('div', { className: 'sidebar__search-hint', onClick: () => { if (UI.openSearch) UI.openSearch(); } });
    searchHint.innerHTML = '<span>🔍 Rechercher...</span><kbd>Ctrl+K</kbd>';
    sidebar.appendChild(searchHint);

    // Nav links
    const nav = UI.el('nav', { className: 'sidebar__nav', id: 'sidebar-nav' });
    for (const item of NAV_ITEMS) {
      if (item.type === 'divider') {
        nav.appendChild(UI.el('div', { className: 'nav-divider', textContent: item.label }));
        continue;
      }
      // Hide admin-only items for non-admins
      if (item.adminOnly && typeof AccessControl !== 'undefined' && !AccessControl.isAdmin()) continue;
      const link = UI.el('a', {
        className: 'nav-link',
        href: '#',
        dataset: { view: item.key },
        onClick: e => { e.preventDefault(); navigateTo(item.key); }
      }, [
        UI.icon(item.icon, 18),
        UI.el('span', { className: 'nav-link__label', textContent: item.label }),
        ...(item.badge ? [UI.el('span', { className: `nav-badge nav-badge--${item.badgeType || 'new'}`, textContent: item.badge })] : [])
      ]);
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

    // Mobile sidebar backdrop
    const backdrop = UI.el('div', { className: 'sidebar-backdrop', id: 'sidebar-backdrop', onClick: closeSidebar });

    root.appendChild(hamburger);
    root.appendChild(backdrop);
    root.appendChild(sidebar);
    root.appendChild(main);
  }

  /* ---------- Toggle sidebar (mobile) ------------------------ */
  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.toggle('sidebar--open', sidebarCollapsed);
    if (backdrop) backdrop.classList.toggle('sidebar-backdrop--visible', sidebarCollapsed);
    document.body.classList.toggle('sidebar-open', sidebarCollapsed);
  }

  function closeSidebar() {
    sidebarCollapsed = false;
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('sidebar--open');
    if (backdrop) backdrop.classList.remove('sidebar-backdrop--visible');
    document.body.classList.remove('sidebar-open');
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
      // Built-in access control views
      if (view === 'admin' && typeof AccessControl !== 'undefined') {
        AccessControl.renderAdminPanel(main);
      } else if (view === 'permissions' && typeof AccessControl !== 'undefined') {
        AccessControl.renderMyPermissions(main);
      } else if (view === 'account' && typeof AccessControl !== 'undefined') {
        AccessControl.renderAccountPanel(main);
      } else {
        const viewFn = Views[view];
        if (viewFn) {
          viewFn(main);
        } else {
          main.innerHTML = `<div class="empty-state"><h3>Vue inconnue : ${view}</h3></div>`;
        }
      }

      main.classList.remove('main--transitioning');
      updateNav(view);
      currentView = view;

      // Close mobile sidebar after navigation
      closeSidebar();
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

    // Re-render when step changes (handles async cloud load, import, etc.)
    let _lastStep = Store.getState().step;
    let _stepRenderTimer = null;
    Store.subscribe((s) => {
      if (s.step !== _lastStep) {
        _lastStep = s.step;
        // Debounce to avoid double render when setState + navigateTo are called together
        if (_stepRenderTimer) clearTimeout(_stepRenderTimer);
        _stepRenderTimer = setTimeout(() => { _stepRenderTimer = null; renderApp(); }, 50);
      }
    });

    // ── Keyboard shortcuts ──────────────────────────────────────
    document.addEventListener('keydown', e => {
      // Ctrl+K → Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (UI.openSearch) UI.openSearch();
      }
      // Escape → close sidebar on mobile
      if (e.key === 'Escape') {
        const sb = document.getElementById('sidebar');
        if (sb && sb.classList.contains('sidebar--open')) {
          closeSidebar();
        }
      }
    });

    // ── Onboarding (first visit) ────────────────────────────────
    const s = Store.getState();
    if (!s.onboardingDone && s.step === 'dashboard' && UI.startOnboarding) {
      setTimeout(() => {
        UI.startOnboarding();
        Store.setState({ onboardingDone: true });
      }, 1500);
    }

    // ── Generate initial notifications ──────────────────────────
    if (s.analysis && window.FinMarket) {
      const notifs = window.FinMarket.generateNotifications(s.profile, s.analysis);
      for (const n of notifs.slice(0, 5)) {
        Store.addNotification(n);
      }
    }

    // ── Access Control init ─────────────────────────────────
    if (typeof AccessControl !== 'undefined') {
      AccessControl.init().then(() => {
        // Rebuild sidebar after permissions load (admin items visibility)
        const nav = document.getElementById('sidebar-nav');
        if (nav && AccessControl.isAdmin()) {
          // Re-render sidebar to show admin item
          buildShell();
          renderApp();
        }
      }).catch(() => {});
    }

    // ── AI Chat init ─────────────────────────────────────────
    if (typeof FinAI !== 'undefined') {
      FinAI.init();
    }

    // ── Update AI context on navigation ─────────────────────
    Store.subscribe((s) => {
      if (typeof FinAI !== 'undefined' && s.currentView) {
        FinAI.setPageContext(s.currentView);
      }
    });

    console.log('[FinVest] Application initialized — Phase 1+2+3 (Admin + AI) loaded');
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
