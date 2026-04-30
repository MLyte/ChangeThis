import { NextResponse, type NextRequest } from "next/server";

const protectedPathPrefixes = [
  "/projects",
  "/settings"
];

export function middleware(request: NextRequest) {
  if (!protectedPathPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (isLocalAuthMode()) {
    return NextResponse.next();
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
