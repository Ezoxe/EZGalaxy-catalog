(() => {
  'use strict';

  /* ── Storage ── */
  const STORE = window.ezgalaxy ? ezgalaxy.storage : null;
  async function load(k, d) {
    try { if (STORE) { const v = await STORE.getData(k); return v ?? d; } } catch(_){}
    try { return JSON.parse(localStorage.getItem('ss_' + k)) || d; } catch(_){ return d; }
  }
  async function save(k, v) {
    try { if (STORE) return await STORE.setData(k, v); } catch(_){}
    localStorage.setItem('ss_' + k, JSON.stringify(v));
  }

  /* ── Sound channel definitions ── */
  const CHANNEL_DEFS = [
    { id: 'rain',      icon: '🌧️', name: 'Pluie',       type: 'noise', color: 'pink' },
    { id: 'thunder',   icon: '⛈️', name: 'Tonnerre',    type: 'rumble', freq: 40 },
    { id: 'wind',      icon: '💨', name: 'Vent',        type: 'noise', color: 'brown' },
    { id: 'waves',     icon: '🌊', name: 'Vagues',      type: 'wave',  freq: 0.12 },
    { id: 'fire',      icon: '🔥', name: 'Feu de camp', type: 'crackle' },
    { id: 'birds',     icon: '🐦', name: 'Oiseaux',     type: 'chirp' },
    { id: 'night',     icon: '🦗', name: 'Nuit',        type: 'crickets' },
    { id: 'forest',    icon: '🌲', name: 'Forêt',       type: 'noise', color: 'green' },
    { id: 'cafe',      icon: '☕', name: 'Café',        type: 'murmur' },
    { id: 'keyboard',  icon: '⌨️', name: 'Clavier',     type: 'clicks' },
    { id: 'whitenoise',icon: '📻', name: 'Bruit blanc', type: 'noise', color: 'white' },
    { id: 'stream',    icon: '🏞️', name: 'Ruisseau',    type: 'stream' }
  ];

  /* ── Audio context (lazy init) ── */
  let audioCtx    = null;
  let masterGain  = null;
  let analyser    = null;
  let channels    = {};    // { id: { gain, source, active, volume } }
  let isPlaying   = false;

  function initAudio() {
    if (audioCtx) return;
    audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    analyser   = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    masterGain.connect(analyser);
    analyser.connect(audioCtx.destination);
    masterGain.gain.value = 0.7;
  }

  /* ── Noise generators ── */
  function createNoise(color) {
    const bufSize = audioCtx.sampleRate * 2;
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data = buf.getChannelData(0);

    if (color === 'white') {
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    } else if (color === 'pink') {
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for (let i = 0; i < bufSize; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
        b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
        b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
        data[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else if (color === 'brown') {
      let last = 0;
      for (let i = 0; i < bufSize; i++) {
        const w = Math.random() * 2 - 1;
        data[i] = (last + (0.02 * w)) / 1.02;
        last = data[i]; data[i] *= 3.5;
      }
    } else { // green – filtered brown/pink mix
      let last = 0;
      for (let i = 0; i < bufSize; i++) {
        const w = Math.random() * 2 - 1;
        data[i] = (last + 0.03 * w) / 1.03;
        last = data[i]; data[i] *= 2.5;
      }
    }

    const src = audioCtx.createBufferSource();
    src.buffer = buf; src.loop = true;
    return src;
  }

  function createRumble(freq) {
    // Low frequency oscillator + noise
    const osc = audioCtx.createOscillator();
    osc.type = 'sine'; osc.frequency.value = freq || 40;
    const lfo = audioCtx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 0.15;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 0.5;
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
    lfo.start();
    return osc;
  }

  function createWave(freq) {
    // Modulated noise for ocean waves
    const noise = createNoise('brown');
    const lfo = audioCtx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = freq || 0.12;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 0.4;
    const modGain = audioCtx.createGain();
    modGain.gain.value = 0.6;
    lfo.connect(lfoGain); lfoGain.connect(modGain.gain);
    noise.connect(modGain);
    lfo.start();
    noise.start();
    return { node: modGain, extras: [noise, lfo] };
  }

  function createCrackle() {
    // Fire crackle: bursts of filtered noise
    const bufSize = audioCtx.sampleRate * 2;
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() < 0.02 ? (Math.random() * 2 - 1) * 0.8 : (Math.random() * 2 - 1) * 0.03;
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 800;
    src.connect(hp);
    src.start();
    return { node: hp, extras: [src] };
  }

  function createChirp() {
    // Bird-like: modulated high sine
    const osc = audioCtx.createOscillator();
    osc.type = 'sine'; osc.frequency.value = 2200;
    const lfo = audioCtx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 5;
    const lfoG = audioCtx.createGain(); lfoG.gain.value = 400;
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    const ampLfo = audioCtx.createOscillator();
    ampLfo.type = 'sine'; ampLfo.frequency.value = 0.4;
    const ampG = audioCtx.createGain(); ampG.gain.value = 0.5;
    const mainG = audioCtx.createGain(); mainG.gain.value = 0.5;
    ampLfo.connect(ampG); ampG.connect(mainG.gain);
    osc.connect(mainG);
    lfo.start(); ampLfo.start();
    return { node: mainG, src: osc, extras: [lfo, ampLfo] };
  }

  function createCrickets() {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine'; osc.frequency.value = 4400;
    const lfo = audioCtx.createOscillator();
    lfo.type = 'square'; lfo.frequency.value = 12;
    const lg = audioCtx.createGain(); lg.gain.value = 1;
    lfo.connect(lg); lg.connect(osc.frequency);
    const ampLfo = audioCtx.createOscillator();
    ampLfo.type = 'sine'; ampLfo.frequency.value = 0.3;
    const ag = audioCtx.createGain(); ag.gain.value = 0.5;
    const mg = audioCtx.createGain(); mg.gain.value = 0.5;
    ampLfo.connect(ag); ag.connect(mg.gain);
    osc.connect(mg);
    lfo.start(); ampLfo.start();
    return { node: mg, src: osc, extras: [lfo, ampLfo] };
  }

  function createMurmur() {
    const noise = createNoise('pink');
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 0.8;
    noise.connect(bp); noise.start();
    return { node: bp, extras: [noise] };
  }

  function createClicks() {
    const bufSize = audioCtx.sampleRate * 2;
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() < 0.005 ? (Math.random() * 2 - 1) : 0;
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 2000;
    src.connect(hp); src.start();
    return { node: hp, extras: [src] };
  }

  function createStream() {
    const noise = createNoise('white');
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 1.5;
    const lfo = audioCtx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 0.25;
    const lg = audioCtx.createGain(); lg.gain.value = 200;
    lfo.connect(lg); lg.connect(bp.frequency);
    noise.connect(bp); noise.start(); lfo.start();
    return { node: bp, extras: [noise, lfo] };
  }

  /* ── Build channel source ── */
  function buildSource(def) {
    let src, node, extras = [];
    switch (def.type) {
      case 'noise':
        src = createNoise(def.color);
        node = src; src.start();
        break;
      case 'rumble': {
        const o = createRumble(def.freq);
        src = o; node = o; o.start();
        break;
      }
      case 'wave': {
        const w = createWave(def.freq);
        node = w.node; extras = w.extras;
        break;
      }
      case 'crackle': {
        const c = createCrackle();
        node = c.node; extras = c.extras;
        break;
      }
      case 'chirp': {
        const ch = createChirp();
        node = ch.node; if (ch.src) ch.src.start(); extras = ch.extras;
        break;
      }
      case 'crickets': {
        const cr = createCrickets();
        node = cr.node; if (cr.src) cr.src.start(); extras = cr.extras;
        break;
      }
      case 'murmur': {
        const m = createMurmur();
        node = m.node; extras = m.extras;
        break;
      }
      case 'clicks': {
        const cl = createClicks();
        node = cl.node; extras = cl.extras;
        break;
      }
      case 'stream': {
        const s = createStream();
        node = s.node; extras = s.extras;
        break;
      }
    }
    return { node, extras };
  }

  /* ── Toggle channel ── */
  function toggleChannel(id) {
    initAudio();
    const ch = channels[id];
    if (ch.active) {
      stopChannel(ch);
    } else {
      startChannel(ch);
    }
    ch.active = !ch.active;
    updateUI();
  }

  function startChannel(ch) {
    const built = buildSource(ch.def);
    const gain = audioCtx.createGain();
    gain.gain.value = ch.volume;
    built.node.connect(gain);
    gain.connect(masterGain);
    ch.gainNode = gain;
    ch.sourceNode = built.node;
    ch.extras = built.extras || [];
  }

  function stopChannel(ch) {
    try {
      if (ch.sourceNode) { ch.sourceNode.disconnect(); try { ch.sourceNode.stop(); } catch(_){} }
      if (ch.gainNode) ch.gainNode.disconnect();
      (ch.extras || []).forEach(e => { try { e.disconnect(); e.stop(); } catch(_){} });
    } catch(_){}
    ch.sourceNode = null; ch.gainNode = null; ch.extras = [];
  }

  /* ── State ── */
  let presets    = [];
  let sleepTimer = 0;
  let sleepEnd   = 0;
  let sleepHandle = 0;

  /* ── DOM ── */
  const $ = s => document.querySelector(s);

  /* ── Init ── */
  async function init() {
    // Init channel state
    CHANNEL_DEFS.forEach(d => {
      channels[d.id] = { def: d, active: false, volume: 0.5, gainNode: null, sourceNode: null, extras: [] };
    });
    presets = await load('presets', []);
    const settings = await load('settings', {});
    if (settings.masterVol !== undefined) {
      $('#master-volume').value = settings.masterVol;
      $('#master-val').textContent = settings.masterVol + '%';
    }
    renderChannels();
    renderPresets();
    bindEvents();
    animateVisualizer();
  }

  /* ── Render channels ── */
  function renderChannels() {
    const grid = $('#channels');
    grid.innerHTML = CHANNEL_DEFS.map(d => {
      const ch = channels[d.id];
      return `<div class="channel-card ${ch.active ? 'active' : ''}" data-id="${d.id}">
        <span class="channel-icon">${d.icon}</span>
        <span class="channel-name">${d.name}</span>
        <input type="range" class="slider channel-slider" min="0" max="100" value="${Math.round(ch.volume * 100)}" data-ch="${d.id}">
        <span class="channel-val">${Math.round(ch.volume * 100)}%</span>
      </div>`;
    }).join('');
  }

  function updateUI() {
    CHANNEL_DEFS.forEach(d => {
      const card = document.querySelector(`.channel-card[data-id="${d.id}"]`);
      if (card) card.classList.toggle('active', channels[d.id].active);
    });
    isPlaying = Object.values(channels).some(c => c.active);
    $('#btn-play').textContent = isPlaying ? '⏸' : '▶';
  }

  /* ── Events ── */
  function bindEvents() {
    // Channel click
    $('#channels').addEventListener('click', e => {
      const card = e.target.closest('.channel-card');
      if (!card || e.target.classList.contains('channel-slider')) return;
      toggleChannel(card.dataset.id);
    });

    // Channel volume
    $('#channels').addEventListener('input', e => {
      if (!e.target.classList.contains('channel-slider')) return;
      const id = e.target.dataset.ch;
      const vol = e.target.value / 100;
      channels[id].volume = vol;
      if (channels[id].gainNode) channels[id].gainNode.gain.value = vol;
      const valSpan = e.target.closest('.channel-card').querySelector('.channel-val');
      valSpan.textContent = e.target.value + '%';
    });

    // Master play/pause
    $('#btn-play').addEventListener('click', () => {
      initAudio();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const anyActive = Object.values(channels).some(c => c.active);
      if (anyActive) {
        // Pause all
        Object.values(channels).forEach(c => { if (c.active) { stopChannel(c); c.active = false; } });
      } else {
        // Resume – start channels that had volume > 0
        // If nothing was active before, start rain by default
        let started = false;
        Object.values(channels).forEach(c => {
          if (c.volume > 0 && c._wasActive) { startChannel(c); c.active = true; started = true; }
        });
        if (!started) { channels.rain.volume = 0.5; startChannel(channels.rain); channels.rain.active = true; }
      }
      // Save "was active" state for pause/resume
      Object.values(channels).forEach(c => c._wasActive = c.active);
      updateUI();
      renderChannels();
    });

    // Master volume
    $('#master-volume').addEventListener('input', e => {
      const v = e.target.value / 100;
      if (masterGain) masterGain.gain.value = v;
      $('#master-val').textContent = e.target.value + '%';
      save('settings', { masterVol: parseInt(e.target.value) });
    });

    // Sleep timer
    $('#sleep-timer').addEventListener('change', e => {
      clearInterval(sleepHandle);
      const mins = parseInt(e.target.value);
      if (!mins) { sleepEnd = 0; $('#timer-display').textContent = ''; return; }
      sleepEnd = Date.now() + mins * 60000;
      sleepHandle = setInterval(tickTimer, 1000);
      tickTimer();
    });

    // Presets
    $('#btn-save-preset').addEventListener('click', () => { $('#modal-preset').style.display = 'flex'; $('#preset-name').value = ''; setTimeout(() => $('#preset-name').focus(), 100); });
    $('#btn-close-modal').addEventListener('click', () => $('#modal-preset').style.display = 'none');
    $('#btn-cancel-preset').addEventListener('click', () => $('#modal-preset').style.display = 'none');
    $('#btn-confirm-preset').addEventListener('click', savePreset);
    $('#modal-preset').addEventListener('click', e => { if (e.target.id === 'modal-preset') $('#modal-preset').style.display = 'none'; });
  }

  /* ── Timer ── */
  function tickTimer() {
    const rem = sleepEnd - Date.now();
    if (rem <= 0) {
      clearInterval(sleepHandle);
      $('#timer-display').textContent = '';
      // Fade out
      Object.values(channels).forEach(c => { if (c.active) { stopChannel(c); c.active = false; } });
      updateUI(); renderChannels();
      return;
    }
    const m = Math.floor(rem / 60000);
    const s = Math.floor((rem % 60000) / 1000);
    $('#timer-display').textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }

  /* ── Presets ── */
  async function savePreset() {
    const name = $('#preset-name').value.trim();
    if (!name) return;
    const state = {};
    Object.entries(channels).forEach(([id, ch]) => {
      if (ch.active || ch.volume > 0) state[id] = { active: ch.active, volume: ch.volume };
    });
    presets.push({ name, state, id: Date.now() });
    await save('presets', presets);
    renderPresets();
    $('#modal-preset').style.display = 'none';
  }

  function renderPresets() {
    const list = $('#presets-list');
    const builtIn = [
      { name: '🌧️ Pluie douce', state: { rain: { active: true, volume: 0.6 }, thunder: { active: true, volume: 0.2 } }, id: 'bi1' },
      { name: '🏖️ Plage', state: { waves: { active: true, volume: 0.5 }, wind: { active: true, volume: 0.3 }, birds: { active: true, volume: 0.2 } }, id: 'bi2' },
      { name: '☕ Café cozy', state: { cafe: { active: true, volume: 0.5 }, keyboard: { active: true, volume: 0.2 } }, id: 'bi3' },
      { name: '🌲 Forêt', state: { forest: { active: true, volume: 0.5 }, birds: { active: true, volume: 0.4 }, stream: { active: true, volume: 0.3 } }, id: 'bi4' },
      { name: '🔥 Cheminée', state: { fire: { active: true, volume: 0.6 }, rain: { active: true, volume: 0.3 } }, id: 'bi5' },
      { name: '🌙 Nuit d\'été', state: { night: { active: true, volume: 0.5 }, wind: { active: true, volume: 0.15 } }, id: 'bi6' }
    ];
    const all = [...builtIn, ...presets];
    if (!all.length) { list.innerHTML = '<span class="empty-state">Aucun preset</span>'; return; }
    list.innerHTML = all.map(p => {
      const isCustom = typeof p.id === 'number';
      return `<span class="preset-chip" data-pid="${p.id}">${p.name}${isCustom ? '<span class="del-preset" data-del="' + p.id + '">✕</span>' : ''}</span>`;
    }).join('');

    list.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', e => {
        if (e.target.classList.contains('del-preset')) { deletePreset(e.target.dataset.del); return; }
        const pid = chip.dataset.pid;
        const preset = all.find(p => String(p.id) === pid);
        if (preset) applyPreset(preset);
      });
    });
  }

  function applyPreset(preset) {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    // Stop all
    Object.values(channels).forEach(c => { if (c.active) { stopChannel(c); c.active = false; } });
    // Apply
    Object.entries(preset.state).forEach(([id, s]) => {
      if (!channels[id]) return;
      channels[id].volume = s.volume;
      if (s.active) { startChannel(channels[id]); channels[id].active = true; }
    });
    Object.values(channels).forEach(c => c._wasActive = c.active);
    updateUI();
    renderChannels();
  }

  async function deletePreset(pid) {
    presets = presets.filter(p => String(p.id) !== pid);
    await save('presets', presets);
    renderPresets();
  }

  /* ── Visualizer ── */
  function animateVisualizer() {
    const canvas = $('#visualizer');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    function draw() {
      requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);

      if (!analyser) {
        // Idle animation
        ctx.strokeStyle = 'rgba(14,165,164,.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const t = Date.now() / 1000;
        for (let x = 0; x < W; x++) {
          const y = H / 2 + Math.sin(x * 0.02 + t) * 8 + Math.sin(x * 0.01 + t * 1.5) * 5;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        return;
      }

      const bufLen = analyser.frequencyBinCount;
      const data = new Uint8Array(bufLen);
      analyser.getByteFrequencyData(data);

      const barW = (W / bufLen) * 2.5;
      const grad = ctx.createLinearGradient(0, H, 0, 0);
      grad.addColorStop(0, 'rgba(14,165,164,.1)');
      grad.addColorStop(1, 'rgba(14,165,164,.7)');

      for (let i = 0; i < bufLen; i++) {
        const barH = (data[i] / 255) * H * 0.85;
        const x = i * barW;
        ctx.fillStyle = grad;
        ctx.fillRect(x, H - barH, barW - 1, barH);
      }
    }
    draw();
  }

  /* ── Boot ── */
  init();
})();