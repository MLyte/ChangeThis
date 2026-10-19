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

type ProviderIntegrationsModule = typeof import("../lib/provider-integrations.ts");

const { listProviderIntegrations, recordProviderConnection } = (await import(
  pathToFileURL(path.join(process.cwd(), "lib/provider-integrations.ts")).href
)) as ProviderIntegrationsModule;

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

const workspaceId = "66666666-6666-6666-6666-666666666666";
const githubIntegrationId = "77777777-7777-7777-7777-777777777777";
const gitlabIntegrationId = "88888888-8888-8888-8888-888888888888";

function routeIntegrationsFetch(call: FetchCall): Response {
  const url = call.url;

  if (url.includes("/integrations/github/ensure")) {
    return jsonResponse({ id: githubIntegrationId, workspace_id: workspaceId, provider: "github", auth_type: "personal_token", status: "needs_setup" });
  }
  if (url.includes("/integrations/gitlab/ensure")) {
    return jsonResponse({ id: gitlabIntegrationId, workspace_id: workspaceId, provider: "gitlab", auth_type: "personal_token", status: "needs_setup" });
  }
  if (url.includes(`/integrations/github/credentials`) && url.includes("kind=access_token")) {
    return jsonResponse({ value: "ghp_stored_token" });
  }
  if (url.includes(`/integrations/gitlab/credentials`) && url.includes("kind=access_token")) {
    return jsonResponse({ value: null });
  }
  if (url.includes(`/integrations/github/credentials`) && url.includes("kind=installation_id")) {
    return jsonResponse({ value: null });
  }
  if (url.includes("/integrations/github?")) {
    return jsonResponse({ id: githubIntegrationId, status: "connected" });
  }
  if (url.includes("/integrations/gitlab?")) {
    return jsonResponse({ id: gitlabIntegrationId, status: "connected" });
  }

  throw new Error(`Unexpected request: ${url}`);
}

test("listProviderIntegrations resolves real integration ids and reflects stored credential state", async () => {
  const stub = stubFetch(routeIntegrationsFetch);
  try {
    const integrations = await listProviderIntegrations(workspaceId);
    const github = integrations.find((integration) => integration.provider === "github");
    const gitlab = integrations.find((integration) => integration.provider === "gitlab");

    assert.equal(github?.id, githubIntegrationId);
    assert.equal(github?.credentialAvailable, true);
    assert.equal(gitlab?.id, gitlabIntegrationId);
    assert.equal(gitlab?.credentialAvailable, false);

    const ensureCalls = stub.calls.filter((call) => call.url.includes("/ensure"));
    assert.equal(ensureCalls.length, 2);
    for (const call of ensureCalls) {
      const body = JSON.parse(call.init.body as string);
      assert.equal(body.workspace_id, workspaceId);
    }
  } finally {
    stub.restore();
  }
});

test("recordProviderConnection PATCHes the status endpoint with connection metadata", async () => {
  const stub = stubFetch((call) => {
    assert.equal(call.init.method, "PATCH");
    assert.match(call.url, /\/integrations\/github\/status$/);
    const body = JSON.parse(call.init.body as string);
    assert.equal(body.integration_id, githubIntegrationId);
    assert.equal(body.status, "connected");
    assert.equal(body.installation_id, "installation-123");
    return jsonResponse({ id: githubIntegrationId, status: "connected" });
  });
  try {
    await recordProviderConnection({
      provider: "github",
      workspaceId,
      integrationId: githubIntegrationId,
      installationId: "installation-123"
    });
    assert.equal(stub.calls.length, 1);
  } finally {
    stub.restore();
  }
});

test("recordProviderConnection is a no-op without a workspace id", async () => {
  const stub = stubFetch(() => {
    throw new Error("fetch should not be called without a workspaceId");
  });
  try {
    await recordProviderConnection({ provider: "github", workspaceId: "", integrationId: githubIntegrationId });
    assert.equal(stub.calls.length, 0);
  } finally {
    stub.restore();
  }
});
