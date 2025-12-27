/* global Phaser, window */

(() => {
  "use strict";

  const APP_ID = "com.ezgalaxy.sopor";
  const SAVE_SCHEMA = 1;

  const TILE_SIZE = 16;
  const CHUNK_SIZE_TILES = 24; // 24x24 tiles per chunk
  const CHUNK_SIZE_PX = TILE_SIZE * CHUNK_SIZE_TILES;

  const WORLD_VIEW_CHUNKS_RADIUS = 2; // loads (2r+1)^2 chunks

  const BASE_MOVE_SPEED = 120;
  const PLAYER_RADIUS = 7;

  const MAX_LOG_LINES = 120;

  const STRATA = {
    JARDIN: "JARDIN",
    FORGE: "FORGE",
    ABIME: "ABIME",
  };

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function nowMs() {
    return performance.now();
  }

  function normalizeUsername(input) {
    const trimmed = String(input ?? "").trim();
    const lower = trimmed.toLowerCase();
    const noDiacritics = lower.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const collapsed = noDiacritics.replace(/\s+/g, " ");
    return collapsed;
  }

  function hash32(str) {
    // FNV-1a 32-bit
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function makeRng(seed32) {
    let s = seed32 >>> 0;
    return {
      next() {
        // xorshift32
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        return (s >>> 0) / 0xffffffff;
      },
      nextInt(maxExclusive) {
        return Math.floor(this.next() * maxExclusive);
      },
      nextRange(min, max) {
        return min + this.next() * (max - min);
      },
      fork(extra) {
        return makeRng((s ^ extra) >>> 0);
      },
    };
  }

  function safeJsonParse(text, fallback) {
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  }

  function migrateWorldState(state) {
    try {
      if (!state || typeof state !== "object") return state;
      if (!state.world || typeof state.world !== "object") return state;

      const baseQuest = defaultWorldState(state.usernameNorm ?? "player").world.quest;
      if (!state.world.quest || typeof state.world.quest !== "object") {
        state.world.quest = structuredClone(baseQuest);
        return state;
      }

      const q = state.world.quest;

      // Old saves used q.progress/q.required without steps.
      if (!Array.isArray(q.steps)) {
        const migrated = structuredClone(baseQuest);
        migrated.communityProgress = Number(q.communityProgress ?? q.progress ?? 0) || 0;
        migrated.communityRequired = Number(q.communityRequired ?? q.required ?? baseQuest.communityRequired) || baseQuest.communityRequired;
        migrated.playerContribution = Number(q.playerContribution ?? 0) || 0;
        migrated.lastTickAt = Number(q.lastTickAt ?? Date.now()) || Date.now();
        migrated.completedCount = Number(q.completedCount ?? 0) || 0;
        state.world.quest = migrated;
        return state;
      }

      // Ensure required fields exist.
      if (typeof q.stepIndex !== "number") q.stepIndex = 0;
      if (typeof q.communityProgress !== "number") q.communityProgress = 0;
      if (typeof q.communityRequired !== "number") q.communityRequired = baseQuest.communityRequired;
      if (typeof q.playerContribution !== "number") q.playerContribution = 0;
      if (typeof q.lastTickAt !== "number") q.lastTickAt = Date.now();
      if (!q.activeSite) q.activeSite = structuredClone(baseQuest.activeSite);
      if (typeof q.completedCount !== "number") q.completedCount = 0;
      for (const step of q.steps) {
        if (!step || typeof step !== "object") continue;
        if (step.kind === "collect") {
          if (typeof step.progress !== "number") step.progress = 0;
          if (typeof step.required !== "number") step.required = 12;
        }
        if (step.kind === "repair") {
          if (typeof step.progress !== "number") step.progress = 0;
          if (typeof step.required !== "number") step.required = 40;
        }
        if (step.kind === "protect") {
          if (typeof step.progressSeconds !== "number") step.progressSeconds = 0;
          if (typeof step.requiredSeconds !== "number") step.requiredSeconds = 30;
          if (typeof step.workersAlive !== "number") step.workersAlive = 0;
          if (typeof step.workersMax !== "number") step.workersMax = 2;
        }
      }

      return state;
    } catch {
      return state;
    }
  }

  function saveKeyForUsernameNorm(usernameNorm) {
    return `ezg:${APP_ID}:save:v${SAVE_SCHEMA}:${usernameNorm}`;
  }

  function settingsKey() {
    return `ezg:${APP_ID}:settings:v${SAVE_SCHEMA}`;
  }

  function createRootUi() {
    const app = document.getElementById("app");
    if (!app) {
      throw new Error("#app not found");
    }

    app.innerHTML = `
      <div class="sopor-topbar">
        <div class="sopor-title">Sopor</div>
        <div class="sopor-badge">Offline • Pixel • Quêtes</div>
        <div style="flex:1"></div>
        <button id="btnHardReset" class="btn">Reset (local)</button>
      </div>
      <div class="sopor-shell">
        <div class="sopor-panel">
          <div class="card">
            <div class="card-title">Pseudo</div>
            <div class="card-body">
              <div class="sopor-field">
                <label for="usernameInput">Entre ton pseudo (requis à chaque lancement)</label>
                <input id="usernameInput" class="input sopor-input" placeholder="ex: Eveilleur_7" />
              </div>
              <div class="sopor-row" style="margin-top:10px">
                <button id="btnStart" class="btn primary">Démarrer</button>
                <button id="btnLoad" class="btn">Charger</button>
                <button id="btnDeleteSave" class="btn danger">Supprimer save</button>
              </div>
              <div class="sopor-row" style="margin-top:10px">
                <span class="badge" id="userBadge">Aucun pseudo</span>
                <span class="badge" id="noteBadge">Note: —</span>
                <span class="badge" id="storyBadge">Histoire: —</span>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Contrôles</div>
            <div class="card-body">
              <div>Déplacement: ZQSD / WASD / flèches</div>
              <div>Attaque: clic gauche ou Espace</div>
              <div>Interaction (PNJ / Pilier): F</div>
              <div>Changer d'arme: 1–9</div>
              <div>Pause: Échap</div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Journal</div>
            <div class="card-body">
              <div id="log" class="sopor-log"></div>
            </div>
          </div>
        </div>

        <div class="sopor-canvasWrap card">
          <div class="card-body" style="padding:0; height:100%">
            <div id="hud" class="sopor-hud"></div>
            <div id="danger" class="sopor-danger" data-level="low">Danger: —</div>
            <canvas id="minimap" class="sopor-minimap" width="160" height="160"></canvas>
            <canvas id="gameCanvas"></canvas>
          </div>
        </div>
      </div>
    `;

    return {
      app,
      usernameInput: /** @type {HTMLInputElement} */ (document.getElementById("usernameInput")),
      btnStart: /** @type {HTMLButtonElement} */ (document.getElementById("btnStart")),
      btnLoad: /** @type {HTMLButtonElement} */ (document.getElementById("btnLoad")),
      btnDeleteSave: /** @type {HTMLButtonElement} */ (document.getElementById("btnDeleteSave")),
      btnHardReset: /** @type {HTMLButtonElement} */ (document.getElementById("btnHardReset")),
      userBadge: document.getElementById("userBadge"),
      noteBadge: document.getElementById("noteBadge"),
      storyBadge: document.getElementById("storyBadge"),
      log: document.getElementById("log"),
      hud: document.getElementById("hud"),
      danger: document.getElementById("danger"),
      minimap: /** @type {HTMLCanvasElement} */ (document.getElementById("minimap")),
      canvas: /** @type {HTMLCanvasElement} */ (document.getElementById("gameCanvas")),
    };
  }

  function makeLogger(logEl) {
    const lines = [];
    function render() {
      if (!logEl) return;
      logEl.textContent = lines.join("\n");
      logEl.scrollTop = logEl.scrollHeight;
    }
    return {
      info(msg) {
        const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
        lines.push(line);
        while (lines.length > MAX_LOG_LINES) lines.shift();
        render();
      },
      clear() {
        lines.length = 0;
        render();
      },
    };
  }

  // -------- Audio (procedural, deterministic + evolves with story) --------

  function makeAudioEngine() {
    /** @type {AudioContext | null} */
    let audioContext = null;

    const state = {
      enabled: false,
      usernameSeed: 0,
      started: false,
      baseTempo: 98,
      motif: /** @type {number[]} */ ([]),
      rootMidi: 60,
      stratum: STRATA.JARDIN,
      stage: 0,
      // nodes
      master: null,
      delay: null,
      delayFeedback: null,
      delayMix: null,
      // scheduler
      nextNoteTime: 0,
      noteIndex: 0,
      timerId: 0,
    };

    function midiToHz(midi) {
      return 440 * Math.pow(2, (midi - 69) / 12);
    }

    function ensureContext() {
      if (audioContext) return audioContext;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioContext = new Ctx();
      return audioContext;
    }

    function buildGraph(volume) {
      const ctx = ensureContext();
      if (!ctx) return;

      const master = ctx.createGain();
      master.gain.value = volume;

      const delay = ctx.createDelay(1.2);
      delay.delayTime.value = 0.22;

      const delayFeedback = ctx.createGain();
      delayFeedback.gain.value = 0.25;

      const delayMix = ctx.createGain();
      delayMix.gain.value = 0.18;

      delay.connect(delayFeedback);
      delayFeedback.connect(delay);

      master.connect(ctx.destination);
      master.connect(delay);
      delay.connect(delayMix);
      delayMix.connect(ctx.destination);

      state.master = master;
      state.delay = delay;
      state.delayFeedback = delayFeedback;
      state.delayMix = delayMix;
    }

    function pickMotif(seed32) {
      const rng = makeRng(seed32 ^ 0xa3c59ac3);
      // motif = interval skeleton (kept stable), 8 notes.
      const candidates = [
        [0, 2, 4, 7, 4, 2, 0, -3],
        [0, 3, 5, 7, 5, 3, 0, -2],
        [0, 2, 5, 9, 5, 2, 0, -5],
        [0, 4, 7, 11, 7, 4, 0, -1],
        [0, 2, 3, 7, 3, 2, 0, -2],
      ];
      return candidates[rng.nextInt(candidates.length)];
    }

    function stratumPreset(stratum, stage, seed32) {
      const rng = makeRng(seed32 ^ hash32(stratum) ^ (stage * 0x9e3779b9));

      // Keep everything gentle; avoid clipping.
      if (stratum === STRATA.JARDIN) {
        return {
          osc: rng.next() < 0.6 ? "triangle" : "sine",
          cutoff: 800 + stage * 500,
          delayTime: 0.18 + rng.nextRange(0, 0.05),
          feedback: 0.18 + stage * 0.04,
          mix: 0.10 + stage * 0.03,
          ornamentChance: 0.0 + stage * 0.05,
          tempoMul: 1.0 + stage * 0.02,
        };
      }

      if (stratum === STRATA.FORGE) {
        return {
          osc: rng.next() < 0.6 ? "sawtooth" : "square",
          cutoff: 700 + stage * 650,
          delayTime: 0.12 + rng.nextRange(0, 0.05),
          feedback: 0.22 + stage * 0.05,
          mix: 0.12 + stage * 0.03,
          ornamentChance: 0.08 + stage * 0.06,
          tempoMul: 1.05 + stage * 0.03,
        };
      }

      // ABIME
      return {
        osc: rng.next() < 0.6 ? "sawtooth" : "triangle",
        cutoff: 500 + stage * 420,
        delayTime: 0.26 + rng.nextRange(0, 0.08),
        feedback: 0.26 + stage * 0.06,
        mix: 0.16 + stage * 0.04,
        ornamentChance: 0.10 + stage * 0.07,
        tempoMul: 0.95 + stage * 0.02,
      };
    }

    function scheduleNote(when, midi, preset, velocity) {
      const ctx = ensureContext();
      if (!ctx || !state.master) return;

      const osc = ctx.createOscillator();
      osc.type = preset.osc;
      osc.frequency.setValueAtTime(midiToHz(midi), when);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(preset.cutoff, when);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, when);

      // short ADSR
      const attack = 0.01;
      const decay = 0.08;
      const sustain = 0.0;
      const release = 0.10;
      const peak = 0.08 * clamp(velocity, 0.1, 1.0);

      gain.gain.linearRampToValueAtTime(peak, when + attack);
      gain.gain.linearRampToValueAtTime(peak * sustain, when + attack + decay);
      gain.gain.linearRampToValueAtTime(0, when + attack + decay + release);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(state.master);

      osc.start(when);
      osc.stop(when + attack + decay + release + 0.02);
    }

    function tick() {
      const ctx = ensureContext();
      if (!ctx || !state.started) return;

      const lookAhead = 0.28;
      while (state.nextNoteTime < ctx.currentTime + lookAhead) {
        const preset = stratumPreset(state.stratum, state.stage, state.usernameSeed);

        if (state.delay && state.delayFeedback && state.delayMix) {
          state.delay.delayTime.setTargetAtTime(preset.delayTime, state.nextNoteTime, 0.02);
          state.delayFeedback.gain.setTargetAtTime(clamp(preset.feedback, 0.1, 0.65), state.nextNoteTime, 0.02);
          state.delayMix.gain.setTargetAtTime(clamp(preset.mix, 0.0, 0.5), state.nextNoteTime, 0.02);
        }

        const step = state.motif[state.noteIndex % state.motif.length];
        const base = state.rootMidi;
        const midi = base + step;

        scheduleNote(state.nextNoteTime, midi, preset, 0.9);

        // Ornamentation: small grace note on some stages.
        const rng = makeRng(state.usernameSeed ^ (state.noteIndex * 0x9e3779b9));
        if (rng.next() < preset.ornamentChance) {
          const grace = midi + (rng.next() < 0.5 ? -2 : 2);
          scheduleNote(state.nextNoteTime + 0.07, grace, preset, 0.55);
        }

        const beat = 60 / (state.baseTempo * preset.tempoMul);
        const rhythm = [1, 1, 1, 2, 1, 1, 2, 1][state.noteIndex % 8];
        state.nextNoteTime += beat * 0.5 * rhythm;
        state.noteIndex++;
      }

      state.timerId = window.setTimeout(tick, 50);
    }

    return {
      loadSettings() {
        const raw = localStorage.getItem(settingsKey());
        const s = safeJsonParse(raw ?? "", null);
        return {
          volume: typeof s?.volume === "number" ? clamp(s.volume, 0, 1) : 0.35,
        };
      },
      saveSettings(settings) {
        localStorage.setItem(settingsKey(), JSON.stringify({ volume: settings.volume }));
      },
      configureForUsername(usernameNorm) {
        state.usernameSeed = hash32(usernameNorm);
        const rng = makeRng(state.usernameSeed);
        state.baseTempo = Math.floor(92 + rng.nextRange(0, 24));
        state.rootMidi = 54 + rng.nextInt(12);
        state.motif = pickMotif(state.usernameSeed);
      },
      getSignatureNote(usernameNorm) {
        const seed = hash32(usernameNorm);
        return seed % 12; // 0..11 pitch class
      },
      setStoryProgress({ stratum, stage }) {
        state.stratum = stratum;
        state.stage = clamp(stage, 0, 4);
      },
      start(volume) {
        const ctx = ensureContext();
        if (!ctx) return { ok: false, reason: "WebAudio indisponible" };

        if (ctx.state === "suspended") {
          // Must be in user gesture.
          ctx.resume().catch(() => undefined);
        }

        if (!state.master) buildGraph(volume);

        state.started = true;
        state.nextNoteTime = ctx.currentTime + 0.08;
        state.noteIndex = 0;
        window.clearTimeout(state.timerId);
        tick();

        return { ok: true };
      },
      stop() {
        state.started = false;
        window.clearTimeout(state.timerId);
      },
    };
  }

  // -------- Game state / persistence --------

  function defaultWorldState(usernameNorm) {
    const seed = hash32(usernameNorm);
    return {
      schema: SAVE_SCHEMA,
      usernameNorm,
      seed,
      createdAt: new Date().toISOString(),
      lastSavedAt: null,
      story: {
        // 0..2 for stratum unlock is irrelevant (all accessible), but used for music evolution and narrative.
        globalMilestones: 0,
        stage: 0,
      },
      player: {
        id: "player",
        x: 0,
        y: 0,
        hp: 30,
        hpMax: 30,
        essence: 28,
        essenceMax: 40,
        pale: false,
        weaponId: "sword_neon",
        inventory: {
          essence: 28,
          items: [],
          weapons: ["sword_neon", "bow_arc", "slingshot_pocket"],
        },
      },
      world: {
        // chunkKey -> { stability, threat, pillar, merchantStockSeed }
        chunks: {},
        quest: {
          id: "stability_collab_1",
          title: "Trame Collaborative: Réparer le Grand Phare",
          stepIndex: 0,
          steps: [
            { kind: "collect", title: "Récolter des Fibres Lumineuses", required: 12, progress: 0 },
            { kind: "protect", title: "Protéger les Ouvriers", requiredSeconds: 30, progressSeconds: 0, workersAlive: 0, workersMax: 2 },
            { kind: "repair", title: "Réparer le Phare (injecter l'Essence)", required: 40, progress: 0 },
          ],
          communityProgress: 0,
          communityRequired: 100,
          playerContribution: 0,
          lastTickAt: Date.now(),
          activeSite: { x: 180, y: 120, kind: "lighthouse" },
          completedCount: 0,
        },
      },
    };
  }

  function loadSave(usernameNorm) {
    const raw = localStorage.getItem(saveKeyForUsernameNorm(usernameNorm));
    if (!raw) return null;
    const parsed = safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.schema !== SAVE_SCHEMA) return null;
    return migrateWorldState(parsed);
  }

  function saveWorld(state) {
    const copy = structuredClone(state);
    copy.lastSavedAt = new Date().toISOString();
    localStorage.setItem(saveKeyForUsernameNorm(state.usernameNorm), JSON.stringify(copy));
    return copy;
  }

  // -------- World generation --------

  function chunkKey(cx, cy) {
    return `${cx},${cy}`;
  }

  function biomeForWorldPos(seed32, x, y) {
    // Simple deterministic strata mapping: radial + noise-ish.
    const d = Math.sqrt(x * x + y * y);
    const t = (d / 1800) + ((seed32 % 97) / 97) * 0.2;

    // Add angular variation.
    const angle = Math.atan2(y, x);
    const a = Math.abs(Math.sin(angle * 2.3 + (seed32 % 13)));
    const mix = t + a * 0.25;

    if (mix < 0.9) return STRATA.JARDIN;
    if (mix < 1.7) return STRATA.FORGE;
    return STRATA.ABIME;
  }

  function threatForWorldPos(stratum, x, y) {
    const d = Math.sqrt(x * x + y * y);
    const base = stratum === STRATA.JARDIN ? 1 : stratum === STRATA.FORGE ? 2 : 3;
    // Threat rises with distance.
    return base + d / 900;
  }

  // -------- Phaser scenes --------

  class BootScene extends Phaser.Scene {
    constructor() {
      super({ key: "BootScene" });
    }
    create() {
      this.scene.start("PreloadScene");
    }
  }

  class PreloadScene extends Phaser.Scene {
    constructor() {
      super({ key: "PreloadScene" });
    }

    create() {
      generatePlaceholderTextures(this);
      this.scene.start("TitleScene");
    }
  }

  class TitleScene extends Phaser.Scene {
    constructor() {
      super({ key: "TitleScene" });
      this._started = false;
    }

    create() {
      const gs = this.registry.get("gameState");
      gs.logger.info("Prêt. Saisis ton pseudo puis Démarrer.");

      // The actual UI is HTML; this scene just idles.
      this.add.text(20, 20, "Sopor", { fontFamily: "monospace", fontSize: 18, color: "#ffffff" });
    }
  }

  class WorldScene extends Phaser.Scene {
    constructor() {
      super({ key: "WorldScene" });

      this.player = null;
      this.cursors = null;
      this.keys = null;

      this.lastAttackAt = 0;
      this.lastInteractAt = 0;

      this.chunkLayer = null;
      this.entityLayer = null;

      this.loadedChunks = new Map();

      this.monsters = null;
      this.npcs = null;
      this.workers = null;
      this.projectiles = null;
      this.pickups = null;

      this.questSite = null;

      this._hudLast = 0;

      this._lastPlayerDamageAt = 0;
    }

    create() {
      const gs = this.registry.get("gameState");

      this.physics.world.setBounds(-100000, -100000, 200000, 200000);

      this.chunkLayer = this.add.layer();
      this.entityLayer = this.add.layer();

      this.monsters = this.physics.add.group();
      this.npcs = this.physics.add.group();
      this.workers = this.physics.add.group();
      this.projectiles = this.physics.add.group();
      this.pickups = this.physics.add.group();

      const p = gs.world.player;

      this.player = this.physics.add.image(p.x, p.y, "spr_player");
      this.player.setCircle(PLAYER_RADIUS, 1, 1);
      this.player.setCollideWorldBounds(false);
      this.player.setDrag(1400, 1400);
      this.player.setMaxVelocity(420, 420);

      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      this.cameras.main.setZoom(2.5);
      this.cameras.main.setRoundPixels(true);

      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys({
        w: Phaser.Input.Keyboard.KeyCodes.W,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        z: Phaser.Input.Keyboard.KeyCodes.Z,
        q: Phaser.Input.Keyboard.KeyCodes.Q,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        f: Phaser.Input.Keyboard.KeyCodes.F,
        esc: Phaser.Input.Keyboard.KeyCodes.ESC,
        one: Phaser.Input.Keyboard.KeyCodes.ONE,
        two: Phaser.Input.Keyboard.KeyCodes.TWO,
        three: Phaser.Input.Keyboard.KeyCodes.THREE,
        four: Phaser.Input.Keyboard.KeyCodes.FOUR,
        five: Phaser.Input.Keyboard.KeyCodes.FIVE,
        six: Phaser.Input.Keyboard.KeyCodes.SIX,
        seven: Phaser.Input.Keyboard.KeyCodes.SEVEN,
        eight: Phaser.Input.Keyboard.KeyCodes.EIGHT,
        nine: Phaser.Input.Keyboard.KeyCodes.NINE,
      });

      // Collisions
      this.physics.add.overlap(this.projectiles, this.monsters, (proj, mon) => {
        this._onProjectileHit(/** @type {Phaser.GameObjects.GameObject} */ (proj), /** @type {Phaser.GameObjects.GameObject} */ (mon));
      });

      this.physics.add.overlap(this.player, this.monsters, () => {
        // contact damage (scales with threat)
        const nearest = this._findNearestGroupMember(this.monsters, 22);
        const threat = nearest?.getData?.("threat") ?? 1;
        this._applyDamageToPlayer(0.10 + threat * 0.07);
      });

      this.physics.add.overlap(this.player, this.pickups, (pl, pu) => {
        this._pickup(/** @type {Phaser.GameObjects.GameObject} */ (pu));
      });

      this.physics.add.overlap(this.monsters, this.workers, (mon, w) => {
        this._monsterHitsWorker(/** @type {Phaser.GameObjects.GameObject} */ (mon), /** @type {Phaser.GameObjects.GameObject} */ (w));
      });

      // Spawn initial world content
      this._streamWorld(true);
      this._spawnNpcClusterNearPlayer();

      // Quest site marker (repair location)
      const site = gs.world.world.quest?.activeSite;
      if (site) {
        this.questSite = this.add.image(site.x, site.y, "spr_site");
        this.questSite.setBlendMode(Phaser.BlendModes.ADD);
        this.questSite.setAlpha(0.9);
      }

      this._syncQuestActors();

      gs.logger.info("Bienvenue, Éveilleur. La Trame se dégrade...");

      this.scene.launch("UIScene");
    }

    update() {
      const gs = this.registry.get("gameState");

      this._tickQuestSim();
      this._streamWorld(false);

      this._handleWeaponHotkeys();

      if (this.keys.esc.isDown) {
        this.scene.pause();
        this.scene.pause("UIScene");
        this.scene.launch("PauseScene");
      }

      this._movePlayer();
      this._aiTick();

      const attackPressed = this.keys.space.isDown || this.input.activePointer.isDown;
      if (attackPressed) {
        this._tryAttack();
      }

      if (this.keys.f.isDown) {
        this._tryInteract();
      }

      // Update saved player pos
      gs.world.player.x = this.player.x;
      gs.world.player.y = this.player.y;

      // HUD refresh throttled
      if (nowMs() - this._hudLast > 120) {
        this._hudLast = nowMs();
        gs.ui.renderHud(this._makeHudState());
      }

      // Minimap refresh throttled
      if (!gs._lastMinimapAt) gs._lastMinimapAt = 0;
      if (Date.now() - gs._lastMinimapAt > 120) {
        gs._lastMinimapAt = Date.now();
        gs.ui.renderMinimap(this._makeMinimapState());
      }

      // Autosave occasionally
      if (!gs._lastAutoSaveAt) gs._lastAutoSaveAt = 0;
      if (Date.now() - gs._lastAutoSaveAt > 9000) {
        gs._lastAutoSaveAt = Date.now();
        gs.world = saveWorld(gs.world);
        gs.ui.setStoryBadge(gs.world.story);
      }

      gs.ui.renderDanger(this._dangerState());
    }

    _dangerState() {
      const gs = this.registry.get("gameState");
      const stratum = biomeForWorldPos(gs.world.seed, this.player.x, this.player.y);
      const threat = threatForWorldPos(stratum, this.player.x, this.player.y);
      const level = threat < 2.2 ? "low" : threat < 3.4 ? "mid" : "high";
      return { stratum, threat, level };
    }

    _makeHudState() {
      const gs = this.registry.get("gameState");
      const p = gs.world.player;
      const weapon = gs.weapons.getWeapon(p.weaponId);
      const stratum = biomeForWorldPos(gs.world.seed, this.player.x, this.player.y);
      const threat = threatForWorldPos(stratum, this.player.x, this.player.y);

      const ck = this._currentChunkKey();
      const chunk = gs.world.world.chunks[ck] ?? null;
      const stability = chunk?.stability ?? 50;

      const quest = gs.world.world.quest;
      const step = quest?.steps?.[quest.stepIndex] ?? null;
      const stepText = step ? `${quest.stepIndex + 1}/${quest.steps.length} — ${step.title}` : "—";

      return {
        hp: p.hp,
        hpMax: p.hpMax,
        essence: p.essence,
        essenceMax: p.essenceMax,
        pale: p.pale,
        weaponName: weapon?.name ?? "—",
        weaponType: weapon?.type ?? "—",
        stratum,
        threat,
        stability,
        quest: {
          ...quest,
          stepText,
        },
      };
    }

    _makeMinimapState() {
      const gs = this.registry.get("gameState");
      const px = this.player.x;
      const py = this.player.y;
      const stratum = biomeForWorldPos(gs.world.seed, px, py);
      const threat = threatForWorldPos(stratum, px, py);

      const entities = [];
      const pushGroup = (group, kind, limit) => {
        let n = 0;
        group.children.iterate((child) => {
          if (!child || n >= limit) return;
          entities.push({ kind, x: child.x, y: child.y });
          n++;
        });
      };

      pushGroup(this.monsters, "monster", 20);
      pushGroup(this.npcs, "npc", 12);
      pushGroup(this.workers, "worker", 6);

      const site = gs.world.world.quest?.activeSite ?? null;

      return {
        player: { x: px, y: py },
        stratum,
        threat,
        entities,
        site,
      };
    }

    _handleWeaponHotkeys() {
      const gs = this.registry.get("gameState");
      const p = gs.world.player;
      const keys = [this.keys.one, this.keys.two, this.keys.three, this.keys.four, this.keys.five, this.keys.six, this.keys.seven, this.keys.eight, this.keys.nine];

      for (let i = 0; i < keys.length; i++) {
        if (Phaser.Input.Keyboard.JustDown(keys[i])) {
          const weaponId = p.inventory.weapons[i];
          if (weaponId) {
            p.weaponId = weaponId;
            gs.logger.info(`Arme équipée: ${gs.weapons.getWeapon(weaponId)?.name ?? weaponId}`);
          }
        }
      }
    }

    _movePlayer() {
      const gs = this.registry.get("gameState");
      const p = gs.world.player;

      const left = this.cursors.left.isDown || this.keys.a.isDown || this.keys.q.isDown;
      const right = this.cursors.right.isDown || this.keys.d.isDown;
      const up = this.cursors.up.isDown || this.keys.w.isDown || this.keys.z.isDown;
      const down = this.cursors.down.isDown || this.keys.s.isDown;

      let vx = 0;
      let vy = 0;
      if (left) vx -= 1;
      if (right) vx += 1;
      if (up) vy -= 1;
      if (down) vy += 1;

      const len = Math.hypot(vx, vy);
      if (len > 0) {
        vx /= len;
        vy /= len;
      }

      const palePenalty = p.pale ? 0.78 : 1.0;
      const chunk = this._currentChunk();
      const zoneSpeedBonus = chunk?.pillar?.buffActive ? 1.1 : 1.0;
      const speed = BASE_MOVE_SPEED * palePenalty * zoneSpeedBonus;

      this.player.setAcceleration(vx * speed * 10, vy * speed * 10);

      // Update facing
      if (len > 0.1) {
        gs._facing = { x: vx, y: vy };
      }
    }

    _tryAttack() {
      const gs = this.registry.get("gameState");
      const p = gs.world.player;
      const weapon = gs.weapons.getWeapon(p.weaponId);
      if (!weapon) return;

      const t = nowMs();
      const dt = t - this.lastAttackAt;
      if (dt < weapon.cooldownMs) return;

      if (p.essence < weapon.essenceCost) {
        // Can't fire without essence.
        return;
      }

      this.lastAttackAt = t;
      p.essence = Math.max(0, p.essence - weapon.essenceCost);
      p.pale = p.essence < 6;

      const facing = gs._facing ?? { x: 1, y: 0 };
      const aim = this._aimDirection(facing);

      const paleDamageMul = p.pale ? 0.85 : 1.0;

      gs.combat.fireWeapon({
        scene: this,
        weapon: { ...weapon, damage: (weapon.damage ?? 0) * paleDamageMul },
        playerSprite: this.player,
        aim,
      });

      // Contribution to collaborative quest.
      const q = gs.world.world.quest;
      q.playerContribution += 0.05;
      q.communityProgress += 0.02;
    }

    _aimDirection(fallback) {
      const pointer = this.input.activePointer;
      const worldPoint = pointer.positionToCamera(this.cameras.main);

      const dx = worldPoint.x - this.player.x;
      const dy = worldPoint.y - this.player.y;
      const len = Math.hypot(dx, dy);

      if (len < 0.01) return fallback;
      return { x: dx / len, y: dy / len };
    }

    _tryInteract() {
      const gs = this.registry.get("gameState");
      const t = nowMs();
      if (t - this.lastInteractAt < 350) return;
      this.lastInteractAt = t;

      const nearNpc = this._findNearestGroupMember(this.npcs, 44);
      if (nearNpc) {
        this._interactNpc(nearNpc);
        return;
      }

      const chunk = this._currentChunk();
      if (chunk?.pillar) {
        const px = chunk.pillar.x;
        const py = chunk.pillar.y;
        const d = Math.hypot(px - this.player.x, py - this.player.y);
        if (d < 58) {
          this._interactPillar(chunk);
          return;
        }
      }

      const site = gs.world.world.quest?.activeSite;
      if (site) {
        const d = Math.hypot(site.x - this.player.x, site.y - this.player.y);
        if (d < 60) {
          this._interactQuestSite(site);
        }
      }
    }

    _interactPillar(chunk) {
      const gs = this.registry.get("gameState");
      const p = gs.world.player;

      const inject = Math.min(6, p.essence);
      if (inject <= 0.1) {
        gs.logger.info("Tu n'as plus assez d'Essence Chromatique à injecter.");
        return;
      }

      p.essence = Math.max(0, p.essence - inject);
      p.pale = p.essence < 6;

      chunk.stability = clamp(chunk.stability + inject * 1.4, 0, 100);
      chunk.pillar.charge = clamp((chunk.pillar.charge ?? 0) + inject, 0, 100);
      chunk.pillar.buffActive = chunk.pillar.charge >= 22;

      // Community quest boost
      const q = gs.world.world.quest;
      q.playerContribution += inject * 0.18;
      q.communityProgress += inject * 0.11;

      gs.logger.info(`Pilier alimenté (+${inject.toFixed(1)} Essence). Stabilité: ${chunk.stability.toFixed(0)}%`);

      this._maybeAdvanceStory("PILLAR_INJECT");
    }

    _interactQuestSite(site) {
      const gs = this.registry.get("gameState");
      const p = gs.world.player;
      const q = gs.world.world.quest;
      const step = q.steps?.[q.stepIndex];
      if (!step) return;

      if (step.kind === "repair") {
        const spend = Math.min(6, p.essence);
        if (spend <= 0.1) {
          gs.logger.info("Phare: il te faut de l'Essence pour réparer.");
          return;
        }

        p.essence = Math.max(0, p.essence - spend);
        p.pale = p.essence < 6;

        step.progress = clamp((step.progress ?? 0) + spend, 0, step.required);
        q.playerContribution += spend * 0.22;
        q.communityProgress += spend * 0.08;
        gs.logger.info(`Réparation: +${spend.toFixed(1)} (total ${step.progress.toFixed(1)}/${step.required})`);
        if (step.progress >= step.required) {
          this._advanceQuestStep();
        }
        return;
      }

      if (step.kind === "protect") {
        gs.logger.info("Chantier: défends les ouvriers jusqu'à la fin des réparations.");
        return;
      }

      gs.logger.info("Chantier: récupère des Fibres Lumineuses sur les cauchemars.");
    }

    _interactNpc(npc) {
      const gs = this.registry.get("gameState");
      const kind = npc.getData("kind");

      if (kind === "merchant") {
        this._openMerchant(npc);
        return;
      }

      if (kind === "questgiver") {
        const q = gs.world.world.quest;
        const step = q.steps?.[q.stepIndex];
        const stepInfo = step ? `${q.stepIndex + 1}/${q.steps.length} — ${step.title}` : "—";
        gs.logger.info(`PNJ: "${q.title}" — Étape: ${stepInfo}`);
        gs.logger.info(`Trame (communautaire simulée): ${q.communityProgress.toFixed(1)}/${q.communityRequired} • Contribution: ${q.playerContribution.toFixed(1)}`);
        gs.logger.info("Conseil: récolte, protège les ouvriers, puis répare au chantier. Les prix bougent avec la stabilité." );
        return;
      }

      gs.logger.info("PNJ: " + (npc.getData("line") ?? "Les couleurs reviennent quand la Trame tient bon."));
    }

    _openMerchant(npc) {
      const gs = this.registry.get("gameState");
      const chunk = this._currentChunk();
      const p = gs.world.player;

      const offer = computeMerchantOffer(gs, chunk);
      const weapon = gs.weapons.getWeapon(offer.weaponId);
      if (!weapon) {
        gs.logger.info("Marchand: plus rien à vendre pour l'instant.");
        return;
      }

      const already = p.inventory.weapons.includes(offer.weaponId);
      if (already) {
        gs.logger.info(`Marchand: "Tu as déjà ${weapon.name}."`);
        return;
      }

      const price = offer.price;
      gs.logger.info(`Marchand: "${weapon.name}" — Prix: ${price.toFixed(1)} Essence (Stabilité: ${chunk.stability.toFixed(0)}%)`);

      if (p.essence < price) {
        gs.logger.info("Marchand: " + "Tu n'as pas assez d'Essence. Reviens quand tu seras plus lumineux." );
        return;
      }

      // Purchase
      p.essence = Math.max(0, p.essence - price);
      p.pale = p.essence < 6;
      p.inventory.weapons.push(offer.weaponId);
      gs.logger.info(`Achat réussi: ${weapon.name} (slot ${p.inventory.weapons.length})`);

      // Buying also advances community a bit.
      const q = gs.world.world.quest;
      q.playerContribution += price * 0.08;
      q.communityProgress += price * 0.03;

      this._maybeAdvanceStory("BUY_WEAPON");
    }

    _applyDamageToPlayer(amount) {
      const gs = this.registry.get("gameState");
      const p = gs.world.player;

      const t = nowMs();
      if (t - this._lastPlayerDamageAt < 350) return;
      this._lastPlayerDamageAt = t;

      p.hp = Math.max(0, p.hp - amount);
      if (p.hp <= 0) {
        this._respawn();
      }
    }

    _respawn() {
      const gs = this.registry.get("gameState");
      const p = gs.world.player;
      gs.logger.info("Tu t'effaces... puis reviens au cœur du rêve.");
      p.hp = p.hpMax;
      p.essence = Math.max(8, p.essence);
      p.pale = p.essence < 6;
      this.player.setPosition(0, 0);
    }

    _onProjectileHit(proj, mon) {
      const gs = this.registry.get("gameState");

      const pObj = /** @type {Phaser.Physics.Arcade.Image} */ (proj);
      const mObj = /** @type {Phaser.Physics.Arcade.Image} */ (mon);

      const dmg = pObj.getData("damage") ?? 1;
      const pierce = pObj.getData("pierce") ?? 0;

      const hp = (mObj.getData("hp") ?? 5) - dmg;
      mObj.setData("hp", hp);

      if (hp <= 0) {
        this._killMonster(mObj);
      }

      if (pierce <= 0) {
        pObj.destroy();
      } else {
        pObj.setData("pierce", pierce - 1);
      }
    }

    _killMonster(mon) {
      const gs = this.registry.get("gameState");

      // Drop essence blob sometimes.
      const rng = makeRng(gs.world.seed ^ hash32(String(mon.x + "," + mon.y)));
      if (rng.next() < 0.55) {
        const blob = this.physics.add.image(mon.x, mon.y, "spr_essence");
        blob.setData("kind", "essence");
        blob.setData("amount", 2 + rng.nextRange(0, 3));
        this.pickups.add(blob);
      }

      // Fiber drops for the collaborative quest.
      if (rng.next() < 0.28) {
        const fiber = this.physics.add.image(mon.x + rng.nextRange(-6, 6), mon.y + rng.nextRange(-6, 6), "spr_fiber");
        fiber.setData("kind", "fiber");
        fiber.setData("amount", 1);
        this.pickups.add(fiber);
      }

      // Contribution
      const q = gs.world.world.quest;
      q.playerContribution += 0.22;
      q.communityProgress += 0.16;

      mon.destroy();

      this._maybeAdvanceStory("KILL_MONSTER");
    }

    _pickup(pickup) {
      const gs = this.registry.get("gameState");
      const p = gs.world.player;
      const kind = pickup.getData("kind");

      if (kind === "fiber") {
        const q = gs.world.world.quest;
        const step = q?.steps?.[q.stepIndex];
        const amount = pickup.getData("amount") ?? 1;
        if (step && step.kind === "collect") {
          step.progress = clamp((step.progress ?? 0) + amount, 0, step.required);
          q.playerContribution += amount * 0.35;
          q.communityProgress += amount * 0.12;
          gs.logger.info(`Fibre Lumineuse +${amount} (total ${step.progress}/${step.required})`);
          if (step.progress >= step.required) {
            this._advanceQuestStep();
          }
        } else {
          // If collected out-of-step, convert to a tiny essence bonus.
          p.essence = clamp(p.essence + 1, 0, p.essenceMax);
          p.pale = p.essence < 6;
          gs.logger.info("Fibre Lumineuse récupérée (+1 Essence)." );
        }
      }

      if (kind === "essence") {
        const amount = pickup.getData("amount") ?? 1;
        p.essence = clamp(p.essence + amount, 0, p.essenceMax);
        p.pale = p.essence < 6;
        gs.logger.info(`Essence Chromatique +${amount.toFixed(1)} (Essence: ${p.essence.toFixed(1)})`);
      }

      pickup.destroy();
    }

    _syncQuestActors() {
      const gs = this.registry.get("gameState");
      const q = gs.world.world.quest;
      const step = q?.steps?.[q.stepIndex];
      if (step && step.kind === "protect") {
        this._ensureQuestWorkers();
      } else {
        this._clearWorkers();
      }
    }

    _clearWorkers() {
      if (!this.workers) return;
      this.workers.children.iterate((child) => {
        if (child) child.destroy();
      });
    }

    _ensureQuestWorkers() {
      const gs = this.registry.get("gameState");
      const q = gs.world.world.quest;
      const step = q?.steps?.[q.stepIndex];
      const site = q?.activeSite;
      if (!step || step.kind !== "protect" || !site) return;

      const max = step.workersMax ?? 2;
      const alive = this.workers.countActive(true);
      const need = Math.max(0, max - alive);
      if (need <= 0) return;

      const rng = makeRng(gs.world.seed ^ hash32("workers:" + String(site.x) + ":" + String(site.y)));
      for (let i = 0; i < need; i++) {
        const dx = rng.nextRange(-18, 18);
        const dy = rng.nextRange(-18, 18);
        const w = this.physics.add.image(site.x + dx, site.y + dy, "spr_worker");
        w.setCircle(6, 1, 1);
        w.setImmovable(true);
        w.setData("kind", "worker");
        w.setData("hp", 10);
        w.setData("lastHitAt", 0);
        this.workers.add(w);
      }

      step.workersAlive = this.workers.countActive(true);
    }

    _monsterHitsWorker(mon, worker) {
      const gs = this.registry.get("gameState");
      const w = /** @type {Phaser.Physics.Arcade.Image} */ (worker);
      const m = /** @type {Phaser.Physics.Arcade.Image} */ (mon);

      const now = nowMs();
      const last = w.getData("lastHitAt") ?? 0;
      if (now - last < 420) return;
      w.setData("lastHitAt", now);

      const threat = m.getData("threat") ?? 1;
      const dmg = 0.7 + threat * 0.25;
      const hp = (w.getData("hp") ?? 10) - dmg;
      w.setData("hp", hp);

      // Push the monster away a bit.
      const dx = m.x - w.x;
      const dy = m.y - w.y;
      const len = Math.hypot(dx, dy) || 1;
      m.setVelocity((dx / len) * 120, (dy / len) * 120);

      if (hp <= 0) {
        w.destroy();
        gs.logger.info("Un ouvrier s'effondre. La Trame tremble." );
        const chunk = this._currentChunk();
        if (chunk) chunk.stability = clamp(chunk.stability - 6, 0, 100);
      }
    }

    _spawnQuestWaveIfNeeded(dtMs) {
      const gs = this.registry.get("gameState");
      const q = gs.world.world.quest;
      const step = q?.steps?.[q.stepIndex];
      const site = q?.activeSite;
      if (!step || step.kind !== "protect" || !site) return;

      if (!q._lastWaveAt) q._lastWaveAt = Date.now();
      if (Date.now() - q._lastWaveAt < 6000) return;
      q._lastWaveAt = Date.now();

      // Keep it small: 1–2 monsters near the site.
      const rng = makeRng(gs.world.seed ^ hash32("wave:" + String(Date.now() / 6000)));
      const count = rng.next() < 0.35 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const dist = 210 + rng.nextRange(0, 170);
        const ang = rng.nextRange(0, Math.PI * 2);
        const x = site.x + Math.cos(ang) * dist;
        const y = site.y + Math.sin(ang) * dist;

        const stratum = biomeForWorldPos(gs.world.seed, x, y);
        const localThreat = threatForWorldPos(stratum, x, y);
        const hp = 6 + localThreat * 4 + rng.nextRange(-1, 3);
        const tex = stratum === STRATA.JARDIN ? "spr_monster_jardin" : stratum === STRATA.FORGE ? "spr_monster_forge" : "spr_monster_abime";

        const mon = this.physics.add.image(x, y, tex);
        mon.setCircle(7, 1, 1);
        mon.setData("hp", hp);
        mon.setData("threat", localThreat);
        mon.setData("stratum", stratum);
        mon.setVelocity(rng.nextRange(-40, 40), rng.nextRange(-40, 40));
        mon.setDrag(70, 70);
        mon.setMaxVelocity(180, 180);
        this.monsters.add(mon);
      }
    }

    _advanceQuestStep() {
      const gs = this.registry.get("gameState");
      const q = gs.world.world.quest;

      // Clean up transient actors when leaving protect.
      const prev = q.steps?.[q.stepIndex];
      if (prev?.kind === "protect") {
        this._clearWorkers();
      }

      q.stepIndex += 1;

      if (!Array.isArray(q.steps) || q.stepIndex >= q.steps.length) {
        // Full cycle complete.
        q.completedCount = (q.completedCount ?? 0) + 1;
        q.stepIndex = 0;

        for (const step of q.steps ?? []) {
          if (!step || typeof step !== "object") continue;
          if (step.kind === "collect" || step.kind === "repair") step.progress = 0;
          if (step.kind === "protect") step.progressSeconds = 0;
        }

        // Reward loop.
        const chunk = this._currentChunk();
        if (chunk) chunk.stability = clamp(chunk.stability + 10, 0, 100);
        gs.world.player.essence = clamp(gs.world.player.essence + 6, 0, gs.world.player.essenceMax);
        gs.world.player.pale = gs.world.player.essence < 6;

        // Story progress & world bloom.
        gs.world.story.globalMilestones += 1;
        gs.world.story.stage = clamp(Math.floor(gs.world.story.globalMilestones / 2), 0, 4);
        this._maybeAdvanceStory("QUEST_COMPLETE");

        gs.logger.info("Le Grand Phare respire. Une note nouvelle s'ajoute à ta mélodie." );
      }

      const step = q.steps?.[q.stepIndex];
      if (!step) return;

      if (step.kind === "collect") {
        gs.logger.info("Trame: récolte des Fibres Lumineuses sur les cauchemars." );
      }
      if (step.kind === "protect") {
        step.progressSeconds = 0;
        this._ensureQuestWorkers();
        gs.logger.info("Trame: protège les ouvriers au chantier (reste proche)." );
      }
      if (step.kind === "repair") {
        gs.logger.info("Trame: répare le Phare (F au chantier pour injecter l'Essence)." );
      }
    }

    _findNearestGroupMember(group, maxDist) {
      let best = null;
      let bestD = Infinity;

      group.children.iterate((child) => {
        if (!child) return;
        const d = Math.hypot(child.x - this.player.x, child.y - this.player.y);
        if (d < bestD && d <= maxDist) {
          best = child;
          bestD = d;
        }
      });

      return best;
    }

    _currentChunkKey() {
      const cx = Math.floor(this.player.x / CHUNK_SIZE_PX);
      const cy = Math.floor(this.player.y / CHUNK_SIZE_PX);
      return chunkKey(cx, cy);
    }

    _currentChunk() {
      const gs = this.registry.get("gameState");
      const ck = this._currentChunkKey();
      return gs.world.world.chunks[ck] ?? null;
    }

    _streamWorld(force) {
      const gs = this.registry.get("gameState");

      const cx = Math.floor(this.player.x / CHUNK_SIZE_PX);
      const cy = Math.floor(this.player.y / CHUNK_SIZE_PX);

      const want = new Set();

      for (let dy = -WORLD_VIEW_CHUNKS_RADIUS; dy <= WORLD_VIEW_CHUNKS_RADIUS; dy++) {
        for (let dx = -WORLD_VIEW_CHUNKS_RADIUS; dx <= WORLD_VIEW_CHUNKS_RADIUS; dx++) {
          const k = chunkKey(cx + dx, cy + dy);
          want.add(k);
          if (!this.loadedChunks.has(k) || force) {
            this._ensureChunk(cx + dx, cy + dy);
          }
        }
      }

      // unload far chunks visuals
      for (const [k, value] of this.loadedChunks.entries()) {
        if (!want.has(k)) {
          value.destroy();
          this.loadedChunks.delete(k);
        }
      }

      // Spawn monsters around player based on threat.
      this._spawnMonstersIfNeeded();
    }

    _ensureChunk(cx, cy) {
      const gs = this.registry.get("gameState");
      const k = chunkKey(cx, cy);

      if (!gs.world.world.chunks[k]) {
        const centerX = (cx + 0.5) * CHUNK_SIZE_PX;
        const centerY = (cy + 0.5) * CHUNK_SIZE_PX;
        const stratum = biomeForWorldPos(gs.world.seed, centerX, centerY);
        const threat = threatForWorldPos(stratum, centerX, centerY);

        const rng = makeRng(gs.world.seed ^ hash32(k));
        const stability = clamp(70 - threat * 12 + rng.nextRange(-10, 10), 0, 100);

        const pillar = rng.next() < 0.35 ? {
          x: centerX + rng.nextRange(-90, 90),
          y: centerY + rng.nextRange(-90, 90),
          charge: 0,
          buffActive: false,
        } : null;

        gs.world.world.chunks[k] = {
          cx,
          cy,
          stratum,
          threat,
          stability,
          pillar,
          merchantSeed: rng.nextInt(1_000_000),
        };
      }

      const container = this._buildChunkVisuals(cx, cy, gs.world.world.chunks[k]);
      this.loadedChunks.set(k, container);
    }

    _buildChunkVisuals(cx, cy, chunk) {
      // Build a static tile visual layer for the chunk.
      const container = this.add.container(cx * CHUNK_SIZE_PX, cy * CHUNK_SIZE_PX);
      container.setDepth(-10);

      const rng = makeRng(hash32(`${chunk.cx},${chunk.cy}`) ^ 0x5bd1e995);
      const baseKey = chunk.stratum === STRATA.JARDIN ? "tile_floor_jardin" : chunk.stratum === STRATA.FORGE ? "tile_floor_forge" : "tile_floor_abime";
      const wallKey = chunk.stratum === STRATA.JARDIN ? "tile_wall_jardin" : chunk.stratum === STRATA.FORGE ? "tile_wall_forge" : "tile_wall_abime";
      const veinKey = chunk.stratum === STRATA.JARDIN ? "tile_vein_jardin" : chunk.stratum === STRATA.FORGE ? "tile_vein_forge" : "tile_vein_abime";

      const instability = 1 - chunk.stability / 100;

      for (let ty = 0; ty < CHUNK_SIZE_TILES; ty++) {
        for (let tx = 0; tx < CHUNK_SIZE_TILES; tx++) {
          const x = tx * TILE_SIZE;
          const y = ty * TILE_SIZE;

          const edge = tx === 0 || ty === 0 || tx === CHUNK_SIZE_TILES - 1 || ty === CHUNK_SIZE_TILES - 1;
          const wall = edge && rng.next() < 0.55;

          const base = this.add.image(x + TILE_SIZE / 2, y + TILE_SIZE / 2, wall ? wallKey : baseKey);
          base.setOrigin(0.5, 0.5);
          container.add(base);

          if (!wall && rng.next() < (0.10 + instability * 0.20)) {
            const vein = this.add.image(x + TILE_SIZE / 2, y + TILE_SIZE / 2, veinKey);
            vein.setBlendMode(Phaser.BlendModes.ADD);
            vein.setAlpha(0.25 + rng.next() * 0.25);
            container.add(vein);
          }
        }
      }

      if (chunk.pillar) {
        const p = this.add.image(chunk.pillar.x - cx * CHUNK_SIZE_PX, chunk.pillar.y - cy * CHUNK_SIZE_PX, "spr_pillar");
        p.setBlendMode(Phaser.BlendModes.ADD);
        p.setAlpha(0.95);
        container.add(p);
      }

      return container;
    }

    _spawnNpcClusterNearPlayer() {
      const gs = this.registry.get("gameState");
      const rng = makeRng(gs.world.seed ^ 0x1337);

      const spawn = (dx, dy, texture, kind, data = {}) => {
        const npc = this.physics.add.image(this.player.x + dx, this.player.y + dy, texture);
        npc.setCircle(7, 1, 1);
        npc.setImmovable(true);
        npc.setData("kind", kind);
        for (const [k, v] of Object.entries(data)) npc.setData(k, v);
        this.npcs.add(npc);
        return npc;
      };

      spawn(70, -40, "spr_npc_quest", "questgiver", { line: "La Trame se déchire. Répare-la, Éveilleur." });
      spawn(-80, 50, "spr_npc_merchant", "merchant", { line: "L'Essence circule. Mais à quel prix..." });
      spawn(20, 90, "spr_npc_wander", "wanderer", { line: "J'ai vu l'Abîme avaler les couleurs." });

      // A small ally guard
      const guard = spawn(130, 60, "spr_npc_guard", "guard", { line: "Je protège le chantier. Les cauchemars rôdent." });
      guard.setData("patrol", { x0: guard.x - 30, y0: guard.y - 30, x1: guard.x + 30, y1: guard.y + 30, t: rng.next() * 10 });
    }

    _spawnMonstersIfNeeded() {
      const gs = this.registry.get("gameState");
      const maxMonsters = 18;
      if (this.monsters.countActive(true) >= maxMonsters) return;

      const danger = this._dangerState();
      const threat = danger.threat;

      const rng = makeRng(gs.world.seed ^ hash32(String(Math.floor(this.player.x) + "," + Math.floor(this.player.y))));

      const spawnCount = rng.next() < 0.35 ? 2 : 1;
      for (let i = 0; i < spawnCount; i++) {
        const dist = 220 + rng.nextRange(0, 280);
        const angle = rng.nextRange(0, Math.PI * 2);

        const x = this.player.x + Math.cos(angle) * dist;
        const y = this.player.y + Math.sin(angle) * dist;

        const stratum = biomeForWorldPos(gs.world.seed, x, y);
        const localThreat = threatForWorldPos(stratum, x, y);
        const hp = 6 + localThreat * 4 + rng.nextRange(-1, 3);

        const tex = stratum === STRATA.JARDIN ? "spr_monster_jardin" : stratum === STRATA.FORGE ? "spr_monster_forge" : "spr_monster_abime";

        const mon = this.physics.add.image(x, y, tex);
        mon.setCircle(7, 1, 1);
        mon.setData("hp", hp);
        mon.setData("threat", localThreat);
        mon.setData("stratum", stratum);

        // Slight random drift
        const vx = rng.nextRange(-40, 40);
        const vy = rng.nextRange(-40, 40);
        mon.setVelocity(vx, vy);
        mon.setDrag(70, 70);
        mon.setMaxVelocity(180, 180);

        this.monsters.add(mon);
      }
    }

    _aiTick() {
      const gs = this.registry.get("gameState");

      // NPC patrols
      this.npcs.children.iterate((child) => {
        if (!child) return;
        const kind = child.getData("kind");
        if (kind !== "guard") return;

        const patrol = child.getData("patrol");
        if (!patrol) return;
        patrol.t += 0.016;
        const tx = Phaser.Math.Linear(patrol.x0, patrol.x1, (Math.sin(patrol.t) + 1) / 2);
        const ty = Phaser.Math.Linear(patrol.y0, patrol.y1, (Math.cos(patrol.t) + 1) / 2);
        const dx = tx - child.x;
        const dy = ty - child.y;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          child.x += (dx / len) * 0.6;
          child.y += (dy / len) * 0.6;
        }
      });

      // Monsters aggro
      this.monsters.children.iterate((child) => {
        if (!child) return;
        const mon = /** @type {Phaser.Physics.Arcade.Image} */ (child);
        const d = Math.hypot(mon.x - this.player.x, mon.y - this.player.y);

        const threat = mon.getData("threat") ?? 1;
        const aggroDist = 180 + threat * 25;

        if (d < aggroDist) {
          const dx = this.player.x - mon.x;
          const dy = this.player.y - mon.y;
          const len = Math.hypot(dx, dy) || 1;
          const sp = 70 + threat * 22;
          mon.setAcceleration((dx / len) * sp * 7, (dy / len) * sp * 7);
        } else {
          mon.setAcceleration(0, 0);
        }
      });
    }

    _tickQuestSim() {
      const gs = this.registry.get("gameState");
      const q = gs.world.world.quest;

      const now = Date.now();
      const dt = Math.min(15000, now - q.lastTickAt);
      q.lastTickAt = now;

      // Community sim contributes deterministically over time.
      const ck = this._currentChunkKey();
      const chunk = gs.world.world.chunks[ck] ?? null;
      const instability = chunk ? (1 - chunk.stability / 100) : 0.3;

      const communityRatePerSec = 0.10 + instability * 0.16;
      q.communityProgress += communityRatePerSec * (dt / 1000);

      // Degradation: nearby chunk stability slowly goes down unless pillar buff active.
      if (chunk) {
        const degrade = chunk.pillar?.buffActive ? 0.003 : 0.012;
        chunk.stability = clamp(chunk.stability - degrade * (dt / 1000) * (10 + chunk.threat * 4), 0, 100);
      }

      // Step-specific simulation.
      const step = q.steps?.[q.stepIndex];
      if (step && step.kind === "protect") {
        this._ensureQuestWorkers();
        step.workersAlive = this.workers.countActive(true);

        const site = q.activeSite;
        const near = site ? Math.hypot(site.x - this.player.x, site.y - this.player.y) < 260 : false;
        if (near && step.workersAlive > 0) {
          step.progressSeconds = clamp((step.progressSeconds ?? 0) + dt / 1000, 0, step.requiredSeconds);
          this._spawnQuestWaveIfNeeded(dt);
          if (step.progressSeconds >= step.requiredSeconds) {
            this._advanceQuestStep();
          }
        }
      }

      // Quest completion reward loop.
      if (q.communityProgress >= q.communityRequired) {
        q.communityProgress -= q.communityRequired;
        q.communityRequired = Math.floor(clamp(q.communityRequired * 1.08 + 8, 100, 220));
        q.playerContribution *= 0.5;
        gs.logger.info("La Trame se stabilise. Le monde respire.");

        // Story progress & world bloom.
        gs.world.story.globalMilestones += 1;
        gs.world.story.stage = clamp(Math.floor(gs.world.story.globalMilestones / 2), 0, 4);

        // Slight global essence reward.
        gs.world.player.essence = clamp(gs.world.player.essence + 5, 0, gs.world.player.essenceMax);

        this._maybeAdvanceStory("QUEST_COMPLETE");
      }
    }

    _maybeAdvanceStory(reason) {
      const gs = this.registry.get("gameState");
      // All zones accessible, but narrative milestones tune audio and log.
      const m = gs.world.story.globalMilestones;

      if (reason === "QUEST_COMPLETE") {
        if (m === 1) gs.logger.info("Histoire: Lumina vacille. Les Dissidents murmurent.");
        if (m === 3) gs.logger.info("Histoire: La Forge de l'Abstraction gronde sous tes pas.");
        if (m === 6) gs.logger.info("Histoire: L'Abîme des Peurs te reconnaît.");
        if (m === 9) gs.logger.info("Histoire: Ta Note résonne avec celles des autres Éveilleurs... (un jour)." );
      }

      // Update audio state with current stratum and stage.
      const stratum = biomeForWorldPos(gs.world.seed, this.player.x, this.player.y);
      gs.audio.setStoryProgress({ stratum, stage: gs.world.story.stage });
      gs.ui.setStoryBadge(gs.world.story);
    }
  }

  class UIScene extends Phaser.Scene {
    constructor() {
      super({ key: "UIScene" });
    }

    create() {
      // No canvas UI; HTML HUD is used.
    }
  }

  class PauseScene extends Phaser.Scene {
    constructor() {
      super({ key: "PauseScene" });
    }

    create() {
      const txt = this.add.text(20, 20, "Pause — Échap pour reprendre", {
        fontFamily: "monospace",
        fontSize: 16,
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.55)",
        padding: { x: 8, y: 6 },
      });
      txt.setScrollFactor(0);

      this.input.keyboard.once("keydown-ESC", () => {
        this.scene.stop();
        this.scene.resume("WorldScene");
        this.scene.resume("UIScene");
      });
    }
  }

  // -------- Placeholder textures --------

  function generatePlaceholderTextures(scene) {
    const g = scene.add.graphics();

    const makeTile = (key, baseColor, accentColor, vein = false) => {
      g.clear();
      g.fillStyle(baseColor, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      // noise dots
      g.fillStyle(0x000000, 0.12);
      for (let i = 0; i < 10; i++) {
        const x = (i * 7) % TILE_SIZE;
        const y = (i * 11) % TILE_SIZE;
        g.fillRect(x, y, 1, 1);
      }

      if (vein) {
        g.lineStyle(2, accentColor, 0.65);
        g.beginPath();
        g.moveTo(2, 12);
        g.lineTo(6, 8);
        g.lineTo(11, 10);
        g.lineTo(14, 5);
        g.strokePath();
      } else {
        g.lineStyle(1, accentColor, 0.18);
        g.strokeRect(0.5, 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      }

      g.generateTexture(key, TILE_SIZE, TILE_SIZE);
    };

    const makeWall = (key, baseColor, edgeColor) => {
      g.clear();
      g.fillStyle(baseColor, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      g.fillStyle(edgeColor, 0.25);
      g.fillRect(0, 0, TILE_SIZE, 3);
      g.fillRect(0, 0, 3, TILE_SIZE);
      g.fillStyle(0x000000, 0.22);
      g.fillRect(0, TILE_SIZE - 3, TILE_SIZE, 3);
      g.fillRect(TILE_SIZE - 3, 0, 3, TILE_SIZE);
      g.generateTexture(key, TILE_SIZE, TILE_SIZE);
    };

    // Jardin palette
    makeTile("tile_floor_jardin", 0x0b1022, 0x00ffc8, false);
    makeWall("tile_wall_jardin", 0x090a10, 0x00ffc8);
    makeTile("tile_vein_jardin", 0x000000, 0x00ffc8, true);

    // Forge palette
    makeTile("tile_floor_forge", 0x120a16, 0xffb000, false);
    makeWall("tile_wall_forge", 0x0b0a0f, 0xffb000);
    makeTile("tile_vein_forge", 0x000000, 0xffb000, true);

    // Abime palette
    makeTile("tile_floor_abime", 0x05040a, 0xff4df2, false);
    makeWall("tile_wall_abime", 0x05040a, 0xff4df2);
    makeTile("tile_vein_abime", 0x000000, 0xff4df2, true);

    const makeSprite = (key, bodyColor, glowColor, kind) => {
      const size = 18;
      g.clear();
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, size, size);

      g.fillStyle(bodyColor, 1);
      g.fillRoundedRect(3, 4, 12, 12, 3);
      g.fillStyle(glowColor, 0.8);
      g.fillRect(6, 6, 6, 2);

      if (kind === "monster") {
        g.fillStyle(glowColor, 0.6);
        g.fillRect(5, 11, 8, 2);
      }

      g.generateTexture(key, size, size);
    };

    makeSprite("spr_player", 0x1e2a4a, 0x00ffc8, "player");

    makeSprite("spr_npc_quest", 0x1a2442, 0x7fffd4, "npc");
    makeSprite("spr_npc_merchant", 0x1a2442, 0xffd27f, "npc");
    makeSprite("spr_npc_wander", 0x1a2442, 0xff7fe8, "npc");
    makeSprite("spr_npc_guard", 0x1a2442, 0xa8ff7f, "npc");

    makeSprite("spr_monster_jardin", 0x151022, 0x00ffc8, "monster");
    makeSprite("spr_monster_forge", 0x151022, 0xffb000, "monster");
    makeSprite("spr_monster_abime", 0x151022, 0xff4df2, "monster");

    makeSprite("spr_worker", 0x1a2442, 0xb4ff8a, "npc");

    // Quest site marker
    g.clear();
    g.fillStyle(0x05040a, 0);
    g.fillRect(0, 0, 26, 26);
    g.fillStyle(0x00ffc8, 0.35);
    g.fillCircle(13, 13, 11);
    g.lineStyle(2, 0x00ffc8, 0.85);
    g.strokeCircle(13, 13, 11);
    g.lineStyle(2, 0xffffff, 0.25);
    g.beginPath();
    g.moveTo(13, 6);
    g.lineTo(13, 20);
    g.moveTo(6, 13);
    g.lineTo(20, 13);
    g.strokePath();
    g.generateTexture("spr_site", 26, 26);

    // Fiber pickup
    g.clear();
    g.fillStyle(0x00ffc8, 0.75);
    g.fillRect(2, 2, 2, 10);
    g.fillRect(6, 1, 2, 12);
    g.fillRect(10, 3, 2, 9);
    g.lineStyle(1, 0xffffff, 0.18);
    g.strokeRect(1.5, 1.5, 12, 12);
    g.generateTexture("spr_fiber", 14, 14);

    // Essence blob
    g.clear();
    g.fillStyle(0x00ffc8, 0.9);
    g.fillCircle(8, 8, 6);
    g.lineStyle(2, 0xffffff, 0.18);
    g.strokeCircle(8, 8, 6);
    g.generateTexture("spr_essence", 16, 16);

    // Pillar
    g.clear();
    g.fillStyle(0x0b0a12, 1);
    g.fillRoundedRect(3, 3, 20, 26, 4);
    g.fillStyle(0x00ffc8, 0.5);
    g.fillRoundedRect(7, 8, 12, 16, 3);
    g.generateTexture("spr_pillar", 26, 32);

    g.destroy();
  }

  // -------- Weapons + combat --------

  function buildWeaponIndex() {
    const list = Array.isArray(window.SOPOR_WEAPONS) ? window.SOPOR_WEAPONS : [];
    const byId = new Map();
    for (const w of list) {
      byId.set(w.id, w);
    }
    return {
      list,
      getWeapon(id) {
        return byId.get(id) ?? null;
      },
    };
  }

  function makeCombatSystem(gs) {
    function spawnProjectile(scene, origin, dir, weapon, overrides = {}) {
      const p = scene.physics.add.image(origin.x, origin.y, "spr_essence");
      p.setCircle(7, 1, 1);
      p.setBlendMode(Phaser.BlendModes.ADD);
      p.setAlpha(0.85);

      const speed = overrides.speed ?? weapon.projectile?.speed ?? 380;
      const ttlMs = overrides.ttlMs ?? weapon.projectile?.ttlMs ?? 900;
      const dmg = overrides.damage ?? weapon.damage ?? 4;
      const pierce = overrides.pierce ?? weapon.projectile?.pierce ?? 0;

      p.setData("damage", dmg);
      p.setData("pierce", pierce);
      p.setData("bornAt", nowMs());
      p.setData("ttlMs", ttlMs);

      p.setVelocity(dir.x * speed, dir.y * speed);

      scene.projectiles.add(p);

      // lifetime
      scene.time.delayedCall(ttlMs, () => {
        if (p.active) p.destroy();
      });

      return p;
    }

    function meleeArc(scene, weapon, playerSprite, aim) {
      const reach = weapon.reach ?? 34;
      const arcDeg = weapon.arcDeg ?? 90;

      const hitPos = { x: playerSprite.x + aim.x * reach, y: playerSprite.y + aim.y * reach };

      // Visual swipe
      const fx = scene.add.image(hitPos.x, hitPos.y, "spr_essence");
      fx.setScale(1.2);
      fx.setBlendMode(Phaser.BlendModes.ADD);
      fx.setAlpha(0.55);
      scene.tweens.add({ targets: fx, alpha: 0, duration: 160, onComplete: () => fx.destroy() });

      // Damage monsters in cone.
      scene.monsters.children.iterate((child) => {
        if (!child) return;
        const mon = /** @type {Phaser.Physics.Arcade.Image} */ (child);
        const dx = mon.x - playerSprite.x;
        const dy = mon.y - playerSprite.y;
        const dist = Math.hypot(dx, dy);
        if (dist > reach + 18) return;

        const ang = Math.atan2(dy, dx);
        const aimAng = Math.atan2(aim.y, aim.x);
        const delta = Phaser.Math.Angle.Wrap(ang - aimAng);
        const deg = Math.abs(delta) * (180 / Math.PI);
        if (deg > arcDeg / 2) return;

        // hit
        const dmg = weapon.damage ?? 6;
        mon.setData("hp", (mon.getData("hp") ?? 6) - dmg);
        if ((mon.getData("hp") ?? 0) <= 0) {
          scene._killMonster(mon);
        }

        const kb = weapon.knockback ?? 120;
        const len = dist || 1;
        mon.setVelocity((dx / len) * kb, (dy / len) * kb);
      });
    }

    function meleeThrust(scene, weapon, playerSprite, aim) {
      const reach = weapon.reach ?? 54;
      const hitPos = { x: playerSprite.x + aim.x * reach, y: playerSprite.y + aim.y * reach };

      const fx = scene.add.image(hitPos.x, hitPos.y, "spr_essence");
      fx.setScale(0.9);
      fx.setBlendMode(Phaser.BlendModes.ADD);
      fx.setAlpha(0.55);
      scene.tweens.add({ targets: fx, alpha: 0, duration: 140, onComplete: () => fx.destroy() });

      // narrow line hit
      scene.monsters.children.iterate((child) => {
        if (!child) return;
        const mon = /** @type {Phaser.Physics.Arcade.Image} */ (child);
        const dx = mon.x - playerSprite.x;
        const dy = mon.y - playerSprite.y;
        const dist = Math.hypot(dx, dy);
        if (dist > reach + 12) return;

        const dot = (dx * aim.x + dy * aim.y) / (dist || 1);
        if (dot < 0.9) return;

        const dmg = weapon.damage ?? 7;
        mon.setData("hp", (mon.getData("hp") ?? 6) - dmg);
        if ((mon.getData("hp") ?? 0) <= 0) scene._killMonster(mon);
      });
    }

    function meleeSlam(scene, weapon, playerSprite) {
      const radius = weapon.radius ?? 44;
      const fx = scene.add.image(playerSprite.x, playerSprite.y, "spr_essence");
      fx.setScale(2.0);
      fx.setBlendMode(Phaser.BlendModes.ADD);
      fx.setAlpha(0.5);
      scene.tweens.add({ targets: fx, alpha: 0, duration: 220, onComplete: () => fx.destroy() });

      scene.monsters.children.iterate((child) => {
        if (!child) return;
        const mon = /** @type {Phaser.Physics.Arcade.Image} */ (child);
        const d = Math.hypot(mon.x - playerSprite.x, mon.y - playerSprite.y);
        if (d > radius) return;

        const dmg = weapon.damage ?? 12;
        mon.setData("hp", (mon.getData("hp") ?? 8) - dmg);
        if ((mon.getData("hp") ?? 0) <= 0) scene._killMonster(mon);

        const kb = weapon.knockback ?? 180;
        const dx = mon.x - playerSprite.x;
        const dy = mon.y - playerSprite.y;
        const len = d || 1;
        mon.setVelocity((dx / len) * kb, (dy / len) * kb);
      });
    }

    function meleeWhip(scene, weapon, playerSprite, aim) {
      const reach = weapon.reach ?? 70;
      const hitPos = { x: playerSprite.x + aim.x * reach, y: playerSprite.y + aim.y * reach };

      const fx = scene.add.image(hitPos.x, hitPos.y, "spr_essence");
      fx.setScale(0.8);
      fx.setBlendMode(Phaser.BlendModes.ADD);
      fx.setAlpha(0.45);
      scene.tweens.add({ targets: fx, alpha: 0, duration: 160, onComplete: () => fx.destroy() });

      scene.monsters.children.iterate((child) => {
        if (!child) return;
        const mon = /** @type {Phaser.Physics.Arcade.Image} */ (child);
        const dx = mon.x - playerSprite.x;
        const dy = mon.y - playerSprite.y;
        const dist = Math.hypot(dx, dy);
        if (dist > reach + 14) return;

        const dot = (dx * aim.x + dy * aim.y) / (dist || 1);
        if (dot < 0.6) return;

        const dmg = weapon.damage ?? 7;
        mon.setData("hp", (mon.getData("hp") ?? 6) - dmg);
        if ((mon.getData("hp") ?? 0) <= 0) scene._killMonster(mon);

        // Pull towards player a bit
        const pull = 90;
        mon.setVelocity((-dx / (dist || 1)) * pull, (-dy / (dist || 1)) * pull);
      });
    }

    function projectileSimple(scene, weapon, playerSprite, aim, kind) {
      const origin = { x: playerSprite.x + aim.x * 18, y: playerSprite.y + aim.y * 18 };
      const spread = weapon.projectile?.spreadDeg ?? 0;
      const rng = makeRng(gs.world.seed ^ hash32(`${kind}:${Math.floor(origin.x)}:${Math.floor(origin.y)}`));

      const deg = (rng.nextRange(-spread, spread) * Math.PI) / 180;
      const cs = Math.cos(deg);
      const sn = Math.sin(deg);
      const dir = { x: aim.x * cs - aim.y * sn, y: aim.x * sn + aim.y * cs };

      spawnProjectile(scene, origin, dir, weapon);
    }

    function projectileBoomerang(scene, weapon, playerSprite, aim) {
      const origin = { x: playerSprite.x + aim.x * 18, y: playerSprite.y + aim.y * 18 };
      const proj = spawnProjectile(scene, origin, aim, weapon, { ttlMs: weapon.projectile?.ttlMs ?? 950 });

      // Return to player mid-flight.
      scene.time.delayedCall(380, () => {
        if (!proj.active) return;
        const dx = playerSprite.x - proj.x;
        const dy = playerSprite.y - proj.y;
        const len = Math.hypot(dx, dy) || 1;
        const speed = weapon.projectile?.speed ?? 420;
        proj.setVelocity((dx / len) * speed, (dy / len) * speed);
      });
    }

    function projectileBurst(scene, weapon, playerSprite, aim) {
      const count = weapon.burst?.count ?? 4;
      const stepMs = weapon.burst?.stepMs ?? 50;
      for (let i = 0; i < count; i++) {
        scene.time.delayedCall(i * stepMs, () => {
          if (!scene.player?.active) return;
          projectileSimple(scene, weapon, playerSprite, aim, "burst");
        });
      }
    }

    function hybridArcOrb(scene, weapon, playerSprite, aim) {
      // do a small melee arc and fire an orb
      meleeArc(scene, weapon, playerSprite, aim);
      projectileSimple(scene, weapon, playerSprite, aim, "orb");
    }

    return {
      fireWeapon({ scene, weapon, playerSprite, aim }) {
        switch (weapon.behaviorId) {
          case "melee_arc":
            meleeArc(scene, weapon, playerSprite, aim);
            break;
          case "melee_thrust":
            meleeThrust(scene, weapon, playerSprite, aim);
            break;
          case "melee_slam":
            meleeSlam(scene, weapon, playerSprite);
            break;
          case "melee_whip":
            meleeWhip(scene, weapon, playerSprite, aim);
            break;
          case "projectile_arrow":
          case "projectile_bolt":
          case "projectile_pebble":
          case "projectile_orb":
          case "projectile_cannon":
            projectileSimple(scene, weapon, playerSprite, aim, weapon.behaviorId);
            break;
          case "projectile_boomerang":
            projectileBoomerang(scene, weapon, playerSprite, aim);
            break;
          case "projectile_burst":
            projectileBurst(scene, weapon, playerSprite, aim);
            break;
          case "hybrid_arc_orb":
            hybridArcOrb(scene, weapon, playerSprite, aim);
            break;
          default:
            meleeArc(scene, weapon, playerSprite, aim);
            break;
        }
      },
    };
  }

  function computeMerchantOffer(gs, chunk) {
    const weapons = gs.weapons.list;
    const p = gs.world.player;

    const stratum = chunk?.stratum ?? STRATA.JARDIN;
    const threat = chunk?.threat ?? 1;
    const stability = chunk?.stability ?? 60;

    const rng = makeRng(hash32(`${chunk?.cx ?? 0},${chunk?.cy ?? 0}`) ^ (chunk?.merchantSeed ?? 0));

    // Price dynamics: more unstable and more dangerous => pricier.
    const instability = 1 - clamp(stability / 100, 0, 1);
    const threatFactor = 0.9 + clamp(threat / 3.2, 0, 1.4);
    const stabilityFactor = 0.85 + instability * 1.2;

    // Pick a weapon not already owned, biased by stratum.
    const owned = new Set(p.inventory.weapons);

    const candidates = weapons.filter((w) => !owned.has(w.id));
    if (candidates.length === 0) {
      return { weaponId: null, price: Infinity };
    }

    let pool = candidates;
    if (stratum === STRATA.JARDIN) {
      pool = candidates.filter((w) => w.rarity !== "epic") || candidates;
    } else if (stratum === STRATA.ABIME) {
      pool = candidates;
    }

    const chosen = pool[rng.nextInt(pool.length)];
    const base = 6 + (chosen.rarity === "common" ? 0 : chosen.rarity === "uncommon" ? 5 : chosen.rarity === "rare" ? 11 : 20);
    const price = clamp(base * stabilityFactor * threatFactor + rng.nextRange(-1.2, 1.2), 2, 60);

    return { weaponId: chosen.id, price };
  }

  // -------- Boot the whole page --------

  function main() {
    const ui = createRootUi();
    const logger = makeLogger(ui.log);
    const audio = makeAudioEngine();

    const weapons = buildWeaponIndex();

    const gs = {
      ui: {
        setUserBadge(text) {
          if (ui.userBadge) ui.userBadge.textContent = text;
        },
        setNoteBadge(text) {
          if (ui.noteBadge) ui.noteBadge.textContent = text;
        },
        setStoryBadge(story) {
          if (!ui.storyBadge) return;
          ui.storyBadge.textContent = `Histoire: jalons ${story.globalMilestones} • stage ${story.stage}`;
        },
        renderHud(h) {
          if (!ui.hud) return;
          const pale = h.pale ? "Oui" : "Non";
          const q = h.quest;

          const cProgress = clamp((q.communityProgress / q.communityRequired) * 100, 0, 100);

          const step = q.steps?.[q.stepIndex] ?? null;
          let stepLine = q.stepText ?? "—";
          if (step?.kind === "collect") stepLine += ` • ${step.progress}/${step.required}`;
          if (step?.kind === "repair") stepLine += ` • ${step.progress.toFixed(1)}/${step.required}`;
          if (step?.kind === "protect") stepLine += ` • ${Math.floor(step.progressSeconds)}/${step.requiredSeconds}s • ouvriers ${step.workersAlive ?? 0}/${step.workersMax ?? 0}`;

          ui.hud.innerHTML = `
            <div class="card sopor-hudCard">
              <div class="card-body">
                <div><b>PV</b> ${h.hp.toFixed(0)}/${h.hpMax.toFixed(0)} • <b>Essence</b> ${h.essence.toFixed(1)}/${h.essenceMax.toFixed(0)} • <b>Pâle</b> ${pale}</div>
                <div><b>Arme</b> ${escapeHtml(h.weaponName)} (${escapeHtml(h.weaponType)})</div>
                <div><b>Strate</b> ${escapeHtml(h.stratum)} • <b>Menace</b> ${h.threat.toFixed(2)} • <b>Stabilité</b> ${h.stability.toFixed(0)}%</div>
                <div><b>Trame</b> ${escapeHtml(q.title)} • <b>Étape</b> ${escapeHtml(stepLine)}</div>
                <div><b>Communauté</b> ${q.communityProgress.toFixed(1)}/${q.communityRequired} (${cProgress.toFixed(0)}%) • <b>Contribution</b> ${q.playerContribution.toFixed(1)}</div>
              </div>
            </div>
          `;
        },
        renderMinimap(m) {
          if (!ui.minimap) return;
          const ctx = ui.minimap.getContext("2d");
          if (!ctx) return;

          const w = ui.minimap.width;
          const h = ui.minimap.height;
          const cx = w / 2;
          const cy = h / 2;

          ctx.clearRect(0, 0, w, h);

          // Background by stratum
          const bg = m.stratum === STRATA.JARDIN ? "#050c14" : m.stratum === STRATA.FORGE ? "#120a16" : "#05040a";
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, w, h);

          // View radius in world units
          const viewR = 520;
          const toMini = (x, y) => {
            const dx = x - m.player.x;
            const dy = y - m.player.y;
            return {
              x: cx + (dx * cx) / viewR,
              y: cy + (dy * cy) / viewR,
            };
          };

          // Site
          if (m.site) {
            const p = toMini(m.site.x, m.site.y);
            ctx.fillStyle = "rgba(0,255,200,0.85)";
            ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 4, 4);
          }

          // Entities
          for (const e of m.entities ?? []) {
            const p = toMini(e.x, e.y);
            const x = Math.round(p.x);
            const y = Math.round(p.y);
            if (x < 0 || y < 0 || x >= w || y >= h) continue;
            if (e.kind === "monster") ctx.fillStyle = "rgba(255,77,242,0.9)";
            else if (e.kind === "worker") ctx.fillStyle = "rgba(180,255,138,0.9)";
            else ctx.fillStyle = "rgba(127,255,212,0.85)";
            ctx.fillRect(x, y, 2, 2);
          }

          // Player always centered
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3);

          // Tiny threat hint bar
          const t = clamp(m.threat / 4.2, 0, 1);
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          ctx.fillRect(6, h - 10, w - 12, 4);
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.fillRect(6, h - 10, Math.max(2, (w - 12) * t), 4);
        },
        renderDanger(d) {
          if (!ui.danger) return;
          ui.danger.dataset.level = d.level;
          ui.danger.textContent = `Danger: ${d.level.toUpperCase()} • ${d.stratum} • ${d.threat.toFixed(2)}`;
        },
      },
      logger,
      audio,
      weapons,
      combat: null,
      world: null,
      _lastAutoSaveAt: 0,
      _facing: { x: 1, y: 0 },
    };

    gs.combat = makeCombatSystem(gs);

    let game = null;

    function requireUsername() {
      const norm = normalizeUsername(ui.usernameInput.value);
      if (!norm) {
        logger.info("Pseudo requis.");
        return null;
      }
      return norm;
    }

    function updateBadges(usernameNorm) {
      gs.ui.setUserBadge(`Pseudo: ${usernameNorm}`);
      const pc = audio.getSignatureNote(usernameNorm);
      gs.ui.setNoteBadge(`Note: ${pc}`);
      if (gs.world) gs.ui.setStoryBadge(gs.world.story);
    }

    function startPhaserIfNeeded() {
      if (game) return;

      const config = {
        type: Phaser.CANVAS,
        canvas: ui.canvas,
        backgroundColor: "#05040a",
        pixelArt: true,
        antialias: false,
        physics: {
          default: "arcade",
          arcade: {
            debug: false,
            gravity: { x: 0, y: 0 },
          },
        },
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [BootScene, PreloadScene, TitleScene, WorldScene, UIScene, PauseScene],
      };

      game = new Phaser.Game(config);
      game.registry.set("gameState", gs);
    }

    function startGameFlow() {
      const usernameNorm = requireUsername();
      if (!usernameNorm) return;

      updateBadges(usernameNorm);

      audio.configureForUsername(usernameNorm);

      // Load existing or create new world
      gs.world = loadSave(usernameNorm) ?? defaultWorldState(usernameNorm);

      // Update story badge
      gs.ui.setStoryBadge(gs.world.story);

      startPhaserIfNeeded();

      // Start audio after a user gesture (this click). Safe for iframe policies.
      const settings = audio.loadSettings();
      const res = audio.start(settings.volume);
      if (!res.ok) {
        logger.info("Audio: " + res.reason);
      }

      // Jump to world
      const scene = game.scene.getScene("WorldScene");
      if (scene && scene.scene) {
        game.scene.stop("TitleScene");
        game.scene.start("WorldScene");
      }

      logger.info("Démarrage du monde... explore les strates, mais attention au danger.");
    }

    function loadOnly() {
      const usernameNorm = requireUsername();
      if (!usernameNorm) return;
      updateBadges(usernameNorm);

      const save = loadSave(usernameNorm);
      if (!save) {
        logger.info("Aucune sauvegarde pour ce pseudo.");
        return;
      }
      gs.world = save;
      gs.ui.setStoryBadge(gs.world.story);
      logger.info("Sauvegarde chargée. Clique sur Démarrer.");
    }

    function deleteSave() {
      const usernameNorm = requireUsername();
      if (!usernameNorm) return;
      localStorage.removeItem(saveKeyForUsernameNorm(usernameNorm));
      logger.info("Sauvegarde supprimée pour ce pseudo.");
    }

    function hardReset() {
      // Only clears this app's keys.
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`ezg:${APP_ID}:`)) keys.push(k);
      }
      for (const k of keys) localStorage.removeItem(k);
      logger.info("Reset local effectué (clés sopor supprimées)." );
    }

    ui.btnStart.addEventListener("click", startGameFlow);
    ui.btnLoad.addEventListener("click", loadOnly);
    ui.btnDeleteSave.addEventListener("click", deleteSave);
    ui.btnHardReset.addEventListener("click", hardReset);

    ui.usernameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        startGameFlow();
      }
    });

    // Initial log
    logger.info("Sopor prêt. Offline-only. Phaser requis.");
    logger.info("Astuce: injecte l'Essence dans les Piliers pour stabiliser la zone (F proche du pilier)." );

    // Initial badges
    gs.ui.setUserBadge("Pseudo: —");
    gs.ui.setNoteBadge("Note: —");
    if (ui.storyBadge) ui.storyBadge.textContent = "Histoire: —";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
