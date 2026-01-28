/**
 * Project Hub - Data Store
 * State management and demo data
 */

(function(global) {
    'use strict';

    // ========================================================================
    // DEMO DATA
    // ========================================================================
    var now = new Date();

    // Team members
    var collaborators = [
        { id: 'c1', name: 'Alice Martin', role: 'Lead Developer', avatar: '👩‍💻', skills: ['React', 'Node.js', 'TypeScript'], capacity: 40, workload: 95, status: 'active', color: '#00d4ff' },
        { id: 'c2', name: 'Bob Johnson', role: 'Senior Developer', avatar: '👨‍💻', skills: ['Python', 'Django', 'PostgreSQL'], capacity: 40, workload: 112, status: 'overloaded', color: '#a855f7' },
        { id: 'c3', name: 'Clara Chen', role: 'UX Designer', avatar: '👩‍🎨', skills: ['Figma', 'Prototyping', 'Research'], capacity: 40, workload: 80, status: 'active', color: '#ec4899' },
        { id: 'c4', name: 'David Park', role: 'Project Manager', avatar: '👨‍💼', skills: ['Agile', 'Scrum', 'Planning'], capacity: 40, workload: 87, status: 'active', color: '#22c55e' },
        { id: 'c5', name: 'Emma Wilson', role: 'QA Engineer', avatar: '👩‍🔬', skills: ['Testing', 'Automation', 'CI/CD'], capacity: 40, workload: 70, status: 'available', color: '#facc15' },
        { id: 'c6', name: 'Frank Lee', role: 'DevOps Engineer', avatar: '👨‍🔧', skills: ['Docker', 'Kubernetes', 'AWS'], capacity: 40, workload: 105, status: 'busy', color: '#f97316' },
        { id: 'c7', name: 'Grace Kim', role: 'Frontend Developer', avatar: '👩‍💻', skills: ['Vue.js', 'CSS', 'Animation'], capacity: 40, workload: 90, status: 'active', color: '#0ea5a4' },
        { id: 'c8', name: 'Henry Brown', role: 'Backend Developer', avatar: '👨‍💻', skills: ['Java', 'Spring', 'MongoDB'], capacity: 40, workload: 75, status: 'available', color: '#8b5cf6' }
    ];

    // Tasks
    var tasks = [
        { id: 't1', title: 'Design System Implementation', description: 'Create comprehensive design tokens and components', status: 'done', priority: 'high', category: 'feature', assignee: 'c3', estimate: 24, spent: 22, startDate: '2026-01-05', endDate: '2026-01-12', progress: 100, dependencies: [], comments: 3 },
        { id: 't2', title: 'User Authentication Flow', description: 'Implement OAuth2 with JWT tokens', status: 'done', priority: 'critical', category: 'feature', assignee: 'c1', estimate: 32, spent: 35, startDate: '2026-01-08', endDate: '2026-01-15', progress: 100, dependencies: [], comments: 5 },
        { id: 't3', title: 'Database Schema Design', description: 'Design and optimize PostgreSQL schema', status: 'done', priority: 'high', category: 'feature', assignee: 'c2', estimate: 16, spent: 14, startDate: '2026-01-06', endDate: '2026-01-10', progress: 100, dependencies: [], comments: 2 },
        { id: 't4', title: 'API Gateway Setup', description: 'Configure Kong API gateway with rate limiting', status: 'in-progress', priority: 'high', category: 'devops', assignee: 'c6', estimate: 20, spent: 12, startDate: '2026-01-18', endDate: '2026-01-25', progress: 60, dependencies: ['t3'], comments: 1 },
        { id: 't5', title: 'Dashboard UI Components', description: 'Build reusable chart and card components', status: 'in-progress', priority: 'high', category: 'feature', assignee: 'c7', estimate: 40, spent: 28, startDate: '2026-01-15', endDate: '2026-01-28', progress: 70, dependencies: ['t1'], comments: 4 },
        { id: 't6', title: 'Real-time Notifications', description: 'WebSocket-based notification system', status: 'in-progress', priority: 'medium', category: 'feature', assignee: 'c1', estimate: 24, spent: 8, startDate: '2026-01-20', endDate: '2026-01-30', progress: 35, dependencies: ['t2'], comments: 0 },
        { id: 't7', title: 'Unit Test Coverage', description: 'Achieve 80% test coverage for core modules', status: 'in-progress', priority: 'medium', category: 'testing', assignee: 'c5', estimate: 32, spent: 18, startDate: '2026-01-12', endDate: '2026-01-28', progress: 55, dependencies: [], comments: 2 },
        { id: 't8', title: 'Performance Optimization', description: 'Optimize bundle size and lazy loading', status: 'todo', priority: 'medium', category: 'improvement', assignee: 'c7', estimate: 16, spent: 0, startDate: '2026-01-28', endDate: '2026-02-02', progress: 0, dependencies: ['t5'], comments: 0 },
        { id: 't9', title: 'Mobile Responsive Design', description: 'Ensure full mobile compatibility', status: 'review', priority: 'high', category: 'feature', assignee: 'c3', estimate: 24, spent: 22, startDate: '2026-01-18', endDate: '2026-01-26', progress: 90, dependencies: ['t1', 't5'], comments: 3 },
        { id: 't10', title: 'CI/CD Pipeline', description: 'Setup GitHub Actions with staging deploy', status: 'done', priority: 'high', category: 'devops', assignee: 'c6', estimate: 16, spent: 18, startDate: '2026-01-10', endDate: '2026-01-14', progress: 100, dependencies: [], comments: 1 },
        { id: 't11', title: 'Error Handling System', description: 'Global error boundary and logging', status: 'in-progress', priority: 'medium', category: 'improvement', assignee: 'c8', estimate: 12, spent: 6, startDate: '2026-01-22', endDate: '2026-01-28', progress: 50, dependencies: [], comments: 0 },
        { id: 't12', title: 'Analytics Integration', description: 'Integrate Mixpanel and custom events', status: 'todo', priority: 'low', category: 'feature', assignee: 'c1', estimate: 8, spent: 0, startDate: '2026-02-01', endDate: '2026-02-04', progress: 0, dependencies: ['t2'], comments: 0 },
        { id: 't13', title: 'Documentation Update', description: 'Update API docs and README', status: 'in-progress', priority: 'low', category: 'documentation', assignee: 'c4', estimate: 8, spent: 4, startDate: '2026-01-24', endDate: '2026-01-28', progress: 50, dependencies: [], comments: 1 },
        { id: 't14', title: 'Security Audit', description: 'Perform security review and fix vulnerabilities', status: 'blocked', priority: 'critical', category: 'testing', assignee: 'c5', estimate: 24, spent: 4, startDate: '2026-01-26', endDate: '2026-02-02', progress: 15, dependencies: ['t2', 't4'], blockedReason: 'Waiting for API Gateway completion', comments: 2 },
        { id: 't15', title: 'User Profile Management', description: 'Profile editing and avatar upload', status: 'todo', priority: 'medium', category: 'feature', assignee: 'c7', estimate: 16, spent: 0, startDate: '2026-02-02', endDate: '2026-02-06', progress: 0, dependencies: ['t2'], comments: 0 },
        { id: 't16', title: 'Email Notification Service', description: 'Transactional emails with SendGrid', status: 'backlog', priority: 'medium', category: 'feature', assignee: 'c8', estimate: 12, spent: 0, startDate: null, endDate: null, progress: 0, dependencies: [], comments: 0 },
        { id: 't17', title: 'Dark Mode Support', description: 'Implement theme switching', status: 'done', priority: 'low', category: 'feature', assignee: 'c3', estimate: 8, spent: 6, startDate: '2026-01-14', endDate: '2026-01-16', progress: 100, dependencies: ['t1'], comments: 1 },
        { id: 't18', title: 'Search Functionality', description: 'Full-text search with Elasticsearch', status: 'todo', priority: 'high', category: 'feature', assignee: 'c2', estimate: 24, spent: 0, startDate: '2026-01-30', endDate: '2026-02-06', progress: 0, dependencies: ['t3'], comments: 0 },
        { id: 't19', title: 'Export to PDF/CSV', description: 'Report generation and export', status: 'backlog', priority: 'low', category: 'feature', assignee: 'c1', estimate: 12, spent: 0, startDate: null, endDate: null, progress: 0, dependencies: [], comments: 0 },
        { id: 't20', title: 'Keyboard Shortcuts', description: 'Power user keyboard navigation', status: 'backlog', priority: 'low', category: 'improvement', assignee: 'c7', estimate: 8, spent: 0, startDate: null, endDate: null, progress: 0, dependencies: [], comments: 0 }
    ];

    // Financials
    var financials = {
        budget: 250000,
        used: 147500,
        committed: 45000,
        remaining: 57500,
        burnRate: 52000,
        projectedOverrun: 15000,
        breakdown: [
            { category: 'Development', amount: 78000, color: '#00d4ff' },
            { category: 'Design', amount: 28000, color: '#a855f7' },
            { category: 'Infrastructure', amount: 22500, color: '#22c55e' },
            { category: 'Testing', amount: 12000, color: '#facc15' },
            { category: 'Management', amount: 7000, color: '#ec4899' }
        ],
        monthly: [
            { month: 'Nov', planned: 35000, actual: 32000 },
            { month: 'Dec', planned: 40000, actual: 45000 },
            { month: 'Jan', planned: 45000, actual: 52000 },
            { month: 'Feb', planned: 42000, actual: 0 },
            { month: 'Mar', planned: 38000, actual: 0 }
        ]
    };

    // History (90 days)
    var history = [];
    for (var i = 90; i >= 0; i--) {
        var date = new Date(now);
        date.setDate(date.getDate() - i);
        var completed = Math.floor(5 + (90 - i) * 0.15 + Math.random() * 2);
        var velocity = 2 + Math.sin(i * 0.1) * 1.5 + Math.random();
        history.push({
            date: date.toISOString().split('T')[0],
            label: (date.getMonth() + 1) + '/' + date.getDate(),
            tasksCompleted: Math.min(completed, 20),
            velocity: Math.round(velocity * 10) / 10,
            burndown: Math.max(0, 20 - completed),
            teamMorale: Math.round(65 + Math.sin(i * 0.05) * 15 + Math.random() * 10)
        });
    }

    // Project info
    var project = {
        name: 'Project Phoenix',
        description: 'Next-generation enterprise platform',
        startDate: '2026-01-01',
        targetDate: '2026-02-15',
        currentSprint: 12,
        sprintStart: '2026-01-20',
        sprintEnd: '2026-02-02',
        methodology: 'Agile/Scrum',
        repository: 'github.com/company/phoenix',
        status: 'on-track'
    };

    // Activities
    var activities = [
        { id: 'a1', type: 'completed', user: 'Alice Martin', task: 'User Authentication Flow', timestamp: '2026-01-28T14:32:00', action: 'completed task' },
        { id: 'a2', type: 'comment', user: 'David Park', task: 'Dashboard UI Components', timestamp: '2026-01-28T13:15:00', action: 'commented on task' },
        { id: 'a3', type: 'created', user: 'Frank Lee', task: 'API Gateway Setup', timestamp: '2026-01-28T11:00:00', action: 'started working on task' },
        { id: 'a4', type: 'moved', user: 'Clara Chen', task: 'Mobile Responsive Design', timestamp: '2026-01-28T10:30:00', action: 'moved task to Review' },
        { id: 'a5', type: 'comment', user: 'Emma Wilson', task: 'Security Audit', timestamp: '2026-01-27T16:45:00', action: 'marked task as blocked' },
        { id: 'a6', type: 'completed', user: 'Frank Lee', task: 'CI/CD Pipeline', timestamp: '2026-01-27T15:20:00', action: 'completed task' },
        { id: 'a7', type: 'assigned', user: 'David Park', task: 'Performance Optimization', timestamp: '2026-01-27T11:00:00', action: 'assigned task to Grace Kim' },
        { id: 'a8', type: 'created', user: 'David Park', task: null, timestamp: '2026-01-20T09:00:00', action: 'started Sprint 12' },
        { id: 'a9', type: 'completed', user: 'Team', task: null, timestamp: '2026-01-15T10:00:00', action: 'reached milestone: Core Features Complete' },
        { id: 'a10', type: 'moved', user: 'David Park', task: 'Security Audit', timestamp: '2026-01-14T14:00:00', action: 'changed priority to Critical' }
    ];

    // Settings
    var settings = {
        useDemoData: true,
        autoSync: true,
        animations: true,
        compactMode: false,
        taskReminders: true,
        teamUpdates: true,
        theme: 'dark',
        language: 'en'
    };

    // ========================================================================
    // STATE STORE
    // ========================================================================
    var Store = {
        _listeners: [],
        _state: {
            tasks: tasks,
            collaborators: collaborators,
            financials: financials,
            history: history,
            project: project,
            activities: activities,
            settings: settings,
            activeView: 'dashboard',
            sidebarCollapsed: false,
            selectedTask: null,
            filters: {
                status: 'all',
                priority: 'all',
                assignee: 'all',
                category: 'all'
            }
        },

        getState: function() {
            return this._state;
        },

        setState: function(updates) {
            var self = this;
            Object.keys(updates).forEach(function(key) {
                self._state[key] = updates[key];
            });
            this._notify();
        },

        subscribe: function(listener) {
            this._listeners.push(listener);
            return function() {
                var idx = this._listeners.indexOf(listener);
                if (idx > -1) this._listeners.splice(idx, 1);
            }.bind(this);
        },

        _notify: function() {
            var state = this._state;
            this._listeners.forEach(function(listener) {
                listener(state);
            });
        },

        // Task actions
        updateTask: function(taskId, updates) {
            var tasks = this._state.tasks.map(function(t) {
                if (t.id === taskId) {
                    return Object.assign({}, t, updates);
                }
                return t;
            });
            this.setState({ tasks: tasks });
            this._addActivity('task_updated', updates.assignee || null, taskId, 'updated task');
        },

        moveTask: function(taskId, newStatus) {
            this.updateTask(taskId, { status: newStatus });
            this._addActivity('status_changed', null, taskId, 'moved to ' + newStatus);
        },

        addTask: function(task) {
            var newTask = Object.assign({
                id: 't' + (this._state.tasks.length + 1),
                progress: 0,
                spent: 0,
                comments: 0,
                dependencies: []
            }, task);
            var tasks = this._state.tasks.concat([newTask]);
            this.setState({ tasks: tasks });
            this._addActivity('task_created', task.assignee, newTask.id, 'created "' + task.title + '"');
            return newTask;
        },

        deleteTask: function(taskId) {
            var task = this._state.tasks.find(function(t) { return t.id === taskId; });
            var tasks = this._state.tasks.filter(function(t) { return t.id !== taskId; });
            this.setState({ tasks: tasks });
            if (task) {
                this._addActivity('task_deleted', null, null, 'deleted "' + task.title + '"');
            }
        },

        // Settings actions
        updateSettings: function(key, value) {
            var settings = Object.assign({}, this._state.settings);
            settings[key] = value;
            this.setState({ settings: settings });
        },

        // Filters
        setFilter: function(key, value) {
            var filters = Object.assign({}, this._state.filters);
            filters[key] = value;
            this.setState({ filters: filters });
        },

        // Activity log
        _addActivity: function(type, userId, taskId, message) {
            var activity = {
                id: 'a' + Date.now(),
                type: type,
                user: userId || 'c4',
                task: taskId,
                timestamp: new Date().toISOString(),
                message: message
            };
            var activities = [activity].concat(this._state.activities);
            this.setState({ activities: activities.slice(0, 50) });
        },

        // Helpers
        getCollaborator: function(id) {
            return this._state.collaborators.find(function(c) { return c.id === id; });
        },

        getTask: function(id) {
            return this._state.tasks.find(function(t) { return t.id === id; });
        },

        getFilteredTasks: function() {
            var filters = this._state.filters;
            return this._state.tasks.filter(function(t) {
                if (filters.status !== 'all' && t.status !== filters.status) return false;
                if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
                if (filters.assignee !== 'all' && t.assignee !== filters.assignee) return false;
                if (filters.category !== 'all' && t.category !== filters.category) return false;
                return true;
            });
        },

        // Metrics
        getMetrics: function() {
            var tasks = this._state.tasks;
            var completedTasks = tasks.filter(function(t) { return t.status === 'done'; }).length;
            var inProgressTasks = tasks.filter(function(t) { return t.status === 'in-progress'; }).length;
            var blockedTasks = tasks.filter(function(t) { return t.status === 'blocked'; }).length;
            var reviewTasks = tasks.filter(function(t) { return t.status === 'review'; }).length;
            var todoTasks = tasks.filter(function(t) { return t.status === 'todo'; }).length;
            var backlogTasks = tasks.filter(function(t) { return t.status === 'backlog'; }).length;
            var totalTasks = tasks.length;
            
            var totalEstimate = tasks.reduce(function(sum, t) { return sum + (t.estimate || 0); }, 0);
            var totalSpent = tasks.reduce(function(sum, t) { return sum + (t.spent || 0); }, 0);

            var overloadedMembers = this._state.collaborators.filter(function(c) { 
                return c.workload > 100; 
            }).length;

            var completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            // Average velocity from history
            var recentHistory = this._state.history.slice(-14);
            var avgVelocity = recentHistory.reduce(function(sum, h) { return sum + h.velocity; }, 0) / recentHistory.length;

            return {
                totalTasks: totalTasks,
                completed: completedTasks,
                inProgress: inProgressTasks,
                blocked: blockedTasks,
                review: reviewTasks,
                completionRate: completionRate,
                totalEstimate: totalEstimate,
                totalSpent: totalSpent,
                overloadedMembers: overloadedMembers,
                avgVelocity: Math.round(avgVelocity * 10) / 10,
                tasksByStatus: {
                    backlog: backlogTasks,
                    todo: todoTasks,
                    'in-progress': inProgressTasks,
                    review: reviewTasks,
                    done: completedTasks,
                    blocked: blockedTasks
                }
            };
        },

        resetSettings: function() {
            this.setState({
                settings: {
                    useDemoData: true,
                    autoSync: true,
                    animations: true,
                    compactMode: false,
                    darkMode: true,
                    notifications: true,
                    emailDigest: false,
                    soundEnabled: true,
                    kanbanDragEnabled: true,
                    showProgress: true,
                    showAssignee: true,
                    theme: 'dark',
                    language: 'en'
                }
            });
        }
    };

    // Export
    global.Store = Store;
    global.DemoData = {
        tasks: tasks,
        collaborators: collaborators,
        financials: financials,
        history: history,
        project: project,
        activities: activities
    };

})(window);
