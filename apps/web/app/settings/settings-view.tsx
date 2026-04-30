import { forbidden, unauthorized } from "next/navigation";
import { isAuthFailure, requireWorkspaceSession } from "../../lib/auth";
import { getFeedbackRepository } from "../../lib/feedback-repository";
import { listProviderIntegrations } from "../../lib/provider-integrations";
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
      unauthorized();
    }

    forbidden();
  }

  if (!session.workspace) {
    forbidden();
  }

  const workspaceId = session.workspace.id;
  const projects = await listConfiguredProjects(workspaceId);
  const feedbacks = await getFeedbackRepository().list({ workspaceId });
  const projectViews = projects.map((project) => {
    const projectFeedbacks = feedbacks.filter((feedback) => feedback.projectKey === project.publicKey);
    return {
      ...project,
      installSnippet: installSnippet(project.publicKey),
      metrics: {
        feedbacksReceived: projectFeedbacks.length,
        issuesCreated: projectFeedbacks.filter((feedback) => feedback.status === "sent_to_provider" || feedback.externalIssue).length,
        failedIssues: projectFeedbacks.filter((feedback) => feedback.status === "failed").length,
        lastFeedbackAt: projectFeedbacks[0]?.createdAt
      }
    };
  });
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
        <IssueDestinationSetup integrations={providerIntegrations} projects={projectViews} section={section} />
      </section>
      <AppFooter />
    </main>
  );
}
