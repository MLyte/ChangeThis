import type { IssueProvider } from "@changethis/shared";
import { NextResponse } from "next/server";
import {
  listConfiguredProjects,
  ProjectTargetValidationError,
  saveProjectIssueTarget
} from "../../../../lib/project-registry";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../lib/auth";
import { requireJsonRequest, requirePrivateMutationOrigin } from "../../../../lib/api-security";
import { getProviderIntegration } from "../../../../lib/provider-integrations";
import { logInfo, logWarn, requestIdFrom } from "../../../../lib/logger";

export async function GET(request: Request) {
  const session = requireWorkspaceRole(await requireWorkspaceSession(request), "admin");

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  if (!session.workspace) {
    return authFailureResponse({
      error: "Workspace access required",
      status: 403
    });
  }

  const workspaceId = session.workspace.id;
  const projects = await listConfiguredProjects(workspaceId);

  return NextResponse.json({
    projects: projects.map((project) => ({
      publicKey: project.publicKey,
      name: project.name,
      allowedOrigins: project.allowedOrigins,
      issueTarget: project.issueTarget
    }))
  });
}

export async function POST(request: Request) {
  const session = requireWorkspaceRole(await requireWorkspaceSession(request), ["admin", "owner"]);

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  if (!session.workspace) {
    return authFailureResponse({
      error: "Workspace access required",
      status: 403
    });
  }

  const csrfFailure = requirePrivateMutationOrigin(request);

  if (csrfFailure) {
    return csrfFailure;
  }

  const contentTypeFailure = requireJsonRequest(request);

  if (contentTypeFailure) {
    return contentTypeFailure;
  }

  const workspaceId = session.workspace.id;
  const requestId = requestIdFrom(request);
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.projectKey !== "string" || !isIssueProvider(body.provider) || typeof body.repositoryUrl !== "string") {
    return NextResponse.json({ error: "projectKey, provider, and repositoryUrl are required" }, { status: 422 });
  }

  const integrationId = typeof body.integrationId === "string" ? body.integrationId : undefined;

  if (integrationId && !getProviderIntegration(body.provider, integrationId, workspaceId)) {
    return NextResponse.json({ error: "Unknown provider integration" }, { status: 422 });
  }

  try {
    const project = await saveProjectIssueTarget({
      projectKey: body.projectKey,
      provider: body.provider,
      repositoryUrl: body.repositoryUrl,
      integrationId,
      externalProjectId: typeof body.externalProjectId === "string" ? body.externalProjectId : undefined
    }, workspaceId);

    logInfo("project_issue_target_updated", {
      request_id: requestId,
      project_id: project.publicKey,
      provider: project.issueTarget.provider,
      issue_target: `${project.issueTarget.namespace}/${project.issueTarget.project}`
    });

    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof ProjectTargetValidationError) {
      logWarn("project_issue_target_rejected", {
        request_id: requestId,
        project_id: body.projectKey,
        provider: body.provider,
        error: error.message
      });

      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIssueProvider(value: unknown): value is IssueProvider {
  return value === "github" || value === "gitlab";
}
