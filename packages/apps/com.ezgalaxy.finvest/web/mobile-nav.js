/* ================================================================
   FinVest — mobile-nav.js  (Mobile Navigation: Bottom Tab Bar + Drawer)
   Provides native-feel mobile navigation with 5 bottom tabs and a
   slide-out drawer for all secondary views.
   Exposes: window.MobileNav
   ================================================================ */
(() => {
  'use strict';

  /* ---------- Configuration ---------------------------------- */
  const MOBILE_BREAKPOINT = 768;
  let _isActive = false;
  let _drawerOpen = false;
  let _currentTab = 'home';
  let _touchStartX = 0;
  let _touchStartY = 0;
  let _drawerEl = null;
  let _backdropEl = null;

  /* ---------- Tab definitions --------------------------------- */
  const TABS = [
    { key: 'home',    label: 'Accueil',  icon: 'home',        defaultView: 'overview' },
    { key: 'markets', label: 'Marchés',  icon: 'trending-up', defaultView: 'bourse' },
    { key: 'tools',   label: 'Outils',   icon: 'tool',        defaultView: 'allocation' },
    { key: 'progress',label: 'Parcours', icon: 'award',       defaultView: 'badges' },
    { key: 'more',    label: 'Plus',     icon: 'menu',        defaultView: null }
  ];

  /* ---------- Tab → views mapping ----------------------------- */
  const TAB_VIEWS = {
    home:     ['overview', 'enhancedOverview', 'patrimoine', 'performance', 'welcome', 'questionnaire'],
    markets:  ['bourse', 'portefeuille', 'immobilier'],
    tools:    ['allocation', 'projections', 'retirement', 'retraiteImmersive', 'fire', 'debt', 'credit',
               'dividendes', 'interets', 'whatif', 'comparateur', 'stresstest', 'esg', 'fiscalite',
               'heatmap', 'benchmark', 'radar', 'scorecard', 'budget', 'simulationVie'],
    progress: ['badges', 'defis', 'timeline', 'cours', 'glossaire']
  };

  /* ---------- Drawer sections --------------------------------- */
  const DRAWER_SECTIONS = [
    {
      label: '📊 Analyses',
      items: [
        { key: 'overview',    label: 'Vue d\'ensemble',    icon: 'activity' },
        { key: 'patrimoine',  label: 'Patrimoine',         icon: 'layers' },
        { key: 'performance', label: 'Performance',        icon: 'trending-up' },
        { key: 'allocation',  label: 'Allocation',         icon: 'pie-chart' },
        { key: 'radar',       label: 'Radar financier',    icon: 'shield' },
        { key: 'scorecard',   label: 'Scorecard',          icon: 'award' }
      ]
    },
    {
      label: '📈 Marchés',
      items: [
        { key: 'bourse',       label: 'Bourse en direct',  icon: 'trending-up', badge: 'LIVE' },
        { key: 'portefeuille', label: 'Mon portefeuille',  icon: 'briefcase' },
        { key: 'immobilier',   label: 'Simulateur immo',   icon: 'home' }
      ]
    },
    {
      label: '🔧 Outils',
      items: [
        { key: 'projections',       label: 'Projections',        icon: 'trending-up' },
        { key: 'retirement',        label: 'Retraite',           icon: 'clock' },
        { key: 'retraiteImmersive', label: 'Retraite immersive', icon: 'compass' },
        { key: 'fire',              label: 'FIRE',               icon: 'zap' },
        { key: 'debt',              label: 'Dettes',             icon: 'lock' },
        { key: 'credit',            label: 'Simulateur crédit',  icon: 'home' },
        { key: 'dividendes',        label: 'Dividendes',         icon: 'dollar-sign' },
        { key: 'interets',          label: 'Intérêts composés',  icon: 'percent' },
        { key: 'whatif',            label: 'What-If',            icon: 'zap' },
        { key: 'comparateur',       label: 'Comparateur',        icon: 'bar-chart-2' },
        { key: 'stresstest',        label: 'Stress Test',        icon: 'alert' },
        { key: 'esg',               label: 'Score ESG',          icon: 'globe' },
        { key: 'fiscalite',         label: 'Optimiseur fiscal',  icon: 'percent' },
        { key: 'heatmap',           label: 'Heatmap',            icon: 'activity' },
        { key: 'benchmark',         label: 'Benchmark',          icon: 'bar-chart-2' }
      ]
    },
    {
      label: '🎮 Gamification',
      items: [
        { key: 'badges',          label: 'Badges',            icon: 'star' },
        { key: 'defis',           label: 'Défis mensuels',    icon: 'target' },
        { key: 'timeline',        label: 'Timeline',          icon: 'clock' },
        { key: 'simulationVie',   label: 'Vie alternative',   icon: 'clock' }
      ]
    },
    {
      label: '📚 Ressources',
      items: [
        { key: 'advice',    label: 'Conseils',       icon: 'star' },
        { key: 'copilot',   label: 'Copilot IA',     icon: 'sparkles', badge: 'IA' },
        { key: 'ai',        label: 'Prompts IA',     icon: 'sparkles', badge: 'IA' },
        { key: 'cours',     label: 'Mini-cours',     icon: 'book' },
        { key: 'glossaire', label: 'Glossaire',      icon: 'book' },
        { key: 'news',      label: 'Actualités',     icon: 'newspaper', badge: 'LIVE' }
      ]
    },
    {
      label: '📋 Suivi & Planification',
      items: [
        { key: 'budget',    label: 'Budget mensuel', icon: 'wallet' },
        { key: 'kanban',    label: 'Objectifs',      icon: 'target' },
        { key: 'alertes',   label: 'Alertes',        icon: 'bell' },
        { key: 'journal',   label: 'Journal',        icon: 'edit' },
        { key: 'partage',   label: 'Partager',       icon: 'share' }
      ]
    },
    {
      label: '⚙️ Système',
      items: [
        { key: 'account',     label: 'Mon compte',        icon: 'user' },
        { key: 'permissions', label: 'Mes autorisations', icon: 'lock' },
        { key: 'admin',       label: 'Administration',    icon: 'shield', adminOnly: true },
        { key: 'themes',      label: 'Thèmes',            icon: 'palette' },
        { key: 'settings',    label: 'Paramètres',        icon: 'settings' }
      ]
    }
  ];

  /* ---------- Check if we should be active -------------------- */
  function shouldBeActive() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  /* ---------- Get tab for a view ------------------------------ */
  function getTabForView(view) {
    for (const [tab, views] of Object.entries(TAB_VIEWS)) {
      if (views.includes(view)) return tab;
    }
    return 'more';
  }

  /* ---------- Build bottom tab bar ---------------------------- */
  function buildTabBar(container) {
    const bar = UI.el('nav', { className: 'mobile-tab-bar', id: 'mobile-tab-bar' });

    for (const tab of TABS) {
      const btn = UI.el('button', {
        className: 'mobile-tab' + (_currentTab === tab.key ? ' mobile-tab--active' : ''),
        dataset: { tab: tab.key },
        onClick: (e) => {
          e.preventDefault();
          _handleTabTap(tab);
        }
      }, [
        UI.el('div', { className: 'mobile-tab__icon-wrap' }, [
          UI.icon(tab.icon, 22)
        ]),
        UI.el('span', { className: 'mobile-tab__label', textContent: tab.label })
      ]);

      // Ripple effect on touch
      btn.addEventListener('touchstart', _createRipple, { passive: true });

      bar.appendChild(btn);
    }

    container.appendChild(bar);
    return bar;
  }

  /* ---------- Build drawer ------------------------------------ */
  function buildDrawer(container) {
    // Backdrop
    _backdropEl = UI.el('div', {
      className: 'mobile-drawer-backdrop',
      id: 'mobile-drawer-backdrop',
      onClick: closeDrawer
    });
    container.appendChild(_backdropEl);

    // Drawer panel
    _drawerEl = UI.el('div', { className: 'mobile-drawer', id: 'mobile-drawer' });

    // Drawer header
    const header = UI.el('div', { className: 'mobile-drawer__header' }, [
      UI.el('div', { className: 'mobile-drawer__brand' }, [
        UI.el('span', { className: 'mobile-drawer__logo', textContent: '💹' }),
        UI.el('div', { className: 'mobile-drawer__titles' }, [
          UI.el('span', { className: 'mobile-drawer__title', textContent: 'FinVest' }),
          UI.el('span', { className: 'mobile-drawer__subtitle', textContent: 'Analyse Financière' })
        ])
      ]),
      UI.el('button', {
        className: 'mobile-drawer__close',
        onClick: closeDrawer
      }, [UI.icon('x', 22)])
    ]);
    _drawerEl.appendChild(header);

    // Cloud status
    const cloudStatus = UI.el('div', { className: 'mobile-drawer__cloud', id: 'mobile-drawer-cloud' });
    _drawerEl.appendChild(cloudStatus);

    // Search bar
    const search = UI.el('div', {
      className: 'mobile-drawer__search',
      onClick: () => { closeDrawer(); if (UI.openSearch) UI.openSearch(); }
    });
    search.innerHTML = '<span>🔍 Rechercher...</span>';
    _drawerEl.appendChild(search);

    // Scrollable nav sections
    const scrollArea = UI.el('div', { className: 'mobile-drawer__scroll' });

    for (const section of DRAWER_SECTIONS) {
      const group = UI.el('div', { className: 'mobile-drawer__section' });
      group.appendChild(UI.el('div', { className: 'mobile-drawer__section-label', textContent: section.label }));

      for (const item of section.items) {
        if (item.adminOnly && typeof AccessControl !== 'undefined' && !AccessControl.isAdmin()) continue;

        const link = UI.el('a', {
          className: 'mobile-drawer__link',
          href: '#',
          dataset: { view: item.key },
          onClick: (e) => {
            e.preventDefault();
            closeDrawer();
            if (typeof navigateTo === 'function') navigateTo(item.key);
          }
        }, [
          UI.icon(item.icon, 20),
          UI.el('span', { textContent: item.label }),
          ...(item.badge ? [UI.el('span', { className: `mobile-drawer__badge mobile-drawer__badge--${item.badge === 'LIVE' ? 'live' : item.badge === 'IA' ? 'ai' : 'default'}`, textContent: item.badge })] : [])
        ]);

        link.addEventListener('touchstart', _createRipple, { passive: true });
        group.appendChild(link);
      }

      scrollArea.appendChild(group);
    }

    _drawerEl.appendChild(scrollArea);

    // Drawer footer
    const footer = UI.el('div', { className: 'mobile-drawer__footer' }, [
      UI.el('button', {
        className: 'mobile-drawer__home-btn',
        onClick: () => {
          closeDrawer();
          if (Store) {
            Store.setState({ step: 'welcome' });
            if (typeof renderApp === 'function') renderApp();
          }
        }
      }, [UI.icon('home', 18), UI.el('span', { textContent: 'Écran d\'accueil' })]),
      UI.el('a', {
        className: 'mobile-drawer__install-link',
        href: './install.html',
        target: '_self'
      }, [UI.icon('download', 18), UI.el('span', { textContent: 'Installer l\'app' })])
    ]);
    _drawerEl.appendChild(footer);

    container.appendChild(_drawerEl);
  }

  /* ---------- Handle tab tap ---------------------------------- */
  function _handleTabTap(tab) {
    if (tab.key === 'more') {
      openDrawer();
      return;
    }

    // If already on this tab, go to default view
    const s = Store.getState();
    const currentTabForView = getTabForView(s.currentView || 'overview');

    _currentTab = tab.key;
    _updateTabBar();

    if (typeof navigateTo === 'function') {
      navigateTo(tab.defaultView);
    }
  }

  /* ---------- Update tab bar active state --------------------- */
  function _updateTabBar() {
    const bar = document.getElementById('mobile-tab-bar');
    if (!bar) return;
    bar.querySelectorAll('.mobile-tab').forEach(btn => {
      const isActive = btn.dataset.tab === _currentTab;
      btn.classList.toggle('mobile-tab--active', isActive);
    });
  }

  /* ---------- Sync tab bar with current view ------------------ */
  function syncWithView(view) {
    if (!_isActive) return;
    const tab = getTabForView(view);
    if (tab !== _currentTab) {
      _currentTab = tab;
      _updateTabBar();
    }
    // Update drawer active link
    _updateDrawerActiveLink(view);
  }

  /* ---------- Update drawer active link ----------------------- */
  function _updateDrawerActiveLink(view) {
    if (!_drawerEl) return;
    _drawerEl.querySelectorAll('.mobile-drawer__link').forEach(link => {
      link.classList.toggle('mobile-drawer__link--active', link.dataset.view === view);
    });
  }

  /* ---------- Open / Close drawer ----------------------------- */
  function openDrawer() {
    _drawerOpen = true;
    if (_drawerEl) _drawerEl.classList.add('mobile-drawer--open');
    if (_backdropEl) _backdropEl.classList.add('mobile-drawer-backdrop--visible');
    document.body.classList.add('drawer-open');
  }

  function closeDrawer() {
    _drawerOpen = false;
    if (_drawerEl) _drawerEl.classList.remove('mobile-drawer--open');
    if (_backdropEl) _backdropEl.classList.remove('mobile-drawer-backdrop--visible');
    document.body.classList.remove('drawer-open');
  }

  /* ---------- Update cloud status in drawer ------------------- */
  function updateDrawerCloud() {
    const el = document.getElementById('mobile-drawer-cloud');
    if (!el) return;
    const s = Store.getState();
    const map = {
      connected: { text: '☁️ Connecté', cls: 'cloud--connected' },
      syncing: { text: '🔄 Synchronisation...', cls: 'cloud--syncing' },
      error: { text: '⚠️ Erreur de sync', cls: 'cloud--error' },
      disconnected: { text: '☁️ Non connecté', cls: 'cloud--disconnected' }
    };
    const info = map[s.cloudStatus] || map.disconnected;
    el.innerHTML = `<span class="mobile-drawer__cloud-badge ${info.cls}">${info.text}</span>`;
  }

  /* ---------- Ripple effect ----------------------------------- */
  function _createRipple(e) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const ripple = document.createElement('span');
    ripple.className = 'mobile-ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x - size / 2}px;top:${y - size / 2}px;`;
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  }

  /* ---------- Gesture handling (swipe for drawer) ------------- */
  function _initGestures() {
    document.addEventListener('touchstart', (e) => {
      _touchStartX = e.touches[0].clientX;
      _touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!_isActive) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - _touchStartX;
      const dy = touch.clientY - _touchStartY;

      // Require mostly-horizontal swipe
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7) return;

      // Swipe right from left edge → open drawer
      if (dx > 0 && _touchStartX < 30 && !_drawerOpen) {
        openDrawer();
      }
      // Swipe left while drawer is open → close
      if (dx < 0 && _drawerOpen) {
        closeDrawer();
      }
    }, { passive: true });
  }

  /* ---------- Build mobile shell (replaces desktop shell) ----- */
  function buildMobileShell(root) {
    if (!shouldBeActive()) return false;
    _isActive = true;

    // Keep desktop sidebar hidden
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburger');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.style.display = 'none';
    if (hamburger) hamburger.style.display = 'none';
    if (backdrop) backdrop.style.display = 'none';

    // Add mobile class to body
    document.body.classList.add('is-mobile-app');

    // Build tab bar
    buildTabBar(root);

    // Build drawer
    buildDrawer(root);

    // Cloud sync
    if (Store) Store.subscribe(() => updateDrawerCloud());
    updateDrawerCloud();

    return true;
  }

  /* ---------- Activate / Deactivate on resize ----------------- */
  function _handleResize() {
    const shouldActivate = shouldBeActive();

    if (shouldActivate && !_isActive) {
      // Switching to mobile
      _isActive = true;
      document.body.classList.add('is-mobile-app');
      const root = document.getElementById('app');
      if (root) {
        // Remove existing mobile elements if any
        const existingBar = document.getElementById('mobile-tab-bar');
        const existingDrawer = document.getElementById('mobile-drawer');
        const existingBackdrop = document.getElementById('mobile-drawer-backdrop');
        if (existingBar) existingBar.remove();
        if (existingDrawer) existingDrawer.remove();
        if (existingBackdrop) existingBackdrop.remove();

        buildTabBar(root);
        buildDrawer(root);
      }
      // Hide desktop sidebar
      const sidebar = document.getElementById('sidebar');
      const hamburger = document.getElementById('hamburger');
      if (sidebar) sidebar.style.display = 'none';
      if (hamburger) hamburger.style.display = 'none';
    } else if (!shouldActivate && _isActive) {
      // Switching to desktop
      _isActive = false;
      document.body.classList.remove('is-mobile-app');
      closeDrawer();
      // Remove mobile elements
      const bar = document.getElementById('mobile-tab-bar');
      const drawer = document.getElementById('mobile-drawer');
      const backdrop = document.getElementById('mobile-drawer-backdrop');
      if (bar) bar.remove();
      if (drawer) drawer.remove();
      if (backdrop) backdrop.remove();
      // Show desktop sidebar
      const sidebar = document.getElementById('sidebar');
      const hamburger = document.getElementById('hamburger');
      if (sidebar) sidebar.style.display = '';
      if (hamburger) hamburger.style.display = '';
    }
  }

  // Debounced resize handler
  let _resizeTimer = null;
  window.addEventListener('resize', () => {
    if (_resizeTimer) clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(_handleResize, 150);
  });

  /* ---------- PWA Install Prompt ------------------------------ */
  let _deferredPrompt = null;
  let _installBannerShown = false;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    _showInstallBanner();
  });

  function _showInstallBanner() {
    // Check if user dismissed recently
    try {
      const dismissed = localStorage.getItem('finvest_install_dismissed');
      if (dismissed) {
        const dismissedAt = parseInt(dismissed, 10);
        if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return; // 7 days
      }
    } catch (_) {}

    if (_installBannerShown) return;
    _installBannerShown = true;

    // Show quickly after page load
    setTimeout(() => {
      const banner = UI.el('div', { className: 'mobile-install-banner', id: 'install-banner' }, [
        UI.el('div', { className: 'mobile-install-banner__content' }, [
          UI.el('span', { className: 'mobile-install-banner__icon', textContent: '📱' }),
          UI.el('div', { className: 'mobile-install-banner__text' }, [
            UI.el('strong', { textContent: 'Installer FinVest' }),
            UI.el('p', { textContent: 'Accédez à FinVest depuis votre écran d\'accueil' })
          ])
        ]),
        UI.el('div', { className: 'mobile-install-banner__actions' }, [
          UI.el('button', {
            className: 'mobile-install-banner__btn mobile-install-banner__btn--install',
            textContent: 'Installer',
            onClick: () => _triggerInstall()
          }),
          UI.el('button', {
            className: 'mobile-install-banner__btn mobile-install-banner__btn--later',
            textContent: 'Plus tard',
            onClick: () => _dismissInstallBanner()
          })
        ])
      ]);

      document.body.appendChild(banner);
      // Animate in
      requestAnimationFrame(() => banner.classList.add('mobile-install-banner--visible'));
    }, 800);
  }

  function _triggerInstall() {
    if (_deferredPrompt) {
      _deferredPrompt.prompt();
      _deferredPrompt.userChoice.then(choice => {
        if (choice.outcome === 'accepted') {
          UI.toast('✅ Installation en cours...', 'success');
        }
        _deferredPrompt = null;
        _dismissInstallBanner();
      });
    } else {
      // Fallback: redirect to install page
      window.location.href = './install.html';
    }
  }

  function _dismissInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) {
      banner.classList.remove('mobile-install-banner--visible');
      setTimeout(() => banner.remove(), 400);
    }
    try { localStorage.setItem('finvest_install_dismissed', Date.now().toString()); } catch (_) {}
  }

  /* ---------- iOS Install Toast ------------------------------- */
  function _checkiOSInstallHint() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) {
      try {
        const shown = localStorage.getItem('finvest_ios_hint_shown');
        if (shown) {
          const shownAt = parseInt(shown, 10);
          if (Date.now() - shownAt < 7 * 24 * 60 * 60 * 1000) return;
        }
      } catch (_) {}

      setTimeout(() => {
        const hint = UI.el('div', { className: 'mobile-ios-hint', id: 'ios-hint' }, [
          UI.el('div', { className: 'mobile-ios-hint__content' }, [
            UI.el('span', { textContent: '📱 Pour installer FinVest : appuyez sur ' }),
            UI.el('span', { className: 'mobile-ios-hint__icon', innerHTML: '&#x2191;' }), // Share icon
            UI.el('span', { textContent: ' puis « Sur l\'écran d\'accueil »' })
          ]),
          UI.el('button', {
            className: 'mobile-ios-hint__close',
            textContent: '✕',
            onClick: () => {
              const el = document.getElementById('ios-hint');
              if (el) el.remove();
              try { localStorage.setItem('finvest_ios_hint_shown', Date.now().toString()); } catch (_) {}
            }
          })
        ]);
        document.body.appendChild(hint);
        requestAnimationFrame(() => hint.classList.add('mobile-ios-hint--visible'));
      }, 1200);
    }
  }

  /* ---------- Persistent install button (bottom of page) ------- */
  function _addPersistentInstallBtn() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    if (isStandalone) return;

    const btn = UI.el('a', {
      className: 'mobile-install-persistent',
      id: 'persistent-install-btn',
      href: './install.html'
    }, [
      UI.el('span', { className: 'mobile-install-persistent__icon', textContent: '📲' }),
      UI.el('span', { className: 'mobile-install-persistent__text', textContent: 'Installer l\'app' })
    ]);

    // Also allow direct install if prompt available
    btn.addEventListener('click', (e) => {
      if (_deferredPrompt) {
        e.preventDefault();
        _deferredPrompt.prompt();
        _deferredPrompt.userChoice.then(choice => {
          if (choice.outcome === 'accepted') {
            btn.remove();
            UI.toast('✅ Installation en cours...', 'success');
          }
          _deferredPrompt = null;
        });
      }
      // else: follow the href to install.html
    });

    document.body.appendChild(btn);
  }

  /* ---------- Init -------------------------------------------- */
  function init() {
    if (shouldBeActive()) {
      const root = document.getElementById('app');
      if (root) buildMobileShell(root);
    }
    _initGestures();
    _checkiOSInstallHint();
    _addPersistentInstallBtn();
  }

  /* ---------- Public API -------------------------------------- */
  window.MobileNav = {
    init,
    buildMobileShell,
    syncWithView,
    openDrawer,
    closeDrawer,
    isActive: () => _isActive,
    getTabForView,
    updateDrawerCloud
  };
})();
