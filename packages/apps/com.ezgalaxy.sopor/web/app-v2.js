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
  getRandomWeapon, getWeaponById 
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
  createPlayerProgression, addXP, 
  calculateFinalStats as calculateStats, equipItem 
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
  // Get starter weapon - fallback to first weapon if not found
  const starterWeapon = getWeaponById('sword_neon') || WEAPONS[0];
  
  // Initialize progression first
  playerProgression = createPlayerProgression();
  playerProgression.xpToNext = 100; // First level XP requirement
  playerProgression.stats = calculateStats(1, {}, {});
  
  // Use calculated stats for player
  const stats = playerProgression.stats || { hp: 100, mana: 50 };
  
  player = {
    x: 0,
    y: 0,
    width: 24,
    height: 32,
    vx: 0,
    vy: 0,
    facing: 1,
    health: stats.hp || 100,
    maxHealth: stats.hpMax || stats.hp || 100,
    mana: stats.mana || 50,
    maxMana: stats.manaMax || stats.mana || 50,
    invincible: false,
    invincibleTimer: 0,
    dashing: false,
    dashTimer: 0,
    dashCooldown: 0,
    weapon: starterWeapon,
  };
  
  playerCombat = createCombatState();
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
  if (!player || !player.weapon) return;
  
  if (!playerCombat.attacking) {
    playerCombat.attacking = true;
    playerCombat.attackTimer = player.weapon.cooldownMs || 300;
    playSlashSound();
    
    // Create attack visual effect
    const attackAngle = player.facing > 0 ? 0 : Math.PI;
    createHitEffect(particles, 
      player.x + player.facing * 20, 
      player.y - 5
    );
    
    // Find enemies in range - use reach property with fallback
    const attackRange = player.weapon.reach || player.weapon.radius || 40;
    const baseDamage = player.weapon.damage || 5;
    const arcDeg = player.weapon.arcDeg || 90;
    
    for (const enemy of enemies) {
      const dist = distance(player.x, player.y, enemy.x, enemy.y);
      if (dist <= attackRange) {
        // Check if facing enemy (or if it's a slam weapon with 360 range)
        const dx = enemy.x - player.x;
        const isFacingEnemy = (dx > 0 && player.facing > 0) || (dx < 0 && player.facing < 0);
        const isAOEAttack = player.weapon.behaviorId === 'melee_slam' || arcDeg >= 360;
        
        if (isFacingEnemy || isAOEAttack) {
          dealDamage(enemy, baseDamage);
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
  
  // Update enemies using AI system
  for (const enemy of enemies) {
    const decision = updateEnemy(enemy, player, enemies, dt);
    if (decision) {
      // Apply AI decision
      enemy.x += (decision.moveX || 0) * dt / 1000;
      enemy.y += (decision.moveY || 0) * dt / 1000;
      
      // Handle enemy attack
      if (decision.shouldAttack && decision.attackTarget) {
        // Spawn projectile or melee attack
        if (decision.special?.type === 'projectile') {
          const angleToPlayer = Math.atan2(
            player.y - enemy.y,
            player.x - enemy.x
          );
          projectiles.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angleToPlayer) * (decision.special.speed || 200),
            vy: Math.sin(angleToPlayer) * (decision.special.speed || 200),
            damage: decision.special.damage || enemy.stats.damage,
            hostile: true,
            radius: 8,
            lifetime: 3000,
          });
        }
      }
    }
  }
  
  // Remove dead enemies
  enemies = enemies.filter(e => e.stats && e.stats.hp > 0);
  
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
  
  // Update attack cooldown
  if (playerCombat.attacking) {
    playerCombat.attackTimer -= dt;
    if (playerCombat.attackTimer <= 0) {
      playerCombat.attacking = false;
    }
  }
  
  // Update combat
  updateCombat(playerCombat, dt);
  
  // Update player light position
  const playerLight = lighting.lights?.find(l => l.id === 'player_light');
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
  // Enemy collision with player - use fixed enemy size
  const enemyCollisionRadius = 14;
  
  for (const enemy of enemies) {
    if (!enemy.stats) continue;
    
    const dist = distance(player.x, player.y, enemy.x, enemy.y);
    if (dist <= player.width / 2 + enemyCollisionRadius) {
      if (!player.invincible) {
        damagePlayer(enemy.stats.damage || 5);
      }
    }
  }
}

// ========== Combat Functions ==========

/**
 * Deal damage to enemy
 */
function dealDamage(enemy, damage) {
  if (!enemy || !enemy.stats) return;
  
  const actualDamage = Math.max(1, damage * (1 - (enemy.stats.armor || 0) / 100));
  enemy.stats.hp -= actualDamage;
  
  playHitSound(1, false);
  createHitEffect(particles, enemy.x, enemy.y);
  showDamageNumber(enemy.x, enemy.y - 20, Math.round(actualDamage), { color: '#ffffff' });
  
  addCombo(hud);
  playComboSound(hud.comboCount);
  
  if (enemy.stats.hp <= 0) {
    killEnemy(enemy);
  }
}

/**
 * Kill enemy
 */
function killEnemy(enemy) {
  createDeathEffect(particles, enemy.x, enemy.y);
  
  // Track stats
  if (!worldState.stats) {
    worldState.stats = { enemiesKilled: 0, damageDealt: 0, damageTaken: 0 };
  }
  worldState.stats.enemiesKilled = (worldState.stats.enemiesKilled || 0) + 1;
  
  // Award XP based on enemy type
  const baseXP = {
    skirmisher: 8,
    charger: 12,
    spitter: 10,
    gunner: 15,
    lurker: 18,
    summoner: 25,
    berserker: 20,
    sniper: 22,
    healer: 15,
    tank: 30,
    assassin: 25,
    necromancer: 35,
  };
  const xpValue = baseXP[enemy.archetype] || 10;
  
  // Add XP and check for level up
  const oldLevel = playerProgression.level;
  const xpResult = addXP(playerProgression, xpValue);
  
  // Update progression state
  if (typeof xpResult === 'object') {
    playerProgression.xp = xpResult.newXp;
    playerProgression.level = xpResult.newLevel;
    playerProgression.xpToNext = xpResult.xpToNext;
    
    showDamageNumber(enemy.x, enemy.y - 10, `+${xpValue} XP`, { color: '#ffcc44' });
    
    // Check level up
    if (xpResult.levelUps > 0) {
      playLevelUpSound();
      addNotification(hud, t('notification.level_up', { level: playerProgression.level }) || `Niveau ${playerProgression.level}!`, {
        color: '#ffcc44',
        size: 20,
      });
      
      // Recalculate stats on level up
      playerProgression.stats = calculateStats(playerProgression.level, playerProgression.skills || {}, playerProgression.equipment || {});
      
      // Heal on level up
      player.maxHealth = playerProgression.stats?.hp || 100;
      player.health = player.maxHealth;
    }
  } else {
    showDamageNumber(enemy.x, enemy.y - 10, `+${xpValue} XP`, { color: '#ffcc44' });
  }
  
  // Drop loot chance based on enemy type
  const dropChance = {
    skirmisher: 0.05,
    charger: 0.08,
    spitter: 0.06,
    gunner: 0.10,
    lurker: 0.12,
    summoner: 0.15,
    berserker: 0.12,
    sniper: 0.14,
    healer: 0.08,
    tank: 0.18,
    assassin: 0.15,
    necromancer: 0.20,
  };
  
  if (Math.random() < (dropChance[enemy.archetype] || 0.08)) {
    // Create a random weapon drop
    const rng = { next: Math.random };
    const droppedWeapon = getRandomWeapon(rng);
    if (droppedWeapon) {
      spawnItem(enemy.x, enemy.y, droppedWeapon);
    }
  }
}

/**
 * Damage player
 */
function damagePlayer(damage) {
  if (!player || !playerProgression) return;
  
  // Calculate damage reduction from defense
  const defenseValue = playerProgression.stats?.defense || 0;
  const actualDamage = Math.max(1, Math.round(damage * (1 - defenseValue / 100)));
  player.health -= actualDamage;
  
  playHitSound(1, false);
  showDamageNumber(player.x, player.y - 20, Math.round(actualDamage), { color: '#ff4444' });
  
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
  // Ensure inventory exists
  if (!worldState.player) worldState.player = {};
  if (!worldState.player.inventory) worldState.player.inventory = { items: [], weapons: [] };
  
  // Add to appropriate inventory
  if (item.type === 'weapon' || item.behaviorId) {
    worldState.player.inventory.weapons = worldState.player.inventory.weapons || [];
    worldState.player.inventory.weapons.push(item.id);
  } else {
    worldState.player.inventory.items = worldState.player.inventory.items || [];
    worldState.player.inventory.items.push(item);
  }
  
  // Remove from world
  const idx = items.indexOf(item);
  if (idx !== -1) items.splice(idx, 1);
  
  playItemPickup(item.rarity);
  addNotification(hud, t('notification.item_pickup', { name: item.nameKey || item.id || 'Objet' }), {
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
  
  // Draw items with glow effect
  for (const item of items) {
    const bob = Math.sin(performance.now() * 0.003 + item.bobOffset) * 3;
    const pulse = 0.8 + Math.sin(performance.now() * 0.005) * 0.2;
    
    // Glow
    const rarityColors = {
      common: '#888888',
      uncommon: '#44ff66',
      rare: '#4488ff',
      epic: '#aa44ff',
      legendary: '#ffaa00',
    };
    const glowColor = rarityColors[item.rarity] || '#ffaa00';
    
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10 * pulse;
    
    // Item background
    ctx.fillStyle = '#333333';
    ctx.fillRect(item.x - 10, item.y - 10 + bob, 20, 20);
    
    // Item border
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(item.x - 10, item.y - 10 + bob, 20, 20);
    
    // Simple weapon icon
    ctx.fillStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(item.x, item.y - 6 + bob);
    ctx.lineTo(item.x + 6, item.y + bob);
    ctx.lineTo(item.x, item.y + 6 + bob);
    ctx.lineTo(item.x - 6, item.y + bob);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
  }
  
  // Draw projectiles
  for (const proj of projectiles) {
    ctx.fillStyle = proj.hostile ? '#ff4444' : '#44ff44';
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius || 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Trail effect
    ctx.fillStyle = proj.hostile ? 'rgba(255, 68, 68, 0.3)' : 'rgba(68, 255, 68, 0.3)';
    ctx.beginPath();
    ctx.arc(proj.x - proj.vx * 0.02, proj.y - proj.vy * 0.02, (proj.radius || 6) * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Draw enemies with pixel art style
  for (const enemy of enemies) {
    const enemySize = 28;
    const halfSize = enemySize / 2;
    
    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + halfSize - 2, halfSize * 0.8, halfSize * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Enemy body color based on archetype
    const archetypeColors = {
      skirmisher: '#ff4444',
      charger: '#ff8844',
      spitter: '#44ff66',
      gunner: '#888899',
      lurker: '#884488',
      summoner: '#aa44cc',
      berserker: '#ff2222',
      sniper: '#4466aa',
      healer: '#44ffaa',
      tank: '#666677',
      assassin: '#333344',
      necromancer: '#550055',
    };
    const bodyColor = archetypeColors[enemy.archetype] || '#ff4444';
    
    // Draw body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, halfSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(enemy.x - 4, enemy.y - 4, halfSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(enemy.x - 5, enemy.y - 3, 4, 0, Math.PI * 2);
    ctx.arc(enemy.x + 5, enemy.y - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(enemy.x - 4, enemy.y - 3, 2, 0, Math.PI * 2);
    ctx.arc(enemy.x + 6, enemy.y - 3, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Health bar above enemy
    const healthPercent = enemy.stats.hp / enemy.stats.hpMax;
    const barWidth = enemySize;
    const barHeight = 4;
    const barY = enemy.y - halfSize - 8;
    
    ctx.fillStyle = '#333333';
    ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth, barHeight);
    ctx.fillStyle = healthPercent > 0.3 ? '#44ff44' : '#ff4444';
    ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
  }
  
  // Draw player with pixel art style
  const playerAlpha = player.invincible ? 
    0.5 + Math.sin(performance.now() * 0.02) * 0.3 : 1;
  ctx.globalAlpha = playerAlpha;
  
  // Player shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + player.height / 2 - 4, player.width * 0.4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Player body (hero character)
  const bodyColor = '#4488ff';
  const bodyDark = '#2266cc';
  const skinColor = '#ffcc99';
  
  // Legs (simple rectangles)
  ctx.fillStyle = '#333355';
  ctx.fillRect(player.x - 6, player.y + 4, 5, 12);
  ctx.fillRect(player.x + 1, player.y + 4, 5, 12);
  
  // Body
  ctx.fillStyle = bodyColor;
  ctx.fillRect(player.x - 8, player.y - 8, 16, 16);
  
  // Body highlight
  ctx.fillStyle = '#66aaff';
  ctx.fillRect(player.x - 8, player.y - 8, 4, 8);
  
  // Head
  ctx.fillStyle = skinColor;
  ctx.fillRect(player.x - 6, player.y - 18, 12, 12);
  
  // Hair
  ctx.fillStyle = '#553322';
  ctx.fillRect(player.x - 6, player.y - 20, 12, 5);
  ctx.fillRect(player.x - 7, player.y - 18, 3, 4);
  
  // Eyes
  const eyeOffsetX = player.facing > 0 ? 2 : -2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(player.x - 3 + eyeOffsetX, player.y - 14, 3, 3);
  ctx.fillRect(player.x + 2 + eyeOffsetX, player.y - 14, 3, 3);
  
  ctx.fillStyle = '#333333';
  ctx.fillRect(player.x - 2 + eyeOffsetX + (player.facing > 0 ? 1 : 0), player.y - 13, 2, 2);
  ctx.fillRect(player.x + 3 + eyeOffsetX + (player.facing > 0 ? 1 : 0), player.y - 13, 2, 2);
  
  // Weapon (simple sword)
  if (player.weapon) {
    const weaponOffsetX = player.facing > 0 ? 10 : -18;
    const weaponAngle = playerCombat.attacking ? 
      (Math.sin(performance.now() * 0.03) * 0.5 - 0.8) : 0;
    
    ctx.save();
    ctx.translate(player.x + weaponOffsetX + 4, player.y - 2);
    ctx.rotate(weaponAngle * player.facing);
    
    // Blade
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(-2, -20, 4, 18);
    
    // Blade highlight
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -20, 1, 18);
    
    // Guard
    ctx.fillStyle = '#886622';
    ctx.fillRect(-4, -2, 8, 3);
    
    // Handle
    ctx.fillStyle = '#553311';
    ctx.fillRect(-1, 1, 3, 8);
    
    ctx.restore();
  }
  
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
 * Render world tiles with pixel art style
 */
function renderWorld(ctx, level, camX, camY) {
  const startTileX = Math.max(0, Math.floor(camX / TILE_SIZE));
  const startTileY = Math.max(0, Math.floor(camY / TILE_SIZE));
  const endTileX = Math.min(level.width, Math.ceil((camX + window.innerWidth) / TILE_SIZE) + 1);
  const endTileY = Math.min(level.height, Math.ceil((camY + window.innerHeight) / TILE_SIZE) + 1);
  
  const palette = BIOME_PALETTES[currentBiome] || BIOME_PALETTES[STRATA.JARDIN];
  const wallColors = Array.isArray(palette.wall) ? palette.wall : [palette.wall];
  const floorColors = Array.isArray(palette.floor) ? palette.floor : [palette.floor];
  
  for (let y = startTileY; y < endTileY; y++) {
    for (let x = startTileX; x < endTileX; x++) {
      const tile = level.tiles[y * level.width + x];
      const tileX = x * TILE_SIZE;
      const tileY = y * TILE_SIZE;
      
      // Use position-based variation for consistent tile appearance
      const variation = ((x * 7 + y * 13) % 3);
      
      if (tile === 1) {
        // Wall tile with brick pattern
        const baseColor = hexToCSS(wallColors[variation % wallColors.length]);
        const darkColor = hexToCSS(darkenColor(wallColors[variation % wallColors.length], 0.3));
        const lightColor = hexToCSS(lightenColor(wallColors[variation % wallColors.length], 0.15));
        
        // Base
        ctx.fillStyle = baseColor;
        ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
        
        // Brick pattern
        const brickH = TILE_SIZE / 2;
        const offset = (y % 2) * (TILE_SIZE / 2);
        
        ctx.fillStyle = darkColor;
        // Horizontal mortar lines
        ctx.fillRect(tileX, tileY + brickH - 1, TILE_SIZE, 2);
        // Vertical mortar lines
        ctx.fillRect(tileX + (TILE_SIZE / 2 + offset) % TILE_SIZE, tileY, 2, brickH);
        ctx.fillRect(tileX + offset, tileY + brickH, 2, brickH);
        
        // Top highlight for 3D effect
        ctx.fillStyle = lightColor;
        ctx.fillRect(tileX, tileY, TILE_SIZE, 1);
        
      } else {
        // Floor tile with texture
        const baseColor = hexToCSS(floorColors[variation % floorColors.length]);
        
        ctx.fillStyle = baseColor;
        ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
        
        // Add subtle texture dots
        const seed = x * 1000 + y;
        if ((seed % 5) === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.fillRect(tileX + (seed % 12), tileY + ((seed * 3) % 12), 2, 2);
        }
        if ((seed % 7) === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(tileX + ((seed * 2) % 10), tileY + ((seed * 5) % 10), 2, 2);
        }
        
        // Subtle grid lines
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(tileX, tileY, 1, TILE_SIZE);
        ctx.fillRect(tileX, tileY, TILE_SIZE, 1);
      }
    }
  }
  
  // Add decorations based on biome
  drawBiomeDecorations(ctx, startTileX, startTileY, endTileX, endTileY, level);
}

/**
 * Helper to darken a color (hex number)
 */
function darkenColor(color, amount) {
  if (typeof color !== 'number') return color;
  const r = Math.floor(((color >> 16) & 0xff) * (1 - amount));
  const g = Math.floor(((color >> 8) & 0xff) * (1 - amount));
  const b = Math.floor((color & 0xff) * (1 - amount));
  return (r << 16) | (g << 8) | b;
}

/**
 * Helper to lighten a color (hex number)
 */
function lightenColor(color, amount) {
  if (typeof color !== 'number') return color;
  const r = Math.min(255, Math.floor(((color >> 16) & 0xff) + (255 - ((color >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.floor(((color >> 8) & 0xff) + (255 - ((color >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.floor((color & 0xff) + (255 - (color & 0xff)) * amount));
  return (r << 16) | (g << 8) | b;
}

/**
 * Draw biome-specific decorations
 */
function drawBiomeDecorations(ctx, startX, startY, endX, endY, level) {
  // Decoration seeds based on position
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const tile = level.tiles[y * level.width + x];
      if (tile === 1) continue; // Skip walls
      
      const seed = x * 12345 + y * 67890;
      const decorType = seed % 50;
      
      if (decorType < 2) {
        // Grass tuft (JARDIN)
        if (currentBiome === STRATA.JARDIN) {
          const px = x * TILE_SIZE + (seed % 12);
          const py = y * TILE_SIZE + ((seed * 3) % 12);
          
          ctx.fillStyle = '#4a8f4a';
          ctx.beginPath();
          ctx.moveTo(px, py + 6);
          ctx.lineTo(px + 1, py);
          ctx.lineTo(px + 2, py + 6);
          ctx.fill();
          
          ctx.fillStyle = '#5aaf5a';
          ctx.beginPath();
          ctx.moveTo(px + 3, py + 6);
          ctx.lineTo(px + 4, py + 2);
          ctx.lineTo(px + 5, py + 6);
          ctx.fill();
        }
        // Ember (FORGE)
        else if (currentBiome === STRATA.FORGE) {
          const px = x * TILE_SIZE + (seed % 14);
          const py = y * TILE_SIZE + ((seed * 2) % 14);
          const flicker = Math.sin(performance.now() * 0.01 + seed) * 0.3 + 0.7;
          
          ctx.globalAlpha = flicker;
          ctx.fillStyle = '#ff6622';
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        // Crystal (ABIME)
        else if (currentBiome === STRATA.ABIME) {
          const px = x * TILE_SIZE + (seed % 12);
          const py = y * TILE_SIZE + ((seed * 3) % 12);
          
          ctx.fillStyle = '#88ccff';
          ctx.beginPath();
          ctx.moveTo(px, py + 5);
          ctx.lineTo(px + 3, py);
          ctx.lineTo(px + 6, py + 5);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }
}

/**
 * Render menu with animated background
 */
function renderMenu() {
  const time = performance.now() * 0.001;
  
  // Animated gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
  gradient.addColorStop(0, '#0a0a1a');
  gradient.addColorStop(0.5, '#1a1a3e');
  gradient.addColorStop(1, '#0a0a1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  
  // Animated stars/particles
  for (let i = 0; i < 100; i++) {
    const x = ((i * 137.5 + time * 20) % window.innerWidth);
    const y = ((i * 73.3 + time * (10 + i % 5)) % window.innerHeight);
    const size = 1 + (i % 3);
    const alpha = 0.3 + Math.sin(time * 2 + i) * 0.3;
    
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i % 5 === 0 ? '#88aaff' : '#ffffff';
    ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
  }
  ctx.globalAlpha = 1;
  
  // Floating runes/symbols in background
  ctx.font = '24px monospace';
  for (let i = 0; i < 15; i++) {
    const x = (i * 89 + time * 15) % window.innerWidth;
    const y = (i * 67 + Math.sin(time + i) * 30) % window.innerHeight;
    ctx.globalAlpha = 0.1 + Math.sin(time * 0.5 + i) * 0.05;
    ctx.fillStyle = '#4488ff';
    ctx.fillText(['◇', '◆', '△', '▽', '○', '●', '☆', '★'][i % 8], x, y);
  }
  ctx.globalAlpha = 1;
  
  // Title with glow effect
  ctx.textAlign = 'center';
  
  // Title glow
  ctx.shadowColor = '#4488ff';
  ctx.shadowBlur = 30 + Math.sin(time * 2) * 10;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 84px monospace';
  ctx.fillText('SOPOR', window.innerWidth / 2, window.innerHeight / 3);
  ctx.shadowBlur = 0;
  
  // Subtitle
  ctx.font = '20px monospace';
  ctx.fillStyle = '#6688aa';
  ctx.fillText(t('menu.subtitle') || 'Le Sommeil de l\'Architecte', window.innerWidth / 2, window.innerHeight / 3 + 50);
  
  // Decorative line
  const lineWidth = 200;
  ctx.strokeStyle = '#4488ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(window.innerWidth / 2 - lineWidth, window.innerHeight / 3 + 70);
  ctx.lineTo(window.innerWidth / 2 + lineWidth, window.innerHeight / 3 + 70);
  ctx.stroke();
  
  // Small decorations on the line
  ctx.fillStyle = '#4488ff';
  ctx.beginPath();
  ctx.arc(window.innerWidth / 2 - lineWidth, window.innerHeight / 3 + 70, 4, 0, Math.PI * 2);
  ctx.arc(window.innerWidth / 2, window.innerHeight / 3 + 70, 6, 0, Math.PI * 2);
  ctx.arc(window.innerWidth / 2 + lineWidth, window.innerHeight / 3 + 70, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Start prompt with pulsing
  const pulse = 0.5 + Math.sin(time * 3) * 0.4;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px monospace';
  ctx.fillText(t('menu.start') || '[ Appuyez pour commencer ]', window.innerWidth / 2, window.innerHeight / 2 + 120);
  ctx.globalAlpha = 1;
  
  // Controls hint
  ctx.font = '14px monospace';
  ctx.fillStyle = '#555577';
  ctx.fillText('WASD / Flèches: Déplacer | Espace: Attaquer | Shift: Esquiver', 
    window.innerWidth / 2, window.innerHeight - 60);
  ctx.fillText('I: Inventaire | K: Compétences | M: Carte | Échap: Pause', 
    window.innerWidth / 2, window.innerHeight - 40);
  
  // Touch controls on mobile
  if (touchControls && touchControls.enabled) {
    drawTouchControls(ctx, touchControls);
  }
}

/**
 * Render game over screen
 */
function renderGameOver() {
  const time = performance.now() * 0.001;
  
  // Dark overlay with vignette effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  
  // Red vignette
  const gradient = ctx.createRadialGradient(
    window.innerWidth / 2, window.innerHeight / 2, 0,
    window.innerWidth / 2, window.innerHeight / 2, window.innerWidth * 0.7
  );
  gradient.addColorStop(0, 'rgba(100, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(100, 0, 0, 0.5)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  
  // Floating particles (blood/essence)
  for (let i = 0; i < 30; i++) {
    const x = (i * 97 + Math.sin(time + i) * 50) % window.innerWidth;
    const y = window.innerHeight - ((time * 30 + i * 40) % window.innerHeight);
    const alpha = 0.3 + Math.sin(time + i) * 0.2;
    
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  
  // Title with dramatic effect
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 20 + Math.sin(time * 4) * 10;
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 56px monospace';
  ctx.fillText(t('game_over.title') || 'DÉFAITE', window.innerWidth / 2, window.innerHeight / 2 - 30);
  ctx.shadowBlur = 0;
  
  // Stats display
  ctx.font = '18px monospace';
  ctx.fillStyle = '#888888';
  ctx.fillText(`Niveau: ${playerProgression?.level || 1}`, window.innerWidth / 2, window.innerHeight / 2 + 30);
  ctx.fillText(`Ennemis vaincus: ${worldState?.stats?.enemiesKilled || 0}`, window.innerWidth / 2, window.innerHeight / 2 + 55);
  
  // Continue prompt
  const pulse = 0.5 + Math.sin(time * 3) * 0.4;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px monospace';
  ctx.fillText(t('game_over.continue') || '[ Appuyez pour réessayer ]', window.innerWidth / 2, window.innerHeight / 2 + 120);
  ctx.globalAlpha = 1;
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
