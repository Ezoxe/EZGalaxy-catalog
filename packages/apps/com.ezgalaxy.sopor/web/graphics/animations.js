/**
 * SOPOR - Animation System
 * Sprite animations, tweens, and visual effects
 */

import { clamp, lerp } from '../core/utils.js';

// ========== Animation Types ==========

export const ANIMATION_TYPE = {
  IDLE: 'idle',
  WALK: 'walk',
  RUN: 'run',
  ATTACK: 'attack',
  HURT: 'hurt',
  DEATH: 'death',
  DASH: 'dash',
  PARRY: 'parry',
  CAST: 'cast',
};

// ========== Easing Functions ==========

export const EASING = {
  linear: (t) => t,
  
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - (--t) * t * t * t,
  
  easeInElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
  },
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  },
  
  easeInBounce: (t) => 1 - EASING.easeOutBounce(1 - t),
  easeOutBounce: (t) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },
  
  // Shake - useful for hit effects
  shake: (t, intensity = 1) => {
    return Math.sin(t * Math.PI * 8) * (1 - t) * intensity;
  },
  
  // Pulse - useful for pickups
  pulse: (t) => {
    return Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  },
};

// ========== Sprite Animation ==========

/**
 * Animation frame data
 * @typedef {object} AnimationFrame
 * @property {number} x - Frame x in spritesheet
 * @property {number} y - Frame y in spritesheet
 * @property {number} duration - Frame duration in ms
 */

/**
 * Animation definition
 * @typedef {object} AnimationDef
 * @property {AnimationFrame[]} frames
 * @property {boolean} loop
 * @property {string} [next] - Next animation to play
 * @property {function} [onComplete] - Callback on completion
 */

/**
 * Create sprite animator
 */
export function createAnimator() {
  return {
    currentAnim: null,
    currentFrame: 0,
    frameTime: 0,
    isPlaying: false,
    animations: {},
    defaultAnim: ANIMATION_TYPE.IDLE,
    onFrameChange: null,
    onAnimComplete: null,
  };
}

/**
 * Register animation
 */
export function registerAnimation(animator, name, frames, options = {}) {
  animator.animations[name] = {
    frames,
    loop: options.loop !== false,
    next: options.next || null,
    frameDuration: options.frameDuration || 100,
    onComplete: options.onComplete || null,
  };
}

/**
 * Play animation
 */
export function playAnimation(animator, name, force = false) {
  if (!animator.animations[name]) {
    console.warn(`Animation not found: ${name}`);
    return false;
  }
  
  if (animator.currentAnim === name && animator.isPlaying && !force) {
    return false;
  }
  
  animator.currentAnim = name;
  animator.currentFrame = 0;
  animator.frameTime = 0;
  animator.isPlaying = true;
  
  if (animator.onFrameChange) {
    animator.onFrameChange(0, animator.animations[name].frames[0]);
  }
  
  return true;
}

/**
 * Update animator
 */
export function updateAnimator(animator, delta) {
  if (!animator.isPlaying || !animator.currentAnim) return;
  
  const anim = animator.animations[animator.currentAnim];
  if (!anim) return;
  
  animator.frameTime += delta;
  
  const frameDuration = anim.frames[animator.currentFrame]?.duration || anim.frameDuration;
  
  while (animator.frameTime >= frameDuration) {
    animator.frameTime -= frameDuration;
    animator.currentFrame++;
    
    if (animator.currentFrame >= anim.frames.length) {
      if (anim.loop) {
        animator.currentFrame = 0;
      } else {
        animator.isPlaying = false;
        animator.currentFrame = anim.frames.length - 1;
        
        if (anim.onComplete) {
          anim.onComplete();
        }
        
        if (animator.onAnimComplete) {
          animator.onAnimComplete(animator.currentAnim);
        }
        
        // Play next animation if specified
        if (anim.next) {
          playAnimation(animator, anim.next);
        }
        
        return;
      }
    }
    
    if (animator.onFrameChange) {
      animator.onFrameChange(animator.currentFrame, anim.frames[animator.currentFrame]);
    }
  }
}

/**
 * Get current frame data
 */
export function getCurrentFrame(animator) {
  if (!animator.currentAnim) return null;
  
  const anim = animator.animations[animator.currentAnim];
  if (!anim) return null;
  
  return anim.frames[animator.currentFrame];
}

// ========== Tween System ==========

/**
 * Tween state
 * @typedef {object} Tween
 * @property {object} target
 * @property {string} property
 * @property {number} startValue
 * @property {number} endValue
 * @property {number} duration
 * @property {number} elapsed
 * @property {function} easing
 * @property {boolean} isComplete
 * @property {function} [onUpdate]
 * @property {function} [onComplete]
 */

/**
 * Create tween manager
 */
export function createTweenManager() {
  return {
    tweens: [],
    activeTweens: new Map(),
  };
}

/**
 * Create a tween
 */
export function tween(manager, target, property, endValue, duration, options = {}) {
  const startValue = target[property];
  
  const tw = {
    id: `${Date.now()}_${Math.random()}`,
    target,
    property,
    startValue,
    endValue,
    duration,
    elapsed: 0,
    easing: options.easing || EASING.easeOutQuad,
    delay: options.delay || 0,
    isComplete: false,
    onUpdate: options.onUpdate || null,
    onComplete: options.onComplete || null,
  };
  
  manager.tweens.push(tw);
  
  // Track by target+property for easy cancellation
  const key = `${target.id || 'obj'}_${property}`;
  
  // Cancel existing tween on same property
  if (manager.activeTweens.has(key)) {
    const existing = manager.activeTweens.get(key);
    existing.isComplete = true;
  }
  
  manager.activeTweens.set(key, tw);
  
  return tw;
}

/**
 * Update all tweens
 */
export function updateTweens(manager, delta) {
  const completed = [];
  
  for (const tw of manager.tweens) {
    if (tw.isComplete) {
      completed.push(tw);
      continue;
    }
    
    // Handle delay
    if (tw.delay > 0) {
      tw.delay -= delta;
      continue;
    }
    
    tw.elapsed += delta;
    const t = clamp(tw.elapsed / tw.duration, 0, 1);
    const easedT = tw.easing(t);
    
    // Update value
    tw.target[tw.property] = lerp(tw.startValue, tw.endValue, easedT);
    
    if (tw.onUpdate) {
      tw.onUpdate(tw.target[tw.property], t);
    }
    
    // Check completion
    if (t >= 1) {
      tw.isComplete = true;
      tw.target[tw.property] = tw.endValue;
      
      if (tw.onComplete) {
        tw.onComplete();
      }
      
      completed.push(tw);
    }
  }
  
  // Remove completed tweens
  for (const tw of completed) {
    const idx = manager.tweens.indexOf(tw);
    if (idx !== -1) {
      manager.tweens.splice(idx, 1);
    }
    
    const key = `${tw.target.id || 'obj'}_${tw.property}`;
    if (manager.activeTweens.get(key) === tw) {
      manager.activeTweens.delete(key);
    }
  }
}

/**
 * Cancel all tweens for a target
 */
export function cancelTweens(manager, target) {
  for (const tw of manager.tweens) {
    if (tw.target === target) {
      tw.isComplete = true;
    }
  }
}

// ========== Effect Helpers ==========

/**
 * Flash effect (alpha pulse)
 */
export function flashEffect(manager, target, duration = 200, intensity = 1) {
  const originalAlpha = target.alpha ?? 1;
  
  tween(manager, target, 'alpha', intensity, duration / 2, {
    easing: EASING.easeOutQuad,
    onComplete: () => {
      tween(manager, target, 'alpha', originalAlpha, duration / 2, {
        easing: EASING.easeInQuad,
      });
    },
  });
}

/**
 * Shake effect
 */
export function shakeEffect(manager, target, duration = 300, intensity = 5) {
  const originalX = target.x;
  const originalY = target.y;
  const startTime = Date.now();
  
  const shake = {
    target,
    originalX,
    originalY,
    intensity,
    duration,
    elapsed: 0,
    isComplete: false,
  };
  
  manager.tweens.push({
    ...shake,
    update: (delta) => {
      shake.elapsed += delta;
      const t = shake.elapsed / duration;
      
      if (t >= 1) {
        target.x = originalX;
        target.y = originalY;
        return true;
      }
      
      const decay = 1 - t;
      target.x = originalX + EASING.shake(t, intensity * decay);
      target.y = originalY + EASING.shake(t + 0.25, intensity * decay * 0.5);
      
      return false;
    },
  });
}

/**
 * Scale pop effect
 */
export function scalePopEffect(manager, target, scale = 1.3, duration = 200) {
  const originalScale = target.scale ?? 1;
  
  tween(manager, target, 'scale', scale, duration / 2, {
    easing: EASING.easeOutQuad,
    onComplete: () => {
      tween(manager, target, 'scale', originalScale, duration / 2, {
        easing: EASING.easeOutElastic,
      });
    },
  });
}

/**
 * Fade in effect
 */
export function fadeIn(manager, target, duration = 300, startAlpha = 0) {
  target.alpha = startAlpha;
  return tween(manager, target, 'alpha', 1, duration, {
    easing: EASING.easeOutQuad,
  });
}

/**
 * Fade out effect
 */
export function fadeOut(manager, target, duration = 300, onComplete = null) {
  return tween(manager, target, 'alpha', 0, duration, {
    easing: EASING.easeInQuad,
    onComplete,
  });
}

/**
 * Move to effect
 */
export function moveTo(manager, target, x, y, duration = 500, easing = EASING.easeOutQuad) {
  tween(manager, target, 'x', x, duration, { easing });
  return tween(manager, target, 'y', y, duration, { easing });
}

// ========== Procedural Animations ==========

/**
 * Create walking bob animation
 */
export function createWalkBob(speed = 5, amplitude = 2) {
  return {
    time: 0,
    speed,
    amplitude,
    update(delta) {
      this.time += delta * 0.001 * speed;
      return Math.sin(this.time * Math.PI * 2) * amplitude;
    },
    reset() {
      this.time = 0;
    },
  };
}

/**
 * Create breathing animation
 */
export function createBreathingAnim(speed = 1, amplitude = 0.05) {
  return {
    time: 0,
    speed,
    amplitude,
    update(delta) {
      this.time += delta * 0.001 * speed;
      return 1 + Math.sin(this.time * Math.PI * 2) * amplitude;
    },
  };
}

/**
 * Create floating animation
 */
export function createFloatAnim(speed = 1, amplitude = 5) {
  return {
    time: 0,
    speed,
    amplitude,
    update(delta) {
      this.time += delta * 0.001 * speed;
      return Math.sin(this.time * Math.PI) * amplitude;
    },
  };
}

/**
 * Create rotation animation
 */
export function createSpinAnim(speed = 1) {
  return {
    angle: 0,
    speed,
    update(delta) {
      this.angle += delta * 0.001 * Math.PI * 2 * speed;
      this.angle %= Math.PI * 2;
      return this.angle;
    },
  };
}

// ========== Animation Presets ==========

/**
 * Create standard player animations
 */
export function createPlayerAnimations(animator, frameWidth = 32, frameHeight = 32) {
  // Idle - slight bobbing
  registerAnimation(animator, ANIMATION_TYPE.IDLE, [
    { x: 0, y: 0, duration: 500 },
    { x: 1, y: 0, duration: 500 },
  ], { loop: true });
  
  // Walk - 4 frame cycle
  registerAnimation(animator, ANIMATION_TYPE.WALK, [
    { x: 0, y: 1, duration: 150 },
    { x: 1, y: 1, duration: 150 },
    { x: 2, y: 1, duration: 150 },
    { x: 3, y: 1, duration: 150 },
  ], { loop: true });
  
  // Attack - quick swing
  registerAnimation(animator, ANIMATION_TYPE.ATTACK, [
    { x: 0, y: 2, duration: 50 },
    { x: 1, y: 2, duration: 100 },
    { x: 2, y: 2, duration: 100 },
    { x: 3, y: 2, duration: 50 },
  ], { loop: false, next: ANIMATION_TYPE.IDLE });
  
  // Hurt - flinch
  registerAnimation(animator, ANIMATION_TYPE.HURT, [
    { x: 0, y: 3, duration: 100 },
    { x: 1, y: 3, duration: 200 },
  ], { loop: false, next: ANIMATION_TYPE.IDLE });
  
  // Dash
  registerAnimation(animator, ANIMATION_TYPE.DASH, [
    { x: 0, y: 4, duration: 50 },
    { x: 1, y: 4, duration: 100 },
    { x: 2, y: 4, duration: 50 },
  ], { loop: false, next: ANIMATION_TYPE.IDLE });
  
  // Parry
  registerAnimation(animator, ANIMATION_TYPE.PARRY, [
    { x: 0, y: 5, duration: 100 },
    { x: 1, y: 5, duration: 200 },
  ], { loop: false, next: ANIMATION_TYPE.IDLE });
  
  // Death
  registerAnimation(animator, ANIMATION_TYPE.DEATH, [
    { x: 0, y: 6, duration: 100 },
    { x: 1, y: 6, duration: 100 },
    { x: 2, y: 6, duration: 100 },
    { x: 3, y: 6, duration: 500 },
  ], { loop: false });
}

/**
 * Create enemy animations
 */
export function createEnemyAnimations(animator, archetype) {
  // All enemies get basic animations
  registerAnimation(animator, ANIMATION_TYPE.IDLE, [
    { x: 0, y: 0, duration: 400 },
    { x: 1, y: 0, duration: 400 },
  ], { loop: true });
  
  registerAnimation(animator, ANIMATION_TYPE.WALK, [
    { x: 0, y: 1, duration: 200 },
    { x: 1, y: 1, duration: 200 },
    { x: 2, y: 1, duration: 200 },
    { x: 1, y: 1, duration: 200 },
  ], { loop: true });
  
  registerAnimation(animator, ANIMATION_TYPE.ATTACK, [
    { x: 0, y: 2, duration: 100 },
    { x: 1, y: 2, duration: 150 },
    { x: 2, y: 2, duration: 100 },
  ], { loop: false, next: ANIMATION_TYPE.IDLE });
  
  registerAnimation(animator, ANIMATION_TYPE.HURT, [
    { x: 0, y: 3, duration: 150 },
  ], { loop: false, next: ANIMATION_TYPE.IDLE });
  
  registerAnimation(animator, ANIMATION_TYPE.DEATH, [
    { x: 0, y: 4, duration: 100 },
    { x: 1, y: 4, duration: 100 },
    { x: 2, y: 4, duration: 300 },
  ], { loop: false });
}

export default {
  ANIMATION_TYPE,
  EASING,
  
  // Animator
  createAnimator,
  registerAnimation,
  playAnimation,
  updateAnimator,
  getCurrentFrame,
  
  // Tweens
  createTweenManager,
  tween,
  updateTweens,
  cancelTweens,
  
  // Effects
  flashEffect,
  shakeEffect,
  scalePopEffect,
  fadeIn,
  fadeOut,
  moveTo,
  
  // Procedural
  createWalkBob,
  createBreathingAnim,
  createFloatAnim,
  createSpinAnim,
  
  // Presets
  createPlayerAnimations,
  createEnemyAnimations,
};
