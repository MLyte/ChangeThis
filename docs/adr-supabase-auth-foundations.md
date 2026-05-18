# ADR: Supabase Auth foundations

Status update 2026-05-19: still accepted for the controlled open beta. Supabase Auth is the production path (`AUTH_MODE=supabase`), and Supabase REST/Postgres is also the current real data path (`DATA_STORE=supabase`). The local file store remains a development default only.

Current state reference: [current-state.fr.md](current-state.fr.md).

## Status
Accepted for the first auth foundation tranche.

## Context
ChangeThis needs production authentication without breaking the current local development loop. The product direction is controlled open beta: public signup can be enabled per environment, while workspace access and roles still come from membership records.

## Decision
- Use native Supabase Auth as the production authentication provider.
- Keep local development available through `AUTH_MODE=local`.
- Use `AUTH_MODE=supabase` to force Supabase token validation.
- Default to local auth outside production and Supabase auth in production when `AUTH_MODE` is unset.
- Use `ENABLE_PUBLIC_SIGNUP` as an explicit environment switch: `true` for open beta signup, `false` for private or paused environments.
- Keep `DATA_STORE=file` as the local data-store default. Use `DATA_STORE=supabase` for the real beta path and production-like environments.

## Consequences
- Backend routes can continue to call the existing session helpers while auth mode is made explicit.
- Workspace authorization can be layered in incrementally using workspace roles from `workspace_members`.
- Public signup is supported but must remain explicit per environment.
