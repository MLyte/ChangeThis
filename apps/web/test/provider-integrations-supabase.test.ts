import assert from "node:assert/strict";
import test from "node:test";

process.env.DATA_STORE = "supabase";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
process.env.CHANGETHIS_SECRET_KEY = "test-provider-secret";
process.env.GITLAB_OAUTH_APP_ID = "gitlab-app-id";
process.env.GITLAB_OAUTH_APP_SECRET = "gitlab-app-secret";

type ProviderIntegrationsModule = typeof import("../lib/provider-integrations.ts");
type CredentialStoreModule = typeof import("../lib/credential-store.ts");

const providerModule = await import(`${new URL("../lib/provider-integrations.ts", import.meta.url).href}?provider-supabase-test`) as ProviderIntegrationsModule;
const credentialModule = await import(`${new URL("../lib/credential-store.ts", import.meta.url).href}?credential-supabase-test`) as CredentialStoreModule;

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

const workspaceId = "11111111-1111-4111-8111-111111111111";
const integrationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

test("Supabase provider integrations use encrypted DB credentials by workspace", async () => {
  const fake = createFakeSupabase([{
    id: integrationId,
    organization_id: workspaceId,
    provider: "gitlab",
    auth_type: "oauth",
    external_account_id: null,
    installation_id: null,
    base_url: "https://gitlab.com",
    status: "connected",
    created_at: "2026-05-02T09:00:00.000Z",
    updated_at: "2026-05-02T09:00:00.000Z"
  }]);
  globalThis.fetch = fake.fetch;

  await credentialModule.saveProviderCredentialSecretAsync({
    workspaceId,
    provider: "gitlab",
    integrationId,
    kind: "access_token",
    value: "gitlab-secret-token",
    scopes: ["api", "read_user"]
  });

  assert.equal(await credentialModule.getProviderCredentialSecretAsync("gitlab", integrationId, "access_token", workspaceId), "gitlab-secret-token");
  assert.equal(fake.credentials[0].ciphertext === "gitlab-secret-token", false);

  const integrations = await providerModule.listProviderIntegrationsAsync(workspaceId);
  const gitlab = integrations.find((integration) => integration.provider === "gitlab");
  assert.equal(gitlab?.id, integrationId);
  assert.equal(gitlab?.credentialConfigured, true);
  assert.equal(gitlab?.status, "connected");
  assert.equal(await providerModule.getProviderIntegrationTokenAsync("gitlab", integrationId, workspaceId), "gitlab-secret-token");

  assert.equal(await credentialModule.deleteProviderCredentialSecretsAsync("gitlab", integrationId, workspaceId), 1);
  assert.equal(await credentialModule.getProviderCredentialSecretAsync("gitlab", integrationId, "access_token", workspaceId), undefined);
});

test("Supabase connect URL creates a setup integration instead of using local ids", async () => {
  const fake = createFakeSupabase([]);
  globalThis.fetch = fake.fetch;

  const connectUrl = await providerModule.getProviderConnectUrlAsync("gitlab", "https://app.example.test/settings", "/settings?section=providers", workspaceId);

  assert.ok(connectUrl?.startsWith("https://gitlab.com/oauth/authorize?"));
  assert.equal(fake.integrations.length, 1);
  assert.equal(fake.integrations[0].organization_id, workspaceId);
  assert.equal(fake.integrations[0].provider, "gitlab");
  assert.equal(fake.integrations[0].status, "needs_setup");
  assert.match(String(connectUrl), /state=/);
});

function createFakeSupabase(initialIntegrations: Array<Record<string, unknown>>): {
  fetch: typeof globalThis.fetch;
  integrations: Array<Record<string, unknown>>;
  credentials: Array<Record<string, unknown>>;
} {
  const integrations = [...initialIntegrations];
  const credentials: Array<Record<string, unknown>> = [];

  return {
    integrations,
    credentials,
    fetch: async (input, init) => {
      const url = new URL(input.toString());
      const body = init?.body ? JSON.parse(init.body.toString()) as Record<string, unknown> : {};

      if (url.pathname === "/rest/v1/provider_integrations" && init?.method === "POST") {
        const row = {
          id: `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb${integrations.length}`,
          created_at: "2026-05-02T10:00:00.000Z",
          updated_at: "2026-05-02T10:00:00.000Z",
          ...body
        };
        integrations.push(row);
        return jsonResponse([row], 201);
      }

      if (url.pathname === "/rest/v1/provider_integrations" && init?.method === "PATCH") {
        const rows = filterRows(integrations, url.searchParams);
        for (const row of rows) {
          Object.assign(row, body);
        }
        return jsonResponse([], 204);
      }

      if (url.pathname === "/rest/v1/provider_integrations") {
        return jsonResponse(filterRows(integrations, url.searchParams));
      }

      if (url.pathname === "/rest/v1/provider_integration_credentials" && init?.method === "POST") {
        const row = {
          id: `cccccccc-cccc-4ccc-8ccc-ccccccccccc${credentials.length}`,
          created_at: "2026-05-02T10:05:00.000Z",
          updated_at: "2026-05-02T10:05:00.000Z",
          ...body
        };
        credentials.push(row);
        return jsonResponse([], 201);
      }

      if (url.pathname === "/rest/v1/provider_integration_credentials" && init?.method === "PATCH") {
        const rows = filterRows(credentials, url.searchParams);
        for (const row of rows) {
          Object.assign(row, body);
        }
        return jsonResponse([], 204);
      }

      if (url.pathname === "/rest/v1/provider_integration_credentials" && init?.method === "DELETE") {
        const rows = filterRows(credentials, url.searchParams);
        for (const row of rows) {
          const index = credentials.indexOf(row);
          if (index >= 0) {
            credentials.splice(index, 1);
          }
        }
        return jsonResponse([], 204);
      }

      if (url.pathname === "/rest/v1/provider_integration_credentials") {
        return jsonResponse(filterRows(credentials, url.searchParams));
      }

      throw new Error(`Unexpected Supabase request: ${url.pathname}?${url.searchParams.toString()}`);
    }
  };
}

function filterRows<T extends Record<string, unknown>>(rows: T[], params: URLSearchParams): T[] {
  return rows.filter((row) => {
    for (const [key, value] of params.entries()) {
      if (key === "select" || key === "order" || key === "limit") {
        continue;
      }

      if (value.startsWith("eq.") && String(row[key]) !== stripEq(value)) {
        return false;
      }

      if (value.startsWith("in.") && !stripIn(value).includes(String(row[key]))) {
        return false;
      }
    }

    return true;
  });
}

function stripEq(value: string): string {
  return value.startsWith("eq.") ? value.slice(3) : value;
}

function stripIn(value: string): string[] {
  if (!value.startsWith("in.(") || !value.endsWith(")")) {
    return [];
  }

  return value.slice(4, -1).split(",").filter(Boolean);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(status === 204 ? undefined : JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json"
    },
    status
  });
}
