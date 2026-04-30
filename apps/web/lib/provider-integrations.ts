import { createHmac, timingSafeEqual } from "node:crypto";
import type { IssueProvider } from "@changethis/shared";
import { getProviderCredentialSecret } from "./credential-store";
import { isProviderIntegrationDisabled } from "./provider-integration-state";
import { isProductionRuntime } from "./runtime";

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

export function listProviderIntegrations(workspaceId?: string): ProviderIntegrationSummary[] {
  return getRuntimeProviderIntegrations(workspaceId).map((integration) => ({
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
    connectionConfigKeys: integration.connectionConfigKeys,
    credentialConfigKeys: integration.credentialConfigKeys,
    managePath: integration.managePath
  }));
}

export function getProviderIntegration(provider: IssueProvider, integrationId?: string, workspaceId?: string): RuntimeProviderIntegration | undefined {
  return getRuntimeProviderIntegrations(workspaceId).find(
    (integration) => integration.provider === provider && (!integrationId || integration.id === integrationId)
  );
}

export function getProviderIntegrationToken(provider: IssueProvider, integrationId?: string, workspaceId?: string): string | undefined {
  return getProviderIntegration(provider, integrationId, workspaceId)?.token;
}

export function getProviderConnectUrl(provider: IssueProvider, requestUrl: string, returnTo: string, workspaceId: string): string | undefined {
  const integration = getProviderIntegration(provider, undefined, workspaceId);

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

function getRuntimeProviderIntegrations(workspaceId?: string): RuntimeProviderIntegration[] {
  const githubToken = firstConfiguredValue("CHANGETHIS_GITHUB_TOKEN", "GITHUB_TOKEN");
  const gitlabToken = firstConfiguredValue("CHANGETHIS_GITLAB_TOKEN", "GITLAB_TOKEN");
  const gitlabBaseUrl = process.env.GITLAB_BASE_URL ?? "https://gitlab.com";
  const githubIntegrationId = process.env.GITHUB_PROVIDER_INTEGRATION_ID ?? "local-github";
  const gitlabIntegrationId = process.env.GITLAB_PROVIDER_INTEGRATION_ID ?? "local-gitlab";
  const storedGithubToken = getProviderCredentialSecret("github", githubIntegrationId, "access_token", workspaceId);
  const storedGitlabToken = getProviderCredentialSecret("gitlab", gitlabIntegrationId, "access_token", workspaceId);
  const githubInstallationId = getProviderCredentialSecret("github", githubIntegrationId, "installation_id", workspaceId) ?? process.env.GITHUB_INSTALLATION_ID;
  const githubAppConfigured = Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY && githubInstallationId);
  const githubDisabled = isProviderIntegrationDisabled("github", githubIntegrationId, workspaceId);
  const gitlabDisabled = isProviderIntegrationDisabled("gitlab", gitlabIntegrationId, workspaceId);
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
      managePath: process.env.GITHUB_MANAGE_URL ?? "https://github.com/settings/installations",
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
      managePath: process.env.GITLAB_MANAGE_URL,
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
