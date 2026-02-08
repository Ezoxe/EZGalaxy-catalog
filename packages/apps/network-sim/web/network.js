/* ============================================================
   Network Sim — network.js
   Core data structures, pathfinding (Dijkstra), packet system
   ============================================================ */

// ── Global State ──
let nodes = [];
let connections = [];
let packets = [];
let zones = [];
let vpnTunnels = [];
let selectedNode = null;
let connectingFrom = null;
let draggedNode = null;
let dragOffset = { x: 0, y: 0 };
let hoveredNode = null;
let packetCounter = 0;
let currentTab = 'simulation';

// Viewport
let viewportX = 0;
let viewportY = 0;
let zoomLevel = 1;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartViewportX = 0;
let panStartViewportY = 0;

// Action mode
let actionMode = null;
let actionSource = null;
let actionTarget = null;

// Active attacks & defenses
let activeAttacks = {
  ddos: false, mitm: false, portscan: false, dnsspoof: false, arp: false,
  bruteforce: false, synflood: false, phishing: false, ransomware: false,
  sqli: false, xss: false, zeroday: false, credstuffing: false,
  eviltwin: false, privesc: false, lateral: false, socialeng: false
};
let activeDefenses = {
  firewall: false, ids: false, encryption: false, vpn: false, ratelimit: false,
  '2fa': false, antimalware: false, waf: false, patchmgmt: false,
  accountlockout: false, dnssec: false, syncookies: false, dai: false,
  siem: false, usertraining: false, segmentation: false
};

// Cable mode
let cableMode = false;
let cableFirstNode = null;

// Logs & sequence
let logs = [];
let animationStarted = false;
let sequenceMessages = [];
let emailPendingSource = null;
let emailPendingTarget = null;

// Undo stack
let undoStack = [];
let redoStack = [];

// ─────────── Unique ID Generator ───────────
let _idCounter = 0;
function generateId() {
  return Date.now().toString(36) + '-' + (++_idCounter).toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

// ─────────── Node Types (17 + 5 new) ───────────
const nodeTypes = {
  computer:     { icon: '💻', label: 'PC',             color: '#3b82f6', ports: [22, 80, 443, 3389] },
  server:       { icon: '🖥️', label: 'Serveur',        color: '#22c55e', ports: [22, 80, 443, 21, 25, 3306] },
  router:       { icon: '📡', label: 'Routeur',         color: '#eab308', ports: [23, 161] },
  switch:       { icon: '🔀', label: 'Switch',          color: '#06b6d4', ports: [] },
  firewall:     { icon: '🛡️', label: 'Firewall',       color: '#a855f7', ports: [443] },
  dns:          { icon: '📖', label: 'DNS',             color: '#f97316', ports: [53] },
  attacker:     { icon: '👤', label: 'Attaquant',       color: '#ef4444', ports: [] },
  mitm:         { icon: '🕵️', label: 'MITM',           color: '#dc2626', ports: [] },
  internet:     { icon: '🌐', label: 'Internet',        color: '#64748b', ports: [80, 443] },
  cloud:        { icon: '☁️', label: 'Cloud',           color: '#38bdf8', ports: [443, 8443] },
  enterprise:   { icon: '🏢', label: 'Entreprise',      color: '#f59e0b', ports: [80, 443, 25] },
  phone:        { icon: '📱', label: 'Téléphone',       color: '#ec4899', ports: [443, 5060] },
  iot:          { icon: '📟', label: 'IoT',             color: '#84cc16', ports: [80, 8080, 1883] },
  printer:      { icon: '🖨️', label: 'Imprimante',     color: '#94a3b8', ports: [9100, 631] },
  database:     { icon: '🗃️', label: 'Database',       color: '#1e40af', ports: [3306, 5432, 1433] },
  loadbalancer: { icon: '⚖️', label: 'Load Balancer',  color: '#7c3aed', ports: [80, 443] },
  vpngateway:   { icon: '🔐', label: 'VPN Gateway',    color: '#15803d', ports: [443, 1194, 500] },
  // New equipment types
  honeypot:     { icon: '🍯', label: 'Honeypot',        color: '#d97706', ports: [22, 80, 443, 3306, 8080] },
  proxy:        { icon: '🔄', label: 'Proxy',           color: '#0891b2', ports: [3128, 8080, 443] },
  siem:         { icon: '📊', label: 'SIEM',            color: '#7e22ce', ports: [514, 1514, 9200] },
  wifiap:       { icon: '📶', label: 'WiFi AP',         color: '#16a34a', ports: [80] },
  vlanswitch:   { icon: '🏷️', label: 'VLAN Switch',    color: '#0e7490', ports: [] }
};

// ─────────── Packet Types ───────────
const packetTypes = {
  ping:              { color: '#22c55e', label: 'ICMP' },
  pong:              { color: '#86efac', label: 'PONG' },
  pingIntercepted:   { color: '#ef4444', label: 'ICMP!' },
  http:              { color: '#3b82f6', label: 'HTTP' },
  https:             { color: '#2563eb', label: 'HTTPS' },
  httpIntercepted:   { color: '#ef4444', label: 'HTTP!' },
  httpResponse:      { color: '#60a5fa', label: 'HTTP OK' },
  httpsResponse:     { color: '#3b82f6', label: 'HTTPS OK' },
  dns:               { color: '#f97316', label: 'DNS' },
  dnsQuery:          { color: '#f97316', label: 'DNS Q' },
  dnsReply:          { color: '#fb923c', label: 'DNS R' },
  dnsResponse:       { color: '#fb923c', label: 'DNS OK' },
  email:             { color: '#8b5cf6', label: 'SMTP' },
  emailIntercepted:  { color: '#ef4444', label: 'MAIL!' },
  emailCompromised:  { color: '#dc2626', label: 'COMPROMIS' },
  emailDelivered:    { color: '#a78bfa', label: 'DELIVERED' },
  encrypted:         { color: '#22d3ee', label: 'TLS' },
  ssh:               { color: '#84cc16', label: 'SSH' },
  sshResponse:       { color: '#a3e635', label: 'SSH OK' },
  traceroute:        { color: '#06b6d4', label: 'TRACE' },
  ddos:              { color: '#ef4444', label: 'DDoS' },
  ddosBlocked:       { color: '#22c55e', label: 'BLOCKED' },
  portscan:          { color: '#eab308', label: 'SCAN' },
  arp:               { color: '#f97316', label: 'ARP' },
  syn:               { color: '#ec4899', label: 'SYN' },
  synack:            { color: '#f472b6', label: 'SYN-ACK' },
  ack:               { color: '#06b6d4', label: 'ACK' },
  phishing:          { color: '#f43f5e', label: 'PHISH' },
  ransomware:        { color: '#7f1d1d', label: 'RANSOM' },
  sqli:              { color: '#dc2626', label: 'SQLi' },
  xss:               { color: '#ea580c', label: 'XSS' },
  zeroday:           { color: '#4c1d95', label: '0-DAY' },
  credstuffing:      { color: '#9f1239', label: 'CREDS' },
  malware:           { color: '#450a0a', label: 'MALWARE' },
  blocked:           { color: '#22c55e', label: 'BLOCKED' },
  vpn:               { color: '#15803d', label: 'VPN' },
  eviltwin:          { color: '#b91c1c', label: 'EVIL-AP' },
  privesc:           { color: '#7c2d12', label: 'PRIVESC' },
  lateral:           { color: '#831843', label: 'LATERAL' },
  socialeng:         { color: '#be185d', label: 'SOCIAL' },
  honeytrap:         { color: '#d97706', label: 'TRAP' },
  siem_alert:        { color: '#7e22ce', label: 'ALERT' }
};

// ─────────── Node CRUD ───────────
function createNode(type, x, y, name) {
  const config = nodeTypes[type];
  if (!config) { console.error('Unknown node type:', type); return null; }
  const count = nodes.filter(n => n.type === type).length + 1;
  const node = {
    id: generateId(),
    type, x, y,
    radius: 35,
    name: name || (config.label + '-' + count),
    ip: '192.168.' + Math.floor(Math.random() * 255) + '.' + (Math.floor(Math.random() * 254) + 1),
    mac: Array(6).fill().map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()).join(':'),
    ports: [...config.ports],
    attacked: false,
    intercepting: false,
    traced: false,
    compromised: false,
    config
  };
  nodes.push(node);
  createNodeElement(node);
  updateStatusBar();
  addLog('success', node.name + ' ajouté (' + node.ip + ')');
  return node;
}

function deleteNode(node) {
  const el = document.getElementById('node-' + node.id);
  if (el) el.remove();
  connections = connections.filter(c => c.from !== node && c.to !== node);
  packets = packets.filter(p => p.source !== node && p.target !== node);
  vpnTunnels = vpnTunnels.filter(t => t.client !== node && t.gateway !== node);
  nodes = nodes.filter(n => n !== node);
  if (selectedNode === node) { selectedNode = null; closeInfoPanel(); }
  updateStatusBar();
  addLog('warning', node.name + ' supprimé');
}

function createConnection(from, to) {
  if (from === to) return null;
  if (connections.some(c => (c.from === from && c.to === to) || (c.from === to && c.to === from))) return null;
  const conn = {
    id: generateId(),
    from, to,
    latency: Math.floor(Math.random() * 50) + 5,
    bandwidth: Math.floor(Math.random() * 900) + 100, // Mbps
    encrypted: activeDefenses.encryption
  };
  connections.push(conn);
  updateStatusBar();
  addLog('success', 'Connexion: ' + from.name + ' ↔ ' + to.name);
  return conn;
}

function deleteConnection(conn) {
  connections = connections.filter(c => c !== conn);
  updateStatusBar();
  addLog('warning', 'Câble supprimé: ' + conn.from.name + ' ↔ ' + conn.to.name);
  showToast('Câble supprimé', 'warning');
}

function getConnectionAtPosition(pos) {
  const threshold = 10;
  for (const c of connections) {
    const A = pos.x - c.from.x, B = pos.y - c.from.y;
    const C = c.to.x - c.from.x, D = c.to.y - c.from.y;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;
    let xx, yy;
    if (param < 0) { xx = c.from.x; yy = c.from.y; }
    else if (param > 1) { xx = c.to.x; yy = c.to.y; }
    else { xx = c.from.x + param * C; yy = c.from.y + param * D; }
    if (Math.sqrt((pos.x - xx) ** 2 + (pos.y - yy) ** 2) < threshold) return c;
  }
  return null;
}

function getNodeAtPosition(pos) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (Math.sqrt((pos.x - nodes[i].x) ** 2 + (pos.y - nodes[i].y) ** 2) <= nodes[i].radius) return nodes[i];
  }
  return null;
}

// ─────────── Dijkstra Pathfinding ───────────
function findPath(source, target) {
  if (!source || !target) return [source || target].filter(Boolean);
  const src = nodes.find(n => n.id === source.id) || source;
  const tgt = nodes.find(n => n.id === target.id) || target;
  if (src.id === tgt.id) return [src];

  const dist = new Map();
  const prev = new Map();
  const visited = new Set();
  dist.set(src.id, 0);

  // Build adjacency from connections
  const adj = new Map();
  for (const c of connections) {
    if (!adj.has(c.from.id)) adj.set(c.from.id, []);
    if (!adj.has(c.to.id)) adj.set(c.to.id, []);
    adj.get(c.from.id).push({ node: c.to, weight: c.latency || 10 });
    adj.get(c.to.id).push({ node: c.from, weight: c.latency || 10 });
  }

  // Simple priority queue (array-based for small graphs)
  const pq = [{ id: src.id, node: src, d: 0 }];

  while (pq.length > 0) {
    pq.sort((a, b) => a.d - b.d);
    const { id: uid, node: uNode, d: uDist } = pq.shift();
    if (visited.has(uid)) continue;
    visited.add(uid);
    if (uid === tgt.id) break;

    const neighbors = adj.get(uid) || [];
    for (const { node: neighbor, weight } of neighbors) {
      if (visited.has(neighbor.id)) continue;
      const alt = uDist + weight;
      if (!dist.has(neighbor.id) || alt < dist.get(neighbor.id)) {
        dist.set(neighbor.id, alt);
        prev.set(neighbor.id, uNode);
        pq.push({ id: neighbor.id, node: neighbor, d: alt });
      }
    }
  }

  // Reconstruct path
  if (!prev.has(tgt.id) && src.id !== tgt.id) {
    console.warn('findPath: pas de chemin de', src.name, 'à', tgt.name);
    return [src];
  }
  const path = [];
  let cur = tgt;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(cur.id);
  }
  return path;
}

// ─────────── Packet Creation with Defense Matrix ───────────
function createPacket(source, target, type, data = {}) {
  if (!source || !target) { console.error('createPacket: source ou target invalide'); return null; }
  const path = findPath(source, target);
  if (path.length < 2) { addLog('warning', 'Pas de route vers ' + target.name); return null; }

  const attackTypes = ['ddos', 'portscan', 'arp', 'syn', 'phishing', 'ransomware', 'sqli', 'xss', 'zeroday', 'credstuffing', 'eviltwin', 'privesc', 'lateral', 'socialeng'];
  const isAttack = attackTypes.includes(type);

  const packet = {
    id: ++packetCounter,
    source, target, type, data,
    x: source.x, y: source.y,
    speed: 0.015 + Math.random() * 0.01,
    path,
    currentPathIndex: 0,
    trail: [],
    intercepted: false,
    blocked: false,
    isAttack,
    timestamp: Date.now()
  };

  // ── MITM Interception ──
  if (activeAttacks.mitm && !activeDefenses.encryption) {
    const mitmNode = nodes.find(n => n.type === 'mitm' && n.intercepting);
    if (mitmNode) {
      const mitmIndex = path.findIndex(n => n.id === mitmNode.id);
      if (mitmIndex >= 0) {
        if (!isSegmentProtectedByVPN(path, mitmIndex)) {
          packet.willBeIntercepted = true;
          packet.mitmNode = mitmNode;
          packet.mitmIndex = mitmIndex;
          if (['ping', 'http', 'email', 'dns', 'dnsQuery'].includes(type)) {
            packet.mitmIntercepted = true;
          }
        } else {
          packet.vpnProtected = true;
        }
      }
    }
  }

  // ── Firewall Blocking ──
  if (activeDefenses.firewall && isAttack) {
    const fwInPath = path.filter(n => n.type === 'firewall');
    if (fwInPath.length > 0) {
      const fw = fwInPath[0];
      const fwIndex = path.findIndex(n => n.id === fw.id);
      if (fwIndex > 0) {
        packet.blocked = true;
        packet.blockedAt = fw;
        packet.blockedAtIndex = fwIndex;
        packet.blockedReason = 'Firewall: ' + type.toUpperCase() + ' bloqué';
      }
    }
  }

  // ── IDS/IPS Blocking (enhanced — now actually detects multiple attack types) ──
  if (activeDefenses.ids && isAttack) {
    const detectionChance = {
      ddos: 0.7, portscan: 0.85, syn: 0.6, arp: 0.75, bruteforce: 0.9,
      ransomware: 0.5, sqli: 0.4, xss: 0.4, phishing: 0.3,
      lateral: 0.6, credstuffing: 0.7
    };
    const chance = detectionChance[type] || 0.3;
    if (Math.random() < chance) {
      packet.blocked = true;
      packet.blockedReason = 'IDS/IPS: ' + type.toUpperCase() + ' détecté';
      // SIEM alert
      if (activeDefenses.siem) {
        addLog('attack', '📊 SIEM Alert: ' + type.toUpperCase() + ' détecté par IDS');
      }
    }
  }

  // ── Rate Limiting (fixed: now blocks syn AND ddos) ──
  if (activeDefenses.ratelimit && (type === 'ddos' || type === 'syn')) {
    packet.blocked = true;
    packet.blockedReason = 'Rate limit: ' + type.toUpperCase();
  }

  // ── SYN Cookies ──
  if (activeDefenses.syncookies && type === 'syn') {
    packet.blocked = true;
    packet.blockedReason = 'SYN Cookies: Flood atténué';
  }

  // ── Dynamic ARP Inspection ──
  if (activeDefenses.dai && type === 'arp') {
    packet.blocked = true;
    packet.blockedReason = 'DAI: ARP non-autorisé bloqué';
  }

  // ── DNSSEC ──
  if (activeDefenses.dnssec && activeAttacks.dnsspoof && (type === 'dns' || type === 'dnsQuery')) {
    // DNSSEC validates the DNS response, spoofing will fail
    packet.data.dnssecProtected = true;
  }

  // ── Network Segmentation ──
  if (activeDefenses.segmentation && type === 'lateral') {
    packet.blocked = true;
    packet.blockedReason = 'Segmentation: Mouvement latéral bloqué';
  }

  // ── Honeypot Detection ──
  if (isAttack) {
    const honeypots = path.filter(n => n.type === 'honeypot');
    if (honeypots.length > 0) {
      packet.data.honeypotDetected = true;
      packet.data.honeypotNode = honeypots[0];
    }
  }

  packets.push(packet);
  updateStatusBar();
  return packet;
}

// ─────────── Packet Movement ───────────
function updatePackets() {
  packets = packets.filter(packet => {
    // Trail
    packet.trail.push({ x: packet.x, y: packet.y });
    if (packet.trail.length > 30) packet.trail.shift();

    // Move along path
    if (packet.currentPathIndex < packet.path.length - 1) {
      const next = packet.path[packet.currentPathIndex + 1];
      const dx = next.x - packet.x;
      const dy = next.y - packet.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveSpeed = 1.5;

      if (dist < moveSpeed + 2) {
        packet.x = next.x;
        packet.y = next.y;
        packet.currentPathIndex++;

        // Blocked by firewall at this node
        if (packet.blocked && packet.blockedAt && next.id === packet.blockedAt.id) {
          createRingEffect(next, '#22c55e');
          createParticles(next, 5, '#22c55e');
          addLog('success', '🛡️ ' + (packetTypes[packet.type]?.label || packet.type) + ' bloqué par ' + next.name + '!');
          addSequenceMessage(packet.source, next, 'BLOCKED: ' + packet.type, 'attack');
          return false;
        }

        // Honeypot trap
        if (packet.data.honeypotDetected && next.id === packet.data.honeypotNode?.id) {
          createRingEffect(next, '#d97706');
          createParticles(next, 8, '#d97706');
          addLog('success', '🍯 Honeypot: Attaque piégée sur ' + next.name + '!');
          showToast('Attaquant piégé par le honeypot!', 'success', '🍯 Honeypot');
          if (activeDefenses.siem) {
            addLog('attack', '📊 SIEM: IP attaquant enregistrée');
          }
          return false;
        }

        // MITM interception at this node
        if (packet.willBeIntercepted && next.id === packet.mitmNode?.id && !packet.intercepted) {
          packet.intercepted = true;
          packet.mitmIntercepted = true;
          createRingEffect(next, '#a855f7');
          next.intercepting = true;

          if (packet.type === 'email') {
            packet.type = 'emailIntercepted';
            packet.data.interceptedBy = next.name;
            packet.data.finalDest = packet.target;
            addLog('danger', '👁️ Email intercepté par ' + next.name + '!');
            showEmailPreview(packet, true);
          } else if (packet.type === 'ping') {
            addLog('danger', '👁️ Ping intercepté par ' + next.name + '!');
            packet.type = 'pingIntercepted';
          } else if (packet.type === 'http') {
            addLog('danger', '👁️ HTTP intercepté par ' + next.name + '!');
            packet.type = 'httpIntercepted';
          }
        }

        // VPN protection display
        if (packet.vpnProtected && next.type === 'mitm' && next.intercepting) {
          createRingEffect(next, '#15803d');
          createParticles(next, 5, '#15803d');
          addLog('success', '🔐 VPN protège le trafic - MITM ne peut pas intercepter!');
          showToast('Trafic protégé par tunnel VPN', 'success', '🔐 VPN');
          packet.vpnProtected = false;
        }

        // Traceroute hop logging
        if (packet.type === 'traceroute') {
          const hopNum = packet.currentPathIndex;
          const latency = Math.floor(Math.random() * 30) + 5;
          if (!packet.data.hops) packet.data.hops = [];
          packet.data.hops.push({ node: next.name, ip: next.ip, latency });
          addLog('info', '  ' + hopNum + '. ' + next.ip + ' (' + next.name + ') - ' + latency + 'ms');
          next.traced = true;
          setTimeout(() => next.traced = false, 600);
        }
      } else {
        packet.x += (dx / dist) * moveSpeed;
        packet.y += (dy / dist) * moveSpeed;
      }
    }

    // Check arrival
    const finalNode = packet.path[packet.path.length - 1];
    const distToFinal = Math.sqrt((packet.x - finalNode.x) ** 2 + (packet.y - finalNode.y) ** 2);
    if (distToFinal < 5 && packet.currentPathIndex >= packet.path.length - 1) {
      handlePacketArrival(packet);
      return false;
    }

    // Timeout 30s
    if (Date.now() - packet.timestamp > 30000) {
      addLog('warning', 'Timeout: ' + (packetTypes[packet.type]?.label || packet.type));
      return false;
    }

    // Blocked packets with no specific firewall target get removed after traveling a bit
    if (packet.blocked && !packet.blockedAt && packet.currentPathIndex > 0) {
      addLog('success', '🛡️ ' + (packetTypes[packet.type]?.label || packet.type) + ' bloqué' + (packet.blockedReason ? ' (' + packet.blockedReason + ')' : ''));
      return false;
    }

    return true;
  });
}

// ─────────── Packet Arrival Handler ───────────
function handlePacketArrival(packet) {
  const { type, target, source } = packet;
  const srcNode = source;
  const tgtNode = target;

  switch (type) {
    case 'ping':
      addSequenceMessage(tgtNode, srcNode, 'ICMP Echo Reply', 'response');
      setTimeout(() => { createPacket(tgtNode, srcNode, 'pong', { sentAt: packet.timestamp }); addLog('info', '← Pong envoyé de ' + tgtNode.name); }, 200);
      addLog('info', '→ Ping reçu par ' + tgtNode.name);
      break;
    case 'pong':
      addLog('success', '✓ Pong reçu de ' + srcNode.name + ' (' + (Date.now() - (packet.data.sentAt || packet.timestamp)) + 'ms)');
      createRingEffect(tgtNode, '#22c55e');
      break;
    case 'pingIntercepted':
      addLog('danger', '⚠️ Ping intercepté par MITM!');
      createRingEffect(tgtNode, '#ef4444');
      break;
    case 'traceroute': {
      const hopNum2 = packet.currentPathIndex + 1;
      const lat = Math.floor(Math.random() * 30) + 5;
      packet.data.hops.push({ node: tgtNode.name, ip: tgtNode.ip, latency: lat });
      addLog('info', '  ' + hopNum2 + '. ' + tgtNode.ip + ' (' + tgtNode.name + ') - ' + lat + 'ms');
      tgtNode.traced = true;
      setTimeout(() => tgtNode.traced = false, 800);
      const totalTime = packet.data.hops.reduce((s, h) => s + h.latency, 0);
      addLog('success', '✓ Traceroute terminé - ' + packet.data.hops.length + ' hops, ' + totalTime + 'ms');
      addSequenceMessage(tgtNode, srcNode, 'TRACEROUTE Complete', 'response');
      showToast('Traceroute: ' + packet.data.hops.length + ' hops', 'success');
      break;
    }
    case 'http':
      addSequenceMessage(tgtNode, srcNode, 'HTTP 200 OK', 'response');
      setTimeout(() => { createPacket(tgtNode, srcNode, 'httpResponse', { content: 'HTML page' }); }, 200);
      addLog('info', '→ HTTP reçu par ' + tgtNode.name);
      break;
    case 'https':
      addSequenceMessage(tgtNode, srcNode, 'HTTPS 200 OK', 'response');
      setTimeout(() => { createPacket(tgtNode, srcNode, 'httpsResponse', { content: 'Encrypted page' }); }, 200);
      addLog('info', '→ HTTPS reçu par ' + tgtNode.name);
      break;
    case 'httpResponse': case 'httpsResponse':
      addLog('success', '✓ Réponse ' + (type === 'httpsResponse' ? 'HTTPS' : 'HTTP') + ' reçue de ' + srcNode.name);
      createRingEffect(tgtNode, '#22c55e');
      break;
    case 'email': case 'encrypted':
      if (packet.data.viaServer && packet.data.finalDest) {
        addSequenceMessage(tgtNode, packet.data.finalDest, 'SMTP Forward', 'request');
        createPacket(tgtNode, packet.data.finalDest, type, { ...packet.data, viaServer: false });
        addLog('info', '📨 ' + tgtNode.name + ' transmet email à ' + packet.data.finalDest.name);
      } else {
        addSequenceMessage(tgtNode, srcNode, 'Delivery Confirmation', 'response');
        addLog('success', '✉️ Email délivré à ' + tgtNode.name);
        showEmailPreview(packet, false);
      }
      break;
    case 'emailIntercepted':
      addLog('danger', '⚠️ Email intercepté lu par MITM!');
      showEmailPreview(packet, true);
      if (packet.data.finalDest) {
        setTimeout(() => { createPacket(tgtNode, packet.data.finalDest, 'emailCompromised', packet.data); }, 500);
      }
      break;
    case 'emailCompromised':
      addLog('danger', '⚠️ Email compromis délivré à ' + tgtNode.name);
      showEmailPreview(packet, true);
      break;
    case 'dnsQuery': {
      addSequenceMessage(tgtNode, srcNode, 'DNS Response: ' + packet.data.finalTarget.ip, 'response');
      addLog('info', '→ DNS Query reçue: ' + packet.data.domain);
      const origSrc = packet.data.originalSrc;
      const finalTgt = packet.data.finalTarget;
      const domain = packet.data.domain;

      // DNSSEC check
      if (activeAttacks.dnsspoof && !packet.data.dnssecProtected) {
        const att = nodes.find(n => n.type === 'attacker');
        addLog('danger', '⚠️ DNS Spoofé! ' + domain + ' → ' + (att?.ip || '10.0.0.1'));
        addSequenceMessage(tgtNode, origSrc, 'DNS SPOOFED: ' + (att?.ip || '10.0.0.1'), 'attack');
        showToast('DNS falsifié!', 'error', '⚠️ DNS Spoof');
        return;
      }
      if (activeAttacks.dnsspoof && packet.data.dnssecProtected) {
        addLog('success', '🔐 DNSSEC: Spoofing DNS détecté et rejeté!');
        showToast('DNSSEC a protégé contre le DNS Spoofing!', 'success', '🔐 DNSSEC');
      }

      setTimeout(() => {
        createPacket(tgtNode, origSrc, 'dnsReply', { domain, ip: finalTgt.ip, finalTarget: finalTgt });
        addLog('info', '← DNS Response: ' + finalTgt.ip);
      }, 200);
      break;
    }
    case 'dnsReply':
      addLog('success', '✓ DNS résolu: ' + packet.data.domain + ' = ' + packet.data.ip);
      createRingEffect(tgtNode, '#22c55e');
      addSequenceMessage(tgtNode, packet.data.finalTarget, 'HTTP GET (après DNS)', 'request');
      setTimeout(() => {
        createPacket(tgtNode, packet.data.finalTarget, 'http', { afterDns: true });
        addLog('info', '→ Connexion vers ' + packet.data.finalTarget.name);
      }, 300);
      break;
    case 'dns':
      if (activeAttacks.dnsspoof && !activeDefenses.dnssec) {
        const att2 = nodes.find(n => n.type === 'attacker');
        addSequenceMessage(tgtNode, srcNode, 'DNS SPOOFED: ' + (att2?.ip || '10.0.0.1'), 'attack');
        addLog('danger', '⚠️ DNS falsifié!');
      } else if (activeAttacks.dnsspoof && activeDefenses.dnssec) {
        addLog('success', '🔐 DNSSEC: Spoofing rejeté');
        addSequenceMessage(tgtNode, srcNode, 'DNS Response (DNSSEC OK)', 'response');
        setTimeout(() => { createPacket(tgtNode, srcNode, 'dnsResponse', { domain: packet.data.domain, ip: tgtNode.ip }); }, 200);
      } else {
        addSequenceMessage(tgtNode, srcNode, 'DNS Response: ' + tgtNode.ip, 'response');
        setTimeout(() => { createPacket(tgtNode, srcNode, 'dnsResponse', { domain: packet.data.domain, ip: tgtNode.ip }); }, 200);
        addLog('info', '→ DNS Query reçue: ' + packet.data.domain);
      }
      break;
    case 'dnsResponse':
      addLog('success', '✓ DNS Response: ' + packet.data.domain + ' = ' + packet.data.ip);
      createRingEffect(tgtNode, '#22c55e');
      break;
    case 'ssh': {
      addSequenceMessage(tgtNode, srcNode, 'SSH Session Established', 'response');
      const is2fa = activeDefenses['2fa'];
      setTimeout(() => { createPacket(tgtNode, srcNode, 'sshResponse', { authenticated: is2fa }); }, 200);
      addLog(is2fa ? 'success' : 'info', '→ ' + (is2fa ? '🔐 SSH 2FA' : '🔌 SSH') + ' à ' + tgtNode.name);
      break;
    }
    case 'sshResponse':
      addLog('success', '✓ Session SSH établie avec ' + srcNode.name);
      createRingEffect(tgtNode, '#22c55e');
      break;
    case 'ddos':
      tgtNode.attacked = true;
      setTimeout(() => tgtNode.attacked = false, 300);
      break;
    case 'ddosBlocked':
      addLog('success', '🛡️ DDoS bloqué par firewall!');
      break;
    case 'portscan':
      if (tgtNode.ports && tgtNode.ports.includes(packet.data.port)) {
        addLog('warning', '⚠️ Port ' + packet.data.port + ' OUVERT sur ' + tgtNode.name);
      }
      break;
    case 'syn':
      if (!activeDefenses.firewall && !activeDefenses.syncookies) {
        addSequenceMessage(tgtNode, srcNode, 'SYN-ACK', 'response');
        setTimeout(() => { createPacket(tgtNode, srcNode, 'synack'); }, 150);
      }
      break;
    case 'synack':
      addSequenceMessage(tgtNode, srcNode, 'ACK', 'response');
      setTimeout(() => { createPacket(tgtNode, srcNode, 'ack'); }, 150);
      break;
    case 'ack':
      addLog('info', 'TCP établi avec ' + srcNode.name);
      break;
    case 'phishing':
      if (packet.data && packet.data.from) {
        showEmailPreview(packet, false);
      }
      createRingEffect(tgtNode, '#ef4444');
      break;
    case 'blocked':
      addLog('success', '🛡️ ' + (packet.data.originalType || 'Attaque') + ' bloqué par firewall!');
      createRingEffect(tgtNode, '#22c55e');
      break;
    case 'vpn':
      createRingEffect(tgtNode, '#15803d');
      break;
  }
}

// ─────────── VPN Helpers ───────────
function isConnectionInVPNTunnel(connection) {
  for (const tunnel of vpnTunnels) {
    for (let i = 0; i < tunnel.path.length - 1; i++) {
      const pf = tunnel.path[i], pt = tunnel.path[i + 1];
      if ((connection.from.id === pf.id && connection.to.id === pt.id) ||
          (connection.from.id === pt.id && connection.to.id === pf.id)) return true;
    }
  }
  return false;
}

function isPacketProtectedByVPN(packet) {
  if (!packet.path || packet.path.length < 2) return false;
  for (const tunnel of vpnTunnels) {
    const ci = packet.path.find(n => n.id === tunnel.client.id);
    const gi = packet.path.find(n => n.id === tunnel.gateway.id);
    if (ci && gi) return true;
  }
  return false;
}

function isSegmentProtectedByVPN(path, segmentIndex) {
  if (!path || path.length < 2 || segmentIndex < 0) return false;
  for (const tunnel of vpnTunnels) {
    const ci = path.findIndex(n => n.id === tunnel.client.id);
    const gi = path.findIndex(n => n.id === tunnel.gateway.id);
    if (ci === -1 || gi === -1) continue;
    if (segmentIndex >= Math.min(ci, gi) && segmentIndex <= Math.max(ci, gi)) return true;
  }
  return false;
}

function isPacketInVPNTunnel(packet) {
  if (!packet.path || packet.path.length < 2) return false;
  for (const tunnel of vpnTunnels) {
    const ci = packet.path.findIndex(n => n.id === tunnel.client.id);
    const gi = packet.path.findIndex(n => n.id === tunnel.gateway.id);
    if (ci === -1 || gi === -1) continue;
    if (packet.currentPathIndex >= Math.min(ci, gi) && packet.currentPathIndex <= Math.max(ci, gi)) return true;
  }
  return false;
}

// ─────────── Zone System ───────────
function createZone(x, y, width, height, title, color, borderColor) {
  color = color || 'rgba(59, 130, 246, 0.15)';
  borderColor = borderColor || 'rgba(59, 130, 246, 0.4)';
  const zone = { x, y, width, height, title, color, borderColor };
  zones.push(zone);
  return zone;
}

function clearZones() { zones = []; }

// ─────────── Save / Load Topology ───────────
function saveTopology() {
  const data = {
    nodes: nodes.map(n => ({ type: n.type, x: n.x, y: n.y, name: n.name, ip: n.ip, mac: n.mac })),
    connections: connections.map(c => ({ fromIdx: nodes.indexOf(c.from), toIdx: nodes.indexOf(c.to), latency: c.latency })),
    zones: zones.map(z => ({ ...z })),
    viewport: { x: viewportX, y: viewportY, zoom: zoomLevel }
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'network-topology-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Topologie sauvegardée', 'success');
  addLog('success', '💾 Topologie exportée');
}

function loadTopologyFromFile(file) {
  function processFile(f) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        // Clear current
        document.querySelectorAll('.html-node').forEach(el => el.remove());
        nodes = []; connections = []; packets = []; zones = [];
        // Rebuild
        data.nodes.forEach(n => createNode(n.type, n.x, n.y, n.name));
        setTimeout(() => {
          data.connections.forEach(c => {
            if (nodes[c.fromIdx] && nodes[c.toIdx]) createConnection(nodes[c.fromIdx], nodes[c.toIdx]);
          });
          if (data.zones) data.zones.forEach(z => createZone(z.x, z.y, z.width, z.height, z.title, z.color, z.borderColor));
          if (data.viewport) { viewportX = data.viewport.x; viewportY = data.viewport.y; zoomLevel = data.viewport.zoom; }
          showToast('Topologie chargée!', 'success');
          addLog('success', '📂 Topologie importée');
        }, 150);
      } catch (err) {
        showToast('Erreur de chargement', 'error');
        console.error(err);
      }
    };
    reader.readAsText(f);
  }

  if (file) {
    processFile(file);
  } else {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => { if (e.target.files[0]) processFile(e.target.files[0]); };
    input.click();
  }
}
