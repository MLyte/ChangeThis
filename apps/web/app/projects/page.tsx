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

type DashboardStatusFilter = "all" | "priority" | FeedbackStatus;

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
  const filteredFeedbacks = feedbacks.filter((feedback) => matchesDashboardFilters(feedback, filters));
  const priorityFeedbacks = filteredFeedbacks.filter(isPriorityFeedback);
  const queuedFeedbacks = filteredFeedbacks.filter((feedback) => feedback.status === "issue_creation_pending");
  const retryFeedbacks = filteredFeedbacks.filter((feedback) => feedback.status === "retrying");
  const failedFeedbacks = filteredFeedbacks.filter((feedback) => feedback.status === "failed");
  const sentFeedbacks = filteredFeedbacks.filter((feedback) => feedback.status === "sent_to_provider");
  const keptFeedbacks = filteredFeedbacks.filter((feedback) => feedback.status === "kept");
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
              <RetryDueButton />
              <Link className="button" href="/demo"><T k="projects.inbox.test" /></Link>
            </div>
          </div>

            <DashboardFilterBar
              filteredCount={filteredFeedbacks.length}
              filters={filters}
              hasActiveFilters={hasActiveFilters}
              projects={projects}
              totalCount={feedbacks.length}
            />

            {priorityFeedbacks.length === 0 ? (
              <div className="empty-state compact-empty-state">
                <h2>{hasActiveFilters ? "Aucun retour pour ces filtres" : <T k="projects.empty.title" />}</h2>
                <p>{hasActiveFilters ? "Ajustez les filtres ou revenez à la vue complète." : <T k="projects.empty.copy" />}</p>
                {hasActiveFilters ? (
                  <Link className="button secondary-button" href="/projects">Réinitialiser les filtres</Link>
                ) : (
                  <Link className="button" href="/demo"><T k="projects.inbox.test" /></Link>
                )}
              </div>
            ) : (
              <div className="feedback-list" role="list" aria-label="Retours à traiter">
                {priorityFeedbacks.map((feedback) => <FeedbackCard feedback={feedback} key={feedback.id} />)}
              </div>
            )}

            <FeedbackGroup
              description="Feedbacks liés à une issue Git encore ouverte ou à vérifier."
              feedbacks={sentFeedbacks}
              title="Issues créées"
            />
            <FeedbackGroup
              description="Feedbacks dont l'issue Git correspondante est fermée."
              feedbacks={resolvedFeedbacks}
              title="Résolus"
            />
            <FeedbackGroup
              description="Feedbacks conservés dans ChangeThis sans création d'issue."
              feedbacks={keptFeedbacks}
              title="Conservés sans issue"
            />
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

function DashboardFilterBar({
  filteredCount,
  filters,
  hasActiveFilters,
  projects,
  totalCount
}: {
  filteredCount: number;
  filters: DashboardFilters;
  hasActiveFilters: boolean;
  projects: ChangeThisProject[];
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
          <option value="all">Tous</option>
          <option value="priority">À traiter</option>
          <option value="raw">Nouveaux</option>
          <option value="retrying">Relances</option>
          <option value="failed">Échecs</option>
          <option value="sent_to_provider">Issues créées</option>
          <option value="resolved">Résolus</option>
          <option value="kept">Conservés</option>
          <option value="ignored">Ignorés</option>
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
        <span>{filteredCount}/{totalCount} retours</span>
        <button className="button" type="submit">Filtrer</button>
        {hasActiveFilters ? <Link className="button secondary-button" href="/projects">Réinitialiser</Link> : null}
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

function FeedbackGroup({ description, feedbacks, title }: { description: string; feedbacks: StoredFeedback[]; title: string }) {
  if (feedbacks.length === 0) {
    return null;
  }

  return (
    <section className="feedback-group" aria-labelledby={`feedback-group-${slugify(title)}`}>
      <div className="feedback-group-heading">
        <div>
          <h3 id={`feedback-group-${slugify(title)}`}>{title}</h3>
          <p>{description}</p>
        </div>
        <span className="status-badge muted">{feedbacks.length}</span>
      </div>
      <div className="feedback-list" role="list" aria-label={title}>
        {feedbacks.map((feedback) => <FeedbackCard feedback={feedback} key={feedback.id} />)}
      </div>
    </section>
  );
}

function FeedbackCard({ feedback }: { feedback: StoredFeedback }) {
  const draftLabels = feedback.issueDraft.labels.join(" / ");
  const viewport = `${feedback.payload.metadata.viewport.width} x ${feedback.payload.metadata.viewport.height}`;
  const appEnvironment = feedback.payload.metadata.app;
  const appEnvironmentSummary = formatAppEnvironmentSummary(appEnvironment);
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
          {appEnvironmentSummary ? <span>{appEnvironmentSummary}</span> : null}
          <span>{formatDate(feedback.createdAt)}</span>
        </div>
      </div>
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
      <div className="compact-preview-cell">
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
        ) : (
          <span className="no-preview">Sans capture</span>
        )}
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

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
  if (value === "priority" || isFeedbackStatus(value)) {
    return value;
  }

  return "all";
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

  if (filters.status !== "all" && filters.status !== "priority" && feedback.status !== filters.status) {
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

function isFilteringDashboard(filters: DashboardFilters): boolean {
  return filters.provider !== "all"
    || filters.query !== ""
    || filters.site !== "all"
    || filters.status !== "all"
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
