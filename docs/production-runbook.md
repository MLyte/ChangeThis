# ChangeThis Production Runbook

## Go/No-Go checks

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Submit one feedback from `/demo`, restart the web server, verify it remains visible in `/projects`.
- Trigger manual issue creation from `/projects`.

## Runtime data

Local and staging deployments persist feedbacks in `CHANGETHIS_DATA_DIR`.
The default is `.changethis-data/feedback-store.json`.

For hosted production, migrate this repository abstraction to Supabase/Postgres using
`supabase/migrations/0001_initial_schema.sql` as the database contract.

## Provider tokens

- `GITHUB_TOKEN`: token allowed to create issues on the configured repositories.
- `GITLAB_TOKEN`: token allowed to create issues on the configured GitLab projects.

If a token is absent or the provider fails, the feedback is kept and marked as
`retrying` or `failed`. Retryable failures include rate limits, network errors,
and 5xx responses.

## Operational signals

Logs are JSON records with:

- `request_id`
- `project_id`
- `feedback_id`
- `provider`
- `external_url`

Alert on:

- repeated `feedback_rejected_*` spikes
- repeated `provider_issue_create_failed`
- feedbacks stuck in `retrying` beyond the expected retry window
