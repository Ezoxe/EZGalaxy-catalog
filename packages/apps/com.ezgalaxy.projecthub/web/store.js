/* ═══════════════════════════════════════════════════════════════
   Project Hub — Store (State Management + Cloud Persistence)
   v2.0.0 — Pure vanilla JS pub/sub store with Community Data API
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const EXTENSION_ID = 'com.ezgalaxy.projecthub';
  const LS_STATE = 'projecthub_state';
  const LS_AUTH = 'projecthub_auth';
  const SAVE_DEBOUNCE = 800;
  const MAX_UNDO = 30;

  /* ── Locale strings ─────────────────────────────────────── */
  const i18n = {
    fr: {
      dashboard: 'Tableau de bord', kanban: 'Kanban', timeline: 'Chronologie',
      team: 'Équipe', budget: 'Budget', analytics: 'Analytique',
      activity: 'Activité', settings: 'Paramètres', ai: 'Assistant IA',
      backlog: 'Backlog', todo: 'À faire', 'in-progress': 'En cours',
      review: 'Revue', done: 'Terminé', blocked: 'Bloqué',
      critical: 'Critique', high: 'Haute', medium: 'Moyenne', low: 'Basse',
      save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer',
      createTask: 'Créer une tâche', editTask: 'Modifier la tâche',
      search: 'Rechercher…', noResults: 'Aucun résultat',
      loginTitle: 'Connexion Cloud', email: 'Email', password: 'Mot de passe',
      login: 'Se connecter', logout: 'Déconnexion',
      syncing: 'Synchronisation…', synced: 'Synchronisé', offline: 'Hors ligne',
      error: 'Erreur', loading: 'Chargement…',
      today: "Aujourd'hui", yesterday: 'Hier', daysAgo: 'il y a {n} jours',
      hoursAgo: 'il y a {n}h', minutesAgo: 'il y a {n}min', justNow: "À l'instant",
      sprintGoal: 'Objectif Sprint', riskScore: 'Score de risque',
      predictedEnd: 'Fin prédite', velocityTrend: 'Tendance vélocité',
      totalTasks: 'Total tâches', completionRate: 'Taux de complétion',
      budgetUsed: 'Budget utilisé', teamLoad: "Charge d'équipe",
      addTask: 'Ajouter une tâche', quickAdd: 'Décrivez votre tâche en langage naturel…',
      exportData: 'Exporter', importData: 'Importer', resetData: 'Réinitialiser',
      demoMode: 'Mode démo', cloudSync: 'Synchronisation cloud',
      appearance: 'Apparence', notifications: 'Notifications',
      language: 'Langue', shortcuts: 'Raccourcis clavier',
      undo: 'Annuler', redo: 'Rétablir',
      overloaded: 'Surchargé', available: 'Disponible', busy: 'Occupé',
      noTasks: 'Aucune tâche', emptyKanban: 'Glissez des tâches ici',
      confirmDelete: 'Êtes-vous sûr de vouloir supprimer ?',
      wipLimit: 'Limite WIP atteinte', aiInsights: 'Insights IA',
      sprintSuccess: 'Probabilité de succès du sprint',
      riskAnalysis: 'Analyse des risques', recommendation: 'Recommandation',
      focusToday: 'Focus du jour', planningSprint: 'Planification sprint',
      projectName: 'Nom du projet', sprint: 'Sprint', velocity: 'Vélocité',
      burnRate: 'Burn Rate', remaining: 'Restant', spent: 'Dépensé',
      total: 'Total', active: 'Actif', newTask: 'Nouvelle tâche',
      dashboardView: 'Tableau de bord', kanbanView: 'Kanban', timelineView: 'Chronologie',
      teamView: 'Équipe', budgetView: 'Budget', analyticsView: 'Analytique',
      activityView: 'Activité', settingsView: 'Paramètres', aiAssistant: 'Assistant IA',
      tasksDone: 'Tâches terminées', inProgress: 'En cours', overdue: 'En retard',
      sprintProgress: 'Progression Sprint', todaysFocus: 'Focus du jour',
      risks: 'Risques', distribution: 'Distribution', recentActivity: 'Activité récente',
      taskMoved: 'Tâche déplacée', emptyColumn: 'Glissez des tâches ici',
      taskCreated: 'Tâche créée !', totalBudget: 'Budget total',
      budgetUsage: 'Utilisation budget', forecast: 'Prévisions',
      statusDistribution: 'Distribution statuts', addMember: 'Ajouter',
      completedTasks: 'Terminées', inProgressTasks: 'En cours', overdueTasks: 'En retard',
      allStatuses: 'Tous les statuts', allPriorities: 'Toutes les priorités',
      allAssignees: 'Tous les membres', allCategories: 'Toutes les catégories',
      title: 'Titre', description: 'Description', status: 'Statut',
      priority: 'Priorité', category: 'Catégorie', assignee: 'Assigné à',
      dueDate: 'Date limite', startDate: 'Date début', estimate: 'Estimation (h)',
      progress: 'Progression', tags: 'Tags', subtasks: 'Sous-tâches',
      dependencies: 'Dépendances', close: 'Fermer', confirm: 'Confirmer',
      selectStatus: 'Sélectionner le statut', selectPriority: 'Sélectionner la priorité',
      noDueDate: 'Pas de date limite', noAssignee: 'Non assigné',
      cmdPalette: 'Palette de commandes', goTo: 'Aller à',
      categories: { design: 'Design', frontend: 'Frontend', backend: 'Backend', devops: 'DevOps', testing: 'Tests', docs: 'Documentation', research: 'Recherche', management: 'Gestion' },
    },
    en: {
      dashboard: 'Dashboard', kanban: 'Kanban', timeline: 'Timeline',
      team: 'Team', budget: 'Budget', analytics: 'Analytics',
      activity: 'Activity', settings: 'Settings', ai: 'AI Assistant',
      backlog: 'Backlog', todo: 'To Do', 'in-progress': 'In Progress',
      review: 'Review', done: 'Done', blocked: 'Blocked',
      critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
      save: 'Save', cancel: 'Cancel', delete: 'Delete',
      createTask: 'Create Task', editTask: 'Edit Task',
      search: 'Search…', noResults: 'No results',
      loginTitle: 'Cloud Login', email: 'Email', password: 'Password',
      login: 'Log in', logout: 'Log out',
      syncing: 'Syncing…', synced: 'Synced', offline: 'Offline',
      error: 'Error', loading: 'Loading…',
      today: 'Today', yesterday: 'Yesterday', daysAgo: '{n} days ago',
      hoursAgo: '{n}h ago', minutesAgo: '{n}min ago', justNow: 'Just now',
      sprintGoal: 'Sprint Goal', riskScore: 'Risk Score',
      predictedEnd: 'Predicted End', velocityTrend: 'Velocity Trend',
      totalTasks: 'Total Tasks', completionRate: 'Completion Rate',
      budgetUsed: 'Budget Used', teamLoad: 'Team Load',
      addTask: 'Add Task', quickAdd: 'Describe your task in natural language…',
      exportData: 'Export', importData: 'Import', resetData: 'Reset',
      demoMode: 'Demo Mode', cloudSync: 'Cloud Sync',
      appearance: 'Appearance', notifications: 'Notifications',
      language: 'Language', shortcuts: 'Keyboard Shortcuts',
      undo: 'Undo', redo: 'Redo',
      overloaded: 'Overloaded', available: 'Available', busy: 'Busy',
      noTasks: 'No tasks', emptyKanban: 'Drag tasks here',
      confirmDelete: 'Are you sure you want to delete?',
      wipLimit: 'WIP limit reached', aiInsights: 'AI Insights',
      sprintSuccess: 'Sprint success probability',
      riskAnalysis: 'Risk Analysis', recommendation: 'Recommendation',
      focusToday: "Today's Focus", planningSprint: 'Sprint Planning',
      projectName: 'Project Name', sprint: 'Sprint', velocity: 'Velocity',
      burnRate: 'Burn Rate', remaining: 'Remaining', spent: 'Spent',
      total: 'Total', active: 'Active', newTask: 'New Task',
      dashboardView: 'Dashboard', kanbanView: 'Kanban', timelineView: 'Timeline',
      teamView: 'Team', budgetView: 'Budget', analyticsView: 'Analytics',
      activityView: 'Activity', settingsView: 'Settings', aiAssistant: 'AI Assistant',
      tasksDone: 'Tasks Done', inProgress: 'In Progress', overdue: 'Overdue',
      sprintProgress: 'Sprint Progress', todaysFocus: "Today's Focus",
      risks: 'Risks', distribution: 'Distribution', recentActivity: 'Recent Activity',
      taskMoved: 'Task moved', emptyColumn: 'Drag tasks here',
      taskCreated: 'Task created!', totalBudget: 'Total Budget',
      budgetUsage: 'Budget Usage', forecast: 'Forecast',
      statusDistribution: 'Status Distribution', addMember: 'Add member',
      completedTasks: 'Completed', inProgressTasks: 'In Progress', overdueTasks: 'Overdue',
      allStatuses: 'All statuses', allPriorities: 'All priorities',
      allAssignees: 'All members', allCategories: 'All categories',
      title: 'Title', description: 'Description', status: 'Status',
      priority: 'Priority', category: 'Category', assignee: 'Assigned to',
      dueDate: 'Due date', startDate: 'Start date', estimate: 'Estimate (h)',
      progress: 'Progress', tags: 'Tags', subtasks: 'Subtasks',
      dependencies: 'Dependencies', close: 'Close', confirm: 'Confirm',
      selectStatus: 'Select status', selectPriority: 'Select priority',
      noDueDate: 'No due date', noAssignee: 'Unassigned',
      cmdPalette: 'Command palette', goTo: 'Go to',
      categories: { design: 'Design', frontend: 'Frontend', backend: 'Backend', devops: 'DevOps', testing: 'Testing', docs: 'Documentation', research: 'Research', management: 'Management' },
    }
  };

  /* ── Default state / seed data ──────────────────────────── */
  function generateId() { return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }

  function defaultSettings() {
    return {
      language: 'fr', theme: 'neon-blue', animations: true, compactMode: false,
      useDemoData: true, autoSave: true, soundEnabled: false,
      kanbanWipLimits: { 'in-progress': 5, review: 3 },
      sidebarCollapsed: false,
    };
  }

  function seedDemoCollaborators() {
    return [
      { id: 'c1', name: 'Alice Martin', role: 'Lead Developer', avatar: '👩‍💻', skills: ['React', 'Node.js', 'TypeScript', 'GraphQL'], capacity: 40, workload: 85, status: 'active', color: '#00d4ff' },
      { id: 'c2', name: 'Bob Chen', role: 'Backend Engineer', avatar: '👨‍💻', skills: ['Python', 'Django', 'PostgreSQL', 'Redis'], capacity: 40, workload: 72, status: 'active', color: '#a855f7' },
      { id: 'c3', name: 'Clara Dubois', role: 'UX Designer', avatar: '🎨', skills: ['Figma', 'CSS', 'User Research', 'Prototyping'], capacity: 40, workload: 95, status: 'active', color: '#ec4899' },
      { id: 'c4', name: 'David Kim', role: 'DevOps Engineer', avatar: '🔧', skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'], capacity: 40, workload: 60, status: 'active', color: '#f59e0b' },
      { id: 'c5', name: 'Eva Schmidt', role: 'QA Engineer', avatar: '🔍', skills: ['Selenium', 'Jest', 'Cypress', 'Performance'], capacity: 40, workload: 78, status: 'active', color: '#10b981' },
      { id: 'c6', name: 'François Petit', role: 'Product Manager', avatar: '📋', skills: ['Agile', 'Scrum', 'Jira', 'Analytics'], capacity: 40, workload: 110, status: 'active', color: '#6366f1' },
      { id: 'c7', name: 'Grace Liu', role: 'Frontend Developer', avatar: '🌟', skills: ['Vue.js', 'Tailwind', 'WebGL', 'Animation'], capacity: 40, workload: 68, status: 'active', color: '#f43f5e' },
      { id: 'c8', name: 'Hugo Moreau', role: 'Data Analyst', avatar: '📊', skills: ['SQL', 'Python', 'Tableau', 'Machine Learning'], capacity: 40, workload: 45, status: 'active', color: '#06b6d4' },
    ];
  }

  function seedDemoTasks() {
    const now = new Date();
    const d = (off) => { const dt = new Date(now); dt.setDate(dt.getDate() + off); return dt.toISOString().slice(0, 10); };
    return [
      { id: 't1', title: "Refonte page d'accueil", description: 'Redesign complet de la landing page avec animations modernes', status: 'done', priority: 'high', category: 'design', assignee: 'c3', estimateHours: 16, spentHours: 18, startDate: d(-14), dueDate: d(-2), completedDate: d(-1), progress: 100, dependencies: [], tags: ['ui', 'redesign'], comments: 3, subtasks: [{ title: 'Maquettes Figma', done: true }, { title: 'Responsive design', done: true }, { title: 'Review client', done: true }] },
      { id: 't2', title: "API d'authentification", description: 'Système JWT avec refresh token', status: 'done', priority: 'critical', category: 'backend', assignee: 'c2', estimateHours: 24, spentHours: 22, startDate: d(-21), dueDate: d(-7), completedDate: d(-6), progress: 100, dependencies: [], tags: ['api', 'security'], comments: 5, subtasks: [{ title: 'Login endpoint', done: true }, { title: 'Refresh token', done: true }, { title: 'Tests unitaires', done: true }] },
      { id: 't3', title: 'Dashboard analytique', description: 'Tableaux de bord avec graphiques temps réel et KPIs', status: 'in-progress', priority: 'high', category: 'frontend', assignee: 'c1', estimateHours: 32, spentHours: 20, startDate: d(-10), dueDate: d(5), progress: 62, dependencies: ['t2'], tags: ['dashboard', 'charts'], comments: 7, subtasks: [{ title: 'Composants graphiques', done: true }, { title: 'Connexion API', done: true }, { title: 'Widgets personnalisables', done: false }, { title: 'Export PDF', done: false }] },
      { id: 't4', title: 'Pipeline CI/CD', description: 'GitHub Actions avec déploiement automatique', status: 'in-progress', priority: 'high', category: 'devops', assignee: 'c4', estimateHours: 20, spentHours: 12, startDate: d(-7), dueDate: d(3), progress: 55, dependencies: [], tags: ['cicd', 'automation'], comments: 2, subtasks: [{ title: 'Build pipeline', done: true }, { title: 'Tests auto', done: true }, { title: 'Deploy staging', done: false }, { title: 'Deploy prod', done: false }] },
      { id: 't5', title: "Tests d'intégration", description: 'Suite complète de tests e2e avec Cypress', status: 'in-progress', priority: 'medium', category: 'testing', assignee: 'c5', estimateHours: 28, spentHours: 14, startDate: d(-5), dueDate: d(8), progress: 45, dependencies: ['t3'], tags: ['testing', 'e2e'], comments: 1, subtasks: [{ title: 'Setup Cypress', done: true }, { title: 'Tests auth flow', done: true }, { title: 'Tests dashboard', done: false }, { title: 'Tests settings', done: false }] },
      { id: 't6', title: 'Documentation API', description: 'Documentation Swagger/OpenAPI complète', status: 'todo', priority: 'medium', category: 'docs', assignee: 'c2', estimateHours: 12, spentHours: 0, startDate: d(2), dueDate: d(12), progress: 0, dependencies: ['t2'], tags: ['docs', 'api'], comments: 0, subtasks: [] },
      { id: 't7', title: 'Optimisation performance', description: 'Lazy loading, code splitting et optimisation bundle', status: 'todo', priority: 'medium', category: 'frontend', assignee: 'c7', estimateHours: 18, spentHours: 0, startDate: d(3), dueDate: d(10), progress: 0, dependencies: ['t3'], tags: ['performance'], comments: 0, subtasks: [] },
      { id: 't8', title: 'Système de notifications', description: 'Push notifications + centre in-app', status: 'todo', priority: 'high', category: 'frontend', assignee: 'c1', estimateHours: 20, spentHours: 0, startDate: d(5), dueDate: d(14), progress: 0, dependencies: ['t3'], tags: ['notifications', 'ux'], comments: 1, subtasks: [] },
      { id: 't9', title: 'Module de rapports', description: 'Rapports PDF/Excel automatisés', status: 'backlog', priority: 'low', category: 'backend', assignee: 'c8', estimateHours: 30, spentHours: 0, startDate: null, dueDate: d(25), progress: 0, dependencies: ['t3'], tags: ['reports'], comments: 0, subtasks: [] },
      { id: 't10', title: 'Migration PostgreSQL', description: 'Migration MySQL → PostgreSQL zero downtime', status: 'blocked', priority: 'critical', category: 'backend', assignee: 'c2', estimateHours: 40, spentHours: 8, startDate: d(-3), dueDate: d(7), progress: 15, dependencies: ['t4'], tags: ['database', 'migration'], comments: 4, subtasks: [{ title: 'Script migration', done: true }, { title: 'Test rollback', done: false }, { title: 'Migration prod', done: false }] },
      { id: 't11', title: 'Design System', description: 'Design system complet avec Storybook', status: 'review', priority: 'high', category: 'design', assignee: 'c3', estimateHours: 24, spentHours: 22, startDate: d(-12), dueDate: d(0), progress: 90, dependencies: [], tags: ['design-system'], comments: 6, subtasks: [{ title: 'Tokens design', done: true }, { title: 'Composants UI', done: true }, { title: 'Documentation', done: false }] },
      { id: 't12', title: 'Audit sécurité', description: 'Audit complet + corrections critiques', status: 'review', priority: 'critical', category: 'testing', assignee: 'c5', estimateHours: 16, spentHours: 14, startDate: d(-8), dueDate: d(1), progress: 85, dependencies: ['t2'], tags: ['security'], comments: 3, subtasks: [{ title: 'Scan vulnérabilités', done: true }, { title: 'Pentest', done: true }, { title: 'Rapport final', done: false }] },
      { id: 't13', title: 'Micro-interactions UI', description: 'Animations transitions fluides', status: 'in-progress', priority: 'medium', category: 'frontend', assignee: 'c7', estimateHours: 14, spentHours: 8, startDate: d(-4), dueDate: d(6), progress: 50, dependencies: ['t11'], tags: ['animation', 'ux'], comments: 2, subtasks: [{ title: 'Transitions pages', done: true }, { title: 'Hover effects', done: false }, { title: 'Loading states', done: false }] },
      { id: 't14', title: 'Analytics utilisateurs', description: 'Tracking et dashboards analytics', status: 'backlog', priority: 'low', category: 'backend', assignee: 'c8', estimateHours: 22, spentHours: 0, startDate: null, dueDate: d(30), progress: 0, dependencies: ['t3'], tags: ['analytics'], comments: 0, subtasks: [] },
      { id: 't15', title: 'Internationalisation i18n', description: 'Support multilingue FR/EN/ES', status: 'todo', priority: 'medium', category: 'frontend', assignee: 'c7', estimateHours: 16, spentHours: 0, startDate: d(8), dueDate: d(18), progress: 0, dependencies: ['t11'], tags: ['i18n'], comments: 0, subtasks: [] },
      { id: 't16', title: 'Webhook API', description: 'Webhooks pour intégrations tierces', status: 'backlog', priority: 'low', category: 'backend', assignee: 'c2', estimateHours: 18, spentHours: 0, startDate: null, dueDate: d(35), progress: 0, dependencies: ['t2', 't6'], tags: ['api', 'webhooks'], comments: 0, subtasks: [] },
      { id: 't17', title: 'Monitoring & Alerting', description: 'Grafana + Prometheus + alertes Slack', status: 'todo', priority: 'high', category: 'devops', assignee: 'c4', estimateHours: 16, spentHours: 0, startDate: d(4), dueDate: d(11), progress: 0, dependencies: ['t4'], tags: ['monitoring'], comments: 0, subtasks: [] },
      { id: 't18', title: 'Onboarding utilisateurs', description: 'Tutoriel interactif et guide', status: 'backlog', priority: 'medium', category: 'design', assignee: 'c3', estimateHours: 14, spentHours: 0, startDate: null, dueDate: d(28), progress: 0, dependencies: ['t11', 't15'], tags: ['onboarding'], comments: 0, subtasks: [] },
      { id: 't19', title: 'Cache Redis', description: 'Cache layer pour requêtes fréquentes', status: 'todo', priority: 'medium', category: 'backend', assignee: 'c2', estimateHours: 12, spentHours: 0, startDate: d(6), dueDate: d(13), progress: 0, dependencies: ['t10'], tags: ['cache', 'performance'], comments: 0, subtasks: [] },
      { id: 't20', title: 'Thèmes multiples', description: 'Mode sombre avancé + transitions', status: 'backlog', priority: 'low', category: 'frontend', assignee: 'c7', estimateHours: 10, spentHours: 0, startDate: null, dueDate: d(22), progress: 0, dependencies: ['t11'], tags: ['theme'], comments: 0, subtasks: [] },
    ];
  }

  function seedDemoBudget() {
    return {
      total: 250000, spent: 142500,
      categories: [
        { name: 'Développement', allocated: 100000, spent: 62000, color: '#00d4ff' },
        { name: 'Design', allocated: 40000, spent: 28000, color: '#a855f7' },
        { name: 'Infrastructure', allocated: 35000, spent: 22000, color: '#10b981' },
        { name: 'Testing', allocated: 30000, spent: 15500, color: '#f59e0b' },
        { name: 'Gestion', allocated: 25000, spent: 10000, color: '#ec4899' },
        { name: 'Divers', allocated: 20000, spent: 5000, color: '#6366f1' },
      ],
      monthly: [
        { month: 'Sep', planned: 18000, actual: 16500 }, { month: 'Oct', planned: 22000, actual: 24800 },
        { month: 'Nov', planned: 25000, actual: 23200 }, { month: 'Dec', planned: 28000, actual: 31500 },
        { month: 'Jan', planned: 30000, actual: 28900 }, { month: 'Fév', planned: 25000, actual: 17600 },
      ]
    };
  }

  function seedDemoActivity() {
    const now = Date.now();
    const h = (hrs) => new Date(now - hrs * 3600000).toISOString();
    return [
      { id: 'a1', type: 'completed', user: 'c3', taskId: 't1', message: "Refonte page d'accueil terminée", timestamp: h(1) },
      { id: 'a2', type: 'comment', user: 'c1', taskId: 't3', message: '3 widgets personnalisables ajoutés', timestamp: h(2) },
      { id: 'a3', type: 'started', user: 'c4', taskId: 't4', message: 'Pipeline CI/CD démarré', timestamp: h(4) },
      { id: 'a4', type: 'moved', user: 'c5', taskId: 't12', message: 'Audit sécurité → Revue', timestamp: h(6) },
      { id: 'a5', type: 'created', user: 'c6', taskId: 't17', message: 'Monitoring & Alerting créé', timestamp: h(8) },
      { id: 'a6', type: 'blocked', user: 'c2', taskId: 't10', message: 'Migration bloquée en attente du pipeline', timestamp: h(12) },
      { id: 'a7', type: 'review', user: 'c3', taskId: 't11', message: 'Design System prêt pour revue', timestamp: h(18) },
      { id: 'a8', type: 'completed', user: 'c2', taskId: 't2', message: "API d'authentification finalisée", timestamp: h(24) },
      { id: 'a9', type: 'comment', user: 'c7', taskId: 't13', message: 'Animations de transition ajoutées', timestamp: h(36) },
      { id: 'a10', type: 'started', user: 'c5', taskId: 't5', message: "Tests d'intégration démarrés", timestamp: h(48) },
      { id: 'a11', type: 'milestone', user: 'c6', taskId: null, message: 'Sprint 12 démarré — objectif: 85%', timestamp: h(72) },
    ];
  }

  function seedDemoHistory() {
    const entries = [];
    const now = new Date();
    for (let i = 90; i >= 0; i--) {
      const dt = new Date(now); dt.setDate(dt.getDate() - i);
      entries.push({
        date: dt.toISOString().slice(0, 10),
        velocity: Math.round(12 + Math.sin(i * 0.1) * 4 + Math.random() * 3),
        morale: Math.round(70 + Math.sin(i * 0.07) * 10 + Math.random() * 8),
        burndown: Math.max(0, Math.round(200 - (90 - i) * 1.8 + Math.random() * 8 - 4)),
        tasksCompleted: Math.floor(Math.random() * 4),
        hoursLogged: Math.round(6 + Math.random() * 3),
      });
    }
    return entries;
  }

  function seedDemoProject() {
    return {
      name: 'Project Phoenix',
      description: 'Refonte complète de la plateforme SaaS nouvelle génération',
      sprint: { number: 12, startDate: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), goal: 'Finaliser le dashboard et le pipeline CI/CD' },
      methodology: 'Agile / Scrum',
      startDate: '2025-09-01',
    };
  }

  function buildDefaultState() {
    return {
      project: seedDemoProject(), tasks: seedDemoTasks(), collaborators: seedDemoCollaborators(),
      budget: seedDemoBudget(), activity: seedDemoActivity(), history: seedDemoHistory(),
      settings: defaultSettings(),
      filters: { status: 'all', priority: 'all', assignee: 'all', search: '', category: 'all' },
      currentView: 'dashboard', cloudStatus: 'disconnected',
      auth: null, notifications: [],
    };
  }

  /* ── State container ────────────────────────────────────── */
  let _state = buildDefaultState();
  let _listeners = [];
  let _undoStack = [];
  let _redoStack = [];
  let _saveTimer = null;
  let _batchDepth = 0;

  /* ── Core Store API ──────────────────────────────────────── */
  function getState() { return _state; }

  function setState(updates, opts = {}) {
    const { silent = false, skipHistory = false, skipSave = false } = opts;
    if (!skipHistory && !silent) {
      _undoStack.push(JSON.parse(JSON.stringify(_state)));
      if (_undoStack.length > MAX_UNDO) _undoStack.shift();
      _redoStack = [];
    }
    Object.assign(_state, updates);
    if (!silent) {
      _persistLocal();
      if (!skipSave) _scheduleCloudSave();
      if (_batchDepth === 0) _notify();
    }
  }

  function _notify() {
    _listeners.forEach(fn => { try { fn(_state); } catch (e) { console.error('[Store] Listener error:', e); } });
  }

  function subscribe(fn) {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(l => l !== fn); };
  }

  function batch(fn) {
    _batchDepth++;
    try { fn(); } finally { _batchDepth--; if (_batchDepth === 0) _notify(); }
  }

  /* ── Undo / Redo ────────────────────────────────────────── */
  function undo() {
    if (!_undoStack.length) return false;
    _redoStack.push(JSON.parse(JSON.stringify(_state)));
    _state = _undoStack.pop();
    _persistLocal(); _notify();
    return true;
  }
  function redo() {
    if (!_redoStack.length) return false;
    _undoStack.push(JSON.parse(JSON.stringify(_state)));
    _state = _redoStack.pop();
    _persistLocal(); _notify();
    return true;
  }

  /* ── Task CRUD ──────────────────────────────────────────── */
  function addTask(data) {
    const task = {
      id: generateId(), title: data.title || 'Nouvelle tâche', description: data.description || '',
      status: data.status || 'todo', priority: data.priority || 'medium', category: data.category || 'frontend',
      assignee: data.assignee || null, estimateHours: data.estimateHours || 0, spentHours: 0,
      startDate: data.startDate || null, dueDate: data.dueDate || null, completedDate: null,
      progress: 0, dependencies: data.dependencies || [], tags: data.tags || [],
      comments: 0, subtasks: data.subtasks || [], createdAt: new Date().toISOString(),
    };
    setState({ tasks: [..._state.tasks, task] });
    _addActivity('created', task.assignee, task.id, `"${task.title}" créée`);
    return task;
  }

  function updateTask(taskId, updates) {
    const old = _state.tasks.find(t => t.id === taskId);
    if (!old) return null;
    const nw = { ...old, ...updates };
    if (updates.status === 'done' && old.status !== 'done') {
      nw.completedDate = new Date().toISOString().slice(0, 10);
      nw.progress = 100;
    }
    setState({ tasks: _state.tasks.map(t => t.id === taskId ? nw : t) });
    if (updates.status && updates.status !== old.status) {
      _addActivity('moved', nw.assignee, taskId, `"${nw.title}" → ${updates.status}`);
    }
    return nw;
  }

  function moveTask(taskId, newStatus) { return updateTask(taskId, { status: newStatus }); }

  function deleteTask(taskId) {
    const task = _state.tasks.find(t => t.id === taskId);
    if (!task) return;
    batch(() => {
      setState({ tasks: _state.tasks.filter(t => t.id !== taskId) });
      _state.tasks.forEach(t => {
        if (t.dependencies && t.dependencies.includes(taskId))
          updateTask(t.id, { dependencies: t.dependencies.filter(d => d !== taskId) });
      });
      _addActivity('deleted', task.assignee, null, `"${task.title}" supprimée`);
    });
  }

  /* ── Collaborator CRUD ──────────────────────────────────── */
  function addCollaborator(data) {
    const c = {
      id: generateId(), name: data.name || 'Nouveau membre', role: data.role || '',
      avatar: data.avatar || '👤', skills: data.skills || [], capacity: data.capacity || 40,
      workload: data.workload || 0, status: 'active', color: data.color || '#00d4ff',
    };
    setState({ collaborators: [..._state.collaborators, c] });
    return c;
  }
  function updateCollaborator(id, u) { setState({ collaborators: _state.collaborators.map(c => c.id === id ? { ...c, ...u } : c) }); }
  function deleteCollaborator(id) { setState({ collaborators: _state.collaborators.filter(c => c.id !== id) }); }

  /* ── Activity ───────────────────────────────────────────── */
  function _addActivity(type, userId, taskId, message) {
    const entry = { id: generateId(), type, user: userId, taskId, message, timestamp: new Date().toISOString() };
    setState({ activity: [entry, ..._state.activity].slice(0, 100) }, { skipHistory: true });
  }

  /* ── Filters & Queries ──────────────────────────────────── */
  function setFilter(key, value) { setState({ filters: { ..._state.filters, [key]: value } }, { skipHistory: true, skipSave: true }); }

  function getFilteredTasks() {
    const f = _state.filters;
    return _state.tasks.filter(t => {
      if (f.status !== 'all' && t.status !== f.status) return false;
      if (f.priority !== 'all' && t.priority !== f.priority) return false;
      if (f.assignee !== 'all' && t.assignee !== f.assignee) return false;
      if (f.category !== 'all' && t.category !== f.category) return false;
      if (f.search) {
        const s = f.search.toLowerCase();
        return t.title.toLowerCase().includes(s) || (t.description || '').toLowerCase().includes(s) || (t.tags || []).some(tag => tag.toLowerCase().includes(s));
      }
      return true;
    });
  }

  function getTask(id) { return _state.tasks.find(t => t.id === id); }
  function getCollaborator(id) { return _state.collaborators.find(c => c.id === id); }

  function getMetrics() {
    const tasks = _state.tasks, total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;
    const completionRate = total ? Math.round((done / total) * 100) : 0;
    const byStatus = {}, byCategory = {}, byPriority = {};
    tasks.forEach(t => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    });
    const totalEstimate = tasks.reduce((s, t) => s + (t.estimateHours || 0), 0);
    const totalSpent = tasks.reduce((s, t) => s + (t.spentHours || 0), 0);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const velocity = tasks.filter(t => t.completedDate && new Date(t.completedDate) >= weekAgo).length;
    const collabs = _state.collaborators;
    const overloaded = collabs.filter(c => c.workload > 100).length;
    const avgWorkload = collabs.length ? Math.round(collabs.reduce((s, c) => s + c.workload, 0) / collabs.length) : 0;
    const budgetUsed = _state.budget.total ? Math.round((_state.budget.spent / _state.budget.total) * 100) : 0;
    return { total, done, inProgress, blocked, overdue, completionRate, velocity, byStatus, byCategory, byPriority, totalEstimate, totalSpent, teamSize: collabs.length, overloaded, avgWorkload, budgetUsed };
  }

  /* ── Translation ────────────────────────────────────────── */
  function t(key, params = {}) {
    const lang = _state.settings.language || 'fr';
    const dict = i18n[lang] || i18n.fr;
    let text = key.split('.').reduce((o, k) => o && o[k], dict) || key;
    Object.entries(params).forEach(([k, v]) => { text = String(text).replace(`{${k}}`, v); });
    return text;
  }

  /* ── Settings ───────────────────────────────────────────── */
  function updateSettings(u) { setState({ settings: { ..._state.settings, ...u } }); }

  /* ── Local persistence ──────────────────────────────────── */
  function _persistLocal() {
    try {
      const data = { project: _state.project, tasks: _state.tasks, collaborators: _state.collaborators, budget: _state.budget, activity: _state.activity.slice(0, 50), history: _state.history, settings: _state.settings };
      const json = JSON.stringify(data);
      const compressed = typeof LZString !== 'undefined' ? LZString.compressToUTF16(json) : json;
      localStorage.setItem(LS_STATE, JSON.stringify({ compressed: typeof LZString !== 'undefined', payload: compressed }));
    } catch (e) { console.warn('[Store] Local save failed:', e.message); }
  }

  function _loadLocal() {
    try {
      const raw = localStorage.getItem(LS_STATE);
      if (!raw) return null;
      const env = JSON.parse(raw);
      let json;
      if (env.compressed && typeof LZString !== 'undefined') json = LZString.decompressFromUTF16(env.payload);
      else if (env.payload && !env.compressed) json = env.payload;
      else json = raw;
      return JSON.parse(json);
    } catch (e) { console.warn('[Store] Local load failed:', e); return null; }
  }

  function _loadAuth() {
    try { const r = localStorage.getItem(LS_AUTH); return r ? JSON.parse(r) : null; } catch { return null; }
  }

  /* ── Cloud persistence ──────────────────────────────────── */

  async function login(email, password) {
    setState({ cloudStatus: 'syncing' }, { silent: true }); _notify();
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Login failed'); }
      const data = await res.json();
      const auth = { token: data.token, user: data.user, loginAt: new Date().toISOString() };
      localStorage.setItem(LS_AUTH, JSON.stringify(auth));
      setState({ auth, cloudStatus: 'connected' }, { skipHistory: true });
      await cloudLoad();
      return auth;
    } catch (e) { setState({ cloudStatus: 'error' }, { skipHistory: true }); throw e; }
  }

  function logout() { localStorage.removeItem(LS_AUTH); setState({ auth: null, cloudStatus: 'disconnected' }, { skipHistory: true }); }

  async function cloudSave() {
    if (!_state.auth) return;
    setState({ cloudStatus: 'syncing' }, { silent: true }); _notify();
    try {
      const collections = {
        tasks: { tasks: _state.tasks }, collaborators: { collaborators: _state.collaborators },
        settings: { settings: _state.settings, project: _state.project },
        history: { history: _state.history.slice(-60), activity: _state.activity.slice(0, 50) },
        metrics: { budget: _state.budget },
      };
      for (const [col, payload] of Object.entries(collections)) {
        const json = JSON.stringify(payload);
        const compressed = typeof LZString !== 'undefined' ? LZString.compressToUTF16(json) : json;
        await ezgalaxy.storage.set(col, 'main', { v: 2, compressed: typeof LZString !== 'undefined', payload: compressed, updatedAt: new Date().toISOString() });
      }
      setState({ cloudStatus: 'connected' }, { silent: true }); _notify();
    } catch (e) { console.error('[Store] Cloud save failed:', e); setState({ cloudStatus: 'error' }, { silent: true }); _notify(); }
  }

  async function cloudLoad() {
    if (!_state.auth) return false;
    setState({ cloudStatus: 'syncing' }, { silent: true }); _notify();
    try {
      const loaded = {};
      for (const col of ['tasks', 'collaborators', 'settings', 'history', 'metrics']) {
        try {
          const record = await ezgalaxy.storage.get(col, 'main');
          if (!record) continue;
          const d = record.data;
          let parsed;
          if (d && d.compressed && typeof LZString !== 'undefined') parsed = JSON.parse(LZString.decompressFromUTF16(d.payload));
          else if (d && d.payload) parsed = typeof d.payload === 'string' ? JSON.parse(d.payload) : d.payload;
          else parsed = d;
          if (parsed) Object.assign(loaded, parsed);
        } catch (e) { console.warn(`[Store] ${col}:`, e); }
      }
      const def = buildDefaultState();
      setState({
        tasks: loaded.tasks || def.tasks, collaborators: loaded.collaborators || def.collaborators,
        settings: { ...defaultSettings(), ...(loaded.settings || {}) },
        project: { ...seedDemoProject(), ...(loaded.project || {}) },
        history: loaded.history || def.history, activity: loaded.activity || def.activity,
        budget: loaded.budget || def.budget, cloudStatus: 'connected',
      }, { skipHistory: true });
      return true;
    } catch (e) { console.error('[Store] Cloud load failed:', e); setState({ cloudStatus: 'error' }, { silent: true }); _notify(); return false; }
  }

  function _scheduleCloudSave() {
    if (!_state.auth || !_state.settings.autoSave) return;
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => cloudSave().catch(() => {}), SAVE_DEBOUNCE);
  }

  /* ── Data import / export ───────────────────────────────── */
  function exportData() {
    const data = { project: _state.project, tasks: _state.tasks, collaborators: _state.collaborators, budget: _state.budget, activity: _state.activity, settings: _state.settings, exportedAt: new Date().toISOString(), version: '2.0.0' };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `projecthub-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return json;
  }

  function importData(json) {
    try {
      const d = typeof json === 'string' ? JSON.parse(json) : json;
      const u = {};
      if (d.tasks) u.tasks = d.tasks;
      if (d.collaborators) u.collaborators = d.collaborators;
      if (d.budget) u.budget = d.budget;
      if (d.project) u.project = d.project;
      if (d.settings) u.settings = { ...defaultSettings(), ...d.settings };
      if (d.activity) u.activity = d.activity;
      setState(u);
      return true;
    } catch (e) { console.error('[Store] Import failed:', e); return false; }
  }

  function resetToDemo() { _state = buildDefaultState(); _undoStack = []; _redoStack = []; _persistLocal(); _notify(); }

  function clearAllData() {
    localStorage.removeItem(LS_STATE); localStorage.removeItem(LS_AUTH);
    const e = buildDefaultState(); e.tasks = []; e.collaborators = []; e.activity = []; e.settings.useDemoData = false;
    _state = e; _undoStack = []; _redoStack = []; _notify();
  }

  /* ── Initialization ─────────────────────────────────────── */
  (function init() {
    const savedAuth = _loadAuth();
    const savedData = _loadLocal();
    if (savedData) {
      const def = buildDefaultState();
      _state = { ...def, ...savedData, settings: { ...defaultSettings(), ...(savedData.settings || {}) }, filters: def.filters, currentView: 'dashboard', cloudStatus: savedAuth ? 'connected' : 'disconnected', auth: savedAuth, notifications: [] };
    } else if (savedAuth) { _state.auth = savedAuth; _state.cloudStatus = 'connected'; }
    if (_state.auth) cloudLoad().catch(() => {});
    console.log('[Store] Init — ' + _state.tasks.length + ' tasks, cloud: ' + _state.cloudStatus);
  })();

  /* ── Public API ─────────────────────────────────────────── */
  function setToken(token) {
    const auth = { token, loginAt: new Date().toISOString() };
    localStorage.setItem(LS_AUTH, JSON.stringify(auth));
    setState({ auth, cloudStatus: 'connected' }, { skipHistory: true });
  }

  window.Store = {
    getState, setState, subscribe, batch, undo, redo,
    addTask, updateTask, moveTask, deleteTask,
    addCollaborator, updateCollaborator, deleteCollaborator,
    getTask, getCollaborator, getMetrics, getFilteredTasks, setFilter,
    updateSettings, login, logout, cloudSave, cloudLoad, setToken,
    exportData, importData, resetToDemo, clearAllData,
    t, i18n, generateId,
  };
})();
