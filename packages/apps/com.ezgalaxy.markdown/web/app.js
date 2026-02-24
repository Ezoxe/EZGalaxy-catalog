(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ── URL sanitization for XSS prevention ── */
  function sanitizeUrl(url) {
    const decoded = url.trim();
    // Block dangerous protocols
    if (/^\s*(javascript|vbscript|data)\s*:/i.test(decoded)) return '';
    return decoded;
  }

  /* ── Minimal Markdown parser (no external lib needed) ── */
  function parseMD(md) {
    let html = md;
    // Escape HTML
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => `<pre><code class="language-${lang}">${code.trim()}</code></pre>`);
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Headers
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    // Blockquote
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    // Bold + Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    // Images (BEFORE links to avoid being consumed by link regex)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
      const safe = sanitizeUrl(url);
      return safe ? `<img src="${safe}" alt="${alt}" />` : `[${alt}]`;
    });
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      const safe = sanitizeUrl(url);
      return safe ? `<a href="${safe}" target="_blank" rel="noopener">${text}</a>` : text;
    });
    // HR
    html = html.replace(/^---$/gm, '<hr>');
    // Unordered lists
    html = html.replace(/^[\-\*] (.+)$/gm, '<li class="ul-item">$1</li>');
    html = html.replace(/((<li class="ul-item">.*<\/li>\n?)+)/g, (m) => '<ul>' + m.replace(/ class="ul-item"/g, '') + '</ul>');
    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li class="ol-item">$1</li>');
    html = html.replace(/((<li class="ol-item">.*<\/li>\n?)+)/g, (m) => '<ol>' + m.replace(/ class="ol-item"/g, '') + '</ol>');
    // Tables
    html = html.replace(/^\|(.+)\|\s*$/gm, (match, content) => {
      const cells = content.split('|').map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) return '<!-- table-sep -->';
      return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
    });
    html = html.replace(/((<tr>.*<\/tr>\n?)+)/g, (match) => {
      const cleaned = match.replace(/<!-- table-sep -->\n?/g, '');
      return '<table>' + cleaned.replace(/<tr>(.*?)<\/tr>/, (m, inner) => '<thead><tr>' + inner.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>') + '</tr></thead><tbody>') + '</tbody></table>';
    });
    // Paragraphs
    html = html.replace(/\n{2,}/g, '\n\n');
    html = html.split('\n\n').map(block => {
      block = block.trim();
      if (!block) return '';
      if (/^<[a-z]/.test(block)) return block;
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    return html;
  }

  /* ── State ── */
  const state = {
    documents: [],  // { id, title, content, updatedAt }
    activeDocId: null,
    sidebarOpen: true,
    saveTimeout: null
  };

  const DEFAULT_DOC = {
    id: 'welcome',
    title: 'Bienvenue',
    content: `# Bienvenue dans MarkDown Studio 📝

Éditez du **Markdown** et visualisez le résultat en temps réel.

## Fonctionnalités

- ✍️ Édition en temps réel avec preview
- 📂 Multi-documents avec sauvegarde cloud
- 🎨 Barre d'outils de formatage rapide
- 📊 Compteur de mots et caractères

## Syntaxe supportée

### Texte

**Gras**, *italique*, ~~barré~~, \`code inline\`

### Bloc de code

\`\`\`javascript
function hello() {
  console.log("Bonjour !");
}
\`\`\`

### Citations

> Ceci est une citation avec un style élégant.

### Listes

- Élément 1
- Élément 2
- Élément 3

### Liens

[EZGalaxy](https://ezgalaxy.fr)

---

*Commencez à écrire !*
`,
    updatedAt: new Date().toISOString()
  };

  /* ── Persistence ── */
  async function loadDocuments() {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        const list = await ezgalaxy.storage.list('documents', { limit: 100 });
        if (list && Array.isArray(list) && list.length > 0) {
          state.documents = list.map(r => r.data);
        }
      }
    } catch (e) { console.warn('MD: load failed', e); }
    if (state.documents.length === 0) state.documents.push({ ...DEFAULT_DOC });
    if (!state.activeDocId) state.activeDocId = state.documents[0].id;
  }

  async function saveDocument(doc) {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        await ezgalaxy.storage.set('documents', doc.id, doc);
      }
    } catch (e) { /* ignore */ }
  }

  async function deleteDocumentFromStore(docId) {
    try {
      if (typeof ezgalaxy !== 'undefined') {
        await ezgalaxy.storage.delete('documents', docId);
      }
    } catch (e) { /* ignore */ }
  }

  /* ── Active doc helpers ── */
  function activeDoc() { return state.documents.find(d => d.id === state.activeDocId); }

  function countWords(text) {
    const trimmed = text.trim();
    if (!trimmed) return { words: 0, chars: 0, lines: 0 };
    return {
      words: trimmed.split(/\s+/).length,
      chars: trimmed.length,
      lines: trimmed.split('\n').length
    };
  }

  /* ── Render ── */
  function render() {
    const root = $('#app');
    const doc = activeDoc() || state.documents[0];
    if (!doc) return;
    state.activeDocId = doc.id;
    const stats = countWords(doc.content);

    root.innerHTML = `
      <div class="md-toolbar">
        <button class="md-tool-btn" data-action="toggle-sidebar" title="Documents">📂</button>
        <h1>📝 MarkDown Studio</h1>
        <button class="md-tool-btn" data-insert="**" title="Gras"><b>B</b></button>
        <button class="md-tool-btn" data-insert="*" title="Italique"><i>I</i></button>
        <button class="md-tool-btn" data-insert="~~" title="Barré"><s>S</s></button>
        <button class="md-tool-btn" data-insert="\`" title="Code">{ }</button>
        <div class="md-tool-sep"></div>
        <button class="md-tool-btn" data-insertline="# " title="H1">H1</button>
        <button class="md-tool-btn" data-insertline="## " title="H2">H2</button>
        <button class="md-tool-btn" data-insertline="### " title="H3">H3</button>
        <div class="md-tool-sep"></div>
        <button class="md-tool-btn" data-insertline="- " title="Liste">•</button>
        <button class="md-tool-btn" data-insertline="> " title="Citation">❝</button>
        <button class="md-tool-btn" data-insertblock="link" title="Lien">🔗</button>
        <div class="md-tool-sep"></div>
        <button class="md-tool-btn" data-action="copy-html" title="Copier HTML">📋</button>
        <span class="md-saved" id="md-saved">✓ Sauvegardé</span>
        <span class="md-word-count">${stats.words} mots · ${stats.chars} car. · ${stats.lines} lignes</span>
      </div>

      <div class="md-layout">
        <div class="md-sidebar ${state.sidebarOpen ? '' : 'collapsed'}">
          <div class="md-sidebar-header">
            <h3>📄 Documents</h3>
            <button class="md-tool-btn" data-action="new-doc" title="Nouveau" style="width:28px;height:28px;font-size:.75rem">+</button>
          </div>
          <div class="md-doc-list">
            ${state.documents.map(d => `
              <div class="md-doc-item ${d.id === state.activeDocId ? 'active' : ''}" data-docid="${d.id}">
                <span class="title">${d.title || 'Sans titre'}</span>
                ${state.documents.length > 1 ? `<span class="del" data-deldoc="${d.id}" title="Supprimer">✕</span>` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="md-editor-wrap">
          <div class="md-editor">
            <textarea id="md-textarea" placeholder="Écrivez votre Markdown ici…">${doc.content}</textarea>
          </div>
          <div class="md-resize-handle" id="md-resize"></div>
          <div class="md-preview" id="md-preview">
            ${parseMD(doc.content)}
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  /* ── Events ── */
  function bindEvents() {
    const textarea = $('#md-textarea');
    const preview = $('#md-preview');

    // Live preview
    if (textarea) {
      textarea.addEventListener('input', () => {
        const doc = activeDoc();
        if (!doc) return;
        doc.content = textarea.value;
        doc.title = extractTitle(doc.content);
        doc.updatedAt = new Date().toISOString();
        preview.innerHTML = parseMD(doc.content);
        // Update word count
        const stats = countWords(doc.content);
        const wc = $('.md-word-count');
        if (wc) wc.textContent = `${stats.words} mots · ${stats.chars} car. · ${stats.lines} lignes`;
        // Debounced save
        clearTimeout(state.saveTimeout);
        state.saveTimeout = setTimeout(() => {
          saveDocument(doc);
          showSaved();
          // Update sidebar title
          const item = $(`.md-doc-item[data-docid="${doc.id}"] .title`);
          if (item) item.textContent = doc.title || 'Sans titre';
        }, 800);
      });

      // Tab support
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
          textarea.selectionStart = textarea.selectionEnd = start + 2;
          textarea.dispatchEvent(new Event('input'));
        }
      });
    }

    // Toolbar inserts
    $$('[data-insert]').forEach(b => b.addEventListener('click', () => {
      if (!textarea) return;
      const wrap = b.dataset.insert;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = textarea.value.substring(start, end);
      textarea.value = textarea.value.substring(0, start) + wrap + selected + wrap + textarea.value.substring(end);
      textarea.selectionStart = start + wrap.length;
      textarea.selectionEnd = end + wrap.length;
      textarea.focus();
      textarea.dispatchEvent(new Event('input'));
    }));

    $$('[data-insertline]').forEach(b => b.addEventListener('click', () => {
      if (!textarea) return;
      const prefix = b.dataset.insertline;
      const start = textarea.selectionStart;
      const lineStart = textarea.value.lastIndexOf('\n', start - 1) + 1;
      textarea.value = textarea.value.substring(0, lineStart) + prefix + textarea.value.substring(lineStart);
      textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
      textarea.focus();
      textarea.dispatchEvent(new Event('input'));
    }));

    $$('[data-insertblock]').forEach(b => b.addEventListener('click', () => {
      if (!textarea) return;
      if (b.dataset.insertblock === 'link') {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end) || 'texte';
        const insert = `[${selected}](url)`;
        textarea.value = textarea.value.substring(0, start) + insert + textarea.value.substring(end);
        textarea.focus();
        textarea.dispatchEvent(new Event('input'));
      }
    }));

    // Actions
    $$('[data-action]').forEach(b => b.addEventListener('click', () => {
      switch (b.dataset.action) {
        case 'toggle-sidebar':
          state.sidebarOpen = !state.sidebarOpen;
          const sb = $('.md-sidebar');
          if (sb) sb.classList.toggle('collapsed', !state.sidebarOpen);
          break;
        case 'new-doc':
          const newDoc = { id: genId(), title: 'Nouveau document', content: '# Nouveau document\n\n', updatedAt: new Date().toISOString() };
          state.documents.push(newDoc);
          state.activeDocId = newDoc.id;
          saveDocument(newDoc);
          render();
          break;
        case 'copy-html':
          const doc = activeDoc();
          if (doc) {
            const html = parseMD(doc.content);
            navigator.clipboard.writeText(html).catch(() => {});
            showSaved();
          }
          break;
      }
    }));

    // Document selection
    $$('.md-doc-item[data-docid]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.dataset.deldoc) return;
        state.activeDocId = el.dataset.docid;
        render();
      });
    });

    // Document deletion
    $$('[data-deldoc]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = b.dataset.deldoc;
      state.documents = state.documents.filter(d => d.id !== id);
      deleteDocumentFromStore(id);
      if (state.activeDocId === id) state.activeDocId = state.documents[0]?.id || null;
      render();
    }));

    // Resize handle
    const handle = $('#md-resize');
    if (handle) {
      let resizing = false;
      handle.addEventListener('mousedown', (e) => {
        resizing = true;
        e.preventDefault();
      });
      document.addEventListener('mousemove', (e) => {
        if (!resizing) return;
        const wrap = $('.md-editor-wrap');
        if (!wrap) return;
        const rect = wrap.getBoundingClientRect();
        const editorPct = ((e.clientX - rect.left) / rect.width) * 100;
        const editor = $('.md-editor');
        const preview = $('.md-preview');
        if (editor && preview && editorPct > 20 && editorPct < 80) {
          editor.style.flex = `0 0 ${editorPct}%`;
          preview.style.flex = `0 0 ${100 - editorPct}%`;
        }
      });
      document.addEventListener('mouseup', () => { resizing = false; });
    }

    // Sync scroll
    if (textarea && preview) {
      textarea.addEventListener('scroll', () => {
        const pct = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight || 1);
        preview.scrollTop = pct * (preview.scrollHeight - preview.clientHeight);
      });
    }
  }

  function extractTitle(content) {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim().substring(0, 50) : 'Sans titre';
  }

  function showSaved() {
    const el = $('#md-saved');
    if (el) {
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 1500);
    }
  }

  /* ── Init ── */
  async function init() {
    await loadDocuments();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
