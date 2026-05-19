import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import test from "node:test";

process.env.NEXT_PUBLIC_APP_URL = "https://app.changethis.dev";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";

type AuthCallbackRouteModule = typeof import("../app/api/auth/callback/route.ts");

const authCallbackRoute = await import(pathToFileURL(`${process.cwd()}/app/api/auth/callback/route.ts`).href) as AuthCallbackRouteModule;
const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("auth callback POST stores Supabase tokens without requiring query-string tokens", async () => {
  const response = await authCallbackRoute.POST(new Request("http://localhost:3000/api/auth/callback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: 1800,
      next: "/signup/set-password"
    })
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { redirectTo: "/signup/set-password" });

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /changethis_access_token=access-token/);
  assert.match(setCookie, /supabase-auth-token=access-token/);
  assert.match(setCookie, /supabase-refresh-token=refresh-token/);
  assert.doesNotMatch(response.url, /access-token|refresh-token/);
});

test("auth callback POST rejects missing token", async () => {
  const response = await authCallbackRoute.POST(new Request("http://localhost:3000/api/auth/callback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      next: "/signup/set-password"
    })
  }));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "missing_token" });
});

test("auth callback POST exchanges a Supabase token hash for session cookies", async () => {
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

  const response = await authCallbackRoute.POST(new Request("https://app.changethis.dev/api/auth/callback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      tokenHash: "signup-token-hash",
      type: "signup",
      next: "/signup/set-password"
    })
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { redirectTo: "/signup/set-password" });
  assert.equal(requestUrl, "https://supabase.example.test/auth/v1/verify");
  assert.equal(requestHeaders?.get("apikey"), "anon-test-key");
  assert.equal(requestHeaders?.get("authorization"), "Bearer anon-test-key");
  assert.deepEqual(requestBody, {
    token_hash: "signup-token-hash",
    type: "email"
  });

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /changethis_access_token=verified-access-token/);
  assert.match(setCookie, /supabase-refresh-token=verified-refresh-token/);
});

test("auth callback GET exchanges a Supabase token hash and redirects to the next path", async () => {
  let requestUrl = "";
  let requestBody: unknown;

  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body));

    return Response.json({
      access_token: "verified-access-token",
      refresh_token: "verified-refresh-token",
      expires_in: 3600
    });
  };

  const response = await authCallbackRoute.GET(
    new Request("https://localhost:8080/api/auth/callback?token_hash=signup-token-hash&type=magiclink&next=%2Fsignup%2Fset-password")
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://app.changethis.dev/signup/set-password");
  assert.equal(requestUrl, "https://supabase.example.test/auth/v1/verify");
  assert.deepEqual(requestBody, {
    token_hash: "signup-token-hash",
    type: "magiclink"
  });

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /changethis_access_token=verified-access-token/);
  assert.match(setCookie, /supabase-refresh-token=verified-refresh-token/);
});

test("auth callback GET redirects with the configured public origin", async () => {
  const response = await authCallbackRoute.GET(
    new Request("https://localhost:8080/api/auth/callback?error=access_denied&next=%2Fsignup%2Fset-password")
  );

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "https://app.changethis.dev/login?error=access_denied&next=%2Fsignup%2Fset-password"
  );
});
