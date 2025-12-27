/* global Phaser, window */

(() => {
  "use strict";

  const APP_ID = "com.ezgalaxy.sopor";
  const SAVE_SCHEMA = 1;

  const TILE_SIZE = 16;
  const CHUNK_SIZE_TILES = 24; // 24x24 tiles per chunk
  const CHUNK_SIZE_PX = TILE_SIZE * CHUNK_SIZE_TILES;

  // Finite world (square bounds). Keeps exploration big but not infinite.
  const WORLD_RADIUS_PX = 2600;
  const WORLD_MIN = -WORLD_RADIUS_PX;
  const WORLD_MAX = WORLD_RADIUS_PX;
  const WORLD_MAX_CHUNK = Math.ceil(WORLD_RADIUS_PX / CHUNK_SIZE_PX);

  // Dungeon pocket (separate bounds, room-based). Uses same tile/chunk renderer.
  const DUNGEON_SIZE_TILES = 96; // 96x96 tiles
  const DUNGEON_SIZE_PX = DUNGEON_SIZE_TILES * TILE_SIZE;
  const DUNGEON_HALF_PX = Math.floor(DUNGEON_SIZE_PX / 2);
  const DUNGEON_MIN = -DUNGEON_HALF_PX;
  const DUNGEON_MAX = DUNGEON_HALF_PX;
  const DUNGEON_MAX_CHUNK = Math.ceil(DUNGEON_HALF_PX / CHUNK_SIZE_PX);

  const WORLD_VIEW_CHUNKS_RADIUS = 2; // loads (2r+1)^2 chunks

  const BASE_MOVE_SPEED = 120;
  const PLAYER_RADIUS = 7;

  const MAX_LOG_LINES = 120;

  const STRATA = {
    JARDIN: "JARDIN",
    FORGE: "FORGE",
    ABIME: "ABIME",
    DUNGEON: "DONJON",
  };

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function clampWorldX(x) {
    return clamp(x, WORLD_MIN + 16, WORLD_MAX - 16);
  }

  function clampWorldY(y) {
    return clamp(y, WORLD_MIN + 16, WORLD_MAX - 16);
  }

  function clampDungeonX(x) {
    return clamp(x, DUNGEON_MIN + 16, DUNGEON_MAX - 16);
  }

  function clampDungeonY(y) {
    return clamp(y, DUNGEON_MIN + 16, DUNGEON_MAX - 16);
  }

  function isChunkInWorld(cx, cy) {
    return cx >= -WORLD_MAX_CHUNK && cx <= WORLD_MAX_CHUNK && cy >= -WORLD_MAX_CHUNK && cy <= WORLD_MAX_CHUNK;
  }

  function isChunkInDungeon(cx, cy) {
    return cx >= -DUNGEON_MAX_CHUNK && cx <= DUNGEON_MAX_CHUNK && cy >= -DUNGEON_MAX_CHUNK && cy <= DUNGEON_MAX_CHUNK;
  }

  function addInventoryItem(player, id, name, qty) {
    const p = player;
    if (!p?.inventory) return;
    if (!Array.isArray(p.inventory.items)) p.inventory.items = [];
    const q = Math.max(0, Number(qty ?? 0) || 0);
    if (q <= 0) return;
    const found = p.inventory.items.find((it) => it && it.id === id);
    if (found) {
      found.qty = (Number(found.qty ?? 0) || 0) + q;
      if (!found.name) found.name = name;
    } else {
      p.inventory.items.push({ id, name, qty: q });
    }
  }

  function countInventoryItem(player, id) {
    const items = player?.inventory?.items;
    if (!Array.isArray(items)) return 0;
    const found = items.find((it) => it && it.id === id);
    return Number(found?.qty ?? 0) || 0;
  }

  function consumeInventoryItem(player, id, qty) {
    const items = player?.inventory?.items;
    if (!Array.isArray(items)) return false;
    const need = Math.max(0, Number(qty ?? 0) || 0);
    if (need <= 0) return true;
    const found = items.find((it) => it && it.id === id);
    const have = Number(found?.qty ?? 0) || 0;
    if (!found || have < need) return false;
    found.qty = have - need;
    if (found.qty <= 0) {
      const idx = items.indexOf(found);
      if (idx >= 0) items.splice(idx, 1);
    }
    return true;
  }

  function strategicPillarPositions(seed32) {
    const rng = makeRng(seed32 ^ 0x51f0a1);
    const r1 = 1100 + rng.nextRange(-80, 80);
    const r2 = 1900 + rng.nextRange(-120, 120);
    return [
      { x: 0, y: 0 },
      { x: r1, y: 0 },
      { x: -r1, y: 0 },
      { x: 0, y: r1 },
      { x: 0, y: -r1 },
      { x: r2, y: r2 },
    ];
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

  function cloneDeep(obj) {
    try {
      if (typeof structuredClone === "function") return structuredClone(obj);
    } catch {
      // ignore
    }
    return JSON.parse(JSON.stringify(obj));
  }

  function migrateWorldState(state) {
    try {
      if (!state || typeof state !== "object") return state;
      if (!state.world || typeof state.world !== "object") return state;

      const baseQuest = defaultWorldState(state.usernameNorm ?? "player").world.quest;
      if (!state.world.quest || typeof state.world.quest !== "object") {
        state.world.quest = cloneDeep(baseQuest);
        return state;
      }

      const q = state.world.quest;

      // Old saves used q.progress/q.required without steps.
      if (!Array.isArray(q.steps)) {
        const migrated = cloneDeep(baseQuest);
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
      if (!q.activeSite) q.activeSite = cloneDeep(baseQuest.activeSite);
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

      // Dungeon fields (optional; safe defaults)
      if (!state.world.dungeon || typeof state.world.dungeon !== "object") {
        state.world.dungeon = {
          inDungeon: false,
          seed: 0,
          returnPos: { x: 0, y: 0 },
          opened: {},
          lastEntrance: null,
        };
      } else {
        if (typeof state.world.dungeon.inDungeon !== "boolean") state.world.dungeon.inDungeon = false;
        if (typeof state.world.dungeon.seed !== "number") state.world.dungeon.seed = 0;
        if (!state.world.dungeon.returnPos) state.world.dungeon.returnPos = { x: 0, y: 0 };
        if (typeof state.world.dungeon.returnPos.x !== "number") state.world.dungeon.returnPos.x = 0;
        if (typeof state.world.dungeon.returnPos.y !== "number") state.world.dungeon.returnPos.y = 0;
        if (!state.world.dungeon.opened || typeof state.world.dungeon.opened !== "object") state.world.dungeon.opened = {};
        if (!("lastEntrance" in state.world.dungeon)) state.world.dungeon.lastEntrance = null;
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

    app.dataset.mode = "boot";

    app.innerHTML = `
      <div class="sopor-topbar">
        <div class="sopor-title">Sopor</div>
        <div class="sopor-badge">Offline • Pixel • Quêtes</div>
        <div style="flex:1"></div>
        <button id="btnMute" class="btn">Son: —</button>
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
        </div>

        <div class="sopor-canvasWrap card">
          <div class="card-body" style="padding:0; height:100%">
            <div id="hud" class="sopor-hud"></div>
            <div id="danger" class="sopor-danger" data-level="low">Danger: —</div>
            <canvas id="minimap" class="sopor-minimap" width="160" height="160"></canvas>
            <div id="nameSplash" class="sopor-nameSplash" aria-hidden="true"></div>
            <canvas id="gameCanvas"></canvas>
          </div>
        </div>
      </div>

      <div class="sopor-logDock card">
        <div class="card-body">
          <div class="sopor-logTitle">Journal</div>
          <div id="log" class="sopor-log"></div>
        </div>
      </div>
    `;

    return {
      app,
      usernameInput: /** @type {HTMLInputElement} */ (document.getElementById("usernameInput")),
      btnStart: /** @type {HTMLButtonElement} */ (document.getElementById("btnStart")),
      btnLoad: /** @type {HTMLButtonElement} */ (document.getElementById("btnLoad")),
      btnDeleteSave: /** @type {HTMLButtonElement} */ (document.getElementById("btnDeleteSave")),
      btnMute: /** @type {HTMLButtonElement} */ (document.getElementById("btnMute")),
      btnHardReset: /** @type {HTMLButtonElement} */ (document.getElementById("btnHardReset")),
      userBadge: document.getElementById("userBadge"),
      noteBadge: document.getElementById("noteBadge"),
      storyBadge: document.getElementById("storyBadge"),
      log: document.getElementById("log"),
      hud: document.getElementById("hud"),
      danger: document.getElementById("danger"),
      minimap: /** @type {HTMLCanvasElement} */ (document.getElementById("minimap")),
      nameSplash: /** @type {HTMLDivElement} */ (document.getElementById("nameSplash")),
      canvas: /** @type {HTMLCanvasElement} */ (document.getElementById("gameCanvas")),
    };
  }

  function makeLogger(logEl) {
    const lines = [];
    function render() {
      if (!logEl) return;
      logEl.innerHTML = lines
        .map((l) => {
          const k = l.kind || "info";
          return `
            <div class="sopor-logLine sopor-logLine--${k}">
              <div class="sopor-logTime">${escapeHtml(l.time)}</div>
              <div class="sopor-logMsg">${escapeHtml(l.msg)}</div>
            </div>
          `;
        })
        .join("");
      logEl.scrollTop = logEl.scrollHeight;
    }

    function classify(msg) {
      const m = String(msg);
      if (/^Erreur:|^PHASER\b|Promise rejetée:/.test(m)) return "error";
      if (/Achat réussi:|Pilier alimenté|Sauvegarde chargée|Démarrage du monde/.test(m)) return "success";
      if (/Pseudo requis\.|Tu n'as plus assez|il te faut de l'Essence|impossible/i.test(m)) return "warn";
      return "info";
    }

    return {
      info(msg) {
        lines.push({
          time: new Date().toLocaleTimeString(),
          msg: String(msg),
          kind: classify(msg),
        });
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
      muted: false,
      volume: 0.35,
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
      state.volume = clamp(volume, 0, 1);
      master.gain.value = state.muted ? 0 : state.volume;

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
          muted: typeof s?.muted === "boolean" ? s.muted : false,
        };
      },
      saveSettings(settings) {
        localStorage.setItem(settingsKey(), JSON.stringify({ volume: settings.volume, muted: !!settings.muted }));
      },
      setMuted(muted) {
        state.muted = !!muted;
        if (state.master) {
          const ctx = ensureContext();
          const t = ctx ? ctx.currentTime : 0;
          state.master.gain.setTargetAtTime(state.muted ? 0 : state.volume, t, 0.02);
        }
      },
      setVolume(volume) {
        state.volume = clamp(volume, 0, 1);
        if (state.master) {
          const ctx = ensureContext();
          const t = ctx ? ctx.currentTime : 0;
          state.master.gain.setTargetAtTime(state.muted ? 0 : state.volume, t, 0.02);
        }
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
        else {
          state.volume = clamp(volume, 0, 1);
          state.master.gain.value = state.muted ? 0 : state.volume;
        }

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
        dungeon: {
          inDungeon: false,
          seed: 0,
          returnPos: { x: 0, y: 0 },
          opened: {},
          lastEntrance: null,
        },
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
    const copy = cloneDeep(state);
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

  function generateDungeonLayout(seed32) {
    const rng = makeRng(seed32 ^ 0x2e15b1);
    const W = DUNGEON_SIZE_TILES;
    const H = DUNGEON_SIZE_TILES;

    const tiles = new Uint8Array(W * H); // 0 wall, 1 floor
    const idx = (x, y) => y * W + x;

    const carveRect = (x0, y0, w, h) => {
      for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
          if (x <= 1 || y <= 1 || x >= W - 2 || y >= H - 2) continue;
          tiles[idx(x, y)] = 1;
        }
      }
    };

    const rooms = [];
    const maxRooms = 10;
    for (let i = 0; i < maxRooms; i++) {
      const rw = 7 + rng.nextInt(10);
      const rh = 7 + rng.nextInt(10);
      const rx = 3 + rng.nextInt(W - rw - 6);
      const ry = 3 + rng.nextInt(H - rh - 6);

      // simple overlap avoidance
      let ok = true;
      for (const r of rooms) {
        const pad = 3;
        if (rx < r.x + r.w + pad && rx + rw + pad > r.x && ry < r.y + r.h + pad && ry + rh + pad > r.y) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      const room = { x: rx, y: ry, w: rw, h: rh, cx: Math.floor(rx + rw / 2), cy: Math.floor(ry + rh / 2) };
      rooms.push(room);
      carveRect(rx, ry, rw, rh);
    }

    // Ensure at least a few rooms
    if (rooms.length < 4) {
      const fallback = [
        { x: 8, y: 8, w: 12, h: 10 },
        { x: 60, y: 12, w: 12, h: 10 },
        { x: 12, y: 60, w: 12, h: 10 },
        { x: 58, y: 60, w: 14, h: 12 },
      ];
      rooms.length = 0;
      for (const r of fallback) {
        const room = { ...r, cx: Math.floor(r.x + r.w / 2), cy: Math.floor(r.y + r.h / 2) };
        rooms.push(room);
        carveRect(room.x, room.y, room.w, room.h);
      }
    }

    // Connect rooms with corridors
    const carveCorridor = (x0, y0, x1, y1) => {
      let x = x0;
      let y = y0;
      const horizFirst = rng.next() < 0.5;
      const stepX = x1 > x0 ? 1 : -1;
      const stepY = y1 > y0 ? 1 : -1;
      const carve = (xx, yy) => {
        if (xx <= 1 || yy <= 1 || xx >= W - 2 || yy >= H - 2) return;
        tiles[idx(xx, yy)] = 1;
        // thicken corridor a bit
        tiles[idx(xx + 1, yy)] = 1;
        tiles[idx(xx, yy + 1)] = 1;
      };

      if (horizFirst) {
        while (x !== x1) {
          carve(x, y);
          x += stepX;
        }
        while (y !== y1) {
          carve(x, y);
          y += stepY;
        }
      } else {
        while (y !== y1) {
          carve(x, y);
          y += stepY;
        }
        while (x !== x1) {
          carve(x, y);
          x += stepX;
        }
      }
      carve(x1, y1);
    };

    for (let i = 1; i < rooms.length; i++) {
      const a = rooms[i - 1];
      const b = rooms[i];
      carveCorridor(a.cx, a.cy, b.cx, b.cy);
    }

    // Choose spawn in first room, exit in farthest room.
    const spawnRoom = rooms[0];
    let exitRoom = rooms[0];
    let bestD = -1;
    for (const r of rooms) {
      const d = Math.hypot(r.cx - spawnRoom.cx, r.cy - spawnRoom.cy);
      if (d > bestD) {
        bestD = d;
        exitRoom = r;
      }
    }

    const tileToWorld = (tx, ty) => ({
      x: DUNGEON_MIN + tx * TILE_SIZE + TILE_SIZE / 2,
      y: DUNGEON_MIN + ty * TILE_SIZE + TILE_SIZE / 2,
    });

    const spawn = tileToWorld(spawnRoom.cx, spawnRoom.cy);
    const exit = tileToWorld(exitRoom.cx, exitRoom.cy);

    // Place chests in a few different rooms (not spawn room).
    // Ensure the locked chest is in the exit room so the loop feels deliberate.
    const chests = [];

    const pickChestPosInRoom = (r, tries = 10) => {
      for (let t = 0; t < tries; t++) {
        const tx = clamp(r.cx + rng.nextInt(5) - 2, 3, W - 4);
        const ty = clamp(r.cy + rng.nextInt(5) - 2, 3, H - 4);
        if (tiles[idx(tx, ty)] !== 1) continue;
        const pos = tileToWorld(tx, ty);
        return { x: pos.x, y: pos.y };
      }
      // Fallback: room center
      const pos = tileToWorld(r.cx, r.cy);
      return { x: pos.x, y: pos.y };
    };

    const chestRooms = rooms.filter((r) => r !== spawnRoom);
    const regularRooms = chestRooms.filter((r) => r !== exitRoom);
    const regularCount = clamp(regularRooms.length >= 3 ? 3 : regularRooms.length, 1, 3);

    // Deterministic shuffle via rng
    for (let i = regularRooms.length - 1; i > 0; i--) {
      const j = rng.nextInt(i + 1);
      const tmp = regularRooms[i];
      regularRooms[i] = regularRooms[j];
      regularRooms[j] = tmp;
    }

    for (let i = 0; i < regularCount; i++) {
      const r = regularRooms[i];
      const pos = pickChestPosInRoom(r);
      chests.push({ id: `dch_${i}`, x: pos.x, y: pos.y, locked: false });
    }

    // Locked chest: exit room
    const lockPos = pickChestPosInRoom(exitRoom);
    chests.push({ id: "dch_lock", x: lockPos.x, y: lockPos.y, locked: true });

    return {
      seed: seed32,
      w: W,
      h: H,
      tiles,
      spawn,
      exit,
      chests,
    };
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
      this.interactables = null;

      this.solids = null;

      this.questSite = null;

      this.bg = null;
      this.tintOverlay = null;
      this.fx = null;
      this._ambienceStratum = null;
      this._lastAmbienceAt = 0;

      this._hudLast = 0;

      this._lastPlayerDamageAt = 0;
    }

    create() {
      const gs = this.registry.get("gameState");

      // Ensure we always start in overworld bounds.
      gs.world.world.dungeon.inDungeon = false;
      this.physics.world.setBounds(WORLD_MIN, WORLD_MIN, WORLD_RADIUS_PX * 2, WORLD_RADIUS_PX * 2);

      this.chunkLayer = this.add.layer();
      this.entityLayer = this.add.layer();

      this.monsters = this.physics.add.group();
      this.npcs = this.physics.add.group();
      this.workers = this.physics.add.group();
      this.projectiles = this.physics.add.group();
      this.pickups = this.physics.add.group();
      this.interactables = this.physics.add.group();

      this.solids = this.physics.add.staticGroup();

      const p = gs.world.player;

      this.player = this.physics.add.image(p.x, p.y, "spr_player");
      this.player.setCircle(PLAYER_RADIUS, 1, 1);
      this.player.setCollideWorldBounds(true);
      this.player.setDrag(1400, 1400);
      this.player.setMaxVelocity(420, 420);

      this._applyIdleBreathe(this.player, 0.22);

      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      this.cameras.main.setZoom(2.5);
      this.cameras.main.setRoundPixels(true);

      // Visual ambience (parallax bg + subtle color grade + particles)
      const cam = this.cameras.main;
      this.bg = this.add.tileSprite(0, 0, cam.width, cam.height, "bg_jardin");
      this.bg.setOrigin(0, 0);
      this.bg.setScrollFactor(0);
      this.bg.setDepth(-50);

      this.tintOverlay = this.add.rectangle(0, 0, cam.width, cam.height, 0x00ffc8, 0.06);
      this.tintOverlay.setOrigin(0, 0);
      this.tintOverlay.setScrollFactor(0);
      this.tintOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);
      this.tintOverlay.setDepth(50);

      // Particle managers (enabled/disabled per stratum)
      // Phaser 3.60+ uses ParticleEmitter as a GameObject; createEmitter was removed.
      const emPollen = this.add.particles(0, 0, "fx_pollen", {
        x: { min: 0, max: cam.width },
        y: { min: 0, max: cam.height },
        lifespan: { min: 2200, max: 4200 },
        speedY: { min: 10, max: 28 },
        speedX: { min: -8, max: 8 },
        quantity: 2,
        frequency: 140,
        scale: { start: 0.9, end: 0.15 },
        alpha: { start: 0.22, end: 0 },
        rotate: { min: 0, max: 360 },
        blendMode: "ADD",
      });
      emPollen.setDepth(40);
      emPollen.setScrollFactor(0);

      const emEmber = this.add.particles(0, 0, "fx_ember", {
        x: { min: 0, max: cam.width },
        y: { min: cam.height * 0.15, max: cam.height },
        lifespan: { min: 900, max: 1800 },
        speedY: { min: -55, max: -95 },
        speedX: { min: -18, max: 18 },
        quantity: 1,
        frequency: 90,
        scale: { start: 0.75, end: 0.05 },
        alpha: { start: 0.24, end: 0 },
        rotate: { min: 0, max: 360 },
        blendMode: "ADD",
      });
      emEmber.setDepth(40);
      emEmber.setScrollFactor(0);

      const emMote = this.add.particles(0, 0, "fx_mote", {
        x: { min: 0, max: cam.width },
        y: { min: 0, max: cam.height },
        lifespan: { min: 2600, max: 5200 },
        speedY: { min: -12, max: 12 },
        speedX: { min: -10, max: 10 },
        quantity: 2,
        frequency: 150,
        scale: { start: 0.75, end: 0.2 },
        alpha: { start: 0.18, end: 0 },
        rotate: { min: 0, max: 360 },
        blendMode: "ADD",
      });
      emMote.setDepth(40);
      emMote.setScrollFactor(0);

      this.fx = {
        pollen: emPollen,
        ember: emEmber,
        mote: emMote,
      };

      // Resize hooks
      this.scale.on("resize", (gameSize) => {
        const w = gameSize.width;
        const h = gameSize.height;
        if (this.bg) {
          this.bg.setSize(w, h);
        }
        if (this.tintOverlay) {
          this.tintOverlay.width = w;
          this.tintOverlay.height = h;
        }
      });

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

      // Solid collisions
      this.physics.add.collider(this.player, this.solids);
      this.physics.add.collider(this.monsters, this.solids);
      this.physics.add.overlap(this.projectiles, this.solids, (proj) => {
        const pObj = /** @type {Phaser.GameObjects.GameObject} */ (proj);
        if (pObj?.active) pObj.destroy();
      });

      this.physics.add.overlap(this.player, this.monsters, () => {
        // contact damage (scales with threat)
        const nearest = this._findNearestGroupMember(this.monsters, 22);
        const threat = nearest?.getData?.("threat") ?? 1;

        // Bosses should feel dangerous but not like instant unavoidable death.
        const isBoss = !!nearest?.getData?.("dungeonBossId");
        const dmg = isBoss ? (0.10 + threat * 0.035) : (0.10 + threat * 0.07);
        this._applyDamageToPlayer(dmg);
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
      this._spawnStarterProps();

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

      // Ambience refresh (bg scroll + stratum toggles)
      if (nowMs() - this._lastAmbienceAt > 140) {
        this._lastAmbienceAt = nowMs();
        const danger = this._dangerState();
        this._updateAmbience(danger.stratum);
      }

      const attackPressed = this.keys.space.isDown || this.input.activePointer.isDown;
      if (attackPressed) {
        this._tryAttack();
      }

      if (this.keys.f.isDown) {
        this._tryInteract();
      }

      // Update saved player pos (per zone)
      if (this._isInDungeon()) {
        gs.world.player.x = clampDungeonX(this.player.x);
        gs.world.player.y = clampDungeonY(this.player.y);
      } else {
        gs.world.player.x = clampWorldX(this.player.x);
        gs.world.player.y = clampWorldY(this.player.y);
      }

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

    _applyIdleBreathe(sprite, seed = 0) {
      if (!sprite || !sprite.active) return;
      const baseScaleX = sprite.scaleX || 1;
      const baseScaleY = sprite.scaleY || 1;
      const s = 0.016;
      const d1 = 780 + Math.floor(seed * 520);
      const d2 = 1400 + Math.floor(seed * 900);

      this.tweens.add({
        targets: sprite,
        scaleX: { from: baseScaleX * (1 - s), to: baseScaleX * (1 + s) },
        scaleY: { from: baseScaleY * (1 + s * 0.4), to: baseScaleY * (1 - s * 0.4) },
        duration: d1,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: Math.floor(seed * 220),
      });

      this.tweens.add({
        targets: sprite,
        angle: { from: -1.0, to: 1.0 },
        duration: d2,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: Math.floor(seed * 340),
      });
    }

    _updateAmbience(stratum) {
      const cam = this.cameras.main;
      if (this.bg) {
        // Parallax movement based on camera scroll
        this.bg.tilePositionX = cam.scrollX * 0.12;
        this.bg.tilePositionY = cam.scrollY * 0.12;
      }

      if (this._ambienceStratum === stratum) return;
      this._ambienceStratum = stratum;

      const isJ = stratum === STRATA.JARDIN;
      const isF = stratum === STRATA.FORGE;
      const isA = stratum === STRATA.ABIME;

      if (this.bg) {
        this.bg.setTexture(isJ ? "bg_jardin" : isF ? "bg_forge" : "bg_abime");
      }

      if (this.tintOverlay) {
        this.tintOverlay.fillColor = isJ ? 0x00ffc8 : isF ? 0xffb000 : 0xff4df2;
        this.tintOverlay.fillAlpha = isJ ? 0.055 : isF ? 0.065 : 0.075;
      }

      if (this.fx) {
        this.fx.pollen.setVisible(isJ);
        this.fx.ember.setVisible(isF);
        this.fx.mote.setVisible(isA);
      }
    }

    _spawnStarterProps() {
      // Ensure visible "stuff" near the start so players immediately see items/loot.
      const gs = this.registry.get("gameState");
      const rng = makeRng(gs.world.seed ^ 0x77aa11);
      const spawnChest = (dx, dy) => {
        const chest = this.physics.add.image(this.player.x + dx, this.player.y + dy, "spr_chest");
        chest.setCircle(8, 1, 1);
        chest.setImmovable(true);
        chest.setData("kind", "chest");
        chest.setData("opened", false);
        this.interactables.add(chest);
      };
      const spawnNode = (dx, dy, kind) => {
        const tex = kind === "herb" ? "spr_herb" : "spr_ore";
        const node = this.physics.add.image(this.player.x + dx, this.player.y + dy, tex);
        node.setCircle(8, 1, 1);
        node.setImmovable(true);
        node.setData("kind", "harvest");
        node.setData("resource", kind);
        node.setData("charges", 3);
        this.interactables.add(node);
      };

      const spawnDungeonEntrance = (dx, dy) => {
        const gate = this.physics.add.image(this.player.x + dx, this.player.y + dy, "spr_dungeon_entrance");
        gate.setCircle(10, 1, 1);
        gate.setImmovable(true);
        gate.setData("kind", "dungeonEntrance");
        gate.setData("entranceId", `E:${Math.floor(gate.x)},${Math.floor(gate.y)}`);
        this.interactables.add(gate);
        // Give it a small idle pulse (visual only)
        gate.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: gate, alpha: { from: 0.8, to: 1.0 }, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      };

      spawnChest(120, -40);
      spawnNode(-110, -30, "herb");
      if (rng.next() < 0.65) spawnNode(-80, 90, "ore");

      // Dungeon entrance (first loop)
      spawnDungeonEntrance(210, 30);
    }

    _isInDungeon() {
      const gs = this.registry.get("gameState");
      return !!gs.world.world.dungeon?.inDungeon;
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

      const nearObj = this._findNearestGroupMember(this.interactables, 52);
      if (nearObj) {
        this._interactObject(nearObj);
        return;
      }

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

    _interactObject(obj) {
      const gs = this.registry.get("gameState");
      const p = gs.world.player;
      const kind = obj.getData("kind");

      if (kind === "dungeonEntrance") {
        this._enterDungeon(obj);
        return;
      }

      if (kind === "dungeonExit") {
        // Always allow exit (avoid soft-lock). A key can "stabilize" the portal for a small bonus.
        const keyId = "clef_onirique";
        const have = countInventoryItem(p, keyId);
        if (have > 0) {
          consumeInventoryItem(p, keyId, 1);
          const bonus = 6;
          p.essence = clamp(p.essence + bonus, 0, p.essenceMax);
          p.pale = p.essence < 6;
          gs.logger.success("La Clef se dissout. Le Portail se stabilise...");
        } else {
          gs.logger.info("Le Portail vibre. Tu peux repartir quand tu veux.");
        }
        obj.destroy();
        this._exitDungeon();
        return;
      }

      if (kind === "dungeonChest") {
        const chestId = obj.getData("chestId") ?? "dch";
        const locked = !!obj.getData("locked");
        const dungeon = gs.world.world.dungeon;
        if (!dungeon.opened) dungeon.opened = {};
        if (dungeon.opened[chestId]) {
          gs.logger.info("Coffre du Donjon: déjà ouvert.");
          return;
        }

        if (locked) {
          const keyId = "clef_onirique";
          const have = countInventoryItem(p, keyId);
          if (have <= 0) {
            gs.logger.warn("Coffre scellé: il te faut une Clef Onirique.");
            return;
          }
          consumeInventoryItem(p, keyId, 1);
          gs.logger.success("La Clef claque. Le Coffre s'ouvre.");
        }

        const rng = makeRng(gs.world.seed ^ dungeon.seed ^ hash32(`dungeonChest:${chestId}`));
        const essence = 10 + rng.nextRange(0, 18);
        p.essence = clamp(p.essence + essence, 0, p.essenceMax);
        p.pale = p.essence < 6;

        // Loot loop rules:
        // - Ensure early progression: first dungeon chest always gives a key.
        // - Locked chest is always premium and refunds a key (so opening it never feels "wasted").
        const isFirstChest = String(chestId) === "dch_0";

        if (locked) {
          addInventoryItem(p, "clef_onirique", "Clef Onirique", 1);
          addInventoryItem(p, "fragment_relique", "Fragment de Relique", 2 + (rng.next() < 0.35 ? 1 : 0));
          addInventoryItem(p, `relique_${rng.nextInt(99999)}`, "Relique de Trame", 1);
          if (rng.next() < 0.65) addInventoryItem(p, "poussiere_abyssale", "Poussière Abyssale", 1);
          // Tiny, tangible progression.
          p.essenceMax = clamp((p.essenceMax ?? 18) + 1, 10, 40);
          gs.logger.info(`Coffre Scellé: +${essence.toFixed(1)} Essence • +Relique • +1 Essence Max`);
        } else if (isFirstChest) {
          addInventoryItem(p, "clef_onirique", "Clef Onirique", 1);
          addInventoryItem(p, "fragment_relique", "Fragment de Relique", 1);
          gs.logger.info(`Coffre du Donjon: +${essence.toFixed(1)} Essence • +1 Clef Onirique`);
        } else {
          // Regular chests: weighted table.
          const roll = rng.next();
          if (roll < 0.22) {
            addInventoryItem(p, "clef_onirique", "Clef Onirique", 1);
            addInventoryItem(p, "fragment_relique", "Fragment de Relique", 1);
            gs.logger.info(`Coffre du Donjon: +${essence.toFixed(1)} Essence • +Clef`);
          } else if (roll < 0.78) {
            addInventoryItem(p, "fragment_relique", "Fragment de Relique", 1 + (rng.next() < 0.25 ? 1 : 0));
            if (rng.next() < 0.35) addInventoryItem(p, `relique_${rng.nextInt(99999)}`, "Relique de Trame", 1);
            gs.logger.info(`Coffre du Donjon: +${essence.toFixed(1)} Essence • +Fragments`);
          } else {
            addInventoryItem(p, "poussiere_abyssale", "Poussière Abyssale", 1 + rng.nextInt(2));
            addInventoryItem(p, "minerai", "Minerai Onirique", 1);
            gs.logger.info(`Coffre du Donjon: +${essence.toFixed(1)} Essence • +Matériaux`);
          }
        }

        dungeon.opened[chestId] = true;
        obj.destroy();
        return;
      }

      if (kind === "chest") {
        if (obj.getData("opened")) {
          gs.logger.info("Coffre: déjà ouvert." );
          return;
        }
        obj.setData("opened", true);

        const rng = makeRng(gs.world.seed ^ hash32(`chest:${Math.floor(obj.x)},${Math.floor(obj.y)}`));
        const essence = 6 + rng.nextRange(0, 10);
        p.essence = clamp(p.essence + essence, 0, p.essenceMax);
        p.pale = p.essence < 6;

        // Overworld chest table: mostly relic fragments, rare key.
        if (rng.next() < 0.08) {
          addInventoryItem(p, "clef_onirique", "Clef Onirique", 1);
          gs.logger.info(`Coffre ouvert: +${essence.toFixed(1)} Essence • +1 Clef Onirique`);
        } else {
          addInventoryItem(p, "fragment_relique", "Fragment de Relique", 1);
          if (rng.next() < 0.35) addInventoryItem(p, "herb", "Herbe Lumineuse", 1);
          if (rng.next() < 0.25) addInventoryItem(p, "ore", "Minerai Onirique", 1);
          // A relic as a rarer bonus
          if (rng.next() < 0.22) addInventoryItem(p, `relique_${rng.nextInt(99999)}`, "Relique de Trame", 1);
          gs.logger.info(`Coffre ouvert: +${essence.toFixed(1)} Essence • +Butin`);
        }

        // Make it disappear (simple feedback)
        obj.destroy();
        return;
      }

      if (kind === "harvest") {
        const res = obj.getData("resource") ?? "herb";
        let charges = obj.getData("charges") ?? 0;
        if (charges <= 0) {
          gs.logger.info("Récolte: épuisé." );
          return;
        }
        charges -= 1;
        obj.setData("charges", charges);
        const itemName = res === "ore" ? "Minerai Onirique" : "Herbe Lumineuse";
        addInventoryItem(p, res, itemName, 1);
        gs.logger.info(`Récolte: +1 ${itemName} (reste ${charges})`);
        if (charges <= 0) {
          obj.destroy();
        }
        return;
      }

      gs.logger.info("Interaction: rien à faire." );
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

      if (this._isInDungeon()) {
        const layout = this._ensureDungeonLayout();
        this.player.setPosition(layout.spawn.x, layout.spawn.y);
      } else {
        this.player.setPosition(0, 0);
      }
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

      // Dungeon boss reward (persistent via dungeon.opened[bossId]).
      const bossId = mon.getData?.("dungeonBossId") ?? null;
      if (bossId && this._isInDungeon()) {
        const dungeon = gs.world.world.dungeon;
        if (!dungeon.opened) dungeon.opened = {};
        if (!dungeon.opened[bossId]) {
          dungeon.opened[bossId] = true;
          addInventoryItem(gs.world.player, `relique_${(hash32(String(bossId)) ^ dungeon.seed) >>> 0}`, "Relique de Trame", 1);
          addInventoryItem(gs.world.player, "fragment_relique", "Fragment de Relique", 3);
          addInventoryItem(gs.world.player, "clef_onirique", "Clef Onirique", 1);
          gs.world.player.essenceMax = clamp((gs.world.player.essenceMax ?? 18) + 1, 10, 40);
          gs.logger.success("Gardien vaincu: la Trame te récompense.");
        }
      }

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
        this._applyIdleBreathe(w, rng.next());
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
      const map = this._currentChunkMap();
      return map[ck] ?? null;
    }

    _currentChunkMap() {
      const gs = this.registry.get("gameState");
      if (gs.world.world.dungeon?.inDungeon) {
        if (!gs.world.world.dungeon.chunks || typeof gs.world.world.dungeon.chunks !== "object") gs.world.world.dungeon.chunks = {};
        return gs.world.world.dungeon.chunks;
      }
      return gs.world.world.chunks;
    }

    _streamWorld(force) {
      const gs = this.registry.get("gameState");

      const cx = Math.floor(this.player.x / CHUNK_SIZE_PX);
      const cy = Math.floor(this.player.y / CHUNK_SIZE_PX);

      const inDungeon = this._isInDungeon();

      const want = new Set();

      for (let dy = -WORLD_VIEW_CHUNKS_RADIUS; dy <= WORLD_VIEW_CHUNKS_RADIUS; dy++) {
        for (let dx = -WORLD_VIEW_CHUNKS_RADIUS; dx <= WORLD_VIEW_CHUNKS_RADIUS; dx++) {
          const tcx = cx + dx;
          const tcy = cy + dy;
          if (inDungeon) {
            if (!isChunkInDungeon(tcx, tcy)) continue;
          } else {
            if (!isChunkInWorld(tcx, tcy)) continue;
          }
          const k = chunkKey(tcx, tcy);
          want.add(k);
          if (!this.loadedChunks.has(k) || force) {
            this._ensureChunk(tcx, tcy);
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
      // In dungeon, keep spawns a bit more controlled.
      if (inDungeon) this._spawnDungeonMonstersIfNeeded();
      else this._spawnMonstersIfNeeded();
    }

    _isDungeonFloorAt(wx, wy) {
      if (!this._isInDungeon()) return false;
      const layout = this._ensureDungeonLayout();
      const gx = Math.floor((wx - DUNGEON_MIN) / TILE_SIZE);
      const gy = Math.floor((wy - DUNGEON_MIN) / TILE_SIZE);
      if (gx < 0 || gy < 0 || gx >= layout.w || gy >= layout.h) return false;
      return layout.tiles[gy * layout.w + gx] === 1;
    }

    _spawnDungeonMonstersIfNeeded() {
      const gs = this.registry.get("gameState");
      const maxMonsters = 10;
      if (this.monsters.countActive(true) >= maxMonsters) return;

      const layout = this._ensureDungeonLayout();
      const rng = makeRng((gs.world.seed ^ layout.seed ^ hash32(`${Math.floor(this.player.x)},${Math.floor(this.player.y)}`)) >>> 0);

      const spawnCount = rng.next() < 0.45 ? 2 : 1;
      for (let i = 0; i < spawnCount; i++) {
        const dist = 220 + rng.nextRange(0, 260);
        const angle = rng.nextRange(0, Math.PI * 2);
        const x = this.player.x + Math.cos(angle) * dist;
        const y = this.player.y + Math.sin(angle) * dist;

        // Only spawn on dungeon floors.
        if (!this._isDungeonFloorAt(x, y)) continue;

        const localThreat = 3.2;
        const hp = 8 + localThreat * 5 + rng.nextRange(-1, 3);

        const choices = ["spr_monster_abime", "spr_monster_abime_a", "spr_monster_abime_b"];
        const tex = choices[rng.nextInt(choices.length)];

        const mon = this.physics.add.image(x, y, tex);
        mon.setCircle(7, 1, 1);
        mon.setData("hp", hp);
        mon.setData("threat", localThreat);
        mon.setData("stratum", STRATA.ABIME);
        mon.setData("dungeon", true);
        this._applyIdleBreathe(mon, rng.next());
        this.monsters.add(mon);
      }
    }

    _ensureChunk(cx, cy) {
      const gs = this.registry.get("gameState");
      const k = chunkKey(cx, cy);

      const chunks = this._currentChunkMap();

      if (this._isInDungeon()) {
        // Dungeon chunks are generated from a prebuilt room layout.
        this._ensureDungeonLayout();
        if (!chunks[k]) {
          chunks[k] = {
            cx,
            cy,
            stratum: STRATA.DUNGEON,
            threat: 3.0,
            stability: 55,
            pillar: null,
            merchantSeed: 0,
          };
        }

        const container = this._buildChunkVisuals(cx, cy, chunks[k]);
        this.loadedChunks.set(k, container);
        return;
      }

      if (!chunks[k]) {
        const centerX = (cx + 0.5) * CHUNK_SIZE_PX;
        const centerY = (cy + 0.5) * CHUNK_SIZE_PX;
        const stratum = biomeForWorldPos(gs.world.seed, centerX, centerY);
        const threat = threatForWorldPos(stratum, centerX, centerY);

        const rng = makeRng(gs.world.seed ^ hash32(k));
        const stability = clamp(70 - threat * 12 + rng.nextRange(-10, 10), 0, 100);

        // Fewer pillars, placed strategically (seeded).
        const pillars = strategicPillarPositions(gs.world.seed);
        let pillar = null;
        for (const pp of pillars) {
          if (pp.x >= cx * CHUNK_SIZE_PX && pp.x < (cx + 1) * CHUNK_SIZE_PX && pp.y >= cy * CHUNK_SIZE_PX && pp.y < (cy + 1) * CHUNK_SIZE_PX) {
            pillar = { x: pp.x, y: pp.y, charge: 0, buffActive: false };
            break;
          }
        }

        chunks[k] = {
          cx,
          cy,
          stratum,
          threat,
          stability,
          pillar,
          merchantSeed: rng.nextInt(1_000_000),
        };
      }

      const container = this._buildChunkVisuals(cx, cy, chunks[k]);
      this.loadedChunks.set(k, container);
    }

    _clearLoadedChunks() {
      for (const [, value] of this.loadedChunks.entries()) {
        value.destroy();
      }
      this.loadedChunks.clear();

      // Remove stragglers
      this.solids.clear(true, true);
      this.interactables.clear(true, true);
      this.pickups.clear(true, true);
      this.projectiles.clear(true, true);
      // Monsters/NPCs should remain; but in dungeon transitions we clear monsters for safety.
      this.monsters.clear(true, true);
    }

    _enterDungeon(entranceObj) {
      const gs = this.registry.get("gameState");
      const dungeon = gs.world.world.dungeon;
      if (dungeon.inDungeon) return;

      dungeon.returnPos = { x: this.player.x, y: this.player.y };
      const entranceId = entranceObj?.getData?.("entranceId") ?? `E:${Math.floor(this.player.x)},${Math.floor(this.player.y)}`;
      dungeon.lastEntrance = String(entranceId);
      dungeon.seed = (gs.world.seed ^ hash32(String(entranceId)) ^ 0x6f11a2) >>> 0;
      dungeon.inDungeon = true;

      this._clearLoadedChunks();
      this.physics.world.setBounds(DUNGEON_MIN, DUNGEON_MIN, DUNGEON_SIZE_PX, DUNGEON_SIZE_PX);

      // Move player to dungeon spawn.
      const layout = this._ensureDungeonLayout();
      this.player.setPosition(layout.spawn.x, layout.spawn.y);

      gs.logger.warn("Tu franchis le Seuil. Le Donjon se referme derrière toi...");
      this._ambienceStratum = null;
      this._streamWorld(true);
    }

    _exitDungeon() {
      const gs = this.registry.get("gameState");
      const dungeon = gs.world.world.dungeon;
      if (!dungeon.inDungeon) return;

      dungeon.inDungeon = false;

      this._clearLoadedChunks();
      this.physics.world.setBounds(WORLD_MIN, WORLD_MIN, WORLD_RADIUS_PX * 2, WORLD_RADIUS_PX * 2);

      const rp = dungeon.returnPos ?? { x: 0, y: 0 };
      this.player.setPosition(clampWorldX(rp.x), clampWorldY(rp.y));

      gs.logger.success("Retour à l'Éveil. Le rêve extérieur respire.");
      this._ambienceStratum = null;
      this._streamWorld(true);
      this._spawnStarterProps();
    }

    _ensureDungeonLayout() {
      const gs = this.registry.get("gameState");
      const dungeon = gs.world.world.dungeon;
      if (dungeon.layout && dungeon.layout.seed === dungeon.seed) return dungeon.layout;

      const layout = generateDungeonLayout(dungeon.seed);
      dungeon.layout = layout;
      return layout;
    }

    _buildChunkVisuals(cx, cy, chunk) {
      if (this._isInDungeon()) {
        return this._buildDungeonChunkVisuals(cx, cy, chunk);
      }

      // Build a static tile visual layer for the chunk.
      const container = this.add.container(cx * CHUNK_SIZE_PX, cy * CHUNK_SIZE_PX);
      container.setDepth(-10);

      const solidsCreated = [];
      const objectsCreated = [];

      const addSolidRect = (xLocalCenter, yLocalCenter, w, h) => {
        const x = cx * CHUNK_SIZE_PX + xLocalCenter;
        const y = cy * CHUNK_SIZE_PX + yLocalCenter;
        const s = this.physics.add.staticImage(x, y, "spr_collider");
        s.setVisible(false);
        s.setDisplaySize(w, h);
        // refreshBody is required after scaling static bodies.
        s.refreshBody();
        this.solids.add(s);
        solidsCreated.push(s);
      };

      const rng = makeRng(hash32(`${chunk.cx},${chunk.cy}`) ^ 0x5bd1e995);
  const stratumKey = chunk.stratum === STRATA.JARDIN ? "jardin" : chunk.stratum === STRATA.FORGE ? "forge" : "abime";
  const FLOOR_VARIANTS = 4;
  const WALL_VARIANTS = 3;
  const DETAIL_VARIANTS = 2;

  const texKey = (kind, idx) => `tile_${kind}_${stratumKey}_${idx}`;
  const pickExisting = (primaryKey, fallbackKey) => (this.textures.exists(primaryKey) ? primaryKey : fallbackKey);
  const baseFallback = `tile_floor_${stratumKey}`;
  const wallFallback = `tile_wall_${stratumKey}`;
  const veinKey = `tile_vein_${stratumKey}`;

      const instability = 1 - chunk.stability / 100;

      // World-gen improvements: reduce maze walls and create readable paths/plazas.
      // Plaza near origin (spawn area) and cross-roads.
      const isPlaza = (wx, wy) => Math.hypot(wx, wy) < 200;
      const isRoad = (wx, wy) => {
        const w = 34;
        const main = Math.abs(wx) < w || Math.abs(wy) < w;
        const diag = Math.abs(wy - wx) < (w - 10) || Math.abs(wy + wx) < (w - 10);
        const ring = Math.abs(Math.hypot(wx, wy) - 760) < 28;
        return main || diag || ring;
      };

      // Chunk-local obstacle clusters (rocks/rubble), deterministic and clumpy.
      const clusterRng = makeRng(hash32(`${chunk.cx},${chunk.cy}:clusters`) ^ 0x3a91);
      const clusterCount = chunk.stratum === STRATA.JARDIN ? 1 : 2;
      const clusters = [];
      for (let i = 0; i < clusterCount; i++) {
        clusters.push({
          tx: 4 + clusterRng.nextInt(CHUNK_SIZE_TILES - 8),
          ty: 4 + clusterRng.nextInt(CHUNK_SIZE_TILES - 8),
          r: 3 + clusterRng.nextInt(6),
        });
      }

      for (let ty = 0; ty < CHUNK_SIZE_TILES; ty++) {
        for (let tx = 0; tx < CHUNK_SIZE_TILES; tx++) {
          const x = tx * TILE_SIZE;
          const y = ty * TILE_SIZE;

          const wx = cx * CHUNK_SIZE_PX + x + TILE_SIZE / 2;
          const wy = cy * CHUNK_SIZE_PX + y + TILE_SIZE / 2;

          const h = hash32(`${chunk.cx},${chunk.cy}:${tx},${ty}`);
          const floorV = h % FLOOR_VARIANTS;
          const wallV = (h >>> 4) % WALL_VARIANTS;

          const plaza = isPlaza(wx, wy);
          const road = !plaza && isRoad(wx, wy);

          // Base wall rates by stratum; instability adds a bit.
          const baseWallRate = chunk.stratum === STRATA.JARDIN ? 0.045 : chunk.stratum === STRATA.FORGE ? 0.075 : 0.065;
          const wallRate = clamp(baseWallRate + instability * 0.035, 0.02, 0.14);
          // Use a coarse noise cell (2x2 tiles) to avoid single-tile speckle walls.
          const hCoarse = hash32(`${chunk.cx},${chunk.cy}:c:${Math.floor(tx / 2)},${Math.floor(ty / 2)}`);
          const wallNoise = (hCoarse >>> 16) & 255;
          let wall = !plaza && !road && wallNoise < wallRate * 255;

          if (!plaza && !road && !wall) {
            // Add a few clumpy obstacle areas.
            for (const c of clusters) {
              const d = Math.hypot(tx - c.tx, ty - c.ty);
              if (d < c.r && ((hCoarse >>> 24) & 255) < 220) {
                wall = true;
                break;
              }
            }
          }
          const baseKey = wall
            ? pickExisting(texKey("wall", wallV), wallFallback)
            : pickExisting(texKey("floor", floorV), baseFallback);

          const base = this.add.image(x + TILE_SIZE / 2, y + TILE_SIZE / 2, baseKey);
          base.setOrigin(0.5, 0.5);
          container.add(base);

          if (wall) {
            addSolidRect(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
          }

          // Rare detail overlay to break up repetition.
          if (!wall && ((h & 0xff) < (road ? 90 : plaza ? 70 : 28))) {
            const dv = (h >>> 9) % DETAIL_VARIANTS;
            const detailKey = pickExisting(texKey("detail", dv), null);
            if (detailKey) {
              const d = this.add.image(x + TILE_SIZE / 2, y + TILE_SIZE / 2, detailKey);
              d.setAlpha((road ? 0.22 : plaza ? 0.20 : 0.28) + (h & 7) * 0.02);
              if (chunk.stratum !== STRATA.JARDIN) d.setBlendMode(Phaser.BlendModes.ADD);
              container.add(d);
            }
          }

          if (!wall && rng.next() < (0.10 + instability * 0.20)) {
            const vein = this.add.image(x + TILE_SIZE / 2, y + TILE_SIZE / 2, veinKey);
            vein.setBlendMode(Phaser.BlendModes.ADD);
            vein.setAlpha(0.25 + rng.next() * 0.25);
            container.add(vein);
          }
        }
      }

      // Simple Jardin decor: trees + small "house" blobs to make it feel alive.
      if (chunk.stratum === STRATA.JARDIN) {
        const decorRng = makeRng(hash32(`${chunk.cx},${chunk.cy}:decor`) ^ 0x2a71);
        const decorCount = 3 + decorRng.nextInt(5);
        for (let i = 0; i < decorCount; i++) {
          const tx = 2 + decorRng.nextInt(CHUNK_SIZE_TILES - 4);
          const ty = 2 + decorRng.nextInt(CHUNK_SIZE_TILES - 4);
          const px = tx * TILE_SIZE + TILE_SIZE / 2;
          const py = ty * TILE_SIZE + TILE_SIZE / 2;

          const wx = cx * CHUNK_SIZE_PX + px;
          const wy = cy * CHUNK_SIZE_PX + py;
          const plaza = isPlaza(wx, wy);
          const road = !plaza && isRoad(wx, wy);
          if (plaza || road) continue;

          const r = decorRng.next();
          const isHouse = r < 0.10;
          const isTree = r >= 0.10 && r < 0.65;
          const tex = isHouse ? "spr_house" : isTree ? (decorRng.next() < 0.5 ? "spr_tree_a" : "spr_tree_b") : decorRng.next() < 0.55 ? "spr_bush" : "spr_flower";
          const img = this.add.image(px, py, tex);
          img.setDepth(-5);
          container.add(img);
          // collider footprint
          if (isHouse) addSolidRect(px, py + 6, 34, 22);
          else if (isTree) addSolidRect(px, py + 4, 22, 18);
          else if (tex === "spr_bush") addSolidRect(px, py + 6, 18, 12);
        }

        // Occasional chest/node placement in the world state is handled elsewhere,
        // but visuals are placed via interactables group.
      }

      if (chunk.stratum === STRATA.FORGE) {
        const decorRng = makeRng(hash32(`${chunk.cx},${chunk.cy}:decor`) ^ 0x6c52);
        const decorCount = 3 + decorRng.nextInt(5);
        for (let i = 0; i < decorCount; i++) {
          const tx = 2 + decorRng.nextInt(CHUNK_SIZE_TILES - 4);
          const ty = 2 + decorRng.nextInt(CHUNK_SIZE_TILES - 4);
          const px = tx * TILE_SIZE + TILE_SIZE / 2;
          const py = ty * TILE_SIZE + TILE_SIZE / 2;

          const wx = cx * CHUNK_SIZE_PX + px;
          const wy = cy * CHUNK_SIZE_PX + py;
          const plaza = isPlaza(wx, wy);
          const road = !plaza && isRoad(wx, wy);
          if (plaza || road) continue;

          const r = decorRng.next();
          const tex = r < 0.45 ? (decorRng.next() < 0.5 ? "spr_rock_forge_a" : "spr_rock_forge_b") : r < 0.78 ? "spr_pipe_forge" : "spr_vent_forge";
          const img = this.add.image(px, py, tex);
          img.setDepth(-5);
          container.add(img);

          if (tex.startsWith("spr_rock_forge")) addSolidRect(px, py + 6, 22, 14);
          else if (tex === "spr_pipe_forge") addSolidRect(px, py + 6, 28, 10);
          else if (tex === "spr_vent_forge") addSolidRect(px, py + 6, 18, 12);
        }
      }

      if (chunk.stratum === STRATA.ABIME) {
        const decorRng = makeRng(hash32(`${chunk.cx},${chunk.cy}:decor`) ^ 0x9171);
        const decorCount = 3 + decorRng.nextInt(5);
        for (let i = 0; i < decorCount; i++) {
          const tx = 2 + decorRng.nextInt(CHUNK_SIZE_TILES - 4);
          const ty = 2 + decorRng.nextInt(CHUNK_SIZE_TILES - 4);
          const px = tx * TILE_SIZE + TILE_SIZE / 2;
          const py = ty * TILE_SIZE + TILE_SIZE / 2;

          const wx = cx * CHUNK_SIZE_PX + px;
          const wy = cy * CHUNK_SIZE_PX + py;
          const plaza = isPlaza(wx, wy);
          const road = !plaza && isRoad(wx, wy);
          if (plaza || road) continue;

          const r = decorRng.next();
          const tex = r < 0.42 ? (decorRng.next() < 0.5 ? "spr_crystal_abime_a" : "spr_crystal_abime_b") : r < 0.72 ? "spr_root_abime" : "spr_totem_abime";
          const img = this.add.image(px, py, tex);
          img.setDepth(-5);
          if (tex.startsWith("spr_crystal_abime")) img.setBlendMode(Phaser.BlendModes.ADD);
          container.add(img);

          if (tex.startsWith("spr_crystal_abime")) addSolidRect(px, py + 6, 18, 14);
          else if (tex === "spr_root_abime") addSolidRect(px, py + 8, 26, 12);
          else if (tex === "spr_totem_abime") addSolidRect(px, py + 8, 16, 18);
        }
      }

      if (chunk.pillar) {
        const p = this.add.image(chunk.pillar.x - cx * CHUNK_SIZE_PX, chunk.pillar.y - cy * CHUNK_SIZE_PX, "spr_pillar");
        p.setBlendMode(Phaser.BlendModes.ADD);
        p.setAlpha(0.95);
        container.add(p);

        const pg = this.add.image(chunk.pillar.x - cx * CHUNK_SIZE_PX, chunk.pillar.y - cy * CHUNK_SIZE_PX, "spr_pillar_glow");
        pg.setBlendMode(Phaser.BlendModes.ADD);
        pg.setAlpha(0.22);
        container.add(pg);

        const pulseRng = makeRng(hash32(`${chunk.cx},${chunk.cy}:pillar`) ^ 0x71a2);
        this.tweens.add({
          targets: pg,
          alpha: { from: 0.14, to: 0.46 },
          duration: 900 + pulseRng.nextInt(900),
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
          delay: pulseRng.nextInt(400),
        });
        this.tweens.add({
          targets: pg,
          scaleX: { from: 0.98, to: 1.03 },
          scaleY: { from: 0.98, to: 1.03 },
          duration: 1100 + pulseRng.nextInt(800),
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
          delay: pulseRng.nextInt(600),
        });
      }

      return {
        destroy: () => {
          for (const s of solidsCreated) {
            if (s && s.active) s.destroy();
          }
          for (const o of objectsCreated) {
            if (o && o.active) o.destroy();
          }
          container.destroy();
        },
      };
    }

    _buildDungeonChunkVisuals(cx, cy, chunk) {
      const gs = this.registry.get("gameState");
      const container = this.add.container(cx * CHUNK_SIZE_PX, cy * CHUNK_SIZE_PX);
      container.setDepth(-12);

      const solidsCreated = [];
      const objectsCreated = [];

      const addSolidRect = (xLocalCenter, yLocalCenter, w, h) => {
        const x = cx * CHUNK_SIZE_PX + xLocalCenter;
        const y = cy * CHUNK_SIZE_PX + yLocalCenter;
        const s = this.physics.add.staticImage(x, y, "spr_collider");
        s.setVisible(false);
        s.setDisplaySize(w, h);
        s.refreshBody();
        this.solids.add(s);
        solidsCreated.push(s);
      };

      const layout = this._ensureDungeonLayout();
      const W = layout.w;
      const H = layout.h;
      const tiles = layout.tiles;
      const idx = (tx, ty) => ty * W + tx;

      // Render tiles for this chunk
      for (let ty = 0; ty < CHUNK_SIZE_TILES; ty++) {
        for (let tx = 0; tx < CHUNK_SIZE_TILES; tx++) {
          const x = tx * TILE_SIZE;
          const y = ty * TILE_SIZE;
          const wx = cx * CHUNK_SIZE_PX + x + TILE_SIZE / 2;
          const wy = cy * CHUNK_SIZE_PX + y + TILE_SIZE / 2;

          const gx = Math.floor((wx - DUNGEON_MIN) / TILE_SIZE);
          const gy = Math.floor((wy - DUNGEON_MIN) / TILE_SIZE);
          const inGrid = gx >= 0 && gy >= 0 && gx < W && gy < H;

          const h = hash32(`d:${layout.seed}:${gx},${gy}`);
          const floorV = h % 4;
          const wallV = (h >>> 4) % 3;

          const isFloor = inGrid && tiles[idx(gx, gy)] === 1;
          const baseKey = isFloor ? (this.textures.exists(`tile_floor_abime_${floorV}`) ? `tile_floor_abime_${floorV}` : "tile_floor_abime") : (this.textures.exists(`tile_wall_abime_${wallV}`) ? `tile_wall_abime_${wallV}` : "tile_wall_abime");
          const base = this.add.image(x + TILE_SIZE / 2, y + TILE_SIZE / 2, baseKey);
          base.setOrigin(0.5, 0.5);
          container.add(base);

          if (!isFloor) {
            addSolidRect(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
          } else {
            // occasional vein glow
            if ((h & 255) < 34) {
              const vein = this.add.image(x + TILE_SIZE / 2, y + TILE_SIZE / 2, "tile_vein_abime");
              vein.setBlendMode(Phaser.BlendModes.ADD);
              vein.setAlpha(0.20 + ((h >>> 8) & 7) * 0.03);
              container.add(vein);
            }
          }
        }
      }

      // Dungeon objects: chests + exit portal (spawn only if inside this chunk)
      const dungeon = gs.world.world.dungeon;
      const opened = dungeon.opened ?? {};

      const spawnChest = (ch) => {
        if (opened[ch.id]) return;
        const inChunk = ch.x >= cx * CHUNK_SIZE_PX && ch.x < (cx + 1) * CHUNK_SIZE_PX && ch.y >= cy * CHUNK_SIZE_PX && ch.y < (cy + 1) * CHUNK_SIZE_PX;
        if (!inChunk) return;
        const chest = this.physics.add.image(ch.x, ch.y, "spr_chest");
        chest.setCircle(8, 1, 1);
        chest.setImmovable(true);
        chest.setData("kind", "dungeonChest");
        chest.setData("chestId", ch.id);
        chest.setData("locked", !!ch.locked);
        chest.setBlendMode(Phaser.BlendModes.ADD);
        this.interactables.add(chest);
        objectsCreated.push(chest);
      };

      for (const ch of layout.chests) spawnChest(ch);

      const exitInChunk = layout.exit.x >= cx * CHUNK_SIZE_PX && layout.exit.x < (cx + 1) * CHUNK_SIZE_PX && layout.exit.y >= cy * CHUNK_SIZE_PX && layout.exit.y < (cy + 1) * CHUNK_SIZE_PX;
      if (exitInChunk) {
        const portal = this.physics.add.image(layout.exit.x, layout.exit.y, "spr_dungeon_exit");
        portal.setCircle(10, 1, 1);
        portal.setImmovable(true);
        portal.setData("kind", "dungeonExit");
        portal.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: portal, alpha: { from: 0.55, to: 1.0 }, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        this.interactables.add(portal);
        objectsCreated.push(portal);

        // Exit guardian (boss) — spawn once per dungeon seed.
        const bossId = `boss_${layout.seed}`;
        // If already defeated, don't spawn.
        // If alive, keep a single instance even if this chunk unloads/reloads.
        let bossAlive = false;
        this.monsters.children.iterate((child) => {
          if (!child || bossAlive) return;
          const id = child.getData?.("dungeonBossId");
          if (id && String(id) === String(bossId)) bossAlive = true;
        });

        if (!opened[bossId] && !bossAlive) {
          const findFloorNear = (wx, wy) => {
            const gx0 = clamp(Math.floor((wx - DUNGEON_MIN) / TILE_SIZE), 1, W - 2);
            const gy0 = clamp(Math.floor((wy - DUNGEON_MIN) / TILE_SIZE), 1, H - 2);
            for (let r = 0; r <= 6; r++) {
              for (let oy = -r; oy <= r; oy++) {
                for (let ox = -r; ox <= r; ox++) {
                  const gx = gx0 + ox;
                  const gy = gy0 + oy;
                  if (gx <= 1 || gy <= 1 || gx >= W - 2 || gy >= H - 2) continue;
                  if (tiles[idx(gx, gy)] !== 1) continue;
                  return {
                    x: DUNGEON_MIN + gx * TILE_SIZE + TILE_SIZE / 2,
                    y: DUNGEON_MIN + gy * TILE_SIZE + TILE_SIZE / 2,
                  };
                }
              }
            }
            return { x: wx, y: wy };
          };

          const bossPos = findFloorNear(layout.exit.x, layout.exit.y - 64);
          const boss = this.physics.add.image(bossPos.x, bossPos.y, "spr_monster_abime_b");
          boss.setCircle(8, 1, 1);
          boss.setCollideWorldBounds(true);
          boss.setData("hp", 42);
          boss.setData("threat", 4.2);
          boss.setData("stratum", STRATA.ABIME);
          boss.setData("dungeon", true);
          boss.setData("dungeonBossId", bossId);
          boss.setBlendMode(Phaser.BlendModes.ADD);
          this._applyIdleBreathe(boss, 0.77);

          // Telegraph: slow pulse (alpha + scale)
          const prng = makeRng(hash32(bossId) ^ layout.seed ^ 0x19a2);
          this.tweens.add({
            targets: boss,
            alpha: { from: 0.70, to: 1.0 },
            duration: 820 + prng.nextInt(520),
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
          this.tweens.add({
            targets: boss,
            scaleX: { from: 1.0, to: 1.05 },
            scaleY: { from: 1.0, to: 1.05 },
            duration: 1050 + prng.nextInt(650),
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
            delay: 80,
          });
          this.monsters.add(boss);
        }
      }

      return {
        destroy: () => {
          for (const s of solidsCreated) {
            if (s && s.active) s.destroy();
          }
          for (const o of objectsCreated) {
            if (o && o.active) o.destroy();
          }
          container.destroy();
        },
      };
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
        this._applyIdleBreathe(npc, rng.next());
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

        const choices =
          stratum === STRATA.JARDIN
            ? ["spr_monster_jardin", "spr_monster_jardin_a", "spr_monster_jardin_b"]
            : stratum === STRATA.FORGE
              ? ["spr_monster_forge", "spr_monster_forge_a", "spr_monster_forge_b"]
              : ["spr_monster_abime", "spr_monster_abime_a", "spr_monster_abime_b"];
        const tex = choices[rng.nextInt(choices.length)];

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

    // 1x1 texture for scalable invisible colliders.
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture("spr_collider", 1, 1);

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
        g.lineStyle(3, accentColor, 0.22);
        g.beginPath();
        g.moveTo(2, 12);
        g.lineTo(6, 8);
        g.lineTo(11, 10);
        g.lineTo(14, 5);
        g.strokePath();

        g.lineStyle(2, accentColor, 0.65);
        g.beginPath();
        g.moveTo(2, 12);
        g.lineTo(6, 8);
        g.lineTo(11, 10);
        g.lineTo(14, 5);
        g.strokePath();

        // nodes
        g.fillStyle(accentColor, 0.35);
        g.fillCircle(6, 8, 2);
        g.fillCircle(11, 10, 2);
        g.fillStyle(0xffffff, 0.10);
        g.fillCircle(6, 8, 1);
        g.fillCircle(11, 10, 1);
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

    const makeRng32 = (seed) => {
      let s = seed | 0;
      return {
        next() {
          s = (s * 1664525 + 1013904223) | 0;
          return (s >>> 0) / 4294967296;
        },
        nextInt(n) {
          return Math.floor(this.next() * n);
        },
      };
    };

    const speckle = (seed, color, alpha, count) => {
      const r = makeRng32(seed);
      g.fillStyle(color, alpha);
      for (let i = 0; i < count; i++) {
        const x = r.nextInt(TILE_SIZE);
        const y = r.nextInt(TILE_SIZE);
        g.fillRect(x, y, 1, 1);
      }
    };

    const makeTileVariant = (key, baseColor, midColor, accentColor, seed, mode) => {
      g.clear();
      g.fillStyle(baseColor, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      // Mild dithering + speckles
      speckle(seed ^ 0x91e10da5, 0x000000, 0.10, 10);
      speckle(seed ^ 0x2c1b3c6d, midColor, 0.22, 16);

      if (mode === "jardin") {
        // grass strands
        speckle(seed ^ 0x6b2, 0x0a2a1f, 0.30, 22);
        // small flower clusters
        const rr = makeRng32(seed ^ 0x8f4);
        for (let k = 0; k < 2; k++) {
          const fx = 2 + rr.nextInt(TILE_SIZE - 4);
          const fy = 2 + rr.nextInt(TILE_SIZE - 4);
          g.fillStyle(0xffffff, 0.18);
          g.fillRect(fx, fy, 1, 1);
          g.fillStyle(0xff7fe8, 0.16);
          g.fillRect(fx + 1, fy + 2, 1, 1);
        }
        g.lineStyle(1, accentColor, 0.10);
        g.strokeRect(0.5, 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      }

      if (mode === "forge") {
        // cracks
        g.lineStyle(1, accentColor, 0.12);
        g.beginPath();
        g.moveTo(1, 4);
        g.lineTo(6, 7);
        g.lineTo(10, 5);
        g.lineTo(15, 10);
        g.strokePath();
        // ember dots
        speckle(seed ^ 0x1c77, accentColor, 0.16, 8);
      }

      if (mode === "abime") {
        // star specks + mist edge
        speckle(seed ^ 0x33a1, 0xffffff, 0.10, 8);
        g.lineStyle(1, accentColor, 0.12);
        g.beginPath();
        g.moveTo(2, 13);
        g.lineTo(8, 11);
        g.lineTo(14, 14);
        g.strokePath();
      }

      g.generateTexture(key, TILE_SIZE, TILE_SIZE);
    };

    const makeWallVariant = (key, baseColor, edgeColor, seed, mode) => {
      g.clear();
      g.fillStyle(baseColor, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      // outer shading
      g.fillStyle(0x000000, 0.18);
      g.fillRect(0, TILE_SIZE - 3, TILE_SIZE, 3);
      g.fillRect(TILE_SIZE - 3, 0, 3, TILE_SIZE);
      g.fillStyle(edgeColor, mode === "forge" ? 0.20 : 0.16);
      g.fillRect(0, 0, TILE_SIZE, 3);
      g.fillRect(0, 0, 3, TILE_SIZE);

      // brick-ish seams
      g.lineStyle(1, 0x000000, 0.18);
      for (let y = 4; y <= 12; y += 4) {
        g.beginPath();
        g.moveTo(0, y + 0.5);
        g.lineTo(TILE_SIZE, y + 0.5);
        g.strokePath();
      }
      // a few vertical cuts
      const rr = makeRng32(seed ^ 0x55aa);
      g.lineStyle(1, edgeColor, 0.08);
      for (let i = 0; i < 3; i++) {
        const x = 2 + rr.nextInt(TILE_SIZE - 4);
        g.beginPath();
        g.moveTo(x + 0.5, 2);
        g.lineTo(x + 0.5, TILE_SIZE - 2);
        g.strokePath();
      }

      g.generateTexture(key, TILE_SIZE, TILE_SIZE);
    };

    const makeDetailOverlay = (key, accentColor, seed, mode) => {
      g.clear();
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      const rr = makeRng32(seed ^ 0x2d);

      if (mode === "jardin") {
        // leaf swirl / flower patch
        g.fillStyle(0x0a2a1f, 0.22);
        g.fillCircle(5 + rr.nextInt(6), 6 + rr.nextInt(6), 4);
        g.fillStyle(0xff7fe8, 0.18);
        g.fillRect(10 + rr.nextInt(3), 9 + rr.nextInt(3), 1, 1);
        g.fillStyle(0xffffff, 0.14);
        g.fillRect(11 + rr.nextInt(3), 10 + rr.nextInt(3), 1, 1);
      }

      if (mode === "forge") {
        // ember crack
        g.lineStyle(2, accentColor, 0.14);
        g.beginPath();
        g.moveTo(3, 13);
        g.lineTo(6, 9);
        g.lineTo(11, 10);
        g.lineTo(13, 5);
        g.strokePath();
      }

      if (mode === "abime") {
        // small rune
        g.lineStyle(2, accentColor, 0.12);
        g.strokeCircle(8, 8, 5);
        g.lineStyle(1, 0xffffff, 0.07);
        g.beginPath();
        g.moveTo(8, 4);
        g.lineTo(8, 12);
        g.strokePath();
      }

      g.generateTexture(key, TILE_SIZE, TILE_SIZE);
    };

    // Jardin palette
    makeTile("tile_floor_jardin", 0x061313, 0x00ffc8, false);
    makeWall("tile_wall_jardin", 0x090a10, 0x00ffc8);
    makeTile("tile_vein_jardin", 0x000000, 0x00ffc8, true);

    // Add a more "grassy" variant overlay by regenerating with small flowers specks.
    g.clear();
    g.fillStyle(0x061313, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // grass noise
    for (let i = 0; i < 22; i++) {
      const x = (i * 5) % TILE_SIZE;
      const y = (i * 9) % TILE_SIZE;
      g.fillStyle(0x0a2a1f, 0.28);
      g.fillRect(x, y, 1, 1);
    }
    // tiny flowers
    g.fillStyle(0xffffff, 0.22);
    g.fillRect(3, 6, 1, 1);
    g.fillRect(12, 10, 1, 1);
    g.fillStyle(0xff7fe8, 0.22);
    g.fillRect(7, 12, 1, 1);
    g.lineStyle(1, 0x00ffc8, 0.12);
    g.strokeRect(0.5, 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    g.generateTexture("tile_floor_jardin", TILE_SIZE, TILE_SIZE);

    // Jardin variants
    for (let i = 0; i < 4; i++) {
      makeTileVariant(`tile_floor_jardin_${i}`, 0x061313, 0x0a2a1f, 0x00ffc8, 0x10a1 ^ (i * 0x9e37), "jardin");
    }
    for (let i = 0; i < 3; i++) {
      makeWallVariant(`tile_wall_jardin_${i}`, 0x090a10, 0x00ffc8, 0x11b2 ^ (i * 0x7f4a), "jardin");
    }
    for (let i = 0; i < 2; i++) {
      makeDetailOverlay(`tile_detail_jardin_${i}`, 0x00ffc8, 0x12c3 ^ (i * 0x531), "jardin");
    }

    // Forge palette
    makeTile("tile_floor_forge", 0x120a16, 0xffb000, false);
    makeWall("tile_wall_forge", 0x0b0a0f, 0xffb000);
    makeTile("tile_vein_forge", 0x000000, 0xffb000, true);

    // Forge variants
    for (let i = 0; i < 4; i++) {
      makeTileVariant(`tile_floor_forge_${i}`, 0x120a16, 0x1a0e22, 0xffb000, 0x21a1 ^ (i * 0x9e37), "forge");
    }
    for (let i = 0; i < 3; i++) {
      makeWallVariant(`tile_wall_forge_${i}`, 0x0b0a0f, 0xffb000, 0x22b2 ^ (i * 0x7f4a), "forge");
    }
    for (let i = 0; i < 2; i++) {
      makeDetailOverlay(`tile_detail_forge_${i}`, 0xffb000, 0x23c3 ^ (i * 0x531), "forge");
    }

    // Abime palette
    makeTile("tile_floor_abime", 0x05040a, 0xff4df2, false);
    makeWall("tile_wall_abime", 0x05040a, 0xff4df2);
    makeTile("tile_vein_abime", 0x000000, 0xff4df2, true);

    // Abime variants
    for (let i = 0; i < 4; i++) {
      makeTileVariant(`tile_floor_abime_${i}`, 0x05040a, 0x0d0a16, 0xff4df2, 0x31a1 ^ (i * 0x9e37), "abime");
    }
    for (let i = 0; i < 3; i++) {
      makeWallVariant(`tile_wall_abime_${i}`, 0x05040a, 0xff4df2, 0x32b2 ^ (i * 0x7f4a), "abime");
    }
    for (let i = 0; i < 2; i++) {
      makeDetailOverlay(`tile_detail_abime_${i}`, 0xff4df2, 0x33c3 ^ (i * 0x531), "abime");
    }

    const makeSprite = (key, bodyColor, glowColor, kind) => {
      const size = 18;
      g.clear();
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, size, size);

      // body + head
      g.fillStyle(bodyColor, 1);
      g.fillRoundedRect(4, 7, 10, 9, 3);
      g.fillStyle(bodyColor, 0.95);
      g.fillCircle(9, 6, 4);

      g.fillStyle(glowColor, 0.8);
      g.fillRect(6, 9, 6, 2);

      if (kind === "monster") {
        // eyes + maw
        g.fillStyle(glowColor, 0.9);
        g.fillRect(6, 8, 2, 1);
        g.fillRect(10, 8, 2, 1);
        g.fillStyle(glowColor, 0.55);
        g.fillRect(6, 12, 6, 2);
      }

      g.generateTexture(key, size, size);
    };

    const makeHumanoid = (key, skin, cloth, accent, role) => {
      const W = 20;
      const H = 22;
      g.clear();
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, W, H);

      const outline = 0x05040a;
      const shade = 0x0b0a12;

      // Shadow
      g.fillStyle(0x000000, 0.18);
      g.fillRoundedRect(6, 18, 8, 3, 2);

      // Body outline
      g.fillStyle(outline, 0.95);
      g.fillRoundedRect(6, 9, 8, 10, 3);
      // Body fill + shading
      g.fillStyle(cloth, 1);
      g.fillRoundedRect(7, 10, 6, 8, 2);
      g.fillStyle(shade, 0.18);
      g.fillRect(7, 10, 2, 8);

      // Head outline
      g.fillStyle(outline, 0.95);
      g.fillCircle(10, 7, 5);
      // Head fill
      g.fillStyle(skin, 1);
      g.fillCircle(10, 7, 4);
      g.fillStyle(0x000000, 0.12);
      g.fillRect(8, 6, 1, 3);

      // Eyes
      g.fillStyle(0xffffff, 0.65);
      g.fillRect(8, 7, 1, 1);
      g.fillRect(11, 7, 1, 1);

      // Accent (scarf / aura)
      g.fillStyle(accent, 0.55);
      g.fillRect(7, 11, 6, 2);
      g.fillStyle(accent, 0.18);
      g.fillCircle(10, 7, 5);

      // Role mark
      if (role === "quest") {
        g.fillStyle(accent, 0.55);
        g.fillRect(9, 14, 2, 3);
      } else if (role === "merchant") {
        g.fillStyle(0xffb000, 0.22);
        g.fillRect(6, 16, 8, 2);
      } else if (role === "guard") {
        g.fillStyle(0xffffff, 0.10);
        g.fillRect(6, 10, 2, 8);
      } else if (role === "worker") {
        g.fillStyle(0xffffff, 0.10);
        g.fillRect(12, 10, 2, 8);
      }

      // Tiny highlight
      g.fillStyle(0xffffff, 0.10);
      g.fillRect(11, 5, 1, 2);

      g.generateTexture(key, W, H);
    };

    makeHumanoid("spr_player", 0x2a3548, 0x1e2a4a, 0x00ffc8, "player");

    makeHumanoid("spr_npc_quest", 0x2c2f3a, 0x1a2442, 0x7fffd4, "quest");
    makeHumanoid("spr_npc_merchant", 0x2c2f3a, 0x1a2442, 0xffd27f, "merchant");
    makeHumanoid("spr_npc_wander", 0x2c2f3a, 0x1a2442, 0xff7fe8, "wander");
    makeHumanoid("spr_npc_guard", 0x2c2f3a, 0x1a2442, 0xa8ff7f, "guard");

    makeSprite("spr_monster_jardin", 0x151022, 0x00ffc8, "monster");
    makeSprite("spr_monster_forge", 0x151022, 0xffb000, "monster");
    makeSprite("spr_monster_abime", 0x151022, 0xff4df2, "monster");

    // Monster variants (color/shape variety)
    makeSprite("spr_monster_jardin_a", 0x121b1a, 0x7fffd4, "monster");
    makeSprite("spr_monster_jardin_b", 0x10161b, 0x00ffc8, "monster");
    makeSprite("spr_monster_forge_a", 0x1b1018, 0xffd27f, "monster");
    makeSprite("spr_monster_forge_b", 0x1a0f14, 0xffb000, "monster");
    makeSprite("spr_monster_abime_a", 0x0f0b16, 0xff7fe8, "monster");
    makeSprite("spr_monster_abime_b", 0x120b1d, 0xff4df2, "monster");

    makeHumanoid("spr_worker", 0x2c2f3a, 0x1a2442, 0xb4ff8a, "worker");

    // Tree (Jardin)
    g.clear();
    g.fillStyle(0x061313, 0);
    g.fillRect(0, 0, 28, 28);
    g.fillStyle(0x2a1a0a, 0.9);
    g.fillRoundedRect(12, 14, 4, 10, 2);
    g.fillStyle(0x0a2a1f, 0.95);
    g.fillCircle(14, 12, 10);
    g.fillStyle(0x00ffc8, 0.18);
    g.fillCircle(14, 12, 9);
    g.generateTexture("spr_tree", 28, 28);

    // Tree A (round canopy)
    g.clear();
    g.fillStyle(0x061313, 0);
    g.fillRect(0, 0, 30, 30);
    g.fillStyle(0x2a1a0a, 0.9);
    g.fillRoundedRect(13, 16, 4, 11, 2);
    g.fillStyle(0x0a2a1f, 0.95);
    g.fillCircle(15, 13, 11);
    g.fillStyle(0x00ffc8, 0.16);
    g.fillCircle(15, 13, 10);
    g.generateTexture("spr_tree_a", 30, 30);

    // Tree B (pine)
    g.clear();
    g.fillStyle(0x061313, 0);
    g.fillRect(0, 0, 28, 30);
    g.fillStyle(0x2a1a0a, 0.9);
    g.fillRoundedRect(12, 17, 4, 11, 2);
    g.fillStyle(0x0a2a1f, 0.9);
    g.fillTriangle(14, 4, 5, 18, 23, 18);
    g.fillStyle(0x0a2a1f, 0.9);
    g.fillTriangle(14, 8, 6, 22, 22, 22);
    g.fillStyle(0x00ffc8, 0.12);
    g.fillTriangle(14, 6, 7, 18, 21, 18);
    g.generateTexture("spr_tree_b", 28, 30);

    // Bush
    g.clear();
    g.fillStyle(0x061313, 0);
    g.fillRect(0, 0, 20, 18);
    g.fillStyle(0x0a2a1f, 0.92);
    g.fillCircle(7, 10, 6);
    g.fillCircle(12, 9, 7);
    g.fillStyle(0x00ffc8, 0.12);
    g.fillCircle(12, 9, 6);
    g.generateTexture("spr_bush", 20, 18);

    // Flower
    g.clear();
    g.fillStyle(0x061313, 0);
    g.fillRect(0, 0, 16, 16);
    g.fillStyle(0x0a2a1f, 0.7);
    g.fillRect(7, 6, 2, 8);
    g.fillStyle(0xff7fe8, 0.55);
    g.fillCircle(8, 6, 4);
    g.fillStyle(0xffffff, 0.28);
    g.fillCircle(8, 6, 2);
    g.generateTexture("spr_flower", 16, 16);

    // Forge rock A
    g.clear();
    g.fillStyle(0x120a16, 0);
    g.fillRect(0, 0, 26, 22);
    g.fillStyle(0x0b0a12, 0.95);
    g.fillRoundedRect(4, 8, 18, 12, 4);
    g.fillStyle(0xffb000, 0.14);
    g.fillRect(8, 12, 2, 6);
    g.fillRect(14, 11, 2, 6);
    g.generateTexture("spr_rock_forge_a", 26, 22);

    // Forge rock B
    g.clear();
    g.fillStyle(0x120a16, 0);
    g.fillRect(0, 0, 26, 22);
    g.fillStyle(0x0b0a12, 0.95);
    g.fillRoundedRect(3, 9, 20, 11, 4);
    g.fillStyle(0xffb000, 0.12);
    g.fillRect(9, 12, 2, 5);
    g.fillRect(16, 13, 2, 5);
    g.generateTexture("spr_rock_forge_b", 26, 22);

    // Forge pipe
    g.clear();
    g.fillStyle(0x120a16, 0);
    g.fillRect(0, 0, 34, 18);
    g.fillStyle(0x0b0a12, 0.95);
    g.fillRoundedRect(3, 7, 28, 8, 4);
    g.fillStyle(0xffb000, 0.12);
    g.fillRect(7, 9, 20, 2);
    g.generateTexture("spr_pipe_forge", 34, 18);

    // Forge vent
    g.clear();
    g.fillStyle(0x120a16, 0);
    g.fillRect(0, 0, 22, 22);
    g.fillStyle(0x0b0a12, 0.95);
    g.fillRoundedRect(4, 6, 14, 14, 3);
    g.fillStyle(0xffb000, 0.16);
    g.fillRect(7, 9, 2, 8);
    g.fillRect(11, 9, 2, 8);
    g.generateTexture("spr_vent_forge", 22, 22);

    // Abime crystal A
    g.clear();
    g.fillStyle(0x05040a, 0);
    g.fillRect(0, 0, 22, 28);
    g.fillStyle(0x0b0a12, 0.8);
    g.fillTriangle(11, 2, 4, 24, 18, 24);
    g.fillStyle(0xff4df2, 0.22);
    g.fillTriangle(11, 6, 6, 22, 16, 22);
    g.generateTexture("spr_crystal_abime_a", 22, 28);

    // Abime crystal B
    g.clear();
    g.fillStyle(0x05040a, 0);
    g.fillRect(0, 0, 22, 28);
    g.fillStyle(0x0b0a12, 0.8);
    g.fillTriangle(11, 3, 5, 25, 19, 25);
    g.fillStyle(0xff4df2, 0.18);
    g.fillRect(10, 10, 2, 10);
    g.generateTexture("spr_crystal_abime_b", 22, 28);

    // Abime root
    g.clear();
    g.fillStyle(0x05040a, 0);
    g.fillRect(0, 0, 34, 18);
    g.fillStyle(0x0b0a12, 0.9);
    g.fillRoundedRect(3, 8, 28, 7, 4);
    g.lineStyle(2, 0xff4df2, 0.10);
    g.beginPath();
    g.moveTo(6, 12);
    g.lineTo(14, 9);
    g.lineTo(22, 13);
    g.strokePath();
    g.generateTexture("spr_root_abime", 34, 18);

    // Abime totem
    g.clear();
    g.fillStyle(0x05040a, 0);
    g.fillRect(0, 0, 22, 30);
    g.fillStyle(0x0b0a12, 0.95);
    g.fillRoundedRect(5, 4, 12, 22, 4);
    g.fillStyle(0xff4df2, 0.14);
    g.fillRect(9, 8, 4, 12);
    g.lineStyle(1, 0xffffff, 0.07);
    g.strokeRect(7.5, 6.5, 7, 17);
    g.generateTexture("spr_totem_abime", 22, 30);

    // House (simple)
    g.clear();
    g.fillStyle(0x061313, 0);
    g.fillRect(0, 0, 34, 30);
    g.fillStyle(0x0b0a12, 0.95);
    g.fillRoundedRect(6, 12, 22, 14, 3);
    g.fillStyle(0xffb000, 0.45);
    g.fillTriangle(6, 12, 17, 4, 28, 12);
    g.fillStyle(0x00ffc8, 0.35);
    g.fillRect(14, 16, 6, 6);
    g.generateTexture("spr_house", 34, 30);

    // Chest
    g.clear();
    g.fillStyle(0x0b0a12, 1);
    g.fillRoundedRect(2, 6, 22, 14, 3);
    g.fillStyle(0xffb000, 0.55);
    g.fillRect(2, 12, 22, 2);
    g.fillStyle(0x00ffc8, 0.4);
    g.fillRect(11, 10, 4, 6);
    g.generateTexture("spr_chest", 26, 24);

    // Herb node
    g.clear();
    g.fillStyle(0x061313, 0);
    g.fillRect(0, 0, 20, 20);
    g.fillStyle(0x0a2a1f, 0.95);
    g.fillTriangle(4, 16, 10, 6, 16, 16);
    g.fillStyle(0x00ffc8, 0.22);
    g.fillRect(9, 8, 2, 8);
    g.generateTexture("spr_herb", 20, 20);

    // Ore node
    g.clear();
    g.fillStyle(0x061313, 0);
    g.fillRect(0, 0, 20, 20);
    g.fillStyle(0x0b0a12, 0.95);
    g.fillRoundedRect(4, 8, 12, 10, 3);
    g.fillStyle(0xff4df2, 0.28);
    g.fillRect(7, 10, 2, 6);
    g.fillRect(11, 11, 2, 5);
    g.generateTexture("spr_ore", 20, 20);

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

    // Pillar glow overlay (additive halo + runes)
    g.clear();
    g.fillStyle(0x000000, 0);
    g.fillRect(0, 0, 34, 40);
    g.fillStyle(0x00ffc8, 0.10);
    g.fillCircle(17, 20, 16);
    g.fillStyle(0x00ffc8, 0.12);
    g.fillRoundedRect(11, 12, 12, 16, 6);
    g.lineStyle(2, 0x00ffc8, 0.18);
    g.strokeRoundedRect(10.5, 11.5, 13, 17, 6);
    g.lineStyle(1, 0xffffff, 0.06);
    g.beginPath();
    g.moveTo(17, 10);
    g.lineTo(17, 30);
    g.moveTo(12, 20);
    g.lineTo(22, 20);
    g.strokePath();
    g.generateTexture("spr_pillar_glow", 34, 40);

    // --- Parallax backgrounds (64x64 patterns) ---
    const makeBg = (key, baseColor, accentColor, mode) => {
      const S = 64;
      g.clear();
      g.fillStyle(baseColor, 1);
      g.fillRect(0, 0, S, S);

      // Subtle noise
      g.fillStyle(0x000000, 0.10);
      for (let i = 0; i < 220; i++) {
        const x = (i * 13) % S;
        const y = (i * 29) % S;
        g.fillRect(x, y, 1, 1);
      }

      if (mode === "jardin") {
        // faint vines
        g.lineStyle(2, accentColor, 0.10);
        for (let y = 6; y < S; y += 16) {
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(S, y + 8);
          g.strokePath();
        }
        g.fillStyle(0xffffff, 0.06);
        for (let i = 0; i < 10; i++) g.fillCircle((i * 9) % S, (i * 17) % S, 2);
      }

      if (mode === "forge") {
        // heat bands
        g.fillStyle(accentColor, 0.06);
        for (let y = 0; y < S; y += 10) {
          g.fillRect(0, y, S, 2);
        }
        g.lineStyle(1, accentColor, 0.08);
        g.beginPath();
        g.moveTo(4, 60);
        g.lineTo(22, 42);
        g.lineTo(46, 54);
        g.lineTo(60, 34);
        g.strokePath();
      }

      if (mode === "abime") {
        // drifting constellations
        g.fillStyle(0xffffff, 0.10);
        for (let i = 0; i < 24; i++) {
          const x = (i * 11 + 7) % S;
          const y = (i * 23 + 5) % S;
          g.fillRect(x, y, 1, 1);
        }
        g.lineStyle(1, accentColor, 0.06);
        g.strokeCircle(48, 18, 12);
        g.strokeCircle(18, 44, 10);
      }

      g.generateTexture(key, S, S);
    };

    makeBg("bg_jardin", 0x050b0b, 0x00ffc8, "jardin");
    makeBg("bg_forge", 0x07050a, 0xffb000, "forge");
    makeBg("bg_abime", 0x040309, 0xff4df2, "abime");

    // --- Particle textures (small, additive) ---
    const makeFx = (key, color, shape) => {
      const S = 8;
      g.clear();
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, S, S);
      g.fillStyle(color, 0.9);
      if (shape === "dot") {
        g.fillCircle(4, 4, 2);
      } else if (shape === "ember") {
        g.fillTriangle(4, 1, 1, 6, 7, 6);
      } else {
        // mote (rune-ish)
        g.fillRect(3, 2, 2, 4);
        g.fillRect(2, 3, 4, 2);
      }
      g.generateTexture(key, S, S);
    };

    makeFx("fx_pollen", 0x00ffc8, "dot");
    makeFx("fx_ember", 0xffb000, "ember");
    makeFx("fx_mote", 0xff4df2, "mote");

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

    if (typeof Phaser === "undefined") {
      logger.info("Erreur: Phaser n'est pas chargé (vendor/phaser.min.js bloqué ou introuvable)." );
      if (ui.nameSplash) {
        ui.nameSplash.innerHTML = `
          <div class="sopor-nameSplashInner">
            <div class="sopor-nameSplashTitle">PHASER</div>
            <div class="sopor-nameSplashSub">Script bloqué / introuvable — voir le Journal.</div>
          </div>
        `;
        ui.nameSplash.classList.add("is-show");
      }
      return;
    }

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

          const hpPct = clamp((h.hp / h.hpMax) * 100, 0, 100);
          const esPct = clamp((h.essence / h.essenceMax) * 100, 0, 100);

          const step = q.steps?.[q.stepIndex] ?? null;
          let stepLine = q.stepText ?? "—";
          if (step?.kind === "collect") stepLine += ` • ${step.progress}/${step.required}`;
          if (step?.kind === "repair") stepLine += ` • ${step.progress.toFixed(1)}/${step.required}`;
          if (step?.kind === "protect") stepLine += ` • ${Math.floor(step.progressSeconds)}/${step.requiredSeconds}s • ouvriers ${step.workersAlive ?? 0}/${step.workersMax ?? 0}`;

          ui.hud.innerHTML = `
            <div class="card sopor-hudCard">
              <div class="card-body sopor-hudGrid">
                <div class="sopor-bars">
                  <div class="sopor-bar">
                    <div class="sopor-barLabel">PV</div>
                    <div class="sopor-barTrack"><div class="sopor-barFill is-hp" style="width:${hpPct.toFixed(1)}%"></div></div>
                    <div class="sopor-barValue">${h.hp.toFixed(0)}/${h.hpMax.toFixed(0)}</div>
                  </div>
                  <div class="sopor-bar">
                    <div class="sopor-barLabel">Essence</div>
                    <div class="sopor-barTrack"><div class="sopor-barFill is-essence" style="width:${esPct.toFixed(1)}%"></div></div>
                    <div class="sopor-barValue">${h.essence.toFixed(1)}/${h.essenceMax.toFixed(0)}</div>
                  </div>
                </div>

                <div class="sopor-chips">
                  <div class="sopor-chip"><span class="k">Arme</span><span class="v">${escapeHtml(h.weaponName)}</span></div>
                  <div class="sopor-chip"><span class="k">Type</span><span class="v">${escapeHtml(h.weaponType)}</span></div>
                  <div class="sopor-chip"><span class="k">Strate</span><span class="v">${escapeHtml(h.stratum)}</span></div>
                  <div class="sopor-chip"><span class="k">Menace</span><span class="v">${h.threat.toFixed(2)}</span></div>
                  <div class="sopor-chip"><span class="k">Stabilité</span><span class="v">${h.stability.toFixed(0)}%</span></div>
                  <div class="sopor-chip"><span class="k">Pâle</span><span class="v">${pale}</span></div>
                </div>

                <div class="sopor-quest">
                  <div class="sopor-questTitle">${escapeHtml(q.title)}</div>
                  <div class="sopor-questStep">${escapeHtml(stepLine)}</div>
                  <div class="sopor-questMeta">Communauté ${q.communityProgress.toFixed(1)}/${q.communityRequired} (${cProgress.toFixed(0)}%) • Contribution ${q.playerContribution.toFixed(1)}</div>
                </div>
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
        showNameSplash(usernameNorm) {
          if (!ui.nameSplash) return;
          const safe = escapeHtml(usernameNorm);
          ui.nameSplash.innerHTML = `
            <div class="sopor-nameSplashInner">
              <div class="sopor-nameSplashTitle">${safe}</div>
              <div class="sopor-nameSplashSub">Éveilleur — la Trame t'attend</div>
            </div>
          `;

          ui.nameSplash.classList.remove("is-show");
          // Force reflow to restart animation
          void ui.nameSplash.offsetWidth;
          ui.nameSplash.classList.add("is-show");

          window.clearTimeout(ui.nameSplash._t);
          ui.nameSplash._t = window.setTimeout(() => {
            ui.nameSplash.classList.remove("is-show");
          }, 2400);
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

    // Mute toggle (persisted)
    const audioSettings = audio.loadSettings();
    audio.setMuted(!!audioSettings.muted);
    audio.setVolume(audioSettings.volume);
    if (ui.btnMute) {
      const refreshMuteLabel = () => {
        ui.btnMute.textContent = audioSettings.muted ? "Son: OFF" : "Son: ON";
      };
      refreshMuteLabel();
      ui.btnMute.addEventListener("click", () => {
        audioSettings.muted = !audioSettings.muted;
        audio.setMuted(audioSettings.muted);
        audio.saveSettings(audioSettings);
        refreshMuteLabel();
        logger.info(audioSettings.muted ? "Audio: muet." : "Audio: activé." );
      });
    }

    // Surface runtime errors into the in-page journal (helps debug "black screen" issues).
    window.addEventListener("error", (e) => {
      const msg = e?.message ? String(e.message) : "Erreur JS";
      const src = e?.filename ? ` (${String(e.filename).split("/").slice(-1)[0]})` : "";
      logger.info(`Erreur: ${msg}${src}`);
    });
    window.addEventListener("unhandledrejection", (e) => {
      const reason = e?.reason instanceof Error ? e.reason.message : String(e?.reason ?? "(unknown)");
      logger.info(`Promise rejetée: ${reason}`);
    });

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

      try {
        game = new Phaser.Game(config);
        game.registry.set("gameState", gs);
      } catch (err) {
        logger.info("Erreur: impossible de démarrer Phaser." );
        logger.info(String(err?.message ?? err));
        throw err;
      }
    }

    function startWorldScene() {
      if (!game) return;
      const doStart = () => {
        try {
          game.scene.stop("TitleScene");
        } catch {
          // ignore
        }
        game.scene.start("WorldScene");
      };

      // If boot hasn't completed yet, wait for READY.
      if (game.isBooted) {
        doStart();
        return;
      }

      try {
        game.events.once(Phaser.Core.Events.READY, doStart);
      } catch {
        // Fallback
        window.setTimeout(doStart, 0);
      }

      // Extra fallback in case READY was missed
      window.setTimeout(() => {
        if (game && game.isBooted) doStart();
      }, 150);
    }

    function startGameFlow() {
      const usernameNorm = requireUsername();
      if (!usernameNorm) return;

      ui.app.dataset.mode = "play";

      updateBadges(usernameNorm);

      audio.configureForUsername(usernameNorm);

      gs.ui.showNameSplash(usernameNorm);

      // Load existing or create new world
      gs.world = loadSave(usernameNorm) ?? defaultWorldState(usernameNorm);

      // Update story badge
      gs.ui.setStoryBadge(gs.world.story);

      startPhaserIfNeeded();

      // Start audio after a user gesture (this click). Safe for iframe policies.
      // Start audio after a user gesture (this click). Safe for iframe policies.
      // Use the current settings (including mute).
      const res = audio.start(audioSettings.volume);
      if (!res.ok) {
        logger.info("Audio: " + res.reason);
      }

      // Jump to world
      startWorldScene();

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
