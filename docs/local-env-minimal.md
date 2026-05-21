# Variables d'environnement minimales

Etat actuel: voir [current-state.fr.md](current-state.fr.md).

Ce document liste le minimum utile pour lancer ChangeThis en local et les variables a ajouter pour tester les autres profils.

## Local simple

```env
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
AUTH_MODE=local
DATA_STORE=file
CHANGETHIS_DATA_DIR=.changethis-data
```

Commande:

```bash
npm run dev
```

Ce mode est reserve au developpement. Il ne doit jamais servir une production.

## Beta SaaS Supabase

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.changethis.dev
AUTH_MODE=supabase
DATA_STORE=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CHANGETHIS_SECRET_KEY=...
```

Checks:

```bash
npm run env:check
npm run migrations:check
npm run prod:check
```

## Installation interne

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://changethis.toolprod
AUTH_MODE=internal
DATA_STORE=internal
INTERNAL_API_URL=http://back.toolprod:8000
CHANGETHIS_SECRET_KEY=...
```

Le backend FastAPI utilise son propre fichier d'environnement:

```env
DATABASE_URL=postgresql+asyncpg://changethis:<secret>@localhost:5432/changethis
SESSION_SECRET=...
CHANGETHIS_SECRET_KEY=...
ALLOWED_PUBLIC_ORIGINS=https://changethis.toolprod
```

Runbook: [internal-ubuntu24-install.fr.md](internal-ubuntu24-install.fr.md).

## Variables optionnelles utiles en local

| Variable | Quand l'ajouter | Utilite |
|---|---|---|
| `GITHUB_TOKEN` | Tester creation d'issues GitHub sans integration workspace | Token provider de secours. |
| `CHANGETHIS_GITHUB_TOKEN` | Meme usage que `GITHUB_TOKEN` | Variante non conflictuelle avec GitHub App. |
| `GITLAB_TOKEN` | Tester GitLab local/pilote | Personal Access Token GitLab avec scope `api`. |
| `CHANGETHIS_GITLAB_TOKEN` | Meme usage que `GITLAB_TOKEN` | Variante non conflictuelle avec OAuth/token App. |
| `GITLAB_BASE_URL` | Tester GitLab self-hosted | Exemple: `https://gitrural.cra.wallonie.be`. |
| `SUPABASE_REST_TIMEOUT_MS` | Tester latence/timeouts Supabase | Timeout REST serveur. |
| `ENABLE_PUBLIC_SIGNUP=false` | Mettre le signup en pause | Utile pour staging prive. |

## No-go production

- `AUTH_MODE=local`
- `DATA_STORE=file`
- `AUTH_MODE=ovh`
- `DATA_STORE=postgres`
- `CHANGETHIS_DATA_DIR`
- secrets reels dans `.env.local` versionne ou dans Git
