import { NextResponse } from "next/server";
import { authFailureResponse, isAuthFailure, requireWorkspaceRole, requireWorkspaceSession } from "../../../../../lib/auth";
import { getProviderConnectUrl, isIssueProvider, normalizeProviderReturnTo } from "../../../../../lib/provider-integrations";

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const session = requireWorkspaceRole(await requireWorkspaceSession(request), "admin");

  if (isAuthFailure(session)) {
    return authFailureResponse(session);
  }

  const { provider } = await context.params;
  const url = new URL(request.url);
  const returnTo = normalizeProviderReturnTo(url.searchParams.get("returnTo") ?? "/projects");

  if (!isIssueProvider(provider)) {
    return NextResponse.json({ error: "Unknown issue provider" }, { status: 404 });
  }

  const connectUrl = getProviderConnectUrl(provider, request.url, returnTo);

  if (!connectUrl) {
    const fallback = new URL(returnTo, request.url);
    fallback.searchParams.set("provider", provider);
    fallback.searchParams.set("setup", "manual");
    return NextResponse.redirect(fallback);
  }

  return NextResponse.redirect(connectUrl);
}
