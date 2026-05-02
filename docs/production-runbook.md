# ChangeThis Production Runbook

Etat actuel: voir [current-state.fr.md](current-state.fr.md).

## Go/No-Go checks

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run security:audit`
- `npm run migrations:check`
- `npm run prod:check`
- `/api/health` returns `200`.
- `/api/ready` returns `200`.
- Submit one feedback from a real connected site, verify it remains visible in `/projects`.
- Trigger manual issue creation from `/projects`.

`npm run security:audit` is non destructive and runs `npm audit --audit-level=high`.
Do not ship with a high or critical advisory unless the exception is documented
with the package, CVE, impact, and correction plan.

## Runtime data

Local development can use `AUTH_MODE=local`, `DATA_STORE=file` and `CHANGETHIS_DATA_DIR=.changethis-data`.

Production beta must use:

```env
AUTH_MODE=supabase
DATA_STORE=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CHANGETHIS_SECRET_KEY=...
```

Apply migrations `supabase/migrations/0001_*.sql` through `0007_*.sql` before a real beta smoke test.
`CHANGETHIS_DATA_DIR` is not part of the production beta path.

## Provider credentials

The preferred beta path is workspace-backed provider integrations:

- GitHub App: `GITHUB_APP_SLUG`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`.
- GitLab OAuth: `GITLAB_OAUTH_APP_ID`, `GITLAB_OAUTH_APP_SECRET`, optional `GITLAB_BASE_URL`.
- Credentials are stored encrypted applicatively through `provider_integration_credentials` when `DATA_STORE=supabase`.

Fallback env tokens remain useful for local/pilot work:

- `GITHUB_TOKEN` or `CHANGETHIS_GITHUB_TOKEN`
- `GITLAB_TOKEN` or `CHANGETHIS_GITLAB_TOKEN`

If a token is absent or the provider fails, the feedback is kept and marked as
`retrying` or `failed`. Retryable failures include rate limits, network errors,
and 5xx responses.

## Operational signals

Logs should include or evolve toward:

- `request_id`
- `workspace_id`
- `project_id`
- `feedback_id`
- `provider`
- `external_url`

Alert on:

- repeated `feedback_rejected_*` spikes
- repeated `provider_issue_create_failed`
- feedbacks stuck in `retrying` beyond the expected retry window
- `/api/ready` returning `503`

## Known beta caveats

- Public rate limiting is still memory-backed.
- Screenshots are still stored as data URLs until object storage is implemented.
- Provider retry processing is not a full durable queue yet.
- Rollback and backup/restore procedures must be validated on staging before wider beta.
