/* ================================================================
   FinVest — views-extra.js  (Extended Views — 30 new features)
   Merges into window.Views
   ================================================================ */
(() => {
  'use strict';

  const { el, icon, toast, modal, scoreGauge, progressRing, statCard,
    adviceCard, dataTable, tabs, formatCurrency, formatPercent,
    initChart, destroyChart } = window.UI;

  const fc = v => (v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const fp = v => (v || 0).toFixed(1) + '%';

  /* helper: section header */
  function sectionHeader(iconName, title, subtitle) {
    return el('div', { className: 'page-header ez-fade-in' }, [
      icon(iconName, 28),
      el('div', {}, [
        el('h2', { textContent: title }),
        subtitle ? el('p', { className: 'text-muted', textContent: subtitle }) : null
      ].filter(Boolean))
    ]);
  }

  /* helper: metric card */
  function metric(label, value, sub, color) {
    const c = el('div', { className: 'metric-card' });
    c.innerHTML = `<div class="metric-card__value" style="color:${color || 'var(--primary)'}">${value}</div><div class="metric-card__label">${label}</div>${sub ? `<div class="metric-card__sub">${sub}</div>` : ''}`;
    return c;
  }

  /* helper: progress bar */
  function progressBar(pct, color) {
    const w = el('div', { className: 'progress-bar-wrap' });
    w.innerHTML = `<div class="progress-bar"><div class="progress-bar__fill" style="width:${Math.min(100, pct)}%;background:${color || 'var(--primary)'}"></div></div><span class="progress-bar__label">${Math.round(pct)}%</span>`;
    return w;
  }

  /* =============================================================
     1. PATRIMOINE GLOBAL (Sankey-style wealth dashboard)
     ============================================================= */
  function patrimoine(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const a = Store.getState().analysis;
    const bal = a?.balance || FinEngine.computeMonthlyBalance(p);
    const investments = (p.investments || []);
    const totalInv = investments.reduce((s, i) => s + (i.amount || 0), 0);
    const realEstate = (p.realEstate || []);
    const totalRE = realEstate.reduce((s, r) => s + (r.value || 0), 0);
    const totalMortgage = realEstate.reduce((s, r) => s + (r.remainingMortgage || 0), 0);
    const totalDebt = (p.debts || []).reduce((s, d) => s + (d.remaining || 0), 0);
    const netWorth = totalInv + (p.currentSavings || 0) + totalRE - totalMortgage - totalDebt;
    const grossWorth = totalInv + (p.currentSavings || 0) + totalRE;

    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('layers', 'Patrimoine global', 'Vue consolidée de votre richesse'));

    // Main metrics
    const grid = el('div', { className: 'metrics-grid' });
    grid.appendChild(metric('Patrimoine net', fc(netWorth), 'Actifs - Dettes', netWorth >= 0 ? '#10b981' : '#ef4444'));
    grid.appendChild(metric('Patrimoine brut', fc(grossWorth), 'Total des actifs'));
    grid.appendChild(metric('Total dettes', fc(totalDebt + totalMortgage), 'Crédits + emprunts', '#ef4444'));
    grid.appendChild(metric('Épargne liquide', fc(p.currentSavings || 0), 'Disponible immédiatement'));
    grid.appendChild(metric('Investissements', fc(totalInv), `${investments.length} placements`));
    grid.appendChild(metric('Immobilier', fc(totalRE), `${realEstate.length} biens`));
    wrap.appendChild(el('div', { className: 'anim-slide-up stagger-1' }, [grid]));

    // Sankey-style flow
    const flow = el('div', { className: 'wealth-flow anim-slide-up stagger-2' });
    flow.innerHTML = `<h3 class="section-title">Flux mensuels</h3>`;
    const flowGrid = el('div', { className: 'flow-grid' });

    const incomeBox = el('div', { className: 'flow-box flow-box--income' });
    incomeBox.innerHTML = `<div class="flow-box__header">💰 Revenus</div><div class="flow-box__amount">${fc(bal.income)}/mois</div>`;
    const expenseBox = el('div', { className: 'flow-box flow-box--expense' });
    expenseBox.innerHTML = `<div class="flow-box__header">💸 Dépenses</div><div class="flow-box__amount">${fc(bal.expenses)}/mois</div><div class="flow-box__detail">Fixes: ${fc(bal.fixed)} | Variables: ${fc(bal.variable)}</div>`;
    const savingsBox = el('div', { className: 'flow-box flow-box--savings' });
    savingsBox.innerHTML = `<div class="flow-box__header">📈 Épargne</div><div class="flow-box__amount">${fc(Math.max(0, bal.surplus))}/mois</div><div class="flow-box__detail">Taux: ${fp(bal.savingsRate)}</div>`;

    flowGrid.append(incomeBox, el('div', { className: 'flow-arrow' }, ['→']), expenseBox, el('div', { className: 'flow-arrow' }, ['→']), savingsBox);
    flow.appendChild(flowGrid);
    wrap.appendChild(flow);

    // Asset breakdown chart
    const chartWrap = el('div', { className: 'card anim-slide-up stagger-3' });
    chartWrap.innerHTML = '<h3 class="section-title">Répartition du patrimoine</h3>';
    const canvas = el('div', { className: 'chart-canvas', style: { height: '300px' } });
    chartWrap.appendChild(canvas);
    wrap.appendChild(chartWrap);
    container.appendChild(wrap);

    requestAnimationFrame(() => {
      const items = [];
      if (p.currentSavings > 0) items.push({ name: 'Épargne liquide', value: p.currentSavings });
      investments.forEach(i => items.push({ name: FinEngine.ASSET_CLASSES?.[i.type]?.label || i.type, value: i.amount || 0 }));
      realEstate.forEach(r => items.push({ name: r.label || 'Immobilier', value: r.value || 0 }));
      if (items.length) {
        initChart(canvas, {
          tooltip: { trigger: 'item', formatter: '{b}: {c}€ ({d}%)' },
          series: [{ type: 'pie', radius: ['40%', '70%'], data: items, emphasis: { itemStyle: { shadowBlur: 10 } }, label: { color: '#ccc', fontSize: 11 } }]
        });
      }
    });
  }

  /* =============================================================
     2. PERFORMANCE HISTORIQUE
     ============================================================= */
  function performance(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('trending-up', 'Performance historique', 'Évolution simulée de votre patrimoine'));

    const totalInv = (p.investments || []).reduce((s, i) => s + (i.amount || 0), 0);
    const bal = FinEngine.computeMonthlyBalance(p);
    const months = 60;

    // Simulate monthly performance
    let port = totalInv;
    const data = []; const inflData = []; const cac = [];
    let inflStart = totalInv; let cacStart = totalInv;

    for (let m = 0; m <= months; m++) {
      const date = new Date(); date.setMonth(date.getMonth() - months + m);
      data.push([date.toISOString().slice(0, 7), Math.round(port)]);
      inflData.push([date.toISOString().slice(0, 7), Math.round(inflStart)]);
      cac.push([date.toISOString().slice(0, 7), Math.round(cacStart)]);
      port = port * (1 + (0.07 + (Math.random() - 0.5) * 0.15) / 12) + Math.max(0, bal.surplus);
      inflStart *= (1 + 0.025 / 12);
      cacStart *= (1 + (0.08 + (Math.random() - 0.5) * 0.2) / 12);
    }

    const totalReturn = port - totalInv - bal.surplus * months;
    const grid = el('div', { className: 'metrics-grid anim-slide-up stagger-1' });
    grid.appendChild(metric('Valeur actuelle', fc(port), 'Portefeuille estimé'));
    grid.appendChild(metric('Rendement', fc(totalReturn), totalReturn >= 0 ? 'Gain total' : 'Perte totale', totalReturn >= 0 ? '#10b981' : '#ef4444'));
    grid.appendChild(metric('TRI annualisé', fp(((port / totalInv) ** (12 / months) - 1) * 100), 'Rendement annuel'));
    grid.appendChild(metric('Période', `${months} mois`, 'Historique simulé'));
    wrap.appendChild(grid);

    const chartCard = el('div', { className: 'card anim-slide-up stagger-2' });
    const canvas = el('div', { className: 'chart-canvas', style: { height: '350px' } });
    chartCard.appendChild(canvas);
    wrap.appendChild(chartCard);
    container.appendChild(wrap);

    requestAnimationFrame(() => {
      initChart(canvas, {
        tooltip: { trigger: 'axis' },
        legend: { data: ['Mon patrimoine', 'Inflation', 'CAC 40'], textStyle: { color: '#aaa' } },
        xAxis: { type: 'category', data: data.map(d => d[0]), axisLabel: { color: '#888' } },
        yAxis: { type: 'value', axisLabel: { color: '#888', formatter: v => (v / 1000) + 'k€' } },
        series: [
          { name: 'Mon patrimoine', type: 'line', data: data.map(d => d[1]), smooth: true, lineStyle: { width: 3 }, areaStyle: { opacity: 0.1 }, itemStyle: { color: '#0ea5a4' } },
          { name: 'Inflation', type: 'line', data: inflData.map(d => d[1]), smooth: true, lineStyle: { width: 1, type: 'dashed', color: '#ef4444' }, itemStyle: { color: '#ef4444' } },
          { name: 'CAC 40', type: 'line', data: cac.map(d => d[1]), smooth: true, lineStyle: { width: 1, type: 'dashed', color: '#8b5cf6' }, itemStyle: { color: '#8b5cf6' } }
        ]
      });
    });
  }

  /* =============================================================
     3. FIRE — Financial Independence
     ============================================================= */
  function fire(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const data = FinExtra.computeFIRE(p);
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('zap', 'Indépendance financière (FIRE)', `Liberté financière à ${data.fireAge} ans`));

    // Progress ring
    const progressSection = el('div', { className: 'fire-hero anim-slide-up stagger-1' });
    const ring = progressRing(data.progress, 120, data.progress >= 100 ? '#10b981' : '#0ea5a4');
    progressSection.appendChild(ring);
    progressSection.appendChild(el('div', { className: 'fire-hero__details' }, [
      el('h3', { textContent: `${fp(data.progress)} vers la liberté` }),
      el('p', { className: 'text-muted', textContent: data.yearsToFire < 100 ? `Encore ${data.yearsToFire} ans (${data.fireAge} ans)` : 'Objectif non atteignable avec le taux d\'épargne actuel' })
    ]));
    wrap.appendChild(progressSection);

    // FIRE variants
    const grid = el('div', { className: 'metrics-grid anim-slide-up stagger-2' });
    grid.appendChild(metric('FIRE Number', fc(data.fireNumber), 'Patrimoine cible (règle 4%)'));
    grid.appendChild(metric('Lean FIRE', fc(data.leanFireNumber), '70% des dépenses'));
    grid.appendChild(metric('Fat FIRE', fc(data.fatFireNumber), '150% des dépenses'));
    grid.appendChild(metric('Coast FIRE', fc(data.coastFireNumber), 'Ne plus rien ajouter'));
    grid.appendChild(metric('Barista FIRE', fc(data.baristaFireNumber), 'Mi-temps suffisant'));
    grid.appendChild(metric('Revenu passif', fc(data.monthlyPassiveIncome) + '/mois', 'Avec patrimoine actuel'));
    wrap.appendChild(grid);

    // Journey chart
    const chartCard = el('div', { className: 'card anim-slide-up stagger-3' });
    chartCard.innerHTML = '<h3 class="section-title">🔥 Trajectoire FIRE</h3>';
    const canvas = el('div', { className: 'chart-canvas', style: { height: '300px' } });
    chartCard.appendChild(canvas);
    wrap.appendChild(chartCard);
    container.appendChild(wrap);

    requestAnimationFrame(() => {
      initChart(canvas, {
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: data.journey.map(j => j.age + ' ans'), axisLabel: { color: '#888' } },
        yAxis: { type: 'value', axisLabel: { color: '#888', formatter: v => (v / 1000) + 'k€' } },
        series: [
          { name: 'Portefeuille', type: 'line', data: data.journey.map(j => j.portfolio), smooth: true, areaStyle: { opacity: 0.15 }, lineStyle: { width: 3 }, itemStyle: { color: '#0ea5a4' } },
          { name: 'Objectif FIRE', type: 'line', data: data.journey.map(j => j.fireTarget), lineStyle: { width: 2, type: 'dashed', color: '#ef4444' }, itemStyle: { color: '#ef4444' } }
        ]
      });
    });
  }

  /* =============================================================
     4. COMPARATEUR DE SCÉNARIOS
     ============================================================= */
  function comparateur(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('layers', 'Comparateur de scénarios', 'Comparez différentes stratégies côte-à-côte'));

    const scenarios = [
      { name: '100% ETF Monde', description: 'Tout en ETF diversifié', investType: 'etf_monde', monthlyInvestment: 300, returnRate: 7 },
      { name: '50/50 ETF-Immo', description: 'Moitié ETF, moitié SCPI', investType: 'scpi', monthlyInvestment: 300, returnRate: 5.5 },
      { name: 'Crypto aggresif', description: 'Portefeuille orienté crypto', investType: 'crypto', monthlyInvestment: 300, returnRate: 12 }
    ];

    const results = FinExtra.compareScenarios(p, scenarios);
    const table = el('div', { className: 'comparison-table anim-slide-up stagger-1' });

    // Header
    const headerRow = el('div', { className: 'comp-row comp-row--header' });
    headerRow.appendChild(el('div', { className: 'comp-cell' }, ['Métrique']));
    results.forEach(r => headerRow.appendChild(el('div', { className: 'comp-cell' }, [el('strong', { textContent: r.name }), el('div', { className: 'text-muted', textContent: r.description, style: { fontSize: '11px' } })])));
    table.appendChild(headerRow);

    // Rows
    const metrics = [
      { label: 'Score santé', key: 'healthScore', fmt: v => v + '/100' },
      { label: 'Âge FIRE', key: 'fireAge', fmt: v => v + ' ans' },
      { label: 'Patrimoine 10 ans', key: 'wealthIn10y', fmt: fc },
      { label: 'Patrimoine 20 ans', key: 'wealthIn20y', fmt: fc },
      { label: 'Patrimoine 30 ans', key: 'wealthIn30y', fmt: fc },
      { label: 'Revenu passif/mois', key: 'monthlyPassiveIncome', fmt: fc }
    ];

    metrics.forEach(m => {
      const row = el('div', { className: 'comp-row' });
      row.appendChild(el('div', { className: 'comp-cell comp-cell--label' }, [m.label]));
      const values = results.map(r => r[m.key]);
      const best = Math.max(...values);
      results.forEach(r => {
        const cell = el('div', { className: `comp-cell ${r[m.key] === best ? 'comp-cell--best' : ''}` });
        cell.textContent = m.fmt(r[m.key]);
        row.appendChild(cell);
      });
      table.appendChild(row);
    });
    wrap.appendChild(table);

    // Chart
    const chartCard = el('div', { className: 'card anim-slide-up stagger-2' });
    chartCard.innerHTML = '<h3 class="section-title">Projection sur 30 ans</h3>';
    const canvas = el('div', { className: 'chart-canvas', style: { height: '300px' } });
    chartCard.appendChild(canvas);
    wrap.appendChild(chartCard);
    container.appendChild(wrap);

    requestAnimationFrame(() => {
      const colors = ['#0ea5a4', '#8b5cf6', '#f59e0b'];
      initChart(canvas, {
        tooltip: { trigger: 'axis' },
        legend: { data: results.map(r => r.name), textStyle: { color: '#aaa' } },
        xAxis: { type: 'category', data: results[0].projection.map(p2 => 'An ' + p2.year), axisLabel: { color: '#888' } },
        yAxis: { type: 'value', axisLabel: { color: '#888', formatter: v => (v / 1000) + 'k€' } },
        series: results.map((r, i) => ({
          name: r.name, type: 'line', data: r.projection.map(p2 => p2.value), smooth: true,
          lineStyle: { width: 2, color: colors[i] }, itemStyle: { color: colors[i] }
        }))
      });
    });
  }

  /* =============================================================
     5. SIMULATEUR DE CRÉDIT
     ============================================================= */
  function credit(container) {
    container.innerHTML = '';
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('home', 'Simulateur de crédit', 'Calculez votre amortissement'));

    let params = { amount: 200000, rate: 3.5, durationYears: 20, insurance: 0.36 };
    const formCard = el('div', { className: 'card anim-slide-up stagger-1' });
    const resultsDiv = el('div', { id: 'credit-results' });

    function buildForm() {
      formCard.innerHTML = '';
      const fields = [
        { label: 'Montant emprunté (€)', key: 'amount', min: 10000, max: 1000000, step: 5000 },
        { label: 'Taux d\'intérêt (%)', key: 'rate', min: 0.5, max: 10, step: 0.1 },
        { label: 'Durée (années)', key: 'durationYears', min: 5, max: 30, step: 1 },
        { label: 'Assurance (%)', key: 'insurance', min: 0, max: 1, step: 0.01 }
      ];

      fields.forEach(f => {
        const group = el('div', { className: 'slider-wrap' });
        const label = el('label', { textContent: `${f.label}: ${f.key === 'rate' || f.key === 'insurance' ? params[f.key] + '%' : fc(params[f.key])}` });
        const slider = el('input', { type: 'range', className: 'slider', min: String(f.min), max: String(f.max), step: String(f.step), value: String(params[f.key]) });
        slider.addEventListener('input', () => {
          params[f.key] = parseFloat(slider.value);
          label.textContent = `${f.label}: ${f.key === 'rate' || f.key === 'insurance' ? params[f.key] + '%' : fc(params[f.key])}`;
          renderResults();
        });
        group.append(label, slider);
        formCard.appendChild(group);
      });
    }

    function renderResults() {
      resultsDiv.innerHTML = '';
      const r = FinExtra.simulateCredit(params);

      const grid = el('div', { className: 'metrics-grid' });
      grid.appendChild(metric('Mensualité', fc(r.monthlyTotal), 'Capital + intérêts + assurance'));
      grid.appendChild(metric('Coût total', fc(r.totalCost), `${fp(r.costRatio)} du montant emprunté`, '#ef4444'));
      grid.appendChild(metric('Total intérêts', fc(r.totalInterest), 'Payés à la banque'));
      grid.appendChild(metric('Total assurance', fc(r.totalInsurance), 'Sur toute la durée'));
      resultsDiv.appendChild(grid);

      // Amortization chart
      const chartCard = el('div', { className: 'card' });
      chartCard.innerHTML = '<h3 class="section-title">Amortissement</h3>';
      const canvas = el('div', { className: 'chart-canvas', style: { height: '280px' } });
      chartCard.appendChild(canvas);
      resultsDiv.appendChild(chartCard);

      requestAnimationFrame(() => {
        const annual = r.schedule.filter(s => s.month % 12 === 0);
        initChart(canvas, {
          tooltip: { trigger: 'axis' },
          legend: { data: ['Capital restant', 'Intérêts cumulés'], textStyle: { color: '#aaa' } },
          xAxis: { type: 'category', data: annual.map(s => 'An ' + s.year), axisLabel: { color: '#888' } },
          yAxis: { type: 'value', axisLabel: { color: '#888', formatter: v => (v / 1000) + 'k€' } },
          series: [
            { name: 'Capital restant', type: 'bar', data: annual.map(s => s.remaining), itemStyle: { color: '#0ea5a4' }, stack: 'a' },
            { name: 'Intérêts cumulés', type: 'bar', data: annual.map(s => s.cumInterest), itemStyle: { color: '#ef4444' }, stack: 'a' }
          ]
        });
      });
    }

    buildForm();
    wrap.append(formCard, resultsDiv);
    container.appendChild(wrap);
    renderResults();
  }

  /* =============================================================
     6. CALCULATEUR DE DIVIDENDES
     ============================================================= */
  function dividendes(container) {
    container.innerHTML = '';
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('dollar-sign', 'Calculateur de dividendes', 'Projection de revenus passifs'));

    let params = { initialInvestment: 10000, monthlyContribution: 200, dividendYield: 3.5, growthRate: 5, years: 30, reinvest: true, taxRate: 30 };
    const formCard = el('div', { className: 'card anim-slide-up stagger-1' });
    const resultsDiv = el('div', {});

    function buildForm() {
      formCard.innerHTML = '<h3 class="section-title">Paramètres</h3>';
      const fields = [
        { label: 'Capital initial', key: 'initialInvestment', min: 0, max: 500000, step: 1000, fmt: fc },
        { label: 'Apport mensuel', key: 'monthlyContribution', min: 0, max: 5000, step: 50, fmt: fc },
        { label: 'Rendement dividendes', key: 'dividendYield', min: 0, max: 12, step: 0.1, fmt: v => v + '%' },
        { label: 'Croissance annuelle', key: 'growthRate', min: 0, max: 15, step: 0.5, fmt: v => v + '%' },
        { label: 'Horizon (années)', key: 'years', min: 1, max: 50, step: 1, fmt: v => v + ' ans' },
        { label: 'Fiscalité', key: 'taxRate', min: 0, max: 50, step: 1, fmt: v => v + '%' }
      ];
      fields.forEach(f => {
        const group = el('div', { className: 'slider-wrap' });
        const label = el('label', { textContent: `${f.label}: ${f.fmt(params[f.key])}` });
        const slider = el('input', { type: 'range', className: 'slider', min: String(f.min), max: String(f.max), step: String(f.step), value: String(params[f.key]) });
        slider.addEventListener('input', () => { params[f.key] = parseFloat(slider.value); label.textContent = `${f.label}: ${f.fmt(params[f.key])}`; renderResults(); });
        group.append(label, slider);
        formCard.appendChild(group);
      });
      // Reinvest toggle
      const toggle = el('label', { className: 'toggle-label' }, [
        el('input', { type: 'checkbox', checked: params.reinvest ? 'true' : undefined, onChange: (e) => { params.reinvest = e.target.checked; renderResults(); } }),
        ' Réinvestir les dividendes (DRIP)'
      ]);
      formCard.appendChild(toggle);
    }

    function renderResults() {
      resultsDiv.innerHTML = '';
      const r = FinExtra.computeDividends(params);

      const grid = el('div', { className: 'metrics-grid' });
      grid.appendChild(metric('Portefeuille final', fc(r.finalPortfolio), `Après ${params.years} ans`));
      grid.appendChild(metric('Revenu mensuel', fc(r.finalMonthlyIncome), 'Net de fiscalité', '#10b981'));
      grid.appendChild(metric('Dividendes totaux', fc(r.totalDividends), 'Cumulés sur la période'));
      grid.appendChild(metric('Contributions', fc(r.totalContributions), 'Capital investi'));
      resultsDiv.appendChild(grid);

      const chartCard = el('div', { className: 'card' });
      chartCard.innerHTML = '<h3 class="section-title">Projection dividendes</h3>';
      const canvas = el('div', { className: 'chart-canvas', style: { height: '300px' } });
      chartCard.appendChild(canvas);
      resultsDiv.appendChild(chartCard);

      requestAnimationFrame(() => {
        initChart(canvas, {
          tooltip: { trigger: 'axis' },
          legend: { data: ['Portefeuille', 'Dividendes cumulés', 'Contributions'], textStyle: { color: '#aaa' } },
          xAxis: { type: 'category', data: r.projection.map(p2 => 'An ' + p2.year), axisLabel: { color: '#888' } },
          yAxis: { type: 'value', axisLabel: { color: '#888', formatter: v => (v / 1000) + 'k€' } },
          series: [
            { name: 'Portefeuille', type: 'line', data: r.projection.map(p2 => p2.portfolio), smooth: true, areaStyle: { opacity: 0.1 }, itemStyle: { color: '#0ea5a4' } },
            { name: 'Dividendes cumulés', type: 'line', data: r.projection.map(p2 => p2.totalDividends), smooth: true, itemStyle: { color: '#10b981' } },
            { name: 'Contributions', type: 'line', data: r.projection.map(p2 => p2.totalContributions), lineStyle: { type: 'dashed' }, itemStyle: { color: '#888' } }
          ]
        });
      });
    }

    buildForm();
    wrap.append(formCard, resultsDiv);
    container.appendChild(wrap);
    renderResults();
  }

  /* =============================================================
     7. WHAT-IF ANALYSIS
     ============================================================= */
  function whatif(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('zap', 'Analyse What-If', 'Que se passe-t-il si…'));

    let scenario = { salaryChange: 0, extraInvestment: 0, expenseChange: 0 };
    const formCard = el('div', { className: 'card anim-slide-up stagger-1' });
    const resultsDiv = el('div', {});

    function render() {
      formCard.innerHTML = '<h3 class="section-title">🎚️ Ajustez les curseurs</h3>';
      const sliders = [
        { label: 'Salaire', key: 'salaryChange', min: -50, max: 100, step: 5, suffix: '%', icon: '💰' },
        { label: 'Investissement mensuel supplémentaire', key: 'extraInvestment', min: 0, max: 2000, step: 50, suffix: '€', icon: '📈' },
        { label: 'Dépenses', key: 'expenseChange', min: -50, max: 50, step: 5, suffix: '%', icon: '💸' }
      ];
      sliders.forEach(s => {
        const group = el('div', { className: 'slider-wrap' });
        const val = scenario[s.key];
        const label = el('label', { textContent: `${s.icon} ${s.label}: ${val >= 0 ? '+' : ''}${val}${s.suffix}` });
        const slider = el('input', { type: 'range', className: 'slider', min: String(s.min), max: String(s.max), step: String(s.step), value: String(val) });
        slider.addEventListener('input', () => { scenario[s.key] = parseFloat(slider.value); render(); });
        group.append(label, slider);
        formCard.appendChild(group);
      });

      resultsDiv.innerHTML = '';
      const r = FinExtra.computeWhatIf(p, scenario);

      const compGrid = el('div', { className: 'whatif-grid' });
      const items = [
        { label: 'Score santé', base: r.base.healthScore, mod: r.modified.healthScore, delta: r.deltas.healthScore, suffix: '/100' },
        { label: 'Surplus mensuel', base: fc(r.base.monthlySurplus), mod: fc(r.modified.monthlySurplus), delta: r.deltas.monthlySurplus, prefix: '€' },
        { label: 'Taux d\'épargne', base: fp(r.base.savingsRate), mod: fp(r.modified.savingsRate), delta: r.deltas.savingsRate, suffix: '%' },
        { label: 'Âge FIRE', base: r.base.fireAge + ' ans', mod: r.modified.fireAge + ' ans', delta: r.deltas.yearsToFire, suffix: ' ans', invert: true },
        { label: 'Patrimoine +10 ans', base: '', mod: '', delta: r.deltas.wealthIn10y, prefix: '€' }
      ];

      items.forEach(item => {
        const row = el('div', { className: 'whatif-row' });
        const isPositive = item.invert ? item.delta < 0 : item.delta > 0;
        const deltaStr = (item.delta > 0 ? '+' : '') + (item.prefix === '€' ? fc(item.delta) : item.delta) + (item.suffix || '');
        row.innerHTML = `<span class="whatif-label">${item.label}</span><span class="whatif-base">${item.base}</span><span class="whatif-arrow">→</span><span class="whatif-mod">${item.mod}</span><span class="whatif-delta ${isPositive ? 'whatif-delta--pos' : 'whatif-delta--neg'}">${deltaStr}</span>`;
        compGrid.appendChild(row);
      });
      resultsDiv.appendChild(compGrid);
    }

    wrap.append(formCard, resultsDiv);
    container.appendChild(wrap);
    render();
  }

  /* =============================================================
     8. ESG SCORE
     ============================================================= */
  function esg(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const data = FinExtra.computeESG(p);
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('globe', 'Score ESG', 'Impact environnemental, social & gouvernance'));

    const hero = el('div', { className: 'esg-hero anim-slide-up stagger-1' });
    const gradeEl = el('div', { className: `esg-grade esg-grade--${data.grade.replace('+', 'plus')}` });
    gradeEl.textContent = data.grade;
    hero.appendChild(gradeEl);
    hero.appendChild(el('div', { className: 'esg-hero__details' }, [
      el('h3', { textContent: `Score global : ${Math.round(data.total)}/100` }),
      el('div', { className: 'esg-bars' }, [
        el('div', { className: 'esg-bar-item' }, [el('span', { textContent: '🌍 Environnement' }), progressBar(data.e, '#10b981')]),
        el('div', { className: 'esg-bar-item' }, [el('span', { textContent: '👥 Social' }), progressBar(data.s, '#3b82f6')]),
        el('div', { className: 'esg-bar-item' }, [el('span', { textContent: '🏛️ Gouvernance' }), progressBar(data.g, '#8b5cf6')])
      ])
    ]));
    wrap.appendChild(hero);

    // Detail per investment
    if (data.details.length) {
      const detCard = el('div', { className: 'card anim-slide-up stagger-2' });
      detCard.innerHTML = '<h3 class="section-title">Détail par investissement</h3>';
      data.details.forEach(d => {
        const row = el('div', { className: 'esg-detail-row' });
        row.innerHTML = `<span class="esg-detail-name">${d.label}</span><span class="esg-detail-weight">${fp(d.weight)}</span><span class="esg-detail-score">${Math.round(d.average)}/100</span>`;
        detCard.appendChild(row);
      });
      wrap.appendChild(detCard);
    }

    // Recommendations
    if (data.recommendations?.length) {
      const recCard = el('div', { className: 'card anim-slide-up stagger-3' });
      recCard.innerHTML = '<h3 class="section-title">💡 Recommandations</h3>';
      data.recommendations.forEach(r => {
        recCard.appendChild(el('div', { className: `advice-card advice-card--${r.severity}` }, [
          el('strong', { textContent: r.type }), el('p', { textContent: r.message })
        ]));
      });
      wrap.appendChild(recCard);
    }

    container.appendChild(wrap);
  }

  /* =============================================================
     9. STRESS TEST
     ============================================================= */
  function stresstest(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('alert', 'Stress Test', 'Résistance de votre portefeuille aux crises'));

    let selectedScenario = 'crash_2008';
    const scenarioBar = el('div', { className: 'news-category-bar anim-slide-up stagger-1' });
    const resultsDiv = el('div', {});

    function renderBar() {
      scenarioBar.innerHTML = '';
      FinExtra.CRISIS_SCENARIOS.filter(s => s.id !== 'custom').forEach(sc => {
        scenarioBar.appendChild(el('button', {
          className: `news-cat-btn ${selectedScenario === sc.id ? 'news-cat-btn--active' : ''}`,
          textContent: `${sc.name} (${sc.drop}%)`,
          onClick: () => { selectedScenario = sc.id; renderBar(); renderResults(); }
        }));
      });
    }

    function renderResults() {
      resultsDiv.innerHTML = '';
      const r = FinExtra.runStressTest(p, selectedScenario);

      const grid = el('div', { className: 'metrics-grid' });
      grid.appendChild(metric('Perte totale', fc(r.totalLoss), `${fp(r.lossPct)} du portefeuille`, '#ef4444'));
      grid.appendChild(metric('Portefeuille après', fc(r.portfolioAfter), `Était ${fc(r.portfolioBefore)}`));
      grid.appendChild(metric('Recovery', `${r.scenario.recoveryYears} ans`, 'Temps pour récupérer'));
      grid.appendChild(metric('Survivabilité', r.canSurvive ? '✅ OK' : '⚠️ Risqué', r.canSurvive ? 'Fonds d\'urgence suffisant' : 'Fonds d\'urgence insuffisant', r.canSurvive ? '#10b981' : '#ef4444'));
      resultsDiv.appendChild(grid);

      // Impact per asset
      if (r.impactDetails.length) {
        const detCard = el('div', { className: 'card' });
        detCard.innerHTML = '<h3 class="section-title">Impact par actif</h3>';
        r.impactDetails.forEach(d => {
          const row = el('div', { className: 'stress-row' });
          row.innerHTML = `<span>${d.label}</span><span>${fc(d.before)}</span><span style="color:#ef4444">${d.impactPct > 0 ? '+' : ''}${fp(d.impactPct)}</span><span>${fc(d.after)}</span>`;
          detCard.appendChild(row);
        });
        resultsDiv.appendChild(detCard);
      }

      // Recovery chart
      const chartCard = el('div', { className: 'card' });
      chartCard.innerHTML = '<h3 class="section-title">Trajectoire de récupération</h3>';
      const canvas = el('div', { className: 'chart-canvas', style: { height: '260px' } });
      chartCard.appendChild(canvas);
      resultsDiv.appendChild(chartCard);

      requestAnimationFrame(() => {
        initChart(canvas, {
          tooltip: { trigger: 'axis' },
          xAxis: { type: 'category', data: r.recovery.map(rv => 'An ' + rv.year), axisLabel: { color: '#888' } },
          yAxis: { type: 'value', axisLabel: { color: '#888', formatter: v => (v / 1000) + 'k€' } },
          series: [
            { name: 'Portefeuille', type: 'line', data: r.recovery.map(rv => rv.portfolio), smooth: true, areaStyle: { opacity: 0.1 }, itemStyle: { color: '#0ea5a4' } },
            { name: 'Niveau initial', type: 'line', data: r.recovery.map(rv => rv.target), lineStyle: { type: 'dashed', color: '#888' }, itemStyle: { color: '#888' } }
          ]
        });
      });
    }

    renderBar();
    wrap.append(scenarioBar, resultsDiv);
    container.appendChild(wrap);
    renderResults();
  }

  /* =============================================================
     10. OPTIMISEUR FISCAL AVANCÉ
     ============================================================= */
  function fiscalite(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const a = Store.getState().analysis;
    const tax = a?.taxOptimization || FinEngine.computeTaxOptimization(p);
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('percent', 'Optimiseur fiscal', 'Maximisez votre rendement net d\'impôt'));

    const grid = el('div', { className: 'metrics-grid anim-slide-up stagger-1' });
    grid.appendChild(metric('TMI estimé', tax.estimatedTMI + '%', 'Taux marginal d\'imposition'));
    grid.appendChild(metric('IR estimé', fc(tax.estimatedTax), 'Impôt sur le revenu'));
    grid.appendChild(metric('Flat Tax', '30%', 'PFU sur revenus du capital'));
    grid.appendChild(metric('Économie potentielle', fc(tax.potentialSavings || 0), 'Via optimisation', '#10b981'));
    wrap.appendChild(grid);

    // Envelope comparison
    const envCard = el('div', { className: 'card anim-slide-up stagger-2' });
    envCard.innerHTML = '<h3 class="section-title">📊 Comparaison des enveloppes</h3>';
    const envelopes = [
      { name: 'PEA', avantage: 'Exonération IR après 5 ans', fiscal: '17,2% (PS uniquement)', plafond: '150 000€', ideal: 'Actions européennes' },
      { name: 'Assurance-vie', avantage: 'Abattement après 8 ans', fiscal: '24,7% après 8 ans', plafond: 'Illimité', ideal: 'Diversification + succession' },
      { name: 'PER', avantage: 'Déduction du revenu imposable', fiscal: 'Déductible à la TMI', plafond: '10% des revenus', ideal: 'TMI ≥ 30% + retraite' },
      { name: 'CTO', avantage: 'Pas de restriction', fiscal: 'Flat Tax 30%', plafond: 'Illimité', ideal: 'Actions non-européennes' },
      { name: 'Livret A', avantage: 'Exonération totale', fiscal: '0%', plafond: '22 950€', ideal: 'Épargne de précaution' }
    ];
    envelopes.forEach(env => {
      const row = el('div', { className: 'env-row' });
      row.innerHTML = `<div class="env-row__name"><strong>${env.name}</strong></div><div class="env-row__detail"><span>Avantage: ${env.avantage}</span><span>Fiscalité: ${env.fiscal}</span><span>Plafond: ${env.plafond}</span><span>Idéal: ${env.ideal}</span></div>`;
      envCard.appendChild(row);
    });
    wrap.appendChild(envCard);

    // Recommendations
    if (tax.recommendations?.length) {
      const recCard = el('div', { className: 'card anim-slide-up stagger-3' });
      recCard.innerHTML = '<h3 class="section-title">💡 Recommandations fiscales</h3>';
      tax.recommendations.forEach(r => {
        recCard.appendChild(adviceCard(r.icon || '📋', r.title, r.action, r.type || 'info'));
      });
      wrap.appendChild(recCard);
    }

    container.appendChild(wrap);
  }

  /* =============================================================
     11. BADGES / ACHIEVEMENTS
     ============================================================= */
  function badges(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const a = Store.getState().analysis;
    const allBadges = FinExtra.evaluateBadges(p, a);
    const unlocked = allBadges.filter(b => b.unlocked);
    const locked = allBadges.filter(b => !b.unlocked);

    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('star', 'Badges & Trophées', `${unlocked.length}/${allBadges.length} débloqués`));

    // Progress
    const prog = el('div', { className: 'badge-progress anim-slide-up stagger-1' });
    prog.appendChild(progressBar((unlocked.length / allBadges.length) * 100, '#f59e0b'));
    wrap.appendChild(prog);

    // Unlocked
    if (unlocked.length) {
      const section = el('div', { className: 'badge-section anim-slide-up stagger-2' });
      section.innerHTML = '<h3 class="section-title">🏆 Débloqués</h3>';
      const grid = el('div', { className: 'badge-grid' });
      unlocked.forEach(b => {
        const card = el('div', { className: 'badge-card badge-card--unlocked' });
        card.innerHTML = `<div class="badge-card__icon">${b.icon}</div><div class="badge-card__name">${b.name}</div><div class="badge-card__desc">${b.desc}</div>`;
        grid.appendChild(card);
      });
      section.appendChild(grid);
      wrap.appendChild(section);
    }

    // Locked
    if (locked.length) {
      const section = el('div', { className: 'badge-section anim-slide-up stagger-3' });
      section.innerHTML = '<h3 class="section-title">🔒 À débloquer</h3>';
      const grid = el('div', { className: 'badge-grid' });
      locked.forEach(b => {
        const card = el('div', { className: 'badge-card badge-card--locked' });
        card.innerHTML = `<div class="badge-card__icon">${b.icon}</div><div class="badge-card__name">${b.name}</div><div class="badge-card__desc">${b.desc}</div>`;
        grid.appendChild(card);
      });
      section.appendChild(grid);
      wrap.appendChild(section);
    }

    container.appendChild(wrap);
  }

  /* =============================================================
     12. DÉFIS MENSUELS
     ============================================================= */
  function defis(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const challenges = FinExtra.generateChallenges(p);
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('target', 'Défis mensuels', 'Améliorez vos finances pas à pas'));

    const grid = el('div', { className: 'challenge-grid anim-slide-up stagger-1' });
    challenges.forEach((c, i) => {
      const card = el('div', { className: `challenge-card challenge-card--${c.difficulty} anim-slide-up stagger-${Math.min(i + 1, 8)}` });
      const diffLabel = { easy: '🟢 Facile', medium: '🟡 Moyen', hard: '🔴 Difficile' }[c.difficulty];
      card.innerHTML = `
        <div class="challenge-card__icon">${c.icon}</div>
        <div class="challenge-card__content">
          <h4>${c.title}</h4>
          <p>${c.desc}</p>
          <span class="challenge-card__diff">${diffLabel}</span>
        </div>
        <div class="challenge-card__target">${c.target > 100 ? fc(c.target) : c.target}</div>
      `;
      grid.appendChild(card);
    });
    wrap.appendChild(grid);

    // Tips
    const tips = el('div', { className: 'card anim-slide-up stagger-4' });
    tips.innerHTML = '<h3 class="section-title">💡 Conseils pour réussir</h3><ul class="tips-list"><li>Commencez par les défis faciles pour construire des habitudes</li><li>Fixez-vous un rappel quotidien pour vérifier votre progression</li><li>Célébrez chaque petit succès — ils s\'accumulent !</li><li>Partagez vos défis avec un ami pour rester motivé</li></ul>';
    wrap.appendChild(tips);

    container.appendChild(wrap);
  }

  /* =============================================================
     13. SCORECARD (Discipline financière)
     ============================================================= */
  function scorecard(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const a = Store.getState().analysis;
    const bal = a?.balance || FinEngine.computeMonthlyBalance(p);
    const ef = a?.emergencyFund || FinEngine.computeEmergencyFund(p);
    const fire = FinExtra.computeFIRE(p);
    const esgData = FinExtra.computeESG(p);

    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('shield', 'Scorecard financière', 'Évaluation complète de votre rigueur'));

    // Overall grade
    const healthScore = a?.healthScore?.total || 0;
    const grade = healthScore >= 90 ? 'A+' : healthScore >= 80 ? 'A' : healthScore >= 70 ? 'B+' : healthScore >= 60 ? 'B' : healthScore >= 50 ? 'C' : healthScore >= 40 ? 'D' : 'E';

    const hero = el('div', { className: 'scorecard-hero anim-slide-up stagger-1' });
    hero.appendChild(scoreGauge(healthScore, 140));
    hero.appendChild(el('div', { className: 'scorecard-hero__info' }, [
      el('h2', { textContent: `Grade ${grade}` }),
      el('p', { className: 'text-muted', textContent: healthScore >= 80 ? 'Excellence financière !' : healthScore >= 60 ? 'Bon profil, avec des axes d\'amélioration' : 'Des efforts nécessaires sur plusieurs axes' })
    ]));
    wrap.appendChild(hero);

    // Category scores
    const categories = [
      { name: 'Taux d\'épargne', score: Math.min(100, (bal.savingsRate / 30) * 100), value: fp(bal.savingsRate), target: '> 20%', icon: '💰' },
      { name: 'Fonds d\'urgence', score: Math.min(100, (ef.monthsCovered / 6) * 100), value: ef.monthsCovered?.toFixed(1) + ' mois', target: '≥ 6 mois', icon: '🛡️' },
      { name: 'Endettement', score: Math.max(0, 100 - (a?.debtAnalysis?.debtToIncomeRatio || 0) * 3), value: fp(a?.debtAnalysis?.debtToIncomeRatio || 0), target: '< 33%', icon: '⚖️' },
      { name: 'Progression FIRE', score: fire.progress, value: fp(fire.progress), target: fire.fireAge + ' ans', icon: '🔥' },
      { name: 'Score ESG', score: esgData.total, value: esgData.grade, target: 'Grade A', icon: '🌱' },
      { name: 'Diversification', score: a?.healthScore?.components?.diversification?.score || 0, value: a?.healthScore?.components?.diversification?.detail || '', target: '≥ 5 classes', icon: '🌈' }
    ];

    const catGrid = el('div', { className: 'scorecard-grid anim-slide-up stagger-2' });
    categories.forEach(cat => {
      const card = el('div', { className: 'scorecard-item' });
      card.innerHTML = `
        <div class="scorecard-item__header"><span>${cat.icon} ${cat.name}</span><span class="scorecard-item__value">${cat.value}</span></div>
        <div class="progress-bar"><div class="progress-bar__fill" style="width:${Math.min(100, cat.score)}%;background:${cat.score >= 75 ? '#10b981' : cat.score >= 50 ? '#f59e0b' : '#ef4444'}"></div></div>
        <div class="scorecard-item__target">Objectif: ${cat.target}</div>
      `;
      catGrid.appendChild(card);
    });
    wrap.appendChild(catGrid);

    container.appendChild(wrap);
  }

  /* =============================================================
     14. TIMELINE INTERACTIVE
     ============================================================= */
  function timeline(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const fire = FinExtra.computeFIRE(p);
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('clock', 'Timeline financière', 'Votre parcours patrimonial'));

    const events = [];
    const currentAge = p.age || 30;
    const bal = FinEngine.computeMonthlyBalance(p);
    let wealth = (p.investments || []).reduce((s, i) => s + (i.amount || 0), 0) + (p.currentSavings || 0);

    // Past events
    events.push({ age: currentAge, type: 'now', title: 'Aujourd\'hui', desc: `Patrimoine: ${fc(wealth)}`, icon: '📍' });

    // Future milestones
    const milestones = [
      { threshold: 10000, title: 'Patrimoine 10k€', icon: '🎯' },
      { threshold: 50000, title: 'Patrimoine 50k€', icon: '💎' },
      { threshold: 100000, title: 'Patrimoine 100k€', icon: '🌟' },
      { threshold: 250000, title: 'Patrimoine 250k€', icon: '🏆' },
      { threshold: 500000, title: 'Patrimoine 500k€', icon: '🚀' },
      { threshold: 1000000, title: 'Millionnaire !', icon: '🎆' }
    ];

    let sim = wealth;
    for (let y = 1; y <= 50; y++) {
      const prevSim = sim;
      sim = sim * 1.06 + Math.max(0, bal.surplus * 12);
      const age = currentAge + y;
      milestones.forEach(m => {
        if (prevSim < m.threshold && sim >= m.threshold) {
          events.push({ age, type: 'milestone', title: m.title, desc: `À ${age} ans (dans ${y} ans)`, icon: m.icon });
        }
      });
      if (age === (p.retirementAge || 65)) {
        events.push({ age, type: 'retirement', title: 'Départ en retraite', desc: `Patrimoine estimé: ${fc(sim)}`, icon: '🏖️' });
      }
    }

    if (fire.fireAge < 100) {
      events.push({ age: fire.fireAge, type: 'fire', title: 'Indépendance FIRE', desc: `Patrimoine: ${fc(fire.fireNumber)}`, icon: '🔥' });
    }

    events.sort((a, b) => a.age - b.age);

    const timelineEl = el('div', { className: 'timeline-container anim-slide-up stagger-1' });
    events.forEach((ev, i) => {
      const item = el('div', { className: `timeline-item timeline-item--${ev.type} anim-slide-up stagger-${Math.min(i + 1, 8)}` });
      item.innerHTML = `
        <div class="timeline-item__dot">${ev.icon}</div>
        <div class="timeline-item__content">
          <div class="timeline-item__age">${ev.age} ans</div>
          <h4>${ev.title}</h4>
          <p class="text-muted">${ev.desc}</p>
        </div>
      `;
      timelineEl.appendChild(item);
    });
    wrap.appendChild(timelineEl);
    container.appendChild(wrap);
  }

  /* =============================================================
     15. BENCHMARK ANONYMISÉ
     ============================================================= */
  function benchmark(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const data = FinExtra.computeBenchmark(p);
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('bar-chart-2', 'Benchmark', `Comparaison par tranche d'âge (${data.bracket})`));

    const hero = el('div', { className: 'benchmark-hero anim-slide-up stagger-1' });
    hero.innerHTML = `<div class="benchmark-percentile">Top <strong>${100 - data.overallPercentile}%</strong></div><p class="text-muted">Vous êtes au ${data.overallPercentile}ème percentile de votre tranche d'âge</p>`;
    wrap.appendChild(hero);

    const grid = el('div', { className: 'metrics-grid anim-slide-up stagger-2' });

    const items = [
      { label: 'Taux d\'épargne', value: fp(data.savingsRate.value), percentile: data.savingsRate.percentile },
      { label: 'Patrimoine net', value: fc(data.netWorth.value), percentile: data.netWorth.percentile },
      { label: 'Taux d\'investissement', value: fp(data.investmentRate.value), percentile: data.investmentRate.percentile }
    ];

    items.forEach(item => {
      const card = el('div', { className: 'benchmark-card' });
      const color = item.percentile >= 75 ? '#10b981' : item.percentile >= 50 ? '#f59e0b' : '#ef4444';
      card.innerHTML = `
        <div class="benchmark-card__label">${item.label}</div>
        <div class="benchmark-card__value">${item.value}</div>
        <div class="benchmark-card__percentile" style="color:${color}">Top ${100 - item.percentile}%</div>
        <div class="progress-bar"><div class="progress-bar__fill" style="width:${item.percentile}%;background:${color}"></div></div>
      `;
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    container.appendChild(wrap);
  }

  /* =============================================================
     16. PROFIL PARTAGEABLE
     ============================================================= */
  function partage(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const a = Store.getState().analysis;
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('share', 'Profil partageable', 'Générer une carte de synthèse'));

    const cardPreview = el('div', { className: 'share-card-preview anim-slide-up stagger-1' });
    const healthScore = a?.healthScore?.total || 0;
    const bal = a?.balance || FinEngine.computeMonthlyBalance(p);
    const fire = FinExtra.computeFIRE(p);

    cardPreview.innerHTML = `
      <div class="share-card">
        <div class="share-card__header">💹 FinVest — Mon profil</div>
        <div class="share-card__score">
          <div class="share-card__gauge">${healthScore}<small>/100</small></div>
          <div>Score de santé financière</div>
        </div>
        <div class="share-card__metrics">
          <div><span>Taux d'épargne</span><strong>${fp(bal.savingsRate)}</strong></div>
          <div><span>Progression FIRE</span><strong>${fp(fire.progress)}</strong></div>
          <div><span>Âge FIRE</span><strong>${fire.fireAge} ans</strong></div>
          <div><span>Investissements</span><strong>${(p.investments || []).length} actifs</strong></div>
        </div>
        <div class="share-card__footer">Généré avec FinVest sur EZGalaxy</div>
      </div>
    `;
    wrap.appendChild(cardPreview);

    // Copy as text
    const actions = el('div', { className: 'share-actions anim-slide-up stagger-2' });
    actions.appendChild(el('button', { className: 'btn btn--primary', onClick: () => {
      const text = `💹 Mon profil FinVest\n━━━━━━━━━━━━━━━━━━\n🏥 Santé: ${healthScore}/100\n💰 Épargne: ${fp(bal.savingsRate)}\n🔥 FIRE: ${fp(fire.progress)} (${fire.fireAge} ans)\n📈 ${(p.investments || []).length} investissements\n━━━━━━━━━━━━━━━━━━\nGénéré avec FinVest`;
      try { navigator.clipboard.writeText(text); toast('Profil copié !', 'success'); }
      catch { toast('Erreur de copie', 'error'); }
    } }, [icon('clipboard', 16), ' Copier en texte']));
    wrap.appendChild(actions);
    container.appendChild(wrap);
  }

  /* =============================================================
     17. MINI-COURS
     ============================================================= */
  function cours(container) {
    container.innerHTML = '';
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('book', 'Éducation financière', 'Mini-cours interactifs'));

    let activeCourse = null;
    let activeLesson = 0;
    const contentDiv = el('div', {});

    function renderCourseList() {
      contentDiv.innerHTML = '';
      const grid = el('div', { className: 'course-grid anim-slide-up stagger-1' });
      FinExtra.COURSES.forEach(c => {
        const card = el('div', { className: 'course-card', onClick: () => { activeCourse = c; activeLesson = 0; renderLesson(); } });
        card.innerHTML = `
          <div class="course-card__icon">${c.icon}</div>
          <h4>${c.title}</h4>
          <div class="course-card__meta"><span>${c.duration}</span><span class="course-card__diff">${c.difficulty}</span></div>
          <div class="course-card__lessons">${c.lessons.length} leçons</div>
        `;
        grid.appendChild(card);
      });
      contentDiv.appendChild(grid);
    }

    function renderLesson() {
      contentDiv.innerHTML = '';
      const c = activeCourse;
      const lesson = c.lessons[activeLesson];

      const back = el('button', { className: 'btn btn--ghost btn--sm', onClick: () => { activeCourse = null; renderCourseList(); } }, [icon('chevron-left', 14), ' Retour']);
      contentDiv.appendChild(back);

      // Progress
      const prog = el('div', { className: 'course-progress' });
      prog.innerHTML = `<span>${c.title} — Leçon ${activeLesson + 1}/${c.lessons.length}</span>`;
      prog.appendChild(progressBar(((activeLesson + 1) / c.lessons.length) * 100));
      contentDiv.appendChild(prog);

      // Content
      const lessonCard = el('div', { className: 'card lesson-card anim-slide-up' });
      lessonCard.innerHTML = `<h3>${lesson.title}</h3><p class="lesson-content">${lesson.content}</p>`;

      // Quiz
      if (lesson.quiz) {
        const quizDiv = el('div', { className: 'quiz-section' });
        quizDiv.innerHTML = `<h4>📝 Quiz</h4><p>${lesson.quiz.q}</p>`;
        const opts = el('div', { className: 'quiz-options' });
        lesson.quiz.options.forEach((opt, i) => {
          opts.appendChild(el('button', { className: 'quiz-option', onClick: (e) => {
            opts.querySelectorAll('.quiz-option').forEach(b => b.classList.remove('quiz-option--correct', 'quiz-option--wrong'));
            e.target.classList.add(i === lesson.quiz.answer ? 'quiz-option--correct' : 'quiz-option--wrong');
            if (i === lesson.quiz.answer) toast('Bonne réponse ! 🎉', 'success');
            else toast('Essayez encore !', 'error');
          } }, [opt]));
        });
        quizDiv.appendChild(opts);
        lessonCard.appendChild(quizDiv);
      }

      // Navigation
      const nav = el('div', { className: 'lesson-nav' });
      if (activeLesson > 0) nav.appendChild(el('button', { className: 'btn btn--outline', onClick: () => { activeLesson--; renderLesson(); } }, [icon('chevron-left', 14), ' Précédent']));
      if (activeLesson < c.lessons.length - 1) nav.appendChild(el('button', { className: 'btn btn--primary', onClick: () => { activeLesson++; renderLesson(); } }, ['Suivant ', icon('chevron-right', 14)]));
      else nav.appendChild(el('button', { className: 'btn btn--primary', onClick: () => { activeCourse = null; renderCourseList(); toast('Cours terminé ! 🎓', 'success'); } }, ['Terminer 🎓']));
      lessonCard.appendChild(nav);

      contentDiv.appendChild(lessonCard);
    }

    wrap.appendChild(contentDiv);
    container.appendChild(wrap);
    renderCourseList();
  }

  /* =============================================================
     18. GLOSSAIRE FINANCIER
     ============================================================= */
  function glossaire(container) {
    container.innerHTML = '';
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('book', 'Glossaire financier', `${FinExtra.GLOSSARY.length} termes`));

    let filter = '';
    const searchInput = el('input', { type: 'text', className: 'input', placeholder: '🔍 Rechercher un terme...', onInput: (e) => { filter = e.target.value.toLowerCase(); renderTerms(); } });
    wrap.appendChild(el('div', { className: 'anim-slide-up stagger-1' }, [searchInput]));

    const termsDiv = el('div', { className: 'glossary-list' });

    function renderTerms() {
      termsDiv.innerHTML = '';
      const terms = FinExtra.GLOSSARY.filter(t => !filter || t.term.toLowerCase().includes(filter) || t.def.toLowerCase().includes(filter) || t.cat.toLowerCase().includes(filter));
      const grouped = {};
      terms.forEach(t => { (grouped[t.cat] = grouped[t.cat] || []).push(t); });

      Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cat, items]) => {
        termsDiv.appendChild(el('h3', { className: 'glossary-cat', textContent: cat }));
        items.forEach(t => {
          const item = el('details', { className: 'glossary-item' });
          item.innerHTML = `<summary><strong>${t.term}</strong></summary><p>${t.def}</p>`;
          termsDiv.appendChild(item);
        });
      });
    }

    wrap.appendChild(termsDiv);
    container.appendChild(wrap);
    renderTerms();
  }

  /* =============================================================
     19. CALCULATRICE INTÉRÊTS COMPOSÉS
     ============================================================= */
  function interets(container) {
    container.innerHTML = '';
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('trending-up', 'Intérêts composés', 'La 8ème merveille du monde'));

    let params = { principal: 1000, monthlyAdd: 200, rate: 7, years: 30 };
    const formCard = el('div', { className: 'card anim-slide-up stagger-1' });
    const resultsDiv = el('div', {});

    function render() {
      formCard.innerHTML = '<h3 class="section-title">🧮 Paramètres</h3>';
      [
        { label: 'Capital initial', key: 'principal', min: 0, max: 100000, step: 500, fmt: fc },
        { label: 'Ajout mensuel', key: 'monthlyAdd', min: 0, max: 5000, step: 50, fmt: fc },
        { label: 'Rendement annuel', key: 'rate', min: 0, max: 20, step: 0.5, fmt: v => v + '%' },
        { label: 'Durée', key: 'years', min: 1, max: 50, step: 1, fmt: v => v + ' ans' }
      ].forEach(f => {
        const group = el('div', { className: 'slider-wrap' });
        const label = el('label', { textContent: `${f.label}: ${f.fmt(params[f.key])}` });
        const slider = el('input', { type: 'range', className: 'slider', min: String(f.min), max: String(f.max), step: String(f.step), value: String(params[f.key]) });
        slider.addEventListener('input', () => { params[f.key] = parseFloat(slider.value); label.textContent = `${f.label}: ${f.fmt(params[f.key])}`; render(); });
        group.append(label, slider);
        formCard.appendChild(group);
      });

      resultsDiv.innerHTML = '';
      const r = FinExtra.computeCompoundInterest(params);

      const grid = el('div', { className: 'metrics-grid' });
      grid.appendChild(metric('Montant final', fc(r.finalBalance), `x${r.multiplier} votre mise`, '#10b981'));
      grid.appendChild(metric('Total investi', fc(r.totalContributions), 'Capital versé'));
      grid.appendChild(metric('Intérêts gagnés', fc(r.totalInterest), 'La magie des composés', '#0ea5a4'));
      grid.appendChild(metric('Multiplicateur', `x${r.multiplier}`, 'Effet boule de neige'));
      resultsDiv.appendChild(grid);

      const chartCard = el('div', { className: 'card' });
      const canvas = el('div', { className: 'chart-canvas', style: { height: '300px' } });
      chartCard.appendChild(canvas);
      resultsDiv.appendChild(chartCard);

      requestAnimationFrame(() => {
        initChart(canvas, {
          tooltip: { trigger: 'axis' },
          legend: { data: ['Balance', 'Contributions', 'Intérêts'], textStyle: { color: '#aaa' } },
          xAxis: { type: 'category', data: r.projection.map(p2 => 'An ' + p2.year), axisLabel: { color: '#888' } },
          yAxis: { type: 'value', axisLabel: { color: '#888', formatter: v => (v / 1000) + 'k€' } },
          series: [
            { name: 'Intérêts', type: 'bar', stack: 's', data: r.projection.map(p2 => p2.interest), itemStyle: { color: '#0ea5a4' } },
            { name: 'Contributions', type: 'bar', stack: 's', data: r.projection.map(p2 => p2.contributions), itemStyle: { color: '#334155' } },
            { name: 'Balance', type: 'line', data: r.projection.map(p2 => p2.balance), smooth: true, lineStyle: { width: 3, color: '#f59e0b' }, itemStyle: { color: '#f59e0b' } }
          ]
        });
      });
    }

    wrap.append(formCard, resultsDiv);
    container.appendChild(wrap);
    render();
  }

  /* =============================================================
     20. BUDGET MENSUEL
     ============================================================= */
  function budget(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const bal = FinEngine.computeMonthlyBalance(p);
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('wallet', 'Suivi budget mensuel', 'Prévisionnel vs Réel'));

    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentMonth = new Date().getMonth();

    // Generate budget data from profile
    const budgetData = months.map((m, i) => {
      const variation = 1 + (Math.random() - 0.5) * 0.2;
      const actualExpenses = bal.expenses * variation;
      const actualIncome = bal.income * (1 + (Math.random() - 0.5) * 0.05);
      return {
        month: m,
        forecastIncome: bal.income,
        actualIncome: i <= currentMonth ? Math.round(actualIncome) : null,
        forecastExpenses: bal.expenses,
        actualExpenses: i <= currentMonth ? Math.round(actualExpenses) : null,
        surplus: i <= currentMonth ? Math.round(actualIncome - actualExpenses) : null
      };
    });

    const grid = el('div', { className: 'metrics-grid anim-slide-up stagger-1' });
    const totalActual = budgetData.filter(d => d.surplus !== null).reduce((s, d) => s + d.surplus, 0);
    const totalForecast = bal.surplus * (currentMonth + 1);
    const delta = totalActual - totalForecast;
    grid.appendChild(metric('Épargne réelle YTD', fc(totalActual), `${currentMonth + 1} mois`, totalActual >= 0 ? '#10b981' : '#ef4444'));
    grid.appendChild(metric('Prévisionnel', fc(totalForecast), 'Budget attendu'));
    grid.appendChild(metric('Écart', (delta >= 0 ? '+' : '') + fc(delta), delta >= 0 ? 'En avance !' : 'En retard', delta >= 0 ? '#10b981' : '#ef4444'));
    grid.appendChild(metric('Mois en cours', months[currentMonth], `Surplus prévu: ${fc(bal.surplus)}`));
    wrap.appendChild(grid);

    // Chart
    const chartCard = el('div', { className: 'card anim-slide-up stagger-2' });
    chartCard.innerHTML = '<h3 class="section-title">Prévisionnel vs Réel</h3>';
    const canvas = el('div', { className: 'chart-canvas', style: { height: '300px' } });
    chartCard.appendChild(canvas);
    wrap.appendChild(chartCard);
    container.appendChild(wrap);

    requestAnimationFrame(() => {
      initChart(canvas, {
        tooltip: { trigger: 'axis' },
        legend: { data: ['Dépenses réelles', 'Dépenses prévues', 'Surplus'], textStyle: { color: '#aaa' } },
        xAxis: { type: 'category', data: months, axisLabel: { color: '#888' } },
        yAxis: { type: 'value', axisLabel: { color: '#888', formatter: v => (v / 1000) + 'k€' } },
        series: [
          { name: 'Dépenses prévues', type: 'bar', data: budgetData.map(d => d.forecastExpenses), itemStyle: { color: 'rgba(239,68,68,0.3)' } },
          { name: 'Dépenses réelles', type: 'bar', data: budgetData.map(d => d.actualExpenses), itemStyle: { color: '#ef4444' } },
          { name: 'Surplus', type: 'line', data: budgetData.map(d => d.surplus), smooth: true, itemStyle: { color: '#10b981' }, lineStyle: { width: 3 } }
        ]
      });
    });
  }

  /* =============================================================
     21. KANBAN D'OBJECTIFS
     ============================================================= */
  function kanban(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const goals = p.goals || [];
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('target', 'Tableau d\'objectifs', 'Gérez vos objectifs financiers'));

    const columns = [
      { id: 'todo', title: '📋 À faire', filter: g => (FinEngine.computeGoalProgress(p).find(gp => gp.name === g.name)?.progress || 0) < 25 },
      { id: 'progress', title: '🔄 En cours', filter: g => { const pr = FinEngine.computeGoalProgress(p).find(gp => gp.name === g.name)?.progress || 0; return pr >= 25 && pr < 75; } },
      { id: 'almost', title: '🎯 Presque', filter: g => { const pr = FinEngine.computeGoalProgress(p).find(gp => gp.name === g.name)?.progress || 0; return pr >= 75 && pr < 100; } },
      { id: 'done', title: '✅ Atteint', filter: g => (FinEngine.computeGoalProgress(p).find(gp => gp.name === g.name)?.progress || 0) >= 100 }
    ];

    const board = el('div', { className: 'kanban-board anim-slide-up stagger-1' });
    columns.forEach(col => {
      const column = el('div', { className: 'kanban-column' });
      column.innerHTML = `<h3 class="kanban-column__title">${col.title}</h3>`;
      const filtered = goals.filter(col.filter);
      if (filtered.length === 0) {
        column.appendChild(el('div', { className: 'kanban-empty', textContent: 'Aucun objectif' }));
      }
      filtered.forEach(g => {
        const progress = FinEngine.computeGoalProgress(p).find(gp => gp.name === g.name);
        const card = el('div', { className: 'kanban-card' });
        card.innerHTML = `<h4>${g.name}</h4><div class="kanban-card__amount">${fc(g.target || 0)}</div>`;
        card.appendChild(progressBar(progress?.progress || 0));
        column.appendChild(card);
      });
      board.appendChild(column);
    });

    wrap.appendChild(board);

    if (goals.length === 0) {
      wrap.appendChild(el('div', { className: 'empty-state anim-slide-up stagger-2' }, [
        el('div', { textContent: '🎯', style: { fontSize: '48px' } }),
        el('h3', { textContent: 'Aucun objectif défini' }),
        el('p', { className: 'text-muted', textContent: 'Définissez vos objectifs dans le questionnaire pour les voir ici' })
      ]));
    }

    container.appendChild(wrap);
  }

  /* =============================================================
     22. ALERTES & RAPPELS
     ============================================================= */
  function alertes(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const a = Store.getState().analysis;
    const bal = a?.balance || FinEngine.computeMonthlyBalance(p);
    const ef = a?.emergencyFund || FinEngine.computeEmergencyFund(p);
    const debt = a?.debtAnalysis || FinEngine.computeDebtAnalysis(p);

    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('alert', 'Alertes & Rappels', 'Situations nécessitant votre attention'));

    const alerts = [];

    // Generate alerts based on profile
    if (bal.surplus < 0) alerts.push({ level: 'critical', icon: '🚨', title: 'Budget déficitaire', desc: `Vos dépenses dépassent vos revenus de ${fc(Math.abs(bal.surplus))}/mois` });
    if (ef.monthsCovered < 3) alerts.push({ level: 'warning', icon: '⚠️', title: 'Fonds d\'urgence insuffisant', desc: `Seulement ${ef.monthsCovered?.toFixed(1)} mois de couverture (minimum recommandé: 3 mois)` });
    if (debt.debtToIncomeRatio > 33) alerts.push({ level: 'warning', icon: '⚠️', title: 'Endettement élevé', desc: `Ratio dette/revenu à ${fp(debt.debtToIncomeRatio)} (seuil: 33%)` });
    if (bal.savingsRate < 10) alerts.push({ level: 'info', icon: 'ℹ️', title: 'Taux d\'épargne faible', desc: `${fp(bal.savingsRate)} — Visez minimum 10-20%` });
    if ((p.investments || []).length === 0) alerts.push({ level: 'info', icon: '💡', title: 'Pas d\'investissement', desc: 'Commencez à investir pour faire travailler votre argent' });
    if (new Set((p.investments || []).map(i => i.type)).size < 3) alerts.push({ level: 'info', icon: '🌈', title: 'Faible diversification', desc: 'Diversifiez sur au moins 3 classes d\'actifs' });
    if ((p.goals || []).length === 0) alerts.push({ level: 'info', icon: '🎯', title: 'Aucun objectif défini', desc: 'Définir des objectifs aide à rester motivé et discipliné' });

    // Positive alerts
    if (bal.savingsRate > 25) alerts.push({ level: 'success', icon: '🌟', title: 'Excellent taux d\'épargne !', desc: `${fp(bal.savingsRate)} — Vous êtes un épargnant discipliné` });
    if (ef.monthsCovered >= 6) alerts.push({ level: 'success', icon: '🛡️', title: 'Fonds d\'urgence solide', desc: `${ef.monthsCovered?.toFixed(1)} mois de couverture — Excellent !` });

    const alertsList = el('div', { className: 'alerts-list anim-slide-up stagger-1' });
    if (alerts.length === 0) {
      alertsList.appendChild(el('div', { className: 'empty-state' }, [
        el('div', { textContent: '✅', style: { fontSize: '48px' } }),
        el('h3', { textContent: 'Aucune alerte' }),
        el('p', { className: 'text-muted', textContent: 'Tout semble en ordre !' })
      ]));
    }
    alerts.forEach((a2, i) => {
      const item = el('div', { className: `alert-item alert-item--${a2.level} anim-slide-up stagger-${Math.min(i + 1, 8)}` });
      item.innerHTML = `<span class="alert-item__icon">${a2.icon}</span><div class="alert-item__content"><h4>${a2.title}</h4><p>${a2.desc}</p></div>`;
      alertsList.appendChild(item);
    });
    wrap.appendChild(alertsList);
    container.appendChild(wrap);
  }

  /* =============================================================
     23. JOURNAL FINANCIER
     ============================================================= */
  function journal(container) {
    container.innerHTML = '';
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('edit', 'Journal financier', 'Documentez vos décisions'));

    // Load entries from localStorage
    const LS_KEY = 'finvest_journal';
    let entries = [];
    try { entries = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { entries = []; }

    const formCard = el('div', { className: 'card anim-slide-up stagger-1' });
    const listDiv = el('div', { className: 'journal-list' });

    function renderForm() {
      formCard.innerHTML = '<h3 class="section-title">✍️ Nouvelle entrée</h3>';
      const textarea = el('textarea', { className: 'input journal-textarea', placeholder: 'Décrivez votre décision financière, vos réflexions, vos objectifs du jour...', rows: '4' });
      const tagInput = el('input', { type: 'text', className: 'input', placeholder: 'Tags (ex: investissement, budget, réflexion)' });
      const addBtn = el('button', { className: 'btn btn--primary', onClick: () => {
        const text = textarea.value.trim();
        if (!text) { toast('Écrivez quelque chose d\'abord', 'error'); return; }
        entries.unshift({ id: Date.now(), date: new Date().toISOString(), text, tags: tagInput.value.split(',').map(t => t.trim()).filter(Boolean) });
        localStorage.setItem(LS_KEY, JSON.stringify(entries));
        textarea.value = ''; tagInput.value = '';
        renderList();
        toast('Entrée ajoutée !', 'success');
      } }, [icon('plus', 14), ' Ajouter']);
      formCard.append(textarea, tagInput, addBtn);
    }

    function renderList() {
      listDiv.innerHTML = '';
      if (entries.length === 0) {
        listDiv.appendChild(el('div', { className: 'empty-state' }, [
          el('div', { textContent: '📝', style: { fontSize: '48px' } }),
          el('h3', { textContent: 'Aucune entrée' }),
          el('p', { className: 'text-muted', textContent: 'Commencez à documenter vos décisions financières' })
        ]));
        return;
      }
      entries.forEach((entry, i) => {
        const item = el('div', { className: `journal-entry anim-slide-up stagger-${Math.min(i + 1, 8)}` });
        const date = new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        item.innerHTML = `
          <div class="journal-entry__header"><span class="journal-entry__date">${date}</span><button class="btn btn--ghost btn--sm journal-delete" data-id="${entry.id}">✕</button></div>
          <p class="journal-entry__text">${entry.text}</p>
          ${entry.tags.length ? `<div class="journal-entry__tags">${entry.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
        `;
        item.querySelector('.journal-delete').onclick = () => {
          entries = entries.filter(e => e.id !== entry.id);
          localStorage.setItem(LS_KEY, JSON.stringify(entries));
          renderList();
          toast('Entrée supprimée', 'success');
        };
        listDiv.appendChild(item);
      });
    }

    renderForm();
    wrap.append(formCard, listDiv);
    container.appendChild(wrap);
    renderList();
  }

  /* =============================================================
     24. SIMULATION DE VIE ALTERNATIVE
     ============================================================= */
  function simulationVie(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('clock', 'Et si j\'avais commencé plus tôt ?', 'Simulation de vie alternative'));

    let startAge = 20;
    const formCard = el('div', { className: 'card anim-slide-up stagger-1' });
    const resultsDiv = el('div', {});

    function render() {
      formCard.innerHTML = '';
      const group = el('div', { className: 'slider-wrap' });
      const label = el('label', { textContent: `Âge de début d'investissement: ${startAge} ans` });
      const slider = el('input', { type: 'range', className: 'slider', min: '18', max: String(Math.max(18, (p.age || 30) - 1)), step: '1', value: String(startAge) });
      slider.addEventListener('input', () => { startAge = parseInt(slider.value); render(); });
      group.append(label, slider);
      formCard.appendChild(group);

      const data = FinExtra.simulateAlternativeLife(p, startAge);

      resultsDiv.innerHTML = '';
      const msgCard = el('div', { className: `card ${data.diff65 > 0 ? 'card--highlight' : ''}` });
      msgCard.innerHTML = `<p class="altlife-message">${data.message}</p><p class="text-muted">${data.yearsHeadStart} ans d'avance</p>`;
      resultsDiv.appendChild(msgCard);

      const grid = el('div', { className: 'metrics-grid' });
      grid.appendChild(metric('Différence à 65 ans', data.diff65 > 0 ? '+' + fc(data.diff65) : fc(data.diff65), `${data.yearsHeadStart} ans d'avance`, data.diff65 > 0 ? '#10b981' : '#ef4444'));
      resultsDiv.appendChild(grid);

      const chartCard = el('div', { className: 'card' });
      const canvas = el('div', { className: 'chart-canvas', style: { height: '300px' } });
      chartCard.appendChild(canvas);
      resultsDiv.appendChild(chartCard);

      requestAnimationFrame(() => {
        const allAges = new Set([...data.currentTimeline.map(t => t.age), ...data.altTimeline.map(t => t.age)]);
        const ages = [...allAges].sort((a2, b) => a2 - b);
        initChart(canvas, {
          tooltip: { trigger: 'axis' },
          legend: { data: ['Réalité', `Si j'avais commencé à ${startAge} ans`], textStyle: { color: '#aaa' } },
          xAxis: { type: 'category', data: ages.map(a2 => a2 + ' ans'), axisLabel: { color: '#888' } },
          yAxis: { type: 'value', axisLabel: { color: '#888', formatter: v => (v / 1000) + 'k€' } },
          series: [
            { name: 'Réalité', type: 'line', data: ages.map(a2 => data.currentTimeline.find(t => t.age === a2)?.wealth || null), smooth: true, itemStyle: { color: '#0ea5a4' }, lineStyle: { width: 3 } },
            { name: `Si j'avais commencé à ${startAge} ans`, type: 'line', data: ages.map(a2 => data.altTimeline.find(t => t.age === a2)?.wealth || null), smooth: true, itemStyle: { color: '#f59e0b' }, lineStyle: { width: 3, type: 'dashed' }, areaStyle: { opacity: 0.05 } }
          ]
        });
      });
    }

    wrap.append(formCard, resultsDiv);
    container.appendChild(wrap);
    render();
  }

  /* =============================================================
     25. HEATMAP PATRIMOINE
     ============================================================= */
  function heatmap(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const data = FinExtra.generateHeatmapData(p);
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('activity', 'Heatmap patrimoine', 'Variation quotidienne sur 1 an'));

    const grid = el('div', { className: 'metrics-grid anim-slide-up stagger-1' });
    grid.appendChild(metric('Jours positifs', data.positive + '', `${Math.round(data.positive / 365 * 100)}% du temps`, '#10b981'));
    grid.appendChild(metric('Jours négatifs', data.negative + '', `${Math.round(data.negative / 365 * 100)}% du temps`, '#ef4444'));
    grid.appendChild(metric('Meilleur jour', fc(data.bestDay.value), data.bestDay.date));
    grid.appendChild(metric('Série record', data.streak + ' jours', 'Jours positifs consécutifs', '#f59e0b'));
    wrap.appendChild(grid);

    // Heatmap grid
    const heatmapCard = el('div', { className: 'card anim-slide-up stagger-2' });
    heatmapCard.innerHTML = '<h3 class="section-title">📊 Calendrier des variations</h3>';
    const heatGrid = el('div', { className: 'heatmap-grid' });
    const dayNames = ['', 'Lun', '', 'Mer', '', 'Ven', ''];
    const dayLabels = el('div', { className: 'heatmap-days' });
    dayNames.forEach(d => dayLabels.appendChild(el('div', { className: 'heatmap-day-label', textContent: d })));
    heatGrid.appendChild(dayLabels);

    const weeksContainer = el('div', { className: 'heatmap-weeks' });
    const weeks = {};
    data.data.forEach(d => { (weeks[d.week] = weeks[d.week] || []).push(d); });

    Object.values(weeks).forEach(week => {
      const col = el('div', { className: 'heatmap-week' });
      for (let d = 0; d < 7; d++) {
        const day = week.find(w => w.day === d);
        const cell = el('div', {
          className: `heatmap-cell heatmap-cell--${day ? day.level : 0}`,
          title: day ? `${day.date}: ${day.value >= 0 ? '+' : ''}${fc(day.value)}` : ''
        });
        col.appendChild(cell);
      }
      weeksContainer.appendChild(col);
    });
    heatGrid.appendChild(weeksContainer);

    // Legend
    const legend = el('div', { className: 'heatmap-legend' });
    legend.innerHTML = '<span>Moins</span><div class="heatmap-cell heatmap-cell--0"></div><div class="heatmap-cell heatmap-cell--1"></div><div class="heatmap-cell heatmap-cell--2"></div><div class="heatmap-cell heatmap-cell--3"></div><div class="heatmap-cell heatmap-cell--4"></div><span>Plus</span>';
    heatGrid.appendChild(legend);

    heatmapCard.appendChild(heatGrid);
    wrap.appendChild(heatmapCard);
    container.appendChild(wrap);
  }

  /* =============================================================
     26. COPILOT FINANCIER (Enhanced AI)
     ============================================================= */
  function copilot(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const a = Store.getState().analysis;
    const bal = a?.balance || FinEngine.computeMonthlyBalance(p);
    const fire = FinExtra.computeFIRE(p);
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('sparkles', 'Copilot financier', 'Missions personnalisées quotidiennes'));

    // Generate daily missions based on profile
    const missions = [];
    const today = new Date().getDay();

    if (bal.surplus > 0 && today % 2 === 0) missions.push({ icon: '💰', title: 'Investir le surplus du jour', desc: `Transférez ${fc(bal.surplus / 30)} vers votre PEA ou votre ETF préféré`, priority: 'high' });
    if (today === 1) missions.push({ icon: '📊', title: 'Revue hebdomadaire', desc: 'Vérifiez vos dépenses de la semaine passée et comparez au budget', priority: 'medium' });
    if (today === 5) missions.push({ icon: '📈', title: 'Vérifier les marchés', desc: 'Consultez la performance de votre portefeuille cette semaine', priority: 'low' });
    missions.push({ icon: '🎯', title: 'Objectif du jour', desc: `Épargnez au moins ${fc(Math.max(5, bal.surplus / 30))} aujourd'hui`, priority: 'medium' });
    if (fire.progress < 25) missions.push({ icon: '🔥', title: 'Booster le FIRE', desc: `Trouvez 1 dépense à réduire pour accélérer vers ${fire.fireAge} ans`, priority: 'high' });
    missions.push({ icon: '📝', title: 'Journal financier', desc: 'Écrivez une note sur vos réflexions financières du jour', priority: 'low' });
    missions.push({ icon: '📚', title: 'Apprendre', desc: 'Lisez un article ou un mini-cours sur la finance personnelle', priority: 'low' });

    const missionsList = el('div', { className: 'missions-list anim-slide-up stagger-1' });
    missions.forEach((m, i) => {
      const card = el('div', { className: `mission-card mission-card--${m.priority} anim-slide-up stagger-${Math.min(i + 1, 8)}` });
      card.innerHTML = `
        <span class="mission-card__icon">${m.icon}</span>
        <div class="mission-card__content"><h4>${m.title}</h4><p>${m.desc}</p></div>
        <span class="mission-card__priority">${{ high: '🔴', medium: '🟡', low: '🟢' }[m.priority]}</span>
      `;
      missionsList.appendChild(card);
    });
    wrap.appendChild(missionsList);

    // Quick AI prompt
    const quickCard = el('div', { className: 'card anim-slide-up stagger-3' });
    quickCard.innerHTML = '<h3 class="section-title">🤖 Question rapide à l\'IA</h3>';
    const suggestions = [
      `Comment investir ${fc(bal.surplus)}/mois efficacement ?`,
      `Quelle est la meilleure stratégie pour atteindre le FIRE à ${fire.fireAge} ans ?`,
      `Comment optimiser ma fiscalité avec un TMI de ${a?.taxOptimization?.estimatedTMI || 30}% ?`,
      'Comment construire un portefeuille anti-inflation ?',
      'Quels sont les meilleurs ETF pour un PEA en 2026 ?'
    ];
    const sugGrid = el('div', { className: 'suggestion-grid' });
    suggestions.forEach(s => {
      sugGrid.appendChild(el('button', { className: 'suggestion-chip', onClick: () => {
        try { navigator.clipboard.writeText(s); toast('Prompt copié !', 'success'); }
        catch { toast('Erreur de copie', 'error'); }
      } }, [s]));
    });
    quickCard.appendChild(sugGrid);
    wrap.appendChild(quickCard);
    container.appendChild(wrap);
  }

  /* =============================================================
     27. RETRAITE IMMERSIVE
     ============================================================= */
  function retraiteImmersive(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const settings = Store.getState().settings;
    const data = FinExtra.computeImmersiveRetirement(p, settings);
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('clock', 'Projection retraite immersive', `${data.yearsOfRetirement} ans de retraite modélisés`));

    const grid = el('div', { className: 'metrics-grid anim-slide-up stagger-1' });
    grid.appendChild(metric('Patrimoine à la retraite', fc(data.portfolioAtRetirement), `À ${data.retirementAge} ans`));
    grid.appendChild(metric('Pension mensuelle', fc(data.monthlyPension), 'Estimation'));
    grid.appendChild(metric('Sécurité', data.isSecure ? '✅ Secure' : '⚠️ Risque', data.isSecure ? `Capital > 0 jusqu'à ${data.lifeExpectancy} ans` : `Épuisement du capital à ${data.depletionAge} ans`, data.isSecure ? '#10b981' : '#ef4444'));
    grid.appendChild(metric('Durée retraite', data.yearsOfRetirement + ' ans', `De ${data.retirementAge} à ${data.lifeExpectancy} ans`));
    wrap.appendChild(grid);

    // Year by year slider
    const sliderCard = el('div', { className: 'card anim-slide-up stagger-2' });
    sliderCard.innerHTML = '<h3 class="section-title">📅 Explorez année par année</h3>';
    let selectedAge = data.retirementAge;
    const ageLabel = el('div', { className: 'immersive-age-label' });
    const ageDetail = el('div', { className: 'immersive-detail' });
    const slider = el('input', { type: 'range', className: 'slider', min: String(p.age || 30), max: String(data.lifeExpectancy), value: String(selectedAge) });

    function updateSlider() {
      const yearData = data.years.find(y => y.age === selectedAge);
      if (!yearData) return;
      ageLabel.innerHTML = `<span class="immersive-age">${selectedAge} ans</span><span class="immersive-phase">${yearData.phase === 'accumulation' ? '📈 Accumulation' : '🏖️ Retraite'}</span>`;
      const lifestyleEmoji = { confortable: '🌟', correct: '👍', serré: '⚠️', déficit: '🚨' }[yearData.lifestyle];
      ageDetail.innerHTML = `
        <div class="immersive-row"><span>Portefeuille</span><strong>${fc(yearData.portfolio)}</strong></div>
        <div class="immersive-row"><span>Disponible/mois</span><strong>${fc(yearData.monthlyAvailable)}</strong></div>
        <div class="immersive-row"><span>Niveau de vie</span><strong>${lifestyleEmoji} ${yearData.lifestyle}</strong></div>
      `;
    }

    slider.addEventListener('input', () => { selectedAge = parseInt(slider.value); updateSlider(); });
    sliderCard.append(ageLabel, slider, ageDetail);
    updateSlider();
    wrap.appendChild(sliderCard);

    // Chart
    const chartCard = el('div', { className: 'card anim-slide-up stagger-3' });
    chartCard.innerHTML = '<h3 class="section-title">Évolution du patrimoine</h3>';
    const canvas = el('div', { className: 'chart-canvas', style: { height: '300px' } });
    chartCard.appendChild(canvas);
    wrap.appendChild(chartCard);
    container.appendChild(wrap);

    requestAnimationFrame(() => {
      const retIdx = data.years.findIndex(y => y.age === data.retirementAge);
      initChart(canvas, {
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: data.years.map(y => y.age + ' ans'), axisLabel: { color: '#888' } },
        yAxis: { type: 'value', axisLabel: { color: '#888', formatter: v => (v / 1000) + 'k€' } },
        visualMap: { show: false, pieces: [{ gte: 0, lt: retIdx, color: '#0ea5a4' }, { gte: retIdx, color: '#8b5cf6' }] },
        series: [{
          type: 'line', data: data.years.map(y => y.portfolio), smooth: true,
          areaStyle: { opacity: 0.1 }, lineStyle: { width: 3 },
          markLine: { data: [{ name: 'Retraite', xAxis: retIdx }], lineStyle: { color: '#f59e0b', type: 'dashed' } }
        }]
      });
    });
  }

  /* =============================================================
     28. RADAR / SPIDER
     ============================================================= */
  function radar(container) {
    container.innerHTML = '';
    const p = Store.getState().profile;
    const data = FinExtra.computeRadarData(p);
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('shield', 'Radar financier', 'Scan multi-axes de votre profil'));

    // Chart
    const chartCard = el('div', { className: 'card anim-slide-up stagger-1', style: { textAlign: 'center' } });
    const canvas = el('div', { className: 'chart-canvas', style: { height: '400px' } });
    chartCard.appendChild(canvas);
    wrap.appendChild(chartCard);

    // Detail cards
    const detailGrid = el('div', { className: 'radar-detail-grid anim-slide-up stagger-2' });
    data.axes.forEach(axis => {
      const card = el('div', { className: 'radar-detail-card' });
      const color = axis.value >= 75 ? '#10b981' : axis.value >= 50 ? '#f59e0b' : '#ef4444';
      card.innerHTML = `<div class="radar-detail-card__label">${axis.label}</div><div class="radar-detail-card__value" style="color:${color}">${Math.round(axis.value)}/100</div><div class="radar-detail-card__detail">${axis.detail}</div>`;
      card.appendChild(progressBar(axis.value, color));
      detailGrid.appendChild(card);
    });
    wrap.appendChild(detailGrid);
    container.appendChild(wrap);

    requestAnimationFrame(() => {
      initChart(canvas, {
        radar: {
          indicator: data.axes.map(a2 => ({ name: a2.label, max: 100 })),
          shape: 'polygon',
          splitNumber: 4,
          axisName: { color: '#ccc', fontSize: 12 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          splitArea: { areaStyle: { color: ['rgba(14,165,164,0.02)', 'rgba(14,165,164,0.04)'] } }
        },
        series: [{
          type: 'radar',
          data: [{ value: data.axes.map(a2 => Math.round(a2.value)), name: 'Mon profil', areaStyle: { opacity: 0.2, color: '#0ea5a4' }, lineStyle: { width: 2, color: '#0ea5a4' }, itemStyle: { color: '#0ea5a4' } }]
        }]
      });
    });
  }

  /* =============================================================
     29. THÈMES
     ============================================================= */
  function themes(container) {
    container.innerHTML = '';
    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(sectionHeader('palette', 'Thèmes', 'Personnalisez l\'apparence'));

    const THEMES = [
      { id: 'dark', name: 'Sombre (défaut)', icon: '🌙', colors: { bg: '#0b0f19', primary: '#0ea5a4', text: '#e4e4e7', surface: 'rgba(255,255,255,0.04)' } },
      { id: 'light', name: 'Clair', icon: '☀️', colors: { bg: '#f8fafc', primary: '#0d9488', text: '#1e293b', surface: 'rgba(0,0,0,0.03)' } },
      { id: 'cyberpunk', name: 'Cyberpunk', icon: '🌆', colors: { bg: '#0a0a1a', primary: '#ff00ff', text: '#00ffff', surface: 'rgba(255,0,255,0.04)' } },
      { id: 'forest', name: 'Forêt', icon: '🌲', colors: { bg: '#0d1a0d', primary: '#22c55e', text: '#d4edda', surface: 'rgba(34,197,94,0.04)' } },
      { id: 'ocean', name: 'Océan', icon: '🌊', colors: { bg: '#0c1929', primary: '#3b82f6', text: '#dbeafe', surface: 'rgba(59,130,246,0.04)' } },
      { id: 'sunset', name: 'Coucher de soleil', icon: '🌅', colors: { bg: '#1a0a0a', primary: '#f59e0b', text: '#fef3c7', surface: 'rgba(245,158,11,0.04)' } }
    ];

    const currentTheme = localStorage.getItem('finvest_theme') || 'dark';
    const grid = el('div', { className: 'theme-grid anim-slide-up stagger-1' });

    THEMES.forEach(t => {
      const card = el('div', {
        className: `theme-card ${currentTheme === t.id ? 'theme-card--active' : ''}`,
        onClick: () => {
          applyTheme(t);
          localStorage.setItem('finvest_theme', t.id);
          grid.querySelectorAll('.theme-card').forEach(c => c.classList.remove('theme-card--active'));
          card.classList.add('theme-card--active');
          toast(`Thème "${t.name}" appliqué`, 'success');
        }
      });
      card.innerHTML = `
        <div class="theme-card__preview" style="background:${t.colors.bg};border:1px solid ${t.colors.primary}">
          <div style="width:20px;height:20px;background:${t.colors.primary};border-radius:50%"></div>
          <div style="color:${t.colors.text};font-size:11px">Aa</div>
        </div>
        <div class="theme-card__icon">${t.icon}</div>
        <div class="theme-card__name">${t.name}</div>
      `;
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    container.appendChild(wrap);

    function applyTheme(t) {
      const root = document.documentElement;
      root.style.setProperty('--ez-bg', t.colors.bg);
      root.style.setProperty('--ez-primary', t.colors.primary);
      root.style.setProperty('--primary', t.colors.primary);
      root.style.setProperty('--text', t.colors.text);
      root.style.setProperty('--glass', t.colors.surface);
      root.style.setProperty('--primary-soft', t.colors.primary + '18');
    }

    // Apply saved theme on load
    const saved = THEMES.find(t => t.id === currentTheme);
    if (saved && saved.id !== 'dark') applyTheme(saved);
  }

  /* =============================================================
     MERGE INTO window.Views
     ============================================================= */
  Object.assign(window.Views, {
    patrimoine, performance, fire, comparateur, credit,
    dividendes, whatif, esg, stresstest, fiscalite,
    badges, defis, scorecard, timeline, benchmark,
    partage, cours, glossaire, interets, budget,
    kanban, alertes, journal, simulationVie, heatmap,
    copilot, retraiteImmersive, radar, themes
  });
})();
