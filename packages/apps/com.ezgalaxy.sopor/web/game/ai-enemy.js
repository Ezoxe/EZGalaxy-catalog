/**
 * SOPOR - Enemy AI System
 * Defines enemy archetypes, behaviors, and AI decision making
 */

import { STRATA, ENEMY_ARCHETYPE } from '../core/constants.js';
import { clamp, distance, angle, makeRng, lerp, normalizeAngle } from '../core/utils.js';

// ========== Archetype Definitions ==========

/**
 * Base stats and behaviors for each enemy archetype
 */
export const ARCHETYPE_CONFIGS = {
  // Original archetypes
  [ENEMY_ARCHETYPE.SKIRMISHER]: {
    hp: 12,
    damage: 4,
    speed: 85,
    preferredDistance: 120,
    attackCooldown: 1200,
    attackRange: 28,
    behavior: 'kite',
    fleeThreshold: 0.3,
  },
  [ENEMY_ARCHETYPE.CHARGER]: {
    hp: 18,
    damage: 6,
    speed: 95,
    preferredDistance: 0,
    attackCooldown: 900,
    attackRange: 24,
    behavior: 'rush',
    chargeSpeed: 180,
    chargeDistance: 120,
  },
  [ENEMY_ARCHETYPE.SPITTER]: {
    hp: 10,
    damage: 3,
    speed: 60,
    preferredDistance: 140,
    attackCooldown: 1400,
    attackRange: 180,
    behavior: 'ranged',
    projectileSpeed: 200,
  },
  [ENEMY_ARCHETYPE.GUNNER]: {
    hp: 14,
    damage: 5,
    speed: 55,
    preferredDistance: 170,
    attackCooldown: 1800,
    attackRange: 250,
    behavior: 'ranged',
    projectileSpeed: 320,
    telegraphMs: 600,
  },
  [ENEMY_ARCHETYPE.LURKER]: {
    hp: 16,
    damage: 8,
    speed: 45,
    preferredDistance: 80,
    attackCooldown: 2200,
    attackRange: 32,
    behavior: 'ambush',
    burstSpeed: 220,
    burstDuration: 400,
  },
  [ENEMY_ARCHETYPE.SUMMONER]: {
    hp: 20,
    damage: 2,
    speed: 40,
    preferredDistance: 185,
    attackCooldown: 3000,
    attackRange: 220,
    behavior: 'summon',
    summonCount: 2,
    homingStrength: 0.04,
  },
  
  // New archetypes
  [ENEMY_ARCHETYPE.BERSERKER]: {
    hp: 25,
    damage: 10,
    speed: 70,
    preferredDistance: 0,
    attackCooldown: 600,
    attackRange: 30,
    behavior: 'berserk',
    enrageThreshold: 0.5, // Enrages below 50% HP
    enrageSpeedBonus: 1.5,
    enrageDamageBonus: 1.3,
  },
  [ENEMY_ARCHETYPE.SNIPER]: {
    hp: 8,
    damage: 12,
    speed: 50,
    preferredDistance: 280,
    attackCooldown: 3500,
    attackRange: 350,
    behavior: 'sniper',
    projectileSpeed: 500,
    telegraphMs: 1200, // Long telegraph
    laserSight: true,
  },
  [ENEMY_ARCHETYPE.HEALER]: {
    hp: 15,
    damage: 2,
    speed: 55,
    preferredDistance: 150,
    attackCooldown: 4000,
    attackRange: 200,
    behavior: 'support',
    healAmount: 8,
    healRadius: 100,
  },
  [ENEMY_ARCHETYPE.TANK]: {
    hp: 45,
    damage: 5,
    speed: 35,
    preferredDistance: 40,
    attackCooldown: 1600,
    attackRange: 36,
    behavior: 'tank',
    armor: 15,
    blockChance: 0.3,
    tauntRadius: 120,
  },
  [ENEMY_ARCHETYPE.ASSASSIN]: {
    hp: 10,
    damage: 15,
    speed: 110,
    preferredDistance: 0,
    attackCooldown: 2000,
    attackRange: 26,
    behavior: 'assassin',
    stealthDuration: 3000,
    backstabMultiplier: 2.0,
  },
  [ENEMY_ARCHETYPE.NECROMANCER]: {
    hp: 18,
    damage: 3,
    speed: 40,
    preferredDistance: 200,
    attackCooldown: 5000,
    attackRange: 180,
    behavior: 'necro',
    summonOnDeath: true,
    summonCount: 3,
    projectileSpeed: 180,
  },
};

// ========== Stratum Enemy Distribution ==========

/**
 * Enemy type weights by stratum
 */
export const STRATUM_ENEMIES = {
  [STRATA.JARDIN]: [
    { archetype: ENEMY_ARCHETYPE.SKIRMISHER, weight: 45 },
    { archetype: ENEMY_ARCHETYPE.CHARGER, weight: 30 },
    { archetype: ENEMY_ARCHETYPE.SPITTER, weight: 20 },
    { archetype: ENEMY_ARCHETYPE.HEALER, weight: 5 },
  ],
  [STRATA.FORGE]: [
    { archetype: ENEMY_ARCHETYPE.CHARGER, weight: 35 },
    { archetype: ENEMY_ARCHETYPE.GUNNER, weight: 25 },
    { archetype: ENEMY_ARCHETYPE.SKIRMISHER, weight: 15 },
    { archetype: ENEMY_ARCHETYPE.BERSERKER, weight: 15 },
    { archetype: ENEMY_ARCHETYPE.TANK, weight: 10 },
  ],
  [STRATA.ABIME]: [
    { archetype: ENEMY_ARCHETYPE.LURKER, weight: 30 },
    { archetype: ENEMY_ARCHETYPE.SUMMONER, weight: 20 },
    { archetype: ENEMY_ARCHETYPE.SKIRMISHER, weight: 15 },
    { archetype: ENEMY_ARCHETYPE.ASSASSIN, weight: 15 },
    { archetype: ENEMY_ARCHETYPE.SNIPER, weight: 10 },
    { archetype: ENEMY_ARCHETYPE.NECROMANCER, weight: 10 },
  ],
  [STRATA.NEXUS]: [
    { archetype: ENEMY_ARCHETYPE.ASSASSIN, weight: 20 },
    { archetype: ENEMY_ARCHETYPE.SNIPER, weight: 15 },
    { archetype: ENEMY_ARCHETYPE.NECROMANCER, weight: 15 },
    { archetype: ENEMY_ARCHETYPE.TANK, weight: 15 },
    { archetype: ENEMY_ARCHETYPE.BERSERKER, weight: 15 },
    { archetype: ENEMY_ARCHETYPE.SUMMONER, weight: 10 },
    { archetype: ENEMY_ARCHETYPE.HEALER, weight: 10 },
  ],
  [STRATA.DUNGEON]: [
    { archetype: ENEMY_ARCHETYPE.SKIRMISHER, weight: 25 },
    { archetype: ENEMY_ARCHETYPE.CHARGER, weight: 25 },
    { archetype: ENEMY_ARCHETYPE.LURKER, weight: 20 },
    { archetype: ENEMY_ARCHETYPE.GUNNER, weight: 15 },
    { archetype: ENEMY_ARCHETYPE.TANK, weight: 15 },
  ],
};

// ========== Enemy Factory ==========

/**
 * Create enemy stats from archetype
 * @param {string} archetype 
 * @param {number} threatLevel - Scales enemy power
 * @param {object} rng 
 * @returns {EnemyStats}
 */
export function createEnemyStats(archetype, threatLevel = 1, rng = null) {
  const config = ARCHETYPE_CONFIGS[archetype];
  if (!config) {
    console.warn(`Unknown archetype: ${archetype}`);
    return createEnemyStats(ENEMY_ARCHETYPE.SKIRMISHER, threatLevel, rng);
  }
  
  const r = rng || makeRng(Date.now());
  const scaleFactor = 1 + (threatLevel - 1) * 0.15;
  
  return {
    archetype,
    hp: Math.round(config.hp * scaleFactor * (0.9 + r.next() * 0.2)),
    hpMax: Math.round(config.hp * scaleFactor * (0.9 + r.next() * 0.2)),
    damage: Math.round(config.damage * scaleFactor),
    speed: config.speed * (0.95 + r.next() * 0.1),
    preferredDistance: config.preferredDistance,
    attackCooldown: config.attackCooldown,
    attackRange: config.attackRange,
    behavior: config.behavior,
    armor: config.armor || 0,
    // Copy special properties
    chargeSpeed: config.chargeSpeed,
    chargeDistance: config.chargeDistance,
    projectileSpeed: config.projectileSpeed,
    telegraphMs: config.telegraphMs,
    burstSpeed: config.burstSpeed,
    burstDuration: config.burstDuration,
    summonCount: config.summonCount,
    homingStrength: config.homingStrength,
    enrageThreshold: config.enrageThreshold,
    enrageSpeedBonus: config.enrageSpeedBonus,
    enrageDamageBonus: config.enrageDamageBonus,
    healAmount: config.healAmount,
    healRadius: config.healRadius,
    blockChance: config.blockChance,
    tauntRadius: config.tauntRadius,
    stealthDuration: config.stealthDuration,
    backstabMultiplier: config.backstabMultiplier,
    summonOnDeath: config.summonOnDeath,
    laserSight: config.laserSight,
    fleeThreshold: config.fleeThreshold,
  };
}

/**
 * Pick random archetype for stratum
 * @param {string} stratum 
 * @param {object} rng 
 * @returns {string}
 */
export function pickArchetypeForStratum(stratum, rng) {
  const pool = STRATUM_ENEMIES[stratum] || STRATUM_ENEMIES[STRATA.JARDIN];
  
  let total = 0;
  for (const e of pool) total += e.weight;
  
  let roll = rng.next() * total;
  for (const e of pool) {
    roll -= e.weight;
    if (roll <= 0) return e.archetype;
  }
  
  return pool[0].archetype;
}

// ========== AI State ==========

/**
 * Create AI state for enemy
 * @returns {AIState}
 */
export function createAIState() {
  return {
    targetId: null,
    targetPos: null,
    state: 'idle', // idle, chase, attack, flee, special
    stateStartAt: 0,
    lastDecisionAt: 0,
    lastAttackAt: 0,
    strafeDir: 1,
    strafeChangeAt: 0,
    isCharging: false,
    chargeTarget: null,
    isTelegraphing: false,
    telegraphStartAt: 0,
    isStealthed: false,
    stealthStartAt: 0,
    isEnraged: false,
    spawnedMinions: [],
    aggro: new Map(), // entityId -> aggroValue
  };
}

// ========== AI Behaviors ==========

/**
 * Main AI tick function
 * @param {object} enemy - Enemy entity
 * @param {object} player - Player entity
 * @param {object[]} allEnemies - All enemies in scene
 * @param {number} delta - Delta time in ms
 * @returns {AIDecision}
 */
export function tickAI(enemy, player, allEnemies, delta) {
  const stats = enemy.stats;
  const ai = enemy.ai;
  const now = performance.now();
  
  // Update aggro
  updateAggro(ai, player, enemy, now);
  
  // Pick behavior based on archetype
  switch (stats.behavior) {
    case 'kite':
      return kiteAI(enemy, player, ai, stats, now, delta);
    case 'rush':
      return rushAI(enemy, player, ai, stats, now, delta);
    case 'ranged':
      return rangedAI(enemy, player, ai, stats, now, delta);
    case 'ambush':
      return ambushAI(enemy, player, ai, stats, now, delta);
    case 'summon':
      return summonAI(enemy, player, ai, stats, now, delta, allEnemies);
    case 'berserk':
      return berserkAI(enemy, player, ai, stats, now, delta);
    case 'sniper':
      return sniperAI(enemy, player, ai, stats, now, delta);
    case 'support':
      return supportAI(enemy, player, ai, stats, now, delta, allEnemies);
    case 'tank':
      return tankAI(enemy, player, ai, stats, now, delta);
    case 'assassin':
      return assassinAI(enemy, player, ai, stats, now, delta);
    case 'necro':
      return necroAI(enemy, player, ai, stats, now, delta, allEnemies);
    default:
      return kiteAI(enemy, player, ai, stats, now, delta);
  }
}

// ========== Individual Behaviors ==========

/**
 * Kite AI: Maintains distance, strafes
 */
function kiteAI(enemy, player, ai, stats, now, delta) {
  const dist = distance(enemy.x, enemy.y, player.x, player.y);
  const toPlayer = angle(enemy.x, enemy.y, player.x, player.y);
  
  const decision = {
    moveX: 0,
    moveY: 0,
    shouldAttack: false,
    attackTarget: null,
    special: null,
  };
  
  // Flee if low HP
  if (stats.fleeThreshold && enemy.stats.hp / enemy.stats.hpMax < stats.fleeThreshold) {
    decision.moveX = -Math.cos(toPlayer) * stats.speed;
    decision.moveY = -Math.sin(toPlayer) * stats.speed;
    return decision;
  }
  
  // Maintain preferred distance
  const distDiff = dist - stats.preferredDistance;
  
  if (Math.abs(distDiff) > 30) {
    // Move toward or away from player
    const moveDir = distDiff > 0 ? 1 : -1;
    decision.moveX = Math.cos(toPlayer) * stats.speed * moveDir * 0.6;
    decision.moveY = Math.sin(toPlayer) * stats.speed * moveDir * 0.6;
  }
  
  // Strafe perpendicular
  if (now - ai.strafeChangeAt > 1500 + Math.random() * 1000) {
    ai.strafeDir *= -1;
    ai.strafeChangeAt = now;
  }
  
  const perpAngle = toPlayer + (Math.PI / 2) * ai.strafeDir;
  decision.moveX += Math.cos(perpAngle) * stats.speed * 0.4;
  decision.moveY += Math.sin(perpAngle) * stats.speed * 0.4;
  
  // Attack if in range and cooldown ready
  if (dist <= stats.attackRange && now - ai.lastAttackAt >= stats.attackCooldown) {
    decision.shouldAttack = true;
    decision.attackTarget = { x: player.x, y: player.y };
    ai.lastAttackAt = now;
  }
  
  return decision;
}

/**
 * Rush AI: Direct charge at player
 */
function rushAI(enemy, player, ai, stats, now, delta) {
  const dist = distance(enemy.x, enemy.y, player.x, player.y);
  const toPlayer = angle(enemy.x, enemy.y, player.x, player.y);
  
  const decision = {
    moveX: 0,
    moveY: 0,
    shouldAttack: false,
    attackTarget: null,
    special: null,
  };
  
  // Charge mechanic
  if (ai.isCharging) {
    const chargeSpeed = stats.chargeSpeed || stats.speed * 2;
    decision.moveX = Math.cos(ai.chargeAngle) * chargeSpeed;
    decision.moveY = Math.sin(ai.chargeAngle) * chargeSpeed;
    
    // Check if reached charge target or hit player
    if (dist <= stats.attackRange || now - ai.chargeStartAt > 800) {
      ai.isCharging = false;
      decision.shouldAttack = true;
      decision.attackTarget = { x: player.x, y: player.y };
      ai.lastAttackAt = now;
    }
    
    return decision;
  }
  
  // Start charge if far enough and cooldown ready
  if (dist > (stats.chargeDistance || 100) && now - ai.lastAttackAt >= stats.attackCooldown) {
    ai.isCharging = true;
    ai.chargeAngle = toPlayer;
    ai.chargeStartAt = now;
    return decision;
  }
  
  // Normal pursuit
  decision.moveX = Math.cos(toPlayer) * stats.speed;
  decision.moveY = Math.sin(toPlayer) * stats.speed;
  
  // Melee attack
  if (dist <= stats.attackRange && now - ai.lastAttackAt >= stats.attackCooldown) {
    decision.shouldAttack = true;
    decision.attackTarget = { x: player.x, y: player.y };
    ai.lastAttackAt = now;
  }
  
  return decision;
}

/**
 * Ranged AI: Stay at distance, shoot
 */
function rangedAI(enemy, player, ai, stats, now, delta) {
  const dist = distance(enemy.x, enemy.y, player.x, player.y);
  const toPlayer = angle(enemy.x, enemy.y, player.x, player.y);
  
  const decision = {
    moveX: 0,
    moveY: 0,
    shouldAttack: false,
    attackTarget: null,
    special: null,
  };
  
  // Telegraph phase
  if (ai.isTelegraphing) {
    if (now - ai.telegraphStartAt >= (stats.telegraphMs || 0)) {
      ai.isTelegraphing = false;
      decision.shouldAttack = true;
      decision.attackTarget = { x: player.x, y: player.y };
      decision.special = {
        type: 'projectile',
        speed: stats.projectileSpeed,
        damage: stats.damage,
      };
      ai.lastAttackAt = now;
    }
    return decision;
  }
  
  // Maintain distance
  const distDiff = dist - stats.preferredDistance;
  if (distDiff < -40) {
    // Too close, back up
    decision.moveX = -Math.cos(toPlayer) * stats.speed;
    decision.moveY = -Math.sin(toPlayer) * stats.speed;
  } else if (distDiff > 60) {
    // Too far, approach
    decision.moveX = Math.cos(toPlayer) * stats.speed * 0.5;
    decision.moveY = Math.sin(toPlayer) * stats.speed * 0.5;
  }
  
  // Start attack (with telegraph if applicable)
  if (dist <= stats.attackRange && now - ai.lastAttackAt >= stats.attackCooldown) {
    if (stats.telegraphMs && stats.telegraphMs > 0) {
      ai.isTelegraphing = true;
      ai.telegraphStartAt = now;
      ai.telegraphTarget = { x: player.x, y: player.y };
    } else {
      decision.shouldAttack = true;
      decision.attackTarget = { x: player.x, y: player.y };
      decision.special = {
        type: 'projectile',
        speed: stats.projectileSpeed,
        damage: stats.damage,
      };
      ai.lastAttackAt = now;
    }
  }
  
  return decision;
}

/**
 * Ambush AI: Slow approach with burst dash
 */
function ambushAI(enemy, player, ai, stats, now, delta) {
  const dist = distance(enemy.x, enemy.y, player.x, player.y);
  const toPlayer = angle(enemy.x, enemy.y, player.x, player.y);
  
  const decision = {
    moveX: 0,
    moveY: 0,
    shouldAttack: false,
    attackTarget: null,
    special: null,
  };
  
  // Burst dash
  if (ai.isBursting) {
    const burstSpeed = stats.burstSpeed || 200;
    decision.moveX = Math.cos(ai.burstAngle) * burstSpeed;
    decision.moveY = Math.sin(ai.burstAngle) * burstSpeed;
    
    if (now - ai.burstStartAt >= (stats.burstDuration || 400)) {
      ai.isBursting = false;
      decision.shouldAttack = true;
      decision.attackTarget = { x: player.x, y: player.y };
      ai.lastAttackAt = now;
    }
    
    return decision;
  }
  
  // Slow approach
  decision.moveX = Math.cos(toPlayer) * stats.speed * 0.5;
  decision.moveY = Math.sin(toPlayer) * stats.speed * 0.5;
  
  // Trigger burst when in range
  if (dist <= stats.preferredDistance && now - ai.lastAttackAt >= stats.attackCooldown) {
    ai.isBursting = true;
    ai.burstAngle = toPlayer;
    ai.burstStartAt = now;
  }
  
  return decision;
}

/**
 * Summon AI: Stay back, summon minions
 */
function summonAI(enemy, player, ai, stats, now, delta, allEnemies) {
  const dist = distance(enemy.x, enemy.y, player.x, player.y);
  const toPlayer = angle(enemy.x, enemy.y, player.x, player.y);
  
  const decision = {
    moveX: 0,
    moveY: 0,
    shouldAttack: false,
    attackTarget: null,
    special: null,
  };
  
  // Maintain distance
  if (dist < stats.preferredDistance - 30) {
    decision.moveX = -Math.cos(toPlayer) * stats.speed;
    decision.moveY = -Math.sin(toPlayer) * stats.speed;
  }
  
  // Summon minions
  if (now - ai.lastAttackAt >= stats.attackCooldown) {
    const minionCount = ai.spawnedMinions.filter(id => {
      return allEnemies.some(e => e.id === id && e.hp > 0);
    }).length;
    
    if (minionCount < (stats.summonCount || 2)) {
      decision.special = {
        type: 'summon',
        count: (stats.summonCount || 2) - minionCount,
        position: { x: enemy.x, y: enemy.y },
      };
      ai.lastAttackAt = now;
    } else {
      // Fire homing mote instead
      decision.shouldAttack = true;
      decision.attackTarget = { x: player.x, y: player.y };
      decision.special = {
        type: 'homing_projectile',
        speed: stats.projectileSpeed || 180,
        damage: stats.damage,
        homingStrength: stats.homingStrength || 0.04,
      };
      ai.lastAttackAt = now;
    }
  }
  
  return decision;
}

/**
 * Berserk AI: Enrages at low HP
 */
function berserkAI(enemy, player, ai, stats, now, delta) {
  const dist = distance(enemy.x, enemy.y, player.x, player.y);
  const toPlayer = angle(enemy.x, enemy.y, player.x, player.y);
  
  // Check enrage
  const hpPercent = enemy.stats.hp / enemy.stats.hpMax;
  if (!ai.isEnraged && hpPercent <= (stats.enrageThreshold || 0.5)) {
    ai.isEnraged = true;
  }
  
  const speedMul = ai.isEnraged ? (stats.enrageSpeedBonus || 1.5) : 1.0;
  const damageMul = ai.isEnraged ? (stats.enrageDamageBonus || 1.3) : 1.0;
  
  const decision = {
    moveX: Math.cos(toPlayer) * stats.speed * speedMul,
    moveY: Math.sin(toPlayer) * stats.speed * speedMul,
    shouldAttack: false,
    attackTarget: null,
    special: null,
    isEnraged: ai.isEnraged,
  };
  
  // Fast attacks
  const cooldown = ai.isEnraged ? stats.attackCooldown * 0.6 : stats.attackCooldown;
  if (dist <= stats.attackRange && now - ai.lastAttackAt >= cooldown) {
    decision.shouldAttack = true;
    decision.attackTarget = { x: player.x, y: player.y };
    decision.damageMultiplier = damageMul;
    ai.lastAttackAt = now;
  }
  
  return decision;
}

/**
 * Sniper AI: Long range, laser sight telegraph
 */
function sniperAI(enemy, player, ai, stats, now, delta) {
  const dist = distance(enemy.x, enemy.y, player.x, player.y);
  const toPlayer = angle(enemy.x, enemy.y, player.x, player.y);
  
  const decision = {
    moveX: 0,
    moveY: 0,
    shouldAttack: false,
    attackTarget: null,
    special: null,
  };
  
  // Telegraph with laser sight
  if (ai.isTelegraphing) {
    // Track player during telegraph
    ai.telegraphTarget = { x: player.x, y: player.y };
    decision.special = {
      type: 'laser_sight',
      from: { x: enemy.x, y: enemy.y },
      to: ai.telegraphTarget,
    };
    
    if (now - ai.telegraphStartAt >= (stats.telegraphMs || 1200)) {
      ai.isTelegraphing = false;
      decision.shouldAttack = true;
      decision.attackTarget = ai.telegraphTarget;
      decision.special = {
        type: 'fast_projectile',
        speed: stats.projectileSpeed || 500,
        damage: stats.damage,
      };
      ai.lastAttackAt = now;
    }
    
    return decision;
  }
  
  // Stay far back
  if (dist < stats.preferredDistance - 50) {
    decision.moveX = -Math.cos(toPlayer) * stats.speed;
    decision.moveY = -Math.sin(toPlayer) * stats.speed;
  }
  
  // Start telegraph
  if (dist <= stats.attackRange && now - ai.lastAttackAt >= stats.attackCooldown) {
    ai.isTelegraphing = true;
    ai.telegraphStartAt = now;
    ai.telegraphTarget = { x: player.x, y: player.y };
  }
  
  return decision;
}

/**
 * Support AI: Heals nearby allies
 */
function supportAI(enemy, player, ai, stats, now, delta, allEnemies) {
  const dist = distance(enemy.x, enemy.y, player.x, player.y);
  const toPlayer = angle(enemy.x, enemy.y, player.x, player.y);
  
  const decision = {
    moveX: 0,
    moveY: 0,
    shouldAttack: false,
    attackTarget: null,
    special: null,
  };
  
  // Find wounded ally
  let woundedAlly = null;
  let lowestHpPercent = 1.0;
  
  for (const ally of allEnemies) {
    if (ally.id === enemy.id || ally.hp <= 0) continue;
    
    const allyDist = distance(enemy.x, enemy.y, ally.x, ally.y);
    if (allyDist > (stats.healRadius || 100) * 2) continue;
    
    const hpPercent = ally.stats.hp / ally.stats.hpMax;
    if (hpPercent < lowestHpPercent) {
      lowestHpPercent = hpPercent;
      woundedAlly = ally;
    }
  }
  
  // Move toward wounded ally or stay away from player
  if (woundedAlly) {
    const toAlly = angle(enemy.x, enemy.y, woundedAlly.x, woundedAlly.y);
    const allyDist = distance(enemy.x, enemy.y, woundedAlly.x, woundedAlly.y);
    
    if (allyDist > stats.healRadius) {
      decision.moveX = Math.cos(toAlly) * stats.speed;
      decision.moveY = Math.sin(toAlly) * stats.speed;
    }
  } else if (dist < stats.preferredDistance - 30) {
    decision.moveX = -Math.cos(toPlayer) * stats.speed;
    decision.moveY = -Math.sin(toPlayer) * stats.speed;
  }
  
  // Heal if cooldown ready
  if (woundedAlly && now - ai.lastAttackAt >= stats.attackCooldown) {
    const allyDist = distance(enemy.x, enemy.y, woundedAlly.x, woundedAlly.y);
    if (allyDist <= stats.healRadius) {
      decision.special = {
        type: 'heal',
        targetId: woundedAlly.id,
        amount: stats.healAmount || 8,
        radius: stats.healRadius,
      };
      ai.lastAttackAt = now;
    }
  }
  
  return decision;
}

/**
 * Tank AI: Slow, blocks, taunts
 */
function tankAI(enemy, player, ai, stats, now, delta) {
  const dist = distance(enemy.x, enemy.y, player.x, player.y);
  const toPlayer = angle(enemy.x, enemy.y, player.x, player.y);
  
  const decision = {
    moveX: 0,
    moveY: 0,
    shouldAttack: false,
    attackTarget: null,
    special: null,
    isBlocking: false,
  };
  
  // Slowly approach
  if (dist > stats.attackRange + 10) {
    decision.moveX = Math.cos(toPlayer) * stats.speed;
    decision.moveY = Math.sin(toPlayer) * stats.speed;
  }
  
  // Random blocking stance
  decision.isBlocking = Math.random() < (stats.blockChance || 0.3);
  
  // Attack
  if (dist <= stats.attackRange && now - ai.lastAttackAt >= stats.attackCooldown) {
    decision.shouldAttack = true;
    decision.attackTarget = { x: player.x, y: player.y };
    ai.lastAttackAt = now;
    
    // Taunt effect
    decision.special = {
      type: 'taunt',
      radius: stats.tauntRadius || 120,
    };
  }
  
  return decision;
}

/**
 * Assassin AI: Stealth, backstab
 */
function assassinAI(enemy, player, ai, stats, now, delta) {
  const dist = distance(enemy.x, enemy.y, player.x, player.y);
  const toPlayer = angle(enemy.x, enemy.y, player.x, player.y);
  
  const decision = {
    moveX: 0,
    moveY: 0,
    shouldAttack: false,
    attackTarget: null,
    special: null,
    isStealthed: ai.isStealthed,
  };
  
  // Stealth mechanics
  if (ai.isStealthed) {
    // Move fast while stealthed
    decision.moveX = Math.cos(toPlayer) * stats.speed * 1.3;
    decision.moveY = Math.sin(toPlayer) * stats.speed * 1.3;
    
    // Backstab if close
    if (dist <= stats.attackRange) {
      ai.isStealthed = false;
      decision.isStealthed = false;
      decision.shouldAttack = true;
      decision.attackTarget = { x: player.x, y: player.y };
      decision.damageMultiplier = stats.backstabMultiplier || 2.0;
      decision.special = { type: 'backstab' };
      ai.lastAttackAt = now;
    }
    
    // Stealth timeout
    if (now - ai.stealthStartAt >= (stats.stealthDuration || 3000)) {
      ai.isStealthed = false;
      decision.isStealthed = false;
    }
    
    return decision;
  }
  
  // Enter stealth if far and cooldown ready
  if (dist > stats.preferredDistance && now - ai.lastAttackAt >= stats.attackCooldown) {
    ai.isStealthed = true;
    ai.stealthStartAt = now;
    decision.isStealthed = true;
    return decision;
  }
  
  // Normal approach
  decision.moveX = Math.cos(toPlayer) * stats.speed;
  decision.moveY = Math.sin(toPlayer) * stats.speed;
  
  // Normal attack
  if (dist <= stats.attackRange && now - ai.lastAttackAt >= stats.attackCooldown) {
    decision.shouldAttack = true;
    decision.attackTarget = { x: player.x, y: player.y };
    ai.lastAttackAt = now;
  }
  
  return decision;
}

/**
 * Necromancer AI: Summons on death, projectiles
 */
function necroAI(enemy, player, ai, stats, now, delta, allEnemies) {
  const dist = distance(enemy.x, enemy.y, player.x, player.y);
  const toPlayer = angle(enemy.x, enemy.y, player.x, player.y);
  
  const decision = {
    moveX: 0,
    moveY: 0,
    shouldAttack: false,
    attackTarget: null,
    special: null,
  };
  
  // Stay far back
  if (dist < stats.preferredDistance - 30) {
    decision.moveX = -Math.cos(toPlayer) * stats.speed;
    decision.moveY = -Math.sin(toPlayer) * stats.speed;
  }
  
  // Fire projectile or summon
  if (dist <= stats.attackRange && now - ai.lastAttackAt >= stats.attackCooldown) {
    const minionCount = ai.spawnedMinions.filter(id => {
      return allEnemies.some(e => e.id === id && e.hp > 0);
    }).length;
    
    if (minionCount < (stats.summonCount || 3) && Math.random() < 0.4) {
      decision.special = {
        type: 'summon',
        count: 1,
        position: { x: enemy.x, y: enemy.y },
        archetype: ENEMY_ARCHETYPE.SKIRMISHER, // Summons weak minions
      };
    } else {
      decision.shouldAttack = true;
      decision.attackTarget = { x: player.x, y: player.y };
      decision.special = {
        type: 'projectile',
        speed: stats.projectileSpeed || 180,
        damage: stats.damage,
      };
    }
    ai.lastAttackAt = now;
  }
  
  return decision;
}

// ========== Aggro System ==========

/**
 * Update aggro values
 */
function updateAggro(ai, player, enemy, now) {
  // Decay aggro over time
  for (const [id, value] of ai.aggro) {
    ai.aggro.set(id, value * 0.995);
    if (value < 1) ai.aggro.delete(id);
  }
  
  // Add aggro for player based on proximity
  const dist = distance(enemy.x, enemy.y, player.x, player.y);
  const proximityAggro = Math.max(0, 1 - dist / 400) * 2;
  const current = ai.aggro.get(player.id) || 0;
  ai.aggro.set(player.id, current + proximityAggro);
}

/**
 * Add aggro from damage
 * @param {AIState} ai 
 * @param {string} sourceId 
 * @param {number} damage 
 */
export function addDamageAggro(ai, sourceId, damage) {
  const current = ai.aggro.get(sourceId) || 0;
  ai.aggro.set(sourceId, current + damage * 2);
}

// ========== Type Definitions ==========

/**
 * @typedef {object} EnemyStats
 * @property {string} archetype
 * @property {number} hp
 * @property {number} hpMax
 * @property {number} damage
 * @property {number} speed
 * @property {number} preferredDistance
 * @property {number} attackCooldown
 * @property {number} attackRange
 * @property {string} behavior
 */

/**
 * @typedef {object} AIState
 * @property {string|null} targetId
 * @property {object|null} targetPos
 * @property {string} state
 * @property {number} lastAttackAt
 */

/**
 * @typedef {object} AIDecision
 * @property {number} moveX
 * @property {number} moveY
 * @property {boolean} shouldAttack
 * @property {object|null} attackTarget
 * @property {object|null} special
 */

export default {
  ARCHETYPE_CONFIGS,
  STRATUM_ENEMIES,
  createEnemyStats,
  pickArchetypeForStratum,
  createAIState,
  tickAI,
  addDamageAggro,
};
