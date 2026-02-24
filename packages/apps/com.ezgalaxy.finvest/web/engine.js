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
      // First pass: collect freed-up min payments from fully-paid debts
      for (const item of items) {
        if (item.balance <= 0.01) {
          extra += item.minPayment;
        }
      }
      // Second pass: apply interest and payments to remaining debts
      for (const item of items) {
        if (item.balance <= 0.01) continue;
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
    const order = { urgent: 0, important: 1, optimization: 2, personal: 3 };
    advice.sort((a, b) => order[a.category] - order[b.category]);

    // ====== ULTRA-PERSONALIZED ADVICE ======
    // Based on age, family situation, income level, specific investments, goals, etc.
    const personalAdvice = generatePersonalizedAdvice(profile, bal, ef, debt, ratios, riskScore, goals, retirement);
    advice.push(...personalAdvice);

    // Re-sort after adding personalized advice
    advice.sort((a, b) => order[a.category] - order[b.category]);

    return advice;
  }

  /* ============================================================
     15b. ULTRA-PERSONALIZED ADVICE ENGINE
     ============================================================ */
  function generatePersonalizedAdvice(profile, bal, ef, debt, ratios, riskScore, goals, retirement) {
    const advice = [];
    const age = profile.age || 30;
    const income = bal.income;
    const surplus = bal.surplus;
    const savingsRate = bal.savingsRate;
    const family = profile.familySituation;
    const dependents = profile.dependents || 0;
    const stability = profile.employmentStability;
    const investments = profile.investments || [];
    const totalInv = investments.reduce((s, i) => s + (i.amount || 0), 0);
    const invTypes = new Set(investments.map(i => i.type));
    const realEstate = profile.realEstate || [];
    const totalRE = realEstate.reduce((s, r) => s + (r.value || 0), 0);
    const totalAssets = ratios.totalAssets;
    const savings = profile.currentSavings || 0;
    const debts = profile.debts || [];
    const totalDebt = debts.reduce((s, d) => s + (d.remainingAmount || 0), 0);

    // ---- AGE-SPECIFIC ADVICE ----
    if (age < 25) {
      advice.push({
        category: 'personal', icon: 'user',
        title: '🎓 Conseils pour votre tranche d\'âge (< 25 ans)',
        description: `À ${age} ans, vous avez un atout majeur : le temps. Même de petits investissements réguliers peuvent devenir considérables grâce aux intérêts composés. Si vous investissez 100 €/mois à 7%/an dès maintenant, vous aurez ~${Math.round(100 * ((Math.pow(1 + 0.07/12, (65 - age) * 12) - 1) / (0.07/12))).toLocaleString('fr-FR')} € à 65 ans.`,
        action: 'Ouvrir un PEA dès que possible et mettre en place un virement automatique mensuel, même petit (50-100 €)',
        impact: `${65 - age} ans de croissance composée`
      });
      if (!invTypes.has('pea') && !invTypes.has('etf_monde')) {
        advice.push({
          category: 'personal', icon: 'trending-up',
          title: 'Premier investissement recommandé',
          description: 'À votre âge, un ETF Monde (type MSCI World) est le placement idéal : simple, diversifié, et performant sur le long terme (~7-8%/an historiquement).',
          action: 'Ouvrir un PEA en ligne (Boursorama, Fortuneo, Bourse Direct) et investir dans un ETF MSCI World (ex: CW8 Amundi)',
          impact: 'Diversification mondiale en un seul produit'
        });
      }
    } else if (age >= 25 && age < 35) {
      advice.push({
        category: 'personal', icon: 'user',
        title: '💼 Conseils pour votre tranche d\'âge (25-35 ans)',
        description: `À ${age} ans, c'est le moment d'accélérer la construction de votre patrimoine. Priorisez : 1) Fonds d'urgence, 2) Remboursement de dettes à taux élevé, 3) Investissement régulier. Votre horizon long terme vous permet de prendre des risques mesurés.`,
        action: 'Automatiser votre épargne : 50% livrets sécurisés, 30% PEA/ETF, 20% assurance-vie',
        impact: 'Construction d\'une base patrimoniale solide'
      });
    } else if (age >= 35 && age < 50) {
      advice.push({
        category: 'personal', icon: 'user',
        title: '🏠 Conseils pour votre tranche d\'âge (35-50 ans)',
        description: `À ${age} ans, privilégiez l'optimisation fiscale et la diversification. C'est souvent la période des revenus les plus élevés — profitez-en pour maximiser votre épargne. Si vous avez des enfants, pensez aussi à leur avenir financier.`,
        action: dependents > 0
          ? `Ouvrir une assurance-vie au nom de chaque enfant (${dependents} enfant(s)) pour profiter de la fiscalité avantageuse après 8 ans`
          : 'Maximiser le PEA (plafond 150 000 €) et ouvrir un PER pour l\'avantage fiscal immédiat',
        impact: 'Optimisation fiscale maximale'
      });
    } else if (age >= 50) {
      advice.push({
        category: 'personal', icon: 'user',
        title: '🎯 Conseils pour votre tranche d\'âge (50+ ans)',
        description: `À ${age} ans, commencez à sécuriser progressivement votre portefeuille. Réduisez l'exposition actions de 5% tous les 3 ans. Pensez à la transmission et aux solutions de rente.`,
        action: 'Basculer 20-30% de votre portefeuille vers des obligations et fonds euros. Consulter un notaire pour la transmission.',
        impact: `Protection du capital pour la retraite dans ${Math.max(0, (profile.retirementAge || 65) - age)} ans`
      });
    }

    // ---- FAMILY-SPECIFIC ADVICE ----
    if (dependents > 0) {
      const educationCost = dependents * 8000; // €/an estimation
      advice.push({
        category: 'personal', icon: 'home',
        title: `👨‍👩‍👧‍👦 Avec ${dependents} personne(s) à charge`,
        description: `Vos charges familiales représentent un engagement important. Budget éducation estimé : ${(educationCost * 18).toLocaleString('fr-FR')} € par enfant jusqu'à 18 ans. Pensez à anticiper ces dépenses.`,
        action: `Ouvrir un contrat d'assurance-vie par enfant avec versements programmés de ${Math.round(educationCost / 12).toLocaleString('fr-FR')} €/mois`,
        impact: `Constitution de ${(educationCost * 8).toLocaleString('fr-FR')} € par enfant en 8 ans`
      });
    }

    if (family === 'married' || family === 'couple') {
      advice.push({
        category: 'personal', icon: 'shield',
        title: '💑 Conseil en couple',
        description: 'En couple, optimisez votre stratégie fiscale conjointement. Répartissez les investissements pour maximiser les plafonds (2 PEA = 300 000 €, etc.). Pensez aussi à la prévoyance mutuelle.',
        action: 'Vérifier que chacun a son propre PEA, sa propre assurance-vie, et une clause bénéficiaire à jour',
        impact: 'Doublement des enveloppes fiscales'
      });
    }

    if (family === 'single' && age >= 30 && dependents === 0) {
      advice.push({
        category: 'personal', icon: 'star',
        title: '🚀 Avantage célibataire sans charges',
        description: `Sans personnes à charge, vous avez une capacité d'épargne potentiellement élevée. Objectif : épargner ${savingsRate >= 30 ? 'au moins 30%' : '25-35%'} de vos revenus pour accélérer votre indépendance financière.`,
        action: 'Investir agressivement (80% actions / 20% obligations) grâce à votre liberté financière',
        impact: 'Accélération vers l\'indépendance financière'
      });
    }

    // ---- INCOME-LEVEL SPECIFIC ----
    if (income > 0 && income < 2000) {
      advice.push({
        category: 'personal', icon: 'piggy-bank',
        title: '💰 Optimisation petit budget',
        description: `Avec ${income.toLocaleString('fr-FR')} €/mois de revenus, chaque euro compte. Privilégiez les placements sans frais (ETF en PEA) et les livrets réglementés (Livret A : 3%, LDDS : 3%). Évitez les produits bancaires avec frais cachés.`,
        action: 'Remplir d\'abord le Livret A (plafond 22 950 €) et le LDDS (plafond 12 000 €) avant d\'investir en bourse',
        impact: `${(22950 * 0.03).toLocaleString('fr-FR')} €/an d'intérêts garantis et défiscalisés`
      });
    } else if (income >= 5000) {
      advice.push({
        category: 'personal', icon: 'trending-up',
        title: '🏆 Stratégie hauts revenus',
        description: `Avec ${income.toLocaleString('fr-FR')} €/mois, vous pouvez construire un patrimoine significatif rapidement. Diversifiez entre PEA, assurance-vie luxembourgeoise, PER, et potentiellement SCPI pour les revenus passifs.`,
        action: 'Consulter un conseiller en gestion de patrimoine indépendant (CGPI) pour une stratégie sur-mesure',
        impact: `Potentiel d'épargne de ${Math.round(income * 0.3).toLocaleString('fr-FR')} €/mois`
      });
    }

    // ---- INVESTMENT-TYPE SPECIFIC ----
    if (invTypes.has('crypto') && totalInv > 0) {
      const cryptoAmt = investments.filter(i => i.type === 'crypto').reduce((s, i) => s + (i.amount || 0), 0);
      const cryptoPct = (cryptoAmt / totalInv * 100);
      if (cryptoPct > 15) {
        advice.push({
          category: 'important', icon: 'alert',
          title: `⚠️ Exposition crypto élevée (${cryptoPct.toFixed(0)}%)`,
          description: `Votre allocation en crypto-monnaies représente ${cryptoPct.toFixed(1)}% de votre portefeuille. Les experts recommandent de limiter cette classe d'actifs à 5-10% maximum en raison de sa volatilité extrême.`,
          action: `Réduire votre exposition crypto de ${(cryptoAmt - totalInv * 0.10).toLocaleString('fr-FR')} € et réallouer vers des ETF diversifiés`,
          impact: 'Réduction significative du risque de perte'
        });
      }
    }

    if (invTypes.has('scpi')) {
      advice.push({
        category: 'personal', icon: 'home',
        title: '🏢 Optimisation SCPI',
        description: 'Les SCPI offrent des revenus réguliers (4-5%/an) mais manquent de liquidité. En PER ou assurance-vie, la fiscalité est optimisée. Attention aux frais d\'entrée (8-12%).',
        action: 'Privilégiez les SCPI en assurance-vie pour réduire la fiscalité des revenus fonciers',
        impact: 'Économie d\'impôt de 30-40% sur les revenus SCPI'
      });
    }

    if (!invTypes.has('per') && income >= 3000 && age >= 30) {
      const tmi = income * 12 > 78570 ? 41 : income * 12 > 28797 ? 30 : 11;
      advice.push({
        category: 'personal', icon: 'percent',
        title: '📦 PER : économie d\'impôt immédiate',
        description: `Votre TMI estimée est de ${tmi}%. Un versement PER de 5 000 € vous ferait économiser ${(5000 * tmi / 100).toLocaleString('fr-FR')} € d'impôts immédiats. Le PER est idéal pour préparer la retraite avec un avantage fiscal.`,
        action: `Ouvrir un PER en ligne et programmer des versements mensuels de ${Math.round(5000 / 12)} €`,
        impact: `${(5000 * tmi / 100).toLocaleString('fr-FR')} € d'économie fiscale/an`
      });
    }

    // ---- STABILITY-SPECIFIC ----
    if (stability === 'unstable' || stability === 'no_income') {
      advice.push({
        category: 'important', icon: 'shield',
        title: '🛡️ Situation professionnelle précaire',
        description: `En situation ${stability === 'no_income' ? 'sans emploi' : 'instable'}, votre priorité absolue est le fonds d'urgence (${ef.recommendedMonths} mois de dépenses minimum). Évitez tout placement illiquide et gardez un maximum de trésorerie disponible.`,
        action: 'Constituer un fonds d\'urgence de 6-9 mois avant tout investissement. Rester en produits liquides (Livret A, LDDS)',
        impact: 'Protection contre l\'imprévu professionnel'
      });
    }

    // ---- REAL ESTATE ----
    if (totalRE === 0 && age >= 28 && income >= 2500) {
      advice.push({
        category: 'personal', icon: 'home',
        title: '🏠 Achat immobilier à considérer',
        description: `Avec ${income.toLocaleString('fr-FR')} €/mois à ${age} ans, vous pourriez emprunter environ ${Math.round(income * 0.33 * 12 * 20 * 0.85).toLocaleString('fr-FR')} € sur 20 ans. L'immobilier est souvent le premier levier de constitution de patrimoine en France.`,
        action: 'Simuler votre capacité d\'emprunt et comparer le coût loyer vs achat dans votre ville',
        impact: 'Capitalisation patrimoniale vs loyer à fonds perdus'
      });
    }

    if (totalRE > 0 && totalInv === 0) {
      advice.push({
        category: 'personal', icon: 'trending-up',
        title: '📊 Diversifiez au-delà de l\'immobilier',
        description: `Votre patrimoine est 100% immobilier (${totalRE.toLocaleString('fr-FR')} €). Cette concentration est risquée. Commencez à investir en financier (PEA, assurance-vie) pour diversifier.`,
        action: 'Épargner 50% du surplus mensuel en PEA et 50% en assurance-vie fonds euros',
        impact: 'Diversification et liquidité accrues'
      });
    }

    // ---- SURPLUS ALLOCATION ADVICE ----
    if (surplus > 300) {
      const peaPct = age < 40 ? 60 : age < 55 ? 40 : 20;
      const avPct = age < 40 ? 20 : age < 55 ? 30 : 40;
      const livretPct = 100 - peaPct - avPct;
      advice.push({
        category: 'personal', icon: 'pie-chart',
        title: `💎 Répartition optimale de votre surplus (${surplus.toLocaleString('fr-FR')} €/mois)`,
        description: `Voici la répartition recommandée pour votre profil (${age} ans, risque ${riskScore.toFixed(0)}/10) :
• PEA/ETF : ${peaPct}% = ${Math.round(surplus * peaPct / 100).toLocaleString('fr-FR')} €/mois
• Assurance-vie : ${avPct}% = ${Math.round(surplus * avPct / 100).toLocaleString('fr-FR')} €/mois
• Livrets sécurisés : ${livretPct}% = ${Math.round(surplus * livretPct / 100).toLocaleString('fr-FR')} €/mois`,
        action: `Mettre en place 3 virements automatiques le 1er de chaque mois :: PEA ${Math.round(surplus * peaPct / 100)} € + AV ${Math.round(surplus * avPct / 100)} € + Livret ${Math.round(surplus * livretPct / 100)} €`,
        impact: `Patrimoine estimé dans 10 ans : ${Math.round(surplus * 12 * 10 * 1.35).toLocaleString('fr-FR')} €`
      });
    }

    // ---- RISK PROFILE MISMATCH ----
    if (riskScore >= 7 && age >= 55) {
      advice.push({
        category: 'important', icon: 'alert',
        title: '⚠️ Profil de risque vs horizon',
        description: `Votre profil de risque est dynamique (${riskScore.toFixed(1)}/10) mais votre horizon avant la retraite est court (${Math.max(0, (profile.retirementAge || 65) - age)} ans). Un krach de -40% laisserait peu de temps pour récupérer.`,
        action: 'Réduire progressivement la part actions à 40-50% maximum et augmenter les obligations/fonds euros',
        impact: 'Protection du capital accumulé'
      });
    }

    if (riskScore <= 3 && age < 35) {
      advice.push({
        category: 'personal', icon: 'trending-up',
        title: '📈 Vous pouvez prendre plus de risques',
        description: `Votre profil de risque est très prudent (${riskScore.toFixed(1)}/10) mais à ${age} ans, vous avez ${(profile.retirementAge || 65) - age} ans devant vous. Historiquement, un portefeuille 80% actions a toujours été positif sur 15+ ans, même en incluant toutes les crises.`,
        action: 'Augmenter progressivement votre exposition actions de 10% par trimestre jusqu\'à atteindre 60-70%',
        impact: 'Rendement potentiel +3-4%/an par rapport à un portefeuille prudent'
      });
    }

    // ---- GOAL-SPECIFIC PERSONALIZED ----
    const userGoals = profile.goals || [];
    for (const g of userGoals) {
      if (g.name && g.name.toLowerCase().includes('immobilier') && g.targetAmount > 0) {
        const monthsLeft = (g.horizonYears || 5) * 12;
        const monthlyNeeded = g.targetAmount / monthsLeft;
        advice.push({
          category: 'personal', icon: 'home',
          title: `🏠 Stratégie pour "${g.name}"`,
          description: `Pour atteindre ${g.targetAmount.toLocaleString('fr-FR')} € en ${g.horizonYears} ans, vous devez épargner ${Math.round(monthlyNeeded).toLocaleString('fr-FR')} €/mois sur un support sécurisé (apport < 5 ans = zéro risque). Utilisez un Livret A + LDDS, puis un fonds euros si les plafonds sont atteints.`,
          action: 'NE PAS investir en bourse un apport immobilier à moins de 5 ans — risque de perte en capital',
          impact: `${Math.round(monthlyNeeded).toLocaleString('fr-FR')} €/mois pendant ${g.horizonYears} ans`
        });
      }
      if (g.name && g.name.toLowerCase().includes('retraite') && g.priority === 'high') {
        advice.push({
          category: 'personal', icon: 'clock',
          title: `⏰ Accélérer "${g.name}"`,
          description: `Objectif retraite prioritaire : ${g.targetAmount.toLocaleString('fr-FR')} € en ${g.horizonYears} ans. Combinez PER (avantage fiscal à l'entrée) + PEA (pas d'impôt à la sortie après 5 ans) pour maximiser le rendement net.`,
          action: 'Répartir : 40% PER (défiscalisation) + 40% PEA (ETF Monde) + 20% fonds euros (sécurité)',
          impact: 'Double optimisation fiscale entrée/sortie'
        });
      }
    }

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

  /* ============================================================
     12. AI PROMPT GENERATION
     ============================================================ */
  function generateAIPrompts(profile, analysis) {
    if (!profile || !analysis) return [];

    const p = profile;
    const a = analysis;
    const bal = a.balance;
    const riskLabel = a.riskScore <= 3 ? 'conservateur' : a.riskScore <= 5 ? 'modéré' : a.riskScore <= 7 ? 'dynamique' : 'agressif';
    const familyLabel = { single: 'célibataire', couple: 'en couple', married: 'marié(e)', divorced: 'divorcé(e)', widowed: 'veuf/ve' }[p.familySituation] || p.familySituation;
    const stabilityLabel = { very_stable: 'très stable (fonctionnaire/CDI longue durée)', stable: 'stable (CDI)', moderate: 'modérée (CDD/intérim)', unstable: 'instable (freelance/création)', no_income: 'sans emploi' }[p.employmentStability] || p.employmentStability;
    const fmtC = v => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);
    const totalInv = (p.investments || []).reduce((s, i) => s + (i.amount || 0), 0);
    const totalRE = (p.realEstate || []).reduce((s, r) => s + (r.value || 0), 0);
    const totalDebt = (p.debts || []).reduce((s, d) => s + (d.remainingAmount || 0), 0);
    const invDetail = (p.investments || []).filter(i => i.amount > 0).map(i => `${i.type}: ${fmtC(i.amount)}`).join(', ') || 'aucun';

    // Context block used in all prompts
    const CTX = `Mon profil financier :
- ${p.age} ans, ${familyLabel}, ${p.dependents} personne(s) à charge
- Revenus mensuels nets : ${fmtC(bal.income)} (stabilité : ${stabilityLabel})
- Dépenses mensuelles : ${fmtC(bal.expenses)} (taux d'épargne : ${bal.savingsRate.toFixed(1)}%)
- Capacité d'épargne mensuelle : ${fmtC(bal.surplus)}
- Épargne de précaution : ${fmtC(p.currentSavings)}
- Placements : ${invDetail} (total : ${fmtC(totalInv)})
- Immobilier : ${totalRE > 0 ? fmtC(totalRE) : 'aucun'}
- Dettes : ${totalDebt > 0 ? fmtC(totalDebt) + ' (' + p.debts.length + ' crédit(s))' : 'aucune'}
- Patrimoine net estimé : ${fmtC(a.ratios.netWorth)}
- Score de risque : ${a.riskScore.toFixed(1)}/10 (profil ${riskLabel})
- Score de santé financière : ${a.healthScore.total}/100`;

    const goalsText = (p.goals || []).length
      ? (p.goals || []).map(g => `${g.name} : ${fmtC(g.targetAmount)} en ${g.horizonYears} ans (priorité ${g.priority})`).join('\n  ')
      : 'aucun objectif défini';

    const retText = `Retraite souhaitée à ${p.retirementAge} ans, revenu cible : ${p.retirementIncome > 0 ? fmtC(p.retirementIncome) + '/mois' : '70% du revenu actuel'}`;

    const allPrompts = [
      // ===== CATEGORY: Analyse globale =====
      {
        id: 'global-analysis',
        category: 'analyse',
        emoji: '🔍',
        title: 'Analyse financière globale',
        target: 'ChatGPT, Claude, Gemini',
        badges: ['analyse', 'conseil'],
        badgeColors: ['', 'blue'],
        prompt: `Tu es un conseiller financier personnel expert. Analyse mon profil financier complet et donne-moi un diagnostic détaillé avec des recommandations concrètes et chiffrées.

${CTX}

Mes objectifs :
  ${goalsText}
${retText}

Fais une analyse structurée en 5 parties :
1. 📊 Diagnostic global (points forts / points faibles)
2. 💰 Analyse budget & train de vie (est-ce optimisé ?)
3. 📈 Analyse des placements (diversification, rendement, risque)
4. 🎯 Faisabilité des objectifs (avec estimation chiffrée)
5. ✅ Plan d'action concret par ordre de priorité (avec montants et calendrier)

Sois précis, donne des montants, des pourcentages, et des recommandations actionnables.`
      },

      {
        id: 'second-opinion',
        category: 'analyse',
        emoji: '🧑‍⚖️',
        title: 'Deuxième avis — Critique constructive',
        target: 'ChatGPT, Claude',
        badges: ['analyse', 'critique'],
        badgeColors: ['', 'orange'],
        prompt: `Tu es un analyste financier indépendant très critique. Mon outil d'analyse me donne les résultats suivants. Je veux ton avis objectif : est-ce que ces résultats te semblent cohérents ? Qu'est-ce que l'outil a pu manquer ?

${CTX}

Résultats de l'outil :
- Score santé financière : ${a.healthScore.total}/100
- Allocation recommandée : profil ${riskLabel}
- Projection retraite : ${a.retirement.onTrack ? 'en bonne voie' : 'déficitaire'} (capital projeté : ${fmtC(a.retirement.projectedCapital)} vs nécessaire : ${fmtC(a.retirement.capitalNeeded)})
- Fonds d'urgence : ${a.emergencyFund.monthsCovered.toFixed(1)} mois couverts

En tant que regard extérieur :
1. Ces résultats sont-ils réalistes ?
2. Quels biais ou angles morts vois-tu ?
3. Que recommanderais-tu de différent ?
4. Quels risques ne sont pas pris en compte ?`
      },

      // ===== CATEGORY: Investissement =====
      {
        id: 'portfolio-optimization',
        category: 'investissement',
        emoji: '📊',
        title: 'Optimisation de portefeuille',
        target: 'ChatGPT, Claude, Gemini',
        badges: ['investissement', 'allocation'],
        badgeColors: ['purple', 'blue'],
        prompt: `Tu es un expert en gestion de portefeuille et allocation d'actifs. Aide-moi à optimiser mes placements.

${CTX}

Détail de mes placements actuels : ${invDetail}

Mon profil de risque est ${riskLabel} (${a.riskScore.toFixed(1)}/10).
Mon horizon d'investissement principal est de ${a.retirement.yearsToRetirement} ans (jusqu'à la retraite).

Questions :
1. Mon allocation actuelle est-elle adaptée à mon profil de risque ?
2. Quels ETF/fonds spécifiques recommandes-tu ? (avec les codes ISIN si possible)
3. Comment devrais-je répartir mes ${fmtC(bal.surplus)}/mois d'épargne entre les différents supports ?
4. Dois-je rééquilibrer ? Si oui, quel plan de transition ?
5. Quels sont les pièges à éviter avec mon profil ?

Donne des recommandations précises avec des noms de produits accessibles en France.`
      },

      {
        id: 'etf-selection',
        category: 'investissement',
        emoji: '📈',
        title: 'Sélection d\'ETF personnalisée',
        target: 'ChatGPT, Claude, Perplexity',
        badges: ['investissement', 'ETF'],
        badgeColors: ['purple', ''],
        prompt: `Tu es un spécialiste des ETF accessibles sur le marché français (PEA, CTO, Assurance-Vie).

${CTX}

Je cherche à construire un portefeuille d'ETF adapté à mon profil ${riskLabel} avec un horizon de ${a.retirement.yearsToRetirement} ans.
Budget mensuel disponible pour investir : ${fmtC(bal.surplus)}.

Propose-moi :
1. Un portefeuille "cœur" de 3-5 ETF avec répartition en % (éligibles PEA si possible)
2. Pour chaque ETF : nom exact, code ISIN, TER (frais), encours, indice suivi
3. Un portefeuille "satellite" optionnel pour booster la performance (2-3 ETF thématiques)
4. La stratégie de versement (DCA mensuel, trimestriel ?)
5. Les critères de rééquilibrage (quand et comment)

Privilégie les ETF à réplication physique et à faible coût (TER < 0.30%).`
      },

      {
        id: 'crypto-strategy',
        category: 'investissement',
        emoji: '₿',
        title: 'Stratégie crypto adaptée',
        target: 'ChatGPT, Claude, Gemini',
        badges: ['investissement', 'crypto'],
        badgeColors: ['purple', 'orange'],
        prompt: `Tu es un expert en crypto-actifs et en gestion de portefeuille diversifié.

${CTX}

Mon profil de risque est ${riskLabel} (${a.riskScore.toFixed(1)}/10).
Mon patrimoine financier total est de ${fmtC(a.ratios.netWorth)}.

Questions :
1. Quelle part de mon patrimoine devrais-je allouer aux crypto-actifs maximum ? (en % et en montant)
2. Quelles cryptos recommandes-tu pour mon profil ? (top 3-5 avec répartition)
3. Quelle stratégie d'entrée ? (DCA, lump sum, attente de correction ?)
4. Comment sécuriser mes cryptos ? (cold wallet, diversification des exchanges)
5. Quelles erreurs classiques dois-je absolument éviter ?
6. Quelle fiscalité en France pour les plus-values crypto ?

Sois réaliste sur les risques et ne survends pas le marché.`
      },

      // ===== CATEGORY: Fiscalité =====
      {
        id: 'tax-optimization',
        category: 'fiscalite',
        emoji: '🧾',
        title: 'Optimisation fiscale complète',
        target: 'ChatGPT, Claude',
        badges: ['fiscalité', 'France'],
        badgeColors: ['orange', 'blue'],
        prompt: `Tu es un fiscaliste expert du droit français. Aide-moi à optimiser ma situation fiscale.

${CTX}

Mes enveloppes de placement actuelles : ${invDetail}
${retText}

Analyse et recommande :
1. 🏦 Quelles enveloppes fiscales utiliser en priorité ? (PEA, AV, PER, CTO — dans quel ordre et pour quels montants ?)
2. 💶 Estimation de mon TMI (Tranche Marginale d'Imposition) probable
3. 📉 Stratégies de réduction d'impôts adaptées à mon profil (investissement Pinel, FCPI, dons…)
4. 🔄 Comment optimiser les arbitrages entre enveloppes ?
5. 📅 Calendrier fiscal annuel : que faire et quand ?
6. ⚠️ Erreurs fiscales courantes à éviter

Donne des montants et des exemples concrets basés sur ma situation.`
      },

      // ===== CATEGORY: Immobilier =====
      {
        id: 'real-estate',
        category: 'immobilier',
        emoji: '🏠',
        title: 'Stratégie immobilière',
        target: 'ChatGPT, Claude, Gemini',
        badges: ['immobilier', 'investissement'],
        badgeColors: ['pink', 'purple'],
        prompt: `Tu es un expert en investissement immobilier en France.

${CTX}

Immobilier actuel : ${totalRE > 0 ? (p.realEstate || []).map(r => `${r.name}: ${fmtC(r.value)}`).join(', ') : 'aucun bien'}
Dettes immobilières : ${(p.debts || []).filter(d => d.name?.toLowerCase().includes('immo')).length > 0 ? 'oui' : 'non spécifié'}

En tenant compte de ma capacité d'épargne de ${fmtC(bal.surplus)}/mois et mon patrimoine :
1. Ai-je intérêt à investir dans l'immobilier ? (locatif / RP / SCPI ?)
2. Quelle est ma capacité d'emprunt estimée ?
3. Quel type d'investissement immobilier correspond le mieux à mon profil ${riskLabel} ?
4. SCPI vs immobilier en direct : avantages/inconvénients pour mon cas
5. Si SCPI : lesquelles recommandes-tu ? (avec rendements et critères)
6. Timing : est-ce le bon moment par rapport au marché et à ma situation ?`
      },

      // ===== CATEGORY: Retraite =====
      {
        id: 'retirement-plan',
        category: 'retraite',
        emoji: '🏖️',
        title: 'Plan retraite détaillé',
        target: 'ChatGPT, Claude',
        badges: ['retraite', 'planification'],
        badgeColors: ['blue', ''],
        prompt: `Tu es un spécialiste de la planification retraite en France.

${CTX}

${retText}
Années avant la retraite : ${a.retirement.yearsToRetirement}
Capital projeté à la retraite : ${fmtC(a.retirement.projectedCapital)}
Capital nécessaire (règle des 4%) : ${fmtC(a.retirement.capitalNeeded)}
Statut actuel : ${a.retirement.onTrack ? 'en bonne voie' : 'déficitaire de ' + fmtC(a.retirement.savingGap) + '/mois'}

Construis-moi un plan retraite complet :
1. 📊 Estimation de ma pension de retraite légale (régime général + complémentaire)
2. 💰 Combien me manquera-t-il par mois ? Quel complément privé constituer ?
3. 🏦 Répartition optimale PER / PEA / AV / Immobilier pour la retraite
4. 📈 Stratégie d'investissement phase d'accumulation (maintenant → retraite)
5. 📉 Stratégie de décumulation (à la retraite : comment tirer un revenu)
6. ⚡ Plan B : si je veux prendre ma retraite 5 ans plus tôt, que dois-je changer ?

Chiffre tout avec des montants mensuels concrets.`
      },

      // ===== CATEGORY: Dettes =====
      {
        id: 'debt-strategy',
        category: 'dettes',
        emoji: '⚡',
        title: 'Stratégie optimale de remboursement',
        target: 'ChatGPT, Claude',
        badges: ['dettes', 'stratégie'],
        badgeColors: ['orange', ''],
        prompt: `Tu es un expert en gestion de dettes et restructuration financière.

${CTX}

Détail de mes dettes :
${(p.debts || []).length > 0 ? (p.debts || []).map(d => `- ${d.name || 'Crédit'} : ${fmtC(d.remainingAmount)} restant, ${fmtC(d.monthlyPayment)}/mois, taux ${d.rate}%, ${d.remainingMonths} mois restants`).join('\n') : '(aucune dette)'}

Ma capacité d'épargne après dettes : ${fmtC(bal.surplus)}/mois

Recommandations demandées :
1. Ordre optimal de remboursement (snowball vs avalanche vs une autre stratégie ?)
2. Dois-je essayer de renégocier certains crédits ? Quels arguments utiliser ?
3. Regroupement de crédits : bonne ou mauvaise idée dans mon cas ?
4. Combien allouer au remboursement anticipé vs investissement ?
5. Calendrier de remboursement optimisé avec montants
6. Une fois libre de dettes, comment réallouer les mensualités ?`
      },

      // ===== CATEGORY: Budget =====
      {
        id: 'budget-coach',
        category: 'budget',
        emoji: '💡',
        title: 'Coaching budget & épargne',
        target: 'ChatGPT, Claude, Gemini',
        badges: ['budget', 'coaching'],
        badgeColors: ['', 'blue'],
        prompt: `Tu es un coach financier bienveillant mais exigeant. Aide-moi à optimiser mon budget pour maximiser mon épargne.

${CTX}

Répartition actuelle :
- Charges fixes (loyer/crédit) : ${fmtC(p.fixedExpenses)}
- Dépenses variables : ${fmtC(p.variableExpenses)}
- Remboursements dettes : ${fmtC(a.debtAnalysis.totalMonthlyPayments)}
- Reste (épargne) : ${fmtC(bal.surplus)}

Mon taux d'épargne est de ${bal.savingsRate.toFixed(1)}%.

Aide-moi à :
1. 🔍 Identifier où je peux économiser (détaille catégorie par catégorie)
2. 💪 Passer à un taux d'épargne de ${Math.min(bal.savingsRate + 10, 40).toFixed(0)}% — est-ce réaliste ?
3. 🏗️ Mettre en place la méthode 50/30/20 adaptée à ma situation
4. 📱 Outils/apps que tu recommandes pour le suivi budget
5. 🎯 Objectif épargne réaliste pour les 12 prochains mois (montant total)
6. 💡 3 quick wins pour économiser dès ce mois-ci`
      },

      // ===== CATEGORY: Urgence =====
      {
        id: 'emergency-plan',
        category: 'urgence',
        emoji: '🛡️',
        title: 'Plan d\'urgence financière',
        target: 'ChatGPT, Claude',
        badges: ['urgence', 'sécurité'],
        badgeColors: ['orange', ''],
        prompt: `Tu es un planificateur financier spécialisé dans la gestion des risques personnels.

${CTX}

Mon fonds d'urgence actuel couvre ${a.emergencyFund.monthsCovered.toFixed(1)} mois de dépenses.
Le montant recommandé est ${fmtC(a.emergencyFund.recommended)}.

Construis-moi un plan de sécurité financière complet :
1. 🛡️ Mon fonds d'urgence est-il suffisant ? Plan pour atteindre le montant idéal
2. 🏥 Assurances à vérifier/souscrire (maladie, prévoyance, RC, habitation…)
3. 📋 Scénarios de crise : perte d'emploi, arrêt maladie, divorce — suis-je protégé ?
4. 💼 Plan d'action si je perds mon emploi demain (étapes + délais)
5. 📄 Documents financiers importants à mettre en ordre
6. 👥 Protection des proches : quelle assurance-vie, testament, mandat ?

Sois concret avec des montants et des actions datées.`
      },

      // ===== CATEGORY: Éducation =====
      {
        id: 'learn-investing',
        category: 'education',
        emoji: '📚',
        title: 'Plan d\'apprentissage investissement',
        target: 'ChatGPT, Claude, Gemini',
        badges: ['éducation', 'investissement'],
        badgeColors: ['blue', 'purple'],
        prompt: `Tu es un formateur en éducation financière qui adapte son contenu au niveau de l'apprenant.

${CTX}

Mon profil de risque est ${riskLabel} et j'ai un patrimoine de ${fmtC(a.ratios.netWorth)}.

Crée-moi un plan d'apprentissage personnalisé pour devenir autonome en gestion de patrimoine :
1. 📊 Mon niveau actuel estimé (débutant/intermédiaire/avancé) basé sur mon profil
2. 📚 Top 5 livres à lire dans l'ordre (finance personnelle, investissement)
3. 🎓 Concepts clés à maîtriser en priorité (liste ordonnée)
4. 📺 Chaînes YouTube / podcasts français recommandés
5. 🛠️ Exercices pratiques à faire avec mon propre argent (petits montants)
6. 📅 Programme sur 3 mois : semaine par semaine, que dois-je apprendre ?

Adapte le contenu au contexte français (fiscalité, produits disponibles).`
      },

      {
        id: 'market-analysis',
        category: 'education',
        emoji: '🌍',
        title: 'Analyse macro-économique pour mon profil',
        target: 'ChatGPT, Gemini, Perplexity',
        badges: ['macro', 'marchés'],
        badgeColors: ['blue', 'purple'],
        prompt: `Tu es un économiste qui vulgarise l'actualité macro-économique et son impact sur les investisseurs particuliers.

${CTX}

Mon allocation actuelle : ${invDetail}
Profil : ${riskLabel}

En tenant compte du contexte économique actuel :
1. 🌍 Quelles sont les grandes tendances macro qui m'impactent ? (inflation, taux, géopolitique)
2. 📈 Quels marchés/secteurs favoriser dans les 12 prochains mois ?
3. ⚠️ Quels risques surveiller avec mon allocation actuelle ?
4. 🔄 Dois-je ajuster ma stratégie au vu du contexte ?
5. 💶 L'euro vs le dollar : impact sur mes placements ?
6. 🔮 Scénarios à 1 an : optimiste, central, pessimiste — comment me positionner pour chacun ?

Distingue bien les faits des opinions.`
      },

      // ===== CATEGORY: Situation de vie =====
      {
        id: 'life-event',
        category: 'situations',
        emoji: '🔄',
        title: 'Adaptation à un changement de vie',
        target: 'ChatGPT, Claude',
        badges: ['vie', 'adaptation'],
        badgeColors: ['pink', ''],
        prompt: `Tu es un conseiller en gestion de patrimoine spécialisé dans l'accompagnement des transitions de vie.

${CTX}

Pour chacun de ces scénarios de vie possibles, explique comment je devrais adapter ma stratégie financière :

1. 💍 Mariage / PACS — Impact fiscal et patrimonial, régime matrimonial recommandé
2. 👶 Naissance d'un enfant — Combien prévoir ? Quels placements pour sa future éducation ?
3. 🏠 Achat de résidence principale — Capacité d'emprunt, apport optimal, impact sur mes investissements
4. 💼 Changement d'emploi (hausse de salaire +30%) — Comment réallouer le surplus ?
5. 🚀 Création d'entreprise — Combien de trésorerie garder ? Quels risques couvrir ?
6. 📉 Récession / perte d'emploi — Plan de survie financière sur 12 mois

Pour chaque scénario, donne les 3 actions prioritaires.`
      },

      {
        id: 'negotiate-salary',
        category: 'situations',
        emoji: '💼',
        title: 'Négociation salariale chiffrée',
        target: 'ChatGPT, Claude',
        badges: ['négociation', 'carrière'],
        badgeColors: ['', 'pink'],
        prompt: `Tu es un coach en négociation salariale.

${CTX}

Avec un salaire net de ${fmtC(p.monthlyNetIncome)}/mois et une stabilité ${stabilityLabel} :

1. 💰 Quelle augmentation est réaliste à demander ? (% et montant)
2. 📊 Comment argumenter avec des données de marché ?
3. 🎯 Impact concret d'une augmentation de 10% sur mon patrimoine dans 10 ans (calcule-le)
4. 📋 Avantages en nature à négocier en plus du salaire (lesquels valent le plus ?)
5. 📝 Script de négociation en 5 étapes
6. ⏰ Meilleur timing pour négocier dans l'année

Donne des conseils très concrets et des phrases à utiliser.`
      }
    ];

    // Filter out irrelevant prompts
    const filtered = allPrompts.filter(prompt => {
      // If no debts, remove debt strategy
      if (prompt.id === 'debt-strategy' && totalDebt === 0) return false;
      return true;
    });

    return filtered;
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
    generateAIPrompts,
    runFullAnalysis,
    ASSET_CLASSES,
    ALLOCATION_PROFILES
  };
})();
