import assert from "node:assert/strict";
import { mock, test } from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DATA_STORE = "internal";
process.env.INTERNAL_API_URL = "http://internal.invalid";

mock.module("next/headers", {
  namedExports: {
    headers: async () => new Map(),
    cookies: async () => new Map()
  }
});

type ProviderIntegrationStateModule = typeof import("../lib/provider-integration-state.ts");

const {
  isProviderIntegrationDisabledAsync,
  disableProviderIntegrationAsync,
  enableProviderIntegrationAsync
} = (await import(
  pathToFileURL(path.join(process.cwd(), "lib/provider-integration-state.ts")).href
)) as ProviderIntegrationStateModule;

type FetchCall = { url: string; init: RequestInit };

function stubFetch(handler: (call: FetchCall) => Response | Promise<Response>) {
  const calls: FetchCall[] = [];
  const original = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === "string" ? input : input.toString();
    const call = { url, init };
    calls.push(call);
    return handler(call);
  }) as typeof fetch;

  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    }
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const integrationId = "55555555-5555-5555-5555-555555555555";

test("isProviderIntegrationDisabledAsync returns true when the integration status is disabled", async () => {
  const stub = stubFetch((call) => {
    assert.match(call.url, /^http:\/\/internal\.invalid\/integrations\/github\?/);
    return jsonResponse({ id: integrationId, status: "disabled" });
  });
  try {
    assert.equal(await isProviderIntegrationDisabledAsync("github", integrationId), true);
  } finally {
    stub.restore();
  }
});

test("isProviderIntegrationDisabledAsync returns false when connected", async () => {
  const stub = stubFetch(() => jsonResponse({ id: integrationId, status: "connected" }));
  try {
    assert.equal(await isProviderIntegrationDisabledAsync("github", integrationId), false);
  } finally {
    stub.restore();
  }
});

test("isProviderIntegrationDisabledAsync returns false when the integration is unknown", async () => {
  const stub = stubFetch(() => new Response(null, { status: 404 }));
  try {
    assert.equal(await isProviderIntegrationDisabledAsync("github", integrationId), false);
  } finally {
    stub.restore();
  }
});

test("disableProviderIntegrationAsync PATCHes status=disabled", async () => {
  const stub = stubFetch((call) => {
    assert.equal(call.init.method, "PATCH");
    const body = JSON.parse(call.init.body as string);
    assert.equal(body.integration_id, integrationId);
    assert.equal(body.status, "disabled");
    return jsonResponse({ id: integrationId, status: "disabled" });
  });
  try {
    await disableProviderIntegrationAsync("github", integrationId);
  } finally {
    stub.restore();
  }
});

test("enableProviderIntegrationAsync PATCHes status=connected", async () => {
  const stub = stubFetch((call) => {
    const body = JSON.parse(call.init.body as string);
    assert.equal(body.status, "connected");
    return jsonResponse({ id: integrationId, status: "connected" });
  });
  try {
    await enableProviderIntegrationAsync("github", integrationId);
  } finally {
    stub.restore();
  }
});
