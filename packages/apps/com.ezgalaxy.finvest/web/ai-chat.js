/* ================================================================
   FinVest — ai-chat.js  (AI Assistant — Gemini Integration)
   Right-side sliding panel for conversing with Gemini AI.
   Features: context-aware (page, portfolio, market data),
             conversation history, investment advice.
   API: Google Gemini (generativelanguage.googleapis.com)
   Exposes: window.FinAI
   ================================================================ */
(() => {
  'use strict';

  /* ─────────── Config ────────────────────────────────────────── */
  let GEMINI_KEY = null; // Loaded from KeyVault at runtime
  const GEMINI_MODEL = 'gemini-2.5-flash';
  let GEMINI_URL = null;

  function loadGeminiKey() {
    if (typeof AccessControl !== 'undefined') {
      GEMINI_KEY = AccessControl.getKey('gemini');
      if (GEMINI_KEY) {
        // URL without key param — key sent via header to avoid referer-null block in sandboxed iframes
        GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
      }
    }
  }

  const MAX_HISTORY = 50;
  const CHAT_COLLECTION = 'ai-chat';

  /* ─────────── State ─────────────────────────────────────────── */
  let chatHistory = [];       // { role: 'user'|'model', text, ts }
  let panelOpen = false;
  let panelEl = null;
  let isStreaming = false;
  let contextMode = 'auto';   // 'auto' | 'page' | 'market' | 'portfolio' | 'none'
  let specifiedPage = null;   // user can pick a specific page

  /* ─────────── System prompt builder ─────────────────────────── */
  function buildSystemPrompt() {
    const parts = [];

    parts.push(`Tu es FinVest AI, un assistant financier intelligent intégré dans l'application FinVest — une plateforme d'analyse financière personnelle.
Tu aides les utilisateurs avec :
- L'analyse de leur patrimoine et portefeuille
- Des conseils d'investissement personnalisés (actions, ETF, crypto, immobilier)
- L'interprétation des données de marché en temps réel
- L'explication de concepts financiers
- Des stratégies d'épargne et d'investissement

Tu réponds en français. Tu es professionnel mais accessible. Tu fournis des analyses chiffrées quand c'est pertinent.
Tu précises toujours que tes conseils ne constituent PAS des recommandations d'investissement officielles.

Date actuelle : ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);

    // Add user profile context
    if (Store && Store.getState) {
      const s = Store.getState();
      if (s.profile && s.profile.monthlyNetIncome > 0) {
        parts.push(`\n--- PROFIL UTILISATEUR ---
Âge : ${s.profile.age} ans
Situation : ${s.profile.familySituation}
Revenu mensuel net : ${s.profile.monthlyNetIncome}€
Épargne actuelle : ${s.profile.currentSavings}€
Dépenses fixes : ${s.profile.fixedExpenses}€
Dépenses variables : ${s.profile.variableExpenses}€
Objectif retraite : ${s.profile.retirementAge} ans
${s.profile.investments && s.profile.investments.length > 0 ? 'Investissements : ' + JSON.stringify(s.profile.investments) : ''}
${s.profile.debts && s.profile.debts.length > 0 ? 'Dettes : ' + JSON.stringify(s.profile.debts) : ''}
${s.profile.goals && s.profile.goals.length > 0 ? 'Objectifs : ' + JSON.stringify(s.profile.goals) : ''}`);
      }

      // Positions
      if (s.positions && s.positions.length > 0) {
        parts.push(`\n--- PORTEFEUILLE ---
${s.positions.map(p => `${p.symbol} : ${p.quantity} unités à ${p.avgPrice}€ moy.`).join('\n')}`);
      }

      // Watchlist
      if (s.watchlist && s.watchlist.length > 0) {
        parts.push(`\nWatchlist : ${s.watchlist.join(', ')}`);
      }

      // Analysis summary
      if (s.analysis) {
        const a = s.analysis;
        parts.push(`\n--- ANALYSE FINANCIÈRE ---
Score global : ${a.globalScore || 'N/A'}/100
Patrimoine net : ${a.patrimoineNet || 'N/A'}€
Taux d'épargne : ${a.tauxEpargne || 'N/A'}%
${a.allocation ? 'Allocation recommandée : ' + JSON.stringify(a.allocation) : ''}`);
      }
    }

    // Add market data context
    if (contextMode === 'auto' || contextMode === 'market') {
      try {
        if (window.FinMarket) {
          const indices = window.FinMarket.getAllIndices();
          if (indices && indices.length > 0) {
            parts.push(`\n--- DONNÉES DE MARCHÉ EN DIRECT ---
${indices.map(i => `${i.name}: ${i.price.toLocaleString('fr-FR')} (${i.changePct >= 0 ? '+' : ''}${i.changePct}%)`).join('\n')}`);
          }

          const stocks = window.FinMarket.getAllStocks();
          if (stocks && stocks.length > 0) {
            parts.push(`\nActions suivies :
${stocks.slice(0, 15).map(s => `${s.symbol} (${s.name}): ${s.price.toLocaleString('fr-FR')}€ ${s.changePct >= 0 ? '+' : ''}${s.changePct}% ${s.live ? '[LIVE]' : '[SIM]'}`).join('\n')}`);
          }
        }
      } catch (_) {}
    }

    // Add current page context
    if (contextMode === 'auto' || contextMode === 'page') {
      const currentView = Store?.getState?.()?.currentView || 'overview';
      parts.push(`\n--- CONTEXTE PAGE ---
L'utilisateur consulte actuellement la page : "${specifiedPage || currentView}"`);
    }

    return parts.join('\n');
  }

  /* ─────────── Gemini API call ────────────────────────────────── */
  async function sendToGemini(userMessage) {
    // Build conversation contents for Gemini
    const contents = [];

    // Add recent history (last 10 exchanges for context window)
    const recentHistory = chatHistory.slice(-20);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      });
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const body = {
      contents,
      systemInstruction: {
        parts: [{ text: buildSystemPrompt() }]
      },
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 4096
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    };

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_KEY
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erreur API Gemini (${res.status})`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Réponse vide de Gemini');
    return text;
  }

  /* ─────────── Chat history persistence ─────────────────────── */
  async function saveHistory() {
    try {
      if (typeof ezgalaxy !== 'undefined' && ezgalaxy.storage) {
        const toSave = chatHistory.slice(-MAX_HISTORY);
        await ezgalaxy.storage.set(CHAT_COLLECTION, 'history', { messages: toSave });
      }
    } catch (_) {}
    // Also LS fallback
    try {
      const safeLS = window._finvestSafeLS || localStorage;
      safeLS.setItem('finvest_ai_history', JSON.stringify(chatHistory.slice(-MAX_HISTORY)));
    } catch (_) {}
  }

  async function loadHistory() {
    // Try cloud first
    try {
      if (typeof ezgalaxy !== 'undefined' && ezgalaxy.storage) {
        const rec = await ezgalaxy.storage.get(CHAT_COLLECTION, 'history');
        if (rec?.data?.messages) {
          chatHistory = rec.data.messages;
          return;
        }
      }
    } catch (_) {}
    // LS fallback
    try {
      const safeLS = window._finvestSafeLS || localStorage;
      const raw = safeLS.getItem('finvest_ai_history');
      if (raw) chatHistory = JSON.parse(raw);
    } catch (_) {}
  }

  /* ─────────── Markdown-lite renderer ────────────────────────── */
  function renderMarkdown(text) {
    return text
      // Code blocks
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Headers
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      // Lists
      .replace(/^\- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      // Wrap in paragraph
      .replace(/^(?!<)/, '<p>')
      .replace(/(?!>)$/, '</p>');
  }

  /* =================================================================
     UI — Right-side sliding panel
     ================================================================= */
  function createPanel() {
    if (panelEl) return panelEl;

    const { el, icon } = window.UI;

    panelEl = el('div', { className: 'ai-panel', id: 'ai-panel' });

    // ── Header (clean, minimal) ─────────────────────────────────
    const header = el('div', { className: 'ai-panel__header' });
    const titleWrap = el('div', { className: 'ai-panel__title' });
    titleWrap.innerHTML = `<span class="ai-panel__logo">✨</span><span>FinVest AI</span><span class="ai-panel__model">${GEMINI_MODEL}</span>`;
    header.appendChild(titleWrap);

    const headerActions = el('div', { className: 'ai-panel__header-actions' });
    // Clear history
    headerActions.appendChild(el('button', {
      className: 'ai-panel__btn', title: 'Effacer l\'historique', textContent: '🗑️',
      onClick: () => { if (confirm('Effacer tout l\'historique ?')) { chatHistory = []; saveHistory(); renderMessages(); } }
    }));
    // Close
    headerActions.appendChild(el('button', {
      className: 'ai-panel__btn ai-panel__close', textContent: '✕',
      onClick: () => togglePanel(false)
    }));
    header.appendChild(headerActions);
    panelEl.appendChild(header);

    // ── Messages area ───────────────────────────────────────────
    const messagesArea = el('div', { className: 'ai-panel__messages', id: 'ai-messages' });
    panelEl.appendChild(messagesArea);

    // ── Input area (bottom) ─────────────────────────────────────
    const inputArea = el('div', { className: 'ai-panel__input-area' });

    // Context pill row (above textarea)
    const ctxRow = el('div', { className: 'ai-ctx-pills', id: 'ai-ctx-pills' });
    const ctxOptions = [
      { key: 'auto', label: '🔄 Auto', title: 'Contexte automatique' },
      { key: 'page', label: '📄 Page', title: 'Page actuelle' },
      { key: 'market', label: '📈 Marchés', title: 'Données de marché' },
      { key: 'portfolio', label: '💼 Portfolio', title: 'Portefeuille' },
      { key: 'none', label: '💬 Libre', title: 'Sans contexte' }
    ];
    for (const opt of ctxOptions) {
      const pill = el('button', {
        className: `ai-ctx-pill ${opt.key === contextMode ? 'ai-ctx-pill--active' : ''}`,
        textContent: opt.label,
        title: opt.title,
        onClick: () => {
          contextMode = opt.key;
          ctxRow.querySelectorAll('.ai-ctx-pill').forEach(p => p.classList.remove('ai-ctx-pill--active'));
          pill.classList.add('ai-ctx-pill--active');
        }
      });
      ctxRow.appendChild(pill);
    }
    inputArea.appendChild(ctxRow);

    // Text input row
    const inputRow = el('div', { className: 'ai-input-row' });
    const textarea = el('textarea', {
      className: 'ai-panel__textarea',
      id: 'ai-input',
      placeholder: 'Posez une question sur vos finances...',
      rows: 1,
      onKeydown: (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      },
      onInput: (e) => {
        // Auto-resize: grow with content, cap at 35% viewport
        const ta = e.target;
        ta.style.height = 'auto';
        const maxH = Math.floor(window.innerHeight * 0.35);
        const newH = Math.min(ta.scrollHeight, maxH);
        ta.style.height = newH + 'px';
        // Show top fade mask when content overflows and is scrolled
        ta.classList.toggle('ai-textarea--overflow', ta.scrollHeight > maxH);
      }
    });
    const sendBtn = el('button', {
      className: 'ai-panel__send',
      id: 'ai-send-btn',
      innerHTML: '➤',
      title: 'Envoyer (Entrée)',
      onClick: handleSend
    });
    inputRow.appendChild(textarea);
    inputRow.appendChild(sendBtn);
    inputArea.appendChild(inputRow);
    panelEl.appendChild(inputArea);

    // ── Quick actions (only shown when empty) ───────────────────
    const quickActions = el('div', { className: 'ai-panel__quick', id: 'ai-quick-actions' });
    const quickPrompts = [
      { label: '📊 Analyser mon patrimoine', prompt: 'Peux-tu analyser mon patrimoine actuel et me donner des recommandations ?' },
      { label: '📈 Bilan marchés', prompt: 'Fais-moi un bilan rapide des marchés aujourd\'hui et des tendances intéressantes.' },
      { label: '💰 Conseils épargne', prompt: 'Selon mon profil, quels sont les meilleurs placements pour optimiser mon épargne ?' },
      { label: '🏠 Stratégie immo', prompt: 'Est-ce le bon moment pour investir dans l\'immobilier ? Quels sont les indicateurs à surveiller ?' }
    ];
    for (const q of quickPrompts) {
      quickActions.appendChild(el('button', {
        className: 'ai-panel__quick-btn', textContent: q.label,
        onClick: () => { const input = document.getElementById('ai-input'); if (input) input.value = q.prompt; handleSend(); }
      }));
    }
    panelEl.appendChild(quickActions);

    document.body.appendChild(panelEl);
    return panelEl;
  }

  /* ─────────── Render messages ──────────────────────────────── */
  function renderMessages() {
    const area = document.getElementById('ai-messages');
    if (!area) return;
    area.innerHTML = '';

    if (chatHistory.length === 0) {
      area.innerHTML = `
        <div class="ai-panel__welcome">
          <div class="ai-panel__welcome-icon">✨</div>
          <h3>Bienvenue sur FinVest AI</h3>
          <p>Je suis votre assistant financier intelligent. Je peux analyser votre patrimoine, suivre les marchés et vous donner des conseils d'investissement personnalisés.</p>
          <p class="text-muted">Posez-moi une question ou utilisez les suggestions rapides ci-dessous.</p>
        </div>
      `;
      return;
    }

    for (const msg of chatHistory) {
      const bubble = document.createElement('div');
      bubble.className = `ai-msg ai-msg--${msg.role}`;

      const avatar = document.createElement('div');
      avatar.className = 'ai-msg__avatar';
      avatar.textContent = msg.role === 'user' ? '👤' : '✨';

      const content = document.createElement('div');
      content.className = 'ai-msg__content';

      if (msg.role === 'model') {
        content.innerHTML = renderMarkdown(msg.text);
      } else {
        content.textContent = msg.text;
      }

      const time = document.createElement('div');
      time.className = 'ai-msg__time';
      time.textContent = msg.ts ? new Date(msg.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

      bubble.appendChild(avatar);
      const bodyWrap = document.createElement('div');
      bodyWrap.className = 'ai-msg__body';
      bodyWrap.appendChild(content);
      bodyWrap.appendChild(time);
      bubble.appendChild(bodyWrap);
      area.appendChild(bubble);
    }

    // Scroll to bottom
    area.scrollTop = area.scrollHeight;
  }

  /* ─────────── Update context bar ─────────────────────────────── */
  function updateContextBar() {
    // Context is now handled by pills in the input area — no separate bar needed
    // Show/hide quick actions based on chat history
    const quickEl = document.getElementById('ai-quick-actions');
    if (quickEl) quickEl.style.display = chatHistory.length === 0 ? '' : 'none';
  }

  /* ─────────── Handle send ─────────────────────────────────── */
  async function handleSend() {
    if (isStreaming) return;

    // Ensure key is loaded
    if (!GEMINI_URL) loadGeminiKey();
    if (!GEMINI_URL) {
      const area = document.getElementById('ai-messages');
      if (area) {
        const notice = document.createElement('div');
        notice.className = 'ai-msg ai-msg--system';
        notice.innerHTML = `
          <div class="ai-msg__avatar">⚠️</div>
          <div class="ai-msg__body">
            <div class="ai-msg__content">
              <p><strong>Clé API Gemini non configurée</strong></p>
              <p>L'administrateur doit configurer la clé Gemini dans le coffre-fort API (page Administration).</p>
            </div>
          </div>
        `;
        area.appendChild(notice);
        area.scrollTop = area.scrollHeight;
      }
      return;
    }

    // Access check
    if (!AccessControl.canUseAI()) {
      const area = document.getElementById('ai-messages');
      if (area) {
        const notice = document.createElement('div');
        notice.className = 'ai-msg ai-msg--system';
        notice.innerHTML = `
          <div class="ai-msg__avatar">🔒</div>
          <div class="ai-msg__body">
            <div class="ai-msg__content">
              <p><strong>Accès IA non autorisé</strong></p>
              <p>${!AccessControl.isAuthenticated()
                ? 'Veuillez vous connecter pour utiliser l\'IA. '
                : 'Votre compte n\'a pas l\'autorisation d\'utiliser l\'IA. '}
              Contactez <strong>${AccessControl.ADMIN_EMAIL}</strong> pour obtenir l'accès.</p>
            </div>
          </div>
        `;
        area.appendChild(notice);
        area.scrollTop = area.scrollHeight;
      }
      return;
    }

    const input = document.getElementById('ai-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.style.height = 'auto';

    // Add user message
    chatHistory.push({ role: 'user', text, ts: Date.now() });
    renderMessages();
    updateContextBar();

    // Show typing indicator
    isStreaming = true;
    const sendBtn = document.getElementById('ai-send-btn');
    if (sendBtn) sendBtn.innerHTML = '⏳';

    const area = document.getElementById('ai-messages');
    const typingEl = document.createElement('div');
    typingEl.className = 'ai-msg ai-msg--model ai-msg--typing';
    typingEl.innerHTML = `
      <div class="ai-msg__avatar">✨</div>
      <div class="ai-msg__body">
        <div class="ai-msg__content">
          <div class="ai-typing">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    `;
    if (area) {
      area.appendChild(typingEl);
      area.scrollTop = area.scrollHeight;
    }

    try {
      const response = await sendToGemini(text);
      chatHistory.push({ role: 'model', text: response, ts: Date.now() });
      saveHistory();
    } catch (err) {
      chatHistory.push({ role: 'model', text: `❌ **Erreur** : ${err.message}\n\nVeuillez réessayer.`, ts: Date.now() });
    }

    isStreaming = false;
    if (sendBtn) sendBtn.innerHTML = '➤';
    if (typingEl.parentNode) typingEl.remove();

    renderMessages();
  }

  /* ─────────── Toggle panel ──────────────────────────────────── */
  function togglePanel(forceOpen) {
    if (!panelEl) createPanel();

    panelOpen = forceOpen !== undefined ? forceOpen : !panelOpen;
    panelEl.classList.toggle('ai-panel--open', panelOpen);

    // Shift main content
    const main = document.getElementById('main-content');
    if (main) main.classList.toggle('main--ai-panel-open', panelOpen);

    if (panelOpen) {
      loadHistory().then(() => {
        renderMessages();
        updateContextBar();
        const input = document.getElementById('ai-input');
        if (input) setTimeout(() => input.focus(), 300);
      });
    }
  }

  /* ─────────── Create toggle button (floating) ──────────────── */
  function createToggleButton() {
    const existing = document.getElementById('ai-toggle-btn');
    if (existing) return existing;

    const btn = document.createElement('button');
    btn.id = 'ai-toggle-btn';
    btn.className = 'ai-toggle-btn';
    btn.innerHTML = '✨';
    btn.title = 'FinVest AI';
    btn.addEventListener('click', () => togglePanel());
    document.body.appendChild(btn);
    return btn;
  }

  /* ─────────── Set page context externally ───────────────────── */
  function setPageContext(viewName) {
    specifiedPage = viewName;
    updateContextBar();
  }

  /* ─────────── Ask AI programmatically ────────────────────────── */
  async function ask(question) {
    if (!AccessControl.canUseAI()) throw new Error('AI access denied');
    chatHistory.push({ role: 'user', text: question, ts: Date.now() });
    const response = await sendToGemini(question);
    chatHistory.push({ role: 'model', text: response, ts: Date.now() });
    saveHistory();
    return response;
  }

  /* ─────────── Init ──────────────────────────────────────────── */
  function init() {
    loadGeminiKey();
    createToggleButton();
    console.log('[FinAI] AI chat initialized (Gemini ' + GEMINI_MODEL + ') — key:', GEMINI_KEY ? 'loaded' : 'not configured');
  }

  /* ─────────── PUBLIC API ────────────────────────────────────── */
  window.FinAI = {
    init,
    togglePanel,
    setPageContext,
    ask,
    isOpen: () => panelOpen,
    getHistory: () => [...chatHistory],
    clearHistory: () => { chatHistory = []; saveHistory(); renderMessages(); }
  };
})();
