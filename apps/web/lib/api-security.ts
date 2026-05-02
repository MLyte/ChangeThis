import { NextResponse } from "next/server";
import { requestOriginFrom } from "./request-origin";

const jsonContentTypes = ["application/json", "application/merge-patch+json"];

export function requirePrivateMutationOrigin(request: Request): NextResponse | undefined {
  const expectedOrigin = appOrigin();
  const requestOrigin = requestOriginFrom(request);

  if (!expectedOrigin) {
    return undefined;
  }

  if (!requestOrigin || requestOrigin !== expectedOrigin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  return undefined;
}

export function requireJsonRequest(request: Request): NextResponse | undefined {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (jsonContentTypes.some((candidate) => contentType.includes(candidate))) {
    return undefined;
  }

  return NextResponse.json({ error: "Content-Type application/json is required" }, { status: 415 });
}

export function methodNotAllowed(allowedMethods: readonly string[]) {
  const allow = allowedMethods.join(", ");

  return function methodNotAllowedHandler(_request?: Request): NextResponse {
    return NextResponse.json(
      { error: "Method not allowed" },
      {
        status: 405,
        headers: {
          Allow: allow
        }
      }
    );
  };
}

export function appOrigin(): string | undefined {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return undefined;
  }

  try {
    return new URL(appUrl).origin;
  } catch {
    return undefined;
  }
}
