(() => {
  'use strict';

  // ===== Configuration =====
  const EXTENSION_ID = 'com.ezgalaxy.flaggame';
  const STORAGE_PSEUDO = 'ez.flaggame.pseudo';
  const STORAGE_API_BASE = 'ez.community.baseUrl';
  const STORAGE_API_TOKEN = 'ez.community.token';
  const STORAGE_COUNTRIES_CACHE = 'ez.flaggame.countries.cache.v1';
  const STORAGE_LOCAL_LB = 'ez.flaggame.leaderboards.local.v1';
  const FLAG_CDN = 'https://flagcdn.com/256x192';
  const RESTCOUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=cca2,name,translations,altSpellings,flags';
  const TIMER_DURATION = 8000; // 8 seconds for hard mode
  const COUNTRIES_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  let COUNTRIES_RUNTIME = null;

  // ===== Country Database (195 countries) =====
  const COUNTRIES = [
    { code: 'ad', name: 'Andorre', alt: ['andorra'] },
    { code: 'ae', name: 'Émirats arabes unis', alt: ['emirats arabes unis', 'uae', 'emirates'] },
    { code: 'af', name: 'Afghanistan', alt: [] },
    { code: 'ag', name: 'Antigua-et-Barbuda', alt: ['antigua et barbuda', 'antigua'] },
    { code: 'al', name: 'Albanie', alt: ['albania'] },
    { code: 'am', name: 'Arménie', alt: ['armenie', 'armenia'] },
    { code: 'ao', name: 'Angola', alt: [] },
    { code: 'ar', name: 'Argentine', alt: ['argentina'] },
    { code: 'at', name: 'Autriche', alt: ['austria'] },
    { code: 'au', name: 'Australie', alt: ['australia'] },
    { code: 'az', name: 'Azerbaïdjan', alt: ['azerbaidjan', 'azerbaijan'] },
    { code: 'ba', name: 'Bosnie-Herzégovine', alt: ['bosnie herzegovine', 'bosnia'] },
    { code: 'bb', name: 'Barbade', alt: ['barbados'] },
    { code: 'bd', name: 'Bangladesh', alt: [] },
    { code: 'be', name: 'Belgique', alt: ['belgium'] },
    { code: 'bf', name: 'Burkina Faso', alt: [] },
    { code: 'bg', name: 'Bulgarie', alt: ['bulgaria'] },
    { code: 'bh', name: 'Bahreïn', alt: ['bahrein', 'bahrain'] },
    { code: 'bi', name: 'Burundi', alt: [] },
    { code: 'bj', name: 'Bénin', alt: ['benin'] },
    { code: 'bn', name: 'Brunei', alt: ['brunei darussalam'] },
    { code: 'bo', name: 'Bolivie', alt: ['bolivia'] },
    { code: 'br', name: 'Brésil', alt: ['bresil', 'brazil'] },
    { code: 'bs', name: 'Bahamas', alt: [] },
    { code: 'bt', name: 'Bhoutan', alt: ['bhutan'] },
    { code: 'bw', name: 'Botswana', alt: [] },
    { code: 'by', name: 'Biélorussie', alt: ['bielorussie', 'belarus'] },
    { code: 'bz', name: 'Belize', alt: [] },
    { code: 'ca', name: 'Canada', alt: [] },
    { code: 'cd', name: 'République démocratique du Congo', alt: ['rdc', 'congo kinshasa', 'congo-kinshasa', 'rd congo'] },
    { code: 'cf', name: 'République centrafricaine', alt: ['centrafrique', 'central african republic'] },
    { code: 'cg', name: 'République du Congo', alt: ['congo brazzaville', 'congo-brazzaville'] },
    { code: 'ch', name: 'Suisse', alt: ['switzerland'] },
    { code: 'ci', name: "Côte d'Ivoire", alt: ['cote divoire', 'ivory coast'] },
    { code: 'cl', name: 'Chili', alt: ['chile'] },
    { code: 'cm', name: 'Cameroun', alt: ['cameroon'] },
    { code: 'cn', name: 'Chine', alt: ['china'] },
    { code: 'co', name: 'Colombie', alt: ['colombia'] },
    { code: 'cr', name: 'Costa Rica', alt: [] },
    { code: 'cu', name: 'Cuba', alt: [] },
    { code: 'cv', name: 'Cap-Vert', alt: ['cap vert', 'cabo verde', 'cape verde'] },
    { code: 'cy', name: 'Chypre', alt: ['cyprus'] },
    { code: 'cz', name: 'Tchéquie', alt: ['tchequie', 'republique tcheque', 'czech republic', 'czechia'] },
    { code: 'de', name: 'Allemagne', alt: ['germany'] },
    { code: 'dj', name: 'Djibouti', alt: [] },
    { code: 'dk', name: 'Danemark', alt: ['denmark'] },
    { code: 'dm', name: 'Dominique', alt: ['dominica'] },
    { code: 'do', name: 'République dominicaine', alt: ['dominican republic'] },
    { code: 'dz', name: 'Algérie', alt: ['algerie', 'algeria'] },
    { code: 'ec', name: 'Équateur', alt: ['equateur', 'ecuador'] },
    { code: 'ee', name: 'Estonie', alt: ['estonia'] },
    { code: 'eg', name: 'Égypte', alt: ['egypte', 'egypt'] },
    { code: 'er', name: 'Érythrée', alt: ['erythree', 'eritrea'] },
    { code: 'es', name: 'Espagne', alt: ['spain'] },
    { code: 'et', name: 'Éthiopie', alt: ['ethiopie', 'ethiopia'] },
    { code: 'fi', name: 'Finlande', alt: ['finland'] },
    { code: 'fj', name: 'Fidji', alt: ['fiji'] },
    { code: 'fm', name: 'Micronésie', alt: ['micronesie', 'micronesia'] },
    { code: 'fr', name: 'France', alt: [] },
    { code: 'ga', name: 'Gabon', alt: [] },
    { code: 'gb', name: 'Royaume-Uni', alt: ['royaume uni', 'united kingdom', 'uk', 'angleterre', 'england', 'great britain'] },
    { code: 'gd', name: 'Grenade', alt: ['grenada'] },
    { code: 'ge', name: 'Géorgie', alt: ['georgie', 'georgia'] },
    { code: 'gh', name: 'Ghana', alt: [] },
    { code: 'gm', name: 'Gambie', alt: ['gambia'] },
    { code: 'gn', name: 'Guinée', alt: ['guinee', 'guinea'] },
    { code: 'gq', name: 'Guinée équatoriale', alt: ['guinee equatoriale', 'equatorial guinea'] },
    { code: 'gr', name: 'Grèce', alt: ['grece', 'greece'] },
    { code: 'gt', name: 'Guatemala', alt: [] },
    { code: 'gw', name: 'Guinée-Bissau', alt: ['guinee bissau', 'guinea bissau'] },
    { code: 'gy', name: 'Guyana', alt: [] },
    { code: 'hn', name: 'Honduras', alt: [] },
    { code: 'hr', name: 'Croatie', alt: ['croatia'] },
    { code: 'ht', name: 'Haïti', alt: ['haiti'] },
    { code: 'hu', name: 'Hongrie', alt: ['hungary'] },
    { code: 'id', name: 'Indonésie', alt: ['indonesie', 'indonesia'] },
    { code: 'ie', name: 'Irlande', alt: ['ireland'] },
    { code: 'il', name: 'Israël', alt: ['israel'] },
    { code: 'in', name: 'Inde', alt: ['india'] },
    { code: 'iq', name: 'Irak', alt: ['iraq'] },
    { code: 'ir', name: 'Iran', alt: [] },
    { code: 'is', name: 'Islande', alt: ['iceland'] },
    { code: 'it', name: 'Italie', alt: ['italy'] },
    { code: 'jm', name: 'Jamaïque', alt: ['jamaique', 'jamaica'] },
    { code: 'jo', name: 'Jordanie', alt: ['jordan'] },
    { code: 'jp', name: 'Japon', alt: ['japan'] },
    { code: 'ke', name: 'Kenya', alt: [] },
    { code: 'kg', name: 'Kirghizistan', alt: ['kyrgyzstan'] },
    { code: 'kh', name: 'Cambodge', alt: ['cambodia'] },
    { code: 'ki', name: 'Kiribati', alt: [] },
    { code: 'km', name: 'Comores', alt: ['comoros'] },
    { code: 'kn', name: 'Saint-Kitts-et-Nevis', alt: ['saint kitts et nevis', 'saint kitts'] },
    { code: 'kp', name: 'Corée du Nord', alt: ['coree du nord', 'north korea'] },
    { code: 'kr', name: 'Corée du Sud', alt: ['coree du sud', 'south korea'] },
    { code: 'kw', name: 'Koweït', alt: ['koweit', 'kuwait'] },
    { code: 'kz', name: 'Kazakhstan', alt: [] },
    { code: 'la', name: 'Laos', alt: [] },
    { code: 'lb', name: 'Liban', alt: ['lebanon'] },
    { code: 'lc', name: 'Sainte-Lucie', alt: ['sainte lucie', 'saint lucia'] },
    { code: 'li', name: 'Liechtenstein', alt: [] },
    { code: 'lk', name: 'Sri Lanka', alt: [] },
    { code: 'lr', name: 'Liberia', alt: ['libéria'] },
    { code: 'ls', name: 'Lesotho', alt: [] },
    { code: 'lt', name: 'Lituanie', alt: ['lithuania'] },
    { code: 'lu', name: 'Luxembourg', alt: [] },
    { code: 'lv', name: 'Lettonie', alt: ['latvia'] },
    { code: 'ly', name: 'Libye', alt: ['libya'] },
    { code: 'ma', name: 'Maroc', alt: ['morocco'] },
    { code: 'mc', name: 'Monaco', alt: [] },
    { code: 'md', name: 'Moldavie', alt: ['moldova'] },
    { code: 'me', name: 'Monténégro', alt: ['montenegro'] },
    { code: 'mg', name: 'Madagascar', alt: [] },
    { code: 'mh', name: 'Îles Marshall', alt: ['iles marshall', 'marshall islands'] },
    { code: 'mk', name: 'Macédoine du Nord', alt: ['macedoine du nord', 'north macedonia', 'macedoine'] },
    { code: 'ml', name: 'Mali', alt: [] },
    { code: 'mm', name: 'Myanmar', alt: ['birmanie', 'burma'] },
    { code: 'mn', name: 'Mongolie', alt: ['mongolia'] },
    { code: 'mr', name: 'Mauritanie', alt: ['mauritania'] },
    { code: 'mt', name: 'Malte', alt: ['malta'] },
    { code: 'mu', name: 'Maurice', alt: ['mauritius', 'ile maurice'] },
    { code: 'mv', name: 'Maldives', alt: [] },
    { code: 'mw', name: 'Malawi', alt: [] },
    { code: 'mx', name: 'Mexique', alt: ['mexico'] },
    { code: 'my', name: 'Malaisie', alt: ['malaysia'] },
    { code: 'mz', name: 'Mozambique', alt: [] },
    { code: 'na', name: 'Namibie', alt: ['namibia'] },
    { code: 'ne', name: 'Niger', alt: [] },
    { code: 'ng', name: 'Nigeria', alt: ['nigéria'] },
    { code: 'ni', name: 'Nicaragua', alt: [] },
    { code: 'nl', name: 'Pays-Bas', alt: ['pays bas', 'netherlands', 'hollande', 'holland'] },
    { code: 'no', name: 'Norvège', alt: ['norvege', 'norway'] },
    { code: 'np', name: 'Népal', alt: ['nepal'] },
    { code: 'nr', name: 'Nauru', alt: [] },
    { code: 'nz', name: 'Nouvelle-Zélande', alt: ['nouvelle zelande', 'new zealand'] },
    { code: 'om', name: 'Oman', alt: [] },
    { code: 'pa', name: 'Panama', alt: [] },
    { code: 'pe', name: 'Pérou', alt: ['perou', 'peru'] },
    { code: 'pg', name: 'Papouasie-Nouvelle-Guinée', alt: ['papouasie nouvelle guinee', 'papua new guinea'] },
    { code: 'ph', name: 'Philippines', alt: [] },
    { code: 'pk', name: 'Pakistan', alt: [] },
    { code: 'pl', name: 'Pologne', alt: ['poland'] },
    { code: 'pt', name: 'Portugal', alt: [] },
    { code: 'pw', name: 'Palaos', alt: ['palau'] },
    { code: 'py', name: 'Paraguay', alt: [] },
    { code: 'qa', name: 'Qatar', alt: [] },
    { code: 'ro', name: 'Roumanie', alt: ['romania'] },
    { code: 'rs', name: 'Serbie', alt: ['serbia'] },
    { code: 'ru', name: 'Russie', alt: ['russia'] },
    { code: 'rw', name: 'Rwanda', alt: [] },
    { code: 'sa', name: 'Arabie saoudite', alt: ['arabie saoudite', 'saudi arabia'] },
    { code: 'sb', name: 'Îles Salomon', alt: ['iles salomon', 'solomon islands'] },
    { code: 'sc', name: 'Seychelles', alt: [] },
    { code: 'sd', name: 'Soudan', alt: ['sudan'] },
    { code: 'se', name: 'Suède', alt: ['suede', 'sweden'] },
    { code: 'sg', name: 'Singapour', alt: ['singapore'] },
    { code: 'si', name: 'Slovénie', alt: ['slovenie', 'slovenia'] },
    { code: 'sk', name: 'Slovaquie', alt: ['slovakia'] },
    { code: 'sl', name: 'Sierra Leone', alt: [] },
    { code: 'sm', name: 'Saint-Marin', alt: ['saint marin', 'san marino'] },
    { code: 'sn', name: 'Sénégal', alt: ['senegal'] },
    { code: 'so', name: 'Somalie', alt: ['somalia'] },
    { code: 'sr', name: 'Suriname', alt: [] },
    { code: 'ss', name: 'Soudan du Sud', alt: ['south sudan'] },
    { code: 'st', name: 'Sao Tomé-et-Príncipe', alt: ['sao tome et principe', 'sao tome'] },
    { code: 'sv', name: 'Salvador', alt: ['el salvador'] },
    { code: 'sy', name: 'Syrie', alt: ['syria'] },
    { code: 'sz', name: 'Eswatini', alt: ['swaziland'] },
    { code: 'td', name: 'Tchad', alt: ['chad'] },
    { code: 'tg', name: 'Togo', alt: [] },
    { code: 'th', name: 'Thaïlande', alt: ['thailande', 'thailand'] },
    { code: 'tj', name: 'Tadjikistan', alt: ['tajikistan'] },
    { code: 'tl', name: 'Timor oriental', alt: ['timor-leste', 'east timor'] },
    { code: 'tm', name: 'Turkménistan', alt: ['turkmenistan'] },
    { code: 'tn', name: 'Tunisie', alt: ['tunisia'] },
    { code: 'to', name: 'Tonga', alt: [] },
    { code: 'tr', name: 'Turquie', alt: ['turkey', 'türkiye'] },
    { code: 'tt', name: 'Trinité-et-Tobago', alt: ['trinite et tobago', 'trinidad and tobago', 'trinidad'] },
    { code: 'tv', name: 'Tuvalu', alt: [] },
    { code: 'tw', name: 'Taïwan', alt: ['taiwan'] },
    { code: 'tz', name: 'Tanzanie', alt: ['tanzania'] },
    { code: 'ua', name: 'Ukraine', alt: [] },
    { code: 'ug', name: 'Ouganda', alt: ['uganda'] },
    { code: 'us', name: 'États-Unis', alt: ['etats unis', 'etats-unis', 'usa', 'united states', 'amerique', 'america'] },
    { code: 'uy', name: 'Uruguay', alt: [] },
    { code: 'uz', name: 'Ouzbékistan', alt: ['ouzbekistan', 'uzbekistan'] },
    { code: 'va', name: 'Vatican', alt: ['saint siege', 'holy see'] },
    { code: 'vc', name: 'Saint-Vincent-et-les-Grenadines', alt: ['saint vincent et les grenadines', 'saint vincent'] },
    { code: 've', name: 'Venezuela', alt: ['vénézuéla'] },
    { code: 'vn', name: 'Viêt Nam', alt: ['viet nam', 'vietnam'] },
    { code: 'vu', name: 'Vanuatu', alt: [] },
    { code: 'ws', name: 'Samoa', alt: [] },
    { code: 'ye', name: 'Yémen', alt: ['yemen'] },
    { code: 'za', name: 'Afrique du Sud', alt: ['south africa'] },
    { code: 'zm', name: 'Zambie', alt: ['zambia'] },
    { code: 'zw', name: 'Zimbabwe', alt: [] }
  ];

  // ===== Utility Functions =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const $id = (id) => document.getElementById(id);

  function normalize(str) {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9\s]/g, '') // Keep only alphanumeric
      .trim();
  }

  // Levenshtein distance for fuzzy matching
  function levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function safeJsonParse(s) {
    try { return JSON.parse(s); } catch { return null; }
  }

  function uniqStrings(arr) {
    const out = [];
    const seen = new Set();
    for (const v of arr || []) {
      const s = String(v || '').trim();
      if (!s) continue;
      const k = normalize(s);
      if (!k) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(s);
    }
    return out;
  }

  function ensureCountryShape(country) {
    const code = String(country.code || '').toLowerCase();
    const name = String(country.name || '').trim();
    const alt = Array.isArray(country.alt) ? country.alt : [];
    const fallbackUrl = country.flagUrlFallback || country.flagUrl2 || country.flagsPng || '';
    return {
      code,
      name,
      alt: uniqStrings([name, ...alt]),
      flagUrl: country.flagUrl || `${FLAG_CDN}/${code}.png`,
      flagUrlFallback: fallbackUrl
    };
  }

  function getCountries() {
    const list = Array.isArray(COUNTRIES_RUNTIME) && COUNTRIES_RUNTIME.length
      ? COUNTRIES_RUNTIME
      : COUNTRIES;
    return list.map(ensureCountryShape).filter((c) => c.code && c.name);
  }

  async function loadCountries() {
    // Prefer cache
    const cached = safeJsonParse(localStorage.getItem(STORAGE_COUNTRIES_CACHE));
    if (cached && cached.at && Array.isArray(cached.items)) {
      const age = Date.now() - Number(cached.at);
      if (age >= 0 && age < COUNTRIES_CACHE_TTL_MS && cached.items.length >= 150) {
        COUNTRIES_RUNTIME = cached.items;
        App.countriesReady = true;
        App.countriesError = null;
        updateCountriesStatus();
        updateStartButton();
        return;
      }
    }

    // Fetch from RestCountries (full list)
    try {
      const res = await fetch(RESTCOUNTRIES_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const items = (Array.isArray(raw) ? raw : [])
        .map((c) => {
          const cca2 = String((c && c.cca2) || '').toLowerCase();
          const translations = (c && c.translations) ? c.translations : null;
          const fra = translations && translations.fra ? translations.fra : null;
          const nameObj = (c && c.name) ? c.name : null;
          const flagsObj = (c && c.flags) ? c.flags : null;

          const nameFr = (fra && fra.common) ? fra.common : ((nameObj && nameObj.common) ? nameObj.common : '');
          const nameFrOfficial = (fra && fra.official) ? fra.official : '';
          const nameCommon = (nameObj && nameObj.common) ? nameObj.common : '';
          const nameOfficial = (nameObj && nameObj.official) ? nameObj.official : '';
          const altSpellings = (c && Array.isArray(c.altSpellings)) ? c.altSpellings : [];
          const flagsPng = (flagsObj && flagsObj.png) ? flagsObj.png : '';

          const alt = uniqStrings([
            nameFr,
            nameFrOfficial,
            nameCommon,
            nameOfficial,
            ...altSpellings
          ]);

          return {
            code: cca2,
            name: String(nameFr || nameCommon || '').trim(),
            alt: alt,
            flagUrl: cca2 ? `${FLAG_CDN}/${cca2}.png` : flagsPng,
            flagUrlFallback: flagsPng
          };
        })
        .filter((c) => c.code && c.name);

      if (items.length < 150) throw new Error('Dataset too small');

      COUNTRIES_RUNTIME = items;
      localStorage.setItem(STORAGE_COUNTRIES_CACHE, JSON.stringify({ at: Date.now(), items }));
      App.countriesReady = true;
      App.countriesError = null;
      updateCountriesStatus();
      updateStartButton();
    } catch (e) {
      console.warn('Failed to load countries from RestCountries:', e);
      // Fallback to embedded list (partial) so the game still runs.
      COUNTRIES_RUNTIME = null;
      App.countriesReady = true;
      App.countriesError = 'Impossible de charger la liste complète (fallback partiel)';
      updateCountriesStatus();
      updateStartButton();
      toast('error', 'Chargement pays: fallback (réseau)');
    }
  }

  function updateCountriesStatus() {
    const el = $id('countries-status');
    if (!el) return;
    if (!App.countriesReady) {
      el.textContent = '🌍 Chargement des pays et drapeaux…';
      return;
    }
    const n = getCountries().length;
    if (App.countriesError) {
      el.textContent = `⚠️ ${App.countriesError} — ${n} drapeaux disponibles`;
    } else {
      el.textContent = `✅ ${n} drapeaux chargés`;
    }
  }

  function toast(type, message) {
    const container = $id('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('hiding');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  // ===== App State =====
  const App = {
    pseudo: '',
    mode: null, // 'easy', 'normal', 'hard'
    lives: 3,
    score: 0,
    currentCountry: null,
    countries: [],
    countryIndex: 0,
    timer: null,
    timerStart: 0,
    isAnswered: false,
    leaderboard: { easy: [], normal: [], hard: [] },
    activeLeaderboardTab: 'easy',
    preloadedImages: [],
    countriesReady: false,
    countriesError: null
  };

  // ===== API Functions =====
  function getApiConfig() {
    const baseUrl = localStorage.getItem(STORAGE_API_BASE);
    const token = localStorage.getItem(STORAGE_API_TOKEN);
    return { baseUrl, token, available: !!(baseUrl && token) };
  }

  function getLocalLeaderboards() {
    const parsed = safeJsonParse(localStorage.getItem(STORAGE_LOCAL_LB));
    if (!parsed || typeof parsed !== 'object') {
      return { easy: [], normal: [], hard: [] };
    }
    return {
      easy: Array.isArray(parsed.easy) ? parsed.easy : [],
      normal: Array.isArray(parsed.normal) ? parsed.normal : [],
      hard: Array.isArray(parsed.hard) ? parsed.hard : []
    };
  }

  function saveLocalScore(mode, pseudo, score) {
    const lbs = getLocalLeaderboards();
    const items = Array.isArray(lbs[mode]) ? lbs[mode] : [];
    const now = new Date().toISOString();

    const existing = items.find((x) => normalize(x && x.pseudo) === normalize(pseudo));
    const bestScore = existing ? Math.max(Number(existing.score || 0), Number(score || 0)) : Number(score || 0);

    const next = items.filter((x) => normalize(x && x.pseudo) !== normalize(pseudo));
    next.push({ pseudo, score: bestScore, date: now });
    next.sort((a, b) => (b.score || 0) - (a.score || 0));
    lbs[mode] = next.slice(0, 10);
    localStorage.setItem(STORAGE_LOCAL_LB, JSON.stringify(lbs));

    const best = lbs[mode].find((x) => normalize(x && x.pseudo) === normalize(pseudo));
    const bestValue = best && typeof best.score !== 'undefined' ? best.score : bestScore;
    const existingScore = existing ? Number(existing.score || 0) : 0;
    return { leaderboard: lbs[mode], best: bestValue, isNew: !existing || bestScore > existingScore };
  }

  function sanitizeLeaderboardItems(items) {
    const out = [];
    for (const it of items || []) {
      const pseudo = String((it && it.pseudo) || '').trim();
      const score = Number((it && it.score) || 0);
      if (!pseudo || !Number.isFinite(score)) continue;
      out.push({ pseudo, score, date: it ? it.date : undefined });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, 10);
  }

  async function fetchLeaderboard(mode) {
    const { baseUrl, token, available } = getApiConfig();
    const local = getLocalLeaderboards()[mode] || [];
    if (!available) return local;

    try {
      const recordKey = `lb_${mode}`;
      const res = await fetch(`${baseUrl}/api/community/${EXTENSION_ID}/leaderboards/${recordKey}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 404) return local;
      if (!res.ok) return local;
      const data = await res.json();
      const items = data && data.data && Array.isArray(data.data.items) ? data.data.items : [];
      return sanitizeLeaderboardItems(items);
    } catch (e) {
      console.warn('Failed to fetch leaderboard:', e);
      return local;
    }
  }

  async function saveScore(mode, pseudo, score) {
    const { baseUrl, token, available } = getApiConfig();
    // Always save locally so it works offline.
    const localResult = saveLocalScore(mode, pseudo, score);

    if (!available) {
      toast('info', 'Score sauvegardé localement');
      return { local: true, api: false, leaderboard: localResult.leaderboard, best: localResult.best, isNew: localResult.isNew };
    }

    try {
      const recordKey = `lb_${mode}`;
      // Read existing leaderboard record
      let items = [];
      const existingRes = await fetch(
        `${baseUrl}/api/community/${EXTENSION_ID}/leaderboards/${recordKey}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (existingRes.ok) {
        const existing = await existingRes.json();
        items = existing && existing.data && Array.isArray(existing.data.items) ? existing.data.items : [];
      }

      // Merge/update best score per pseudo
      const merged = sanitizeLeaderboardItems(items);
      const existingCloud = merged.find((x) => normalize(x && x.pseudo) === normalize(pseudo));
      const bestCloudScore = existingCloud ? Math.max(existingCloud.score, Number(score || 0)) : Number(score || 0);

      const withoutPseudo = merged.filter((x) => normalize(x.pseudo) !== normalize(pseudo));
      withoutPseudo.push({ pseudo, score: bestCloudScore, date: new Date().toISOString() });
      withoutPseudo.sort((a, b) => b.score - a.score);
      const next = withoutPseudo.slice(0, 10);

      await fetch(`${baseUrl}/api/community/${EXTENSION_ID}/leaderboards/${recordKey}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: { items: next }
        })
      });

      toast('success', 'Score sauvegardé (cloud)');
      return { local: true, api: true, leaderboard: next, best: localResult.best, isNew: localResult.isNew || (!existingCloud || bestCloudScore > existingCloud.score) };
    } catch (e) {
      console.error('Failed to save score:', e);
      toast('error', 'Sauvegarde cloud impossible (local OK)');
      return { local: true, api: false, leaderboard: localResult.leaderboard, best: localResult.best, isNew: localResult.isNew };
    }
  }

  // ===== Image Preloading =====
  function preloadFlags(startIndex, count = 5) {
    App.preloadedImages = [];
    for (let i = 0; i < count; i++) {
      const idx = (startIndex + i) % App.countries.length;
      const country = App.countries[idx];
      const img = new Image();
      img.src = country.flagUrl;
      App.preloadedImages.push(img);
    }
  }

  // ===== Answer Checking =====
  function checkAnswer(answer) {
    const country = App.currentCountry;
    const normalizedAnswer = normalize(answer);
    const normalizedName = normalize(country.name);

    // Exact match
    if (normalizedAnswer === normalizedName) return true;

    // Check alternatives
    for (const alt of country.alt) {
      if (normalizedAnswer === normalize(alt)) return true;
    }

    // Fuzzy match with Levenshtein (tolerance based on word length)
    const maxDistance = Math.min(2, Math.floor(normalizedName.length / 4));
    if (levenshtein(normalizedAnswer, normalizedName) <= maxDistance) return true;

    for (const alt of country.alt) {
      const normAlt = normalize(alt);
      const maxDistAlt = Math.min(2, Math.floor(normAlt.length / 4));
      if (levenshtein(normalizedAnswer, normAlt) <= maxDistAlt) return true;
    }

    return false;
  }

  // ===== Rendering =====
  function render() {
    const app = $id('app');
    app.innerHTML = `
      <header class="game-header">
        <h1 class="game-title">🚩 Flag Game</h1>
        <p class="game-subtitle">Devine le pays à partir de son drapeau !</p>
      </header>
      
      <div id="screen-home" class="screen">
        ${renderHomeScreen()}
      </div>
      
      <div id="screen-game" class="screen screen-hidden">
        ${renderGameScreen()}
      </div>
      
      <div id="screen-gameover" class="screen screen-hidden">
        ${renderGameOverScreen()}
      </div>
    `;

    bindEvents();
    updateCountriesStatus();
    updateStartButton();
  }

  function renderHomeScreen() {
    const savedPseudo = localStorage.getItem(STORAGE_PSEUDO) || '';
    return `
      <div class="ez-card ez-fade-in">
        <div class="pseudo-section">
          <h3>👤 Ton pseudo</h3>
          <div class="input-group">
            <input type="text" 
                   id="pseudo-input" 
                   class="input-field" 
                   placeholder="Entre ton pseudo..."
                   value="${savedPseudo}"
                   maxlength="20">
          </div>
        </div>

        <p id="countries-status" class="ez-muted" style="margin: 0 0 16px 0;"></p>

        <div class="mode-section">
          <h3>🎮 Choisis ton mode</h3>
          <div class="mode-cards">
            <div class="mode-card" data-mode="easy">
              <span class="mode-icon">😊</span>
              <div class="mode-info">
                <h4>Facile</h4>
                <p>3 propositions au choix</p>
              </div>
            </div>
            <div class="mode-card" data-mode="normal">
              <span class="mode-icon">🤔</span>
              <div class="mode-info">
                <h4>Normal</h4>
                <p>Écris le nom du pays</p>
              </div>
            </div>
            <div class="mode-card" data-mode="hard">
              <span class="mode-icon">😈</span>
              <div class="mode-info">
                <h4>Difficile</h4>
                <p>Écris le pays en 8 secondes</p>
              </div>
            </div>
          </div>
        </div>

        <div class="leaderboard-section">
          <h3>🏆 Classement</h3>
          <div class="leaderboard-tabs">
            <button class="leaderboard-tab active" data-tab="easy">Facile</button>
            <button class="leaderboard-tab" data-tab="normal">Normal</button>
            <button class="leaderboard-tab" data-tab="hard">Difficile</button>
          </div>
          <div id="leaderboard-content" class="leaderboard-list">
            <div class="loading"><span class="spinner"></span> Chargement...</div>
          </div>
        </div>

        <button id="start-btn" class="start-btn" disabled>
          🚀 Commencer la partie
        </button>
      </div>
    `;
  }

  function renderGameScreen() {
    return `
      <div class="ez-card">
        <div class="game-hud">
          <div class="hud-lives" id="lives-display">
            <span class="heart">❤️</span>
            <span class="heart">❤️</span>
            <span class="heart">❤️</span>
          </div>
          <div class="hud-score">Score: <span id="score-display">0</span></div>
          <div class="hud-mode" id="mode-display">Facile</div>
        </div>

        <div id="timer-container" class="timer-container" style="display: none;">
          <div id="timer-bar" class="timer-bar" style="width: 100%;"></div>
        </div>

        <div class="flag-container">
          <img id="flag-image" class="flag-image" src="" alt="Drapeau">
        </div>

        <div id="answer-section" class="answer-section">
          <!-- Dynamic content based on mode -->
        </div>

        <div id="feedback" class="feedback" style="display: none;"></div>
      </div>
    `;
  }

  function renderGameOverScreen() {
    return `
      <div class="ez-card ez-fade-in gameover-content">
        <h2 class="gameover-title">💀 Game Over</h2>
        <p>Tu as perdu toutes tes vies !</p>
        <div class="gameover-score" id="final-score">0</div>
        <p>points</p>
        <div id="record-message" class="gameover-record"></div>
        <div class="gameover-buttons">
          <button id="replay-btn" class="gameover-btn primary">🔄 Rejouer</button>
          <button id="home-btn" class="gameover-btn secondary">🏠 Accueil</button>
        </div>
      </div>
    `;
  }

  function renderLeaderboard(mode) {
    const scores = App.leaderboard[mode] || [];
    if (scores.length === 0) {
      return '<div class="leaderboard-empty">Aucun score enregistré</div>';
    }

    return scores.map((entry, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      return `
        <div class="leaderboard-item">
          <span class="leaderboard-rank">${medal}</span>
          <span class="leaderboard-name">${escapeHtml(entry.pseudo)}</span>
          <span class="leaderboard-score">${entry.score}</span>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ===== Event Binding =====
  function bindEvents() {
    // Pseudo input
    const pseudoInput = $id('pseudo-input');
    if (pseudoInput) {
      pseudoInput.addEventListener('input', (e) => {
        App.pseudo = e.target.value.trim();
        localStorage.setItem(STORAGE_PSEUDO, App.pseudo);
        updateStartButton();
      });
    }

    // Initialize pseudo from saved value
    App.pseudo = (pseudoInput && pseudoInput.value ? pseudoInput.value.trim() : '') || '';

    // Mode selection
    $$('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        $$('.mode-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        App.mode = card.dataset.mode;
        updateStartButton();
      });
    });

    // Leaderboard tabs
    $$('.leaderboard-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.leaderboard-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        App.activeLeaderboardTab = tab.dataset.tab;
        $id('leaderboard-content').innerHTML = renderLeaderboard(App.activeLeaderboardTab);
      });
    });

    // Start button
    const startBtn = $id('start-btn');
    if (startBtn) startBtn.addEventListener('click', startGame);

    // Game over buttons
    const replayBtn = $id('replay-btn');
    if (replayBtn) replayBtn.addEventListener('click', () => startGame());
    const homeBtn = $id('home-btn');
    if (homeBtn) homeBtn.addEventListener('click', showHomeScreen);
  }

  function updateStartButton() {
    const btn = $id('start-btn');
    if (btn) {
      btn.disabled = !App.pseudo || !App.mode || !App.countriesReady;
    }
  }

  // ===== Leaderboard Loading =====
  async function loadLeaderboards() {
    const modes = ['easy', 'normal', 'hard'];
    await Promise.all(modes.map(async mode => {
      App.leaderboard[mode] = await fetchLeaderboard(mode);
    }));
    $id('leaderboard-content').innerHTML = renderLeaderboard(App.activeLeaderboardTab);
  }

  // ===== Game Flow =====
  function showHomeScreen() {
    $id('screen-home').classList.remove('screen-hidden');
    $id('screen-game').classList.add('screen-hidden');
    $id('screen-gameover').classList.add('screen-hidden');
    loadLeaderboards();
  }

  function showGameScreen() {
    $id('screen-home').classList.add('screen-hidden');
    $id('screen-game').classList.remove('screen-hidden');
    $id('screen-gameover').classList.add('screen-hidden');
  }

  function showGameOverScreen() {
    $id('screen-home').classList.add('screen-hidden');
    $id('screen-game').classList.add('screen-hidden');
    $id('screen-gameover').classList.remove('screen-hidden');
    
    $id('final-score').textContent = App.score;

    const recordEl = $id('record-message');
    if (recordEl) recordEl.textContent = 'Sauvegarde du score…';

    // Save score (local + cloud if configured)
    saveScore(App.mode, App.pseudo, App.score).then((result) => {
      if (!recordEl) return;
      if (result && result.isNew) {
        recordEl.textContent = result.api ? '🏆 Nouveau record (cloud) !' : '🏆 Nouveau record (local) !';
      } else {
        const best = result && typeof result.best !== 'undefined' ? result.best : App.score;
        recordEl.textContent = `Record: ${best} pts`;
      }
      loadLeaderboards();
    });
  }

  function startGame() {
    const all = getCountries();
    if (!all.length) {
      toast('error', 'Impossible de démarrer : pays non chargés');
      return;
    }
    App.lives = 3;
    App.score = 0;
    App.countries = shuffle(all);
    App.countryIndex = 0;
    App.isAnswered = false;

    showGameScreen();
    updateHUD();
    
    // Show/hide timer for hard mode
    const timerContainer = $id('timer-container');
    timerContainer.style.display = App.mode === 'hard' ? 'block' : 'none';

    // Mode display
    const modeNames = { easy: 'Facile', normal: 'Normal', hard: 'Difficile' };
    $id('mode-display').textContent = modeNames[App.mode];

    nextQuestion();
  }

  function nextQuestion() {
    if (App.lives <= 0) {
      showGameOverScreen();
      return;
    }

    // Reset state
    App.isAnswered = false;
    clearTimeout(App.timer);

    // Get next country (loop if needed)
    if (App.countryIndex >= App.countries.length) {
      App.countries = shuffle(getCountries());
      App.countryIndex = 0;
    }
    
    App.currentCountry = App.countries[App.countryIndex];
    App.countryIndex++;

    // Preload upcoming flags
    preloadFlags(App.countryIndex, 5);

    // Update flag image
    const flagImg = $id('flag-image');
    flagImg.className = 'flag-image';
    flagImg.onerror = () => {
      const fb = App.currentCountry && App.currentCountry.flagUrlFallback ? App.currentCountry.flagUrlFallback : '';
      if (fb && flagImg.src !== fb) {
        flagImg.src = fb;
      }
    };
    flagImg.src = App.currentCountry.flagUrl;

    // Hide feedback
    $id('feedback').style.display = 'none';

    // Render answer section based on mode
    renderAnswerSection();

    // Start timer for hard mode
    if (App.mode === 'hard') {
      startTimer();
    }
  }

  function renderAnswerSection() {
    const section = $id('answer-section');
    
    if (App.mode === 'easy') {
      // Generate 3 choices (1 correct + 2 wrong)
      const choices = generateChoices(App.currentCountry, 3);
      section.innerHTML = `
        <div class="choices-container">
          ${choices.map(choice => `
            <button class="choice-btn" data-code="${choice.code}">
              ${escapeHtml(choice.name)}
            </button>
          `).join('')}
        </div>
      `;

      $$('.choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (App.isAnswered) return;
          handleChoiceAnswer(btn.dataset.code);
        });
      });
    } else {
      // Input mode for normal/hard
      section.innerHTML = `
        <div class="answer-input-container">
          <input type="text" 
                 id="answer-input" 
                 class="answer-input" 
                 placeholder="Nom du pays..."
                 autocomplete="off">
          <button id="submit-answer" class="submit-btn">Valider</button>
        </div>
      `;

      const input = $id('answer-input');
      const submitBtn = $id('submit-answer');

      input.focus();

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !App.isAnswered) {
          handleInputAnswer(input.value);
        }
      });

      submitBtn.addEventListener('click', () => {
        if (!App.isAnswered) {
          handleInputAnswer(input.value);
        }
      });
    }
  }

  function generateChoices(correct, count) {
    const choices = [correct];
    const available = getCountries().filter(c => c.code !== correct.code);
    const shuffled = shuffle(available);
    
    for (let i = 0; i < count - 1 && i < shuffled.length; i++) {
      choices.push(shuffled[i]);
    }
    
    return shuffle(choices);
  }

  function handleChoiceAnswer(code) {
    App.isAnswered = true;
    clearTimeout(App.timer);
    
    const isCorrect = code === App.currentCountry.code;
    const buttons = $$('.choice-btn');
    
    buttons.forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.code === App.currentCountry.code) {
        btn.classList.add('correct');
      } else if (btn.dataset.code === code && !isCorrect) {
        btn.classList.add('wrong');
      }
    });

    processAnswer(isCorrect);
  }

  function handleInputAnswer(answer) {
    App.isAnswered = true;
    clearTimeout(App.timer);
    
    const input = $id('answer-input');
    const submitBtn = $id('submit-answer');
    input.disabled = true;
    submitBtn.disabled = true;
    
    const isCorrect = checkAnswer(answer);
    input.classList.add(isCorrect ? 'correct' : 'wrong');
    
    processAnswer(isCorrect);
  }

  function processAnswer(isCorrect) {
    const flagImg = $id('flag-image');
    const feedback = $id('feedback');
    
    if (isCorrect) {
      App.score++;
      flagImg.classList.add('correct');
      feedback.className = 'feedback correct';
      feedback.innerHTML = `✅ Bravo ! C'est bien <strong>${App.currentCountry.name}</strong>`;
    } else {
      App.lives--;
      flagImg.classList.add('wrong');
      feedback.className = 'feedback wrong';
      feedback.innerHTML = `❌ Raté ! C'était <strong>${App.currentCountry.name}</strong>`;
      
      // Animate heart loss
      animateHeartLoss();
    }
    
    feedback.style.display = 'block';
    updateHUD();

    // Next question after delay
    setTimeout(() => {
      nextQuestion();
    }, 1500);
  }

  function animateHeartLoss() {
    const hearts = $$('.heart');
    const lostIndex = 2 - App.lives;
    if (hearts[lostIndex]) {
      hearts[lostIndex].classList.add('losing');
      setTimeout(() => {
        hearts[lostIndex].classList.remove('losing');
        hearts[lostIndex].classList.add('lost');
      }, 500);
    }
  }

  function updateHUD() {
    $id('score-display').textContent = App.score;
    
    const hearts = $$('.heart');
    hearts.forEach((heart, i) => {
      heart.classList.toggle('lost', i >= App.lives);
    });
  }

  // ===== Timer (Hard Mode) =====
  function startTimer() {
    const timerBar = $id('timer-bar');
    timerBar.style.width = '100%';
    timerBar.classList.remove('urgent');
    
    App.timerStart = Date.now();
    
    const updateTimer = () => {
      if (App.isAnswered) return;
      
      const elapsed = Date.now() - App.timerStart;
      const remaining = Math.max(0, TIMER_DURATION - elapsed);
      const percent = (remaining / TIMER_DURATION) * 100;
      
      timerBar.style.width = `${percent}%`;
      
      if (percent < 30) {
        timerBar.classList.add('urgent');
      }
      
      if (remaining > 0) {
        requestAnimationFrame(updateTimer);
      } else {
        // Time's up!
        handleTimeUp();
      }
    };
    
    requestAnimationFrame(updateTimer);
    
    App.timer = setTimeout(() => {
      if (!App.isAnswered) {
        handleTimeUp();
      }
    }, TIMER_DURATION);
  }

  function handleTimeUp() {
    App.isAnswered = true;
    
    const input = $id('answer-input');
    const submitBtn = $id('submit-answer');
    if (input) input.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    
    App.lives--;
    
    const flagImg = $id('flag-image');
    const feedback = $id('feedback');
    
    flagImg.classList.add('wrong');
    feedback.className = 'feedback wrong';
    feedback.innerHTML = `⏰ Temps écoulé ! C'était <strong>${App.currentCountry.name}</strong>`;
    feedback.style.display = 'block';
    
    animateHeartLoss();
    updateHUD();
    
    setTimeout(() => {
      nextQuestion();
    }, 1500);
  }

  // ===== Initialize =====
  document.addEventListener('DOMContentLoaded', () => {
    App.countriesReady = false;
    render();
    loadLeaderboards();
    loadCountries();
  });
})();
