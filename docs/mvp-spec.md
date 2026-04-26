# ChangeThis MVP Spec

## One-Line Pitch

Clients comment directly on a staging website. Developers receive clean issues with screenshots and technical context.

## Primary User

A freelance web developer or small agency that wants to stop collecting vague client feedback through emails, WhatsApp messages, PDFs, and screenshots without context.

## Client Flow

1. A fixed `Feedback` button appears on the website.
2. The client chooses one of three modes:
   - page comment
   - pin an element
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
- Screenshot data URL or storage path

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

1. Issue provider installation flow for GitHub and GitLab
2. Supabase-backed projects and feedbacks
3. Private screenshot storage
4. Dashboard inbox
5. AI issue cleanup and duplicate detection
6. Assisted Codex PR workflow
