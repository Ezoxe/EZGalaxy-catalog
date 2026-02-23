# Guide D\u00e9veloppeur \u2014 Cr\u00e9er une Application pour le Catalogue EZGalaxy

> Ce guide explique exactement comment cr\u00e9er une application Docker qui fonctionnera parfaitement sur EZGalaxy.

---

## Table des mati\u00e8res

1. [Vue d\u2019ensemble](#1-vue-densemble)
2. [Structure d\u2019un package](#2-structure-dun-package)
3. [Le manifest `ezcontainer.json`](#3-le-manifest-ezcontainerjson)
4. [Le Dockerfile](#4-le-dockerfile)
5. [Templates par type d\u2019application](#5-templates-par-type-dapplication)
6. [Health Check](#6-health-check)
7. [Stockage et persistance](#7-stockage-et-persistance)
8. [Variables d\u2019environnement](#8-variables-denvironnement)
9. [R\u00e9seau et reverse proxy](#9-r\u00e9seau-et-reverse-proxy)
10. [Style et int\u00e9gration visuelle](#10-style-et-int\u00e9gration-visuelle)
11. [Enregistrer dans le catalogue](#11-enregistrer-dans-le-catalogue)
12. [Checklist avant publication](#12-checklist-avant-publication)
13. [Erreurs courantes et solutions](#13-erreurs-courantes-et-solutions)
14. [Exemple complet fonctionnel](#14-exemple-complet-fonctionnel)

---

## 1. Vue d\u2019ensemble

Une application EZGalaxy est un **container Docker autonome** :

```
D\u00e9veloppeur cr\u00e9e le package
    \u2193
EZGalaxy clone le d\u00e9p\u00f4t GitHub
    \u2193
Build de l\u2019image Docker
    \u2193
D\u00e9marrage du container (port 10000-10999)
    \u2193
Nginx reverse proxy : /p/<slug>/
    \u2193
Health check automatique toutes les 5 min
```

**Principes cl\u00e9s :**
- L\u2019app est **100% autonome** \u2014 elle ne d\u00e9pend pas des services internes d\u2019EZGalaxy.
- Le container doit exposer **un seul port HTTP**.
- Le container doit inclure un **HEALTHCHECK** fonctionnel.
- Pas besoin de g\u00e9rer HTTPS \u2014 Nginx s\u2019en charge.

---

## 2. Structure d\u2019un package

### Fichiers obligatoires

```
mon-app/
\u251c\u2500\u2500 ezcontainer.json      # Manifest Docker (schemaVersion 2)
\u251c\u2500\u2500 Dockerfile             # Instructions de build
\u2514\u2500\u2500 web/                   # Contenu de l\u2019app (ou src/, app/, etc.)
    \u251c\u2500\u2500 index.html
    \u251c\u2500\u2500 style.css
    \u2514\u2500\u2500 app.js
```

### Fichiers optionnels

```
mon-app/
\u251c\u2500\u2500 emoji.txt              # Un seul emoji pour la tuile (d\u00e9faut \uD83D\uDCE6)
\u251c\u2500\u2500 screenshots/           # Captures d\u2019\u00e9cran pour le catalogue
\u2502   \u251c\u2500\u2500 cover.png
\u2502   \u251c\u2500\u2500 1.png
\u2502   \u2514\u2500\u2500 2.png
\u251c\u2500\u2500 assets/                # Ressources statiques
\u2514\u2500\u2500 data/                  # Donn\u00e9es persistantes (ignor\u00e9 au build)
```

> **Important** : le dossier `data/` est automatiquement exclu du build. Il est r\u00e9serv\u00e9 aux volumes Docker.

---

## 3. Le manifest `ezcontainer.json`

C\u2019est le fichier central qui d\u00e9crit votre application \u00e0 EZGalaxy.

### Format minimal

```json
{
  "schemaVersion": 2,
  "id": "com.monnom.monapplication",
  "title": "Mon Application",
  "function": "Description courte en une ligne",
  "version": "1.0.0",
  "author": "VotreNom",
  "docker": {
    "dockerfile": "Dockerfile",
    "port": 80,
    "healthcheck": {
      "endpoint": "/"
    }
  }
}
```

### Format complet

```json
{
  "schemaVersion": 2,
  "id": "com.monnom.monapplication",
  "title": "Mon Application",
  "function": "Description courte en une ligne",
  "description": "Description d\u00e9taill\u00e9e de l\u2019application avec ses fonctionnalit\u00e9s.",
  "version": "1.0.0",
  "createdAt": "2026-02-24",
  "author": "VotreNom",
  "emoji": "\uD83D\uDE80",
  "screenshots": ["screenshots/1.png", "screenshots/2.png"],
  "cover": "screenshots/cover.png",
  "docker": {
    "dockerfile": "Dockerfile",
    "port": 80,
    "env": {
      "NODE_ENV": "production"
    },
    "volumes": ["/app/data"],
    "healthcheck": {
      "endpoint": "/health",
      "interval": 30,
      "timeout": 10,
      "retries": 3
    }
  }
}
```

### R\u00e9f\u00e9rence des champs

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `schemaVersion` | number | \u2705 | Doit \u00eatre `2` |
| `id` | string | \u2705 | Identifiant unique (format reverse-domain : `com.auteur.app`) |
| `title` | string | \u2705 | Titre affich\u00e9 dans le catalogue et sur la tuile |
| `function` | string | \u2705 | Description courte (1 ligne) |
| `description` | string | \u2796 | Description longue (affich\u00e9e dans le d\u00e9tail du catalogue) |
| `version` | string | \u2705 | Version au format semver (`1.0.0`) |
| `createdAt` | string | \u2796 | Date de cr\u00e9ation (`YYYY-MM-DD`) |
| `author` | string | \u2705 | Nom de l\u2019auteur (affich\u00e9 dans le catalogue) |
| `emoji` | string | \u2796 | Emoji pour la tuile (priorit\u00e9 : `emoji.txt` > ce champ) |
| `screenshots` | array | \u2796 | Chemins relatifs des captures d\u2019\u00e9cran |
| `cover` | string | \u2796 | Image de couverture pour le catalogue |
| `docker.dockerfile` | string | \u2705 | Chemin du Dockerfile relatif au dossier du package |
| `docker.port` | number | \u2705 | Port HTTP interne du container |
| `docker.env` | object | \u2796 | Variables d\u2019environnement (cl\u00e9: valeur par d\u00e9faut) |
| `docker.volumes` | array | \u2796 | Points de montage pour la persistance |
| `docker.healthcheck.endpoint` | string | \u2796 | URL du health check (d\u00e9faut `/`) |
| `docker.healthcheck.interval` | number | \u2796 | Intervalle en secondes (d\u00e9faut `30`) |
| `docker.healthcheck.timeout` | number | \u2796 | Timeout en secondes (d\u00e9faut `10`) |
| `docker.healthcheck.retries` | number | \u2796 | Nombre de tentatives (d\u00e9faut `3`) |

### R\u00e8gles de validation

EZGalaxy **refuse l\u2019installation** si :
- `schemaVersion` est absent ou diff\u00e9rent de `2`
- `id`, `title`, `function`, `version` ou `author` sont manquants
- La section `docker` est absente
- `docker.dockerfile` est absent ou le fichier n\u2019existe pas
- `docker.port` est absent ou invalide (doit \u00eatre un entier > 0)

---

## 4. Le Dockerfile

Le Dockerfile est l\u2019instruction de construction de votre container.

### Exigences strictes

1. **`EXPOSE`** : d\u00e9clarer le port HTTP (doit correspondre \u00e0 `docker.port` dans le manifest)
2. **`HEALTHCHECK`** : inclure un health check Docker natif
3. **Port unique** : le container doit \u00e9couter sur un seul port HTTP

### R\u00e8gle critique : `wget` vs `curl` dans le HEALTHCHECK

| Image de base | Outil disponible | Commande HEALTHCHECK |
|---------------|-----------------|---------------------|
| `nginx:alpine` | `wget` \u2705 | `wget -q --spider http://localhost/` |
| `node:*-alpine` | `wget` \u2705 | `wget -q --spider http://localhost:3000/` |
| `python:*-slim` | `curl` \u2705 | `curl -f http://localhost:8000/` |
| `php:*-apache` | `curl` \u2705 | `curl -f http://localhost/` |

> **\u26A0\uFE0F Erreur fr\u00e9quente** : utiliser `curl` dans une image Alpine. Les images Alpine n\u2019incluent PAS `curl` par d\u00e9faut \u2014 utilisez `wget -q --spider` \u00e0 la place, ou installez curl explicitement avec `RUN apk add --no-cache curl`.

EZGalaxy g\u00e9n\u00e8re aussi un healthcheck dans le `docker-compose.yml` qui utilise `wget`. Si votre image n\u2019a pas `wget`, assurez-vous que le HEALTHCHECK dans votre Dockerfile est fonctionnel.

---

## 5. Templates par type d\u2019application

### App statique (HTML/CSS/JS)

```dockerfile
FROM nginx:alpine
COPY web/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1
```

```json
{
  "docker": { "dockerfile": "Dockerfile", "port": 80 }
}
```

### App Node.js (Express, Fastify, etc.)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
```

```json
{
  "docker": { "dockerfile": "Dockerfile", "port": 3000 }
}
```

### App Python (Flask / FastAPI)

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

> `python:3.12-slim` inclut `curl`. Pour Alpine (`python:3.12-alpine`), utilisez `wget`.

```json
{
  "docker": { "dockerfile": "Dockerfile", "port": 8000 }
}
```

### App PHP (Apache)

```dockerfile
FROM php:8.3-apache
COPY web/ /var/www/html/
RUN a2enmod rewrite
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost/ || exit 1
```

```json
{
  "docker": { "dockerfile": "Dockerfile", "port": 80 }
}
```

### App avec persistance (SQLite, fichiers)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN mkdir -p /app/data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
```

```json
{
  "docker": {
    "dockerfile": "Dockerfile",
    "port": 3000,
    "volumes": ["/app/data"]
  }
}
```

---

## 6. Health Check

Le health check permet \u00e0 EZGalaxy de surveiller la sant\u00e9 de votre application.

### Deux niveaux de health check

1. **Dockerfile HEALTHCHECK** : v\u00e9rification native Docker int\u00e9gr\u00e9e dans le container
2. **EZGalaxy HTTP check** : v\u00e9rification p\u00e9riodique via HTTP (toutes les 5 minutes, cron)

### Comportement

- EZGalaxy envoie une requ\u00eate HTTP GET \u00e0 l\u2019endpoint configur\u00e9 (par d\u00e9faut `/`)
- R\u00e9ponse **HTTP 200-399** = \u2705 Healthy
- R\u00e9ponse **HTTP 400+** = \u274C Unhealthy
- Pas de r\u00e9ponse = \u274C Unhealthy

### Bonnes pratiques

```javascript
// Exemple : endpoint /health pour une app Node.js
app.get('/health', (req, res) => {
  // V\u00e9rifier les d\u00e9pendances critiques
  const dbOk = checkDatabaseConnection();
  if (dbOk) {
    res.status(200).json({ status: 'ok' });
  } else {
    res.status(503).json({ status: 'error', detail: 'database unreachable' });
  }
});
```

Pour les apps statiques, l\u2019endpoint `/` (la page d\u2019accueil) suffit.

### Auto-restart

Avec l\u2019option `--auto-restart`, EZGalaxy red\u00e9marre automatiquement les containers d\u00e9tect\u00e9s comme non sains. Cette v\u00e9rification est ex\u00e9cut\u00e9e par le cron job `docker:healthcheck --auto-restart` toutes les 5 minutes.

---

## 7. Stockage et persistance

### Donn\u00e9es \u00e9ph\u00e9m\u00e8res

Par d\u00e9faut, les donn\u00e9es \u00e9crites dans le container sont **perdues** au red\u00e9marrage. Utilisez les volumes Docker pour persister les donn\u00e9es.

### Volumes Docker

EZGalaxy cr\u00e9e automatiquement un volume par d\u00e9faut :
- **Sans volumes d\u00e9clar\u00e9s** : monte `<dir>/data` vers `/app/data` dans le container
- **Avec volumes d\u00e9clar\u00e9s** : monte les chemins sp\u00e9cifi\u00e9s dans `docker.volumes`

Les donn\u00e9es sont stock\u00e9es sur le serveur dans `/var/lib/ezgalaxy_data/containers/<slug>/data/`.

### Exemple avec SQLite

```javascript
// server.js
const path = require('path');
const dbPath = path.join('/app/data', 'database.sqlite');
// \u2192 persist\u00e9 sur le disque du serveur via le volume Docker
```

### Stockage c\u00f4t\u00e9 client

Pour le stockage c\u00f4t\u00e9 navigateur, utilisez directement `localStorage` :

```javascript
// Sauvegarder
localStorage.setItem('ma_cle', JSON.stringify({ score: 42 }));

// Charger
const data = JSON.parse(localStorage.getItem('ma_cle') || 'null');
```

> **Note** : l\u2019ancien SDK `ezgalaxy-sdk.js` \u00e9tait con\u00e7u pour l\u2019architecture iframe (schemaVersion 1) et n\u2019est plus utilis\u00e9 avec les containers Docker. N\u2019essayez pas de le charger.

---

## 8. Variables d\u2019environnement

### Variables auto-inject\u00e9es par EZGalaxy

EZGalaxy injecte automatiquement ces variables dans chaque container :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `EZGALAXY_APP_ID` | Identifiant/slug de l\u2019app | `com-ezgalaxy-example` |
| `EZGALAXY_APP_SLUG` | Slug du container | `com-ezgalaxy-example` |

### Variables personnalis\u00e9es

D\u00e9clarez vos variables dans `ezcontainer.json` :

```json
{
  "docker": {
    "env": {
      "NODE_ENV": "production",
      "LOG_LEVEL": "info",
      "API_KEY": ""
    }
  }
}
```

L\u2019administrateur pourra modifier les valeurs depuis le panneau d\u2019administration.

---

## 9. R\u00e9seau et reverse proxy

### Architecture r\u00e9seau

```
Internet
    \u2193 (HTTPS)
Nginx (reverse proxy)
    \u2193 /p/<slug>/  \u2192  http://127.0.0.1:<port>/
Container Docker
    (port interne: 80, 3000, 8000, etc.)
```

### Ce que cela signifie pour votre app

- Votre app est accessible via `https://<domain>/p/<slug>/`
- Nginx traduit `/p/<slug>/` en `/` dans le container
- L\u2019en-t\u00eate `X-Forwarded-Prefix` contient `/p/<slug>`
- Les WebSockets sont support\u00e9s (upgrade automatique)
- Pas besoin de g\u00e9rer HTTPS dans le container

### Communication inter-containers

Tous les containers sont sur le r\u00e9seau Docker `ezgalaxy_apps`. Ils peuvent communiquer entre eux via leur nom :

```
http://ezgalaxy-<slug>:<port>/
```

### URLs relatives vs absolues

> **\u26A0\uFE0F Important** : dans votre HTML, utilisez des **URLs relatives** pour les assets.

```html
<!-- \u2705 Correct : URL relative -->
<link rel="stylesheet" href="./style.css" />
<script src="./app.js"></script>

<!-- \u274C Incorrect : URL absolue qui cassera derri\u00e8re le proxy -->
<link rel="stylesheet" href="/style.css" />
```

---

## 10. Style et int\u00e9gration visuelle

### Fichier `emoji.txt`

Cr\u00e9ez un fichier `emoji.txt` contenant un seul emoji. Il sera affich\u00e9 sur la tuile du tableau de bord.

```
\uD83C\uDFAE
```

> Si absent, l\u2019emoji par d\u00e9faut est \uD83D\uDCE6 ou celui d\u00e9clar\u00e9 dans `ezcontainer.json`.

### CSS partag\u00e9 EZGalaxy (optionnel)

Vous pouvez copier les fichiers CSS partag\u00e9s dans votre package pour un look coh\u00e9rent :

- `catalog/shared/ezgalaxy-base.css` \u2014 variables CSS, composants de base (`.ez-card`, `.ez-btn`, etc.)
- `catalog/shared/ezgalaxy-animations.css` \u2014 animations (`ezFadeIn`, `ezFloaty`, `ezPop`)

### Palette recommand\u00e9e

```css
:root {
  --ez-bg: #0b0f19;
  --ez-surface: rgba(255, 255, 255, 0.06);
  --ez-border: rgba(255, 255, 255, 0.12);
  --ez-text: #e5e7eb;
  --ez-accent: #6366f1;
  --ez-accent-hover: #4f46e5;
}
```

---

## 11. Enregistrer dans le catalogue

### Ajouter l\u2019entr\u00e9e dans `catalog.json`

```json
{
  "schemaVersion": 2,
  "packages": [
    {
      "id": "com.monnom.monapplication",
      "title": "Mon Application",
      "function": "Description courte",
      "path": "packages/apps/com.monnom.monapplication",
      "version": "1.0.0"
    }
  ]
}
```

### G\u00e9n\u00e9rer le hash (optionnel mais recommand\u00e9)

Le hash permet \u00e0 EZGalaxy de d\u00e9tecter les mises \u00e0 jour :

```bash
node tools/generate_catalog_hashes.mjs
```

Cela met \u00e0 jour automatiquement le champ `hash` dans `catalog.json`.

> **Ne mettez pas un hash vide `""`** \u2014 cela provoque des faux-positifs de mise \u00e0 jour. Soit g\u00e9n\u00e9rez le hash, soit omettez le champ.

### Publication via Pull Request

1. Forkez le d\u00e9p\u00f4t EZGalaxy
2. Cr\u00e9ez votre package dans `catalog/packages/apps/com.monnom.monapplication/`
3. Ajoutez l\u2019entr\u00e9e dans `catalog/catalog.json`
4. Ouvrez une Pull Request

### Source catalogue personnalis\u00e9e

Vous pouvez aussi h\u00e9berger votre propre d\u00e9p\u00f4t catalogue et l\u2019ajouter comme source dans l\u2019administration EZGalaxy.

---

## 12. Checklist avant publication

Avant de soumettre votre package, v\u00e9rifiez chaque point :

### Fichiers

- [ ] `ezcontainer.json` pr\u00e9sent avec `schemaVersion: 2`
- [ ] `Dockerfile` pr\u00e9sent au chemin d\u00e9clar\u00e9 dans `docker.dockerfile`
- [ ] `emoji.txt` contient un seul emoji

### Manifest (`ezcontainer.json`)

- [ ] Champs obligatoires pr\u00e9sents : `id`, `title`, `function`, `version`, `author`
- [ ] Section `docker` pr\u00e9sente
- [ ] `docker.port` correspond au `EXPOSE` du Dockerfile
- [ ] `docker.dockerfile` pointe vers le bon fichier

### Dockerfile

- [ ] `EXPOSE` d\u00e9clar\u00e9 (correspond \u00e0 `docker.port`)
- [ ] `HEALTHCHECK` fonctionnel
- [ ] `wget` utilis\u00e9 pour les images Alpine (**pas** `curl`)
- [ ] Image de base l\u00e9g\u00e8re (pr\u00e9f\u00e9rer `:alpine` ou `:slim`)
- [ ] Build reproductible (pas de `latest` non d\u00e9terministe dans les d\u00e9pendances)

### Application

- [ ] L\u2019app fonctionne sans d\u00e9pendance \u00e0 EZGalaxy
- [ ] URLs relatives pour les assets (pas d\u2019URLs absolues `/style.css`)
- [ ] Aucune r\u00e9f\u00e9rence \u00e0 `ezgalaxy-sdk.js` (obsolete)
- [ ] Aucun fichier `ezpage.json` (format v1 obsol\u00e8te)
- [ ] L\u2019app r\u00e9pond en HTTP 200 sur l\u2019endpoint du health check

### Test local

```bash
# Construire l\u2019image
docker build -t test-mon-app .

# D\u00e9marrer le container
docker run -d -p 8080:80 --name test-mon-app test-mon-app

# V\u00e9rifier le health check
docker inspect --format='{{.State.Health.Status}}' test-mon-app

# Tester l\u2019acc\u00e8s
curl http://localhost:8080/

# V\u00e9rifier les logs
docker logs test-mon-app

# Nettoyer
docker rm -f test-mon-app
```

---

## 13. Erreurs courantes et solutions

### \u274C Le container est `unhealthy` en permanence

**Cause** : la commande `HEALTHCHECK` \u00e9choue.

**Solution** : v\u00e9rifiez que l\u2019outil (`curl` ou `wget`) existe dans votre image.

```dockerfile
# Image Alpine \u2192 wget (inclus par d\u00e9faut)
HEALTHCHECK CMD wget -q --spider http://localhost/ || exit 1

# Image Debian/Ubuntu \u2192 curl (inclus par d\u00e9faut)
HEALTHCHECK CMD curl -f http://localhost/ || exit 1

# Image Alpine + curl \u2192 installer curl
RUN apk add --no-cache curl
HEALTHCHECK CMD curl -f http://localhost/ || exit 1
```

### \u274C L\u2019app retourne une page blanche ou 404 dans l\u2019iframe

**Cause** : le port d\u00e9clar\u00e9 dans `ezcontainer.json` ne correspond pas au port \u00e9cout\u00e9 par l\u2019app.

**Solution** : v\u00e9rifiez que `docker.port` dans le manifest = `EXPOSE` dans le Dockerfile = port \u00e9cout\u00e9 par votre serveur.

### \u274C Erreur de validation \u00e0 l\u2019installation

**Cause** : champ requis manquant dans `ezcontainer.json`.

**Solution** : v\u00e9rifiez que tous les champs obligatoires sont pr\u00e9sents (`id`, `title`, `function`, `version`, `author`, `docker`, `docker.dockerfile`, `docker.port`).

### \u274C Les assets (CSS, JS, images) ne se chargent pas

**Cause** : utilisation d\u2019URLs absolues (`/style.css`) au lieu de relatives (`./style.css`).

**Solution** : le reverse proxy sert l\u2019app sous `/p/<slug>/`. Une URL absolue `/style.css` pointe vers la racine du domaine, pas vers votre container.

```html
<!-- Toujours utiliser des chemins relatifs -->
<link rel="stylesheet" href="./style.css" />
<script src="./app.js"></script>
<img src="./images/logo.png" />
```

### \u274C Faux-positifs de mise \u00e0 jour disponible

**Cause** : le champ `hash` est vide (`""`) dans `catalog.json`.

**Solution** : soit g\u00e9n\u00e9rez le hash avec `node tools/generate_catalog_hashes.mjs`, soit supprimez le champ `hash` enti\u00e8rement.

### \u274C Le stockage est perdu au red\u00e9marrage

**Cause** : les donn\u00e9es sont \u00e9crites dans le filesystem du container sans volume.

**Solution** : d\u00e9clarez un volume dans `ezcontainer.json` et \u00e9crivez dans ce dossier :

```json
{ "docker": { "volumes": ["/app/data"] } }
```

### \u274C L\u2019app ne d\u00e9marre pas (erreur de build)

**Diagnostic** : consultez les logs dans **Administration \u2192 Docker \u2192 Logs**.

**Causes fr\u00e9quentes** :
- D\u00e9pendances non install\u00e9es (`npm ci` \u00e9choue)
- Port d\u00e9j\u00e0 utilis\u00e9
- Permissions insuffisantes sur les fichiers
- Image de base indisponible

---

## 14. Exemple complet fonctionnel

Voici un package complet et fonctionnel que vous pouvez utiliser comme base.

### `ezcontainer.json`

```json
{
  "schemaVersion": 2,
  "id": "com.ezgalaxy.example",
  "title": "Exemple",
  "author": "EZGalaxy",
  "description": "Application de d\u00e9monstration pour le catalogue EZGalaxy.",
  "function": "Application de d\u00e9monstration Docker",
  "version": "1.0.0",
  "emoji": "\uD83C\uDFAF",
  "docker": {
    "dockerfile": "Dockerfile",
    "port": 80,
    "env": {},
    "volumes": [],
    "healthcheck": {
      "endpoint": "/",
      "interval": 30
    }
  }
}
```

### `Dockerfile`

```dockerfile
FROM nginx:alpine
COPY web/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1
```

### `emoji.txt`

```
\uD83C\uDFAF
```

### `web/index.html`

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mon Application EZGalaxy</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <div id="app">Chargement\u2026</div>
    <script src="./app.js"></script>
  </body>
</html>
```

> **\u26A0\uFE0F** Notez l\u2019absence de `<script src="/api/ezgalaxy-sdk.js">` \u2014 le SDK n\u2019est plus utilis\u00e9 pour les containers Docker.

### `web/style.css`

```css
html, body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
}

body {
  background: #0b0f19;
  color: #e5e7eb;
}

#app {
  padding: 16px;
  max-width: 700px;
  margin: 0 auto;
}

.card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 20px;
}

button {
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}

button:hover {
  background: #4f46e5;
}

pre {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 10px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
}
```

### `web/app.js`

```javascript
(function main() {
  var root = document.getElementById('app');
  var STORAGE_KEY = 'myapp_data';

  root.innerHTML =
    '<div class="card">' +
      '<h1>Mon Application</h1>' +
      '<p>Hello EZGalaxy !</p>' +
      '<button id="btn-test">Tester</button>' +
      '<pre id="output"></pre>' +
    '</div>';

  document.getElementById('btn-test').addEventListener('click', function () {
    document.getElementById('output').textContent =
      'OK ! Date: ' + new Date().toLocaleString('fr-FR');
  });
})();
```

### `catalog.json` (entr\u00e9e)

```json
{
  "id": "com.ezgalaxy.example",
  "title": "Exemple",
  "function": "Application de d\u00e9monstration Docker",
  "path": "packages/apps/com.ezgalaxy.example",
  "version": "1.0.0"
}
```

---

## R\u00e9sum\u00e9

| \u00c9tape | Action |
|--------|--------|
| 1 | Cr\u00e9er `ezcontainer.json` avec tous les champs requis |
| 2 | \u00c9crire un `Dockerfile` avec `EXPOSE` + `HEALTHCHECK` |
| 3 | D\u00e9velopper l\u2019app (URLs relatives, pas de SDK) |
| 4 | Tester localement avec `docker build` + `docker run` |
| 5 | Ajouter l\u2019entr\u00e9e dans `catalog.json` |
| 6 | (Optionnel) G\u00e9n\u00e9rer le hash avec `generate_catalog_hashes.mjs` |
| 7 | Soumettre une Pull Request |

Pour toute question, consultez :
- [CATALOG_STANDARD.md](../CATALOG_STANDARD.md) \u2014 sp\u00e9cification technique compl\u00e8te
- [AI_GUIDE.md](AI_GUIDE.md) \u2014 guide pour g\u00e9n\u00e9rer des apps avec l\u2019IA
- [README.md](README.md) \u2014 vue d\u2019ensemble du syst\u00e8me catalogue
