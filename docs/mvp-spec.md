# ChangeThis MVP Spec

Etat actuel: voir [current-state.fr.md](current-state.fr.md).

## One-Line Pitch

Clients comment directly on a staging website. Developers receive clean issues with screenshots and technical context.

## Primary User

A freelance web developer or small agency that wants to stop collecting vague client feedback through emails, WhatsApp messages, PDFs, and screenshots without context.

## Client Flow

1. A fixed `Feedback` button appears on the website.
2. The client chooses one of the supported feedback modes:
   - page comment
   - pin an element
   - multiple pins
   - screenshot note
3. The client writes an optional message.
4. The widget sends the feedback with page metadata.
5. ChangeThis creates or prepares an issue in the configured destination.
6. The client sees a short success state.

## Captured Context

- Project public key
- Current URL
- Page title
- Path
- Feedback type
- Client message
- Browser user agent
- Viewport width and height
- Device pixel ratio
- Locale
- Timestamp
- Pin coordinates
- Best-effort CSS selector
- Target element text
- Screenshot data URL today; object storage path is the target for production hardening

## Default Issue Labels

- `source:client-feedback`
- `status:raw`
- `type:feedback`
- `type:design`
- `type:bug`
- `mode:comment`
- `mode:pin`
- `mode:screenshot`

## Not In MVP

- Billing
- Full image annotation editor
- Bidirectional issue provider sync
- Automatic PR creation
- AI triage
- Client accounts

## SaaS Milestones

1. Done/partial: issue provider flow for GitHub and GitLab, with GitHub prioritized for beta.
2. Done/partial: Supabase-backed projects, public keys, feedbacks, events, issue attempts and provider integrations with `DATA_STORE=supabase`.
3. Remaining: private screenshot storage with signed URLs.
4. Done: dashboard inbox with filters, actions, status metrics and manual issue creation.
5. Remaining: AI issue cleanup and duplicate detection.
6. Future: assisted Codex PR workflow.

## Beta Runtime

- Private beta: `ENABLE_PUBLIC_SIGNUP=false`.
- Production beta auth: `AUTH_MODE=supabase`.
- Production beta store: `DATA_STORE=supabase`.
- App host: Railway.
- DNS: OVH, target `https://app.changethis.dev`.
- `DATA_STORE=file` remains local/dev only.
