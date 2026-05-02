# Roadmap beta ChangeThis

Etat actuel: voir [current-state.fr.md](current-state.fr.md).

Ce document transforme le plan de production en piste executable pour la beta privee actuelle. Le chemin beta reel est Railway pour l'app, OVH pour le DNS et Supabase Auth/DB avec `AUTH_MODE=supabase` + `DATA_STORE=supabase`.

## Phase 1 - Stabilisation locale

- Installer avec `npm ci`.
- Valider les gates locaux: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run security:audit`.
- Verifier un feedback complet depuis `/demo` vers `/projects`.
- Verifier une creation d'issue manuelle avec un depot GitHub ou GitLab de test.
- Documenter toute exception `npm audit` avec package, CVE, impact et plan de correction avant ouverture beta.

## Phase 2 - GitHub et CI

- Garder `main` comme branche protegee.
- Exiger PR, CI verte, review et squash merge vers `main`.
- Utiliser une branche ou un environnement `staging` pour les essais beta.
- Tagger les versions beta: `v0.1.0-beta.1`, `v0.1.0-beta.2`, puis `v0.1.0`.
- Ne pas deployer si `npm run typecheck` ou `npm run build` echoue.

## Phase 3 - Staging connecte

- Creer des secrets separes pour `local`, `staging` et `production`.
- Appliquer les migrations Supabase `0001` a `0008`.
- Valider `npm run migrations:check`, `npm run env:check` et `npm run prod:check`.
- Configurer un depot GitHub/GitLab de test pour les issues beta.
- Restreindre les `allowedOrigins` aux domaines pilotes.
- Tester la persistance apres redemarrage.
- Tester un echec provider retryable et son rejeu.

## Phase 4 - Donnees et securite

- Interdire `DATA_STORE=file` en production beta.
- Utiliser Supabase REST/Postgres pour la beta reelle.
- Deplacer les captures vers un stockage objet avant volume public.
- Remplacer le rate limit memoire par un stockage partage si plusieurs instances servent l'API.
- Verifier RLS, backups, rotation de secrets et absence de secrets reels dans Git.

## Phase 5 - Domaine et beta

- Domaine cible courant: `https://app.changethis.dev`.
- Railway heberge l'app, OVH gere la zone DNS.
- Pointer `app.changethis.dev` vers la cible Railway.
- Verifier TLS, redirections HTTPS, CORS et configuration `NEXT_PUBLIC_APP_URL`.
- Activer uptime check et alertes sur 5xx, latence p95, echecs provider et feedbacks bloques en `retrying`.

## Go/No-Go

Go si les gates locaux et GitHub passent, si `AUTH_MODE=supabase`, `DATA_STORE=supabase`, `ENABLE_PUBLIC_SIGNUP=false`, `npm run prod:check` est vert, les migrations sont appliquees, `/api/health` et `/api/ready` sont verts, un feedback reel arrive dans `/projects`, DNS/TLS sont valides et les alertes minimales sont actives.

No-Go si `DATA_STORE=file` ou `AUTH_MODE=local` sert la production beta, si les migrations Supabase ne sont pas appliquees, si staging et production partagent des secrets, si les origines autorisees sont ouvertes trop largement, ou si une exception securite n'est pas documentee.
