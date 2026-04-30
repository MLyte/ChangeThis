import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../../lib/auth";
import { requirePrivateMutationOrigin } from "../../../../../lib/api-security";
import { deleteProviderCredentialSecrets } from "../../../../../lib/credential-store";
import { disableProviderIntegration, enableProviderIntegration } from "../../../../../lib/provider-integration-state";
import { getProviderIntegration, isIssueProvider } from "../../../../../lib/provider-integrations";

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
  const removedCredentials = deleteProviderCredentialSecrets(integration.provider, integration.id, workspaceId);
  disableProviderIntegration(integration.provider, integration.id, workspaceId);

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

  const integration = await resolveIntegration(request, context, session.workspace?.id);

  if (!integration) {
    return NextResponse.json({ error: "Unknown provider integration" }, { status: 404 });
  }

  enableProviderIntegration(integration.provider, integration.id, session.workspace?.id);

  return NextResponse.json({
    provider: integration.provider,
    integrationId: integration.id,
    status: "enabled"
  });
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
  return getProviderIntegration(provider, url.searchParams.get("integrationId") ?? undefined, workspaceId);
}
