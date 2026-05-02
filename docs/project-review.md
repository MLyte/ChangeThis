# Current Project Review

Etat actuel: voir [current-state.fr.md](current-state.fr.md).

## General View

ChangeThis is no longer only a prototype. The widget, public API, dashboard inbox, connected-site setup, Supabase-backed repositories, workspace roles, provider integrations and manual issue creation flow all exist.

The product value remains clear: clients report page-specific feedback without an account, and the team triages those returns into GitHub/GitLab issues from one inbox.

## Current Strengths

- Public widget bundle served by `/widget.js` and `/widget.global.js`.
- Feedback modes: note, pin, multiple pins and screenshot/capture.
- `/projects` inbox with filters, status metrics and actions.
- Connected-site flow with allowed origin, public key, install snippet and script test.
- Supabase beta path for sites, public keys, feedbacks, status events, issue attempts, external issues and provider integrations.
- Private beta auth posture with `AUTH_MODE=supabase` and `ENABLE_PUBLIC_SIGNUP=false`.
- Production checks: `env:check`, `migrations:check`, `prod:check`, `/api/health`, `/api/ready`.

## Current Gaps

- The first-site onboarding is still too manual after account/workspace creation.
- `/demo` is useful commercially but must stay clearly separated from a real installation test.
- Screenshots are still stored as data URLs in the current beta data model.
- Public rate limiting is memory-backed and not ready for multi-instance production.
- Provider idempotence, locking, retries and webhooks need more production hardening.
- GitLab OAuth refresh is not yet a complete operational flow.
- Backup/restore, rollback and RLS validation still need a real staging pass.

## Recommended Next Steps

1. Apply migrations `0001` to `0007` on a clean Supabase staging project.
2. Run a real smoke test: `widget -> public feedback API -> /projects -> manual issue`.
3. Build the first-site onboarding checklist around Git connection, site creation, snippet install and feedback test.
4. Move screenshots to object storage or disable capture for the first private beta if needed.
5. Replace memory rate limiting with a shared store.
6. Strengthen provider idempotence and retry locking.

## Product Focus

Avoid expanding too early into billing, AI triage or broad platform work. The next useful product test is still simple:

> Can a client leave 10 pieces of feedback on a staging site, and does the developer save real time the next day?

If that loop works with Supabase persistence and a real Git issue target, the commercial layer has a solid base.
