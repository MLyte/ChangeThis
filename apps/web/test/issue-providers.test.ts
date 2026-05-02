import assert from "node:assert/strict";
import test from "node:test";
import { getIssueProviderClient, IssueProviderError, listIssueProviderRepositories } from "../lib/issue-providers.ts";
import type { IssueDraft, IssueTarget } from "@changethis/shared";

const originalFetch = globalThis.fetch;
const originalTimeout = process.env.ISSUE_PROVIDER_TIMEOUT_MS;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalTimeout === undefined) {
    delete process.env.ISSUE_PROVIDER_TIMEOUT_MS;
  } else {
    process.env.ISSUE_PROVIDER_TIMEOUT_MS = originalTimeout;
  }
});

test("lists GitHub repositories with the configured provider token", async () => {
  const requests: Request[] = [];
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);

    return Response.json([
      {
        id: 123,
        name: "product-site",
        full_name: "agency/product-site",
        html_url: "https://github.com/agency/product-site",
        private: true,
        default_branch: "main"
      }
    ]);
  };

  const repositories = await listIssueProviderRepositories("github", { token: "github-token" });

  assert.equal(requests[0]?.url, "https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&sort=full_name&per_page=100");
  assert.equal(requests[0]?.headers.get("authorization"), "Bearer github-token");
  assert.deepEqual(repositories, [
    {
      provider: "github",
      id: "123",
      name: "product-site",
      fullName: "agency/product-site",
      namespace: "agency",
      project: "product-site",
      webUrl: "https://github.com/agency/product-site",
      private: true,
      defaultBranch: "main"
    }
  ]);
});

test("lists GitLab projects and preserves the numeric external project id", async () => {
  const requests: Request[] = [];
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);

    return Response.json([
      {
        id: 456,
        name: "product-site",
        path_with_namespace: "studio/product-site",
        web_url: "https://gitlab.com/studio/product-site",
        visibility: "private",
        default_branch: "main"
      }
    ]);
  };

  const repositories = await listIssueProviderRepositories("gitlab", { token: "gitlab-token" });

  assert.equal(requests[0]?.url, "https://gitlab.com/api/v4/projects?membership=true&simple=true&per_page=100");
  assert.equal(requests[0]?.headers.get("authorization"), "Bearer gitlab-token");
  assert.equal(requests[0]?.headers.get("private-token"), "gitlab-token");
  assert.deepEqual(repositories, [
    {
      provider: "gitlab",
      id: "456",
      name: "product-site",
      fullName: "studio/product-site",
      namespace: "studio",
      project: "product-site",
      webUrl: "https://gitlab.com/studio/product-site",
      private: true,
      defaultBranch: "main",
      externalProjectId: "456"
    }
  ]);
});

test("creates provider issues with the selected target", async () => {
  const requests: Request[] = [];
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);

    return Response.json({
      number: 12,
      html_url: "https://github.com/agency/product-site/issues/12",
      state: "open"
    });
  };

  const target: IssueTarget = {
    provider: "github",
    namespace: "agency",
    project: "product-site",
    integrationId: "local-github",
    webUrl: "https://github.com/agency/product-site"
  };
  const draft: IssueDraft = {
    title: "Clarifier le bouton",
    description: "Feedback client",
    labels: ["source:client-feedback"]
  };
  const client = getIssueProviderClient("github", { token: "github-token", integrationId: target.integrationId });
  const issue = await client.createIssue(target, draft, { idempotencyKey: "changethis:test" });

  assert.equal(requests[0]?.url, "https://api.github.com/repos/agency/product-site/issues");
  assert.equal(requests[0]?.headers.get("authorization"), "Bearer github-token");
  assert.equal(requests[0]?.headers.get("idempotency-key"), "changethis:test");
  assert.deepEqual(await requests[0]?.json(), {
    title: draft.title,
    body: draft.description,
    labels: draft.labels
  });
  assert.deepEqual(issue, {
    provider: "github",
    id: undefined,
    number: 12,
    url: "https://github.com/agency/product-site/issues/12",
    state: "open"
  });
});

test("times out provider issue creation as a transient failure", async () => {
  process.env.ISSUE_PROVIDER_TIMEOUT_MS = "1";
  globalThis.fetch = async (_input, init) => {
    await new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });
    });

    throw new Error("unreachable");
  };

  const target: IssueTarget = {
    provider: "github",
    namespace: "agency",
    project: "product-site",
    integrationId: "local-github",
    webUrl: "https://github.com/agency/product-site"
  };
  const draft: IssueDraft = {
    title: "Clarifier le bouton",
    description: "Feedback client",
    labels: ["source:client-feedback"]
  };
  const client = getIssueProviderClient("github", { token: "github-token", integrationId: target.integrationId });

  await assert.rejects(
    () => client.createIssue(target, draft),
    (error) => error instanceof IssueProviderError
      && error.provider === "github"
      && error.code === "transient_failure"
      && error.message === "github request timed out."
  );
});
