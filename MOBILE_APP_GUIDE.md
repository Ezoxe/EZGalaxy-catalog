# Guide Mobile — Applications Android & iOS (Catalogue EZGalaxy)

> **Créez des apps mobiles Android et iOS qui utilisent la même base de données que vos apps web EZGalaxy.**

---

## Vue d'ensemble

Le catalogue EZGalaxy supporte nativement les applications mobiles. Une app mobile peut :

- **Lire et écrire** dans la même base de données que les apps web (table `app_storage`)
- **Stocker des données privées** par appareil (scores, préférences, sauvegardes...)
- **Partager des données** entre tous les utilisateurs (classements, config publique...)
- **Fonctionner avec** React Native, Flutter, Kotlin, Swift, ou tout framework mobile

---

## Architecture

```
┌────────────────────────────────────┐
│  App Mobile                        │
│  (Android / iOS)                   │
│                                    │
│  Headers:                          │
│    X-App-Key: ezm_xxxx            │
│    X-Device-UUID: uuid-v4         │
│                                    │
│  SDK JS (mode mobile) ou          │
│  HTTP natif (fetch/axios/Volley)  │
└──────────────┬─────────────────────┘
               │ HTTPS
               ▼
┌──────────────────────────────────────────┐
│  Serveur EZGalaxy                        │
│                                          │
│  /api/mobile/...                         │
│  ┌────────────────────────┐              │
│  │ AuthenticateMobileApp  │  middleware  │
│  │ (valide X-App-Key)     │              │
│  └───────────┬────────────┘              │
│              ▼                           │
│  ┌────────────────────────┐              │
│  │ AppStorageController   │              │
│  │ (même logique que web) │              │
│  └───────────┬────────────┘              │
│              ▼                           │
│  ┌────────────────────────┐              │
│  │ Table: app_storage     │  MySQL/SQLite│
│  │ (données partagées     │              │
│  │  web + mobile)         │              │
│  └────────────────────────┘              │
└──────────────────────────────────────────┘
```

---

## Démarrage rapide (5 minutes)

### Étape 1 : Déclarer l'app comme mobile

Dans votre `ezpage.json` :

```json
{
  "schemaVersion": 1,
  "id": "com.ezgalaxy.my-app",
  "title": "Mon App",
  "function": "Une app mobile avec stockage cloud",
  "version": "1.0.0",
  "createdAt": "2026-02-22",
  "author": "MonNom",
  "entry": "web/index.html",
  "platform": ["web", "android", "ios"],
  "network": { "allowOutgoing": true },
  "mobile": {
    "requiresApiKey": true,
    "android": {
      "packageName": "com.ezgalaxy.myapp",
      "downloadUrl": "https://play.google.com/store/apps/details?id=com.ezgalaxy.myapp",
      "minSdkVersion": 24
    },
    "ios": {
      "bundleId": "com.ezgalaxy.myapp",
      "downloadUrl": "https://apps.apple.com/app/id123456789",
      "minOsVersion": "15.0"
    }
  }
}
```

### Étape 2 : Obtenir une clé API

L'admin EZGalaxy génère une clé d'API mobile :

```
POST /api/admin/mobile-keys
{
  "extension_id": "com.ezgalaxy.my-app",
  "label": "Production",
  "platform": "all"
}
```

Réponse (la clé est affichée **une seule fois**) :
```json
{
  "key": "ezm_a1b2c3d4e5f6...",
  "id": 1,
  "extension_id": "com.ezgalaxy.my-app"
}
```

### Étape 3 : Intégrer dans votre app

Choisissez l'une des trois approches ci-dessous.

---

## Intégration : SDK JavaScript (React Native / Expo)

Si votre app mobile utilise JavaScript (React Native, Expo, Capacitor...) :

```js
// 1. Copier ezgalaxy-sdk.js dans votre projet
// 2. L'importer :
import './ezgalaxy-sdk';

// 3. Configurer le mode mobile :
ezgalaxy.configureMobile({
  serverUrl: 'https://mon-serveur-ezgalaxy.com',
  appKey: 'ezm_a1b2c3d4e5f6...',
  deviceUuid: getOrCreateDeviceUUID(),  // UUID v4 stable par appareil
  extensionId: 'com.ezgalaxy.my-app',
  platform: 'android'  // ou 'ios'
});

// 4. Utiliser la même API que les apps web :

// Données privées (par appareil)
await ezgalaxy.storage.set('game', 'save', { level: 5, score: 1200 });
const save = await ezgalaxy.storage.get('game', 'save');

// Données partagées (tous les utilisateurs)
await ezgalaxy.app.set('leaderboard', 'player-alice', {
  pseudo: 'Alice', score: 1200
});
const top10 = await ezgalaxy.app.list('leaderboard', {
  limit: 10, sort_by: 'updated_at', sort_order: 'desc'
});
```

### Générer un UUID stable par appareil

```js
// React Native
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values'; // polyfill crypto
import { v4 as uuidv4 } from 'uuid';

async function getOrCreateDeviceUUID() {
  let uuid = await AsyncStorage.getItem('device_uuid');
  if (!uuid) {
    uuid = uuidv4();
    await AsyncStorage.setItem('device_uuid', uuid);
  }
  return uuid;
}
```

---

## Intégration : API REST native (Kotlin / Android)

Pour les apps Android natives en Kotlin :

```kotlin
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class EZGalaxyClient(
    private val serverUrl: String,
    private val appKey: String,
    private val deviceUuid: String,
    private val extensionId: String
) {
    private val client = OkHttpClient()
    private val JSON_TYPE = "application/json; charset=utf-8".toMediaType()

    private fun baseUrl() = "$serverUrl/api/mobile"

    private fun headers() = Headers.Builder()
        .add("X-App-Key", appKey)
        .add("X-Device-UUID", deviceUuid)
        .add("X-Platform", "android")
        .add("Accept", "application/json")
        .build()

    // ── Données privées (par appareil) ──

    fun storageSet(collection: String, key: String, data: JSONObject, ttl: Int? = null): JSONObject {
        val body = JSONObject().apply {
            put("data", data)
            ttl?.let { put("expires_in", it) }
        }
        val request = Request.Builder()
            .url("${baseUrl()}/$extensionId/$collection/$key")
            .headers(headers())
            .put(body.toString().toRequestBody(JSON_TYPE))
            .build()
        return execute(request)
    }

    fun storageGet(collection: String, key: String): JSONObject? {
        val request = Request.Builder()
            .url("${baseUrl()}/$extensionId/$collection/$key")
            .headers(headers())
            .get()
            .build()
        return try { execute(request) } catch (e: Exception) { null }
    }

    fun storageList(collection: String, limit: Int = 50, offset: Int = 0): JSONObject {
        val request = Request.Builder()
            .url("${baseUrl()}/$extensionId/$collection?limit=$limit&offset=$offset")
            .headers(headers())
            .get()
            .build()
        return execute(request)
    }

    fun storageDelete(collection: String, key: String): JSONObject {
        val request = Request.Builder()
            .url("${baseUrl()}/$extensionId/$collection/$key")
            .headers(headers())
            .delete()
            .build()
        return execute(request)
    }

    // ── Données partagées (tous les utilisateurs) ──

    fun appSet(collection: String, key: String, data: JSONObject): JSONObject {
        val body = JSONObject().apply { put("data", data) }
        val request = Request.Builder()
            .url("${baseUrl()}/@app/$extensionId/$collection/$key")
            .headers(headers())
            .put(body.toString().toRequestBody(JSON_TYPE))
            .build()
        return execute(request)
    }

    fun appGet(collection: String, key: String): JSONObject? {
        val request = Request.Builder()
            .url("${baseUrl()}/@app/$extensionId/$collection/$key")
            .headers(headers())
            .get()
            .build()
        return try { execute(request) } catch (e: Exception) { null }
    }

    fun appList(collection: String, limit: Int = 50): JSONObject {
        val request = Request.Builder()
            .url("${baseUrl()}/@app/$extensionId/$collection?limit=$limit&sort_order=desc")
            .headers(headers())
            .get()
            .build()
        return execute(request)
    }

    private fun execute(request: Request): JSONObject {
        client.newCall(request).execute().use { response ->
            val body = response.body?.string() ?: "{}"
            if (!response.isSuccessful) {
                throw Exception("HTTP ${response.code}: $body")
            }
            return JSONObject(body)
        }
    }
}

// Utilisation :
val ez = EZGalaxyClient(
    serverUrl = "https://mon-serveur.com",
    appKey = "ezm_xxxx",
    deviceUuid = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID),
    extensionId = "com.ezgalaxy.my-app"
)

// Sauvegarder un score
ez.storageSet("scores", "level-1", JSONObject().apply {
    put("score", 1500)
    put("time", 45)
})

// Ajouter au classement
ez.appSet("leaderboard", "player-alice", JSONObject().apply {
    put("pseudo", "Alice")
    put("score", 1500)
    put("date", Instant.now().toString())
})
```

---

## Intégration : API REST native (Swift / iOS)

Pour les apps iOS natives en Swift :

```swift
import Foundation

class EZGalaxyClient {
    let serverUrl: String
    let appKey: String
    let deviceUuid: String
    let extensionId: String

    init(serverUrl: String, appKey: String, deviceUuid: String, extensionId: String) {
        self.serverUrl = serverUrl
        self.appKey = appKey
        self.deviceUuid = deviceUuid
        self.extensionId = extensionId
    }

    private func baseUrl() -> String { "\(serverUrl)/api/mobile" }

    private func makeRequest(path: String, method: String, body: [String: Any]? = nil) -> URLRequest {
        var request = URLRequest(url: URL(string: "\(baseUrl())/\(path)")!)
        request.httpMethod = method
        request.setValue(appKey, forHTTPHeaderField: "X-App-Key")
        request.setValue(deviceUuid, forHTTPHeaderField: "X-Device-UUID")
        request.setValue("ios", forHTTPHeaderField: "X-Platform")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body = body {
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }
        return request
    }

    // ── Données privées (par appareil) ──

    func storageSet(collection: String, key: String, data: [String: Any],
                    completion: @escaping (Result<[String: Any], Error>) -> Void) {
        let request = makeRequest(
            path: "\(extensionId)/\(collection)/\(key)",
            method: "PUT",
            body: ["data": data]
        )
        perform(request, completion: completion)
    }

    func storageGet(collection: String, key: String,
                    completion: @escaping (Result<[String: Any]?, Error>) -> Void) {
        let request = makeRequest(
            path: "\(extensionId)/\(collection)/\(key)",
            method: "GET"
        )
        perform(request) { result in
            switch result {
            case .success(let data): completion(.success(data))
            case .failure(let error):
                // 404 = not found, return nil
                completion(.success(nil))
            }
        }
    }

    // ── Données partagées ──

    func appSet(collection: String, key: String, data: [String: Any],
                completion: @escaping (Result<[String: Any], Error>) -> Void) {
        let request = makeRequest(
            path: "@app/\(extensionId)/\(collection)/\(key)",
            method: "PUT",
            body: ["data": data]
        )
        perform(request, completion: completion)
    }

    func appList(collection: String, limit: Int = 50,
                 completion: @escaping (Result<[String: Any], Error>) -> Void) {
        let request = makeRequest(
            path: "@app/\(extensionId)/\(collection)?limit=\(limit)&sort_order=desc",
            method: "GET"
        )
        perform(request, completion: completion)
    }

    private func perform(_ request: URLRequest,
                         completion: @escaping (Result<[String: Any], Error>) -> Void) {
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error { return completion(.failure(error)) }
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            else { return completion(.failure(NSError(domain: "", code: -1))) }
            completion(.success(json))
        }.resume()
    }
}

// Utilisation :
let ez = EZGalaxyClient(
    serverUrl: "https://mon-serveur.com",
    appKey: "ezm_xxxx",
    deviceUuid: UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString,
    extensionId: "com.ezgalaxy.my-app"
)

ez.storageSet(collection: "scores", key: "level-1", data: [
    "score": 1500,
    "time": 45
]) { result in
    print(result)
}
```

---

## Intégration : Flutter (Dart)

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class EZGalaxyClient {
  final String serverUrl;
  final String appKey;
  final String deviceUuid;
  final String extensionId;

  EZGalaxyClient({
    required this.serverUrl,
    required this.appKey,
    required this.deviceUuid,
    required this.extensionId,
  });

  String get _baseUrl => '$serverUrl/api/mobile';

  Map<String, String> get _headers => {
    'X-App-Key': appKey,
    'X-Device-UUID': deviceUuid,
    'X-Platform': 'android', // ou Platform.isIOS ? 'ios' : 'android'
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // ── Données privées ──

  Future<Map<String, dynamic>> storageSet(
      String collection, String key, Map<String, dynamic> data) async {
    final response = await http.put(
      Uri.parse('$_baseUrl/$extensionId/$collection/$key'),
      headers: _headers,
      body: jsonEncode({'data': data}),
    );
    return jsonDecode(response.body);
  }

  Future<Map<String, dynamic>?> storageGet(
      String collection, String key) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/$extensionId/$collection/$key'),
      headers: _headers,
    );
    if (response.statusCode == 404) return null;
    return jsonDecode(response.body);
  }

  // ── Données partagées ──

  Future<Map<String, dynamic>> appSet(
      String collection, String key, Map<String, dynamic> data) async {
    final response = await http.put(
      Uri.parse('$_baseUrl/@app/$extensionId/$collection/$key'),
      headers: _headers,
      body: jsonEncode({'data': data}),
    );
    return jsonDecode(response.body);
  }

  Future<Map<String, dynamic>> appList(String collection,
      {int limit = 50}) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/@app/$extensionId/$collection?limit=$limit&sort_order=desc'),
      headers: _headers,
    );
    return jsonDecode(response.body);
  }
}

// Utilisation :
final ez = EZGalaxyClient(
  serverUrl: 'https://mon-serveur.com',
  appKey: 'ezm_xxxx',
  deviceUuid: await getDeviceUuid(),  // package device_info_plus
  extensionId: 'com.ezgalaxy.my-app',
);

await ez.storageSet('scores', 'level-1', {'score': 1500, 'time': 45});
final leaderboard = await ez.appList('leaderboard', limit: 10);
```

---

## Référence API REST complète

Tous les endpoints sont sous `/api/mobile/`. Auth : `X-App-Key` + `X-Device-UUID`.

### Données privées (par appareil)

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/{ext}/{col}` | Lister les records |
| `GET` | `/{ext}/{col}/{key}` | Lire un record |
| `PUT` | `/{ext}/{col}/{key}` | Créer / remplacer |
| `PATCH` | `/{ext}/{col}/{key}` | Mise à jour partielle (merge) |
| `DELETE` | `/{ext}/{col}/{key}` | Supprimer un record |
| `DELETE` | `/{ext}/{col}` | Vider une collection |
| `GET` | `/{ext}/{col}/count` | Compter les records |
| `GET` | `/info` | Info sur l'appareil et la clé |

### Données partagées (tous les utilisateurs)

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/@app/{ext}/{col}` | Lister |
| `GET` | `/@app/{ext}/{col}/{key}` | Lire |
| `PUT` | `/@app/{ext}/{col}/{key}` | Créer / remplacer |
| `PATCH` | `/@app/{ext}/{col}/{key}` | Mise à jour partielle |
| `DELETE` | `/@app/{ext}/{col}/{key}` | Supprimer |
| `DELETE` | `/@app/{ext}/{col}` | Vider la collection |
| `GET` | `/@app/{ext}/{col}/count` | Compter |

### Headers requis

| Header | Valeur | Description |
|--------|--------|-------------|
| `X-App-Key` | `ezm_xxxx...` | Clé API mobile (obligatoire) |
| `X-Device-UUID` | UUID v4 | Identifiant unique de l'appareil (obligatoire) |
| `X-Platform` | `android` / `ios` | Plateforme (optionnel, déduit du User-Agent) |
| `Content-Type` | `application/json` | Pour PUT / PATCH |
| `Accept` | `application/json` | Recommandé |

### Body (PUT — créer/remplacer)

```json
{
  "data": { "score": 100, "level": 5 },
  "expires_in": 86400
}
```

### Body (PATCH — mise à jour partielle)

```json
{
  "data": { "score": 200 }
}
```

### Réponses

**200 OK (GET record) :**
```json
{
  "extension_id": "com.ezgalaxy.my-app",
  "collection": "scores",
  "record_key": "level-1",
  "data": { "score": 100, "level": 5 },
  "created_at": "2026-02-22T10:00:00.000000Z",
  "updated_at": "2026-02-22T12:00:00.000000Z",
  "expires_at": null
}
```

**200 OK (GET list) :**
```json
{
  "collection": "scores",
  "total": 25,
  "offset": 0,
  "limit": 50,
  "items": [
    { "record_key": "level-1", "data": {...}, "created_at": "...", "updated_at": "..." },
    ...
  ]
}
```

**401 Unauthorized :**
```json
{ "message": "Missing X-App-Key header. Provide a valid mobile API key." }
```

**403 Forbidden :**
```json
{ "message": "API key not authorized for this extension" }
```

---

## Règles et limites

Les mêmes limites que l'API web s'appliquent :

| Limite | Valeur par défaut |
|--------|-------------------|
| Taille max d'un enregistrement | 16 Ko (JSON) |
| Records par collection | 2 000 |
| Collections par app | 100 |
| TTL maximum | 365 jours |
| Requêtes par minute | 120 (par clé API) |

### Règles de nommage

| Champ | Format autorisé | Longueur max |
|-------|----------------|-------------|
| extension_id | `a-z 0-9 . _ -` (commence par lettre/chiffre) | 120 caractères |
| Collection | `a-z 0-9 . _ -` (commence par lettre/chiffre) | 120 caractères |
| Clé (key) | `A-Z a-z 0-9 . _ : @ -` (commence par lettre/chiffre) | 190 caractères |

---

## Sécurité

- **La clé API identifie l'application**, pas l'utilisateur. Elle ne doit pas être exposée publiquement.
- **L'UUID d'appareil identifie le device**. Les données `storage.*` sont isolées par appareil.
- **Les données `app.*` sont partagées** entre tous les appareils et utilisateurs de l'app.
- **La clé est restreinte par extension_id** : une clé pour `com.myapp.game` ne peut pas accéder aux données de `com.myapp.chat`.
- **La clé peut être restreinte par plateforme** : `android`, `ios`, `mobile` (les deux), ou `all`.
- **Expiration** : les clés peuvent avoir une date d'expiration.
- **Révocation** : l'admin peut révoquer une clé à tout moment.

### Bonnes pratiques

1. **Ne stockez jamais la clé API en dur dans le code source**. Utilisez les variables d'environnement, les secrets Android Gradle, ou le Keychain iOS.
2. **Utilisez un UUID stable par appareil** (ANDROID_ID, identifierForVendor, etc.).
3. **Gérez les erreurs réseau** : retries, mode hors-ligne, cache local.
4. **Respectez les quotas** : 120 requêtes/min par défaut.
5. **Utilisez `app.*` pour les données publiques** (classements) et `storage.*` pour les données privées (sauvegardes).

---

## ezpage.json — Champs mobile

| Champ | Type | Description |
|-------|------|-------------|
| `platform` | string \| string[] | `"web"`, `"android"`, `"ios"`, `"mobile"` (android+ios), `"all"` |
| `mobile.requiresApiKey` | boolean | L'app nécessite une clé API (défaut: `true` si platform inclut mobile) |
| `mobile.serverUrl` | string | URL du serveur EZGalaxy (pour auto-config) |
| `mobile.android.packageName` | string | Nom du package Android (ex: `com.example.app`) |
| `mobile.android.downloadUrl` | string | URL de téléchargement (Play Store ou APK) |
| `mobile.android.minSdkVersion` | number | Version SDK Android minimale |
| `mobile.ios.bundleId` | string | Bundle ID iOS (ex: `com.example.app`) |
| `mobile.ios.downloadUrl` | string | URL de téléchargement (App Store ou TestFlight) |
| `mobile.ios.minOsVersion` | string | Version iOS minimale (ex: `"15.0"`) |

---

## Partage de données web ↔ mobile

Les apps web et mobile partagent la **même base de données** (`app_storage`). Cependant :

- **`storage.*` (données privées)** : isolées par `owner_type`.
  - Web : `owner_type = 'visitor'`, `owner_id = UUID du navigateur`
  - Mobile : `owner_type = 'device'`, `owner_id = UUID de l'appareil`
  - Chaque "source" a ses propres données privées.

- **`app.*` (données partagées)** : **communes** entre web et mobile.
  - Un score ajouté depuis Android est visible depuis le web et iOS.
  - Idéal pour les classements, les configs, les données publiques.

### Exemple : classement cross-platform

```
Web (navigateur)    →  ezgalaxy.app.set('leaderboard', 'player-web', { score: 100 })
Android (mobile)    →  PUT /api/mobile/@app/ext/leaderboard/player-android  { "data": { "score": 200 } }
iOS (mobile)        →  PUT /api/mobile/@app/ext/leaderboard/player-ios      { "data": { "score": 150 } }

Tous les clients :  →  ezgalaxy.app.list('leaderboard')
                       → [ player-android: 200, player-ios: 150, player-web: 100 ]
```

---

## Gestion des clés API (Admin)

L'admin EZGalaxy peut gérer les clés via l'API :

| Action | Méthode | URL |
|--------|---------|-----|
| Lister les clés | `GET` | `/api/admin/mobile-keys` |
| Créer une clé | `POST` | `/api/admin/mobile-keys` |
| Voir une clé | `GET` | `/api/admin/mobile-keys/{id}` |
| Modifier | `PUT` | `/api/admin/mobile-keys/{id}` |
| Révoquer | `DELETE` | `/api/admin/mobile-keys/{id}` |
| Révoquer par app | `POST` | `/api/admin/mobile-keys/revoke-extension` |

### Créer une clé

```bash
curl -X POST https://mon-serveur.com/api/admin/mobile-keys \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "extension_id": "com.ezgalaxy.my-app",
    "label": "Production Android",
    "platform": "android",
    "rate_limit": 120
  }'
```

---

## FAQ

**Q: Puis-je utiliser la même clé pour Android et iOS ?**
Oui, si la clé est créée avec `platform: "all"` ou `platform: "mobile"`.

**Q: Les données privées d'un appareil sont-elles accessibles depuis un autre ?**
Non. Chaque appareil a son propre UUID et ses données `storage.*` sont isolées.

**Q: Que se passe-t-il si la clé API est révoquée ?**
Toutes les requêtes avec cette clé recevront une erreur 403. Les données existantes ne sont pas supprimées.

**Q: L'app doit-elle être installée via le catalogue pour fonctionner ?**
L'app doit être déclarée dans le catalogue (ezpage.json) et une clé API doit être générée par l'admin. L'installation via le catalogue n'est requise que pour la version web.

**Q: Comment gérer le mode hors-ligne ?**
Le SDK ne gère pas nativement le mode hors-ligne en mode mobile. Implémentez un cache local (AsyncStorage, SharedPreferences, UserDefaults) et synchronisez quand la connexion revient.

**Q: Puis-je migrer des données d'un appareil vers un autre ?**
Les données `storage.*` sont liées à l'UUID de l'appareil. Pour migrer, implémentez un système d'export/import via `app.*` (données partagées) ou un mécanisme de liaison de compte.
