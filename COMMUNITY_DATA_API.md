# EZGalaxy — Persistance des données (Apps Docker)

> **Chaque application Docker gère ses propres données de manière autonome.**

## Vue d'ensemble

Dans EZGalaxy, chaque application du catalogue est un **container Docker indépendant**. Contrairement à l'ancien système centralisé, chaque app est responsable de sa propre gestion de données.

EZGalaxy fournit :
- Un **volume persistant** monté automatiquement dans le container
- Un **réseau Docker** partagé pour la communication inter-containers
- Un **reverse proxy Nginx** pour servir l'app

---

## Stockage persistant

### Fonctionnement

Quand une app déclare des volumes dans `ezcontainer.json`, EZGalaxy monte un dossier persistant du serveur hôte dans le container :

```
Serveur hôte :  /var/lib/ezgalaxy_data/containers/<slug>/data/
     ↕  (bind mount)
Container :     /app/data  (ou le chemin déclaré dans "volumes")
```

### Configuration dans `ezcontainer.json`

```json
{
  "schemaVersion": 2,
  "id": "com.ezgalaxy.my-app",
  "title": "Mon App",
  "docker": {
    "dockerfile": "Dockerfile",
    "port": 3000,
    "volumes": ["/app/data"]
  }
}
```

### Cycle de vie des données

| Événement | Données persistantes |
|-----------|---------------------|
| Redémarrage du container | ✅ Conservées |
| Mise à jour de l'app | ✅ Conservées |
| Arrêt / démarrage | ✅ Conservées |
| Désinstallation de l'app | ❌ Supprimées |

---

## Options de base de données

Chaque app choisit sa propre solution de stockage. Voici les options recommandées :

### SQLite (recommandé pour la plupart des apps)

Simple, léger, aucune dépendance externe.

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY . .
RUN npm ci --production
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["node", "server.js"]
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

```js
// server.js
const Database = require('better-sqlite3');
const db = new Database('/app/data/database.sqlite');

// Créer les tables au démarrage
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pseudo TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
```

```json
{
  "docker": {
    "port": 3000,
    "volumes": ["/app/data"],
    "env": {
      "DB_PATH": "/app/data/database.sqlite"
    }
  }
}
```

### Fichiers JSON

Pour les apps simples avec peu de données.

```js
const fs = require('fs');
const DATA_FILE = '/app/data/settings.json';

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return {}; }
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
```

### Redis / PostgreSQL / MySQL

Pour les apps complexes, on peut inclure un service supplémentaire via Docker Compose. Le `docker-compose.yml` est généré par EZGalaxy lors du déploiement.

Si l'app a besoin d'une base de données externe, elle peut utiliser Docker Compose multi-service :

```json
{
  "docker": {
    "port": 3000,
    "volumes": ["/app/data"],
    "env": {
      "DATABASE_URL": "postgresql://app:secret@db:5432/myapp"
    }
  }
}
```

> Note : les bases de données multi-service (PostgreSQL, Redis, etc.) nécessitent une configuration avancée du Dockerfile et ne sont pas couvertes par le système de déploiement automatique standard.

---

## Communication inter-containers

Les containers Docker d'EZGalaxy partagent le réseau `ezgalaxy_apps`. Chaque container est accessible par son nom :

```
ezgalaxy-<slug>
```

### Exemple : appeler un autre container

```js
// Depuis le container "mon-app", appeler le container "api-service"
const response = await fetch('http://ezgalaxy-api-service:3000/data');
const data = await response.json();
```

---

## Accès depuis l'extérieur

Les apps sont servies par Nginx en reverse proxy :

```
https://<domain>/apps/<slug>/  →  http://127.0.0.1:<port>/
```

Les utilisateurs accèdent à l'app via l'URL publique. Le container n'a pas besoin de gérer HTTPS.

---

## Exemples complets

### App de scores (Node.js + SQLite)

**`ezcontainer.json`**
```json
{
  "schemaVersion": 2,
  "id": "com.ezgalaxy.scores",
  "title": "Tableau de scores",
  "function": "Classement interactif avec persistance",
  "version": "1.0.0",
  "createdAt": "2026-02-22",
  "author": "EZGalaxy",
  "docker": {
    "dockerfile": "Dockerfile",
    "port": 3000,
    "volumes": ["/app/data"],
    "healthcheck": { "endpoint": "/health" }
  }
}
```

**`Dockerfile`**
```dockerfile
FROM node:20-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN mkdir -p /app/data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
```

**`server.js`**
```js
const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database(process.env.DB_PATH || '/app/data/scores.sqlite');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'web')));

// Créer la table
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    pseudo TEXT PRIMARY KEY,
    score INTEGER NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// API
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/scores', (req, res) => {
  const scores = db.prepare('SELECT * FROM scores ORDER BY score DESC LIMIT 100').all();
  res.json(scores);
});

app.post('/api/scores', (req, res) => {
  const { pseudo, score } = req.body;
  db.prepare('INSERT OR REPLACE INTO scores (pseudo, score, updated_at) VALUES (?, ?, datetime("now"))').run(pseudo, score);
  res.json({ ok: true });
});

app.listen(3000, () => console.log('Scores app running on :3000'));
```

### App statique simple (Nginx)

**`ezcontainer.json`**
```json
{
  "schemaVersion": 2,
  "id": "com.ezgalaxy.hello",
  "title": "Hello World",
  "function": "Page de démonstration",
  "version": "1.0.0",
  "createdAt": "2026-02-22",
  "author": "EZGalaxy",
  "docker": {
    "dockerfile": "Dockerfile",
    "port": 80,
    "healthcheck": { "endpoint": "/" }
  }
}
```

**`Dockerfile`**
```dockerfile
FROM nginx:alpine
COPY web/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost/ || exit 1
```

---

## Migration depuis l'ancien système

L'ancien système utilisait un SDK centralisé (`ezgalaxy-sdk.js`) avec stockage dans une table `app_storage` partagée. Ce système a été remplacé par des containers Docker autonomes.

| Ancien système | Nouveau système |
|----------------|-----------------|
| `ezpage.json` (schemaVersion 1) | `ezcontainer.json` (schemaVersion 2) |
| Fichiers statiques servis par EZGalaxy | Container Docker autonome |
| SDK `ezgalaxy.storage.*` / `ezgalaxy.app.*` | Base de données propre au container |
| iframe sandbox + postMessage bridge | Reverse proxy Nginx |
| Table `app_storage` partagée | Volume persistant par app |
| API `/api/app-storage/*` | API propre à chaque app |

Pour migrer une app existante :
1. Créer un `Dockerfile` qui sert l'app
2. Remplacer `ezpage.json` par `ezcontainer.json` (schemaVersion 2)
3. Remplacer les appels SDK par une solution de stockage locale (SQLite, fichiers JSON)
4. Mettre à jour `catalog.json` vers schemaVersion 2

---

## FAQ

**Q: Les données persistent-elles après un redémarrage ?**
Oui, si vous utilisez un volume déclaré dans `ezcontainer.json`. Les données sont stockées sur le serveur hôte.

**Q: Puis-je utiliser n'importe quelle base de données ?**
Oui. SQLite, PostgreSQL, Redis, fichiers JSON — le container est autonome. SQLite est recommandé pour la plupart des cas.

**Q: Les apps peuvent-elles communiquer entre elles ?**
Oui, via le réseau Docker `ezgalaxy_apps`. Chaque container est accessible par `ezgalaxy-<slug>`.

**Q: Comment gérer les migrations de BDD lors d'une mise à jour ?**
L'app doit gérer ses propres migrations au démarrage (pattern "migrate on boot"). Créez les tables avec `IF NOT EXISTS` et ajoutez les colonnes de manière non destructive.

**Q: Quelle est la taille limite du stockage ?**
Il n'y a pas de limite imposée par EZGalaxy. La limite est celle du disque du serveur hôte.

**Q: Que se passe-t-il lors de la désinstallation ?**
Le container est arrêté et supprimé, l'image Docker est supprimée, et le dossier de données persistantes (`/var/lib/ezgalaxy_data/containers/<slug>/`) est supprimé.