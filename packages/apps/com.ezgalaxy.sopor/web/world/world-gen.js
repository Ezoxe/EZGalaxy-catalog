/**
 * SOPOR - World Generation System
 * Handles procedural terrain, rooms, and dungeon generation
 */

import { STRATA, TILE_TYPES } from '../core/constants.js';
import { makeRng, clamp, distance } from '../core/utils.js';

// ========== World Constants ==========

export const WORLD_SIZE = {
  TILE_SIZE: 32,
  CHUNK_SIZE: 16,        // tiles per chunk
  WORLD_CHUNKS: 64,      // chunks per world axis
  get WORLD_TILES() { return this.CHUNK_SIZE * this.WORLD_CHUNKS; },
  get WORLD_PIXELS() { return this.WORLD_TILES * this.TILE_SIZE; },
};

export const ROOM_PARAMS = {
  MIN_SIZE: 6,
  MAX_SIZE: 14,
  MIN_ROOMS: 15,
  MAX_ROOMS: 25,
  CORRIDOR_WIDTH: 2,
  ROOM_SPACING: 3,
};

// ========== Tile Configuration ==========

export const TILE_CONFIG = {
  [TILE_TYPES.FLOOR]: {
    walkable: true,
    transparent: true,
    variants: 4,
  },
  [TILE_TYPES.WALL]: {
    walkable: false,
    transparent: false,
    variants: 8,
  },
  [TILE_TYPES.VOID]: {
    walkable: false,
    transparent: true,
    variants: 1,
  },
  [TILE_TYPES.WATER]: {
    walkable: false,
    transparent: true,
    slowFactor: 0.5, // if swimming enabled
    variants: 4,
  },
  [TILE_TYPES.HAZARD]: {
    walkable: true,
    transparent: true,
    damage: 5,
    damageInterval: 500,
    variants: 3,
  },
  [TILE_TYPES.DOOR]: {
    walkable: true,
    transparent: false,
    interactable: true,
    variants: 2,
  },
  [TILE_TYPES.CHEST]: {
    walkable: false,
    transparent: true,
    interactable: true,
    lootable: true,
    variants: 2,
  },
  [TILE_TYPES.PORTAL]: {
    walkable: true,
    transparent: true,
    interactable: true,
    teleport: true,
    variants: 1,
  },
};

// ========== Biome Configuration ==========

export const BIOME_CONFIG = {
  [STRATA.JARDIN]: {
    nameKey: 'biome.jardin',
    primaryColor: 0x3a5f3a,
    secondaryColor: 0x4a7c4a,
    wallColor: 0x2a3f2a,
    floorTiles: ['grass', 'dirt', 'moss'],
    wallTiles: ['hedge', 'tree_trunk', 'vine_wall'],
    decorations: ['flower', 'mushroom', 'root', 'fallen_leaf'],
    hazards: ['thorn_bush', 'poison_bloom'],
    ambientParticles: ['pollen', 'firefly'],
    fogDensity: 0.2,
    fogColor: 0x88aa88,
    musicTrack: 'jardin_ambient',
  },
  [STRATA.FORGE]: {
    nameKey: 'biome.forge',
    primaryColor: 0x5a3a2a,
    secondaryColor: 0x8c5a3a,
    wallColor: 0x3a2a1a,
    floorTiles: ['stone', 'metal_grate', 'scorched'],
    wallTiles: ['brick', 'metal_wall', 'pipe'],
    decorations: ['anvil', 'chains', 'ember_pile', 'slag'],
    hazards: ['lava_vent', 'steam_pipe', 'hot_floor'],
    ambientParticles: ['ember', 'smoke', 'spark'],
    fogDensity: 0.35,
    fogColor: 0xaa6644,
    musicTrack: 'forge_ambient',
  },
  [STRATA.ABIME]: {
    nameKey: 'biome.abime',
    primaryColor: 0x2a3a5a,
    secondaryColor: 0x4a6a8a,
    wallColor: 0x1a2a3a,
    floorTiles: ['ice', 'crystal_floor', 'frozen_stone'],
    wallTiles: ['ice_wall', 'crystal_formation', 'frozen_pillar'],
    decorations: ['icicle', 'frozen_flower', 'crystal_shard', 'frost_web'],
    hazards: ['ice_spike', 'freezing_pool', 'unstable_crystal'],
    ambientParticles: ['snowflake', 'crystal_dust', 'frost_mist'],
    fogDensity: 0.25,
    fogColor: 0x6688aa,
    musicTrack: 'abime_ambient',
  },
  [STRATA.NEXUS]: {
    nameKey: 'biome.nexus',
    primaryColor: 0x3a2a4a,
    secondaryColor: 0x5a4a6a,
    wallColor: 0x1a1a2a,
    floorTiles: ['void_stone', 'starlight_tile', 'memory_floor'],
    wallTiles: ['void_wall', 'reality_tear', 'forgotten_pillar'],
    decorations: ['floating_rune', 'memory_echo', 'void_tendril', 'star_fragment'],
    hazards: ['void_rift', 'unstable_reality', 'memory_trap'],
    ambientParticles: ['void_mote', 'star_particle', 'reality_glitch'],
    fogDensity: 0.4,
    fogColor: 0x4a3a6a,
    musicTrack: 'nexus_ambient',
  },
  [STRATA.DUNGEON]: {
    nameKey: 'biome.dungeon',
    primaryColor: 0x3a3a3a,
    secondaryColor: 0x4a4a4a,
    wallColor: 0x2a2a2a,
    floorTiles: ['cobblestone', 'dirt_floor', 'cracked_tile'],
    wallTiles: ['dungeon_brick', 'rough_stone', 'ruined_wall'],
    decorations: ['torch_holder', 'bone_pile', 'broken_chain', 'moss_patch'],
    hazards: ['spike_trap', 'pit', 'poison_gas'],
    ambientParticles: ['dust', 'torch_ember'],
    fogDensity: 0.3,
    fogColor: 0x444444,
    musicTrack: 'dungeon_ambient',
  },
};

// ========== Room Generation ==========

/**
 * Room definition
 * @typedef {object} Room
 * @property {number} x - Top-left x
 * @property {number} y - Top-left y
 * @property {number} width
 * @property {number} height
 * @property {string} type
 * @property {boolean} connected
 */

/**
 * Generate rooms with BSP algorithm
 */
export function generateRooms(width, height, rng, params = ROOM_PARAMS) {
  const rooms = [];
  const minSize = params.MIN_SIZE;
  const maxSize = params.MAX_SIZE;
  const targetRooms = minSize + Math.floor(rng.next() * (params.MAX_ROOMS - params.MIN_ROOMS));
  
  let attempts = 0;
  const maxAttempts = targetRooms * 20;
  
  while (rooms.length < targetRooms && attempts < maxAttempts) {
    attempts++;
    
    const roomWidth = minSize + Math.floor(rng.next() * (maxSize - minSize));
    const roomHeight = minSize + Math.floor(rng.next() * (maxSize - minSize));
    
    const x = 1 + Math.floor(rng.next() * (width - roomWidth - 2));
    const y = 1 + Math.floor(rng.next() * (height - roomHeight - 2));
    
    const newRoom = {
      x, y,
      width: roomWidth,
      height: roomHeight,
      centerX: x + Math.floor(roomWidth / 2),
      centerY: y + Math.floor(roomHeight / 2),
      type: 'normal',
      connected: false,
    };
    
    // Check overlap with existing rooms
    let overlaps = false;
    for (const existing of rooms) {
      if (roomsOverlap(newRoom, existing, params.ROOM_SPACING)) {
        overlaps = true;
        break;
      }
    }
    
    if (!overlaps) {
      rooms.push(newRoom);
    }
  }
  
  // Mark special rooms
  if (rooms.length > 0) {
    rooms[0].type = 'spawn';
    rooms[0].connected = true;
  }
  
  if (rooms.length > 1) {
    // Find furthest room for boss
    let maxDist = 0;
    let bossRoom = rooms[1];
    
    for (let i = 1; i < rooms.length; i++) {
      const dist = distance(
        rooms[0].centerX, rooms[0].centerY,
        rooms[i].centerX, rooms[i].centerY
      );
      if (dist > maxDist) {
        maxDist = dist;
        bossRoom = rooms[i];
      }
    }
    bossRoom.type = 'boss';
  }
  
  // Random treasure rooms
  const treasureCount = 1 + Math.floor(rng.next() * 3);
  let assigned = 0;
  for (const room of rooms) {
    if (room.type === 'normal' && rng.next() < 0.3 && assigned < treasureCount) {
      room.type = 'treasure';
      assigned++;
    }
  }
  
  return rooms;
}

/**
 * Check if two rooms overlap
 */
function roomsOverlap(a, b, spacing) {
  return (
    a.x - spacing < b.x + b.width &&
    a.x + a.width + spacing > b.x &&
    a.y - spacing < b.y + b.height &&
    a.y + a.height + spacing > b.y
  );
}

// ========== Corridor Generation ==========

/**
 * Connect rooms with corridors using MST
 */
export function generateCorridors(rooms, rng, corridorWidth = 2) {
  if (rooms.length < 2) return [];
  
  const corridors = [];
  
  // Simple nearest-neighbor connection
  const connected = [0];
  const unconnected = rooms.map((_, i) => i).filter(i => i !== 0);
  
  while (unconnected.length > 0) {
    let bestDist = Infinity;
    let bestFrom = -1;
    let bestTo = -1;
    
    // Find closest pair between connected and unconnected
    for (const from of connected) {
      for (const to of unconnected) {
        const dist = distance(
          rooms[from].centerX, rooms[from].centerY,
          rooms[to].centerX, rooms[to].centerY
        );
        if (dist < bestDist) {
          bestDist = dist;
          bestFrom = from;
          bestTo = to;
        }
      }
    }
    
    if (bestTo !== -1) {
      // Create corridor
      const corridor = createCorridor(
        rooms[bestFrom], rooms[bestTo],
        corridorWidth, rng
      );
      corridors.push(corridor);
      
      rooms[bestTo].connected = true;
      connected.push(bestTo);
      unconnected.splice(unconnected.indexOf(bestTo), 1);
    } else {
      break;
    }
  }
  
  // Add some extra connections for loops (20% chance)
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 2; j < rooms.length; j++) {
      if (rng.next() < 0.15) {
        const dist = distance(
          rooms[i].centerX, rooms[i].centerY,
          rooms[j].centerX, rooms[j].centerY
        );
        if (dist < 30) { // Only short extra connections
          corridors.push(createCorridor(rooms[i], rooms[j], corridorWidth, rng));
        }
      }
    }
  }
  
  return corridors;
}

/**
 * Create a single corridor between two rooms
 */
function createCorridor(roomA, roomB, width, rng) {
  const ax = roomA.centerX;
  const ay = roomA.centerY;
  const bx = roomB.centerX;
  const by = roomB.centerY;
  
  const segments = [];
  
  // L-shaped corridor (horizontal then vertical, or vice versa)
  if (rng.next() < 0.5) {
    // Horizontal first
    segments.push({
      x1: ax, y1: ay,
      x2: bx, y2: ay,
      width,
      direction: 'horizontal',
    });
    segments.push({
      x1: bx, y1: ay,
      x2: bx, y2: by,
      width,
      direction: 'vertical',
    });
  } else {
    // Vertical first
    segments.push({
      x1: ax, y1: ay,
      x2: ax, y2: by,
      width,
      direction: 'vertical',
    });
    segments.push({
      x1: ax, y1: by,
      x2: bx, y2: by,
      width,
      direction: 'horizontal',
    });
  }
  
  return {
    from: roomA,
    to: roomB,
    segments,
  };
}

// ========== Tile Map Generation ==========

/**
 * Create tile map from rooms and corridors
 */
export function createTileMap(width, height, rooms, corridors, biome, rng) {
  // Initialize with walls
  const tiles = new Array(width * height).fill(TILE_TYPES.WALL);
  const variants = new Array(width * height).fill(0);
  
  // Carve rooms
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        const idx = y * width + x;
        tiles[idx] = TILE_TYPES.FLOOR;
        variants[idx] = Math.floor(rng.next() * 4);
      }
    }
  }
  
  // Carve corridors
  for (const corridor of corridors) {
    for (const segment of corridor.segments) {
      carveSegment(tiles, variants, width, segment, rng);
    }
  }
  
  // Add doors at room entrances
  for (const room of rooms) {
    addRoomDoors(tiles, width, height, room, rng);
  }
  
  // Add decorations
  const decorations = [];
  for (const room of rooms) {
    const roomDecos = generateRoomDecorations(room, biome, rng);
    decorations.push(...roomDecos);
  }
  
  // Add hazards
  const hazards = [];
  for (const room of rooms) {
    if (room.type !== 'spawn' && rng.next() < 0.3) {
      const roomHazards = generateHazards(room, biome, rng);
      hazards.push(...roomHazards);
    }
  }
  
  // Add chests in treasure rooms
  const chests = [];
  for (const room of rooms) {
    if (room.type === 'treasure') {
      chests.push({
        x: room.centerX,
        y: room.centerY,
        type: 'treasure_chest',
        opened: false,
      });
      tiles[room.centerY * width + room.centerX] = TILE_TYPES.CHEST;
    }
  }
  
  return {
    tiles,
    variants,
    width,
    height,
    rooms,
    corridors,
    decorations,
    hazards,
    chests,
    biome,
  };
}

/**
 * Carve corridor segment into tile map
 */
function carveSegment(tiles, variants, mapWidth, segment, rng) {
  const { x1, y1, x2, y2, width } = segment;
  
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  
  const halfWidth = Math.floor(width / 2);
  
  for (let y = minY - halfWidth; y <= maxY + halfWidth; y++) {
    for (let x = minX - halfWidth; x <= maxX + halfWidth; x++) {
      if (x < 1 || x >= mapWidth - 1 || y < 1) continue;
      const idx = y * mapWidth + x;
      if (idx >= 0 && idx < tiles.length) {
        tiles[idx] = TILE_TYPES.FLOOR;
        variants[idx] = Math.floor(rng.next() * 4);
      }
    }
  }
}

/**
 * Add doors to room entrances
 */
function addRoomDoors(tiles, width, height, room, rng) {
  const checkAndAddDoor = (x, y, dx, dy) => {
    const innerIdx = y * width + x;
    const wallIdx = (y + dy) * width + (x + dx);
    const outerIdx = (y + dy * 2) * width + (x + dx * 2);
    
    if (wallIdx < 0 || wallIdx >= tiles.length) return;
    if (outerIdx < 0 || outerIdx >= tiles.length) return;
    
    // Door where: floor -> wall -> floor
    if (tiles[innerIdx] === TILE_TYPES.FLOOR &&
        tiles[wallIdx] === TILE_TYPES.WALL &&
        tiles[outerIdx] === TILE_TYPES.FLOOR) {
      if (rng.next() < 0.4) { // 40% chance for door
        tiles[wallIdx] = TILE_TYPES.DOOR;
      } else {
        tiles[wallIdx] = TILE_TYPES.FLOOR;
      }
    }
  };
  
  // Check edges of room
  for (let x = room.x; x < room.x + room.width; x++) {
    checkAndAddDoor(x, room.y, 0, -1);
    checkAndAddDoor(x, room.y + room.height - 1, 0, 1);
  }
  for (let y = room.y; y < room.y + room.height; y++) {
    checkAndAddDoor(room.x, y, -1, 0);
    checkAndAddDoor(room.x + room.width - 1, y, 1, 0);
  }
}

/**
 * Generate room decorations
 */
function generateRoomDecorations(room, biome, rng) {
  const biomeConfig = BIOME_CONFIG[biome];
  const decorations = [];
  const decoTypes = biomeConfig?.decorations || [];
  
  if (decoTypes.length === 0) return decorations;
  
  // Number of decorations based on room size
  const area = room.width * room.height;
  const decoCount = Math.floor(area * 0.05 * (0.5 + rng.next()));
  
  for (let i = 0; i < decoCount; i++) {
    const x = room.x + 1 + Math.floor(rng.next() * (room.width - 2));
    const y = room.y + 1 + Math.floor(rng.next() * (room.height - 2));
    const type = decoTypes[Math.floor(rng.next() * decoTypes.length)];
    
    decorations.push({
      x,
      y,
      type,
      variant: Math.floor(rng.next() * 3),
    });
  }
  
  return decorations;
}

/**
 * Generate room hazards
 */
function generateHazards(room, biome, rng) {
  const biomeConfig = BIOME_CONFIG[biome];
  const hazards = [];
  const hazardTypes = biomeConfig?.hazards || [];
  
  if (hazardTypes.length === 0) return hazards;
  
  const hazardCount = 1 + Math.floor(rng.next() * 2);
  
  for (let i = 0; i < hazardCount; i++) {
    const x = room.x + 2 + Math.floor(rng.next() * (room.width - 4));
    const y = room.y + 2 + Math.floor(rng.next() * (room.height - 4));
    const type = hazardTypes[Math.floor(rng.next() * hazardTypes.length)];
    
    hazards.push({
      x,
      y,
      type,
      radius: 16 + Math.floor(rng.next() * 16),
      damage: 5,
      active: true,
    });
  }
  
  return hazards;
}

// ========== World State ==========

/**
 * Create world state
 */
export function createWorldState(seed, stratum = STRATA.JARDIN) {
  const rng = makeRng(seed);
  
  const width = 80;
  const height = 80;
  
  // Generate structure
  const rooms = generateRooms(width, height, rng);
  const corridors = generateCorridors(rooms, rng);
  const tileMap = createTileMap(width, height, rooms, corridors, stratum, rng);
  
  // Find spawn point
  const spawnRoom = rooms.find(r => r.type === 'spawn') || rooms[0];
  const spawnPoint = {
    x: spawnRoom.centerX * WORLD_SIZE.TILE_SIZE,
    y: spawnRoom.centerY * WORLD_SIZE.TILE_SIZE,
  };
  
  // Find boss room
  const bossRoom = rooms.find(r => r.type === 'boss');
  const bossPoint = bossRoom ? {
    x: bossRoom.centerX * WORLD_SIZE.TILE_SIZE,
    y: bossRoom.centerY * WORLD_SIZE.TILE_SIZE,
  } : null;
  
  return {
    seed,
    stratum,
    tileMap,
    spawnPoint,
    bossPoint,
    explored: new Set(),
    enemies: [],
    items: [],
    projectiles: [],
    effects: [],
    portals: [],
  };
}

/**
 * Check if a position is walkable
 */
export function isWalkable(worldState, x, y) {
  const { tileMap } = worldState;
  const tileX = Math.floor(x / WORLD_SIZE.TILE_SIZE);
  const tileY = Math.floor(y / WORLD_SIZE.TILE_SIZE);
  
  if (tileX < 0 || tileX >= tileMap.width || tileY < 0 || tileY >= tileMap.height) {
    return false;
  }
  
  const idx = tileY * tileMap.width + tileX;
  const tileType = tileMap.tiles[idx];
  const config = TILE_CONFIG[tileType];
  
  return config?.walkable ?? false;
}

/**
 * Get tile at position
 */
export function getTileAt(worldState, x, y) {
  const { tileMap } = worldState;
  const tileX = Math.floor(x / WORLD_SIZE.TILE_SIZE);
  const tileY = Math.floor(y / WORLD_SIZE.TILE_SIZE);
  
  if (tileX < 0 || tileX >= tileMap.width || tileY < 0 || tileY >= tileMap.height) {
    return { type: TILE_TYPES.VOID, config: TILE_CONFIG[TILE_TYPES.VOID] };
  }
  
  const idx = tileY * tileMap.width + tileX;
  const type = tileMap.tiles[idx];
  
  return {
    type,
    config: TILE_CONFIG[type],
    variant: tileMap.variants[idx],
    tileX,
    tileY,
  };
}

/**
 * Mark area as explored
 */
export function exploreArea(worldState, centerX, centerY, radius = 128) {
  const { explored } = worldState;
  const tileRadius = Math.ceil(radius / WORLD_SIZE.TILE_SIZE);
  const centerTileX = Math.floor(centerX / WORLD_SIZE.TILE_SIZE);
  const centerTileY = Math.floor(centerY / WORLD_SIZE.TILE_SIZE);
  
  for (let dy = -tileRadius; dy <= tileRadius; dy++) {
    for (let dx = -tileRadius; dx <= tileRadius; dx++) {
      if (dx * dx + dy * dy <= tileRadius * tileRadius) {
        const key = `${centerTileX + dx},${centerTileY + dy}`;
        explored.add(key);
      }
    }
  }
}

/**
 * Get exploration percentage
 */
export function getExplorationPercent(worldState) {
  const { tileMap, explored } = worldState;
  
  // Count walkable tiles
  let walkable = 0;
  for (const tile of tileMap.tiles) {
    if (TILE_CONFIG[tile]?.walkable) walkable++;
  }
  
  // Count explored walkable tiles
  let exploredWalkable = 0;
  for (const key of explored) {
    const [x, y] = key.split(',').map(Number);
    const idx = y * tileMap.width + x;
    if (idx >= 0 && idx < tileMap.tiles.length) {
      if (TILE_CONFIG[tileMap.tiles[idx]]?.walkable) {
        exploredWalkable++;
      }
    }
  }
  
  return walkable > 0 ? exploredWalkable / walkable : 0;
}

// ========== Type Definitions ==========

/**
 * @typedef {object} WorldState
 * @property {number} seed
 * @property {string} stratum
 * @property {object} tileMap
 * @property {object} spawnPoint
 * @property {object|null} bossPoint
 * @property {Set<string>} explored
 * @property {Array} enemies
 * @property {Array} items
 */

// ========== Compatibility Aliases ==========

/**
 * Generate a complete world (compatibility wrapper)
 * @param {number} seed 
 * @param {string} biome 
 * @param {number} width 
 * @param {number} height 
 * @returns {object}
 */
export function generateWorld(seed, biome, width = 100, height = 100) {
  return createWorldState(seed, biome);
}

/**
 * Create room data structure (compatibility wrapper)
 * @param {object} room 
 * @returns {object}
 */
export function createRoomData(room) {
  return {
    id: `room_${room.x}_${room.y}`,
    ...room,
    entities: [],
    items: [],
    cleared: false,
  };
}

/**
 * Get biome configuration (compatibility wrapper)
 * @param {string} biome 
 * @returns {object}
 */
export function getBiomeConfig(biome) {
  return BIOME_CONFIG[biome] || BIOME_CONFIG[STRATA.JARDIN];
}

/**
 * Place decorations in a room (compatibility wrapper)
 * @param {object} room 
 * @param {object} rng 
 * @returns {Array}
 */
export function placeDecorations(room, rng) {
  const decorations = [];
  const count = rng ? rng.nextInt(5) + 2 : Math.floor(Math.random() * 5) + 2;
  
  for (let i = 0; i < count; i++) {
    decorations.push({
      x: room.x + (rng ? rng.nextRange(1, room.w - 1) : Math.random() * (room.w - 2) + 1),
      y: room.y + (rng ? rng.nextRange(1, room.h - 1) : Math.random() * (room.h - 2) + 1),
      type: 'decoration',
      variant: rng ? rng.nextInt(4) : Math.floor(Math.random() * 4),
    });
  }
  return decorations;
}

export default {
  WORLD_SIZE,
  ROOM_PARAMS,
  TILE_CONFIG,
  BIOME_CONFIG,
  
  generateRooms,
  generateCorridors,
  createTileMap,
  createWorldState,
  generateWorld,
  createRoomData,
  getBiomeConfig,
  placeDecorations,
  
  isWalkable,
  getTileAt,
  exploreArea,
  getExplorationPercent,
};
