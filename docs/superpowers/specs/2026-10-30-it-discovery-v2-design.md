# IT Discovery V2 — Design (étape 1)

- Date : 2026-10-30
- Package : `packages/apps/com.ezgalaxy.it-discovery`
- Maquette validée : https://claude.ai/artifact/X8b7rCxE9ZM9bQgjYHCnEx (cours animé, classement, connexion PIN, espace tuteur)

## 1. Contexte et objectifs

IT Discovery fait découvrir l'informatique. Usage réel : le tuteur donne le lien à chaque stagiaire qui arrive au travail (stage de 3e jusqu'au BUT/DUT). Les stagiaires se succèdent sur plusieurs années et jouent **en autonomie**, rarement en même temps.

Objectifs :

1. Cours sous forme de **scènes animées** compréhensibles du collège au BUT.
2. Cours relus, corrigés et enrichis.
3. Compétition réelle et motivante même avec peu de joueurs simultanés : classement du mois, Hall of Fame, records, duels fantômes.
4. Comptes, PIN et classement fiables, sécurisés et non falsifiables.
5. Espace tuteur pour suivre les stagiaires et dépanner (PIN oublié).
6. Correction de tous les bugs trouvés.

Hors périmètre : multijoueur temps réel, e-mail, comptes OAuth, classes gérées par un enseignant, refonte de la stack (on reste en vanilla JS + FastAPI + SQLite).

## 2. État actuel et défauts constatés

| # | Défaut | Effet |
|---|--------|-------|
| D1 | Comptes stockés dans le stockage **privé** du SDK (`ezgalaxy.storage`) | Dans EZGalaxy ce stockage est propre à chaque compte : un pseudo est introuvable depuis un autre poste, « pseudo déjà pris » ne marche pas. |
| D2 | PIN stocké en clair, aucune limite d'essais | 10 000 combinaisons testables en quelques secondes. |
| D3 | Classement écrit par le client dans `leaderboard/player-X` (stockage partagé) | N'importe qui peut écrire n'importe quel score pour n'importe quel pseudo. |
| D4 | La déconnexion ne vide pas la progression locale ; à la connexion la plus grosse XP locale écrase le serveur | Le stagiaire suivant hérite de l'XP du précédent et la pousse sur son compte. |
| D5 | Toute erreur réseau renvoie `null` | Affiche « Pseudo introuvable » au lieu d'une erreur de connexion. |
| D6 | Pseudo non validé, sensible à la casse | « Max » et « max » = deux comptes ; longueur et caractères libres. |
| D7 | Synchronisation lancée plusieurs fois par réponse, `console.log` de debug partout | Requêtes inutiles, console polluée. |
| D8 | Fichiers `*.bak` dans `web/` | Copiés dans l'image Docker. |
| D9 | Erreurs de contenu (ex. Gestionnaire de tâches = `Ctrl+Shift+Échap`, pas `Ctrl+Shift+Suppr`) | Information fausse enseignée. |
| D10 | Description « 14 ans et + » | Ne correspond plus à la cible collège → BUT. |
| D11 | `Data.MODULE_BADGES` : vérifier que les 11 modules ont un badge (databases, scripting, ai semblent absents) | Badges manquants. |
| D12 | Schémas en ASCII, quasi aucune animation | Cours peu attractifs. |

La liste sera complétée pendant l'implémentation (revue complète de `app.js`, `effects.js`, `style.css`).

## 3. Architecture cible

```
web/ (servi par FastAPI)
  index.html
  app.js            -> orchestration, écrans, état (allégé)
  api.js            -> client HTTP unique (nouvelles routes /api/v2), erreurs typées
  scene-engine.js   -> moteur de scènes animées (SVG + Web Animations API)
  icons.js          -> bibliothèque de pictos SVG
  scenes/*.js       -> une définition de scènes par module (données)
  data.js           -> modules, leçons, quiz SANS les bonnes réponses
  effects.js, style.css
backend/
  main.py           -> app FastAPI, montage des routers, SPA
  db.py             -> connexion SQLite, migrations versionnées
  auth.py           -> inscription, connexion, sessions, verrouillage PIN
  game.py           -> événements de jeu, calcul XP, runs arcade
  leaderboard.py    -> saisons, Hall of Fame, records, fantômes
  admin.py          -> espace tuteur
  content/answers.json -> bonnes réponses des quiz (jamais servies au client)
  tests/            -> pytest
```

Principe : **le serveur est la seule source de vérité** pour l'identité, l'XP et les scores. Le client affiche et envoie des événements ; il ne calcule plus de score qui part au classement. `localStorage` ne garde que le jeton de session, la progression invité et des préférences (niveau d'explication, son).

Les anciennes routes `/api/app-storage` et le shim SDK restent pour compatibilité, mais l'app ne s'en sert plus.

## 4. Moteur de scènes animées

### 4.1 Choix

Moteur maison, sans dépendance : SVG inline + Web Animations API (WAAPI) + CSS `offset-path`. Fonctionne hors-ligne, poids estimé de 15 à 25 Ko. GSAP et Lottie écartés (dépendance tierce, contenu impossible à adapter aux 3 niveaux).

### 4.2 Nouveau type de bloc `scene`

Un bloc de leçon `{ type: 'scene', id, title, stage, nodes, links, steps }` :

- `stage` : `{ width, height }` du repère SVG (ex. 800 × 340). Le rendu est responsive par `viewBox`.
- `nodes` : éléments visuels `{ id, kind, x, y, label, icon }`. `kind` parmi `box` (carte icône + étiquette), `chip`, `text`, `group`. Les icônes viennent de `icons.js` (environ 40 pictos : ordi, box, routeur, serveur, cpu, ram, disque, cadenas, base de données, conteneur, nuage, terminal…).
- `links` : traits entre nœuds `{ id, from, to, style: 'solid'|'dashed', path? }`.
- `steps` : la scène se joue étape par étape. Chaque étape :
  - `title`
  - `text: { college, lycee, but }` (les 3 niveaux sont obligatoires)
  - `actions` : liste d'animations déclaratives :
    - `travel` : un « paquet » suit un chemin (`via: [ids]`), couleur, nombre, intervalle
    - `highlight` : un nœud s'illumine ou pulse
    - `flow` : un lien affiche un flux en pointillés animés
    - `reveal` / `hide` : apparition ou disparition d'un nœud
    - `label` : bulle temporaire près d'un nœud (ex. `monsite.fr → 185.31.40.12`)
    - `type` : texte tapé caractère par caractère (terminal, URL)
    - `fill` : barre qui se remplit (RAM, disque, chargement)
    - `swap` : échange de position (algorithmes de tri)
    - `counter` : nombre qui défile
- `quiz` (facultatif, au niveau de la scène) : mini-défi `{ question, options }` affiché à la fin de la scène. La bonne réponse vit côté serveur, comme pour les quiz (§6.4).

### 4.3 Lecteur

- Contrôles : Lecture/Pause, Étape suivante, Étape précédente, Rejouer, barre de progression cliquable, vitesse ×0,75/×1/×1,5.
- Sélecteur de niveau Collège / Lycée / BUT, mémorisé. Le niveau change le texte seulement, l'animation reste la même.
- Clavier : `Espace` lecture/pause, `←`/`→` étape. Les boutons ont un vrai `aria-label`. Le texte de l'étape est dans une région `aria-live="polite"`.
- `prefers-reduced-motion` : animations remplacées par des états finaux avec fondu court.
- Une scène compte comme « vue » quand toutes ses étapes ont été affichées. Une leçon est terminée quand toutes ses scènes sont vues.
- Performance : animations WAAPI annulées en quittant l'étape, pas de fuite (test : changer 50 fois d'étape sans hausse mémoire notable).

### 4.4 Rendu des autres blocs

Les blocs existants (`paragraph`, `analogy`, `list`, `fun-fact`, `highlight`, `drag-match`, `drag-sort`, `flashcard-deck`, `true-false`, `mini-terminal`, `steps`, `interactive-diagram`, `interactive-reveal`) restent pris en charge. Ils reçoivent des animations d'entrée cohérentes (apparition décalée au défilement). Le type `diagram` (ASCII) est supprimé : chaque occurrence est remplacée par une scène.

## 5. Cours

- Les 11 modules et leur déblocage par tiers sont conservés.
- **Au moins une scène animée par leçon** (environ 33 scènes). Exemples : voyage d'un paquet (DNS, routage), CPU/RAM/disque qui se passent une donnée, démarrage d'un OS, arborescence de fichiers et terminal, chiffrement à clé publique, phishing décortiqué, requête SQL sur une table animée, conteneur Docker vs VM, CI/CD en pipeline, entraînement d'un réseau de neurones.
- Chaque texte de scène existe en 3 niveaux. Collège : phrases courtes, analogies, aucun sigle sans explication. Lycée : vocabulaire technique introduit et défini. BUT : précision protocolaire.
- Relecture factuelle complète, avec correction de D9 et de toute autre erreur trouvée.
- Les quiz passent à 8 questions par module, avec explication pour chaque réponse.
- Mise à jour de la description dans `ezcontainer.json` et `catalog.json` : « du collège au BUT ».

## 6. Backend de compétition

### 6.1 Schéma SQLite (migrations versionnées dans `db.py`)

```
players(id INTEGER PK, pseudo TEXT, pseudo_key TEXT UNIQUE, pin_hash TEXT, pin_salt TEXT,
        pin_temp INTEGER DEFAULT 0, created_at TEXT, last_seen_at TEXT, deleted_at TEXT NULL)
sessions(token_hash TEXT PK, player_id INTEGER, created_at TEXT, expires_at TEXT)
login_attempts(pseudo_key TEXT PK, failures INTEGER, locked_until TEXT NULL)
progress(player_id INTEGER PK, data TEXT)   -- scènes vues, préférences, JSON
xp_events(id INTEGER PK, player_id INTEGER, kind TEXT, ref TEXT, xp INTEGER,
          created_at TEXT, UNIQUE(player_id, kind, ref))
quiz_results(player_id, module_id, best_score, best_time_ms, perfect INTEGER, updated_at,
             PRIMARY KEY(player_id, module_id))
arcade_runs(id TEXT PK, player_id, mode, seed, started_at, finished_at NULL, score NULL, status)
records(mode TEXT PK, player_id, value, achieved_at)
seasons(id TEXT PK /* 'YYYY-MM' */, closed_at TEXT, podium TEXT /* JSON top 3 */)
```

Toutes les dates sont en ISO 8601 UTC. `pseudo_key` = pseudo normalisé NFKC puis en minuscules.

### 6.2 Authentification

- Pseudo : 3 à 16 caractères `[A-Za-z0-9_-]`, unicité insensible à la casse, liste courte de mots interdits.
- PIN : 4 chiffres, haché avec `hashlib.scrypt` (sel aléatoire de 16 octets par joueur), comparaison à temps constant.
- Verrouillage : **3 échecs → pause de 5 minutes** par pseudo. Le compteur est remis à zéro après un succès. La réponse indique les essais restants.
- Session : jeton aléatoire de 32 octets renvoyé au client. Seul son hash SHA-256 est stocké. Durée 180 jours, renouvelée à chaque visite. En-tête `Authorization: Bearer`.
- PIN temporaire (fixé par le tuteur) : la connexion force le choix d'un nouveau PIN.
- Routes : `POST /api/v2/auth/register`, `POST /api/v2/auth/login`, `POST /api/v2/auth/logout`, `GET /api/v2/me`, `POST /api/v2/me/pin`.

### 6.3 Progression et XP calculées par le serveur

Le client envoie des événements, le serveur décide de l'XP :

| Événement | Route | Règle |
|-----------|-------|-------|
| Leçon terminée | `POST /api/v2/events/lesson` `{module, lesson}` | +10 XP une seule fois (contrainte `UNIQUE`), module débloqué exigé |
| Mini-défi de scène | `POST /api/v2/events/scene-quiz` `{scene, choice}` | +5 XP si juste, une seule fois par scène |
| Quiz de module | `POST /api/v2/quiz/{module}/submit` `{answers[], timeMs}` | correction côté serveur, +5 par bonne réponse, +20 si parfait ; une nouvelle soumission ne rapporte que la différence avec le meilleur score précédent |
| Arcade | `POST /api/v2/arcade/start` `{mode}` → `{runId, questions}` puis `POST /api/v2/arcade/{runId}/finish` `{answers[], timeMs}` | questions tirées par le serveur, correction côté serveur, rejet si durée impossible (moins de 400 ms par question en moyenne, ou plus que la durée du mode + 5 s de marge), une seule fin par run, XP = score |

`GET /api/v2/me/progress` renvoie l'état complet : XP totale, XP du mois, niveau, leçons, quiz, badges, records perso. Les badges sont calculés par le serveur à partir des événements.

### 6.4 Bonnes réponses

`data.js` ne contient plus la bonne réponse des quiz de module, des mini-défis de scène ni de l'arcade. Elles sont dans `backend/content/answers.json`. Un script (`tools/split-answers.mjs`, lancé à la main) génère `web/data.js` et `answers.json` à partir d'une source unique `content/source/*.js`, pour qu'ils ne divergent jamais. Les exercices sans enjeu de classement (drag-match, drag-sort, true-false, flashcards) gardent leur correction côté client.

### 6.5 Classements

- **Saison** = mois civil UTC (`YYYY-MM`). Score de saison = somme des `xp_events` du mois. Égalité départagée par le temps total en quiz du mois, puis par l'ancienneté du dernier gain.
- **Clôture** : à la première requête de classement d'un nouveau mois, la saison précédente est figée dans `seasons` (podium top 3). Le tuteur peut aussi clôturer à la main.
- **Hall of Fame** : liste des saisons clôturées avec champion et podium.
- **Records** : Speedrun 60 s, Survie, série de défis du jour, quiz parfait le plus rapide par module. Mis à jour à chaque run validé.
- **Duel fantôme** : pour le module choisi, le serveur propose le meilleur temps de quiz parfait d'un autre joueur, juste au-dessus du joueur si possible, sinon le record. Le duel est un quiz normal avec affichage en direct de l'avance ou du retard sur le fantôme.
- Routes : `GET /api/v2/leaderboard/season?month=YYYY-MM`, `GET /api/v2/leaderboard/hall-of-fame`, `GET /api/v2/leaderboard/records`, `GET /api/v2/ghost/{module}`.
- Le classement affiche pseudo, niveau et XP. Les joueurs supprimés en sont exclus.

### 6.6 Migration des données existantes

Au démarrage, la migration n°2 lit l'ancien `storage` (collection privée `users`) : pour chaque compte, elle crée le joueur, hache son PIN et reprend son XP en un événement `legacy_import`, daté de sa dernière mise à jour. Les pseudos en conflit après normalisation gardent le compte le plus récent ; l'autre est renommé avec un suffixe `-2`. L'ancienne collection `leaderboard` est ignorée car falsifiable. La migration est idempotente.

## 7. Espace tuteur

- Accès : écran « Tuteur » discret (lien en pied de page) demandant `ADMIN_CODE`, défini en variable d'environnement dans `ezcontainer.json`. Sans variable, l'espace est désactivé. Même verrouillage anti-force brute que le PIN. Session admin séparée, d'une durée de 8 h.
- Fonctions : tableau des stagiaires (inscription, dernière visite, modules, XP), réinitialisation du PIN (génère un PIN temporaire de 4 chiffres affiché une fois), renommage, suppression logique, export CSV, clôture de saison, liste des runs rejetés pour suspicion de triche.
- Routes sous `/api/v2/admin/*`, protégées par le jeton admin.

## 8. Front : écrans et comportements

- Écrans existants conservés (accueil, modules, leçon, quiz, arcade, profil, trophées) et restylés selon la maquette : fond `#0B1220`, cyan `#38BDF8`, ambre `#FBBF24`, polices Bricolage Grotesque et JetBrains Mono embarquées en local (pas de CDN).
- Nouveaux écrans : Classement (onglets Mois / Hall of Fame / Records + carte Duel fantôme), Tuteur.
- Mode invité : on peut suivre les cours sans compte. La progression invité est locale et ne compte pas au classement. À l'inscription, les leçons vues en invité sont importées une seule fois (XP de leçon seulement).
- Déconnexion : efface jeton et progression locale (corrige D4).
- `api.js` distingue `NetworkError`, `AuthError`, `LockedError`, `ValidationError` et affiche un message clair à chaque fois (corrige D5).
- Envoi d'événements : file d'attente avec réessai et déduplication. Une action = une requête (corrige D7). Plus aucun `console.log` de debug.

## 9. Nettoyage

Suppression des `*.bak`, du code mort lié à l'ancien classement et au SDK. Le `.dockerignore` exclut `tests/` et `content/source/`. Mise à jour de `README` (section IT Discovery) et de `ezcontainer.json` (`ADMIN_CODE`, version `2.0.0`) et de `catalog.json`.

## 10. Tests et vérification

- `backend/tests` (pytest + `fastapi.testclient`) :
  - inscription : pseudo invalide, doublon insensible à la casse
  - connexion : bon et mauvais PIN, verrouillage après 3 échecs puis déblocage après 5 min (horloge simulée)
  - sessions : jeton invalide, expiré, déconnexion
  - XP : leçon comptée une fois, module verrouillé refusé, quiz corrigé côté serveur, gain limité au meilleur score
  - arcade : run fini deux fois, durée impossible
  - saisons : clôture au changement de mois, podium, égalités
  - admin : sans code, mauvais code, reset PIN qui force le changement
  - migration : import de l'ancien `storage`, conflit de pseudo, idempotence
- Validation des contenus : script qui vérifie que chaque leçon a au moins une scène, que chaque étape a les 3 niveaux de texte, et que chaque question notée a sa réponse dans `answers.json`.
- Vérification manuelle dans le navigateur : parcours complet invité → inscription → leçon → quiz → arcade → classement → tuteur, sur bureau et en largeur mobile, sans erreur console.

## 11. Écarts d'implémentation (2026-10-31)

- **Quiz par « parties »** : quiz de module, duel fantôme et mini-jeux passent tous par `POST /api/v2/runs`, puis `/runs/{id}/answer` question par question, puis `/runs/{id}/finish`. Le serveur corrige chaque réponse et renvoie l'explication immédiatement ; aucune bonne réponse n'est envoyée à l'avance. La route `/quiz/{module}/submit` n'existe pas.
- **Records** calculés à la volée depuis `runs` et `quiz_best` (pas de table `records`) ; table `progress` inutile (préférences en local, scènes dans `xp_events`).
- **Saisons** : table `seasons(id, starts_at, ends_at, podium)` pour permettre la clôture manuelle par le tuteur ; bascule automatique au 1er du mois UTC.
- **Mini-jeux** : 2 XP par point, plafond de 150 XP par jour ; défi du jour : 5 XP par bonne réponse + 10 XP de bonus, un seul essai par jour.
- **Anti-triche** : réponse en moins de 250 ms après la précédente = partie marquée suspecte, sans XP, listée dans l'espace tuteur.
- **Polices** : chargées depuis Google Fonts avec repli sur les polices système hors ligne.
- **Badge** `speedrun-50` remplacé par `speedrun-25` (50 points en 60 s n'est pas atteignable) ; badges ajoutés pour les modules Bases de données, Scripting et IA.

## 12. Ordre de réalisation

1. Backend : `db.py` et migrations, `auth.py`, tests.
2. Backend : `game.py`, `leaderboard.py`, séparation des réponses, tests.
3. Front : `api.js`, connexion, déconnexion, mode invité, branchement des événements.
4. Front : écrans Classement et Duel fantôme.
5. Moteur de scènes, icônes, lecteur.
6. Contenu : 11 modules réécrits avec scènes et 3 niveaux (par lots de 2 ou 3 modules).
7. Espace tuteur.
8. Nettoyage, restylage, vérification complète.
