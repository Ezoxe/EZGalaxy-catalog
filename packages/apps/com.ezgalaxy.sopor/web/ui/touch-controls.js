/**
 * SOPOR - Touch Controls System
 * Virtual joystick and action buttons for mobile
 */

import { clamp, distance, isMobileDevice } from '../core/utils.js';
import { playUIClick } from '../audio/sfx.js';

// ========== Configuration ==========

export const TOUCH_CONFIG = {
  // Joystick
  joystickRadius: 60,
  joystickKnobRadius: 25,
  joystickDeadzone: 0.15,
  joystickMaxDistance: 50,
  
  // Buttons
  buttonRadius: 35,
  buttonSpacing: 20,
  
  // Positioning
  leftMargin: 30,
  rightMargin: 30,
  bottomMargin: 30,
  
  // Colors
  joystickBg: 'rgba(100, 100, 100, 0.4)',
  joystickKnob: 'rgba(200, 200, 200, 0.6)',
  joystickActive: 'rgba(150, 200, 255, 0.7)',
  
  buttonBg: 'rgba(80, 80, 80, 0.5)',
  buttonActive: 'rgba(100, 150, 255, 0.7)',
  buttonBorder: 'rgba(255, 255, 255, 0.3)',
  
  // Opacity
  idleOpacity: 0.5,
  activeOpacity: 0.9,
  
  // Haptics
  enableHaptics: true,
};

// ========== Touch State ==========

/**
 * Create touch controls state
 */
export function createTouchControls() {
  return {
    enabled: isMobileDevice(),
    
    // Joystick
    joystick: {
      active: false,
      touchId: null,
      baseX: 0,
      baseY: 0,
      knobX: 0,
      knobY: 0,
      dx: 0,
      dy: 0,
      magnitude: 0,
      angle: 0,
    },
    
    // Action buttons
    buttons: {
      attack: createButton('attack', 'A', '⚔'),
      dodge: createButton('dodge', 'D', '💨'),
      interact: createButton('interact', 'E', '🖐'),
      menu: createButton('menu', 'M', '☰'),
    },
    
    // Button layout
    buttonPositions: {},
    
    // Touch tracking
    activeTouches: new Map(),
    
    // Callbacks
    onMove: null,
    onAttack: null,
    onDodge: null,
    onInteract: null,
    onMenu: null,
  };
}

/**
 * Create button state
 */
function createButton(id, label, icon) {
  return {
    id,
    label,
    icon,
    active: false,
    touchId: null,
    x: 0,
    y: 0,
    cooldown: 0,
    enabled: true,
  };
}

/**
 * Initialize touch controls layout
 */
export function initTouchLayout(controls, screenWidth, screenHeight) {
  const config = TOUCH_CONFIG;
  
  // Joystick position (bottom-left)
  controls.joystick.baseX = config.leftMargin + config.joystickRadius;
  controls.joystick.baseY = screenHeight - config.bottomMargin - config.joystickRadius;
  controls.joystick.knobX = controls.joystick.baseX;
  controls.joystick.knobY = controls.joystick.baseY;
  
  // Action buttons (bottom-right, arranged in arc)
  const centerX = screenWidth - config.rightMargin - config.buttonRadius * 2;
  const centerY = screenHeight - config.bottomMargin - config.buttonRadius * 2;
  
  const buttons = Object.values(controls.buttons);
  const buttonCount = buttons.length;
  
  buttons.forEach((button, i) => {
    const angle = Math.PI * 0.5 + (i / (buttonCount - 1)) * Math.PI * 0.7 - Math.PI * 0.35;
    const radius = config.buttonRadius * 2 + config.buttonSpacing;
    
    button.x = centerX + Math.cos(angle) * radius;
    button.y = centerY - Math.sin(angle) * radius;
  });
  
  // Special position for menu button (top-right)
  controls.buttons.menu.x = screenWidth - config.rightMargin - config.buttonRadius;
  controls.buttons.menu.y = config.bottomMargin + config.buttonRadius;
}

// ========== Touch Event Handlers ==========

/**
 * Handle touch start
 */
export function handleTouchStart(controls, touches) {
  if (!controls.enabled) return;
  
  const config = TOUCH_CONFIG;
  
  for (const touch of touches) {
    const { identifier, clientX, clientY } = touch;
    
    // Check joystick area (left half of screen, bottom)
    if (clientX < window.innerWidth / 2) {
      if (!controls.joystick.active) {
        // Start joystick
        controls.joystick.active = true;
        controls.joystick.touchId = identifier;
        controls.joystick.baseX = clientX;
        controls.joystick.baseY = clientY;
        controls.joystick.knobX = clientX;
        controls.joystick.knobY = clientY;
        controls.activeTouches.set(identifier, 'joystick');
        continue;
      }
    }
    
    // Check buttons
    for (const button of Object.values(controls.buttons)) {
      if (!button.enabled || button.active) continue;
      
      const dist = distance(clientX, clientY, button.x, button.y);
      if (dist <= config.buttonRadius + 10) {
        button.active = true;
        button.touchId = identifier;
        controls.activeTouches.set(identifier, button.id);
        
        // Trigger button action
        triggerButton(controls, button);
        
        // Haptic feedback
        if (config.enableHaptics && navigator.vibrate) {
          navigator.vibrate(20);
        }
        
        break;
      }
    }
  }
}

/**
 * Handle touch move
 */
export function handleTouchMove(controls, touches) {
  if (!controls.enabled) return;
  
  const config = TOUCH_CONFIG;
  
  for (const touch of touches) {
    const { identifier, clientX, clientY } = touch;
    
    // Update joystick
    if (controls.joystick.active && controls.joystick.touchId === identifier) {
      const dx = clientX - controls.joystick.baseX;
      const dy = clientY - controls.joystick.baseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Clamp to max distance
      const clampedDist = Math.min(dist, config.joystickMaxDistance);
      const angle = Math.atan2(dy, dx);
      
      controls.joystick.knobX = controls.joystick.baseX + Math.cos(angle) * clampedDist;
      controls.joystick.knobY = controls.joystick.baseY + Math.sin(angle) * clampedDist;
      
      // Normalized values
      controls.joystick.magnitude = clampedDist / config.joystickMaxDistance;
      controls.joystick.angle = angle;
      
      // Apply deadzone
      if (controls.joystick.magnitude < config.joystickDeadzone) {
        controls.joystick.dx = 0;
        controls.joystick.dy = 0;
        controls.joystick.magnitude = 0;
      } else {
        // Rescale past deadzone
        const rescaled = (controls.joystick.magnitude - config.joystickDeadzone) / 
          (1 - config.joystickDeadzone);
        
        controls.joystick.dx = Math.cos(angle) * rescaled;
        controls.joystick.dy = Math.sin(angle) * rescaled;
        controls.joystick.magnitude = rescaled;
      }
      
      // Callback
      if (controls.onMove) {
        controls.onMove(controls.joystick.dx, controls.joystick.dy);
      }
    }
  }
}

/**
 * Handle touch end
 */
export function handleTouchEnd(controls, touches) {
  if (!controls.enabled) return;
  
  for (const touch of touches) {
    const { identifier } = touch;
    
    // Release joystick
    if (controls.joystick.touchId === identifier) {
      controls.joystick.active = false;
      controls.joystick.touchId = null;
      controls.joystick.knobX = controls.joystick.baseX;
      controls.joystick.knobY = controls.joystick.baseY;
      controls.joystick.dx = 0;
      controls.joystick.dy = 0;
      controls.joystick.magnitude = 0;
      
      if (controls.onMove) {
        controls.onMove(0, 0);
      }
    }
    
    // Release buttons
    for (const button of Object.values(controls.buttons)) {
      if (button.touchId === identifier) {
        button.active = false;
        button.touchId = null;
      }
    }
    
    controls.activeTouches.delete(identifier);
  }
}

/**
 * Trigger button action
 */
function triggerButton(controls, button) {
  playUIClick();
  
  switch (button.id) {
    case 'attack':
      if (controls.onAttack) controls.onAttack();
      break;
    case 'dodge':
      if (controls.onDodge) controls.onDodge();
      break;
    case 'interact':
      if (controls.onInteract) controls.onInteract();
      break;
    case 'menu':
      if (controls.onMenu) controls.onMenu();
      break;
  }
}

// ========== Update ==========

/**
 * Update touch controls
 */
export function updateTouchControls(controls, delta) {
  // Update button cooldowns
  for (const button of Object.values(controls.buttons)) {
    if (button.cooldown > 0) {
      button.cooldown -= delta;
      if (button.cooldown <= 0) {
        button.cooldown = 0;
        button.enabled = true;
      }
    }
  }
}

/**
 * Set button cooldown
 */
export function setButtonCooldown(controls, buttonId, cooldownMs) {
  const button = controls.buttons[buttonId];
  if (button) {
    button.cooldown = cooldownMs;
    button.enabled = false;
  }
}

// ========== Rendering ==========

/**
 * Draw touch controls
 */
export function drawTouchControls(ctx, controls) {
  if (!controls.enabled) return;
  
  const config = TOUCH_CONFIG;
  
  // Draw joystick
  drawJoystick(ctx, controls.joystick, config);
  
  // Draw buttons
  for (const button of Object.values(controls.buttons)) {
    drawButton(ctx, button, config);
  }
}

/**
 * Draw joystick
 */
function drawJoystick(ctx, joystick, config) {
  const opacity = joystick.active ? config.activeOpacity : config.idleOpacity;
  
  ctx.globalAlpha = opacity;
  
  // Base circle
  ctx.fillStyle = config.joystickBg;
  ctx.beginPath();
  ctx.arc(joystick.baseX, joystick.baseY, config.joystickRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Direction indicator
  if (joystick.active && joystick.magnitude > 0) {
    ctx.strokeStyle = config.joystickActive;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(joystick.baseX, joystick.baseY);
    ctx.lineTo(joystick.knobX, joystick.knobY);
    ctx.stroke();
  }
  
  // Knob
  ctx.fillStyle = joystick.active ? config.joystickActive : config.joystickKnob;
  ctx.beginPath();
  ctx.arc(joystick.knobX, joystick.knobY, config.joystickKnobRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(joystick.baseX, joystick.baseY, config.joystickRadius, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.globalAlpha = 1;
}

/**
 * Draw button
 */
function drawButton(ctx, button, config) {
  const opacity = button.active ? config.activeOpacity : 
                  button.enabled ? config.idleOpacity : config.idleOpacity * 0.5;
  
  ctx.globalAlpha = opacity;
  
  // Background
  ctx.fillStyle = button.active ? config.buttonActive : config.buttonBg;
  ctx.beginPath();
  ctx.arc(button.x, button.y, config.buttonRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Border
  ctx.strokeStyle = config.buttonBorder;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Icon
  ctx.fillStyle = button.enabled ? '#ffffff' : '#666666';
  ctx.font = `${config.buttonRadius}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(button.icon, button.x, button.y);
  
  // Cooldown overlay
  if (!button.enabled && button.cooldown > 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.moveTo(button.x, button.y);
    const cooldownAngle = (button.cooldown / 1000) * Math.PI * 2;
    ctx.arc(button.x, button.y, config.buttonRadius, -Math.PI / 2, 
      -Math.PI / 2 + cooldownAngle, false);
    ctx.fill();
  }
  
  ctx.globalAlpha = 1;
}

// ========== Input Binding ==========

/**
 * Bind touch events to canvas
 */
export function bindTouchEvents(canvas, controls) {
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleTouchStart(controls, e.changedTouches);
  }, { passive: false });
  
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    handleTouchMove(controls, e.changedTouches);
  }, { passive: false });
  
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleTouchEnd(controls, e.changedTouches);
  }, { passive: false });
  
  canvas.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    handleTouchEnd(controls, e.changedTouches);
  }, { passive: false });
}

/**
 * Set movement callback
 */
export function onMovement(controls, callback) {
  controls.onMove = callback;
}

/**
 * Set attack callback
 */
export function onAttack(controls, callback) {
  controls.onAttack = callback;
}

/**
 * Set dodge callback
 */
export function onDodge(controls, callback) {
  controls.onDodge = callback;
}

/**
 * Set interact callback
 */
export function onInteract(controls, callback) {
  controls.onInteract = callback;
}

/**
 * Set menu callback
 */
export function onMenu(controls, callback) {
  controls.onMenu = callback;
}

/**
 * Get movement input from joystick
 */
export function getMovementInput(controls) {
  if (!controls.enabled || !controls.joystick.active) {
    return { x: 0, y: 0, magnitude: 0 };
  }
  
  return {
    x: controls.joystick.dx,
    y: controls.joystick.dy,
    magnitude: controls.joystick.magnitude,
  };
}

/**
 * Check if attack button is pressed
 */
export function isAttackPressed(controls) {
  return controls.enabled && controls.buttons.attack.active;
}

/**
 * Check if dodge button is pressed
 */
export function isDodgePressed(controls) {
  return controls.enabled && controls.buttons.dodge.active;
}

/**
 * Enable/disable touch controls
 */
export function setTouchControlsEnabled(controls, enabled) {
  controls.enabled = enabled;
}

export default {
  TOUCH_CONFIG,
  
  // State
  createTouchControls,
  initTouchLayout,
  
  // Events
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  bindTouchEvents,
  
  // Update
  updateTouchControls,
  setButtonCooldown,
  
  // Rendering
  drawTouchControls,
  
  // Callbacks
  onMovement,
  onAttack,
  onDodge,
  onInteract,
  onMenu,
  
  // Getters
  getMovementInput,
  isAttackPressed,
  isDodgePressed,
  
  // Control
  setTouchControlsEnabled,
};
