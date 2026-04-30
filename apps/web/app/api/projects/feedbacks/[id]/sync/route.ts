import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../../../lib/auth";
import { getFeedbackRepository } from "../../../../../../lib/feedback-repository";
import { IssueProviderError } from "../../../../../../lib/issue-providers";
import { syncFeedbackIssueState } from "../../../../../../lib/issue-workflow";
import { requestIdFrom } from "../../../../../../lib/logger";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = requireWorkspaceRole(await requireWorkspaceSession(request), "member");

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return authFailureResponse({ error: "Workspace access required", status: 403 });
  }

  const requestId = requestIdFrom(request);
  const { id } = await context.params;
  const feedback = await getFeedbackRepository().get(id, { workspaceId });

  if (!feedback || !feedback.externalIssue) {
    return NextResponse.json({ error: "Feedback issue not found" }, { status: 404 });
  }

  try {
    const updated = await syncFeedbackIssueState(feedback, requestId, { workspaceId });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      externalIssue: updated.externalIssue
    });
  } catch (error) {
    if (error instanceof IssueProviderError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status ?? 502 });
    }

    throw error;
  }
}
