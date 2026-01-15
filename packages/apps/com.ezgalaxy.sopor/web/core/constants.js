/**
 * SOPOR - Core Constants
 * Global configuration values and enums
 */

export const APP_ID = "com.ezgalaxy.sopor";
export const SAVE_SCHEMA = 2; // Bumped for new features

// Tile and chunk dimensions
export const TILE_SIZE = 16;
export const CHUNK_SIZE_TILES = 24;
export const CHUNK_SIZE_PX = TILE_SIZE * CHUNK_SIZE_TILES;

// World bounds (finite world)
export const WORLD_RADIUS_PX = 2600;
export const WORLD_MIN = -WORLD_RADIUS_PX;
export const WORLD_MAX = WORLD_RADIUS_PX;
export const WORLD_MAX_CHUNK = Math.ceil(WORLD_RADIUS_PX / CHUNK_SIZE_PX);

// Dungeon dimensions
export const DUNGEON_SIZE_TILES = 96;
export const DUNGEON_SIZE_PX = DUNGEON_SIZE_TILES * TILE_SIZE;
export const DUNGEON_HALF_PX = Math.floor(DUNGEON_SIZE_PX / 2);
export const DUNGEON_MIN = -DUNGEON_HALF_PX;
export const DUNGEON_MAX = DUNGEON_HALF_PX;
export const DUNGEON_MAX_CHUNK = Math.ceil(DUNGEON_HALF_PX / CHUNK_SIZE_PX);

// Viewport
export const WORLD_VIEW_CHUNKS_RADIUS = 2;

// Player defaults
export const BASE_MOVE_SPEED = 120;
export const PLAYER_RADIUS = 7;
export const PLAYER_HP_DEFAULT = 30;
export const PLAYER_ESSENCE_DEFAULT = 28;
export const PLAYER_ESSENCE_MAX_DEFAULT = 40;

// Combat
export const COMBO_WINDOW_MS = 650;
export const COMBO_MAX_STAGE = 4; // Extended from 2 to 4
export const COMBO_DAMAGE_BONUS = 0.15; // Per stage
export const PARRY_WINDOW_MS = 200;
export const CRITICAL_HIT_CHANCE = 0.08;
export const CRITICAL_HIT_MULTIPLIER = 1.75;

// Status effects duration (ms)
export const STATUS_DURATION = {
  burn: 4000,
  freeze: 3000,
  bleed: 5000,
  stun: 1500,
  poison: 6000,
  slow: 3500,
};

// UI
export const MAX_LOG_LINES = 120;
export const AUTOSAVE_INTERVAL_MS = 9000;
export const HUD_UPDATE_INTERVAL_MS = 100;

// Strata (biomes)
export const STRATA = Object.freeze({
  JARDIN: "JARDIN",
  FORGE: "FORGE",
  ABIME: "ABIME",
  NEXUS: "NEXUS", // New 4th biome
  DUNGEON: "DUNGEON",
});

// Stratum display names (for i18n keys)
export const STRATA_I18N_KEYS = Object.freeze({
  [STRATA.JARDIN]: "strata.jardin",
  [STRATA.FORGE]: "strata.forge",
  [STRATA.ABIME]: "strata.abime",
  [STRATA.NEXUS]: "strata.nexus",
  [STRATA.DUNGEON]: "strata.dungeon",
});

// Stratum colors (accent colors for each biome)
export const STRATA_COLORS = Object.freeze({
  [STRATA.JARDIN]: { primary: 0x00ffc8, secondary: 0x40ffb0, accent: 0x00e6b4 },
  [STRATA.FORGE]: { primary: 0xffb35c, secondary: 0xff9a40, accent: 0xffa020 },
  [STRATA.ABIME]: { primary: 0xff4df2, secondary: 0xd84dff, accent: 0xc030e0 },
  [STRATA.NEXUS]: { primary: 0xffffff, secondary: 0xe0e0ff, accent: 0xb0b0ff },
  [STRATA.DUNGEON]: { primary: 0x8080a0, secondary: 0x606080, accent: 0x505070 },
});

// Tile types
export const TILE_TYPES = Object.freeze({
  FLOOR: 0,
  WALL: 1,
  VOID: 2,
  WATER: 3,
  HAZARD: 4,
  DOOR: 5,
  CHEST: 6,
  PORTAL: 7,
  SPAWN: 8,
  EXIT: 9,
});

// Weapon rarities
export const RARITY = Object.freeze({
  COMMON: "common",
  UNCOMMON: "uncommon",
  RARE: "rare",
  EPIC: "epic",
  LEGENDARY: "legendary",
});

// Rarity colors
export const RARITY_COLORS = Object.freeze({
  [RARITY.COMMON]: 0xb0b0b0,
  [RARITY.UNCOMMON]: 0x40ff80,
  [RARITY.RARE]: 0x4080ff,
  [RARITY.EPIC]: 0xc040ff,
  [RARITY.LEGENDARY]: 0xffd700,
});

// Enemy archetypes
export const ENEMY_ARCHETYPE = Object.freeze({
  SKIRMISHER: "skirmisher",
  CHARGER: "charger",
  SPITTER: "spitter",
  GUNNER: "gunner",
  LURKER: "lurker",
  SUMMONER: "summoner",
  // New archetypes
  BERSERKER: "berserker",
  SNIPER: "sniper",
  HEALER: "healer",
  TANK: "tank",
  ASSASSIN: "assassin",
  NECROMANCER: "necromancer",
});

// Skill IDs
export const SKILL = Object.freeze({
  DODGE: "dodge",
  DASH: "dash",
  SHOCKWAVE: "shockwave",
  PARRY: "parry", // New
});

// Skill cooldowns (ms)
export const SKILL_COOLDOWNS = Object.freeze({
  [SKILL.DODGE]: 800,
  [SKILL.DASH]: 2400,
  [SKILL.SHOCKWAVE]: 5500,
  [SKILL.PARRY]: 400,
});

// Progression
export const SKILL_TREE_BRANCHES = Object.freeze({
  EVEIL: "eveil",
  COMBAT: "combat",
  ESSENCE: "essence",
});

// Audio
export const AUDIO_DEFAULT_VOLUME = 0.35;
export const AUDIO_SFX_VOLUME = 0.5;

// Animation frames
export const ANIMATION_FRAMES = Object.freeze({
  IDLE: 4,
  WALK: 6,
  ATTACK: 4,
  HURT: 2,
  DEATH: 4,
});

// Touch controls
export const TOUCH_JOYSTICK_RADIUS = 50;
export const TOUCH_BUTTON_SIZE = 56;
export const TOUCH_DEAD_ZONE = 0.15;

// Mobile breakpoints
export const BREAKPOINTS = Object.freeze({
  DESKTOP: 1200,
  TABLET: 980,
  MOBILE_LANDSCAPE: 768,
  MOBILE_PORTRAIT: 480,
});

// Equipment slots
export const EQUIPMENT_SLOTS = Object.freeze({
  WEAPON: "weapon",
  ARMOR: "armor",
  ACCESSORY: "accessory",
  ACCESSORY_1: "accessory_1",
  ACCESSORY_2: "accessory_2",
  CONSUMABLE: "consumable",
});

// Game states
export const GAME_STATE = Object.freeze({
  LOADING: "loading",
  MENU: "menu",
  PLAYING: "playing",
  PAUSED: "paused",
  DIALOGUE: "dialogue",
  INVENTORY: "inventory",
  DEAD: "dead",
  CUTSCENE: "cutscene",
});

// Status effects
export const STATUS_EFFECTS = Object.freeze({
  BURN: "burn",
  FREEZE: "freeze",
  BLEED: "bleed",
  STUN: "stun",
  POISON: "poison",
  SLOW: "slow",
});

// Skills tree definition
export const SKILLS = Object.freeze({
  // Eveil branch
  MEDITATION: {
    id: "meditation",
    branch: "eveil",
    icon: "🧘",
    cost: 1,
    prereqs: [],
  },
  INNER_SIGHT: {
    id: "inner_sight",
    branch: "eveil",
    icon: "👁",
    cost: 1,
    prereqs: ["meditation"],
  },
  ESSENCE_REGEN: {
    id: "essence_regen",
    branch: "eveil",
    icon: "✨",
    cost: 2,
    prereqs: ["inner_sight"],
  },
  AWAKENING: {
    id: "awakening",
    branch: "eveil",
    icon: "🌟",
    cost: 3,
    prereqs: ["essence_regen"],
  },
  
  // Combat branch
  POWER_STRIKE: {
    id: "power_strike",
    branch: "combat",
    icon: "⚔",
    cost: 1,
    prereqs: [],
  },
  COMBO_MASTER: {
    id: "combo_master",
    branch: "combat",
    icon: "💥",
    cost: 1,
    prereqs: ["power_strike"],
  },
  CRITICAL_FOCUS: {
    id: "critical_focus",
    branch: "combat",
    icon: "🎯",
    cost: 2,
    prereqs: ["combo_master"],
  },
  BERSERKER: {
    id: "berserker",
    branch: "combat",
    icon: "😤",
    cost: 3,
    prereqs: ["critical_focus"],
  },
  
  // Essence branch
  ESSENCE_BOLT: {
    id: "essence_bolt",
    branch: "essence",
    icon: "⚡",
    cost: 1,
    prereqs: [],
  },
  ESSENCE_SHIELD: {
    id: "essence_shield",
    branch: "essence",
    icon: "🛡",
    cost: 1,
    prereqs: ["essence_bolt"],
  },
  ESSENCE_NOVA: {
    id: "essence_nova",
    branch: "essence",
    icon: "💫",
    cost: 2,
    prereqs: ["essence_shield"],
  },
  ESSENCE_MASTERY: {
    id: "essence_mastery",
    branch: "essence",
    icon: "🔮",
    cost: 3,
    prereqs: ["essence_nova"],
  },
});
