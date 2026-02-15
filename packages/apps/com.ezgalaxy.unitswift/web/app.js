(() => {
  'use strict';

  /* ── Storage ── */
  const STORE = window.ezgalaxy ? ezgalaxy.storage : null;
  async function load(k, d) {
    try { if (STORE) { const v = await STORE.getData(k); return v ?? d; } } catch(_){}
    try { return JSON.parse(localStorage.getItem('us_' + k)) || d; } catch(_){ return d; }
  }
  async function save(k, v) {
    try { if (STORE) return await STORE.setData(k, v); } catch(_){}
    localStorage.setItem('us_' + k, JSON.stringify(v));
  }

  /* ── Unit definitions ── */
  const CATEGORIES = [
    {
      id: 'length', icon: '📏', name: 'Longueur',
      units: [
        { id: 'mm',  name: 'Millimètre (mm)', factor: 0.001 },
        { id: 'cm',  name: 'Centimètre (cm)', factor: 0.01 },
        { id: 'm',   name: 'Mètre (m)',       factor: 1 },
        { id: 'km',  name: 'Kilomètre (km)',  factor: 1000 },
        { id: 'in',  name: 'Pouce (in)',       factor: 0.0254 },
        { id: 'ft',  name: 'Pied (ft)',        factor: 0.3048 },
        { id: 'yd',  name: 'Yard (yd)',        factor: 0.9144 },
        { id: 'mi',  name: 'Mile (mi)',        factor: 1609.344 },
        { id: 'nm',  name: 'Mile nautique',    factor: 1852 }
      ]
    },
    {
      id: 'mass', icon: '⚖️', name: 'Masse',
      units: [
        { id: 'mg',  name: 'Milligramme (mg)', factor: 0.000001 },
        { id: 'g',   name: 'Gramme (g)',        factor: 0.001 },
        { id: 'kg',  name: 'Kilogramme (kg)',   factor: 1 },
        { id: 't',   name: 'Tonne (t)',          factor: 1000 },
        { id: 'oz',  name: 'Once (oz)',          factor: 0.02835 },
        { id: 'lb',  name: 'Livre (lb)',         factor: 0.45359 },
        { id: 'st',  name: 'Stone (st)',         factor: 6.35029 }
      ]
    },
    {
      id: 'temperature', icon: '🌡️', name: 'Température',
      units: [
        { id: 'c', name: 'Celsius (°C)' },
        { id: 'f', name: 'Fahrenheit (°F)' },
        { id: 'k', name: 'Kelvin (K)' }
      ],
      custom: true
    },
    {
      id: 'volume', icon: '🧪', name: 'Volume',
      units: [
        { id: 'ml',    name: 'Millilitre (mL)',  factor: 0.001 },
        { id: 'cl',    name: 'Centilitre (cL)',   factor: 0.01 },
        { id: 'l',     name: 'Litre (L)',         factor: 1 },
        { id: 'm3',    name: 'Mètre cube (m³)',   factor: 1000 },
        { id: 'tsp',   name: 'Cuillère à café',   factor: 0.00493 },
        { id: 'tbsp',  name: 'Cuillère à soupe',  factor: 0.01479 },
        { id: 'cup',   name: 'Tasse (cup)',        factor: 0.23659 },
        { id: 'floz',  name: 'Fluid oz',           factor: 0.02957 },
        { id: 'gal',   name: 'Gallon US',          factor: 3.78541 }
      ]
    },
    {
      id: 'speed', icon: '🏎️', name: 'Vitesse',
      units: [
        { id: 'ms',   name: 'm/s',          factor: 1 },
        { id: 'kmh',  name: 'km/h',         factor: 0.27778 },
        { id: 'mph',  name: 'mph',          factor: 0.44704 },
        { id: 'kn',   name: 'Nœud (kn)',    factor: 0.51444 },
        { id: 'mach', name: 'Mach',         factor: 343 }
      ]
    },
    {
      id: 'data', icon: '💾', name: 'Données',
      units: [
        { id: 'bit',   name: 'Bit',           factor: 1 },
        { id: 'byte',  name: 'Octet (B)',     factor: 8 },
        { id: 'kb',    name: 'Kilooctet (Ko)', factor: 8000 },
        { id: 'mb',    name: 'Mégaoctet (Mo)', factor: 8e6 },
        { id: 'gb',    name: 'Gigaoctet (Go)', factor: 8e9 },
        { id: 'tb',    name: 'Téraoctet (To)', factor: 8e12 },
        { id: 'kib',   name: 'Kibioctet (Kio)',factor: 8192 },
        { id: 'mib',   name: 'Mébioctet (Mio)',factor: 8388608 },
        { id: 'gib',   name: 'Gibioctet (Gio)',factor: 8589934592 }
      ]
    },
    {
      id: 'time', icon: '⏰', name: 'Temps',
      units: [
        { id: 'ms',   name: 'Milliseconde',  factor: 0.001 },
        { id: 's',    name: 'Seconde',        factor: 1 },
        { id: 'min',  name: 'Minute',         factor: 60 },
        { id: 'h',    name: 'Heure',          factor: 3600 },
        { id: 'day',  name: 'Jour',           factor: 86400 },
        { id: 'week', name: 'Semaine',        factor: 604800 },
        { id: 'month',name: 'Mois (30j)',     factor: 2592000 },
        { id: 'year', name: 'Année (365j)',   factor: 31536000 }
      ]
    },
    {
      id: 'area', icon: '📐', name: 'Surface',
      units: [
        { id: 'mm2', name: 'mm²',             factor: 1e-6 },
        { id: 'cm2', name: 'cm²',             factor: 1e-4 },
        { id: 'm2',  name: 'm²',              factor: 1 },
        { id: 'ha',  name: 'Hectare (ha)',     factor: 10000 },
        { id: 'km2', name: 'km²',             factor: 1e6 },
        { id: 'in2', name: 'in²',             factor: 6.4516e-4 },
        { id: 'ft2', name: 'ft²',             factor: 0.09290 },
        { id: 'ac',  name: 'Acre',            factor: 4046.86 }
      ]
    },
    {
      id: 'energy', icon: '⚡', name: 'Énergie',
      units: [
        { id: 'j',    name: 'Joule (J)',      factor: 1 },
        { id: 'kj',   name: 'Kilojoule (kJ)', factor: 1000 },
        { id: 'cal',  name: 'Calorie',        factor: 4.184 },
        { id: 'kcal', name: 'Kilocalorie',    factor: 4184 },
        { id: 'wh',   name: 'Watt-heure',     factor: 3600 },
        { id: 'kwh',  name: 'kWh',            factor: 3.6e6 },
        { id: 'btu',  name: 'BTU',            factor: 1055.06 },
        { id: 'ev',   name: 'Électronvolt',   factor: 1.602e-19 }
      ]
    }
  ];

  /* ── State ── */
  let currentCat = CATEGORIES[0];
  let favorites  = [];
  let history    = [];

  const $ = s => document.querySelector(s);

  /* ── Init ── */
  async function init() {
    favorites = await load('favorites', []);
    history   = await load('history', []);
    renderCatBar();
    selectCategory(currentCat);
    renderFavorites();
    renderHistory();
    bindEvents();
  }

  /* ── Category bar ── */
  function renderCatBar() {
    const bar = $('#cat-bar');
    bar.innerHTML = CATEGORIES.map(c =>
      `<span class="cat-pill${c.id === currentCat.id ? ' active' : ''}" data-cat="${c.id}">${c.icon} ${c.name}</span>`
    ).join('');
  }

  function selectCategory(cat) {
    currentCat = cat;
    const units = cat.units;
    const inSel  = $('#input-unit');
    const outSel = $('#output-unit');
    inSel.innerHTML  = units.map((u, i) => `<option value="${u.id}"${i === 0 ? ' selected' : ''}>${u.name}</option>`).join('');
    outSel.innerHTML = units.map((u, i) => `<option value="${u.id}"${i === 1 ? ' selected' : ''}>${u.name}</option>`).join('');
    $('#input-value').value = '';
    $('#output-value').value = '—';
    $('#formula').textContent = '';
    renderCatBar();
  }

  /* ── Conversion ── */
  function convert() {
    const val = parseFloat($('#input-value').value);
    if (isNaN(val)) { $('#output-value').value = '—'; $('#formula').textContent = ''; return; }

    const fromId = $('#input-unit').value;
    const toId   = $('#output-unit').value;
    let result;

    if (currentCat.custom && currentCat.id === 'temperature') {
      result = convertTemp(val, fromId, toId);
    } else {
      const fromU = currentCat.units.find(u => u.id === fromId);
      const toU   = currentCat.units.find(u => u.id === toId);
      if (!fromU || !toU) return;
      result = val * fromU.factor / toU.factor;
    }

    const formatted = formatNumber(result);
    $('#output-value').value = formatted;
    $('#output-value').style.animation = 'none';
    void $('#output-value').offsetWidth;
    $('#output-value').style.animation = 'ezPop .3s ease';

    const fromName = currentCat.units.find(u => u.id === fromId).name;
    const toName   = currentCat.units.find(u => u.id === toId).name;
    $('#formula').textContent = `${val} ${fromName.split('(')[0].trim()} = ${formatted} ${toName.split('(')[0].trim()}`;

    // Add to history
    addHistory(val, fromId, toId, result);
  }

  function convertTemp(val, from, to) {
    // Convert to Celsius first
    let c;
    if (from === 'c') c = val;
    else if (from === 'f') c = (val - 32) * 5/9;
    else c = val - 273.15;

    // Then to target
    if (to === 'c') return c;
    if (to === 'f') return c * 9/5 + 32;
    return c + 273.15;
  }

  function formatNumber(n) {
    if (Math.abs(n) >= 1e12 || (Math.abs(n) < 1e-6 && n !== 0)) return n.toExponential(6);
    const s = n.toPrecision(10);
    return parseFloat(s).toString();
  }

  /* ── Swap ── */
  function swap() {
    const inSel  = $('#input-unit');
    const outSel = $('#output-unit');
    const tmp = inSel.value;
    inSel.value = outSel.value;
    outSel.value = tmp;
    // Animate
    const icon = $('.swap-icon');
    icon.style.transform = 'rotate(180deg)';
    setTimeout(() => icon.style.transform = '', 400);
    convert();
  }

  /* ── Favorites ── */
  async function addFavorite() {
    const key = `${currentCat.id}|${$('#input-unit').value}|${$('#output-unit').value}`;
    if (favorites.find(f => f.key === key)) return toast('Déjà dans les favoris');
    const fromName = currentCat.units.find(u => u.id === $('#input-unit').value)?.name || '';
    const toName   = currentCat.units.find(u => u.id === $('#output-unit').value)?.name || '';
    favorites.push({ key, cat: currentCat.id, from: $('#input-unit').value, to: $('#output-unit').value, label: `${fromName.split('(')[0].trim()} → ${toName.split('(')[0].trim()}` });
    await save('favorites', favorites);
    renderFavorites();
    toast('⭐ Ajouté aux favoris');
  }

  function renderFavorites() {
    const section = $('#fav-section');
    const list = $('#fav-list');
    if (!favorites.length) { section.style.display = 'none'; return; }
    section.style.display = '';
    list.innerHTML = favorites.map(f =>
      `<span class="fav-chip" data-key="${f.key}">${CATEGORIES.find(c=>c.id===f.cat)?.icon || ''} ${f.label}<span class="del-fav" data-del="${f.key}">✕</span></span>`
    ).join('');
  }

  async function removeFav(key) {
    favorites = favorites.filter(f => f.key !== key);
    await save('favorites', favorites);
    renderFavorites();
  }

  function applyFav(key) {
    const fav = favorites.find(f => f.key === key);
    if (!fav) return;
    const cat = CATEGORIES.find(c => c.id === fav.cat);
    if (cat) { selectCategory(cat); $('#input-unit').value = fav.from; $('#output-unit').value = fav.to; }
  }

  /* ── History ── */
  async function addHistory(val, fromId, toId, result) {
    const fromName = currentCat.units.find(u => u.id === fromId)?.name || fromId;
    const toName   = currentCat.units.find(u => u.id === toId)?.name || toId;
    history.unshift({
      cat: currentCat.id,
      from: `${val} ${fromName.split('(')[0].trim()}`,
      to: `${formatNumber(result)} ${toName.split('(')[0].trim()}`,
      date: Date.now()
    });
    if (history.length > 30) history = history.slice(0, 30);
    await save('history', history);
    renderHistory();
  }

  function renderHistory() {
    const list = $('#history-list');
    if (!history.length) { list.innerHTML = '<div class="empty-state">Aucune conversion effectuée</div>'; return; }
    list.innerHTML = history.slice(0, 15).map((h, i) => {
      const cat = CATEGORIES.find(c => c.id === h.cat);
      return `<div class="hist-row" style="animation-delay:${i * 30}ms">
        <span>${cat?.icon || ''} <span class="h-from">${h.from}</span><span class="h-arrow">→</span><span class="h-to">${h.to}</span></span>
        <span class="h-time">${timeAgo(h.date)}</span>
      </div>`;
    }).join('');
  }

  /* ── Events ── */
  function bindEvents() {
    // Category
    $('#cat-bar').addEventListener('click', e => {
      const pill = e.target.closest('.cat-pill');
      if (!pill) return;
      const cat = CATEGORIES.find(c => c.id === pill.dataset.cat);
      if (cat) selectCategory(cat);
    });

    // Input
    $('#input-value').addEventListener('input', convert);
    $('#input-unit').addEventListener('change', convert);
    $('#output-unit').addEventListener('change', convert);

    // Swap
    $('#btn-swap').addEventListener('click', swap);

    // Copy
    $('#btn-copy').addEventListener('click', () => {
      const v = $('#output-value').value;
      if (v && v !== '—') { navigator.clipboard.writeText(v).then(() => toast('📋 Copié !')); }
    });

    // Favorite
    $('#btn-fav').addEventListener('click', addFavorite);

    // Fav list
    $('#fav-list').addEventListener('click', e => {
      if (e.target.classList.contains('del-fav')) { removeFav(e.target.dataset.del); return; }
      const chip = e.target.closest('.fav-chip');
      if (chip) applyFav(chip.dataset.key);
    });
  }

  /* ── Helpers ── */
  function timeAgo(ts) {
    const d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60) return 'à l\'instant';
    if (d < 3600) return Math.floor(d / 60) + ' min';
    if (d < 86400) return Math.floor(d / 3600) + ' h';
    return Math.floor(d / 86400) + ' j';
  }

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  /* ── Boot ── */
  init();
})();