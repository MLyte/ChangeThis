import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");

  if (error) {
    const nextPath = sanitizeNextPath(url.searchParams.get("next"));
    const safeError = encodeURIComponent(error);
    return NextResponse.redirect(new URL(`/login?error=${safeError}&next=${encodeURIComponent(nextPath)}`, url));
  }

  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token");
  const expiresIn = parseInt(url.searchParams.get("expires_in") ?? "", 10);
  const nextPath = sanitizeNextPath(url.searchParams.get("next"));

  if (!accessToken) {
    return NextResponse.redirect(new URL(`/login?error=missing_token&next=${encodeURIComponent(nextPath)}`, url));
  }

  const response = createAuthRedirectResponse(url, nextPath, accessToken, refreshToken, expiresIn);
  return response;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let body: {
    accessToken?: unknown;
    refreshToken?: unknown;
    expiresIn?: unknown;
    next?: unknown;
  };

  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_callback" }, { status: 400 });
  }

  const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";
  const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : null;
  const expiresIn = typeof body.expiresIn === "string"
    ? parseInt(body.expiresIn, 10)
    : typeof body.expiresIn === "number"
      ? body.expiresIn
      : Number.NaN;
  const nextPath = sanitizeNextPath(typeof body.next === "string" ? body.next : null);

  if (!accessToken) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const response = NextResponse.json({ redirectTo: nextPath });
  setAuthCookies(response, accessToken, refreshToken, expiresIn);
  return response;
}

function createAuthRedirectResponse(url: URL, nextPath: string, accessToken: string, refreshToken: string | null, expiresIn: number) {
  const response = NextResponse.redirect(new URL(nextPath, url));
  setAuthCookies(response, accessToken, refreshToken, expiresIn);
  return response;
}

function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string | null, expiresIn: number) {
  const maxAge = Number.isFinite(expiresIn) && expiresIn > 0
    ? expiresIn
    : 60 * 60;

  const cookieConfig = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge
  };

  response.cookies.set("changethis_access_token", accessToken, cookieConfig);
  response.cookies.set("supabase-auth-token", accessToken, cookieConfig);

  if (refreshToken) {
    response.cookies.set("supabase-refresh-token", refreshToken, {
      ...cookieConfig,
      maxAge: 60 * 60 * 24 * 30
    });
  }
}

function sanitizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/projects";
  }

  return value;
}
