import { NextResponse } from "next/server";
import { saveProviderCredentialSecretAsync } from "../../../../../lib/credential-store";
import { decodeProviderConnectState, normalizeProviderReturnTo, recordProviderConnection } from "../../../../../lib/provider-integrations";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = decodeProviderConnectState(url.searchParams.get("state"));
  const returnTo = normalizeProviderReturnTo(state?.returnTo ?? "/projects");
  const redirectUrl = new URL(returnTo, request.url);

  redirectUrl.searchParams.set("provider", "github");

  const installationId = url.searchParams.get("installation_id");
  if (state?.provider === "github" && installationId) {
    await recordProviderConnection({
      workspaceId: state.workspaceId,
      provider: "github",
      integrationId: state.integrationId,
      installationId
    });

    await saveProviderCredentialSecretAsync({
      workspaceId: state.workspaceId,
      provider: "github",
      integrationId: state.integrationId,
      kind: "installation_id",
      value: installationId
    });

    redirectUrl.searchParams.set("setup", "github_app_connected");
  } else {
    redirectUrl.searchParams.set("setup", "github_app_callback_invalid");
  }

  return NextResponse.redirect(redirectUrl);
}
