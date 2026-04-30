import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../lib/auth";
import { deleteProviderCredentialSecrets, getProviderCredentialSecret } from "../../../../lib/credential-store";
import { isDemoProviderToken } from "../../../../lib/demo-provider-data";
import { getFeedbackRepository } from "../../../../lib/feedback-repository";
import { enableProviderIntegration } from "../../../../lib/provider-integration-state";
import { getProviderIntegration } from "../../../../lib/provider-integrations";
import { clearConnectedSites } from "../../../../lib/project-registry";

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
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

  const feedback = await getFeedbackRepository().clearWorkspace(workspaceId);
  const sites = await clearConnectedSites(workspaceId);
  const connections = clearDemoProviderConnections();

  return NextResponse.json({
    deletedFeedbacks: feedback.feedbacks,
    deletedEvents: feedback.events,
    deletedSites: sites,
    deletedConnections: connections
  });
}

function clearDemoProviderConnections(): number {
  let deletedConnections = 0;

  for (const provider of ["github", "gitlab"] as const) {
    const integration = getProviderIntegration(provider);

    if (!integration) {
      continue;
    }

    const existingToken = getProviderCredentialSecret(provider, integration.id, "access_token");

    if (isDemoProviderToken(provider, existingToken)) {
      deletedConnections += deleteProviderCredentialSecrets(provider, integration.id);
    }

    enableProviderIntegration(provider, integration.id);
  }

  return deletedConnections;
}
