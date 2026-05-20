# Plan CRAW final

Objectif: faire de `CRAW` une application interne CRA-W installable sur serveurs controles, sans dependance runtime a Supabase, Railway, Next.js, Redis ni MinIO.

## Stack retenue

- Frontend: Vue 3 + Vite SPA + TypeScript + Pinia.
- Backend: Django/Python.
- Base: PostgreSQL avec extension PostGIS.
- Stockage: filesystem serveur CRA-W via `FILES_ROOT`.
- Runtime: Docker Compose avec `frontend`, `backend`, `postgres`.

## Pourquoi

CRA-W dispose deja d'une exploitation serveur classique: PostgreSQL/PostGIS, stockage disque ou NAS monte, fichiers GIS/QGIS temporaires, memoire locale Python, sessions Django/FastAPI et traitements synchrones. Cette branche s'aligne sur ces pratiques au lieu d'ajouter MinIO, Redis ou un runtime SaaS.

## Responsabilites Django

- Auth email/password et sessions.
- API JSON sous `/api/*`.
- Admin interne.
- Migrations Django comme source de verite.
- Ecriture atomique des screenshots sur disque.
- Creation d'issues GitHub/GitLab quand des tokens sont configures.
- Retries simples via table PostgreSQL et `manage.py run_due_jobs`.
- Cleanup fichiers via `manage.py cleanup_storage`.

## Responsabilites Vue

- Routes `/`, `/login`, `/signup`, `/projects`, `/settings`.
- Stores Pinia pour session, sites, feedbacks et settings.
- Appels API Django, cookies de session inclus.

## Donnees

Les modeles Django couvrent les objets principaux:

- users Django;
- organizations;
- workspace members;
- projects/sites;
- project public keys;
- feedbacks;
- issue targets;
- provider integrations;
- credentials provider;
- issue attempts;
- external issues;
- feedback status events.

## Stockage

Les screenshots sont recus via l'API publique, ecrits dans `TEMP_DIR`, puis deplaces vers:

```txt
FILES_ROOT/<workspace>/<project>/<date>/
```

La base stocke chemin relatif, hash SHA-256, taille, MIME type et statut. Un NAS reste un detail d'infrastructure: il suffit de monter le chemin sur `FILES_ROOT`.

## Gates d'acceptation

- `python apps/backend/manage.py check` vert.
- `npm run build` vert.
- `docker compose config` vert.
- `/api/health` vert.
- `/api/ready` vert quand PostgreSQL/PostGIS et les volumes sont disponibles.
- Signup/login/session fonctionnent via Django.
- `POST /api/public/feedback` persiste en PostgreSQL et stocke le screenshot sur disque.
- `/projects` liste les feedbacks depuis Django.
- Plus aucun chemin actif ne requiert Supabase, Railway ou Next.js.
