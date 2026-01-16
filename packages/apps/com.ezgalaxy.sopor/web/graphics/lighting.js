/**
 * SOPOR - Lighting System
 * Dynamic lighting, shadows, and fog of war
 */

import { clamp, lerp, distance } from '../core/utils.js';
import { hexToRgb, BIOME_PALETTES } from './textures.js';
import { STRATA } from '../core/constants.js';

// ========== Light Types ==========

export const LIGHT_TYPE = {
  POINT: 'point',       // Circular light
  SPOT: 'spot',         // Directional cone
  AMBIENT: 'ambient',   // Global illumination
  DIRECTIONAL: 'dir',   // Sun-like parallel rays
};

// ========== Light Definition ==========

/**
 * @typedef {object} Light
 * @property {string} type
 * @property {number} x
 * @property {number} y
 * @property {number} radius
 * @property {number} intensity
 * @property {number} color
 * @property {boolean} flicker
 * @property {number} flickerSpeed
 * @property {number} flickerIntensity
 */

// ========== Lighting System ==========

/**
 * Create lighting system
 */
export function createLightingSystem() {
  return {
    lights: [],
    ambientColor: 0x808090,  // Much brighter ambient for visibility
    ambientIntensity: 0.8,   // High ambient
    fogEnabled: false,       // Disable fog for better visibility
    fogColor: 0x000000,
    fogDensity: 0.2,
    globalBrightness: 1.3,   // Extra brightness
    lightingEnabled: true,   // Can toggle lighting
    _flickerTime: 0,
    _lightCanvas: null,
    _lightCtx: null,
  };
}

/**
 * Initialize light canvas
 */
export function initLightCanvas(system, width, height) {
  system._lightCanvas = document.createElement('canvas');
  system._lightCanvas.width = width;
  system._lightCanvas.height = height;
  system._lightCtx = system._lightCanvas.getContext('2d');
}

/**
 * Add light to system
 */
export function addLight(system, config) {
  const light = {
    id: config.id || `light_${Date.now()}_${Math.random()}`,
    type: config.type || LIGHT_TYPE.POINT,
    x: config.x || 0,
    y: config.y || 0,
    radius: config.radius || 100,
    intensity: config.intensity ?? 1.0,
    color: config.color || 0xffffaa,
    angle: config.angle || 0,
    spread: config.spread || Math.PI / 4,
    flicker: config.flicker || false,
    flickerSpeed: config.flickerSpeed || 5,
    flickerIntensity: config.flickerIntensity || 0.15,
    _currentIntensity: config.intensity ?? 1.0,
    enabled: true,
    static: config.static || false, // Doesn't move with camera
  };
  
  system.lights.push(light);
  return light;
}

/**
 * Remove light
 */
export function removeLight(system, lightId) {
  const idx = system.lights.findIndex(l => l.id === lightId);
  if (idx !== -1) {
    system.lights.splice(idx, 1);
  }
}

/**
 * Update lights
 */
export function updateLights(system, delta) {
  system._flickerTime += delta * 0.001;
  
  for (const light of system.lights) {
    if (!light.enabled) continue;
    
    if (light.flicker) {
      // Perlin-like noise flicker
      const noise = Math.sin(system._flickerTime * light.flickerSpeed) * 
                   Math.sin(system._flickerTime * light.flickerSpeed * 0.7) * 
                   Math.sin(system._flickerTime * light.flickerSpeed * 1.3);
      
      light._currentIntensity = light.intensity * 
        (1 + noise * light.flickerIntensity);
    } else {
      light._currentIntensity = light.intensity;
    }
  }
}

/**
 * Render lighting to canvas
 */
export function renderLighting(system, ctx, cameraX, cameraY, width, height) {
  if (!system._lightCtx) {
    initLightCanvas(system, width, height);
  }
  
  const lightCtx = system._lightCtx;
  
  // Resize if needed
  if (system._lightCanvas.width !== width || system._lightCanvas.height !== height) {
    system._lightCanvas.width = width;
    system._lightCanvas.height = height;
  }
  
  // Fill with ambient color
  const ambient = hexToRgb(system.ambientColor);
  lightCtx.fillStyle = `rgba(${ambient.r}, ${ambient.g}, ${ambient.b}, 1)`;
  lightCtx.fillRect(0, 0, width, height);
  
  // Render each light additively
  lightCtx.globalCompositeOperation = 'lighter';
  
  for (const light of system.lights) {
    if (!light.enabled) continue;
    
    const screenX = light.static ? light.x : light.x - cameraX;
    const screenY = light.static ? light.y : light.y - cameraY;
    
    // Skip off-screen lights
    if (screenX + light.radius < 0 || screenX - light.radius > width ||
        screenY + light.radius < 0 || screenY - light.radius > height) {
      continue;
    }
    
    const intensity = light._currentIntensity * system.globalBrightness;
    const c = hexToRgb(light.color);
    
    switch (light.type) {
      case LIGHT_TYPE.POINT:
        renderPointLight(lightCtx, screenX, screenY, light.radius, c, intensity);
        break;
        
      case LIGHT_TYPE.SPOT:
        renderSpotLight(lightCtx, screenX, screenY, light.radius, 
          light.angle, light.spread, c, intensity);
        break;
    }
  }
  
  // Reset composite operation
  lightCtx.globalCompositeOperation = 'source-over';
  
  // Apply lighting to main canvas using soft overlay
  // Use 'screen' instead of 'multiply' for brighter result
  ctx.save();
  if (system.lightingEnabled) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.4;
    ctx.drawImage(system._lightCanvas, 0, 0);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/**
 * Render point light
 */
function renderPointLight(ctx, x, y, radius, color, intensity) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  
  const r = Math.floor(color.r * intensity);
  const g = Math.floor(color.g * intensity);
  const b = Math.floor(color.b * intensity);
  
  gradient.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
  gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.5)`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

/**
 * Render spot light
 */
function renderSpotLight(ctx, x, y, radius, angle, spread, color, intensity) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  
  // Cone shape
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius, -spread / 2, spread / 2);
  ctx.closePath();
  
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  
  const r = Math.floor(color.r * intensity);
  const g = Math.floor(color.g * intensity);
  const b = Math.floor(color.b * intensity);
  
  gradient.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
  gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.3)`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fill();
  
  ctx.restore();
}

// ========== Fog of War ==========

/**
 * Create fog of war system
 */
export function createFogOfWar(width, height, tileSize = 32) {
  const tilesX = Math.ceil(width / tileSize);
  const tilesY = Math.ceil(height / tileSize);
  
  return {
    width,
    height,
    tileSize,
    tilesX,
    tilesY,
    // 0 = unexplored, 1 = explored but not visible, 2 = currently visible
    visibility: new Uint8Array(tilesX * tilesY),
    fogColor: 0x000000,
    exploredAlpha: 0.5,
    unexploredAlpha: 1.0,
    _canvas: null,
    _ctx: null,
    _dirty: true,
  };
}

/**
 * Update fog visibility from player position
 */
export function updateFogVisibility(fog, playerX, playerY, viewRadius = 200) {
  const centerTileX = Math.floor(playerX / fog.tileSize);
  const centerTileY = Math.floor(playerY / fog.tileSize);
  const tileRadius = Math.ceil(viewRadius / fog.tileSize);
  
  // Reset all visible to explored
  for (let i = 0; i < fog.visibility.length; i++) {
    if (fog.visibility[i] === 2) {
      fog.visibility[i] = 1;
    }
  }
  
  // Set currently visible tiles
  for (let dy = -tileRadius; dy <= tileRadius; dy++) {
    for (let dx = -tileRadius; dx <= tileRadius; dx++) {
      const tx = centerTileX + dx;
      const ty = centerTileY + dy;
      
      if (tx < 0 || tx >= fog.tilesX || ty < 0 || ty >= fog.tilesY) continue;
      
      // Circle check
      if (dx * dx + dy * dy <= tileRadius * tileRadius) {
        const idx = ty * fog.tilesX + tx;
        fog.visibility[idx] = 2;
      }
    }
  }
  
  fog._dirty = true;
}

/**
 * Render fog of war
 */
export function renderFogOfWar(fog, ctx, cameraX, cameraY, screenWidth, screenHeight) {
  // Only rebuild fog canvas if dirty
  if (fog._dirty || !fog._canvas) {
    rebuildFogCanvas(fog);
  }
  
  // Calculate visible portion
  const startTileX = Math.floor(cameraX / fog.tileSize);
  const startTileY = Math.floor(cameraY / fog.tileSize);
  const offsetX = cameraX % fog.tileSize;
  const offsetY = cameraY % fog.tileSize;
  
  // Draw fog
  ctx.save();
  ctx.drawImage(
    fog._canvas,
    startTileX * fog.tileSize,
    startTileY * fog.tileSize,
    screenWidth + fog.tileSize,
    screenHeight + fog.tileSize,
    -offsetX,
    -offsetY,
    screenWidth + fog.tileSize,
    screenHeight + fog.tileSize
  );
  ctx.restore();
}

/**
 * Rebuild fog canvas
 */
function rebuildFogCanvas(fog) {
  if (!fog._canvas) {
    fog._canvas = document.createElement('canvas');
    fog._canvas.width = fog.tilesX * fog.tileSize;
    fog._canvas.height = fog.tilesY * fog.tileSize;
    fog._ctx = fog._canvas.getContext('2d');
  }
  
  const ctx = fog._ctx;
  const c = hexToRgb(fog.fogColor);
  
  ctx.clearRect(0, 0, fog._canvas.width, fog._canvas.height);
  
  for (let ty = 0; ty < fog.tilesY; ty++) {
    for (let tx = 0; tx < fog.tilesX; tx++) {
      const idx = ty * fog.tilesX + tx;
      const vis = fog.visibility[idx];
      
      let alpha = fog.unexploredAlpha;
      if (vis === 1) alpha = fog.exploredAlpha;
      else if (vis === 2) alpha = 0;
      
      if (alpha > 0) {
        ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
        ctx.fillRect(
          tx * fog.tileSize,
          ty * fog.tileSize,
          fog.tileSize,
          fog.tileSize
        );
      }
    }
  }
  
  fog._dirty = false;
}

/**
 * Check if position is visible
 */
export function isPositionVisible(fog, x, y) {
  const tx = Math.floor(x / fog.tileSize);
  const ty = Math.floor(y / fog.tileSize);
  
  if (tx < 0 || tx >= fog.tilesX || ty < 0 || ty >= fog.tilesY) {
    return false;
  }
  
  const idx = ty * fog.tilesX + tx;
  return fog.visibility[idx] === 2;
}

/**
 * Check if position was explored
 */
export function isPositionExplored(fog, x, y) {
  const tx = Math.floor(x / fog.tileSize);
  const ty = Math.floor(y / fog.tileSize);
  
  if (tx < 0 || tx >= fog.tilesX || ty < 0 || ty >= fog.tilesY) {
    return false;
  }
  
  const idx = ty * fog.tilesX + tx;
  return fog.visibility[idx] > 0;
}

// ========== Biome Lighting Presets ==========

/**
 * Apply biome lighting preset
 */
export function applyBiomeLighting(system, biome) {
  const palette = BIOME_PALETTES[biome];
  
  if (!palette) return;
  
  // Set ambient based on biome
  switch (biome) {
    case STRATA.JARDIN:
      system.ambientColor = 0x304030;
      system.ambientIntensity = 0.4;
      system.fogColor = palette.shadow;
      system.fogDensity = 0.3;
      break;
      
    case STRATA.FORGE:
      system.ambientColor = 0x402020;
      system.ambientIntensity = 0.35;
      system.fogColor = 0x301510;
      system.fogDensity = 0.4;
      break;
      
    case STRATA.ABIME:
      system.ambientColor = 0x203040;
      system.ambientIntensity = 0.3;
      system.fogColor = 0x102030;
      system.fogDensity = 0.35;
      break;
      
    case STRATA.NEXUS:
      system.ambientColor = 0x201530;
      system.ambientIntensity = 0.25;
      system.fogColor = 0x100820;
      system.fogDensity = 0.45;
      break;
      
    case STRATA.DUNGEON:
      system.ambientColor = 0x151515;
      system.ambientIntensity = 0.2;
      system.fogColor = 0x000000;
      system.fogDensity = 0.5;
      break;
  }
}

/**
 * Create player light
 */
export function createPlayerLight(system, x, y) {
  return addLight(system, {
    id: 'player_light',
    type: LIGHT_TYPE.POINT,
    x,
    y,
    radius: 180,
    intensity: 0.8,
    color: 0xffffee,
    flicker: true,
    flickerSpeed: 3,
    flickerIntensity: 0.08,
  });
}

/**
 * Create torch light
 */
export function createTorchLight(system, x, y) {
  return addLight(system, {
    type: LIGHT_TYPE.POINT,
    x,
    y,
    radius: 100,
    intensity: 0.6,
    color: 0xffaa44,
    flicker: true,
    flickerSpeed: 8,
    flickerIntensity: 0.2,
    static: true,
  });
}

/**
 * Create crystal light
 */
export function createCrystalLight(system, x, y, color = 0x88ccff) {
  return addLight(system, {
    type: LIGHT_TYPE.POINT,
    x,
    y,
    radius: 60,
    intensity: 0.4,
    color,
    flicker: true,
    flickerSpeed: 2,
    flickerIntensity: 0.1,
    static: true,
  });
}

export default {
  LIGHT_TYPE,
  
  // Lighting System
  createLightingSystem,
  initLightCanvas,
  addLight,
  removeLight,
  updateLights,
  renderLighting,
  
  // Fog of War
  createFogOfWar,
  updateFogVisibility,
  renderFogOfWar,
  isPositionVisible,
  isPositionExplored,
  
  // Presets
  applyBiomeLighting,
  createPlayerLight,
  createTorchLight,
  createCrystalLight,
};
