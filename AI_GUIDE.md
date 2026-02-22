# Guide IA — Applications Docker (Catalogue EZGalaxy)

Ce document est destiné aux outils IA (Copilot/ChatGPT/etc.) pour générer des applications **Docker compatibles** avec le catalogue EZGalaxy.

## Contexte technique (important)

- Une application du catalogue est un **container Docker** construit depuis un Dockerfile hébergé sur GitHub.
- EZGalaxy clone le dépôt, build l'image, démarre le container, et le sert via un **reverse proxy Nginx** sous `/apps/<slug>/`.
- Chaque container tourne sur un port dédié (plage 10000-10999) sur le réseau Docker `ezgalaxy_apps`.
- Le container doit exposer un seul **port HTTP** et inclure un **HEALTHCHECK**.

## Ce que l'IA doit produire (minimum)

### 1) Une entrée dans `catalog.json` :

```json
{
  "schemaVersion": 2,
  "packages": [
    {
      "id": "<id>",
      "title": "<Titre>",
      "function": "<Description courte>",
      "path": "packages/apps/<id>",
      "version": "1.0.0"
    }
  ]
}
```

### 2) Un dossier `packages/apps/<id>/` contenant :

#### `ezcontainer.json` (manifest, obligatoire)

```json
{
  "schemaVersion": 2,
  "id": "<id>",
  "title": "<Titre>",
  "function": "<Description courte>",
  "version": "1.0.0",
  "createdAt": "2026-02-22",
  "author": "<Auteur>",
  "docker": {
    "dockerfile": "Dockerfile",
    "port": 80,
    "env": {},
    "volumes": [],
    "healthcheck": {
      "endpoint": "/",
      "interval": 30,
      "timeout": 10
    }
  }
}
```

#### `Dockerfile` (obligatoire)

```dockerfile
FROM nginx:alpine
COPY web/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost/ || exit 1
```

#### `web/index.html` (contenu de l'app)

Le HTML/CSS/JS de l'application.

### 3) Optionnel :

- `emoji.txt` — un seul emoji pour la tuile (défaut `📦`)
- `screens/` — screenshots pour le catalogue
- `config/` — fichiers de configuration

## Templates Dockerfile par type d'app

### App statique (HTML/CSS/JS)

```dockerfile
FROM nginx:alpine
COPY web/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost/ || exit 1
```

### App Node.js

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
```

Pour une app Node.js, utiliser le port 3000 dans `ezcontainer.json` :
```json
{ "docker": { "port": 3000 } }
```

### App Python (Flask/FastAPI)

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

### App PHP

```dockerfile
FROM php:8.3-apache
COPY web/ /var/www/html/
RUN a2enmod rewrite
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost/ || exit 1
```

### App avec base de données (SQLite)

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
# Le dossier /app/data sera monté comme volume persistant
RUN mkdir -p /app/data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
```

Avec persistance dans `ezcontainer.json` :
```json
{
  "docker": {
    "port": 3000,
    "volumes": ["/app/data"]
  }
}
```

## Contraintes à respecter

### Obligatoire
- Le container doit écouter sur un **seul port HTTP**.
- Le Dockerfile doit inclure un `HEALTHCHECK`.
- L'app doit répondre sur `/` ou sur le `healthcheck.endpoint` déclaré.
- Le manifest doit avoir `schemaVersion: 2`.

### Interdit
- Ne pas utiliser de ports non-HTTP (WebSocket seul, TCP brut).
- Ne pas dépendre de services externes non documentés.
- Ne pas stocker des données dans le container sans volume (elles seraient perdues au redémarrage).
- Ne pas utiliser `ENTRYPOINT` avec des scripts complexes qui empêchent le health check.

### Bonnes pratiques
- Utiliser des images Alpine pour réduire la taille.
- Exécuter le processus en tant qu'utilisateur non-root quand possible.
- Utiliser des multi-stage builds pour les apps compilées.
- Déclarer les volumes pour toute donnée persistante.
- Garder le `Dockerfile` simple et reproductible.

## Variables d'environnement

Les variables déclarées dans `docker.env` sont passées au container :

```json
{
  "docker": {
    "env": {
      "NODE_ENV": "production",
      "DB_PATH": "/app/data/database.sqlite"
    }
  }
}
```

EZGalaxy ajoute automatiquement :
- `EZGALAXY_APP_ID` — l'identifiant de l'app
- `EZGALAXY_APP_SLUG` — le slug du container

## Persistance des données

EZGalaxy monte automatiquement un dossier persistant pour chaque container :
```
/var/lib/ezgalaxy_data/containers/<slug>/data/ → <volume_path_in_container>
```

Les données dans ce dossier survivent aux mises à jour et redémarrages.
Elles sont supprimées uniquement lors de la désinstallation.

## Réseau

- Tous les containers sont sur le réseau Docker `ezgalaxy_apps`.
- Les containers peuvent communiquer entre eux via leur nom (`ezgalaxy-<slug>`).
- Nginx sert de reverse proxy : l'app est accessible via `https://<domain>/apps/<slug>/`.
- **Pas besoin de gérer HTTPS** dans le container — Nginx s'en charge.

## Prompt IA (exemple)

« Génère un package Docker EZGalaxy nommé <TITRE>.
- id: <id> (a-z0-9- ou reverse-domain)
- Dockerfile basé sur nginx:alpine (app statique) / node:20-alpine (app Node.js)
- docker.port: 80 (ou 3000 pour Node.js)
- inclure un HEALTHCHECK dans le Dockerfile
- créer ezcontainer.json avec schemaVersion 2
- créer une app web simple avec un titre et du contenu interactif
- mettre à jour catalog.json avec path=packages/apps/<id>
- si l'app a besoin de persistance, déclarer volumes: ["/app/data"] »

## Prompt IA — App complète avec backend

« Génère un package Docker EZGalaxy nommé <TITRE> avec un backend Node.js.
- id: <id>
- Dockerfile multi-stage: build React frontend + serve via Express
- docker.port: 3000
- docker.env: { "NODE_ENV": "production", "DB_PATH": "/app/data/db.sqlite" }
- docker.volumes: ["/app/data"]
- healthcheck.endpoint: "/api/health"
- l'app expose une API REST et un frontend SPA
- mettre à jour catalog.json »