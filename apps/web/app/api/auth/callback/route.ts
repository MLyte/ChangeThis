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

  const response = NextResponse.redirect(new URL(nextPath, url));
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

  return response;
}

function sanitizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/projects";
  }

  return value;
}

