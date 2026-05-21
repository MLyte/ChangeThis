# Etat actuel ChangeThis

Date de reference: 2026-05-21

Ce document est la source courte a consulter avant de modifier une documentation generale, une checklist de production ou une decision d'architecture.

## Synthese

ChangeThis a aujourd'hui deux chemins distincts:

- **Beta SaaS actuelle**: Railway + Supabase Auth/DB + OVH DNS pour `https://app.changethis.dev`.
- **Installation interne Ubuntu 24 en amorcage**: Next.js + FastAPI `apps/api` + PostgreSQL interne pour `https://changethis.toolprod`.

La beta SaaS reste le chemin produit le plus branche fonctionnellement. Le chemin interne existe comme cible d'installation et backend fondationnel, mais les repositories Next.js doivent encore etre migres progressivement vers FastAPI.

## Produit

- ChangeThis est en beta ouverte controlee: le produit peut accueillir de vrais comptes, mais l'acces reste surveille et reversible.
- Le signup public est ouvert par defaut; definir `ENABLE_PUBLIC_SIGNUP=false` pour mettre les inscriptions en pause operationnelle.
- La boucle produit active est: site connecte -> widget public -> feedback -> inbox `/projects` -> creation manuelle d'issue GitHub/GitLab.
- Le mode automatique de creation d'issue existe par site, mais ne doit pas etre promu avant renforcement idempotence/retry/verrou.
- Le widget peut demander l'identite visiteur par site (`hidden`, `optional`, `required`) et remonte `reporter.name` / `reporter.email`.
- La page `/demo` reste un bac a sable widget, pas une preuve d'installation client.

## Stack beta SaaS actuelle

- App web: Next.js App Router dans `apps/web`.
- Widget public: `packages/widget`, servi par `/widget.js` et `/widget.global.js`.
- Types/protocole partages: `packages/shared`.
- Hebergement: Railway.
- DNS: OVH pour `changethis.dev`, cible `https://app.changethis.dev`.
- Auth: Supabase Auth avec `AUTH_MODE=supabase`.
- Store: Supabase REST/Postgres avec `DATA_STORE=supabase`.
- Store fichier: reserve au dev local avec `DATA_STORE=file`.
- Railway PostgreSQL natif et `DATABASE_URL`: non consommes par le chemin beta SaaS.

## Stack interne Ubuntu 24

- App web: Next.js `apps/web`, service `changethis-web.service`.
- Backend: FastAPI `apps/api`, service `changethis-api.service`.
- Store: PostgreSQL interne via SQLAlchemy/Alembic.
- Variables principales: `AUTH_MODE=internal`, `DATA_STORE=internal`, `INTERNAL_API_URL=http://back.toolprod:8000`.
- Runbook: [internal-ubuntu24-install.fr.md](internal-ubuntu24-install.fr.md).
- Limite actuelle: FastAPI expose les fondations, mais le dashboard Next.js utilise encore majoritairement les repositories existants Supabase/fichier.

## Garde-fous

- `npm run env:check` valide les variables critiques pour les modes `supabase` et `internal`.
- `npm run migrations:check` verifie la couverture structurelle des migrations Supabase.
- `npm run prod:check` combine env, migrations et typecheck pour le chemin beta SaaS.
- `npm run build:prod` lance les checks prod puis le build complet.
- `/api/health` repond minimalement et sans cache.
- `/api/ready` verifie le mode actif:
  - Supabase: auth, service role et tables attendues.
  - Internal: `INTERNAL_API_URL` et readiness FastAPI.
- `AUTH_MODE=local` et `DATA_STORE=file` sont des no-go en production.
- `AUTH_MODE=ovh` et `DATA_STORE=postgres` ne sont pas des modes supportes.

## Donnees deja branchees

- Workspaces, membres et roles.
- Sites/projets connectes et cles publiques actives.
- Feedbacks, statuts, evenements, tentatives provider et issues externes.
- Integrations GitHub/GitLab par workspace et credentials chiffres applicativement.
- Migrations Supabase `0001` a `0013`.
- Schema interne Alembic `apps/api/alembic/versions/0001_internal_schema.py`.

## Limites connues avant production commerciale

- Les screenshots sont compresses cote widget avant envoi, mais restent stockes transitoirement en data URL. Supabase Storage ou stockage objet interne reste a brancher.
- Le rate limit public reste memoire et doit passer sur un store partage pour multi-instance.
- L'idempotence provider et les verrous anti double issue doivent etre renforces.
- Les retries ne remplacent pas encore une queue durable.
- L'onboarding premier site reste a simplifier, mais le chemin Git -> site -> script -> feedback -> issue est utilisable.
- Les tests RLS reels, backup/restore et rollback migrations restent a valider sur staging.
- Le chemin interne doit encore recevoir la migration des repositories Next.js et de la logique provider complete.

## Licences

- Licence repo et packages internes: European Union Public Licence 1.2 (`EUPL-1.2`).
- Les dependances tierces restent sous leurs propres licences.
