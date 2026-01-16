/**
 * SOPOR - Open World Generation System
 * Creates an open world with village, forests, and danger zones
 */

import { STRATA, TILE_TYPES } from '../core/constants.js';
import { makeRng, clamp, distance } from '../core/utils.js';

// ========== World Configuration ==========

export const OPEN_WORLD_CONFIG = {
  // World size in tiles
  WIDTH: 200,
  HEIGHT: 150,
  TILE_SIZE: 32,
  
  // Village configuration
  VILLAGE: {
    RADIUS: 25,        // Safe zone radius in tiles
    CENTER_X: 100,     // Village center X
    CENTER_Y: 75,      // Village center Y
    HOUSE_COUNT: 8,
    NPC_COUNT: 6,
    TREE_COUNT: 15,
  },
  
  // Zone distances from village center
  ZONES: {
    SAFE: 30,          // No enemies spawn
    EASY: 50,          // Weak enemies
    MEDIUM: 80,        // Medium enemies
    HARD: 120,         // Strong enemies
    DANGER: 999,       // Boss territory
  },
  
  // Spawn rates per zone (enemies per 100 tiles)
  SPAWN_RATES: {
    SAFE: 0,
    EASY: 2,
    MEDIUM: 4,
    HARD: 6,
    DANGER: 8,
  },
};

// ========== Zone Types for Biome Generation ==========

export const ZONE_TYPES = {
  VILLAGE: 'village',
  FOREST: 'forest',
  DEEP_FOREST: 'deep_forest',
  CORRUPTED: 'corrupted',
  CORRUPTED_CORE: 'corrupted_core',
};

// ========== Zone Configuration ==========

export const ZONE_CONFIG = {
  [ZONE_TYPES.VILLAGE]: {
    radius: 30,
    treesDensity: 0.05,
    grassColor: ['#4a9f4a', '#5aaf5a', '#4a8f4a'],
    ambientLight: 1.0,
    fogDensity: 0,
    musicTrack: 'village',
    enemyLevel: 0,
  },
  [ZONE_TYPES.FOREST]: {
    radiusMin: 30,
    radiusMax: 70,
    treesDensity: 0.25,
    grassColor: ['#3a7f3a', '#4a8f4a', '#3a6f3a'],
    ambientLight: 0.8,
    fogDensity: 0.15,
    musicTrack: 'forest',
    enemyLevel: 1,
  },
  [ZONE_TYPES.DEEP_FOREST]: {
    radiusMin: 70,
    radiusMax: 100,
    treesDensity: 0.35,
    grassColor: ['#2a5f2a', '#3a6f3a', '#2a4f2a'],
    ambientLight: 0.6,
    fogDensity: 0.3,
    musicTrack: 'deep_forest',
    enemyLevel: 2,
  },
  [ZONE_TYPES.CORRUPTED]: {
    radiusMin: 100,
    radiusMax: 140,
    treesDensity: 0.15,
    grassColor: ['#4a3a5a', '#5a4a6a', '#3a2a4a'],
    dirtColor: ['#3a2a3a', '#4a3a4a', '#2a1a2a'],
    ambientLight: 0.4,
    fogDensity: 0.5,
    fogColor: [40, 20, 60],
    musicTrack: 'corrupted',
    enemyLevel: 3,
    hasCorruptionVeins: true,
  },
  [ZONE_TYPES.CORRUPTED_CORE]: {
    radiusMin: 140,
    radiusMax: 999,
    treesDensity: 0.08,
    grassColor: ['#2a1a3a', '#3a2a4a', '#1a0a2a'],
    dirtColor: ['#2a1a2a', '#3a2a3a', '#1a0a1a'],
    stoneColor: ['#3a2a3a', '#4a3a4a', '#2a1a2a'],
    ambientLight: 0.25,
    fogDensity: 0.7,
    fogColor: [60, 20, 80],
    musicTrack: 'boss',
    enemyLevel: 4,
    hasCorruptionVeins: true,
    hasBossSpawns: true,
  },
};

// ========== Tile Types ==========

export const WORLD_TILES = {
  GRASS: 0,
  DIRT: 1,
  STONE: 2,
  WATER: 3,
  SAND: 4,
  WALL: 5,
  FLOOR_WOOD: 6,
  FLOOR_STONE: 7,
  PATH: 8,
  BRIDGE: 9,
  FLOWERS: 10,
  TALL_GRASS: 11,
  // New corrupted tiles
  CORRUPTED_GRASS: 12,
  CORRUPTED_DIRT: 13,
  CORRUPTED_STONE: 14,
  CORRUPTION_VEIN: 15,
  DEAD_GRASS: 16,
  MUSHROOM_PATCH: 17,
  SWAMP: 18,
  MOSS: 19,
};

// ========== Structure Types ==========

export const STRUCTURE_TYPES = {
  HOUSE: 'house',
  SHOP: 'shop',
  INN: 'inn',
  BLACKSMITH: 'blacksmith',
  WELL: 'well',
  FOUNTAIN: 'fountain',
  MARKET_STALL: 'market_stall',
  GUARD_POST: 'guard_post',
};

// ========== Entity Types ==========

export const ENTITY_TYPES = {
  // Decorations - Trees
  TREE_OAK: 'tree_oak',
  TREE_PINE: 'tree_pine',
  TREE_WILLOW: 'tree_willow',
  TREE_DEAD: 'tree_dead',
  TREE_CORRUPTED: 'tree_corrupted',
  TREE_GIANT: 'tree_giant',
  
  // Decorations - Nature
  BUSH: 'bush',
  BUSH_BERRY: 'bush_berry',
  BUSH_THORNS: 'bush_thorns',
  ROCK: 'rock',
  ROCK_LARGE: 'rock_large',
  ROCK_MOSS: 'rock_moss',
  ROCK_PILE: 'rock_pile',
  BOULDER: 'boulder',
  FLOWER_BED: 'flower_bed',
  MUSHROOM: 'mushroom',
  MUSHROOM_CLUSTER: 'mushroom_cluster',
  MUSHROOM_GLOWING: 'mushroom_glowing',
  STUMP: 'stump',
  FALLEN_LOG: 'fallen_log',
  TALL_GRASS_PATCH: 'tall_grass_patch',
  FERN: 'fern',
  POND: 'pond',
  STREAM: 'stream',
  
  // Terrain Features
  MOUNTAIN: 'mountain',
  MOUNTAIN_SMALL: 'mountain_small',
  CLIFF: 'cliff',
  CAVE_ENTRANCE: 'cave_entrance',
  RAVINE: 'ravine',
  HILL: 'hill',
  
  // Decorations - Village
  LAMP_POST: 'lamp_post',
  FENCE: 'fence',
  SIGN: 'sign',
  BARREL: 'barrel',
  CRATE: 'crate',
  WELL: 'well_deco',
  CART: 'cart',
  BENCH: 'bench',
  SCARECROW: 'scarecrow',
  HAY_BALE: 'hay_bale',
  WHEELBARROW: 'wheelbarrow',
  
  // Decorations - Corrupted
  CORRUPTION_CRYSTAL: 'corruption_crystal',
  CORRUPTION_TENDRIL: 'corruption_tendril',
  DEAD_ANIMAL: 'dead_animal',
  SKULL_PILE: 'skull_pile',
  DARK_OBELISK: 'dark_obelisk',
  PORTAL_SMALL: 'portal_small',
  CORRUPTED_POOL: 'corrupted_pool',
  
  // Animals - Passive
  ANIMAL_RABBIT: 'animal_rabbit',
  ANIMAL_DEER: 'animal_deer',
  ANIMAL_BIRD: 'animal_bird',
  ANIMAL_SQUIRREL: 'animal_squirrel',
  ANIMAL_BUTTERFLY: 'animal_butterfly',
  ANIMAL_FOX: 'animal_fox',
  ANIMAL_FROG: 'animal_frog',
  ANIMAL_FISH: 'animal_fish',
  
  // Animals - Aggressive
  ANIMAL_WOLF: 'animal_wolf',
  ANIMAL_BOAR: 'animal_boar',
  ANIMAL_BEAR: 'animal_bear',
  ANIMAL_SNAKE: 'animal_snake',
  ANIMAL_BAT: 'animal_bat',
  
  // Ambient/Effects
  FIREFLY_ZONE: 'firefly_zone',
  MIST_ZONE: 'mist_zone',
  SPORE_ZONE: 'spore_zone',
  LEAF_FALL_ZONE: 'leaf_fall_zone',
  BIRD_FLOCK: 'bird_flock',
  
  // Interactive
  CHEST: 'chest',
  CHEST_RARE: 'chest_rare',
  DOOR: 'door',
  ORE_NODE: 'ore_node',
  HERB_PLANT: 'herb_plant',
  FISHING_SPOT: 'fishing_spot',
  CAMPFIRE: 'campfire',
  
  // NPCs
  NPC_VILLAGER: 'npc_villager',
  NPC_MERCHANT: 'npc_merchant',
  NPC_BLACKSMITH: 'npc_blacksmith',
  NPC_INNKEEPER: 'npc_innkeeper',
  NPC_GUARD: 'npc_guard',
  NPC_ELDER: 'npc_elder',
  NPC_CHILD: 'npc_child',
};

// ========== NPC Definitions ==========

export const NPC_DEFINITIONS = {
  [ENTITY_TYPES.NPC_VILLAGER]: {
    name: 'Villageois',
    dialogues: [
      "Bienvenue dans notre village, étranger.",
      "Les bois au-delà sont dangereux la nuit.",
      "L'ancien dit que les rêves deviennent réels ici...",
      "Avez-vous vu les lumières dans la forêt?",
    ],
    canGiveQuest: false,
  },
  [ENTITY_TYPES.NPC_MERCHANT]: {
    name: 'Marchand',
    dialogues: [
      "Venez voir mes marchandises!",
      "J'ai des potions, des armes, tout ce qu'il vous faut.",
    ],
    canTrade: true,
    inventory: ['potion_health', 'potion_mana', 'sword_basic'],
  },
  [ENTITY_TYPES.NPC_BLACKSMITH]: {
    name: 'Forgeron',
    dialogues: [
      "Mes lames sont les meilleures de la région.",
      "Rapportez-moi du minerai et je vous forgerai une arme.",
    ],
    canUpgrade: true,
    canGiveQuest: true,
    questId: 'blacksmith_ore',
  },
  [ENTITY_TYPES.NPC_ELDER]: {
    name: 'Ancien du Village',
    dialogues: [
      "Ah, un nouvel Éveillé... Je t'attendais.",
      "La Trame se délite. Les cauchemars envahissent nos terres.",
      "Tu dois restaurer les Piliers de Lumière pour sauver ce monde.",
    ],
    canGiveQuest: true,
    questId: 'main_quest_1',
  },
  [ENTITY_TYPES.NPC_GUARD]: {
    name: 'Garde',
    dialogues: [
      "Halte! ... Ah, vous êtes un ami. Passez.",
      "Les créatures se rapprochent chaque nuit.",
      "Si vous allez au nord, soyez prudent.",
    ],
    canGiveQuest: false,
  },
  [ENTITY_TYPES.NPC_INNKEEPER]: {
    name: 'Aubergiste',
    dialogues: [
      "Bienvenue à l'Auberge du Rêve Paisible!",
      "Vous voulez vous reposer? Ça restaurera votre santé.",
    ],
    canHeal: true,
  },
};

// ========== Quest Definitions ==========

export const QUEST_DEFINITIONS = {
  main_quest_1: {
    id: 'main_quest_1',
    title: 'La Lumière Vacillante',
    description: 'L\'Ancien vous demande d\'éliminer 5 créatures dans la forêt.',
    giver: ENTITY_TYPES.NPC_ELDER,
    type: 'kill',
    target: 'enemy',
    required: 5,
    rewards: { xp: 50, gold: 20 },
    nextQuest: 'main_quest_2',
  },
  main_quest_2: {
    id: 'main_quest_2',
    title: 'Le Premier Pilier',
    description: 'Trouvez et activez le Pilier de Lumière au nord.',
    giver: ENTITY_TYPES.NPC_ELDER,
    type: 'reach',
    target: { x: 150, y: 30 },
    rewards: { xp: 100, gold: 50, item: 'amulet_light' },
  },
  blacksmith_ore: {
    id: 'blacksmith_ore',
    title: 'Minerai Précieux',
    description: 'Le forgeron a besoin de 3 minerais de fer.',
    giver: ENTITY_TYPES.NPC_BLACKSMITH,
    type: 'collect',
    target: 'ore_iron',
    required: 3,
    rewards: { xp: 30, item: 'sword_forged' },
  },
  // New quests
  hunter_quest: {
    id: 'hunter_quest',
    title: 'Chasseur de Monstres',
    description: 'Éliminez 10 créatures pour prouver votre valeur.',
    giver: ENTITY_TYPES.NPC_GUARD,
    type: 'kill',
    target: 'enemy',
    required: 10,
    rewards: { xp: 80, gold: 40 },
  },
  gather_berries: {
    id: 'gather_berries',
    title: 'Cueillette de Baies',
    description: 'Un villageois a besoin de 5 baies pour ses potions.',
    giver: ENTITY_TYPES.NPC_VILLAGER,
    type: 'collect',
    target: 'berry',
    required: 5,
    rewards: { xp: 25, gold: 15 },
  },
  explore_forest: {
    id: 'explore_forest',
    title: 'Explorer la Forêt',
    description: 'Aventurez-vous dans la forêt et revenez sain et sauf.',
    giver: ENTITY_TYPES.NPC_ELDER,
    type: 'explore',
    required: 1,
    rewards: { xp: 40, gold: 25 },
  },
  protect_village: {
    id: 'protect_village',
    title: 'Protéger le Village',
    description: 'Les gardes ont besoin d\'aide. Tuez 15 ennemis près du village.',
    giver: ENTITY_TYPES.NPC_GUARD,
    type: 'kill',
    target: 'enemy',
    required: 15,
    rewards: { xp: 120, gold: 60, item: 'shield_basic' },
  },
  merchant_delivery: {
    id: 'merchant_delivery',
    title: 'Livraison Urgente',
    description: 'Le marchand a besoin que vous trouviez 2 coffres cachés.',
    giver: ENTITY_TYPES.NPC_MERCHANT,
    type: 'collect',
    target: 'chest',
    required: 2,
    rewards: { xp: 35, gold: 30 },
  },
  innkeeper_help: {
    id: 'innkeeper_help',
    title: 'Aide à l\'Auberge',
    description: 'L\'aubergiste a besoin de 3 minerais pour réparer le toit.',
    giver: ENTITY_TYPES.NPC_INNKEEPER,
    type: 'collect',
    target: 'ore_iron',
    required: 3,
    rewards: { xp: 45, gold: 35 },
  },
};

// ========== World Generation ==========

/**
 * Generate open world
 */
export function generateOpenWorld(seed) {
  const rng = makeRng(seed);
  const config = OPEN_WORLD_CONFIG;
  
  const width = config.WIDTH;
  const height = config.HEIGHT;
  
  // Initialize tile map
  const tiles = new Array(width * height).fill(WORLD_TILES.GRASS);
  const heightMap = generateHeightMap(width, height, rng);
  
  // Apply terrain based on height map
  applyTerrain(tiles, heightMap, width, height, rng);
  
  // Generate village
  const villageCenter = {
    x: config.VILLAGE.CENTER_X,
    y: config.VILLAGE.CENTER_Y,
  };
  
  // Create village area (cleared grass with paths)
  createVillageArea(tiles, width, villageCenter, config.VILLAGE.RADIUS, rng);
  
  // Generate structures
  const structures = generateStructures(villageCenter, config.VILLAGE, rng);
  
  // Apply structure tiles
  for (const structure of structures) {
    applyStructure(tiles, width, structure);
  }
  
  // Generate paths between structures
  generatePaths(tiles, width, structures, villageCenter, rng);
  
  // Generate decorative entities (trees, rocks, etc.)
  const decorations = generateDecorations(width, height, villageCenter, structures, rng);
  
  // Generate NPCs
  const npcs = generateNPCs(structures, villageCenter, rng);
  
  // Generate interactables (chests, etc.)
  const interactables = generateInteractables(width, height, villageCenter, rng);
  
  // Generate spawn points for enemies
  const enemySpawnZones = generateEnemyZones(width, height, villageCenter);
  
  // Spawn point (center of village)
  const spawnPoint = {
    x: villageCenter.x * config.TILE_SIZE,
    y: villageCenter.y * config.TILE_SIZE,
  };
  
  return {
    seed,
    width,
    height,
    tileSize: config.TILE_SIZE,
    tiles,
    heightMap,
    structures,
    decorations,
    npcs,
    interactables,
    enemySpawnZones,
    villageCenter,
    spawnPoint,
    quests: { ...QUEST_DEFINITIONS },
  };
}

/**
 * Generate height map using simplex-like noise
 */
function generateHeightMap(width, height, rng) {
  const map = new Float32Array(width * height);
  
  // Multi-octave noise
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 0;
      let amplitude = 1;
      let frequency = 0.02;
      let maxValue = 0;
      
      for (let octave = 0; octave < 4; octave++) {
        // Simple hash-based noise
        const nx = x * frequency;
        const ny = y * frequency;
        const n = pseudoNoise(nx, ny, rng.seed + octave * 1000);
        
        value += n * amplitude;
        maxValue += amplitude;
        
        amplitude *= 0.5;
        frequency *= 2;
      }
      
      map[y * width + x] = value / maxValue;
    }
  }
  
  return map;
}

/**
 * Simple pseudo-noise function
 */
function pseudoNoise(x, y, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  
  const hash = (px, py) => {
    const n = Math.sin(px * 12.9898 + py * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  };
  
  const v00 = hash(xi, yi);
  const v10 = hash(xi + 1, yi);
  const v01 = hash(xi, yi + 1);
  const v11 = hash(xi + 1, yi + 1);
  
  // Smooth interpolation
  const sx = xf * xf * (3 - 2 * xf);
  const sy = yf * yf * (3 - 2 * yf);
  
  const v0 = v00 + sx * (v10 - v00);
  const v1 = v01 + sx * (v11 - v01);
  
  return v0 + sy * (v1 - v0);
}

/**
 * Apply terrain types based on height map
 */
function applyTerrain(tiles, heightMap, width, height, rng) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const h = heightMap[idx];
      
      // Water in low areas
      if (h < 0.25) {
        tiles[idx] = WORLD_TILES.WATER;
      }
      // Sand near water
      else if (h < 0.30) {
        tiles[idx] = WORLD_TILES.SAND;
      }
      // Grass (default)
      else if (h < 0.65) {
        // Random flowers
        if (rng.next() < 0.08) {
          tiles[idx] = WORLD_TILES.FLOWERS;
        } else if (rng.next() < 0.1) {
          tiles[idx] = WORLD_TILES.TALL_GRASS;
        } else {
          tiles[idx] = WORLD_TILES.GRASS;
        }
      }
      // Dirt in higher areas
      else if (h < 0.80) {
        tiles[idx] = WORLD_TILES.DIRT;
      }
      // Stone/rocks at peaks
      else {
        tiles[idx] = WORLD_TILES.STONE;
      }
    }
  }
}

/**
 * Create cleared village area
 */
function createVillageArea(tiles, width, center, radius, rng) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        const x = center.x + dx;
        const y = center.y + dy;
        
        if (x >= 0 && x < OPEN_WORLD_CONFIG.WIDTH && 
            y >= 0 && y < OPEN_WORLD_CONFIG.HEIGHT) {
          const idx = y * width + x;
          
          // Clear to grass, some variety
          if (rng.next() < 0.1 && dist > 5) {
            tiles[idx] = WORLD_TILES.FLOWERS;
          } else {
            tiles[idx] = WORLD_TILES.GRASS;
          }
        }
      }
    }
  }
}

/**
 * Generate village structures (more dispersed and random)
 */
function generateStructures(center, villageConfig, rng) {
  const structures = [];
  
  // Structure templates
  const templates = [
    { type: STRUCTURE_TYPES.HOUSE, width: 5, height: 4, count: 6 },
    { type: STRUCTURE_TYPES.SHOP, width: 6, height: 5, count: 1 },
    { type: STRUCTURE_TYPES.INN, width: 7, height: 6, count: 1 },
    { type: STRUCTURE_TYPES.BLACKSMITH, width: 5, height: 5, count: 1 },
    { type: STRUCTURE_TYPES.WELL, width: 2, height: 2, count: 2 },
    { type: STRUCTURE_TYPES.GUARD_POST, width: 3, height: 3, count: 2 },
  ];
  
  // Place central fountain
  structures.push({
    type: STRUCTURE_TYPES.FOUNTAIN,
    x: center.x - 1,
    y: center.y - 1,
    width: 3,
    height: 3,
  });
  
  // Place structures in a more organic, scattered pattern
  // Use multiple "clusters" to create a realistic village layout
  const clusters = [
    { cx: center.x - 12, cy: center.y - 8, radius: 8 },
    { cx: center.x + 10, cy: center.y - 10, radius: 7 },
    { cx: center.x - 8, cy: center.y + 12, radius: 9 },
    { cx: center.x + 14, cy: center.y + 8, radius: 6 },
    { cx: center.x, cy: center.y - 18, radius: 5 },
  ];
  
  let clusterIdx = 0;
  
  for (const template of templates) {
    for (let i = 0; i < template.count; i++) {
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 20) {
        attempts++;
        
        // Pick a cluster or random position
        let posX, posY;
        
        if (rng.next() < 0.7 && clusters.length > 0) {
          // Place near a cluster
          const cluster = clusters[clusterIdx % clusters.length];
          clusterIdx++;
          
          const angle = rng.next() * Math.PI * 2;
          const dist = rng.next() * cluster.radius;
          
          posX = Math.floor(cluster.cx + Math.cos(angle) * dist - template.width / 2);
          posY = Math.floor(cluster.cy + Math.sin(angle) * dist - template.height / 2);
        } else {
          // Random position in village area
          const angle = rng.next() * Math.PI * 2;
          const dist = 6 + rng.next() * 18;
          
          posX = Math.floor(center.x + Math.cos(angle) * dist - template.width / 2);
          posY = Math.floor(center.y + Math.sin(angle) * dist - template.height / 2);
        }
        
        // Check for overlap with more padding for organic feel
        let overlaps = false;
        const padding = 2 + Math.floor(rng.next() * 3); // Variable padding
        
        for (const existing of structures) {
          if (structuresOverlap(
            { x: posX, y: posY, width: template.width, height: template.height },
            existing,
            padding
          )) {
            overlaps = true;
            break;
          }
        }
        
        // Make sure not too close to center
        const distFromCenter = Math.sqrt(
          Math.pow(posX + template.width/2 - center.x, 2) + 
          Math.pow(posY + template.height/2 - center.y, 2)
        );
        
        if (!overlaps && distFromCenter > 5) {
          structures.push({
            type: template.type,
            x: posX,
            y: posY,
            width: template.width,
            height: template.height,
            doorX: posX + Math.floor(template.width / 2),
            doorY: posY + template.height,
          });
          placed = true;
        }
      }
    }
  }
  
  return structures;
}

/**
 * Check structure overlap
 */
function structuresOverlap(a, b, padding = 0) {
  return (
    a.x - padding < b.x + b.width &&
    a.x + a.width + padding > b.x &&
    a.y - padding < b.y + b.height &&
    a.y + a.height + padding > b.y
  );
}

/**
 * Apply structure to tile map
 */
function applyStructure(tiles, mapWidth, structure) {
  // Fill with floor
  for (let dy = 0; dy < structure.height; dy++) {
    for (let dx = 0; dx < structure.width; dx++) {
      const x = structure.x + dx;
      const y = structure.y + dy;
      const idx = y * mapWidth + x;
      
      // Walls on edges
      if (dx === 0 || dx === structure.width - 1 ||
          dy === 0 || dy === structure.height - 1) {
        tiles[idx] = WORLD_TILES.WALL;
      } else {
        tiles[idx] = WORLD_TILES.FLOOR_WOOD;
      }
    }
  }
  
  // Door opening
  if (structure.doorX && structure.doorY) {
    const doorIdx = structure.doorY * mapWidth + structure.doorX;
    if (doorIdx >= 0 && doorIdx < tiles.length) {
      tiles[doorIdx] = WORLD_TILES.FLOOR_WOOD;
    }
  }
}

/**
 * Generate paths between structures
 */
function generatePaths(tiles, mapWidth, structures, center, rng) {
  // Path from each structure to center
  for (const structure of structures) {
    if (structure.doorX && structure.doorY) {
      createPath(tiles, mapWidth, 
        structure.doorX, structure.doorY,
        center.x, center.y);
    }
  }
  
  // Main roads from village center to map edges
  createPath(tiles, mapWidth, center.x, center.y, center.x, 5);  // North
  createPath(tiles, mapWidth, center.x, center.y, center.x, OPEN_WORLD_CONFIG.HEIGHT - 5);  // South
  createPath(tiles, mapWidth, center.x, center.y, 5, center.y);  // West
  createPath(tiles, mapWidth, center.x, center.y, OPEN_WORLD_CONFIG.WIDTH - 5, center.y);  // East
}

/**
 * Create a path between two points
 */
function createPath(tiles, mapWidth, x1, y1, x2, y2) {
  // Simple straight-line path with some width
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  
  if (steps === 0) return;
  
  const stepX = dx / steps;
  const stepY = dy / steps;
  
  for (let i = 0; i <= steps; i++) {
    const x = Math.floor(x1 + stepX * i);
    const y = Math.floor(y1 + stepY * i);
    
    // Path width of 2
    for (let py = -1; py <= 1; py++) {
      for (let px = -1; px <= 1; px++) {
        const tx = x + px;
        const ty = y + py;
        
        if (tx >= 0 && tx < OPEN_WORLD_CONFIG.WIDTH &&
            ty >= 0 && ty < OPEN_WORLD_CONFIG.HEIGHT) {
          const idx = ty * mapWidth + tx;
          // Only place path on grass/flowers
          if (tiles[idx] === WORLD_TILES.GRASS || 
              tiles[idx] === WORLD_TILES.FLOWERS ||
              tiles[idx] === WORLD_TILES.TALL_GRASS ||
              tiles[idx] === WORLD_TILES.DIRT) {
            tiles[idx] = WORLD_TILES.PATH;
          }
        }
      }
    }
  }
}

/**
 * Generate decoration entities with zone-specific decorations
 * Massively expanded with animals, terrain features, and more variety
 */
function generateDecorations(width, height, villageCenter, structures, rng) {
  const decorations = [];
  const config = OPEN_WORLD_CONFIG;
  
  // Helper to check if position is blocked by structures
  const isBlockedByStructure = (x, y, margin = 2) => {
    for (const s of structures) {
      if (x >= s.x - margin && x <= s.x + s.width + margin &&
          y >= s.y - margin && y <= s.y + s.height + margin) {
        return true;
      }
    }
    return false;
  };
  
  // ========== TERRAIN FEATURES ==========
  
  // Mountains around the edges of the map
  for (let i = 0; i < 25; i++) {
    // Place mountains at map edges
    let x, y;
    const edge = Math.floor(rng.next() * 4);
    
    if (edge === 0) { // Top
      x = Math.floor(rng.next() * width);
      y = Math.floor(rng.next() * 15);
    } else if (edge === 1) { // Bottom
      x = Math.floor(rng.next() * width);
      y = height - Math.floor(rng.next() * 15);
    } else if (edge === 2) { // Left
      x = Math.floor(rng.next() * 15);
      y = Math.floor(rng.next() * height);
    } else { // Right
      x = width - Math.floor(rng.next() * 15);
      y = Math.floor(rng.next() * height);
    }
    
    const isSmall = rng.next() < 0.6;
    decorations.push({
      type: isSmall ? ENTITY_TYPES.MOUNTAIN_SMALL : ENTITY_TYPES.MOUNTAIN,
      x: x * config.TILE_SIZE,
      y: y * config.TILE_SIZE,
      solid: true,
      radius: isSmall ? 40 : 80,
      zone: ZONE_TYPES.DEEP_FOREST,
    });
  }
  
  // Cave entrances in mountains/forest areas
  for (let i = 0; i < 8; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = 80 + rng.next() * 40;
    
    const x = Math.floor(villageCenter.x + Math.cos(angle) * dist);
    const y = Math.floor(villageCenter.y + Math.sin(angle) * dist);
    
    if (x > 5 && x < width - 5 && y > 5 && y < height - 5) {
      decorations.push({
        type: ENTITY_TYPES.CAVE_ENTRANCE,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: true,
        radius: 30,
        zone: getZoneTypeAtInternal(villageCenter, x, y),
        interactive: true,
      });
    }
  }
  
  // Hills scattered around
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType !== ZONE_TYPES.VILLAGE && !isBlockedByStructure(x, y, 4)) {
      decorations.push({
        type: ENTITY_TYPES.HILL,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 50,
        zone: zoneType,
      });
    }
  }
  
  // Boulders - large rocks scattered around forest/mountains
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType !== ZONE_TYPES.VILLAGE && !isBlockedByStructure(x, y)) {
      decorations.push({
        type: ENTITY_TYPES.BOULDER,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: true,
        radius: 25,
        zone: zoneType,
      });
    }
  }
  
  // ========== WATER FEATURES ==========
  
  // Ponds in various locations
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (!isBlockedByStructure(x, y, 5)) {
      decorations.push({
        type: ENTITY_TYPES.POND,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 40,
        zone: zoneType,
      });
      
      // Add fishing spot at pond
      if (zoneType !== ZONE_TYPES.CORRUPTED && zoneType !== ZONE_TYPES.CORRUPTED_CORE) {
        decorations.push({
          type: ENTITY_TYPES.FISHING_SPOT,
          x: (x + 2) * config.TILE_SIZE,
          y: y * config.TILE_SIZE,
          solid: false,
          radius: 10,
          zone: zoneType,
          interactive: true,
        });
      }
    }
  }
  
  // ========== TREES ==========
  
  // Trees throughout the map - different types based on zone
  for (let i = 0; i < 600; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    const zoneConfig = ZONE_CONFIG[zoneType];
    
    const treeChance = zoneConfig?.treesDensity || 0.1;
    
    if (rng.next() < treeChance && !isBlockedByStructure(x, y)) {
      let treeType;
      if (zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE) {
        treeType = rng.next() < 0.4 ? ENTITY_TYPES.TREE_DEAD : ENTITY_TYPES.TREE_CORRUPTED;
      } else if (zoneType === ZONE_TYPES.DEEP_FOREST) {
        const types = [ENTITY_TYPES.TREE_PINE, ENTITY_TYPES.TREE_PINE, ENTITY_TYPES.TREE_OAK, ENTITY_TYPES.TREE_GIANT];
        treeType = types[Math.floor(rng.next() * types.length)];
      } else if (zoneType === ZONE_TYPES.FOREST) {
        const types = [ENTITY_TYPES.TREE_OAK, ENTITY_TYPES.TREE_PINE, ENTITY_TYPES.TREE_WILLOW];
        treeType = types[Math.floor(rng.next() * types.length)];
      } else {
        const types = [ENTITY_TYPES.TREE_OAK, ENTITY_TYPES.TREE_WILLOW];
        treeType = types[Math.floor(rng.next() * types.length)];
      }
      
      decorations.push({
        type: treeType,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: true,
        radius: treeType === ENTITY_TYPES.TREE_GIANT ? 24 : 16,
        zone: zoneType,
      });
    }
  }
  
  // Fallen logs and stumps
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType === ZONE_TYPES.FOREST || zoneType === ZONE_TYPES.DEEP_FOREST) {
      const type = rng.next() < 0.5 ? ENTITY_TYPES.FALLEN_LOG : ENTITY_TYPES.STUMP;
      decorations.push({
        type: type,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: type === ENTITY_TYPES.FALLEN_LOG,
        radius: type === ENTITY_TYPES.FALLEN_LOG ? 20 : 10,
        zone: zoneType,
      });
    }
  }
  
  // ========== ROCKS ==========
  
  // Rocks - more variety
  for (let i = 0; i < 120; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    const rockChance = (zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE) ? 0.8 : 
                       (zoneType === ZONE_TYPES.DEEP_FOREST) ? 0.6 : 0.4;
    
    if (rng.next() < rockChance && !isBlockedByStructure(x, y)) {
      const rockRoll = rng.next();
      let rockType;
      if (rockRoll < 0.15) {
        rockType = ENTITY_TYPES.ROCK_LARGE;
      } else if (rockRoll < 0.3) {
        rockType = ENTITY_TYPES.ROCK_PILE;
      } else if (rockRoll < 0.4 && zoneType === ZONE_TYPES.FOREST) {
        rockType = ENTITY_TYPES.ROCK_MOSS;
      } else {
        rockType = ENTITY_TYPES.ROCK;
      }
      
      decorations.push({
        type: rockType,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: true,
        radius: rockType === ENTITY_TYPES.ROCK_LARGE ? 20 : rockType === ENTITY_TYPES.ROCK_PILE ? 15 : 12,
        variant: Math.floor(rng.next() * 3),
        zone: zoneType,
      });
    }
  }
  
  // ========== VEGETATION ==========
  
  // Bushes
  for (let i = 0; i < 200; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType === ZONE_TYPES.CORRUPTED_CORE) continue;
    
    let bushType = ENTITY_TYPES.BUSH;
    if (zoneType === ZONE_TYPES.FOREST || zoneType === ZONE_TYPES.DEEP_FOREST) {
      bushType = rng.next() < 0.3 ? ENTITY_TYPES.BUSH_BERRY : ENTITY_TYPES.BUSH;
    } else if (zoneType === ZONE_TYPES.CORRUPTED) {
      bushType = ENTITY_TYPES.BUSH_THORNS;
    }
    
    decorations.push({
      type: bushType,
      x: x * config.TILE_SIZE,
      y: y * config.TILE_SIZE,
      solid: false,
      radius: 8,
      zone: zoneType,
    });
  }
  
  // Flower beds in village and forest
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType === ZONE_TYPES.VILLAGE || zoneType === ZONE_TYPES.FOREST) {
      decorations.push({
        type: ENTITY_TYPES.FLOWER_BED,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 12,
        zone: zoneType,
      });
    }
  }
  
  // Ferns in forest
  for (let i = 0; i < 50; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType === ZONE_TYPES.FOREST || zoneType === ZONE_TYPES.DEEP_FOREST) {
      decorations.push({
        type: ENTITY_TYPES.FERN,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 6,
        zone: zoneType,
      });
    }
  }
  
  // Tall grass patches
  for (let i = 0; i < 80; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType !== ZONE_TYPES.CORRUPTED_CORE) {
      decorations.push({
        type: ENTITY_TYPES.TALL_GRASS_PATCH,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 15,
        zone: zoneType,
      });
    }
  }
  
  // Mushrooms
  for (let i = 0; i < 80; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType === ZONE_TYPES.FOREST || zoneType === ZONE_TYPES.DEEP_FOREST || 
        zoneType === ZONE_TYPES.CORRUPTED) {
      const mushroomRoll = rng.next();
      let mushroomType;
      if (mushroomRoll < 0.2 && (zoneType === ZONE_TYPES.DEEP_FOREST || zoneType === ZONE_TYPES.CORRUPTED)) {
        mushroomType = ENTITY_TYPES.MUSHROOM_GLOWING;
      } else if (mushroomRoll < 0.4) {
        mushroomType = ENTITY_TYPES.MUSHROOM_CLUSTER;
      } else {
        mushroomType = ENTITY_TYPES.MUSHROOM;
      }
      
      decorations.push({
        type: mushroomType,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 4,
        zone: zoneType,
      });
    }
  }
  
  // ========== ANIMALS - PASSIVE ==========
  
  // Rabbits - common in village and forest
  for (let i = 0; i < 25; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType === ZONE_TYPES.VILLAGE || zoneType === ZONE_TYPES.FOREST) {
      decorations.push({
        type: ENTITY_TYPES.ANIMAL_RABBIT,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 8,
        zone: zoneType,
        isAnimal: true,
        passive: true,
        moveSpeed: 2,
      });
    }
  }
  
  // Deer - in forest areas
  for (let i = 0; i < 15; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType === ZONE_TYPES.FOREST || zoneType === ZONE_TYPES.DEEP_FOREST) {
      decorations.push({
        type: ENTITY_TYPES.ANIMAL_DEER,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 15,
        zone: zoneType,
        isAnimal: true,
        passive: true,
        moveSpeed: 3,
      });
    }
  }
  
  // Squirrels - in trees (forest)
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType === ZONE_TYPES.FOREST || zoneType === ZONE_TYPES.VILLAGE) {
      decorations.push({
        type: ENTITY_TYPES.ANIMAL_SQUIRREL,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 5,
        zone: zoneType,
        isAnimal: true,
        passive: true,
        moveSpeed: 2.5,
      });
    }
  }
  
  // Foxes - in deep forest
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType === ZONE_TYPES.DEEP_FOREST || zoneType === ZONE_TYPES.FOREST) {
      decorations.push({
        type: ENTITY_TYPES.ANIMAL_FOX,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 10,
        zone: zoneType,
        isAnimal: true,
        passive: true,
        moveSpeed: 2,
      });
    }
  }
  
  // Frogs - near water/ponds
  for (let i = 0; i < 15; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType !== ZONE_TYPES.CORRUPTED && zoneType !== ZONE_TYPES.CORRUPTED_CORE) {
      decorations.push({
        type: ENTITY_TYPES.ANIMAL_FROG,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 4,
        zone: zoneType,
        isAnimal: true,
        passive: true,
        moveSpeed: 1,
      });
    }
  }
  
  // Birds flying overhead (ambient)
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType !== ZONE_TYPES.CORRUPTED_CORE) {
      decorations.push({
        type: ENTITY_TYPES.ANIMAL_BIRD,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 5,
        zone: zoneType,
        isAnimal: true,
        passive: true,
        flying: true,
        moveSpeed: 4,
      });
    }
  }
  
  // Butterflies - in village and forest
  for (let i = 0; i < 25; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType === ZONE_TYPES.VILLAGE || zoneType === ZONE_TYPES.FOREST) {
      decorations.push({
        type: ENTITY_TYPES.ANIMAL_BUTTERFLY,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 3,
        zone: zoneType,
        isAnimal: true,
        passive: true,
        flying: true,
        moveSpeed: 1,
      });
    }
  }
  
  // Bird flocks (ambient effect)
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType !== ZONE_TYPES.CORRUPTED_CORE) {
      decorations.push({
        type: ENTITY_TYPES.BIRD_FLOCK,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 50,
        zone: zoneType,
      });
    }
  }
  
  // ========== ANIMALS - AGGRESSIVE ==========
  
  // Wolves - in deep forest and corrupted
  for (let i = 0; i < 10; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = 60 + rng.next() * 50;
    
    const x = Math.floor(villageCenter.x + Math.cos(angle) * dist);
    const y = Math.floor(villageCenter.y + Math.sin(angle) * dist);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType === ZONE_TYPES.DEEP_FOREST || zoneType === ZONE_TYPES.CORRUPTED) {
      decorations.push({
        type: ENTITY_TYPES.ANIMAL_WOLF,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 12,
        zone: zoneType,
        isAnimal: true,
        aggressive: true,
        damage: 8,
        health: 30,
        moveSpeed: 2.5,
      });
    }
  }
  
  // Boars - in forest
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType === ZONE_TYPES.FOREST || zoneType === ZONE_TYPES.DEEP_FOREST) {
      decorations.push({
        type: ENTITY_TYPES.ANIMAL_BOAR,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 14,
        zone: zoneType,
        isAnimal: true,
        aggressive: true,
        damage: 10,
        health: 40,
        moveSpeed: 2,
      });
    }
  }
  
  // Bears - rare, in deep forest
  for (let i = 0; i < 4; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = 80 + rng.next() * 30;
    
    const x = Math.floor(villageCenter.x + Math.cos(angle) * dist);
    const y = Math.floor(villageCenter.y + Math.sin(angle) * dist);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType === ZONE_TYPES.DEEP_FOREST) {
      decorations.push({
        type: ENTITY_TYPES.ANIMAL_BEAR,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 20,
        zone: zoneType,
        isAnimal: true,
        aggressive: true,
        damage: 20,
        health: 80,
        moveSpeed: 1.5,
      });
    }
  }
  
  // Snakes - hidden in grass
  for (let i = 0; i < 15; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType === ZONE_TYPES.FOREST || zoneType === ZONE_TYPES.DEEP_FOREST || zoneType === ZONE_TYPES.CORRUPTED) {
      decorations.push({
        type: ENTITY_TYPES.ANIMAL_SNAKE,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 6,
        zone: zoneType,
        isAnimal: true,
        aggressive: true,
        damage: 5,
        health: 15,
        moveSpeed: 1.5,
        hidden: true,
      });
    }
  }
  
  // Bats - near caves and in corrupted zones
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE || zoneType === ZONE_TYPES.DEEP_FOREST) {
      decorations.push({
        type: ENTITY_TYPES.ANIMAL_BAT,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 6,
        zone: zoneType,
        isAnimal: true,
        aggressive: true,
        damage: 3,
        health: 10,
        moveSpeed: 3,
        flying: true,
      });
    }
  }
  
  // ========== VILLAGE DECORATIONS ==========
  
  // Lamp posts near structures
  for (const structure of structures) {
    if (structure.doorX && structure.doorY) {
      decorations.push({
        type: ENTITY_TYPES.LAMP_POST,
        x: (structure.doorX + 1) * config.TILE_SIZE,
        y: (structure.doorY + 1) * config.TILE_SIZE,
        solid: true,
        radius: 6,
        light: { radius: 150, color: 0xffdd88, intensity: 0.8 },
        zone: ZONE_TYPES.VILLAGE,
      });
    }
  }
  
  // Village props
  for (let i = 0; i < 20; i++) {
    const x = villageCenter.x + Math.floor((rng.next() - 0.5) * 40);
    const y = villageCenter.y + Math.floor((rng.next() - 0.5) * 30);
    
    if (!isBlockedByStructure(x, y)) {
      const props = [ENTITY_TYPES.BARREL, ENTITY_TYPES.CRATE, ENTITY_TYPES.HAY_BALE, 
                     ENTITY_TYPES.BENCH, ENTITY_TYPES.WHEELBARROW];
      const prop = props[Math.floor(rng.next() * props.length)];
      
      decorations.push({
        type: prop,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: prop !== ENTITY_TYPES.BENCH,
        radius: 8,
        zone: ZONE_TYPES.VILLAGE,
      });
    }
  }
  
  // Scarecrows in village outskirts
  for (let i = 0; i < 5; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = 20 + rng.next() * 10;
    
    const x = Math.floor(villageCenter.x + Math.cos(angle) * dist);
    const y = Math.floor(villageCenter.y + Math.sin(angle) * dist);
    
    decorations.push({
      type: ENTITY_TYPES.SCARECROW,
      x: x * config.TILE_SIZE,
      y: y * config.TILE_SIZE,
      solid: true,
      radius: 10,
      zone: ZONE_TYPES.VILLAGE,
    });
  }
  
  // Campfires scattered around
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType !== ZONE_TYPES.CORRUPTED_CORE && !isBlockedByStructure(x, y)) {
      decorations.push({
        type: ENTITY_TYPES.CAMPFIRE,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 15,
        zone: zoneType,
        interactive: true,
        light: { radius: 80, color: 0xff6633, intensity: 0.7 },
      });
    }
  }
  
  // ========== CORRUPTED DECORATIONS ==========
  
  for (let i = 0; i < 50; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = 100 + rng.next() * 80;
    
    const x = Math.floor(villageCenter.x + Math.cos(angle) * dist);
    const y = Math.floor(villageCenter.y + Math.sin(angle) * dist);
    
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
      
      if (zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE) {
        const corruptedTypes = [
          ENTITY_TYPES.CORRUPTION_CRYSTAL,
          ENTITY_TYPES.CORRUPTION_TENDRIL,
          ENTITY_TYPES.SKULL_PILE,
          ENTITY_TYPES.DEAD_ANIMAL,
          ENTITY_TYPES.CORRUPTED_POOL,
        ];
        
        if (zoneType === ZONE_TYPES.CORRUPTED_CORE) {
          corruptedTypes.push(ENTITY_TYPES.DARK_OBELISK);
          corruptedTypes.push(ENTITY_TYPES.PORTAL_SMALL);
        }
        
        decorations.push({
          type: corruptedTypes[Math.floor(rng.next() * corruptedTypes.length)],
          x: x * config.TILE_SIZE,
          y: y * config.TILE_SIZE,
          solid: true,
          radius: 10,
          zone: zoneType,
        });
      }
    }
  }
  
  // ========== AMBIENT EFFECTS ==========
  
  // Fireflies in forest
  for (let i = 0; i < 25; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = 40 + rng.next() * 50;
    
    const x = Math.floor(villageCenter.x + Math.cos(angle) * dist);
    const y = Math.floor(villageCenter.y + Math.sin(angle) * dist);
    
    decorations.push({
      type: ENTITY_TYPES.FIREFLY_ZONE,
      x: x * config.TILE_SIZE,
      y: y * config.TILE_SIZE,
      solid: false,
      radius: 60,
      zone: ZONE_TYPES.FOREST,
    });
  }
  
  // Mist zones in deep forest
  for (let i = 0; i < 20; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = 75 + rng.next() * 30;
    
    const x = Math.floor(villageCenter.x + Math.cos(angle) * dist);
    const y = Math.floor(villageCenter.y + Math.sin(angle) * dist);
    
    decorations.push({
      type: ENTITY_TYPES.MIST_ZONE,
      x: x * config.TILE_SIZE,
      y: y * config.TILE_SIZE,
      solid: false,
      radius: 80,
      zone: ZONE_TYPES.DEEP_FOREST,
    });
  }
  
  // Leaf fall zones in forest
  for (let i = 0; i < 15; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    const zoneType = getZoneTypeAtInternal(villageCenter, x, y);
    
    if (zoneType === ZONE_TYPES.FOREST || zoneType === ZONE_TYPES.VILLAGE) {
      decorations.push({
        type: ENTITY_TYPES.LEAF_FALL_ZONE,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        solid: false,
        radius: 70,
        zone: zoneType,
      });
    }
  }
  
  // Spore zones in corrupted areas
  for (let i = 0; i < 15; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = 110 + rng.next() * 40;
    
    const x = Math.floor(villageCenter.x + Math.cos(angle) * dist);
    const y = Math.floor(villageCenter.y + Math.sin(angle) * dist);
    
    decorations.push({
      type: ENTITY_TYPES.SPORE_ZONE,
      x: x * config.TILE_SIZE,
      y: y * config.TILE_SIZE,
      solid: false,
      radius: 70,
      zone: ZONE_TYPES.CORRUPTED,
    });
  }
  
  return decorations;
}

/**
 * Internal zone type helper (doesn't depend on world object)
 */
function getZoneTypeAtInternal(villageCenter, tileX, tileY) {
  const dist = distance(tileX, tileY, villageCenter.x, villageCenter.y);
  
  if (dist < ZONE_CONFIG[ZONE_TYPES.VILLAGE].radius) {
    return ZONE_TYPES.VILLAGE;
  } else if (dist < ZONE_CONFIG[ZONE_TYPES.FOREST].radiusMax) {
    return ZONE_TYPES.FOREST;
  } else if (dist < ZONE_CONFIG[ZONE_TYPES.DEEP_FOREST].radiusMax) {
    return ZONE_TYPES.DEEP_FOREST;
  } else if (dist < ZONE_CONFIG[ZONE_TYPES.CORRUPTED].radiusMax) {
    return ZONE_TYPES.CORRUPTED;
  } else {
    return ZONE_TYPES.CORRUPTED_CORE;
  }
}

/**
 * Generate NPCs
 */
function generateNPCs(structures, villageCenter, rng) {
  const npcs = [];
  const config = OPEN_WORLD_CONFIG;
  
  // Assign NPCs to structures
  const npcAssignments = {
    [STRUCTURE_TYPES.SHOP]: ENTITY_TYPES.NPC_MERCHANT,
    [STRUCTURE_TYPES.INN]: ENTITY_TYPES.NPC_INNKEEPER,
    [STRUCTURE_TYPES.BLACKSMITH]: ENTITY_TYPES.NPC_BLACKSMITH,
  };
  
  for (const structure of structures) {
    const npcType = npcAssignments[structure.type];
    if (npcType) {
      npcs.push({
        id: `npc_${npcs.length}`,
        type: npcType,
        x: (structure.x + structure.width / 2) * config.TILE_SIZE,
        y: (structure.y + structure.height / 2) * config.TILE_SIZE,
        homeStructure: structure,
        definition: NPC_DEFINITIONS[npcType],
        dialogueIndex: 0,
        interacted: false,
      });
    }
  }
  
  // Village elder near fountain
  npcs.push({
    id: 'npc_elder',
    type: ENTITY_TYPES.NPC_ELDER,
    x: (villageCenter.x + 3) * config.TILE_SIZE,
    y: (villageCenter.y + 3) * config.TILE_SIZE,
    definition: NPC_DEFINITIONS[ENTITY_TYPES.NPC_ELDER],
    dialogueIndex: 0,
    interacted: false,
  });
  
  // Random villagers
  for (let i = 0; i < 4; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = 5 + rng.next() * 15;
    
    npcs.push({
      id: `villager_${i}`,
      type: ENTITY_TYPES.NPC_VILLAGER,
      x: (villageCenter.x + Math.cos(angle) * dist) * config.TILE_SIZE,
      y: (villageCenter.y + Math.sin(angle) * dist) * config.TILE_SIZE,
      definition: NPC_DEFINITIONS[ENTITY_TYPES.NPC_VILLAGER],
      dialogueIndex: Math.floor(rng.next() * 4),
      wandering: true,
      wanderRadius: 3,
    });
  }
  
  // Guards at village entrances
  const guardPositions = [
    { x: villageCenter.x, y: villageCenter.y - 25 },
    { x: villageCenter.x, y: villageCenter.y + 25 },
  ];
  
  for (let i = 0; i < guardPositions.length; i++) {
    npcs.push({
      id: `guard_${i}`,
      type: ENTITY_TYPES.NPC_GUARD,
      x: guardPositions[i].x * config.TILE_SIZE,
      y: guardPositions[i].y * config.TILE_SIZE,
      definition: NPC_DEFINITIONS[ENTITY_TYPES.NPC_GUARD],
      dialogueIndex: 0,
    });
  }
  
  return npcs;
}

/**
 * Generate interactable objects (chests, berries, healing items)
 */
function generateInteractables(width, height, villageCenter, rng) {
  const interactables = [];
  const config = OPEN_WORLD_CONFIG;
  
  // Chests scattered in the world (further from village)
  for (let i = 0; i < 20; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = 40 + rng.next() * 60;
    
    const x = Math.floor(villageCenter.x + Math.cos(angle) * dist);
    const y = Math.floor(villageCenter.y + Math.sin(angle) * dist);
    
    if (x >= 5 && x < width - 5 && y >= 5 && y < height - 5) {
      interactables.push({
        id: `chest_${i}`,
        type: ENTITY_TYPES.CHEST,
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        opened: false,
        loot: {
          gold: 10 + Math.floor(rng.next() * 40),
          xp: 5 + Math.floor(rng.next() * 20),
        },
      });
    }
  }
  
  // Ore deposits
  for (let i = 0; i < 12; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = 45 + rng.next() * 50;
    
    const x = Math.floor(villageCenter.x + Math.cos(angle) * dist);
    const y = Math.floor(villageCenter.y + Math.sin(angle) * dist);
    
    if (x >= 5 && x < width - 5 && y >= 5 && y < height - 5) {
      interactables.push({
        id: `ore_${i}`,
        type: 'ore_iron',
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        collected: false,
      });
    }
  }
  
  // Berry bushes (for healing)
  for (let i = 0; i < 25; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = 20 + rng.next() * 70;
    
    const x = Math.floor(villageCenter.x + Math.cos(angle) * dist);
    const y = Math.floor(villageCenter.y + Math.sin(angle) * dist);
    
    if (x >= 5 && x < width - 5 && y >= 5 && y < height - 5) {
      interactables.push({
        id: `berry_${i}`,
        type: 'berry_bush',
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        collected: false,
      });
    }
  }
  
  // Rare health flowers (permanent max HP boost)
  for (let i = 0; i < 5; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = 60 + rng.next() * 40;
    
    const x = Math.floor(villageCenter.x + Math.cos(angle) * dist);
    const y = Math.floor(villageCenter.y + Math.sin(angle) * dist);
    
    if (x >= 5 && x < width - 5 && y >= 5 && y < height - 5) {
      interactables.push({
        id: `health_flower_${i}`,
        type: 'health_flower',
        x: x * config.TILE_SIZE,
        y: y * config.TILE_SIZE,
        collected: false,
      });
    }
  }
  
  return interactables;
}

/**
 * Generate enemy spawn zones
 */
function generateEnemyZones(width, height, villageCenter) {
  const zones = [];
  const config = OPEN_WORLD_CONFIG;
  
  // Create zone grid
  const zoneSize = 20; // tiles per zone
  
  for (let zy = 0; zy < Math.ceil(height / zoneSize); zy++) {
    for (let zx = 0; zx < Math.ceil(width / zoneSize); zx++) {
      const centerX = zx * zoneSize + zoneSize / 2;
      const centerY = zy * zoneSize + zoneSize / 2;
      
      const dist = distance(centerX, centerY, villageCenter.x, villageCenter.y);
      
      let difficulty;
      if (dist < config.ZONES.SAFE) difficulty = 'safe';
      else if (dist < config.ZONES.EASY) difficulty = 'easy';
      else if (dist < config.ZONES.MEDIUM) difficulty = 'medium';
      else if (dist < config.ZONES.HARD) difficulty = 'hard';
      else difficulty = 'danger';
      
      zones.push({
        x: zx * zoneSize * config.TILE_SIZE,
        y: zy * zoneSize * config.TILE_SIZE,
        width: zoneSize * config.TILE_SIZE,
        height: zoneSize * config.TILE_SIZE,
        difficulty,
        spawnRate: config.SPAWN_RATES[difficulty.toUpperCase()] || 0,
        maxEnemies: Math.floor(config.SPAWN_RATES[difficulty.toUpperCase()] / 2) || 0,
        currentEnemies: 0,
      });
    }
  }
  
  return zones;
}

/**
 * Get zone at position
 */
export function getZoneAt(world, x, y) {
  for (const zone of world.enemySpawnZones) {
    if (x >= zone.x && x < zone.x + zone.width &&
        y >= zone.y && y < zone.y + zone.height) {
      return zone;
    }
  }
  return null;
}

/**
 * Check if position is in safe zone
 */
export function isInSafeZone(world, x, y) {
  const zone = getZoneAt(world, x, y);
  return zone && zone.difficulty === 'safe';
}

/**
 * Get enemy archetypes for difficulty
 */
export function getEnemyArchetypesForDifficulty(difficulty) {
  switch (difficulty) {
    case 'easy':
      return ['skirmisher'];
    case 'medium':
      return ['skirmisher', 'charger', 'spitter'];
    case 'hard':
      return ['charger', 'spitter', 'gunner', 'lurker'];
    case 'danger':
      return ['gunner', 'lurker', 'summoner', 'berserker'];
    default:
      return [];
  }
}

/**
 * Get zone type at a specific tile position
 */
export function getZoneTypeAt(villageCenter, tileX, tileY) {
  const dist = distance(tileX, tileY, villageCenter.x, villageCenter.y);
  
  if (dist < ZONE_CONFIG[ZONE_TYPES.VILLAGE].radius) {
    return ZONE_TYPES.VILLAGE;
  } else if (dist < ZONE_CONFIG[ZONE_TYPES.FOREST].radiusMax) {
    return ZONE_TYPES.FOREST;
  } else if (dist < ZONE_CONFIG[ZONE_TYPES.DEEP_FOREST].radiusMax) {
    return ZONE_TYPES.DEEP_FOREST;
  } else if (dist < ZONE_CONFIG[ZONE_TYPES.CORRUPTED].radiusMax) {
    return ZONE_TYPES.CORRUPTED;
  } else {
    return ZONE_TYPES.CORRUPTED_CORE;
  }
}

/**
 * Get zone configuration for rendering
 */
export function getZoneConfig(zoneType) {
  return ZONE_CONFIG[zoneType] || ZONE_CONFIG[ZONE_TYPES.VILLAGE];
}

/**
 * Get enemy spawn level for position (in tiles)
 */
export function getEnemyLevelAt(villageCenter, tileX, tileY) {
  const zoneType = getZoneTypeAt(villageCenter, tileX, tileY);
  return ZONE_CONFIG[zoneType]?.enemyLevel || 0;
}

/**
 * Check if position has corruption effects
 */
export function hasCorruptionAt(villageCenter, tileX, tileY) {
  const zoneType = getZoneTypeAt(villageCenter, tileX, tileY);
  return ZONE_CONFIG[zoneType]?.hasCorruptionVeins || false;
}

/**
 * Get lighting parameters for zone
 */
export function getZoneLighting(villageCenter, tileX, tileY) {
  const zoneType = getZoneTypeAt(villageCenter, tileX, tileY);
  const config = ZONE_CONFIG[zoneType];
  
  return {
    ambientLight: config?.ambientLight || 1.0,
    fogDensity: config?.fogDensity || 0,
    fogColor: config?.fogColor || [0, 0, 0],
  };
}

export default {
  OPEN_WORLD_CONFIG,
  WORLD_TILES,
  ZONE_TYPES,
  ZONE_CONFIG,
  STRUCTURE_TYPES,
  ENTITY_TYPES,
  NPC_DEFINITIONS,
  QUEST_DEFINITIONS,
  generateOpenWorld,
  getZoneAt,
  getZoneTypeAt,
  getZoneConfig,
  getEnemyLevelAt,
  hasCorruptionAt,
  getZoneLighting,
  isInSafeZone,
  getEnemyArchetypesForDifficulty,
};
