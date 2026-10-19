import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../app/api/public/feedback/route.ts";

test("public feedback oversized payload responses keep CORS headers", async () => {
  const response = await POST(new Request("https://changethis.cra.wallonie.be/api/public/feedback", {
    method: "POST",
    headers: {
      "Content-Length": "2500001",
      "Content-Type": "application/json",
      Origin: "https://test.agromet.be"
    },
    body: "{}"
  }));
  const body = await response.json() as { error?: string };

  assert.equal(response.status, 413);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://test.agromet.be");
  assert.equal(body.error, "Payload is too large");
});
