/**
 * SOPOR - Save System
 * Handles persistence with localStorage, schema versioning and migration
 */

import { APP_ID, SAVE_SCHEMA, PLAYER_HP_DEFAULT, PLAYER_ESSENCE_DEFAULT, PLAYER_ESSENCE_MAX_DEFAULT } from './constants.js';
import { hash32, safeJsonParse, cloneDeep } from './utils.js';

// Re-export constants for compatibility
export const SAVE_KEY = `ezg:${APP_ID}:save`;
export const SAVE_VERSION = SAVE_SCHEMA;

// ========== Storage Availability Check ==========

/**
 * Check if localStorage is available
 * @returns {boolean}
 */
function isStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

// Cache the result
const storageAvailable = isStorageAvailable();

/**
 * Safe localStorage getter
 * @param {string} key 
 * @returns {string|null}
 */
function safeGetItem(key) {
  if (!storageAvailable) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safe localStorage setter
 * @param {string} key 
 * @param {string} value 
 * @returns {boolean}
 */
function safeSetItem(key, value) {
  if (!storageAvailable) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe localStorage remover
 * @param {string} key 
 */
function safeRemoveItem(key) {
  if (!storageAvailable) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

// ========== Key Generation ==========

/**
 * Generate save key for a username
 * @param {string} usernameNorm - Normalized username
 * @returns {string}
 */
export function saveKeyForUsernameNorm(usernameNorm) {
  return `ezg:${APP_ID}:save:v${SAVE_SCHEMA}:${usernameNorm}`;
}

/**
 * Get settings key
 * @returns {string}
 */
export function settingsKey() {
  return `ezg:${APP_ID}:settings:v${SAVE_SCHEMA}`;
}

/**
 * Get progression key for a username
 * @param {string} usernameNorm 
 * @returns {string}
 */
export function progressionKey(usernameNorm) {
  return `ezg:${APP_ID}:progression:v${SAVE_SCHEMA}:${usernameNorm}`;
}

// ========== Default State Factories ==========

/**
 * Create default world state for a new game
 * @param {string} [usernameNorm] - Normalized username (defaults to 'player')
 * @returns {object}
 */
export function defaultWorldState(usernameNorm = 'player') {
  const seed = hash32(usernameNorm);
  return {
    schema: SAVE_SCHEMA,
    usernameNorm,
    seed,
    createdAt: new Date().toISOString(),
    lastSavedAt: null,
    story: {
      globalMilestones: 0,
      stage: 0,
      completedBosses: [],
      unlockedBiomes: ['JARDIN'],
      ending: null,
      loreFound: [],
    },
    player: {
      id: "player",
      x: 0,
      y: 0,
      hp: PLAYER_HP_DEFAULT,
      hpMax: PLAYER_HP_DEFAULT,
      essence: PLAYER_ESSENCE_DEFAULT,
      essenceMax: PLAYER_ESSENCE_MAX_DEFAULT,
      pale: false,
      weaponId: "sword_neon",
      level: 1,
      xp: 0,
      xpToNext: 100,
      skillPoints: 0,
      inventory: {
        essence: PLAYER_ESSENCE_DEFAULT,
        items: [],
        weapons: ["sword_neon", "bow_arc", "slingshot_pocket"],
      },
      equipment: {
        armor: null,
        accessory: null,
        relic: null,
      },
      skills: {
        // Skill tree unlocks
        eveil: {},
        combat: {},
        essence: {},
      },
      statusEffects: [],
    },
    world: {
      chunks: {},
      dungeon: {
        inDungeon: false,
        seed: 0,
        returnPos: { x: 0, y: 0 },
        opened: {},
        lastEntrance: null,
        completedDungeons: [],
      },
      quest: {
        id: "stability_collab_1",
        stepIndex: 0,
        steps: [
          { kind: "collect", required: 12, progress: 0 },
          { kind: "protect", requiredSeconds: 30, progressSeconds: 0, workersAlive: 0, workersMax: 2 },
          { kind: "repair", required: 40, progress: 0 },
        ],
        communityProgress: 0,
        communityRequired: 100,
        playerContribution: 0,
        lastTickAt: Date.now(),
        activeSite: { x: 180, y: 120, kind: "lighthouse" },
        completedCount: 0,
      },
      discoveredSecrets: [],
      triggeredEvents: [],
    },
    stats: {
      totalPlayTime: 0,
      enemiesKilled: 0,
      bossesKilled: 0,
      deathCount: 0,
      damageDealt: 0,
      damageTaken: 0,
      essenceCollected: 0,
      chestsOpened: 0,
      dungeonsCompleted: 0,
    },
  };
}

/**
 * Create default settings
 * @returns {object}
 */
export function defaultSettings() {
  return {
    volume: 0.35,
    sfxVolume: 0.5,
    muted: false,
    locale: 'fr',
    showTouchControls: 'auto', // 'auto', 'always', 'never'
    screenShake: true,
    showDamageNumbers: true,
    autoAim: true, // For mobile
    tutorialComplete: false,
  };
}

// ========== Migration ==========

/**
 * Migrate world state from older schema versions
 * @param {object} state 
 * @returns {object}
 */
export function migrateWorldState(state) {
  try {
    if (!state || typeof state !== "object") return state;
    
    // Migrate from schema 1 to 2
    if (state.schema === 1) {
      state = migrateV1ToV2(state);
    }
    
    // Ensure all required fields exist
    state = ensureRequiredFields(state);
    
    return state;
  } catch (e) {
    console.error('Migration failed:', e);
    return state;
  }
}

/**
 * Migrate from schema version 1 to 2
 * @param {object} state 
 * @returns {object}
 */
function migrateV1ToV2(state) {
  const migrated = cloneDeep(state);
  migrated.schema = 2;
  
  // Add new story fields
  if (!migrated.story) migrated.story = {};
  if (!migrated.story.completedBosses) migrated.story.completedBosses = [];
  if (!migrated.story.unlockedBiomes) migrated.story.unlockedBiomes = ['JARDIN'];
  if (!migrated.story.ending) migrated.story.ending = null;
  if (!migrated.story.loreFound) migrated.story.loreFound = [];
  
  // Add new player fields
  if (!migrated.player) migrated.player = {};
  if (!migrated.player.level) migrated.player.level = 1;
  if (!migrated.player.xp) migrated.player.xp = 0;
  if (!migrated.player.xpToNext) migrated.player.xpToNext = 100;
  if (!migrated.player.skillPoints) migrated.player.skillPoints = 0;
  if (!migrated.player.equipment) {
    migrated.player.equipment = { armor: null, accessory: null, relic: null };
  }
  if (!migrated.player.skills) {
    migrated.player.skills = { eveil: {}, combat: {}, essence: {} };
  }
  if (!migrated.player.statusEffects) migrated.player.statusEffects = [];
  
  // Add stats
  if (!migrated.stats) {
    migrated.stats = {
      totalPlayTime: 0,
      enemiesKilled: 0,
      bossesKilled: 0,
      deathCount: 0,
      damageDealt: 0,
      damageTaken: 0,
      essenceCollected: 0,
      chestsOpened: 0,
      dungeonsCompleted: 0,
    };
  }
  
  // Add dungeon completion tracking
  if (migrated.world?.dungeon && !migrated.world.dungeon.completedDungeons) {
    migrated.world.dungeon.completedDungeons = [];
  }
  
  // Add secrets and events
  if (migrated.world && !migrated.world.discoveredSecrets) {
    migrated.world.discoveredSecrets = [];
  }
  if (migrated.world && !migrated.world.triggeredEvents) {
    migrated.world.triggeredEvents = [];
  }
  
  return migrated;
}

/**
 * Ensure all required fields exist in state
 * @param {object} state 
 * @returns {object}
 */
function ensureRequiredFields(state) {
  if (!state.world) state.world = {};
  
  // World quest fields
  if (!state.world.quest || typeof state.world.quest !== "object") {
    state.world.quest = defaultWorldState(state.usernameNorm ?? "player").world.quest;
  } else {
    const q = state.world.quest;
    const baseQuest = defaultWorldState(state.usernameNorm ?? "player").world.quest;
    
    if (!Array.isArray(q.steps)) {
      const migrated = cloneDeep(baseQuest);
      migrated.communityProgress = Number(q.communityProgress ?? q.progress ?? 0) || 0;
      migrated.communityRequired = Number(q.communityRequired ?? q.required ?? baseQuest.communityRequired) || baseQuest.communityRequired;
      migrated.playerContribution = Number(q.playerContribution ?? 0) || 0;
      migrated.lastTickAt = Number(q.lastTickAt ?? Date.now()) || Date.now();
      migrated.completedCount = Number(q.completedCount ?? 0) || 0;
      state.world.quest = migrated;
    } else {
      if (typeof q.stepIndex !== "number") q.stepIndex = 0;
      if (typeof q.communityProgress !== "number") q.communityProgress = 0;
      if (typeof q.communityRequired !== "number") q.communityRequired = baseQuest.communityRequired;
      if (typeof q.playerContribution !== "number") q.playerContribution = 0;
      if (typeof q.lastTickAt !== "number") q.lastTickAt = Date.now();
      if (!q.activeSite) q.activeSite = cloneDeep(baseQuest.activeSite);
      if (typeof q.completedCount !== "number") q.completedCount = 0;
      
      for (const step of q.steps) {
        if (!step || typeof step !== "object") continue;
        if (step.kind === "collect") {
          if (typeof step.progress !== "number") step.progress = 0;
          if (typeof step.required !== "number") step.required = 12;
        }
        if (step.kind === "repair") {
          if (typeof step.progress !== "number") step.progress = 0;
          if (typeof step.required !== "number") step.required = 40;
        }
        if (step.kind === "protect") {
          if (typeof step.progressSeconds !== "number") step.progressSeconds = 0;
          if (typeof step.requiredSeconds !== "number") step.requiredSeconds = 30;
          if (typeof step.workersAlive !== "number") step.workersAlive = 0;
          if (typeof step.workersMax !== "number") step.workersMax = 2;
        }
      }
    }
  }
  
  // Dungeon fields
  if (!state.world.dungeon || typeof state.world.dungeon !== "object") {
    state.world.dungeon = {
      inDungeon: false,
      seed: 0,
      returnPos: { x: 0, y: 0 },
      opened: {},
      lastEntrance: null,
      completedDungeons: [],
    };
  } else {
    const d = state.world.dungeon;
    if (typeof d.inDungeon !== "boolean") d.inDungeon = false;
    if (typeof d.seed !== "number") d.seed = 0;
    if (!d.returnPos) d.returnPos = { x: 0, y: 0 };
    if (typeof d.returnPos.x !== "number") d.returnPos.x = 0;
    if (typeof d.returnPos.y !== "number") d.returnPos.y = 0;
    if (!d.opened || typeof d.opened !== "object") d.opened = {};
    if (!("lastEntrance" in d)) d.lastEntrance = null;
    if (!Array.isArray(d.completedDungeons)) d.completedDungeons = [];
  }
  
  return state;
}

// ========== Load / Save Operations ==========

/**
 * Load save from localStorage
 * @param {string} usernameNorm - Normalized username
 * @returns {object|null}
 */
export function loadSave(usernameNorm) {
  const key = saveKeyForUsernameNorm(usernameNorm);
  const raw = safeGetItem(key);
  
  if (!raw) {
    // Try loading from older schema
    const oldKey = `ezg:${APP_ID}:save:v1:${usernameNorm}`;
    const oldRaw = safeGetItem(oldKey);
    if (oldRaw) {
      const parsed = safeJsonParse(oldRaw, null);
      if (parsed) {
        const migrated = migrateWorldState(parsed);
        // Save migrated data to new key
        saveWorld(migrated);
        return migrated;
      }
    }
    return null;
  }
  
  const parsed = safeJsonParse(raw, null);
  if (!parsed || typeof parsed !== "object") return null;
  
  return migrateWorldState(parsed);
}

/**
 * Save world state to localStorage
 * @param {object} state 
 * @returns {object} - Updated state with lastSavedAt
 */
export function saveWorld(state) {
  const copy = cloneDeep(state);
  copy.lastSavedAt = new Date().toISOString();
  
  if (!storageAvailable) {
    console.warn('localStorage not available, save skipped');
    return copy;
  }
  
  try {
    localStorage.setItem(saveKeyForUsernameNorm(state.usernameNorm), JSON.stringify(copy));
  } catch (e) {
    console.error('Failed to save:', e);
    // Possibly localStorage is full
    if (e.name === 'QuotaExceededError') {
      // Try to clear old data
      cleanupOldSaves();
      try {
        localStorage.setItem(saveKeyForUsernameNorm(state.usernameNorm), JSON.stringify(copy));
      } catch {
        // Still failed, notify user
        console.error('Storage full');
      }
    }
  }
  
  return copy;
}

/**
 * Delete save for a username
 * @param {string} usernameNorm 
 */
export function deleteSave(usernameNorm) {
  safeRemoveItem(saveKeyForUsernameNorm(usernameNorm));
  safeRemoveItem(progressionKey(usernameNorm));
}

/**
 * Check if save exists for username
 * @param {string} usernameNorm 
 * @returns {boolean}
 */
export function hasSave(usernameNorm) {
  return safeGetItem(saveKeyForUsernameNorm(usernameNorm)) !== null;
}

// ========== Settings Operations ==========

/**
 * Load settings from localStorage
 * @returns {object}
 */
export function loadSettings() {
  const raw = safeGetItem(settingsKey());
  const saved = safeJsonParse(raw ?? "", null);
  const defaults = defaultSettings();
  
  if (!saved) return defaults;
  
  // Merge with defaults to ensure all fields exist
  return { ...defaults, ...saved };
}

/**
 * Save settings to localStorage
 * @param {object} settings 
 */
export function saveSettings(settings) {
  safeSetItem(settingsKey(), JSON.stringify(settings));
}

/**
 * Update a single setting
 * @param {string} key 
 * @param {any} value 
 */
export function updateSetting(key, value) {
  const settings = loadSettings();
  settings[key] = value;
  saveSettings(settings);
}

// ========== Utility Functions ==========

/**
 * Get all saved usernames
 * @returns {string[]}
 */
export function getAllSavedUsernames() {
  if (!storageAvailable) return [];
  
  const prefix = `ezg:${APP_ID}:save:v${SAVE_SCHEMA}:`;
  const usernames = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const username = key.slice(prefix.length);
        usernames.push(username);
      }
    }
  } catch (e) {
    console.warn('Failed to enumerate saves:', e);
  }
  
  return usernames;
}

/**
 * Cleanup old saves (from older schema versions)
 */
export function cleanupOldSaves() {
  if (!storageAvailable) return;
  
  const oldPrefixes = [
    `ezg:${APP_ID}:save:v1:`,
  ];
  
  const keysToRemove = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        for (const prefix of oldPrefixes) {
          if (key.startsWith(prefix)) {
            keysToRemove.push(key);
            break;
          }
        }
      }
    }
    
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn('Failed to cleanup old saves:', e);
  }
  
  return keysToRemove.length;
}

/**
 * Export save data as JSON string (for backup)
 * @param {string} usernameNorm 
 * @returns {string|null}
 */
export function exportSave(usernameNorm) {
  const state = loadSave(usernameNorm);
  if (!state) return null;
  return JSON.stringify(state, null, 2);
}

/**
 * Import save data from JSON string
 * @param {string} jsonString 
 * @returns {object|null}
 */
export function importSave(jsonString) {
  const parsed = safeJsonParse(jsonString, null);
  if (!parsed || typeof parsed !== "object" || !parsed.usernameNorm) {
    return null;
  }
  
  const migrated = migrateWorldState(parsed);
  saveWorld(migrated);
  return migrated;
}

/**
 * Calculate save file size in bytes
 * @param {string} usernameNorm 
 * @returns {number}
 */
export function getSaveSize(usernameNorm) {
  const raw = safeGetItem(saveKeyForUsernameNorm(usernameNorm));
  if (!raw) return 0;
  return new Blob([raw]).size;
}

/**
 * Get total localStorage usage
 * @returns {{used: number, total: number, percent: number}}
 */
export function getStorageUsage() {
  if (!storageAvailable) {
    return { used: 0, total: 0, percent: 0 };
  }
  
  let used = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        used += key.length + (localStorage.getItem(key)?.length || 0);
      }
    }
  } catch (e) {
    console.warn('Failed to calculate storage usage:', e);
  }
  
  // localStorage typically has 5MB limit
  const total = 5 * 1024 * 1024;
  
  return {
    used,
    total,
    percent: (used / total) * 100,
  };
}
