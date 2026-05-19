import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import test from "node:test";

type LogoutRouteModule = typeof import("../app/logout/route.ts");

const logoutRoute = await import(pathToFileURL(`${process.cwd()}/app/logout/route.ts`).href) as LogoutRouteModule;

test("logout POST clears auth cookies and navigates with a GET redirect", async () => {
  const response = await logoutRoute.POST(new Request("https://app.changethis.dev/logout?next=%2Fprojects", {
    method: "POST"
  }));

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://app.changethis.dev/login?next=%2Fprojects");

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /changethis_access_token=;/);
  assert.match(setCookie, /supabase-auth-token=;/);
  assert.match(setCookie, /supabase-refresh-token=;/);
  assert.match(setCookie, /Max-Age=0/);
});

test("logout GET clears auth cookies and redirects to login", async () => {
  const response = await logoutRoute.GET(new Request("https://app.changethis.dev/logout"));

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://app.changethis.dev/login?next=%2Fprojects");

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /changethis_access_token=;/);
  assert.match(setCookie, /Max-Age=0/);
});
