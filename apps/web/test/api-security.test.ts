import assert from "node:assert/strict";
import test from "node:test";

import { parsePrivateTextField } from "../lib/api-security.ts";

test("parsePrivateTextField trims valid private text fields", () => {
  assert.deepEqual(parsePrivateTextField("  Fix checkout  ", {
    name: "Issue title",
    required: true,
    maxLength: 240
  }), {
    ok: true,
    value: "Fix checkout"
  });
});

test("parsePrivateTextField rejects missing required text", () => {
  assert.deepEqual(parsePrivateTextField("   ", {
    name: "Issue title",
    required: true,
    maxLength: 240
  }), {
    ok: false,
    error: "Issue title is required"
  });
});

test("parsePrivateTextField rejects oversized private text fields without truncating", () => {
  assert.deepEqual(parsePrivateTextField("x".repeat(241), {
    name: "Issue title",
    required: true,
    maxLength: 240
  }), {
    ok: false,
    error: "Issue title must be 240 characters or fewer"
  });
});

test("parsePrivateTextField rejects non-string private text fields", () => {
  assert.deepEqual(parsePrivateTextField(123, {
    name: "Issue label",
    maxLength: 64
  }), {
    ok: false,
    error: "Issue label must be a string"
  });
});
