/* ═══════════════════════════════════════════════════════════════
   Project Hub — Views (9 main views)
   v2.0.0 — Dashboard, Kanban, Timeline, Team, Budget,
            Analytics, Activity, Settings, AI Assistant
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const { el, icon, statCard, taskCard, taskModal, filterBar, emptyState, toast,
    confirm, select, nlpInput, statusColors, priorityColors, categoryColors,
    activityColors, formatCurrency, formatDate, formatDateTime, daysUntil, skeleton, dropdown } = UI;
  const t = (k, p) => Store.t(k, p);

  /* ══════════════════════════════════════════════════════════
     1. DASHBOARD
     ══════════════════════════════════════════════════════════ */
  function dashboard(container) {
    const state = Store.getState();
    const metrics = Store.getMetrics();
    const risks = Predictions.analyzeRisks();
    const todayFocus = Predictions.suggestTodaysFocus();
    const sprintProb = Predictions.sprintSuccessProbability();
    const burndown = Predictions.predictBurndown();

    container.innerHTML = '';
    container.className = 'view-content view-dashboard';

    // Stats row
    const statsRow = el('div', { className: 'stats-row' }, [
      statCard({ title: t('tasksDone'), value: metrics.completionRate, subtitle: `${metrics.completedTasks}/${metrics.totalTasks}`, icon: 'check', color: '#10b981', trend: 5 }),
      statCard({ title: t('inProgress'), value: metrics.inProgressTasks, icon: 'trending', color: '#f59e0b' }),
      statCard({ title: t('overdue'), value: metrics.overdueTasks, icon: 'alert', color: '#ef4444' }),
      statCard({ title: t('budget'), value: formatCurrency(state.budget.spent), subtitle: `/ ${formatCurrency(state.budget.total)}`, icon: 'budget', color: '#a855f7' }),
    ]);
    container.appendChild(statsRow);

    // Main grid: 2 columns
    const grid = el('div', { className: 'dashboard-grid' });

    // Left: Sprint Progress + Today's Focus
    const left = el('div', { className: 'dashboard-col' });

    // Sprint progress card
    const sprintCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [
        el('h3', {}, [t('sprintProgress')]),
        el('span', { className: 'badge badge-' + (sprintProb >= 0.7 ? 'success' : sprintProb >= 0.4 ? 'warning' : 'danger') }, [Math.round(sprintProb * 100) + '%']),
      ]),
      el('div', { className: 'card-body' }),
    ]);
    const burndownTarget = sprintCard.querySelector('.card-body');
    if (burndown.days.length > 0) {
      const svg = Charts.burndown({ data: burndown, width: 480, height: 200, color: '#00d4ff' });
      burndownTarget.appendChild(svg);
    } else {
      burndownTarget.appendChild(el('p', { className: 'text-muted' }, ['Pas assez de données pour le burndown.']));
    }
    left.appendChild(sprintCard);

    // Today's Focus
    const focusCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [
        el('h3', { innerHTML: icon('zap') + ' ' + t('todaysFocus') }),
      ]),
      el('div', { className: 'card-body' }),
    ]);
    const focusBody = focusCard.querySelector('.card-body');
    if (todayFocus.length === 0) {
      focusBody.appendChild(el('p', { className: 'text-muted' }, ['Rien à prioriser pour le moment.']));
    } else {
      todayFocus.slice(0, 5).forEach(item => {
        const t = Store.getTask(item.id);
        if (t) {
          focusBody.appendChild(el('div', { className: 'focus-item', onClick: () => openTask(t) }, [
            el('span', { className: 'focus-priority', style: { background: priorityColors[t.priority] } }),
            el('span', { className: 'focus-title' }, [t.title]),
            el('span', { className: 'focus-reason text-muted' }, [item.reason]),
          ]));
        }
      });
    }
    left.appendChild(focusCard);

    // Right: Risks + Distribution
    const right = el('div', { className: 'dashboard-col' });

    // Risks
    if (risks.length > 0) {
      const riskCard = el('div', { className: 'card card-risk' }, [
        el('div', { className: 'card-header' }, [
          el('h3', { innerHTML: icon('alert') + ' ' + t('risks') }),
          el('span', { className: 'badge badge-danger' }, [String(risks.length)]),
        ]),
        el('div', { className: 'card-body' }),
      ]);
      const riskBody = riskCard.querySelector('.card-body');
      risks.slice(0, 6).forEach(r => {
        const sevColors = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };
        riskBody.appendChild(el('div', { className: 'risk-item' }, [
          el('span', { className: 'risk-severity', style: { background: sevColors[r.severity] + '20', color: sevColors[r.severity] } }, [r.severity]),
          el('span', { className: 'risk-msg' }, [r.message]),
        ]));
      });
      right.appendChild(riskCard);
    }

    // Category distribution
    const catData = {};
    state.tasks.forEach(t => { catData[t.category] = (catData[t.category] || 0) + 1; });
    const donutData = Object.entries(catData).map(([k, v]) => ({ label: k, value: v, color: categoryColors[k] || '#6b7280' }));
    if (donutData.length > 0) {
      const distCard = el('div', { className: 'card' }, [
        el('div', { className: 'card-header' }, [el('h3', {}, [t('distribution')])]),
        el('div', { className: 'card-body donut-center' }),
      ]);
      distCard.querySelector('.card-body').appendChild(Charts.donut({ data: donutData, size: 200 }));
      right.appendChild(distCard);
    }

    // Activity feed (last 5)
    const actCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [el('h3', {}, [t('recentActivity')])]),
      el('div', { className: 'card-body' }),
    ]);
    const actBody = actCard.querySelector('.card-body');
    (state.activity || []).slice(0, 5).forEach(a => {
      actBody.appendChild(el('div', { className: 'activity-item' }, [
        el('span', { className: 'activity-dot', style: { background: activityColors[a.type] || '#6b7280' } }),
        el('span', { className: 'activity-text' }, [a.text]),
        el('span', { className: 'activity-time text-muted' }, [formatDateTime(a.timestamp)]),
      ]));
    });
    right.appendChild(actCard);

    grid.appendChild(left);
    grid.appendChild(right);
    container.appendChild(grid);
  }

  function openTask(task) {
    taskModal(task, {
      onSave: (d) => { Store.updateTask(d.id, d); toast('Tâche modifiée', 'success'); },
      onDelete: (id) => { confirm('Supprimer cette tâche ?', { danger: true, onConfirm: () => { Store.deleteTask(id); toast('Tâche supprimée', 'success'); } }); },
    });
  }

  /* ══════════════════════════════════════════════════════════
     2. KANBAN
     ══════════════════════════════════════════════════════════ */
  function kanban(container) {
    const state = Store.getState();

    container.innerHTML = '';
    container.className = 'view-content view-kanban';

    // Top bar: NLP input + filters
    const topBar = el('div', { className: 'kanban-topbar' }, [
      nlpInput({ onSubmit: (d) => { Store.addTask(d); toast('Tâche créée !', 'success'); } }),
      filterBar({ onFilterChange: () => kanban(container) }),
    ]);
    container.appendChild(topBar);

    const columns = ['backlog', 'todo', 'in-progress', 'review', 'done', 'blocked'];
    const board = el('div', { className: 'kanban-board' });

    columns.forEach(status => {
      const tasks = Store.getFilteredTasks().filter(t => t.status === status);
      const col = el('div', { className: 'kanban-column', dataset: { status } });

      // Header
      const header = el('div', { className: 'kanban-column-header' }, [
        el('span', { className: 'kanban-status-dot', style: { background: statusColors[status] } }),
        el('h4', {}, [t(status)]),
        el('span', { className: 'kanban-count' }, [String(tasks.length)]),
        el('button', { className: 'kanban-add-btn', innerHTML: icon('plus'), onClick: () => {
          taskModal(null, { onSave: (d) => { d.status = status; Store.addTask(d); toast('Tâche créée !', 'success'); } });
        }}),
      ]);
      col.appendChild(header);

      // Cards
      const body = el('div', { className: 'kanban-column-body' });
      if (tasks.length === 0) {
        body.appendChild(el('div', { className: 'kanban-empty' }, [t('emptyColumn')]));
      }
      tasks.forEach(task => {
        body.appendChild(taskCard(task, { onClick: (t) => openTask(t) }));
      });
      col.appendChild(body);

      // Drag and drop
      body.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; body.classList.add('kanban-drag-over'); });
      body.addEventListener('dragleave', () => body.classList.remove('kanban-drag-over'));
      body.addEventListener('drop', (e) => {
        e.preventDefault();
        body.classList.remove('kanban-drag-over');
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) { Store.updateTask(taskId, { status }); toast(t('taskMoved'), 'info'); }
      });

      board.appendChild(col);
    });

    container.appendChild(board);
  }

  /* ══════════════════════════════════════════════════════════
     3. TIMELINE (Gantt-like)
     ══════════════════════════════════════════════════════════ */
  function timeline(container) {
    const tasks = Store.getFilteredTasks().filter(t => t.startDate || t.dueDate);

    container.innerHTML = '';
    container.className = 'view-content view-timeline';

    container.appendChild(filterBar({ onFilterChange: () => timeline(container) }));

    if (tasks.length === 0) {
      container.appendChild(emptyState('Aucune tâche avec des dates pour afficher la timeline.', 'calendar'));
      return;
    }

    // Determine range
    const allDates = tasks.flatMap(t => [t.startDate, t.dueDate].filter(Boolean)).map(d => new Date(d).getTime());
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    const totalDays = Math.max(Math.ceil((maxDate - minDate) / 86400000), 14);

    // Header: date markers
    const gantt = el('div', { className: 'gantt-chart' });
    const header = el('div', { className: 'gantt-header' });
    const labelCol = el('div', { className: 'gantt-label-col' }, [el('span', {}, ['Tâche'])]);
    const timeCol = el('div', { className: 'gantt-time-col' });

    // Week markers
    for (let d = 0; d <= totalDays; d += 7) {
      const date = new Date(minDate.getTime() + d * 86400000);
      const pct = (d / totalDays * 100);
      timeCol.appendChild(el('div', { className: 'gantt-marker', style: { left: pct + '%' } }, [formatDate(date.toISOString())]));
    }

    // Today marker
    const todayOff = Math.ceil((Date.now() - minDate.getTime()) / 86400000);
    if (todayOff >= 0 && todayOff <= totalDays) {
      timeCol.appendChild(el('div', { className: 'gantt-today', style: { left: (todayOff / totalDays * 100) + '%' } }));
    }

    header.appendChild(labelCol);
    header.appendChild(timeCol);
    gantt.appendChild(header);

    // Rows
    tasks.sort((a, b) => new Date(a.startDate || a.dueDate) - new Date(b.startDate || b.dueDate));
    tasks.forEach(task => {
      const start = new Date(task.startDate || task.dueDate);
      const end = new Date(task.dueDate || task.startDate);
      const startDay = Math.ceil((start - minDate) / 86400000);
      const duration = Math.max(Math.ceil((end - start) / 86400000), 1);
      const leftPct = (startDay / totalDays * 100);
      const widthPct = Math.max(duration / totalDays * 100, 2);

      const row = el('div', { className: 'gantt-row', onClick: () => openTask(task) });
      const label = el('div', { className: 'gantt-label-col' }, [
        el('span', { className: 'gantt-task-name' }, [task.title.substring(0, 30)]),
      ]);
      const bar = el('div', { className: 'gantt-time-col' }, [
        el('div', {
          className: 'gantt-bar',
          style: { left: leftPct + '%', width: widthPct + '%', background: statusColors[task.status] },
          title: `${task.title}\n${formatDate(task.startDate)} → ${formatDate(task.dueDate)}`
        }, [
          duration > 3 ? el('span', { className: 'gantt-bar-label' }, [task.title.substring(0, 20)]) : null,
        ].filter(Boolean)),
      ]);
      row.appendChild(label);
      row.appendChild(bar);
      gantt.appendChild(row);
    });

    container.appendChild(gantt);
  }

  /* ══════════════════════════════════════════════════════════
     4. TEAM
     ══════════════════════════════════════════════════════════ */
  function team(container) {
    const state = Store.getState();
    const collabs = state.collaborators;
    const tasks = state.tasks;

    container.innerHTML = '';
    container.className = 'view-content view-team';

    // Header + Add button
    container.appendChild(el('div', { className: 'view-header' }, [
      el('h2', {}, [t('teamView')]),
      el('button', { className: 'btn btn-primary', onClick: () => addCollaborator(), innerHTML: icon('plus') + ' ' + t('addMember') }),
    ]));

    // Workload analysis
    const reassignments = Predictions.suggestReassignments();
    if (reassignments.length > 0) {
      const tip = el('div', { className: 'card card-ai-tip' }, [
        el('div', { className: 'card-header' }, [el('h3', { innerHTML: icon('zap') + ' Suggestions IA' })]),
        el('div', { className: 'card-body' }),
      ]);
      reassignments.slice(0, 3).forEach(r => {
        const from = Store.getCollaborator(r.from);
        const to = Store.getCollaborator(r.to);
        tip.querySelector('.card-body').appendChild(el('div', { className: 'ai-suggestion' }, [
          el('span', {}, [`Déplacer "${r.taskTitle}" de ${from ? from.name : '?'} vers ${to ? to.name : '?'}: ${r.reason}`]),
        ]));
      });
      container.appendChild(tip);
    }

    // Team grid
    const grid = el('div', { className: 'team-grid' });
    collabs.forEach(c => {
      const memberTasks = tasks.filter(t => t.assignee === c.id);
      const done = memberTasks.filter(t => t.status === 'done').length;
      const inProg = memberTasks.filter(t => t.status === 'in-progress').length;
      const workload = memberTasks.filter(t => t.status !== 'done' && t.status !== 'backlog').length;
      const isOverloaded = workload > 4;

      const card = el('div', { className: 'team-card' + (isOverloaded ? ' team-overloaded' : '') }, [
        el('div', { className: 'team-card-top' }, [
          el('span', { className: 'team-avatar-lg' }, [c.avatar]),
          el('div', { className: 'team-info' }, [
            el('h4', {}, [c.name]),
            el('p', { className: 'text-muted' }, [c.role]),
          ]),
          el('button', { className: 'btn-icon', innerHTML: icon('edit'), onClick: () => editCollaborator(c) }),
        ]),
        el('div', { className: 'team-skills' }, (c.skills || []).map(s => el('span', { className: 'skill-tag' }, [s]))),
        el('div', { className: 'team-stats' }, [
          el('div', { className: 'team-stat' }, [el('span', { className: 'stat-val' }, [String(memberTasks.length)]), el('span', { className: 'stat-label' }, ['Total'])]),
          el('div', { className: 'team-stat' }, [el('span', { className: 'stat-val' }, [String(inProg)]), el('span', { className: 'stat-label' }, ['En cours'])]),
          el('div', { className: 'team-stat' }, [el('span', { className: 'stat-val' }, [String(done)]), el('span', { className: 'stat-label' }, ['Terminé'])]),
        ]),
        isOverloaded ? el('div', { className: 'team-warning' }, [icon('alert') + ' Surchargé']) : null,
        el('div', { className: 'team-tasks' }, memberTasks.filter(t => t.status !== 'done').slice(0, 3).map(t =>
          el('div', { className: 'team-task-mini', onClick: () => openTask(t) }, [
            el('span', { className: 'mini-dot', style: { background: statusColors[t.status] } }),
            el('span', {}, [t.title.substring(0, 35)]),
          ])
        )),
      ].filter(Boolean));
      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  function addCollaborator() {
    const data = { name: '', role: '', avatar: '👤', skills: [] };
    const content = collabForm(data);
    const m = UI.modal({
      title: 'Nouveau membre', content,
      footer: [
        el('button', { className: 'btn btn-secondary', onClick: () => m.close() }, ['Annuler']),
        el('button', { className: 'btn btn-primary', onClick: () => {
          if (!data.name) return;
          Store.addCollaborator(data);
          m.close();
          toast('Membre ajouté !', 'success');
        }}, ['Ajouter']),
      ]
    });
  }

  function editCollaborator(c) {
    const data = { ...c };
    const content = collabForm(data);
    const m = UI.modal({
      title: 'Modifier ' + c.name, content,
      footer: [
        el('button', { className: 'btn btn-danger', onClick: () => { Store.deleteCollaborator(c.id); m.close(); toast('Supprimé', 'info'); } }, ['Supprimer']),
        el('div', { style: { flex: '1' } }),
        el('button', { className: 'btn btn-secondary', onClick: () => m.close() }, ['Annuler']),
        el('button', { className: 'btn btn-primary', onClick: () => { Store.updateCollaborator(c.id, data); m.close(); toast('Modifié', 'success'); } }, ['Enregistrer']),
      ]
    });
  }

  function collabForm(data) {
    const emojiPicker = el('div', { className: 'emoji-picker' });
    const emojis = ['👤','👩‍💻','👨‍💻','🧑‍🎨','👩‍🔬','👨‍💼','🧑‍🏫','🦊','🐱','🐼','🦁','🐸','🐙','🚀','⭐','💎','🔥','💡','🎯','🎨'];
    emojis.forEach(e => {
      emojiPicker.appendChild(el('span', { className: 'emoji-opt' + (data.avatar === e ? ' emoji-selected' : ''), onClick: (ev) => {
        data.avatar = e;
        emojiPicker.querySelectorAll('.emoji-opt').forEach(o => o.classList.remove('emoji-selected'));
        ev.target.classList.add('emoji-selected');
      }}, [e]));
    });

    return el('div', { className: 'collab-form' }, [
      el('div', { className: 'form-group' }, [el('label', {}, ['Avatar']), emojiPicker]),
      el('div', { className: 'form-group' }, [el('label', {}, ['Nom']), el('input', { type: 'text', className: 'form-input', value: data.name, onInput: (e) => { data.name = e.target.value; } })]),
      el('div', { className: 'form-group' }, [el('label', {}, ['Rôle']), el('input', { type: 'text', className: 'form-input', value: data.role, onInput: (e) => { data.role = e.target.value; } })]),
      el('div', { className: 'form-group' }, [el('label', {}, ['Compétences (séparées par des virgules)']), el('input', { type: 'text', className: 'form-input', value: (data.skills || []).join(', '), onInput: (e) => { data.skills = e.target.value.split(',').map(s => s.trim()).filter(Boolean); } })]),
    ]);
  }

  /* ══════════════════════════════════════════════════════════
     5. BUDGET
     ══════════════════════════════════════════════════════════ */
  function budget(container) {
    const state = Store.getState();
    const b = state.budget;
    const remaining = b.total - b.spent;
    const usagePct = Math.round(b.spent / b.total * 100);

    container.innerHTML = '';
    container.className = 'view-content view-budget';

    // Stats row
    const statsRow = el('div', { className: 'stats-row' }, [
      statCard({ title: t('totalBudget'), value: formatCurrency(b.total), icon: 'budget', color: '#a855f7' }),
      statCard({ title: t('spent'), value: formatCurrency(b.spent), subtitle: usagePct + '%', icon: 'trending', color: usagePct > 80 ? '#ef4444' : '#f59e0b' }),
      statCard({ title: t('remaining'), value: formatCurrency(remaining), icon: 'target', color: remaining < 0 ? '#ef4444' : '#10b981' }),
    ]);
    container.appendChild(statsRow);

    const grid = el('div', { className: 'dashboard-grid' });

    // Budget gauge
    const left = el('div', { className: 'dashboard-col' });
    const gaugeCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [el('h3', {}, [t('budgetUsage')])]),
      el('div', { className: 'card-body donut-center' }),
    ]);
    gaugeCard.querySelector('.card-body').appendChild(Charts.gauge({ value: usagePct, max: 100, size: 200, label: 'Budget', color: usagePct > 80 ? '#ef4444' : usagePct > 60 ? '#f59e0b' : '#10b981' }));
    left.appendChild(gaugeCard);

    // Budget breakdown by category
    const catSpending = {};
    state.tasks.forEach(t => {
      const h = t.spentHours || 0;
      catSpending[t.category] = (catSpending[t.category] || 0) + h * 80; // 80€/h rate
    });
    const breakdownCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [el('h3', {}, ['Répartition par catégorie'])]),
      el('div', { className: 'card-body' }),
    ]);
    const breakdownBody = breakdownCard.querySelector('.card-body');
    Object.entries(catSpending).sort((a, b) => b[1] - a[1]).forEach(([cat, amount]) => {
      breakdownBody.appendChild(el('div', { className: 'budget-row' }, [
        el('span', { className: 'budget-cat', style: { color: categoryColors[cat] } }, [cat]),
        el('span', { className: 'budget-bar-wrap' }, [
          el('div', { className: 'budget-bar', style: { width: (amount / b.total * 100) + '%', background: categoryColors[cat] } }),
        ]),
        el('span', { className: 'budget-amount' }, [formatCurrency(amount)]),
      ]));
    });
    left.appendChild(breakdownCard);

    // Right: forecast line chart
    const right = el('div', { className: 'dashboard-col' });
    const forecastCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [el('h3', {}, [t('forecast')])]),
      el('div', { className: 'card-body' }),
    ]);
    // Generate simple forecast data
    const weeklySpend = [];
    for (let w = 0; w < 12; w++) {
      weeklySpend.push({ label: 'S' + (w + 1), value: Math.round(b.spent / 12 * (w + 1) + (Math.random() - 0.3) * 5000) });
    }
    forecastCard.querySelector('.card-body').appendChild(Charts.line({ data: weeklySpend, width: 460, height: 200, color: '#a855f7' }));
    right.appendChild(forecastCard);

    // Alerts
    const alertsCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [el('h3', { innerHTML: icon('alert') + ' Alertes budget' })]),
      el('div', { className: 'card-body' }),
    ]);
    const alertsBody = alertsCard.querySelector('.card-body');
    if (usagePct > 80) alertsBody.appendChild(el('div', { className: 'risk-item' }, [el('span', { className: 'risk-severity', style: { background: '#ef444420', color: '#ef4444' } }, ['Critique']), el('span', {}, [`Budget utilisé à ${usagePct}% — risque de dépassement`])]));
    if (usagePct > 60) alertsBody.appendChild(el('div', { className: 'risk-item' }, [el('span', { className: 'risk-severity', style: { background: '#f59e0b20', color: '#f59e0b' } }, ['Attention']), el('span', {}, ['Plus de 60% du budget consommé'])]));
    if (alertsBody.children.length === 0) alertsBody.appendChild(el('p', { className: 'text-muted' }, ['Aucune alerte budget.']));
    right.appendChild(alertsCard);

    grid.appendChild(left);
    grid.appendChild(right);
    container.appendChild(grid);
  }

  /* ══════════════════════════════════════════════════════════
     6. ANALYTICS
     ══════════════════════════════════════════════════════════ */
  function analytics(container) {
    const state = Store.getState();
    const metrics = Store.getMetrics();
    const velocity = Predictions.forecastVelocity();
    const cycleTimes = Predictions.getCycleTimeByStatus();

    container.innerHTML = '';
    container.className = 'view-content view-analytics';

    // Velocity chart
    const grid = el('div', { className: 'dashboard-grid' });

    const left = el('div', { className: 'dashboard-col' });

    // Velocity card
    const velCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [
        el('h3', {}, [t('velocity')]),
        velocity.predicted ? el('span', { className: 'badge badge-info' }, ['Préd: ' + velocity.predicted + ' pts']) : null,
      ].filter(Boolean)),
      el('div', { className: 'card-body' }),
    ]);
    const velData = (state.history || []).slice(-12).map((h, i) => ({ label: 'S' + (i + 1), value: h.completed || 0 }));
    if (velData.length > 2) {
      velCard.querySelector('.card-body').appendChild(Charts.bar({ data: velData, width: 460, height: 200, color: '#00d4ff' }));
    } else {
      velCard.querySelector('.card-body').appendChild(el('p', { className: 'text-muted' }, ['Pas assez d\'historique pour la vélocité.']));
    }
    left.appendChild(velCard);

    // Status distribution
    const statusData = {};
    state.tasks.forEach(t => { statusData[t.status] = (statusData[t.status] || 0) + 1; });
    const statusDonut = Object.entries(statusData).map(([k, v]) => ({ label: t(k), value: v, color: statusColors[k] }));

    if (statusDonut.length > 0) {
      const statusCard = el('div', { className: 'card' }, [
        el('div', { className: 'card-header' }, [el('h3', {}, [t('statusDistribution')])]),
        el('div', { className: 'card-body donut-center' }),
      ]);
      statusCard.querySelector('.card-body').appendChild(Charts.donut({ data: statusDonut, size: 200, centerText: state.tasks.length + ' tâches' }));
      left.appendChild(statusCard);
    }

    const right = el('div', { className: 'dashboard-col' });

    // Priority radar
    const prioData = {};
    ['critical', 'high', 'medium', 'low'].forEach(p => {
      prioData[p] = state.tasks.filter(t => t.priority === p).length;
    });
    const radarCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [el('h3', {}, ['Priorités'])]),
      el('div', { className: 'card-body donut-center' }),
    ]);
    radarCard.querySelector('.card-body').appendChild(Charts.radar({
      labels: Object.keys(prioData).map(p => t(p)),
      datasets: [{ values: Object.values(prioData), color: '#00d4ff', label: 'Tâches' }],
      size: 220,
    }));
    right.appendChild(radarCard);

    // Cycle time
    const ctCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [el('h3', {}, ['Temps de cycle moyen'])]),
      el('div', { className: 'card-body' }),
    ]);
    const ctBody = ctCard.querySelector('.card-body');
    Object.entries(cycleTimes).forEach(([status, days]) => {
      ctBody.appendChild(el('div', { className: 'cycle-row' }, [
        el('span', { className: 'cycle-status', style: { color: statusColors[status] } }, [t(status)]),
        el('div', { className: 'cycle-bar-wrap' }, [
          el('div', { className: 'cycle-bar', style: { width: Math.min(days * 10, 100) + '%', background: statusColors[status] } }),
        ]),
        el('span', { className: 'cycle-value' }, [days.toFixed(1) + ' j']),
      ]));
    });
    right.appendChild(ctCard);

    grid.appendChild(left);
    grid.appendChild(right);
    container.appendChild(grid);
  }

  /* ══════════════════════════════════════════════════════════
     7. ACTIVITY
     ══════════════════════════════════════════════════════════ */
  function activity(container) {
    const state = Store.getState();

    container.innerHTML = '';
    container.className = 'view-content view-activity';

    container.appendChild(el('div', { className: 'view-header' }, [el('h2', {}, [t('activityView')])]));

    let filterType = 'all';
    const filterRow = el('div', { className: 'activity-filters' });
    const types = ['all', 'completed', 'created', 'moved', 'comment', 'blocked', 'milestone'];
    types.forEach(type => {
      filterRow.appendChild(el('button', {
        className: 'filter-chip' + (type === filterType ? ' active' : ''),
        onClick: (e) => {
          filterType = type;
          filterRow.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
          e.target.classList.add('active');
          renderActivities();
        }
      }, [type === 'all' ? 'Toutes' : t(type) || type]));
    });
    container.appendChild(filterRow);

    const listEl = el('div', { className: 'activity-timeline' });
    container.appendChild(listEl);

    function renderActivities() {
      const items = (state.activity || []).filter(a => filterType === 'all' || a.type === filterType);
      listEl.innerHTML = '';

      if (items.length === 0) {
        listEl.appendChild(emptyState('Aucune activité trouvée.', 'activity'));
        return;
      }

      let lastDate = '';
      items.forEach(a => {
        const dateStr = a.timestamp ? new Date(a.timestamp).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
        if (dateStr !== lastDate) {
          listEl.appendChild(el('div', { className: 'activity-date-sep' }, [dateStr]));
          lastDate = dateStr;
        }
        listEl.appendChild(el('div', { className: 'activity-entry' }, [
          el('div', { className: 'activity-dot-lg', style: { background: activityColors[a.type] || '#6b7280' } }),
          el('div', { className: 'activity-content' }, [
            el('p', { className: 'activity-text' }, [a.text]),
            a.timestamp ? el('span', { className: 'activity-time text-muted' }, [formatDateTime(a.timestamp)]) : null,
          ].filter(Boolean)),
        ]));
      });
    }
    renderActivities();
  }

  /* ══════════════════════════════════════════════════════════
     8. SETTINGS
     ══════════════════════════════════════════════════════════ */
  function settings(container) {
    const state = Store.getState();

    container.innerHTML = '';
    container.className = 'view-content view-settings';

    container.appendChild(el('div', { className: 'view-header' }, [el('h2', {}, [t('settingsView')])]));

    const sections = el('div', { className: 'settings-sections' });

    // Cloud sync
    const cloudSection = el('div', { className: 'settings-section' }, [
      el('h3', { innerHTML: icon('cloud') + ' Cloud & Synchronisation' }),
      el('div', { className: 'settings-row' }, [
        el('div', { className: 'settings-info' }, [
          el('span', { className: 'settings-label' }, ['Statut cloud']),
          el('span', { className: 'settings-value' }, [state.cloudEnabled ? '🟢 Connecté' : '🔴 Hors ligne']),
        ]),
        state.cloudEnabled
          ? el('button', { className: 'btn btn-secondary', onClick: () => { Store.logout(); toast('Déconnecté', 'info'); } }, ['Déconnexion'])
          : el('button', { className: 'btn btn-primary', onClick: () => UI.loginModal({ onLogin: () => settings(container) }) }, ['Se connecter']),
      ]),
      state.cloudEnabled ? el('div', { className: 'settings-row' }, [
        el('button', { className: 'btn btn-secondary', onClick: async () => { await Store.cloudSave(); toast('Sauvegardé !', 'success'); } }, [icon('upload') + ' Sauver dans le cloud']),
        el('button', { className: 'btn btn-secondary', onClick: async () => { await Store.cloudLoad(); toast('Chargé !', 'success'); settings(container); } }, [icon('download') + ' Charger du cloud']),
      ]) : null,
    ].filter(Boolean));
    sections.appendChild(cloudSection);

    // Appearance
    const theme = state.settings?.theme || 'dark';
    const lang = state.settings?.lang || 'fr';
    const appearSection = el('div', { className: 'settings-section' }, [
      el('h3', { innerHTML: icon('sun') + ' Apparence' }),
      el('div', { className: 'settings-row' }, [
        el('span', { className: 'settings-label' }, ['Thème']),
        select({ value: theme, options: [{ value: 'dark', label: '🌙 Sombre' }, { value: 'light', label: '☀️ Clair' }], onChange: (v) => { Store.updateSettings({ theme: v }); document.body.dataset.theme = v; } }),
      ]),
      el('div', { className: 'settings-row' }, [
        el('span', { className: 'settings-label' }, ['Langue']),
        select({ value: lang, options: [{ value: 'fr', label: '🇫🇷 Français' }, { value: 'en', label: '🇬🇧 English' }], onChange: (v) => { Store.updateSettings({ lang: v }); toast('Langue changée. Rechargez pour appliquer.', 'info'); } }),
      ]),
    ]);
    sections.appendChild(appearSection);

    // Data management
    const dataSection = el('div', { className: 'settings-section' }, [
      el('h3', { innerHTML: icon('download') + ' Données' }),
      el('div', { className: 'settings-row' }, [
        el('button', { className: 'btn btn-secondary', onClick: () => {
          const data = Store.exportData();
          const blob = new Blob([data], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'projecthub-export.json';
          a.click();
          toast('Données exportées !', 'success');
        }}, [icon('download') + ' Exporter JSON']),
        el('button', { className: 'btn btn-secondary', onClick: () => {
          const input = document.createElement('input');
          input.type = 'file'; input.accept = '.json';
          input.onchange = (ev) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              try { Store.importData(e.target.result); toast('Données importées !', 'success'); settings(container); }
              catch (err) { toast('Erreur d\'import: ' + err.message, 'error'); }
            };
            reader.readAsText(ev.target.files[0]);
          };
          input.click();
        }}, [icon('upload') + ' Importer JSON']),
      ]),
      el('div', { className: 'settings-row' }, [
        el('button', { className: 'btn btn-secondary', onClick: () => confirm('Réinitialiser avec les données de démo ?', { onConfirm: () => { Store.resetToDemo(); toast('Données réinitialisées', 'success'); } }) }, ['🔄 Réinitialiser (démo)']),
        el('button', { className: 'btn btn-danger', onClick: () => confirm('SUPPRIMER toutes les données ? Cette action est irréversible !', { danger: true, onConfirm: () => { Store.clearAllData(); toast('Données supprimées', 'info'); } }) }, [icon('trash') + ' Tout supprimer']),
      ]),
    ]);
    sections.appendChild(dataSection);

    // About
    const aboutSection = el('div', { className: 'settings-section' }, [
      el('h3', {}, ['À propos']),
      el('p', { className: 'text-muted' }, ['Project Hub v2.0.0 — Gestion de projet intelligente']),
      el('p', { className: 'text-muted' }, ['EZGalaxy Platform © 2025']),
    ]);
    sections.appendChild(aboutSection);

    container.appendChild(sections);
  }

  /* ══════════════════════════════════════════════════════════
     9. AI ASSISTANT
     ══════════════════════════════════════════════════════════ */
  function aiAssistant(container) {
    const state = Store.getState();
    const risks = Predictions.analyzeRisks();
    const sprintPlan = Predictions.suggestSprintPlan();
    const focus = Predictions.suggestTodaysFocus();
    const reassignments = Predictions.suggestReassignments();

    container.innerHTML = '';
    container.className = 'view-content view-ai';

    container.appendChild(el('div', { className: 'view-header' }, [
      el('h2', { innerHTML: icon('ai') + ' ' + t('aiAssistant') }),
    ]));

    const grid = el('div', { className: 'ai-grid' });

    // Sprint Planning
    const planCard = el('div', { className: 'card card-ai' }, [
      el('div', { className: 'card-header' }, [
        el('h3', { innerHTML: icon('target') + ' Planification Sprint' }),
      ]),
      el('div', { className: 'card-body' }),
    ]);
    const planBody = planCard.querySelector('.card-body');
    if (sprintPlan.selected.length > 0) {
      planBody.appendChild(el('p', { className: 'ai-summary' }, [`Capacité: ${sprintPlan.capacity}h — Sélectionné: ${sprintPlan.selected.length} tâches (${sprintPlan.totalEstimate}h)`]));
      sprintPlan.selected.forEach(s => {
        const task = Store.getTask(s.id);
        if (task) {
          planBody.appendChild(el('div', { className: 'ai-plan-item', onClick: () => openTask(task) }, [
            el('span', { className: 'mini-dot', style: { background: priorityColors[task.priority] } }),
            el('span', {}, [task.title]),
            el('span', { className: 'text-muted' }, [`${task.estimateHours || '?'}h`]),
          ]));
        }
      });
    } else {
      planBody.appendChild(el('p', { className: 'text-muted' }, ['Aucune tâche à planifier.']));
    }
    grid.appendChild(planCard);

    // Risk report
    const riskCard = el('div', { className: 'card card-ai' }, [
      el('div', { className: 'card-header' }, [
        el('h3', { innerHTML: icon('alert') + ' Rapport de risques' }),
        el('span', { className: 'badge badge-' + (risks.length > 3 ? 'danger' : risks.length > 0 ? 'warning' : 'success') }, [String(risks.length)]),
      ]),
      el('div', { className: 'card-body' }),
    ]);
    const riskBody = riskCard.querySelector('.card-body');
    if (risks.length === 0) {
      riskBody.appendChild(el('p', { className: 'ai-good' }, ['✅ Aucun risque détecté !']));
    } else {
      risks.forEach(r => {
        const sevColor = r.severity === 'high' ? '#ef4444' : r.severity === 'medium' ? '#f59e0b' : '#3b82f6';
        riskBody.appendChild(el('div', { className: 'risk-item' }, [
          el('span', { className: 'risk-severity', style: { background: sevColor + '20', color: sevColor } }, [r.severity]),
          el('span', { className: 'risk-msg' }, [r.message]),
        ]));
      });
    }
    grid.appendChild(riskCard);

    // Today's focus
    const focusCard = el('div', { className: 'card card-ai' }, [
      el('div', { className: 'card-header' }, [el('h3', { innerHTML: icon('zap') + ' Focus du jour' })]),
      el('div', { className: 'card-body' }),
    ]);
    const focusBody = focusCard.querySelector('.card-body');
    if (focus.length === 0) {
      focusBody.appendChild(el('p', { className: 'text-muted' }, ['Toutes les tâches sont à jour !']));
    } else {
      focus.slice(0, 8).forEach(f => {
        const task = Store.getTask(f.id);
        if (task) {
          focusBody.appendChild(el('div', { className: 'focus-item', onClick: () => openTask(task) }, [
            el('span', { className: 'focus-priority', style: { background: priorityColors[task.priority] } }),
            el('span', { className: 'focus-title' }, [task.title]),
            el('span', { className: 'focus-score' }, [Math.round(f.score)]),
            el('span', { className: 'focus-reason text-muted' }, [f.reason]),
          ]));
        }
      });
    }
    grid.appendChild(focusCard);

    // Reassignment suggestions
    const reassignCard = el('div', { className: 'card card-ai' }, [
      el('div', { className: 'card-header' }, [el('h3', { innerHTML: icon('team') + ' Réaffectations suggérées' })]),
      el('div', { className: 'card-body' }),
    ]);
    const reassignBody = reassignCard.querySelector('.card-body');
    if (reassignments.length === 0) {
      reassignBody.appendChild(el('p', { className: 'text-muted' }, ['La charge de travail semble bien répartie.']));
    } else {
      reassignments.forEach(r => {
        const from = Store.getCollaborator(r.from);
        const to = Store.getCollaborator(r.to);
        reassignBody.appendChild(el('div', { className: 'ai-reassign' }, [
          el('span', {}, [`${from ? from.avatar + ' ' + from.name : '?'} → ${to ? to.avatar + ' ' + to.name : '?'}`]),
          el('span', { className: 'text-muted' }, [r.taskTitle]),
          el('button', { className: 'btn btn-sm btn-primary', onClick: () => {
            Store.updateTask(r.taskId, { assignee: r.to });
            toast('Tâche réaffectée !', 'success');
          }}, ['Appliquer']),
        ]));
      });
    }
    grid.appendChild(reassignCard);

    container.appendChild(grid);
  }

  /* ── Public API ──────────────────────────────────────────── */
  window.Views = { dashboard, kanban, timeline, team, budget, analytics, activity, settings, aiAssistant };
})();
