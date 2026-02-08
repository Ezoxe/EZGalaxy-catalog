/* ============================================================
   Network Sim — ui.js
   Toast, logs, info panel, tooltip, email modal, sequence
   diagram, detail popups, progress bars, sidebar, shortcuts
   ============================================================ */

// ═══════════ TOAST NOTIFICATION SYSTEM ═══════════
function showToast(msg, type, title) {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = '<span class="toast-icon">' + (icons[type] || 'ℹ️') + '</span><div class="toast-content"><strong>' + (title || type.toUpperCase()) + '</strong><div class="toast-message">' + msg + '</div></div>';
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 4000);
}

// ═══════════ LOG SYSTEM ═══════════
function addLog(type, msg) {
  const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const labels = { info: 'INFO', success: 'SUCCESS', warning: 'WARNING', danger: 'DANGER', attack: 'ATTACK' };
  logs.push({ time, type, message: msg });
  const lc = document.getElementById('logContent');
  if (!lc) return;
  const e = document.createElement('div');
  e.className = 'log-entry';
  e.innerHTML = '<span class="log-time">' + time + '</span><span class="log-type ' + type + '">' + (labels[type] || type) + '</span><span class="log-message">' + msg + '</span>';
  lc.appendChild(e);
  lc.scrollTop = lc.scrollHeight;
  while (lc.children.length > 200) lc.removeChild(lc.firstChild);
}

function clearLogs() {
  logs = [];
  const lc = document.getElementById('logContent');
  if (lc) lc.innerHTML = '';
  addLog('info', 'Journal effacé');
}

function exportLogs() {
  const t = logs.map(l => '[' + l.time + '] ' + l.type.toUpperCase().padEnd(8) + ' ' + l.message).join('\n');
  const b = new Blob([t], { type: 'text/plain' });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u; a.download = 'network-sim-logs-' + new Date().toISOString().slice(0, 10) + '.txt';
  a.click(); URL.revokeObjectURL(u);
  addLog('success', 'Logs exportés');
}

// ═══════════ NODE INFO PANEL ═══════════
function showNodeInfo(node) {
  const panel = document.getElementById('infoPanel');
  if (!panel) return;
  document.getElementById('infoPanelTitle').textContent = node.config.icon + ' ' + node.name;

  let sc = 'var(--accent-green)', st = 'Actif';
  if (node.compromised) { sc = 'var(--accent-red)'; st = '⚠ Compromis'; }
  else if (node.attacked) { sc = 'var(--accent-red)'; st = 'Sous attaque'; }
  else if (node.intercepting) { sc = 'var(--accent-purple)'; st = 'Interception active'; }

  let html = '<div class="info-row"><span class="info-label">Type</span><span class="info-value">' + node.config.label + '</span></div>';
  html += '<div class="info-row"><span class="info-label">IP</span><span class="info-value" style="font-family:monospace">' + node.ip + '</span></div>';
  html += '<div class="info-row"><span class="info-label">MAC</span><span class="info-value" style="font-family:monospace;font-size:0.75rem">' + node.mac + '</span></div>';
  html += '<div class="info-row"><span class="info-label">Ports</span><span class="info-value">' + (node.ports.length ? node.ports.join(', ') : 'Aucun') + '</span></div>';
  html += '<div class="info-row"><span class="info-label">Statut</span><span class="info-value" style="color:' + sc + '">' + st + '</span></div>';

  if (node.type === 'mitm') {
    html += '<div class="info-row"><span class="info-label">Mode</span><span class="info-value" style="color:' + (node.intercepting ? 'var(--accent-red)' : 'var(--text-secondary)') + '">' + (node.intercepting ? 'Interception' : 'En attente') + '</span></div>';
  }
  if (node.type === 'firewall') {
    html += '<div class="info-row"><span class="info-label">Protection</span><span class="info-value" style="color:' + (activeDefenses.firewall ? 'var(--accent-green)' : 'var(--accent-red)') + '">' + (activeDefenses.firewall ? 'Activée' : 'Désactivée') + '</span></div>';
  }
  if (node.type === 'honeypot') {
    html += '<div class="info-row"><span class="info-label">Piège</span><span class="info-value" style="color:var(--accent-yellow)">Actif — attire les attaquants</span></div>';
  }
  if (node.type === 'siem') {
    html += '<div class="info-row"><span class="info-label">SIEM</span><span class="info-value" style="color:' + (activeDefenses.siem ? 'var(--accent-green)' : 'var(--text-secondary)') + '">' + (activeDefenses.siem ? 'Monitoring actif' : 'Inactif') + '</span></div>';
  }

  html += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)"><small style="color:var(--text-secondary)">Clic droit: supprimer<br>Shift+clic: connecter</small></div>';

  document.getElementById('infoPanelContent').innerHTML = html;
  panel.classList.add('visible');
}

function closeInfoPanel() {
  document.getElementById('infoPanel')?.classList.remove('visible');
}

// ═══════════ TOOLTIP ═══════════
function showTooltip(node, e) { showTooltipAtPosition(node, e.clientX, e.clientY); }

function showTooltipAtPosition(node, clientX, clientY) {
  const t = document.getElementById('tooltip');
  if (!t) return;
  t.querySelector('.tooltip-title').textContent = node.config.icon + ' ' + node.name;
  t.querySelector('.tooltip-text').textContent = node.config.label + ' — ' + node.ip;
  t.classList.add('visible');
  updateTooltipAtPosition(clientX, clientY);
}

function updateTooltipPosition(e) { updateTooltipAtPosition(e.clientX, e.clientY); }

function updateTooltipAtPosition(clientX, clientY) {
  const t = document.getElementById('tooltip');
  const container = document.getElementById('canvasContainer');
  if (!t || !container) return;
  const r = container.getBoundingClientRect();
  let left = clientX - r.left + 15, top = clientY - r.top + 15;
  if (left + 180 > r.width) left = clientX - r.left - 190;
  if (top + 60 > r.height) top = clientY - r.top - 70;
  t.style.left = left + 'px';
  t.style.top = top + 'px';
}

function hideTooltip() { document.getElementById('tooltip')?.classList.remove('visible'); }

// ═══════════ EMAIL PREVIEW (on MITM intercept) ═══════════
function showEmailPreview(packet, intercepted) {
  document.querySelectorAll('.email-preview').forEach(el => el.remove());
  const p = document.createElement('div');
  p.className = 'email-preview' + (intercepted ? ' intercepted' : '');
  p.innerHTML = '<div class="email-header">' + (intercepted ? 'EMAIL INTERCEPTÉ' : 'Email') + '</div>'
    + '<div style="font-size:0.8rem;margin-bottom:8px"><div><strong>De:</strong> ' + packet.data.from + '</div><div><strong>À:</strong> ' + packet.data.to + '</div></div>'
    + '<div class="email-subject">' + packet.data.subject + '</div>'
    + '<div class="email-body" style="background:' + (intercepted ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.3)') + '">'
    + (intercepted ? '<span style="color:var(--accent-red);font-weight:bold">Visible par l\'attaquant:</span><br><br>' : '')
    + packet.data.body.replace(/\n/g, '<br>') + '</div>'
    + (packet.data.encrypted ? '<div style="margin-top:10px;color:var(--accent-cyan);font-size:0.75rem">🔒 Chiffré - protégé</div>' : '');
  const rect = document.getElementById('canvasContainer').getBoundingClientRect();
  const screenPx = (packet.x - viewportX) * zoomLevel;
  const screenPy = (packet.y - viewportY) * zoomLevel;
  p.style.left = Math.min(screenPx + 40, rect.width - 300) + 'px';
  p.style.top = Math.max(20, screenPy - 80) + 'px';
  document.getElementById('canvasContainer').appendChild(p);
  setTimeout(() => p.remove(), 5000);
}

// ═══════════ DETAIL POPUP ═══════════
function showDetailPopup(node, title, data, status) {
  const existing = document.querySelector('.detail-popup[data-node="' + node.id + '"]');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.className = 'detail-popup ' + status;
  popup.dataset.node = node.id;

  let inner = '<div class="detail-popup-header"><h3>' + title + '</h3></div><div class="detail-popup-content">';
  Object.entries(data).forEach(([k, v]) => {
    inner += '<div class="detail-row"><span class="detail-label">' + k + '</span><span class="detail-value">' + v + '</span></div>';
  });
  inner += '</div><button class="detail-popup-close" onclick="this.parentElement.remove()">×</button>';
  popup.innerHTML = inner;

  const rect = document.getElementById('canvasContainer').getBoundingClientRect();
  popup.style.left = Math.min((node.x - viewportX) * zoomLevel + 60, rect.width - 280) + 'px';
  popup.style.top = Math.max(10, (node.y - viewportY) * zoomLevel - 40) + 'px';
  document.getElementById('canvasContainer').appendChild(popup);
  setTimeout(() => popup.remove(), 8000);
}

// ═══════════ PROGRESS BAR (over nodes) ═══════════
function showProgressBar(node, label, progress) {
  const bar = document.createElement('div');
  bar.className = 'progress-bar-container';
  bar.innerHTML = '<div class="progress-bar-label">' + label + '</div><div class="progress-bar"><div class="progress-bar-fill" style="width:' + progress + '%"></div></div>';
  const rect = document.getElementById('canvasContainer').getBoundingClientRect();
  bar.style.left = ((node.x - viewportX) * zoomLevel - 40) + 'px';
  bar.style.top = ((node.y - viewportY) * zoomLevel + 35) + 'px';
  document.getElementById('canvasContainer').appendChild(bar);
  return bar;
}

function updateProgressBar(bar, progress) {
  if (!bar) return;
  const fill = bar.querySelector('.progress-bar-fill');
  if (fill) fill.style.width = progress + '%';
}

function removeProgressBar(bar) {
  if (bar) bar.remove();
}

// ═══════════ SIDEBAR SEARCH & SECTIONS ═══════════
var collapsedSections = {};

function toggleSection(sectionName) {
  const section = document.querySelector('.sidebar-section[data-section="' + sectionName + '"]');
  if (!section) return;
  collapsedSections[sectionName] = !collapsedSections[sectionName];
  section.classList.toggle('collapsed', collapsedSections[sectionName]);
}

function filterSidebar(query) {
  const q = query.toLowerCase().trim();
  const clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';

  const sections = document.querySelectorAll('.sidebar-section.collapsible');
  if (!q) {
    document.querySelectorAll('.palette-item, .attack-btn, .defense-btn, .action-btn-small').forEach(el => el.classList.remove('search-hidden'));
    sections.forEach(s => s.classList.remove('search-hidden'));
    return;
  }
  sections.forEach(section => {
    let vis = false;
    section.querySelectorAll('.palette-item, .attack-btn, .defense-btn, .action-btn-small').forEach(el => {
      const txt = ((el.getAttribute('data-search') || '') + ' ' + el.textContent).toLowerCase();
      const match = txt.includes(q);
      el.classList.toggle('search-hidden', !match);
      if (match) vis = true;
    });
    section.classList.toggle('search-hidden', !vis);
    if (vis && section.classList.contains('collapsed')) {
      section.classList.remove('collapsed');
      const name = section.getAttribute('data-section');
      if (name) collapsedSections[name] = false;
    }
  });
}

function clearSearch() {
  const inp = document.getElementById('sidebarSearch');
  if (inp) { inp.value = ''; filterSidebar(''); inp.focus(); }
}

// ═══════════ EMAIL MODAL ═══════════
function openEmailModal(source, target) {
  emailPendingSource = source;
  emailPendingTarget = target;
  document.getElementById('emailFrom').value = source.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@entreprise.com';
  document.getElementById('emailTo').value = target.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@entreprise.com';
  document.getElementById('emailSubject').value = '';
  document.getElementById('emailBody').value = '';
  document.getElementById('emailModal').classList.add('visible');
}

function closeEmailModal() {
  document.getElementById('emailModal')?.classList.remove('visible');
  emailPendingSource = null;
  emailPendingTarget = null;
}

function fillDefaultEmail() {
  document.getElementById('emailSubject').value = 'Données confidentielles';
  document.getElementById('emailBody').value = 'Bonjour,\n\nVoici les informations demandées:\nMot de passe: Sup3rS3cr3t!\nCode PIN: 4521\n\nCordialement';
}

function sendComposedEmail() {
  if (!emailPendingSource || !emailPendingTarget) return;
  const from = document.getElementById('emailFrom').value || 'user@mail.com';
  const to = document.getElementById('emailTo').value || 'dest@mail.com';
  const subject = document.getElementById('emailSubject').value || 'Sans objet';
  const body = document.getElementById('emailBody').value || '(Message vide)';
  const src = emailPendingSource, tgt = emailPendingTarget;
  closeEmailModal();

  const mailServer = nodes.find(n => n.type === 'server');
  if (mailServer && mailServer !== src && mailServer !== tgt) {
    addSequenceMessage(src, mailServer, 'SMTP: ' + subject, 'request');
    createPacket(src, mailServer, activeDefenses.encryption ? 'encrypted' : 'email', {
      from, to, subject, body, encrypted: activeDefenses.encryption, finalDest: tgt, viaServer: true
    });
    addLog('info', '✉️ Email envoyé via ' + mailServer.name);
  } else {
    addSequenceMessage(src, tgt, 'SMTP: ' + subject, 'request');
    createPacket(src, tgt, activeDefenses.encryption ? 'encrypted' : 'email', {
      from, to, subject, body, encrypted: activeDefenses.encryption
    });
    addLog('info', activeDefenses.encryption ? '🔒 Email chiffré envoyé' : '✉️ Email envoyé');
  }
  if (!activeDefenses.encryption && activeAttacks.mitm) {
    showToast('MITM actif - email sera intercepté!', 'warning');
  }
}

// ═══════════ SEQUENCE DIAGRAM ═══════════
function addSequenceMessage(from, to, label, type) {
  sequenceMessages.push({
    from: from.name, fromIp: from.ip,
    to: to.name, toIp: to.ip,
    label, type: type || 'request',
    timestamp: Date.now()
  });
  updateSequenceDiagram();
  updateStatusBar();
}

function toggleSequencePanel() {
  document.getElementById('sequencePanel')?.classList.toggle('visible');
}

function updateSequenceDiagram() {
  const content = document.getElementById('sequencePanelContent');
  if (!content) return;
  if (sequenceMessages.length === 0) {
    content.innerHTML = '<div class="sequence-empty"><div class="sequence-empty-icon">📨</div><p>Aucun message échangé</p><p style="font-size:0.75rem;margin-top:8px;">Effectuez des actions pour voir les échanges</p></div>';
    return;
  }

  const actorMap = new Map();
  sequenceMessages.forEach(m => {
    if (!actorMap.has(m.from)) actorMap.set(m.from, m.fromIp);
    if (!actorMap.has(m.to)) actorMap.set(m.to, m.toIp);
  });
  const actorList = Array.from(actorMap.keys());
  const actorCount = actorList.length;
  const rowH = 55, bodyH = sequenceMessages.length * rowH + 40;
  const t0 = sequenceMessages[0].timestamp;

  let html = '<div class="sequence-diagram"><div class="sequence-header">';
  actorList.forEach(a => {
    const ip = actorMap.get(a);
    html += '<div class="sequence-actor"><div class="sequence-actor-box" title="' + a + ' (' + ip + ')"><div class="actor-name">' + a + '</div><div class="actor-ip">' + ip + '</div></div></div>';
  });
  html += '</div><div class="sequence-body" style="height:' + bodyH + 'px;"><div class="sequence-lifelines">';
  actorList.forEach(() => { html += '<div class="sequence-lifeline"><div class="sequence-lifeline-line"></div></div>'; });
  html += '</div><div class="sequence-messages">';

  sequenceMessages.forEach((msg, i) => {
    const fi = actorList.indexOf(msg.from), ti = actorList.indexOf(msg.to);
    const isLR = fi < ti, isResp = msg.type === 'response', isAtk = msg.type === 'attack';
    const mn = Math.min(fi, ti), mx = Math.max(fi, ti);
    const cw = 100 / actorCount;
    const lp = mn * cw + cw / 2, rp = mx * cw + cw / 2, aw = rp - lp;
    const at = isAtk ? 'attack' : (isResp ? 'response' : 'request');
    const rel = msg.timestamp - t0;
    const ts = rel < 1000 ? rel + 'ms' : (rel / 1000).toFixed(1) + 's';

    html += '<div class="sequence-message-row"><span class="sequence-timestamp" title="T+' + ts + '">' + (i + 1) + '</span><span class="sequence-time">+' + ts + '</span><div class="sequence-arrow-container" style="left:' + lp + '%;width:' + aw + '%;">';
    if (!isLR) html += '<div class="sequence-arrow-head left ' + at + '"></div>';
    html += '<div class="sequence-arrow-line ' + at + '"><div class="sequence-message-label ' + at + '">' + msg.label + '</div></div>';
    if (isLR) html += '<div class="sequence-arrow-head right ' + at + '"></div>';
    html += '</div></div>';
  });
  html += '</div></div></div>';
  content.innerHTML = html;
  content.scrollTop = content.scrollHeight;
}

function clearSequenceMessages() {
  sequenceMessages = [];
  updateSequenceDiagram();
  updateStatusBar();
  showToast('Diagramme effacé', 'info');
}

function exportSequenceDiagram() {
  if (sequenceMessages.length === 0) { showToast('Aucun message à exporter', 'warning'); return; }
  let text = '=== DIAGRAMME DE SÉQUENCE ===\nGénéré le: ' + new Date().toLocaleString('fr-FR') + '\n\n';
  sequenceMessages.forEach((m, i) => {
    const arrow = m.type === 'response' ? '<--' : '-->';
    const prefix = m.type === 'attack' ? '[ATTACK] ' : '';
    text += (i + 1) + '. ' + prefix + m.from + ' ' + arrow + ' ' + m.to + ': ' + m.label + '\n';
  });
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = 'sequence-diagram-' + new Date().toISOString().slice(0, 10) + '.txt';
  a.click(); URL.revokeObjectURL(url);
  showToast('Diagramme exporté', 'success');
}

// ═══════════ STATUS BAR ═══════════
function updateStatusBar() {
  const el = id => document.getElementById(id);
  const nc = el('nodeCount'), cc = el('connectionCount'), pc = el('packetCount'), mc = el('messageCount');
  if (nc) nc.textContent = nodes.length;
  if (cc) cc.textContent = connections.length;
  if (pc) pc.textContent = packetCounter;
  if (mc) mc.textContent = sequenceMessages.length;

  const vpnS = el('vpnStatus'), vpnT = el('vpnTunnelCount');
  if (vpnS && vpnT) {
    if (vpnTunnels.length > 0) { vpnS.style.display = 'flex'; vpnT.textContent = vpnTunnels.length; }
    else vpnS.style.display = 'none';
  }
}

// ═══════════ TUTORIAL ═══════════
function closeTutorial() {
  document.getElementById('tutorialPanel')?.classList.remove('visible');
  try { localStorage.setItem('networkSimTutorialSeen', 'true'); } catch (e) {}
}

// ═══════════ KEYBOARD SHORTCUTS MODAL ═══════════
function showShortcuts() {
  document.getElementById('shortcutsModal')?.classList.add('visible');
}
function hideShortcuts() {
  document.getElementById('shortcutsModal')?.classList.remove('visible');
}
