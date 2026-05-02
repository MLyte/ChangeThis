# AGENTS.md

## Mission
Ce dépôt est un monorepo TypeScript/Next.js pour **ChangeThis** (widget de feedback + dashboard web + couche partagée).
Les futurs agents IA doivent prioriser la sécurité des changements et la progression incrémentale.

État produit/technique courant: consulter `docs/current-state.fr.md` avant de mettre à jour une documentation générale, une checklist de production ou une décision d'architecture.

## Règles de travail obligatoires
1. **Lire `AI_TODO.md` en premier** avant toute action pour comprendre le contexte, les notes de travail et les blocages connus.
2. Utiliser `AI_TODO.md` comme **carnet de travail**, pas comme file d'attente bloquante: une demande explicite de l'utilisateur prime sur l'ordre des tâches non cochées.
3. Travailler en **petites tâches atomiques**, avec un seul objectif clair par itération.
4. **Ne jamais lancer de refactor global** (structure, nomenclature, architecture transverse) sans demande explicite.
5. Limiter l’analyse au strict nécessaire pour la demande en cours; éviter le chargement massif du repo.
6. Ne modifier que les fichiers nécessaires à la demande active.
7. Après chaque changement, **tester** (lint/typecheck/tests ciblés) ou expliquer précisément pourquoi ce n’est pas possible.
8. **Documenter tout blocage** dans `AI_TODO.md` (section Workflow IA / blocages) avant de terminer.
9. En cas d’incertitude produit/technique, privilégier une proposition minimale et réversible.

## Portée & sécurité
- Respecter les variables d’environnement et ne jamais exposer de secrets.
- Éviter toute opération destructive non demandée.
- Conserver la compatibilité monorepo (`apps/*`, `packages/*`) et la cohérence des workspaces npm.

## Format d’exécution recommandé
1. Lire `AI_TODO.md`.
2. Exécuter la demande utilisateur en cours, ou à défaut choisir une tâche pertinente dans `AI_TODO.md`.
3. Faire les vérifications minimales pertinentes.
4. Mettre à jour `AI_TODO.md` si la demande correspond à une tâche suivie, si une note de travail utile a été ajoutée, ou si un blocage doit être documenté.
5. Proposer la prochaine micro-tâche.
