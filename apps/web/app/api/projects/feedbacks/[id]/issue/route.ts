import { NextResponse } from "next/server";
import type { IssueDraft } from "@changethis/shared";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../../../lib/auth";
import { getFeedbackRepository } from "../../../../../../lib/feedback-repository";
import { createIssueForFeedback } from "../../../../../../lib/issue-workflow";
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
  const draftOverride = await readIssueDraftOverride(request);
  const { id } = await context.params;
  const repository = getFeedbackRepository();
  const feedback = await repository.get(id, { workspaceId });

  if (!feedback) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  if (draftOverride && !draftOverride.ok) {
    return NextResponse.json({ error: draftOverride.error }, { status: 422 });
  }

  const updated = await createIssueForFeedback(feedback, requestId, {
    issueDraft: draftOverride?.value,
    workspaceId
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    externalIssue: updated.externalIssue,
    lastError: updated.lastError,
    nextRetryAt: updated.nextRetryAt
  });
}

async function readIssueDraftOverride(request: Request): Promise<{ ok: true; value?: IssueDraft } | { ok: false; error: string }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return { ok: true };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }

  if (!isRecord(body) || !isRecord(body.issueDraft)) {
    return { ok: true };
  }

  const { issueDraft } = body;
  if (typeof issueDraft.title !== "string" || !issueDraft.title.trim()) {
    return { ok: false, error: "Issue title is required" };
  }

  if (typeof issueDraft.description !== "string" || !issueDraft.description.trim()) {
    return { ok: false, error: "Issue description is required" };
  }

  if (!Array.isArray(issueDraft.labels) || !issueDraft.labels.every((label) => typeof label === "string")) {
    return { ok: false, error: "Issue labels must be a string array" };
  }

  return {
    ok: true,
    value: {
      title: issueDraft.title.trim().slice(0, 240),
      description: issueDraft.description.trim().slice(0, 12000),
      labels: issueDraft.labels.map((label) => label.trim()).filter(Boolean).slice(0, 20)
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
