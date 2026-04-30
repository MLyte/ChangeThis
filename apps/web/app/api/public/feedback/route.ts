import { buildIssueDraft, validateFeedbackPayload } from "@changethis/shared";
import { NextResponse } from "next/server";
import { getFeedbackRepository } from "../../../../lib/feedback-repository";
import { logInfo, logWarn, requestIdFrom } from "../../../../lib/logger";
import { ensureIssueTargetConfigured, findConfiguredProjectByKey, isKnownOrigin } from "../../../../lib/project-registry";

const maxBodyBytes = 2_500_000;
const maxScreenshotBytes = 2_000_000;
const rateLimitWindowMs = 60_000;
const rateLimitMaxRequests = 20;

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

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

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  const origin = request.headers.get("origin");
  const knownOrigin = await isKnownOrigin(origin);
  const headers = knownOrigin ? corsHeaders(origin) : {};
  const contentLength = request.headers.get("content-length");

  if (contentLength && Number(contentLength) > maxBodyBytes) {
    logWarn("feedback_rejected_payload_too_large", { request_id: requestId, origin, content_length: contentLength });
    return NextResponse.json({ error: "Payload is too large" }, { status: 413, headers });
  }

  let rawPayload: unknown;

  try {
    rawPayload = await request.json();
  } catch {
    logWarn("feedback_rejected_invalid_json", { request_id: requestId, origin });
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400, headers });
  }

  const validation = validateFeedbackPayload(rawPayload, { maxScreenshotBytes });
  if (!validation.ok) {
    logWarn("feedback_rejected_validation", { request_id: requestId, origin, error: validation.error });
    return NextResponse.json({ error: validation.error }, { status: 422, headers });
  }

  const payload = validation.value;
  const project = await findConfiguredProjectByKey(payload.projectKey);

  if (!project) {
    logWarn("feedback_rejected_unknown_project", { request_id: requestId, origin, project_key: payload.projectKey });
    return NextResponse.json({ error: "Unknown project" }, { status: 404, headers });
  }

  if (!origin || !project.allowedOrigins.includes(origin)) {
    logWarn("feedback_rejected_origin", { request_id: requestId, origin, project_key: payload.projectKey });
    return NextResponse.json({ error: "Origin is not allowed for this project" }, { status: 403, headers });
  }

  let issueTarget;

  try {
    issueTarget = ensureIssueTargetConfigured(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Issue destination is not configured";
    logWarn("feedback_rejected_issue_target_missing", { request_id: requestId, origin, project_key: payload.projectKey, error: message });
    return NextResponse.json({ error: message }, { status: 409, headers });
  }

  const rateLimit = checkRateLimit(`${getClientKey(request)}:${payload.projectKey}`);
  if (!rateLimit.allowed) {
    logWarn("feedback_rejected_rate_limited", { request_id: requestId, origin, project_key: payload.projectKey });
    return NextResponse.json(
      { error: "Too many feedback submissions. Try again later." },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000))
        }
      }
    );
  }

  const issueDraft = buildIssueDraft(payload);
  const feedback = await getFeedbackRepository().create({
    projectKey: project.publicKey,
    projectName: project.name,
    issueTarget,
    payload,
    issueDraft,
    screenshotDataUrl: payload.screenshotDataUrl,
    workspaceId: project.workspaceId
  });

  logInfo("feedback_received", {
    request_id: requestId,
    project_id: project.publicKey,
    feedback_id: feedback.id,
    issue_provider: issueTarget.provider,
    has_screenshot: Boolean(feedback.screenshotAsset)
  });

  return NextResponse.json({
    id: feedback.id,
    status: "received",
    next: "issue_creation",
    project: {
      name: project.name,
      issueTarget: {
        provider: issueTarget.provider,
        namespace: issueTarget.namespace,
        project: issueTarget.project,
        webUrl: issueTarget.webUrl
      }
    },
    issueDraft
  }, { headers: { ...headers, "X-Request-Id": requestId } });
}

function checkRateLimit(key: string): { allowed: true } | { allowed: false; resetAt: number } {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    cleanupRateLimitBuckets(now);
    return { allowed: true };
  }

  if (bucket.count >= rateLimitMaxRequests) {
    return { allowed: false, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true };
}

function cleanupRateLimitBuckets(now: number): void {
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

function getClientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
