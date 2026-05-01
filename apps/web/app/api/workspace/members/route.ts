import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, type WorkspaceRole, requireWorkspaceRole, requireWorkspaceSession } from "../../../../lib/auth";
import { requireJsonRequest, requirePrivateMutationOrigin } from "../../../../lib/api-security";
import { getWorkspaceMember, inviteWorkspaceMember, updateWorkspaceMemberStatus } from "../../../../lib/supabase-server";

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

  const inviteResult = await inviteWorkspaceMember({
    organizationId: workspace.id,
    email: body.email.trim(),
    role,
    invitedBy: session.user.id
  });

  if (!inviteResult.ok) {
    return NextResponse.json({
      error: inviteResult.reason === "already_active"
        ? "Member is already active in this workspace"
        : inviteResult.reason === "invitee_not_found"
          ? "No matching user found for this email"
          : `Invalid invitation data: ${inviteResult.reason}`
    }, { status: inviteResult.reason === "already_active" ? 409 : 422 });
  }

  return NextResponse.json({
    member: inviteResult.member
  }, { status: 201 });
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

  const member = await getWorkspaceMember(workspace.id, body.userId);

  if (!member) {
    return NextResponse.json({ error: "Workspace member not found" }, { status: 404 });
  }

  if (!canManageWorkspaceMemberRole(workspace.role, member.role)) {
    return NextResponse.json({ error: "Insufficient workspace role" }, { status: 403 });
  }

  const updated = await updateWorkspaceMemberStatus({
    organizationId: workspace.id,
    userId: body.userId,
    status: body.status
  });

  if (!updated) {
    return NextResponse.json({ error: "Unable to update member status" }, { status: 409 });
  }

  return NextResponse.json({ member: updated });
}

function normalizeWorkspaceRole(value: string): string | undefined {
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

function canManageWorkspaceMemberRole(actorRole: WorkspaceRole, memberRole: string): boolean {
  if (actorRole === "owner") {
    return true;
  }

  if (actorRole === "admin") {
    return memberRole !== "owner";
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
