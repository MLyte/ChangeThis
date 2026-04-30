import Link from "next/link";
import { forbidden, unauthorized } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, Globe2, Inbox, RotateCcw, Send, type LucideIcon } from "lucide-react";
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
import { BulkIssueForm } from "./bulk-issue-form";
import { DashboardFilterAutoSubmit } from "./dashboard-filter-auto-submit";
import { DemoSeedButton } from "./demo-seed-button";
import { RetryDueButton } from "./retry-due-button";
import { ScreenshotPreview } from "./screenshot-preview";

export const dynamic = "force-dynamic";

type ProjectsPageProps = {
  searchParams?: Promise<{
    provider?: string;
    q?: string;
    site?: string;
    status?: string;
    type?: string;
  }>;
};

type DashboardStatusFilter = "active" | "history" | "all" | "priority" | FeedbackStatus;

type DashboardFilters = {
  provider: "all" | "github" | "gitlab";
  query: string;
  site: string;
  status: DashboardStatusFilter;
  type: "all" | "comment" | "pin" | "screenshot";
};

const statusLabelKeys: Record<FeedbackStatus, string> = {
  raw: "status.raw.long",
  issue_creation_pending: "status.issue_creation_pending.long",
  retrying: "status.retrying.long",
  sent_to_provider: "status.sent_to_provider.long",
  failed: "status.failed.long",
  kept: "status.kept.long",
  resolved: "status.resolved.long",
  ignored: "status.ignored.long"
};

const statusClasses: Record<FeedbackStatus, string> = {
  raw: "needs_setup",
  issue_creation_pending: "needs_setup",
  retrying: "needs_setup",
  sent_to_provider: "connected",
  failed: "failed",
  kept: "muted",
  resolved: "connected",
  ignored: "muted"
};

const projectNavItems = [
  { href: "/projects", labelKey: "nav.issues" },
  { href: "/settings", labelKey: "nav.settings" }
];

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
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
  const params = await searchParams;
  const filters = parseDashboardFilters(params);
  const projects = await listConfiguredProjects(workspaceId);
  const feedbacks = await getFeedbackRepository().list({ workspaceId });
  const hasLiveDemo = feedbacks.some(isSeedDemoFeedback);
  const filteredFeedbacks = feedbacks.filter((feedback) => matchesDashboardFilters(feedback, filters));
  const activeFeedbacks = feedbacks.filter(isActiveFeedback);
  const historyFeedbacks = feedbacks.filter(isHistoryFeedback);
  const feedbackStatusCounts = countFeedbackStatuses(feedbacks);
  const priorityCount = feedbacks.filter(isPriorityFeedback).length;
  const priorityFeedbacks = filteredFeedbacks.filter(isPriorityFeedback);
  const queuedFeedbacks = filteredFeedbacks.filter((feedback) => feedback.status === "issue_creation_pending");
  const retryFeedbacks = filteredFeedbacks.filter((feedback) => feedback.status === "retrying");
  const failedFeedbacks = filteredFeedbacks.filter((feedback) => feedback.status === "failed");
  const resolvedFeedbacks = filteredFeedbacks.filter((feedback) => feedback.status === "resolved");
  const githubProjects = projects.filter((project) => project.issueTarget.provider === "github").length;
  const gitlabProjects = projects.filter((project) => project.issueTarget.provider === "gitlab").length;
  const latestFeedback = feedbacks.at(0);
  const readyProjects = projects.filter((project) => project.issueTarget.namespace && project.issueTarget.project).length;
  const hasActiveFilters = isFilteringDashboard(filters);

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
        <div className="dashboard-workbench compact-workbench">
          <section className="inbox-panel compact-inbox" id="issues" aria-labelledby="local-inbox-title">
            <div className="inbox-hero compact-inbox-header">
              <div>
                <p className="eyebrow"><T k="projects.inbox.eyebrow" /></p>
                <h2 id="local-inbox-title"><T k="projects.inbox.title" /></h2>
            </div>
            <div className="inbox-toolbar">
              <DemoSeedButton hasLiveDemo={hasLiveDemo} />
              {retryFeedbacks.length > 1 ? <RetryDueButton count={retryFeedbacks.length} /> : null}
              <Link className="button" href="/demo"><T k="projects.inbox.test" /></Link>
            </div>
          </div>

            <DashboardViewTabs
              activeCount={activeFeedbacks.length}
              historyCount={historyFeedbacks.length}
              status={filters.status}
              totalCount={feedbacks.length}
            />

            <DashboardFilterBar
              filteredCount={filteredFeedbacks.length}
              filters={filters}
              hasActiveFilters={hasActiveFilters}
              historyCount={historyFeedbacks.length}
              activeCount={activeFeedbacks.length}
              priorityCount={priorityCount}
              projects={projects}
              statusCounts={feedbackStatusCounts}
              totalCount={feedbacks.length}
            />

            {filteredFeedbacks.length === 0 ? (
              <div className="empty-state compact-empty-state">
                <h2>{hasActiveFilters ? "Aucun retour pour cette vue" : <T k="projects.empty.title" />}</h2>
                <p>{hasActiveFilters ? "Ajustez les filtres, passez en Historique, ou revenez à la File active." : <T k="projects.empty.copy" />}</p>
                {hasActiveFilters ? (
                  <Link className="button secondary-button" href="/projects">Réinitialiser les filtres</Link>
                ) : (
                  <Link className="button" href="/demo"><T k="projects.inbox.test" /></Link>
                )}
              </div>
            ) : (
              <BulkIssueForm>
                <div className="feedback-table-head" aria-hidden="true">
                  <span />
                  <span>Feedback</span>
                  <span>Site / page</span>
                  <span>Statut</span>
                  <span>Issue</span>
                  <span>Reçu</span>
                  <span>Actions</span>
                </div>
                <div className="feedback-list" role="list" aria-label="Retours à traiter">
                  {filteredFeedbacks.map((feedback) => <FeedbackCard feedback={feedback} key={feedback.id} />)}
                </div>
              </BulkIssueForm>
            )}
          </section>

          <aside className="dashboard-side-panel" aria-label="Contexte ChangeThis">
            <section className="side-panel-section status-side-section" aria-labelledby="status-side-title">
              <div className="side-panel-heading">
                <p className="eyebrow">Synthèse</p>
                <h2 id="status-side-title">File actuelle</h2>
              </div>
              <div className="side-status-stack" aria-label="Synthèse opérationnelle">
                <StatusMetric icon={Inbox} label="À traiter" value={priorityFeedbacks.length} tone={priorityFeedbacks.length > 0 ? "warning" : "ok"} />
                <StatusMetric icon={Clock3} label="En file" value={queuedFeedbacks.length} tone="warning" />
                <StatusMetric icon={RotateCcw} label="Relances" value={retryFeedbacks.length} tone="warning" />
                <StatusMetric icon={AlertTriangle} label="Échecs" value={failedFeedbacks.length} tone="danger" />
                <StatusMetric icon={CheckCircle2} label="Résolus" value={resolvedFeedbacks.length} tone="ok" />
              </div>
            </section>

            <section className="side-panel-section">
              <div className="side-panel-heading">
                <p className="eyebrow">Routage</p>
                <h2>Sites connectés</h2>
              </div>
              <Link className="button secondary-button full-width-button" href="/settings/connected-sites">
                <Globe2 aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
                Sites connectés
              </Link>
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
            </section>

            <section className="side-panel-section">
              <div className="side-panel-heading">
                <p className="eyebrow">Signal</p>
                <h2>Activité</h2>
              </div>
              <div className="activity-stack">
                <ActivityItem label="Dernier retour" value={latestFeedback ? formatDate(latestFeedback.createdAt) : "—"} />
                <ActivityItem label="Affichés" value={`${filteredFeedbacks.length}/${feedbacks.length}`} />
                <ActivityItem label="Conservés" value={feedbacks.filter((feedback) => feedback.status === "kept").length} />
                <ActivityItem label="Archivés" value={feedbacks.filter((feedback) => feedback.status === "ignored").length} />
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

function DashboardViewTabs({
  activeCount,
  historyCount,
  status,
  totalCount
}: {
  activeCount: number;
  historyCount: number;
  status: DashboardStatusFilter;
  totalCount: number;
}) {
  return (
    <nav className="dashboard-view-tabs" aria-label="Vue des retours">
      <Link className={`view-tab${status === "active" ? " active" : ""}`} href="/projects">
        File active <span>{activeCount}</span>
      </Link>
      <Link className={`view-tab${status === "history" ? " active" : ""}`} href="/projects?status=history">
        Historique <span>{historyCount}</span>
      </Link>
      <Link className={`view-tab${status === "all" ? " active" : ""}`} href="/projects?status=all">
        Tous <span>{totalCount}</span>
      </Link>
    </nav>
  );
}

function DashboardFilterBar({
  activeCount,
  filteredCount,
  filters,
  hasActiveFilters,
  historyCount,
  priorityCount,
  projects,
  statusCounts,
  totalCount
}: {
  activeCount: number;
  filteredCount: number;
  filters: DashboardFilters;
  hasActiveFilters: boolean;
  historyCount: number;
  priorityCount: number;
  projects: ChangeThisProject[];
  statusCounts: Record<FeedbackStatus, number>;
  totalCount: number;
}) {
  return (
    <form action="/projects" className="dashboard-filters">
      <div className="filter-field search-field">
        <label htmlFor="dashboard-filter-q">Recherche</label>
        <input
          defaultValue={filters.query}
          id="dashboard-filter-q"
          name="q"
          placeholder="Titre, texte, page, dépôt..."
          type="search"
        />
      </div>

      <div className="filter-field">
        <label htmlFor="dashboard-filter-status">Statut</label>
        <select defaultValue={filters.status} id="dashboard-filter-status" name="status">
          <option value="active">File active ({activeCount})</option>
          <option value="history">Historique ({historyCount})</option>
          <option value="all">Tous ({totalCount})</option>
          <option value="priority">Action requise ({priorityCount})</option>
          <option value="raw">Nouveaux ({statusCounts.raw})</option>
          <option value="issue_creation_pending">En file ({statusCounts.issue_creation_pending})</option>
          <option value="retrying">À réenvoyer ({statusCounts.retrying})</option>
          <option value="failed">Échecs ({statusCounts.failed})</option>
          <option value="sent_to_provider">Issues créées ({statusCounts.sent_to_provider})</option>
          <option value="resolved">Résolus ({statusCounts.resolved})</option>
          <option value="kept">Conservés ({statusCounts.kept})</option>
          <option value="ignored">Ignorés ({statusCounts.ignored})</option>
        </select>
      </div>

      <div className="filter-field">
        <label htmlFor="dashboard-filter-site">Site</label>
        <select defaultValue={filters.site} id="dashboard-filter-site" name="site">
          <option value="all">Tous les sites</option>
          {projects.map((project) => (
            <option key={project.publicKey} value={project.publicKey}>{project.name}</option>
          ))}
        </select>
      </div>

      <div className="filter-field">
        <label htmlFor="dashboard-filter-type">Type</label>
        <select defaultValue={filters.type} id="dashboard-filter-type" name="type">
          <option value="all">Tous</option>
          <option value="comment">Note</option>
          <option value="pin">Pin</option>
          <option value="screenshot">Capture</option>
        </select>
      </div>

      <div className="filter-field">
        <label htmlFor="dashboard-filter-provider">Git</label>
        <select defaultValue={filters.provider} id="dashboard-filter-provider" name="provider">
          <option value="all">Tous</option>
          <option value="github">GitHub</option>
          <option value="gitlab">GitLab</option>
        </select>
      </div>

      <div className="filter-actions">
        <span>{filteredCount} retours affichés sur {totalCount}</span>
        <DashboardFilterAutoSubmit />
        {hasActiveFilters ? <Link className="button secondary-button" href="/projects">Effacer les filtres</Link> : null}
      </div>
    </form>
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
  const appEnvironment = feedback.payload.metadata.app;
  const appEnvironmentSummary = formatAppEnvironmentSummary(appEnvironment);
  const displayMessage = formatFeedbackMessage(feedback.payload.message);
  const cardTitle = formatFeedbackCardTitle(feedback);
  const canBulkCreateIssue = feedback.status === "raw" || feedback.status === "retrying" || feedback.status === "failed";
  const hasRetry = feedback.status === "retrying" && feedback.nextRetryAt;
  const issueLabel = feedback.externalIssue?.url ? "Créée" : feedback.status === "issue_creation_pending" ? "En cours" : "Non créée";

  return (
    <article className={`feedback-card compact-feedback-row ${feedback.status}`} role="listitem">
      <label className="feedback-select">
        <input
          aria-label={`Sélectionner ${cardTitle}`}
          disabled={!canBulkCreateIssue}
          name="feedbackId"
          type="checkbox"
          value={feedback.id}
        />
      </label>
      <div className="feedback-main">
        <div className="feedback-tags mobile-feedback-tags" aria-label="Métadonnées du feedback">
          <span className="status-badge connected">{feedback.payload.type}</span>
          <span className={`status-badge ${statusClasses[feedback.status]}`}>
            <T k={statusLabelKeys[feedback.status]} />
          </span>
          <ProviderBadge provider={feedback.issueTarget.provider} />
        </div>
        <h2>{cardTitle}</h2>
        <p>{displayMessage.message || <T k="projects.feedback.noMessage" />}</p>
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
          {displayMessage.reporter ? <span>Envoyé par {displayMessage.reporter}</span> : null}
          <span>{feedback.projectName}</span>
          <span>{feedback.payload.metadata.path}</span>
          <span>{formatDate(feedback.createdAt)}</span>
        </div>
        <details className="feedback-disclosure" open={feedback.status === "failed" || feedback.status === "retrying"}>
          <summary>Brouillon, destination et contexte</summary>
          <div className="feedback-disclosure-grid">
            <div className="issue-draft compact-issue-draft">
              <div>
                <p className="eyebrow"><T k="projects.feedback.draft" /></p>
                <strong>{feedback.issueTarget.namespace}/{feedback.issueTarget.project}</strong>
              </div>
              <span>{draftLabels}</span>
              {feedback.payload.pins?.length ? (
                <span>{feedback.payload.pins.length} pin{feedback.payload.pins.length > 1 ? "s" : ""}</span>
              ) : feedback.payload.pin ? (
                <span>Pin: {Math.round(feedback.payload.pin.x)}, {Math.round(feedback.payload.pin.y)}</span>
              ) : null}
              <a className="inline-link" href={feedback.issueTarget.webUrl ?? "#"}>
                <T k="projects.feedback.destination" />
              </a>
            </div>
            <div className="feedback-technical-summary">
              <span>Viewport: {viewport}</span>
              {appEnvironmentSummary ? <span>{appEnvironmentSummary}</span> : null}
              <span>URL: {feedback.payload.metadata.url}</span>
            </div>
          </div>
        </details>
      </div>
      <div className="feedback-site-cell">
        <strong>{feedback.projectName}</strong>
        <span>{feedback.payload.metadata.path}</span>
      </div>
      <div className="feedback-status-cell">
        <span className={`status-dot ${feedback.status}`} aria-hidden="true" />
        <span className={`status-badge ${statusClasses[feedback.status]}`}>
          <T k={statusLabelKeys[feedback.status]} />
        </span>
      </div>
      <div className="feedback-issue-cell">
        <ProviderBadge provider={feedback.issueTarget.provider} />
        <span>{issueLabel}</span>
        {feedback.screenshotAsset ? (
          <ScreenshotPreview
            asset={feedback.screenshotAsset}
            feedback={{
              createdAt: feedback.createdAt,
              issueTarget: feedback.issueTarget,
              message: feedback.payload.message,
              projectName: feedback.projectName,
              status: feedback.status,
              title: feedback.issueDraft.title
            }}
            metadata={feedback.payload.metadata}
            pin={feedback.payload.pin}
            pins={feedback.payload.pins}
          />
        ) : null}
      </div>
      <div className="feedback-received-cell">
        <span>{formatDate(feedback.createdAt)}</span>
      </div>
      <FeedbackActions
        externalIssueUrl={feedback.externalIssue?.url}
        feedbackId={feedback.id}
        issueDraft={feedback.issueDraft}
        status={feedback.status}
      />
    </article>
  );
}

function parseDashboardFilters(params?: {
  provider?: string;
  q?: string;
  site?: string;
  status?: string;
  type?: string;
}): DashboardFilters {
  return {
    provider: params?.provider === "github" || params?.provider === "gitlab" ? params.provider : "all",
    query: params?.q?.trim() ?? "",
    site: params?.site?.trim() || "all",
    status: parseStatusFilter(params?.status),
    type: params?.type === "comment" || params?.type === "pin" || params?.type === "screenshot" ? params.type : "all"
  };
}

function parseStatusFilter(value?: string): DashboardStatusFilter {
  if (value === "active" || value === "history" || value === "priority" || value === "all" || isFeedbackStatus(value)) {
    return value;
  }

  return "active";
}

function matchesDashboardFilters(feedback: StoredFeedback, filters: DashboardFilters): boolean {
  if (filters.provider !== "all" && feedback.issueTarget.provider !== filters.provider) {
    return false;
  }

  if (filters.type !== "all" && feedback.payload.type !== filters.type) {
    return false;
  }

  if (filters.status === "priority" && !isPriorityFeedback(feedback)) {
    return false;
  }

  if (filters.status === "active" && !isActiveFeedback(feedback)) {
    return false;
  }

  if (filters.status === "history" && !isHistoryFeedback(feedback)) {
    return false;
  }

  if (isFeedbackStatus(filters.status) && feedback.status !== filters.status) {
    return false;
  }

  if (filters.site !== "all" && feedback.projectKey !== filters.site) {
    return false;
  }

  if (!filters.query) {
    return true;
  }

  const haystack = [
    feedback.issueDraft.title,
    feedback.payload.message,
    feedback.payload.metadata.path,
    feedback.payload.metadata.title,
    feedback.payload.metadata.app?.environment,
    feedback.payload.metadata.app?.release,
    feedback.payload.metadata.app?.appVersion,
    feedback.payload.metadata.app?.buildId,
    feedback.payload.metadata.app?.commitSha,
    feedback.payload.metadata.app?.branch,
    feedback.payload.metadata.app?.testRunId,
    feedback.payload.metadata.app?.scenario,
    feedback.payload.metadata.app?.customer,
    feedback.projectName,
    feedback.issueTarget.namespace,
    feedback.issueTarget.project,
    feedback.externalIssue?.url
  ].join(" ").toLowerCase();

  return haystack.includes(filters.query.toLowerCase());
}

function isPriorityFeedback(feedback: StoredFeedback): boolean {
  return feedback.status === "raw" || feedback.status === "retrying" || feedback.status === "failed";
}

function countFeedbackStatuses(feedbacks: StoredFeedback[]): Record<FeedbackStatus, number> {
  return feedbacks.reduce<Record<FeedbackStatus, number>>((counts, feedback) => {
    counts[feedback.status] += 1;
    return counts;
  }, {
    raw: 0,
    issue_creation_pending: 0,
    retrying: 0,
    sent_to_provider: 0,
    failed: 0,
    kept: 0,
    resolved: 0,
    ignored: 0
  });
}

function isSeedDemoFeedback(feedback: StoredFeedback): boolean {
  return feedback.payload.metadata.app?.testRunId?.startsWith("realistic-demo-seed-") === true;
}

function isActiveFeedback(feedback: StoredFeedback): boolean {
  return feedback.status === "raw"
    || feedback.status === "issue_creation_pending"
    || feedback.status === "retrying"
    || feedback.status === "failed";
}

function isHistoryFeedback(feedback: StoredFeedback): boolean {
  return feedback.status === "sent_to_provider"
    || feedback.status === "resolved"
    || feedback.status === "kept"
    || feedback.status === "ignored";
}

function isFilteringDashboard(filters: DashboardFilters): boolean {
  return filters.provider !== "all"
    || filters.query !== ""
    || filters.site !== "all"
    || filters.status !== "active"
    || filters.type !== "all";
}

function isFeedbackStatus(value?: string): value is FeedbackStatus {
  return value === "raw"
    || value === "issue_creation_pending"
    || value === "retrying"
    || value === "sent_to_provider"
    || value === "failed"
    || value === "kept"
    || value === "resolved"
    || value === "ignored";
}

function formatFeedbackMessage(message: string): { message: string; reporter?: string } {
  const match = message.match(/^([A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ' -]{1,48}):\s+(.+)$/);

  if (!match) {
    return { message };
  }

  return {
    reporter: match[1].trim(),
    message: match[2].trim()
  };
}

function formatFeedbackCardTitle(feedback: StoredFeedback): string {
  const typeLabel: Record<StoredFeedback["payload"]["type"], string> = {
    comment: "Note",
    pin: "Pin",
    screenshot: "Capture"
  };
  const path = feedback.payload.metadata.path || "/";

  return `${typeLabel[feedback.payload.type]} sur ${path}`;
}

function formatAppEnvironmentSummary(app?: StoredFeedback["payload"]["metadata"]["app"]): string | undefined {
  if (!app) {
    return undefined;
  }

  const primary = app.environment ?? app.release ?? app.appVersion;
  if (!primary) {
    return undefined;
  }

  const details = [app.buildId, app.testRunId].filter(Boolean).join(" · ");
  return details ? `Env: ${primary} · ${details}` : `Env: ${primary}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-BE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
