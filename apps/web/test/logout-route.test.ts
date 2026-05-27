import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import test from "node:test";

type LogoutRouteModule = typeof import("../app/logout/route.ts");

const logoutRoute = await import(pathToFileURL(`${process.cwd()}/app/logout/route.ts`).href) as LogoutRouteModule;
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const originalInternalApiUrl = process.env.INTERNAL_API_URL;
const originalFetch = globalThis.fetch;

test.afterEach(() => {
  if (originalAppUrl === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  }

  if (originalInternalApiUrl === undefined) {
    delete process.env.INTERNAL_API_URL;
  } else {
    process.env.INTERNAL_API_URL = originalInternalApiUrl;
  }

  globalThis.fetch = originalFetch;
});

test("logout POST clears auth cookies and navigates with a GET redirect", async () => {
  delete process.env.NEXT_PUBLIC_APP_URL;

  const response = await logoutRoute.POST(new Request("https://app.changethis.dev/logout?next=%2Fprojects", {
    method: "POST"
  }));

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://app.changethis.dev/login?next=%2Fprojects");

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /changethis_access_token=;/);
  assert.match(setCookie, /changethis_internal_session=;/);
  assert.match(setCookie, /supabase-auth-token=;/);
  assert.match(setCookie, /supabase-refresh-token=;/);
  assert.match(setCookie, /Max-Age=0/);
});

test("logout GET clears auth cookies and redirects to login", async () => {
  delete process.env.NEXT_PUBLIC_APP_URL;

  const response = await logoutRoute.GET(new Request("https://app.changethis.dev/logout"));

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://app.changethis.dev/login?next=%2Fprojects");

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /changethis_access_token=;/);
  assert.match(setCookie, /Max-Age=0/);
});

test("logout redirects with the configured public origin", async () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://app.changethis.dev";

  const response = await logoutRoute.GET(new Request("https://localhost:8080/logout?next=%2Fprojects"));

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://app.changethis.dev/login?next=%2Fprojects");
});

test("logout clears internal cookie and revokes FastAPI session", async () => {
  process.env.INTERNAL_API_URL = "http://back.example.test:8000";

  let logoutUrl = "";
  let logoutCookie = "";
  globalThis.fetch = async (input, init) => {
    logoutUrl = input.toString();
    logoutCookie = new Headers(init?.headers).get("cookie") ?? "";
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  const response = await logoutRoute.POST(new Request("https://app.changethis.dev/logout", {
    method: "POST",
    headers: {
      Cookie: "changethis_internal_session=internal-token"
    }
  }));

  assert.equal(response.status, 303);
  assert.equal(logoutUrl, "http://back.example.test:8000/auth/logout");
  assert.equal(logoutCookie, "changethis_internal_session=internal-token");

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /changethis_internal_session=;/);
  assert.match(setCookie, /Max-Age=0/);
});
