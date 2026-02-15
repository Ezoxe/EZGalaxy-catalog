(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const TAGS = [
    { key: 'red', label: 'Urgent', cls: 'kf-tag-red' },
    { key: 'blue', label: 'Feature', cls: 'kf-tag-blue' },
    { key: 'green', label: 'Done', cls: 'kf-tag-green' },
    { key: 'yellow', label: 'Bug', cls: 'kf-tag-yellow' },
    { key: 'purple', label: 'Idée', cls: 'kf-tag-purple' }
  ];

  const DEFAULT_BOARD = {
    id: 'default',
    name: 'Mon tableau',
    columns: [
      { id: 'todo', title: '📝 À faire', cards: [
        { id: genId(), title: 'Bienvenue dans KanFlow !', desc: 'Glissez les cartes entre colonnes', tags: ['blue'], due: '' }
      ]},
      { id: 'progress', title: '🔄 En cours', cards: [] },
      { id: 'done', title: '✅ Terminé', cards: [] }
    ]
  };

  const state = {
    boards: [],
    activeBoardId: 'default',
    modal: null, // { type: 'card'|'column', colId?, cardId? }
    dragCard: null,
    dragSourceCol: null
  };

  function activeBoard() { return state.boards.find(b => b.id === state.activeBoardId) || state.boards[0]; }

  /* ── Persistence ── */
  async function loadBoards() {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        const list = await ezgalaxy.storage.list('boards', { limit: 20 });
        if (list && Array.isArray(list) && list.length > 0) {
          state.boards = list.map(r => r.data);
        }
      }
    } catch (e) { console.warn('KanFlow: load failed', e); }
    if (state.boards.length === 0) state.boards.push(JSON.parse(JSON.stringify(DEFAULT_BOARD)));
    if (!state.activeBoardId) state.activeBoardId = state.boards[0].id;
  }

  async function saveBoard(board) {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        await ezgalaxy.storage.set('boards', board.id, board);
      }
    } catch (e) { /* ignore */ }
  }

  async function deleteBoard(id) {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        await ezgalaxy.storage.delete('boards', id);
      }
    } catch (e) { /* ignore */ }
  }

  function autosave() {
    const board = activeBoard();
    if (board) saveBoard(board);
  }

  /* ── Render ── */
  function render() {
    const root = $('#app');
    const board = activeBoard();
    if (!board) return;

    root.innerHTML = `
      <div class="kf-header">
        <h1>📋 KanFlow</h1>
        <select id="kf-board-select">
          ${state.boards.map(b => `<option value="${b.id}" ${b.id === state.activeBoardId ? 'selected' : ''}>${b.name}</option>`).join('')}
        </select>
        <div class="kf-header-actions">
          <button data-action="new-board">+ Tableau</button>
          <button data-action="rename-board">✏️</button>
          ${state.boards.length > 1 ? `<button data-action="delete-board">🗑</button>` : ''}
        </div>
      </div>

      <div class="kf-board" id="kf-board">
        ${board.columns.map(col => `
          <div class="kf-column" data-colid="${col.id}">
            <div class="kf-col-header">
              <h3>${col.title} <span class="count">${col.cards.length}</span></h3>
              <div style="display:flex;gap:2px">
                <button data-addcard="${col.id}" title="Ajouter une carte">+</button>
                ${board.columns.length > 1 ? `<button data-delcol="${col.id}" title="Supprimer">✕</button>` : ''}
              </div>
            </div>
            <div class="kf-col-body" data-dropcol="${col.id}">
              ${col.cards.map(card => renderCard(card, col.id)).join('')}
            </div>
          </div>
        `).join('')}
        <div class="kf-add-col" data-action="add-column">+ Ajouter une colonne</div>
      </div>

      ${state.modal ? renderModal() : ''}
    `;

    bindEvents();
    setupDragDrop();
  }

  function renderCard(card, colId) {
    const isOverdue = card.due && card.due < new Date().toISOString().slice(0, 10);
    return `
      <div class="kf-card" draggable="true" data-cardid="${card.id}" data-sourcecol="${colId}">
        <div class="kf-card-actions">
          <button data-editcard="${card.id}" data-col="${colId}">✏</button>
          <button data-delcard="${card.id}" data-col="${colId}">✕</button>
        </div>
        <div class="kf-card-title">${card.title}</div>
        <div class="kf-card-meta">
          ${(card.tags || []).map(t => {
            const tag = TAGS.find(tg => tg.key === t);
            return tag ? `<span class="kf-tag ${tag.cls}">${tag.label}</span>` : '';
          }).join('')}
          ${card.due ? `<span class="kf-card-date ${isOverdue ? 'overdue' : ''}">📅 ${card.due}</span>` : ''}
        </div>
      </div>
    `;
  }

  function renderModal() {
    const m = state.modal;
    if (m.type === 'card') {
      const card = m.card || { title: '', desc: '', tags: [], due: '' };
      return `
        <div class="kf-modal-overlay" data-action="close-modal">
          <div class="kf-modal" onclick="event.stopPropagation()">
            <h2>${m.editing ? '✏️ Modifier la carte' : '➕ Nouvelle carte'}</h2>
            <div class="kf-modal-field">
              <label>Titre</label>
              <input type="text" id="kf-card-title" value="${card.title}" maxlength="100" placeholder="Titre de la tâche" />
            </div>
            <div class="kf-modal-field">
              <label>Description</label>
              <textarea id="kf-card-desc" placeholder="Description optionnelle">${card.desc || ''}</textarea>
            </div>
            <div class="kf-modal-field">
              <label>Étiquettes</label>
              <div class="kf-tags-selector">
                ${TAGS.map(t => `<button class="${t.cls} ${(card.tags || []).includes(t.key) ? 'selected' : ''}" data-tagtoggle="${t.key}">${t.label}</button>`).join('')}
              </div>
            </div>
            <div class="kf-modal-field">
              <label>Date d'échéance</label>
              <input type="date" id="kf-card-due" value="${card.due || ''}" />
            </div>
            <div class="kf-modal-actions">
              <button data-action="close-modal">Annuler</button>
              <button class="primary" data-action="save-card">${m.editing ? 'Modifier' : 'Ajouter'}</button>
            </div>
          </div>
        </div>
      `;
    }
    if (m.type === 'column') {
      return `
        <div class="kf-modal-overlay" data-action="close-modal">
          <div class="kf-modal" onclick="event.stopPropagation()">
            <h2>➕ Nouvelle colonne</h2>
            <div class="kf-modal-field">
              <label>Titre de la colonne</label>
              <input type="text" id="kf-col-title" maxlength="40" placeholder="Ex: En test" />
            </div>
            <div class="kf-modal-actions">
              <button data-action="close-modal">Annuler</button>
              <button class="primary" data-action="save-column">Ajouter</button>
            </div>
          </div>
        </div>
      `;
    }
    return '';
  }

  /* ── Drag & Drop (vanilla) ── */
  function setupDragDrop() {
    $$('.kf-card[draggable]').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        state.dragCard = card.dataset.cardid;
        state.dragSourceCol = card.dataset.sourcecol;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        $$('.kf-col-body').forEach(b => b.classList.remove('drag-over'));
      });
    });

    $$('.kf-col-body[data-dropcol]').forEach(body => {
      body.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        body.classList.add('drag-over');
      });
      body.addEventListener('dragleave', () => body.classList.remove('drag-over'));
      body.addEventListener('drop', (e) => {
        e.preventDefault();
        body.classList.remove('drag-over');
        const targetColId = body.dataset.dropcol;
        if (!state.dragCard || !state.dragSourceCol) return;
        moveCard(state.dragCard, state.dragSourceCol, targetColId);
        state.dragCard = null;
        state.dragSourceCol = null;
      });
    });
  }

  function moveCard(cardId, fromColId, toColId) {
    const board = activeBoard();
    const fromCol = board.columns.find(c => c.id === fromColId);
    const toCol = board.columns.find(c => c.id === toColId);
    if (!fromCol || !toCol) return;
    const cardIdx = fromCol.cards.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return;
    const [card] = fromCol.cards.splice(cardIdx, 1);
    toCol.cards.push(card);
    autosave();
    render();
  }

  /* ── Events ── */
  function bindEvents() {
    const boardSelect = $('#kf-board-select');
    if (boardSelect) boardSelect.addEventListener('change', () => {
      state.activeBoardId = boardSelect.value;
      render();
    });

    $$('[data-action]').forEach(b => b.addEventListener('click', () => {
      const board = activeBoard();
      switch (b.dataset.action) {
        case 'new-board': {
          const nb = { id: genId(), name: 'Nouveau tableau', columns: [
            { id: genId(), title: '📝 À faire', cards: [] },
            { id: genId(), title: '🔄 En cours', cards: [] },
            { id: genId(), title: '✅ Terminé', cards: [] }
          ]};
          state.boards.push(nb);
          state.activeBoardId = nb.id;
          saveBoard(nb);
          render();
          break;
        }
        case 'rename-board': {
          const name = prompt('Nom du tableau :', board.name);
          if (name && name.trim()) {
            board.name = name.trim();
            autosave();
            render();
          }
          break;
        }
        case 'delete-board': {
          if (state.boards.length <= 1) return;
          state.boards = state.boards.filter(brd => brd.id !== board.id);
          deleteBoard(board.id);
          state.activeBoardId = state.boards[0].id;
          render();
          break;
        }
        case 'add-column':
          state.modal = { type: 'column' };
          render();
          break;
        case 'close-modal':
          state.modal = null;
          render();
          break;
        case 'save-card': {
          const title = ($('#kf-card-title') || {}).value?.trim();
          if (!title) return;
          const desc = ($('#kf-card-desc') || {}).value?.trim() || '';
          const due = ($('#kf-card-due') || {}).value || '';
          const tags = $$('.kf-tags-selector button.selected').map(b => b.dataset.tagtoggle);
          if (state.modal.editing) {
            const col = board.columns.find(c => c.id === state.modal.colId);
            if (col) {
              const card = col.cards.find(c => c.id === state.modal.cardId);
              if (card) { card.title = title; card.desc = desc; card.due = due; card.tags = tags; }
            }
          } else {
            const col = board.columns.find(c => c.id === state.modal.colId);
            if (col) col.cards.push({ id: genId(), title, desc, tags, due });
          }
          state.modal = null;
          autosave();
          render();
          break;
        }
        case 'save-column': {
          const title = ($('#kf-col-title') || {}).value?.trim();
          if (!title) return;
          board.columns.push({ id: genId(), title, cards: [] });
          state.modal = null;
          autosave();
          render();
          break;
        }
      }
    }));

    // Tag toggles in modal
    $$('[data-tagtoggle]').forEach(b => b.addEventListener('click', () => {
      b.classList.toggle('selected');
    }));

    // Add card
    $$('[data-addcard]').forEach(b => b.addEventListener('click', () => {
      state.modal = { type: 'card', colId: b.dataset.addcard, editing: false };
      render();
    }));

    // Edit card
    $$('[data-editcard]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const board = activeBoard();
      const col = board.columns.find(c => c.id === b.dataset.col);
      const card = col?.cards.find(c => c.id === b.dataset.editcard);
      if (card) {
        state.modal = { type: 'card', colId: b.dataset.col, cardId: card.id, card: { ...card }, editing: true };
        render();
      }
    }));

    // Delete card
    $$('[data-delcard]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const board = activeBoard();
      const col = board.columns.find(c => c.id === b.dataset.col);
      if (col) {
        col.cards = col.cards.filter(c => c.id !== b.dataset.delcard);
        autosave();
        render();
      }
    }));

    // Delete column
    $$('[data-delcol]').forEach(b => b.addEventListener('click', () => {
      const board = activeBoard();
      if (board.columns.length <= 1) return;
      board.columns = board.columns.filter(c => c.id !== b.dataset.delcol);
      autosave();
      render();
    }));
  }

  /* ── Init ── */
  async function init() {
    await loadBoards();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
