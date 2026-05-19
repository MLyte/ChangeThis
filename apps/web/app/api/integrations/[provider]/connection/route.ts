import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../../lib/auth";
import { requirePrivateMutationOrigin } from "../../../../../lib/api-security";
import { deleteProviderCredentialSecretsAsync, saveProviderCredentialSecretAsync } from "../../../../../lib/credential-store";
import { IssueProviderError, listIssueProviderRepositories } from "../../../../../lib/issue-providers";
import { disableProviderIntegrationAsync, enableProviderIntegrationAsync } from "../../../../../lib/provider-integration-state";
import { ensureProviderIntegrationAsync, getProviderIntegrationAsync, isIssueProvider, recordProviderConnection } from "../../../../../lib/provider-integrations";

type TokenConnectionInput = {
  token: string;
  baseUrl?: string;
};

export async function DELETE(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const session = requireWorkspaceRole(await requireWorkspaceSession(request), "admin");

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  const csrfFailure = requirePrivateMutationOrigin(request);

  if (csrfFailure) {
    return csrfFailure;
  }

  const integration = await resolveIntegration(request, context, session.workspace?.id);

  if (!integration) {
    return NextResponse.json({ error: "Unknown provider integration" }, { status: 404 });
  }

  const workspaceId = session.workspace?.id;
  const removedCredentials = await deleteProviderCredentialSecretsAsync(integration.provider, integration.id, workspaceId);
  await disableProviderIntegrationAsync(integration.provider, integration.id, workspaceId);

  return NextResponse.json({
    provider: integration.provider,
    integrationId: integration.id,
    removedCredentials,
    status: "disconnected"
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const session = requireWorkspaceRole(await requireWorkspaceSession(request), "admin");

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  const csrfFailure = requirePrivateMutationOrigin(request);

  if (csrfFailure) {
    return csrfFailure;
  }

  const tokenInput = await parseTokenInput(request);

  if (tokenInput instanceof NextResponse) {
    return tokenInput;
  }

  const workspaceId = session.workspace?.id;
  const integration = tokenInput
    ? await resolveOrCreateIntegration(context, workspaceId)
    : await resolveIntegration(request, context, workspaceId);

  if (!integration) {
    return NextResponse.json({ error: "Unknown provider integration" }, { status: 404 });
  }

  if (tokenInput) {
    await saveProviderCredentialSecretAsync({
      workspaceId,
      provider: integration.provider,
      integrationId: integration.id,
      kind: "access_token",
      value: tokenInput.token,
      scopes: integration.provider === "gitlab" ? ["api"] : ["repo"]
    });
    await recordProviderConnection({
      provider: integration.provider,
      workspaceId: workspaceId ?? "",
      integrationId: integration.id,
      baseUrl: integration.provider === "gitlab" ? normalizeGitLabBaseUrl(tokenInput.baseUrl) ?? integration.baseUrl : integration.baseUrl
    });
  }

  await enableProviderIntegrationAsync(integration.provider, integration.id, workspaceId);
  let repositoryListingVerified = true;
  let repositoryListingWarning: string | undefined;

  if (tokenInput) {
    try {
      await listIssueProviderRepositories(integration.provider, {
        integrationId: integration.id,
        workspaceId
      });
    } catch (error) {
      if (error instanceof IssueProviderError && shouldAllowGitLabUrlFallback(error)) {
        repositoryListingVerified = false;
        repositoryListingWarning = providerConnectionValidationMessage(error);
      } else if (error instanceof IssueProviderError) {
        await disableProviderIntegrationAsync(integration.provider, integration.id, workspaceId);
        return NextResponse.json(
          {
            error: providerConnectionValidationMessage(error),
            code: error.code,
            provider: error.provider
          },
          { status: error.status ?? statusFromProviderErrorCode(error.code) }
        );
      }

      throw error;
    }
  }

  const persistedIntegration = await getProviderIntegrationAsync(integration.provider, integration.id, workspaceId);

  if (!persistedIntegration || persistedIntegration.status !== "connected" || !persistedIntegration.credentialConfigured) {
    return NextResponse.json({
      error: "Provider token was saved, but the connection state could not be confirmed. Please retry."
    }, { status: 502 });
  }

  return NextResponse.json({
    provider: persistedIntegration.provider,
    integrationId: persistedIntegration.id,
    credentialAvailable: persistedIntegration.credentialAvailable,
    credentialConfigured: persistedIntegration.credentialConfigured,
    disabled: persistedIntegration.disabled,
    repositoryListingVerified,
    warning: repositoryListingWarning,
    status: tokenInput ? "connected" : "enabled"
  });
}

function shouldAllowGitLabUrlFallback(error: IssueProviderError): boolean {
  return error.provider === "gitlab"
    && error.code === "auth_failed"
    && error.status === 401;
}

function providerConnectionValidationMessage(error: IssueProviderError): string {
  if (error.provider === "gitlab" && error.status === 401) {
    return "Token GitLab enregistré, mais la liste des projets est indisponible. Si vous utilisez un Project Access Token ou un token limité, collez l'URL du dépôt cible dans Sites connectés.";
  }

  if (error.provider === "gitlab" && error.status === 403) {
    return "GitLab accepte le token, mais ses permissions ne permettent pas de lister les projets. Vérifiez le scope api et les droits du compte.";
  }

  return error.message;
}

function statusFromProviderErrorCode(code: IssueProviderError["code"]): number {
  if (code === "auth_failed") {
    return 401;
  }

  if (code === "permission_denied") {
    return 403;
  }

  if (code === "target_not_found") {
    return 404;
  }

  if (code === "validation_failed") {
    return 502;
  }

  if (code === "rate_limited") {
    return 429;
  }

  return 502;
}

async function parseTokenInput(request: Request): Promise<TokenConnectionInput | undefined | NextResponse> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json")) {
    return undefined;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!isRecord(body) || !("token" in body)) {
    return undefined;
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";

  if (token.length < 8) {
    return NextResponse.json({ error: "Provider token is required" }, { status: 422 });
  }

  if (token.length > 8192) {
    return NextResponse.json({ error: "Provider token is too long" }, { status: 413 });
  }

  const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : undefined;

  if (baseUrl !== undefined && baseUrl !== "" && !normalizeGitLabBaseUrl(baseUrl)) {
    return NextResponse.json({ error: "GitLab instance URL must be a valid HTTPS URL" }, { status: 422 });
  }

  return { token, baseUrl };
}

function normalizeGitLabBaseUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      return undefined;
    }

    return url.origin;
  } catch {
    return undefined;
  }
}

async function resolveIntegration(
  request: Request,
  context: { params: Promise<{ provider: string }> },
  workspaceId?: string
) {
  const { provider } = await context.params;

  if (!isIssueProvider(provider)) {
    return undefined;
  }

  const url = new URL(request.url);
  return getProviderIntegrationAsync(provider, url.searchParams.get("integrationId") ?? undefined, workspaceId);
}

async function resolveOrCreateIntegration(
  context: { params: Promise<{ provider: string }> },
  workspaceId?: string
) {
  const { provider } = await context.params;

  if (!isIssueProvider(provider)) {
    return undefined;
  }

  return ensureProviderIntegrationAsync(provider, workspaceId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
