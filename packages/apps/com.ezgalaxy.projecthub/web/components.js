/**
 * Project Hub - UI Components Library
 * Reusable DOM-based components with animations
 */

(function(global) {
    'use strict';

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================
    function el(tag, attrs, children) {
        var element = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach(function(key) {
                if (key === 'className') {
                    element.className = attrs[key];
                } else if (key === 'style' && typeof attrs[key] === 'object') {
                    Object.assign(element.style, attrs[key]);
                } else if (key.startsWith('on') && typeof attrs[key] === 'function') {
                    element.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
                } else if (key === 'dataset') {
                    Object.keys(attrs[key]).forEach(function(dataKey) {
                        element.dataset[dataKey] = attrs[key][dataKey];
                    });
                } else {
                    element.setAttribute(key, attrs[key]);
                }
            });
        }
        if (children) {
            if (Array.isArray(children)) {
                children.forEach(function(child) {
                    if (child) {
                        element.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
                    }
                });
            } else if (typeof children === 'string') {
                element.textContent = children;
            } else {
                element.appendChild(children);
            }
        }
        return element;
    }

    function formatCurrency(amount) {
        return '$' + amount.toLocaleString();
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        var date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '-';
        var date = new Date(dateStr);
        var now = new Date();
        var diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function daysUntil(dateStr) {
        var date = new Date(dateStr);
        var now = new Date();
        return Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    }

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

    // Icons (SVG inline)
    var icons = {
        'dashboard': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
        'kanban': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5v14"/><path d="M18 5v14"/><path d="M12 5v14"/><path d="M2 5h4"/><path d="M10 5h4"/><path d="M18 5h4"/></svg>',
        'timeline': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><circle cx="4" cy="6" r="2"/><circle cx="4" cy="12" r="2"/><circle cx="4" cy="18" r="2"/></svg>',
        'team': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        'budget': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12V6"/><path d="M12 12l4-2"/></svg>',
        'analytics': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
        'activity': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
        'settings': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
        'plus': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        'close': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        'check': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        'alert': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        'clock': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        'calendar': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
        'target': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
        'trending-up': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
        'trending-down': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>',
        'filter': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
        'edit': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        'trash': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        'more': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
        'comment': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        'link': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
        'zap': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
        'arrow-left': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
        'arrow-right': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
        'chevron-down': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
        'refresh': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>'
    };

    function icon(name, size) {
        var svg = icons[name] || icons['target'];
        if (size && size !== 20) {
            svg = svg.replace(/width="20"/g, 'width="' + size + '"').replace(/height="20"/g, 'height="' + size + '"');
        }
        var span = el('span', { className: 'icon' });
        span.innerHTML = svg;
        return span;
    }

    // ========================================================================
    // MODAL COMPONENT
    // ========================================================================
    function createModal(options) {
        var overlay = el('div', { className: 'modal-overlay' });
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:1000;opacity:0;transition:opacity 0.3s ease;';

        var modal = el('div', { className: 'modal-content glass-card' });
        modal.style.cssText = 'min-width:400px;max-width:600px;max-height:80vh;overflow-y:auto;transform:scale(0.9);transition:transform 0.3s ease;';

        var header = el('div', { className: 'modal-header' }, [
            el('h3', {}, options.title || 'Modal'),
            el('button', { 
                className: 'btn-icon', 
                onClick: function() { closeModal(); }
            }, [icon('close', 18)])
        ]);
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.1);';

        var body = el('div', { className: 'modal-body' });
        if (options.content) {
            if (typeof options.content === 'string') {
                body.innerHTML = options.content;
            } else {
                body.appendChild(options.content);
            }
        }

        modal.appendChild(header);
        modal.appendChild(body);

        if (options.actions) {
            var footer = el('div', { className: 'modal-footer' });
            footer.style.cssText = 'display:flex;justify-content:flex-end;gap:12px;margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);';
            options.actions.forEach(function(action) {
                var btn = el('button', { 
                    className: 'btn ' + (action.primary ? 'btn-primary' : ''),
                    onClick: function() {
                        if (action.onClick) action.onClick();
                        if (action.close !== false) closeModal();
                    }
                }, action.label);
                footer.appendChild(btn);
            });
            modal.appendChild(footer);
        }

        overlay.appendChild(modal);

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeModal();
        });

        function closeModal() {
            overlay.style.opacity = '0';
            modal.style.transform = 'scale(0.9)';
            setTimeout(function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 300);
            if (options.onClose) options.onClose();
        }

        document.body.appendChild(overlay);
        requestAnimationFrame(function() {
            overlay.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        });

        return { close: closeModal, modal: modal, body: body };
    }

    // ========================================================================
    // TOAST NOTIFICATIONS
    // ========================================================================
    var toastContainer = null;

    function showToast(message, type) {
        type = type || 'info';

        if (!toastContainer) {
            toastContainer = el('div', { className: 'toast-container' });
            toastContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:2000;display:flex;flex-direction:column;gap:10px;';
            document.body.appendChild(toastContainer);
        }

        var colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#facc15',
            info: '#00d4ff'
        };

        var toast = el('div', { className: 'toast' });
        toast.style.cssText = 'padding:12px 20px;background:rgba(0,0,0,0.9);border:1px solid ' + colors[type] + ';border-radius:10px;color:#fff;font-size:14px;display:flex;align-items:center;gap:10px;transform:translateX(120%);transition:transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);box-shadow:0 4px 20px rgba(0,0,0,0.5);';

        var iconEl = el('span', { style: { color: colors[type] } });
        iconEl.innerHTML = type === 'success' ? icons['check'] : type === 'error' ? icons['close'] : type === 'warning' ? icons['alert'] : icons['zap'];
        iconEl.querySelector('svg').setAttribute('width', '16');
        iconEl.querySelector('svg').setAttribute('height', '16');

        toast.appendChild(iconEl);
        toast.appendChild(document.createTextNode(message));

        toastContainer.appendChild(toast);

        requestAnimationFrame(function() {
            toast.style.transform = 'translateX(0)';
        });

        setTimeout(function() {
            toast.style.transform = 'translateX(120%)';
            setTimeout(function() {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 4000);
    }

    // ========================================================================
    // DROPDOWN MENU
    // ========================================================================
    function createDropdown(trigger, items, options) {
        options = options || {};
        var menu = null;

        function show(e) {
            if (menu) return;
            e.stopPropagation();

            menu = el('div', { className: 'dropdown-menu' });
            menu.style.cssText = 'position:fixed;background:rgba(10,15,26,0.98);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:6px;min-width:160px;z-index:500;box-shadow:0 10px 40px rgba(0,0,0,0.5);opacity:0;transform:translateY(-10px);transition:all 0.2s ease;';

            items.forEach(function(item, i) {
                if (item.divider) {
                    var divider = el('div');
                    divider.style.cssText = 'height:1px;background:rgba(255,255,255,0.1);margin:6px 0;';
                    menu.appendChild(divider);
                    return;
                }

                var menuItem = el('button', {
                    className: 'dropdown-item',
                    onClick: function() {
                        if (item.onClick) item.onClick();
                        hide();
                    }
                }, [
                    item.icon ? icon(item.icon, 16) : null,
                    el('span', {}, item.label)
                ]);
                menuItem.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:transparent;border:none;color:' + (item.danger ? '#ef4444' : 'rgba(255,255,255,0.8)') + ';font-size:13px;text-align:left;cursor:pointer;border-radius:6px;transition:all 0.15s;';
                menuItem.addEventListener('mouseenter', function() {
                    menuItem.style.background = 'rgba(255,255,255,0.08)';
                    menuItem.style.color = item.danger ? '#ef4444' : '#fff';
                });
                menuItem.addEventListener('mouseleave', function() {
                    menuItem.style.background = 'transparent';
                    menuItem.style.color = item.danger ? '#ef4444' : 'rgba(255,255,255,0.8)';
                });
                menu.appendChild(menuItem);
            });

            document.body.appendChild(menu);

            var rect = trigger.getBoundingClientRect();
            menu.style.top = (rect.bottom + 8) + 'px';
            menu.style.left = (options.align === 'right' ? rect.right - menu.offsetWidth : rect.left) + 'px';

            requestAnimationFrame(function() {
                menu.style.opacity = '1';
                menu.style.transform = 'translateY(0)';
            });

            document.addEventListener('click', hide);
        }

        function hide() {
            if (menu) {
                menu.style.opacity = '0';
                menu.style.transform = 'translateY(-10px)';
                var m = menu;
                setTimeout(function() {
                    if (m.parentNode) m.parentNode.removeChild(m);
                }, 200);
                menu = null;
            }
            document.removeEventListener('click', hide);
        }

        trigger.addEventListener('click', show);
        return { show: show, hide: hide };
    }

    // ========================================================================
    // TASK CARD COMPONENT
    // ========================================================================
    function createTaskCard(task, options) {
        options = options || {};
        var collaborator = Store.getCollaborator(task.assignee);
        var isBlocked = task.status === 'blocked';

        var card = el('div', { 
            className: 'kanban-card' + (isBlocked ? ' blocked' : ''),
            draggable: options.draggable !== false ? 'true' : 'false',
            dataset: { taskId: task.id }
        });

        // Header
        var header = el('div', { className: 'card-header' }, [
            el('span', { className: 'priority-dot', style: { backgroundColor: priorityColors[task.priority] } }),
            el('span', { className: 'category-tag' }, task.category)
        ]);

        // Blocked badge
        if (isBlocked) {
            var badge = el('div', { className: 'blocked-badge' }, [
                icon('alert', 12),
                ' Blocked'
            ]);
            card.appendChild(badge);
        }

        card.appendChild(header);

        // Title
        card.appendChild(el('h4', { className: 'card-title' }, task.title));

        // Description
        if (task.description && options.showDescription !== false) {
            var desc = task.description.length > 80 ? task.description.substring(0, 80) + '...' : task.description;
            card.appendChild(el('p', { className: 'card-description' }, desc));
        }

        // Progress bar
        var progressContainer = el('div', { className: 'card-progress' });
        Charts.progress(progressContainer, task.progress, {
            color: statusColors[task.status],
            height: 4,
            showValue: false,
            animate: true
        });
        card.appendChild(progressContainer);

        // Footer
        var footer = el('div', { className: 'card-footer' });

        if (collaborator) {
            var assignee = el('div', { className: 'card-assignee' }, [
                el('span', { className: 'assignee-avatar' }, collaborator.avatar),
                el('span', { className: 'assignee-name' }, collaborator.name.split(' ')[0])
            ]);
            footer.appendChild(assignee);
        }

        var meta = el('div', { className: 'card-meta' });
        if (task.estimate) {
            meta.appendChild(el('span', { className: 'meta-item' }, [
                icon('clock', 12),
                ' ' + task.spent + '/' + task.estimate + 'h'
            ]));
        }
        if (task.comments > 0) {
            meta.appendChild(el('span', { className: 'meta-item' }, [
                icon('comment', 12),
                ' ' + task.comments
            ]));
        }
        footer.appendChild(meta);

        card.appendChild(footer);

        // Drag events
        if (options.draggable !== false) {
            card.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', task.id);
                card.classList.add('dragging');
                setTimeout(function() { card.style.opacity = '0.5'; }, 0);
            });
            card.addEventListener('dragend', function() {
                card.classList.remove('dragging');
                card.style.opacity = '1';
            });
        }

        // Click to edit
        card.addEventListener('click', function(e) {
            if (e.target.closest('.btn-icon')) return;
            openTaskModal(task);
        });

        // Animations
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        requestAnimationFrame(function() {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });

        return card;
    }

    // ========================================================================
    // TASK MODAL
    // ========================================================================
    function openTaskModal(task) {
        var isNew = !task;
        task = task || {
            title: '',
            description: '',
            status: 'todo',
            priority: 'medium',
            category: 'feature',
            assignee: '',
            estimate: 0,
            startDate: '',
            endDate: ''
        };

        var form = el('div', { className: 'task-form' });
        form.style.cssText = 'display:flex;flex-direction:column;gap:16px;';

        // Title
        var titleInput = el('input', {
            type: 'text',
            placeholder: 'Task title',
            value: task.title,
            className: 'input-field'
        });

        // Description
        var descInput = el('textarea', {
            placeholder: 'Description',
            className: 'input-field',
            rows: '3'
        });
        descInput.value = task.description || '';

        // Status & Priority row
        var row1 = el('div', { className: 'form-row' });
        row1.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';

        var statusSelect = el('select', { className: 'input-field' });
        ['backlog', 'todo', 'in-progress', 'review', 'done', 'blocked'].forEach(function(s) {
            var opt = el('option', { value: s }, s.replace('-', ' '));
            if (s === task.status) opt.selected = true;
            statusSelect.appendChild(opt);
        });

        var prioritySelect = el('select', { className: 'input-field' });
        ['critical', 'high', 'medium', 'low'].forEach(function(p) {
            var opt = el('option', { value: p }, p);
            if (p === task.priority) opt.selected = true;
            prioritySelect.appendChild(opt);
        });

        row1.appendChild(el('div', {}, [el('label', {}, 'Status'), statusSelect]));
        row1.appendChild(el('div', {}, [el('label', {}, 'Priority'), prioritySelect]));

        // Category & Assignee row
        var row2 = el('div', { className: 'form-row' });
        row2.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';

        var categorySelect = el('select', { className: 'input-field' });
        ['feature', 'bugfix', 'improvement', 'documentation', 'testing', 'devops'].forEach(function(c) {
            var opt = el('option', { value: c }, c);
            if (c === task.category) opt.selected = true;
            categorySelect.appendChild(opt);
        });

        var assigneeSelect = el('select', { className: 'input-field' });
        assigneeSelect.appendChild(el('option', { value: '' }, 'Unassigned'));
        Store.getState().collaborators.forEach(function(c) {
            var opt = el('option', { value: c.id }, c.avatar + ' ' + c.name);
            if (c.id === task.assignee) opt.selected = true;
            assigneeSelect.appendChild(opt);
        });

        row2.appendChild(el('div', {}, [el('label', {}, 'Category'), categorySelect]));
        row2.appendChild(el('div', {}, [el('label', {}, 'Assignee'), assigneeSelect]));

        // Dates & Estimate row
        var row3 = el('div', { className: 'form-row' });
        row3.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;';

        var startInput = el('input', { type: 'date', className: 'input-field', value: task.startDate || '' });
        var endInput = el('input', { type: 'date', className: 'input-field', value: task.endDate || '' });
        var estimateInput = el('input', { type: 'number', className: 'input-field', value: task.estimate || '', placeholder: 'Hours' });

        row3.appendChild(el('div', {}, [el('label', {}, 'Start Date'), startInput]));
        row3.appendChild(el('div', {}, [el('label', {}, 'End Date'), endInput]));
        row3.appendChild(el('div', {}, [el('label', {}, 'Estimate (h)'), estimateInput]));

        form.appendChild(el('div', {}, [el('label', {}, 'Title'), titleInput]));
        form.appendChild(el('div', {}, [el('label', {}, 'Description'), descInput]));
        form.appendChild(row1);
        form.appendChild(row2);
        form.appendChild(row3);

        var modal = createModal({
            title: isNew ? 'Create Task' : 'Edit Task',
            content: form,
            actions: [
                { label: 'Cancel' },
                !isNew ? { 
                    label: 'Delete', 
                    onClick: function() {
                        Store.deleteTask(task.id);
                        showToast('Task deleted', 'success');
                    }
                } : null,
                {
                    label: isNew ? 'Create' : 'Save',
                    primary: true,
                    onClick: function() {
                        var data = {
                            title: titleInput.value,
                            description: descInput.value,
                            status: statusSelect.value,
                            priority: prioritySelect.value,
                            category: categorySelect.value,
                            assignee: assigneeSelect.value,
                            startDate: startInput.value,
                            endDate: endInput.value,
                            estimate: parseInt(estimateInput.value) || 0
                        };

                        if (!data.title) {
                            showToast('Title is required', 'error');
                            return;
                        }

                        if (isNew) {
                            Store.addTask(data);
                            showToast('Task created!', 'success');
                        } else {
                            Store.updateTask(task.id, data);
                            showToast('Task updated!', 'success');
                        }
                    }
                }
            ].filter(Boolean)
        });
    }

    // ========================================================================
    // STAT CARD COMPONENT
    // ========================================================================
    function createStatCard(options) {
        var card = el('div', { className: 'glass-card stat-card' + (options.clickable ? ' clickable' : '') });

        var header = el('div', { className: 'stat-card-header' }, [
            el('span', { className: 'stat-card-title' }, options.title),
            options.icon ? el('div', { className: 'stat-card-icon', style: { color: options.color || '#00d4ff' } }, [icon(options.icon, 22)]) : null
        ]);

        var value = el('div', { 
            className: 'stat-card-value', 
            style: { color: options.color || '#00d4ff' } 
        }, options.value);

        card.appendChild(header);
        card.appendChild(value);

        if (options.subtitle || options.trend !== undefined) {
            var footer = el('div', { className: 'stat-card-footer' });
            if (options.subtitle) {
                footer.appendChild(el('span', { className: 'stat-card-subtitle' }, options.subtitle));
            }
            if (options.trend !== undefined) {
                var trendClass = options.trend >= 0 ? 'positive' : 'negative';
                var trendEl = el('span', { className: 'stat-card-trend ' + trendClass }, [
                    icon(options.trend >= 0 ? 'trending-up' : 'trending-down', 14),
                    ' ' + Math.abs(options.trend) + '%'
                ]);
                footer.appendChild(trendEl);
            }
            card.appendChild(footer);
        }

        if (options.sparklineData) {
            var sparklineContainer = el('div', { className: 'stat-card-sparkline' });
            Charts.sparkline(sparklineContainer, options.sparklineData, {
                color: options.color || '#00d4ff',
                width: 120,
                height: 30
            });
            card.appendChild(sparklineContainer);
        }

        if (options.onClick) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', options.onClick);
        }

        // Animate in
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        if (options.delay) {
            card.style.transitionDelay = options.delay + 's';
        }
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            });
        });

        return card;
    }

    // ========================================================================
    // FILTER BAR COMPONENT
    // ========================================================================
    function createFilterBar(filters, onChange) {
        var bar = el('div', { className: 'filter-bar' });
        bar.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;';

        function createSelect(label, options, currentValue, key) {
            var wrapper = el('div', { className: 'filter-select-wrapper' });
            wrapper.style.cssText = 'display:flex;align-items:center;gap:8px;';

            var labelEl = el('span', { style: { fontSize: '12px', color: 'rgba(255,255,255,0.6)' } }, label);

            var select = el('select', { className: 'filter-select' });
            select.style.cssText = 'padding:8px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:13px;cursor:pointer;outline:none;';

            options.forEach(function(opt) {
                var option = el('option', { value: opt.value }, opt.label);
                if (opt.value === currentValue) option.selected = true;
                select.appendChild(option);
            });

            select.addEventListener('change', function() {
                onChange(key, select.value);
            });

            wrapper.appendChild(labelEl);
            wrapper.appendChild(select);
            return wrapper;
        }

        bar.appendChild(createSelect('Status', [
            { value: 'all', label: 'All Status' },
            { value: 'backlog', label: 'Backlog' },
            { value: 'todo', label: 'To Do' },
            { value: 'in-progress', label: 'In Progress' },
            { value: 'review', label: 'Review' },
            { value: 'done', label: 'Done' },
            { value: 'blocked', label: 'Blocked' }
        ], filters.status, 'status'));

        bar.appendChild(createSelect('Priority', [
            { value: 'all', label: 'All Priority' },
            { value: 'critical', label: 'Critical' },
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' }
        ], filters.priority, 'priority'));

        bar.appendChild(createSelect('Assignee', [
            { value: 'all', label: 'All Members' }
        ].concat(Store.getState().collaborators.map(function(c) {
            return { value: c.id, label: c.avatar + ' ' + c.name };
        })), filters.assignee, 'assignee'));

        return bar;
    }

    // Export
    global.UI = {
        el: el,
        icon: icon,
        icons: icons,
        modal: createModal,
        toast: showToast,
        dropdown: createDropdown,
        taskCard: createTaskCard,
        openTaskModal: openTaskModal,
        statCard: createStatCard,
        filterBar: createFilterBar,
        formatCurrency: formatCurrency,
        formatDate: formatDate,
        formatDateTime: formatDateTime,
        daysUntil: daysUntil,
        statusColors: statusColors,
        priorityColors: priorityColors
    };

})(window);
