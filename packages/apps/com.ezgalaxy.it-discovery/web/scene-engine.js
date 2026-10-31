/**
 * IT Discovery — animated scene engine.
 *
 * A scene is data: nodes placed on an SVG stage, links between them and steps.
 * Each step has a caption written for three reading levels and a list of
 * declarative actions (packets travelling, flows, highlights, typing...).
 * Persistent actions (show/hide/move/fill/text...) are replayed instantly when
 * jumping to a later step, so every step can be reached directly.
 */
(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const COLORS = {
    cyan: '#38BDF8', amber: '#FBBF24', violet: '#A78BFA', green: '#34D399',
    red: '#F87171', pink: '#F472B6', slate: '#94A3B8', white: '#E8EEF8'
  };
  const LEVELS = [['college', 'Collège'], ['lycee', 'Lycée'], ['but', 'BUT']];
  const SPEEDS = [0.75, 1, 1.5];
  const PERSISTENT = new Set(['show', 'hide', 'move', 'swap', 'fill', 'text', 'counter', 'type', 'color', 'dim', 'undim']);
  const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const color = (c) => COLORS[c] || c || COLORS.cyan;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function el(tag, attrs, parent) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const k in attrs || {}) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function iconMarkup(name) {
    const icons = window.ITIcons;
    return icons ? icons.paths[name] || icons.paths.bulb : '';
  }

  function textWidth(text, size) {
    return Math.max(24, String(text).length * size * 0.58);
  }

  /* ───────── Stage: builds the SVG and keeps live node state ───────── */
  class Stage {
    constructor(svg, scene) {
      this.svg = svg;
      this.scene = scene;
      this.layers = {};
      ['zones', 'links', 'flows', 'nodes', 'packets', 'labels'].forEach((k) => {
        this.layers[k] = el('g', { class: 'sc-layer-' + k }, svg);
      });
      this.nodes = {};
      this.links = [];
      (scene.nodes || []).forEach((n) => this.addNode(n));
      (scene.links || []).forEach((l) => this.addLink(l));
    }

    addNode(def) {
      const kind = def.kind || 'box';
      const layer = kind === 'zone' ? this.layers.zones : this.layers.nodes;
      const g = el('g', { class: 'sc-node sc-' + kind, 'data-id': def.id }, layer);
      const inner = el('g', { class: 'sc-inner' }, g);
      const node = { def, kind, g, inner, x: def.x, y: def.y, lines: [], value: def.value || 0, text: def.text || '' };
      this.nodes[def.id] = node;
      this.draw(node);
      this.place(node);
      if (def.hidden) g.classList.add('sc-hidden');
      return node;
    }

    draw(node) {
      const d = node.def;
      const c = color(node.color || d.color);
      const inner = node.inner;
      inner.innerHTML = '';
      inner.style.setProperty('--c', c);
      if (node.kind === 'box') {
        const s = d.size || 64;
        el('rect', { x: -s / 2, y: -s / 2, width: s, height: s, rx: s * 0.28, class: 'sc-box-bg' }, inner);
        const icon = el('g', { class: 'sc-icon', transform: `translate(${-s * 0.27} ${-s * 0.27}) scale(${s * 0.54 / 24})` }, inner);
        icon.innerHTML = iconMarkup(d.icon);
        if (d.label) el('text', { y: s / 2 + 20, class: 'sc-label', 'text-anchor': 'middle' }, inner).textContent = d.label;
        if (d.sub) el('text', { y: s / 2 + 36, class: 'sc-sub', 'text-anchor': 'middle' }, inner).textContent = d.sub;
      } else if (node.kind === 'chip' || node.kind === 'cell') {
        const size = d.fontSize || 14;
        const w = d.w || textWidth(node.text, size) + 24;
        const h = d.h || size + 18;
        el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: node.kind === 'chip' ? h / 2 : 8, class: 'sc-chip-bg' }, inner);
        el('text', { y: size * 0.35, class: 'sc-chip-text', 'text-anchor': 'middle', 'font-size': size }, inner).textContent = node.text;
      } else if (node.kind === 'text') {
        el('text', { class: 'sc-free-text', 'text-anchor': d.anchor || 'middle', 'font-size': d.fontSize || 15 }, inner).textContent = node.text;
      } else if (node.kind === 'bar') {
        const w = d.w || 160;
        if (d.label) el('text', { x: -w / 2, y: -12, class: 'sc-sub' }, inner).textContent = d.label;
        el('rect', { x: -w / 2, y: -7, width: w, height: 14, rx: 7, class: 'sc-bar-bg' }, inner);
        node.fill = el('rect', { x: -w / 2, y: -7, width: (w * node.value) / 100, height: 14, rx: 7, class: 'sc-bar-fill' }, inner);
        node.valueText = el('text', { x: w / 2, y: -12, class: 'sc-sub', 'text-anchor': 'end' }, inner);
        node.valueText.textContent = d.hideValue ? '' : Math.round(node.value) + (d.unit || '%');
      } else if (node.kind === 'terminal') {
        const w = d.w || 320;
        const h = d.h || 130;
        el('rect', { x: 0, y: 0, width: w, height: h, rx: 10, class: 'sc-term-bg' }, inner);
        el('rect', { x: 0, y: 0, width: w, height: 24, rx: 10, class: 'sc-term-bar' }, inner);
        ['#F87171', '#FBBF24', '#34D399'].forEach((col, i) => el('circle', { cx: 14 + i * 14, cy: 12, r: 4, fill: col }, inner));
        if (d.title) el('text', { x: w / 2, y: 16, class: 'sc-sub', 'text-anchor': 'middle' }, inner).textContent = d.title;
        node.textGroup = el('g', { class: 'sc-term-text', transform: 'translate(12 44)' }, inner);
        this.renderLines(node);
      } else if (node.kind === 'zone') {
        el('rect', { x: 0, y: 0, width: d.w, height: d.h, rx: 18, class: 'sc-zone-bg' }, inner);
        if (d.label) el('text', { x: 14, y: 22, class: 'sc-zone-label' }, inner).textContent = d.label;
      }
    }

    renderLines(node) {
      const maxLines = Math.floor(((node.def.h || 130) - 52) / 18) + 1;
      const lines = node.lines.slice(-maxLines);
      node.textGroup.innerHTML = '';
      lines.forEach((line, i) => {
        el('text', { y: i * 18, class: line.startsWith('$') ? 'sc-term-cmd' : 'sc-term-out' }, node.textGroup).textContent = line;
      });
    }

    place(node) {
      node.g.setAttribute('transform', `translate(${node.x} ${node.y})`);
    }

    center(id) {
      const n = this.nodes[id];
      if (!n) return { x: 0, y: 0 };
      if (n.kind === 'terminal' || n.kind === 'zone') {
        return { x: n.x + (n.def.w || 320) / 2, y: n.y + (n.def.h || 130) / 2 };
      }
      return { x: n.x, y: n.y };
    }

    addLink(def) {
      const path = el('path', { class: 'sc-link' + (def.dashed ? ' sc-dashed' : ''), d: '' }, this.layers.links);
      const link = { def, path };
      this.links.push(link);
      this.updateLink(link);
      if (def.hidden) path.classList.add('sc-hidden');
    }

    linkPath(from, to, curve) {
      const a = this.center(from);
      const b = this.center(to);
      if (!curve) return `M${a.x} ${a.y} L${b.x} ${b.y}`;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      return `M${a.x} ${a.y} Q${mx - (dy / len) * curve} ${my + (dx / len) * curve} ${b.x} ${b.y}`;
    }

    updateLink(link) {
      link.path.setAttribute('d', this.linkPath(link.def.from, link.def.to, link.def.curve));
    }

    updateLinksOf(id) {
      this.links.forEach((l) => { if (l.def.from === id || l.def.to === id) this.updateLink(l); });
    }

    reset() {
      Object.values(this.nodes).forEach((n) => {
        n.x = n.def.x;
        n.y = n.def.y;
        n.value = n.def.value || 0;
        n.text = n.def.text || '';
        n.lines = [];
        n.color = null;
        n.g.classList.toggle('sc-hidden', !!n.def.hidden);
        n.g.classList.remove('sc-dim', 'sc-hl', 'sc-pulse', 'sc-shake');
        this.draw(n);
        this.place(n);
      });
      this.links.forEach((l) => {
        l.path.classList.toggle('sc-hidden', !!l.def.hidden);
        this.updateLink(l);
      });
      this.layers.flows.innerHTML = '';
      this.layers.packets.innerHTML = '';
      this.layers.labels.innerHTML = '';
    }
  }

  /* ───────── Player: UI, timeline and actions ───────── */
  class Player {
    constructor(root, scene, opts) {
      this.root = root;
      this.scene = scene;
      this.opts = opts || {};
      this.level = this.opts.level || 'college';
      this.speed = this.opts.speed || 1;
      this.step = 0;
      this.playing = false;
      this.seen = new Set();
      this.timers = [];
      this.anims = [];
      this.raf = null;
      this.visible = true;
      this.build();
      this.go(0);
    }

    build() {
      const s = this.scene;
      const w = (s.stage && s.stage.w) || 800;
      const h = (s.stage && s.stage.h) || 360;
      const icons = window.ITIcons;
      const ic = (n) => (icons ? icons.svg(n, { size: 18 }) : '');
      this.root.classList.add('scene');
      this.root.setAttribute('tabindex', '0');
      this.root.innerHTML = `
        <div class="scene-head">
          <span class="scene-badge">${ic('play')} Scène animée</span>
          <h3 class="scene-title">${esc(s.title)}</h3>
          <span class="scene-count" aria-hidden="true"></span>
        </div>
        <div class="scene-stage"></div>
        <div class="scene-progress" role="group" aria-label="Étapes de la scène"></div>
        <div class="scene-caption" aria-live="polite">
          <span class="scene-step-title"></span>
          <p class="scene-step-text"></p>
        </div>
        <div class="scene-controls">
          <button type="button" class="scene-btn" data-sc="prev" aria-label="Étape précédente">${ic('prev')}</button>
          <button type="button" class="scene-btn scene-btn-main" data-sc="play" aria-label="Lecture automatique">${ic('play')}<span>Lecture</span></button>
          <button type="button" class="scene-btn scene-btn-next" data-sc="next" aria-label="Étape suivante"><span>Suivant</span>${ic('next')}</button>
          <div class="scene-speed" role="group" aria-label="Vitesse">
            ${SPEEDS.map((v) => `<button type="button" class="scene-chip${v === this.speed ? ' on' : ''}" data-sc="speed" data-v="${v}" aria-pressed="${v === this.speed}">×${v}</button>`).join('')}
          </div>
        </div>
        <div class="scene-quiz" hidden></div>`;
      const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, class: 'scene-svg', role: 'img', 'aria-label': s.title });
      this.root.querySelector('.scene-stage').appendChild(svg);
      this.stage = new Stage(svg, s);
      const progress = this.root.querySelector('.scene-progress');
      progress.innerHTML = s.steps.map((st, i) =>
        `<button type="button" class="scene-dot" data-sc="goto" data-i="${i}" aria-label="Étape ${i + 1} : ${esc(st.title)}"></button>`).join('');
      this.onClick = (e) => {
        const b = e.target.closest('[data-sc]');
        if (!b || !this.root.contains(b)) return;
        const kind = b.dataset.sc;
        if (kind === 'prev') this.go(this.step - 1);
        else if (kind === 'next') this.next();
        else if (kind === 'play') this.toggle();
        else if (kind === 'goto') this.go(parseInt(b.dataset.i, 10));
        else if (kind === 'speed') this.setSpeed(parseFloat(b.dataset.v));
        else if (kind === 'quiz') this.answer(parseInt(b.dataset.i, 10));
      };
      this.onKey = (e) => {
        if (e.target !== this.root) return;
        if (e.key === ' ') { e.preventDefault(); this.toggle(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); this.go(this.step - 1); }
      };
      this.root.addEventListener('click', this.onClick);
      this.root.addEventListener('keydown', this.onKey);
      this.onVisibility = () => { if (!document.hidden) this.startLoop(); };
      document.addEventListener('visibilitychange', this.onVisibility);
      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver((entries) => {
          this.visible = entries[0].isIntersecting;
          if (this.visible) this.startLoop();
        }, { threshold: 0.1 });
        this.observer.observe(this.root);
      }
    }

    /* ── timeline ── */
    next() {
      if (this.step >= this.scene.steps.length - 1) this.go(0);
      else this.go(this.step + 1);
    }

    toggle() {
      this.playing = !this.playing;
      if (this.playing && this.step >= this.scene.steps.length - 1) this.go(0);
      else this.scheduleAuto();
      this.updateControls();
    }

    setSpeed(v) {
      this.speed = v;
      this.root.querySelectorAll('[data-sc="speed"]').forEach((b) => {
        const on = parseFloat(b.dataset.v) === v;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on);
      });
      this.go(this.step);
    }

    setLevel(level) {
      this.level = level;
      this.renderCaption();
    }

    clear() {
      this.timers.forEach(clearTimeout);
      this.timers = [];
      this.anims = [];
      clearTimeout(this.autoTimer);
    }

    go(i) {
      const steps = this.scene.steps;
      const target = Math.max(0, Math.min(steps.length - 1, i));
      this.clear();
      this.stage.reset();
      for (let k = 0; k < target; k++) {
        (steps[k].actions || []).forEach((a) => { if (PERSISTENT.has(a.do)) this.run(a, true); });
      }
      this.step = target;
      this.stepStart = performance.now();
      (steps[target].actions || []).forEach((a) => this.run(a, reducedMotion()));
      this.seen.add(target);
      if (target === steps.length - 1) {
        if (this.playing) this.playing = false;
        this.complete();
      }
      this.renderCaption();
      this.updateControls();
      this.scheduleAuto();
      this.startLoop();
    }

    scheduleAuto() {
      clearTimeout(this.autoTimer);
      if (!this.playing) return;
      const text = this.captionText();
      const words = text.split(/\s+/).length;
      const delay = Math.max(4500, words * 360) / this.speed;
      this.autoTimer = setTimeout(() => this.next(), delay);
    }

    complete() {
      if (this.completed) return;
      this.completed = true;
      if (this.opts.onComplete) this.opts.onComplete(this.scene.id);
      this.renderQuiz();
    }

    captionText() {
      const st = this.scene.steps[this.step];
      const t = st.text || {};
      return t[this.level] || t.college || '';
    }

    renderCaption() {
      const st = this.scene.steps[this.step];
      const title = this.root.querySelector('.scene-step-title');
      const p = this.root.querySelector('.scene-step-text');
      title.textContent = `Étape ${this.step + 1} · ${st.title}`;
      p.textContent = this.captionText();
      p.classList.remove('scene-fade');
      void p.offsetWidth;
      p.classList.add('scene-fade');
      this.root.querySelector('.scene-count').textContent = `${this.step + 1} / ${this.scene.steps.length}`;
      this.stage.svg.setAttribute('aria-label', `${this.scene.title} — ${st.title}`);
    }

    updateControls() {
      const last = this.step >= this.scene.steps.length - 1;
      const icons = window.ITIcons;
      const ic = (n) => (icons ? icons.svg(n, { size: 18 }) : '');
      this.root.querySelector('[data-sc="prev"]').disabled = this.step === 0;
      const play = this.root.querySelector('[data-sc="play"]');
      play.innerHTML = this.playing ? `${ic('pause')}<span>Pause</span>` : `${ic('play')}<span>Lecture</span>`;
      play.setAttribute('aria-label', this.playing ? 'Mettre en pause' : 'Lecture automatique');
      const next = this.root.querySelector('[data-sc="next"]');
      next.innerHTML = last ? `<span>Rejouer</span>${ic('replay')}` : `<span>Suivant</span>${ic('next')}`;
      next.setAttribute('aria-label', last ? 'Rejouer la scène' : 'Étape suivante');
      this.root.classList.toggle('is-paused', !this.playing);
      this.root.querySelectorAll('.scene-dot').forEach((d, i) => {
        d.classList.toggle('current', i === this.step);
        d.classList.toggle('done', i < this.step || this.seen.has(i));
        d.setAttribute('aria-current', i === this.step ? 'step' : 'false');
      });
    }

    /* ── quiz ── */
    renderQuiz() {
      const q = this.scene.quiz;
      const box = this.root.querySelector('.scene-quiz');
      if (!q || !box) return;
      box.hidden = false;
      if (this.opts.answered) {
        box.innerHTML = `<div class="scene-quiz-head">Mini-défi déjà relevé</div><p class="scene-quiz-q">${esc(q.question)}</p>`;
        return;
      }
      box.innerHTML = `
        <div class="scene-quiz-head">Mini-défi · +5 XP au premier essai</div>
        <p class="scene-quiz-q">${esc(q.question)}</p>
        <div class="scene-quiz-options">${q.options.map((o, i) =>
          `<button type="button" class="scene-quiz-opt" data-sc="quiz" data-i="${i}">${esc(o)}</button>`).join('')}</div>
        <p class="scene-quiz-fb" aria-live="polite"></p>`;
    }

    async answer(i) {
      if (this.answering || !this.opts.onQuiz) return;
      this.answering = true;
      const box = this.root.querySelector('.scene-quiz');
      const buttons = box.querySelectorAll('.scene-quiz-opt');
      buttons.forEach((b) => { b.disabled = true; });
      const fb = box.querySelector('.scene-quiz-fb');
      try {
        const res = await this.opts.onQuiz(this.scene.id, i);
        buttons.forEach((b, k) => {
          if (k === res.correctIndex) b.classList.add('correct');
          else if (k === i) b.classList.add('wrong');
        });
        fb.textContent = (res.correct ? 'Bien vu ! ' : 'Pas tout à fait. ') + (res.explanation || '') +
          (res.xpGained ? ` (+${res.xpGained} XP)` : '');
        fb.className = 'scene-quiz-fb ' + (res.correct ? 'ok' : 'ko');
      } catch (err) {
        buttons.forEach((b) => { b.disabled = false; });
        fb.textContent = err && err.message ? err.message : 'Impossible de vérifier la réponse.';
        fb.className = 'scene-quiz-fb ko';
      }
      this.answering = false;
    }

    /* ── actions ── */
    later(ms, fn) {
      this.timers.push(setTimeout(fn, ms / this.speed));
    }

    run(a, instant) {
      // A delay on a persistent action is honoured only when animating; replays apply it at once.
      if (a.delay && !instant && PERSISTENT.has(a.do) && a.do !== 'type' && a.do !== 'fill') {
        const { delay, ...now } = a;
        this.later(delay * 1000, () => this.run(now, false));
        return;
      }
      const st = this.stage;
      const ids = [].concat(a.nodes || a.node || []);
      switch (a.do) {
        case 'show':
          ids.forEach((id) => st.nodes[id] && st.nodes[id].g.classList.remove('sc-hidden'));
          (a.links || []).forEach((n) => st.links[n] && st.links[n].path.classList.remove('sc-hidden'));
          break;
        case 'hide':
          ids.forEach((id) => st.nodes[id] && st.nodes[id].g.classList.add('sc-hidden'));
          (a.links || []).forEach((n) => st.links[n] && st.links[n].path.classList.add('sc-hidden'));
          break;
        case 'dim':
          ids.forEach((id) => st.nodes[id] && st.nodes[id].g.classList.add('sc-dim'));
          break;
        case 'undim':
          ids.forEach((id) => st.nodes[id] && st.nodes[id].g.classList.remove('sc-dim'));
          break;
        case 'highlight':
        case 'pulse':
        case 'shake':
          ids.forEach((id) => {
            const n = st.nodes[id];
            if (!n) return;
            n.inner.style.setProperty('--hc', color(a.color));
            const cls = a.do === 'highlight' ? 'sc-hl' : a.do === 'pulse' ? 'sc-pulse' : 'sc-shake';
            if (a.delay && !instant) this.later(a.delay * 1000, () => n.g.classList.add(cls));
            else n.g.classList.add(cls);
          });
          break;
        case 'color':
          ids.forEach((id) => { const n = st.nodes[id]; if (n) { n.color = a.color; st.draw(n); } });
          break;
        case 'text':
          ids.forEach((id) => { const n = st.nodes[id]; if (n) { n.text = a.text; st.draw(n); } });
          break;
        case 'fill':
          ids.forEach((id) => this.fill(st.nodes[id], a, instant));
          break;
        case 'counter':
          ids.forEach((id) => this.counter(st.nodes[id], a, instant));
          break;
        case 'type':
          ids.forEach((id) => this.type(st.nodes[id], a, instant));
          break;
        case 'move':
          ids.forEach((id) => this.move(st.nodes[id], a.to, instant, a.duration));
          break;
        case 'swap': {
          const na = st.nodes[a.a];
          const nb = st.nodes[a.b];
          if (!na || !nb) break;
          const pa = { x: na.x, y: na.y };
          this.move(na, { x: nb.x, y: nb.y }, instant, a.duration);
          this.move(nb, pa, instant, a.duration);
          break;
        }
        case 'flow':
          this.flow(a);
          break;
        case 'travel':
          this.travel(a, instant);
          break;
        case 'label':
          if (a.delay && !instant) this.later(a.delay * 1000, () => this.label(a));
          else this.label(a);
          break;
        default:
          break;
      }
    }

    fill(n, a, instant) {
      if (!n || n.kind !== 'bar') return;
      const w = n.def.w || 160;
      const from = n.value;
      n.value = a.to;
      if (a.color) n.fill.style.fill = color(a.color);
      const show = (v) => { if (!n.def.hideValue) n.valueText.textContent = Math.round(v) + (n.def.unit || '%'); };
      if (instant) {
        n.fill.setAttribute('width', (w * a.to) / 100);
        show(a.to);
        return;
      }
      this.anims.push({ start: performance.now() + (a.delay || 0) * 1000 / this.speed, dur: (a.duration || 1.2) * 1000 / this.speed,
        tick: (p) => {
          const v = from + (a.to - from) * ease(p);
          n.fill.setAttribute('width', (w * v) / 100);
          show(v);
        } });
    }

    counter(n, a, instant) {
      if (!n) return;
      const fmt = (v) => `${a.prefix || ''}${Math.round(v).toLocaleString('fr-FR')}${a.suffix || ''}`;
      if (instant) { n.text = fmt(a.to); this.stage.draw(n); return; }
      this.anims.push({ start: performance.now(), dur: (a.duration || 1.5) * 1000 / this.speed,
        tick: (p) => { n.text = fmt((a.from || 0) + (a.to - (a.from || 0)) * ease(p)); this.stage.draw(n); } });
    }

    type(n, a, instant) {
      if (!n || n.kind !== 'terminal') return;
      const lines = String(a.text).split('\n');
      if (instant) {
        n.lines.push(...lines);
        this.stage.renderLines(n);
        return;
      }
      let delay = (a.delay || 0) * 1000;
      lines.forEach((line) => {
        if (line.startsWith('$')) {
          for (let c = 1; c <= line.length; c++) {
            const part = line.slice(0, c);
            this.later(delay, () => {
              if (c === 1) n.lines.push(part); else n.lines[n.lines.length - 1] = part;
              this.stage.renderLines(n);
            });
            delay += 45;
          }
          delay += 250;
        } else {
          this.later(delay, () => { n.lines.push(line); this.stage.renderLines(n); });
          delay += 120;
        }
      });
    }

    move(n, to, instant, duration) {
      if (!n || !to) return;
      const from = { x: n.x, y: n.y };
      n.x = to.x;
      n.y = to.y;
      if (instant) {
        this.stage.place(n);
        this.stage.updateLinksOf(n.def.id);
        return;
      }
      this.anims.push({ start: performance.now(), dur: (duration || 0.9) * 1000 / this.speed,
        tick: (p) => {
          const e = ease(p);
          n.g.setAttribute('transform', `translate(${from.x + (to.x - from.x) * e} ${from.y + (to.y - from.y) * e})`);
          if (p >= 1) this.stage.place(n);
          const save = { x: n.x, y: n.y };
          n.x = from.x + (to.x - from.x) * e;
          n.y = from.y + (to.y - from.y) * e;
          this.stage.updateLinksOf(n.def.id);
          n.x = save.x;
          n.y = save.y;
        } });
    }

    flow(a) {
      const pairs = a.path ? a.path.slice(1).map((id, i) => [a.path[i], id]) : [[a.from, a.to]];
      pairs.forEach(([from, to]) => {
        const p = el('path', { class: 'sc-flow' + (a.reverse ? ' sc-reverse' : ''), d: this.stage.linkPath(from, to, a.curve) }, this.stage.layers.flows);
        p.style.stroke = color(a.color);
      });
    }

    label(a) {
      const c = this.stage.center(a.node);
      const size = a.fontSize || 13;
      const w = textWidth(a.text, size) + 20;
      const h = size + 14;
      const off = a.offset || 58;
      const pos = { top: [0, -off], bottom: [0, off], left: [-off - w / 2, 0], right: [off + w / 2, 0] }[a.pos || 'top'];
      const g = el('g', { class: 'sc-callout', transform: `translate(${c.x + pos[0] + (a.dx || 0)} ${c.y + pos[1] + (a.dy || 0)})` }, this.stage.layers.labels);
      g.style.setProperty('--c', color(a.color));
      el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 8 }, g);
      el('text', { y: size * 0.35, 'text-anchor': 'middle', 'font-size': size }, g).textContent = a.text;
    }

    travel(a, instant) {
      const pts = a.path.map((id) => this.stage.center(id));
      const segs = [];
      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        segs.push({ a: pts[i - 1], b: pts[i], len });
        total += len;
      }
      if (!total) return;
      const count = a.count || 1;
      const c = color(a.color);
      const packets = [];
      for (let k = 0; k < count; k++) {
        const g = el('g', { class: 'sc-packet' }, this.stage.layers.packets);
        g.style.setProperty('--c', c);
        if (a.shape === 'mail') {
          el('rect', { x: -12, y: -8, width: 24, height: 16, rx: 3 }, g);
          el('path', { d: 'M-12 -7 L0 2 L12 -7', class: 'sc-packet-line' }, g);
        } else if (a.shape === 'dot') {
          el('circle', { r: 7 }, g);
        } else {
          el('rect', { x: -10, y: -10, width: 20, height: 20, rx: 6 }, g);
        }
        if (a.label) el('text', { y: -16, 'text-anchor': 'middle', class: 'sc-packet-label' }, g).textContent = a.label;
        packets.push(g);
      }
      const at = (f) => {
        let d = f * total;
        for (const s of segs) {
          if (d <= s.len) {
            const r = s.len ? d / s.len : 0;
            return { x: s.a.x + (s.b.x - s.a.x) * r, y: s.a.y + (s.b.y - s.a.y) * r };
          }
          d -= s.len;
        }
        return pts[pts.length - 1];
      };
      const dur = (a.duration || Math.max(1.4, total / 260)) * 1000 / this.speed;
      const gap = (a.gap || 0.35) * 1000 / this.speed;
      const rest = (a.rest == null ? 0.6 : a.rest) * 1000 / this.speed;
      const delay = (a.delay || 0) * 1000 / this.speed;
      if (instant) {
        packets.forEach((g, k) => {
          const p = a.once ? at(1) : at(Math.max(0, 0.85 - k * 0.15));
          g.setAttribute('transform', `translate(${p.x} ${p.y})`);
        });
        return;
      }
      const start = performance.now();
      this.anims.push({ start, dur: Infinity, loop: true,
        tick: (_, now) => {
          const t = now - start - delay;
          packets.forEach((g, k) => {
            let local = t - k * gap;
            if (a.once) {
              const f = Math.max(0, Math.min(1, local / dur));
              const p = at(ease(f));
              g.setAttribute('transform', `translate(${p.x} ${p.y})`);
              g.style.opacity = local < 0 ? 0 : 1;
              return;
            }
            if (local < 0) { g.style.opacity = 0; return; }
            local %= dur + rest + gap * (count - 1);
            if (local > dur) { g.style.opacity = 0; return; }
            const f = local / dur;
            const p = at(ease(f));
            g.setAttribute('transform', `translate(${p.x} ${p.y})`);
            g.style.opacity = f < 0.06 ? f / 0.06 : f > 0.94 ? (1 - f) / 0.06 : 1;
          });
        } });
    }

    /* ── frame loop: one rAF for every running animation of this scene ── */
    startLoop() {
      if (this.raf || !this.anims.length) return;
      const frame = (now) => {
        this.raf = null;
        if (!this.visible || document.hidden || this.destroyed) return;
        this.anims = this.anims.filter((an) => {
          if (now < an.start) return true;
          const p = an.loop ? 0 : Math.min(1, (now - an.start) / an.dur);
          an.tick(p, now);
          return an.loop || p < 1;
        });
        if (this.anims.length) this.raf = requestAnimationFrame(frame);
      };
      this.raf = requestAnimationFrame(frame);
    }

    destroy() {
      this.destroyed = true;
      this.clear();
      if (this.raf) cancelAnimationFrame(this.raf);
      if (this.observer) this.observer.disconnect();
      this.root.removeEventListener('click', this.onClick);
      this.root.removeEventListener('keydown', this.onKey);
      document.removeEventListener('visibilitychange', this.onVisibility);
    }
  }

  function mount(root, scene, opts) {
    return new Player(root, scene, opts);
  }

  window.ITScenes = { mount, LEVELS, COLORS };
})();
