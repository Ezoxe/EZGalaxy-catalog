/**
 * SOPOR - Core Utilities
 * Helper functions used across the game
 */

import { 
  WORLD_MIN, WORLD_MAX, 
  DUNGEON_MIN, DUNGEON_MAX,
  WORLD_MAX_CHUNK, DUNGEON_MAX_CHUNK 
} from './constants.js';

// ========== Math utilities ==========

/**
 * Clamp a value between min and max
 * @param {number} v - Value to clamp
 * @param {number} a - Minimum
 * @param {number} b - Maximum
 * @returns {number}
 */
export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Smooth interpolation (ease in-out)
 * @param {number} t - Input (0-1)
 * @returns {number}
 */
export function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/**
 * Distance between two points
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 * @returns {number}
 */
export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Angle between two points (radians)
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 * @returns {number}
 */
export function angle(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Normalize angle to [-PI, PI]
 * @param {number} a - Angle in radians
 * @returns {number}
 */
export function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Convert degrees to radians
 * @param {number} deg 
 * @returns {number}
 */
export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 * @param {number} rad 
 * @returns {number}
 */
export function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

// ========== World coordinate utilities ==========

export function clampWorldX(x) {
  return clamp(x, WORLD_MIN + 16, WORLD_MAX - 16);
}

export function clampWorldY(y) {
  return clamp(y, WORLD_MIN + 16, WORLD_MAX - 16);
}

export function clampDungeonX(x) {
  return clamp(x, DUNGEON_MIN + 16, DUNGEON_MAX - 16);
}

export function clampDungeonY(y) {
  return clamp(y, DUNGEON_MIN + 16, DUNGEON_MAX - 16);
}

export function isChunkInWorld(cx, cy) {
  return cx >= -WORLD_MAX_CHUNK && cx <= WORLD_MAX_CHUNK && 
         cy >= -WORLD_MAX_CHUNK && cy <= WORLD_MAX_CHUNK;
}

export function isChunkInDungeon(cx, cy) {
  return cx >= -DUNGEON_MAX_CHUNK && cx <= DUNGEON_MAX_CHUNK && 
         cy >= -DUNGEON_MAX_CHUNK && cy <= DUNGEON_MAX_CHUNK;
}

/**
 * Generate a chunk key string from coordinates
 * @param {number} cx - Chunk X
 * @param {number} cy - Chunk Y
 * @returns {string}
 */
export function chunkKey(cx, cy) {
  return `${cx},${cy}`;
}

/**
 * Parse chunk key to coordinates
 * @param {string} key 
 * @returns {{cx: number, cy: number}}
 */
export function parseChunkKey(key) {
  const [cx, cy] = key.split(',').map(Number);
  return { cx, cy };
}

// ========== Random number generation ==========

/**
 * FNV-1a 32-bit hash
 * @param {string} str 
 * @returns {number}
 */
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Create a seeded RNG using xorshift32
 * @param {number} seed32 
 * @returns {RNG}
 */
export function makeRng(seed32) {
  let s = seed32 >>> 0;
  if (s === 0) s = 1; // Prevent zero seed
  
  return {
    /** Get next random float [0, 1) */
    next() {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 0xffffffff;
    },
    /** Get next random integer [0, maxExclusive) */
    nextInt(maxExclusive) {
      return Math.floor(this.next() * maxExclusive);
    },
    /** Get next random float in range [min, max) */
    nextRange(min, max) {
      return min + this.next() * (max - min);
    },
    /** Get next random boolean with given probability */
    nextBool(probability = 0.5) {
      return this.next() < probability;
    },
    /** Pick random element from array */
    pick(arr) {
      if (!arr || arr.length === 0) return null;
      return arr[this.nextInt(arr.length)];
    },
    /** Shuffle array in place */
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = this.nextInt(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    /** Fork RNG with additional seed */
    fork(extra) {
      return makeRng((s ^ extra) >>> 0);
    },
    /** Get current seed state */
    getSeed() {
      return s;
    },
  };
}

// ========== String utilities ==========

/**
 * Normalize username for consistent identification
 * @param {string} input 
 * @returns {string}
 */
export function normalizeUsername(input) {
  const trimmed = String(input ?? "").trim();
  const lower = trimmed.toLowerCase();
  const noDiacritics = lower.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const collapsed = noDiacritics.replace(/\s+/g, " ");
  return collapsed;
}

/**
 * Escape HTML special characters
 * @param {string} text 
 * @returns {string}
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format number with fixed decimals
 * @param {number} n 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatNumber(n, decimals = 1) {
  return Number(n).toFixed(decimals);
}

/**
 * Format time in seconds to MM:SS
 * @param {number} seconds 
 * @returns {string}
 */
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ========== Object utilities ==========

/**
 * Safe JSON parse with fallback
 * @param {string} text 
 * @param {any} fallback 
 * @returns {any}
 */
export function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/**
 * Deep clone an object
 * @param {any} obj 
 * @returns {any}
 */
export function cloneDeep(obj) {
  try {
    if (typeof structuredClone === "function") return structuredClone(obj);
  } catch {
    // Fallback
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if object is empty
 * @param {object} obj 
 * @returns {boolean}
 */
export function isEmpty(obj) {
  return obj === null || obj === undefined || Object.keys(obj).length === 0;
}

// ========== Timing utilities ==========

/**
 * Get current time in milliseconds (high precision)
 * @returns {number}
 */
export function nowMs() {
  return performance.now();
}

/**
 * Debounce function
 * @param {Function} fn 
 * @param {number} delayMs 
 * @returns {Function}
 */
export function debounce(fn, delayMs) {
  let timeoutId = null;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delayMs);
  };
}

/**
 * Throttle function
 * @param {Function} fn 
 * @param {number} limitMs 
 * @returns {Function}
 */
export function throttle(fn, limitMs) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= limitMs) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

// ========== Geometry utilities ==========

/**
 * Point-to-segment distance
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} ax - Segment start X
 * @param {number} ay - Segment start Y
 * @param {number} bx - Segment end X
 * @param {number} by - Segment end Y
 * @returns {number}
 */
export function pointSegDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 <= 1e-6) return Math.hypot(apx, apy);
  let t = (apx * abx + apy * aby) / ab2;
  t = clamp(t, 0, 1);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

/**
 * Check if point is in rectangle
 * @param {number} px 
 * @param {number} py 
 * @param {number} rx 
 * @param {number} ry 
 * @param {number} rw 
 * @param {number} rh 
 * @returns {boolean}
 */
export function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * Check if point is in circle
 * @param {number} px 
 * @param {number} py 
 * @param {number} cx 
 * @param {number} cy 
 * @param {number} r 
 * @returns {boolean}
 */
export function pointInCircle(px, py, cx, cy, r) {
  return distance(px, py, cx, cy) <= r;
}

/**
 * Check if two circles overlap
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} r1 
 * @param {number} x2 
 * @param {number} y2 
 * @param {number} r2 
 * @returns {boolean}
 */
export function circlesOverlap(x1, y1, r1, x2, y2, r2) {
  return distance(x1, y1, x2, y2) <= r1 + r2;
}

// ========== Array utilities ==========

/**
 * Remove item from array in place
 * @param {Array} arr 
 * @param {any} item 
 * @returns {boolean} - True if removed
 */
export function removeFromArray(arr, item) {
  const idx = arr.indexOf(item);
  if (idx >= 0) {
    arr.splice(idx, 1);
    return true;
  }
  return false;
}

/**
 * Find minimum element by key function
 * @param {Array} arr 
 * @param {Function} keyFn 
 * @returns {any}
 */
export function minBy(arr, keyFn) {
  if (!arr || arr.length === 0) return null;
  let min = arr[0];
  let minVal = keyFn(min);
  for (let i = 1; i < arr.length; i++) {
    const val = keyFn(arr[i]);
    if (val < minVal) {
      min = arr[i];
      minVal = val;
    }
  }
  return min;
}

/**
 * Find maximum element by key function
 * @param {Array} arr 
 * @param {Function} keyFn 
 * @returns {any}
 */
export function maxBy(arr, keyFn) {
  if (!arr || arr.length === 0) return null;
  let max = arr[0];
  let maxVal = keyFn(max);
  for (let i = 1; i < arr.length; i++) {
    const val = keyFn(arr[i]);
    if (val > maxVal) {
      max = arr[i];
      maxVal = val;
    }
  }
  return max;
}

// ========== Color utilities ==========

/**
 * Convert hex color to RGB
 * @param {number} hex 
 * @returns {{r: number, g: number, b: number}}
 */
export function hexToRgb(hex) {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff,
  };
}

/**
 * Convert RGB to hex
 * @param {number} r 
 * @param {number} g 
 * @param {number} b 
 * @returns {number}
 */
export function rgbToHex(r, g, b) {
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

/**
 * Interpolate between two colors
 * @param {number} colorA - Hex color
 * @param {number} colorB - Hex color
 * @param {number} t - Interpolation (0-1)
 * @returns {number}
 */
export function lerpColor(colorA, colorB, t) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  return rgbToHex(
    Math.round(lerp(a.r, b.r, t)),
    Math.round(lerp(a.g, b.g, t)),
    Math.round(lerp(a.b, b.b, t))
  );
}

/**
 * Convert hex to CSS rgba string
 * @param {number} hex 
 * @param {number} alpha 
 * @returns {string}
 */
export function hexToRgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ========== Inventory utilities ==========

/**
 * Add item to player inventory
 * @param {object} player 
 * @param {string} id 
 * @param {string} name 
 * @param {number} qty 
 */
export function addInventoryItem(player, id, name, qty) {
  if (!player?.inventory) return;
  if (!Array.isArray(player.inventory.items)) player.inventory.items = [];
  const q = Math.max(0, Number(qty ?? 0) || 0);
  if (q <= 0) return;
  const found = player.inventory.items.find((it) => it && it.id === id);
  if (found) {
    found.qty = (Number(found.qty ?? 0) || 0) + q;
    if (!found.name) found.name = name;
  } else {
    player.inventory.items.push({ id, name, qty: q });
  }
}

/**
 * Count items in inventory
 * @param {object} player 
 * @param {string} id 
 * @returns {number}
 */
export function countInventoryItem(player, id) {
  const items = player?.inventory?.items;
  if (!Array.isArray(items)) return 0;
  const found = items.find((it) => it && it.id === id);
  return Number(found?.qty ?? 0) || 0;
}

/**
 * Consume items from inventory
 * @param {object} player 
 * @param {string} id 
 * @param {number} qty 
 * @returns {boolean} - True if successful
 */
export function consumeInventoryItem(player, id, qty) {
  const items = player?.inventory?.items;
  if (!Array.isArray(items)) return false;
  const need = Math.max(0, Number(qty ?? 0) || 0);
  if (need <= 0) return true;
  const found = items.find((it) => it && it.id === id);
  const have = Number(found?.qty ?? 0) || 0;
  if (!found || have < need) return false;
  found.qty = have - need;
  if (found.qty <= 0) {
    const idx = items.indexOf(found);
    if (idx >= 0) items.splice(idx, 1);
  }
  return true;
}

// ========== Device detection ==========

/**
 * Check if device is touch-enabled
 * @returns {boolean}
 */
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Check if device is mobile (small screen)
 * @returns {boolean}
 */
export function isMobile() {
  return window.innerWidth <= 768 || isTouchDevice();
}

/**
 * Get device pixel ratio
 * @returns {number}
 */
export function getDevicePixelRatio() {
  return window.devicePixelRatio || 1;
}
