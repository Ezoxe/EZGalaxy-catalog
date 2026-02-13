# EZGalaxy SDK — Stockage persistant pour les apps du catalogue

> **Une seule ligne de code pour sauvegarder des données.**

## Démarrage rapide (30 secondes)

Ajoutez le SDK dans votre `index.html` :

```html
<script src="/api/ezgalaxy-sdk.js"></script>
```

C'est tout. Vous pouvez maintenant sauvegarder et lire des données :

```js
// Sauvegarder
await ezgalaxy.storage.set('scores', 'level-1', { score: 100, time: 45 });

// Lire
const record = await ezgalaxy.storage.get('scores', 'level-1');
console.log(record.data); // { score: 100, time: 45 }
```

---

## Concepts clés

| Concept | Description | Exemple |
|---------|-------------|---------|
| **Collection** | Un groupe de données (comme une "table") | `'scores'`, `'settings'`, `'profiles'` |
| **Clé (key)** | Identifiant unique dans une collection | `'level-1'`, `'user-profile'`, `'config'` |
| **Data** | Un objet JSON quelconque | `{ score: 100, name: "Alice" }` |

Les données `storage` sont **automatiquement isolées par visiteur/utilisateur**. Chaque personne ne voit que ses propres données.

Les données `app` sont **partagées** entre tous les utilisateurs de l'application. Idéal pour les classements, la config publique, etc.

---

## API complète

### `ezgalaxy.storage.set(collection, key, data, options?)`

Sauvegarde des données. Crée ou remplace.

```js
// Simple
await ezgalaxy.storage.set('settings', 'preferences', {
  lang: 'fr',
  theme: 'dark',
  notifications: true
});

// Avec expiration (TTL en secondes)
await ezgalaxy.storage.set('sessions', 'token-abc', { valid: true }, { ttl: 3600 });
// → expire dans 1 heure
```

### `ezgalaxy.storage.get(collection, key)`

Lit un enregistrement. Retourne l'objet complet ou `null` si non trouvé.

```js
const record = await ezgalaxy.storage.get('settings', 'preferences');

if (record) {
  console.log(record.data);       // { lang: 'fr', theme: 'dark', ... }
  console.log(record.created_at); // "2026-01-15T10:30:00.000000Z"
  console.log(record.updated_at); // "2026-02-12T14:22:00.000000Z"
} else {
  console.log('Pas encore de données sauvegardées');
}
```

### `ezgalaxy.storage.update(collection, key, data)`

Mise à jour partielle — fusionne les champs fournis avec les données existantes.

```js
// Données existantes : { score: 100, time: 45 }
await ezgalaxy.storage.update('scores', 'level-1', { time: 30 });
// Résultat : { score: 100, time: 30 }

// Ajouter un nouveau champ
await ezgalaxy.storage.update('scores', 'level-1', { stars: 3 });
// Résultat : { score: 100, time: 30, stars: 3 }
```

> La clé doit déjà exister. Utilisez `set()` pour créer un enregistrement.

### `ezgalaxy.storage.delete(collection, key)`

Supprime un enregistrement.

```js
await ezgalaxy.storage.delete('scores', 'level-1');
```

### `ezgalaxy.storage.list(collection, options?)`

Liste tous les enregistrements d'une collection.

```js
const result = await ezgalaxy.storage.list('scores');
console.log(result.total);  // nombre total
console.log(result.items);  // [{ record_key, data, ... }, ...]

// Avec pagination
const page2 = await ezgalaxy.storage.list('scores', { limit: 10, offset: 10 });

// Filtrer par préfixe de clé
const levels = await ezgalaxy.storage.list('scores', { prefix: 'level-' });
```

### `ezgalaxy.storage.clear(collection)`

Supprime TOUS les enregistrements d'une collection.

```js
await ezgalaxy.storage.clear('scores');
// → { message: 'Cleared', deleted: 15 }
```

### `ezgalaxy.storage.count(collection)`

Compte les enregistrements d'une collection.

```js
const { count } = await ezgalaxy.storage.count('scores');
console.log(`${count} scores sauvegardés`);
```

### `ezgalaxy.storage.getOrDefault(collection, key, defaultData)`

Lit un enregistrement ou crée avec des valeurs par défaut s'il n'existe pas.

```js
const settings = await ezgalaxy.storage.getOrDefault('settings', 'config', {
  volume: 80,
  difficulty: 'normal',
  language: 'fr'
});
// → retourne les données existantes OU crée avec ces valeurs par défaut
```

### `ezgalaxy.user.info()`

Informations sur le visiteur/utilisateur actuel.

```js
const user = await ezgalaxy.user.info();
console.log(user.type); // 'visitor', 'user', ou 'dev'
console.log(user.id);   // UUID du visiteur ou ID utilisateur
```

---

## API App — Stockage partagé de l'application

`ezgalaxy.app` est un espace de stockage **partagé** qui appartient à l'application elle-même (pas à un utilisateur). Toute personne utilisant l'app peut lire et écrire dans cet espace. C'est l'endroit idéal pour :
- **Classements** (leaderboards)
- **Statistiques globales**
- **Configuration partagée**
- **Données publiques** de l'application

Les mêmes filtres de sécurité s'appliquent (taille max, quotas, validation des clés).

### `ezgalaxy.app.set(collection, key, data, options?)`

Sauvegarde des données au niveau de l'application. Crée ou remplace.

```js
// Ajouter un score au classement
await ezgalaxy.app.set('leaderboard', 'player-alice', {
  pseudo: 'Alice',
  score: 1500,
  date: new Date().toISOString()
});

// Avec expiration
await ezgalaxy.app.set('daily-challenge', 'today', { theme: 'espace' }, { ttl: 86400 });
```

### `ezgalaxy.app.get(collection, key)`

Lit un enregistrement app-level.

```js
const record = await ezgalaxy.app.get('leaderboard', 'player-alice');
if (record) {
  console.log(record.data); // { pseudo: 'Alice', score: 1500, ... }
}
```

### `ezgalaxy.app.update(collection, key, data)`

Mise à jour partielle (merge) d'un enregistrement app-level.

```js
await ezgalaxy.app.update('leaderboard', 'player-alice', { score: 1800 });
// Le pseudo et la date restent inchangés
```

### `ezgalaxy.app.delete(collection, key)`

Supprime un enregistrement app-level.

```js
await ezgalaxy.app.delete('leaderboard', 'player-alice');
```

### `ezgalaxy.app.list(collection, options?)`

Liste les enregistrements app-level d'une collection.

```js
const result = await ezgalaxy.app.list('leaderboard');
console.log(result.total);  // nombre total d'entrées
console.log(result.items);  // [{ record_key, data, ... }, ...]

// Avec tri et pagination
const top10 = await ezgalaxy.app.list('leaderboard', {
  limit: 10,
  sort_by: 'updated_at',   // 'created_at' (défaut), 'updated_at', 'record_key'
  sort_order: 'desc'       // 'desc' (défaut) ou 'asc'
});

// Filtrer par préfixe
const weekScores = await ezgalaxy.app.list('leaderboard', { prefix: 'week-07-' });
```

### `ezgalaxy.app.clear(collection)`

Supprime TOUS les enregistrements app-level d'une collection.

```js
await ezgalaxy.app.clear('leaderboard');
```

### `ezgalaxy.app.count(collection)`

Compte les enregistrements app-level d'une collection.

```js
const { count } = await ezgalaxy.app.count('leaderboard');
console.log(`${count} entrées au classement`);
```

### `ezgalaxy.app.getOrDefault(collection, key, defaultData)`

Lit ou crée avec des valeurs par défaut.

```js
const config = await ezgalaxy.app.getOrDefault('config', 'settings', {
  maxPlayers: 100,
  gameMode: 'classic'
});
```

---

## Exemples concrets

### Jeu avec sauvegarde de score

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Mon Jeu</title>
  <script src="/api/ezgalaxy-sdk.js"></script>
</head>
<body>
  <h1>Mon Super Jeu</h1>
  <p>Score actuel : <span id="score">0</span></p>
  <button onclick="jouer()">Jouer</button>
  <button onclick="sauvegarder()">Sauvegarder</button>

  <script>
    let score = 0;

    // Charger le score au démarrage
    async function charger() {
      const record = await ezgalaxy.storage.get('game', 'save');
      if (record) {
        score = record.data.score || 0;
        document.getElementById('score').textContent = score;
      }
    }

    function jouer() {
      score += Math.floor(Math.random() * 100);
      document.getElementById('score').textContent = score;
    }

    async function sauvegarder() {
      await ezgalaxy.storage.set('game', 'save', {
        score: score,
        date: new Date().toISOString()
      });
      alert('Score sauvegardé !');
    }

    charger();
  </script>
</body>
</html>
```

### Application avec profil utilisateur

```html
<script src="/api/ezgalaxy-sdk.js"></script>
<script>
  // Créer ou récupérer le profil
  async function initProfile() {
    const profile = await ezgalaxy.storage.getOrDefault('app', 'profile', {
      nickname: 'Nouveau joueur',
      level: 1,
      xp: 0,
      created: new Date().toISOString()
    });

    document.getElementById('nickname').textContent = profile.nickname;
    document.getElementById('level').textContent = profile.level;
  }

  // Mettre à jour le profil (fusion partielle)
  async function gagnerXP(amount) {
    await ezgalaxy.storage.update('app', 'profile', {
      xp: currentXP + amount,
      lastPlayed: new Date().toISOString()
    });
  }

  initProfile();
</script>
```

### Classement global (leaderboard multi-joueurs)

```html
<script src="/api/ezgalaxy-sdk.js"></script>
<script>
  // Quand un joueur termine une partie, son score est sauvegardé
  // dans l'espace partagé de l'app (visible par tous)
  async function sauvegarderScore(pseudo, score) {
    // Utiliser le pseudo comme clé → chaque joueur n'a qu'une entrée
    await ezgalaxy.app.set('leaderboard', 'player-' + pseudo, {
      pseudo: pseudo,
      score: score,
      date: new Date().toISOString()
    });
  }

  // Mettre à jour le score d'un joueur existant
  async function mettreAJourScore(pseudo, nouveauScore) {
    await ezgalaxy.app.update('leaderboard', 'player-' + pseudo, {
      score: nouveauScore,
      date: new Date().toISOString()
    });
  }

  // Afficher le classement complet
  async function afficherClassement() {
    const result = await ezgalaxy.app.list('leaderboard', { limit: 100 });
    const scores = result.items
      .map(item => item.data)
      .sort((a, b) => b.score - a.score);

    const ol = document.getElementById('classement');
    ol.innerHTML = '';
    scores.forEach((s, i) => {
      const li = document.createElement('li');
      li.textContent = `${i + 1}. ${s.pseudo} — ${s.score} pts`;
      ol.appendChild(li);
    });
  }

  // Nombre total de joueurs
  async function nombreJoueurs() {
    const { count } = await ezgalaxy.app.count('leaderboard');
    document.getElementById('nb-joueurs').textContent = count + ' joueurs';
  }

  // Supprimer un joueur du classement
  async function supprimerJoueur(pseudo) {
    await ezgalaxy.app.delete('leaderboard', 'player-' + pseudo);
  }

  afficherClassement();
  nombreJoueurs();
</script>
```

---

## Mode développement (hors EZGalaxy)

Quand vous développez votre app en local (pas dans un iframe EZGalaxy), le SDK utilise automatiquement `localStorage` comme fallback. Toutes les méthodes fonctionnent de la même manière.

Vous verrez dans la console :
```
 EZGalaxy SDK  Dev mode – using localStorage fallback
```

---

## Règles de nommage

| Champ | Format autorisé | Longueur max |
|-------|----------------|-------------|
| Collection | `a-z 0-9 . _ -` (commence par lettre/chiffre) | 120 caractères |
| Clé (key) | `A-Z a-z 0-9 . _ : @ -` (commence par lettre/chiffre) | 190 caractères |

**Exemples valides :** `scores`, `user-data`, `level.progress`, `score-2026-02-12`

**Exemples invalides :** `_private` (commence par _), `ma collection` (espaces), `données` (accents)

---

## Limites et quotas

| Limite | Valeur par défaut | Configurable |
|--------|-------------------|-------------|
| Taille max d'un enregistrement | 16 Ko (JSON) | Oui (.env) |
| Records par collection | 2 000 | Oui (.env) |
| Collections par app | 100 | Oui (.env) |
| TTL maximum | 365 jours | Oui (.env) |
| Requêtes par minute | 120 | Oui (throttle) |

---

## Gestion des erreurs

Toutes les méthodes retournent des Promises. Utilisez `try/catch` :

```js
try {
  await ezgalaxy.storage.set('scores', 'level-1', { score: 100 });
} catch (error) {
  console.error('Erreur:', error.message);
  // Messages possibles :
  // - "Payload too large"         → données trop volumineuses (>16 Ko)
  // - "Record quota exceeded"     → trop d'enregistrements dans la collection
  // - "Collection quota exceeded" → trop de collections pour cette extension
  // - "Not found"                 → clé inexistante (pour update/delete)
  // - "Extension not allowed"     → extension pas dans la liste autorisée
  // - "EZGalaxy: request timeout" → le serveur ne répond pas
}
```

---

## API REST directe (avancé)

Si vous préférez appeler l'API REST directement (sans le SDK), voici les endpoints.
Ils sont normalement appelés par le bridge PageViewer, pas directement par les apps.

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/app-storage/{ext}/{col}` | Lister mes records |
| `GET` | `/api/app-storage/{ext}/{col}/{key}` | Lire un de mes records |
| `PUT` | `/api/app-storage/{ext}/{col}/{key}` | Créer/remplacer |
| `PATCH` | `/api/app-storage/{ext}/{col}/{key}` | Mise à jour partielle |
| `DELETE` | `/api/app-storage/{ext}/{col}/{key}` | Supprimer un record |
| `DELETE` | `/api/app-storage/{ext}/{col}` | Vider une collection |
| `GET` | `/api/app-storage/{ext}/{col}/count` | Compter mes records |
| `GET` | `/api/app-storage/info` | Info utilisateur |
| | | **Données partagées de l'app** |
| `GET` | `/api/app-storage/@app/{ext}/{col}` | Lister les records app |
| `GET` | `/api/app-storage/@app/{ext}/{col}/{key}` | Lire un record app |
| `PUT` | `/api/app-storage/@app/{ext}/{col}/{key}` | Créer/remplacer un record app |
| `PATCH` | `/api/app-storage/@app/{ext}/{col}/{key}` | Mise à jour partielle app |
| `DELETE` | `/api/app-storage/@app/{ext}/{col}/{key}` | Supprimer un record app |
| `DELETE` | `/api/app-storage/@app/{ext}/{col}` | Vider une collection app |
| `GET` | `/api/app-storage/@app/{ext}/{col}/count` | Compter les records app |

**Auth :** Token Sanctum (`Authorization: Bearer ...`) OU UUID visiteur (`X-Visitor-UUID: ...`).

**Body (PUT) :**
```json
{
  "data": { "score": 100 },
  "expires_in": 3600
}
```

**Body (PATCH) :**
```json
{
  "data": { "time": 30 }
}
```

---

## Architecture technique

```
┌─────────────────────────────────────────────────────┐
│  Votre App (iframe sandbox)                         │
│  ┌───────────────────────┐                          │
│  │  ezgalaxy-sdk.js      │                          │
│  │  ezgalaxy.storage.set │──── postMessage ────┐    │
│  └───────────────────────┘                     │    │
└────────────────────────────────────────────────│────┘
                                                 │
┌────────────────────────────────────────────────│────┐
│  EZGalaxy (page parent)                        │    │
│  ┌───────────────────────┐                     │    │
│  │  PageViewer Bridge    │◄────────────────────┘    │
│  │  (postMessage relay)  │                          │
│  └──────────┬────────────┘                          │
│             │ fetch(/api/app-storage/...)            │
└─────────────│───────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────┐
│  Backend Laravel                                     │
│  ┌───────────────────────┐  ┌─────────────────────┐ │
│  │  AppStorageController │──│  Table: app_storage  │ │
│  └───────────────────────┘  └─────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Pourquoi un bridge (postMessage) ?**
- L'iframe sandbox (`allow-scripts` sans `allow-same-origin`) n'a pas accès aux cookies/tokens
- Le bridge dans la page parent a accès à l'authentification
- Les données sont isolées par extension : une app ne peut pas accéder aux données d'une autre

**Deux espaces de stockage :**
- `ezgalaxy.storage.*` → données **privées** (isolées par `owner_type` + `owner_id`)
- `ezgalaxy.app.*` → données **partagées** de l'app (stockées avec `owner_type='app'`)

---

## Configuration serveur (.env)

```env
# Activer/désactiver l'API de stockage
EZ_COMMUNITY_API_ENABLED=true

# Extensions autorisées (vide = toutes)
EZ_COMMUNITY_ALLOWED_EXTENSIONS=

# Limites
EZ_COMMUNITY_MAX_JSON_BYTES=16384
EZ_COMMUNITY_MAX_RECORDS_PER_COLLECTION=2000
EZ_COMMUNITY_MAX_COLLECTIONS_PER_EXTENSION=100
EZ_COMMUNITY_MAX_TTL_SECONDS=31536000
```

---

## Migration (base de données)

La table `app_storage` est créée automatiquement lors de l'installation/mise à jour.

Structure :

| Colonne | Type | Description |
|---------|------|-------------|
| `extension_id` | string(120) | ID de l'app (ex: `com.ezgalaxy.example`) |
| `collection` | string(120) | Nom de la collection |
| `record_key` | string(190) | Clé du record |
| `owner_type` | string(10) | `'user'` ou `'visitor'` |
| `owner_id` | string(255) | ID utilisateur ou UUID visiteur |
| `data` | json | Les données stockées |
| `expires_at` | timestamp? | Expiration optionnelle |

Contrainte unique : `(extension_id, collection, record_key, owner_type, owner_id)`

---

## Ancien API (Community Data) — rétrocompatibilité

L'ancien API REST (`/api/community/...`) reste disponible pour les utilisateurs authentifiés via Sanctum.
Le nouveau SDK (`/api/app-storage/...`) le remplace avec le support visiteur en plus.

---

## FAQ

**Q: Les données persistent-elles après un redémarrage du serveur ?**
Oui. Les données sont stockées en base de données (MySQL/SQLite).

**Q: Un visiteur retrouve-t-il ses données ?**
Oui, tant qu'il utilise le même navigateur (l'UUID visiteur est stocké dans le localStorage du parent).

**Q: Une app peut-elle lire les données d'une autre app ?**
Non. Le bridge force l'`extension_id` à celui de l'app chargée. Chaque app est isolée.

**Q: Quelle est la taille max des données ?**
16 Ko par enregistrement (configurable). Pour stocker plus, découpez en plusieurs clés.

**Q: Les données sont-elles partagées entre utilisateurs ?**
Il y a deux espaces de stockage :
- `ezgalaxy.storage.*` — **privé**, chaque utilisateur ne voit que ses propres données.
- `ezgalaxy.app.*` — **partagé**, toute personne utilisant l'app peut lire et écrire dans cet espace. Idéal pour les classements, config partagée, etc.

**Q: Une app peut-elle lire les données privées d'un autre utilisateur ?**
Non. Les données `storage.*` restent strictement isolées par utilisateur. Seul l'espace `app.*` est partagé.

**Q: Comment tester en local sans serveur EZGalaxy ?**
Ouvrez directement votre `index.html` dans un navigateur. Le SDK utilise `localStorage` automatiquement.
