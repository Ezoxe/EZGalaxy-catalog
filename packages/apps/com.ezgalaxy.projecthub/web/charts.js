/* ═══════════════════════════════════════════════════════════════
   Project Hub — Charts Library
   v2.0.0 — Custom SVG charts with animations
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs = {}, children = []) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v !== undefined && v !== null) el.setAttribute(k, v); });
    children.forEach(c => { if (typeof c === 'string') el.appendChild(document.createTextNode(c)); else if (c) el.appendChild(c); });
    return el;
  }

  /* ── Line Chart ─────────────────────────────────────────── */
  function line({ data = [], width = 400, height = 200, color = '#00d4ff', areaFill = true, dots = true, grid = true, labels = true, animate = true, tooltips = true, xKey = 'label', yKey = 'value', yMin, yMax } = {}) {
    if (!data.length) return emptyChart(width, height);
    const pad = { top: 20, right: 20, bottom: labels ? 30 : 10, left: labels ? 45 : 10 };
    const w = width - pad.left - pad.right;
    const h = height - pad.top - pad.bottom;
    const values = data.map(d => d[yKey]);
    const min = yMin !== undefined ? yMin : Math.min(...values) * 0.9;
    const max = yMax !== undefined ? yMax : Math.max(...values) * 1.1 || 1;

    const scaleX = (i) => pad.left + (i / Math.max(data.length - 1, 1)) * w;
    const scaleY = (v) => pad.top + h - ((v - min) / (max - min || 1)) * h;

    const root = svg('svg', { width, height, class: 'chart-svg chart-line', viewBox: `0 0 ${width} ${height}` });
    const defs = svg('defs');

    // Gradient for area
    if (areaFill) {
      const grad = svg('linearGradient', { id: 'lg-' + Math.random().toString(36).slice(2, 6), x1: '0', y1: '0', x2: '0', y2: '1' });
      grad.appendChild(svg('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '0.3' }));
      grad.appendChild(svg('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0.02' }));
      defs.appendChild(grad);
      root.appendChild(defs);

      const areaPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(d[yKey])}`).join(' ');
      const area = svg('path', {
        d: areaPath + ` L${scaleX(data.length - 1)},${pad.top + h} L${pad.left},${pad.top + h} Z`,
        fill: `url(#${grad.id})`, class: 'chart-area'
      });
      root.appendChild(area);
    }

    // Grid
    if (grid) {
      const gridG = svg('g', { class: 'chart-grid' });
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + (h / 4) * i;
        gridG.appendChild(svg('line', { x1: pad.left, y1: y, x2: width - pad.right, y2: y, stroke: 'rgba(255,255,255,0.06)', 'stroke-width': 1 }));
        if (labels) {
          const val = max - (i / 4) * (max - min);
          gridG.appendChild(svg('text', { x: pad.left - 8, y: y + 4, fill: 'rgba(255,255,255,0.4)', 'font-size': '10', 'text-anchor': 'end' }, [Math.round(val).toString()]));
        }
      }
      root.appendChild(gridG);
    }

    // Line
    const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(d[yKey])}`).join(' ');
    const lineEl = svg('path', { d: linePath, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'chart-line-path' });
    if (animate) {
      const len = lineEl.getTotalLength ? 1000 : 0;
      lineEl.style.strokeDasharray = '1000';
      lineEl.style.strokeDashoffset = '1000';
      lineEl.style.animation = 'chartStrokeDraw 1.2s ease-out forwards';
    }
    root.appendChild(lineEl);

    // Dots + tooltips
    if (dots || tooltips) {
      const dotsG = svg('g', { class: 'chart-dots' });
      data.forEach((d, i) => {
        const cx = scaleX(i), cy = scaleY(d[yKey]);
        if (dots) {
          dotsG.appendChild(svg('circle', { cx, cy, r: 3, fill: color, stroke: '#0d1117', 'stroke-width': 2, class: 'chart-dot' }));
        }
        if (tooltips) {
          const hit = svg('circle', { cx, cy, r: 12, fill: 'transparent', class: 'chart-hit' });
          const tip = createTooltip(`${d[xKey] || ''}: ${d[yKey]}`, cx, cy - 18);
          hit.addEventListener('mouseenter', () => tip.style.opacity = '1');
          hit.addEventListener('mouseleave', () => tip.style.opacity = '0');
          dotsG.appendChild(hit);
          dotsG.appendChild(tip);
        }
      });
      root.appendChild(dotsG);
    }

    // X labels
    if (labels && data.length <= 20) {
      const lblG = svg('g', { class: 'chart-x-labels' });
      const step = Math.max(1, Math.floor(data.length / 8));
      data.forEach((d, i) => {
        if (i % step === 0 || i === data.length - 1) {
          lblG.appendChild(svg('text', { x: scaleX(i), y: height - 5, fill: 'rgba(255,255,255,0.4)', 'font-size': '9', 'text-anchor': 'middle' }, [d[xKey] || '']));
        }
      });
      root.appendChild(lblG);
    }

    return root;
  }

  /* ── Bar Chart ──────────────────────────────────────────── */
  function bar({ data = [], width = 400, height = 200, colors = ['#00d4ff', '#a855f7'], horizontal = false, labels = true, animate = true, tooltips = true, stacked = false } = {}) {
    if (!data.length) return emptyChart(width, height);
    const pad = { top: 15, right: 15, bottom: labels ? 35 : 10, left: labels ? 50 : 10 };
    const w = width - pad.left - pad.right;
    const h = height - pad.top - pad.bottom;
    const maxVal = Math.max(...data.map(d => Math.max(d.value || 0, d.value2 || 0))) * 1.15 || 1;

    const root = svg('svg', { width, height, class: 'chart-svg chart-bar', viewBox: `0 0 ${width} ${height}` });

    // Grid
    const gridG = svg('g', { class: 'chart-grid' });
    for (let i = 0; i <= 4; i++) {
      if (horizontal) {
        const x = pad.left + (w / 4) * i;
        gridG.appendChild(svg('line', { x1: x, y1: pad.top, x2: x, y2: pad.top + h, stroke: 'rgba(255,255,255,0.06)' }));
      } else {
        const y = pad.top + (h / 4) * i;
        gridG.appendChild(svg('line', { x1: pad.left, y1: y, x2: width - pad.right, y2: y, stroke: 'rgba(255,255,255,0.06)' }));
        if (labels) {
          const val = maxVal - (i / 4) * maxVal;
          gridG.appendChild(svg('text', { x: pad.left - 8, y: y + 4, fill: 'rgba(255,255,255,0.4)', 'font-size': '10', 'text-anchor': 'end' }, [formatNumber(val)]));
        }
      }
    }
    root.appendChild(gridG);

    const barWidth = (horizontal ? h : w) / data.length * 0.65;
    const gap = (horizontal ? h : w) / data.length * 0.35;

    data.forEach((d, i) => {
      const color1 = d.color || colors[0];
      const color2 = colors[1];

      if (horizontal) {
        const y = pad.top + i * (barWidth + gap) + gap / 2;
        const bw = (d.value / maxVal) * w;
        const rect = svg('rect', { x: pad.left, y, width: animate ? 0 : bw, height: barWidth, rx: 4, fill: color1, class: 'chart-bar-rect' });
        if (animate) { rect.style.transition = `width 0.6s ease ${i * 0.05}s`; setTimeout(() => rect.setAttribute('width', bw), 50); }
        root.appendChild(rect);
        if (labels) {
          root.appendChild(svg('text', { x: pad.left - 5, y: y + barWidth / 2 + 4, fill: 'rgba(255,255,255,0.6)', 'font-size': '10', 'text-anchor': 'end' }, [d.label || '']));
        }
      } else {
        const x = pad.left + i * (barWidth + gap) + gap / 2;
        const bh = (d.value / maxVal) * h;
        const sub = d.value2 !== undefined;

        // Primary bar
        const rect = svg('rect', { x: sub ? x : x, y: pad.top + h - (animate ? 0 : bh), width: sub ? barWidth * 0.48 : barWidth, height: animate ? 0 : bh, rx: 3, fill: color1, class: 'chart-bar-rect' });
        if (animate) { rect.style.transition = `y 0.6s ease ${i * 0.05}s, height 0.6s ease ${i * 0.05}s`; setTimeout(() => { rect.setAttribute('y', pad.top + h - bh); rect.setAttribute('height', bh); }, 50); }
        root.appendChild(rect);

        // Secondary bar
        if (sub) {
          const bh2 = (d.value2 / maxVal) * h;
          const r2 = svg('rect', { x: x + barWidth * 0.52, y: pad.top + h - (animate ? 0 : bh2), width: barWidth * 0.48, height: animate ? 0 : bh2, rx: 3, fill: color2, class: 'chart-bar-rect' });
          if (animate) { r2.style.transition = `y 0.6s ease ${i * 0.05 + 0.1}s, height 0.6s ease ${i * 0.05 + 0.1}s`; setTimeout(() => { r2.setAttribute('y', pad.top + h - bh2); r2.setAttribute('height', bh2); }, 50); }
          root.appendChild(r2);
        }

        if (labels) {
          root.appendChild(svg('text', { x: x + barWidth / 2, y: height - 8, fill: 'rgba(255,255,255,0.5)', 'font-size': '9', 'text-anchor': 'middle' }, [d.label || '']));
        }
      }

      if (tooltips) {
        const hitX = horizontal ? pad.left : pad.left + i * (barWidth + gap);
        const hitY = horizontal ? pad.top + i * (barWidth + gap) : pad.top;
        const hitW = horizontal ? w : barWidth + gap;
        const hitH = horizontal ? barWidth + gap : h;
        const hit = svg('rect', { x: hitX, y: hitY, width: hitW, height: hitH, fill: 'transparent', class: 'chart-hit' });
        const tipText = d.value2 !== undefined ? `${d.label}: ${formatNumber(d.value)} / ${formatNumber(d.value2)}` : `${d.label}: ${formatNumber(d.value)}`;
        const tip = createTooltip(tipText, hitX + hitW / 2, hitY);
        hit.addEventListener('mouseenter', () => tip.style.opacity = '1');
        hit.addEventListener('mouseleave', () => tip.style.opacity = '0');
        root.appendChild(hit);
        root.appendChild(tip);
      }
    });

    return root;
  }

  /* ── Donut Chart ────────────────────────────────────────── */
  function donut({ data = [], size = 200, thickness = 30, centerText = '', centerSub = '', animate = true, legend = true } = {}) {
    if (!data.length) return emptyChart(size, size);
    const container = document.createElement('div');
    container.className = 'chart-donut-container';

    const half = size / 2;
    const radius = half - thickness / 2 - 5;
    const circumference = 2 * Math.PI * radius;
    const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;

    const root = svg('svg', { width: size, height: size, class: 'chart-svg chart-donut', viewBox: `0 0 ${size} ${size}` });

    // Background ring
    root.appendChild(svg('circle', { cx: half, cy: half, r: radius, fill: 'none', stroke: 'rgba(255,255,255,0.05)', 'stroke-width': thickness }));

    let offset = 0;
    data.forEach((d, i) => {
      const pct = d.value / total;
      const len = pct * circumference;
      const circle = svg('circle', {
        cx: half, cy: half, r: radius, fill: 'none',
        stroke: d.color || `hsl(${i * 60}, 70%, 60%)`,
        'stroke-width': thickness - 2,
        'stroke-dasharray': `${len} ${circumference - len}`,
        'stroke-dashoffset': -offset,
        'stroke-linecap': 'round',
        transform: `rotate(-90 ${half} ${half})`,
        class: 'chart-donut-slice',
      });
      if (animate) {
        circle.style.opacity = '0';
        circle.style.animation = `chartFadeScale 0.5s ease ${i * 0.1}s forwards`;
      }
      // Hover
      circle.addEventListener('mouseenter', () => { circle.style.strokeWidth = thickness + 4; circle.style.filter = 'brightness(1.2)'; });
      circle.addEventListener('mouseleave', () => { circle.style.strokeWidth = thickness - 2; circle.style.filter = ''; });
      root.appendChild(circle);
      offset += len;
    });

    // Center text
    if (centerText) {
      root.appendChild(svg('text', { x: half, y: half - (centerSub ? 6 : 0), fill: '#fff', 'font-size': '22', 'font-weight': 'bold', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, [centerText]));
    }
    if (centerSub) {
      root.appendChild(svg('text', { x: half, y: half + 16, fill: 'rgba(255,255,255,0.5)', 'font-size': '11', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, [centerSub]));
    }

    container.appendChild(root);

    // Legend
    if (legend) {
      const leg = document.createElement('div');
      leg.className = 'chart-legend';
      data.forEach((d, i) => {
        const item = document.createElement('div');
        item.className = 'chart-legend-item';
        const pct = Math.round((d.value / total) * 100);
        item.innerHTML = `<span class="chart-legend-dot" style="background:${d.color || `hsl(${i * 60},70%,60%)`}"></span><span class="chart-legend-label">${d.label || d.name || ''}</span><span class="chart-legend-value">${pct}%</span>`;
        leg.appendChild(item);
      });
      container.appendChild(leg);
    }

    return container;
  }

  /* ── Circular Progress ──────────────────────────────────── */
  function circular({ value = 0, max = 100, size = 80, thickness = 6, color = '#00d4ff', label = '', animate = true } = {}) {
    const half = size / 2;
    const radius = half - thickness / 2 - 2;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.min(value / (max || 1), 1);
    const dashLen = pct * circumference;

    const root = svg('svg', { width: size, height: size, class: 'chart-svg chart-circular', viewBox: `0 0 ${size} ${size}` });
    root.appendChild(svg('circle', { cx: half, cy: half, r: radius, fill: 'none', stroke: 'rgba(255,255,255,0.08)', 'stroke-width': thickness }));

    const prog = svg('circle', {
      cx: half, cy: half, r: radius, fill: 'none', stroke: color,
      'stroke-width': thickness, 'stroke-linecap': 'round',
      'stroke-dasharray': `${animate ? 0 : dashLen} ${circumference}`,
      transform: `rotate(-90 ${half} ${half})`,
      class: 'chart-circular-progress',
    });
    if (animate) {
      prog.style.transition = 'stroke-dasharray 1s ease';
      setTimeout(() => prog.setAttribute('stroke-dasharray', `${dashLen} ${circumference}`), 50);
    }
    root.appendChild(prog);

    root.appendChild(svg('text', { x: half, y: half - (label ? 5 : 0), fill: '#fff', 'font-size': size > 60 ? '16' : '12', 'font-weight': 'bold', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, [Math.round(pct * 100) + '%']));
    if (label) {
      root.appendChild(svg('text', { x: half, y: half + 12, fill: 'rgba(255,255,255,0.5)', 'font-size': '9', 'text-anchor': 'middle' }, [label]));
    }

    return root;
  }

  /* ── Sparkline ──────────────────────────────────────────── */
  function sparkline({ data = [], width = 100, height = 30, color = '#00d4ff', fill = true } = {}) {
    if (!data.length) return svg('svg', { width, height });
    const min = Math.min(...data) * 0.9;
    const max = Math.max(...data) * 1.1 || 1;
    const sx = (i) => (i / Math.max(data.length - 1, 1)) * width;
    const sy = (v) => height - ((v - min) / (max - min || 1)) * height;

    const root = svg('svg', { width, height, class: 'chart-sparkline', viewBox: `0 0 ${width} ${height}` });

    if (fill) {
      const id = 'sp-' + Math.random().toString(36).slice(2, 6);
      const defs = svg('defs');
      const grad = svg('linearGradient', { id, x1: '0', y1: '0', x2: '0', y2: '1' });
      grad.appendChild(svg('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '0.25' }));
      grad.appendChild(svg('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0' }));
      defs.appendChild(grad);
      root.appendChild(defs);
      const aPath = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(i)},${sy(v)}`).join(' ') + ` L${width},${height} L0,${height} Z`;
      root.appendChild(svg('path', { d: aPath, fill: `url(#${id})` }));
    }

    const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(i)},${sy(v)}`).join(' ');
    root.appendChild(svg('path', { d: path, fill: 'none', stroke: color, 'stroke-width': 1.5, 'stroke-linecap': 'round' }));

    return root;
  }

  /* ── Progress Bar ───────────────────────────────────────── */
  function progress({ value = 0, max = 100, width = 200, height = 8, color = '#00d4ff', label = '', showValue = true, animate = true } = {}) {
    const container = document.createElement('div');
    container.className = 'chart-progress-container';

    if (label || showValue) {
      const header = document.createElement('div');
      header.className = 'chart-progress-header';
      if (label) { const l = document.createElement('span'); l.className = 'chart-progress-label'; l.textContent = label; header.appendChild(l); }
      if (showValue) { const v = document.createElement('span'); v.className = 'chart-progress-value'; v.textContent = Math.round((value / (max || 1)) * 100) + '%'; header.appendChild(v); }
      container.appendChild(header);
    }

    const track = document.createElement('div');
    track.className = 'chart-progress-track';
    track.style.width = width + 'px';
    track.style.height = height + 'px';

    const fill = document.createElement('div');
    fill.className = 'chart-progress-fill';
    fill.style.background = `linear-gradient(90deg, ${color}, ${adjustBrightness(color, 30)})`;
    fill.style.width = animate ? '0%' : Math.min(100, (value / (max || 1)) * 100) + '%';
    fill.style.height = '100%';
    if (animate) {
      fill.style.transition = 'width 0.8s ease';
      setTimeout(() => { fill.style.width = Math.min(100, (value / (max || 1)) * 100) + '%'; }, 50);
    }

    track.appendChild(fill);
    container.appendChild(track);
    return container;
  }

  /* ── Heatmap (GitHub-style) ─────────────────────────────── */
  function heatmap({ data = [], weeks = 12, color = '#00d4ff', cellSize = 14, gap = 3 } = {}) {
    const cols = weeks;
    const rows = 7;
    const w = cols * (cellSize + gap) + 30;
    const h = rows * (cellSize + gap) + 20;
    const maxVal = Math.max(...data.map(d => d.value || 0), 1);

    const root = svg('svg', { width: w, height: h, class: 'chart-svg chart-heatmap', viewBox: `0 0 ${w} ${h}` });

    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    days.forEach((d, i) => {
      if (i % 2 === 0) {
        root.appendChild(svg('text', { x: 0, y: 20 + i * (cellSize + gap) + cellSize / 2 + 3, fill: 'rgba(255,255,255,0.3)', 'font-size': '9' }, [d]));
      }
    });

    data.forEach((d, idx) => {
      const col = Math.floor(idx / 7);
      const row = idx % 7;
      const intensity = d.value / maxVal;
      const opacity = 0.1 + intensity * 0.8;
      const rect = svg('rect', {
        x: 25 + col * (cellSize + gap), y: 10 + row * (cellSize + gap),
        width: cellSize, height: cellSize, rx: 3,
        fill: color, opacity: opacity.toFixed(2), class: 'chart-heatmap-cell'
      });
      rect.addEventListener('mouseenter', () => { rect.setAttribute('stroke', '#fff'); rect.setAttribute('stroke-width', '1'); });
      rect.addEventListener('mouseleave', () => { rect.removeAttribute('stroke'); rect.removeAttribute('stroke-width'); });
      root.appendChild(rect);
    });

    return root;
  }

  /* ── Radar Chart ────────────────────────────────────────── */
  function radar({ data = [], size = 200, color = '#00d4ff', fillOpacity = 0.2 } = {}) {
    if (!data.length) return emptyChart(size, size);
    const center = size / 2;
    const radius = center - 30;
    const n = data.length;
    const maxVal = Math.max(...data.map(d => d.value || 0), 1);

    const root = svg('svg', { width: size, height: size, class: 'chart-svg chart-radar', viewBox: `0 0 ${size} ${size}` });

    // Grid rings
    for (let ring = 1; ring <= 4; ring++) {
      const r = (radius / 4) * ring;
      const points = [];
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        points.push(`${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`);
      }
      root.appendChild(svg('polygon', { points: points.join(' '), fill: 'none', stroke: 'rgba(255,255,255,0.08)', 'stroke-width': 1 }));
    }

    // Axis lines
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      root.appendChild(svg('line', { x1: center, y1: center, x2: x, y2: y, stroke: 'rgba(255,255,255,0.1)', 'stroke-width': 1 }));
      // Label
      const lx = center + (radius + 18) * Math.cos(angle);
      const ly = center + (radius + 18) * Math.sin(angle);
      root.appendChild(svg('text', { x: lx, y: ly + 3, fill: 'rgba(255,255,255,0.6)', 'font-size': '9', 'text-anchor': 'middle' }, [data[i].label || '']));
    }

    // Data polygon
    const dataPoints = [];
    data.forEach((d, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const r = (d.value / maxVal) * radius;
      dataPoints.push(`${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`);
    });
    root.appendChild(svg('polygon', { points: dataPoints.join(' '), fill: color, 'fill-opacity': fillOpacity, stroke: color, 'stroke-width': 2 }));

    // Dots
    data.forEach((d, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const r = (d.value / maxVal) * radius;
      root.appendChild(svg('circle', { cx: center + r * Math.cos(angle), cy: center + r * Math.sin(angle), r: 3.5, fill: color, stroke: '#0d1117', 'stroke-width': 2 }));
    });

    return root;
  }

  /* ── Burndown Chart ─────────────────────────────────────── */
  function burndown({ data = [], width = 400, height = 200, animate = true } = {}) {
    if (!data.length) return emptyChart(width, height);
    const pad = { top: 20, right: 20, bottom: 30, left: 45 };
    const w = width - pad.left - pad.right;
    const h = height - pad.top - pad.bottom;
    const maxVal = Math.max(...data.map(d => Math.max(d.ideal || 0, d.predicted || 0, d.pessimistic || 0))) * 1.1 || 1;

    const sx = (i) => pad.left + (i / Math.max(data.length - 1, 1)) * w;
    const sy = (v) => pad.top + h - (v / maxVal) * h;

    const root = svg('svg', { width, height, class: 'chart-svg chart-burndown', viewBox: `0 0 ${width} ${height}` });

    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (h / 4) * i;
      root.appendChild(svg('line', { x1: pad.left, y1: y, x2: width - pad.right, y2: y, stroke: 'rgba(255,255,255,0.06)' }));
      const val = maxVal - (i / 4) * maxVal;
      root.appendChild(svg('text', { x: pad.left - 8, y: y + 4, fill: 'rgba(255,255,255,0.4)', 'font-size': '10', 'text-anchor': 'end' }, [Math.round(val).toString()]));
    }

    // Confidence band (pessimistic-optimistic)
    if (data[0] && data[0].optimistic !== undefined) {
      const bandPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${sx(i)},${sy(d.optimistic || 0)}`).join(' ')
        + data.slice().reverse().map((d, i) => ` L${sx(data.length - 1 - i)},${sy(d.pessimistic || 0)}`).join('');
      root.appendChild(svg('path', { d: bandPath + ' Z', fill: '#a855f7', 'fill-opacity': '0.08', class: 'chart-confidence-band' }));
    }

    // Ideal line (dashed)
    const idealPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${sx(i)},${sy(d.ideal || 0)}`).join(' ');
    root.appendChild(svg('path', { d: idealPath, fill: 'none', stroke: 'rgba(255,255,255,0.25)', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }));

    // Predicted line
    const predPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${sx(i)},${sy(d.predicted || 0)}`).join(' ');
    const predLine = svg('path', { d: predPath, fill: 'none', stroke: '#00d4ff', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
    root.appendChild(predLine);

    // X labels
    const step = Math.max(1, Math.floor(data.length / 7));
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        root.appendChild(svg('text', { x: sx(i), y: height - 5, fill: 'rgba(255,255,255,0.4)', 'font-size': '9', 'text-anchor': 'middle' }, [d.date ? d.date.slice(5) : '']));
      }
    });

    return root;
  }

  /* ── Gauge ──────────────────────────────────────────────── */
  function gauge({ value = 0, max = 100, size = 120, color, label = '', animate = true } = {}) {
    const pct = Math.min(value / (max || 1), 1);
    const half = size / 2;
    const radius = half - 12;
    const startAngle = -210;
    const endAngle = 30;
    const range = endAngle - startAngle;
    const circumference = (range / 360) * 2 * Math.PI * radius;

    if (!color) {
      color = pct > 0.75 ? '#10b981' : pct > 0.5 ? '#00d4ff' : pct > 0.25 ? '#f59e0b' : '#f43f5e';
    }

    const root = svg('svg', { width: size, height: size * 0.75, class: 'chart-svg chart-gauge', viewBox: `0 0 ${size} ${size * 0.75}` });

    // Background arc
    const bgArc = describeArc(half, half * 0.85, radius, startAngle, endAngle);
    root.appendChild(svg('path', { d: bgArc, fill: 'none', stroke: 'rgba(255,255,255,0.08)', 'stroke-width': 10, 'stroke-linecap': 'round' }));

    // Value arc
    const valAngle = startAngle + pct * range;
    const valArc = describeArc(half, half * 0.85, radius, startAngle, animate ? startAngle : valAngle);
    const valPath = svg('path', { d: valArc, fill: 'none', stroke: color, 'stroke-width': 10, 'stroke-linecap': 'round', class: 'chart-gauge-arc' });
    if (animate) {
      setTimeout(() => {
        valPath.setAttribute('d', describeArc(half, half * 0.85, radius, startAngle, valAngle));
      }, 100);
      valPath.style.transition = 'd 1s ease'; // Note: d transition limited support, using CSS fallback
    }
    root.appendChild(valPath);

    // Value text
    root.appendChild(svg('text', { x: half, y: half * 0.8, fill: '#fff', 'font-size': '20', 'font-weight': 'bold', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, [Math.round(pct * 100) + '%']));
    if (label) {
      root.appendChild(svg('text', { x: half, y: half * 0.8 + 18, fill: 'rgba(255,255,255,0.5)', 'font-size': '10', 'text-anchor': 'middle' }, [label]));
    }

    return root;
  }

  /* ── Animated Number Counter ────────────────────────────── */
  function animatedNumber(el, target, duration = 1000, prefix = '', suffix = '') {
    const start = 0;
    const startTime = performance.now();
    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(start + (target - start) * eased);
      el.textContent = prefix + formatNumber(current) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  /* ── Helpers ────────────────────────────────────────────── */
  function createTooltip(text, x, y) {
    const g = svg('g', { class: 'chart-tooltip', style: 'opacity:0;transition:opacity 0.2s' });
    const bg = svg('rect', { x: x - 40, y: y - 10, width: 80, height: 20, rx: 4, fill: 'rgba(0,0,0,0.85)' });
    const txt = svg('text', { x, y: y + 3, fill: '#fff', 'font-size': '10', 'text-anchor': 'middle' }, [text]);
    g.appendChild(bg);
    g.appendChild(txt);
    return g;
  }

  function emptyChart(w, h) {
    const root = svg('svg', { width: w, height: h, class: 'chart-svg chart-empty' });
    root.appendChild(svg('text', { x: w / 2, y: h / 2, fill: 'rgba(255,255,255,0.2)', 'font-size': '12', 'text-anchor': 'middle' }, ['No data']));
    return root;
  }

  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k';
    return n.toString();
  }

  function adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + percent);
    const g = Math.min(255, ((num >> 8) & 0xff) + percent);
    const b = Math.min(255, (num & 0xff) + percent);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function polarToCartesian(cx, cy, r, angleDeg) {
    const angleRad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
  }

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  }

  /* ── Public API ─────────────────────────────────────────── */
  window.Charts = { line, bar, donut, circular, sparkline, progress, heatmap, radar, burndown, gauge, animatedNumber, formatNumber };
})();
