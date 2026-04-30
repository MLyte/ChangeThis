import { NextResponse } from "next/server";
import { saveProviderCredentialSecret } from "../../../../../lib/credential-store";
import { decodeProviderConnectState, normalizeProviderReturnTo } from "../../../../../lib/provider-integrations";
import { insertProviderCredentialMetadata } from "../../../../../lib/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = decodeProviderConnectState(url.searchParams.get("state"));
  const returnTo = normalizeProviderReturnTo(state?.returnTo ?? "/projects");
  const redirectUrl = new URL(returnTo, request.url);

  redirectUrl.searchParams.set("provider", "gitlab");

  const code = url.searchParams.get("code");
  if (state?.provider === "gitlab" && code) {
    const token = await exchangeGitLabCode(code, state.callbackUrl);

    if (!token) {
      redirectUrl.searchParams.set("setup", "gitlab_oauth_exchange_unavailable");
      return NextResponse.redirect(redirectUrl);
    }

    const storageReference = saveProviderCredentialSecret({
      workspaceId: state.workspaceId,
      provider: "gitlab",
      integrationId: state.integrationId,
      kind: "access_token",
      value: token.accessToken,
      expiresAt: token.expiresAt,
      scopes: token.scope ? token.scope.split(" ") : ["api", "read_user"]
    });

    await insertProviderCredentialMetadata({
      integrationId: state.integrationId,
      credentialKind: "oauth_token",
      storageReference,
      displayName: "GitLab OAuth token",
      scopes: token.scope ? token.scope.split(" ") : ["api", "read_user"],
      expiresAt: token.expiresAt
    });

    if (token.refreshToken) {
      saveProviderCredentialSecret({
        workspaceId: state.workspaceId,
        provider: "gitlab",
        integrationId: state.integrationId,
        kind: "refresh_token",
        value: token.refreshToken,
        expiresAt: token.expiresAt
      });
    }

    redirectUrl.searchParams.set("setup", "gitlab_oauth_connected");
  } else {
    redirectUrl.searchParams.set("setup", "gitlab_oauth_callback_invalid");
  }

  return NextResponse.redirect(redirectUrl);
}

async function exchangeGitLabCode(code: string, redirectUri: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scope?: string;
} | undefined> {
  const appId = process.env.GITLAB_OAUTH_APP_ID;
  const appSecret = process.env.GITLAB_OAUTH_APP_SECRET;
  const baseUrl = process.env.GITLAB_BASE_URL ?? "https://gitlab.com";

  if (!appId || !appSecret) {
    return undefined;
  }

  const response = await fetch(new URL("/oauth/token", baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  });

  const body = await response.json() as {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
    scope?: unknown;
  };

  if (!response.ok || typeof body.access_token !== "string") {
    return undefined;
  }

  const expiresAt = typeof body.expires_in === "number"
    ? new Date(Date.now() + body.expires_in * 1000).toISOString()
    : undefined;

  return {
    accessToken: body.access_token,
    refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : undefined,
    expiresAt,
    scope: typeof body.scope === "string" ? body.scope : undefined
  };
}
