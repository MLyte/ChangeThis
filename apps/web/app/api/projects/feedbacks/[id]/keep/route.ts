import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../../../lib/auth";
import { methodNotAllowed, requirePrivateMutationOrigin } from "../../../../../../lib/api-security";
import { resolveFeedbackForAction } from "../../../../../../lib/demo-feedback-actions";
import { getFeedbackRepository } from "../../../../../../lib/feedback-repository";
import { logInfo, requestIdFrom } from "../../../../../../lib/logger";

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
  const repository = getFeedbackRepository();

  try {
    const actionScope = await resolveFeedbackForAction(repository, id, workspaceId);

    if (!actionScope) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    const feedback = await repository.markKept(id, { workspaceId: actionScope.workspaceId });
    logInfo("feedback_kept_without_issue", {
      request_id: requestId,
      project_id: feedback.projectKey,
      feedback_id: feedback.id
    });

    return NextResponse.json({ id: feedback.id, status: feedback.status });
  } catch {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }
}
