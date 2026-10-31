/* Network Sim — SVG stage: draws devices, links, subnet zones, and animates
   packets hop by hop along a path returned by the engine. */
(() => {
  'use strict';

  const NS = window.NS;
  const { model, engine, ip } = NS;
  const SVGNS = 'http://www.w3.org/2000/svg';

  function el(name, attrs, parent) {
    const node = document.createElementNS(SVGNS, name);
    if (attrs) for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  class Stage {
    constructor(svg, state) {
      this.svg = svg;
      this.state = state;               // shared app state { net, selection, view }
      this.view = { x: 0, y: 0, scale: 1 };
      this.layers = {};
      ['zones', 'links', 'packets', 'nodes'].forEach(name => {
        this.layers[name] = el('g', { 'class': 'layer-' + name }, svg);
      });
      this.nodeEls = new Map();
    }

    applyView() {
      const { x, y, scale } = this.view;
      Object.values(this.layers).forEach(g =>
        g.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`));
    }

    toWorld(clientX, clientY) {
      const r = this.svg.getBoundingClientRect();
      return {
        x: (clientX - r.left - this.view.x) / this.view.scale,
        y: (clientY - r.top - this.view.y) / this.view.scale
      };
    }

    // ───── full redraw (cheap: few dozen nodes) ─────
    draw() {
      const net = this.state.net;
      this.drawZones(net);
      this.drawLinks(net);
      this.drawNodes(net);
    }

    drawZones(net) {
      const g = this.layers.zones;
      g.textContent = '';
      const segs = engine.computeSegments(net);
      segs.forEach((seg, i) => {
        const ips = seg.ifaces.filter(e => e.iface.ip);
        if (ips.length < 1) return;
        const first = ips[0].iface;
        const label = ip.cidr(first.ip, first.prefix);
        const devs = seg.ifaces.map(e => e.device);
        const box = bounds(devs, 46);
        if (!box) return;
        el('rect', {
          x: box.x, y: box.y, width: box.w, height: box.h, rx: 22,
          'class': 'zone', style: `--zone:${ZONE_COLORS[i % ZONE_COLORS.length]}`
        }, g);
        const t = el('text', { x: box.x + 14, y: box.y + 22, 'class': 'zone-label' }, g);
        t.textContent = label;
      });
    }

    drawLinks(net) {
      const g = this.layers.links;
      g.textContent = '';
      for (const link of net.links) {
        const a = model.getDevice(net, link.a), b = model.getDevice(net, link.b);
        if (!a || !b) continue;
        const cls = 'link' + (link.medium === 'wifi' ? ' link-wifi' : '') + (link.up ? '' : ' link-down');
        el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'class': cls, 'data-link': link.id }, g);
      }
    }

    drawNodes(net) {
      const g = this.layers.nodes;
      g.textContent = '';
      this.nodeEls.clear();
      for (const dev of net.devices) {
        const def = NS.TYPES[dev.type];
        const sel = this.state.selection && this.state.selection.id === dev.id;
        const wrap = el('g', {
          'class': 'node' + (sel ? ' selected' : '') + (dev.compromised ? ' compromised' : ''),
          transform: `translate(${dev.x} ${dev.y})`, 'data-dev': dev.id
        }, g);
        el('circle', { r: 30, 'class': 'node-bg', style: `--c:${def.color}` }, wrap);
        const fo = el('foreignObject', { x: -15, y: -15, width: 30, height: 30, 'class': 'node-ico' }, wrap);
        const div = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
        div.style.cssText = 'width:30px;height:30px;color:' + def.color;
        div.innerHTML = NS.icon(dev.type, 30);
        fo.appendChild(div);
        const name = el('text', { y: 48, 'class': 'node-name' }, wrap);
        name.textContent = dev.name;
        const primary = engine.primaryIface(dev);
        if (primary && primary.ip) {
          const sub = el('text', { y: 62, 'class': 'node-ip' }, wrap);
          sub.textContent = primary.ip;
        }
        this.nodeEls.set(dev.id, wrap);
      }
    }

    moveNode(dev) {
      const wrap = this.nodeEls.get(dev.id);
      if (wrap) wrap.setAttribute('transform', `translate(${dev.x} ${dev.y})`);
      this.drawLinks(this.state.net);
      this.drawZones(this.state.net);
    }

    // ───── packet animation along engine hops ─────
    // hops: [{device,...}]; opts: { color, label, onDone }
    animate(hops, opts) {
      opts = opts || {};
      if (!hops || hops.length < 1) { if (opts.onDone) opts.onDone(); return; }
      const points = hops.filter(h => h && h.device).map(h => ({ x: h.device.x, y: h.device.y }));
      if (points.length < 1) { if (opts.onDone) opts.onDone(); return; }
      if (points.length === 1) points.push({ x: points[0].x + 1, y: points[0].y });
      const dot = el('g', { 'class': 'packet' }, this.layers.packets);
      el('circle', { r: 9, 'class': 'packet-dot', style: `--pc:${opts.color || '#38bdf8'}` }, dot);
      const lab = el('text', { 'class': 'packet-label', y: -14 }, dot);
      lab.textContent = opts.label || '';
      const legs = points.length - 1;
      const perLeg = Math.max(300, 1400 / legs);
      const start = performance.now();
      const total = perLeg * legs;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / total);
        const pos = t * legs;
        const i = Math.max(0, Math.min(legs - 1, Math.floor(pos)));
        const a = points[i], b = points[i + 1] || a;
        const f = pos - i;
        const x = a.x + (b.x - a.x) * f;
        const y = a.y + (b.y - a.y) * f;
        dot.setAttribute('transform', `translate(${x} ${y})`);
        if (t < 1) { requestAnimationFrame(tick); }
        else {
          dot.classList.add('packet-arrive');
          setTimeout(() => dot.remove(), 220);
          if (opts.onDone) opts.onDone();
        }
      };
      requestAnimationFrame(tick);
    }

    flashNode(devId, kind) {
      const wrap = this.nodeEls.get(devId);
      if (!wrap) return;
      wrap.classList.add('flash-' + (kind || 'ok'));
      setTimeout(() => wrap.classList.remove('flash-' + (kind || 'ok')), 700);
    }

    fit() {
      const box = bounds(this.state.net.devices, 80);
      if (!box) { this.view = { x: 0, y: 0, scale: 1 }; this.applyView(); return; }
      const r = this.svg.getBoundingClientRect();
      const scale = Math.min(1.4, Math.min(r.width / box.w, r.height / box.h) || 1);
      this.view.scale = scale;
      this.view.x = r.width / 2 - (box.x + box.w / 2) * scale;
      this.view.y = r.height / 2 - (box.y + box.h / 2) * scale;
      this.applyView();
    }
  }

  const ZONE_COLORS = ['#38bdf8', '#34d399', '#f472b6', '#facc15', '#c084fc', '#fb923c'];

  function bounds(devs, pad) {
    if (!devs || !devs.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const d of devs) {
      minX = Math.min(minX, d.x); minY = Math.min(minY, d.y);
      maxX = Math.max(maxX, d.x); maxY = Math.max(maxY, d.y);
    }
    pad = pad || 40;
    return { x: minX - pad, y: minY - pad, w: (maxX - minX) + pad * 2, h: (maxY - minY) + pad * 2 };
  }

  NS.Stage = Stage;
})();
