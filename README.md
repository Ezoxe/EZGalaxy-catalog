# Catalogue EZGalaxy (guide rapide)

Ce dossier montre le format attendu par EZGalaxy pour lister et installer des pages via GitHub.

Le standard complet est dans `CATALOG_STANDARD.md` (repo principal EZGalaxy).

## 1) Ajouter une page dans le dépôt officiel `EZGalaxy-catalog` (Pull Request)

Objectif : proposer une nouvelle page pour qu’elle apparaisse dans le catalogue officiel.

Étapes :
1. Fork le dépôt officiel `Ezoxe/EZGalaxy-catalog`.
2. Crée un dossier de package : `packages/<id>/`.
3. Ajoute le manifest : `packages/<id>/ezpage.json`.
4. Ajoute les fichiers web (minimum) : `packages/<id>/web/index.html` (+ JS/CSS si besoin).
5. Déclare ton package dans `catalog.json` (à la racine) en ajoutant une entrée dans `packages[]`.
6. Ouvre une Pull Request.

Rappels :
- `<id>` doit être stable et unique (conseillé : `a-z0-9-`).
- `entry` doit être un chemin relatif (ex: `web/index.html`, pas de `/`, pas de `..`).
- Par défaut, les appels sortants sont bloqués (CSP). Tu peux demander l’activation via `network.allowOutgoing=true`.

Style / animations :
- Le template fournit des fichiers de style dans `shared/` (base + animations).
- Pour qu’ils fonctionnent après installation, copie-les dans ton package (ex: `packages/<id>/web/`).

IA + BDD :
- Voir `AI_GUIDE.md` pour les contraintes (sécurité, style, réseau) et les points importants si une page a besoin de persistance/BDD.

## 2) Créer son propre dépôt (catalogue custom)

Objectif : héberger tes pages dans TON dépôt GitHub, puis l’ajouter dans EZGalaxy.

Structure minimale du dépôt :
```
catalog.json
packages/
  <id>/
    ezpage.json
    web/
      index.html
```

Configuration dans EZGalaxy :
1. Admin → Catalogue → Paramètres (roue dentée).
2. Ajoute un dépôt : `owner`, `repo`, `ref` (branche), `catalog_path` (souvent `catalog.json`).
3. Si le dépôt est privé : configure un token GitHub (PAT) dans la même page.

Style / IA :
- Les fichiers `shared/ezgalaxy-base.css` et `shared/ezgalaxy-animations.css` sont là pour être copiés dans tes packages.
- Le guide `AI_GUIDE.md` donne un “prompt” et des règles pour générer des packages conformes.
