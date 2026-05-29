import { NextResponse, type NextRequest } from "next/server";

const protectedPathPrefixes = [
  "/projects",
  "/settings"
];

export function proxy(request: NextRequest) {
  if (!protectedPathPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (isLocalAuthMode()) {
    return NextResponse.next();
  }

  if (isPublicAccessPaused()) {
    // During the app.changethis.dev public pause, avoid sending visitors to an
    // auth screen that may depend on paused Railway/Supabase services.
    return NextResponse.redirect(new URL("/", request.url));
  }

  const hasSession = Boolean(
    request.cookies.get("changethis_access_token")?.value
    ?? request.cookies.get("sb-access-token")?.value
    ?? request.cookies.get("supabase-auth-token")?.value
  );

  if (hasSession) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/projects/:path*",
    "/settings/:path*"
  ]
};

function isLocalAuthMode(): boolean {
  if (process.env.AUTH_MODE === "local" && process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production") {
    return true;
  }

  return !process.env.AUTH_MODE && process.env.NODE_ENV !== "production";
}

function isPublicAccessPaused(): boolean {
  const pauseFlag = process.env.PUBLIC_ACCESS_PAUSED?.trim().toLowerCase();
  return pauseFlag !== "false" && pauseFlag !== "0";
}
