import type { IssueProvider } from "@changethis/shared";
import { getProviderCredentialSecret } from "./credential-store";

export type ProviderIntegrationStatus = "connected" | "needs_setup" | "needs_reconnect";

export type ProviderIntegrationSummary = {
  id: string;
  provider: IssueProvider;
  name: string;
  accountLabel: string;
  status: ProviderIntegrationStatus;
  connectPath: string;
  connectConfigured: boolean;
  credentialConfigured: boolean;
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
  integrationId: string;
  returnTo: string;
  callbackUrl: string;
  issuedAt: string;
};

const providers: IssueProvider[] = ["github", "gitlab"];

export function isIssueProvider(value: unknown): value is IssueProvider {
  return typeof value === "string" && providers.includes(value as IssueProvider);
}

export function listProviderIntegrations(): ProviderIntegrationSummary[] {
  return getRuntimeProviderIntegrations().map((integration) => ({
    id: integration.id,
    provider: integration.provider,
    name: integration.name,
    accountLabel: integration.accountLabel,
    status: integration.status,
    connectPath: integration.connectPath,
    connectConfigured: integration.connectConfigured,
    credentialConfigured: integration.credentialConfigured,
    connectionConfigKeys: integration.connectionConfigKeys,
    credentialConfigKeys: integration.credentialConfigKeys,
    managePath: integration.managePath
  }));
}

export function getProviderIntegration(provider: IssueProvider, integrationId?: string): RuntimeProviderIntegration | undefined {
  return getRuntimeProviderIntegrations().find(
    (integration) => integration.provider === provider && (!integrationId || integration.id === integrationId)
  );
}

export function getProviderIntegrationToken(provider: IssueProvider, integrationId?: string): string | undefined {
  return getProviderIntegration(provider, integrationId)?.token;
}

export function getProviderConnectUrl(provider: IssueProvider, requestUrl: string, returnTo: string): string | undefined {
  const integration = getProviderIntegration(provider);

  if (!integration) {
    return undefined;
  }

  const callbackUrl = new URL(integration.callbackPath, requestUrl).toString();
  const state = encodeProviderConnectState({
    provider,
    integrationId: integration.id,
    returnTo: normalizeProviderReturnTo(returnTo),
    callbackUrl,
    issuedAt: new Date().toISOString()
  });

  if (provider === "github") {
    return getGitHubConnectUrl(state);
  }

  return getGitLabConnectUrl(integration, callbackUrl, state);
}

function getRuntimeProviderIntegrations(): RuntimeProviderIntegration[] {
  const githubToken = firstConfiguredValue("CHANGETHIS_GITHUB_TOKEN", "GITHUB_TOKEN");
  const gitlabToken = firstConfiguredValue("CHANGETHIS_GITLAB_TOKEN", "GITLAB_TOKEN");
  const gitlabBaseUrl = process.env.GITLAB_BASE_URL ?? "https://gitlab.com";
  const githubIntegrationId = process.env.GITHUB_PROVIDER_INTEGRATION_ID ?? "local-github";
  const gitlabIntegrationId = process.env.GITLAB_PROVIDER_INTEGRATION_ID ?? "local-gitlab";
  const storedGithubToken = getProviderCredentialSecret("github", githubIntegrationId, "access_token");
  const storedGitlabToken = getProviderCredentialSecret("gitlab", gitlabIntegrationId, "access_token");
  const githubInstallationId = getProviderCredentialSecret("github", githubIntegrationId, "installation_id") ?? process.env.GITHUB_INSTALLATION_ID;
  const githubAppConfigured = Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY && githubInstallationId);
  const githubCredentialConfigured = Boolean(storedGithubToken || githubToken || githubAppConfigured);
  const githubConnectConfigured = Boolean(process.env.GITHUB_APP_SLUG);
  const gitlabConnectConfigured = Boolean(process.env.GITLAB_OAUTH_APP_ID && process.env.GITLAB_OAUTH_APP_SECRET);
  const gitlabCredentialConfigured = Boolean(storedGitlabToken || gitlabToken);

  return [
    {
      id: githubIntegrationId,
      provider: "github",
      name: "GitHub",
      accountLabel: process.env.GITHUB_ACCOUNT_LABEL ?? (githubCredentialConfigured ? "GitHub connected" : "No account linked"),
      status: githubCredentialConfigured ? "connected" : "needs_setup",
      connectPath: "/api/integrations/github/connect",
      connectConfigured: githubConnectConfigured,
      credentialConfigured: githubCredentialConfigured,
      connectionConfigKeys: ["GITHUB_APP_SLUG", "GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY"],
      credentialConfigKeys: ["GITHUB_TOKEN", "GITHUB_INSTALLATION_ID"],
      managePath: process.env.GITHUB_MANAGE_URL ?? "https://github.com/settings/installations",
      baseUrl: "https://github.com",
      callbackPath: "/api/integrations/github/callback",
      oauthScopes: [],
      token: storedGithubToken ?? githubToken
    },
    {
      id: gitlabIntegrationId,
      provider: "gitlab",
      name: "GitLab",
      accountLabel: process.env.GITLAB_ACCOUNT_LABEL ?? (gitlabCredentialConfigured ? "GitLab connected" : "No account linked"),
      status: gitlabCredentialConfigured ? "connected" : "needs_setup",
      connectPath: "/api/integrations/gitlab/connect",
      connectConfigured: gitlabConnectConfigured,
      credentialConfigured: gitlabCredentialConfigured,
      connectionConfigKeys: ["GITLAB_OAUTH_APP_ID", "GITLAB_OAUTH_APP_SECRET"],
      credentialConfigKeys: ["GITLAB_TOKEN"],
      managePath: process.env.GITLAB_MANAGE_URL,
      baseUrl: gitlabBaseUrl,
      callbackPath: "/api/integrations/gitlab/callback",
      oauthScopes: ["api", "read_user"],
      token: storedGitlabToken ?? gitlabToken
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
    && typeof value.integrationId === "string"
    && typeof value.returnTo === "string"
    && typeof value.callbackUrl === "string"
    && typeof value.issuedAt === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
