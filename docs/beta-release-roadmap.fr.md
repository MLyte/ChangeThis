# Roadmap beta ChangeThis

Ce document transforme le plan de production en piste executable pour une beta publique ou semi-publique.

## Phase 1 - Stabilisation locale

- Installer avec `npm ci`.
- Valider les gates locaux: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
- Verifier un feedback complet depuis `/demo` vers `/projects`.
- Verifier une creation d'issue manuelle avec un depot GitHub ou GitLab de test.
- Documenter toute exception `npm audit` avant ouverture beta.

## Phase 2 - GitHub et CI

- Garder `main` comme branche protegee.
- Exiger PR, CI verte, review et squash merge vers `main`.
- Utiliser une branche ou un environnement `staging` pour les essais beta.
- Tagger les versions beta: `v0.1.0-beta.1`, `v0.1.0-beta.2`, puis `v0.1.0`.
- Ne pas deployer si `npm run typecheck` ou `npm run build` echoue.

## Phase 3 - Staging connecte

- Creer des secrets separes pour `local`, `staging` et `production`.
- Configurer un depot GitHub/GitLab de test pour les issues beta.
- Restreindre les `allowedOrigins` aux domaines pilotes.
- Tester la persistance apres redemarrage.
- Tester un echec provider retryable et son rejeu.

## Phase 4 - Donnees et securite

- Garder le store fichier uniquement pour beta single-instance controlee.
- Migrer vers Supabase/Postgres avant beta multi-client ou multi-instance.
- Deplacer les captures vers un stockage objet avant volume public.
- Remplacer le rate limit memoire par un stockage partage si plusieurs instances servent l'API.
- Verifier RLS, backups, rotation de secrets et absence de secrets reels dans Git.

## Phase 5 - Domaine et beta

- Acheter le domaine quand staging est vert et reproductible.
- Pointer `staging.<domaine>` vers l'environnement staging.
- Pointer `app.<domaine>` vers l'environnement beta.
- Verifier TLS, redirections HTTPS, CORS et configuration `NEXT_PUBLIC_APP_URL`.
- Activer uptime check et alertes sur 5xx, latence p95, echecs provider et feedbacks bloques en `retrying`.

## Go/No-Go

Go si les gates locaux et GitHub passent, si staging est deploye depuis GitHub, si un feedback reel cree une issue externe, si DNS/TLS sont valides et si les alertes minimales sont actives.

No-Go si le store fichier sert une beta multi-instance, si staging et production partagent des secrets, si les origines autorisees sont ouvertes trop largement, ou si une exception securite n'est pas documentee.
