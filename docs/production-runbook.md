# ChangeThis Production Runbook Interne

Etat actuel: voir [current-state.fr.md](current-state.fr.md). Installation complete: voir [internal-ubuntu24-install.fr.md](internal-ubuntu24-install.fr.md).

Ce runbook couvre l'exploitation de ChangeThis sur l'installation interne CRA: `https://changethis.cra.wallonie.be`, Next.js + FastAPI + PostgreSQL interne.

## Go/No-Go

Checks locaux ou CI avant release:

```bash
npm test
npm run typecheck
npm run lint
npm run env:check
npm run build
```

Checks backend:

```bash
cd apps/api
python -m pytest
alembic upgrade head
```

Checks runtime:

- `systemctl status changethis-web` retourne un service actif.
- `systemctl status changethis-api` retourne un service actif.
- `curl -fsS https://changethis.cra.wallonie.be/api/health` retourne `200`.
- `curl -fsS https://changethis.cra.wallonie.be/api/ready` retourne `200`.
- Un feedback soumis depuis un vrai site connecte apparait dans `/projects`.
- Une issue GitHub ou GitLab peut etre creee manuellement depuis l'inbox.

No-go si:

- `AUTH_MODE=local` ou `DATA_STORE=file` sert l'environnement interne.
- `AUTH_MODE=ovh` ou `DATA_STORE=postgres` est configure.
- `INTERNAL_API_URL` ne pointe pas vers FastAPI.
- `alembic upgrade head` n'a pas ete applique sur PostgreSQL interne.
- `/api/ready` retourne `503`.
- Une exception `npm audit` high/critical n'est pas documentee avec package, CVE, impact et plan de correction.

## Variables frontend

Fichier attendu: `/etc/changethis/web.env`.

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://changethis.cra.wallonie.be
AUTH_MODE=internal
DATA_STORE=internal
INTERNAL_API_URL=http://back.toolprod:8000
CHANGETHIS_SECRET_KEY=...
ENABLE_PUBLIC_SIGNUP=false
```

Optionnel selon les features activees:

```env
CHANGETHIS_CRON_SECRET=...
GITHUB_APP_SLUG=...
GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY=...
GITHUB_WEBHOOK_SECRET=...
GITLAB_OAUTH_APP_ID=...
GITLAB_OAUTH_APP_SECRET=...
GITLAB_WEBHOOK_SECRET=...
```

## Variables backend

Fichier attendu: `/etc/changethis/api.env`.

```env
DATABASE_URL=postgresql+asyncpg://changethis:<secret>@localhost:5432/changethis
SESSION_SECRET=...
CHANGETHIS_SECRET_KEY=...
ALLOWED_PUBLIC_ORIGINS=https://changethis.cra.wallonie.be
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITLAB_OAUTH_APP_ID=
GITLAB_OAUTH_APP_SECRET=
```

Les secrets ne doivent pas etre commits. Les fichiers d'environnement doivent etre lisibles uniquement par l'utilisateur applicatif et les administrateurs systeme autorises.

## Migrations

Appliquer les migrations FastAPI/Alembic sur le backend:

```bash
sudo -u changethis bash -lc 'set -a && . /etc/changethis/api.env && set +a && cd /opt/changethis/repo/apps/api && . .venv/bin/activate && alembic upgrade head'
```

Verifier l'etat:

```bash
sudo -u changethis bash -lc 'set -a && . /etc/changethis/api.env && set +a && cd /opt/changethis/repo/apps/api && . .venv/bin/activate && alembic current'
```

Rollback:

- privilegier les migrations forward-only;
- ne downgrader qu'avec sauvegarde PostgreSQL verifiee;
- documenter la revision cible, l'impact donnees et la commande executee.

## Smoke post-deploy

```bash
curl -fsS https://changethis.cra.wallonie.be/api/health
curl -fsS https://changethis.cra.wallonie.be/api/ready
```

Validation manuelle:

1. Se connecter a l'admin.
2. Verifier ou creer une connexion GitHub/GitLab.
3. Creer un site connecte avec origine exacte.
4. Installer le snippet `https://changethis.cra.wallonie.be/widget.js`.
5. Soumettre un feedback depuis le site autorise.
6. Verifier le feedback dans `/projects`.
7. Creer une issue dans le depot cible.

## Provider credentials

Chemins supportes:

- GitHub App: `GITHUB_APP_SLUG`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`.
- GitLab OAuth: `GITLAB_OAUTH_APP_ID`, `GITLAB_OAUTH_APP_SECRET`, optional `GITLAB_BASE_URL`.
- Fallback pilote: `GITHUB_TOKEN` / `CHANGETHIS_GITHUB_TOKEN`, `GITLAB_TOKEN` / `CHANGETHIS_GITLAB_TOKEN`.

Si un token est absent ou si le provider echoue, le feedback doit rester conserve et passer en `retrying` ou `failed`.

## Operational signals

Logs a conserver ou renforcer:

- `request_id`
- `workspace_id`
- `project_id`
- `feedback_id`
- `provider`
- `external_url`

Alertes minimales:

- `/api/ready` en `503`
- service systemd en echec
- pics `feedback_rejected_*`
- `provider_issue_create_failed` repetes
- feedbacks bloques en `retrying`
- taux 5xx API inhabituel

## Rollback

Rollback applicatif:

1. Revenir au dernier commit stable.
2. Relancer build et deploy via `scripts/internal/deploy.sh`.
3. Redemarrer `changethis-web` et `changethis-api`.
4. Verifier `/api/health`, `/api/ready`, puis un feedback test.

Rollback DB:

1. Ne pas executer de downgrade sans sauvegarde verifiee.
2. Preferer un correctif forward-only si la migration a deja ete appliquee.
3. Si un restore PostgreSQL est necessaire, isoler l'application avant reprise du trafic.

## Caveats

- Les repositories Next.js doivent encore etre migres progressivement vers le client serveur FastAPI interne.
- Rate limit public encore memoire.
- Screenshots compresses cote widget, mais stockage objet final non branche.
- Retry provider pas encore une queue durable.
- Webhooks provider incomplets.
