import { NextResponse } from "next/server";
import { methodNotAllowed } from "../../../../lib/api-security";
import { getFeedbackRepository } from "../../../../lib/feedback-repository";
import { logInfo, logWarn, requestIdFrom } from "../../../../lib/logger";

const unsupportedMethod = methodNotAllowed(["GET", "POST"]);

export const PUT = unsupportedMethod;
export const PATCH = unsupportedMethod;
export const DELETE = unsupportedMethod;

export async function GET(request: Request) {
  return runStorageCleanup(request);
}

export async function POST(request: Request) {
  return runStorageCleanup(request);
}

async function runStorageCleanup(request: Request) {
  const requestId = requestIdFrom(request);
  const configuredSecret = process.env.CHANGETHIS_CRON_SECRET ?? process.env.CHANGETHIS_SECRET_KEY;

  if (!configuredSecret) {
    logWarn("storage_cleanup_unconfigured", { request_id: requestId });
    return NextResponse.json({ error: "Storage cleanup is not configured" }, { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (token !== configuredSecret) {
    logWarn("storage_cleanup_unauthorized", { request_id: requestId });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repository = getFeedbackRepository();
  if (!repository.cleanupScreenshotAssets) {
    return NextResponse.json({ archived: 0, deleted: 0 }, { headers: { "X-Request-Id": requestId } });
  }

  const result = await repository.cleanupScreenshotAssets();
  logInfo("storage_cleanup_completed", { request_id: requestId, ...result });

  return NextResponse.json(result, { headers: { "X-Request-Id": requestId } });
}
