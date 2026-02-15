(() => {
  'use strict';

  /* ── Storage helpers ── */
  const APP   = window.ezgalaxy ? ezgalaxy.app  : null;
  const STORE = window.ezgalaxy ? ezgalaxy.storage : null;
  const POLLS_KEY  = 'polls';       // app-shared
  const MY_KEY     = 'my-polls';    // private
  const VOTES_KEY  = 'my-votes';    // private – track user votes

  async function loadShared(k, def) {
    try { if (APP) { const d = await APP.getData(k); return d ?? def; } } catch(_){}
    try { return JSON.parse(localStorage.getItem('pm_' + k)) || def; } catch(_){ return def; }
  }
  async function saveShared(k, v) {
    try { if (APP) return await APP.setData(k, v); } catch(_){}
    localStorage.setItem('pm_' + k, JSON.stringify(v));
  }
  async function loadPrivate(k, def) {
    try { if (STORE) { const d = await STORE.getData(k); return d ?? def; } } catch(_){}
    try { return JSON.parse(localStorage.getItem('pmp_' + k)) || def; } catch(_){ return def; }
  }
  async function savePrivate(k, v) {
    try { if (STORE) return await STORE.setData(k, v); } catch(_){}
    localStorage.setItem('pmp_' + k, JSON.stringify(v));
  }

  /* ── State ── */
  let polls     = [];   // all community polls
  let myPollIds = [];   // ids of polls I created
  let myVotes   = {};   // { pollId: [optionIndexes] }
  let currentTab = 'community';
  let editingId  = null;

  /* ── DOM refs ── */
  const $ = s => document.querySelector(s);
  const viewCommunity = $('#view-community');
  const viewMine      = $('#view-mine');
  const modalCreate   = $('#modal-create');
  const modalVote     = $('#modal-vote');

  /* ── Category labels ── */
  const CAT = {
    general:'💬 Général', tech:'💻 Technologie', culture:'🎭 Culture',
    gaming:'🎮 Gaming', food:'🍕 Cuisine', sport:'⚽ Sport'
  };

  /* ── Init ── */
  async function init() {
    polls     = await loadShared(POLLS_KEY, []);
    myPollIds = await loadPrivate(MY_KEY, []);
    myVotes   = await loadPrivate(VOTES_KEY, {});
    renderPolls();
    bindEvents();
  }

  /* ── Render poll list ── */
  function renderPolls() {
    renderList(viewCommunity, polls);
    const mine = polls.filter(p => myPollIds.includes(p.id));
    renderList(viewMine, mine);
  }

  function renderList(container, list) {
    if (!list.length) { container.innerHTML = '<div class="empty-state">Aucun sondage pour le moment.<br>Créez-en un ! 🎉</div>'; return; }
    const sorted = [...list].sort((a, b) => b.created - a.created);
    container.innerHTML = sorted.map(p => {
      const total = p.options.reduce((s, o) => s + o.votes, 0);
      return `<div class="poll-card" data-id="${p.id}">
        <div class="poll-q">${esc(p.question)}</div>
        <div class="poll-info">
          <span>${CAT[p.category] || p.category}</span>
          <span>📊 ${total} vote${total !== 1 ? 's' : ''}</span>
          <span>📝 ${p.options.length} options</span>
          <span>🕒 ${timeAgo(p.created)}</span>
          ${p.multi ? '<span class="poll-badge">Multi-vote</span>' : ''}
        </div>
      </div>`;
    }).join('');
  }

  /* ── Bind events ── */
  function bindEvents() {
    // Tabs
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      currentTab = t.dataset.tab;
      viewCommunity.style.display = currentTab === 'community' ? '' : 'none';
      viewMine.style.display      = currentTab === 'mine' ? '' : 'none';
    }));

    // Create
    $('#btn-create').addEventListener('click', () => openCreateModal());
    $('#btn-close-modal').addEventListener('click', closeCreateModal);
    $('#btn-cancel').addEventListener('click', closeCreateModal);
    $('#btn-save').addEventListener('click', savePoll);
    $('#btn-add-option').addEventListener('click', addOptionRow);

    // Vote modal
    $('#btn-close-vote').addEventListener('click', () => modalVote.style.display = 'none');
    $('#btn-back-vote').addEventListener('click', () => modalVote.style.display = 'none');
    $('#btn-submit-vote').addEventListener('click', submitVote);
    $('#btn-delete-poll').addEventListener('click', deletePoll);

    // Refresh
    $('#btn-refresh').addEventListener('click', async () => {
      polls = await loadShared(POLLS_KEY, []);
      renderPolls();
    });

    // Click on cards
    viewCommunity.addEventListener('click', cardClick);
    viewMine.addEventListener('click', cardClick);

    // Close modals on overlay click
    modalCreate.addEventListener('click', e => { if (e.target === modalCreate) closeCreateModal(); });
    modalVote.addEventListener('click', e => { if (e.target === modalVote) modalVote.style.display = 'none'; });
  }

  function cardClick(e) {
    const card = e.target.closest('.poll-card');
    if (!card) return;
    const poll = polls.find(p => p.id === card.dataset.id);
    if (poll) openVoteModal(poll);
  }

  /* ── Create modal ── */
  function openCreateModal(poll) {
    editingId = poll ? poll.id : null;
    $('#modal-title').textContent = poll ? 'Modifier le sondage' : 'Nouveau sondage';
    $('#poll-question').value = poll ? poll.question : '';
    $('#poll-category').value = poll ? poll.category : 'general';
    $('#poll-multi').checked = poll ? poll.multi : false;
    const container = $('#options-container');
    container.innerHTML = '';
    if (poll) {
      poll.options.forEach(o => addOptionRow(null, o.text));
    } else {
      addOptionRow(); addOptionRow();
    }
    modalCreate.style.display = 'flex';
    setTimeout(() => $('#poll-question').focus(), 100);
  }

  function closeCreateModal() { modalCreate.style.display = 'none'; editingId = null; }

  function addOptionRow(e, value) {
    if (e) e.preventDefault();
    const container = $('#options-container');
    const count = container.children.length;
    if (count >= 10) return;
    const row = document.createElement('div');
    row.className = 'option-row';
    row.innerHTML = `<input type="text" class="field-input opt-input" placeholder="Option ${count + 1}" maxlength="120" value="${esc(value || '')}">
      <button class="remove-opt" title="Supprimer">✕</button>`;
    row.querySelector('.remove-opt').addEventListener('click', () => {
      if (container.children.length > 2) row.remove();
    });
    container.appendChild(row);
  }

  /* ── Save poll ── */
  async function savePoll() {
    const question = $('#poll-question').value.trim();
    if (!question) return shake($('#poll-question'));
    const inputs = document.querySelectorAll('.opt-input');
    const opts = [];
    inputs.forEach(inp => { const v = inp.value.trim(); if (v) opts.push(v); });
    if (opts.length < 2) return;

    if (editingId) {
      const poll = polls.find(p => p.id === editingId);
      if (poll) {
        poll.question = question;
        poll.category = $('#poll-category').value;
        poll.multi    = $('#poll-multi').checked;
        // keep existing votes – only add new options
        const existing = poll.options.map(o => o.text);
        poll.options = opts.map(t => {
          const idx = existing.indexOf(t);
          return idx >= 0 ? poll.options[idx] : { text: t, votes: 0 };
        });
      }
    } else {
      const poll = {
        id: uid(),
        question,
        category: $('#poll-category').value,
        multi: $('#poll-multi').checked,
        options: opts.map(t => ({ text: t, votes: 0 })),
        created: Date.now()
      };
      polls.push(poll);
      myPollIds.push(poll.id);
      await savePrivate(MY_KEY, myPollIds);
    }

    await saveShared(POLLS_KEY, polls);
    renderPolls();
    closeCreateModal();
  }

  /* ── Vote modal ── */
  let currentPollId = null;
  let selectedOpts  = [];

  function openVoteModal(poll) {
    currentPollId = poll.id;
    selectedOpts = [];
    const hasVoted = !!myVotes[poll.id];
    const isMine   = myPollIds.includes(poll.id);

    $('#vote-question').textContent = poll.question;
    $('#vote-meta').innerHTML = `<span>${CAT[poll.category]}</span><span>🕒 ${timeAgo(poll.created)}</span>${poll.multi ? '<span class="poll-badge">Multi-vote</span>' : ''}`;

    const container = $('#vote-options');
    const total = poll.options.reduce((s, o) => s + o.votes, 0);

    if (hasVoted) {
      // Show results
      container.innerHTML = poll.options.map((o, i) => {
        const pct = total ? Math.round(o.votes / total * 100) : 0;
        const sel = (myVotes[poll.id] || []).includes(i) ? ' selected' : '';
        return `<div class="vote-option${sel}">
          <div class="result-bar-bg" style="width:${pct}%"></div>
          <div class="${poll.multi ? 'checkbox' : 'radio'}"></div>
          <span class="opt-label">${esc(o.text)}</span>
          <span class="opt-count">${pct}% (${o.votes})</span>
        </div>`;
      }).join('');
      $('#btn-submit-vote').style.display = 'none';
      drawChart(poll);
    } else {
      container.innerHTML = poll.options.map((o, i) => {
        return `<div class="vote-option" data-idx="${i}">
          <div class="${poll.multi ? 'checkbox' : 'radio'}"></div>
          <span class="opt-label">${esc(o.text)}</span>
        </div>`;
      }).join('');
      container.querySelectorAll('.vote-option').forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.dataset.idx);
          if (poll.multi) {
            el.classList.toggle('selected');
            if (selectedOpts.includes(idx)) selectedOpts = selectedOpts.filter(x => x !== idx);
            else selectedOpts.push(idx);
          } else {
            container.querySelectorAll('.vote-option').forEach(x => x.classList.remove('selected'));
            el.classList.add('selected');
            selectedOpts = [idx];
          }
        });
      });
      $('#btn-submit-vote').style.display = '';
      $('#results-chart').style.display = 'none';
    }

    $('#btn-delete-poll').style.display = isMine ? '' : 'none';
    modalVote.style.display = 'flex';
  }

  async function submitVote() {
    if (!selectedOpts.length || !currentPollId) return;
    const poll = polls.find(p => p.id === currentPollId);
    if (!poll) return;
    selectedOpts.forEach(i => { if (poll.options[i]) poll.options[i].votes++; });
    myVotes[currentPollId] = [...selectedOpts];
    await saveShared(POLLS_KEY, polls);
    await savePrivate(VOTES_KEY, myVotes);
    renderPolls();
    openVoteModal(poll); // re-render as results
  }

  async function deletePoll() {
    if (!currentPollId) return;
    polls = polls.filter(p => p.id !== currentPollId);
    myPollIds = myPollIds.filter(id => id !== currentPollId);
    delete myVotes[currentPollId];
    await saveShared(POLLS_KEY, polls);
    await savePrivate(MY_KEY, myPollIds);
    await savePrivate(VOTES_KEY, myVotes);
    renderPolls();
    modalVote.style.display = 'none';
  }

  /* ── Chart ── */
  function drawChart(poll) {
    const canvas = $('#results-chart');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const total = poll.options.reduce((s, o) => s + o.votes, 0);
    if (!total) return;

    const colors = ['#0ea5a4','#6366f1','#f59e0b','#ef4444','#10b981','#ec4899','#8b5cf6','#14b8a6','#f97316','#64748b'];
    const barH = Math.min(28, (H - 30) / poll.options.length - 6);
    const maxLabel = 100;
    const chartLeft = 110;
    const chartW = W - chartLeft - 20;

    poll.options.forEach((o, i) => {
      const y = 10 + i * (barH + 6);
      const pct = o.votes / total;

      // label
      ctx.fillStyle = '#bbb';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const label = o.text.length > 14 ? o.text.slice(0, 13) + '…' : o.text;
      ctx.fillText(label, chartLeft - 8, y + barH / 2);

      // bar bg
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      roundRect(ctx, chartLeft, y, chartW, barH, 6);
      ctx.fill();

      // bar
      const bw = Math.max(pct * chartW, 0);
      if (bw > 0) {
        ctx.fillStyle = colors[i % colors.length];
        roundRect(ctx, chartLeft, y, bw, barH, 6);
        ctx.fill();
      }

      // pct label
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(Math.round(pct * 100) + '%', chartLeft + bw + 6, y + barH / 2);
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ── Helpers ── */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function shake(el) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = 'shake .4s'; }
  function timeAgo(ts) {
    const d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60) return 'à l\'instant';
    if (d < 3600) return Math.floor(d / 60) + ' min';
    if (d < 86400) return Math.floor(d / 3600) + ' h';
    return Math.floor(d / 86400) + ' j';
  }

  /* ── Boot ── */
  init();
})();