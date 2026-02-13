/* ================================================================
   FinVest — views-new.js  (New Views — Phase 1 & 2)
   Adds: bourse, immobilier, portefeuille
   Enhances: overview (morning widget), budget (transactions)
   Merges into window.Views
   ================================================================ */
(() => {
  'use strict';

  const { el, icon, toast, modal, statCard, dataTable, tabs,
    formatCurrency, formatPercent, formatNumber,
    initChart, destroyChart, sparkline, tickerTape,
    countUp, confetti, chartWithToolbox, xpBar } = window.UI;
  const fc = v => (v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const fp = v => (v || 0).toFixed(1) + '%';

  /* =============================================================
     BOURSE — Live Market Dashboard
     ============================================================= */
  function bourse(container) {
    container.innerHTML = '';
    const wrap = el('div', { className: 'view-content' });

    // Header
    wrap.appendChild(el('div', { className: 'page-header ez-fade-in' }, [
      icon('trending-up', 28),
      el('div', {}, [
        el('h2', { textContent: 'Bourse en direct' }),
        el('p', { className: 'text-muted', id: 'bourse-subtitle', textContent: 'Chargement des données de marché...' })
      ])
    ]));

    // Quota pool indicator
    const quotaBar = el('div', { className: 'quota-bar ez-fade-in', id: 'quota-bar' });
    wrap.appendChild(quotaBar);

    // Ticker tape
    wrap.appendChild(tickerTape());

    // Last update
    const updateBar = el('div', { className: 'market-update-bar' });
    updateBar.innerHTML = `<span class="market-pulse"></span> <span id="data-source-badge"></span> Données mises à jour : ${new Date().toLocaleTimeString('fr-FR')} <button class="btn btn--ghost btn--sm" id="market-refresh">↻ Rafraîchir</button>`;
    wrap.appendChild(updateBar);

    // Tabs
    let activeTab = 'indices';
    const tabBar = tabs([
      { key: 'indices', label: 'Indices', icon: 'activity' },
      { key: 'actions', label: 'Actions & ETF', icon: 'trending-up' },
      { key: 'detail', label: 'Détail', icon: 'bar-chart-2' }
    ], activeTab, key => {
      activeTab = key;
      renderContent();
    });
    wrap.appendChild(tabBar);

    const contentArea = el('div', { className: 'market-content' });
    wrap.appendChild(contentArea);
    container.appendChild(wrap);

    let selectedSymbol = 'CAC40';

    function renderContent() {
      contentArea.innerHTML = '';
      contentArea.querySelectorAll('.chart-canvas').forEach(c => destroyChart(c));

      if (activeTab === 'indices') renderIndices();
      else if (activeTab === 'actions') renderStocks();
      else if (activeTab === 'detail') renderDetail();
    }

    function renderIndices() {
      const indices = FinMarket.getAllIndices();
      const grid = el('div', { className: 'market-grid' });

      for (const idx of indices) {
        const isUp = idx.changePct >= 0;
        const card = el('div', {
          className: 'market-card ez-fade-in',
          onClick: () => { selectedSymbol = idx.symbol; activeTab = 'detail'; renderContent(); }
        });
        card.innerHTML = `
          <div class="market-card__header">
            <span class="market-card__flag">${idx.country}</span>
            <span class="market-card__name">${idx.name}</span>
            ${idx.live ? '<span class="source-dot source-dot--live" title="Données réelles"></span>' : ''}
          </div>
          <div class="market-card__price">${idx.price.toLocaleString('fr-FR')}</div>
          <div class="market-card__change ${isUp ? 'market-up' : 'market-down'}">
            ${isUp ? '▲' : '▼'} ${Math.abs(idx.change).toLocaleString('fr-FR')} (${isUp ? '+' : ''}${idx.changePct}%)
          </div>
          <div class="market-card__sparkline"></div>
        `;
        // Add sparkline
        const sparkContainer = card.querySelector('.market-card__sparkline');
        sparkContainer.appendChild(sparkline(idx.sparkline, 100, 30));
        grid.appendChild(card);
      }
      contentArea.appendChild(grid);

      // World map summary
      const summary = el('div', { className: 'market-summary ez-fade-in' });
      const upCount = indices.filter(i => i.changePct >= 0).length;
      const downCount = indices.length - upCount;
      summary.innerHTML = `
        <div class="market-summary__stat"><span class="market-up">▲ ${upCount}</span> indices en hausse</div>
        <div class="market-summary__stat"><span class="market-down">▼ ${downCount}</span> indices en baisse</div>
        <div class="market-summary__stat">Volatilité moyenne : ${fp(indices.reduce((s, i) => s + Math.abs(i.changePct), 0) / indices.length)}</div>
      `;
      contentArea.appendChild(summary);
    }

    function renderStocks() {
      const stocks = FinMarket.getAllStocks();

      // Search
      const searchWrap = el('div', { className: 'market-search' });
      const searchInput = el('input', { type: 'text', className: 'input', placeholder: '🔍 Rechercher une action, un ETF, un ticker...' });
      searchWrap.appendChild(searchInput);
      contentArea.appendChild(searchWrap);

      const tableWrap = el('div', { id: 'stock-table-wrap' });
      contentArea.appendChild(tableWrap);

      function renderTable(filter) {
        tableWrap.innerHTML = '';
        const filtered = filter
          ? stocks.filter(s => s.name.toLowerCase().includes(filter) || s.symbol.toLowerCase().includes(filter) || s.sector.toLowerCase().includes(filter))
          : stocks;

        const table = el('table', { className: 'data-table market-table' });
        table.innerHTML = `
          <thead><tr>
            <th></th><th>Symbole</th><th>Nom</th><th>Secteur</th><th>Prix</th><th>Variation</th><th>Dividende</th><th>Graphique</th>
          </tr></thead>
        `;
        const tbody = el('tbody');
        for (const s of filtered) {
          const isUp = s.changePct >= 0;
          const tr = el('tr', {
            className: 'market-table__row',
            onClick: () => { selectedSymbol = s.symbol; activeTab = 'detail'; renderContent(); }
          });
          tr.innerHTML = `
            <td>${s.country}</td>
            <td><strong>${s.symbol}</strong> ${s.live ? '<span class=\"source-dot source-dot--live\" title=\"Live\"></span>' : ''}</td>
            <td>${s.name}</td>
            <td><span class="badge">${s.sector}</span></td>
            <td class="text-right">${s.price.toLocaleString('fr-FR')}</td>
            <td class="text-right ${isUp ? 'market-up' : 'market-down'}">${isUp ? '+' : ''}${s.changePct}%</td>
            <td class="text-right">${s.dividend > 0 ? s.dividend + '%' : '—'}</td>
            <td></td>
          `;
          // Add sparkline to last cell
          const lastCell = tr.lastElementChild;
          lastCell.appendChild(sparkline(s.sparkline, 60, 20));
          tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        tableWrap.appendChild(el('div', { className: 'table-wrap' }, [table]));
      }

      searchInput.addEventListener('input', () => renderTable(searchInput.value.toLowerCase().trim()));
      renderTable('');
    }

    function renderDetail() {
      const asset = FinMarket.getAssetBySymbol(selectedSymbol);
      if (!asset) {
        contentArea.innerHTML = '<div class="empty-state">Sélectionnez un actif dans les onglets Indices ou Actions.</div>';
        return;
      }

      const isUp = asset.changePct >= 0;

      // Asset header
      const header = el('div', { className: 'asset-detail__header ez-fade-in' });
      header.innerHTML = `
        <div class="asset-detail__title">
          <span class="asset-detail__flag">${asset.country}</span>
          <h2>${asset.name} <small>(${asset.symbol})</small></h2>
          <span class="badge">${asset.sector}</span>
          ${asset.live ? '<span class="source-badge source-badge--live">● LIVE</span>' : '<span class="source-badge source-badge--sim">○ SIMULÉ</span>'}
        </div>
        <div class="asset-detail__price">
          <span class="asset-detail__current">${asset.price.toLocaleString('fr-FR')}</span>
          <span class="asset-detail__change ${isUp ? 'market-up' : 'market-down'}">
            ${isUp ? '▲' : '▼'} ${Math.abs(asset.change).toLocaleString('fr-FR')} (${isUp ? '+' : ''}${asset.changePct}%)
          </span>
        </div>
      `;
      contentArea.appendChild(header);

      // Stats row
      const statsRow = el('div', { className: 'stats-grid stats-grid--4 ez-fade-in' });
      statsRow.appendChild(statCard({ title: 'Plus haut', value: asset.high.toLocaleString('fr-FR'), iconName: 'trending-up', color: 'var(--ez-success)' }));
      statsRow.appendChild(statCard({ title: 'Plus bas', value: asset.low.toLocaleString('fr-FR'), iconName: 'trending-up', color: 'var(--ez-danger)' }));
      statsRow.appendChild(statCard({ title: 'Volume', value: formatNumber(asset.volume), iconName: 'bar-chart-2', color: 'var(--ez-primary)' }));
      statsRow.appendChild(statCard({ title: 'Dividende', value: asset.dividend > 0 ? asset.dividend + '%' : '—', iconName: 'dollar-sign', color: '#f59e0b' }));
      contentArea.appendChild(statsRow);

      // Candlestick chart
      const chartTitle = el('h3', { className: 'section-title ez-fade-in', textContent: '📊 Historique (90 jours)' });
      contentArea.appendChild(chartTitle);

      const chartCanvas = el('div', { className: 'chart-canvas', style: { height: '400px' } });
      contentArea.appendChild(chartCanvas);

      const assetDef = FinMarket.getAssetDef(selectedSymbol);

      // Render chart helper (used for both simulated and real data)
      function buildCandleChart(histData) {
        const dates = histData.map(d => d.date);
        const candlestickData = histData.map(d => [d.open || d.close, d.close, d.low || d.close, d.high || d.close]);
        const volumes = histData.map(d => d.volume || 0);
        destroyChart(chartCanvas);
        initChart(chartCanvas, {
          tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
          toolbox: {
            show: true, right: 10, top: 5,
            iconStyle: { borderColor: 'rgba(255,255,255,0.4)' },
            feature: {
              saveAsImage: { title: 'Export PNG' },
              dataZoom: { title: { zoom: 'Zoom', back: 'Reset' } },
              restore: { title: 'Réinitialiser' }
            }
          },
          grid: [
            { left: '10%', right: '10%', top: 40, height: '55%' },
            { left: '10%', right: '10%', top: '72%', height: '16%' }
          ],
          xAxis: [
            { type: 'category', data: dates, gridIndex: 0, axisLabel: { color: '#94a3b8', fontSize: 10 } },
            { type: 'category', data: dates, gridIndex: 1, axisLabel: { show: false } }
          ],
          yAxis: [
            { scale: true, gridIndex: 0, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#94a3b8' } },
            { scale: true, gridIndex: 1, splitLine: { show: false }, axisLabel: { show: false } }
          ],
          dataZoom: [
            { type: 'inside', xAxisIndex: [0, 1], start: 60, end: 100 },
            { show: true, xAxisIndex: [0, 1], type: 'slider', bottom: 10, start: 60, end: 100, borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#94a3b8' } }
          ],
          series: [
            {
              name: asset.name,
              type: 'candlestick',
              data: candlestickData,
              itemStyle: {
                color: '#22c55e', color0: '#ef4444',
                borderColor: '#22c55e', borderColor0: '#ef4444'
              },
              xAxisIndex: 0, yAxisIndex: 0
            },
            {
              name: 'Volume',
              type: 'bar',
              data: volumes,
              xAxisIndex: 1, yAxisIndex: 1,
              itemStyle: { color: 'rgba(59, 130, 246, 0.3)' }
            }
          ]
        });
      }

      // First render with simulated data
      if (assetDef) {
        buildCandleChart(FinMarket.generateHistoricalData(assetDef, 90));
      }

      // Then try real historical data
      if (window.FinAPI) {
        FinMarket.loadRealHistorical(selectedSymbol, 90).then(result => {
          if (result && result.data && result.data.length > 5) {
            chartTitle.textContent = '📊 Historique (90 jours) — ' + result.source;
            buildCandleChart(result.data);
          }
        }).catch(() => {});
      }

      // Quick actions
      const actions = el('div', { className: 'asset-detail__actions ez-fade-in' });
      actions.innerHTML = `
        <button class="btn btn--primary btn--sm" onclick="window.navigateTo('portefeuille')">➕ Ajouter au portefeuille</button>
        <button class="btn btn--outline btn--sm" onclick="window.navigateTo('projections')">📊 Simuler un investissement</button>
      `;
      contentArea.appendChild(actions);
    }

    // Refresh button
    renderContent();
    const refreshBtn = document.getElementById('market-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadRealAndRerender();
        toast('Données rafraîchies', 'success');
      });
    }

    // Render quota panel
    renderQuotaPanel();

    // ── Async: load real data via FinAPI ───────────────────────
    loadRealAndRerender();

    async function loadRealAndRerender() {
      if (!window.FinAPI) {
        updateSubtitle(false);
        return;
      }
      try {
        if (!FinAPI.isReady()) await FinAPI.init();
        await FinMarket.loadRealPrices();
        renderContent();
        updateSubtitle(true);
        renderQuotaPanel();
      } catch (_) {
        updateSubtitle(false);
      }
    }

    function updateSubtitle(hasReal) {
      const sub = document.getElementById('bourse-subtitle');
      const badge = document.getElementById('data-source-badge');
      if (sub) {
        sub.textContent = hasReal && FinMarket.hasRealData()
          ? 'Données en temps réel — Finnhub · CoinGecko · Frankfurter'
          : 'Indices mondiaux, actions et ETF — Données simulées';
      }
      if (badge) {
        badge.innerHTML = hasReal && FinMarket.hasRealData()
          ? '<span class="source-badge source-badge--live">● LIVE</span>'
          : '<span class="source-badge source-badge--sim">◌ SIMULÉ</span>';
      }
    }

    function renderQuotaPanel() {
      const panel = document.getElementById('quota-bar');
      if (!panel || !window.FinAPI) return;
      const status = FinAPI.getQuotaStatus();
      const apis = ['finnhub', 'alphavantage', 'exchangerate', 'coingecko'];
      const windowLabels = { minute: '/min', day: '/jour', month: '/mois' };
      let html = '<div class="quota-bar__title">🔌 Pool API</div><div class="quota-bar__items">';
      for (const api of apis) {
        const s = status[api];
        if (!s || s.limit === '∞') continue;
        const pctUsed = s.pct;
        const colorClass = s.status === 'exhausted' ? 'quota--exhausted'
          : s.status === 'throttled' ? 'quota--throttled'
          : s.status === 'moderate' ? 'quota--moderate'
          : 'quota--ok';
        const resetLabel = s.window === 'minute' ? ''
          : s.window === 'day' ? ` · Reset ${FinAPI.formatResetDate('alphavantage')}`
          : ` · Reset ${FinAPI.formatResetDate('exchangerate')}`;
        html += `<div class="quota-item ${colorClass}">
          <span class="quota-item__name">${api}</span>
          <div class="quota-item__bar"><div class="quota-item__fill" style="width:${pctUsed}%"></div></div>
          <span class="quota-item__label">${s.remaining}/${s.limit}${windowLabels[s.window] || ''}${resetLabel}</span>
        </div>`;
      }
      html += '</div>';
      panel.innerHTML = html;
    }
  }

  /* =============================================================
     PORTEFEUILLE — Portfolio Manager
     ============================================================= */
  function portefeuille(container) {
    container.innerHTML = '';
    const wrap = el('div', { className: 'view-content' });

    wrap.appendChild(el('div', { className: 'page-header ez-fade-in' }, [
      icon('briefcase', 28),
      el('div', {}, [
        el('h2', { textContent: 'Mon Portefeuille' }),
        el('p', { className: 'text-muted', textContent: 'Gestion de vos positions réelles — suivi P&L en temps réel' })
      ])
    ]));

    // Load positions from state or localStorage
    let positions = [];
    try {
      const saved = window._finvestSafeLS.getItem('finvest_positions');
      if (saved) positions = JSON.parse(saved);
    } catch (_) {}

    const contentArea = el('div');
    wrap.appendChild(contentArea);
    container.appendChild(wrap);

    function savePositions() {
      try { window._finvestSafeLS.setItem('finvest_positions', JSON.stringify(positions)); } catch (_) {}
    }

    function render() {
      contentArea.innerHTML = '';
      contentArea.querySelectorAll('.chart-canvas').forEach(c => destroyChart(c));

      // Add position button
      const addBtn = el('button', { className: 'btn btn--primary btn--sm', style: { marginBottom: '16px' }, onClick: showAddModal }, [
        icon('plus', 16), ' Ajouter une position'
      ]);
      contentArea.appendChild(addBtn);

      if (positions.length === 0) {
        contentArea.appendChild(el('div', { className: 'empty-state' }, [
          el('div', { style: { fontSize: '48px' } }, ['📦']),
          el('h3', { textContent: 'Portefeuille vide' }),
          el('p', { textContent: 'Ajoutez vos premières positions pour suivre votre portefeuille en temps réel.' })
        ]));
        return;
      }

      const perf = FinMarket.computePortfolioPerformance(positions);

      // Summary stats
      const statsRow = el('div', { className: 'stats-grid stats-grid--4 ez-fade-in' });
      const plColor = perf.totalPL >= 0 ? 'var(--ez-success)' : 'var(--ez-danger)';
      statsRow.appendChild(statCard({ title: 'Valeur totale', value: fc(perf.totalValue), iconName: 'wallet', color: 'var(--ez-primary)' }));
      statsRow.appendChild(statCard({ title: 'Coût total', value: fc(perf.totalCost), iconName: 'dollar-sign', color: '#94a3b8' }));
      statsRow.appendChild(statCard({ title: 'P&L', value: `${perf.totalPL >= 0 ? '+' : ''}${fc(perf.totalPL)}`, iconName: 'trending-up', color: plColor, subtitle: `${perf.totalPLPct >= 0 ? '+' : ''}${perf.totalPLPct}%` }));
      statsRow.appendChild(statCard({ title: 'Positions', value: positions.length, iconName: 'briefcase', color: '#8b5cf6' }));
      contentArea.appendChild(statsRow);

      // Allocation donut
      if (perf.positions.length > 1) {
        contentArea.appendChild(el('h3', { className: 'section-title', textContent: '📊 Répartition du portefeuille' }));
        const chartCanvas = el('div', { className: 'chart-canvas', style: { height: '300px' } });
        contentArea.appendChild(chartCanvas);

        initChart(chartCanvas, {
          tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
          series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '50%'],
            label: { color: '#e2e8f0', formatter: '{b}\n{d}%' },
            data: perf.positions.map(p => ({
              name: p.symbol,
              value: p.value
            })),
            emphasis: { itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.3)' } }
          }]
        });
      }

      // Positions table
      contentArea.appendChild(el('h3', { className: 'section-title', textContent: '📋 Détail des positions' }));
      const table = el('table', { className: 'data-table' });
      table.innerHTML = `<thead><tr>
        <th>Symbole</th><th>Nom</th><th>Qté</th><th>PRU</th><th>Cours</th><th>Valeur</th><th>P&L</th><th>Poids</th><th></th>
      </tr></thead>`;
      const tbody = el('tbody');
      for (const p of perf.positions) {
        const isUp = p.pl >= 0;
        const tr = el('tr');
        tr.innerHTML = `
          <td><strong>${p.symbol}</strong></td>
          <td>${p.name || '—'}</td>
          <td>${p.quantity}</td>
          <td>${p.avgPrice.toLocaleString('fr-FR')}</td>
          <td>${p.currentPrice.toLocaleString('fr-FR')}</td>
          <td>${fc(p.value)}</td>
          <td class="${isUp ? 'market-up' : 'market-down'}">${isUp ? '+' : ''}${fc(p.pl)} (${isUp ? '+' : ''}${p.plPct}%)</td>
          <td>${p.weight}%</td>
          <td></td>
        `;
        const removeBtn = el('button', { className: 'btn btn--ghost btn--sm', textContent: '🗑️', onClick: () => {
          positions = positions.filter(pos => pos.symbol !== p.symbol);
          savePositions();
          render();
          toast(`${p.symbol} supprimé`, 'info');
        }});
        tr.lastElementChild.appendChild(removeBtn);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      contentArea.appendChild(el('div', { className: 'table-wrap' }, [table]));
    }

    function showAddModal() {
      const allAssets = [...FinMarket.POPULAR_STOCKS];
      let selectedAsset = null;

      const searchInput = el('input', { type: 'text', className: 'input', placeholder: '🔍 Rechercher un ticker (LVMH, AAPL, CW8...)' });
      const resultsDiv = el('div', { className: 'search-results', style: { maxHeight: '150px', overflowY: 'auto', margin: '8px 0' } });
      const qtyInput = el('input', { type: 'number', className: 'input', placeholder: 'Quantité', min: 0.01, step: 0.01 });
      const pruInput = el('input', { type: 'number', className: 'input', placeholder: 'Prix d\'achat moyen', min: 0.01, step: 0.01 });
      const selectedInfo = el('div', { className: 'text-muted', style: { marginBottom: '8px' } });

      searchInput.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase().trim();
        resultsDiv.innerHTML = '';
        if (q.length < 1) return;
        const matches = allAssets.filter(a => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)).slice(0, 5);
        for (const m of matches) {
          const item = el('div', {
            className: 'search-result', style: { cursor: 'pointer', padding: '6px 8px' },
            onClick: () => {
              selectedAsset = m;
              selectedInfo.textContent = `✓ ${m.country} ${m.name} (${m.symbol}) — Cours actuel : ${m.basePrice}`;
              pruInput.value = m.basePrice;
              resultsDiv.innerHTML = '';
              searchInput.value = m.symbol;
            }
          });
          item.textContent = `${m.country} ${m.symbol} — ${m.name}`;
          resultsDiv.appendChild(item);
        }
      });

      modal({
        title: '➕ Ajouter une position',
        body: [
          el('label', { className: 'question-label', textContent: 'Actif' }),
          searchInput,
          resultsDiv,
          selectedInfo,
          el('label', { className: 'question-label', textContent: 'Quantité' }),
          qtyInput,
          el('label', { className: 'question-label', textContent: 'Prix d\'achat moyen (PRU)' }),
          pruInput
        ],
        actions: [
          el('button', { className: 'btn btn--primary', textContent: 'Ajouter', onClick: () => {
            if (!selectedAsset) { toast('Sélectionnez un actif', 'error'); return; }
            const qty = parseFloat(qtyInput.value);
            const pru = parseFloat(pruInput.value);
            if (!qty || !pru) { toast('Remplissez quantité et PRU', 'error'); return; }

            // Check if already exists
            const existing = positions.find(p => p.symbol === selectedAsset.symbol);
            if (existing) {
              // Average in
              const totalQty = existing.quantity + qty;
              existing.avgPrice = (existing.avgPrice * existing.quantity + pru * qty) / totalQty;
              existing.quantity = totalQty;
            } else {
              positions.push({ symbol: selectedAsset.symbol, name: selectedAsset.name, quantity: qty, avgPrice: pru });
            }
            savePositions();
            render();
            toast(`${selectedAsset.symbol} ajouté au portefeuille`, 'success');
          }})
        ]
      });
    }

    render();
  }

  /* =============================================================
     IMMOBILIER — Real Estate Investment Simulator
     ============================================================= */
  function immobilier(container) {
    container.innerHTML = '';
    const wrap = el('div', { className: 'view-content' });

    wrap.appendChild(el('div', { className: 'page-header ez-fade-in' }, [
      icon('home', 28),
      el('div', {}, [
        el('h2', { textContent: 'Simulateur Immobilier' }),
        el('p', { className: 'text-muted', textContent: 'Investissement locatif — Rendement, cashflow, comparaison achat vs location' })
      ])
    ]));

    // Parameters
    const params = {
      purchasePrice: 250000, downPayment: 50000, loanRate: 3.5, loanDuration: 20,
      monthlyRent: 900, propertyTax: 1200, managementFees: 7, maintenancePct: 1,
      vacancyRate: 5, notaryFees: 8, insuranceRate: 0.36, appreciationRate: 2,
      holdingYears: 20, taxBracket: 30
    };

    const sliders = [
      { key: 'purchasePrice', label: 'Prix d\'achat', min: 50000, max: 1000000, step: 5000, unit: '€' },
      { key: 'downPayment', label: 'Apport personnel', min: 0, max: 500000, step: 5000, unit: '€' },
      { key: 'loanRate', label: 'Taux du prêt', min: 1, max: 8, step: 0.1, unit: '%' },
      { key: 'loanDuration', label: 'Durée du prêt', min: 5, max: 30, step: 1, unit: 'ans' },
      { key: 'monthlyRent', label: 'Loyer mensuel', min: 200, max: 5000, step: 50, unit: '€' },
      { key: 'propertyTax', label: 'Taxe foncière annuelle', min: 0, max: 5000, step: 100, unit: '€' },
      { key: 'appreciationRate', label: 'Appréciation annuelle', min: -2, max: 6, step: 0.5, unit: '%' },
      { key: 'holdingYears', label: 'Durée de détention', min: 5, max: 30, step: 1, unit: 'ans' },
      { key: 'taxBracket', label: 'TMI (tranche)', min: 0, max: 45, step: 1, unit: '%' }
    ];

    const formWrap = el('div', { className: 'immo-form' });
    const resultWrap = el('div', { className: 'immo-results' });

    for (const s of sliders) {
      const row = el('div', { className: 'slider-row' });
      const label = el('label', { textContent: s.label });
      const valueDisplay = el('span', { className: 'slider-value', textContent: params[s.key] + (s.unit === '€' ? ' €' : s.unit === '%' ? '%' : ' ' + s.unit) });
      const slider = el('input', {
        type: 'range', className: 'slider',
        min: s.min, max: s.max, step: s.step, value: params[s.key]
      });
      slider.addEventListener('input', () => {
        params[s.key] = parseFloat(slider.value);
        valueDisplay.textContent = params[s.key] + (s.unit === '€' ? ' €' : s.unit === '%' ? '%' : ' ' + s.unit);
        updateResults();
      });
      row.appendChild(label);
      row.appendChild(el('div', { className: 'slider-wrap' }, [slider, valueDisplay]));
      formWrap.appendChild(row);
    }

    const layout = el('div', { className: 'immo-layout' });
    layout.appendChild(formWrap);
    layout.appendChild(resultWrap);
    wrap.appendChild(layout);
    container.appendChild(wrap);

    function updateResults() {
      resultWrap.innerHTML = '';
      resultWrap.querySelectorAll('.chart-canvas').forEach(c => destroyChart(c));

      const result = FinMarket.simulateImmobilier(params);

      // Key metrics
      const metricsGrid = el('div', { className: 'stats-grid stats-grid--3' });

      const yieldColor = result.yields.net > 4 ? 'var(--ez-success)' : result.yields.net > 2 ? 'var(--ez-warning)' : 'var(--ez-danger)';
      metricsGrid.appendChild(statCard({ title: 'Rendement brut', value: result.yields.gross + '%', iconName: 'percent', color: 'var(--ez-primary)' }));
      metricsGrid.appendChild(statCard({ title: 'Rendement net', value: result.yields.net + '%', iconName: 'percent', color: yieldColor }));
      metricsGrid.appendChild(statCard({ title: 'Rendement net-net', value: result.yields.netNet + '%', iconName: 'percent', color: '#8b5cf6', subtitle: 'Après impôts' }));

      const cashflowColor = result.cashflow.monthly >= 0 ? 'var(--ez-success)' : 'var(--ez-danger)';
      metricsGrid.appendChild(statCard({ title: 'Cashflow mensuel', value: `${result.cashflow.monthly >= 0 ? '+' : ''}${fc(result.cashflow.monthly)}`, iconName: 'dollar-sign', color: cashflowColor }));
      metricsGrid.appendChild(statCard({ title: 'Mensualité crédit', value: fc(result.credit.monthlyPayment), iconName: 'home', color: '#f59e0b' }));
      metricsGrid.appendChild(statCard({ title: 'TRI estimé', value: result.annualizedReturn + '%', iconName: 'trending-up', color: '#14b8a6' }));
      resultWrap.appendChild(metricsGrid);

      // Cashflow indicator
      const cfBanner = el('div', {
        className: `immo-cashflow-banner ${result.cashflow.positive ? 'immo-cashflow--positive' : 'immo-cashflow--negative'}`
      });
      cfBanner.innerHTML = result.cashflow.positive
        ? `✅ <strong>Cashflow positif !</strong> L'investissement s'autofinance (+${fc(result.cashflow.monthly)}/mois)`
        : `⚠️ <strong>Cashflow négatif</strong> — Effort d'épargne de ${fc(Math.abs(result.cashflow.monthly))}/mois nécessaire`;
      resultWrap.appendChild(cfBanner);

      // Comparison achat vs location
      const compBanner = el('div', { className: 'immo-comparison' });
      compBanner.innerHTML = `
        <h4>🏠 Achat vs 🏢 Location sur ${params.holdingYears} ans</h4>
        <div class="immo-comparison__row">
          <div>Coût total achat (net) : <strong>${fc(result.comparison.buyNetCost)}</strong></div>
          <div>Coût total location : <strong>${fc(result.comparison.rentTotal)}</strong></div>
        </div>
        <div class="immo-comparison__verdict ${result.comparison.advantage === 'achat' ? 'market-up' : 'market-down'}">
          ${result.comparison.advantage === 'achat' ? '✅' : '⚠️'} L'<strong>${result.comparison.advantage}</strong> est plus avantageuse — Économie : <strong>${fc(result.comparison.savings)}</strong>
        </div>
      `;
      resultWrap.appendChild(compBanner);

      // Projection chart
      resultWrap.appendChild(el('h3', { className: 'section-title', textContent: '📈 Évolution sur ' + params.holdingYears + ' ans' }));
      const chartCanvas = el('div', { className: 'chart-canvas', style: { height: '350px' } });
      resultWrap.appendChild(chartCanvas);

      const proj = result.projection;
      initChart(chartCanvas, {
        tooltip: { trigger: 'axis' },
        legend: { data: ['Valeur du bien', 'Capital restant dû', 'Équité nette'], textStyle: { color: '#94a3b8' }, top: 5 },
        grid: { left: '12%', right: '5%', bottom: '10%', top: 50 },
        xAxis: { type: 'category', data: proj.map(p => `An ${p.year}`), axisLabel: { color: '#94a3b8' } },
        yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: v => (v / 1000).toFixed(0) + 'k€' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
        toolbox: {
          show: true, right: 10, iconStyle: { borderColor: 'rgba(255,255,255,0.4)' },
          feature: { saveAsImage: { title: 'Export' } }
        },
        series: [
          { name: 'Valeur du bien', type: 'line', data: proj.map(p => p.propertyValue), smooth: true, lineStyle: { width: 2 }, itemStyle: { color: '#3b82f6' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.2)' }, { offset: 1, color: 'rgba(59,130,246,0)' }] } } },
          { name: 'Capital restant dû', type: 'line', data: proj.map(p => p.remainingLoan), smooth: true, lineStyle: { width: 2, type: 'dashed' }, itemStyle: { color: '#ef4444' } },
          { name: 'Équité nette', type: 'line', data: proj.map(p => p.equity), smooth: true, lineStyle: { width: 3 }, itemStyle: { color: '#22c55e' } }
        ]
      });

      // Cost breakdown
      resultWrap.appendChild(el('h3', { className: 'section-title', textContent: '💰 Décomposition des coûts' }));
      const costTable = [
        ['Apport', fc(result.downPayment)],
        ['Frais de notaire', fc(result.notaryFees)],
        ['Total investi', fc(result.totalInvested)],
        ['Intérêts du prêt', fc(result.credit.totalInterest)],
        ['Assurance emprunteur', fc(result.credit.totalInsurance)],
        ['Charges annuelles', fc(result.annualCharges) + '/an'],
        ['Loyer net annuel', fc(result.annualRentNet) + '/an'],
        ['Rendement global', result.annualizedReturn + '%/an']
      ];
      resultWrap.appendChild(dataTable(['Poste', 'Montant'], costTable));
    }

    updateResults();
  }

  /* =============================================================
     ENHANCED OVERVIEW — Morning Widget + Ticker
     ============================================================= */
  const _originalOverview = Views.overview;

  function enhancedOverview(container) {
    // Call original overview first
    _originalOverview(container);

    // Prepend morning widget and ticker
    const main = container.querySelector('.view-content') || container;
    const firstChild = main.firstChild;

    // Add ticker tape at top
    const ticker = tickerTape();
    ticker.className += ' overview-ticker';
    main.insertBefore(ticker, firstChild);

    // Add morning widget
    const s = Store.getState();
    if (s.analysis) {
      const a = s.analysis;
      const now = new Date();
      const hour = now.getHours();
      const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

      const morningWidget = el('div', { className: 'morning-widget ez-fade-in' });

      // Seasonal advice
      const seasonal = FinMarket.getSeasonalAdvice();
      const seasonalHTML = seasonal.length > 0
        ? `<div class="morning-widget__tips">${seasonal.map(s => `<span class="morning-tip">${s.icon} ${s.title}</span>`).join('')}</div>`
        : '';

      // Calculate trend (we fake it since we don't have historical data yet)
      const healthScore = a.healthScore?.total || 0;
      const surplus = a.balance?.surplus || 0;
      const netWorth = a.ratios?.netWorth || 0;

      morningWidget.innerHTML = `
        <div class="morning-widget__greeting">
          <h2>${greeting} ! 👋</h2>
          <p class="text-muted">${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div class="morning-widget__summary">
          <div class="morning-widget__item">
            <span class="morning-widget__label">Patrimoine net</span>
            <span class="morning-widget__value" style="color:${netWorth >= 0 ? 'var(--ez-success)' : 'var(--ez-danger)'}">${fc(netWorth)}</span>
          </div>
          <div class="morning-widget__item">
            <span class="morning-widget__label">Score santé</span>
            <span class="morning-widget__value" style="color:${healthScore >= 70 ? 'var(--ez-success)' : healthScore >= 50 ? 'var(--ez-warning)' : 'var(--ez-danger)'}">${healthScore}/100</span>
          </div>
          <div class="morning-widget__item">
            <span class="morning-widget__label">Épargne/mois</span>
            <span class="morning-widget__value" style="color:${surplus >= 0 ? 'var(--ez-success)' : 'var(--ez-danger)'}">${fc(surplus)}</span>
          </div>
        </div>
        ${seasonalHTML}
      `;
      main.insertBefore(morningWidget, ticker.nextSibling);

      // XP bar
      const xpData = FinMarket.computeLevel(s.xp || 150);
      const xpWidget = xpBar(xpData);
      xpWidget.style.margin = '0 0 16px';
      main.insertBefore(xpWidget, morningWidget.nextSibling);
    }
  }

  /* =============================================================
     MERGE INTO Views
     ============================================================= */
  Object.assign(Views, {
    bourse,
    portefeuille,
    immobilier,
    overview: enhancedOverview
  });
})();
