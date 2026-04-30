# ChangeThis

ChangeThis is a client feedback widget and product inbox for websites in development. Visitors can send feedback without creating an account; the product team signs in to triage those returns and turn them into GitHub or GitLab issues.

Clients click a fixed feedback button, add a note, pin one or more page elements, or send a screenshot. ChangeThis stores the context, keeps a durable inbox, and creates a provider-neutral issue draft with URL, viewport, browser details, pins, screenshot metadata, and labels ready for triage.

## Product Direction

- **Audience:** freelancers, small web agencies, studios, and product/design teams shipping client websites.
- **Model:** open-core. The widget and core protocol can be open source; hosted dashboard, managed provider integrations, storage, teams, and AI triage are planned for the hosted layer.
- **Promise:** clients point at what needs changing; teams receive actionable feedback, decide whether to create an issue, and keep a traceable history.

## Current Product Loop

1. A workspace owner signs in or creates an account.
2. The team connects GitHub and/or GitLab with a server-side token, OAuth flow, or GitHub App setup.
3. The owner adds a connected site in `/settings/connected-sites`, chooses a provider, selects a real accessible repository, and copies the generated widget script.
4. A visitor submits feedback from the widget. No visitor account is required.
5. `POST /api/public/feedback` validates the public project key, allowed origin, payload, and screenshot size, then stores the feedback under the site workspace.
6. The team reviews feedback in `/projects`, filters it, creates an issue, keeps it without an issue, archives it, retries provider failures, or checks whether the external issue has been closed.

## Implemented Features

- Public embeddable widget served from `/widget.js` and `/widget.global.js`.
- Feedback modes: note, pin, multiple pins, capture/screenshot.
- Per-pin feedback text and sent/unsent feedback management in the widget panel.
- Public feedback API with origin validation and local rate limiting.
- Durable file-backed local stores for feedback, connected sites, provider credentials, and disabled provider state.
- Dashboard inbox with filters by text, status, site, feedback type, and provider.
- Feedback actions: create issue, retry, keep without issue, archive, cancel submitted public feedback, and sync external issue state.
- Feedback statuses: `raw`, `issue_creation_pending`, `retrying`, `sent_to_provider`, `failed`, `kept`, `resolved`, `ignored`.
- Real connected-site flow: choose GitHub/GitLab, list repositories from the configured token, generate a site public key, copy the install snippet, test script installation, and delete the site.
- GitHub/GitLab provider badges and repository listing.
- GitHub/GitLab issue creation with idempotency keys and retry state.
- GitHub/GitLab issue lookup to move feedback to `resolved` when the external issue is closed.
- Git connection disable/reactivate flow.
- Supabase/local authentication modes, `/login`, `/signup`, `/logout`, auth callback cookies, protected dashboard routes, workspace roles, and a `/settings/users` members view.
- Sonner toasts for user feedback.

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

For a quick local smoke test, use `/demo`; it loads the local widget and sends feedback to the local API.

## Development

```bash
npm install
npm run dev
```

The local web app runs on `http://localhost:3000` by default. If the port is occupied, Next.js may choose another port; use the URL printed by the dev server.

Useful local routes:

- `/` landing page with product CTAs.
- `/signup` account/workspace creation entry point.
- `/login` authenticated console entry point.
- `/demo` test page that loads the real widget bundle against the local API.
- `/projects` designer/product inbox.
- `/settings/git-connections` GitHub/GitLab connection state.
- `/settings/connected-sites` real connected-site setup and widget script management.
- `/settings/users` workspace members view.
- `/api/widget/config?project=project_public_key` public widget configuration.
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

Then open `http://localhost:3000/demo` and use the floating Feedback button. Feedback and connected-site data are persisted under `.changethis-data/` by default.

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

GITLAB_TOKEN=gitlab_project_or_personal_token
# or
CHANGETHIS_GITLAB_TOKEN=gitlab_project_or_personal_token
GITLAB_BASE_URL=https://gitlab.com
```

For a self-hosted GitLab, set `GITLAB_BASE_URL` to the instance base URL, for example `https://gitrural.cra.wallonie.be`.

For Supabase auth experiments, set:

```env
AUTH_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`AUTH_MODE=local` is disabled automatically in production runtime. Production should use Supabase mode.

## Validation

```bash
npm run build --workspace @changethis/shared
npm run build --workspace @changethis/widget
npm run typecheck --workspace @changethis/web
npm run lint --workspace @changethis/web
npm run test --workspace @changethis/web
npm run build --workspace @changethis/web
```

Root-level equivalents are available:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

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
