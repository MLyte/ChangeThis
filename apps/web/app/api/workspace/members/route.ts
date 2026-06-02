import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, type WorkspaceRole, requireWorkspaceRole, requireWorkspaceSession } from "../../../../lib/auth";
import { requireJsonRequest, requirePrivateMutationOrigin } from "../../../../lib/api-security";
import { addInternalWorkspaceMember, disableInternalWorkspaceMember } from "../../../../lib/internal-api";

export async function POST(request: Request) {
  const session = requireWorkspaceRole(await requireWorkspaceSession(request), ["admin", "owner"]);

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  const workspace = session.workspace;
  if (!workspace) {
    return authFailureResponse({ error: "Workspace access required", status: 403 });
  }

  const csrfFailure = requirePrivateMutationOrigin(request);
  if (csrfFailure) {
    return csrfFailure;
  }

  const contentTypeFailure = requireJsonRequest(request);
  if (contentTypeFailure) {
    return contentTypeFailure;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 422 });
  }

  const role = normalizeWorkspaceRole(typeof body.role === "string" ? body.role : "member");
  if (!role) {
    return NextResponse.json({ error: "role is invalid" }, { status: 422 });
  }

  if (!canAssignWorkspaceRole(workspace.role, role)) {
    return NextResponse.json({ error: "Insufficient workspace role" }, { status: 403 });
  }

  const result = await addInternalWorkspaceMember({
    workspaceId: workspace.id,
    email: body.email.trim(),
    role
  }, request);

  if (!result.ok) {
    return NextResponse.json({
      error: result.error === "already_active"
        ? "Member is already active in this workspace"
        : result.error === "not_found"
          ? "No matching user found for this email"
          : "Unable to add this member"
    }, { status: result.error === "already_active" ? 409 : result.error === "not_found" ? 404 : 422 });
  }

  return NextResponse.json({ member: result.member }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = requireWorkspaceRole(await requireWorkspaceSession(request), ["admin", "owner"]);

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  const workspace = session.workspace;
  if (!workspace) {
    return authFailureResponse({ error: "Workspace access required", status: 403 });
  }

  const csrfFailure = requirePrivateMutationOrigin(request);
  if (csrfFailure) {
    return csrfFailure;
  }

  const contentTypeFailure = requireJsonRequest(request);
  if (contentTypeFailure) {
    return contentTypeFailure;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.userId !== "string" || typeof body.status !== "string") {
    return NextResponse.json({ error: "userId and status are required" }, { status: 422 });
  }

  if (body.userId === session.user.id) {
    return NextResponse.json({ error: "Self-disabling is not allowed" }, { status: 400 });
  }

  if (body.status !== "disabled") {
    return NextResponse.json({ error: "Only status disabled is supported" }, { status: 422 });
  }

  const result = await disableInternalWorkspaceMember({
    workspaceId: workspace.id,
    userId: body.userId
  }, request);

  if (!result.ok) {
    return NextResponse.json({ error: "Unable to update member status" }, { status: result.error === "not_found" ? 404 : 422 });
  }

  return NextResponse.json({ member: result.member });
}

function normalizeWorkspaceRole(value: string): WorkspaceRole | undefined {
  return value === "viewer" || value === "member" || value === "admin" || value === "owner" ? value : undefined;
}

function canAssignWorkspaceRole(actorRole: WorkspaceRole, targetRole: string): boolean {
  if (actorRole === "owner") {
    return true;
  }

  if (actorRole === "admin") {
    return targetRole !== "owner";
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
