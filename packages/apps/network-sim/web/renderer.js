/* ============================================================
   Network Sim — renderer.js
   Canvas rendering: grid, zones, connections, packets, particles
   HTML node elements, minimap
   ============================================================ */

// Canvas references (set by app.js init)
let canvas, ctx;

// Particle system
let particles = [];

// ─────────── Grid (optimized: only visible area) ───────────
function drawGrid() {
  const gridSize = 40;
  const worldLeft = -viewportX / zoomLevel;
  const worldTop = -viewportY / zoomLevel;
  const worldRight = worldLeft + canvas.width / zoomLevel;
  const worldBottom = worldTop + canvas.height / zoomLevel;

  // Only draw visible area + small margin
  const margin = gridSize * 3;
  const startX = Math.floor((worldLeft - margin) / gridSize) * gridSize;
  const endX = Math.ceil((worldRight + margin) / gridSize) * gridSize;
  const startY = Math.floor((worldTop - margin) / gridSize) * gridSize;
  const endY = Math.ceil((worldBottom + margin) / gridSize) * gridSize;

  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1 / zoomLevel;

  ctx.beginPath();
  for (let x = startX; x <= endX; x += gridSize) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = startY; y <= endY; y += gridSize) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();
}

// ─────────── Zones ───────────
function drawZones() {
  zones.forEach(zone => {
    ctx.fillStyle = zone.color;
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);

    ctx.strokeStyle = zone.borderColor;
    ctx.lineWidth = 2 / zoomLevel;
    ctx.setLineDash([8 / zoomLevel, 4 / zoomLevel]);
    ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    ctx.setLineDash([]);

    const fontSize = Math.max(14, Math.round(16 / zoomLevel));
    ctx.font = 'bold ' + fontSize + 'px system-ui';
    ctx.fillStyle = zone.borderColor.replace('0.4', '0.9').replace('0.15', '0.9');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(zone.title, zone.x + 10 / zoomLevel, zone.y + 8 / zoomLevel);
  });
}

// ─────────── Connections ───────────
function drawConnections() {
  connections.forEach(c => {
    ctx.beginPath();
    ctx.moveTo(c.from.x, c.from.y);
    ctx.lineTo(c.to.x, c.to.y);

    const ds = 1 / zoomLevel;
    const inVPN = isConnectionInVPNTunnel(c);

    if (c.encrypted || inVPN) {
      ctx.setLineDash([8 * ds, 4 * ds]);
      ctx.strokeStyle = inVPN ? '#15803d' : '#22d3ee';
      ctx.lineWidth = 3 / zoomLevel;
    } else {
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2 / zoomLevel;
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Latency label
    const mx = (c.from.x + c.to.x) / 2;
    const my = (c.from.y + c.to.y) / 2;
    const fs = Math.round(10 / zoomLevel);
    ctx.font = fs + 'px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText(c.latency + 'ms', mx, my - 8 / zoomLevel);
    if (c.encrypted) ctx.fillText('🔒', mx, my + 12 / zoomLevel);
    if (inVPN) ctx.fillText('🔐', mx, my + 12 / zoomLevel);
  });
}

// ─────────── VPN Tunnels ───────────
function drawVPNTunnels() {
  if (vpnTunnels.length === 0) return;
  const time = Date.now() * 0.001;

  vpnTunnels.forEach(tunnel => {
    if (!tunnel.path || tunnel.path.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(tunnel.path[0].x, tunnel.path[0].y);
    for (let i = 1; i < tunnel.path.length; i++) {
      ctx.lineTo(tunnel.path[i].x, tunnel.path[i].y);
    }

    const ds = 1 / zoomLevel;
    ctx.setLineDash([15 * ds, 10 * ds]);
    ctx.lineDashOffset = -time * 50;
    ctx.strokeStyle = tunnel.color + '80';
    ctx.lineWidth = 8 / zoomLevel;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.lineWidth = 2 / zoomLevel;
    ctx.strokeStyle = tunnel.color;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // Label
    if (tunnel.path.length >= 2) {
      const midIdx = Math.floor(tunnel.path.length / 2);
      const midNode = tunnel.path[midIdx];
      const prevNode = tunnel.path[midIdx - 1] || tunnel.path[0];
      const lx = (midNode.x + prevNode.x) / 2;
      const ly = (midNode.y + prevNode.y) / 2;
      const lfs = Math.round(12 / zoomLevel);
      ctx.font = 'bold ' + lfs + 'px system-ui';
      const label = '🔐 VPN Tunnel';
      const metrics = ctx.measureText(label);
      const pad = 5 / zoomLevel;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(lx - metrics.width / 2 - pad, ly - lfs / 2 - pad, metrics.width + pad * 2, lfs + pad * 2);
      ctx.fillStyle = tunnel.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly);
    }
  });
}

// ─────────── Connecting Line ───────────
function drawConnectingLine() {
  if (connectingFrom && hoveredNode && hoveredNode !== connectingFrom) {
    ctx.beginPath();
    ctx.moveTo(connectingFrom.x, connectingFrom.y);
    ctx.lineTo(hoveredNode.x, hoveredNode.y);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(59,130,246,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ─────────── Packet Color Helper ───────────
function getPacketColor(p) {
  const cfg = packetTypes[p.type];
  let color = cfg?.color || '#fff';
  if (p.isAttack) color = '#ef4444';
  else if (p.mitmIntercepted || p.intercepted) color = '#ef4444';
  else if (p.blocked && p.blockedAt) color = '#f59e0b';
  else if (isPacketInVPNTunnel(p)) color = '#15803d';
  return color;
}

// ─────────── Packet Trails ───────────
function drawPacketTrails() {
  packets.forEach(p => {
    if (p.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      p.trail.forEach(t => ctx.lineTo(t.x, t.y));
      const c = getPacketColor(p);
      const g = ctx.createLinearGradient(p.trail[0].x, p.trail[0].y, p.x, p.y);
      g.addColorStop(0, c + '00');
      g.addColorStop(1, c + '80');
      ctx.strokeStyle = g;
      ctx.lineWidth = 4 / zoomLevel;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  });
}

// ─────────── Packets ───────────
function drawPackets() {
  const pr = 15 / zoomLevel;
  const pc = 7 / zoomLevel;

  packets.forEach(p => {
    const cfg = packetTypes[p.type];
    const color = getPacketColor(p);

    // Halo
    ctx.beginPath();
    ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pr);
    g.addColorStop(0, color);
    g.addColorStop(0.5, color + '80');
    g.addColorStop(1, color + '00');
    ctx.fillStyle = g;
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(p.x, p.y, pc, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1 / zoomLevel;
    ctx.stroke();

    // Label
    const ls = Math.round(8 / zoomLevel);
    ctx.font = 'bold ' + ls + 'px system-ui';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(cfg?.label || p.type.toUpperCase(), p.x, p.y + 22 / zoomLevel);

    // Status icons
    const is = Math.round(12 / zoomLevel);
    if (['https', 'encrypted', 'ssh', 'httpsResponse', 'sshResponse'].includes(p.type) || activeDefenses.encryption) {
      ctx.font = is + 'px Arial';
      ctx.fillText('🔒', p.x + 12 / zoomLevel, p.y - 12 / zoomLevel);
    }
    if (p.intercepted || p.mitmIntercepted) {
      ctx.font = (is + 2) + 'px Arial';
      ctx.fillText('👁️', p.x + 12 / zoomLevel, p.y - 12 / zoomLevel);
    }
    if (p.blocked) {
      ctx.font = (is + 2) + 'px Arial';
      ctx.fillText('🛑', p.x + 12 / zoomLevel, p.y - 12 / zoomLevel);
    }
  });
}

// ─────────── Particles ───────────
function createParticles(targetNode, count, color) {
  if (zoomLevel < 0.7) count = Math.min(count, 8);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 100;
    particles.push({
      x: targetNode.x + Math.cos(angle) * distance,
      y: targetNode.y + Math.sin(angle) * distance,
      targetX: targetNode.x,
      targetY: targetNode.y,
      color, life: 1,
      speed: 0.02 + Math.random() * 0.02
    });
  }
}

function drawParticles() {
  particles = particles.filter(p => {
    p.life -= p.speed;
    if (p.life <= 0) return false;
    const dx = p.targetX - p.x, dy = p.targetY - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 5) { p.x += (dx / dist) * 4; p.y += (dy / dist) * 4; }
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0');
    ctx.fill();
    return true;
  });
}

// ─────────── Zoom Indicator ───────────
function drawZoomIndicator() {
  if (zoomLevel !== 1 || viewportX !== 0 || viewportY !== 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('Zoom: ' + Math.round(zoomLevel * 100) + '% | Molette: zoom, Molette+glisser: déplacer', canvas.width - 20, canvas.height - 20);
  }
}

// ─────────── HTML Node Elements ───────────
function createNodeElement(node) {
  const existing = document.getElementById('node-' + node.id);
  if (existing) existing.remove();

  const container = document.getElementById('canvasContainer');
  const el = document.createElement('div');
  el.id = 'node-' + node.id;
  el.className = 'html-node';
  el.style.cssText = `
    position: absolute;
    left: 0; top: 0;
    width: 70px; height: 70px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2a3352, #1a1f35);
    border: 3px solid ${node.config.color};
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    cursor: ${cableMode ? 'crosshair' : 'move'};
    z-index: 10;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    user-select: none; -webkit-user-select: none;
    touch-action: none;
  `;
  el.innerHTML = `
    <span style="font-size:24px;line-height:1;pointer-events:none">${node.config.icon}</span>
    <span style="font-size:9px;color:#fff;margin-top:2px;font-weight:bold;pointer-events:none;white-space:nowrap;max-width:60px;overflow:hidden;text-overflow:ellipsis">${node.name}</span>
  `;

  // Click
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    if (actionMode) { handleActionModeClick(node); return; }
    if (cableMode) {
      if (cableFirstNode === null) {
        cableFirstNode = node;
        connectingFrom = node;
        document.getElementById('cableModeIndicator').textContent = '🔗 Cliquez sur le second équipement pour créer le câble';
        addLog('info', 'Câble depuis ' + node.name + '...');
        el.style.borderColor = '#22c55e';
      } else if (cableFirstNode !== node) {
        createConnection(cableFirstNode, node);
        const firstEl = document.getElementById('node-' + cableFirstNode.id);
        if (firstEl) firstEl.style.borderColor = cableFirstNode.config.color;
        cableFirstNode = null;
        connectingFrom = null;
        document.getElementById('cableModeIndicator').textContent = '🔗 Mode Câble actif - Cliquez sur un équipement';
      }
    } else {
      selectedNode = node;
      showNodeInfo(node);
    }
  });

  // Drag (mouse)
  el.addEventListener('mousedown', (e) => {
    if (cableMode || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const startNodeX = node.x, startNodeY = node.y;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    function onMove(e) {
      node.x = startNodeX + (e.clientX - startX) * scaleX / zoomLevel;
      node.y = startNodeY + (e.clientY - startY) * scaleY / zoomLevel;
    }
    function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Touch drag
  el.addEventListener('touchstart', (e) => {
    if (cableMode) return;
    e.preventDefault();
    const touch = e.touches[0];
    const startX = touch.clientX, startY = touch.clientY;
    const startNodeX = node.x, startNodeY = node.y;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    function onTouchMove(e) {
      const t = e.touches[0];
      node.x = startNodeX + (t.clientX - startX) * scaleX / zoomLevel;
      node.y = startNodeY + (t.clientY - startY) * scaleY / zoomLevel;
    }
    function onTouchEnd() { document.removeEventListener('touchmove', onTouchMove); document.removeEventListener('touchend', onTouchEnd); }
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }, { passive: false });

  // Tooltip
  el.addEventListener('mouseenter', (e) => { hoveredNode = node; showTooltipAtPosition(node, e.clientX, e.clientY); });
  el.addEventListener('mousemove', (e) => { updateTooltipAtPosition(e.clientX, e.clientY); });
  el.addEventListener('mouseleave', () => { hoveredNode = null; hideTooltip(); });

  // Context menu
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); deleteNode(node); });

  container.appendChild(el);
}

function updateNodeElements() {
  const container = document.getElementById('canvasContainer');
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;
  const baseSize = 70;

  nodes.forEach(node => {
    let el = document.getElementById('node-' + node.id);
    if (!el) { createNodeElement(node); el = document.getElementById('node-' + node.id); }
    if (!el) return;

    const sx = (node.x * zoomLevel + viewportX) * scaleX;
    const sy = (node.y * zoomLevel + viewportY) * scaleY;
    const vs = baseSize * zoomLevel * scaleX;

    el.style.left = (sx - vs / 2) + 'px';
    el.style.top = (sy - vs / 2) + 'px';
    el.style.width = vs + 'px';
    el.style.height = vs + 'px';
    el.style.transform = '';

    const iconSize = Math.max(12, Math.round(24 * zoomLevel));
    const textSize = Math.max(6, Math.round(9 * zoomLevel));
    const iconSpan = el.querySelector('span:first-child');
    const textSpan = el.querySelector('span:last-child');
    if (iconSpan) iconSpan.style.fontSize = iconSize + 'px';
    if (textSpan) textSpan.style.fontSize = textSize + 'px';

    el.style.borderWidth = Math.max(1, Math.round(3 * zoomLevel)) + 'px';
    el.style.borderColor = node === selectedNode ? '#3b82f6' :
                            node === actionSource ? '#22d3ee' : node.config.color;

    if (node.attacked) {
      el.style.boxShadow = '0 0 ' + (20 * zoomLevel) + 'px rgba(239,68,68,0.7)';
      if (!el.classList.contains('node-shaking')) {
        el.classList.add('node-shaking');
        setTimeout(() => el.classList.remove('node-shaking'), 500);
      }
    } else if (node.intercepting) {
      el.style.boxShadow = '0 0 ' + (20 * zoomLevel) + 'px rgba(168,85,247,0.7)';
    } else if (node.compromised) {
      el.style.boxShadow = '0 0 ' + (20 * zoomLevel) + 'px rgba(220,38,38,0.5)';
    } else {
      el.style.boxShadow = '0 ' + (4 * zoomLevel) + 'px ' + (15 * zoomLevel) + 'px rgba(0,0,0,0.3)';
    }
  });

  // Remove deleted node elements
  document.querySelectorAll('.html-node').forEach(el => {
    const nodeId = el.id.replace('node-', '');
    if (!nodes.find(n => n.id === nodeId)) el.remove();
  });
}

// ─────────── Ring Effect ───────────
function createRingEffect(node, color) {
  const container = document.getElementById('canvasContainer');
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;
  const ring = document.createElement('div');
  ring.className = 'ring-effect';
  ring.style.borderColor = color;
  const sx = (node.x * zoomLevel + viewportX) * scaleX;
  const sy = (node.y * zoomLevel + viewportY) * scaleY;
  const size = 70 * zoomLevel;
  ring.style.left = (sx - size / 2) + 'px';
  ring.style.top = (sy - size / 2) + 'px';
  ring.style.width = size + 'px';
  ring.style.height = size + 'px';
  container.appendChild(ring);
  setTimeout(() => ring.remove(), 600);
}

// ─────────── Minimap ───────────
function drawMinimap() {
  const minimapEl = document.getElementById('minimap');
  if (!minimapEl || window.innerWidth < 480) return; // Hidden on small phones
  const mc = minimapEl.querySelector('canvas');
  if (!mc) return;
  const mctx = mc.getContext('2d');
  if (!mctx) return;

  mc.width = minimapEl.clientWidth;
  mc.height = minimapEl.clientHeight;

  if (nodes.length === 0) return;

  // Find bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x > maxX) maxX = n.x;
    if (n.y > maxY) maxY = n.y;
  });
  const padding = 100;
  minX -= padding; minY -= padding; maxX += padding; maxY += padding;
  const worldW = maxX - minX || 1;
  const worldH = maxY - minY || 1;
  const scale = Math.min(mc.width / worldW, mc.height / worldH);

  mctx.clearRect(0, 0, mc.width, mc.height);

  // Draw connections
  mctx.strokeStyle = 'rgba(255,255,255,0.2)';
  mctx.lineWidth = 1;
  connections.forEach(c => {
    mctx.beginPath();
    mctx.moveTo((c.from.x - minX) * scale, (c.from.y - minY) * scale);
    mctx.lineTo((c.to.x - minX) * scale, (c.to.y - minY) * scale);
    mctx.stroke();
  });

  // Draw nodes
  nodes.forEach(n => {
    mctx.beginPath();
    mctx.arc((n.x - minX) * scale, (n.y - minY) * scale, 3, 0, Math.PI * 2);
    mctx.fillStyle = n.config.color;
    mctx.fill();
  });

  // Viewport rectangle
  const vpEl = minimapEl.querySelector('.minimap-viewport');
  if (vpEl) {
    const vl = (-viewportX / zoomLevel - minX) * scale;
    const vt = (-viewportY / zoomLevel - minY) * scale;
    const vw = (canvas.width / zoomLevel) * scale;
    const vh = (canvas.height / zoomLevel) * scale;
    vpEl.style.left = Math.max(0, vl) + 'px';
    vpEl.style.top = Math.max(0, vt) + 'px';
    vpEl.style.width = Math.min(vw, mc.width) + 'px';
    vpEl.style.height = Math.min(vh, mc.height) + 'px';
  }
}
