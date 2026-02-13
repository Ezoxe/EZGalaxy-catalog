/* ================================================================
   FinVest — engine-market.js  (Market, Immobilier, Transactions, XP)
   New calculation engines for enhanced features.
   Exposes: window.FinMarket
   ================================================================ */
(() => {
  'use strict';

  const round2 = v => Math.round(v * 100) / 100;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const sum = arr => arr.reduce((a, b) => a + b, 0);

  /* ============================================================
     1. MARKET DATA — Simulated real-time indices & watchlist
     ============================================================ */

  /* Seed-based pseudo-random for deterministic "live" data */
  function seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  const INDICES = [
    { symbol: 'CAC40', name: 'CAC 40', country: '🇫🇷', basePrice: 7850, volatility: 0.012, sector: 'France' },
    { symbol: 'SP500', name: 'S&P 500', country: '🇺🇸', basePrice: 5920, volatility: 0.010, sector: 'USA' },
    { symbol: 'NASDAQ', name: 'NASDAQ 100', country: '🇺🇸', basePrice: 20150, volatility: 0.015, sector: 'Tech US' },
    { symbol: 'DAX', name: 'DAX 40', country: '🇩🇪', basePrice: 19480, volatility: 0.011, sector: 'Allemagne' },
    { symbol: 'FTSE', name: 'FTSE 100', country: '🇬🇧', basePrice: 8350, volatility: 0.009, sector: 'UK' },
    { symbol: 'NIKKEI', name: 'Nikkei 225', country: '🇯🇵', basePrice: 38500, volatility: 0.013, sector: 'Japon' },
    { symbol: 'STOXX600', name: 'Stoxx 600', country: '🇪🇺', basePrice: 530, volatility: 0.010, sector: 'Europe' },
    { symbol: 'MSCIW', name: 'MSCI World', country: '🌍', basePrice: 3480, volatility: 0.009, sector: 'Monde' }
  ];

  const POPULAR_STOCKS = [
    { symbol: 'LVMH', name: 'LVMH', country: '🇫🇷', basePrice: 720, volatility: 0.018, sector: 'Luxe', dividend: 2.1 },
    { symbol: 'TOTALENERGIES', name: 'TotalEnergies', country: '🇫🇷', basePrice: 58, volatility: 0.014, sector: 'Énergie', dividend: 5.8 },
    { symbol: 'AIRBUS', name: 'Airbus', country: '🇫🇷', basePrice: 155, volatility: 0.016, sector: 'Aéronautique', dividend: 1.4 },
    { symbol: 'SANOFI', name: 'Sanofi', country: '🇫🇷', basePrice: 95, volatility: 0.010, sector: 'Santé', dividend: 3.5 },
    { symbol: 'AAPL', name: 'Apple', country: '🇺🇸', basePrice: 230, volatility: 0.017, sector: 'Tech', dividend: 0.5 },
    { symbol: 'MSFT', name: 'Microsoft', country: '🇺🇸', basePrice: 415, volatility: 0.015, sector: 'Tech', dividend: 0.8 },
    { symbol: 'AMZN', name: 'Amazon', country: '🇺🇸', basePrice: 210, volatility: 0.020, sector: 'Tech', dividend: 0 },
    { symbol: 'NVDA', name: 'NVIDIA', country: '🇺🇸', basePrice: 880, volatility: 0.030, sector: 'Semi-conducteurs', dividend: 0.03 },
    { symbol: 'BTC', name: 'Bitcoin', country: '🌍', basePrice: 97500, volatility: 0.040, sector: 'Crypto', dividend: 0 },
    { symbol: 'ETH', name: 'Ethereum', country: '🌍', basePrice: 3200, volatility: 0.045, sector: 'Crypto', dividend: 0 },
    { symbol: 'CW8', name: 'Amundi MSCI World (ETF)', country: '🌍', basePrice: 520, volatility: 0.009, sector: 'ETF World', dividend: 0 },
    { symbol: 'EWLD', name: 'Lyxor MSCI World (ETF)', country: '🌍', basePrice: 28, volatility: 0.009, sector: 'ETF World', dividend: 0 },
    { symbol: 'PE500', name: 'Amundi S&P 500 (ETF PEA)', country: '🇺🇸', basePrice: 42, volatility: 0.010, sector: 'ETF US', dividend: 0 },
    { symbol: 'LQQ', name: 'Lyxor NASDAQ x2 (ETF)', country: '🇺🇸', basePrice: 890, volatility: 0.028, sector: 'ETF Leveraged', dividend: 0 },
    { symbol: 'GOLD', name: 'Or (once)', country: '🌍', basePrice: 2050, volatility: 0.008, sector: 'Matières premières', dividend: 0 }
  ];

  /**
   * Generate "live" price for a stock/index based on current time.
   * If FinAPI has real data cached for this symbol, use it instead.
   * Uses time-seeded deterministic random as fallback.
   */
  function getLivePrice(asset) {
    // ── Try real data from FinAPI cache ─────────────────────────
    if (window.FinAPI && window.FinAPI.realPriceCache) {
      const real = window.FinAPI.realPriceCache.get(asset.symbol);
      if (real && real.price && (Date.now() - real.ts) < 120_000) {
        const price = round2(real.price);
        const change = real.change != null ? round2(real.change) : round2(price - asset.basePrice);
        const changePct = real.changePct != null ? round2(real.changePct) : round2((change / asset.basePrice) * 100);
        return {
          symbol: asset.symbol,
          name: asset.name,
          country: asset.country,
          sector: asset.sector,
          price,
          change,
          changePct,
          high: real.high || round2(price * 1.005),
          low: real.low || round2(price * 0.995),
          volume: real.volume || Math.round(1000000 + Math.random() * 50000000),
          dividend: asset.dividend || 0,
          lastUpdate: new Date(real.ts).toISOString(),
          sparkline: generateSparkline(asset, 24),
          source: real.source || 'api',
          live: true
        };
      }
    }

    // ── Fallback: simulated price ───────────────────────────────
    const now = new Date();
    const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    const rng = seededRandom(seed + asset.symbol.charCodeAt(0) * 1000 + now.getHours() * 60 + now.getMinutes());

    // Intraday variation from base
    const dayVariation = (rng() - 0.48) * asset.volatility * 2;
    const hourNoise = (rng() - 0.5) * asset.volatility * 0.3;
    const price = round2(asset.basePrice * (1 + dayVariation + hourNoise));
    const change = round2(price - asset.basePrice);
    const changePct = round2((change / asset.basePrice) * 100);

    return {
      symbol: asset.symbol,
      name: asset.name,
      country: asset.country,
      sector: asset.sector,
      price,
      change,
      changePct,
      high: round2(price * (1 + Math.abs(dayVariation) * 0.3)),
      low: round2(price * (1 - Math.abs(dayVariation) * 0.3)),
      volume: Math.round(1000000 + rng() * 50000000),
      dividend: asset.dividend || 0,
      lastUpdate: now.toISOString(),
      sparkline: generateSparkline(asset, 24),
      source: 'simulation',
      live: false
    };
  }

  /** Generate N hours of sparkline data */
  function generateSparkline(asset, hours) {
    const now = new Date();
    const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    const rng = seededRandom(seed + asset.symbol.charCodeAt(0) * 100);
    const points = [];
    let price = asset.basePrice;
    for (let h = hours; h >= 0; h--) {
      const variation = (rng() - 0.48) * asset.volatility * 0.5;
      price = price * (1 + variation);
      points.push(round2(price));
    }
    return points;
  }

  /** Generate historical daily data (N days back) */
  function generateHistoricalData(asset, days) {
    const data = [];
    const now = new Date();
    let price = asset.basePrice * 0.85; // Start 15% lower N days ago
    for (let d = days; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
      const rng = seededRandom(seed + asset.symbol.charCodeAt(0) * 100);
      const variation = (rng() - 0.47) * asset.volatility;
      price = price * (1 + variation);
      const open = round2(price * (1 - (rng() - 0.5) * 0.005));
      const close = round2(price);
      const high = round2(Math.max(open, close) * (1 + rng() * 0.005));
      const low = round2(Math.min(open, close) * (1 - rng() * 0.005));
      data.push({
        date: date.toISOString().slice(0, 10),
        open, high, low, close,
        volume: Math.round(500000 + rng() * 30000000)
      });
    }
    return data;
  }

  function getAllIndices() {
    return INDICES.map(getLivePrice);
  }

  function getAllStocks() {
    return POPULAR_STOCKS.map(getLivePrice);
  }

  function searchAssets(query) {
    const q = query.toLowerCase();
    const all = [...INDICES, ...POPULAR_STOCKS];
    return all.filter(a =>
      a.symbol.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.sector || '').toLowerCase().includes(q)
    ).map(getLivePrice);
  }

  function getAssetBySymbol(symbol) {
    const all = [...INDICES, ...POPULAR_STOCKS];
    const found = all.find(a => a.symbol === symbol);
    return found ? getLivePrice(found) : null;
  }

  function getAssetDef(symbol) {
    return [...INDICES, ...POPULAR_STOCKS].find(a => a.symbol === symbol);
  }

  /* ============================================================
     2. IMMOBILIER — Real estate investment simulator
     ============================================================ */
  function simulateImmobilier(params) {
    const {
      purchasePrice = 250000,
      downPayment = 50000,
      loanRate = 3.5,
      loanDuration = 20,
      monthlyRent = 900,
      propertyTax = 1200,           // taxe foncière annuelle
      managementFees = 7,           // % du loyer
      maintenancePct = 1,           // % du prix d'achat / an
      vacancyRate = 5,              // % du temps vacant
      notaryFees = 8,               // % du prix d'achat
      insuranceRate = 0.36,         // % du prêt
      appreciationRate = 2,         // % annuel
      holdingYears = 20,
      taxBracket = 30               // TMI
    } = params;

    const loanAmount = purchasePrice - downPayment;
    const notary = round2(purchasePrice * notaryFees / 100);
    const totalInvested = downPayment + notary;

    // Loan simulation
    const credit = FinExtra.simulateCredit({
      amount: loanAmount,
      rate: loanRate,
      durationYears: loanDuration,
      insurance: insuranceRate
    });

    // Annual cash flows
    const annualRentGross = monthlyRent * 12;
    const annualRentNet = annualRentGross * (1 - vacancyRate / 100);
    const annualManagement = annualRentNet * managementFees / 100;
    const annualMaintenance = purchasePrice * maintenancePct / 100;
    const annualCharges = propertyTax + annualManagement + annualMaintenance;
    const annualCreditPayment = credit.monthlyTotal * 12;

    // Monthly cashflow
    const monthlyCashflow = round2((annualRentNet - annualCharges) / 12 - credit.monthlyTotal);

    // Rendement brut / net
    const yieldGross = round2((annualRentGross / (purchasePrice + notary)) * 100);
    const yieldNet = round2(((annualRentNet - annualCharges) / (purchasePrice + notary)) * 100);

    // Rendement net-net (après impôts)
    const taxableIncome = annualRentNet - annualCharges - credit.totalInterest / loanDuration;
    const taxOnRent = Math.max(0, taxableIncome) * (taxBracket / 100 + 0.172); // TMI + PS
    const yieldNetNet = round2(((annualRentNet - annualCharges - taxOnRent) / (purchasePrice + notary)) * 100);

    // Projection année par année
    const projection = [];
    let propertyValue = purchasePrice;
    let cumulativeCashflow = -totalInvested;
    let cumulativeRent = 0;
    let remainingLoan = loanAmount;

    for (let y = 0; y <= holdingYears; y++) {
      const equity = propertyValue - remainingLoan;
      const roi = totalInvested > 0 ? round2(((equity + cumulativeRent - totalInvested) / totalInvested) * 100) : 0;

      projection.push({
        year: y,
        propertyValue: round2(propertyValue),
        remainingLoan: round2(Math.max(0, remainingLoan)),
        equity: round2(equity),
        annualRentNet: round2(annualRentNet),
        cumulativeCashflow: round2(cumulativeCashflow),
        cumulativeRent: round2(cumulativeRent),
        roi
      });

      // Next year
      propertyValue *= (1 + appreciationRate / 100);
      if (y < loanDuration) {
        remainingLoan -= (annualCreditPayment - loanAmount * loanRate / 100);
        remainingLoan = Math.max(0, remainingLoan * (1 - 1 / (loanDuration - y + 0.01)));
      } else {
        remainingLoan = 0;
      }
      cumulativeCashflow += (annualRentNet - annualCharges - (y < loanDuration ? annualCreditPayment : 0));
      cumulativeRent += annualRentNet;
    }

    // TRI approximatif
    const finalEquity = projection[holdingYears]?.equity || 0;
    const totalReturn = finalEquity + cumulativeRent - totalInvested;
    const annualizedReturn = totalInvested > 0
      ? round2((Math.pow((finalEquity + cumulativeRent) / totalInvested, 1 / holdingYears) - 1) * 100)
      : 0;

    // Comparaison achat vs location
    const rentEquivalent = monthlyRent * 12 * holdingYears;
    const buyTotalCost = totalInvested + credit.totalCost + annualCharges * holdingYears;
    const buyNetCost = buyTotalCost - (projection[holdingYears]?.propertyValue || 0);

    return {
      purchasePrice,
      downPayment,
      notaryFees: notary,
      totalInvested,
      loanAmount,
      credit: {
        monthlyPayment: credit.monthlyTotal,
        totalInterest: credit.totalInterest,
        totalInsurance: credit.totalInsurance,
        totalCost: credit.totalCost
      },
      yields: {
        gross: yieldGross,
        net: yieldNet,
        netNet: yieldNetNet
      },
      cashflow: {
        monthly: monthlyCashflow,
        annual: round2(monthlyCashflow * 12),
        positive: monthlyCashflow >= 0
      },
      annualCharges: round2(annualCharges),
      annualRentNet: round2(annualRentNet),
      annualizedReturn,
      totalReturn: round2(totalReturn),
      comparison: {
        rentTotal: round2(rentEquivalent),
        buyNetCost: round2(buyNetCost),
        advantage: buyNetCost < rentEquivalent ? 'achat' : 'location',
        savings: round2(Math.abs(rentEquivalent - buyNetCost))
      },
      projection
    };
  }

  /* ============================================================
     3. TRANSACTION ENGINE — Budget tracking
     ============================================================ */
  const TRANSACTION_CATEGORIES = [
    { id: 'housing', label: 'Logement', icon: '🏠', color: '#3b82f6' },
    { id: 'food', label: 'Alimentation', icon: '🛒', color: '#22c55e' },
    { id: 'transport', label: 'Transport', icon: '🚗', color: '#f59e0b' },
    { id: 'health', label: 'Santé', icon: '🏥', color: '#ef4444' },
    { id: 'leisure', label: 'Loisirs', icon: '🎭', color: '#8b5cf6' },
    { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#ec4899' },
    { id: 'subscriptions', label: 'Abonnements', icon: '📱', color: '#6366f1' },
    { id: 'savings', label: 'Épargne', icon: '💰', color: '#14b8a6' },
    { id: 'investment', label: 'Investissement', icon: '📈', color: '#0ea5e9' },
    { id: 'income', label: 'Revenu', icon: '💰', color: '#22c55e' },
    { id: 'other', label: 'Autre', icon: '📋', color: '#94a3b8' }
  ];

  function analyzeTransactions(transactions) {
    if (!transactions || transactions.length === 0) {
      return { total: 0, byCategory: [], byMonth: [], averageDaily: 0, trend: 0 };
    }

    const expenses = transactions.filter(t => t.amount < 0);
    const incomes = transactions.filter(t => t.amount > 0);
    const totalExpenses = Math.abs(sum(expenses.map(t => t.amount)));
    const totalIncome = sum(incomes.map(t => t.amount));

    // By category
    const catMap = {};
    for (const t of expenses) {
      const cat = t.category || 'other';
      catMap[cat] = (catMap[cat] || 0) + Math.abs(t.amount);
    }
    const byCategory = Object.entries(catMap)
      .map(([id, amount]) => {
        const catDef = TRANSACTION_CATEGORIES.find(c => c.id === id) || { label: id, icon: '📋', color: '#94a3b8' };
        return { ...catDef, amount: round2(amount), pct: round2((amount / totalExpenses) * 100) };
      })
      .sort((a, b) => b.amount - a.amount);

    // By month
    const monthMap = {};
    for (const t of transactions) {
      const m = t.date ? t.date.slice(0, 7) : 'unknown';
      if (!monthMap[m]) monthMap[m] = { income: 0, expenses: 0 };
      if (t.amount > 0) monthMap[m].income += t.amount;
      else monthMap[m].expenses += Math.abs(t.amount);
    }
    const byMonth = Object.entries(monthMap)
      .map(([month, data]) => ({ month, ...data, savings: round2(data.income - data.expenses) }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Anomaly detection
    const avgMonthlyExpense = totalExpenses / Math.max(1, byMonth.length);
    const anomalies = byMonth
      .filter(m => m.expenses > avgMonthlyExpense * 1.35)
      .map(m => ({
        month: m.month,
        amount: round2(m.expenses),
        excess: round2(m.expenses - avgMonthlyExpense),
        excessPct: round2(((m.expenses - avgMonthlyExpense) / avgMonthlyExpense) * 100)
      }));

    // Daily average
    const days = transactions.length > 0
      ? Math.max(1, Math.ceil((new Date(transactions[0].date) - new Date(transactions[transactions.length - 1].date)) / 86400000))
      : 1;

    return {
      totalExpenses: round2(totalExpenses),
      totalIncome: round2(totalIncome),
      balance: round2(totalIncome - totalExpenses),
      byCategory,
      byMonth,
      anomalies,
      averageDaily: round2(totalExpenses / days),
      averageMonthly: round2(avgMonthlyExpense),
      transactionCount: transactions.length
    };
  }

  /* ============================================================
     4. SNAPSHOT ENGINE — Monthly patrimony tracking
     ============================================================ */
  function createSnapshot(profile, analysis) {
    return {
      date: new Date().toISOString(),
      month: new Date().toISOString().slice(0, 7),
      netWorth: analysis?.ratios?.netWorth || 0,
      totalAssets: analysis?.ratios?.totalAssets || 0,
      totalDebt: analysis?.ratios?.totalDebt || 0,
      savings: profile.currentSavings || 0,
      investments: sum((profile.investments || []).map(i => i.amount || 0)),
      healthScore: analysis?.healthScore?.total || 0,
      savingsRate: analysis?.balance?.savingsRate || 0,
      surplus: analysis?.balance?.surplus || 0
    };
  }

  function analyzeSnapshots(snapshots) {
    if (!snapshots || snapshots.length < 2) {
      return { trend: 'neutral', growth: 0, monthlyGrowth: 0, data: snapshots || [] };
    }
    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const growth = last.netWorth - first.netWorth;
    const months = sorted.length;
    const monthlyGrowth = months > 1 ? round2(growth / (months - 1)) : 0;
    const trend = growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral';

    return {
      trend,
      growth: round2(growth),
      growthPct: first.netWorth > 0 ? round2((growth / first.netWorth) * 100) : 0,
      monthlyGrowth,
      bestMonth: sorted.reduce((best, s, i) => {
        if (i === 0) return best;
        const g = s.netWorth - sorted[i - 1].netWorth;
        return g > (best.growth || 0) ? { month: s.month, growth: g } : best;
      }, {}),
      data: sorted
    };
  }

  /* ============================================================
     5. XP / LEVEL SYSTEM — Gamification
     ============================================================ */
  const XP_ACTIONS = {
    complete_questionnaire: 100,
    first_analysis: 50,
    view_dashboard: 5,
    use_tool: 10,
    add_transaction: 5,
    complete_challenge: 50,
    unlock_badge: 30,
    write_journal: 15,
    daily_login: 10,
    complete_course: 40,
    run_stress_test: 15,
    export_data: 10,
    cloud_sync: 10
  };

  function computeLevel(totalXP) {
    // XP needed per level: 100, 200, 350, 550, 800, ...
    let level = 1;
    let xpForNext = 100;
    let remaining = totalXP;
    while (remaining >= xpForNext && level < 50) {
      remaining -= xpForNext;
      level++;
      xpForNext = Math.round(100 * Math.pow(1.3, level - 1));
    }
    return {
      level,
      currentXP: totalXP,
      xpInLevel: remaining,
      xpForNext,
      progress: round2((remaining / xpForNext) * 100),
      title: getLevelTitle(level)
    };
  }

  function getLevelTitle(level) {
    if (level < 5) return 'Novice';
    if (level < 10) return 'Apprenti';
    if (level < 15) return 'Investisseur';
    if (level < 20) return 'Gestionnaire';
    if (level < 25) return 'Stratège';
    if (level < 30) return 'Expert';
    if (level < 35) return 'Maître';
    if (level < 40) return 'Légende';
    if (level < 45) return 'Oracle';
    return 'Titan';
  }

  /* ============================================================
     6. PORTFOLIO TRACKER — Real positions
     ============================================================ */
  function computePortfolioPerformance(positions) {
    if (!positions || positions.length === 0) {
      return { totalValue: 0, totalCost: 0, totalPL: 0, totalPLPct: 0, positions: [] };
    }

    let totalValue = 0;
    let totalCost = 0;
    const enriched = positions.map(pos => {
      const liveData = getAssetBySymbol(pos.symbol);
      const currentPrice = liveData ? liveData.price : pos.avgPrice;
      const value = round2(currentPrice * pos.quantity);
      const cost = round2(pos.avgPrice * pos.quantity);
      const pl = round2(value - cost);
      const plPct = cost > 0 ? round2((pl / cost) * 100) : 0;
      totalValue += value;
      totalCost += cost;
      return {
        ...pos,
        currentPrice,
        value,
        cost,
        pl,
        plPct,
        weight: 0, // computed below
        liveData
      };
    });

    // Compute weights
    for (const p of enriched) {
      p.weight = totalValue > 0 ? round2((p.value / totalValue) * 100) : 0;
    }

    return {
      totalValue: round2(totalValue),
      totalCost: round2(totalCost),
      totalPL: round2(totalValue - totalCost),
      totalPLPct: totalCost > 0 ? round2(((totalValue - totalCost) / totalCost) * 100) : 0,
      positions: enriched.sort((a, b) => b.value - a.value)
    };
  }

  /* ============================================================
     7. SEASONAL ADVICE — Time-based recommendations
     ============================================================ */
  function getSeasonalAdvice() {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const tips = [];

    switch (month) {
      case 0: // Janvier
        tips.push({ icon: '📅', title: 'Bilan annuel', desc: 'C\'est le moment de faire votre bilan financier de l\'année écoulée et de fixer vos objectifs pour la nouvelle année.' });
        tips.push({ icon: '💰', title: 'Versement PER', desc: 'Vous avez jusqu\'au 31/12 prochain pour défiscaliser vos versements PER. Planifiez dès maintenant.' });
        break;
      case 1: // Février
        tips.push({ icon: '📊', title: 'Rééquilibrage', desc: 'Début d\'année : rééquilibrez votre portefeuille si nécessaire après les mouvements de fin d\'année.' });
        break;
      case 2: // Mars
        tips.push({ icon: '📋', title: 'Assemblées générales', desc: 'Saison des AG : votez pour vos actions et suivez les décisions de dividendes.' });
        break;
      case 3: // Avril
        tips.push({ icon: '🧾', title: 'Déclaration d\'impôts', desc: 'Préparez votre déclaration de revenus. Vérifiez que tous vos IFU sont corrects.' });
        tips.push({ icon: '📈', title: 'Détachement dividendes', desc: 'Beaucoup de dividendes français sont détachés en avril-mai. Attention au "piège du dividende".' });
        break;
      case 4: // Mai
        tips.push({ icon: '🧾', title: 'Deadline impôts', desc: 'Date limite de déclaration des revenus en ligne. N\'oubliez pas les annexes (plus-values, revenus fonciers).' });
        tips.push({ icon: '📊', title: 'Sell in May?', desc: 'L\'adage boursier "Sell in May and go away" n\'est pas toujours vrai. Restez investi sur le long terme.' });
        break;
      case 5: // Juin
        tips.push({ icon: '🏖️', title: 'Budget vacances', desc: 'Anticipez votre budget vacances d\'été pour ne pas entamer votre épargne.' });
        break;
      case 6: // Juillet
        tips.push({ icon: '📊', title: 'Bilan semestriel', desc: 'Mi-année : faites le point sur vos objectifs financiers. Êtes-vous sur la bonne trajectoire ?' });
        break;
      case 7: // Août
        tips.push({ icon: '📚', title: 'Éducation financière', desc: 'Profitez de l\'été pour lire un livre sur l\'investissement ou suivre une formation en ligne.' });
        break;
      case 8: // Septembre
        tips.push({ icon: '🎒', title: 'Rentrée financière', desc: 'Rentrée = bonnes résolutions. Mettez en place vos virements automatiques d\'épargne.' });
        tips.push({ icon: '📱', title: 'Abonnements', desc: 'Faites le tri dans vos abonnements (streaming, box, assurances) — la rentrée est le moment idéal.' });
        break;
      case 9: // Octobre
        tips.push({ icon: '🏠', title: 'Taxe foncière', desc: 'Échéance de la taxe foncière. Si vous êtes propriétaire, vérifiez votre avis.' });
        tips.push({ icon: '📊', title: 'Q3 Earnings', desc: 'Saison des résultats du 3e trimestre. Suivez les entreprises de votre portefeuille.' });
        break;
      case 10: // Novembre
        tips.push({ icon: '🛍️', title: 'Black Friday', desc: 'Attention aux achats impulsifs du Black Friday. Établissez une liste de besoins réels avant.' });
        tips.push({ icon: '💰', title: 'Plan d\'épargne de fin d\'année', desc: 'Dernière ligne droite pour optimiser votre épargne annuelle.' });
        break;
      case 11: // Décembre
        tips.push({ icon: '📦', title: 'Versement PER urgent', desc: 'DERNIER MOIS pour verser sur votre PER et bénéficier de la déduction fiscale cette année !' });
        tips.push({ icon: '🎁', title: 'Donations', desc: 'Les dons aux associations ouvrent droit à une réduction d\'impôt de 66% (ou 75% pour certaines). Deadline : 31/12.' });
        tips.push({ icon: '📊', title: 'Bilan de fin d\'année', desc: 'Faites votre snapshot patrimonial de décembre pour suivre votre progression annuelle.' });
        break;
    }

    return tips;
  }

  /* ============================================================
     8. NOTIFICATION ENGINE
     ============================================================ */
  function generateNotifications(profile, analysis) {
    const notifs = [];
    const now = new Date();

    // Seasonal
    const seasonal = getSeasonalAdvice();
    for (const s of seasonal) {
      notifs.push({ type: 'info', icon: s.icon, title: s.title, message: s.desc, category: 'saisonnier', date: now.toISOString() });
    }

    // Alerts from analysis
    if (analysis) {
      if (analysis.balance?.surplus < 0) {
        notifs.push({ type: 'critical', icon: '🚨', title: 'Budget déficitaire', message: `Vos dépenses dépassent vos revenus de ${Math.abs(analysis.balance.surplus)}€/mois`, category: 'alerte', date: now.toISOString() });
      }
      if (analysis.emergencyFund?.monthsCovered < 2) {
        notifs.push({ type: 'warning', icon: '🛡️', title: 'Fonds d\'urgence faible', message: `Seulement ${analysis.emergencyFund.monthsCovered.toFixed(1)} mois couverts`, category: 'alerte', date: now.toISOString() });
      }
      if (analysis.debtAnalysis?.debtToIncomeRatio > 33) {
        notifs.push({ type: 'warning', icon: '⚠️', title: 'Endettement élevé', message: `Ratio dette/revenu : ${analysis.debtAnalysis.debtToIncomeRatio}%`, category: 'alerte', date: now.toISOString() });
      }
    }

    // Milestones
    if (analysis?.ratios?.netWorth > 0) {
      const nw = analysis.ratios.netWorth;
      const milestones = [10000, 25000, 50000, 100000, 200000, 500000, 1000000];
      for (const m of milestones) {
        if (nw >= m && nw < m * 1.1) {
          notifs.push({ type: 'success', icon: '🏆', title: `Patrimoine ${(m / 1000).toFixed(0)}k€ atteint !`, message: `Félicitations, votre patrimoine net dépasse ${m.toLocaleString('fr-FR')}€`, category: 'milestone', date: now.toISOString() });
        }
      }
    }

    return notifs;
  }

  /* ============================================================
     ASYNC — Load real data via FinAPI, then re-render
     ============================================================ */

  /**
   * Fetch real prices for all assets via FinAPI.
   * After this resolves, getLivePrice() will return real data.
   * @returns {Promise<Object>} map of symbol → real data
   */
  async function loadRealPrices() {
    if (!window.FinAPI) return {};
    if (!window.FinAPI.isReady()) await window.FinAPI.init();
    return window.FinAPI.fetchAllPrices();
  }

  /**
   * Fetch real historical data for a symbol.
   * Falls back to generateHistoricalData() if API unavailable.
   */
  async function loadRealHistorical(symbol, days = 90) {
    if (!window.FinAPI) return null;
    if (!window.FinAPI.isReady()) await window.FinAPI.init();
    return window.FinAPI.fetchHistorical(symbol, days);
  }

  /** Check if any real data is loaded  */
  function hasRealData() {
    return window.FinAPI && window.FinAPI.realPriceCache && window.FinAPI.realPriceCache.size > 0;
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  window.FinMarket = {
    // Market data
    INDICES, POPULAR_STOCKS,
    getLivePrice, getAllIndices, getAllStocks,
    searchAssets, getAssetBySymbol, getAssetDef,
    generateHistoricalData, generateSparkline,
    // Async real data
    loadRealPrices, loadRealHistorical, hasRealData,
    // Immobilier
    simulateImmobilier,
    // Transactions
    TRANSACTION_CATEGORIES, analyzeTransactions,
    // Snapshots
    createSnapshot, analyzeSnapshots,
    // XP / Levels
    XP_ACTIONS, computeLevel, getLevelTitle,
    // Portfolio
    computePortfolioPerformance,
    // Seasonal
    getSeasonalAdvice,
    // Notifications
    generateNotifications
  };
})();
