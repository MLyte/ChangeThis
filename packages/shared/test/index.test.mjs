import assert from "node:assert/strict";
import test from "node:test";
import { buildGitHubIssueDraft, buildIssueDraft, validateFeedbackPayload, validateIssueTarget } from "../dist/index.js";

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

test("validateFeedbackPayload accepts multiple pins and keeps first pin compatibility", () => {
  const result = validateFeedbackPayload(validPayload({
    pin: undefined,
    pins: [
      { x: 42, y: 128, selector: ".hero-cta", text: "Demander un devis" },
      { x: 210, y: 360, selector: ".pricing", text: "Tarifs" }
    ]
  }));

  assert.equal(result.ok, true);
  assert.equal(result.value.pin.x, 42);
  assert.equal(result.value.pins.length, 2);
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

test("validateFeedbackPayload accepts safe screenshot MIME types", () => {
  for (const mimeType of ["image/png", "image/jpeg", "image/webp"]) {
    const result = validateFeedbackPayload(validPayload({
      screenshotDataUrl: `data:${mimeType};base64,AAAA`
    }));

    assert.equal(result.ok, true);
  }
});

test("validateFeedbackPayload rejects unsafe or malformed screenshot data URLs", () => {
  for (const screenshotDataUrl of [
    "data:image/svg+xml;base64,AAAA",
    "data:text/html;base64,AAAA",
    "data:image/png,AAAA",
    "data:image/png;base64,A"
  ]) {
    const result = validateFeedbackPayload(validPayload({ screenshotDataUrl }));

    assert.equal(result.ok, false);
    assert.match(result.error, /screenshotDataUrl/);
  }
});

test("buildIssueDraft creates a concise provider-neutral issue draft", () => {
  const validation = validateFeedbackPayload(validPayload());
  assert.equal(validation.ok, true);

  const draft = buildIssueDraft(validation.value);

  assert.equal(draft.title, "[Feedback] /contact - Make the call to action more visible");
  assert.deepEqual(draft.labels, ["source:client-feedback", "status:raw", "type:feedback", "mode:pin"]);
  assert.match(draft.description, /Element probable: `\.hero-cta`/);
});

test("buildIssueDraft numbers multiple pins in the issue description", () => {
  const validation = validateFeedbackPayload(validPayload({
    pins: [
      { x: 42, y: 128, selector: ".hero-cta", text: "Demander un devis" },
      { x: 210, y: 360, selector: ".pricing", text: "Tarifs" }
    ]
  }));
  assert.equal(validation.ok, true);

  const draft = buildIssueDraft(validation.value);

  assert.match(draft.description, /Pin #1: x=42, y=128/);
  assert.match(draft.description, /Pin #2: x=210, y=360/);
});

test("buildGitHubIssueDraft remains as a compatibility alias", () => {
  const validation = validateFeedbackPayload(validPayload());
  assert.equal(validation.ok, true);

  assert.deepEqual(buildGitHubIssueDraft(validation.value), buildIssueDraft(validation.value));
});

test("validateIssueTarget accepts explicit GitHub and GitLab destinations", () => {
  assert.deepEqual(validateIssueTarget({
    provider: "github",
    namespace: "MLyte",
    project: "ChangeThis",
    webUrl: "https://github.com/MLyte/ChangeThis"
  }), {
    ok: true,
    value: {
      provider: "github",
      namespace: "MLyte",
      project: "ChangeThis",
      externalProjectId: undefined,
      installationId: undefined,
      integrationId: undefined,
      webUrl: "https://github.com/MLyte/ChangeThis"
    }
  });

  const gitlab = validateIssueTarget({
    provider: "gitlab",
    namespace: "group/subgroup",
    project: "site",
    externalProjectId: "group%2Fsubgroup%2Fsite",
    webUrl: "https://gitlab.com/group/subgroup/site"
  });

  assert.equal(gitlab.ok, true);
});

test("validateIssueTarget rejects ambiguous or incomplete destinations", () => {
  assert.equal(validateIssueTarget({ provider: "github", namespace: "org/team", project: "repo" }).ok, false);
  assert.equal(validateIssueTarget({ provider: "gitlab", namespace: "group" }).ok, false);
  assert.equal(validateIssueTarget({ provider: "bitbucket", namespace: "org", project: "repo" }).ok, false);
});
