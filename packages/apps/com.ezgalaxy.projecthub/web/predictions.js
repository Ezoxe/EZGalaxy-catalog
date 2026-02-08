/* ═══════════════════════════════════════════════════════════════
   Project Hub — Predictions Engine
   v2.0.0 — Client-side intelligence: predictions, NLP, autocomplete
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Duration Predictor ─────────────────────────────────── */
  function predictDuration(taskData) {
    const state = Store.getState();
    const doneTasks = state.tasks.filter(t => t.status === 'done' && t.spentHours > 0);
    if (doneTasks.length < 3) return { predicted: taskData.estimateHours || 8, confidence: 0.3, basis: 'default' };

    // Category factor
    const catTasks = doneTasks.filter(t => t.category === taskData.category);
    let catFactor = 1;
    if (catTasks.length >= 2) {
      const ratios = catTasks.map(t => t.spentHours / Math.max(t.estimateHours, 1));
      catFactor = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    }

    // Assignee factor
    let assigneeFactor = 1;
    if (taskData.assignee) {
      const aTasks = doneTasks.filter(t => t.assignee === taskData.assignee);
      if (aTasks.length >= 2) {
        const ratios = aTasks.map(t => t.spentHours / Math.max(t.estimateHours, 1));
        assigneeFactor = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      }
    }

    // Priority factor
    const prioWeights = { critical: 1.15, high: 1.05, medium: 1.0, low: 0.9 };
    const prioFactor = prioWeights[taskData.priority] || 1;

    const base = taskData.estimateHours || 8;
    const predicted = Math.round(base * catFactor * assigneeFactor * prioFactor * 10) / 10;
    const confidence = Math.min(0.9, 0.3 + catTasks.length * 0.1 + (taskData.assignee ? 0.1 : 0));

    return { predicted, confidence, basis: 'historical', catFactor, assigneeFactor, prioFactor };
  }

  /* ── Sprint Velocity Forecast ───────────────────────────── */
  function forecastVelocity() {
    const history = Store.getState().history;
    if (history.length < 14) return { optimistic: 15, likely: 12, pessimistic: 9, trend: 'stable' };

    const recent = history.slice(-30);
    const velocities = recent.map(h => h.velocity);
    const avg = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const stdDev = Math.sqrt(velocities.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / velocities.length);

    // Trend: linear regression on last 14 days
    const last14 = velocities.slice(-14);
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    last14.forEach((y, i) => { sumX += i; sumY += y; sumXY += i * y; sumX2 += i * i; });
    const n = last14.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const trend = slope > 0.2 ? 'up' : slope < -0.2 ? 'down' : 'stable';

    const projected = avg + slope * 7; // 7 days ahead
    return {
      optimistic: Math.round(projected + stdDev),
      likely: Math.round(projected),
      pessimistic: Math.max(1, Math.round(projected - stdDev)),
      trend,
      slope: Math.round(slope * 100) / 100,
      avgVelocity: Math.round(avg * 10) / 10,
    };
  }

  /* ── Risk Detection ─────────────────────────────────────── */
  function analyzeRisks() {
    const state = Store.getState();
    const tasks = state.tasks.filter(t => t.status !== 'done');
    const now = new Date();
    const risks = [];

    // Overdue tasks
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now);
    if (overdue.length > 0) {
      risks.push({
        type: 'overdue', severity: Math.min(100, overdue.length * 20),
        title: `${overdue.length} tâche(s) en retard`,
        detail: overdue.map(t => t.title).join(', '),
        recommendation: 'Réévaluer les priorités et réassigner si nécessaire',
        tasks: overdue.map(t => t.id),
      });
    }

    // Blocked tasks
    const blocked = tasks.filter(t => t.status === 'blocked');
    if (blocked.length > 0) {
      risks.push({
        type: 'blocked', severity: Math.min(90, blocked.length * 25),
        title: `${blocked.length} tâche(s) bloquée(s)`,
        detail: blocked.map(t => t.title).join(', '),
        recommendation: 'Investiguer les blocages et débloquer en priorité',
        tasks: blocked.map(t => t.id),
      });
    }

    // Overloaded team members
    const overloaded = state.collaborators.filter(c => c.workload > 100);
    if (overloaded.length > 0) {
      risks.push({
        type: 'overload', severity: Math.min(80, overloaded.length * 20),
        title: `${overloaded.length} membre(s) surchargé(s)`,
        detail: overloaded.map(c => `${c.name} (${c.workload}%)`).join(', '),
        recommendation: 'Redistribuer les tâches vers les membres disponibles',
      });
    }

    // Tasks approaching deadline with low progress
    const approaching = tasks.filter(t => {
      if (!t.dueDate) return false;
      const daysLeft = Math.ceil((new Date(t.dueDate) - now) / 86400000);
      return daysLeft > 0 && daysLeft <= 3 && t.progress < 70;
    });
    if (approaching.length > 0) {
      risks.push({
        type: 'deadline', severity: Math.min(75, approaching.length * 20),
        title: `${approaching.length} tâche(s) proche(s) de l'échéance`,
        detail: approaching.map(t => `${t.title} (${t.progress}%)`).join(', '),
        recommendation: 'Augmenter les efforts ou repousser les dates',
        tasks: approaching.map(t => t.id),
      });
    }

    // Unassigned tasks with approaching deadlines
    const unassigned = tasks.filter(t => !t.assignee && t.dueDate && new Date(t.dueDate) - now < 7 * 86400000);
    if (unassigned.length > 0) {
      risks.push({
        type: 'unassigned', severity: Math.min(60, unassigned.length * 15),
        title: `${unassigned.length} tâche(s) non assignée(s)`,
        detail: unassigned.map(t => t.title).join(', '),
        recommendation: 'Assigner ces tâches immédiatement',
        tasks: unassigned.map(t => t.id),
      });
    }

    // Dependency chain risks
    const depChains = findLongDependencyChains(state.tasks);
    if (depChains.length > 0) {
      risks.push({
        type: 'dependency', severity: Math.min(70, depChains.length * 15),
        title: `${depChains.length} chaîne(s) de dépendances longue(s)`,
        detail: `Chaîne la plus longue: ${depChains[0].length} tâches`,
        recommendation: 'Paralléliser les tâches si possible',
      });
    }

    // Overall risk score (0-100)
    const totalScore = risks.length === 0 ? 0 : Math.min(100, Math.round(risks.reduce((s, r) => s + r.severity, 0) / risks.length));
    return { score: totalScore, risks, count: risks.length };
  }

  function findLongDependencyChains(tasks) {
    const taskMap = {};
    tasks.forEach(t => { taskMap[t.id] = t; });
    const chains = [];

    function walkChain(taskId, visited = []) {
      if (visited.includes(taskId)) return visited; // cycle
      visited.push(taskId);
      const task = taskMap[taskId];
      if (!task || !task.dependencies || task.dependencies.length === 0) return visited;
      let longest = visited;
      task.dependencies.forEach(depId => {
        const chain = walkChain(depId, [...visited]);
        if (chain.length > longest.length) longest = chain;
      });
      return longest;
    }

    tasks.forEach(t => {
      const chain = walkChain(t.id);
      if (chain.length >= 3) chains.push(chain);
    });

    return chains.sort((a, b) => b.length - a.length).slice(0, 5);
  }

  /* ── Sprint Success Probability ─────────────────────────── */
  function sprintSuccessProbability() {
    const state = Store.getState();
    const sprint = state.project.sprint;
    if (!sprint) return { probability: 50, factors: {} };

    const now = new Date();
    const end = new Date(sprint.endDate);
    const start = new Date(sprint.startDate);
    const totalDays = Math.max(1, (end - start) / 86400000);
    const daysLeft = Math.max(0, (end - now) / 86400000);
    const elapsed = 1 - (daysLeft / totalDays);

    const tasks = state.tasks;
    const sprintTasks = tasks.filter(t => t.startDate && new Date(t.startDate) >= new Date(sprint.startDate));
    const total = sprintTasks.length || tasks.length;
    const done = sprintTasks.filter(t => t.status === 'done').length || tasks.filter(t => t.status === 'done').length;
    const completion = total ? done / total : 0;

    // Factor: completion vs time elapsed
    const paceFactor = elapsed > 0 ? Math.min(1, completion / elapsed) : 1;

    // Factor: blocked tasks
    const blockedCount = tasks.filter(t => t.status === 'blocked').length;
    const blockFactor = Math.max(0.5, 1 - blockedCount * 0.1);

    // Factor: overloaded members
    const overloaded = state.collaborators.filter(c => c.workload > 100).length;
    const loadFactor = Math.max(0.6, 1 - overloaded * 0.08);

    // Factor: velocity trend
    const vf = forecastVelocity();
    const trendFactor = vf.trend === 'up' ? 1.1 : vf.trend === 'down' ? 0.85 : 1;

    const raw = paceFactor * blockFactor * loadFactor * trendFactor * 100;
    const probability = Math.max(5, Math.min(98, Math.round(raw)));

    return {
      probability,
      factors: {
        pace: Math.round(paceFactor * 100),
        blocking: Math.round(blockFactor * 100),
        teamLoad: Math.round(loadFactor * 100),
        velocityTrend: Math.round(trendFactor * 100),
      },
      daysLeft: Math.round(daysLeft),
      elapsed: Math.round(elapsed * 100),
      completion: Math.round(completion * 100),
    };
  }

  /* ── Burndown Prediction ────────────────────────────────── */
  function predictBurndown() {
    const state = Store.getState();
    const history = state.history;
    const tasks = state.tasks;
    const remaining = tasks.filter(t => t.status !== 'done').length;

    if (history.length < 7) {
      return { predictedDays: remaining * 2, confidence: 0.3, data: [] };
    }

    const recent = history.slice(-14);
    const avgDailyComplete = recent.reduce((s, h) => s + h.tasksCompleted, 0) / recent.length;
    const predictedDays = avgDailyComplete > 0 ? Math.ceil(remaining / avgDailyComplete) : 999;

    // Build prediction data points
    const data = [];
    let count = remaining;
    for (let i = 0; i <= Math.min(predictedDays + 5, 60); i++) {
      const dt = new Date(); dt.setDate(dt.getDate() + i);
      data.push({
        date: dt.toISOString().slice(0, 10),
        ideal: Math.max(0, Math.round(remaining * (1 - i / Math.max(predictedDays, 1)))),
        predicted: Math.max(0, Math.round(count)),
        optimistic: Math.max(0, Math.round(count * 0.85)),
        pessimistic: Math.round(count * 1.15),
      });
      count -= avgDailyComplete + (Math.random() - 0.5) * avgDailyComplete * 0.3;
      if (count < 0) count = 0;
    }

    return {
      predictedDays,
      confidence: Math.min(0.85, 0.4 + recent.length * 0.03),
      avgDailyComplete: Math.round(avgDailyComplete * 10) / 10,
      remaining,
      data,
    };
  }

  /* ── Smart Priority Recommendations ─────────────────────── */
  function recommendPriorities() {
    const state = Store.getState();
    const tasks = state.tasks.filter(t => t.status !== 'done');
    const now = new Date();
    const recommendations = [];

    tasks.forEach(t => {
      let suggestedPriority = t.priority;
      const reasons = [];

      // Deadline proximity
      if (t.dueDate) {
        const daysLeft = (new Date(t.dueDate) - now) / 86400000;
        if (daysLeft < 2 && t.priority !== 'critical') {
          suggestedPriority = 'critical';
          reasons.push('Échéance imminente');
        } else if (daysLeft < 5 && (t.priority === 'low' || t.priority === 'medium')) {
          suggestedPriority = 'high';
          reasons.push('Échéance proche');
        }
      }

      // Blocking other tasks
      const blocking = tasks.filter(other => other.dependencies && other.dependencies.includes(t.id));
      if (blocking.length >= 2 && t.priority !== 'critical') {
        suggestedPriority = 'high';
        reasons.push(`Bloque ${blocking.length} autres tâches`);
      }

      // Low progress + upcoming deadline
      if (t.dueDate && t.progress < 30) {
        const daysLeft = (new Date(t.dueDate) - now) / 86400000;
        if (daysLeft < 7 && t.priority === 'low') {
          suggestedPriority = 'medium';
          reasons.push('Progression faible, échéance proche');
        }
      }

      if (suggestedPriority !== t.priority) {
        recommendations.push({ taskId: t.id, taskTitle: t.title, current: t.priority, suggested: suggestedPriority, reasons });
      }
    });

    return recommendations.sort((a, b) => {
      const pr = { critical: 0, high: 1, medium: 2, low: 3 };
      return (pr[a.suggested] || 3) - (pr[b.suggested] || 3);
    });
  }

  /* ── Workload Balancer ──────────────────────────────────── */
  function suggestReassignments() {
    const state = Store.getState();
    const collabs = state.collaborators;
    const tasks = state.tasks.filter(t => t.status !== 'done');
    const suggestions = [];

    const overloaded = collabs.filter(c => c.workload > 95);
    const available = collabs.filter(c => c.workload < 70).sort((a, b) => a.workload - b.workload);

    if (available.length === 0 || overloaded.length === 0) return suggestions;

    overloaded.forEach(member => {
      const memberTasks = tasks.filter(t => t.assignee === member.id).sort((a, b) => {
        const pr = { low: 0, medium: 1, high: 2, critical: 3 };
        return (pr[a.priority] || 0) - (pr[b.priority] || 0); // least critical first
      });

      memberTasks.slice(0, 2).forEach(task => {
        // Find a member with matching skills
        const bestMatch = available.find(c => {
          const catSkillMap = {
            frontend: ['React', 'Vue.js', 'TypeScript', 'CSS', 'Animation', 'Tailwind', 'WebGL'],
            backend: ['Python', 'Django', 'Node.js', 'PostgreSQL', 'Redis', 'SQL', 'GraphQL'],
            design: ['Figma', 'CSS', 'User Research', 'Prototyping'],
            devops: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'],
            testing: ['Selenium', 'Jest', 'Cypress', 'Performance'],
            docs: ['Jira', 'Analytics'],
          };
          const relevant = catSkillMap[task.category] || [];
          return c.skills.some(s => relevant.includes(s));
        }) || available[0];

        if (bestMatch) {
          suggestions.push({
            taskId: task.id, taskTitle: task.title,
            from: { id: member.id, name: member.name, workload: member.workload },
            to: { id: bestMatch.id, name: bestMatch.name, workload: bestMatch.workload },
            reason: `${member.name} est surchargé(e) (${member.workload}%), ${bestMatch.name} est disponible (${bestMatch.workload}%)`,
          });
        }
      });
    });

    return suggestions;
  }

  /* ── Today's Focus ──────────────────────────────────────── */
  function suggestTodaysFocus() {
    const state = Store.getState();
    const now = new Date();
    const tasks = state.tasks.filter(t => t.status !== 'done' && t.status !== 'backlog');

    const scored = tasks.map(t => {
      let score = 0;

      // Priority weight
      const prw = { critical: 40, high: 25, medium: 10, low: 2 };
      score += prw[t.priority] || 5;

      // Deadline proximity
      if (t.dueDate) {
        const dl = (new Date(t.dueDate) - now) / 86400000;
        if (dl < 0) score += 50; // overdue
        else if (dl < 1) score += 35;
        else if (dl < 3) score += 20;
        else if (dl < 7) score += 8;
      }

      // Already in progress
      if (t.status === 'in-progress') score += 15;
      if (t.status === 'review') score += 10;

      // Blocks other tasks
      const blocking = state.tasks.filter(o => o.dependencies && o.dependencies.includes(t.id) && o.status !== 'done');
      score += blocking.length * 8;

      // Progress momentum (prefer tasks with some progress to avoid context switching)
      if (t.progress > 20 && t.progress < 90) score += 10;

      return { ...t, _score: score };
    });

    return scored.sort((a, b) => b._score - a._score).slice(0, 5).map(t => ({
      id: t.id, title: t.title, priority: t.priority, status: t.status,
      score: t._score, dueDate: t.dueDate, progress: t.progress, assignee: t.assignee,
    }));
  }

  /* ── Task Auto-Suggester ────────────────────────────────── */
  function suggestNextTasks() {
    const state = Store.getState();
    const doneTasks = state.tasks.filter(t => t.status === 'done');
    const existingTitles = new Set(state.tasks.map(t => t.title.toLowerCase()));
    const suggestions = [];

    const patterns = [
      { trigger: /design|maquette|figma/i, next: ['Intégration maquettes', 'Review design', 'Tests utilisabilité'] },
      { trigger: /api|endpoint|backend/i, next: ['Documentation API', 'Tests API', 'Monitoring API'] },
      { trigger: /test/i, next: ['Correction bugs trouvés', 'Rapport de tests', 'Tests de performance'] },
      { trigger: /migration|database/i, next: ['Vérification données migrées', 'Optimisation requêtes', 'Backup automatique'] },
      { trigger: /ci\/cd|pipeline|deploy/i, next: ['Monitoring production', 'Alerting', 'Rollback strategy'] },
      { trigger: /auth|login|jwt/i, next: ['2FA implementation', 'OAuth integration', 'Session management'] },
      { trigger: /notification/i, next: ['Preferences notifications', 'Templates emails', 'Push mobile'] },
      { trigger: /performance|optim/i, next: ['Load testing', 'CDN setup', 'Database indexing'] },
    ];

    doneTasks.forEach(t => {
      patterns.forEach(p => {
        if (p.trigger.test(t.title)) {
          p.next.forEach(suggestion => {
            if (!existingTitles.has(suggestion.toLowerCase())) {
              suggestions.push({
                title: suggestion,
                reason: `Suite logique de "${t.title}"`,
                category: t.category,
                priority: 'medium',
              });
              existingTitles.add(suggestion.toLowerCase());
            }
          });
        }
      });
    });

    return suggestions.slice(0, 6);
  }

  /* ── Natural Language Task Parser ───────────────────────── */
  function parseNaturalTask(text) {
    const state = Store.getState();
    const collabs = state.collaborators;
    const result = { title: '', description: '', priority: 'medium', category: null, assignee: null, dueDate: null, tags: [] };

    // Priority detection (FR + EN)
    if (/\b(critique|critical|urgente?|urgent)\b/i.test(text)) { result.priority = 'critical'; text = text.replace(/\b(critique|critical|urgente?|urgent)\b/i, ''); }
    else if (/\b(haute?|high|importante?|important)\b/i.test(text)) { result.priority = 'high'; text = text.replace(/\b(haute?|high|importante?|important)\b/i, ''); }
    else if (/\b(basse?|low|mineure?|minor)\b/i.test(text)) { result.priority = 'low'; text = text.replace(/\b(basse?|low|mineure?|minor)\b/i, ''); }

    // Category detection
    const catPatterns = {
      design: /\b(design|ui|ux|maquette|figma|mockup|wireframe|logo|interface)\b/i,
      frontend: /\b(frontend|front|react|vue|angular|css|html|composant|component|page|animation)\b/i,
      backend: /\b(backend|back|api|serveur|server|database|base de donn|endpoint|graphql|rest)\b/i,
      devops: /\b(devops|deploy|ci\/cd|docker|kubernetes|k8s|infra|pipeline|monitoring)\b/i,
      testing: /\b(test|qa|quality|selenium|cypress|jest|bug|audit|sécurité|security)\b/i,
      docs: /\b(doc|documentation|readme|wiki|guide|tutoriel|tutorial)\b/i,
      research: /\b(research|recherche|poc|prototype|exploration|benchmark)\b/i,
      management: /\b(gestion|management|planning|sprint|meeting|réunion|roadmap)\b/i,
    };
    for (const [cat, pattern] of Object.entries(catPatterns)) {
      if (pattern.test(text)) { result.category = cat; break; }
    }

    // Assignee detection — match collaborator names (first name or full name)
    for (const c of collabs) {
      const firstName = c.name.split(' ')[0];
      const regex = new RegExp('\\b(pour|for|assign|à)\\s+' + firstName, 'i');
      const directRegex = new RegExp('\\b' + firstName + '\\b', 'i');
      if (regex.test(text)) {
        result.assignee = c.id;
        text = text.replace(regex, '');
        break;
      } else if (directRegex.test(text) && text.toLowerCase().includes(firstName.toLowerCase())) {
        // Only match direct name if it's clearly an assignee context
        const nameIdx = text.toLowerCase().indexOf(firstName.toLowerCase());
        const before = text.slice(Math.max(0, nameIdx - 10), nameIdx).toLowerCase();
        if (/pour|for|assign|à/.test(before)) {
          result.assignee = c.id;
          text = text.replace(directRegex, '');
          break;
        }
      }
    }

    // Due date parsing
    const now = new Date();
    const datePatterns = [
      { pattern: /\b(aujourd'?hui|today)\b/i, days: 0 },
      { pattern: /\b(demain|tomorrow)\b/i, days: 1 },
      { pattern: /\b(après[- ]demain|day after tomorrow)\b/i, days: 2 },
      { pattern: /\bdans\s+(\d+)\s*jours?\b/i, fn: (m) => parseInt(m[1]) },
      { pattern: /\bin\s+(\d+)\s*days?\b/i, fn: (m) => parseInt(m[1]) },
      { pattern: /\b(lundi|monday)\b/i, weekday: 1 },
      { pattern: /\b(mardi|tuesday)\b/i, weekday: 2 },
      { pattern: /\b(mercredi|wednesday)\b/i, weekday: 3 },
      { pattern: /\b(jeudi|thursday)\b/i, weekday: 4 },
      { pattern: /\b(vendredi|friday)\b/i, weekday: 5 },
      { pattern: /\bsemaine prochaine|next week\b/i, days: 7 },
      { pattern: /\bfin de semaine|end of week\b/i, fn: () => { const d = 5 - now.getDay(); return d <= 0 ? d + 7 : d; } },
    ];

    for (const dp of datePatterns) {
      const match = text.match(dp.pattern);
      if (match) {
        let days;
        if (dp.days !== undefined) days = dp.days;
        else if (dp.fn) days = dp.fn(match);
        else if (dp.weekday !== undefined) {
          days = dp.weekday - now.getDay();
          if (days <= 0) days += 7;
        }
        const d = new Date(now); d.setDate(d.getDate() + days);
        result.dueDate = d.toISOString().slice(0, 10);
        text = text.replace(match[0], '');
        break;
      }
    }

    // Absolute date: "15 février", "feb 15", "15/02", etc.
    const absDate = text.match(/\b(\d{1,2})\s*(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i);
    if (absDate && !result.dueDate) {
      const months = { janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11, jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
      const day = parseInt(absDate[1]);
      const month = months[absDate[2].toLowerCase()];
      if (month !== undefined) {
        const d = new Date(now.getFullYear(), month, day);
        if (d < now) d.setFullYear(d.getFullYear() + 1);
        result.dueDate = d.toISOString().slice(0, 10);
        text = text.replace(absDate[0], '');
      }
    }

    // Tag extraction: #tag
    const tagMatches = text.match(/#(\w+)/g);
    if (tagMatches) {
      result.tags = tagMatches.map(t => t.slice(1));
      text = text.replace(/#\w+/g, '');
    }

    // Clean up remaining text as title
    result.title = text.replace(/\s*,\s*/g, ' ').replace(/\b(priorité|priority|pour|for|avant|before|assign)\b/gi, '').replace(/\s+/g, ' ').trim();
    if (!result.title) result.title = 'Nouvelle tâche';

    return result;
  }

  /* ── Autocomplete Dictionary ────────────────────────────── */
  function buildDictionary() {
    const state = Store.getState();
    const words = new Set();

    state.tasks.forEach(t => {
      // Add titles word by word
      t.title.split(/\s+/).forEach(w => { if (w.length > 2) words.add(w.toLowerCase()); });
      // Add full titles
      words.add(t.title);
      // Add tags
      (t.tags || []).forEach(tag => words.add(tag));
      // Add category
      if (t.category) words.add(t.category);
    });

    state.collaborators.forEach(c => {
      words.add(c.name);
      words.add(c.name.split(' ')[0]);
    });

    return [...words];
  }

  function autocomplete(prefix, limit = 8) {
    if (!prefix || prefix.length < 2) return [];
    const dict = buildDictionary();
    const lower = prefix.toLowerCase();
    const matches = dict.filter(w => w.toLowerCase().startsWith(lower) || w.toLowerCase().includes(lower));
    // Sort: starts-with first, then includes
    matches.sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(lower) ? 0 : 1;
      const bStarts = b.toLowerCase().startsWith(lower) ? 0 : 1;
      return aStarts - bStarts || a.length - b.length;
    });
    return matches.slice(0, limit);
  }

  /* ── Global Search (fuzzy) ──────────────────────────────── */
  function globalSearch(query, limit = 15) {
    if (!query || query.length < 2) return [];
    const state = Store.getState();
    const q = query.toLowerCase();
    const results = [];

    // Search tasks
    state.tasks.forEach(t => {
      let score = 0;
      if (t.title.toLowerCase().includes(q)) score += 10;
      if (t.title.toLowerCase().startsWith(q)) score += 5;
      if ((t.description || '').toLowerCase().includes(q)) score += 3;
      if ((t.tags || []).some(tag => tag.toLowerCase().includes(q))) score += 5;
      if (score > 0) results.push({ type: 'task', id: t.id, title: t.title, subtitle: t.status + ' • ' + t.priority, score, data: t });
    });

    // Search collaborators
    state.collaborators.forEach(c => {
      let score = 0;
      if (c.name.toLowerCase().includes(q)) score += 10;
      if (c.role.toLowerCase().includes(q)) score += 5;
      if (c.skills.some(s => s.toLowerCase().includes(q))) score += 3;
      if (score > 0) results.push({ type: 'collaborator', id: c.id, title: c.name, subtitle: c.role, score, data: c });
    });

    // Search views
    const views = ['dashboard', 'kanban', 'timeline', 'team', 'budget', 'analytics', 'activity', 'settings', 'ai'];
    views.forEach(v => {
      const label = Store.t(v);
      if (label.toLowerCase().includes(q) || v.includes(q)) {
        results.push({ type: 'view', id: v, title: label, subtitle: Store.t('goTo') + ' ' + label, score: 8 });
      }
    });

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /* ── Cycle Time Analytics ───────────────────────────────── */
  function getCycleTimeByStatus() {
    // Average days tasks spend in each status (estimation based on progress + dates)
    const tasks = Store.getState().tasks.filter(t => t.status === 'done' && t.startDate && t.completedDate);
    if (tasks.length < 2) return { backlog: 3, todo: 2, 'in-progress': 5, review: 2, done: 0 };

    const avgDuration = tasks.reduce((s, t) => {
      return s + (new Date(t.completedDate) - new Date(t.startDate)) / 86400000;
    }, 0) / tasks.length;

    // Distribute across statuses (approximation)
    return {
      backlog: Math.round(avgDuration * 0.15),
      todo: Math.round(avgDuration * 0.12),
      'in-progress': Math.round(avgDuration * 0.45),
      review: Math.round(avgDuration * 0.2),
      done: 0,
    };
  }

  /* ── Sprint Planning Helper ─────────────────────────────── */
  function suggestSprintPlan(capacityHours) {
    const state = Store.getState();
    const available = state.tasks.filter(t => t.status === 'backlog' || t.status === 'todo');

    // Score tasks for sprint inclusion
    const scored = available.map(t => {
      let score = 0;
      const prw = { critical: 40, high: 25, medium: 10, low: 2 };
      score += prw[t.priority] || 5;
      if (t.dueDate) {
        const dl = (new Date(t.dueDate) - new Date()) / 86400000;
        if (dl < 14) score += 30 - dl;
      }
      // Dependencies ready
      const depsReady = !t.dependencies || t.dependencies.length === 0 ||
        t.dependencies.every(d => { const dep = state.tasks.find(x => x.id === d); return dep && dep.status === 'done'; });
      if (depsReady) score += 15;
      return { ...t, _score: score };
    }).sort((a, b) => b._score - a._score);

    // Knapsack: fill capacity
    const plan = [];
    let remaining = capacityHours || 80;
    for (const t of scored) {
      const hours = t.estimateHours || 4;
      if (hours <= remaining) {
        plan.push({ id: t.id, title: t.title, priority: t.priority, estimateHours: hours, score: t._score });
        remaining -= hours;
      }
      if (remaining <= 0) break;
    }

    return { tasks: plan, totalHours: capacityHours - remaining, remainingCapacity: remaining };
  }

  /* ── Public API ─────────────────────────────────────────── */
  window.Predictions = {
    predictDuration,
    forecastVelocity,
    analyzeRisks,
    sprintSuccessProbability,
    predictBurndown,
    recommendPriorities,
    suggestReassignments,
    suggestTodaysFocus,
    suggestNextTasks,
    parseNaturalTask,
    autocomplete,
    globalSearch,
    getCycleTimeByStatus,
    suggestSprintPlan,
  };
})();
