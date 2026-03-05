/**
 * IT Discovery — Visual Effects Module
 * Particle system, confetti, typewriter, number animations
 */
(() => {
  'use strict';

  const Effects = {};

  /* ───────── helpers ───────── */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => Math.random() * (b - a) + a;
  const randInt = (a, b) => Math.floor(rand(a, b + 1));

  /* ═══════════════════════════════════════════
     1. PARTICLE NETWORK (canvas background)
     ═══════════════════════════════════════════ */
  Effects.initParticles = function () {
    if (reducedMotion) return;

    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const colors = ['#0ea5a4', '#3b82f6', '#8b5cf6', '#ec4899', '#22c55e'];
    const particles = [];
    const CONNECT_DIST = 120;
    const COUNT = Math.min(80, Math.floor(window.innerWidth / 16));

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = rand(0, canvas.width);
        this.y = rand(0, canvas.height);
        this.vx = rand(-0.4, 0.4);
        this.vy = rand(-0.4, 0.4);
        this.r = rand(1.2, 2.8);
        this.color = colors[randInt(0, colors.length - 1)];
        this.alpha = rand(0.3, 0.7);
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < -10 || this.x > canvas.width + 10 ||
            this.y < -10 || this.y > canvas.height + 10) {
          this.reset();
          // Re-enter from edge
          if (Math.random() < 0.5) {
            this.x = Math.random() < 0.5 ? -5 : canvas.width + 5;
            this.y = rand(0, canvas.height);
          } else {
            this.y = Math.random() < 0.5 ? -5 : canvas.height + 5;
            this.x = rand(0, canvas.width);
          }
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.alpha;
        ctx.fill();
        // Glow
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }

    for (let i = 0; i < COUNT; i++) particles.push(new Particle());

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update + draw particles
      for (const p of particles) {
        p.update();
        p.draw();
      }

      // Connect nearby particles
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            ctx.strokeStyle = particles[i].color;
            ctx.globalAlpha = (1 - dist / CONNECT_DIST) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      requestAnimationFrame(loop);
    }
    loop();
  };

  /* ═══════════════════════════════════════════
     2. CONFETTI BURST
     ═══════════════════════════════════════════ */
  Effects.confetti = function (originX, originY) {
    if (reducedMotion) return;

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden;';
    document.body.appendChild(container);

    const colors = ['#0ea5a4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#ef4444', '#fff'];
    const pieces = [];
    const COUNT = 100;
    const cx = originX || window.innerWidth / 2;
    const cy = originY || window.innerHeight / 3;

    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement('div');
      const size = rand(6, 12);
      const shape = randInt(0, 2); // 0=square, 1=circle, 2=rectangle
      el.style.cssText = `position:absolute;width:${size}px;height:${shape === 2 ? size * 2 : size}px;` +
        `background:${colors[randInt(0, colors.length - 1)]};` +
        `border-radius:${shape === 1 ? '50%' : '2px'};` +
        `left:${cx}px;top:${cy}px;pointer-events:none;`;
      container.appendChild(el);
      pieces.push({
        el,
        x: cx, y: cy,
        vx: rand(-8, 8),
        vy: rand(-14, -4),
        rot: rand(0, 360),
        rotV: rand(-10, 10),
        gravity: rand(0.25, 0.45),
        opacity: 1
      });
    }

    let frame = 0;
    const MAX_FRAMES = 180;

    function animate() {
      frame++;
      let alive = false;
      for (const p of pieces) {
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotV;
        p.vx *= 0.99;
        if (frame > MAX_FRAMES * 0.6) p.opacity -= 0.025;
        if (p.opacity > 0) alive = true;
        p.el.style.transform = `translate(${p.x - (originX || window.innerWidth / 2)}px, ${p.y - (originY || window.innerHeight / 3)}px) rotate(${p.rot}deg)`;
        p.el.style.opacity = Math.max(0, p.opacity);
      }
      if (alive && frame < MAX_FRAMES) {
        requestAnimationFrame(animate);
      } else {
        container.remove();
      }
    }
    requestAnimationFrame(animate);
  };

  /* ═══════════════════════════════════════════
     3. TYPEWRITER EFFECT
     ═══════════════════════════════════════════ */
  Effects.typewriter = function (element, text, speed) {
    if (!element) return Promise.resolve();
    speed = speed || 45;
    if (reducedMotion) {
      element.textContent = text;
      return Promise.resolve();
    }
    return new Promise(resolve => {
      element.textContent = '';
      element.classList.add('typewriter-active');
      let i = 0;
      function type() {
        if (i < text.length) {
          element.textContent += text.charAt(i);
          i++;
          setTimeout(type, speed);
        } else {
          element.classList.remove('typewriter-active');
          resolve();
        }
      }
      type();
    });
  };

  /* ═══════════════════════════════════════════
     4. ANIMATED NUMBER COUNTER
     ═══════════════════════════════════════════ */
  Effects.animateNumber = function (element, from, to, duration) {
    if (!element) return;
    duration = duration || 800;
    if (reducedMotion || from === to) {
      element.textContent = to;
      return;
    }
    const start = performance.now();
    const diff = to - from;
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(from + diff * ease);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };

  /* ═══════════════════════════════════════════
     5. GLOW PULSE
     ═══════════════════════════════════════════ */
  Effects.glowPulse = function (element, color) {
    if (!element || reducedMotion) return;
    color = color || '#0ea5a4';
    element.style.animation = 'none';
    element.offsetHeight; // reflow
    element.style.boxShadow = `0 0 0 0 ${color}`;
    element.style.animation = 'glowPulseAnim 600ms ease-out';
    element.addEventListener('animationend', function handler() {
      element.style.animation = '';
      element.style.boxShadow = '';
      element.removeEventListener('animationend', handler);
    });
  };

  /* ═══════════════════════════════════════════
     6. STAGGERED ENTRANCE
     ═══════════════════════════════════════════ */
  Effects.staggerIn = function (selector, delay) {
    if (reducedMotion) return;
    delay = delay || 80;
    const els = document.querySelectorAll(selector);
    els.forEach((el, i) => {
      el.style.opacity = '0';
      setTimeout(() => {
        el.style.transition = 'opacity 400ms ease';
        el.style.opacity = '1';
      }, i * delay);
    });
  };

  /* ═══════════════════════════════════════════
     7. SCREEN TRANSITION
     ═══════════════════════════════════════════ */
  Effects.transition = function (appEl, renderFn) {
    if (reducedMotion) { renderFn(); return; }
    appEl.classList.add('screen-exit');
    setTimeout(() => {
      renderFn();
      appEl.classList.remove('screen-exit');
      appEl.classList.add('screen-enter');
      setTimeout(() => appEl.classList.remove('screen-enter'), 400);
    }, 200);
  };

  /* ═══════════════════════════════════════════
     8. RIPPLE EFFECT ON BUTTONS
     ═══════════════════════════════════════════ */
  Effects.ripple = function (e) {
    if (reducedMotion) return;
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const circle = document.createElement('span');
    const diameter = Math.max(rect.width, rect.height);
    circle.style.cssText = `position:absolute;width:${diameter}px;height:${diameter}px;` +
      `border-radius:50%;background:rgba(255,255,255,0.25);` +
      `left:${e.clientX - rect.left - diameter / 2}px;top:${e.clientY - rect.top - diameter / 2}px;` +
      `transform:scale(0);animation:rippleAnim 500ms ease-out forwards;pointer-events:none;`;
    btn.style.position = btn.style.position || 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(circle);
    circle.addEventListener('animationend', () => circle.remove());
  };

  // Expose globally
  window.ITEffects = Effects;
})();
