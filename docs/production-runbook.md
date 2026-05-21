# ChangeThis Production Runbook

Etat actuel: voir [current-state.fr.md](current-state.fr.md).

Ce runbook couvre l'exploitation du chemin beta SaaS. Pour l'installation interne Ubuntu 24, utiliser [internal-ubuntu24-install.fr.md](internal-ubuntu24-install.fr.md).

## Go/No-Go beta SaaS

Checks locaux ou CI:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run security:audit
npm run migrations:check
npm run prod:check
```

Checks runtime:

- `/api/health` retourne `200`.
- `/api/ready` retourne `200`.
- Un feedback soumis depuis un vrai site connecte apparait dans `/projects`.
- Une issue GitHub ou GitLab peut etre creee manuellement depuis l'inbox.

No-go si:

- `AUTH_MODE=local` ou `DATA_STORE=file` est configure en production.
- `AUTH_MODE=ovh` ou `DATA_STORE=postgres` est configure.
- Les migrations Supabase attendues ne sont pas appliquees.
- `/api/ready` retourne `503`.
- Une exception `npm audit` high/critical n'est pas documentee avec package, CVE, impact et plan de correction.

## Variables beta SaaS

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

Optionnel selon les features activees:

```env
ENABLE_PUBLIC_SIGNUP=false
SUPABASE_REST_TIMEOUT_MS=10000
CHANGETHIS_CRON_SECRET=...
GITHUB_APP_SLUG=...
GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY=...
GITHUB_WEBHOOK_SECRET=...
GITLAB_OAUTH_APP_ID=...
GITLAB_OAUTH_APP_SECRET=...
GITLAB_WEBHOOK_SECRET=...
```

## Migrations

Appliquer les migrations Supabase dans l'ordre:

- `0001_initial_schema.sql`
- `0002_require_single_issue_target_per_project.sql`
- `0003_membership_credentials_public_keys.sql`
- `0004_feedback_resolution_statuses.sql`
- `0005_project_widget_settings.sql`
- `0006_feedback_repository_model_columns.sql`
- `0007_provider_integrations_workspace_storage.sql`
- `0008_feedback_operational_indexes.sql`
- `0009_public_launch_waitlist.sql`
- `0010_feedback_screenshot_lifecycle.sql`
- `0011_widget_reporter_fields.sql`
- `0012_restrict_membership_helper_execution.sql`
- `0013_project_issue_creation_mode.sql`

Verifier ensuite:

```bash
npm run migrations:check
npm run prod:check
```

## Provider credentials

Chemin prefere beta:

- GitHub App: `GITHUB_APP_SLUG`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`.
- GitLab OAuth: `GITLAB_OAUTH_APP_ID`, `GITLAB_OAUTH_APP_SECRET`, optional `GITLAB_BASE_URL`.
- Credentials stockes par workspace via `provider_integration_credentials`.

Fallback local/pilote:

- `GITHUB_TOKEN` ou `CHANGETHIS_GITHUB_TOKEN`
- `GITLAB_TOKEN` ou `CHANGETHIS_GITLAB_TOKEN`

Si un token est absent ou si le provider echoue, le feedback doit rester conserve et passer en `retrying` ou `failed`.

## Smoke post-deploy

Suivre [smoke-beta-controlee.fr.md](smoke-beta-controlee.fr.md).

Minimum:

```bash
npm run smoke:widget -- --base-url https://app.changethis.dev
```

Puis valider manuellement:

1. Connexion ou signup selon l'etat de `ENABLE_PUBLIC_SIGNUP`.
2. Site connecte avec origine exacte.
3. Widget visible sur une page externe.
4. Feedback visible dans `/projects`.
5. Issue creee dans le depot cible.

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
- pics `feedback_rejected_*`
- `provider_issue_create_failed` repetes
- feedbacks bloques en `retrying`
- taux 5xx API inhabituel

## Rollback

Rollback applicatif:

1. Revenir au dernier commit stable.
2. Relancer build et deploy.
3. Ne rollback une migration DB que si elle est explicitement reversible et que la sauvegarde est verifiee.

Le rollback DB reste a tester sur staging avant toute beta plus large.

## Caveats beta

- Rate limit public encore memoire.
- Screenshots compresses cote widget, mais stockage objet final non branche.
- Cron de nettoyage screenshots disponible via `/api/cron/storage-cleanup` si `CHANGETHIS_CRON_SECRET` est configure.
- Retry provider pas encore une queue durable.
- Webhooks provider incomplets.
