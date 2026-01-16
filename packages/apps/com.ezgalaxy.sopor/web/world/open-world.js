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
  // Decorations
  TREE_OAK: 'tree_oak',
  TREE_PINE: 'tree_pine',
  TREE_WILLOW: 'tree_willow',
  BUSH: 'bush',
  ROCK: 'rock',
  FLOWER_BED: 'flower_bed',
  LAMP_POST: 'lamp_post',
  FENCE: 'fence',
  SIGN: 'sign',
  BARREL: 'barrel',
  CRATE: 'crate',
  
  // Interactive
  CHEST: 'chest',
  DOOR: 'door',
  
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
 * Generate village structures
 */
function generateStructures(center, villageConfig, rng) {
  const structures = [];
  
  // Structure templates
  const templates = [
    { type: STRUCTURE_TYPES.HOUSE, width: 5, height: 4, count: 4 },
    { type: STRUCTURE_TYPES.SHOP, width: 6, height: 5, count: 1 },
    { type: STRUCTURE_TYPES.INN, width: 7, height: 6, count: 1 },
    { type: STRUCTURE_TYPES.BLACKSMITH, width: 5, height: 5, count: 1 },
    { type: STRUCTURE_TYPES.WELL, width: 2, height: 2, count: 1 },
  ];
  
  // Place central well/fountain
  structures.push({
    type: STRUCTURE_TYPES.FOUNTAIN,
    x: center.x - 1,
    y: center.y - 1,
    width: 3,
    height: 3,
  });
  
  // Place structures in a rough circle around center
  let angle = rng.next() * Math.PI * 2;
  
  for (const template of templates) {
    for (let i = 0; i < template.count; i++) {
      const dist = 8 + rng.next() * 12;
      const posX = Math.floor(center.x + Math.cos(angle) * dist - template.width / 2);
      const posY = Math.floor(center.y + Math.sin(angle) * dist - template.height / 2);
      
      // Check for overlap
      let overlaps = false;
      for (const existing of structures) {
        if (structuresOverlap(
          { x: posX, y: posY, width: template.width, height: template.height },
          existing,
          2
        )) {
          overlaps = true;
          break;
        }
      }
      
      if (!overlaps) {
        structures.push({
          type: template.type,
          x: posX,
          y: posY,
          width: template.width,
          height: template.height,
          doorX: posX + Math.floor(template.width / 2),
          doorY: posY + template.height,
        });
      }
      
      angle += (Math.PI * 2 / 8) + rng.next() * 0.5;
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
 * Generate decoration entities
 */
function generateDecorations(width, height, villageCenter, structures, rng) {
  const decorations = [];
  const config = OPEN_WORLD_CONFIG;
  
  // Trees throughout the map
  for (let i = 0; i < 300; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    
    // Distance from village
    const dist = distance(x, y, villageCenter.x, villageCenter.y);
    
    // More trees further from village
    const treeChance = dist < 15 ? 0.1 : dist < 30 ? 0.3 : 0.6;
    
    if (rng.next() < treeChance) {
      // Don't place on structures
      let blocked = false;
      for (const s of structures) {
        if (x >= s.x - 2 && x <= s.x + s.width + 2 &&
            y >= s.y - 2 && y <= s.y + s.height + 2) {
          blocked = true;
          break;
        }
      }
      
      if (!blocked) {
        const treeTypes = [ENTITY_TYPES.TREE_OAK, ENTITY_TYPES.TREE_PINE, ENTITY_TYPES.TREE_WILLOW];
        decorations.push({
          type: treeTypes[Math.floor(rng.next() * treeTypes.length)],
          x: x * config.TILE_SIZE,
          y: y * config.TILE_SIZE,
          solid: true,
          radius: 16,
        });
      }
    }
  }
  
  // Rocks
  for (let i = 0; i < 50; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    
    decorations.push({
      type: ENTITY_TYPES.ROCK,
      x: x * config.TILE_SIZE,
      y: y * config.TILE_SIZE,
      solid: true,
      radius: 12,
      variant: Math.floor(rng.next() * 3),
    });
  }
  
  // Bushes
  for (let i = 0; i < 100; i++) {
    const x = Math.floor(rng.next() * width);
    const y = Math.floor(rng.next() * height);
    
    decorations.push({
      type: ENTITY_TYPES.BUSH,
      x: x * config.TILE_SIZE,
      y: y * config.TILE_SIZE,
      solid: false,
      radius: 8,
    });
  }
  
  // Lamp posts in village
  for (const structure of structures) {
    if (structure.doorX && structure.doorY) {
      decorations.push({
        type: ENTITY_TYPES.LAMP_POST,
        x: (structure.doorX + 1) * config.TILE_SIZE,
        y: (structure.doorY + 1) * config.TILE_SIZE,
        solid: true,
        radius: 6,
        light: { radius: 150, color: 0xffdd88, intensity: 0.8 },
      });
    }
  }
  
  return decorations;
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
 * Generate interactable objects
 */
function generateInteractables(width, height, villageCenter, rng) {
  const interactables = [];
  const config = OPEN_WORLD_CONFIG;
  
  // Chests scattered in the world (further from village)
  for (let i = 0; i < 15; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = 40 + rng.next() * 50;
    
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
          gold: 10 + Math.floor(rng.next() * 30),
          xp: 5 + Math.floor(rng.next() * 15),
        },
      });
    }
  }
  
  // Ore deposits
  for (let i = 0; i < 8; i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = 50 + rng.next() * 40;
    
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

export default {
  OPEN_WORLD_CONFIG,
  WORLD_TILES,
  STRUCTURE_TYPES,
  ENTITY_TYPES,
  NPC_DEFINITIONS,
  QUEST_DEFINITIONS,
  generateOpenWorld,
  getZoneAt,
  isInSafeZone,
  getEnemyArchetypesForDifficulty,
};
