# ADR: Supabase Auth foundations

Status update 2026-05-02: still accepted for the current beta. Supabase Auth is the production beta path (`AUTH_MODE=supabase`), and Supabase REST/Postgres is also the current real beta data path (`DATA_STORE=supabase`). The local file store remains a development default only.

Current state reference: [current-state.fr.md](current-state.fr.md).

## Status
Accepted for the first auth foundation tranche.

## Context
ChangeThis needs production authentication without breaking the current local prototype loop. The product direction is invite-first: workspace access is granted through membership records, not public self-signup.

## Decision
- Use native Supabase Auth as the production authentication provider.
- Keep local development available through `AUTH_MODE=local`.
- Use `AUTH_MODE=supabase` to force Supabase token validation.
- Default to local auth outside production and Supabase auth in production when `AUTH_MODE` is unset.
- Keep `ENABLE_PUBLIC_SIGNUP=false` as the default posture.
- Keep `DATA_STORE=file` as the local data-store default. Use `DATA_STORE=supabase` for the real beta path and production-like environments.

## Consequences
- Backend routes can continue to call the existing session helpers while auth mode is made explicit.
- Workspace authorization can be layered in incrementally using workspace roles from `workspace_members`.
- Public signup pages and flows are intentionally out of scope for this tranche.
