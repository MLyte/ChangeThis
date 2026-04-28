import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceSession } from "../../../../../../lib/auth";
import { getFeedbackRepository } from "../../../../../../lib/feedback-repository";
import { createIssueForFeedback } from "../../../../../../lib/issue-workflow";
import { requestIdFrom } from "../../../../../../lib/logger";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await requireWorkspaceSession(request);

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  const requestId = requestIdFrom(request);
  const { id } = await context.params;
  const repository = getFeedbackRepository();
  const feedback = await repository.get(id);

  if (!feedback) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  const updated = await createIssueForFeedback(feedback, requestId);

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    externalIssue: updated.externalIssue,
    lastError: updated.lastError,
    nextRetryAt: updated.nextRetryAt
  });
}
