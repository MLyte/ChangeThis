import assert from "node:assert/strict";
import test from "node:test";
import { captureFeedbackScreenshot } from "../src/capture.ts";

test("captureFeedbackScreenshot skips failed pin screenshots without throwing", async () => {
  const warnings: Array<[string, unknown]> = [];
  const screenshotDataUrl = await captureFeedbackScreenshot({
    type: "pin",
    captureViewport: async () => {
      throw new Error("Attempting to parse an unsupported color function \"oklch\"");
    },
    capturePageFeedbackPreview: async () => {
      assert.fail("pin feedback should not use the comment preview capture");
    },
    warn(message, error) {
      warnings.push([message, error]);
    }
  });

  assert.equal(screenshotDataUrl, undefined);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0][0], /screenshot skipped/);
  assert.ok(warnings[0][1] instanceof Error);
});

test("captureFeedbackScreenshot captures screenshot feedback areas", async () => {
  const area = { x: 10, y: 20, width: 300, height: 200 };
  let receivedArea: typeof area | undefined;
  const screenshotDataUrl = await captureFeedbackScreenshot({
    type: "screenshot",
    captureArea: area,
    captureViewport: async (inputArea) => {
      receivedArea = inputArea;
      return "data:image/webp;base64,AAAA";
    },
    capturePageFeedbackPreview: async () => {
      assert.fail("screenshot feedback should not use the comment preview capture");
    }
  });

  assert.equal(screenshotDataUrl, "data:image/webp;base64,AAAA");
  assert.deepEqual(receivedArea, area);
});

test("captureFeedbackScreenshot forwards pin targets for capture overlays", async () => {
  const pinTargets = [{ x: 120, y: 80, selector: "button.primary" }];
  let receivedArea: unknown = "not-called";
  let receivedPinTargets: unknown;
  const screenshotDataUrl = await captureFeedbackScreenshot({
    type: "pin",
    pinTargets,
    captureViewport: async (inputArea, options) => {
      receivedArea = inputArea;
      receivedPinTargets = options?.pinTargets;
      return "data:image/webp;base64,PIN";
    },
    capturePageFeedbackPreview: async () => {
      assert.fail("pin feedback should not use the comment preview capture");
    }
  });

  assert.equal(screenshotDataUrl, "data:image/webp;base64,PIN");
  assert.equal(receivedArea, undefined);
  assert.deepEqual(receivedPinTargets, pinTargets);
});
