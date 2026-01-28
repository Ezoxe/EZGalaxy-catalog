/**
 * Project Hub - Views Module
 * All 8 views rendered with full interactivity
 */

(function(global) {
    'use strict';

    var el = UI.el;
    var icon = UI.icon;

    // ========================================================================
    // DASHBOARD VIEW
    // ========================================================================
    function renderDashboard(container) {
        container.innerHTML = '';
        var metrics = Store.getMetrics();
        var state = Store.getState();

        // Header
        var header = el('div', { className: 'view-header' }, [
            el('div', {}, [
                el('h1', { className: 'view-title' }, 'Dashboard'),
                el('p', { className: 'view-subtitle' }, 'Project overview and key metrics')
            ]),
            el('div', { className: 'header-actions' }, [
                el('button', { className: 'btn btn-primary', onClick: function() { UI.openTaskModal(null); } }, [
                    icon('plus', 16),
                    ' New Task'
                ])
            ])
        ]);
        container.appendChild(header);

        // Stats Grid
        var statsGrid = el('div', { className: 'stats-grid' });
        statsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(4, 1fr);gap:20px;margin-bottom:30px;';

        statsGrid.appendChild(UI.statCard({
            title: 'Total Tasks',
            value: metrics.totalTasks,
            icon: 'kanban',
            color: '#00d4ff',
            subtitle: metrics.completed + ' completed',
            delay: 0.1
        }));

        statsGrid.appendChild(UI.statCard({
            title: 'Completion Rate',
            value: metrics.completionRate + '%',
            icon: 'target',
            color: '#22c55e',
            trend: 5.2,
            delay: 0.2
        }));

        statsGrid.appendChild(UI.statCard({
            title: 'Budget Used',
            value: UI.formatCurrency(state.financials.used),
            icon: 'budget',
            color: '#a855f7',
            subtitle: Math.round(state.financials.used / state.financials.budget * 100) + '% of total',
            delay: 0.3
        }));

        statsGrid.appendChild(UI.statCard({
            title: 'Team Velocity',
            value: metrics.avgVelocity + ' pts',
            icon: 'zap',
            color: '#facc15',
            trend: 8.5,
            sparklineData: state.history.slice(-14).map(function(h) { return h.velocity; }),
            delay: 0.4
        }));

        container.appendChild(statsGrid);

        // Main Charts Row
        var chartsRow = el('div', { className: 'charts-row' });
        chartsRow.style.cssText = 'display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:30px;';

        // Velocity Chart
        var velocityCard = el('div', { className: 'glass-card' });
        velocityCard.style.padding = '24px';

        var velocityHeader = el('div', { className: 'card-title' }, 'Team Velocity (Last 30 days)');
        velocityCard.appendChild(velocityHeader);

        var velocityChart = el('div', { className: 'chart-container' });
        velocityChart.style.height = '280px';
        velocityCard.appendChild(velocityChart);

        setTimeout(function() {
            Charts.line(velocityChart, state.history.slice(-30).map(function(h, i) {
                return { x: i, y: h.velocity, label: h.date.split('-').slice(1).join('/') };
            }), {
                color: '#00d4ff',
                showArea: true,
                showDots: true,
                showTooltip: true,
                height: 260,
                animate: true
            });
        }, 100);

        chartsRow.appendChild(velocityCard);

        // Tasks Distribution
        var distCard = el('div', { className: 'glass-card' });
        distCard.style.padding = '24px';

        var distHeader = el('div', { className: 'card-title' }, 'Tasks by Status');
        distCard.appendChild(distHeader);

        var distChart = el('div', { className: 'chart-container' });
        distChart.style.height = '280px';
        distCard.appendChild(distChart);

        var statusData = [
            { label: 'Backlog', value: metrics.tasksByStatus.backlog, color: '#6b7280' },
            { label: 'To Do', value: metrics.tasksByStatus.todo, color: '#00d4ff' },
            { label: 'In Progress', value: metrics.tasksByStatus['in-progress'], color: '#a855f7' },
            { label: 'Review', value: metrics.tasksByStatus.review, color: '#facc15' },
            { label: 'Done', value: metrics.tasksByStatus.done, color: '#22c55e' },
            { label: 'Blocked', value: metrics.tasksByStatus.blocked, color: '#ef4444' }
        ].filter(function(s) { return s.value > 0; });

        setTimeout(function() {
            Charts.donut(distChart, statusData, {
                size: 180,
                thickness: 35,
                showLabels: true,
                showLegend: true,
                animate: true
            });
        }, 200);

        chartsRow.appendChild(distCard);
        container.appendChild(chartsRow);

        // Bottom Row: Recent Tasks & Activity
        var bottomRow = el('div', { className: 'bottom-row' });
        bottomRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:20px;';

        // Recent Tasks
        var recentCard = el('div', { className: 'glass-card' });
        recentCard.style.padding = '24px';
        recentCard.appendChild(el('div', { className: 'card-title' }, 'Recent Tasks'));

        var recentList = el('div', { className: 'recent-tasks-list' });
        recentList.style.cssText = 'display:flex;flex-direction:column;gap:12px;max-height:300px;overflow-y:auto;';

        var recentTasks = state.tasks
            .filter(function(t) { return t.status !== 'done'; })
            .slice(0, 5);

        recentTasks.forEach(function(task, i) {
            var collaborator = Store.getCollaborator(task.assignee);
            var item = el('div', { className: 'recent-task-item' });
            item.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;cursor:pointer;transition:all 0.2s;opacity:0;transform:translateX(-20px);';
            item.style.transitionDelay = (i * 0.1) + 's';

            item.innerHTML = '<span class="priority-dot" style="background:' + UI.priorityColors[task.priority] + '"></span>' +
                '<div style="flex:1"><div style="font-weight:500;margin-bottom:2px;">' + task.title + '</div>' +
                '<div style="font-size:12px;color:rgba(255,255,255,0.5)">' + task.category + '</div></div>' +
                '<span style="font-size:12px;color:rgba(255,255,255,0.5)">' + task.progress + '%</span>';

            if (collaborator) {
                var avatar = el('span', { className: 'avatar-small' }, collaborator.avatar);
                avatar.style.cssText = 'font-size:16px;';
                item.appendChild(avatar);
            }

            item.addEventListener('click', function() { UI.openTaskModal(task); });
            item.addEventListener('mouseenter', function() { item.style.background = 'rgba(255,255,255,0.06)'; });
            item.addEventListener('mouseleave', function() { item.style.background = 'rgba(255,255,255,0.03)'; });

            recentList.appendChild(item);

            requestAnimationFrame(function() {
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            });
        });

        recentCard.appendChild(recentList);
        bottomRow.appendChild(recentCard);

        // Recent Activity
        var activityCard = el('div', { className: 'glass-card' });
        activityCard.style.padding = '24px';
        activityCard.appendChild(el('div', { className: 'card-title' }, 'Recent Activity'));

        var activityList = el('div', { className: 'activity-list' });
        activityList.style.cssText = 'display:flex;flex-direction:column;gap:10px;max-height:300px;overflow-y:auto;';

        state.activities.slice(0, 6).forEach(function(activity, i) {
            var item = el('div', { className: 'activity-item' });
            item.style.cssText = 'display:flex;gap:12px;padding:10px;opacity:0;transform:translateY(10px);transition:all 0.3s;';
            item.style.transitionDelay = (i * 0.1) + 's';

            var iconMap = { completed: 'check', created: 'plus', moved: 'arrow-right', comment: 'comment', assigned: 'team' };
            var colorMap = { completed: '#22c55e', created: '#00d4ff', moved: '#a855f7', comment: '#facc15', assigned: '#f97316' };

            item.innerHTML = '<div style="width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:' + colorMap[activity.type] + '"></div>' +
                '<div style="flex:1"><div style="font-size:13px;margin-bottom:2px;">' + activity.user + ' ' + activity.action + '</div>' +
                '<div style="font-size:11px;color:rgba(255,255,255,0.4)">' + UI.formatDateTime(activity.timestamp) + '</div></div>';

            item.querySelector('div').appendChild(icon(iconMap[activity.type] || 'zap', 14));

            activityList.appendChild(item);

            requestAnimationFrame(function() {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            });
        });

        activityCard.appendChild(activityList);
        bottomRow.appendChild(activityCard);

        container.appendChild(bottomRow);
    }

    // ========================================================================
    // KANBAN VIEW
    // ========================================================================
    function renderKanban(container) {
        container.innerHTML = '';
        var state = Store.getState();
        var filters = state.filters;

        // Header
        var header = el('div', { className: 'view-header' }, [
            el('div', {}, [
                el('h1', { className: 'view-title' }, 'Kanban Board'),
                el('p', { className: 'view-subtitle' }, 'Drag and drop to organize tasks')
            ]),
            el('div', { className: 'header-actions' }, [
                el('button', { className: 'btn btn-primary', onClick: function() { UI.openTaskModal(null); } }, [
                    icon('plus', 16),
                    ' New Task'
                ])
            ])
        ]);
        container.appendChild(header);

        // Filter Bar
        container.appendChild(UI.filterBar(filters, function(key, value) {
            Store.setFilter(key, value);
        }));

        // Kanban Board
        var board = el('div', { className: 'kanban-board' });
        board.style.cssText = 'display:grid;grid-template-columns:repeat(5, 1fr);gap:20px;overflow-x:auto;padding-bottom:20px;';

        var statuses = [
            { id: 'backlog', label: 'Backlog', color: '#6b7280' },
            { id: 'todo', label: 'To Do', color: '#00d4ff' },
            { id: 'in-progress', label: 'In Progress', color: '#a855f7' },
            { id: 'review', label: 'Review', color: '#facc15' },
            { id: 'done', label: 'Done', color: '#22c55e' }
        ];

        var tasks = Store.getFilteredTasks();

        statuses.forEach(function(status) {
            var column = el('div', { 
                className: 'kanban-column',
                dataset: { status: status.id }
            });
            column.style.cssText = 'min-width:280px;max-width:320px;background:rgba(255,255,255,0.02);border-radius:16px;padding:16px;';

            // Column Header
            var colHeader = el('div', { className: 'column-header' });
            colHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid ' + status.color + ';';

            var statusTasks = tasks.filter(function(t) { return t.status === status.id; });

            colHeader.appendChild(el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [
                el('span', { style: { width: '10px', height: '10px', borderRadius: '50%', background: status.color } }),
                el('span', { style: { fontWeight: '600' } }, status.label),
                el('span', { className: 'count-badge', style: { background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' } }, statusTasks.length)
            ]));

            var addBtn = el('button', { 
                className: 'btn-icon',
                onClick: function() {
                    var task = { status: status.id };
                    UI.openTaskModal(task);
                }
            }, [icon('plus', 16)]);
            colHeader.appendChild(addBtn);

            column.appendChild(colHeader);

            // Cards Container
            var cardsContainer = el('div', { 
                className: 'kanban-cards',
                dataset: { status: status.id }
            });
            cardsContainer.style.cssText = 'display:flex;flex-direction:column;gap:12px;min-height:200px;';

            statusTasks.forEach(function(task, i) {
                var card = UI.taskCard(task, { draggable: true });
                card.style.transitionDelay = (i * 0.05) + 's';
                cardsContainer.appendChild(card);
            });

            // Drop zone
            cardsContainer.addEventListener('dragover', function(e) {
                e.preventDefault();
                cardsContainer.style.background = 'rgba(' + (status.id === 'done' ? '34,197,94' : status.id === 'in-progress' ? '168,85,247' : '0,212,255') + ',0.1)';
            });

            cardsContainer.addEventListener('dragleave', function(e) {
                cardsContainer.style.background = 'transparent';
            });

            cardsContainer.addEventListener('drop', function(e) {
                e.preventDefault();
                cardsContainer.style.background = 'transparent';
                var taskId = e.dataTransfer.getData('text/plain');
                if (taskId) {
                    Store.moveTask(taskId, status.id);
                    UI.toast('Task moved to ' + status.label, 'success');
                }
            });

            column.appendChild(cardsContainer);
            board.appendChild(column);
        });

        container.appendChild(board);
    }

    // ========================================================================
    // TIMELINE VIEW
    // ========================================================================
    function renderTimeline(container) {
        container.innerHTML = '';
        var state = Store.getState();

        // Header
        var header = el('div', { className: 'view-header' }, [
            el('div', {}, [
                el('h1', { className: 'view-title' }, 'Timeline'),
                el('p', { className: 'view-subtitle' }, 'Gantt chart view of project schedule')
            ]),
            el('div', { className: 'header-actions' }, [
                el('button', { className: 'btn', onClick: function() { renderTimeline(container); } }, [
                    icon('refresh', 16),
                    ' Refresh'
                ]),
                el('button', { className: 'btn btn-primary', onClick: function() { UI.openTaskModal(null); } }, [
                    icon('plus', 16),
                    ' New Task'
                ])
            ])
        ]);
        container.appendChild(header);

        // Timeline Container
        var timelineCard = el('div', { className: 'glass-card' });
        timelineCard.style.padding = '24px';
        timelineCard.style.overflow = 'auto';

        // Calculate date range
        var today = new Date();
        var startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        var endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 60);

        var totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        var dayWidth = 30;

        // Header with dates
        var ganttHeader = el('div', { className: 'gantt-header' });
        ganttHeader.style.cssText = 'display:flex;position:sticky;top:0;background:rgba(10,15,26,0.95);z-index:10;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:10px;margin-bottom:10px;';

        var labelCol = el('div', { style: { width: '250px', flexShrink: 0, fontWeight: 600 } }, 'Task');
        ganttHeader.appendChild(labelCol);

        var datesContainer = el('div', { style: { display: 'flex' } });
        for (var d = 0; d < totalDays; d++) {
            var date = new Date(startDate);
            date.setDate(date.getDate() + d);
            var dayEl = el('div', { style: { width: dayWidth + 'px', textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.5)' } });
            
            if (d === 0 || date.getDate() === 1) {
                dayEl.style.fontWeight = '600';
                dayEl.style.color = '#fff';
                dayEl.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else if (date.getDate() % 5 === 0) {
                dayEl.textContent = date.getDate();
            }

            // Today marker
            if (date.toDateString() === today.toDateString()) {
                dayEl.style.color = '#00d4ff';
                dayEl.style.fontWeight = '600';
            }

            datesContainer.appendChild(dayEl);
        }
        ganttHeader.appendChild(datesContainer);
        timelineCard.appendChild(ganttHeader);

        // Tasks
        var tasksWithDates = state.tasks.filter(function(t) { return t.startDate && t.endDate; });

        tasksWithDates.forEach(function(task, i) {
            var row = el('div', { className: 'gantt-row' });
            row.style.cssText = 'display:flex;align-items:center;min-height:50px;border-bottom:1px solid rgba(255,255,255,0.05);opacity:0;transform:translateX(-20px);transition:all 0.3s;cursor:pointer;';
            row.style.transitionDelay = (i * 0.05) + 's';

            // Task label
            var label = el('div', { style: { width: '250px', flexShrink: 0, paddingRight: '16px' } });
            label.innerHTML = '<div style="font-weight:500;margin-bottom:2px;">' + task.title + '</div>' +
                '<div style="font-size:11px;color:rgba(255,255,255,0.5);">' + 
                (Store.getCollaborator(task.assignee)?.name || 'Unassigned') + '</div>';

            row.appendChild(label);

            // Timeline bar container
            var barContainer = el('div', { style: { display: 'flex', position: 'relative', height: '30px' } });
            barContainer.style.width = (totalDays * dayWidth) + 'px';

            // Calculate bar position
            var taskStart = new Date(task.startDate);
            var taskEnd = new Date(task.endDate);
            var startOffset = Math.max(0, Math.ceil((taskStart - startDate) / (1000 * 60 * 60 * 24)));
            var duration = Math.ceil((taskEnd - taskStart) / (1000 * 60 * 60 * 24)) + 1;

            var bar = el('div', { className: 'gantt-bar' });
            bar.style.cssText = 'position:absolute;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;color:#fff;cursor:pointer;transition:all 0.2s;';
            bar.style.left = (startOffset * dayWidth) + 'px';
            bar.style.width = (duration * dayWidth - 4) + 'px';
            bar.style.background = 'linear-gradient(90deg, ' + UI.statusColors[task.status] + ', ' + UI.statusColors[task.status] + 'aa)';
            bar.style.boxShadow = '0 2px 10px ' + UI.statusColors[task.status] + '40';

            // Progress overlay
            var progressBar = el('div');
            progressBar.style.cssText = 'position:absolute;left:0;top:0;height:100%;background:rgba(255,255,255,0.2);border-radius:6px;transition:width 0.5s;';
            progressBar.style.width = task.progress + '%';
            bar.appendChild(progressBar);

            bar.appendChild(el('span', { style: { position: 'relative', zIndex: 1 } }, task.progress + '%'));

            bar.addEventListener('click', function() { UI.openTaskModal(task); });
            bar.addEventListener('mouseenter', function() { bar.style.transform = 'scale(1.05)'; });
            bar.addEventListener('mouseleave', function() { bar.style.transform = 'scale(1)'; });

            barContainer.appendChild(bar);

            // Today line
            var todayOffset = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
            var todayLine = el('div');
            todayLine.style.cssText = 'position:absolute;width:2px;height:30px;background:#00d4ff;left:' + (todayOffset * dayWidth) + 'px;';
            barContainer.appendChild(todayLine);

            row.appendChild(barContainer);

            // Dependencies (visual lines)
            if (task.dependencies && task.dependencies.length > 0) {
                var depBadge = el('div');
                depBadge.style.cssText = 'position:absolute;left:' + (startOffset * dayWidth - 12) + 'px;top:8px;';
                depBadge.appendChild(icon('link', 12));
                barContainer.appendChild(depBadge);
            }

            row.addEventListener('click', function() { UI.openTaskModal(task); });

            timelineCard.appendChild(row);

            requestAnimationFrame(function() {
                row.style.opacity = '1';
                row.style.transform = 'translateX(0)';
            });
        });

        container.appendChild(timelineCard);

        // Legend
        var legend = el('div', { className: 'glass-card' });
        legend.style.cssText = 'padding:16px;margin-top:20px;display:flex;gap:24px;flex-wrap:wrap;';

        Object.keys(UI.statusColors).forEach(function(status) {
            var item = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } });
            item.appendChild(el('span', { style: { width: '16px', height: '16px', borderRadius: '4px', background: UI.statusColors[status] } }));
            item.appendChild(el('span', { style: { fontSize: '13px' } }, status.replace('-', ' ')));
            legend.appendChild(item);
        });

        container.appendChild(legend);
    }

    // ========================================================================
    // TEAM VIEW
    // ========================================================================
    function renderTeam(container) {
        container.innerHTML = '';
        var state = Store.getState();
        var metrics = Store.getMetrics();

        // Header
        var header = el('div', { className: 'view-header' }, [
            el('div', {}, [
                el('h1', { className: 'view-title' }, 'Team'),
                el('p', { className: 'view-subtitle' }, 'Workload matrix and team performance')
            ])
        ]);
        container.appendChild(header);

        // Team Stats
        var statsRow = el('div', { className: 'stats-grid' });
        statsRow.style.cssText = 'display:grid;grid-template-columns:repeat(4, 1fr);gap:20px;margin-bottom:30px;';

        statsRow.appendChild(UI.statCard({ title: 'Team Size', value: state.collaborators.length, icon: 'team', color: '#00d4ff', delay: 0.1 }));
        statsRow.appendChild(UI.statCard({ title: 'Active Tasks', value: metrics.inProgress + metrics.review, icon: 'kanban', color: '#a855f7', delay: 0.2 }));
        statsRow.appendChild(UI.statCard({ title: 'Avg Workload', value: Math.round(state.collaborators.reduce(function(sum, c) { return sum + c.workload; }, 0) / state.collaborators.length) + '%', icon: 'target', color: '#facc15', delay: 0.3 }));
        statsRow.appendChild(UI.statCard({ title: 'Blocked Tasks', value: metrics.blocked, icon: 'alert', color: '#ef4444', delay: 0.4 }));

        container.appendChild(statsRow);

        // Team Grid
        var teamGrid = el('div', { className: 'team-grid' });
        teamGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:20px;';

        state.collaborators.forEach(function(member, i) {
            var memberTasks = state.tasks.filter(function(t) { return t.assignee === member.id; });
            var inProgress = memberTasks.filter(function(t) { return t.status === 'in-progress'; }).length;
            var completed = memberTasks.filter(function(t) { return t.status === 'done'; }).length;

            var card = el('div', { className: 'glass-card team-card' });
            card.style.cssText = 'padding:24px;opacity:0;transform:translateY(30px);transition:all 0.5s cubic-bezier(0.4, 0, 0.2, 1);cursor:pointer;';
            card.style.transitionDelay = (i * 0.1) + 's';

            // Avatar and name
            var headerEl = el('div', { style: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' } });
            
            var avatarEl = el('div', { style: { fontSize: '48px', width: '70px', height: '70px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, member.avatar);
            
            var infoEl = el('div', { style: { flex: 1 } });
            infoEl.innerHTML = '<div style="font-size:18px;font-weight:600;margin-bottom:4px;">' + member.name + '</div>' +
                '<div style="font-size:13px;color:rgba(255,255,255,0.5)">' + member.role + '</div>' +
                '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;"></div>';

            member.skills.slice(0, 3).forEach(function(skill) {
                var skillTag = el('span', { style: { fontSize: '11px', padding: '3px 8px', background: 'rgba(0,212,255,0.1)', borderRadius: '10px', color: '#00d4ff' } }, skill);
                infoEl.querySelector('div:last-child').appendChild(skillTag);
            });

            headerEl.appendChild(avatarEl);
            headerEl.appendChild(infoEl);
            card.appendChild(headerEl);

            // Workload bar
            var workloadContainer = el('div', { style: { marginBottom: '16px' } });
            workloadContainer.innerHTML = '<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;"><span>Workload</span><span>' + member.workload + '%</span></div>';
            
            var progressEl = el('div');
            Charts.progress(progressEl, member.workload, {
                color: member.workload > 80 ? '#ef4444' : member.workload > 60 ? '#facc15' : '#22c55e',
                height: 6,
                animate: true
            });
            workloadContainer.appendChild(progressEl);
            card.appendChild(workloadContainer);

            // Stats
            var statsEl = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' } });
            
            [
                { label: 'Active', value: inProgress, color: '#a855f7' },
                { label: 'Completed', value: completed, color: '#22c55e' },
                { label: 'Total', value: memberTasks.length, color: '#00d4ff' }
            ].forEach(function(stat) {
                var statEl = el('div', { style: { padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' } });
                statEl.innerHTML = '<div style="font-size:20px;font-weight:600;color:' + stat.color + ';">' + stat.value + '</div>' +
                    '<div style="font-size:11px;color:rgba(255,255,255,0.5)">' + stat.label + '</div>';
                statsEl.appendChild(statEl);
            });

            card.appendChild(statsEl);

            card.addEventListener('mouseenter', function() {
                card.style.transform = 'translateY(-5px)';
                card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
            });
            card.addEventListener('mouseleave', function() {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '';
            });

            teamGrid.appendChild(card);

            requestAnimationFrame(function() {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            });
        });

        container.appendChild(teamGrid);
    }

    // ========================================================================
    // BUDGET VIEW
    // ========================================================================
    function renderBudget(container) {
        container.innerHTML = '';
        var state = Store.getState();
        var fin = state.financials;

        // Header
        var header = el('div', { className: 'view-header' }, [
            el('div', {}, [
                el('h1', { className: 'view-title' }, 'Budget'),
                el('p', { className: 'view-subtitle' }, 'Financial overview and burn rate analysis')
            ])
        ]);
        container.appendChild(header);

        // Stats
        var statsRow = el('div', { className: 'stats-grid' });
        statsRow.style.cssText = 'display:grid;grid-template-columns:repeat(4, 1fr);gap:20px;margin-bottom:30px;';

        var remaining = fin.budget - fin.used;
        var percentUsed = Math.round(fin.used / fin.budget * 100);

        statsRow.appendChild(UI.statCard({ title: 'Total Budget', value: UI.formatCurrency(fin.budget), icon: 'budget', color: '#00d4ff', delay: 0.1 }));
        statsRow.appendChild(UI.statCard({ title: 'Spent', value: UI.formatCurrency(fin.used), icon: 'trending-down', color: percentUsed > 80 ? '#ef4444' : '#facc15', subtitle: percentUsed + '% of budget', delay: 0.2 }));
        statsRow.appendChild(UI.statCard({ title: 'Remaining', value: UI.formatCurrency(remaining), icon: 'trending-up', color: '#22c55e', delay: 0.3 }));
        statsRow.appendChild(UI.statCard({ title: 'Burn Rate', value: UI.formatCurrency(fin.burnRate) + '/mo', icon: 'zap', color: '#a855f7', delay: 0.4 }));

        container.appendChild(statsRow);

        // Charts Row
        var chartsRow = el('div', { className: 'charts-row' });
        chartsRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px;';

        // Budget Breakdown
        var breakdownCard = el('div', { className: 'glass-card' });
        breakdownCard.style.padding = '24px';
        breakdownCard.appendChild(el('div', { className: 'card-title' }, 'Budget Breakdown'));

        var breakdownChart = el('div');
        breakdownChart.style.height = '280px';
        breakdownCard.appendChild(breakdownChart);

        setTimeout(function() {
            Charts.donut(breakdownChart, fin.breakdown.map(function(b) {
                return { label: b.category, value: b.amount, color: b.color };
            }), { size: 180, thickness: 40, showLabels: true, showLegend: true, animate: true });
        }, 100);

        chartsRow.appendChild(breakdownCard);

        // Burn Rate Trend
        var burnCard = el('div', { className: 'glass-card' });
        burnCard.style.padding = '24px';
        burnCard.appendChild(el('div', { className: 'card-title' }, 'Monthly Burn Rate'));

        var burnChart = el('div');
        burnChart.style.height = '280px';
        burnCard.appendChild(burnChart);

        var burnData = [
            { x: 0, y: 42000, label: 'Jan' },
            { x: 1, y: 45000, label: 'Feb' },
            { x: 2, y: 48000, label: 'Mar' },
            { x: 3, y: 52000, label: 'Apr' },
            { x: 4, y: 47000, label: 'May' },
            { x: 5, y: 55000, label: 'Jun' }
        ];

        setTimeout(function() {
            Charts.bar(burnChart, burnData, { color: '#a855f7', showTooltip: true, horizontal: false, height: 250, animate: true });
        }, 200);

        chartsRow.appendChild(burnCard);
        container.appendChild(chartsRow);

        // Expense List
        var expenseCard = el('div', { className: 'glass-card' });
        expenseCard.style.padding = '24px';
        expenseCard.appendChild(el('div', { className: 'card-title' }, 'Expense Details'));

        var expenseTable = el('div');
        expenseTable.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

        fin.breakdown.forEach(function(item, i) {
            var row = el('div', { style: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', opacity: 0, transform: 'translateX(-20px)', transition: 'all 0.3s' } });
            row.style.transitionDelay = (i * 0.1) + 's';

            row.innerHTML = '<div style="width:12px;height:12px;borderRadius:50%;background:' + item.color + '"></div>' +
                '<div style="flex:1;font-weight:500;">' + item.category + '</div>' +
                '<div style="font-family:monospace;font-size:15px;">' + UI.formatCurrency(item.amount) + '</div>';

            // Progress bar
            var pct = Math.round(item.amount / fin.budget * 100);
            var progContainer = el('div', { style: { width: '100px' } });
            Charts.progress(progContainer, pct, { color: item.color, height: 4 });
            row.appendChild(progContainer);
            row.appendChild(el('span', { style: { fontSize: '12px', color: 'rgba(255,255,255,0.5)', width: '40px', textAlign: 'right' } }, pct + '%'));

            expenseTable.appendChild(row);

            requestAnimationFrame(function() {
                row.style.opacity = '1';
                row.style.transform = 'translateX(0)';
            });
        });

        expenseCard.appendChild(expenseTable);
        container.appendChild(expenseCard);
    }

    // ========================================================================
    // ANALYTICS VIEW
    // ========================================================================
    function renderAnalytics(container) {
        container.innerHTML = '';
        var state = Store.getState();
        var metrics = Store.getMetrics();

        // Header
        var header = el('div', { className: 'view-header' }, [
            el('div', {}, [
                el('h1', { className: 'view-title' }, 'Analytics'),
                el('p', { className: 'view-subtitle' }, 'AI-powered insights and predictions')
            ])
        ]);
        container.appendChild(header);

        // AI Insights Cards
        var insightsGrid = el('div');
        insightsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3, 1fr);gap:20px;margin-bottom:30px;';

        var insights = [
            { 
                title: '🎯 Completion Prediction', 
                value: '87%',
                description: 'Probability of completing sprint on time',
                color: '#22c55e',
                recommendation: 'Current velocity suggests successful completion. Consider taking on 2 more tasks.'
            },
            { 
                title: '⚠️ Risk Score', 
                value: '32',
                description: 'Overall project risk assessment (0-100)',
                color: '#facc15',
                recommendation: '2 tasks blocking progress. Priority: resolve API integration issue.'
            },
            { 
                title: '📊 Team Sentiment', 
                value: '8.2/10',
                description: 'Based on velocity trends and task completion',
                color: '#00d4ff',
                recommendation: 'Team morale is high. Recent velocity increase indicates good momentum.'
            }
        ];

        insights.forEach(function(insight, i) {
            var card = el('div', { className: 'glass-card' });
            card.style.cssText = 'padding:24px;opacity:0;transform:scale(0.9);transition:all 0.5s cubic-bezier(0.4, 0, 0.2, 1);';
            card.style.transitionDelay = (i * 0.1) + 's';

            card.innerHTML = '<div style="font-size:14px;margin-bottom:12px;color:rgba(255,255,255,0.7);">' + insight.title + '</div>' +
                '<div style="font-size:42px;font-weight:700;color:' + insight.color + ';margin-bottom:8px;">' + insight.value + '</div>' +
                '<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:16px;">' + insight.description + '</div>' +
                '<div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:12px;border-left:3px solid ' + insight.color + ';">' +
                '<strong>AI Recommendation:</strong><br>' + insight.recommendation + '</div>';

            insightsGrid.appendChild(card);

            requestAnimationFrame(function() {
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            });
        });

        container.appendChild(insightsGrid);

        // Charts
        var chartsRow = el('div');
        chartsRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px;';

        // Velocity Trend
        var velocityCard = el('div', { className: 'glass-card' });
        velocityCard.style.padding = '24px';
        velocityCard.appendChild(el('div', { className: 'card-title' }, 'Velocity Trend Analysis'));

        var velocityChart = el('div');
        velocityChart.style.height = '280px';
        velocityCard.appendChild(velocityChart);

        setTimeout(function() {
            Charts.line(velocityChart, state.history.slice(-30).map(function(h, i) {
                return { x: i, y: h.velocity, label: h.date.split('-').slice(1).join('/') };
            }), { color: '#00d4ff', showArea: true, showDots: true, showTooltip: true, height: 260, animate: true });
        }, 100);

        chartsRow.appendChild(velocityCard);

        // Priority Distribution
        var priorityCard = el('div', { className: 'glass-card' });
        priorityCard.style.padding = '24px';
        priorityCard.appendChild(el('div', { className: 'card-title' }, 'Priority Distribution'));

        var priorityChart = el('div');
        priorityChart.style.height = '280px';
        priorityCard.appendChild(priorityChart);

        var priorityData = [
            { label: 'Critical', value: state.tasks.filter(function(t) { return t.priority === 'critical'; }).length, color: '#ef4444' },
            { label: 'High', value: state.tasks.filter(function(t) { return t.priority === 'high'; }).length, color: '#f97316' },
            { label: 'Medium', value: state.tasks.filter(function(t) { return t.priority === 'medium'; }).length, color: '#facc15' },
            { label: 'Low', value: state.tasks.filter(function(t) { return t.priority === 'low'; }).length, color: '#22c55e' }
        ];

        setTimeout(function() {
            Charts.donut(priorityChart, priorityData, { size: 160, thickness: 30, showLabels: true, showLegend: true, animate: true });
        }, 200);

        chartsRow.appendChild(priorityCard);
        container.appendChild(chartsRow);

        // Task Completion by Category
        var categoryCard = el('div', { className: 'glass-card' });
        categoryCard.style.padding = '24px';
        categoryCard.appendChild(el('div', { className: 'card-title' }, 'Completion Rate by Category'));

        var categoryChart = el('div');
        categoryChart.style.height = '250px';
        categoryCard.appendChild(categoryChart);

        var categories = ['feature', 'bugfix', 'improvement', 'documentation', 'testing', 'devops'];
        var categoryData = categories.map(function(cat, i) {
            var catTasks = state.tasks.filter(function(t) { return t.category === cat; });
            var completed = catTasks.filter(function(t) { return t.status === 'done'; }).length;
            var rate = catTasks.length > 0 ? Math.round(completed / catTasks.length * 100) : 0;
            return { x: i, y: rate, label: cat };
        });

        setTimeout(function() {
            Charts.bar(categoryChart, categoryData, { color: '#a855f7', horizontal: true, height: 220, showTooltip: true, animate: true });
        }, 300);

        container.appendChild(categoryCard);
    }

    // ========================================================================
    // ACTIVITY VIEW
    // ========================================================================
    function renderActivity(container) {
        container.innerHTML = '';
        var state = Store.getState();

        // Header
        var header = el('div', { className: 'view-header' }, [
            el('div', {}, [
                el('h1', { className: 'view-title' }, 'Activity'),
                el('p', { className: 'view-subtitle' }, 'Real-time project activity feed')
            ]),
            el('div', { className: 'header-actions' }, [
                el('button', { className: 'btn', onClick: function() { renderActivity(container); } }, [
                    icon('refresh', 16),
                    ' Refresh'
                ])
            ])
        ]);
        container.appendChild(header);

        // Main content
        var contentRow = el('div');
        contentRow.style.cssText = 'display:grid;grid-template-columns:2fr 1fr;gap:20px;';

        // Activity Timeline
        var timelineCard = el('div', { className: 'glass-card' });
        timelineCard.style.padding = '24px';
        timelineCard.appendChild(el('div', { className: 'card-title' }, 'Activity Timeline'));

        var timeline = el('div', { className: 'activity-timeline' });
        timeline.style.cssText = 'position:relative;padding-left:30px;';

        // Vertical line
        var line = el('div');
        line.style.cssText = 'position:absolute;left:8px;top:0;bottom:0;width:2px;background:linear-gradient(to bottom, #00d4ff, transparent);';
        timeline.appendChild(line);

        state.activities.forEach(function(activity, i) {
            var item = el('div', { className: 'timeline-item' });
            item.style.cssText = 'position:relative;padding:16px 0;opacity:0;transform:translateX(-20px);transition:all 0.4s cubic-bezier(0.4, 0, 0.2, 1);';
            item.style.transitionDelay = (i * 0.1) + 's';

            var iconColors = { completed: '#22c55e', created: '#00d4ff', moved: '#a855f7', comment: '#facc15', assigned: '#f97316' };
            var iconNames = { completed: 'check', created: 'plus', moved: 'arrow-right', comment: 'comment', assigned: 'team' };

            // Dot
            var dot = el('div');
            dot.style.cssText = 'position:absolute;left:-26px;top:20px;width:16px;height:16px;border-radius:50%;background:' + iconColors[activity.type] + ';display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px ' + iconColors[activity.type] + '40;';
            item.appendChild(dot);

            // Content
            var content = el('div', { className: 'glass-card' });
            content.style.cssText = 'padding:16px;';
            content.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
                '<span style="font-weight:500;">' + activity.user + '</span>' +
                '<span style="font-size:12px;color:rgba(255,255,255,0.4);">' + UI.formatDateTime(activity.timestamp) + '</span></div>' +
                '<div style="color:rgba(255,255,255,0.8);">' + activity.action + '</div>';

            if (activity.task) {
                var taskLink = el('div');
                taskLink.style.cssText = 'margin-top:10px;padding:10px;background:rgba(0,212,255,0.05);border-radius:8px;cursor:pointer;transition:all 0.2s;';
                taskLink.innerHTML = '<span style="color:#00d4ff;font-size:13px;">' + activity.task + '</span>';
                taskLink.addEventListener('mouseenter', function() { taskLink.style.background = 'rgba(0,212,255,0.1)'; });
                taskLink.addEventListener('mouseleave', function() { taskLink.style.background = 'rgba(0,212,255,0.05)'; });
                content.appendChild(taskLink);
            }

            item.appendChild(content);
            timeline.appendChild(item);

            requestAnimationFrame(function() {
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            });
        });

        timelineCard.appendChild(timeline);
        contentRow.appendChild(timelineCard);

        // Stats Sidebar
        var sidebar = el('div');
        sidebar.style.cssText = 'display:flex;flex-direction:column;gap:20px;';

        // Activity by Type
        var typeCard = el('div', { className: 'glass-card' });
        typeCard.style.padding = '24px';
        typeCard.appendChild(el('div', { className: 'card-title' }, 'Activity by Type'));

        var typeData = {};
        state.activities.forEach(function(a) {
            typeData[a.type] = (typeData[a.type] || 0) + 1;
        });

        var typeChart = el('div');
        typeChart.style.height = '200px';
        typeCard.appendChild(typeChart);

        setTimeout(function() {
            var chartData = Object.keys(typeData).map(function(type) {
                var colors = { completed: '#22c55e', created: '#00d4ff', moved: '#a855f7', comment: '#facc15', assigned: '#f97316' };
                return { label: type, value: typeData[type], color: colors[type] || '#00d4ff' };
            });
            Charts.donut(typeChart, chartData, { size: 120, thickness: 25, showLegend: true, animate: true });
        }, 100);

        sidebar.appendChild(typeCard);

        // Top Contributors
        var contribCard = el('div', { className: 'glass-card' });
        contribCard.style.padding = '24px';
        contribCard.appendChild(el('div', { className: 'card-title' }, 'Top Contributors'));

        var contribs = {};
        state.activities.forEach(function(a) {
            contribs[a.user] = (contribs[a.user] || 0) + 1;
        });

        var contribList = el('div');
        contribList.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

        Object.keys(contribs).sort(function(a, b) { return contribs[b] - contribs[a]; }).slice(0, 5).forEach(function(user, i) {
            var row = el('div');
            row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px;background:rgba(255,255,255,0.02);border-radius:8px;';
            row.innerHTML = '<span style="font-size:12px;color:rgba(255,255,255,0.5);width:20px;">#' + (i + 1) + '</span>' +
                '<span style="flex:1;">' + user + '</span>' +
                '<span style="font-weight:600;color:#00d4ff;">' + contribs[user] + '</span>';
            contribList.appendChild(row);
        });

        contribCard.appendChild(contribList);
        sidebar.appendChild(contribCard);

        contentRow.appendChild(sidebar);
        container.appendChild(contentRow);
    }

    // ========================================================================
    // SETTINGS VIEW
    // ========================================================================
    function renderSettings(container) {
        container.innerHTML = '';
        var state = Store.getState();
        var settings = state.settings;

        // Header
        var header = el('div', { className: 'view-header' }, [
            el('div', {}, [
                el('h1', { className: 'view-title' }, 'Settings'),
                el('p', { className: 'view-subtitle' }, 'Customize your project hub experience')
            ])
        ]);
        container.appendChild(header);

        // Settings Sections
        var sectionsGrid = el('div');
        sectionsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(2, 1fr);gap:20px;';

        // Theme Settings
        var themeCard = createSettingsSection('🎨 Appearance', [
            { type: 'toggle', key: 'darkMode', label: 'Dark Mode', description: 'Enable dark theme', value: settings.darkMode },
            { type: 'toggle', key: 'animations', label: 'Animations', description: 'Enable UI animations', value: settings.animations },
            { type: 'toggle', key: 'compactMode', label: 'Compact Mode', description: 'Reduce padding and spacing', value: settings.compactMode },
            { type: 'select', key: 'accentColor', label: 'Accent Color', options: [
                { value: '#00d4ff', label: 'Cyan' },
                { value: '#a855f7', label: 'Purple' },
                { value: '#22c55e', label: 'Green' },
                { value: '#f97316', label: 'Orange' },
                { value: '#ef4444', label: 'Red' }
            ], value: settings.accentColor || '#00d4ff' }
        ]);
        sectionsGrid.appendChild(themeCard);

        // Notification Settings
        var notifCard = createSettingsSection('🔔 Notifications', [
            { type: 'toggle', key: 'notifications', label: 'Enable Notifications', description: 'Show desktop notifications', value: settings.notifications },
            { type: 'toggle', key: 'emailDigest', label: 'Email Digest', description: 'Receive daily email summary', value: settings.emailDigest },
            { type: 'toggle', key: 'soundEnabled', label: 'Sound Effects', description: 'Play sounds for notifications', value: settings.soundEnabled },
            { type: 'select', key: 'notifyFrequency', label: 'Notification Frequency', options: [
                { value: 'instant', label: 'Instant' },
                { value: 'hourly', label: 'Hourly' },
                { value: 'daily', label: 'Daily' }
            ], value: settings.notifyFrequency || 'instant' }
        ]);
        sectionsGrid.appendChild(notifCard);

        // Kanban Settings
        var kanbanCard = createSettingsSection('📋 Kanban Board', [
            { type: 'toggle', key: 'kanbanDragEnabled', label: 'Drag & Drop', description: 'Enable card dragging', value: settings.kanbanDragEnabled !== false },
            { type: 'toggle', key: 'showProgress', label: 'Show Progress', description: 'Display progress bars on cards', value: settings.showProgress !== false },
            { type: 'toggle', key: 'showAssignee', label: 'Show Assignee', description: 'Display assignee on cards', value: settings.showAssignee !== false },
            { type: 'select', key: 'defaultView', label: 'Default Column', options: [
                { value: 'all', label: 'All Columns' },
                { value: 'mine', label: 'My Tasks' },
                { value: 'blocked', label: 'Blocked Only' }
            ], value: settings.defaultView || 'all' }
        ]);
        sectionsGrid.appendChild(kanbanCard);

        // Data Settings
        var dataCard = createSettingsSection('💾 Data & Privacy', [
            { type: 'toggle', key: 'autoSave', label: 'Auto Save', description: 'Automatically save changes', value: settings.autoSave !== false },
            { type: 'toggle', key: 'analytics', label: 'Usage Analytics', description: 'Help improve the product', value: settings.analytics },
            { type: 'button', label: 'Export Data', description: 'Download all project data', action: function() {
                var data = JSON.stringify(Store.getState(), null, 2);
                var blob = new Blob([data], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'project-hub-data.json';
                a.click();
                UI.toast('Data exported successfully!', 'success');
            }},
            { type: 'button', label: 'Reset to Defaults', description: 'Reset all settings', danger: true, action: function() {
                if (confirm('Are you sure you want to reset all settings?')) {
                    Store.resetSettings();
                    renderSettings(container);
                    UI.toast('Settings reset to defaults', 'success');
                }
            }}
        ]);
        sectionsGrid.appendChild(dataCard);

        container.appendChild(sectionsGrid);
    }

    function createSettingsSection(title, items) {
        var card = el('div', { className: 'glass-card' });
        card.style.cssText = 'padding:24px;';

        card.appendChild(el('h3', { style: { marginBottom: '20px', fontSize: '16px' } }, title));

        var list = el('div');
        list.style.cssText = 'display:flex;flex-direction:column;gap:16px;';

        items.forEach(function(item) {
            var row = el('div');
            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,0.02);border-radius:10px;transition:all 0.2s;';

            var labelCol = el('div');
            labelCol.innerHTML = '<div style="font-weight:500;margin-bottom:2px;">' + item.label + '</div>' +
                (item.description ? '<div style="font-size:12px;color:rgba(255,255,255,0.5);">' + item.description + '</div>' : '');

            row.appendChild(labelCol);

            if (item.type === 'toggle') {
                var toggle = el('label', { className: 'toggle-switch' });
                toggle.style.cssText = 'position:relative;width:44px;height:24px;cursor:pointer;';

                var input = el('input', { type: 'checkbox' });
                input.checked = item.value;
                input.style.cssText = 'opacity:0;width:0;height:0;position:absolute;';

                var slider = el('span');
                slider.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:' + (item.value ? '#00d4ff' : 'rgba(255,255,255,0.1)') + ';border-radius:24px;transition:all 0.3s;';

                var knob = el('span');
                knob.style.cssText = 'position:absolute;top:2px;left:' + (item.value ? '22px' : '2px') + ';width:20px;height:20px;background:#fff;border-radius:50%;transition:all 0.3s;box-shadow:0 2px 4px rgba(0,0,0,0.2);';

                slider.appendChild(knob);
                toggle.appendChild(input);
                toggle.appendChild(slider);

                input.addEventListener('change', function() {
                    var newValue = input.checked;
                    slider.style.background = newValue ? '#00d4ff' : 'rgba(255,255,255,0.1)';
                    knob.style.left = newValue ? '22px' : '2px';
                    Store.updateSettings(item.key, newValue);
                    UI.toast('Setting updated', 'success');
                });

                row.appendChild(toggle);
            } else if (item.type === 'select') {
                var select = el('select', { className: 'settings-select' });
                select.style.cssText = 'padding:8px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:13px;cursor:pointer;outline:none;';

                item.options.forEach(function(opt) {
                    var option = el('option', { value: opt.value }, opt.label);
                    if (opt.value === item.value) option.selected = true;
                    select.appendChild(option);
                });

                select.addEventListener('change', function() {
                    Store.updateSettings(item.key, select.value);
                    UI.toast('Setting updated', 'success');
                });

                row.appendChild(select);
            } else if (item.type === 'button') {
                var btn = el('button', { className: 'btn' + (item.danger ? ' btn-danger' : ''), onClick: item.action }, item.label);
                if (item.danger) {
                    btn.style.cssText += 'background:rgba(239,68,68,0.1);border-color:#ef4444;color:#ef4444;';
                }
                row.appendChild(btn);
            }

            list.appendChild(row);
        });

        card.appendChild(list);
        return card;
    }

    // Export views
    global.Views = {
        dashboard: renderDashboard,
        kanban: renderKanban,
        timeline: renderTimeline,
        team: renderTeam,
        budget: renderBudget,
        analytics: renderAnalytics,
        activity: renderActivity,
        settings: renderSettings
    };

})(window);
