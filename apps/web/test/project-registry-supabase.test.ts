import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import test from "node:test";

process.env.DATA_STORE = "supabase";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";

type ProjectRegistryModule = typeof import("../lib/project-registry.ts");

const {
  ensureWorkspaceDemoProject,
  findConfiguredProjectByKey,
  listConfiguredProjects,
  updateProjectWidgetSettings
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
        widget_reporter_fields: "required",
        issue_creation_mode: "automatic",
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
    widgetReporterFields: "required",
    issueCreationMode: "automatic",
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

test("creates a workspace-scoped demo project in Supabase mode", async () => {
  const workspaceId = "11111111-1111-4111-8111-111111111111";
  const projectId = "22222222-2222-4222-8222-222222222222";
  const publicKey = "ct_demo_11111111111141118111111111111111";
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input.toString());
    const method = init.method ?? "GET";
    const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ method, path: url.pathname, body });

    if (url.pathname === "/rest/v1/project_public_keys" && method === "GET") {
      return jsonResponse([]);
    }

    if (url.pathname === "/rest/v1/projects" && method === "POST") {
      assert.deepEqual(body, {
        organization_id: workspaceId,
        name: "Demo",
        public_key: publicKey,
        allowed_origins: [
          "https://app.example.test",
          "http://localhost:3000",
          "http://127.0.0.1:3000"
        ],
        widget_locale: "fr",
        widget_button_position: "bottom-right",
        widget_button_variant: "default",
        widget_reporter_fields: "optional",
        issue_creation_mode: "manual"
      });

      return jsonResponse([{
        id: projectId,
        organization_id: workspaceId,
        name: "Demo",
        public_key: publicKey,
        allowed_origins: body.allowed_origins,
        widget_locale: "fr",
        widget_button_position: "bottom-right",
        widget_button_variant: "default",
        widget_reporter_fields: "optional",
        issue_creation_mode: "manual",
        created_at: "2026-05-19T10:00:00.000Z",
        updated_at: "2026-05-19T10:00:00.000Z"
      }]);
    }

    if (url.pathname === "/rest/v1/project_public_keys" && method === "POST") {
      assert.deepEqual(body, {
        project_id: projectId,
        public_key: publicKey,
        status: "active",
        activated_at: "2026-05-19T10:00:00.000Z"
      });
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/rest/v1/issue_targets" && method === "POST") {
      assert.equal(body.project_id, projectId);
      assert.equal(body.provider, "github");
      assert.equal(body.namespace, "MLyte");
      assert.equal(body.project_name, "ChangeThis");

      return jsonResponse([{
        project_id: projectId,
        provider: "github",
        namespace: "MLyte",
        project_name: "ChangeThis",
        integration_id: null,
        external_project_id: null,
        web_url: "https://github.com/MLyte/ChangeThis"
      }]);
    }

    throw new Error(`Unexpected Supabase request: ${method} ${url.toString()}`);
  };

  const project = await ensureWorkspaceDemoProject(workspaceId, "https://app.example.test/demo");

  assert.equal(project.workspaceId, workspaceId);
  assert.equal(project.publicKey, publicKey);
  assert.equal(project.name, "Demo");
  assert.equal(project.allowedOrigins.includes("https://app.example.test"), true);
  assert.equal(calls.filter((call) => call.method === "POST").length, 3);
});

test("updates widget settings without reporter fields when Supabase schema is behind", async () => {
  const workspaceId = "11111111-1111-4111-8111-111111111111";
  const projectId = "22222222-2222-4222-8222-222222222222";
  const calls: Array<{ method: string; path: string; select?: string | null; body?: unknown }> = [];

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input.toString());
    const method = init.method ?? "GET";
    const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ method, path: url.pathname, select: url.searchParams.get("select"), body });

    if (url.pathname === "/rest/v1/project_public_keys" && method === "GET") {
      return jsonResponse([{ project_id: projectId, public_key: "ct_active_key" }]);
    }

    if (url.pathname === "/rest/v1/projects" && method === "GET") {
      return jsonResponse([baseSupabaseProjectRow({
        id: projectId,
        organization_id: workspaceId,
        public_key: "ct_active_key"
      })]);
    }

    if (url.pathname === "/rest/v1/projects" && method === "PATCH") {
      if (body && ("widget_reporter_fields" in body || "issue_creation_mode" in body)) {
        return new Response(JSON.stringify({ message: "column projects.widget_reporter_fields does not exist" }), {
          headers: { "Content-Type": "application/json" },
          status: 400
        });
      }

      assert.deepEqual(body, {
        widget_locale: "fr",
        widget_button_position: "top-left",
        widget_button_variant: "subtle"
      });
      assert.equal(url.searchParams.get("select")?.includes("widget_reporter_fields"), false);
      assert.equal(url.searchParams.get("select")?.includes("issue_creation_mode"), false);

      return jsonResponse([baseSupabaseProjectRow({
        id: projectId,
        organization_id: workspaceId,
        public_key: "ct_active_key",
        widget_button_position: "top-left",
        widget_button_variant: "subtle",
        widget_locale: "fr"
      })]);
    }

    if (url.pathname === "/rest/v1/issue_targets" && method === "GET") {
      return jsonResponse([{
        project_id: projectId,
        provider: "github",
        namespace: "agency",
        project_name: "client-portal",
        integration_id: null,
        external_project_id: null,
        web_url: "https://github.com/agency/client-portal"
      }]);
    }

    throw new Error(`Unexpected Supabase request: ${method} ${url.toString()}`);
  };

  const project = await updateProjectWidgetSettings({
    projectKey: "ct_active_key",
    widgetLocale: "fr",
    widgetButtonPosition: "top-left",
    widgetButtonVariant: "subtle",
    widgetReporterFields: "required",
    issueCreationMode: "automatic"
  }, workspaceId);

  assert.equal(project.widgetButtonPosition, "top-left");
  assert.equal(project.widgetButtonVariant, "subtle");
  assert.equal(project.widgetReporterFields, "optional");
  assert.equal(project.issueCreationMode, "manual");
  assert.equal(calls.filter((call) => call.method === "PATCH").length, 2);
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json"
    },
    status: 200
  });
}

function baseSupabaseProjectRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    organization_id: "11111111-1111-4111-8111-111111111111",
    name: "Client Portal",
    public_key: "ct_active_key",
    allowed_origins: ["https://client.example"],
    widget_locale: "en",
    widget_button_position: "bottom-left",
    widget_button_variant: "default",
    widget_reporter_fields: "optional",
    issue_creation_mode: "manual",
    created_at: "2026-05-02T08:00:00.000Z",
    updated_at: "2026-05-02T09:00:00.000Z",
    ...overrides
  };
}
