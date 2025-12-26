/* global echarts, d3, LZString */

(() => {
  'use strict';

  const EXTENSION_ID = 'com.ezgalaxy.budget';
  const COMMUNITY_COLLECTION = 'budget';
  const COMMUNITY_RECORD_KEY = 'main';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function formatMoneyEUR(amount) {
    const sign = amount < 0 ? '-' : '';
    const abs = Math.abs(amount);
    return `${sign}${abs.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`;
  }

  function formatDateISO(d) {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function parseDateISO(s) {
    // s: YYYY-MM-DD
    const [y, m, d] = String(s || '').split('-').map((x) => Number(x));
    if (!y || !m || !d) return null;
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }

  function uid(prefix = 'id') {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  }

  function toast(kind, title, msg) {
    App.toasts.push({ id: uid('t'), kind, title, msg, at: Date.now() });
    renderToasts();
    window.setTimeout(() => {
      App.toasts = App.toasts.filter((t) => t.at > Date.now() - 6000);
      renderToasts();
    }, 6500);
  }

  function safeJsonParse(s) {
    try { return JSON.parse(s); } catch { return null; }
  }

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // ------------------------------
  // Demo data
  // ------------------------------

  function buildDemoBudget() {
    const now = new Date();
    const start = new Date(now);
    start.setMonth(start.getMonth() - 6);

    const categories = [
      { id: 'cat_rent', name: 'Logement', kind: 'fixed' },
      { id: 'cat_food', name: 'Alimentation', kind: 'variable' },
      { id: 'cat_transport', name: 'Transport', kind: 'variable' },
      { id: 'cat_subs', name: 'Abonnements', kind: 'fixed' },
      { id: 'cat_health', name: 'Santé', kind: 'variable' },
      { id: 'cat_fun', name: 'Loisirs', kind: 'variable' },
      { id: 'cat_other', name: 'Divers', kind: 'variable' }
    ];

    const budgets = [
      { id: 'b_rent', categoryId: 'cat_rent', monthly: 950 },
      { id: 'b_food', categoryId: 'cat_food', monthly: 380 },
      { id: 'b_transport', categoryId: 'cat_transport', monthly: 120 },
      { id: 'b_subs', categoryId: 'cat_subs', monthly: 45 },
      { id: 'b_health', categoryId: 'cat_health', monthly: 70 },
      { id: 'b_fun', categoryId: 'cat_fun', monthly: 120 },
      { id: 'b_other', categoryId: 'cat_other', monthly: 90 }
    ];

    const accounts = [
      { id: 'acc_main', name: 'Compte courant' },
      { id: 'acc_sav', name: 'Épargne' }
    ];

    const recurring = [
      { id: 'r_salary', name: 'Salaire', type: 'income', amount: 2450, cadence: 'monthly', day: 28, categoryId: null, accountId: 'acc_main' },
      { id: 'r_rent', name: 'Loyer', type: 'expense', amount: 950, cadence: 'monthly', day: 3, categoryId: 'cat_rent', accountId: 'acc_main' },
      { id: 'r_subs', name: 'Streaming', type: 'expense', amount: 13.99, cadence: 'monthly', day: 12, categoryId: 'cat_subs', accountId: 'acc_main' },
      { id: 'r_ins', name: 'Assurance', type: 'expense', amount: 31.2, cadence: 'monthly', day: 15, categoryId: 'cat_subs', accountId: 'acc_main' }
    ];

    const merchants = ['Supermarché', 'Boulangerie', 'Essence', 'Pharmacie', 'Restaurant', 'Café', 'VTC', 'Boutique', 'Cinéma'];

    const tx = [];

    // Generate day-by-day variable spending + recurring.
    const cursor = new Date(start);
    while (cursor <= now) {
      const iso = formatDateISO(cursor);
      const day = cursor.getDate();

      // recurring monthly
      for (const r of recurring) {
        if (r.cadence === 'monthly' && day === r.day) {
          tx.push({
            id: uid('tx'),
            date: iso,
            type: r.type,
            amount: r.amount,
            categoryId: r.categoryId,
            accountId: r.accountId,
            label: r.name,
            tags: ['recurring']
          });
        }
      }

      // variable expenses
      const n = Math.random() < 0.55 ? 1 : (Math.random() < 0.18 ? 2 : 0);
      for (let i = 0; i < n; i++) {
        const pick = merchants[Math.floor(Math.random() * merchants.length)];
        const cat = pick === 'Supermarché' || pick === 'Boulangerie' ? 'cat_food'
          : (pick === 'Essence' || pick === 'VTC' ? 'cat_transport'
            : (pick === 'Pharmacie' ? 'cat_health'
              : (pick === 'Cinéma' || pick === 'Restaurant' || pick === 'Café' ? 'cat_fun' : 'cat_other')));
        const base = cat === 'cat_food' ? 8 : (cat === 'cat_transport' ? 12 : (cat === 'cat_fun' ? 14 : 10));
        const amount = Math.round((base + Math.random() * base * 2) * 100) / 100;
        tx.push({
          id: uid('tx'),
          date: iso,
          type: 'expense',
          amount,
          categoryId: cat,
          accountId: 'acc_main',
          label: pick,
          tags: []
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      schemaVersion: 1,
      meta: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currency: 'EUR',
        locale: 'fr-FR'
      },
      categories,
      budgets,
      accounts,
      recurring,
      transactions: tx
    };
  }

  // ------------------------------
  // App state
  // ------------------------------

  const App = {
    view: 'dashboard',
    // memory only
    token: null,
    cloudEnabled: false,
    cloudBusy: false,
    cloudLastSyncAt: null,
    cloudLastError: null,

    libsReady: false,

    cryptoKeyB64: null,

    // filters
    filters: {
      from: null,
      to: null,
      type: 'all',
      categoryId: 'all',
      accountId: 'all',
      q: ''
    },

    budget: buildDemoBudget(),

    // ephemeral UI
    toasts: [],
    charts: {
      echarts: new Map(),
      d3: new Map()
    },

    // debounced autosave
    _saveTimer: null
  };

  function markUpdated() {
    App.budget.meta.updatedAt = new Date().toISOString();
    if (App.cloudEnabled && App.token) {
      scheduleCloudSave();
    }
  }

  function scheduleCloudSave() {
    if (App._saveTimer) window.clearTimeout(App._saveTimer);
    App._saveTimer = window.setTimeout(() => {
      cloudSave().catch(() => {});
    }, 900);
  }

  // ------------------------------
  // Filters
  // ------------------------------

  function computeDefaultRange() {
    const tx = App.budget.transactions;
    if (!tx.length) return { from: null, to: null };
    const dates = tx.map((t) => t.date).sort();
    return { from: dates[0], to: dates[dates.length - 1] };
  }

  function applyFilters(transactions) {
    const { from, to, type, categoryId, accountId, q } = App.filters;
    const qn = String(q || '').trim().toLowerCase();

    return transactions.filter((t) => {
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      if (type !== 'all' && t.type !== type) return false;
      if (categoryId !== 'all' && (t.categoryId || 'none') !== categoryId) return false;
      if (accountId !== 'all' && t.accountId !== accountId) return false;
      if (qn) {
        const hay = `${t.label || ''} ${(t.tags || []).join(' ')} ${t.amount}`.toLowerCase();
        if (!hay.includes(qn)) return false;
      }
      return true;
    });
  }

  // ------------------------------
  // Budget math
  // ------------------------------

  function sum(arr) { return arr.reduce((a, b) => a + b, 0); }

  function groupBy(arr, keyFn) {
    const m = new Map();
    for (const item of arr) {
      const k = keyFn(item);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(item);
    }
    return m;
  }

  function monthKey(iso) { return String(iso).slice(0, 7); }

  function getCategoryName(catId) {
    if (!catId) return 'Sans catégorie';
    const c = App.budget.categories.find((x) => x.id === catId);
    return c ? c.name : 'Catégorie inconnue';
  }

  function buildKpis(filteredTx) {
    const expenses = filteredTx.filter((t) => t.type === 'expense');
    const incomes = filteredTx.filter((t) => t.type === 'income');
    const totalExpense = sum(expenses.map((t) => t.amount));
    const totalIncome = sum(incomes.map((t) => t.amount));
    const net = totalIncome - totalExpense;

    // monthly burn = avg expense per month in range
    const byMonth = groupBy(expenses, (t) => monthKey(t.date));
    const months = Array.from(byMonth.keys());
    const burn = months.length ? (totalExpense / months.length) : 0;

    const savingsRate = totalIncome > 0 ? (net / totalIncome) : 0;

    return {
      totalExpense,
      totalIncome,
      net,
      burn,
      savingsRate
    };
  }

  function computeNeedsWantsSavings(filteredTx) {
    const expenses = filteredTx.filter((t) => t.type === 'expense');
    const incomes = filteredTx.filter((t) => t.type === 'income');
    const totalIncome = sum(incomes.map((t) => t.amount));

    const needsCats = new Set(['cat_rent', 'cat_food', 'cat_transport', 'cat_health', 'cat_subs']);
    const needs = sum(expenses.filter((t) => needsCats.has(t.categoryId)).map((t) => t.amount));
    const wants = sum(expenses.filter((t) => !needsCats.has(t.categoryId)).map((t) => t.amount));
    const net = totalIncome - (needs + wants);
    const savings = Math.max(0, net);

    const pct = (x) => (totalIncome > 0 ? (x / totalIncome) * 100 : 0);

    return {
      totalIncome,
      needs,
      wants,
      savings,
      needsPct: pct(needs),
      wantsPct: pct(wants),
      savingsPct: pct(savings)
    };
  }

  function computeRunwayMonths(filteredTx, kpis) {
    // Estimated runway based on net positive cashflow within filter.
    const savingsEstimated = Math.max(0, kpis.net);
    const burn = kpis.burn || 0;
    const months = burn > 0 ? savingsEstimated / burn : 0;
    return { savingsEstimated, burn, months };
  }

  function weekdayNameFR(dow) {
    // JS: 0=Sunday
    const names = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    return names[dow] || 'jour';
  }

  function computeWeekdayComparison(filteredTx) {
    const expenses = filteredTx.filter((t) => t.type === 'expense');
    if (!expenses.length) {
      return {
        date: null,
        dow: null,
        dowName: null,
        dayTotal: 0,
        avg: 0,
        diff: 0,
        highlightDates: []
      };
    }

    const byDay = new Map();
    for (const t of expenses) {
      byDay.set(t.date, (byDay.get(t.date) || 0) + t.amount);
    }

    const dates = Array.from(byDay.keys()).sort();
    const date = dates[dates.length - 1];
    const dt = parseDateISO(date);
    const dow = dt ? dt.getUTCDay() : null;

    const dayTotal = byDay.get(date) || 0;

    // Compute avg for same weekday across range
    const totals = [];
    for (const [iso, total] of byDay.entries()) {
      const dti = parseDateISO(iso);
      if (!dti) continue;
      if (dti.getUTCDay() === dow) totals.push(total);
    }

    const avg = totals.length ? (sum(totals) / totals.length) : 0;
    const diff = dayTotal - avg;

    // Highlight same-weekday days significantly above avg
    const variance = totals.length ? (sum(totals.map((v) => (v - avg) ** 2)) / totals.length) : 0;
    const sd = Math.sqrt(variance) || 0;
    const threshold = avg + Math.max(0, sd * 1.0);

    const highlightDates = [];
    for (const [iso, total] of byDay.entries()) {
      const dti = parseDateISO(iso);
      if (!dti) continue;
      if (dti.getUTCDay() !== dow) continue;
      if (total >= threshold && total > 0) highlightDates.push([iso, Math.round(total * 100) / 100]);
    }

    return {
      date,
      dow,
      dowName: dow === null ? null : weekdayNameFR(dow),
      dayTotal,
      avg,
      diff,
      highlightDates
    };
  }

  function countNoSpendDays(filteredTx) {
    // No-spend day = no non-essential expense on that day. Essential expense is allowed.
    const expenses = filteredTx.filter((t) => t.type === 'expense');
    if (!expenses.length) return { month: null, count: 0, prevCount: 0 };

    const month = monthKey(expenses.map((t) => t.date).sort().slice(-1)[0]);
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();

    const prevDt = new Date(y, m - 2, 1);
    const prevMonth = `${prevDt.getFullYear()}-${String(prevDt.getMonth() + 1).padStart(2, '0')}`;
    const prevDays = new Date(prevDt.getFullYear(), prevDt.getMonth() + 1, 0).getDate();

    const needsCats = new Set(['cat_rent', 'cat_food', 'cat_transport', 'cat_health', 'cat_subs']);
    const wantsCats = new Set(App.budget.categories.map((c) => c.id).filter((id) => !needsCats.has(id)));

    const byDate = groupBy(expenses, (t) => t.date);

    const isNoSpend = (iso, monthPrefix) => {
      if (!iso.startsWith(monthPrefix)) return false;
      const arr = byDate.get(iso) || [];
      const nonEssential = sum(arr.filter((t) => wantsCats.has(t.categoryId)).map((t) => t.amount));
      return nonEssential <= 0;
    };

    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${month}-${String(d).padStart(2, '0')}`;
      if (isNoSpend(iso, month)) count++;
    }

    let prevCount = 0;
    for (let d = 1; d <= prevDays; d++) {
      const iso = `${prevMonth}-${String(d).padStart(2, '0')}`;
      if (isNoSpend(iso, prevMonth)) prevCount++;
    }

    return { month, count, prevCount };
  }

  function detectPriceHike(filteredTx) {
    // Detect same-label recurring expenses with an unusual increase.
    const expenses = filteredTx.filter((t) => t.type === 'expense' && t.label && t.amount >= 5);
    const byLabel = groupBy(expenses, (t) => (t.label || '').toLowerCase().trim());

    for (const [label, items] of byLabel.entries()) {
      if (!label || items.length < 4) continue;
      const sorted = items.slice().sort((a, b) => a.date.localeCompare(b.date));
      const last = sorted[sorted.length - 1];
      const prev = sorted[sorted.length - 2];
      if (!prev) continue;
      const inc = last.amount - prev.amount;
      const incPct = prev.amount > 0 ? inc / prev.amount : 0;
      if (inc > 1 && incPct >= 0.15) {
        return {
          label: items[0].label,
          from: prev.amount,
          to: last.amount,
          date: last.date
        };
      }
    }
    return null;
  }

  function categoryLability(filteredTx) {
    // Categories with the most month-to-month volatility (CV).
    const expenses = filteredTx.filter((t) => t.type === 'expense' && t.categoryId);
    const byCat = groupBy(expenses, (t) => t.categoryId);
    const out = [];
    for (const [cid, items] of byCat.entries()) {
      const byM = groupBy(items, (t) => monthKey(t.date));
      const vals = Array.from(byM.values()).map((arr) => sum(arr.map((t) => t.amount)));
      if (vals.length < 3) continue;
      const mean = sum(vals) / vals.length;
      const variance = sum(vals.map((v) => (v - mean) ** 2)) / vals.length;
      const cv = mean ? Math.sqrt(variance) / mean : 0;
      out.push({ categoryId: cid, cv, mean });
    }
    return out.sort((a, b) => b.cv - a.cv).slice(0, 3);
  }

  // ------------------------------
  // Advice engine
  // ------------------------------

  function buildAdvice(filteredTx) {
    const advice = [];
    const cats = App.budget.categories;
    const budgets = App.budget.budgets;

    const expenses = filteredTx.filter((t) => t.type === 'expense');
    const incomes = filteredTx.filter((t) => t.type === 'income');
    const totalExpense = sum(expenses.map((t) => t.amount));
    const totalIncome = sum(incomes.map((t) => t.amount));
    const net = totalIncome - totalExpense;

    const rangeMonths = Array.from(new Set(filteredTx.map((t) => monthKey(t.date)))).length || 1;

    // 1) Deficit
    if (totalIncome > 0 && net < 0) {
      advice.push({
        id: 'deficit',
        severity: 5,
        title: 'Déficit sur la période',
        message: `Sur la période filtrée, vos dépenses dépassent vos revenus de ${formatMoneyEUR(-net)}.`,
        action: 'Réduire 1-2 catégories variables et/ou augmenter la marge de sécurité.'
      });
    }

    // 2) Low savings rate
    const savingsRate = totalIncome > 0 ? (net / totalIncome) : 0;
    if (totalIncome > 0 && savingsRate < 0.05) {
      advice.push({
        id: 'low_savings',
        severity: 4,
        title: 'Taux d’épargne faible',
        message: `Votre taux d’épargne estimé est ${(savingsRate * 100).toFixed(1)}%.`,
        action: 'Fixer une cible (ex: 10%) et automatiser un virement dès réception du salaire.'
      });
    }

    // 3) Category overspend vs budget (approx by month)
    const expByCatMonth = new Map();
    for (const t of expenses) {
      const k = `${t.categoryId || 'none'}|${monthKey(t.date)}`;
      expByCatMonth.set(k, (expByCatMonth.get(k) || 0) + t.amount);
    }
    for (const b of budgets) {
      const catId = b.categoryId;
      // any month exceeding budget
      let worst = 0;
      let worstMonth = null;
      for (const [k, v] of expByCatMonth.entries()) {
        const [cid, mk] = k.split('|');
        if (cid !== catId) continue;
        const over = v - b.monthly;
        if (over > worst) { worst = over; worstMonth = mk; }
      }
      if (worst > 0) {
        advice.push({
          id: `over_${catId}`,
          severity: worst > b.monthly * 0.25 ? 4 : 3,
          title: `Budget dépassé: ${getCategoryName(catId)}`,
          message: worstMonth
            ? `Dépassement maximal ${formatMoneyEUR(worst)} sur ${worstMonth}.`
            : `Dépassement détecté.`,
          action: 'Créer une alerte, réduire les postes “faciles”, ou augmenter ce budget si réaliste.'
        });
      }
    }

    // 4) Too many small purchases (coffee effect)
    const small = expenses.filter((t) => t.amount > 0 && t.amount <= 8);
    if (small.length >= 20) {
      const tot = sum(small.map((t) => t.amount));
      advice.push({
        id: 'small_purchases',
        severity: 3,
        title: 'Accumulation de petites dépenses',
        message: `${small.length} dépenses ≤ 8€ pour ${formatMoneyEUR(tot)} sur la période.`,
        action: 'Regrouper (cash hebdo) ou fixer un mini-budget “petits plaisirs”.'
      });
    }

    // 5) Anomalies by z-score (simple)
    if (expenses.length >= 20) {
      const values = expenses.map((t) => t.amount);
      const mean = sum(values) / values.length;
      const variance = sum(values.map((v) => (v - mean) ** 2)) / values.length;
      const sd = Math.sqrt(variance) || 1;
      const anomalies = expenses.filter((t) => (t.amount - mean) / sd >= 3);
      if (anomalies.length) {
        const top = anomalies.sort((a, b) => b.amount - a.amount)[0];
        advice.push({
          id: 'anomaly',
          severity: 4,
          title: 'Dépense atypique détectée',
          message: `Une dépense sort du lot: ${formatMoneyEUR(top.amount)} (${top.label || 'sans libellé'}) le ${top.date}.`,
          action: 'Vérifier si c’est exceptionnel, remboursable, ou à anticiper dans le budget.'
        });
      }
    }

    // 6) Fixed charges ratio
    const fixedCats = new Set(cats.filter((c) => c.kind === 'fixed').map((c) => c.id));
    const fixedExpense = sum(expenses.filter((t) => fixedCats.has(t.categoryId)).map((t) => t.amount));
    const fixedRatio = totalIncome > 0 ? fixedExpense / totalIncome : 0;
    if (totalIncome > 0 && fixedRatio > 0.55) {
      advice.push({
        id: 'fixed_ratio',
        severity: fixedRatio > 0.70 ? 5 : 4,
        title: 'Charges fixes élevées',
        message: `Charges fixes ≈ ${(fixedRatio * 100).toFixed(0)}% de vos revenus sur la période.`,
        action: 'Renégocier / réduire abonnements, assurance, logement, ou augmenter les revenus.'
      });
    }

    // 7) Subscription detection (same label approx monthly)
    const byLabel = groupBy(expenses, (t) => (t.label || '').toLowerCase().trim());
    for (const [label, items] of byLabel.entries()) {
      if (!label || items.length < 3) continue;
      const months = new Set(items.map((t) => monthKey(t.date)));
      if (months.size >= 3) {
        const avg = sum(items.map((t) => t.amount)) / items.length;
        if (avg >= 5) {
          advice.push({
            id: `sub_${label}`,
            severity: 2,
            title: 'Abonnement potentiel',
            message: `Paiements récurrents détectés: “${items[0].label}” ~ ${formatMoneyEUR(avg)} (${months.size} mois).`,
            action: 'Lister vos abonnements et supprimer ceux peu utilisés.'
          });
          break;
        }
      }
    }

    // 8) Volatility (expenses)
    if (rangeMonths >= 3) {
      const expByMonth = groupBy(expenses, (t) => monthKey(t.date));
      const monthVals = Array.from(expByMonth.entries()).map(([mk, arr]) => ({ mk, v: sum(arr.map((t) => t.amount)) }));
      if (monthVals.length >= 3) {
        const vals = monthVals.map((x) => x.v);
        const mean = sum(vals) / vals.length;
        const variance = sum(vals.map((v) => (v - mean) ** 2)) / vals.length;
        const cv = mean ? Math.sqrt(variance) / mean : 0;
        if (cv > 0.25) {
          advice.push({
            id: 'volatility',
            severity: cv > 0.40 ? 4 : 3,
            title: 'Dépenses volatiles',
            message: `Vos dépenses varient beaucoup selon les mois (volatilité estimée ${(cv * 100).toFixed(0)}%).`,
            action: 'Créer un “fonds imprévus” et mieux catégoriser les dépenses exceptionnelles.'
          });
        }
      }
    }

    // 9) Unbudgeted category spending
    const budgetedCats = new Set(budgets.map((b) => b.categoryId));
    const expByCat = groupBy(expenses, (t) => t.categoryId || 'none');
    for (const [cid, items] of expByCat.entries()) {
      if (cid === 'none') continue;
      if (!budgetedCats.has(cid)) {
        const total = sum(items.map((t) => t.amount));
        if (total > 120) {
          advice.push({
            id: `unbudget_${cid}`,
            severity: 3,
            title: `Dépenses sans budget: ${getCategoryName(cid)}`,
            message: `Vous dépensez ${formatMoneyEUR(total)} sur cette catégorie sans budget mensuel défini.`,
            action: 'Ajouter un budget mensuel cible pour mieux piloter.'
          });
        }
      }
    }

    // 10) Price hike detection
    const hike = detectPriceHike(filteredTx);
    if (hike) {
      advice.push({
        id: 'price_hike',
        severity: 4,
        title: 'Hausse détectée sur un paiement récurrent',
        message: `“${hike.label}” est passé de ${formatMoneyEUR(hike.from)} à ${formatMoneyEUR(hike.to)} (le ${hike.date}).`,
        action: 'Vérifier l’abonnement/facture et renégocier ou résilier si nécessaire.'
      });
    }

    // 11) Lability (volatile categories)
    const lab = categoryLability(filteredTx);
    if (lab.length) {
      advice.push({
        id: 'lability',
        severity: 3,
        title: 'Catégories instables (labilité)',
        message: `Les variations mensuelles les plus fortes: ${lab.map((x) => getCategoryName(x.categoryId)).join(', ')}.`,
        action: 'Identifier les causes (prix, habitudes, exceptions) et lisser via enveloppes ou plafonds.'
      });
    }

    // Sort by severity desc, keep top
    return advice.sort((a, b) => b.severity - a.severity).slice(0, 10);
  }

  // ------------------------------
  // Community Data API
  // ------------------------------

  async function cloudLogin(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Login failed (${res.status}): ${txt || res.statusText}`);
    }
    const data = await res.json();
    if (!data || !data.token) throw new Error('Login response missing token');
    return data.token;
  }

  function packForCloud(budget) {
    if (!window.LZString) {
      throw new Error('Compression indisponible (LZString non chargé).');
    }
    const minimal = {
      schemaVersion: budget.schemaVersion,
      meta: budget.meta,
      categories: budget.categories,
      budgets: budget.budgets,
      accounts: budget.accounts,
      recurring: budget.recurring,
      transactions: budget.transactions
    };

    const json = JSON.stringify(minimal);
    const compressed = LZString.compressToBase64(json);

    return {
      v: 1,
      format: 'lz-base64',
      data: compressed,
      updatedAt: new Date().toISOString()
    };
  }

  function unpackFromCloud(payload) {
    if (!window.LZString) {
      throw new Error('Décompression indisponible (LZString non chargé).');
    }
    if (!payload || payload.v !== 1) throw new Error('Unsupported cloud payload');
    if (payload.format !== 'lz-base64') throw new Error('Unsupported cloud format');
    const json = LZString.decompressFromBase64(payload.data);
    if (!json) throw new Error('Cloud payload decompress failed');
    const obj = safeJsonParse(json);
    if (!obj || !obj.schemaVersion) throw new Error('Cloud payload invalid JSON');
    return obj;
  }

  async function communityFetch(path, { method = 'GET', body = null } = {}) {
    if (!App.token) throw new Error('Not authenticated (token missing)');
    const headers = { 'Authorization': `Bearer ${App.token}` };
    let payload;
    if (body !== null) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(path, { method, headers, body: payload });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      const err = new Error(`API ${method} ${path} failed (${res.status}): ${txt || res.statusText}`);
      err.status = res.status;
      throw err;
    }
    return res.json().catch(() => ({}));
  }

  async function cloudLoad() {
    App.cloudBusy = true;
    render();
    try {
      const url = `/api/community/${encodeURIComponent(EXTENSION_ID)}/${encodeURIComponent(COMMUNITY_COLLECTION)}/${encodeURIComponent(COMMUNITY_RECORD_KEY)}`;
      const record = await communityFetch(url);
      const loaded = unpackFromCloud(record.data);
      App.budget = loaded;
      App.cloudLastSyncAt = new Date().toISOString();
      App.cloudLastError = null;
      toast('success', 'Cloud', 'Données chargées depuis le cloud.');
      normalizeAfterLoad();
      render();
    } catch (e) {
      App.cloudLastError = String(e.message || e);
      toast('danger', 'Cloud', App.cloudLastError);
      render();
    } finally {
      App.cloudBusy = false;
      render();
    }
  }

  async function cloudSave() {
    if (!App.cloudEnabled) return;
    if (!App.token) {
      toast('warning', 'Cloud', 'Token manquant (connectez-vous).');
      return;
    }

    App.cloudBusy = true;
    render();
    try {
      const url = `/api/community/${encodeURIComponent(EXTENSION_ID)}/${encodeURIComponent(COMMUNITY_COLLECTION)}/${encodeURIComponent(COMMUNITY_RECORD_KEY)}`;
      const body = { data: packForCloud(App.budget) };
      await communityFetch(url, { method: 'PUT', body });
      App.cloudLastSyncAt = new Date().toISOString();
      App.cloudLastError = null;
      toast('success', 'Cloud', 'Sauvegarde cloud OK.');
    } catch (e) {
      App.cloudLastError = String(e.message || e);
      toast('danger', 'Cloud', App.cloudLastError);
    } finally {
      App.cloudBusy = false;
      render();
    }
  }

  // ------------------------------
  // Crypto export/import (memory only key)
  // ------------------------------

  function b64(bytes) {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  }

  function unb64(s) {
    const bin = atob(String(s || ''));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function ensureCryptoKey() {
    if (App.cryptoKeyB64) return App.cryptoKeyB64;
    const raw = crypto.getRandomValues(new Uint8Array(32));
    App.cryptoKeyB64 = b64(raw);
    render();
    toast('success', 'Clé', 'Clé générée (gardez-la en lieu sûr).');
    return App.cryptoKeyB64;
  }

  async function exportEncrypted() {
    const keyB64 = await ensureCryptoKey();
    const keyRaw = unb64(keyB64);
    const key = await crypto.subtle.importKey('raw', keyRaw, { name: 'AES-GCM' }, false, ['encrypt']);

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify({
      v: 1,
      schemaVersion: App.budget.schemaVersion,
      budget: App.budget,
      exportedAt: new Date().toISOString()
    }));

    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    const payload = {
      v: 1,
      alg: 'AES-GCM',
      iv: b64(iv),
      ct: b64(new Uint8Array(ct)),
      hint: 'Conservez la clé fournie par le site. Sans elle, impossible de restaurer.'
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `budget-${formatDateISO(new Date())}.ezgbudget.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('success', 'Export', 'Fichier exporté (chiffré).');
  }

  async function importEncrypted(file, keyB64) {
    const text = await file.text();
    const payload = safeJsonParse(text);
    if (!payload || payload.v !== 1 || payload.alg !== 'AES-GCM') throw new Error('Fichier invalide');
    const iv = unb64(payload.iv);
    const ct = unb64(payload.ct);

    const keyRaw = unb64(keyB64);
    const key = await crypto.subtle.importKey('raw', keyRaw, { name: 'AES-GCM' }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    const obj = safeJsonParse(new TextDecoder().decode(new Uint8Array(pt)));
    if (!obj || obj.v !== 1 || !obj.budget) throw new Error('Contenu déchiffré invalide');

    App.budget = obj.budget;
    App.cryptoKeyB64 = keyB64;
    normalizeAfterLoad();
    toast('success', 'Import', 'Données restaurées.');
    render();
  }

  function normalizeAfterLoad() {
    // Ensure dates are ISO strings and filters are set.
    if (!App.budget.meta) App.budget.meta = { updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(), currency: 'EUR', locale: 'fr-FR' };
    if (!Array.isArray(App.budget.transactions)) App.budget.transactions = [];
    if (!Array.isArray(App.budget.categories)) App.budget.categories = [];
    if (!Array.isArray(App.budget.budgets)) App.budget.budgets = [];
    if (!Array.isArray(App.budget.accounts)) App.budget.accounts = [];
    if (!Array.isArray(App.budget.recurring)) App.budget.recurring = [];

    const dr = computeDefaultRange();
    if (!App.filters.from) App.filters.from = dr.from;
    if (!App.filters.to) App.filters.to = dr.to;
  }

  // ------------------------------
  // CRUD (Data page)
  // ------------------------------

  function addTransaction(tx) {
    App.budget.transactions.unshift(tx);
    markUpdated();
    render();
  }

  function updateTransaction(id, patch) {
    const t = App.budget.transactions.find((x) => x.id === id);
    if (!t) return;
    Object.assign(t, patch);
    markUpdated();
    render();
  }

  function deleteTransaction(id) {
    App.budget.transactions = App.budget.transactions.filter((x) => x.id !== id);
    markUpdated();
    render();
  }

  // ------------------------------
  // Charts
  // ------------------------------

  function ensureEChart(el, key) {
    const prev = App.charts.echarts.get(key);
    if (prev && prev.getDom() === el) return prev;
    if (prev) { try { prev.dispose(); } catch {} }
    const chart = echarts.init(el, null, { renderer: 'canvas' });
    App.charts.echarts.set(key, chart);
    return chart;
  }

  function palette() {
    const styles = getComputedStyle(document.documentElement);
    return [
      styles.getPropertyValue('--ez-primary').trim(),
      styles.getPropertyValue('--ez-success').trim(),
      styles.getPropertyValue('--ez-warning').trim(),
      styles.getPropertyValue('--ez-danger').trim()
    ].filter(Boolean);
  }

  function commonEChartsOptions() {
    const styles = getComputedStyle(document.documentElement);
    const text = styles.getPropertyValue('--ez-text').trim() || '#e5e7eb';
    const muted = styles.getPropertyValue('--ez-muted').trim() || 'rgba(229,231,235,0.75)';
    const border = styles.getPropertyValue('--ez-border').trim() || 'rgba(255,255,255,0.12)';

    return {
      color: palette(),
      textStyle: { color: text },
      tooltip: {
        trigger: 'axis',
        borderColor: border,
        backgroundColor: 'rgba(0,0,0,0.35)',
        textStyle: { color: text }
      },
      grid: { left: 44, right: 20, top: 30, bottom: 36, containLabel: true },
      xAxis: { axisLine: { lineStyle: { color: border } }, axisLabel: { color: muted } },
      yAxis: { axisLine: { lineStyle: { color: border } }, splitLine: { lineStyle: { color: border } }, axisLabel: { color: muted } }
    };
  }

  function buildSeriesByMonth(filteredTx) {
    const byMonth = groupBy(filteredTx, (t) => monthKey(t.date));
    const months = Array.from(byMonth.keys()).sort();
    const incomes = [];
    const expenses = [];
    const net = [];
    for (const mk of months) {
      const arr = byMonth.get(mk);
      const inc = sum(arr.filter((t) => t.type === 'income').map((t) => t.amount));
      const exp = sum(arr.filter((t) => t.type === 'expense').map((t) => t.amount));
      incomes.push(inc);
      expenses.push(exp);
      net.push(inc - exp);
    }
    return { months, incomes, expenses, net };
  }

  function forecastNext3Months(filteredTx) {
    // Simple: project expense/income based on last 3 months avg + recurring baseline.
    const { months, incomes, expenses } = buildSeriesByMonth(filteredTx);
    const last = months.slice(-3);
    const idx = months.map((m) => m);
    const incVals = incomes.slice(-3);
    const expVals = expenses.slice(-3);

    const incAvg = incVals.length ? (sum(incVals) / incVals.length) : 0;
    const expAvg = expVals.length ? (sum(expVals) / expVals.length) : 0;

    // recurring baseline
    const recInc = sum(App.budget.recurring.filter((r) => r.type === 'income').map((r) => r.amount));
    const recExp = sum(App.budget.recurring.filter((r) => r.type === 'expense').map((r) => r.amount));

    const baseInc = Math.max(incAvg, recInc);
    const baseExp = Math.max(expAvg, recExp);

    // derive next months keys
    const latest = months.length ? months[months.length - 1] : formatDateISO(new Date()).slice(0, 7);
    const [y, m] = latest.split('-').map(Number);
    const nextKeys = [];
    const incF = [];
    const expF = [];
    for (let i = 1; i <= 3; i++) {
      const dt = new Date(Date.UTC(y, m - 1 + i, 1));
      const mk = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
      nextKeys.push(mk);
      // slight trend: if last 3 months increasing, tilt
      const incTrend = incVals.length >= 2 ? (incVals[incVals.length - 1] - incVals[0]) / (incVals.length - 1) : 0;
      const expTrend = expVals.length >= 2 ? (expVals[expVals.length - 1] - expVals[0]) / (expVals.length - 1) : 0;
      incF.push(Math.max(0, baseInc + incTrend * i));
      expF.push(Math.max(0, baseExp + expTrend * i));
    }

    return {
      keys: idx.concat(nextKeys),
      inc: incomes.concat(incF),
      exp: expenses.concat(expF),
      splitIndex: idx.length
    };
  }

  function renderChartsDashboard(root, filteredTx) {
    if (!window.echarts || !window.d3 || !window.LZString) return;

    const monthly = buildSeriesByMonth(filteredTx);

    // 1) Income vs expenses
    const el1 = $('.chart-income-expense', root);
    if (el1) {
      const chart = ensureEChart(el1, 'incomeExpense');
      const common = commonEChartsOptions();
      chart.setOption({
        ...common,
        legend: { data: ['Revenus', 'Dépenses'], textStyle: { color: common.textStyle.color } },
        xAxis: { ...common.xAxis, type: 'category', data: monthly.months },
        yAxis: { ...common.yAxis, type: 'value' },
        series: [
          { name: 'Revenus', type: 'bar', data: monthly.incomes, emphasis: { focus: 'series' } },
          { name: 'Dépenses', type: 'bar', data: monthly.expenses, emphasis: { focus: 'series' } }
        ]
      }, true);
    }

    // 2) Category donut
    const el2 = $('.chart-donut', root);
    if (el2) {
      const chart = ensureEChart(el2, 'donut');
      const expenses = filteredTx.filter((t) => t.type === 'expense');
      const byCat = groupBy(expenses, (t) => t.categoryId || 'none');
      const data = Array.from(byCat.entries()).map(([cid, arr]) => ({
        name: getCategoryName(cid === 'none' ? null : cid),
        value: sum(arr.map((t) => t.amount))
      })).sort((a, b) => b.value - a.value).slice(0, 10);

      chart.setOption({
        color: palette(),
        tooltip: { trigger: 'item', borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(0,0,0,0.35)' },
        series: [
          {
            type: 'pie',
            radius: ['52%', '78%'],
            avoidLabelOverlap: true,
            itemStyle: { borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1 },
            label: { color: 'rgba(229,231,235,0.75)' },
            data
          }
        ]
      }, true);
    }

    // 3) Waterfall net
    const el3 = $('.chart-waterfall', root);
    if (el3) {
      const chart = ensureEChart(el3, 'waterfall');
      const { months, incomes, expenses } = monthly;
      const common = commonEChartsOptions();
      const net = months.map((_, i) => (incomes[i] || 0) - (expenses[i] || 0));
      chart.setOption({
        ...common,
        tooltip: { ...common.tooltip, trigger: 'axis' },
        xAxis: { ...common.xAxis, type: 'category', data: months },
        yAxis: { ...common.yAxis, type: 'value' },
        series: [
          {
            name: 'Net',
            type: 'bar',
            data: net,
            itemStyle: {
              color: (p) => (p.value >= 0 ? getComputedStyle(document.documentElement).getPropertyValue('--ez-success').trim() : getComputedStyle(document.documentElement).getPropertyValue('--ez-danger').trim())
            }
          }
        ]
      }, true);
    }

    // 4) Forecast line
    const el4 = $('.chart-forecast', root);
    if (el4) {
      const chart = ensureEChart(el4, 'forecast');
      const f = forecastNext3Months(filteredTx);
      const common = commonEChartsOptions();
      const net = f.keys.map((_, i) => (f.inc[i] || 0) - (f.exp[i] || 0));

      chart.setOption({
        ...common,
        legend: { data: ['Revenus', 'Dépenses', 'Net'], textStyle: { color: common.textStyle.color } },
        xAxis: { ...common.xAxis, type: 'category', data: f.keys },
        yAxis: { ...common.yAxis, type: 'value' },
        series: [
          { name: 'Revenus', type: 'line', smooth: true, data: f.inc },
          { name: 'Dépenses', type: 'line', smooth: true, data: f.exp },
          {
            name: 'Net',
            type: 'line',
            smooth: true,
            data: net,
            lineStyle: { width: 2 },
            markLine: {
              symbol: 'none',
              data: [{ xAxis: f.splitIndex - 0.5, label: { formatter: 'Prévisionnel', color: 'rgba(229,231,235,0.75)' } }]
            }
          }
        ]
      }, true);
    }

    // 5) D3 streamgraph signature
    const el5 = $('.d3-stream', root);
    if (el5) {
      renderStreamgraph(el5, filteredTx);
    }

    // 6) Sankey cashflow
    const el6 = $('.chart-sankey', root);
    if (el6) {
      const chart = ensureEChart(el6, 'sankey');
      const expenses = filteredTx.filter((t) => t.type === 'expense');
      const incomes = filteredTx.filter((t) => t.type === 'income');
      const totalIncome = sum(incomes.map((t) => t.amount));
      const totalExpense = sum(expenses.map((t) => t.amount));
      const savings = Math.max(0, totalIncome - totalExpense);

      const needsCats = new Set(['cat_rent', 'cat_food', 'cat_transport', 'cat_health', 'cat_subs']);
      const byCat = groupBy(expenses, (t) => t.categoryId || 'none');

      const nodes = [{ name: 'Revenus' }, { name: 'Besoins' }, { name: 'Envies' }, { name: 'Épargne' }];
      const links = [];

      const needsByCat = [];
      const wantsByCat = [];
      for (const [cid, arr] of byCat.entries()) {
        const v = sum(arr.map((t) => t.amount));
        const name = getCategoryName(cid === 'none' ? null : cid);
        const isNeed = cid !== 'none' && needsCats.has(cid);
        (isNeed ? needsByCat : wantsByCat).push({ cid, name, v });
      }
      needsByCat.sort((a, b) => b.v - a.v);
      wantsByCat.sort((a, b) => b.v - a.v);

      const cap = (arr, max) => {
        if (arr.length <= max) return { top: arr, other: 0 };
        const top = arr.slice(0, max);
        const other = sum(arr.slice(max).map((x) => x.v));
        return { top, other };
      };

      const needsCap = cap(needsByCat, 8);
      const wantsCap = cap(wantsByCat, 8);

      const needsTotal = sum(needsByCat.map((x) => x.v));
      const wantsTotal = sum(wantsByCat.map((x) => x.v));

      // Revenue splits
      if (needsTotal > 0) links.push({ source: 'Revenus', target: 'Besoins', value: needsTotal });
      if (wantsTotal > 0) links.push({ source: 'Revenus', target: 'Envies', value: wantsTotal });
      if (savings > 0) links.push({ source: 'Revenus', target: 'Épargne', value: savings });

      // Needs -> categories
      for (const c of needsCap.top) {
        nodes.push({ name: c.name });
        links.push({ source: 'Besoins', target: c.name, value: c.v });
      }
      if (needsCap.other > 0) {
        const otherName = 'Autres besoins';
        nodes.push({ name: otherName });
        links.push({ source: 'Besoins', target: otherName, value: needsCap.other });
      }

      // Wants -> categories
      for (const c of wantsCap.top) {
        // Prevent accidental duplicates between needs/wants names
        const exists = nodes.some((n) => n.name === c.name);
        if (!exists) nodes.push({ name: c.name });
        links.push({ source: 'Envies', target: c.name, value: c.v });
      }
      if (wantsCap.other > 0) {
        const otherName = 'Autres envies';
        nodes.push({ name: otherName });
        links.push({ source: 'Envies', target: otherName, value: wantsCap.other });
      }

      chart.setOption({
        color: palette(),
        tooltip: { trigger: 'item', borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(0,0,0,0.35)' },
        series: [{
          type: 'sankey',
          emphasis: { focus: 'adjacency' },
          nodeAlign: 'justify',
          nodeGap: 10,
          nodeWidth: 14,
          data: nodes,
          links,
          lineStyle: { color: 'source', opacity: 0.35 },
          itemStyle: { borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1 }
        }]
      }, true);
    }

    // 7) Calendar heatmap (daily expenses)
    const el7 = $('.chart-calendar', root);
    if (el7) {
      const chart = ensureEChart(el7, 'calendar');
      const expenses = filteredTx.filter((t) => t.type === 'expense');
      const byDay = new Map();
      for (const t of expenses) {
        byDay.set(t.date, (byDay.get(t.date) || 0) + t.amount);
      }
      const dates = Array.from(byDay.keys()).sort();
      const range = dates.length ? [dates[0], dates[dates.length - 1]] : null;
      const data = dates.map((d) => [d, Math.round(byDay.get(d) * 100) / 100]);

      const wd = computeWeekdayComparison(filteredTx);
      const highlights = wd.highlightDates || [];

      const styles = getComputedStyle(document.documentElement);
      const border = styles.getPropertyValue('--ez-border').trim();
      const text = styles.getPropertyValue('--ez-text').trim();
      const muted = styles.getPropertyValue('--ez-muted').trim();

      chart.setOption({
        tooltip: { position: 'top', borderColor: border, backgroundColor: 'rgba(0,0,0,0.35)' },
        visualMap: {
          min: 0,
          max: Math.max(10, ...data.map((x) => x[1])),
          calculable: false,
          orient: 'horizontal',
          left: 'center',
          bottom: 0,
          textStyle: { color: muted },
          inRange: { color: [styles.getPropertyValue('--ez-primary-soft').trim() || 'rgba(14,165,164,0.22)', styles.getPropertyValue('--ez-primary').trim() || '#0ea5a4'] }
        },
        calendar: {
          top: 30,
          left: 30,
          right: 20,
          cellSize: ['auto', 16],
          range: range || formatDateISO(new Date()).slice(0, 7),
          itemStyle: { borderWidth: 1, borderColor: border },
          yearLabel: { show: false, color: text },
          monthLabel: { color: muted },
          dayLabel: { color: muted }
        },
        series: [
          {
            type: 'heatmap',
            coordinateSystem: 'calendar',
            data
          },
          {
            // Overlay highlights (same weekday and above-average): makes patterns pop.
            type: 'scatter',
            coordinateSystem: 'calendar',
            data: highlights,
            symbolSize: 12,
            itemStyle: {
              color: 'transparent',
              borderWidth: 2,
              borderColor: styles.getPropertyValue('--ez-warning').trim() || '#f59e0b'
            },
            tooltip: {
              formatter: (p) => {
                const v = p.value;
                return `${escapeHtml(v[0])}<br/>Sur-dépense (vs moyenne du ${escapeHtml(wd.dowName || '')})<br/>${formatMoneyEUR(v[1])}`;
              }
            },
            z: 10
          }
        ]
      }, true);
    }

    // 8) Radar 50/30/20
    const el8 = $('.chart-radar', root);
    if (el8) {
      const chart = ensureEChart(el8, 'radar');
      const nws = computeNeedsWantsSavings(filteredTx);

      chart.setOption({
        color: palette(),
        tooltip: { trigger: 'item', borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(0,0,0,0.35)' },
        radar: {
          indicator: [
            { name: 'Besoins', max: 80 },
            { name: 'Envies', max: 80 },
            { name: 'Épargne', max: 80 }
          ],
          splitNumber: 4,
          axisName: { color: 'rgba(229,231,235,0.75)' },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } },
          splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.00)'] } }
        },
        series: [{
          type: 'radar',
          data: [
            { name: 'Actuel', value: [nws.needsPct, nws.wantsPct, nws.savingsPct] },
            { name: 'Idéal 50/30/20', value: [50, 30, 20] }
          ],
          areaStyle: { opacity: 0.12 }
        }]
      }, true);
    }

    // 9) Scatter: amount vs merchant frequency
    const el9 = $('.chart-scatter', root);
    if (el9) {
      const chart = ensureEChart(el9, 'scatter');
      const expenses = filteredTx.filter((t) => t.type === 'expense' && t.amount > 0);
      const byLabel = groupBy(expenses, (t) => (t.label || '').toLowerCase().trim() || '—');
      const freq = new Map();
      for (const [lbl, arr] of byLabel.entries()) freq.set(lbl, arr.length);
      const pts = expenses.map((t) => {
        const lbl = (t.label || '').toLowerCase().trim() || '—';
        return {
          value: [t.amount, freq.get(lbl) || 1],
          label: t.label || '—',
          date: t.date,
          category: getCategoryName(t.categoryId)
        };
      });

      const common = commonEChartsOptions();
      chart.setOption({
        ...common,
        tooltip: {
          ...common.tooltip,
          trigger: 'item',
          formatter: (p) => {
            const d = p.data;
            return `${escapeHtml(d.label)}<br/>${escapeHtml(d.date)} — ${escapeHtml(d.category)}<br/>Montant: ${formatMoneyEUR(d.value[0])}<br/>Fréquence enseigne: ${d.value[1]}`;
          }
        },
        xAxis: { ...common.xAxis, type: 'value', name: 'Montant', nameTextStyle: { color: 'rgba(229,231,235,0.75)' } },
        yAxis: { ...common.yAxis, type: 'value', name: 'Fréquence', nameTextStyle: { color: 'rgba(229,231,235,0.75)' } },
        series: [{
          type: 'scatter',
          data: pts,
          symbolSize: (v) => clamp(Math.sqrt(v[0]) * 2.2, 6, 28),
          itemStyle: { opacity: 0.8 }
        }]
      }, true);
    }

    // resize
    window.setTimeout(() => {
      for (const c of App.charts.echarts.values()) {
        try { c.resize(); } catch {}
      }
    }, 0);
  }

  function renderStreamgraph(container, filteredTx) {
    const key = 'd3_stream';
    const w = container.clientWidth || 600;
    const h = container.clientHeight || 260;

    const expenses = filteredTx.filter((t) => t.type === 'expense');
    const byMonth = groupBy(expenses, (t) => monthKey(t.date));
    const months = Array.from(byMonth.keys()).sort();

    // pick top 6 categories
    const byCat = groupBy(expenses, (t) => t.categoryId || 'none');
    const topCats = Array.from(byCat.entries())
      .map(([cid, arr]) => ({ cid, total: sum(arr.map((t) => t.amount)) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
      .map((x) => x.cid);

    const rows = months.map((mk) => {
      const arr = byMonth.get(mk) || [];
      const out = { month: mk };
      for (const cid of topCats) out[cid] = 0;
      for (const t of arr) {
        const cid = topCats.includes(t.categoryId || 'none') ? (t.categoryId || 'none') : null;
        if (cid) out[cid] += t.amount;
      }
      return out;
    });

    container.innerHTML = '';

    const svg = d3.select(container)
      .append('svg')
      .attr('width', w)
      .attr('height', h);

    const keys = topCats;

    const stack = d3.stack()
      .keys(keys)
      .offset(d3.stackOffsetWiggle);

    const series = stack(rows);

    const x = d3.scalePoint().domain(months).range([36, w - 10]);
    const y = d3.scaleLinear()
      .domain([
        d3.min(series, (s) => d3.min(s, (d) => d[0])),
        d3.max(series, (s) => d3.max(s, (d) => d[1]))
      ])
      .range([h - 26, 16]);

    const styles = getComputedStyle(document.documentElement);
    const border = styles.getPropertyValue('--ez-border').trim();
    const muted = styles.getPropertyValue('--ez-muted').trim();
    const primarySoft = styles.getPropertyValue('--ez-primary-soft').trim();
    const colors = palette();

    const area = d3.area()
      .x((d, i) => x(months[i]))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveCatmullRom.alpha(0.6));

    const g = svg.append('g');

    g.selectAll('path')
      .data(series)
      .enter()
      .append('path')
      .attr('d', area)
      .attr('fill', (d, i) => colors[i % colors.length] || primarySoft)
      .attr('fill-opacity', 0.7)
      .attr('stroke', border)
      .attr('stroke-width', 1)
      .attr('opacity', 0)
      .transition()
      .duration(500)
      .attr('opacity', 1);

    // axis
    const axis = svg.append('g');
    axis.append('line')
      .attr('x1', 16)
      .attr('x2', w - 10)
      .attr('y1', h - 22)
      .attr('y2', h - 22)
      .attr('stroke', border);

    axis.selectAll('text')
      .data(months.slice(-6))
      .enter()
      .append('text')
      .attr('x', (mk) => x(mk))
      .attr('y', h - 6)
      .attr('fill', muted)
      .attr('font-size', 11)
      .attr('text-anchor', 'middle')
      .text((mk) => mk);

    // legend
    const legend = svg.append('g').attr('transform', `translate(16, 12)`);
    keys.slice(0, 4).forEach((cid, i) => {
      const row = legend.append('g').attr('transform', `translate(${i * 160}, 0)`);
      row.append('rect')
        .attr('x', 0)
        .attr('y', -8)
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', colors[i % colors.length] || styles.getPropertyValue('--ez-primary').trim());
      row.append('text')
        .attr('x', 14)
        .attr('y', 0)
        .attr('fill', muted)
        .attr('font-size', 11)
        .text(getCategoryName(cid === 'none' ? null : cid));
    });

    App.charts.d3.set(key, { svg });
  }

  // ------------------------------
  // Rendering
  // ------------------------------

  function renderToasts() {
    let wrap = $('.toastwrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toastwrap';
      document.body.appendChild(wrap);
    }
    wrap.innerHTML = '';
    for (const t of App.toasts.slice(-4)) {
      const el = document.createElement('div');
      el.className = 'toast';
      el.innerHTML = `<div class="t-title">${escapeHtml(t.title)}</div><div class="t-msg">${escapeHtml(t.msg)}</div>`;
      wrap.appendChild(el);
    }
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function render() {
    const root = $('#app');
    if (!root) return;

    const dr = computeDefaultRange();
    if (!App.filters.from) App.filters.from = dr.from;
    if (!App.filters.to) App.filters.to = dr.to;

    const filteredTx = applyFilters(App.budget.transactions);
    const kpis = buildKpis(filteredTx);

    root.innerHTML = `
      <div class="shell">
        <aside class="sidebar ez-fade-in">
          <div class="brand">
            <div>
              <div class="brand-title">Budget Graphique</div>
              <div class="brand-sub">SPA • mémoire-only • cloud optionnel</div>
            </div>
            <div class="pill ez-floaty">WOW</div>
          </div>
          <div class="nav">
            ${navButton('dashboard', 'Dashboard', 'Graphiques + conseils')}
            ${navButton('data', 'Données', 'Transactions + budgets')}
            ${navButton('settings', 'Configuration', 'Cloud + export chiffré')}
          </div>
          <div class="ez-hr"></div>
          <div class="ez-muted">
            <div><span class="ez-code">Mode</span> ${App.cloudEnabled ? 'Cloud (opt-in)' : 'Local (session)'}</div>
            <div><span class="ez-code">Token</span> ${App.token ? 'OK (mémoire)' : '—'}</div>
            <div><span class="ez-code">Maj</span> ${escapeHtml(App.budget.meta.updatedAt || '')}</div>
          </div>
        </aside>

        <main class="main">
          <header class="topbar ez-fade-in">
            <div class="filters">
              ${filterField('Du', `<input type="date" data-f="from" value="${escapeHtml(App.filters.from || '')}" />`)}
              ${filterField('Au', `<input type="date" data-f="to" value="${escapeHtml(App.filters.to || '')}" />`)}
              ${filterField('Type', `
                <select data-f="type">
                  <option value="all" ${App.filters.type === 'all' ? 'selected' : ''}>Tout</option>
                  <option value="expense" ${App.filters.type === 'expense' ? 'selected' : ''}>Dépenses</option>
                  <option value="income" ${App.filters.type === 'income' ? 'selected' : ''}>Revenus</option>
                </select>
              `)}
              ${filterField('Catégorie', buildCategorySelect())}
              ${filterField('Compte', buildAccountSelect())}
              ${filterField('Recherche', `<input placeholder="libellé, tag…" data-f="q" value="${escapeHtml(App.filters.q)}" />`)}
            </div>
            <div class="actions">
              <button class="btn" data-act="demo">Données démo</button>
              <button class="btn primary" data-act="reset">Reset</button>
            </div>
          </header>

          ${App.view === 'dashboard' ? renderDashboard(filteredTx, kpis) : ''}
          ${App.view === 'data' ? renderData(filteredTx) : ''}
          ${App.view === 'settings' ? renderSettings() : ''}
        </main>
      </div>
    `;

    bindEvents(root);

    if (App.view === 'dashboard') {
      renderChartsDashboard(root, filteredTx);
    }
  }

  function navButton(view, title, subtitle) {
    const current = App.view === view ? 'aria-current="page"' : '';
    return `
      <button class="navbtn" data-nav="${view}" ${current}>
        <span>
          <div style="font-weight:700;">${escapeHtml(title)}</div>
          <div style="font-size:12px;color:var(--muted);">${escapeHtml(subtitle)}</div>
        </span>
        <span class="pill">${App.view === view ? 'ON' : 'GO'}</span>
      </button>
    `;
  }

  function filterField(label, inner) {
    return `<div class="field"><label>${escapeHtml(label)}</label>${inner}</div>`;
  }

  function buildCategorySelect() {
    const opts = ['<option value="all">Toutes</option>']
      .concat(App.budget.categories.map((c) => `<option value="${escapeHtml(c.id)}" ${App.filters.categoryId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`));
    return `<select data-f="categoryId">${opts.join('')}</select>`;
  }

  function buildAccountSelect() {
    const opts = ['<option value="all">Tous</option>']
      .concat(App.budget.accounts.map((a) => `<option value="${escapeHtml(a.id)}" ${App.filters.accountId === a.id ? 'selected' : ''}>${escapeHtml(a.name)}</option>`));
    return `<select data-f="accountId">${opts.join('')}</select>`;
  }

  function renderDashboard(filteredTx, kpis) {
    const advice = buildAdvice(filteredTx);
    const nws = computeNeedsWantsSavings(filteredTx);
    const runway = computeRunwayMonths(filteredTx, kpis);
    const nsd = countNoSpendDays(filteredTx);
    const hike = detectPriceHike(filteredTx);
    const wd = computeWeekdayComparison(filteredTx);

    const libsOk = Boolean(window.echarts && window.d3 && window.LZString);
    const libsBanner = libsOk ? '' : `
      <div class="card ez-pop" style="grid-column: span 12;">
        <h3>Librairies graphiques non chargées</h3>
        <div class="ez-muted">
          L’interface fonctionne, mais les graphiques “WOW” ne peuvent pas s’afficher.
          Causes fréquentes : réseau indisponible, CSP/iframe qui bloque les scripts externes.
          Solution recommandée : utiliser des fichiers locaux (vendor) ou autoriser l’accès réseau.
        </div>
      </div>
    `;

    return `
      <section class="grid ez-fade-in">
        ${libsBanner}
        <div class="card" style="grid-column: span 3;">
          <h3>Dépenses</h3>
          <div class="kpi"><div class="value">${formatMoneyEUR(kpis.totalExpense)}</div><div class="badge">${filteredTx.length} ops</div></div>
          <div class="hint">Total dépenses (filtre)</div>
        </div>
        <div class="card" style="grid-column: span 3;">
          <h3>Revenus</h3>
          <div class="kpi"><div class="value">${formatMoneyEUR(kpis.totalIncome)}</div><div class="badge">période</div></div>
          <div class="hint">Total revenus (filtre)</div>
        </div>
        <div class="card" style="grid-column: span 3;">
          <h3>Net</h3>
          <div class="kpi"><div class="value">${formatMoneyEUR(kpis.net)}</div><div class="badge">${(kpis.savingsRate * 100).toFixed(1)}%</div></div>
          <div class="hint">Revenus - Dépenses</div>
        </div>
        <div class="card" style="grid-column: span 3;">
          <h3>Burn mensuel</h3>
          <div class="kpi"><div class="value">${formatMoneyEUR(kpis.burn)}</div><div class="badge">moy.</div></div>
          <div class="hint">Dépenses moyennes par mois</div>
        </div>

        <div class="card" style="grid-column: span 8; min-height: 320px;">
          <h3>Revenus vs Dépenses (mensuel)</h3>
          <div class="chart-income-expense" style="width:100%;height:260px;"></div>
        </div>
        <div class="card" style="grid-column: span 4; min-height: 320px;">
          <h3>Répartition des dépenses</h3>
          <div class="chart-donut" style="width:100%;height:260px;"></div>
        </div>

        <div class="card" style="grid-column: span 6; min-height: 320px;">
          <h3>Net par mois</h3>
          <div class="chart-waterfall" style="width:100%;height:260px;"></div>
        </div>
        <div class="card" style="grid-column: span 6; min-height: 320px;">
          <h3>Prévisionnel (3 mois)</h3>
          <div class="chart-forecast" style="width:100%;height:260px;"></div>
        </div>

        <div class="card" style="grid-column: span 12; min-height: 340px;">
          <h3>Streamgraph (signature D3) — dépenses top catégories</h3>
          <div class="d3-stream" style="width:100%;height:280px;"></div>
        </div>

        <div class="card" style="grid-column: span 12; min-height: 360px;">
          <h3>Flux de trésorerie (Sankey) — où part l’argent</h3>
          <div class="chart-sankey" style="width:100%;height:300px;"></div>
        </div>

        <div class="card" style="grid-column: span 7; min-height: 340px;">
          <h3>Heatmap calendrier — intensité des dépenses</h3>
          <div class="chart-calendar" style="width:100%;height:280px;"></div>
        </div>
        <div class="card" style="grid-column: span 5; min-height: 340px;">
          <h3>Radar 50/30/20 — équilibre de vie</h3>
          <div class="chart-radar" style="width:100%;height:280px;"></div>
        </div>

        <div class="card" style="grid-column: span 12; min-height: 340px;">
          <h3>Nuage de points — petites dépenses répétitives</h3>
          <div class="chart-scatter" style="width:100%;height:280px;"></div>
        </div>

        <div class="card" style="grid-column: span 12;">
          <h3>Ce que les chiffres bruts cachent</h3>
          <div class="split">
            <div class="card" style="min-height: 160px;">
              <h3>Besoin vs Envie</h3>
              <div class="ez-muted">Sur vos revenus, ${nws.needsPct.toFixed(0)}% besoins, ${nws.wantsPct.toFixed(0)}% envies, ${nws.savingsPct.toFixed(0)}% épargne.</div>
              <div class="ez-hr"></div>
              <div class="ez-muted"><b>Marge de manœuvre</b> — ${formatMoneyEUR(Math.max(0, nws.totalIncome - nws.needs))} après besoins.</div>
            </div>
            <div class="card" style="min-height: 160px;">
              <h3>Runway (autonomie)</h3>
              <div class="ez-muted">Si vos revenus s’arrêtaient, l’épargne estimée sur la période (${formatMoneyEUR(runway.savingsEstimated)}) couvre ~ <b>${runway.months.toFixed(1)} mois</b> au burn actuel.</div>
              <div class="ez-hr"></div>
              <div class="ez-muted"><b>Burn</b> — ${formatMoneyEUR(runway.burn)} / mois (moyenne).</div>
            </div>
          </div>

          <div class="split" style="margin-top: 14px;">
            <div class="card" style="min-height: 160px;">
              <h3>No-spend days</h3>
              <div class="ez-muted">${nsd.month ? `Sur ${nsd.month}: <b>${nsd.count}</b> jours sans dépense non-essentielle.` : 'Données insuffisantes.'}</div>
              <div class="ez-hr"></div>
              <div class="ez-muted">Δ vs mois précédent: ${(nsd.count - nsd.prevCount) >= 0 ? '+' : ''}${nsd.count - nsd.prevCount}</div>
            </div>
            <div class="card" style="min-height: 160px;">
              <h3>Alertes intelligentes</h3>
              <div class="ez-muted">${hike ? `Hausse détectée: <b>${escapeHtml(hike.label)}</b> (${formatMoneyEUR(hike.from)} → ${formatMoneyEUR(hike.to)}).` : 'Aucune hausse évidente détectée sur un paiement récurrent.'}</div>
              <div class="ez-hr"></div>
              <div class="ez-muted">Astuce: utilisez le nuage de points pour trouver les petites dépenses répétitives.</div>
            </div>
          </div>

          <div class="split" style="margin-top: 14px;">
            <div class="card" style="min-height: 160px;">
              <h3>Comparaison vs moyenne</h3>
              <div class="ez-muted">${wd.date ? `Le ${escapeHtml(wd.dowName)} ${escapeHtml(wd.date)}, vous avez dépensé ${formatMoneyEUR(wd.dayTotal)}.` : 'Données insuffisantes.'}</div>
              <div class="ez-hr"></div>
              <div class="ez-muted">${wd.date ? `Moyenne des ${escapeHtml(wd.dowName)}: ${formatMoneyEUR(wd.avg)} → écart ${(wd.diff >= 0 ? '+' : '')}${formatMoneyEUR(wd.diff)}.` : ''}</div>
              <div class="ez-hr"></div>
              <div class="ez-muted">Les ${escapeHtml(wd.dowName || '')} au-dessus de la moyenne sont <b>surlignés</b> dans la heatmap.</div>
            </div>
            <div class="card" style="min-height: 160px;">
              <h3>What-if (simple)</h3>
              <div class="ez-muted">En réduisant vos dépenses “Envies” de 15%, vous augmenteriez votre épargne estimée de ${formatMoneyEUR(Math.max(0, nws.wants * 0.15))} sur la période.</div>
              <div class="ez-hr"></div>
              <div class="ez-muted">Objectif: convertir une habitude en marge récurrente (le “vrai” levier).</div>
            </div>
          </div>
        </div>

        <div class="card" style="grid-column: span 12;">
          <h3>Conseils intelligents (priorisés)</h3>
          ${advice.length ? advice.map(renderAdviceCard).join('') : `<div class="ez-muted">Aucun conseil critique sur ce filtre. Essayez une période plus large.</div>`}
        </div>
      </section>
    `;
  }

  function renderAdviceCard(a) {
    const sev = clamp(a.severity, 1, 5);
    const pill = sev >= 5 ? 'Critique' : (sev >= 4 ? 'Important' : (sev >= 3 ? 'À surveiller' : 'Info'));
    return `
      <div class="card ez-pop" style="margin: 10px 0;">
        <div class="kpi">
          <div>
            <div style="font-weight:800;">${escapeHtml(a.title)}</div>
            <div class="ez-muted">${escapeHtml(a.message)}</div>
          </div>
          <div class="badge">${escapeHtml(pill)}</div>
        </div>
        <div class="ez-hr"></div>
        <div class="ez-muted"><b>Action</b> — ${escapeHtml(a.action)}</div>
      </div>
    `;
  }

  function renderData(filteredTx) {
    const cats = App.budget.categories;

    return `
      <section class="grid ez-fade-in">
        <div class="card" style="grid-column: span 12;">
          <h3>Ajouter une opération</h3>
          <div class="split">
            <div class="field"><label>Date</label><input type="date" data-new="date" value="${escapeHtml(formatDateISO(new Date()))}"/></div>
            <div class="field"><label>Type</label>
              <select data-new="type">
                <option value="expense">Dépense</option>
                <option value="income">Revenu</option>
              </select>
            </div>
            <div class="field"><label>Montant</label><input type="number" step="0.01" data-new="amount" placeholder="0.00"/></div>
            <div class="field"><label>Catégorie</label>
              <select data-new="categoryId">
                <option value="">Sans catégorie</option>
                ${cats.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>Compte</label>
              <select data-new="accountId">
                ${App.budget.accounts.map((a) => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>Libellé</label><input data-new="label" placeholder="Ex: Supermarché"/></div>
          </div>
          <div style="margin-top: 10px; display:flex; gap: 10px;">
            <button class="btn primary" data-act="addTx">Ajouter</button>
            <div class="ez-muted">La page ne sauvegarde rien automatiquement (mémoire seulement) — utilisez export/cloud.</div>
          </div>
        </div>

        <div class="card" style="grid-column: span 12;">
          <h3>Transactions (filtrées)</h3>
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Catégorie</th>
                <th>Libellé</th>
                <th>Montant</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${filteredTx.slice(0, 250).map(renderTxRow).join('')}
            </tbody>
          </table>
          <div class="ez-muted" style="margin-top:10px;">Affichage limité à 250 lignes pour rester fluide.</div>
        </div>
      </section>
    `;
  }

  function renderTxRow(t) {
    const kind = t.type === 'income' ? 'Revenu' : 'Dépense';
    const sign = t.type === 'income' ? 1 : -1;
    const amt = formatMoneyEUR(sign * t.amount);
    return `
      <tr>
        <td>${escapeHtml(t.date)}</td>
        <td>${escapeHtml(kind)}</td>
        <td>${escapeHtml(getCategoryName(t.categoryId))}</td>
        <td>${escapeHtml(t.label || '')}</td>
        <td>${escapeHtml(amt)}</td>
        <td>
          <div class="row-actions">
            <button class="btn" data-act="editTx" data-id="${escapeHtml(t.id)}">Éditer</button>
            <button class="btn" data-act="delTx" data-id="${escapeHtml(t.id)}">Suppr.</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderSettings() {
    return `
      <section class="grid ez-fade-in">
        <div class="card" style="grid-column: span 12;">
          <h3>Mode & Sécurité</h3>
          <div class="ez-muted">
            Par défaut, rien n’est sauvegardé en cloud. La sauvegarde cloud est un opt-in explicite.
            Le token EZGalaxy est conservé en mémoire uniquement (perdu au refresh).
          </div>
        </div>

        <div class="card" style="grid-column: span 6;">
          <h3>Sauvegarde cloud (Community Data API)</h3>
          <div style="display:flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            <button class="btn ${App.cloudEnabled ? 'primary' : ''}" data-act="toggleCloud">${App.cloudEnabled ? 'Cloud activé' : 'Activer cloud'}</button>
            <span class="badge">${App.cloudBusy ? '…' : (App.cloudLastSyncAt ? `Sync: ${escapeHtml(App.cloudLastSyncAt)}` : 'Pas de sync')}</span>
          </div>
          <div class="ez-hr"></div>

          <div class="field" style="margin: 8px 0;"><label>Email</label><input data-login="email" placeholder="email" /></div>
          <div class="field" style="margin: 8px 0;"><label>Mot de passe</label><input type="password" data-login="password" placeholder="••••••" /></div>
          <div style="display:flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn primary" data-act="login">Se connecter</button>
            <button class="btn" data-act="forgetToken">Oublier token</button>
            <button class="btn" data-act="cloudLoad">Charger</button>
            <button class="btn" data-act="cloudSave">Sauvegarder</button>
          </div>
          ${App.cloudLastError ? `<div class="ez-hr"></div><div class="ez-muted">Erreur: ${escapeHtml(App.cloudLastError)}</div>` : ''}
          <div class="ez-hr"></div>
          <details>
            <summary class="ez-muted">Documentation API (Community Data)</summary>
            <div class="ez-muted" style="margin-top:8px;">
              <div><span class="ez-code">POST /api/auth/login</span> → { token }</div>
              <div><span class="ez-code">GET /api/community/${EXTENSION_ID}/${COMMUNITY_COLLECTION}</span></div>
              <div><span class="ez-code">GET /api/community/${EXTENSION_ID}/${COMMUNITY_COLLECTION}/${COMMUNITY_RECORD_KEY}</span></div>
              <div><span class="ez-code">PUT /api/community/${EXTENSION_ID}/${COMMUNITY_COLLECTION}/${COMMUNITY_RECORD_KEY}</span> body: { data: {...} }</div>
              <div><span class="ez-code">DELETE /api/community/${EXTENSION_ID}/${COMMUNITY_COLLECTION}/${COMMUNITY_RECORD_KEY}</span></div>
              <div style="margin-top:8px;">Headers: <span class="ez-code">Authorization: Bearer &lt;SANCTUM_TOKEN&gt;</span></div>
              <div style="margin-top:8px;">Limites typiques: 16KB JSON, throttle 120 req/min/token (voir doc instance).</div>
            </div>
          </details>
        </div>

        <div class="card" style="grid-column: span 6;">
          <h3>Export / Import chiffré (fichier)</h3>
          <div class="ez-muted">La clé est “donnée par le site” : ici elle est générée et affichée (mémoire seulement).</div>
          <div class="ez-hr"></div>
          <div style="display:flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn primary" data-act="genKey">Générer clé</button>
            <button class="btn" data-act="export">Exporter (chiffré)</button>
          </div>
          <div class="ez-hr"></div>
          <div class="field"><label>Clé (base64)</label><input data-key="b64" value="${escapeHtml(App.cryptoKeyB64 || '')}" placeholder="Cliquez sur Générer clé"/></div>
          <div class="ez-hr"></div>
          <div class="field"><label>Importer</label><input type="file" data-import="file" accept="application/json"/></div>
          <div style="margin-top:10px;">
            <button class="btn primary" data-act="import">Importer (déchiffrer)</button>
          </div>
        </div>

        <div class="card" style="grid-column: span 12;">
          <h3>Outils</h3>
          <div style="display:flex; gap:10px; flex-wrap: wrap;">
            <button class="btn" data-act="rebuildDemo">Recharger démo</button>
            <button class="btn" data-act="wipe">Vider les données</button>
          </div>
          <div class="ez-muted" style="margin-top:10px;">Astuce: si votre dataset devient trop gros pour le cloud (limite JSON), utilisez l’export chiffré.</div>
        </div>
      </section>
    `;
  }

  function bindEvents(root) {
    // nav
    $$("[data-nav]", root).forEach((b) => {
      b.addEventListener('click', () => {
        App.view = b.getAttribute('data-nav');
        render();
      });
    });

    // filters
    $$("[data-f]", root).forEach((el) => {
      el.addEventListener('input', () => {
        const k = el.getAttribute('data-f');
        App.filters[k] = el.value;
        render();
      });
      el.addEventListener('change', () => {
        const k = el.getAttribute('data-f');
        App.filters[k] = el.value;
        render();
      });
    });

    // actions
    $$("[data-act]", root).forEach((el) => {
      el.addEventListener('click', async () => {
        const act = el.getAttribute('data-act');
        try {
          await handleAction(act, root, el);
        } catch (e) {
          toast('danger', 'Erreur', String(e.message || e));
        }
      });
    });
  }

  async function handleAction(act, root, el) {
    if (act === 'demo' || act === 'rebuildDemo') {
      App.budget = buildDemoBudget();
      const dr = computeDefaultRange();
      App.filters.from = dr.from;
      App.filters.to = dr.to;
      markUpdated();
      toast('success', 'Démo', 'Données de démonstration chargées.');
      render();
      return;
    }

    if (act === 'reset') {
      const dr = computeDefaultRange();
      App.filters = { ...App.filters, from: dr.from, to: dr.to, type: 'all', categoryId: 'all', accountId: 'all', q: '' };
      render();
      return;
    }

    if (act === 'wipe') {
      App.budget.transactions = [];
      markUpdated();
      toast('warning', 'Données', 'Toutes les transactions ont été supprimées (mémoire).');
      render();
      return;
    }

    if (act === 'addTx') {
      const date = $('[data-new="date"]', root).value;
      const type = $('[data-new="type"]', root).value;
      const amount = Number($('[data-new="amount"]', root).value);
      const categoryId = $('[data-new="categoryId"]', root).value || null;
      const accountId = $('[data-new="accountId"]', root).value;
      const label = $('[data-new="label"]', root).value;

      if (!date) throw new Error('Date manquante');
      if (!amount || amount <= 0) throw new Error('Montant invalide');

      addTransaction({
        id: uid('tx'),
        date,
        type,
        amount: Math.round(amount * 100) / 100,
        categoryId,
        accountId,
        label,
        tags: []
      });
      toast('success', 'Données', 'Transaction ajoutée.');
      return;
    }

    if (act === 'delTx') {
      const id = el.getAttribute('data-id');
      deleteTransaction(id);
      toast('warning', 'Données', 'Transaction supprimée.');
      return;
    }

    if (act === 'editTx') {
      const id = el.getAttribute('data-id');
      const t = App.budget.transactions.find((x) => x.id === id);
      if (!t) return;
      const newLabel = prompt('Libellé', t.label || '');
      if (newLabel === null) return;
      updateTransaction(id, { label: newLabel });
      toast('success', 'Données', 'Libellé mis à jour.');
      return;
    }

    if (act === 'toggleCloud') {
      App.cloudEnabled = !App.cloudEnabled;
      toast('success', 'Cloud', App.cloudEnabled ? 'Cloud activé (opt-in).' : 'Cloud désactivé.');
      render();
      return;
    }

    if (act === 'login') {
      const email = $('[data-login="email"]', root).value;
      const password = $('[data-login="password"]', root).value;
      if (!email || !password) throw new Error('Email/mot de passe requis');
      const token = await cloudLogin(email, password);
      App.token = token;
      toast('success', 'Auth', 'Token récupéré (mémoire seulement).');
      render();
      return;
    }

    if (act === 'forgetToken') {
      App.token = null;
      toast('warning', 'Auth', 'Token oublié (mémoire).');
      render();
      return;
    }

    if (act === 'cloudLoad') {
      await cloudLoad();
      return;
    }

    if (act === 'cloudSave') {
      await cloudSave();
      return;
    }

    if (act === 'genKey') {
      await ensureCryptoKey();
      render();
      return;
    }

    if (act === 'export') {
      await exportEncrypted();
      return;
    }

    if (act === 'import') {
      const fileInput = $('[data-import="file"]', root);
      const keyInput = $('[data-key="b64"]', root);
      const file = fileInput.files && fileInput.files[0];
      const keyB64 = keyInput.value;
      if (!file) throw new Error('Sélectionnez un fichier');
      if (!keyB64) throw new Error('Entrez la clé');
      await importEncrypted(file, keyB64);
      return;
    }
  }

  // Boot
  function boot() {
    normalizeAfterLoad();

    // Render immediately so the page is never blank.
    render();

    // Resize: keep it simple (SPA re-render). Charts will re-init when available.
    window.addEventListener('resize', () => render());

    // Observe libs availability (ECharts/D3/LZString). If they load later, re-render once.
    const wait = () => {
      const ok = Boolean(window.echarts && window.d3 && window.LZString);
      if (ok && !App.libsReady) {
        App.libsReady = true;
        toast('success', 'Graphiques', 'Librairies chargées.');
        render();
        return;
      }
      if (!ok) window.setTimeout(wait, 120);
    };
    wait();
  }

  boot();
})();
