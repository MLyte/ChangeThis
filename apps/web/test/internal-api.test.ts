import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import test from "node:test";

type InternalApiModule = typeof import("../lib/internal-api.ts");

const originalEnv = {
  INTERNAL_API_URL: process.env.INTERNAL_API_URL
};
const originalFetch = globalThis.fetch;
let importCounter = 0;

test.afterEach(() => {
  restoreEnvValue("INTERNAL_API_URL", originalEnv.INTERNAL_API_URL);
  globalThis.fetch = originalFetch;
});

test("internal API defaults to colocated FastAPI on localhost", async () => {
  delete process.env.INTERNAL_API_URL;

  const internalApi = await importInternalApiModule();

  assert.equal(internalApi.getInternalApiUrl(), "http://127.0.0.1:8000");
});

test("internal signup posts to FastAPI and returns the access token", async () => {
  process.env.INTERNAL_API_URL = "http://back.example.test:8000";

  let requestBody: unknown;
  globalThis.fetch = async (input, init) => {
    const url = new URL(input.toString());
    assert.equal(url.origin, "http://back.example.test:8000");
    assert.equal(url.pathname, "/auth/signup");
    requestBody = JSON.parse(init?.body?.toString() ?? "{}");
    return jsonResponse({ access_token: "internal-token" }, 201);
  };

  const internalApi = await importInternalApiModule();
  const result = await internalApi.signUpWithInternalPassword({
    email: "owner@example.test",
    password: "correct-password",
    workspaceName: "CRA"
  });

  assert.deepEqual(requestBody, {
    email: "owner@example.test",
    password: "correct-password",
    workspace_name: "CRA"
  });
  assert.deepEqual(result, {
    ok: true,
    accessToken: "internal-token"
  });
});

test("internal signup maps disabled and duplicate backend responses", async () => {
  process.env.INTERNAL_API_URL = "http://back.example.test:8000";
  const internalApi = await importInternalApiModule();

  globalThis.fetch = async () => jsonResponse({ detail: "disabled" }, 403);
  assert.deepEqual(await internalApi.signUpWithInternalPassword({
    email: "owner@example.test",
    password: "correct-password",
    workspaceName: "CRA"
  }), { ok: false, error: "disabled" });

  globalThis.fetch = async () => jsonResponse({ detail: "duplicate" }, 409);
  assert.deepEqual(await internalApi.signUpWithInternalPassword({
    email: "owner@example.test",
    password: "correct-password",
    workspaceName: "CRA"
  }), { ok: false, error: "duplicate" });
});

async function importInternalApiModule(): Promise<InternalApiModule> {
  importCounter += 1;
  return await import(`${pathToFileURL(`${process.cwd()}/lib/internal-api.ts`).href}?internal-api-test-${importCounter}`) as InternalApiModule;
}

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
