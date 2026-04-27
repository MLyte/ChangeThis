# Current Project Review

## General View

For the 2.0 direction, the project is on a healthy track. The problem is clear, the MVP scope is understandable, and the flow from client feedback to an actionable issue has real value for freelancers, small agencies, and studios.

The strongest point right now is that the widget, API, and provider-neutral issue draft generation already exist. This is more than a landing page.

## Current Gaps

- Feedback is only stored in the local Next.js process for the current session.
- The inbox reads real local-session submissions, but not a durable database yet.
- There is no feedback history.
- External issue creation is not wired yet.
- Provider failures cannot be retried or diagnosed from stored state.

The biggest missing piece is persistence. Before integrating real GitHub or GitLab issue creation, each feedback should be stored in the database. That gives the product a reliable source of truth and makes retries, dashboards, and debugging possible.

## Recommended Next Steps

1. Replace the local-session feedback store with Supabase/Postgres persistence.
2. Keep `/projects` connected to the feedback repository instead of static mocks.
3. Track statuses such as `raw`, `sent_to_provider`, and `failed`.
4. Add a manual "Create issue" action from the inbox.
5. Add GitHub App and GitLab integration after the manual workflow is validated.
6. Add durable screenshot storage after the core feedback flow is stable.

## Product Focus

The project should avoid expanding too early into teams, AI, or a broad platform. The next useful product test is simple:

> Can a client leave 10 pieces of feedback on a staging site, and does the developer save real time the next day?

If that loop works well, the rest of the product has a solid base.
