/**
 * SOPOR - Boss System
 * Defines boss encounters with multiple phases, special attacks, and mechanics
 */

import { STRATA, STATUS_EFFECTS } from '../core/constants.js';
import { distance, angle, makeRng, normalizeAngle, lerp } from '../core/utils.js';

// ========== Boss Definitions ==========

/**
 * Boss identifiers
 */
export const BOSS_IDS = {
  GUARDIAN_ROOTS: 'guardian_roots',       // Jardin du Somnambule
  NIGHTMARE_FORGER: 'nightmare_forger',   // Forge des Cauchemars
  CRYSTAL_LORD: 'crystal_lord',           // Abîme Cristallin
  FALLEN_ARCHITECT: 'fallen_architect',   // Nexus de l'Oubli
};

/**
 * Full boss configurations
 */
export const BOSS_CONFIGS = {
  // ========== GARDIEN DES RACINES ==========
  // Boss du Jardin du Somnambule - Nature/Terre
  [BOSS_IDS.GUARDIAN_ROOTS]: {
    nameKey: 'boss.guardian_roots',
    stratum: STRATA.JARDIN,
    
    // Base stats
    hp: 800,
    damage: 15,
    armor: 5,
    speed: 50,
    
    // Visual
    size: 64,
    color: 0x4a7c3f,
    
    // Phases at HP thresholds
    phases: [
      { threshold: 1.0, name: 'awakening' },
      { threshold: 0.65, name: 'growth' },
      { threshold: 0.3, name: 'wrath' },
    ],
    
    // Attacks per phase
    attacks: {
      awakening: [
        { id: 'root_sweep', cooldown: 2500, weight: 40 },
        { id: 'seed_burst', cooldown: 4000, weight: 35 },
        { id: 'vine_grab', cooldown: 5000, weight: 25 },
      ],
      growth: [
        { id: 'root_sweep', cooldown: 2000, weight: 30 },
        { id: 'seed_burst', cooldown: 3500, weight: 25 },
        { id: 'vine_grab', cooldown: 4000, weight: 20 },
        { id: 'thorn_wall', cooldown: 8000, weight: 25 },
      ],
      wrath: [
        { id: 'root_storm', cooldown: 3000, weight: 35 },
        { id: 'seed_burst', cooldown: 2500, weight: 20 },
        { id: 'vine_grab', cooldown: 3000, weight: 15 },
        { id: 'thorn_wall', cooldown: 6000, weight: 15 },
        { id: 'nature_fury', cooldown: 12000, weight: 15 },
      ],
    },
    
    // Attack definitions
    attackDefs: {
      root_sweep: {
        nameKey: 'attack.root_sweep',
        damage: 18,
        range: 80,
        arc: Math.PI * 0.6,
        telegraphMs: 600,
        type: 'melee',
      },
      seed_burst: {
        nameKey: 'attack.seed_burst',
        damage: 10,
        projectileCount: 5,
        projectileSpeed: 150,
        spreadAngle: Math.PI * 0.5,
        telegraphMs: 400,
        type: 'projectile',
      },
      vine_grab: {
        nameKey: 'attack.vine_grab',
        damage: 12,
        range: 200,
        pullSpeed: 300,
        stunDuration: 800,
        telegraphMs: 700,
        type: 'grab',
      },
      thorn_wall: {
        nameKey: 'attack.thorn_wall',
        damage: 8,
        wallWidth: 250,
        wallDuration: 5000,
        thornsPerWall: 8,
        telegraphMs: 900,
        type: 'zone',
      },
      root_storm: {
        nameKey: 'attack.root_storm',
        damage: 15,
        range: 100,
        rotationSpeed: Math.PI * 1.5,
        duration: 3000,
        telegraphMs: 500,
        type: 'spin',
      },
      nature_fury: {
        nameKey: 'attack.nature_fury',
        damage: 25,
        radius: 180,
        chargeTime: 2000,
        telegraphMs: 1500,
        type: 'ultimate',
        status: STATUS_EFFECTS.POISON,
      },
    },
    
    // Rewards
    rewards: {
      xp: 500,
      guaranteedDrops: ['seed_of_awakening'],
      rareDrop: { item: 'root_blade', chance: 0.15 },
    },
  },
  
  // ========== FORGERON DES CAUCHEMARS ==========
  // Boss de la Forge des Cauchemars - Feu/Métal
  [BOSS_IDS.NIGHTMARE_FORGER]: {
    nameKey: 'boss.nightmare_forger',
    stratum: STRATA.FORGE,
    
    hp: 1200,
    damage: 22,
    armor: 12,
    speed: 40,
    
    size: 72,
    color: 0xc45c2a,
    
    phases: [
      { threshold: 1.0, name: 'forge' },
      { threshold: 0.6, name: 'ignite' },
      { threshold: 0.25, name: 'meltdown' },
    ],
    
    attacks: {
      forge: [
        { id: 'hammer_slam', cooldown: 2200, weight: 45 },
        { id: 'molten_spray', cooldown: 3500, weight: 35 },
        { id: 'chain_sweep', cooldown: 4500, weight: 20 },
      ],
      ignite: [
        { id: 'hammer_slam', cooldown: 1800, weight: 30 },
        { id: 'molten_spray', cooldown: 3000, weight: 25 },
        { id: 'chain_sweep', cooldown: 3500, weight: 20 },
        { id: 'anvil_drop', cooldown: 7000, weight: 25 },
      ],
      meltdown: [
        { id: 'hammer_barrage', cooldown: 2500, weight: 35 },
        { id: 'molten_wave', cooldown: 3000, weight: 25 },
        { id: 'chain_sweep', cooldown: 3000, weight: 15 },
        { id: 'anvil_drop', cooldown: 5000, weight: 10 },
        { id: 'forge_eruption', cooldown: 15000, weight: 15 },
      ],
    },
    
    attackDefs: {
      hammer_slam: {
        nameKey: 'attack.hammer_slam',
        damage: 28,
        range: 70,
        shockwaveRadius: 100,
        telegraphMs: 800,
        type: 'melee',
      },
      molten_spray: {
        nameKey: 'attack.molten_spray',
        damage: 14,
        projectileCount: 7,
        projectileSpeed: 180,
        spreadAngle: Math.PI * 0.4,
        telegraphMs: 500,
        type: 'projectile',
        status: STATUS_EFFECTS.BURN,
      },
      chain_sweep: {
        nameKey: 'attack.chain_sweep',
        damage: 18,
        range: 150,
        arc: Math.PI * 1.2,
        telegraphMs: 700,
        type: 'melee',
      },
      anvil_drop: {
        nameKey: 'attack.anvil_drop',
        damage: 35,
        radius: 90,
        fallTime: 1200,
        telegraphMs: 1000,
        type: 'zone',
        status: STATUS_EFFECTS.STUN,
        stunDuration: 600,
      },
      hammer_barrage: {
        nameKey: 'attack.hammer_barrage',
        damage: 20,
        hitCount: 4,
        range: 80,
        hitInterval: 300,
        telegraphMs: 600,
        type: 'combo',
      },
      molten_wave: {
        nameKey: 'attack.molten_wave',
        damage: 20,
        waveWidth: 300,
        waveSpeed: 200,
        telegraphMs: 800,
        type: 'wave',
        status: STATUS_EFFECTS.BURN,
      },
      forge_eruption: {
        nameKey: 'attack.forge_eruption',
        damage: 40,
        geyserCount: 6,
        geyserRadius: 60,
        chargeTime: 2500,
        telegraphMs: 2000,
        type: 'ultimate',
        status: STATUS_EFFECTS.BURN,
      },
    },
    
    rewards: {
      xp: 800,
      guaranteedDrops: ['nightmare_ember'],
      rareDrop: { item: 'forgemaster_hammer', chance: 0.12 },
    },
  },
  
  // ========== SEIGNEUR CRISTALLIN ==========
  // Boss de l'Abîme Cristallin - Glace/Cristal
  [BOSS_IDS.CRYSTAL_LORD]: {
    nameKey: 'boss.crystal_lord',
    stratum: STRATA.ABIME,
    
    hp: 1600,
    damage: 25,
    armor: 8,
    speed: 55,
    
    size: 68,
    color: 0x6fa8dc,
    
    phases: [
      { threshold: 1.0, name: 'prism' },
      { threshold: 0.55, name: 'shatter' },
      { threshold: 0.2, name: 'absolute_zero' },
    ],
    
    // Can create mirror clones
    specialMechanic: 'mirror_clones',
    maxClones: 2,
    cloneHpPercent: 0.25,
    
    attacks: {
      prism: [
        { id: 'crystal_lance', cooldown: 2000, weight: 40 },
        { id: 'frost_nova', cooldown: 4000, weight: 30 },
        { id: 'refract', cooldown: 6000, weight: 30 },
      ],
      shatter: [
        { id: 'crystal_lance', cooldown: 1600, weight: 30 },
        { id: 'frost_nova', cooldown: 3000, weight: 25 },
        { id: 'refract', cooldown: 5000, weight: 20 },
        { id: 'crystal_prison', cooldown: 8000, weight: 25 },
      ],
      absolute_zero: [
        { id: 'crystal_storm', cooldown: 2000, weight: 35 },
        { id: 'frost_nova', cooldown: 2500, weight: 20 },
        { id: 'refract', cooldown: 4000, weight: 15 },
        { id: 'crystal_prison', cooldown: 6000, weight: 15 },
        { id: 'absolute_zero', cooldown: 18000, weight: 15 },
      ],
    },
    
    attackDefs: {
      crystal_lance: {
        nameKey: 'attack.crystal_lance',
        damage: 22,
        projectileSpeed: 280,
        piercing: true,
        telegraphMs: 400,
        type: 'projectile',
      },
      frost_nova: {
        nameKey: 'attack.frost_nova',
        damage: 18,
        radius: 120,
        telegraphMs: 600,
        type: 'aoe',
        status: STATUS_EFFECTS.SLOW,
        slowDuration: 2000,
      },
      refract: {
        nameKey: 'attack.refract',
        damage: 15,
        beamCount: 8,
        beamSpeed: 220,
        telegraphMs: 800,
        type: 'radial',
      },
      crystal_prison: {
        nameKey: 'attack.crystal_prison',
        damage: 0,
        radius: 50,
        trapDuration: 3000,
        telegraphMs: 900,
        type: 'trap',
        status: STATUS_EFFECTS.FREEZE,
        freezeDuration: 1500,
      },
      crystal_storm: {
        nameKey: 'attack.crystal_storm',
        damage: 12,
        shardCount: 12,
        duration: 4000,
        telegraphMs: 500,
        type: 'sustained',
        status: STATUS_EFFECTS.SLOW,
      },
      absolute_zero: {
        nameKey: 'attack.absolute_zero',
        damage: 50,
        radius: 250,
        chargeTime: 3000,
        telegraphMs: 2500,
        type: 'ultimate',
        status: STATUS_EFFECTS.FREEZE,
        freezeDuration: 2000,
      },
    },
    
    rewards: {
      xp: 1200,
      guaranteedDrops: ['crystal_heart', 'frost_essence'],
      rareDrop: { item: 'scepter_absolute', chance: 0.1 },
    },
  },
  
  // ========== ARCHITECTE DÉCHU ==========
  // Boss final du Nexus de l'Oubli - Void/Réalité
  [BOSS_IDS.FALLEN_ARCHITECT]: {
    nameKey: 'boss.fallen_architect',
    stratum: STRATA.NEXUS,
    
    hp: 2500,
    damage: 30,
    armor: 15,
    speed: 45,
    
    size: 80,
    color: 0x9933ff,
    
    phases: [
      { threshold: 1.0, name: 'design' },
      { threshold: 0.7, name: 'deconstruct' },
      { threshold: 0.4, name: 'rebuild' },
      { threshold: 0.15, name: 'oblivion' },
    ],
    
    // Can warp reality
    specialMechanic: 'reality_warp',
    warpCooldown: 20000,
    warpDuration: 8000,
    
    attacks: {
      design: [
        { id: 'void_beam', cooldown: 2200, weight: 40 },
        { id: 'construct', cooldown: 5000, weight: 30 },
        { id: 'erasure', cooldown: 6000, weight: 30 },
      ],
      deconstruct: [
        { id: 'void_beam', cooldown: 1800, weight: 30 },
        { id: 'construct', cooldown: 4000, weight: 25 },
        { id: 'erasure', cooldown: 5000, weight: 20 },
        { id: 'dimension_rift', cooldown: 10000, weight: 25 },
      ],
      rebuild: [
        { id: 'void_barrage', cooldown: 2000, weight: 30 },
        { id: 'construct', cooldown: 3500, weight: 20 },
        { id: 'erasure', cooldown: 4000, weight: 15 },
        { id: 'dimension_rift', cooldown: 8000, weight: 20 },
        { id: 'blueprint', cooldown: 12000, weight: 15 },
      ],
      oblivion: [
        { id: 'void_storm', cooldown: 1500, weight: 35 },
        { id: 'erasure', cooldown: 3000, weight: 20 },
        { id: 'dimension_rift', cooldown: 6000, weight: 15 },
        { id: 'blueprint', cooldown: 10000, weight: 10 },
        { id: 'total_erasure', cooldown: 25000, weight: 20 },
      ],
    },
    
    attackDefs: {
      void_beam: {
        nameKey: 'attack.void_beam',
        damage: 28,
        beamWidth: 40,
        beamLength: 300,
        sweepAngle: Math.PI * 0.5,
        sweepDuration: 1500,
        telegraphMs: 700,
        type: 'beam',
      },
      construct: {
        nameKey: 'attack.construct',
        damage: 0,
        turretHp: 80,
        turretDamage: 12,
        turretCount: 2,
        turretDuration: 10000,
        telegraphMs: 1000,
        type: 'summon',
      },
      erasure: {
        nameKey: 'attack.erasure',
        damage: 35,
        radius: 80,
        delay: 1500,
        telegraphMs: 1200,
        type: 'delayed_aoe',
      },
      dimension_rift: {
        nameKey: 'attack.dimension_rift',
        damage: 20,
        riftCount: 3,
        riftRadius: 60,
        riftPullSpeed: 100,
        riftDuration: 4000,
        telegraphMs: 900,
        type: 'zone',
      },
      void_barrage: {
        nameKey: 'attack.void_barrage',
        damage: 18,
        projectileCount: 10,
        projectileSpeed: 200,
        spreadType: 'random',
        telegraphMs: 400,
        type: 'projectile',
      },
      blueprint: {
        nameKey: 'attack.blueprint',
        damage: 0,
        effectType: 'arena_change',
        hazardCount: 5,
        hazardDamage: 15,
        hazardDuration: 8000,
        telegraphMs: 1500,
        type: 'arena',
      },
      void_storm: {
        nameKey: 'attack.void_storm',
        damage: 15,
        orbCount: 16,
        orbSpeed: 160,
        duration: 5000,
        telegraphMs: 600,
        type: 'sustained',
      },
      total_erasure: {
        nameKey: 'attack.total_erasure',
        damage: 80,
        chargeTime: 4000,
        safeZoneRadius: 100,
        arenaRadius: 400,
        telegraphMs: 3500,
        type: 'ultimate',
        // Must stand in safe zone or die
        mechanic: 'safe_zone',
      },
    },
    
    // Dialogue during fight
    dialogue: {
      intro: 'dialogue.architect.intro',
      phase2: 'dialogue.architect.phase2',
      phase3: 'dialogue.architect.phase3',
      phase4: 'dialogue.architect.phase4',
      death: 'dialogue.architect.death',
    },
    
    rewards: {
      xp: 2000,
      guaranteedDrops: ['architect_core', 'void_essence', 'memory_fragment'],
      rareDrop: { item: 'sword_architect', chance: 0.08 },
    },
  },
};

// ========== Boss State Management ==========

/**
 * Create boss state
 * @param {string} bossId 
 * @returns {BossState}
 */
export function createBossState(bossId) {
  const config = BOSS_CONFIGS[bossId];
  if (!config) {
    console.warn(`Unknown boss: ${bossId}`);
    return null;
  }
  
  return {
    id: bossId,
    config,
    hp: config.hp,
    hpMax: config.hp,
    phase: 0,
    phaseName: config.phases[0].name,
    attackCooldowns: {},
    lastAttackAt: 0,
    currentAttack: null,
    telegraphStartAt: 0,
    isTelegraphing: false,
    specialCooldown: 0,
    clones: [],
    summons: [],
    arenaHazards: [],
    isEnraged: false,
    invincible: false,
    
    // Position & Movement
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    facing: 0,
  };
}

/**
 * Check for phase transition
 */
export function checkPhaseTransition(bossState) {
  const { config, hp, hpMax, phase } = bossState;
  const hpPercent = hp / hpMax;
  
  // Find current phase based on HP
  for (let i = config.phases.length - 1; i >= 0; i--) {
    if (hpPercent <= config.phases[i].threshold) {
      if (i > phase) {
        return {
          transitioned: true,
          newPhase: i,
          newPhaseName: config.phases[i].name,
          oldPhase: phase,
        };
      }
      break;
    }
  }
  
  return { transitioned: false };
}

/**
 * Apply phase transition
 */
export function applyPhaseTransition(bossState, newPhase, newPhaseName) {
  bossState.phase = newPhase;
  bossState.phaseName = newPhaseName;
  bossState.attackCooldowns = {}; // Reset cooldowns
  bossState.invincible = true; // Brief invincibility during transition
  
  return {
    effect: 'phase_transition',
    phaseName: newPhaseName,
    invincibilityDuration: 1500,
  };
}

// ========== Boss AI ==========

/**
 * Pick next attack
 */
export function pickBossAttack(bossState, now) {
  const { config, phaseName, attackCooldowns } = bossState;
  const phaseAttacks = config.attacks[phaseName];
  
  if (!phaseAttacks) return null;
  
  // Filter available attacks
  const available = phaseAttacks.filter(attack => {
    const lastUsed = attackCooldowns[attack.id] || 0;
    return now - lastUsed >= attack.cooldown;
  });
  
  if (available.length === 0) return null;
  
  // Weighted random selection
  let totalWeight = 0;
  for (const a of available) totalWeight += a.weight;
  
  let roll = Math.random() * totalWeight;
  for (const attack of available) {
    roll -= attack.weight;
    if (roll <= 0) {
      return attack.id;
    }
  }
  
  return available[0].id;
}

/**
 * Start boss attack
 */
export function startBossAttack(bossState, attackId, targetPos, now) {
  const { config } = bossState;
  const attackDef = config.attackDefs[attackId];
  
  if (!attackDef) return null;
  
  bossState.currentAttack = attackId;
  bossState.telegraphStartAt = now;
  bossState.isTelegraphing = true;
  bossState.attackTarget = { ...targetPos };
  bossState.attackCooldowns[attackId] = now;
  
  return {
    type: 'telegraph_start',
    attackId,
    attackDef,
    targetPos,
    telegraphMs: attackDef.telegraphMs,
  };
}

/**
 * Execute boss attack after telegraph
 */
export function executeBossAttack(bossState, playerPos) {
  const { config, currentAttack, attackTarget, x, y } = bossState;
  const attackDef = config.attackDefs[currentAttack];
  
  if (!attackDef) return null;
  
  bossState.isTelegraphing = false;
  bossState.currentAttack = null;
  
  // Create attack data based on type
  const attackData = {
    type: attackDef.type,
    attackId: currentAttack,
    damage: attackDef.damage,
    origin: { x, y },
    target: attackTarget || playerPos,
    status: attackDef.status,
  };
  
  // Add type-specific data
  switch (attackDef.type) {
    case 'melee':
      attackData.range = attackDef.range;
      attackData.arc = attackDef.arc || Math.PI * 0.5;
      attackData.shockwaveRadius = attackDef.shockwaveRadius;
      break;
      
    case 'projectile':
      attackData.projectileCount = attackDef.projectileCount || 1;
      attackData.projectileSpeed = attackDef.projectileSpeed;
      attackData.spreadAngle = attackDef.spreadAngle || 0;
      break;
      
    case 'aoe':
    case 'delayed_aoe':
      attackData.radius = attackDef.radius;
      attackData.delay = attackDef.delay || 0;
      break;
      
    case 'zone':
      attackData.duration = attackDef.wallDuration || attackDef.riftDuration;
      attackData.hazardData = attackDef;
      break;
      
    case 'grab':
      attackData.range = attackDef.range;
      attackData.pullSpeed = attackDef.pullSpeed;
      attackData.stunDuration = attackDef.stunDuration;
      break;
      
    case 'spin':
      attackData.range = attackDef.range;
      attackData.rotationSpeed = attackDef.rotationSpeed;
      attackData.duration = attackDef.duration;
      break;
      
    case 'beam':
      attackData.beamWidth = attackDef.beamWidth;
      attackData.beamLength = attackDef.beamLength;
      attackData.sweepAngle = attackDef.sweepAngle;
      attackData.sweepDuration = attackDef.sweepDuration;
      break;
      
    case 'summon':
      attackData.summonType = attackDef.turretCount ? 'turret' : 'minion';
      attackData.count = attackDef.turretCount || attackDef.summonCount || 1;
      attackData.summonHp = attackDef.turretHp;
      attackData.summonDamage = attackDef.turretDamage;
      attackData.duration = attackDef.turretDuration;
      break;
      
    case 'radial':
      attackData.beamCount = attackDef.beamCount;
      attackData.beamSpeed = attackDef.beamSpeed;
      break;
      
    case 'trap':
      attackData.radius = attackDef.radius;
      attackData.trapDuration = attackDef.trapDuration;
      attackData.freezeDuration = attackDef.freezeDuration;
      break;
      
    case 'ultimate':
      attackData.radius = attackDef.radius;
      attackData.chargeTime = attackDef.chargeTime;
      attackData.safeZoneRadius = attackDef.safeZoneRadius;
      attackData.mechanic = attackDef.mechanic;
      break;
      
    case 'arena':
      attackData.hazardCount = attackDef.hazardCount;
      attackData.hazardDamage = attackDef.hazardDamage;
      attackData.hazardDuration = attackDef.hazardDuration;
      break;
  }
  
  return attackData;
}

/**
 * Update boss movement
 */
export function updateBossMovement(bossState, playerPos, delta) {
  const { config, x, y, isTelegraphing } = bossState;
  
  // Don't move while telegraphing
  if (isTelegraphing) {
    bossState.facing = angle(x, y, playerPos.x, playerPos.y);
    return;
  }
  
  const dist = distance(x, y, playerPos.x, playerPos.y);
  const preferredDist = 150; // Bosses prefer some distance
  
  let moveX = 0;
  let moveY = 0;
  
  if (dist < preferredDist - 30) {
    // Too close, back up
    const awayAngle = angle(playerPos.x, playerPos.y, x, y);
    moveX = Math.cos(awayAngle) * config.speed;
    moveY = Math.sin(awayAngle) * config.speed;
  } else if (dist > preferredDist + 50) {
    // Too far, approach
    const toPlayer = angle(x, y, playerPos.x, playerPos.y);
    moveX = Math.cos(toPlayer) * config.speed * 0.5;
    moveY = Math.sin(toPlayer) * config.speed * 0.5;
  }
  
  // Slow circular movement when at preferred distance
  if (Math.abs(dist - preferredDist) <= 50) {
    const perpAngle = angle(x, y, playerPos.x, playerPos.y) + Math.PI / 2;
    moveX += Math.cos(perpAngle) * config.speed * 0.3;
    moveY += Math.sin(perpAngle) * config.speed * 0.3;
  }
  
  bossState.x += moveX * (delta / 1000);
  bossState.y += moveY * (delta / 1000);
  bossState.facing = angle(bossState.x, bossState.y, playerPos.x, playerPos.y);
}

/**
 * Main boss tick
 */
export function tickBoss(bossState, playerPos, now, delta) {
  const events = [];
  
  // Check phase transition
  const transition = checkPhaseTransition(bossState);
  if (transition.transitioned) {
    const effect = applyPhaseTransition(bossState, transition.newPhase, transition.newPhaseName);
    events.push({ type: 'phase_change', ...effect });
    
    // Get dialogue if available
    const dialogueKey = `phase${transition.newPhase + 1}`;
    if (bossState.config.dialogue && bossState.config.dialogue[dialogueKey]) {
      events.push({ type: 'dialogue', key: bossState.config.dialogue[dialogueKey] });
    }
  }
  
  // Handle telegraph timing
  if (bossState.isTelegraphing) {
    const attackDef = bossState.config.attackDefs[bossState.currentAttack];
    if (attackDef && now - bossState.telegraphStartAt >= attackDef.telegraphMs) {
      const attackData = executeBossAttack(bossState, playerPos);
      if (attackData) {
        events.push({ type: 'attack', ...attackData });
      }
    }
  } else {
    // Pick new attack
    const attackId = pickBossAttack(bossState, now);
    if (attackId) {
      const telegraphData = startBossAttack(bossState, attackId, playerPos, now);
      if (telegraphData) {
        events.push({ type: 'telegraph', ...telegraphData });
      }
    }
  }
  
  // Update movement
  updateBossMovement(bossState, playerPos, delta);
  
  // Update summons/hazards decay
  bossState.summons = bossState.summons.filter(s => {
    if (s.expiresAt && now >= s.expiresAt) return false;
    if (s.hp !== undefined && s.hp <= 0) return false;
    return true;
  });
  
  bossState.arenaHazards = bossState.arenaHazards.filter(h => {
    return !h.expiresAt || now < h.expiresAt;
  });
  
  // Check invincibility timeout
  if (bossState.invincible && bossState.invincibleUntil && now >= bossState.invincibleUntil) {
    bossState.invincible = false;
    events.push({ type: 'invincibility_end' });
  }
  
  return events;
}

/**
 * Apply damage to boss
 */
export function damageBoss(bossState, damage) {
  if (bossState.invincible) {
    return { blocked: true, reason: 'invincible' };
  }
  
  const actualDamage = Math.max(1, damage - bossState.config.armor);
  bossState.hp = Math.max(0, bossState.hp - actualDamage);
  
  return {
    blocked: false,
    damage: actualDamage,
    hpRemaining: bossState.hp,
    hpPercent: bossState.hp / bossState.hpMax,
    isDead: bossState.hp <= 0,
  };
}

/**
 * Get boss rewards
 */
export function getBossRewards(bossId, rng = null) {
  const config = BOSS_CONFIGS[bossId];
  if (!config) return null;
  
  const rewards = {
    xp: config.rewards.xp,
    items: [...config.rewards.guaranteedDrops],
  };
  
  // Check rare drop
  if (config.rewards.rareDrop) {
    const roll = rng ? rng.next() : Math.random();
    if (roll < config.rewards.rareDrop.chance) {
      rewards.items.push(config.rewards.rareDrop.item);
      rewards.rareDropped = true;
    }
  }
  
  return rewards;
}

// ========== Type Definitions ==========

/**
 * @typedef {object} BossState
 * @property {string} id
 * @property {object} config
 * @property {number} hp
 * @property {number} hpMax
 * @property {number} phase
 * @property {string} phaseName
 * @property {object} attackCooldowns
 * @property {number} lastAttackAt
 * @property {string|null} currentAttack
 * @property {boolean} isTelegraphing
 * @property {number} x
 * @property {number} y
 * @property {number} facing
 */

export default {
  BOSS_IDS,
  BOSS_CONFIGS,
  createBossState,
  checkPhaseTransition,
  applyPhaseTransition,
  pickBossAttack,
  startBossAttack,
  executeBossAttack,
  updateBossMovement,
  tickBoss,
  damageBoss,
  getBossRewards,
};
