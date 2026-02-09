/* ================================================================
   FinVest — engine-extra.js  (Extended Financial Engines)
   Additional calculators: FIRE, credit, dividends, what-if,
   ESG, stress-test, compound interest, radar, benchmarks, etc.
   Exposes: window.FinExtra
   ================================================================ */
(() => {
  'use strict';

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const round2 = v => Math.round(v * 100) / 100;
  const sum = arr => arr.reduce((a, b) => a + b, 0);

  /* ============================================================
     1. FIRE — Financial Independence Retire Early
     ============================================================ */
  function computeFIRE(profile, settings = {}) {
    const bal = FinEngine.computeMonthlyBalance(profile);
    const annualExpenses = bal.expenses * 12;
    const annualIncome = bal.income * 12;
    const annualSavings = bal.surplus * 12;
    const savingsRate = annualIncome > 0 ? annualSavings / annualIncome : 0;
    const investedAssets = sum((profile.investments || []).map(i => i.amount || 0));
    const totalNetWorth = investedAssets + (profile.currentSavings || 0) +
      sum((profile.realEstate || []).map(r => (r.value || 0) - (r.remainingMortgage || 0)));

    const withdrawalRate = (settings.withdrawalRate || 4) / 100;
    const returnRate = (settings.expectedReturn || 7) / 100;
    const inflation = (settings.inflationRate || 2.5) / 100;
    const realReturn = returnRate - inflation;

    // FIRE number = annual expenses / withdrawal rate
    const fireNumber = withdrawalRate > 0 ? annualExpenses / withdrawalRate : annualExpenses * 25;
    const coastFireNumber = fireNumber / Math.pow(1 + realReturn, Math.max(0, 65 - (profile.age || 30)));
    const baristaFireNumber = fireNumber * 0.5;
    const leanFireNumber = (annualExpenses * 0.7) / withdrawalRate;
    const fatFireNumber = (annualExpenses * 1.5) / withdrawalRate;

    // Years to FIRE
    let yearsToFire = 0;
    let accumulated = investedAssets;
    if (annualSavings > 0 && realReturn > 0) {
      // FV = PMT * ((1+r)^n - 1)/r + PV*(1+r)^n
      // Solve for n iteratively
      for (let y = 0; y < 100; y++) {
        if (accumulated >= fireNumber) break;
        accumulated = accumulated * (1 + realReturn) + annualSavings;
        yearsToFire++;
      }
    } else if (annualSavings > 0) {
      yearsToFire = Math.ceil((fireNumber - investedAssets) / annualSavings);
    } else {
      yearsToFire = 999;
    }

    const fireAge = (profile.age || 30) + yearsToFire;
    const fireDate = new Date();
    fireDate.setFullYear(fireDate.getFullYear() + yearsToFire);

    // Journey projection year by year
    const journey = [];
    let bal2 = investedAssets;
    for (let y = 0; y <= Math.min(yearsToFire + 5, 60); y++) {
      journey.push({
        year: y,
        age: (profile.age || 30) + y,
        portfolio: round2(bal2),
        fireTarget: round2(fireNumber),
        progress: round2(Math.min(100, (bal2 / fireNumber) * 100))
      });
      bal2 = bal2 * (1 + realReturn) + annualSavings;
    }

    return {
      fireNumber: round2(fireNumber),
      leanFireNumber: round2(leanFireNumber),
      fatFireNumber: round2(fatFireNumber),
      coastFireNumber: round2(coastFireNumber),
      baristaFireNumber: round2(baristaFireNumber),
      currentNetWorth: round2(totalNetWorth),
      investedAssets: round2(investedAssets),
      progress: round2(Math.min(100, (investedAssets / fireNumber) * 100)),
      yearsToFire,
      fireAge,
      fireDate: fireDate.toISOString(),
      savingsRate: round2(savingsRate * 100),
      annualExpenses: round2(annualExpenses),
      annualSavings: round2(annualSavings),
      monthlyPassiveIncome: round2(investedAssets * withdrawalRate / 12),
      journey
    };
  }

  /* ============================================================
     2. CREDIT SIMULATOR — Mortgage amortization
     ============================================================ */
  function simulateCredit(params) {
    const { amount = 200000, rate = 3.5, durationYears = 20, type = 'fixed', insurance = 0.36 } = params;
    const n = durationYears * 12;
    const monthlyRate = rate / 100 / 12;
    const insuranceMonthly = amount * (insurance / 100) / 12;

    // Monthly payment (fixed rate)
    const payment = monthlyRate > 0
      ? amount * monthlyRate * Math.pow(1 + monthlyRate, n) / (Math.pow(1 + monthlyRate, n) - 1)
      : amount / n;

    const totalPayment = payment * n;
    const totalInterest = totalPayment - amount;
    const totalInsurance = insuranceMonthly * n;
    const totalCost = totalInterest + totalInsurance;

    // Amortization schedule
    const schedule = [];
    let remaining = amount;
    let cumInterest = 0;
    let cumPrincipal = 0;

    for (let m = 1; m <= n; m++) {
      const interest = remaining * monthlyRate;
      const principal = payment - interest;
      remaining -= principal;
      cumInterest += interest;
      cumPrincipal += principal;

      if (m % 12 === 0 || m === 1 || m === n) {
        schedule.push({
          month: m,
          year: Math.ceil(m / 12),
          payment: round2(payment + insuranceMonthly),
          principal: round2(principal),
          interest: round2(interest),
          insurance: round2(insuranceMonthly),
          remaining: round2(Math.max(0, remaining)),
          cumInterest: round2(cumInterest),
          cumPrincipal: round2(cumPrincipal)
        });
      }
    }

    return {
      monthlyPayment: round2(payment),
      monthlyTotal: round2(payment + insuranceMonthly),
      totalPayment: round2(totalPayment),
      totalInterest: round2(totalInterest),
      totalInsurance: round2(totalInsurance),
      totalCost: round2(totalCost),
      costRatio: round2((totalCost / amount) * 100),
      debtToIncome: 0,
      schedule
    };
  }

  /* ============================================================
     3. DIVIDEND CALCULATOR
     ============================================================ */
  function computeDividends(params) {
    const {
      initialInvestment = 10000, monthlyContribution = 200,
      dividendYield = 3.5, growthRate = 5, years = 30,
      reinvest = true, taxRate = 30
    } = params;

    const monthlyYield = (dividendYield / 100) / 12;
    const monthlyGrowth = (growthRate / 100) / 12;
    const projection = [];

    let portfolio = initialInvestment;
    let totalDividends = 0;
    let totalContributions = initialInvestment;

    for (let y = 0; y <= years; y++) {
      const annualDiv = portfolio * (dividendYield / 100);
      const netDiv = annualDiv * (1 - taxRate / 100);
      totalDividends += netDiv;

      projection.push({
        year: y,
        portfolio: round2(portfolio),
        annualDividend: round2(annualDiv),
        netDividend: round2(netDiv),
        monthlyIncome: round2(netDiv / 12),
        totalDividends: round2(totalDividends),
        totalContributions: round2(totalContributions),
        yieldOnCost: totalContributions > 0 ? round2((annualDiv / totalContributions) * 100) : 0
      });

      // Next year growth
      for (let m = 0; m < 12; m++) {
        portfolio *= (1 + monthlyGrowth);
        portfolio += monthlyContribution;
        if (reinvest) portfolio += (netDiv / 12);
        totalContributions += monthlyContribution;
      }
    }

    const finalMonthlyIncome = projection.length > 0 ? projection[projection.length - 1].monthlyIncome : 0;

    return {
      finalPortfolio: round2(portfolio),
      totalDividends: round2(totalDividends),
      finalMonthlyIncome,
      finalAnnualDividend: round2(projection[projection.length - 1]?.annualDividend || 0),
      totalContributions: round2(totalContributions),
      projection
    };
  }

  /* ============================================================
     4. WHAT-IF ANALYSIS
     ============================================================ */
  function computeWhatIf(profile, scenario) {
    const modified = JSON.parse(JSON.stringify(profile));
    if (scenario.salaryChange) modified.monthlyNetIncome *= (1 + scenario.salaryChange / 100);
    if (scenario.extraInvestment) modified.otherIncome = (modified.otherIncome || 0) + scenario.extraInvestment;
    if (scenario.expenseChange) {
      modified.fixedExpenses *= (1 + scenario.expenseChange / 100);
      modified.variableExpenses *= (1 + scenario.expenseChange / 100);
    }

    const baseAnalysis = FinEngine.runFullAnalysis(profile);
    const modifiedAnalysis = FinEngine.runFullAnalysis(modified);
    const baseFire = computeFIRE(profile);
    const modifiedFire = computeFIRE(modified);

    return {
      base: {
        healthScore: baseAnalysis.healthScore?.total || 0,
        monthlySurplus: baseAnalysis.balance?.surplus || 0,
        savingsRate: baseAnalysis.balance?.savingsRate || 0,
        fireAge: baseFire.fireAge,
        yearsToFire: baseFire.yearsToFire,
        fireNumber: baseFire.fireNumber
      },
      modified: {
        healthScore: modifiedAnalysis.healthScore?.total || 0,
        monthlySurplus: modifiedAnalysis.balance?.surplus || 0,
        savingsRate: modifiedAnalysis.balance?.savingsRate || 0,
        fireAge: modifiedFire.fireAge,
        yearsToFire: modifiedFire.yearsToFire,
        fireNumber: modifiedFire.fireNumber
      },
      deltas: {
        healthScore: (modifiedAnalysis.healthScore?.total || 0) - (baseAnalysis.healthScore?.total || 0),
        monthlySurplus: round2((modifiedAnalysis.balance?.surplus || 0) - (baseAnalysis.balance?.surplus || 0)),
        savingsRate: round2((modifiedAnalysis.balance?.savingsRate || 0) - (baseAnalysis.balance?.savingsRate || 0)),
        yearsToFire: modifiedFire.yearsToFire - baseFire.yearsToFire,
        wealthIn10y: round2(getProjectedWealth(modified, 10) - getProjectedWealth(profile, 10))
      }
    };
  }

  function getProjectedWealth(profile, years) {
    const inv = sum((profile.investments || []).map(i => i.amount || 0));
    const bal = FinEngine.computeMonthlyBalance(profile);
    let w = inv + (profile.currentSavings || 0);
    for (let y = 0; y < years; y++) {
      w = w * 1.05 + bal.surplus * 12;
    }
    return w;
  }

  /* ============================================================
     5. ESG SCORING
     ============================================================ */
  const ESG_SCORES = {
    etf_monde: { e: 55, s: 60, g: 65, label: 'ETF Monde' },
    etf_emergents: { e: 45, s: 45, g: 50, label: 'ETF Émergents' },
    pea: { e: 60, s: 55, g: 70, label: 'PEA actions' },
    cto_actions: { e: 50, s: 50, g: 60, label: 'CTO Actions' },
    assurance_vie_fonds_euros: { e: 70, s: 65, g: 75, label: 'Fonds Euros' },
    assurance_vie_uc: { e: 55, s: 55, g: 60, label: 'Unités de compte' },
    scpi: { e: 40, s: 50, g: 55, label: 'SCPI' },
    crypto: { e: 20, s: 30, g: 25, label: 'Cryptomonnaies' },
    obligations: { e: 65, s: 60, g: 75, label: 'Obligations' },
    per: { e: 60, s: 60, g: 70, label: 'PER' },
    livret: { e: 75, s: 70, g: 80, label: 'Livrets' },
    crowdfunding: { e: 50, s: 70, g: 45, label: 'Crowdfunding' },
    or: { e: 30, s: 40, g: 50, label: 'Or' }
  };

  function computeESG(profile) {
    const investments = profile.investments || [];
    if (investments.length === 0) return { total: 0, e: 0, s: 0, g: 0, details: [], grade: 'N/A' };

    const totalAmount = sum(investments.map(i => i.amount || 0));
    if (totalAmount === 0) return { total: 0, e: 0, s: 0, g: 0, details: [], grade: 'N/A' };

    let wE = 0, wS = 0, wG = 0;
    const details = [];

    for (const inv of investments) {
      const scores = ESG_SCORES[inv.type] || { e: 50, s: 50, g: 50, label: inv.type };
      const weight = (inv.amount || 0) / totalAmount;
      wE += scores.e * weight;
      wS += scores.s * weight;
      wG += scores.g * weight;
      details.push({
        type: inv.type,
        label: scores.label,
        amount: inv.amount || 0,
        weight: round2(weight * 100),
        e: scores.e, s: scores.s, g: scores.g,
        average: round2((scores.e + scores.s + scores.g) / 3)
      });
    }

    const total = round2((wE + wS + wG) / 3);
    const grade = total >= 80 ? 'A+' : total >= 70 ? 'A' : total >= 60 ? 'B' : total >= 50 ? 'C' : total >= 40 ? 'D' : 'E';

    return {
      total: round2(total),
      e: round2(wE), s: round2(wS), g: round2(wG),
      grade,
      details: details.sort((a, b) => b.amount - a.amount),
      recommendations: getESGRecommendations(details)
    };
  }

  function getESGRecommendations(details) {
    const recs = [];
    for (const d of details) {
      if (d.average < 40 && d.weight > 10) {
        recs.push({ type: d.label, message: `Impact ESG faible (${d.average}/100). Envisagez des alternatives plus responsables.`, severity: 'high' });
      } else if (d.average < 55 && d.weight > 20) {
        recs.push({ type: d.label, message: `Score ESG modéré. Des ETF ESG existent pour cette classe.`, severity: 'medium' });
      }
    }
    return recs;
  }

  /* ============================================================
     6. STRESS TEST
     ============================================================ */
  const CRISIS_SCENARIOS = [
    { id: 'crash_2008', name: 'Crise 2008', drop: -55, recovery: 5.5, description: 'Crise des subprimes' },
    { id: 'covid_2020', name: 'COVID 2020', drop: -34, recovery: 0.5, description: 'Pandémie mondiale' },
    { id: 'dot_com', name: 'Bulle Internet 2000', drop: -49, recovery: 7, description: 'Éclatement bulle tech' },
    { id: 'mild', name: 'Correction légère', drop: -15, recovery: 1, description: 'Correction de marché standard' },
    { id: 'severe', name: 'Crash sévère', drop: -50, recovery: 3, description: 'Crise financière majeure' },
    { id: 'hyperinflation', name: 'Hyperinflation', drop: -20, recovery: 4, description: 'Inflation > 15% sur 2 ans' },
    { id: 'custom', name: 'Personnalisé', drop: -30, recovery: 2, description: 'Scénario sur mesure' }
  ];

  function runStressTest(profile, scenarioId, customDrop, customRecovery) {
    const scenario = CRISIS_SCENARIOS.find(s => s.id === scenarioId) || CRISIS_SCENARIOS[4];
    const drop = scenarioId === 'custom' ? (customDrop || -30) : scenario.drop;
    const recoveryYears = scenarioId === 'custom' ? (customRecovery || 2) : scenario.recovery;

    const investments = profile.investments || [];
    const totalInvested = sum(investments.map(i => i.amount || 0));
    const totalSavings = profile.currentSavings || 0;
    const realEstate = sum((profile.realEstate || []).map(r => r.value || 0));

    // Different asset classes are affected differently
    const ASSET_SENSITIVITY = {
      crypto: 2.0, cto_actions: 1.2, etf_monde: 1.0, etf_emergents: 1.3,
      pea: 1.1, assurance_vie_uc: 0.8, scpi: 0.4, obligations: 0.2,
      assurance_vie_fonds_euros: 0.05, per: 0.7, livret: 0, crowdfunding: 0.5, or: -0.3
    };

    const impactDetails = investments.map(inv => {
      const sensitivity = ASSET_SENSITIVITY[inv.type] || 0.5;
      const loss = (inv.amount || 0) * (drop / 100) * sensitivity;
      return {
        type: inv.type,
        label: ESG_SCORES[inv.type]?.label || inv.type,
        before: round2(inv.amount || 0),
        loss: round2(Math.abs(loss)),
        after: round2((inv.amount || 0) + loss),
        impactPct: round2(drop * sensitivity)
      };
    });

    const totalLoss = sum(impactDetails.map(d => d.loss));
    const portfolioAfter = totalInvested - totalLoss;
    const totalWealthBefore = totalInvested + totalSavings + realEstate;
    const totalWealthAfter = portfolioAfter + totalSavings + realEstate;

    // Recovery projection
    const recovery = [];
    const bal = FinEngine.computeMonthlyBalance(profile);
    let port = portfolioAfter;
    for (let y = 0; y <= Math.ceil(recoveryYears) + 3; y++) {
      recovery.push({
        year: y,
        portfolio: round2(port),
        target: round2(totalInvested),
        recovered: port >= totalInvested
      });
      port = port * 1.08 + Math.max(0, bal.surplus * 12);
    }

    const monthsToRecover = Math.ceil(recoveryYears * 12);
    const emergencyFund = FinEngine.computeEmergencyFund(profile);
    const canSurvive = emergencyFund.monthsCovered >= recoveryYears * 2;

    return {
      scenario: { ...scenario, drop, recoveryYears },
      totalLoss: round2(totalLoss),
      lossPct: totalInvested > 0 ? round2((totalLoss / totalInvested) * 100) : 0,
      portfolioBefore: round2(totalInvested),
      portfolioAfter: round2(portfolioAfter),
      wealthBefore: round2(totalWealthBefore),
      wealthAfter: round2(totalWealthAfter),
      wealthLossPct: totalWealthBefore > 0 ? round2(((totalWealthBefore - totalWealthAfter) / totalWealthBefore) * 100) : 0,
      impactDetails,
      recovery,
      monthsToRecover,
      canSurvive,
      riskLevel: totalLoss > totalInvested * 0.4 ? 'critical' : totalLoss > totalInvested * 0.2 ? 'high' : 'moderate'
    };
  }

  /* ============================================================
     7. COMPOUND INTEREST CALCULATOR
     ============================================================ */
  function computeCompoundInterest(params) {
    const { principal = 1000, monthlyAdd = 100, rate = 7, years = 30, compounding = 12 } = params;
    const r = rate / 100;
    const projection = [];
    let balance = principal;
    let totalContrib = principal;
    let totalInterest = 0;

    for (let y = 0; y <= years; y++) {
      const interestThisYear = balance * r;
      projection.push({
        year: y,
        balance: round2(balance),
        contributions: round2(totalContrib),
        interest: round2(totalInterest),
        interestThisYear: round2(interestThisYear)
      });

      for (let m = 0; m < 12; m++) {
        const monthInt = balance * (r / compounding);
        balance += monthInt + monthlyAdd;
        totalInterest += monthInt;
        totalContrib += monthlyAdd;
      }
    }

    return {
      finalBalance: round2(balance),
      totalContributions: round2(totalContrib),
      totalInterest: round2(totalInterest),
      multiplier: totalContrib > 0 ? round2(balance / totalContrib) : 0,
      projection
    };
  }

  /* ============================================================
     8. RADAR / SPIDER DATA
     ============================================================ */
  function computeRadarData(profile) {
    const analysis = FinEngine.runFullAnalysis(profile);
    const fire = computeFIRE(profile);
    const esg = computeESG(profile);
    const bal = analysis.balance || {};
    const ratios = analysis.ratios || {};
    const ef = analysis.emergencyFund || {};

    return {
      axes: [
        { label: 'Revenus', value: clamp(Math.min(100, (bal.income || 0) / 60), 0, 100), detail: `${round2(bal.income || 0)}€/mois` },
        { label: 'Épargne', value: clamp(Math.min(100, (bal.savingsRate || 0) / 30 * 100), 0, 100), detail: `${round2(bal.savingsRate || 0)}% taux` },
        { label: 'Diversification', value: analysis.healthScore?.components?.diversification?.score || 0, detail: analysis.healthScore?.components?.diversification?.detail || '' },
        { label: 'Sécurité', value: clamp((ef.monthsCovered || 0) / 6 * 100, 0, 100), detail: `${round2(ef.monthsCovered || 0)} mois` },
        { label: 'Endettement', value: clamp(100 - (ratios.debtToIncomeRatio || 0) * 2, 0, 100), detail: `${round2(ratios.debtToIncomeRatio || 0)}% DTI` },
        { label: 'FIRE', value: fire.progress || 0, detail: `${round2(fire.progress || 0)}%` },
        { label: 'ESG', value: esg.total || 50, detail: `Grade ${esg.grade}` },
        { label: 'Objectifs', value: analysis.healthScore?.components?.goals?.score || 50, detail: 'Progression' }
      ]
    };
  }

  /* ============================================================
     9. BENCHMARKS (Percentile estimation by age bracket)
     ============================================================ */
  const BENCHMARKS_FR = {
    '20-29': { savingsRate: [5, 10, 15, 22, 35], netWorth: [2000, 8000, 18000, 40000, 80000], investRate: [0, 5, 10, 18, 30] },
    '30-39': { savingsRate: [5, 12, 18, 25, 38], netWorth: [10000, 35000, 80000, 150000, 300000], investRate: [2, 8, 15, 22, 35] },
    '40-49': { savingsRate: [8, 14, 20, 28, 40], netWorth: [30000, 80000, 180000, 350000, 600000], investRate: [5, 12, 20, 28, 40] },
    '50-59': { savingsRate: [10, 15, 22, 30, 42], netWorth: [60000, 150000, 300000, 550000, 900000], investRate: [8, 15, 25, 35, 45] },
    '60+': { savingsRate: [5, 10, 15, 22, 30], netWorth: [80000, 200000, 400000, 700000, 1200000], investRate: [10, 18, 28, 38, 50] }
  };

  function computeBenchmark(profile) {
    const age = profile.age || 30;
    const bracket = age < 30 ? '20-29' : age < 40 ? '30-39' : age < 50 ? '40-49' : age < 60 ? '50-59' : '60+';
    const benchData = BENCHMARKS_FR[bracket];

    const bal = FinEngine.computeMonthlyBalance(profile);
    const investments = sum((profile.investments || []).map(i => i.amount || 0));
    const netWorth = investments + (profile.currentSavings || 0) +
      sum((profile.realEstate || []).map(r => (r.value || 0) - (r.remainingMortgage || 0)));
    const investRate = bal.income > 0 ? (investments / (bal.income * 12)) * 100 : 0;

    function percentile(value, brackets) {
      if (value <= brackets[0]) return 10;
      if (value <= brackets[1]) return 25;
      if (value <= brackets[2]) return 50;
      if (value <= brackets[3]) return 75;
      if (value >= brackets[4]) return 95;
      // Interpolate between 75 and 95
      const ratio = (value - brackets[3]) / (brackets[4] - brackets[3]);
      return Math.round(75 + ratio * 20);
    }

    return {
      bracket,
      savingsRate: { value: round2(bal.savingsRate), percentile: percentile(bal.savingsRate, benchData.savingsRate) },
      netWorth: { value: round2(netWorth), percentile: percentile(netWorth, benchData.netWorth) },
      investmentRate: { value: round2(investRate), percentile: percentile(investRate, benchData.investRate) },
      overallPercentile: Math.round(
        (percentile(bal.savingsRate, benchData.savingsRate) +
         percentile(netWorth, benchData.netWorth) +
         percentile(investRate, benchData.investRate)) / 3
      )
    };
  }

  /* ============================================================
     10. SCENARIO COMPARATOR
     ============================================================ */
  function compareScenarios(profile, scenarios) {
    return scenarios.map(sc => {
      const mod = JSON.parse(JSON.stringify(profile));
      if (sc.monthlyInvestment) {
        const inv = mod.investments.find(i => i.type === (sc.investType || 'etf_monde'));
        if (inv) inv.amount += sc.monthlyInvestment * 12 * 10;
        mod.otherIncome = (mod.otherIncome || 0) - (sc.monthlyInvestment || 0);
      }
      if (sc.extraSavings) mod.currentSavings += sc.extraSavings;
      const analysis = FinEngine.runFullAnalysis(mod);
      const fire = computeFIRE(mod);
      const projection = FinEngine.projectCompoundGrowth(
        sum((mod.investments || []).map(i => i.amount || 0)),
        sc.monthlyInvestment || 200,
        (sc.returnRate || 7) / 100,
        30
      );
      return {
        name: sc.name,
        description: sc.description,
        healthScore: analysis.healthScore?.total || 0,
        fireAge: fire.fireAge,
        wealthIn10y: round2(projection[Math.min(10, projection.length - 1)]?.total || 0),
        wealthIn20y: round2(projection[Math.min(20, projection.length - 1)]?.total || 0),
        wealthIn30y: round2(projection[Math.min(30, projection.length - 1)]?.total || 0),
        monthlyPassiveIncome: fire.monthlyPassiveIncome,
        projection: projection.map((p, i) => ({ year: i, value: round2(p.total || 0) }))
      };
    });
  }

  /* ============================================================
     11. ALTERNATIVE LIFE SIMULATION
     ============================================================ */
  function simulateAlternativeLife(profile, startAge) {
    const currentAge = profile.age || 30;
    const bal = FinEngine.computeMonthlyBalance(profile);
    const monthlySavings = Math.max(0, bal.surplus);

    // Current timeline: started at currentAge
    const currentTimeline = [];
    let cur = sum((profile.investments || []).map(i => i.amount || 0));
    for (let a = currentAge; a <= 65; a++) {
      currentTimeline.push({ age: a, wealth: round2(cur) });
      cur = cur * 1.07 + monthlySavings * 12;
    }

    // Alternative: started at startAge
    const altTimeline = [];
    const yearsHead = currentAge - startAge;
    let alt = 0;
    const altMonthlySavings = monthlySavings * 0.5; // assume less income earlier
    for (let a = startAge; a <= 65; a++) {
      if (a < currentAge) {
        alt = alt * 1.07 + altMonthlySavings * 12;
        altTimeline.push({ age: a, wealth: round2(alt) });
      } else {
        alt = alt * 1.07 + monthlySavings * 12;
        altTimeline.push({ age: a, wealth: round2(alt) });
      }
    }

    const diff65 = (altTimeline.find(t => t.age === 65)?.wealth || 0) - (currentTimeline.find(t => t.age === 65)?.wealth || 0);

    return {
      currentTimeline,
      altTimeline,
      startAge,
      yearsHeadStart: yearsHead,
      diff65: round2(diff65),
      message: diff65 > 0
        ? `En commençant ${yearsHead} ans plus tôt, vous auriez +${round2(diff65).toLocaleString('fr-FR')}€ à 65 ans.`
        : 'Vous êtes sur la bonne voie !'
    };
  }

  /* ============================================================
     12. HEATMAP DATA GENERATION
     ============================================================ */
  function generateHeatmapData(profile) {
    const bal = FinEngine.computeMonthlyBalance(profile);
    const dailySurplus = bal.surplus / 30;
    const investments = sum((profile.investments || []).map(i => i.amount || 0));

    // Generate 365 days of simulated daily variation
    const data = [];
    const today = new Date();
    let portValue = investments;

    for (let d = 364; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);

      // Daily market variation: ~0.05% std
      const marketReturn = (Math.random() - 0.48) * 0.01;
      const dailyChange = portValue * marketReturn + dailySurplus;
      portValue += dailyChange;

      data.push({
        date: date.toISOString().slice(0, 10),
        day: date.getDay(),
        week: Math.floor(d / 7),
        value: round2(dailyChange),
        level: dailyChange > dailySurplus * 2 ? 4
          : dailyChange > dailySurplus * 0.5 ? 3
          : dailyChange > 0 ? 2
          : dailyChange > -dailySurplus ? 1
          : 0
      });
    }

    const positive = data.filter(d => d.value > 0).length;
    const negative = data.filter(d => d.value <= 0).length;
    const bestDay = data.reduce((a, b) => a.value > b.value ? a : b);
    const worstDay = data.reduce((a, b) => a.value < b.value ? a : b);

    return { data, positive, negative, bestDay, worstDay, streak: computeStreak(data) };
  }

  function computeStreak(data) {
    let maxStreak = 0, currentStreak = 0;
    for (const d of data.reverse()) {
      if (d.value > 0) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
      else currentStreak = 0;
    }
    return maxStreak;
  }

  /* ============================================================
     13. BADGES / ACHIEVEMENTS
     ============================================================ */
  const ALL_BADGES = [
    { id: 'first_analysis', name: 'Premier pas', icon: '🎯', desc: 'Compléter la première analyse', check: (p, a) => !!a },
    { id: 'saver_10', name: 'Épargnant', icon: '💰', desc: 'Taux d\'épargne > 10%', check: (p, a) => a?.balance?.savingsRate > 10 },
    { id: 'saver_20', name: 'Super épargnant', icon: '🏆', desc: 'Taux d\'épargne > 20%', check: (p, a) => a?.balance?.savingsRate > 20 },
    { id: 'saver_30', name: 'Champion', icon: '👑', desc: 'Taux d\'épargne > 30%', check: (p, a) => a?.balance?.savingsRate > 30 },
    { id: 'emergency_3', name: 'Coussin 3 mois', icon: '🛡️', desc: 'Fonds d\'urgence couvre 3 mois', check: (p, a) => a?.emergencyFund?.monthsCovered >= 3 },
    { id: 'emergency_6', name: 'Coussin 6 mois', icon: '🏰', desc: 'Fonds d\'urgence couvre 6 mois', check: (p, a) => a?.emergencyFund?.monthsCovered >= 6 },
    { id: 'diversified', name: 'Diversifié', icon: '🌈', desc: '4+ classes d\'actifs', check: (p) => new Set((p.investments || []).map(i => i.type)).size >= 4 },
    { id: 'debt_free', name: 'Sans dette', icon: '🆓', desc: 'Aucune dette', check: (p) => (p.debts || []).length === 0 },
    { id: 'wealth_50k', name: 'Patrimoine 50k', icon: '💎', desc: 'Patrimoine > 50 000€', check: (p) => sum((p.investments || []).map(i => i.amount || 0)) + (p.currentSavings || 0) > 50000 },
    { id: 'wealth_100k', name: 'Patrimoine 100k', icon: '🌟', desc: 'Patrimoine > 100 000€', check: (p) => sum((p.investments || []).map(i => i.amount || 0)) + (p.currentSavings || 0) > 100000 },
    { id: 'wealth_500k', name: 'Demi-million', icon: '🚀', desc: 'Patrimoine > 500 000€', check: (p) => sum((p.investments || []).map(i => i.amount || 0)) + (p.currentSavings || 0) > 500000 },
    { id: 'health_80', name: 'Score A', icon: '🏅', desc: 'Score de santé > 80', check: (p, a) => a?.healthScore?.total > 80 },
    { id: 'investor', name: 'Investisseur', icon: '📈', desc: 'Au moins 1 investissement', check: (p) => (p.investments || []).length > 0 },
    { id: 'real_estate', name: 'Propriétaire', icon: '🏠', desc: 'Au moins 1 bien immobilier', check: (p) => (p.realEstate || []).length > 0 },
    { id: 'goals_set', name: 'Visionnaire', icon: '🔮', desc: 'Au moins 3 objectifs définis', check: (p) => (p.goals || []).length >= 3 },
    { id: 'fire_25', name: 'FIRE 25%', icon: '🔥', desc: '25% du chemin FIRE', check: (p) => computeFIRE(p).progress >= 25 },
    { id: 'fire_50', name: 'FIRE 50%', icon: '🔥', desc: 'Moitié du chemin FIRE', check: (p) => computeFIRE(p).progress >= 50 },
    { id: 'fire_100', name: 'FIRE!', icon: '🎆', desc: 'Indépendance financière atteinte', check: (p) => computeFIRE(p).progress >= 100 },
    { id: 'esg_a', name: 'ESG Grade A', icon: '🌱', desc: 'Score ESG grade A ou A+', check: (p) => { const e = computeESG(p); return e.grade === 'A' || e.grade === 'A+'; } },
    { id: 'crypto_holder', name: 'Crypto', icon: '₿', desc: 'Investisseur crypto', check: (p) => (p.investments || []).some(i => i.type === 'crypto' && i.amount > 0) }
  ];

  function evaluateBadges(profile, analysis) {
    return ALL_BADGES.map(b => ({
      ...b,
      unlocked: b.check(profile, analysis)
    }));
  }

  /* ============================================================
     14. CHALLENGES
     ============================================================ */
  function generateChallenges(profile) {
    const bal = FinEngine.computeMonthlyBalance(profile);
    const ef = FinEngine.computeEmergencyFund(profile);

    const all = [
      { id: 'save_100', title: 'Épargner 100€ ce mois', desc: 'Mettez 100€ de côté en plus ce mois-ci', target: 100, metric: 'savings', icon: '💰', difficulty: 'easy' },
      { id: 'save_500', title: 'Épargner 500€ ce mois', desc: 'Un effort d\'épargne exceptionnel', target: 500, metric: 'savings', icon: '💎', difficulty: 'hard' },
      { id: 'cut_10', title: 'Réduire dépenses -10%', desc: 'Réduisez vos dépenses variables de 10%', target: (profile.variableExpenses || 0) * 0.1, metric: 'expenses', icon: '✂️', difficulty: 'medium' },
      { id: 'invest_first', title: 'Premier investissement', desc: 'Investissez au moins 50€', target: 50, metric: 'invest', icon: '📈', difficulty: 'easy' },
      { id: 'emergency', title: 'Renforcer le coussin', desc: `Ajoutez ${Math.round(ef.deficit / 6)}€ au fonds d'urgence`, target: Math.round(ef.deficit / 6), metric: 'emergency', icon: '🛡️', difficulty: 'medium' },
      { id: 'noSpend', title: 'Journée sans dépense', desc: 'Ne dépensez rien pendant une journée entière', target: 1, metric: 'discipline', icon: '🧘', difficulty: 'easy' },
      { id: 'track_30', title: 'Suivi 30 jours', desc: 'Consultez votre profil financier chaque jour pendant 30 jours', target: 30, metric: 'tracking', icon: '📊', difficulty: 'hard' },
      { id: 'diversify', title: 'Nouvelle classe d\'actif', desc: 'Investissez dans un type de placement que vous n\'avez pas encore', target: 1, metric: 'diversify', icon: '🌈', difficulty: 'medium' }
    ];

    // Return challenges appropriate to profile
    return all.filter(c => {
      if (c.id === 'emergency' && ef.deficit <= 0) return false;
      if (c.id === 'invest_first' && (profile.investments || []).length > 0) return false;
      return true;
    });
  }

  /* ============================================================
     15. FINANCIAL GLOSSARY
     ============================================================ */
  const GLOSSARY = [
    { term: 'ETF', def: 'Exchange-Traded Fund. Fonds indiciel coté en bourse qui réplique un indice (CAC 40, S&P 500, MSCI World…). Frais très bas.', cat: 'Investissement' },
    { term: 'PEA', def: 'Plan d\'Épargne en Actions. Enveloppe fiscale avantageuse pour investir en actions européennes. Exonération d\'impôt sur les plus-values après 5 ans (hors prélèvements sociaux).', cat: 'Fiscalité' },
    { term: 'CTO', def: 'Compte-Titres Ordinaire. Compte d\'investissement sans avantage fiscal mais sans restriction géographique.', cat: 'Investissement' },
    { term: 'SCPI', def: 'Société Civile de Placement Immobilier. Investissement immobilier mutualisé, rendement ~4-6%/an.', cat: 'Immobilier' },
    { term: 'Assurance-vie', def: 'Enveloppe d\'épargne polyvalente. Fonds euros (capital garanti) + unités de compte (actions, obligations…). Fiscalité avantageuse après 8 ans.', cat: 'Fiscalité' },
    { term: 'PER', def: 'Plan d\'Épargne Retraite. Versements déductibles du revenu imposable. L\'argent est bloqué jusqu\'à la retraite (sauf achat RP).', cat: 'Retraite' },
    { term: 'TMI', def: 'Taux Marginal d\'Imposition. Taux d\'imposition applicable à la dernière tranche de vos revenus.', cat: 'Fiscalité' },
    { term: 'Flat Tax', def: 'Prélèvement Forfaitaire Unique (PFU) de 30% sur les revenus du capital (12,8% IR + 17,2% PS).', cat: 'Fiscalité' },
    { term: 'FIRE', def: 'Financial Independence, Retire Early. Mouvement visant l\'indépendance financière pour ne plus dépendre d\'un salaire.', cat: 'Stratégie' },
    { term: 'SWR', def: 'Safe Withdrawal Rate. Taux de retrait sécurisé, généralement 4% du portefeuille par an (règle des 4%).', cat: 'Stratégie' },
    { term: 'DCA', def: 'Dollar Cost Averaging. Investir un montant fixe à intervalles réguliers. Réduit l\'impact de la volatilité.', cat: 'Stratégie' },
    { term: 'Livret A', def: 'Livret d\'épargne réglementé, garanti par l\'État. Taux fixé par le gouvernement. Plafond 22 950€. Exonéré d\'impôt.', cat: 'Épargne' },
    { term: 'LDDS', def: 'Livret de Développement Durable et Solidaire. Similar au Livret A. Plafond 12 000€. Exonéré d\'impôt.', cat: 'Épargne' },
    { term: 'Intérêts composés', def: 'Les intérêts génèrent eux-mêmes des intérêts. Effet "boule de neige" : plus le temps passe, plus la croissance est forte.', cat: 'Concepts' },
    { term: 'Ratio dette/revenu', def: 'Pourcentage du revenu consacré à rembourser les dettes. Seuil d\'alerte : > 33%.', cat: 'Endettement' },
    { term: 'Allocation d\'actifs', def: 'Répartition de l\'investissement entre différentes classes (actions, obligations, immobilier…). Déterminée par le profil de risque.', cat: 'Investissement' },
    { term: 'Volatilité', def: 'Mesure de la variation du prix d\'un actif. Plus la volatilité est élevée, plus le risque est important.', cat: 'Risque' },
    { term: 'Diversification', def: 'Répartir ses investissements sur plusieurs actifs pour réduire le risque global.', cat: 'Risque' },
    { term: 'Rendement réel', def: 'Rendement après déduction de l\'inflation. Un rendement de 7% avec 2,5% d\'inflation = 4,5% réel.', cat: 'Concepts' },
    { term: 'Monte Carlo', def: 'Simulation statistique qui exécute des milliers de scénarios aléatoires pour estimer les probabilités de résultats.', cat: 'Concepts' },
    { term: 'Crowdfunding', def: 'Financement participatif. Investir dans des projets immobiliers ou des entreprises en échange de rendements (8-12%/an). Risque élevé.', cat: 'Investissement' },
    { term: 'Obligations', def: 'Titres de dette émis par un État ou une entreprise. Rendement fixe, risque modéré. Peu corrélées aux actions.', cat: 'Investissement' },
    { term: 'Plus-value', def: 'Gain réalisé lors de la vente d\'un actif à un prix supérieur au prix d\'achat.', cat: 'Fiscalité' },
    { term: 'TAEG', def: 'Taux Annuel Effectif Global. Inclut tous les frais d\'un crédit (intérêts, assurance, frais de dossier).', cat: 'Endettement' }
  ];

  /* ============================================================
     16. MINI-COURSES
     ============================================================ */
  const COURSES = [
    {
      id: 'etf', title: 'Comprendre les ETF', icon: '📊', duration: '8 min', difficulty: 'Débutant',
      lessons: [
        { title: 'Qu\'est-ce qu\'un ETF ?', content: 'Un ETF (Exchange-Traded Fund) est un fonds d\'investissement coté en bourse qui réplique la performance d\'un indice. Par exemple, un ETF MSCI World suit l\'évolution de ~1500 entreprises mondiales. Avantages : frais très bas (0,1-0,4%/an vs 1-2% pour un fonds actif), diversification instantanée, liquidité quotidienne.', quiz: { q: 'Un ETF MSCI World investit dans combien d\'entreprises environ ?', options: ['50', '500', '1500', '10000'], answer: 2 } },
        { title: 'ETF vs Fonds actif', content: 'Études montrent que 90% des fonds actifs sous-performent leur indice de référence sur 15 ans. Les ETF à gestion passive offrent une performance de marché à moindre coût. La différence de frais (1,5% vs 0,2%) peut représenter des dizaines de milliers d\'euros sur 30 ans.', quiz: { q: 'Quel % de fonds actifs sous-performent sur 15 ans ?', options: ['50%', '70%', '90%', '99%'], answer: 2 } },
        { title: 'Commencer avec les ETF', content: 'Pour investir en ETF : 1) Ouvrir un PEA ou CTO chez un courtier en ligne. 2) Choisir des ETF diversifiés (MSCI World, S&P 500). 3) Investir régulièrement (DCA). 4) Ne pas vendre lors des baisses. L\'investissement minimum peut être aussi faible que 10€ chez certains courtiers.', quiz: { q: 'Quelle stratégie consiste à investir un montant fixe régulièrement ?', options: ['Trading', 'DCA', 'Swing', 'Day trading'], answer: 1 } }
      ]
    },
    {
      id: 'assurance_vie', title: 'L\'assurance-vie', icon: '🏦', duration: '10 min', difficulty: 'Débutant',
      lessons: [
        { title: 'Fonctionnement', content: 'L\'assurance-vie est une enveloppe d\'épargne polyvalente. Elle contient 2 types de supports : les fonds euros (capital garanti, ~2-3%/an) et les unités de compte (actions, obligations, SCPI — plus de rendement mais plus de risque). On peut mixer les deux selon son profil.', quiz: { q: 'Les fonds euros garantissent-ils le capital ?', options: ['Oui', 'Non', 'Seulement après 8 ans'], answer: 0 } },
        { title: 'Fiscalité avantageuse', content: 'Après 8 ans de détention : abattement de 4 600€/an (9 200€ en couple) sur les gains retirés. Au-delà : PFU de 24,7% (au lieu de 30%). En cas de décès : ex. les premiers 152 500€ par bénéficiaire sont exonérés de droits de succession.', quiz: { q: 'Après combien d\'années la fiscalité devient-elle avantageuse ?', options: ['2 ans', '5 ans', '8 ans', '10 ans'], answer: 2 } },
        { title: 'Bien choisir', content: 'Critères : frais sur versements (idéal : 0%), frais de gestion (< 0,6%), qualité du fonds euros, diversité des UC. Les contrats en ligne (Boursorama, Linxea, Assurancevie.com) sont généralement meilleurs que les contrats bancaires.', quiz: { q: 'Quels frais de versement rechercher idéalement ?', options: ['5%', '2%', '1%', '0%'], answer: 3 } }
      ]
    },
    {
      id: 'interets_composes', title: 'L\'intérêt composé', icon: '🧮', duration: '6 min', difficulty: 'Débutant',
      lessons: [
        { title: 'La 8ème merveille du monde', content: 'Einstein aurait dit : "L\'intérêt composé est la 8ème merveille du monde. Celui qui le comprend le gagne, celui qui ne le comprend pas le paie." Principe : vos intérêts génèrent eux-mêmes des intérêts. 10 000€ à 7%/an = 76 123€ après 30 ans, soit 7,6x votre mise initiale.', quiz: { q: '10 000€ à 7%/an sur 30 ans donnent environ ?', options: ['30 000€', '50 000€', '76 000€', '100 000€'], answer: 2 } },
        { title: 'Le temps est votre allié', content: 'La règle de 72 : divisez 72 par le taux de rendement pour estimer le temps de doublement. À 7% : 72/7 ≈ 10 ans. À 10% : 72/10 ≈ 7 ans. Commencer 10 ans plus tôt peut doubler votre patrimoine final !', quiz: { q: 'À 7%/an, votre capital double tous les combien ?', options: ['5 ans', '7 ans', '10 ans', '15 ans'], answer: 2 } }
      ]
    },
    {
      id: 'fiscalite', title: 'Optimisation fiscale', icon: '📋', duration: '12 min', difficulty: 'Intermédiaire',
      lessons: [
        { title: 'Les tranches d\'imposition', content: 'Le barème 2025 : 0% jusqu\'à 11 294€, 11% de 11 294€ à 28 797€, 30% de 28 797€ à 82 341€, 41% de 82 341€ à 177 106€, 45% au-delà. C\'est progressif : seule la partie dans chaque tranche est taxée au taux correspondant.', quiz: { q: 'Le taux de 30% s\'applique à partir de quel revenu ?', options: ['11 294€', '28 797€', '82 341€', '177 106€'], answer: 1 } },
        { title: 'PEA vs CTO vs AV', content: 'PEA : 0% IR après 5 ans (uniquement PS 17,2%). Limité aux actions européennes. Plafond 150 000€. CTO : Flat tax 30% sur tout. Aucune restriction. AV : 24,7% après 8 ans avec abattement. Ordre de priorité : PEA → AV → CTO.', quiz: { q: 'Quelle enveloppe prioriser pour les actions ?', options: ['CTO', 'AV', 'PEA', 'Livret A'], answer: 2 } },
        { title: 'PER et déduction', content: 'Le PER permet de déduire les versements du revenu imposable. Si TMI 30% et versement de 5 000€ : économie de 1 500€ d\'impôt. Attention : l\'argent est bloqué jusqu\'à la retraite (sauf achat RP) et sera imposé à la sortie.', quiz: { q: 'Avec un TMI de 30%, verser 5 000€ sur un PER économise combien ?', options: ['500€', '1 000€', '1 500€', '2 500€'], answer: 2 } }
      ]
    },
    {
      id: 'immobilier', title: 'Investir en immobilier', icon: '🏠', duration: '10 min', difficulty: 'Intermédiaire',
      lessons: [
        { title: 'Direct vs Pierre-papier', content: 'Immobilier direct : achat d\'un bien → gestion, travaux, impayés. Rendement brut 5-8%, net 3-5%. Pierre-papier (SCPI, crowdfunding) : rendement 4-6%, sans gestion, à partir de 200€. La SCPI permet de bénéficier de l\'effet de levier du crédit.', quiz: { q: 'Les SCPI offrent un rendement annuel d\'environ ?', options: ['1-2%', '4-6%', '10-15%', '20%'], answer: 1 } },
        { title: 'Effet de levier', content: 'L\'immobilier est le seul actif que la banque finance à crédit. Emprunter à 3,5% pour investir avec un rendement de 6% = levier positif. Attention : le levier amplifie aussi les pertes. Règle : ne pas dépasser 33% d\'endettement.', quiz: { q: 'Le seuil d\'endettement recommandé est de ?', options: ['20%', '33%', '50%', '75%'], answer: 1 } }
      ]
    }
  ];

  /* ============================================================
     17. IMMERSIVE RETIREMENT PROJECTION
     ============================================================ */
  function computeImmersiveRetirement(profile, settings = {}) {
    const retAge = profile.retirementAge || 65;
    const lifeExp = settings.lifeExpectancy || 85;
    const inflation = (settings.inflationRate || 2.5) / 100;
    const bal = FinEngine.computeMonthlyBalance(profile);
    const investments = sum((profile.investments || []).map(i => i.amount || 0));
    const pension = profile.retirementIncome || bal.income * 0.5;

    const years = [];
    let portfolio = investments;
    const annualSavings = Math.max(0, bal.surplus * 12);
    const currentAge = profile.age || 30;

    for (let age = currentAge; age <= lifeExp; age++) {
      if (age < retAge) {
        portfolio = portfolio * 1.06 + annualSavings;
      } else {
        const monthlyExpenses = bal.expenses * Math.pow(1 + inflation, age - currentAge);
        const monthlyPension = pension * Math.pow(1 + inflation * 0.5, age - retAge);
        const monthlyDeficit = Math.max(0, monthlyExpenses - monthlyPension);
        const annualWithdrawal = monthlyDeficit * 12;
        portfolio = portfolio * 1.03 - annualWithdrawal;
      }

      const lifestyleLevel = portfolio > bal.expenses * 12 * 15 ? 'confortable'
        : portfolio > bal.expenses * 12 * 5 ? 'correct'
        : portfolio > 0 ? 'serré'
        : 'déficit';

      years.push({
        age,
        phase: age < retAge ? 'accumulation' : 'retraite',
        portfolio: round2(Math.max(0, portfolio)),
        lifestyle: lifestyleLevel,
        monthlyAvailable: round2(age < retAge ? bal.surplus : (portfolio > 0 ? portfolio * 0.04 / 12 + pension : pension))
      });
    }

    const depletionAge = years.find(y => y.portfolio <= 0)?.age || lifeExp + 1;
    const isSecure = depletionAge > lifeExp;

    return {
      years,
      retirementAge: retAge,
      lifeExpectancy: lifeExp,
      depletionAge,
      isSecure,
      portfolioAtRetirement: round2(years.find(y => y.age === retAge)?.portfolio || 0),
      yearsOfRetirement: lifeExp - retAge,
      monthlyPension: round2(pension)
    };
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  window.FinExtra = {
    computeFIRE,
    simulateCredit,
    computeDividends,
    computeWhatIf,
    computeESG,
    runStressTest,
    computeCompoundInterest,
    computeRadarData,
    computeBenchmark,
    compareScenarios,
    simulateAlternativeLife,
    generateHeatmapData,
    evaluateBadges,
    generateChallenges,
    computeImmersiveRetirement,
    GLOSSARY,
    COURSES,
    ALL_BADGES,
    CRISIS_SCENARIOS
  };
})();
