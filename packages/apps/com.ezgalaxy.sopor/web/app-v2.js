/**
 * SOPOR - Main Game Application
 * Orchestrator integrating all modules
 * 
 * @version 2.0.0
 */

// ========== Core Imports ==========
import { 
  TILE_SIZE, STRATA, RARITY, ENEMY_ARCHETYPE, 
  STATUS_EFFECTS, EQUIPMENT_SLOTS, GAME_STATE 
} from './core/constants.js';

import { 
  clamp, lerp, distance, randomBetween, 
  createRNG, isMobileDevice, getDevicePixelRatio 
} from './core/utils.js';

import { 
  initI18n, t, setLocale, toggleLocale, getCurrentLocale 
} from './core/i18n.js';

import { 
  loadSave, saveWorld, defaultWorldState, 
  SAVE_KEY, SAVE_VERSION 
} from './core/save-system.js';

// ========== Game Imports ==========
import { 
  WEAPONS, WEAPON_BEHAVIOR, getWeaponsByRarity, 
  getRandomWeapon 
} from './game/weapons.js';

import { 
  createCombatState, startAttack, updateCombat, 
  tryParry, applyStatusEffect, processCombatDamage 
} from './game/combat.js';

import { 
  ENEMY_ARCHETYPES, createEnemy, updateEnemy, 
  getArchetypeForStratum 
} from './game/ai-enemy.js';

import { 
  createPlayerProgression, addXP, levelUp, 
  unlockSkill, calculateStats, equipItem 
} from './game/progression.js';

import { 
  BOSSES, createBoss, updateBoss, 
  getBossForStratum, checkPhaseTransition 
} from './game/bosses.js';

import { 
  STORY_ACTS, createStoryState, advanceStory, 
  checkQuestProgress, getDialogue 
} from './game/story.js';

// ========== World Imports ==========
import { 
  generateWorld, createRoomData, 
  getBiomeConfig, placeDecorations 
} from './world/world-gen.js';

import { 
  DUNGEON_CONFIG, DUNGEON_THEMES, 
  generateDungeonFloor, getDungeonThemeForStratum 
} from './world/dungeons.js';

// ========== Graphics Imports ==========
import { 
  BIOME_PALETTES, generateFloorTile, generateWallTile, 
  generatePlayerSprite, generateEnemySprite, 
  generateWeaponIcon, clearTextureCache 
} from './graphics/textures.js';

import { 
  EASING, createAnimator, createTweenManager, 
  playAnimation, updateAnimator, updateTweens, 
  createWalkBob, createFloatingAnimation 
} from './graphics/animations.js';

import { 
  createParticleSystem, createEmitter, 
  createHitEffect, createDeathEffect, createDashTrailEffect, 
  updateParticles, drawParticles, createBiomeAmbientEffect 
} from './graphics/effects.js';

import { 
  createLightingSystem, addLight, updateLights, 
  renderLighting, createFogOfWar, updateFogVisibility, 
  applyBiomeLighting, createPlayerLight 
} from './graphics/lighting.js';

// ========== Audio Imports ==========
import { 
  initAudio, resumeAudio, setMasterVolume, setMusicVolume, 
  createSequencer, startMusic, updateMusic, stopMusic, 
  crossfadeMusic, BIOME_MUSIC 
} from './audio/music.js';

import { 
  setSfxVolume, playHitSound, playSlashSound, 
  playParrySound, playComboSound, playDashSound, 
  playHealSound, playLevelUpSound, playDeathSound, 
  playUIClick, playItemPickup, playChestOpen 
} from './audio/sfx.js';

// ========== UI Imports ==========
import { 
  createHUDState, drawHealthBar, drawManaBar, drawXPBar, 
  drawComboCounter, drawStatusEffects, drawNotifications, 
  addNotification, showDamageNumber, drawDamageNumbers, 
  drawBossHealthBar, updateCombo, addCombo, resetCombo 
} from './ui/hud.js';

import { 
  createMinimapState, initMinimap, updateExplored, 
  updateEntities, drawMinimap, addPOI, 
  toggleMinimap, toggleExpanded 
} from './ui/minimap.js';

import { 
  createPanelManager, openPanel, closePanel, 
  togglePanel, updatePanels, drawInventoryPanel, 
  drawSkillsPanel, drawEquipmentPanel, drawSettingsPanel 
} from './ui/panels.js';

import { 
  createTouchControls, initTouchLayout, 
  bindTouchEvents, updateTouchControls, 
  drawTouchControls, getMovementInput, 
  onMovement, onAttack, onDodge, onInteract, onMenu 
} from './ui/touch-controls.js';

// ========== Game Configuration ==========

const CONFIG = {
  // Canvas
  targetFPS: 60,
  maxDeltaTime: 100,
  
  // Player
  playerSpeed: 200,
  playerDashSpeed: 500,
  playerDashDuration: 200,
  playerDashCooldown: 500,
  
  // Camera
  cameraLerp: 0.1,
  cameraShakeDecay: 0.9,
  
  // Combat
  invincibilityTime: 500,
  hitStunTime: 200,
  
  // World
  roomWidth: 20,
  roomHeight: 15,
  
  // Debug
  showFPS: false,
  showHitboxes: false,
};

// ========== Game State ==========

let canvas, ctx;
let gameState = GAME_STATE.LOADING;
let lastTime = 0;
let deltaTime = 0;
let frameCount = 0;
let fps = 0;

// Systems
let lighting = null;
let fogOfWar = null;
let particles = null;
let musicSequencer = null;
let hud = null;
let minimap = null;
let panels = null;
let touchControls = null;

// Animations
let animator = null;
let tweens = null;

// World
let worldState = null;
let currentLevel = null;
let currentBiome = STRATA.JARDIN;

// Player
let player = null;
let playerCombat = null;
let playerProgression = null;

// Entities
let enemies = [];
let projectiles = [];
let items = [];
let npcs = [];

// Camera
let camera = { x: 0, y: 0, shakeX: 0, shakeY: 0 };

// Input
let keys = {};
let mouse = { x: 0, y: 0, down: false };

// ========== Initialization ==========

/**
 * Initialize game
 */
export async function init() {
  try {
    console.log('SOPOR v2.0.0 - Initializing...');
    
    // Initialize i18n first
    await initI18n();
    
    // Get or create canvas
    const app = document.getElementById('app');
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
      // Create wrapper and canvas structure
      const wrapper = document.createElement('div');
      wrapper.className = 'sopor-canvasWrap';
      
      canvas = document.createElement('canvas');
      canvas.id = 'gameCanvas';
      
      wrapper.appendChild(canvas);
      if (app) {
        app.innerHTML = ''; // Clear app
        app.appendChild(wrapper);
      } else {
        document.body.appendChild(wrapper);
      }
    }
    
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize audio
    initAudio();
    
    // Initialize systems
    initSystems();
  
  // Load save
  worldState = loadSave();
  if (!worldState) {
    worldState = defaultWorldState();
  }
  
  // Apply settings
  applySettings(worldState.settings);
  
  // Initialize player
  initPlayer();
  
  // Bind input
  bindInput();
  
  // Start game loop
  gameState = GAME_STATE.MENU;
  requestAnimationFrame(gameLoop);
  
  console.log('SOPOR initialized successfully');
  } catch (err) {
    console.error('SOPOR initialization failed:', err);
    // Display error on screen
    const app = document.getElementById('app') || document.body;
    app.innerHTML = `<div style="color:#ff4466;padding:20px;font-family:monospace;white-space:pre-wrap;">[SOPOR] Init error:\n${err?.stack || err}</div>`;
  }
}

/**
 * Resize canvas
 */
function resizeCanvas() {
  const dpr = getDevicePixelRatio();
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);
  
  // Update touch layout if mobile
  if (touchControls && touchControls.enabled) {
    initTouchLayout(touchControls, window.innerWidth, window.innerHeight);
  }
}

/**
 * Initialize game systems
 */
function initSystems() {
  // Lighting
  lighting = createLightingSystem();
  
  // Particles
  particles = createParticleSystem();
  
  // Music
  musicSequencer = createSequencer();
  
  // HUD
  hud = createHUDState();
  
  // Minimap
  minimap = createMinimapState();
  
  // Panels
  panels = createPanelManager();
  
  // Touch controls
  touchControls = createTouchControls();
  if (touchControls.enabled) {
    initTouchLayout(touchControls, window.innerWidth, window.innerHeight);
    bindTouchEvents(canvas, touchControls);
    
    // Bind callbacks
    onMovement(touchControls, handleTouchMove);
    onAttack(touchControls, handleAttack);
    onDodge(touchControls, handleDodge);
    onInteract(touchControls, handleInteract);
    onMenu(touchControls, () => togglePanel(panels, 'inventory'));
  }
  
  // Animations
  animator = createAnimator();
  tweens = createTweenManager();
}

/**
 * Initialize player
 */
function initPlayer() {
  player = {
    x: 0,
    y: 0,
    width: 24,
    height: 32,
    vx: 0,
    vy: 0,
    facing: 1,
    health: 100,
    maxHealth: 100,
    mana: 50,
    maxMana: 50,
    invincible: false,
    invincibleTimer: 0,
    dashing: false,
    dashTimer: 0,
    dashCooldown: 0,
    weapon: WEAPONS['epee_rouille'],
  };
  
  playerCombat = createCombatState();
  playerProgression = createPlayerProgression();
}

/**
 * Apply settings
 */
function applySettings(settings) {
  if (!settings) return;
  
  setLocale(settings.language || 'fr');
  setMasterVolume(settings.masterVolume ?? 0.7);
  setMusicVolume(settings.musicVolume ?? 0.5);
  setSfxVolume(settings.sfxVolume ?? 0.7);
  CONFIG.showFPS = settings.showFPS ?? false;
}

// ========== Input Handling ==========

/**
 * Bind input events
 */
function bindInput() {
  // Keyboard
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    handleKeyDown(e.code);
  });
  
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });
  
  // Mouse
  canvas.addEventListener('mousedown', (e) => {
    mouse.down = true;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    handleClick(e);
  });
  
  canvas.addEventListener('mouseup', () => {
    mouse.down = false;
  });
  
  canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  
  // Touch (for audio unlock)
  canvas.addEventListener('touchstart', () => {
    resumeAudio();
  }, { once: true });
  
  canvas.addEventListener('click', () => {
    resumeAudio();
  }, { once: true });
}

/**
 * Handle key down
 */
function handleKeyDown(code) {
  switch (code) {
    case 'Space':
    case 'KeyZ':
      handleAttack();
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      handleDodge();
      break;
    case 'KeyE':
      handleInteract();
      break;
    case 'KeyI':
      togglePanel(panels, 'inventory');
      break;
    case 'KeyK':
      togglePanel(panels, 'skills');
      break;
    case 'KeyP':
      togglePanel(panels, 'settings');
      break;
    case 'KeyM':
      toggleMinimap(minimap);
      break;
    case 'Tab':
      toggleExpanded(minimap);
      break;
    case 'Escape':
      if (panels.activePanel) {
        closePanel(panels);
      } else if (gameState === GAME_STATE.PLAYING) {
        gameState = GAME_STATE.PAUSED;
      } else if (gameState === GAME_STATE.PAUSED) {
        gameState = GAME_STATE.PLAYING;
      }
      break;
    case 'Enter':
      if (gameState === GAME_STATE.MENU) {
        startGame();
      }
      break;
  }
}

/**
 * Handle click
 */
function handleClick(e) {
  if (gameState === GAME_STATE.MENU) {
    startGame();
  } else if (gameState === GAME_STATE.PLAYING && !panels.activePanel) {
    handleAttack();
  }
}

/**
 * Handle touch movement
 */
function handleTouchMove(dx, dy) {
  if (!player) return;
  player.vx = dx * CONFIG.playerSpeed;
  player.vy = dy * CONFIG.playerSpeed;
}

/**
 * Handle attack
 */
function handleAttack() {
  if (gameState !== GAME_STATE.PLAYING || panels.activePanel) return;
  
  if (!playerCombat.attacking) {
    startAttack(playerCombat, player.weapon);
    playSlashSound();
    
    // Find enemies in range
    const attackRange = player.weapon.range || 40;
    for (const enemy of enemies) {
      const dist = distance(player.x, player.y, enemy.x, enemy.y);
      if (dist <= attackRange) {
        // Check if facing enemy
        const dx = enemy.x - player.x;
        if ((dx > 0 && player.facing > 0) || (dx < 0 && player.facing < 0)) {
          dealDamage(enemy, playerCombat.damage);
        }
      }
    }
  }
}

/**
 * Handle dodge/dash
 */
function handleDodge() {
  if (gameState !== GAME_STATE.PLAYING || panels.activePanel) return;
  
  if (!player.dashing && player.dashCooldown <= 0) {
    player.dashing = true;
    player.dashTimer = CONFIG.playerDashDuration;
    player.dashCooldown = CONFIG.playerDashCooldown;
    player.invincible = true;
    player.invincibleTimer = CONFIG.playerDashDuration;
    playDashSound();
    
    // Create dash trail
    createDashTrailEffect(particles, player.x, player.y);
  }
}

/**
 * Handle interact
 */
function handleInteract() {
  if (gameState !== GAME_STATE.PLAYING) return;
  
  // Check for nearby interactables
  for (const item of items) {
    const dist = distance(player.x, player.y, item.x, item.y);
    if (dist <= 40) {
      pickupItem(item);
      return;
    }
  }
  
  // Check NPCs
  for (const npc of npcs) {
    const dist = distance(player.x, player.y, npc.x, npc.y);
    if (dist <= 50) {
      // Show dialogue
      // TODO: Implement NPC dialogue
      return;
    }
  }
}

// ========== Game Loop ==========

/**
 * Main game loop
 */
function gameLoop(timestamp) {
  // Calculate delta time
  deltaTime = Math.min(timestamp - lastTime, CONFIG.maxDeltaTime);
  lastTime = timestamp;
  
  // FPS calculation
  frameCount++;
  if (frameCount >= 30) {
    fps = Math.round(1000 / deltaTime);
    frameCount = 0;
  }
  
  // Update
  update(deltaTime);
  
  // Render
  render();
  
  // Continue loop
  requestAnimationFrame(gameLoop);
}

/**
 * Update game state
 */
function update(dt) {
  // Update music
  updateMusic(musicSequencer, performance.now());
  
  // Update animations
  updateAnimator(animator, dt);
  updateTweens(tweens, dt);
  
  // Update panels
  updatePanels(panels, dt);
  
  // Update touch controls
  if (touchControls.enabled) {
    updateTouchControls(touchControls, dt);
  }
  
  switch (gameState) {
    case GAME_STATE.PLAYING:
      updatePlaying(dt);
      break;
    case GAME_STATE.PAUSED:
      // Pause state - no updates
      break;
    case GAME_STATE.MENU:
      // Menu state
      break;
  }
}

/**
 * Update playing state
 */
function updatePlaying(dt) {
  // Update player
  updatePlayer(dt);
  
  // Update enemies
  for (const enemy of enemies) {
    updateEnemy(enemy, player, dt);
  }
  
  // Remove dead enemies
  enemies = enemies.filter(e => e.health > 0);
  
  // Update projectiles
  updateProjectiles(dt);
  
  // Update particles
  updateParticles(particles, dt);
  
  // Update lighting
  updateLights(lighting, dt);
  
  // Update fog of war
  if (fogOfWar) {
    updateFogVisibility(fogOfWar, player.x, player.y);
  }
  
  // Update minimap
  updateExplored(minimap, player.x, player.y);
  updateEntities(minimap, enemies.map(e => ({
    x: e.x, y: e.y, type: 'enemy', visible: true
  })));
  
  // Update HUD
  updateCombo(hud, dt);
  
  // Update camera
  updateCamera(dt);
  
  // Check collisions
  checkCollisions();
}

/**
 * Update player
 */
function updatePlayer(dt) {
  // Get input
  let inputX = 0;
  let inputY = 0;
  
  if (!touchControls.enabled) {
    if (keys['KeyA'] || keys['ArrowLeft']) inputX -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) inputX += 1;
    if (keys['KeyW'] || keys['ArrowUp']) inputY -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) inputY += 1;
  } else {
    const touchInput = getMovementInput(touchControls);
    inputX = touchInput.x;
    inputY = touchInput.y;
  }
  
  // Normalize diagonal movement
  if (inputX !== 0 && inputY !== 0) {
    const mag = Math.sqrt(inputX * inputX + inputY * inputY);
    inputX /= mag;
    inputY /= mag;
  }
  
  // Apply movement
  if (player.dashing) {
    // Dash movement
    player.dashTimer -= dt;
    if (player.dashTimer <= 0) {
      player.dashing = false;
      player.invincible = false;
    }
    
    player.x += player.facing * CONFIG.playerDashSpeed * dt / 1000;
  } else {
    // Normal movement
    player.vx = inputX * CONFIG.playerSpeed;
    player.vy = inputY * CONFIG.playerSpeed;
    
    player.x += player.vx * dt / 1000;
    player.y += player.vy * dt / 1000;
    
    // Update facing
    if (inputX !== 0) {
      player.facing = inputX > 0 ? 1 : -1;
    }
  }
  
  // Update cooldowns
  if (player.dashCooldown > 0) {
    player.dashCooldown -= dt;
  }
  
  if (player.invincibleTimer > 0) {
    player.invincibleTimer -= dt;
    if (player.invincibleTimer <= 0) {
      player.invincible = false;
    }
  }
  
  // Update combat
  updateCombat(playerCombat, dt);
  
  // Update player light position
  const playerLight = lighting.lights.find(l => l.id === 'player_light');
  if (playerLight) {
    playerLight.x = player.x;
    playerLight.y = player.y;
  }
}

/**
 * Update projectiles
 */
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    
    proj.x += proj.vx * dt / 1000;
    proj.y += proj.vy * dt / 1000;
    proj.lifetime -= dt;
    
    if (proj.lifetime <= 0) {
      projectiles.splice(i, 1);
      continue;
    }
    
    // Check collision with player
    if (proj.hostile) {
      const dist = distance(proj.x, proj.y, player.x, player.y);
      if (dist <= proj.radius + player.width / 2) {
        if (!player.invincible) {
          damagePlayer(proj.damage);
        }
        projectiles.splice(i, 1);
      }
    }
  }
}

/**
 * Update camera
 */
function updateCamera(dt) {
  const targetX = player.x - window.innerWidth / 2;
  const targetY = player.y - window.innerHeight / 2;
  
  camera.x = lerp(camera.x, targetX, CONFIG.cameraLerp);
  camera.y = lerp(camera.y, targetY, CONFIG.cameraLerp);
  
  // Decay shake
  camera.shakeX *= CONFIG.cameraShakeDecay;
  camera.shakeY *= CONFIG.cameraShakeDecay;
}

/**
 * Check collisions
 */
function checkCollisions() {
  // Enemy collision with player
  for (const enemy of enemies) {
    const dist = distance(player.x, player.y, enemy.x, enemy.y);
    if (dist <= player.width / 2 + enemy.width / 2) {
      if (!player.invincible && enemy.canAttack) {
        damagePlayer(enemy.damage);
      }
    }
  }
}

// ========== Combat Functions ==========

/**
 * Deal damage to enemy
 */
function dealDamage(enemy, damage) {
  const actualDamage = damage * (1 - enemy.armor / 100);
  enemy.health -= actualDamage;
  
  playHitSound(1, enemy.metallic);
  createHitEffect(particles, enemy.x, enemy.y);
  showDamageNumber(enemy.x, enemy.y - 20, actualDamage, { color: '#ffffff' });
  
  addCombo(hud);
  playComboSound(hud.comboCount);
  
  if (enemy.health <= 0) {
    killEnemy(enemy);
  }
}

/**
 * Kill enemy
 */
function killEnemy(enemy) {
  createDeathEffect(particles, enemy.x, enemy.y);
  
  // Award XP
  const xpGained = addXP(playerProgression, enemy.xpValue || 10);
  showDamageNumber(enemy.x, enemy.y, xpGained, { color: '#ffcc44' });
  
  // Check level up
  if (playerProgression.pendingLevelUp) {
    levelUp(playerProgression);
    playLevelUpSound();
    addNotification(hud, t('notification.level_up', { level: playerProgression.level }), {
      color: '#ffcc44',
      size: 20,
    });
  }
  
  // Drop loot
  if (Math.random() < enemy.dropChance) {
    spawnItem(enemy.x, enemy.y, getRandomWeapon(enemy.dropRarity || RARITY.COMMON));
  }
}

/**
 * Damage player
 */
function damagePlayer(damage) {
  const actualDamage = damage * (1 - playerProgression.stats.defense / 100);
  player.health -= actualDamage;
  
  playHitSound(1, false);
  showDamageNumber(player.x, player.y - 20, actualDamage, { color: '#ff4444' });
  
  player.invincible = true;
  player.invincibleTimer = CONFIG.invincibilityTime;
  
  resetCombo(hud);
  
  // Camera shake
  camera.shakeX = randomBetween(-10, 10);
  camera.shakeY = randomBetween(-10, 10);
  
  if (player.health <= 0) {
    playerDeath();
  }
}

/**
 * Player death
 */
function playerDeath() {
  playDeathSound();
  gameState = GAME_STATE.GAME_OVER;
  
  // Save progress
  saveWorld(worldState);
}

// ========== Item Functions ==========

/**
 * Spawn item
 */
function spawnItem(x, y, itemData) {
  items.push({
    x,
    y,
    ...itemData,
    bobOffset: Math.random() * Math.PI * 2,
  });
  
  addPOI(minimap, x, y, 'chest');
}

/**
 * Pickup item
 */
function pickupItem(item) {
  // Add to inventory
  worldState.inventory.push(item);
  
  // Remove from world
  const idx = items.indexOf(item);
  if (idx !== -1) items.splice(idx, 1);
  
  playItemPickup(item.rarity);
  addNotification(hud, t('notification.item_pickup', { name: item.name }), {
    color: '#ffaa00',
  });
}

// ========== Level Functions ==========

/**
 * Start game
 */
function startGame() {
  gameState = GAME_STATE.PLAYING;
  
  // Generate starting level
  loadLevel(STRATA.JARDIN, 1);
  
  // Start music
  startMusic(musicSequencer, 'jardin');
}

/**
 * Load level
 */
function loadLevel(biome, floor) {
  currentBiome = biome;
  
  // Generate world with seed based on world state or time
  const seed = worldState?.seed || Date.now();
  const worldData = generateWorld(seed, biome);
  currentLevel = worldData;
  
  // Initialize fog of war
  fogOfWar = createFogOfWar(
    worldData.tileMap.width * TILE_SIZE, 
    worldData.tileMap.height * TILE_SIZE
  );
  
  // Initialize minimap
  initMinimap(minimap, {
    tiles: worldData.tileMap.tiles,
    width: worldData.tileMap.width,
    height: worldData.tileMap.height,
  });
  
  // Apply biome lighting
  applyBiomeLighting(lighting, worldData.stratum);
  
  // Add player light
  createPlayerLight(lighting, player.x, player.y);
  
  // Spawn enemies
  enemies = [];
  for (let i = 0; i < 5; i++) {
    const archetype = getArchetypeForStratum(biome);
    const enemy = createEnemy(archetype, 
      randomBetween(100, worldData.tileMap.width * TILE_SIZE - 100),
      randomBetween(100, worldData.tileMap.height * TILE_SIZE - 100)
    );
    enemies.push(enemy);
  }
  
  // Position player at spawn (spawnPoint is already in pixels)
  player.x = worldData.spawnPoint.x;
  player.y = worldData.spawnPoint.y;
  
  // Reset camera
  camera.x = player.x - window.innerWidth / 2;
  camera.y = player.y - window.innerHeight / 2;
  
  // Add ambient effects
  createBiomeAmbientEffect(particles, worldData.stratum, 
    worldData.tileMap.width * TILE_SIZE, 
    worldData.tileMap.height * TILE_SIZE
  );
}

// ========== Rendering ==========

/**
 * Render game
 */
function render() {
  // Clear canvas
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  switch (gameState) {
    case GAME_STATE.PLAYING:
    case GAME_STATE.PAUSED:
      renderPlaying();
      break;
    case GAME_STATE.MENU:
      renderMenu();
      break;
    case GAME_STATE.GAME_OVER:
      renderGameOver();
      break;
  }
  
  // Draw panels on top
  if (panels.activePanel && panels.panelAlpha > 0) {
    ctx.globalAlpha = panels.panelAlpha;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.globalAlpha = 1;
    
    switch (panels.activePanel) {
      case 'inventory':
        drawInventoryPanel(ctx, panels, worldState.inventory, 
          window.innerWidth, window.innerHeight);
        break;
      case 'skills':
        drawSkillsPanel(ctx, panels, playerProgression.skills, 
          playerProgression.skillPoints, window.innerWidth, window.innerHeight);
        break;
      case 'equipment':
        drawEquipmentPanel(ctx, panels, playerProgression.equipment, 
          worldState.inventory, window.innerWidth, window.innerHeight);
        break;
      case 'settings':
        drawSettingsPanel(ctx, panels, worldState.settings, 
          window.innerWidth, window.innerHeight);
        break;
    }
  }
  
  // FPS counter
  if (CONFIG.showFPS) {
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`FPS: ${fps}`, 10, 20);
  }
}

/**
 * Render playing state
 */
function renderPlaying() {
  const camX = camera.x + camera.shakeX;
  const camY = camera.y + camera.shakeY;
  
  ctx.save();
  ctx.translate(-camX, -camY);
  
  // Draw world
  if (currentLevel && currentLevel.tileMap) {
    renderWorld(ctx, currentLevel.tileMap, camX, camY);
  }
  
  // Draw items
  for (const item of items) {
    const bob = Math.sin(performance.now() * 0.003 + item.bobOffset) * 3;
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(item.x - 8, item.y - 8 + bob, 16, 16);
  }
  
  // Draw enemies
  for (const enemy of enemies) {
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, 
      enemy.width, enemy.height);
  }
  
  // Draw player
  const playerAlpha = player.invincible ? 
    0.5 + Math.sin(performance.now() * 0.02) * 0.3 : 1;
  ctx.globalAlpha = playerAlpha;
  ctx.fillStyle = '#44ff44';
  ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2,
    player.width, player.height);
  ctx.globalAlpha = 1;
  
  // Draw particles
  drawParticles(particles, ctx, camX, camY);
  
  // Draw damage numbers
  drawDamageNumbers(ctx, camX, camY);
  
  ctx.restore();
  
  // Draw lighting (screen space)
  renderLighting(lighting, ctx, camX, camY, window.innerWidth, window.innerHeight);
  
  // Draw HUD
  drawHealthBar(ctx, hud, player.health, player.maxHealth, 0, 0);
  drawManaBar(ctx, hud, player.mana, player.maxMana, 0, 0);
  drawXPBar(ctx, hud, playerProgression.xp, playerProgression.xpToNext, 
    playerProgression.level, 0, 0);
  drawComboCounter(ctx, hud, window.innerWidth / 2, 100);
  drawStatusEffects(ctx, hud, 20, 100);
  drawNotifications(ctx, hud, window.innerWidth, window.innerHeight);
  
  // Draw minimap
  drawMinimap(ctx, minimap, player.x, player.y, currentBiome, window.innerWidth);
  
  // Draw touch controls
  if (touchControls.enabled) {
    drawTouchControls(ctx, touchControls);
  }
  
  // Pause overlay
  if (gameState === GAME_STATE.PAUSED) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(t('pause.title'), window.innerWidth / 2, window.innerHeight / 2);
    
    ctx.font = '20px monospace';
    ctx.fillText(t('pause.continue'), window.innerWidth / 2, window.innerHeight / 2 + 50);
  }
}

/**
 * Convert hex number to CSS color string
 */
function hexToCSS(hex) {
  if (typeof hex === 'string') return hex;
  if (Array.isArray(hex)) hex = hex[0]; // Use first color if array
  return '#' + hex.toString(16).padStart(6, '0');
}

/**
 * Render world tiles
 */
function renderWorld(ctx, level, camX, camY) {
  const startTileX = Math.max(0, Math.floor(camX / TILE_SIZE));
  const startTileY = Math.max(0, Math.floor(camY / TILE_SIZE));
  const endTileX = Math.min(level.width, Math.ceil((camX + window.innerWidth) / TILE_SIZE) + 1);
  const endTileY = Math.min(level.height, Math.ceil((camY + window.innerHeight) / TILE_SIZE) + 1);
  
  const palette = BIOME_PALETTES[currentBiome] || BIOME_PALETTES[STRATA.JARDIN];
  const wallColor = hexToCSS(palette.wall);
  const floorColor = hexToCSS(palette.floor);
  
  for (let y = startTileY; y < endTileY; y++) {
    for (let x = startTileX; x < endTileX; x++) {
      const tile = level.tiles[y * level.width + x];
      
      ctx.fillStyle = tile === 1 ? wallColor : floorColor;
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}

/**
 * Render menu
 */
function renderMenu() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  
  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SOPOR', window.innerWidth / 2, window.innerHeight / 3);
  
  // Subtitle
  ctx.font = '24px monospace';
  ctx.fillStyle = '#888888';
  ctx.fillText(t('menu.subtitle'), window.innerWidth / 2, window.innerHeight / 3 + 50);
  
  // Start prompt
  const pulse = 0.5 + Math.sin(performance.now() * 0.003) * 0.3;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px monospace';
  ctx.fillText(t('menu.start'), window.innerWidth / 2, window.innerHeight / 2 + 100);
  ctx.globalAlpha = 1;
  
  // Touch controls on mobile
  if (touchControls.enabled) {
    drawTouchControls(ctx, touchControls);
  }
}

/**
 * Render game over
 */
function renderGameOver() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(t('game_over.title'), window.innerWidth / 2, window.innerHeight / 2 - 50);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px monospace';
  ctx.fillText(t('game_over.continue'), window.innerWidth / 2, window.innerHeight / 2 + 50);
}

// ========== Exports ==========

export {
  gameState,
  player,
  worldState,
  CONFIG,
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init().catch(console.error));
} else {
  init().catch(console.error);
}
