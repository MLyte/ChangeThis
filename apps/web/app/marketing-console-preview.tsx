import { CheckCircle2, Clock3, GitPullRequestCreate, Inbox, RotateCcw, Workflow, type LucideIcon } from "lucide-react";
import { T } from "./i18n";
import { ProviderBadge } from "./provider-badge";

type PreviewFeedbackStatus = "raw" | "issue_creation_pending" | "retrying" | "sent_to_provider";

type PreviewFeedback = {
  id: string;
  title: string;
  message: string;
  site: string;
  path: string;
  type: "pin" | "capture" | "note";
  status: PreviewFeedbackStatus;
  issueState: string;
  provider: "github" | "gitlab";
  receivedAt: string;
};

const statusConfig: Record<PreviewFeedbackStatus, { badgeClass: string; label: string; metricTone: "ok" | "warning" | "danger" }> = {
  raw: { badgeClass: "needs_setup", label: "Nouveau", metricTone: "warning" },
  issue_creation_pending: { badgeClass: "issue_creation_pending", label: "En file", metricTone: "warning" },
  retrying: { badgeClass: "retrying", label: "À revoir", metricTone: "warning" },
  sent_to_provider: { badgeClass: "connected", label: "Créée", metricTone: "ok" }
};

const previewFeedbacks: PreviewFeedback[] = [
  {
    id: "fb-preview-1",
    title: "Pin sur /checkout",
    message: "Patrick: le bouton devis descend sous le pli mobile.",
    site: "Cabinet Orion",
    path: "/checkout",
    type: "pin",
    status: "raw",
    issueState: "Non créée",
    provider: "github",
    receivedAt: "09:41"
  },
  {
    id: "fb-preview-2",
    title: "Capture sur /pricing",
    message: "Jean-Pierre: l’espace entre les cartes paraît trop grand.",
    site: "Studio Lumen",
    path: "/pricing",
    type: "capture",
    status: "issue_creation_pending",
    issueState: "En cours",
    provider: "gitlab",
    receivedAt: "09:24"
  },
  {
    id: "fb-preview-3",
    title: "Note sur /demo",
    message: "Crénage du titre à vérifier sur grand écran.",
    site: "Atelier Nova",
    path: "/demo",
    type: "note",
    status: "retrying",
    issueState: "À relancer",
    provider: "github",
    receivedAt: "08:58"
  }
];

const previewRoutes = [
  {
    name: "Cabinet Orion",
    repo: "cabinet-orion/booking-portal",
    provider: "github" as const
  },
  {
    name: "Studio Lumen",
    repo: "studio-lumen/shopfront",
    provider: "gitlab" as const
  },
  {
    name: "Atelier Nova",
    repo: "atelier-nova/portal-staging",
    provider: "github" as const
  }
];

export function MarketingConsolePreview() {
  const activeCount = previewFeedbacks.filter((feedback) => feedback.status !== "sent_to_provider").length;
  const queuedCount = previewFeedbacks.filter((feedback) => feedback.status === "issue_creation_pending").length;
  const reviewCount = previewFeedbacks.filter((feedback) => feedback.status === "retrying").length;

  return (
    <div className="console-preview dashboard-preview-console" aria-label="Aperçu de la console ChangeThis">
      <div className="preview-topline">
        <span className="window-dot coral" />
        <span className="window-dot amber" />
        <span className="window-dot green" />
        <Workflow className="preview-title-icon" aria-hidden="true" size={16} strokeWidth={2.2} />
        <strong>Console ChangeThis</strong>
      </div>

      <div className="dashboard-preview-workbench">
        <section className="inbox-panel compact-inbox dashboard-preview-inbox" aria-labelledby="preview-inbox-title">
          <div className="inbox-hero compact-inbox-header">
            <div>
              <p className="eyebrow">Inbox</p>
              <h2 id="preview-inbox-title"><T k="home.preview.header" /></h2>
            </div>
            <span className="status-badge needs_setup">{previewFeedbacks.length} <T k="home.preview.recent" /></span>
          </div>

          <nav className="dashboard-view-tabs" aria-label="Vue de démonstration">
            <span className="view-tab active">File active <span>{activeCount}</span></span>
            <span className="view-tab">Historique <span>8</span></span>
            <span className="view-tab">Tous <span>11</span></span>
          </nav>

          <div className="dashboard-preview-filter-row" aria-hidden="true">
            <span>Recherche</span>
            <span>Statut: action requise</span>
            <span>Site: tous</span>
          </div>

          <div className="feedback-table-head" aria-hidden="true">
            <span />
            <span>Feedback</span>
            <span>Site / page</span>
            <span>Statut</span>
            <span>Issue</span>
            <span>Reçu</span>
            <span>Actions</span>
          </div>

          <div className="feedback-list" role="list" aria-label="Retours récents">
            {previewFeedbacks.map((feedback) => <PreviewFeedbackRow feedback={feedback} key={feedback.id} />)}
          </div>
        </section>

        <aside className="dashboard-side-panel dashboard-preview-side" aria-label="Synthèse ChangeThis">
          <section className="side-panel-section status-side-section">
            <div className="side-panel-heading">
              <p className="eyebrow">Synthèse</p>
              <h2>File actuelle</h2>
            </div>
            <div className="side-status-stack">
              <PreviewMetric icon={Inbox} label="À traiter" tone="warning" value={activeCount} />
              <PreviewMetric icon={Clock3} label="En file" tone="warning" value={queuedCount} />
              <PreviewMetric icon={RotateCcw} label="Relances" tone="warning" value={1} />
              <PreviewMetric icon={RotateCcw} label="À revoir" tone="warning" value={reviewCount} />
              <PreviewMetric icon={CheckCircle2} label="Résolus" tone="ok" value={8} />
            </div>
          </section>

          <section className="side-panel-section">
            <div className="side-panel-heading">
              <p className="eyebrow">Routage</p>
              <h2>Sites connectés</h2>
            </div>
            <div className="route-summary">
              <strong>3/3</strong>
              <span>sites prêts à créer des issues</span>
            </div>
            <div className="site-route-list">
              {previewRoutes.map((route) => (
                <article className="site-route-row" key={route.repo}>
                  <div>
                    <strong>{route.name}</strong>
                    <span>{route.repo}</span>
                  </div>
                  <ProviderBadge provider={route.provider} />
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PreviewFeedbackRow({ feedback }: { feedback: PreviewFeedback }) {
  const status = statusConfig[feedback.status];

  return (
    <article className={`feedback-card compact-feedback-row dashboard-preview-feedback-row ${feedback.status}`} role="listitem">
      <span className="feedback-select" aria-hidden="true">
        <span className="dashboard-preview-checkbox" />
      </span>
      <div className="feedback-main">
        <div className="feedback-tags mobile-feedback-tags" aria-label="Métadonnées du feedback">
          <span className="status-badge connected">{feedback.type}</span>
          <span className={`status-badge ${status.badgeClass}`}>{status.label}</span>
          <ProviderBadge provider={feedback.provider} />
        </div>
        <h2>{feedback.title}</h2>
        <p>{feedback.message}</p>
        <div className="feedback-meta">
          <span>{feedback.site}</span>
          <span>{feedback.path}</span>
          <span>{feedback.type}</span>
        </div>
      </div>
      <div className="feedback-site-cell">
        <strong>{feedback.site}</strong>
        <span>{feedback.path}</span>
      </div>
      <div className="feedback-status-cell">
        <span className={`status-dot ${feedback.status}`} aria-hidden="true" />
        <span className={`status-badge ${status.badgeClass}`}>{status.label}</span>
      </div>
      <div className="feedback-issue-cell">
        <ProviderBadge provider={feedback.provider} />
        <span>{feedback.issueState}</span>
      </div>
      <div className="feedback-received-cell">
        <span>{feedback.receivedAt}</span>
      </div>
      <div className="feedback-actions">
        <span className="button secondary-button dashboard-preview-action">
          <GitPullRequestCreate aria-hidden="true" className="ui-icon" size={14} strokeWidth={2.2} />
          Issue
        </span>
      </div>
    </article>
  );
}

function PreviewMetric({
  icon: Icon,
  label,
  tone,
  value
}: {
  icon: LucideIcon;
  label: string;
  tone: "ok" | "warning" | "danger";
  value: number;
}) {
  return (
    <article className={`status-metric ${tone}`}>
      <Icon aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
