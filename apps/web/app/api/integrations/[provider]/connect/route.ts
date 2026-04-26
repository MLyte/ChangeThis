import type { IssueProvider } from "@changethis/shared";
import { NextResponse } from "next/server";

const providers: IssueProvider[] = ["github", "gitlab"];

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params;
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/projects";

  if (!isIssueProvider(provider)) {
    return NextResponse.json({ error: "Unknown issue provider" }, { status: 404 });
  }

  const connectUrl = getProviderConnectUrl(provider, request.url);

  if (!connectUrl) {
    const fallback = new URL(returnTo, request.url);
    fallback.searchParams.set("provider", provider);
    fallback.searchParams.set("setup", "manual");
    return NextResponse.redirect(fallback);
  }

  return NextResponse.redirect(connectUrl);
}

function isIssueProvider(value: string): value is IssueProvider {
  return providers.includes(value as IssueProvider);
}

function getProviderConnectUrl(provider: IssueProvider, requestUrl: string): string | undefined {
  if (provider === "github") {
    return getGitHubConnectUrl();
  }

  return getGitLabConnectUrl(requestUrl);
}

function getGitHubConnectUrl(): string | undefined {
  const appSlug = process.env.GITHUB_APP_SLUG;

  if (!appSlug) {
    return undefined;
  }

  return `https://github.com/apps/${appSlug}/installations/new`;
}

function getGitLabConnectUrl(requestUrl: string): string | undefined {
  const appId = process.env.GITLAB_OAUTH_APP_ID;
  const baseUrl = process.env.GITLAB_BASE_URL ?? "https://gitlab.com";

  if (!appId) {
    return undefined;
  }

  const redirectUri = new URL("/api/integrations/gitlab/callback", requestUrl);
  const oauthUrl = new URL("/oauth/authorize", baseUrl);
  oauthUrl.searchParams.set("client_id", appId);
  oauthUrl.searchParams.set("redirect_uri", redirectUri.toString());
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("scope", "api read_user");
  return oauthUrl.toString();
}
