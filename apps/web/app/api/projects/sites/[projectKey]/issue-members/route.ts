import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../../../lib/auth";
import { requireJsonRequest, requirePrivateMutationOrigin } from "../../../../../../lib/api-security";
import { findConfiguredProjectByKey } from "../../../../../../lib/project-registry";
import { listProjectIssueAccesses, removeProjectIssueAccess, replaceProjectIssueAccesses } from "../../../../../../lib/project-issue-access";

type RouteContext = {
  params: Promise<{
    projectKey: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = requireWorkspaceRole(await requireWorkspaceSession(request), ["admin", "owner"]);
  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return authFailureResponse({ error: "Workspace access required", status: 403 });
  }

  const { projectKey } = await context.params;
  const project = await findConfiguredProjectByKey(projectKey, workspaceId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const accesses = await listProjectIssueAccesses({ workspaceId, projectKey });
  return NextResponse.json({ accesses });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = requireWorkspaceRole(await requireWorkspaceSession(request), ["admin", "owner"]);
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

  if (!isRecord(body) || !Array.isArray(body.userIds)) {
    return NextResponse.json({ error: "userIds must be an array" }, { status: 422 });
  }

  const { projectKey } = await context.params;
  const project = await findConfiguredProjectByKey(projectKey, workspaceId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const userIds = [...new Set(body.userIds.filter((userId): userId is string => typeof userId === "string" && userId.length > 0))];
  const userEmails = Array.isArray(body.userEmails)
    ? [...new Set(body.userEmails.filter((email): email is string => typeof email === "string" && email.trim().length > 0))]
    : [];
  try {
    const accesses = await replaceProjectIssueAccesses({ workspaceId, projectKey, userIds, userEmails });
    return NextResponse.json({ accesses });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? projectIssueAccessErrorMessage(error.message) : "Impossible d'enregistrer les accès."
    }, { status: 422 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await requireWorkspaceSession(request);
  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  if (!session.workspace?.id) {
    return authFailureResponse({ error: "Project access required", status: 403 });
  }

  const csrfFailure = requirePrivateMutationOrigin(request);
  if (csrfFailure) {
    return csrfFailure;
  }

  const { projectKey } = await context.params;
  const ownAccesses = await listProjectIssueAccesses({ projectKey, userId: session.user.id });
  const access = ownAccesses.find((item) => item.status === "active" && item.workspaceId);
  if (!access?.workspaceId) {
    return NextResponse.json({ error: "Project access not found" }, { status: 404 });
  }

  const project = await findConfiguredProjectByKey(projectKey, access.workspaceId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await removeProjectIssueAccess({ workspaceId: access.workspaceId, projectKey, userId: session.user.id });
  return NextResponse.json({ ok: true });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function projectIssueAccessErrorMessage(message: string): string {
  if (message.includes("active ChangeThis account")) {
    return "Ce compte ChangeThis n'existe pas encore ou n'est pas actif.";
  }

  return message || "Impossible d'enregistrer les accès.";
}
