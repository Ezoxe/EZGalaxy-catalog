/**
 * Project Hub - AI Dashboard
 * EZGalaxy Catalog Application
 * 
 * Features:
 * - Smart Kanban with drag-and-drop
 * - Gantt Chart with dependencies
 * - Resource Workload Matrix
 * - Predictive Engine (Time-Traveler)
 * - Risk Analyzer
 * - Sentiment Score
 * - Community Data API integration
 */

const { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } = React;
const { motion, AnimatePresence } = Motion;

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  EXTENSION_ID: 'com.ezgalaxy.projecthub',
  COLLECTIONS: {
    TASKS: 'tasks',
    COLLABORATORS: 'collaborators',
    METRICS: 'metrics',
    SETTINGS: 'settings',
    HISTORY: 'history'
  },
  SYNC_DEBOUNCE: 1500
};

// ============================================================================
// DEMO DATA - MASSIVE DATASET
// ============================================================================
const generateDemoData = () => {
  // 8 Collaborators with avatars, roles, and activity logs
  const collaborators = [
    {
      id: 'collab-1',
      name: 'Alice Martin',
      role: 'Lead Developer',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      email: 'alice@project.io',
      capacity: 40, // hours per week
      currentLoad: 38,
      skills: ['React', 'Node.js', 'TypeScript', 'AWS'],
      recentActivity: [
        { date: '2026-01-27', action: 'Completed task: API Integration' },
        { date: '2026-01-26', action: 'Code review: Payment module' }
      ]
    },
    {
      id: 'collab-2',
      name: 'Bob Johnson',
      role: 'Senior Developer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      email: 'bob@project.io',
      capacity: 40,
      currentLoad: 45, // Overloaded!
      skills: ['Python', 'Django', 'PostgreSQL', 'Docker'],
      recentActivity: [
        { date: '2026-01-28', action: 'Started: Database optimization' },
        { date: '2026-01-27', action: 'Bug fix: User authentication' }
      ]
    },
    {
      id: 'collab-3',
      name: 'Clara Chen',
      role: 'UX Designer',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
      email: 'clara@project.io',
      capacity: 40,
      currentLoad: 32,
      skills: ['Figma', 'Prototyping', 'User Research', 'Design Systems'],
      recentActivity: [
        { date: '2026-01-28', action: 'Uploaded: New wireframes' },
        { date: '2026-01-25', action: 'User testing session #5' }
      ]
    },
    {
      id: 'collab-4',
      name: 'David Park',
      role: 'Project Manager',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
      email: 'david@project.io',
      capacity: 40,
      currentLoad: 35,
      skills: ['Agile', 'Scrum', 'JIRA', 'Stakeholder Management'],
      recentActivity: [
        { date: '2026-01-28', action: 'Sprint planning meeting' },
        { date: '2026-01-27', action: 'Updated project timeline' }
      ]
    },
    {
      id: 'collab-5',
      name: 'Emma Wilson',
      role: 'QA Engineer',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
      email: 'emma@project.io',
      capacity: 40,
      currentLoad: 42, // Slightly overloaded
      skills: ['Selenium', 'Jest', 'Cypress', 'Performance Testing'],
      recentActivity: [
        { date: '2026-01-28', action: 'Test report: Sprint 12' },
        { date: '2026-01-26', action: 'Automated 15 new test cases' }
      ]
    },
    {
      id: 'collab-6',
      name: 'Frank Garcia',
      role: 'Backend Developer',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      email: 'frank@project.io',
      capacity: 40,
      currentLoad: 28,
      skills: ['Java', 'Spring Boot', 'Microservices', 'Kafka'],
      recentActivity: [
        { date: '2026-01-27', action: 'Deployed: Notification service' },
        { date: '2026-01-24', action: 'Refactored: Order processing' }
      ]
    },
    {
      id: 'collab-7',
      name: 'Grace Lee',
      role: 'DevOps Engineer',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      email: 'grace@project.io',
      capacity: 40,
      currentLoad: 36,
      skills: ['Kubernetes', 'Terraform', 'CI/CD', 'Monitoring'],
      recentActivity: [
        { date: '2026-01-28', action: 'Updated: Kubernetes configs' },
        { date: '2026-01-26', action: 'Set up: New monitoring alerts' }
      ]
    },
    {
      id: 'collab-8',
      name: 'Henry Brown',
      role: 'Frontend Developer',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
      email: 'henry@project.io',
      capacity: 40,
      currentLoad: 39,
      skills: ['Vue.js', 'React', 'CSS', 'WebGL'],
      recentActivity: [
        { date: '2026-01-28', action: 'Implemented: Dark mode toggle' },
        { date: '2026-01-27', action: 'Fixed: Mobile responsive issues' }
      ]
    }
  ];

  // 30+ Tasks with varied statuses, priorities, and tags
  const tasks = [
    // Backlog (6 tasks)
    { id: 'task-1', title: 'Research competitor features', status: 'backlog', priority: 'low', tags: ['research'], assignee: 'collab-4', estimatedHours: 8, actualHours: 0, startDate: null, endDate: null, dependencies: [], blockers: [] },
    { id: 'task-2', title: 'Define API v2 specifications', status: 'backlog', priority: 'medium', tags: ['backend', 'planning'], assignee: 'collab-1', estimatedHours: 16, actualHours: 0, startDate: null, endDate: null, dependencies: [], blockers: [] },
    { id: 'task-3', title: 'Design system documentation', status: 'backlog', priority: 'low', tags: ['design', 'documentation'], assignee: 'collab-3', estimatedHours: 12, actualHours: 0, startDate: null, endDate: null, dependencies: [], blockers: [] },
    { id: 'task-4', title: 'Performance audit planning', status: 'backlog', priority: 'medium', tags: ['devops', 'performance'], assignee: 'collab-7', estimatedHours: 6, actualHours: 0, startDate: null, endDate: null, dependencies: [], blockers: [] },
    { id: 'task-5', title: 'User feedback analysis Q4', status: 'backlog', priority: 'low', tags: ['research', 'ux'], assignee: 'collab-3', estimatedHours: 10, actualHours: 0, startDate: null, endDate: null, dependencies: [], blockers: [] },
    { id: 'task-6', title: 'Security audit preparation', status: 'backlog', priority: 'high', tags: ['security', 'compliance'], assignee: 'collab-7', estimatedHours: 20, actualHours: 0, startDate: null, endDate: null, dependencies: [], blockers: [] },

    // Todo (8 tasks)
    { id: 'task-7', title: 'Implement OAuth 2.0 flow', status: 'todo', priority: 'urgent', tags: ['backend', 'security'], assignee: 'collab-2', estimatedHours: 24, actualHours: 0, startDate: '2026-01-29', endDate: '2026-02-02', dependencies: [], blockers: [] },
    { id: 'task-8', title: 'Create onboarding wireframes', status: 'todo', priority: 'high', tags: ['design', 'ux'], assignee: 'collab-3', estimatedHours: 16, actualHours: 0, startDate: '2026-01-29', endDate: '2026-01-31', dependencies: [], blockers: [] },
    { id: 'task-9', title: 'Set up staging environment', status: 'todo', priority: 'high', tags: ['devops', 'infrastructure'], assignee: 'collab-7', estimatedHours: 12, actualHours: 0, startDate: '2026-01-30', endDate: '2026-02-01', dependencies: ['task-7'], blockers: [] },
    { id: 'task-10', title: 'Write E2E tests for checkout', status: 'todo', priority: 'medium', tags: ['qa', 'testing'], assignee: 'collab-5', estimatedHours: 20, actualHours: 0, startDate: '2026-02-01', endDate: '2026-02-05', dependencies: [], blockers: [] },
    { id: 'task-11', title: 'Refactor payment module', status: 'todo', priority: 'high', tags: ['backend', 'refactoring'], assignee: 'collab-6', estimatedHours: 32, actualHours: 0, startDate: '2026-02-03', endDate: '2026-02-10', dependencies: ['task-7'], blockers: [] },
    { id: 'task-12', title: 'Mobile app navigation redesign', status: 'todo', priority: 'medium', tags: ['design', 'mobile'], assignee: 'collab-3', estimatedHours: 18, actualHours: 0, startDate: '2026-02-01', endDate: '2026-02-06', dependencies: ['task-8'], blockers: [] },
    { id: 'task-13', title: 'Database migration script', status: 'todo', priority: 'urgent', tags: ['backend', 'database'], assignee: 'collab-2', estimatedHours: 16, actualHours: 0, startDate: '2026-01-29', endDate: '2026-01-31', dependencies: [], blockers: ['Waiting for DBA approval'] },
    { id: 'task-14', title: 'API rate limiting implementation', status: 'todo', priority: 'high', tags: ['backend', 'security'], assignee: 'collab-1', estimatedHours: 14, actualHours: 0, startDate: '2026-02-02', endDate: '2026-02-05', dependencies: [], blockers: [] },

    // In Progress (8 tasks)
    { id: 'task-15', title: 'Dashboard analytics component', status: 'in-progress', priority: 'high', tags: ['frontend', 'analytics'], assignee: 'collab-8', estimatedHours: 28, actualHours: 18, startDate: '2026-01-20', endDate: '2026-01-30', dependencies: [], blockers: [] },
    { id: 'task-16', title: 'User profile API endpoints', status: 'in-progress', priority: 'medium', tags: ['backend', 'api'], assignee: 'collab-6', estimatedHours: 20, actualHours: 14, startDate: '2026-01-22', endDate: '2026-01-29', dependencies: [], blockers: [] },
    { id: 'task-17', title: 'Notification system integration', status: 'in-progress', priority: 'high', tags: ['backend', 'integration'], assignee: 'collab-1', estimatedHours: 24, actualHours: 20, startDate: '2026-01-18', endDate: '2026-01-28', dependencies: [], blockers: ['Third-party API delay'] },
    { id: 'task-18', title: 'CI/CD pipeline optimization', status: 'in-progress', priority: 'medium', tags: ['devops', 'automation'], assignee: 'collab-7', estimatedHours: 16, actualHours: 10, startDate: '2026-01-24', endDate: '2026-01-30', dependencies: [], blockers: [] },
    { id: 'task-19', title: 'Search functionality upgrade', status: 'in-progress', priority: 'high', tags: ['frontend', 'backend'], assignee: 'collab-2', estimatedHours: 30, actualHours: 22, startDate: '2026-01-15', endDate: '2026-01-29', dependencies: [], blockers: [] },
    { id: 'task-20', title: 'User testing session setup', status: 'in-progress', priority: 'medium', tags: ['ux', 'research'], assignee: 'collab-3', estimatedHours: 8, actualHours: 5, startDate: '2026-01-26', endDate: '2026-01-28', dependencies: [], blockers: [] },
    { id: 'task-21', title: 'Performance monitoring setup', status: 'in-progress', priority: 'high', tags: ['devops', 'monitoring'], assignee: 'collab-7', estimatedHours: 18, actualHours: 12, startDate: '2026-01-20', endDate: '2026-01-29', dependencies: [], blockers: [] },
    { id: 'task-22', title: 'Test automation framework', status: 'in-progress', priority: 'high', tags: ['qa', 'automation'], assignee: 'collab-5', estimatedHours: 40, actualHours: 28, startDate: '2026-01-10', endDate: '2026-01-30', dependencies: [], blockers: [] },

    // Review (5 tasks)
    { id: 'task-23', title: 'Login page redesign', status: 'review', priority: 'medium', tags: ['frontend', 'design'], assignee: 'collab-8', estimatedHours: 16, actualHours: 15, startDate: '2026-01-15', endDate: '2026-01-25', dependencies: [], blockers: [] },
    { id: 'task-24', title: 'Email template system', status: 'review', priority: 'low', tags: ['backend', 'email'], assignee: 'collab-6', estimatedHours: 12, actualHours: 11, startDate: '2026-01-18', endDate: '2026-01-24', dependencies: [], blockers: [] },
    { id: 'task-25', title: 'Data export feature', status: 'review', priority: 'medium', tags: ['backend', 'feature'], assignee: 'collab-1', estimatedHours: 20, actualHours: 18, startDate: '2026-01-12', endDate: '2026-01-22', dependencies: [], blockers: [] },
    { id: 'task-26', title: 'Accessibility improvements', status: 'review', priority: 'high', tags: ['frontend', 'a11y'], assignee: 'collab-8', estimatedHours: 24, actualHours: 22, startDate: '2026-01-08', endDate: '2026-01-20', dependencies: [], blockers: [] },
    { id: 'task-27', title: 'Sprint 11 test report', status: 'review', priority: 'medium', tags: ['qa', 'documentation'], assignee: 'collab-5', estimatedHours: 8, actualHours: 7, startDate: '2026-01-22', endDate: '2026-01-24', dependencies: [], blockers: [] },

    // Done (5 tasks)
    { id: 'task-28', title: 'User authentication module', status: 'done', priority: 'urgent', tags: ['backend', 'security'], assignee: 'collab-2', estimatedHours: 40, actualHours: 38, startDate: '2025-12-15', endDate: '2026-01-10', dependencies: [], blockers: [] },
    { id: 'task-29', title: 'Homepage redesign', status: 'done', priority: 'high', tags: ['frontend', 'design'], assignee: 'collab-8', estimatedHours: 32, actualHours: 30, startDate: '2025-12-20', endDate: '2026-01-08', dependencies: [], blockers: [] },
    { id: 'task-30', title: 'Database schema optimization', status: 'done', priority: 'high', tags: ['backend', 'database'], assignee: 'collab-6', estimatedHours: 24, actualHours: 26, startDate: '2025-12-10', endDate: '2025-12-28', dependencies: [], blockers: [] },
    { id: 'task-31', title: 'Initial test coverage setup', status: 'done', priority: 'medium', tags: ['qa', 'testing'], assignee: 'collab-5', estimatedHours: 16, actualHours: 14, startDate: '2025-12-01', endDate: '2025-12-15', dependencies: [], blockers: [] },
    { id: 'task-32', title: 'Project kickoff documentation', status: 'done', priority: 'high', tags: ['planning', 'documentation'], assignee: 'collab-4', estimatedHours: 12, actualHours: 10, startDate: '2025-11-15', endDate: '2025-11-20', dependencies: [], blockers: [] }
  ];

  // Financial Metrics
  const financials = {
    totalBudget: 250000,
    spent: 147500,
    committed: 42000,
    projected: 215000,
    breakdown: {
      development: { budget: 120000, spent: 72000 },
      design: { budget: 40000, spent: 28000 },
      infrastructure: { budget: 35000, spent: 22500 },
      testing: { budget: 30000, spent: 15000 },
      management: { budget: 25000, spent: 10000 }
    },
    monthlyBurn: [
      { month: 'Nov 2025', planned: 35000, actual: 32000 },
      { month: 'Dec 2025', planned: 45000, actual: 48000 },
      { month: 'Jan 2026', planned: 55000, actual: 52500 },
      { month: 'Feb 2026', planned: 60000, actual: null },
      { month: 'Mar 2026', planned: 55000, actual: null }
    ]
  };

  // 3 months of historical data for trends
  const history = [];
  const startDate = new Date('2025-11-01');
  const endDate = new Date('2026-01-28');
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const daysSinceStart = Math.floor((d - startDate) / (1000 * 60 * 60 * 24));
    const baseCompleted = Math.min(5 + Math.floor(daysSinceStart * 0.35), 32);
    const velocity = 2 + Math.random() * 3;
    
    history.push({
      date: d.toISOString().split('T')[0],
      tasksCompleted: Math.min(baseCompleted + Math.floor(Math.random() * 3), 32),
      tasksTotal: 32,
      velocity: parseFloat(velocity.toFixed(1)),
      burndown: Math.max(0, 32 - baseCompleted),
      teamMorale: 65 + Math.floor(Math.random() * 25),
      budgetUsed: Math.min(financials.totalBudget, 30000 + daysSinceStart * 1500 + Math.random() * 2000)
    });
  }

  // Project metadata
  const project = {
    name: 'Phoenix Platform v2.0',
    description: 'Next-generation enterprise platform with AI-powered features',
    startDate: '2025-11-01',
    targetEndDate: '2026-03-31',
    currentPhase: 'Development',
    sprintNumber: 12,
    sprintStartDate: '2026-01-20',
    sprintEndDate: '2026-02-02'
  };

  return { collaborators, tasks, financials, history, project };
};

const DEMO_DATA = generateDemoData();

// ============================================================================
// COMMUNITY DATA API
// ============================================================================
class CommunityDataAPI {
  constructor(extensionId) {
    this.extensionId = extensionId;
    this.baseUrl = '/api/community';
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async request(method, path, data = null) {
    const url = `${this.baseUrl}/${this.extensionId}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (this.token) {
      options.headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`API Error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Community Data API:', error.message);
      return null;
    }
  }

  // CRUD Operations
  async getRecord(collection, key) {
    return this.request('GET', `/${collection}/${key}`);
  }

  async listRecords(collection, options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);
    if (options.prefix) params.append('prefix', options.prefix);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request('GET', `/${collection}${query}`);
  }

  async saveRecord(collection, key, data, expiresIn = null) {
    const body = { data };
    if (expiresIn) body.expires_in = expiresIn;
    return this.request('PUT', `/${collection}/${key}`, body);
  }

  async deleteRecord(collection, key) {
    return this.request('DELETE', `/${collection}/${key}`);
  }
}

const api = new CommunityDataAPI(CONFIG.EXTENSION_ID);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short'
  });
};

const calculateDaysRemaining = (endDate) => {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
};

// ============================================================================
// PREDICTION ENGINE (Time-Traveler)
// ============================================================================
const PredictionEngine = {
  // Linear regression for completion prediction
  // T_fin = T_actuel + (Tâches_restantes / Vitesse_moyenne)
  predictCompletionDate(tasks, history) {
    const now = new Date();
    const completed = tasks.filter(t => t.status === 'done').length;
    const remaining = tasks.length - completed;
    
    // Calculate average velocity from last 14 days
    const recentHistory = history.slice(-14);
    const avgVelocity = recentHistory.reduce((sum, h) => sum + h.velocity, 0) / recentHistory.length;
    
    if (avgVelocity <= 0) return null;
    
    const daysToComplete = remaining / avgVelocity;
    const predictedDate = new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000);
    
    return {
      date: predictedDate,
      daysRemaining: Math.ceil(daysToComplete),
      confidence: Math.min(95, 60 + (recentHistory.length * 2)),
      avgVelocity: avgVelocity.toFixed(2)
    };
  },

  // Generate prediction curve for chart
  generatePredictionCurve(tasks, history, daysAhead = 30) {
    const now = new Date();
    const prediction = this.predictCompletionDate(tasks, history);
    if (!prediction) return [];

    const curve = [];
    const currentBurndown = tasks.filter(t => t.status !== 'done').length;
    
    for (let i = 0; i <= daysAhead; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const predicted = Math.max(0, currentBurndown - (i * parseFloat(prediction.avgVelocity)));
      curve.push({
        date: date.toISOString().split('T')[0],
        predicted: parseFloat(predicted.toFixed(1))
      });
    }
    
    return curve;
  }
};

// ============================================================================
// RISK ANALYZER
// ============================================================================
const RiskAnalyzer = {
  analyzeProject(tasks, collaborators, financials, project) {
    const insights = [];
    const now = new Date();
    
    // Check for overloaded team members
    const overloaded = collaborators.filter(c => c.currentLoad > c.capacity);
    if (overloaded.length > 0) {
      insights.push({
        type: 'warning',
        category: 'Team',
        title: 'Burnout Risk Detected',
        message: `${overloaded.length} team member(s) are overloaded: ${overloaded.map(c => c.name).join(', ')}. Recommend task redistribution.`,
        probability: 85
      });
    }

    // Check for blocked tasks
    const blockedTasks = tasks.filter(t => t.blockers && t.blockers.length > 0);
    if (blockedTasks.length > 0) {
      insights.push({
        type: 'danger',
        category: 'Execution',
        title: 'Blocked Tasks Alert',
        message: `${blockedTasks.length} task(s) have blockers that need immediate attention.`,
        probability: 95
      });
    }

    // Budget risk analysis
    const budgetUsage = (financials.spent + financials.committed) / financials.totalBudget;
    const projectProgress = tasks.filter(t => t.status === 'done').length / tasks.length;
    
    if (budgetUsage > projectProgress + 0.15) {
      insights.push({
        type: 'danger',
        category: 'Budget',
        title: 'Budget Overrun Risk',
        message: `Budget usage (${(budgetUsage * 100).toFixed(0)}%) exceeds project progress (${(projectProgress * 100).toFixed(0)}%). ${(budgetUsage * 100 - projectProgress * 100).toFixed(0)}% over expected spend rate.`,
        probability: 78
      });
    }

    // Sprint velocity check
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
    const sprintEnd = new Date(project.sprintEndDate);
    const daysLeft = Math.ceil((sprintEnd - now) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 5 && inProgressTasks.length > 5) {
      insights.push({
        type: 'warning',
        category: 'Sprint',
        title: 'Sprint Completion Risk',
        message: `${inProgressTasks.length} tasks still in progress with only ${daysLeft} days left in sprint. Consider scope adjustment.`,
        probability: 72
      });
    }

    // Test phase risk
    const testTasks = tasks.filter(t => t.tags.includes('qa') || t.tags.includes('testing'));
    const testNotStarted = testTasks.filter(t => t.status === 'backlog' || t.status === 'todo');
    if (testNotStarted.length > testTasks.length * 0.5) {
      insights.push({
        type: 'warning',
        category: 'Quality',
        title: 'Testing Delay Risk',
        message: `Le projet a 85% de chance de dépasser le budget si la phase de Test ne commence pas sous 3 jours.`,
        probability: 85
      });
    }

    // Add positive insights too
    if (projectProgress > 0.4 && budgetUsage < 0.5) {
      insights.push({
        type: 'success',
        category: 'Budget',
        title: 'Budget On Track',
        message: `Excellent budget management! Current spend rate is ${((budgetUsage / projectProgress) * 100).toFixed(0)}% of expected.`,
        probability: 90
      });
    }

    return insights.sort((a, b) => b.probability - a.probability);
  }
};

// ============================================================================
// SENTIMENT SCORE CALCULATOR
// ============================================================================
const SentimentCalculator = {
  calculate(tasks, collaborators, history) {
    let score = 50; // Base score

    // Velocity trend (last 7 days vs previous 7)
    const recent = history.slice(-7);
    const previous = history.slice(-14, -7);
    const recentAvgVelocity = recent.reduce((s, h) => s + h.velocity, 0) / recent.length;
    const prevAvgVelocity = previous.reduce((s, h) => s + h.velocity, 0) / previous.length;
    
    if (recentAvgVelocity > prevAvgVelocity) {
      score += 10; // Velocity increasing
    } else if (recentAvgVelocity < prevAvgVelocity * 0.8) {
      score -= 15; // Velocity dropping significantly
    }

    // On-time completion rate
    const completedTasks = tasks.filter(t => t.status === 'done');
    const onTime = completedTasks.filter(t => {
      if (!t.endDate || !t.actualHours) return true;
      return t.actualHours <= t.estimatedHours * 1.1;
    });
    const onTimeRate = completedTasks.length > 0 ? onTime.length / completedTasks.length : 1;
    score += (onTimeRate - 0.7) * 30;

    // Team load balance
    const avgLoad = collaborators.reduce((s, c) => s + (c.currentLoad / c.capacity), 0) / collaborators.length;
    if (avgLoad > 1) {
      score -= (avgLoad - 1) * 20;
    } else if (avgLoad < 0.8) {
      score += 5;
    }

    // Blockers penalty
    const blockedTasks = tasks.filter(t => t.blockers && t.blockers.length > 0);
    score -= blockedTasks.length * 3;

    // Recent team morale
    const recentMorale = recent.reduce((s, h) => s + h.teamMorale, 0) / recent.length;
    score += (recentMorale - 70) * 0.3;

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      status: score >= 70 ? 'healthy' : score >= 50 ? 'warning' : 'critical',
      trend: recentAvgVelocity > prevAvgVelocity ? 'up' : recentAvgVelocity < prevAvgVelocity ? 'down' : 'stable'
    };
  }
};

// ============================================================================
// ICON COMPONENT (using Lucide)
// ============================================================================
const Icon = ({ name, size = 20, className = '' }) => {
  const ref = useRef(null);
  
  useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = '';
      const icon = window.lucide.icons[name];
      if (icon) {
        ref.current.innerHTML = icon.toSvg({ width: size, height: size });
      }
    }
  }, [name, size]);
  
  return React.createElement('span', { ref, className: `icon ${className}` });
};

// ============================================================================
// SKELETON LOADER
// ============================================================================
const SkeletonLoader = ({ width = '100%', height = 20, rounded = 8 }) => {
  return React.createElement(motion.div, {
    className: 'skeleton',
    style: { width, height, borderRadius: rounded },
    animate: { opacity: [0.3, 0.6, 0.3] },
    transition: { duration: 1.5, repeat: Infinity }
  });
};

// ============================================================================
// MAGNETIC BUTTON
// ============================================================================
const MagneticButton = ({ children, onClick, variant = 'default', className = '' }) => {
  const buttonRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = buttonRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.2;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.2;
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return React.createElement(motion.button, {
    ref: buttonRef,
    className: `magnetic-btn ${variant} ${className}`,
    onClick,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    animate: { x: position.x, y: position.y },
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
    transition: { type: 'spring', stiffness: 300, damping: 20 }
  }, children);
};

// ============================================================================
// GLASSMORPHIC CARD
// ============================================================================
const GlassCard = ({ children, className = '', neonColor = null, delay = 0 }) => {
  return React.createElement(motion.div, {
    className: `glass-card ${className}`,
    style: neonColor ? { '--neon-color': neonColor } : {},
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay }
  }, children);
};

// ============================================================================
// PROGRESS BAR WITH LIGHT REFLECTION
// ============================================================================
const GlowProgress = ({ value, max = 100, color = 'var(--neon-blue)', height = 8 }) => {
  const percentage = Math.min(100, (value / max) * 100);
  
  return React.createElement('div', { className: 'glow-progress', style: { height } },
    React.createElement(motion.div, {
      className: 'glow-progress-bar',
      style: { background: color },
      initial: { width: 0 },
      animate: { width: `${percentage}%` },
      transition: { duration: 1, ease: 'easeOut' }
    },
      React.createElement('div', { className: 'glow-progress-shine' })
    )
  );
};

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================
const Sidebar = ({ activeView, setActiveView, collapsed, setCollapsed }) => {
  const menuItems = [
    { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
    { id: 'kanban', icon: 'kanban', label: 'Kanban' },
    { id: 'gantt', icon: 'gantt-chart', label: 'Gantt' },
    { id: 'workload', icon: 'users', label: 'Workload' },
    { id: 'analytics', icon: 'bar-chart-3', label: 'Analytics' },
    { id: 'settings', icon: 'settings', label: 'Settings' }
  ];

  return React.createElement(motion.aside, {
    className: `sidebar ${collapsed ? 'collapsed' : ''}`,
    animate: { width: collapsed ? 70 : 240 }
  },
    React.createElement('div', { className: 'sidebar-header' },
      !collapsed && React.createElement('span', { className: 'sidebar-logo' }, '🚀 Project Hub'),
      React.createElement(MagneticButton, {
        variant: 'ghost',
        onClick: () => setCollapsed(!collapsed)
      }, React.createElement(Icon, { name: collapsed ? 'chevron-right' : 'chevron-left', size: 18 }))
    ),
    React.createElement('nav', { className: 'sidebar-nav' },
      menuItems.map((item, i) => 
        React.createElement(motion.button, {
          key: item.id,
          className: `sidebar-item ${activeView === item.id ? 'active' : ''}`,
          onClick: () => setActiveView(item.id),
          initial: { opacity: 0, x: -20 },
          animate: { opacity: 1, x: 0 },
          transition: { delay: i * 0.05 }
        },
          React.createElement(Icon, { name: item.icon, size: 20 }),
          !collapsed && React.createElement('span', null, item.label)
        )
      )
    )
  );
};

// ============================================================================
// KANBAN BOARD
// ============================================================================
const KanbanBoard = ({ tasks, setTasks, collaborators }) => {
  const columns = [
    { id: 'backlog', title: 'Backlog', icon: 'inbox', color: 'var(--neon-gray)' },
    { id: 'todo', title: 'To Do', icon: 'list-todo', color: 'var(--neon-blue)' },
    { id: 'in-progress', title: 'In Progress', icon: 'loader', color: 'var(--neon-yellow)' },
    { id: 'review', title: 'Review', icon: 'eye', color: 'var(--neon-purple)' },
    { id: 'done', title: 'Done', icon: 'check-circle', color: 'var(--neon-green)' }
  ];

  const getColumnTasks = (columnId) => tasks.filter(t => t.status === columnId);
  
  const calculateColumnVelocity = (columnId) => {
    const columnTasks = getColumnTasks(columnId);
    const totalHours = columnTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    return totalHours;
  };

  const handleDragEnd = (taskId, newStatus) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ));
  };

  const getAssignee = (assigneeId) => collaborators.find(c => c.id === assigneeId);

  const priorityColors = {
    urgent: 'var(--neon-red)',
    high: 'var(--neon-orange)',
    medium: 'var(--neon-yellow)',
    low: 'var(--neon-gray)'
  };

  return React.createElement('div', { className: 'kanban-board' },
    columns.map((column, colIndex) => 
      React.createElement(motion.div, {
        key: column.id,
        className: 'kanban-column',
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: colIndex * 0.1 }
      },
        React.createElement('div', { 
          className: 'kanban-column-header',
          style: { borderColor: column.color }
        },
          React.createElement('div', { className: 'kanban-column-title' },
            React.createElement(Icon, { name: column.icon, size: 18 }),
            React.createElement('span', null, column.title),
            React.createElement('span', { className: 'task-count' }, getColumnTasks(column.id).length)
          ),
          React.createElement('div', { className: 'kanban-column-velocity' },
            React.createElement(Icon, { name: 'clock', size: 14 }),
            React.createElement('span', null, `${calculateColumnVelocity(column.id)}h`)
          )
        ),
        React.createElement('div', { className: 'kanban-tasks' },
          getColumnTasks(column.id).map((task, taskIndex) => {
            const assignee = getAssignee(task.assignee);
            const hasBlocker = task.blockers && task.blockers.length > 0;
            
            return React.createElement(motion.div, {
              key: task.id,
              className: `kanban-task ${hasBlocker ? 'blocked' : ''}`,
              draggable: true,
              initial: { opacity: 0, scale: 0.9 },
              animate: { opacity: 1, scale: 1 },
              transition: { delay: taskIndex * 0.05 },
              whileHover: { scale: 1.02, y: -2 }
            },
              hasBlocker && React.createElement('div', { className: 'blocker-indicator' },
                React.createElement(Icon, { name: 'alert-triangle', size: 14 }),
                'Blocked'
              ),
              React.createElement('div', { 
                className: 'task-priority',
                style: { background: priorityColors[task.priority] }
              }),
              React.createElement('h4', { className: 'task-title' }, task.title),
              React.createElement('div', { className: 'task-tags' },
                task.tags.slice(0, 2).map(tag => 
                  React.createElement('span', { key: tag, className: 'task-tag' }, tag)
                )
              ),
              React.createElement('div', { className: 'task-footer' },
                assignee && React.createElement('div', { className: 'task-assignee' },
                  React.createElement('img', { src: assignee.avatar, alt: assignee.name }),
                  React.createElement('span', null, assignee.name.split(' ')[0])
                ),
                React.createElement('div', { className: 'task-hours' },
                  React.createElement(Icon, { name: 'clock', size: 12 }),
                  `${task.actualHours}/${task.estimatedHours}h`
                )
              )
            );
          })
        )
      )
    )
  );
};

// ============================================================================
// GANTT CHART
// ============================================================================
const GanttChart = ({ tasks, collaborators }) => {
  const [zoom, setZoom] = useState('week'); // day, week, month
  const today = new Date();
  
  // Calculate date range
  const allDates = tasks
    .filter(t => t.startDate)
    .flatMap(t => [new Date(t.startDate), t.endDate ? new Date(t.endDate) : new Date(t.startDate)]);
  
  const minDate = new Date(Math.min(...allDates, today));
  const maxDate = new Date(Math.max(...allDates, today));
  minDate.setDate(minDate.getDate() - 7);
  maxDate.setDate(maxDate.getDate() + 14);

  const getDateRange = () => {
    const dates = [];
    const current = new Date(minDate);
    while (current <= maxDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const dateRange = getDateRange();
  const dayWidth = zoom === 'day' ? 40 : zoom === 'week' ? 20 : 8;

  const getTaskPosition = (task) => {
    if (!task.startDate) return null;
    const start = new Date(task.startDate);
    const end = task.endDate ? new Date(task.endDate) : new Date(task.startDate);
    
    const startOffset = Math.floor((start - minDate) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1);
    
    return {
      left: startOffset * dayWidth,
      width: duration * dayWidth
    };
  };

  const getTodayPosition = () => {
    return Math.floor((today - minDate) / (1000 * 60 * 60 * 24)) * dayWidth;
  };

  const filteredTasks = tasks.filter(t => t.startDate).sort((a, b) => 
    new Date(a.startDate) - new Date(b.startDate)
  );

  const getAssignee = (id) => collaborators.find(c => c.id === id);

  const statusColors = {
    'backlog': 'var(--neon-gray)',
    'todo': 'var(--neon-blue)',
    'in-progress': 'var(--neon-yellow)',
    'review': 'var(--neon-purple)',
    'done': 'var(--neon-green)'
  };

  return React.createElement(GlassCard, { className: 'gantt-container' },
    React.createElement('div', { className: 'gantt-header' },
      React.createElement('h3', null, 
        React.createElement(Icon, { name: 'gantt-chart', size: 22 }),
        'Gantt Timeline'
      ),
      React.createElement('div', { className: 'gantt-controls' },
        ['day', 'week', 'month'].map(z => 
          React.createElement(MagneticButton, {
            key: z,
            variant: zoom === z ? 'primary' : 'ghost',
            onClick: () => setZoom(z)
          }, z.charAt(0).toUpperCase() + z.slice(1))
        )
      )
    ),
    React.createElement('div', { className: 'gantt-scroll' },
      React.createElement('div', { className: 'gantt-timeline', style: { width: dateRange.length * dayWidth } },
        // Date headers
        React.createElement('div', { className: 'gantt-dates' },
          dateRange.map((date, i) => {
            const isToday = date.toDateString() === today.toDateString();
            const showLabel = zoom === 'day' || (zoom === 'week' && date.getDay() === 1) || (zoom === 'month' && date.getDate() === 1);
            
            return React.createElement('div', {
              key: i,
              className: `gantt-date ${isToday ? 'today' : ''} ${date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : ''}`,
              style: { width: dayWidth }
            }, showLabel && formatDate(date));
          })
        ),
        // Today line
        React.createElement('div', {
          className: 'gantt-today-line',
          style: { left: getTodayPosition() }
        }),
        // Tasks
        React.createElement('div', { className: 'gantt-tasks' },
          filteredTasks.map((task, i) => {
            const pos = getTaskPosition(task);
            if (!pos) return null;
            const assignee = getAssignee(task.assignee);
            
            // Find dependencies
            const deps = tasks.filter(t => task.dependencies.includes(t.id));
            
            return React.createElement(motion.div, {
              key: task.id,
              className: 'gantt-task-row',
              initial: { opacity: 0, x: -20 },
              animate: { opacity: 1, x: 0 },
              transition: { delay: i * 0.03 }
            },
              React.createElement('div', { className: 'gantt-task-info' },
                assignee && React.createElement('img', { 
                  src: assignee.avatar, 
                  alt: assignee.name,
                  className: 'gantt-task-avatar'
                }),
                React.createElement('span', { className: 'gantt-task-title' }, 
                  task.title.length > 25 ? task.title.slice(0, 25) + '...' : task.title
                )
              ),
              React.createElement('div', { className: 'gantt-task-bar-container' },
                React.createElement(motion.div, {
                  className: 'gantt-task-bar',
                  style: {
                    left: pos.left,
                    width: pos.width,
                    background: statusColors[task.status]
                  },
                  whileHover: { scale: 1.05, y: -2 }
                },
                  React.createElement('div', { className: 'gantt-task-progress' },
                    React.createElement('div', { 
                      className: 'gantt-task-progress-fill',
                      style: { width: `${(task.actualHours / task.estimatedHours) * 100}%` }
                    })
                  )
                ),
                // Dependency arrows
                deps.map(dep => {
                  const depPos = getTaskPosition(dep);
                  if (!depPos) return null;
                  
                  return React.createElement('svg', {
                    key: `${dep.id}-${task.id}`,
                    className: 'gantt-dependency',
                    style: {
                      left: depPos.left + depPos.width,
                      width: pos.left - (depPos.left + depPos.width)
                    }
                  },
                    React.createElement('path', {
                      d: `M 0 15 L ${pos.left - (depPos.left + depPos.width) - 5} 15`,
                      stroke: 'var(--neon-cyan)',
                      strokeWidth: 2,
                      fill: 'none',
                      markerEnd: 'url(#arrowhead)'
                    })
                  );
                })
              )
            );
          })
        )
      )
    ),
    // Arrow marker definition
    React.createElement('svg', { style: { position: 'absolute', width: 0, height: 0 } },
      React.createElement('defs', null,
        React.createElement('marker', {
          id: 'arrowhead',
          markerWidth: 10,
          markerHeight: 7,
          refX: 9,
          refY: 3.5,
          orient: 'auto'
        },
          React.createElement('polygon', {
            points: '0 0, 10 3.5, 0 7',
            fill: 'var(--neon-cyan)'
          })
        )
      )
    )
  );
};

// ============================================================================
// WORKLOAD MATRIX
// ============================================================================
const WorkloadMatrix = ({ collaborators, tasks }) => {
  const calculateWorkload = (collabId) => {
    const assignedTasks = tasks.filter(t => t.assignee === collabId && t.status !== 'done');
    const totalHours = assignedTasks.reduce((sum, t) => sum + (t.estimatedHours - t.actualHours), 0);
    return totalHours;
  };

  const getLoadStatus = (current, capacity) => {
    const ratio = current / capacity;
    if (ratio > 1.1) return 'overload';
    if (ratio > 0.9) return 'high';
    if (ratio > 0.6) return 'optimal';
    return 'low';
  };

  const getStatusColor = (status) => {
    const colors = {
      overload: 'var(--neon-red)',
      high: 'var(--neon-orange)',
      optimal: 'var(--neon-green)',
      low: 'var(--neon-gray)'
    };
    return colors[status];
  };

  // Skills radar data
  const allSkills = [...new Set(collaborators.flatMap(c => c.skills))];

  return React.createElement(GlassCard, { className: 'workload-container' },
    React.createElement('div', { className: 'workload-header' },
      React.createElement('h3', null,
        React.createElement(Icon, { name: 'users', size: 22 }),
        'Resource Workload Matrix'
      )
    ),
    React.createElement('div', { className: 'workload-grid' },
      collaborators.map((collab, i) => {
        const workload = calculateWorkload(collab.id);
        const status = getLoadStatus(collab.currentLoad, collab.capacity);
        const loadPercentage = (collab.currentLoad / collab.capacity) * 100;
        
        return React.createElement(motion.div, {
          key: collab.id,
          className: `workload-card ${status}`,
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          transition: { delay: i * 0.08 }
        },
          status === 'overload' && React.createElement(motion.div, {
            className: 'burnout-alert',
            animate: { opacity: [0.5, 1, 0.5] },
            transition: { duration: 1.5, repeat: Infinity }
          },
            React.createElement(Icon, { name: 'alert-octagon', size: 16 }),
            'BURNOUT RISK'
          ),
          React.createElement('div', { className: 'workload-card-header' },
            React.createElement('img', { 
              src: collab.avatar, 
              alt: collab.name,
              className: 'workload-avatar'
            }),
            React.createElement('div', { className: 'workload-info' },
              React.createElement('h4', null, collab.name),
              React.createElement('span', { className: 'workload-role' }, collab.role)
            )
          ),
          React.createElement('div', { className: 'workload-stats' },
            React.createElement('div', { className: 'workload-stat' },
              React.createElement('span', { className: 'stat-label' }, 'Load'),
              React.createElement('span', { 
                className: 'stat-value',
                style: { color: getStatusColor(status) }
              }, `${collab.currentLoad}/${collab.capacity}h`)
            ),
            React.createElement('div', { className: 'workload-stat' },
              React.createElement('span', { className: 'stat-label' }, 'Remaining'),
              React.createElement('span', { className: 'stat-value' }, `${workload}h`)
            )
          ),
          React.createElement('div', { className: 'workload-bar' },
            React.createElement(GlowProgress, {
              value: loadPercentage,
              max: 100,
              color: getStatusColor(status),
              height: 6
            }),
            React.createElement('span', { className: 'workload-percentage' }, `${loadPercentage.toFixed(0)}%`)
          ),
          React.createElement('div', { className: 'workload-skills' },
            collab.skills.slice(0, 3).map(skill => 
              React.createElement('span', { key: skill, className: 'skill-tag' }, skill)
            )
          )
        );
      })
    )
  );
};

// ============================================================================
// DASHBOARD VIEW
// ============================================================================
const DashboardView = ({ data, prediction, risks, sentiment }) => {
  const { tasks, collaborators, financials, history, project } = data;
  
  // Calculate metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const blockedTasks = tasks.filter(t => t.blockers && t.blockers.length > 0).length;
  
  const budgetUsed = ((financials.spent / financials.totalBudget) * 100).toFixed(1);
  const progressPercent = ((completedTasks / totalTasks) * 100).toFixed(1);

  // Prepare chart data
  const progressChartData = history.slice(-30).map(h => ({
    date: h.date.slice(5),
    completed: h.tasksCompleted,
    burndown: h.burndown,
    velocity: h.velocity
  }));

  // Add prediction curve
  const predictionCurve = prediction ? PredictionEngine.generatePredictionCurve(tasks, history, 14) : [];
  
  const budgetChartData = financials.monthlyBurn.map(m => ({
    month: m.month.split(' ')[0],
    planned: m.planned / 1000,
    actual: m.actual ? m.actual / 1000 : null
  }));

  // Team skills radar data
  const skillsData = collaborators.reduce((acc, collab) => {
    collab.skills.forEach(skill => {
      const existing = acc.find(s => s.skill === skill);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ skill, count: 1 });
      }
    });
    return acc;
  }, []).slice(0, 8);

  return React.createElement('div', { className: 'dashboard-view' },
    // Header Stats
    React.createElement('div', { className: 'bento-grid stats-grid' },
      // Main Progress
      React.createElement(GlassCard, { 
        className: 'stat-card main-progress', 
        neonColor: 'var(--neon-blue)',
        delay: 0 
      },
        React.createElement('div', { className: 'stat-header' },
          React.createElement(Icon, { name: 'trending-up', size: 24 }),
          React.createElement('span', null, 'Project Progress')
        ),
        React.createElement('div', { className: 'stat-value large' }, `${progressPercent}%`),
        React.createElement(GlowProgress, { 
          value: parseFloat(progressPercent), 
          color: 'var(--neon-blue)' 
        }),
        React.createElement('div', { className: 'stat-footer' },
          `${completedTasks} of ${totalTasks} tasks completed`
        )
      ),

      // Sentiment Score
      React.createElement(GlassCard, { 
        className: 'stat-card sentiment-card', 
        neonColor: sentiment.status === 'healthy' ? 'var(--neon-green)' : 
                   sentiment.status === 'warning' ? 'var(--neon-yellow)' : 'var(--neon-red)',
        delay: 0.1
      },
        React.createElement('div', { className: 'stat-header' },
          React.createElement(Icon, { name: 'heart-pulse', size: 24 }),
          React.createElement('span', null, 'Project Health')
        ),
        React.createElement('div', { className: 'sentiment-gauge' },
          React.createElement('div', { 
            className: `sentiment-score ${sentiment.status}`,
          }, sentiment.score),
          React.createElement('div', { className: 'sentiment-trend' },
            React.createElement(Icon, { 
              name: sentiment.trend === 'up' ? 'trending-up' : 
                    sentiment.trend === 'down' ? 'trending-down' : 'minus',
              size: 18
            }),
            sentiment.trend === 'up' ? 'Improving' : 
            sentiment.trend === 'down' ? 'Declining' : 'Stable'
          )
        )
      ),

      // Budget
      React.createElement(GlassCard, { 
        className: 'stat-card', 
        neonColor: 'var(--neon-purple)',
        delay: 0.2 
      },
        React.createElement('div', { className: 'stat-header' },
          React.createElement(Icon, { name: 'wallet', size: 24 }),
          React.createElement('span', null, 'Budget Status')
        ),
        React.createElement('div', { className: 'stat-value' }, formatCurrency(financials.spent)),
        React.createElement('div', { className: 'stat-subvalue' }, 
          `of ${formatCurrency(financials.totalBudget)} (${budgetUsed}%)`
        ),
        React.createElement(GlowProgress, { 
          value: parseFloat(budgetUsed), 
          color: parseFloat(budgetUsed) > 80 ? 'var(--neon-red)' : 'var(--neon-purple)' 
        })
      ),

      // Sprint
      React.createElement(GlassCard, { 
        className: 'stat-card', 
        neonColor: 'var(--neon-cyan)',
        delay: 0.3 
      },
        React.createElement('div', { className: 'stat-header' },
          React.createElement(Icon, { name: 'zap', size: 24 }),
          React.createElement('span', null, `Sprint ${project.sprintNumber}`)
        ),
        React.createElement('div', { className: 'stat-value' }, inProgressTasks),
        React.createElement('div', { className: 'stat-subvalue' }, 'tasks in progress'),
        React.createElement('div', { className: 'sprint-dates' },
          `${formatDate(project.sprintStartDate)} → ${formatDate(project.sprintEndDate)}`
        )
      ),

      // Blockers
      React.createElement(GlassCard, { 
        className: 'stat-card', 
        neonColor: blockedTasks > 0 ? 'var(--neon-red)' : 'var(--neon-green)',
        delay: 0.4 
      },
        React.createElement('div', { className: 'stat-header' },
          React.createElement(Icon, { name: 'alert-triangle', size: 24 }),
          React.createElement('span', null, 'Blockers')
        ),
        React.createElement('div', { 
          className: 'stat-value',
          style: { color: blockedTasks > 0 ? 'var(--neon-red)' : 'var(--neon-green)' }
        }, blockedTasks),
        React.createElement('div', { className: 'stat-subvalue' }, 
          blockedTasks > 0 ? 'tasks blocked' : 'no blockers!'
        )
      ),

      // Prediction (Time-Traveler)
      React.createElement(GlassCard, { 
        className: 'stat-card prediction-card', 
        neonColor: 'var(--neon-pink)',
        delay: 0.5 
      },
        React.createElement('div', { className: 'stat-header' },
          React.createElement(Icon, { name: 'sparkles', size: 24 }),
          React.createElement('span', null, 'AI Prediction')
        ),
        prediction ? React.createElement(React.Fragment, null,
          React.createElement('div', { className: 'prediction-date' },
            React.createElement(Icon, { name: 'calendar', size: 18 }),
            prediction.date.toLocaleDateString('fr-FR', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })
          ),
          React.createElement('div', { className: 'prediction-details' },
            React.createElement('span', null, `${prediction.daysRemaining} days remaining`),
            React.createElement('span', { className: 'confidence' }, `${prediction.confidence}% confidence`)
          ),
          React.createElement('div', { className: 'prediction-formula' },
            'T = T₀ + (Tasks ÷ V̄)'
          )
        ) : React.createElement(SkeletonLoader, { height: 60 })
      )
    ),

    // Charts Row
    React.createElement('div', { className: 'bento-grid charts-grid' },
      // Progress & Burndown Chart
      React.createElement(GlassCard, { className: 'chart-card wide', delay: 0.6 },
        React.createElement('div', { className: 'chart-header' },
          React.createElement('h3', null,
            React.createElement(Icon, { name: 'line-chart', size: 20 }),
            'Progress & Velocity Trend'
          )
        ),
        React.createElement('div', { className: 'chart-container' },
          React.createElement(Recharts.ResponsiveContainer, { width: '100%', height: 280 },
            React.createElement(Recharts.ComposedChart, { data: progressChartData },
              React.createElement(Recharts.CartesianGrid, { 
                strokeDasharray: '3 3', 
                stroke: 'rgba(255,255,255,0.1)' 
              }),
              React.createElement(Recharts.XAxis, { 
                dataKey: 'date', 
                stroke: 'rgba(255,255,255,0.5)',
                fontSize: 11
              }),
              React.createElement(Recharts.YAxis, { 
                stroke: 'rgba(255,255,255,0.5)',
                fontSize: 11
              }),
              React.createElement(Recharts.Tooltip, { 
                contentStyle: { 
                  background: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8
                }
              }),
              React.createElement(Recharts.Legend, null),
              React.createElement(Recharts.Area, {
                type: 'monotone',
                dataKey: 'completed',
                name: 'Completed',
                fill: 'rgba(14,165,164,0.3)',
                stroke: 'var(--neon-cyan)'
              }),
              React.createElement(Recharts.Line, {
                type: 'monotone',
                dataKey: 'burndown',
                name: 'Burndown',
                stroke: 'var(--neon-orange)',
                strokeWidth: 2
              }),
              React.createElement(Recharts.Line, {
                type: 'monotone',
                dataKey: 'velocity',
                name: 'Velocity',
                stroke: 'var(--neon-purple)',
                strokeWidth: 2,
                strokeDasharray: '5 5'
              })
            )
          )
        )
      ),

      // Budget Chart
      React.createElement(GlassCard, { className: 'chart-card', delay: 0.7 },
        React.createElement('div', { className: 'chart-header' },
          React.createElement('h3', null,
            React.createElement(Icon, { name: 'bar-chart-3', size: 20 }),
            'Budget Burn Rate'
          )
        ),
        React.createElement('div', { className: 'chart-container' },
          React.createElement(Recharts.ResponsiveContainer, { width: '100%', height: 220 },
            React.createElement(Recharts.BarChart, { data: budgetChartData },
              React.createElement(Recharts.CartesianGrid, { 
                strokeDasharray: '3 3', 
                stroke: 'rgba(255,255,255,0.1)' 
              }),
              React.createElement(Recharts.XAxis, { 
                dataKey: 'month', 
                stroke: 'rgba(255,255,255,0.5)',
                fontSize: 11
              }),
              React.createElement(Recharts.YAxis, { 
                stroke: 'rgba(255,255,255,0.5)',
                fontSize: 11,
                tickFormatter: (v) => `$${v}k`
              }),
              React.createElement(Recharts.Tooltip, { 
                contentStyle: { 
                  background: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8
                },
                formatter: (v) => [`$${v}k`, '']
              }),
              React.createElement(Recharts.Bar, {
                dataKey: 'planned',
                name: 'Planned',
                fill: 'rgba(168,85,247,0.4)',
                radius: [4, 4, 0, 0]
              }),
              React.createElement(Recharts.Bar, {
                dataKey: 'actual',
                name: 'Actual',
                fill: 'var(--neon-purple)',
                radius: [4, 4, 0, 0]
              })
            )
          )
        )
      ),

      // Team Skills Radar
      React.createElement(GlassCard, { className: 'chart-card', delay: 0.8 },
        React.createElement('div', { className: 'chart-header' },
          React.createElement('h3', null,
            React.createElement(Icon, { name: 'radar', size: 20 }),
            'Team Skills Coverage'
          )
        ),
        React.createElement('div', { className: 'chart-container' },
          React.createElement(Recharts.ResponsiveContainer, { width: '100%', height: 220 },
            React.createElement(Recharts.RadarChart, { data: skillsData },
              React.createElement(Recharts.PolarGrid, { stroke: 'rgba(255,255,255,0.2)' }),
              React.createElement(Recharts.PolarAngleAxis, { 
                dataKey: 'skill',
                stroke: 'rgba(255,255,255,0.6)',
                fontSize: 10
              }),
              React.createElement(Recharts.PolarRadiusAxis, { 
                stroke: 'rgba(255,255,255,0.3)',
                fontSize: 10
              }),
              React.createElement(Recharts.Radar, {
                dataKey: 'count',
                stroke: 'var(--neon-cyan)',
                fill: 'rgba(14,165,164,0.4)',
                fillOpacity: 0.6
              })
            )
          )
        )
      )
    ),

    // Risk Insights
    React.createElement(GlassCard, { className: 'risks-card', delay: 0.9 },
      React.createElement('div', { className: 'risks-header' },
        React.createElement('h3', null,
          React.createElement(Icon, { name: 'brain', size: 22 }),
          'AI Risk Analysis'
        )
      ),
      React.createElement('div', { className: 'risks-grid' },
        risks.slice(0, 4).map((risk, i) => 
          React.createElement(motion.div, {
            key: i,
            className: `risk-item ${risk.type}`,
            initial: { opacity: 0, x: -20 },
            animate: { opacity: 1, x: 0 },
            transition: { delay: 1 + i * 0.1 }
          },
            React.createElement('div', { className: 'risk-header' },
              React.createElement(Icon, { 
                name: risk.type === 'danger' ? 'alert-octagon' : 
                      risk.type === 'warning' ? 'alert-triangle' : 'check-circle',
                size: 18
              }),
              React.createElement('span', { className: 'risk-category' }, risk.category),
              React.createElement('span', { className: 'risk-probability' }, `${risk.probability}%`)
            ),
            React.createElement('h4', null, risk.title),
            React.createElement('p', null, risk.message)
          )
        )
      )
    )
  );
};

// ============================================================================
// ANALYTICS VIEW
// ============================================================================
const AnalyticsView = ({ data }) => {
  const { tasks, collaborators, financials, history } = data;

  // Task distribution by status
  const statusDistribution = [
    { name: 'Backlog', value: tasks.filter(t => t.status === 'backlog').length, color: '#6b7280' },
    { name: 'To Do', value: tasks.filter(t => t.status === 'todo').length, color: '#3b82f6' },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, color: '#f59e0b' },
    { name: 'Review', value: tasks.filter(t => t.status === 'review').length, color: '#a855f7' },
    { name: 'Done', value: tasks.filter(t => t.status === 'done').length, color: '#22c55e' }
  ];

  // Priority distribution
  const priorityDistribution = [
    { name: 'Urgent', value: tasks.filter(t => t.priority === 'urgent').length, color: '#ef4444' },
    { name: 'High', value: tasks.filter(t => t.priority === 'high').length, color: '#f97316' },
    { name: 'Medium', value: tasks.filter(t => t.priority === 'medium').length, color: '#eab308' },
    { name: 'Low', value: tasks.filter(t => t.priority === 'low').length, color: '#6b7280' }
  ];

  // Budget breakdown
  const budgetBreakdown = Object.entries(financials.breakdown).map(([key, val]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    budget: val.budget / 1000,
    spent: val.spent / 1000
  }));

  // Morale trend
  const moraleTrend = history.slice(-30).map(h => ({
    date: h.date.slice(5),
    morale: h.teamMorale
  }));

  return React.createElement('div', { className: 'analytics-view' },
    React.createElement('h2', { className: 'view-title' },
      React.createElement(Icon, { name: 'bar-chart-3', size: 28 }),
      'Analytics Dashboard'
    ),
    
    React.createElement('div', { className: 'bento-grid analytics-grid' },
      // Status Distribution Pie
      React.createElement(GlassCard, { className: 'chart-card', delay: 0.1 },
        React.createElement('h3', null, 
          React.createElement(Icon, { name: 'pie-chart', size: 20 }),
          'Task Status Distribution'
        ),
        React.createElement('div', { className: 'chart-container' },
          React.createElement(Recharts.ResponsiveContainer, { width: '100%', height: 250 },
            React.createElement(Recharts.PieChart, null,
              React.createElement(Recharts.Pie, {
                data: statusDistribution,
                cx: '50%',
                cy: '50%',
                innerRadius: 50,
                outerRadius: 80,
                dataKey: 'value',
                label: ({ name, value }) => `${name}: ${value}`
              },
                statusDistribution.map((entry, i) => 
                  React.createElement(Recharts.Cell, { key: i, fill: entry.color })
                )
              ),
              React.createElement(Recharts.Tooltip, {
                contentStyle: { 
                  background: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8
                }
              })
            )
          )
        )
      ),

      // Priority Distribution
      React.createElement(GlassCard, { className: 'chart-card', delay: 0.2 },
        React.createElement('h3', null,
          React.createElement(Icon, { name: 'flag', size: 20 }),
          'Priority Distribution'
        ),
        React.createElement('div', { className: 'chart-container' },
          React.createElement(Recharts.ResponsiveContainer, { width: '100%', height: 250 },
            React.createElement(Recharts.PieChart, null,
              React.createElement(Recharts.Pie, {
                data: priorityDistribution,
                cx: '50%',
                cy: '50%',
                innerRadius: 50,
                outerRadius: 80,
                dataKey: 'value',
                label: ({ name, value }) => `${name}: ${value}`
              },
                priorityDistribution.map((entry, i) => 
                  React.createElement(Recharts.Cell, { key: i, fill: entry.color })
                )
              ),
              React.createElement(Recharts.Tooltip, {
                contentStyle: { 
                  background: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8
                }
              })
            )
          )
        )
      ),

      // Budget Breakdown
      React.createElement(GlassCard, { className: 'chart-card wide', delay: 0.3 },
        React.createElement('h3', null,
          React.createElement(Icon, { name: 'coins', size: 20 }),
          'Budget Breakdown by Department'
        ),
        React.createElement('div', { className: 'chart-container' },
          React.createElement(Recharts.ResponsiveContainer, { width: '100%', height: 280 },
            React.createElement(Recharts.BarChart, { data: budgetBreakdown, layout: 'vertical' },
              React.createElement(Recharts.CartesianGrid, { 
                strokeDasharray: '3 3', 
                stroke: 'rgba(255,255,255,0.1)' 
              }),
              React.createElement(Recharts.XAxis, { 
                type: 'number',
                stroke: 'rgba(255,255,255,0.5)',
                tickFormatter: (v) => `$${v}k`
              }),
              React.createElement(Recharts.YAxis, { 
                dataKey: 'name',
                type: 'category',
                stroke: 'rgba(255,255,255,0.5)',
                width: 100
              }),
              React.createElement(Recharts.Tooltip, {
                contentStyle: { 
                  background: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8
                },
                formatter: (v) => [`$${v}k`, '']
              }),
              React.createElement(Recharts.Legend, null),
              React.createElement(Recharts.Bar, {
                dataKey: 'budget',
                name: 'Budget',
                fill: 'rgba(168,85,247,0.4)',
                radius: [0, 4, 4, 0]
              }),
              React.createElement(Recharts.Bar, {
                dataKey: 'spent',
                name: 'Spent',
                fill: 'var(--neon-purple)',
                radius: [0, 4, 4, 0]
              })
            )
          )
        )
      ),

      // Team Morale Trend
      React.createElement(GlassCard, { className: 'chart-card wide', delay: 0.4 },
        React.createElement('h3', null,
          React.createElement(Icon, { name: 'smile', size: 20 }),
          'Team Morale Trend (30 days)'
        ),
        React.createElement('div', { className: 'chart-container' },
          React.createElement(Recharts.ResponsiveContainer, { width: '100%', height: 200 },
            React.createElement(Recharts.AreaChart, { data: moraleTrend },
              React.createElement(Recharts.CartesianGrid, { 
                strokeDasharray: '3 3', 
                stroke: 'rgba(255,255,255,0.1)' 
              }),
              React.createElement(Recharts.XAxis, { 
                dataKey: 'date',
                stroke: 'rgba(255,255,255,0.5)',
                fontSize: 10
              }),
              React.createElement(Recharts.YAxis, { 
                domain: [0, 100],
                stroke: 'rgba(255,255,255,0.5)'
              }),
              React.createElement(Recharts.Tooltip, {
                contentStyle: { 
                  background: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8
                }
              }),
              React.createElement(Recharts.Area, {
                type: 'monotone',
                dataKey: 'morale',
                stroke: 'var(--neon-pink)',
                fill: 'rgba(236,72,153,0.3)'
              })
            )
          )
        )
      )
    )
  );
};

// ============================================================================
// SETTINGS VIEW
// ============================================================================
const SettingsView = ({ onSync, syncStatus }) => {
  return React.createElement('div', { className: 'settings-view' },
    React.createElement('h2', { className: 'view-title' },
      React.createElement(Icon, { name: 'settings', size: 28 }),
      'Settings'
    ),
    
    React.createElement('div', { className: 'settings-grid' },
      React.createElement(GlassCard, { className: 'settings-card' },
        React.createElement('h3', null,
          React.createElement(Icon, { name: 'cloud', size: 20 }),
          'Data Synchronization'
        ),
        React.createElement('p', null, 'Sync your project data with the Community Data API.'),
        React.createElement('div', { className: 'sync-status' },
          React.createElement('span', { 
            className: `status-indicator ${syncStatus}`
          }),
          syncStatus === 'synced' ? 'All changes saved' :
          syncStatus === 'syncing' ? 'Syncing...' :
          syncStatus === 'error' ? 'Sync error' : 'Not synced'
        ),
        React.createElement(MagneticButton, {
          variant: 'primary',
          onClick: onSync
        },
          React.createElement(Icon, { name: 'refresh-cw', size: 16 }),
          'Sync Now'
        )
      ),

      React.createElement(GlassCard, { className: 'settings-card' },
        React.createElement('h3', null,
          React.createElement(Icon, { name: 'database', size: 20 }),
          'Demo Data'
        ),
        React.createElement('p', null, 'This dashboard is running with demonstration data including 32 tasks, 8 team members, and 3 months of historical metrics.'),
        React.createElement('div', { className: 'demo-stats' },
          React.createElement('div', null, '📊 32 Tasks'),
          React.createElement('div', null, '👥 8 Team Members'),
          React.createElement('div', null, '💰 $250k Budget'),
          React.createElement('div', null, '📅 90 Days History')
        )
      ),

      React.createElement(GlassCard, { className: 'settings-card' },
        React.createElement('h3', null,
          React.createElement(Icon, { name: 'code', size: 20 }),
          'API Endpoints'
        ),
        React.createElement('div', { className: 'api-endpoints' },
          React.createElement('div', { className: 'endpoint' },
            React.createElement('span', { className: 'method' }, 'GET'),
            '/api/community/com.ezgalaxy.projecthub/tasks'
          ),
          React.createElement('div', { className: 'endpoint' },
            React.createElement('span', { className: 'method' }, 'PUT'),
            '/api/community/com.ezgalaxy.projecthub/tasks/{key}'
          ),
          React.createElement('div', { className: 'endpoint' },
            React.createElement('span', { className: 'method' }, 'GET'),
            '/api/community/com.ezgalaxy.projecthub/metrics'
          )
        )
      ),

      React.createElement(GlassCard, { className: 'settings-card wide' },
        React.createElement('h3', null,
          React.createElement(Icon, { name: 'info', size: 20 }),
          'About Project Hub'
        ),
        React.createElement('p', null, 
          'Project Hub is an AI-powered project management dashboard featuring smart Kanban boards, Gantt charts with dependencies, resource workload matrices, predictive analytics, and risk analysis.'
        ),
        React.createElement('div', { className: 'features-list' },
          React.createElement('div', { className: 'feature' },
            React.createElement(Icon, { name: 'kanban', size: 16 }),
            'Smart Kanban with velocity tracking'
          ),
          React.createElement('div', { className: 'feature' },
            React.createElement(Icon, { name: 'gantt-chart', size: 16 }),
            'HD Gantt with dependencies'
          ),
          React.createElement('div', { className: 'feature' },
            React.createElement(Icon, { name: 'users', size: 16 }),
            'Workload matrix with burnout alerts'
          ),
          React.createElement('div', { className: 'feature' },
            React.createElement(Icon, { name: 'sparkles', size: 16 }),
            'AI predictions & risk analysis'
          ),
          React.createElement('div', { className: 'feature' },
            React.createElement(Icon, { name: 'line-chart', size: 16 }),
            'Recharts visualizations'
          ),
          React.createElement('div', { className: 'feature' },
            React.createElement(Icon, { name: 'cloud', size: 16 }),
            'Community Data API sync'
          )
        )
      )
    )
  );
};

// ============================================================================
// MAIN APPLICATION
// ============================================================================
const App = () => {
  // State
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tasks, setTasks] = useState(DEMO_DATA.tasks);
  const [collaborators] = useState(DEMO_DATA.collaborators);
  const [financials] = useState(DEMO_DATA.financials);
  const [history] = useState(DEMO_DATA.history);
  const [project] = useState(DEMO_DATA.project);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [isLoading, setIsLoading] = useState(true);

  // Computed values
  const prediction = useMemo(() => 
    PredictionEngine.predictCompletionDate(tasks, history),
    [tasks, history]
  );

  const risks = useMemo(() => 
    RiskAnalyzer.analyzeProject(tasks, collaborators, financials, project),
    [tasks, collaborators, financials, project]
  );

  const sentiment = useMemo(() => 
    SentimentCalculator.calculate(tasks, collaborators, history),
    [tasks, collaborators, history]
  );

  // Data object
  const data = useMemo(() => ({
    tasks, collaborators, financials, history, project
  }), [tasks, collaborators, financials, history, project]);

  // Sync with API
  const syncWithAPI = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      // Save tasks
      await api.saveRecord(CONFIG.COLLECTIONS.TASKS, 'all-tasks', { tasks });
      
      // Save metrics
      const metrics = {
        lastSync: new Date().toISOString(),
        prediction,
        sentiment,
        risksCount: risks.length
      };
      await api.saveRecord(CONFIG.COLLECTIONS.METRICS, 'current', metrics);
      
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
    }
  }, [tasks, prediction, sentiment, risks]);

  // Debounced sync
  const debouncedSync = useMemo(
    () => debounce(syncWithAPI, CONFIG.SYNC_DEBOUNCE),
    [syncWithAPI]
  );

  // Auto-sync on task changes
  useEffect(() => {
    if (!isLoading) {
      debouncedSync();
    }
  }, [tasks, debouncedSync, isLoading]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      // Load authorization file
      try {
        const authResponse = await fetch('./ezgalaxy-authorization.json');
        const auth = await authResponse.json();
        console.log('[Project Hub] Authorization loaded:', auth.capabilities.map(c => c.name));
      } catch (e) {
        console.warn('[Project Hub] Could not load authorization file');
      }

      // Try to load saved data
      try {
        const saved = await api.getRecord(CONFIG.COLLECTIONS.TASKS, 'all-tasks');
        if (saved && saved.data && saved.data.tasks) {
          setTasks(saved.data.tasks);
        }
      } catch (e) {
        console.log('[Project Hub] Using demo data');
      }

      setIsLoading(false);
    };

    // Simulate loading for smooth animation
    setTimeout(init, 800);
  }, []);

  // Render loading state
  if (isLoading) {
    return React.createElement('div', { className: 'loading-screen' },
      React.createElement(motion.div, {
        className: 'loading-logo',
        animate: { rotate: 360 },
        transition: { duration: 2, repeat: Infinity, ease: 'linear' }
      }, '🚀'),
      React.createElement('h1', null, 'Project Hub'),
      React.createElement('p', null, 'Loading your dashboard...'),
      React.createElement(SkeletonLoader, { width: 200, height: 4 })
    );
  }

  // Render main app
  return React.createElement('div', { className: 'app' },
    React.createElement(Sidebar, {
      activeView,
      setActiveView,
      collapsed: sidebarCollapsed,
      setCollapsed: setSidebarCollapsed
    }),
    React.createElement('main', { className: 'main-content' },
      React.createElement(AnimatePresence, { mode: 'wait' },
        activeView === 'dashboard' && React.createElement(motion.div, {
          key: 'dashboard',
          initial: { opacity: 0, x: 20 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -20 }
        }, React.createElement(DashboardView, { data, prediction, risks, sentiment })),

        activeView === 'kanban' && React.createElement(motion.div, {
          key: 'kanban',
          initial: { opacity: 0, x: 20 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -20 }
        },
          React.createElement('h2', { className: 'view-title' },
            React.createElement(Icon, { name: 'kanban', size: 28 }),
            'Smart Kanban Board'
          ),
          React.createElement(KanbanBoard, { tasks, setTasks, collaborators })
        ),

        activeView === 'gantt' && React.createElement(motion.div, {
          key: 'gantt',
          initial: { opacity: 0, x: 20 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -20 }
        },
          React.createElement('h2', { className: 'view-title' },
            React.createElement(Icon, { name: 'gantt-chart', size: 28 }),
            'Gantt Timeline'
          ),
          React.createElement(GanttChart, { tasks, collaborators })
        ),

        activeView === 'workload' && React.createElement(motion.div, {
          key: 'workload',
          initial: { opacity: 0, x: 20 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -20 }
        },
          React.createElement('h2', { className: 'view-title' },
            React.createElement(Icon, { name: 'users', size: 28 }),
            'Resource Workload'
          ),
          React.createElement(WorkloadMatrix, { collaborators, tasks })
        ),

        activeView === 'analytics' && React.createElement(motion.div, {
          key: 'analytics',
          initial: { opacity: 0, x: 20 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -20 }
        }, React.createElement(AnalyticsView, { data })),

        activeView === 'settings' && React.createElement(motion.div, {
          key: 'settings',
          initial: { opacity: 0, x: 20 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -20 }
        }, React.createElement(SettingsView, { onSync: syncWithAPI, syncStatus }))
      )
    )
  );
};

// Mount application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
