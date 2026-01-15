/**
 * SOPOR - Visual Effects System
 * Particle systems, screen effects, and visual feedback
 */

import { makeRng, clamp, lerp, distance, angle } from '../core/utils.js';
import { hexToRgb, BIOME_PALETTES } from './textures.js';
import { EASING } from './animations.js';

// ========== Particle System ==========

/**
 * Particle definition
 * @typedef {object} Particle
 * @property {number} x
 * @property {number} y
 * @property {number} vx - Velocity X
 * @property {number} vy - Velocity Y
 * @property {number} life - Remaining life
 * @property {number} maxLife
 * @property {number} size
 * @property {number} color
 * @property {number} alpha
 * @property {number} rotation
 * @property {number} rotationSpeed
 * @property {string} type
 */

/**
 * Create particle system
 */
export function createParticleSystem(maxParticles = 500) {
  return {
    particles: [],
    maxParticles,
    emitters: [],
    gravity: 0,
    wind: { x: 0, y: 0 },
  };
}

/**
 * Add particle to system
 */
export function addParticle(system, particle) {
  if (system.particles.length >= system.maxParticles) {
    // Remove oldest particle
    system.particles.shift();
  }
  
  system.particles.push({
    x: particle.x,
    y: particle.y,
    vx: particle.vx || 0,
    vy: particle.vy || 0,
    life: particle.life || 1000,
    maxLife: particle.life || 1000,
    size: particle.size || 4,
    sizeEnd: particle.sizeEnd ?? particle.size ?? 4,
    color: particle.color || 0xffffff,
    colorEnd: particle.colorEnd ?? particle.color ?? 0xffffff,
    alpha: particle.alpha ?? 1,
    alphaEnd: particle.alphaEnd ?? 0,
    rotation: particle.rotation || 0,
    rotationSpeed: particle.rotationSpeed || 0,
    type: particle.type || 'circle',
    gravity: particle.gravity ?? system.gravity,
    friction: particle.friction ?? 0.98,
  });
}

/**
 * Update particle system
 */
export function updateParticles(system, delta) {
  const dt = delta / 1000;
  const toRemove = [];
  
  for (let i = 0; i < system.particles.length; i++) {
    const p = system.particles[i];
    
    // Update life
    p.life -= delta;
    if (p.life <= 0) {
      toRemove.push(i);
      continue;
    }
    
    // Apply physics
    p.vy += p.gravity * dt;
    p.vx += system.wind.x * dt;
    p.vy += system.wind.y * dt;
    
    p.vx *= p.friction;
    p.vy *= p.friction;
    
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    
    p.rotation += p.rotationSpeed * dt;
    
    // Interpolate properties
    const t = 1 - (p.life / p.maxLife);
    p.currentSize = lerp(p.size, p.sizeEnd, t);
    p.currentAlpha = lerp(p.alpha, p.alphaEnd, t);
  }
  
  // Remove dead particles (reverse order)
  for (let i = toRemove.length - 1; i >= 0; i--) {
    system.particles.splice(toRemove[i], 1);
  }
  
  // Update emitters
  for (const emitter of system.emitters) {
    updateEmitter(system, emitter, delta);
  }
}

/**
 * Render particles to canvas
 */
export function renderParticles(system, ctx, cameraX = 0, cameraY = 0) {
  ctx.save();
  
  for (const p of system.particles) {
    const screenX = p.x - cameraX;
    const screenY = p.y - cameraY;
    
    ctx.globalAlpha = p.currentAlpha ?? p.alpha;
    
    const color = hexToRgb(p.color);
    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(p.rotation);
    
    const size = p.currentSize ?? p.size;
    
    switch (p.type) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'square':
        ctx.fillRect(-size / 2, -size / 2, size, size);
        break;
        
      case 'star':
        drawStar(ctx, 0, 0, size / 2, 5);
        break;
        
      case 'spark':
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.stroke();
        break;
        
      case 'trail':
        const trailLength = Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.05;
        const trailAngle = Math.atan2(p.vy, p.vx);
        ctx.rotate(trailAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, size + trailLength, size / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    
    ctx.restore();
  }
  
  ctx.restore();
}

/**
 * Draw star shape
 */
function drawStar(ctx, cx, cy, radius, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.5;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

// ========== Emitters ==========

/**
 * Create particle emitter
 */
export function createEmitter(config) {
  return {
    x: config.x || 0,
    y: config.y || 0,
    rate: config.rate || 10, // particles per second
    spread: config.spread || Math.PI * 2,
    direction: config.direction || 0,
    speed: config.speed || 100,
    speedVariance: config.speedVariance || 20,
    life: config.life || 1000,
    lifeVariance: config.lifeVariance || 200,
    size: config.size || 4,
    sizeVariance: config.sizeVariance || 2,
    sizeEnd: config.sizeEnd,
    color: config.color || 0xffffff,
    colorEnd: config.colorEnd,
    alpha: config.alpha ?? 1,
    alphaEnd: config.alphaEnd ?? 0,
    type: config.type || 'circle',
    gravity: config.gravity ?? 0,
    active: true,
    burstMode: config.burstMode || false,
    burstCount: config.burstCount || 10,
    _accumulator: 0,
    _rng: makeRng(Date.now()),
  };
}

/**
 * Update emitter
 */
function updateEmitter(system, emitter, delta) {
  if (!emitter.active) return;
  
  if (emitter.burstMode) {
    // One-time burst
    for (let i = 0; i < emitter.burstCount; i++) {
      spawnFromEmitter(system, emitter);
    }
    emitter.active = false;
    return;
  }
  
  // Continuous emission
  emitter._accumulator += delta;
  const interval = 1000 / emitter.rate;
  
  while (emitter._accumulator >= interval) {
    emitter._accumulator -= interval;
    spawnFromEmitter(system, emitter);
  }
}

/**
 * Spawn particle from emitter
 */
function spawnFromEmitter(system, emitter) {
  const rng = emitter._rng;
  
  const angle = emitter.direction + (rng.next() - 0.5) * emitter.spread;
  const speed = emitter.speed + (rng.next() - 0.5) * emitter.speedVariance;
  
  addParticle(system, {
    x: emitter.x,
    y: emitter.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: emitter.life + (rng.next() - 0.5) * emitter.lifeVariance,
    size: emitter.size + (rng.next() - 0.5) * emitter.sizeVariance,
    sizeEnd: emitter.sizeEnd,
    color: emitter.color,
    colorEnd: emitter.colorEnd,
    alpha: emitter.alpha,
    alphaEnd: emitter.alphaEnd,
    type: emitter.type,
    gravity: emitter.gravity,
  });
}

// ========== Preset Effects ==========

/**
 * Create hit effect
 */
export function createHitEffect(system, x, y, color = 0xffffff) {
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const speed = 150 + Math.random() * 100;
    
    addParticle(system, {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 300 + Math.random() * 200,
      size: 4 + Math.random() * 3,
      sizeEnd: 0,
      color,
      alpha: 1,
      alphaEnd: 0,
      type: 'spark',
      gravity: 200,
      friction: 0.95,
    });
  }
}

/**
 * Create death effect
 */
export function createDeathEffect(system, x, y, color = 0xff4444) {
  // Explosion
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 150;
    
    addParticle(system, {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 500 + Math.random() * 300,
      size: 6 + Math.random() * 4,
      sizeEnd: 0,
      color,
      alpha: 1,
      alphaEnd: 0,
      type: 'circle',
      gravity: 100,
      friction: 0.96,
    });
  }
  
  // Rising soul
  for (let i = 0; i < 5; i++) {
    addParticle(system, {
      x: x + (Math.random() - 0.5) * 20,
      y,
      vx: (Math.random() - 0.5) * 30,
      vy: -80 - Math.random() * 40,
      life: 1000 + Math.random() * 500,
      size: 8,
      sizeEnd: 2,
      color: 0xffffff,
      alpha: 0.8,
      alphaEnd: 0,
      type: 'circle',
      gravity: -20,
      friction: 0.99,
    });
  }
}

/**
 * Create dash trail effect
 */
export function createDashTrail(system, x, y, dirX, dirY, color = 0x4488ff) {
  for (let i = 0; i < 5; i++) {
    addParticle(system, {
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: -dirX * 50 + (Math.random() - 0.5) * 20,
      vy: -dirY * 50 + (Math.random() - 0.5) * 20,
      life: 200 + Math.random() * 100,
      size: 6,
      sizeEnd: 2,
      color,
      alpha: 0.6,
      alphaEnd: 0,
      type: 'trail',
      gravity: 0,
      friction: 0.9,
    });
  }
}

/**
 * Create heal effect
 */
export function createHealEffect(system, x, y) {
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 20;
    
    addParticle(system, {
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * 20,
      vy: -50 - Math.random() * 50,
      life: 800 + Math.random() * 400,
      size: 4 + Math.random() * 3,
      sizeEnd: 1,
      color: 0x44ff44,
      alpha: 0.8,
      alphaEnd: 0,
      type: 'star',
      gravity: -30,
      friction: 0.98,
    });
  }
}

/**
 * Create level up effect
 */
export function createLevelUpEffect(system, x, y) {
  // Ring expansion
  for (let i = 0; i < 30; i++) {
    const angle = (i / 30) * Math.PI * 2;
    
    addParticle(system, {
      x,
      y,
      vx: Math.cos(angle) * 200,
      vy: Math.sin(angle) * 200,
      life: 600,
      size: 8,
      sizeEnd: 2,
      color: 0xffaa00,
      alpha: 1,
      alphaEnd: 0,
      type: 'star',
      gravity: 0,
      friction: 0.95,
    });
  }
  
  // Rising sparkles
  for (let i = 0; i < 20; i++) {
    addParticle(system, {
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 30,
      vy: -100 - Math.random() * 100,
      life: 1200 + Math.random() * 500,
      size: 6,
      sizeEnd: 1,
      color: 0xffffaa,
      alpha: 1,
      alphaEnd: 0,
      type: 'star',
      gravity: -50,
      friction: 0.99,
    });
  }
}

/**
 * Create status effect particles
 */
export function createStatusParticles(system, x, y, statusType) {
  const configs = {
    burn: { color: 0xff4400, vy: -80, type: 'spark' },
    freeze: { color: 0x88ccff, vy: -30, type: 'star' },
    poison: { color: 0x44ff44, vy: -50, type: 'circle' },
    bleed: { color: 0xff0000, vy: 30, gravity: 100, type: 'circle' },
    stun: { color: 0xffff00, vy: -40, type: 'star', rotation: true },
    slow: { color: 0x8888ff, vy: -20, type: 'circle' },
  };
  
  const config = configs[statusType] || configs.burn;
  
  addParticle(system, {
    x: x + (Math.random() - 0.5) * 20,
    y: y + (Math.random() - 0.5) * 10,
    vx: (Math.random() - 0.5) * 30,
    vy: config.vy + (Math.random() - 0.5) * 20,
    life: 500 + Math.random() * 300,
    size: 4 + Math.random() * 2,
    sizeEnd: 0,
    color: config.color,
    alpha: 0.8,
    alphaEnd: 0,
    type: config.type,
    gravity: config.gravity || 0,
    friction: 0.98,
    rotationSpeed: config.rotation ? 5 : 0,
  });
}

// ========== Screen Effects ==========

/**
 * Screen shake state
 */
export function createScreenShake() {
  return {
    intensity: 0,
    duration: 0,
    elapsed: 0,
    offsetX: 0,
    offsetY: 0,
    decay: true,
  };
}

/**
 * Trigger screen shake
 */
export function triggerScreenShake(shake, intensity, duration = 300) {
  shake.intensity = Math.max(shake.intensity, intensity);
  shake.duration = Math.max(shake.duration, duration);
  shake.elapsed = 0;
}

/**
 * Update screen shake
 */
export function updateScreenShake(shake, delta) {
  if (shake.duration <= 0) {
    shake.offsetX = 0;
    shake.offsetY = 0;
    return;
  }
  
  shake.elapsed += delta;
  
  if (shake.elapsed >= shake.duration) {
    shake.duration = 0;
    shake.intensity = 0;
    shake.offsetX = 0;
    shake.offsetY = 0;
    return;
  }
  
  const t = shake.elapsed / shake.duration;
  const currentIntensity = shake.decay ? shake.intensity * (1 - t) : shake.intensity;
  
  shake.offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
  shake.offsetY = (Math.random() - 0.5) * 2 * currentIntensity;
}

/**
 * Screen flash effect
 */
export function createScreenFlash() {
  return {
    color: 0xffffff,
    alpha: 0,
    duration: 0,
    elapsed: 0,
  };
}

/**
 * Trigger screen flash
 */
export function triggerScreenFlash(flash, color = 0xffffff, duration = 100, alpha = 0.5) {
  flash.color = color;
  flash.alpha = alpha;
  flash.duration = duration;
  flash.elapsed = 0;
}

/**
 * Update screen flash
 */
export function updateScreenFlash(flash, delta) {
  if (flash.duration <= 0) return;
  
  flash.elapsed += delta;
  
  if (flash.elapsed >= flash.duration) {
    flash.duration = 0;
    flash.alpha = 0;
    return;
  }
  
  const t = flash.elapsed / flash.duration;
  flash.currentAlpha = flash.alpha * (1 - t);
}

/**
 * Render screen flash
 */
export function renderScreenFlash(flash, ctx, width, height) {
  if (flash.currentAlpha <= 0) return;
  
  const c = hexToRgb(flash.color);
  ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${flash.currentAlpha})`;
  ctx.fillRect(0, 0, width, height);
}

// ========== Biome Ambient Effects ==========

/**
 * Create ambient particle system for biome
 */
export function createAmbientEffects(biome, bounds) {
  const system = createParticleSystem(100);
  const palette = BIOME_PALETTES[biome];
  
  if (!palette) return system;
  
  // Create ambient emitter
  const emitter = createEmitter({
    x: bounds.width / 2,
    y: bounds.height / 2,
    rate: 2,
    spread: Math.PI * 2,
    direction: -Math.PI / 2,
    speed: 20,
    speedVariance: 10,
    life: 3000,
    lifeVariance: 1000,
    size: 3,
    sizeVariance: 2,
    color: palette.particle,
    alpha: 0.4,
    alphaEnd: 0,
    type: 'circle',
    gravity: -10,
  });
  
  system.emitters.push(emitter);
  
  return system;
}

// ========== Compatibility Aliases ==========

// Alias for createDashTrail
export const createDashTrailEffect = createDashTrail;

// Alias for renderParticles
export const drawParticles = renderParticles;

/**
 * Create biome ambient effect (compatibility wrapper)
 * @param {object} system 
 * @param {string} biome 
 * @param {number} x 
 * @param {number} y 
 * @param {number} width 
 * @param {number} height 
 * @returns {object}
 */
export function createBiomeAmbientEffect(system, biome, x, y, width, height) {
  return createAmbientEffects(biome, { x, y, width, height });
}

export default {
  // Particle System
  createParticleSystem,
  addParticle,
  updateParticles,
  renderParticles,
  drawParticles,
  
  // Emitters
  createEmitter,
  
  // Effects
  createHitEffect,
  createDeathEffect,
  createDashTrail,
  createDashTrailEffect,
  createHealEffect,
  createLevelUpEffect,
  createStatusParticles,
  createBiomeAmbientEffect,
  
  // Screen Effects
  createScreenShake,
  triggerScreenShake,
  updateScreenShake,
  createScreenFlash,
  triggerScreenFlash,
  updateScreenFlash,
  renderScreenFlash,
  
  // Ambient
  createAmbientEffects,
};
