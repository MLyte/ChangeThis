import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import test from "node:test";

process.env.DATA_STORE = "supabase";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";

type ProjectRegistryModule = typeof import("../lib/project-registry.ts");

const {
  findConfiguredProjectByKey,
  listConfiguredProjects
} = await import(`${pathToFileURL(`${process.cwd()}/lib/project-registry.ts`).href}?supabase-test`) as ProjectRegistryModule;

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("lists Supabase projects with active keys, issue targets, and workspace scope", async () => {
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input.toString());
    calls.push(`${url.pathname}?${url.searchParams.toString()}`);

    if (url.pathname === "/rest/v1/projects") {
      assert.equal(url.searchParams.get("organization_id"), "eq.11111111-1111-4111-8111-111111111111");
      return jsonResponse([{
        id: "22222222-2222-4222-8222-222222222222",
        organization_id: "11111111-1111-4111-8111-111111111111",
        name: "Client Portal",
        public_key: "legacy_ct_key",
        allowed_origins: ["https://client.example"],
        widget_locale: "en",
        widget_button_position: "bottom-left",
        widget_button_variant: "subtle",
        created_at: "2026-05-02T08:00:00.000Z",
        updated_at: "2026-05-02T09:00:00.000Z"
      }]);
    }

    if (url.pathname === "/rest/v1/project_public_keys") {
      return jsonResponse([{
        project_id: "22222222-2222-4222-8222-222222222222",
        public_key: "ct_active_key"
      }]);
    }

    if (url.pathname === "/rest/v1/issue_targets") {
      return jsonResponse([{
        project_id: "22222222-2222-4222-8222-222222222222",
        provider: "github",
        namespace: "agency",
        project_name: "client-portal",
        integration_id: "33333333-3333-4333-8333-333333333333",
        external_project_id: null,
        web_url: "https://github.com/agency/client-portal"
      }]);
    }

    throw new Error(`Unexpected Supabase request: ${url.toString()}`);
  };

  const projects = await listConfiguredProjects("11111111-1111-4111-8111-111111111111");

  assert.equal(projects.length, 1);
  assert.deepEqual({
    ...projects[0],
    issueTarget: {
      provider: projects[0].issueTarget.provider,
      namespace: projects[0].issueTarget.namespace,
      project: projects[0].issueTarget.project,
      integrationId: projects[0].issueTarget.integrationId,
      webUrl: projects[0].issueTarget.webUrl
    }
  }, {
    id: "22222222-2222-4222-8222-222222222222",
    workspaceId: "11111111-1111-4111-8111-111111111111",
    publicKey: "ct_active_key",
    name: "Client Portal",
    allowedOrigins: ["https://client.example"],
    widgetLocale: "en",
    widgetButtonPosition: "bottom-left",
    widgetButtonVariant: "subtle",
    issueTarget: {
      provider: "github",
      namespace: "agency",
      project: "client-portal",
      integrationId: "33333333-3333-4333-8333-333333333333",
      webUrl: "https://github.com/agency/client-portal"
    },
    createdAt: "2026-05-02T08:00:00.000Z",
    updatedAt: "2026-05-02T09:00:00.000Z"
  });
  assert.equal(calls.some((call) => call.startsWith("/rest/v1/projects?")), true);
});

test("does not fall back to the hard-coded demo project in Supabase mode", async () => {
  globalThis.fetch = async (input) => {
    const url = new URL(input.toString());

    if (url.pathname === "/rest/v1/project_public_keys") {
      return jsonResponse([]);
    }

    throw new Error(`Unexpected Supabase request: ${url.toString()}`);
  };

  assert.equal(await findConfiguredProjectByKey("changethis_demo_public_key"), undefined);
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json"
    },
    status: 200
  });
}
