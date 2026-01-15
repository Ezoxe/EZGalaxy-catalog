/**
 * SOPOR - Minimap System
 * Real-time map with fog of war and room indicators
 */

import { STRATA } from '../core/constants.js';
import { clamp } from '../core/utils.js';
import { BIOME_PALETTES } from '../graphics/textures.js';

// ========== Minimap Configuration ==========

export const MINIMAP_CONFIG = {
  // Size
  width: 150,
  height: 150,
  padding: 10,
  
  // Position (from top-right)
  offsetX: 15,
  offsetY: 15,
  
  // Scale
  tileSize: 2, // Pixels per game tile
  
  // Colors
  backgroundColor: '#111111cc',
  borderColor: '#444444',
  
  playerColor: '#00ff00',
  playerSize: 4,
  
  enemyColor: '#ff0000',
  enemySize: 2,
  
  npcColor: '#ffff00',
  itemColor: '#ffaa00',
  
  doorColor: '#8888ff',
  exitColor: '#00ffff',
  
  // Fog
  fogColor: '#000000',
  exploredAlpha: 0.5,
  
  // Zoom
  minZoom: 0.5,
  maxZoom: 2,
  defaultZoom: 1,
};

// ========== Minimap State ==========

/**
 * Create minimap state
 */
export function createMinimapState() {
  return {
    enabled: true,
    expanded: false,
    zoom: MINIMAP_CONFIG.defaultZoom,
    
    // Cached canvas
    _canvas: null,
    _ctx: null,
    _dirty: true,
    
    // Map data
    tiles: null,
    tilesWidth: 0,
    tilesHeight: 0,
    
    // Explored tiles
    explored: null,
    
    // Entity positions
    entities: [],
    
    // Points of interest
    pois: [],
    
    // Room data
    rooms: [],
    currentRoom: null,
  };
}

/**
 * Initialize minimap for level
 */
export function initMinimap(state, mapData, roomData = null) {
  const { tiles, width, height } = mapData;
  
  state.tiles = tiles;
  state.tilesWidth = width;
  state.tilesHeight = height;
  state.explored = new Uint8Array(width * height);
  state.rooms = roomData || [];
  state._dirty = true;
  
  // Create cache canvas
  if (!state._canvas) {
    state._canvas = document.createElement('canvas');
    state._ctx = state._canvas.getContext('2d');
  }
  
  state._canvas.width = width * MINIMAP_CONFIG.tileSize;
  state._canvas.height = height * MINIMAP_CONFIG.tileSize;
}

/**
 * Update explored area
 */
export function updateExplored(state, playerX, playerY, viewRadius = 10) {
  const centerTileX = Math.floor(playerX / 32); // Assuming 32px tiles
  const centerTileY = Math.floor(playerY / 32);
  
  let changed = false;
  
  for (let dy = -viewRadius; dy <= viewRadius; dy++) {
    for (let dx = -viewRadius; dx <= viewRadius; dx++) {
      const tx = centerTileX + dx;
      const ty = centerTileY + dy;
      
      if (tx < 0 || tx >= state.tilesWidth || ty < 0 || ty >= state.tilesHeight) continue;
      
      // Circle check
      if (dx * dx + dy * dy <= viewRadius * viewRadius) {
        const idx = ty * state.tilesWidth + tx;
        if (state.explored[idx] === 0) {
          state.explored[idx] = 1;
          changed = true;
        }
      }
    }
  }
  
  if (changed) {
    state._dirty = true;
  }
}

/**
 * Update entity positions
 */
export function updateEntities(state, entities) {
  state.entities = entities.map(e => ({
    x: Math.floor(e.x / 32),
    y: Math.floor(e.y / 32),
    type: e.type || 'enemy',
    visible: e.visible !== false,
  }));
}

/**
 * Add point of interest
 */
export function addPOI(state, x, y, type, label = '') {
  state.pois.push({
    x: Math.floor(x / 32),
    y: Math.floor(y / 32),
    type,
    label,
  });
}

/**
 * Clear POIs
 */
export function clearPOIs(state) {
  state.pois = [];
}

// ========== Rendering ==========

/**
 * Render minimap background (cached)
 */
function renderMinimapCache(state, biome) {
  if (!state._dirty || !state.tiles) return;
  
  const ctx = state._ctx;
  const ts = MINIMAP_CONFIG.tileSize;
  const palette = BIOME_PALETTES[biome] || BIOME_PALETTES[STRATA.JARDIN];
  
  ctx.clearRect(0, 0, state._canvas.width, state._canvas.height);
  
  for (let y = 0; y < state.tilesHeight; y++) {
    for (let x = 0; x < state.tilesWidth; x++) {
      const idx = y * state.tilesWidth + x;
      const tile = state.tiles[idx];
      const explored = state.explored[idx];
      
      if (!explored) {
        ctx.fillStyle = MINIMAP_CONFIG.fogColor;
      } else {
        // Tile color based on type
        switch (tile) {
          case 0: // Floor
            ctx.fillStyle = palette.floor;
            break;
          case 1: // Wall
            ctx.fillStyle = palette.wall;
            break;
          case 2: // Door
            ctx.fillStyle = MINIMAP_CONFIG.doorColor;
            break;
          case 3: // Exit/Stairs
            ctx.fillStyle = MINIMAP_CONFIG.exitColor;
            break;
          case 4: // Hazard
            ctx.fillStyle = palette.hazard || '#ff4400';
            break;
          default:
            ctx.fillStyle = palette.shadow;
        }
      }
      
      ctx.fillRect(x * ts, y * ts, ts, ts);
    }
  }
  
  state._dirty = false;
}

/**
 * Draw minimap
 */
export function drawMinimap(ctx, state, playerX, playerY, biome, screenWidth) {
  if (!state.enabled || !state.tiles) return;
  
  const config = MINIMAP_CONFIG;
  const width = state.expanded ? config.width * 2 : config.width;
  const height = state.expanded ? config.height * 2 : config.height;
  
  const x = screenWidth - width - config.offsetX;
  const y = config.offsetY;
  
  // Render cache if dirty
  renderMinimapCache(state, biome);
  
  // Draw background
  ctx.fillStyle = config.backgroundColor;
  roundRect(ctx, x - 4, y - 4, width + 8, height + 8, 8);
  ctx.fill();
  
  // Clip to minimap area
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x, y, width, height, 6);
  ctx.clip();
  
  // Calculate view offset (center on player)
  const playerTileX = playerX / 32;
  const playerTileY = playerY / 32;
  const ts = config.tileSize * state.zoom;
  
  const viewWidth = width / ts;
  const viewHeight = height / ts;
  
  const offsetX = x + width / 2 - playerTileX * ts;
  const offsetY = y + height / 2 - playerTileY * ts;
  
  // Draw cached map
  ctx.drawImage(
    state._canvas,
    0, 0,
    state._canvas.width, state._canvas.height,
    x + width / 2 - playerTileX * ts,
    y + height / 2 - playerTileY * ts,
    state.tilesWidth * ts,
    state.tilesHeight * ts
  );
  
  // Draw rooms overlay
  drawRooms(ctx, state, offsetX, offsetY, ts);
  
  // Draw POIs
  drawPOIs(ctx, state, offsetX, offsetY, ts);
  
  // Draw entities
  drawEntities(ctx, state, offsetX, offsetY, ts);
  
  // Draw player
  const px = x + width / 2;
  const py = y + height / 2;
  
  ctx.fillStyle = config.playerColor;
  ctx.beginPath();
  ctx.arc(px, py, config.playerSize, 0, Math.PI * 2);
  ctx.fill();
  
  // Player direction indicator
  // (would need player rotation data)
  
  ctx.restore();
  
  // Border
  ctx.strokeStyle = config.borderColor;
  ctx.lineWidth = 2;
  roundRect(ctx, x - 4, y - 4, width + 8, height + 8, 8);
  ctx.stroke();
  
  // Zoom indicator
  if (state.zoom !== 1) {
    ctx.fillStyle = '#ffffff88';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(state.zoom * 100)}%`, x + width - 4, y + height - 4);
  }
}

/**
 * Draw room boundaries
 */
function drawRooms(ctx, state, offsetX, offsetY, ts) {
  ctx.strokeStyle = '#ffffff22';
  ctx.lineWidth = 1;
  
  state.rooms.forEach(room => {
    ctx.strokeRect(
      offsetX + room.x * ts,
      offsetY + room.y * ts,
      room.width * ts,
      room.height * ts
    );
  });
  
  // Highlight current room
  if (state.currentRoom) {
    ctx.strokeStyle = '#ffffff44';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      offsetX + state.currentRoom.x * ts,
      offsetY + state.currentRoom.y * ts,
      state.currentRoom.width * ts,
      state.currentRoom.height * ts
    );
  }
}

/**
 * Draw POIs
 */
function drawPOIs(ctx, state, offsetX, offsetY, ts) {
  state.pois.forEach(poi => {
    const px = offsetX + poi.x * ts;
    const py = offsetY + poi.y * ts;
    
    switch (poi.type) {
      case 'chest':
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(px - 2, py - 2, 4, 4);
        break;
      case 'shrine':
        ctx.fillStyle = '#aaaaff';
        drawDiamond(ctx, px, py, 3);
        break;
      case 'boss':
        ctx.fillStyle = '#ff0000';
        drawStar(ctx, px, py, 4);
        break;
      case 'exit':
        ctx.fillStyle = '#00ffff';
        drawTriangle(ctx, px, py, 4);
        break;
      case 'npc':
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  });
}

/**
 * Draw entities
 */
function drawEntities(ctx, state, offsetX, offsetY, ts) {
  const config = MINIMAP_CONFIG;
  
  state.entities.forEach(entity => {
    if (!entity.visible) return;
    
    const ex = offsetX + entity.x * ts;
    const ey = offsetY + entity.y * ts;
    
    switch (entity.type) {
      case 'enemy':
        ctx.fillStyle = config.enemyColor;
        ctx.fillRect(ex - config.enemySize / 2, ey - config.enemySize / 2, 
          config.enemySize, config.enemySize);
        break;
      case 'boss':
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.arc(ex, ey, config.enemySize + 1, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'npc':
        ctx.fillStyle = config.npcColor;
        ctx.beginPath();
        ctx.arc(ex, ey, config.enemySize, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'item':
        ctx.fillStyle = config.itemColor;
        ctx.fillRect(ex - 1, ey - 1, 2, 2);
        break;
    }
  });
}

// ========== Controls ==========

/**
 * Toggle minimap expanded
 */
export function toggleExpanded(state) {
  state.expanded = !state.expanded;
}

/**
 * Toggle minimap visibility
 */
export function toggleMinimap(state) {
  state.enabled = !state.enabled;
}

/**
 * Zoom minimap
 */
export function zoomMinimap(state, delta) {
  state.zoom = clamp(
    state.zoom + delta * 0.1,
    MINIMAP_CONFIG.minZoom,
    MINIMAP_CONFIG.maxZoom
  );
}

/**
 * Reset zoom
 */
export function resetZoom(state) {
  state.zoom = MINIMAP_CONFIG.defaultZoom;
}

// ========== Helper Functions ==========

/**
 * Draw rounded rectangle path
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draw diamond shape
 */
function drawDiamond(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw triangle shape
 */
function drawTriangle(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y + size);
  ctx.lineTo(x - size, y + size);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw star shape
 */
function drawStar(ctx, x, y, size) {
  const spikes = 5;
  const outerRadius = size;
  const innerRadius = size * 0.5;
  
  ctx.beginPath();
  
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI / spikes) - Math.PI / 2;
    
    if (i === 0) {
      ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    } else {
      ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    }
  }
  
  ctx.closePath();
  ctx.fill();
}

export default {
  MINIMAP_CONFIG,
  
  // State
  createMinimapState,
  initMinimap,
  
  // Updates
  updateExplored,
  updateEntities,
  addPOI,
  clearPOIs,
  
  // Rendering
  drawMinimap,
  
  // Controls
  toggleExpanded,
  toggleMinimap,
  zoomMinimap,
  resetZoom,
};
