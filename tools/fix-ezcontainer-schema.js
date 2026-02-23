/**
 * Fix all ezcontainer.json files to match schemaVersion 2 format
 * documented in README.md and AI_GUIDE.md.
 *
 * Before (flat format):
 *   { id, title, description, containerPort, hostPort, healthCheck, runtime, dataVolume }
 *
 * After (schemaVersion 2):
 *   { schemaVersion, id, title, function, version, createdAt, author, docker: { dockerfile, port, env, volumes, healthcheck } }
 */
const fs = require('fs');
const path = require('path');

const appsDir = path.join(__dirname, '..', 'packages', 'apps');
const catalogPath = path.join(__dirname, '..', 'catalog.json');

// Load catalog to get "function" descriptions (catalog uses "function", not "description")
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
const catalogMap = {};
for (const pkg of catalog.packages) {
  catalogMap[pkg.id] = pkg;
}

const appDirs = fs.readdirSync(appsDir).filter(d =>
  fs.statSync(path.join(appsDir, d)).isDirectory()
);

let fixed = 0;
let errors = 0;

for (const dir of appDirs) {
  const manifestPath = path.join(appsDir, dir, 'ezcontainer.json');
  if (!fs.existsSync(manifestPath)) {
    console.log(`⚠️  No ezcontainer.json in ${dir}`);
    continue;
  }

  try {
    const old = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const catalogEntry = catalogMap[old.id];

    // Use "function" from catalog.json, fall back to "description" from old format
    const funcDesc = (catalogEntry && catalogEntry.function) || old.description || old.function || '';

    const fixed_json = {
      schemaVersion: 2,
      id: old.id,
      title: old.title,
      function: funcDesc,
      version: (catalogEntry && catalogEntry.version) || old.version || '1.0.0',
      createdAt: '2025-07-08',
      author: 'EZGalaxy',
      docker: {
        dockerfile: 'Dockerfile',
        port: 8000,
        env: {
          DB_PATH: '/app/data/database.sqlite'
        },
        volumes: ['/app/data'],
        healthcheck: {
          endpoint: '/health',
          interval: 30,
          timeout: 10
        }
      }
    };

    fs.writeFileSync(manifestPath, JSON.stringify(fixed_json, null, 2) + '\n', 'utf-8');
    console.log(`✅ Fixed ${dir}`);
    fixed++;
  } catch (e) {
    console.error(`❌ Error fixing ${dir}: ${e.message}`);
    errors++;
  }
}

console.log(`\nDone: ${fixed} fixed, ${errors} errors`);
