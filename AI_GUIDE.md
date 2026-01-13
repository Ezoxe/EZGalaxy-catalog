# Guide IA (Catalogue EZGalaxy)

Ce document est destiné aux outils IA (Copilot/ChatGPT/etc.) pour générer des **applications** compatibles avec le catalogue EZGalaxy.

Le principe fondamental du catalogue : chaque application est un **package statique** (HTML/CSS/JS) installé depuis GitHub et exécuté en environnement contraint.

## Règles strictes (hard rules)

Une PR / génération IA est considérée **non conforme** si l’un de ces points est violé.

- Une application doit vivre sous `packages/apps/<id>/`.
- Une application doit être **100% autonome** : à l’exécution, elle ne doit charger **que** des fichiers présents dans son propre dossier `packages/apps/<id>/`.
- Interdit en runtime : toute référence vers `shared/` (racine du repo) ou vers un autre package.
- `ezpage.json.entry` doit être un chemin **relatif** dans le package (ex: `web/index.html`) et ne doit contenir **ni** `/` au début, **ni** `..`.
- Interdit : scripts/styles via CDN, import dynamique de code depuis Internet, `eval`.
- Réseau sortant : **désactivé par défaut**. Si activé, l’application doit déclarer précisément ses droits supplémentaires (voir “Fichier d’autorisation”).

## Contexte runtime (important)

- EZGalaxy sert les fichiers via une URL du type `/api/ezpages/<mount>/<path>`.
- La page est rendue dans une iframe **sandbox** (sécurité). Certaines API navigateur peuvent être limitées.
- La politique CSP côté EZGalaxy peut bloquer : scripts externes, connexions sortantes, etc.

## Structure du dépôt (standard)

- Applications (installables) : `packages/apps/<id>/...`
- Standards (source canonique à copier) : `shared/`
  - `shared/ezgalaxy-base.css`
  - `shared/ezgalaxy-animations.css`

Important : à l’installation, EZGalaxy télécharge **uniquement** le dossier du package.
Donc `shared/` n’est **jamais** accessible en runtime par une application ; il sert uniquement de **source** à copier.

## Ce que l’IA doit produire (minimum)

1) Une entrée dans `catalog.json` :
- `id`, `title`, `function`, `path`, `version`

2) Un dossier `packages/apps/<id>/` contenant :
- `ezpage.json`
- `web/index.html` (ou autre `entry`)

3) Un fichier d’autorisation (toujours présent) :
- `packages/apps/<id>/web/ezgalaxy-authorization.json`

4) Optionnel : `web/app.js`, `web/style.css`, `web/assets/*`, `web/vendor/*`, `screenshots/*`.

## Règles `catalog.json`

- `packages[].path` doit être **exactement** `packages/apps/<id>`.
- `version` doit être stable (recommandé : SemVer `MAJOR.MINOR.PATCH`).
- Ne jamais inventer/“deviner” un `hash`. S’il existe, il est produit par la chaîne de release/outillage.

## Règles de chemins (entry + assets)

- `ezpage.json.entry` :
  - doit être relatif (ex: `web/index.html`)
  - interdit : préfixe `/`, présence de `..`

- Dans HTML/CSS/JS (assets) :
  - utiliser des chemins locaux (ex: `./style.css`, `./assets/logo.png`, `./vendor/lib.js`)
  - interdit : `/shared/...`, `../..` pour sortir du dossier app, et références vers un autre package

Note : certains vendors (ES modules) peuvent contenir des `../` *internes à `web/vendor/`* ; c’est acceptable tant que cela reste **strictement dans le dossier de l’app**.

## Style & animations “look EZGalaxy” (copie locale)

Si l’application veut le style EZGalaxy (“dark + cards”), elle doit copier les fichiers depuis `shared/` vers `packages/apps/<id>/web/` (ou `web/vendor/ezgalaxy/`) puis les référencer localement.

## Fichier d’autorisation (traçabilité des droits)

But : si une application a besoin d’une fonctionnalité plus “libre” (réseau sortant, usage d’API, embeds externes, etc.), elle doit le déclarer dans un fichier **reviewable**, lisible par l’app, afin de tracer précisément les droits accordés.

- Chemin : `packages/apps/<id>/web/ezgalaxy-authorization.json`
- L’application doit le charger au démarrage (au minimum : log des capacités activées).

Règle stricte : si `ezpage.json.network.allowOutgoing = true`, alors :
- `ezgalaxy-authorization.json` doit contenir une capacité `network.outgoing` avec `enabled: true`
- la liste des domaines/origins autorisés doit être explicite
- une justification doit être fournie (quoi, pourquoi, quelles données sortent)

Capacités recommandées à déclarer (liste non exhaustive) :
- `network.outgoing` (origins, websockets, types de données)
- `communityDataApi` (collections utilisées, types de données stockées)
- `externalEmbeds` (origins autorisées pour iframes/liens)
- `clipboard` (lecture/écriture)
- `downloads` (export de fichiers)

## Réseau (policy)

- Par défaut : `network.allowOutgoing: false`.
- Si du réseau est nécessaire, préférer les endpoints same-origin d’EZGalaxy (ex: Community Data API) plutôt que des services tiers.
- Si réseau sortant activé : documenter précisément et limiter la surface (origins strictes, pas de CDN).

## Persistance / “BDD”

Préférence stricte (du plus sûr au plus “libre”) :
1) Pas de persistance serveur (stateless)
2) Stockage via Community Data API (voir `COMMUNITY_DATA_API.md`)
3) API backend dédiée versionnée côté EZGalaxy (uniquement si approuvé)

Interdit : modifier les tables internes d’EZGalaxy (`pages`, `tiles`, etc.) ou fournir des migrations SQL arbitraires depuis un package catalogue.

## Checklists

### Checklist génération (IA)

- Dossier : `packages/apps/<id>/` existe, avec `ezpage.json` + fichier `entry` présent.
- `catalog.json` contient une entrée avec `path: packages/apps/<id>`.
- `web/` ne référence pas `shared/` ni d’autres packages.
- Le fichier `web/ezgalaxy-authorization.json` est présent et cohérent avec les droits demandés.

### Checklist review (PR)

- Recherche de références interdites : `/shared/`, `../shared`, `packages/apps/<autreId>`.
- Pas de CDN/import externe (scripts/styles) sans autorisation explicite.
- Si `allowOutgoing=true` : origins + justification présentes et minimales.
- La page charge sans erreurs console, et sans 404 d’assets (CSS/JS/fonts/vendor).

## Prompt IA (exemple)

« Génère une application EZGalaxy catalogue nommée <TITLE>.
- id: <id> (stable, unique)
- structure: packages/apps/<id>/ezpage.json + web/index.html
- entry: web/index.html (chemin relatif, pas de `..`, pas de `/`)
- style: copie ezgalaxy-base.css + ezgalaxy-animations.css depuis shared/ vers web/ et référence localement
- ajoute web/ezgalaxy-authorization.json (capabilities déclarées, par défaut aucune)
- network.allowOutgoing: false (sauf justification + déclaration network.outgoing dans authorization)
- mets à jour catalog.json avec path=packages/apps/<id> et version SemVer. »
