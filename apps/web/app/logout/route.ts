import { NextResponse } from "next/server";

const authCookieNames = [
  "changethis_access_token",
  "sb-access-token",
  "supabase-auth-token"
];

export async function GET(request: Request) {
  return logout(request);
}

export async function POST(request: Request) {
  return logout(request);
}

function logout(request: Request) {
  const url = new URL(request.url);
  const nextPath = sanitizeNextPath(url.searchParams.get("next"));
  const response = NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(nextPath)}`, url));

  for (const cookieName of authCookieNames) {
    response.cookies.delete(cookieName);
  }

  return response;
}

function sanitizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/projects";
  }

  return value;
}
