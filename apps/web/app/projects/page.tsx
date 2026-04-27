import Link from "next/link";
import type { StoredFeedback } from "../../lib/feedback-store";
import { changeThisProjects, demoProject, providerIntegrations } from "../../lib/demo-project";
import { listFeedbacks } from "../../lib/feedback-store";
import { IssueDestinationSetup } from "./issue-destination-setup";

export const dynamic = "force-dynamic";

export default function ProjectsPage() {
  const feedbacks = listFeedbacks();
  const pendingCount = feedbacks.filter((feedback) => feedback.status === "issue_creation_pending").length;
  const screenshotCount = feedbacks.filter((feedback) => Boolean(feedback.payload.screenshotDataUrl)).length;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">CT</span>
          ChangeThis
        </Link>
        <nav className="nav" aria-label="Project navigation">
          <code>{demoProject.publicKey}</code>
        </nav>
      </header>

      <section className="dashboard">
        <p className="eyebrow">MVP dashboard</p>
        <h1>Inbox feedback</h1>
        <p className="lede">
          Première vue produit pour vérifier le flux : retours reçus, mode utilisé, page concernée, et brouillon
          d&apos;issue prêt à envoyer.
        </p>

        <div className="dashboard-metrics" aria-label="Feedback metrics">
          <MetricCard label="Retours reçus" value={feedbacks.length} />
          <MetricCard label="Issues en attente" value={pendingCount} />
          <MetricCard label="Captures reçues" value={screenshotCount} />
        </div>

        <IssueDestinationSetup integrations={providerIntegrations} projects={changeThisProjects} />

        <section className="feedback-inbox" aria-labelledby="feedback-inbox-title">
          <div className="setup-heading">
            <div>
              <p className="eyebrow">Retours collectes</p>
              <h2 id="feedback-inbox-title">Inbox session locale</h2>
            </div>
            <Link className="button secondary-button" href="/demo">Tester le widget</Link>
          </div>

          {feedbacks.length > 0 ? (
            <div className="feedback-list">
              {feedbacks.map((feedback) => (
                <FeedbackCard feedback={feedback} key={feedback.id} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Aucun retour reçu dans cette session.</h3>
              <p>
                Ouvrez la démo, envoyez un feedback avec le widget, puis revenez ici. Le dashboard affichera le
                brouillon d&apos;issue généré par l&apos;API.
              </p>
              <Link className="button" href="/demo">Ouvrir la démo</Link>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function FeedbackCard({ feedback }: { feedback: StoredFeedback }) {
  const message = feedback.payload.message.trim() || "Aucun message fourni.";

  return (
    <article className="feedback-card">
      <div className="feedback-main">
        <div className="feedback-topline">
          <span className={`mode-badge ${feedback.payload.type}`}>{feedback.payload.type}</span>
          <span className="status-badge needs_setup">{formatStatus(feedback.status)}</span>
          {feedback.payload.screenshotDataUrl ? <span className="status-badge connected">capture</span> : null}
        </div>
        <h3>{feedback.issueDraft.title}</h3>
        <p>{message}</p>
        <div className="feedback-meta">
          <span>{feedback.project.name}</span>
          <span>{feedback.payload.metadata.path}</span>
          <span>{formatDate(feedback.receivedAt)}</span>
        </div>
      </div>

      <aside className="issue-draft-preview" aria-label="Issue draft">
        <span>Brouillon issue</span>
        <strong>{feedback.issueDraft.labels.join(" / ")}</strong>
        <p>{feedback.payload.pin?.selector ? `Element: ${feedback.payload.pin.selector}` : feedback.payload.metadata.title}</p>
      </aside>
    </article>
  );
}

function formatStatus(status: StoredFeedback["status"]): string {
  const labels: Record<StoredFeedback["status"], string> = {
    raw: "brut",
    issue_creation_pending: "issue à créer",
    sent_to_provider: "envoyé",
    failed: "échec"
  };

  return labels[status];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-BE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
