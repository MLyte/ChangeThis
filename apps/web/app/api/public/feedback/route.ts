import { buildIssueDraft, validateFeedbackPayload } from "@changethis/shared";
import { NextResponse } from "next/server";
import { findProjectByKey, isKnownOrigin } from "../../../../lib/demo-project";
import { recordFeedback } from "../../../../lib/feedback-store";

const maxBodyBytes = 2_500_000;
const maxScreenshotBytes = 2_000_000;
const rateLimitWindowMs = 60_000;
const rateLimitMaxRequests = 20;

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function corsHeaders(origin: string | null): HeadersInit {
  if (!isKnownOrigin(origin)) {
    return {};
  }

  const allowedOrigin = origin;
  if (!allowedOrigin) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: isKnownOrigin(origin) ? 204 : 403,
    headers: corsHeaders(origin)
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);
  const contentLength = request.headers.get("content-length");

  if (contentLength && Number(contentLength) > maxBodyBytes) {
    return NextResponse.json({ error: "Payload is too large" }, { status: 413, headers });
  }

  let rawPayload: unknown;

  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400, headers });
  }

  const validation = validateFeedbackPayload(rawPayload, { maxScreenshotBytes });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 422, headers });
  }

  const payload = validation.value;
  const project = findProjectByKey(payload.projectKey);

  if (!project) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404, headers });
  }

  if (!origin || !project.allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: "Origin is not allowed for this project" }, { status: 403, headers });
  }

  const rateLimit = checkRateLimit(`${getClientKey(request)}:${payload.projectKey}`);
  if (!rateLimit.allowed) {
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
  const feedback = recordFeedback({
    id: crypto.randomUUID(),
    project,
    payload,
    issueDraft
  });

  return NextResponse.json({
    id: feedback.id,
    status: feedback.status,
    next: "issue_creation",
    project: {
      name: project.name,
      issueTarget: {
        provider: project.issueTarget.provider,
        namespace: project.issueTarget.namespace,
        project: project.issueTarget.project,
        webUrl: project.issueTarget.webUrl
      }
    },
    issueDraft
  }, { headers });
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
