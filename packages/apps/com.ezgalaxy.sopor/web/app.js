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

  function pointSegDist(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const ab2 = abx * abx + aby * aby;
    if (ab2 <= 1e-6) return Math.hypot(apx, apy);
    let t = (apx * abx + apy * aby) / ab2;
    t = clamp(t, 0, 1);
    const cx = ax + abx * t;
    const cy = ay + aby * t;
    return Math.hypot(px - cx, py - cy);
  }

  function generateSettlements(seed32) {
    const rng = makeRng(seed32 ^ 0x6a2b11);
    /** @type {{id:string,stratum:string,kind:string,x:number,y:number,r:number}[]} */
    const out = [];

    const placeMany = (stratum, kind, countMin, countMax, rMin, rMax, minSep) => {
      const count = countMin + rng.nextInt(Math.max(1, countMax - countMin + 1));
      let tries = 0;
      while (out.filter((s) => s.stratum === stratum && s.kind === kind).length < count && tries < 1200) {
        tries++;
        const ang = rng.next() * Math.PI * 2;
        const rad = rMin + rng.next() * (rMax - rMin);
        const x = Math.cos(ang) * rad;
        const y = Math.sin(ang) * rad;
        if (x < WORLD_MIN + 220 || x > WORLD_MAX - 220 || y < WORLD_MIN + 220 || y > WORLD_MAX - 220) continue;
        let ok = true;
        for (const s of out) {
          if (s.stratum !== stratum) continue;
          if (Math.hypot(s.x - x, s.y - y) < minSep) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        const id = `${stratum}:${kind}:${out.length}`;
        out.push({ id, stratum, kind, x: Math.round(x), y: Math.round(y), r: 96 + rng.nextRange(-14, 24) });
      }
    };

    // Jardin: 2–4 villages, relatively close to spawn but still spread out.
    placeMany(STRATA.JARDIN, "village", 2, 4, 380, 1850, 560);
    // Forge: 1–3 outposts further away.
    placeMany(STRATA.FORGE, "outpost", 1, 3, 900, 2300, 680);
    // Abîme: 1–2 sanctuaries far / deep.
    placeMany(STRATA.ABIME, "sanctuary", 1, 2, 1100, 2450, 820);

    return out;
  }

  function buildRoadEdges(settlements) {
    /** @type {{stratum:string,a:{x:number,y:number},b:{x:number,y:number},w:number}[]} */
    const edges = [];
    const byStratum = new Map();
    for (const s of settlements) {
      if (!byStratum.has(s.stratum)) byStratum.set(s.stratum, []);
      byStratum.get(s.stratum).push(s);
    }

    for (const [stratum, list] of byStratum.entries()) {
      // Always connect to origin as a "main road" anchor (plaza).
      for (const s of list) {
        edges.push({ stratum, a: { x: 0, y: 0 }, b: { x: s.x, y: s.y }, w: stratum === STRATA.JARDIN ? 28 : stratum === STRATA.FORGE ? 26 : 24 });
      }

      // Extra links: each settlement connects to its nearest neighbor.
      for (const s of list) {
        let best = null;
        let bestD = Infinity;
        for (const t of list) {
          if (t === s) continue;
          const d = Math.hypot(t.x - s.x, t.y - s.y);
          if (d < bestD) {
            bestD = d;
            best = t;
          }
        }
        if (best) {
          edges.push({ stratum, a: { x: s.x, y: s.y }, b: { x: best.x, y: best.y }, w: stratum === STRATA.JARDIN ? 24 : stratum === STRATA.FORGE ? 22 : 20 });
        }
      }
    }

    return edges;
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
        <button id="btnPanel" class="btn">Panneau</button>
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
            <div class="card-title">État</div>
            <div class="card-body">
              <div id="hud" class="sopor-hud sopor-hud--panel"></div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Contrôles</div>
            <div class="card-body">
              <div>Déplacement: ZQSD / WASD / flèches</div>
              <div>Attaque: clic gauche ou Espace</div>
              <div>Esquive: SHIFT</div>
              <div>Compétences: E (Dash) • R (Onde)</div>
              <div>Interaction (PNJ / Pilier): F</div>
              <div>Changer d'arme: 1–9</div>
              <div>Panneau: TAB</div>
              <div>Pause: Échap</div>
            </div>
          </div>
        </div>

        <div class="sopor-canvasWrap card">
          <div class="card-body" style="padding:0; height:100%">
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
      btnPanel: /** @type {HTMLButtonElement} */ (document.getElementById("btnPanel")),
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

    function push(kind, msg) {
      lines.push({
        time: new Date().toLocaleTimeString(),
        msg: String(msg),
        kind,
      });
      while (lines.length > MAX_LOG_LINES) lines.shift();
      render();
    }

    return {
      info(msg) {
        push(classify(msg), msg);
      },
      warn(msg) {
        push("warn", msg);
      },
      success(msg) {
        push("success", msg);
      },
      error(msg) {
        push("error", msg);
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

      // combat intensity (0..1), smoothed
      combatIntensity: 0,
      combatTarget: 0,
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

      // Smooth combat intensity (keeps musical transitions gentle)
      const a = 0.06;
      state.combatIntensity = state.combatIntensity * (1 - a) + clamp(state.combatTarget, 0, 1) * a;

      const lookAhead = 0.28;
      while (state.nextNoteTime < ctx.currentTime + lookAhead) {
        const preset = stratumPreset(state.stratum, state.stage, state.usernameSeed);
        const ci = clamp(state.combatIntensity, 0, 1);

        // Adaptive combat layer: more urgency, brighter filter, more space.
        preset.tempoMul = preset.tempoMul * (1.0 + ci * 0.22);
        preset.cutoff = clamp(preset.cutoff * (1.0 + ci * 0.60), 250, 5200);
        preset.mix = clamp(preset.mix + ci * 0.10, 0.0, 0.5);
        preset.feedback = clamp(preset.feedback + ci * 0.08, 0.1, 0.65);
        preset.ornamentChance = clamp(preset.ornamentChance + ci * 0.08, 0.0, 0.35);

        if (state.delay && state.delayFeedback && state.delayMix) {
          state.delay.delayTime.setTargetAtTime(preset.delayTime, state.nextNoteTime, 0.02);
          state.delayFeedback.gain.setTargetAtTime(clamp(preset.feedback, 0.1, 0.65), state.nextNoteTime, 0.02);
          state.delayMix.gain.setTargetAtTime(clamp(preset.mix, 0.0, 0.5), state.nextNoteTime, 0.02);
        }

        const step = state.motif[state.noteIndex % state.motif.length];
        const base = state.rootMidi;
        const midi = base + step;

        scheduleNote(state.nextNoteTime, midi, preset, 0.9);

        // Low pulse under stress (still subtle; avoids muddying the mix)
        if (ci > 0.55 && (state.noteIndex % 4 === 0)) {
          scheduleNote(state.nextNoteTime, midi - 12, preset, 0.35 + ci * 0.25);
        }

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
      setCombatIntensity(intensity01) {
        state.combatTarget = clamp(Number(intensity01 ?? 0) || 0, 0, 1);
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
      this.registry.set("assetsReady", true);
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
      this.enemyProjectiles = null;
      this.pickups = null;
      this.interactables = null;

      this.solids = null;

      this.questSite = null;

      this.bg = null;
      this.tintOverlay = null;
      this.darkOverlay = null;
      this.playerLight = null;

      // Visual upgrade: pseudo-bloom + shadows + glitch + weather (Canvas-friendly)
      this.playerLightBloomA = null;
      this.playerLightBloomB = null;
      this.playerShadow = null;
      this.glitchOverlay = null;
      this.fxWeather = null;
      this._lastScreenFxAt = 0;
      this._glitchLevel = 0;
      this.fx = null;
      this._ambienceStratum = null;
      this._lastAmbienceAt = 0;

      this._lastAudioCombatAt = 0;

      this._hudLast = 0;

      this._lastPlayerDamageAt = 0;

      this._lastEnemyProjectileTickAt = 0;

      this._lastPlayerProjectileTrailAt = 0;

      // FX budget (prevents worst-case sprite floods)
      this._fxBudgetAt = 0;
      this._fxBudget = { impacts: 0, trails: 0, telegraphs: 0 };

      // Enemy visuals: subtle halo + micro-variation (throttled)
      this._lastMonsterVisualAt = 0;

      // Combat feel: dodge / skills / combos.
      this._invulnUntil = 0;
      this._cooldowns = { dodgeReadyAt: 0, dashReadyAt: 0, shockReadyAt: 0 };
      this._combo = { stage: 0, lastAt: 0 };

      this._basePlayerAlpha = 1.0;
    }

    _fxBudgetResetIfNeeded() {
      const t = nowMs();
      if (t - (this._fxBudgetAt ?? 0) > 240) {
        this._fxBudgetAt = t;
        this._fxBudget = { impacts: 0, trails: 0, telegraphs: 0 };
      }
    }

    _fxAllow(kind, maxPerWindow) {
      this._fxBudgetResetIfNeeded();
      if (!this._fxBudget || !this._fxBudget[kind]) this._fxBudget = { impacts: 0, trails: 0, telegraphs: 0 };
      const cur = Number(this._fxBudget[kind] ?? 0) || 0;
      if (cur >= maxPerWindow) return false;
      this._fxBudget[kind] = cur + 1;
      return true;
    }

    create() {
      const gs = this.registry.get("gameState");

      // Deterministic settlements + road network (offline/procedural).
      this._settlements = generateSettlements(gs.world.seed);
      this._roadEdges = buildRoadEdges(this._settlements);

      // Ensure we always start in overworld bounds.
      gs.world.world.dungeon.inDungeon = false;
      this.physics.world.setBounds(WORLD_MIN, WORLD_MIN, WORLD_RADIUS_PX * 2, WORLD_RADIUS_PX * 2);

      this.chunkLayer = this.add.layer();
      this.entityLayer = this.add.layer();

      this.monsters = this.physics.add.group();
      this.npcs = this.physics.add.group();
      this.workers = this.physics.add.group();
      this.projectiles = this.physics.add.group();
      this.enemyProjectiles = this.physics.add.group();
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
      this.cameras.main.setZoom(3);
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

      // Neo-pixel lighting: darken the whole screen, then add soft halos.
      this.darkOverlay = this.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.28);
      this.darkOverlay.setOrigin(0, 0);
      this.darkOverlay.setScrollFactor(0);
      this.darkOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);
      this.darkOverlay.setDepth(45);

      this.playerLight = this.add.image(this.player.x, this.player.y, "spr_light_jardin");
      this.playerLight.setBlendMode(Phaser.BlendModes.ADD);
      this.playerLight.setDepth(44);
      this.playerLight.setAlpha(0.9);

      // Pseudo-bloom: layered halos (cheap, works on Canvas renderer)
      this.playerLightBloomA = this.add.image(this.player.x, this.player.y, "spr_light_jardin");
      this.playerLightBloomA.setBlendMode(Phaser.BlendModes.ADD);
      this.playerLightBloomA.setDepth(43);
      this.playerLightBloomA.setScale(1.55);
      this.playerLightBloomA.setAlpha(0.32);

      this.playerLightBloomB = this.add.image(this.player.x, this.player.y, "spr_light_jardin");
      this.playerLightBloomB.setBlendMode(Phaser.BlendModes.ADD);
      this.playerLightBloomB.setDepth(42);
      this.playerLightBloomB.setScale(2.15);
      this.playerLightBloomB.setAlpha(0.16);

      // Soft ground shadow under player (depth below entities)
      this.playerShadow = this.add.image(this.player.x, this.player.y + 8, "spr_shadow");
      this.playerShadow.setBlendMode(Phaser.BlendModes.MULTIPLY);
      this.playerShadow.setDepth(2);
      this.playerShadow.setAlpha(0.55);

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

      // Weather / corruption overlays (screen-space)
      const emFog = this.add.particles(0, 0, "fx_fog", {
        x: { min: 0, max: cam.width },
        y: { min: 0, max: cam.height },
        lifespan: { min: 2400, max: 5200 },
        speedY: { min: -6, max: 6 },
        speedX: { min: -10, max: 10 },
        quantity: 2,
        frequency: 160,
        scale: { start: 1.35, end: 2.0 },
        alpha: { start: 0.08, end: 0 },
        rotate: { min: 0, max: 360 },
        blendMode: "SCREEN",
      });
      emFog.setDepth(46);
      emFog.setScrollFactor(0);

      const emRain = this.add.particles(0, 0, "fx_rain", {
        x: { min: -20, max: cam.width + 20 },
        y: { min: -30, max: cam.height + 30 },
        lifespan: { min: 550, max: 950 },
        speedY: { min: 220, max: 380 },
        speedX: { min: -35, max: 35 },
        quantity: 4,
        frequency: 55,
        scale: { start: 0.9, end: 0.65 },
        alpha: { start: 0.20, end: 0.0 },
        rotate: { min: -14, max: 14 },
        blendMode: "ADD",
      });
      emRain.setDepth(46);
      emRain.setScrollFactor(0);

      emFog.setVisible(false);
      emRain.setVisible(false);

      this.fxWeather = { fog: emFog, rain: emRain };

      // Glitch overlay (screen-space graphics)
      this.glitchOverlay = this.add.graphics();
      this.glitchOverlay.setScrollFactor(0);
      this.glitchOverlay.setDepth(55);

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
        if (this.darkOverlay) {
          this.darkOverlay.width = w;
          this.darkOverlay.height = h;
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
        e: Phaser.Input.Keyboard.KeyCodes.E,
        r: Phaser.Input.Keyboard.KeyCodes.R,
        shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
        tab: Phaser.Input.Keyboard.KeyCodes.TAB,
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

      this.physics.add.overlap(this.enemyProjectiles, this.player, (proj) => {
        this._onEnemyProjectileHit(/** @type {Phaser.GameObjects.GameObject} */ (proj));
      });

      // Solid collisions
      this.physics.add.collider(this.player, this.solids);
      this.physics.add.collider(this.monsters, this.solids);
      this.physics.add.overlap(this.projectiles, this.solids, (proj) => {
        const pObj = /** @type {Phaser.GameObjects.GameObject} */ (proj);
        if (pObj?.active) pObj.destroy();
      });

      this.physics.add.overlap(this.enemyProjectiles, this.solids, (proj) => {
        const pObj = /** @type {Phaser.GameObjects.GameObject} */ (proj);
        if (pObj?.active) {
          try {
            const w = pObj.getData?.("warn");
            if (w?.active) w.destroy();
          } catch {}
          pObj.destroy();
        }
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

      // Skills / dodge (JustDown so they don't spam)
      if (this.keys.tab && Phaser.Input.Keyboard.JustDown(this.keys.tab)) {
        // Prevent browser focus navigation.
        try { this.input.keyboard?.preventDefault?.(this.keys.tab); } catch {}
        gs.ui?.togglePanel?.();
      }
      if (this.keys.shift && Phaser.Input.Keyboard.JustDown(this.keys.shift)) {
        this._tryDodge();
      }
      if (this.keys.e && Phaser.Input.Keyboard.JustDown(this.keys.e)) {
        this._trySkillDash();
      }
      if (this.keys.r && Phaser.Input.Keyboard.JustDown(this.keys.r)) {
        this._trySkillShockwave();
      }

      if (this.keys.esc.isDown) {
        this.scene.pause();
        this.scene.pause("UIScene");
        this.scene.launch("PauseScene");
      }

      this._movePlayer();
      this._aiTick();
      this._tickMonsterVisuals();
      this._tickEnemyProjectiles();
      this._tickPlayerProjectiles();

      this._applyInvulnVisuals();

      // Neo-pixel lighting follows the player.
      if (this.playerLight && this.player && this.player.active) {
        this.playerLight.setPosition(this.player.x, this.player.y);
      }

      if (this.playerLightBloomA && this.player && this.player.active) {
        this.playerLightBloomA.setPosition(this.player.x, this.player.y);
      }
      if (this.playerLightBloomB && this.player && this.player.active) {
        this.playerLightBloomB.setPosition(this.player.x, this.player.y);
      }
      if (this.playerShadow && this.player && this.player.active) {
        this.playerShadow.setPosition(this.player.x, this.player.y + 8);
      }

      // Ambience refresh (bg scroll + stratum toggles)
      if (nowMs() - this._lastAmbienceAt > 140) {
        this._lastAmbienceAt = nowMs();
        const danger = this._dangerState();
        this._updateAmbience(danger.stratum);
      }

      // Adaptive combat audio refresh
      if (gs.audio && nowMs() - (this._lastAudioCombatAt ?? 0) > 160) {
        this._lastAudioCombatAt = nowMs();
        this._tickAudioCombat();
      }

      // Screen FX refresh (corruption / instability)
      if (nowMs() - this._lastScreenFxAt > 120) {
        this._lastScreenFxAt = nowMs();
        this._tickScreenFx();
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

    _tickAudioCombat() {
      const gs = this.registry.get("gameState");
      if (!gs.audio?.setCombatIntensity) return;

      const danger = this._dangerState();
      const t = nowMs();

      let nearest = Infinity;
      let countNear = 0;
      const nearR = 270;

      if (this.monsters) {
        this.monsters.children.iterate((child) => {
          if (!child || !child.active) return;
          const d = Math.hypot(child.x - this.player.x, child.y - this.player.y);
          if (d < nearest) nearest = d;
          if (d < nearR) countNear++;
        });
      }

      const threatBase = clamp(((Number(danger.threat ?? 1) || 1) - 1) / 3.2, 0, 1) * 0.40;
      const crowd = clamp(countNear / 6, 0, 1) * 0.45;
      const close = Number.isFinite(nearest) ? clamp(1 - nearest / 280, 0, 1) * 0.25 : 0;
      const recentHit = t - (this._lastPlayerDamageAt ?? 0) < 1600 ? 0.25 : 0;
      const recentAtk = t - (this.lastAttackAt ?? 0) < 900 ? 0.12 : 0;

      const intensity = clamp(threatBase + crowd + close + recentHit + recentAtk, 0, 1);
      gs.audio.setCombatIntensity(intensity);
    }

    _applyInvulnVisuals() {
      if (!this.player?.active) return;
      if (!Number.isFinite(this._basePlayerAlpha)) this._basePlayerAlpha = this.player.alpha ?? 1.0;

      const t = nowMs();
      const inv = t < (this._invulnUntil ?? 0);
      if (inv) {
        const phase = (t % 120) / 120;
        const a = 0.55 + 0.35 * Math.abs(Math.sin(phase * Math.PI * 2));
        this.player.setAlpha(a);
      } else {
        // Restore
        if (this.player.alpha !== this._basePlayerAlpha) this.player.setAlpha(this._basePlayerAlpha);
      }
    }

    _fxAccentKey() {
      // Pick an accent by ambience (keeps the palette consistent).
      const s = this._ambienceStratum ?? STRATA.JARDIN;
      return s === STRATA.FORGE ? "amber" : s === STRATA.ABIME ? "magenta" : "cyan";
    }

    _spawnImpactFx(x, y, accent = "cyan", scale = 1.0) {
      // Always try to show feedback, but cap extreme floods.
      if (!this._fxAllow("impacts", 28)) return;
      const key = accent === "amber" ? "fx_spark_amber" : accent === "magenta" ? "fx_spark_magenta" : "fx_spark_cyan";
      const img = this.add.image(x, y, key);
      img.setBlendMode(Phaser.BlendModes.ADD);
      img.setDepth(26);
      img.setScale(scale);
      img.setAlpha(0.85);
      img.setAngle(Math.random() * 360);
      this.tweens.add({ targets: img, alpha: 0, scale: scale * 1.55, duration: 160, ease: "Sine.easeOut", onComplete: () => img.destroy() });

      // Small secondary flicker
      if (this._fxBudget.impacts <= 18 && Math.random() < 0.6) {
        const img2 = this.add.image(x + (Math.random() * 8 - 4), y + (Math.random() * 8 - 4), "fx_trail_white");
        img2.setBlendMode(Phaser.BlendModes.ADD);
        img2.setDepth(26);
        img2.setAlpha(0.35);
        img2.setScale(1.2);
        this.tweens.add({ targets: img2, alpha: 0, scale: 2.0, duration: 140, ease: "Sine.easeOut", onComplete: () => img2.destroy() });
      }
    }

    _flashSprite(sprite, accent = "cyan") {
      if (!sprite?.active || typeof sprite.setTintFill !== "function") return;
      const c = accent === "amber" ? 0xffb000 : accent === "magenta" ? 0xff4df2 : 0x00ffc8;
      try {
        sprite.setTintFill(c);
      } catch {}
      this.time.delayedCall(70, () => {
        if (!sprite?.active || typeof sprite.clearTint !== "function") return;
        try { sprite.clearTint(); } catch {}
      });
    }

    _monsterAttackKick(mon, accent = "cyan", dir = null) {
      if (!mon?.active) return;
      const t = nowMs();
      const last = Number(mon.getData?.("lastKickAt") ?? 0) || 0;
      if (t - last < 140) return;
      mon.setData?.("lastKickAt", t);

      this._flashSprite(mon, accent);

      const dx = dir && Number.isFinite(dir.x) ? dir.x : 0;
      const dy = dir && Number.isFinite(dir.y) ? dir.y : 0;
      const ox = dx * 10;
      const oy = dy * 10;
      this._spawnImpactFx(mon.x + ox, mon.y + oy, accent, 0.55);
    }

    _spawnMeleeAfterimage(originX, originY, aim, stage) {
      // Stage-based intensity: stage 0 subtle, stage 2 strong.
      const accent = this._fxAccentKey();
      const key = stage >= 2 ? "fx_slash_magenta" : stage >= 1 ? "fx_slash_amber" : "fx_slash_cyan";
      const count = stage >= 2 ? 3 : stage >= 1 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const k = i + 1;
        this.time.delayedCall(k * 24, () => {
          const img = this.add.image(originX - aim.x * (k * 6), originY - aim.y * (k * 6), key);
          img.setRotation(Math.atan2(aim.y, aim.x));
          img.setBlendMode(Phaser.BlendModes.ADD);
          img.setDepth(23);
          img.setAlpha(0.34 - i * 0.08);
          img.setScale(0.85 + stage * 0.18 + i * 0.06);
          this.tweens.add({ targets: img, alpha: 0, duration: 160, ease: "Sine.easeOut", onComplete: () => img.destroy() });
        });
      }

      // Small spark at the tip for combo 2/3.
      if (stage >= 1) {
        this._spawnImpactFx(originX + aim.x * 22, originY + aim.y * 22, accent, 0.9 + stage * 0.12);
      }
    }

    _spawnShotTelegraph(x, y, dir, accent = "cyan", durationMs = 220) {
      if (!this._fxAllow("telegraphs", 26)) return;
      const g = this.add.graphics();
      g.setDepth(24);
      const c = accent === "amber" ? 0xffb000 : accent === "magenta" ? 0xff4df2 : 0x00ffc8;
      const a = 0.28;
      const len = 26;
      const x2 = x + dir.x * len;
      const y2 = y + dir.y * len;
      g.lineStyle(2, c, a);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x2, y2);
      g.strokePath();
      g.fillStyle(c, 0.12);
      g.fillCircle(x, y, 6);
      g.setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({ targets: g, alpha: 0, duration: durationMs, ease: "Sine.easeOut", onComplete: () => g.destroy() });
    }

    _tickPlayerProjectiles() {
      if (!this.projectiles) return;
      const t = nowMs();
      if (t - this._lastPlayerProjectileTrailAt < 70) return;
      this._lastPlayerProjectileTrailAt = t;

      // Cheap trail for readability (avoid heavy particle systems per projectile)
      let spawned = 0;
      this.projectiles.children.iterate((child) => {
        if (!child) return;
        const p = /** @type {Phaser.Physics.Arcade.Image} */ (child);
        if (!p.active) return;

        if (spawned >= 12) return;
        if (!this._fxAllow("trails", 30)) return;
        spawned++;

        const accent = String(p.getData("trail") ?? "cyan");
        const key = accent === "amber" ? "fx_trail_amber" : accent === "magenta" ? "fx_trail_magenta" : "fx_trail_cyan";
        const tr = this.add.image(p.x, p.y, key);
        tr.setBlendMode(Phaser.BlendModes.ADD);
        tr.setDepth(12);
        tr.setAlpha(0.22);
        tr.setScale(1.0);
        this.tweens.add({ targets: tr, alpha: 0, duration: 220, onComplete: () => tr.destroy() });
      });
    }

    _tickScreenFx() {
      const gs = this.registry.get("gameState");
      const danger = this._dangerState();
      const ck = this._currentChunkKey();
      const chunk = gs.world.world.chunks?.[ck] ?? this._currentChunk();
      const stability = clamp(Number(chunk?.stability ?? 50), 0, 100);
      const instability = clamp((100 - stability) / 100, 0, 1);

      // Glitch level reacts to instability + threat.
      const threatN = clamp((danger.threat - 1.0) / 3.8, 0, 1);
      this._glitchLevel = clamp(instability * 0.95 + threatN * 0.22, 0, 1);

      // Dynamic darkness: soften in Jardin, heavier in corrupted zones.
      if (this.darkOverlay) {
        const base = danger.stratum === STRATA.JARDIN ? 0.06 : danger.stratum === STRATA.FORGE ? 0.30 : 0.34;
        this.darkOverlay.fillAlpha = clamp(base + this._glitchLevel * 0.18, 0.03, 0.62);
      }

      // Weather toggles
      if (this.fxWeather) {
        const inDungeon = this._isInDungeon();
        const showFog = !inDungeon && (danger.stratum === STRATA.ABIME || (instability > 0.55 && danger.stratum !== STRATA.JARDIN));
        const showRain = !inDungeon && (danger.stratum === STRATA.FORGE ? instability > 0.45 : instability > 0.70);
        this.fxWeather.fog.setVisible(showFog);
        this.fxWeather.rain.setVisible(showRain);
      }

      // Glitch overlay redraw
      if (this.glitchOverlay) {
        const cam = this.cameras.main;
        const w = cam.width;
        const h = cam.height;
        this.glitchOverlay.clear();

        const g = this._glitchLevel;
        if (g > 0.05) {
          const rng = makeRng(hash32(`${Math.floor(nowMs() / 120)}:${this.player.x.toFixed(0)},${this.player.y.toFixed(0)}`) ^ 0x51d2);
          const lineCount = 6 + Math.floor(g * 18);
          const blockCount = 2 + Math.floor(g * 10);

          // Scanlines
          for (let i = 0; i < lineCount; i++) {
            const y = Math.floor(rng.nextRange(0, h));
            const hh = 1 + rng.nextInt(2);
            const a = (0.03 + rng.nextRange(0, 0.08)) * g;
            const c = rng.next() < 0.5 ? 0x00ffc8 : rng.next() < 0.5 ? 0xffb000 : 0xff4df2;
            this.glitchOverlay.fillStyle(c, a);
            this.glitchOverlay.fillRect(0, y, w, hh);
          }

          // Blocks / chroma tears
          for (let i = 0; i < blockCount; i++) {
            const x = Math.floor(rng.nextRange(0, w));
            const y = Math.floor(rng.nextRange(0, h));
            const bw = 10 + rng.nextInt(60);
            const bh = 6 + rng.nextInt(22);
            const a = (0.02 + rng.nextRange(0, 0.07)) * g;
            const c = rng.next() < 0.5 ? 0xffffff : rng.next() < 0.5 ? 0x00ffc8 : 0xff4df2;
            this.glitchOverlay.fillStyle(c, a);
            this.glitchOverlay.fillRect(x, y, bw, bh);
          }
        }
      }
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

    _pickMonsterTexture(stratum, aiKind, rng) {
      const kind = String(aiKind ?? "skirmisher");
      const pick = (arr) => arr[rng.nextInt(arr.length)];

      if (stratum === STRATA.JARDIN) {
        if (kind === "charger") return "spr_monster_jardin";
        if (kind === "spitter") return rng.next() < 0.65 ? "spr_monster_jardin_b" : "spr_monster_jardin";
        return rng.next() < 0.70 ? "spr_monster_jardin_a" : "spr_monster_jardin";
      }

      if (stratum === STRATA.FORGE) {
        if (kind === "gunner") return rng.next() < 0.75 ? "spr_monster_forge_a" : "spr_monster_forge";
        if (kind === "charger") return "spr_monster_forge";
        return rng.next() < 0.60 ? "spr_monster_forge_b" : "spr_monster_forge";
      }

      // ABIME / dungeon default
      if (kind === "lurker") return rng.next() < 0.70 ? "spr_monster_abime_a" : "spr_monster_abime";
      if (kind === "summoner") return rng.next() < 0.75 ? "spr_monster_abime_b" : "spr_monster_abime";
      return pick(["spr_monster_abime", "spr_monster_abime_a", "spr_monster_abime_b"]);
    }

    _applyMonsterVisualProfile(mon) {
      if (!mon || !mon.active) return;

      const isBoss = !!mon.getData?.("dungeonBossId");
      const stratum = mon.getData?.("stratum") ?? STRATA.ABIME;
      const aiKind = String(mon.getData?.("aiKind") ?? "skirmisher");
      const seed = Number(mon.getData?.("aiSeed") ?? 0.1) || 0.1;
      const threat = Number(mon.getData?.("threat") ?? 1) || 1;

      // Texture selection (don’t override boss texture)
      if (!isBoss) {
        const rng = makeRng(hash32(`${stratum}:${aiKind}:${seed}`) ^ 0x7b31);
        const tex = this._pickMonsterTexture(stratum, aiKind, rng);
        try { mon.setTexture(tex); } catch {}
      }

      // Small silhouette variation (keeps physics untouched)
      if (!mon.getData?.("visInited")) {
        mon.setData("visInited", true);

        const flip = seed > 0.5;
        try { mon.setFlipX(!!flip); } catch {}

        const baseScale = isBoss ? 1.25 : aiKind === "charger" ? 1.06 : aiKind === "lurker" ? 0.98 : 1.0;
        mon.setScale(baseScale);

        if (aiKind === "lurker") mon.setAlpha(0.84);
        if (aiKind === "summoner") mon.setAlpha(0.92);

        // Attach a faint additive halo for readability/neo feel.
        const haloTex = stratum === STRATA.JARDIN ? "spr_light_jardin" : stratum === STRATA.FORGE ? "spr_light_forge" : "spr_light_abime";
        const halo = this.add.image(mon.x, mon.y, haloTex);
        halo.setBlendMode(Phaser.BlendModes.ADD);
        halo.setAlpha(isBoss ? 0.42 : 0.10 + clamp(threat * 0.03, 0, 0.14));
        halo.setScale(isBoss ? 0.90 : aiKind === "summoner" ? 0.50 : aiKind === "gunner" ? 0.42 : aiKind === "charger" ? 0.38 : 0.40);
        halo.setDepth((Number.isFinite(mon.depth) ? mon.depth : 0) - 1);
        mon.setData("halo", halo);

        // Soft pulse (halo only, avoids physics jitter)
        const rng2 = makeRng(hash32(`${seed}:${aiKind}:halo`) ^ 0x2a11);
        this.tweens.add({
          targets: halo,
          alpha: { from: halo.alpha * 0.75, to: halo.alpha * 1.25 },
          duration: 820 + rng2.nextInt(520),
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
        this.tweens.add({
          targets: halo,
          scale: { from: halo.scale * 0.92, to: halo.scale * 1.08 },
          duration: 1050 + rng2.nextInt(700),
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
          delay: 60,
        });

        // Cleanup
        try {
          mon.once(Phaser.GameObjects.Events.DESTROY, () => {
            try {
              const h = mon.getData?.("halo");
              if (h?.active) h.destroy();
            } catch {}
          });
        } catch {}
      }
    }

    _tickMonsterVisuals() {
      if (!this.monsters) return;
      const t = nowMs();
      if (t - (this._lastMonsterVisualAt ?? 0) < 80) return;
      this._lastMonsterVisualAt = t;

      this.monsters.children.iterate((child) => {
        if (!child || !child.active) return;
        const mon = /** @type {Phaser.Physics.Arcade.Image} */ (child);

        // Ensure visuals are initialized (also covers older spawns).
        this._applyMonsterVisualProfile(mon);

        const halo = mon.getData?.("halo");
        if (halo && halo.active) {
          halo.setPosition(mon.x, mon.y);
          halo.setDepth((Number.isFinite(mon.depth) ? mon.depth : 0) - 1);

          // Slight boost when close to player (readability)
          const d = this.player?.active ? Math.hypot(mon.x - this.player.x, mon.y - this.player.y) : 999;
          const near = clamp(1.0 - d / 300, 0, 1);
          const baseA = mon.getData?.("dungeonBossId") ? 0.40 : 0.10 + clamp((Number(mon.getData?.("threat") ?? 1) || 1) * 0.03, 0, 0.14);
          halo.setAlpha(clamp(baseA * (0.85 + near * 0.65), 0.03, 0.65));
        }
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

      if (this.darkOverlay) {
        // Darker in Forge/Abime, softer in Jardin.
        this.darkOverlay.fillAlpha = isJ ? 0.06 : isF ? 0.30 : 0.34;
      }

      if (this.playerLight) {
        this.playerLight.setTexture(isJ ? "spr_light_jardin" : isF ? "spr_light_forge" : "spr_light_abime");
        this.playerLight.setAlpha(isJ ? 0.85 : isF ? 0.95 : 1.0);
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

      const now = nowMs();
      const cd = this._cooldowns ?? { dodgeReadyAt: 0, dashReadyAt: 0, shockReadyAt: 0 };
      const cdLeft = (readyAt) => Math.max(0, (Number(readyAt ?? 0) - now) / 1000);

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
        comboStage: this._combo?.stage ?? 0,
        abilities: {
          dodge: { key: "SHIFT", cd: cdLeft(cd.dodgeReadyAt), cdMax: 0.9 },
          dash: { key: "E", cd: cdLeft(cd.dashReadyAt), cdMax: 2.5 },
          shock: { key: "R", cd: cdLeft(cd.shockReadyAt), cdMax: 5.2 },
        },
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
      const ck = this._currentChunkKey();
      const chunk = gs.world.world.chunks?.[ck] ?? this._currentChunk();

      const pois = [];
      if (chunk?.pillar) {
        pois.push({ kind: "pillar", x: chunk.pillar.x, y: chunk.pillar.y, active: !!chunk.pillar.buffActive });
      }

      return {
        player: { x: px, y: py },
        facing: { x: gs._facing?.x ?? 1, y: gs._facing?.y ?? 0 },
        stratum,
        threat,
        entities,
        site,
        pois,
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

      const mods = this._playerEssenceMods();
      const palePenalty = p.pale ? 0.78 : 1.0;
      const chunk = this._currentChunk();
      const zoneSpeedBonus = chunk?.pillar?.buffActive ? 1.1 : 1.0;
      const speed = BASE_MOVE_SPEED * palePenalty * zoneSpeedBonus * (mods.speedMul ?? 1.0);

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

      // Simple combo system (mainly for melee): 3 steps if you keep rhythm.
      const comboWindow = 650;
      const isMelee = String(weapon.behaviorId ?? "").startsWith("melee") || weapon.type === "melee" || weapon.type === "hybrid";
      if (isMelee) {
        if (t - (this._combo.lastAt ?? 0) <= comboWindow) this._combo.stage = clamp((this._combo.stage ?? 0) + 1, 0, 2);
        else this._combo.stage = 0;
        this._combo.lastAt = t;
      } else {
        this._combo.stage = 0;
        this._combo.lastAt = t;
      }

      this.lastAttackAt = t;
      p.essence = Math.max(0, p.essence - weapon.essenceCost);
      p.pale = p.essence < 6;

      const facing = gs._facing ?? { x: 1, y: 0 };
      const aim = this._aimDirection(facing);

      const mods = this._playerEssenceMods();
      const comboMul = isMelee ? (1.0 + (this._combo.stage ?? 0) * 0.14) : 1.0;
      const paleDamageMul = p.pale ? 0.85 : 1.0;

      gs.combat.fireWeapon({
        scene: this,
        weapon: { ...weapon, damage: (weapon.damage ?? 0) * paleDamageMul * (mods.damageMul ?? 1.0) * comboMul },
        playerSprite: this.player,
        aim,
      });

      // Tiny neon slash accent for melee combo readability.
      if (isMelee) {
        const stage = Number(this._combo.stage ?? 0);
        this._spawnMeleeAfterimage(this.player.x + aim.x * 16, this.player.y + aim.y * 16, aim, stage);
      }

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
      if (t < (this._invulnUntil ?? 0)) return;
      if (t - this._lastPlayerDamageAt < 350) return;
      this._lastPlayerDamageAt = t;

      const mods = this._playerEssenceMods();
      const taken = amount * (mods.takenMul ?? 1.0);

      p.hp = Math.max(0, p.hp - taken);
      this._spawnDamageNumber(this.player?.x ?? p.x, (this.player?.y ?? p.y) - 14, `-${taken.toFixed(1)}`, "rgba(255,90,90,0.95)");
      if (p.hp <= 0) {
        this._respawn();
      }
    }

    _playerEssenceMods() {
      const gs = this.registry.get("gameState");
      const p = gs.world.player;
      const r = clamp((p.essenceMax ? p.essence / p.essenceMax : 0.5), 0, 1);

      // High Essence: more damage, more fragile.
      // Low Essence: pale + weak (less damage, also fragile).
      let damageMul = 1.0;
      let takenMul = 1.0;
      let speedMul = 1.0;
      if (r >= 0.78) {
        damageMul = 1.15;
        takenMul = 1.15;
      } else if (r <= 0.22) {
        damageMul = 0.86;
        takenMul = 1.10;
        speedMul = 0.92;
      }
      if (p.pale) {
        damageMul *= 0.90;
        speedMul *= 0.92;
      }
      return { r, damageMul, takenMul, speedMul };
    }

    _spawnDamageNumber(x, y, text, color = "rgba(255,255,255,0.9)") {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const t = this.add.text(x, y, String(text), {
        fontFamily: "ui-monospace, Menlo, Consolas, monospace",
        fontSize: "12px",
        color,
        stroke: "rgba(0,0,0,0.55)",
        strokeThickness: 3,
      });
      t.setOrigin(0.5, 1);
      t.setDepth(999);
      this.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 520, ease: "Sine.easeOut", onComplete: () => t.destroy() });
    }

    _tryDodge() {
      const gs = this.registry.get("gameState");
      const p = gs.world.player;
      const t = nowMs();
      if (t < (this._cooldowns.dodgeReadyAt ?? 0)) return;

      const cost = 0.9;
      if (p.essence < cost) return;

      // Direction: current input or facing.
      const facing = gs._facing ?? { x: 1, y: 0 };
      const aim = this._aimDirection(facing);

      p.essence = Math.max(0, p.essence - cost);
      p.pale = p.essence < 6;

      this._cooldowns.dodgeReadyAt = t + 900;
      this._invulnUntil = t + 240;

      // Quick flash feedback
      this._flashSprite(this.player, "cyan");

      const sp = 420;
      this.player.setVelocity(aim.x * sp, aim.y * sp);
      this.player.setAcceleration(0, 0);

      // Neon afterimage
      const img = this.add.image(this.player.x, this.player.y, "spr_essence");
      img.setBlendMode(Phaser.BlendModes.ADD);
      img.setAlpha(0.35);
      img.setScale(1.35);
      img.setDepth(30);
      this.tweens.add({ targets: img, alpha: 0, duration: 220, onComplete: () => img.destroy() });
    }

    _trySkillDash() {
      const gs = this.registry.get("gameState");
      const p = gs.world.player;
      const t = nowMs();
      if (t < (this._cooldowns.dashReadyAt ?? 0)) return;

      const cost = 1.6;
      if (p.essence < cost) return;

      const facing = gs._facing ?? { x: 1, y: 0 };
      const aim = this._aimDirection(facing);

      p.essence = Math.max(0, p.essence - cost);
      p.pale = p.essence < 6;

      this._cooldowns.dashReadyAt = t + 2500;
      this._invulnUntil = Math.max(this._invulnUntil ?? 0, t + 160);

      this._flashSprite(this.player, "amber");

      const sp = 560;
      this.player.setVelocity(aim.x * sp, aim.y * sp);
      this.player.setAcceleration(0, 0);

      // Dash trail
      for (let k = 0; k < 4; k++) {
        this.time.delayedCall(k * 30, () => {
          if (!this.player?.active) return;
          const tr = this.add.image(this.player.x - aim.x * (k * 12), this.player.y - aim.y * (k * 12), "fx_dash_streak");
          tr.setBlendMode(Phaser.BlendModes.ADD);
          tr.setAlpha(0.32 - k * 0.04);
          tr.setScale(0.9 + k * 0.08);
          tr.setRotation(Math.atan2(aim.y, aim.x));
          tr.setDepth(28);
          this.tweens.add({ targets: tr, alpha: 0, duration: 260, onComplete: () => tr.destroy() });
        });
      }

      // Small line hit at the end of the dash (fair AoE)
      this.time.delayedCall(90, () => {
        if (!this.player?.active) return;
        const mods = this._playerEssenceMods();
        const dmg = (7.0 + mods.damageMul * 3.0);
        const radius = 54;
        this._areaHitMonsters(this.player.x, this.player.y, radius, dmg, 210);
      });
    }

    _trySkillShockwave() {
      const gs = this.registry.get("gameState");
      const p = gs.world.player;
      const t = nowMs();
      if (t < (this._cooldowns.shockReadyAt ?? 0)) return;

      const cost = 2.4;
      if (p.essence < cost) return;

      p.essence = Math.max(0, p.essence - cost);
      p.pale = p.essence < 6;
      this._cooldowns.shockReadyAt = t + 5200;

      const mods = this._playerEssenceMods();
      const radius = 92;
      const dmg = 10.0 * mods.damageMul;

      // VFX rings (multi-layer for punch)
      const ringA = this.add.image(this.player.x, this.player.y, "spr_light_soft");
      ringA.setBlendMode(Phaser.BlendModes.ADD);
      ringA.setAlpha(0.34);
      ringA.setScale(0.55);
      ringA.setDepth(26);
      this.tweens.add({ targets: ringA, alpha: 0, scale: 1.18, duration: 250, ease: "Sine.easeOut", onComplete: () => ringA.destroy() });

      const ringB = this.add.image(this.player.x, this.player.y, "spr_light_soft");
      ringB.setBlendMode(Phaser.BlendModes.ADD);
      ringB.setAlpha(0.18);
      ringB.setScale(0.80);
      ringB.setDepth(25);
      this.tweens.add({ targets: ringB, alpha: 0, scale: 1.55, duration: 320, ease: "Sine.easeOut", onComplete: () => ringB.destroy() });

      // Perimeter sparks
      const accent = this._fxAccentKey();
      const sparkCount = 10;
      for (let i = 0; i < sparkCount; i++) {
        const a = (i / sparkCount) * Math.PI * 2;
        const sx = this.player.x + Math.cos(a) * 26;
        const sy = this.player.y + Math.sin(a) * 26;
        this.time.delayedCall(i * 10, () => this._spawnImpactFx(sx, sy, accent, 0.9));
      }

      this._areaHitMonsters(this.player.x, this.player.y, radius, dmg, 260);
    }

    _areaHitMonsters(x, y, radius, damage, knockback) {
      this.monsters.children.iterate((child) => {
        if (!child) return;
        const mon = /** @type {Phaser.Physics.Arcade.Image} */ (child);
        const d = Math.hypot(mon.x - x, mon.y - y);
        if (d > radius) return;
        const dx = mon.x - x;
        const dy = mon.y - y;
        const len = d || 1;

        const hp = (mon.getData("hp") ?? 6) - damage;
        mon.setData("hp", hp);
        this._spawnDamageNumber(mon.x, mon.y - 10, `-${damage.toFixed(0)}`, "rgba(255,77,242,0.95)");
        this._flashSprite(mon, this._fxAccentKey());
        if (hp <= 0) this._killMonster(mon);

        mon.setVelocity((dx / len) * knockback, (dy / len) * knockback);
      });
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

      // Impact feedback
      this._spawnImpactFx(pObj.x, pObj.y, String(pObj.getData("trail") ?? this._fxAccentKey()));

      const hp = (mObj.getData("hp") ?? 5) - dmg;
      mObj.setData("hp", hp);
      this._flashSprite(mObj, String(pObj.getData("trail") ?? this._fxAccentKey()));

      if (typeof this._spawnDamageNumber === "function") {
        this._spawnDamageNumber(mObj.x, mObj.y - 10, `-${Number(dmg).toFixed(0)}`, "rgba(255,77,242,0.95)");
      }

      if (hp <= 0) {
        this._killMonster(mObj);
      }

      if (pierce <= 0) {
        pObj.destroy();
      } else {
        pObj.setData("pierce", pierce - 1);
      }
    }

    _onEnemyProjectileHit(proj) {
      const pObj = /** @type {Phaser.Physics.Arcade.Image} */ (proj);
      if (!pObj?.active) return;
      const dmg = pObj.getData("damage") ?? 0.65;
      this._applyDamageToPlayer(dmg);

      // Enemy hit feedback
      this._spawnImpactFx(this.player.x, this.player.y - 6, "magenta", 1.15);

      try {
        const w = pObj.getData("warn");
        if (w?.active) w.destroy();
      } catch {}
      pObj.destroy();
    }

    _spawnEnemyProjectile(x, y, tex, vx, vy, opts = {}) {
      if (!this.enemyProjectiles) return null;
      const p = this.physics.add.image(x, y, tex);
      p.setCircle(3, 1, 1);
      p.setData("damage", opts.damage ?? 0.65);
      p.setData("spawnAt", nowMs());
      p.setData("ttl", opts.ttl ?? 1800);
      p.setData("homing", !!opts.homing);

      const accent = tex.includes("forge") ? "amber" : tex.includes("abime") ? "magenta" : "cyan";
      p.setData("trail", accent);
      this._spawnImpactFx(x, y, accent, 0.75);

      // Warning ring for homing projectiles (purely visual, fair telegraph)
      if (opts.homing) {
        const warn = this.add.image(x, y, "spr_light_soft");
        warn.setBlendMode(Phaser.BlendModes.ADD);
        warn.setDepth(13);
        warn.setAlpha(0.16);
        warn.setScale(0.28);
        p.setData("warn", warn);
      }

      p.setVelocity(vx, vy);
      p.setDrag(0, 0);
      p.setMaxVelocity(340, 340);
      p.setDepth(14);
      if (opts.additive) p.setBlendMode(Phaser.BlendModes.ADD);
      this.enemyProjectiles.add(p);
      return p;
    }

    _tickEnemyProjectiles() {
      if (!this.enemyProjectiles) return;
      const t = nowMs();
      if (t - this._lastEnemyProjectileTickAt < 120) return;
      this._lastEnemyProjectileTickAt = t;

      const px = this.player?.x ?? 0;
      const py = this.player?.y ?? 0;

      let spawned = 0;
      this.enemyProjectiles.children.iterate((child) => {
        if (!child) return;
        const p = /** @type {Phaser.Physics.Arcade.Image} */ (child);
        if (!p.active) return;

        // Trail for readability
        if (spawned < 10 && this._fxAllow("trails", 30)) {
          spawned++;
          const accent = String(p.getData("trail") ?? "magenta");
          const key = accent === "amber" ? "fx_trail_amber" : accent === "cyan" ? "fx_trail_cyan" : "fx_trail_magenta";
          const tr = this.add.image(p.x, p.y, key);
          tr.setBlendMode(Phaser.BlendModes.ADD);
          tr.setDepth(13);
          tr.setAlpha(0.16);
          tr.setScale(0.9);
          this.tweens.add({ targets: tr, alpha: 0, duration: 220, onComplete: () => tr.destroy() });
        }

        // Homing warning follow + pulse
        try {
          const w = p.getData("warn");
          if (w?.active) {
            w.setPosition(p.x, p.y);
            const ph = (t % 260) / 260;
            w.setAlpha(0.10 + 0.10 * Math.abs(Math.sin(ph * Math.PI * 2)));
          }
        } catch {}

        const born = Number(p.getData("spawnAt") ?? 0) || 0;
        const ttl = Number(p.getData("ttl") ?? 0) || 0;
        if (ttl > 0 && t - born > ttl) {
          try {
            const w = p.getData("warn");
            if (w?.active) w.destroy();
          } catch {}
          p.destroy();
          return;
        }

        if (p.getData("homing")) {
          const dx = px - p.x;
          const dy = py - p.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = dx / len;
          const ny = dy / len;
          const v = p.body?.velocity;
          if (v) {
            v.x = Phaser.Math.Linear(v.x, nx * 165, 0.08);
            v.y = Phaser.Math.Linear(v.y, ny * 165, 0.08);
          }
        }
      });
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

        // Basic archetype + visuals (keeps waves readable)
        const roll = rng.next();
        const aiKind =
          stratum === STRATA.JARDIN
            ? (roll < 0.50 ? "skirmisher" : roll < 0.78 ? "charger" : "spitter")
            : stratum === STRATA.FORGE
              ? (roll < 0.52 ? "charger" : roll < 0.84 ? "gunner" : "skirmisher")
              : (roll < 0.45 ? "lurker" : roll < 0.74 ? "summoner" : "skirmisher");
        mon.setData("aiKind", aiKind);
        mon.setData("aiSeed", rng.next());
        mon.setData("lastBurstAt", 0);
        mon.setData("lastShotAt", 0);

        this._applyIdleBreathe(mon, rng.next());
        this._applyMonsterVisualProfile(mon);
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

        const mon = this.physics.add.image(x, y, "spr_monster_abime");
        mon.setCircle(7, 1, 1);
        mon.setData("hp", hp);
        mon.setData("threat", localThreat);
        mon.setData("stratum", STRATA.ABIME);
        mon.setData("dungeon", true);

        const roll = rng.next();
        const aiKind = roll < 0.46 ? "lurker" : roll < 0.78 ? "summoner" : "skirmisher";
        mon.setData("aiKind", aiKind);
        mon.setData("aiSeed", rng.next());
        mon.setData("lastBurstAt", 0);
        mon.setData("lastShotAt", 0);

        this._applyIdleBreathe(mon, rng.next());
        this._applyMonsterVisualProfile(mon);
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

      // Render base tiles into a single RenderTexture for performance.
      // (Far fewer GameObjects than creating an Image per tile.)
      const rt = this.add.renderTexture(0, 0, CHUNK_SIZE_PX, CHUNK_SIZE_PX);
      rt.setOrigin(0, 0);
      container.add(rt);

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
  const DETAIL_VARIANTS = 3;
  const PATH_VARIANTS = 3;

  const texKey = (kind, idx) => `tile_${kind}_${stratumKey}_${idx}`;
  const pickExisting = (primaryKey, fallbackKey) => (this.textures.exists(primaryKey) ? primaryKey : fallbackKey);
  const baseFallback = `tile_floor_${stratumKey}`;
  const wallFallback = `tile_wall_${stratumKey}`;
  const veinKey = `tile_vein_${stratumKey}`;

      const instability = 1 - chunk.stability / 100;

      // World-gen improvements: reduce maze walls and create readable paths/plazas.
      // Plaza near origin and around settlements; roads are segments connecting them.
      const isPlaza = (wx, wy) => {
        if (Math.hypot(wx, wy) < 200) return true;
        if (Array.isArray(this._settlements)) {
          for (const s of this._settlements) {
            if (s.stratum !== chunk.stratum) continue;
            if (Math.hypot(wx - s.x, wy - s.y) < 120) return true;
          }
        }
        return false;
      };

      const isRoad = (wx, wy) => {
        if (!Array.isArray(this._roadEdges)) return false;
        let best = Infinity;
        for (const e of this._roadEdges) {
          if (e.stratum !== chunk.stratum) continue;
          const d = pointSegDist(wx, wy, e.a.x, e.a.y, e.b.x, e.b.y);
          if (d < best) best = d;
        }
        return best < (chunk.stratum === STRATA.JARDIN ? 30 : chunk.stratum === STRATA.FORGE ? 28 : 26);
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
            : road
              ? pickExisting(`tile_path_${stratumKey}_${floorV % PATH_VARIANTS}`, baseFallback)
              : pickExisting(texKey("floor", floorV), baseFallback);

          // Draw the tile into the chunk RenderTexture.
          rt.drawFrame(baseKey, null, x, y);

          if (wall) {
            addSolidRect(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
          }

          // Rare detail overlay to break up repetition.
          if (!wall && ((h & 0xff) < (road ? 90 : plaza ? 70 : 28))) {
            const dv = (h >>> 9) % DETAIL_VARIANTS;
            const detailKey = pickExisting(texKey("detail", dv), null);
            if (detailKey) {
              const a = (road ? 0.22 : plaza ? 0.20 : 0.28) + (h & 7) * 0.02;
              rt.drawFrame(detailKey, null, x, y, a);
            }
          }

          if (!wall && !road && rng.next() < (0.10 + instability * 0.20)) {
            rt.drawFrame(veinKey, null, x, y, 0.18 + rng.next() * 0.18);
          }
        }
      }

      // Simple Jardin decor: trees + small "house" blobs to make it feel alive.
      if (chunk.stratum === STRATA.JARDIN) {
        const drawCentered = (tex, px, py, alpha = 1) => {
          const frame = this.textures.getFrame(tex);
          const w = frame?.width ?? 16;
          const h = frame?.height ?? 16;
          rt.drawFrame(tex, null, px - w / 2, py - h / 2, alpha);
          return { w, h };
        };

        // Villages (2–4) are generated deterministically; draw the parts that fall into this chunk.
        if (Array.isArray(this._settlements)) {
          for (const s of this._settlements) {
            if (s.stratum !== STRATA.JARDIN || s.kind !== "village") continue;
            const inChunk = s.x >= cx * CHUNK_SIZE_PX && s.x < (cx + 1) * CHUNK_SIZE_PX && s.y >= cy * CHUNK_SIZE_PX && s.y < (cy + 1) * CHUNK_SIZE_PX;
            if (!inChunk) continue;

            const vrng = makeRng(hash32(`v:${s.id}`) ^ 0x51a7);
            const px0 = s.x - cx * CHUNK_SIZE_PX;
            const py0 = s.y - cy * CHUNK_SIZE_PX;

            // Plaza tiles + small fountain landmark (baked, performant)
            const cTx = clamp(Math.floor(px0 / TILE_SIZE), 2, CHUNK_SIZE_TILES - 3);
            const cTy = clamp(Math.floor(py0 / TILE_SIZE), 2, CHUNK_SIZE_TILES - 3);
            for (let oy = -2; oy <= 2; oy++) {
              for (let ox = -2; ox <= 2; ox++) {
                if (Math.hypot(ox, oy) > 2.35) continue;
                const tx = clamp(cTx + ox, 1, CHUNK_SIZE_TILES - 2);
                const ty = clamp(cTy + oy, 1, CHUNK_SIZE_TILES - 2);
                const pv = (hash32(`p:${s.id}:${tx},${ty}`) >>> 0) % 3;
                rt.drawFrame(`tile_path_jardin_${pv}`, null, tx * TILE_SIZE, ty * TILE_SIZE, 0.92);
              }
            }
            drawCentered("spr_fountain_jardin", px0, py0 + 3, 1);
            addSolidRect(px0, py0 + 10, 26, 18);

            // Central glow marker for village core (kept as additive sprite, not baked).
            const glow = this.add.image(px0, py0, "spr_light_jardin");
            glow.setBlendMode(Phaser.BlendModes.ADD);
            glow.setAlpha(0.55);
            glow.setScale(0.95);
            glow.setDepth(18);
            container.add(glow);
            objectsCreated.push(glow);
            this.tweens.add({ targets: glow, alpha: { from: 0.45, to: 0.66 }, duration: 1100 + vrng.nextInt(900), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

            // Houses ring
            const houseCount = 4 + vrng.nextInt(4);
            for (let i = 0; i < houseCount; i++) {
              const ang = (i / houseCount) * Math.PI * 2 + vrng.nextRange(-0.25, 0.25);
              const rad = 78 + vrng.nextRange(-10, 26);
              const wx = s.x + Math.cos(ang) * rad;
              const wy = s.y + Math.sin(ang) * rad;
              if (wx < cx * CHUNK_SIZE_PX || wx >= (cx + 1) * CHUNK_SIZE_PX || wy < cy * CHUNK_SIZE_PX || wy >= (cy + 1) * CHUNK_SIZE_PX) continue;
              const px = wx - cx * CHUNK_SIZE_PX;
              const py = wy - cy * CHUNK_SIZE_PX;
              drawCentered("spr_house", px, py, 1);
              addSolidRect(px, py + 6, 34, 22);

              // Warm lamp glow
              const lamp = this.add.image(px + vrng.nextRange(-14, 14), py + 10, "spr_light_forge");
              lamp.setBlendMode(Phaser.BlendModes.ADD);
              lamp.setAlpha(0.38);
              lamp.setScale(0.52);
              lamp.setDepth(20);
              container.add(lamp);
              objectsCreated.push(lamp);
              this.tweens.add({ targets: lamp, alpha: { from: 0.26, to: 0.50 }, duration: 720 + vrng.nextInt(660), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
            }

            // Flowerbeds (baked into RT)
            const beds = 3 + vrng.nextInt(4);
            for (let i = 0; i < beds; i++) {
              const tx = clamp(Math.floor(px0 / TILE_SIZE) + vrng.nextInt(9) - 4, 2, CHUNK_SIZE_TILES - 3);
              const ty = clamp(Math.floor(py0 / TILE_SIZE) + vrng.nextInt(9) - 4, 2, CHUNK_SIZE_TILES - 3);
              rt.drawFrame("spr_flower", null, tx * TILE_SIZE + 2, ty * TILE_SIZE + 2, 0.95);
              rt.drawFrame("spr_flower", null, tx * TILE_SIZE + 8, ty * TILE_SIZE + 7, 0.92);
            }

            // A few fence segments to hint at yards (baked)
            for (let k = 0; k < 4; k++) {
              const ang = vrng.nextRange(0, Math.PI * 2);
              const rad = 56 + vrng.nextRange(-8, 22);
              const fx = px0 + Math.cos(ang) * rad;
              const fy = py0 + Math.sin(ang) * rad;
              if (fx < 10 || fx > CHUNK_SIZE_PX - 10 || fy < 10 || fy > CHUNK_SIZE_PX - 10) continue;
              rt.drawFrame("spr_fence", null, fx - 10, fy - 7, 0.95);
            }
          }
        }

        const decorRng = makeRng(hash32(`${chunk.cx},${chunk.cy}:decor`) ^ 0x2a71);
        const decorCount = 8 + decorRng.nextInt(10);
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
          const isHouse = r < 0.12;
          const isTree = r >= 0.12 && r < 0.62;
          const isPlant = !isHouse && !isTree;
          const tex = isHouse
            ? "spr_house"
            : isTree
              ? (decorRng.next() < 0.5 ? "spr_tree_a" : "spr_tree_b")
              : decorRng.next() < 0.6
                ? "spr_bush"
                : "spr_flower";

          drawCentered(tex, px, py, 1);

          // collider footprint
          if (isHouse) addSolidRect(px, py + 6, 34, 22);
          else if (isTree) addSolidRect(px, py + 4, 22, 18);
          else if (tex === "spr_bush") addSolidRect(px, py + 6, 18, 12);
          // flowers: no collider
        }

        // Road dressing: fences, grass tufts, signposts (baked into RT)
        const roadRng = makeRng(hash32(`${chunk.cx},${chunk.cy}:roadDress`) ^ 0x19a2);
        const roadDressCount = 8 + roadRng.nextInt(8);
        for (let i = 0; i < roadDressCount; i++) {
          const tx = 1 + roadRng.nextInt(CHUNK_SIZE_TILES - 2);
          const ty = 1 + roadRng.nextInt(CHUNK_SIZE_TILES - 2);
          const px = tx * TILE_SIZE + TILE_SIZE / 2;
          const py = ty * TILE_SIZE + TILE_SIZE / 2;
          const wx = cx * CHUNK_SIZE_PX + px;
          const wy = cy * CHUNK_SIZE_PX + py;
          const plaza = isPlaza(wx, wy);
          const road = !plaza && isRoad(wx, wy);
          if (!road) continue;

          const r = roadRng.next();
          if (r < 0.18) {
            rt.drawFrame("spr_signpost", null, px - 11, py - 11, 0.92);
          } else if (r < 0.40) {
            rt.drawFrame("spr_fence", null, px - 10, py - 7, 0.95);
          } else if (r < 0.78) {
            rt.drawFrame("spr_grass_tuft", null, px - 7, py - 7, 0.92);
          } else {
            rt.drawFrame("spr_flower", null, px - 7, py - 7, 0.90);
          }
        }

        // Occasional chest/node placement in the world state is handled elsewhere,
        // but visuals are placed via interactables group.
      }

      if (chunk.stratum === STRATA.FORGE) {
        const drawCentered = (tex, px, py, alpha = 1) => {
          const frame = this.textures.getFrame(tex);
          const w = frame?.width ?? 16;
          const h = frame?.height ?? 16;
          rt.drawFrame(tex, null, px - w / 2, py - h / 2, alpha);
          return { w, h };
        };

        const decorRng = makeRng(hash32(`${chunk.cx},${chunk.cy}:decor`) ^ 0x6c52);
        const decorCount = 6 + decorRng.nextInt(8);
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
          drawCentered(tex, px, py, 1);

          if (tex.startsWith("spr_rock_forge")) addSolidRect(px, py + 6, 22, 14);
          else if (tex === "spr_pipe_forge") addSolidRect(px, py + 6, 28, 10);
          else if (tex === "spr_vent_forge") addSolidRect(px, py + 6, 18, 12);
        }

        // Road dressing: crates + occasional lamp posts
        const roadRng = makeRng(hash32(`${chunk.cx},${chunk.cy}:roadDress`) ^ 0x6f11);
        const roadDressCount = 6 + roadRng.nextInt(6);
        let lampBudget = 2;
        for (let i = 0; i < roadDressCount; i++) {
          const tx = 1 + roadRng.nextInt(CHUNK_SIZE_TILES - 2);
          const ty = 1 + roadRng.nextInt(CHUNK_SIZE_TILES - 2);
          const px = tx * TILE_SIZE + TILE_SIZE / 2;
          const py = ty * TILE_SIZE + TILE_SIZE / 2;

          const wx = cx * CHUNK_SIZE_PX + px;
          const wy = cy * CHUNK_SIZE_PX + py;
          const plaza = isPlaza(wx, wy);
          const road = !plaza && isRoad(wx, wy);
          if (!road) continue;

          const r = roadRng.next();
          if (r < 0.62) {
            drawCentered("spr_crate_forge", px, py, 1);
            addSolidRect(px, py + 6, 16, 12);
          } else if (lampBudget > 0) {
            lampBudget--;
            drawCentered("spr_lamp_post_forge", px, py, 1);
            addSolidRect(px, py + 10, 10, 18);

            const glow = this.add.image(px, py - 8, "spr_light_forge");
            glow.setBlendMode(Phaser.BlendModes.ADD);
            glow.setAlpha(0.45);
            glow.setScale(0.45);
            glow.setDepth(20);
            container.add(glow);
            objectsCreated.push(glow);
            this.tweens.add({ targets: glow, alpha: { from: 0.34, to: 0.55 }, duration: 760 + roadRng.nextInt(540), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          }
        }

        // Outposts: small industrial nodes with stronger lighting accents.
        if (Array.isArray(this._settlements)) {
          for (const s of this._settlements) {
            if (s.stratum !== STRATA.FORGE || s.kind !== "outpost") continue;
            const inChunk = s.x >= cx * CHUNK_SIZE_PX && s.x < (cx + 1) * CHUNK_SIZE_PX && s.y >= cy * CHUNK_SIZE_PX && s.y < (cy + 1) * CHUNK_SIZE_PX;
            if (!inChunk) continue;
            const orng = makeRng(hash32(`o:${s.id}`) ^ 0x12c77);
            const px0 = s.x - cx * CHUNK_SIZE_PX;
            const py0 = s.y - cy * CHUNK_SIZE_PX;

            // Central machine landmark
            drawCentered("spr_machine_forge", px0, py0 + 2, 1);
            addSolidRect(px0, py0 + 10, 30, 22);

            // A few pipes/vents clustered
            for (let k = 0; k < 5; k++) {
              const px = px0 + orng.nextRange(-64, 64);
              const py = py0 + orng.nextRange(-52, 52);
              const tex = k % 2 === 0 ? "spr_pipe_forge" : "spr_vent_forge";
              drawCentered(tex, px, py, 1);
              addSolidRect(px, py + 6, tex === "spr_pipe_forge" ? 28 : 18, 12);
            }

            // A couple of lamp posts near the node (kept tiny count)
            for (let k = 0; k < 2; k++) {
              const lx = px0 + orng.nextRange(-60, 60);
              const ly = py0 + orng.nextRange(-55, 55);
              drawCentered("spr_lamp_post_forge", lx, ly, 1);
              addSolidRect(lx, ly + 10, 10, 18);
            }

            // A strong warm beacon
            const beacon = this.add.image(px0, py0, "spr_light_forge");
            beacon.setBlendMode(Phaser.BlendModes.ADD);
            beacon.setAlpha(0.78);
            beacon.setScale(0.85);
            beacon.setDepth(18);
            container.add(beacon);
            objectsCreated.push(beacon);
            this.tweens.add({ targets: beacon, alpha: { from: 0.55, to: 0.92 }, duration: 680 + orng.nextInt(600), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          }
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

        // Road dressing: rune stones + rubble
        const roadRng = makeRng(hash32(`${chunk.cx},${chunk.cy}:roadDress`) ^ 0x33c3);
        const roadDressCount = 5 + roadRng.nextInt(6);
        for (let i = 0; i < roadDressCount; i++) {
          const tx = 1 + roadRng.nextInt(CHUNK_SIZE_TILES - 2);
          const ty = 1 + roadRng.nextInt(CHUNK_SIZE_TILES - 2);
          const px = tx * TILE_SIZE + TILE_SIZE / 2;
          const py = ty * TILE_SIZE + TILE_SIZE / 2;

          const wx = cx * CHUNK_SIZE_PX + px;
          const wy = cy * CHUNK_SIZE_PX + py;
          const plaza = isPlaza(wx, wy);
          const road = !plaza && isRoad(wx, wy);
          if (!road) continue;

          const r = roadRng.next();
          if (r < 0.55) {
            const img = this.add.image(px, py, "spr_rune_stone");
            img.setDepth(-6);
            container.add(img);
            objectsCreated.push(img);
            addSolidRect(px, py + 7, 12, 14);

            if (roadRng.next() < 0.20) {
              const halo = this.add.image(px, py, "spr_light_abime");
              halo.setBlendMode(Phaser.BlendModes.ADD);
              halo.setAlpha(0.26);
              halo.setScale(0.33);
              halo.setDepth(18);
              container.add(halo);
              objectsCreated.push(halo);
              this.tweens.add({ targets: halo, alpha: { from: 0.18, to: 0.32 }, duration: 980 + roadRng.nextInt(820), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
            }
          } else {
            const img = this.add.image(px, py + 2, "spr_rubble_abime");
            img.setDepth(-7);
            container.add(img);
            objectsCreated.push(img);
            addSolidRect(px, py + 6, 16, 10);
          }
        }

        // Sanctuaries: crystalline focal points with halos.
        if (Array.isArray(this._settlements)) {
          for (const s of this._settlements) {
            if (s.stratum !== STRATA.ABIME || s.kind !== "sanctuary") continue;
            const inChunk = s.x >= cx * CHUNK_SIZE_PX && s.x < (cx + 1) * CHUNK_SIZE_PX && s.y >= cy * CHUNK_SIZE_PX && s.y < (cy + 1) * CHUNK_SIZE_PX;
            if (!inChunk) continue;
            const arng = makeRng(hash32(`a:${s.id}`) ^ 0x77a11);
            const px0 = s.x - cx * CHUNK_SIZE_PX;
            const py0 = s.y - cy * CHUNK_SIZE_PX;

            // Arch landmark (static, single object)
            const arch = this.add.image(px0, py0 - 6, "spr_arch_abime");
            arch.setDepth(-6);
            arch.setBlendMode(Phaser.BlendModes.ADD);
            arch.setAlpha(0.85);
            container.add(arch);
            objectsCreated.push(arch);
            addSolidRect(px0, py0 + 8, 34, 18);

            // Crystal cluster around center
            const count = 5 + arng.nextInt(5);
            for (let i = 0; i < count; i++) {
              const px = px0 + arng.nextRange(-54, 54);
              const py = py0 + arng.nextRange(-44, 44);
              const tex = arng.next() < 0.5 ? "spr_crystal_abime_a" : "spr_crystal_abime_b";
              const img = this.add.image(px, py, tex);
              img.setDepth(-5);
              img.setBlendMode(Phaser.BlendModes.ADD);
              container.add(img);
              objectsCreated.push(img);
              addSolidRect(px, py + 6, 18, 14);
            }

            // Rune ring (few stones)
            for (let k = 0; k < 4; k++) {
              const ang = (k / 4) * Math.PI * 2 + arng.nextRange(-0.18, 0.18);
              const rad = 58 + arng.nextRange(-8, 14);
              const rx = px0 + Math.cos(ang) * rad;
              const ry = py0 + Math.sin(ang) * rad;
              if (rx < 10 || rx > CHUNK_SIZE_PX - 10 || ry < 10 || ry > CHUNK_SIZE_PX - 10) continue;
              const img = this.add.image(rx, ry, "spr_rune_stone");
              img.setDepth(-7);
              container.add(img);
              objectsCreated.push(img);
              addSolidRect(rx, ry + 7, 12, 14);
            }

            const halo = this.add.image(px0, py0, "spr_light_abime");
            halo.setBlendMode(Phaser.BlendModes.ADD);
            halo.setAlpha(0.90);
            halo.setScale(0.95);
            halo.setDepth(18);
            container.add(halo);
            objectsCreated.push(halo);
            this.tweens.add({ targets: halo, alpha: { from: 0.70, to: 1.0 }, duration: 980 + arng.nextInt(820), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          }
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

      // Render base dungeon tiles into a single RenderTexture for performance.
      const rt = this.add.renderTexture(0, 0, CHUNK_SIZE_PX, CHUNK_SIZE_PX);
      rt.setOrigin(0, 0);
      container.add(rt);

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
          rt.drawFrame(baseKey, null, x, y);

          if (!isFloor) {
            addSolidRect(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
          } else {
            // occasional vein glow
            if ((h & 255) < 34) {
              rt.drawFrame("tile_vein_abime", null, x, y, 0.16 + ((h >>> 8) & 7) * 0.02);
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

        // AI archetypes (small variety, still readable/fair)
        const roll = rng.next();
        const aiKind =
          stratum === STRATA.JARDIN
            ? (roll < 0.45 ? "skirmisher" : roll < 0.75 ? "charger" : "spitter")
            : stratum === STRATA.FORGE
              ? (roll < 0.50 ? "charger" : roll < 0.82 ? "gunner" : "skirmisher")
              : (roll < 0.45 ? "lurker" : roll < 0.72 ? "summoner" : "skirmisher");

        const tex = this._pickMonsterTexture(stratum, aiKind, rng);

        const mon = this.physics.add.image(x, y, tex);
        mon.setCircle(7, 1, 1);
        mon.setData("hp", hp);
        mon.setData("threat", localThreat);
        mon.setData("stratum", stratum);
        mon.setData("aiKind", aiKind);
        mon.setData("aiSeed", rng.next());
        mon.setData("lastBurstAt", 0);
        mon.setData("lastShotAt", 0);

        this._applyIdleBreathe(mon, rng.next());
        this._applyMonsterVisualProfile(mon);

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

        const aiKind = String(mon.getData("aiKind") ?? "charger");
        const seed = Number(mon.getData("aiSeed") ?? 0.1) || 0.1;

        if (d < aggroDist) {
          const dx = this.player.x - mon.x;
          const dy = this.player.y - mon.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = dx / len;
          const ny = dy / len;

          const baseSp = 70 + threat * 22;

          if (aiKind === "charger") {
            const sp = baseSp * 1.08;
            mon.setAcceleration(nx * sp * 8, ny * sp * 8);
          } else if (aiKind === "skirmisher") {
            // Maintain a bit of distance + strafe around the player.
            const desired = 120 + threat * 6;
            const away = d < desired ? -1 : 1;
            const px = -ny;
            const py = nx;
            const wobble = Math.sin((nowMs() / 260) + seed * 10) * 0.65;
            const ax = nx * baseSp * 6 * away + px * baseSp * 5 * wobble;
            const ay = ny * baseSp * 6 * away + py * baseSp * 5 * wobble;
            mon.setAcceleration(ax, ay);
          } else if (aiKind === "gunner") {
            // Forge ranged: keep distance and fire bolts.
            const desired = 170 + threat * 8;
            const away = d < desired ? -1 : 1;
            const px = -ny;
            const py = nx;
            const wobble = Math.sin((nowMs() / 220) + seed * 11) * 0.70;
            const ax = nx * baseSp * 5.8 * away + px * baseSp * 6.2 * wobble;
            const ay = ny * baseSp * 5.8 * away + py * baseSp * 6.2 * wobble;
            mon.setAcceleration(ax, ay);

            const t = nowMs();
            const last = Number(mon.getData("lastShotAt") ?? 0) || 0;
            if (d < 280 && t - last > 900) {
              mon.setData("lastShotAt", t);
              const sx = mon.x + nx * 10;
              const sy = mon.y + ny * 10;
              const spd = 215 + threat * 18;

              // Telegraph then fire (fairer, more readable)
              this._spawnShotTelegraph(sx, sy, { x: nx, y: ny }, "amber", 220);
              this.time.delayedCall(170, () => {
                if (!mon?.active) return;
                this._monsterAttackKick(mon, "amber", { x: nx, y: ny });
                this._spawnEnemyProjectile(sx, sy, "spr_enemy_bolt_forge", nx * spd, ny * spd, {
                  damage: 0.55 + threat * 0.08,
                  ttl: 1650,
                  additive: true,
                });
              });
            }
          } else if (aiKind === "spitter") {
            // Jardin ranged: short, slower shots; stays closer than gunner.
            const desired = 140 + threat * 6;
            const away = d < desired ? -1 : 1;
            const px = -ny;
            const py = nx;
            const wobble = Math.sin((nowMs() / 260) + seed * 9) * 0.55;
            const ax = nx * baseSp * 5.2 * away + px * baseSp * 4.8 * wobble;
            const ay = ny * baseSp * 5.2 * away + py * baseSp * 4.8 * wobble;
            mon.setAcceleration(ax, ay);

            const t = nowMs();
            const last = Number(mon.getData("lastShotAt") ?? 0) || 0;
            if (d < 230 && t - last > 1100) {
              mon.setData("lastShotAt", t);
              const sx = mon.x + nx * 8;
              const sy = mon.y + ny * 8;
              const spd = 165 + threat * 14;

              this._spawnShotTelegraph(sx, sy, { x: nx, y: ny }, "cyan", 240);
              this.time.delayedCall(190, () => {
                if (!mon?.active) return;
                this._monsterAttackKick(mon, "cyan", { x: nx, y: ny });
                this._spawnEnemyProjectile(sx, sy, "spr_enemy_spit_jardin", nx * spd, ny * spd, {
                  damage: 0.48 + threat * 0.07,
                  ttl: 1750,
                  additive: true,
                });
              });
            }
          } else if (aiKind === "summoner") {
            // Abîme summoner: maintains distance, releases homing motes.
            const desired = 185 + threat * 10;
            const away = d < desired ? -1 : 1;
            const px = -ny;
            const py = nx;
            const wobble = Math.sin((nowMs() / 240) + seed * 13) * 0.60;
            const ax = nx * baseSp * 5.6 * away + px * baseSp * 5.8 * wobble;
            const ay = ny * baseSp * 5.6 * away + py * baseSp * 5.8 * wobble;
            mon.setAcceleration(ax, ay);

            const t = nowMs();
            const last = Number(mon.getData("lastShotAt") ?? 0) || 0;
            if (d < 320 && t - last > 1400) {
              mon.setData("lastShotAt", t);
              const base = Math.atan2(ny, nx);
              const spd = 135 + threat * 14;
              for (let k = -1; k <= 1; k++) {
                const a = base + k * 0.20;
                const vx = Math.cos(a) * spd;
                const vy = Math.sin(a) * spd;

                const sx = mon.x + Math.cos(a) * 10;
                const sy = mon.y + Math.sin(a) * 10;
                this._spawnShotTelegraph(sx, sy, { x: Math.cos(a), y: Math.sin(a) }, "magenta", 260);
                this.time.delayedCall(210, () => {
                  if (!mon?.active) return;
                  this._monsterAttackKick(mon, "magenta", { x: Math.cos(a), y: Math.sin(a) });
                  this._spawnEnemyProjectile(sx, sy, "spr_enemy_mote_abime", vx, vy, {
                    damage: 0.52 + threat * 0.09,
                    ttl: 2200,
                    homing: true,
                    additive: true,
                  });
                });
              }
            }
          } else {
            // Lurker (Abîme): slow approach + occasional burst.
            const sp = baseSp * 0.78;
            mon.setAcceleration(nx * sp * 6, ny * sp * 6);

            const t = Date.now();
            const last = Number(mon.getData("lastBurstAt") ?? 0) || 0;
            if (d < 240 && t - last > 900) {
              mon.setData("lastBurstAt", t);
              this._monsterAttackKick(mon, "magenta", { x: nx, y: ny });
              mon.setVelocity(nx * (240 + threat * 14), ny * (240 + threat * 14));
            }
          }
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
        // No per-tile borders: they create a visible grid when repeated.
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
        // No border stroke (prevents grid effect).
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

    const makePathVariant = (key, baseColor, midColor, edgeColor, seed, mode) => {
      g.clear();
      g.fillStyle(baseColor, 1);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      // Directional lighting (top-left highlight) to help a neo-pixel feel without smoothing.
      g.fillStyle(0xffffff, mode === "jardin" ? 0.10 : 0.06);
      g.fillRect(0, 0, TILE_SIZE, 2);
      g.fillRect(0, 0, 2, TILE_SIZE);
      g.fillStyle(0x000000, mode === "abime" ? 0.20 : 0.16);
      g.fillRect(0, TILE_SIZE - 2, TILE_SIZE, 2);
      g.fillRect(TILE_SIZE - 2, 0, 2, TILE_SIZE);

      // Pebbles / bolts / grit
      speckle(seed ^ 0x6a11, midColor, mode === "forge" ? 0.22 : 0.18, mode === "jardin" ? 14 : 12);
      speckle(seed ^ 0x8d31, 0x000000, 0.10, 10);

      if (mode === "jardin") {
        // Soft dirt groove
        g.lineStyle(1, edgeColor, 0.18);
        g.beginPath();
        g.moveTo(1, 11);
        g.lineTo(6, 9);
        g.lineTo(12, 11);
        g.lineTo(15, 8);
        g.strokePath();
      }

      if (mode === "forge") {
        // Panel seams + a subtle hazard hint
        g.lineStyle(1, edgeColor, 0.16);
        g.beginPath();
        g.moveTo(0, 5.5);
        g.lineTo(16, 5.5);
        g.strokePath();
        g.beginPath();
        g.moveTo(8.5, 0);
        g.lineTo(8.5, 16);
        g.strokePath();
        g.fillStyle(edgeColor, 0.12);
        g.fillRect(2, 12, 12, 2);
      }

      if (mode === "abime") {
        // Slab + rune
        g.lineStyle(1, edgeColor, 0.14);
        g.strokeRect(2, 2, 12, 12);
        g.lineStyle(1, 0xffffff, 0.06);
        g.beginPath();
        g.moveTo(8.5, 4);
        g.lineTo(8.5, 12);
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

    // Jardin palette (bright daytime grassland)
    // Brighter base to match "plein jour".
    makeTile("tile_floor_jardin", 0x4ad96e, 0x2c7a40, false);
    makeWall("tile_wall_jardin", 0x1a6b38, 0x62ffd1);
    makeTile("tile_vein_jardin", 0x000000, 0x62ffd1, true);

    // Regenerate base grass with directional highlight + richer blades to reduce the tiled look.
    g.clear();
    g.fillStyle(0x4ad96e, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0xffffff, 0.10);
    g.fillRect(0, 0, TILE_SIZE, 2);
    g.fillRect(0, 0, 2, TILE_SIZE);
    g.fillStyle(0x000000, 0.14);
    g.fillRect(0, TILE_SIZE - 2, TILE_SIZE, 2);
    g.fillRect(TILE_SIZE - 2, 0, 2, TILE_SIZE);
    // grass noise + blades
    for (let i = 0; i < 26; i++) {
      const x = (i * 5 + 3) % TILE_SIZE;
      const y = (i * 9 + 5) % TILE_SIZE;
      g.fillStyle(0x35b85a, 0.22);
      g.fillRect(x, y, 1, 1);
    }
    for (let i = 0; i < 10; i++) {
      const x = (i * 3 + 2) % TILE_SIZE;
      const y = (i * 7 + 4) % TILE_SIZE;
      g.fillStyle(0x1f7a3d, 0.18);
      g.fillRect(x, y, 1, 2);
    }
    // tiny flowers (rare, subtle)
    g.fillStyle(0xffffff, 0.18);
    g.fillRect(3, 6, 1, 1);
    g.fillRect(12, 10, 1, 1);
    g.fillStyle(0xff7fe8, 0.14);
    g.fillRect(7, 12, 1, 1);
    g.generateTexture("tile_floor_jardin", TILE_SIZE, TILE_SIZE);

    // Jardin variants
    for (let i = 0; i < 4; i++) {
      makeTileVariant(`tile_floor_jardin_${i}`, 0x4ad96e, 0x35b85a, 0x1f7a3d, 0x10a1 ^ (i * 0x9e37), "jardin");
    }
    for (let i = 0; i < 3; i++) {
      makeWallVariant(`tile_wall_jardin_${i}`, 0x1a6b38, 0x62ffd1, 0x11b2 ^ (i * 0x7f4a), "jardin");
    }
    for (let i = 0; i < 3; i++) {
      makePathVariant(`tile_path_jardin_${i}`, 0x9a7b4b, 0xb99763, 0x6d5332, 0x13d1 ^ (i * 0x531), "jardin");
    }
    for (let i = 0; i < 3; i++) {
      makeDetailOverlay(`tile_detail_jardin_${i}`, 0x1f7a3d, 0x12c3 ^ (i * 0x531), "jardin");
    }

    // Forge palette (industrial)
    makeTile("tile_floor_forge", 0x1a0f1f, 0xffb000, false);
    makeWall("tile_wall_forge", 0x0c0812, 0xffb000);
    makeTile("tile_vein_forge", 0x000000, 0xffb000, true);

    // Forge variants
    for (let i = 0; i < 4; i++) {
      makeTileVariant(`tile_floor_forge_${i}`, 0x1a0f1f, 0x2a1834, 0xffb000, 0x21a1 ^ (i * 0x9e37), "forge");
    }
    for (let i = 0; i < 3; i++) {
      makeWallVariant(`tile_wall_forge_${i}`, 0x0c0812, 0xffb000, 0x22b2 ^ (i * 0x7f4a), "forge");
    }
    for (let i = 0; i < 3; i++) {
      makePathVariant(`tile_path_forge_${i}`, 0x34303f, 0x4a4458, 0xffb000, 0x24d1 ^ (i * 0x531), "forge");
    }
    for (let i = 0; i < 3; i++) {
      makeDetailOverlay(`tile_detail_forge_${i}`, 0xffb000, 0x23c3 ^ (i * 0x531), "forge");
    }

    // Abime palette (ruins + crystals)
    makeTile("tile_floor_abime", 0x080616, 0xff4df2, false);
    makeWall("tile_wall_abime", 0x03020a, 0xff4df2);
    makeTile("tile_vein_abime", 0x000000, 0xff4df2, true);

    // Abime variants
    for (let i = 0; i < 4; i++) {
      makeTileVariant(`tile_floor_abime_${i}`, 0x080616, 0x120b25, 0xff4df2, 0x31a1 ^ (i * 0x9e37), "abime");
    }
    for (let i = 0; i < 3; i++) {
      makeWallVariant(`tile_wall_abime_${i}`, 0x03020a, 0xff4df2, 0x32b2 ^ (i * 0x7f4a), "abime");
    }
    for (let i = 0; i < 3; i++) {
      makePathVariant(`tile_path_abime_${i}`, 0x2d1f3a, 0x3c2a4e, 0xff4df2, 0x34d1 ^ (i * 0x531), "abime");
    }
    for (let i = 0; i < 3; i++) {
      makeDetailOverlay(`tile_detail_abime_${i}`, 0xff4df2, 0x33c3 ^ (i * 0x531), "abime");
    }

    const makeSprite = (key, bodyColor, glowColor, kind) => {
      const size = 20;
      g.clear();
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, size, size);

      const outline = 0x0b0710;
      const shadow = 0x000000;

      // Ground shadow
      g.fillStyle(shadow, 0.18);
      g.fillRect(6, 16, 8, 2);

      // Silhouette (chunky, readable)
      g.fillStyle(outline, 1);
      g.fillRect(6, 6, 8, 10);
      g.fillRect(7, 4, 6, 3);
      g.fillRect(5, 9, 1, 4);
      g.fillRect(14, 9, 1, 4);

      // Fill
      g.fillStyle(bodyColor, 1);
      g.fillRect(7, 7, 6, 8);
      g.fillRect(8, 5, 4, 2);

      // Directional highlight (top-left)
      g.fillStyle(0xffffff, 0.10);
      g.fillRect(7, 7, 2, 6);
      g.fillRect(8, 5, 2, 1);

      // Core glow stripe
      g.fillStyle(glowColor, kind === "monster" ? 0.50 : 0.38);
      g.fillRect(8, 10, 4, 2);

      if (kind === "monster") {
        // Eyes + maw (strong readability)
        g.fillStyle(glowColor, 0.95);
        g.fillRect(8, 8, 1, 1);
        g.fillRect(11, 8, 1, 1);
        g.fillStyle(glowColor, 0.55);
        g.fillRect(8, 13, 4, 1);
        // Small horns
        g.fillStyle(outline, 1);
        g.fillRect(7, 3, 1, 2);
        g.fillRect(12, 3, 1, 2);
      }

      g.generateTexture(key, size, size);
    };

    const makeHumanoid = (key, skin, cloth, accent, role) => {
      const W = 24;
      const H = 24;
      g.clear();
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, W, H);

      const outline = 0x0b0710;
      const darkCloth = 0x000000;

      // Ground shadow
      g.fillStyle(0x000000, 0.16);
      g.fillRect(7, 20, 10, 2);

      // Body silhouette (outline)
      g.fillStyle(outline, 1);
      g.fillRect(8, 10, 8, 10);
      g.fillRect(9, 6, 6, 4);
      // Arms
      g.fillRect(7, 12, 1, 5);
      g.fillRect(16, 12, 1, 5);

      // Clothes fill
      g.fillStyle(cloth, 1);
      g.fillRect(9, 11, 6, 8);

      // Cloth shade
      g.fillStyle(darkCloth, 0.12);
      g.fillRect(13, 11, 2, 8);

      // Head fill
      g.fillStyle(skin, 1);
      g.fillRect(10, 7, 4, 3);
      g.fillRect(9, 8, 6, 3);

      // Hair/cap accent
      g.fillStyle(accent, 0.55);
      g.fillRect(9, 5, 6, 2);

      // Eyes
      g.fillStyle(0x000000, 0.40);
      g.fillRect(11, 9, 1, 1);
      g.fillRect(13, 9, 1, 1);
      g.fillStyle(0xffffff, 0.18);
      g.fillRect(10, 7, 1, 1);

      // Scarf / badge
      g.fillStyle(accent, 0.22);
      g.fillRect(9, 11, 6, 2);

      // Role markers (tiny, consistent)
      if (role === "quest") {
        g.fillStyle(accent, 0.45);
        g.fillRect(12, 15, 1, 1);
      } else if (role === "merchant") {
        g.fillStyle(0xffc062, 0.22);
        g.fillRect(10, 16, 4, 2);
      } else if (role === "guard") {
        g.fillStyle(0xffffff, 0.12);
        g.fillRect(10, 14, 1, 6);
      } else if (role === "worker") {
        g.fillStyle(0xffffff, 0.12);
        g.fillRect(13, 14, 1, 6);
      }

      // Directional highlight
      g.fillStyle(0xffffff, 0.08);
      g.fillRect(9, 11, 1, 6);
      g.fillRect(10, 8, 1, 2);

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

    // Grass tuft
    g.clear();
    g.fillStyle(0x061313, 0);
    g.fillRect(0, 0, 14, 14);
    g.fillStyle(0x0b0710, 0.28);
    g.fillRect(3, 12, 8, 1);
    g.fillStyle(0x1f7a3d, 0.35);
    g.fillRect(6, 6, 1, 7);
    g.fillRect(4, 7, 1, 6);
    g.fillRect(8, 7, 1, 6);
    g.fillStyle(0x4ad96e, 0.22);
    g.fillRect(5, 7, 1, 4);
    g.fillRect(7, 7, 1, 4);
    g.generateTexture("spr_grass_tuft", 14, 14);

    // Fence segment
    g.clear();
    g.fillStyle(0x061313, 0);
    g.fillRect(0, 0, 20, 14);
    g.fillStyle(0x0b0710, 0.65);
    g.fillRect(3, 3, 2, 9);
    g.fillRect(15, 3, 2, 9);
    g.fillStyle(0x6d5332, 0.85);
    g.fillRect(5, 5, 10, 2);
    g.fillRect(5, 9, 10, 2);
    g.fillStyle(0xffffff, 0.08);
    g.fillRect(5, 5, 4, 1);
    g.generateTexture("spr_fence", 20, 14);

    // Signpost (village marker)
    g.clear();
    g.fillStyle(0x061313, 0);
    g.fillRect(0, 0, 22, 22);
    g.fillStyle(0x0b0710, 0.65);
    g.fillRect(10, 6, 2, 14);
    g.fillStyle(0xb99763, 0.9);
    g.fillRoundedRect(4, 5, 14, 6, 2);
    g.fillStyle(0x000000, 0.18);
    g.fillRect(5, 8, 12, 1);
    g.fillStyle(0xffffff, 0.10);
    g.fillRect(5, 6, 4, 1);
    g.generateTexture("spr_signpost", 22, 22);

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

    // Forge crate
    g.clear();
    g.fillStyle(0x120a16, 0);
    g.fillRect(0, 0, 18, 18);
    g.fillStyle(0x0b0710, 0.80);
    g.fillRoundedRect(2, 3, 14, 13, 2);
    g.fillStyle(0xffb000, 0.16);
    g.fillRect(4, 6, 10, 1);
    g.fillRect(4, 10, 10, 1);
    g.fillStyle(0xffffff, 0.08);
    g.fillRect(3, 4, 4, 2);
    g.generateTexture("spr_crate_forge", 18, 18);

    // Forge lamp post
    g.clear();
    g.fillStyle(0x120a16, 0);
    g.fillRect(0, 0, 14, 30);
    g.fillStyle(0x0b0710, 0.75);
    g.fillRect(6, 6, 2, 22);
    g.fillStyle(0x34303f, 0.85);
    g.fillRoundedRect(3, 3, 8, 6, 2);
    g.fillStyle(0xffb000, 0.28);
    g.fillRect(5, 5, 4, 2);
    g.generateTexture("spr_lamp_post_forge", 14, 30);

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

    // Abime rubble
    g.clear();
    g.fillStyle(0x05040a, 0);
    g.fillRect(0, 0, 22, 14);
    g.fillStyle(0x0b0a12, 0.90);
    g.fillRoundedRect(2, 6, 18, 6, 3);
    g.fillStyle(0x000000, 0.18);
    g.fillRect(3, 10, 16, 2);
    g.fillStyle(0xff4df2, 0.10);
    g.fillRect(6, 7, 2, 4);
    g.fillRect(14, 8, 2, 3);
    g.generateTexture("spr_rubble_abime", 22, 14);

    // Abime rune stone
    g.clear();
    g.fillStyle(0x05040a, 0);
    g.fillRect(0, 0, 16, 22);
    g.fillStyle(0x0b0a12, 0.92);
    g.fillRoundedRect(3, 5, 10, 14, 3);
    g.lineStyle(2, 0xff4df2, 0.14);
    g.strokeCircle(8, 12, 4);
    g.lineStyle(1, 0xffffff, 0.06);
    g.beginPath();
    g.moveTo(8, 8);
    g.lineTo(8, 16);
    g.strokePath();
    g.generateTexture("spr_rune_stone", 16, 22);

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

    // Jardin fountain (village landmark)
    g.clear();
    g.fillStyle(0x061313, 0);
    g.fillRect(0, 0, 28, 26);
    g.fillStyle(0x0b0a12, 0.82);
    g.fillRoundedRect(3, 9, 22, 14, 5);
    g.fillStyle(0x00ffc8, 0.28);
    g.fillCircle(14, 16, 7);
    g.fillStyle(0xffffff, 0.10);
    g.fillCircle(12, 14, 2);
    g.fillStyle(0x00ffc8, 0.18);
    g.fillRect(13, 6, 2, 10);
    g.generateTexture("spr_fountain_jardin", 28, 26);

    // Forge machine (outpost landmark)
    g.clear();
    g.fillStyle(0x120a16, 0);
    g.fillRect(0, 0, 32, 30);
    g.fillStyle(0x0b0a12, 0.92);
    g.fillRoundedRect(5, 9, 22, 18, 4);
    g.fillStyle(0xffb000, 0.18);
    g.fillRect(8, 12, 16, 2);
    g.fillRect(8, 18, 16, 2);
    g.fillStyle(0xffb000, 0.26);
    g.fillCircle(16, 21, 4);
    g.fillStyle(0xffffff, 0.06);
    g.fillRect(7, 10, 6, 2);
    g.generateTexture("spr_machine_forge", 32, 30);

    // Abime arch (sanctuary landmark)
    g.clear();
    g.fillStyle(0x05040a, 0);
    g.fillRect(0, 0, 40, 34);
    g.fillStyle(0x0b0a12, 0.78);
    g.fillRoundedRect(7, 10, 26, 20, 10);
    g.fillStyle(0x05040a, 1);
    g.fillRoundedRect(12, 14, 16, 16, 8);
    g.lineStyle(2, 0xff4df2, 0.16);
    g.strokeRoundedRect(7.5, 10.5, 25, 19, 10);
    g.fillStyle(0xff4df2, 0.12);
    g.fillRect(18, 12, 4, 16);
    g.generateTexture("spr_arch_abime", 40, 34);

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

    // Enemy projectiles (offline/procedural)
    g.clear();
    g.fillStyle(0x120a16, 0);
    g.fillRect(0, 0, 10, 10);
    g.fillStyle(0xffb000, 0.42);
    g.fillCircle(5, 5, 4);
    g.fillStyle(0xffffff, 0.10);
    g.fillCircle(4, 4, 2);
    g.generateTexture("spr_enemy_bolt_forge", 10, 10);

    g.clear();
    g.fillStyle(0x061313, 0);
    g.fillRect(0, 0, 10, 10);
    g.fillStyle(0x00ffc8, 0.30);
    g.fillCircle(5, 5, 4);
    g.fillStyle(0xff7fe8, 0.18);
    g.fillCircle(6, 4, 2);
    g.generateTexture("spr_enemy_spit_jardin", 10, 10);

    g.clear();
    g.fillStyle(0x05040a, 0);
    g.fillRect(0, 0, 12, 12);
    g.fillStyle(0xff4df2, 0.30);
    g.fillCircle(6, 6, 5);
    g.fillStyle(0xffffff, 0.06);
    g.fillCircle(5, 5, 2);
    g.generateTexture("spr_enemy_mote_abime", 12, 12);

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

    // Brighter sky-tint for a clear daytime Jardin.
    makeBg("bg_jardin", 0xd7f3ff, 0x77e2a2, "jardin");
    makeBg("bg_forge", 0x140b10, 0xffb000, "forge");
    makeBg("bg_abime", 0x06040b, 0xff4df2, "abime");

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

    // Fog particle (soft smudge)
    g.clear();
    g.fillStyle(0x000000, 0);
    g.fillRect(0, 0, 14, 14);
    for (let r = 6; r >= 2; r -= 2) {
      g.fillStyle(0xffffff, (r / 6) * 0.10);
      g.fillCircle(7, 7, r);
    }
    g.generateTexture("fx_fog", 14, 14);

    // Rain particle (tiny streak)
    g.clear();
    g.fillStyle(0x000000, 0);
    g.fillRect(0, 0, 6, 12);
    g.fillStyle(0xffffff, 0.22);
    g.fillRect(3, 1, 1, 10);
    g.fillStyle(0x00ffc8, 0.08);
    g.fillRect(2, 2, 1, 8);
    g.generateTexture("fx_rain", 6, 12);

    // Combat VFX: trails (tiny dots)
    const makeTrail = (key, color) => {
      g.clear();
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, 10, 10);
      g.fillStyle(color, 0.55);
      g.fillCircle(5, 5, 3);
      g.fillStyle(0xffffff, 0.10);
      g.fillCircle(4, 4, 2);
      g.generateTexture(key, 10, 10);
    };
    makeTrail("fx_trail_cyan", 0x00ffc8);
    makeTrail("fx_trail_amber", 0xffb000);
    makeTrail("fx_trail_magenta", 0xff4df2);
    makeTrail("fx_trail_white", 0xffffff);

    // Combat VFX: sparks (small starburst)
    const makeSpark = (key, color) => {
      const S = 18;
      const cx = S / 2;
      const cy = S / 2;
      g.clear();
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, S, S);
      g.lineStyle(2, color, 0.34);
      g.beginPath();
      g.moveTo(cx - 6, cy);
      g.lineTo(cx + 6, cy);
      g.moveTo(cx, cy - 6);
      g.lineTo(cx, cy + 6);
      g.strokePath();
      g.lineStyle(1, 0xffffff, 0.10);
      g.strokeCircle(cx, cy, 6);
      g.fillStyle(color, 0.20);
      g.fillCircle(cx, cy, 5);
      g.generateTexture(key, S, S);
    };
    makeSpark("fx_spark_cyan", 0x00ffc8);
    makeSpark("fx_spark_amber", 0xffb000);
    makeSpark("fx_spark_magenta", 0xff4df2);

    // Combat VFX: slash (thin arc)
    const makeSlash = (key, color) => {
      const W = 34;
      const H = 18;
      g.clear();
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, W, H);
      g.lineStyle(4, color, 0.18);
      g.beginPath();
      g.arc(W * 0.55, H * 0.70, 12, Math.PI * 1.10, Math.PI * 1.85);
      g.strokePath();
      g.lineStyle(2, color, 0.34);
      g.beginPath();
      g.arc(W * 0.55, H * 0.70, 12, Math.PI * 1.12, Math.PI * 1.83);
      g.strokePath();
      g.lineStyle(1, 0xffffff, 0.10);
      g.beginPath();
      g.arc(W * 0.55, H * 0.70, 10, Math.PI * 1.18, Math.PI * 1.78);
      g.strokePath();
      g.generateTexture(key, W, H);
    };
    makeSlash("fx_slash_cyan", 0x00ffc8);
    makeSlash("fx_slash_amber", 0xffb000);
    makeSlash("fx_slash_magenta", 0xff4df2);

    // Combat VFX: dash streak (elongated glow)
    g.clear();
    g.fillStyle(0x000000, 0);
    g.fillRect(0, 0, 26, 10);
    g.fillStyle(0xffffff, 0.10);
    g.fillEllipse(13, 5, 22, 6);
    g.fillStyle(0xffb000, 0.18);
    g.fillEllipse(13, 5, 18, 5);
    g.fillStyle(0x00ffc8, 0.10);
    g.fillEllipse(12, 5, 14, 4);
    g.generateTexture("fx_dash_streak", 26, 10);

    // Soft ground shadow (ellipse)
    g.clear();
    g.fillStyle(0x000000, 0);
    g.fillRect(0, 0, 26, 14);
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(13, 8, 20, 8);
    g.fillStyle(0x000000, 0.12);
    g.fillEllipse(13, 8, 16, 6);
    g.fillStyle(0x000000, 0.08);
    g.fillEllipse(13, 8, 12, 4);
    g.generateTexture("spr_shadow", 26, 14);

    // --- Light halos (neo pixel lighting) ---
    const makeLight = (key, color) => {
      const S = 96;
      const cx = S / 2;
      const cy = S / 2;
      g.clear();
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, S, S);

      // layered circles = cheap radial gradient
      for (let r = 42; r >= 4; r -= 4) {
        const a = (r / 42) * 0.10;
        g.fillStyle(color, a);
        g.fillCircle(cx, cy, r);
      }
      // bright core
      g.fillStyle(color, 0.18);
      g.fillCircle(cx, cy, 10);

      g.generateTexture(key, S, S);
    };

    makeLight("spr_light_soft", 0xffffff);
    makeLight("spr_light_jardin", 0x9dffcf);
    makeLight("spr_light_forge", 0xffb35c);
    makeLight("spr_light_abime", 0xff7fe8);

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

      // Tag projectile for trail tint + add muzzle flash.
      const accent = typeof scene._fxAccentKey === "function" ? scene._fxAccentKey() : "cyan";
      p.setData("trail", accent);
      if (typeof scene._spawnImpactFx === "function") {
        scene._spawnImpactFx(origin.x, origin.y, accent, 0.9);
      }

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

    function accentKeyForScene(scene) {
      return typeof scene._fxAccentKey === "function" ? scene._fxAccentKey() : "cyan";
    }

    function slashKey(accent) {
      return accent === "amber" ? "fx_slash_amber" : accent === "magenta" ? "fx_slash_magenta" : "fx_slash_cyan";
    }

    function meleeArc(scene, weapon, playerSprite, aim) {
      const reach = weapon.reach ?? 34;
      const arcDeg = weapon.arcDeg ?? 90;

      const hitPos = { x: playerSprite.x + aim.x * reach, y: playerSprite.y + aim.y * reach };

      // Visual swipe
      const accent = accentKeyForScene(scene);
      const fx = scene.add.image(hitPos.x, hitPos.y, slashKey(accent));
      fx.setScale(1.0 + (weapon.reach ?? 34) / 120);
      fx.setRotation(Math.atan2(aim.y, aim.x));
      fx.setBlendMode(Phaser.BlendModes.ADD);
      fx.setAlpha(0.75);
      scene.tweens.add({ targets: fx, alpha: 0, duration: 170, onComplete: () => fx.destroy() });

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
        const hp = (mon.getData("hp") ?? 6) - dmg;
        mon.setData("hp", hp);
        if (typeof scene._spawnDamageNumber === "function") {
          scene._spawnDamageNumber(mon.x, mon.y - 10, `-${dmg.toFixed(0)}`, "rgba(255,77,242,0.95)");
        }
        if (typeof scene._spawnImpactFx === "function") {
          scene._spawnImpactFx(mon.x, mon.y, accent, 1.05);
        }
        if (hp <= 0) scene._killMonster(mon);

        const kb = weapon.knockback ?? 120;
        const len = dist || 1;
        mon.setVelocity((dx / len) * kb, (dy / len) * kb);
      });
    }

    function meleeThrust(scene, weapon, playerSprite, aim) {
      const reach = weapon.reach ?? 54;
      const hitPos = { x: playerSprite.x + aim.x * reach, y: playerSprite.y + aim.y * reach };

      const accent = accentKeyForScene(scene);
      const fx = scene.add.image(hitPos.x, hitPos.y, slashKey(accent));
      fx.setScale(0.85 + (weapon.reach ?? 54) / 160);
      fx.setRotation(Math.atan2(aim.y, aim.x));
      fx.setBlendMode(Phaser.BlendModes.ADD);
      fx.setAlpha(0.75);
      scene.tweens.add({ targets: fx, alpha: 0, duration: 150, onComplete: () => fx.destroy() });

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
        const hp = (mon.getData("hp") ?? 6) - dmg;
        mon.setData("hp", hp);
        if (typeof scene._spawnDamageNumber === "function") {
          scene._spawnDamageNumber(mon.x, mon.y - 10, `-${dmg.toFixed(0)}`, "rgba(255,77,242,0.95)");
        }
        if (typeof scene._spawnImpactFx === "function") {
          scene._spawnImpactFx(mon.x, mon.y, accent, 1.0);
        }
        if (hp <= 0) scene._killMonster(mon);
      });
    }

    function meleeSlam(scene, weapon, playerSprite) {
      const radius = weapon.radius ?? 44;
      const accent = accentKeyForScene(scene);
      const fx = scene.add.image(playerSprite.x, playerSprite.y, "spr_light_soft");
      fx.setScale(0.85 + radius / 60);
      fx.setBlendMode(Phaser.BlendModes.ADD);
      fx.setAlpha(0.5);
      scene.tweens.add({ targets: fx, alpha: 0, duration: 220, onComplete: () => fx.destroy() });

      scene.monsters.children.iterate((child) => {
        if (!child) return;
        const mon = /** @type {Phaser.Physics.Arcade.Image} */ (child);
        const d = Math.hypot(mon.x - playerSprite.x, mon.y - playerSprite.y);
        if (d > radius) return;

        const dmg = weapon.damage ?? 12;
        const hp = (mon.getData("hp") ?? 8) - dmg;
        mon.setData("hp", hp);
        if (typeof scene._spawnDamageNumber === "function") {
          scene._spawnDamageNumber(mon.x, mon.y - 10, `-${dmg.toFixed(0)}`, "rgba(255,77,242,0.95)");
        }
        if (typeof scene._spawnImpactFx === "function") {
          scene._spawnImpactFx(mon.x, mon.y, accent, 1.15);
        }
        if (hp <= 0) scene._killMonster(mon);

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

      const accent = accentKeyForScene(scene);
      const fx = scene.add.image(hitPos.x, hitPos.y, slashKey(accent));
      fx.setScale(0.75 + (weapon.reach ?? 70) / 200);
      fx.setRotation(Math.atan2(aim.y, aim.x));
      fx.setBlendMode(Phaser.BlendModes.ADD);
      fx.setAlpha(0.65);
      scene.tweens.add({ targets: fx, alpha: 0, duration: 170, onComplete: () => fx.destroy() });

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
        const hp = (mon.getData("hp") ?? 6) - dmg;
        mon.setData("hp", hp);
        if (typeof scene._spawnDamageNumber === "function") {
          scene._spawnDamageNumber(mon.x, mon.y - 10, `-${dmg.toFixed(0)}`, "rgba(255,77,242,0.95)");
        }
        if (typeof scene._spawnImpactFx === "function") {
          scene._spawnImpactFx(mon.x, mon.y, accent, 1.0);
        }
        if (hp <= 0) scene._killMonster(mon);

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
        _panelCollapsed: false,
        setPanelCollapsed(v) {
          gs.ui._panelCollapsed = !!v;
          if (ui.app) ui.app.dataset.panel = gs.ui._panelCollapsed ? "collapsed" : "open";
          if (ui.btnPanel) ui.btnPanel.textContent = gs.ui._panelCollapsed ? "Panneau: OFF" : "Panneau: ON";
        },
        togglePanel() {
          gs.ui.setPanelCollapsed(!gs.ui._panelCollapsed);
        },
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

          const ab = h.abilities ?? {};
          const skill = (k, label, cls) => {
            const s = ab[k] ?? { key: "—", cd: 0, cdMax: 1 };
            const cd = Math.max(0, Number(s.cd ?? 0));
            const cdMax = Math.max(0.001, Number(s.cdMax ?? 1));
            const pct = clamp((cd / cdMax) * 100, 0, 100);
            const ready = cd <= 0.001;
            return `
              <div class="sopor-skill ${ready ? "is-ready" : "is-cd"} ${cls}">
                <div class="sopor-skillKey">${escapeHtml(String(s.key ?? ""))}</div>
                <div class="sopor-skillLabel">${escapeHtml(label)}</div>
                <div class="sopor-skillCd" style="--cd:${pct.toFixed(1)}%"></div>
                <div class="sopor-skillTime">${ready ? "PRÊT" : `${cd.toFixed(1)}s`}</div>
              </div>
            `;
          };

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
                  <div class="sopor-chip"><span class="k">Combo</span><span class="v">${Number(h.comboStage ?? 0) + 1}/3</span></div>
                </div>

                <div class="sopor-skillbar">
                  ${skill("dodge", "Esquive", "is-cyan")}
                  ${skill("dash", "Dash", "is-amber")}
                  ${skill("shock", "Onde", "is-magenta")}
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

          // Subtle rings / grid (readability)
          ctx.save();
          ctx.globalAlpha = 0.14;
          ctx.strokeStyle = "rgba(255,255,255,0.18)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.min(cx, cy) * 0.33, 0, Math.PI * 2);
          ctx.arc(cx, cy, Math.min(cx, cy) * 0.66, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

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

          // POIs (pillar, etc.)
          for (const poi of m.pois ?? []) {
            const p = toMini(poi.x, poi.y);
            const x = Math.round(p.x);
            const y = Math.round(p.y);
            if (x < -8 || y < -8 || x > w + 8 || y > h + 8) continue;
            if (poi.kind === "pillar") {
              ctx.save();
              ctx.lineWidth = 2;
              ctx.strokeStyle = poi.active ? "rgba(0,255,200,0.85)" : "rgba(0,255,200,0.35)";
              ctx.beginPath();
              ctx.arc(x, y, 6, 0, Math.PI * 2);
              ctx.stroke();
              ctx.fillStyle = "rgba(255,255,255,0.18)";
              ctx.fillRect(x - 1, y - 1, 2, 2);
              ctx.restore();
            }
          }

          // Site (quest) as diamond
          if (m.site) {
            const p = toMini(m.site.x, m.site.y);
            const x = Math.round(p.x);
            const y = Math.round(p.y);
            ctx.save();
            ctx.fillStyle = "rgba(0,255,200,0.35)";
            ctx.strokeStyle = "rgba(0,255,200,0.85)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y - 6);
            ctx.lineTo(x + 6, y);
            ctx.lineTo(x, y + 6);
            ctx.lineTo(x - 6, y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
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

          // Player always centered (arrow indicates facing)
          const fx = Number(m.facing?.x ?? 1);
          const fy = Number(m.facing?.y ?? 0);
          const ang = Math.atan2(fy, fx);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(ang);
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.beginPath();
          ctx.moveTo(7, 0);
          ctx.lineTo(-4, -4);
          ctx.lineTo(-2, 0);
          ctx.lineTo(-4, 4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

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

    // Panel toggle
    gs.ui.setPanelCollapsed(false);
    if (ui.btnPanel) {
      ui.btnPanel.addEventListener("click", () => gs.ui.togglePanel());
    }
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
        // NOTE: EZGalaxy runs Phaser in a custom environment and provides an explicit canvas.
        // Phaser requires an explicit renderer type in this case (AUTO throws).
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
        if (err?.stack) logger.info(String(err.stack));
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

      const hasCoreTextures = () => {
        try {
          return (
            !!game?.registry?.get("assetsReady") ||
            (!!game?.textures && (game.textures.exists("spr_player") || game.textures.exists("tile_floor_jardin")))
          );
        } catch {
          return false;
        }
      };

      const tryStart = () => {
        if (hasCoreTextures()) {
          doStart();
          return;
        }

        const t0 = nowMs();
        const maxWaitMs = 2500;
        const tick = () => {
          if (hasCoreTextures()) {
            doStart();
            return;
          }
          if (nowMs() - t0 > maxWaitMs) {
            logger.info("Erreur: textures non prêtes (affichage 'grille verte'). Recharge la page.");
            return;
          }
          window.setTimeout(tick, 30);
        };

        tick();
      };

      // If boot hasn't completed yet, wait for READY.
      if (game.isBooted) {
        tryStart();
        return;
      }

      try {
        game.events.once(Phaser.Core.Events.READY, tryStart);
      } catch {
        // Fallback
        window.setTimeout(tryStart, 0);
      }

      // Extra fallback in case READY was missed
      window.setTimeout(() => {
        if (game && game.isBooted) tryStart();
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
