
# Catalogue EZGalaxy — Applications Docker

Ce dossier contient le format attendu par EZGalaxy pour lister et installer des **applications Docker** depuis GitHub.

Le standard complet est dans [`CATALOG_STANDARD.md`](../CATALOG_STANDARD.md) (à la racine du repo EZGalaxy).

## Architecture

Chaque application du catalogue est un **container Docker** indépendant :
- EZGalaxy télécharge le Dockerfile depuis GitHub
- Construit l'image Docker localement
- Démarre le container sur un port dédié (plage 10000-10999)
- Configure Nginx en reverse proxy pour servir l'app sous `/p/{slug}/`
- Surveille la santé du container via des health checks automatiques

## 1) Ajouter une app au dépôt officiel (Pull Request)

Objectif : proposer une nouvelle application Docker pour le catalogue officiel.

Étapes :
1. Fork le dépôt officiel `Ezoxe/EZGalaxy-catalog`.
2. Crée un dossier d'app : `packages/apps/<id>/`.
3. Ajoute le manifest : `packages/apps/<id>/ezcontainer.json`.
4. Ajoute le `Dockerfile` et les fichiers nécessaires au build.
5. Déclare ton package dans `catalog.json` (racine) en ajoutant une entrée dans `packages[]`.
6. Ouvre une Pull Request.

Rappels :
- `<id>` doit être stable et unique (format : `a-z0-9-` ou reverse-domain `com.example.app`).
- Le `Dockerfile` doit exposer un seul port HTTP.
- Ajoute un `HEALTHCHECK` dans le Dockerfile pour le monitoring automatique.

## 2) Structure d'un package Docker

```
packages/apps/<id>/
  ezcontainer.json       # manifest (schemaVersion 2)
  Dockerfile             # instructions de build Docker
  emoji.txt              # optionnel — emoji pour la tuile (défaut 📦)
  web/                   # fichiers de l'app (copiés dans le container)
    index.html
    style.css
    app.js
  config/                # optionnel — fichiers de config
  screens/               # optionnel — screenshots
    1.png
```

## 3) Fichier `ezcontainer.json` (manifest)

Format minimal :
```json
{
  "schemaVersion": 2,
  "id": "com.ezgalaxy.my-app",
  "title": "Mon Application",
  "function": "Description courte de l'app",
  "version": "1.0.0",
  "createdAt": "2026-02-22",
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

Champs Docker :
- `docker.dockerfile` (string, requis) : chemin du Dockerfile relatif au dossier du package.
- `docker.port` (number, requis) : port HTTP exposé par le container.
- `docker.env` (object, optionnel) : variables d'environnement à passer au container.
- `docker.volumes` (array, optionnel) : points de montage pour la persistance des données.
- `docker.healthcheck.endpoint` (string) : endpoint HTTP pour le health check (défaut `/`).
- `docker.healthcheck.interval` (number) : intervalle en secondes (défaut 30).
- `docker.healthcheck.timeout` (number) : timeout en secondes (défaut 10).

## 4) Fichier `catalog.json`

```json
{
  "schemaVersion": 2,
  "packages": [
    {
      "id": "com.ezgalaxy.my-app",
      "title": "Mon Application",
      "function": "Description courte",
      "path": "packages/apps/com.ezgalaxy.my-app",
      "version": "1.0.0",
      "hash": "<sha256>"
    }
  ]
}
```

> **Important** : `schemaVersion` doit être `2` pour les catalogues Docker.

## 5) Créer son propre dépôt (catalogue custom)

Structure minimale du dépôt :
```
catalog.json
packages/
  apps/
    <id>/
      ezcontainer.json
      Dockerfile
      emoji.txt            # optionnel
      web/
        index.html
```

Configuration dans EZGalaxy :
1. Admin → Catalogue → Paramètres (roue dentée).
2. Ajoute un dépôt : `owner`, `repo`, `ref` (branche), `catalog_path`.
3. Pour les dépôts privés : configure un token GitHub (PAT) ou une GitHub App.

## 6) Cycle de vie d'une app

| Action | Ce qui se passe |
|--------|----------------|
| **Installer** | Clone le repo → Build l'image Docker → Démarre le container → Configure Nginx → Health check |
| **Mettre à jour** | Stop le container → Rebuild l'image → Redémarre → Vérifie la santé |
| **Désinstaller** | Stop le container → Supprime l'image → Supprime la config Nginx → Nettoie les données |

## 7) Persistance des données

Chaque container dispose d'un volume de données persistant :
```
/var/lib/ezgalaxy_data/containers/<slug>/data/
```

Pour utiliser la persistance, déclarez un volume dans `ezcontainer.json` :
```json
{
  "docker": {
    "volumes": ["/app/data"]
  }
}
```
EZGalaxy montera automatiquement le dossier persistant vers le chemin déclaré dans le container.

## 8) Réseau

Tous les containers sont connectés au réseau Docker `ezgalaxy_apps`.
Nginx sert de reverse proxy : chaque app est accessible via `/p/<slug>/`.

Les apps **n'ont pas besoin** de gérer HTTPS — Nginx s'en charge.

## Guides supplémentaires

- [`AI_GUIDE.md`](AI_GUIDE.md) — Guide pour générer des apps Docker via IA.
- [`../CATALOG_STANDARD.md`](../CATALOG_STANDARD.md) — Standard technique complet.