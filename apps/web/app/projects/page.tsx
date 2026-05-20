import Link from "next/link";
import { forbidden, unauthorized } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, Code2, GitBranch, Globe2, Inbox, MessageSquareText, RotateCcw, type LucideIcon } from "lucide-react";
import type { FeedbackStatus } from "@changethis/shared";
import { isAuthFailure, requireWorkspaceSession } from "../../lib/auth";
import { workspaceDemoProjectKeyPrefix, workspaceDemoProjectName, type ChangeThisProject } from "../../lib/demo-project";
import { isDemoFeedback } from "../../lib/demo-feedback-actions";
import { getFeedbackRepository, type StoredFeedback } from "../../lib/feedback-repository";
import { listConfiguredProjects } from "../../lib/project-registry";
import { AppFooter } from "../app-footer";
import { AppHeader } from "../app-header";
import { T } from "../i18n";
import { ProviderBadge, ProviderIcon } from "../provider-badge";
import { FeedbackActions } from "./feedback-actions";
import { BulkIssueForm } from "./bulk-issue-form";
import { DashboardFilterAutoSubmit } from "./dashboard-filter-auto-submit";
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

type OnboardingStepStatus = "done" | "current" | "pending";

type OnboardingChecklistStep = {
  actionHref?: string;
  actionLabel?: string;
  copy: string;
  icon: LucideIcon;
  index: string;
  status: OnboardingStepStatus;
  title: string;
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
  const activeFeedbacks = feedbacks.filter(isActiveFeedback);
  const historyFeedbacks = feedbacks.filter(isHistoryFeedback);
  const feedbackStatusCounts = countFeedbackStatuses(feedbacks);
  const priorityCount = feedbacks.filter(isPriorityFeedback).length;
  const priorityFeedbacks = filteredFeedbacks.filter(isPriorityFeedback);
  const queuedFeedbacks = filteredFeedbacks.filter((feedback) => feedback.status === "issue_creation_pending");
  const retryFeedbacks = filteredFeedbacks.filter((feedback) => feedback.status === "retrying");
  const failedFeedbacks = filteredFeedbacks.filter((feedback) => feedback.status === "failed");
  const resolvedFeedbacks = filteredFeedbacks.filter((feedback) => feedback.status === "resolved");
  const connectedProjects = projects.filter((project) => !isDemoProject(project));
  const githubProjects = connectedProjects.filter((project) => project.issueTarget.provider === "github").length;
  const gitlabProjects = connectedProjects.filter((project) => project.issueTarget.provider === "gitlab").length;
  const hasActiveFilters = isFilteringDashboard(filters);
  const hasConfiguredSite = projects.length > 0;
  const onboardingSteps = buildOnboardingChecklist(projects, feedbacks);
  const feedbackCountsByProject = countFeedbacksByProject(feedbacks);

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
          <ProjectRouteNavigation
            filters={filters}
            githubProjects={githubProjects}
            gitlabProjects={gitlabProjects}
            projects={projects}
            connectedProjectCount={connectedProjects.length}
            feedbackCountsByProject={feedbackCountsByProject}
            totalFeedbacks={feedbacks.length}
            priorityCount={priorityFeedbacks.length}
            queuedCount={queuedFeedbacks.length}
            retryCount={retryFeedbacks.length}
            failedCount={failedFeedbacks.length}
            resolvedCount={resolvedFeedbacks.length}
          />

          <section className="inbox-panel compact-inbox" id="issues" aria-labelledby="local-inbox-title">
            <div className="inbox-hero compact-inbox-header">
              <div>
                <p className="eyebrow"><T k="projects.inbox.eyebrow" /></p>
                <h2 id="local-inbox-title"><T k="projects.inbox.title" /></h2>
            </div>
            <div className="inbox-toolbar">
              {retryFeedbacks.length > 1 ? <RetryDueButton count={retryFeedbacks.length} /> : null}
              <Link className="button" href="/demo"><T k="projects.inbox.test" /></Link>
            </div>
          </div>

            {!hasConfiguredSite ? (
              <ProjectsOnboardingEmptyState steps={onboardingSteps} />
            ) : (
              <>
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
                    <h2>{hasActiveFilters ? <T k="projects.empty.filtered.title" /> : <T k="projects.empty.title" />}</h2>
                    <p>{hasActiveFilters ? <T k="projects.empty.filtered.copy" /> : <T k="projects.empty.copy" />}</p>
                    {hasActiveFilters ? (
                      <Link className="button secondary-button" href="/projects"><T k="projects.empty.filtered.reset" /></Link>
                    ) : (
                      <Link className="button" href="/demo"><T k="projects.inbox.test" /></Link>
                    )}
                  </div>
                ) : (
                  <BulkIssueForm showTableHead>
                    <span className="sr-only" id="feedback-list-label"><T k="projects.list.aria" /></span>
                    <div className="feedback-list" role="list" aria-labelledby="feedback-list-label">
                      {filteredFeedbacks.map((feedback) => <FeedbackCard feedback={feedback} key={feedback.id} />)}
                    </div>
                  </BulkIssueForm>
                )}
              </>
            )}
          </section>

        </div>
      </section>
      <AppFooter />
    </main>
  );
}

function ProjectRouteNavigation({
  filters,
  githubProjects,
  gitlabProjects,
  projects,
  connectedProjectCount,
  feedbackCountsByProject,
  totalFeedbacks,
  priorityCount,
  queuedCount,
  retryCount,
  failedCount,
  resolvedCount
}: {
  filters: DashboardFilters;
  githubProjects: number;
  gitlabProjects: number;
  projects: ChangeThisProject[];
  connectedProjectCount: number;
  feedbackCountsByProject: Map<string, number>;
  totalFeedbacks: number;
  priorityCount: number;
  queuedCount: number;
  retryCount: number;
  failedCount: number;
  resolvedCount: number;
}) {
  return (
    <aside className="project-route-panel" aria-labelledby="project-route-panel-label">
      <span className="sr-only" id="project-route-panel-label"><T k="projects.sites.aria" /></span>
      <section className="side-panel-section project-route-nav">
        <div className="side-panel-heading">
          <p className="eyebrow">Routage</p>
        </div>
        <Link className="button secondary-button full-width-button" href="/settings/connected-sites">
          <Globe2 aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
          Sites connectés
        </Link>
        <div className="route-summary">
          <span>
            <strong>{connectedProjectCount}</strong> site{connectedProjectCount > 1 ? "s" : ""} connecté{connectedProjectCount > 1 ? "s" : ""}
          </span>
        </div>
        <div className="provider-split">
          <ProviderCount provider="github" count={githubProjects} />
          <ProviderCount provider="gitlab" count={gitlabProjects} />
        </div>
        <span className="sr-only" id="site-route-list-label"><T k="projects.sites.filterAria" /></span>
        <nav className="site-route-list" aria-labelledby="site-route-list-label">
          <Link className={`site-route-row${filters.site === "all" ? " active" : ""}`} href={dashboardSiteHref(filters, "all")}>
            <div>
              <strong><T k="projects.sites.all" /></strong>
              <span>Feedbacks tous projets</span>
            </div>
            <span className="site-route-count">{totalFeedbacks}</span>
          </Link>
          {projects.length > 0 ? (
            projects.map((project) => (
              <ProjectRouteRow
                active={filters.site === project.publicKey}
                count={feedbackCountsByProject.get(project.publicKey) ?? 0}
                filters={filters}
                key={project.publicKey}
                project={project}
              />
            ))
          ) : (
            <div className="site-route-empty">
              Ajoutez un site réel pour activer la route widget vers issue.
            </div>
          )}
        </nav>
      </section>
      <StatusSummary
        failedCount={failedCount}
        filters={filters}
        priorityCount={priorityCount}
        queuedCount={queuedCount}
        resolvedCount={resolvedCount}
        retryCount={retryCount}
      />
    </aside>
  );
}

function StatusSummary({
  failedCount,
  filters,
  priorityCount,
  queuedCount,
  resolvedCount,
  retryCount
}: {
  failedCount: number;
  filters: DashboardFilters;
  priorityCount: number;
  queuedCount: number;
  resolvedCount: number;
  retryCount: number;
}) {
  return (
    <section className="side-panel-section status-side-section" aria-labelledby="status-side-title">
      <div className="side-panel-heading">
        <p className="eyebrow">Synthèse</p>
        <h2 id="status-side-title">File actuelle</h2>
      </div>
      <span className="sr-only" id="side-status-stack-label"><T k="projects.summary.aria" /></span>
      <div className="side-status-stack" aria-labelledby="side-status-stack-label">
        <StatusMetric
          active={filters.status === "priority"}
          href={dashboardStatusHref(filters, "priority")}
          icon={Inbox}
          label="À traiter"
          value={priorityCount}
          tone={priorityCount > 0 ? "warning" : "ok"}
        />
        <StatusMetric
          active={filters.status === "issue_creation_pending"}
          href={dashboardStatusHref(filters, "issue_creation_pending")}
          icon={Clock3}
          label="En file"
          value={queuedCount}
          tone="warning"
        />
        <StatusMetric
          active={filters.status === "retrying"}
          href={dashboardStatusHref(filters, "retrying")}
          icon={RotateCcw}
          label="Relances"
          value={retryCount}
          tone="warning"
        />
        <StatusMetric
          active={filters.status === "failed"}
          href={dashboardStatusHref(filters, "failed")}
          icon={AlertTriangle}
          label="Échecs"
          value={failedCount}
          tone="danger"
        />
        <StatusMetric
          active={filters.status === "resolved"}
          href={dashboardStatusHref(filters, "resolved")}
          icon={CheckCircle2}
          label="Résolus"
          value={resolvedCount}
          tone="ok"
        />
      </div>
    </section>
  );
}

function ProjectsOnboardingEmptyState({ steps }: { steps: OnboardingChecklistStep[] }) {
  return (
    <div className="empty-state compact-empty-state projects-onboarding-empty">
      <div>
        <p className="eyebrow">Premier site réel</p>
        <h2>Préparez la file avant les retours clients</h2>
        <p>Connectez Git, créez un site autorisé, installez le script puis envoyez un feedback test depuis ce site pour vérifier le circuit complet.</p>
      </div>
      <span className="sr-only" id="projects-onboarding-steps-label"><T k="projects.onboarding.aria" /></span>
      <div className="onboarding-steps projects-onboarding-steps" aria-labelledby="projects-onboarding-steps-label">
        {steps.map((step) => <OnboardingStep key={step.index} {...step} />)}
      </div>
      <div className="empty-state-actions">
        <Link className="button" href="/settings/git-connections">
          <GitBranch aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
          Connecter Git
        </Link>
        <Link className="button secondary-button" href="/settings/connected-sites">
          <Globe2 aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
          Créer un site
        </Link>
        <Link className="button secondary-button" href="/demo">
          <MessageSquareText aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
          Tester la démo
        </Link>
      </div>
    </div>
  );
}

function OnboardingStep({
  actionHref,
  actionLabel,
  compact = false,
  copy,
  icon: Icon,
  index,
  status,
  title
}: {
  actionHref?: string;
  actionLabel?: string;
  compact?: boolean;
  copy: string;
  icon: LucideIcon;
  index: string;
  status?: OnboardingStepStatus;
  title: string;
}) {
  const statusLabel = status === "done" ? "Fait" : status === "current" ? "À faire" : "En attente";

  return (
    <div className={`onboarding-step${status ? ` ${status}` : ""}${compact ? " compact-onboarding-step" : ""}`}>
      <span aria-hidden="true">{index}</span>
      <div>
        <strong>
          <Icon aria-hidden="true" className="ui-icon" size={15} strokeWidth={2.2} />
          {title}
          {status ? <small className="onboarding-step-status">{statusLabel}</small> : null}
        </strong>
        <p>{copy}</p>
        {actionHref && actionLabel && status !== "done" ? (
          <Link className="inline-link onboarding-step-action" href={actionHref}>{actionLabel}</Link>
        ) : null}
      </div>
    </div>
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
    <nav className="dashboard-view-tabs" aria-labelledby="dashboard-view-tabs-label">
      <span className="sr-only" id="dashboard-view-tabs-label"><T k="projects.tabs.aria" /></span>
      <Link className={`view-tab${status === "active" ? " active" : ""}`} href="/projects">
        <T k="projects.tabs.active" /> <span>{activeCount}</span>
      </Link>
      <Link className={`view-tab${status === "history" ? " active" : ""}`} href="/projects?status=history">
        <T k="projects.tabs.history" /> <span>{historyCount}</span>
      </Link>
      <Link className={`view-tab${status === "all" ? " active" : ""}`} href="/projects?status=all">
        <T k="projects.tabs.all" /> <span>{totalCount}</span>
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
        <label htmlFor="dashboard-filter-status"><T k="projects.filters.status" /></label>
        <select defaultValue={filters.status} id="dashboard-filter-status" name="status">
          <option value="active"><T k="projects.tabs.active" /> ({activeCount})</option>
          <option value="history"><T k="projects.tabs.history" /> ({historyCount})</option>
          <option value="all"><T k="projects.tabs.all" /> ({totalCount})</option>
          <option value="priority"><T k="projects.filters.priority" /> ({priorityCount})</option>
          <option value="raw"><T k="projects.filters.new" /> ({statusCounts.raw})</option>
          <option value="issue_creation_pending"><T k="projects.filters.queued" /> ({statusCounts.issue_creation_pending})</option>
          <option value="retrying"><T k="projects.filters.toRetry" /> ({statusCounts.retrying})</option>
          <option value="failed"><T k="projects.filters.failed" /> ({statusCounts.failed})</option>
          <option value="sent_to_provider"><T k="projects.filters.created" /> ({statusCounts.sent_to_provider})</option>
          <option value="resolved"><T k="projects.filters.resolved" /> ({statusCounts.resolved})</option>
          <option value="kept"><T k="projects.filters.kept" /> ({statusCounts.kept})</option>
          <option value="ignored"><T k="projects.filters.ignored" /> ({statusCounts.ignored})</option>
        </select>
      </div>

      <div className="filter-field">
        <label htmlFor="dashboard-filter-site"><T k="projects.filters.site" /></label>
        <select defaultValue={filters.site} id="dashboard-filter-site" name="site">
          <option value="all"><T k="projects.sites.all" /></option>
          {projects.map((project) => (
            <option key={project.publicKey} value={project.publicKey}>{isDemoProject(project) ? workspaceDemoProjectName : project.name}</option>
          ))}
        </select>
      </div>

      <div className="filter-field">
        <label htmlFor="dashboard-filter-type"><T k="projects.filters.type" /></label>
        <select defaultValue={filters.type} id="dashboard-filter-type" name="type">
          <option value="all"><T k="projects.filters.all" /></option>
          <option value="comment">Note</option>
          <option value="pin">Pin</option>
          <option value="screenshot">Capture</option>
        </select>
      </div>

      <div className="filter-field">
        <label htmlFor="dashboard-filter-provider"><T k="projects.filters.git" /></label>
        <select defaultValue={filters.provider} id="dashboard-filter-provider" name="provider">
          <option value="all"><T k="projects.filters.all" /></option>
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

function StatusMetric({
  active,
  href,
  icon: Icon,
  label,
  tone,
  value
}: {
  active?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  tone: "ok" | "warning" | "danger";
  value: number;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      aria-label={`Voir les retours ${label.toLowerCase()}`}
      className={`status-metric ${tone}${active ? " active" : ""}`}
      href={href}
    >
      <Icon aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
      <span>{label}</span>
      <strong>{value}</strong>
    </Link>
  );
}

function dashboardStatusHref(filters: DashboardFilters, status: DashboardStatusFilter): string {
  const params = new URLSearchParams();
  params.set("status", status);

  if (filters.query) {
    params.set("q", filters.query);
  }

  if (filters.site !== "all") {
    params.set("site", filters.site);
  }

  if (filters.type !== "all") {
    params.set("type", filters.type);
  }

  if (filters.provider !== "all") {
    params.set("provider", filters.provider);
  }

  return `/projects?${params.toString()}`;
}

function dashboardSiteHref(filters: DashboardFilters, site: string): string {
  const params = new URLSearchParams();

  if (filters.status !== "active") {
    params.set("status", filters.status);
  }

  if (filters.query) {
    params.set("q", filters.query);
  }

  if (site !== "all") {
    params.set("site", site);
  }

  if (filters.type !== "all") {
    params.set("type", filters.type);
  }

  if (filters.provider !== "all") {
    params.set("provider", filters.provider);
  }

  const query = params.toString();
  return query ? `/projects?${query}` : "/projects";
}

function ProviderCount({ count, provider }: { count: number; provider: "github" | "gitlab" }) {
  return (
    <div>
      <ProviderBadge provider={provider} />
      <strong>{count}</strong>
    </div>
  );
}

function ProjectRouteRow({
  active,
  count,
  filters,
  project
}: {
  active: boolean;
  count: number;
  filters: DashboardFilters;
  project: ChangeThisProject;
}) {
  const demoProject = isDemoProject(project);
  const providerLabel = project.issueTarget.provider === "gitlab" ? "GitLab" : "GitHub";

  return (
    <Link className={`site-route-row${active ? " active" : ""}`} href={dashboardSiteHref(filters, project.publicKey)}>
      <div className="site-route-label">
        {demoProject ? null : (
          <span aria-label={providerLabel} className={`site-route-provider-mark ${project.issueTarget.provider}`} title={providerLabel}>
            <ProviderIcon provider={project.issueTarget.provider} />
          </span>
        )}
        <span className="site-route-title-group">
          <strong>{demoProject ? workspaceDemoProjectName : project.name}</strong>
          <span>{demoProject ? "Feedbacks de démonstration" : `${project.issueTarget.namespace}/${project.issueTarget.project}`}</span>
        </span>
      </div>
      <span className="site-route-meta">
        {demoProject ? <DemoBadge /> : null}
        <span className="site-route-count">{count}</span>
      </span>
    </Link>
  );
}

function FeedbackCard({ feedback }: { feedback: StoredFeedback }) {
  const demoFeedback = isDemoFeedback(feedback);
  const draftLabels = feedback.issueDraft.labels.join(" / ");
  const viewport = `${feedback.payload.metadata.viewport.width} x ${feedback.payload.metadata.viewport.height}`;
  const deviceContext = formatDeviceContext(feedback.payload.metadata);
  const browserContext = formatBrowserContext(feedback.payload.metadata.userAgent);
  const documentContext = formatDocumentContext(feedback.payload.metadata);
  const networkContext = formatNetworkContext(feedback.payload.metadata.network);
  const appEnvironment = feedback.payload.metadata.app;
  const appEnvironmentSummary = formatAppEnvironmentSummary(appEnvironment);
  const displayMessage = formatFeedbackMessage(feedback);
  const cardTitle = formatFeedbackCardTitle(feedback, demoFeedback ? workspaceDemoProjectName : feedback.projectName);
  const canBulkCreateIssue = feedback.status === "raw" || feedback.status === "retrying" || feedback.status === "failed";
  const hasRetry = feedback.status === "retrying" && feedback.nextRetryAt;
  const issueLabelKey = feedback.externalIssue?.url
    ? "projects.feedback.issue.created"
    : feedback.status === "issue_creation_pending"
      ? "projects.feedback.issue.inProgress"
      : "projects.feedback.issue.notCreated";
  const errorSeverity = feedback.status === "failed" ? "danger" : "warning";

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
          {demoFeedback ? <DemoBadge /> : <ProviderBadge provider={feedback.issueTarget.provider} />}
        </div>
        <h2>{cardTitle}</h2>
        <p>{displayMessage.message ? `"${displayMessage.message}"` : <T k="projects.feedback.noMessage" />}</p>
        {feedback.lastError ? (
          <div className={`error-callout compact-callout error-callout--${errorSeverity}`}>
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
          {displayMessage.reporter ? <span><T k="projects.feedback.sentBy" /> {displayMessage.reporter}</span> : null}
          <span><T k="projects.feedback.createdAtPrefix" /> {formatDate(feedback.createdAt)}</span>
        </div>
        <details className="feedback-disclosure" open={feedback.status === "failed" || feedback.status === "retrying"}>
          <summary><T k="projects.feedback.details" /></summary>
          <div className="feedback-disclosure-grid">
            <div className="issue-draft compact-issue-draft">
              <div>
                <p className="eyebrow"><T k="projects.feedback.draft" /></p>
                <strong>{demoFeedback ? workspaceDemoProjectName : `${feedback.issueTarget.namespace}/${feedback.issueTarget.project}`}</strong>
              </div>
              <span>{demoFeedback ? <T k="projects.feedback.demo" /> : draftLabels}</span>
              {feedback.payload.pins?.length ? (
                <span>{feedback.payload.pins.length} pin{feedback.payload.pins.length > 1 ? "s" : ""}</span>
              ) : feedback.payload.pin ? (
                <span>Pin: {Math.round(feedback.payload.pin.x)}, {Math.round(feedback.payload.pin.y)}</span>
              ) : null}
              {demoFeedback ? null : (
                <a className="inline-link" href={feedback.issueTarget.webUrl ?? "#"}>
                  <T k="projects.feedback.destination" />
                </a>
              )}
            </div>
            <div className="feedback-technical-summary">
              <span>Écran: {deviceContext}</span>
              {browserContext ? <span>Navigateur: {browserContext}</span> : null}
              {documentContext ? <span>Page: {documentContext}</span> : null}
              {networkContext ? <span>Réseau: {networkContext}</span> : null}
              <span>Viewport: {viewport}</span>
              {appEnvironmentSummary ? <span>{appEnvironmentSummary}</span> : null}
              <span>URL: {feedback.payload.metadata.url}</span>
            </div>
          </div>
        </details>
      </div>
      <div className="feedback-site-cell">
        <strong>{demoFeedback ? workspaceDemoProjectName : feedback.projectName}</strong>
        <span>{feedback.payload.metadata.path}</span>
      </div>
      <div className="feedback-status-cell">
        <span className={`status-dot ${feedback.status}`} aria-hidden="true" />
        <span className={`status-badge ${statusClasses[feedback.status]}`}>
          <T k={statusLabelKeys[feedback.status]} />
        </span>
      </div>
      <div className="feedback-capture-cell">
        {feedback.screenshotAsset ? (
          <div className="feedback-capture-preview">
            <ScreenshotPreview
              asset={feedback.screenshotAsset}
              feedback={{
                createdAt: feedback.createdAt,
                issueTarget: feedback.issueTarget,
                message: feedback.payload.message,
                projectName: demoFeedback ? workspaceDemoProjectName : feedback.projectName,
                status: feedback.status,
                title: feedback.issueDraft.title,
                type: feedback.payload.type
              }}
              metadata={feedback.payload.metadata}
              pin={feedback.payload.pin}
              pins={feedback.payload.pins}
            />
          </div>
        ) : (
          <span className="feedback-capture-empty">—</span>
        )}
      </div>
      <div className="feedback-issue-cell">
        <div className="feedback-issue-destination">
          {demoFeedback ? <DemoBadge /> : <ProviderBadge provider={feedback.issueTarget.provider} />}
          <span>{demoFeedback ? "Demo" : <T k={issueLabelKey} />}</span>
        </div>
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

function DemoBadge() {
  return <span className="status-badge demo-badge">Demo</span>;
}

function buildOnboardingChecklist(projects: ChangeThisProject[], feedbacks: StoredFeedback[]): OnboardingChecklistStep[] {
  const clientFeedbacks = feedbacks;
  const hasGitRoute = projects.some((project) => project.issueTarget.namespace && project.issueTarget.project);
  const hasSite = projects.length > 0;
  const hasFeedbackTest = clientFeedbacks.length > 0;
  const hasCreatedIssue = clientFeedbacks.some((feedback) =>
    Boolean(feedback.externalIssue?.url) || feedback.status === "sent_to_provider" || feedback.status === "resolved"
  );
  const doneStates = [hasGitRoute, hasSite, hasFeedbackTest, hasFeedbackTest, hasCreatedIssue];
  const currentIndex = doneStates.findIndex((isDone) => !isDone);
  const statusFor = (index: number): OnboardingStepStatus => {
    if (doneStates[index]) {
      return "done";
    }

    return index === currentIndex ? "current" : "pending";
  };

  return [
    {
      actionHref: "/settings/git-connections",
      actionLabel: "Connecter Git",
      copy: "Connectez GitHub ou GitLab, puis choisissez le dépôt qui recevra les issues.",
      icon: GitBranch,
      index: "1",
      status: statusFor(0),
      title: "Git connecté"
    },
    {
      actionHref: "/settings/connected-sites",
      actionLabel: "Créer le site",
      copy: "Créez un site avec une origine autorisée et une destination Git valide.",
      icon: Globe2,
      index: "2",
      status: statusFor(1),
      title: "Site configuré"
    },
    {
      actionHref: "/settings/connected-sites",
      actionLabel: "Voir le script",
      copy: "Installez la balise widget générée avec la clé publique du site.",
      icon: Code2,
      index: "3",
      status: statusFor(2),
      title: "Script installé"
    },
    {
      copy: "Envoyez un feedback test depuis le site configuré et vérifiez qu'il arrive ici.",
      icon: MessageSquareText,
      index: "4",
      status: statusFor(3),
      title: "Feedback reçu"
    },
    {
      actionHref: "/projects?status=active",
      actionLabel: "Créer l'issue",
      copy: "Créez l'issue externe depuis le feedback pour valider la boucle complète.",
      icon: CheckCircle2,
      index: "5",
      status: statusFor(4),
      title: "Issue créée"
    }
  ];
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
  if (filters.provider !== "all" && (isDemoFeedback(feedback) || feedback.issueTarget.provider !== filters.provider)) {
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

function isDemoProject(project: ChangeThisProject): boolean {
  return project.publicKey.startsWith(workspaceDemoProjectKeyPrefix) || project.id === "site_demo" || project.name === workspaceDemoProjectName;
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

function countFeedbacksByProject(feedbacks: StoredFeedback[]): Map<string, number> {
  return feedbacks.reduce((counts, feedback) => {
    counts.set(feedback.projectKey, (counts.get(feedback.projectKey) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
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

function formatFeedbackMessage(feedback: StoredFeedback): { message: string; reporter?: string } {
  const message = feedback.payload.message;
  const reporter = formatFeedbackReporter(feedback.payload.reporter);
  if (reporter) {
    return { message, reporter };
  }

  const match = message.match(/^([A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ' -]{1,48}):\s+(.+)$/);

  if (!match) {
    return { message };
  }

  return {
    reporter: match[1].trim(),
    message: match[2].trim()
  };
}

function formatFeedbackReporter(reporter: StoredFeedback["payload"]["reporter"]): string | undefined {
  if (!reporter?.name && !reporter?.email) {
    return undefined;
  }

  if (reporter.name && reporter.email) {
    return `${reporter.name} <${reporter.email}>`;
  }

  return reporter.name ?? reporter.email;
}

function formatFeedbackCardTitle(feedback: StoredFeedback, projectName: string): string {
  const typeLabel: Record<StoredFeedback["payload"]["type"], string> = {
    comment: "Note",
    pin: "Pin",
    screenshot: "Capture"
  };
  const path = feedback.payload.metadata.path || "/";

  return `${typeLabel[feedback.payload.type]} sur ${projectName}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatDeviceContext(metadata: StoredFeedback["payload"]["metadata"]): string {
  const { height, width } = metadata.viewport;
  const userAgent = metadata.userAgent;
  const deviceLabel = inferDeviceLabel(width, height, userAgent);
  const orientation = height >= width ? "portrait" : "paysage";
  const ratio = Number.isFinite(metadata.devicePixelRatio) && metadata.devicePixelRatio > 0
    ? ` · DPR ${formatCompactNumber(metadata.devicePixelRatio)}`
    : "";
  const screen = metadata.screen?.width && metadata.screen?.height
    ? ` · écran ${metadata.screen.width} x ${metadata.screen.height}`
    : "";

  return `${deviceLabel} ${orientation} · viewport ${width} x ${height}${ratio}${screen}`;
}

function inferDeviceLabel(width: number, height: number, userAgent: string): string {
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);

  if (/\biPad\b/i.test(userAgent)) {
    return "iPad";
  }

  if (/\biPhone\b|\biPod\b/i.test(userAgent)) {
    return "Mobile iPhone";
  }

  if (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent)) {
    return "Tablette Android";
  }

  if (/Mobile|Android|Windows Phone/i.test(userAgent) || shortSide < 700) {
    return "Mobile";
  }

  if (shortSide < 1024 && longSide < 1400) {
    return "Tablette";
  }

  return "Desktop";
}

function formatBrowserContext(userAgent: string): string | undefined {
  const browser = inferBrowserLabel(userAgent);
  const os = inferOperatingSystemLabel(userAgent);

  if (!browser && !os) {
    return undefined;
  }

  return [browser, os].filter(Boolean).join(" · ");
}

function formatDocumentContext(metadata: StoredFeedback["payload"]["metadata"]): string | undefined {
  if (!metadata.document) {
    return undefined;
  }

  const scroll = metadata.scroll ? ` · scroll ${Math.round(metadata.scroll.x)} x ${Math.round(metadata.scroll.y)}` : "";
  return `document ${metadata.document.width} x ${metadata.document.height}${scroll}`;
}

function formatNetworkContext(network: StoredFeedback["payload"]["metadata"]["network"]): string | undefined {
  if (!network) {
    return undefined;
  }

  const parts = [
    network.effectiveType,
    network.type,
    typeof network.downlink === "number" ? `${formatCompactNumber(network.downlink)} Mbps` : undefined,
    typeof network.rtt === "number" ? `${Math.round(network.rtt)} ms` : undefined,
    typeof network.saveData === "boolean" ? `économie données ${network.saveData ? "active" : "inactive"}` : undefined
  ].filter((part): part is string => Boolean(part));

  return parts.length ? parts.join(" · ") : undefined;
}

function inferBrowserLabel(userAgent: string): string | undefined {
  if (/Edg\//i.test(userAgent)) {
    return "Edge";
  }

  if (/OPR\//i.test(userAgent)) {
    return "Opera";
  }

  if (/SamsungBrowser\//i.test(userAgent)) {
    return "Samsung Internet";
  }

  if (/CriOS\//i.test(userAgent)) {
    return "Chrome iOS";
  }

  if (/Chrome\//i.test(userAgent)) {
    return "Chrome";
  }

  if (/FxiOS\//i.test(userAgent)) {
    return "Firefox iOS";
  }

  if (/Firefox\//i.test(userAgent)) {
    return "Firefox";
  }

  if (/Version\/.+Safari\//i.test(userAgent)) {
    return "Safari";
  }

  return undefined;
}

function inferOperatingSystemLabel(userAgent: string): string | undefined {
  if (/\biPad\b/i.test(userAgent)) {
    return "iPadOS";
  }

  if (/\biPhone\b|\biPod\b/i.test(userAgent)) {
    return "iOS";
  }

  if (/Android/i.test(userAgent)) {
    return "Android";
  }

  if (/Windows NT/i.test(userAgent)) {
    return "Windows";
  }

  if (/Mac OS X|Macintosh/i.test(userAgent)) {
    return "macOS";
  }

  if (/Linux/i.test(userAgent)) {
    return "Linux";
  }

  return undefined;
}

function formatCompactNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
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
