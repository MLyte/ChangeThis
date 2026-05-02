import assert from "node:assert/strict";
import test from "node:test";

test("initChangeThis does not create another root when one already exists", async () => {
  let createElementCalls = 0;
  const existingRoot = { id: "changethis-widget-root" };
  const documentRef = {
    currentScript: null,
    documentElement: {
      appendChild() {
        assert.fail("initChangeThis should not append a second root");
      },
      lang: "en"
    },
    getElementById(id: string) {
      return id === "changethis-widget-root" ? existingRoot : null;
    },
    createElement() {
      createElementCalls += 1;
      assert.fail("initChangeThis should not create a second root");
    }
  };

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentRef
  });

  const { initChangeThis } = await import("../src/index.ts");

  initChangeThis({ projectKey: "pk_test" });

  assert.equal(createElementCalls, 0);
});
