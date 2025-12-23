# EZGalaxy — Community Data API (Stockage communauté)

Ce document décrit l’API de stockage **"Community Data"** destinée aux pages/paquets communautaires.

Objectif : permettre aux contenus communautaires de **stocker et lire des données** sans jamais accéder directement à la base de données de l’instance.

## Modèle de sécurité (résumé)

- **Pas d’accès SQL** pour la communauté : uniquement une **API HTTP**.
- Les données sont **isolées par utilisateur** (scope strict par `owner_user_id`).
- Les données sont regroupées par :
  - `extension_id` : identifiant du package/extension (ex: `com.ezgalaxy.example`)
  - `collection` : “table virtuelle” (ex: `scores`, `settings`)
  - `record_key` : clé du document (ex: `level-1`, `profile`, `2025-12-23`)
- Le contenu stocké est un **JSON** (champ `data`).
- Support d’expiration (TTL) via `expires_at`.

> Important : l’API ne permet pas (volontairement) de données partagées entre utilisateurs. Si vous avez besoin de “données globales”, créez un endpoint serveur contrôlé (admin/modération) plutôt que d’ouvrir l’accès en écriture globale.

---

## Pré-requis

- Backend Laravel avec Sanctum (déjà prévu dans les scripts).
- Authentification via token Sanctum.

### Obtenir un token

Endpoint : `POST /api/auth/login`

Body JSON :

```json
{ "email": "admin@site.tld", "password": "..." }
```

Réponse (exemple) :

```json
{
  "user": { "id": 1, "email": "admin@site.tld", "is_admin": true },
  "token": "<SANCTUM_TOKEN>"
}
```

Utilisation : ajouter l’en-tête HTTP

- `Authorization: Bearer <SANCTUM_TOKEN>`

---

## Base URL

Tous les endpoints ci-dessous sont sous :

- `/api/community/...`

Ces routes sont protégées par :

- `auth:sanctum` (obligatoire)
- `throttle:120,1` (par défaut) : 120 requêtes / minute / token

---

## Endpoints

### 1) Lister les records d’une collection

`GET /api/community/{extensionId}/{collection}`

Query params :
- `limit` (1..200, défaut 50)
- `offset` (>=0, défaut 0)
- `prefix` (optionnel) : filtre `record_key` commençant par ce préfixe

Réponse :

```json
{
  "extension_id": "com.ezgalaxy.example",
  "collection": "scores",
  "owner_user_id": 1,
  "limit": 50,
  "offset": 0,
  "total": 2,
  "items": [
    {
      "record_key": "level-1",
      "data": { "score": 1200 },
      "expires_at": null,
      "created_at": "2025-12-23T12:00:00.000000Z",
      "updated_at": "2025-12-23T12:00:00.000000Z"
    }
  ]
}
```

Exemple curl :

```bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://your-host.tld/api/community/com.ezgalaxy.example/scores?limit=50&offset=0"
```

---

### 2) Lire un record

`GET /api/community/{extensionId}/{collection}/{recordKey}`

Réponse :

```json
{
  "extension_id": "com.ezgalaxy.example",
  "collection": "settings",
  "record_key": "profile",
  "data": { "lang": "fr", "theme": "dark" },
  "expires_at": null,
  "created_at": "2025-12-23T12:00:00.000000Z",
  "updated_at": "2025-12-23T12:00:00.000000Z"
}
```

Si le record n’existe pas (ou est expiré) : `404 Not found`.

---

### 3) Créer ou remplacer un record (upsert)

`PUT /api/community/{extensionId}/{collection}/{recordKey}`

Body JSON :

- `data` (obligatoire, objet JSON)
- `expires_in` (optionnel) : TTL en secondes (>=60)
- `expires_at` (optionnel) : date/heure ISO 8601

Contraintes :
- fournir **soit** `expires_in` **soit** `expires_at`, jamais les deux
- TTL plafonné (voir configuration)

Exemple (TTL 1h) :

```bash
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":{"score":1337},"expires_in":3600}' \
  "https://your-host.tld/api/community/com.ezgalaxy.example/scores/level-1"
```

Réponses :
- `201` si création :

```json
{ "created": true, "record": { "record_key": "level-1", "data": {"score":1337} } }
```

- `200` si remplacement :

```json
{ "created": false, "record": { "record_key": "level-1", "data": {"score":1337} } }
```

Erreurs possibles :
- `413 Payload too large` si le JSON dépasse la limite
- `429 Record quota exceeded` si trop de records dans la collection
- `429 Collection quota exceeded` si trop de collections pour l’extension

---

### 4) Supprimer un record

`DELETE /api/community/{extensionId}/{collection}/{recordKey}`

Réponse :

```json
{ "message": "Deleted" }
```

Si absent : `404 Not found`.

---

## Validation et format des identifiants

Pour limiter les attaques et les caractères piégeux, l’API impose des patterns conservateurs :

- `extensionId` : `[a-z0-9][a-z0-9._-]{1,119}`
- `collection` : `[a-z0-9][a-z0-9._-]{0,119}`
- `recordKey` : `[A-Za-z0-9][A-Za-z0-9._:@-]{0,189}`

Recommandation : utilisez des identifiants stables (reverse-DNS) et des clés sans espaces.

---

## Expiration (TTL)

- Les records expirés **ne sont pas renvoyés** (index/show).
- L’API ne supprime pas automatiquement les expirés :
  - option A : laisser en base (ils ne ressortent pas)
  - option B (recommandé) : mettre une tâche cron (Laravel scheduler) qui purge régulièrement

Exemple de logique de purge (à implémenter plus tard côté backend_app) :

- supprimer `community_records` où `expires_at <= now()`

---

## Configuration (sécurité & quotas)

Ces variables d’environnement sont lues par le backend (fichier `.env`).

### Interrupteur global

- `EZ_COMMUNITY_API_ENABLED=true|false`
  - si `false` : l’API répond `404` (non découvrable)

### Allowlist d’extensions (très recommandé en prod)

- `EZ_COMMUNITY_ALLOWED_EXTENSIONS="com.ezgalaxy.example,com.vendor.app"`
  - si vide/non définie : toutes les extensions sont autorisées
  - si définie : toute extension hors liste reçoit `403 Extension not allowed`

### Limites

- `EZ_COMMUNITY_MAX_JSON_BYTES` (défaut 16384)
  - taille max du JSON stocké (mesurée après encodage)

- `EZ_COMMUNITY_MAX_RECORDS_PER_COLLECTION` (défaut 2000)
  - quota max de records par utilisateur, par `(extension, collection)`

- `EZ_COMMUNITY_MAX_COLLECTIONS_PER_EXTENSION` (défaut 100)
  - quota max de collections distinctes par utilisateur, par extension

- `EZ_COMMUNITY_MAX_TTL_SECONDS` (défaut 31536000 = 365 jours)
  - TTL max autorisé

> Les valeurs sont clampées côté serveur (min/max) pour éviter les configs extrêmes.

---

## Installation / Mise à jour

### Debian installer (scripts/install.sh)

Le script injecte des valeurs par défaut dans :

- `/var/www/ezgalaxy/backend_app/.env`

Lors des updates, le script :
- conserve les clés existantes
- ajoute les clés manquantes

Clés ajoutées (defaults) :
- `EZ_COMMUNITY_API_ENABLED=true`
- `EZ_COMMUNITY_MAX_JSON_BYTES=16384`
- `EZ_COMMUNITY_MAX_RECORDS_PER_COLLECTION=2000`
- `EZ_COMMUNITY_MAX_COLLECTIONS_PER_EXTENSION=100`
- `EZ_COMMUNITY_MAX_TTL_SECONDS=31536000`

### Setup dev local (backend/setup.sh)

Le script ajoute aussi ces clés si absentes dans `backend_app/.env`.

---

## Bonnes pratiques sécurité (production)

- Activer HTTPS (TLS) et refuser HTTP.
- Définir une allowlist `EZ_COMMUNITY_ALLOWED_EXTENSIONS`.
- Garder des quotas stricts (JSON et nombre de records).
- Ne pas stocker de secrets (tokens, mots de passe) dans `data`.
- Mettre en place une purge des expirés (cron).
- Surveiller les abus (logs / métriques) et ajuster le throttling.

---

## Codes d’erreur (résumé)

- `401` : token absent/invalide
- `403` : extension non autorisée (allowlist)
- `404` : record absent ou API désactivée
- `413` : JSON trop volumineux
- `422` : validation (ids invalides, TTL invalide, payload non conforme)
- `429` : quotas atteints (ou throttle)

---

## Détails de stockage (DB)

Table : `community_records`

Champs :
- `extension_id` (string)
- `collection` (string)
- `record_key` (string)
- `owner_user_id` (FK users)
- `data` (json)
- `expires_at` (timestamp nullable + index)

Contrainte unique :
- `(extension_id, collection, record_key, owner_user_id)`

Index de lookup :
- `(extension_id, collection, owner_user_id)`
