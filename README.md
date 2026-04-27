# ChangeThis

ChangeThis is a client feedback widget for websites in development that turns feedback into clean issues.

Clients click a fixed feedback button, add a note, pin a page element, or send a screenshot. ChangeThis turns that context into a clean issue with URL, viewport, browser details, screenshot metadata, and labels ready for triage.

## Product Direction

- **Audience:** freelancers, small web agencies, and studios shipping client websites.
- **Model:** open-core. The widget and core protocol can be open source; hosted dashboard, managed issue provider integrations, storage, teams, and AI triage are planned for the 2.0 hosted layer.
- **Promise:** clients point at what needs changing; developers receive actionable issues in GitHub or GitLab.

## MVP

- Fixed feedback widget with page comment, pin, and screenshot modes
- Public API endpoint for feedback validation and intake
- Local-session server store for received feedbacks
- Provider-neutral issue draft generator
- Dashboard inbox fed by real local submissions
- Project public key and allowed-origin model
- GitHub and GitLab destination setup shell

## Current State

The current product loop works locally:

1. Open the demo page.
2. Submit a feedback from the floating widget.
3. The API validates the payload and records it in the current Next.js process.
4. The dashboard inbox displays the received feedback and its generated issue draft.

This is not durable persistence yet. Restarting the Next.js process clears the local feedback store. Real persistence should replace this with Supabase/Postgres before real GitHub or GitLab issue creation is wired.

## Install a Widget

The hosted product should eventually expose:

```html
<script
  src="https://app.changethis.dev/widget.js"
  data-project="project_public_key">
</script>
```

For local development, build the widget package and load `http://127.0.0.1:3000/widget.js`.

When the widget is embedded on another local or production site, add that site to the matching project `allowedOrigins` configuration so the public feedback API can answer CORS preflight and POST requests.

The floating button can be adapted per site or page with `buttonLabel`,
`buttonStateLabel`, `buttonVariant` (`dev`, `prod`, `review`) and `visible`.

## Development

```bash
npm install
npm run dev
```

The local web app runs on `http://127.0.0.1:3000` or `http://localhost:3000`.

Optional local environment:

```bash
cp .env.example .env.local
```

Without `.env.local`, the default ChangeThis project key is `changethis_project_key`. The demo page reads the project key from the same project config used by the API.

Useful local routes:

- `/` landing page
- `/demo` test page that loads the real widget bundle against the local API
- `/projects` local-session feedback inbox
- `/api/widget/config?project=changethis_project_key` demo widget configuration
- `/api/public/feedback` feedback API endpoint

To test the widget end-to-end locally:

```bash
npm run widget:build
npm run dev
```

Then open `http://127.0.0.1:3000/demo` and use the floating Feedback button. After submission, open `/projects` to see the recorded feedback and generated issue draft.

## What Does Not Work Yet

- Feedback is not persisted after a server restart.
- Screenshots are accepted as payload data but are not stored in durable object storage.
- The dashboard does not create external GitHub or GitLab issues yet.
- Provider setup routes are placeholders until OAuth/GitHub App credentials are configured.
- There is no retry/idempotency flow for failed provider creation yet.

## Recommended Next Steps

1. Replace the local-session feedback store with Supabase/Postgres persistence.
2. Keep `/projects` backed by the same feedback repository abstraction.
3. Add a manual "Create issue" action from the inbox.
4. Implement GitHub issue creation behind the provider-neutral issue layer.
5. Add GitLab support through the same provider interface.
6. Move screenshots to durable storage before attaching them to external issues.

## Validation

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Repository Structure

```txt
apps/web             Next.js dashboard and API
packages/widget     Embeddable browser widget
packages/shared     Shared feedback types and provider-neutral issue formatting
docs                 Product and technical specs
supabase/migrations Future database schema
```
