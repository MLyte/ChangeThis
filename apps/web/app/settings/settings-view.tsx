import { redirect } from "next/navigation";
import { isAuthFailure, requireWorkspaceSession } from "../../lib/auth";
import { getFeedbackRepository } from "../../lib/feedback-repository";
import { listProviderIntegrationsAsync } from "../../lib/provider-integrations";
import { listProjectIssueAccesses } from "../../lib/project-issue-access";
import { installSnippet, listConfiguredProjects } from "../../lib/project-registry";
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
      redirect(`/login?next=${encodeURIComponent(settingsPath(section))}`);
    }

    redirect("/settings/account");
  }

  if (!session.workspace) {
    redirect("/signup/set-password");
  }

  const workspaceId = session.workspace.id;
  const canManageMembers = session.workspace.role === "admin" || session.workspace.role === "owner";
  const ownProjectAccesses = canManageMembers || section !== "connected-sites"
    ? []
    : await listProjectIssueAccesses({ workspaceId, userId: session.user.id });
  const canViewConnectedSites = canManageMembers || ownProjectAccesses.some((access) => access.status === "active");

  if (section === "git-connections" && !canManageMembers) {
    redirect("/settings/account");
  }

  if (section === "connected-sites" && !canViewConnectedSites) {
    redirect("/settings/account");
  }

  const shouldLoadSiteSettings = section === "connected-sites" && canViewConnectedSites;
  const allowedProjectKeys = new Set(ownProjectAccesses.filter((access) => access.status === "active").map((access) => access.projectKey));
  const projects = shouldLoadSiteSettings
    ? (await listConfiguredProjects(workspaceId)).filter((project) => canManageMembers || allowedProjectKeys.has(project.publicKey))
    : [];
  const feedbacks = shouldLoadSiteSettings ? await getFeedbackRepository().list({ workspaceId }) : [];
  const projectViews = await Promise.all(projects.map(async (project) => {
    const projectFeedbacks = feedbacks.filter((feedback) => feedback.projectKey === project.publicKey);
    const issueAccesses = canManageMembers
      ? await listProjectIssueAccesses({ workspaceId, projectKey: project.publicKey })
      : ownProjectAccesses.filter((access) => access.projectKey === project.publicKey);

    return {
      ...project,
      installSnippet: installSnippet(project),
      issueAccesses,
      metrics: {
        feedbacksReceived: projectFeedbacks.length,
        issuesCreated: projectFeedbacks.filter((feedback) => feedback.status === "sent_to_provider" || feedback.externalIssue).length,
        failedIssues: projectFeedbacks.filter((feedback) => feedback.status === "failed").length,
        lastFeedbackAt: projectFeedbacks[0]?.createdAt
      }
    };
  }));
  const providerIntegrations = canManageMembers ? await listProviderIntegrationsAsync(workspaceId) : [];

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
        <IssueDestinationSetup
          integrations={providerIntegrations}
          projects={projectViews}
          canManageMembers={canManageMembers}
          canViewConnectedSites={canViewConnectedSites}
          currentUserEmail={session.user.email}
          currentUserId={session.user.id}
          section={section}
        />
      </section>
      <AppFooter />
    </main>
  );
}

function settingsPath(section: SettingsSection): string {
  if (section === "git-connections") {
    return "/settings/git-connections";
  }

  if (section === "connected-sites") {
    return "/settings/connected-sites";
  }

  return "/settings/account";
}
