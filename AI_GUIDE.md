# Guide IA (Catalogue EZGalaxy)

Ce document est destiné aux outils IA (Copilot/ChatGPT/etc.) pour générer des pages **compatibles** avec le catalogue EZGalaxy.

## Contexte technique (important)

- Une page de catalogue est un **package statique** (HTML/CSS/JS) installé depuis GitHub.
- EZGalaxy sert ensuite les fichiers installés via une URL de type `/api/ezpages/<mount>/<path>`.
- La page est rendue dans une iframe **sandbox** (sécurité). Certaines API/accès peuvent être limités.
- La politique CSP côté EZGalaxy peut **bloquer les appels réseau sortants** (sauf si explicitement autorisés par le manifest).

## Ce que l’IA doit produire (minimum)

1) Une entrée dans `catalog.json` :
- `id`, `title`, `function`, `path`, `version`.
- `platform` (optionnel) : `"web"`, `"android"`, `"ios"`, `"mobile"`, `"all"`, ou un tableau.

2) Un dossier `packages/apps/<id>/` contenant :
 - `ezpage.json`
- `web/index.html` (ou autre `entry`) — requis pour les apps web, optionnel pour les apps mobile-only.

3) Optionnel : `web/app.js`, `web/style.css`, `screenshots/*`, `assets/*`.

4) Pour les apps mobiles : un dossier `mobile/` avec un `README.md` d'intégration et un `config.json` optionnel.

## Contraintes de sécurité à respecter

- `entry` doit être un chemin relatif (ex: `web/index.html`).
- Ne pas utiliser de chemins absolus (`/foo`) ni de `..`.
- Par défaut, ne pas faire d’appels réseau sortants.
  - Si nécessaire, activer `network.allowOutgoing: true` dans `ezpage.json`.

## Style & animations “look EZGalaxy”

EZGalaxy utilise un style “dark + cards”.

Le dossier `shared/` dans le template contient :
- `shared/ezgalaxy-base.css`
- `shared/ezgalaxy-animations.css`

 Important : à l’installation, EZGalaxy télécharge **uniquement** le dossier pointé par `packages[].path`.
 Donc aucune dépendance vers un `shared/` externe au package n’est possible/attendue.
 Si vous souhaitez utiliser des styles partagés, copiez-les dans `packages/apps/<id>/web/` (ou équivalent) et référencez-les depuis `entry`.

## Base de données (BDD) : point crucial

Si une page “catalogue” a besoin de persistance serveur (BDD), il faut éviter 2 pièges :

1) **Ne pas modifier les tables internes d’EZGalaxy**
- Pas de colonnes ajoutées “au hasard” dans `pages`, `tiles`, etc.
- Pas de migrations SQL arbitraires fournies par le package.

2) **Isoler les données par page**
- Recommandation : une table dédiée par package (ou un préfixe), ex:
  - `ezpkg_<packageId>_<table>`
- Le package doit être pensé pour :
  - installation (table inexistante)
  - update (table déjà là, données à préserver)
  - uninstall (selon choix admin: supprimer la table ou conserver)

### État actuel

Le catalogue actuel d’EZGalaxy installe principalement des fichiers statiques.
La création automatique de tables BDD **n’est pas activée par défaut** dans ce template.

### Recommandation (approche sûre)

- Si vous avez besoin d’une BDD :
  1) Côté web : utilisez le SDK EZGalaxy (`ezgalaxy.storage.*` et `ezgalaxy.app.*`) via le script `<script src="/api/ezgalaxy-sdk.js"></script>`.
  2) Côté mobile (Android/iOS) : utilisez le même SDK configuré en mode HTTP avec `ezgalaxy.configureMobile()`, ou appelez directement l'API REST `/api/mobile/...`.
  3) Les deux modes utilisent la même base de données (table `app_storage`), les données sont partagées entre web et mobile pour un même extension_id.
  4) Ne jamais casser le schéma en update (préférer migrations additives).

## Applications mobiles (Android / iOS)

Le catalogue EZGalaxy supporte les applications mobiles. Elles utilisent la même infrastructure de stockage que les apps web.

### Différences clés web vs mobile

| Aspect | Web | Mobile (Android/iOS) |
|--------|-----|---------------------|
| Transport | iframe postMessage | HTTP direct (fetch/axios) |
| Auth | Automatique (bridge) | Clé API (`X-App-Key`) + UUID appareil |
| Endpoint | `/api/app-storage/...` | `/api/mobile/...` |
| SDK | `<script src="/api/ezgalaxy-sdk.js">` | `ezgalaxy.configureMobile({...})` |
| Données | isolées par visiteur/user | isolées par device UUID |
| Accès BDD | Même table `app_storage` | Même table `app_storage` |

### Exemple d'intégration mobile (React Native)

```js
import './ezgalaxy-sdk.js'; // ou copier le fichier dans le projet

ezgalaxy.configureMobile({
  serverUrl: 'https://mon-serveur-ezgalaxy.com',
  appKey: 'ezm_xxxxxxxxxxxx',
  deviceUuid: getDeviceUUID(), // UUID stable de l'appareil
  extensionId: 'com.ezgalaxy.my-app',
  platform: 'android'
});

// Même API que le web :
await ezgalaxy.storage.set('scores', 'level-1', { score: 100 });
await ezgalaxy.app.set('leaderboard', 'player-1', { score: 500 });
```

### Exemple d'intégration mobile (API REST directe)

Si vous préférez appeler l'API REST directement (Kotlin/Swift/Dart) :

```
PUT /api/mobile/com.ezgalaxy.my-app/scores/level-1
Headers:
  X-App-Key: ezm_xxxxxxxxxxxx
  X-Device-UUID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  Content-Type: application/json
Body:
  { "data": { "score": 100 } }
```

### Prompt IA pour app mobile

« Génère un package EZGalaxy catalogue nommé <TITLE> avec support mobile.
- id: <id> (a-z0-9-)
- platform: ["web", "android", "ios"]
- entry: web/index.html (pour la version web)
- mobile.android.packageName: com.ezgalaxy.<id>
- mobile.ios.bundleId: com.ezgalaxy.<id>
- utilise le SDK EZGalaxy en mode mobile pour la persistance
- l'app sauvegarde des données partagées via ezgalaxy.app.*
- mets à jour catalog.json avec platform. »

### Variables / updates (à ne pas casser)

- Ne pas dépendre de variables d’environnement non documentées.
- Ne pas supposer que `APP_KEY` change (il doit rester stable sur update).
- Prévoir une stratégie de version :
  - `ezpage.json.version` : version du package
  - migrations : idempotentes / non destructives

## Prompt IA (exemple)

« Génère un package EZGalaxy catalogue nommé <TITLE>.
- id: <id> (a-z0-9-)
- entry: web/index.html
- platform: "web" (ou ["web", "android", "ios"] pour multi-plateforme)
- style: utilise ezgalaxy-base.css et ezgalaxy-animations.css (copiés dans web/)
- network.allowOutgoing: false
- ajoute le SDK EZGalaxy pour la persistance : `<script src="/api/ezgalaxy-sdk.js"></script>`
- utilise `ezgalaxy.storage.set/get/list` pour sauvegarder des données
- ajoute une page simple avec un bouton et un bloc de log.
- mets à jour catalog.json avec path=packages/apps/<id>. »
