/**
 * Project Hub - Views Module
 * All 8 views with full interactivity and animations
 */

(function(global) {
    'use strict';

    // Helper to create elements easily
    function h(tag, attrs, children) {
        var element = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach(function(key) {
                if (key === 'className') {
                    element.className = attrs[key];
                } else if (key === 'style' && typeof attrs[key] === 'object') {
                    Object.keys(attrs[key]).forEach(function(k) {
                        element.style[k] = attrs[key][k];
                    });
                } else if (key.startsWith('on') && typeof attrs[key] === 'function') {
                    element.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
                } else {
                    element.setAttribute(key, attrs[key]);
                }
            });
        }
        if (children !== undefined && children !== null) {
            if (Array.isArray(children)) {
                children.forEach(function(child) {
                    if (child !== undefined && child !== null) {
                        if (typeof child === 'string' || typeof child === 'number') {
                            element.appendChild(document.createTextNode(String(child)));
                        } else {
                            element.appendChild(child);
                        }
                    }
                });
            } else if (typeof children === 'string' || typeof children === 'number') {
                element.textContent = String(children);
            } else {
                element.appendChild(children);
            }
        }
        return element;
    }

    // Status colors
    var statusColors = {
        'backlog': '#6b7280',
        'todo': '#00d4ff',
        'in-progress': '#a855f7',
        'review': '#facc15',
        'done': '#22c55e',
        'blocked': '#ef4444'
    };

    var priorityColors = {
        'critical': '#ef4444',
        'high': '#f97316',
        'medium': '#facc15',
        'low': '#22c55e'
    };

    // ========================================================================
    // DASHBOARD VIEW
    // ========================================================================
    function renderDashboard(container) {
        container.innerHTML = '';
        
        try {
            var metrics = Store.getMetrics();
            var state = Store.getState();

            // Header
            var header = h('div', { className: 'view-header' });
            header.innerHTML = '<div><h1 class="view-title">🚀 Dashboard</h1><p class="view-subtitle">Project overview and real-time metrics</p></div>';
            
            var newTaskBtn = h('button', { className: 'btn btn-primary', onClick: function() { UI.openTaskModal(null); } });
            newTaskBtn.innerHTML = '+ New Task';
            var headerActions = h('div', { className: 'header-actions' });
            headerActions.appendChild(newTaskBtn);
            header.appendChild(headerActions);
            container.appendChild(header);

            // Stats Grid
            var statsGrid = h('div', { className: 'stats-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' } });

            // Stat cards
            var stats = [
                { title: 'Total Tasks', value: metrics.totalTasks, color: '#00d4ff', icon: '📋', subtitle: metrics.completed + ' completed' },
                { title: 'Completion', value: metrics.completionRate + '%', color: '#22c55e', icon: '🎯', trend: '+5.2%' },
                { title: 'Budget Used', value: '$' + (state.financials.used / 1000).toFixed(0) + 'k', color: '#a855f7', icon: '💰', subtitle: Math.round(state.financials.used / state.financials.budget * 100) + '% of total' },
                { title: 'Velocity', value: metrics.avgVelocity + ' pts', color: '#facc15', icon: '⚡', trend: '+8.5%' }
            ];

            stats.forEach(function(stat, i) {
                var card = h('div', { className: 'glass-card stat-card', style: { padding: '24px', opacity: '0', transform: 'translateY(20px)', transition: 'all 0.5s ease ' + (i * 0.1) + 's' } });
                card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">' +
                    '<span style="font-size:12px;color:rgba(255,255,255,0.6);text-transform:uppercase;">' + stat.title + '</span>' +
                    '<span style="font-size:24px;">' + stat.icon + '</span></div>' +
                    '<div style="font-size:36px;font-weight:700;color:' + stat.color + ';margin-bottom:8px;">' + stat.value + '</div>' +
                    '<div style="font-size:12px;color:rgba(255,255,255,0.5);">' + (stat.subtitle || '') + 
                    (stat.trend ? '<span style="color:#22c55e;margin-left:8px;">' + stat.trend + '</span>' : '') + '</div>';
                statsGrid.appendChild(card);
                
                setTimeout(function() {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 50);
            });

            container.appendChild(statsGrid);

            // Charts Row
            var chartsRow = h('div', { style: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '30px' } });

            // Velocity Chart
            var velocityCard = h('div', { className: 'glass-card', style: { padding: '24px' } });
            velocityCard.innerHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:16px;color:rgba(255,255,255,0.8);">📈 TEAM VELOCITY (30 DAYS)</div>';
            var velocityChart = h('div', { style: { height: '280px', width: '100%' } });
            velocityCard.appendChild(velocityChart);
            chartsRow.appendChild(velocityCard);

            // Task Distribution
            var distCard = h('div', { className: 'glass-card', style: { padding: '24px' } });
            distCard.innerHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:16px;color:rgba(255,255,255,0.8);">📊 TASKS BY STATUS</div>';
            var distChart = h('div', { style: { height: '280px', width: '100%' } });
            distCard.appendChild(distChart);
            chartsRow.appendChild(distCard);

            container.appendChild(chartsRow);

            // Render charts after DOM is ready
            setTimeout(function() {
                var velocityData = state.history.slice(-30).map(function(h, i) {
                    return { y: h.velocity, label: h.date.split('-').slice(1).join('/') };
                });
                Charts.line(velocityChart, velocityData, { color: '#00d4ff', showArea: true, showDots: true, animate: true });

                var statusData = [
                    { label: 'Backlog', value: metrics.tasksByStatus.backlog || 0, color: '#6b7280' },
                    { label: 'To Do', value: metrics.tasksByStatus.todo || 0, color: '#00d4ff' },
                    { label: 'In Progress', value: metrics.tasksByStatus['in-progress'] || 0, color: '#a855f7' },
                    { label: 'Review', value: metrics.tasksByStatus.review || 0, color: '#facc15' },
                    { label: 'Done', value: metrics.tasksByStatus.done || 0, color: '#22c55e' }
                ].filter(function(s) { return s.value > 0; });
                Charts.donut(distChart, statusData, { size: 160, thickness: 30, showLegend: true, animate: true });
            }, 100);

            // Bottom Section: Recent Tasks + Activity
            var bottomRow = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' } });

            // Recent Tasks
            var recentCard = h('div', { className: 'glass-card', style: { padding: '24px' } });
            recentCard.innerHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:16px;color:rgba(255,255,255,0.8);">📝 RECENT TASKS</div>';
            
            var recentList = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } });
            var recentTasks = state.tasks.filter(function(t) { return t.status !== 'done'; }).slice(0, 5);
            
            recentTasks.forEach(function(task, i) {
                var taskEl = h('div', { 
                    className: 'task-item',
                    style: { 
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
                        background: 'rgba(255,255,255,0.03)', borderRadius: '10px', cursor: 'pointer',
                        opacity: '0', transform: 'translateX(-20px)', transition: 'all 0.3s ease ' + (i * 0.05) + 's'
                    },
                    onClick: function() { UI.openTaskModal(task); }
                });
                var collab = Store.getCollaborator(task.assignee);
                taskEl.innerHTML = '<div style="width:8px;height:8px;border-radius:50%;background:' + priorityColors[task.priority] + '"></div>' +
                    '<div style="flex:1;"><div style="font-weight:500;">' + task.title + '</div>' +
                    '<div style="font-size:11px;color:rgba(255,255,255,0.5);">' + task.category + ' • ' + task.progress + '%</div></div>' +
                    '<span style="font-size:20px;">' + (collab ? collab.avatar : '👤') + '</span>';
                recentList.appendChild(taskEl);
                
                setTimeout(function() {
                    taskEl.style.opacity = '1';
                    taskEl.style.transform = 'translateX(0)';
                }, 100);
            });
            recentCard.appendChild(recentList);
            bottomRow.appendChild(recentCard);

            // Activity Feed
            var activityCard = h('div', { className: 'glass-card', style: { padding: '24px' } });
            activityCard.innerHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:16px;color:rgba(255,255,255,0.8);">🔔 RECENT ACTIVITY</div>';
            
            var activityList = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } });
            state.activities.slice(0, 5).forEach(function(activity, i) {
                var actEl = h('div', { style: { 
                    display: 'flex', gap: '12px', padding: '10px', 
                    opacity: '0', transform: 'translateY(10px)', transition: 'all 0.3s ease ' + (i * 0.05) + 's'
                }});
                var typeIcons = { completed: '✅', created: '➕', moved: '➡️', comment: '💬', assigned: '👤' };
                actEl.innerHTML = '<span style="font-size:16px;">' + (typeIcons[activity.type] || '📌') + '</span>' +
                    '<div style="flex:1;"><div style="font-size:13px;">' + activity.user + ' ' + activity.action + '</div>' +
                    '<div style="font-size:11px;color:rgba(255,255,255,0.4);">' + UI.formatDateTime(activity.timestamp) + '</div></div>';
                activityList.appendChild(actEl);
                
                setTimeout(function() {
                    actEl.style.opacity = '1';
                    actEl.style.transform = 'translateY(0)';
                }, 150);
            });
            activityCard.appendChild(activityList);
            bottomRow.appendChild(activityCard);

            container.appendChild(bottomRow);

        } catch (e) {
            console.error('Dashboard render error:', e);
            container.innerHTML = '<div class="error-state">Error loading dashboard: ' + e.message + '</div>';
        }
    }

    // ========================================================================
    // KANBAN VIEW
    // ========================================================================
    function renderKanban(container) {
        container.innerHTML = '';
        
        try {
            var state = Store.getState();
            var filters = state.filters;

            // Header
            var header = h('div', { className: 'view-header' });
            header.innerHTML = '<div><h1 class="view-title">📋 Kanban Board</h1><p class="view-subtitle">Drag and drop to organize your workflow</p></div>';
            
            var newTaskBtn = h('button', { className: 'btn btn-primary', onClick: function() { UI.openTaskModal(null); } });
            newTaskBtn.innerHTML = '+ New Task';
            var headerActions = h('div', { className: 'header-actions' });
            headerActions.appendChild(newTaskBtn);
            header.appendChild(headerActions);
            container.appendChild(header);

            // Filters
            var filterBar = h('div', { style: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' } });
            
            // Priority filter
            var priorityFilter = h('select', { className: 'filter-select', style: { padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' } });
            priorityFilter.innerHTML = '<option value="all">All Priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>';
            priorityFilter.value = filters.priority || 'all';
            priorityFilter.addEventListener('change', function() { Store.setFilter('priority', this.value); });
            filterBar.appendChild(priorityFilter);

            // Assignee filter
            var assigneeFilter = h('select', { style: { padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' } });
            assigneeFilter.innerHTML = '<option value="all">All Members</option>';
            state.collaborators.forEach(function(c) {
                assigneeFilter.innerHTML += '<option value="' + c.id + '">' + c.avatar + ' ' + c.name + '</option>';
            });
            assigneeFilter.value = filters.assignee || 'all';
            assigneeFilter.addEventListener('change', function() { Store.setFilter('assignee', this.value); });
            filterBar.appendChild(assigneeFilter);

            container.appendChild(filterBar);

            // Kanban Board
            var board = h('div', { className: 'kanban-board', style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', overflowX: 'auto' } });

            var columns = [
                { id: 'backlog', label: 'Backlog', color: '#6b7280', icon: '📥' },
                { id: 'todo', label: 'To Do', color: '#00d4ff', icon: '📝' },
                { id: 'in-progress', label: 'In Progress', color: '#a855f7', icon: '🔄' },
                { id: 'review', label: 'Review', color: '#facc15', icon: '👀' },
                { id: 'done', label: 'Done', color: '#22c55e', icon: '✅' }
            ];

            var tasks = Store.getFilteredTasks();

            columns.forEach(function(col) {
                var colTasks = tasks.filter(function(t) { return t.status === col.id; });
                
                var column = h('div', { 
                    className: 'kanban-column',
                    'data-status': col.id,
                    style: { minWidth: '260px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '16px' }
                });

                // Column Header
                var colHeader = h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid ' + col.color } });
                colHeader.innerHTML = '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<span>' + col.icon + '</span><span style="font-weight:600;">' + col.label + '</span>' +
                    '<span style="background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:10px;font-size:11px;">' + colTasks.length + '</span></div>';
                
                var addBtn = h('button', { 
                    style: { background: 'transparent', border: 'none', color: col.color, cursor: 'pointer', fontSize: '18px' },
                    onClick: function() { UI.openTaskModal({ status: col.id }); }
                });
                addBtn.innerHTML = '+';
                colHeader.appendChild(addBtn);
                column.appendChild(colHeader);

                // Cards Container (drop zone)
                var cardsContainer = h('div', { 
                    className: 'kanban-cards',
                    'data-status': col.id,
                    style: { display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '200px', padding: '4px', transition: 'background 0.2s' }
                });

                // Render task cards
                colTasks.forEach(function(task, i) {
                    var card = createKanbanCard(task, i);
                    cardsContainer.appendChild(card);
                });

                // Drop zone events
                cardsContainer.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    cardsContainer.style.background = 'rgba(' + hexToRgb(col.color) + ',0.1)';
                });
                cardsContainer.addEventListener('dragleave', function() {
                    cardsContainer.style.background = 'transparent';
                });
                cardsContainer.addEventListener('drop', function(e) {
                    e.preventDefault();
                    cardsContainer.style.background = 'transparent';
                    var taskId = e.dataTransfer.getData('text/plain');
                    if (taskId) {
                        Store.moveTask(taskId, col.id);
                        UI.toast('Task moved to ' + col.label, 'success');
                    }
                });

                column.appendChild(cardsContainer);
                board.appendChild(column);
            });

            container.appendChild(board);

        } catch (e) {
            console.error('Kanban render error:', e);
            container.innerHTML = '<div class="error-state">Error loading Kanban: ' + e.message + '</div>';
        }
    }

    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? parseInt(result[1], 16) + ',' + parseInt(result[2], 16) + ',' + parseInt(result[3], 16) : '0,0,0';
    }

    function createKanbanCard(task, index) {
        var collab = Store.getCollaborator(task.assignee);
        var isBlocked = task.status === 'blocked';
        
        var card = h('div', { 
            className: 'kanban-card' + (isBlocked ? ' blocked' : ''),
            draggable: 'true',
            'data-task-id': task.id,
            style: { 
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', 
                borderRadius: '12px', padding: '16px', cursor: 'grab',
                opacity: '0', transform: 'translateY(20px)', transition: 'all 0.3s ease ' + (index * 0.05) + 's'
            }
        });

        if (isBlocked) {
            card.style.borderColor = '#ef4444';
            card.style.boxShadow = '0 0 15px rgba(239,68,68,0.2)';
        }

        card.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
            '<span style="width:8px;height:8px;border-radius:50%;background:' + priorityColors[task.priority] + '"></span>' +
            '<span style="font-size:10px;padding:3px 8px;background:rgba(255,255,255,0.05);border-radius:6px;text-transform:uppercase;">' + task.category + '</span></div>' +
            '<div style="font-weight:500;margin-bottom:8px;line-height:1.4;">' + task.title + '</div>' +
            '<div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin-bottom:12px;overflow:hidden;">' +
            '<div style="height:100%;width:' + task.progress + '%;background:' + statusColors[task.status] + ';transition:width 0.5s;"></div></div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span style="font-size:18px;">' + (collab ? collab.avatar : '👤') + '</span>' +
            '<div style="font-size:11px;color:rgba(255,255,255,0.5);">🕐 ' + (task.spent || 0) + '/' + (task.estimate || 0) + 'h</div></div>';

        // Drag events
        card.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', task.id);
            card.style.opacity = '0.5';
            card.style.transform = 'rotate(3deg)';
        });
        card.addEventListener('dragend', function() {
            card.style.opacity = '1';
            card.style.transform = 'rotate(0)';
        });

        // Click to edit
        card.addEventListener('click', function(e) {
            if (!e.target.closest('button')) {
                UI.openTaskModal(task);
            }
        });

        // Animate in
        setTimeout(function() {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 50);

        return card;
    }

    // ========================================================================
    // TIMELINE VIEW - Enhanced with arrows, drag & drop, animations
    // ========================================================================
    function renderTimeline(container) {
        container.innerHTML = '';
        
        try {
            var state = Store.getState();

            // Header
            var header = h('div', { className: 'view-header' });
            header.innerHTML = '<div><h1 class="view-title">📅 Timeline</h1><p class="view-subtitle">Interactive Gantt chart with dependencies</p></div>';
            
            var headerActions = h('div', { className: 'header-actions', style: { display: 'flex', gap: '12px' } });
            var zoomInBtn = h('button', { className: 'btn', onClick: function() { zoomTimeline(1.2); } });
            zoomInBtn.innerHTML = '🔍+ Zoom In';
            var zoomOutBtn = h('button', { className: 'btn', onClick: function() { zoomTimeline(0.8); } });
            zoomOutBtn.innerHTML = '🔍- Zoom Out';
            var todayBtn = h('button', { className: 'btn btn-primary', onClick: function() { scrollToToday(); } });
            todayBtn.innerHTML = '📍 Today';
            headerActions.appendChild(zoomInBtn);
            headerActions.appendChild(zoomOutBtn);
            headerActions.appendChild(todayBtn);
            header.appendChild(headerActions);
            container.appendChild(header);

            // Timeline settings
            var dayWidth = 40;
            var rowHeight = 60;
            var today = new Date();
            var startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 14);
            var endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 60);
            var totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

            // Filter tasks with dates
            var tasksWithDates = state.tasks.filter(function(t) { return t.startDate && t.endDate; });

            // Main container
            var timelineWrapper = h('div', { className: 'glass-card', style: { padding: '0', overflow: 'hidden', position: 'relative' } });
            
            // SVG for dependency arrows
            var svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgContainer.setAttribute('class', 'dependency-arrows');
            svgContainer.style.cssText = 'position:absolute;top:0;left:250px;width:' + (totalDays * dayWidth) + 'px;height:' + (tasksWithDates.length * rowHeight + 80) + 'px;pointer-events:none;z-index:10;';
            
            // Arrow marker definition
            var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            defs.innerHTML = '<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#00d4ff"/></marker>';
            svgContainer.appendChild(defs);
            
            // Scrollable area
            var scrollArea = h('div', { 
                id: 'timeline-scroll',
                style: { overflowX: 'auto', overflowY: 'auto', maxHeight: '600px' } 
            });

            // Header with dates
            var headerRow = h('div', { style: { display: 'flex', position: 'sticky', top: '0', background: 'rgba(10,15,26,0.98)', zIndex: '20', borderBottom: '1px solid rgba(255,255,255,0.1)' } });
            
            var labelCol = h('div', { style: { width: '250px', flexShrink: '0', padding: '16px', fontWeight: '600', background: 'rgba(10,15,26,0.98)' } });
            labelCol.innerHTML = '📌 Tasks';
            headerRow.appendChild(labelCol);

            var datesRow = h('div', { style: { display: 'flex', padding: '8px 0' } });
            for (var d = 0; d < totalDays; d++) {
                var date = new Date(startDate);
                date.setDate(date.getDate() + d);
                var isToday = date.toDateString() === today.toDateString();
                var isWeekend = date.getDay() === 0 || date.getDay() === 6;
                
                var dayEl = h('div', { style: { 
                    width: dayWidth + 'px', textAlign: 'center', fontSize: '10px', 
                    color: isToday ? '#00d4ff' : isWeekend ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)',
                    fontWeight: isToday ? '700' : '400'
                }});
                
                if (d === 0 || date.getDate() === 1) {
                    dayEl.innerHTML = '<div style="font-weight:600;">' + date.toLocaleDateString('en-US', { month: 'short' }) + '</div>' + date.getDate();
                } else if (date.getDate() % 5 === 0) {
                    dayEl.textContent = date.getDate();
                }
                datesRow.appendChild(dayEl);
            }
            headerRow.appendChild(datesRow);
            scrollArea.appendChild(headerRow);

            // Task rows
            var tasksContainer = h('div', { style: { position: 'relative' } });
            
            tasksWithDates.forEach(function(task, i) {
                var row = createTimelineRow(task, i, startDate, dayWidth, rowHeight, totalDays, today, tasksWithDates);
                tasksContainer.appendChild(row);
            });

            scrollArea.appendChild(tasksContainer);
            timelineWrapper.appendChild(svgContainer);
            timelineWrapper.appendChild(scrollArea);
            container.appendChild(timelineWrapper);

            // Draw dependency arrows after render
            setTimeout(function() {
                drawDependencyArrows(svgContainer, tasksWithDates, startDate, dayWidth, rowHeight);
            }, 300);

            // Legend
            var legend = h('div', { className: 'glass-card', style: { padding: '16px', marginTop: '20px', display: 'flex', gap: '24px', flexWrap: 'wrap' } });
            legend.innerHTML = '<div style="font-weight:600;margin-right:16px;">Legend:</div>';
            Object.keys(statusColors).forEach(function(status) {
                legend.innerHTML += '<div style="display:flex;align-items:center;gap:8px;"><span style="width:16px;height:16px;border-radius:4px;background:' + statusColors[status] + '"></span><span style="font-size:13px;text-transform:capitalize;">' + status.replace('-', ' ') + '</span></div>';
            });
            legend.innerHTML += '<div style="display:flex;align-items:center;gap:8px;margin-left:auto;"><span style="color:#00d4ff;">→</span><span style="font-size:13px;">Dependency</span></div>';
            container.appendChild(legend);

            // Store zoom functions
            window.zoomTimeline = function(factor) {
                dayWidth = Math.max(20, Math.min(80, dayWidth * factor));
                renderTimeline(container);
            };
            
            window.scrollToToday = function() {
                var scroll = document.getElementById('timeline-scroll');
                var todayOffset = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)) * dayWidth;
                if (scroll) scroll.scrollLeft = todayOffset - 300;
            };

        } catch (e) {
            console.error('Timeline render error:', e);
            container.innerHTML = '<div class="error-state">Error loading Timeline: ' + e.message + '</div>';
        }
    }

    function createTimelineRow(task, index, startDate, dayWidth, rowHeight, totalDays, today, allTasks) {
        var collab = Store.getCollaborator(task.assignee);
        var taskStart = new Date(task.startDate);
        var taskEnd = new Date(task.endDate);
        var startOffset = Math.max(0, Math.ceil((taskStart - startDate) / (1000 * 60 * 60 * 24)));
        var duration = Math.ceil((taskEnd - taskStart) / (1000 * 60 * 60 * 24)) + 1;
        var todayOffset = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));

        var row = h('div', { 
            className: 'timeline-row',
            'data-task-id': task.id,
            style: { 
                display: 'flex', minHeight: rowHeight + 'px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                opacity: '0', transform: 'translateX(-30px)', transition: 'all 0.4s ease ' + (index * 0.05) + 's'
            }
        });

        // Task label
        var label = h('div', { style: { 
            width: '250px', flexShrink: '0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
            background: 'rgba(10,15,26,0.5)', position: 'sticky', left: '0', zIndex: '5'
        }});
        label.innerHTML = '<span style="font-size:20px;">' + (collab ? collab.avatar : '👤') + '</span>' +
            '<div style="flex:1;min-width:0;"><div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + task.title + '</div>' +
            '<div style="font-size:11px;color:rgba(255,255,255,0.5);">' + (collab ? collab.name : 'Unassigned') + '</div></div>';
        row.appendChild(label);

        // Timeline area
        var timeline = h('div', { style: { 
            position: 'relative', width: (totalDays * dayWidth) + 'px', height: '100%', display: 'flex', alignItems: 'center'
        }});

        // Today line
        if (todayOffset >= 0 && todayOffset < totalDays) {
            var todayLine = h('div', { style: {
                position: 'absolute', left: (todayOffset * dayWidth) + 'px', top: '0', bottom: '0',
                width: '2px', background: 'linear-gradient(to bottom, #00d4ff, transparent)',
                zIndex: '3'
            }});
            timeline.appendChild(todayLine);
        }

        // Task bar (draggable)
        var bar = h('div', { 
            className: 'gantt-bar',
            draggable: 'true',
            'data-task-id': task.id,
            style: {
                position: 'absolute', left: (startOffset * dayWidth + 2) + 'px', 
                width: (duration * dayWidth - 4) + 'px', height: '32px',
                background: 'linear-gradient(135deg, ' + statusColors[task.status] + ', ' + statusColors[task.status] + 'aa)',
                borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 15px ' + statusColors[task.status] + '40',
                transition: 'transform 0.2s, box-shadow 0.2s', overflow: 'hidden', zIndex: '4'
            }
        });

        // Progress inside bar
        bar.innerHTML = '<div style="position:absolute;left:0;top:0;height:100%;width:' + task.progress + '%;background:rgba(255,255,255,0.2);transition:width 0.5s;"></div>' +
            '<span style="position:relative;font-size:11px;font-weight:600;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5);">' + task.progress + '%</span>';

        // Dependency indicators
        if (task.dependencies && task.dependencies.length > 0) {
            var depIndicator = h('div', { style: {
                position: 'absolute', left: '-8px', top: '50%', transform: 'translateY(-50%)',
                width: '16px', height: '16px', background: '#00d4ff', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', zIndex: '5'
            }});
            depIndicator.innerHTML = '🔗';
            bar.appendChild(depIndicator);
        }

        // Hover effects
        bar.addEventListener('mouseenter', function() {
            bar.style.transform = 'scaleY(1.2)';
            bar.style.boxShadow = '0 6px 25px ' + statusColors[task.status] + '60';
            bar.style.zIndex = '10';
        });
        bar.addEventListener('mouseleave', function() {
            bar.style.transform = 'scaleY(1)';
            bar.style.boxShadow = '0 4px 15px ' + statusColors[task.status] + '40';
            bar.style.zIndex = '4';
        });

        // Click to edit
        bar.addEventListener('click', function() {
            UI.openTaskModal(task);
        });

        // Drag to reschedule
        bar.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', JSON.stringify({ id: task.id, type: 'timeline' }));
            bar.style.opacity = '0.6';
        });
        bar.addEventListener('dragend', function() {
            bar.style.opacity = '1';
        });

        timeline.appendChild(bar);
        row.appendChild(timeline);

        // Animate in
        setTimeout(function() {
            row.style.opacity = '1';
            row.style.transform = 'translateX(0)';
        }, 50);

        return row;
    }

    function drawDependencyArrows(svg, tasks, startDate, dayWidth, rowHeight) {
        // Clear existing paths
        var existingPaths = svg.querySelectorAll('path.dep-arrow');
        existingPaths.forEach(function(p) { p.remove(); });

        tasks.forEach(function(task, targetIndex) {
            if (!task.dependencies || task.dependencies.length === 0) return;

            var taskStart = new Date(task.startDate);
            var targetX = Math.ceil((taskStart - startDate) / (1000 * 60 * 60 * 24)) * dayWidth;
            var targetY = targetIndex * rowHeight + rowHeight / 2 + 50; // +50 for header

            task.dependencies.forEach(function(depId) {
                var sourceTask = tasks.find(function(t) { return t.id === depId; });
                if (!sourceTask) return;

                var sourceIndex = tasks.indexOf(sourceTask);
                var sourceEnd = new Date(sourceTask.endDate);
                var sourceX = Math.ceil((sourceEnd - startDate) / (1000 * 60 * 60 * 24)) * dayWidth + dayWidth;
                var sourceY = sourceIndex * rowHeight + rowHeight / 2 + 50;

                // Create curved path
                var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                var midX = (sourceX + targetX) / 2;
                var controlOffset = Math.abs(targetIndex - sourceIndex) * 20;
                
                var d = 'M ' + sourceX + ' ' + sourceY + 
                        ' C ' + (sourceX + controlOffset) + ' ' + sourceY + 
                        ', ' + (targetX - controlOffset) + ' ' + targetY + 
                        ', ' + targetX + ' ' + targetY;
                
                path.setAttribute('d', d);
                path.setAttribute('class', 'dep-arrow');
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke', '#00d4ff');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('stroke-dasharray', '5,5');
                path.setAttribute('marker-end', 'url(#arrowhead)');
                path.style.opacity = '0';
                path.style.transition = 'opacity 0.5s ease ' + (targetIndex * 0.1) + 's';
                
                svg.appendChild(path);

                // Animate in
                setTimeout(function() {
                    path.style.opacity = '0.7';
                }, 100);
            });
        });
    }

    // ========================================================================
    // TEAM VIEW
    // ========================================================================
    function renderTeam(container) {
        container.innerHTML = '';
        
        try {
            var state = Store.getState();
            var metrics = Store.getMetrics();

            // Header
            var header = h('div', { className: 'view-header' });
            header.innerHTML = '<div><h1 class="view-title">👥 Team</h1><p class="view-subtitle">Workload matrix and performance insights</p></div>';
            container.appendChild(header);

            // Stats Row
            var statsRow = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' } });
            
            var teamStats = [
                { title: 'Team Size', value: state.collaborators.length, icon: '👥', color: '#00d4ff' },
                { title: 'Active Tasks', value: metrics.inProgress + metrics.review, icon: '🔄', color: '#a855f7' },
                { title: 'Avg Workload', value: Math.round(state.collaborators.reduce(function(sum, c) { return sum + c.workload; }, 0) / state.collaborators.length) + '%', icon: '📊', color: '#facc15' },
                { title: 'Overloaded', value: metrics.overloadedMembers, icon: '⚠️', color: '#ef4444' }
            ];

            teamStats.forEach(function(stat, i) {
                var card = h('div', { className: 'glass-card', style: { 
                    padding: '20px', opacity: '0', transform: 'translateY(20px)', 
                    transition: 'all 0.5s ease ' + (i * 0.1) + 's' 
                }});
                card.innerHTML = '<div style="display:flex;justify-content:space-between;margin-bottom:12px;">' +
                    '<span style="font-size:12px;color:rgba(255,255,255,0.6);text-transform:uppercase;">' + stat.title + '</span>' +
                    '<span style="font-size:20px;">' + stat.icon + '</span></div>' +
                    '<div style="font-size:32px;font-weight:700;color:' + stat.color + ';">' + stat.value + '</div>';
                statsRow.appendChild(card);
                setTimeout(function() {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 50);
            });
            container.appendChild(statsRow);

            // Team Grid
            var teamGrid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' } });

            state.collaborators.forEach(function(member, i) {
                var memberTasks = state.tasks.filter(function(t) { return t.assignee === member.id; });
                var inProgress = memberTasks.filter(function(t) { return t.status === 'in-progress'; }).length;
                var completed = memberTasks.filter(function(t) { return t.status === 'done'; }).length;
                var isOverloaded = member.workload > 100;

                var card = h('div', { className: 'glass-card team-card', style: { 
                    padding: '24px', cursor: 'pointer',
                    opacity: '0', transform: 'translateY(30px)', transition: 'all 0.5s ease ' + (i * 0.08) + 's',
                    border: isOverloaded ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.05)'
                }});

                // Avatar and info
                card.innerHTML = '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">' +
                    '<div style="font-size:48px;width:70px;height:70px;background:rgba(255,255,255,0.05);border-radius:50%;display:flex;align-items:center;justify-content:center;">' + member.avatar + '</div>' +
                    '<div style="flex:1;"><div style="font-size:18px;font-weight:600;margin-bottom:4px;">' + member.name + '</div>' +
                    '<div style="font-size:13px;color:rgba(255,255,255,0.5);">' + member.role + '</div>' +
                    '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">' + 
                    member.skills.slice(0, 3).map(function(s) { return '<span style="font-size:10px;padding:3px 8px;background:rgba(0,212,255,0.1);border-radius:10px;color:#00d4ff;">' + s + '</span>'; }).join('') +
                    '</div></div></div>';

                // Workload bar
                var workloadColor = member.workload > 100 ? '#ef4444' : member.workload > 80 ? '#facc15' : '#22c55e';
                card.innerHTML += '<div style="margin-bottom:16px;">' +
                    '<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;">' +
                    '<span>Workload</span><span style="color:' + workloadColor + ';">' + member.workload + '%</span></div>' +
                    '<div style="height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;">' +
                    '<div style="height:100%;width:' + Math.min(member.workload, 100) + '%;background:' + workloadColor + ';transition:width 1s ease;border-radius:4px;"></div></div></div>';

                // Stats grid
                card.innerHTML += '<div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;text-align:center;">' +
                    '<div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;"><div style="font-size:20px;font-weight:600;color:#a855f7;">' + inProgress + '</div><div style="font-size:11px;color:rgba(255,255,255,0.5);">Active</div></div>' +
                    '<div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;"><div style="font-size:20px;font-weight:600;color:#22c55e;">' + completed + '</div><div style="font-size:11px;color:rgba(255,255,255,0.5);">Done</div></div>' +
                    '<div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;"><div style="font-size:20px;font-weight:600;color:#00d4ff;">' + memberTasks.length + '</div><div style="font-size:11px;color:rgba(255,255,255,0.5);">Total</div></div></div>';

                // Hover effect
                card.addEventListener('mouseenter', function() {
                    card.style.transform = 'translateY(-5px)';
                    card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
                });
                card.addEventListener('mouseleave', function() {
                    card.style.transform = 'translateY(0)';
                    card.style.boxShadow = '';
                });

                teamGrid.appendChild(card);

                setTimeout(function() {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 50);
            });

            container.appendChild(teamGrid);

        } catch (e) {
            console.error('Team render error:', e);
            container.innerHTML = '<div class="error-state">Error loading Team: ' + e.message + '</div>';
        }
    }

    // ========================================================================
    // BUDGET VIEW
    // ========================================================================
    function renderBudget(container) {
        container.innerHTML = '';
        
        try {
            var state = Store.getState();
            var fin = state.financials;

            // Header
            var header = h('div', { className: 'view-header' });
            header.innerHTML = '<div><h1 class="view-title">💰 Budget</h1><p class="view-subtitle">Financial analytics and burn rate tracking</p></div>';
            container.appendChild(header);

            // Stats
            var remaining = fin.budget - fin.used;
            var percentUsed = Math.round(fin.used / fin.budget * 100);

            var statsRow = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' } });
            var budgetStats = [
                { title: 'Total Budget', value: '$' + (fin.budget / 1000).toFixed(0) + 'k', icon: '💵', color: '#00d4ff' },
                { title: 'Spent', value: '$' + (fin.used / 1000).toFixed(0) + 'k', icon: '📉', color: percentUsed > 80 ? '#ef4444' : '#facc15', sub: percentUsed + '% used' },
                { title: 'Remaining', value: '$' + (remaining / 1000).toFixed(0) + 'k', icon: '💎', color: '#22c55e' },
                { title: 'Burn Rate', value: '$' + (fin.burnRate / 1000).toFixed(0) + 'k/mo', icon: '🔥', color: '#a855f7' }
            ];

            budgetStats.forEach(function(stat, i) {
                var card = h('div', { className: 'glass-card', style: { 
                    padding: '20px', opacity: '0', transform: 'scale(0.9)', 
                    transition: 'all 0.4s ease ' + (i * 0.1) + 's' 
                }});
                card.innerHTML = '<div style="display:flex;justify-content:space-between;margin-bottom:12px;">' +
                    '<span style="font-size:12px;color:rgba(255,255,255,0.6);text-transform:uppercase;">' + stat.title + '</span>' +
                    '<span style="font-size:20px;">' + stat.icon + '</span></div>' +
                    '<div style="font-size:28px;font-weight:700;color:' + stat.color + ';">' + stat.value + '</div>' +
                    (stat.sub ? '<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">' + stat.sub + '</div>' : '');
                statsRow.appendChild(card);
                setTimeout(function() { card.style.opacity = '1'; card.style.transform = 'scale(1)'; }, 50);
            });
            container.appendChild(statsRow);

            // Charts Row
            var chartsRow = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' } });

            // Breakdown Donut
            var breakdownCard = h('div', { className: 'glass-card', style: { padding: '24px' } });
            breakdownCard.innerHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:16px;color:rgba(255,255,255,0.8);">📊 BUDGET BREAKDOWN</div>';
            var breakdownChart = h('div', { style: { height: '280px' } });
            breakdownCard.appendChild(breakdownChart);
            chartsRow.appendChild(breakdownCard);

            // Monthly Burn
            var burnCard = h('div', { className: 'glass-card', style: { padding: '24px' } });
            burnCard.innerHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:16px;color:rgba(255,255,255,0.8);">📈 MONTHLY BURN RATE</div>';
            var burnChart = h('div', { style: { height: '280px' } });
            burnCard.appendChild(burnChart);
            chartsRow.appendChild(burnCard);

            container.appendChild(chartsRow);

            // Render charts
            setTimeout(function() {
                Charts.donut(breakdownChart, fin.breakdown.map(function(b) {
                    return { label: b.category, value: b.amount, color: b.color };
                }), { size: 160, thickness: 35, showLegend: true, animate: true });

                var monthlyData = fin.monthly.map(function(m, i) {
                    return { y: m.actual || m.planned, label: m.month };
                });
                Charts.bar(burnChart, monthlyData, { color: '#a855f7', animate: true });
            }, 200);

            // Expense Details
            var expenseCard = h('div', { className: 'glass-card', style: { padding: '24px' } });
            expenseCard.innerHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:16px;color:rgba(255,255,255,0.8);">📋 EXPENSE DETAILS</div>';
            
            var expenseList = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
            fin.breakdown.forEach(function(item, i) {
                var pct = Math.round(item.amount / fin.budget * 100);
                var row = h('div', { style: { 
                    display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', 
                    background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                    opacity: '0', transform: 'translateX(-20px)', transition: 'all 0.3s ease ' + (i * 0.1) + 's'
                }});
                row.innerHTML = '<div style="width:12px;height:12px;border-radius:50%;background:' + item.color + ';"></div>' +
                    '<div style="flex:1;font-weight:500;">' + item.category + '</div>' +
                    '<div style="font-family:monospace;font-size:15px;color:' + item.color + ';">$' + item.amount.toLocaleString() + '</div>' +
                    '<div style="width:100px;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">' +
                    '<div style="height:100%;width:' + pct + '%;background:' + item.color + ';"></div></div>' +
                    '<div style="width:40px;text-align:right;font-size:12px;color:rgba(255,255,255,0.5);">' + pct + '%</div>';
                expenseList.appendChild(row);
                setTimeout(function() { row.style.opacity = '1'; row.style.transform = 'translateX(0)'; }, 100);
            });
            expenseCard.appendChild(expenseList);
            container.appendChild(expenseCard);

        } catch (e) {
            console.error('Budget render error:', e);
            container.innerHTML = '<div class="error-state">Error loading Budget: ' + e.message + '</div>';
        }
    }

    // ========================================================================
    // ANALYTICS VIEW
    // ========================================================================
    function renderAnalytics(container) {
        container.innerHTML = '';
        
        try {
            var state = Store.getState();
            var metrics = Store.getMetrics();

            // Header
            var header = h('div', { className: 'view-header' });
            header.innerHTML = '<div><h1 class="view-title">📊 Analytics</h1><p class="view-subtitle">AI-powered insights and predictive analysis</p></div>';
            container.appendChild(header);

            // AI Insights
            var insightsGrid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' } });

            var insights = [
                { title: '🎯 Sprint Success', value: '87%', color: '#22c55e', desc: 'Probability of completing on time', rec: 'Velocity trends positive. Consider taking 2 more tasks.' },
                { title: '⚠️ Risk Score', value: '32/100', color: '#facc15', desc: 'Overall project risk level', rec: '2 blocked tasks affecting progress. Prioritize resolution.' },
                { title: '😊 Team Sentiment', value: '8.2/10', color: '#00d4ff', desc: 'Based on completion rates', rec: 'Morale is high! Maintain current momentum.' }
            ];

            insights.forEach(function(insight, i) {
                var card = h('div', { className: 'glass-card', style: { 
                    padding: '24px', opacity: '0', transform: 'scale(0.9)', 
                    transition: 'all 0.5s ease ' + (i * 0.15) + 's' 
                }});
                card.innerHTML = '<div style="font-size:14px;margin-bottom:16px;color:rgba(255,255,255,0.7);">' + insight.title + '</div>' +
                    '<div style="font-size:48px;font-weight:700;color:' + insight.color + ';margin-bottom:8px;">' + insight.value + '</div>' +
                    '<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:16px;">' + insight.desc + '</div>' +
                    '<div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:12px;border-left:3px solid ' + insight.color + ';">' +
                    '<strong>AI Recommendation:</strong><br>' + insight.rec + '</div>';
                insightsGrid.appendChild(card);
                setTimeout(function() { card.style.opacity = '1'; card.style.transform = 'scale(1)'; }, 50);
            });
            container.appendChild(insightsGrid);

            // Charts Row
            var chartsRow = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' } });

            // Velocity Trend
            var velocityCard = h('div', { className: 'glass-card', style: { padding: '24px' } });
            velocityCard.innerHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:16px;">📈 VELOCITY TREND</div>';
            var velocityChart = h('div', { style: { height: '260px' } });
            velocityCard.appendChild(velocityChart);
            chartsRow.appendChild(velocityCard);

            // Priority Distribution
            var priorityCard = h('div', { className: 'glass-card', style: { padding: '24px' } });
            priorityCard.innerHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:16px;">🎯 PRIORITY DISTRIBUTION</div>';
            var priorityChart = h('div', { style: { height: '260px' } });
            priorityCard.appendChild(priorityChart);
            chartsRow.appendChild(priorityCard);

            container.appendChild(chartsRow);

            // Render charts
            setTimeout(function() {
                Charts.line(velocityChart, state.history.slice(-30).map(function(h) {
                    return { y: h.velocity, label: h.date.split('-').slice(1).join('/') };
                }), { color: '#00d4ff', showArea: true, animate: true });

                Charts.donut(priorityChart, [
                    { label: 'Critical', value: state.tasks.filter(function(t) { return t.priority === 'critical'; }).length, color: '#ef4444' },
                    { label: 'High', value: state.tasks.filter(function(t) { return t.priority === 'high'; }).length, color: '#f97316' },
                    { label: 'Medium', value: state.tasks.filter(function(t) { return t.priority === 'medium'; }).length, color: '#facc15' },
                    { label: 'Low', value: state.tasks.filter(function(t) { return t.priority === 'low'; }).length, color: '#22c55e' }
                ], { size: 140, thickness: 25, showLegend: true, animate: true });
            }, 200);

            // Category Performance
            var categoryCard = h('div', { className: 'glass-card', style: { padding: '24px' } });
            categoryCard.innerHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:16px;">📊 COMPLETION BY CATEGORY</div>';
            var categoryChart = h('div', { style: { height: '220px' } });
            categoryCard.appendChild(categoryChart);
            container.appendChild(categoryCard);

            setTimeout(function() {
                var categories = ['feature', 'bugfix', 'improvement', 'documentation', 'testing', 'devops'];
                Charts.bar(categoryChart, categories.map(function(cat) {
                    var catTasks = state.tasks.filter(function(t) { return t.category === cat; });
                    var done = catTasks.filter(function(t) { return t.status === 'done'; }).length;
                    return { y: catTasks.length > 0 ? Math.round(done / catTasks.length * 100) : 0, label: cat };
                }), { color: '#a855f7', horizontal: true, animate: true });
            }, 300);

        } catch (e) {
            console.error('Analytics render error:', e);
            container.innerHTML = '<div class="error-state">Error loading Analytics: ' + e.message + '</div>';
        }
    }

    // ========================================================================
    // ACTIVITY VIEW
    // ========================================================================
    function renderActivity(container) {
        container.innerHTML = '';
        
        try {
            var state = Store.getState();

            // Header
            var header = h('div', { className: 'view-header' });
            header.innerHTML = '<div><h1 class="view-title">🔔 Activity</h1><p class="view-subtitle">Real-time project activity feed</p></div>';
            var refreshBtn = h('button', { className: 'btn', onClick: function() { renderActivity(container); } });
            refreshBtn.innerHTML = '🔄 Refresh';
            var headerActions = h('div', { className: 'header-actions' });
            headerActions.appendChild(refreshBtn);
            header.appendChild(headerActions);
            container.appendChild(header);

            // Main Layout
            var mainLayout = h('div', { style: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' } });

            // Activity Timeline
            var timelineCard = h('div', { className: 'glass-card', style: { padding: '24px' } });
            timelineCard.innerHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:20px;">📋 ACTIVITY TIMELINE</div>';
            
            var timeline = h('div', { style: { position: 'relative', paddingLeft: '30px' } });
            var line = h('div', { style: { position: 'absolute', left: '8px', top: '0', bottom: '0', width: '2px', background: 'linear-gradient(to bottom, #00d4ff, #a855f7, transparent)' } });
            timeline.appendChild(line);

            state.activities.forEach(function(activity, i) {
                var item = h('div', { style: { 
                    position: 'relative', paddingBottom: '24px',
                    opacity: '0', transform: 'translateX(-20px)', transition: 'all 0.4s ease ' + (i * 0.08) + 's'
                }});

                var typeColors = { completed: '#22c55e', created: '#00d4ff', moved: '#a855f7', comment: '#facc15', assigned: '#f97316' };
                var typeIcons = { completed: '✅', created: '➕', moved: '➡️', comment: '💬', assigned: '👤' };

                item.innerHTML = '<div style="position:absolute;left:-26px;width:16px;height:16px;border-radius:50%;background:' + (typeColors[activity.type] || '#00d4ff') + ';box-shadow:0 0 10px ' + (typeColors[activity.type] || '#00d4ff') + '40;"></div>' +
                    '<div class="glass-card" style="padding:16px;">' +
                    '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">' +
                    '<span style="font-weight:500;">' + (typeIcons[activity.type] || '📌') + ' ' + activity.user + '</span>' +
                    '<span style="font-size:11px;color:rgba(255,255,255,0.4);">' + UI.formatDateTime(activity.timestamp) + '</span></div>' +
                    '<div style="color:rgba(255,255,255,0.8);">' + activity.action + '</div>' +
                    (activity.task ? '<div style="margin-top:10px;padding:10px;background:rgba(0,212,255,0.05);border-radius:8px;font-size:13px;color:#00d4ff;cursor:pointer;">📋 ' + activity.task + '</div>' : '') +
                    '</div>';

                timeline.appendChild(item);
                setTimeout(function() { item.style.opacity = '1'; item.style.transform = 'translateX(0)'; }, 100);
            });

            timelineCard.appendChild(timeline);
            mainLayout.appendChild(timelineCard);

            // Sidebar Stats
            var sidebar = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '20px' } });

            // Activity by Type
            var typeCard = h('div', { className: 'glass-card', style: { padding: '24px' } });
            typeCard.innerHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:16px;">📊 BY TYPE</div>';
            var typeChart = h('div', { style: { height: '180px' } });
            typeCard.appendChild(typeChart);
            sidebar.appendChild(typeCard);

            // Top Contributors
            var contribCard = h('div', { className: 'glass-card', style: { padding: '24px' } });
            contribCard.innerHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:16px;">🏆 TOP CONTRIBUTORS</div>';
            
            var contribs = {};
            state.activities.forEach(function(a) { contribs[a.user] = (contribs[a.user] || 0) + 1; });
            
            Object.keys(contribs).sort(function(a, b) { return contribs[b] - contribs[a]; }).slice(0, 5).forEach(function(user, i) {
                var row = h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '8px' } });
                row.innerHTML = '<span style="font-size:12px;color:rgba(255,255,255,0.5);width:20px;">#' + (i + 1) + '</span>' +
                    '<span style="flex:1;">' + user + '</span>' +
                    '<span style="font-weight:600;color:#00d4ff;">' + contribs[user] + '</span>';
                contribCard.appendChild(row);
            });
            sidebar.appendChild(contribCard);

            mainLayout.appendChild(sidebar);
            container.appendChild(mainLayout);

            // Render type chart
            setTimeout(function() {
                var typeData = {};
                state.activities.forEach(function(a) { typeData[a.type] = (typeData[a.type] || 0) + 1; });
                Charts.donut(typeChart, Object.keys(typeData).map(function(type) {
                    var colors = { completed: '#22c55e', created: '#00d4ff', moved: '#a855f7', comment: '#facc15', assigned: '#f97316' };
                    return { label: type, value: typeData[type], color: colors[type] || '#00d4ff' };
                }), { size: 100, thickness: 20, showLegend: true, animate: true });
            }, 200);

        } catch (e) {
            console.error('Activity render error:', e);
            container.innerHTML = '<div class="error-state">Error loading Activity: ' + e.message + '</div>';
        }
    }

    // ========================================================================
    // SETTINGS VIEW
    // ========================================================================
    function renderSettings(container) {
        container.innerHTML = '';
        
        try {
            var state = Store.getState();
            var settings = state.settings;

            // Header
            var header = h('div', { className: 'view-header' });
            header.innerHTML = '<div><h1 class="view-title">⚙️ Settings</h1><p class="view-subtitle">Customize your experience</p></div>';
            container.appendChild(header);

            // Settings Grid
            var settingsGrid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' } });

            // Appearance
            var appearanceCard = createSettingsCard('🎨 Appearance', [
                { key: 'darkMode', label: 'Dark Mode', desc: 'Enable dark theme', type: 'toggle', value: settings.darkMode !== false },
                { key: 'animations', label: 'Animations', desc: 'Enable UI animations', type: 'toggle', value: settings.animations !== false },
                { key: 'compactMode', label: 'Compact Mode', desc: 'Reduce spacing', type: 'toggle', value: settings.compactMode === true }
            ]);
            settingsGrid.appendChild(appearanceCard);

            // Notifications
            var notifCard = createSettingsCard('🔔 Notifications', [
                { key: 'notifications', label: 'Push Notifications', desc: 'Desktop notifications', type: 'toggle', value: settings.notifications !== false },
                { key: 'emailDigest', label: 'Email Digest', desc: 'Daily summary', type: 'toggle', value: settings.emailDigest === true },
                { key: 'soundEnabled', label: 'Sound Effects', desc: 'Audio feedback', type: 'toggle', value: settings.soundEnabled !== false }
            ]);
            settingsGrid.appendChild(notifCard);

            // Kanban
            var kanbanCard = createSettingsCard('📋 Kanban Board', [
                { key: 'kanbanDragEnabled', label: 'Drag & Drop', desc: 'Enable card dragging', type: 'toggle', value: settings.kanbanDragEnabled !== false },
                { key: 'showProgress', label: 'Show Progress', desc: 'Progress bars on cards', type: 'toggle', value: settings.showProgress !== false },
                { key: 'showAssignee', label: 'Show Assignee', desc: 'Avatars on cards', type: 'toggle', value: settings.showAssignee !== false }
            ]);
            settingsGrid.appendChild(kanbanCard);

            // Data
            var dataCard = createSettingsCard('💾 Data & Export', [
                { key: 'autoSave', label: 'Auto Save', desc: 'Save changes automatically', type: 'toggle', value: settings.autoSave !== false },
                { key: 'export', label: 'Export Data', desc: 'Download project data', type: 'button', action: function() {
                    var data = JSON.stringify(Store.getState(), null, 2);
                    var blob = new Blob([data], { type: 'application/json' });
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url; a.download = 'project-hub-data.json'; a.click();
                    UI.toast('Data exported!', 'success');
                }},
                { key: 'reset', label: 'Reset Settings', desc: 'Restore defaults', type: 'button', danger: true, action: function() {
                    if (confirm('Reset all settings?')) {
                        Store.resetSettings();
                        renderSettings(container);
                        UI.toast('Settings reset!', 'success');
                    }
                }}
            ]);
            settingsGrid.appendChild(dataCard);

            container.appendChild(settingsGrid);

        } catch (e) {
            console.error('Settings render error:', e);
            container.innerHTML = '<div class="error-state">Error loading Settings: ' + e.message + '</div>';
        }
    }

    function createSettingsCard(title, items) {
        var card = h('div', { className: 'glass-card', style: { padding: '24px' } });
        card.innerHTML = '<div style="font-size:16px;font-weight:600;margin-bottom:20px;">' + title + '</div>';

        items.forEach(function(item) {
            var row = h('div', { style: { 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', marginBottom: '10px'
            }});

            var labelDiv = h('div');
            labelDiv.innerHTML = '<div style="font-weight:500;margin-bottom:2px;">' + item.label + '</div>' +
                '<div style="font-size:12px;color:rgba(255,255,255,0.5);">' + item.desc + '</div>';
            row.appendChild(labelDiv);

            if (item.type === 'toggle') {
                var toggle = h('label', { style: { position: 'relative', width: '44px', height: '24px', cursor: 'pointer' } });
                var input = h('input', { type: 'checkbox' });
                input.checked = item.value;
                input.style.cssText = 'opacity:0;width:0;height:0;position:absolute;';
                
                var slider = h('span', { style: { 
                    position: 'absolute', top: '0', left: '0', right: '0', bottom: '0',
                    background: item.value ? '#00d4ff' : 'rgba(255,255,255,0.1)',
                    borderRadius: '24px', transition: 'all 0.3s'
                }});
                var knob = h('span', { style: {
                    position: 'absolute', top: '2px', left: item.value ? '22px' : '2px',
                    width: '20px', height: '20px', background: '#fff', borderRadius: '50%',
                    transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }});
                slider.appendChild(knob);
                toggle.appendChild(input);
                toggle.appendChild(slider);

                input.addEventListener('change', function() {
                    var checked = input.checked;
                    slider.style.background = checked ? '#00d4ff' : 'rgba(255,255,255,0.1)';
                    knob.style.left = checked ? '22px' : '2px';
                    Store.updateSettings(item.key, checked);
                    UI.toast('Setting updated!', 'success');
                });

                row.appendChild(toggle);
            } else if (item.type === 'button') {
                var btn = h('button', { 
                    className: 'btn',
                    style: item.danger ? { background: 'rgba(239,68,68,0.1)', borderColor: '#ef4444', color: '#ef4444' } : {},
                    onClick: item.action
                });
                btn.textContent = item.label;
                row.appendChild(btn);
            }

            card.appendChild(row);
        });

        return card;
    }

    // ========================================================================
    // EXPORT VIEWS
    // ========================================================================
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
