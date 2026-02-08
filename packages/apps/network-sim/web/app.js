/* ============================================================
   Network Sim — app.js
   Main entry point: init, animate loop, canvas events,
   action mode, buttons, tabs, keyboard shortcuts
   ============================================================ */

// ══════════ CANVAS CONTEXT (set by init — vars in renderer.js) ══════════
// canvas & ctx declared in renderer.js

// ══════════ ANIMATION LOOP ══════════
function animate() {
  if (!canvas || !ctx) { requestAnimationFrame(animate); return; }
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;

  ctx.save();
  ctx.scale(zoomLevel, zoomLevel);
  ctx.translate(-viewportX, -viewportY);

  drawGrid(ctx);
  drawZones(ctx);
  drawConnections(ctx);
  drawVPNTunnels(ctx);
  if (connectingFrom) drawConnectingLine(ctx);
  drawPacketTrails(ctx);
  drawPackets(ctx);
  drawParticles(ctx);

  ctx.restore();
  drawZoomIndicator(ctx);
  if (nodes.length > 12) drawMinimap(ctx);
  updateNodeElements();
  updatePackets();

  requestAnimationFrame(animate);
}

// ══════════ RESIZE ══════════
function resizeCanvas() {
  if (!canvas) return;
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}

// ══════════ TABS ══════════
// currentTab declared in network.js

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = tab;

      document.getElementById('canvasContainer').style.display = tab === 'simulation' ? 'block' : 'none';
      document.getElementById('sidebar').style.display = tab === 'simulation' ? 'flex' : 'none';
      document.getElementById('learnPanel')?.classList.toggle('visible', tab === 'learn');
      document.getElementById('scenariosPanel')?.classList.toggle('visible', tab === 'scenarios');

      if (tab === 'learn') openLearnPanel();
    });
  });
}

// ══════════ DRAG & DROP FROM PALETTE ══════════
function setupDragAndDrop() {
  document.querySelectorAll('.palette-item').forEach(item => {
    item.setAttribute('draggable', 'true');
    item.addEventListener('dragstart', e => {
      e.dataTransfer.setData('nodeType', item.getAttribute('data-type'));
      e.dataTransfer.effectAllowed = 'copy';
    });
  });

  const container = document.getElementById('canvasContainer');
  container.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  container.addEventListener('drop', e => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nodeType');
    if (!type) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel + viewportX;
    const y = (e.clientY - rect.top) / zoomLevel + viewportY;
    createNode(type, x, y);
    addLog('info', '➕ ' + (nodeTypes[type]?.label || type) + ' ajouté');
  });
}

// ══════════ CANVAS MOUSE EVENTS ══════════
var isDragging = false, dragNode = null, lastMouseX = 0, lastMouseY = 0;
// hoveredNode, connectingFrom, isPanning declared in network.js

function setupCanvasEvents() {
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('contextmenu', onContextMenu);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('dblclick', onDoubleClick);
}

function worldCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) / zoomLevel + viewportX, y: (e.clientY - rect.top) / zoomLevel + viewportY };
}

function nodeAt(wx, wy) {
  return nodes.find(n => Math.hypot(n.x - wx, n.y - wy) < 30);
}

function onMouseDown(e) {
  const { x, y } = worldCoords(e);
  const node = nodeAt(x, y);

  // Action mode click
  if (actionMode) {
    if (node) handleActionModeClick(node);
    return;
  }

  // Shift+click = connect/cable
  if (e.shiftKey && node) {
    if (connectingFrom && connectingFrom !== node) {
      createConnection(connectingFrom, node);
      addLog('info', '🔗 Connexion: ' + connectingFrom.name + ' ↔ ' + node.name);
      connectingFrom = null;
    } else {
      connectingFrom = node;
      addLog('info', '🔗 Sélecting source: ' + node.name);
    }
    return;
  }

  // Cable mode
  if (cableMode && node) {
    if (connectingFrom && connectingFrom !== node) {
      createConnection(connectingFrom, node);
      addLog('info', '🔗 Câble: ' + connectingFrom.name + ' ↔ ' + node.name);
      connectingFrom = null;
    } else {
      connectingFrom = node;
    }
    return;
  }

  // Node drag
  if (node) {
    dragNode = node;
    isDragging = true;
    showNodeInfo(node);
    return;
  }

  // Canvas pan
  isPanning = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  canvas.style.cursor = 'grabbing';
}

function onMouseMove(e) {
  const { x, y } = worldCoords(e);

  if (isDragging && dragNode) {
    dragNode.x = x;
    dragNode.y = y;
    return;
  }

  if (isPanning) {
    viewportX -= (e.clientX - lastMouseX) / zoomLevel;
    viewportY -= (e.clientY - lastMouseY) / zoomLevel;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    return;
  }

  // Tooltip
  const node = nodeAt(x, y);
  if (node && node !== hoveredNode) {
    hoveredNode = node;
    showTooltip(node, e);
  } else if (node && hoveredNode) {
    updateTooltipPosition(e);
  } else if (!node && hoveredNode) {
    hoveredNode = null;
    hideTooltip();
  }

  // Cable mode preview line
  if (cableMode && connectingFrom) {
    connectingEnd = { x, y };
  }
}

var connectingEnd = null;

function onMouseUp() {
  isDragging = false;
  dragNode = null;
  isPanning = false;
  canvas.style.cursor = '';
}

function onContextMenu(e) {
  e.preventDefault();
  const { x, y } = worldCoords(e);
  const node = nodeAt(x, y);
  if (node) {
    deleteNode(node);
    addLog('info', '🗑️ ' + node.name + ' supprimé');
  }
}

function onWheel(e) {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) / zoomLevel + viewportX;
  const my = (e.clientY - rect.top) / zoomLevel + viewportY;
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.min(3, Math.max(0.15, zoomLevel * delta));
  viewportX = mx - (e.clientX - rect.left) / newZoom;
  viewportY = my - (e.clientY - rect.top) / newZoom;
  zoomLevel = newZoom;
}

function onDoubleClick(e) {
  const { x, y } = worldCoords(e);
  const node = nodeAt(x, y);
  if (node) showNodeInfo(node);
}

// ══════════ CABLE MODE ══════════
// cableMode declared in network.js

function toggleCableMode() {
  cableMode = !cableMode;
  connectingFrom = null;
  connectingEnd = null;
  document.getElementById('cableModeBtn')?.classList.toggle('active', cableMode);
  document.getElementById('cableModeIndicator')?.classList.toggle('visible', cableMode);
  if (cableMode) addLog('info', '🔗 Mode câblage activé — cliquez 2 nœuds');
  else addLog('info', '🔗 Mode câblage désactivé');
}

// ══════════ ACTION MODE (attaques ciblées) ══════════
// actionMode declared in network.js
var actionParams = {};

function startActionMode(action, icon, label) {
  actionMode = action;
  canvas.style.cursor = 'crosshair';
  document.getElementById('actionModeIndicator').style.display = 'flex';
  document.getElementById('actionModeText').textContent = icon + ' Cliquez sur la cible: ' + label;
  addLog('info', icon + ' Sélectionnez la cible pour ' + label);
}

function cancelActionMode() {
  actionMode = null;
  canvas.style.cursor = '';
  document.getElementById('actionModeIndicator').style.display = 'none';
}

function handleActionModeClick(node) {
  const action = actionMode;
  cancelActionMode();
  executeAction(action, node);
}

function executeAction(action, target) {
  const attacker = nodes.find(n => n.type === 'attacker');

  switch (action) {
    case 'ddos':
      if (!attacker) { showToast('DDoS nécessite un Attaquant', 'warning'); return; }
      activeAttacks.ddos = true;
      document.querySelector('[data-attack="ddos"]')?.classList.add('active');
      document.getElementById('attackStatus').style.display = 'flex';
      addLog('attack', '💥 DDoS sur ' + target.name);
      target.attacked = true;
      activeAttacks.ddosInterval = setInterval(() => {
        if (activeAttacks.ddos) {
          for (let i = 0; i < 3; i++) createPacket(attacker, target, 'ddos');
          target.attacked = true;
        }
      }, 300);
      break;

    case 'mitm':
      const mitmNode = nodes.find(n => n.type === 'mitm');
      if (!mitmNode) { showToast('MITM nécessite un nœud MITM', 'warning'); return; }
      activeAttacks.mitm = true;
      mitmNode.intercepting = true;
      document.querySelector('[data-attack="mitm"]')?.classList.add('active');
      document.getElementById('attackStatus').style.display = 'flex';
      addLog('attack', '🕵️ MITM activé sur ' + mitmNode.name);
      showToast('MITM: ' + mitmNode.name + ' intercepte le trafic!', 'error', '🕵️ MITM');
      break;

    case 'portscan':
      if (!attacker) { showToast('Port Scan nécessite un Attaquant', 'warning'); return; }
      activeAttacks.portscan = true;
      document.querySelector('[data-attack="portscan"]')?.classList.add('active');
      document.getElementById('attackStatus').style.display = 'flex';
      addLog('attack', '🔍 Port Scan sur ' + target.name);
      const ports = [21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 993, 995, 1433, 3306, 3389, 5432, 8080, 8443];
      let pi = 0;
      const progressBar = showProgressBar(target, 'Scan', 0);
      activeAttacks.portscanInterval = setInterval(() => {
        if (activeAttacks.portscan && pi < ports.length) {
          createPacket(attacker, target, 'syn', { port: ports[pi] });
          const isOpen = target.ports.includes(ports[pi]);
          addLog(isOpen ? 'danger' : 'info', '🔍 Port ' + ports[pi] + (isOpen ? ' OUVERT' : ' fermé'));
          pi++;
          updateProgressBar(progressBar, Math.round((pi / ports.length) * 100));
        } else {
          stopPortScan();
          removeProgressBar(progressBar);
          addLog('success', '🔍 Scan terminé - ' + target.ports.length + ' ports ouverts');
        }
      }, 200);
      break;

    case 'ransomware':
      if (!attacker) { showToast('Ransomware nécessite un Attaquant', 'warning'); return; }
      executeRansomwareAttack(attacker, target);
      break;

    case 'sqli':
      if (!attacker) { showToast('SQLi nécessite un Attaquant', 'warning'); return; }
      executeSQLInjection(attacker, target);
      break;

    case 'xss':
      if (!attacker) { showToast('XSS nécessite un Attaquant', 'warning'); return; }
      executeXSS(attacker, target);
      break;

    case 'zeroday':
      if (!attacker) { showToast('Zero-Day nécessite un Attaquant', 'warning'); return; }
      executeZeroDay(attacker, target);
      break;

    case 'credstuffing':
      if (!attacker) { showToast('Credential Stuffing nécessite un Attaquant', 'warning'); return; }
      executeCredentialStuffing(attacker, target);
      break;

    case 'eviltwin':
      if (!attacker) { showToast('Evil Twin nécessite un Attaquant', 'warning'); return; }
      executeEvilTwin(attacker, target);
      break;

    case 'privesc':
      if (!attacker) { showToast('PrivEsc nécessite un Attaquant', 'warning'); return; }
      executePrivilegeEscalation(attacker, target);
      break;

    case 'lateral':
      if (!attacker) { showToast('Mouvement Latéral nécessite un Attaquant', 'warning'); return; }
      executeLateralMovement(attacker, target);
      break;

    case 'socialeng':
      if (!attacker) { showToast('Social Engineering nécessite un Attaquant', 'warning'); return; }
      executeSocialEngineering(attacker, target);
      break;

    case 'vpn':
      // VPN tunnel creation
      if (!vpnFirstNode) {
        vpnFirstNode = target;
        startActionMode('vpn', '🔐', 'VPN - sélectionnez le second nœud');
        addLog('info', '🔐 VPN: Premier nœud = ' + target.name);
        return;
      }
      if (vpnFirstNode === target) { vpnFirstNode = null; return; }
      const path = findPath(vpnFirstNode, target);
      if (path.length === 0) { showToast('Pas de chemin VPN trouvé', 'warning'); vpnFirstNode = null; return; }
      vpnTunnels.push({ id: generateId(), client: vpnFirstNode, gateway: target, path, color: '#15803d' });
      activeDefenses.vpn = true;
      document.querySelector('[data-defense="vpn"]')?.classList.add('active');
      addLog('success', '🔐 Tunnel VPN: ' + vpnFirstNode.name + ' ↔ ' + target.name);
      showToast('Tunnel VPN établi!', 'success', '🔐 VPN');
      vpnFirstNode = null;
      break;

    // ── Network actions (not attacks) ──
    case 'ping':
      if (!target) return;
      addSequenceMessage(actionParams.source, target, 'ICMP Echo Request', 'request');
      createPacket(actionParams.source, target, 'ping');
      addLog('info', '🏓 Ping ' + actionParams.source.name + ' → ' + target.name);
      break;

    case 'traceroute':
      if (!target) return;
      addSequenceMessage(actionParams.source, target, 'Traceroute', 'request');
      createPacket(actionParams.source, target, 'traceroute');
      addLog('info', '🔎 Traceroute ' + actionParams.source.name + ' → ' + target.name);
      break;

    case 'email':
      openEmailModal(actionParams.source, target);
      break;

    case 'http':
      if (!target) return;
      const httpType = activeDefenses.encryption ? 'https' : 'http';
      addSequenceMessage(actionParams.source, target, httpType.toUpperCase() + ' GET /', 'request');
      createPacket(actionParams.source, target, httpType);
      addLog('info', '🌐 ' + httpType.toUpperCase() + ' ' + actionParams.source.name + ' → ' + target.name);
      break;

    case 'dns':
      if (!target) return;
      addSequenceMessage(actionParams.source, target, 'DNS Query A www.example.com', 'request');
      createPacket(actionParams.source, target, 'dnsQuery', {
        domain: 'www.example.com',
        finalTarget: target,
        originalSrc: actionParams.source,
        dnssecProtected: activeDefenses.dnssec
      });
      addLog('info', '📡 DNS Query ' + actionParams.source.name + ' → ' + target.name);
      break;

    case 'ssh':
      if (!target) return;
      addSequenceMessage(actionParams.source, target, 'SSH Connect', 'request');
      createPacket(actionParams.source, target, 'ssh');
      addLog('info', '🔒 SSH ' + actionParams.source.name + ' → ' + target.name);
      break;
  }
}

var vpnFirstNode = null;

// ══════════ QUICK ACTIONS (source picker → target picker) ══════════
function sendPing() { pickSourceThen('ping', '🏓', 'Ping'); }
function sendTraceroute() { pickSourceThen('traceroute', '🔎', 'Traceroute'); }
function sendEmail() { pickSourceThen('email', '✉️', 'Email'); }
function sendHTTP() { pickSourceThen('http', '🌐', 'HTTP'); }
function sendDNS() { pickSourceThen('dns', '📡', 'DNS'); }
function sendSSH() { pickSourceThen('ssh', '🔒', 'SSH'); }

function pickSourceThen(action, icon, label) {
  // If there's exactly one computer-like node, use it as source
  const computers = nodes.filter(n => ['computer', 'phone', 'enterprise'].includes(n.type));
  if (computers.length === 1) {
    actionParams = { source: computers[0] };
    startActionMode(action, icon, label + ' — cliquez la destination');
  } else {
    // Need to pick source first
    actionParams = {};
    const origAction = action;
    actionMode = '_pickSource_' + action;
    canvas.style.cursor = 'crosshair';
    document.getElementById('actionModeIndicator').style.display = 'flex';
    document.getElementById('actionModeText').textContent = icon + ' ' + label + ': sélectionnez la SOURCE';
    // Override handleActionModeClick for source pick
    const origHandler = handleActionModeClick;
    handleActionModeClick = function (node) {
      cancelActionMode();
      handleActionModeClick = origHandler;
      actionParams = { source: node };
      startActionMode(origAction, icon, label + ' depuis ' + node.name + ' — cliquez la destination');
    };
  }
}

// ══════════ SETUP BUTTONS ══════════
function setupButtons() {
  // Attacks
  const attackMap = {
    ddos: startDDoSAttack, mitm: startMITMAttack, portscan: startPortScan,
    dnsspoof: startDNSSpoof, arp: startARPPoisoning, bruteforce: startBruteForce,
    synflood: startSYNFlood, phishing: startPhishing, ransomware: startRansomware,
    sqli: startSQLInjection, xss: startXSS, zeroday: startZeroDay,
    credstuffing: startCredentialStuffing,
    eviltwin: startEvilTwin, privesc: startPrivilegeEscalation,
    lateral: startLateralMovement, socialeng: startSocialEngineering
  };
  Object.entries(attackMap).forEach(([k, fn]) => {
    document.querySelector('[data-attack="' + k + '"]')?.addEventListener('click', fn);
  });

  // Defenses
  const defenseMap = {
    firewall: toggleFirewall, ids: toggleIDS, encryption: toggleEncryption,
    vpn: toggleVPN, ratelimit: toggleRateLimiting, '2fa': toggle2FA,
    antimalware: toggleAntiMalware, waf: toggleWAF, patchmgmt: togglePatchMgmt,
    accountlockout: toggleAccountLockout,
    dnssec: toggleDNSSEC, syncookies: toggleSYNCookies, dai: toggleDAI,
    segmentation: toggleSegmentation, siem: toggleSIEMRules, usertraining: toggleUserTraining
  };
  Object.entries(defenseMap).forEach(([k, fn]) => {
    document.querySelector('[data-defense="' + k + '"]')?.addEventListener('click', fn);
  });

  // Network actions
  document.querySelector('[data-action="ping"]')?.addEventListener('click', sendPing);
  document.querySelector('[data-action="traceroute"]')?.addEventListener('click', sendTraceroute);
  document.querySelector('[data-action="sendemail"]')?.addEventListener('click', sendEmail);
  document.querySelector('[data-action="http"]')?.addEventListener('click', sendHTTP);
  document.querySelector('[data-action="dns"]')?.addEventListener('click', sendDNS);
  document.querySelector('[data-action="ssh"]')?.addEventListener('click', sendSSH);

  // Cable mode
  document.getElementById('cableModeBtn')?.addEventListener('click', toggleCableMode);

  // Stop all attacks
  document.getElementById('stopAllAttacks')?.addEventListener('click', stopAllAttacks);
  
  // All defenses
  document.getElementById('activateAllDefenses')?.addEventListener('click', activateAllDefenses);
  document.getElementById('deactivateAllDefenses')?.addEventListener('click', deactivateAllDefenses);
}

// ══════════ KEYBOARD SHORTCUTS ══════════
function setupKeyboard() {
  document.addEventListener('keydown', e => {
    // Escape → cancel action mode / close panels
    if (e.key === 'Escape') {
      if (actionMode) cancelActionMode();
      else if (cableMode) toggleCableMode();
      else { closeInfoPanel(); hideShortcuts(); }
    }
    // Delete selected (not focused on input)
    if (e.key === 'Delete' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      // Could implement node selection later
    }
    // Ctrl+S → save topology
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveTopology(); }
    // ? → shortcuts
    if (e.key === '?') showShortcuts();
    // R → reset view
    if (e.key === 'r' && !e.ctrlKey && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      viewportX = 0; viewportY = 0; zoomLevel = 1;
    }
    // + / - zoom
    if (e.key === '+' || e.key === '=') { zoomLevel = Math.min(3, zoomLevel * 1.15); }
    if (e.key === '-') { zoomLevel = Math.max(0.15, zoomLevel / 1.15); }
  });
}

// ══════════ INIT ══════════
function init() {
  canvas = document.getElementById('networkCanvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  setupTabs();
  setupDragAndDrop();
  setupCanvasEvents();
  setupButtons();
  setupKeyboard();
  initMobile();

  // Sidebar search
  const searchInput = document.getElementById('sidebarSearch');
  if (searchInput) searchInput.addEventListener('input', e => filterSidebar(e.target.value));

  // Scenario buttons (in scenarios panel)
  document.querySelectorAll('[data-scenario]').forEach(btn => {
    btn.addEventListener('click', () => loadScenario(btn.getAttribute('data-scenario')));
  });

  // Save/load
  document.getElementById('saveTopologyBtn')?.addEventListener('click', saveTopology);
  document.getElementById('loadTopologyBtn')?.addEventListener('click', () => {
    document.getElementById('loadTopologyInput')?.click();
  });
  document.getElementById('loadTopologyInput')?.addEventListener('change', e => {
    if (e.target.files[0]) loadTopologyFromFile(e.target.files[0]);
  });

  // Log controls
  document.getElementById('clearLogsBtn')?.addEventListener('click', clearLogs);
  document.getElementById('exportLogsBtn')?.addEventListener('click', exportLogs);

  // Sequence controls
  document.getElementById('toggleSequenceBtn')?.addEventListener('click', toggleSequencePanel);
  document.getElementById('clearSequenceBtn')?.addEventListener('click', clearSequenceMessages);
  document.getElementById('exportSequenceBtn')?.addEventListener('click', exportSequenceDiagram);

  // Sidebar backdrop
  document.getElementById('sidebarBackdrop')?.addEventListener('click', closeSidebar);

  // Tutorial
  const tut = document.getElementById('tutorialPanel');
  try {
    if (!localStorage.getItem('networkSimTutorialSeen') && tut) tut.classList.add('visible');
  } catch (e) { if (tut) tut.classList.add('visible'); }

  // Start with MITM scenario
  loadScenario('mitm');
  addLog('success', '🚀 Network Simulator initialisé');
  updateStatusBar();
  animate();
}

window.addEventListener('DOMContentLoaded', init);
