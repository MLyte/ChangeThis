import Link from "next/link";
import type { FeedbackStatus } from "@changethis/shared";
import { providerIntegrations } from "../../lib/demo-project";
import { getFeedbackRepository, type StoredFeedback } from "../../lib/feedback-repository";
import { listConfiguredProjects } from "../../lib/project-registry";
import { FeedbackActions } from "./feedback-actions";
import { IssueDestinationSetup } from "./issue-destination-setup";

export const dynamic = "force-dynamic";

const statusLabels: Record<FeedbackStatus, string> = {
  raw: "A creer",
  issue_creation_pending: "Creation en cours",
  retrying: "Retry planifie",
  sent_to_provider: "Envoye",
  failed: "Echec provider",
  ignored: "Ignore"
};

const statusClasses: Record<FeedbackStatus, string> = {
  raw: "needs_setup",
  issue_creation_pending: "needs_setup",
  retrying: "needs_setup",
  sent_to_provider: "connected",
  failed: "failed",
  ignored: "muted"
};

export default async function ProjectsPage() {
  const projects = await listConfiguredProjects();
  const feedbacks = await getFeedbackRepository().list();
  const activeFeedbacks = feedbacks.filter((feedback) => feedback.status !== "ignored");
  const pendingFeedbacks = feedbacks.filter((feedback) => feedback.status === "raw" || feedback.status === "retrying" || feedback.status === "failed");
  const retryFeedbacks = feedbacks.filter((feedback) => feedback.status === "retrying");
  const failedFeedbacks = feedbacks.filter((feedback) => feedback.status === "failed");
  const sentFeedbacks = feedbacks.filter((feedback) => feedback.status === "sent_to_provider");
  const ignoredFeedbacks = feedbacks.filter((feedback) => feedback.status === "ignored");
  const githubProjects = projects.filter((project) => project.issueTarget.provider === "github").length;
  const gitlabProjects = projects.filter((project) => project.issueTarget.provider === "gitlab").length;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">CT</span>
          ChangeThis
        </Link>
        <nav className="nav" aria-label="Project navigation">
          <code>{projects[0]?.publicKey ?? "demo_project_key"}</code>
        </nav>
      </header>

      <section className="dashboard">
        <div className="dashboard-header">
          <div>
            <p className="eyebrow">Console operationnelle</p>
            <h1>Inbox ChangeThis</h1>
            <p className="lede">
              Centralisez les retours des sites, controlez le brouillon d&apos;issue et envoyez-le vers la bonne
              destination GitHub ou GitLab.
            </p>
          </div>
          <Link className="button" href="/demo">Envoyer un retour test</Link>
        </div>

        <section className="ops-strip" aria-label="Etat production">
          <div>
            <span>{projects.length}</span>
            <strong>sites pilotes</strong>
          </div>
          <div>
            <span>{githubProjects}</span>
            <strong>vers GitHub</strong>
          </div>
          <div>
            <span>{gitlabProjects}</span>
            <strong>vers GitLab</strong>
          </div>
          <div>
            <span>{feedbacks.length}</span>
            <strong>feedbacks durables</strong>
          </div>
        </section>

        <div className="metric-grid" aria-label="Synthese de l'inbox">
          <MetricCard label="A traiter" value={pendingFeedbacks.length} tone="warning" />
          <MetricCard label="Retries" value={retryFeedbacks.length} tone="warning" />
          <MetricCard label="Echecs fixes requis" value={failedFeedbacks.length} tone="danger" />
          <MetricCard label="Issues creees" value={sentFeedbacks.length} tone="ok" />
        </div>

        <section className="inbox-panel" aria-labelledby="local-inbox-title">
          <div className="inbox-hero">
            <div>
              <p className="eyebrow">Retours collectes</p>
              <h2 id="local-inbox-title">File de traitement</h2>
              <p className="lede">
                Priorisez les nouveaux retours, rejouez les erreurs temporaires et gardez les retours ignores hors de
                la file principale.
              </p>
            </div>
            <div className="inbox-summary" aria-label="Etat de l'inbox">
              <strong>{pendingFeedbacks.length}</strong>
              <span>a traiter</span>
            </div>
          </div>

          <div className="inbox-toolbar">
            <a className="button" href="/demo">Tester le widget</a>
            <form action="/api/projects/retries" method="post">
              <button className="button secondary-button" type="submit">Rejouer les retries dus</button>
            </form>
          </div>

          {activeFeedbacks.length === 0 ? (
            <div className="empty-state">
              <h2>Aucun retour actif</h2>
              <p>
                Envoyez un feedback depuis la demo pour creer une premiere carte inbox. Les retours ignores restent
                archives et les nouveaux feedbacks reapparaitront ici.
              </p>
              <Link className="button" href="/demo">Tester le widget</Link>
            </div>
          ) : (
            activeFeedbacks.map((feedback) => <FeedbackCard feedback={feedback} key={feedback.id} />)
          )}
        </section>

        <IssueDestinationSetup integrations={providerIntegrations} projects={projects} />

        <section className="operations-panel" aria-labelledby="ops-title">
          <div className="setup-heading">
            <div>
              <p className="eyebrow">Etats et reprise</p>
              <h2 id="ops-title">Ce que ChangeThis garde visible</h2>
            </div>
          </div>
          <div className="ops-grid">
            <article className="ops-card">
              <h3>Erreur provider</h3>
              <p>Le message d&apos;erreur reste sur la carte. Si l&apos;erreur est temporaire, un prochain retry est planifie.</p>
            </article>
            <article className="ops-card">
              <h3>Retry manuel</h3>
              <p>Le bouton Rejouer relance la creation d&apos;issue pour un feedback precis, sans dupliquer une issue deja envoyee.</p>
            </article>
            <article className="ops-card">
              <h3>Archive propre</h3>
              <p>{ignoredFeedbacks.length} retour(s) ignore(s) ne polluent plus l&apos;inbox, mais restent dans le store local.</p>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: "ok" | "warning" | "danger" }) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
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
        <div className="feedback-tags" aria-label="Meta feedback">
          <span className="status-badge connected">{feedback.payload.type}</span>
          <span className={`status-badge ${statusClasses[feedback.status]}`}>
            {statusLabels[feedback.status]}
          </span>
        </div>
        <h2>{feedback.issueDraft.title}</h2>
        <p>{feedback.payload.message || "Aucun message fourni."}</p>
        {feedback.lastError ? (
          <div className="error-callout">
            <strong>Creation d&apos;issue impossible</strong>
            <span>{feedback.lastError}</span>
          </div>
        ) : null}
        {hasRetry ? (
          <div className="retry-callout">
            Prochain essai automatique: {formatDate(feedback.nextRetryAt as string)}
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
        <p className="eyebrow">Brouillon issue</p>
        <strong>{feedback.issueTarget.namespace}/{feedback.issueTarget.project}</strong>
        <span>{draftLabels}</span>
        {feedback.payload.pin ? <span>Pin: {Math.round(feedback.payload.pin.x)}, {Math.round(feedback.payload.pin.y)}</span> : null}
        {feedback.screenshotAsset ? <span>Capture: {Math.round(feedback.screenshotAsset.bytes / 1024)} Ko</span> : null}
        <a className="inline-link" href={feedback.issueTarget.webUrl ?? "#"}>Destination {feedback.issueTarget.provider}</a>
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
