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
    const { el, icon, statCard } = window.UI;
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
      const admin = isAdmin();
      authCard.innerHTML = `
        <div class="perm-status perm-status--${admin ? 'admin' : (currentPerms.apiAccess ? 'authorized' : 'restricted')}">
          <span class="perm-status__icon">${admin ? '👑' : (currentPerms.apiAccess ? '✅' : '⚠️')}</span>
          <div>
            <h3>${admin ? 'Administrateur' : (currentPerms.apiAccess ? 'Accès autorisé' : 'Accès restreint')}</h3>
            <p>${admin
              ? 'Vous avez un accès complet à toutes les fonctionnalités, API et IA.'
              : (currentPerms.apiAccess
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
      value: currentPerms.apiAccess ? '✓ Complet' : '✗ Limité',
      iconName: 'activity',
      color: currentPerms.apiAccess ? 'var(--ez-success)' : 'var(--ez-danger)'
    }));
    grid.appendChild(statCard({
      title: 'Accès IA',
      value: currentPerms.aiAccess ? '✓ Activé' : '✗ Désactivé',
      iconName: 'sparkles',
      color: currentPerms.aiAccess ? '#8b5cf6' : 'var(--ez-danger)'
    }));
    grid.appendChild(statCard({
      title: 'Limite API',
      value: currentPerms.apiAccess ? 'Illimité' : `${currentPerms.apiLimit || 1}/min`,
      iconName: 'clock',
      color: currentPerms.apiAccess ? 'var(--ez-success)' : '#f59e0b'
    }));
    wrap.appendChild(grid);

    // Restricted usage info
    if (!currentPerms.apiAccess) {
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

    container.appendChild(wrap);
  }

  /* ─────────── Init ───────────────────────────────────────────── */
  async function init() {
    await loadPermissions();
    await loadKeys();
    console.log('[AccessControl] Loaded — admin:', isAdmin(), '| API:', currentPerms.apiAccess, '| AI:', currentPerms.aiAccess, '| Keys:', hasKeys());
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
    // Key Vault
    loadKeys,
    saveKeys,
    getKey,
    hasKeys,
    // Constants
    ADMIN_EMAIL
  };
})();
