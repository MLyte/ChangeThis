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
- Minimal dashboard shell
- Project public key and allowed-origin model

## Install A Widget

The hosted product should eventually expose:

```html
<script
  src="https://app.changethis.dev/widget.js"
  data-project="project_public_key">
</script>
```

For local development, build the widget package and load `packages/widget/dist/widget.global.js`.

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
- `/projects` mocked feedback inbox
- `/api/widget/config?project=demo_project_key` demo widget configuration
- `/api/public/feedback` feedback API endpoint

To test the widget end-to-end locally:

```bash
npm run widget:build
npm run dev
```

Then open `http://127.0.0.1:3000/demo` and use the floating Feedback button. The current MVP receives the feedback and returns a provider-neutral issue draft; it does not create the external issue yet.

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
