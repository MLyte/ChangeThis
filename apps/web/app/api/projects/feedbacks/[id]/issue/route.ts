import { NextResponse } from "next/server";
import type { IssueDraft } from "@changethis/shared";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../../../lib/auth";
import { methodNotAllowed, parsePrivateTextField, requirePrivateMutationOrigin } from "../../../../../../lib/api-security";
import { resolveFeedbackForAction } from "../../../../../../lib/demo-feedback-actions";
import { getFeedbackRepository } from "../../../../../../lib/feedback-repository";
import { createIssueForFeedback } from "../../../../../../lib/issue-workflow";
import { requestIdFrom } from "../../../../../../lib/logger";

const issueDraftTitleMaxLength = 240;
const issueDraftDescriptionMaxLength = 12000;
const issueDraftLabelMaxLength = 64;

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
  const draftOverride = await readIssueDraftOverride(request);
  const { id } = await context.params;
  const repository = getFeedbackRepository();
  const actionScope = await resolveFeedbackForAction(repository, id, workspaceId);

  if (!actionScope) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  if (draftOverride && !draftOverride.ok) {
    return NextResponse.json({ error: draftOverride.error }, { status: 422 });
  }

  const updated = await createIssueForFeedback(actionScope.feedback, requestId, {
    issueDraft: draftOverride?.value,
    workspaceId: actionScope.workspaceId
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
  const title = parsePrivateTextField(issueDraft.title, {
    name: "Issue title",
    required: true,
    maxLength: issueDraftTitleMaxLength
  });

  if (!title.ok) {
    return title;
  }

  const titleValue = title.value;
  if (!titleValue) {
    return { ok: false, error: "Issue title is required" };
  }

  const description = parsePrivateTextField(issueDraft.description, {
    name: "Issue description",
    required: true,
    maxLength: issueDraftDescriptionMaxLength
  });

  if (!description.ok) {
    return description;
  }

  const descriptionValue = description.value;
  if (!descriptionValue) {
    return { ok: false, error: "Issue description is required" };
  }

  if (!Array.isArray(issueDraft.labels)) {
    return { ok: false, error: "Issue labels must be a string array" };
  }

  const labels: string[] = [];

  for (const label of issueDraft.labels) {
    const parsedLabel = parsePrivateTextField(label, {
      name: "Issue label",
      maxLength: issueDraftLabelMaxLength
    });

    if (!parsedLabel.ok) {
      return parsedLabel;
    }

    if (parsedLabel.value) {
      labels.push(parsedLabel.value);
    }
  }

  return {
    ok: true,
    value: {
      title: titleValue,
      description: descriptionValue,
      labels: labels.slice(0, 20)
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
