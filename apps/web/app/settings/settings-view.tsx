import { forbidden, unauthorized } from "next/navigation";
import { isAuthFailure, requireWorkspaceSession } from "../../lib/auth";
import { listProviderIntegrations } from "../../lib/provider-integrations";
import { listConfiguredProjects } from "../../lib/project-registry";
import { AppFooter } from "../app-footer";
import { AppHeader } from "../app-header";
import { IssueDestinationSetup, type SettingsSection } from "../projects/issue-destination-setup";

const settingsNavItems = [
  { href: "/projects", labelKey: "nav.issues" },
  { href: "/settings", labelKey: "nav.settings" }
];

export async function SettingsView({ section }: { section: SettingsSection }) {
  const session = await requireWorkspaceSession();

  if (isAuthFailure(session)) {
    if (session.status === 401) {
      unauthorized();
    }

    forbidden();
  }

  if (!session.workspace) {
    forbidden();
  }

  const workspaceId = session.workspace.id;
  const projects = await listConfiguredProjects(workspaceId);
  const providerIntegrations = listProviderIntegrations();

  return (
    <main className="shell">
      <AppHeader
        navItems={settingsNavItems}
        session={{
          email: session.user.email,
          isLocalMode: session.user.id === "local-dev-user"
        }}
      />
      <section className="dashboard">
        <IssueDestinationSetup integrations={providerIntegrations} projects={projects} section={section} />
      </section>
      <AppFooter />
    </main>
  );
}
