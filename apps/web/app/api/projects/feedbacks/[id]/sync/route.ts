import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../../../lib/auth";
import { methodNotAllowed, requirePrivateMutationOrigin } from "../../../../../../lib/api-security";
import { resolveFeedbackForAction } from "../../../../../../lib/demo-feedback-actions";
import { getFeedbackRepository } from "../../../../../../lib/feedback-repository";
import { IssueProviderError } from "../../../../../../lib/issue-providers";
import { syncFeedbackIssueState } from "../../../../../../lib/issue-workflow";
import { requestIdFrom } from "../../../../../../lib/logger";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const unsupportedMethod = methodNotAllowed(["POST"]);

export const GET = unsupportedMethod;
export const PUT = unsupportedMethod;
export const PATCH = unsupportedMethod;
export const DELETE = unsupportedMethod;
export const OPTIONS = unsupportedMethod;

export async function POST(request: Request, context: RouteContext) {
  const session = requireWorkspaceRole(await requireWorkspaceSession(request), "member");

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

  const requestId = requestIdFrom(request);
  const { id } = await context.params;
  const actionScope = await resolveFeedbackForAction(getFeedbackRepository(), id, workspaceId);
  const feedback = actionScope?.feedback;

  if (!feedback || !feedback.externalIssue) {
    return NextResponse.json({ error: "Feedback issue not found" }, { status: 404 });
  }

  try {
    const updated = await syncFeedbackIssueState(feedback, requestId, { workspaceId: actionScope.workspaceId });

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
