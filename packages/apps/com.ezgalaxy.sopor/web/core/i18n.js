/**
 * SOPOR - Internationalization System
 * Supports French and English
 */

// Current locale
let currentLocale = 'fr';
let translations = {};
let loadedLocales = new Set();

// Safe localStorage helpers
function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage not available in sandbox
  }
}

// Locale detection
function detectLocale() {
  // Check localStorage first
  const stored = safeGetItem('sopor:locale');
  if (stored && (stored === 'fr' || stored === 'en')) {
    return stored;
  }
  
  // Check browser language
  const browserLang = navigator.language || navigator.userLanguage || 'fr';
  const lang = browserLang.split('-')[0].toLowerCase();
  
  return lang === 'en' ? 'en' : 'fr'; // Default to French
}

/**
 * Load a locale file
 * @param {string} locale - 'fr' or 'en'
 * @returns {Promise<object>}
 */
async function loadLocale(locale) {
  if (loadedLocales.has(locale)) {
    return translations[locale];
  }
  
  try {
    // Dynamic import for locale files
    const module = await import(`../locales/${locale}.json`, { assert: { type: 'json' } });
    translations[locale] = module.default;
    loadedLocales.add(locale);
    return translations[locale];
  } catch (e) {
    console.warn(`Failed to load locale ${locale}, using embedded fallback`);
    // Fallback: use embedded translations
    translations[locale] = locale === 'fr' ? getFrenchFallback() : getEnglishFallback();
    loadedLocales.add(locale);
    return translations[locale];
  }
}

/**
 * Initialize i18n system
 * @param {string} [locale] - Force a specific locale
 * @returns {Promise<void>}
 */
export async function initI18n(locale) {
  currentLocale = locale || detectLocale();
  await loadLocale(currentLocale);
  
  // Also preload the other locale
  const otherLocale = currentLocale === 'fr' ? 'en' : 'fr';
  loadLocale(otherLocale).catch(() => {}); // Don't wait, just preload
}

/**
 * Get current locale
 * @returns {string}
 */
export function getLocale() {
  return currentLocale;
}

/**
 * Set locale and persist preference
 * @param {string} locale - 'fr' or 'en'
 * @returns {Promise<void>}
 */
export async function setLocale(locale) {
  if (locale !== 'fr' && locale !== 'en') {
    console.warn(`Invalid locale: ${locale}, defaulting to 'fr'`);
    locale = 'fr';
  }
  
  currentLocale = locale;
  safeSetItem('sopor:locale', locale);
  
  await loadLocale(locale);
  
  // Dispatch event for UI updates
  window.dispatchEvent(new CustomEvent('sopor:localechange', { detail: { locale } }));
}

/**
 * Toggle between French and English
 * @returns {Promise<string>} - New locale
 */
export async function toggleLocale() {
  const newLocale = currentLocale === 'fr' ? 'en' : 'fr';
  await setLocale(newLocale);
  return newLocale;
}

/**
 * Translate a key with optional interpolation
 * @param {string} key - Dot-notation key (e.g., 'ui.start')
 * @param {object} [params] - Interpolation params
 * @returns {string}
 */
export function t(key, params = {}) {
  const localeData = translations[currentLocale] || {};
  
  // Navigate nested keys
  const keys = key.split('.');
  let value = localeData;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Key not found, return key itself as fallback
      console.warn(`Translation missing: ${key} (${currentLocale})`);
      return key;
    }
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  // Interpolate parameters: {{param}}
  return value.replace(/\{\{(\w+)\}\}/g, (match, paramName) => {
    return params[paramName] !== undefined ? String(params[paramName]) : match;
  });
}

/**
 * Translate with pluralization
 * @param {string} key - Base key (expects key.one and key.other or key.zero)
 * @param {number} count 
 * @param {object} [params] 
 * @returns {string}
 */
export function tn(key, count, params = {}) {
  const allParams = { ...params, count };
  
  if (count === 0) {
    const zeroKey = `${key}.zero`;
    const zeroValue = t(zeroKey, allParams);
    if (zeroValue !== zeroKey) return zeroValue;
  }
  
  if (count === 1) {
    return t(`${key}.one`, allParams);
  }
  
  return t(`${key}.other`, allParams);
}

/**
 * Check if a translation key exists
 * @param {string} key 
 * @returns {boolean}
 */
export function hasTranslation(key) {
  const localeData = translations[currentLocale] || {};
  const keys = key.split('.');
  let value = localeData;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return false;
    }
  }
  
  return typeof value === 'string';
}

/**
 * Get all available locales
 * @returns {Array<{code: string, name: string}>}
 */
export function getAvailableLocales() {
  return [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'English' },
  ];
}

// ========== Embedded Fallback Translations ==========

function getFrenchFallback() {
  return {
    // Game title and meta
    game: {
      title: "Sopor",
      subtitle: "Le Sommeil de l'Architecte",
      tagline: "Offline • Pixel • Quêtes",
    },
    
    // Menu
    menu: {
      subtitle: "Le Sommeil de l'Architecte",
      start: "[ Appuyez pour commencer ]",
    },
    
    // Pause
    pause: {
      title: "PAUSE",
      continue: "Appuyez sur Échap pour continuer",
    },
    
    // Game over
    game_over: {
      title: "DÉFAITE",
      continue: "[ Appuyez pour réessayer ]",
    },
    
    // Notifications
    notification: {
      level_up: "Niveau {{level}} atteint!",
      item_pickup: "Objet récupéré: {{name}}",
    },
    
    // Strata names
    strata: {
      jardin: "Jardin",
      forge: "Forge",
      abime: "Abîme",
      nexus: "Nexus",
      dungeon: "Donjon",
    },
    
    // UI elements
    ui: {
      panel: "Panneau",
      sound: "Son",
      soundOn: "Son: 🔊",
      soundOff: "Son: 🔇",
      reset: "Reset (local)",
      start: "Démarrer",
      load: "Charger",
      deleteSave: "Supprimer save",
      pause: "Pause",
      resume: "Reprendre",
      settings: "Options",
      language: "Langue",
      controls: "Contrôles",
      journal: "Journal",
      inventory: "Inventaire",
      skills: "Compétences",
      map: "Carte",
    },
    
    // Boot screen
    boot: {
      title: "Pseudo",
      label: "Entre ton pseudo (requis à chaque lancement)",
      placeholder: "ex: Eveilleur_7",
      noUser: "Aucun pseudo",
      note: "Note",
      story: "Histoire",
    },
    
    // Controls help
    controls: {
      title: "Contrôles",
      movement: "Déplacement: ZQSD / WASD / flèches",
      attack: "Attaque: clic gauche ou Espace",
      dodge: "Esquive: SHIFT",
      skills: "Compétences: E (Dash) • R (Onde)",
      parry: "Parade: Clic droit",
      interact: "Interaction (PNJ / Pilier): F",
      weapon: "Changer d'arme: 1–9",
      panel: "Panneau: TAB",
      pause: "Pause: Échap",
    },
    
    // HUD elements
    hud: {
      hp: "PV",
      essence: "Essence",
      weapon: "Arme",
      type: "Type",
      stratum: "Strate",
      threat: "Menace",
      stability: "Stabilité",
      danger: "Danger",
      combo: "Combo",
    },
    
    // Skills
    skills: {
      dodge: "Esquive",
      dash: "Dash",
      shockwave: "Onde",
      parry: "Parade",
      ready: "Prêt",
    },
    
    // Combat
    combat: {
      critical: "CRITIQUE!",
      miss: "Raté",
      parried: "Paré!",
      stunned: "Étourdi",
      burn: "Brûlure",
      freeze: "Gel",
      bleed: "Saignement",
      poison: "Poison",
    },
    
    // Quest system
    quest: {
      title: "Trame Collaborative: Réparer le Grand Phare",
      collect: "Récolter des Fibres Lumineuses",
      protect: "Protéger les Ouvriers",
      repair: "Réparer le Phare (injecter l'Essence)",
      community: "Communauté",
      contribution: "Ta contribution",
      progress: "{{current}} / {{required}}",
      completed: "Quête complétée!",
    },
    
    // Items
    items: {
      essence: "Essence Chromatique",
      fiber: "Fibre Lumineuse",
      key: "Clé Onirique",
      relic: "Fragment de Relique",
      dust: "Poussière Abyssale",
      herb: "Herbe de Songe",
      ore: "Minerai Forgé",
    },
    
    // NPCs
    npc: {
      merchant: "Marchand",
      questGiver: "Donneur de Quête",
      wanderer: "Vagabond",
      guard: "Garde",
      worker: "Ouvrier",
    },
    
    // Messages
    messages: {
      ready: "Prêt. Saisis ton pseudo puis Démarrer.",
      worldStart: "Démarrage du monde pour {{username}}...",
      saveLoaded: "Sauvegarde chargée.",
      saveCreated: "Nouvelle partie créée.",
      noEssence: "Tu n'as plus assez d'Essence Chromatique.",
      needEssence: "Il te faut de l'Essence pour interagir.",
      pillarFed: "Pilier alimenté! Stabilité +{{amount}}",
      chestOpen: "Coffre ouvert: +{{essence}} Essence",
      chestLocked: "Coffre verrouillé. Clé Onirique requise.",
      dungeonChest: "Coffre du Donjon: +{{essence}} Essence",
      merchantEmpty: "Marchand: plus rien à vendre pour l'instant.",
      merchantBuy: "Achat réussi: {{weapon}}",
      workerDown: "Un ouvrier s'effondre. La Trame tremble.",
      questComplete: "Étape de quête complétée!",
      deathMessage: "Tu sombres dans l'oubli...",
      respawn: "Tu te réveilles au point d'ancrage.",
      bossDefeat: "Le gardien est vaincu!",
      newWeapon: "Nouvelle arme débloquée: {{weapon}}",
      levelUp: "Niveau supérieur! Compétence disponible.",
    },
    
    // Errors
    errors: {
      usernameRequired: "Pseudo requis.",
      saveFailed: "Échec de la sauvegarde.",
      loadFailed: "Échec du chargement.",
      audioUnavailable: "WebAudio indisponible.",
    },
    
    // Weapon types
    weaponTypes: {
      melee: "Mêlée",
      projectile: "Distance",
      hybrid: "Hybride",
    },
    
    // Rarities
    rarity: {
      common: "Commun",
      uncommon: "Peu commun",
      rare: "Rare",
      epic: "Épique",
      legendary: "Légendaire",
    },
    
    // Danger levels
    danger: {
      low: "Faible",
      mid: "Modéré",
      high: "Élevé",
      extreme: "Extrême",
    },
    
    // Story milestones
    story: {
      intro: "Tu t'éveilles dans la Trame, un monde de rêves en déclin...",
      jardinComplete: "Le Jardin retrouve sa lumière. La Forge t'attend.",
      forgeComplete: "Les flammes de la Forge sont domptées. L'Abîme s'ouvre.",
      abimeComplete: "Les cristaux de l'Abîme résonnent. Le Nexus se révèle.",
      finale: "L'Architecte t'attend au cœur du Nexus...",
      endingRedemption: "Tu as restauré l'équilibre de la Trame.",
      endingCorruption: "La corruption t'a consumé. La Trame s'effondre.",
      endingTranscendence: "Tu transcendes la Trame. Un nouveau rêve commence.",
    },
  };
}

function getEnglishFallback() {
  return {
    // Game title and meta
    game: {
      title: "Sopor",
      subtitle: "The Architect's Slumber",
      tagline: "Offline • Pixel • Quests",
    },
    
    // Menu
    menu: {
      subtitle: "The Architect's Slumber",
      start: "[ Press to start ]",
    },
    
    // Pause
    pause: {
      title: "PAUSE",
      continue: "Press Escape to continue",
    },
    
    // Game over
    game_over: {
      title: "DEFEAT",
      continue: "[ Press to retry ]",
    },
    
    // Notifications
    notification: {
      level_up: "Level {{level}} reached!",
      item_pickup: "Item picked up: {{name}}",
    },
    
    // Strata names
    strata: {
      jardin: "Garden",
      forge: "Forge",
      abime: "Abyss",
      nexus: "Nexus",
      dungeon: "Dungeon",
    },
    
    // UI elements
    ui: {
      panel: "Panel",
      sound: "Sound",
      soundOn: "Sound: 🔊",
      soundOff: "Sound: 🔇",
      reset: "Reset (local)",
      start: "Start",
      load: "Load",
      deleteSave: "Delete Save",
      pause: "Pause",
      resume: "Resume",
      settings: "Settings",
      language: "Language",
      controls: "Controls",
      journal: "Journal",
      inventory: "Inventory",
      skills: "Skills",
      map: "Map",
    },
    
    // Boot screen
    boot: {
      title: "Username",
      label: "Enter your username (required at each launch)",
      placeholder: "e.g.: Awakener_7",
      noUser: "No username",
      note: "Note",
      story: "Story",
    },
    
    // Controls help
    controls: {
      title: "Controls",
      movement: "Move: ZQSD / WASD / Arrows",
      attack: "Attack: Left click or Space",
      dodge: "Dodge: SHIFT",
      skills: "Skills: E (Dash) • R (Shockwave)",
      parry: "Parry: Right click",
      interact: "Interact (NPC / Pillar): F",
      weapon: "Change weapon: 1–9",
      panel: "Panel: TAB",
      pause: "Pause: Escape",
    },
    
    // HUD elements
    hud: {
      hp: "HP",
      essence: "Essence",
      weapon: "Weapon",
      type: "Type",
      stratum: "Stratum",
      threat: "Threat",
      stability: "Stability",
      danger: "Danger",
      combo: "Combo",
    },
    
    // Skills
    skills: {
      dodge: "Dodge",
      dash: "Dash",
      shockwave: "Shockwave",
      parry: "Parry",
      ready: "Ready",
    },
    
    // Combat
    combat: {
      critical: "CRITICAL!",
      miss: "Miss",
      parried: "Parried!",
      stunned: "Stunned",
      burn: "Burn",
      freeze: "Freeze",
      bleed: "Bleed",
      poison: "Poison",
    },
    
    // Quest system
    quest: {
      title: "Collaborative Weave: Repair the Grand Lighthouse",
      collect: "Gather Luminous Fibers",
      protect: "Protect the Workers",
      repair: "Repair the Lighthouse (inject Essence)",
      community: "Community",
      contribution: "Your contribution",
      progress: "{{current}} / {{required}}",
      completed: "Quest completed!",
    },
    
    // Items
    items: {
      essence: "Chromatic Essence",
      fiber: "Luminous Fiber",
      key: "Oniric Key",
      relic: "Relic Fragment",
      dust: "Abyssal Dust",
      herb: "Dream Herb",
      ore: "Forged Ore",
    },
    
    // NPCs
    npc: {
      merchant: "Merchant",
      questGiver: "Quest Giver",
      wanderer: "Wanderer",
      guard: "Guard",
      worker: "Worker",
    },
    
    // Messages
    messages: {
      ready: "Ready. Enter your username then Start.",
      worldStart: "Starting world for {{username}}...",
      saveLoaded: "Save loaded.",
      saveCreated: "New game created.",
      noEssence: "You don't have enough Chromatic Essence.",
      needEssence: "You need Essence to interact.",
      pillarFed: "Pillar fed! Stability +{{amount}}",
      chestOpen: "Chest opened: +{{essence}} Essence",
      chestLocked: "Chest locked. Oniric Key required.",
      dungeonChest: "Dungeon Chest: +{{essence}} Essence",
      merchantEmpty: "Merchant: nothing left to sell for now.",
      merchantBuy: "Purchase successful: {{weapon}}",
      workerDown: "A worker collapses. The Weave trembles.",
      questComplete: "Quest step completed!",
      deathMessage: "You sink into oblivion...",
      respawn: "You awaken at the anchor point.",
      bossDefeat: "The guardian is defeated!",
      newWeapon: "New weapon unlocked: {{weapon}}",
      levelUp: "Level up! Skill point available.",
    },
    
    // Errors
    errors: {
      usernameRequired: "Username required.",
      saveFailed: "Save failed.",
      loadFailed: "Load failed.",
      audioUnavailable: "WebAudio unavailable.",
    },
    
    // Weapon types
    weaponTypes: {
      melee: "Melee",
      projectile: "Ranged",
      hybrid: "Hybrid",
    },
    
    // Rarities
    rarity: {
      common: "Common",
      uncommon: "Uncommon",
      rare: "Rare",
      epic: "Epic",
      legendary: "Legendary",
    },
    
    // Danger levels
    danger: {
      low: "Low",
      mid: "Moderate",
      high: "High",
      extreme: "Extreme",
    },
    
    // Story milestones
    story: {
      intro: "You awaken in the Weave, a world of dreams in decline...",
      jardinComplete: "The Garden regains its light. The Forge awaits.",
      forgeComplete: "The Forge's flames are tamed. The Abyss opens.",
      abimeComplete: "The Abyss crystals resonate. The Nexus is revealed.",
      finale: "The Architect awaits you at the heart of the Nexus...",
      endingRedemption: "You have restored balance to the Weave.",
      endingCorruption: "Corruption has consumed you. The Weave collapses.",
      endingTranscendence: "You transcend the Weave. A new dream begins.",
    },
  };
}

// Alias for compatibility
export const getCurrentLocale = getLocale;

// Export singleton instance for convenience
export default {
  initI18n,
  getLocale,
  getCurrentLocale,
  setLocale,
  toggleLocale,
  t,
  tn,
  hasTranslation,
  getAvailableLocales,
};
