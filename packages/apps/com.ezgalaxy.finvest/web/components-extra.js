/* ================================================================
   FinVest — components-extra.js  (Enhanced UI Components)
   Extends window.UI with new components:
   - Search modal (Ctrl+K)
   - Notification bell + panel
   - Count-up animation
   - Confetti celebration
   - Onboarding tour
   - Sparkline mini-chart
   - Ticker tape
   - XP bar
   - Floating summary widget
   ================================================================ */
(() => {
  'use strict';

  const { el, icon, toast } = window.UI;

  /* ============================================================
     1. GLOBAL SEARCH (Ctrl+K)
     ============================================================ */
  let searchOverlay = null;

  function openSearch() {
    if (searchOverlay) return;

    const NAV_ITEMS = [
      { key: 'overview', label: 'Vue d\'ensemble', icon: 'activity', section: 'Tableaux de bord' },
      { key: 'patrimoine', label: 'Patrimoine', icon: 'layers', section: 'Tableaux de bord' },
      { key: 'performance', label: 'Performance', icon: 'trending-up', section: 'Tableaux de bord' },
      { key: 'allocation', label: 'Allocation', icon: 'pie-chart', section: 'Tableaux de bord' },
      { key: 'radar', label: 'Radar financier', icon: 'shield', section: 'Tableaux de bord' },
      { key: 'scorecard', label: 'Scorecard', icon: 'award', section: 'Tableaux de bord' },
      { key: 'bourse', label: 'Bourse en direct', icon: 'trending-up', section: 'Marchés' },
      { key: 'portefeuille', label: 'Mon portefeuille', icon: 'briefcase', section: 'Marchés' },
      { key: 'projections', label: 'Projections', icon: 'trending-up', section: 'Outils' },
      { key: 'retirement', label: 'Retraite', icon: 'clock', section: 'Outils' },
      { key: 'fire', label: 'FIRE', icon: 'zap', section: 'Outils' },
      { key: 'debt', label: 'Dettes', icon: 'lock', section: 'Outils' },
      { key: 'credit', label: 'Simulateur crédit', icon: 'home', section: 'Outils' },
      { key: 'immobilier', label: 'Simulateur immobilier', icon: 'home', section: 'Outils' },
      { key: 'dividendes', label: 'Dividendes', icon: 'dollar-sign', section: 'Outils' },
      { key: 'interets', label: 'Intérêts composés', icon: 'percent', section: 'Outils' },
      { key: 'whatif', label: 'What-If', icon: 'zap', section: 'Outils' },
      { key: 'comparateur', label: 'Comparateur', icon: 'bar-chart-2', section: 'Outils' },
      { key: 'stresstest', label: 'Stress Test', icon: 'alert', section: 'Outils' },
      { key: 'esg', label: 'Score ESG', icon: 'globe', section: 'Outils' },
      { key: 'fiscalite', label: 'Optimiseur fiscal', icon: 'percent', section: 'Outils' },
      { key: 'heatmap', label: 'Heatmap', icon: 'activity', section: 'Outils' },
      { key: 'benchmark', label: 'Benchmark', icon: 'bar-chart-2', section: 'Outils' },
      { key: 'badges', label: 'Badges', icon: 'star', section: 'Gamification' },
      { key: 'defis', label: 'Défis mensuels', icon: 'target', section: 'Gamification' },
      { key: 'advice', label: 'Conseils', icon: 'star', section: 'Ressources' },
      { key: 'copilot', label: 'Copilot IA', icon: 'sparkles', section: 'Ressources' },
      { key: 'ai', label: 'Prompts IA', icon: 'sparkles', section: 'Ressources' },
      { key: 'cours', label: 'Mini-cours', icon: 'book', section: 'Ressources' },
      { key: 'glossaire', label: 'Glossaire', icon: 'book', section: 'Ressources' },
      { key: 'news', label: 'Actualités', icon: 'newspaper', section: 'Ressources' },
      { key: 'budget', label: 'Budget mensuel', icon: 'wallet', section: 'Suivi' },
      { key: 'kanban', label: 'Objectifs', icon: 'target', section: 'Suivi' },
      { key: 'alertes', label: 'Alertes', icon: 'bell', section: 'Suivi' },
      { key: 'journal', label: 'Journal', icon: 'edit', section: 'Suivi' },
      { key: 'themes', label: 'Thèmes', icon: 'palette', section: 'Système' },
      { key: 'settings', label: 'Paramètres', icon: 'settings', section: 'Système' }
    ];

    searchOverlay = el('div', { className: 'search-overlay ez-fade-in' });
    const searchBox = el('div', { className: 'search-box ez-pop' });

    const searchInput = el('input', {
      type: 'text',
      className: 'search-input',
      placeholder: 'Rechercher une vue, un outil, un terme...',
    });

    const resultsList = el('div', { className: 'search-results' });
    const hintBar = el('div', { className: 'search-hint' });
    hintBar.innerHTML = '<span>↑↓ naviguer</span><span>↵ ouvrir</span><span>Esc fermer</span>';

    let selectedIdx = 0;
    let filteredItems = [...NAV_ITEMS];

    function renderResults() {
      resultsList.innerHTML = '';
      const glossary = (window.FinExtra && window.FinExtra.GLOSSARY) || [];
      const query = searchInput.value.toLowerCase().trim();

      // Filter nav items
      filteredItems = NAV_ITEMS.filter(item =>
        item.label.toLowerCase().includes(query) ||
        item.key.toLowerCase().includes(query) ||
        item.section.toLowerCase().includes(query)
      );

      // Add glossary matches
      if (query.length >= 2) {
        const glossaryMatches = glossary.filter(g =>
          g.term.toLowerCase().includes(query) || g.def.toLowerCase().includes(query)
        ).slice(0, 3);
        for (const g of glossaryMatches) {
          filteredItems.push({ key: 'glossaire', label: `📖 ${g.term}`, icon: 'book', section: 'Glossaire', sublabel: g.def.slice(0, 60) + '...' });
        }
      }

      if (filteredItems.length === 0) {
        resultsList.appendChild(el('div', { className: 'search-empty', textContent: 'Aucun résultat' }));
        return;
      }

      selectedIdx = Math.min(selectedIdx, filteredItems.length - 1);

      let lastSection = '';
      filteredItems.forEach((item, i) => {
        if (item.section !== lastSection) {
          resultsList.appendChild(el('div', { className: 'search-section', textContent: item.section }));
          lastSection = item.section;
        }
        const row = el('div', {
          className: `search-result ${i === selectedIdx ? 'search-result--active' : ''}`,
          onClick: () => { closeSearch(); window.navigateTo(item.key); }
        }, [
          icon(item.icon, 18),
          el('div', { className: 'search-result__text' }, [
            el('span', { className: 'search-result__label', textContent: item.label }),
            item.sublabel ? el('span', { className: 'search-result__sub', textContent: item.sublabel }) : null
          ].filter(Boolean)),
          el('span', { className: 'search-result__shortcut', textContent: '↵' })
        ]);
        resultsList.appendChild(row);
      });
    }

    searchInput.addEventListener('input', () => { selectedIdx = 0; renderResults(); });
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx + 1, filteredItems.length - 1); renderResults(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(selectedIdx - 1, 0); renderResults(); }
      else if (e.key === 'Enter' && filteredItems[selectedIdx]) { closeSearch(); window.navigateTo(filteredItems[selectedIdx].key); }
      else if (e.key === 'Escape') { closeSearch(); }
    });

    searchOverlay.addEventListener('click', e => { if (e.target === searchOverlay) closeSearch(); });

    searchBox.appendChild(el('div', { className: 'search-header' }, [
      icon('activity', 20),
      searchInput,
      el('kbd', { textContent: 'Esc' })
    ]));
    searchBox.appendChild(resultsList);
    searchBox.appendChild(hintBar);
    searchOverlay.appendChild(searchBox);
    document.body.appendChild(searchOverlay);

    renderResults();
    setTimeout(() => searchInput.focus(), 100);
  }

  function closeSearch() {
    if (searchOverlay) {
      searchOverlay.classList.add('search-overlay--hide');
      setTimeout(() => { if (searchOverlay) { searchOverlay.remove(); searchOverlay = null; } }, 200);
    }
  }

  // Register global shortcut
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  });

  /* ============================================================
     2. NOTIFICATION BELL & PANEL
     ============================================================ */
  function createNotificationBell(container) {
    const state = Store.getState();
    const notifs = window.FinMarket ? FinMarket.generateNotifications(state.profile, state.analysis) : [];
    const unread = notifs.length;

    const bell = el('button', {
      className: 'notification-bell',
      onClick: () => toggleNotificationPanel(notifs)
    }, [
      icon('bell', 20),
      unread > 0 ? el('span', { className: 'notification-badge', textContent: unread > 9 ? '9+' : unread }) : null
    ].filter(Boolean));

    return bell;
  }

  let notifPanel = null;

  function toggleNotificationPanel(notifs) {
    if (notifPanel) {
      notifPanel.remove();
      notifPanel = null;
      return;
    }

    notifPanel = el('div', { className: 'notification-panel ez-pop' });
    const header = el('div', { className: 'notification-panel__header' }, [
      el('h3', { textContent: `Notifications (${notifs.length})` }),
      el('button', { className: 'btn btn--ghost btn--sm', textContent: '✕', onClick: () => { notifPanel.remove(); notifPanel = null; } })
    ]);
    notifPanel.appendChild(header);

    if (notifs.length === 0) {
      notifPanel.appendChild(el('div', { className: 'notification-empty', textContent: '🎉 Aucune notification' }));
    } else {
      const list = el('div', { className: 'notification-list' });
      for (const n of notifs) {
        const typeColors = { critical: 'var(--ez-danger)', warning: 'var(--ez-warning)', info: 'var(--ez-primary)', success: 'var(--ez-success)' };
        const item = el('div', { className: `notification-item notification-item--${n.type}` }, [
          el('span', { className: 'notification-item__icon', textContent: n.icon }),
          el('div', { className: 'notification-item__body' }, [
            el('strong', { textContent: n.title }),
            el('p', { textContent: n.message }),
            el('span', { className: 'notification-item__cat', textContent: n.category })
          ])
        ]);
        item.style.borderLeftColor = typeColors[n.type] || typeColors.info;
        list.appendChild(item);
      }
      notifPanel.appendChild(list);
    }

    document.body.appendChild(notifPanel);

    // Close on outside click
    const closeHandler = (e) => {
      if (notifPanel && !notifPanel.contains(e.target) && !e.target.closest('.notification-bell')) {
        notifPanel.remove();
        notifPanel = null;
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 100);
  }

  /* ============================================================
     3. COUNT-UP ANIMATION
     ============================================================ */
  function countUp(element, target, duration = 1200, prefix = '', suffix = '') {
    const start = 0;
    const startTime = performance.now();

    function easeOut(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value = Math.round(start + (target - start) * easeOut(progress));
      element.textContent = prefix + value.toLocaleString('fr-FR') + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  /* ============================================================
     4. CONFETTI CELEBRATION
     ============================================================ */
  function confetti(duration = 3000) {
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const particles = [];
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#14b8a6', '#ef4444'];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    const startTime = performance.now();
    function draw(now) {
      const elapsed = now - startTime;
      if (elapsed > duration) {
        canvas.remove();
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.rotation += p.rotationSpeed;
        if (elapsed > duration * 0.7) p.opacity = Math.max(0, 1 - (elapsed - duration * 0.7) / (duration * 0.3));

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  /* ============================================================
     5. SPARKLINE (inline SVG mini-chart)
     ============================================================ */
  function sparkline(data, width = 80, height = 24, color) {
    if (!data || data.length < 2) return el('span', { textContent: '—' });
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const autoColor = data[data.length - 1] >= data[0] ? 'var(--ez-success)' : 'var(--ez-danger)';
    const strokeColor = color || autoColor;

    const points = data.map((v, i) => `${round(i * stepX, 1)},${round(height - ((v - min) / range) * (height - 4) - 2, 1)}`).join(' ');
    const container = el('span', { className: 'sparkline-container' });
    container.innerHTML = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <polyline points="${points}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    return container;
  }

  function round(v, d) { const m = Math.pow(10, d); return Math.round(v * m) / m; }

  /* ============================================================
     6. TICKER TAPE (scrolling market data)
     ============================================================ */
  function tickerTape() {
    if (!window.FinMarket) return el('div');
    const indices = FinMarket.getAllIndices();
    const tape = el('div', { className: 'ticker-tape' });
    const track = el('div', { className: 'ticker-track' });

    // Duplicate for seamless looping
    for (let rep = 0; rep < 2; rep++) {
      for (const idx of indices) {
        const changeClass = idx.changePct >= 0 ? 'ticker-up' : 'ticker-down';
        const item = el('span', { className: `ticker-item ${changeClass}` });
        item.innerHTML = `${idx.country} <strong>${idx.symbol}</strong> ${idx.price.toLocaleString('fr-FR')} <span class="${changeClass}">${idx.changePct >= 0 ? '+' : ''}${idx.changePct}%</span>`;
        track.appendChild(item);
      }
    }
    tape.appendChild(track);
    return tape;
  }

  /* ============================================================
     7. XP BAR
     ============================================================ */
  function xpBar(xpData) {
    if (!xpData) return el('div');
    const bar = el('div', { className: 'xp-bar-container' });
    bar.innerHTML = `
      <div class="xp-bar__info">
        <span class="xp-bar__level">Niv. ${xpData.level}</span>
        <span class="xp-bar__title">${xpData.title}</span>
        <span class="xp-bar__xp">${xpData.xpInLevel}/${xpData.xpForNext} XP</span>
      </div>
      <div class="xp-bar">
        <div class="xp-bar__fill" style="width:${xpData.progress}%"></div>
      </div>
    `;
    return bar;
  }

  /* ============================================================
     8. FLOATING SUMMARY WIDGET
     ============================================================ */
  let floatingWidget = null;
  let floatingVisible = false;

  function createFloatingSummary() {
    if (floatingWidget) floatingWidget.remove();

    const state = Store.getState();
    if (!state.analysis || state.step !== 'dashboard') return;

    const a = state.analysis;
    const netWorth = a.ratios?.netWorth || 0;
    const healthScore = a.healthScore?.total || 0;
    const surplus = a.balance?.surplus || 0;

    floatingWidget = el('div', { className: `floating-summary ${floatingVisible ? 'floating-summary--open' : ''}` });

    const toggle = el('button', { className: 'floating-summary__toggle', onClick: () => {
      floatingVisible = !floatingVisible;
      floatingWidget.classList.toggle('floating-summary--open', floatingVisible);
    } });
    toggle.innerHTML = '💹';

    const content = el('div', { className: 'floating-summary__content' });
    content.innerHTML = `
      <div class="floating-summary__row">
        <span>Patrimoine net</span>
        <strong style="color:${netWorth >= 0 ? 'var(--ez-success)' : 'var(--ez-danger)'}">${netWorth.toLocaleString('fr-FR')} €</strong>
      </div>
      <div class="floating-summary__row">
        <span>Score santé</span>
        <strong style="color:${healthScore >= 70 ? 'var(--ez-success)' : healthScore >= 50 ? 'var(--ez-warning)' : 'var(--ez-danger)'}">${healthScore}/100</strong>
      </div>
      <div class="floating-summary__row">
        <span>Surplus/mois</span>
        <strong style="color:${surplus >= 0 ? 'var(--ez-success)' : 'var(--ez-danger)'}">${surplus.toLocaleString('fr-FR')} €</strong>
      </div>
    `;

    floatingWidget.appendChild(toggle);
    floatingWidget.appendChild(content);
    document.body.appendChild(floatingWidget);
  }

  /* ============================================================
     9. ONBOARDING TOUR
     ============================================================ */
  function startOnboarding() {
    const isMobile = window.innerWidth <= 768;

    // Different onboarding steps for mobile vs desktop
    const steps = isMobile ? [
      { target: '.mobile-tab[data-tab="home"]', text: '💹 Bienvenue sur FinVest ! Voici votre barre de navigation. Commencez par l\'accueil.', position: 'top' },
      { target: '.mobile-tab[data-tab="markets"]', text: '📈 Marchés : suivez la bourse en direct, gérez votre portefeuille.', position: 'top' },
      { target: '.mobile-tab[data-tab="tools"]', text: '🔧 Outils : projections, retraite, FIRE, crédit, et bien plus.', position: 'top' },
      { target: '.mobile-tab[data-tab="progress"]', text: '🏆 Parcours : gagnez des badges et complétez des défis financiers.', position: 'top' },
      { target: '.mobile-tab[data-tab="more"]', text: '📋 Plus : accédez à tous les outils, paramètres et à l\'IA depuis le menu.', position: 'top' }
    ] : [
      { target: '.sidebar__header', text: '💹 Bienvenue sur FinVest ! Votre assistant financier personnel.', position: 'right' },
      { target: '.nav-link[data-view="overview"]', text: '📊 Vue d\'ensemble : votre tableau de bord principal avec tous les indicateurs clés.', position: 'right' },
      { target: '.nav-link[data-view="bourse"]', text: '📈 Bourse en direct : suivez les indices et actions en temps réel.', position: 'right' },
      { target: '.nav-link[data-view="projections"]', text: '🔮 Projections : simulation Monte Carlo et prévisions de patrimoine.', position: 'right' },
      { target: '.nav-link[data-view="advice"]', text: '💡 Conseils : recommandations personnalisées basées sur votre profil.', position: 'right' },
      { target: '.notification-bell', text: '🔔 Notifications : alertes, conseils saisonniers et milestones.', position: 'bottom' },
      { target: '.sidebar__footer', text: '☁️ Vos données sont synchronisées dans le cloud. Ctrl+K pour la recherche rapide.', position: 'right' }
    ];

    let currentStep = 0;
    let overlay = null;
    let highlight = null;
    let tooltip = null;

    function showStep(idx) {
      cleanup();
      if (idx >= steps.length) { cleanup(); toast('Tour terminé ! 🎉 Explorez librement.', 'success'); return; }

      const step = steps[idx];
      const target = document.querySelector(step.target);
      if (!target) { showStep(idx + 1); return; }

      const rect = target.getBoundingClientRect();

      overlay = el('div', { className: 'onboarding-overlay' });
      highlight = el('div', { className: 'onboarding-highlight' });
      highlight.style.cssText = `top:${rect.top - 4}px;left:${rect.left - 4}px;width:${rect.width + 8}px;height:${rect.height + 8}px`;

      tooltip = el('div', { className: 'onboarding-tooltip ez-pop' });
      tooltip.innerHTML = `
        <p>${step.text}</p>
        <div class="onboarding-actions">
          <span>${idx + 1}/${steps.length}</span>
          <div>
            ${idx > 0 ? '<button class="btn btn--ghost btn--sm" data-action="prev">← Précédent</button>' : ''}
            <button class="btn btn--primary btn--sm" data-action="next">${idx < steps.length - 1 ? 'Suivant →' : 'Terminer ✓'}</button>
          </div>
        </div>
      `;

      // Position tooltip
      let tooltipLeft, tooltipTop;
      if (step.position === 'top') {
        // Mobile: position above the element (for bottom tab bar items)
        tooltipLeft = Math.max(12, Math.min(rect.left - 60, window.innerWidth - 320));
        tooltipTop = rect.top - 120;
      } else if (step.position === 'right') {
        tooltipLeft = rect.right + 16;
        tooltipTop = rect.top;
      } else {
        tooltipLeft = rect.left;
        tooltipTop = rect.bottom + 12;
      }
      tooltip.style.cssText = `top:${tooltipTop}px;left:${Math.min(tooltipLeft, window.innerWidth - 340)}px;max-width:${Math.min(320, window.innerWidth - 24)}px`;

      tooltip.addEventListener('click', e => {
        const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
        if (action === 'next') showStep(idx + 1);
        if (action === 'prev') showStep(idx - 1);
      });

      overlay.addEventListener('click', () => { cleanup(); });

      document.body.appendChild(overlay);
      document.body.appendChild(highlight);
      document.body.appendChild(tooltip);
    }

    function cleanup() {
      if (overlay) overlay.remove();
      if (highlight) highlight.remove();
      if (tooltip) tooltip.remove();
      overlay = null; highlight = null; tooltip = null;
    }

    showStep(0);
  }

  /* ============================================================
     10. ENHANCED CHART TOOLBOX (export, fullscreen)
     ============================================================ */
  function chartWithToolbox(container, options, title) {
    const wrap = el('div', { className: 'chart-wrapper' });
    const toolbar = el('div', { className: 'chart-toolbar' }, [
      title ? el('span', { className: 'chart-toolbar__title', textContent: title }) : null,
      el('button', { className: 'chart-tool-btn', title: 'Plein écran', onClick: () => toggleFullscreen(wrap) }, [icon('activity', 14)]),
    ].filter(Boolean));

    const canvas = el('div', { className: 'chart-canvas' });
    canvas.style.height = options._height || '320px';

    wrap.appendChild(toolbar);
    wrap.appendChild(canvas);
    container.appendChild(wrap);

    // Enhance options with ECharts toolbox
    const enhancedOptions = {
      ...options,
      toolbox: {
        show: true,
        right: 10,
        top: 5,
        iconStyle: { borderColor: 'rgba(255,255,255,0.4)' },
        feature: {
          saveAsImage: { title: 'Exporter PNG', pixelRatio: 2 },
          dataZoom: { title: { zoom: 'Zoom', back: 'Reset' } },
          restore: { title: 'Réinitialiser' }
        }
      }
    };
    delete enhancedOptions._height;

    return UI.initChart(canvas, enhancedOptions);
  }

  function toggleFullscreen(element) {
    if (element.classList.contains('chart-wrapper--fullscreen')) {
      element.classList.remove('chart-wrapper--fullscreen');
      document.body.style.overflow = '';
    } else {
      element.classList.add('chart-wrapper--fullscreen');
      document.body.style.overflow = 'hidden';
    }
    // Trigger chart resize
    const canvas = element.querySelector('.chart-canvas');
    if (canvas && canvas._chart) {
      setTimeout(() => canvas._chart.resize(), 300);
    }
  }

  /* ============================================================
     EXTEND window.UI
     ============================================================ */
  Object.assign(window.UI, {
    openSearch, closeSearch,
    createNotificationBell, toggleNotificationPanel,
    countUp, confetti,
    sparkline, tickerTape,
    xpBar,
    createFloatingSummary,
    startOnboarding,
    chartWithToolbox, toggleFullscreen
  });
})();
