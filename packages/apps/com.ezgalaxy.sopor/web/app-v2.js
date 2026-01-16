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
  generateOpenWorld, getZoneAt, isInSafeZone,
  getEnemyArchetypesForDifficulty
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
  if (dialogueState && dialogueState.options.length > 0) {
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
    case 'KeyF':
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
      if (dialogueState) {
        closeDialogue();
      } else if (panels.activePanel) {
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
      } else if (gameState === GAME_STATE.GAME_OVER) {
        // Restart game
        enemies = [];
        items = [];
        projectiles = [];
        player.health = player.maxHealth;
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
  
  // If in dialogue, advance dialogue
  if (dialogueState) {
    advanceDialogue();
    return;
  }
  
  // Check for nearby items first
  for (const item of items) {
    const dist = distance(player.x, player.y, item.x, item.y);
    if (dist <= 40) {
      pickupItem(item);
      return;
    }
  }
  
  // Check interactables (chests, ore)
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
  }
}

/**
 * Start dialogue with NPC
 */
function startDialogue(npc) {
  if (!npc.definition) return;
  
  const def = npc.definition;
  
  dialogueState = {
    npc: npc,
    dialogues: def.dialogues || [],
    currentIndex: npc.interacted ? Math.min(npc.dialogueIndex, def.dialogues.length - 1) : 0,
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
  
  dialogueState.currentIndex++;
  
  if (dialogueState.currentIndex >= dialogueState.dialogues.length) {
    // Show options if available, otherwise close
    if (dialogueState.options.length === 1) {
      // Only "Au revoir" - auto close
      closeDialogue();
    }
    // Otherwise stay on last message with options showing
    dialogueState.currentIndex = dialogueState.dialogues.length - 1;
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
  // Update player
  updatePlayer(dt);
  
  // Spawn enemies based on player distance from village
  updateEnemySpawning(dt);
  
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
  
  // Update NPCs (wandering behavior)
  updateNPCs(dt);
  
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
  
  // Update interaction highlights
  updateInteractionHighlights();
}

/**
 * Update enemy spawning based on distance from village
 */
let lastSpawnCheck = 0;
const SPAWN_CHECK_INTERVAL = 2000; // Check every 2 seconds

function updateEnemySpawning(dt) {
  lastSpawnCheck += dt;
  
  if (lastSpawnCheck < SPAWN_CHECK_INTERVAL) return;
  lastSpawnCheck = 0;
  
  if (!openWorld) return;
  
  // Get current zone
  const zone = getZoneAt(openWorld, player.x, player.y);
  if (!zone || zone.difficulty === 'safe') return;
  
  // Check if we need more enemies in this zone
  const nearbyEnemies = enemies.filter(e => {
    const dist = distance(e.x, e.y, player.x, player.y);
    return dist < 500;
  });
  
  const maxNearby = zone.maxEnemies || 3;
  if (nearbyEnemies.length >= maxNearby) return;
  
  // Spawn chance based on difficulty
  const spawnChance = {
    easy: 0.2,
    medium: 0.35,
    hard: 0.5,
    danger: 0.7,
  };
  
  if (Math.random() > (spawnChance[zone.difficulty] || 0.1)) return;
  
  // Get valid archetypes for this difficulty
  const archetypes = getEnemyArchetypesForDifficulty(zone.difficulty);
  if (archetypes.length === 0) return;
  
  // Find spawn position away from player but within zone
  const spawnAngle = Math.random() * Math.PI * 2;
  const spawnDist = 300 + Math.random() * 200;
  
  const spawnX = player.x + Math.cos(spawnAngle) * spawnDist;
  const spawnY = player.y + Math.sin(spawnAngle) * spawnDist;
  
  // Make sure it's in a valid position
  if (spawnX < 0 || spawnX > openWorld.width * openWorld.tileSize ||
      spawnY < 0 || spawnY > openWorld.height * openWorld.tileSize) {
    return;
  }
  
  // Check if spawn position is in safe zone
  if (isInSafeZone(openWorld, spawnX, spawnY)) return;
  
  // Spawn the enemy
  const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
  const enemy = createEnemy(archetype, spawnX, spawnY);
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
  
  // Draw NPCs
  renderNPCs(ctx, camX, camY);
  
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
  const tileSize = openWorld?.tileSize || TILE_SIZE;
  
  const startTileX = Math.max(0, Math.floor(camX / tileSize));
  const startTileY = Math.max(0, Math.floor(camY / tileSize));
  const endTileX = Math.min(level.width, Math.ceil((camX + window.innerWidth) / tileSize) + 1);
  const endTileY = Math.min(level.height, Math.ceil((camY + window.innerHeight) / tileSize) + 1);
  
  // Define tile colors for open world
  const tileColors = {
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
  
  for (let y = startTileY; y < endTileY; y++) {
    for (let x = startTileX; x < endTileX; x++) {
      const tile = level.tiles[y * level.width + x];
      const tileX = x * tileSize;
      const tileY = y * tileSize;
      
      // Use position-based variation for consistent tile appearance
      const variation = ((x * 7 + y * 13) % 3);
      
      // Get colors for this tile type
      const colors = tileColors[tile] || tileColors[WORLD_TILES.GRASS];
      const baseColor = colors[variation % colors.length];
      
      // Draw tile based on type
      if (tile === WORLD_TILES.WALL) {
        // Wall tile with brick pattern
        ctx.fillStyle = baseColor;
        ctx.fillRect(tileX, tileY, tileSize, tileSize);
        
        // Brick pattern
        const brickH = tileSize / 2;
        const offset = (y % 2) * (tileSize / 2);
        
        ctx.fillStyle = darkenHex(baseColor, 0.3);
        ctx.fillRect(tileX, tileY + brickH - 1, tileSize, 2);
        ctx.fillRect(tileX + (tileSize / 2 + offset) % tileSize, tileY, 2, brickH);
        ctx.fillRect(tileX + offset, tileY + brickH, 2, brickH);
        
        // Top highlight
        ctx.fillStyle = lightenHex(baseColor, 0.2);
        ctx.fillRect(tileX, tileY, tileSize, 2);
        
      } else if (tile === WORLD_TILES.WATER) {
        // Animated water
        const wave = Math.sin(performance.now() * 0.002 + x * 0.5 + y * 0.3) * 0.15;
        ctx.fillStyle = baseColor;
        ctx.fillRect(tileX, tileY, tileSize, tileSize);
        
        // Wave highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + wave})`;
        ctx.fillRect(tileX + (variation * 4), tileY + (variation * 3), tileSize / 2, 2);
        
      } else if (tile === WORLD_TILES.FLOOR_WOOD) {
        // Wood floor with planks
        ctx.fillStyle = baseColor;
        ctx.fillRect(tileX, tileY, tileSize, tileSize);
        
        // Wood grain lines
        ctx.fillStyle = darkenHex(baseColor, 0.2);
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(tileX, tileY + i * (tileSize / 3), tileSize, 1);
        }
        
        // Knots
        if ((x + y) % 7 === 0) {
          ctx.fillStyle = darkenHex(baseColor, 0.3);
          ctx.beginPath();
          ctx.arc(tileX + tileSize / 2, tileY + tileSize / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        
      } else if (tile === WORLD_TILES.PATH) {
        // Dirt path with stones
        ctx.fillStyle = baseColor;
        ctx.fillRect(tileX, tileY, tileSize, tileSize);
        
        // Small stones
        const seed = x * 1000 + y;
        if (seed % 5 === 0) {
          ctx.fillStyle = '#999988';
          ctx.beginPath();
          ctx.arc(tileX + (seed % 20) + 6, tileY + ((seed * 3) % 20) + 6, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Edge darkening
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(tileX, tileY, 2, tileSize);
        ctx.fillRect(tileX + tileSize - 2, tileY, 2, tileSize);
        
      } else if (tile === WORLD_TILES.FLOWERS) {
        // Grass base
        ctx.fillStyle = baseColor;
        ctx.fillRect(tileX, tileY, tileSize, tileSize);
        
        // Flowers
        const flowerColors = ['#ff6688', '#ffcc44', '#88aaff', '#ff88cc', '#ffffff'];
        const seed = (x * 13 + y * 17);
        
        for (let i = 0; i < 3; i++) {
          const fx = tileX + ((seed + i * 7) % (tileSize - 4)) + 2;
          const fy = tileY + ((seed + i * 11) % (tileSize - 4)) + 2;
          const fc = flowerColors[(seed + i) % flowerColors.length];
          
          ctx.fillStyle = fc;
          ctx.beginPath();
          ctx.arc(fx, fy, 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Stem
          ctx.fillStyle = '#3a6a3a';
          ctx.fillRect(fx - 0.5, fy, 1, 4);
        }
        
      } else if (tile === WORLD_TILES.TALL_GRASS) {
        // Base grass
        ctx.fillStyle = baseColor;
        ctx.fillRect(tileX, tileY, tileSize, tileSize);
        
        // Tall grass blades
        const seed = x * 13 + y * 7;
        ctx.fillStyle = '#5aaf5a';
        
        for (let i = 0; i < 5; i++) {
          const gx = tileX + ((seed + i * 5) % (tileSize - 2));
          const sway = Math.sin(performance.now() * 0.002 + seed + i) * 2;
          
          ctx.beginPath();
          ctx.moveTo(gx, tileY + tileSize);
          ctx.lineTo(gx + sway, tileY + tileSize - 12);
          ctx.lineTo(gx + 2, tileY + tileSize);
          ctx.fill();
        }
        
      } else {
        // Default tile (grass, dirt, sand, stone, etc.)
        ctx.fillStyle = baseColor;
        ctx.fillRect(tileX, tileY, tileSize, tileSize);
        
        // Add subtle texture
        const seed = x * 1000 + y;
        if ((seed % 5) === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(tileX + (seed % 12), tileY + ((seed * 3) % 12), 2, 2);
        }
        if ((seed % 7) === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(tileX + ((seed * 2) % 10), tileY + ((seed * 5) % 10), 2, 2);
        }
        
        // Subtle grid lines
        ctx.fillStyle = 'rgba(0,0,0,0.03)';
        ctx.fillRect(tileX, tileY, 1, tileSize);
        ctx.fillRect(tileX, tileY, tileSize, 1);
      }
    }
  }
  
  // Draw village structures on top
  renderStructures(ctx, camX, camY, startTileX, startTileY, endTileX, endTileY, tileSize);
}

/**
 * Render village structures
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
    
    // Draw roof
    if (structure.type !== 'fountain' && structure.type !== 'well') {
      // Roof (triangle)
      ctx.fillStyle = '#884422';
      ctx.beginPath();
      ctx.moveTo(sx - 10, sy);
      ctx.lineTo(sx + sw / 2, sy - 30);
      ctx.lineTo(sx + sw + 10, sy);
      ctx.closePath();
      ctx.fill();
      
      // Roof edge
      ctx.fillStyle = '#773311';
      ctx.beginPath();
      ctx.moveTo(sx - 10, sy);
      ctx.lineTo(sx + sw / 2, sy - 30);
      ctx.lineTo(sx + sw / 2 + 8, sy - 24);
      ctx.lineTo(sx + sw + 10, sy + 6);
      ctx.lineTo(sx - 10, sy + 6);
      ctx.closePath();
      ctx.fill();
    }
    
    // Special decorations for structure types
    if (structure.type === 'fountain') {
      // Water basin
      ctx.fillStyle = '#666677';
      ctx.beginPath();
      ctx.arc(sx + sw / 2, sy + sh / 2, sw / 2 - 5, 0, Math.PI * 2);
      ctx.fill();
      
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
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + performance.now() * 0.002;
        const px = sx + sw / 2 + Math.cos(angle) * 10;
        const py = sy + sh / 2 - 20 + Math.sin(performance.now() * 0.01 + i) * 5 - 10;
        
        ctx.fillStyle = 'rgba(150, 200, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Sign for shops
    if (structure.type === 'shop' || structure.type === 'inn' || structure.type === 'blacksmith') {
      const signX = sx + sw / 2;
      const signY = sy + 15;
      
      // Sign board
      ctx.fillStyle = '#443322';
      ctx.fillRect(signX - 20, signY, 40, 20);
      
      // Sign text/icon
      ctx.fillStyle = '#ddccaa';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      
      if (structure.type === 'shop') ctx.fillText('◆', signX, signY + 14);
      else if (structure.type === 'inn') ctx.fillText('☆', signX, signY + 14);
      else if (structure.type === 'blacksmith') ctx.fillText('⚒', signX, signY + 14);
    }
  }
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
 * Render interactables (chests, ore)
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
  const npcName = dialogueState.npc.definition?.name || 'NPC';
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(npcName, boxX + 20, boxY + 25);
  
  // Dialogue text
  const currentDialogue = dialogueState.dialogues[dialogueState.currentIndex] || '';
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
  if (dialogueState.currentIndex >= dialogueState.dialogues.length - 1 && dialogueState.options.length > 0) {
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
  if (dialogueState.currentIndex < dialogueState.dialogues.length - 1) {
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
