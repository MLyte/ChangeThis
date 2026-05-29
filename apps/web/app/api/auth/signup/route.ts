import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../lib/auth";
import { setInternalSessionCookieOnResponse, signUpWithInternalPassword } from "../../../../lib/internal-api";

export async function POST(request: Request) {
  const currentSession = await getCurrentSession(request);

  if (currentSession?.workspace) {
    return redirectTo(request, "/projects");
  }

  if (currentSession) {
    return redirectTo(request, "/signup/set-password");
  }

  const formData = await request.formData();
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const signUpResult = await signUpWithInternalPassword({
    email,
    password,
    workspaceName: workspaceNameFromEmail(email)
  });

  if (!signUpResult.ok) {
    return redirectTo(request, `/signup?error=${encodeURIComponent(signUpResult.error)}`);
  }

  const response = redirectTo(request, "/settings/connected-sites");
  setInternalSessionCookieOnResponse(response, signUpResult.accessToken);
  return response;
}

function redirectTo(request: Request, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, publicAppUrl(request)), { status: 303 });
}

function publicAppUrl(request: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? request.url;
}

function workspaceNameFromEmail(email: string): string {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  return domain ? `Espace ${domain}` : "Espace ChangeThis";
}
