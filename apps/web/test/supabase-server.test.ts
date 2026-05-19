import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
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

test("signup emails pass the requested auth redirect URL to Supabase", async () => {
  let requestUrl = "";
  let requestBody: unknown;

  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body));

    return new Response(null, { status: 200 });
  };

  const redirectTo = "https://app.changethis.dev/auth/confirm?next=/signup/set-password";
  const result = await supabaseModule.requestSignUpEmail({
    email: "mathieu@example.test",
    redirectTo
  });

  assert.deepEqual(result, { ok: true });
  const sentUrl = new URL(requestUrl);
  assert.equal(sentUrl.pathname, "/auth/v1/signup");
  assert.equal(sentUrl.searchParams.get("redirect_to"), redirectTo);
  assert.equal(typeof (requestBody as { password?: unknown }).password, "string");
  assert.ok(((requestBody as { password: string }).password).length >= 32);
  assert.deepEqual(requestBody, {
    email: "mathieu@example.test",
    password: (requestBody as { password: string }).password
  });
});

test("signup codes request a Supabase email OTP without a link redirect", async () => {
  let requestUrl = "";
  let requestBody: unknown;

  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body));

    return new Response(null, { status: 200 });
  };

  const result = await supabaseModule.requestSignUpCode({
    email: "mathieu@example.test"
  });

  assert.deepEqual(result, { ok: true });
  const sentUrl = new URL(requestUrl);
  assert.equal(sentUrl.pathname, "/auth/v1/otp");
  assert.deepEqual(requestBody, {
    email: "mathieu@example.test",
    create_user: true
  });
});

test("email codes are verified with email and token", async () => {
  let requestUrl = "";
  let requestHeaders: Headers | undefined;
  let requestBody: unknown;

  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestHeaders = new Headers(init?.headers);
    requestBody = JSON.parse(String(init?.body));

    return Response.json({
      access_token: "verified-access-token",
      refresh_token: "verified-refresh-token",
      expires_in: 3600
    });
  };

  const result = await supabaseModule.verifySupabaseEmailCode({
    email: "mathieu@example.test",
    token: "123456"
  });

  assert.deepEqual(result, {
    ok: true,
    accessToken: "verified-access-token",
    refreshToken: "verified-refresh-token",
    expiresIn: 3600
  });
  assert.equal(requestUrl, "https://supabase.example.test/auth/v1/verify");
  assert.equal(requestHeaders?.get("apikey"), "anon-test-key");
  assert.equal(requestHeaders?.get("authorization"), "Bearer anon-test-key");
  assert.deepEqual(requestBody, {
    email: "mathieu@example.test",
    token: "123456",
    type: "email"
  });
});
