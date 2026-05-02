import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";

type SupabaseServerModule = typeof import("../lib/supabase-server.ts");

const supabaseModule = await import(`${new URL("../lib/supabase-server.ts", import.meta.url).href}?supabase-server-test`) as SupabaseServerModule;
const originalFetch = globalThis.fetch;
const originalTimeout = process.env.SUPABASE_REST_TIMEOUT_MS;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalTimeout === undefined) {
    delete process.env.SUPABASE_REST_TIMEOUT_MS;
  } else {
    process.env.SUPABASE_REST_TIMEOUT_MS = originalTimeout;
  }
});

test("Supabase REST requests use the configured timeout", async () => {
  process.env.SUPABASE_REST_TIMEOUT_MS = "5";
  let signalSeen = false;

  globalThis.fetch = async (_input, init) => {
    const signal = init?.signal;
    assert.ok(signal);
    signalSeen = true;

    return await new Promise<Response>((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      }, { once: true });
    });
  };

  await assert.rejects(
    supabaseModule.supabaseServiceRest("/rest/v1/projects?select=id"),
    /Supabase REST request timed out after 5ms/
  );

  assert.equal(signalSeen, true);
});
