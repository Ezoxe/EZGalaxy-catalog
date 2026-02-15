(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ── SM-2 Algorithm ── */
  function sm2(card, quality) {
    // quality: 0=again, 1=hard, 2=good, 3=easy
    const q = [0, 2, 4, 5][quality];
    let { ef, interval, repetitions } = card;
    ef = ef || 2.5;
    interval = interval || 0;
    repetitions = repetitions || 0;

    if (q >= 3) {
      if (repetitions === 0) interval = 1;
      else if (repetitions === 1) interval = 6;
      else interval = Math.round(interval * ef);
      repetitions++;
    } else {
      repetitions = 0;
      interval = 1;
    }

    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (ef < 1.3) ef = 1.3;

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    return { ef: Math.round(ef * 100) / 100, interval, repetitions, nextReview: nextReview.toISOString().slice(0, 10) };
  }

  /* ── State ── */
  const state = {
    decks: [], // { id, name, emoji, cards: [{ id, front, back, ef, interval, repetitions, nextReview }] }
    tab: 'decks',
    studyDeckId: null,
    studyQueue: [],
    studyIndex: 0,
    flipped: false,
    editDeckId: null,
    totalReviews: 0
  };

  const DECK_EMOJIS = ['📚','🌍','💻','🔬','🎵','📐','🧬','⚡','🏛️','🎨'];

  /* ── Persistence ── */
  async function loadData() {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        const list = await ezgalaxy.storage.list('decks', { limit: 50 });
        if (list && Array.isArray(list) && list.length > 0) {
          state.decks = list.map(r => r.data);
        }
        const stats = await ezgalaxy.storage.get('reviews', 'stats');
        if (stats && stats.data) state.totalReviews = stats.data.totalReviews || 0;
      }
    } catch (e) { console.warn('NeuroCards: load failed', e); }
    if (state.decks.length === 0) {
      state.decks.push({
        id: 'demo', name: 'Capitales européennes', emoji: '🌍',
        cards: [
          { id: genId(), front: 'France', back: 'Paris', ef: 2.5, interval: 0, repetitions: 0, nextReview: today() },
          { id: genId(), front: 'Allemagne', back: 'Berlin', ef: 2.5, interval: 0, repetitions: 0, nextReview: today() },
          { id: genId(), front: 'Italie', back: 'Rome', ef: 2.5, interval: 0, repetitions: 0, nextReview: today() },
          { id: genId(), front: 'Espagne', back: 'Madrid', ef: 2.5, interval: 0, repetitions: 0, nextReview: today() },
          { id: genId(), front: 'Portugal', back: 'Lisbonne', ef: 2.5, interval: 0, repetitions: 0, nextReview: today() }
        ]
      });
    }
  }

  async function saveDeck(deck) {
    try { if (typeof ezgalaxy !== 'undefined') await ezgalaxy.storage.set('decks', deck.id, deck); } catch (e) { /* ignore */ }
  }
  async function deleteDeckStore(id) {
    try { if (typeof ezgalaxy !== 'undefined') await ezgalaxy.storage.delete('decks', id); } catch (e) { /* ignore */ }
  }
  async function saveStats() {
    try { if (typeof ezgalaxy !== 'undefined') await ezgalaxy.storage.set('reviews', 'stats', { totalReviews: state.totalReviews }); } catch (e) { /* ignore */ }
  }

  function today() { return new Date().toISOString().slice(0, 10); }

  function getDueCards(deck) {
    const t = today();
    return deck.cards.filter(c => !c.nextReview || c.nextReview <= t);
  }

  function getAllDueCount() {
    return state.decks.reduce((sum, d) => sum + getDueCards(d).length, 0);
  }

  /* ── Render ── */
  function render() {
    const root = $('#app');
    const totalCards = state.decks.reduce((s, d) => s + d.cards.length, 0);
    const dueCount = getAllDueCount();

    root.innerHTML = `
      <div class="nc-header">
        <h1><span>🧠</span> NeuroCards</h1>
        <p>Apprenez efficacement avec la répétition espacée</p>
      </div>

      ${state.tab === 'study' ? renderStudy() : state.tab === 'edit' ? renderEdit() : `
        <div class="nc-tabs">
          <button class="nc-tab ${state.tab === 'decks' ? 'active' : ''}" data-tab="decks">Mes Decks</button>
          <button class="nc-tab ${state.tab === 'stats' ? 'active' : ''}" data-tab="stats">Statistiques</button>
        </div>

        <div class="nc-panel ${state.tab === 'decks' ? 'active' : ''}" data-panel="decks">
          <div class="nc-stats">
            <div class="nc-stat"><div class="val">${state.decks.length}</div><div class="lbl">Decks</div></div>
            <div class="nc-stat"><div class="val">${totalCards}</div><div class="lbl">Cartes</div></div>
            <div class="nc-stat"><div class="val" style="color:${dueCount > 0 ? 'var(--ez-warning)' : 'var(--ez-success)'}">${dueCount}</div><div class="lbl">À réviser</div></div>
          </div>

          <div class="ez-card" style="margin-bottom:16px">
            <h3 style="margin:0 0 10px;font-size:.9rem">➕ Nouveau deck</h3>
            <div class="nc-add-form">
              <input type="text" id="nc-deck-name" placeholder="Nom du deck" maxlength="40" />
              <button class="ez-btn ez-btn--primary" data-action="add-deck">Créer</button>
            </div>
          </div>

          <div class="nc-decks">
            ${state.decks.length === 0 ? '<div class="nc-empty"><div class="big">📚</div>Créez votre premier deck</div>' :
              state.decks.map(d => {
                const due = getDueCards(d).length;
                return `
                <div class="nc-deck-card">
                  <div class="nc-deck-emoji">${d.emoji || '📚'}</div>
                  <div class="nc-deck-info">
                    <div class="nc-deck-name">${d.name}</div>
                    <div class="nc-deck-meta">${d.cards.length} cartes · ${due > 0 ? `<span style="color:var(--ez-warning)">${due} à réviser</span>` : '<span style="color:var(--ez-success)">À jour ✓</span>'}</div>
                  </div>
                  <div class="nc-deck-actions">
                    ${due > 0 ? `<button class="nc-btn-study" data-study="${d.id}" title="Réviser">▶</button>` : ''}
                    <button class="nc-btn-edit" data-editdeck="${d.id}" title="Éditer">✏</button>
                    <button class="nc-btn-del" data-deldeck="${d.id}" title="Supprimer">✕</button>
                  </div>
                </div>`;
              }).join('')
            }
          </div>
        </div>

        <div class="nc-panel ${state.tab === 'stats' ? 'active' : ''}" data-panel="stats">
          <div class="nc-stats">
            <div class="nc-stat"><div class="val">${state.totalReviews}</div><div class="lbl">Total révisions</div></div>
            <div class="nc-stat"><div class="val">${totalCards}</div><div class="lbl">Cartes totales</div></div>
            <div class="nc-stat"><div class="val">${totalCards - dueCount}</div><div class="lbl">Maîtrisées</div></div>
            <div class="nc-stat"><div class="val">${dueCount}</div><div class="lbl">À revoir</div></div>
          </div>
          ${state.decks.map(d => {
            const due = getDueCards(d).length;
            const mastered = d.cards.length - due;
            const pct = d.cards.length > 0 ? Math.round(mastered / d.cards.length * 100) : 100;
            return `
            <div class="ez-card" style="margin-bottom:10px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span>${d.emoji || '📚'}</span>
                <strong style="font-size:.88rem">${d.name}</strong>
                <span style="margin-left:auto;font-size:.78rem;color:var(--ez-muted)">${pct}%</span>
              </div>
              <div class="nc-progress-bar"><div class="fill" style="width:${pct}%"></div></div>
            </div>`;
          }).join('')}
        </div>
      `}
    `;

    bindEvents();
  }

  function renderStudy() {
    const deck = state.decks.find(d => d.id === state.studyDeckId);
    if (!deck) { state.tab = 'decks'; return render(), ''; }

    if (state.studyIndex >= state.studyQueue.length) {
      return `
        <div class="nc-complete">
          <div class="big">🎉</div>
          <h2>Session terminée !</h2>
          <p>Vous avez révisé ${state.studyQueue.length} carte${state.studyQueue.length > 1 ? 's' : ''} du deck "${deck.name}".</p>
          <button class="ez-btn ez-btn--primary" data-action="back-decks" style="margin-top:16px">← Retour aux decks</button>
        </div>
      `;
    }

    const card = state.studyQueue[state.studyIndex];
    const pct = Math.round((state.studyIndex / state.studyQueue.length) * 100);

    // Compute next intervals for each quality
    const intervals = [0, 1, 2, 3].map(q => {
      const result = sm2({ ...card }, q);
      return result.interval;
    });

    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <button class="ez-btn" data-action="back-decks" style="padding:6px 10px;font-size:.8rem">← Retour</button>
        <span style="font-size:.9rem;font-weight:600">${deck.emoji || '📚'} ${deck.name}</span>
      </div>

      <div class="nc-progress">
        <div class="nc-progress-bar"><div class="fill" style="width:${pct}%"></div></div>
        <span class="nc-progress-label">${state.studyIndex + 1} / ${state.studyQueue.length}</span>
      </div>

      <div class="nc-flashcard-wrap">
        <div class="nc-flashcard ${state.flipped ? 'flipped' : ''}" data-action="flip">
          <div class="nc-flashcard-face nc-flashcard-front">
            <div class="side-label">Question</div>
            <div class="content">${card.front}</div>
          </div>
          <div class="nc-flashcard-face nc-flashcard-back">
            <div class="side-label">Réponse</div>
            <div class="content">${card.back}</div>
          </div>
        </div>
      </div>

      <div class="nc-click-hint">${state.flipped ? '' : '👆 Cliquez pour retourner la carte'}</div>

      ${state.flipped ? `
        <div class="nc-review-btns">
          <button class="nc-rb-again" data-quality="0"><span class="emoji">😵</span>À revoir<span class="days">1j</span></button>
          <button class="nc-rb-hard" data-quality="1"><span class="emoji">😓</span>Difficile<span class="days">${intervals[1]}j</span></button>
          <button class="nc-rb-good" data-quality="2"><span class="emoji">😊</span>Bien<span class="days">${intervals[2]}j</span></button>
          <button class="nc-rb-easy" data-quality="3"><span class="emoji">🤩</span>Facile<span class="days">${intervals[3]}j</span></button>
        </div>
      ` : ''}
    `;
  }

  function renderEdit() {
    const deck = state.decks.find(d => d.id === state.editDeckId);
    if (!deck) { state.tab = 'decks'; return render(), ''; }

    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <button class="ez-btn" data-action="back-decks" style="padding:6px 10px;font-size:.8rem">← Retour</button>
        <span style="font-size:.9rem;font-weight:600">${deck.emoji || '📚'} ${deck.name} — Édition</span>
      </div>

      <div class="ez-card" style="margin-bottom:16px">
        <h3 style="margin:0 0 10px;font-size:.88rem">➕ Ajouter une carte</h3>
        <div class="nc-add-card-row">
          <input type="text" id="nc-front" placeholder="Question (recto)" maxlength="200" />
          <input type="text" id="nc-back" placeholder="Réponse (verso)" maxlength="200" />
          <button class="ez-btn ez-btn--primary" data-action="add-card" style="padding:6px 12px;font-size:.8rem">+</button>
        </div>
      </div>

      <div class="nc-cards-list">
        ${deck.cards.length === 0 ? '<div class="nc-empty" style="padding:20px"><div class="big">📝</div>Aucune carte</div>' :
          deck.cards.map(c => `
            <div class="nc-card-item">
              <span class="front">${c.front}</span>
              <span style="color:var(--ez-border)">→</span>
              <span class="back">${c.back}</span>
              <button data-delcard="${c.id}">✕</button>
            </div>
          `).join('')
        }
      </div>

      <div class="ez-card" style="margin-top:12px">
        <h3 style="margin:0 0 8px;font-size:.85rem">📥 Import JSON</h3>
        <p style="font-size:.75rem;color:var(--ez-muted);margin:0 0 8px">Format: [{"front":"...","back":"..."},...]</p>
        <textarea id="nc-import" style="width:100%;min-height:60px;background:rgba(0,0,0,.3);border:1px solid var(--ez-border);border-radius:8px;padding:8px;color:var(--ez-text);font-size:.8rem;font-family:monospace;resize:vertical" placeholder='[{"front":"Q","back":"A"}]'></textarea>
        <button class="ez-btn" data-action="import" style="margin-top:6px;font-size:.8rem;width:100%">Importer</button>
      </div>
    `;
  }

  /* ── Events ── */
  function bindEvents() {
    // Tabs
    $$('.nc-tab').forEach(t => t.addEventListener('click', () => { state.tab = t.dataset.tab; render(); }));

    // Actions
    $$('[data-action]').forEach(b => b.addEventListener('click', () => {
      switch (b.dataset.action) {
        case 'add-deck': {
          const nameEl = $('#nc-deck-name');
          const name = nameEl?.value?.trim();
          if (!name) return;
          const emoji = DECK_EMOJIS[Math.floor(Math.random() * DECK_EMOJIS.length)];
          const deck = { id: genId(), name, emoji, cards: [] };
          state.decks.push(deck);
          saveDeck(deck);
          render();
          break;
        }
        case 'back-decks':
          state.tab = 'decks';
          state.studyDeckId = null;
          state.editDeckId = null;
          render();
          break;
        case 'flip':
          state.flipped = !state.flipped;
          render();
          break;
        case 'add-card': {
          const deck = state.decks.find(d => d.id === state.editDeckId);
          const front = $('#nc-front')?.value?.trim();
          const back = $('#nc-back')?.value?.trim();
          if (!front || !back || !deck) return;
          deck.cards.push({ id: genId(), front, back, ef: 2.5, interval: 0, repetitions: 0, nextReview: today() });
          saveDeck(deck);
          render();
          break;
        }
        case 'import': {
          const deck = state.decks.find(d => d.id === state.editDeckId);
          const raw = $('#nc-import')?.value?.trim();
          if (!raw || !deck) return;
          try {
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return;
            arr.forEach(item => {
              if (item.front && item.back) {
                deck.cards.push({ id: genId(), front: String(item.front), back: String(item.back), ef: 2.5, interval: 0, repetitions: 0, nextReview: today() });
              }
            });
            saveDeck(deck);
            render();
          } catch (e) { /* ignore parse errors */ }
          break;
        }
      }
    }));

    // Study
    $$('[data-study]').forEach(b => b.addEventListener('click', () => {
      const deck = state.decks.find(d => d.id === b.dataset.study);
      if (!deck) return;
      state.studyDeckId = deck.id;
      state.studyQueue = getDueCards(deck).sort(() => Math.random() - 0.5);
      state.studyIndex = 0;
      state.flipped = false;
      state.tab = 'study';
      render();
    }));

    // Edit deck
    $$('[data-editdeck]').forEach(b => b.addEventListener('click', () => {
      state.editDeckId = b.dataset.editdeck;
      state.tab = 'edit';
      render();
    }));

    // Delete deck
    $$('[data-deldeck]').forEach(b => b.addEventListener('click', () => {
      state.decks = state.decks.filter(d => d.id !== b.dataset.deldeck);
      deleteDeckStore(b.dataset.deldeck);
      render();
    }));

    // Delete card
    $$('[data-delcard]').forEach(b => b.addEventListener('click', () => {
      const deck = state.decks.find(d => d.id === state.editDeckId);
      if (deck) {
        deck.cards = deck.cards.filter(c => c.id !== b.dataset.delcard);
        saveDeck(deck);
        render();
      }
    }));

    // Quality rating
    $$('[data-quality]').forEach(b => b.addEventListener('click', () => {
      const quality = parseInt(b.dataset.quality, 10);
      const card = state.studyQueue[state.studyIndex];
      const deck = state.decks.find(d => d.id === state.studyDeckId);
      if (!card || !deck) return;

      const result = sm2(card, quality);
      const realCard = deck.cards.find(c => c.id === card.id);
      if (realCard) {
        Object.assign(realCard, result);
      }

      state.totalReviews++;
      saveDeck(deck);
      saveStats();

      state.studyIndex++;
      state.flipped = false;
      render();
    }));

    // Flip card click
    const flashcard = $('.nc-flashcard');
    if (flashcard) flashcard.addEventListener('click', () => {
      state.flipped = !state.flipped;
      render();
    });
  }

  /* ── Init ── */
  async function init() {
    await loadData();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
