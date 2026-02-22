/* ================================================================
   FinVest — views.js  (All Application Views)
   9 views: welcome, questionnaire, overview, allocation,
            projections, retirement, debt, advice, settings
   Exposes: window.Views
   ================================================================ */
(() => {
  'use strict';

  const { el, icon, toast, modal, scoreGauge, progressRing, statCard, stepIndicator,
    questionCard, adviceCard, allocationBar, dataTable, tabs,
    formatCurrency, formatPercent, formatNumber, formatYears,
    initChart, destroyChart } = window.UI;

  /* =============================================================
     A. WELCOME
     ============================================================= */
  function welcome(container) {
    container.innerHTML = '';
    const s = Store.getState();
    const wrap = el('div', { className: 'welcome' });

    // Hero
    const hero = el('div', { className: 'welcome__hero ez-fade-in' }, [
      el('div', { className: 'welcome__icon' }, ['💹']),
      el('h1', { className: 'welcome__title' }, ['FinVest']),
      el('p', { className: 'welcome__subtitle' }, ['Analyse financière complète & conseils de placement personnalisés']),
    ]);

    // ── Logged-in user: show dashboard access ─────────────────
    if (s.auth.token) {
      const userSection = el('div', { className: 'welcome__auth-section ez-fade-in' });

      // User info card
      const userName = s.auth.user?.name || s.auth.user?.email || 'Utilisateur';
      const userCard = el('div', { className: 'welcome__user-card' }, [
        el('div', { className: 'welcome__user-avatar' }, [icon('user', 32)]),
        el('div', { className: 'welcome__user-info' }, [
          el('div', { className: 'welcome__user-greeting', textContent: `Bonjour, ${userName} 👋` }),
          el('div', { className: 'cloud-status cloud-status--connected' }, [
            icon('cloud', 14), ' Données synchronisées'
          ])
        ])
      ]);
      userSection.appendChild(userCard);

      // Action buttons for logged-in user
      const loggedActions = el('div', { className: 'welcome__actions' });

      if (s.analysis) {
        loggedActions.appendChild(el('button', { className: 'btn btn--primary btn--lg', onClick: () => {
          Store.setState({ step: 'dashboard', currentView: s.currentView || 'overview' });
          window.navigateTo(s.currentView || 'overview');
        } }, [icon('activity', 20), 'Accéder à mon tableau de bord']));
      }

      loggedActions.appendChild(el('button', { className: s.analysis ? 'btn btn--outline' : 'btn btn--primary btn--lg', onClick: () => {
        Store.setState({ step: 'questionnaire', questionnaireStep: 0 });
        window.navigateTo('questionnaire');
      } }, [icon('edit', 18), s.analysis ? 'Refaire l\'analyse' : 'Commencer l\'analyse']));

      // Cloud load button (fallback)
      loggedActions.appendChild(el('button', { className: 'btn btn--sm', onClick: async () => {
        try {
          toast('Chargement des données...', 'info');
          const ok = await Store.cloudLoad();
          if (ok) {
            const st = Store.getState();
            if (st.analysis) {
              toast('Données chargées !', 'success');
              Store.setState({ step: 'dashboard', currentView: st.currentView || 'overview' });
            }
            window.renderApp();
          } else {
            toast('Aucune sauvegarde cloud trouvée.', 'info');
          }
        } catch (e) {
          console.error('[FinVest] Cloud load error:', e);
          toast('Erreur : ' + e.message, 'error');
        }
      } }, [icon('download', 14), 'Recharger depuis le cloud']));

      userSection.appendChild(loggedActions);

      // Secondary actions
      const secondaryActions = el('div', { className: 'welcome__secondary-actions' });
      secondaryActions.appendChild(el('button', { className: 'btn btn--sm btn--ghost', onClick: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', async () => {
          if (input.files.length) {
            try {
              await Store.importJSON(input.files[0]);
              toast('Profil importé avec succès', 'success');
              window.renderApp();
            } catch (e) { toast(e.message, 'error'); }
          }
        });
        input.click();
      } }, [icon('upload', 14), 'Importer un fichier']));

      secondaryActions.appendChild(el('button', { className: 'btn btn--sm btn--ghost', onClick: () => {
        Store.logout();
        toast('Déconnecté', 'info');
        window.renderApp();
      } }, [icon('logout', 14), 'Se déconnecter']));

      userSection.appendChild(secondaryActions);

      wrap.append(hero, userSection);
      container.appendChild(wrap);
      return;
    }

    // ── Not logged in: show auth section ───────────────────────

    // Steps preview
    const stepsPreview = el('div', { className: 'welcome__steps ez-fade-in' }, [
      el('div', { className: 'welcome__step' }, [
        el('div', { className: 'welcome__step-num' }, ['1']),
        icon('user', 28),
        el('h3', {}, ['Créez votre compte']),
        el('p', {}, ['Inscription rapide pour synchroniser vos données'])
      ]),
      el('div', { className: 'welcome__step' }, [
        el('div', { className: 'welcome__step-num' }, ['2']),
        icon('edit', 28),
        el('h3', {}, ['Questionnaire']),
        el('p', {}, ['Renseignez votre situation financière en 7 étapes simples'])
      ]),
      el('div', { className: 'welcome__step' }, [
        el('div', { className: 'welcome__step-num' }, ['3']),
        icon('activity', 28),
        el('h3', {}, ['Analyse & Conseils']),
        el('p', {}, ['Score de santé, projections, allocation optimale, plan d\'action'])
      ])
    ]);

    // Auth section — prominent registration + login
    const authSection = el('div', { className: 'welcome__auth-box ez-fade-in' });
    authSection.appendChild(el('h2', { className: 'welcome__auth-title', textContent: 'Commencez votre parcours financier' }));
    authSection.appendChild(el('p', { className: 'welcome__auth-desc', textContent: 'Créez un compte pour sauvegarder automatiquement vos données et y accéder depuis n\'importe quel appareil.' }));

    const authButtons = el('div', { className: 'welcome__auth-buttons' });

    // Create account (primary CTA)
    authButtons.appendChild(el('button', { className: 'btn btn--primary btn--lg welcome__auth-btn', onClick: () => showRegisterModal() }, [
      icon('user', 20), 'Créer un compte gratuit'
    ]));

    // Login (secondary)
    authButtons.appendChild(el('button', { className: 'btn btn--outline btn--lg welcome__auth-btn', onClick: () => showLoginModal() }, [
      icon('login', 20), 'Se connecter'
    ]));

    authSection.appendChild(authButtons);

    // Features list
    const features = el('div', { className: 'welcome__features' }, [
      el('div', { className: 'welcome__feature' }, [icon('cloud', 16), el('span', { textContent: 'Sauvegarde automatique dans le cloud' })]),
      el('div', { className: 'welcome__feature' }, [icon('shield', 16), el('span', { textContent: 'Données sécurisées et privées' })]),
      el('div', { className: 'welcome__feature' }, [icon('refresh', 16), el('span', { textContent: 'Synchronisation en temps réel' })])
    ]);
    authSection.appendChild(features);

    authSection.appendChild(el('div', { className: 'welcome__auth-separator' }, [
      el('span', { textContent: 'ou' })
    ]));

    // Guest / import options
    const guestActions = el('div', { className: 'welcome__guest-actions' });
    guestActions.appendChild(el('button', { className: 'btn btn--sm btn--ghost', onClick: () => {
      Store.setState({ step: 'questionnaire', questionnaireStep: 0 });
      window.navigateTo('questionnaire');
    } }, [icon('chevron-right', 14), 'Continuer sans compte (données locales uniquement)']));
    guestActions.appendChild(el('button', { className: 'btn btn--sm btn--ghost', onClick: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', async () => {
        if (input.files.length) {
          try {
            await Store.importJSON(input.files[0]);
            toast('Profil importé avec succès', 'success');
            window.renderApp();
          } catch (e) { toast(e.message, 'error'); }
        }
      });
      input.click();
    } }, [icon('upload', 14), 'Importer un fichier']));
    authSection.appendChild(guestActions);

    wrap.append(hero, stepsPreview, authSection);
    container.appendChild(wrap);
  }

  /* ----- Register modal — in-app registration form ----------- */
  function showRegisterModal() {
    let nameVal = '', emailVal = '', passVal = '', passConfirmVal = '';
    let registerBtn, errorEl;

    const m = modal({
      title: 'Créer un compte — FinVest',
      body: [
        el('p', { className: 'text-muted', textContent: 'Créez votre compte EZGalaxy pour sauvegarder vos données et analyses financières.' }),
        (() => { errorEl = el('div', { className: 'auth-error', style: { display: 'none' } }); return errorEl; })(),
        el('label', { className: 'form-label', textContent: 'Nom' }),
        (() => { const i = el('input', { type: 'text', className: 'input input--full', placeholder: 'Votre nom', autocomplete: 'name' });
          i.addEventListener('input', () => { nameVal = i.value; }); return i; })(),
        el('label', { className: 'form-label mt-12', textContent: 'Email' }),
        (() => { const i = el('input', { type: 'email', className: 'input input--full', placeholder: 'email@example.com', autocomplete: 'email' });
          i.addEventListener('input', () => { emailVal = i.value; }); return i; })(),
        el('label', { className: 'form-label mt-12', textContent: 'Mot de passe' }),
        (() => { const i = el('input', { type: 'password', className: 'input input--full', placeholder: '••••••••', autocomplete: 'new-password' });
          i.addEventListener('input', () => { passVal = i.value; }); return i; })(),
        el('label', { className: 'form-label mt-12', textContent: 'Confirmer le mot de passe' }),
        (() => { const i = el('input', { type: 'password', className: 'input input--full', placeholder: '••••••••', autocomplete: 'new-password' });
          i.addEventListener('input', () => { passConfirmVal = i.value; }); return i; })()
      ],
      actions: [
        el('button', { className: 'btn', onClick: () => m.close() }, ['Annuler']),
        (() => {
          registerBtn = el('button', { className: 'btn btn--primary', onClick: async () => {
            if (!nameVal.trim()) { _showAuthError(errorEl, 'Veuillez entrer votre nom.'); return; }
            if (!emailVal.trim()) { _showAuthError(errorEl, 'Veuillez entrer votre email.'); return; }
            if (!passVal) { _showAuthError(errorEl, 'Veuillez entrer un mot de passe.'); return; }
            if (passVal.length < 6) { _showAuthError(errorEl, 'Le mot de passe doit contenir au moins 6 caractères.'); return; }
            if (passVal !== passConfirmVal) { _showAuthError(errorEl, 'Les mots de passe ne correspondent pas.'); return; }

            registerBtn.disabled = true;
            registerBtn.textContent = 'Création...';
            errorEl.style.display = 'none';
            try {
              await Store.register(nameVal.trim(), emailVal.trim(), passVal);
              toast('Compte créé avec succès !', 'success');
              if (m.overlay && m.overlay.parentNode) m.overlay.remove();

              const st = Store.getState();
              if (st.step === 'welcome') {
                Store.setState({ step: 'questionnaire', questionnaireStep: 0 });
              }
              window.renderApp();
            } catch (e) {
              registerBtn.disabled = false;
              registerBtn.textContent = 'Créer mon compte';
              _showAuthError(errorEl, e.message);
            }
          } }, ['Créer mon compte']);
          return registerBtn;
        })()
      ]
    });

    // Link to switch to login
    const switchLink = el('div', { className: 'auth-switch', style: { textAlign: 'center', marginTop: '12px' } }, [
      el('span', { className: 'text-muted', textContent: 'Déjà un compte ? ' }),
      el('a', { href: '#', className: 'auth-switch__link', onClick: (e) => {
        e.preventDefault();
        if (m.overlay && m.overlay.parentNode) m.overlay.remove();
        showLoginModal();
      }, textContent: 'Se connecter' })
    ]);

    const modalBody = m.overlay.querySelector('.modal-body');
    if (modalBody) modalBody.appendChild(switchLink);
  }

  /* ----- login modal helper ---------------------------------- */
  function showLoginModal() {
    let emailVal = '', passVal = '';
    let loginBtn, errorEl;
    const isMobile = window._isMobile || false;
    const m = modal({
      title: 'Connexion — FinVest',
      body: [
        el('p', { className: 'text-muted', textContent: 'Connectez-vous pour retrouver vos données et analyses financières.' }),
        (() => { errorEl = el('div', { className: 'auth-error', style: { display: 'none' } }); return errorEl; })(),
        el('label', { className: 'form-label', textContent: 'Email' }),
        (() => { const i = el('input', { type: 'email', className: 'input input--full', placeholder: 'email@example.com', autocomplete: 'email' });
          i.addEventListener('input', () => { emailVal = i.value; }); return i; })(),
        el('label', { className: 'form-label mt-12', textContent: 'Mot de passe' }),
        (() => { const i = el('input', { type: 'password', className: 'input input--full', placeholder: '••••••••', autocomplete: 'current-password' });
          i.addEventListener('input', () => { passVal = i.value; }); return i; })()
      ],
      actions: [
        el('button', { className: 'btn', onClick: () => m.close() }, ['Annuler']),
        (() => {
          loginBtn = el('button', { className: 'btn btn--primary', onClick: async () => {
            if (!emailVal.trim()) { _showAuthError(errorEl, 'Veuillez entrer votre email.'); return; }
            if (!passVal) { _showAuthError(errorEl, 'Veuillez entrer votre mot de passe.'); return; }

            loginBtn.disabled = true;
            loginBtn.textContent = 'Connexion...';
            errorEl.style.display = 'none';
            try {
              // 1. Login
              await Store.login(emailVal.trim(), passVal);
              console.log('[FinVest] Login OK — isMobile:', isMobile);
              toast('Connecté avec succès', 'success');

              // 2. Force-remove modal overlay immediately
              if (m.overlay && m.overlay.parentNode) m.overlay.remove();

              // 3. Cloud load
              let loaded = false;
              try {
                loaded = await Store.cloudLoad();
                console.log('[FinVest] Cloud load result:', loaded);
              } catch (err) {
                console.error('[FinVest] Cloud load failed:', err);
                toast('Erreur chargement cloud : ' + err.message, 'error');
              }

              // 4. Navigate
              const st = Store.getState();
              console.log('[FinVest] Post-login — step:', st.step, 'analysis:', !!st.analysis, 'isMobile:', isMobile);
              if (loaded && st.analysis) {
                toast('Données chargées depuis le cloud', 'success');
                Store.setState({ step: 'dashboard', currentView: st.currentView || 'overview' });
              }
              window.renderApp();
            } catch (e) {
              loginBtn.disabled = false;
              loginBtn.textContent = 'Se connecter';
              _showAuthError(errorEl, e.message);
            }
          } }, ['Se connecter']);
          return loginBtn;
        })()
      ]
    });

    // Link to switch to register
    const switchLink = el('div', { className: 'auth-switch', style: { textAlign: 'center', marginTop: '12px' } }, [
      el('span', { className: 'text-muted', textContent: 'Pas encore de compte ? ' }),
      el('a', { href: '#', className: 'auth-switch__link', onClick: (e) => {
        e.preventDefault();
        if (m.overlay && m.overlay.parentNode) m.overlay.remove();
        showRegisterModal();
      }, textContent: 'Créer un compte' })
    ]);

    const modalBody = m.overlay.querySelector('.modal-body');
    if (modalBody) modalBody.appendChild(switchLink);
  }

  /* ----- Auth error helper ------------------------------------ */
  function _showAuthError(errorEl, message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  /* =============================================================
     B. QUESTIONNAIRE  (7 steps)
     ============================================================= */
  const QUESTIONNAIRE_STEPS = [
    { title: 'Profil personnel', icon: 'user' },
    { title: 'Revenus', icon: 'dollar-sign' },
    { title: 'Dépenses', icon: 'briefcase' },
    { title: 'Patrimoine', icon: 'layers' },
    { title: 'Dettes', icon: 'lock' },
    { title: 'Objectifs', icon: 'target' },
    { title: 'Profil de risque', icon: 'shield' }
  ];

  function questionnaire(container) {
    container.innerHTML = '';
    const s = Store.getState();
    const step = s.questionnaireStep || 0;
    const p = s.profile;
    const qMode = s.questionnaireMode || null; // 'quick' | 'full' | null (not chosen)

    // If mode not yet chosen, show mode selector
    if (qMode === null && step <= 0) {
      renderModeSelector(container);
      return;
    }

    // Quick mode steps: 0 (profil), 1 (revenus), 2 (dépenses), 5 (objectifs) → then analyse
    const quickSteps = [0, 1, 2, 5];
    const isQuick = qMode === 'quick';
    const effectiveSteps = isQuick ? quickSteps : [0, 1, 2, 3, 4, 5, 6];
    const currentStepIndex = isQuick ? quickSteps.indexOf(step) : step;
    const actualStep = step;
    const maxStepIndex = effectiveSteps.length - 1;
    const isLastStep = currentStepIndex >= maxStepIndex;

    const STEPS_DISPLAY = isQuick
      ? [QUESTIONNAIRE_STEPS[0], QUESTIONNAIRE_STEPS[1], QUESTIONNAIRE_STEPS[2], QUESTIONNAIRE_STEPS[5]]
      : QUESTIONNAIRE_STEPS;

    const wrap = el('div', { className: 'questionnaire' });

    // Mode badge
    wrap.appendChild(el('div', { className: 'q-mode-badge', onClick: () => {
      Store.setState({ questionnaireMode: null, questionnaireStep: 0 });
      window.navigateTo('questionnaire');
    } }, [
      el('span', { textContent: isQuick ? '⚡ Mode rapide' : '📋 Mode complet' }),
      el('span', { className: 'q-mode-badge__change', textContent: '(changer)' })
    ]));

    // Step indicator
    wrap.appendChild(stepIndicator(STEPS_DISPLAY.map(s => s.title), Math.max(0, currentStepIndex)));

    // Step title
    const stepInfo = QUESTIONNAIRE_STEPS[actualStep];
    wrap.appendChild(el('div', { className: 'q-header ez-fade-in' }, [
      icon(stepInfo.icon, 28),
      el('h2', { textContent: stepInfo.title })
    ]));

    // Questions container
    const questions = el('div', { className: 'q-body ez-fade-in', dataset: { step: actualStep } });

    switch (actualStep) {
      case 0: renderStep0(questions, p); break;
      case 1: renderStep1(questions, p); break;
      case 2: renderStep2(questions, p); break;
      case 3: renderStep3(questions, p); break;
      case 4: renderStep4(questions, p); break;
      case 5: renderStep5(questions, p); break;
      case 6: renderStep6(questions, p); break;
    }

    wrap.appendChild(questions);

    // Navigation buttons
    const nav = el('div', { className: 'q-nav' });
    if (currentStepIndex > 0) {
      const prevStep = effectiveSteps[currentStepIndex - 1];
      nav.appendChild(el('button', { className: 'btn', onClick: () => {
        Store.setState({ questionnaireStep: prevStep });
        window.navigateTo('questionnaire');
      } }, [icon('chevron-left', 16), 'Précédent']));
    } else {
      nav.appendChild(el('button', { className: 'btn btn--ghost', onClick: () => {
        Store.setState({ questionnaireMode: null, questionnaireStep: 0 });
        window.navigateTo('questionnaire');
      } }, [icon('chevron-left', 16), 'Retour']));
    }
    if (!isLastStep) {
      const nextStep = effectiveSteps[currentStepIndex + 1];
      nav.appendChild(el('button', { className: 'btn btn--primary', onClick: () => {
        Store.setState({ questionnaireStep: nextStep });
        window.navigateTo('questionnaire');
      } }, ['Suivant', icon('chevron-right', 16)]));
    } else {
      nav.appendChild(el('button', { className: 'btn btn--primary btn--lg', onClick: () => {
        try {
          // In quick mode, set defaults for skipped steps
          if (isQuick) {
            Store.updateProfile({ riskAnswers: [3, 3, 3, 3, 3, 3, 3] });
          }
          Store.runAnalysis();
          toast('Analyse terminée !', 'success');
          window.navigateTo('overview');
        } catch (e) { toast('Erreur d\'analyse: ' + e.message, 'error'); }
      } }, [icon('activity', 18), 'Lancer l\'analyse']));
    }
    wrap.appendChild(nav);
    container.appendChild(wrap);
  }

  /* ----- Mode Selector ---------------------------------------- */
  function renderModeSelector(container) {
    const wrap = el('div', { className: 'questionnaire' });

    wrap.appendChild(el('div', { className: 'q-mode-hero ez-fade-in' }, [
      el('div', { className: 'q-mode-hero__icon' }, ['📝']),
      el('h2', { textContent: 'Choisissez votre questionnaire' }),
      el('p', { className: 'text-muted', textContent: 'Sélectionnez le niveau de détail qui vous convient.' })
    ]));

    const grid = el('div', { className: 'q-mode-grid' });

    // Quick mode
    const quickCard = el('div', { className: 'q-mode-card q-mode-card--quick anim-slide-up stagger-1', onClick: () => {
      Store.setState({ questionnaireMode: 'quick', questionnaireStep: 0 });
      window.navigateTo('questionnaire');
    } });
    quickCard.innerHTML = `
      <div class="q-mode-card__icon">⚡</div>
      <h3 class="q-mode-card__title">Rapide</h3>
      <p class="q-mode-card__time">~3 minutes • 4 étapes</p>
      <p class="q-mode-card__desc">L'essentiel pour une première analyse : profil, revenus, dépenses et objectifs. Parfait pour découvrir l'application.</p>
      <ul class="q-mode-card__list">
        <li>✅ Profil personnel</li>
        <li>✅ Revenus</li>
        <li>✅ Dépenses</li>
        <li>✅ Objectifs & retraite</li>
        <li>⏭️ Patrimoine (valeurs par défaut)</li>
        <li>⏭️ Dettes (valeurs par défaut)</li>
        <li>⏭️ Profil de risque (modéré par défaut)</li>
      </ul>
      <div class="q-mode-card__footer">Commencer →</div>
    `;
    grid.appendChild(quickCard);

    // Full mode
    const fullCard = el('div', { className: 'q-mode-card q-mode-card--full anim-slide-up stagger-2', onClick: () => {
      Store.setState({ questionnaireMode: 'full', questionnaireStep: 0 });
      window.navigateTo('questionnaire');
    } });
    fullCard.innerHTML = `
      <div class="q-mode-card__icon">📋</div>
      <h3 class="q-mode-card__title">Complet</h3>
      <p class="q-mode-card__time">~10 minutes • 7 étapes</p>
      <p class="q-mode-card__desc">Analyse approfondie avec tous les détails : placements, immobilier, dettes, profil de risque. Conseils ultra-personnalisés.</p>
      <ul class="q-mode-card__list">
        <li>✅ Profil personnel</li>
        <li>✅ Revenus</li>
        <li>✅ Dépenses</li>
        <li>✅ Patrimoine détaillé</li>
        <li>✅ Dettes & crédits</li>
        <li>✅ Objectifs & retraite</li>
        <li>✅ Profil de risque (7 questions)</li>
      </ul>
      <div class="q-mode-card__footer">Commencer →</div>
    `;
    grid.appendChild(fullCard);

    wrap.appendChild(grid);
    container.appendChild(wrap);
  }

  /* ----- Step 0: Profil personnel ----------------------------- */
  function renderStep0(c, p) {
    c.appendChild(questionCard({ id: 'age', label: 'Âge', type: 'slider', min: 18, max: 80, value: p.age, onChange: v => Store.updateProfile({ age: v }) }));
    c.appendChild(questionCard({ id: 'family', label: 'Situation familiale', type: 'select', value: p.familySituation, options: [
      { value: 'single', label: 'Célibataire' }, { value: 'couple', label: 'En couple' },
      { value: 'married', label: 'Marié(e)' }, { value: 'divorced', label: 'Divorcé(e)' },
      { value: 'widowed', label: 'Veuf/ve' }
    ], onChange: v => Store.updateProfile({ familySituation: v }) }));
    c.appendChild(questionCard({ id: 'dependents', label: 'Personnes à charge', hint: '(enfants, parents…)', type: 'number', min: 0, max: 20, value: p.dependents, onChange: v => Store.updateProfile({ dependents: v }) }));
  }

  /* ----- Step 1: Revenus -------------------------------------- */
  function renderStep1(c, p) {
    c.appendChild(questionCard({ id: 'income', label: 'Salaire mensuel net', type: 'number', value: p.monthlyNetIncome, unit: '€/mois', hint: 'Après impôt', onChange: v => Store.updateProfile({ monthlyNetIncome: v }) }));
    c.appendChild(questionCard({ id: 'other', label: 'Autres revenus mensuels', hint: '(freelance, loyers, dividendes…)', type: 'number', value: p.otherIncome, unit: '€/mois', onChange: v => Store.updateProfile({ otherIncome: v }) }));
    c.appendChild(questionCard({ id: 'stability', label: 'Stabilité professionnelle', type: 'select', value: p.employmentStability, options: [
      { value: 'very_stable', label: 'Très stable (fonctionnaire, CDI +5 ans)' },
      { value: 'stable', label: 'Stable (CDI)' },
      { value: 'moderate', label: 'Modérée (CDD, intérim)' },
      { value: 'unstable', label: 'Instable (freelance, création)' },
      { value: 'no_income', label: 'Sans emploi / en recherche' }
    ], onChange: v => Store.updateProfile({ employmentStability: v }) }));
  }

  /* ----- Step 2: Dépenses ------------------------------------- */
  function renderStep2(c, p) {
    c.appendChild(el('p', { className: 'q-info', textContent: 'Indiquez vos dépenses mensuelles moyennes. Soyez le plus précis possible pour une analyse optimale.' }));
    c.appendChild(questionCard({ id: 'rent', label: 'Loyer / Crédit immobilier', type: 'number', value: p.fixedExpenses, unit: '€/mois', onChange: v => Store.updateProfile({ fixedExpenses: v }) }));
    c.appendChild(questionCard({ id: 'variable', label: 'Dépenses variables', hint: '(alimentation, transport, loisirs, abonnements…)', type: 'number', value: p.variableExpenses, unit: '€/mois', onChange: v => Store.updateProfile({ variableExpenses: v }) }));

    const totalExp = (p.fixedExpenses || 0) + (p.variableExpenses || 0);
    const income = (p.monthlyNetIncome || 0) + (p.otherIncome || 0);
    if (income > 0) {
      const pct = ((totalExp / income) * 100).toFixed(1);
      c.appendChild(el('div', { className: `q-feedback ${totalExp > income ? 'q-feedback--danger' : 'q-feedback--ok'}` }, [
        icon(totalExp > income ? 'alert' : 'check', 16),
        ` Total dépenses : ${formatCurrency(totalExp)} (${pct}% des revenus)`
      ]));
    }
  }

  /* ----- Step 3: Patrimoine ----------------------------------- */
  function renderStep3(c, p) {
    c.appendChild(questionCard({ id: 'savings', label: 'Épargne disponible', hint: '(Livret A, LDDS, comptes courants)', type: 'number', value: p.currentSavings, unit: '€', onChange: v => Store.updateProfile({ currentSavings: v }) }));

    // Dynamic investment list
    c.appendChild(el('h3', { className: 'q-section-title', textContent: 'Placements' }));
    const invList = el('div', { className: 'dynamic-list' });
    const investments = p.investments || [];

    const invTypes = [
      { value: 'pea', label: 'PEA' }, { value: 'cto_actions', label: 'CTO Actions' },
      { value: 'assurance_vie_fonds_euros', label: 'Assurance-vie Fonds €' },
      { value: 'assurance_vie_uc', label: 'Assurance-vie UC' },
      { value: 'per', label: 'PER' }, { value: 'etf_monde', label: 'ETF Monde' },
      { value: 'etf_emergents', label: 'ETF Émergents' },
      { value: 'scpi', label: 'SCPI' }, { value: 'crypto', label: 'Crypto' },
      { value: 'obligations', label: 'Obligations' }, { value: 'autre', label: 'Autre' }
    ];

    function renderInvestments() {
      invList.innerHTML = '';
      investments.forEach((inv, i) => {
        const row = el('div', { className: 'dynamic-row' }, [
          el('select', { className: 'select select--sm', onChange: e => { investments[i].type = e.target.value; Store.updateProfile({ investments: [...investments] }); } },
            invTypes.map(t => { const o = el('option', { value: t.value, textContent: t.label }); if (t.value === inv.type) o.selected = true; return o; })
          ),
          (() => { const inp = el('input', { type: 'number', className: 'input input--sm', value: inv.amount || '', placeholder: 'Montant €' });
            inp.addEventListener('input', () => { investments[i].amount = parseFloat(inp.value) || 0; Store.updateProfile({ investments: [...investments] }); }); return inp; })(),
          el('button', { className: 'btn btn--icon btn--danger', onClick: () => { investments.splice(i, 1); Store.updateProfile({ investments: [...investments] }); renderInvestments(); } }, [icon('trash', 14)])
        ]);
        invList.appendChild(row);
      });
    }
    renderInvestments();
    c.appendChild(invList);
    c.appendChild(el('button', { className: 'btn btn--sm btn--ghost', onClick: () => {
      investments.push({ type: 'pea', amount: 0 });
      Store.updateProfile({ investments: [...investments] });
      renderInvestments();
    } }, [icon('plus', 14), 'Ajouter un placement']));

    // Real estate
    c.appendChild(el('h3', { className: 'q-section-title mt-24', textContent: 'Immobilier (résidence principale / investissement)' }));
    const reList = el('div', { className: 'dynamic-list' });
    const realEstate = p.realEstate || [];

    function renderRealEstate() {
      reList.innerHTML = '';
      realEstate.forEach((re, i) => {
        const row = el('div', { className: 'dynamic-row' }, [
          (() => { const inp = el('input', { type: 'text', className: 'input input--sm', value: re.name || '', placeholder: 'Nom du bien' });
            inp.addEventListener('input', () => { realEstate[i].name = inp.value; Store.updateProfile({ realEstate: [...realEstate] }); }); return inp; })(),
          (() => { const inp = el('input', { type: 'number', className: 'input input--sm', value: re.value || '', placeholder: 'Valeur estimée €' });
            inp.addEventListener('input', () => { realEstate[i].value = parseFloat(inp.value) || 0; Store.updateProfile({ realEstate: [...realEstate] }); }); return inp; })(),
          el('button', { className: 'btn btn--icon btn--danger', onClick: () => { realEstate.splice(i, 1); Store.updateProfile({ realEstate: [...realEstate] }); renderRealEstate(); } }, [icon('trash', 14)])
        ]);
        reList.appendChild(row);
      });
    }
    renderRealEstate();
    c.appendChild(reList);
    c.appendChild(el('button', { className: 'btn btn--sm btn--ghost', onClick: () => {
      realEstate.push({ name: '', value: 0 });
      Store.updateProfile({ realEstate: [...realEstate] });
      renderRealEstate();
    } }, [icon('plus', 14), 'Ajouter un bien']));
  }

  /* ----- Step 4: Dettes --------------------------------------- */
  function renderStep4(c, p) {
    c.appendChild(el('p', { className: 'q-info', textContent: 'Listez tous vos crédits en cours (immobilier, consommation, auto, étudiant…)' }));
    const debts = p.debts || [];
    const debtList = el('div', { className: 'dynamic-list' });

    function renderDebts() {
      debtList.innerHTML = '';
      debts.forEach((d, i) => {
        const card = el('div', { className: 'debt-entry' }, [
          el('div', { className: 'debt-entry__header' }, [
            (() => { const inp = el('input', { type: 'text', className: 'input input--sm', value: d.name || '', placeholder: 'Nom du crédit' });
              inp.addEventListener('input', () => { debts[i].name = inp.value; Store.updateProfile({ debts: [...debts] }); }); return inp; })(),
            el('button', { className: 'btn btn--icon btn--danger', onClick: () => { debts.splice(i, 1); Store.updateProfile({ debts: [...debts] }); renderDebts(); } }, [icon('trash', 14)])
          ]),
          el('div', { className: 'debt-entry__fields' }, [
            el('div', { className: 'field-group' }, [
              el('label', { textContent: 'Capital restant dû' }),
              (() => { const inp = el('input', { type: 'number', className: 'input input--sm', value: d.remainingAmount || '', placeholder: '€' });
                inp.addEventListener('input', () => { debts[i].remainingAmount = parseFloat(inp.value) || 0; Store.updateProfile({ debts: [...debts] }); }); return inp; })()
            ]),
            el('div', { className: 'field-group' }, [
              el('label', { textContent: 'Mensualité' }),
              (() => { const inp = el('input', { type: 'number', className: 'input input--sm', value: d.monthlyPayment || '', placeholder: '€/mois' });
                inp.addEventListener('input', () => { debts[i].monthlyPayment = parseFloat(inp.value) || 0; Store.updateProfile({ debts: [...debts] }); }); return inp; })()
            ]),
            el('div', { className: 'field-group' }, [
              el('label', { textContent: 'Taux annuel (%)' }),
              (() => { const inp = el('input', { type: 'number', className: 'input input--sm', value: d.rate || '', placeholder: '%', step: '0.1' });
                inp.addEventListener('input', () => { debts[i].rate = parseFloat(inp.value) || 0; Store.updateProfile({ debts: [...debts] }); }); return inp; })()
            ]),
            el('div', { className: 'field-group' }, [
              el('label', { textContent: 'Mois restants' }),
              (() => { const inp = el('input', { type: 'number', className: 'input input--sm', value: d.remainingMonths || '', placeholder: 'mois' });
                inp.addEventListener('input', () => { debts[i].remainingMonths = parseFloat(inp.value) || 0; Store.updateProfile({ debts: [...debts] }); }); return inp; })()
            ])
          ])
        ]);
        debtList.appendChild(card);
      });
      if (debts.length === 0) {
        debtList.appendChild(el('p', { className: 'text-muted text-center', textContent: '🎉 Aucune dette — c\'est une excellente base !' }));
      }
    }
    renderDebts();
    c.appendChild(debtList);
    c.appendChild(el('button', { className: 'btn btn--sm btn--ghost', onClick: () => {
      debts.push({ name: '', remainingAmount: 0, monthlyPayment: 0, rate: 0, remainingMonths: 0 });
      Store.updateProfile({ debts: [...debts] });
      renderDebts();
    } }, [icon('plus', 14), 'Ajouter un crédit']));
  }

  /* ----- Step 5: Objectifs ------------------------------------ */
  function renderStep5(c, p) {
    const goals = p.goals || [];
    c.appendChild(el('p', { className: 'q-info', textContent: 'Quels sont vos objectifs financiers ? Ajoutez-les ci-dessous.' }));

    // Preset suggestions
    const presets = [
      { name: 'Fonds d\'urgence', targetAmount: 10000, horizonYears: 2, priority: 'high' },
      { name: 'Achat immobilier', targetAmount: 50000, horizonYears: 5, priority: 'high' },
      { name: 'Retraite anticipée', targetAmount: 500000, horizonYears: 20, priority: 'medium' },
      { name: 'Éducation enfants', targetAmount: 30000, horizonYears: 10, priority: 'medium' },
      { name: 'Voyage', targetAmount: 5000, horizonYears: 1, priority: 'low' },
    ];

    const presetBar = el('div', { className: 'preset-bar' }, presets.map(pre =>
      el('button', { className: 'btn btn--sm btn--outline', onClick: () => {
        goals.push({ ...pre });
        Store.updateProfile({ goals: [...goals] });
        renderGoals();
      } }, [pre.name])
    ));
    c.appendChild(presetBar);

    const goalList = el('div', { className: 'dynamic-list' });
    function renderGoals() {
      goalList.innerHTML = '';
      goals.forEach((g, i) => {
        const priorities = [{ value: 'high', label: '🔴 Haute' }, { value: 'medium', label: '🟡 Moyenne' }, { value: 'low', label: '🟢 Basse' }];
        const card = el('div', { className: 'goal-entry' }, [
          el('div', { className: 'goal-entry__header' }, [
            (() => { const inp = el('input', { type: 'text', className: 'input input--sm', value: g.name || '', placeholder: 'Nom de l\'objectif' });
              inp.addEventListener('input', () => { goals[i].name = inp.value; Store.updateProfile({ goals: [...goals] }); }); return inp; })(),
            el('button', { className: 'btn btn--icon btn--danger', onClick: () => { goals.splice(i, 1); Store.updateProfile({ goals: [...goals] }); renderGoals(); } }, [icon('trash', 14)])
          ]),
          el('div', { className: 'goal-entry__fields' }, [
            el('div', { className: 'field-group' }, [
              el('label', { textContent: 'Montant cible' }),
              (() => { const inp = el('input', { type: 'number', className: 'input input--sm', value: g.targetAmount || '', placeholder: '€' });
                inp.addEventListener('input', () => { goals[i].targetAmount = parseFloat(inp.value) || 0; Store.updateProfile({ goals: [...goals] }); }); return inp; })()
            ]),
            el('div', { className: 'field-group' }, [
              el('label', { textContent: 'Horizon (années)' }),
              (() => { const inp = el('input', { type: 'number', className: 'input input--sm', value: g.horizonYears || '', placeholder: 'ans', min: 1, max: 50 });
                inp.addEventListener('input', () => { goals[i].horizonYears = parseFloat(inp.value) || 5; Store.updateProfile({ goals: [...goals] }); }); return inp; })()
            ]),
            el('div', { className: 'field-group' }, [
              el('label', { textContent: 'Priorité' }),
              (() => { const sel = el('select', { className: 'select select--sm' }, priorities.map(pr => { const o = el('option', { value: pr.value, textContent: pr.label }); if (pr.value === g.priority) o.selected = true; return o; }));
                sel.addEventListener('change', () => { goals[i].priority = sel.value; Store.updateProfile({ goals: [...goals] }); }); return sel; })()
            ])
          ])
        ]);
        goalList.appendChild(card);
      });
    }
    renderGoals();
    c.appendChild(goalList);
    c.appendChild(el('button', { className: 'btn btn--sm btn--ghost', onClick: () => {
      goals.push({ name: '', targetAmount: 0, horizonYears: 5, priority: 'medium' });
      Store.updateProfile({ goals: [...goals] });
      renderGoals();
    } }, [icon('plus', 14), 'Ajouter un objectif']));

    // Retirement age
    c.appendChild(el('h3', { className: 'q-section-title mt-24', textContent: 'Retraite' }));
    c.appendChild(questionCard({ id: 'retAge', label: 'Âge de retraite souhaité', type: 'slider', min: 50, max: 75, value: p.retirementAge || 65, onChange: v => Store.updateProfile({ retirementAge: v }) }));
    c.appendChild(questionCard({ id: 'retIncome', label: 'Revenu mensuel souhaité à la retraite', hint: '(0 = 70% du revenu actuel)', type: 'number', value: p.retirementIncome || 0, unit: '€/mois', onChange: v => Store.updateProfile({ retirementIncome: v }) }));
  }

  /* ----- Step 6: Profil de risque ----------------------------- */
  function renderStep6(c, p) {
    c.appendChild(el('p', { className: 'q-info', textContent: 'Ces questions déterminent votre tolérance au risque. Répondez honnêtement — il n\'y a pas de mauvaise réponse.' }));
    const riskAnswers = p.riskAnswers || [3, 3, 3, 3, 3, 3, 3];

    const riskQuestions = [
      { q: 'Votre portefeuille perd 20% en un mois. Que faites-vous ?', opts: [
        { value: 1, label: 'Je vends tout immédiatement' }, { value: 2, label: 'Je vends une partie' },
        { value: 3, label: 'J\'attends sans rien faire' }, { value: 4, label: 'J\'en profite pour acheter un peu' },
        { value: 5, label: 'J\'investis massivement' }
      ]},
      { q: 'Quel rendement annuel espérez-vous sur vos placements ?', opts: [
        { value: 1, label: '1-2% (sécurité maximale)' }, { value: 2, label: '3-4% (prudent)' },
        { value: 3, label: '5-7% (équilibré)' }, { value: 4, label: '8-12% (dynamique)' },
        { value: 5, label: '> 12% (agressif)' }
      ]},
      { q: 'Quelle part de votre épargne pourriez-vous ne pas toucher pendant 10 ans ?', opts: [
        { value: 1, label: 'Aucune' }, { value: 2, label: 'Moins de 20%' },
        { value: 3, label: '20 à 50%' }, { value: 4, label: '50 à 80%' },
        { value: 5, label: 'Plus de 80%' }
      ]},
      { q: 'Comment décririez-vous votre expérience avec les investissements ?', opts: [
        { value: 1, label: 'Aucune' }, { value: 2, label: 'Livrets uniquement' },
        { value: 3, label: 'Assurance-vie / fonds' }, { value: 4, label: 'Actions / ETF' },
        { value: 5, label: 'Tous marchés (actions, dérivés, crypto…)' }
      ]},
      { q: 'Votre investissement gagne 50% en 6 mois. Que faites-vous ?', opts: [
        { value: 1, label: 'Je sécurise tout' }, { value: 2, label: 'Je vends la moitié' },
        { value: 3, label: 'Je conserve sans bouger' }, { value: 4, label: 'Je conserve et j\'en ajoute' },
        { value: 5, label: 'Je double ma mise' }
      ]},
      { q: 'Préférez-vous un gain certain de 1 000 € ou 50% de chance de gagner 3 000 € ?', opts: [
        { value: 1, label: '1 000 € certains, sans hésiter' }, { value: 2, label: 'Plutôt les 1 000 €' },
        { value: 3, label: 'Indifférent' }, { value: 4, label: 'Plutôt le pari' },
        { value: 5, label: 'Le pari à 3 000 €, clairement' }
      ]},
      { q: 'En cas de crise économique majeure, vous...', opts: [
        { value: 1, label: 'Sortez de tous vos placements' }, { value: 2, label: 'Passez en placements très sûrs' },
        { value: 3, label: 'Gardez votre allocation actuelle' }, { value: 4, label: 'Achetez des actifs décotés' },
        { value: 5, label: 'Investissez massivement (opportunité)' }
      ]}
    ];

    riskQuestions.forEach((rq, i) => {
      c.appendChild(questionCard({
        id: `risk_${i}`, label: `Question ${i + 1}/7 — ${rq.q}`,
        type: 'radio', options: rq.opts, value: riskAnswers[i],
        onChange: v => {
          riskAnswers[i] = v;
          Store.updateProfile({ riskAnswers: [...riskAnswers] });
          // Update risk preview
          const preview = c.querySelector('.risk-preview-value');
          if (preview) {
            const score = FinEngine.computeRiskScore(riskAnswers);
            preview.textContent = `${score.toFixed(1)} / 10`;
            const label = score <= 3 ? 'Conservateur' : score <= 5 ? 'Modéré' : score <= 7 ? 'Dynamique' : 'Agressif';
            const labelEl = c.querySelector('.risk-preview-label');
            if (labelEl) labelEl.textContent = label;
          }
        }
      }));
    });

    // Risk score preview
    const score = FinEngine.computeRiskScore(riskAnswers);
    const label = score <= 3 ? 'Conservateur' : score <= 5 ? 'Modéré' : score <= 7 ? 'Dynamique' : 'Agressif';
    c.appendChild(el('div', { className: 'risk-preview' }, [
      el('span', { textContent: 'Score de risque : ' }),
      el('span', { className: 'risk-preview-value', textContent: `${score.toFixed(1)} / 10` }),
      el('span', { className: 'risk-preview-label', textContent: ` — ${label}` })
    ]));
  }

  /* =============================================================
     C. OVERVIEW — Dashboard principal
     ============================================================= */
  function overview(container) {
    container.innerHTML = '';
    const s = Store.getState();
    const a = s.analysis;
    if (!a) { container.appendChild(el('p', { textContent: 'Aucune analyse disponible.' })); return; }

    const wrap = el('div', { className: 'dashboard' });

    // Health score
    const scoreSection = el('div', { className: 'score-section ez-fade-in' });
    scoreSection.appendChild(scoreGauge(a.healthScore.total, 'Santé Financière'));
    const components = el('div', { className: 'score-components' });
    for (const [key, comp] of Object.entries(a.healthScore.components)) {
      components.appendChild(el('div', { className: 'score-comp' }, [
        progressRing(comp.score, 100, comp.score >= 70 ? 'var(--ez-success)' : comp.score >= 40 ? 'var(--ez-warning)' : 'var(--ez-danger)', null, 50),
        el('div', { className: 'score-comp__info' }, [
          el('div', { className: 'score-comp__name', textContent: key.charAt(0).toUpperCase() + key.slice(1) }),
          el('div', { className: 'score-comp__detail text-muted', textContent: comp.detail })
        ])
      ]));
    }
    scoreSection.appendChild(components);
    wrap.appendChild(scoreSection);

    // Stat cards grid
    const grid = el('div', { className: 'stats-grid ez-fade-in' });
    grid.appendChild(statCard({ title: 'Revenus mensuels', value: formatCurrency(a.balance.income), iconName: 'dollar-sign', color: 'var(--ez-success)' }));
    grid.appendChild(statCard({ title: 'Dépenses mensuelles', value: formatCurrency(a.balance.expenses), iconName: 'briefcase', color: 'var(--ez-warning)' }));
    grid.appendChild(statCard({ title: 'Capacité d\'épargne', value: formatCurrency(a.balance.surplus), subtitle: `${a.balance.savingsRate.toFixed(1)}% des revenus`, iconName: 'piggy-bank', color: a.balance.surplus >= 0 ? 'var(--ez-primary)' : 'var(--ez-danger)' }));
    grid.appendChild(statCard({ title: 'Patrimoine net', value: formatCurrency(a.ratios.netWorth), iconName: 'layers', color: '#8b5cf6' }));
    wrap.appendChild(grid);

    // Balance donut
    const chartRow = el('div', { className: 'chart-row ez-fade-in' });
    const balanceChart = el('div', { className: 'chart-container chart-container--sm' });
    balanceChart.appendChild(el('h3', { className: 'chart-title', textContent: 'Répartition du budget' }));
    const balCanvas = el('div', { className: 'chart-canvas', style: { height: '280px' } });
    balanceChart.appendChild(balCanvas);
    chartRow.appendChild(balanceChart);

    // Risk profile bar
    const riskBar = el('div', { className: 'risk-bar-section' });
    riskBar.appendChild(el('h3', { className: 'chart-title', textContent: 'Profil de risque' }));
    const riskScore = a.riskScore;
    const riskPct = (riskScore / 10) * 100;
    const riskLabel = riskScore <= 3 ? 'Conservateur' : riskScore <= 5 ? 'Modéré' : riskScore <= 7 ? 'Dynamique' : 'Agressif';
    const riskColor = riskScore <= 3 ? 'var(--ez-success)' : riskScore <= 5 ? 'var(--ez-primary)' : riskScore <= 7 ? 'var(--ez-warning)' : 'var(--ez-danger)';
    riskBar.innerHTML += `
      <div class="risk-meter">
        <div class="risk-meter__bar"><div class="risk-meter__fill" style="width:${riskPct}%;background:${riskColor}"></div></div>
        <div class="risk-meter__labels"><span>Conservateur</span><span>Modéré</span><span>Dynamique</span><span>Agressif</span></div>
        <div class="risk-meter__score" style="color:${riskColor}">${riskScore.toFixed(1)}/10 — ${riskLabel}</div>
      </div>
    `;
    // Key ratios
    const ratiosGrid = el('div', { className: 'ratios-grid' });
    const ratioItems = [
      { label: 'Taux d\'épargne', value: `${a.ratios.savingsRate.toFixed(1)}%`, ok: a.ratios.savingsRate >= 15 },
      { label: 'Taux d\'endettement', value: `${a.ratios.debtToIncomeRatio.toFixed(1)}%`, ok: a.ratios.debtToIncomeRatio < 33 },
      { label: 'Taux d\'effort', value: `${a.ratios.effortRate.toFixed(1)}%`, ok: a.ratios.effortRate < 40 },
      { label: 'Ratio liquidité', value: `${a.ratios.liquidityRatio.toFixed(1)} mois`, ok: a.ratios.liquidityRatio >= 3 }
    ];
    for (const r of ratioItems) {
      ratiosGrid.appendChild(el('div', { className: `ratio-item ${r.ok ? 'ratio-item--ok' : 'ratio-item--warn'}` }, [
        el('div', { className: 'ratio-value', textContent: r.value }),
        el('div', { className: 'ratio-label', textContent: r.label }),
        icon(r.ok ? 'check' : 'alert', 14)
      ]));
    }
    riskBar.appendChild(ratiosGrid);
    chartRow.appendChild(riskBar);
    wrap.appendChild(chartRow);

    // Alerts
    const urgentAdvice = (a.advice || []).filter(ad => ad.category === 'urgent');
    if (urgentAdvice.length) {
      const alertSection = el('div', { className: 'alerts-section ez-fade-in' });
      alertSection.appendChild(el('h3', { className: 'section-title section-title--danger' }, [icon('alert', 20), ' Alertes']));
      urgentAdvice.forEach(ad => alertSection.appendChild(adviceCard(ad)));
      wrap.appendChild(alertSection);
    }

    container.appendChild(wrap);

    // Initialize donut chart (after DOM insertion)
    requestAnimationFrame(() => {
      if (balCanvas.offsetWidth) {
        initChart(balCanvas, {
          tooltip: { trigger: 'item', formatter: '{b}: {c} € ({d}%)' },
          color: ['var(--ez-success)', 'var(--ez-warning)', 'var(--ez-danger)', 'var(--ez-primary)'],
          series: [{
            type: 'pie', radius: ['45%', '70%'], center: ['50%', '55%'],
            itemStyle: { borderRadius: 6, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 2 },
            label: { color: '#e5e7eb', fontSize: 11 },
            data: [
              { value: Math.round(a.balance.fixed), name: 'Charges fixes', itemStyle: { color: '#f59e0b' } },
              { value: Math.round(a.balance.variable), name: 'Dépenses variables', itemStyle: { color: '#ef4444' } },
              { value: Math.round(a.balance.debtPayments), name: 'Remboursements', itemStyle: { color: '#8b5cf6' } },
              { value: Math.max(0, Math.round(a.balance.surplus)), name: 'Épargne', itemStyle: { color: '#22c55e' } }
            ].filter(d => d.value > 0)
          }]
        });
      }
    });
  }

  /* =============================================================
     D. ALLOCATION — Portefeuille
     ============================================================= */
  function allocation(container) {
    container.innerHTML = '';
    const a = Store.getState().analysis;
    if (!a) return;

    const wrap = el('div', { className: 'dashboard' });

    // Profile label
    wrap.appendChild(el('div', { className: 'page-header ez-fade-in' }, [
      icon('pie-chart', 28),
      el('div', {}, [
        el('h2', { textContent: 'Allocation de portefeuille' }),
        el('p', { className: 'text-muted', textContent: `Profil : ${a.targetAllocation.profileLabel} — Rendement attendu : ${a.targetAllocation.expectedReturn}%/an — Volatilité : ${a.targetAllocation.expectedVolatility}%` })
      ])
    ]));

    // Chart row: current vs target
    const row = el('div', { className: 'chart-row ez-fade-in' });

    // Target allocation donut
    const targetBox = el('div', { className: 'chart-container' });
    targetBox.appendChild(el('h3', { className: 'chart-title', textContent: 'Allocation recommandée' }));
    const tCanvas = el('div', { className: 'chart-canvas', style: { height: '300px' } });
    targetBox.appendChild(tCanvas);
    targetBox.appendChild(allocationBar(a.targetAllocation.details));
    row.appendChild(targetBox);

    // Current allocation donut
    if (a.currentAllocation.total > 0) {
      const curBox = el('div', { className: 'chart-container' });
      curBox.appendChild(el('h3', { className: 'chart-title', textContent: 'Allocation actuelle' }));
      const cCanvas = el('div', { className: 'chart-canvas', style: { height: '300px' } });
      curBox.appendChild(cCanvas);
      curBox.appendChild(allocationBar(a.currentAllocation.details));
      row.appendChild(curBox);
    }
    wrap.appendChild(row);

    // Rebalancing table
    if (a.rebalancing && a.rebalancing.length) {
      const rebalSection = el('div', { className: 'section ez-fade-in' });
      rebalSection.appendChild(el('h3', { className: 'section-title' }, [icon('refresh', 20), ' Rééquilibrage recommandé']));
      rebalSection.appendChild(dataTable(
        ['Classe', 'Actuel', 'Cible', 'Écart', 'Action'],
        a.rebalancing.map(m => [
          m.label,
          `${m.currentPct.toFixed(1)}%`,
          `${m.targetPct.toFixed(1)}%`,
          { textContent: `${m.diffPct > 0 ? '+' : ''}${m.diffPct.toFixed(1)}%`, className: m.diffPct > 0 ? 'text-success' : 'text-danger' },
          { textContent: m.amount > 0 ? `Acheter ${formatCurrency(m.amount)}` : `Vendre ${formatCurrency(Math.abs(m.amount))}`, className: m.amount > 0 ? 'text-success' : 'text-danger' }
        ])
      ));
      wrap.appendChild(rebalSection);
    }

    // Asset class details
    const detailSection = el('div', { className: 'section ez-fade-in' });
    detailSection.appendChild(el('h3', { className: 'section-title' }, [icon('layers', 20), ' Détail des classes d\'actifs']));
    const detailGrid = el('div', { className: 'asset-grid' });
    for (const cls of a.targetAllocation.details) {
      if (cls.pct <= 0) continue;
      detailGrid.appendChild(el('div', { className: 'asset-card' }, [
        el('div', { className: 'asset-card__color', style: { background: cls.color } }),
        el('div', { className: 'asset-card__info' }, [
          el('h4', { textContent: `${cls.label} — ${cls.pct.toFixed(1)}%` }),
          el('p', { className: 'text-muted', textContent: cls.desc }),
          el('div', { className: 'asset-card__stats' }, [
            el('span', { textContent: `Rendement moy. : ${cls.returnAvg}%/an` }),
            el('span', { textContent: `Volatilité : ${cls.volatility}%` })
          ])
        ])
      ]));
    }
    detailSection.appendChild(detailGrid);
    wrap.appendChild(detailSection);
    container.appendChild(wrap);

    // Initialize charts
    requestAnimationFrame(() => {
      const mkDonutData = (details) => details.filter(d => d.pct > 0).map(d => ({ value: Math.round(d.pct * 10) / 10, name: d.label, itemStyle: { color: d.color } }));
      if (tCanvas.offsetWidth) {
        initChart(tCanvas, {
          tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
          series: [{ type: 'pie', radius: ['40%', '65%'], center: ['50%', '50%'], itemStyle: { borderRadius: 5, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 2 }, label: { color: '#e5e7eb', fontSize: 11 }, data: mkDonutData(a.targetAllocation.details) }]
        });
      }
      const cCanvas = container.querySelectorAll('.chart-canvas')[1];
      if (cCanvas && cCanvas.offsetWidth && a.currentAllocation.total > 0) {
        initChart(cCanvas, {
          tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
          series: [{ type: 'pie', radius: ['40%', '65%'], center: ['50%', '50%'], itemStyle: { borderRadius: 5, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 2 }, label: { color: '#e5e7eb', fontSize: 11 }, data: mkDonutData(a.currentAllocation.details) }]
        });
      }
    });
  }

  /* =============================================================
     E. PROJECTIONS — Monte Carlo + Compound Growth
     ============================================================= */
  function projections(container) {
    container.innerHTML = '';
    const a = Store.getState().analysis;
    if (!a) return;

    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(el('div', { className: 'page-header ez-fade-in' }, [
      icon('trending-up', 28),
      el('div', {}, [
        el('h2', { textContent: 'Projections & Simulations' }),
        el('p', { className: 'text-muted', textContent: `${a.monteCarlo.iterations} simulations Monte Carlo — Rendement attendu : ${a.targetAllocation.expectedReturn}%/an` })
      ])
    ]));

    // Monte Carlo fan chart
    const mcSection = el('div', { className: 'chart-container chart-container--wide ez-fade-in' });
    mcSection.appendChild(el('h3', { className: 'chart-title' }, ['Simulation Monte Carlo (projections patrimoniales)']));
    const mcCanvas = el('div', { className: 'chart-canvas', style: { height: '400px' } });
    mcSection.appendChild(mcCanvas);
    wrap.appendChild(mcSection);

    // Projection table
    const tableSection = el('div', { className: 'section ez-fade-in' });
    tableSection.appendChild(el('h3', { className: 'section-title' }, [icon('bar-chart-2', 20), ' Tableau des percentiles']));
    const years = a.monteCarlo.yearlyPercentiles;
    const displayYears = years.filter((_, i) => i === 0 || i % 5 === 0 || i === years.length - 1);
    tableSection.appendChild(dataTable(
      ['Année', 'P10 (pessimiste)', 'P25', 'P50 (médian)', 'P75', 'P90 (optimiste)'],
      displayYears.map(y => [
        `Année ${y.year}`,
        formatCurrency(y.p10), formatCurrency(y.p25), formatCurrency(y.p50),
        formatCurrency(y.p75), formatCurrency(y.p90)
      ])
    ));
    wrap.appendChild(tableSection);

    // Compound growth deterministic
    const cgSection = el('div', { className: 'chart-container chart-container--wide ez-fade-in' });
    cgSection.appendChild(el('h3', { className: 'chart-title' }, ['Projection déterministe (intérêts composés)']));
    const cgCanvas = el('div', { className: 'chart-canvas', style: { height: '350px' } });
    cgSection.appendChild(cgCanvas);
    wrap.appendChild(cgSection);

    // Inflation chart
    const infSection = el('div', { className: 'chart-container chart-container--wide ez-fade-in' });
    infSection.appendChild(el('h3', { className: 'chart-title' }, ['Impact de l\'inflation sur votre pouvoir d\'achat']));
    const infCanvas = el('div', { className: 'chart-canvas', style: { height: '300px' } });
    infSection.appendChild(infCanvas);
    wrap.appendChild(infSection);

    // Final stats
    const stats = a.monteCarlo.finalStats;
    const finalGrid = el('div', { className: 'stats-grid ez-fade-in' });
    finalGrid.appendChild(statCard({ title: 'Cas médian (P50)', value: formatCurrency(stats.p50), iconName: 'target', color: 'var(--ez-primary)' }));
    finalGrid.appendChild(statCard({ title: 'Cas pessimiste (P10)', value: formatCurrency(stats.p10), iconName: 'shield', color: 'var(--ez-danger)' }));
    finalGrid.appendChild(statCard({ title: 'Cas optimiste (P90)', value: formatCurrency(stats.p90), iconName: 'star', color: 'var(--ez-success)' }));
    finalGrid.appendChild(statCard({ title: 'Moyenne', value: formatCurrency(stats.mean), iconName: 'activity', color: '#8b5cf6' }));
    wrap.appendChild(finalGrid);

    container.appendChild(wrap);

    // Initialize charts
    requestAnimationFrame(() => {
      // Monte Carlo fan chart
      if (mcCanvas.offsetWidth) {
        const yp = a.monteCarlo.yearlyPercentiles;
        initChart(mcCanvas, {
          tooltip: { trigger: 'axis', formatter: params => {
            const y = params[0].axisValue;
            return `<b>Année ${y}</b><br/>` + params.map(p => `${p.seriesName}: ${formatCurrency(p.value)}`).join('<br/>');
          }},
          legend: { textStyle: { color: '#aaa' }, bottom: 0 },
          grid: { top: 30, bottom: 60, left: 80, right: 20 },
          xAxis: { type: 'category', data: yp.map(y => y.year), axisLabel: { color: '#aaa' } },
          yAxis: { type: 'value', axisLabel: { color: '#aaa', formatter: v => formatCurrency(v) }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
          series: [
            { name: 'P10', type: 'line', data: yp.map(y => y.p10), lineStyle: { opacity: 0.3, color: '#ef4444' }, itemStyle: { color: '#ef4444' }, symbol: 'none', areaStyle: null },
            { name: 'P25-P75', type: 'line', data: yp.map(y => y.p25), lineStyle: { opacity: 0 }, symbol: 'none', stack: 'band', areaStyle: { color: 'rgba(14,165,164,0.08)' } },
            { name: '', type: 'line', data: yp.map(y => y.p75 - y.p25), lineStyle: { opacity: 0 }, symbol: 'none', stack: 'band', areaStyle: { color: 'rgba(14,165,164,0.15)' } },
            { name: 'P50 (médian)', type: 'line', data: yp.map(y => y.p50), lineStyle: { width: 3, color: '#0ea5a4' }, itemStyle: { color: '#0ea5a4' }, symbol: 'none' },
            { name: 'P90', type: 'line', data: yp.map(y => y.p90), lineStyle: { opacity: 0.3, color: '#22c55e' }, itemStyle: { color: '#22c55e' }, symbol: 'none' }
          ]
        });
      }

      // Compound growth stacked area
      if (cgCanvas.offsetWidth) {
        const proj = a.projection;
        initChart(cgCanvas, {
          tooltip: { trigger: 'axis' },
          legend: { textStyle: { color: '#aaa' }, bottom: 0 },
          grid: { top: 20, bottom: 55, left: 80, right: 20 },
          xAxis: { type: 'category', data: proj.map(p => `An ${p.year}`), axisLabel: { color: '#aaa' } },
          yAxis: { type: 'value', axisLabel: { color: '#aaa', formatter: v => formatCurrency(v) }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
          series: [
            { name: 'Versements', type: 'bar', stack: 'total', data: proj.map(p => Math.round(p.contributions)), itemStyle: { color: '#3b82f6' } },
            { name: 'Intérêts', type: 'bar', stack: 'total', data: proj.map(p => Math.round(p.interest)), itemStyle: { color: '#22c55e' } },
            { name: 'Capital total', type: 'line', data: proj.map(p => Math.round(p.capital)), lineStyle: { width: 2, color: '#f59e0b' }, itemStyle: { color: '#f59e0b' }, symbol: 'none' }
          ]
        });
      }

      // Inflation
      if (infCanvas.offsetWidth) {
        const inf = a.inflation;
        initChart(infCanvas, {
          tooltip: { trigger: 'axis' },
          legend: { textStyle: { color: '#aaa' }, bottom: 0 },
          grid: { top: 20, bottom: 50, left: 80, right: 20 },
          xAxis: { type: 'category', data: inf.map(i => `An ${i.year}`), axisLabel: { color: '#aaa' } },
          yAxis: { type: 'value', axisLabel: { color: '#aaa', formatter: v => formatCurrency(v) }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
          series: [
            { name: 'Valeur nominale', type: 'line', data: inf.map(i => i.nominal), lineStyle: { color: '#94a3b8', type: 'dashed' }, symbol: 'none' },
            { name: 'Pouvoir d\'achat réel', type: 'line', data: inf.map(i => Math.round(i.real)), areaStyle: { color: 'rgba(239,68,68,0.1)' }, lineStyle: { color: '#ef4444' }, itemStyle: { color: '#ef4444' }, symbol: 'none' }
          ]
        });
      }
    });
  }

  /* =============================================================
     F. RETIREMENT — Planification retraite
     ============================================================= */
  function retirement(container) {
    container.innerHTML = '';
    const a = Store.getState().analysis;
    if (!a) return;
    const ret = a.retirement;

    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(el('div', { className: 'page-header ez-fade-in' }, [
      icon('clock', 28),
      el('div', {}, [
        el('h2', { textContent: 'Planification retraite' }),
        el('p', { className: 'text-muted', textContent: `Objectif : ${ret.retirementAge} ans — ${ret.yearsToRetirement} ans restants — Espérance de vie : ${ret.lifeExpectancy} ans` })
      ])
    ]));

    // Summary stats
    const grid = el('div', { className: 'stats-grid ez-fade-in' });
    grid.appendChild(statCard({ title: 'Capital nécessaire', value: formatCurrency(ret.capitalNeeded), subtitle: 'Règle des 4%', iconName: 'target', color: 'var(--ez-primary)' }));
    grid.appendChild(statCard({ title: 'Capital projeté', value: formatCurrency(ret.projectedCapital), subtitle: `à ${ret.retirementAge} ans`, iconName: 'trending-up', color: ret.onTrack ? 'var(--ez-success)' : 'var(--ez-danger)' }));
    grid.appendChild(statCard({ title: ret.onTrack ? 'Surplus' : 'Déficit', value: formatCurrency(Math.abs(ret.surplus)), iconName: ret.onTrack ? 'check' : 'alert', color: ret.onTrack ? 'var(--ez-success)' : 'var(--ez-danger)' }));
    grid.appendChild(statCard({ title: 'Revenu retraite visé', value: formatCurrency(ret.desiredMonthlyIncome) + '/mois', iconName: 'wallet', color: '#8b5cf6' }));
    wrap.appendChild(grid);

    // Status banner
    const statusCls = ret.onTrack ? 'banner banner--success' : 'banner banner--danger';
    const statusMsg = ret.onTrack
      ? `✅ Vous êtes en bonne voie ! Votre épargne actuelle de ${formatCurrency(ret.currentMonthlySaving)}/mois est suffisante.`
      : `⚠️ Il manque ${formatCurrency(ret.savingGap)}/mois d'épargne supplémentaire pour atteindre votre objectif. Épargne mensuelle requise : ${formatCurrency(ret.requiredMonthlySaving)}.`;
    wrap.appendChild(el('div', { className: statusCls + ' ez-fade-in', textContent: statusMsg }));

    // Accumulation + decumulation chart
    const chartBox = el('div', { className: 'chart-container chart-container--wide ez-fade-in' });
    chartBox.appendChild(el('h3', { className: 'chart-title' }, ['Trajectoire patrimoniale — Accumulation & Décumulation']));
    const retCanvas = el('div', { className: 'chart-canvas', style: { height: '380px' } });
    chartBox.appendChild(retCanvas);
    wrap.appendChild(chartBox);

    // Envelopes comparison
    const envSection = el('div', { className: 'section ez-fade-in' });
    envSection.appendChild(el('h3', { className: 'section-title' }, [icon('layers', 20), ' Enveloppes fiscales pour la retraite']));
    const envGrid = el('div', { className: 'env-grid' });

    const envelopes = [
      { name: 'PER (Plan d\'Épargne Retraite)', icon: 'lock', color: '#3b82f6',
        pros: ['Déduction fiscale à l\'entrée', 'Report d\'imposition'], cons: ['Bloqué jusqu\'à la retraite', 'Imposition à la sortie'], ideal: 'TMI ≥ 30%' },
      { name: 'PEA (Plan d\'Épargne Actions)', icon: 'trending-up', color: '#22c55e',
        pros: ['Exonération après 5 ans', 'Large choix d\'ETF'], cons: ['Plafonné à 150 000 €', 'Risque actions'], ideal: 'Horizon > 5 ans' },
      { name: 'Assurance-Vie', icon: 'shield', color: '#f59e0b',
        pros: ['Abattement après 8 ans', 'Avantages succession', 'Flexibilité'], cons: ['Frais de gestion', 'Complexité'], ideal: 'Patrimoine & transmission' }
    ];

    for (const env of envelopes) {
      envGrid.appendChild(el('div', { className: 'env-card' }, [
        el('div', { className: 'env-card__header', style: { borderColor: env.color } }, [
          icon(env.icon, 20),
          el('h4', { textContent: env.name })
        ]),
        el('div', { className: 'env-card__body' }, [
          el('div', { className: 'env-pros' }, [
            el('strong', { textContent: 'Avantages' }),
            ...env.pros.map(p => el('div', { className: 'env-item env-item--pro' }, [icon('check', 12), p]))
          ]),
          el('div', { className: 'env-cons' }, [
            el('strong', { textContent: 'Inconvénients' }),
            ...env.cons.map(c => el('div', { className: 'env-item env-item--con' }, [icon('x', 12), c]))
          ]),
          el('div', { className: 'env-ideal' }, [el('strong', { textContent: 'Idéal pour : ' }), env.ideal])
        ])
      ]));
    }
    envSection.appendChild(envGrid);
    wrap.appendChild(envSection);
    container.appendChild(wrap);

    // Chart
    requestAnimationFrame(() => {
      if (!retCanvas.offsetWidth) return;
      const accum = ret.projection.map(p => ({ year: Store.getState().profile.age + p.year, value: Math.round(p.capital) }));
      const decum = ret.decumulation.map(d => ({ year: d.year, value: Math.round(d.capital) }));
      const allYears = [...accum.map(a => a.year), ...decum.slice(1).map(d => d.year)];
      const accumData = allYears.map(y => { const f = accum.find(a => a.year === y); return f ? f.value : null; });
      const decumData = allYears.map(y => { const f = decum.find(d => d.year === y); return f ? f.value : null; });

      initChart(retCanvas, {
        tooltip: { trigger: 'axis', formatter: params => {
          return `<b>${params[0].axisValue} ans</b><br/>` + params.filter(p => p.value != null).map(p => `${p.seriesName}: ${formatCurrency(p.value)}`).join('<br/>');
        }},
        legend: { textStyle: { color: '#aaa' }, bottom: 0 },
        grid: { top: 30, bottom: 55, left: 80, right: 20 },
        xAxis: { type: 'category', data: allYears.map(y => `${y}`), axisLabel: { color: '#aaa' } },
        yAxis: { type: 'value', axisLabel: { color: '#aaa', formatter: v => formatCurrency(v) }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
        series: [
          { name: 'Accumulation', type: 'line', data: accumData, areaStyle: { color: 'rgba(14,165,164,0.15)' }, lineStyle: { color: '#0ea5a4', width: 2 }, itemStyle: { color: '#0ea5a4' }, symbol: 'none', connectNulls: false },
          { name: 'Décumulation', type: 'line', data: decumData, areaStyle: { color: 'rgba(245,158,11,0.15)' }, lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' }, symbol: 'none', connectNulls: false },
          { name: 'Objectif', type: 'line', data: allYears.map(() => ret.capitalNeeded), lineStyle: { color: '#ef4444', type: 'dashed', width: 1 }, symbol: 'none', itemStyle: { color: '#ef4444' } }
        ],
        markLine: { data: [{ xAxis: `${ret.retirementAge}` }], lineStyle: { color: '#94a3b8', type: 'dotted' }, label: { formatter: 'Retraite', color: '#aaa' } }
      });
    });
  }

  /* =============================================================
     G. DEBT — Gestion des dettes
     ============================================================= */
  function debt(container) {
    container.innerHTML = '';
    const a = Store.getState().analysis;
    if (!a) return;
    const d = a.debtAnalysis;

    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(el('div', { className: 'page-header ez-fade-in' }, [
      icon('lock', 28),
      el('div', {}, [
        el('h2', { textContent: 'Gestion des dettes' }),
        el('p', { className: 'text-muted', textContent: d.totalDebt > 0 ? `${d.debts.length} crédit(s) — Total : ${formatCurrency(d.totalDebt)}` : 'Aucune dette — félicitations !' })
      ])
    ]));

    if (d.totalDebt === 0) {
      wrap.appendChild(el('div', { className: 'empty-state ez-fade-in' }, [
        el('div', { className: 'empty-icon', textContent: '🎉' }),
        el('h3', { textContent: 'Zéro dette !' }),
        el('p', { textContent: 'Vous n\'avez aucune dette. Vous pouvez concentrer toute votre capacité d\'épargne sur l\'investissement.' })
      ]));
      container.appendChild(wrap);
      return;
    }

    // Stats
    const grid = el('div', { className: 'stats-grid ez-fade-in' });
    grid.appendChild(statCard({ title: 'Dette totale', value: formatCurrency(d.totalDebt), iconName: 'lock', color: 'var(--ez-danger)' }));
    grid.appendChild(statCard({ title: 'Mensualités totales', value: formatCurrency(d.totalMonthlyPayments) + '/mois', iconName: 'dollar-sign', color: 'var(--ez-warning)' }));
    grid.appendChild(statCard({ title: 'Taux d\'endettement', value: `${d.debtToIncomeRatio}%`, subtitle: d.debtToIncomeRatio < 33 ? '✅ Acceptable' : '⚠️ Élevé', iconName: 'percent', color: d.debtToIncomeRatio < 33 ? 'var(--ez-success)' : 'var(--ez-danger)' }));
    grid.appendChild(statCard({ title: 'Intérêts totaux', value: formatCurrency(d.totalInterest), iconName: 'trending-up', color: '#8b5cf6' }));
    wrap.appendChild(grid);

    // Debt ratio gauge
    const gaugeSection = el('div', { className: 'section ez-fade-in' });
    gaugeSection.appendChild(scoreGauge(
      Math.min(100, Math.round(d.debtToIncomeRatio)),
      `Ratio d'endettement : ${d.debtToIncomeRatio}%`
    ));
    wrap.appendChild(gaugeSection);

    // Debts table
    if (d.debts.length) {
      const tableSection = el('div', { className: 'section ez-fade-in' });
      tableSection.appendChild(el('h3', { className: 'section-title' }, [icon('bar-chart-2', 20), ' Détail des crédits']));
      tableSection.appendChild(dataTable(
        ['Crédit', 'Capital restant', 'Mensualité', 'Taux', 'Mois restants', 'Coût total', 'Intérêts'],
        d.debts.map(dd => [
          dd.name || 'Crédit', formatCurrency(dd.remainingAmount), formatCurrency(dd.monthlyPayment),
          `${(dd.rate || 0).toFixed(2)}%`, dd.remainingMonths || '?',
          formatCurrency(dd.totalCost), formatCurrency(dd.totalInterest)
        ])
      ));
      wrap.appendChild(tableSection);
    }

    // Strategies comparison
    const stratSection = el('div', { className: 'section ez-fade-in' });
    stratSection.appendChild(el('h3', { className: 'section-title' }, [icon('zap', 20), ' Stratégies de remboursement']));

    const stratRow = el('div', { className: 'strat-row' });

    // Snowball
    stratRow.appendChild(el('div', { className: 'strat-card' }, [
      el('h4', { textContent: '❄️ Stratégie Snowball' }),
      el('p', { className: 'text-muted', textContent: 'Rembourser la plus petite dette d\'abord. Effet psychologique positif.' }),
      el('div', { className: 'strat-stats' }, [
        el('div', {}, [el('strong', { textContent: formatYears(d.snowball.months) }), el('br'), 'Durée totale']),
        el('div', {}, [el('strong', { textContent: formatCurrency(d.snowball.totalPaid) }), el('br'), 'Total payé']),
        el('div', {}, [el('strong', { textContent: formatCurrency(d.snowball.totalInterest) }), el('br'), 'Total intérêts'])
      ])
    ]));

    // Avalanche
    stratRow.appendChild(el('div', { className: 'strat-card strat-card--recommended' }, [
      el('div', { className: 'strat-badge', textContent: '⭐ Recommandé' }),
      el('h4', { textContent: '🏔️ Stratégie Avalanche' }),
      el('p', { className: 'text-muted', textContent: 'Rembourser la dette au taux le plus élevé d\'abord. Économise le plus d\'intérêts.' }),
      el('div', { className: 'strat-stats' }, [
        el('div', {}, [el('strong', { textContent: formatYears(d.avalanche.months) }), el('br'), 'Durée totale']),
        el('div', {}, [el('strong', { textContent: formatCurrency(d.avalanche.totalPaid) }), el('br'), 'Total payé']),
        el('div', {}, [el('strong', { textContent: formatCurrency(d.avalanche.totalInterest) }), el('br'), 'Total intérêts'])
      ])
    ]));
    stratSection.appendChild(stratRow);

    if (d.interestSaved > 0) {
      stratSection.appendChild(el('div', { className: 'banner banner--success', textContent: `💰 La stratégie avalanche vous économise ${formatCurrency(d.interestSaved)} d'intérêts par rapport à la stratégie snowball.` }));
    }

    // Payoff timeline chart
    const tlChart = el('div', { className: 'chart-container chart-container--wide' });
    tlChart.appendChild(el('h3', { className: 'chart-title' }, ['Chronologie de remboursement (Avalanche)']));
    const tlCanvas = el('div', { className: 'chart-canvas', style: { height: '280px' } });
    tlChart.appendChild(tlCanvas);
    stratSection.appendChild(tlChart);

    wrap.appendChild(stratSection);
    container.appendChild(wrap);

    // Chart
    requestAnimationFrame(() => {
      if (!tlCanvas.offsetWidth) return;
      const tl = d.avalanche.timeline;
      if (tl.length) {
        initChart(tlCanvas, {
          tooltip: { trigger: 'axis' },
          grid: { top: 20, bottom: 40, left: 80, right: 20 },
          xAxis: { type: 'category', data: tl.map(t => `Mois ${t.month}`), axisLabel: { color: '#aaa' } },
          yAxis: { type: 'value', axisLabel: { color: '#aaa', formatter: v => formatCurrency(v) }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
          series: [{
            name: 'Capital restant', type: 'line', data: tl.map(t => t.remaining),
            areaStyle: { color: 'rgba(239,68,68,0.15)' },
            lineStyle: { color: '#ef4444', width: 2 }, itemStyle: { color: '#ef4444' }, symbol: 'none'
          }]
        });
      }
    });
  }

  /* =============================================================
     H. ADVICE — Conseils personnalisés
     ============================================================= */
  function advice(container) {
    container.innerHTML = '';
    const s = Store.getState();
    const a = s.analysis;
    if (!a) return;
    const p = s.profile;

    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(el('div', { className: 'page-header ez-fade-in' }, [
      icon('star', 28),
      el('div', {}, [
        el('h2', { textContent: 'Conseils ultra-personnalisés' }),
        el('p', { className: 'text-muted', textContent: `${(a.advice || []).length} recommandations basées sur votre profil unique` })
      ])
    ]));

    // Personalized profile summary banner
    const familyLabels = { single: 'Célibataire', couple: 'En couple', married: 'Marié(e)', divorced: 'Divorcé(e)', widowed: 'Veuf/ve' };
    const stabLabels = { very_stable: 'Très stable', stable: 'Stable', moderate: 'Modérée', unstable: 'Instable', no_income: 'Sans emploi' };
    const bal = a.balance || {};
    const profileBanner = el('div', { className: 'profile-summary-banner anim-slide-up' });
    profileBanner.innerHTML = `
      <div class="profile-summary-banner__title">👤 Votre profil</div>
      <div class="profile-summary-banner__grid">
        <div class="profile-summary-badge">🎂 ${p.age} ans</div>
        <div class="profile-summary-badge">${familyLabels[p.familySituation] || p.familySituation}${p.dependents > 0 ? ` + ${p.dependents} enfant(s)` : ''}</div>
        <div class="profile-summary-badge">💰 ${(bal.income || 0).toLocaleString('fr-FR')} €/mois</div>
        <div class="profile-summary-badge">📊 Épargne ${(bal.savingsRate || 0).toFixed(0)}%</div>
        <div class="profile-summary-badge">⚖️ Risque ${(a.riskScore || 5).toFixed(0)}/10</div>
        <div class="profile-summary-badge">💼 ${stabLabels[p.employmentStability] || 'N/A'}</div>
      </div>
    `;
    wrap.appendChild(profileBanner);

    const allAdvice = a.advice || [];
    const urgent = allAdvice.filter(a => a.category === 'urgent');
    const important = allAdvice.filter(a => a.category === 'important');
    const optimizations = allAdvice.filter(a => a.category === 'optimization');
    const personal = allAdvice.filter(a => a.category === 'personal');

    // Goal progress
    if (a.goals && a.goals.length) {
      const goalSection = el('div', { className: 'section ez-fade-in' });
      goalSection.appendChild(el('h3', { className: 'section-title' }, [icon('target', 20), ' Progression des objectifs']));
      const goalGrid = el('div', { className: 'goal-grid' });
      for (const g of a.goals) {
        goalGrid.appendChild(el('div', { className: 'goal-card' }, [
          el('div', { className: 'goal-card__header' }, [
            el('h4', { textContent: g.name }),
            el('span', { className: `goal-badge ${g.feasible ? 'goal-badge--ok' : 'goal-badge--warn'}`, textContent: g.feasible ? '✅ Réalisable' : '⚠️ Difficile' })
          ]),
          progressRing(g.progress, 100, g.feasible ? 'var(--ez-success)' : 'var(--ez-warning)', null, 60),
          el('div', { className: 'goal-card__info' }, [
            el('div', {}, [`Cible : ${formatCurrency(g.targetAmount)}`]),
            el('div', {}, [`Reste : ${formatCurrency(g.remaining)}`]),
            el('div', {}, [`Horizon : ${g.horizonYears} ans`]),
            el('div', {}, [`Requis : ${formatCurrency(g.requiredMonthly)}/mois`])
          ])
        ]));
      }
      goalSection.appendChild(goalGrid);
      wrap.appendChild(goalSection);
    }

    // Advice sections
    if (urgent.length) {
      const sec = el('div', { className: 'advice-section ez-fade-in' });
      sec.appendChild(el('h3', { className: 'section-title section-title--danger' }, [icon('alert', 20), ` Actions urgentes (${urgent.length})`]));
      urgent.forEach(a => sec.appendChild(adviceCard(a)));
      wrap.appendChild(sec);
    }

    if (important.length) {
      const sec = el('div', { className: 'advice-section ez-fade-in' });
      sec.appendChild(el('h3', { className: 'section-title section-title--warning' }, [icon('info', 20), ` Actions importantes (${important.length})`]));
      important.forEach(a => sec.appendChild(adviceCard(a)));
      wrap.appendChild(sec);
    }

    if (optimizations.length) {
      const sec = el('div', { className: 'advice-section ez-fade-in' });
      sec.appendChild(el('h3', { className: 'section-title section-title--success' }, [icon('star', 20), ` Optimisations (${optimizations.length})`]));
      optimizations.forEach(a => sec.appendChild(adviceCard(a)));
      wrap.appendChild(sec);
    }

    if (personal.length) {
      const sec = el('div', { className: 'advice-section ez-fade-in' });
      sec.appendChild(el('h3', { className: 'section-title section-title--personal' }, [icon('user', 20), ` Conseils personnalisés pour vous (${personal.length})`]));
      personal.forEach(a => sec.appendChild(adviceCard(a)));
      wrap.appendChild(sec);
    }

    container.appendChild(wrap);
  }

  /* =============================================================
     I. SETTINGS
     ============================================================= */
  function settings(container) {
    container.innerHTML = '';
    const s = Store.getState();

    const wrap = el('div', { className: 'dashboard' });
    wrap.appendChild(el('div', { className: 'page-header ez-fade-in' }, [
      icon('settings', 28),
      el('h2', { textContent: 'Paramètres' })
    ]));

    // Cloud connection
    const cloudSection = el('div', { className: 'section ez-fade-in' });
    cloudSection.appendChild(el('h3', { className: 'section-title' }, [icon('cloud', 20), ' Sauvegarde Cloud']));

    if (s.auth.token) {
      cloudSection.appendChild(el('div', { className: 'cloud-info' }, [
        el('div', { className: 'cloud-status cloud-status--connected' }, [icon('check', 16), ` Connecté : ${s.auth.user?.name || s.auth.user?.email || 'Utilisateur'}`]),
        el('div', { className: 'cloud-actions' }, [
          el('button', { className: 'btn btn--primary', onClick: async () => {
            try { await Store.cloudSave(); toast('Données sauvegardées sur le cloud', 'success'); } catch (e) { toast(e.message, 'error'); }
          } }, [icon('upload', 16), 'Sauvegarder']),
          el('button', { className: 'btn', onClick: async () => {
            try {
              const ok = await Store.cloudLoad();
              if (ok) {
                toast('Données chargées', 'success');
                const st = Store.getState();
                if (st.analysis) {
                  Store.setState({ step: 'dashboard', currentView: st.currentView || 'overview' });
                }
                window.renderApp();
              } else {
                toast('Aucune sauvegarde trouvée — sauvegardez d\'abord vos données.', 'info');
              }
            } catch (e) { toast('Erreur cloud : ' + e.message, 'error'); }
          } }, [icon('download', 16), 'Charger']),
          el('button', { className: 'btn btn--ghost', onClick: () => { Store.logout(); toast('Déconnecté', 'info'); window.renderApp(); } }, [icon('logout', 16), 'Déconnexion'])
        ])
      ]));
    } else {
      cloudSection.appendChild(el('p', { className: 'text-muted', textContent: 'Connectez-vous pour sauvegarder vos données sur le cloud EZGalaxy.' }));
      cloudSection.appendChild(el('button', { className: 'btn btn--primary', onClick: () => showLoginModal() }, [icon('login', 16), 'Se connecter']));
    }
    wrap.appendChild(cloudSection);

    // Local export/import
    const localSection = el('div', { className: 'section ez-fade-in' });
    localSection.appendChild(el('h3', { className: 'section-title' }, [icon('download', 20), ' Export / Import local']));
    localSection.appendChild(el('div', { className: 'settings-actions' }, [
      el('button', { className: 'btn', onClick: () => { Store.exportJSON(); toast('Fichier exporté', 'success'); } }, [icon('download', 16), 'Exporter en JSON']),
      el('button', { className: 'btn', onClick: () => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.addEventListener('change', async () => {
          if (input.files.length) {
            try { await Store.importJSON(input.files[0]); toast('Importé avec succès', 'success'); window.renderApp(); } catch (e) { toast(e.message, 'error'); }
          }
        });
        input.click();
      } }, [icon('upload', 16), 'Importer un fichier JSON'])
    ]));
    wrap.appendChild(localSection);

    // Modify profile
    const profileSection = el('div', { className: 'section ez-fade-in' });
    profileSection.appendChild(el('h3', { className: 'section-title' }, [icon('edit', 20), ' Profil']));
    profileSection.appendChild(el('div', { className: 'settings-actions' }, [
      el('button', { className: 'btn', onClick: () => {
        Store.setState({ step: 'questionnaire', questionnaireStep: 0 });
        window.navigateTo('questionnaire');
      } }, [icon('edit', 16), 'Modifier mon profil']),
      el('button', { className: 'btn btn--danger', onClick: () => {
        modal({
          title: 'Réinitialiser toutes les données ?',
          body: [el('p', { textContent: 'Cette action supprimera définitivement votre profil, votre analyse et vos paramètres. Les données cloud ne seront pas affectées.' })],
          actions: [
            el('button', { className: 'btn', onClick: () => document.querySelector('.modal-overlay').remove() }, ['Annuler']),
            el('button', { className: 'btn btn--danger', onClick: () => {
              Store.resetProfile();
              localStorage.removeItem('finvest_state');
              toast('Données réinitialisées', 'info');
              document.querySelector('.modal-overlay').remove();
              window.renderApp();
            } }, ['Tout supprimer'])
          ]
        });
      } }, [icon('trash', 16), 'Réinitialiser'])
    ]));
    wrap.appendChild(profileSection);

    // Hypotheses
    const hypoSection = el('div', { className: 'section ez-fade-in' });
    hypoSection.appendChild(el('h3', { className: 'section-title' }, [icon('settings', 20), ' Hypothèses de calcul']));
    const settings_ = s.settings;
    hypoSection.appendChild(questionCard({ id: 'inflation', label: 'Taux d\'inflation annuel', type: 'number', value: settings_.inflationRate, unit: '%', step: 0.1,
      onChange: v => Store.setState({ settings: { ...s.settings, inflationRate: v } }) }));
    hypoSection.appendChild(questionCard({ id: 'riskFree', label: 'Taux sans risque', type: 'number', value: settings_.riskFreeRate, unit: '%', step: 0.1,
      onChange: v => Store.setState({ settings: { ...s.settings, riskFreeRate: v } }) }));
    hypoSection.appendChild(questionCard({ id: 'life', label: 'Espérance de vie', type: 'slider', min: 70, max: 100, value: settings_.lifeExpectancy,
      onChange: v => Store.setState({ settings: { ...s.settings, lifeExpectancy: v } }) }));
    hypoSection.appendChild(el('button', { className: 'btn btn--primary mt-12', onClick: () => {
      try { Store.runAnalysis(); toast('Analyse recalculée', 'success'); window.renderApp(); } catch (e) { toast(e.message, 'error'); }
    } }, [icon('refresh', 16), 'Recalculer l\'analyse']));
    wrap.appendChild(hypoSection);

    container.appendChild(wrap);
  }

  /* =============================================================
     J. AI — Prompts IA personnalisés
     ============================================================= */
  const AI_CATEGORIES = [
    { key: 'all', label: '✨ Tous', badge: '' },
    { key: 'analyse', label: '🔍 Analyse', badge: '' },
    { key: 'investissement', label: '📊 Investissement', badge: 'purple' },
    { key: 'fiscalite', label: '🧾 Fiscalité', badge: 'orange' },
    { key: 'immobilier', label: '🏠 Immobilier', badge: 'pink' },
    { key: 'retraite', label: '🏖️ Retraite', badge: 'blue' },
    { key: 'dettes', label: '⚡ Dettes', badge: 'orange' },
    { key: 'budget', label: '💡 Budget', badge: '' },
    { key: 'urgence', label: '🛡️ Urgence', badge: 'orange' },
    { key: 'education', label: '📚 Éducation', badge: 'blue' },
    { key: 'situations', label: '🔄 Situations', badge: 'pink' }
  ];

  function ai(container) {
    container.innerHTML = '';
    const s = Store.getState();
    const a = s.analysis;
    if (!a) {
      container.appendChild(el('div', { className: 'empty-state' }, [
        el('div', { className: 'empty-icon', textContent: '🤖' }),
        el('h3', { textContent: 'Analyse requise' }),
        el('p', { textContent: 'Complétez d\'abord le questionnaire pour générer des prompts IA personnalisés.' })
      ]));
      return;
    }

    const prompts = FinEngine.generateAIPrompts(s.profile, a);
    let activeCategory = 'all';

    const wrap = el('div', { className: 'dashboard' });

    // Header
    wrap.appendChild(el('div', { className: 'page-header ez-fade-in' }, [
      icon('sparkles', 28),
      el('div', {}, [
        el('h2', { textContent: 'Prompts IA personnalisés' }),
        el('p', { className: 'text-muted', textContent: `${prompts.length} prompts générés automatiquement à partir de vos données financières` })
      ])
    ]));

    // Intro card
    wrap.appendChild(el('div', { className: 'ai-intro anim-slide-up' }, [
      el('div', { className: 'ai-intro__icon', textContent: '🤖' }),
      el('h3', { textContent: 'Comment utiliser ces prompts ?' }),
      el('p', { textContent: 'Chaque prompt est pré-rempli avec vos données financières personnelles. Copiez un prompt, collez-le dans ChatGPT, Claude, Gemini ou l\'IA de votre choix, et obtenez des conseils hautement personnalisés. Vos données restent locales — seul le prompt est copié.' })
    ]));

    // Category filter bar
    const catBar = el('div', { className: 'ai-category-bar anim-slide-up stagger-1' });
    const promptsContainer = el('div', { className: 'ai-prompts' });

    function renderCategoryBar() {
      catBar.innerHTML = '';
      for (const cat of AI_CATEGORIES) {
        // Count prompts in category
        const count = cat.key === 'all' ? prompts.length : prompts.filter(p => p.category === cat.key).length;
        if (count === 0 && cat.key !== 'all') continue;
        const btn = el('button', {
          className: `ai-cat-btn ${activeCategory === cat.key ? 'ai-cat-btn--active' : ''}`,
          textContent: `${cat.label} (${count})`,
          onClick: () => {
            activeCategory = cat.key;
            renderCategoryBar();
            renderPrompts();
          }
        });
        catBar.appendChild(btn);
      }
    }

    function renderPrompts() {
      promptsContainer.innerHTML = '';
      const filtered = activeCategory === 'all' ? prompts : prompts.filter(p => p.category === activeCategory);

      filtered.forEach((prompt, i) => {
        const card = el('div', { className: `ai-prompt-card anim-slide-up stagger-${Math.min(i + 1, 8)}` });

        // Header
        const header = el('div', { className: 'ai-prompt-card__header' });
        header.appendChild(el('span', { className: 'ai-prompt-card__emoji', textContent: prompt.emoji }));
        const meta = el('div', { className: 'ai-prompt-card__meta' });
        meta.appendChild(el('div', { className: 'ai-prompt-card__title', textContent: prompt.title }));
        meta.appendChild(el('div', { className: 'ai-prompt-card__target', textContent: `Idéal pour : ${prompt.target}` }));
        header.appendChild(meta);
        const badges = el('div', { className: 'ai-prompt-card__badges' });
        prompt.badges.forEach((b, bi) => {
          const colorClass = prompt.badgeColors[bi] ? `ai-prompt-badge--${prompt.badgeColors[bi]}` : '';
          badges.appendChild(el('span', { className: `ai-prompt-badge ${colorClass}`, textContent: b }));
        });
        header.appendChild(badges);
        card.appendChild(header);

        // Body — prompt text
        const body = el('div', { className: 'ai-prompt-card__body' });
        body.appendChild(el('pre', { className: 'ai-prompt-text', textContent: prompt.prompt }));
        card.appendChild(body);

        // Footer — copy button
        const footer = el('div', { className: 'ai-prompt-card__footer' });
        footer.appendChild(el('span', { className: 'text-muted', textContent: `~${prompt.prompt.length} caractères` }));

        const copyBtn = el('button', { className: 'copy-btn', onClick: async () => {
          try {
            await navigator.clipboard.writeText(prompt.prompt);
            copyBtn.innerHTML = '';
            copyBtn.appendChild(icon('check', 14));
            copyBtn.appendChild(el('span', { textContent: 'Copié !' }));
            copyBtn.classList.add('copy-btn--copied');
            toast(`Prompt "${prompt.title}" copié !`, 'success');
            setTimeout(() => {
              copyBtn.innerHTML = '';
              copyBtn.appendChild(icon('clipboard', 14));
              copyBtn.appendChild(el('span', { textContent: 'Copier le prompt' }));
              copyBtn.classList.remove('copy-btn--copied');
            }, 2500);
          } catch (e) {
            // Fallback for non-secure contexts
            const ta = document.createElement('textarea');
            ta.value = prompt.prompt;
            ta.style.cssText = 'position:fixed;left:-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            toast(`Prompt copié !`, 'success');
          }
        } }, [icon('clipboard', 14), el('span', { textContent: 'Copier le prompt' })]);

        footer.appendChild(copyBtn);
        card.appendChild(footer);
        promptsContainer.appendChild(card);
      });

      if (filtered.length === 0) {
        promptsContainer.appendChild(el('div', { className: 'empty-state' }, [
          el('div', { className: 'empty-icon', textContent: '🔎' }),
          el('h3', { textContent: 'Aucun prompt dans cette catégorie' })
        ]));
      }
    }

    renderCategoryBar();
    renderPrompts();

    wrap.appendChild(catBar);
    wrap.appendChild(promptsContainer);
    container.appendChild(wrap);
  }

  /* =============================================================
     K. NEWS — Fil d'actualité financière RSS
     ============================================================= */

  const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';
  const GOOG_NEWS = 'https://news.google.com/rss/search?hl=fr&gl=FR&ceid=FR:fr&q=';

  const NEWS_CATEGORIES = [
    { key: 'perso',          label: '⭐ Pour vous',     query: null },
    { key: 'marche',         label: '📈 Marchés',       query: 'bourse+CAC40+marchés+financiers+actions' },
    { key: 'investissement',  label: '💰 Investissement', query: 'investissement+placement+ETF+PEA' },
    { key: 'immobilier',     label: '🏠 Immobilier',    query: 'immobilier+SCPI+investissement+locatif+prix' },
    { key: 'epargne',        label: '🏦 Épargne',       query: 'épargne+livret+A+assurance+vie+taux' },
    { key: 'crypto',         label: '₿ Crypto',         query: 'bitcoin+crypto+ethereum+blockchain' },
    { key: 'economie',       label: '🌍 Économie',      query: 'économie+france+inflation+BCE+taux+directeur' },
    { key: 'retraite',       label: '🏖️ Retraite',     query: 'retraite+pension+PER+réforme+retraite' }
  ];

  /* Build personalized query based on user profile */
  function buildPersonalizedQuery(profile) {
    const kw = ['finance', 'patrimoine'];
    const inv = profile.investments || [];
    const has = t => inv.some(i => i.type === t && i.amount > 0);

    if (has('crypto'))                  kw.push('bitcoin', 'crypto');
    if (has('pea') || has('cto_actions') || has('etf_monde') || has('etf_emergents'))
      kw.push('bourse', 'ETF', 'actions');
    if (has('scpi') || (profile.realEstate || []).length > 0)
      kw.push('immobilier', 'SCPI');
    if (has('assurance_vie_fonds_euros') || has('assurance_vie_uc'))
      kw.push('assurance+vie');
    if (has('per'))                     kw.push('PER', 'retraite');
    if (has('obligations'))             kw.push('obligations', 'taux');
    if ((profile.debts || []).length > 0) kw.push('crédit', 'taux+emprunt');
    if (profile.retirementAge && profile.retirementAge < 62) kw.push('retraite+anticipée');

    return kw.join('+');
  }

  /* News cache */
  const _newsCache = {};
  const _newsCacheTs = {};
  const CACHE_MS = 10 * 60 * 1000;

  async function fetchFeed(key, query) {
    if (_newsCache[key] && Date.now() - (_newsCacheTs[key] || 0) < CACHE_MS) {
      return _newsCache[key];
    }
    const rssUrl = GOOG_NEWS + encodeURIComponent(query);
    try {
      const resp = await fetch(RSS2JSON + encodeURIComponent(rssUrl));
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      if (data.status !== 'ok') throw new Error(data.message || 'Feed error');

      const items = (data.items || []).map(item => ({
        title: stripHtml(item.title || ''),
        link: item.link || '#',
        description: stripHtml(item.description || item.content || '').slice(0, 220),
        pubDate: item.pubDate || '',
        source: extractDomain(item.link),
        thumbnail: item.thumbnail || item.enclosure?.link || null,
        category: key
      }));

      _newsCache[key] = items;
      _newsCacheTs[key] = Date.now();
      return items;
    } catch (e) {
      console.warn('[News] Fetch error for', key, e.message);
      return _newsCache[key] || [];
    }
  }

  function stripHtml(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return (d.textContent || '').trim();
  }

  function extractDomain(url) {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return ''; }
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 0) return '';
    if (diff < 60)    return 'À l\'instant';
    if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  /* Open article URL with multiple fallback strategies */
  function openArticle(url) {
    // Strategy 1: window.open
    try {
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (w) return;
    } catch(_) {}
    // Strategy 2: parent postMessage (if EZGalaxy parent handles it)
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'open-url', url: url }, '*');
      }
    } catch(_) {}
    // Strategy 3: dynamic anchor (most reliable in sandbox with allow-popups)
    try {
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      // Use top-level body if accessible
      const body = (() => { try { return window.top.document.body || document.body; } catch(_) { return document.body; } })();
      body.appendChild(a); a.click(); body.removeChild(a);
      return;
    } catch(_) {}
    // Fallback: show modal with clickable link + copy
    _showLinkModal(url);
  }

  function _showLinkModal(url) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(6px)';
    const box = document.createElement('div');
    box.style.cssText = 'background:#1a1f2e;border:1px solid rgba(255,255,255,0.1);border-radius:12px;max-width:500px;width:100%;padding:24px;text-align:center';
    box.innerHTML = `
      <div style="font-size:2rem;margin-bottom:12px">🔗</div>
      <h3 style="color:#fff;margin:0 0 12px">Ouvrir le lien</h3>
      <p style="color:#94a3b8;font-size:13px;margin:0 0 16px;word-break:break-all">${url}</p>
      <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 24px;background:#0ea5a4;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;margin-bottom:10px">Ouvrir dans un nouvel onglet ↗</a>
      <br>
    `;
    const copyBtn2 = document.createElement('button');
    copyBtn2.textContent = '📋 Copier le lien';
    copyBtn2.style.cssText = 'padding:8px 18px;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;font-size:13px;margin-top:4px';
    copyBtn2.onclick = () => { copyUrl(url); copyBtn2.textContent = '✅ Copié !'; setTimeout(() => { copyBtn2.textContent = '📋 Copier le lien'; }, 2000); };
    box.appendChild(copyBtn2);
    const closeBtn2 = document.createElement('button');
    closeBtn2.textContent = '✕ Fermer';
    closeBtn2.style.cssText = 'display:block;margin:16px auto 0;background:none;border:none;color:#888;cursor:pointer;font-size:13px';
    closeBtn2.onclick = () => overlay.remove();
    box.appendChild(closeBtn2);
    overlay.appendChild(box);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  function copyUrl(url) {
    try {
      navigator.clipboard.writeText(url).then(() => toast('Lien copié !', 'success'));
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      toast('Lien copié !', 'success');
    }
  }

  function news(container) {
    container.innerHTML = '';
    const s = Store.getState();
    const profile = s.profile;
    let activeCat = 'perso';

    const wrap = el('div', { className: 'dashboard' });

    // Header
    wrap.appendChild(el('div', { className: 'page-header ez-fade-in' }, [
      icon('newspaper', 28),
      el('div', {}, [
        el('h2', { textContent: 'Actualités financières' }),
        el('p', { className: 'text-muted', textContent: 'Flux RSS en direct, personnalisé selon votre profil' })
      ])
    ]));

    // Info banner
    const personalKw = buildPersonalizedQuery(profile);
    const kwDisplay = personalKw.replace(/\+/g, ', ').slice(0, 80);
    wrap.appendChild(el('div', { className: 'news-perso-banner anim-slide-up' }, [
      icon('sparkles', 18),
      el('span', { textContent: `Mots-clés personnalisés : ${kwDisplay}…` })
    ]));

    // Category tabs
    const catBar = el('div', { className: 'news-category-bar anim-slide-up stagger-1' });
    const feedContainer = el('div', { className: 'news-feed', id: 'news-feed' });

    function renderCatBar() {
      catBar.innerHTML = '';
      for (const cat of NEWS_CATEGORIES) {
        catBar.appendChild(el('button', {
          className: `news-cat-btn ${activeCat === cat.key ? 'news-cat-btn--active' : ''}`,
          textContent: cat.label,
          onClick: () => { activeCat = cat.key; renderCatBar(); loadFeed(); }
        }));
      }
      // Refresh button
      catBar.appendChild(el('button', {
        className: 'news-cat-btn news-cat-btn--refresh',
        title: 'Rafraîchir',
        onClick: () => {
          delete _newsCache[activeCat];
          delete _newsCacheTs[activeCat];
          loadFeed();
        }
      }, [icon('refresh', 14)]));
    }

    async function loadFeed() {
      feedContainer.innerHTML = '';
      // Loading skeleton
      for (let i = 0; i < 4; i++) {
        feedContainer.appendChild(el('div', { className: 'news-skeleton anim-slide-up' }, [
          el('div', { className: 'news-skeleton__img' }),
          el('div', { className: 'news-skeleton__body' }, [
            el('div', { className: 'news-skeleton__line news-skeleton__line--title' }),
            el('div', { className: 'news-skeleton__line' }),
            el('div', { className: 'news-skeleton__line news-skeleton__line--short' })
          ])
        ]));
      }

      const cat = NEWS_CATEGORIES.find(c => c.key === activeCat);
      const query = cat.key === 'perso' ? personalKw : cat.query;
      const items = await fetchFeed(activeCat, query);

      feedContainer.innerHTML = '';

      if (items.length === 0) {
        feedContainer.appendChild(el('div', { className: 'news-empty anim-slide-up' }, [
          icon('rss', 40),
          el('h3', { textContent: 'Impossible de charger le flux' }),
          el('p', { className: 'text-muted', textContent: 'Vérifiez votre connexion ou réessayez dans quelques instants.' }),
          el('button', { className: 'btn btn--primary btn--sm mt-12', onClick: () => { delete _newsCache[activeCat]; loadFeed(); } }, [
            icon('refresh', 14), 'Réessayer'
          ])
        ]));
        return;
      }

      items.forEach((item, i) => {
        const card = el('a', {
          className: `news-card anim-slide-up stagger-${Math.min(i + 1, 8)}`,
          href: item.link,
          target: '_blank',
          rel: 'noopener noreferrer'
        });

        // Thumbnail
        if (item.thumbnail) {
          const imgWrap = el('div', { className: 'news-card__img' });
          const img = el('img', { src: item.thumbnail, alt: '', loading: 'lazy' });
          img.onerror = () => { imgWrap.style.display = 'none'; };
          imgWrap.appendChild(img);
          card.appendChild(imgWrap);
        }

        // Content
        const content = el('div', { className: 'news-card__content' });

        // Source & time
        const meta = el('div', { className: 'news-card__meta' });
        if (item.source) {
          meta.appendChild(el('span', { className: 'news-card__source' }, [
            icon('globe', 12),
            el('span', { textContent: item.source })
          ]));
        }
        if (item.pubDate) {
          meta.appendChild(el('span', { className: 'news-card__time', textContent: timeAgo(item.pubDate) }));
        }
        content.appendChild(meta);

        // Title
        content.appendChild(el('h4', { className: 'news-card__title', textContent: item.title }));

        // Description
        if (item.description) {
          content.appendChild(el('p', { className: 'news-card__desc', textContent: item.description }));
        }

        // URL display + copy
        const urlBar = el('div', { className: 'news-card__url-bar', onClick: (e) => { e.preventDefault(); e.stopPropagation(); copyUrl(item.link); } }, [
          icon('external-link', 12),
          el('span', { className: 'news-card__url-text', textContent: item.link.slice(0, 60) + (item.link.length > 60 ? '…' : '') }),
          el('span', { className: 'news-card__url-copy', textContent: 'Copier' })
        ]);
        content.appendChild(urlBar);

        // Open link indicator
        content.appendChild(el('span', { className: 'news-card__open' }, [
          el('span', { textContent: 'Lire l\'article' }),
          icon('external-link', 12)
        ]));

        card.appendChild(content);
        feedContainer.appendChild(card);
      });

      // Source info
      feedContainer.appendChild(el('div', { className: 'news-source-info' }, [
        icon('rss', 14),
        el('span', { textContent: `${items.length} articles via Google Actualités — Dernière mise à jour : ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` })
      ]));
    }

    renderCatBar();
    wrap.appendChild(catBar);
    wrap.appendChild(feedContainer);
    container.appendChild(wrap);

    // Initial load
    loadFeed();
  }

  /* ---------- PUBLIC API -------------------------------------- */
  window.Views = {
    welcome, questionnaire,
    overview, allocation, projections, retirement, debt, advice, ai, news, settings
  };
})();
