/* Network Sim — UI controller. Wires the palette, canvas interactions,
   inspector, actions, threats, scenarios, missions, courses and save/load. */
(() => {
  'use strict';

  const NS = window.NS;
  const { model, engine, threats, ip, esc } = NS;
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const state = {
    net: model.createNet(),
    selection: null,
    mode: null,            // null | 'add' | 'link' | 'action'
    pendingType: null,     // device type to drop
    linkFrom: null,
    action: null,          // 'ping' | 'trace' | 'open'
    actionFrom: null,
    defences: {},
    events: [],
    mission: null
  };
  let stage;

  // ───────────── boot ─────────────
  function init() {
    const svg = $('#stage');
    stage = new NS.Stage(svg, state);
    buildPalette();
    buildThreats();
    buildScenarios();
    buildLearn();
    buildMissions();
    bindToolbar();
    bindCanvas();
    bindTabs();
    if (!loadLast()) setNet(NS.scenarios.load('home'));
    toast('Bienvenue ! Charge un réseau ou construis le tien.', 'info');
  }

  function setNet(net) {
    state.net = net || model.createNet();
    state.selection = null;
    state.events = [];
    engine.applyAddressing(state.net);
    stage.state = state;
    stage.draw();
    stage.fit();
    refreshInspector();
    refreshStatus();
    refreshThreats();
  }

  // ───────────── palette ─────────────
  function buildPalette() {
    const host = $('#palette');
    host.innerHTML = '';
    NS.GROUPS.forEach(group => {
      const sec = document.createElement('div');
      sec.className = 'pal-group';
      sec.innerHTML = '<h4>' + esc(group) + '</h4>';
      const grid = document.createElement('div');
      grid.className = 'pal-grid';
      Object.entries(NS.TYPES).filter(([, d]) => d.group === group).forEach(([type, def]) => {
        const b = document.createElement('button');
        b.className = 'pal-item';
        b.dataset.type = type;
        b.innerHTML = '<span class="pal-ico" style="color:' + def.color + '">' + NS.icon(type, 26) + '</span><span>' + esc(def.label) + '</span>';
        b.addEventListener('click', () => armAdd(type));
        grid.appendChild(b);
      });
      sec.appendChild(grid);
      host.appendChild(sec);
    });
  }

  function armAdd(type) {
    state.mode = 'add';
    state.pendingType = type;
    setHint('Clique sur la scène pour placer : ' + NS.TYPES[type].label + ' (Échap pour annuler).');
    highlightMode();
  }

  // ───────────── toolbar ─────────────
  function bindToolbar() {
    $('#btnLink').addEventListener('click', () => {
      state.mode = state.mode === 'link' ? null : 'link';
      state.linkFrom = null;
      setHint(state.mode === 'link' ? 'Clique deux appareils pour les relier (Échap pour annuler).' : '');
      highlightMode();
    });
    $('#btnPing').addEventListener('click', () => armAction('ping'));
    $('#btnTrace').addEventListener('click', () => armAction('trace'));
    $('#btnOpen').addEventListener('click', () => armAction('open'));
    $('#btnFit').addEventListener('click', () => stage.fit());
    $('#btnClear').addEventListener('click', () => { if (confirm('Vider le réseau ?')) setNet(model.createNet()); });
    $('#btnSave').addEventListener('click', saveToFile);
    $('#btnLoad').addEventListener('click', () => $('#fileInput').click());
    $('#fileInput').addEventListener('change', loadFromFile);
    const chk = $('#btnCheck'); if (chk) chk.addEventListener('click', runValidation);
    $('#btnLog').addEventListener('click', () => $('#logPanel').classList.toggle('open'));
    $('#btnClearLog').addEventListener('click', () => { $('#logList').innerHTML = ''; });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { state.mode = null; state.linkFrom = null; state.actionFrom = null; setHint(''); highlightMode(); }
    });
  }

  function armAction(action) {
    state.mode = 'action';
    state.action = action;
    state.actionFrom = null;
    const label = { ping: 'Ping', trace: 'Traceroute', open: 'Ouvrir un service' }[action];
    setHint(label + ' : clique l\'appareil de départ.');
    highlightMode();
  }

  function highlightMode() {
    $$('.tool-btn').forEach(b => b.classList.remove('armed'));
    if (state.mode === 'link') $('#btnLink').classList.add('armed');
    if (state.mode === 'action') {
      const map = { ping: '#btnPing', trace: '#btnTrace', open: '#btnOpen' };
      const el = $(map[state.action]); if (el) el.classList.add('armed');
    }
  }

  function setHint(text) {
    const h = $('#hint');
    h.textContent = text || '';
    h.classList.toggle('show', !!text);
  }

  // ───────────── canvas interaction ─────────────
  function bindCanvas() {
    const svg = $('#stage');
    let dragging = null, dragMoved = false, panStart = null;

    svg.addEventListener('pointerdown', e => {
      const world = stage.toWorld(e.clientX, e.clientY);
      const dev = hitNode(world);
      if (state.mode === 'add') { placeDevice(world); return; }
      if (dev && state.mode === 'link') { handleLinkClick(dev); return; }
      if (dev && state.mode === 'action') { handleActionClick(dev); return; }
      if (dev) {
        dragging = dev; dragMoved = false;
        state.selection = dev; refreshInspector(); stage.drawNodes(state.net);
        try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      } else {
        panStart = { x: e.clientX, y: e.clientY, vx: stage.view.x, vy: stage.view.y };
        state.selection = null; refreshInspector(); stage.drawNodes(state.net);
      }
    });

    svg.addEventListener('pointermove', e => {
      if (dragging) {
        const world = stage.toWorld(e.clientX, e.clientY);
        dragging.x = Math.round(world.x); dragging.y = Math.round(world.y);
        dragMoved = true;
        stage.moveNode(dragging);
      } else if (panStart) {
        stage.view.x = panStart.vx + (e.clientX - panStart.x);
        stage.view.y = panStart.vy + (e.clientY - panStart.y);
        stage.applyView();
      }
    });

    const end = () => {
      if (dragging && dragMoved) { stage.drawZones(state.net); scheduleSave(); }
      dragging = null; panStart = null;
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);

    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const r = svg.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const before = stage.toWorld(e.clientX, e.clientY);
      stage.view.scale = Math.min(2.5, Math.max(0.3, stage.view.scale * factor));
      stage.view.x = mx - before.x * stage.view.scale;
      stage.view.y = my - before.y * stage.view.scale;
      stage.applyView();
    }, { passive: false });

    svg.addEventListener('contextmenu', e => {
      e.preventDefault();
      const dev = hitNode(stage.toWorld(e.clientX, e.clientY));
      if (dev && confirm('Supprimer ' + dev.name + ' ?')) { model.removeDevice(state.net, dev.id); state.selection = null; refreshAll(); scheduleSave(); }
    });
  }

  function hitNode(world) {
    let best = null, bestD = 32;
    for (const d of state.net.devices) {
      const dist = Math.hypot(d.x - world.x, d.y - world.y);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    return best;
  }

  function placeDevice(world) {
    const type = state.pendingType;
    const dev = model.makeDevice(type, Math.round(world.x), Math.round(world.y), model.defaultName(state.net, type));
    state.net.devices.push(dev);
    state.mode = null; state.pendingType = null; setHint(''); highlightMode();
    state.selection = dev;
    engine.applyAddressing(state.net);
    refreshAll();
    log('success', dev.name + ' ajouté.');
    scheduleSave();
  }

  function handleLinkClick(dev) {
    if (!state.linkFrom) { state.linkFrom = dev; stage.flashNode(dev.id, 'ok'); setHint('Maintenant clique le deuxième appareil.'); return; }
    if (state.linkFrom.id === dev.id) return;
    const res = model.connect(state.net, state.linkFrom, dev);
    if (!res.ok) { toast(res.error, 'error'); }
    else { log('success', 'Lien : ' + state.linkFrom.name + ' ↔ ' + dev.name); engine.applyAddressing(state.net); }
    state.linkFrom = null; state.mode = null; setHint(''); highlightMode();
    refreshAll(); scheduleSave();
  }

  function handleActionClick(dev) {
    if (!state.actionFrom) {
      if (dev.kind !== 'host') { toast('Choisis un appareil qui émet (PC, serveur…).', 'error'); return; }
      state.actionFrom = dev; stage.flashNode(dev.id, 'ok');
      setHint(state.action === 'open' ? 'Clique le serveur à joindre.' : 'Clique la destination.');
      return;
    }
    runAction(state.actionFrom, dev);
    state.actionFrom = null; state.mode = null; setHint(''); highlightMode();
  }

  // ───────────── actions ─────────────
  function runAction(src, dst) {
    const dstIf = engine.primaryIface(dst);
    const dstIp = dstIf ? dstIf.ip : null;
    if (!dstIp) { toast('La destination n\'a pas d\'adresse IP.', 'error'); return; }
    if (state.action === 'ping') return doPing(src, dst, dstIp);
    if (state.action === 'trace') return doTrace(src, dstIp);
    if (state.action === 'open') return doOpen(src, dst, dstIp);
  }

  function doPing(src, dst, dstIp) {
    const res = engine.ping(state.net, src, dstIp);
    if (!res.ok && !res.blocked) { log('error', 'Ping ' + dstIp + ' : ' + res.reason); toast(res.reason, 'error'); record('ping', { ok: false }); return; }
    const hops = res.hops || [{ device: src }];
    const crossedRouter = hops.some(h => h.device.kind === 'router');
    stage.animate(hops, {
      color: res.blocked ? '#f87171' : '#34d399', label: 'ICMP',
      onDone: () => {
        if (res.blocked) {
          if (res.blockedBy) stage.flashNode(res.blockedBy.id, 'block');
          log('warning', 'Ping ' + dstIp + ' bloqué : ' + res.reason);
          toast('Bloqué : ' + res.reason, 'warning');
          record('ping', { ok: false, blocked: true });
        } else {
          stage.flashNode(dst.id, 'ok');
          log('success', 'Ping ' + dstIp + ' : réponse en ' + res.rtt + ' ms' + (res.natApplied ? ' (NAT appliqué)' : ''));
          record('ping', { ok: true, crossedRouter });
        }
      }
    });
  }

  function doTrace(src, dstIp) {
    const res = engine.traceroute(state.net, src, dstIp);
    stage.animate(res.hops, { color: '#22d3ee', label: 'TRACE', onDone: () => {
      const line = res.hops.map((h, i) => (i + 1) + '. ' + h.device.name + (engine.primaryIface(h.device) ? ' (' + engine.primaryIface(h.device).ip + ')' : '')).join('  →  ');
      log(res.delivered ? 'success' : 'warning', 'Traceroute : ' + line);
      if (!res.delivered) log('warning', '… ' + res.reason);
      record('trace', { ok: res.delivered });
    } });
  }

  function doOpen(src, dst, dstIp) {
    const port = (dst.services && dst.services[0]) || 80;
    const res = engine.openService(state.net, src, dstIp, port);
    const hops = res.hops || (res.dns && res.dns.trace ? res.dns.trace.hops : [{ device: src }]);
    stage.animate(hops, { color: res.ok ? '#38bdf8' : '#f87171', label: (NS.SERVICES[port] ? NS.SERVICES[port].name.toUpperCase() : 'TCP'), onDone: () => {
      if (res.ok) { stage.flashNode(dst.id, 'ok'); log('success', src.name + ' → ' + dst.name + ' : ' + res.service.label + ' OK' + (res.natApplied ? ' (NAT)' : '')); record('open', { ok: true }); }
      else { log('error', 'Connexion échouée : ' + res.reason); toast(res.reason, 'error'); record('open', { ok: false }); }
    } });
  }

  function record(type, extra) {
    state.events.push(Object.assign({ type, at: Date.now() }, extra));
    if (state.mission) checkMission();
  }

  // ───────────── inspector ─────────────
  function refreshInspector() {
    const host = $('#inspector');
    const dev = state.selection;
    if (!dev) { host.innerHTML = '<p class="muted">Sélectionne un appareil pour voir et modifier sa configuration.</p>'; return; }
    const def = NS.TYPES[dev.type];
    const iface = engine.primaryIface(dev);
    let html = '';
    html += '<div class="insp-head"><span class="insp-ico" style="color:' + def.color + '">' + NS.icon(dev.type, 30) + '</span>';
    html += '<input id="iName" class="insp-name" value="' + esc(dev.name) + '"></div>';
    html += '<p class="insp-role">' + esc(NS.ROLES[dev.type] || '') + '</p>';

    if (dev.kind === 'host' && iface) {
      html += field('IP', 'iIp', iface.ip, iface.dhcp ? 'auto (DHCP)' : '');
      html += field('Masque (/n)', 'iPrefix', iface.prefix);
      html += '<label class="insp-check"><input type="checkbox" id="iDhcp"' + (iface.dhcp ? ' checked' : '') + '> Adresse automatique (DHCP)</label>';
      html += field('Passerelle', 'iGw', dev.gateway);
      html += field('Serveur DNS', 'iDns', dev.dns);
      html += servicesBlock(dev);
    } else if (dev.kind === 'router') {
      html += '<div class="insp-sec">Interfaces</div>';
      dev.interfaces.forEach(f => {
        html += '<div class="iface-row"><span>' + esc(f.name) + '</span>'
          + '<input data-if="' + f.id + '" data-k="ip" class="mini" value="' + esc(f.ip) + '" placeholder="IP">'
          + '<input data-if="' + f.id + '" data-k="prefix" class="mini mini-sm" value="' + esc(f.prefix) + '"></div>';
      });
      html += field('Passerelle (uplink)', 'iGw', dev.gateway);
      html += '<label class="insp-check"><input type="checkbox" id="iNat"' + (dev.nat ? ' checked' : '') + '> Partage d\'adresse (NAT)</label>';
      html += dhcpBlock(dev);
      if (dev.type === 'firewall') html += firewallBlock(dev);
      html += routesBlock(dev);
    } else {
      html += '<p class="muted">Équipement de niveau 2 : il relie sans adresse IP.</p>';
    }
    if (dev.type === 'dns') html += recordsBlock(dev);
    html += '<button id="iDelete" class="btn-danger">Supprimer</button>';
    host.innerHTML = html;
    bindInspector(dev);
  }

  function field(label, id, value, placeholder) {
    return '<label class="insp-field"><span>' + esc(label) + '</span>'
      + '<input id="' + id + '" value="' + esc(value == null ? '' : value) + '" placeholder="' + esc(placeholder || '') + '"></label>';
  }

  function servicesBlock(dev) {
    let h = '<div class="insp-sec">Services ouverts</div><div class="svc-grid">';
    Object.entries(NS.SERVICES).forEach(([port, svc]) => {
      const on = dev.services.includes(Number(port));
      h += '<label class="svc' + (on ? ' on' : '') + '"><input type="checkbox" data-svc="' + port + '"' + (on ? ' checked' : '') + '> ' + esc(svc.name) + '<small>' + port + '</small></label>';
    });
    return h + '</div>';
  }

  function dhcpBlock(dev) {
    const d = dev.dhcp || {};
    let h = '<div class="insp-sec">Serveur DHCP</div>';
    h += '<label class="insp-check"><input type="checkbox" id="iDhcpEn"' + (d.enabled ? ' checked' : '') + '> Distribuer des adresses</label>';
    h += '<div class="dhcp-grid">'
      + '<input id="iDhcpStart" class="mini" value="' + esc(d.start || '') + '" placeholder="début (ex 192.168.1.10)">'
      + '<input id="iDhcpEnd" class="mini" value="' + esc(d.end || '') + '" placeholder="fin (ex 192.168.1.50)">'
      + '<input id="iDhcpGw" class="mini" value="' + esc(d.gateway || '') + '" placeholder="passerelle offerte">'
      + '<input id="iDhcpDns" class="mini" value="' + esc(d.dns || '') + '" placeholder="DNS offert"></div>';
    return h;
  }

  function firewallBlock(dev) {
    let h = '<div class="insp-sec">Pare-feu</div>';
    h += '<label class="insp-field"><span>Politique par défaut</span><select id="iPolicy">'
      + '<option value="allow"' + (dev.defaultPolicy !== 'deny' ? ' selected' : '') + '>Tout autoriser</option>'
      + '<option value="deny"' + (dev.defaultPolicy === 'deny' ? ' selected' : '') + '>Tout refuser</option></select></label>';
    h += '<div class="rules">';
    dev.rules.forEach((r, i) => {
      h += '<div class="rule"><span class="rule-txt">' + esc(describeRule(r)) + '</span><button class="rule-del" data-rule="' + i + '">×</button></div>';
    });
    h += '</div>';
    h += '<div class="rule-add">'
      + '<select id="rAction"><option value="allow">Autoriser</option><option value="deny">Refuser</option></select>'
      + '<input id="rFrom" class="mini" placeholder="de (CIDR/any)">'
      + '<input id="rTo" class="mini" placeholder="vers (CIDR/any)">'
      + '<input id="rPort" class="mini mini-sm" placeholder="port">'
      + '<button id="rAdd" class="btn-sm">Ajouter</button></div>';
    return h;
  }

  function describeRule(r) {
    const p = [r.action === 'allow' ? '✅ autoriser' : '⛔ refuser'];
    if (r.from) p.push('de ' + r.from);
    if (r.to) p.push('vers ' + r.to);
    if (r.port) p.push('port ' + r.port);
    return p.join(' ');
  }

  function routesBlock(dev) {
    let h = '<div class="insp-sec">Routes statiques</div><div class="rules">';
    dev.routes.forEach((r, i) => {
      h += '<div class="rule"><span class="rule-txt">' + esc(r.cidr + ' via ' + r.via) + '</span><button class="route-del" data-route="' + i + '">×</button></div>';
    });
    h += '</div><div class="rule-add"><input id="rtCidr" class="mini" placeholder="réseau (ex 10.2.0.0/24)"><input id="rtVia" class="mini" placeholder="via (IP)"><button id="rtAdd" class="btn-sm">Ajouter</button></div>';
    return h;
  }

  function recordsBlock(dev) {
    let h = '<div class="insp-sec">Enregistrements DNS</div><div class="rules">';
    Object.entries(dev.records).forEach(([name, addr]) => {
      h += '<div class="rule"><span class="rule-txt">' + esc(name + ' → ' + addr) + '</span><button class="rec-del" data-rec="' + esc(name) + '">×</button></div>';
    });
    h += '</div><div class="rule-add"><input id="recName" class="mini" placeholder="nom (ex site.lan)"><input id="recIp" class="mini" placeholder="IP"><button id="recAdd" class="btn-sm">Ajouter</button></div>';
    return h;
  }

  function bindInspector(dev) {
    const commit = () => { engine.applyAddressing(state.net); refreshAll(); scheduleSave(); };
    const on = (id, ev, fn) => { const el = $('#' + id); if (el) el.addEventListener(ev, fn); };
    on('iName', 'change', e => { dev.name = e.target.value.trim() || dev.name; commit(); });
    on('iDelete', 'click', () => { model.removeDevice(state.net, dev.id); state.selection = null; commit(); });

    const iface = engine.primaryIface(dev);
    if (dev.kind === 'host' && iface) {
      on('iIp', 'change', e => { iface.ip = e.target.value.trim(); if (iface.ip) iface.dhcp = false; commit(); });
      on('iPrefix', 'change', e => { iface.prefix = clampPrefix(e.target.value); commit(); });
      on('iDhcp', 'change', e => { iface.dhcp = e.target.checked; if (iface.dhcp) iface.ip = ''; commit(); });
      on('iGw', 'change', e => { dev.gateway = e.target.value.trim(); commit(); });
      on('iDns', 'change', e => { dev.dns = e.target.value.trim(); commit(); });
      $$('#inspector [data-svc]').forEach(c => c.addEventListener('change', e => {
        const p = Number(e.target.dataset.svc);
        dev.services = e.target.checked ? [...new Set([...dev.services, p])] : dev.services.filter(x => x !== p);
        commit();
      }));
    }
    if (dev.kind === 'router') {
      $$('#inspector [data-if]').forEach(inp => inp.addEventListener('change', e => {
        const f = model.getIface(dev, e.target.dataset.if); if (!f) return;
        if (e.target.dataset.k === 'ip') { f.ip = e.target.value.trim(); f.dhcp = false; }
        else f.prefix = clampPrefix(e.target.value);
        commit();
      }));
      on('iGw', 'change', e => { dev.gateway = e.target.value.trim(); commit(); });
      on('iNat', 'change', e => { dev.nat = e.target.checked; commit(); });
      on('iDhcpEn', 'change', e => { dev.dhcp = dev.dhcp || {}; dev.dhcp.enabled = e.target.checked; commit(); });
      const dmap = { Start: 'start', End: 'end', Gw: 'gateway', Dns: 'dns' };
      Object.keys(dmap).forEach(k => on('iDhcp' + k, 'change', e => {
        dev.dhcp = dev.dhcp || {};
        dev.dhcp[dmap[k]] = e.target.value.trim();
        dev.dhcp.prefix = dev.dhcp.prefix || 24;
        commit();
      }));
      on('iPolicy', 'change', e => { dev.defaultPolicy = e.target.value; commit(); });
      on('rAdd', 'click', () => {
        const r = { action: $('#rAction').value, from: $('#rFrom').value.trim(), to: $('#rTo').value.trim(), port: $('#rPort').value.trim(), proto: 'tcp' };
        if (r.from && !ip.validCidr(r.from)) return toast('Source invalide.', 'error');
        if (r.to && !ip.validCidr(r.to)) return toast('Destination invalide.', 'error');
        dev.rules.push(r); commit();
      });
      $$('#inspector [data-rule]').forEach(b => b.addEventListener('click', e => { dev.rules.splice(Number(e.target.dataset.rule), 1); commit(); }));
      on('rtAdd', 'click', () => {
        const cidr = $('#rtCidr').value.trim(), via = $('#rtVia').value.trim();
        if (!ip.validCidr(cidr) || !ip.valid(via)) return toast('Route invalide.', 'error');
        dev.routes.push({ cidr, via }); commit();
      });
      $$('#inspector [data-route]').forEach(b => b.addEventListener('click', e => { dev.routes.splice(Number(e.target.dataset.route), 1); commit(); }));
    }
    if (dev.type === 'dns') {
      on('recAdd', 'click', () => {
        const name = $('#recName').value.trim().toLowerCase(), addr = $('#recIp').value.trim();
        if (!name || !ip.valid(addr)) return toast('Enregistrement invalide.', 'error');
        dev.records[name] = addr; commit();
      });
      $$('#inspector [data-rec]').forEach(b => b.addEventListener('click', e => { delete dev.records[e.target.dataset.rec]; commit(); }));
    }
  }

  function clampPrefix(v) { const n = parseInt(v, 10); return isNaN(n) ? 24 : Math.min(32, Math.max(1, n)); }

  // ───────────── threats & defences ─────────────
  function buildThreats() {
    const dh = $('#defences');
    dh.innerHTML = '';
    Object.entries(threats.DEFENCES).forEach(([id, d]) => {
      const b = document.createElement('button');
      b.className = 'def-btn';
      b.dataset.def = id;
      b.innerHTML = '<span class="def-ico">' + d.icon + '</span><span>' + esc(d.label) + '</span>';
      b.title = d.desc;
      b.addEventListener('click', () => {
        state.defences[id] = !state.defences[id];
        b.classList.toggle('on', !!state.defences[id]);
        log('info', (state.defences[id] ? 'Défense activée : ' : 'Défense désactivée : ') + d.label);
        refreshThreats();
      });
      dh.appendChild(b);
    });
    const th = $('#threats');
    th.innerHTML = '';
    Object.entries(threats.THREATS).forEach(([id, t]) => {
      const card = document.createElement('div');
      card.className = 'threat-card';
      card.dataset.threat = id;
      card.innerHTML = '<div class="threat-head"><span>' + t.icon + '</span><strong>' + esc(t.label) + '</strong></div>'
        + '<p class="threat-what">' + esc(t.what) + '</p>'
        + '<div class="threat-status" data-status></div>'
        + '<button class="btn-sm threat-run">Simuler</button>';
      card.querySelector('.threat-run').addEventListener('click', () => runThreat(id));
      th.appendChild(card);
    });
    refreshThreats();
  }

  function refreshThreats() {
    Object.keys(threats.THREATS).forEach(id => {
      const card = $('.threat-card[data-threat="' + id + '"]'); if (!card) return;
      const res = threats.evaluate(state.net, id, state.defences);
      const s = card.querySelector('[data-status]');
      if (!res.applicable) { card.classList.add('na'); s.innerHTML = '<span class="pill pill-na">Pas de cible</span>'; return; }
      card.classList.remove('na');
      s.innerHTML = res.stopped ? '<span class="pill pill-ok">Contré</span>' : '<span class="pill pill-risk">Vulnérable</span>';
    });
  }

  function runThreat(id) {
    const res = threats.evaluate(state.net, id, state.defences);
    if (!res.applicable) { toast('Aucune cible pour cette menace sur le réseau.', 'info'); return; }
    const { attacker, victim } = threats.attackVector(state.net, res.threat);
    const from = attacker || state.net.devices.find(d => d.kind === 'host');
    const victimIf = victim ? engine.primaryIface(victim) : null;
    if (from && victim && victimIf && victimIf.ip) {
      const out = engine.tracePath(state.net, from, victimIf.ip, {});
      const hops = (out.hops && out.hops.length) ? out.hops : [{ device: from }, { device: victim }];
      stage.animate(hops, {
        color: res.stopped ? '#34d399' : '#f87171',
        label: res.threat.icon,
        onDone: () => { stage.flashNode(victim.id, res.stopped ? 'ok' : 'block'); finishThreat(res); }
      });
    } else {
      finishThreat(res);
    }
  }

  function finishThreat(res) {
    log(res.stopped ? 'success' : 'attack', (res.stopped ? '✅ ' : '⚠️ ') + res.threat.label + ' : ' + res.explain);
    toast((res.stopped ? 'Contré : ' : 'Réseau vulnérable : ') + res.threat.label, res.stopped ? 'success' : 'warning');
    showExplain(res.threat.label, res.explain, res.stopped);
    refreshThreats();
  }

  function showExplain(title, body, ok) {
    const box = $('#explain');
    box.className = 'explain ' + (ok ? 'ok' : 'risk');
    box.innerHTML = '<strong>' + esc(title) + '</strong><p>' + esc(body) + '</p>';
    box.classList.add('show');
    clearTimeout(showExplain._t);
    showExplain._t = setTimeout(() => box.classList.remove('show'), 9000);
  }

  // ───────────── scenarios / learn / missions ─────────────
  function buildScenarios() {
    const host = $('#scenarios');
    host.innerHTML = '';
    Object.entries(NS.scenarios.SCENARIOS).forEach(([id, s]) => {
      const card = document.createElement('button');
      card.className = 'scenario-card';
      card.innerHTML = '<span class="sc-ico">' + s.icon + '</span><strong>' + esc(s.label) + '</strong>'
        + '<span class="sc-tag">' + esc(s.tag) + '</span><p>' + esc(s.hint) + '</p>';
      card.addEventListener('click', () => { state.mission = null; setNet(NS.scenarios.load(id)); switchTab('sim'); toast(s.label + ' chargé.', 'success'); });
      host.appendChild(card);
    });
  }

  function buildLearn() {
    const host = $('#learn');
    host.innerHTML = '';
    NS.learn.CHAPTERS.forEach(ch => {
      const sec = document.createElement('section');
      sec.className = 'learn-chapter';
      sec.innerHTML = '<h3>' + ch.icon + ' ' + esc(ch.title) + '</h3>';
      ch.cards.forEach(c => {
        const d = document.createElement('div');
        d.className = 'learn-card';
        d.innerHTML = '<h4>' + esc(c.t) + '</h4>' + c.b.map(p => '<p>' + esc(p) + '</p>').join('')
          + '<p class="learn-try">👉 ' + esc(c.try) + '</p>';
        sec.appendChild(d);
      });
      host.appendChild(sec);
    });
  }

  function buildMissions() {
    const host = $('#missions');
    host.innerHTML = '';
    NS.missions.MISSIONS.forEach(m => {
      const card = document.createElement('div');
      card.className = 'mission-card';
      card.innerHTML = '<div class="mission-head"><span>' + m.icon + '</span><strong>' + esc(m.title) + '</strong><span class="sc-tag">' + esc(m.level) + '</span></div>'
        + '<p>' + esc(m.brief) + '</p>'
        + '<ol>' + m.steps.map(s => '<li>' + esc(s) + '</li>').join('') + '</ol>'
        + '<div class="mission-foot"><button class="btn-sm" data-start="' + m.id + '">Commencer</button>'
        + '<button class="btn-sm btn-check" data-check="' + m.id + '">Vérifier</button></div>'
        + '<div class="mission-result" data-result="' + m.id + '"></div>';
      host.appendChild(card);
    });
    host.addEventListener('click', e => {
      const start = e.target.closest('[data-start]');
      const check = e.target.closest('[data-check]');
      if (start) startMission(start.dataset.start);
      if (check) checkMission(check.dataset.check);
    });
  }

  function startMission(id) {
    const m = NS.missions.MISSIONS.find(x => x.id === id);
    if (!m) return;
    state.mission = m;
    setNet(m.start());
    state.net.meta.name = 'Mission : ' + m.title;
    switchTab('sim');
    toast('Mission démarrée : ' + m.title, 'info');
  }

  function checkMission(id) {
    const m = state.mission || NS.missions.MISSIONS.find(x => x.id === id);
    if (!m) { toast('Démarre d\'abord la mission.', 'info'); return; }
    const res = m.check({ net: state.net, events: state.events });
    const box = $('[data-result="' + m.id + '"]');
    if (box) { box.className = 'mission-result show ' + (res.done ? 'ok' : 'ko'); box.textContent = (res.done ? '✅ ' : '❌ ') + res.msg; }
    if (res.done) toast('Mission réussie !', 'success');
  }

  // ───────────── tabs ─────────────
  function bindTabs() { $$('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab))); }
  function switchTab(tab) {
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    $$('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab));
    if (tab === 'sim') stage.fit();
  }

  // ───────────── validation, status, log, toast ─────────────
  function runValidation() {
    const problems = engine.validate(state.net);
    if (!problems.length) { toast('Réseau valide : tout est adressé et relié.', 'success'); return; }
    problems.slice(0, 6).forEach(p => log('warning', p.device.name + ' : ' + p.msg));
    toast(problems.length + ' problème(s) — voir le journal.', 'warning');
    $('#logPanel').classList.add('open');
  }

  function refreshStatus() {
    const n = state.net;
    $('#statDevices').textContent = n.devices.length;
    $('#statLinks').textContent = n.links.length;
    $('#statNets').textContent = engine.computeSegments(n).filter(s => s.ifaces.some(e => e.iface.ip)).length;
  }

  function refreshAll() { stage.draw(); refreshInspector(); refreshStatus(); refreshThreats(); }

  function log(kind, msg) {
    const list = $('#logList');
    const li = document.createElement('div');
    li.className = 'log-line log-' + kind;
    const time = new Date().toLocaleTimeString('fr-FR', { hour12: false });
    li.innerHTML = '<span class="log-time">' + time + '</span>' + esc(msg);
    list.insertBefore(li, list.firstChild);
    $('#logPanel').classList.add('has');
  }

  let toastTimer;
  function toast(msg, kind) {
    const t = $('#toast');
    t.className = 'toast toast-' + (kind || 'info') + ' show';
    t.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  // ───────────── save / load ─────────────
  let saveTimer;
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => NS.storage.set('netsim:last', model.serialize(state.net)), 400); }
  function loadLast() {
    const data = NS.storage.get('netsim:last', null);
    if (!data) return false;
    const net = model.deserialize(data);
    if (!net) return false;
    setNet(net);
    return true;
  }
  function saveToFile() {
    const blob = new Blob([JSON.stringify(model.serialize(state.net), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (state.net.meta.name || 'reseau').replace(/\s+/g, '-').toLowerCase() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Topologie exportée.', 'success');
  }
  function loadFromFile(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const net = model.deserialize(JSON.parse(reader.result));
        if (!net) throw new Error('format');
        state.mission = null; setNet(net); switchTab('sim'); toast('Topologie importée.', 'success');
      } catch (err) { toast('Fichier illisible.', 'error'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
