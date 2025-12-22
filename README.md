# Template de dépôt catalogue EZGalaxy

Ce dossier `catalog/` est un **modèle** de dépôt pour publier des pages installables via EZGalaxy.

## Structure attendue

- `catalog.json` : index du dépôt (liste des packages)
- `packages/<packageId>/ezpage.json` : manifest du package
- `packages/<packageId>/web/` : fichiers servis (HTML/JS/CSS)
- `packages/<packageId>/assets/` : ressources (images, etc.)
- `packages/<packageId>/screenshots/` : screenshots (facultatif)

## Utilisation

1. Copier le contenu de ce dossier dans votre dépôt GitHub (ex: `EZGalaxy-catalog`).
2. Dans l’admin EZGalaxy → **Catalogue** → **Dépôts catalogue**, ajouter :
   - `owner` = votre owner GitHub
   - `repo` = nom du dépôt
   - `ref` = `main` (ou autre)
   - `catalog_path` = `catalog.json`
3. (Dépôt privé) Configurer un token GitHub (PAT) dans **Configuration GitHub**.

## Notes

- Les chemins dans `catalog.json` et `ezpage.json` sont **relatifs** au dépôt.
- Les packages sont téléchargés et installés localement par EZGalaxy.
- Pour les détails du standard, voir `CATALOG_STANDARD.md` à la racine du projet EZGalaxy.
