import { NextResponse } from "next/server";
import { saveProviderCredentialSecretAsync } from "../../../../../lib/credential-store";
import { decodeProviderConnectState, normalizeProviderReturnTo, recordProviderConnection } from "../../../../../lib/provider-integrations";
import { insertProviderCredentialMetadata } from "../../../../../lib/supabase-server";

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

    const storageReference = await saveProviderCredentialSecretAsync({
      workspaceId: state.workspaceId,
      provider: "github",
      integrationId: state.integrationId,
      kind: "installation_id",
      value: installationId
    });

    await insertProviderCredentialMetadata({
      integrationId: state.integrationId,
      credentialKind: "github_app_installation",
      storageReference,
      displayName: `GitHub App installation ${installationId}`
    });

    redirectUrl.searchParams.set("setup", "github_app_connected");
  } else {
    redirectUrl.searchParams.set("setup", "github_app_callback_invalid");
  }

  return NextResponse.redirect(redirectUrl);
}
