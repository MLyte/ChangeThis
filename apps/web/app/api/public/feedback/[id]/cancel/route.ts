import { NextResponse } from "next/server";
import { methodNotAllowed } from "../../../../../../lib/api-security";
import { getFeedbackRepository } from "../../../../../../lib/feedback-repository";
import { logInfo, logWarn, requestIdFrom } from "../../../../../../lib/logger";
import { findConfiguredProjectByKey, isKnownOrigin } from "../../../../../../lib/project-registry";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const unsupportedMethod = methodNotAllowed(["POST", "OPTIONS"]);

export const GET = unsupportedMethod;
export const PUT = unsupportedMethod;
export const PATCH = unsupportedMethod;
export const DELETE = unsupportedMethod;

function corsHeaders(origin: string | null): HeadersInit {
  if (!origin) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  const knownOrigin = await isKnownOrigin(origin);

  return new NextResponse(null, {
    status: knownOrigin ? 204 : 403,
    headers: knownOrigin ? corsHeaders(origin) : {}
  });
}

export async function POST(request: Request, context: RouteContext) {
  const requestId = requestIdFrom(request);
  const origin = request.headers.get("origin");
  const knownOrigin = await isKnownOrigin(origin);
  const headers = knownOrigin ? corsHeaders(origin) : {};

  if (!knownOrigin) {
    logWarn("feedback_cancel_rejected_origin_unknown", { request_id: requestId, origin });
    return NextResponse.json({ error: "Origin is not allowed" }, { status: 403, headers });
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    rawBody = {};
  }

  const projectKey = isRecord(rawBody) && typeof rawBody.projectKey === "string" ? rawBody.projectKey : "";
  const { id } = await context.params;
  const project = await findConfiguredProjectByKey(projectKey);

  if (!project) {
    logWarn("feedback_cancel_rejected_not_found", { request_id: requestId, origin, feedback_id: id, project_key: projectKey });
    return NextResponse.json({ error: "Feedback not found" }, { status: 404, headers });
  }

  if (!origin || !project.allowedOrigins.includes(origin)) {
    logWarn("feedback_cancel_rejected_origin", { request_id: requestId, origin, feedback_id: id, project_key: projectKey });
    return NextResponse.json({ error: "Origin is not allowed for this project" }, { status: 403, headers });
  }

  const repository = getFeedbackRepository();
  const feedback = await repository.get(id, { workspaceId: project.workspaceId });

  if (!feedback || feedback.projectKey !== projectKey) {
    logWarn("feedback_cancel_rejected_not_found", { request_id: requestId, origin, feedback_id: id, project_key: projectKey });
    return NextResponse.json({ error: "Feedback not found" }, { status: 404, headers });
  }

  const canceled = await repository.markIgnored(id, { workspaceId: project.workspaceId });

  logInfo("feedback_canceled_by_client", {
    request_id: requestId,
    project_id: canceled.projectKey,
    feedback_id: canceled.id
  });

  return NextResponse.json({ id: canceled.id, status: canceled.status }, { headers: { ...headers, "X-Request-Id": requestId } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
