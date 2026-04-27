# Variables d’environnement minimales (local)

Ce document liste le **minimum utile** pour lancer ChangeThis en local, avec des valeurs d’exemple non sensibles.

## TL;DR
- Pour lancer `npm run dev` en local, **aucune variable n’est strictement obligatoire** : le repo possède des fallbacks pour les clés projet et le répertoire de stockage local.
- Certaines variables deviennent nécessaires seulement pour des fonctionnalités optionnelles (création d’issues GitHub/GitLab).

## Variables minimales recommandées

```env
# Optionnel (fallback automatique vers .changethis-data)
CHANGETHIS_DATA_DIR=.changethis-data

# Optionnel, mais nécessaire pour créer des issues GitHub depuis /projects
GITHUB_TOKEN=

# Optionnel, mais nécessaire pour créer des issues GitLab depuis /projects
GITLAB_TOKEN=
# Optionnel (défaut: https://gitlab.com)
GITLAB_BASE_URL=https://gitlab.com
```

## Détail par variable

| Variable | Obligatoire pour `npm run dev` | Quand l’ajouter | Exemple local |
|---|---|---|---|
| `CHANGETHIS_DATA_DIR` | Non | Changer l’emplacement du store feedback local | `.changethis-data` |
| `GITHUB_TOKEN` | Non | Activer la création d’issues GitHub | `github_pat_xxx` |
| `GITLAB_TOKEN` | Non | Activer la création d’issues GitLab | `glpat-xxx` |
| `GITLAB_BASE_URL` | Non | GitLab self-hosted | `https://gitlab.example.com` |

## Variables déjà fallbackées en local
- Les clés projet publiques (`NEXT_PUBLIC_*_PROJECT_KEY`) disposent de valeurs de fallback en local.
- En production (`VERCEL_ENV=production`), ces clés doivent être définies explicitement.

## Références
- Exemple de variables: `.env.example`
- Fallbacks clés projet et origines: `apps/web/lib/demo-project.ts`
- Tokens providers: `apps/web/lib/issue-providers.ts`
- Store local: `apps/web/lib/project-registry.ts` et `apps/web/lib/feedback-repository.ts`
