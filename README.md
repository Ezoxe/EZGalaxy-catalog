# Catalogue EZGalaxy (guide rapide)

Ce dossier montre le format attendu par EZGalaxy pour lister et installer des pages via GitHub.

Le standard complet est dans [`CATALOG_STANDARD.md`](../CATALOG_STANDARD.md) (à la racine du repo EZGalaxy).

## 1) Ajouter une page dans le dépôt officiel `EZGalaxy-catalog` (Pull Request)

Objectif : proposer une nouvelle page pour qu’elle apparaisse dans le catalogue officiel.

Étapes :
1. Fork le dépôt officiel `Ezoxe/EZGalaxy-catalog`.
2. Crée un dossier d’app : `packages/apps/<id>/`.
3. Ajoute le manifest : `packages/apps/<id>/ezpage.json`.
4. Ajoute les fichiers web (minimum) : `packages/apps/<id>/web/index.html` (+ JS/CSS si besoin).
5. Déclare ton package dans `catalog.json` (à la racine) en ajoutant une entrée dans `packages[]`.
6. Ouvre une Pull Request.

Rappels :
- `<id>` doit être stable et unique (conseillé : `a-z0-9-`).
- `entry` doit être un chemin relatif (ex: `web/index.html`, pas de `/`, pas de `..`).
- Par défaut, les appels sortants sont bloqués (CSP). Tu peux demander l’activation via `network.allowOutgoing=true`.

Style / animations :
- Le template fournit des fichiers de style dans `shared/` (base + animations).
- Pour qu’ils fonctionnent après installation, copie-les dans ton app (ex: `packages/apps/<id>/web/`).

IA + BDD :
- Voir `AI_GUIDE.md` pour les contraintes (sécurité, style, réseau) et les points importants si une page a besoin de persistance/BDD.
- Voir `COMMUNITY_DATA_API.md` pour l’API de stockage sécurisée (Community Data) utilisable par les pages.- Voir `MOBILE_APP_GUIDE.md` pour créer des applications mobiles (Android/iOS) avec accès à la BDD.
## 2) Créer son propre dépôt (catalogue custom)

Objectif : héberger tes pages dans TON dépôt GitHub, puis l’ajouter dans EZGalaxy.

Structure minimale du dépôt :
```
catalog.json
packages/
  apps/
    <id>/
      ezpage.json
      emoji.txt        # optionnel - emoji affiché sur la tuile d'accueil
      web/
        index.html
      mobile/           # optionnel - pour les apps Android/iOS
        README.md
        config.json
```

### Fichier `emoji.txt`

Ce fichier optionnel contient un emoji unique qui sera utilisé comme icône sur la tuile de la page d'accueil.
Exemple de contenu : `🎮`

Si absent, l'emoji par défaut `📦` sera affiché.

Configuration dans EZGalaxy :
1. Admin → Catalogue → Paramètres (roue dentée).
2. Ajoute un dépôt : `owner`, `repo`, `ref` (branche), `catalog_path` (souvent `catalog.json`).
3. Pour réduire les limitations GitHub : configure une GitHub App (Read‑Only) via la tuile dédiée dans l’admin.
4. Si besoin (ex: test rapide) : configure un token GitHub (PAT) en alternative dans la page Catalogue.

Style / IA :
- Les fichiers `shared/ezgalaxy-base.css` et `shared/ezgalaxy-animations.css` sont là pour être copiés dans tes packages.
- Le guide `AI_GUIDE.md` donne un “prompt” et des règles pour générer des packages conformes.
## 3) Applications mobiles (Android / iOS)

Le catalogue supporte les applications mobiles qui peuvent accéder à la même base de données que les apps web.

Pour créer une app mobile :
1. Ajoute le champ `"platform": ["web", "android", "ios"]` dans `ezpage.json`.
2. Ajoute un objet `"mobile"` dans `ezpage.json` avec les infos de la plateforme (packageName, bundleId...).
3. Demande à l'admin EZGalaxy de générer une clé API mobile (`X-App-Key`).
4. Utilise le SDK EZGalaxy configuré en mode mobile, ou appelle directement l'API REST `/api/mobile/...`.

Voir `MOBILE_APP_GUIDE.md` pour le guide complet d'intégration mobile.