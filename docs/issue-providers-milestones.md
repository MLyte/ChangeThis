# GitHub and GitLab Issue Providers Milestones

## Goal

ChangeThis should let a project connect either GitHub or GitLab and keep the same transparent issue workflow:

1. A client submits feedback from the widget.
2. ChangeThis stores the feedback and context.
3. ChangeThis creates or prepares a clean issue in the configured destination.
4. The dashboard shows the same states, actions, retry flow, and external issue link for GitHub and GitLab.
5. Provider differences stay behind an internal issue provider layer.

The widget experience must remain provider-neutral. Clients should never need to know whether the team uses GitHub or GitLab.

## Milestone 1: Provider-Neutral Domain

### Scope

- Rename the shared issue draft model:
  - `GitHubIssueDraft` -> `IssueDraft`
  - `buildGitHubIssueDraft` -> `buildIssueDraft`
- Introduce provider-neutral shared types:
  - `IssueProvider = "github" | "gitlab"`
  - `IssueTarget`
  - `ExternalIssueRef`
- Rename provider-coupled feedback status values:
  - `sent_to_github` -> `sent_to_provider`
- Keep a temporary compatibility alias only if needed for a low-risk transition.

### Acceptance Criteria

- The shared package exposes provider-neutral issue types.
- The feedback payload sent by the widget is unchanged.
- Existing issue body output remains equivalent.
- No user-facing API response uses `github_issue_creation`.

### Tests

- Unit tests cover `buildIssueDraft`.
- Existing validation tests still pass.
- A regression test confirms labels and markdown body remain compatible with both providers.

## Milestone 2: Demo API and Project Config Abstraction

### Scope

- Replace demo project config `github` with `issueTarget`.
- Return `next: "issue_creation"` from the public feedback API.
- Return provider-neutral project destination metadata.
- Keep the current behavior as a draft response until real persistence is implemented.

### Acceptance Criteria

- `POST /api/public/feedback` succeeds for the existing demo project.
- The response contains `issueDraft` and `issueTarget`.
- The response does not leak private integration credentials or installation details.
- The widget does not require any change.

### Tests

- API-level tests cover:
  - valid feedback response shape;
  - unknown project;
  - forbidden origin;
  - oversized payload;
  - rate limit.

## Milestone 3: Provider-Neutral Database Schema

### Scope

- Generalize Supabase schema before real provider integration.
- Add or migrate toward:
  - `provider_integrations`
  - `issue_targets`
  - `external_issues`
  - provider-neutral feedback status fields
- Replace GitHub-only columns:
  - `projects.github_repo_owner`
  - `projects.github_repo_name`
  - `projects.github_installation_id`
  - `feedbacks.github_issue_number`
  - `feedbacks.github_issue_url`

### Acceptance Criteria

- Projects can reference a configured GitHub or GitLab issue target.
- Feedback records can reference an external issue without provider-specific columns.
- GitHub issue number and GitLab issue IID can both be represented.
- RLS policies still protect organization-owned data.

### Tests

- Migration applies cleanly on a fresh database.
- Constraints reject invalid providers and invalid feedback statuses.
- Repository/project target uniqueness is enforced where needed.

## Milestone 4: Issue Provider Interface

### Scope

- Add a server-only provider interface:

```ts
interface IssueProviderClient {
  provider: IssueProvider;
  createIssue(target: IssueTarget, draft: IssueDraft): Promise<ExternalIssueRef>;
  getIssue?(target: IssueTarget, ref: ExternalIssueRef): Promise<ExternalIssueRef>;
}
```

- Add provider error mapping:
  - `auth_failed`
  - `permission_denied`
  - `target_not_found`
  - `validation_failed`
  - `rate_limited`
  - `transient_failure`
- Add a provider resolver based on `issueTarget.provider`.

### Acceptance Criteria

- Application code creates issues through `IssueProviderClient`, not direct GitHub or GitLab branches.
- Provider errors map to stable internal error codes.
- Provider clients never run in browser bundles.

### Tests

- Unit tests cover provider resolution.
- Mock provider tests cover success and each error category.
- Typecheck proves provider clients are server-only.

## Milestone 5: GitHub Provider

### Scope

- Implement GitHub issue creation behind `IssueProviderClient`.
- Prefer GitHub App installation tokens for SaaS mode.
- Map:
  - `IssueDraft.title` -> GitHub `title`
  - `IssueDraft.description` -> GitHub `body`
  - `IssueDraft.labels` -> GitHub `labels`
  - GitHub `id`, `number`, `html_url` -> `ExternalIssueRef`

### Acceptance Criteria

- A configured GitHub project can create an issue from feedback.
- Created feedback stores the external issue reference.
- Permission and rate limit failures are visible in dashboard state.
- No GitHub token reaches the browser.

### Tests

- Mock GitHub success response.
- Mock GitHub `401`, `403`, `404`, `422`, `429`, and timeout.
- Retry does not duplicate an issue after a successful external creation.

## Milestone 6: GitLab Provider

### Scope

- Implement GitLab issue creation behind the same `IssueProviderClient`.
- Support GitLab.com first, with `baseUrl` ready for self-managed instances.
- Map:
  - `IssueDraft.title` -> GitLab `title`
  - `IssueDraft.description` -> GitLab `description`
  - `IssueDraft.labels` -> GitLab labels
  - GitLab `id`, `iid`, `web_url` -> `ExternalIssueRef`

### Acceptance Criteria

- A configured GitLab project can create an issue from the same feedback flow.
- GitLab project path or numeric project ID is supported.
- GitLab `iid` is displayed as the human-readable issue number.
- GitLab failures use the same dashboard states and retry actions as GitHub.

### Tests

- Mock GitLab success response.
- Mock GitLab `401`, `403`, `404`, `400/422`, `429`, and timeout.
- Self-managed `baseUrl` is validated and used by the client.

## Milestone 7: Persistence, Retry, and Idempotency

### Scope

- Persist feedback before creating any external issue.
- Move issue creation into a server-side action or job.
- Store:
  - feedback status;
  - provider attempt count;
  - last error code;
  - last error message;
  - external issue reference.
- Add manual retry support.
- Add idempotency keys to avoid duplicate issues.

### Acceptance Criteria

- Feedback is never lost if provider creation fails.
- Failed creation can be retried.
- Retry after a partial success does not create duplicates.
- Dashboard shows `raw`, `issue_creation_pending`, `sent_to_provider`, and `failed`.

### Tests

- Integration tests cover `raw -> sent_to_provider`.
- Integration tests cover `raw -> failed -> sent_to_provider`.
- Idempotency test simulates provider success followed by local database update failure.

## Milestone 8: Dashboard UX

### Scope

- Replace provider-specific wording with destination wording.
- Show provider as a small badge only where useful:
  - `GitHub - owner/repo`
  - `GitLab - group/project`
- Add common actions:
  - create issue;
  - retry;
  - open issue;
  - reconnect destination.
- Add clear states for missing permissions, missing destination, and temporary provider errors.

### Acceptance Criteria

- The dashboard workflow is identical for GitHub and GitLab.
- The widget remains provider-neutral.
- A user can understand whether feedback is pending, created, or failed.
- Provider-specific technical detail is available only when useful for troubleshooting.

### Tests

- Component tests cover status badges and actions.
- E2E tests cover GitHub and GitLab mocked destinations.
- Accessibility checks cover buttons, links, and error states.

## Milestone 9: Webhooks and Sync

### Scope

- Add webhook endpoints:
  - `/api/webhooks/github`
  - `/api/webhooks/gitlab`
- Verify provider signatures or webhook secrets.
- Store event IDs for idempotency.
- Normalize issue state updates into `external_issues`.
- Sync closed/reopened state back into dashboard.

### Acceptance Criteria

- GitHub and GitLab webhook events are verified before processing.
- Duplicate webhook deliveries are ignored.
- Issue state changes are reflected in ChangeThis.
- Invalid webhook requests are rejected without leaking secrets.

### Tests

- Signature verification tests for GitHub.
- Secret verification tests for GitLab.
- Duplicate delivery test.
- State transition tests for opened, closed, and reopened issues.

## Milestone 10: Observability and Operational Readiness

### Scope

- Add structured logs for feedback and issue creation.
- Add metrics for:
  - submission count;
  - validation failures;
  - provider creation attempts;
  - provider successes;
  - provider failures;
  - retry count;
  - pending and failed feedback count.
- Redact secrets, screenshot data URLs, and sensitive message content from logs.

### Acceptance Criteria

- Each feedback request has a request ID.
- Provider failures can be diagnosed without exposing credentials.
- Rate limits and provider outages are visible.
- Screenshot content is never logged.

### Tests

- Log redaction tests.
- Error mapping tests assert stable metric labels.
- Provider timeout and rate limit scenarios produce useful logs.

## Milestone 11: Documentation and Setup

### Scope

- Update README and product docs from GitHub-first to issue-provider language.
- Document GitHub setup.
- Document GitLab.com setup.
- Document self-managed GitLab constraints.
- Document required scopes, webhook secrets, and retry behavior.

### Acceptance Criteria

- A developer can configure a local mock provider.
- A developer can configure GitHub in staging.
- A developer can configure GitLab in staging.
- Docs explain what the browser widget can and cannot access.

### Tests

- Run all documented commands from a clean checkout.
- Confirm environment variable examples are complete.

## Milestone 12: End-to-End Acceptance

### Scope

- Validate the initial requested outcome:
  - GitHub integration works.
  - GitLab integration works.
  - Both share the same issue workflow.
  - The issue experience is transparent to users.
  - The feature is tested.

### Acceptance Criteria

- From `/demo`, a feedback submission creates an issue in a mocked GitHub destination.
- From `/demo`, the same feedback submission creates an issue in a mocked GitLab destination.
- In staging, GitHub creates a real issue with title, description, labels, and context.
- In staging, GitLab creates a real issue with title, description, labels, and context.
- Dashboard shows the same states and actions for both providers.
- Webhooks update issue state for both providers.
- CI runs unit, integration, and E2E tests.

### Tests

- Shared unit tests pass.
- API integration tests pass.
- Provider client mock tests pass.
- Dashboard component tests pass.
- E2E tests pass for GitHub and GitLab mocked flows.
- Manual staging smoke test passes for real GitHub and real GitLab projects.

## Delivery Order Recommendation

Ship the work in thin, reviewable slices:

1. Provider-neutral shared model and API response.
2. Provider-neutral database schema.
3. Provider interface and mocked provider.
4. GitHub provider behind the interface.
5. GitLab provider behind the same interface.
6. Persistence, retry, and idempotency.
7. Dashboard UX and provider setup.
8. Webhooks and sync.
9. Observability.
10. Full E2E acceptance.

The key rule: do not add GitLab as a conditional branch inside the current GitHub-first flow. Extract the issue provider layer first, then plug GitHub and GitLab into it.
