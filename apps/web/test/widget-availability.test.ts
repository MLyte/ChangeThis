import assert from "node:assert/strict";
import test from "node:test";
import { isChangeThisWidgetEnabled } from "../lib/widget-availability.ts";

test("ChangeThis widget stays enabled when its environment flag is absent or true", () => {
  assert.equal(isChangeThisWidgetEnabled(undefined), true);
  assert.equal(isChangeThisWidgetEnabled("true"), true);
});

test("ChangeThis widget can be disabled from the environment", () => {
  assert.equal(isChangeThisWidgetEnabled("false"), false);
  assert.equal(isChangeThisWidgetEnabled("  FALSE  "), false);
  assert.equal(isChangeThisWidgetEnabled("0"), false);
});
