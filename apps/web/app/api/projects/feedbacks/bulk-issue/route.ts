import { NextResponse } from "next/server";
import type { FeedbackStatus } from "@changethis/shared";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../../lib/auth";
import { requireJsonRequest, requirePrivateMutationOrigin } from "../../../../../lib/api-security";
import { resolveFeedbackForAction } from "../../../../../lib/demo-feedback-actions";
import { getFeedbackRepository } from "../../../../../lib/feedback-repository";
import { createIssueForFeedback } from "../../../../../lib/issue-workflow";
import { requestIdFrom } from "../../../../../lib/logger";

const actionableStatuses: FeedbackStatus[] = ["raw", "retrying", "failed"];

export async function POST(request: Request) {
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

  const contentTypeFailure = requireJsonRequest(request);

  if (contentTypeFailure) {
    return contentTypeFailure;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!isRecord(body) || !Array.isArray(body.feedbackIds)) {
    return NextResponse.json({ error: "feedbackIds must be an array" }, { status: 422 });
  }

  const feedbackIds = [...new Set(body.feedbackIds)]
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .slice(0, 50);

  if (feedbackIds.length === 0) {
    return NextResponse.json({ error: "Select at least one feedback" }, { status: 422 });
  }

  const repository = getFeedbackRepository();
  const requestId = requestIdFrom(request);
  let created = 0;
  let failed = 0;
  let skipped = 0;

  for (const id of feedbackIds) {
    const actionScope = await resolveFeedbackForAction(repository, id, workspaceId);

    if (!actionScope || !actionableStatuses.includes(actionScope.feedback.status)) {
      skipped += 1;
      continue;
    }

    const updated = await createIssueForFeedback(actionScope.feedback, requestId, { workspaceId: actionScope.workspaceId });

    if (updated.status === "sent_to_provider") {
      created += 1;
    } else if (updated.status === "failed" || updated.status === "retrying") {
      failed += 1;
    } else {
      skipped += 1;
    }
  }

  return NextResponse.json({ created, failed, skipped });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
