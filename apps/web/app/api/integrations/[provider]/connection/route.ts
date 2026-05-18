import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../../lib/auth";
import { requirePrivateMutationOrigin } from "../../../../../lib/api-security";
import { deleteProviderCredentialSecretsAsync, saveProviderCredentialSecretAsync } from "../../../../../lib/credential-store";
import { disableProviderIntegrationAsync, enableProviderIntegrationAsync } from "../../../../../lib/provider-integration-state";
import { ensureProviderIntegrationAsync, getProviderIntegrationAsync, isIssueProvider } from "../../../../../lib/provider-integrations";

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
      value: tokenInput,
      scopes: integration.provider === "gitlab" ? ["api", "read_user"] : ["repo"]
    });
  }

  await enableProviderIntegrationAsync(integration.provider, integration.id, workspaceId);
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
    status: tokenInput ? "connected" : "enabled"
  });
}

async function parseTokenInput(request: Request): Promise<string | undefined | NextResponse> {
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

  return token;
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
