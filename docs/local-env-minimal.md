# Variables d’environnement minimales (local)

Ce document liste le minimum utile pour lancer ChangeThis en local et les variables à activer pour tester des features complètes.

## TL;DR

- `npm run dev` en local fonctionne avec :
  - `NEXT_PUBLIC_APP_URL` (URL de l’app)
  - `AUTH_MODE=local`
  - `DATA_STORE=file`
- Les autres variables sont optionnelles selon le flux que vous voulez activer.

## Variables minimales recommandées

```env
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
AUTH_MODE=local
DATA_STORE=file
CHANGETHIS_DATA_DIR=.changethis-data
```

## Variables optionnelles en local

| Variable | Quand l’ajouter | Utilité |
|---|---|---|
| `CHANGETHIS_DATA_DIR` | Changer l’emplacement du store local | Emplacement alternatif du dossier de persistance locale. |
| `GITHUB_TOKEN` | Activer la création d’issues GitHub | Provider token de secours pour `/projects` (si pas d’intégration App). |
| `CHANGETHIS_GITHUB_TOKEN` | Même usage que `GITHUB_TOKEN` | Variante non conflictuelle avec le secret GitHub App. |
| `GITLAB_TOKEN` | Activer la création d’issues GitLab | Provider token GitLab (défaut self-hosting via `GITLAB_BASE_URL`). |
| `CHANGETHIS_GITLAB_TOKEN` | Même usage que `GITLAB_TOKEN` | Variante non conflictuelle avec OAuth/token App. |
| `GITLAB_BASE_URL` | Tester GitLab self-hosted | URL de votre instance GitLab. |
| `NEXT_PUBLIC_SUPABASE_URL` | Expérimenter le mode Supabase | Active le client Supabase public. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Expérimenter le mode Supabase | Clé anonyme Supabase côté client. |
| `SUPABASE_SERVICE_ROLE_KEY` | Expérimenter le mode Supabase | Requis pour les appels REST serveur Supabase. |
| `NEXT_PUBLIC_*_PROJECT_KEY` | Utiliser vos propres clés de demo-project | Remplace les clés fallback de démonstration. |

## Variables de production à connaître (références)

- `CHANGETHIS_SECRET_KEY` (obligatoire en production pour le stockage credential sécurisé).
- Variables `GITHUB_APP_*`, `GITHUB_INSTALLATION_ID`, `GITLAB_OAUTH_*`, `*_WEBHOOK_SECRET` quand les intégrations OAuth/App sont activées.
- Intégrations par workspace: `*_PROVIDER_INTEGRATION_ID` et connexions persistées.
