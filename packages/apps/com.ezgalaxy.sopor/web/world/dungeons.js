/**
 * SOPOR - Dungeon Generator
 * Handles procedural dungeon creation with multiple floors
 */

import { STRATA, TILE_TYPES, RARITY } from '../core/constants.js';
import { makeRng, clamp, distance, pickRandom } from '../core/utils.js';
import { 
  generateRooms, 
  generateCorridors, 
  createTileMap,
  ROOM_PARAMS,
  BIOME_CONFIG 
} from './world-gen.js';

// ========== Dungeon Configuration ==========

export const DUNGEON_CONFIG = {
  MIN_FLOORS: 3,
  MAX_FLOORS: 10,
  FLOOR_SIZE_BASE: 60,
  FLOOR_SIZE_INCREMENT: 5,
  ROOM_DENSITY: 1.2, // Multiplier vs normal generation
  
  // Difficulty scaling per floor
  ENEMY_COUNT_BASE: 8,
  ENEMY_COUNT_PER_FLOOR: 3,
  ENEMY_THREAT_BASE: 1,
  ENEMY_THREAT_PER_FLOOR: 0.15,
  
  // Loot scaling
  LOOT_QUALITY_PER_FLOOR: 0.08,
  CHEST_COUNT_BASE: 2,
  CHEST_COUNT_PER_FLOOR: 0.5,
  
  // Special rooms
  SHRINE_CHANCE: 0.15,
  TRAP_ROOM_CHANCE: 0.2,
  CHALLENGE_ROOM_CHANCE: 0.1,
};

// ========== Dungeon Themes ==========

export const DUNGEON_THEMES = {
  crypt: {
    nameKey: 'dungeon.crypt',
    biomeOverride: null, // Uses parent stratum
    specialTiles: ['bone_floor', 'cobweb_wall'],
    specialDecos: ['coffin', 'candelabra', 'skull_pile'],
    enemyTypes: ['skeleton', 'ghost', 'necromancer'],
    bossPool: ['crypt_keeper', 'bone_colossus'],
  },
  ruins: {
    nameKey: 'dungeon.ruins',
    biomeOverride: null,
    specialTiles: ['cracked_floor', 'collapsed_wall'],
    specialDecos: ['broken_pillar', 'ancient_statue', 'rubble'],
    enemyTypes: ['golem', 'spirit', 'guardian'],
    bossPool: ['ruined_titan', 'memory_phantom'],
  },
  void_pocket: {
    nameKey: 'dungeon.void_pocket',
    biomeOverride: STRATA.NEXUS,
    specialTiles: ['void_floor', 'reality_tear'],
    specialDecos: ['floating_debris', 'void_tendril', 'star_fragment'],
    enemyTypes: ['void_walker', 'reality_horror', 'lost_soul'],
    bossPool: ['void_eater', 'forgotten_one'],
  },
  nightmare_realm: {
    nameKey: 'dungeon.nightmare',
    biomeOverride: STRATA.FORGE,
    specialTiles: ['nightmare_floor', 'twisted_wall'],
    specialDecos: ['nightmare_eye', 'twisted_growth', 'fear_totem'],
    enemyTypes: ['nightmare', 'fear_spawn', 'dream_hunter'],
    bossPool: ['nightmare_king', 'phobia_incarnate'],
  },
};

// ========== Room Types ==========

export const SPECIAL_ROOM_TYPES = {
  normal: {
    weight: 50,
    enemyMultiplier: 1.0,
    lootMultiplier: 1.0,
  },
  shrine: {
    weight: 10,
    enemyMultiplier: 0,
    lootMultiplier: 0,
    onEnter: 'shrine_blessing',
    decoOverride: ['shrine_altar', 'offering_bowl'],
  },
  trap: {
    weight: 15,
    enemyMultiplier: 0.5,
    lootMultiplier: 1.5,
    hazardMultiplier: 3.0,
  },
  challenge: {
    weight: 8,
    enemyMultiplier: 2.0,
    lootMultiplier: 2.5,
    lockDoors: true,
    timerSeconds: 60,
  },
  treasure: {
    weight: 12,
    enemyMultiplier: 0.3,
    lootMultiplier: 3.0,
    guaranteedChest: true,
  },
  rest: {
    weight: 5,
    enemyMultiplier: 0,
    lootMultiplier: 0.5,
    onEnter: 'rest_heal',
    decoOverride: ['campfire', 'bedroll', 'supply_crate'],
  },
};

// ========== Dungeon State ==========

/**
 * Create a new dungeon instance
 */
export function createDungeon(seed, stratum, depth = 1) {
  const rng = makeRng(seed);
  
  // Pick theme based on stratum or random
  const themeKeys = Object.keys(DUNGEON_THEMES);
  const theme = DUNGEON_THEMES[themeKeys[Math.floor(rng.next() * themeKeys.length)]];
  const effectiveStratum = theme.biomeOverride || stratum;
  
  // Calculate floor count
  const minFloors = DUNGEON_CONFIG.MIN_FLOORS;
  const maxFloors = Math.min(DUNGEON_CONFIG.MAX_FLOORS, minFloors + depth);
  const floorCount = minFloors + Math.floor(rng.next() * (maxFloors - minFloors + 1));
  
  return {
    seed,
    stratum: effectiveStratum,
    theme,
    depth,
    floorCount,
    currentFloor: 0,
    floors: [], // Generated on demand
    cleared: false,
    startTime: null,
    completionTime: null,
    stats: {
      enemiesKilled: 0,
      chestsOpened: 0,
      shrinesUsed: 0,
      challengesCompleted: 0,
      damageDealt: 0,
      damageTaken: 0,
    },
  };
}

/**
 * Generate a single dungeon floor
 */
export function generateFloor(dungeon, floorIndex) {
  const rng = makeRng(dungeon.seed + floorIndex * 1000);
  
  // Calculate floor size
  const size = DUNGEON_CONFIG.FLOOR_SIZE_BASE + 
    floorIndex * DUNGEON_CONFIG.FLOOR_SIZE_INCREMENT;
  
  // Adjust room params for dungeons
  const roomParams = {
    ...ROOM_PARAMS,
    MIN_ROOMS: Math.floor(ROOM_PARAMS.MIN_ROOMS * DUNGEON_CONFIG.ROOM_DENSITY),
    MAX_ROOMS: Math.floor(ROOM_PARAMS.MAX_ROOMS * DUNGEON_CONFIG.ROOM_DENSITY),
  };
  
  // Generate base layout
  const rooms = generateRooms(size, size, rng, roomParams);
  const corridors = generateCorridors(rooms, rng);
  
  // Assign special room types
  assignSpecialRooms(rooms, floorIndex, rng);
  
  // Create tile map
  const tileMap = createTileMap(size, size, rooms, corridors, dungeon.stratum, rng);
  
  // Add floor-specific elements
  const floor = {
    index: floorIndex,
    tileMap,
    rooms,
    corridors,
    enemies: [],
    items: [],
    hazards: [],
    traps: [],
    interactables: [],
    explored: new Set(),
    cleared: false,
    stairsDown: null,
    stairsUp: null,
  };
  
  // Spawn enemies
  populateEnemies(floor, dungeon, floorIndex, rng);
  
  // Add loot
  populateLoot(floor, dungeon, floorIndex, rng);
  
  // Add stairs
  addStairs(floor, rooms, floorIndex, dungeon.floorCount, rng);
  
  // Add special room effects
  addSpecialRoomElements(floor, dungeon.theme, rng);
  
  return floor;
}

/**
 * Assign special types to rooms
 */
function assignSpecialRooms(rooms, floorIndex, rng) {
  // Calculate total weight
  let totalWeight = 0;
  for (const type of Object.values(SPECIAL_ROOM_TYPES)) {
    totalWeight += type.weight;
  }
  
  for (const room of rooms) {
    // Keep spawn and boss room types
    if (room.type === 'spawn' || room.type === 'boss') continue;
    
    // Pick random type
    let roll = rng.next() * totalWeight;
    for (const [typeName, typeConfig] of Object.entries(SPECIAL_ROOM_TYPES)) {
      roll -= typeConfig.weight;
      if (roll <= 0) {
        room.specialType = typeName;
        break;
      }
    }
    
    room.specialType = room.specialType || 'normal';
  }
}

/**
 * Populate floor with enemies
 */
function populateEnemies(floor, dungeon, floorIndex, rng) {
  const baseCount = DUNGEON_CONFIG.ENEMY_COUNT_BASE;
  const perFloor = DUNGEON_CONFIG.ENEMY_COUNT_PER_FLOOR;
  const totalEnemies = Math.floor(baseCount + floorIndex * perFloor);
  
  const threatLevel = DUNGEON_CONFIG.ENEMY_THREAT_BASE + 
    floorIndex * DUNGEON_CONFIG.ENEMY_THREAT_PER_FLOOR;
  
  let spawned = 0;
  
  for (const room of floor.rooms) {
    if (room.type === 'spawn') continue;
    
    const typeConfig = SPECIAL_ROOM_TYPES[room.specialType || 'normal'];
    const roomEnemyCount = Math.floor(
      (2 + rng.next() * 3) * typeConfig.enemyMultiplier
    );
    
    for (let i = 0; i < roomEnemyCount && spawned < totalEnemies; i++) {
      const x = room.x + 2 + Math.floor(rng.next() * (room.width - 4));
      const y = room.y + 2 + Math.floor(rng.next() * (room.height - 4));
      
      floor.enemies.push({
        id: `enemy_${floorIndex}_${spawned}`,
        x: x * 32,
        y: y * 32,
        threatLevel,
        roomId: room.id,
        alive: true,
      });
      
      spawned++;
    }
  }
}

/**
 * Populate floor with loot
 */
function populateLoot(floor, dungeon, floorIndex, rng) {
  const baseChests = DUNGEON_CONFIG.CHEST_COUNT_BASE;
  const perFloor = DUNGEON_CONFIG.CHEST_COUNT_PER_FLOOR;
  const chestCount = Math.floor(baseChests + floorIndex * perFloor);
  
  const qualityBonus = floorIndex * DUNGEON_CONFIG.LOOT_QUALITY_PER_FLOOR;
  
  let placed = 0;
  
  for (const room of floor.rooms) {
    if (room.type === 'spawn') continue;
    
    const typeConfig = SPECIAL_ROOM_TYPES[room.specialType || 'normal'];
    
    // Guaranteed chest in treasure rooms
    if (typeConfig.guaranteedChest && placed < chestCount + 1) {
      addChest(floor, room, qualityBonus * typeConfig.lootMultiplier, rng);
      placed++;
    }
    
    // Random chests based on room loot multiplier
    if (rng.next() < 0.15 * typeConfig.lootMultiplier && placed < chestCount) {
      addChest(floor, room, qualityBonus * typeConfig.lootMultiplier, rng);
      placed++;
    }
  }
}

/**
 * Add a chest to a room
 */
function addChest(floor, room, qualityBonus, rng) {
  const x = room.centerX;
  const y = room.centerY;
  
  // Determine rarity based on quality
  let rarity = RARITY.COMMON;
  const roll = rng.next() + qualityBonus;
  
  if (roll > 0.95) rarity = RARITY.LEGENDARY;
  else if (roll > 0.8) rarity = RARITY.EPIC;
  else if (roll > 0.6) rarity = RARITY.RARE;
  else if (roll > 0.35) rarity = RARITY.UNCOMMON;
  
  floor.interactables.push({
    type: 'chest',
    x: x * 32,
    y: y * 32,
    rarity,
    opened: false,
    loot: null, // Generated on open
  });
}

/**
 * Add stairs between floors
 */
function addStairs(floor, rooms, floorIndex, totalFloors, rng) {
  const spawnRoom = rooms.find(r => r.type === 'spawn');
  const bossRoom = rooms.find(r => r.type === 'boss');
  
  // Stairs up (except first floor)
  if (floorIndex > 0 && spawnRoom) {
    floor.stairsUp = {
      x: spawnRoom.centerX * 32,
      y: spawnRoom.centerY * 32,
      targetFloor: floorIndex - 1,
    };
    floor.interactables.push({
      type: 'stairs_up',
      ...floor.stairsUp,
    });
  }
  
  // Stairs down (except last floor)
  if (floorIndex < totalFloors - 1 && bossRoom) {
    floor.stairsDown = {
      x: bossRoom.centerX * 32,
      y: bossRoom.centerY * 32,
      targetFloor: floorIndex + 1,
      locked: true, // Unlock by clearing floor
    };
    floor.interactables.push({
      type: 'stairs_down',
      ...floor.stairsDown,
    });
  }
  
  // Exit portal on last floor
  if (floorIndex === totalFloors - 1 && bossRoom) {
    floor.interactables.push({
      type: 'exit_portal',
      x: bossRoom.centerX * 32,
      y: bossRoom.centerY * 32,
      locked: true, // Unlock by defeating floor boss
    });
  }
}

/**
 * Add special elements based on room types
 */
function addSpecialRoomElements(floor, theme, rng) {
  for (const room of floor.rooms) {
    const typeConfig = SPECIAL_ROOM_TYPES[room.specialType || 'normal'];
    
    // Shrine rooms
    if (room.specialType === 'shrine') {
      floor.interactables.push({
        type: 'shrine',
        x: room.centerX * 32,
        y: room.centerY * 32,
        blessingType: pickShrineBlessing(rng),
        used: false,
      });
    }
    
    // Rest rooms
    if (room.specialType === 'rest') {
      floor.interactables.push({
        type: 'campfire',
        x: room.centerX * 32,
        y: room.centerY * 32,
        healPercent: 0.3,
        used: false,
      });
    }
    
    // Challenge rooms
    if (room.specialType === 'challenge') {
      room.challengeConfig = {
        type: 'survival',
        waves: 2 + Math.floor(rng.next() * 2),
        timeLimit: typeConfig.timerSeconds,
        started: false,
        completed: false,
        doorsLocked: false,
      };
    }
    
    // Trap rooms - add extra hazards
    if (room.specialType === 'trap') {
      const trapCount = 3 + Math.floor(rng.next() * 3);
      for (let i = 0; i < trapCount; i++) {
        floor.traps.push({
          type: pickTrapType(rng),
          x: (room.x + 2 + Math.floor(rng.next() * (room.width - 4))) * 32,
          y: (room.y + 2 + Math.floor(rng.next() * (room.height - 4))) * 32,
          armed: true,
          triggered: false,
        });
      }
    }
  }
}

/**
 * Pick shrine blessing type
 */
function pickShrineBlessing(rng) {
  const blessings = [
    'health_restore',    // Full heal
    'damage_boost',      // +20% damage for floor
    'speed_boost',       // +30% speed for floor
    'shield',            // Temporary shield
    'reveal_map',        // Reveal entire floor
    'extra_loot',        // Better loot quality
  ];
  return blessings[Math.floor(rng.next() * blessings.length)];
}

/**
 * Pick trap type
 */
function pickTrapType(rng) {
  const traps = [
    'spike',         // Damage when stepped on
    'dart',          // Projectile when triggered
    'pit',           // Fall damage
    'gas',           // AoE poison
    'teleport',      // Random teleport
  ];
  return traps[Math.floor(rng.next() * traps.length)];
}

// ========== Dungeon Progression ==========

/**
 * Check if floor is cleared
 */
export function isFloorCleared(floor) {
  // All enemies dead
  const enemiesAlive = floor.enemies.filter(e => e.alive).length;
  if (enemiesAlive > 0) return false;
  
  // All challenge rooms completed
  for (const room of floor.rooms) {
    if (room.specialType === 'challenge' && 
        room.challengeConfig && 
        !room.challengeConfig.completed) {
      return false;
    }
  }
  
  return true;
}

/**
 * Update floor clear status and unlock stairs
 */
export function updateFloorStatus(floor) {
  if (!floor.cleared && isFloorCleared(floor)) {
    floor.cleared = true;
    
    // Unlock stairs down
    if (floor.stairsDown) {
      floor.stairsDown.locked = false;
    }
    
    // Unlock exit portal
    const exitPortal = floor.interactables.find(i => i.type === 'exit_portal');
    if (exitPortal) {
      exitPortal.locked = false;
    }
    
    return { cleared: true, rewards: calculateFloorRewards(floor) };
  }
  
  return { cleared: floor.cleared };
}

/**
 * Calculate rewards for clearing a floor
 */
function calculateFloorRewards(floor) {
  const baseXp = 100 + floor.index * 50;
  const bonusXp = floor.index > 0 ? floor.index * 20 : 0;
  
  return {
    xp: baseXp + bonusXp,
    gold: 50 + floor.index * 30,
  };
}

/**
 * Move to next floor
 */
export function descendFloor(dungeon) {
  if (dungeon.currentFloor >= dungeon.floorCount - 1) {
    return { success: false, reason: 'at_bottom' };
  }
  
  dungeon.currentFloor++;
  
  // Generate floor if needed
  if (!dungeon.floors[dungeon.currentFloor]) {
    dungeon.floors[dungeon.currentFloor] = generateFloor(dungeon, dungeon.currentFloor);
  }
  
  return {
    success: true,
    floor: dungeon.floors[dungeon.currentFloor],
    floorIndex: dungeon.currentFloor,
  };
}

/**
 * Move to previous floor
 */
export function ascendFloor(dungeon) {
  if (dungeon.currentFloor <= 0) {
    return { success: false, reason: 'at_top' };
  }
  
  dungeon.currentFloor--;
  
  return {
    success: true,
    floor: dungeon.floors[dungeon.currentFloor],
    floorIndex: dungeon.currentFloor,
  };
}

/**
 * Complete dungeon
 */
export function completeDungeon(dungeon) {
  dungeon.cleared = true;
  dungeon.completionTime = Date.now();
  
  const totalTime = dungeon.completionTime - dungeon.startTime;
  const timeBonus = Math.max(0, 1 - totalTime / (dungeon.floorCount * 120000)); // 2 min per floor
  
  return {
    completed: true,
    stats: dungeon.stats,
    totalTime,
    rewards: {
      xp: 500 + dungeon.floorCount * 100 + Math.floor(timeBonus * 200),
      gold: 200 + dungeon.floorCount * 50,
      items: generateDungeonRewards(dungeon),
    },
  };
}

/**
 * Generate final dungeon rewards
 */
function generateDungeonRewards(dungeon) {
  const rewards = [];
  
  // Guaranteed item based on depth
  if (dungeon.floorCount >= 5) {
    rewards.push({ type: 'rare_item', rarity: RARITY.RARE });
  }
  
  if (dungeon.floorCount >= 8) {
    rewards.push({ type: 'epic_item', rarity: RARITY.EPIC });
  }
  
  // Bonus for perfect clear
  if (dungeon.stats.damageTaken === 0) {
    rewards.push({ type: 'perfect_clear_token' });
  }
  
  return rewards;
}

// ========== Type Definitions ==========

/**
 * @typedef {object} Dungeon
 * @property {number} seed
 * @property {string} stratum
 * @property {object} theme
 * @property {number} depth
 * @property {number} floorCount
 * @property {number} currentFloor
 * @property {DungeonFloor[]} floors
 * @property {boolean} cleared
 */

/**
 * @typedef {object} DungeonFloor
 * @property {number} index
 * @property {object} tileMap
 * @property {Room[]} rooms
 * @property {Array} enemies
 * @property {Array} items
 * @property {boolean} cleared
 */

// ========== Compatibility Aliases ==========

// Alias for generateFloor
export const generateDungeonFloor = generateFloor;

/**
 * Get dungeon theme for stratum (compatibility wrapper)
 * @param {string} stratum 
 * @returns {string}
 */
export function getDungeonThemeForStratum(stratum) {
  for (const [key, theme] of Object.entries(DUNGEON_THEMES)) {
    if (theme.biomeOverride === stratum) return key;
  }
  return Object.keys(DUNGEON_THEMES)[0];
}

export default {
  DUNGEON_CONFIG,
  DUNGEON_THEMES,
  SPECIAL_ROOM_TYPES,
  
  createDungeon,
  generateFloor,
  generateDungeonFloor,
  getDungeonThemeForStratum,
  
  isFloorCleared,
  updateFloorStatus,
  descendFloor,
  ascendFloor,
  completeDungeon,
};
