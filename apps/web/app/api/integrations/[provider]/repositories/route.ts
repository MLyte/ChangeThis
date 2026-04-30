import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../../lib/auth";
import { IssueProviderError, listIssueProviderRepositories } from "../../../../../lib/issue-providers";
import { isIssueProvider } from "../../../../../lib/provider-integrations";

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const session = requireWorkspaceRole(await requireWorkspaceSession(request), "admin");

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  const { provider } = await context.params;

  if (!isIssueProvider(provider)) {
    return NextResponse.json({ error: "Unknown issue provider" }, { status: 404 });
  }

  try {
    const url = new URL(request.url);
    const integrationId = url.searchParams.get("integrationId") ?? undefined;
    const workspaceId = session.workspace?.id;

    if (!workspaceId) {
      return authFailureResponse({ error: "Workspace access required", status: 403 });
    }

    const repositories = await listIssueProviderRepositories(provider, { integrationId, workspaceId });

    return NextResponse.json({
      provider,
      integrationId,
      repositories
    });
  } catch (error) {
    if (error instanceof IssueProviderError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          provider: error.provider
        },
        { status: error.status ?? statusFromProviderErrorCode(error.code) }
      );
    }

    throw error;
  }
}

function statusFromProviderErrorCode(code: IssueProviderError["code"]): number {
  if (code === "auth_failed") {
    return 401;
  }

  if (code === "permission_denied") {
    return 403;
  }

  if (code === "target_not_found") {
    return 404;
  }

  if (code === "validation_failed") {
    return 502;
  }

  if (code === "rate_limited") {
    return 429;
  }

  return 502;
}
