# AGENTS.md

## Mission
Ce dépôt est un monorepo TypeScript/Next.js pour **ChangeThis** (widget de feedback + dashboard web + couche partagée).
Les futurs agents IA doivent prioriser la sécurité des changements et la progression incrémentale.

## Règles de travail obligatoires
1. **Lire `AI_TODO.md` en premier** avant toute action.
2. **Traiter uniquement la première tâche non cochée** (`- [ ]`) dans `AI_TODO.md`.
3. Travailler en **petites tâches atomiques**, avec un seul objectif clair par itération.
4. **Ne jamais lancer de refactor global** (structure, nomenclature, architecture transverse) sans demande explicite.
5. Limiter l’analyse au strict nécessaire pour la tâche en cours; éviter le chargement massif du repo.
6. Ne modifier que les fichiers nécessaires à la tâche active.
7. Après chaque changement, **tester** (lint/typecheck/tests ciblés) ou expliquer précisément pourquoi ce n’est pas possible.
8. **Documenter tout blocage** dans `AI_TODO.md` (section Workflow IA / blocages) avant de terminer.
9. En cas d’incertitude produit/technique, privilégier une proposition minimale et réversible.

## Portée & sécurité
- Respecter les variables d’environnement et ne jamais exposer de secrets.
- Éviter toute opération destructive non demandée.
- Conserver la compatibilité monorepo (`apps/*`, `packages/*`) et la cohérence des workspaces npm.

## Format d’exécution recommandé
1. Lire `AI_TODO.md`.
2. Exécuter la première tâche non cochée.
3. Faire les vérifications minimales pertinentes.
4. Mettre à jour `AI_TODO.md` (cases cochées, notes, blocages).
5. Proposer la prochaine micro-tâche.
