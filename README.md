# Dépôt catalogue (template)

Ce dossier `catalog/` est une **base prête à copier** pour créer un dépôt GitHub compatible avec le **Catalogue EZGalaxy**.

Objectif : publier des pages (packages) standardisées, installables depuis l’interface admin (installer / mettre à jour / désinstaller).

## 1) Ce que doit contenir le dépôt

Le dépôt doit contenir au minimum :

- `catalog.json` : l’index du dépôt (liste des packages)
- `packages/<packageId>/ezpage.json` : le manifest de chaque package
- `packages/<packageId>/<entry>` : la page d’entrée (souvent un HTML)

Structure recommandée (celle fournie ici) :

```
catalog.json
packages/
   com.ezgalaxy.example/
      ezpage.json
      web/
         index.html
         app.js
         style.css
      assets/
      screenshots/
```

## 2) `catalog.json`

`catalog.json` liste tous les packages affichés dans le catalogue (vue liste).

Exemple :

```json
{
   "schemaVersion": 1,
   "packages": [
      {
         "id": "com.ezgalaxy.example",
         "title": "Exemple",
         "function": "Page de démonstration pour dépôts custom",
         "path": "packages/com.ezgalaxy.example",
         "version": "1.0.0"
      }
   ]
}
```

Champs :
- `schemaVersion` : version du schéma
- `packages[]` : liste des packages
   - `id` : identifiant unique (attendu: `a-z0-9-` côté validation EZPage)
   - `title` : titre affiché
   - `function` : description courte
   - `path` : chemin du dossier du package dans le dépôt
   - `version` : optionnel (info rapide)

## 3) `ezpage.json` (manifest du package)

Chaque package doit contenir un fichier `ezpage.json`.

Exemple minimal :

```json
{
   "schemaVersion": 1,
   "id": "com.ezgalaxy.example",
   "title": "Exemple",
   "function": "Page de démonstration pour dépôts custom",
   "version": "1.0.0",
   "createdAt": "2025-12-22",
   "author": "EZGalaxy",
   "entry": "web/index.html",
   "screenshots": [],
   "network": { "allowOutgoing": true }
}
```

Notes :
- `entry` doit être un **chemin relatif** (pas de `/`, pas de `..`).
- `network.allowOutgoing` :
   - `false` (par défaut) → appels sortants bloqués par la CSP
   - `true` → appels sortants autorisés (connect-src https:)

## 4) Screenshots

Les screenshots sont optionnels mais recommandés.

Pour les activer :
- ajoute des images dans `packages/<id>/screenshots/`
- référence-les dans `ezpage.json` :

```json
"screenshots": ["screenshots/1.png", "screenshots/2.png"]
```

## 5) Comment utiliser ce template pour un dépôt custom

1. Crée un nouveau dépôt GitHub (ex: `EZGalaxy-catalog`).
2. Copie le contenu de ce dossier `catalog/` à la racine de ton dépôt.
3. Dans EZGalaxy (admin) → **Catalogue** → **Dépôts catalogue**, ajoute une source :
    - `owner` : ton owner GitHub
    - `repo` : le nom du dépôt
    - `ref` : `main` (ou une autre branche)
    - `catalog_path` : `catalog.json`
4. Si le dépôt est privé : dans **Configuration GitHub**, configure un token (PAT).

## 6) Référence du standard

Le standard complet (règles + champs) est décrit dans `CATALOG_STANDARD.md` dans le dépôt principal EZGalaxy.
