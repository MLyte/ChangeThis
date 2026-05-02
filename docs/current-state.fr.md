# Etat actuel ChangeThis

Date de reference: 2026-05-02

Ce document sert de source courte pour synchroniser les autres fichiers Markdown du repo.

## Produit

- ChangeThis est en beta privee invitation-only.
- Le signup public reste ferme par defaut avec `ENABLE_PUBLIC_SIGNUP=false`.
- La boucle produit actuelle est: site connecte -> widget public -> feedback -> inbox `/projects` -> creation manuelle d'issue GitHub/GitLab.
- La page `/demo` reste une demo produit distincte d'un vrai test d'installation client.
- Le dashboard admin/app peut rester large; les pages publiques doivent eviter les layouts full-width non controles.

## Stack actuelle

- App web: Next.js App Router dans `apps/web`.
- Widget public: `packages/widget`, servi par `/widget.js` et `/widget.global.js`.
- Types/protocole partages: `packages/shared`.
- Hebergement beta recommande: Railway pour l'app.
- DNS: OVH pour `changethis.dev`, cible app `https://app.changethis.dev`.
- Auth beta: Supabase Auth avec `AUTH_MODE=supabase`.
- Store beta reel: Supabase REST/Postgres avec `DATA_STORE=supabase`.
- Store fichier: reserve au dev local avec `DATA_STORE=file`.
- Railway PostgreSQL natif et `DATABASE_URL`: non consommes par le code actuel.

## Garde-fous production actuels

- `npm run env:check` valide les variables critiques.
- `npm run migrations:check` verifie la couverture structurelle des migrations Supabase.
- `npm run prod:check` combine env, migrations et typecheck.
- `npm run build:prod` lance les checks prod puis le build complet.
- `/api/health` repond minimalement et sans cache.
- `/api/ready` verifie auth, mode prod, store, secret applicatif, service role et tables Supabase attendues.
- `AUTH_MODE=local` et `DATA_STORE=file` sont des no-go en production beta.

## Donnees deja branchees

- Workspaces, membres et roles.
- Sites/projets connectes et cles publiques actives.
- Feedbacks, statuts, evenements, tentatives provider et issues externes.
- Integrations provider par workspace et credentials chiffres applicativement.
- Migrations Supabase `0001` a `0007`.

## Limites connues avant beta plus large

- Les screenshots restent transitoirement stockes en data URL; Supabase Storage ou stockage objet reste a brancher.
- Le rate limit public reste memoire et doit passer sur un store partage pour multi-instance.
- L'idempotence provider et les verrous anti double issue doivent etre renforces.
- Les retries ne remplacent pas encore une queue durable.
- L'onboarding premier site reste a simplifier et guider.
- Les tests RLS reels, backup/restore et rollback migrations restent a valider sur staging.

## Licences

- Licence repo par defaut: Elastic License 2.0.
- `packages/widget`: Apache-2.0.
- `packages/shared`: Apache-2.0.
- Le modele est source-available/open-core: widget et protocole permissifs, service heberge et operations commerciales reserves.
