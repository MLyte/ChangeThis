import { NextResponse } from "next/server";
import { processDueIssueRetries } from "../../../../lib/issue-workflow";
import { requestIdFrom } from "../../../../lib/logger";

export async function POST(request: Request) {
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
