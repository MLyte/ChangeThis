import Link from "next/link";
import { forbidden, unauthorized } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, Inbox, RotateCcw, Send, Settings2, type LucideIcon } from "lucide-react";
import type { FeedbackStatus } from "@changethis/shared";
import { isAuthFailure, requireWorkspaceSession } from "../../lib/auth";
import type { ChangeThisProject } from "../../lib/demo-project";
import { getFeedbackRepository, type StoredFeedback } from "../../lib/feedback-repository";
import { listConfiguredProjects } from "../../lib/project-registry";
import { AppFooter } from "../app-footer";
import { AppHeader } from "../app-header";
import { T } from "../i18n";
import { ProviderBadge } from "../provider-badge";
import { FeedbackActions } from "./feedback-actions";
import { ScreenshotPreview } from "./screenshot-preview";

export const dynamic = "force-dynamic";

const statusLabelKeys: Record<FeedbackStatus, string> = {
  raw: "status.raw.long",
  issue_creation_pending: "status.issue_creation_pending.long",
  retrying: "status.retrying.long",
  sent_to_provider: "status.sent_to_provider.long",
  failed: "status.failed.long",
  ignored: "status.ignored.long"
};

const statusClasses: Record<FeedbackStatus, string> = {
  raw: "needs_setup",
  issue_creation_pending: "needs_setup",
  retrying: "needs_setup",
  sent_to_provider: "connected",
  failed: "failed",
  ignored: "muted"
};

const projectNavItems = [
  { href: "/projects", labelKey: "nav.issues" },
  { href: "/settings", labelKey: "nav.settings" }
];

export default async function ProjectsPage() {
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
  const activeFeedbacks = feedbacks.filter((feedback) => feedback.status !== "ignored");
  const pendingFeedbacks = feedbacks.filter((feedback) => feedback.status === "raw" || feedback.status === "retrying" || feedback.status === "failed");
  const queuedFeedbacks = feedbacks.filter((feedback) => feedback.status === "raw" || feedback.status === "issue_creation_pending");
  const retryFeedbacks = feedbacks.filter((feedback) => feedback.status === "retrying");
  const failedFeedbacks = feedbacks.filter((feedback) => feedback.status === "failed");
  const sentFeedbacks = feedbacks.filter((feedback) => feedback.status === "sent_to_provider");
  const ignoredFeedbacks = feedbacks.filter((feedback) => feedback.status === "ignored");
  const githubProjects = projects.filter((project) => project.issueTarget.provider === "github").length;
  const gitlabProjects = projects.filter((project) => project.issueTarget.provider === "gitlab").length;
  const latestFeedback = feedbacks.at(0);
  const readyProjects = projects.filter((project) => project.issueTarget.namespace && project.issueTarget.project).length;

  return (
    <main className="shell">
      <AppHeader
        navItems={projectNavItems}
        session={{
          email: session.user.email,
          isLocalMode: session.user.id === "local-dev-user"
        }}
      />

      <section className="dashboard dashboard-compact">
        <div className="dashboard-header dashboard-header-compact">
          <div className="dashboard-title-block">
            <p className="eyebrow"><T k="projects.eyebrow" /></p>
            <h1><T k="projects.title" /></h1>
          </div>
          <div className="dashboard-actions">
            <span className="dashboard-timestamp">
              <T k="projects.dashboard.updated" /> {latestFeedback ? formatDate(latestFeedback.createdAt) : "-"}
            </span>
            <Link className="button secondary-button" href="/settings/connected-sites">
              <Settings2 aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
              Sites
            </Link>
            <Link className="button light-button" href="/demo"><T k="projects.testFeedback" /></Link>
          </div>
        </div>

        <div className="dashboard-status-grid" aria-label="Synthèse opérationnelle">
          <StatusMetric icon={Inbox} label="À traiter" value={pendingFeedbacks.length} tone={pendingFeedbacks.length > 0 ? "warning" : "ok"} />
          <StatusMetric icon={Clock3} label="En file" value={queuedFeedbacks.length} tone="warning" />
          <StatusMetric icon={RotateCcw} label="Relances" value={retryFeedbacks.length} tone="warning" />
          <StatusMetric icon={AlertTriangle} label="Échecs" value={failedFeedbacks.length} tone="danger" />
          <StatusMetric icon={CheckCircle2} label="Créées" value={sentFeedbacks.length} tone="ok" />
        </div>

        <div className="dashboard-workbench compact-workbench">
          <section className="inbox-panel compact-inbox" id="issues" aria-labelledby="local-inbox-title">
            <div className="inbox-hero compact-inbox-header">
              <div>
                <p className="eyebrow"><T k="projects.inbox.eyebrow" /></p>
                <h2 id="local-inbox-title"><T k="projects.inbox.title" /></h2>
              </div>
              <div className="inbox-toolbar">
                <form action="/api/projects/retries" method="post">
                  <button className="button secondary-button" type="submit"><T k="projects.inbox.retryDue" /></button>
                </form>
                <Link className="button" href="/demo"><T k="projects.inbox.test" /></Link>
              </div>
            </div>

            {activeFeedbacks.length === 0 ? (
              <div className="empty-state compact-empty-state">
                <h2><T k="projects.empty.title" /></h2>
                <p><T k="projects.empty.copy" /></p>
                <Link className="button" href="/demo"><T k="projects.inbox.test" /></Link>
              </div>
            ) : (
              <div className="feedback-list" role="list" aria-label="Retours actifs">
                {activeFeedbacks.map((feedback) => <FeedbackCard feedback={feedback} key={feedback.id} />)}
              </div>
            )}
          </section>

          <aside className="dashboard-side-panel" aria-label="Contexte ChangeThis">
            <section className="side-panel-section">
              <div className="side-panel-heading">
                <p className="eyebrow">Routage</p>
                <h2>Sites connectés</h2>
              </div>
              <div className="route-summary">
                <strong>{readyProjects}/{projects.length}</strong>
                <span>sites prêts à créer des issues</span>
              </div>
              <div className="provider-split">
                <ProviderCount provider="github" count={githubProjects} />
                <ProviderCount provider="gitlab" count={gitlabProjects} />
              </div>
              <div className="site-route-list">
                {projects.map((project) => <ProjectRouteRow key={project.publicKey} project={project} />)}
              </div>
              <Link className="button secondary-button full-width-button" href="/settings/connected-sites">
                Configurer les sites
              </Link>
            </section>

            <section className="side-panel-section">
              <div className="side-panel-heading">
                <p className="eyebrow">Signal</p>
                <h2>Activité</h2>
              </div>
              <div className="activity-stack">
                <ActivityItem label="Dernier retour" value={latestFeedback ? formatDate(latestFeedback.createdAt) : "—"} />
                <ActivityItem label="Archivés" value={ignoredFeedbacks.length} />
                <ActivityItem label="Total reçus" value={feedbacks.length} />
              </div>
            </section>
          </aside>
        </div>
      </section>
      <AppFooter />
    </main>
  );
}

function StatusMetric({ icon: Icon, label, tone, value }: { icon: LucideIcon; label: string; tone: "ok" | "warning" | "danger"; value: number }) {
  return (
    <article className={`status-metric ${tone}`}>
      <Icon aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ProviderCount({ count, provider }: { count: number; provider: "github" | "gitlab" }) {
  return (
    <div>
      <ProviderBadge provider={provider} />
      <strong>{count}</strong>
    </div>
  );
}

function ProjectRouteRow({ project }: { project: ChangeThisProject }) {
  return (
    <article className="site-route-row">
      <div>
        <strong>{project.name}</strong>
        <span>{project.issueTarget.namespace}/{project.issueTarget.project}</span>
      </div>
      <ProviderBadge provider={project.issueTarget.provider} />
    </article>
  );
}

function ActivityItem({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="activity-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FeedbackCard({ feedback }: { feedback: StoredFeedback }) {
  const draftLabels = feedback.issueDraft.labels.join(" / ");
  const viewport = `${feedback.payload.metadata.viewport.width} x ${feedback.payload.metadata.viewport.height}`;
  const hasRetry = feedback.status === "retrying" && feedback.nextRetryAt;

  return (
    <article className={`feedback-card compact-feedback-row ${feedback.status}`} role="listitem">
      <div className="feedback-status-rail">
        <span className={`status-dot ${feedback.status}`} aria-hidden="true" />
      </div>
      <div className="feedback-main">
        <div className="feedback-tags" aria-label="Métadonnées du feedback">
          <span className="status-badge connected">{feedback.payload.type}</span>
          <span className={`status-badge ${statusClasses[feedback.status]}`}>
            <T k={statusLabelKeys[feedback.status]} />
          </span>
          <ProviderBadge provider={feedback.issueTarget.provider} />
        </div>
        <h2>{feedback.issueDraft.title}</h2>
        <p>{feedback.payload.message || <T k="projects.feedback.noMessage" />}</p>
        {feedback.lastError ? (
          <div className="error-callout compact-callout">
            <strong><T k="projects.feedback.issueError" /></strong>
            <span>{feedback.lastError}</span>
          </div>
        ) : null}
        {hasRetry ? (
          <div className="retry-callout compact-callout">
            <T k="projects.feedback.nextRetry" />: {formatDate(feedback.nextRetryAt as string)}
          </div>
        ) : null}
        <div className="feedback-meta">
          <span>{feedback.projectName}</span>
          <span>{feedback.payload.metadata.path}</span>
          <span>{viewport}</span>
          <span>{formatDate(feedback.createdAt)}</span>
        </div>
      </div>
      <div className="issue-draft compact-issue-draft">
        <div>
          <p className="eyebrow"><T k="projects.feedback.draft" /></p>
          <strong>{feedback.issueTarget.namespace}/{feedback.issueTarget.project}</strong>
        </div>
        <span>{draftLabels}</span>
        {feedback.payload.pin ? <span>Pin: {Math.round(feedback.payload.pin.x)}, {Math.round(feedback.payload.pin.y)}</span> : null}
        <a className="inline-link" href={feedback.issueTarget.webUrl ?? "#"}>
          <T k="projects.feedback.destination" />
        </a>
      </div>
      <div className="compact-preview-cell">
        {feedback.screenshotAsset ? (
          <ScreenshotPreview
            asset={feedback.screenshotAsset}
            metadata={feedback.payload.metadata}
            pin={feedback.payload.pin}
          />
        ) : (
          <span className="no-preview">Sans capture</span>
        )}
      </div>
      <FeedbackActions
        externalIssueUrl={feedback.externalIssue?.url}
        feedbackId={feedback.id}
        status={feedback.status}
      />
    </article>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-BE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
