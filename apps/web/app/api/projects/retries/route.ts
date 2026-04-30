import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../lib/auth";
import { requirePrivateMutationOrigin } from "../../../../lib/api-security";
import { processDueIssueRetries } from "../../../../lib/issue-workflow";
import { requestIdFrom } from "../../../../lib/logger";

export async function POST(request: Request) {
  const session = requireWorkspaceRole(await requireWorkspaceSession(request), ["admin", "owner"]);

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  const csrfFailure = requirePrivateMutationOrigin(request);

  if (csrfFailure) {
    return csrfFailure;
  }

  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return authFailureResponse({ error: "Workspace access required", status: 403 });
  }

  const requestId = requestIdFrom(request);
  const results = await processDueIssueRetries(requestId, { workspaceId });

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
