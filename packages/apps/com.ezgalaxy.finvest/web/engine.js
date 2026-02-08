/* ================================================================
   FinVest — engine.js  (Financial Calculation Engine)
   Pure computation — zero DOM dependency.
   Exposes: window.FinEngine
   ================================================================ */
(() => {
  'use strict';

  /* ---------- helpers ----------------------------------------- */
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const round2 = v => Math.round(v * 100) / 100;
  const sum = arr => arr.reduce((a, b) => a + b, 0);
  const avg = arr => arr.length ? sum(arr) / arr.length : 0;

  /* Normal-distribution random (Box-Muller) */
  function randNormal(mean = 0, std = 1) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /* ============================================================
     1. RISK SCORE  (1-10)
     ============================================================ */
  const RISK_WEIGHTS = [1, 1.2, 1.3, 1.0, 1.5, 1.0, 1.0];  // per question

  function computeRiskScore(answers) {
    // answers: array of 7 values 1-5 (1 = very conservative, 5 = very aggressive)
    if (!answers || answers.length < 7) return 5; // default moderate
    let total = 0, wSum = 0;
    for (let i = 0; i < 7; i++) {
      total += (answers[i] || 3) * RISK_WEIGHTS[i];
      wSum += 5 * RISK_WEIGHTS[i];
    }
    return clamp(round2((total / wSum) * 10), 1, 10);
  }

  /* ============================================================
     2. HEALTH SCORE  (0-100)
     Combined health indicator
     ============================================================ */
  function computeHealthScore(profile) {
    const bal = computeMonthlyBalance(profile);
    const debt = computeDebtAnalysis(profile);
    const ef = computeEmergencyFund(profile);
    const ratios = computeFinancialRatios(profile);

    // Savings rate score (30%)  — target ≥ 20%
    const savingsScore = clamp(ratios.savingsRate / 20 * 100, 0, 100);

    // Debt score (25%) — target: ratio < 33%
    const debtScore = debt.debtToIncomeRatio <= 0 ? 100
      : debt.debtToIncomeRatio < 15 ? 100
      : debt.debtToIncomeRatio < 33 ? 100 - ((debt.debtToIncomeRatio - 15) / 18) * 50
      : debt.debtToIncomeRatio < 50 ? 50 - ((debt.debtToIncomeRatio - 33) / 17) * 40
      : 10;

    // Emergency fund score (20%) — target: 6 months covered
    const monthsCovered = ef.monthsCovered || 0;
    const efScore = clamp((monthsCovered / 6) * 100, 0, 100);

    // Diversification score (15%) — more asset types = better
    const assetTypes = new Set();
    (profile.investments || []).forEach(i => assetTypes.add(i.type));
    if (profile.currentSavings > 0) assetTypes.add('cash');
    if ((profile.realEstate || []).length) assetTypes.add('realEstate');
    const divScore = clamp((assetTypes.size / 5) * 100, 0, 100);

    // Goal progress score (10%)
    const goals = computeGoalProgress(profile);
    const goalScore = goals.length ? avg(goals.map(g => g.progress)) : 50;

    const total = round2(
      savingsScore * 0.30 +
      debtScore * 0.25 +
      efScore * 0.20 +
      divScore * 0.15 +
      goalScore * 0.10
    );

    return {
      total: clamp(Math.round(total), 0, 100),
      components: {
        savings: { score: Math.round(savingsScore), weight: 30, detail: `Taux d'épargne : ${round2(ratios.savingsRate)}%` },
        debt: { score: Math.round(debtScore), weight: 25, detail: `Ratio dette/revenu : ${round2(debt.debtToIncomeRatio)}%` },
        emergency: { score: Math.round(efScore), weight: 20, detail: `Fonds d'urgence : ${round2(monthsCovered)} mois` },
        diversification: { score: Math.round(divScore), weight: 15, detail: `${assetTypes.size} classes d'actifs` },
        goals: { score: Math.round(goalScore), weight: 10, detail: `Progression objectifs` }
      }
    };
  }

  /* ============================================================
     3. MONTHLY BALANCE
     ============================================================ */
  function computeMonthlyBalance(profile) {
    const income = (profile.monthlyNetIncome || 0) + (profile.otherIncome || 0);
    const fixed = profile.fixedExpenses || 0;
    const variable = profile.variableExpenses || 0;
    const totalDebtPayments = sum((profile.debts || []).map(d => d.monthlyPayment || 0));
    const expenses = fixed + variable + totalDebtPayments;
    const surplus = income - expenses;
    const savingsRate = income > 0 ? (surplus / income) * 100 : 0;
    return { income: round2(income), expenses: round2(expenses), surplus: round2(surplus), savingsRate: round2(savingsRate), fixed: round2(fixed), variable: round2(variable), debtPayments: round2(totalDebtPayments) };
  }

  /* ============================================================
     4. EMERGENCY FUND
     ============================================================ */
  function computeEmergencyFund(profile) {
    const monthlyExpenses = (profile.fixedExpenses || 0) + (profile.variableExpenses || 0) +
      sum((profile.debts || []).map(d => d.monthlyPayment || 0));
    const riskScore = computeRiskScore(profile.riskAnswers);
    const recommendedMonths = riskScore <= 3 ? 6 : riskScore <= 6 ? 5 : 3;
    const recommended = round2(monthlyExpenses * recommendedMonths);
    const current = profile.currentSavings || 0;
    const monthsCovered = monthlyExpenses > 0 ? round2(current / monthlyExpenses) : 0;
    const bal = computeMonthlyBalance(profile);
    const deficit = Math.max(0, recommended - current);
    const monthsToGoal = bal.surplus > 0 ? Math.ceil(deficit / bal.surplus) : Infinity;
    return { recommended, current, deficit: round2(deficit), monthsCovered, recommendedMonths, monthsToGoal, monthlyExpenses: round2(monthlyExpenses) };
  }

  /* ============================================================
     5. DEBT ANALYSIS
     ============================================================ */
  function computeDebtAnalysis(profile) {
    const debts = (profile.debts || []).map(d => ({ ...d }));
    const income = (profile.monthlyNetIncome || 0) + (profile.otherIncome || 0);
    const totalDebt = sum(debts.map(d => d.remainingAmount || 0));
    const totalMonthly = sum(debts.map(d => d.monthlyPayment || 0));
    const debtToIncomeRatio = income > 0 ? round2((totalMonthly / income) * 100) : 0;
    const totalCost = sum(debts.map(d => {
      const n = d.remainingMonths || 0;
      return (d.monthlyPayment || 0) * n;
    }));
    const totalInterest = round2(totalCost - totalDebt);

    // Snowball strategy (smallest balance first)
    const snowball = buildPayoffSchedule([...debts].sort((a, b) => (a.remainingAmount || 0) - (b.remainingAmount || 0)));

    // Avalanche strategy (highest rate first)
    const avalanche = buildPayoffSchedule([...debts].sort((a, b) => (b.rate || 0) - (a.rate || 0)));

    return {
      totalDebt: round2(totalDebt),
      totalMonthlyPayments: round2(totalMonthly),
      debtToIncomeRatio,
      totalInterest,
      snowball,
      avalanche,
      interestSaved: round2(snowball.totalInterest - avalanche.totalInterest),
      debts: debts.map(d => ({
        ...d,
        totalCost: round2((d.monthlyPayment || 0) * (d.remainingMonths || 0)),
        totalInterest: round2((d.monthlyPayment || 0) * (d.remainingMonths || 0) - (d.remainingAmount || 0))
      }))
    };
  }

  function buildPayoffSchedule(debts) {
    // Simulate payoff with minimum payments, extra goes to top priority
    const items = debts.map(d => ({
      name: d.name || 'Dette',
      balance: d.remainingAmount || 0,
      rate: (d.rate || 0) / 100 / 12,
      minPayment: d.monthlyPayment || 0
    }));
    const totalMinPayment = sum(items.map(i => i.minPayment));
    let month = 0;
    let totalPaid = 0;
    const timeline = [];
    const maxMonths = 600; // safety

    while (items.some(i => i.balance > 0.01) && month < maxMonths) {
      month++;
      let extra = 0;
      for (const item of items) {
        if (item.balance <= 0.01) {
          extra += item.minPayment;
          continue;
        }
        item.balance += item.balance * item.rate;
        let payment = item.minPayment + extra;
        extra = 0;
        if (payment >= item.balance) {
          extra = payment - item.balance;
          payment = item.balance;
          item.balance = 0;
        } else {
          item.balance -= payment;
        }
        totalPaid += payment;
      }
      if (month % 6 === 0 || !items.some(i => i.balance > 0.01)) {
        timeline.push({ month, remaining: round2(sum(items.map(i => i.balance))) });
      }
    }
    const totalInterest = round2(totalPaid - sum(debts.map(d => d.remainingAmount || 0)));
    return { months: month, totalPaid: round2(totalPaid), totalInterest, timeline };
  }

  /* ============================================================
     6. PORTFOLIO ALLOCATION
     ============================================================ */
  const ASSET_CLASSES = [
    { key: 'actions_fr_eu', label: 'Actions FR/EU', color: '#3b82f6', desc: 'ETF Euro Stoxx 600, CAC 40', returnAvg: 7.5, volatility: 18 },
    { key: 'actions_us', label: 'Actions US', color: '#8b5cf6', desc: 'ETF S&P 500, NASDAQ', returnAvg: 9.5, volatility: 20 },
    { key: 'actions_emergents', label: 'Émergents', color: '#ec4899', desc: 'ETF MSCI Emerging Markets', returnAvg: 8, volatility: 25 },
    { key: 'obligations', label: 'Obligations', color: '#14b8a6', desc: 'OAT, fonds obligataires diversifiés', returnAvg: 3, volatility: 5 },
    { key: 'immobilier', label: 'Immobilier (SCPI)', color: '#f59e0b', desc: 'SCPI diversifiées (Corum, Primovie…)', returnAvg: 5, volatility: 8 },
    { key: 'fonds_euros', label: 'Fonds Euros', color: '#22c55e', desc: 'Assurance-vie fonds euros', returnAvg: 2.5, volatility: 1 },
    { key: 'crypto', label: 'Crypto', color: '#f97316', desc: 'Bitcoin, Ethereum (< 5% du portefeuille)', returnAvg: 15, volatility: 60 },
    { key: 'liquidites', label: 'Liquidités', color: '#94a3b8', desc: 'Livret A, LDDS, comptes à terme', returnAvg: 2, volatility: 0 }
  ];

  // Predefined allocation profiles
  const ALLOCATION_PROFILES = {
    conservative: { actions_fr_eu: 10, actions_us: 5, actions_emergents: 0, obligations: 30, immobilier: 15, fonds_euros: 30, crypto: 0, liquidites: 10 },
    balanced:     { actions_fr_eu: 20, actions_us: 15, actions_emergents: 5, obligations: 15, immobilier: 15, fonds_euros: 15, crypto: 2, liquidites: 13 },
    dynamic:      { actions_fr_eu: 25, actions_us: 20, actions_emergents: 10, obligations: 10, immobilier: 10, fonds_euros: 5, crypto: 5, liquidites: 15 },
    aggressive:   { actions_fr_eu: 25, actions_us: 25, actions_emergents: 15, obligations: 5, immobilier: 5, fonds_euros: 0, crypto: 10, liquidites: 15 }
  };

  function computePortfolioAllocation(riskScore, age, horizon) {
    // Age adjustment: older → more conservative
    const ageFactor = clamp((age - 25) / 40, 0, 1); // 0 at 25, 1 at 65
    // Horizon adjustment: shorter → more conservative
    const horizonFactor = clamp(1 - (horizon - 3) / 27, 0, 1); // 0 at 30yr, 1 at 3yr
    // Combined conservatism factor
    const conservatism = clamp((ageFactor * 0.4 + horizonFactor * 0.3 + (1 - riskScore / 10) * 0.3), 0, 1);

    // Interpolate between aggressive and conservative
    const alloc = {};
    for (const cls of ASSET_CLASSES) {
      const aggr = ALLOCATION_PROFILES.aggressive[cls.key];
      const cons = ALLOCATION_PROFILES.conservative[cls.key];
      alloc[cls.key] = round2(cons * conservatism + aggr * (1 - conservatism));
    }

    // Normalize to 100%
    const total = sum(Object.values(alloc));
    for (const k of Object.keys(alloc)) {
      alloc[k] = round2(alloc[k] / total * 100);
    }

    // Profile label
    let profileLabel;
    if (conservatism > 0.7) profileLabel = 'Conservateur';
    else if (conservatism > 0.45) profileLabel = 'Équilibré';
    else if (conservatism > 0.2) profileLabel = 'Dynamique';
    else profileLabel = 'Agressif';

    // Expected return & volatility (weighted)
    const expectedReturn = round2(sum(ASSET_CLASSES.map(c => (alloc[c.key] / 100) * c.returnAvg)));
    const expectedVolatility = round2(Math.sqrt(sum(ASSET_CLASSES.map(c => Math.pow((alloc[c.key] / 100) * c.volatility, 2)))));

    return {
      allocation: alloc,
      profileLabel,
      expectedReturn,
      expectedVolatility,
      details: ASSET_CLASSES.map(c => ({
        ...c,
        pct: alloc[c.key]
      }))
    };
  }

  function computeCurrentAllocation(profile) {
    const inv = profile.investments || [];
    const savings = profile.currentSavings || 0;
    const re = sum((profile.realEstate || []).map(r => r.value || 0));
    const total = savings + sum(inv.map(i => i.amount || 0)) + re;
    if (total === 0) return { allocation: {}, total: 0, details: [] };

    const mapping = {
      'pea': 'actions_fr_eu',
      'cto_actions': 'actions_us',
      'etf_monde': 'actions_us',
      'etf_emergents': 'actions_emergents',
      'obligations': 'obligations',
      'assurance_vie_uc': 'actions_fr_eu',
      'assurance_vie_fonds_euros': 'fonds_euros',
      'scpi': 'immobilier',
      'crypto': 'crypto',
      'livret': 'liquidites',
      'per': 'obligations',
      'autre': 'liquidites'
    };

    const alloc = {};
    ASSET_CLASSES.forEach(c => { alloc[c.key] = 0; });
    alloc.liquidites += savings;
    if (re > 0) alloc.immobilier += re;
    for (const i of inv) {
      const key = mapping[i.type] || 'liquidites';
      alloc[key] += (i.amount || 0);
    }

    // Convert to percentages
    const pctAlloc = {};
    for (const k of Object.keys(alloc)) {
      pctAlloc[k] = total > 0 ? round2((alloc[k] / total) * 100) : 0;
    }

    return {
      allocation: pctAlloc,
      total: round2(total),
      details: ASSET_CLASSES.map(c => ({
        ...c,
        pct: pctAlloc[c.key],
        amount: round2(alloc[c.key])
      }))
    };
  }

  function computeRebalancing(current, target, totalValue) {
    const moves = [];
    for (const cls of ASSET_CLASSES) {
      const curPct = (current.allocation && current.allocation[cls.key]) || 0;
      const tgtPct = (target.allocation && target.allocation[cls.key]) || 0;
      const diff = round2(tgtPct - curPct);
      const amount = round2(diff / 100 * totalValue);
      if (Math.abs(diff) > 0.5) {
        moves.push({ ...cls, currentPct: curPct, targetPct: tgtPct, diffPct: diff, amount });
      }
    }
    return moves.sort((a, b) => b.amount - a.amount);
  }

  /* ============================================================
     7. COMPOUND GROWTH PROJECTION
     ============================================================ */
  function projectCompoundGrowth(principal, monthly, annualRate, years) {
    const monthlyRate = annualRate / 100 / 12;
    const points = [{ year: 0, capital: round2(principal), contributions: 0, interest: 0 }];
    let capital = principal;
    let totalContrib = 0;

    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) {
        capital += capital * monthlyRate;
        capital += monthly;
        totalContrib += monthly;
      }
      points.push({
        year: y,
        capital: round2(capital),
        contributions: round2(principal + totalContrib),
        interest: round2(capital - principal - totalContrib)
      });
    }
    return points;
  }

  /* ============================================================
     8. MONTE CARLO SIMULATION
     ============================================================ */
  function runMonteCarloSimulation(params, iterations = 1000) {
    const { principal, monthly, annualReturn, annualVolatility, years } = params;
    const monthlyReturn = annualReturn / 100 / 12;
    const monthlyVol = (annualVolatility / 100) / Math.sqrt(12);
    const totalMonths = years * 12;

    const finalValues = [];
    const trajectories = { p10: [], p25: [], p50: [], p75: [], p90: [] };
    const yearlySnapshots = Array.from({ length: years + 1 }, () => []);

    for (let i = 0; i < iterations; i++) {
      let capital = principal;
      for (let m = 1; m <= totalMonths; m++) {
        const r = randNormal(monthlyReturn, monthlyVol);
        capital = capital * (1 + r) + monthly;
        capital = Math.max(0, capital);
        if (m % 12 === 0) {
          yearlySnapshots[m / 12].push(capital);
        }
      }
      finalValues.push(capital);
    }
    yearlySnapshots[0] = [principal];

    // Compute percentiles for each year
    const percentiles = [10, 25, 50, 75, 90];
    const result = [];
    for (let y = 0; y <= years; y++) {
      const sorted = yearlySnapshots[y].slice().sort((a, b) => a - b);
      const row = { year: y };
      for (const p of percentiles) {
        const idx = Math.floor((p / 100) * sorted.length);
        row[`p${p}`] = round2(sorted[Math.min(idx, sorted.length - 1)]);
      }
      result.push(row);
    }

    // Final distribution stats
    finalValues.sort((a, b) => a - b);
    const pctl = p => round2(finalValues[Math.floor((p / 100) * finalValues.length)] || 0);

    return {
      yearlyPercentiles: result,
      finalStats: {
        mean: round2(avg(finalValues)),
        median: pctl(50),
        p10: pctl(10), p25: pctl(25), p50: pctl(50), p75: pctl(75), p90: pctl(90),
        min: round2(finalValues[0]),
        max: round2(finalValues[finalValues.length - 1])
      },
      iterations
    };
  }

  /* ============================================================
     9. RETIREMENT PLANNING
     ============================================================ */
  function computeRetirement(profile) {
    const age = profile.age || 30;
    const retirementAge = profile.retirementAge || 65;
    const yearsToRetirement = Math.max(0, retirementAge - age);
    const lifeExpectancy = 85;
    const yearsInRetirement = Math.max(0, lifeExpectancy - retirementAge);
    const bal = computeMonthlyBalance(profile);
    const desiredMonthlyIncome = (profile.retirementIncome || bal.income * 0.7);
    const annualNeed = desiredMonthlyIncome * 12;

    // Withdrawal rate (4% rule adjusted)
    const withdrawalRate = 0.04;
    const capitalNeeded = round2(annualNeed / withdrawalRate);

    // Current trajectory
    const riskScore = computeRiskScore(profile.riskAnswers);
    const alloc = computePortfolioAllocation(riskScore, age, yearsToRetirement);
    const currentWealth = (profile.currentSavings || 0) + sum((profile.investments || []).map(i => i.amount || 0));
    const monthlySaving = Math.max(0, bal.surplus);

    const projection = projectCompoundGrowth(currentWealth, monthlySaving, alloc.expectedReturn, yearsToRetirement);
    const projectedCapital = projection.length ? projection[projection.length - 1].capital : currentWealth;

    const surplus = round2(projectedCapital - capitalNeeded);
    const onTrack = surplus >= 0;

    // Required monthly saving to reach goal
    const monthlyRate = alloc.expectedReturn / 100 / 12;
    const months = yearsToRetirement * 12;
    let requiredMonthly = 0;
    if (months > 0 && monthlyRate > 0) {
      const fvCurrent = currentWealth * Math.pow(1 + monthlyRate, months);
      const deficit = capitalNeeded - fvCurrent;
      if (deficit > 0) {
        requiredMonthly = round2(deficit * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1));
      }
    }

    // Decumulation phase
    const decumulation = [];
    let cap = projectedCapital;
    for (let y = 0; y <= yearsInRetirement; y++) {
      decumulation.push({ year: retirementAge + y, capital: round2(cap) });
      cap = cap * (1 + 0.02) - annualNeed; // 2% return in retirement
      if (cap < 0) { cap = 0; }
    }

    return {
      age, retirementAge, yearsToRetirement, lifeExpectancy, yearsInRetirement,
      desiredMonthlyIncome: round2(desiredMonthlyIncome),
      capitalNeeded, projectedCapital: round2(projectedCapital),
      surplus, onTrack,
      requiredMonthlySaving: requiredMonthly,
      currentMonthlySaving: round2(monthlySaving),
      savingGap: round2(Math.max(0, requiredMonthly - monthlySaving)),
      projection, decumulation,
      expectedReturn: alloc.expectedReturn
    };
  }

  /* ============================================================
     10. INFLATION IMPACT
     ============================================================ */
  function computeInflationImpact(amount, years, rate = 2.5) {
    const points = [];
    for (let y = 0; y <= years; y++) {
      const realValue = round2(amount / Math.pow(1 + rate / 100, y));
      const nominalKeep = round2(amount);
      points.push({ year: y, nominal: nominalKeep, real: realValue, lostPurchasingPower: round2(amount - realValue) });
    }
    return points;
  }

  /* ============================================================
     11. GOAL PROGRESS
     ============================================================ */
  function computeGoalProgress(profile) {
    const goals = profile.goals || [];
    const bal = computeMonthlyBalance(profile);
    const monthlySaving = Math.max(0, bal.surplus);
    const currentSavings = profile.currentSavings || 0;
    const totalInvestments = sum((profile.investments || []).map(i => i.amount || 0));
    const totalWealth = currentSavings + totalInvestments;

    return goals.map(goal => {
      const target = goal.targetAmount || 0;
      const horizon = goal.horizonYears || 5;
      const progress = target > 0 ? clamp(round2((totalWealth / target) * 100), 0, 100) : 0;
      const remaining = Math.max(0, target - totalWealth);
      const monthsNeeded = monthlySaving > 0 ? Math.ceil(remaining / monthlySaving) : Infinity;
      const feasible = monthsNeeded <= horizon * 12;

      return {
        name: goal.name,
        targetAmount: target,
        horizonYears: horizon,
        priority: goal.priority || 'medium',
        progress,
        remaining: round2(remaining),
        monthsNeeded,
        feasible,
        requiredMonthly: horizon > 0 ? round2(remaining / (horizon * 12)) : remaining
      };
    });
  }

  /* ============================================================
     12. FINANCIAL RATIOS
     ============================================================ */
  function computeFinancialRatios(profile) {
    const bal = computeMonthlyBalance(profile);
    const totalDebt = sum((profile.debts || []).map(d => d.remainingAmount || 0));
    const totalAssets = (profile.currentSavings || 0) +
      sum((profile.investments || []).map(i => i.amount || 0)) +
      sum((profile.realEstate || []).map(r => r.value || 0));
    const netWorth = totalAssets - totalDebt;

    return {
      savingsRate: round2(bal.savingsRate),
      debtToIncomeRatio: bal.income > 0 ? round2((bal.debtPayments / bal.income) * 100) : 0,
      effortRate: bal.income > 0 ? round2(((bal.fixed + bal.debtPayments) / bal.income) * 100) : 0,
      liquidityRatio: bal.expenses > 0 ? round2((profile.currentSavings || 0) / bal.expenses) : 0,
      netWorth: round2(netWorth),
      totalAssets: round2(totalAssets),
      totalDebt: round2(totalDebt),
      debtToAssetRatio: totalAssets > 0 ? round2((totalDebt / totalAssets) * 100) : 0,
      patrimony: round2(totalAssets)
    };
  }

  /* ============================================================
     13. TAX OPTIMIZATION SUGGESTIONS
     ============================================================ */
  function computeTaxOptimization(profile) {
    const suggestions = [];
    const inv = profile.investments || [];
    const totalInvested = sum(inv.map(i => i.amount || 0));
    const hasPEA = inv.some(i => i.type === 'pea');
    const hasAV = inv.some(i => i.type === 'assurance_vie_fonds_euros' || i.type === 'assurance_vie_uc');
    const hasPER = inv.some(i => i.type === 'per');
    const age = profile.age || 30;
    const income = (profile.monthlyNetIncome || 0) * 12;

    if (!hasPEA) {
      suggestions.push({
        title: 'Ouvrir un PEA',
        description: 'Le Plan d\'Épargne en Actions offre une exonération d\'impôt sur les plus-values après 5 ans (hors prélèvements sociaux). Plafond de versement : 150 000 €.',
        impact: 'Économie potentielle : 12,8% d\'impôt sur les plus-values',
        priority: 'high',
        category: 'fiscal'
      });
    }

    if (!hasAV) {
      suggestions.push({
        title: 'Ouvrir une Assurance-Vie',
        description: 'Après 8 ans, abattement de 4 600 € (9 200 € couple) sur les gains retirés. Avantages successoraux jusqu\'à 152 500 € par bénéficiaire.',
        impact: 'Fiscalité réduite + transmission optimisée',
        priority: 'high',
        category: 'fiscal'
      });
    }

    if (!hasPER && income > 30000) {
      suggestions.push({
        title: 'Ouvrir un PER',
        description: 'Le Plan d\'Épargne Retraite permet de déduire les versements du revenu imposable (dans la limite de 10% des revenus). Idéal si votre tranche marginale est ≥ 30%.',
        impact: `Économie d'impôt estimée : ${round2(Math.min(income * 0.1, 32909) * 0.3)} €/an (TMI 30%)`,
        priority: income > 50000 ? 'high' : 'medium',
        category: 'fiscal'
      });
    }

    if (totalInvested > 0 && !hasPEA && !hasAV) {
      suggestions.push({
        title: 'Transférer vers des enveloppes fiscales',
        description: 'Vos investissements sont sur un CTO (Compte-Titres Ordinaire). Transférer progressivement vers PEA ou Assurance-Vie pour optimiser la fiscalité.',
        impact: 'Réduction de la fiscalité sur les plus-values',
        priority: 'medium',
        category: 'fiscal'
      });
    }

    if (age < 50 && !hasPER && income > 40000) {
      suggestions.push({
        title: 'Préparer la retraite fiscalement',
        description: 'À votre âge, un PER avec versements réguliers combine préparation retraite et optimisation fiscale immédiate.',
        impact: 'Double avantage : défiscalisation + capitalisation long terme',
        priority: 'medium',
        category: 'fiscal'
      });
    }

    return suggestions;
  }

  /* ============================================================
     14. PERSONALIZED ADVICE
     ============================================================ */
  function generateAdvice(profile) {
    const advice = [];
    const bal = computeMonthlyBalance(profile);
    const ef = computeEmergencyFund(profile);
    const debt = computeDebtAnalysis(profile);
    const ratios = computeFinancialRatios(profile);
    const riskScore = computeRiskScore(profile.riskAnswers);
    const goals = computeGoalProgress(profile);
    const tax = computeTaxOptimization(profile);
    const retirement = computeRetirement(profile);

    // === URGENT ===

    // Negative balance
    if (bal.surplus < 0) {
      advice.push({
        category: 'urgent', icon: 'alert',
        title: 'Budget déficitaire',
        description: `Vos dépenses dépassent vos revenus de ${Math.abs(bal.surplus).toLocaleString('fr-FR')} €/mois. Réduisez immédiatement vos dépenses variables ou cherchez des revenus complémentaires.`,
        action: 'Auditer chaque poste de dépense et couper le superflu',
        impact: `+${Math.abs(bal.surplus).toLocaleString('fr-FR')} €/mois`
      });
    }

    // Dangerous debt ratio
    if (debt.debtToIncomeRatio > 50) {
      advice.push({
        category: 'urgent', icon: 'alert',
        title: 'Endettement critique',
        description: `Votre taux d'endettement est de ${debt.debtToIncomeRatio}% (seuil critique : 50%). Risque de surendettement.`,
        action: 'Contacter un conseiller en gestion de dette ou la Banque de France',
        impact: 'Prévention du surendettement'
      });
    } else if (debt.debtToIncomeRatio > 33) {
      advice.push({
        category: 'urgent', icon: 'alert',
        title: 'Endettement élevé',
        description: `Votre taux d'endettement est de ${debt.debtToIncomeRatio}% (recommandé : < 33%). Priorité au désendettement.`,
        action: 'Rembourser en priorité les dettes au taux le plus élevé (stratégie avalanche)',
        impact: `Économie de ${debt.interestSaved > 0 ? debt.interestSaved.toLocaleString('fr-FR') : '?'} € d'intérêts`
      });
    }

    // No emergency fund
    if (ef.monthsCovered < 1) {
      advice.push({
        category: 'urgent', icon: 'shield',
        title: 'Aucun fonds d\'urgence',
        description: `Vous n'avez que ${ef.monthsCovered.toFixed(1)} mois de dépenses en épargne de précaution. Minimum recommandé : ${ef.recommendedMonths} mois.`,
        action: `Constituer ${ef.recommended.toLocaleString('fr-FR')} € sur livret (Livret A / LDDS)`,
        impact: `Protection contre ${ef.recommendedMonths} mois d'imprévu`
      });
    }

    // === IMPORTANT ===

    // Low savings rate
    if (bal.savingsRate >= 0 && bal.savingsRate < 10 && bal.surplus >= 0) {
      advice.push({
        category: 'important', icon: 'piggy-bank',
        title: 'Taux d\'épargne insuffisant',
        description: `Vous épargnez ${bal.savingsRate.toFixed(1)}% de vos revenus. L'objectif recommandé est de 15-20%.`,
        action: 'Automatiser un virement épargne en début de mois (\"se payer en premier\")',
        impact: `Objectif : +${round2(bal.income * 0.15 - bal.surplus)} €/mois d'épargne supplémentaire`
      });
    }

    // Emergency fund insufficient but > 1 month
    if (ef.monthsCovered >= 1 && ef.monthsCovered < ef.recommendedMonths) {
      advice.push({
        category: 'important', icon: 'shield',
        title: 'Fonds d\'urgence incomplet',
        description: `Vous disposez de ${ef.monthsCovered.toFixed(1)} mois d'épargne de précaution. Objectif : ${ef.recommendedMonths} mois (${ef.recommended.toLocaleString('fr-FR')} €).`,
        action: `Compléter le fonds d'urgence : il manque ${ef.deficit.toLocaleString('fr-FR')} € (${ef.monthsToGoal === Infinity ? '∞' : ef.monthsToGoal} mois au rythme actuel)`,
        impact: 'Sécurité financière renforcée'
      });
    }

    // Retirement gap
    if (!retirement.onTrack) {
      advice.push({
        category: 'important', icon: 'clock',
        title: 'Retraite : trajectoire insuffisante',
        description: `Il vous manque ${Math.abs(retirement.surplus).toLocaleString('fr-FR')} € pour atteindre votre objectif retraite à ${retirement.retirementAge} ans.`,
        action: `Augmenter votre épargne retraite de ${retirement.savingGap.toLocaleString('fr-FR')} €/mois`,
        impact: `Capital nécessaire : ${retirement.capitalNeeded.toLocaleString('fr-FR')} €`
      });
    }

    // No diversification
    if (ratios.totalAssets > 5000) {
      const inv = profile.investments || [];
      const types = new Set(inv.map(i => i.type));
      if (types.size < 3) {
        advice.push({
          category: 'important', icon: 'trending-up',
          title: 'Diversification insuffisante',
          description: `Votre patrimoine est concentré sur ${types.size} type(s) d'actifs. La diversification réduit le risque global.`,
          action: 'Répartir sur au moins 4-5 classes d\'actifs différentes',
          impact: 'Réduction du risque de -30% à -50%'
        });
      }
    }

    // === OPTIMIZATIONS ===

    // Tax optimization suggestions
    for (const t of tax) {
      advice.push({
        category: 'optimization', icon: 'star',
        title: t.title,
        description: t.description,
        action: t.description,
        impact: t.impact
      });
    }

    // High effort rate
    if (ratios.effortRate > 40 && ratios.effortRate <= 50) {
      advice.push({
        category: 'optimization', icon: 'home',
        title: 'Charges fixes élevées',
        description: `Vos charges fixes représentent ${ratios.effortRate.toFixed(1)}% de vos revenus. Essayez de les ramener sous 40%.`,
        action: 'Renégocier votre loyer/crédit, changer d\'assurances, réduire les abonnements',
        impact: `Économie potentielle : ${round2((ratios.effortRate - 35) / 100 * bal.income)} €/mois`
      });
    }

    // Excess cash
    const cashRatio = ratios.totalAssets > 0 ? ((profile.currentSavings || 0) / ratios.totalAssets * 100) : 0;
    if (cashRatio > 40 && ratios.totalAssets > 10000) {
      advice.push({
        category: 'optimization', icon: 'trending-up',
        title: 'Excès de liquidités',
        description: `${cashRatio.toFixed(0)}% de votre patrimoine est en liquidités. L'inflation (2-3%/an) érode votre pouvoir d'achat.`,
        action: 'Investir le surplus au-delà du fonds d\'urgence sur des supports plus rémunérateurs',
        impact: `Gain potentiel : +${round2((cashRatio - 20) / 100 * ratios.totalAssets * 0.05)} €/an`
      });
    }

    // Good rating — positive reinforcement
    if (bal.savingsRate >= 20) {
      advice.push({
        category: 'optimization', icon: 'check',
        title: 'Excellent taux d\'épargne',
        description: `Bravo ! Vous épargnez ${bal.savingsRate.toFixed(1)}% de vos revenus. Vous êtes au-dessus de la moyenne française (15%).`,
        action: 'Continuez et orientez le surplus vers des placements à long terme',
        impact: 'Patrimoine en croissance'
      });
    }

    if (retirement.onTrack) {
      advice.push({
        category: 'optimization', icon: 'check',
        title: 'Retraite sur les rails',
        description: `Votre trajectoire actuelle vous mène à un capital de ${retirement.projectedCapital.toLocaleString('fr-FR')} € à ${retirement.retirementAge} ans, soit un surplus de ${retirement.surplus.toLocaleString('fr-FR')} €.`,
        action: 'Maintenir le cap ou avancer la date de retraite',
        impact: `Objectif atteint à ${retirement.retirementAge} ans`
      });
    }

    // Infeasible goals
    const infeasibleGoals = goals.filter(g => !g.feasible);
    if (infeasibleGoals.length > 0) {
      advice.push({
        category: 'important', icon: 'target',
        title: `${infeasibleGoals.length} objectif(s) difficilement atteignable(s)`,
        description: infeasibleGoals.map(g => `« ${g.name} » nécessite ${g.requiredMonthly.toLocaleString('fr-FR')} €/mois`).join('. '),
        action: 'Allonger l\'horizon, réduire le montant cible, ou augmenter l\'épargne mensuelle',
        impact: 'Réalisme des objectifs'
      });
    }

    // Sort by priority
    const order = { urgent: 0, important: 1, optimization: 2 };
    advice.sort((a, b) => order[a.category] - order[b.category]);

    return advice;
  }

  /* ============================================================
     15. FULL ANALYSIS (combines everything)
     ============================================================ */
  function runFullAnalysis(profile) {
    const riskScore = computeRiskScore(profile.riskAnswers);
    const healthScore = computeHealthScore(profile);
    const balance = computeMonthlyBalance(profile);
    const emergencyFund = computeEmergencyFund(profile);
    const debtAnalysis = computeDebtAnalysis(profile);
    const ratios = computeFinancialRatios(profile);
    const age = profile.age || 30;
    const horizon = Math.max(5, (profile.retirementAge || 65) - age);
    const targetAllocation = computePortfolioAllocation(riskScore, age, horizon);
    const currentAllocation = computeCurrentAllocation(profile);
    const rebalancing = computeRebalancing(currentAllocation, targetAllocation, currentAllocation.total);
    const projection = projectCompoundGrowth(
      currentAllocation.total,
      Math.max(0, balance.surplus),
      targetAllocation.expectedReturn,
      Math.min(horizon, 30)
    );
    const monteCarlo = runMonteCarloSimulation({
      principal: currentAllocation.total,
      monthly: Math.max(0, balance.surplus),
      annualReturn: targetAllocation.expectedReturn,
      annualVolatility: targetAllocation.expectedVolatility,
      years: Math.min(horizon, 30)
    }, 800);
    const retirement = computeRetirement(profile);
    const inflation = computeInflationImpact(balance.income * 12, 30);
    const goals = computeGoalProgress(profile);
    const taxSuggestions = computeTaxOptimization(profile);
    const advice = generateAdvice(profile);

    return {
      timestamp: new Date().toISOString(),
      riskScore, healthScore, balance, emergencyFund, debtAnalysis,
      ratios, targetAllocation, currentAllocation, rebalancing,
      projection, monteCarlo, retirement, inflation, goals,
      taxSuggestions, advice
    };
  }

  /* ---------- PUBLIC API -------------------------------------- */
  window.FinEngine = {
    computeRiskScore,
    computeHealthScore,
    computeMonthlyBalance,
    computeEmergencyFund,
    computeDebtAnalysis,
    computePortfolioAllocation,
    computeCurrentAllocation,
    computeRebalancing,
    projectCompoundGrowth,
    runMonteCarloSimulation,
    computeRetirement,
    computeInflationImpact,
    computeGoalProgress,
    computeFinancialRatios,
    computeTaxOptimization,
    generateAdvice,
    runFullAnalysis,
    ASSET_CLASSES,
    ALLOCATION_PROFILES
  };
})();
