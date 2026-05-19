import type { FeedbackReporter } from "@changethis/shared";
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
    logWarn("feedback_reporter_rejected_origin_unknown", { request_id: requestId, origin });
    return NextResponse.json({ error: "Origin is not allowed" }, { status: 403, headers });
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    rawBody = {};
  }

  const projectKey = isRecord(rawBody) && typeof rawBody.projectKey === "string" ? rawBody.projectKey : "";
  const reporterValidation = parseReporter(isRecord(rawBody) ? rawBody.reporter : undefined);
  const { id } = await context.params;
  const project = await findConfiguredProjectByKey(projectKey);

  if (!reporterValidation.ok) {
    logWarn("feedback_reporter_rejected_validation", { request_id: requestId, origin, feedback_id: id, project_key: projectKey, error: reporterValidation.error });
    return NextResponse.json({ error: reporterValidation.error }, { status: 422, headers });
  }

  if (!project) {
    logWarn("feedback_reporter_rejected_not_found", { request_id: requestId, origin, feedback_id: id, project_key: projectKey });
    return NextResponse.json({ error: "Feedback not found" }, { status: 404, headers });
  }

  if (!origin || !project.allowedOrigins.includes(origin)) {
    logWarn("feedback_reporter_rejected_origin", { request_id: requestId, origin, feedback_id: id, project_key: projectKey });
    return NextResponse.json({ error: "Origin is not allowed for this project" }, { status: 403, headers });
  }

  const repository = getFeedbackRepository();
  const feedback = await repository.get(id, { workspaceId: project.workspaceId });

  if (!feedback || feedback.projectKey !== projectKey) {
    logWarn("feedback_reporter_rejected_not_found", { request_id: requestId, origin, feedback_id: id, project_key: projectKey });
    return NextResponse.json({ error: "Feedback not found" }, { status: 404, headers });
  }

  const updated = await repository.updateReporter(id, reporterValidation.reporter, { workspaceId: project.workspaceId });

  logInfo("feedback_reporter_updated_by_client", {
    request_id: requestId,
    project_id: updated.projectKey,
    feedback_id: updated.id
  });

  return NextResponse.json({ id: updated.id, reporter: updated.payload.reporter }, { headers: { ...headers, "X-Request-Id": requestId } });
}

function parseReporter(value: unknown): { ok: true; reporter: FeedbackReporter } | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: "reporter is required" };
  }

  const name = normalizeOptionalString(value.name, 120);
  const email = normalizeOptionalString(value.email, 254);

  if (name === false) {
    return { ok: false, error: "reporter.name must be a string up to 120 characters" };
  }

  if (email === false) {
    return { ok: false, error: "reporter.email must be a string up to 254 characters" };
  }

  if (email && !isValidEmail(email)) {
    return { ok: false, error: "reporter.email must be a valid email address" };
  }

  if (!name && !email) {
    return { ok: false, error: "reporter.name or reporter.email is required" };
  }

  return {
    ok: true,
    reporter: {
      name: name || undefined,
      email: email || undefined
    }
  };
}

function normalizeOptionalString(value: unknown, maxLength: number): string | false {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : false;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
