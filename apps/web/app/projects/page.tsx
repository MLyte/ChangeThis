import Link from "next/link";
import { forbidden, unauthorized } from "next/navigation";
import type { FeedbackStatus } from "@changethis/shared";
import { isAuthFailure, requireWorkspaceSession } from "../../lib/auth";
import { getFeedbackRepository, type StoredFeedback } from "../../lib/feedback-repository";
import { listConfiguredProjects } from "../../lib/project-registry";
import { AppFooter } from "../app-footer";
import { AppHeader } from "../app-header";
import { T } from "../i18n";
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

  return (
    <main className="shell">
      <AppHeader
        navItems={projectNavItems}
        session={{
          email: session.user.email,
          isLocalMode: session.user.id === "local-dev-user"
        }}
      />

      <section className="dashboard">
        <div className="dashboard-header">
          <div>
            <p className="eyebrow"><T k="projects.eyebrow" /></p>
            <h1><T k="projects.title" /></h1>
            <p className="lede">
              <T k="projects.lede" />
            </p>
          </div>
          <div className="dashboard-actions">
            <span className="dashboard-timestamp">
              <T k="projects.dashboard.updated" /> {latestFeedback ? formatDate(latestFeedback.createdAt) : "-"}
            </span>
            <Link className="button light-button" href="/demo"><T k="projects.testFeedback" /></Link>
          </div>
        </div>

        <section className="ops-strip" aria-label="État production">
          <div>
            <span>{projects.length}</span>
            <strong><T k="projects.ops.sites" /></strong>
          </div>
          <div>
            <span>{githubProjects}</span>
            <strong><T k="projects.ops.github" /></strong>
          </div>
          <div>
            <span>{gitlabProjects}</span>
            <strong><T k="projects.ops.gitlab" /></strong>
          </div>
          <div>
            <span>{feedbacks.length}</span>
            <strong><T k="projects.ops.feedbacks" /></strong>
          </div>
        </section>

        <div className="metric-grid" aria-label="Synthèse de l'inbox">
          <MetricCard labelKey="projects.metric.pending" value={pendingFeedbacks.length} tone={pendingFeedbacks.length > 0 ? "warning" : "ok"} />
          <MetricCard labelKey="projects.metric.queued" value={queuedFeedbacks.length} tone="warning" />
          <MetricCard labelKey="projects.metric.retries" value={retryFeedbacks.length} tone="warning" />
          <MetricCard labelKey="projects.metric.failed" value={failedFeedbacks.length} tone="danger" />
          <MetricCard labelKey="projects.metric.sent" value={sentFeedbacks.length} tone="ok" />
        </div>

        <div className="dashboard-workbench">
          <section className="operations-panel" aria-labelledby="signals-title">
            <div className="setup-heading">
              <div>
                <p className="eyebrow"><T k="projects.signals.eyebrow" /></p>
                <h2 id="signals-title"><T k="projects.signals.title" /></h2>
              </div>
            </div>
            <div className="ops-grid">
              <SignalCard
                labelKey="projects.signals.queue"
                value={activeFeedbacks.length}
                detailKey="projects.signals.queue.copy"
              />
              <SignalCard
                labelKey="projects.signals.latest"
                value={latestFeedback ? formatDate(latestFeedback.createdAt) : "—"}
                detailKey={latestFeedback ? "projects.signals.latest.copy" : "projects.signals.latest.empty"}
              />
              <SignalCard
                labelKey="projects.signals.routing"
                value={`${githubProjects}/${gitlabProjects}`}
                detailKey="projects.signals.routing.copy"
              />
              <SignalCard
                labelKey="projects.signals.archive"
                value={ignoredFeedbacks.length}
                detailKey="projects.signals.archive.copy"
              />
            </div>
          </section>

        <section className="inbox-panel" id="issues" aria-labelledby="local-inbox-title">
          <div className="inbox-hero">
            <div>
              <p className="eyebrow"><T k="projects.inbox.eyebrow" /></p>
              <h2 id="local-inbox-title"><T k="projects.inbox.title" /></h2>
              <p className="lede">
                <T k="projects.inbox.copy" />
              </p>
            </div>
            <div className="inbox-summary" aria-label="État de l'inbox">
              <strong>{pendingFeedbacks.length}</strong>
              <span><T k="projects.inbox.pending" /></span>
            </div>
          </div>

          <div className="inbox-toolbar">
            <a className="button" href="/demo"><T k="projects.inbox.test" /></a>
            <form action="/api/projects/retries" method="post">
              <button className="button secondary-button" type="submit"><T k="projects.inbox.retryDue" /></button>
            </form>
          </div>

          {activeFeedbacks.length === 0 ? (
            <div className="empty-state">
              <h2><T k="projects.empty.title" /></h2>
              <p>
                <T k="projects.empty.copy" />
              </p>
              <Link className="button" href="/demo"><T k="projects.inbox.test" /></Link>
            </div>
          ) : (
            <>
              <div className="queue-strip">
                <div className="ops-card">
                  <h3><T k="projects.queue.new" /></h3>
                  <p>{queuedFeedbacks.length} <T k="projects.queue.new.copy" /></p>
                </div>
                <div className="ops-card">
                  <h3><T k="projects.queue.recovery" /></h3>
                  <p>{retryFeedbacks.length + failedFeedbacks.length} <T k="projects.queue.recovery.copy" /></p>
                </div>
                <div className="ops-card">
                  <h3><T k="projects.queue.done" /></h3>
                  <p>{sentFeedbacks.length} <T k="projects.queue.done.copy" /></p>
                </div>
              </div>
              {activeFeedbacks.map((feedback) => <FeedbackCard feedback={feedback} key={feedback.id} />)}
            </>
          )}
        </section>

        <section className="operations-panel" aria-labelledby="ops-title">
          <div className="setup-heading">
            <div>
              <p className="eyebrow"><T k="projects.ops.eyebrow" /></p>
              <h2 id="ops-title"><T k="projects.ops.title" /></h2>
            </div>
          </div>
          <div className="ops-grid">
            <article className="ops-card">
              <h3><T k="projects.ops.provider.title" /></h3>
              <p><T k="projects.ops.provider.copy" /></p>
            </article>
            <article className="ops-card">
              <h3><T k="projects.ops.manual.title" /></h3>
              <p><T k="projects.ops.manual.copy" /></p>
            </article>
            <article className="ops-card">
              <h3><T k="projects.ops.archive.title" /></h3>
              <p>{ignoredFeedbacks.length} <T k="projects.ops.archive.copy" /></p>
            </article>
          </div>
        </section>
        </div>
      </section>
      <AppFooter />
    </main>
  );
}

function MetricCard({ labelKey, value, tone }: { labelKey: string; value: number; tone: "ok" | "warning" | "danger" }) {
  return (
    <article className={`metric-card ${tone}`}>
      <span><T k={labelKey} /></span>
      <strong>{value}</strong>
    </article>
  );
}

function SignalCard({ detailKey, labelKey, value }: { detailKey: string; labelKey: string; value: number | string }) {
  return (
    <article className="ops-card">
      <h3><T k={labelKey} /></h3>
      <strong>{value}</strong>
      <p><T k={detailKey} /></p>
    </article>
  );
}

function FeedbackCard({ feedback }: { feedback: StoredFeedback }) {
  const draftLabels = feedback.issueDraft.labels.join(" / ");
  const viewport = `${feedback.payload.metadata.viewport.width} x ${feedback.payload.metadata.viewport.height}`;
  const hasRetry = feedback.status === "retrying" && feedback.nextRetryAt;

  return (
    <article className={`feedback-card ${feedback.status}`}>
      <div className="feedback-main">
        <div className="feedback-tags" aria-label="Métadonnées du feedback">
          <span className="status-badge connected">{feedback.payload.type}</span>
          <span className={`status-badge ${statusClasses[feedback.status]}`}>
            <T k={statusLabelKeys[feedback.status]} />
          </span>
          <span className="status-badge muted">{feedback.issueTarget.provider}</span>
        </div>
        <h2>{feedback.issueDraft.title}</h2>
        <p>{feedback.payload.message || <T k="projects.feedback.noMessage" />}</p>
        {feedback.lastError ? (
          <div className="error-callout">
            <strong><T k="projects.feedback.issueError" /></strong>
            <span>{feedback.lastError}</span>
          </div>
        ) : null}
        {hasRetry ? (
          <div className="retry-callout">
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
      <div className="issue-draft">
        <p className="eyebrow"><T k="projects.feedback.draft" /></p>
        <strong>{feedback.issueTarget.namespace}/{feedback.issueTarget.project}</strong>
        <span>{draftLabels}</span>
        {feedback.payload.pin ? <span>Pin: {Math.round(feedback.payload.pin.x)}, {Math.round(feedback.payload.pin.y)}</span> : null}
        {feedback.screenshotAsset ? (
          <ScreenshotPreview
            asset={feedback.screenshotAsset}
            metadata={feedback.payload.metadata}
            pin={feedback.payload.pin}
          />
        ) : null}
        <a className="inline-link" href={feedback.issueTarget.webUrl ?? "#"}><T k="projects.feedback.destination" /> {feedback.issueTarget.provider}</a>
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
