/**
 * SOPOR - Audio System - Music
 * Procedural music generation using Web Audio API
 */

// ========== Audio Context ==========

let audioContext = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;

/**
 * Initialize audio system
 */
export function initAudio() {
  if (audioContext) return audioContext;
  
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create master gain
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = 0.7;
    
    // Create music channel
    musicGain = audioContext.createGain();
    musicGain.connect(masterGain);
    musicGain.gain.value = 0.5;
    
    // Create SFX channel
    sfxGain = audioContext.createGain();
    sfxGain.connect(masterGain);
    sfxGain.gain.value = 0.7;
    
    return audioContext;
  } catch (e) {
    console.warn('Web Audio API not supported:', e);
    return null;
  }
}

/**
 * Resume audio context (required after user interaction)
 */
export async function resumeAudio() {
  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume();
  }
}

/**
 * Get audio context
 */
export function getAudioContext() {
  return audioContext;
}

/**
 * Set master volume
 */
export function setMasterVolume(volume) {
  if (masterGain) {
    masterGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.1);
  }
}

/**
 * Set music volume
 */
export function setMusicVolume(volume) {
  if (musicGain) {
    musicGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.1);
  }
}

/**
 * Set SFX volume
 */
export function setSfxVolume(volume) {
  if (sfxGain) {
    sfxGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.1);
  }
}

// ========== Musical Scales ==========

/**
 * Musical scales (in semitones from root)
 */
export const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  pentatonic_minor: [0, 3, 5, 7, 10],
  pentatonic_major: [0, 2, 4, 7, 9],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  melodic_minor: [0, 2, 3, 5, 7, 9, 11],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

/**
 * Convert MIDI note to frequency
 */
export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Get note in scale
 */
export function getNoteInScale(root, scale, degree, octave = 0) {
  const scaleNotes = SCALES[scale] || SCALES.minor;
  const idx = ((degree % scaleNotes.length) + scaleNotes.length) % scaleNotes.length;
  const octaveOffset = Math.floor(degree / scaleNotes.length);
  return root + scaleNotes[idx] + (octave + octaveOffset) * 12;
}

// ========== Biome Music Configurations ==========

export const BIOME_MUSIC = {
  jardin: {
    root: 60, // C4
    scale: 'dorian',
    tempo: 80,
    mood: 'mysterious',
    instruments: ['pad', 'bells', 'bass'],
    patterns: {
      pad: [0, 2, 4, 2],
      bells: [0, -1, 2, -1, 4, -1, 2, -1],
      bass: [0, 0, -1, 0, 4, 4, -1, 0],
    },
    reverb: 0.6,
    filter: 2000,
  },
  forge: {
    root: 55, // G3
    scale: 'phrygian',
    tempo: 100,
    mood: 'intense',
    instruments: ['synth', 'percussion', 'bass'],
    patterns: {
      synth: [0, 2, 0, 4, 0, 2, 5, 4],
      percussion: [1, 0, 1, 0, 1, 0, 1, 1],
      bass: [0, 0, 0, 0, 4, 4, 4, 4],
    },
    reverb: 0.3,
    filter: 3500,
  },
  abime: {
    root: 48, // C3
    scale: 'harmonic_minor',
    tempo: 65,
    mood: 'ethereal',
    instruments: ['strings', 'bells', 'choir'],
    patterns: {
      strings: [0, -1, 2, -1, 4, -1, 5, -1],
      bells: [4, -1, -1, -1, 7, -1, -1, -1],
      choir: [0, 0, 0, 0, -1, -1, -1, -1],
    },
    reverb: 0.8,
    filter: 1500,
  },
  nexus: {
    root: 52, // E3
    scale: 'blues',
    tempo: 90,
    mood: 'dark',
    instruments: ['synth', 'noise', 'bass'],
    patterns: {
      synth: [0, 3, 5, 3, 6, 5, 3, 0],
      noise: [1, 0, 0, 1, 0, 0, 1, 0],
      bass: [0, -1, -1, 0, -1, -1, 0, -1],
    },
    reverb: 0.5,
    filter: 2500,
  },
  boss: {
    root: 45, // A2
    scale: 'phrygian',
    tempo: 130,
    mood: 'epic',
    instruments: ['synth', 'percussion', 'bass', 'strings'],
    patterns: {
      synth: [0, 0, 4, 4, 5, 5, 4, -1],
      percussion: [1, 0, 1, 0, 1, 1, 1, 0],
      bass: [0, 0, 0, 0, 0, 0, 4, 4],
      strings: [0, -1, 2, -1, 4, -1, 5, -1],
    },
    reverb: 0.4,
    filter: 4000,
  },
  menu: {
    root: 62, // D4
    scale: 'pentatonic_minor',
    tempo: 70,
    mood: 'calm',
    instruments: ['pad', 'bells'],
    patterns: {
      pad: [0, -1, 2, -1],
      bells: [4, -1, -1, 2, -1, -1, 4, -1],
    },
    reverb: 0.7,
    filter: 1800,
  },
};

// ========== Synthesizer Instruments ==========

/**
 * Create oscillator with envelope
 */
function createOscillator(ctx, type, freq, gainNode) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gainNode);
  return osc;
}

/**
 * Create simple pad sound
 */
export function createPadVoice(ctx, freq, destination, duration = 2) {
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  
  filter.type = 'lowpass';
  filter.frequency.value = 1500;
  filter.Q.value = 1;
  
  const osc1 = createOscillator(ctx, 'sine', freq, filter);
  const osc2 = createOscillator(ctx, 'triangle', freq * 0.5, filter);
  
  filter.connect(gain);
  gain.connect(destination);
  
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
  gain.gain.linearRampToValueAtTime(0.1, now + duration * 0.5);
  gain.gain.linearRampToValueAtTime(0, now + duration);
  
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
  
  return { gain, osc1, osc2, filter };
}

/**
 * Create bell/chime sound
 */
export function createBellVoice(ctx, freq, destination, duration = 1.5) {
  const gain = ctx.createGain();
  
  const osc1 = createOscillator(ctx, 'sine', freq, gain);
  const osc2 = createOscillator(ctx, 'sine', freq * 2.01, gain);
  const osc3 = createOscillator(ctx, 'sine', freq * 3.02, gain);
  
  gain.connect(destination);
  
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  
  osc1.start(now);
  osc2.start(now);
  osc3.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
  osc3.stop(now + duration);
  
  return { gain, osc1, osc2, osc3 };
}

/**
 * Create bass sound
 */
export function createBassVoice(ctx, freq, destination, duration = 0.5) {
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  
  const osc = createOscillator(ctx, 'sawtooth', freq, filter);
  
  filter.connect(gain);
  gain.connect(destination);
  
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
  
  osc.start(now);
  osc.stop(now + duration);
  
  return { gain, osc, filter };
}

/**
 * Create synth lead sound
 */
export function createSynthVoice(ctx, freq, destination, duration = 0.4) {
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  
  filter.type = 'lowpass';
  filter.frequency.value = 2000;
  filter.Q.value = 2;
  
  const osc1 = createOscillator(ctx, 'sawtooth', freq, filter);
  const osc2 = createOscillator(ctx, 'square', freq * 1.005, filter);
  
  filter.connect(gain);
  gain.connect(destination);
  
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
  gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
  gain.gain.linearRampToValueAtTime(0, now + duration);
  
  // Filter envelope
  filter.frequency.setValueAtTime(3000, now);
  filter.frequency.exponentialRampToValueAtTime(800, now + duration * 0.5);
  
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
  
  return { gain, osc1, osc2, filter };
}

/**
 * Create strings/choir sound
 */
export function createStringsVoice(ctx, freq, destination, duration = 3) {
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  
  filter.type = 'lowpass';
  filter.frequency.value = 2500;
  
  // Multiple detuned oscillators for strings
  const oscs = [];
  for (let i = 0; i < 4; i++) {
    const detune = (i - 1.5) * 5;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(filter);
    oscs.push(osc);
  }
  
  filter.connect(gain);
  gain.connect(destination);
  
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.5);
  gain.gain.linearRampToValueAtTime(0.06, now + duration * 0.7);
  gain.gain.linearRampToValueAtTime(0, now + duration);
  
  for (const osc of oscs) {
    osc.start(now);
    osc.stop(now + duration);
  }
  
  return { gain, oscs, filter };
}

/**
 * Create noise percussion
 */
export function createNoiseVoice(ctx, destination, duration = 0.1) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  
  filter.type = 'highpass';
  filter.frequency.value = 1000;
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  
  noise.start(now);
  
  return { noise, gain, filter };
}

// ========== Music Sequencer ==========

/**
 * Create music sequencer
 */
export function createSequencer() {
  return {
    playing: false,
    config: null,
    stepIndex: 0,
    lastStepTime: 0,
    stepDuration: 500,
    voices: [],
    effects: {
      reverb: null,
      delay: null,
      filter: null,
    },
  };
}

/**
 * Setup effects chain
 */
function setupEffects(ctx, sequencer, reverbAmount, filterFreq) {
  // Create reverb (simple delay-based)
  const delay = ctx.createDelay();
  delay.delayTime.value = 0.3;
  
  const feedback = ctx.createGain();
  feedback.gain.value = reverbAmount * 0.5;
  
  delay.connect(feedback);
  feedback.connect(delay);
  
  // Master filter
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = 0.5;
  
  sequencer.effects = {
    delay,
    feedback,
    filter,
  };
  
  return { delay, filter };
}

/**
 * Start music
 */
export function startMusic(sequencer, biomeKey) {
  if (!audioContext) initAudio();
  if (!audioContext) return;
  
  const config = BIOME_MUSIC[biomeKey] || BIOME_MUSIC.menu;
  
  stopMusic(sequencer);
  
  sequencer.config = config;
  sequencer.stepDuration = (60 / config.tempo) * 1000 / 2; // 8th notes
  sequencer.stepIndex = 0;
  sequencer.lastStepTime = performance.now();
  sequencer.playing = true;
  
  // Setup effects
  const { delay, filter } = setupEffects(
    audioContext, 
    sequencer, 
    config.reverb, 
    config.filter
  );
  
  filter.connect(musicGain);
  delay.connect(musicGain);
}

/**
 * Update sequencer (call in game loop)
 */
export function updateMusic(sequencer, now) {
  if (!sequencer.playing || !sequencer.config || !audioContext) return;
  
  const elapsed = now - sequencer.lastStepTime;
  
  if (elapsed >= sequencer.stepDuration) {
    sequencer.lastStepTime = now;
    playStep(sequencer);
    sequencer.stepIndex++;
  }
}

/**
 * Play current step
 */
function playStep(sequencer) {
  const { config, stepIndex, effects } = sequencer;
  
  for (const instrument of config.instruments) {
    const pattern = config.patterns[instrument];
    if (!pattern) continue;
    
    const patternIndex = stepIndex % pattern.length;
    const note = pattern[patternIndex];
    
    if (note === -1) continue; // Rest
    
    const freq = midiToFreq(getNoteInScale(config.root, config.scale, note));
    
    // Choose voice based on instrument
    let voice;
    switch (instrument) {
      case 'pad':
        voice = createPadVoice(audioContext, freq, effects.filter, sequencer.stepDuration * 4 / 1000);
        break;
      case 'bells':
        voice = createBellVoice(audioContext, freq * 2, effects.filter, sequencer.stepDuration * 2 / 1000);
        break;
      case 'bass':
        voice = createBassVoice(audioContext, freq / 2, effects.filter, sequencer.stepDuration / 1000);
        break;
      case 'synth':
        voice = createSynthVoice(audioContext, freq, effects.filter, sequencer.stepDuration / 1000);
        break;
      case 'strings':
      case 'choir':
        voice = createStringsVoice(audioContext, freq, effects.filter, sequencer.stepDuration * 4 / 1000);
        break;
      case 'percussion':
      case 'noise':
        if (note > 0) {
          voice = createNoiseVoice(audioContext, effects.filter, 0.1);
        }
        break;
    }
    
    if (voice) {
      sequencer.voices.push(voice);
    }
  }
  
  // Clean up old voices
  sequencer.voices = sequencer.voices.filter(v => v.gain && v.gain.gain.value > 0.001);
}

/**
 * Stop music
 */
export function stopMusic(sequencer) {
  sequencer.playing = false;
  sequencer.config = null;
  
  // Fade out all voices
  if (audioContext) {
    const now = audioContext.currentTime;
    for (const voice of sequencer.voices) {
      if (voice.gain) {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
        voice.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      }
    }
  }
  
  sequencer.voices = [];
}

/**
 * Cross-fade to new biome music
 */
export function crossfadeMusic(sequencer, newBiome, duration = 2000) {
  if (!sequencer.playing) {
    startMusic(sequencer, newBiome);
    return;
  }
  
  // Fade out current
  const originalVolume = musicGain.gain.value;
  musicGain.gain.setTargetAtTime(0, audioContext.currentTime, duration / 3000);
  
  setTimeout(() => {
    stopMusic(sequencer);
    startMusic(sequencer, newBiome);
    musicGain.gain.setTargetAtTime(originalVolume, audioContext.currentTime, duration / 3000);
  }, duration / 2);
}

export default {
  // Core
  initAudio,
  resumeAudio,
  getAudioContext,
  setMasterVolume,
  setMusicVolume,
  setSfxVolume,
  
  // Scales
  SCALES,
  midiToFreq,
  getNoteInScale,
  
  // Biome configs
  BIOME_MUSIC,
  
  // Voices
  createPadVoice,
  createBellVoice,
  createBassVoice,
  createSynthVoice,
  createStringsVoice,
  createNoiseVoice,
  
  // Sequencer
  createSequencer,
  startMusic,
  updateMusic,
  stopMusic,
  crossfadeMusic,
};
