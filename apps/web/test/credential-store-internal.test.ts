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

type CredentialStoreModule = typeof import("../lib/credential-store.ts");

const {
  saveProviderCredentialSecretAsync,
  getProviderCredentialSecretAsync,
  deleteProviderCredentialSecretsAsync
} = (await import(pathToFileURL(path.join(process.cwd(), "lib/credential-store.ts")).href)) as CredentialStoreModule;

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

const integrationId = "44444444-4444-4444-4444-444444444444";

test("saveProviderCredentialSecretAsync POSTs the encrypted credential request", async () => {
  const stub = stubFetch((call) => {
    assert.equal(call.url, "http://internal.invalid/integrations/github/credentials");
    assert.equal(call.init.method, "POST");
    const body = JSON.parse(call.init.body as string);
    assert.equal(body.integration_id, integrationId);
    assert.equal(body.kind, "access_token");
    assert.equal(body.value, "ghp_secret");
    return jsonResponse({ storage_reference: `db:github:${integrationId}:access_token` });
  });
  try {
    const reference = await saveProviderCredentialSecretAsync({
      provider: "github",
      integrationId,
      kind: "access_token",
      value: "ghp_secret"
    });
    assert.equal(reference, `db:github:${integrationId}:access_token`);
  } finally {
    stub.restore();
  }
});

test("getProviderCredentialSecretAsync queries by integration id and kind", async () => {
  const stub = stubFetch((call) => {
    assert.match(call.url, /^http:\/\/internal\.invalid\/integrations\/github\/credentials\?/);
    assert.match(call.url, new RegExp(`integration_id=${integrationId}`));
    assert.match(call.url, /kind=access_token/);
    return jsonResponse({ value: "ghp_secret" });
  });
  try {
    const value = await getProviderCredentialSecretAsync("github", integrationId, "access_token");
    assert.equal(value, "ghp_secret");
  } finally {
    stub.restore();
  }
});

test("getProviderCredentialSecretAsync returns undefined without an integration id", async () => {
  const stub = stubFetch(() => {
    throw new Error("fetch should not be called without an integrationId");
  });
  try {
    assert.equal(await getProviderCredentialSecretAsync("github", undefined, "access_token"), undefined);
  } finally {
    stub.restore();
  }
});

test("deleteProviderCredentialSecretsAsync DELETEs and returns the removed count", async () => {
  const stub = stubFetch((call) => {
    assert.equal(call.init.method, "DELETE");
    assert.match(call.url, new RegExp(`integration_id=${integrationId}`));
    return jsonResponse({ removed: 2 });
  });
  try {
    const removed = await deleteProviderCredentialSecretsAsync("github", integrationId);
    assert.equal(removed, 2);
  } finally {
    stub.restore();
  }
});
