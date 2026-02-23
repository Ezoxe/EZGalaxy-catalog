/**
 * generate-manifests.js
 * Generates manifest.json (PWA) for every app in packages/apps/
 * and adds <link rel="manifest"> + <meta name="theme-color"> to web/index.html
 *
 * Usage:  node tools/generate-manifests.js
 */
const fs = require('fs');
const path = require('path');

const appsDir = path.join(__dirname, '..', 'packages', 'apps');

const appMeta = {
  'com.ezgalaxy.example':    { short: 'Exemple',       theme: '#1a1a2e', cats: ['utilities'] },
  'test':                    { short: 'TEST',           theme: '#1a1a2e', cats: ['utilities'] },
  'network-sim':             { short: 'Network Sim',    theme: '#0d1b2a', cats: ['education', 'utilities'] },
  'code-game':               { short: 'Code Game',      theme: '#0a192f', cats: ['games', 'education'] },
  'kappy-studio':            { short: 'Kappy Studio',   theme: '#1a1a2e', cats: ['entertainment', 'productivity'] },
  'world-capitals':          { short: 'World Capitals', theme: '#0d1b2a', cats: ['games', 'education'] },
  'com.ezgalaxy.budget':     { short: 'Budget',         theme: '#0a0f1c', cats: ['finance', 'productivity'] },
  'com.ezgalaxy.osint':      { short: 'OSINT Suite',    theme: '#0a0f1c', cats: ['security', 'utilities'] },
  'com.ezgalaxy.sopor':      { short: 'Sopor',          theme: '#0a0a14', cats: ['games', 'entertainment'] },
  'com.ezgalaxy.terminal':   { short: 'Terminal',       theme: '#1a1a2e', cats: ['developer tools', 'utilities'] },
  'com.ezgalaxy.flaggame':   { short: 'Flag Game',      theme: '#0d1b2a', cats: ['games', 'education'] },
  'com.ezgalaxy.projecthub': { short: 'Project Hub',    theme: '#0a0f1c', cats: ['productivity', 'business'] },
  'com.ezgalaxy.pentest-lab':{ short: 'EzPentest',      theme: '#0a0f1c', cats: ['security', 'education'] },
  'com.ezgalaxy.finvest':    { short: 'FinVest',        theme: '#0a0f1c', cats: ['finance', 'business', 'productivity'] },
  'com.ezgalaxy.gamestudio': { short: 'Game Studio',    theme: '#0a0f1c', cats: ['games', 'developer tools'] },
  'com.ezgalaxy.it-discovery':{ short: 'IT Discovery',  theme: '#0d1b2a', cats: ['education'] },
  'com.ezgalaxy.pomodoro':   { short: 'Pomodoro Pro',   theme: '#1a1a2e', cats: ['productivity'] },
  'com.ezgalaxy.habits':     { short: 'Habit Forge',    theme: '#0d1b2a', cats: ['lifestyle', 'productivity'] },
  'com.ezgalaxy.markdown':   { short: 'MD Studio',      theme: '#1a1a2e', cats: ['developer tools', 'productivity'] },
  'com.ezgalaxy.chroma':     { short: 'ChromaLab',      theme: '#1a1a2e', cats: ['design', 'utilities'] },
  'com.ezgalaxy.kanflow':    { short: 'KanFlow',        theme: '#0a0f1c', cats: ['productivity', 'business'] },
  'com.ezgalaxy.neurocards': { short: 'NeuroCards',     theme: '#0d1b2a', cats: ['education'] },
  'com.ezgalaxy.vaultgen':   { short: 'VaultGen',       theme: '#0a0f1c', cats: ['security', 'utilities'] },
  'com.ezgalaxy.pollmaker':  { short: 'PollMaker',      theme: '#1a1a2e', cats: ['social', 'utilities'] },
  'com.ezgalaxy.typeracer':  { short: 'TypeRacer',      theme: '#0d1b2a', cats: ['games', 'education'] },
  'com.ezgalaxy.soundscape': { short: 'SoundScape',     theme: '#0a0a14', cats: ['lifestyle', 'health & fitness'] },
  'com.ezgalaxy.unitswift':  { short: 'UnitSwift',      theme: '#1a1a2e', cats: ['utilities'] },
  'com.ezgalaxy.moodtracker':{ short: 'MoodTracker',    theme: '#0d1b2a', cats: ['lifestyle', 'health & fitness'] },
};

let created = 0;
let skipped = 0;
let htmlUpdated = 0;

const dirs = fs.readdirSync(appsDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

for (const dir of dirs) {
  const ezPath = path.join(appsDir, dir, 'ezcontainer.json');
  if (!fs.existsSync(ezPath)) continue;

  const ez = JSON.parse(fs.readFileSync(ezPath, 'utf-8'));
  const meta = appMeta[ez.id] || { short: ez.title, theme: '#1a1a2e', cats: ['utilities'] };
  const webDir = path.join(appsDir, dir, 'web');
  const manifestPath = path.join(webDir, 'manifest.json');

  // ---- Create manifest.json ----
  if (fs.existsSync(manifestPath)) {
    console.log(`[SKIP] ${dir}/web/manifest.json already exists`);
    skipped++;
  } else {
    const manifest = {
      name: ez.title,
      short_name: meta.short,
      description: ez.function,
      start_url: './index.html',
      scope: './',
      display: 'standalone',
      orientation: 'any',
      theme_color: meta.theme,
      background_color: meta.theme,
      lang: 'fr',
      dir: 'ltr',
      categories: meta.cats,
      icons: [
        { src: './icons/icon-192.svg',          sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
        { src: './icons/icon-512.svg',          sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        { src: './icons/icon-maskable-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'maskable' },
        { src: './icons/icon-maskable-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' }
      ],
      screenshots: [],
      prefer_related_applications: false
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
    console.log(`[CREATE] ${dir}/web/manifest.json`);
    created++;
  }

  // ---- Patch web/index.html ----
  const indexPath = path.join(webDir, 'index.html');
  if (!fs.existsSync(indexPath)) continue;

  let html = fs.readFileSync(indexPath, 'utf-8');
  if (html.includes('rel="manifest"')) continue;

  // Insert PWA meta right after <title>...</title>
  const titleClose = html.indexOf('</title>');
  if (titleClose === -1) continue;
  const insertAt = html.indexOf('\n', titleClose) + 1;

  const pwaBlock = [
    '',
    '  <!-- PWA -->',
    `  <link rel="manifest" href="./manifest.json">`,
    `  <meta name="theme-color" content="${meta.theme}">`,
    `  <meta name="apple-mobile-web-app-capable" content="yes">`,
    `  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`,
    `  <meta name="apple-mobile-web-app-title" content="${meta.short}">`,
    `  <meta name="mobile-web-app-capable" content="yes">`,
    `  <meta name="application-name" content="${meta.short}">`,
    ''
  ].join('\n');

  html = html.slice(0, insertAt) + pwaBlock + html.slice(insertAt);
  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log(`[PATCH]  ${dir}/web/index.html — PWA meta added`);
  htmlUpdated++;
}

console.log(`\nDone: ${created} manifest(s) created, ${skipped} skipped, ${htmlUpdated} index.html patched.`);
