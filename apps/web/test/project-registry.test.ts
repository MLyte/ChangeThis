import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const directory = await mkdtemp(path.join(tmpdir(), "changethis-project-registry-"));
process.env.CHANGETHIS_DATA_DIR = directory;
process.env.GITLAB_BASE_URL = "https://gitrural.cra.wallonie.be";

type ProjectRegistryModule = typeof import("../lib/project-registry.ts");

const {
  createConnectedSite,
  deleteConnectedSite,
  ProjectTargetValidationError,
  listConfiguredProjects,
  saveProjectIssueTarget
} = await import(pathToFileURL(path.join(process.cwd(), "lib/project-registry.ts")).href) as ProjectRegistryModule;

test.after(async () => {
  await rm(directory, { recursive: true, force: true });
});

test("starts with no connected sites in an empty local registry", async () => {
  assert.deepEqual(await listConfiguredProjects(), []);
});

test("creates a connected GitHub site with the selected repository and integration", async () => {
  const site = await createConnectedSite({
    name: "Product Site",
    allowedOrigin: "https://product.example/pricing",
    provider: "github",
    repositoryUrl: "https://github.com/agency/product-site",
    integrationId: "integration_github_mlyte"
  });

  assert.equal(site.name, "Product Site");
  assert.equal(site.allowedOrigins[0], "https://product.example");
  assert.match(site.publicKey, /^ct_[a-f0-9]+$/);
  assert.equal(site.issueTarget.provider, "github");
  assert.equal(site.issueTarget.namespace, "agency");
  assert.equal(site.issueTarget.project, "product-site");
  assert.equal(site.issueTarget.integrationId, "integration_github_mlyte");
  assert.equal(site.issueTarget.webUrl, "https://github.com/agency/product-site");

  const configured = await listConfiguredProjects();
  assert.equal(configured.some((project) => project.publicKey === site.publicKey), true);
});

test("creates a connected GitLab site and preserves the provider project id", async () => {
  const site = await createConnectedSite({
    allowedOrigin: "https://client.example",
    provider: "gitlab",
    repositoryUrl: "https://gitrural.cra.wallonie.be/group/subgroup/product-site",
    integrationId: "integration_gitlab_local",
    externalProjectId: "456"
  });

  assert.equal(site.name, "product-site");
  assert.equal(site.issueTarget.provider, "gitlab");
  assert.equal(site.issueTarget.namespace, "group/subgroup");
  assert.equal(site.issueTarget.project, "product-site");
  assert.equal(site.issueTarget.integrationId, "integration_gitlab_local");
  assert.equal(site.issueTarget.externalProjectId, "456");
  assert.equal(site.issueTarget.webUrl, "https://gitrural.cra.wallonie.be/group/subgroup/product-site");
});

test("updates and deletes a connected site", async () => {
  const site = await createConnectedSite({
    name: "Docs",
    allowedOrigin: "https://docs.example",
    provider: "github",
    repositoryUrl: "https://github.com/agency/docs",
    integrationId: "integration_github_mlyte"
  });

  const updated = await saveProjectIssueTarget({
    projectKey: site.publicKey,
    provider: "gitlab",
    repositoryUrl: "https://gitrural.cra.wallonie.be/group/docs",
    integrationId: "integration_gitlab_local",
    externalProjectId: "789"
  });

  assert.equal(updated.issueTarget.provider, "gitlab");
  assert.equal(updated.issueTarget.externalProjectId, "789");
  assert.equal(await deleteConnectedSite(site.publicKey), true);
  assert.equal((await listConfiguredProjects()).some((project) => project.publicKey === site.publicKey), false);
  assert.equal(await deleteConnectedSite(site.publicKey), false);
});

test("rejects a repository URL that does not match the selected provider", async () => {
  await assert.rejects(
    () => createConnectedSite({
      allowedOrigin: "https://product.example",
      provider: "github",
      repositoryUrl: "https://gitlab.com/group/product-site"
    }),
    (error) => {
      if (!(error instanceof ProjectTargetValidationError)) {
        return false;
      }

      assert.equal(error.status, 422);
      assert.equal(error.message, "Repository URL must match the selected provider");
      return true;
    }
  );
});
