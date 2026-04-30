import type { IssueProvider } from "@changethis/shared";
import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceSession } from "../../../../lib/auth";
import { getFeedbackRepository } from "../../../../lib/feedback-repository";
import { IssueProviderError, listIssueProviderRepositories } from "../../../../lib/issue-providers";
import { getProviderIntegration } from "../../../../lib/provider-integrations";
import {
  createConnectedSite,
  installSnippet,
  listConfiguredProjects,
  ProjectTargetValidationError
} from "../../../../lib/project-registry";

export async function GET(request: Request) {
  const session = await requireWorkspaceSession(request);

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  if (!session.workspace) {
    return authFailureResponse({ error: "Workspace access required", status: 403 });
  }

  const projects = await listConfiguredProjects(session.workspace.id);
  const feedbacks = await getFeedbackRepository().list({ workspaceId: session.workspace.id });

  return NextResponse.json({
    sites: projects.map((project) => {
      const projectFeedbacks = feedbacks.filter((feedback) => feedback.projectKey === project.publicKey);
      const issuesCreated = projectFeedbacks.filter((feedback) => feedback.status === "sent_to_provider" || feedback.externalIssue).length;

      return {
        ...project,
        installSnippet: installSnippet(project.publicKey),
        metrics: {
          feedbacksReceived: projectFeedbacks.length,
          issuesCreated,
          failedIssues: projectFeedbacks.filter((feedback) => feedback.status === "failed").length,
          lastFeedbackAt: projectFeedbacks[0]?.createdAt
        }
      };
    })
  });
}

export async function POST(request: Request) {
  const session = await requireWorkspaceSession(request);

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  if (!session.workspace) {
    return authFailureResponse({ error: "Workspace access required", status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!isRecord(body) || !isIssueProvider(body.provider) || typeof body.repositoryId !== "string" || typeof body.allowedOrigin !== "string") {
    return NextResponse.json({ error: "provider, repositoryId, and allowedOrigin are required" }, { status: 422 });
  }

  const integrationId = typeof body.integrationId === "string" ? body.integrationId : undefined;
  const integration = getProviderIntegration(body.provider, integrationId);

  if (!integration?.credentialConfigured) {
    return NextResponse.json({ error: "Provider is not connected" }, { status: 409 });
  }

  try {
    const repositories = await listIssueProviderRepositories(body.provider, { integrationId: integration.id });
    const repository = repositories.find((item) => item.id === body.repositoryId || item.webUrl === body.repositoryId);

    if (!repository) {
      return NextResponse.json({ error: "Repository is not accessible from this provider connection" }, { status: 422 });
    }

    const site = await createConnectedSite({
      name: typeof body.name === "string" ? body.name : repository.name,
      allowedOrigin: body.allowedOrigin,
      provider: body.provider,
      repositoryUrl: repository.webUrl,
      integrationId: integration.id,
      externalProjectId: repository.externalProjectId,
      workspaceId: session.workspace.id
    });

    return NextResponse.json({
      site,
      installSnippet: installSnippet(site.publicKey),
      metrics: {
        feedbacksReceived: 0,
        issuesCreated: 0,
        failedIssues: 0
      }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ProjectTargetValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof IssueProviderError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status ?? 502 });
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
