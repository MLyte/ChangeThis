import assert from "node:assert/strict";
import { mock, test } from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DATA_STORE = "internal";
process.env.INTERNAL_API_URL = "http://internal.invalid";

mock.module("next/headers", {
  namedExports: {
    headers: async () => new Map(),
    cookies: async () => new Map()
  }
});

type FeedbackRepositoryModule = typeof import("../lib/feedback-repository.ts");

const { InternalFeedbackRepository } = (await import(
  pathToFileURL(path.join(process.cwd(), "lib/feedback-repository.ts")).href
)) as FeedbackRepositoryModule;

type FetchCall = { url: string; init: RequestInit };

function stubFetch(handler: (call: FetchCall, callIndex: number) => Response | Promise<Response>) {
  const calls: FetchCall[] = [];
  const original = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === "string" ? input : input.toString();
    const call = { url, init };
    calls.push(call);
    return handler(call, calls.length - 1);
  }) as typeof fetch;

  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    }
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const feedbackRow = {
  id: "33333333-3333-3333-3333-333333333333",
  project_key: "ct_abc123",
  workspace_id: "22222222-2222-2222-2222-222222222222",
  project_name: "Marketing site",
  issue_target: {
    provider: "github",
    namespace: "acme",
    project_name: "site",
    integration_id: null,
    external_project_id: null,
    web_url: "https://github.com/acme/site"
  },
  payload: {
    projectKey: "ct_abc123",
    type: "pin",
    message: "Le bouton est mal aligné",
    metadata: { url: "https://example.com/pricing", path: "/pricing", title: "Pricing", userAgent: "node:test", viewport: { width: 1280, height: 800 }, devicePixelRatio: 1, language: "fr", createdAt: "2026-01-01T00:00:00.000Z" }
  },
  issue_draft: { title: "Le bouton est mal aligné", description: "Le bouton est mal aligné", labels: ["feedback"] },
  status: "raw",
  screenshot_asset: null,
  browser_capture_asset: null,
  external_issue: null,
  last_error: null,
  retry_count: 0,
  next_retry_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z"
};

test("create posts to /public/feedback with an Origin header derived from metadata.url", async () => {
  const stub = stubFetch((call) => {
    assert.equal(call.url, "http://internal.invalid/public/feedback");
    assert.equal((call.init.headers as Record<string, string>).Origin, "https://example.com");
    const body = JSON.parse(call.init.body as string);
    assert.equal(body.projectKey, "ct_abc123");
    assert.equal(body.type, "pin");
    return jsonResponse(feedbackRow);
  });
  try {
    const repository = new InternalFeedbackRepository();
    const stored = await repository.create({
      projectKey: "ct_abc123",
      projectName: "Marketing site",
      issueTarget: { provider: "github", namespace: "acme", project: "site" },
      payload: feedbackRow.payload as never,
      issueDraft: { title: "Le bouton est mal aligné", description: "Le bouton est mal aligné", labels: ["feedback"] }
    });
    assert.equal(stored.id, feedbackRow.id);
    assert.equal(stored.issueTarget.project, "site");
  } finally {
    stub.restore();
  }
});

test("list queries /feedbacks with the given filters", async () => {
  const stub = stubFetch((call) => {
    assert.match(call.url, /^http:\/\/internal\.invalid\/feedbacks\?/);
    assert.match(call.url, /workspace_id=22222222/);
    assert.match(call.url, /status=raw/);
    return jsonResponse([feedbackRow]);
  });
  try {
    const repository = new InternalFeedbackRepository();
    const feedbacks = await repository.list({ workspaceId: "22222222-2222-2222-2222-222222222222", status: "raw" });
    assert.equal(feedbacks.length, 1);
    assert.equal(feedbacks[0].projectKey, "ct_abc123");
  } finally {
    stub.restore();
  }
});

test("get returns undefined on a 404", async () => {
  const stub = stubFetch(() => new Response(null, { status: 404 }));
  try {
    const repository = new InternalFeedbackRepository();
    assert.equal(await repository.get(feedbackRow.id), undefined);
  } finally {
    stub.restore();
  }
});

test("updateIssueDraft PATCHes the issue-draft endpoint", async () => {
  const stub = stubFetch((call) => {
    assert.equal(call.init.method, "PATCH");
    assert.match(call.url, /\/feedbacks\/.*\/issue-draft$/);
    const body = JSON.parse(call.init.body as string);
    assert.equal(body.title, "New title");
    return jsonResponse({ ...feedbackRow, issue_draft: { title: "New title", description: "d", labels: [] } });
  });
  try {
    const repository = new InternalFeedbackRepository();
    const updated = await repository.updateIssueDraft(feedbackRow.id, { title: "New title", description: "d", labels: [] });
    assert.equal(updated.issueDraft.title, "New title");
  } finally {
    stub.restore();
  }
});

test("updateReporter fetches the current feedback then PATCHes with a recomputed issue draft", async () => {
  const stub = stubFetch((call, index) => {
    if (index === 0) {
      assert.match(call.url, /\/feedbacks\/.*\?/);
      return jsonResponse(feedbackRow);
    }
    assert.equal(call.init.method, "PATCH");
    assert.match(call.url, /\/reporter$/);
    const body = JSON.parse(call.init.body as string);
    assert.equal(body.reporter.email, "visitor@example.com");
    assert.ok(body.issue_draft.title);
    return jsonResponse(feedbackRow);
  });
  try {
    const repository = new InternalFeedbackRepository();
    await repository.updateReporter(feedbackRow.id, { email: "visitor@example.com" });
    assert.equal(stub.calls.length, 2);
  } finally {
    stub.restore();
  }
});

test("recordIssueAttempt sends the ok payload shape", async () => {
  const stub = stubFetch((call) => {
    assert.match(call.url, /\/issue-attempt$/);
    const body = JSON.parse(call.init.body as string);
    assert.equal(body.ok, true);
    assert.equal(body.external_issue.url, "https://github.com/acme/site/issues/1");
    return jsonResponse({ ...feedbackRow, status: "sent_to_provider" });
  });
  try {
    const repository = new InternalFeedbackRepository();
    const updated = await repository.recordIssueAttempt(feedbackRow.id, {
      ok: true,
      externalIssue: { provider: "github", url: "https://github.com/acme/site/issues/1", number: 1 }
    });
    assert.equal(updated.status, "sent_to_provider");
  } finally {
    stub.restore();
  }
});

test("recordIssueAttempt sends the failed payload shape", async () => {
  const stub = stubFetch((call) => {
    const body = JSON.parse(call.init.body as string);
    assert.equal(body.ok, false);
    assert.equal(body.error, "rate limited");
    assert.equal(body.retryable, true);
    return jsonResponse({ ...feedbackRow, status: "retrying" });
  });
  try {
    const repository = new InternalFeedbackRepository();
    const updated = await repository.recordIssueAttempt(feedbackRow.id, { ok: false, error: "rate limited", retryable: true });
    assert.equal(updated.status, "retrying");
  } finally {
    stub.restore();
  }
});

test("recordExternalIssueState POSTs the external issue fields", async () => {
  const stub = stubFetch((call) => {
    assert.match(call.url, /\/external-issue-state$/);
    const body = JSON.parse(call.init.body as string);
    assert.equal(body.state, "closed");
    return jsonResponse({ ...feedbackRow, status: "resolved" });
  });
  try {
    const repository = new InternalFeedbackRepository();
    const updated = await repository.recordExternalIssueState(feedbackRow.id, {
      provider: "github",
      url: "https://github.com/acme/site/issues/1",
      state: "closed"
    });
    assert.equal(updated.status, "resolved");
  } finally {
    stub.restore();
  }
});

test("markKept, markResolved and markIgnored post to their dedicated endpoints", async () => {
  const stub = stubFetch((call) => jsonResponse({ ...feedbackRow, status: "kept" }));
  try {
    const repository = new InternalFeedbackRepository();
    await repository.markKept(feedbackRow.id);
    await repository.markResolved(feedbackRow.id);
    await repository.markIgnored(feedbackRow.id);
    assert.deepEqual(
      stub.calls.map((call) => call.url.replace("http://internal.invalid", "")),
      [`/feedbacks/${feedbackRow.id}/keep`, `/feedbacks/${feedbackRow.id}/resolve`, `/feedbacks/${feedbackRow.id}/ignore`]
    );
  } finally {
    stub.restore();
  }
});

test("recordBrowserCapture POSTs the data URL", async () => {
  const stub = stubFetch((call) => {
    assert.match(call.url, /\/browser-capture$/);
    const body = JSON.parse(call.init.body as string);
    assert.equal(body.data_url, "data:image/jpeg;base64,aGVsbG8=");
    return jsonResponse(feedbackRow);
  });
  try {
    const repository = new InternalFeedbackRepository();
    await repository.recordBrowserCapture(feedbackRow.id, "data:image/jpeg;base64,aGVsbG8=");
  } finally {
    stub.restore();
  }
});

test("dueForRetry queries the due-for-retry endpoint", async () => {
  const stub = stubFetch((call) => {
    assert.match(call.url, /^http:\/\/internal\.invalid\/feedbacks\/due-for-retry\?/);
    return jsonResponse([feedbackRow]);
  });
  try {
    const repository = new InternalFeedbackRepository();
    const due = await repository.dueForRetry({ workspaceId: "22222222-2222-2222-2222-222222222222" });
    assert.equal(due.length, 1);
  } finally {
    stub.restore();
  }
});

test("events returns an empty list on 404", async () => {
  const stub = stubFetch(() => new Response(null, { status: 404 }));
  try {
    const repository = new InternalFeedbackRepository();
    assert.deepEqual(await repository.events(feedbackRow.id), []);
  } finally {
    stub.restore();
  }
});

test("clearWorkspace DELETEs and returns the counts from the API", async () => {
  const stub = stubFetch((call) => {
    assert.equal(call.init.method, "DELETE");
    return jsonResponse({ feedbacks: 2, events: 5 });
  });
  try {
    const repository = new InternalFeedbackRepository();
    const result = await repository.clearWorkspace("22222222-2222-2222-2222-222222222222");
    assert.deepEqual(result, { feedbacks: 2, events: 5 });
  } finally {
    stub.restore();
  }
});

test("cleanupScreenshotAssets sends a bearer token derived from the cron secret env vars", async () => {
  process.env.CHANGETHIS_CRON_SECRET = "cron-secret";
  const stub = stubFetch((call) => {
    assert.equal((call.init.headers as Record<string, string>).Authorization, "Bearer cron-secret");
    return jsonResponse({ archived: 1, deleted: 0 });
  });
  try {
    const repository = new InternalFeedbackRepository();
    const result = await repository.cleanupScreenshotAssets?.({ archiveAfterDays: 10 });
    assert.deepEqual(result, { archived: 1, deleted: 0 });
  } finally {
    stub.restore();
    delete process.env.CHANGETHIS_CRON_SECRET;
  }
});
