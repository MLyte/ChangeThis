import { createHmac, timingSafeEqual } from "node:crypto";
import type { IssueProvider } from "@changethis/shared";
import { getProviderCredentialSecret, getProviderCredentialSecretAsync } from "./credential-store";
import { isProviderIntegrationDisabled } from "./provider-integration-state";
import { getDataStoreMode, isProductionRuntime } from "./runtime";
import { isSupabaseServiceConfigured, supabaseServiceRest } from "./supabase-server";

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

type SupabaseProviderIntegrationRow = {
  id: string;
  organization_id: string;
  provider: IssueProvider;
  auth_type: string;
  external_account_id?: string | null;
  installation_id?: string | null;
  base_url?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
};

type SupabaseProviderCredentialRow = {
  integration_id: string;
  credential_kind: string;
  status: string;
  expires_at?: string | null;
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

export async function listProviderIntegrationsAsync(workspaceId?: string): Promise<ProviderIntegrationSummary[]> {
  if (getDataStoreMode() !== "supabase" || !workspaceId || !isUuid(workspaceId) || !isSupabaseServiceConfigured()) {
    return listProviderIntegrations(workspaceId);
  }

  return (await getSupabaseRuntimeProviderIntegrations(workspaceId)).map(toProviderIntegrationSummary);
}

export function getProviderIntegration(provider: IssueProvider, integrationId?: string, workspaceId?: string): RuntimeProviderIntegration | undefined {
  return getRuntimeProviderIntegrations(workspaceId).find(
    (integration) => integration.provider === provider && (!integrationId || integration.id === integrationId)
  );
}

export async function getProviderIntegrationAsync(provider: IssueProvider, integrationId?: string, workspaceId?: string): Promise<RuntimeProviderIntegration | undefined> {
  if (getDataStoreMode() !== "supabase" || !workspaceId || !isUuid(workspaceId) || !isSupabaseServiceConfigured()) {
    return getProviderIntegration(provider, integrationId, workspaceId);
  }

  return (await getSupabaseRuntimeProviderIntegrations(workspaceId)).find(
    (integration) => integration.provider === provider && (!integrationId || integration.id === integrationId)
  );
}

export function getProviderIntegrationToken(provider: IssueProvider, integrationId?: string, workspaceId?: string): string | undefined {
  return getProviderIntegration(provider, integrationId, workspaceId)?.token;
}

export async function getProviderIntegrationTokenAsync(provider: IssueProvider, integrationId?: string, workspaceId?: string): Promise<string | undefined> {
  if (getDataStoreMode() !== "supabase" || !workspaceId || !isUuid(workspaceId) || !isSupabaseServiceConfigured()) {
    return getProviderIntegrationToken(provider, integrationId, workspaceId);
  }

  const integration = await getProviderIntegrationAsync(provider, integrationId, workspaceId);
  if (!integration || integration.disabled) {
    return undefined;
  }

  return getProviderCredentialSecretAsync(provider, integration.id, "access_token", workspaceId);
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

export async function getProviderConnectUrlAsync(provider: IssueProvider, requestUrl: string, returnTo: string, workspaceId: string): Promise<string | undefined> {
  if (getDataStoreMode() !== "supabase" || !isUuid(workspaceId) || !isSupabaseServiceConfigured()) {
    return getProviderConnectUrl(provider, requestUrl, returnTo, workspaceId);
  }

  const integration = await ensureSupabaseProviderIntegration(provider, workspaceId);
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

export async function recordProviderConnection(input: {
  provider: IssueProvider;
  workspaceId: string;
  integrationId: string;
  installationId?: string;
  externalAccountId?: string;
  baseUrl?: string;
}): Promise<void> {
  if (getDataStoreMode() !== "supabase" || !isUuid(input.workspaceId) || !isUuid(input.integrationId) || !isSupabaseServiceConfigured()) {
    return;
  }

  await supabaseServiceRest(`/rest/v1/provider_integrations?id=eq.${encodeURIComponent(input.integrationId)}&organization_id=eq.${encodeURIComponent(input.workspaceId)}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      provider: input.provider,
      auth_type: input.provider === "github" ? "github_app" : "oauth",
      external_account_id: input.externalAccountId,
      installation_id: input.installationId,
      base_url: input.baseUrl ?? (input.provider === "gitlab" ? process.env.GITLAB_BASE_URL ?? "https://gitlab.com" : "https://github.com"),
      status: "connected"
    })
  });
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
      managePath: process.env.GITHUB_MANAGE_URL ?? "https://github.com/settings/tokens",
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

async function getSupabaseRuntimeProviderIntegrations(workspaceId: string): Promise<RuntimeProviderIntegration[]> {
  const rows = await listSupabaseProviderIntegrationRows(workspaceId);
  const credentials = rows.length > 0 ? await listSupabaseProviderCredentialRows(rows.map((row) => row.id)) : [];
  const credentialsByIntegrationId = groupCredentialsByIntegrationId(credentials);
  const integrations = rows.map((row) => mapSupabaseProviderIntegration(row, credentialsByIntegrationId.get(row.id) ?? []));
  const existingProviders = new Set(integrations.map((integration) => integration.provider));

  for (const provider of providers) {
    if (!existingProviders.has(provider)) {
      integrations.push(createSupabaseSetupIntegration(provider, workspaceId));
    }
  }

  return integrations;
}

async function ensureSupabaseProviderIntegration(provider: IssueProvider, workspaceId: string): Promise<RuntimeProviderIntegration | undefined> {
  const current = (await getSupabaseRuntimeProviderIntegrations(workspaceId)).find((integration) => integration.provider === provider && isUuid(integration.id));
  if (current) {
    return current;
  }

  const inserted = await supabaseServiceRest<SupabaseProviderIntegrationRow[]>("/rest/v1/provider_integrations", {
    method: "POST",
    headers: {
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      organization_id: workspaceId,
      provider,
      auth_type: provider === "github" ? "github_app" : "oauth",
      base_url: provider === "gitlab" ? process.env.GITLAB_BASE_URL ?? "https://gitlab.com" : "https://github.com",
      status: "needs_setup"
    })
  });
  const row = inserted[0];

  return row ? mapSupabaseProviderIntegration(row, []) : undefined;
}

async function listSupabaseProviderIntegrationRows(workspaceId: string): Promise<SupabaseProviderIntegrationRow[]> {
  const params = new URLSearchParams({
    organization_id: `eq.${workspaceId}`,
    select: "id,organization_id,provider,auth_type,external_account_id,installation_id,base_url,status,created_at,updated_at",
    order: "created_at.asc"
  });
  const rows = await supabaseServiceRest<SupabaseProviderIntegrationRow[]>(`/rest/v1/provider_integrations?${params.toString()}`);
  return rows.filter((row) => isIssueProvider(row.provider));
}

async function listSupabaseProviderCredentialRows(integrationIds: string[]): Promise<SupabaseProviderCredentialRow[]> {
  const validIds = integrationIds.filter(isUuid);
  if (validIds.length === 0) {
    return [];
  }

  const params = new URLSearchParams({
    integration_id: `in.(${validIds.join(",")})`,
    status: "eq.active",
    select: "integration_id,credential_kind,status,expires_at"
  });
  return supabaseServiceRest<SupabaseProviderCredentialRow[]>(`/rest/v1/provider_integration_credentials?${params.toString()}`);
}

function mapSupabaseProviderIntegration(row: SupabaseProviderIntegrationRow, credentials: SupabaseProviderCredentialRow[]): RuntimeProviderIntegration {
  const provider = row.provider;
  const disabled = row.status === "disabled";
  const hasAccessToken = credentials.some((credential) => credential.credential_kind === "oauth_token" && credential.status === "active");
  const hasGitHubInstallation = Boolean(row.installation_id) || credentials.some((credential) => credential.credential_kind === "github_app_installation" && credential.status === "active");
  const credentialAvailable = provider === "github" ? hasAccessToken || hasGitHubInstallation : hasAccessToken;
  const credentialConfigured = credentialAvailable && !disabled && row.status === "connected";
  const baseUrl = provider === "gitlab" ? row.base_url ?? process.env.GITLAB_BASE_URL ?? "https://gitlab.com" : "https://github.com";

  return {
    id: row.id,
    provider,
    name: provider === "github" ? "GitHub" : "GitLab",
    accountLabel: disabled ? "Connexion désactivée dans ChangeThis" : credentialConfigured ? `${provider === "github" ? "GitHub" : "GitLab"} connected` : "No account linked",
    status: disabled ? "needs_reconnect" : credentialConfigured ? "connected" : "needs_setup",
    connectPath: `/api/integrations/${provider}/connect`,
    connectConfigured: provider === "github" ? Boolean(process.env.GITHUB_APP_SLUG) : Boolean(process.env.GITLAB_OAUTH_APP_ID && process.env.GITLAB_OAUTH_APP_SECRET),
    credentialAvailable,
    credentialConfigured,
    environmentCredentialConfigured: false,
    disabled,
    connectionConfigKeys: provider === "github" ? ["GITHUB_APP_SLUG", "GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY"] : ["GITLAB_OAUTH_APP_ID", "GITLAB_OAUTH_APP_SECRET"],
    credentialConfigKeys: provider === "github" ? ["GITHUB_TOKEN", "GITHUB_INSTALLATION_ID"] : ["GITLAB_TOKEN"],
    managePath: provider === "github"
      ? process.env.GITHUB_MANAGE_URL ?? "https://github.com/settings/tokens"
      : process.env.GITLAB_MANAGE_URL ?? `${baseUrl}/-/user_settings/personal_access_tokens`,
    baseUrl,
    callbackPath: `/api/integrations/${provider}/callback`,
    oauthScopes: provider === "gitlab" ? ["api", "read_user"] : [],
    token: undefined
  };
}

function createSupabaseSetupIntegration(provider: IssueProvider, workspaceId: string): RuntimeProviderIntegration {
  return {
    ...mapSupabaseProviderIntegration({
      id: `setup-${workspaceId}-${provider}`,
      organization_id: workspaceId,
      provider,
      auth_type: provider === "github" ? "github_app" : "oauth",
      base_url: provider === "gitlab" ? process.env.GITLAB_BASE_URL ?? "https://gitlab.com" : "https://github.com",
      status: "needs_setup"
    }, [])
  };
}

function groupCredentialsByIntegrationId(rows: SupabaseProviderCredentialRow[]): Map<string, SupabaseProviderCredentialRow[]> {
  const groups = new Map<string, SupabaseProviderCredentialRow[]>();

  for (const row of rows) {
    groups.set(row.integration_id, [...groups.get(row.integration_id) ?? [], row]);
  }

  return groups;
}

function toProviderIntegrationSummary(integration: RuntimeProviderIntegration): ProviderIntegrationSummary {
  return {
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
  };
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
