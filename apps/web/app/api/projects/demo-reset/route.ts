import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../lib/auth";
import { requirePrivateMutationOrigin } from "../../../../lib/api-security";
import { deleteProviderCredentialSecrets, getProviderCredentialSecret } from "../../../../lib/credential-store";
import { isDemoProviderToken } from "../../../../lib/demo-provider-data";
import { getFeedbackRepository } from "../../../../lib/feedback-repository";
import { enableProviderIntegration } from "../../../../lib/provider-integration-state";
import { getProviderIntegration } from "../../../../lib/provider-integrations";
import { clearConnectedSites } from "../../../../lib/project-registry";
import { isProductionRuntime } from "../../../../lib/runtime";

export async function POST(request: Request) {
  if (isProductionRuntime) {
    return NextResponse.json({ error: "Demo reset is disabled in production" }, { status: 403 });
  }

  const session = requireWorkspaceRole(await requireWorkspaceSession(request), "admin");

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return authFailureResponse({ error: "Workspace access required", status: 403 });
  }

  const csrfFailure = requirePrivateMutationOrigin(request);

  if (csrfFailure) {
    return csrfFailure;
  }

  const feedback = await getFeedbackRepository().clearWorkspace(workspaceId);
  const sites = await clearConnectedSites(workspaceId);
  const connections = clearDemoProviderConnections(workspaceId);

  return NextResponse.json({
    deletedFeedbacks: feedback.feedbacks,
    deletedEvents: feedback.events,
    deletedSites: sites,
    deletedConnections: connections
  });
}

function clearDemoProviderConnections(workspaceId: string): number {
  let deletedConnections = 0;

  for (const provider of ["github", "gitlab"] as const) {
    const integration = getProviderIntegration(provider, undefined, workspaceId);

    if (!integration) {
      continue;
    }

    const existingToken = getProviderCredentialSecret(provider, integration.id, "access_token", workspaceId);

    if (isDemoProviderToken(provider, existingToken)) {
      deletedConnections += deleteProviderCredentialSecrets(provider, integration.id, workspaceId);
    }

    enableProviderIntegration(provider, integration.id, workspaceId);
  }

  return deletedConnections;
}
