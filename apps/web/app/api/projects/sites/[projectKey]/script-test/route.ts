import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceSession } from "../../../../../../lib/auth";
import { findConfiguredProjectByKey, installSnippet } from "../../../../../../lib/project-registry";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectKey: string }> }
) {
  const session = await requireWorkspaceSession(request);

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  if (!session.workspace) {
    return authFailureResponse({ error: "Workspace access required", status: 403 });
  }

  const { projectKey } = await context.params;
  const project = await findConfiguredProjectByKey(projectKey, session.workspace.id);

  if (!project) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const configUrl = new URL("/api/widget/config", url.origin);
  configUrl.searchParams.set("project", project.publicKey);
  const configResponse = await fetch(configUrl);

  return NextResponse.json({
    ok: configResponse.ok,
    status: configResponse.ok ? "ready" : "error",
    message: configResponse.ok
      ? "Configuration widget valide. Le script peut recevoir des retours pour ce site."
      : "Configuration widget indisponible pour cette clé publique.",
    installSnippet: installSnippet(project.publicKey)
  }, { status: configResponse.ok ? 200 : 409 });
}
