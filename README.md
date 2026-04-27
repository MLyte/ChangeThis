# ChangeThis

ChangeThis is a client feedback widget for websites in development that turns feedback into clean issues.

Clients click a fixed feedback button, add a note, pin a page element, or send a screenshot. ChangeThis turns that context into a clean issue with URL, viewport, browser details, screenshot metadata, and labels ready for triage.

## Product Direction

- **Audience:** freelancers, small web agencies, and studios shipping client websites.
- **Model:** open-core. The widget and core protocol can be open source; hosted dashboard, managed issue provider integrations, storage, teams, and AI triage are planned for the 2.0 hosted layer.
- **Promise:** clients point at what needs changing; developers receive actionable issues in GitHub or GitLab.

## MVP

- Fixed feedback widget
- Page comment mode
- Pin-on-page mode
- Screenshot capture mode
- Public API endpoint for feedback
- Provider-neutral issue draft generator
- Durable local feedback inbox with explicit statuses and audit events
- Manual GitHub/GitLab issue creation with idempotency keys and retry state
- Project public key and allowed-origin model

## Install A Widget

The hosted product should eventually expose:

```html
<script
  src="https://app.changethis.dev/widget.js"
  data-project="project_public_key">
</script>
```

For local development, build the widget package and load `http://127.0.0.1:3000/widget.js`.

When the widget is embedded on another local or production site, add that site to
`DEMO_PROJECT_ALLOWED_ORIGINS` so the public feedback API can answer CORS
preflight and POST requests.

The floating button can be adapted per site or page with `buttonLabel`,
`buttonStateLabel`, `buttonVariant` (`dev`, `prod`, `review`) and `visible`.

## Development

```bash
npm install
npm run dev
```

The local web app runs on `http://127.0.0.1:3000`.

Useful local routes:

- `/` landing page
- `/demo` test page that loads the real widget bundle against the local API
- `/projects` durable feedback inbox
- `/api/projects/issue-targets` server-side GitHub/GitLab destination configuration per site
- `/api/widget/config?project=demo_project_key` demo widget configuration
- `/api/public/feedback` feedback API endpoint
- `/api/projects/feedbacks/:id/issue` manual issue creation endpoint
- `/api/projects/retries` retry processor endpoint

To test the widget end-to-end locally:

```bash
npm run widget:build
npm run dev
```

Then open `http://127.0.0.1:3000/demo` and use the floating Feedback button. The feedback is persisted under `.changethis-data/feedback-store.json`, remains available after server restart, and appears in `/projects`.

To create external issues from `/projects`, set a provider token in `.env.local`:

```bash
GITHUB_TOKEN=github_pat_or_classic_token
GITLAB_TOKEN=gitlab_project_or_personal_token
```

Without a provider token, manual issue creation records a retryable failure instead of dropping the feedback. Replaying due retries is available from `/projects` or by posting to `/api/projects/retries`.

## Frontend Dependency Policy

To keep the workspace stable, maintain compatibility between Next.js and React before upgrading packages.

- Do not use `npm audit fix --force` in this repository because it can introduce breaking major changes.
- Prefer targeted upgrades, for example `npm install -w apps/web next@latest`, and validate with a web build before committing.
- Keep the baseline workflow: small iterations, one problem at a time, and `npm run build -w apps/web` as the final gate for frontend dependency changes.

## Validation

```bash
npm run build --workspace @changethis/widget
npm run typecheck --workspace @changethis/web
npm run lint --workspace @changethis/web
npm run build --workspace @changethis/web
```

## Repository Structure

```txt
apps/web             Next.js dashboard and API
packages/widget     Embeddable browser widget
packages/shared     Shared feedback types and provider-neutral issue formatting
docs                 Product and technical specs
supabase/migrations Future database schema
```
