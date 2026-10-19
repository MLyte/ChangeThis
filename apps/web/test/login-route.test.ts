import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import test from "node:test";

type LoginRouteModule = typeof import("../app/api/auth/login/route.ts");

const loginRoute = await import(pathToFileURL(`${process.cwd()}/app/api/auth/login/route.ts`).href) as LoginRouteModule;
const originalEnv = {
  AUTH_MODE: process.env.AUTH_MODE,
  INTERNAL_API_URL: process.env.INTERNAL_API_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
};
const originalFetch = globalThis.fetch;

test.afterEach(() => {
  restoreEnvValue("AUTH_MODE", originalEnv.AUTH_MODE);
  restoreEnvValue("INTERNAL_API_URL", originalEnv.INTERNAL_API_URL);
  restoreEnvValue("NEXT_PUBLIC_APP_URL", originalEnv.NEXT_PUBLIC_APP_URL);
  globalThis.fetch = originalFetch;
});

test("internal login route signs in through FastAPI, sets the internal cookie, and redirects", async () => {
  process.env.AUTH_MODE = "internal";
  process.env.INTERNAL_API_URL = "http://back.example.test:8000";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.changethis.dev";

  let requestBody: unknown;
  globalThis.fetch = async (input, init) => {
    const url = new URL(input.toString());
    assert.equal(url.origin, "http://back.example.test:8000");
    assert.equal(url.pathname, "/auth/login");
    requestBody = JSON.parse(init?.body?.toString() ?? "{}");
    return jsonResponse({ access_token: "internal-token" }, 200);
  };

  const formData = new FormData();
  formData.set("email", "owner@example.com");
  formData.set("password", "correct-password");
  formData.set("next", "/settings/connected-sites");

  const response = await loginRoute.POST(new Request("https://localhost:8080/api/auth/login", {
    body: formData,
    method: "POST"
  }));

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://app.changethis.dev/settings/connected-sites");
  assert.deepEqual(requestBody, {
    email: "owner@example.com",
    password: "correct-password"
  });

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /changethis_internal_session=internal-token/);
  assert.match(setCookie, /HttpOnly/);
});

test("internal login route redirects back to login when FastAPI rejects credentials", async () => {
  process.env.AUTH_MODE = "internal";
  process.env.INTERNAL_API_URL = "http://back.example.test:8000";

  globalThis.fetch = async () => jsonResponse({ detail: "invalid" }, 401);

  const formData = new FormData();
  formData.set("email", "owner@example.com");
  formData.set("password", "wrong-password");
  formData.set("next", "/settings/connected-sites");

  const response = await loginRoute.POST(new Request("https://app.changethis.dev/api/auth/login", {
    body: formData,
    method: "POST"
  }));

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://app.changethis.dev/login?error=invalid&next=%2Fsettings%2Fconnected-sites");
  assert.equal(response.headers.get("set-cookie"), null);
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json"
    },
    status
  });
}

function restoreEnvValue(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
