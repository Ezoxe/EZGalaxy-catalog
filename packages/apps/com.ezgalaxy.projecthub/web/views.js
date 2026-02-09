/* ═══════════════════════════════════════════════════════════════
   Project Hub — Views (9 main views)
   v2.1.0 — Dashboard, Kanban, Timeline, Team, Budget,
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
    const risksResult = Predictions.analyzeRisks();
    const todayFocus = Predictions.suggestTodaysFocus();
    const sprintResult = Predictions.sprintSuccessProbability();
    const burndownResult = Predictions.predictBurndown();

    container.innerHTML = '';
    container.className = 'view-content view-dashboard';

    // Extract values correctly from prediction objects
    const sprintPct = sprintResult.probability; // number 0-100
    const risksList = risksResult.risks || [];
    const burndownData = burndownResult.data || [];

    // Stats row
    const statsRow = el('div', { className: 'stats-row' }, [
      statCard({ title: t('tasksDone'), value: metrics.completionRate + '%', subtitle: `${metrics.done}/${metrics.total}`, icon: 'check', color: '#10b981', trend: 5 }),
      statCard({ title: t('inProgress'), value: metrics.inProgress, icon: 'trending', color: '#f59e0b' }),
      statCard({ title: t('overdue'), value: metrics.overdue, icon: 'alert', color: '#ef4444' }),
      statCard({ title: t('budget'), value: formatCurrency(state.budget.spent), subtitle: `/ ${formatCurrency(state.budget.total)}`, icon: 'budget', color: '#a855f7' }),
    ]);
    container.appendChild(statsRow);

    // Main grid: 2 columns
    const grid = el('div', { className: 'dashboard-grid' });

    // Left: Sprint Progress + Today's Focus
    const left = el('div', { className: 'dashboard-col' });

    // Sprint progress card
    const sprintBadgeClass = sprintPct >= 70 ? 'success' : sprintPct >= 40 ? 'warning' : 'danger';
    const sprintCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [
        el('h3', {}, [t('sprintProgress')]),
        el('span', { className: 'badge badge-' + sprintBadgeClass }, [sprintPct + '%']),
      ]),
      el('div', { className: 'card-body' }),
    ]);
    const burndownTarget = sprintCard.querySelector('.card-body');
    if (burndownData.length > 0) {
      const svg = Charts.burndown({ data: burndownData, width: 480, height: 200 });
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
        const task = Store.getTask(item.id);
        if (task) {
          focusBody.appendChild(el('div', { className: 'focus-item', onClick: () => openTask(task) }, [
            el('span', { className: 'focus-priority', style: { background: priorityColors[task.priority] } }),
            el('span', { className: 'focus-title' }, [task.title]),
            el('span', { className: 'focus-reason text-muted' }, [item.reason || '']),
          ]));
        }
      });
    }
    left.appendChild(focusCard);

    // Right: Risks + Distribution
    const right = el('div', { className: 'dashboard-col' });

    // Risks
    if (risksList.length > 0) {
      const riskCard = el('div', { className: 'card card-risk' }, [
        el('div', { className: 'card-header' }, [
          el('h3', { innerHTML: icon('alert') + ' ' + t('risks') }),
          el('span', { className: 'badge badge-danger' }, [String(risksList.length)]),
        ]),
        el('div', { className: 'card-body' }),
      ]);
      const riskBody = riskCard.querySelector('.card-body');
      risksList.slice(0, 6).forEach(r => {
        const sevLabel = r.severity >= 70 ? 'Critique' : r.severity >= 40 ? 'Attention' : 'Faible';
        const sevColor = r.severity >= 70 ? '#ef4444' : r.severity >= 40 ? '#f59e0b' : '#3b82f6';
        riskBody.appendChild(el('div', { className: 'risk-item' }, [
          el('span', { className: 'risk-severity', style: { background: sevColor + '20', color: sevColor } }, [sevLabel]),
          el('span', { className: 'risk-msg' }, [r.title || '']),
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
        el('span', { className: 'activity-text' }, [a.message || '']),
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
      onSave: (d) => { Store.updateTask(d.id, d); toast(t('taskMoved'), 'success'); },
      onDelete: (id) => { confirm(t('confirmDelete'), { danger: true, onConfirm: () => { Store.deleteTask(id); toast(t('delete'), 'success'); } }); },
    });
  }

  /* ══════════════════════════════════════════════════════════
     2. KANBAN
     ══════════════════════════════════════════════════════════ */
  function kanban(container) {
    container.innerHTML = '';
    container.className = 'view-content view-kanban';

    // Top bar: NLP input + filters
    const topBar = el('div', { className: 'kanban-topbar' }, [
      nlpInput({ onSubmit: (d) => { Store.addTask(d); toast(t('taskCreated'), 'success'); } }),
      filterBar({ onFilterChange: () => kanban(container) }),
    ]);
    container.appendChild(topBar);

    const columns = ['backlog', 'todo', 'in-progress', 'review', 'done', 'blocked'];
    const board = el('div', { className: 'kanban-board' });

    columns.forEach(status => {
      const tasks = Store.getFilteredTasks().filter(t => t.status === status);
      const wipLimits = Store.getState().settings.kanbanWipLimits || {};
      const wipLimit = wipLimits[status];
      const isOverWip = wipLimit && tasks.length >= wipLimit;

      const col = el('div', { className: 'kanban-column' + (isOverWip ? ' kanban-wip-exceeded' : ''), dataset: { status } });

      // Header
      const header = el('div', { className: 'kanban-column-header' }, [
        el('span', { className: 'kanban-status-dot', style: { background: statusColors[status] } }),
        el('h4', {}, [t(status)]),
        el('span', { className: 'kanban-count' }, [String(tasks.length) + (wipLimit ? '/' + wipLimit : '')]),
        el('button', { className: 'kanban-add-btn', innerHTML: icon('plus'), onClick: () => {
          taskModal(null, { onSave: (d) => { d.status = status; Store.addTask(d); toast(t('taskCreated'), 'success'); } });
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
        if (taskId) {
          // Check WIP limits
          if (isOverWip && status !== 'done' && status !== 'backlog') {
            toast(t('wipLimit'), 'warning');
          }
          Store.updateTask(taskId, { status });
          toast(t('taskMoved'), 'info');
        }
      });

      board.appendChild(col);
    });

    container.appendChild(board);
  }

  /* ══════════════════════════════════════════════════════════
     3. TIMELINE (Gantt with dependency links)
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
    let minDate = new Date(Math.min(...allDates));
    let maxDate = new Date(Math.max(...allDates));
    // Add padding
    minDate = new Date(minDate.getTime() - 3 * 86400000);
    maxDate = new Date(maxDate.getTime() + 3 * 86400000);
    const totalDays = Math.max(Math.ceil((maxDate - minDate) / 86400000), 14);

    const gantt = el('div', { className: 'gantt-chart' });

    // Header
    const header = el('div', { className: 'gantt-header' });
    const labelCol = el('div', { className: 'gantt-label-col' }, [el('span', { className: 'gantt-header-label' }, ['Tâche'])]);
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

    // Build task position map for dependency lines
    const taskPositions = {};
    const sortedTasks = [...tasks].sort((a, b) => new Date(a.startDate || a.dueDate) - new Date(b.startDate || b.dueDate));

    // Rows
    sortedTasks.forEach((task, rowIdx) => {
      const start = new Date(task.startDate || task.dueDate);
      const end = new Date(task.dueDate || task.startDate);
      const startDay = Math.ceil((start - minDate) / 86400000);
      const duration = Math.max(Math.ceil((end - start) / 86400000), 1);
      const leftPct = (startDay / totalDays * 100);
      const widthPct = Math.max(duration / totalDays * 100, 2);
      const endPct = leftPct + widthPct;

      taskPositions[task.id] = { leftPct, widthPct, endPct, rowIdx };

      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
      const collab = task.assignee ? Store.getCollaborator(task.assignee) : null;

      const row = el('div', { className: 'gantt-row' + (isOverdue ? ' gantt-row-overdue' : ''), onClick: () => openTask(task) });
      const label = el('div', { className: 'gantt-label-col' }, [
        el('span', { className: 'gantt-priority-dot', style: { background: priorityColors[task.priority] } }),
        el('span', { className: 'gantt-task-name' }, [task.title.substring(0, 28)]),
        collab ? el('span', { className: 'gantt-task-avatar' }, [collab.avatar]) : null,
      ].filter(Boolean));

      const barEl = el('div', {
        className: 'gantt-bar' + (task.status === 'done' ? ' gantt-bar-done' : '') + (task.status === 'blocked' ? ' gantt-bar-blocked' : ''),
        style: { left: leftPct + '%', width: widthPct + '%', background: statusColors[task.status] },
        title: `${task.title}\n${formatDate(task.startDate)} → ${formatDate(task.dueDate)}\nProgress: ${task.progress}%`
      }, [
        // Progress fill inside the bar
        task.progress > 0 ? el('div', { className: 'gantt-bar-progress', style: { width: task.progress + '%' } }) : null,
        duration > 3 ? el('span', { className: 'gantt-bar-label' }, [task.title.substring(0, 20)]) : null,
      ].filter(Boolean));

      const bar = el('div', { className: 'gantt-time-col' }, [barEl]);

      // Dependency arrows
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(depId => {
          const dep = taskPositions[depId];
          if (dep) {
            // Draw a simple dependency line from dep end to this start
            const lineLeft = dep.endPct;
            const lineWidth = Math.max(leftPct - dep.endPct, 0.5);
            const lineEl = el('div', {
              className: 'gantt-dep-line',
              style: { left: lineLeft + '%', width: lineWidth + '%' },
              title: 'Dépendance'
            });
            bar.appendChild(lineEl);
            // Arrow head
            bar.appendChild(el('div', {
              className: 'gantt-dep-arrow',
              style: { left: (leftPct - 0.3) + '%' }
            }));
          }
        });
      }

      row.appendChild(label);
      row.appendChild(bar);
      gantt.appendChild(row);
    });

    // Legend
    const legend = el('div', { className: 'gantt-legend' }, [
      el('span', {}, ['Légende:']),
      ...Object.entries(statusColors).map(([status, color]) =>
        el('span', { className: 'gantt-legend-item' }, [
          el('span', { className: 'gantt-legend-dot', style: { background: color } }),
          el('span', {}, [t(status)]),
        ])
      ),
      el('span', { className: 'gantt-legend-item' }, [
        el('span', { className: 'gantt-legend-line' }),
        el('span', {}, ['Dépendance']),
      ]),
    ]);
    container.appendChild(gantt);
    container.appendChild(legend);
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
        // r.from and r.to are objects with {id, name, workload}
        tip.querySelector('.card-body').appendChild(el('div', { className: 'ai-suggestion' }, [
          el('span', {}, [`Déplacer "${r.taskTitle}" de ${r.from.name} vers ${r.to.name}: ${r.reason}`]),
          el('button', { className: 'btn btn-sm btn-primary', style: { marginLeft: '8px' }, onClick: () => {
            Store.updateTask(r.taskId, { assignee: r.to.id });
            toast('Tâche réaffectée !', 'success');
          }}, ['Appliquer']),
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
      const activeTasks = memberTasks.filter(t => t.status !== 'done' && t.status !== 'backlog').length;
      const isOverloaded = c.workload > 100 || activeTasks > 4;

      const card = el('div', { className: 'team-card' + (isOverloaded ? ' team-overloaded' : '') }, [
        el('div', { className: 'team-card-top' }, [
          el('span', { className: 'team-avatar-lg' }, [c.avatar]),
          el('div', { className: 'team-info' }, [
            el('h4', {}, [c.name]),
            el('p', { className: 'text-muted' }, [c.role]),
          ]),
          el('button', { className: 'btn-icon', innerHTML: icon('edit'), onClick: () => editCollaborator(c) }),
        ]),
        el('div', { className: 'team-workload' }, [
          Charts.progress({ value: Math.min(c.workload, 120), max: 120, width: 200, height: 6, color: c.workload > 100 ? '#ef4444' : c.workload > 80 ? '#f59e0b' : '#10b981', label: 'Charge', showValue: true }),
        ]),
        el('div', { className: 'team-skills' }, (c.skills || []).map(s => el('span', { className: 'skill-tag' }, [s]))),
        el('div', { className: 'team-stats' }, [
          el('div', { className: 'team-stat' }, [el('span', { className: 'stat-val' }, [String(memberTasks.length)]), el('span', { className: 'stat-label' }, ['Total'])]),
          el('div', { className: 'team-stat' }, [el('span', { className: 'stat-val' }, [String(inProg)]), el('span', { className: 'stat-label' }, [t('inProgress')])]),
          el('div', { className: 'team-stat' }, [el('span', { className: 'stat-val' }, [String(done)]), el('span', { className: 'stat-label' }, [t('done')])]),
        ]),
        isOverloaded ? el('div', { className: 'team-warning' }, [icon('alert') + ' ' + t('overloaded')]) : null,
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
      title: t('addMember'), content,
      footer: [
        el('button', { className: 'btn btn-secondary', onClick: () => m.close() }, [t('cancel')]),
        el('button', { className: 'btn btn-primary', onClick: () => {
          if (!data.name) { toast('Veuillez saisir un nom', 'warning'); return; }
          Store.addCollaborator(data);
          m.close();
          toast('Membre ajouté !', 'success');
        }}, [t('save')]),
      ]
    });
  }

  function editCollaborator(c) {
    const data = { ...c };
    const content = collabForm(data);
    const m = UI.modal({
      title: c.name, content,
      footer: [
        el('button', { className: 'btn btn-danger', onClick: () => {
          confirm(t('confirmDelete'), { danger: true, onConfirm: () => { Store.deleteCollaborator(c.id); m.close(); toast('Supprimé', 'info'); } });
        } }, [t('delete')]),
        el('div', { style: { flex: '1' } }),
        el('button', { className: 'btn btn-secondary', onClick: () => m.close() }, [t('cancel')]),
        el('button', { className: 'btn btn-primary', onClick: () => { Store.updateCollaborator(c.id, data); m.close(); toast('Modifié', 'success'); } }, [t('save')]),
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
      el('div', { className: 'form-group' }, [el('label', {}, [t('title')]), el('input', { type: 'text', className: 'form-input', value: data.name, onInput: (e) => { data.name = e.target.value; } })]),
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
    const usagePct = b.total ? Math.round(b.spent / b.total * 100) : 0;

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

    // Left column
    const left = el('div', { className: 'dashboard-col' });

    // Budget gauge
    const gaugeCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [el('h3', {}, [t('budgetUsage')])]),
      el('div', { className: 'card-body donut-center' }),
    ]);
    gaugeCard.querySelector('.card-body').appendChild(Charts.gauge({ value: usagePct, max: 100, size: 200, label: 'Budget', color: usagePct > 80 ? '#ef4444' : usagePct > 60 ? '#f59e0b' : '#10b981' }));
    left.appendChild(gaugeCard);

    // Budget breakdown by category (using budget.categories from store)
    const breakdownCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [el('h3', {}, ['Répartition par catégorie'])]),
      el('div', { className: 'card-body' }),
    ]);
    const breakdownBody = breakdownCard.querySelector('.card-body');
    (b.categories || []).forEach(cat => {
      const catPct = cat.allocated ? Math.round(cat.spent / cat.allocated * 100) : 0;
      breakdownBody.appendChild(el('div', { className: 'budget-row' }, [
        el('span', { className: 'budget-cat', style: { color: cat.color } }, [cat.name]),
        el('span', { className: 'budget-bar-wrap' }, [
          el('div', { className: 'budget-bar', style: { width: catPct + '%', background: cat.color } }),
        ]),
        el('span', { className: 'budget-amount' }, [formatCurrency(cat.spent) + ' / ' + formatCurrency(cat.allocated)]),
      ]));
    });
    left.appendChild(breakdownCard);

    // Right column
    const right = el('div', { className: 'dashboard-col' });

    // Monthly forecast bar chart
    const forecastCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [el('h3', {}, [t('forecast')])]),
      el('div', { className: 'card-body' }),
    ]);
    const monthlyData = (b.monthly || []).map(m => ({ label: m.month, value: m.actual, value2: m.planned }));
    if (monthlyData.length > 0) {
      forecastCard.querySelector('.card-body').appendChild(Charts.bar({ data: monthlyData, width: 460, height: 200, colors: ['#a855f7', '#6366f140'] }));
    } else {
      forecastCard.querySelector('.card-body').appendChild(el('p', { className: 'text-muted' }, ['Pas assez de données mensuelles.']));
    }
    right.appendChild(forecastCard);

    // Budget alerts
    const alertsCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [el('h3', { innerHTML: icon('alert') + ' Alertes budget' })]),
      el('div', { className: 'card-body' }),
    ]);
    const alertsBody = alertsCard.querySelector('.card-body');
    if (usagePct > 80) alertsBody.appendChild(el('div', { className: 'risk-item' }, [el('span', { className: 'risk-severity', style: { background: '#ef444420', color: '#ef4444' } }, ['Critique']), el('span', {}, [`Budget utilisé à ${usagePct}% — risque de dépassement`])]));
    else if (usagePct > 60) alertsBody.appendChild(el('div', { className: 'risk-item' }, [el('span', { className: 'risk-severity', style: { background: '#f59e0b20', color: '#f59e0b' } }, ['Attention']), el('span', {}, ['Plus de 60% du budget consommé'])]));
    // Over-budget categories
    (b.categories || []).forEach(cat => {
      if (cat.spent > cat.allocated) {
        alertsBody.appendChild(el('div', { className: 'risk-item' }, [el('span', { className: 'risk-severity', style: { background: '#ef444420', color: '#ef4444' } }, ['Dépassé']), el('span', {}, [`${cat.name}: ${formatCurrency(cat.spent - cat.allocated)} de dépassement`])]));
      }
    });
    if (alertsBody.children.length === 0) alertsBody.appendChild(el('p', { className: 'text-muted' }, ['✅ Aucune alerte budget.']));
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

    const grid = el('div', { className: 'dashboard-grid' });
    const left = el('div', { className: 'dashboard-col' });

    // Velocity card — FIXED: use h.tasksCompleted, velocity.likely
    const velCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [
        el('h3', {}, [t('velocity')]),
        velocity.likely ? el('span', { className: 'badge badge-info' }, ['Préd: ' + velocity.likely + ' pts/sem']) : null,
      ].filter(Boolean)),
      el('div', { className: 'card-body' }),
    ]);
    const velData = (state.history || []).slice(-12).map((h, i) => ({ label: 'S' + (i + 1), value: h.tasksCompleted || 0 }));
    if (velData.length > 2) {
      velCard.querySelector('.card-body').appendChild(Charts.bar({ data: velData, width: 460, height: 200 }));
    } else {
      velCard.querySelector('.card-body').appendChild(el('p', { className: 'text-muted' }, ['Pas assez d\'historique pour la vélocité.']));
    }
    left.appendChild(velCard);

    // Velocity forecast summary
    const velForecast = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [el('h3', {}, ['Prévisions vélocité'])]),
      el('div', { className: 'card-body' }, [
        el('div', { className: 'velocity-forecast' }, [
          el('div', { className: 'vel-item' }, [el('span', { className: 'vel-label' }, ['Optimiste']), el('span', { className: 'vel-value', style: { color: '#10b981' } }, [String(velocity.optimistic)])]),
          el('div', { className: 'vel-item' }, [el('span', { className: 'vel-label' }, ['Probable']), el('span', { className: 'vel-value', style: { color: '#00d4ff' } }, [String(velocity.likely)])]),
          el('div', { className: 'vel-item' }, [el('span', { className: 'vel-label' }, ['Pessimiste']), el('span', { className: 'vel-value', style: { color: '#ef4444' } }, [String(velocity.pessimistic)])]),
          el('div', { className: 'vel-item' }, [el('span', { className: 'vel-label' }, ['Tendance']), el('span', { className: 'vel-value' }, [velocity.trend === 'up' ? '📈 Hausse' : velocity.trend === 'down' ? '📉 Baisse' : '➡️ Stable'])]),
        ]),
      ]),
    ]);
    left.appendChild(velForecast);

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

    // Priority radar — FIXED: use correct Charts.radar API
    const prioData = [];
    ['critical', 'high', 'medium', 'low'].forEach(p => {
      prioData.push({ label: t(p), value: state.tasks.filter(tt => tt.priority === p).length });
    });
    const radarCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [el('h3', {}, ['Répartition priorités'])]),
      el('div', { className: 'card-body donut-center' }),
    ]);
    radarCard.querySelector('.card-body').appendChild(Charts.radar({ data: prioData, size: 220, color: '#00d4ff' }));
    right.appendChild(radarCard);

    // Cycle time
    const ctCard = el('div', { className: 'card' }, [
      el('div', { className: 'card-header' }, [el('h3', {}, ['Temps de cycle moyen'])]),
      el('div', { className: 'card-body' }),
    ]);
    const ctBody = ctCard.querySelector('.card-body');
    Object.entries(cycleTimes).forEach(([status, days]) => {
      if (status === 'done') return; // Skip done column
      ctBody.appendChild(el('div', { className: 'cycle-row' }, [
        el('span', { className: 'cycle-status', style: { color: statusColors[status] } }, [t(status)]),
        el('div', { className: 'cycle-bar-wrap' }, [
          el('div', { className: 'cycle-bar', style: { width: Math.min(days * 10, 100) + '%', background: statusColors[status] } }),
        ]),
        el('span', { className: 'cycle-value' }, [days.toFixed(1) + ' j']),
      ]));
    });
    right.appendChild(ctCard);

    // Category heatmap (activity per category)
    const catActivity = {};
    state.tasks.forEach(t => { catActivity[t.category] = (catActivity[t.category] || 0) + (t.spentHours || 0); });
    const catBarData = Object.entries(catActivity).map(([cat, hours]) => ({
      label: cat, value: hours, color: categoryColors[cat]
    })).sort((a, b) => b.value - a.value);

    if (catBarData.length > 0) {
      const catCard = el('div', { className: 'card' }, [
        el('div', { className: 'card-header' }, [el('h3', {}, ['Heures par catégorie'])]),
        el('div', { className: 'card-body' }),
      ]);
      catCard.querySelector('.card-body').appendChild(Charts.bar({ data: catBarData, width: 460, height: 180, horizontal: true }));
      right.appendChild(catCard);
    }

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
    const typeLabels = { all: 'Toutes', completed: 'Terminé', created: 'Créé', moved: 'Déplacé', comment: 'Commentaire', blocked: 'Bloqué', milestone: 'Jalon' };
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
      }, [typeLabels[type] || type]));
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
        const collab = a.user ? Store.getCollaborator(a.user) : null;
        listEl.appendChild(el('div', { className: 'activity-entry' }, [
          el('div', { className: 'activity-dot-lg', style: { background: activityColors[a.type] || '#6b7280' } }),
          el('div', { className: 'activity-content' }, [
            collab ? el('span', { className: 'activity-user' }, [collab.avatar + ' ' + collab.name + ' — ']) : null,
            el('span', { className: 'activity-text' }, [a.message || '']),
            a.timestamp ? el('span', { className: 'activity-time text-muted' }, [formatDateTime(a.timestamp)]) : null,
          ].filter(Boolean)),
        ]));
      });
    }
    renderActivities();
  }

  /* ══════════════════════════════════════════════════════════
     8. SETTINGS — FIXED: lang → language, export fixed
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
          el('span', { className: 'settings-value' }, [state.auth ? '🟢 Connecté' : '🔴 Hors ligne']),
        ]),
        state.auth
          ? el('button', { className: 'btn btn-secondary', onClick: () => { Store.logout(); toast(t('logout'), 'info'); settings(container); } }, [t('logout')])
          : el('button', { className: 'btn btn-primary', onClick: () => UI.loginModal({ onLogin: () => settings(container) }) }, [t('login')]),
      ]),
      state.auth ? el('div', { className: 'settings-row' }, [
        el('button', { className: 'btn btn-secondary', onClick: async () => { await Store.cloudSave(); toast('Sauvegardé !', 'success'); } }, [icon('upload') + ' Sauver dans le cloud']),
        el('button', { className: 'btn btn-secondary', onClick: async () => { await Store.cloudLoad(); toast('Chargé !', 'success'); settings(container); } }, [icon('download') + ' Charger du cloud']),
      ]) : null,
    ].filter(Boolean));
    sections.appendChild(cloudSection);

    // Appearance — FIXED: use 'language' not 'lang'
    const currentTheme = state.settings?.theme || 'dark';
    const isLight = currentTheme === 'light';
    const currentLang = state.settings?.language || 'fr';

    const appearSection = el('div', { className: 'settings-section' }, [
      el('h3', { innerHTML: icon('sun') + ' ' + t('appearance') }),
      el('div', { className: 'settings-row' }, [
        el('span', { className: 'settings-label' }, ['Thème']),
        select({ value: isLight ? 'light' : 'dark', options: [{ value: 'dark', label: '🌙 Sombre' }, { value: 'light', label: '☀️ Clair' }], onChange: (v) => { Store.updateSettings({ theme: v }); document.body.dataset.theme = v; } }),
      ]),
      el('div', { className: 'settings-row' }, [
        el('span', { className: 'settings-label' }, [t('language')]),
        select({ value: currentLang, options: [{ value: 'fr', label: '🇫🇷 Français' }, { value: 'en', label: '🇬🇧 English' }], onChange: (v) => {
          Store.updateSettings({ language: v });
          settings(container); // Re-render settings with new language
          toast(t('language') + ': ' + (v === 'fr' ? 'Français' : 'English'), 'info');
        }}),
      ]),
      el('div', { className: 'settings-row' }, [
        el('span', { className: 'settings-label' }, ['Mode compact']),
        el('label', { className: 'toggle-switch' }, [
          el('input', { type: 'checkbox', checked: state.settings.compactMode ? 'checked' : undefined, onChange: (e) => { Store.updateSettings({ compactMode: e.target.checked }); } }),
          el('span', { className: 'toggle-slider' }),
        ]),
      ]),
    ]);
    sections.appendChild(appearSection);

    // Data management — FIXED: exportData returns json now, no double-download
    const dataSection = el('div', { className: 'settings-section' }, [
      el('h3', { innerHTML: icon('download') + ' ' + t('exportData') + ' / ' + t('importData') }),
      el('div', { className: 'settings-row' }, [
        el('button', { className: 'btn btn-secondary', onClick: () => {
          Store.exportData(); // This now handles download + returns json
          toast('Données exportées !', 'success');
        }}, [icon('download') + ' Exporter JSON']),
        el('button', { className: 'btn btn-secondary', onClick: () => {
          const input = document.createElement('input');
          input.type = 'file'; input.accept = '.json';
          input.onchange = (ev) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const ok = Store.importData(e.target.result);
                if (ok) { toast('Données importées !', 'success'); settings(container); }
                else toast('Erreur lors de l\'import', 'error');
              } catch (err) { toast('Erreur: ' + err.message, 'error'); }
            };
            reader.readAsText(ev.target.files[0]);
          };
          input.click();
        }}, [icon('upload') + ' Importer JSON']),
      ]),
      el('div', { className: 'settings-row' }, [
        el('button', { className: 'btn btn-secondary', onClick: () => confirm('Réinitialiser avec les données de démo ?', { onConfirm: () => { Store.resetToDemo(); toast('Données réinitialisées', 'success'); } }) }, ['🔄 ' + t('resetData')]),
        el('button', { className: 'btn btn-danger', onClick: () => confirm('SUPPRIMER toutes les données ? Cette action est irréversible !', { danger: true, onConfirm: () => { Store.clearAllData(); toast('Données supprimées', 'info'); } }) }, [icon('trash') + ' ' + t('delete')]),
      ]),
    ]);
    sections.appendChild(dataSection);

    // Keyboard shortcuts
    const shortcutsSection = el('div', { className: 'settings-section' }, [
      el('h3', { innerHTML: icon('command') + ' ' + t('shortcuts') }),
      el('div', { className: 'shortcuts-grid' }, [
        shortcutRow('Ctrl+K', t('cmdPalette')),
        shortcutRow('Ctrl+N', t('createTask')),
        shortcutRow('Ctrl+Z', t('undo')),
        shortcutRow('Ctrl+Shift+Z', t('redo')),
        shortcutRow('1-9', t('goTo') + ' vue'),
      ]),
    ]);
    sections.appendChild(shortcutsSection);

    // About
    const aboutSection = el('div', { className: 'settings-section' }, [
      el('h3', {}, ['À propos']),
      el('p', { className: 'text-muted' }, ['Project Hub v2.1.0 — Gestion de projet intelligente']),
      el('p', { className: 'text-muted' }, ['EZGalaxy Platform © 2025']),
    ]);
    sections.appendChild(aboutSection);

    container.appendChild(sections);
  }

  function shortcutRow(keys, description) {
    return el('div', { className: 'shortcut-row' }, [
      el('kbd', { className: 'shortcut-key' }, [keys]),
      el('span', {}, [description]),
    ]);
  }

  /* ══════════════════════════════════════════════════════════
     9. AI ASSISTANT — ALL BUGS FIXED
     ══════════════════════════════════════════════════════════ */
  function aiAssistant(container) {
    const state = Store.getState();
    const risksResult = Predictions.analyzeRisks();
    const sprintPlan = Predictions.suggestSprintPlan(80);
    const focus = Predictions.suggestTodaysFocus();
    const reassignments = Predictions.suggestReassignments();
    const priorities = Predictions.recommendPriorities();
    const nextTasks = Predictions.suggestNextTasks();

    container.innerHTML = '';
    container.className = 'view-content view-ai';

    container.appendChild(el('div', { className: 'view-header' }, [
      el('h2', { innerHTML: icon('ai') + ' ' + t('aiAssistant') }),
    ]));

    const grid = el('div', { className: 'ai-grid' });

    // Sprint Planning — FIXED: use .tasks, .totalHours, .remainingCapacity
    const planCard = el('div', { className: 'card card-ai' }, [
      el('div', { className: 'card-header' }, [
        el('h3', { innerHTML: icon('target') + ' ' + t('planningSprint') }),
      ]),
      el('div', { className: 'card-body' }),
    ]);
    const planBody = planCard.querySelector('.card-body');
    const planTasks = sprintPlan.tasks || [];
    if (planTasks.length > 0) {
      planBody.appendChild(el('p', { className: 'ai-summary' }, [`Capacité: 80h — Sélectionné: ${planTasks.length} tâches (${sprintPlan.totalHours}h) — Restant: ${sprintPlan.remainingCapacity}h`]));
      planTasks.forEach(s => {
        const task = Store.getTask(s.id);
        if (task) {
          planBody.appendChild(el('div', { className: 'ai-plan-item', onClick: () => openTask(task) }, [
            el('span', { className: 'mini-dot', style: { background: priorityColors[task.priority] } }),
            el('span', {}, [task.title]),
            el('span', { className: 'text-muted' }, [`${s.estimateHours || '?'}h`]),
            el('span', { className: 'ai-score text-muted' }, ['Score: ' + Math.round(s.score)]),
          ]));
        }
      });
    } else {
      planBody.appendChild(el('p', { className: 'text-muted' }, ['Aucune tâche à planifier.']));
    }
    grid.appendChild(planCard);

    // Risk report — FIXED: use risksResult.risks array, severity as number
    const risksList = risksResult.risks || [];
    const riskCard = el('div', { className: 'card card-ai' }, [
      el('div', { className: 'card-header' }, [
        el('h3', { innerHTML: icon('alert') + ' ' + t('riskAnalysis') }),
        el('span', { className: 'badge badge-' + (risksResult.count > 3 ? 'danger' : risksResult.count > 0 ? 'warning' : 'success') }, [
          'Score: ' + risksResult.score + '/100'
        ]),
      ]),
      el('div', { className: 'card-body' }),
    ]);
    const riskBody = riskCard.querySelector('.card-body');
    if (risksList.length === 0) {
      riskBody.appendChild(el('p', { className: 'ai-good' }, ['✅ Aucun risque détecté !']));
    } else {
      risksList.forEach(r => {
        const sevLabel = r.severity >= 70 ? 'Critique' : r.severity >= 40 ? 'Modéré' : 'Faible';
        const sevColor = r.severity >= 70 ? '#ef4444' : r.severity >= 40 ? '#f59e0b' : '#3b82f6';
        riskBody.appendChild(el('div', { className: 'risk-item' }, [
          el('span', { className: 'risk-severity', style: { background: sevColor + '20', color: sevColor } }, [sevLabel]),
          el('div', { className: 'risk-detail' }, [
            el('span', { className: 'risk-msg' }, [r.title]),
            r.detail ? el('span', { className: 'risk-sub text-muted' }, [r.detail]) : null,
            r.recommendation ? el('span', { className: 'risk-rec' }, ['💡 ' + r.recommendation]) : null,
          ].filter(Boolean)),
        ]));
      });
    }
    grid.appendChild(riskCard);

    // Today's focus
    const focusCard = el('div', { className: 'card card-ai' }, [
      el('div', { className: 'card-header' }, [el('h3', { innerHTML: icon('zap') + ' ' + t('focusToday') })]),
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
            el('span', { className: 'focus-score' }, [String(Math.round(f.score))]),
            f.reason ? el('span', { className: 'focus-reason text-muted' }, [f.reason]) : null,
          ].filter(Boolean)));
        }
      });
    }
    grid.appendChild(focusCard);

    // Reassignment suggestions — FIXED: use r.from.id, r.to.id
    const reassignCard = el('div', { className: 'card card-ai' }, [
      el('div', { className: 'card-header' }, [el('h3', { innerHTML: icon('team') + ' Réaffectations suggérées' })]),
      el('div', { className: 'card-body' }),
    ]);
    const reassignBody = reassignCard.querySelector('.card-body');
    if (reassignments.length === 0) {
      reassignBody.appendChild(el('p', { className: 'text-muted' }, ['La charge de travail semble bien répartie.']));
    } else {
      reassignments.forEach(r => {
        reassignBody.appendChild(el('div', { className: 'ai-reassign' }, [
          el('div', { className: 'ai-reassign-info' }, [
            el('span', { className: 'ai-reassign-task' }, [r.taskTitle]),
            el('span', { className: 'ai-reassign-arrow' }, [r.from.name + ' → ' + r.to.name]),
            el('span', { className: 'text-muted' }, [r.reason]),
          ]),
          el('button', { className: 'btn btn-sm btn-primary', onClick: () => {
            Store.updateTask(r.taskId, { assignee: r.to.id });
            toast('Tâche réaffectée !', 'success');
          }}, ['Appliquer']),
        ]));
      });
    }
    grid.appendChild(reassignCard);

    // Priority recommendations
    if (priorities.length > 0) {
      const prioCard = el('div', { className: 'card card-ai' }, [
        el('div', { className: 'card-header' }, [el('h3', { innerHTML: icon('flag') + ' Priorités à ajuster' })]),
        el('div', { className: 'card-body' }),
      ]);
      const prioBody = prioCard.querySelector('.card-body');
      priorities.slice(0, 5).forEach(p => {
        prioBody.appendChild(el('div', { className: 'ai-priority-item' }, [
          el('div', { className: 'ai-priority-info' }, [
            el('span', {}, [p.taskTitle]),
            el('span', { className: 'ai-priority-change' }, [
              el('span', { style: { color: priorityColors[p.current] } }, [t(p.current)]),
              ' → ',
              el('span', { style: { color: priorityColors[p.suggested] } }, [t(p.suggested)]),
            ]),
            el('span', { className: 'text-muted' }, [p.reasons.join(', ')]),
          ]),
          el('button', { className: 'btn btn-sm btn-secondary', onClick: () => {
            Store.updateTask(p.taskId, { priority: p.suggested });
            toast('Priorité mise à jour !', 'success');
          }}, ['Appliquer']),
        ]));
      });
      grid.appendChild(prioCard);
    }

    // Suggested next tasks
    if (nextTasks.length > 0) {
      const nextCard = el('div', { className: 'card card-ai' }, [
        el('div', { className: 'card-header' }, [el('h3', { innerHTML: icon('plus') + ' Tâches suggérées' })]),
        el('div', { className: 'card-body' }),
      ]);
      const nextBody = nextCard.querySelector('.card-body');
      nextTasks.forEach(nt => {
        nextBody.appendChild(el('div', { className: 'ai-suggest-task' }, [
          el('div', { className: 'ai-suggest-info' }, [
            el('span', { className: 'ai-suggest-title' }, [nt.title]),
            el('span', { className: 'text-muted' }, [nt.reason]),
          ]),
          el('button', { className: 'btn btn-sm btn-primary', onClick: () => {
            Store.addTask({ title: nt.title, category: nt.category, priority: nt.priority });
            toast(t('taskCreated'), 'success');
          }}, ['Créer']),
        ]));
      });
      grid.appendChild(nextCard);
    }

    container.appendChild(grid);
  }

  /* ── Public API ──────────────────────────────────────────── */
  window.Views = { dashboard, kanban, timeline, team, budget, analytics, activity, settings, aiAssistant };
})();
