/**
 * Project Hub - Ultimate AI Dashboard
 * EZGalaxy Catalog Application
 * 
 * Ultra-modern project management dashboard with:
 * - Smart Kanban with drag-and-drop
 * - Interactive Gantt Chart
 * - Resource Workload Matrix
 * - AI Predictions & Time-Traveler
 * - Risk Analyzer & Heat Maps
 * - Sentiment Score
 * - Budget Tracking
 * - Team Analytics
 * - Activity Timeline
 * - Custom Charts & Visualizations
 */

var useState = React.useState;
var useEffect = React.useEffect;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var useRef = React.useRef;

// ============================================================================
// CONFIGURATION
// ============================================================================
var CONFIG = {
    EXTENSION_ID: 'com.ezgalaxy.projecthub',
    SYNC_DEBOUNCE: 1500
};

// ============================================================================
// DEMO DATA GENERATOR
// ============================================================================
function generateDemoData() {
    var now = new Date();
    var currentMonth = now.getMonth();
    var currentYear = now.getFullYear();

    // 8 Team Members
    var collaborators = [
        { id: 'c1', name: 'Alice Martin', role: 'Lead Developer', avatar: '👩‍💻', skills: ['React', 'Node.js', 'TypeScript'], capacity: 40, currentLoad: 38, status: 'active', color: '#00d4ff' },
        { id: 'c2', name: 'Bob Johnson', role: 'Senior Developer', avatar: '👨‍💻', skills: ['Python', 'Django', 'PostgreSQL'], capacity: 40, currentLoad: 45, status: 'overloaded', color: '#a855f7' },
        { id: 'c3', name: 'Clara Chen', role: 'UX Designer', avatar: '👩‍🎨', skills: ['Figma', 'Prototyping', 'Research'], capacity: 40, currentLoad: 32, status: 'active', color: '#ec4899' },
        { id: 'c4', name: 'David Park', role: 'Project Manager', avatar: '👨‍💼', skills: ['Agile', 'Scrum', 'Planning'], capacity: 40, currentLoad: 35, status: 'active', color: '#22c55e' },
        { id: 'c5', name: 'Emma Wilson', role: 'QA Engineer', avatar: '👩‍🔬', skills: ['Testing', 'Automation', 'CI/CD'], capacity: 40, currentLoad: 28, status: 'available', color: '#facc15' },
        { id: 'c6', name: 'Frank Lee', role: 'DevOps Engineer', avatar: '👨‍🔧', skills: ['Docker', 'Kubernetes', 'AWS'], capacity: 40, currentLoad: 42, status: 'busy', color: '#f97316' },
        { id: 'c7', name: 'Grace Kim', role: 'Frontend Developer', avatar: '👩‍💻', skills: ['Vue.js', 'CSS', 'Animation'], capacity: 40, currentLoad: 36, status: 'active', color: '#0ea5a4' },
        { id: 'c8', name: 'Henry Brown', role: 'Backend Developer', avatar: '👨‍💻', skills: ['Java', 'Spring', 'MongoDB'], capacity: 40, currentLoad: 30, status: 'available', color: '#8b5cf6' }
    ];

    // Task priorities and statuses
    var priorities = ['critical', 'high', 'medium', 'low'];
    var statuses = ['backlog', 'todo', 'in-progress', 'review', 'done'];
    var categories = ['feature', 'bugfix', 'improvement', 'documentation', 'testing', 'devops'];

    // 32 Tasks
    var tasks = [
        { id: 't1', title: 'Design System Implementation', description: 'Create comprehensive design tokens and components', status: 'done', priority: 'high', category: 'feature', assignee: 'c3', estimate: 24, spent: 22, startDate: '2026-01-05', endDate: '2026-01-12', progress: 100, dependencies: [] },
        { id: 't2', title: 'User Authentication Flow', description: 'Implement OAuth2 with JWT tokens', status: 'done', priority: 'critical', category: 'feature', assignee: 'c1', estimate: 32, spent: 35, startDate: '2026-01-08', endDate: '2026-01-15', progress: 100, dependencies: [] },
        { id: 't3', title: 'Database Schema Design', description: 'Design and optimize PostgreSQL schema', status: 'done', priority: 'high', category: 'feature', assignee: 'c2', estimate: 16, spent: 14, startDate: '2026-01-06', endDate: '2026-01-10', progress: 100, dependencies: [] },
        { id: 't4', title: 'API Gateway Setup', description: 'Configure Kong API gateway with rate limiting', status: 'in-progress', priority: 'high', category: 'devops', assignee: 'c6', estimate: 20, spent: 12, startDate: '2026-01-18', endDate: '2026-01-25', progress: 60, dependencies: ['t3'] },
        { id: 't5', title: 'Dashboard UI Components', description: 'Build reusable chart and card components', status: 'in-progress', priority: 'high', category: 'feature', assignee: 'c7', estimate: 40, spent: 28, startDate: '2026-01-15', endDate: '2026-01-28', progress: 70, dependencies: ['t1'] },
        { id: 't6', title: 'Real-time Notifications', description: 'WebSocket-based notification system', status: 'in-progress', priority: 'medium', category: 'feature', assignee: 'c1', estimate: 24, spent: 8, startDate: '2026-01-20', endDate: '2026-01-30', progress: 35, dependencies: ['t2'] },
        { id: 't7', title: 'Unit Test Coverage', description: 'Achieve 80% test coverage for core modules', status: 'in-progress', priority: 'medium', category: 'testing', assignee: 'c5', estimate: 32, spent: 18, startDate: '2026-01-12', endDate: '2026-01-28', progress: 55, dependencies: [] },
        { id: 't8', title: 'Performance Optimization', description: 'Optimize bundle size and lazy loading', status: 'todo', priority: 'medium', category: 'improvement', assignee: 'c7', estimate: 16, spent: 0, startDate: '2026-01-28', endDate: '2026-02-02', progress: 0, dependencies: ['t5'] },
        { id: 't9', title: 'Mobile Responsive Design', description: 'Ensure full mobile compatibility', status: 'review', priority: 'high', category: 'feature', assignee: 'c3', estimate: 24, spent: 22, startDate: '2026-01-18', endDate: '2026-01-26', progress: 90, dependencies: ['t1', 't5'] },
        { id: 't10', title: 'CI/CD Pipeline', description: 'Setup GitHub Actions with staging deploy', status: 'done', priority: 'high', category: 'devops', assignee: 'c6', estimate: 16, spent: 18, startDate: '2026-01-10', endDate: '2026-01-14', progress: 100, dependencies: [] },
        { id: 't11', title: 'Error Handling System', description: 'Global error boundary and logging', status: 'in-progress', priority: 'medium', category: 'improvement', assignee: 'c8', estimate: 12, spent: 6, startDate: '2026-01-22', endDate: '2026-01-28', progress: 50, dependencies: [] },
        { id: 't12', title: 'Analytics Integration', description: 'Integrate Mixpanel and custom events', status: 'todo', priority: 'low', category: 'feature', assignee: 'c1', estimate: 8, spent: 0, startDate: '2026-02-01', endDate: '2026-02-04', progress: 0, dependencies: ['t2'] },
        { id: 't13', title: 'Documentation Update', description: 'Update API docs and README', status: 'in-progress', priority: 'low', category: 'documentation', assignee: 'c4', estimate: 8, spent: 4, startDate: '2026-01-24', endDate: '2026-01-28', progress: 50, dependencies: [] },
        { id: 't14', title: 'Security Audit', description: 'Perform security review and fix vulnerabilities', status: 'blocked', priority: 'critical', category: 'testing', assignee: 'c5', estimate: 24, spent: 4, startDate: '2026-01-26', endDate: '2026-02-02', progress: 15, dependencies: ['t2', 't4'], blockedReason: 'Waiting for API Gateway completion' },
        { id: 't15', title: 'User Profile Management', description: 'Profile editing and avatar upload', status: 'todo', priority: 'medium', category: 'feature', assignee: 'c7', estimate: 16, spent: 0, startDate: '2026-02-02', endDate: '2026-02-06', progress: 0, dependencies: ['t2'] },
        { id: 't16', title: 'Email Notification Service', description: 'Transactional emails with SendGrid', status: 'backlog', priority: 'medium', category: 'feature', assignee: 'c8', estimate: 12, spent: 0, startDate: null, endDate: null, progress: 0, dependencies: [] },
        { id: 't17', title: 'Dark Mode Support', description: 'Implement theme switching', status: 'done', priority: 'low', category: 'feature', assignee: 'c3', estimate: 8, spent: 6, startDate: '2026-01-14', endDate: '2026-01-16', progress: 100, dependencies: ['t1'] },
        { id: 't18', title: 'Search Functionality', description: 'Full-text search with Elasticsearch', status: 'todo', priority: 'high', category: 'feature', assignee: 'c2', estimate: 24, spent: 0, startDate: '2026-01-30', endDate: '2026-02-06', progress: 0, dependencies: ['t3'] },
        { id: 't19', title: 'Export to PDF/CSV', description: 'Report generation and export', status: 'backlog', priority: 'low', category: 'feature', assignee: 'c1', estimate: 12, spent: 0, startDate: null, endDate: null, progress: 0, dependencies: [] },
        { id: 't20', title: 'Keyboard Shortcuts', description: 'Power user keyboard navigation', status: 'backlog', priority: 'low', category: 'improvement', assignee: 'c7', estimate: 8, spent: 0, startDate: null, endDate: null, progress: 0, dependencies: [] },
        { id: 't21', title: 'Activity Feed', description: 'Team activity timeline', status: 'in-progress', priority: 'medium', category: 'feature', assignee: 'c8', estimate: 16, spent: 10, startDate: '2026-01-22', endDate: '2026-01-30', progress: 60, dependencies: [] },
        { id: 't22', title: 'Role-based Access Control', description: 'Implement RBAC system', status: 'review', priority: 'critical', category: 'feature', assignee: 'c2', estimate: 32, spent: 30, startDate: '2026-01-12', endDate: '2026-01-24', progress: 95, dependencies: ['t2'] },
        { id: 't23', title: 'Backup System', description: 'Automated database backups', status: 'done', priority: 'high', category: 'devops', assignee: 'c6', estimate: 8, spent: 10, startDate: '2026-01-08', endDate: '2026-01-10', progress: 100, dependencies: [] },
        { id: 't24', title: 'Load Testing', description: 'Performance load testing with k6', status: 'todo', priority: 'medium', category: 'testing', assignee: 'c5', estimate: 12, spent: 0, startDate: '2026-02-03', endDate: '2026-02-06', progress: 0, dependencies: ['t4'] },
        { id: 't25', title: 'Onboarding Flow', description: 'New user onboarding wizard', status: 'blocked', priority: 'medium', category: 'feature', assignee: 'c3', estimate: 20, spent: 2, startDate: '2026-01-28', endDate: '2026-02-04', progress: 10, dependencies: ['t9'], blockedReason: 'Design review pending' },
        { id: 't26', title: 'Webhooks System', description: 'External webhook integrations', status: 'backlog', priority: 'medium', category: 'feature', assignee: 'c2', estimate: 16, spent: 0, startDate: null, endDate: null, progress: 0, dependencies: [] },
        { id: 't27', title: 'Data Migration Tool', description: 'Import from legacy systems', status: 'todo', priority: 'high', category: 'feature', assignee: 'c8', estimate: 24, spent: 0, startDate: '2026-02-01', endDate: '2026-02-08', progress: 0, dependencies: ['t3'] },
        { id: 't28', title: 'Localization (i18n)', description: 'Multi-language support', status: 'backlog', priority: 'low', category: 'feature', assignee: 'c7', estimate: 20, spent: 0, startDate: null, endDate: null, progress: 0, dependencies: [] },
        { id: 't29', title: 'Audit Logging', description: 'Track all user actions', status: 'in-progress', priority: 'high', category: 'feature', assignee: 'c2', estimate: 16, spent: 8, startDate: '2026-01-24', endDate: '2026-01-30', progress: 50, dependencies: ['t22'] },
        { id: 't30', title: 'Rate Limiting', description: 'API rate limiting implementation', status: 'review', priority: 'high', category: 'devops', assignee: 'c6', estimate: 8, spent: 7, startDate: '2026-01-22', endDate: '2026-01-25', progress: 85, dependencies: ['t4'] },
        { id: 't31', title: 'SSO Integration', description: 'SAML/OIDC single sign-on', status: 'backlog', priority: 'medium', category: 'feature', assignee: 'c1', estimate: 24, spent: 0, startDate: null, endDate: null, progress: 0, dependencies: ['t2'] },
        { id: 't32', title: 'Monitoring Dashboard', description: 'Grafana monitoring setup', status: 'todo', priority: 'medium', category: 'devops', assignee: 'c6', estimate: 12, spent: 0, startDate: '2026-02-04', endDate: '2026-02-08', progress: 0, dependencies: ['t10'] }
    ];

    // Financial data
    var financials = {
        totalBudget: 250000,
        spent: 147500,
        committed: 45000,
        remaining: 57500,
        burnRate: 12500,
        projectedOverrun: 15000,
        categories: [
            { name: 'Development', budget: 120000, spent: 78000, color: '#00d4ff' },
            { name: 'Design', budget: 40000, spent: 28000, color: '#a855f7' },
            { name: 'Infrastructure', budget: 35000, spent: 22500, color: '#22c55e' },
            { name: 'Testing', budget: 25000, spent: 12000, color: '#facc15' },
            { name: 'Management', budget: 30000, spent: 7000, color: '#ec4899' }
        ],
        monthly: [
            { month: 'Nov', planned: 35000, actual: 32000 },
            { month: 'Dec', planned: 40000, actual: 45000 },
            { month: 'Jan', planned: 45000, actual: 52000 },
            { month: 'Feb', planned: 42000, actual: 0 },
            { month: 'Mar', planned: 38000, actual: 0 }
        ]
    };

    // Historical metrics (90 days)
    var history = [];
    for (var i = 90; i >= 0; i--) {
        var date = new Date(now);
        date.setDate(date.getDate() - i);
        var completed = Math.floor(5 + (90 - i) * 0.3 + Math.random() * 2);
        var velocity = 2 + Math.sin(i * 0.1) * 1.5 + Math.random();
        history.push({
            date: date.toISOString().split('T')[0],
            tasksCompleted: Math.min(completed, 32),
            velocity: Math.round(velocity * 10) / 10,
            burndown: Math.max(0, 32 - completed),
            teamMorale: 65 + Math.sin(i * 0.05) * 15 + Math.random() * 10
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

    // Activity log
    var activities = [
        { id: 'a1', type: 'task_completed', user: 'c1', task: 't2', timestamp: '2026-01-28T14:32:00', message: 'completed "User Authentication Flow"' },
        { id: 'a2', type: 'comment', user: 'c4', task: 't5', timestamp: '2026-01-28T13:15:00', message: 'added comment on "Dashboard UI Components"' },
        { id: 'a3', type: 'task_started', user: 'c6', task: 't4', timestamp: '2026-01-28T11:00:00', message: 'started working on "API Gateway Setup"' },
        { id: 'a4', type: 'review_requested', user: 'c3', task: 't9', timestamp: '2026-01-28T10:30:00', message: 'requested review for "Mobile Responsive Design"' },
        { id: 'a5', type: 'blocked', user: 'c5', task: 't14', timestamp: '2026-01-27T16:45:00', message: 'marked "Security Audit" as blocked' },
        { id: 'a6', type: 'task_completed', user: 'c6', task: 't10', timestamp: '2026-01-27T15:20:00', message: 'completed "CI/CD Pipeline"' },
        { id: 'a7', type: 'sprint_started', user: 'c4', task: null, timestamp: '2026-01-20T09:00:00', message: 'started Sprint 12' },
        { id: 'a8', type: 'milestone', user: 'c4', task: null, timestamp: '2026-01-15T10:00:00', message: 'reached milestone: Core Features Complete' }
    ];

    return {
        collaborators: collaborators,
        tasks: tasks,
        financials: financials,
        history: history,
        project: project,
        activities: activities
    };
}

var DEMO_DATA = generateDemoData();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function formatCurrency(amount) {
    return '$' + amount.toLocaleString();
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    var date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    var date = new Date(dateStr);
    return date.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function calculateDaysRemaining(targetDate) {
    var target = new Date(targetDate);
    var now = new Date();
    var diff = target - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getStatusColor(status) {
    var colors = {
        'backlog': '#6b7280',
        'todo': '#00d4ff',
        'in-progress': '#a855f7',
        'review': '#facc15',
        'done': '#22c55e',
        'blocked': '#ef4444'
    };
    return colors[status] || '#6b7280';
}

function getPriorityColor(priority) {
    var colors = {
        'critical': '#ef4444',
        'high': '#f97316',
        'medium': '#facc15',
        'low': '#22c55e'
    };
    return colors[priority] || '#6b7280';
}

// ============================================================================
// CHART COMPONENTS (Custom SVG)
// ============================================================================

// Circular Progress Chart
function CircularProgress(props) {
    var value = props.value || 0;
    var max = props.max || 100;
    var size = props.size || 120;
    var strokeWidth = props.strokeWidth || 8;
    var color = props.color || '#00d4ff';
    var label = props.label;
    var sublabel = props.sublabel;

    var radius = (size - strokeWidth) / 2;
    var circumference = 2 * Math.PI * radius;
    var progress = (value / max) * circumference;
    var offset = circumference - progress;

    return React.createElement('div', { className: 'circular-progress', style: { width: size, height: size } },
        React.createElement('svg', { width: size, height: size, viewBox: '0 0 ' + size + ' ' + size },
            React.createElement('circle', {
                cx: size / 2,
                cy: size / 2,
                r: radius,
                fill: 'none',
                stroke: 'rgba(255,255,255,0.1)',
                strokeWidth: strokeWidth
            }),
            React.createElement('circle', {
                cx: size / 2,
                cy: size / 2,
                r: radius,
                fill: 'none',
                stroke: color,
                strokeWidth: strokeWidth,
                strokeLinecap: 'round',
                strokeDasharray: circumference,
                strokeDashoffset: offset,
                style: { transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1s ease' }
            }),
            React.createElement('text', {
                x: size / 2,
                y: size / 2 - 5,
                textAnchor: 'middle',
                fill: '#fff',
                fontSize: size * 0.22,
                fontWeight: 'bold'
            }, Math.round(value)),
            sublabel && React.createElement('text', {
                x: size / 2,
                y: size / 2 + 15,
                textAnchor: 'middle',
                fill: 'rgba(255,255,255,0.6)',
                fontSize: size * 0.1
            }, sublabel)
        ),
        label && React.createElement('div', { className: 'circular-progress-label' }, label)
    );
}

// Line/Area Chart
function LineChart(props) {
    var data = props.data || [];
    var width = props.width || 400;
    var height = props.height || 200;
    var lines = props.lines || [];
    var showGrid = props.showGrid !== false;
    var showDots = props.showDots !== false;
    var areaFill = props.areaFill;

    if (data.length === 0) return React.createElement('div', { className: 'chart-empty' }, 'No data');

    var padding = { top: 20, right: 20, bottom: 30, left: 50 };
    var chartWidth = width - padding.left - padding.right;
    var chartHeight = height - padding.top - padding.bottom;

    // Calculate bounds
    var allValues = [];
    lines.forEach(function(line) {
        data.forEach(function(d) {
            if (typeof d[line.dataKey] === 'number') allValues.push(d[line.dataKey]);
        });
    });
    var minY = Math.min.apply(null, allValues.length ? allValues : [0]) * 0.9;
    var maxY = Math.max.apply(null, allValues.length ? allValues : [100]) * 1.1;

    var xScale = function(i) { return padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth; };
    var yScale = function(v) { return padding.top + chartHeight - ((v - minY) / (maxY - minY || 1)) * chartHeight; };

    var elements = [];

    // Grid lines
    if (showGrid) {
        for (var i = 0; i <= 5; i++) {
            var y = padding.top + (i / 5) * chartHeight;
            elements.push(React.createElement('line', {
                key: 'grid-' + i,
                x1: padding.left,
                y1: y,
                x2: padding.left + chartWidth,
                y2: y,
                stroke: 'rgba(255,255,255,0.1)',
                strokeDasharray: '3 3'
            }));
        }
    }

    // Lines and areas
    lines.forEach(function(lineConfig, lineIndex) {
        var points = [];
        data.forEach(function(d, i) {
            var val = d[lineConfig.dataKey];
            if (typeof val === 'number') {
                points.push({ x: xScale(i), y: yScale(val), value: val });
            }
        });

        if (points.length === 0) return;

        var pathD = 'M' + points.map(function(p) { return p.x + ',' + p.y; }).join(' L');
        
        // Area fill
        if (areaFill || lineConfig.fill) {
            var areaD = pathD + ' L' + points[points.length - 1].x + ',' + (padding.top + chartHeight) + ' L' + points[0].x + ',' + (padding.top + chartHeight) + ' Z';
            elements.push(React.createElement('path', {
                key: 'area-' + lineIndex,
                d: areaD,
                fill: lineConfig.color || '#00d4ff',
                fillOpacity: 0.2
            }));
        }

        // Line
        elements.push(React.createElement('path', {
            key: 'line-' + lineIndex,
            d: pathD,
            fill: 'none',
            stroke: lineConfig.color || '#00d4ff',
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
        }));

        // Dots
        if (showDots && points.length <= 30) {
            points.forEach(function(p, pi) {
                elements.push(React.createElement('circle', {
                    key: 'dot-' + lineIndex + '-' + pi,
                    cx: p.x,
                    cy: p.y,
                    r: 4,
                    fill: lineConfig.color || '#00d4ff',
                    stroke: '#050810',
                    strokeWidth: 2
                }));
            });
        }
    });

    // X-axis labels
    var xLabels = [];
    var labelStep = Math.ceil(data.length / 6);
    data.forEach(function(d, i) {
        if (i % labelStep === 0 || i === data.length - 1) {
            xLabels.push(React.createElement('text', {
                key: 'xlabel-' + i,
                x: xScale(i),
                y: height - 8,
                textAnchor: 'middle',
                fill: 'rgba(255,255,255,0.5)',
                fontSize: 10
            }, d.label || d.date || d.name || ''));
        }
    });

    // Y-axis labels
    var yLabels = [];
    for (var i = 0; i <= 4; i++) {
        var val = minY + (i / 4) * (maxY - minY);
        yLabels.push(React.createElement('text', {
            key: 'ylabel-' + i,
            x: padding.left - 8,
            y: yScale(val) + 4,
            textAnchor: 'end',
            fill: 'rgba(255,255,255,0.5)',
            fontSize: 10
        }, Math.round(val)));
    }

    return React.createElement('svg', { 
        width: '100%', 
        height: height, 
        viewBox: '0 0 ' + width + ' ' + height,
        preserveAspectRatio: 'xMidYMid meet',
        className: 'chart-svg'
    }, elements.concat(xLabels).concat(yLabels));
}

// Bar Chart
function BarChart(props) {
    var data = props.data || [];
    var width = props.width || 400;
    var height = props.height || 200;
    var dataKey = props.dataKey || 'value';
    var labelKey = props.labelKey || 'name';
    var color = props.color || '#00d4ff';
    var horizontal = props.horizontal;

    if (data.length === 0) return React.createElement('div', { className: 'chart-empty' }, 'No data');

    var padding = { top: 20, right: 20, bottom: 40, left: horizontal ? 100 : 50 };
    var chartWidth = width - padding.left - padding.right;
    var chartHeight = height - padding.top - padding.bottom;

    var maxVal = Math.max.apply(null, data.map(function(d) { return d[dataKey] || 0; })) || 1;

    var elements = [];

    if (horizontal) {
        var barHeight = (chartHeight / data.length) * 0.7;
        var barGap = (chartHeight / data.length) * 0.3;

        data.forEach(function(d, i) {
            var val = d[dataKey] || 0;
            var barWidth = (val / maxVal) * chartWidth;
            var y = padding.top + i * (barHeight + barGap);
            var barColor = d.color || color;

            elements.push(React.createElement('rect', {
                key: 'bar-' + i,
                x: padding.left,
                y: y,
                width: barWidth,
                height: barHeight,
                fill: barColor,
                rx: 4,
                opacity: 0.8,
                style: { transition: 'width 0.5s ease' }
            }));

            elements.push(React.createElement('text', {
                key: 'label-' + i,
                x: padding.left - 8,
                y: y + barHeight / 2 + 4,
                textAnchor: 'end',
                fill: 'rgba(255,255,255,0.7)',
                fontSize: 11
            }, d[labelKey] || ''));

            elements.push(React.createElement('text', {
                key: 'value-' + i,
                x: padding.left + barWidth + 8,
                y: y + barHeight / 2 + 4,
                textAnchor: 'start',
                fill: barColor,
                fontSize: 11,
                fontWeight: 'bold'
            }, val.toLocaleString()));
        });
    } else {
        var barWidth = (chartWidth / data.length) * 0.6;
        var barGap = (chartWidth / data.length) * 0.4;

        data.forEach(function(d, i) {
            var val = d[dataKey] || 0;
            var barHeight = (val / maxVal) * chartHeight;
            var x = padding.left + i * (barWidth + barGap) + barGap / 2;
            var barColor = d.color || color;

            elements.push(React.createElement('rect', {
                key: 'bar-' + i,
                x: x,
                y: padding.top + chartHeight - barHeight,
                width: barWidth,
                height: barHeight,
                fill: barColor,
                rx: 4,
                opacity: 0.8,
                style: { transition: 'height 0.5s ease' }
            }));

            elements.push(React.createElement('text', {
                key: 'label-' + i,
                x: x + barWidth / 2,
                y: height - 8,
                textAnchor: 'middle',
                fill: 'rgba(255,255,255,0.7)',
                fontSize: 10
            }, d[labelKey] || ''));
        });
    }

    return React.createElement('svg', { 
        width: '100%', 
        height: height, 
        viewBox: '0 0 ' + width + ' ' + height,
        preserveAspectRatio: 'xMidYMid meet',
        className: 'chart-svg'
    }, elements);
}

// Donut/Pie Chart
function DonutChart(props) {
    var data = props.data || [];
    var size = props.size || 200;
    var donutWidth = props.donutWidth || 30;
    var showLabels = props.showLabels !== false;
    var centerLabel = props.centerLabel;
    var centerValue = props.centerValue;

    if (data.length === 0) return React.createElement('div', { className: 'chart-empty' }, 'No data');

    var total = data.reduce(function(sum, d) { return sum + (d.value || 0); }, 0);
    var radius = (size - donutWidth) / 2;
    var innerRadius = radius - donutWidth;
    var centerX = size / 2;
    var centerY = size / 2;

    var elements = [];
    var currentAngle = -Math.PI / 2;

    data.forEach(function(d, i) {
        var value = d.value || 0;
        var angle = (value / (total || 1)) * Math.PI * 2;
        var startAngle = currentAngle;
        var endAngle = currentAngle + angle;
        currentAngle = endAngle;

        var x1 = centerX + Math.cos(startAngle) * radius;
        var y1 = centerY + Math.sin(startAngle) * radius;
        var x2 = centerX + Math.cos(endAngle) * radius;
        var y2 = centerY + Math.sin(endAngle) * radius;
        var x3 = centerX + Math.cos(endAngle) * innerRadius;
        var y3 = centerY + Math.sin(endAngle) * innerRadius;
        var x4 = centerX + Math.cos(startAngle) * innerRadius;
        var y4 = centerY + Math.sin(startAngle) * innerRadius;

        var largeArc = angle > Math.PI ? 1 : 0;
        var pathD = 'M' + x1 + ',' + y1 + ' A' + radius + ',' + radius + ' 0 ' + largeArc + ' 1 ' + x2 + ',' + y2 + 
                    ' L' + x3 + ',' + y3 + ' A' + innerRadius + ',' + innerRadius + ' 0 ' + largeArc + ' 0 ' + x4 + ',' + y4 + ' Z';

        elements.push(React.createElement('path', {
            key: 'slice-' + i,
            d: pathD,
            fill: d.color || '#00d4ff',
            stroke: '#050810',
            strokeWidth: 2,
            style: { transition: 'opacity 0.3s' },
            opacity: 0.85
        }));
    });

    // Center text
    if (centerLabel || centerValue) {
        elements.push(React.createElement('text', {
            key: 'center-value',
            x: centerX,
            y: centerY - 5,
            textAnchor: 'middle',
            fill: '#fff',
            fontSize: 24,
            fontWeight: 'bold'
        }, centerValue || ''));
        elements.push(React.createElement('text', {
            key: 'center-label',
            x: centerX,
            y: centerY + 18,
            textAnchor: 'middle',
            fill: 'rgba(255,255,255,0.6)',
            fontSize: 12
        }, centerLabel || ''));
    }

    return React.createElement('div', { className: 'donut-chart-container' },
        React.createElement('svg', { 
            width: size, 
            height: size, 
            viewBox: '0 0 ' + size + ' ' + size,
            className: 'chart-svg'
        }, elements),
        showLabels && React.createElement('div', { className: 'donut-legend' },
            data.map(function(d, i) {
                return React.createElement('div', { key: i, className: 'legend-item' },
                    React.createElement('span', { 
                        className: 'legend-color', 
                        style: { backgroundColor: d.color || '#00d4ff' } 
                    }),
                    React.createElement('span', { className: 'legend-label' }, d.name),
                    React.createElement('span', { className: 'legend-value' }, Math.round((d.value / total) * 100) + '%')
                );
            })
        )
    );
}

// Sparkline
function Sparkline(props) {
    var data = props.data || [];
    var width = props.width || 100;
    var height = props.height || 30;
    var color = props.color || '#00d4ff';
    var showArea = props.showArea;

    if (data.length < 2) return null;

    var min = Math.min.apply(null, data);
    var max = Math.max.apply(null, data);
    var range = max - min || 1;

    var points = data.map(function(v, i) {
        var x = (i / (data.length - 1)) * width;
        var y = height - ((v - min) / range) * (height - 4) - 2;
        return x + ',' + y;
    }).join(' L');

    var pathD = 'M' + points;
    var areaD = pathD + ' L' + width + ',' + height + ' L0,' + height + ' Z';

    return React.createElement('svg', { width: width, height: height, className: 'sparkline' },
        showArea && React.createElement('path', { d: areaD, fill: color, fillOpacity: 0.2 }),
        React.createElement('path', { d: pathD, fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' })
    );
}

// Progress Bar
function ProgressBar(props) {
    var value = props.value || 0;
    var max = props.max || 100;
    var color = props.color || '#00d4ff';
    var height = props.height || 8;
    var showLabel = props.showLabel;
    var label = props.label;
    var animated = props.animated !== false;

    var percentage = Math.min((value / max) * 100, 100);

    return React.createElement('div', { className: 'progress-bar-container' },
        (showLabel || label) && React.createElement('div', { className: 'progress-bar-header' },
            React.createElement('span', { className: 'progress-label' }, label || ''),
            React.createElement('span', { className: 'progress-value' }, Math.round(percentage) + '%')
        ),
        React.createElement('div', { 
            className: 'progress-bar-track', 
            style: { height: height } 
        },
            React.createElement('div', { 
                className: 'progress-bar-fill' + (animated ? ' animated' : ''), 
                style: { 
                    width: percentage + '%', 
                    backgroundColor: color,
                    height: height
                } 
            })
        )
    );
}

// ============================================================================
// GLASS CARD COMPONENT
// ============================================================================
function GlassCard(props) {
    var className = 'glass-card ' + (props.className || '');
    var delay = props.delay || 0;
    var noPadding = props.noPadding;
    var onClick = props.onClick;
    var style = props.style || {};

    if (noPadding) style.padding = 0;

    return React.createElement(motion.div, {
        className: className,
        style: style,
        onClick: onClick,
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, delay: delay },
        whileHover: onClick ? { scale: 1.02, y: -2 } : null
    }, props.children);
}

// ============================================================================
// ICON COMPONENT
// ============================================================================
function Icon(props) {
    var name = props.name || '';
    var size = props.size || 20;
    var color = props.color || 'currentColor';
    var className = props.className || '';

    // Convert kebab-case to PascalCase
    var componentName = name.split('-').map(function(s) { 
        return s.charAt(0).toUpperCase() + s.slice(1); 
    }).join('');

    var IconComponent = (window.LucideIcons && window.LucideIcons[componentName]) || window[componentName];

    if (IconComponent) {
        return React.createElement(IconComponent, { 
            size: size, 
            color: color,
            className: 'icon ' + className 
        });
    }

    // Fallback emoji icons
    var emojis = {
        'dashboard': '📊', 'kanban': '📋', 'gantt': '📅', 'users': '👥',
        'chart': '📈', 'settings': '⚙️', 'brain': '🧠', 'alert': '⚠️',
        'check': '✅', 'clock': '⏰', 'calendar': '📆', 'star': '⭐',
        'rocket': '🚀', 'target': '🎯', 'fire': '🔥', 'trending-up': '📈',
        'trending-down': '📉', 'plus': '➕', 'x': '✖️', 'refresh': '🔄',
        'save': '💾', 'filter': '🔍', 'search': '🔎', 'bell': '🔔',
        'mail': '📧', 'folder': '📁', 'file': '📄', 'download': '⬇️',
        'upload': '⬆️', 'link': '🔗', 'lock': '🔒', 'unlock': '🔓',
        'eye': '👁️', 'edit': '✏️', 'trash': '🗑️', 'copy': '📋',
        'activity': '📊', 'zap': '⚡', 'layers': '📚', 'grid': '▦',
        'list': '📝', 'menu': '☰', 'more': '⋯', 'play': '▶️',
        'pause': '⏸️', 'dollar': '💵', 'percent': '%', 'home': '🏠'
    };

    var emoji = emojis[name] || emojis[name.split('-')[0]] || '•';
    return React.createElement('span', { 
        className: 'icon emoji-icon ' + className,
        style: { fontSize: size * 0.9, lineHeight: 1 }
    }, emoji);
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================
function StatCard(props) {
    var title = props.title;
    var value = props.value;
    var subtitle = props.subtitle;
    var icon = props.icon;
    var color = props.color || '#00d4ff';
    var trend = props.trend;
    var trendValue = props.trendValue;
    var sparklineData = props.sparklineData;
    var delay = props.delay || 0;
    var large = props.large;
    var onClick = props.onClick;

    return React.createElement(GlassCard, { 
        className: 'stat-card' + (large ? ' large' : '') + (onClick ? ' clickable' : ''),
        delay: delay,
        onClick: onClick
    },
        React.createElement('div', { className: 'stat-card-header' },
            React.createElement('span', { className: 'stat-card-title' }, title),
            icon && React.createElement('div', { 
                className: 'stat-card-icon',
                style: { color: color }
            }, React.createElement(Icon, { name: icon, size: 20 }))
        ),
        React.createElement('div', { className: 'stat-card-value', style: { color: color } }, value),
        (subtitle || trend !== undefined) && React.createElement('div', { className: 'stat-card-footer' },
            subtitle && React.createElement('span', { className: 'stat-card-subtitle' }, subtitle),
            trend !== undefined && React.createElement('span', { 
                className: 'stat-card-trend ' + (trend >= 0 ? 'positive' : 'negative')
            },
                React.createElement(Icon, { name: trend >= 0 ? 'trending-up' : 'trending-down', size: 14 }),
                ' ' + Math.abs(trend) + '%'
            )
        ),
        sparklineData && React.createElement('div', { className: 'stat-card-sparkline' },
            React.createElement(Sparkline, { data: sparklineData, color: color, width: 120, height: 30, showArea: true })
        )
    );
}

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================
function Sidebar(props) {
    var activeView = props.activeView;
    var setActiveView = props.setActiveView;
    var collapsed = props.collapsed;
    var setCollapsed = props.setCollapsed;
    var project = props.project;

    var navItems = [
        { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
        { id: 'kanban', icon: 'kanban', label: 'Kanban Board' },
        { id: 'gantt', icon: 'gantt-chart', label: 'Timeline' },
        { id: 'team', icon: 'users', label: 'Team' },
        { id: 'budget', icon: 'pie-chart', label: 'Budget' },
        { id: 'analytics', icon: 'bar-chart-2', label: 'Analytics' },
        { id: 'activity', icon: 'activity', label: 'Activity' },
        { id: 'settings', icon: 'settings', label: 'Settings' }
    ];

    return React.createElement('aside', { className: 'sidebar' + (collapsed ? ' collapsed' : '') },
        React.createElement('div', { className: 'sidebar-header' },
            React.createElement('div', { className: 'sidebar-logo' },
                React.createElement('span', { className: 'logo-icon' }, '🚀'),
                !collapsed && React.createElement('span', { className: 'logo-text' }, 'Project Hub')
            ),
            React.createElement('button', { 
                className: 'sidebar-toggle',
                onClick: function() { setCollapsed(!collapsed); }
            }, collapsed ? '→' : '←')
        ),
        !collapsed && project && React.createElement('div', { className: 'sidebar-project' },
            React.createElement('div', { className: 'project-name' }, project.name),
            React.createElement('div', { className: 'project-sprint' }, 'Sprint ' + project.currentSprint)
        ),
        React.createElement('nav', { className: 'sidebar-nav' },
            navItems.map(function(item) {
                return React.createElement('button', {
                    key: item.id,
                    className: 'nav-item' + (activeView === item.id ? ' active' : ''),
                    onClick: function() { setActiveView(item.id); },
                    title: collapsed ? item.label : ''
                },
                    React.createElement(Icon, { name: item.icon, size: 20 }),
                    !collapsed && React.createElement('span', null, item.label)
                );
            })
        ),
        React.createElement('div', { className: 'sidebar-footer' },
            !collapsed && React.createElement('div', { className: 'sidebar-user' },
                React.createElement('span', { className: 'user-avatar' }, '👤'),
                React.createElement('div', { className: 'user-info' },
                    React.createElement('span', { className: 'user-name' }, 'Admin'),
                    React.createElement('span', { className: 'user-role' }, 'Project Owner')
                )
            )
        )
    );
}

// ============================================================================
// DASHBOARD VIEW
// ============================================================================
function DashboardView(props) {
    var tasks = props.tasks;
    var collaborators = props.collaborators;
    var financials = props.financials;
    var history = props.history;
    var project = props.project;
    var setActiveView = props.setActiveView;

    // Calculate metrics
    var completedTasks = tasks.filter(function(t) { return t.status === 'done'; }).length;
    var inProgressTasks = tasks.filter(function(t) { return t.status === 'in-progress'; }).length;
    var blockedTasks = tasks.filter(function(t) { return t.status === 'blocked'; }).length;
    var totalTasks = tasks.length;
    var progress = Math.round((completedTasks / totalTasks) * 100);

    var totalEstimate = tasks.reduce(function(sum, t) { return sum + (t.estimate || 0); }, 0);
    var totalSpent = tasks.reduce(function(sum, t) { return sum + (t.spent || 0); }, 0);

    var daysRemaining = calculateDaysRemaining(project.targetDate);
    var overloadedMembers = collaborators.filter(function(c) { return c.currentLoad > c.capacity; }).length;

    // Velocity data (last 14 days)
    var velocityData = history.slice(-14).map(function(h) {
        return { date: h.date.slice(5), velocity: h.velocity, completed: h.tasksCompleted };
    });

    // Task distribution by status
    var statusDistribution = [
        { name: 'Backlog', value: tasks.filter(function(t) { return t.status === 'backlog'; }).length, color: '#6b7280' },
        { name: 'To Do', value: tasks.filter(function(t) { return t.status === 'todo'; }).length, color: '#00d4ff' },
        { name: 'In Progress', value: inProgressTasks, color: '#a855f7' },
        { name: 'Review', value: tasks.filter(function(t) { return t.status === 'review'; }).length, color: '#facc15' },
        { name: 'Done', value: completedTasks, color: '#22c55e' },
        { name: 'Blocked', value: blockedTasks, color: '#ef4444' }
    ].filter(function(s) { return s.value > 0; });

    // Priority distribution
    var priorityData = [
        { name: 'Critical', value: tasks.filter(function(t) { return t.priority === 'critical'; }).length, color: '#ef4444' },
        { name: 'High', value: tasks.filter(function(t) { return t.priority === 'high'; }).length, color: '#f97316' },
        { name: 'Medium', value: tasks.filter(function(t) { return t.priority === 'medium'; }).length, color: '#facc15' },
        { name: 'Low', value: tasks.filter(function(t) { return t.priority === 'low'; }).length, color: '#22c55e' }
    ];

    // Budget data
    var budgetUsed = Math.round((financials.spent / financials.totalBudget) * 100);

    // Health score calculation
    var healthScore = Math.round(
        (progress * 0.3) + 
        ((1 - blockedTasks / totalTasks) * 30) + 
        ((1 - overloadedMembers / collaborators.length) * 20) + 
        ((financials.remaining > 0 ? 1 : 0) * 20)
    );

    var healthColor = healthScore >= 70 ? '#22c55e' : healthScore >= 50 ? '#facc15' : '#ef4444';
    var healthLabel = healthScore >= 70 ? 'Healthy' : healthScore >= 50 ? 'At Risk' : 'Critical';

    return React.createElement('div', { className: 'dashboard-view' },
        // Header Stats
        React.createElement('div', { className: 'stats-grid' },
            React.createElement(StatCard, {
                title: 'Project Progress',
                value: progress + '%',
                subtitle: completedTasks + ' of ' + totalTasks + ' tasks',
                icon: 'target',
                color: '#00d4ff',
                delay: 0.1,
                sparklineData: history.slice(-30).map(function(h) { return h.tasksCompleted; })
            }),
            React.createElement(GlassCard, { className: 'stat-card health-card', delay: 0.15 },
                React.createElement('div', { className: 'stat-card-header' },
                    React.createElement('span', { className: 'stat-card-title' }, 'Project Health'),
                    React.createElement(Icon, { name: 'activity', size: 20 })
                ),
                React.createElement(CircularProgress, {
                    value: healthScore,
                    max: 100,
                    size: 90,
                    strokeWidth: 8,
                    color: healthColor,
                    sublabel: healthLabel
                })
            ),
            React.createElement(StatCard, {
                title: 'Budget Status',
                value: formatCurrency(financials.spent),
                subtitle: 'of ' + formatCurrency(financials.totalBudget) + ' (' + budgetUsed + '%)',
                icon: 'pie-chart',
                color: budgetUsed > 80 ? '#ef4444' : budgetUsed > 60 ? '#facc15' : '#22c55e',
                delay: 0.2,
                onClick: function() { setActiveView('budget'); }
            }),
            React.createElement(StatCard, {
                title: 'Sprint ' + project.currentSprint,
                value: inProgressTasks,
                subtitle: 'tasks in progress',
                icon: 'zap',
                color: '#a855f7',
                delay: 0.25
            }),
            React.createElement(StatCard, {
                title: 'Blockers',
                value: blockedTasks,
                subtitle: blockedTasks > 0 ? 'need attention' : 'none',
                icon: 'alert-triangle',
                color: blockedTasks > 0 ? '#ef4444' : '#22c55e',
                delay: 0.3
            }),
            React.createElement(StatCard, {
                title: 'Deadline',
                value: daysRemaining + ' days',
                subtitle: formatDate(project.targetDate),
                icon: 'calendar',
                color: daysRemaining < 7 ? '#ef4444' : daysRemaining < 14 ? '#facc15' : '#00d4ff',
                delay: 0.35
            })
        ),

        // Charts Row
        React.createElement('div', { className: 'charts-row' },
            React.createElement(GlassCard, { className: 'chart-card wide', delay: 0.4 },
                React.createElement('div', { className: 'chart-header' },
                    React.createElement('h3', null,
                        React.createElement(Icon, { name: 'trending-up', size: 20 }),
                        ' Velocity Trend'
                    ),
                    React.createElement('div', { className: 'chart-legend' },
                        React.createElement('span', { className: 'legend-item' },
                            React.createElement('span', { className: 'legend-dot', style: { backgroundColor: '#00d4ff' } }),
                            'Velocity'
                        )
                    )
                ),
                React.createElement('div', { className: 'chart-body' },
                    React.createElement(LineChart, {
                        data: velocityData,
                        width: 600,
                        height: 200,
                        lines: [{ dataKey: 'velocity', color: '#00d4ff' }],
                        areaFill: true
                    })
                )
            ),
            React.createElement(GlassCard, { className: 'chart-card', delay: 0.45 },
                React.createElement('div', { className: 'chart-header' },
                    React.createElement('h3', null,
                        React.createElement(Icon, { name: 'pie-chart', size: 20 }),
                        ' Task Distribution'
                    )
                ),
                React.createElement('div', { className: 'chart-body centered' },
                    React.createElement(DonutChart, {
                        data: statusDistribution,
                        size: 180,
                        donutWidth: 25,
                        centerValue: totalTasks,
                        centerLabel: 'Total'
                    })
                )
            )
        ),

        // Team & Budget Row
        React.createElement('div', { className: 'charts-row' },
            React.createElement(GlassCard, { className: 'chart-card', delay: 0.5 },
                React.createElement('div', { className: 'chart-header' },
                    React.createElement('h3', null,
                        React.createElement(Icon, { name: 'users', size: 20 }),
                        ' Team Workload'
                    ),
                    React.createElement('button', { 
                        className: 'btn-link',
                        onClick: function() { setActiveView('team'); }
                    }, 'View All')
                ),
                React.createElement('div', { className: 'team-workload-mini' },
                    collaborators.slice(0, 5).map(function(c) {
                        var loadPercent = Math.round((c.currentLoad / c.capacity) * 100);
                        var loadColor = loadPercent > 100 ? '#ef4444' : loadPercent > 85 ? '#facc15' : '#22c55e';
                        return React.createElement('div', { key: c.id, className: 'workload-item' },
                            React.createElement('div', { className: 'workload-user' },
                                React.createElement('span', { className: 'user-avatar' }, c.avatar),
                                React.createElement('span', { className: 'user-name' }, c.name.split(' ')[0])
                            ),
                            React.createElement(ProgressBar, {
                                value: c.currentLoad,
                                max: c.capacity,
                                color: loadColor,
                                height: 6
                            }),
                            React.createElement('span', { 
                                className: 'workload-percent',
                                style: { color: loadColor }
                            }, loadPercent + '%')
                        );
                    })
                )
            ),
            React.createElement(GlassCard, { className: 'chart-card', delay: 0.55 },
                React.createElement('div', { className: 'chart-header' },
                    React.createElement('h3', null,
                        React.createElement(Icon, { name: 'bar-chart-2', size: 20 }),
                        ' Priority Breakdown'
                    )
                ),
                React.createElement('div', { className: 'chart-body' },
                    React.createElement(BarChart, {
                        data: priorityData,
                        width: 350,
                        height: 180,
                        dataKey: 'value',
                        labelKey: 'name',
                        horizontal: true
                    })
                )
            ),
            React.createElement(GlassCard, { className: 'chart-card', delay: 0.6 },
                React.createElement('div', { className: 'chart-header' },
                    React.createElement('h3', null,
                        React.createElement(Icon, { name: 'clock', size: 20 }),
                        ' Time Tracking'
                    )
                ),
                React.createElement('div', { className: 'time-stats' },
                    React.createElement('div', { className: 'time-stat' },
                        React.createElement('span', { className: 'time-label' }, 'Estimated'),
                        React.createElement('span', { className: 'time-value' }, totalEstimate + 'h')
                    ),
                    React.createElement('div', { className: 'time-stat' },
                        React.createElement('span', { className: 'time-label' }, 'Spent'),
                        React.createElement('span', { className: 'time-value', style: { color: totalSpent > totalEstimate ? '#ef4444' : '#22c55e' } }, totalSpent + 'h')
                    ),
                    React.createElement('div', { className: 'time-stat' },
                        React.createElement('span', { className: 'time-label' }, 'Efficiency'),
                        React.createElement('span', { className: 'time-value' }, Math.round((totalEstimate / (totalSpent || 1)) * 100) + '%')
                    ),
                    React.createElement(ProgressBar, {
                        value: totalSpent,
                        max: totalEstimate * 1.2,
                        color: totalSpent > totalEstimate ? '#ef4444' : '#00d4ff',
                        height: 8,
                        label: 'Time Budget'
                    })
                )
            )
        ),

        // Upcoming Deadlines
        React.createElement(GlassCard, { className: 'deadlines-card', delay: 0.65 },
            React.createElement('div', { className: 'chart-header' },
                React.createElement('h3', null,
                    React.createElement(Icon, { name: 'calendar', size: 20 }),
                    ' Upcoming Deadlines'
                )
            ),
            React.createElement('div', { className: 'deadlines-list' },
                tasks
                    .filter(function(t) { return t.endDate && t.status !== 'done'; })
                    .sort(function(a, b) { return new Date(a.endDate) - new Date(b.endDate); })
                    .slice(0, 5)
                    .map(function(task) {
                        var days = calculateDaysRemaining(task.endDate);
                        var isOverdue = days < 0;
                        var isUrgent = days >= 0 && days <= 2;
                        return React.createElement('div', { 
                            key: task.id, 
                            className: 'deadline-item' + (isOverdue ? ' overdue' : isUrgent ? ' urgent' : '')
                        },
                            React.createElement('div', { className: 'deadline-info' },
                                React.createElement('span', { 
                                    className: 'deadline-priority',
                                    style: { backgroundColor: getPriorityColor(task.priority) }
                                }),
                                React.createElement('span', { className: 'deadline-title' }, task.title),
                                React.createElement('span', { 
                                    className: 'deadline-status',
                                    style: { color: getStatusColor(task.status) }
                                }, task.status.replace('-', ' '))
                            ),
                            React.createElement('div', { className: 'deadline-date' },
                                React.createElement('span', null, formatDate(task.endDate)),
                                React.createElement('span', { 
                                    className: 'deadline-days',
                                    style: { color: isOverdue ? '#ef4444' : isUrgent ? '#facc15' : '#6b7280' }
                                }, isOverdue ? Math.abs(days) + 'd overdue' : days + 'd left')
                            )
                        );
                    })
            )
        )
    );
}

// ============================================================================
// KANBAN VIEW
// ============================================================================
function KanbanView(props) {
    var tasks = props.tasks;
    var setTasks = props.setTasks;
    var collaborators = props.collaborators;

    var columns = [
        { id: 'backlog', title: 'Backlog', color: '#6b7280' },
        { id: 'todo', title: 'To Do', color: '#00d4ff' },
        { id: 'in-progress', title: 'In Progress', color: '#a855f7' },
        { id: 'review', title: 'Review', color: '#facc15' },
        { id: 'done', title: 'Done', color: '#22c55e' }
    ];

    var getAssignee = function(id) {
        return collaborators.find(function(c) { return c.id === id; });
    };

    var moveTask = function(taskId, newStatus) {
        setTasks(tasks.map(function(t) {
            if (t.id === taskId) {
                return Object.assign({}, t, { status: newStatus });
            }
            return t;
        }));
    };

    return React.createElement('div', { className: 'kanban-view' },
        React.createElement('div', { className: 'view-header' },
            React.createElement('h2', null,
                React.createElement(Icon, { name: 'kanban', size: 24 }),
                ' Kanban Board'
            ),
            React.createElement('div', { className: 'view-actions' },
                React.createElement('button', { className: 'btn btn-primary' },
                    React.createElement(Icon, { name: 'plus', size: 16 }),
                    ' Add Task'
                )
            )
        ),
        React.createElement('div', { className: 'kanban-board' },
            columns.map(function(column) {
                var columnTasks = tasks.filter(function(t) { 
                    return t.status === column.id || (column.id === 'in-progress' && t.status === 'blocked');
                });
                
                return React.createElement('div', { 
                    key: column.id, 
                    className: 'kanban-column'
                },
                    React.createElement('div', { 
                        className: 'column-header',
                        style: { borderColor: column.color }
                    },
                        React.createElement('span', { className: 'column-title' }, column.title),
                        React.createElement('span', { className: 'column-count' }, columnTasks.length)
                    ),
                    React.createElement('div', { className: 'column-tasks' },
                        columnTasks.map(function(task, index) {
                            var assignee = getAssignee(task.assignee);
                            var isBlocked = task.status === 'blocked';
                            
                            return React.createElement(motion.div, {
                                key: task.id,
                                className: 'kanban-card' + (isBlocked ? ' blocked' : ''),
                                initial: { opacity: 0, y: 20 },
                                animate: { opacity: 1, y: 0 },
                                transition: { delay: index * 0.05 },
                                whileHover: { scale: 1.02, y: -2 }
                            },
                                isBlocked && React.createElement('div', { className: 'blocked-badge' },
                                    React.createElement(Icon, { name: 'alert-triangle', size: 12 }),
                                    ' Blocked'
                                ),
                                React.createElement('div', { className: 'card-header' },
                                    React.createElement('span', { 
                                        className: 'priority-dot',
                                        style: { backgroundColor: getPriorityColor(task.priority) }
                                    }),
                                    React.createElement('span', { className: 'category-tag' }, task.category)
                                ),
                                React.createElement('h4', { className: 'card-title' }, task.title),
                                task.description && React.createElement('p', { className: 'card-description' }, 
                                    task.description.length > 60 ? task.description.slice(0, 60) + '...' : task.description
                                ),
                                React.createElement(ProgressBar, {
                                    value: task.progress,
                                    max: 100,
                                    color: column.color,
                                    height: 4
                                }),
                                React.createElement('div', { className: 'card-footer' },
                                    assignee && React.createElement('div', { className: 'card-assignee' },
                                        React.createElement('span', { className: 'assignee-avatar' }, assignee.avatar),
                                        React.createElement('span', { className: 'assignee-name' }, assignee.name.split(' ')[0])
                                    ),
                                    React.createElement('div', { className: 'card-meta' },
                                        task.estimate && React.createElement('span', { className: 'meta-item' },
                                            React.createElement(Icon, { name: 'clock', size: 12 }),
                                            ' ' + task.spent + '/' + task.estimate + 'h'
                                        )
                                    )
                                )
                            );
                        })
                    )
                );
            })
        )
    );
}

// ============================================================================
// TEAM VIEW
// ============================================================================
function TeamView(props) {
    var collaborators = props.collaborators;
    var tasks = props.tasks;

    var getMemberTasks = function(memberId) {
        return tasks.filter(function(t) { return t.assignee === memberId && t.status !== 'done'; });
    };

    return React.createElement('div', { className: 'team-view' },
        React.createElement('div', { className: 'view-header' },
            React.createElement('h2', null,
                React.createElement(Icon, { name: 'users', size: 24 }),
                ' Team Overview'
            ),
            React.createElement('div', { className: 'team-stats' },
                React.createElement('span', { className: 'team-stat' },
                    React.createElement('strong', null, collaborators.length),
                    ' members'
                ),
                React.createElement('span', { className: 'team-stat available' },
                    React.createElement('strong', null, collaborators.filter(function(c) { return c.status === 'available'; }).length),
                    ' available'
                ),
                React.createElement('span', { className: 'team-stat overloaded' },
                    React.createElement('strong', null, collaborators.filter(function(c) { return c.currentLoad > c.capacity; }).length),
                    ' overloaded'
                )
            )
        ),
        React.createElement('div', { className: 'team-grid' },
            collaborators.map(function(member, index) {
                var memberTasks = getMemberTasks(member.id);
                var loadPercent = Math.round((member.currentLoad / member.capacity) * 100);
                var isOverloaded = loadPercent > 100;
                var statusColor = isOverloaded ? '#ef4444' : loadPercent > 85 ? '#facc15' : '#22c55e';

                return React.createElement(GlassCard, { 
                    key: member.id, 
                    className: 'team-member-card',
                    delay: index * 0.1
                },
                    React.createElement('div', { className: 'member-header' },
                        React.createElement('div', { 
                            className: 'member-avatar large',
                            style: { borderColor: member.color }
                        }, member.avatar),
                        React.createElement('div', { className: 'member-info' },
                            React.createElement('h3', { className: 'member-name' }, member.name),
                            React.createElement('span', { className: 'member-role' }, member.role)
                        ),
                        React.createElement('div', { 
                            className: 'member-status',
                            style: { backgroundColor: statusColor }
                        }, isOverloaded ? 'Overloaded' : loadPercent > 85 ? 'Busy' : 'Available')
                    ),
                    React.createElement('div', { className: 'member-workload' },
                        React.createElement('div', { className: 'workload-header' },
                            React.createElement('span', null, 'Workload'),
                            React.createElement('span', { style: { color: statusColor } }, loadPercent + '%')
                        ),
                        React.createElement(ProgressBar, {
                            value: member.currentLoad,
                            max: member.capacity,
                            color: statusColor,
                            height: 8
                        }),
                        React.createElement('div', { className: 'workload-details' },
                            React.createElement('span', null, member.currentLoad + 'h / ' + member.capacity + 'h per week')
                        )
                    ),
                    React.createElement('div', { className: 'member-skills' },
                        React.createElement('span', { className: 'skills-label' }, 'Skills'),
                        React.createElement('div', { className: 'skills-list' },
                            member.skills.map(function(skill) {
                                return React.createElement('span', { key: skill, className: 'skill-tag' }, skill);
                            })
                        )
                    ),
                    React.createElement('div', { className: 'member-tasks' },
                        React.createElement('span', { className: 'tasks-label' }, 'Active Tasks (' + memberTasks.length + ')'),
                        React.createElement('div', { className: 'tasks-list' },
                            memberTasks.slice(0, 3).map(function(task) {
                                return React.createElement('div', { key: task.id, className: 'mini-task' },
                                    React.createElement('span', { 
                                        className: 'task-priority',
                                        style: { backgroundColor: getPriorityColor(task.priority) }
                                    }),
                                    React.createElement('span', { className: 'task-title' }, 
                                        task.title.length > 25 ? task.title.slice(0, 25) + '...' : task.title
                                    ),
                                    React.createElement('span', { 
                                        className: 'task-status',
                                        style: { color: getStatusColor(task.status) }
                                    }, task.progress + '%')
                                );
                            }),
                            memberTasks.length > 3 && React.createElement('div', { className: 'more-tasks' },
                                '+' + (memberTasks.length - 3) + ' more'
                            )
                        )
                    )
                );
            })
        )
    );
}

// ============================================================================
// BUDGET VIEW
// ============================================================================
function BudgetView(props) {
    var financials = props.financials;

    var usedPercent = Math.round((financials.spent / financials.totalBudget) * 100);
    var committedPercent = Math.round((financials.committed / financials.totalBudget) * 100);

    return React.createElement('div', { className: 'budget-view' },
        React.createElement('div', { className: 'view-header' },
            React.createElement('h2', null,
                React.createElement(Icon, { name: 'pie-chart', size: 24 }),
                ' Budget Overview'
            )
        ),
        
        // Budget Summary Cards
        React.createElement('div', { className: 'budget-summary' },
            React.createElement(StatCard, {
                title: 'Total Budget',
                value: formatCurrency(financials.totalBudget),
                icon: 'dollar',
                color: '#00d4ff',
                delay: 0.1
            }),
            React.createElement(StatCard, {
                title: 'Spent',
                value: formatCurrency(financials.spent),
                subtitle: usedPercent + '% used',
                icon: 'trending-down',
                color: usedPercent > 80 ? '#ef4444' : '#facc15',
                delay: 0.15
            }),
            React.createElement(StatCard, {
                title: 'Committed',
                value: formatCurrency(financials.committed),
                subtitle: 'Pending expenses',
                icon: 'clock',
                color: '#a855f7',
                delay: 0.2
            }),
            React.createElement(StatCard, {
                title: 'Remaining',
                value: formatCurrency(financials.remaining),
                subtitle: financials.remaining < 0 ? 'Over budget!' : 'Available',
                icon: 'check-circle',
                color: financials.remaining > 0 ? '#22c55e' : '#ef4444',
                delay: 0.25
            })
        ),

        React.createElement('div', { className: 'budget-charts' },
            // Category Breakdown
            React.createElement(GlassCard, { className: 'chart-card', delay: 0.3 },
                React.createElement('div', { className: 'chart-header' },
                    React.createElement('h3', null, 'Budget by Category')
                ),
                React.createElement('div', { className: 'category-breakdown' },
                    financials.categories.map(function(cat) {
                        var usedPct = Math.round((cat.spent / cat.budget) * 100);
                        return React.createElement('div', { key: cat.name, className: 'category-item' },
                            React.createElement('div', { className: 'category-header' },
                                React.createElement('span', { 
                                    className: 'category-color',
                                    style: { backgroundColor: cat.color }
                                }),
                                React.createElement('span', { className: 'category-name' }, cat.name),
                                React.createElement('span', { className: 'category-amounts' },
                                    formatCurrency(cat.spent) + ' / ' + formatCurrency(cat.budget)
                                )
                            ),
                            React.createElement(ProgressBar, {
                                value: cat.spent,
                                max: cat.budget,
                                color: cat.color,
                                height: 8
                            })
                        );
                    })
                )
            ),

            // Monthly Trend
            React.createElement(GlassCard, { className: 'chart-card wide', delay: 0.35 },
                React.createElement('div', { className: 'chart-header' },
                    React.createElement('h3', null, 'Monthly Spending vs Plan'),
                    React.createElement('div', { className: 'chart-legend' },
                        React.createElement('span', { className: 'legend-item' },
                            React.createElement('span', { className: 'legend-dot', style: { backgroundColor: '#00d4ff' } }),
                            'Planned'
                        ),
                        React.createElement('span', { className: 'legend-item' },
                            React.createElement('span', { className: 'legend-dot', style: { backgroundColor: '#a855f7' } }),
                            'Actual'
                        )
                    )
                ),
                React.createElement('div', { className: 'chart-body' },
                    React.createElement(BarChart, {
                        data: financials.monthly.map(function(m) {
                            return { name: m.month, value: m.actual || m.planned, color: m.actual ? '#a855f7' : 'rgba(168,85,247,0.3)' };
                        }),
                        width: 500,
                        height: 200,
                        dataKey: 'value',
                        labelKey: 'name'
                    })
                )
            ),

            // Donut Chart
            React.createElement(GlassCard, { className: 'chart-card', delay: 0.4 },
                React.createElement('div', { className: 'chart-header' },
                    React.createElement('h3', null, 'Allocation Overview')
                ),
                React.createElement('div', { className: 'chart-body centered' },
                    React.createElement(DonutChart, {
                        data: financials.categories.map(function(c) {
                            return { name: c.name, value: c.budget, color: c.color };
                        }),
                        size: 200,
                        donutWidth: 30,
                        centerValue: formatCurrency(financials.totalBudget),
                        centerLabel: 'Total'
                    })
                )
            )
        ),

        // Burn Rate Alert
        React.createElement(GlassCard, { 
            className: 'alert-card ' + (financials.projectedOverrun > 0 ? 'warning' : 'success'),
            delay: 0.45
        },
            React.createElement('div', { className: 'alert-icon' },
                React.createElement(Icon, { name: financials.projectedOverrun > 0 ? 'alert-triangle' : 'check-circle', size: 32 })
            ),
            React.createElement('div', { className: 'alert-content' },
                React.createElement('h4', null, 
                    financials.projectedOverrun > 0 ? 'Budget Warning' : 'Budget On Track'
                ),
                React.createElement('p', null,
                    financials.projectedOverrun > 0 
                        ? 'At current burn rate (' + formatCurrency(financials.burnRate) + '/week), project is projected to exceed budget by ' + formatCurrency(financials.projectedOverrun)
                        : 'Current spending is within budget. Keep up the good work!'
                )
            )
        )
    );
}

// ============================================================================
// ACTIVITY VIEW
// ============================================================================
function ActivityView(props) {
    var activities = props.activities;
    var collaborators = props.collaborators;
    var tasks = props.tasks;

    var getUser = function(id) {
        return collaborators.find(function(c) { return c.id === id; }) || { name: 'Unknown', avatar: '👤' };
    };

    var getTask = function(id) {
        return tasks.find(function(t) { return t.id === id; });
    };

    var getActivityIcon = function(type) {
        var icons = {
            'task_completed': 'check-circle',
            'task_started': 'play',
            'comment': 'message-circle',
            'review_requested': 'eye',
            'blocked': 'alert-triangle',
            'sprint_started': 'zap',
            'milestone': 'flag'
        };
        return icons[type] || 'activity';
    };

    var getActivityColor = function(type) {
        var colors = {
            'task_completed': '#22c55e',
            'task_started': '#00d4ff',
            'comment': '#a855f7',
            'review_requested': '#facc15',
            'blocked': '#ef4444',
            'sprint_started': '#ec4899',
            'milestone': '#f97316'
        };
        return colors[type] || '#6b7280';
    };

    return React.createElement('div', { className: 'activity-view' },
        React.createElement('div', { className: 'view-header' },
            React.createElement('h2', null,
                React.createElement(Icon, { name: 'activity', size: 24 }),
                ' Activity Feed'
            )
        ),
        React.createElement('div', { className: 'activity-timeline' },
            activities.map(function(activity, index) {
                var user = getUser(activity.user);
                var task = activity.task ? getTask(activity.task) : null;
                var color = getActivityColor(activity.type);

                return React.createElement(motion.div, {
                    key: activity.id,
                    className: 'activity-item',
                    initial: { opacity: 0, x: -20 },
                    animate: { opacity: 1, x: 0 },
                    transition: { delay: index * 0.1 }
                },
                    React.createElement('div', { 
                        className: 'activity-icon',
                        style: { backgroundColor: color }
                    },
                        React.createElement(Icon, { name: getActivityIcon(activity.type), size: 16 })
                    ),
                    React.createElement('div', { className: 'activity-content' },
                        React.createElement('div', { className: 'activity-header' },
                            React.createElement('span', { className: 'activity-user' },
                                React.createElement('span', { className: 'user-avatar small' }, user.avatar),
                                user.name
                            ),
                            React.createElement('span', { className: 'activity-message' }, activity.message)
                        ),
                        task && React.createElement('div', { className: 'activity-task' },
                            React.createElement('span', { 
                                className: 'task-priority',
                                style: { backgroundColor: getPriorityColor(task.priority) }
                            }),
                            task.title
                        ),
                        React.createElement('span', { className: 'activity-time' }, formatDateTime(activity.timestamp))
                    )
                );
            })
        )
    );
}

// ============================================================================
// SETTINGS VIEW
// ============================================================================
function SettingsView(props) {
    var settings = props.settings;
    var setSettings = props.setSettings;

    var toggleSetting = function(key) {
        var newSettings = Object.assign({}, settings);
        newSettings[key] = !newSettings[key];
        setSettings(newSettings);
    };

    return React.createElement('div', { className: 'settings-view' },
        React.createElement('div', { className: 'view-header' },
            React.createElement('h2', null,
                React.createElement(Icon, { name: 'settings', size: 24 }),
                ' Settings'
            )
        ),
        React.createElement('div', { className: 'settings-grid' },
            React.createElement(GlassCard, { className: 'settings-section', delay: 0.1 },
                React.createElement('h3', null, 'Data Options'),
                React.createElement('div', { className: 'setting-item' },
                    React.createElement('div', { className: 'setting-info' },
                        React.createElement('span', { className: 'setting-label' }, 'Demo Data'),
                        React.createElement('span', { className: 'setting-description' }, 'Use sample data for demonstration')
                    ),
                    React.createElement('button', { 
                        className: 'toggle-btn ' + (settings.useDemoData ? 'active' : ''),
                        onClick: function() { toggleSetting('useDemoData'); }
                    },
                        React.createElement('span', { className: 'toggle-track' },
                            React.createElement('span', { className: 'toggle-thumb' })
                        )
                    )
                ),
                React.createElement('div', { className: 'setting-item' },
                    React.createElement('div', { className: 'setting-info' },
                        React.createElement('span', { className: 'setting-label' }, 'Auto-sync'),
                        React.createElement('span', { className: 'setting-description' }, 'Automatically sync data with server')
                    ),
                    React.createElement('button', { 
                        className: 'toggle-btn ' + (settings.autoSync ? 'active' : ''),
                        onClick: function() { toggleSetting('autoSync'); }
                    },
                        React.createElement('span', { className: 'toggle-track' },
                            React.createElement('span', { className: 'toggle-thumb' })
                        )
                    )
                )
            ),
            React.createElement(GlassCard, { className: 'settings-section', delay: 0.15 },
                React.createElement('h3', null, 'Appearance'),
                React.createElement('div', { className: 'setting-item' },
                    React.createElement('div', { className: 'setting-info' },
                        React.createElement('span', { className: 'setting-label' }, 'Animations'),
                        React.createElement('span', { className: 'setting-description' }, 'Enable UI animations')
                    ),
                    React.createElement('button', { 
                        className: 'toggle-btn ' + (settings.animations ? 'active' : ''),
                        onClick: function() { toggleSetting('animations'); }
                    },
                        React.createElement('span', { className: 'toggle-track' },
                            React.createElement('span', { className: 'toggle-thumb' })
                        )
                    )
                ),
                React.createElement('div', { className: 'setting-item' },
                    React.createElement('div', { className: 'setting-info' },
                        React.createElement('span', { className: 'setting-label' }, 'Compact Mode'),
                        React.createElement('span', { className: 'setting-description' }, 'Reduce spacing and padding')
                    ),
                    React.createElement('button', { 
                        className: 'toggle-btn ' + (settings.compactMode ? 'active' : ''),
                        onClick: function() { toggleSetting('compactMode'); }
                    },
                        React.createElement('span', { className: 'toggle-track' },
                            React.createElement('span', { className: 'toggle-thumb' })
                        )
                    )
                )
            ),
            React.createElement(GlassCard, { className: 'settings-section', delay: 0.2 },
                React.createElement('h3', null, 'Notifications'),
                React.createElement('div', { className: 'setting-item' },
                    React.createElement('div', { className: 'setting-info' },
                        React.createElement('span', { className: 'setting-label' }, 'Task Reminders'),
                        React.createElement('span', { className: 'setting-description' }, 'Get notified about upcoming deadlines')
                    ),
                    React.createElement('button', { 
                        className: 'toggle-btn ' + (settings.taskReminders ? 'active' : ''),
                        onClick: function() { toggleSetting('taskReminders'); }
                    },
                        React.createElement('span', { className: 'toggle-track' },
                            React.createElement('span', { className: 'toggle-thumb' })
                        )
                    )
                ),
                React.createElement('div', { className: 'setting-item' },
                    React.createElement('div', { className: 'setting-info' },
                        React.createElement('span', { className: 'setting-label' }, 'Team Updates'),
                        React.createElement('span', { className: 'setting-description' }, 'Notify on team activity')
                    ),
                    React.createElement('button', { 
                        className: 'toggle-btn ' + (settings.teamUpdates ? 'active' : ''),
                        onClick: function() { toggleSetting('teamUpdates'); }
                    },
                        React.createElement('span', { className: 'toggle-track' },
                            React.createElement('span', { className: 'toggle-thumb' })
                        )
                    )
                )
            ),
            React.createElement(GlassCard, { className: 'settings-section about-section', delay: 0.25 },
                React.createElement('h3', null, 'About'),
                React.createElement('div', { className: 'about-info' },
                    React.createElement('div', { className: 'app-logo' }, '🚀'),
                    React.createElement('h4', null, 'Project Hub'),
                    React.createElement('p', null, 'Version 1.0.0'),
                    React.createElement('p', { className: 'muted' }, 'Ultimate AI-Powered Project Management Dashboard'),
                    React.createElement('p', { className: 'copyright' }, '© 2026 EZGalaxy')
                )
            )
        )
    );
}

// ============================================================================
// GANTT VIEW (Simplified Timeline)
// ============================================================================
function GanttView(props) {
    var tasks = props.tasks;
    var collaborators = props.collaborators;

    var getAssignee = function(id) {
        return collaborators.find(function(c) { return c.id === id; });
    };

    // Filter tasks with dates
    var scheduledTasks = tasks
        .filter(function(t) { return t.startDate && t.endDate; })
        .sort(function(a, b) { return new Date(a.startDate) - new Date(b.startDate); });

    var minDate = scheduledTasks.length > 0 ? new Date(scheduledTasks[0].startDate) : new Date();
    var maxDate = new Date(minDate);
    maxDate.setDate(maxDate.getDate() + 45);

    var totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

    var getPosition = function(dateStr) {
        var date = new Date(dateStr);
        var days = Math.ceil((date - minDate) / (1000 * 60 * 60 * 24));
        return (days / totalDays) * 100;
    };

    var getWidth = function(startStr, endStr) {
        var start = new Date(startStr);
        var end = new Date(endStr);
        var days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return (days / totalDays) * 100;
    };

    // Generate week markers
    var weeks = [];
    var currentDate = new Date(minDate);
    while (currentDate < maxDate) {
        weeks.push({
            date: new Date(currentDate),
            label: currentDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        });
        currentDate.setDate(currentDate.getDate() + 7);
    }

    return React.createElement('div', { className: 'gantt-view' },
        React.createElement('div', { className: 'view-header' },
            React.createElement('h2', null,
                React.createElement(Icon, { name: 'gantt-chart', size: 24 }),
                ' Project Timeline'
            )
        ),
        React.createElement(GlassCard, { className: 'gantt-container', noPadding: true },
            React.createElement('div', { className: 'gantt-header' },
                React.createElement('div', { className: 'gantt-task-col' }, 'Task'),
                React.createElement('div', { className: 'gantt-timeline-col' },
                    React.createElement('div', { className: 'timeline-weeks' },
                        weeks.map(function(week, i) {
                            return React.createElement('div', { 
                                key: i, 
                                className: 'week-marker',
                                style: { left: getPosition(week.date.toISOString()) + '%' }
                            }, week.label);
                        })
                    )
                )
            ),
            React.createElement('div', { className: 'gantt-body' },
                scheduledTasks.map(function(task, index) {
                    var assignee = getAssignee(task.assignee);
                    var left = getPosition(task.startDate);
                    var width = getWidth(task.startDate, task.endDate);
                    var isBlocked = task.status === 'blocked';

                    return React.createElement(motion.div, {
                        key: task.id,
                        className: 'gantt-row',
                        initial: { opacity: 0, x: -20 },
                        animate: { opacity: 1, x: 0 },
                        transition: { delay: index * 0.05 }
                    },
                        React.createElement('div', { className: 'gantt-task-info' },
                            React.createElement('span', { 
                                className: 'priority-dot',
                                style: { backgroundColor: getPriorityColor(task.priority) }
                            }),
                            React.createElement('span', { className: 'task-title' }, 
                                task.title.length > 30 ? task.title.slice(0, 30) + '...' : task.title
                            ),
                            assignee && React.createElement('span', { className: 'task-assignee' }, assignee.avatar)
                        ),
                        React.createElement('div', { className: 'gantt-timeline' },
                            React.createElement('div', { 
                                className: 'gantt-bar' + (isBlocked ? ' blocked' : ''),
                                style: { 
                                    left: left + '%', 
                                    width: Math.max(width, 2) + '%',
                                    backgroundColor: getStatusColor(task.status)
                                }
                            },
                                React.createElement('div', { 
                                    className: 'gantt-progress',
                                    style: { width: task.progress + '%' }
                                })
                            )
                        )
                    );
                })
            )
        )
    );
}

// ============================================================================
// ANALYTICS VIEW
// ============================================================================
function AnalyticsView(props) {
    var tasks = props.tasks;
    var history = props.history;
    var collaborators = props.collaborators;

    // Burndown data
    var burndownData = history.slice(-30).map(function(h) {
        return { label: h.date.slice(5), value: h.burndown };
    });

    // Velocity trend
    var velocityData = history.slice(-30).map(function(h) {
        return { date: h.date.slice(5), velocity: h.velocity };
    });

    // Team morale trend
    var moraleData = history.slice(-30).map(function(h) {
        return { date: h.date.slice(5), morale: h.teamMorale };
    });

    // Task completion by category
    var categoryData = [];
    var categories = {};
    tasks.forEach(function(t) {
        if (!categories[t.category]) {
            categories[t.category] = { total: 0, done: 0 };
        }
        categories[t.category].total++;
        if (t.status === 'done') categories[t.category].done++;
    });
    for (var cat in categories) {
        categoryData.push({
            name: cat.charAt(0).toUpperCase() + cat.slice(1),
            value: categories[cat].total,
            completed: categories[cat].done,
            color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
        });
    }

    return React.createElement('div', { className: 'analytics-view' },
        React.createElement('div', { className: 'view-header' },
            React.createElement('h2', null,
                React.createElement(Icon, { name: 'bar-chart-2', size: 24 }),
                ' Analytics & Insights'
            )
        ),
        React.createElement('div', { className: 'analytics-grid' },
            React.createElement(GlassCard, { className: 'chart-card wide', delay: 0.1 },
                React.createElement('div', { className: 'chart-header' },
                    React.createElement('h3', null, 'Burndown Chart'),
                    React.createElement('span', { className: 'chart-subtitle' }, 'Last 30 days')
                ),
                React.createElement('div', { className: 'chart-body' },
                    React.createElement(LineChart, {
                        data: burndownData,
                        width: 600,
                        height: 200,
                        lines: [{ dataKey: 'value', color: '#00d4ff' }],
                        areaFill: true
                    })
                )
            ),
            React.createElement(GlassCard, { className: 'chart-card', delay: 0.15 },
                React.createElement('div', { className: 'chart-header' },
                    React.createElement('h3', null, 'Team Morale Trend')
                ),
                React.createElement('div', { className: 'chart-body' },
                    React.createElement(LineChart, {
                        data: moraleData,
                        width: 400,
                        height: 180,
                        lines: [{ dataKey: 'morale', color: '#22c55e' }],
                        areaFill: true
                    })
                )
            ),
            React.createElement(GlassCard, { className: 'chart-card', delay: 0.2 },
                React.createElement('div', { className: 'chart-header' },
                    React.createElement('h3', null, 'Tasks by Category')
                ),
                React.createElement('div', { className: 'chart-body' },
                    React.createElement(BarChart, {
                        data: categoryData.map(function(c, i) {
                            var colors = ['#00d4ff', '#a855f7', '#22c55e', '#facc15', '#ec4899', '#f97316'];
                            return { name: c.name, value: c.value, color: colors[i % colors.length] };
                        }),
                        width: 350,
                        height: 180,
                        dataKey: 'value',
                        labelKey: 'name',
                        horizontal: true
                    })
                )
            ),
            React.createElement(GlassCard, { className: 'chart-card wide', delay: 0.25 },
                React.createElement('div', { className: 'chart-header' },
                    React.createElement('h3', null, 'Velocity Over Time'),
                    React.createElement('div', { className: 'velocity-avg' },
                        'Avg: ',
                        React.createElement('strong', null, 
                            (velocityData.reduce(function(s, d) { return s + d.velocity; }, 0) / velocityData.length).toFixed(1)
                        ),
                        ' pts/day'
                    )
                ),
                React.createElement('div', { className: 'chart-body' },
                    React.createElement(LineChart, {
                        data: velocityData,
                        width: 700,
                        height: 200,
                        lines: [{ dataKey: 'velocity', color: '#a855f7' }],
                        showDots: false
                    })
                )
            )
        )
    );
}

// ============================================================================
// MAIN APPLICATION
// ============================================================================
function App() {
    var activeViewState = useState('dashboard');
    var activeView = activeViewState[0];
    var setActiveView = activeViewState[1];

    var sidebarCollapsedState = useState(false);
    var sidebarCollapsed = sidebarCollapsedState[0];
    var setSidebarCollapsed = sidebarCollapsedState[1];

    var tasksState = useState(DEMO_DATA.tasks);
    var tasks = tasksState[0];
    var setTasks = tasksState[1];

    var collaboratorsState = useState(DEMO_DATA.collaborators);
    var collaborators = collaboratorsState[0];

    var financialsState = useState(DEMO_DATA.financials);
    var financials = financialsState[0];

    var historyState = useState(DEMO_DATA.history);
    var history = historyState[0];

    var projectState = useState(DEMO_DATA.project);
    var project = projectState[0];

    var activitiesState = useState(DEMO_DATA.activities);
    var activities = activitiesState[0];

    var settingsState = useState({
        useDemoData: true,
        autoSync: true,
        animations: true,
        compactMode: false,
        taskReminders: true,
        teamUpdates: true
    });
    var settings = settingsState[0];
    var setSettings = settingsState[1];

    var loadingState = useState(true);
    var isLoading = loadingState[0];
    var setIsLoading = loadingState[1];

    // Initial load
    useEffect(function() {
        setTimeout(function() {
            setIsLoading(false);
        }, 800);
    }, []);

    // Render loading
    if (isLoading) {
        return React.createElement('div', { className: 'loading-screen' },
            React.createElement('div', { className: 'loading-logo' }, '🚀'),
            React.createElement('h1', null, 'Project Hub'),
            React.createElement('p', null, 'Loading your dashboard...'),
            React.createElement('div', { className: 'loading-bar' },
                React.createElement('div', { className: 'loading-progress' })
            )
        );
    }

    // Render view
    var renderView = function() {
        switch(activeView) {
            case 'dashboard':
                return React.createElement(DashboardView, {
                    tasks: tasks,
                    collaborators: collaborators,
                    financials: financials,
                    history: history,
                    project: project,
                    setActiveView: setActiveView
                });
            case 'kanban':
                return React.createElement(KanbanView, {
                    tasks: tasks,
                    setTasks: setTasks,
                    collaborators: collaborators
                });
            case 'gantt':
                return React.createElement(GanttView, {
                    tasks: tasks,
                    collaborators: collaborators
                });
            case 'team':
                return React.createElement(TeamView, {
                    collaborators: collaborators,
                    tasks: tasks
                });
            case 'budget':
                return React.createElement(BudgetView, {
                    financials: financials
                });
            case 'analytics':
                return React.createElement(AnalyticsView, {
                    tasks: tasks,
                    history: history,
                    collaborators: collaborators
                });
            case 'activity':
                return React.createElement(ActivityView, {
                    activities: activities,
                    collaborators: collaborators,
                    tasks: tasks
                });
            case 'settings':
                return React.createElement(SettingsView, {
                    settings: settings,
                    setSettings: setSettings
                });
            default:
                return React.createElement(DashboardView, {
                    tasks: tasks,
                    collaborators: collaborators,
                    financials: financials,
                    history: history,
                    project: project,
                    setActiveView: setActiveView
                });
        }
    };

    return React.createElement('div', { className: 'app' + (settings.compactMode ? ' compact' : '') },
        React.createElement(Sidebar, {
            activeView: activeView,
            setActiveView: setActiveView,
            collapsed: sidebarCollapsed,
            setCollapsed: setSidebarCollapsed,
            project: project
        }),
        React.createElement('main', { className: 'main-content' + (sidebarCollapsed ? ' expanded' : '') },
            renderView()
        )
    );
}

// Mount application
var root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
