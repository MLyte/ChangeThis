import { redirect } from "next/navigation";
import { isAuthFailure, requireWorkspaceSession } from "../../lib/auth";
import { listProviderIntegrationsAsync } from "../../lib/provider-integrations";
import { listProjectIssueAccesses } from "../../lib/project-issue-access";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireWorkspaceSession();

  if (isAuthFailure(session)) {
    if (session.status === 401) {
      redirect(`/login?next=${encodeURIComponent("/settings")}`);
    }

    redirect("/settings/account");
  }

  if (!session.workspace) {
    redirect("/signup/set-password");
  }

  const canManageProjects = session.workspace.role === "admin" || session.workspace.role === "owner";
  const projectAccesses = await listProjectIssueAccesses({ userId: session.user.id });
  const hasSharedProjects = projectAccesses.some((access) => (
    access.status === "active"
    && access.workspaceId
    && access.workspaceId !== session.workspace?.id
  ));

  if (!canManageProjects) {
    redirect(projectAccesses.some((access) => access.status === "active")
      ? "/settings/connected-sites"
      : "/settings/account");
  }

  const integrations = await listProviderIntegrationsAsync(session.workspace.id);
  const hasActiveGitConnection = integrations.some((integration) => (
    integration.status === "connected"
    && integration.disabled !== true
    && integration.credentialConfigured
  ));

  redirect(hasActiveGitConnection || hasSharedProjects ? "/settings/connected-sites" : "/settings/git-connections");
}
