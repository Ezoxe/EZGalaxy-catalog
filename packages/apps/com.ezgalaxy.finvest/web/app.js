/* ================================================================
   FinVest — app.js  (Main Application Controller)
   IIFE — boots the SPA, handles navigation, sidebar, responsive
   Exposes: window.navigateTo, window.renderApp
   ================================================================ */
(() => {
  'use strict';

  let currentView = null;
  let sidebarCollapsed = false;
  let _isMobile = false;
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

    { type: 'divider', label: '📈 Marchés & Investissements' },
    { key: 'bourse',            label: 'Bourse en direct',   icon: 'trending-up', badge: 'LIVE', badgeType: 'live' },
    { key: 'portefeuille',      label: 'Mon portefeuille',   icon: 'briefcase' },
    { key: 'immobilier',        label: 'Simulateur immo',    icon: 'home' },

    { type: 'divider', label: '🔧 Outils d\'analyse' },
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

      // Sync mobile nav tab bar with current view
      if (typeof MobileNav !== 'undefined' && MobileNav.isActive()) {
        MobileNav.syncWithView(view);
      }
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

    // Push browser history for mobile back button
    try {
      if (window.history && window.history.pushState) {
        window.history.pushState({ view }, '', '#' + view);
      }
    } catch (_) {}
    Store.setState({ currentView: view });
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
  /* ---------- Desktop install popup (web version) ------------- */
  let _desktopDeferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _desktopDeferredPrompt = e;
  });

  function _showDesktopInstallPopup() {
    // Don't show if already dismissed this session
    try {
      if (sessionStorage.getItem('finvest_install_dismissed')) return;
    } catch (_) {}

    // Delay to not interrupt first interaction
    setTimeout(() => {
      const popup = document.createElement('div');
      popup.id = 'desktop-install-popup';
      popup.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 9000;
        max-width: 340px; width: calc(100% - 48px);
        background: rgba(20,27,45,0.95); backdrop-filter: blur(16px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px; padding: 20px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        transform: translateY(120%); opacity: 0;
        transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      popup.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:12px">
          <div style="font-size:32px;flex-shrink:0">📱</div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:4px">
              FinVest est disponible en application !
            </div>
            <div style="font-size:12px;color:#94a3b8;line-height:1.4">
              Installez FinVest sur votre téléphone ou ordinateur pour un accès rapide.
            </div>
          </div>
          <button id="dip-close" style="background:none;border:none;color:#64748b;font-size:18px;cursor:pointer;padding:0;line-height:1">✕</button>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button id="dip-install" style="
            flex:1;padding:10px;border:none;border-radius:10px;
            background:linear-gradient(135deg,#0ea5a4,#6366f1);
            color:#fff;font-weight:700;font-size:13px;cursor:pointer;
            transition:transform 0.15s;
          ">📥 Installer</button>
          <a href="install.html" style="
            flex:1;padding:10px;border:1px solid rgba(255,255,255,0.1);
            border-radius:10px;background:rgba(255,255,255,0.05);
            color:#94a3b8;font-weight:600;font-size:13px;cursor:pointer;
            text-decoration:none;text-align:center;
            transition:background 0.15s;
          ">En savoir plus</a>
        </div>
      `;
      document.body.appendChild(popup);

      // Animate in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          popup.style.transform = 'translateY(0)';
          popup.style.opacity = '1';
        });
      });

      const dismiss = () => {
        popup.style.transform = 'translateY(120%)';
        popup.style.opacity = '0';
        setTimeout(() => popup.remove(), 400);
        try { sessionStorage.setItem('finvest_install_dismissed', '1'); } catch (_) {}
      };

      popup.querySelector('#dip-close').addEventListener('click', dismiss);

      popup.querySelector('#dip-install').addEventListener('click', async () => {
        if (_desktopDeferredPrompt) {
          _desktopDeferredPrompt.prompt();
          const { outcome } = await _desktopDeferredPrompt.userChoice;
          _desktopDeferredPrompt = null;
          if (outcome === 'accepted') dismiss();
        } else {
          // Redirect to install page
          window.location.href = 'install.html';
        }
      });

      // Auto-dismiss after 15s
      setTimeout(() => { if (document.getElementById('desktop-install-popup')) dismiss(); }, 15000);
    }, 5000); // 5s delay
  }

  function init() {
    // Initialize store (loads from localStorage)
    Store.init();

    // ── Detect PWA standalone mode ──────────────────────────────
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true;
    if (isPWA) {
      document.body.classList.add('is-pwa');
      console.log('[FinVest] Running as installed PWA');
    }

    // ── Device detection (EZGalaxy SDK) ──────────────────────────
    if (typeof ezgalaxy !== 'undefined' && ezgalaxy.device) {
      ezgalaxy.device.info().then(info => {
        _isMobile = info.isMobile;
        window._isMobile = _isMobile;
        document.body.classList.add(info.platform); // 'mobile', 'tablet', 'desktop'
        console.log('[FinVest] Device:', info.platform, 'isMobile:', info.isMobile);
      }).catch(e => console.warn('[FinVest] Device detection failed:', e));

      ezgalaxy.device.onChange(function(info) {
        _isMobile = info.isMobile;
        window._isMobile = _isMobile;
        document.body.className = document.body.className
          .replace(/\b(mobile|tablet|desktop)\b/g, '').trim();
        document.body.classList.add(info.platform);
        console.log('[FinVest] Device changed:', info.platform);
      });
    }

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

    // ── Mobile Navigation init ──────────────────────────────
    if (typeof MobileNav !== 'undefined') {
      MobileNav.init();
      console.log('[FinVest] Mobile navigation initialized');
    }

    // ── Update AI context on navigation ─────────────────────
    Store.subscribe((s) => {
      if (typeof FinAI !== 'undefined' && s.currentView) {
        FinAI.setPageContext(s.currentView);
      }
    });

    // ── Desktop PWA install popup ──────────────────────────────
    // Show a subtle popup on the web version to inform users about
    // the installable app (desktop + tablet, not mobile — mobile
    // uses MobileNav's own install banner).
    if (!isPWA && window.innerWidth > 768) {
      _showDesktopInstallPopup();
    }

    console.log('[FinVest] Application initialized — Phase 1+2+3 (Admin + AI + Mobile PWA) loaded');

    // ── Handle browser back button for mobile ───────────────
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.view) {
        navigateTo(e.state.view);
      }
    });
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
