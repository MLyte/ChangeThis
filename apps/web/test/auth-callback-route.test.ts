import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import test from "node:test";

type AuthCallbackRouteModule = typeof import("../app/api/auth/callback/route.ts");

const authCallbackRoute = await import(pathToFileURL(`${process.cwd()}/app/api/auth/callback/route.ts`).href) as AuthCallbackRouteModule;

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
