/**
 * SOPOR - Sound Effects System
 * Procedural SFX generation using Web Audio API
 */

import { clamp, randomBetween } from '../core/utils.js';
import { initAudio, getAudioContext } from './music.js';

// ========== SFX Categories ==========

export const SFX_CATEGORY = {
  COMBAT: 'combat',
  UI: 'ui',
  PLAYER: 'player',
  ENEMY: 'enemy',
  ENVIRONMENT: 'environment',
  ITEM: 'item',
};

// ========== SFX Gain ==========

let sfxGain = null;
let sfxVolume = 0.7;

/**
 * Initialize SFX channel
 */
export function initSfx() {
  const ctx = getAudioContext() || initAudio();
  if (!ctx) return null;
  
  if (!sfxGain) {
    sfxGain = ctx.createGain();
    sfxGain.gain.value = sfxVolume;
    sfxGain.connect(ctx.destination);
  }
  
  return sfxGain;
}

/**
 * Set SFX volume
 */
export function setSfxVolume(volume) {
  sfxVolume = clamp(volume, 0, 1);
  if (sfxGain) {
    const ctx = getAudioContext();
    if (ctx) {
      sfxGain.gain.setTargetAtTime(sfxVolume, ctx.currentTime, 0.1);
    }
  }
}

// ========== Combat SFX ==========

/**
 * Play hit/impact sound
 */
export function playHitSound(intensity = 1, metallic = false) {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  // Impact noise
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    const decay = Math.pow(1 - i / bufferSize, 3);
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  // Filter for character
  const filter = ctx.createBiquadFilter();
  filter.type = metallic ? 'bandpass' : 'lowpass';
  filter.frequency.value = metallic ? 2500 : 800;
  filter.Q.value = metallic ? 5 : 1;
  
  // Gain
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5 * intensity, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  
  noise.start(now);
  
  // Add metallic ring
  if (metallic) {
    const ring = ctx.createOscillator();
    ring.type = 'sine';
    ring.frequency.value = 800 + Math.random() * 400;
    
    const ringGain = ctx.createGain();
    ringGain.gain.setValueAtTime(0.1 * intensity, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    ring.connect(ringGain);
    ringGain.connect(sfxGain);
    ring.start(now);
    ring.stop(now + 0.3);
  }
}

/**
 * Play sword slash sound
 */
export function playSlashSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  // Whoosh noise
  const bufferSize = ctx.sampleRate * 0.2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    const envelope = Math.sin(t * Math.PI);
    data[i] = (Math.random() * 2 - 1) * envelope * 0.5;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.Q.value = 2;
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  
  noise.start(now);
}

/**
 * Play projectile sound
 */
export function playProjectileSound(type = 'bullet') {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  if (type === 'bullet') {
    // Sharp attack
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'energy') {
    // Plasma/energy shot
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'arrow') {
    // Twang + whoosh
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }
}

/**
 * Play parry sound
 */
export function playParrySound(perfect = false) {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  // Metallic clang
  const osc1 = ctx.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.value = perfect ? 600 : 400;
  
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = perfect ? 900 : 700;
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(perfect ? 0.4 : 0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + (perfect ? 0.5 : 0.3));
  
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(sfxGain);
  
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.5);
  osc2.stop(now + 0.5);
  
  // Perfect parry sparkle
  if (perfect) {
    setTimeout(() => {
      const sparkle = ctx.createOscillator();
      sparkle.type = 'sine';
      sparkle.frequency.setValueAtTime(1200, ctx.currentTime);
      sparkle.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.1);
      
      const sGain = ctx.createGain();
      sGain.gain.setValueAtTime(0.15, ctx.currentTime);
      sGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      
      sparkle.connect(sGain);
      sGain.connect(sfxGain);
      sparkle.start(ctx.currentTime);
      sparkle.stop(ctx.currentTime + 0.2);
    }, 50);
  }
}

/**
 * Play combo counter sound
 */
export function playComboSound(comboLevel) {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  // Rising pitch based on combo
  const baseFreq = 300 + comboLevel * 50;
  
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.1);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start(now);
  osc.stop(now + 0.2);
}

// ========== Status Effect SFX ==========

/**
 * Play burn/fire tick sound
 */
export function playBurnSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  // Crackle noise
  const bufferSize = ctx.sampleRate * 0.1;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() > 0.9 ? (Math.random() * 2 - 1) * 0.5 : 0;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  noise.start(now);
}

/**
 * Play poison tick sound
 */
export function playPoisonSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start(now);
  osc.stop(now + 0.15);
}

/**
 * Play freeze/ice sound
 */
export function playFreezeSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  // Crystal shimmer
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 800 + i * 400;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now + i * 0.05);
    gain.gain.linearRampToValueAtTime(0.08, now + i * 0.05 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now + i * 0.05);
    osc.stop(now + 0.3);
  }
}

/**
 * Play bleed tick sound
 */
export function playBleedSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  // Wet drip
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start(now);
  osc.stop(now + 0.1);
}

// ========== Player SFX ==========

/**
 * Play footstep sound
 */
export function playFootstep(surface = 'stone') {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  const bufferSize = ctx.sampleRate * 0.08;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    const decay = Math.pow(1 - i / bufferSize, 2);
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  
  switch (surface) {
    case 'grass':
      filter.frequency.value = 1200;
      break;
    case 'metal':
      filter.frequency.value = 3000;
      break;
    case 'water':
      filter.frequency.value = 800;
      break;
    default: // stone
      filter.frequency.value = 1500;
  }
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  noise.start(now);
}

/**
 * Play dash sound
 */
export function playDashSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  // Quick whoosh
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    const envelope = Math.sin(t * Math.PI);
    data[i] = (Math.random() * 2 - 1) * envelope;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1500;
  filter.Q.value = 1;
  
  // Frequency sweep
  filter.frequency.setValueAtTime(1000, now);
  filter.frequency.exponentialRampToValueAtTime(2500, now + 0.15);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  noise.start(now);
}

/**
 * Play heal sound
 */
export function playHealSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  // Chime arpeggio
  const notes = [0, 4, 7, 12];
  
  notes.forEach((note, i) => {
    const freq = 440 * Math.pow(2, note / 12);
    
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
    
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.4);
  });
}

/**
 * Play level up sound
 */
export function playLevelUpSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  // Triumphant fanfare
  const notes = [
    { freq: 262, time: 0 },      // C4
    { freq: 330, time: 0.1 },    // E4
    { freq: 392, time: 0.2 },    // G4
    { freq: 523, time: 0.35 },   // C5
  ];
  
  notes.forEach(({ freq, time }) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now + time);
    gain.gain.linearRampToValueAtTime(0.2, now + time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.5);
    
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now + time);
    osc.stop(now + time + 0.5);
  });
}

/**
 * Play death sound
 */
export function playDeathSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  // Descending tone
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 1);
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + 1);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  osc.start(now);
  osc.stop(now + 1);
}

// ========== UI SFX ==========

/**
 * Play UI click
 */
export function playUIClick() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 800;
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start(now);
  osc.stop(now + 0.05);
}

/**
 * Play UI hover
 */
export function playUIHover() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 600;
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start(now);
  osc.stop(now + 0.03);
}

/**
 * Play menu open
 */
export function playMenuOpen() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start(now);
  osc.stop(now + 0.15);
}

/**
 * Play menu close
 */
export function playMenuClose() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start(now);
  osc.stop(now + 0.15);
}

/**
 * Play notification sound
 */
export function playNotification() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 880;
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start(now);
  osc.stop(now + 0.3);
}

// ========== Item SFX ==========

/**
 * Play item pickup sound
 */
export function playItemPickup(rarity = 'common') {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  const baseFreq = {
    common: 400,
    uncommon: 500,
    rare: 600,
    epic: 700,
    legendary: 800,
  }[rarity] || 400;
  
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.1);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start(now);
  osc.stop(now + 0.2);
}

/**
 * Play chest open sound
 */
export function playChestOpen() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  // Creak + sparkle
  const creakNoise = ctx.createBufferSource();
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.5);
  }
  
  creakNoise.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 600;
  filter.Q.value = 3;
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  
  creakNoise.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  creakNoise.start(now);
  
  // Sparkle
  setTimeout(() => {
    for (let i = 0; i < 3; i++) {
      const sparkle = ctx.createOscillator();
      sparkle.type = 'sine';
      sparkle.frequency.value = 1000 + i * 300;
      
      const sGain = ctx.createGain();
      sGain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.05);
      sGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + 0.2);
      
      sparkle.connect(sGain);
      sGain.connect(sfxGain);
      sparkle.start(ctx.currentTime + i * 0.05);
      sparkle.stop(ctx.currentTime + i * 0.05 + 0.2);
    }
  }, 150);
}

// ========== Environment SFX ==========

/**
 * Play ambient wind
 */
export function playAmbientWind(duration = 5) {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  // Brown noise for wind
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + (0.02 * white)) / 1.02;
    data[i] = lastOut * 3;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  
  // Modulate filter for gusts
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.2;
  
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 200;
  
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.5);
  gain.gain.linearRampToValueAtTime(0.06, now + duration - 0.5);
  gain.gain.linearRampToValueAtTime(0, now + duration);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  
  lfo.start(now);
  noise.start(now);
  lfo.stop(now + duration);
}

/**
 * Play door open/close
 */
export function playDoor(open = true) {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  initSfx();
  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  
  if (open) {
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
  } else {
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
  }
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  osc.start(now);
  osc.stop(now + 0.3);
}

export default {
  // Core
  SFX_CATEGORY,
  initSfx,
  setSfxVolume,
  
  // Combat
  playHitSound,
  playSlashSound,
  playProjectileSound,
  playParrySound,
  playComboSound,
  
  // Status
  playBurnSound,
  playPoisonSound,
  playFreezeSound,
  playBleedSound,
  
  // Player
  playFootstep,
  playDashSound,
  playHealSound,
  playLevelUpSound,
  playDeathSound,
  
  // UI
  playUIClick,
  playUIHover,
  playMenuOpen,
  playMenuClose,
  playNotification,
  
  // Items
  playItemPickup,
  playChestOpen,
  
  // Environment
  playAmbientWind,
  playDoor,
};
