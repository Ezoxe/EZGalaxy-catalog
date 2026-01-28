/**
 * Project Hub - Main Application
 * Modern project management dashboard
 */

(function() {
    'use strict';

    var currentView = 'dashboard';
    var mainContent = null;
    var navItems = null;

    // Navigation items
    var navigation = [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'kanban', label: 'Kanban', icon: 'kanban' },
        { id: 'timeline', label: 'Timeline', icon: 'timeline' },
        { id: 'team', label: 'Team', icon: 'team' },
        { id: 'budget', label: 'Budget', icon: 'budget' },
        { id: 'analytics', label: 'Analytics', icon: 'analytics' },
        { id: 'activity', label: 'Activity', icon: 'activity' },
        { id: 'settings', label: 'Settings', icon: 'settings' }
    ];

    // Initialize the application
    function init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setup);
        } else {
            setup();
        }
    }

    function setup() {
        // Clear and build the app
        var root = document.getElementById('root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'root';
            document.body.appendChild(root);
        }
        root.innerHTML = '';

        // Create layout
        var layout = document.createElement('div');
        layout.className = 'app-layout';
        layout.innerHTML = '<aside class="sidebar"></aside><main class="main-content"></main>';
        root.appendChild(layout);

        // Build sidebar
        var sidebar = layout.querySelector('.sidebar');
        buildSidebar(sidebar);

        // Main content area
        mainContent = layout.querySelector('.main-content');

        // Subscribe to state changes
        Store.subscribe(function() {
            renderCurrentView();
        });

        // Initial render
        renderCurrentView();

        // Show welcome toast
        setTimeout(function() {
            UI.toast('Welcome to Project Hub! 🚀', 'success');
        }, 500);
    }

    function buildSidebar(sidebar) {
        // Logo
        var logo = document.createElement('div');
        logo.className = 'sidebar-logo';
        logo.innerHTML = '<span class="logo-icon">🚀</span><span class="logo-text">Project Hub</span>';
        sidebar.appendChild(logo);

        // Navigation
        var nav = document.createElement('nav');
        nav.className = 'sidebar-nav';
        navItems = {};

        navigation.forEach(function(item) {
            var navItem = document.createElement('button');
            navItem.className = 'nav-item' + (currentView === item.id ? ' active' : '');
            navItem.dataset.view = item.id;
            navItem.innerHTML = '<span class="nav-icon"></span><span class="nav-label">' + item.label + '</span>';
            navItem.querySelector('.nav-icon').appendChild(UI.icon(item.icon, 20));

            navItem.addEventListener('click', function() {
                navigateTo(item.id);
            });

            navItems[item.id] = navItem;
            nav.appendChild(navItem);
        });

        sidebar.appendChild(nav);

        // User section at bottom
        var userSection = document.createElement('div');
        userSection.className = 'sidebar-user';
        userSection.innerHTML = '<div class="user-avatar">👤</div>' +
            '<div class="user-info"><div class="user-name">John Doe</div><div class="user-role">Project Manager</div></div>';
        sidebar.appendChild(userSection);
    }

    function navigateTo(viewId) {
        if (currentView === viewId) return;

        // Update active nav item
        if (navItems[currentView]) {
            navItems[currentView].classList.remove('active');
        }
        if (navItems[viewId]) {
            navItems[viewId].classList.add('active');
        }

        currentView = viewId;

        // Animate transition
        mainContent.style.opacity = '0';
        mainContent.style.transform = 'translateY(20px)';

        setTimeout(function() {
            renderCurrentView();
            mainContent.style.opacity = '1';
            mainContent.style.transform = 'translateY(0)';
        }, 150);
    }

    function renderCurrentView() {
        if (!mainContent) return;

        var viewRenderer = Views[currentView];
        if (viewRenderer) {
            viewRenderer(mainContent);
        } else {
            mainContent.innerHTML = '<div class="view-header"><h1>View not found</h1></div>';
        }
    }

    // Expose navigation function globally
    window.navigateTo = navigateTo;

    // Start the app
    init();

})();
