# Etat actuel ChangeThis CRAW

Date de reference: 2026-05-20

Ce document synchronise la branche `CRAW`. Il ne decrit pas le chemin heberge de `main`.

## Produit

- ChangeThis reste un widget de feedback et une inbox produit.
- La boucle cible est: site connecte -> widget public -> feedback -> inbox `/projects` -> creation manuelle ou synchrone d'issue GitHub/GitLab.
- CRA-W opere l'application sur ses propres serveurs.

## Stack active CRAW

- Frontend: Vue 3 + Vite + TypeScript + Pinia dans `apps/frontend`.
- Backend: Django dans `apps/backend`.
- Widget public: `packages/widget`, servi par Django via `/widget.js` et `/widget.global.js`.
- Types/protocole partages: `packages/shared`.
- Base: PostgreSQL/PostGIS, migrations Django.
- Stockage: filesystem serveur via `FILES_ROOT`; NAS supporte par montage systeme ou volume Docker.
- Runtime: Docker Compose avec `frontend`, `backend`, `postgres`.

## Garde-fous actuels

- `npm run build` construit `shared`, `widget` et `frontend`.
- `npm run typecheck` verifie TypeScript.
- `python apps/backend/manage.py check` verifie la configuration Django.
- `docker compose config` valide la topologie locale.
- `/api/health` expose la presence du backend.
- `/api/ready` sonde database, PostGIS, `FILES_ROOT`, `TEMP_DIR` et bundle widget.

## Donnees deja portees

- Users Django.
- Organizations et membres workspace.
- Projects/sites et cles publiques.
- Feedbacks et evenements de statut.
- Issue targets.
- Integrations provider et credentials.
- Provider issue attempts et external issues.

## Limites connues

- L'interface Vue est une base fonctionnelle, pas encore une migration UI complete de l'ancien dashboard.
- Les credentials provider sont stockes en base en clair dans cette premiere tranche; un coffre ou chiffrement applicatif doit etre ajoute avant production sensible.
- Les retries sont synchrones via commande Django, pas une queue durable.
- Les webhooks provider et la synchronisation avancee open/closed ne sont pas encore reportes.
- CRAW envoie les screenshots vers GitLab lors de la creation d'issue quand une destination GitLab est configuree, puis supprime le fichier local apres upload provider. GitHub reste en fallback sans upload direct via l'API Issues.

## Licences

- Licence repo et packages internes: European Union Public Licence 1.2 (`EUPL-1.2`).
- Les dependances tierces restent sous leurs propres licences.
