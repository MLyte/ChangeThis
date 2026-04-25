# ChangeThis

ChangeThis is a GitHub-first client feedback widget for websites in development.

Clients click a fixed feedback button, add a note, pin a page element, or send a screenshot. ChangeThis turns that context into a clean GitHub Issue with URL, viewport, browser details, screenshot metadata, and labels ready for triage.

## Product Direction

- **Audience:** freelancers, small web agencies, and studios shipping client websites.
- **Model:** open-core. The widget and core protocol can be open source; hosted dashboard, managed GitHub App, storage, teams, and AI triage become paid SaaS features.
- **Promise:** clients point at what needs changing; developers receive actionable GitHub Issues.

## MVP

- Fixed feedback widget
- Page comment mode
- Pin-on-page mode
- Screenshot capture mode
- Public API endpoint for feedback
- GitHub Issue body generator
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

## Development

```bash
npm install
npm run dev
```

## Repository Structure

```txt
apps/web             Next.js dashboard and API
packages/widget     Embeddable browser widget
packages/shared     Shared feedback types and GitHub Issue formatting
docs                 Product and technical specs
supabase/migrations Future database schema
```
