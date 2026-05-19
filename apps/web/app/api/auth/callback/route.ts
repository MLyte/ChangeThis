import { NextResponse } from "next/server";
import { setSupabaseSessionCookies } from "../../../../lib/auth-session-cookies";
import { verifySupabaseOtpTokenHash } from "../../../../lib/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");

  if (error) {
    const nextPath = sanitizeNextPath(url.searchParams.get("next"));
    const safeError = encodeURIComponent(error);
    return NextResponse.redirect(publicRedirectUrl(request, `/login?error=${safeError}&next=${encodeURIComponent(nextPath)}`));
  }

  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token");
  const expiresIn = parseInt(url.searchParams.get("expires_in") ?? "", 10);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") ?? "";
  const nextPath = sanitizeNextPath(url.searchParams.get("next"));

  if (tokenHash) {
    const verifyResult = await verifySupabaseOtpTokenHash({
      tokenHash,
      type
    });

    if (!verifyResult.ok) {
      return NextResponse.redirect(publicRedirectUrl(request, `/login?error=${encodeURIComponent(verifyResult.error)}&next=${encodeURIComponent(nextPath)}`));
    }

    return createAuthRedirectResponse(
      request,
      nextPath,
      verifyResult.accessToken,
      verifyResult.refreshToken ?? null,
      verifyResult.expiresIn ?? Number.NaN
    );
  }

  if (!accessToken) {
    return NextResponse.redirect(publicRedirectUrl(request, `/login?error=missing_token&next=${encodeURIComponent(nextPath)}`));
  }

  const response = createAuthRedirectResponse(request, nextPath, accessToken, refreshToken, expiresIn);
  return response;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let body: {
    accessToken?: unknown;
    refreshToken?: unknown;
    expiresIn?: unknown;
    tokenHash?: unknown;
    type?: unknown;
    next?: unknown;
  };

  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_callback" }, { status: 400 });
  }

  let accessToken = typeof body.accessToken === "string" ? body.accessToken : "";
  let refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : null;
  let expiresIn = typeof body.expiresIn === "string"
    ? parseInt(body.expiresIn, 10)
    : typeof body.expiresIn === "number"
      ? body.expiresIn
      : Number.NaN;
  const tokenHash = typeof body.tokenHash === "string" ? body.tokenHash : "";
  const type = typeof body.type === "string" ? body.type : "";
  const nextPath = sanitizeNextPath(typeof body.next === "string" ? body.next : null);

  if (!accessToken && tokenHash) {
    const verifyResult = await verifySupabaseOtpTokenHash({
      tokenHash,
      type
    });

    if (!verifyResult.ok) {
      return NextResponse.json({ error: verifyResult.error }, { status: 400 });
    }

    accessToken = verifyResult.accessToken;
    refreshToken = verifyResult.refreshToken ?? null;
    expiresIn = verifyResult.expiresIn ?? Number.NaN;
  }

  if (!accessToken) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const response = NextResponse.json({ redirectTo: nextPath });
  setAuthCookies(response, accessToken, refreshToken, expiresIn);
  return response;
}

function createAuthRedirectResponse(request: Request, nextPath: string, accessToken: string, refreshToken: string | null, expiresIn: number) {
  const response = NextResponse.redirect(publicRedirectUrl(request, nextPath));
  setAuthCookies(response, accessToken, refreshToken, expiresIn);
  return response;
}

function publicRedirectUrl(request: Request, path: string): URL {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (configuredAppUrl) {
    return new URL(path, configuredAppUrl);
  }

  return new URL(path, request.url);
}

function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string | null, expiresIn: number) {
  setSupabaseSessionCookies({
    cookieStore: response.cookies,
    accessToken,
    refreshToken,
    expiresIn
  });
}

function sanitizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/projects";
  }

  return value;
}
