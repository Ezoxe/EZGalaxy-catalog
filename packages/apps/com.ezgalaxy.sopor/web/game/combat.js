/**
 * SOPOR - Combat System
 * Handles attacks, combos, damage calculation, status effects and parrying
 */

import { 
  COMBO_WINDOW_MS, COMBO_MAX_STAGE, COMBO_DAMAGE_BONUS,
  PARRY_WINDOW_MS, CRITICAL_HIT_CHANCE, CRITICAL_HIT_MULTIPLIER,
  STATUS_DURATION, SKILL_COOLDOWNS, SKILL
} from '../core/constants.js';
import { clamp, nowMs, distance, angle, degToRad, makeRng } from '../core/utils.js';
import { getWeaponById, isMeleeWeapon, WEAPON_STATUS } from './weapons.js';

// ========== Combat State ==========

/**
 * Create a new combat state for an entity
 * @returns {CombatState}
 */
export function createCombatState() {
  return {
    lastAttackAt: 0,
    lastDamageAt: 0,
    comboStage: 0,
    comboLastAt: 0,
    isParrying: false,
    parryStartAt: 0,
    perfectParryWindow: false,
    statusEffects: [],
    invulnerable: false,
    invulnerableUntil: 0,
    skillCooldowns: {
      [SKILL.DODGE]: 0,
      [SKILL.DASH]: 0,
      [SKILL.SHOCKWAVE]: 0,
      [SKILL.PARRY]: 0,
    },
  };
}

// ========== Combo System ==========

/**
 * Update combo state on attack
 * @param {CombatState} state 
 * @param {number} timestamp 
 * @returns {number} - Current combo stage after update
 */
export function updateCombo(state, timestamp) {
  const timeSinceLast = timestamp - (state.comboLastAt || 0);
  
  if (timeSinceLast <= COMBO_WINDOW_MS) {
    // Continue combo
    state.comboStage = Math.min(state.comboStage + 1, COMBO_MAX_STAGE);
  } else {
    // Reset combo
    state.comboStage = 0;
  }
  
  state.comboLastAt = timestamp;
  return state.comboStage;
}

/**
 * Check if current attack is a finisher
 * @param {CombatState} state 
 * @returns {boolean}
 */
export function isComboFinisher(state) {
  return state.comboStage >= COMBO_MAX_STAGE;
}

/**
 * Get combo damage multiplier
 * @param {number} comboStage 
 * @param {number} [weaponComboMul=1.0] - Weapon-specific multiplier
 * @returns {number}
 */
export function getComboDamageMultiplier(comboStage, weaponComboMul = 1.0) {
  return 1.0 + (comboStage * COMBO_DAMAGE_BONUS * weaponComboMul);
}

/**
 * Reset combo state
 * @param {CombatState} state 
 */
export function resetCombo(state) {
  state.comboStage = 0;
  state.comboLastAt = 0;
}

// ========== Damage Calculation ==========

/**
 * Calculate attack damage
 * @param {object} params
 * @returns {DamageResult}
 */
export function calculateDamage({
  baseDamage,
  comboStage = 0,
  weaponComboMul = 1.0,
  critChance = CRITICAL_HIT_CHANCE,
  critMultiplier = CRITICAL_HIT_MULTIPLIER,
  damageBonus = 0,
  targetArmor = 0,
  targetVulnerability = 0,
  isFinisher = false,
  finisherMultiplier = 2.0,
  rng = null,
}) {
  let damage = baseDamage;
  let isCritical = false;
  
  // Combo multiplier
  const comboMul = getComboDamageMultiplier(comboStage, weaponComboMul);
  damage *= comboMul;
  
  // Finisher bonus
  if (isFinisher) {
    damage *= finisherMultiplier;
  }
  
  // Critical hit
  const roll = rng ? rng.next() : Math.random();
  if (roll < critChance) {
    isCritical = true;
    damage *= critMultiplier;
  }
  
  // Player damage bonus
  damage *= 1 + (damageBonus / 100);
  
  // Target vulnerability (status effects, etc.)
  damage *= 1 + (targetVulnerability / 100);
  
  // Armor reduction (diminishing returns)
  const armorReduction = targetArmor / (targetArmor + 50);
  damage *= 1 - armorReduction;
  
  // Floor damage to minimum 1
  damage = Math.max(1, Math.round(damage));
  
  return {
    damage,
    isCritical,
    isFinisher,
    comboStage,
    comboMultiplier: comboMul,
  };
}

/**
 * Apply damage to target
 * @param {object} target - Target entity
 * @param {DamageResult} damageResult 
 * @param {object} [options]
 * @returns {boolean} - True if target died
 */
export function applyDamage(target, damageResult, options = {}) {
  const { knockbackForce = 0, knockbackAngle = 0, source = null } = options;
  
  if (!target || target.hp <= 0) return false;
  
  // Check invulnerability
  if (target.combatState?.invulnerable) {
    const now = nowMs();
    if (now < target.combatState.invulnerableUntil) {
      return false;
    }
    target.combatState.invulnerable = false;
  }
  
  // Apply damage
  target.hp = Math.max(0, target.hp - damageResult.damage);
  
  // Update combat state
  if (target.combatState) {
    target.combatState.lastDamageAt = nowMs();
  }
  
  // Apply knockback
  if (knockbackForce > 0 && target.body) {
    const kbX = Math.cos(knockbackAngle) * knockbackForce;
    const kbY = Math.sin(knockbackAngle) * knockbackForce;
    target.body.velocity.x += kbX;
    target.body.velocity.y += kbY;
  }
  
  // Check death
  return target.hp <= 0;
}

// ========== Parry System ==========

/**
 * Start parry
 * @param {CombatState} state 
 */
export function startParry(state) {
  const now = nowMs();
  
  // Check cooldown
  if (now < state.skillCooldowns[SKILL.PARRY]) {
    return false;
  }
  
  state.isParrying = true;
  state.parryStartAt = now;
  state.perfectParryWindow = true;
  
  // Perfect parry window expires after PARRY_WINDOW_MS
  setTimeout(() => {
    if (state.isParrying) {
      state.perfectParryWindow = false;
    }
  }, PARRY_WINDOW_MS);
  
  return true;
}

/**
 * End parry
 * @param {CombatState} state 
 */
export function endParry(state) {
  if (!state.isParrying) return;
  
  state.isParrying = false;
  state.perfectParryWindow = false;
  state.skillCooldowns[SKILL.PARRY] = nowMs() + SKILL_COOLDOWNS[SKILL.PARRY];
}

/**
 * Check if attack can be parried
 * @param {CombatState} defenderState 
 * @returns {{ parried: boolean, perfect: boolean }}
 */
export function checkParry(defenderState) {
  if (!defenderState.isParrying) {
    return { parried: false, perfect: false };
  }
  
  return {
    parried: true,
    perfect: defenderState.perfectParryWindow,
  };
}

/**
 * Process parry result
 * @param {object} attacker 
 * @param {object} defender 
 * @param {object} parryResult 
 * @returns {object} - Riposte info if perfect parry
 */
export function processParry(attacker, defender, parryResult) {
  if (!parryResult.parried) {
    return null;
  }
  
  // Normal parry: reduce damage by 50%
  const damageReduction = parryResult.perfect ? 1.0 : 0.5;
  
  // Perfect parry: trigger riposte
  if (parryResult.perfect) {
    // Stun attacker briefly
    if (attacker.combatState) {
      applyStatusEffect(attacker, WEAPON_STATUS.STUN, 600);
    }
    
    // Give defender invulnerability frames
    if (defender.combatState) {
      defender.combatState.invulnerable = true;
      defender.combatState.invulnerableUntil = nowMs() + 300;
    }
    
    return {
      riposte: true,
      riposteDamage: 10, // Flat riposte damage
      stunDuration: 600,
    };
  }
  
  return {
    riposte: false,
    damageReduction,
  };
}

// ========== Status Effects ==========

/**
 * Apply a status effect to target
 * @param {object} target 
 * @param {string} effectType 
 * @param {number} [duration] 
 * @param {object} [params]
 */
export function applyStatusEffect(target, effectType, duration, params = {}) {
  if (!target.combatState) {
    target.combatState = createCombatState();
  }
  
  const state = target.combatState;
  const now = nowMs();
  const effectDuration = duration || STATUS_DURATION[effectType] || 3000;
  
  // Check if effect already exists (refresh or stack)
  const existing = state.statusEffects.find(e => e.type === effectType);
  
  if (existing) {
    // Refresh duration
    existing.expiresAt = now + effectDuration;
    existing.stacks = Math.min((existing.stacks || 1) + 1, 5); // Max 5 stacks
    return;
  }
  
  // Add new effect
  state.statusEffects.push({
    type: effectType,
    appliedAt: now,
    expiresAt: now + effectDuration,
    stacks: 1,
    tickInterval: getStatusTickInterval(effectType),
    lastTickAt: now,
    ...params,
  });
}

/**
 * Get tick interval for DoT effects
 * @param {string} effectType 
 * @returns {number}
 */
function getStatusTickInterval(effectType) {
  switch (effectType) {
    case WEAPON_STATUS.BURN:
    case WEAPON_STATUS.POISON:
    case WEAPON_STATUS.BLEED:
      return 500; // Tick every 500ms
    default:
      return 0; // No tick
  }
}

/**
 * Update status effects (call each frame)
 * @param {object} target 
 * @param {number} delta - Delta time in ms
 * @returns {StatusTickResult}
 */
export function updateStatusEffects(target, delta) {
  if (!target.combatState) return { damage: 0, effects: [] };
  
  const state = target.combatState;
  const now = nowMs();
  const result = {
    damage: 0,
    effects: [],
    expired: [],
  };
  
  // Process each effect
  for (let i = state.statusEffects.length - 1; i >= 0; i--) {
    const effect = state.statusEffects[i];
    
    // Check expiration
    if (now >= effect.expiresAt) {
      result.expired.push(effect.type);
      state.statusEffects.splice(i, 1);
      continue;
    }
    
    // Process tick damage
    if (effect.tickInterval > 0 && now - effect.lastTickAt >= effect.tickInterval) {
      const tickDamage = getStatusTickDamage(effect);
      result.damage += tickDamage;
      effect.lastTickAt = now;
      
      result.effects.push({
        type: effect.type,
        tickDamage,
        stacks: effect.stacks,
      });
    }
  }
  
  // Apply tick damage
  if (result.damage > 0 && target.hp > 0) {
    target.hp = Math.max(1, target.hp - result.damage); // DoT can't kill (min 1 HP)
  }
  
  return result;
}

/**
 * Get damage per tick for status effect
 * @param {object} effect 
 * @returns {number}
 */
function getStatusTickDamage(effect) {
  const stacks = effect.stacks || 1;
  
  switch (effect.type) {
    case WEAPON_STATUS.BURN:
      return 2 * stacks;
    case WEAPON_STATUS.POISON:
      return 1 * stacks;
    case WEAPON_STATUS.BLEED:
      return 3 * stacks;
    default:
      return 0;
  }
}

/**
 * Check if target has status effect
 * @param {object} target 
 * @param {string} effectType 
 * @returns {boolean}
 */
export function hasStatusEffect(target, effectType) {
  return target.combatState?.statusEffects?.some(e => e.type === effectType) ?? false;
}

/**
 * Get status effect modifiers
 * @param {object} target 
 * @returns {StatusModifiers}
 */
export function getStatusModifiers(target) {
  const mods = {
    speedMultiplier: 1.0,
    damageMultiplier: 1.0,
    damageTakenMultiplier: 1.0,
    canAct: true,
    canMove: true,
  };
  
  if (!target.combatState) return mods;
  
  for (const effect of target.combatState.statusEffects) {
    switch (effect.type) {
      case WEAPON_STATUS.SLOW:
        mods.speedMultiplier *= 0.5;
        break;
      case WEAPON_STATUS.FREEZE:
        mods.speedMultiplier *= 0.3;
        mods.damageTakenMultiplier *= 1.25; // Frozen targets take more damage
        break;
      case WEAPON_STATUS.STUN:
        mods.canAct = false;
        mods.canMove = false;
        break;
      case WEAPON_STATUS.BLEED:
        mods.damageTakenMultiplier *= 1.1 * (effect.stacks || 1);
        break;
    }
  }
  
  return mods;
}

/**
 * Clear all status effects
 * @param {object} target 
 */
export function clearStatusEffects(target) {
  if (target.combatState) {
    target.combatState.statusEffects = [];
  }
}

// ========== Skill Cooldowns ==========

/**
 * Check if skill is ready
 * @param {CombatState} state 
 * @param {string} skillId 
 * @returns {boolean}
 */
export function isSkillReady(state, skillId) {
  const now = nowMs();
  return now >= (state.skillCooldowns[skillId] || 0);
}

/**
 * Use skill (set cooldown)
 * @param {CombatState} state 
 * @param {string} skillId 
 * @returns {boolean}
 */
export function useSkill(state, skillId) {
  if (!isSkillReady(state, skillId)) {
    return false;
  }
  
  state.skillCooldowns[skillId] = nowMs() + SKILL_COOLDOWNS[skillId];
  return true;
}

/**
 * Get skill cooldown remaining (ms)
 * @param {CombatState} state 
 * @param {string} skillId 
 * @returns {number}
 */
export function getSkillCooldownRemaining(state, skillId) {
  const now = nowMs();
  const ready = state.skillCooldowns[skillId] || 0;
  return Math.max(0, ready - now);
}

/**
 * Get skill cooldown progress (0-1, 1 = ready)
 * @param {CombatState} state 
 * @param {string} skillId 
 * @returns {number}
 */
export function getSkillCooldownProgress(state, skillId) {
  const remaining = getSkillCooldownRemaining(state, skillId);
  const total = SKILL_COOLDOWNS[skillId];
  if (remaining <= 0) return 1;
  return 1 - (remaining / total);
}

// ========== Invulnerability ==========

/**
 * Grant invulnerability frames
 * @param {CombatState} state 
 * @param {number} durationMs 
 */
export function grantInvulnerability(state, durationMs) {
  state.invulnerable = true;
  state.invulnerableUntil = nowMs() + durationMs;
}

/**
 * Check if entity is invulnerable
 * @param {CombatState} state 
 * @returns {boolean}
 */
export function isInvulnerable(state) {
  if (!state.invulnerable) return false;
  if (nowMs() >= state.invulnerableUntil) {
    state.invulnerable = false;
    return false;
  }
  return true;
}

// ========== Attack Helpers ==========

/**
 * Check if attack is on cooldown
 * @param {CombatState} state 
 * @param {number} cooldownMs 
 * @returns {boolean}
 */
export function isAttackReady(state, cooldownMs) {
  return nowMs() - state.lastAttackAt >= cooldownMs;
}

/**
 * Mark attack as used
 * @param {CombatState} state 
 */
export function markAttackUsed(state) {
  state.lastAttackAt = nowMs();
}

/**
 * Calculate aim direction
 * @param {object} attacker - Entity with x, y
 * @param {object} target - Point with x, y (or null for facing direction)
 * @param {number} [facing] - Facing direction if no target
 * @returns {number} - Angle in radians
 */
export function calculateAimDirection(attacker, target, facing = 0) {
  if (target && target.x !== undefined && target.y !== undefined) {
    return angle(attacker.x, attacker.y, target.x, target.y);
  }
  return facing;
}

/**
 * Check if target is in melee range
 * @param {object} attacker 
 * @param {object} target 
 * @param {number} reach 
 * @param {number} aimAngle 
 * @param {number} arcDeg 
 * @returns {boolean}
 */
export function isInMeleeRange(attacker, target, reach, aimAngle, arcDeg) {
  const dist = distance(attacker.x, attacker.y, target.x, target.y);
  if (dist > reach) return false;
  
  const toTarget = angle(attacker.x, attacker.y, target.x, target.y);
  const diff = Math.abs(normalizeAngle(toTarget - aimAngle));
  const halfArc = degToRad(arcDeg / 2);
  
  return diff <= halfArc;
}

/**
 * Normalize angle to [-PI, PI]
 * @param {number} a 
 * @returns {number}
 */
function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// ========== Type Definitions ==========

/**
 * @typedef {object} CombatState
 * @property {number} lastAttackAt
 * @property {number} lastDamageAt
 * @property {number} comboStage
 * @property {number} comboLastAt
 * @property {boolean} isParrying
 * @property {number} parryStartAt
 * @property {boolean} perfectParryWindow
 * @property {Array} statusEffects
 * @property {boolean} invulnerable
 * @property {number} invulnerableUntil
 * @property {object} skillCooldowns
 */

/**
 * @typedef {object} DamageResult
 * @property {number} damage
 * @property {boolean} isCritical
 * @property {boolean} isFinisher
 * @property {number} comboStage
 * @property {number} comboMultiplier
 */

/**
 * @typedef {object} StatusModifiers
 * @property {number} speedMultiplier
 * @property {number} damageMultiplier
 * @property {number} damageTakenMultiplier
 * @property {boolean} canAct
 * @property {boolean} canMove
 */

/**
 * @typedef {object} StatusTickResult
 * @property {number} damage
 * @property {Array} effects
 * @property {Array} expired
 */

// ========== Compatibility Aliases ==========

/**
 * Start an attack (compatibility wrapper)
 * @param {CombatState} state 
 * @param {object} weapon 
 * @param {number} timestamp 
 * @returns {boolean}
 */
export function startAttack(state, weapon, timestamp) {
  if (!isAttackReady(state, weapon?.cooldownMs || 500)) return false;
  markAttackUsed(state);
  updateCombo(state, timestamp);
  return true;
}

/**
 * Update combat state (compatibility wrapper)
 * @param {CombatState} state 
 * @param {number} delta 
 * @returns {object}
 */
export function updateCombat(state, delta) {
  // Check invulnerability expiry
  if (state.invulnerable && nowMs() >= state.invulnerableUntil) {
    state.invulnerable = false;
  }
  // Check parry window expiry
  if (state.parrying && nowMs() >= state.parryWindowEnd) {
    endParry(state);
  }
  return { state };
}

/**
 * Try to parry (compatibility wrapper)
 * @param {CombatState} state 
 * @returns {boolean}
 */
export function tryParry(state) {
  return startParry(state);
}

/**
 * Process combat damage (compatibility wrapper)
 * @param {object} attacker 
 * @param {object} defender 
 * @param {object} damageResult 
 * @param {object} options 
 * @returns {object}
 */
export function processCombatDamage(attacker, defender, damageResult, options = {}) {
  const parryResult = checkParry(defender.combatState || defender);
  if (parryResult.parried) {
    return processParry(attacker, defender, parryResult);
  }
  return applyDamage(defender, damageResult, options);
}

export default {
  createCombatState,
  updateCombo,
  isComboFinisher,
  getComboDamageMultiplier,
  resetCombo,
  calculateDamage,
  applyDamage,
  startParry,
  endParry,
  checkParry,
  processParry,
  applyStatusEffect,
  updateStatusEffects,
  hasStatusEffect,
  getStatusModifiers,
  clearStatusEffects,
  isSkillReady,
  useSkill,
  getSkillCooldownRemaining,
  getSkillCooldownProgress,
  grantInvulnerability,
  isInvulnerable,
  isAttackReady,
  markAttackUsed,
  calculateAimDirection,
  isInMeleeRange,
  // Compatibility aliases
  startAttack,
  updateCombat,
  tryParry,
  processCombatDamage,
};
