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

2) Un dossier `packages/<id>/` contenant :
- `ezpage.json`
- `web/index.html` (ou autre `entry`)

3) Optionnel : `web/app.js`, `web/style.css`, `screenshots/*`, `assets/*`.

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

Important : à l’installation, EZGalaxy télécharge **uniquement** le dossier du package.
Donc pour utiliser ces styles dans un package, il faut **copier** ces fichiers dans `packages/<id>/web/` (ou équivalent) et les référencer depuis `entry`.

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
  1) Implémenter côté EZGalaxy une API backend dédiée (contrôleur + migrations stubs) 
     et versionnée avec le cœur du projet.
  2) Garder un “contract” stable (endpoints + schéma).
  3) Ne jamais casser le schéma en update (préférer migrations additives).

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
- style: utilise ezgalaxy-base.css et ezgalaxy-animations.css (copiés dans web/)
- network.allowOutgoing: false
- ajoute une page simple avec un bouton et un bloc de log.
- mets à jour catalog.json avec path=packages/<id>. »
