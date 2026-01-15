/**
 * SOPOR - HUD (Heads-Up Display) System
 * Health, mana, combo, status effects display
 */

import { t } from '../core/i18n.js';
import { clamp, lerp } from '../core/utils.js';
import { RARITY, STATUS_EFFECTS } from '../core/constants.js';
import { EASING } from '../graphics/animations.js';

// ========== HUD Configuration ==========

export const HUD_CONFIG = {
  padding: 15,
  barWidth: 200,
  barHeight: 18,
  barSpacing: 8,
  
  // Colors
  healthColor: '#44aa44',
  healthBgColor: '#222222',
  healthDamageColor: '#ff4444',
  
  manaColor: '#4488dd',
  manaBgColor: '#222222',
  
  xpColor: '#ffcc44',
  xpBgColor: '#333333',
  
  comboColor: '#ffaa00',
  
  // Fonts
  fontFamily: 'monospace',
  fontSize: 14,
  
  // Animation
  barAnimSpeed: 0.1,
  damageShowTime: 500,
};

// ========== HUD State ==========

/**
 * Create HUD state
 */
export function createHUDState() {
  return {
    // Animated values (smooth transitions)
    displayHealth: 1,
    displayMaxHealth: 100,
    displayMana: 1,
    displayXp: 0,
    
    // Delayed damage indicator
    delayedHealth: 1,
    lastDamageTime: 0,
    
    // Combo
    comboCount: 0,
    comboTimer: 0,
    comboMaxTime: 3000,
    
    // Status effects
    statusEffects: [],
    
    // Notifications
    notifications: [],
    
    // Minimap data
    minimapEnabled: true,
    
    // Touch controls state
    touchControlsEnabled: false,
    joystickActive: false,
    joystickX: 0,
    joystickY: 0,
  };
}

// ========== Bars Rendering ==========

/**
 * Draw health bar
 */
export function drawHealthBar(ctx, hud, currentHealth, maxHealth, x, y) {
  const { barWidth, barHeight, padding, healthColor, healthBgColor, healthDamageColor, barAnimSpeed } = HUD_CONFIG;
  
  // Update animated values
  hud.displayHealth = lerp(hud.displayHealth, currentHealth / maxHealth, barAnimSpeed);
  hud.displayMaxHealth = maxHealth;
  
  // Update delayed damage indicator
  const now = Date.now();
  if (currentHealth < hud.delayedHealth * maxHealth) {
    hud.lastDamageTime = now;
  }
  
  if (now - hud.lastDamageTime > HUD_CONFIG.damageShowTime) {
    hud.delayedHealth = lerp(hud.delayedHealth, currentHealth / maxHealth, barAnimSpeed * 0.5);
  }
  
  const px = x + padding;
  const py = y + padding;
  
  // Background
  ctx.fillStyle = healthBgColor;
  roundRect(ctx, px, py, barWidth, barHeight, 4);
  ctx.fill();
  
  // Delayed damage (red portion)
  if (hud.delayedHealth > hud.displayHealth) {
    ctx.fillStyle = healthDamageColor;
    roundRect(ctx, px + 2, py + 2, (barWidth - 4) * hud.delayedHealth, barHeight - 4, 3);
    ctx.fill();
  }
  
  // Current health
  ctx.fillStyle = healthColor;
  roundRect(ctx, px + 2, py + 2, (barWidth - 4) * hud.displayHealth, barHeight - 4, 3);
  ctx.fill();
  
  // Border
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 1;
  roundRect(ctx, px, py, barWidth, barHeight, 4);
  ctx.stroke();
  
  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = `${HUD_CONFIG.fontSize}px ${HUD_CONFIG.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `${Math.ceil(currentHealth)} / ${maxHealth}`,
    px + barWidth / 2,
    py + barHeight / 2
  );
  
  // Heart icon
  ctx.fillStyle = '#ff6666';
  drawHeartIcon(ctx, px - 20, py + barHeight / 2);
}

/**
 * Draw mana bar
 */
export function drawManaBar(ctx, hud, currentMana, maxMana, x, y) {
  const { barWidth, barHeight, padding, barSpacing, manaColor, manaBgColor, barAnimSpeed } = HUD_CONFIG;
  
  // Update animated value
  hud.displayMana = lerp(hud.displayMana, currentMana / maxMana, barAnimSpeed);
  
  const px = x + padding;
  const py = y + padding + barHeight + barSpacing;
  
  // Background
  ctx.fillStyle = manaBgColor;
  roundRect(ctx, px, py, barWidth, barHeight, 4);
  ctx.fill();
  
  // Current mana
  ctx.fillStyle = manaColor;
  roundRect(ctx, px + 2, py + 2, (barWidth - 4) * hud.displayMana, barHeight - 4, 3);
  ctx.fill();
  
  // Border
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 1;
  roundRect(ctx, px, py, barWidth, barHeight, 4);
  ctx.stroke();
  
  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = `${HUD_CONFIG.fontSize}px ${HUD_CONFIG.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `${Math.ceil(currentMana)} / ${maxMana}`,
    px + barWidth / 2,
    py + barHeight / 2
  );
  
  // Mana icon
  ctx.fillStyle = '#6699ff';
  drawManaIcon(ctx, px - 20, py + barHeight / 2);
}

/**
 * Draw XP bar
 */
export function drawXPBar(ctx, hud, currentXp, xpToNext, level, x, y) {
  const { barWidth, barHeight, padding, barSpacing, xpColor, xpBgColor, barAnimSpeed } = HUD_CONFIG;
  
  // Update animated value
  hud.displayXp = lerp(hud.displayXp, currentXp / xpToNext, barAnimSpeed);
  
  const px = x + padding;
  const py = y + padding + (barHeight + barSpacing) * 2;
  const smallBarHeight = barHeight - 6;
  
  // Background
  ctx.fillStyle = xpBgColor;
  roundRect(ctx, px, py, barWidth, smallBarHeight, 3);
  ctx.fill();
  
  // Current XP
  ctx.fillStyle = xpColor;
  roundRect(ctx, px + 2, py + 2, (barWidth - 4) * hud.displayXp, smallBarHeight - 4, 2);
  ctx.fill();
  
  // Level badge
  ctx.fillStyle = '#ffcc44';
  ctx.beginPath();
  ctx.arc(px - 15, py + smallBarHeight / 2, 12, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${HUD_CONFIG.fontSize - 2}px ${HUD_CONFIG.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${level}`, px - 15, py + smallBarHeight / 2);
}

// ========== Combo Display ==========

/**
 * Draw combo counter
 */
export function drawComboCounter(ctx, hud, x, y) {
  if (hud.comboCount < 2) return;
  
  const comboPercent = hud.comboTimer / hud.comboMaxTime;
  
  // Pulse animation
  const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.1;
  
  // Combo text
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  
  // Glow effect
  ctx.shadowColor = HUD_CONFIG.comboColor;
  ctx.shadowBlur = 10;
  
  ctx.fillStyle = HUD_CONFIG.comboColor;
  ctx.font = `bold 24px ${HUD_CONFIG.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${hud.comboCount}x COMBO`, 0, 0);
  
  ctx.restore();
  
  // Timer bar
  const barWidth = 80;
  const barY = y + 20;
  
  ctx.fillStyle = '#333333';
  roundRect(ctx, x - barWidth / 2, barY, barWidth, 6, 3);
  ctx.fill();
  
  ctx.fillStyle = HUD_CONFIG.comboColor;
  roundRect(ctx, x - barWidth / 2 + 1, barY + 1, (barWidth - 2) * comboPercent, 4, 2);
  ctx.fill();
}

/**
 * Update combo
 */
export function updateCombo(hud, delta) {
  if (hud.comboCount > 0) {
    hud.comboTimer -= delta;
    if (hud.comboTimer <= 0) {
      hud.comboCount = 0;
      hud.comboTimer = 0;
    }
  }
}

/**
 * Add to combo
 */
export function addCombo(hud) {
  hud.comboCount++;
  hud.comboTimer = hud.comboMaxTime;
}

/**
 * Reset combo
 */
export function resetCombo(hud) {
  hud.comboCount = 0;
  hud.comboTimer = 0;
}

// ========== Status Effects ==========

/**
 * Draw status effects
 */
export function drawStatusEffects(ctx, hud, x, y) {
  const iconSize = 24;
  const spacing = 4;
  
  hud.statusEffects.forEach((effect, i) => {
    const px = x + (iconSize + spacing) * i;
    const py = y;
    
    // Icon background
    ctx.fillStyle = getStatusColor(effect.type);
    roundRect(ctx, px, py, iconSize, iconSize, 4);
    ctx.fill();
    
    // Icon
    ctx.fillStyle = '#ffffff';
    ctx.font = `${iconSize - 8}px ${HUD_CONFIG.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getStatusIcon(effect.type), px + iconSize / 2, py + iconSize / 2);
    
    // Duration bar
    if (effect.duration > 0 && effect.maxDuration > 0) {
      const percent = effect.duration / effect.maxDuration;
      ctx.fillStyle = '#ffffff44';
      ctx.fillRect(px + 2, py + iconSize - 4, (iconSize - 4) * percent, 2);
    }
    
    // Stack count
    if (effect.stacks > 1) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 10px ${HUD_CONFIG.fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${effect.stacks}`, px + iconSize - 2, py + iconSize - 2);
    }
  });
}

/**
 * Get status effect color
 */
function getStatusColor(type) {
  switch (type) {
    case STATUS_EFFECTS.BURNING: return '#ff4400';
    case STATUS_EFFECTS.POISON: return '#44aa00';
    case STATUS_EFFECTS.FREEZE: return '#44aaff';
    case STATUS_EFFECTS.BLEED: return '#aa0000';
    case STATUS_EFFECTS.STUN: return '#ffff00';
    case STATUS_EFFECTS.SLOW: return '#8844aa';
    default: return '#666666';
  }
}

/**
 * Get status effect icon
 */
function getStatusIcon(type) {
  switch (type) {
    case STATUS_EFFECTS.BURNING: return '🔥';
    case STATUS_EFFECTS.POISON: return '☠';
    case STATUS_EFFECTS.FREEZE: return '❄';
    case STATUS_EFFECTS.BLEED: return '💧';
    case STATUS_EFFECTS.STUN: return '⚡';
    case STATUS_EFFECTS.SLOW: return '🐌';
    default: return '?';
  }
}

// ========== Notifications ==========

/**
 * Draw notifications
 */
export function drawNotifications(ctx, hud, screenWidth, screenHeight) {
  const now = Date.now();
  
  hud.notifications = hud.notifications.filter(n => now < n.endTime);
  
  hud.notifications.forEach((notif, i) => {
    const elapsed = now - notif.startTime;
    const duration = notif.endTime - notif.startTime;
    const progress = elapsed / duration;
    
    // Fade in/out
    let alpha = 1;
    if (progress < 0.1) {
      alpha = progress / 0.1;
    } else if (progress > 0.8) {
      alpha = (1 - progress) / 0.2;
    }
    
    // Slide up
    const slideY = i * 30;
    const y = screenHeight / 3 + slideY - elapsed * 0.02;
    
    ctx.globalAlpha = alpha;
    ctx.fillStyle = notif.color || '#ffffff';
    ctx.font = `${notif.size || 16}px ${HUD_CONFIG.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(notif.text, screenWidth / 2, y);
    ctx.globalAlpha = 1;
  });
}

/**
 * Add notification
 */
export function addNotification(hud, text, options = {}) {
  const now = Date.now();
  hud.notifications.push({
    text,
    color: options.color || '#ffffff',
    size: options.size || 16,
    startTime: now,
    endTime: now + (options.duration || 2000),
  });
}

// ========== Damage Numbers ==========

let damageNumbers = [];

/**
 * Show damage number
 */
export function showDamageNumber(x, y, damage, options = {}) {
  damageNumbers.push({
    x,
    y,
    damage: Math.round(damage),
    color: options.color || '#ffffff',
    crit: options.crit || false,
    heal: options.heal || false,
    startTime: Date.now(),
    duration: options.duration || 1000,
  });
}

/**
 * Draw damage numbers
 */
export function drawDamageNumbers(ctx, cameraX, cameraY) {
  const now = Date.now();
  
  damageNumbers = damageNumbers.filter(d => now < d.startTime + d.duration);
  
  damageNumbers.forEach(d => {
    const elapsed = now - d.startTime;
    const progress = elapsed / d.duration;
    
    // Rise and fade
    const y = d.y - elapsed * 0.05;
    const alpha = 1 - EASING.easeOutQuad(progress);
    
    // Screen position
    const sx = d.x - cameraX;
    const sy = y - cameraY;
    
    ctx.globalAlpha = alpha;
    
    // Crit effect
    const scale = d.crit ? 1 + (1 - progress) * 0.5 : 1;
    
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(scale, scale);
    
    // Shadow for visibility
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${d.crit ? 20 : 16}px ${HUD_CONFIG.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${d.heal ? '+' : '-'}${d.damage}`, 1, 1);
    
    // Main text
    ctx.fillStyle = d.heal ? '#44ff44' : d.color;
    ctx.fillText(`${d.heal ? '+' : '-'}${d.damage}`, 0, 0);
    
    ctx.restore();
    ctx.globalAlpha = 1;
  });
}

// ========== Boss Health Bar ==========

/**
 * Draw boss health bar
 */
export function drawBossHealthBar(ctx, name, health, maxHealth, phase, screenWidth) {
  const barWidth = screenWidth * 0.6;
  const barHeight = 24;
  const x = (screenWidth - barWidth) / 2;
  const y = 40;
  
  const healthPercent = health / maxHealth;
  
  // Background
  ctx.fillStyle = '#111111';
  roundRect(ctx, x - 4, y - 4, barWidth + 8, barHeight + 8, 6);
  ctx.fill();
  
  // Health background
  ctx.fillStyle = '#331111';
  roundRect(ctx, x, y, barWidth, barHeight, 4);
  ctx.fill();
  
  // Health bar
  const gradient = ctx.createLinearGradient(x, y, x + barWidth * healthPercent, y);
  gradient.addColorStop(0, '#ff2222');
  gradient.addColorStop(1, '#ff6644');
  
  ctx.fillStyle = gradient;
  roundRect(ctx, x + 2, y + 2, (barWidth - 4) * healthPercent, barHeight - 4, 3);
  ctx.fill();
  
  // Phase indicators
  const phaseCount = 3;
  for (let i = 1; i < phaseCount; i++) {
    const phaseX = x + (barWidth * i / phaseCount);
    ctx.strokeStyle = '#ffffff44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(phaseX, y);
    ctx.lineTo(phaseX, y + barHeight);
    ctx.stroke();
  }
  
  // Boss name
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 16px ${HUD_CONFIG.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(name, screenWidth / 2, y - 8);
  
  // Health text
  ctx.font = `${HUD_CONFIG.fontSize}px ${HUD_CONFIG.fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `${Math.ceil(health)} / ${maxHealth}`,
    screenWidth / 2,
    y + barHeight / 2
  );
  
  // Phase text
  if (phase) {
    ctx.fillStyle = '#ffcc44';
    ctx.font = `12px ${HUD_CONFIG.fontFamily}`;
    ctx.textAlign = 'right';
    ctx.fillText(`Phase ${phase}`, x + barWidth, y - 8);
  }
}

// ========== Helper Functions ==========

/**
 * Draw rounded rectangle
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draw heart icon
 */
function drawHeartIcon(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.6, 0.6);
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.bezierCurveTo(-10, -15, -20, 0, 0, 15);
  ctx.bezierCurveTo(20, 0, 10, -15, 0, -5);
  ctx.fill();
  ctx.restore();
}

/**
 * Draw mana icon (diamond)
 */
function drawManaIcon(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 0);
  ctx.lineTo(0, 8);
  ctx.lineTo(-6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export default {
  HUD_CONFIG,
  
  // State
  createHUDState,
  
  // Bars
  drawHealthBar,
  drawManaBar,
  drawXPBar,
  
  // Combo
  drawComboCounter,
  updateCombo,
  addCombo,
  resetCombo,
  
  // Status effects
  drawStatusEffects,
  
  // Notifications
  drawNotifications,
  addNotification,
  
  // Damage numbers
  showDamageNumber,
  drawDamageNumbers,
  
  // Boss
  drawBossHealthBar,
};
