/* ================================================================
   FinVest — access-control.js  (Role-Based Access Control)
   Admin (admin@ezoxe.fr) manages all accounts.
   Controls: API access, AI access, per-user quota overrides.
   Uses: ezgalaxy.app (shared) for permissions,
         ezgalaxy.storage (private) for own auth state cache.
   Exposes: window.AccessControl
   ================================================================ */
(() => {
  'use strict';

  const ADMIN_EMAIL = 'admin@ezoxe.fr';
  const PERM_COLLECTION = 'permissions';
  const KEYS_COLLECTION = 'api-keys';
  const KEYS_RECORD = 'vault';

  /* ─────────── Default permissions for non-authorized users ─── */
  const DEFAULT_PERMS = {
    apiAccess: false,        // false = 1 req/min global limit
    aiAccess: false,         // false = chat AI disabled
    apiLimit: 1,             // max API calls/min when apiAccess=false
    apiWindow: 60_000,       // 1 minute
    grantedBy: null,
    grantedAt: null
  };

  /* ─────────── In-memory state ────────────────────────────────── */
  let currentPerms = { ...DEFAULT_PERMS };
  let allUsers = [];           // admin-only: cached user list
  let restrictedPool = { used: 0, resetAt: 0 };  // for non-authorized rate limit
  let loaded = false;

  /* ─────────── Key Vault (runtime-loaded, never in source) ──── */
  let keyVault = {
    finnhub: null,
    alphavantage: null,
    exchangerate: null,
    gemini: null
  };
  let keysLoaded = false;

  /* ─────────── Helpers ────────────────────────────────────────── */
  function getCurrentUser() {
    if (typeof Store === 'undefined') return null;
    const s = Store.getState();
    return s.auth && s.auth.user ? s.auth.user : null;
  }

  function isAuthenticated() {
    const user = getCurrentUser();
    return !!(user && user.email);
  }

  function isAdmin() {
    const user = getCurrentUser();
    return user && user.email && user.email.toLowerCase() === ADMIN_EMAIL;
  }

  /* ─────────── Load current user's permissions ─────────────── */
  async function loadPermissions() {
    const user = getCurrentUser();
    if (!user || !user.email) {
      currentPerms = { ...DEFAULT_PERMS };
      loaded = true;
      return currentPerms;
    }

    // Admin always has full access
    if (isAdmin()) {
      currentPerms = {
        apiAccess: true,
        aiAccess: true,
        apiLimit: Infinity,
        apiWindow: 0,
        grantedBy: 'system',
        grantedAt: '2026-01-01T00:00:00Z',
        isAdmin: true
      };
      loaded = true;
      return currentPerms;
    }

    // Load from app-level storage (shared data written by admin)
    try {
      if (typeof ezgalaxy !== 'undefined' && ezgalaxy.app) {
        const rec = await ezgalaxy.app.get(PERM_COLLECTION, sanitizeKey(user.email));
        if (rec && rec.data) {
          currentPerms = { ...DEFAULT_PERMS, ...rec.data };
          loaded = true;
          return currentPerms;
        }
      }
    } catch (e) {
      console.warn('[AccessControl] Failed to load permissions:', e.message);
    }

    // No permissions found → default (restricted)
    currentPerms = { ...DEFAULT_PERMS };
    loaded = true;
    return currentPerms;
  }

  /** Sanitize email for use as a record key */
  function sanitizeKey(email) {
    return email.toLowerCase().replace(/[^a-z0-9._@-]/g, '_');
  }

  /* ─────────── Permission checks ──────────────────────────────── */
  function canUseAI() {
    if (!isAuthenticated()) return false;
    return currentPerms.aiAccess === true;
  }

  function canUseFullAPI() {
    if (!isAuthenticated()) return false;
    return currentPerms.apiAccess === true;
  }

  /**
   * Check if a restricted (non-authorized) user can make an API call.
   * Returns true if under the 1 req/min limit.
   */
  function canMakeRestrictedCall() {
    const now = Date.now();
    if (now > restrictedPool.resetAt) {
      restrictedPool.used = 0;
      restrictedPool.resetAt = now + (currentPerms.apiWindow || 60_000);
    }
    return restrictedPool.used < (currentPerms.apiLimit || 1);
  }

  function trackRestrictedCall() {
    const now = Date.now();
    if (now > restrictedPool.resetAt) {
      restrictedPool.used = 0;
      restrictedPool.resetAt = now + (currentPerms.apiWindow || 60_000);
    }
    restrictedPool.used++;
  }

  function getRestrictedStatus() {
    const now = Date.now();
    if (now > restrictedPool.resetAt) {
      restrictedPool.used = 0;
      restrictedPool.resetAt = now + (currentPerms.apiWindow || 60_000);
    }
    const limit = currentPerms.apiLimit || 1;
    return {
      used: restrictedPool.used,
      limit,
      remaining: Math.max(0, limit - restrictedPool.used),
      resetIn: Math.max(0, restrictedPool.resetAt - now),
      pct: Math.round((restrictedPool.used / limit) * 100)
    };
  }

  /* ─────────── Admin: List all users ──────────────────────────── */
  async function adminListUsers() {
    if (!isAdmin()) throw new Error('Accès refusé');
    try {
      if (typeof ezgalaxy !== 'undefined' && ezgalaxy.app) {
        const result = await ezgalaxy.app.list(PERM_COLLECTION, { limit: 200 });
        allUsers = (result.items || []).map(item => ({
          email: item.data.email || item.record_key.replace(/_/g, '.'),
          ...item.data,
          key: item.record_key,
          updatedAt: item.updated_at
        }));
        return allUsers;
      }
    } catch (e) {
      console.error('[AccessControl] Failed to list users:', e);
    }
    return [];
  }

  /* ─────────── Admin: Set user permissions ─────────────────── */
  async function adminSetPermissions(email, perms) {
    if (!isAdmin()) throw new Error('Accès refusé');
    const key = sanitizeKey(email);
    const data = {
      email: email.toLowerCase(),
      apiAccess: !!perms.apiAccess,
      aiAccess: !!perms.aiAccess,
      apiLimit: perms.apiAccess ? Infinity : (perms.apiLimit || 1),
      apiWindow: perms.apiAccess ? 0 : 60_000,
      grantedBy: ADMIN_EMAIL,
      grantedAt: new Date().toISOString()
    };

    try {
      if (typeof ezgalaxy !== 'undefined' && ezgalaxy.app) {
        await ezgalaxy.app.set(PERM_COLLECTION, key, data);
        console.log(`[AccessControl] Permissions updated for ${email}:`, data);
        return data;
      }
    } catch (e) {
      console.error('[AccessControl] Failed to set permissions:', e);
      throw e;
    }
  }

  /* ─────────── Admin: Revoke user permissions ─────────────── */
  async function adminRevokePermissions(email) {
    if (!isAdmin()) throw new Error('Accès refusé');
    const key = sanitizeKey(email);
    try {
      if (typeof ezgalaxy !== 'undefined' && ezgalaxy.app) {
        await ezgalaxy.app.delete(PERM_COLLECTION, key);
        console.log(`[AccessControl] Permissions revoked for ${email}`);
      }
    } catch (e) {
      console.error('[AccessControl] Failed to revoke:', e);
    }
  }

  /* ─────────── Admin: Register a user (set initial permissions) ──── */
  async function adminRegisterUser(email) {
    return adminSetPermissions(email, { apiAccess: false, aiAccess: false });
  }

  /* =================================================================
     KEY VAULT — Secure API key storage via ezgalaxy.app
     Keys are stored in shared app storage, writable only by admin.
     Never committed to source code.
     ================================================================= */

  /** Load API keys from app-level storage */
  async function loadKeys() {
    if (keysLoaded) return keyVault;
    try {
      if (typeof ezgalaxy !== 'undefined' && ezgalaxy.app) {
        const rec = await ezgalaxy.app.get(KEYS_COLLECTION, KEYS_RECORD);
        if (rec && rec.data) {
          keyVault = { ...keyVault, ...rec.data };
          keysLoaded = true;
          console.log('[KeyVault] Keys loaded from cloud storage');
          return keyVault;
        }
      }
    } catch (e) {
      console.warn('[KeyVault] Failed to load keys:', e.message);
    }
    // LS fallback (for dev mode)
    try {
      const safeLS = window._finvestSafeLS || localStorage;
      const raw = safeLS.getItem('finvest_api_keys');
      if (raw) {
        const saved = JSON.parse(raw);
        keyVault = { ...keyVault, ...saved };
        keysLoaded = true;
        console.log('[KeyVault] Keys loaded from localStorage fallback');
      }
    } catch (_) {}
    return keyVault;
  }

  /** Save API keys (admin only) */
  async function saveKeys(keys) {
    if (!isAdmin()) throw new Error('Accès refusé — admin requis');
    const data = {
      finnhub: keys.finnhub || null,
      alphavantage: keys.alphavantage || null,
      exchangerate: keys.exchangerate || null,
      gemini: keys.gemini || null,
      updatedAt: new Date().toISOString(),
      updatedBy: ADMIN_EMAIL
    };
    try {
      if (typeof ezgalaxy !== 'undefined' && ezgalaxy.app) {
        await ezgalaxy.app.set(KEYS_COLLECTION, KEYS_RECORD, data);
      }
    } catch (e) {
      console.error('[KeyVault] Cloud save failed:', e);
    }
    // Also LS for dev fallback
    try {
      const safeLS = window._finvestSafeLS || localStorage;
      safeLS.setItem('finvest_api_keys', JSON.stringify(data));
    } catch (_) {}
    keyVault = { ...keyVault, ...data };
    keysLoaded = true;
    console.log('[KeyVault] Keys saved successfully');
    return data;
  }

  /** Get a specific API key */
  function getKey(apiName) {
    return keyVault[apiName] || null;
  }

  /** Check if keys are configured */
  function hasKeys() {
    return !!(keyVault.finnhub || keyVault.alphavantage || keyVault.exchangerate);
  }

  /* =================================================================
     ADMIN PANEL VIEW — Full user management interface
     ================================================================= */
  function renderAdminPanel(container) {
    const { el, icon, toast, modal, statCard, tabs, formatNumber } = window.UI;
    container.innerHTML = '';
    const wrap = el('div', { className: 'view-content' });

    // Header
    wrap.appendChild(el('div', { className: 'page-header ez-fade-in' }, [
      icon('shield', 28),
      el('div', {}, [
        el('h2', { textContent: 'Administration des comptes' }),
        el('p', { className: 'text-muted', textContent: 'Gérer les autorisations API et IA pour tous les utilisateurs' })
      ])
    ]));

    // Access check
    if (!isAdmin()) {
      wrap.appendChild(el('div', { className: 'empty-state ez-fade-in' }, [
        el('div', { className: 'empty-icon', textContent: '🔒' }),
        el('h3', { textContent: 'Accès restreint' }),
        el('p', { textContent: 'Seul l\'administrateur (admin@ezoxe.fr) peut accéder à cette page.' })
      ]));
      container.appendChild(wrap);
      return;
    }

    // Stats bar
    const statsBar = el('div', { className: 'stats-grid stats-grid--3 ez-fade-in', id: 'admin-stats' });
    wrap.appendChild(statsBar);

    // Action bar
    const actionBar = el('div', { className: 'admin-action-bar ez-fade-in' });
    const addBtn = el('button', {
      className: 'btn btn--primary',
      onClick: () => showAddUserModal()
    }, [icon('plus', 16), el('span', { textContent: ' Ajouter un utilisateur' })]);
    const refreshBtn = el('button', {
      className: 'btn btn--ghost',
      onClick: () => loadAndRender()
    }, [icon('refresh', 16), el('span', { textContent: ' Actualiser' })]);
    actionBar.appendChild(addBtn);
    actionBar.appendChild(refreshBtn);
    wrap.appendChild(actionBar);

    // User table
    const tableWrap = el('div', { className: 'admin-table-wrap ez-fade-in', id: 'admin-users-table' });
    wrap.appendChild(tableWrap);

    // Key Vault section (admin only)
    wrap.appendChild(el('div', { className: 'page-header ez-fade-in', style: { marginTop: '40px' } }, [
      icon('lock', 24),
      el('div', {}, [
        el('h2', { textContent: '🔑 Coffre-fort des clés API' }),
        el('p', { className: 'text-muted', textContent: 'Les clés sont stockées dans le cloud EZGalaxy, jamais dans le code source.' })
      ])
    ]));

    const vaultWrap = el('div', { className: 'vault-section ez-fade-in', id: 'admin-vault' });
    wrap.appendChild(vaultWrap);

    container.appendChild(wrap);

    // Load data
    loadAndRender();
    loadAndRenderVault();

    async function loadAndRenderVault() {
      vaultWrap.innerHTML = '<div class="text-muted" style="padding:20px;text-align:center">Chargement du coffre-fort...</div>';
      await loadKeys();

      const keys = [
        { id: 'finnhub', label: 'Finnhub', desc: 'Cours actions temps réel (60 req/min)', value: keyVault.finnhub },
        { id: 'alphavantage', label: 'Alpha Vantage', desc: 'Historiques OHLCV (25 req/jour)', value: keyVault.alphavantage },
        { id: 'exchangerate', label: 'ExchangeRate-API', desc: 'Taux de change (1500 req/mois)', value: keyVault.exchangerate },
        { id: 'gemini', label: 'Google Gemini', desc: 'Assistant IA', value: keyVault.gemini }
      ];

      vaultWrap.innerHTML = '';
      const form = el('div', { className: 'vault-form' });

      for (const k of keys) {
        const group = el('div', { className: 'vault-field' });
        const label = el('div', { className: 'vault-field__label' });
        label.innerHTML = `<strong>${k.label}</strong> <span class="text-muted">— ${k.desc}</span>`;
        const status = el('span', {
          className: `perm-badge ${k.value ? 'perm-badge--on' : 'perm-badge--off'}`,
          textContent: k.value ? '✓ Configurée' : '✗ Manquante',
          style: { marginLeft: '8px', fontSize: '11px' }
        });
        label.appendChild(status);

        const inputRow = el('div', { className: 'vault-field__input' });
        const input = el('input', {
          type: 'password',
          className: 'input',
          placeholder: k.value ? '••••••••••••••••' : 'Saisir la clé API...',
          id: `vault-key-${k.id}`,
          value: ''
        });
        const showBtn = el('button', {
          className: 'btn btn--ghost btn--sm',
          textContent: '👁',
          title: 'Afficher/masquer',
          onClick: () => {
            input.type = input.type === 'password' ? 'text' : 'password';
            if (input.type === 'text' && !input.value && k.value) input.value = k.value;
          }
        });
        inputRow.appendChild(input);
        inputRow.appendChild(showBtn);
        group.appendChild(label);
        group.appendChild(inputRow);
        form.appendChild(group);
      }

      const saveBtn = el('button', {
        className: 'btn btn--primary',
        style: { marginTop: '16px' },
        onClick: async () => {
          const newKeys = {};
          for (const k of keys) {
            const input = document.getElementById(`vault-key-${k.id}`);
            const val = input ? input.value.trim() : '';
            newKeys[k.id] = val || k.value || null;
          }
          await saveKeys(newKeys);
          toast('🔑 Clés API sauvegardées avec succès !', 'success');
          loadAndRenderVault();
        }
      }, [icon('check', 16), el('span', { textContent: ' Enregistrer les clés' })]);
      form.appendChild(saveBtn);

      if (keyVault.updatedAt) {
        form.appendChild(el('p', {
          className: 'text-muted',
          style: { marginTop: '8px', fontSize: '11px' },
          textContent: `Dernière mise à jour : ${new Date(keyVault.updatedAt).toLocaleString('fr-FR')}`
        }));
      }

      vaultWrap.appendChild(form);
    }

    async function loadAndRender() {
      tableWrap.innerHTML = '<div class="text-muted" style="padding:20px;text-align:center">Chargement des comptes...</div>';
      const users = await adminListUsers();

      // Stats
      const totalUsers = users.length;
      const apiEnabled = users.filter(u => u.apiAccess).length;
      const aiEnabled = users.filter(u => u.aiAccess).length;
      statsBar.innerHTML = '';
      statsBar.appendChild(statCard({ title: 'Utilisateurs', value: totalUsers, iconName: 'user', color: 'var(--ez-primary)' }));
      statsBar.appendChild(statCard({ title: 'Accès API complet', value: apiEnabled, iconName: 'activity', color: 'var(--ez-success)' }));
      statsBar.appendChild(statCard({ title: 'Accès IA', value: aiEnabled, iconName: 'sparkles', color: '#8b5cf6' }));

      // Table
      renderUsersTable(users);
    }

    function renderUsersTable(users) {
      tableWrap.innerHTML = '';

      if (users.length === 0) {
        tableWrap.innerHTML = '<div class="empty-state"><p>Aucun utilisateur enregistré. Ajoutez des comptes pour gérer leurs permissions.</p></div>';
        return;
      }

      const table = el('table', { className: 'data-table admin-table' });
      table.innerHTML = `
        <thead><tr>
          <th>Email</th>
          <th>Accès API</th>
          <th>Accès IA</th>
          <th>Autorisé par</th>
          <th>Date</th>
          <th>Actions</th>
        </tr></thead>
      `;
      const tbody = el('tbody');
      for (const user of users) {
        const tr = el('tr');
        const isOwner = user.email === ADMIN_EMAIL;
        tr.innerHTML = `
          <td>
            <strong>${user.email}</strong>
            ${isOwner ? '<span class="badge badge--admin">ADMIN</span>' : ''}
          </td>
          <td>
            <span class="perm-badge ${user.apiAccess ? 'perm-badge--on' : 'perm-badge--off'}">
              ${user.apiAccess ? '✓ Autorisé' : '✗ Limité'}
            </span>
          </td>
          <td>
            <span class="perm-badge ${user.aiAccess ? 'perm-badge--on' : 'perm-badge--off'}">
              ${user.aiAccess ? '✓ Activé' : '✗ Désactivé'}
            </span>
          </td>
          <td class="text-muted">${user.grantedBy || '—'}</td>
          <td class="text-muted">${user.grantedAt ? new Date(user.grantedAt).toLocaleDateString('fr-FR') : '—'}</td>
          <td></td>
        `;
        const actionsCell = tr.lastElementChild;

        if (!isOwner) {
          // Toggle API
          const apiBtn = el('button', {
            className: `btn btn--sm ${user.apiAccess ? 'btn--danger-ghost' : 'btn--success-ghost'}`,
            textContent: user.apiAccess ? 'Révoquer API' : 'Autoriser API',
            onClick: async () => {
              await adminSetPermissions(user.email, { ...user, apiAccess: !user.apiAccess });
              toast(user.apiAccess ? `API révoqué pour ${user.email}` : `API autorisé pour ${user.email}`, user.apiAccess ? 'warning' : 'success');
              loadAndRender();
            }
          });

          // Toggle AI
          const aiBtn = el('button', {
            className: `btn btn--sm ${user.aiAccess ? 'btn--danger-ghost' : 'btn--ai'}`,
            textContent: user.aiAccess ? 'Désactiver IA' : 'Activer IA',
            onClick: async () => {
              await adminSetPermissions(user.email, { ...user, aiAccess: !user.aiAccess });
              toast(user.aiAccess ? `IA désactivée pour ${user.email}` : `IA activée pour ${user.email}`, user.aiAccess ? 'warning' : 'success');
              loadAndRender();
            }
          });

          // Delete
          const delBtn = el('button', {
            className: 'btn btn--sm btn--danger-ghost',
            textContent: '🗑️',
            title: 'Supprimer',
            onClick: async () => {
              if (confirm(`Supprimer les permissions de ${user.email} ?`)) {
                await adminRevokePermissions(user.email);
                toast(`Permissions supprimées pour ${user.email}`, 'info');
                loadAndRender();
              }
            }
          });

          actionsCell.appendChild(apiBtn);
          actionsCell.appendChild(el('span', { textContent: ' ' }));
          actionsCell.appendChild(aiBtn);
          actionsCell.appendChild(el('span', { textContent: ' ' }));
          actionsCell.appendChild(delBtn);
        } else {
          actionsCell.textContent = '—';
        }

        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      tableWrap.appendChild(el('div', { className: 'table-wrap' }, [table]));
    }

    function showAddUserModal() {
      const content = el('div', { className: 'admin-add-form' });
      const emailInput = el('input', { type: 'email', className: 'input', placeholder: 'email@example.com', id: 'admin-add-email' });
      const apiCheck = el('label', { className: 'admin-check' });
      apiCheck.innerHTML = '<input type="checkbox" id="admin-add-api"> Autoriser l\'accès API complet';
      const aiCheck = el('label', { className: 'admin-check' });
      aiCheck.innerHTML = '<input type="checkbox" id="admin-add-ai"> Autoriser l\'accès IA';

      content.appendChild(el('div', { className: 'form-group' }, [
        el('label', { textContent: 'Email du compte' }),
        emailInput
      ]));
      content.appendChild(el('div', { className: 'form-group' }, [apiCheck]));
      content.appendChild(el('div', { className: 'form-group' }, [aiCheck]));

      modal({
        title: '➕ Ajouter un utilisateur',
        content,
        actions: [
          {
            label: 'Ajouter',
            cls: 'btn--primary',
            onClick: async (close) => {
              const email = emailInput.value.trim();
              if (!email || !email.includes('@')) {
                toast('Veuillez saisir un email valide', 'error');
                return;
              }
              const apiAccess = document.getElementById('admin-add-api').checked;
              const aiAccess = document.getElementById('admin-add-ai').checked;
              await adminSetPermissions(email, { apiAccess, aiAccess });
              toast(`Utilisateur ${email} ajouté avec succès`, 'success');
              close();
              loadAndRender();
            }
          },
          { label: 'Annuler', cls: 'btn--ghost' }
        ]
      });
    }
  }

  /* =================================================================
     MY PERMISSIONS VIEW — Shows current user's access status
     ================================================================= */
  function renderMyPermissions(container) {
    const { el, icon, statCard, toast } = window.UI;
    container.innerHTML = '';
    const wrap = el('div', { className: 'view-content' });

    wrap.appendChild(el('div', { className: 'page-header ez-fade-in' }, [
      icon('lock', 28),
      el('div', {}, [
        el('h2', { textContent: 'Mes autorisations' }),
        el('p', { className: 'text-muted', textContent: 'Votre niveau d\'accès aux API et à l\'IA' })
      ])
    ]));

    const user = getCurrentUser();
    const auth = isAuthenticated();
    const admin = auth && isAdmin();

    // Use effective perms — admin always has full access regardless of currentPerms timing
    const effectivePerms = admin
      ? { apiAccess: true, aiAccess: true, apiLimit: Infinity, isAdmin: true }
      : { ...currentPerms };

    // Auth status card
    const authCard = el('div', { className: 'perm-status-card ez-fade-in' });
    if (!auth) {
      authCard.innerHTML = `
        <div class="perm-status perm-status--disconnected">
          <span class="perm-status__icon">🔓</span>
          <div>
            <h3>Non connecté</h3>
            <p>Connectez-vous pour bénéficier d'un accès étendu. Sans connexion, l'IA est inaccessible et les API sont limitées à <strong>1 requête par minute</strong>.</p>
          </div>
        </div>
      `;
    } else {
      authCard.innerHTML = `
        <div class="perm-status perm-status--${admin ? 'admin' : (effectivePerms.apiAccess ? 'authorized' : 'restricted')}">
          <span class="perm-status__icon">${admin ? '👑' : (effectivePerms.apiAccess ? '✅' : '⚠️')}</span>
          <div>
            <h3>${admin ? 'Administrateur' : (effectivePerms.apiAccess ? 'Accès autorisé' : 'Accès restreint')}</h3>
            <p>${admin
              ? 'Vous avez un accès complet à toutes les fonctionnalités, API et IA.'
              : (effectivePerms.apiAccess
                ? 'Votre compte a été autorisé par l\'administrateur. Accès complet aux API.'
                : 'Votre accès est limité. Contactez l\'administrateur pour obtenir un accès étendu.')
            }</p>
            <p class="text-muted">Connecté en tant que : <strong>${user.email}</strong></p>
          </div>
        </div>
      `;
    }
    wrap.appendChild(authCard);

    // Permissions grid
    const grid = el('div', { className: 'stats-grid stats-grid--3 ez-fade-in' });
    grid.appendChild(statCard({
      title: 'Accès API',
      value: effectivePerms.apiAccess ? '✓ Complet' : '✗ Limité',
      iconName: 'activity',
      color: effectivePerms.apiAccess ? 'var(--ez-success)' : 'var(--ez-danger)'
    }));
    grid.appendChild(statCard({
      title: 'Accès IA',
      value: effectivePerms.aiAccess ? '✓ Activé' : '✗ Désactivé',
      iconName: 'sparkles',
      color: effectivePerms.aiAccess ? '#8b5cf6' : 'var(--ez-danger)'
    }));
    grid.appendChild(statCard({
      title: 'Limite API',
      value: effectivePerms.apiAccess ? 'Illimité' : `${effectivePerms.apiLimit || 1}/min`,
      iconName: 'clock',
      color: effectivePerms.apiAccess ? 'var(--ez-success)' : '#f59e0b'
    }));
    wrap.appendChild(grid);

    // ── Admin quick-actions ──────────────────────────────────
    if (admin) {
      const adminSection = el('div', { className: 'perm-admin-actions ez-fade-in' });
      adminSection.innerHTML = `<h4 class="perm-admin-actions__title">🛠️ Outils d'administration</h4>`;
      const actGrid = el('div', { className: 'perm-admin-grid' });

      // Key Vault shortcut
      const vaultCard = el('div', { className: 'perm-admin-card', onClick: () => navigateTo('admin') });
      vaultCard.innerHTML = `
        <span class="perm-admin-card__icon">🔑</span>
        <div><strong>Coffre-fort API</strong><p class="text-muted">Configurer les clés API (Finnhub, Alpha Vantage, Gemini...)</p></div>
        <span class="perm-admin-card__status">${hasKeys() ? '<span class="perm-badge perm-badge--on">Configuré</span>' : '<span class="perm-badge perm-badge--off">Non configuré</span>'}</span>
      `;
      actGrid.appendChild(vaultCard);

      // User management shortcut
      const usersCard = el('div', { className: 'perm-admin-card', onClick: () => navigateTo('admin') });
      usersCard.innerHTML = `
        <span class="perm-admin-card__icon">👥</span>
        <div><strong>Gestion des comptes</strong><p class="text-muted">Gérer les autorisations API et IA des utilisateurs</p></div>
        <span class="perm-admin-card__arrow">→</span>
      `;
      actGrid.appendChild(usersCard);

      // Account / My profile
      const profileCard = el('div', { className: 'perm-admin-card', onClick: () => navigateTo('account') });
      profileCard.innerHTML = `
        <span class="perm-admin-card__icon">👤</span>
        <div><strong>Mon compte</strong><p class="text-muted">Voir les détails de votre compte et la synchronisation</p></div>
        <span class="perm-admin-card__arrow">→</span>
      `;
      actGrid.appendChild(profileCard);

      adminSection.appendChild(actGrid);
      wrap.appendChild(adminSection);
    }

    // Restricted usage info
    if (!effectivePerms.apiAccess) {
      const rs = getRestrictedStatus();
      const infoBox = el('div', { className: 'perm-info-box ez-fade-in' });
      infoBox.innerHTML = `
        <h4>📊 Utilisation actuelle</h4>
        <div class="quota-item">
          <div class="quota-item__name">Requêtes API (toutes API confondues)</div>
          <div class="quota-item__bar"><div class="quota-item__fill ${rs.pct >= 100 ? 'quota--exhausted' : rs.pct >= 70 ? 'quota--throttled' : 'quota--ok'}" style="width: ${Math.min(100, rs.pct)}%"></div></div>
          <div class="quota-item__label"><span>${rs.used} / ${rs.limit} utilisée(s)</span><span>Reset dans ${Math.ceil(rs.resetIn / 1000)}s</span></div>
        </div>
        <p class="text-muted" style="margin-top: 12px">💡 Contactez <strong>${ADMIN_EMAIL}</strong> pour obtenir un accès complet.</p>
      `;
      wrap.appendChild(infoBox);
    }

    // ── Cloud sync status ────────────────────────────────────
    if (auth) {
      const syncSection = el('div', { className: 'perm-info-box ez-fade-in' });
      const s = Store.getState();
      const cloudOk = s.cloudStatus === 'connected';
      syncSection.innerHTML = `
        <h4>☁️ Synchronisation des données</h4>
        <div style="display:flex;align-items:center;gap:10px;margin-top:10px">
          <span class="cloud-badge ${cloudOk ? 'cloud-status--connected' : 'cloud-status--disconnected'}">${cloudOk ? '☁️ Connecté' : '⚠️ Hors-ligne'}</span>
          <span class="text-muted">Vos données sont ${cloudOk ? 'automatiquement synchronisées' : 'sauvegardées localement'}</span>
        </div>
        ${cloudOk ? '<p class="text-muted" style="margin-top:8px;font-size:11px">💡 Les données sont sauvegardées automatiquement à chaque modification.</p>' : ''}
      `;
      wrap.appendChild(syncSection);
    }

    container.appendChild(wrap);
  }

  /* ─────────── Init ───────────────────────────────────────────── */
  async function init() {
    await loadPermissions();
    await loadKeys();
    console.log('[AccessControl] Loaded — admin:', isAdmin(), '| API:', currentPerms.apiAccess, '| AI:', currentPerms.aiAccess, '| Keys:', hasKeys());
  }

  /* =================================================================
     ACCOUNT VIEW — User account info, sync status, data management
     ================================================================= */
  function renderAccountPanel(container) {
    const { el, icon, statCard, toast, modal } = window.UI;
    container.innerHTML = '';
    const wrap = el('div', { className: 'view-content' });

    // Header
    wrap.appendChild(el('div', { className: 'page-header ez-fade-in' }, [
      icon('user', 28),
      el('div', {}, [
        el('h2', { textContent: 'Mon compte' }),
        el('p', { className: 'text-muted', textContent: 'Informations du compte, synchronisation et gestion des données' })
      ])
    ]));

    const user = getCurrentUser();
    const auth = isAuthenticated();
    const s = Store.getState();

    if (!auth) {
      wrap.appendChild(el('div', { className: 'empty-state ez-fade-in' }, [
        el('div', { className: 'empty-icon', textContent: '🔒' }),
        el('h3', { textContent: 'Connexion requise' }),
        el('p', { textContent: 'Connectez-vous pour accéder aux détails de votre compte.' })
      ]));
      container.appendChild(wrap);
      return;
    }

    // ── User info card ─────────────────────────────────────────
    const admin = isAdmin();
    const userCard = el('div', { className: 'account-card ez-fade-in' });
    const initials = (user.email || '?').charAt(0).toUpperCase();
    userCard.innerHTML = `
      <div class="account-card__header">
        <div class="account-card__avatar">${admin ? '👑' : initials}</div>
        <div class="account-card__info">
          <h3>${user.displayName || user.name || user.email}</h3>
          <p class="text-muted">${user.email}</p>
          <div class="account-card__badges">
            ${admin ? '<span class="badge badge--admin">Administrateur</span>' : ''}
            <span class="badge badge--role">${currentPerms.apiAccess || admin ? '✓ API complète' : 'API limitée'}</span>
            <span class="badge badge--role">${currentPerms.aiAccess || admin ? '✓ IA activée' : 'IA désactivée'}</span>
          </div>
        </div>
      </div>
    `;
    wrap.appendChild(userCard);

    // ── Stats grid ────────────────────────────────────────────
    const grid = el('div', { className: 'stats-grid stats-grid--4 ez-fade-in' });
    grid.appendChild(statCard({
      title: 'XP accumulés',
      value: (s.xp || 0).toLocaleString('fr-FR'),
      iconName: 'star',
      color: '#f59e0b'
    }));
    grid.appendChild(statCard({
      title: 'Transactions',
      value: (s.transactions || []).length,
      iconName: 'list',
      color: 'var(--ez-primary)'
    }));
    grid.appendChild(statCard({
      title: 'Positions',
      value: (s.positions || []).length,
      iconName: 'briefcase',
      color: 'var(--ez-success)'
    }));
    grid.appendChild(statCard({
      title: 'Journal',
      value: (s.journalEntries || []).length,
      iconName: 'edit',
      color: '#8b5cf6'
    }));
    wrap.appendChild(grid);

    // ── Cloud sync section ─────────────────────────────────────
    const syncCard = el('div', { className: 'account-section ez-fade-in' });
    const cloudOk = s.cloudStatus === 'connected';
    syncCard.innerHTML = `
      <div class="account-section__header">
        <h3>☁️ Synchronisation cloud</h3>
        <span class="cloud-badge ${cloudOk ? 'cloud-status--connected' : 'cloud-status--disconnected'}">${cloudOk ? '☁️ Connecté' : '⚠️ Hors-ligne'}</span>
      </div>
      <p class="text-muted">Vos données sont automatiquement sauvegardées dans le cloud EZGalaxy à chaque modification lorsque vous êtes connecté.</p>
    `;
    const syncActions = el('div', { className: 'account-section__actions' });
    const forceSaveBtn = el('button', {
      className: 'btn btn--primary btn--sm',
      onClick: async () => {
        try {
          forceSaveBtn.textContent = '⏳ Synchronisation...';
          forceSaveBtn.disabled = true;
          await Store.cloudSave();
          toast('☁️ Données synchronisées avec succès !', 'success');
          forceSaveBtn.textContent = '✓ Synchronisé !';
          setTimeout(() => { forceSaveBtn.textContent = '🔄 Synchroniser maintenant'; forceSaveBtn.disabled = false; }, 2000);
        } catch (e) {
          toast('Erreur de synchronisation : ' + e.message, 'error');
          forceSaveBtn.textContent = '🔄 Synchroniser maintenant';
          forceSaveBtn.disabled = false;
        }
      }
    }, [icon('refresh', 14), el('span', { textContent: ' Synchroniser maintenant' })]);
    syncActions.appendChild(forceSaveBtn);

    const loadCloudBtn = el('button', {
      className: 'btn btn--ghost btn--sm',
      onClick: async () => {
        if (!confirm('Charger les données depuis le cloud ? Cela remplacera les données locales.')) return;
        try {
          const loaded = await Store.cloudLoad();
          if (loaded) {
            toast('☁️ Données chargées depuis le cloud !', 'success');
            renderApp();
          } else {
            toast('Aucune donnée trouvée dans le cloud', 'info');
          }
        } catch (e) {
          toast('Erreur : ' + e.message, 'error');
        }
      }
    }, [icon('download', 14), el('span', { textContent: ' Charger depuis le cloud' })]);
    syncActions.appendChild(loadCloudBtn);
    syncCard.appendChild(syncActions);
    wrap.appendChild(syncCard);

    // ── Data management ────────────────────────────────────────
    const dataCard = el('div', { className: 'account-section ez-fade-in' });
    dataCard.innerHTML = `
      <div class="account-section__header">
        <h3>📦 Gestion des données</h3>
      </div>
      <p class="text-muted">Exportez ou importez vos données financières pour une sauvegarde locale.</p>
    `;
    const dataActions = el('div', { className: 'account-section__actions' });

    const exportBtn = el('button', {
      className: 'btn btn--ghost btn--sm',
      onClick: () => { Store.exportJSON(); toast('📦 Export généré', 'info'); }
    }, [icon('download', 14), el('span', { textContent: ' Exporter (JSON)' })]);
    dataActions.appendChild(exportBtn);

    const importLabel = el('label', { className: 'btn btn--ghost btn--sm', style: { cursor: 'pointer' } });
    importLabel.appendChild(icon('upload', 14));
    importLabel.appendChild(el('span', { textContent: ' Importer' }));
    const importInput = el('input', {
      type: 'file',
      accept: '.json',
      style: { display: 'none' },
      onChange: async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          await Store.importJSON(file);
          toast('📦 Données importées avec succès !', 'success');
          renderApp();
        } catch (e) {
          toast('Erreur d\'import : ' + e.message, 'error');
        }
      }
    });
    importLabel.appendChild(importInput);
    dataActions.appendChild(importLabel);

    const resetBtn = el('button', {
      className: 'btn btn--danger-ghost btn--sm',
      onClick: () => {
        modal({
          title: '⚠️ Réinitialiser les données',
          content: el('div', {}, [
            el('p', { textContent: 'Cette action supprimera toutes vos données locales (profil, transactions, portefeuille, journal...). Cette action est irréversible.' }),
            el('p', { className: 'text-muted', textContent: 'Les données dans le cloud ne seront pas affectées.' })
          ]),
          actions: [
            {
              label: '🗑️ Réinitialiser',
              cls: 'btn--danger',
              onClick: (close) => {
                Store.resetProfile();
                toast('Données réinitialisées', 'warning');
                close();
                navigateTo('welcome');
              }
            },
            { label: 'Annuler', cls: 'btn--ghost' }
          ]
        });
      }
    }, [icon('trash', 14), el('span', { textContent: ' Réinitialiser' })]);
    dataActions.appendChild(resetBtn);
    dataCard.appendChild(dataActions);
    wrap.appendChild(dataCard);

    // ── Session info ───────────────────────────────────────────
    const sessionCard = el('div', { className: 'account-section ez-fade-in' });
    sessionCard.innerHTML = `
      <div class="account-section__header">
        <h3>🔐 Session</h3>
      </div>
    `;
    const sessionInfo = el('div', { className: 'account-session-info' });
    const infoItems = [
      { label: 'Email', value: user.email },
      { label: 'Rôle', value: admin ? 'Administrateur' : 'Utilisateur' },
      { label: 'Accès API', value: (currentPerms.apiAccess || admin) ? 'Complet' : 'Limité' },
      { label: 'Accès IA', value: (currentPerms.aiAccess || admin) ? 'Activé' : 'Désactivé' },
      { label: 'Statut cloud', value: cloudOk ? 'Connecté' : 'Hors-ligne' }
    ];
    for (const item of infoItems) {
      const row = el('div', { className: 'account-session-row' });
      row.innerHTML = `<span class="account-session-label">${item.label}</span><span class="account-session-value">${item.value}</span>`;
      sessionInfo.appendChild(row);
    }
    sessionCard.appendChild(sessionInfo);
    wrap.appendChild(sessionCard);

    container.appendChild(wrap);
  }

  /* ─────────── PUBLIC API ─────────────────────────────────────── */
  window.AccessControl = {
    init,
    loadPermissions,
    isAuthenticated,
    isAdmin,
    canUseAI,
    canUseFullAPI,
    canMakeRestrictedCall,
    trackRestrictedCall,
    getRestrictedStatus,
    getCurrentPerms: () => ({ ...currentPerms }),
    // Admin
    adminListUsers,
    adminSetPermissions,
    adminRevokePermissions,
    adminRegisterUser,
    // Views
    renderAdminPanel,
    renderMyPermissions,
    renderAccountPanel,
    // Key Vault
    loadKeys,
    saveKeys,
    getKey,
    hasKeys,
    // Constants
    ADMIN_EMAIL
  };
})();
