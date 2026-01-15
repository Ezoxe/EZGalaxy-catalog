/**
 * SOPOR - Weapons Database
 * Complete weapon catalog with behaviors, stats and effects
 */

import { RARITY } from '../core/constants.js';

/**
 * Weapon behavior types
 */
export const WEAPON_BEHAVIOR = Object.freeze({
  // Melee
  MELEE_ARC: 'melee_arc',
  MELEE_THRUST: 'melee_thrust',
  MELEE_SLAM: 'melee_slam',
  MELEE_WHIP: 'melee_whip',
  MELEE_COMBO: 'melee_combo',
  
  // Projectile
  PROJECTILE_ARROW: 'projectile_arrow',
  PROJECTILE_BOLT: 'projectile_bolt',
  PROJECTILE_PEBBLE: 'projectile_pebble',
  PROJECTILE_ORB: 'projectile_orb',
  PROJECTILE_BOOMERANG: 'projectile_boomerang',
  PROJECTILE_CANNON: 'projectile_cannon',
  PROJECTILE_BURST: 'projectile_burst',
  PROJECTILE_HOMING: 'projectile_homing',
  PROJECTILE_AOE: 'projectile_aoe',
  PROJECTILE_ORBIT: 'projectile_orbit',
  
  // Hybrid
  HYBRID_ARC_ORB: 'hybrid_arc_orb',
  HYBRID_DUAL: 'hybrid_dual',
  
  // Legendary (special)
  LEGENDARY_MORPH: 'legendary_morph',
});

/**
 * Status effect types that weapons can apply
 */
export const WEAPON_STATUS = Object.freeze({
  BURN: 'burn',
  FREEZE: 'freeze',
  BLEED: 'bleed',
  STUN: 'stun',
  POISON: 'poison',
  SLOW: 'slow',
});

/**
 * Complete weapons database
 * @type {Array<WeaponDefinition>}
 */
export const WEAPONS = [
  // ========== BASIC MELEE ==========
  {
    id: "sword_neon",
    nameKey: "weapons.sword_neon",
    type: "melee",
    behaviorId: WEAPON_BEHAVIOR.MELEE_ARC,
    rarity: RARITY.COMMON,
    essenceCost: 0.8,
    cooldownMs: 260,
    damage: 8,
    reach: 34,
    arcDeg: 100,
    knockback: 120,
    comboMultiplier: 1.0,
  },
  {
    id: "dagger_glitch",
    nameKey: "weapons.dagger_glitch",
    type: "melee",
    behaviorId: WEAPON_BEHAVIOR.MELEE_ARC,
    rarity: RARITY.COMMON,
    essenceCost: 0.55,
    cooldownMs: 170,
    damage: 5,
    reach: 26,
    arcDeg: 80,
    knockback: 90,
    comboMultiplier: 1.2, // Fast weapons get better combo scaling
  },
  {
    id: "axe_root",
    nameKey: "weapons.axe_root",
    type: "melee",
    behaviorId: WEAPON_BEHAVIOR.MELEE_ARC,
    rarity: RARITY.UNCOMMON,
    essenceCost: 1.15,
    cooldownMs: 380,
    damage: 12,
    reach: 36,
    arcDeg: 110,
    knockback: 160,
    comboMultiplier: 0.9,
  },
  {
    id: "mace_pulse",
    nameKey: "weapons.mace_pulse",
    type: "melee",
    behaviorId: WEAPON_BEHAVIOR.MELEE_SLAM,
    rarity: RARITY.UNCOMMON,
    essenceCost: 1.5,
    cooldownMs: 520,
    damage: 16,
    radius: 44,
    knockback: 190,
    statusEffect: { type: WEAPON_STATUS.STUN, chance: 0.15, duration: 800 },
  },
  {
    id: "spear_lumen",
    nameKey: "weapons.spear_lumen",
    type: "melee",
    behaviorId: WEAPON_BEHAVIOR.MELEE_THRUST,
    rarity: RARITY.COMMON,
    essenceCost: 0.95,
    cooldownMs: 300,
    damage: 9,
    reach: 56,
    knockback: 120,
    pierce: 1,
  },
  {
    id: "scythe_reaper",
    nameKey: "weapons.scythe_reaper",
    type: "melee",
    behaviorId: WEAPON_BEHAVIOR.MELEE_ARC,
    rarity: RARITY.RARE,
    essenceCost: 1.4,
    cooldownMs: 420,
    damage: 14,
    reach: 52,
    arcDeg: 150,
    knockback: 170,
    statusEffect: { type: WEAPON_STATUS.BLEED, chance: 0.25, duration: 4000 },
  },
  {
    id: "pitchfork_garden",
    nameKey: "weapons.pitchfork_garden",
    type: "melee",
    behaviorId: WEAPON_BEHAVIOR.MELEE_THRUST,
    rarity: RARITY.COMMON,
    essenceCost: 0.75,
    cooldownMs: 240,
    damage: 7,
    reach: 58,
    knockback: 105,
  },
  {
    id: "whip_vine",
    nameKey: "weapons.whip_vine",
    type: "melee",
    behaviorId: WEAPON_BEHAVIOR.MELEE_WHIP,
    rarity: RARITY.UNCOMMON,
    essenceCost: 0.95,
    cooldownMs: 310,
    damage: 8,
    reach: 70,
    knockback: 140,
    pullStrength: 180, // Pulls enemies toward player
  },
  
  // ========== BASIC RANGED ==========
  {
    id: "bow_arc",
    nameKey: "weapons.bow_arc",
    type: "projectile",
    behaviorId: WEAPON_BEHAVIOR.PROJECTILE_ARROW,
    rarity: RARITY.COMMON,
    essenceCost: 0.6,
    cooldownMs: 280,
    damage: 7,
    projectile: { speed: 360, ttlMs: 950, spreadDeg: 2, pierce: 0 },
  },
  {
    id: "crossbow_forge",
    nameKey: "weapons.crossbow_forge",
    type: "projectile",
    behaviorId: WEAPON_BEHAVIOR.PROJECTILE_BOLT,
    rarity: RARITY.UNCOMMON,
    essenceCost: 0.9,
    cooldownMs: 420,
    damage: 12,
    projectile: { speed: 520, ttlMs: 900, spreadDeg: 1, pierce: 1 },
    statusEffect: { type: WEAPON_STATUS.BLEED, chance: 0.2, duration: 3000 },
  },
  {
    id: "slingshot_pocket",
    nameKey: "weapons.slingshot_pocket",
    type: "projectile",
    behaviorId: WEAPON_BEHAVIOR.PROJECTILE_PEBBLE,
    rarity: RARITY.COMMON,
    essenceCost: 0.25,
    cooldownMs: 140,
    damage: 3,
    projectile: { speed: 460, ttlMs: 700, spreadDeg: 5, pierce: 0 },
  },
  {
    id: "wand_mnemosyne",
    nameKey: "weapons.wand_mnemosyne",
    type: "projectile",
    behaviorId: WEAPON_BEHAVIOR.PROJECTILE_ORB,
    rarity: RARITY.UNCOMMON,
    essenceCost: 1.0,
    cooldownMs: 320,
    damage: 9,
    projectile: { speed: 320, ttlMs: 1200, spreadDeg: 0, pierce: 0 },
  },
  {
    id: "chakram_loop",
    nameKey: "weapons.chakram_loop",
    type: "projectile",
    behaviorId: WEAPON_BEHAVIOR.PROJECTILE_BOOMERANG,
    rarity: RARITY.RARE,
    essenceCost: 1.1,
    cooldownMs: 520,
    damage: 11,
    projectile: { speed: 420, ttlMs: 900, spreadDeg: 0, pierce: 1 },
  },
  {
    id: "essence_cannon",
    nameKey: "weapons.essence_cannon",
    type: "projectile",
    behaviorId: WEAPON_BEHAVIOR.PROJECTILE_CANNON,
    rarity: RARITY.EPIC,
    essenceCost: 2.2,
    cooldownMs: 900,
    damage: 24,
    projectile: { speed: 280, ttlMs: 1400, spreadDeg: 0, pierce: 2 },
    explosionRadius: 48,
  },
  {
    id: "needle_gun",
    nameKey: "weapons.needle_gun",
    type: "projectile",
    behaviorId: WEAPON_BEHAVIOR.PROJECTILE_BURST,
    rarity: RARITY.RARE,
    essenceCost: 1.2,
    cooldownMs: 560,
    damage: 6,
    burst: { count: 4, stepMs: 55 },
    projectile: { speed: 600, ttlMs: 650, spreadDeg: 6, pierce: 0 },
  },
  
  // ========== HYBRID ==========
  {
    id: "grimoire_flicker",
    nameKey: "weapons.grimoire_flicker",
    type: "hybrid",
    behaviorId: WEAPON_BEHAVIOR.HYBRID_ARC_ORB,
    rarity: RARITY.RARE,
    essenceCost: 1.25,
    cooldownMs: 360,
    damage: 10,
    reach: 30,
    arcDeg: 95,
    projectile: { speed: 300, ttlMs: 1150, spreadDeg: 0, pierce: 0 },
  },
  
  // ========== NEW WEAPONS (12 additional) ==========
  
  // Temporal Scythe - Slows enemies
  {
    id: "scythe_temporal",
    nameKey: "weapons.scythe_temporal",
    type: "melee",
    behaviorId: WEAPON_BEHAVIOR.MELEE_ARC,
    rarity: RARITY.EPIC,
    essenceCost: 1.8,
    cooldownMs: 480,
    damage: 16,
    reach: 58,
    arcDeg: 160,
    knockback: 150,
    statusEffect: { type: WEAPON_STATUS.SLOW, chance: 0.4, duration: 3500 },
    specialEffect: "timeDistortion", // Visual effect
  },
  
  // Dream Gauntlets - 5-hit combo weapon
  {
    id: "gauntlets_dream",
    nameKey: "weapons.gauntlets_dream",
    type: "melee",
    behaviorId: WEAPON_BEHAVIOR.MELEE_COMBO,
    rarity: RARITY.RARE,
    essenceCost: 0.4, // Low cost per hit
    cooldownMs: 120, // Very fast
    damage: 4,
    reach: 22,
    arcDeg: 70,
    knockback: 60,
    comboMultiplier: 1.5, // Big combo scaling
    maxCombo: 5,
    finisherDamageMultiplier: 2.5,
  },
  
  // Shadow Spear - Passes through enemies
  {
    id: "spear_shadow",
    nameKey: "weapons.spear_shadow",
    type: "melee",
    behaviorId: WEAPON_BEHAVIOR.MELEE_THRUST,
    rarity: RARITY.EPIC,
    essenceCost: 1.3,
    cooldownMs: 340,
    damage: 11,
    reach: 72, // Very long
    knockback: 100,
    pierce: 3, // Hits up to 3 enemies
    statusEffect: { type: WEAPON_STATUS.BLEED, chance: 0.3, duration: 4000 },
  },
  
  // Plasma Whip - Chain damage
  {
    id: "whip_plasma",
    nameKey: "weapons.whip_plasma",
    type: "melee",
    behaviorId: WEAPON_BEHAVIOR.MELEE_WHIP,
    rarity: RARITY.RARE,
    essenceCost: 1.15,
    cooldownMs: 350,
    damage: 9,
    reach: 80,
    knockback: 120,
    chainDamage: { maxTargets: 3, damageDecay: 0.7 }, // Chains to nearby enemies
    statusEffect: { type: WEAPON_STATUS.BURN, chance: 0.35, duration: 3000 },
  },
  
  // Spectral Bow - Homing arrows
  {
    id: "bow_spectral",
    nameKey: "weapons.bow_spectral",
    type: "projectile",
    behaviorId: WEAPON_BEHAVIOR.PROJECTILE_HOMING,
    rarity: RARITY.RARE,
    essenceCost: 1.0,
    cooldownMs: 380,
    damage: 8,
    projectile: { speed: 280, ttlMs: 1400, spreadDeg: 0, pierce: 0, homingStrength: 0.08 },
  },
  
  // Corruption Scepter - AoE explosion
  {
    id: "scepter_corruption",
    nameKey: "weapons.scepter_corruption",
    type: "projectile",
    behaviorId: WEAPON_BEHAVIOR.PROJECTILE_AOE,
    rarity: RARITY.EPIC,
    essenceCost: 1.8,
    cooldownMs: 600,
    damage: 14,
    projectile: { speed: 240, ttlMs: 1000, spreadDeg: 0, pierce: 0 },
    explosionRadius: 64,
    statusEffect: { type: WEAPON_STATUS.POISON, chance: 0.5, duration: 5000 },
  },
  
  // Twin Blade - Dual attack
  {
    id: "blade_twin",
    nameKey: "weapons.blade_twin",
    type: "hybrid",
    behaviorId: WEAPON_BEHAVIOR.HYBRID_DUAL,
    rarity: RARITY.RARE,
    essenceCost: 1.0,
    cooldownMs: 280,
    damage: 6, // Per hit, hits twice
    reach: 32,
    arcDeg: 90,
    knockback: 100,
    doubleStrike: true, // Attacks twice per click
    comboMultiplier: 1.3,
  },
  
  // Nexus Hammer - Massive slam with shockwave
  {
    id: "hammer_nexus",
    nameKey: "weapons.hammer_nexus",
    type: "melee",
    behaviorId: WEAPON_BEHAVIOR.MELEE_SLAM,
    rarity: RARITY.EPIC,
    essenceCost: 2.0,
    cooldownMs: 700,
    damage: 22,
    radius: 56,
    knockback: 250,
    shockwaveRadius: 80, // Additional shockwave
    shockwaveDamage: 8,
    statusEffect: { type: WEAPON_STATUS.STUN, chance: 0.3, duration: 1200 },
  },
  
  // Dream Pistol - 5-shot burst
  {
    id: "pistol_dream",
    nameKey: "weapons.pistol_dream",
    type: "projectile",
    behaviorId: WEAPON_BEHAVIOR.PROJECTILE_BURST,
    rarity: RARITY.UNCOMMON,
    essenceCost: 1.0,
    cooldownMs: 480,
    damage: 5,
    burst: { count: 5, stepMs: 45 },
    projectile: { speed: 580, ttlMs: 600, spreadDeg: 4, pierce: 0 },
  },
  
  // Awakening Chains - Immobilize + pull
  {
    id: "chains_awakening",
    nameKey: "weapons.chains_awakening",
    type: "melee",
    behaviorId: WEAPON_BEHAVIOR.MELEE_WHIP,
    rarity: RARITY.RARE,
    essenceCost: 1.3,
    cooldownMs: 420,
    damage: 7,
    reach: 85,
    knockback: 0, // No knockback
    pullStrength: 220,
    statusEffect: { type: WEAPON_STATUS.STUN, chance: 0.25, duration: 1000 },
  },
  
  // Ancestral Orb - Orbiting shield projectile
  {
    id: "orb_ancestral",
    nameKey: "weapons.orb_ancestral",
    type: "projectile",
    behaviorId: WEAPON_BEHAVIOR.PROJECTILE_ORBIT,
    rarity: RARITY.EPIC,
    essenceCost: 1.6,
    cooldownMs: 800,
    damage: 10,
    orbit: { radius: 48, duration: 4000, rotationSpeed: 3.5, maxOrbs: 3 },
    projectile: { speed: 0, ttlMs: 4000, spreadDeg: 0, pierce: 99 },
  },
  
  // ========== LEGENDARY WEAPON ==========
  
  // Architect's Sword - Morphing weapon
  {
    id: "sword_architect",
    nameKey: "weapons.sword_architect",
    type: "legendary",
    behaviorId: WEAPON_BEHAVIOR.LEGENDARY_MORPH,
    rarity: RARITY.LEGENDARY,
    essenceCost: 1.5,
    cooldownMs: 300,
    damage: 15,
    reach: 42,
    arcDeg: 120,
    knockback: 150,
    morphForms: ["sword", "spear", "hammer", "bow"],
    morphCooldownMs: 5000,
    passiveEffect: {
      name: "architect_mastery",
      description: "Adapts to your fighting style. Changes form after combo finisher.",
      bonusDamagePercent: 10,
      essenceOnKill: 2,
    },
  },
];

// ========== Helper Functions ==========

/**
 * Get weapon by ID
 * @param {string} id 
 * @returns {WeaponDefinition|null}
 */
export function getWeaponById(id) {
  return WEAPONS.find(w => w.id === id) || null;
}

/**
 * Get weapons by rarity
 * @param {string} rarity 
 * @returns {WeaponDefinition[]}
 */
export function getWeaponsByRarity(rarity) {
  return WEAPONS.filter(w => w.rarity === rarity);
}

/**
 * Get weapons by type
 * @param {string} type - 'melee', 'projectile', 'hybrid', 'legendary'
 * @returns {WeaponDefinition[]}
 */
export function getWeaponsByType(type) {
  return WEAPONS.filter(w => w.type === type);
}

/**
 * Get all melee weapons
 * @returns {WeaponDefinition[]}
 */
export function getMeleeWeapons() {
  return WEAPONS.filter(w => w.type === 'melee' || w.type === 'hybrid' || w.type === 'legendary');
}

/**
 * Get all ranged weapons
 * @returns {WeaponDefinition[]}
 */
export function getRangedWeapons() {
  return WEAPONS.filter(w => w.type === 'projectile' || w.type === 'hybrid');
}

/**
 * Check if weapon is melee
 * @param {WeaponDefinition} weapon 
 * @returns {boolean}
 */
export function isMeleeWeapon(weapon) {
  return weapon.type === 'melee' || weapon.type === 'hybrid' || weapon.type === 'legendary';
}

/**
 * Check if weapon is ranged
 * @param {WeaponDefinition} weapon 
 * @returns {boolean}
 */
export function isRangedWeapon(weapon) {
  return weapon.type === 'projectile' || weapon.type === 'hybrid';
}

/**
 * Get starter weapons (for new players)
 * @returns {string[]}
 */
export function getStarterWeaponIds() {
  return ["sword_neon", "bow_arc", "slingshot_pocket"];
}

/**
 * Get random weapon by rarity with weighting
 * @param {object} rng - RNG instance
 * @param {string[]} [excludeIds] - IDs to exclude
 * @returns {WeaponDefinition|null}
 */
export function getRandomWeapon(rng, excludeIds = []) {
  // Rarity weights
  const weights = {
    [RARITY.COMMON]: 50,
    [RARITY.UNCOMMON]: 30,
    [RARITY.RARE]: 15,
    [RARITY.EPIC]: 4,
    [RARITY.LEGENDARY]: 1,
  };
  
  const available = WEAPONS.filter(w => !excludeIds.includes(w.id));
  if (available.length === 0) return null;
  
  // Calculate total weight
  let totalWeight = 0;
  for (const w of available) {
    totalWeight += weights[w.rarity] || 1;
  }
  
  // Pick random
  let roll = rng.next() * totalWeight;
  for (const w of available) {
    roll -= weights[w.rarity] || 1;
    if (roll <= 0) return w;
  }
  
  return available[0];
}

/**
 * Calculate effective damage with modifiers
 * @param {WeaponDefinition} weapon 
 * @param {object} options 
 * @returns {number}
 */
export function calculateWeaponDamage(weapon, options = {}) {
  const {
    comboStage = 0,
    isCritical = false,
    playerDamageBonus = 0,
    targetVulnerability = 0,
  } = options;
  
  let damage = weapon.damage;
  
  // Combo bonus
  if (comboStage > 0) {
    const comboMul = weapon.comboMultiplier || 1.0;
    damage *= 1 + (comboStage * 0.15 * comboMul);
  }
  
  // Critical hit
  if (isCritical) {
    damage *= 1.75;
  }
  
  // Player bonus
  damage *= 1 + (playerDamageBonus / 100);
  
  // Target vulnerability
  damage *= 1 + (targetVulnerability / 100);
  
  return Math.round(damage);
}

// Type definition for documentation
/**
 * @typedef {object} WeaponDefinition
 * @property {string} id - Unique identifier
 * @property {string} nameKey - i18n key for name
 * @property {string} type - 'melee', 'projectile', 'hybrid', 'legendary'
 * @property {string} behaviorId - Combat behavior type
 * @property {string} rarity - Rarity tier
 * @property {number} essenceCost - Essence cost per attack
 * @property {number} cooldownMs - Attack cooldown
 * @property {number} damage - Base damage
 * @property {number} [reach] - Melee reach in pixels
 * @property {number} [arcDeg] - Arc angle in degrees
 * @property {number} [radius] - Slam radius
 * @property {number} [knockback] - Knockback force
 * @property {number} [pierce] - Number of enemies to pierce
 * @property {number} [comboMultiplier] - Combo damage scaling
 * @property {object} [projectile] - Projectile settings
 * @property {object} [burst] - Burst fire settings
 * @property {object} [statusEffect] - Status effect to apply
 * @property {object} [passiveEffect] - Legendary passive effect
 */

export default WEAPONS;
