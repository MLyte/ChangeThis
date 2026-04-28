import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceSession } from "../../../../lib/auth";
import { processDueIssueRetries } from "../../../../lib/issue-workflow";
import { requestIdFrom } from "../../../../lib/logger";

export async function POST(request: Request) {
  const session = await requireWorkspaceSession(request);

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  const requestId = requestIdFrom(request);
  const results = await processDueIssueRetries(requestId);

  return NextResponse.json({
    processed: results.length,
    feedbacks: results.map((feedback) => ({
      id: feedback.id,
      status: feedback.status,
      externalIssue: feedback.externalIssue,
      lastError: feedback.lastError,
      nextRetryAt: feedback.nextRetryAt
    }))
  });
}
