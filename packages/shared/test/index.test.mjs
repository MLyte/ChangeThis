import assert from "node:assert/strict";
import test from "node:test";
import { buildGitHubIssueDraft, buildIssueDraft, validateFeedbackPayload } from "../dist/index.js";

function validPayload(overrides = {}) {
  return {
    projectKey: "demo_project_key",
    type: "pin",
    message: "Make the call to action more visible",
    metadata: {
      url: "https://example.com/contact",
      path: "/contact",
      title: "Contact",
      userAgent: "node-test",
      viewport: {
        width: 390,
        height: 844
      },
      devicePixelRatio: 2,
      language: "fr-BE",
      createdAt: "2026-04-26T10:00:00.000Z"
    },
    pin: {
      x: 42,
      y: 128,
      selector: ".hero-cta",
      text: "Demander un devis"
    },
    ...overrides
  };
}

test("validateFeedbackPayload accepts a complete feedback payload", () => {
  const result = validateFeedbackPayload(validPayload());

  assert.equal(result.ok, true);
  assert.equal(result.value.type, "pin");
  assert.equal(result.value.metadata.path, "/contact");
});

test("validateFeedbackPayload rejects malformed payloads", () => {
  const result = validateFeedbackPayload(validPayload({ metadata: undefined }));

  assert.equal(result.ok, false);
  assert.match(result.error, /metadata/);
});

test("validateFeedbackPayload rejects oversized screenshots", () => {
  const result = validateFeedbackPayload(
    validPayload({ screenshotDataUrl: `data:image/jpeg;base64,${"a".repeat(32)}` }),
    { maxScreenshotBytes: 8 }
  );

  assert.equal(result.ok, false);
  assert.match(result.error, /screenshotDataUrl/);
});

test("buildIssueDraft creates a concise provider-neutral issue draft", () => {
  const validation = validateFeedbackPayload(validPayload());
  assert.equal(validation.ok, true);

  const draft = buildIssueDraft(validation.value);

  assert.equal(draft.title, "[Feedback] /contact - Make the call to action more visible");
  assert.deepEqual(draft.labels, ["source:client-feedback", "status:raw", "type:feedback", "mode:pin"]);
  assert.match(draft.description, /Element probable: `\.hero-cta`/);
});

test("buildGitHubIssueDraft remains as a compatibility alias", () => {
  const validation = validateFeedbackPayload(validPayload());
  assert.equal(validation.ok, true);

  assert.deepEqual(buildGitHubIssueDraft(validation.value), buildIssueDraft(validation.value));
});
