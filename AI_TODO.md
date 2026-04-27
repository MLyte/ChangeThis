# AI_TODO.md

## Projet détecté
- **Type** : monorepo JavaScript/TypeScript orienté produit SaaS (widget embarquable + dashboard web + API).
- **Composants** :
  - `apps/web` : application Next.js (UI + routes API)
  - `packages/widget` : widget navigateur buildé via Vite
  - `packages/shared` : types/logique partagée
  - `supabase/migrations` : contrat de schéma DB (cible future)
- **Données locales** : stockage feedback durable via `CHANGETHIS_DATA_DIR` (ex. `.changethis-data/feedback-store.json`).
- **Intégrations** : GitHub/GitLab (création d’issues), Supabase (prévu/partiel selon environnement).

## Commandes utiles
- Installation / dev :
  - `npm install`
  - `npm run dev`
- Vérifications globales :
  - `npm test`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
- Vérifications ciblées :
  - `npm run build --workspace @changethis/shared`
  - `npm run build --workspace @changethis/widget`
  - `npm run typecheck --workspace @changethis/web`
  - `npm run lint --workspace @changethis/web`
  - `npm run build --workspace @changethis/web`

## Workflow IA
1. Lire `AGENTS.md`, puis revenir ici.
2. Prendre **uniquement** la première tâche non cochée.
3. Faire un changement minimal et réversible.
4. Exécuter les checks pertinents (ou expliquer le blocage).
5. Cocher la tâche, noter brièvement ce qui a été fait.
6. Si blocage : créer une note dans **Blocages** avec contexte + action proposée.

### Blocages
- Aucun pour l’instant.

## Roadmap courte (pragmatique)
- Stabiliser la documentation d’exploitation locale (env + runbook minimal).
- Fiabiliser la boucle qualité (lint/typecheck/tests ciblés par workspace).
- Renforcer progressivement la robustesse des flux feedback -> issue provider.

## Tâches atomiques
- [x] Vérifier et documenter (dans `docs/`) la liste minimale des variables d’environnement indispensables au lancement local, avec valeurs d’exemple non sensibles.
- [x] Exécuter `npm run typecheck` et noter les écarts éventuels par workspace.
- [x] Exécuter `npm run lint` et lister les corrections strictement nécessaires.
- [x] Valider le build du widget (`@changethis/widget`) puis du web (`@changethis/web`).
- [x] Rejouer un test manuel de flux `/demo` -> `/projects` et documenter le résultat.


## Notes de résultat
- 2026-04-27 : tâche 1 terminée via `docs/local-env-minimal.md` (minimum local + variables optionnelles providers + rappels de fallback local).
- 2026-04-27 : `npm run typecheck` OK sur `@changethis/shared`, `@changethis/widget`, `@changethis/web` (aucun écart détecté; warning npm local `Unknown env config "http-proxy"`).
- 2026-04-27 : `npm run lint` OK (aucune correction nécessaire; même warning npm local `http-proxy`).
- 2026-04-27 : build validé pour `@changethis/widget` puis `@changethis/web` (succès complet).
- 2026-04-27 : test flux `/demo` -> `/projects` validé en local via POST sur `/api/public/feedback` (200) puis vérification de présence du feedback dans `/projects`.

