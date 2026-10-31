# IT Discovery

Application pour découvrir l'informatique, du collège au BUT : cours en scènes animées (3 niveaux d'explication), quiz corrigés par le serveur, mini-jeux, classement mensuel, Hall of Fame, records, duels fantômes et espace tuteur.

## Configuration

| Variable | Rôle |
|----------|------|
| `DB_PATH` | Chemin de la base SQLite (défaut `/app/data/database.sqlite`). |
| `ADMIN_CODE` | Code de l'espace tuteur. **Vide = espace tuteur désactivé.** Choisis un code long. |
| `REGISTER_LIMIT_PER_HOUR` | Nombre maximal de comptes créés par heure et par adresse IP (défaut 20). |

L'espace tuteur est accessible par le lien « Espace tuteur » en bas de chaque page.

## Contenu des cours

Les cours se modifient dans `content/source/` :

- `meta.mjs` : ordre des modules, niveaux, badges ;
- `modules/<id>.mjs` : leçons et quiz d'un module ;
- `scenes/<id>.mjs` : scènes animées d'un module (format décrit dans `docs/superpowers/specs/2026-10-30-it-discovery-v2-design.md`, §4.2).

Après chaque modification :

```bash
node tools/build-content.mjs
```

Le script valide le contenu (au moins une scène par leçon, 3 niveaux de texte par étape, 8 questions par quiz…) puis génère :

- `web/data.js` : ce que voit le navigateur, **sans les bonnes réponses** ;
- `backend/content/bank.json` : questions et réponses, lues uniquement par le serveur.

Les deux fichiers générés sont versionnés : l'image Docker n'a pas besoin de Node.

## Tests

```bash
cd backend
pip install fastapi==0.115.0 httpx pytest
python -m pytest tests
```

## Migration depuis la V1

Au premier démarrage, les comptes de l'ancienne version (stockage SDK) sont importés automatiquement : le PIN est haché et l'XP est reprise. L'ancien classement, falsifiable, est ignoré.
