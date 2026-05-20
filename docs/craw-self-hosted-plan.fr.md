# Plan CRAW self-hosted

Objectif: disposer d'une branche ChangeThis deployable sur les serveurs CRAW, sans dependance obligatoire a Railway ni Supabase.

## Decision recommandee

Avancer en deux etapes:

1. Sortir Railway du chemin de deploiement avec Docker/Compose, reverse proxy et variables d'environnement controlees par CRAW.
2. Sortir Supabase par adaptateurs explicites, en gardant l'app Next.js et le widget existants pendant la migration.

Une reecriture totale Django n'est pas le meilleur premier pas. Django est pertinent comme backend/API CRAW, mais il faut d'abord stabiliser le contrat entre le dashboard, le widget et la couche data.

## Ce qui remplace Railway

Railway est principalement un runtime. Le code actuel n'en depend pas fortement.

Remplacement cible:

- Dockerfile du repo pour construire l'app.
- Docker Compose, Coolify, Proxmox/LXC ou orchestrateur CRAW pour lancer le service.
- Caddy ou Nginx devant Next.js pour TLS, headers `X-Forwarded-*` et domaine public.
- Cron CRAW ou service worker dedie pour les taches planifiees.

Variables cles:

```env
NEXT_PUBLIC_APP_URL=https://app.example.craw
PORT=3000
CHANGETHIS_SECRET_KEY=...
CHANGETHIS_CRON_SECRET=...
```

## Ce qui remplace Supabase

Supabase porte aujourd'hui plusieurs responsabilites:

- Auth utilisateurs et sessions.
- Base PostgreSQL exposee via REST.
- Modele organisations, workspaces, membres, sites, feedbacks, integrations et credentials.
- Migrations SQL.
- A terme, stockage objet pour screenshots, meme si les screenshots sont encore en data URL dans le chemin beta.

Remplacement cible:

```env
AUTH_MODE=craw
DATA_STORE=postgres
DATABASE_URL=postgresql://...
CRAW_AUTH_SHARED_SECRET=...
# ou CRAW_AUTH_JWKS_URL=https://...
STORAGE_MODE=s3
S3_ENDPOINT=https://...
S3_BUCKET=changethis
QUEUE_MODE=redis
REDIS_URL=redis://...
```

Le mode `AUTH_MODE=craw` peut etre implemente de deux facons.

## Option A: Next.js garde le backend principal

Next.js continue de porter les routes API. On ajoute un store Postgres direct cote Node.js.

Composants:

- `DATA_STORE=postgres` avec Kysely, Drizzle, Prisma ou `pg`.
- Migrations SQL versionnees hors Supabase.
- Auth locale ou OIDC CRAW.
- Stockage screenshots via S3 compatible, MinIO ou filesystem protege.
- Jobs via Redis/BullMQ ou cron protege.

Avantages:

- Migration la plus courte.
- Moins de duplication API.
- Le widget et le dashboard changent peu.

Inconvenients:

- Il faut construire proprement l'auth et l'admin que Supabase donnait gratuitement.
- Le backend reste dans Next.js, moins naturel si CRAW administre deja beaucoup en Django.

## Option B: Django devient le backend CRAW

Django porte auth, API, admin, migrations, stockage et jobs. Next.js devient frontend/dashboard et le widget poste vers Django.

Composants:

- Django + Django REST Framework.
- PostgreSQL CRAW.
- Django sessions ou JWT signe pour Next.js.
- Celery + Redis pour creation d'issues, retries et taches de cleanup.
- S3 compatible ou filesystem pour screenshots.
- Admin Django pour support interne CRAW.

Avantages:

- Tres bon fit serveur propre, migrations, admin et operations.
- Plus simple a exploiter sur infra classique.
- Meilleure base pour queues/retries durables.

Inconvenients:

- Plus gros chantier.
- Il faut figer un contrat API et migrer progressivement les routes Next.js.
- Risque de double logique temporaire si on va trop vite.

## Choix propose pour CRAW

Demarrer par une architecture hybride reversible:

- Garder Next.js et le widget.
- Ajouter des interfaces internes pour auth, data, storage et jobs.
- Implementer `DATA_STORE=postgres` avant de retirer `DATA_STORE=supabase`.
- Introduire Django seulement pour les responsabilites ou il apporte un vrai gain: auth/admin/API stable/jobs.

Ordre de migration recommande:

1. Inventorier les appels Supabase dans `apps/web/lib/*` et les routes API.
2. Extraire les contrats:
   - `AuthProvider`
   - `DataStore`
   - `CredentialStore`
   - `ObjectStorage`
   - `JobQueue`
3. Porter le schema Supabase vers migrations PostgreSQL neutres.
4. Ajouter un `DATA_STORE=postgres` avec tests repository.
5. Ajouter `AUTH_MODE=craw` avec sessions/JWT CRAW.
6. Brancher stockage objet screenshots.
7. Brancher queue durable pour creation d'issues et retries.
8. Remplacer les checks `prod:check` pour accepter le runtime CRAW.
9. Ajouter un guide de deploiement CRAW et un smoke test complet.

## Stack cible minimale

```text
Internet
  -> Caddy/Nginx
  -> Next.js ChangeThis
  -> PostgreSQL
  -> Redis
  -> MinIO ou S3 compatible
  -> Worker jobs
```

Avec Django:

```text
Internet
  -> Caddy/Nginx
  -> Next.js dashboard/widget assets
  -> Django API/Auth/Admin
  -> PostgreSQL
  -> Redis/Celery
  -> MinIO ou S3 compatible
```

## Gates avant de couper Supabase

- Signup/login fonctionnent sans Supabase.
- Creation workspace owner fonctionne.
- Creation site + cle publique fonctionne.
- `/widget.js` charge la config site depuis le runtime CRAW.
- `POST /api/public/feedback` persiste en Postgres CRAW.
- Inbox `/projects` liste les feedbacks depuis Postgres CRAW.
- Creation d'issue GitHub/GitLab fonctionne avec credentials chiffres.
- Screenshots ne sont plus stockes en data URL longue duree.
- `/api/health` et `/api/ready` valident les dependances CRAW.
- Backup/restore Postgres et storage sont documentes et testes.

## Premiere tranche concrete

La premiere tranche ne doit pas encore introduire Django.

Livrables:

- `AUTH_MODE=craw` et `DATA_STORE=postgres` reconnus par le runtime.
- Client Postgres minimal pour les checks de readiness.
- Schema SQL neutre derive des migrations Supabase existantes dans `postgres/migrations`.
- Repository feedback/projets avec implementation Postgres ciblee.
- Tests de selection de store et d'ecriture feedback.
- Documentation d'env CRAW.

Etat courant de cette tranche:

- `postgres/migrations/0001_craw_core_schema.sql` porte le schema applicatif sans RLS Supabase ni `auth.uid()`.
- `npm run postgres:migrations:check` verifie la couverture structurelle du schema neutre.
- `/api/ready` sonde les tables Postgres quand `DATA_STORE=postgres`.
- Les repositories applicatifs Postgres restent a implementer; les stores non portes echouent explicitement au lieu de retomber sur les fichiers locaux.

Ensuite seulement, decider si l'auth CRAW est implementee dans Next.js, via OIDC, ou via Django.
