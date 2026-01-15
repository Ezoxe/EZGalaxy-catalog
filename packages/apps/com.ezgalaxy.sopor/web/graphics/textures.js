/**
 * SOPOR - Graphics System - Textures
 * Procedural texture generation using Canvas 2D
 */

import { STRATA, TILE_TYPES, RARITY } from '../core/constants.js';
import { makeRng, clamp, lerp } from '../core/utils.js';

// ========== Color Utilities ==========

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return { r, g, b };
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r, g, b) {
  return (r << 16) | (g << 8) | b;
}

/**
 * Blend two colors
 */
export function blendColors(color1, color2, t) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  return rgbToHex(
    Math.floor(lerp(c1.r, c2.r, t)),
    Math.floor(lerp(c1.g, c2.g, t)),
    Math.floor(lerp(c1.b, c2.b, t))
  );
}

/**
 * Vary color slightly
 */
export function varyColor(color, amount, rng) {
  const c = hexToRgb(color);
  const vary = () => Math.floor((rng.next() - 0.5) * amount * 2);
  
  return rgbToHex(
    clamp(c.r + vary(), 0, 255),
    clamp(c.g + vary(), 0, 255),
    clamp(c.b + vary(), 0, 255)
  );
}

/**
 * Darken color
 */
export function darken(color, amount) {
  const c = hexToRgb(color);
  return rgbToHex(
    Math.floor(c.r * (1 - amount)),
    Math.floor(c.g * (1 - amount)),
    Math.floor(c.b * (1 - amount))
  );
}

/**
 * Lighten color
 */
export function lighten(color, amount) {
  const c = hexToRgb(color);
  return rgbToHex(
    Math.floor(c.r + (255 - c.r) * amount),
    Math.floor(c.g + (255 - c.g) * amount),
    Math.floor(c.b + (255 - c.b) * amount)
  );
}

// ========== Biome Color Palettes ==========

export const BIOME_PALETTES = {
  [STRATA.JARDIN]: {
    floor: [0x3a5f3a, 0x4a6f4a, 0x2a4f2a],
    wall: [0x2a3f2a, 0x1a2f1a, 0x3a4f3a],
    accent: 0x8fbf4f,
    shadow: 0x1a2f1a,
    highlight: 0x6faf6f,
    particle: 0xccff88,
  },
  [STRATA.FORGE]: {
    floor: [0x5a3a2a, 0x6a4a3a, 0x4a2a1a],
    wall: [0x3a2a1a, 0x4a3a2a, 0x2a1a0a],
    accent: 0xff6a2a,
    shadow: 0x1a0a00,
    highlight: 0x8a5a4a,
    particle: 0xffaa44,
  },
  [STRATA.ABIME]: {
    floor: [0x2a3a5a, 0x3a4a6a, 0x1a2a4a],
    wall: [0x1a2a3a, 0x2a3a4a, 0x0a1a2a],
    accent: 0x6af0ff,
    shadow: 0x0a1020,
    highlight: 0x5a7aaa,
    particle: 0xaaeeff,
  },
  [STRATA.NEXUS]: {
    floor: [0x3a2a4a, 0x4a3a5a, 0x2a1a3a],
    wall: [0x1a1a2a, 0x2a2a3a, 0x0a0a1a],
    accent: 0xaa66ff,
    shadow: 0x0a0a10,
    highlight: 0x6a5a7a,
    particle: 0xdd99ff,
  },
  [STRATA.DUNGEON]: {
    floor: [0x3a3a3a, 0x4a4a4a, 0x2a2a2a],
    wall: [0x2a2a2a, 0x3a3a3a, 0x1a1a1a],
    accent: 0x8a8a6a,
    shadow: 0x0a0a0a,
    highlight: 0x5a5a5a,
    particle: 0x888888,
  },
};

// ========== Texture Generation ==========

/**
 * Create a canvas context
 */
function createContext(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext('2d');
}

/**
 * Generate noise texture
 */
export function generateNoise(width, height, scale, octaves, seed) {
  const ctx = createContext(width, height);
  const imageData = ctx.createImageData(width, height);
  const rng = makeRng(seed);
  
  // Simple value noise with octaves
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 0;
      let amplitude = 1;
      let frequency = scale;
      let maxValue = 0;
      
      for (let o = 0; o < octaves; o++) {
        // Simple hash-based noise
        const nx = Math.floor(x * frequency) ^ seed;
        const ny = Math.floor(y * frequency) ^ (seed * 2);
        const n = ((nx * 374761393 + ny * 668265263) ^ (nx * ny)) & 0xffffffff;
        const noiseVal = (n / 0xffffffff + 0.5);
        
        value += noiseVal * amplitude;
        maxValue += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }
      
      value = value / maxValue;
      const idx = (y * width + x) * 4;
      const v = Math.floor(value * 255);
      imageData.data[idx] = v;
      imageData.data[idx + 1] = v;
      imageData.data[idx + 2] = v;
      imageData.data[idx + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return ctx.canvas;
}

/**
 * Generate floor tile texture
 */
export function generateFloorTile(size, biome, variant, seed) {
  const ctx = createContext(size, size);
  const rng = makeRng(seed + variant);
  const palette = BIOME_PALETTES[biome] || BIOME_PALETTES[STRATA.DUNGEON];
  
  // Base color
  const baseColor = palette.floor[variant % palette.floor.length];
  
  // Fill base
  ctx.fillStyle = `#${baseColor.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, size, size);
  
  // Add noise texture
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (rng.next() < 0.3) {
        const varied = varyColor(baseColor, 20, rng);
        ctx.fillStyle = `#${varied.toString(16).padStart(6, '0')}`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  
  // Add occasional detail dots
  const dotCount = 3 + Math.floor(rng.next() * 5);
  for (let i = 0; i < dotCount; i++) {
    const dx = Math.floor(rng.next() * size);
    const dy = Math.floor(rng.next() * size);
    const dc = rng.next() < 0.5 ? darken(baseColor, 0.2) : lighten(baseColor, 0.1);
    ctx.fillStyle = `#${dc.toString(16).padStart(6, '0')}`;
    ctx.fillRect(dx, dy, 2, 2);
  }
  
  // Subtle edge darkening
  ctx.fillStyle = `rgba(0, 0, 0, 0.1)`;
  ctx.fillRect(0, 0, 1, size);
  ctx.fillRect(0, 0, size, 1);
  
  return ctx.canvas;
}

/**
 * Generate wall tile texture
 */
export function generateWallTile(size, biome, variant, seed) {
  const ctx = createContext(size, size);
  const rng = makeRng(seed + variant + 1000);
  const palette = BIOME_PALETTES[biome] || BIOME_PALETTES[STRATA.DUNGEON];
  
  const baseColor = palette.wall[variant % palette.wall.length];
  
  // Fill base darker
  ctx.fillStyle = `#${darken(baseColor, 0.2).toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, size, size);
  
  // Brick pattern
  const brickHeight = Math.floor(size / 4);
  const brickWidth = Math.floor(size / 2);
  
  for (let row = 0; row < 4; row++) {
    const offset = row % 2 === 0 ? 0 : brickWidth / 2;
    
    for (let col = -1; col < 3; col++) {
      const bx = col * brickWidth + offset;
      const by = row * brickHeight;
      
      // Brick face
      const brickColor = varyColor(baseColor, 15, rng);
      ctx.fillStyle = `#${brickColor.toString(16).padStart(6, '0')}`;
      ctx.fillRect(bx + 1, by + 1, brickWidth - 2, brickHeight - 2);
      
      // Highlight top edge
      ctx.fillStyle = `#${lighten(brickColor, 0.15).toString(16).padStart(6, '0')}`;
      ctx.fillRect(bx + 1, by + 1, brickWidth - 2, 1);
      
      // Shadow bottom edge
      ctx.fillStyle = `#${darken(brickColor, 0.2).toString(16).padStart(6, '0')}`;
      ctx.fillRect(bx + 1, by + brickHeight - 2, brickWidth - 2, 1);
    }
  }
  
  // Add some noise
  for (let i = 0; i < 20; i++) {
    const nx = Math.floor(rng.next() * size);
    const ny = Math.floor(rng.next() * size);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + rng.next() * 0.1})`;
    ctx.fillRect(nx, ny, 1, 1);
  }
  
  return ctx.canvas;
}

/**
 * Generate hazard tile texture
 */
export function generateHazardTile(size, biome, variant, seed) {
  const ctx = createContext(size, size);
  const rng = makeRng(seed + variant + 2000);
  const palette = BIOME_PALETTES[biome] || BIOME_PALETTES[STRATA.DUNGEON];
  
  // Base with accent color tint
  const baseColor = blendColors(palette.floor[0], palette.accent, 0.3);
  
  ctx.fillStyle = `#${baseColor.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, size, size);
  
  // Danger stripes
  ctx.strokeStyle = `#${palette.accent.toString(16).padStart(6, '0')}`;
  ctx.lineWidth = 3;
  
  for (let i = -size; i < size * 2; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }
  
  // Animated glow effect border
  ctx.strokeStyle = `rgba(${(palette.accent >> 16) & 0xff}, ${(palette.accent >> 8) & 0xff}, ${palette.accent & 0xff}, 0.5)`;
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, size - 4, size - 4);
  
  return ctx.canvas;
}

// ========== Entity Textures ==========

/**
 * Generate player sprite texture
 */
export function generatePlayerSprite(size, seed) {
  const ctx = createContext(size, size);
  const rng = makeRng(seed);
  
  // Body (circle)
  const bodyColor = 0x4488ff;
  ctx.fillStyle = `#${bodyColor.toString(16).padStart(6, '0')}`;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
  
  // Highlight
  ctx.fillStyle = `#${lighten(bodyColor, 0.3).toString(16).padStart(6, '0')}`;
  ctx.beginPath();
  ctx.arc(size / 2 - 3, size / 2 - 3, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
  
  // Eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(size / 2 + 4, size / 2 - 2, 4, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(size / 2 + 5, size / 2 - 2, 2, 0, Math.PI * 2);
  ctx.fill();
  
  return ctx.canvas;
}

/**
 * Generate enemy sprite texture
 */
export function generateEnemySprite(size, archetype, seed) {
  const ctx = createContext(size, size);
  const rng = makeRng(seed);
  
  // Color by archetype
  const colors = {
    skirmisher: 0xff4444,
    charger: 0xff8844,
    spitter: 0x44ff44,
    gunner: 0x888888,
    lurker: 0x884488,
    summoner: 0xaa44aa,
    berserker: 0xff0000,
    sniper: 0x444488,
    healer: 0x44ff88,
    tank: 0x666666,
    assassin: 0x222222,
    necromancer: 0x440044,
  };
  
  const bodyColor = colors[archetype] || 0xff4444;
  
  // Body shape varies by archetype
  ctx.fillStyle = `#${bodyColor.toString(16).padStart(6, '0')}`;
  
  if (archetype === 'tank') {
    // Square body
    ctx.fillRect(size * 0.15, size * 0.15, size * 0.7, size * 0.7);
  } else if (archetype === 'assassin' || archetype === 'lurker') {
    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(size / 2, size * 0.1);
    ctx.lineTo(size * 0.9, size / 2);
    ctx.lineTo(size / 2, size * 0.9);
    ctx.lineTo(size * 0.1, size / 2);
    ctx.closePath();
    ctx.fill();
  } else {
    // Circle (default)
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Angry eyes
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(size / 2 - 5, size / 2 - 2, 4, 0, Math.PI * 2);
  ctx.arc(size / 2 + 5, size / 2 - 2, 4, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(size / 2 - 4, size / 2 - 2, 2, 0, Math.PI * 2);
  ctx.arc(size / 2 + 6, size / 2 - 2, 2, 0, Math.PI * 2);
  ctx.fill();
  
  return ctx.canvas;
}

/**
 * Generate weapon icon texture
 */
export function generateWeaponIcon(size, weaponId, rarity, seed) {
  const ctx = createContext(size, size);
  const rng = makeRng(seed);
  
  // Rarity border color
  const rarityColors = {
    [RARITY.COMMON]: 0x888888,
    [RARITY.UNCOMMON]: 0x44ff44,
    [RARITY.RARE]: 0x4488ff,
    [RARITY.EPIC]: 0xaa44ff,
    [RARITY.LEGENDARY]: 0xffaa00,
  };
  
  const borderColor = rarityColors[rarity] || 0x888888;
  
  // Background
  ctx.fillStyle = '#222222';
  ctx.fillRect(0, 0, size, size);
  
  // Border
  ctx.strokeStyle = `#${borderColor.toString(16).padStart(6, '0')}`;
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, size - 4, size - 4);
  
  // Simple weapon icon (blade shape)
  ctx.fillStyle = '#cccccc';
  ctx.beginPath();
  ctx.moveTo(size / 2, 8);
  ctx.lineTo(size - 12, size / 2);
  ctx.lineTo(size / 2, size - 8);
  ctx.lineTo(12, size / 2);
  ctx.closePath();
  ctx.fill();
  
  // Handle
  ctx.fillStyle = '#664422';
  ctx.fillRect(size / 2 - 3, size / 2 + 4, 6, size / 3);
  
  return ctx.canvas;
}

// ========== Effect Textures ==========

/**
 * Generate particle texture
 */
export function generateParticle(size, color) {
  const ctx = createContext(size, size);
  
  // Radial gradient for soft particle
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  
  const c = hexToRgb(color);
  gradient.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 1)`);
  gradient.addColorStop(0.5, `rgba(${c.r}, ${c.g}, ${c.b}, 0.5)`);
  gradient.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  return ctx.canvas;
}

/**
 * Generate status effect icon
 */
export function generateStatusIcon(size, effectType) {
  const ctx = createContext(size, size);
  
  const colors = {
    burn: 0xff4400,
    freeze: 0x44aaff,
    poison: 0x44ff44,
    bleed: 0xff0000,
    stun: 0xffff00,
    slow: 0x8888ff,
  };
  
  const color = colors[effectType] || 0xffffff;
  const c = hexToRgb(color);
  
  // Circular icon
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  
  gradient.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 1)`);
  gradient.addColorStop(0.7, `rgba(${c.r}, ${c.g}, ${c.b}, 0.6)`);
  gradient.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0.2)`);
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  return ctx.canvas;
}

// ========== Texture Cache ==========

const textureCache = new Map();

/**
 * Get or create cached texture
 */
export function getCachedTexture(key, generator) {
  if (!textureCache.has(key)) {
    textureCache.set(key, generator());
  }
  return textureCache.get(key);
}

/**
 * Clear texture cache
 */
export function clearTextureCache() {
  textureCache.clear();
}

/**
 * Pregenerate common textures
 */
export function pregenerateTextures(biome, seed) {
  // Floor tiles
  for (let v = 0; v < 4; v++) {
    getCachedTexture(`floor_${biome}_${v}`, () => 
      generateFloorTile(32, biome, v, seed)
    );
  }
  
  // Wall tiles
  for (let v = 0; v < 4; v++) {
    getCachedTexture(`wall_${biome}_${v}`, () => 
      generateWallTile(32, biome, v, seed)
    );
  }
  
  // Hazard tiles
  for (let v = 0; v < 2; v++) {
    getCachedTexture(`hazard_${biome}_${v}`, () => 
      generateHazardTile(32, biome, v, seed)
    );
  }
  
  // Player sprite
  getCachedTexture('player', () => generatePlayerSprite(32, seed));
  
  // Common particles
  const palette = BIOME_PALETTES[biome];
  if (palette) {
    getCachedTexture(`particle_${biome}`, () => 
      generateParticle(16, palette.particle)
    );
  }
}

export default {
  // Color utilities
  hexToRgb,
  rgbToHex,
  blendColors,
  varyColor,
  darken,
  lighten,
  
  // Palettes
  BIOME_PALETTES,
  
  // Generators
  generateNoise,
  generateFloorTile,
  generateWallTile,
  generateHazardTile,
  generatePlayerSprite,
  generateEnemySprite,
  generateWeaponIcon,
  generateParticle,
  generateStatusIcon,
  
  // Cache
  getCachedTexture,
  clearTextureCache,
  pregenerateTextures,
};
