/**
 * SOPOR - Progression System
 * Handles leveling, skill trees, equipment, and character advancement
 */

import { SKILLS, RARITY, EQUIPMENT_SLOTS } from '../core/constants.js';
import { clamp } from '../core/utils.js';

// ========== XP & Leveling ==========

/**
 * XP required for each level
 * Formula: 100 * level^1.5
 */
export function xpForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

/**
 * Calculate total XP for reaching a level
 */
export function totalXpForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

/**
 * Calculate level from total XP
 */
export function levelFromXp(totalXp) {
  let level = 1;
  let accumulated = 0;
  
  while (accumulated + xpForLevel(level) <= totalXp) {
    accumulated += xpForLevel(level);
    level++;
    if (level > 99) break; // Cap at 99
  }
  
  return {
    level,
    currentXp: totalXp - accumulated,
    xpToNext: xpForLevel(level),
    progress: (totalXp - accumulated) / xpForLevel(level),
  };
}

/**
 * XP rewards by source
 */
export const XP_REWARDS = {
  enemyKill: (enemyLevel) => Math.floor(15 + enemyLevel * 8),
  bossKill: (bossLevel) => Math.floor(200 + bossLevel * 50),
  questComplete: (questDifficulty) => Math.floor(100 + questDifficulty * 100),
  dungeonClear: (dungeonDepth) => Math.floor(150 + dungeonDepth * 30),
  discoveryBonus: 25,
  firstKillBonus: 50,
};

// ========== Skill Tree System ==========

/**
 * Skill tree branches
 */
export const SKILL_BRANCHES = {
  EVEIL: 'eveil',       // Awakening - Defensive/Utility
  COMBAT: 'combat',     // Combat - Offensive
  ESSENCE: 'essence',   // Essence - Magic/Special
};

/**
 * Full skill tree definition
 */
export const SKILL_TREE = {
  // === ÉVEIL (Awakening) Branch ===
  [SKILLS.VIE_PLUS]: {
    branch: SKILL_BRANCHES.EVEIL,
    nameKey: 'skill.vie_plus',
    descKey: 'skill.vie_plus.desc',
    maxLevel: 5,
    cost: [1, 1, 2, 2, 3],
    requires: [],
    effect: (level) => ({ hpBonus: level * 15 }),
  },
  [SKILLS.REGEN]: {
    branch: SKILL_BRANCHES.EVEIL,
    nameKey: 'skill.regen',
    descKey: 'skill.regen.desc',
    maxLevel: 3,
    cost: [2, 2, 3],
    requires: [[SKILLS.VIE_PLUS, 2]],
    effect: (level) => ({ hpRegenPerSec: level * 0.5 }),
  },
  [SKILLS.BOUCLIER]: {
    branch: SKILL_BRANCHES.EVEIL,
    nameKey: 'skill.bouclier',
    descKey: 'skill.bouclier.desc',
    maxLevel: 3,
    cost: [2, 3, 3],
    requires: [[SKILLS.REGEN, 1]],
    effect: (level) => ({ shieldOnParry: level * 5 }),
  },
  [SKILLS.SPRINT]: {
    branch: SKILL_BRANCHES.EVEIL,
    nameKey: 'skill.sprint',
    descKey: 'skill.sprint.desc',
    maxLevel: 3,
    cost: [1, 2, 2],
    requires: [],
    effect: (level) => ({ sprintSpeedBonus: 0.15 + level * 0.1 }),
  },
  [SKILLS.ESQUIVE]: {
    branch: SKILL_BRANCHES.EVEIL,
    nameKey: 'skill.esquive',
    descKey: 'skill.esquive.desc',
    maxLevel: 3,
    cost: [2, 2, 3],
    requires: [[SKILLS.SPRINT, 2]],
    effect: (level) => ({ dodgeChance: level * 0.05 }),
  },
  [SKILLS.SECOND_SOUFFLE]: {
    branch: SKILL_BRANCHES.EVEIL,
    nameKey: 'skill.second_souffle',
    descKey: 'skill.second_souffle.desc',
    maxLevel: 1,
    cost: [5],
    requires: [[SKILLS.BOUCLIER, 2], [SKILLS.ESQUIVE, 2]],
    effect: () => ({ reviveOnce: true, reviveHpPercent: 0.3 }),
  },
  
  // === COMBAT Branch ===
  [SKILLS.DEGATS]: {
    branch: SKILL_BRANCHES.COMBAT,
    nameKey: 'skill.degats',
    descKey: 'skill.degats.desc',
    maxLevel: 5,
    cost: [1, 1, 2, 2, 3],
    requires: [],
    effect: (level) => ({ damageBonus: level * 0.08 }),
  },
  [SKILLS.CRITIQUE]: {
    branch: SKILL_BRANCHES.COMBAT,
    nameKey: 'skill.critique',
    descKey: 'skill.critique.desc',
    maxLevel: 3,
    cost: [2, 2, 3],
    requires: [[SKILLS.DEGATS, 2]],
    effect: (level) => ({ critChanceBonus: level * 0.05 }),
  },
  [SKILLS.COMBO_MAITRE]: {
    branch: SKILL_BRANCHES.COMBAT,
    nameKey: 'skill.combo_maitre',
    descKey: 'skill.combo_maitre.desc',
    maxLevel: 3,
    cost: [2, 3, 3],
    requires: [[SKILLS.CRITIQUE, 1]],
    effect: (level) => ({ comboDecayReduction: level * 0.15 }),
  },
  [SKILLS.FINISHER]: {
    branch: SKILL_BRANCHES.COMBAT,
    nameKey: 'skill.finisher',
    descKey: 'skill.finisher.desc',
    maxLevel: 3,
    cost: [3, 3, 4],
    requires: [[SKILLS.COMBO_MAITRE, 2]],
    effect: (level) => ({ finisherDamageBonus: level * 0.25 }),
  },
  [SKILLS.VITESSE_ATTAQUE]: {
    branch: SKILL_BRANCHES.COMBAT,
    nameKey: 'skill.vitesse_attaque',
    descKey: 'skill.vitesse_attaque.desc',
    maxLevel: 3,
    cost: [2, 2, 3],
    requires: [[SKILLS.DEGATS, 1]],
    effect: (level) => ({ attackSpeedBonus: level * 0.1 }),
  },
  [SKILLS.PARADE_PARFAITE]: {
    branch: SKILL_BRANCHES.COMBAT,
    nameKey: 'skill.parade_parfaite',
    descKey: 'skill.parade_parfaite.desc',
    maxLevel: 2,
    cost: [3, 4],
    requires: [[SKILLS.CRITIQUE, 2]],
    effect: (level) => ({ parryWindowBonus: level * 50, parryDamageReflect: level * 0.15 }),
  },
  [SKILLS.BERSERK]: {
    branch: SKILL_BRANCHES.COMBAT,
    nameKey: 'skill.berserk',
    descKey: 'skill.berserk.desc',
    maxLevel: 1,
    cost: [5],
    requires: [[SKILLS.FINISHER, 2], [SKILLS.VITESSE_ATTAQUE, 2]],
    effect: () => ({ berserkMode: true, berserkThreshold: 0.25, berserkDamageBonus: 0.5 }),
  },
  
  // === ESSENCE Branch ===
  [SKILLS.MANA_PLUS]: {
    branch: SKILL_BRANCHES.ESSENCE,
    nameKey: 'skill.mana_plus',
    descKey: 'skill.mana_plus.desc',
    maxLevel: 5,
    cost: [1, 1, 2, 2, 3],
    requires: [],
    effect: (level) => ({ manaBonus: level * 10 }),
  },
  [SKILLS.DRAIN_VIE]: {
    branch: SKILL_BRANCHES.ESSENCE,
    nameKey: 'skill.drain_vie',
    descKey: 'skill.drain_vie.desc',
    maxLevel: 3,
    cost: [2, 3, 3],
    requires: [[SKILLS.MANA_PLUS, 2]],
    effect: (level) => ({ lifeStealPercent: level * 0.03 }),
  },
  [SKILLS.AURA_PROTECTION]: {
    branch: SKILL_BRANCHES.ESSENCE,
    nameKey: 'skill.aura_protection',
    descKey: 'skill.aura_protection.desc',
    maxLevel: 3,
    cost: [2, 3, 4],
    requires: [[SKILLS.DRAIN_VIE, 1]],
    effect: (level) => ({ damageReduction: level * 0.05 }),
  },
  [SKILLS.STATUS_MAITRE]: {
    branch: SKILL_BRANCHES.ESSENCE,
    nameKey: 'skill.status_maitre',
    descKey: 'skill.status_maitre.desc',
    maxLevel: 3,
    cost: [2, 2, 3],
    requires: [[SKILLS.MANA_PLUS, 1]],
    effect: (level) => ({ statusDurationBonus: level * 0.2, statusDamageBonus: level * 0.15 }),
  },
  [SKILLS.EXPLOSION_MANA]: {
    branch: SKILL_BRANCHES.ESSENCE,
    nameKey: 'skill.explosion_mana',
    descKey: 'skill.explosion_mana.desc',
    maxLevel: 2,
    cost: [3, 4],
    requires: [[SKILLS.STATUS_MAITRE, 2]],
    effect: (level) => ({ manaExplosionDamage: 20 + level * 15, manaExplosionRadius: 80 + level * 20 }),
  },
  [SKILLS.TRANSCENDANCE]: {
    branch: SKILL_BRANCHES.ESSENCE,
    nameKey: 'skill.transcendance',
    descKey: 'skill.transcendance.desc',
    maxLevel: 1,
    cost: [6],
    requires: [[SKILLS.AURA_PROTECTION, 2], [SKILLS.EXPLOSION_MANA, 2]],
    effect: () => ({ transcendenceMode: true, invincibilityDuration: 3000, cooldown: 60000 }),
  },
};

/**
 * Create default skill state
 */
export function createSkillState() {
  const skills = {};
  for (const skillId of Object.keys(SKILL_TREE)) {
    skills[skillId] = 0;
  }
  return skills;
}

/**
 * Check if a skill can be upgraded
 */
export function canUpgradeSkill(skillId, currentSkills, availablePoints) {
  const skill = SKILL_TREE[skillId];
  if (!skill) return { can: false, reason: 'unknown_skill' };
  
  const currentLevel = currentSkills[skillId] || 0;
  
  // Max level check
  if (currentLevel >= skill.maxLevel) {
    return { can: false, reason: 'max_level' };
  }
  
  // Cost check
  const cost = skill.cost[currentLevel];
  if (availablePoints < cost) {
    return { can: false, reason: 'not_enough_points', required: cost };
  }
  
  // Requirements check
  for (const [reqSkillId, reqLevel] of skill.requires) {
    if ((currentSkills[reqSkillId] || 0) < reqLevel) {
      return { can: false, reason: 'missing_requirement', required: { skill: reqSkillId, level: reqLevel } };
    }
  }
  
  return { can: true, cost };
}

/**
 * Upgrade a skill
 */
export function upgradeSkill(skillId, currentSkills, availablePoints) {
  const check = canUpgradeSkill(skillId, currentSkills, availablePoints);
  if (!check.can) return { success: false, ...check };
  
  const newSkills = { ...currentSkills };
  newSkills[skillId] = (newSkills[skillId] || 0) + 1;
  
  return {
    success: true,
    newSkills,
    pointsSpent: check.cost,
    remainingPoints: availablePoints - check.cost,
  };
}

/**
 * Calculate total effects from skills
 */
export function calculateSkillEffects(skills) {
  const effects = {
    hpBonus: 0,
    hpRegenPerSec: 0,
    shieldOnParry: 0,
    sprintSpeedBonus: 0,
    dodgeChance: 0,
    reviveOnce: false,
    reviveHpPercent: 0,
    damageBonus: 0,
    critChanceBonus: 0,
    comboDecayReduction: 0,
    finisherDamageBonus: 0,
    attackSpeedBonus: 0,
    parryWindowBonus: 0,
    parryDamageReflect: 0,
    berserkMode: false,
    berserkThreshold: 0,
    berserkDamageBonus: 0,
    manaBonus: 0,
    lifeStealPercent: 0,
    damageReduction: 0,
    statusDurationBonus: 0,
    statusDamageBonus: 0,
    manaExplosionDamage: 0,
    manaExplosionRadius: 0,
    transcendenceMode: false,
    invincibilityDuration: 0,
    cooldown: 0,
  };
  
  for (const [skillId, level] of Object.entries(skills)) {
    if (level <= 0) continue;
    
    const skill = SKILL_TREE[skillId];
    if (!skill) continue;
    
    const skillEffects = skill.effect(level);
    for (const [key, value] of Object.entries(skillEffects)) {
      if (typeof value === 'boolean') {
        effects[key] = value;
      } else if (typeof value === 'number') {
        effects[key] = (effects[key] || 0) + value;
      }
    }
  }
  
  return effects;
}

/**
 * Get skill points per level
 */
export function skillPointsAtLevel(level) {
  // 1 point per level, bonus every 5 levels
  return level + Math.floor(level / 5);
}

/**
 * Calculate available skill points
 */
export function availableSkillPoints(level, spentPoints) {
  return skillPointsAtLevel(level) - spentPoints;
}

/**
 * Count total spent skill points
 */
export function countSpentSkillPoints(skills) {
  let total = 0;
  
  for (const [skillId, level] of Object.entries(skills)) {
    const skill = SKILL_TREE[skillId];
    if (!skill) continue;
    
    for (let i = 0; i < level; i++) {
      total += skill.cost[i] || 0;
    }
  }
  
  return total;
}

// ========== Equipment System ==========

/**
 * Equipment slot definitions
 */
export const SLOT_DEFINITIONS = {
  [EQUIPMENT_SLOTS.WEAPON]: {
    nameKey: 'equipment.slot.weapon',
    allowedTypes: ['weapon'],
    maxCount: 1,
  },
  [EQUIPMENT_SLOTS.ARMOR]: {
    nameKey: 'equipment.slot.armor',
    allowedTypes: ['armor'],
    maxCount: 1,
  },
  [EQUIPMENT_SLOTS.ACCESSORY]: {
    nameKey: 'equipment.slot.accessory',
    allowedTypes: ['accessory', 'ring', 'amulet'],
    maxCount: 2,
  },
  [EQUIPMENT_SLOTS.CONSUMABLE]: {
    nameKey: 'equipment.slot.consumable',
    allowedTypes: ['consumable', 'potion'],
    maxCount: 3,
  },
};

/**
 * Create default equipment state
 */
export function createEquipmentState() {
  return {
    [EQUIPMENT_SLOTS.WEAPON]: null,
    [EQUIPMENT_SLOTS.ARMOR]: null,
    [EQUIPMENT_SLOTS.ACCESSORY]: [],
    [EQUIPMENT_SLOTS.CONSUMABLE]: [],
  };
}

/**
 * Equip an item
 */
export function equipItem(equipment, item, slot) {
  const slotDef = SLOT_DEFINITIONS[slot];
  if (!slotDef) return { success: false, reason: 'invalid_slot' };
  
  if (!slotDef.allowedTypes.includes(item.type)) {
    return { success: false, reason: 'type_mismatch' };
  }
  
  const newEquipment = { ...equipment };
  let unequipped = null;
  
  if (slotDef.maxCount === 1) {
    // Single slot - replace
    unequipped = newEquipment[slot];
    newEquipment[slot] = item;
  } else {
    // Multi slot - add or replace oldest
    const arr = [...(newEquipment[slot] || [])];
    if (arr.length >= slotDef.maxCount) {
      unequipped = arr.shift();
    }
    arr.push(item);
    newEquipment[slot] = arr;
  }
  
  return { success: true, newEquipment, unequipped };
}

/**
 * Unequip an item
 */
export function unequipItem(equipment, slot, index = 0) {
  const slotDef = SLOT_DEFINITIONS[slot];
  if (!slotDef) return { success: false, reason: 'invalid_slot' };
  
  const newEquipment = { ...equipment };
  let unequipped = null;
  
  if (slotDef.maxCount === 1) {
    unequipped = newEquipment[slot];
    newEquipment[slot] = null;
  } else {
    const arr = [...(newEquipment[slot] || [])];
    if (index >= 0 && index < arr.length) {
      unequipped = arr.splice(index, 1)[0];
      newEquipment[slot] = arr;
    }
  }
  
  return { success: true, newEquipment, unequipped };
}

/**
 * Calculate total equipment bonuses
 */
export function calculateEquipmentStats(equipment) {
  const stats = {
    hpBonus: 0,
    damageBonus: 0,
    armorBonus: 0,
    speedBonus: 0,
    critBonus: 0,
    manaBonus: 0,
  };
  
  const processItem = (item) => {
    if (!item || !item.stats) return;
    
    for (const [stat, value] of Object.entries(item.stats)) {
      if (stats.hasOwnProperty(stat)) {
        stats[stat] += value;
      }
    }
  };
  
  for (const [slot, slotDef] of Object.entries(SLOT_DEFINITIONS)) {
    const equipped = equipment[slot];
    if (!equipped) continue;
    
    if (Array.isArray(equipped)) {
      equipped.forEach(processItem);
    } else {
      processItem(equipped);
    }
  }
  
  return stats;
}

// ========== Base Stats ==========

/**
 * Base player stats (without equipment/skills)
 */
export const BASE_PLAYER_STATS = {
  hp: 100,
  hpMax: 100,
  mana: 50,
  manaMax: 50,
  damage: 10,
  armor: 0,
  speed: 120,
  critChance: 0.05,
  critMultiplier: 1.5,
};

/**
 * Calculate final player stats
 */
export function calculateFinalStats(level, skills, equipment) {
  const base = { ...BASE_PLAYER_STATS };
  const skillEffects = calculateSkillEffects(skills);
  const equipStats = calculateEquipmentStats(equipment);
  
  // Level scaling
  const levelBonus = (level - 1) * 0.02;
  
  return {
    hp: base.hp + skillEffects.hpBonus + equipStats.hpBonus + Math.floor(level * 5),
    hpMax: base.hpMax + skillEffects.hpBonus + equipStats.hpBonus + Math.floor(level * 5),
    mana: base.mana + skillEffects.manaBonus + equipStats.manaBonus + Math.floor(level * 2),
    manaMax: base.manaMax + skillEffects.manaBonus + equipStats.manaBonus + Math.floor(level * 2),
    damage: Math.floor(base.damage * (1 + skillEffects.damageBonus + levelBonus) + equipStats.damageBonus),
    armor: base.armor + equipStats.armorBonus,
    speed: base.speed * (1 + skillEffects.sprintSpeedBonus + equipStats.speedBonus * 0.01),
    critChance: base.critChance + skillEffects.critChanceBonus + equipStats.critBonus,
    critMultiplier: base.critMultiplier,
    
    // Pass through skill effects
    hpRegenPerSec: skillEffects.hpRegenPerSec,
    dodgeChance: skillEffects.dodgeChance,
    lifeStealPercent: skillEffects.lifeStealPercent,
    damageReduction: skillEffects.damageReduction,
    attackSpeedBonus: skillEffects.attackSpeedBonus,
    parryWindowBonus: skillEffects.parryWindowBonus,
    parryDamageReflect: skillEffects.parryDamageReflect,
    comboDecayReduction: skillEffects.comboDecayReduction,
    finisherDamageBonus: skillEffects.finisherDamageBonus,
    statusDurationBonus: skillEffects.statusDurationBonus,
    statusDamageBonus: skillEffects.statusDamageBonus,
    
    // Special abilities
    berserkMode: skillEffects.berserkMode,
    berserkThreshold: skillEffects.berserkThreshold,
    berserkDamageBonus: skillEffects.berserkDamageBonus,
    reviveOnce: skillEffects.reviveOnce,
    reviveHpPercent: skillEffects.reviveHpPercent,
    transcendenceMode: skillEffects.transcendenceMode,
    invincibilityDuration: skillEffects.invincibilityDuration,
    shieldOnParry: skillEffects.shieldOnParry,
    manaExplosionDamage: skillEffects.manaExplosionDamage,
    manaExplosionRadius: skillEffects.manaExplosionRadius,
  };
}

// ========== Character State ==========

/**
 * Create default character state
 */
export function createCharacterState() {
  return {
    level: 1,
    xp: 0,
    skills: createSkillState(),
    equipment: createEquipmentState(),
    stats: null, // Calculated on demand
  };
}

/**
 * Add XP and handle level ups
 */
export function addXp(character, amount) {
  const oldLevel = levelFromXp(character.xp).level;
  const newXp = character.xp + amount;
  const newLevelInfo = levelFromXp(newXp);
  
  const levelUps = newLevelInfo.level - oldLevel;
  const newSkillPoints = levelUps > 0 ? 
    skillPointsAtLevel(newLevelInfo.level) - skillPointsAtLevel(oldLevel) : 0;
  
  return {
    newXp,
    newLevel: newLevelInfo.level,
    levelUps,
    newSkillPoints,
    progress: newLevelInfo.progress,
    xpToNext: newLevelInfo.xpToNext,
    currentXp: newLevelInfo.currentXp,
  };
}

// ========== Type Definitions ==========

/**
 * @typedef {object} CharacterState
 * @property {number} level
 * @property {number} xp
 * @property {object} skills
 * @property {object} equipment
 * @property {object|null} stats
 */

/**
 * @typedef {object} SkillDefinition
 * @property {string} branch
 * @property {string} nameKey
 * @property {string} descKey
 * @property {number} maxLevel
 * @property {number[]} cost
 * @property {Array} requires
 * @property {function} effect
 */

export default {
  // XP & Leveling
  xpForLevel,
  totalXpForLevel,
  levelFromXp,
  XP_REWARDS,
  
  // Skills
  SKILL_BRANCHES,
  SKILL_TREE,
  createSkillState,
  canUpgradeSkill,
  upgradeSkill,
  calculateSkillEffects,
  skillPointsAtLevel,
  availableSkillPoints,
  countSpentSkillPoints,
  
  // Equipment
  SLOT_DEFINITIONS,
  createEquipmentState,
  equipItem,
  unequipItem,
  calculateEquipmentStats,
  
  // Stats
  BASE_PLAYER_STATS,
  calculateFinalStats,
  
  // Character
  createCharacterState,
  addXp,
};

// ========== Compatibility Aliases ==========

// Alias for createCharacterState
export const createPlayerProgression = createCharacterState;

// Alias for addXp (camelCase variant)
export const addXP = addXp;

// Alias for upgradeSkill
export const unlockSkill = upgradeSkill;

// Alias for calculateFinalStats
export const calculateStats = calculateFinalStats;

/**
 * Level up (compatibility wrapper)
 * @param {object} character 
 * @returns {object}
 */
export function levelUp(character) {
  if (!character) return { success: false };
  const xpNeeded = xpForLevel(character.level + 1);
  if (character.xp >= xpNeeded) {
    character.level++;
    character.xp -= xpNeeded;
    character.skillPoints = (character.skillPoints || 0) + 1;
    return { success: true, newLevel: character.level };
  }
  return { success: false };
}
