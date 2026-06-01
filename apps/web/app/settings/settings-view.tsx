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
  const ownProjectAccesses = section !== "connected-sites"
    ? []
    : await listProjectIssueAccesses({ userId: session.user.id });
  const sharedProjectAccesses = ownProjectAccesses.filter((access) => (
    access.status === "active"
    && access.workspaceId
    && access.workspaceId !== workspaceId
  ));
  const canViewConnectedSites = canManageMembers || ownProjectAccesses.some((access) => access.status === "active");

  if (section === "git-connections" && !canManageMembers) {
    redirect("/settings/account");
  }

  if (section === "connected-sites" && !canViewConnectedSites) {
    redirect("/settings/account");
  }

  const shouldLoadSiteSettings = section === "connected-sites" && canViewConnectedSites;
  const projectGroups = shouldLoadSiteSettings
    ? canManageMembers
      ? [
          { workspaceId, projects: await listConfiguredProjects(workspaceId) },
          ...await sharedProjectGroups(sharedProjectAccesses)
        ]
      : await sharedProjectGroups(ownProjectAccesses)
    : [];
  const projects = projectGroups.flatMap((group) => group.projects);
  const feedbackGroups = shouldLoadSiteSettings
    ? await Promise.all(projectGroups.map(async (group) => ({
        workspaceId: group.workspaceId,
        feedbacks: await getFeedbackRepository().list({ workspaceId: group.workspaceId })
      })))
    : [];
  const projectViews = await Promise.all(projects.map(async (project) => {
    const projectWorkspaceId = project.workspaceId ?? workspaceId;
    const feedbacks = feedbackGroups.find((group) => group.workspaceId === projectWorkspaceId)?.feedbacks ?? [];
    const projectFeedbacks = feedbacks.filter((feedback) => feedback.projectKey === project.publicKey);
    const issueAccesses = canManageMembers && projectWorkspaceId === workspaceId
      ? await listProjectIssueAccesses({ workspaceId: projectWorkspaceId, projectKey: project.publicKey })
      : ownProjectAccesses.filter((access) => access.workspaceId === projectWorkspaceId && access.projectKey === project.publicKey);

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

async function sharedProjectGroups(accesses: Awaited<ReturnType<typeof listProjectIssueAccesses>>) {
  const activeAccesses = accesses.filter((access) => access.status === "active" && access.workspaceId);
  const workspaceIds = [...new Set(activeAccesses.map((access) => access.workspaceId).filter((id): id is string => Boolean(id)))];

  return Promise.all(workspaceIds.map(async (workspaceId) => {
    const allowedKeys = new Set(activeAccesses
      .filter((access) => access.workspaceId === workspaceId)
      .map((access) => access.projectKey));

    return {
      workspaceId,
      accesses: activeAccesses.filter((access) => access.workspaceId === workspaceId),
      projects: (await listConfiguredProjects(workspaceId)).filter((project) => allowedKeys.has(project.publicKey))
    };
  }));
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
