import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../lib/auth";
import { setInternalSessionCookieOnResponse, signInWithInternalPassword } from "../../../../lib/internal-api";

export async function POST(request: Request) {
  const formData = await request.formData();
  const targetPath = sanitizeNextPath(formData.get("next")?.toString());
  const currentSession = await getCurrentSession(request);

  if (currentSession?.workspace) {
    return redirectTo(request, targetPath);
  }

  if (currentSession) {
    return redirectTo(request, "/signup/set-password");
  }

  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString().trim() ?? "";
  const signInResult = await signInWithInternalPassword({ email, password });

  if (!signInResult.ok) {
    return redirectTo(request, `/login?error=${encodeURIComponent(signInResult.error)}&next=${encodeURIComponent(targetPath)}`);
  }

  const response = redirectTo(request, targetPath);
  setInternalSessionCookieOnResponse(response, signInResult.accessToken);
  return response;
}

function redirectTo(request: Request, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, publicAppUrl(request)), { status: 303 });
}

function publicAppUrl(request: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? request.url;
}

function sanitizeNextPath(value?: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/login") || value.startsWith("/logout")) {
    return "/projects";
  }

  return value;
}
