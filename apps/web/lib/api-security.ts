import { NextResponse } from "next/server";
import { requestOriginFrom } from "./request-origin";

const jsonContentTypes = ["application/json", "application/merge-patch+json"];

type PrivateTextFieldOptions = {
  maxLength: number;
  minLength?: number;
  name: string;
  required?: boolean;
};

type PrivateTextFieldResult =
  | { ok: true; value?: string }
  | { ok: false; error: string };

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

  return function methodNotAllowedHandler(_request: Request): NextResponse {
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

export function parsePrivateTextField(value: unknown, options: PrivateTextFieldOptions): PrivateTextFieldResult {
  if (value === undefined || value === null) {
    if (options.required) {
      return { ok: false, error: `${options.name} is required` };
    }

    return { ok: true };
  }

  if (typeof value !== "string") {
    return { ok: false, error: `${options.name} must be a string` };
  }

  const trimmed = value.trim();
  const minLength = options.minLength ?? (options.required ? 1 : 0);

  if (trimmed.length < minLength) {
    return { ok: false, error: `${options.name} is required` };
  }

  if (trimmed.length > options.maxLength) {
    return { ok: false, error: `${options.name} must be ${options.maxLength} characters or fewer` };
  }

  return { ok: true, value: trimmed };
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
