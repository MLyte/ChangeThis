import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { buildIssueDraft, type FeedbackPayload, type IssueTarget } from "@changethis/shared";
import { FileFeedbackRepository } from "../lib/feedback-repository.ts";

const issueTarget: IssueTarget = {
  provider: "github",
  namespace: "MLyte",
  project: "ChangeThis",
  webUrl: "https://github.com/MLyte/ChangeThis"
};

function feedbackPayload(overrides: Partial<FeedbackPayload> = {}): FeedbackPayload {
  return {
    projectKey: "demo_project_key",
    type: "pin",
    message: "The hero button should be clearer",
    metadata: {
      url: "https://client.example/demo",
      path: "/demo",
      title: "Demo page",
      userAgent: "node:test",
      viewport: {
        width: 1440,
        height: 900
      },
      devicePixelRatio: 1,
      language: "fr-BE",
      createdAt: "2026-04-28T08:00:00.000Z"
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

async function withRepository(run: (repository: FileFeedbackRepository, filePath: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), "changethis-repository-"));
  const filePath = path.join(directory, "feedback-store.json");

  try {
    await run(new FileFeedbackRepository(filePath), filePath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("file repository persists feedbacks, events, and screenshot assets", async () => {
  await withRepository(async (repository, filePath) => {
    const payload = feedbackPayload({
      screenshotDataUrl: "data:image/png;base64,AAAA"
    });
    const stored = await repository.create({
      projectKey: "demo_project_key",
      projectName: "Demo Project",
      issueTarget,
      payload,
      issueDraft: buildIssueDraft(payload),
      screenshotDataUrl: payload.screenshotDataUrl
    });

    assert.equal(stored.status, "raw");
    assert.equal(stored.payload.screenshotDataUrl, undefined);
    assert.equal(stored.screenshotAsset?.mimeType, "image/png");
    assert.equal(stored.retryCount, 0);

    const freshRepository = new FileFeedbackRepository(filePath);
    const [persisted] = await freshRepository.list();
    const events = await freshRepository.events(stored.id);

    assert.equal(persisted.id, stored.id);
    assert.equal(persisted.projectKey, "demo_project_key");
    assert.equal(events.length, 1);
    assert.equal(events[0]?.toStatus, "raw");
    assert.equal(events[0]?.reason, "feedback_received");
  });
});

test("file repository records retryable and successful issue attempts", async () => {
  await withRepository(async (repository) => {
    const payload = feedbackPayload();
    const stored = await repository.create({
      projectKey: "demo_project_key",
      projectName: "Demo Project",
      issueTarget,
      payload,
      issueDraft: buildIssueDraft(payload)
    });

    const pending = await repository.markIssueCreationPending(stored.id);
    assert.equal(pending.status, "issue_creation_pending");

    const retryAt = "2026-04-28T09:00:00.000Z";
    const retrying = await repository.recordIssueAttempt(stored.id, {
      ok: false,
      error: "GitHub rate limit",
      retryable: true,
      nextRetryAt: retryAt
    });

    assert.equal(retrying.status, "retrying");
    assert.equal(retrying.retryCount, 1);
    assert.equal(retrying.lastError, "GitHub rate limit");
    assert.equal(retrying.nextRetryAt, retryAt);
    assert.equal((await repository.dueForRetry(new Date("2026-04-28T08:59:59.000Z"))).length, 0);
    assert.equal((await repository.dueForRetry(new Date(retryAt))).length, 1);

    const sent = await repository.recordIssueAttempt(stored.id, {
      ok: true,
      externalIssue: {
        provider: "github",
        number: 42,
        url: "https://github.com/MLyte/ChangeThis/issues/42",
        state: "open"
      }
    });

    assert.equal(sent.status, "sent_to_provider");
    assert.equal(sent.lastError, undefined);
    assert.equal(sent.nextRetryAt, undefined);
    assert.equal(sent.externalIssue?.url, "https://github.com/MLyte/ChangeThis/issues/42");
  });
});
