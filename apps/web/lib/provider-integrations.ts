import { createHmac, timingSafeEqual } from "node:crypto";
import type { IssueProvider } from "@changethis/shared";
import { getProviderCredentialSecretAsync } from "./credential-store";
import { getInternalApiUrl, getInternalSessionCookieHeader } from "./internal-api";
import { isProviderIntegrationDisabledAsync } from "./provider-integration-state";
import { getDataStoreMode, isProductionRuntime } from "./runtime";

export type ProviderIntegrationStatus = "connected" | "needs_setup" | "needs_reconnect";

export type ProviderIntegrationSummary = {
  id: string;
  provider: IssueProvider;
  name: string;
  accountLabel: string;
  status: ProviderIntegrationStatus;
  connectPath: string;
  connectConfigured: boolean;
  credentialAvailable: boolean;
  credentialConfigured: boolean;
  environmentCredentialConfigured: boolean;
  disabled: boolean;
  baseUrl?: string;
  connectionConfigKeys: string[];
  credentialConfigKeys: string[];
  managePath?: string;
};

export type RuntimeProviderIntegration = ProviderIntegrationSummary & {
  id: string;
  baseUrl: string;
  callbackPath: string;
  oauthScopes: string[];
  token?: string;
};

export type ProviderConnectState = {
  provider: IssueProvider;
  workspaceId: string;
  integrationId: string;
  returnTo: string;
  callbackUrl: string;
  issuedAt: string;
  signature: string;
};

const providers: IssueProvider[] = ["github", "gitlab"];

export function isIssueProvider(value: unknown): value is IssueProvider {
  return typeof value === "string" && providers.includes(value as IssueProvider);
}

export async function listProviderIntegrations(workspaceId?: string): Promise<ProviderIntegrationSummary[]> {
  const integrations = await getRuntimeProviderIntegrations(workspaceId);
  return integrations.map((integration) => ({
    id: integration.id,
    provider: integration.provider,
    name: integration.name,
    accountLabel: integration.accountLabel,
    status: integration.status,
    connectPath: integration.connectPath,
    connectConfigured: integration.connectConfigured,
    credentialAvailable: integration.credentialAvailable,
    credentialConfigured: integration.credentialConfigured,
    environmentCredentialConfigured: integration.environmentCredentialConfigured,
    disabled: integration.disabled,
    baseUrl: integration.baseUrl,
    connectionConfigKeys: integration.connectionConfigKeys,
    credentialConfigKeys: integration.credentialConfigKeys,
    managePath: integration.managePath
  }));
}

export async function listProviderIntegrationsAsync(workspaceId?: string): Promise<ProviderIntegrationSummary[]> {
  return listProviderIntegrations(workspaceId);
}

export async function getProviderIntegration(provider: IssueProvider, integrationId?: string, workspaceId?: string): Promise<RuntimeProviderIntegration | undefined> {
  const integrations = await getRuntimeProviderIntegrations(workspaceId);
  return integrations.find(
    (integration) => integration.provider === provider && (!integrationId || integration.id === integrationId)
  );
}

export async function getProviderIntegrationAsync(provider: IssueProvider, integrationId?: string, workspaceId?: string): Promise<RuntimeProviderIntegration | undefined> {
  return getProviderIntegration(provider, integrationId, workspaceId);
}

export async function getProviderIntegrationToken(provider: IssueProvider, integrationId?: string, workspaceId?: string): Promise<string | undefined> {
  const integration = await getProviderIntegration(provider, integrationId, workspaceId);
  return integration?.token;
}

export async function getProviderIntegrationTokenAsync(provider: IssueProvider, integrationId?: string, workspaceId?: string): Promise<string | undefined> {
  const integration = await getProviderIntegration(provider, integrationId, workspaceId);
  return integration && !integration.disabled
    ? getProviderCredentialSecretAsync(provider, integration.id, "access_token", workspaceId)
    : undefined;
}

export async function getProviderConnectUrl(provider: IssueProvider, requestUrl: string, returnTo: string, workspaceId: string): Promise<string | undefined> {
  const integration = await getProviderIntegration(provider, undefined, workspaceId);

  if (!integration) {
    return undefined;
  }

  const callbackUrl = new URL(integration.callbackPath, requestUrl).toString();
  const unsignedState = {
    provider,
    workspaceId,
    integrationId: integration.id,
    returnTo: normalizeProviderReturnTo(returnTo),
    callbackUrl,
    issuedAt: new Date().toISOString()
  };
  const state = encodeProviderConnectState({
    ...unsignedState,
    signature: signProviderConnectState(unsignedState)
  });

  if (provider === "github") {
    return getGitHubConnectUrl(state);
  }

  return getGitLabConnectUrl(integration, callbackUrl, state);
}

export async function getProviderConnectUrlAsync(provider: IssueProvider, requestUrl: string, returnTo: string, workspaceId: string): Promise<string | undefined> {
  return getProviderConnectUrl(provider, requestUrl, returnTo, workspaceId);
}

export async function ensureProviderIntegrationAsync(provider: IssueProvider, workspaceId?: string): Promise<RuntimeProviderIntegration | undefined> {
  return getProviderIntegration(provider, undefined, workspaceId);
}

export async function recordProviderConnection(input: {
  provider: IssueProvider;
  workspaceId: string;
  integrationId: string;
  installationId?: string;
  externalAccountId?: string;
  baseUrl?: string;
}): Promise<void> {
  if (getDataStoreMode() !== "internal" || !input.workspaceId) {
    return;
  }

  await internalIntegrationRequest(`/integrations/${input.provider}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      integration_id: input.integrationId,
      status: "connected",
      installation_id: input.installationId,
      external_account_id: input.externalAccountId,
      base_url: input.baseUrl
    })
  });
}

async function resolveIntegrationIds(workspaceId: string | undefined): Promise<{ github: string; gitlab: string }> {
  const fallback = {
    github: process.env.GITHUB_PROVIDER_INTEGRATION_ID ?? "local-github",
    gitlab: process.env.GITLAB_PROVIDER_INTEGRATION_ID ?? "local-gitlab"
  };

  if (getDataStoreMode() !== "internal" || !workspaceId) {
    return fallback;
  }

  const [github, gitlab] = await Promise.all([
    ensureInternalProviderIntegration("github", workspaceId),
    ensureInternalProviderIntegration("gitlab", workspaceId)
  ]);

  return { github: github ?? fallback.github, gitlab: gitlab ?? fallback.gitlab };
}

async function ensureInternalProviderIntegration(provider: IssueProvider, workspaceId: string): Promise<string | undefined> {
  const response = await internalIntegrationRequest<{ id: string }>(`/integrations/${provider}/ensure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspace_id: workspaceId, auth_type: "personal_token" })
  });
  return response.id;
}

async function internalIntegrationRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieHeader = await getInternalSessionCookieHeader();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.headers as Record<string, string> | undefined)
  };

  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  const response = await fetch(`${getInternalApiUrl()}${path}`, { ...init, headers, cache: "no-store" });

  if (!response.ok) {
    let message = `Provider integration request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: unknown; error?: unknown };
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // Keep the generic message when the API does not return JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function getRuntimeProviderIntegrations(workspaceId?: string): Promise<RuntimeProviderIntegration[]> {
  const { github: githubIntegrationId, gitlab: gitlabIntegrationId } = await resolveIntegrationIds(workspaceId);
  const githubToken = firstConfiguredValue("CHANGETHIS_GITHUB_TOKEN", "GITHUB_TOKEN");
  const gitlabToken = firstConfiguredValue("CHANGETHIS_GITLAB_TOKEN", "GITLAB_TOKEN");
  const gitlabBaseUrl = process.env.GITLAB_BASE_URL ?? "https://gitlab.com";
  const storedGithubToken = await getProviderCredentialSecretAsync("github", githubIntegrationId, "access_token", workspaceId);
  const storedGitlabToken = await getProviderCredentialSecretAsync("gitlab", gitlabIntegrationId, "access_token", workspaceId);
  const githubInstallationId = (await getProviderCredentialSecretAsync("github", githubIntegrationId, "installation_id", workspaceId)) ?? process.env.GITHUB_INSTALLATION_ID;
  const githubAppConfigured = Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY && githubInstallationId);
  const githubDisabled = await isProviderIntegrationDisabledAsync("github", githubIntegrationId, workspaceId);
  const gitlabDisabled = await isProviderIntegrationDisabledAsync("gitlab", gitlabIntegrationId, workspaceId);
  const githubEnvironmentCredentialConfigured = !workspaceId && Boolean(githubToken || githubAppConfigured);
  const gitlabEnvironmentCredentialConfigured = !workspaceId && Boolean(gitlabToken);
  const githubCredentialAvailable = Boolean(storedGithubToken || (!workspaceId && githubToken) || (!workspaceId && githubAppConfigured));
  const gitlabCredentialAvailable = Boolean(storedGitlabToken || (!workspaceId && gitlabToken));
  const githubCredentialConfigured = githubCredentialAvailable && !githubDisabled;
  const githubConnectConfigured = Boolean(process.env.GITHUB_APP_SLUG);
  const gitlabConnectConfigured = Boolean(process.env.GITLAB_OAUTH_APP_ID && process.env.GITLAB_OAUTH_APP_SECRET);
  const gitlabCredentialConfigured = gitlabCredentialAvailable && !gitlabDisabled;

  return [
    {
      id: githubIntegrationId,
      provider: "github",
      name: "GitHub",
      accountLabel: githubDisabled ? "Connexion désactivée dans ChangeThis" : process.env.GITHUB_ACCOUNT_LABEL ?? (githubCredentialConfigured ? "GitHub connected" : "No account linked"),
      status: githubCredentialConfigured ? "connected" : "needs_setup",
      connectPath: "/api/integrations/github/connect",
      connectConfigured: githubConnectConfigured,
      credentialAvailable: githubCredentialAvailable,
      credentialConfigured: githubCredentialConfigured,
      environmentCredentialConfigured: githubEnvironmentCredentialConfigured,
      disabled: githubDisabled,
      connectionConfigKeys: ["GITHUB_APP_SLUG", "GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY"],
      credentialConfigKeys: ["GITHUB_TOKEN", "GITHUB_INSTALLATION_ID"],
      managePath: process.env.GITHUB_MANAGE_URL ?? "https://github.com/settings/personal-access-tokens/new?name=ChangeThis",
      baseUrl: "https://github.com",
      callbackPath: "/api/integrations/github/callback",
      oauthScopes: [],
      token: githubDisabled ? undefined : storedGithubToken ?? (!workspaceId ? githubToken : undefined)
    },
    {
      id: gitlabIntegrationId,
      provider: "gitlab",
      name: "GitLab",
      accountLabel: gitlabDisabled ? "Connexion désactivée dans ChangeThis" : process.env.GITLAB_ACCOUNT_LABEL ?? (gitlabCredentialConfigured ? "GitLab connected" : "No account linked"),
      status: gitlabCredentialConfigured ? "connected" : "needs_setup",
      connectPath: "/api/integrations/gitlab/connect",
      connectConfigured: gitlabConnectConfigured,
      credentialAvailable: gitlabCredentialAvailable,
      credentialConfigured: gitlabCredentialConfigured,
      environmentCredentialConfigured: gitlabEnvironmentCredentialConfigured,
      disabled: gitlabDisabled,
      connectionConfigKeys: ["GITLAB_OAUTH_APP_ID", "GITLAB_OAUTH_APP_SECRET"],
      credentialConfigKeys: ["GITLAB_TOKEN"],
      managePath: process.env.GITLAB_MANAGE_URL ?? `${gitlabBaseUrl}/-/user_settings/personal_access_tokens`,
      baseUrl: gitlabBaseUrl,
      callbackPath: "/api/integrations/gitlab/callback",
      oauthScopes: ["api", "read_user"],
      token: gitlabDisabled ? undefined : storedGitlabToken ?? (!workspaceId ? gitlabToken : undefined)
    }
  ];
}

function getGitHubConnectUrl(state: string): string | undefined {
  const appSlug = process.env.GITHUB_APP_SLUG;

  if (!appSlug) {
    return undefined;
  }

  const connectUrl = new URL(`/apps/${appSlug}/installations/new`, "https://github.com");
  connectUrl.searchParams.set("state", state);
  return connectUrl.toString();
}

function getGitLabConnectUrl(integration: RuntimeProviderIntegration, callbackUrl: string, state: string): string | undefined {
  const appId = process.env.GITLAB_OAUTH_APP_ID;

  if (!appId) {
    return undefined;
  }

  const oauthUrl = new URL("/oauth/authorize", integration.baseUrl);
  oauthUrl.searchParams.set("client_id", appId);
  oauthUrl.searchParams.set("redirect_uri", callbackUrl);
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("scope", integration.oauthScopes.join(" "));
  oauthUrl.searchParams.set("state", state);
  return oauthUrl.toString();
}

function encodeProviderConnectState(state: ProviderConnectState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

export function normalizeProviderReturnTo(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/projects";
  }

  return value;
}

export function decodeProviderConnectState(value: string | null): ProviderConnectState | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));

    if (!isProviderConnectState(parsed)) {
      return undefined;
    }

    const { signature, ...unsignedState } = parsed;

    if (!verifyProviderConnectState(unsignedState, signature)) {
      return undefined;
    }

    const issuedAt = Date.parse(parsed.issuedAt);

    if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > 15 * 60_000) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
}

function firstConfiguredValue(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];

    if (value) {
      return value;
    }
  }

  return undefined;
}

function isProviderConnectState(value: unknown): value is ProviderConnectState {
  if (!isRecord(value)) {
    return false;
  }

  return isIssueProvider(value.provider)
    && typeof value.workspaceId === "string"
    && typeof value.integrationId === "string"
    && typeof value.returnTo === "string"
    && typeof value.callbackUrl === "string"
    && typeof value.issuedAt === "string"
    && typeof value.signature === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}


function signProviderConnectState(state: Omit<ProviderConnectState, "signature">): string {
  const secret = providerStateSecret();
  return createHmac("sha256", secret).update(JSON.stringify(state), "utf8").digest("base64url");
}

function verifyProviderConnectState(state: Omit<ProviderConnectState, "signature">, signature: string): boolean {
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(signProviderConnectState(state));

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function providerStateSecret(): string {
  if (process.env.CHANGETHIS_SECRET_KEY) {
    return process.env.CHANGETHIS_SECRET_KEY;
  }

  if (isProductionRuntime) {
    throw new Error("CHANGETHIS_SECRET_KEY is required to sign provider state in production");
  }

  return "changethis-local-provider-state";
}
