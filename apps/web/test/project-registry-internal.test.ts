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

type ProjectRegistryModule = typeof import("../lib/project-registry.ts");

const {
  listConfiguredProjects,
  findConfiguredProjectByKey,
  createConnectedSite,
  updateProjectWidgetSettings,
  deleteConnectedSite,
  clearConnectedSites,
  saveProjectIssueTarget,
  isKnownOrigin,
  ProjectTargetValidationError
} = (await import(pathToFileURL(path.join(process.cwd(), "lib/project-registry.ts")).href)) as ProjectRegistryModule;

type FetchCall = { url: string; init: RequestInit };

function stubFetch(handler: (call: FetchCall, callIndex: number) => Response | Promise<Response>) {
  const calls: FetchCall[] = [];
  const original = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === "string" ? input : input.toString();
    const call = { url, init };
    calls.push(call);
    return handler(call, calls.length - 1);
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

const siteRow = {
  id: "11111111-1111-1111-1111-111111111111",
  workspace_id: "22222222-2222-2222-2222-222222222222",
  public_key: "ct_abc123",
  name: "Marketing site",
  allowed_origins: ["https://example.com"],
  widget_locale: "fr",
  widget_button_position: "bottom-right",
  widget_button_variant: "default",
  widget_display_mode: "standard",
  widget_reporter_fields: "optional",
  widget_title: "Que faut-il changer ?",
  widget_modes: ["comment", "pin", "screenshot"],
  issue_creation_mode: "manual",
  issue_target: {
    provider: "github",
    namespace: "acme",
    project_name: "site",
    integration_id: null,
    external_project_id: null,
    web_url: "https://github.com/acme/site"
  },
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z"
};

test("listConfiguredProjects fetches sites for the workspace via the internal API", async () => {
  const stub = stubFetch(() => jsonResponse([siteRow]));
  try {
    const projects = await listConfiguredProjects("22222222-2222-2222-2222-222222222222");
    assert.equal(projects.length, 1);
    assert.equal(projects[0].publicKey, "ct_abc123");
    assert.equal(projects[0].issueTarget.project, "site");
    assert.equal(stub.calls.length, 1);
    assert.match(stub.calls[0].url, /^http:\/\/internal\.invalid\/sites\?workspace_id=/);
  } finally {
    stub.restore();
  }
});

test("listConfiguredProjects returns an empty list when no workspace is given", async () => {
  const stub = stubFetch(() => {
    throw new Error("fetch should not be called without a workspaceId");
  });
  try {
    assert.deepEqual(await listConfiguredProjects(), []);
  } finally {
    stub.restore();
  }
});

test("findConfiguredProjectByKey looks up a public project without a session when no workspace is given", async () => {
  const stub = stubFetch((call) => {
    assert.match(call.url, /^http:\/\/internal\.invalid\/public\/projects\/ct_abc123$/);
    assert.equal((call.init.headers as Record<string, string> | undefined)?.Cookie, undefined);
    return jsonResponse(siteRow);
  });
  try {
    const project = await findConfiguredProjectByKey("ct_abc123");
    assert.equal(project?.publicKey, "ct_abc123");
  } finally {
    stub.restore();
  }
});

test("findConfiguredProjectByKey returns undefined for an unknown public key", async () => {
  const stub = stubFetch(() => jsonResponse({ detail: "Unknown project" }, 404));
  try {
    const project = await findConfiguredProjectByKey("ct_missing");
    assert.equal(project, undefined);
  } finally {
    stub.restore();
  }
});

test("createConnectedSite posts the parsed issue target to the internal API", async () => {
  const stub = stubFetch((call) => {
    assert.equal(call.init.method, "POST");
    const body = JSON.parse(call.init.body as string);
    assert.equal(body.issue_target.provider, "github");
    assert.equal(body.issue_target.namespace, "agency");
    assert.equal(body.issue_target.project_name, "product-site");
    assert.deepEqual(body.allowed_origins, ["https://product.example"]);
    return jsonResponse({ ...siteRow, issue_target: body.issue_target });
  });
  try {
    const site = await createConnectedSite({
      allowedOrigin: "https://product.example/pricing",
      provider: "github",
      repositoryUrl: "https://github.com/agency/product-site",
      workspaceId: "22222222-2222-2222-2222-222222222222"
    });
    assert.equal(site.issueTarget.namespace, "agency");
  } finally {
    stub.restore();
  }
});

test("createConnectedSite rejects an invalid repository URL before calling the API", async () => {
  const stub = stubFetch(() => {
    throw new Error("fetch should not be called for an invalid repository URL");
  });
  try {
    await assert.rejects(
      createConnectedSite({
        allowedOrigin: "https://product.example",
        provider: "github",
        repositoryUrl: "not-a-url",
        workspaceId: "22222222-2222-2222-2222-222222222222"
      }),
      ProjectTargetValidationError
    );
    assert.equal(stub.calls.length, 0);
  } finally {
    stub.restore();
  }
});

test("updateProjectWidgetSettings sends a PATCH to the site's endpoint", async () => {
  const stub = stubFetch((call) => {
    assert.equal(call.init.method, "PATCH");
    assert.match(call.url, /\/sites\/ct_abc123$/);
    const body = JSON.parse(call.init.body as string);
    assert.equal(body.name, "Renamed project");
    assert.equal(body.widget_title, "Give feedback");
    return jsonResponse(siteRow);
  });
  try {
    await updateProjectWidgetSettings({
      projectKey: "ct_abc123",
      name: "Renamed project",
      widgetLocale: "en",
      widgetButtonPosition: "top-left",
      widgetButtonVariant: "subtle",
      widgetDisplayMode: "subtle",
      widgetReporterFields: "required",
      widgetTitle: "Give feedback",
      widgetModes: ["comment"],
      issueCreationMode: "automatic"
    });
    assert.equal(stub.calls.length, 1);
  } finally {
    stub.restore();
  }
});

test("deleteConnectedSite returns false on 404 and true otherwise", async () => {
  const stub = stubFetch((_call, index) => (index === 0 ? new Response(null, { status: 404 }) : new Response(null, { status: 204 })));
  try {
    assert.equal(await deleteConnectedSite("ct_missing"), false);
    assert.equal(await deleteConnectedSite("ct_abc123"), true);
  } finally {
    stub.restore();
  }
});

test("clearConnectedSites returns the deleted count from the API", async () => {
  const stub = stubFetch((call) => {
    assert.equal(call.init.method, "DELETE");
    assert.match(call.url, /^http:\/\/internal\.invalid\/sites\?workspace_id=/);
    return jsonResponse({ deleted: 3 });
  });
  try {
    const deleted = await clearConnectedSites("22222222-2222-2222-2222-222222222222");
    assert.equal(deleted, 3);
  } finally {
    stub.restore();
  }
});

test("saveProjectIssueTarget PUTs the parsed target to the issue-target endpoint", async () => {
  const stub = stubFetch((call, index) => {
    if (index === 0) {
      assert.match(call.url, /^http:\/\/internal\.invalid\/sites\?workspace_id=/);
      return jsonResponse([siteRow]);
    }

    assert.equal(call.init.method, "PUT");
    assert.match(call.url, /\/sites\/ct_abc123\/issue-target$/);
    const body = JSON.parse(call.init.body as string);
    assert.equal(body.namespace, "group/subgroup");
    return jsonResponse({ ...siteRow, issue_target: { ...siteRow.issue_target, namespace: body.namespace, project_name: body.project_name } });
  });
  try {
    const project = await saveProjectIssueTarget(
      {
        projectKey: "ct_abc123",
        provider: "gitlab",
        repositoryUrl: "https://gitlab.com/group/subgroup/repo"
      },
      "22222222-2222-2222-2222-222222222222"
    );
    assert.equal(project.issueTarget.namespace, "group/subgroup");
    assert.equal(stub.calls.length, 2);
  } finally {
    stub.restore();
  }
});

test("isKnownOrigin queries the public origins endpoint without a session", async () => {
  const stub = stubFetch((call) => {
    assert.match(call.url, /^http:\/\/internal\.invalid\/public\/origins\/known\?origin=/);
    assert.equal((call.init.headers as Record<string, string> | undefined)?.Cookie, undefined);
    return jsonResponse({ known: true });
  });
  try {
    assert.equal(await isKnownOrigin("https://example.com"), true);
  } finally {
    stub.restore();
  }
});
