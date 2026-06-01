import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import type { AuthSession } from "../lib/auth.ts";

const directory = await mkdtemp(path.join(tmpdir(), "changethis-project-issue-access-"));
process.env.CHANGETHIS_DATA_DIR = directory;
process.env.DATA_STORE = "file";

const projectRegistry = await import(pathToFileURL(path.join(process.cwd(), "lib/project-registry.ts")).href) as typeof import("../lib/project-registry.ts");
const projectIssueAccess = await import(pathToFileURL(path.join(process.cwd(), "lib/project-issue-access.ts")).href) as typeof import("../lib/project-issue-access.ts");

test.after(async () => {
  await rm(directory, { recursive: true, force: true });
});

test("stores site issue access and builds a project-limited scope for viewers", async () => {
  const site = await projectRegistry.createConnectedSite({
    allowedOrigin: "https://client.example",
    provider: "github",
    repositoryUrl: "https://github.com/agency/client",
    workspaceId: "workspace_access_test"
  });

  const accesses = await projectIssueAccess.replaceProjectIssueAccesses({
    workspaceId: "workspace_access_test",
    projectKey: site.publicKey,
    userIds: ["user_viewer"]
  });

  assert.deepEqual(accesses.map((access) => access.userId), ["user_viewer"]);

  const scope = await projectIssueAccess.getIssueAccessScope(viewerSession);
  assert.deepEqual(scope, {
    kind: "project",
    projectKeys: [site.publicKey]
  });

  assert.deepEqual(projectIssueAccess.filterProjectsForIssueAccess([site], scope).map((project) => project.publicKey), [site.publicKey]);
});

test("keeps member and admin roles on global issue access", async () => {
  assert.deepEqual(await projectIssueAccess.getIssueAccessScope(memberSession), { kind: "global" });
});

const viewerSession: AuthSession = {
  user: {
    id: "user_viewer",
    email: "viewer@example.com"
  },
  workspace: {
    id: "workspace_access_test",
    name: "Access Test",
    role: "viewer"
  }
};

const memberSession: AuthSession = {
  user: {
    id: "user_member",
    email: "member@example.com"
  },
  workspace: {
    id: "workspace_access_test",
    name: "Access Test",
    role: "member"
  }
};
