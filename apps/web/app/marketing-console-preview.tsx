import { GitPullRequestCreate, MessageSquare, MousePointerClick, Workflow } from "lucide-react";
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

const statusConfig: Record<PreviewFeedbackStatus, { badgeClass: string; label: string }> = {
  raw: { badgeClass: "needs_setup", label: "Nouveau" },
  issue_creation_pending: { badgeClass: "issue_creation_pending", label: "En file" },
  retrying: { badgeClass: "retrying", label: "À revoir" },
  sent_to_provider: { badgeClass: "connected", label: "Créée" }
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
  const activeFeedback = previewFeedbacks[0];

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
        <section className="dashboard-preview-inbox" aria-labelledby="preview-inbox-title">
          <div className="dashboard-preview-header">
            <div>
              <p className="eyebrow"><T k="home.preview.badge" /></p>
              <h2 id="preview-inbox-title"><T k="home.preview.header" /></h2>
            </div>
            <span className="status-badge needs_setup"><T k="home.preview.private" /></span>
          </div>

          <div className="dashboard-preview-metrics" aria-hidden="true">
            <span><strong>1</strong> <T k="home.preview.metric.signal" /></span>
            <span><strong>390</strong> <T k="home.preview.metric.viewport" /></span>
            <span><strong>Git</strong> <T k="home.preview.metric.destination" /></span>
          </div>

          <div className="feedback-list" role="list" aria-label="Retours récents">
            {previewFeedbacks.map((feedback) => <PreviewFeedbackRow feedback={feedback} key={feedback.id} />)}
          </div>
        </section>

        <aside className="dashboard-side-panel dashboard-preview-side" aria-label="Synthèse ChangeThis">
          <section className="preview-detail-card">
            <div className="preview-detail-heading">
              <span className="preview-detail-icon" aria-hidden="true">
                <MousePointerClick size={17} strokeWidth={2.2} />
              </span>
              <div>
                <p className="eyebrow"><T k="home.preview.draft.eyebrow" /></p>
                <h2>{activeFeedback.title}</h2>
              </div>
            </div>
            <p>{activeFeedback.message}</p>
            <div className="preview-context-grid">
              <span><strong><T k="home.preview.context.page" /></strong>{activeFeedback.path}</span>
              <span><strong><T k="home.preview.context.viewport" /></strong>390 x 844</span>
              <span><strong><T k="home.preview.context.type" /></strong>{activeFeedback.type}</span>
              <span><strong><T k="home.preview.context.received" /></strong>{activeFeedback.receivedAt}</span>
            </div>
            <div className="preview-capture-card" aria-hidden="true">
              <span className="preview-pin">1</span>
              <div />
              <div />
            </div>
          </section>

          <section className="preview-route-card">
            <div className="preview-route-heading">
              <p className="eyebrow"><T k="home.preview.route.eyebrow" /></p>
              <h2><T k="home.preview.route.title" /></h2>
            </div>
            <div className="preview-issue-line">
              <GitPullRequestCreate aria-hidden="true" size={17} strokeWidth={2.2} />
              <span>[Feedback] /checkout - bouton trop bas</span>
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
    <article className={`dashboard-preview-feedback-row ${feedback.status}`} role="listitem">
      <span className="preview-feedback-type" aria-hidden="true">
        {feedback.type === "note" ? <MessageSquare size={15} strokeWidth={2.2} /> : <MousePointerClick size={15} strokeWidth={2.2} />}
      </span>
      <div className="feedback-main">
        <h2>{feedback.title}</h2>
        <p>{feedback.message}</p>
        <div className="feedback-meta">
          <span>{feedback.site}</span>
          <span>{feedback.path}</span>
        </div>
      </div>
      <div className="preview-feedback-state">
        <span className={`status-badge ${status.badgeClass}`}>{status.label}</span>
        <ProviderBadge provider={feedback.provider} />
      </div>
    </article>
  );
}
