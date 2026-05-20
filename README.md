# ChangeThis

## What Is Different From `main` And Why

`CRAW` is the self-hosted migration branch. `main` remains the controlled beta path for ChangeThis hosted on Railway with Supabase Auth/Postgres. This branch explores how to run the project on CRAW-controlled servers and, progressively, how to remove the required Supabase and Railway dependencies.

The intentional differences from `main` are:

- **Deployment target:** adds Docker and Compose assets so the app can be built and run on a VPS, Proxmox/LXC, Coolify, or another CRAW-managed runtime instead of Railway.
- **Runtime modes:** introduces `AUTH_MODE=craw` and `DATA_STORE=postgres` as explicit future modes. They are recognized by environment checks and readiness checks, but the full auth and Postgres adapters are not complete yet.
- **Safety behavior:** when `DATA_STORE=postgres` is enabled, stores that have not been migrated fail clearly instead of silently falling back to local JSON files.
- **Architecture notes:** adds a CRAW plan that favors a reversible migration: keep the current Next.js app and widget, add clean auth/data/storage/job contracts, then decide whether Django should own auth/admin/jobs or the full backend API.
- **Current production status:** this branch is not the hosted beta production path. It is a work branch for CRAW infrastructure and self-hosted portability.

Start with [docs/craw-self-hosted-plan.fr.md](docs/craw-self-hosted-plan.fr.md) for the target architecture and [docs/self-hosted-runtime.md](docs/self-hosted-runtime.md) for the Docker/Supabase runtime fallback.

ChangeThis is a client feedback widget and product inbox for websites in development. Visitors can send feedback without creating an account; the product team signs in to triage those returns and turn them into GitHub or GitLab issues.

Clients click a fixed feedback button, add a note, pin one or more page elements, or send a screenshot. ChangeThis stores the context, keeps a durable inbox, and creates a provider-neutral issue draft with URL, viewport, browser details, pins, screenshot metadata, and labels ready for triage.

## Product Direction

- **Audience:** freelancers, small web agencies, studios, and product/design teams shipping client websites.
- **Model:** open source under the European Union Public Licence 1.2, with hosted operations and support offered by ChangeThis.
- **Promise:** clients point at what needs changing; teams receive actionable feedback, decide whether to create an issue, and keep a traceable history.
- **Current beta posture:** controlled open beta, Railway app hosting, Supabase Auth/DB for the real path, OVH DNS for `app.changethis.dev`.

See [docs/current-state.fr.md](docs/current-state.fr.md) for the synchronized current-state snapshot used by the documentation.

## Current Product Loop

1. A workspace owner signs in or creates an account when public signup is enabled for the environment.
2. The team connects GitHub and/or GitLab with a server-side token, OAuth flow, or GitHub App setup.
3. The owner adds a connected site in `/settings/connected-sites`, chooses a provider, selects a real accessible repository, and copies the generated widget script.
4. A visitor submits feedback from the widget. No visitor account is required.
5. `POST /api/public/feedback` validates the public project key, allowed origin, payload, and screenshot size, then stores the feedback under the site workspace.
6. The team reviews feedback in `/projects`, filters it, creates an issue, keeps it without an issue, archives it, retries provider failures, or checks whether the external issue has been closed.

## Implemented Features

- Public embeddable widget served from `/widget.js` and `/widget.global.js`.
- Feedback modes: note, pin, multiple pins, capture/screenshot.
- Per-pin feedback text and sent/unsent feedback management in the widget panel.
- Public feedback API with origin validation and local rate limiting. The local limiter is a known beta hardening item for multi-instance deployments.
- Supabase-backed repositories for the real beta path: feedbacks, status events, connected sites, public keys, provider integrations, encrypted provider credentials, attempts, and external issues.
- File-backed stores kept for local development with `DATA_STORE=file`.
- Dashboard inbox with filters by text, status, site, feedback type, and provider.
- Feedback actions: create issue, retry, keep without issue, archive, cancel submitted public feedback, and sync external issue state.
- Feedback statuses: `raw`, `issue_creation_pending`, `retrying`, `sent_to_provider`, `failed`, `kept`, `resolved`, `ignored`.
- Real connected-site flow: choose GitHub/GitLab, list repositories from the configured token, generate a site public key, copy the install snippet, test script installation, and delete the site.
- GitHub/GitLab provider badges and repository listing.
- GitHub/GitLab issue creation with idempotency keys and retry state.
- GitHub/GitLab issue lookup to move feedback to `resolved` when the external issue is closed.
- Git connection disable/reactivate flow.
- Supabase/local authentication modes, `/login`, `/signup`, `/logout`, auth callback cookies, protected dashboard routes, workspace roles, and a `/settings/users` members view. Production beta must use `AUTH_MODE=supabase`.
- Sonner toasts for user feedback.
- Production readiness endpoints: `/api/health` and `/api/ready`.

## Install A Widget

A connected site exposes a snippet like:

```html
<script src="https://app.changethis.dev/widget.js" data-project="project_public_key"></script>
```

In local development, the app serves the same widget route from the web server:

```html
<script src="http://localhost:3000/widget.js" data-project="project_public_key"></script>
```

Create the site from `/settings/connected-sites` so the public key, allowed site URL, and Git issue destination are stored together. The public feedback API only accepts requests whose `Origin` matches the connected site URL.

For a quick local smoke test, use `/demo`; it loads the real widget bundle and sends feedback to the current app API. A production/beta validation should use a real connected site and the script test in `/settings/connected-sites`.

## License

ChangeThis is licensed under the European Union Public Licence, version 1.2 (`EUPL-1.2`).

See `LICENSE.md`, `NOTICE.md`, and the package-level license files for details. Third-party dependencies remain under their own licenses.

## Development

```bash
npm install
npm run dev
```

The local web app runs on `http://localhost:3000` by default. If the port is occupied, Next.js may choose another port; use the URL printed by the dev server.

Useful local routes:

- `/` landing page with product CTAs.
- `/signup` account/workspace creation entry point, gated by `ENABLE_PUBLIC_SIGNUP`.
- `/api/cron/storage-cleanup` protected weekly cleanup for screenshot lifecycle (`Authorization: Bearer $CHANGETHIS_CRON_SECRET`).
- `/login` authenticated console entry point.
- `/demo` widget sandbox page that loads the real widget bundle against the current API.
- `/projects` designer/product inbox.
- `/settings/git-connections` GitHub/GitLab connection state.
- `/settings/connected-sites` real connected-site setup and widget script management.
- `/settings/users` workspace members view.
- `/api/widget/config?project=project_public_key` public widget configuration, including per-site reporter fields.
- `/api/public/feedback` public feedback ingestion.
- `/api/public/feedback/:id/cancel` public cancellation endpoint used by the widget.
- `/api/projects/sites` connected-site API.
- `/api/projects/sites/:projectKey/script-test` script installation check.
- `/api/projects/feedbacks/:id/issue` manual issue creation endpoint.
- `/api/projects/feedbacks/:id/keep` keep feedback without creating an issue.
- `/api/projects/feedbacks/:id/sync` sync external issue state.
- `/api/projects/retries` retry processor endpoint.

To test the widget end-to-end locally:

```bash
npm run widget:build
npm run dev
```

Then open `http://localhost:3000/demo` and use the floating Feedback button. For beta/prod validation, create a connected site and test the generated snippet on the target origin.

## Local Configuration

Minimum useful `.env.local` for local development:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_MODE=local
DATA_STORE=file
CHANGETHIS_DATA_DIR=.changethis-data
```

To list repositories and create external issues from `/projects`, add provider tokens:

```env
GITHUB_TOKEN=github_pat_or_classic_token
# or
CHANGETHIS_GITHUB_TOKEN=github_pat_or_classic_token

GITLAB_TOKEN=gitlab_personal_access_token
# or
CHANGETHIS_GITLAB_TOKEN=gitlab_personal_access_token
GITLAB_BASE_URL=https://gitlab.com
```

For GitLab, prefer a Personal Access Token with the `api` scope so ChangeThis can list every project the GitLab user can access and create issues in the selected project. For a self-hosted GitLab, set `GITLAB_BASE_URL` to the instance base URL, for example `https://gitrural.cra.wallonie.be`. A project-scoped token still works as a fallback when you paste the exact project URL in the connected-site form.

For the real beta path, use Supabase:

```env
AUTH_MODE=supabase
DATA_STORE=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CHANGETHIS_SECRET_KEY=...
```

`AUTH_MODE=local` and `DATA_STORE=file` are disabled/no-go for production beta. Railway PostgreSQL native `DATABASE_URL` is not consumed by the current code path.

On the `CRAW` branch, the self-hosted target is being introduced behind explicit runtime flags:

```env
AUTH_MODE=craw
DATA_STORE=postgres
DATABASE_URL=postgresql://...
CRAW_AUTH_SHARED_SECRET=...
# or CRAW_AUTH_JWKS_URL=https://...
```

This mode is a migration target, not a complete replacement yet: Supabase-backed repositories still carry the current beta path until the Postgres adapters are implemented.

## Validation

```bash
npm run build --workspace @changethis/shared
npm run build --workspace @changethis/widget
npm run typecheck --workspace @changethis/web
npm run lint --workspace @changethis/web
npm run test --workspace @changethis/web
npm run migrations:check
npm run prod:check
npm run build --workspace @changethis/web
```

Root-level equivalents are available:

```bash
npm run typecheck
npm run lint
npm run test
npm run migrations:check
npm run prod:check
npm run build:prod
npm run build
```

## Self-Hosted Runtime

La branche experimentale `infra/self-hosted-runtime` documente un runtime Docker alternatif pour VPS, Coolify ou Proxmox/LXC, en conservant Supabase pour PostgreSQL/Auth/Storage. Voir [docs/self-hosted-runtime.md](docs/self-hosted-runtime.md).

La branche `CRAW` va plus loin et cible une installation sans Railway ni Supabase. Voir [docs/craw-self-hosted-plan.fr.md](docs/craw-self-hosted-plan.fr.md).

## Frontend Dependency Policy

To keep the workspace stable, maintain compatibility between Next.js and React before upgrading packages.

- Do not use `npm audit fix --force` in this repository because it can introduce breaking major changes.
- Prefer targeted upgrades, for example `npm install -w apps/web next@latest`, and validate with a web build before committing.
- Keep the baseline workflow: small iterations, one problem at a time, and `npm run build --workspace @changethis/web` as the final gate for frontend dependency changes.

## Repository Structure

```txt
apps/web             Next.js dashboard, landing page, auth, settings, and API routes
packages/widget     Embeddable browser widget
packages/shared     Shared feedback types and provider-neutral issue formatting
supabase/migrations Database schema and status migrations
docs                 Product and technical specs
```

## Known Follow-ups

- Migrate Next.js `middleware.ts` to the newer `proxy.ts` convention.
- Move local rate limiting to a shared store for serverless production.
- Sign OAuth state with a server secret before relying on provider OAuth in production.
- Store screenshots in object storage with short-lived signed URLs instead of JSON data URLs.
- Strengthen provider idempotence/locking and durable retry processing.
