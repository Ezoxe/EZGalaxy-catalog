import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { PixelShader } from "three/addons/shaders/PixelShader.js";

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
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

function makeRng(seed) {
  let s = seed >>> 0;
  return {
    next() {
      // xorshift32
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return ((s >>> 0) / 0xffffffff);
    },
    nextRange(a, b) {
      return a + (b - a) * this.next();
    },
    nextInt(n) {
      return Math.floor(this.next() * n);
    },
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function makePixelTexture(key, size, painter) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  painter(g, size);
  const tex = new THREE.CanvasTexture(c);
  tex.name = key;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 1;
  tex.needsUpdate = true;
  return tex;
}

function buildTextures(seed) {
  const rng = makeRng(seed ^ 0x9e3779b9);

  const grass = makePixelTexture("tex_grass", 64, (g, S) => {
    g.fillStyle = "#0a1413";
    g.fillRect(0, 0, S, S);

    // dense blades
    for (let i = 0; i < 1400; i++) {
      const x = (rng.next() * S) | 0;
      const y = (rng.next() * S) | 0;
      const v = rng.next();
      const c = v < 0.6 ? "#0f2a22" : v < 0.9 ? "#145a41" : "#00ffc8";
      g.fillStyle = c;
      g.fillRect(x, y, 1, 1);
    }

    // neon veins
    g.globalAlpha = 0.9;
    g.strokeStyle = "#00ffc8";
    g.lineWidth = 1;
    for (let k = 0; k < 7; k++) {
      g.beginPath();
      g.moveTo(rng.next() * S, rng.next() * S);
      for (let t = 0; t < 5; t++) {
        g.lineTo(rng.next() * S, rng.next() * S);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
  });

  const stone = makePixelTexture("tex_stone", 64, (g, S) => {
    g.fillStyle = "#0d0c12";
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 1000; i++) {
      const x = (rng.next() * S) | 0;
      const y = (rng.next() * S) | 0;
      const v = rng.next();
      g.fillStyle = v < 0.5 ? "#181526" : v < 0.85 ? "#231c35" : "#2f234a";
      g.fillRect(x, y, 1, 1);
    }
    // rune-ish highlights
    g.globalAlpha = 0.55;
    g.fillStyle = "#ff4df2";
    for (let k = 0; k < 18; k++) {
      const x0 = rng.nextInt(S - 10);
      const y0 = rng.nextInt(S - 10);
      g.fillRect(x0, y0, 1 + rng.nextInt(2), 6 + rng.nextInt(8));
    }
    g.globalAlpha = 1;
  });

  const water = makePixelTexture("tex_water", 64, (g, S) => {
    g.fillStyle = "#020612";
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 1200; i++) {
      const x = (rng.next() * S) | 0;
      const y = (rng.next() * S) | 0;
      const v = rng.next();
      g.fillStyle = v < 0.75 ? "#061433" : v < 0.95 ? "#0b2a5d" : "#00ffc8";
      g.fillRect(x, y, 1, 1);
    }
  });

  return { grass, stone, water };
}

function main() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  // Persistence (offline): pillar + essence + UI prefs
  const SAVE_KEY = "sopor3d_save_v1";
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    } catch {
      return null;
    }
  })();

  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.inset = "0";
  root.style.overflow = "hidden";
  app.appendChild(root);

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.left = "12px";
  overlay.style.top = "12px";
  overlay.style.padding = "10px 12px";
  overlay.style.background = "rgba(0,0,0,0.35)";
  overlay.style.border = "1px solid rgba(0,255,200,0.18)";
  overlay.style.color = "rgba(255,255,255,0.95)";
  overlay.style.fontFamily = "ui-monospace, Menlo, Consolas, monospace";
  overlay.style.fontSize = "12px";
  overlay.style.lineHeight = "1.35";
  overlay.style.maxWidth = "420px";
  overlay.style.pointerEvents = "none";

  const hudTitle = document.createElement("div");
  hudTitle.style.fontWeight = "700";
  hudTitle.style.letterSpacing = "0.2px";
  hudTitle.textContent = "Sopor 3D";
  overlay.appendChild(hudTitle);

  const hudStats = document.createElement("div");
  hudStats.style.marginTop = "6px";
  overlay.appendChild(hudStats);

  const hudLineHP = document.createElement("div");
  const hudLinePillar = document.createElement("div");
  const hudLineEssence = document.createElement("div");
  const hudLineEnemies = document.createElement("div");
  hudStats.appendChild(hudLineHP);
  hudStats.appendChild(hudLinePillar);
  hudStats.appendChild(hudLineEssence);
  hudStats.appendChild(hudLineEnemies);

  const hudHelp = document.createElement("div");
  hudHelp.style.marginTop = "6px";
  hudHelp.style.opacity = "0.78";
  hudHelp.textContent = "Click: souris | WASD | Shift: sprint | Clic: attaquer | E: pilier | Tab: HUD";
  overlay.appendChild(hudHelp);

  let hudCollapsed = !!(saved && saved.hudCollapsed === true);
  const setHudCollapsed = (collapsed) => {
    hudCollapsed = !!collapsed;
    hudStats.style.display = hudCollapsed ? "none" : "block";
    hudHelp.style.display = hudCollapsed ? "none" : "block";
    overlay.style.padding = hudCollapsed ? "6px 10px" : "10px 12px";
    overlay.style.opacity = hudCollapsed ? "0.88" : "1";
  };

  // apply persisted preference
  setHudCollapsed(hudCollapsed);

  app.appendChild(overlay);

  // Screen-space damage vignette
  const vignette = document.createElement("div");
  vignette.style.position = "fixed";
  vignette.style.inset = "0";
  vignette.style.pointerEvents = "none";
  vignette.style.opacity = "0";
  vignette.style.transition = "opacity 0.05s linear";
  vignette.style.background = "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 40%, rgba(255,77,242,0.20) 76%, rgba(0,255,200,0.10) 100%)";
  app.appendChild(vignette);

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  root.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05040a);

  const cam = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
  cam.position.set(10, 10, 12);
  cam.layers.enable(0);
  cam.layers.disable(1);
  cam.layers.enable(2);

  const target = new THREE.Vector3(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0x00ffc8, 0x0b0a12, 0.15);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0x8aa7ff, 0.25);
  moon.position.set(-12, 22, 8);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 80;
  moon.shadow.camera.left = -30;
  moon.shadow.camera.right = 30;
  moon.shadow.camera.top = 30;
  moon.shadow.camera.bottom = -30;
  scene.add(moon);

  const seed = hash32("sopor:jardin:3d");
  const rng = makeRng(seed);
  const tex = buildTextures(seed);

  const matGrass = new THREE.MeshStandardMaterial({ map: tex.grass, roughness: 1.0, metalness: 0.0 });
  const matStone = new THREE.MeshStandardMaterial({ map: tex.stone, roughness: 0.95, metalness: 0.0 });
  const matWater = new THREE.MeshStandardMaterial({ map: tex.water, roughness: 0.15, metalness: 0.0, transparent: true, opacity: 0.82, emissive: new THREE.Color(0x001a22), emissiveIntensity: 0.4 });

  // --- Voxel terrain (Jardin) ---
  const tile = 1;
  const W = 44;
  const H = 44;
  const hScale = 3.2;

  const noise = (x, z) => {
    // light, cheap pseudo-noise
    const a = Math.sin((x * 0.21) + (z * 0.17)) * 0.5 + 0.5;
    const b = Math.sin((x * 0.09) - (z * 0.13) + 1.7) * 0.5 + 0.5;
    const c = Math.sin((x * 0.03) + (z * 0.05) + 3.2) * 0.5 + 0.5;
    return (a * 0.55 + b * 0.30 + c * 0.15);
  };

  const sampleHeight = (xWorld, zWorld) => {
    const x = xWorld / tile;
    const z = zWorld / tile;
    const n = noise(x, z);
    const hh = Math.floor(n * hScale);
    const yCenter = hh * 0.5;
    const yTop = yCenter + 0.5;
    return yTop;
  };

  const geomVoxel = new THREE.BoxGeometry(tile, tile, tile);
  const terrain = new THREE.Group();
  scene.add(terrain);

  // Instanced voxels (huge draw-call win)
  /** @type {Array<[number, number, number]>} */
  const grassCells = [];
  /** @type {Array<[number, number, number]>} */
  const stoneCells = [];

  const instances = [];
  for (let z = -H / 2; z < H / 2; z++) {
    for (let x = -W / 2; x < W / 2; x++) {
      const n = noise(x, z);
      const hh = Math.floor(n * hScale);
      const y = hh * 0.5;

      grassCells.push([x * tile, y, z * tile]);

      // occasional stone outcrop
      if (n > 0.76 && rng.next() < 0.18) {
        const r = 1 + rng.nextInt(2);
        for (let k = 0; k < r; k++) {
          stoneCells.push([x * tile, y + 1 + k, z * tile]);
        }
      }

      // neon flower (emissive cube + point light)
      if (rng.next() < 0.035) {
        const flowerMat = new THREE.MeshStandardMaterial({
          color: 0x151022,
          emissive: new THREE.Color(rng.next() < 0.5 ? 0x00ffc8 : 0xff4df2),
          emissiveIntensity: 1.6,
          roughness: 0.85,
          metalness: 0.0,
        });
        const f = new THREE.Mesh(geomVoxel, flowerMat);
        f.position.set(x * tile, y + 1.0, z * tile);
        f.scale.set(0.35, 1.2, 0.35);
        f.castShadow = false;
        terrain.add(f);

        const pl = new THREE.PointLight(flowerMat.emissive, 0.7, 7, 2);
        pl.position.set(x * tile, y + 1.6, z * tile);
        pl.castShadow = false;
        terrain.add(pl);
        instances.push({ mesh: f, light: pl, phase: rng.nextRange(0, Math.PI * 2) });
      }
    }
  }

  const grassInst = new THREE.InstancedMesh(geomVoxel, matGrass, grassCells.length);
  grassInst.castShadow = false;
  grassInst.receiveShadow = true;
  const stoneInst = new THREE.InstancedMesh(geomVoxel, matStone, stoneCells.length);
  stoneInst.castShadow = true;
  stoneInst.receiveShadow = true;
  const tmpMat = new THREE.Matrix4();
  const tmpPos = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const tmpScale = new THREE.Vector3(1, 1, 1);

  for (let i = 0; i < grassCells.length; i++) {
    const c = grassCells[i];
    tmpPos.set(c[0], c[1], c[2]);
    tmpMat.compose(tmpPos, tmpQuat, tmpScale);
    grassInst.setMatrixAt(i, tmpMat);
  }
  grassInst.instanceMatrix.needsUpdate = true;
  terrain.add(grassInst);

  for (let i = 0; i < stoneCells.length; i++) {
    const c = stoneCells[i];
    tmpPos.set(c[0], c[1], c[2]);
    tmpMat.compose(tmpPos, tmpQuat, tmpScale);
    stoneInst.setMatrixAt(i, tmpMat);
  }
  stoneInst.instanceMatrix.needsUpdate = true;
  terrain.add(stoneInst);

  // Water plane
  const waterGeom = new THREE.PlaneGeometry(W * tile, H * tile, 24, 24);
  waterGeom.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeom, matWater);
  water.position.set(0, -0.6, 0);
  water.receiveShadow = true;
  scene.add(water);

  // Simple neon architecture placeholder (pillar)
  const pillar = new THREE.Group();
  const pillarCore = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6, 1.4), matStone);
  pillarCore.position.set(0, 2.6, -6);
  pillarCore.castShadow = true;
  pillarCore.receiveShadow = true;
  pillar.add(pillarCore);

  const runeMat = new THREE.MeshStandardMaterial({
    color: 0x120b1d,
    emissive: new THREE.Color(0x00ffc8),
    emissiveIntensity: 2.0,
    roughness: 0.7,
  });
  const runeBand = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.35, 1.52), runeMat);
  runeBand.position.set(0, 3.2, -6);
  pillar.add(runeBand);

  const pillarLight = new THREE.PointLight(0x00ffc8, 1.2, 16, 2);
  pillarLight.position.set(0, 4.2, -6);
  pillar.add(pillarLight);
  scene.add(pillar);

  // Pillar objective state
  const pillarPos = new THREE.Vector3(0, 0, -6);
  let pillarCharge = 0;
  let pillarActive = false;
  let pillarPulse = 0;

  const savedEssence = saved && typeof saved.essence === "number" ? Math.max(0, saved.essence | 0) : null;
  if (saved && typeof saved.pillarActive === "boolean") {
    pillarActive = saved.pillarActive;
  }
  if (saved && typeof saved.pillarCharge === "number") {
    pillarCharge = clamp(saved.pillarCharge, 0, 1);
  }
  if (pillarActive) pillarCharge = 1;

  // Minimap marker for the pillar (simple emissive sprite-ish quad)
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0x00ffc8,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pillarMarker = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), markerMat);
  pillarMarker.position.set(pillarPos.x, 9.5, pillarPos.z);
  pillarMarker.rotation.x = -Math.PI / 2;
  pillarMarker.layers.set(1);
  scene.add(pillarMarker);

  const playerMarkerMat = new THREE.MeshBasicMaterial({
    color: 0xff4df2,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const playerMarker = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), playerMarkerMat);
  playerMarker.rotation.x = -Math.PI / 2;
  playerMarker.position.set(0, 9.5, 0);
  playerMarker.layers.set(1);
  scene.add(playerMarker);

  // Player voxel model + neon sword
  const player = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0d0b14, roughness: 0.95 });
  const neonMat = new THREE.MeshStandardMaterial({ color: 0x151022, emissive: new THREE.Color(0x00ffc8), emissiveIntensity: 2.2, roughness: 0.5 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.45), bodyMat);
  torso.position.y = 1.0;
  torso.castShadow = true;
  player.add(torso);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), bodyMat);
  head.position.y = 1.75;
  head.castShadow = true;
  player.add(head);

  const sword = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 0.12), neonMat);
  sword.position.set(0.55, 1.1, 0);
  sword.rotation.z = -0.35;
  sword.castShadow = false;
  player.add(sword);

  const swordLight = new THREE.PointLight(0x00ffc8, 1.1, 10, 2);
  swordLight.position.set(0.6, 1.4, 0.3);
  player.add(swordLight);

  player.position.set(0, 0.0, 0);
  scene.add(player);

  // Neon sword trail (bloom-friendly)
  const trailMax = 24;
  const trailPos = new Float32Array(trailMax * 3);
  const trailCol = new Float32Array(trailMax * 3);
  const trailGeom = new THREE.BufferGeometry();
  trailGeom.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
  trailGeom.setAttribute("color", new THREE.BufferAttribute(trailCol, 3));
  const trailMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const trailLine = new THREE.Line(trailGeom, trailMat);
  trailLine.frustumCulled = false;
  scene.add(trailLine);

  const swordTipLocal = new THREE.Vector3(0, 0.55, 0);
  const swordTipWorld = new THREE.Vector3();
  const trailPoints = [];
  const trailColor = new THREE.Color(0x00ffc8);

  // Simple particles (neon shards)
  const pMax = 520;
  const pPos = new Float32Array(pMax * 3);
  const pCol = new Float32Array(pMax * 3);
  const pGeom = new THREE.BufferGeometry();
  pGeom.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeom.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const pPoints = new THREE.Points(pGeom, pMat);
  pPoints.frustumCulled = false;
  scene.add(pPoints);

  const pVx = new Float32Array(pMax);
  const pVy = new Float32Array(pMax);
  const pVz = new Float32Array(pMax);
  const pLife = new Float32Array(pMax);
  // Cached ground height for shard collisions (avoid per-particle terrain sampling each frame)
  const pGx = new Float32Array(pMax);
  const pGz = new Float32Array(pMax);
  const pGy = new Float32Array(pMax);
  const pNext = { i: 0 };

  const spawnShards = (x, y, z, color, n = 14, power = 1) => {
    for (let k = 0; k < n; k++) {
      const i = pNext.i;
      pNext.i = (pNext.i + 1) % pMax;
      const idx = i * 3;
      pPos[idx + 0] = x;
      pPos[idx + 1] = y;
      pPos[idx + 2] = z;

      // Cache initial ground sample at spawn location.
      // (This moves work from per-frame to per-spawn, which is usually cheaper overall.)
      pGx[i] = x;
      pGz[i] = z;
      pGy[i] = sampleHeight(x, z);

      const a = rng.nextRange(0, Math.PI * 2);
      const u = rng.next();
      const s = lerp(1.2, 4.5, u) * power;
      pVx[i] = Math.cos(a) * s;
      pVz[i] = Math.sin(a) * s;
      pVy[i] = lerp(2.0, 5.5, rng.next()) * power;
      pLife[i] = lerp(0.25, 0.55, rng.next());

      pCol[idx + 0] = color.r;
      pCol[idx + 1] = color.g;
      pCol[idx + 2] = color.b;
    }
  };

  // Corruption fog (bloom-friendly, soft sprites) — layer 2 (main view only)
  const fogTex = (() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const g = c.getContext("2d");
    g.clearRect(0, 0, 64, 64);
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    grd.addColorStop(0.0, "rgba(255,255,255,0.92)");
    grd.addColorStop(0.35, "rgba(255,255,255,0.30)");
    grd.addColorStop(1.0, "rgba(255,255,255,0.0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  })();

  const fogCount = 220;
  const fogPos = new Float32Array(fogCount * 3);
  const fogCol = new Float32Array(fogCount * 3);
  const fogGeom = new THREE.BufferGeometry();
  fogGeom.setAttribute("position", new THREE.BufferAttribute(fogPos, 3));
  fogGeom.setAttribute("color", new THREE.BufferAttribute(fogCol, 3));

  const fogMat = new THREE.PointsMaterial({
    map: fogTex,
    size: 2.6,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
    sizeAttenuation: true,
  });
  const fog = new THREE.Points(fogGeom, fogMat);
  fog.frustumCulled = false;
  fog.layers.set(2);
  scene.add(fog);

  // per-fog drift data (relative offsets around player)
  const fogDx = new Float32Array(fogCount);
  const fogDz = new Float32Array(fogCount);
  const fogDy = new Float32Array(fogCount);
  const fogVx = new Float32Array(fogCount);
  const fogVz = new Float32Array(fogCount);
  const fogPhase = new Float32Array(fogCount);
  let fogStrength = 0;

  const colA = new THREE.Color(0xff4df2);
  const colB = new THREE.Color(0x00ffc8);
  for (let i = 0; i < fogCount; i++) {
    const r = Math.sqrt(rng.next()) * 18;
    const a = rng.nextRange(0, Math.PI * 2);
    fogDx[i] = Math.cos(a) * r;
    fogDz[i] = Math.sin(a) * r;
    fogDy[i] = rng.nextRange(0.8, 5.8);
    fogVx[i] = rng.nextRange(-0.45, 0.45);
    fogVz[i] = rng.nextRange(-0.45, 0.45);
    fogPhase[i] = rng.nextRange(0, Math.PI * 2);

    const idx = i * 3;
    const mix = rng.next();
    const c = colA.clone().lerp(colB, mix);
    fogCol[idx + 0] = c.r;
    fogCol[idx + 1] = c.g;
    fogCol[idx + 2] = c.b;
  }

  // Enemies + essence drops
  let essence = 0;
  const enemies = [];
  const orbs = [];
  const healOrbs = [];

  // Enemy minimap markers (layer 1 only)
  const enemyMarkerGeom = new THREE.PlaneGeometry(0.42, 0.42);
  const makeEnemyMarkerMat = (c) => new THREE.MeshBasicMaterial({
    color: c,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // Ranged projectiles (neon bolts)
  const bolts = [];
  const boltGeom = new THREE.IcosahedronGeometry(0.14, 0);
  const spawnBolt = (x, y, z, vx, vy, vz, col) => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x090611,
      emissive: col,
      emissiveIntensity: 2.2,
      roughness: 0.35,
    });
    const m = new THREE.Mesh(boltGeom, mat);
    m.castShadow = false;
    m.receiveShadow = false;
    m.position.set(x, y, z);
    scene.add(m);
    bolts.push({
      mesh: m,
      vx,
      vy,
      vz,
      life: 2.2,
      col,
    });
  };

  const clearBolts = () => {
    for (const b of bolts) scene.remove(b.mesh);
    bolts.length = 0;
  };

  if (savedEssence !== null) essence = savedEssence;

  const enemyGeom = new THREE.BoxGeometry(0.9, 1.1, 0.9);
  const spawnEnemy = (x, z, colorHex, type = "melee") => {
    const c = new THREE.Color(colorHex);
    const enemyMat = new THREE.MeshStandardMaterial({
      color: 0x120b1d,
      emissive: c,
      emissiveIntensity: 1.6,
      roughness: 0.65,
    });
    const m = new THREE.Mesh(enemyGeom, enemyMat);
    m.castShadow = true;
    m.receiveShadow = true;
    const y = sampleHeight(x, z) + 0.55;
    m.position.set(x, y, z);

    const l = new THREE.PointLight(c, 1.1, 10, 2);
    l.position.set(x, y + 0.8, z);
    l.castShadow = false;

    const g = new THREE.Group();
    g.add(m);
    g.add(l);

    const mm = new THREE.Mesh(enemyMarkerGeom, makeEnemyMarkerMat(c));
    mm.rotation.x = -Math.PI / 2;
    mm.position.set(0, 9.5, 0);
    mm.layers.set(1);
    g.add(mm);

    scene.add(g);

    enemies.push({
      group: g,
      mesh: m,
      light: l,
      col: c,
      type,
      hp: type === "ranged" ? 2 : 3,
      vx: 0,
      vz: 0,
      t: rng.nextRange(0, 10),
      lastHitSwing: -1,
      hitFlash: 0,
      shootCD: rng.nextRange(0.4, 1.1),
    });
  };

  const orbGeom = new THREE.IcosahedronGeometry(0.22, 0);
  const orbMat = new THREE.MeshStandardMaterial({
    color: 0x090611,
    emissive: new THREE.Color(0x00ffc8),
    emissiveIntensity: 2.0,
    roughness: 0.35,
  });
  const spawnOrb = (x, z) => {
    const m = new THREE.Mesh(orbGeom, orbMat);
    const y = sampleHeight(x, z) + 0.75;
    m.position.set(x, y, z);
    m.castShadow = false;
    scene.add(m);
    orbs.push({ mesh: m, baseY: y, phase: rng.nextRange(0, Math.PI * 2) });
  };

  const healMat = new THREE.MeshStandardMaterial({
    color: 0x07060f,
    emissive: new THREE.Color(0x8aa7ff),
    emissiveIntensity: 2.2,
    roughness: 0.25,
  });
  const spawnHealOrb = (x, z) => {
    const m = new THREE.Mesh(orbGeom, healMat);
    const y = sampleHeight(x, z) + 0.8;
    m.position.set(x, y, z);
    m.castShadow = false;
    scene.add(m);
    healOrbs.push({ mesh: m, baseY: y, phase: rng.nextRange(0, Math.PI * 2) });
  };

  const clearEnemies = () => {
    for (const e of enemies) scene.remove(e.group);
    enemies.length = 0;
  };

  const clearDrops = () => {
    for (const o of orbs) scene.remove(o.mesh);
    for (const o of healOrbs) scene.remove(o.mesh);
    orbs.length = 0;
    healOrbs.length = 0;
  };

  const resetEncounter = () => {
    clearEnemies();
    clearDrops();
    clearBolts();
    spawnEnemy(4, -2, 0xff4df2, "melee");
    spawnEnemy(-6, -4, 0x00ffc8, "melee");
    spawnEnemy(-2, 7, 0x8aa7ff, "ranged");
  };

  // Initial enemy set
  resetEncounter();

  // Post processing: bloom + pixelation
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));

  // Ordered dithering + quantization for a stronger Pixel Art 3D vibe
  // (kept subtle to avoid crushing neon/bloom highlights)
  const DitherQuantShader = {
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      pixelSize: { value: 2.0 },
      levels: { value: 24.0 },
      strength: { value: 0.9 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec2 resolution;
      uniform float pixelSize;
      uniform float levels;
      uniform float strength;
      varying vec2 vUv;

      float bayer4(vec2 p) {
        vec2 f = mod(p, 4.0);
        float x = f.x;
        float y = f.y;
        float v = 0.0;
        if (y < 1.0) {
          if (x < 1.0) v = 0.0;
          else if (x < 2.0) v = 8.0;
          else if (x < 3.0) v = 2.0;
          else v = 10.0;
        } else if (y < 2.0) {
          if (x < 1.0) v = 12.0;
          else if (x < 2.0) v = 4.0;
          else if (x < 3.0) v = 14.0;
          else v = 6.0;
        } else if (y < 3.0) {
          if (x < 1.0) v = 3.0;
          else if (x < 2.0) v = 11.0;
          else if (x < 3.0) v = 1.0;
          else v = 9.0;
        } else {
          if (x < 1.0) v = 15.0;
          else if (x < 2.0) v = 7.0;
          else if (x < 3.0) v = 13.0;
          else v = 5.0;
        }
        // map [0..15] -> [-0.5..0.5)
        return (v + 0.5) / 16.0 - 0.5;
      }

      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        float l = max(levels, 2.0);

        vec2 ps = vec2(max(pixelSize, 1.0));
        vec2 grid = floor(gl_FragCoord.xy / ps);
        float d = bayer4(grid);

        vec3 rgb = clamp(c.rgb + (d * strength) / l, 0.0, 1.0);
        rgb = floor(rgb * l + 0.5) / l;

        gl_FragColor = vec4(rgb, c.a);
      }
    `,
  };

  // Damage/pillar glitch pass (chromatic aberration + scanline/noise)
  // Intentionally subtle; ramps only when `amount` > 0.
  const GlitchCAShader = {
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      time: { value: 0.0 },
      amount: { value: 0.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec2 resolution;
      uniform float time;
      uniform float amount;
      varying vec2 vUv;

      float hash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      void main() {
        vec2 uv = vUv;
        float a = clamp(amount, 0.0, 1.0);

        // A bit of time-varying aberration direction to feel "alive"
        float ang = time * 1.7 + sin(time * 0.9) * 0.6;
        vec2 dir = vec2(cos(ang), sin(ang));
        float px = 1.0 / max(resolution.x, 1.0);
        float py = 1.0 / max(resolution.y, 1.0);
        vec2 off = dir * vec2(px, py) * (0.8 + 2.2 * a) * 2.0;

        vec4 cG = texture2D(tDiffuse, uv);
        vec4 cR = texture2D(tDiffuse, uv + off);
        vec4 cB = texture2D(tDiffuse, uv - off);
        vec3 rgb = vec3(cR.r, cG.g, cB.b);

        // Scanlines + noise only when glitching
        vec2 frag = gl_FragCoord.xy;
        float scan = sin((frag.y * 0.65 + time * 48.0) * 0.35) * 0.5 + 0.5;
        float n = hash12(frag * 0.25 + time);
        float scanMix = (scan - 0.5) * 0.08 * a;
        float noiseMix = (n - 0.5) * 0.06 * a;

        rgb += (scanMix + noiseMix);
        rgb = clamp(rgb, 0.0, 1.0);

        // Blend in effect based on amount
        vec3 base = cG.rgb;
        gl_FragColor = vec4(mix(base, rgb, a), cG.a);
      }
    `,
  };

  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.75, 0.7, 0.2);
  composer.addPass(bloom);

  const pixelPass = new ShaderPass(PixelShader);
  pixelPass.uniforms["resolution"].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
  const basePixelSize = 2.0;
  pixelPass.uniforms["pixelSize"].value = basePixelSize;
  composer.addPass(pixelPass);

  const ditherPass = new ShaderPass(DitherQuantShader);
  ditherPass.uniforms["resolution"].value.set(window.innerWidth, window.innerHeight);
  ditherPass.uniforms["pixelSize"].value = basePixelSize;
  composer.addPass(ditherPass);

  const glitchPass = new ShaderPass(GlitchCAShader);
  glitchPass.uniforms["resolution"].value.set(window.innerWidth, window.innerHeight);
  glitchPass.uniforms["amount"].value = 0.0;
  composer.addPass(glitchPass);

  // Minimap camera (top-down)
  const minimapCam = new THREE.OrthographicCamera(-14, 14, 14, -14, 0.1, 200);
  minimapCam.up.set(0, 0, -1);
  minimapCam.lookAt(new THREE.Vector3(0, -1, 0));
  minimapCam.layers.enable(0);
  minimapCam.layers.enable(1);

  // Minimal procedural SFX (offline-safe)
  const sfx = (() => {
    /** @type {AudioContext|null} */
    let ctx = null;
    /** @type {GainNode|null} */
    let master = null;
    let lastPillarTickAt = 0;

    // Minimal adaptive music bed
    /** @type {{gain: GainNode, filter: BiquadFilterNode, startedAt: number, lastPulseAt: number} | null} */
    let music = null;

    const ensure = async () => {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch {
          // ignore
        }
      }

      // Start music once audio is available
      if (!music && master) {
        const gain = ctx.createGain();
        gain.gain.value = 0.0;
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 420;
        filter.Q.value = 0.8;
        gain.connect(filter);
        filter.connect(master);

        // pad
        const pad1 = ctx.createOscillator();
        const pad2 = ctx.createOscillator();
        pad1.type = "sawtooth";
        pad2.type = "triangle";
        pad1.frequency.value = 110;
        pad2.frequency.value = 165;
        const padGain = ctx.createGain();
        padGain.gain.value = 0.045;
        pad1.connect(padGain);
        pad2.connect(padGain);
        padGain.connect(gain);
        pad1.start();
        pad2.start();

        // slow LFO (filter wobble)
        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.08;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 140;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        music = {
          gain,
          filter,
          startedAt: ctx.currentTime,
          lastPulseAt: ctx.currentTime,
        };
      }
    };

    const blip = (freq, dur, type, gain, detune = 0) => {
      if (!ctx || !master) return;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    };

    const thump = (freq0, freq1, dur, gain) => {
      if (!ctx || !master) return;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq0, t0);
      osc.frequency.exponentialRampToValueAtTime(freq1, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    };

    return {
      ensure,
      tickMusic(intensity01, calm01) {
        if (!ctx || !master || !music) return;
        const i = clamp(intensity01, 0, 1);
        const calm = clamp(calm01, 0, 1);

        // fade music in/out gently
        const tgt = 0.10 + (1 - calm) * 0.06;
        music.gain.gain.setTargetAtTime(tgt, ctx.currentTime, 0.2);

        // filter opens under pressure and during pillar pulses
        const cutoff = 320 + i * 900 + calm * 240;
        music.filter.frequency.setTargetAtTime(cutoff, ctx.currentTime, 0.15);

        // pulse: a quiet bass throb whose rate increases with intensity
        const interval = 0.62 - i * 0.22;
        if (ctx.currentTime - music.lastPulseAt >= interval) {
          music.lastPulseAt = ctx.currentTime;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 55 + i * 18;
          const t0 = ctx.currentTime;
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.040 + i * 0.04, t0 + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
          osc.connect(g);
          g.connect(music.gain);
          osc.start(t0);
          osc.stop(t0 + 0.22);
        }
      },
      swing() {
        blip(220, 0.07, "triangle", 0.10, -200);
        blip(480, 0.05, "sawtooth", 0.06, 120);
      },
      shot() {
        blip(740, 0.05, "triangle", 0.05, 0);
        blip(1120, 0.03, "sine", 0.03, 0);
      },
      zap() {
        blip(420, 0.05, "square", 0.04, 0);
        blip(820, 0.06, "sine", 0.03, 0);
      },
      hit() {
        blip(980, 0.05, "square", 0.06, -80);
        blip(520, 0.06, "triangle", 0.05, 40);
      },
      kill() {
        thump(180, 60, 0.14, 0.18);
        blip(880, 0.10, "sawtooth", 0.06, 60);
      },
      pickup() {
        blip(660, 0.07, "sine", 0.08, 0);
        blip(990, 0.06, "sine", 0.05, 0);
      },
      heal() {
        blip(520, 0.09, "sine", 0.09, 0);
        blip(780, 0.10, "triangle", 0.06, 0);
      },
      damage() {
        thump(140, 50, 0.18, 0.20);
        blip(240, 0.08, "square", 0.05, -120);
      },
      pillarTick(nowMs) {
        if (nowMs - lastPillarTickAt < 120) return;
        lastPillarTickAt = nowMs;
        blip(360, 0.05, "sine", 0.05, 0);
      },
      pillarActivate() {
        thump(220, 70, 0.22, 0.22);
        blip(660, 0.16, "sawtooth", 0.08, 0);
        blip(990, 0.14, "triangle", 0.06, 0);
      },
    };
  })();

  const keys = new Set();
  window.addEventListener("keydown", (e) => {
    if (e.code === "Tab") {
      e.preventDefault();
      setHudCollapsed(!hudCollapsed);
      return;
    }
    keys.add(e.code);
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Tab") return;
    keys.delete(e.code);
  });

  // Pointer lock + mouse look
  let yaw = -0.65;
  let pitch = -0.35;
  const lookSens = 0.0021;

  // Attack state
  let attackT = 0;
  let attackCD = 0;
  const attackDur = 0.22;
  const attackCooldown = 0.28;
  let swingId = 0;

  // Player damage state
  let hp = 6;
  const hpMax = 6;
  let iFrames = 0;
  let hurt = 0;
  let deadT = 0;

  const onMouseMove = (e) => {
    if (document.pointerLockElement !== renderer.domElement) return;
    yaw -= e.movementX * lookSens;
    pitch -= e.movementY * lookSens;
    pitch = clamp(pitch, -1.15, -0.12);
  };
  window.addEventListener("mousemove", onMouseMove);

  renderer.domElement.addEventListener("click", () => {
    if (document.pointerLockElement !== renderer.domElement) {
      sfx.ensure();
      renderer.domElement.requestPointerLock?.();
    }
  });

  renderer.domElement.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (document.pointerLockElement !== renderer.domElement) return;
    if (attackCD > 0) return;
    if (deadT > 0 || hp <= 0) return;
    sfx.ensure();
    swingId++;
    attackT = attackDur;
    attackCD = attackCooldown;
    trailPoints.length = 0;
    sfx.swing();
  });

  function onResize() {
    cam.aspect = window.innerWidth / window.innerHeight;
    cam.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    pixelPass.uniforms["resolution"].value.set(window.innerWidth, window.innerHeight);
    ditherPass.uniforms["resolution"].value.set(window.innerWidth, window.innerHeight);
    glitchPass.uniforms["resolution"].value.set(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (attackCD > 0) attackCD = Math.max(0, attackCD - dt);
    if (attackT > 0) attackT = Math.max(0, attackT - dt);
    if (iFrames > 0) iFrames = Math.max(0, iFrames - dt);
    hurt = Math.max(0, hurt - dt * 2.6);
    if (deadT > 0) deadT = Math.max(0, deadT - dt);
    pillarPulse = Math.max(0, pillarPulse - dt * 1.8);

    // Adaptive music: intensity from enemies + damage + pillar pulse
    {
      const intensity = clamp(enemies.length / 3, 0, 1) * 0.75 + clamp(hurt, 0, 1) * 0.65 + clamp(pillarPulse, 0, 1) * 0.35;
      const calm = pillarActive ? 1 : clamp(pillarCharge, 0, 1);
      sfx.tickMusic(clamp(intensity, 0, 1), calm);
    }

    const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const sp = sprint ? 6.6 : 4.3;

    const inputX = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    const inputZ = (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0);
    const v = new THREE.Vector3(inputX, 0, inputZ);
    const moving = v.lengthSq() > 0;

    if (deadT <= 0 && hp > 0 && moving) {
      v.normalize();
      // Move in view space (yaw)
      const sinY = Math.sin(yaw);
      const cosY = Math.cos(yaw);
      const mv = new THREE.Vector3(
        v.x * cosY - v.z * sinY,
        0,
        v.x * sinY + v.z * cosY
      );
      player.position.addScaledVector(mv, sp * dt);
      player.rotation.y = yaw + Math.PI;
      player.position.x = clamp(player.position.x, -W / 2 + 2, W / 2 - 2);
      player.position.z = clamp(player.position.z, -H / 2 + 2, H / 2 - 2);
    } else {
      player.rotation.y = yaw + Math.PI;
    }

    // Idle/walk bob
    const t = now / 1000;
    const bob = (deadT <= 0 && hp > 0 && moving) ? Math.sin(t * 10) * 0.08 : Math.sin(t * 2) * 0.04;
    const ground = sampleHeight(player.position.x, player.position.z);
    player.position.y = (ground + 0.05) + bob;

    // Sword swing + trail capture
    // Base pose
    sword.position.set(0.55, 1.1, 0);
    sword.rotation.set(0, 0, -0.35);

    if (attackT > 0) {
      const p = 1 - attackT / attackDur; // 0..1
      // quick arc: wind-up then slash
      const ease = p < 0.35 ? (p / 0.35) : 1 - ((p - 0.35) / 0.65);
      const arc = (p < 0.5 ? p / 0.5 : 1 - (p - 0.5) / 0.5);
      sword.rotation.y = -1.3 + arc * 2.6;
      sword.rotation.x = -0.25 + ease * 0.5;
      sword.rotation.z = -0.55 + arc * 0.8;
      sword.position.x = 0.6;
      sword.position.y = 1.05;
    }

    sword.updateWorldMatrix(true, false);
    swordTipWorld.copy(swordTipLocal).applyMatrix4(sword.matrixWorld);
    if (attackT > 0) {
      trailPoints.unshift(swordTipWorld.clone());
    } else {
      // decay trail when not attacking
      if (trailPoints.length > 0) {
        const keep = Math.max(0, trailPoints.length - 1);
        trailPoints.length = keep;
      }
    }

    // Write trail buffers
    const nPts = Math.min(trailMax, trailPoints.length);
    for (let i = 0; i < trailMax; i++) {
      const idx = i * 3;
      if (i < nPts) {
        const p = trailPoints[i];
        trailPos[idx + 0] = p.x;
        trailPos[idx + 1] = p.y;
        trailPos[idx + 2] = p.z;

        const a = 1 - i / Math.max(1, nPts - 1);
        const c = trailColor;
        trailCol[idx + 0] = c.r * a;
        trailCol[idx + 1] = c.g * a;
        trailCol[idx + 2] = c.b * a;
      } else {
        trailPos[idx + 0] = 0;
        trailPos[idx + 1] = -9999;
        trailPos[idx + 2] = 0;
        trailCol[idx + 0] = 0;
        trailCol[idx + 1] = 0;
        trailCol[idx + 2] = 0;
      }
    }
    trailGeom.attributes.position.needsUpdate = true;
    trailGeom.attributes.color.needsUpdate = true;
    trailGeom.setDrawRange(0, nPts);

    // Enemy update + melee hit detection
    const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    const strikeActive = hp > 0 && deadT <= 0 && attackT > 0 && (1 - attackT / attackDur) > 0.18 && (1 - attackT / attackDur) < 0.65;

    let touching = false;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.t += dt;
      const ex = e.group.position.x;
      const ez = e.group.position.z;

      const dx = player.position.x - ex;
      const dz = player.position.z - ez;
      const dist = Math.hypot(dx, dz);
      if (hp > 0 && deadT <= 0 && dist < 1.15) touching = true;

      const playerAlive = hp > 0 && deadT <= 0;

      // Seek player when close; otherwise wander
      let ax = 0;
      let az = 0;

      if (e.type === "ranged") {
        const inv = dist > 0.0001 ? 1 / dist : 0;
        if (dist < 5.2) {
          // back off
          ax = -dx * inv * 6.8;
          az = -dz * inv * 6.8;
        } else if (dist > 9.5 && dist < 16) {
          // move in a bit to keep pressure
          ax = dx * inv * 3.4;
          az = dz * inv * 3.4;
        } else {
          // strafe / hover
          ax = Math.cos(e.t * 1.05 + i * 0.9) * 2.0 + (-dz * inv) * 1.6;
          az = Math.sin(e.t * 0.95 + i * 1.1) * 2.0 + (dx * inv) * 1.6;
        }

        // shoot when in range
        e.shootCD = Math.max(0, e.shootCD - dt);
        if (playerAlive && e.shootCD <= 0 && dist > 3.8 && dist < 14.0) {
          e.shootCD = rng.nextRange(1.05, 1.65);
          const dirx = dist > 0.0001 ? dx / dist : 0;
          const dirz = dist > 0.0001 ? dz / dist : 0;
          const speed = 9.2;
          const bx = ex;
          const bz = ez;
          const by = e.group.position.y + 0.95;
          spawnBolt(bx, by, bz, dirx * speed, 0.25, dirz * speed, e.col);
          spawnShards(bx, by, bz, e.col, 8, 0.55);
          sfx.shot();
        }
      } else {
        if (dist < 10) {
          const inv = dist > 0.0001 ? 1 / dist : 0;
          ax = dx * inv * 7.2;
          az = dz * inv * 7.2;
        } else {
          ax = Math.cos(e.t * 0.7 + i) * 1.2;
          az = Math.sin(e.t * 0.6 + i * 1.7) * 1.2;
        }
      }

      e.vx = lerp(e.vx, ax, 0.08);
      e.vz = lerp(e.vz, az, 0.08);

      e.group.position.x = clamp(ex + e.vx * dt, -W / 2 + 2, W / 2 - 2);
      e.group.position.z = clamp(ez + e.vz * dt, -H / 2 + 2, H / 2 - 2);
      const gy = sampleHeight(e.group.position.x, e.group.position.z) + 0.55;
      e.group.position.y = lerp(e.group.position.y, gy, 0.25);
      e.light.position.set(0, 0.9, 0);

      // Subtle pulse
      const pulse = 0.6 + 0.4 * Math.sin(t * 3.2 + i);
      e.hitFlash = Math.max(0, e.hitFlash - dt * 4.5);
      const flash = e.hitFlash;
      e.light.intensity = (0.7 + pulse * 0.8) + flash * 1.6;
      e.mesh.material.emissiveIntensity = (1.2 + pulse * 0.9) + flash * 2.2;
      if (flash > 0) {
        e.mesh.position.x = (rng.next() - 0.5) * 0.05;
        e.mesh.position.z = (rng.next() - 0.5) * 0.05;
      } else {
        e.mesh.position.x = 0;
        e.mesh.position.z = 0;
      }

      // Face player
      if (dist > 0.001) {
        e.group.rotation.y = Math.atan2(dx, dz);
      }

      // Melee hit
      if (strikeActive && e.lastHitSwing !== swingId) {
        const hx = ex - player.position.x;
        const hz = ez - player.position.z;
        const hd = Math.hypot(hx, hz);
        if (hd < 2.1) {
          const dot = (hx * forward.x + hz * forward.z) / Math.max(0.0001, hd);
          if (dot > 0.28) {
            e.lastHitSwing = swingId;
            e.hp -= 1;
            e.hitFlash = 0.22;
            sfx.hit();
            // knockback
            const inv = 1 / Math.max(0.0001, hd);
            e.vx += hx * inv * 8.0;
            e.vz += hz * inv * 8.0;

            const hitPos = e.group.position.clone();
            hitPos.y += 0.65;
            spawnShards(hitPos.x, hitPos.y, hitPos.z, e.col, 16, 1.0);

            if (e.hp <= 0) {
              sfx.kill();
              spawnShards(hitPos.x, hitPos.y, hitPos.z, e.col, 26, 1.4);
              spawnOrb(e.group.position.x, e.group.position.z);
              if (rng.next() < 0.28) {
                spawnHealOrb(e.group.position.x + rng.nextRange(-0.4, 0.4), e.group.position.z + rng.nextRange(-0.4, 0.4));
              }
              scene.remove(e.group);
              enemies.splice(i, 1);
            }
          }
        }
      }
    }

    // Bolt update: movement + impacts + player hit
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.life -= dt;

      const p = b.mesh.position;
      b.vx *= 0.995;
      b.vz *= 0.995;
      b.vy = b.vy * 0.995 - 3.8 * dt;
      p.x += b.vx * dt;
      p.y += b.vy * dt;
      p.z += b.vz * dt;

      // hit player
      if (hp > 0 && deadT <= 0) {
        const hx = p.x - player.position.x;
        const hz = p.z - player.position.z;
        const hd = Math.hypot(hx, hz);
        if (hd < 0.75 && Math.abs(p.y - (player.position.y + 0.9)) < 1.2) {
          // impact
          spawnShards(p.x, p.y, p.z, b.col, 14, 1.0);
          sfx.zap();
          scene.remove(b.mesh);
          bolts.splice(i, 1);

          if (iFrames <= 0 && hp > 0) {
            hp = Math.max(0, hp - 1);
            iFrames = 0.85;
            hurt = Math.max(hurt, 1.0);
            sfx.damage();
          }
          continue;
        }
      }

      // terrain impact / expiration
      const gy = sampleHeight(p.x, p.z) + 0.15;
      if (p.y < gy || b.life <= 0) {
        spawnShards(p.x, Math.max(gy, p.y), p.z, b.col, 10, 0.85);
        sfx.zap();
        scene.remove(b.mesh);
        bolts.splice(i, 1);
      }
    }

    // Player contact damage + feedback
    if (touching && iFrames <= 0 && hp > 0 && deadT <= 0) {
      hp = Math.max(0, hp - 1);
      iFrames = 0.85;
      hurt = 1.0;
      spawnShards(player.position.x, player.position.y + 1.0, player.position.z, new THREE.Color(0xff4df2), 18, 1.0);
      sfx.damage();
    }

    // Death + respawn
    if (hp <= 0 && deadT <= 0) {
      deadT = 2.2;
      hurt = 1.0;
      attackT = 0;
      attackCD = 0.35;
      trailPoints.length = 0;
    }
    if (deadT > 0 && deadT < 0.06 && hp <= 0) {
      // respawn
      hp = hpMax;
      iFrames = 1.2;
      hurt = 0;
      player.position.set(0, sampleHeight(0, 0) + 0.2, 0);
      resetEncounter();
    }

    // Pillar interaction / activation
    {
      const dxp = player.position.x - pillarPos.x;
      const dzp = player.position.z - pillarPos.z;
      const dp = Math.hypot(dxp, dzp);
      const near = dp < 2.15;

      const interacting = near && hp > 0 && deadT <= 0 && (keys.has("KeyE") || strikeActive);
      if (!pillarActive && interacting) {
        const boost = strikeActive ? 2.2 : 1.0;
        pillarCharge = clamp(pillarCharge + dt * 0.35 * boost, 0, 1);
        pillarPulse = Math.max(pillarPulse, 0.25);
        sfx.pillarTick(now);
        if (pillarCharge >= 1) {
          pillarActive = true;
          pillarPulse = 1.0;
          spawnShards(pillarPos.x, 5.0, pillarPos.z, new THREE.Color(0x00ffc8), 72, 1.6);
          sfx.pillarActivate();
        }
      }

      // Visual response
      const chargeGlow = pillarActive ? 1.0 : pillarCharge;
      runeMat.emissiveIntensity = 2.0 + chargeGlow * 2.8 + pillarPulse * 2.2;
      pillarLight.intensity = 1.2 + chargeGlow * 1.8 + pillarPulse * 2.0;
      markerMat.opacity = pillarActive ? 0.25 : 0.9;
      pillarMarker.scale.setScalar(1.0 + pillarPulse * 0.65);
      pillarMarker.material.color.setHex(pillarActive ? 0x8aa7ff : 0x00ffc8);
    }

    // Corruption fog: ramps down as pillar charges, clears after activation
    {
      const base = pillarActive ? 0.0 : clamp(0.25 + (1 - pillarCharge) * 0.75, 0, 1);
      const enemyBoost = pillarActive ? 0.0 : clamp(enemies.length / 3, 0, 1) * 0.35;
      const targetFog = clamp(base + enemyBoost, 0, 1);
      fogStrength = lerp(fogStrength, targetFog, 0.02);
      fogMat.opacity = 0.22 * fogStrength;

      const playerGround = sampleHeight(player.position.x, player.position.z);

      // drift around player, wrap in a disk
      for (let i = 0; i < fogCount; i++) {
        fogDx[i] += fogVx[i] * dt;
        fogDz[i] += fogVz[i] * dt;

        const rr = fogDx[i] * fogDx[i] + fogDz[i] * fogDz[i];
        if (rr > 22 * 22) {
          const r = Math.sqrt(rng.next()) * 18;
          const a = rng.nextRange(0, Math.PI * 2);
          fogDx[i] = Math.cos(a) * r;
          fogDz[i] = Math.sin(a) * r;
        }

        const idx = i * 3;
        fogPos[idx + 0] = player.position.x + fogDx[i];
        fogPos[idx + 2] = player.position.z + fogDz[i];

        const bob = Math.sin((now / 1000) * 0.9 + fogPhase[i]) * 0.55;
        fogPos[idx + 1] = playerGround + fogDy[i] + bob;
      }
      fogGeom.attributes.position.needsUpdate = true;
    }

    // Essence orbs: hover + pickup
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      o.mesh.position.y = o.baseY + Math.sin(t * 3.1 + o.phase) * 0.18;
      o.mesh.rotation.y += dt * 1.2;
      const dx = o.mesh.position.x - player.position.x;
      const dz = o.mesh.position.z - player.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.25) {
        essence += 1;
        spawnShards(o.mesh.position.x, o.mesh.position.y, o.mesh.position.z, new THREE.Color(0x00ffc8), 18, 1.1);
        scene.remove(o.mesh);
        orbs.splice(i, 1);
        sfx.pickup();
      }
    }

    // Heal orbs: hover + pickup
    for (let i = healOrbs.length - 1; i >= 0; i--) {
      const o = healOrbs[i];
      o.mesh.position.y = o.baseY + Math.sin(t * 3.4 + o.phase) * 0.16;
      o.mesh.rotation.y += dt * 1.4;
      const dx = o.mesh.position.x - player.position.x;
      const dz = o.mesh.position.z - player.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.25 && hp > 0) {
        const before = hp;
        hp = Math.min(hpMax, hp + 2);
        if (hp !== before) {
          spawnShards(o.mesh.position.x, o.mesh.position.y, o.mesh.position.z, new THREE.Color(0x8aa7ff), 18, 1.0);
          sfx.heal();
        }
        scene.remove(o.mesh);
        healOrbs.splice(i, 1);
      }
    }

    // Flower pulse
    for (const it of instances) {
      const p = 0.5 + 0.5 * Math.sin(t * 2.2 + it.phase);
      it.mesh.scale.y = 0.9 + p * 0.6;
      it.light.intensity = 0.5 + p * 0.5;
    }

    // Water wave
    const pos = water.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = Math.sin((x * 0.12) + t * 1.6) * 0.06 + Math.sin((z * 0.10) - t * 1.2) * 0.05;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;

    // Particle update
    for (let i = 0; i < pMax; i++) {
      const life = pLife[i];
      const idx = i * 3;
      if (life <= 0) {
        if (pPos[idx + 1] > -9000) pPos[idx + 1] = -9999;
        if (pGy[i] > -9000) pGy[i] = -9999;
        continue;
      }
      const nl = life - dt;
      pLife[i] = nl;
      pVx[i] *= 0.96;
      pVz[i] *= 0.96;
      pVy[i] = pVy[i] * 0.94 - 10.5 * dt;
      pPos[idx + 0] += pVx[i] * dt;
      pPos[idx + 1] += pVy[i] * dt;
      pPos[idx + 2] += pVz[i] * dt;
      // fade
      const fade = clamp(nl / 0.55, 0, 1);
      pCol[idx + 0] *= 0.985;
      pCol[idx + 1] *= 0.985;
      pCol[idx + 2] *= 0.985;
      // floor clamp
      // Only re-sample terrain height when a shard is close to the ground OR has moved enough.
      let gy = pGy[i];
      if (gy < -9000) {
        pGx[i] = pPos[idx + 0];
        pGz[i] = pPos[idx + 2];
        gy = pGy[i] = sampleHeight(pGx[i], pGz[i]);
      } else {
        const px = pPos[idx + 0];
        const pz = pPos[idx + 2];
        const nearGround = px === px && (pPos[idx + 1] < gy + 2.8 || pVy[i] < -0.2);
        if (nearGround) {
          const dx = px - pGx[i];
          const dz = pz - pGz[i];
          if (dx * dx + dz * dz > 0.7 * 0.7) {
            pGx[i] = px;
            pGz[i] = pz;
            gy = pGy[i] = sampleHeight(px, pz);
          }
        }
      }

      if (pPos[idx + 1] < gy + 0.2) {
        pPos[idx + 1] = gy + 0.2;
        pVy[i] *= -0.25;
        pVx[i] *= 0.55;
        pVz[i] *= 0.55;
      }
      if (fade <= 0.02) {
        pLife[i] = 0;
        pPos[idx + 1] = -9999;
        pGy[i] = -9999;
      }
    }
    pGeom.attributes.position.needsUpdate = true;
    pGeom.attributes.color.needsUpdate = true;

    // Screen feedback: vignette + brief postprocess glitch
    vignette.style.opacity = String(clamp(hurt * 0.75, 0, 0.85));
    const glitch = Math.max(hurt, pillarPulse * 0.6);
    pixelPass.uniforms["pixelSize"].value = basePixelSize + glitch * 2.2;
    ditherPass.uniforms["pixelSize"].value = pixelPass.uniforms["pixelSize"].value;
    glitchPass.uniforms["time"].value = now / 1000;
    glitchPass.uniforms["amount"].value = clamp(glitch * 0.95, 0, 1);
    bloom.strength = 0.75 + glitch * 0.55;

    // Camera follow
    target.lerp(new THREE.Vector3(player.position.x, player.position.y + 0.9, player.position.z), 0.08);

    const camDist = 14;
    const camHeight = 7.8;
    const camOff = new THREE.Vector3(
      Math.sin(yaw) * camDist,
      camHeight + Math.sin(-pitch) * 1.8,
      Math.cos(yaw) * camDist
    );
    cam.position.lerp(target.clone().add(camOff), 0.08);
    cam.lookAt(target);

    composer.render();

    // Minimap render (no postprocessing): top-right corner
    const mmSize = Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.22);
    const mmPad = 12;
    const mmX = window.innerWidth - mmSize - mmPad;
    const mmY = mmPad;

    minimapCam.position.set(player.position.x, 34, player.position.z);
    minimapCam.lookAt(new THREE.Vector3(player.position.x, 0, player.position.z));

    playerMarker.position.set(player.position.x, 9.5, player.position.z);
    playerMarker.rotation.z = -yaw;

    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.setScissorTest(true);
    renderer.setViewport(mmX, window.innerHeight - mmY - mmSize, mmSize, mmSize);
    renderer.setScissor(mmX, window.innerHeight - mmY - mmSize, mmSize, mmSize);
    renderer.render(scene, minimapCam);
    renderer.setScissorTest(false);
    renderer.autoClear = true;

    // Overlay counters (throttled)
    if (!frame._overlayAt) frame._overlayAt = 0;
    if (now - frame._overlayAt > 180) {
      frame._overlayAt = now;
      const status = hp <= 0 ? "KO…" : (iFrames > 0 ? "Invuln" : "");
      const pillarTxt = pillarActive ? "Pilier: activé" : `Pilier: ${(pillarCharge * 100) | 0}%`;

      hudTitle.textContent = hudCollapsed
        ? `Sopor 3D — PV ${hp}/${hpMax}${status ? " " + status : ""} — Essence ${essence}`
        : "Sopor 3D — Jardin néon (prototype)";

      hudLineHP.textContent = `PV: ${hp}/${hpMax}${status ? " (" + status + ")" : ""}`;
      hudLinePillar.textContent = pillarTxt + (pillarActive ? "" : " — Approchez et maintenez E");
      hudLineEssence.textContent = `Essence: ${essence}`;
      hudLineEnemies.textContent = `Ennemis: ${enemies.length}`;
    }

    // Persistence (throttled)
    if (!frame._saveAt) frame._saveAt = 0;
    if (now - frame._saveAt > 650) {
      frame._saveAt = now;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
          v: 1,
          essence,
          pillarCharge,
          pillarActive,
          hudCollapsed,
        }));
      } catch {
        // ignore
      }
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
