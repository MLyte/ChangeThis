import type { ExternalIssueRef, IssueDraft, IssueProvider, IssueTarget } from "@changethis/shared";

export type IssueProviderErrorCode =
  | "auth_failed"
  | "permission_denied"
  | "target_not_found"
  | "validation_failed"
  | "rate_limited"
  | "transient_failure";

export class IssueProviderError extends Error {
  readonly code: IssueProviderErrorCode;
  readonly provider: IssueProvider;
  readonly status?: number;

  constructor(provider: IssueProvider, code: IssueProviderErrorCode, message: string, status?: number) {
    super(message);
    this.name = "IssueProviderError";
    this.provider = provider;
    this.code = code;
    this.status = status;
  }
}

export type IssueProviderClient = {
  provider: IssueProvider;
  createIssue(target: IssueTarget, draft: IssueDraft, options?: { idempotencyKey?: string }): Promise<ExternalIssueRef>;
  getIssue?(target: IssueTarget, ref: ExternalIssueRef): Promise<ExternalIssueRef>;
};

export function getIssueProviderClient(provider: IssueProvider): IssueProviderClient {
  if (provider === "github" && process.env.GITHUB_TOKEN) {
    return githubClient;
  }

  if (provider === "gitlab" && process.env.GITLAB_TOKEN) {
    return gitlabClient;
  }

  return createUnsupportedProviderClient(provider);
}

function createUnsupportedProviderClient(provider: IssueProvider): IssueProviderClient {
  return {
    provider,
    async createIssue() {
      throw new IssueProviderError(
        provider,
        "transient_failure",
        `${provider} issue creation is not wired yet.`
      );
    }
  };
}

const githubClient: IssueProviderClient = {
  provider: "github",
  async createIssue(target, draft, options) {
    const token = requireEnv("GITHUB_TOKEN");
    const response = await fetch(`https://api.github.com/repos/${target.namespace}/${target.project}/issues`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "ChangeThis",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options?.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {})
      },
      body: JSON.stringify({
        title: draft.title,
        body: draft.description,
        labels: draft.labels
      })
    });

    const body = await parseResponseBody(response);

    if (!response.ok) {
      throw providerError("github", response.status, body);
    }

    if (!isRecord(body) || typeof body.html_url !== "string") {
      throw new IssueProviderError("github", "validation_failed", "GitHub returned an unexpected issue payload.");
    }

    return {
      provider: "github",
      id: typeof body.id === "number" ? String(body.id) : undefined,
      number: typeof body.number === "number" ? body.number : undefined,
      url: body.html_url,
      state: body.state === "closed" ? "closed" : "open"
    };
  }
};

const gitlabClient: IssueProviderClient = {
  provider: "gitlab",
  async createIssue(target, draft, options) {
    const token = requireEnv("GITLAB_TOKEN");
    const projectId = target.externalProjectId ?? encodeURIComponent(`${target.namespace}/${target.project}`);
    const baseUrl = process.env.GITLAB_BASE_URL || "https://gitlab.com";
    const response = await fetch(`${baseUrl}/api/v4/projects/${projectId}/issues`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": options?.idempotencyKey ?? "",
        "PRIVATE-TOKEN": token
      },
      body: JSON.stringify({
        title: draft.title,
        description: draft.description,
        labels: draft.labels.join(",")
      })
    });

    const body = await parseResponseBody(response);

    if (!response.ok) {
      throw providerError("gitlab", response.status, body);
    }

    if (!isRecord(body) || typeof body.web_url !== "string") {
      throw new IssueProviderError("gitlab", "validation_failed", "GitLab returned an unexpected issue payload.");
    }

    return {
      provider: "gitlab",
      id: typeof body.id === "number" ? String(body.id) : undefined,
      iid: typeof body.iid === "number" ? body.iid : undefined,
      url: body.web_url,
      state: body.state === "closed" ? "closed" : "open"
    };
  }
};

function providerError(provider: IssueProvider, status: number, body: unknown): IssueProviderError {
  const message = extractProviderMessage(body) ?? `${provider} issue creation failed with HTTP ${status}.`;

  if (status === 401) {
    return new IssueProviderError(provider, "auth_failed", message, status);
  }

  if (status === 403) {
    return new IssueProviderError(provider, "permission_denied", message, status);
  }

  if (status === 404) {
    return new IssueProviderError(provider, "target_not_found", message, status);
  }

  if (status === 422) {
    return new IssueProviderError(provider, "validation_failed", message, status);
  }

  if (status === 429) {
    return new IssueProviderError(provider, "rate_limited", message, status);
  }

  return new IssueProviderError(provider, "transient_failure", message, status);
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractProviderMessage(body: unknown): string | undefined {
  if (!isRecord(body)) {
    return typeof body === "string" ? body.slice(0, 300) : undefined;
  }

  if (typeof body.message === "string") {
    return body.message;
  }

  if (typeof body.error === "string") {
    return body.error;
  }

  return undefined;
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
