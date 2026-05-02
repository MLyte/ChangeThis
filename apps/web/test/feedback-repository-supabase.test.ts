import assert from "node:assert/strict";
import test from "node:test";
import { buildIssueDraft, type FeedbackPayload, type IssueTarget } from "@changethis/shared";

process.env.DATA_STORE = "supabase";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";

type FeedbackRepositoryModule = typeof import("../lib/feedback-repository.ts");

const {
  SupabaseFeedbackRepository,
  getFeedbackRepository
} = await import(`${new URL("../lib/feedback-repository.ts", import.meta.url).href}?supabase-feedback-test`) as FeedbackRepositoryModule;

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

const workspaceId = "11111111-1111-4111-8111-111111111111";
const otherWorkspaceId = "99999999-9999-4999-8999-999999999999";
const projectId = "22222222-2222-4222-8222-222222222222";
const issueTargetId = "33333333-3333-4333-8333-333333333333";
const projectKey = "ct_active_feedback_key";

const issueTarget: IssueTarget = {
  provider: "github",
  namespace: "agency",
  project: "client-portal",
  webUrl: "https://github.com/agency/client-portal"
};

test("getFeedbackRepository keeps file mode by default", async () => {
  const previousMode = process.env.DATA_STORE;
  delete process.env.DATA_STORE;
  const module = await import(`${new URL("../lib/feedback-repository.ts", import.meta.url).href}?file-default-test`) as FeedbackRepositoryModule;
  const repository = module.getFeedbackRepository();
  if (previousMode === undefined) {
    delete process.env.DATA_STORE;
  } else {
    process.env.DATA_STORE = previousMode;
  }

  assert.equal(repository.constructor.name, "FileFeedbackRepository");
});

test("getFeedbackRepository switches to Supabase when DATA_STORE is supabase", () => {
  const repository = getFeedbackRepository();

  assert.equal(repository.constructor.name, "SupabaseFeedbackRepository");
});

test("Supabase repository covers feedback lifecycle with workspace scope", async () => {
  const fake = createFakeSupabase();
  globalThis.fetch = fake.fetch;
  const repository = new SupabaseFeedbackRepository();
  const payload = feedbackPayload();
  const draft = buildIssueDraft(payload);

  const created = await repository.create({
    projectKey,
    projectName: "Client Portal",
    issueTarget,
    payload,
    issueDraft: draft,
    screenshotDataUrl: "data:image/png;base64,AAAA",
    workspaceId
  });

  assert.equal(created.status, "raw");
  assert.equal(created.workspaceId, workspaceId);
  assert.equal(created.payload.screenshotDataUrl, undefined);
  assert.equal(created.payload.metadata.language, "fr-BE");
  assert.equal(created.screenshotAsset?.mimeType, "image/png");
  const listed = await repository.list({ workspaceId });
  assert.deepEqual(listed.map((feedback) => feedback.id), [created.id]);
  assert.equal(listed[0].payload.metadata.language, "fr-BE");
  assert.equal(listed[0].screenshotAsset?.dataUrl, "data:image/png;base64,AAAA");
  assert.equal(listed[0].issueDraft.title, draft.title);
  assert.equal(await repository.get(created.id, { workspaceId: otherWorkspaceId }), undefined);

  const updatedDraft = { ...draft, title: "[Feedback] Updated title" };
  const withDraft = await repository.updateIssueDraft(created.id, updatedDraft, { workspaceId });
  assert.equal(withDraft.issueDraft.title, updatedDraft.title);
  assert.equal((await repository.get(created.id, { workspaceId }))?.issueDraft.title, updatedDraft.title);

  assert.equal((await repository.markIssueCreationPending(created.id, { workspaceId })).status, "issue_creation_pending");

  const retryAt = "2026-05-02T12:00:00.000Z";
  const retrying = await repository.recordIssueAttempt(created.id, {
    ok: false,
    error: "GitHub rate limit",
    retryable: true,
    nextRetryAt: retryAt
  }, { workspaceId });
  assert.equal(retrying.status, "retrying");
  assert.equal(retrying.retryCount, 1);
  assert.deepEqual((await repository.dueForRetry({ workspaceId, now: new Date("2026-05-02T11:59:59.000Z") })).map((feedback) => feedback.id), []);
  assert.deepEqual((await repository.dueForRetry({ workspaceId, now: new Date(retryAt) })).map((feedback) => feedback.id), [created.id]);

  const sent = await repository.recordIssueAttempt(created.id, {
    ok: true,
    externalIssue: {
      provider: "github",
      number: 42,
      url: "https://github.com/agency/client-portal/issues/42",
      state: "open"
    }
  }, { workspaceId });
  assert.equal(sent.status, "sent_to_provider");
  assert.equal(sent.externalIssue?.number, 42);

  assert.equal((await repository.recordExternalIssueState(created.id, {
    provider: "github",
    number: 42,
    url: "https://github.com/agency/client-portal/issues/42",
    state: "closed"
  }, { workspaceId })).status, "resolved");
  assert.equal((await repository.markKept(created.id, { workspaceId })).status, "kept");
  assert.equal((await repository.markResolved(created.id, { workspaceId })).status, "resolved");
  assert.equal((await repository.markIgnored(created.id, { workspaceId })).status, "ignored");

  const events = await repository.events(created.id, { workspaceId });
  assert.ok(events.some((event) => event.toStatus === "raw" && event.reason === "feedback_received"));
  assert.ok(events.some((event) => event.toStatus === "sent_to_provider" && event.externalUrl?.endsWith("/42")));

  assert.deepEqual(await repository.clearWorkspace(workspaceId), {
    feedbacks: 1,
    events: events.length
  });
  assert.deepEqual(await repository.list({ workspaceId }), []);
});

function feedbackPayload(overrides: Partial<FeedbackPayload> = {}): FeedbackPayload {
  return {
    projectKey,
    type: "pin",
    message: "The hero button should be clearer",
    metadata: {
      url: "https://client.example/demo?tab=hero",
      origin: "https://client.example",
      path: "/demo",
      title: "Demo page",
      userAgent: "node:test",
      viewport: {
        width: 1440,
        height: 900
      },
      devicePixelRatio: 1,
      language: "fr-BE",
      createdAt: "2026-05-02T08:00:00.000Z"
    },
    pin: {
      x: 128,
      y: 256,
      selector: "button.primary",
      text: "Send"
    },
    ...overrides
  };
}

function createFakeSupabase(): { fetch: typeof globalThis.fetch } {
  const projects = [{
    id: projectId,
    organization_id: workspaceId,
    name: "Client Portal",
    public_key: projectKey
  }];
  const projectKeys = [{
    project_id: projectId,
    public_key: projectKey
  }];
  const issueTargets = [{
    id: issueTargetId,
    project_id: projectId,
    provider: "github",
    namespace: "agency",
    project_name: "client-portal",
    integration_id: null,
    external_project_id: null,
    web_url: "https://github.com/agency/client-portal"
  }];
  const feedbacks: Array<Record<string, unknown>> = [];
  const events: Array<Record<string, unknown>> = [];
  const attempts: Array<Record<string, unknown>> = [];
  const externalIssues: Array<Record<string, unknown>> = [];
  let feedbackIndex = 0;
  let eventIndex = 0;

  return {
    fetch: async (input, init) => {
      const url = new URL(input.toString());
      const body = init?.body ? JSON.parse(init.body.toString()) as Record<string, unknown> : {};

      if (url.pathname === "/rest/v1/project_public_keys") {
        return jsonResponse(projectKeys.filter((row) => row.public_key === stripEq(url.searchParams.get("public_key"))));
      }

      if (url.pathname === "/rest/v1/projects") {
        return jsonResponse(filterRows(projects, url.searchParams));
      }

      if (url.pathname === "/rest/v1/issue_targets") {
        return jsonResponse(filterRows(issueTargets, url.searchParams));
      }

      if (url.pathname === "/rest/v1/feedbacks" && init?.method === "POST") {
        const row = {
          id: `44444444-4444-4444-8444-44444444444${feedbackIndex}`,
          created_at: `2026-05-02T08:0${feedbackIndex}:00.000Z`,
          ...body
        };
        feedbackIndex += 1;
        feedbacks.unshift(row);
        return jsonResponse([row], 201);
      }

      if (url.pathname === "/rest/v1/feedbacks" && init?.method === "PATCH") {
        const id = stripEq(url.searchParams.get("id"));
        const row = feedbacks.find((feedback) => feedback.id === id);
        if (row) {
          Object.assign(row, body);
        }
        return jsonResponse([], 204);
      }

      if (url.pathname === "/rest/v1/feedbacks" && init?.method === "DELETE") {
        const ids = stripIn(url.searchParams.get("id"));
        for (let index = feedbacks.length - 1; index >= 0; index -= 1) {
          if (ids.includes(String(feedbacks[index].id))) {
            feedbacks.splice(index, 1);
          }
        }
        return jsonResponse([], 204);
      }

      if (url.pathname === "/rest/v1/feedbacks") {
        return jsonResponse(filterRows(feedbacks, url.searchParams));
      }

      if (url.pathname === "/rest/v1/feedback_status_events" && init?.method === "POST") {
        const row = {
          id: `55555555-5555-4555-8555-55555555555${eventIndex}`,
          created_at: body.created_at ?? `2026-05-02T09:${String(eventIndex).padStart(2, "0")}:00.000Z`,
          ...body
        };
        eventIndex += 1;
        events.unshift(row);
        return jsonResponse([], 201);
      }

      if (url.pathname === "/rest/v1/feedback_status_events") {
        return jsonResponse(filterRows(events, url.searchParams));
      }

      if (url.pathname === "/rest/v1/provider_issue_attempts" && init?.method === "POST") {
        const existing = attempts.find((attempt) =>
          attempt.provider === body.provider
          && attempt.idempotency_key === body.idempotency_key
        );
        const row = {
          created_at: "2026-05-02T10:00:00.000Z",
          updated_at: body.updated_at ?? "2026-05-02T10:00:00.000Z",
          ...body
        };
        if (existing) {
          Object.assign(existing, row);
        } else {
          attempts.unshift(row);
        }
        return jsonResponse([], 201);
      }

      if (url.pathname === "/rest/v1/provider_issue_attempts") {
        return jsonResponse(filterRows(attempts, url.searchParams));
      }

      if (url.pathname === "/rest/v1/external_issues" && init?.method === "POST") {
        const existing = externalIssues.find((issue) => issue.feedback_id === body.feedback_id);
        const row = {
          created_at: "2026-05-02T10:30:00.000Z",
          updated_at: body.updated_at ?? "2026-05-02T10:30:00.000Z",
          ...body
        };
        if (existing) {
          Object.assign(existing, row);
        } else {
          externalIssues.unshift(row);
        }
        return jsonResponse([], 201);
      }

      if (url.pathname === "/rest/v1/external_issues") {
        return jsonResponse(filterRows(externalIssues, url.searchParams));
      }

      throw new Error(`Unexpected Supabase request: ${url.pathname}?${url.searchParams.toString()}`);
    }
  };
}

function filterRows<T extends Record<string, unknown>>(rows: T[], params: URLSearchParams): T[] {
  return rows.filter((row) => {
    for (const [key, value] of params.entries()) {
      if (key === "select" || key === "order" || key === "limit" || key === "on_conflict" || key === "status") {
        if (key !== "status") {
          continue;
        }
      }

      if (value.startsWith("eq.") && row[key] !== stripEq(value)) {
        return false;
      }

      if (value.startsWith("in.") && !stripIn(value).includes(String(row[key]))) {
        return false;
      }
    }

    return true;
  });
}

function stripEq(value: string | null): string | undefined {
  return value?.startsWith("eq.") ? value.slice(3) : value ?? undefined;
}

function stripIn(value: string | null): string[] {
  if (!value?.startsWith("in.(") || !value.endsWith(")")) {
    return [];
  }

  return value.slice(4, -1).split(",").filter(Boolean);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(status === 204 ? undefined : JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json"
    },
    status
  });
}
