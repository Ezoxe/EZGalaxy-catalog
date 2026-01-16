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

import {
  OPEN_WORLD_CONFIG, WORLD_TILES, ENTITY_TYPES,
  NPC_DEFINITIONS, QUEST_DEFINITIONS,
  ZONE_TYPES, ZONE_CONFIG,
  generateOpenWorld, getZoneAt, isInSafeZone,
  getZoneTypeAt, getZoneConfig, getZoneLighting, hasCorruptionAt,
  getEnemyArchetypesForDifficulty, getEnemyLevelAt
} from './world/open-world.js';

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
  playerHealthRegen: 1,        // HP regenerated
  playerHealthRegenInterval: 5000, // Every 5 seconds
  
  // Camera
  cameraLerp: 0.1,
  cameraShakeDecay: 0.9,
  
  // Combat
  invincibilityTime: 500,
  hitStunTime: 200,
  
  // Enemy
  enemyChaseDistance: 400,     // Max distance enemies will chase
  enemyLeashDistance: 500,     // Distance where enemies return to spawn
  
  // World
  roomWidth: 20,
  roomHeight: 15,
  
  // Debug
  showFPS: false,
  showHitboxes: false,
};

// ========== Key Bindings (customizable) ==========

let KEY_BINDINGS = {
  moveUp: ['KeyW', 'ArrowUp'],
  moveDown: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  attack: ['Space', 'KeyZ'],
  dodge: ['ShiftLeft', 'ShiftRight'],
  interact: ['KeyE', 'KeyF'],
  inventory: ['KeyI'],
  skills: ['KeyK'],
  settings: ['KeyP'],
  minimap: ['KeyM'],
  expandMap: ['Tab'],
  pause: ['Escape'],
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

// Day/Night cycle
let gameTime = 0.25; // 0-1, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset, 0/1 = midnight
let dayNightSpeed = 0.0000008; // How fast time passes (~5 min per phase, ~20 min full cycle)

// Player
let player = null;
let playerCombat = null;
let playerProgression = null;

// Entities
let enemies = [];
let projectiles = [];
let items = [];
let npcs = [];
let decorations = [];
let interactables = [];
let openWorld = null;

// Interaction state
let interactionTarget = null;
let dialogueState = null;

// Quest state
let activeQuests = [];
let completedQuests = [];

// Respawn
let respawnPoint = null;

// Camera
let camera = { x: 0, y: 0, shakeX: 0, shakeY: 0 };

// Input
let keys = {};
let mouse = { x: 0, y: 0, down: false };

// Health regeneration timer
let healthRegenTimer = 0;

// Attack animation state
let attackSwingAngle = 0;
let attackSwingActive = false;

// House interior state
let insideHouse = null;
let houseTransitionAlpha = 0;
let playerEnteredHouseViaInteraction = false; // Track if player properly entered

// Settings state
let gameSettings = {
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.7,
  musicEnabled: true,
  sfxEnabled: true,
  screenShake: true,
  showFPS: false,
};

// Inventory items (consumables, berries, etc.)
let playerInventory = {
  berries: 0,
  healthPotions: 0,
  maxHealthBoosts: 0,
};

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
  // Handle dialogue option selection
  if (dialogueState && dialogueState.options && dialogueState.options.length > 0) {
    if (code === 'Digit1' && dialogueState.options[0]) {
      dialogueState.options[0].action();
      return;
    }
    if (code === 'Digit2' && dialogueState.options[1]) {
      dialogueState.options[1].action();
      return;
    }
    if (code === 'Digit3' && dialogueState.options[2]) {
      dialogueState.options[2].action();
      return;
    }
  }
  
  // Use key bindings
  if (KEY_BINDINGS.attack.includes(code)) {
    handleAttack();
  } else if (KEY_BINDINGS.dodge.includes(code)) {
    handleDodge();
  } else if (KEY_BINDINGS.interact.includes(code)) {
    handleInteract();
  } else if (KEY_BINDINGS.inventory.includes(code)) {
    togglePanel(panels, 'inventory');
  } else if (KEY_BINDINGS.skills.includes(code)) {
    togglePanel(panels, 'skills');
  } else if (KEY_BINDINGS.settings.includes(code)) {
    togglePanel(panels, 'settings');
  } else if (KEY_BINDINGS.minimap.includes(code)) {
    toggleMinimap(minimap);
  } else if (KEY_BINDINGS.expandMap.includes(code)) {
    toggleExpanded(minimap);
  } else if (KEY_BINDINGS.pause.includes(code)) {
    if (dialogueState) {
      closeDialogue();
    } else if (panels.activePanel) {
      closePanel(panels);
    } else if (gameState === GAME_STATE.PLAYING) {
      gameState = GAME_STATE.PAUSED;
    } else if (gameState === GAME_STATE.PAUSED) {
      gameState = GAME_STATE.PLAYING;
    }
  } else if (code === 'Enter') {
    if (gameState === GAME_STATE.MENU) {
      startGame();
    } else if (gameState === GAME_STATE.GAME_OVER) {
      enemies = [];
      items = [];
      projectiles = [];
      player.health = player.maxHealth;
      startGame();
    }
  } else if (code === 'KeyH') {
    // Quick heal with berry
    useHealItem();
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
    attackSwingActive = true;
    attackSwingAngle = 0;
    playSlashSound();
    
    // Create attack visual effect
    const attackAngle = player.facing > 0 ? 0 : Math.PI;
    createHitEffect(particles, 
      player.x + player.facing * 20, 
      player.y - 5
    );
    
    // Find enemies in range - improved hitbox matching animation
    const attackRange = player.weapon.reach || player.weapon.radius || 50;
    const baseDamage = player.weapon.damage || 5;
    const arcDeg = player.weapon.arcDeg || 120;
    
    // Attack hitbox is a cone/arc in front of player
    const attackCenterX = player.x + player.facing * 25;
    const attackCenterY = player.y;
    
    for (const enemy of enemies) {
      if (!enemy.stats) continue;
      
      // Calculate distance from attack center point
      const dx = enemy.x - attackCenterX;
      const dy = enemy.y - attackCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Enemy hitbox radius (enemies are about 20-30px wide)
      const enemyRadius = enemy.isBoss ? 25 : enemy.isElite ? 20 : 15;
      
      // Check if enemy is within attack range (including enemy hitbox)
      if (dist <= attackRange + enemyRadius) {
        // Check if enemy is in the attack arc
        const angleToEnemy = Math.atan2(dy, dx);
        const facingAngle = player.facing > 0 ? 0 : Math.PI;
        
        // Calculate angle difference
        let angleDiff = Math.abs(angleToEnemy - facingAngle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        
        const halfArcRad = (arcDeg / 2) * (Math.PI / 180);
        const isAOEAttack = player.weapon.behaviorId === 'melee_slam' || arcDeg >= 360;
        
        if (isAOEAttack || angleDiff <= halfArcRad) {
          dealDamage(enemy, baseDamage);
          
          // Visual feedback - push enemy back slightly
          const pushDir = Math.atan2(enemy.y - player.y, enemy.x - player.x);
          enemy.x += Math.cos(pushDir) * 5;
          enemy.y += Math.sin(pushDir) * 5;
        }
      }
    }
    
    // Also check for aggressive animals
    if (openWorld?.decorations) {
      for (const deco of openWorld.decorations) {
        if (!deco.isAnimal || !deco.aggressive) continue;
        
        const dx = deco.x - attackCenterX;
        const dy = deco.y - attackCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const animalRadius = deco.radius || 15;
        
        if (dist <= attackRange + animalRadius) {
          const angleToAnimal = Math.atan2(dy, dx);
          const facingAngle = player.facing > 0 ? 0 : Math.PI;
          
          let angleDiff = Math.abs(angleToAnimal - facingAngle);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
          
          const halfArcRad = (arcDeg / 2) * (Math.PI / 180);
          
          if (angleDiff <= halfArcRad) {
            // Damage the animal
            deco.health = (deco.health || 30) - baseDamage;
            addDamageNumber(deco.x, deco.y, baseDamage, true);
            
            // Create hit effect
            createHitEffect(particles, deco.x, deco.y);
            
            // Knockback animal
            const pushDir = Math.atan2(deco.y - player.y, deco.x - player.x);
            deco.x += Math.cos(pushDir) * 8;
            deco.y += Math.sin(pushDir) * 8;
            
            // Make animal aggressive if not already chasing
            if (deco.animalState !== 'chasing' && deco.animalState !== 'attacking') {
              deco.animalState = 'chasing';
            }
            
            // Check if animal is dead
            if (deco.health <= 0) {
              // Remove animal by marking it as dead
              deco.dead = true;
              deco.isAnimal = false;
              
              // Spawn some loot
              addNotification(hud, 'Animal vaincu!', { color: '#ffaa00' });
              
              // Maybe drop meat or leather
              const dropRoll = Math.random();
              if (dropRoll < 0.5) {
                items.push({
                  x: deco.x,
                  y: deco.y,
                  type: 'consumable',
                  name: 'Viande',
                  healAmount: 15,
                  icon: '🍖',
                });
              }
              
              // XP gain
              player.xp = (player.xp || 0) + 10;
            }
          }
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
  
  // If in dialogue, advance dialogue
  if (dialogueState) {
    advanceDialogue();
    return;
  }
  
  // Check for house doors first
  if (openWorld?.structures) {
    const tileSize = openWorld.tileSize || 32;
    
    for (const structure of openWorld.structures) {
      if (structure.doorX && structure.doorY && structure.type !== 'fountain' && structure.type !== 'well') {
        const doorWorldX = structure.doorX * tileSize;
        const doorWorldY = structure.doorY * tileSize;
        
        if (insideHouse === structure) {
          // Player is inside - check if near interior door to exit
          const interiorDoorX = structure.x * tileSize + (structure.width * tileSize) / 2;
          const interiorDoorY = (structure.y + structure.height - 1) * tileSize;
          const distToInteriorDoor = distance(player.x, player.y, interiorDoorX, interiorDoorY);
          
          if (distToInteriorDoor <= 50) {
            // Exit house - teleport to exterior door
            player.x = doorWorldX;
            player.y = doorWorldY + 30;
            insideHouse = null;
            playerEnteredHouseViaInteraction = false;
            addNotification(hud, 'Sortie de la maison', { color: '#aaaaaa' });
            playUIClick();
            return;
          }
        } else {
          // Player is outside - check if near door to enter
          const dist = distance(player.x, player.y, doorWorldX, doorWorldY);
          
          if (dist <= 50) {
            // Enter house - teleport inside near interior door
            const interiorX = structure.x * tileSize + (structure.width * tileSize) / 2;
            const interiorY = (structure.y + structure.height - 2) * tileSize;
            player.x = interiorX;
            player.y = interiorY;
            insideHouse = structure;
            playerEnteredHouseViaInteraction = true;
            addNotification(hud, 'Entré dans la maison', { color: '#aaaaaa' });
            playUIClick();
            return;
          }
        }
      }
    }
  }
  
  // Check for nearby items first
  for (const item of items) {
    const dist = distance(player.x, player.y, item.x, item.y);
    if (dist <= 40) {
      pickupItem(item);
      return;
    }
  }
  
  // Check interactables (chests, ore, berries)
  for (const inter of interactables) {
    const dist = distance(player.x, player.y, inter.x, inter.y);
    if (dist <= 50) {
      handleInteractable(inter);
      return;
    }
  }
  
  // Check NPCs
  for (const npc of npcs) {
    const dist = distance(player.x, player.y, npc.x, npc.y);
    if (dist <= 60) {
      startDialogue(npc);
      return;
    }
  }
}

/**
 * Use heal item (berry or potion)
 */
function useHealItem() {
  if (player.health >= player.maxHealth) {
    addNotification(hud, 'Santé déjà au maximum!', { color: '#888888' });
    return;
  }
  
  if (playerInventory.healthPotions > 0) {
    playerInventory.healthPotions--;
    player.health = Math.min(player.maxHealth, player.health + 50);
    playHealSound();
    addNotification(hud, 'Potion utilisée! +50 PV', { color: '#ff44aa' });
  } else if (playerInventory.berries > 0) {
    playerInventory.berries--;
    player.health = Math.min(player.maxHealth, player.health + 15);
    playHealSound();
    addNotification(hud, 'Baie consommée! +15 PV', { color: '#ff6688' });
  } else {
    addNotification(hud, 'Pas d\'objets de soin!', { color: '#ff4444' });
  }
}

/**
 * Handle interactable objects
 */
function handleInteractable(inter) {
  if (inter.type === 'chest' || inter.type === ENTITY_TYPES.CHEST) {
    if (!inter.opened) {
      inter.opened = true;
      playChestOpen();
      
      // Award loot
      if (inter.loot) {
        if (inter.loot.gold) {
          worldState.player = worldState.player || {};
          worldState.player.gold = (worldState.player.gold || 0) + inter.loot.gold;
          addNotification(hud, `+${inter.loot.gold} Or`, { color: '#ffcc00' });
        }
        if (inter.loot.xp) {
          const result = addXP(playerProgression, inter.loot.xp);
          if (typeof result === 'object') {
            playerProgression.xp = result.newXp;
            playerProgression.level = result.newLevel;
            playerProgression.xpToNext = result.xpToNext;
          }
          addNotification(hud, `+${inter.loot.xp} XP`, { color: '#44ff88' });
        }
        // Random chance for items
        if (Math.random() < 0.3) {
          playerInventory.berries += 2;
          addNotification(hud, '+2 Baies', { color: '#ff6688' });
        }
        if (Math.random() < 0.15) {
          playerInventory.healthPotions += 1;
          addNotification(hud, '+1 Potion de Soin', { color: '#ff44aa' });
        }
      }
      
      createHitEffect(particles, inter.x, inter.y);
    }
  } else if (inter.type === 'ore_iron') {
    if (!inter.collected) {
      inter.collected = true;
      
      // Add to inventory
      worldState.player = worldState.player || {};
      worldState.player.inventory = worldState.player.inventory || { items: [] };
      worldState.player.inventory.items.push({ type: 'ore_iron', name: 'Minerai de Fer' });
      
      addNotification(hud, '+1 Minerai de Fer', { color: '#888899' });
      playItemPickup('common');
      
      // Check quest progress
      checkQuestObjectives('collect', 'ore_iron');
    }
  } else if (inter.type === 'berry_bush') {
    if (!inter.collected) {
      inter.collected = true;
      inter.respawnTimer = 60000; // Respawn after 60 seconds
      
      const berryCount = 1 + Math.floor(Math.random() * 3);
      playerInventory.berries += berryCount;
      
      addNotification(hud, `+${berryCount} Baies`, { color: '#ff6688' });
      playItemPickup('common');
    }
  } else if (inter.type === 'health_flower') {
    if (!inter.collected) {
      inter.collected = true;
      
      // Permanent max health boost
      player.maxHealth += 5;
      player.health = Math.min(player.health + 5, player.maxHealth);
      playerInventory.maxHealthBoosts++;
      
      addNotification(hud, '+5 PV Maximum!', { color: '#44ffaa', size: 18 });
      playLevelUpSound();
    }
  }
}

/**
 * Start dialogue with NPC
 */
function startDialogue(npc) {
  if (!npc || !npc.definition) return;
  
  const def = npc.definition;
  const dialoguesList = def.dialogues || [];
  
  // Ensure we have valid dialogues array
  if (!Array.isArray(dialoguesList) || dialoguesList.length === 0) {
    dialogueState = {
      npc: npc,
      dialogues: ['...'],
      currentIndex: 0,
      options: [{ text: 'Au revoir', action: closeDialogue }],
    };
    return;
  }
  
  dialogueState = {
    npc: npc,
    dialogues: dialoguesList,
    currentIndex: npc.interacted ? Math.min(npc.dialogueIndex || 0, dialoguesList.length - 1) : 0,
    options: [],
  };
  
  npc.interacted = true;
  
  // Check if NPC can give quest
  if (def.canGiveQuest && def.questId) {
    const quest = QUEST_DEFINITIONS[def.questId];
    if (quest && !completedQuests.includes(quest.id) && !activeQuests.find(q => q.id === quest.id)) {
      dialogueState.options.push({
        text: `Accepter: ${quest.title}`,
        action: () => acceptQuest(quest),
      });
    }
  }
  
  // Check if NPC can heal
  if (def.canHeal) {
    dialogueState.options.push({
      text: 'Se reposer (Restaurer santé)',
      action: () => {
        player.health = player.maxHealth;
        addNotification(hud, 'Santé restaurée!', { color: '#44ff88' });
        playHealSound();
        closeDialogue();
      },
    });
  }
  
  // Check if NPC can trade
  if (def.canTrade) {
    dialogueState.options.push({
      text: 'Voir les marchandises',
      action: () => {
        addNotification(hud, 'Boutique non implémentée', { color: '#888888' });
      },
    });
  }
  
  dialogueState.options.push({
    text: 'Au revoir',
    action: closeDialogue,
  });
  
  playUIClick();
}

/**
 * Advance dialogue
 */
function advanceDialogue() {
  if (!dialogueState) return;
  
  // Safety check for dialogues array
  if (!dialogueState.dialogues || !Array.isArray(dialogueState.dialogues)) {
    closeDialogue();
    return;
  }
  
  dialogueState.currentIndex++;
  
  if (dialogueState.currentIndex >= dialogueState.dialogues.length) {
    // Show options if available, otherwise close
    if (!dialogueState.options || dialogueState.options.length <= 1) {
      // Only "Au revoir" or no options - auto close
      closeDialogue();
      return;
    }
    // Otherwise stay on last message with options showing
    dialogueState.currentIndex = Math.max(0, dialogueState.dialogues.length - 1);
  }
  
  playUIClick();
}

/**
 * Close dialogue
 */
function closeDialogue() {
  if (dialogueState && dialogueState.npc) {
    dialogueState.npc.dialogueIndex = dialogueState.currentIndex;
  }
  dialogueState = null;
}

/**
 * Accept quest
 */
function acceptQuest(quest) {
  activeQuests.push({
    ...quest,
    progress: 0,
  });
  
  addNotification(hud, `Quête acceptée: ${quest.title}`, { color: '#ffcc00', size: 18 });
  playUIClick();
  closeDialogue();
}

/**
 * Check quest objectives
 */
function checkQuestObjectives(type, target) {
  for (const quest of activeQuests) {
    if (quest.type === type && quest.target === target) {
      quest.progress = (quest.progress || 0) + 1;
      
      if (quest.progress >= quest.required) {
        completeQuest(quest);
      } else {
        addNotification(hud, `${quest.title}: ${quest.progress}/${quest.required}`, { color: '#aaaaaa' });
      }
    }
  }
}

/**
 * Complete quest
 */
function completeQuest(quest) {
  // Remove from active
  activeQuests = activeQuests.filter(q => q.id !== quest.id);
  completedQuests.push(quest.id);
  
  // Award rewards
  if (quest.rewards) {
    if (quest.rewards.xp) {
      const result = addXP(playerProgression, quest.rewards.xp);
      if (typeof result === 'object') {
        playerProgression.xp = result.newXp;
        playerProgression.level = result.newLevel;
        playerProgression.xpToNext = result.xpToNext;
      }
      addNotification(hud, `+${quest.rewards.xp} XP`, { color: '#44ff88' });
    }
    if (quest.rewards.gold) {
      worldState.player = worldState.player || {};
      worldState.player.gold = (worldState.player.gold || 0) + quest.rewards.gold;
      addNotification(hud, `+${quest.rewards.gold} Or`, { color: '#ffcc00' });
    }
  }
  
  addNotification(hud, `Quête terminée: ${quest.title}!`, { color: '#ffaa00', size: 20 });
  playLevelUpSound();
  
  // Save progress
  worldState.completedQuests = completedQuests;
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
  // Update day/night cycle
  gameTime = (gameTime + dt * dayNightSpeed) % 1;
  
  // Update player
  updatePlayer(dt);
  
  // Health regeneration
  healthRegenTimer += dt;
  if (healthRegenTimer >= CONFIG.playerHealthRegenInterval) {
    healthRegenTimer = 0;
    if (player.health < player.maxHealth) {
      player.health = Math.min(player.maxHealth, player.health + CONFIG.playerHealthRegen);
    }
  }
  
  // Update attack swing animation
  if (attackSwingActive) {
    attackSwingAngle += dt * 0.02;
    if (attackSwingAngle > Math.PI) {
      attackSwingActive = false;
      attackSwingAngle = 0;
    }
  }
  
  // Update house transition
  if (insideHouse) {
    houseTransitionAlpha = Math.min(1, houseTransitionAlpha + dt * 0.005);
  } else {
    houseTransitionAlpha = Math.max(0, houseTransitionAlpha - dt * 0.005);
  }
  
  // Spawn enemies based on player distance from village
  updateEnemySpawning(dt);
  
  // Update animals behavior
  updateAnimals(dt);
  
  // Update enemies using AI system
  for (const enemy of enemies) {
    // Check if enemy should stop chasing (leash distance)
    if (enemy.spawnPoint) {
      const distFromSpawn = distance(enemy.x, enemy.y, enemy.spawnPoint.x, enemy.spawnPoint.y);
      const distToPlayer = distance(enemy.x, enemy.y, player.x, player.y);
      
      // If too far from spawn or player too far, return to spawn
      if (distFromSpawn > CONFIG.enemyLeashDistance || distToPlayer > CONFIG.enemyChaseDistance) {
        enemy.returning = true;
      }
      
      // Return to spawn point
      if (enemy.returning) {
        const dx = enemy.spawnPoint.x - enemy.x;
        const dy = enemy.spawnPoint.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 10) {
          const speed = (enemy.stats?.speed || 60) * 1.5;
          enemy.x += (dx / dist) * speed * dt / 1000;
          enemy.y += (dy / dist) * speed * dt / 1000;
        } else {
          enemy.returning = false;
        }
        continue; // Skip normal AI while returning
      }
    }
    
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
  
  // Update NPCs (wandering behavior)
  updateNPCs(dt);
  
  // Update projectiles
  updateProjectiles(dt);
  
  // Update interactables (respawn berries, etc.)
  updateInteractables(dt);
  
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
  
  // Update interaction highlights
  updateInteractionHighlights();
}

/**
 * Update interactables (respawn timers, etc.)
 */
function updateInteractables(dt) {
  for (const inter of interactables) {
    if (inter.collected && inter.respawnTimer !== undefined) {
      inter.respawnTimer -= dt;
      if (inter.respawnTimer <= 0) {
        inter.collected = false;
        inter.respawnTimer = undefined;
      }
    }
  }
}

/**
 * Update enemy spawning based on distance from village
 */
let lastSpawnCheck = 0;
const SPAWN_CHECK_INTERVAL = 2000; // Check every 2 seconds

// Boss enemy archetypes for corrupted core zones
const BOSS_ARCHETYPES = ['berserker', 'summoner'];
const ELITE_ARCHETYPES = ['gunner', 'lurker'];

function updateEnemySpawning(dt) {
  lastSpawnCheck += dt;
  
  if (lastSpawnCheck < SPAWN_CHECK_INTERVAL) return;
  lastSpawnCheck = 0;
  
  if (!openWorld) return;
  
  const villageCenter = openWorld.villageCenter || { x: 100, y: 75 };
  const tileSize = openWorld.tileSize || 32;
  
  // Get zone type at player position (in tiles)
  const playerTileX = player.x / tileSize;
  const playerTileY = player.y / tileSize;
  const zoneType = getZoneTypeAt(villageCenter, playerTileX, playerTileY);
  
  // No enemies in village
  if (zoneType === ZONE_TYPES.VILLAGE) return;
  
  // Get zone config for spawn rules
  const zoneConfig = ZONE_CONFIG[zoneType];
  const enemyLevel = zoneConfig?.enemyLevel || 1;
  
  // Check nearby enemies
  const nearbyEnemies = enemies.filter(e => {
    const dist = distance(e.x, e.y, player.x, player.y);
    return dist < 600;
  });
  
  // Max enemies based on zone danger
  const maxNearby = enemyLevel + 2;
  if (nearbyEnemies.length >= maxNearby) return;
  
  // Spawn chance based on zone
  const spawnChance = {
    [ZONE_TYPES.FOREST]: 0.2,
    [ZONE_TYPES.DEEP_FOREST]: 0.35,
    [ZONE_TYPES.CORRUPTED]: 0.5,
    [ZONE_TYPES.CORRUPTED_CORE]: 0.65,
  };
  
  if (Math.random() > (spawnChance[zoneType] || 0.1)) return;
  
  // Get archetypes based on zone
  let archetypes;
  let isBoss = false;
  let isElite = false;
  
  switch (zoneType) {
    case ZONE_TYPES.FOREST:
      archetypes = ['skirmisher'];
      break;
    case ZONE_TYPES.DEEP_FOREST:
      archetypes = ['skirmisher', 'charger', 'spitter'];
      break;
    case ZONE_TYPES.CORRUPTED:
      archetypes = ['charger', 'spitter', 'gunner', 'lurker'];
      // 10% chance for elite
      if (Math.random() < 0.1) {
        archetypes = ELITE_ARCHETYPES;
        isElite = true;
      }
      break;
    case ZONE_TYPES.CORRUPTED_CORE:
      archetypes = ['gunner', 'lurker', 'summoner', 'berserker'];
      // 5% chance for boss, 20% for elite
      if (Math.random() < 0.05) {
        archetypes = BOSS_ARCHETYPES;
        isBoss = true;
      } else if (Math.random() < 0.2) {
        archetypes = ELITE_ARCHETYPES;
        isElite = true;
      }
      break;
    default:
      return;
  }
  
  if (archetypes.length === 0) return;
  
  // Find spawn position away from player
  const spawnAngle = Math.random() * Math.PI * 2;
  const spawnDist = 350 + Math.random() * 250;
  
  const spawnX = player.x + Math.cos(spawnAngle) * spawnDist;
  const spawnY = player.y + Math.sin(spawnAngle) * spawnDist;
  
  // Validate spawn position
  if (spawnX < 0 || spawnX > openWorld.width * tileSize ||
      spawnY < 0 || spawnY > openWorld.height * tileSize) {
    return;
  }
  
  // Check spawn zone type
  const spawnTileX = spawnX / tileSize;
  const spawnTileY = spawnY / tileSize;
  const spawnZoneType = getZoneTypeAt(villageCenter, spawnTileX, spawnTileY);
  
  // Don't spawn in village
  if (spawnZoneType === ZONE_TYPES.VILLAGE) return;
  
  // Spawn enemy
  const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
  const enemy = createEnemy(archetype, spawnX, spawnY);
  
  // Apply level scaling based on zone
  if (enemy.stats) {
    const levelMultiplier = 1 + (enemyLevel - 1) * 0.3;
    enemy.stats.health *= levelMultiplier;
    enemy.stats.maxHealth *= levelMultiplier;
    enemy.stats.damage *= levelMultiplier;
    
    // Elite/Boss scaling
    if (isBoss) {
      enemy.stats.health *= 3;
      enemy.stats.maxHealth *= 3;
      enemy.stats.damage *= 2;
      enemy.isBoss = true;
      enemy.scale = 1.5;
    } else if (isElite) {
      enemy.stats.health *= 1.5;
      enemy.stats.maxHealth *= 1.5;
      enemy.stats.damage *= 1.3;
      enemy.isElite = true;
      enemy.scale = 1.2;
    }
  }
  
  enemy.spawnPoint = { x: spawnX, y: spawnY };
  enemy.spawnZone = spawnZoneType;
  enemy.returning = false;
  enemies.push(enemy);
}

/**
 * Update NPCs
 */
function updateNPCs(dt) {
  for (const npc of npcs) {
    if (npc.wandering && npc.wanderRadius) {
      // Simple wandering behavior
      if (!npc.wanderTarget || distance(npc.x, npc.y, npc.wanderTarget.x, npc.wanderTarget.y) < 10) {
        // Pick new target
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * npc.wanderRadius * openWorld.tileSize;
        const homeX = npc.homeStructure?.x ? npc.homeStructure.x * openWorld.tileSize : npc.x;
        const homeY = npc.homeStructure?.y ? npc.homeStructure.y * openWorld.tileSize : npc.y;
        
        npc.wanderTarget = {
          x: homeX + Math.cos(angle) * dist,
          y: homeY + Math.sin(angle) * dist,
        };
        npc.wanderTimer = 2000 + Math.random() * 3000;
      }
      
      // Move towards target
      if (npc.wanderTimer > 0) {
        npc.wanderTimer -= dt;
      } else {
        const dx = npc.wanderTarget.x - npc.x;
        const dy = npc.wanderTarget.y - npc.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 5) {
          const speed = 30;
          npc.x += (dx / dist) * speed * dt / 1000;
          npc.y += (dy / dist) * speed * dt / 1000;
          npc.facing = dx > 0 ? 1 : -1;
        }
      }
    }
  }
}

/**
 * Update animals behavior (passive and aggressive)
 */
function updateAnimals(dt) {
  if (!openWorld?.decorations) return;
  
  const FLEE_DISTANCE = 100;
  const AGGRESSIVE_DETECT_DISTANCE = 150;
  const AGGRESSIVE_ATTACK_DISTANCE = 40;
  
  for (const deco of openWorld.decorations) {
    if (!deco.isAnimal) continue;
    
    const distToPlayer = distance(deco.x, deco.y, player.x, player.y);
    
    // Initialize animal state if needed
    if (deco.animalState === undefined) {
      deco.animalState = 'idle';
      deco.originalX = deco.x;
      deco.originalY = deco.y;
      deco.stateTimer = 1000 + Math.random() * 2000;
      deco.targetX = deco.x;
      deco.targetY = deco.y;
    }
    
    // Passive animals flee from player
    if (deco.passive) {
      if (distToPlayer < FLEE_DISTANCE && deco.animalState !== 'fleeing') {
        deco.animalState = 'fleeing';
        // Flee away from player
        const angleAway = Math.atan2(deco.y - player.y, deco.x - player.x);
        const fleeDist = 100 + Math.random() * 50;
        deco.targetX = deco.x + Math.cos(angleAway) * fleeDist;
        deco.targetY = deco.y + Math.sin(angleAway) * fleeDist;
      }
      
      if (deco.animalState === 'fleeing') {
        const dx = deco.targetX - deco.x;
        const dy = deco.targetY - deco.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 5) {
          const speed = (deco.moveSpeed || 2) * 50;
          deco.x += (dx / dist) * speed * dt / 1000;
          deco.y += (dy / dist) * speed * dt / 1000;
        } else {
          // Return to wandering after fleeing
          if (distToPlayer > FLEE_DISTANCE * 1.5) {
            deco.animalState = 'idle';
            deco.stateTimer = 1000 + Math.random() * 2000;
          }
        }
      } else if (deco.animalState === 'idle') {
        deco.stateTimer -= dt;
        
        if (deco.stateTimer <= 0) {
          // Random wander
          deco.animalState = 'wandering';
          const angle = Math.random() * Math.PI * 2;
          const wanderDist = 30 + Math.random() * 50;
          deco.targetX = deco.originalX + Math.cos(angle) * wanderDist;
          deco.targetY = deco.originalY + Math.sin(angle) * wanderDist;
        }
      } else if (deco.animalState === 'wandering') {
        const dx = deco.targetX - deco.x;
        const dy = deco.targetY - deco.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 5) {
          const speed = (deco.moveSpeed || 1) * 20;
          deco.x += (dx / dist) * speed * dt / 1000;
          deco.y += (dy / dist) * speed * dt / 1000;
        } else {
          deco.animalState = 'idle';
          deco.stateTimer = 2000 + Math.random() * 3000;
        }
      }
    }
    
    // Aggressive animals attack player
    if (deco.aggressive) {
      if (distToPlayer < AGGRESSIVE_DETECT_DISTANCE && deco.animalState !== 'chasing' && deco.animalState !== 'attacking') {
        deco.animalState = 'chasing';
      }
      
      if (deco.animalState === 'chasing') {
        if (distToPlayer > AGGRESSIVE_DETECT_DISTANCE * 1.5) {
          // Return to patrol
          deco.animalState = 'returning';
        } else if (distToPlayer < AGGRESSIVE_ATTACK_DISTANCE) {
          // Attack!
          deco.animalState = 'attacking';
          deco.attackTimer = 0;
        } else {
          // Chase player
          const dx = player.x - deco.x;
          const dy = player.y - deco.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          const speed = (deco.moveSpeed || 2) * 40;
          deco.x += (dx / dist) * speed * dt / 1000;
          deco.y += (dy / dist) * speed * dt / 1000;
        }
      } else if (deco.animalState === 'attacking') {
        deco.attackTimer = (deco.attackTimer || 0) + dt;
        
        if (deco.attackTimer >= 1000) {
          // Deal damage
          if (distToPlayer < AGGRESSIVE_ATTACK_DISTANCE * 1.5) {
            player.health -= deco.damage || 5;
            addDamageNumber(player.x, player.y, deco.damage || 5, false);
            
            // Knockback player
            const angle = Math.atan2(player.y - deco.y, player.x - deco.x);
            player.x += Math.cos(angle) * 20;
            player.y += Math.sin(angle) * 20;
          }
          
          deco.attackTimer = 0;
          
          // Check if should keep attacking or return to chase
          if (distToPlayer > AGGRESSIVE_ATTACK_DISTANCE) {
            deco.animalState = 'chasing';
          }
        }
      } else if (deco.animalState === 'returning') {
        const dx = deco.originalX - deco.x;
        const dy = deco.originalY - deco.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 10) {
          const speed = (deco.moveSpeed || 2) * 30;
          deco.x += (dx / dist) * speed * dt / 1000;
          deco.y += (dy / dist) * speed * dt / 1000;
        } else {
          deco.animalState = 'idle';
          deco.stateTimer = 2000 + Math.random() * 2000;
        }
        
        // Re-aggro if player gets close again
        if (distToPlayer < AGGRESSIVE_DETECT_DISTANCE * 0.8) {
          deco.animalState = 'chasing';
        }
      } else if (deco.animalState === 'idle') {
        deco.stateTimer -= dt;
        
        if (deco.stateTimer <= 0) {
          // Random patrol
          deco.animalState = 'wandering';
          const angle = Math.random() * Math.PI * 2;
          const wanderDist = 40 + Math.random() * 60;
          deco.targetX = deco.originalX + Math.cos(angle) * wanderDist;
          deco.targetY = deco.originalY + Math.sin(angle) * wanderDist;
        }
      } else if (deco.animalState === 'wandering') {
        const dx = deco.targetX - deco.x;
        const dy = deco.targetY - deco.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 5) {
          const speed = (deco.moveSpeed || 1.5) * 25;
          deco.x += (dx / dist) * speed * dt / 1000;
          deco.y += (dy / dist) * speed * dt / 1000;
        } else {
          deco.animalState = 'idle';
          deco.stateTimer = 1500 + Math.random() * 2500;
        }
      }
    }
  }
}

/**
 * Update interaction highlights
 */
function updateInteractionHighlights() {
  interactionTarget = null;
  
  // Check NPCs
  for (const npc of npcs) {
    const dist = distance(player.x, player.y, npc.x, npc.y);
    if (dist <= 60) {
      interactionTarget = { type: 'npc', target: npc };
      return;
    }
  }
  
  // Check interactables
  for (const inter of interactables) {
    if (inter.opened || inter.collected) continue;
    
    const dist = distance(player.x, player.y, inter.x, inter.y);
    if (dist <= 50) {
      interactionTarget = { type: 'interactable', target: inter };
      return;
    }
  }
  
  // Check items
  for (const item of items) {
    const dist = distance(player.x, player.y, item.x, item.y);
    if (dist <= 40) {
      interactionTarget = { type: 'item', target: item };
      return;
    }
  }
}

/**
 * Update player
 */
function updatePlayer(dt) {
  // Get input
  let inputX = 0;
  let inputY = 0;
  
  if (!touchControls.enabled) {
    // Use key bindings
    if (KEY_BINDINGS.moveLeft.some(k => keys[k])) inputX -= 1;
    if (KEY_BINDINGS.moveRight.some(k => keys[k])) inputX += 1;
    if (KEY_BINDINGS.moveUp.some(k => keys[k])) inputY -= 1;
    if (KEY_BINDINGS.moveDown.some(k => keys[k])) inputY += 1;
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
    
    const newX = player.x + player.vx * dt / 1000;
    const newY = player.y + player.vy * dt / 1000;
    
    // Check collision with structures (houses)
    const canMove = checkStructureCollision(player.x, player.y, newX, newY);
    
    if (canMove.x) {
      player.x = newX;
    }
    if (canMove.y) {
      player.y = newY;
    }
    
    // Update facing
    if (inputX !== 0) {
      player.facing = inputX > 0 ? 1 : -1;
    }
  }
  
  // Check if player is inside a house (for interior reveal)
  checkPlayerInsideHouse();
  
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
 * Check collision with structures (houses, buildings)
 * Returns which axes can move
 */
function checkStructureCollision(oldX, oldY, newX, newY) {
  const result = { x: true, y: true };
  
  if (!openWorld?.structures) return result;
  
  const tileSize = openWorld.tileSize || 16;
  const playerRadius = player.width / 2;
  
  for (const structure of openWorld.structures) {
    // Skip fountains and wells (can walk through)
    if (structure.type === 'fountain' || structure.type === 'well') continue;
    
    const sx = structure.x * tileSize;
    const sy = structure.y * tileSize;
    const sw = structure.width * tileSize;
    const sh = structure.height * tileSize;
    
    // If player is inside this house (via proper interaction), allow movement inside
    if (insideHouse === structure && playerEnteredHouseViaInteraction) {
      // Allow movement inside the house, but block leaving through walls
      const margin = 15;
      
      // Block if trying to leave through walls (not door)
      if (newX - playerRadius < sx + margin) result.x = false;
      if (newX + playerRadius > sx + sw - margin) result.x = false;
      if (newY - playerRadius < sy + margin) result.y = false;
      // Don't block bottom wall - that's where the door is
      
      continue;
    }
    
    // If player is NOT inside via interaction, block entry entirely
    // Collision box for entire structure including door
    if (newX + playerRadius > sx && newX - playerRadius < sx + sw &&
        oldY + playerRadius > sy && oldY - playerRadius < sy + sh) {
      result.x = false;
    }
    
    if (oldX + playerRadius > sx && oldX - playerRadius < sx + sw &&
        newY + playerRadius > sy && newY - playerRadius < sy + sh) {
      result.y = false;
    }
  }
  
  return result;
}

/**
 * Check if player is currently inside a house
 * Updates insideHouse state for interior rendering
 * Now only updates if player entered via interaction
 */
function checkPlayerInsideHouse() {
  // Don't auto-detect house entry anymore - only via E interaction
  // This function now just validates the state
  if (!openWorld?.structures) {
    insideHouse = null;
    playerEnteredHouseViaInteraction = false;
    return;
  }
  
  // If player is supposed to be inside, verify they're still in bounds
  if (insideHouse && playerEnteredHouseViaInteraction) {
    const tileSize = openWorld.tileSize || 16;
    const structure = insideHouse;
    
    const sx = structure.x * tileSize;
    const sy = structure.y * tileSize;
    const sw = structure.width * tileSize;
    const sh = structure.height * tileSize;
    
    // Check if player is still inside the house bounds
    if (player.x >= sx && player.x <= sx + sw &&
        player.y >= sy && player.y <= sy + sh) {
      // Still inside, keep state
      return;
    }
    // Player left the bounds somehow, reset state
    insideHouse = null;
    playerEnteredHouseViaInteraction = false;
  }
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
  
  // Check kill quest progress
  checkQuestObjectives('kill', 'enemy');
  
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
  
  // Clear nearby enemies
  enemies = enemies.filter(e => {
    const dist = distance(e.x, e.y, player.x, player.y);
    return dist > 500;
  });
  
  // If we have a respawn point, respawn there instead of game over
  if (respawnPoint) {
    // Respawn at village
    player.x = respawnPoint.x;
    player.y = respawnPoint.y;
    player.health = Math.floor(player.maxHealth * 0.5); // Respawn with 50% health
    player.invincible = true;
    player.invincibleTimer = 3000; // 3 seconds invincibility
    
    // Reset camera
    camera.x = player.x - window.innerWidth / 2;
    camera.y = player.y - window.innerHeight / 2;
    
    addNotification(hud, t('notification.respawn') || 'Vous vous réveillez au village...', { 
      color: '#88aaff', 
      size: 18,
      duration: 4000,
    });
    
    // Save progress
    saveWorld(worldState);
    
    return;
  }
  
  // No respawn - game over
  gameState = GAME_STATE.GAME_OVER;
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
  
  // Generate open world with village
  const seed = worldState?.seed || Date.now();
  openWorld = generateOpenWorld(seed);
  
  // Create level data compatible with existing renderer
  const tileSize = openWorld.tileSize;
  currentLevel = {
    tileMap: {
      tiles: openWorld.tiles,
      width: openWorld.width,
      height: openWorld.height,
    },
    stratum: biome,
    spawnPoint: openWorld.spawnPoint,
  };
  
  // Initialize fog of war (but make it bright)
  fogOfWar = createFogOfWar(
    openWorld.width * tileSize, 
    openWorld.height * tileSize
  );
  
  // Initialize minimap
  initMinimap(minimap, {
    tiles: openWorld.tiles,
    width: openWorld.width,
    height: openWorld.height,
  });
  
  // Apply bright daytime lighting
  lighting.ambientColor = 0xa0a0b0;
  lighting.globalBrightness = 1.5;
  lighting.lightingEnabled = true;
  
  // Add player light (soft glow)
  createPlayerLight(lighting, player.x, player.y);
  
  // Load decorations
  decorations = openWorld.decorations || [];
  
  // Load NPCs
  npcs = openWorld.npcs || [];
  
  // Load interactables
  interactables = openWorld.interactables || [];
  
  // Add lamp lights
  for (const deco of decorations) {
    if (deco.light) {
      addLight(lighting, deco.light.radius, deco.x, deco.y, deco.light.color, {
        intensity: deco.light.intensity,
        flicker: true,
        flickerSpeed: 3,
        flickerIntensity: 0.15,
      });
    }
  }
  
  // Set respawn point (village center)
  respawnPoint = { ...openWorld.spawnPoint };
  
  // Don't spawn enemies initially - they spawn based on distance
  enemies = [];
  
  // Position player at village spawn
  player.x = openWorld.spawnPoint.x;
  player.y = openWorld.spawnPoint.y;
  player.health = player.maxHealth;
  
  // Reset camera
  camera.x = player.x - window.innerWidth / 2;
  camera.y = player.y - window.innerHeight / 2;
  
  // Add village POIs to minimap
  for (const structure of openWorld.structures || []) {
    addPOI(minimap, 
      (structure.x + structure.width / 2) * tileSize,
      (structure.y + structure.height / 2) * tileSize,
      structure.type
    );
  }
  
  // Add ambient effects
  createBiomeAmbientEffect(particles, biome, 
    openWorld.width * tileSize, 
    openWorld.height * tileSize
  );
  
  // Initialize quests from world data
  activeQuests = [];
  completedQuests = worldState?.completedQuests || [];
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
        drawInventoryPanel(ctx, panels, worldState?.player?.inventory?.items || [], 
          window.innerWidth, window.innerHeight);
        break;
      case 'skills':
        drawSkillsPanel(ctx, panels, playerProgression.skills, 
          playerProgression.skillPoints, window.innerWidth, window.innerHeight);
        break;
      case 'equipment':
        drawEquipmentPanel(ctx, panels, playerProgression.equipment, 
          worldState?.player?.inventory?.items || [], window.innerWidth, window.innerHeight);
        break;
      case 'settings':
        drawSettingsPanel(ctx, panels, worldState?.settings || {}, 
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
  
  // Draw decorations (sorted by Y for depth)
  renderDecorations(ctx, camX, camY);
  
  // Draw interactables
  renderInteractables(ctx, camX, camY);
  
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
  
  // Draw enemies with different shapes based on archetype
  for (const enemy of enemies) {
    // Skip if returning to spawn (faded out)
    if (enemy.returning) {
      ctx.globalAlpha = 0.5;
    }
    
    drawEnemy(ctx, enemy);
    
    ctx.globalAlpha = 1;
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
    const baseAngle = playerCombat.attacking ? 
      (Math.sin(performance.now() * 0.03) * 0.5 - 0.8) : 0;
    
    ctx.save();
    ctx.translate(player.x + weaponOffsetX + 4, player.y - 2);
    ctx.rotate(baseAngle * player.facing);
    
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
    
    // Draw attack range indicator when attacking
    if (attackSwingActive) {
      const attackRange = player.weapon.reach || player.weapon.radius || 40;
      const arcDeg = player.weapon.arcDeg || 90;
      const startAngle = player.facing > 0 ? -Math.PI/4 : Math.PI - Math.PI/4;
      const endAngle = startAngle + (arcDeg * Math.PI / 180);
      const swingProgress = attackSwingAngle / Math.PI;
      const currentAngle = startAngle + (endAngle - startAngle) * swingProgress;
      
      // Draw attack arc
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ff6644';
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.arc(player.x, player.y, attackRange, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();
      
      // Draw swing line
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#ffaa44';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(
        player.x + Math.cos(currentAngle) * attackRange,
        player.y + Math.sin(currentAngle) * attackRange
      );
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  
  ctx.globalAlpha = 1;
  
  // Draw NPCs
  renderNPCs(ctx, camX, camY);
  
  // Draw particles
  drawParticles(particles, ctx, camX, camY);
  
  // Draw damage numbers
  drawDamageNumbers(ctx, camX, camY);
  
  ctx.restore();
  
  // Draw lighting (screen space)
  renderLighting(lighting, ctx, camX, camY, window.innerWidth, window.innerHeight);
  
  // Apply atmospheric distance fog (danger zones get darker)
  renderAtmosphericFog(ctx, camX, camY);
  
  // Draw HUD
  drawHealthBar(ctx, hud, player.health, player.maxHealth, 0, 0);
  drawManaBar(ctx, hud, player.mana, player.maxMana, 0, 0);
  drawXPBar(ctx, hud, playerProgression.xp, playerProgression.xpToNext, 
    playerProgression.level, 0, 0);
  drawComboCounter(ctx, hud, window.innerWidth / 2, 100);
  drawStatusEffects(ctx, hud, 20, 100);
  drawNotifications(ctx, hud, window.innerWidth, window.innerHeight);
  
  // Draw active quests
  renderQuestTracker(ctx);
  
  // Draw interaction prompt
  renderInteractionPrompt(ctx);
  
  // Draw dialogue
  if (dialogueState) {
    renderDialogue(ctx);
  }
  
  // Draw minimap
  drawMinimap(ctx, minimap, player.x, player.y, currentBiome, window.innerWidth);
  
  // Draw zone indicator (top center)
  renderZoneIndicator(ctx);
  
  // Draw controls guide (bottom left)
  renderControlsGuide(ctx);
  
  // Draw inventory items count
  renderInventoryHUD(ctx);
  
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
 * Get zone-based tile colors
 */
function getZoneTileColors(zoneType, tile) {
  const zoneConfig = ZONE_CONFIG[zoneType];
  
  // Base colors for each zone type
  const zoneColors = {
    [ZONE_TYPES.VILLAGE]: {
      [WORLD_TILES.GRASS]: ['#5aaf5a', '#5abf5a', '#6acf6a'],
      [WORLD_TILES.DIRT]: ['#9a7b5a', '#8a6b4a', '#aa8b6a'],
      [WORLD_TILES.FLOWERS]: ['#5aaf5a', '#5abf5a', '#6acf6a'],
      [WORLD_TILES.PATH]: ['#c4a878', '#b49868', '#d4b888'],
    },
    [ZONE_TYPES.FOREST]: {
      [WORLD_TILES.GRASS]: ['#3a8f3a', '#3a7f3a', '#4a8f4a'],
      [WORLD_TILES.DIRT]: ['#6a5b3a', '#5a4b2a', '#7a6b4a'],
      [WORLD_TILES.FLOWERS]: ['#3a8f3a', '#4a9f4a', '#3a7f3a'],
      [WORLD_TILES.TALL_GRASS]: ['#2a6f2a', '#3a7f3a', '#2a5f2a'],
      [WORLD_TILES.MUSHROOM_PATCH]: ['#5a4a3a', '#4a3a2a', '#6a5a4a'],
    },
    [ZONE_TYPES.DEEP_FOREST]: {
      [WORLD_TILES.GRASS]: ['#2a5f2a', '#2a4f2a', '#3a5f3a'],
      [WORLD_TILES.DIRT]: ['#4a3b2a', '#3a2b1a', '#5a4b3a'],
      [WORLD_TILES.TALL_GRASS]: ['#1a4f1a', '#2a5f2a', '#1a3f1a'],
      [WORLD_TILES.MOSS]: ['#2a6f3a', '#3a7f4a', '#2a5f2a'],
      [WORLD_TILES.SWAMP]: ['#3a4f3a', '#2a3f2a', '#4a5f4a'],
    },
    [ZONE_TYPES.CORRUPTED]: {
      [WORLD_TILES.GRASS]: ['#4a3a5a', '#5a4a6a', '#3a2a4a'],
      [WORLD_TILES.CORRUPTED_GRASS]: ['#5a3a6a', '#6a4a7a', '#4a2a5a'],
      [WORLD_TILES.DIRT]: ['#3a2a3a', '#4a3a4a', '#2a1a2a'],
      [WORLD_TILES.CORRUPTED_DIRT]: ['#4a2a4a', '#5a3a5a', '#3a1a3a'],
      [WORLD_TILES.STONE]: ['#4a3a4a', '#5a4a5a', '#3a2a3a'],
      [WORLD_TILES.CORRUPTION_VEIN]: ['#8a4aaa', '#9a5aba', '#7a3a9a'],
      [WORLD_TILES.DEAD_GRASS]: ['#5a5a4a', '#6a6a5a', '#4a4a3a'],
    },
    [ZONE_TYPES.CORRUPTED_CORE]: {
      [WORLD_TILES.GRASS]: ['#2a1a3a', '#3a2a4a', '#1a0a2a'],
      [WORLD_TILES.CORRUPTED_GRASS]: ['#3a1a4a', '#4a2a5a', '#2a0a3a'],
      [WORLD_TILES.DIRT]: ['#2a1a2a', '#3a2a3a', '#1a0a1a'],
      [WORLD_TILES.STONE]: ['#3a2a3a', '#4a3a4a', '#2a1a2a'],
      [WORLD_TILES.CORRUPTION_VEIN]: ['#aa5acc', '#ba6add', '#9a4abb'],
      [WORLD_TILES.DEAD_GRASS]: ['#3a3a2a', '#4a4a3a', '#2a2a1a'],
    },
  };
  
  // Default colors
  const defaultColors = {
    [WORLD_TILES.GRASS]: ['#4a8f4a', '#4a9a4a', '#5a9f5a'],
    [WORLD_TILES.DIRT]: ['#8a6b4a', '#7a5b3a', '#9a7b5a'],
    [WORLD_TILES.STONE]: ['#666666', '#777777', '#555555'],
    [WORLD_TILES.WATER]: ['#3366aa', '#2255aa', '#4477bb'],
    [WORLD_TILES.SAND]: ['#ddc088', '#ccb078', '#eed098'],
    [WORLD_TILES.WALL]: ['#554433', '#443322', '#665544'],
    [WORLD_TILES.FLOOR_WOOD]: ['#8a6644', '#7a5534', '#9a7654'],
    [WORLD_TILES.FLOOR_STONE]: ['#888888', '#777777', '#999999'],
    [WORLD_TILES.PATH]: ['#aa9966', '#9a8856', '#bba976'],
    [WORLD_TILES.BRIDGE]: ['#775533', '#664422', '#886644'],
    [WORLD_TILES.FLOWERS]: ['#4a8f4a', '#4a9a4a', '#5a9f5a'],
    [WORLD_TILES.TALL_GRASS]: ['#3a7f3a', '#3a8a3a', '#4a8f4a'],
  };
  
  return zoneColors[zoneType]?.[tile] || defaultColors[tile] || defaultColors[WORLD_TILES.GRASS];
}

/**
 * Get day/night lighting parameters
 * Returns brightness (0-1), color tint, and whether it's night
 */
function getDayNightLighting() {
  // Time ranges:
  // 0.0 - 0.20: Night (dark blue)
  // 0.20 - 0.30: Dawn (orange/pink transition)
  // 0.30 - 0.70: Day (bright white/yellow)
  // 0.70 - 0.80: Dusk (orange/pink transition)
  // 0.80 - 1.0: Night (dark blue)
  
  let brightness = 1.0;
  let tintR = 0, tintG = 0, tintB = 0;
  let isNight = false;
  
  if (gameTime < 0.20 || gameTime > 0.80) {
    // Night
    isNight = true;
    brightness = 0.35;
    tintR = 20;
    tintG = 30;
    tintB = 60;
  } else if (gameTime < 0.30) {
    // Dawn transition
    const t = (gameTime - 0.20) / 0.10;
    brightness = 0.35 + t * 0.65;
    tintR = Math.floor(20 + t * 40); // Orange tint
    tintG = Math.floor(30 - t * 10);
    tintB = Math.floor(60 - t * 60);
  } else if (gameTime > 0.70 && gameTime <= 0.80) {
    // Dusk transition
    const t = (gameTime - 0.70) / 0.10;
    brightness = 1.0 - t * 0.65;
    tintR = Math.floor(60 - t * 40); // Orange to dark
    tintG = Math.floor(20 + t * 10);
    tintB = Math.floor(t * 60);
  } else {
    // Full day
    brightness = 1.0;
    tintR = 0;
    tintG = 0;
    tintB = 0;
  }
  
  return { brightness, tintR, tintG, tintB, isNight };
}

/**
 * Render world tiles with zone-based graphics
 */
function renderWorld(ctx, level, camX, camY) {
  const tileSize = openWorld?.tileSize || TILE_SIZE;
  const villageCenter = openWorld?.villageCenter || { x: 100, y: 75 };
  
  // Get day/night lighting
  const dayNight = getDayNightLighting();
  
  const startTileX = Math.max(0, Math.floor(camX / tileSize));
  const startTileY = Math.max(0, Math.floor(camY / tileSize));
  const endTileX = Math.min(level.width, Math.ceil((camX + window.innerWidth) / tileSize) + 1);
  const endTileY = Math.min(level.height, Math.ceil((camY + window.innerHeight) / tileSize) + 1);
  
  // Time for animations
  const time = performance.now();
  
  for (let y = startTileY; y < endTileY; y++) {
    for (let x = startTileX; x < endTileX; x++) {
      const tile = level.tiles[y * level.width + x];
      const tileX = x * tileSize;
      const tileY = y * tileSize;
      
      // Get zone type for this tile
      const zoneType = getZoneTypeAt(villageCenter, x, y);
      const zoneConfig = ZONE_CONFIG[zoneType];
      
      // Distance from village for effects
      const distFromVillage = distance(x, y, villageCenter.x, villageCenter.y);
      
      // Use position-based variation
      const variation = ((x * 7 + y * 13) % 3);
      const seed = x * 1000 + y;
      
      // Get zone-aware colors
      const colors = getZoneTileColors(zoneType, tile);
      const baseColor = colors[variation % colors.length];
      
      // Apply ambient lighting based on zone AND day/night cycle
      const zoneAmbientLight = zoneConfig?.ambientLight || 1.0;
      const combinedLight = zoneAmbientLight * dayNight.brightness;
      const adjustedColor = adjustColorBrightness(baseColor, combinedLight);
      
      // Draw tile based on type with zone-specific effects
      renderTileWithZoneEffects(ctx, tile, tileX, tileY, tileSize, {
        baseColor: adjustedColor,
        zoneType,
        zoneConfig,
        variation,
        seed,
        time,
        distFromVillage,
        x, y,
        dayNight,
      });
    }
  }
  
  // Render zone-specific decorations on top
  renderZoneDecorations(ctx, camX, camY, startTileX, startTileY, endTileX, endTileY, tileSize);
  
  // Draw village structures on top
  renderStructures(ctx, camX, camY, startTileX, startTileY, endTileX, endTileY, tileSize);
  
  // Apply day/night color tint overlay
  if (dayNight.tintR !== 0 || dayNight.tintG !== 0 || dayNight.tintB !== 0) {
    ctx.fillStyle = `rgba(${dayNight.tintR}, ${dayNight.tintG}, ${dayNight.tintB}, 0.2)`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  
  // Render stars at night
  if (dayNight.isNight) {
    renderNightStars(ctx, camX, camY);
  }
}

/**
 * Render stars during night time
 */
function renderNightStars(ctx, camX, camY) {
  const time = performance.now();
  const starCount = 50;
  
  for (let i = 0; i < starCount; i++) {
    // Seeded position
    const sx = ((i * 137) % ctx.canvas.width);
    const sy = ((i * 251) % (ctx.canvas.height * 0.4)); // Stars only in upper half
    
    // Twinkling effect
    const twinkle = 0.5 + Math.sin(time * 0.002 + i * 0.5) * 0.5;
    
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + twinkle * 0.5})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1 + twinkle, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Render a single tile with zone-specific effects
 */
function renderTileWithZoneEffects(ctx, tile, tileX, tileY, tileSize, params) {
  const { baseColor, zoneType, zoneConfig, variation, seed, time, distFromVillage, x, y } = params;
  
  // Base tile
  ctx.fillStyle = baseColor;
  ctx.fillRect(tileX, tileY, tileSize, tileSize);
  
  // Zone-specific tile effects
  if (tile === WORLD_TILES.WALL) {
    renderWallTile(ctx, tileX, tileY, tileSize, baseColor, y);
  } else if (tile === WORLD_TILES.WATER) {
    renderWaterTile(ctx, tileX, tileY, tileSize, baseColor, time, x, y, zoneType);
  } else if (tile === WORLD_TILES.FLOOR_WOOD) {
    renderWoodFloorTile(ctx, tileX, tileY, tileSize, baseColor, x, y);
  } else if (tile === WORLD_TILES.PATH) {
    renderPathTile(ctx, tileX, tileY, tileSize, baseColor, seed, zoneType);
  } else if (tile === WORLD_TILES.FLOWERS) {
    renderFlowersTile(ctx, tileX, tileY, tileSize, baseColor, seed, zoneType);
  } else if (tile === WORLD_TILES.TALL_GRASS) {
    renderTallGrassTile(ctx, tileX, tileY, tileSize, baseColor, seed, time, zoneType);
  } else {
    // Default grass/dirt with zone effects
    renderDefaultTile(ctx, tileX, tileY, tileSize, baseColor, seed, zoneType, zoneConfig);
  }
  
  // Add corruption effects for corrupted zones
  if (zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE) {
    renderCorruptionOverlay(ctx, tileX, tileY, tileSize, seed, time, zoneType);
  }
  
  // Add shadows based on distance (darker at edges)
  if (distFromVillage > 50) {
    const shadowIntensity = Math.min(0.4, (distFromVillage - 50) / 200);
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowIntensity * 0.3})`;
    ctx.fillRect(tileX, tileY, tileSize, tileSize);
  }
}

/**
 * Render wall tile with brick pattern
 */
function renderWallTile(ctx, tileX, tileY, tileSize, baseColor, y) {
  const brickH = tileSize / 2;
  const offset = (y % 2) * (tileSize / 2);
  
  ctx.fillStyle = darkenHex(baseColor, 0.3);
  ctx.fillRect(tileX, tileY + brickH - 1, tileSize, 2);
  ctx.fillRect(tileX + (tileSize / 2 + offset) % tileSize, tileY, 2, brickH);
  ctx.fillRect(tileX + offset, tileY + brickH, 2, brickH);
  
  ctx.fillStyle = lightenHex(baseColor, 0.2);
  ctx.fillRect(tileX, tileY, tileSize, 2);
}

/**
 * Render water tile with animation and zone effects
 */
function renderWaterTile(ctx, tileX, tileY, tileSize, baseColor, time, x, y, zoneType) {
  const wave = Math.sin(time * 0.002 + x * 0.5 + y * 0.3) * 0.15;
  
  // Corrupted water is darker and has different color
  if (zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE) {
    ctx.fillStyle = '#2a1a4a';
    ctx.fillRect(tileX, tileY, tileSize, tileSize);
    ctx.fillStyle = `rgba(150, 80, 200, ${0.2 + wave})`;
  } else {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + wave})`;
  }
  
  const variation = ((x * 7 + y * 13) % 3);
  ctx.fillRect(tileX + (variation * 4), tileY + (variation * 3), tileSize / 2, 2);
}

/**
 * Render wood floor tile
 */
function renderWoodFloorTile(ctx, tileX, tileY, tileSize, baseColor, x, y) {
  ctx.fillStyle = darkenHex(baseColor, 0.2);
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(tileX, tileY + i * (tileSize / 3), tileSize, 1);
  }
  
  if ((x + y) % 7 === 0) {
    ctx.fillStyle = darkenHex(baseColor, 0.3);
    ctx.beginPath();
    ctx.arc(tileX + tileSize / 2, tileY + tileSize / 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Render path tile with zone effects
 */
function renderPathTile(ctx, tileX, tileY, tileSize, baseColor, seed, zoneType) {
  // Small stones
  if (seed % 5 === 0) {
    const stoneColor = zoneType === ZONE_TYPES.CORRUPTED ? '#6a5a7a' : '#999988';
    ctx.fillStyle = stoneColor;
    ctx.beginPath();
    ctx.arc(tileX + (seed % 20) + 6, tileY + ((seed * 3) % 20) + 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(tileX, tileY, 2, tileSize);
  ctx.fillRect(tileX + tileSize - 2, tileY, 2, tileSize);
}

/**
 * Render flowers tile with zone-specific flowers
 */
function renderFlowersTile(ctx, tileX, tileY, tileSize, baseColor, seed, zoneType) {
  const flowerColors = zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE
    ? ['#aa66cc', '#8844aa', '#cc88ee', '#6622aa']
    : ['#ff6688', '#ffcc44', '#88aaff', '#ff88cc', '#ffffff'];
  
  for (let i = 0; i < 3; i++) {
    const fx = tileX + ((seed + i * 7) % (tileSize - 4)) + 2;
    const fy = tileY + ((seed + i * 11) % (tileSize - 4)) + 2;
    const fc = flowerColors[(seed + i) % flowerColors.length];
    
    ctx.fillStyle = fc;
    ctx.beginPath();
    ctx.arc(fx, fy, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = zoneType === ZONE_TYPES.CORRUPTED ? '#4a3a5a' : '#3a6a3a';
    ctx.fillRect(fx - 0.5, fy, 1, 4);
  }
}

/**
 * Render tall grass tile with animation
 */
function renderTallGrassTile(ctx, tileX, tileY, tileSize, baseColor, seed, time, zoneType) {
  const grassColor = zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE
    ? '#5a4a6a' 
    : zoneType === ZONE_TYPES.DEEP_FOREST 
    ? '#2a5f2a' 
    : '#5aaf5a';
  
  ctx.fillStyle = grassColor;
  
  for (let i = 0; i < 5; i++) {
    const gx = tileX + ((seed + i * 5) % (tileSize - 2));
    const sway = Math.sin(time * 0.002 + seed + i) * 2;
    
    ctx.beginPath();
    ctx.moveTo(gx, tileY + tileSize);
    ctx.lineTo(gx + sway, tileY + tileSize - 12);
    ctx.lineTo(gx + 2, tileY + tileSize);
    ctx.fill();
  }
}

/**
 * Render default tile with subtle texture
 */
function renderDefaultTile(ctx, tileX, tileY, tileSize, baseColor, seed, zoneType, zoneConfig) {
  if ((seed % 5) === 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(tileX + (seed % 12), tileY + ((seed * 3) % 12), 2, 2);
  }
  if ((seed % 7) === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(tileX + ((seed * 2) % 10), tileY + ((seed * 5) % 10), 2, 2);
  }
  
  // Subtle grid
  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  ctx.fillRect(tileX, tileY, 1, tileSize);
  ctx.fillRect(tileX, tileY, tileSize, 1);
}

/**
 * Render corruption overlay effects
 */
function renderCorruptionOverlay(ctx, tileX, tileY, tileSize, seed, time, zoneType) {
  // Corruption veins
  if (seed % 15 === 0) {
    const pulseIntensity = 0.3 + Math.sin(time * 0.003 + seed) * 0.2;
    const veinColor = zoneType === ZONE_TYPES.CORRUPTED_CORE 
      ? `rgba(180, 100, 220, ${pulseIntensity})`
      : `rgba(140, 80, 180, ${pulseIntensity})`;
    
    ctx.fillStyle = veinColor;
    
    // Draw corruption vein pattern
    ctx.beginPath();
    ctx.moveTo(tileX + (seed % tileSize), tileY);
    ctx.lineTo(tileX + ((seed * 2) % tileSize), tileY + tileSize);
    ctx.lineTo(tileX + ((seed * 2) % tileSize) + 3, tileY + tileSize);
    ctx.lineTo(tileX + (seed % tileSize) + 3, tileY);
    ctx.fill();
  }
  
  // Corruption particles (rare)
  if (seed % 30 === 0) {
    const particleY = tileY + (time * 0.02 + seed) % tileSize;
    const particleX = tileX + tileSize / 2 + Math.sin(time * 0.005 + seed) * 5;
    
    ctx.fillStyle = 'rgba(200, 120, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Render zone-specific decorations (trees, rocks, effects)
 */
function renderZoneDecorations(ctx, camX, camY, startX, startY, endX, endY, tileSize) {
  if (!openWorld?.decorations) return;
  
  const villageCenter = openWorld.villageCenter || { x: 100, y: 75 };
  const time = performance.now();
  
  // Sort decorations by Y for proper depth
  const visibleDecorations = openWorld.decorations.filter(d => {
    const dx = d.x / tileSize;
    const dy = d.y / tileSize;
    return dx >= startX - 5 && dx <= endX + 5 && dy >= startY - 5 && dy <= endY + 5;
  }).sort((a, b) => a.y - b.y);
  
  for (const deco of visibleDecorations) {
    const zoneType = getZoneTypeAt(villageCenter, deco.x / tileSize, deco.y / tileSize);
    renderDecoration(ctx, deco, zoneType, time);
  }
}

/**
 * Render a single decoration with zone-aware styling
 */
function renderDecoration(ctx, deco, zoneType, time) {
  const x = deco.x;
  const y = deco.y;
  
  switch (deco.type) {
    // Trees
    case ENTITY_TYPES.TREE_OAK:
    case ENTITY_TYPES.TREE_PINE:
    case ENTITY_TYPES.TREE_WILLOW:
    case ENTITY_TYPES.TREE_GIANT:
      renderTree(ctx, x, y, deco.type, zoneType, time);
      break;
    case ENTITY_TYPES.TREE_DEAD:
    case ENTITY_TYPES.TREE_CORRUPTED:
      renderDeadTree(ctx, x, y, deco.type, zoneType, time);
      break;
    case ENTITY_TYPES.FALLEN_LOG:
      renderFallenLog(ctx, x, y, zoneType);
      break;
    case ENTITY_TYPES.STUMP:
      renderStump(ctx, x, y, zoneType);
      break;
    
    // Bushes and vegetation
    case ENTITY_TYPES.BUSH:
    case ENTITY_TYPES.BUSH_BERRY:
    case ENTITY_TYPES.BUSH_THORNS:
      renderBush(ctx, x, y, zoneType, deco.type);
      break;
    case ENTITY_TYPES.FERN:
      renderFern(ctx, x, y, zoneType, time);
      break;
    case ENTITY_TYPES.TALL_GRASS_PATCH:
      renderTallGrass(ctx, x, y, zoneType, time);
      break;
    case ENTITY_TYPES.FLOWER_BED:
      renderFlowerBed(ctx, x, y, zoneType, time);
      break;
    
    // Rocks
    case ENTITY_TYPES.ROCK:
    case ENTITY_TYPES.ROCK_LARGE:
    case ENTITY_TYPES.ROCK_MOSS:
    case ENTITY_TYPES.ROCK_PILE:
      renderRock(ctx, x, y, deco.type, zoneType);
      break;
    case ENTITY_TYPES.BOULDER:
      renderBoulder(ctx, x, y, zoneType);
      break;
    
    // Terrain features
    case ENTITY_TYPES.MOUNTAIN:
    case ENTITY_TYPES.MOUNTAIN_SMALL:
      renderMountain(ctx, x, y, deco.type);
      break;
    case ENTITY_TYPES.HILL:
      renderHill(ctx, x, y, zoneType);
      break;
    case ENTITY_TYPES.CAVE_ENTRANCE:
      renderCaveEntrance(ctx, x, y, time);
      break;
    case ENTITY_TYPES.POND:
      renderPond(ctx, x, y, zoneType, time);
      break;
    case ENTITY_TYPES.FISHING_SPOT:
      renderFishingSpot(ctx, x, y, time);
      break;
    
    // Mushrooms
    case ENTITY_TYPES.MUSHROOM:
    case ENTITY_TYPES.MUSHROOM_GLOWING:
    case ENTITY_TYPES.MUSHROOM_CLUSTER:
      renderMushroom(ctx, x, y, deco.type, zoneType, time);
      break;
    
    // Village props
    case ENTITY_TYPES.LAMP_POST:
      renderLampPost(ctx, x, y, time);
      break;
    case ENTITY_TYPES.BARREL:
      renderBarrel(ctx, x, y);
      break;
    case ENTITY_TYPES.CRATE:
      renderCrate(ctx, x, y);
      break;
    case ENTITY_TYPES.HAY_BALE:
      renderHayBale(ctx, x, y);
      break;
    case ENTITY_TYPES.BENCH:
      renderBench(ctx, x, y);
      break;
    case ENTITY_TYPES.WHEELBARROW:
      renderWheelbarrow(ctx, x, y);
      break;
    case ENTITY_TYPES.SCARECROW:
      renderScarecrow(ctx, x, y, time);
      break;
    case ENTITY_TYPES.CAMPFIRE:
      renderCampfire(ctx, x, y, time);
      break;
    
    // Animals - Passive
    case ENTITY_TYPES.ANIMAL_RABBIT:
      renderAnimalRabbit(ctx, x, y, deco, time);
      break;
    case ENTITY_TYPES.ANIMAL_DEER:
      renderAnimalDeer(ctx, x, y, deco, time);
      break;
    case ENTITY_TYPES.ANIMAL_SQUIRREL:
      renderAnimalSquirrel(ctx, x, y, deco, time);
      break;
    case ENTITY_TYPES.ANIMAL_FOX:
      renderAnimalFox(ctx, x, y, deco, time);
      break;
    case ENTITY_TYPES.ANIMAL_FROG:
      renderAnimalFrog(ctx, x, y, deco, time);
      break;
    case ENTITY_TYPES.ANIMAL_BIRD:
      renderAnimalBird(ctx, x, y, deco, time);
      break;
    case ENTITY_TYPES.ANIMAL_BUTTERFLY:
      renderAnimalButterfly(ctx, x, y, deco, time);
      break;
    
    // Animals - Aggressive
    case ENTITY_TYPES.ANIMAL_WOLF:
      renderAnimalWolf(ctx, x, y, deco, time);
      break;
    case ENTITY_TYPES.ANIMAL_BOAR:
      renderAnimalBoar(ctx, x, y, deco, time);
      break;
    case ENTITY_TYPES.ANIMAL_BEAR:
      renderAnimalBear(ctx, x, y, deco, time);
      break;
    case ENTITY_TYPES.ANIMAL_SNAKE:
      renderAnimalSnake(ctx, x, y, deco, time);
      break;
    case ENTITY_TYPES.ANIMAL_BAT:
      renderAnimalBat(ctx, x, y, deco, time);
      break;
    
    // Corrupted
    case ENTITY_TYPES.CORRUPTION_CRYSTAL:
      renderCorruptionCrystal(ctx, x, y, time);
      break;
    case ENTITY_TYPES.CORRUPTION_TENDRIL:
      renderCorruptionTendril(ctx, x, y, time);
      break;
    case ENTITY_TYPES.DARK_OBELISK:
      renderDarkObelisk(ctx, x, y, time);
      break;
    case ENTITY_TYPES.PORTAL_SMALL:
      renderPortal(ctx, x, y, time);
      break;
    case ENTITY_TYPES.SKULL_PILE:
      renderSkullPile(ctx, x, y, zoneType);
      break;
    case ENTITY_TYPES.DEAD_ANIMAL:
      renderDeadAnimal(ctx, x, y, zoneType);
      break;
    case ENTITY_TYPES.CORRUPTED_POOL:
      renderCorruptedPool(ctx, x, y, time);
      break;
    
    // Ambient effects
    case ENTITY_TYPES.FIREFLY_ZONE:
      renderFireflies(ctx, x, y, time);
      break;
    case ENTITY_TYPES.MIST_ZONE:
      renderMist(ctx, x, y, time);
      break;
    case ENTITY_TYPES.SPORE_ZONE:
      renderSpores(ctx, x, y, time);
      break;
    case ENTITY_TYPES.LEAF_FALL_ZONE:
      renderLeafFall(ctx, x, y, time);
      break;
    case ENTITY_TYPES.BIRD_FLOCK:
      renderBirdFlock(ctx, x, y, time);
      break;
    
    default:
      // Default decoration
      ctx.fillStyle = '#888888';
      ctx.fillRect(x - 5, y - 5, 10, 10);
  }
}

/**
 * Render tree with zone-specific appearance
 */
function renderTree(ctx, x, y, treeType, zoneType, time) {
  const isCorrupted = zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE;
  const isDeepForest = zoneType === ZONE_TYPES.DEEP_FOREST;
  const isGiant = treeType === ENTITY_TYPES.TREE_GIANT;
  const isPine = treeType === ENTITY_TYPES.TREE_PINE;
  const isWillow = treeType === ENTITY_TYPES.TREE_WILLOW;
  
  const scale = isGiant ? 1.8 : 1.0;
  
  // Tree shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 25 * scale, 10 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Trunk color based on zone
  const trunkColor = isCorrupted ? '#3a2a3a' : isDeepForest ? '#4a3a2a' : '#5a4a3a';
  const trunkDark = darkenHex(trunkColor, 0.3);
  
  // Trunk dimensions
  const trunkWidth = (isPine ? 10 : 16) * scale;
  const trunkHeight = (isPine ? 70 : isGiant ? 90 : 55) * scale;
  
  // Trunk
  ctx.fillStyle = trunkColor;
  ctx.fillRect(x - trunkWidth/2, y - trunkHeight, trunkWidth, trunkHeight + 5);
  
  // Trunk shadow
  ctx.fillStyle = trunkDark;
  ctx.fillRect(x - trunkWidth/2, y - trunkHeight, trunkWidth * 0.25, trunkHeight + 5);
  
  // Trunk texture
  ctx.fillStyle = darkenHex(trunkColor, 0.15);
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x - trunkWidth/2 + 2 + (i * 3 * scale), y - trunkHeight + 5 + (i * 10 * scale), 2 * scale, 8 * scale);
  }
  
  // Leaves/canopy color based on zone
  let leafColor, leafDark, leafLight;
  
  if (isCorrupted) {
    leafColor = zoneType === ZONE_TYPES.CORRUPTED_CORE ? '#4a2a5a' : '#5a3a6a';
    leafDark = '#3a1a4a';
    leafLight = '#6a4a7a';
  } else if (isDeepForest) {
    leafColor = '#2a5f2a';
    leafDark = '#1a4f1a';
    leafLight = '#3a6f3a';
  } else {
    leafColor = '#3a8f3a';
    leafDark = '#2a7f2a';
    leafLight = '#4a9f4a';
  }
  
  // Canopy with wind sway
  const sway = Math.sin(time * 0.001 + x * 0.1) * 3 * scale;
  
  if (isPine) {
    // Pine tree - triangular layers
    const layers = isGiant ? 5 : 3;
    for (let i = 0; i < layers; i++) {
      const layerY = y - trunkHeight - i * 20 * scale + 30 * scale;
      const layerWidth = (40 - i * 8) * scale;
      
      ctx.fillStyle = i % 2 === 0 ? leafDark : leafColor;
      ctx.beginPath();
      ctx.moveTo(x + sway, layerY - 25 * scale);
      ctx.lineTo(x + sway - layerWidth/2, layerY);
      ctx.lineTo(x + sway + layerWidth/2, layerY);
      ctx.closePath();
      ctx.fill();
    }
  } else if (isWillow) {
    // Willow tree - drooping branches
    ctx.fillStyle = leafColor;
    ctx.beginPath();
    ctx.arc(x + sway, y - trunkHeight - 10, 30 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Hanging vines
    ctx.strokeStyle = leafDark;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const vx = x + sway + (i - 4) * 8 * scale;
      const vineLength = 40 + Math.sin(time * 0.002 + i) * 10;
      ctx.beginPath();
      ctx.moveTo(vx, y - trunkHeight);
      ctx.bezierCurveTo(vx - 5, y - trunkHeight + vineLength * 0.3, 
                        vx + 5, y - trunkHeight + vineLength * 0.6, 
                        vx + Math.sin(time * 0.001 + i) * 5, y - trunkHeight + vineLength * scale);
      ctx.stroke();
    }
  } else {
    // Oak/default tree - round canopy
    ctx.fillStyle = leafDark;
    ctx.beginPath();
    ctx.arc(x + sway - 15 * scale, y - trunkHeight - 5, 20 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = leafColor;
    ctx.beginPath();
    ctx.arc(x + sway, y - trunkHeight - 15, 25 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x + sway + 12 * scale, y - trunkHeight - 5, 18 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlights
    ctx.fillStyle = leafLight;
    ctx.beginPath();
    ctx.arc(x + sway - 5 * scale, y - trunkHeight - 22, 12 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Corrupted trees have glowing particles
  if (isCorrupted && Math.random() < 0.1) {
    ctx.fillStyle = 'rgba(180, 100, 220, 0.7)';
    ctx.beginPath();
    ctx.arc(x + sway + (Math.random() - 0.5) * 30 * scale, y - trunkHeight - 10 + (Math.random() - 0.5) * 20 * scale, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Render bush with zone effects
 */
function renderBush(ctx, x, y, zoneType, bushType = ENTITY_TYPES.BUSH) {
  const isCorrupted = zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE;
  const isThorns = bushType === ENTITY_TYPES.BUSH_THORNS;
  const isBerry = bushType === ENTITY_TYPES.BUSH_BERRY;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  let bushColor, bushLight;
  
  if (isThorns || isCorrupted) {
    bushColor = '#3a2a3a';
    bushLight = '#4a3a4a';
  } else {
    bushColor = '#3a7f3a';
    bushLight = '#4a8f4a';
  }
  
  ctx.fillStyle = bushColor;
  ctx.beginPath();
  ctx.arc(x - 5, y - 5, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 5, y - 3, 8, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = bushLight;
  ctx.beginPath();
  ctx.arc(x, y - 8, 6, 0, Math.PI * 2);
  ctx.fill();
  
  // Berry decorations
  if (isBerry && !isCorrupted) {
    ctx.fillStyle = '#cc3333';
    ctx.beginPath();
    ctx.arc(x - 6, y - 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 4, y - 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 2, y - 3, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Thorns
  if (isThorns) {
    ctx.strokeStyle = '#5a4a5a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    const thorns = [
      [-10, -8, -15, -12],
      [8, -6, 14, -10],
      [-3, -12, -5, -18],
      [5, -10, 10, -16],
      [-8, -2, -14, -4],
    ];
    
    for (const [x1, y1, x2, y2] of thorns) {
      ctx.beginPath();
      ctx.moveTo(x + x1, y + y1);
      ctx.lineTo(x + x2, y + y2);
      ctx.stroke();
    }
  }
}

/**
 * Render rock with zone effects
 */
function renderRock(ctx, x, y, rockType, zoneType) {
  const isCorrupted = zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE;
  const isLarge = rockType === ENTITY_TYPES.ROCK_LARGE;
  const isMoss = rockType === ENTITY_TYPES.ROCK_MOSS;
  const isPile = rockType === ENTITY_TYPES.ROCK_PILE;
  
  const size = isLarge ? 1.5 : 1;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 5 * size, 15 * size, 6 * size, 0, 0, Math.PI * 2);
  ctx.fill();
  
  const rockColor = isCorrupted ? '#4a3a4a' : (isMoss ? '#5a6a5a' : '#666666');
  const rockDark = isCorrupted ? '#3a2a3a' : (isMoss ? '#4a5a4a' : '#555555');
  const rockLight = isCorrupted ? '#5a4a5a' : (isMoss ? '#6a7a6a' : '#888888');
  
  if (isPile) {
    // Render pile of smaller rocks
    const rocks = [
      { dx: -8, dy: 2, r: 8 },
      { dx: 5, dy: 3, r: 7 },
      { dx: -2, dy: -2, r: 10 },
      { dx: 8, dy: -1, r: 6 },
      { dx: -5, dy: -5, r: 5 },
    ];
    
    for (const rock of rocks) {
      ctx.fillStyle = rockColor;
      ctx.beginPath();
      ctx.arc(x + rock.dx, y + rock.dy, rock.r, 0, Math.PI * 2);
      ctx.fill();
      
      // Highlight
      ctx.fillStyle = rockLight;
      ctx.beginPath();
      ctx.arc(x + rock.dx - rock.r * 0.2, y + rock.dy - rock.r * 0.3, rock.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  
  // Main rock shape
  ctx.fillStyle = rockColor;
  ctx.beginPath();
  ctx.moveTo(x - 12 * size, y);
  ctx.lineTo(x - 8 * size, y - 15 * size);
  ctx.lineTo(x + 5 * size, y - 18 * size);
  ctx.lineTo(x + 12 * size, y - 8 * size);
  ctx.lineTo(x + 10 * size, y);
  ctx.closePath();
  ctx.fill();
  
  // Shadow side
  ctx.fillStyle = rockDark;
  ctx.beginPath();
  ctx.moveTo(x - 12 * size, y);
  ctx.lineTo(x - 8 * size, y - 15 * size);
  ctx.lineTo(x - 2 * size, y - 10 * size);
  ctx.lineTo(x - 5 * size, y);
  ctx.closePath();
  ctx.fill();
  
  // Highlight
  ctx.fillStyle = rockLight;
  ctx.beginPath();
  ctx.moveTo(x + 5 * size, y - 18 * size);
  ctx.lineTo(x + 8 * size, y - 14 * size);
  ctx.lineTo(x + 3 * size, y - 12 * size);
  ctx.closePath();
  ctx.fill();
  
  // Moss on rocks
  if (isMoss) {
    ctx.fillStyle = '#4a8a3a';
    ctx.beginPath();
    ctx.ellipse(x - 2 * size, y - 5 * size, 8 * size, 4 * size, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 5 * size, y - 12 * size, 5 * size, 3 * size, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Corruption crystals on large rocks
  if (isCorrupted && isLarge) {
    ctx.fillStyle = '#aa66cc';
    ctx.beginPath();
    ctx.moveTo(x, y - 20 * size);
    ctx.lineTo(x - 3, y - 25 * size);
    ctx.lineTo(x + 3, y - 25 * size);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Render mushroom with glow effect (enhanced at night)
 */
function renderMushroom(ctx, x, y, type, zoneType, time) {
  const isGlowing = type === ENTITY_TYPES.MUSHROOM_GLOWING;
  const isCluster = type === ENTITY_TYPES.MUSHROOM_CLUSTER;
  const isCorrupted = zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE;
  const dayNight = getDayNightLighting();
  const nightBoost = dayNight.isNight ? 2.0 : 1.0;
  
  if (isCluster) {
    // Render multiple small mushrooms
    const positions = [
      { dx: -8, dy: 0, scale: 0.6 },
      { dx: 0, dy: 2, scale: 1.0 },
      { dx: 8, dy: -1, scale: 0.7 },
      { dx: -4, dy: 4, scale: 0.5 },
      { dx: 5, dy: 5, scale: 0.4 },
    ];
    
    for (const pos of positions) {
      const mx = x + pos.dx;
      const my = y + pos.dy;
      const scale = pos.scale;
      
      // Stem
      ctx.fillStyle = isCorrupted ? '#8a7a9a' : '#e8e0d0';
      ctx.fillRect(mx - 2 * scale, my - 6 * scale, 4 * scale, 8 * scale);
      
      // Cap
      ctx.fillStyle = isCorrupted ? '#8844aa' : '#cc4444';
      ctx.beginPath();
      ctx.ellipse(mx, my - 7 * scale, 6 * scale, 4 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Spots
      if (scale > 0.5) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(mx - 2 * scale, my - 8 * scale, 1 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }
  
  // Stem
  ctx.fillStyle = isCorrupted ? '#8a7a9a' : '#e8e0d0';
  ctx.fillRect(x - 3, y - 8, 6, 12);
  
  // Cap color
  let capColor = isCorrupted ? '#8844aa' : '#cc4444';
  if (isGlowing) {
    const pulse = (0.7 + Math.sin(time * 0.005) * 0.3) * nightBoost;
    capColor = isCorrupted 
      ? `rgba(180, 100, 220, ${Math.min(1, pulse)})` 
      : `rgba(100, 200, 255, ${Math.min(1, pulse)})`;
    
    // Glow effect
    const glowGradient = ctx.createRadialGradient(x, y - 10, 0, x, y - 10, 25);
    glowGradient.addColorStop(0, isCorrupted ? `rgba(180, 100, 220, ${pulse * 0.3})` : `rgba(100, 200, 255, ${pulse * 0.3})`);
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y - 10, 25, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.fillStyle = capColor;
  ctx.beginPath();
  ctx.ellipse(x, y - 10, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Cap spots
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(x - 4, y - 11, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 3, y - 9, 1.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Glow effect (much bigger at night)
  if (isGlowing) {
    const glowSize = (20 + Math.sin(time * 0.003) * 5) * nightBoost;
    const glowIntensity = dayNight.isNight ? 0.6 : 0.4;
    const gradient = ctx.createRadialGradient(x, y - 8, 0, x, y - 8, glowSize);
    gradient.addColorStop(0, isCorrupted 
      ? `rgba(180, 100, 220, ${glowIntensity})` 
      : `rgba(100, 200, 255, ${glowIntensity})`);
    gradient.addColorStop(0.5, isCorrupted 
      ? `rgba(160, 80, 200, ${glowIntensity * 0.4})` 
      : `rgba(80, 180, 240, ${glowIntensity * 0.4})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y - 8, glowSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground light at night
    if (dayNight.isNight) {
      const groundGlow = ctx.createRadialGradient(x, y + 5, 0, x, y + 5, 30);
      groundGlow.addColorStop(0, isCorrupted 
        ? 'rgba(180, 100, 220, 0.25)' 
        : 'rgba(100, 200, 255, 0.25)');
      groundGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = groundGlow;
      ctx.beginPath();
      ctx.ellipse(x, y + 5, 30, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Render lamp post with light effect (enhanced at night)
 */
function renderLampPost(ctx, x, y, time) {
  const dayNight = getDayNightLighting();
  const nightBoost = dayNight.isNight ? 2.5 : 1.0;
  
  // Post
  ctx.fillStyle = '#333333';
  ctx.fillRect(x - 3, y - 45, 6, 50);
  
  // Lamp housing
  ctx.fillStyle = '#444444';
  ctx.fillRect(x - 8, y - 52, 16, 8);
  
  // Light glow - much larger at night
  const flicker = 0.8 + Math.sin(time * 0.01) * 0.1 + Math.random() * 0.1;
  const glowRadius = 60 * nightBoost;
  
  const gradient = ctx.createRadialGradient(x, y - 48, 0, x, y - 48, glowRadius);
  gradient.addColorStop(0, `rgba(255, 220, 150, ${Math.min(1, 0.6 * flicker * nightBoost)})`);
  gradient.addColorStop(0.3, `rgba(255, 200, 120, ${Math.min(0.8, 0.4 * flicker * nightBoost)})`);
  gradient.addColorStop(0.6, `rgba(255, 180, 100, ${0.2 * flicker * nightBoost})`);
  gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y - 48, glowRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Light cone on ground (at night)
  if (dayNight.isNight) {
    const groundGlow = ctx.createRadialGradient(x, y + 10, 0, x, y + 10, 50);
    groundGlow.addColorStop(0, `rgba(255, 220, 150, ${0.3 * flicker})`);
    groundGlow.addColorStop(1, 'rgba(255, 180, 100, 0)');
    ctx.fillStyle = groundGlow;
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 50, 25, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Lamp bulb
  ctx.fillStyle = `rgba(255, 240, 200, ${flicker})`;
  ctx.beginPath();
  ctx.arc(x, y - 48, dayNight.isNight ? 7 : 5, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Render dead or corrupted tree
 */
function renderDeadTree(ctx, x, y, treeType, zoneType, time) {
  const isCorrupted = treeType === ENTITY_TYPES.TREE_CORRUPTED;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Gnarled trunk
  const trunkColor = isCorrupted ? '#2a1a2a' : '#3a3030';
  ctx.fillStyle = trunkColor;
  
  // Main trunk
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x - 6, y - 60);
  ctx.lineTo(x + 6, y - 65);
  ctx.lineTo(x + 10, y);
  ctx.closePath();
  ctx.fill();
  
  // Dead branches
  ctx.strokeStyle = trunkColor;
  ctx.lineWidth = 4;
  
  // Left branch
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 40);
  ctx.lineTo(x - 25, y - 55);
  ctx.lineTo(x - 35, y - 50);
  ctx.stroke();
  
  // Right branch
  ctx.beginPath();
  ctx.moveTo(x + 4, y - 50);
  ctx.lineTo(x + 20, y - 65);
  ctx.lineTo(x + 30, y - 60);
  ctx.stroke();
  
  // Top branch
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 60);
  ctx.lineTo(x - 5, y - 80);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 2, y - 65);
  ctx.lineTo(x + 12, y - 85);
  ctx.stroke();
  
  // Corrupted glow/particles
  if (isCorrupted) {
    const pulse = 0.4 + Math.sin(time * 0.003) * 0.2;
    const gradient = ctx.createRadialGradient(x, y - 40, 0, x, y - 40, 35);
    gradient.addColorStop(0, `rgba(120, 40, 160, ${pulse * 0.3})`);
    gradient.addColorStop(1, 'rgba(80, 20, 100, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y - 40, 35, 0, Math.PI * 2);
    ctx.fill();
    
    // Corruption veins on trunk
    ctx.strokeStyle = `rgba(160, 80, 200, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 10);
    ctx.bezierCurveTo(x - 8, y - 25, x + 2, y - 35, x - 2, y - 50);
    ctx.stroke();
  }
}

/**
 * Render corruption crystal
 */
function renderCorruptionCrystal(ctx, x, y, time) {
  const pulse = 0.6 + Math.sin(time * 0.004) * 0.4;
  
  // Glow
  const gradient = ctx.createRadialGradient(x, y - 15, 0, x, y - 15, 40);
  gradient.addColorStop(0, `rgba(180, 60, 220, ${pulse * 0.5})`);
  gradient.addColorStop(0.5, `rgba(120, 40, 180, ${pulse * 0.2})`);
  gradient.addColorStop(1, 'rgba(80, 20, 120, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y - 15, 40, 0, Math.PI * 2);
  ctx.fill();
  
  // Main crystal
  ctx.fillStyle = `rgba(140, 60, 180, ${0.8 + pulse * 0.2})`;
  ctx.beginPath();
  ctx.moveTo(x, y - 45);
  ctx.lineTo(x + 12, y - 10);
  ctx.lineTo(x + 5, y);
  ctx.lineTo(x - 5, y);
  ctx.lineTo(x - 12, y - 10);
  ctx.closePath();
  ctx.fill();
  
  // Crystal highlights
  ctx.fillStyle = `rgba(200, 150, 255, ${pulse})`;
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 40);
  ctx.lineTo(x + 3, y - 20);
  ctx.lineTo(x - 3, y - 15);
  ctx.closePath();
  ctx.fill();
  
  // Side crystals
  ctx.fillStyle = `rgba(120, 50, 160, 0.9)`;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 25);
  ctx.lineTo(x - 15, y - 5);
  ctx.lineTo(x - 10, y);
  ctx.lineTo(x - 6, y - 5);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(x + 10, y - 20);
  ctx.lineTo(x + 18, y - 8);
  ctx.lineTo(x + 12, y);
  ctx.lineTo(x + 8, y - 5);
  ctx.closePath();
  ctx.fill();
}

/**
 * Render corruption tendril
 */
function renderCorruptionTendril(ctx, x, y, time) {
  const sway = Math.sin(time * 0.002) * 5;
  const pulse = 0.5 + Math.sin(time * 0.005) * 0.3;
  
  // Base
  ctx.fillStyle = '#2a1a2a';
  ctx.beginPath();
  ctx.ellipse(x, y, 15, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Tendril strands
  ctx.strokeStyle = `rgba(100, 40, 140, ${pulse + 0.3})`;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  
  // Main tendril
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x + sway * 2, y - 20, x - sway, y - 35, x + sway, y - 50);
  ctx.stroke();
  
  // Side tendrils
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 5);
  ctx.bezierCurveTo(x - 15 + sway, y - 20, x - 20, y - 30, x - 25 + sway, y - 35);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(x + 5, y - 5);
  ctx.bezierCurveTo(x + 15 - sway, y - 15, x + 18, y - 25, x + 22 - sway, y - 30);
  ctx.stroke();
  
  // Glowing tips
  ctx.fillStyle = `rgba(180, 80, 220, ${pulse})`;
  ctx.beginPath();
  ctx.arc(x + sway, y - 50, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 25 + sway, y - 35, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 22 - sway, y - 30, 3, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Render dark obelisk
 */
function renderDarkObelisk(ctx, x, y, time) {
  const pulse = 0.5 + Math.sin(time * 0.002) * 0.3;
  
  // Ominous glow
  const gradient = ctx.createRadialGradient(x, y - 40, 0, x, y - 40, 80);
  gradient.addColorStop(0, `rgba(60, 20, 80, ${pulse * 0.4})`);
  gradient.addColorStop(0.5, `rgba(40, 10, 60, ${pulse * 0.2})`);
  gradient.addColorStop(1, 'rgba(20, 5, 40, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y - 40, 80, 0, Math.PI * 2);
  ctx.fill();
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 25, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Obelisk body
  ctx.fillStyle = '#1a0a1a';
  ctx.beginPath();
  ctx.moveTo(x, y - 100);
  ctx.lineTo(x + 18, y - 20);
  ctx.lineTo(x + 15, y);
  ctx.lineTo(x - 15, y);
  ctx.lineTo(x - 18, y - 20);
  ctx.closePath();
  ctx.fill();
  
  // Edge highlight
  ctx.fillStyle = '#2a1a2a';
  ctx.beginPath();
  ctx.moveTo(x, y - 100);
  ctx.lineTo(x + 18, y - 20);
  ctx.lineTo(x + 15, y);
  ctx.lineTo(x + 5, y);
  ctx.lineTo(x + 8, y - 20);
  ctx.lineTo(x, y - 95);
  ctx.closePath();
  ctx.fill();
  
  // Glowing runes
  ctx.strokeStyle = `rgba(180, 80, 220, ${pulse})`;
  ctx.lineWidth = 2;
  
  // Rune symbols
  const runeY = y - 60;
  ctx.beginPath();
  ctx.moveTo(x - 6, runeY);
  ctx.lineTo(x, runeY - 15);
  ctx.lineTo(x + 6, runeY);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(x - 4, runeY + 20);
  ctx.lineTo(x, runeY + 10);
  ctx.lineTo(x + 4, runeY + 20);
  ctx.lineTo(x, runeY + 30);
  ctx.closePath();
  ctx.stroke();
  
  // Eye at top
  const eyePulse = 0.5 + Math.sin(time * 0.003) * 0.5;
  ctx.fillStyle = `rgba(255, 50, 100, ${eyePulse})`;
  ctx.beginPath();
  ctx.ellipse(x, y - 85, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Eye glow
  const eyeGlow = ctx.createRadialGradient(x, y - 85, 0, x, y - 85, 15);
  eyeGlow.addColorStop(0, `rgba(255, 50, 100, ${eyePulse * 0.6})`);
  eyeGlow.addColorStop(1, 'rgba(255, 50, 100, 0)');
  ctx.fillStyle = eyeGlow;
  ctx.beginPath();
  ctx.arc(x, y - 85, 15, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Render small portal
 */
function renderPortal(ctx, x, y, time) {
  const rotation = time * 0.002;
  const pulse = 0.6 + Math.sin(time * 0.004) * 0.4;
  
  // Outer glow
  const gradient = ctx.createRadialGradient(x, y - 20, 0, x, y - 20, 50);
  gradient.addColorStop(0, `rgba(120, 40, 180, ${pulse * 0.6})`);
  gradient.addColorStop(0.6, `rgba(80, 20, 140, ${pulse * 0.3})`);
  gradient.addColorStop(1, 'rgba(40, 10, 80, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y - 20, 50, 0, Math.PI * 2);
  ctx.fill();
  
  // Portal ring
  ctx.strokeStyle = `rgba(200, 100, 255, ${pulse})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y - 20, 25, 25, 0, 0, Math.PI * 2);
  ctx.stroke();
  
  // Inner ring
  ctx.strokeStyle = `rgba(160, 80, 220, ${pulse * 0.8})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y - 20, 18, 18, 0, 0, Math.PI * 2);
  ctx.stroke();
  
  // Swirling effect
  ctx.save();
  ctx.translate(x, y - 20);
  ctx.rotate(rotation);
  
  ctx.fillStyle = `rgba(180, 60, 240, ${pulse * 0.5})`;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(12, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(Math.PI / 3);
  }
  
  ctx.restore();
  
  // Center void
  const centerGrad = ctx.createRadialGradient(x, y - 20, 0, x, y - 20, 15);
  centerGrad.addColorStop(0, '#0a0010');
  centerGrad.addColorStop(0.7, `rgba(40, 10, 60, 0.8)`);
  centerGrad.addColorStop(1, 'rgba(80, 20, 100, 0)');
  ctx.fillStyle = centerGrad;
  ctx.beginPath();
  ctx.arc(x, y - 20, 15, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Render skull pile
 */
function renderSkullPile(ctx, x, y, zoneType) {
  const isCore = zoneType === ZONE_TYPES.CORRUPTED_CORE;
  
  // Base dirt mound
  ctx.fillStyle = isCore ? '#2a1a2a' : '#3a3030';
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Skull rendering helper
  const drawSkull = (sx, sy, scale, rot) => {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    
    // Skull
    ctx.fillStyle = isCore ? '#a090a0' : '#c0b8b0';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye sockets
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(-3, -2, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(3, -2, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Nose
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-1.5, 4);
    ctx.lineTo(1.5, 4);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  };
  
  // Draw skulls
  drawSkull(x - 8, y - 5, 0.8, -0.3);
  drawSkull(x + 6, y - 3, 0.7, 0.4);
  drawSkull(x, y - 12, 1.0, 0);
  
  // Bones
  ctx.strokeStyle = isCore ? '#908090' : '#b0a8a0';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  
  ctx.beginPath();
  ctx.moveTo(x - 15, y - 2);
  ctx.lineTo(x - 5, y + 3);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(x + 10, y);
  ctx.lineTo(x + 18, y - 5);
  ctx.stroke();
}

/**
 * Render fireflies (more visible at night)
 */
function renderFireflies(ctx, x, y, time) {
  const dayNight = getDayNightLighting();
  
  // More fireflies and brighter at night
  const count = dayNight.isNight ? 15 : 8;
  const nightBoost = dayNight.isNight ? 1.8 : 1.0;
  
  for (let i = 0; i < count; i++) {
    const angle = (time * 0.001 + i * Math.PI * 2 / count) % (Math.PI * 2);
    const dist = 20 + Math.sin(time * 0.002 + i) * 15;
    const fx = x + Math.cos(angle) * dist;
    const fy = y + Math.sin(angle) * dist * 0.5 + Math.sin(time * 0.003 + i * 2) * 10;
    
    const brightness = (0.5 + Math.sin(time * 0.01 + i * 1.5) * 0.5) * nightBoost;
    const glowSize = 8 * nightBoost;
    
    // Glow
    const gradient = ctx.createRadialGradient(fx, fy, 0, fx, fy, glowSize);
    gradient.addColorStop(0, `rgba(200, 255, 100, ${Math.min(1, brightness * 0.8)})`);
    gradient.addColorStop(0.5, `rgba(180, 240, 80, ${Math.min(0.6, brightness * 0.4)})`);
    gradient.addColorStop(1, 'rgba(150, 220, 50, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(fx, fy, glowSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Core
    ctx.fillStyle = `rgba(255, 255, 200, ${Math.min(1, brightness)})`;
    ctx.beginPath();
    ctx.arc(fx, fy, dayNight.isNight ? 3 : 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Render mist effect
 */
function renderMist(ctx, x, y, time) {
  const layers = 4;
  
  for (let i = 0; i < layers; i++) {
    const offset = time * 0.0005 * (i + 1);
    const mx = x + Math.sin(offset) * 30;
    const my = y + Math.cos(offset * 0.7) * 15;
    const size = 50 + i * 20;
    const alpha = 0.08 - i * 0.015;
    
    const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, size);
    gradient.addColorStop(0, `rgba(180, 180, 200, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(150, 150, 180, ${alpha * 0.5})`);
    gradient.addColorStop(1, 'rgba(120, 120, 150, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(mx, my, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Render spore effect
 */
function renderSpores(ctx, x, y, time) {
  const count = 12;
  
  for (let i = 0; i < count; i++) {
    const phase = time * 0.001 + i * 0.5;
    const rise = (phase % 3) * 30;
    const sx = x + Math.sin(phase * 2 + i) * 25;
    const sy = y - rise + Math.sin(phase * 3) * 10;
    
    const alpha = 0.6 - (rise / 90) * 0.5;
    if (alpha <= 0) continue;
    
    // Spore particle
    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, 5);
    gradient.addColorStop(0, `rgba(160, 100, 200, ${alpha})`);
    gradient.addColorStop(1, 'rgba(120, 60, 160, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Core
    ctx.fillStyle = `rgba(200, 140, 240, ${alpha * 0.8})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============== NEW RENDER FUNCTIONS ==============

/**
 * Render fallen log
 */
function renderFallenLog(ctx, x, y, zoneType) {
  const isCorrupted = zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 35, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Log body
  ctx.fillStyle = isCorrupted ? '#3a2a3a' : '#6b4423';
  ctx.beginPath();
  ctx.ellipse(x, y, 35, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Bark detail
  ctx.fillStyle = isCorrupted ? '#2a1a2a' : '#5a3318';
  ctx.beginPath();
  ctx.ellipse(x, y - 2, 32, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // End ring
  ctx.strokeStyle = isCorrupted ? '#4a3a4a' : '#8b6433';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x - 30, y, 5, 10, 0.2, 0, Math.PI * 2);
  ctx.stroke();
  
  // Moss on log
  if (!isCorrupted) {
    ctx.fillStyle = '#4a7a3a';
    ctx.beginPath();
    ctx.ellipse(x + 10, y - 5, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Render tree stump
 */
function renderStump(ctx, x, y, zoneType) {
  const isCorrupted = zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Stump body
  ctx.fillStyle = isCorrupted ? '#3a2a3a' : '#6b4423';
  ctx.fillRect(x - 12, y - 15, 24, 18);
  
  // Top (cut surface)
  ctx.fillStyle = isCorrupted ? '#5a4a5a' : '#c9a87c';
  ctx.beginPath();
  ctx.ellipse(x, y - 15, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Rings
  ctx.strokeStyle = isCorrupted ? '#4a3a4a' : '#a08060';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y - 15, 10, 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y - 15, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Render fern plant
 */
function renderFern(ctx, x, y, zoneType, time) {
  const sway = Math.sin(time * 0.002 + x * 0.01) * 3;
  const isCorrupted = zoneType === ZONE_TYPES.CORRUPTED;
  const color = isCorrupted ? '#5a4a6a' : '#3a8a3a';
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  
  // Draw fern fronds
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i - 2) * 0.4;
    const length = 20 + Math.random() * 5;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(angle) * length * 0.5 + sway,
      y + Math.sin(angle) * length * 0.5,
      x + Math.cos(angle) * length + sway,
      y + Math.sin(angle) * length
    );
    ctx.stroke();
    
    // Small leaves on frond
    ctx.lineWidth = 1;
    for (let j = 0.3; j < 1; j += 0.2) {
      const fx = x + Math.cos(angle) * length * j + sway * j;
      const fy = y + Math.sin(angle) * length * j;
      
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + 5, fy - 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx - 5, fy - 3);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
  }
}

/**
 * Render tall grass patch
 */
function renderTallGrass(ctx, x, y, zoneType, time) {
  const isCorrupted = zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE;
  const baseColor = isCorrupted ? '#4a5a4a' : '#5a9a4a';
  const tipColor = isCorrupted ? '#6a7a6a' : '#8aca6a';
  
  for (let i = 0; i < 12; i++) {
    const gx = x + (i - 6) * 4 + Math.sin(i * 1.5) * 3;
    const sway = Math.sin(time * 0.003 + i * 0.5 + x * 0.01) * 4;
    const height = 15 + Math.sin(i * 2) * 8;
    
    ctx.strokeStyle = i % 2 === 0 ? baseColor : tipColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.quadraticCurveTo(gx + sway * 0.5, y - height * 0.5, gx + sway, y - height);
    ctx.stroke();
  }
}

/**
 * Render flower bed
 */
function renderFlowerBed(ctx, x, y, zoneType, time) {
  // Ground patch
  ctx.fillStyle = '#4a6a3a';
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Flowers
  const colors = ['#ff6b6b', '#feca57', '#ff9ff3', '#54a0ff', '#fff'];
  
  for (let i = 0; i < 8; i++) {
    const fx = x + Math.cos(i * 0.8) * 12 + Math.sin(i * 2) * 5;
    const fy = y + Math.sin(i * 0.8) * 5 - 5;
    const color = colors[i % colors.length];
    const sway = Math.sin(time * 0.002 + i) * 2;
    
    // Stem
    ctx.strokeStyle = '#3a7a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx, fy + 8);
    ctx.lineTo(fx + sway, fy);
    ctx.stroke();
    
    // Flower
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(fx + sway, fy, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Center
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(fx + sway, fy, 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Render boulder (large rock)
 */
function renderBoulder(ctx, x, y, zoneType) {
  const isCorrupted = zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  
  const baseColor = isCorrupted ? '#4a3a4a' : '#5a5a5a';
  const darkColor = isCorrupted ? '#3a2a3a' : '#3a3a3a';
  const lightColor = isCorrupted ? '#6a5a6a' : '#7a7a7a';
  
  // Main boulder shape
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.moveTo(x - 25, y + 5);
  ctx.lineTo(x - 20, y - 20);
  ctx.lineTo(x - 5, y - 30);
  ctx.lineTo(x + 15, y - 25);
  ctx.lineTo(x + 25, y - 10);
  ctx.lineTo(x + 20, y + 5);
  ctx.closePath();
  ctx.fill();
  
  // Dark side
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.moveTo(x - 25, y + 5);
  ctx.lineTo(x - 20, y - 20);
  ctx.lineTo(x - 10, y - 15);
  ctx.lineTo(x - 15, y + 5);
  ctx.closePath();
  ctx.fill();
  
  // Highlight
  ctx.fillStyle = lightColor;
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 30);
  ctx.lineTo(x + 5, y - 28);
  ctx.lineTo(x, y - 22);
  ctx.closePath();
  ctx.fill();
  
  // Moss
  if (!isCorrupted) {
    ctx.fillStyle = '#5a8a4a';
    ctx.beginPath();
    ctx.ellipse(x + 5, y - 5, 8, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Render mountain
 */
function renderMountain(ctx, x, y, type) {
  const isSmall = type === ENTITY_TYPES.MOUNTAIN_SMALL;
  const scale = isSmall ? 0.6 : 1;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 10 * scale, 80 * scale, 20 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Back mountain layer (darker)
  ctx.fillStyle = '#4a4a5a';
  ctx.beginPath();
  ctx.moveTo(x - 70 * scale, y);
  ctx.lineTo(x - 30 * scale, y - 90 * scale);
  ctx.lineTo(x + 20 * scale, y - 60 * scale);
  ctx.lineTo(x + 60 * scale, y);
  ctx.closePath();
  ctx.fill();
  
  // Main mountain
  ctx.fillStyle = '#6a6a7a';
  ctx.beginPath();
  ctx.moveTo(x - 80 * scale, y);
  ctx.lineTo(x - 20 * scale, y - 100 * scale);
  ctx.lineTo(x + 50 * scale, y - 70 * scale);
  ctx.lineTo(x + 80 * scale, y);
  ctx.closePath();
  ctx.fill();
  
  // Light side
  ctx.fillStyle = '#8a8a9a';
  ctx.beginPath();
  ctx.moveTo(x - 20 * scale, y - 100 * scale);
  ctx.lineTo(x + 50 * scale, y - 70 * scale);
  ctx.lineTo(x + 30 * scale, y - 40 * scale);
  ctx.lineTo(x, y - 60 * scale);
  ctx.closePath();
  ctx.fill();
  
  // Snow cap
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x - 20 * scale, y - 100 * scale);
  ctx.lineTo(x - 10 * scale, y - 85 * scale);
  ctx.lineTo(x - 25 * scale, y - 82 * scale);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(x + 50 * scale, y - 70 * scale);
  ctx.lineTo(x + 45 * scale, y - 58 * scale);
  ctx.lineTo(x + 55 * scale, y - 60 * scale);
  ctx.closePath();
  ctx.fill();
}

/**
 * Render hill
 */
function renderHill(ctx, x, y, zoneType) {
  const isCorrupted = zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE;
  
  // Hill shape
  const gradient = ctx.createRadialGradient(x, y - 20, 0, x, y + 30, 60);
  
  if (isCorrupted) {
    gradient.addColorStop(0, '#4a4a5a');
    gradient.addColorStop(1, '#3a3a4a');
  } else {
    gradient.addColorStop(0, '#6a9a5a');
    gradient.addColorStop(1, '#4a7a3a');
  }
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(x, y, 50, 30, 0, Math.PI, 0);
  ctx.fill();
  
  // Grass details on hill
  if (!isCorrupted) {
    ctx.strokeStyle = '#5a8a4a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const gx = x - 40 + i * 8;
      const gy = y - Math.sin((i / 10) * Math.PI) * 25;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + 2, gy - 5);
      ctx.stroke();
    }
  }
}

/**
 * Render cave entrance
 */
function renderCaveEntrance(ctx, x, y, time) {
  // Rock formation around cave
  ctx.fillStyle = '#5a5a6a';
  ctx.beginPath();
  ctx.moveTo(x - 40, y + 10);
  ctx.lineTo(x - 35, y - 40);
  ctx.lineTo(x - 15, y - 55);
  ctx.lineTo(x + 15, y - 55);
  ctx.lineTo(x + 35, y - 40);
  ctx.lineTo(x + 40, y + 10);
  ctx.closePath();
  ctx.fill();
  
  // Cave opening (dark)
  const gradient = ctx.createRadialGradient(x, y - 15, 5, x, y - 15, 30);
  gradient.addColorStop(0, '#000000');
  gradient.addColorStop(0.7, '#1a1a2a');
  gradient.addColorStop(1, '#2a2a3a');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(x, y - 10, 25, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner glow (mysterious)
  const pulse = 0.3 + Math.sin(time * 0.002) * 0.1;
  ctx.fillStyle = `rgba(100, 150, 200, ${pulse})`;
  ctx.beginPath();
  ctx.ellipse(x, y - 12, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Rock details
  ctx.fillStyle = '#4a4a5a';
  ctx.beginPath();
  ctx.arc(x - 30, y - 20, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 28, y - 25, 10, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Render pond
 */
function renderPond(ctx, x, y, zoneType, time) {
  const isCorrupted = zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE;
  
  // Bank/shore
  ctx.fillStyle = isCorrupted ? '#3a3a3a' : '#8b7355';
  ctx.beginPath();
  ctx.ellipse(x, y, 50, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Water surface
  const waterColor = isCorrupted ? '#3a4a5a' : '#4a8aaa';
  ctx.fillStyle = waterColor;
  ctx.beginPath();
  ctx.ellipse(x, y, 45, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Water ripples
  const ripple = (time * 0.001) % 1;
  ctx.strokeStyle = isCorrupted ? 'rgba(100, 100, 120, 0.3)' : 'rgba(150, 200, 230, 0.4)';
  ctx.lineWidth = 1;
  
  ctx.beginPath();
  ctx.ellipse(x - 10, y - 5, 8 + ripple * 10, 4 + ripple * 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.ellipse(x + 15, y + 5, 6 + ripple * 8, 3 + ripple * 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  
  // Lily pads (if not corrupted)
  if (!isCorrupted) {
    ctx.fillStyle = '#3a7a3a';
    ctx.beginPath();
    ctx.ellipse(x - 20, y - 8, 8, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 25, y + 3, 6, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Little flower on lily pad
    ctx.fillStyle = '#ff88aa';
    ctx.beginPath();
    ctx.arc(x - 20, y - 10, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Render fishing spot
 */
function renderFishingSpot(ctx, x, y, time) {
  // Bobber
  const bob = Math.sin(time * 0.005) * 3;
  
  // Line
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - 20);
  ctx.lineTo(x, y + bob);
  ctx.stroke();
  
  // Bobber
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.arc(x, y + bob, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y + bob - 2, 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Ripples
  const ripple = (time * 0.002) % 1;
  ctx.strokeStyle = `rgba(150, 200, 230, ${0.5 - ripple * 0.5})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y + bob + 2, 5 + ripple * 10, 2 + ripple * 4, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Render village props
 */
function renderBarrel(ctx, x, y) {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Barrel body
  ctx.fillStyle = '#8b6433';
  ctx.fillRect(x - 10, y - 20, 20, 22);
  
  // Top
  ctx.fillStyle = '#9b7443';
  ctx.beginPath();
  ctx.ellipse(x, y - 20, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Metal bands
  ctx.strokeStyle = '#444444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y - 15, 10, 3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y - 5, 10, 3, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function renderCrate(ctx, x, y) {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(x - 10, y + 2, 22, 6);
  
  // Crate body
  ctx.fillStyle = '#a08050';
  ctx.fillRect(x - 12, y - 18, 24, 20);
  
  // Top
  ctx.fillStyle = '#b09060';
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 18);
  ctx.lineTo(x - 8, y - 24);
  ctx.lineTo(x + 16, y - 24);
  ctx.lineTo(x + 12, y - 18);
  ctx.closePath();
  ctx.fill();
  
  // Planks
  ctx.strokeStyle = '#806030';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - 18);
  ctx.lineTo(x, y + 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 8);
  ctx.lineTo(x + 12, y - 8);
  ctx.stroke();
}

function renderHayBale(ctx, x, y) {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Hay bale (cylindrical)
  ctx.fillStyle = '#d4a846';
  ctx.fillRect(x - 15, y - 15, 30, 18);
  
  // End cap
  ctx.fillStyle = '#c49836';
  ctx.beginPath();
  ctx.ellipse(x + 15, y - 6, 6, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Hay texture lines
  ctx.strokeStyle = '#b48826';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 12 + i * 3);
    ctx.lineTo(x + 15, y - 12 + i * 3);
    ctx.stroke();
  }
}

function renderBench(ctx, x, y) {
  // Legs
  ctx.fillStyle = '#5a4020';
  ctx.fillRect(x - 18, y - 8, 4, 12);
  ctx.fillRect(x + 14, y - 8, 4, 12);
  
  // Seat
  ctx.fillStyle = '#8b6433';
  ctx.fillRect(x - 22, y - 12, 44, 6);
  
  // Back support
  ctx.fillRect(x - 20, y - 25, 40, 4);
  
  // Back slats
  ctx.fillRect(x - 18, y - 25, 3, 15);
  ctx.fillRect(x + 15, y - 25, 3, 15);
}

function renderWheelbarrow(ctx, x, y) {
  // Wheel
  ctx.fillStyle = '#444444';
  ctx.beginPath();
  ctx.arc(x - 15, y + 2, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#666666';
  ctx.beginPath();
  ctx.arc(x - 15, y + 2, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Body
  ctx.fillStyle = '#888888';
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 5);
  ctx.lineTo(x + 20, y - 15);
  ctx.lineTo(x + 20, y + 5);
  ctx.lineTo(x - 10, y + 5);
  ctx.closePath();
  ctx.fill();
  
  // Handles
  ctx.strokeStyle = '#6b4423';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 20, y - 10);
  ctx.lineTo(x + 35, y - 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 20, y);
  ctx.lineTo(x + 35, y - 5);
  ctx.stroke();
}

function renderScarecrow(ctx, x, y, time) {
  const sway = Math.sin(time * 0.002) * 3;
  
  // Post
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(x - 3, y - 50, 6, 55);
  
  // Cross bar
  ctx.fillRect(x - 25 + sway, y - 45, 50, 4);
  
  // Head (sack)
  ctx.fillStyle = '#c9a87c';
  ctx.beginPath();
  ctx.arc(x, y - 58, 12, 0, Math.PI * 2);
  ctx.fill();
  
  // Hat
  ctx.fillStyle = '#4a3a2a';
  ctx.fillRect(x - 15, y - 72, 30, 5);
  ctx.fillRect(x - 8, y - 82, 16, 12);
  
  // Face
  ctx.fillStyle = '#2a1a0a';
  ctx.beginPath();
  ctx.arc(x - 4, y - 60, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 4, y - 60, 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Stitched mouth
  ctx.strokeStyle = '#2a1a0a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 52);
  ctx.lineTo(x + 5, y - 52);
  ctx.stroke();
  
  // Hanging cloth/sleeves
  ctx.fillStyle = '#7a6a5a';
  ctx.beginPath();
  ctx.moveTo(x - 25 + sway, y - 43);
  ctx.lineTo(x - 28 + sway * 1.5, y - 25);
  ctx.lineTo(x - 20 + sway, y - 25);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 25 + sway, y - 43);
  ctx.lineTo(x + 28 + sway * 1.5, y - 25);
  ctx.lineTo(x + 20 + sway, y - 25);
  ctx.closePath();
  ctx.fill();
}

function renderCampfire(ctx, x, y, time) {
  // Light glow
  const pulse = 0.6 + Math.sin(time * 0.01) * 0.2;
  const gradient = ctx.createRadialGradient(x, y - 15, 0, x, y - 15, 60);
  gradient.addColorStop(0, `rgba(255, 150, 50, ${pulse * 0.4})`);
  gradient.addColorStop(0.5, `rgba(255, 100, 30, ${pulse * 0.2})`);
  gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y - 15, 60, 0, Math.PI * 2);
  ctx.fill();
  
  // Stones circle
  ctx.fillStyle = '#555555';
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const sx = x + Math.cos(angle) * 15;
    const sy = y + Math.sin(angle) * 8;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5, 3, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Logs
  ctx.fillStyle = '#4a3020';
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.3);
  ctx.fillRect(-12, -3, 24, 6);
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.3);
  ctx.fillRect(-12, -3, 24, 6);
  ctx.restore();
  
  // Fire flames
  const flicker = Math.sin(time * 0.02) * 2;
  
  // Outer flame
  ctx.fillStyle = '#ff6622';
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 5);
  ctx.quadraticCurveTo(x - 10 + flicker, y - 25, x, y - 35 - flicker);
  ctx.quadraticCurveTo(x + 10 - flicker, y - 25, x + 8, y - 5);
  ctx.closePath();
  ctx.fill();
  
  // Inner flame
  ctx.fillStyle = '#ffaa44';
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 5);
  ctx.quadraticCurveTo(x - 6 - flicker, y - 18, x, y - 25 + flicker);
  ctx.quadraticCurveTo(x + 6 + flicker, y - 18, x + 5, y - 5);
  ctx.closePath();
  ctx.fill();
  
  // Core
  ctx.fillStyle = '#ffee88';
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 5);
  ctx.quadraticCurveTo(x + flicker * 0.5, y - 12, x, y - 15 - flicker * 0.5);
  ctx.quadraticCurveTo(x - flicker * 0.5, y - 12, x + 2, y - 5);
  ctx.closePath();
  ctx.fill();
  
  // Sparks
  for (let i = 0; i < 5; i++) {
    const sparkPhase = (time * 0.003 + i * 0.7) % 2;
    const sparkY = y - 30 - sparkPhase * 20;
    const sparkX = x + Math.sin(time * 0.005 + i * 2) * 8;
    const sparkAlpha = 1 - sparkPhase / 2;
    
    if (sparkAlpha > 0) {
      ctx.fillStyle = `rgba(255, 200, 100, ${sparkAlpha})`;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ============== ANIMAL RENDER FUNCTIONS ==============

function renderAnimalRabbit(ctx, x, y, deco, time) {
  const hop = Math.abs(Math.sin(time * 0.005 + x * 0.01)) * 3;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Body
  ctx.fillStyle = '#c9b896';
  ctx.beginPath();
  ctx.ellipse(x, y - 5 - hop, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Head
  ctx.beginPath();
  ctx.ellipse(x + 8, y - 10 - hop, 6, 5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Ears
  ctx.beginPath();
  ctx.ellipse(x + 6, y - 20 - hop, 2, 6, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 10, y - 19 - hop, 2, 5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner ear
  ctx.fillStyle = '#e8c8b8';
  ctx.beginPath();
  ctx.ellipse(x + 6, y - 19 - hop, 1, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  
  // Eye
  ctx.fillStyle = '#222222';
  ctx.beginPath();
  ctx.arc(x + 11, y - 10 - hop, 1.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Tail (cotton ball)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - 10, y - 5 - hop, 4, 0, Math.PI * 2);
  ctx.fill();
}

function renderAnimalDeer(ctx, x, y, deco, time) {
  const walk = Math.sin(time * 0.003 + x * 0.01) * 2;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Legs
  ctx.fillStyle = '#8b6914';
  ctx.fillRect(x - 12, y - 10, 4, 15);
  ctx.fillRect(x + 8, y - 10, 4, 15);
  ctx.fillRect(x - 6, y - 8, 4, 13);
  ctx.fillRect(x + 2, y - 8, 4, 13);
  
  // Body
  ctx.fillStyle = '#a07828';
  ctx.beginPath();
  ctx.ellipse(x, y - 18, 18, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Neck
  ctx.fillRect(x + 12, y - 35, 8, 20);
  
  // Head
  ctx.beginPath();
  ctx.ellipse(x + 18, y - 40, 8, 6, 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Ears
  ctx.beginPath();
  ctx.ellipse(x + 14, y - 48, 3, 5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 22, y - 47, 3, 5, 0.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Antlers
  ctx.strokeStyle = '#6b5010';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 15, y - 48);
  ctx.lineTo(x + 10, y - 60);
  ctx.lineTo(x + 5, y - 55);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 21, y - 47);
  ctx.lineTo(x + 28, y - 58);
  ctx.lineTo(x + 33, y - 53);
  ctx.stroke();
  
  // White belly
  ctx.fillStyle = '#d4c4a4';
  ctx.beginPath();
  ctx.ellipse(x, y - 15, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Eye
  ctx.fillStyle = '#222222';
  ctx.beginPath();
  ctx.arc(x + 22, y - 40, 2, 0, Math.PI * 2);
  ctx.fill();
  
  // White tail spot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x - 18, y - 18, 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function renderAnimalSquirrel(ctx, x, y, deco, time) {
  const twitch = Math.sin(time * 0.01 + x) * 2;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Tail (fluffy)
  ctx.fillStyle = '#8b6633';
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 5);
  ctx.quadraticCurveTo(x - 15 + twitch, y - 20, x - 5, y - 25);
  ctx.quadraticCurveTo(x + 5 + twitch, y - 15, x - 2, y - 8);
  ctx.fill();
  
  // Body
  ctx.fillStyle = '#a07838';
  ctx.beginPath();
  ctx.ellipse(x, y - 5, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Head
  ctx.beginPath();
  ctx.ellipse(x + 5, y - 10, 5, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Ears
  ctx.beginPath();
  ctx.ellipse(x + 3, y - 15, 2, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 7, y - 14, 2, 3, 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Eye
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(x + 8, y - 10, 1.5, 0, Math.PI * 2);
  ctx.fill();
  
  // White belly
  ctx.fillStyle = '#e8d8c8';
  ctx.beginPath();
  ctx.ellipse(x, y - 4, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function renderAnimalFox(ctx, x, y, deco, time) {
  const earTwitch = Math.sin(time * 0.008 + x) * 0.2;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Tail
  ctx.fillStyle = '#d47020';
  ctx.beginPath();
  ctx.moveTo(x - 15, y - 8);
  ctx.quadraticCurveTo(x - 30, y - 15, x - 25, y - 25);
  ctx.quadraticCurveTo(x - 20, y - 20, x - 15, y - 12);
  ctx.fill();
  
  // Tail tip (white)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x - 25, y - 24, 4, 3, -0.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Legs
  ctx.fillStyle = '#222222';
  ctx.fillRect(x - 8, y - 5, 3, 8);
  ctx.fillRect(x + 5, y - 5, 3, 8);
  
  // Body
  ctx.fillStyle = '#d47020';
  ctx.beginPath();
  ctx.ellipse(x, y - 10, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Head
  ctx.beginPath();
  ctx.ellipse(x + 12, y - 12, 8, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  // Snout
  ctx.beginPath();
  ctx.moveTo(x + 18, y - 12);
  ctx.lineTo(x + 25, y - 10);
  ctx.lineTo(x + 18, y - 8);
  ctx.closePath();
  ctx.fill();
  
  // Nose
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(x + 24, y - 10, 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Ears
  ctx.fillStyle = '#d47020';
  ctx.beginPath();
  ctx.moveTo(x + 8, y - 16);
  ctx.lineTo(x + 5, y - 26 + earTwitch * 5);
  ctx.lineTo(x + 12, y - 18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 14, y - 16);
  ctx.lineTo(x + 18, y - 25 - earTwitch * 5);
  ctx.lineTo(x + 20, y - 17);
  ctx.closePath();
  ctx.fill();
  
  // Inner ears (dark)
  ctx.fillStyle = '#8a4010';
  ctx.beginPath();
  ctx.moveTo(x + 8, y - 17);
  ctx.lineTo(x + 7, y - 22);
  ctx.lineTo(x + 11, y - 18);
  ctx.closePath();
  ctx.fill();
  
  // White chest
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x + 5, y - 8, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Eyes
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.arc(x + 15, y - 14, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(x + 15, y - 14, 1, 0, Math.PI * 2);
  ctx.fill();
}

function renderAnimalFrog(ctx, x, y, deco, time) {
  const breathe = Math.sin(time * 0.005) * 1;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Back legs
  ctx.fillStyle = '#4a8a3a';
  ctx.beginPath();
  ctx.ellipse(x - 6, y - 2, 5, 3, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 6, y - 2, 5, 3, 0.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Body
  ctx.fillStyle = '#5a9a4a';
  ctx.beginPath();
  ctx.ellipse(x, y - 5 - breathe, 8, 5 + breathe, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Eyes (bulging)
  ctx.fillStyle = '#6aaa5a';
  ctx.beginPath();
  ctx.arc(x - 4, y - 10, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 4, y - 10, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Eye whites
  ctx.fillStyle = '#ffff88';
  ctx.beginPath();
  ctx.arc(x - 4, y - 10, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 4, y - 10, 2.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Pupils
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(x - 4, y - 10, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 4, y - 10, 1, 0, Math.PI * 2);
  ctx.fill();
}

function renderAnimalBird(ctx, x, y, deco, time) {
  const wingFlap = Math.sin(time * 0.02) * 0.5;
  const bobY = Math.sin(time * 0.01 + x * 0.1) * 3;
  
  // Body
  ctx.fillStyle = '#4466aa';
  ctx.beginPath();
  ctx.ellipse(x, y - 8 + bobY, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Wing
  ctx.fillStyle = '#3355aa';
  ctx.beginPath();
  ctx.ellipse(x - 2, y - 10 + bobY, 5, 3 + wingFlap * 3, wingFlap, 0, Math.PI * 2);
  ctx.fill();
  
  // Head
  ctx.fillStyle = '#4466aa';
  ctx.beginPath();
  ctx.arc(x + 5, y - 12 + bobY, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Beak
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.moveTo(x + 8, y - 12 + bobY);
  ctx.lineTo(x + 13, y - 11 + bobY);
  ctx.lineTo(x + 8, y - 10 + bobY);
  ctx.closePath();
  ctx.fill();
  
  // Eye
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(x + 6, y - 13 + bobY, 1, 0, Math.PI * 2);
  ctx.fill();
  
  // Tail
  ctx.fillStyle = '#3355aa';
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 8 + bobY);
  ctx.lineTo(x - 12, y - 6 + bobY);
  ctx.lineTo(x - 12, y - 10 + bobY);
  ctx.closePath();
  ctx.fill();
}

function renderAnimalButterfly(ctx, x, y, deco, time) {
  const flutter = Math.sin(time * 0.03) * 0.8;
  const bobY = Math.sin(time * 0.008 + x * 0.1) * 5;
  const bobX = Math.cos(time * 0.006 + y * 0.1) * 3;
  
  const bx = x + bobX;
  const by = y + bobY;
  
  // Wings
  const colors = ['#ff6b9d', '#feca57', '#54a0ff', '#ff9ff3'];
  const wingColor = colors[Math.floor((x + y) % colors.length)];
  
  ctx.fillStyle = wingColor;
  
  // Left wing
  ctx.beginPath();
  ctx.ellipse(bx - 5, by - 3, 6, 4, -flutter - 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Right wing
  ctx.beginPath();
  ctx.ellipse(bx + 5, by - 3, 6, 4, flutter + 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Lower wings
  ctx.beginPath();
  ctx.ellipse(bx - 4, by + 1, 4, 3, -flutter - 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(bx + 4, by + 1, 4, 3, flutter + 0.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Wing patterns
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.arc(bx - 5, by - 3, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx + 5, by - 3, 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Body
  ctx.fillStyle = '#333333';
  ctx.beginPath();
  ctx.ellipse(bx, by, 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Antennae
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bx - 1, by - 5);
  ctx.quadraticCurveTo(bx - 3, by - 10, bx - 2, by - 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx + 1, by - 5);
  ctx.quadraticCurveTo(bx + 3, by - 10, bx + 2, by - 12);
  ctx.stroke();
}

// ============== AGGRESSIVE ANIMAL RENDER FUNCTIONS ==============

function renderAnimalWolf(ctx, x, y, deco, time) {
  const breathe = Math.sin(time * 0.004) * 1;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Tail
  ctx.fillStyle = '#5a5a6a';
  ctx.beginPath();
  ctx.moveTo(x - 18, y - 10);
  ctx.quadraticCurveTo(x - 28, y - 20, x - 25, y - 25);
  ctx.quadraticCurveTo(x - 22, y - 18, x - 18, y - 15);
  ctx.fill();
  
  // Legs
  ctx.fillStyle = '#4a4a5a';
  ctx.fillRect(x - 12, y - 8, 4, 12);
  ctx.fillRect(x + 8, y - 8, 4, 12);
  
  // Body
  ctx.fillStyle = '#6a6a7a';
  ctx.beginPath();
  ctx.ellipse(x, y - 12 - breathe, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Head
  ctx.fillStyle = '#5a5a6a';
  ctx.beginPath();
  ctx.ellipse(x + 14, y - 15, 10, 7, 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  // Snout
  ctx.beginPath();
  ctx.moveTo(x + 22, y - 15);
  ctx.lineTo(x + 32, y - 12);
  ctx.lineTo(x + 22, y - 10);
  ctx.closePath();
  ctx.fill();
  
  // Nose
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(x + 31, y - 12, 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Ears
  ctx.fillStyle = '#5a5a6a';
  ctx.beginPath();
  ctx.moveTo(x + 10, y - 20);
  ctx.lineTo(x + 6, y - 30);
  ctx.lineTo(x + 14, y - 22);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 18, y - 20);
  ctx.lineTo(x + 22, y - 28);
  ctx.lineTo(x + 24, y - 20);
  ctx.closePath();
  ctx.fill();
  
  // Eyes (menacing yellow)
  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  ctx.arc(x + 18, y - 17, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(x + 18, y - 17, 1.2, 0, Math.PI * 2);
  ctx.fill();
  
  // Chest fur (lighter)
  ctx.fillStyle = '#8a8a9a';
  ctx.beginPath();
  ctx.ellipse(x + 8, y - 10, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function renderAnimalBoar(ctx, x, y, deco, time) {
  const snort = Math.sin(time * 0.006) * 2;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Legs
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(x - 14, y - 6, 5, 10);
  ctx.fillRect(x + 9, y - 6, 5, 10);
  
  // Body (massive)
  ctx.fillStyle = '#5a4a3a';
  ctx.beginPath();
  ctx.ellipse(x, y - 12, 20, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Bristly back
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const bx = x - 15 + i * 4;
    ctx.beginPath();
    ctx.moveTo(bx, y - 22);
    ctx.lineTo(bx + 1, y - 28);
    ctx.stroke();
  }
  
  // Head
  ctx.fillStyle = '#4a3a2a';
  ctx.beginPath();
  ctx.ellipse(x + 18, y - 10, 12, 10, 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Snout
  ctx.fillStyle = '#6a5a4a';
  ctx.beginPath();
  ctx.ellipse(x + 28 + snort, y - 6, 6, 5, 0.1, 0, Math.PI * 2);
  ctx.fill();
  
  // Nostrils
  ctx.fillStyle = '#2a1a0a';
  ctx.beginPath();
  ctx.arc(x + 30 + snort, y - 7, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 30 + snort, y - 4, 1.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Tusks
  ctx.fillStyle = '#f0e8d8';
  ctx.beginPath();
  ctx.moveTo(x + 26, y - 3);
  ctx.lineTo(x + 32, y - 8);
  ctx.lineTo(x + 28, y - 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 26, y);
  ctx.lineTo(x + 30, y + 4);
  ctx.lineTo(x + 28, y + 1);
  ctx.closePath();
  ctx.fill();
  
  // Ears
  ctx.fillStyle = '#4a3a2a';
  ctx.beginPath();
  ctx.ellipse(x + 12, y - 18, 4, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 20, y - 17, 4, 5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Eyes (angry red)
  ctx.fillStyle = '#cc3333';
  ctx.beginPath();
  ctx.arc(x + 22, y - 12, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(x + 22, y - 12, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function renderAnimalBear(ctx, x, y, deco, time) {
  const breathe = Math.sin(time * 0.003) * 2;
  
  // Shadow (large)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Legs (thick)
  ctx.fillStyle = '#4a3a2a';
  ctx.fillRect(x - 22, y - 10, 8, 18);
  ctx.fillRect(x + 14, y - 10, 8, 18);
  
  // Body (massive)
  ctx.fillStyle = '#5a4a3a';
  ctx.beginPath();
  ctx.ellipse(x, y - 18 - breathe, 28, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Head
  ctx.beginPath();
  ctx.ellipse(x + 22, y - 25, 14, 12, 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  // Snout
  ctx.fillStyle = '#7a6a5a';
  ctx.beginPath();
  ctx.ellipse(x + 34, y - 22, 8, 6, 0.1, 0, Math.PI * 2);
  ctx.fill();
  
  // Nose
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.ellipse(x + 40, y - 22, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Ears
  ctx.fillStyle = '#5a4a3a';
  ctx.beginPath();
  ctx.arc(x + 14, y - 35, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 30, y - 34, 6, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner ears
  ctx.fillStyle = '#4a3a2a';
  ctx.beginPath();
  ctx.arc(x + 14, y - 35, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 30, y - 34, 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Eyes
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(x + 26, y - 27, 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Eye shine
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + 27, y - 28, 1, 0, Math.PI * 2);
  ctx.fill();
}

function renderAnimalSnake(ctx, x, y, deco, time) {
  const slither = Math.sin(time * 0.005 + x * 0.1);
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 15, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Body segments
  ctx.strokeStyle = '#4a6a3a';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  
  ctx.beginPath();
  ctx.moveTo(x - 20, y);
  ctx.quadraticCurveTo(x - 10, y + slither * 5, x, y);
  ctx.quadraticCurveTo(x + 10, y - slither * 5, x + 15, y);
  ctx.stroke();
  
  // Pattern
  ctx.strokeStyle = '#3a5a2a';
  ctx.lineWidth = 4;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x - 18, y);
  ctx.quadraticCurveTo(x - 10, y + slither * 5, x, y);
  ctx.quadraticCurveTo(x + 10, y - slither * 5, x + 13, y);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Head
  ctx.fillStyle = '#4a6a3a';
  ctx.beginPath();
  ctx.ellipse(x + 18, y, 6, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Eyes
  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  ctx.arc(x + 20, y - 2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.ellipse(x + 20, y - 2, 0.8, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Forked tongue
  ctx.strokeStyle = '#cc3333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 23, y);
  ctx.lineTo(x + 28, y - 1);
  ctx.moveTo(x + 23, y);
  ctx.lineTo(x + 28, y + 1);
  ctx.stroke();
}

function renderAnimalBat(ctx, x, y, deco, time) {
  const wingFlap = Math.sin(time * 0.03) * 0.7;
  const bobY = Math.sin(time * 0.01 + x * 0.1) * 4;
  
  const by = y + bobY;
  
  // Wings
  ctx.fillStyle = '#3a2a4a';
  
  // Left wing
  ctx.beginPath();
  ctx.moveTo(x - 3, by - 5);
  ctx.quadraticCurveTo(x - 20, by - 15 - wingFlap * 15, x - 25, by - 5);
  ctx.quadraticCurveTo(x - 15, by, x - 3, by - 3);
  ctx.fill();
  
  // Right wing
  ctx.beginPath();
  ctx.moveTo(x + 3, by - 5);
  ctx.quadraticCurveTo(x + 20, by - 15 + wingFlap * 15, x + 25, by - 5);
  ctx.quadraticCurveTo(x + 15, by, x + 3, by - 3);
  ctx.fill();
  
  // Wing membrane lines
  ctx.strokeStyle = '#2a1a3a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 3, by - 4);
  ctx.lineTo(x - 18, by - 12 - wingFlap * 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 3, by - 4);
  ctx.lineTo(x + 18, by - 12 + wingFlap * 10);
  ctx.stroke();
  
  // Body
  ctx.fillStyle = '#4a3a5a';
  ctx.beginPath();
  ctx.ellipse(x, by - 5, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Head
  ctx.beginPath();
  ctx.arc(x, by - 12, 5, 0, Math.PI * 2);
  ctx.fill();
  
  // Ears
  ctx.beginPath();
  ctx.moveTo(x - 3, by - 15);
  ctx.lineTo(x - 5, by - 22);
  ctx.lineTo(x - 1, by - 16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 3, by - 15);
  ctx.lineTo(x + 5, by - 22);
  ctx.lineTo(x + 1, by - 16);
  ctx.closePath();
  ctx.fill();
  
  // Eyes (red, glowing)
  ctx.fillStyle = '#ff3333';
  ctx.beginPath();
  ctx.arc(x - 2, by - 13, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 2, by - 13, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

// ============== CORRUPTED DECORATION RENDER FUNCTIONS ==============

function renderDeadAnimal(ctx, x, y, zoneType) {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Body (on side)
  ctx.fillStyle = '#5a5a5a';
  ctx.beginPath();
  ctx.ellipse(x, y - 3, 12, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  // Legs (stiff)
  ctx.fillRect(x - 8, y - 8, 3, 8);
  ctx.fillRect(x + 3, y - 6, 3, 6);
  
  // Corruption spreading
  ctx.fillStyle = 'rgba(100, 40, 120, 0.5)';
  ctx.beginPath();
  ctx.ellipse(x + 5, y, 8, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function renderCorruptedPool(ctx, x, y, time) {
  const pulse = 0.7 + Math.sin(time * 0.003) * 0.2;
  
  // Outer glow
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, 35);
  gradient.addColorStop(0, `rgba(120, 50, 150, ${pulse * 0.5})`);
  gradient.addColorStop(0.7, `rgba(80, 30, 100, ${pulse * 0.3})`);
  gradient.addColorStop(1, 'rgba(40, 10, 60, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(x, y, 35, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Pool surface
  ctx.fillStyle = '#3a1a4a';
  ctx.beginPath();
  ctx.ellipse(x, y, 25, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Bubbles
  const bubblePhase = (time * 0.002) % 1;
  ctx.fillStyle = `rgba(160, 80, 200, ${0.7 - bubblePhase * 0.7})`;
  ctx.beginPath();
  ctx.arc(x - 8 + Math.sin(time * 0.003) * 3, y - 5 - bubblePhase * 15, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 10, y - 2 - ((bubblePhase + 0.5) % 1) * 15, 2, 0, Math.PI * 2);
  ctx.fill();
}

// ============== AMBIENT EFFECT RENDER FUNCTIONS ==============

function renderLeafFall(ctx, x, y, time) {
  const leafColors = ['#8b4513', '#d2691e', '#cd853f', '#daa520', '#b8860b'];
  
  for (let i = 0; i < 8; i++) {
    const phase = (time * 0.0005 + i * 0.4) % 2;
    const fallY = phase * 60;
    const swayX = Math.sin(time * 0.002 + i * 1.5) * 15;
    const rotation = time * 0.003 + i;
    
    const lx = x + swayX + (i - 4) * 15;
    const ly = y - 30 + fallY;
    
    const alpha = phase < 1.5 ? 0.8 : 0.8 - (phase - 1.5) * 1.6;
    if (alpha <= 0) continue;
    
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(rotation);
    
    ctx.fillStyle = leafColors[i % leafColors.length];
    ctx.globalAlpha = alpha;
    
    // Leaf shape
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.quadraticCurveTo(4, -2, 3, 3);
    ctx.quadraticCurveTo(0, 5, -3, 3);
    ctx.quadraticCurveTo(-4, -2, 0, -5);
    ctx.fill();
    
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function renderBirdFlock(ctx, x, y, time) {
  const flockX = x + Math.sin(time * 0.0003) * 100;
  const flockY = y + Math.cos(time * 0.0002) * 30;
  
  ctx.fillStyle = '#333333';
  
  for (let i = 0; i < 6; i++) {
    const bx = flockX + Math.sin(i * 1.2) * 30;
    const by = flockY + Math.cos(i * 1.5) * 15;
    const wing = Math.sin(time * 0.02 + i * 0.5) * 0.3;
    
    // Simple bird silhouette
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx - 5, by - 3 - wing * 5, bx - 8, by);
    ctx.quadraticCurveTo(bx - 5, by + 3 + wing * 5, bx, by);
    ctx.quadraticCurveTo(bx + 5, by - 3 + wing * 5, bx + 8, by);
    ctx.quadraticCurveTo(bx + 5, by + 3 - wing * 5, bx, by);
    ctx.fill();
  }
}
function adjustColorBrightness(hexColor, factor) {
  if (typeof hexColor !== 'string') return hexColor;
  
  // Parse hex color
  let r, g, b;
  if (hexColor.startsWith('#')) {
    const hex = hexColor.slice(1);
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  } else {
    return hexColor;
  }
  
  // Adjust
  r = Math.min(255, Math.floor(r * factor));
  g = Math.min(255, Math.floor(g * factor));
  b = Math.min(255, Math.floor(b * factor));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Render village structures with improved textures
 */
function renderStructures(ctx, camX, camY, startX, startY, endX, endY, tileSize) {
  if (!openWorld?.structures) return;
  
  for (const structure of openWorld.structures) {
    // Skip if not visible
    if (structure.x + structure.width < startX || structure.x > endX ||
        structure.y + structure.height < startY || structure.y > endY) {
      continue;
    }
    
    const sx = structure.x * tileSize;
    const sy = structure.y * tileSize;
    const sw = structure.width * tileSize;
    const sh = structure.height * tileSize;
    
    // Check if player is inside this house
    const isInside = insideHouse === structure;
    
    // Draw house exterior with solid textures
    if (structure.type !== 'fountain' && structure.type !== 'well') {
      
      // If player is inside, draw interior floor and hide exterior
      if (isInside) {
        // Draw interior floor (wooden planks)
        ctx.fillStyle = '#8a6644';
        ctx.fillRect(sx, sy, sw, sh);
        
        // Wood plank lines
        ctx.strokeStyle = '#664422';
        ctx.lineWidth = 1;
        for (let i = 0; i < sw / 20; i++) {
          ctx.beginPath();
          ctx.moveTo(sx + i * 20, sy);
          ctx.lineTo(sx + i * 20, sy + sh);
          ctx.stroke();
        }
        
        // Interior decorations based on type
        if (structure.type === 'blacksmith') {
          // Anvil
          ctx.fillStyle = '#444444';
          ctx.fillRect(sx + sw/2 - 15, sy + 20, 30, 20);
          ctx.fillStyle = '#555555';
          ctx.fillRect(sx + sw/2 - 20, sy + 15, 40, 8);
          
          // Forge glow
          ctx.fillStyle = 'rgba(255, 100, 50, 0.4)';
          ctx.beginPath();
          ctx.arc(sx + 30, sy + 30, 25, 0, Math.PI * 2);
          ctx.fill();
        } else if (structure.type === 'inn') {
          // Tables
          ctx.fillStyle = '#664422';
          ctx.fillRect(sx + 15, sy + 30, 35, 25);
          ctx.fillRect(sx + sw - 50, sy + 30, 35, 25);
          
          // Bar counter
          ctx.fillStyle = '#553311';
          ctx.fillRect(sx + sw/2 - 40, sy + 10, 80, 15);
        } else if (structure.type === 'shop') {
          // Shelves
          ctx.fillStyle = '#775533';
          ctx.fillRect(sx + 10, sy + 10, sw - 20, 10);
          ctx.fillRect(sx + 10, sy + 35, sw - 20, 10);
          
          // Items on shelves
          ctx.fillStyle = '#aa8866';
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(sx + 20 + i * 25, sy + 5, 10, 8);
            ctx.fillRect(sx + 20 + i * 25, sy + 28, 10, 10);
          }
        } else {
          // Generic house - bed and table
          ctx.fillStyle = '#663333';
          ctx.fillRect(sx + 10, sy + 10, 35, 50);
          ctx.fillStyle = '#aa8866';
          ctx.fillRect(sx + sw - 45, sy + 30, 30, 25);
        }
        
        // Draw walls around interior (thin border)
        ctx.strokeStyle = '#443322';
        ctx.lineWidth = 4;
        ctx.strokeRect(sx, sy, sw, sh);
        
        // Draw door opening
        if (structure.doorX && structure.doorY) {
          const doorX = structure.doorX * tileSize - 10;
          ctx.fillStyle = '#4a8f4a'; // grass color outside
          ctx.fillRect(doorX - 2, sy + sh - 5, 24, 10);
        }
        
        continue; // Skip exterior rendering
      }
      
      // Wall base with stone/wood texture
      const wallColor = structure.type === 'blacksmith' ? '#554444' : 
                        structure.type === 'inn' ? '#665544' :
                        structure.type === 'shop' ? '#556655' : '#665555';
      
      // Main walls
      ctx.fillStyle = wallColor;
      ctx.fillRect(sx, sy, sw, sh);
      
      // Stone/brick texture on walls
      ctx.fillStyle = darkenHex(wallColor, 0.15);
      for (let row = 0; row < sh / 8; row++) {
        const offset = (row % 2) * 16;
        for (let col = 0; col < sw / 32 + 1; col++) {
          ctx.fillRect(sx + col * 32 + offset, sy + row * 8, 30, 1);
          ctx.fillRect(sx + col * 32 + offset, sy + row * 8, 1, 8);
        }
      }
      
      // Window
      if (sw > 80) {
        ctx.fillStyle = '#334466';
        ctx.fillRect(sx + 15, sy + 15, 20, 25);
        ctx.fillRect(sx + sw - 35, sy + 15, 20, 25);
        
        // Window frame
        ctx.strokeStyle = '#443322';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 15, sy + 15, 20, 25);
        ctx.strokeRect(sx + sw - 35, sy + 15, 20, 25);
        
        // Window glow
        ctx.fillStyle = 'rgba(255, 220, 150, 0.3)';
        ctx.fillRect(sx + 17, sy + 17, 16, 21);
        ctx.fillRect(sx + sw - 33, sy + 17, 16, 21);
      }
      
      // Roof (triangle) with shingles
      const roofColor = structure.type === 'inn' ? '#664422' : 
                        structure.type === 'blacksmith' ? '#443333' : '#884422';
      
      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.moveTo(sx - 15, sy);
      ctx.lineTo(sx + sw / 2, sy - 35);
      ctx.lineTo(sx + sw + 15, sy);
      ctx.closePath();
      ctx.fill();
      
      // Roof shingle lines
      ctx.strokeStyle = darkenHex(roofColor, 0.2);
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const lineY = sy - 35 + i * 10;
        ctx.beginPath();
        ctx.moveTo(sx - 15 + i * 5, lineY);
        ctx.lineTo(sx + sw + 15 - i * 5, lineY);
        ctx.stroke();
      }
      
      // Roof edge/shadow
      ctx.fillStyle = darkenHex(roofColor, 0.3);
      ctx.beginPath();
      ctx.moveTo(sx - 15, sy);
      ctx.lineTo(sx + sw / 2, sy - 35);
      ctx.lineTo(sx + sw / 2 + 8, sy - 28);
      ctx.lineTo(sx + sw + 15, sy + 6);
      ctx.lineTo(sx - 15, sy + 6);
      ctx.closePath();
      ctx.fill();
      
      // Chimney for some buildings
      if (structure.type === 'blacksmith' || structure.type === 'inn') {
        ctx.fillStyle = '#554433';
        ctx.fillRect(sx + sw - 30, sy - 45, 12, 25);
        
        // Smoke particles
        const smokeTime = performance.now() * 0.001;
        ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
        for (let i = 0; i < 3; i++) {
          const smokeY = sy - 50 - Math.sin(smokeTime + i) * 10 - i * 12;
          const smokeX = sx + sw - 24 + Math.sin(smokeTime * 2 + i) * 5;
          ctx.beginPath();
          ctx.arc(smokeX, smokeY, 4 + i * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Door with frame
      if (structure.doorX && structure.doorY) {
        const doorX = structure.doorX * tileSize - 10;
        const doorY = sy + sh - 35;
        
        // Door frame
        ctx.fillStyle = '#332211';
        ctx.fillRect(doorX - 3, doorY - 3, 26, 38);
        
        // Door
        ctx.fillStyle = '#664422';
        ctx.fillRect(doorX, doorY, 20, 32);
        
        // Door handle
        ctx.fillStyle = '#aa8844';
        ctx.beginPath();
        ctx.arc(doorX + 15, doorY + 18, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Door planks
        ctx.strokeStyle = '#553311';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(doorX + 10, doorY);
        ctx.lineTo(doorX + 10, doorY + 32);
        ctx.stroke();
        
        // Interaction indicator near door
        const playerDist = distance(player.x, player.y, 
          structure.doorX * tileSize, structure.doorY * tileSize);
        if (playerDist < 60) {
          const pulse = 0.5 + Math.sin(performance.now() * 0.005) * 0.3;
          ctx.globalAlpha = pulse;
          ctx.fillStyle = '#ffcc00';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('[E]', doorX + 10, doorY - 10);
          ctx.globalAlpha = 1;
        }
      }
    }
    
    // Special decorations for structure types
    if (structure.type === 'fountain') {
      // Water basin
      ctx.fillStyle = '#666677';
      ctx.beginPath();
      ctx.arc(sx + sw / 2, sy + sh / 2, sw / 2 - 5, 0, Math.PI * 2);
      ctx.fill();
      
      // Basin rim
      ctx.strokeStyle = '#888899';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Water
      const wave = Math.sin(performance.now() * 0.003) * 0.1;
      ctx.fillStyle = `rgba(50, 100, 170, ${0.8 + wave})`;
      ctx.beginPath();
      ctx.arc(sx + sw / 2, sy + sh / 2, sw / 2 - 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Center pillar
      ctx.fillStyle = '#888899';
      ctx.fillRect(sx + sw / 2 - 8, sy + sh / 2 - 20, 16, 25);
      
      // Water spray particles
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + performance.now() * 0.002;
        const height = Math.sin(performance.now() * 0.01 + i) * 8;
        const px = sx + sw / 2 + Math.cos(angle) * 10;
        const py = sy + sh / 2 - 20 + height - 15;
        
        ctx.fillStyle = 'rgba(150, 200, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Well
    if (structure.type === 'well') {
      // Stone base
      ctx.fillStyle = '#666666';
      ctx.beginPath();
      ctx.arc(sx + sw / 2, sy + sh / 2, 20, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#444455';
      ctx.beginPath();
      ctx.arc(sx + sw / 2, sy + sh / 2, 14, 0, Math.PI * 2);
      ctx.fill();
      
      // Wooden frame
      ctx.fillStyle = '#553322';
      ctx.fillRect(sx + sw / 2 - 3, sy + sh / 2 - 35, 6, 40);
      
      // Roof
      ctx.fillStyle = '#664433';
      ctx.beginPath();
      ctx.moveTo(sx + sw / 2 - 25, sy + sh / 2 - 30);
      ctx.lineTo(sx + sw / 2, sy + sh / 2 - 45);
      ctx.lineTo(sx + sw / 2 + 25, sy + sh / 2 - 30);
      ctx.closePath();
      ctx.fill();
    }
    
    // Sign for shops
    if (structure.type === 'shop' || structure.type === 'inn' || structure.type === 'blacksmith') {
      const signX = sx + sw / 2;
      const signY = sy + 15;
      
      // Sign post
      ctx.fillStyle = '#443322';
      ctx.fillRect(signX - 2, signY, 4, 20);
      
      // Sign board
      ctx.fillStyle = '#554433';
      ctx.fillRect(signX - 25, signY - 5, 50, 25);
      
      // Sign border
      ctx.strokeStyle = '#332211';
      ctx.lineWidth = 2;
      ctx.strokeRect(signX - 25, signY - 5, 50, 25);
      
      // Sign text/icon
      ctx.fillStyle = '#ddccaa';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      
      if (structure.type === 'shop') ctx.fillText('◆', signX, signY + 12);
      else if (structure.type === 'inn') ctx.fillText('☆', signX, signY + 12);
      else if (structure.type === 'blacksmith') ctx.fillText('⚒', signX, signY + 12);
    }
  }
  
  // Render house interior effect if inside a house
  if (insideHouse && houseTransitionAlpha > 0) {
    renderHouseInteriorEffect(ctx, camX, camY, tileSize);
  }
}

/**
 * Render house interior effect (darken outside, focus on interior)
 */
function renderHouseInteriorEffect(ctx, camX, camY, tileSize) {
  if (!insideHouse) return;
  
  const sx = insideHouse.x * tileSize - camX;
  const sy = insideHouse.y * tileSize - camY;
  const sw = insideHouse.width * tileSize;
  const sh = insideHouse.height * tileSize;
  
  // Darken everything outside the house
  ctx.save();
  ctx.globalAlpha = houseTransitionAlpha * 0.7;
  ctx.fillStyle = '#000000';
  
  // Top
  ctx.fillRect(-camX, -camY, openWorld.width * tileSize, insideHouse.y * tileSize);
  // Bottom
  ctx.fillRect(-camX, (insideHouse.y + insideHouse.height) * tileSize - camY, 
    openWorld.width * tileSize, openWorld.height * tileSize);
  // Left
  ctx.fillRect(-camX, sy, insideHouse.x * tileSize, sh);
  // Right
  ctx.fillRect((insideHouse.x + insideHouse.width) * tileSize - camX, sy, 
    openWorld.width * tileSize, sh);
  
  ctx.restore();
  
  // Draw enlarged interior
  ctx.save();
  ctx.globalAlpha = houseTransitionAlpha;
  
  // Interior floor (bigger than exterior would suggest)
  const interiorScale = 2; // Interior is 2x larger
  const interiorX = sx - sw * (interiorScale - 1) / 2;
  const interiorY = sy - sh * (interiorScale - 1) / 2;
  const interiorW = sw * interiorScale;
  const interiorH = sh * interiorScale;
  
  // Floor
  ctx.fillStyle = '#8a6644';
  ctx.fillRect(interiorX, interiorY, interiorW, interiorH);
  
  // Floor planks
  ctx.strokeStyle = '#6a4a2a';
  ctx.lineWidth = 1;
  for (let i = 0; i < interiorH / 16; i++) {
    ctx.beginPath();
    ctx.moveTo(interiorX, interiorY + i * 16);
    ctx.lineTo(interiorX + interiorW, interiorY + i * 16);
    ctx.stroke();
  }
  
  // Interior furniture
  // Table
  ctx.fillStyle = '#664422';
  ctx.fillRect(interiorX + interiorW / 2 - 30, interiorY + interiorH / 2 - 20, 60, 40);
  ctx.fillStyle = '#553311';
  ctx.fillRect(interiorX + interiorW / 2 - 25, interiorY + interiorH / 2 + 15, 10, 20);
  ctx.fillRect(interiorX + interiorW / 2 + 15, interiorY + interiorH / 2 + 15, 10, 20);
  
  // Bed
  ctx.fillStyle = '#443333';
  ctx.fillRect(interiorX + 20, interiorY + 20, 50, 80);
  ctx.fillStyle = '#ffeecc';
  ctx.fillRect(interiorX + 25, interiorY + 25, 40, 30);
  ctx.fillStyle = '#aaaacc';
  ctx.fillRect(interiorX + 25, interiorY + 55, 40, 40);
  
  // Chest
  ctx.fillStyle = '#7a5a3a';
  ctx.fillRect(interiorX + interiorW - 70, interiorY + 30, 40, 30);
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(interiorX + interiorW - 55, interiorY + 40, 10, 8);
  
  // Candle/lamp light
  const flicker = 0.7 + Math.sin(performance.now() * 0.01) * 0.2;
  ctx.fillStyle = `rgba(255, 200, 100, ${0.15 * flicker})`;
  ctx.beginPath();
  ctx.arc(interiorX + interiorW / 2, interiorY + interiorH / 2, 80, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

/**
 * Darken a hex color string
 */
function darkenHex(color, amount) {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.floor(((num >> 16) & 0xff) * (1 - amount));
  const g = Math.floor(((num >> 8) & 0xff) * (1 - amount));
  const b = Math.floor((num & 0xff) * (1 - amount));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Lighten a hex color string
 */
function lightenHex(color, amount) {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.min(255, Math.floor(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.floor(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.floor((num & 0xff) + (255 - (num & 0xff)) * amount));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Render decorations (trees, rocks, bushes)
 */
function renderDecorations(ctx, camX, camY) {
  const tileSize = openWorld?.tileSize || TILE_SIZE;
  
  // Sort by Y for depth
  const sorted = [...decorations].sort((a, b) => a.y - b.y);
  
  for (const deco of sorted) {
    // Culling
    if (deco.x < camX - 100 || deco.x > camX + window.innerWidth + 100 ||
        deco.y < camY - 100 || deco.y > camY + window.innerHeight + 100) {
      continue;
    }
    
    switch (deco.type) {
      case ENTITY_TYPES.TREE_OAK:
        drawTree(ctx, deco.x, deco.y, '#4a7c4a', '#3d6b3d', 'rounded');
        break;
      case ENTITY_TYPES.TREE_PINE:
        drawTree(ctx, deco.x, deco.y, '#2d5a2d', '#1f4a1f', 'pointed');
        break;
      case ENTITY_TYPES.TREE_WILLOW:
        drawTree(ctx, deco.x, deco.y, '#5a8f5a', '#4a7a4a', 'weeping');
        break;
      case ENTITY_TYPES.ROCK:
        drawRock(ctx, deco.x, deco.y, deco.variant || 0);
        break;
      case ENTITY_TYPES.BUSH:
        drawBush(ctx, deco.x, deco.y);
        break;
      case ENTITY_TYPES.LAMP_POST:
        drawLampPost(ctx, deco.x, deco.y);
        break;
    }
  }
}

/**
 * Draw a tree
 */
function drawTree(ctx, x, y, leafColor, darkLeafColor, style) {
  // Trunk shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Trunk
  ctx.fillStyle = '#5a3d2a';
  ctx.fillRect(x - 6, y - 30, 12, 35);
  
  // Trunk highlight
  ctx.fillStyle = '#6b4d3a';
  ctx.fillRect(x - 6, y - 30, 4, 35);
  
  // Leaves based on style
  if (style === 'pointed') {
    // Pine tree - triangle
    ctx.fillStyle = leafColor;
    ctx.beginPath();
    ctx.moveTo(x, y - 70);
    ctx.lineTo(x + 25, y - 25);
    ctx.lineTo(x - 25, y - 25);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = darkLeafColor;
    ctx.beginPath();
    ctx.moveTo(x, y - 55);
    ctx.lineTo(x + 20, y - 20);
    ctx.lineTo(x - 5, y - 20);
    ctx.closePath();
    ctx.fill();
  } else if (style === 'weeping') {
    // Willow - drooping branches
    ctx.fillStyle = leafColor;
    ctx.beginPath();
    ctx.arc(x, y - 40, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // Drooping branches
    ctx.strokeStyle = leafColor;
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * 20, y - 40 + Math.sin(angle) * 20);
      ctx.quadraticCurveTo(
        x + Math.cos(angle) * 35, y - 20,
        x + Math.cos(angle) * 25, y + 5
      );
      ctx.stroke();
    }
  } else {
    // Oak - rounded
    ctx.fillStyle = leafColor;
    ctx.beginPath();
    ctx.arc(x, y - 45, 28, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = darkLeafColor;
    ctx.beginPath();
    ctx.arc(x + 8, y - 50, 15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#6aac6a';
    ctx.beginPath();
    ctx.arc(x - 10, y - 40, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw a rock
 */
function drawRock(ctx, x, y, variant) {
  const sizes = [[20, 15], [15, 12], [25, 18]];
  const [w, h] = sizes[variant % 3];
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y + 5, w * 0.8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Rock body
  ctx.fillStyle = '#666666';
  ctx.beginPath();
  ctx.ellipse(x, y - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Highlight
  ctx.fillStyle = '#888888';
  ctx.beginPath();
  ctx.ellipse(x - 3, y - h / 2 - 3, w / 4, h / 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a bush
 */
function drawBush(ctx, x, y) {
  ctx.fillStyle = '#4a8a4a';
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#5aaa5a';
  ctx.beginPath();
  ctx.arc(x - 5, y - 3, 8, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#6aba6a';
  ctx.beginPath();
  ctx.arc(x + 4, y - 2, 6, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw lamp post
 */
function drawLampPost(ctx, x, y) {
  // Post
  ctx.fillStyle = '#333333';
  ctx.fillRect(x - 3, y - 50, 6, 55);
  
  // Lamp housing
  ctx.fillStyle = '#444444';
  ctx.fillRect(x - 8, y - 60, 16, 12);
  
  // Glow
  const flicker = 0.7 + Math.sin(performance.now() * 0.005) * 0.2;
  ctx.fillStyle = `rgba(255, 220, 128, ${flicker * 0.8})`;
  ctx.beginPath();
  ctx.arc(x, y - 54, 6, 0, Math.PI * 2);
  ctx.fill();
  
  // Light cone
  ctx.fillStyle = `rgba(255, 220, 128, ${flicker * 0.1})`;
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 48);
  ctx.lineTo(x + 5, y - 48);
  ctx.lineTo(x + 30, y + 20);
  ctx.lineTo(x - 30, y + 20);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw enemy with different shapes based on archetype
 * Enhanced with boss/elite visuals
 */
function drawEnemy(ctx, enemy) {
  const x = enemy.x;
  const y = enemy.y;
  const scale = enemy.scale || 1;
  const isBoss = enemy.isBoss;
  const isElite = enemy.isElite;
  
  // Archetype visual configurations
  const archetypeVisuals = {
    skirmisher: { shape: 'circle', size: 24, color: '#ff4444', eyeColor: '#ffff00' },
    charger: { shape: 'triangle', size: 30, color: '#ff8844', eyeColor: '#ff0000' },
    spitter: { shape: 'blob', size: 26, color: '#44ff66', eyeColor: '#000000' },
    gunner: { shape: 'square', size: 28, color: '#888899', eyeColor: '#ff4444' },
    lurker: { shape: 'ghost', size: 28, color: '#884488', eyeColor: '#ffffff' },
    summoner: { shape: 'star', size: 32, color: '#aa44cc', eyeColor: '#ffcc00' },
    berserker: { shape: 'spiky', size: 34, color: '#ff2222', eyeColor: '#000000' },
    sniper: { shape: 'thin', size: 26, color: '#4466aa', eyeColor: '#ff0000' },
    healer: { shape: 'aura', size: 24, color: '#44ffaa', eyeColor: '#ffffff' },
    tank: { shape: 'block', size: 36, color: '#666677', eyeColor: '#ff4444' },
    assassin: { shape: 'shadow', size: 24, color: '#333344', eyeColor: '#ff00ff' },
    necromancer: { shape: 'skull', size: 30, color: '#550055', eyeColor: '#00ff00' },
  };
  
  const visual = archetypeVisuals[enemy.archetype] || archetypeVisuals.skirmisher;
  const halfSize = (visual.size / 2) * scale;
  const time = performance.now();
  
  // Boss/Elite aura effect
  if (isBoss) {
    // Boss has pulsing dark aura
    const pulseSize = halfSize * 1.8 + Math.sin(time * 0.005) * 10;
    const gradient = ctx.createRadialGradient(x, y, halfSize * 0.5, x, y, pulseSize);
    gradient.addColorStop(0, 'rgba(100, 0, 150, 0.5)');
    gradient.addColorStop(0.5, 'rgba(150, 50, 200, 0.3)');
    gradient.addColorStop(1, 'rgba(100, 0, 150, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Boss lightning effects
    if (Math.random() < 0.1) {
      ctx.strokeStyle = 'rgba(200, 100, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const angle = Math.random() * Math.PI * 2;
      const endX = x + Math.cos(angle) * pulseSize;
      const endY = y + Math.sin(angle) * pulseSize;
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  } else if (isElite) {
    // Elite has subtle golden glow
    const glowSize = halfSize * 1.4;
    const gradient = ctx.createRadialGradient(x, y, halfSize * 0.3, x, y, glowSize);
    gradient.addColorStop(0, 'rgba(255, 200, 100, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, glowSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Apply scale transform for boss/elite
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-x, -y);
  
  // Shadow (scaled)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + halfSize / scale - 2, halfSize * 0.7 / scale, halfSize * 0.25 / scale, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Modify color for corrupted enemies
  let enemyColor = visual.color;
  if (enemy.spawnZone === ZONE_TYPES.CORRUPTED_CORE) {
    enemyColor = shiftToCorrupted(visual.color);
  } else if (enemy.spawnZone === ZONE_TYPES.CORRUPTED) {
    enemyColor = blendWithCorruption(visual.color, 0.3);
  }
  
  // Draw body based on shape
  ctx.fillStyle = enemyColor;
  
  switch (visual.shape) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(x, y, halfSize, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(x, y - halfSize);
      ctx.lineTo(x + halfSize, y + halfSize * 0.8);
      ctx.lineTo(x - halfSize, y + halfSize * 0.8);
      ctx.closePath();
      ctx.fill();
      break;
      
    case 'blob':
      // Irregular blob shape
      ctx.beginPath();
      ctx.moveTo(x - halfSize, y);
      ctx.quadraticCurveTo(x - halfSize * 0.5, y - halfSize, x, y - halfSize * 0.8);
      ctx.quadraticCurveTo(x + halfSize * 0.5, y - halfSize, x + halfSize, y);
      ctx.quadraticCurveTo(x + halfSize, y + halfSize * 0.5, x, y + halfSize * 0.7);
      ctx.quadraticCurveTo(x - halfSize, y + halfSize * 0.5, x - halfSize, y);
      ctx.fill();
      // Slime drip
      ctx.beginPath();
      ctx.arc(x + halfSize * 0.5, y + halfSize * 0.8, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'square':
      ctx.fillRect(x - halfSize, y - halfSize * 0.8, visual.size, visual.size * 0.8);
      // Robot details
      ctx.fillStyle = darkenHex(visual.color, 0.3);
      ctx.fillRect(x - halfSize + 4, y - halfSize * 0.8 + 4, 8, 8);
      ctx.fillRect(x + halfSize - 12, y - halfSize * 0.8 + 4, 8, 8);
      break;
      
    case 'ghost':
      ctx.beginPath();
      ctx.arc(x, y - halfSize * 0.3, halfSize * 0.8, Math.PI, 0);
      ctx.lineTo(x + halfSize * 0.8, y + halfSize * 0.5);
      // Wavy bottom
      for (let i = 0; i < 4; i++) {
        const wx = x + halfSize * 0.8 - (i + 1) * (halfSize * 0.4);
        const wy = y + halfSize * 0.5 + (i % 2 === 0 ? 8 : 0);
        ctx.lineTo(wx, wy);
      }
      ctx.closePath();
      ctx.fill();
      break;
      
    case 'star':
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 90) * Math.PI / 180;
        const outerX = x + Math.cos(angle) * halfSize;
        const outerY = y + Math.sin(angle) * halfSize;
        if (i === 0) ctx.moveTo(outerX, outerY);
        else ctx.lineTo(outerX, outerY);
        
        const innerAngle = ((i * 72 + 36) - 90) * Math.PI / 180;
        const innerX = x + Math.cos(innerAngle) * halfSize * 0.4;
        const innerY = y + Math.sin(innerAngle) * halfSize * 0.4;
        ctx.lineTo(innerX, innerY);
      }
      ctx.closePath();
      ctx.fill();
      break;
      
    case 'spiky':
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i * 45) * Math.PI / 180;
        const r = i % 2 === 0 ? halfSize : halfSize * 0.6;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
      
    case 'thin':
      // Tall thin sniper
      ctx.fillRect(x - 6, y - halfSize, 12, halfSize * 1.8);
      // Scope/eye
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(x, y - halfSize + 8, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'aura':
      // Glowing healer
      ctx.fillStyle = `rgba(68, 255, 170, 0.3)`;
      ctx.beginPath();
      ctx.arc(x, y, halfSize * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = visual.color;
      ctx.beginPath();
      ctx.arc(x, y, halfSize * 0.8, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'block':
      // Chunky tank
      ctx.fillRect(x - halfSize, y - halfSize * 0.7, visual.size, halfSize * 1.4);
      // Shield detail
      ctx.fillStyle = lightenHex(visual.color, 0.2);
      ctx.fillRect(x - halfSize + 4, y - halfSize * 0.5, visual.size - 8, 4);
      break;
      
    case 'shadow':
      // Flickering shadow assassin
      const shadowAlpha = 0.6 + Math.sin(performance.now() * 0.01) * 0.3;
      ctx.globalAlpha *= shadowAlpha;
      ctx.beginPath();
      ctx.arc(x, y, halfSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha /= shadowAlpha;
      break;
      
    case 'skull':
      // Skull-like necromancer
      ctx.beginPath();
      ctx.arc(x, y - 4, halfSize * 0.8, 0, Math.PI * 2);
      ctx.fill();
      // Jaw
      ctx.beginPath();
      ctx.arc(x, y + 8, halfSize * 0.5, 0, Math.PI);
      ctx.fill();
      // Eye sockets
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(x - 6, y - 6, 5, 0, Math.PI * 2);
      ctx.arc(x + 6, y - 6, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    default:
      ctx.beginPath();
      ctx.arc(x, y, halfSize, 0, Math.PI * 2);
      ctx.fill();
  }
  
  // Highlight (for most shapes)
  if (!['ghost', 'shadow', 'skull'].includes(visual.shape)) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(x - halfSize * 0.3, y - halfSize * 0.3, halfSize * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Eyes (varies by type)
  if (!['skull', 'thin'].includes(visual.shape)) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - halfSize * 0.3, y - halfSize * 0.15, 4, 0, Math.PI * 2);
    ctx.arc(x + halfSize * 0.3, y - halfSize * 0.15, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = visual.eyeColor;
    ctx.beginPath();
    ctx.arc(x - halfSize * 0.25, y - halfSize * 0.15, 2, 0, Math.PI * 2);
    ctx.arc(x + halfSize * 0.35, y - halfSize * 0.15, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Health bar
  const healthPercent = (enemy.stats?.hp || 0) / (enemy.stats?.hpMax || 1);
  const barWidth = visual.size * scale;
  const barHeight = 4;
  const barY = y - halfSize - 10;
  
  ctx.restore(); // Restore from scale transform
  
  // Health bar background
  ctx.fillStyle = '#333333';
  ctx.fillRect(x - barWidth / 2, barY, barWidth, barHeight);
  
  // Health bar fill
  let healthColor = healthPercent > 0.5 ? '#44ff44' : healthPercent > 0.25 ? '#ffaa00' : '#ff4444';
  if (isBoss) healthColor = '#aa44ff'; // Purple for boss
  else if (isElite) healthColor = '#ffcc44'; // Gold for elite
  
  ctx.fillStyle = healthColor;
  ctx.fillRect(x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
  
  // Boss/Elite indicator
  if (isBoss) {
    ctx.fillStyle = '#ff44ff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('☠ BOSS ☠', x, barY - 5);
  } else if (isElite) {
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★ ELITE', x, barY - 4);
  } else {
    // Archetype indicator
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(enemy.archetype?.charAt(0).toUpperCase() || '?', x, y + (halfSize / scale) + 12);
  }
}

/**
 * Shift color towards corrupted purple
 */
function shiftToCorrupted(hexColor) {
  if (typeof hexColor !== 'string') return hexColor;
  
  let r, g, b;
  if (hexColor.startsWith('#')) {
    const hex = hexColor.slice(1);
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  } else {
    return hexColor;
  }
  
  // Shift towards purple/magenta
  r = Math.min(255, Math.floor(r * 0.7 + 100));
  g = Math.floor(g * 0.4);
  b = Math.min(255, Math.floor(b * 0.7 + 80));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Blend color with corruption
 */
function blendWithCorruption(hexColor, amount) {
  if (typeof hexColor !== 'string') return hexColor;
  
  let r, g, b;
  if (hexColor.startsWith('#')) {
    const hex = hexColor.slice(1);
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  } else {
    return hexColor;
  }
  
  // Blend with purple
  const corruptR = 120;
  const corruptG = 60;
  const corruptB = 150;
  
  r = Math.floor(r * (1 - amount) + corruptR * amount);
  g = Math.floor(g * (1 - amount) + corruptG * amount);
  b = Math.floor(b * (1 - amount) + corruptB * amount);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Render interactables (chests, ore, berries, health flowers)
 */
function renderInteractables(ctx, camX, camY) {
  for (const inter of interactables) {
    // Culling
    if (inter.x < camX - 50 || inter.x > camX + window.innerWidth + 50 ||
        inter.y < camY - 50 || inter.y > camY + window.innerHeight + 50) {
      continue;
    }
    
    if (inter.type === 'chest' || inter.type === ENTITY_TYPES.CHEST) {
      drawChest(ctx, inter.x, inter.y, inter.opened);
    } else if (inter.type === 'ore_iron') {
      if (!inter.collected) {
        drawOre(ctx, inter.x, inter.y);
      }
    } else if (inter.type === 'berry_bush') {
      drawBerryBush(ctx, inter.x, inter.y, inter.collected);
    } else if (inter.type === 'health_flower') {
      if (!inter.collected) {
        drawHealthFlower(ctx, inter.x, inter.y);
      }
    }
  }
}

/**
 * Draw a chest
 */
function drawChest(ctx, x, y, opened) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Chest body
  ctx.fillStyle = opened ? '#5a4a2a' : '#8a6a3a';
  ctx.fillRect(x - 15, y - 8, 30, 20);
  
  // Lid
  ctx.fillStyle = opened ? '#4a3a1a' : '#7a5a2a';
  if (opened) {
    // Open lid rotated back
    ctx.save();
    ctx.translate(x - 15, y - 8);
    ctx.rotate(-0.8);
    ctx.fillRect(0, -12, 30, 12);
    ctx.restore();
  } else {
    ctx.fillRect(x - 15, y - 18, 30, 10);
  }
  
  // Lock/clasp
  if (!opened) {
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(x - 4, y - 12, 8, 6);
  }
  
  // Sparkle for unopened
  if (!opened) {
    const sparkle = Math.sin(performance.now() * 0.005) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255, 255, 200, ${sparkle * 0.6})`;
    ctx.beginPath();
    ctx.arc(x + 10, y - 15, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw ore deposit
 */
function drawOre(ctx, x, y) {
  // Rock base
  ctx.fillStyle = '#555555';
  ctx.beginPath();
  ctx.moveTo(x - 15, y + 5);
  ctx.lineTo(x - 10, y - 15);
  ctx.lineTo(x + 5, y - 18);
  ctx.lineTo(x + 15, y - 5);
  ctx.lineTo(x + 12, y + 5);
  ctx.closePath();
  ctx.fill();
  
  // Iron ore veins
  ctx.fillStyle = '#aa7755';
  ctx.beginPath();
  ctx.arc(x - 5, y - 8, 4, 0, Math.PI * 2);
  ctx.arc(x + 5, y - 3, 3, 0, Math.PI * 2);
  ctx.arc(x, y - 12, 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Metallic shine
  const shine = Math.sin(performance.now() * 0.003) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(200, 180, 150, ${shine * 0.5})`;
  ctx.beginPath();
  ctx.arc(x - 3, y - 10, 2, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw berry bush
 */
function drawBerryBush(ctx, x, y, collected) {
  // Bush base
  ctx.fillStyle = '#3a6a3a';
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#4a8a4a';
  ctx.beginPath();
  ctx.arc(x - 5, y - 3, 10, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#5a9a5a';
  ctx.beginPath();
  ctx.arc(x + 4, y - 2, 8, 0, Math.PI * 2);
  ctx.fill();
  
  // Berries (if not collected)
  if (!collected) {
    const berryPositions = [
      { x: -6, y: -5 },
      { x: 2, y: -8 },
      { x: 7, y: -2 },
      { x: -3, y: 2 },
      { x: 5, y: 4 },
    ];
    
    ctx.fillStyle = '#ff4466';
    for (const pos of berryPositions) {
      ctx.beginPath();
      ctx.arc(x + pos.x, y + pos.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Shine on berries
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(x - 5, y - 6, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw health flower (rare healing item)
 */
function drawHealthFlower(ctx, x, y) {
  const pulse = 0.8 + Math.sin(performance.now() * 0.004) * 0.2;
  
  // Glow effect
  ctx.fillStyle = `rgba(100, 255, 150, ${0.2 * pulse})`;
  ctx.beginPath();
  ctx.arc(x, y - 8, 20, 0, Math.PI * 2);
  ctx.fill();
  
  // Stem
  ctx.fillStyle = '#3a7a3a';
  ctx.fillRect(x - 1, y - 5, 2, 15);
  
  // Leaves
  ctx.fillStyle = '#4a9a4a';
  ctx.beginPath();
  ctx.ellipse(x - 6, y + 2, 5, 3, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 6, y + 4, 5, 3, 0.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Flower petals
  const petalCount = 6;
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 + performance.now() * 0.001;
    const px = x + Math.cos(angle) * 8;
    const py = y - 10 + Math.sin(angle) * 8;
    
    ctx.fillStyle = `rgba(150, 255, 200, ${pulse})`;
    ctx.beginPath();
    ctx.ellipse(px, py, 5, 3, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Center
  ctx.fillStyle = '#ffff88';
  ctx.beginPath();
  ctx.arc(x, y - 10, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Sparkle
  const sparkle = Math.sin(performance.now() * 0.008) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(255, 255, 255, ${sparkle})`;
  ctx.beginPath();
  ctx.arc(x + 3, y - 13, 2, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Render NPCs
 */
function renderNPCs(ctx, camX, camY) {
  for (const npc of npcs) {
    // Culling
    if (npc.x < camX - 50 || npc.x > camX + window.innerWidth + 50 ||
        npc.y < camY - 50 || npc.y > camY + window.innerHeight + 50) {
      continue;
    }
    
    drawNPC(ctx, npc);
  }
}

/**
 * Draw an NPC
 */
function drawNPC(ctx, npc) {
  const x = npc.x;
  const y = npc.y;
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Color based on NPC type
  const typeColors = {
    [ENTITY_TYPES.NPC_VILLAGER]: { body: '#6688aa', hair: '#553322' },
    [ENTITY_TYPES.NPC_MERCHANT]: { body: '#aa8844', hair: '#332211' },
    [ENTITY_TYPES.NPC_BLACKSMITH]: { body: '#884422', hair: '#221111' },
    [ENTITY_TYPES.NPC_INNKEEPER]: { body: '#aa6688', hair: '#443322' },
    [ENTITY_TYPES.NPC_GUARD]: { body: '#666688', hair: '#222222' },
    [ENTITY_TYPES.NPC_ELDER]: { body: '#8866aa', hair: '#aaaaaa' },
    [ENTITY_TYPES.NPC_CHILD]: { body: '#88aa66', hair: '#664422' },
  };
  
  const colors = typeColors[npc.type] || { body: '#888888', hair: '#444444' };
  const facing = npc.facing || 1;
  
  // Legs
  ctx.fillStyle = '#333355';
  ctx.fillRect(x - 5, y + 4, 4, 12);
  ctx.fillRect(x + 1, y + 4, 4, 12);
  
  // Body
  ctx.fillStyle = colors.body;
  ctx.fillRect(x - 7, y - 8, 14, 16);
  
  // Head
  ctx.fillStyle = '#ffcc99';
  ctx.fillRect(x - 5, y - 18, 10, 12);
  
  // Hair
  ctx.fillStyle = colors.hair;
  ctx.fillRect(x - 5, y - 20, 10, 5);
  if (npc.type === ENTITY_TYPES.NPC_ELDER) {
    // Beard for elder
    ctx.fillRect(x - 3, y - 6, 6, 8);
  }
  
  // Eyes
  const eyeOffset = facing > 0 ? 1 : -1;
  ctx.fillStyle = '#333333';
  ctx.fillRect(x - 2 + eyeOffset, y - 14, 2, 2);
  ctx.fillRect(x + 2 + eyeOffset, y - 14, 2, 2);
  
  // Name above if close to player
  const distToPlayer = distance(player.x, player.y, x, y);
  if (distToPlayer < 100 && npc.definition) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(npc.definition.name, x, y - 28);
  }
  
  // Quest marker if has quest
  if (npc.definition?.canGiveQuest && npc.definition.questId) {
    const quest = QUEST_DEFINITIONS[npc.definition.questId];
    if (quest && !completedQuests.includes(quest.id) && !activeQuests.find(q => q.id === quest.id)) {
      // Yellow exclamation mark
      const bob = Math.sin(performance.now() * 0.005) * 3;
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', x, y - 35 + bob);
    }
  }
}

/**
 * Render quest tracker
 */
function renderQuestTracker(ctx) {
  if (activeQuests.length === 0) return;
  
  const startX = 20;
  const startY = 150;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(startX - 5, startY - 20, 220, 25 + activeQuests.length * 35);
  
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Quêtes:', startX, startY);
  
  for (let i = 0; i < activeQuests.length; i++) {
    const quest = activeQuests[i];
    const qy = startY + 20 + i * 35;
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(quest.title, startX, qy);
    
    // Progress bar for countable quests
    if (quest.required) {
      ctx.fillStyle = '#333333';
      ctx.fillRect(startX, qy + 5, 150, 8);
      ctx.fillStyle = '#44ff88';
      ctx.fillRect(startX, qy + 5, 150 * (quest.progress / quest.required), 8);
      
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '10px monospace';
      ctx.fillText(`${quest.progress}/${quest.required}`, startX + 160, qy + 12);
    }
  }
}

/**
 * Render interaction prompt
 */
function renderInteractionPrompt(ctx) {
  if (!interactionTarget) return;
  
  const promptY = window.innerHeight - 80;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(window.innerWidth / 2 - 100, promptY - 15, 200, 40);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  
  let promptText = '[E] Interagir';
  if (interactionTarget.type === 'npc') {
    promptText = `[E] Parler à ${interactionTarget.target.definition?.name || 'NPC'}`;
  } else if (interactionTarget.type === 'interactable') {
    if (interactionTarget.target.type === 'chest' || interactionTarget.target.type === ENTITY_TYPES.CHEST) {
      promptText = '[E] Ouvrir le coffre';
    } else if (interactionTarget.target.type === 'ore_iron') {
      promptText = '[E] Collecter le minerai';
    }
  } else if (interactionTarget.type === 'item') {
    promptText = '[E] Ramasser';
  }
  
  ctx.fillText(promptText, window.innerWidth / 2, promptY + 5);
}

/**
 * Render dialogue box
 */
function renderDialogue(ctx) {
  if (!dialogueState) return;
  
  const boxWidth = Math.min(600, window.innerWidth - 40);
  const boxHeight = 180;
  const boxX = (window.innerWidth - boxWidth) / 2;
  const boxY = window.innerHeight - boxHeight - 30;
  
  // Background
  ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  
  // Border
  ctx.strokeStyle = '#4488ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
  
  // NPC name
  const npcName = dialogueState.npc?.definition?.name || 'NPC';
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(npcName, boxX + 20, boxY + 25);
  
  // Dialogue text
  const currentDialogue = (dialogueState.dialogues && dialogueState.dialogues[dialogueState.currentIndex]) || '...';
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px monospace';
  
  // Word wrap
  const maxWidth = boxWidth - 40;
  const words = currentDialogue.split(' ');
  let line = '';
  let lineY = boxY + 55;
  
  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth) {
      ctx.fillText(line, boxX + 20, lineY);
      line = word + ' ';
      lineY += 20;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, boxX + 20, lineY);
  
  // Options (if on last dialogue)
  const dialoguesLength = dialogueState.dialogues?.length || 0;
  if (dialogueState.currentIndex >= dialoguesLength - 1 && dialogueState.options && dialogueState.options.length > 0) {
    const optionY = boxY + boxHeight - 50;
    
    for (let i = 0; i < dialogueState.options.length; i++) {
      const optX = boxX + 20 + i * 180;
      
      ctx.fillStyle = 'rgba(68, 136, 255, 0.3)';
      ctx.fillRect(optX - 5, optionY - 12, 170, 22);
      
      ctx.fillStyle = '#88aaff';
      ctx.font = '12px monospace';
      ctx.fillText(`[${i + 1}] ${dialogueState.options[i].text}`, optX, optionY);
    }
  }
  
  // Continue prompt
  if (dialogueState.currentIndex < dialoguesLength - 1) {
    const pulse = 0.5 + Math.sin(performance.now() * 0.005) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#888888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[E] Continuer...', boxX + boxWidth / 2, boxY + boxHeight - 15);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}

/**
 * Render atmospheric fog based on distance from village center
 * Creates more ominous atmosphere in dangerous areas
 */
function renderAtmosphericFog(ctx, camX, camY) {
  if (!openWorld) return;
  
  const villageCenter = openWorld.villageCenter || { x: 100, y: 75 };
  const tileSize = openWorld.tileSize || 16;
  const villageCenterPixelX = villageCenter.x * tileSize;
  const villageCenterPixelY = villageCenter.y * tileSize;
  
  // Player distance from village center
  const playerDist = Math.sqrt(
    Math.pow(player.x - villageCenterPixelX, 2) + 
    Math.pow(player.y - villageCenterPixelY, 2)
  );
  
  // Safe zone radius in pixels
  const safeRadius = 600;  // ~37 tiles
  const maxRadius = 2000;  // Full fog distance
  
  // Calculate fog intensity based on distance
  if (playerDist > safeRadius) {
    const fogProgress = Math.min(1, (playerDist - safeRadius) / (maxRadius - safeRadius));
    const fogIntensity = fogProgress * 0.35;
    
    // Color shifts based on zone danger - darker purple/blue tint for danger
    const dangerLevel = Math.min(1, playerDist / 2500);
    const r = Math.floor(20 + dangerLevel * 30);
    const g = Math.floor(10 + dangerLevel * 15);
    const b = Math.floor(40 + dangerLevel * 40);
    
    // Apply fog overlay
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fogIntensity})`;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    
    // Add vignette effect for more atmosphere
    const vignette = ctx.createRadialGradient(
      window.innerWidth / 2, window.innerHeight / 2, window.innerWidth * 0.3,
      window.innerWidth / 2, window.innerHeight / 2, window.innerWidth * 0.8
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, `rgba(0, 0, 0, ${fogIntensity * 0.6})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

/**
 * Render controls guide (bottom left)
 */
function renderControlsGuide(ctx) {
  const guideX = 15;
  const guideY = window.innerHeight - 140;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(guideX - 5, guideY - 5, 145, 135);
  
  ctx.fillStyle = '#888899';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  
  const controls = [
    'WASD - Déplacer',
    'ESPACE - Attaquer',
    'SHIFT - Esquiver',
    'E - Interagir',
    'H - Utiliser soin',
    'I - Inventaire',
    'P - Options',
    'M - Carte',
    'ESC - Pause',
  ];
  
  controls.forEach((text, i) => {
    ctx.fillText(text, guideX, guideY + 12 + i * 13);
  });
}

/**
 * Render current zone indicator (top center)
 */
function renderZoneIndicator(ctx) {
  if (!openWorld) return;
  
  const villageCenter = openWorld.villageCenter || { x: 100, y: 75 };
  const tileSize = openWorld.tileSize || 32;
  
  const playerTileX = player.x / tileSize;
  const playerTileY = player.y / tileSize;
  const zoneType = getZoneTypeAt(villageCenter, playerTileX, playerTileY);
  const zoneConfig = ZONE_CONFIG[zoneType];
  
  // Zone names and colors
  const zoneInfo = {
    [ZONE_TYPES.VILLAGE]: { name: '🏘️ Village', color: '#88cc88', bgColor: 'rgba(50, 100, 50, 0.7)' },
    [ZONE_TYPES.FOREST]: { name: '🌲 Forêt', color: '#66aa66', bgColor: 'rgba(30, 80, 30, 0.7)' },
    [ZONE_TYPES.DEEP_FOREST]: { name: '🌳 Forêt Profonde', color: '#448844', bgColor: 'rgba(20, 60, 20, 0.8)' },
    [ZONE_TYPES.CORRUPTED]: { name: '💀 Zone Corrompue', color: '#aa66cc', bgColor: 'rgba(80, 40, 100, 0.8)' },
    [ZONE_TYPES.CORRUPTED_CORE]: { name: '☠️ Cœur de Corruption', color: '#ff66ff', bgColor: 'rgba(100, 20, 120, 0.9)' },
  };
  
  const info = zoneInfo[zoneType] || zoneInfo[ZONE_TYPES.VILLAGE];
  const centerX = window.innerWidth / 2;
  
  // Background
  ctx.fillStyle = info.bgColor;
  const textWidth = ctx.measureText(info.name).width + 30;
  ctx.fillRect(centerX - textWidth / 2, 10, textWidth, 28);
  
  // Border
  ctx.strokeStyle = info.color;
  ctx.lineWidth = 2;
  ctx.strokeRect(centerX - textWidth / 2, 10, textWidth, 28);
  
  // Text
  ctx.fillStyle = info.color;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(info.name, centerX, 29);
  
  // Danger level indicator for corrupted zones
  if (zoneType === ZONE_TYPES.CORRUPTED || zoneType === ZONE_TYPES.CORRUPTED_CORE) {
    const dangerLevel = zoneType === ZONE_TYPES.CORRUPTED_CORE ? '⚠️⚠️⚠️' : '⚠️⚠️';
    ctx.fillStyle = '#ff4444';
    ctx.font = '12px monospace';
    ctx.fillText(dangerLevel, centerX, 52);
  }
  
  // Render time of day indicator
  renderTimeIndicator(ctx);
}

/**
 * Render time of day indicator (top right corner)
 */
function renderTimeIndicator(ctx) {
  const dayNight = getDayNightLighting();
  const x = window.innerWidth - 80;
  const y = 15;
  
  // Time icon based on period
  let timeIcon, timeText, bgColor;
  
  if (gameTime < 0.20 || gameTime > 0.80) {
    timeIcon = '🌙';
    timeText = 'Nuit';
    bgColor = 'rgba(20, 30, 60, 0.7)';
  } else if (gameTime < 0.30) {
    timeIcon = '🌅';
    timeText = 'Aube';
    bgColor = 'rgba(100, 60, 40, 0.7)';
  } else if (gameTime > 0.70 && gameTime <= 0.80) {
    timeIcon = '🌆';
    timeText = 'Crépuscule';
    bgColor = 'rgba(100, 50, 50, 0.7)';
  } else {
    timeIcon = '☀️';
    timeText = 'Jour';
    bgColor = 'rgba(80, 80, 40, 0.7)';
  }
  
  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(x - 5, y, 70, 25);
  
  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`${timeIcon} ${timeText}`, x, y + 17);
  
  // Time progress bar
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(x, y + 22, 60, 3);
  ctx.fillStyle = dayNight.isNight ? '#8888ff' : '#ffdd88';
  ctx.fillRect(x, y + 22, 60 * gameTime, 3);
}

/**
 * Render inventory HUD (items count)
 */
function renderInventoryHUD(ctx) {
  const hudX = window.innerWidth - 130;
  const hudY = 120;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(hudX - 5, hudY - 5, 125, 65);
  
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  
  // Berries
  ctx.fillStyle = '#ff6688';
  ctx.fillText(`🍓 Baies: ${playerInventory.berries}`, hudX, hudY + 12);
  
  // Health Potions
  ctx.fillStyle = '#ff44aa';
  ctx.fillText(`🧪 Potions: ${playerInventory.healthPotions}`, hudX, hudY + 28);
  
  // Gold
  const gold = worldState?.player?.gold || 0;
  ctx.fillStyle = '#ffcc00';
  ctx.fillText(`💰 Or: ${gold}`, hudX, hudY + 44);
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
