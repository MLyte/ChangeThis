import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../../lib/auth";
import { deleteConnectedSite } from "../../../../../lib/project-registry";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ projectKey: string }> }
) {
  const session = requireWorkspaceRole(await requireWorkspaceSession(request), "admin");

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  if (!session.workspace) {
    return authFailureResponse({ error: "Workspace access required", status: 403 });
  }

  const { projectKey } = await context.params;
  const deleted = await deleteConnectedSite(projectKey, session.workspace.id);

  if (!deleted) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
