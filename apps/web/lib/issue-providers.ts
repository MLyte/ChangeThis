import { createSign } from "node:crypto";
import { validateIssueTarget, type ExternalIssueRef, type IssueDraft, type IssueProvider, type IssueTarget } from "@changethis/shared";
import { getProviderCredentialSecretAsync } from "./credential-store";
import { createDemoExternalIssueRef, demoRepositoriesForProvider, isDemoProviderToken } from "./demo-provider-data";
import { getProviderIntegrationTokenAsync } from "./provider-integrations";

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

export type IssueProviderClientOptions = {
  integrationId?: string;
  workspaceId?: string;
  token?: string;
};

export type ProviderRepository = {
  provider: IssueProvider;
  id: string;
  name: string;
  fullName: string;
  namespace: string;
  project: string;
  webUrl: string;
  private: boolean;
  defaultBranch?: string;
  externalProjectId?: string;
};

type TokenResolver = () => Promise<string | undefined>;
const defaultProviderTimeoutMs = 10_000;

export function getIssueProviderClient(provider: IssueProvider, options: IssueProviderClientOptions = {}): IssueProviderClient {
  if (provider === "github") {
    return createGitHubClient(() => getIssueProviderToken(provider, options));
  }

  if (provider === "gitlab") {
    return createGitLabClient(() => getIssueProviderToken(provider, options));
  }

  return createUnsupportedProviderClient(provider);
}

export async function listIssueProviderRepositories(
  provider: IssueProvider,
  options: IssueProviderClientOptions = {}
): Promise<ProviderRepository[]> {
  if (provider === "github") {
    return listGitHubRepositories(options);
  }

  if (provider === "gitlab") {
    return listGitLabRepositories(options);
  }

  throw new IssueProviderError(provider, "auth_failed", `${provider} credentials are not configured.`);
}

function createUnsupportedProviderClient(provider: IssueProvider): IssueProviderClient {
  return {
    provider,
    async createIssue() {
      throw new IssueProviderError(
        provider,
        "auth_failed",
        `${provider} credentials are not configured.`
      );
    }
  };
}

function createGitHubClient(resolveToken: TokenResolver): IssueProviderClient {
  return {
    provider: "github",
    async createIssue(target, draft, options) {
      const validatedTarget = requireValidIssueTarget("github", target);
      const token = await requireProviderToken("github", resolveToken);

      if (isDemoProviderToken("github", token)) {
        return createDemoExternalIssueRef("github", validatedTarget, draft.title);
      }

      const response = await fetchProvider("github", `https://api.github.com/repos/${validatedTarget.namespace}/${validatedTarget.project}/issues`, {
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
    },
    async getIssue(target, ref) {
      const validatedTarget = requireValidIssueTarget("github", target);
      const token = await requireProviderToken("github", resolveToken);

      if (isDemoProviderToken("github", token)) {
        return { ...ref, provider: "github", state: ref.state ?? "open" };
      }

      const issueNumber = ref.number ?? parseGitHubIssueNumber(ref.url);

      if (!issueNumber) {
        throw new IssueProviderError("github", "validation_failed", "GitHub issue number is missing.");
      }

      const response = await fetchProvider("github", `https://api.github.com/repos/${validatedTarget.namespace}/${validatedTarget.project}/issues/${issueNumber}`, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "ChangeThis",
          "X-GitHub-Api-Version": "2022-11-28"
        }
      });
      const body = await parseResponseBody(response);

      if (!response.ok) {
        throw providerError("github", response.status, body, "issue lookup");
      }

      if (!isRecord(body) || typeof body.html_url !== "string") {
        throw new IssueProviderError("github", "validation_failed", "GitHub returned an unexpected issue payload.");
      }

      return {
        ...ref,
        provider: "github",
        id: typeof body.id === "number" ? String(body.id) : ref.id,
        number: typeof body.number === "number" ? body.number : issueNumber,
        url: body.html_url,
        state: body.state === "closed" ? "closed" : "open"
      };
    }
  };
}

function createGitLabClient(resolveToken: TokenResolver): IssueProviderClient {
  return {
    provider: "gitlab",
    async createIssue(target, draft, options) {
      const validatedTarget = requireValidIssueTarget("gitlab", target);
      const token = await requireProviderToken("gitlab", resolveToken);

      if (isDemoProviderToken("gitlab", token)) {
        return createDemoExternalIssueRef("gitlab", validatedTarget, draft.title);
      }

      const projectId = validatedTarget.externalProjectId ?? encodeURIComponent(`${validatedTarget.namespace}/${validatedTarget.project}`);
      const baseUrl = process.env.GITLAB_BASE_URL || "https://gitlab.com";
      const response = await fetchProvider("gitlab", `${baseUrl}/api/v4/projects/${projectId}/issues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(options?.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
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
    },
    async getIssue(target, ref) {
      const validatedTarget = requireValidIssueTarget("gitlab", target);
      const token = await requireProviderToken("gitlab", resolveToken);

      if (isDemoProviderToken("gitlab", token)) {
        return { ...ref, provider: "gitlab", state: ref.state ?? "open" };
      }

      const projectId = validatedTarget.externalProjectId ?? encodeURIComponent(`${validatedTarget.namespace}/${validatedTarget.project}`);
      const issueIid = ref.iid ?? parseGitLabIssueIid(ref.url);

      if (!issueIid) {
        throw new IssueProviderError("gitlab", "validation_failed", "GitLab issue IID is missing.");
      }

      const baseUrl = process.env.GITLAB_BASE_URL || "https://gitlab.com";
      const response = await fetchProvider("gitlab", `${baseUrl}/api/v4/projects/${projectId}/issues/${issueIid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "PRIVATE-TOKEN": token
        }
      });
      const body = await parseResponseBody(response);

      if (!response.ok) {
        throw providerError("gitlab", response.status, body, "issue lookup");
      }

      if (!isRecord(body) || typeof body.web_url !== "string") {
        throw new IssueProviderError("gitlab", "validation_failed", "GitLab returned an unexpected issue payload.");
      }

      return {
        ...ref,
        provider: "gitlab",
        id: typeof body.id === "number" ? String(body.id) : ref.id,
        iid: typeof body.iid === "number" ? body.iid : issueIid,
        url: body.web_url,
        state: body.state === "closed" ? "closed" : "open"
      };
    }
  };
}

function parseGitHubIssueNumber(url: string): number | undefined {
  const value = /\/issues\/(\d+)(?:$|[?#])/.exec(url)?.[1];
  return value ? Number(value) : undefined;
}

function parseGitLabIssueIid(url: string): number | undefined {
  const value = /\/-\/issues\/(\d+)(?:$|[?#])/.exec(url)?.[1] ?? /\/issues\/(\d+)(?:$|[?#])/.exec(url)?.[1];
  return value ? Number(value) : undefined;
}

function providerError(provider: IssueProvider, status: number, body: unknown, action = "issue creation"): IssueProviderError {
  const message = extractProviderMessage(body) ?? `${provider} ${action} failed with HTTP ${status}.`;

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

async function getIssueProviderToken(provider: IssueProvider, options: IssueProviderClientOptions): Promise<string | undefined> {
  if (options.token) {
    return options.token;
  }

  const integrationToken = await getProviderIntegrationTokenAsync(provider, options.integrationId, options.workspaceId);

  if (integrationToken) {
    return integrationToken;
  }

  if (provider === "github") {
    return process.env.GITHUB_TOKEN ?? await createGitHubInstallationToken(options.integrationId, options.workspaceId);
  }

  return process.env.GITLAB_TOKEN;
}

async function listGitHubRepositories(options: IssueProviderClientOptions): Promise<ProviderRepository[]> {
  const access = await getGitHubRepositoryAccess(options);

  if (!access) {
    throw new IssueProviderError("github", "auth_failed", "github credentials are not configured.");
  }

  if (isDemoProviderToken("github", access.token)) {
    return demoRepositoriesForProvider("github");
  }

  const endpoint = access.kind === "installation"
    ? "https://api.github.com/installation/repositories?per_page=100"
    : "https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&sort=full_name&per_page=100";
  const pages = await fetchProviderJsonPages("github", endpoint, {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${access.token}`,
    "User-Agent": "ChangeThis",
    "X-GitHub-Api-Version": "2022-11-28"
  });
  const repositories = access.kind === "installation"
    ? pages.flatMap((body) => isRecord(body) && Array.isArray(body.repositories) ? body.repositories : [])
    : pages.flatMap((body) => Array.isArray(body) ? body : []);

  if (pages.some((body) => access.kind === "installation" ? !isRecord(body) || !Array.isArray(body.repositories) : !Array.isArray(body))) {
    throw new IssueProviderError("github", "validation_failed", "GitHub returned an unexpected repositories payload.");
  }

  return repositories.flatMap(normalizeGitHubRepository);
}

async function getGitHubRepositoryAccess(options: IssueProviderClientOptions): Promise<{ token: string; kind: "token" | "installation" } | undefined> {
  const token = options.token
    ?? await getProviderIntegrationTokenAsync("github", options.integrationId, options.workspaceId)
    ?? process.env.GITHUB_TOKEN;

  if (token) {
    return { token, kind: "token" };
  }

  const installationToken = await createGitHubInstallationToken(options.integrationId, options.workspaceId);

  return installationToken ? { token: installationToken, kind: "installation" } : undefined;
}

async function listGitLabRepositories(options: IssueProviderClientOptions): Promise<ProviderRepository[]> {
  const token = await requireProviderToken("gitlab", () => getIssueProviderToken("gitlab", options));

  if (isDemoProviderToken("gitlab", token)) {
    return demoRepositoriesForProvider("gitlab");
  }

  const baseUrl = process.env.GITLAB_BASE_URL || "https://gitlab.com";
  const projectsUrl = new URL("/api/v4/projects", baseUrl);
  projectsUrl.searchParams.set("membership", "true");
  projectsUrl.searchParams.set("simple", "true");
  projectsUrl.searchParams.set("per_page", "100");

  const pages = await fetchProviderJsonPages("gitlab", projectsUrl.toString(), {
    Authorization: `Bearer ${token}`,
    "PRIVATE-TOKEN": token
  });

  if (pages.some((page) => !Array.isArray(page))) {
    throw new IssueProviderError("gitlab", "validation_failed", "GitLab returned an unexpected projects payload.");
  }

  return pages.flatMap((page) => page as unknown[]).flatMap(normalizeGitLabProject);
}

async function fetchProviderJsonPages(provider: IssueProvider, firstUrl: string, headers: Record<string, string>): Promise<unknown[]> {
  const pages: unknown[] = [];
  let nextUrl: string | undefined = firstUrl;

  while (nextUrl) {
    const response = await fetchProvider(provider, nextUrl, { headers });
    const body = await parseResponseBody(response);

    if (!response.ok) {
      throw providerError(provider, response.status, body, "repositories listing");
    }

    pages.push(body);
    nextUrl = parseNextLink(response.headers.get("link"));
  }

  return pages;
}

function parseNextLink(linkHeader: string | null): string | undefined {
  if (!linkHeader) {
    return undefined;
  }

  for (const part of linkHeader.split(",")) {
    const [urlPart, ...params] = part.trim().split(";");
    const isNext = params.some((param) => param.trim() === 'rel="next"');

    if (isNext && urlPart.startsWith("<") && urlPart.endsWith(">")) {
      return urlPart.slice(1, -1);
    }
  }

  return undefined;
}

function normalizeGitHubRepository(value: unknown): ProviderRepository[] {
  if (!isRecord(value) || typeof value.full_name !== "string" || typeof value.html_url !== "string") {
    return [];
  }

  const [namespace, project] = value.full_name.split("/");

  if (!namespace || !project) {
    return [];
  }

  return [{
    provider: "github",
    id: typeof value.id === "number" ? String(value.id) : value.full_name,
    name: typeof value.name === "string" ? value.name : project,
    fullName: value.full_name,
    namespace,
    project,
    webUrl: value.html_url,
    private: value.private === true,
    defaultBranch: typeof value.default_branch === "string" ? value.default_branch : undefined
  }];
}

function normalizeGitLabProject(value: unknown): ProviderRepository[] {
  if (!isRecord(value) || typeof value.path_with_namespace !== "string" || typeof value.web_url !== "string") {
    return [];
  }

  const separatorIndex = value.path_with_namespace.lastIndexOf("/");

  if (separatorIndex <= 0 || separatorIndex === value.path_with_namespace.length - 1) {
    return [];
  }

  const namespace = value.path_with_namespace.slice(0, separatorIndex);
  const project = value.path_with_namespace.slice(separatorIndex + 1);

  return [{
    provider: "gitlab",
    id: typeof value.id === "number" ? String(value.id) : value.path_with_namespace,
    name: typeof value.name === "string" ? value.name : project,
    fullName: value.path_with_namespace,
    namespace,
    project,
    webUrl: value.web_url,
    private: value.visibility !== "public",
    defaultBranch: typeof value.default_branch === "string" ? value.default_branch : undefined,
    externalProjectId: typeof value.id === "number" ? String(value.id) : undefined
  }];
}

async function requireProviderToken(provider: IssueProvider, resolveToken: TokenResolver): Promise<string> {
  const token = await resolveToken();

  if (!token) {
    throw new IssueProviderError(provider, "auth_failed", `${provider} credentials are not configured.`);
  }

  return token;
}

async function createGitHubInstallationToken(integrationId?: string, workspaceId?: string): Promise<string | undefined> {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const installationId = await getProviderCredentialSecretAsync("github", integrationId ?? process.env.GITHUB_PROVIDER_INTEGRATION_ID ?? "local-github", "installation_id", workspaceId)
    ?? process.env.GITHUB_INSTALLATION_ID;

  if (!appId || !privateKey || !installationId) {
    return undefined;
  }

  const now = Math.floor(Date.now() / 1000);
  const jwt = signGitHubAppJwt({
    appId,
    privateKey,
    issuedAt: now - 60,
    expiresAt: now + 540
  });
  const response = await fetchProvider("github", `https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${jwt}`,
      "User-Agent": "ChangeThis",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  const body = await parseResponseBody(response);

  if (!response.ok || !isRecord(body) || typeof body.token !== "string") {
    return undefined;
  }

  return body.token;
}

async function fetchProvider(provider: IssueProvider, input: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), providerTimeoutMs());

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new IssueProviderError(provider, "transient_failure", `${provider} request timed out.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function providerTimeoutMs(): number {
  const configured = Number(process.env.ISSUE_PROVIDER_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : defaultProviderTimeoutMs;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
    || error instanceof Error && error.name === "AbortError";
}

function signGitHubAppJwt(input: { appId: string; privateKey: string; issuedAt: number; expiresAt: number }): string {
  const header = base64UrlJson({ alg: "RS256", typ: "JWT" });
  const payload = base64UrlJson({
    iat: input.issuedAt,
    exp: input.expiresAt,
    iss: input.appId
  });
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  sign.end();
  const signature = sign.sign(input.privateKey).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function requireValidIssueTarget(provider: IssueProvider, target: IssueTarget): IssueTarget {
  const validation = validateIssueTarget(target);

  if (!validation.ok || validation.value.provider !== provider) {
    throw new IssueProviderError(provider, "validation_failed", validation.ok ? `Issue target provider must be ${provider}.` : validation.error);
  }

  return validation.value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
