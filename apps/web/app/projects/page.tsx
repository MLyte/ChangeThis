import Link from "next/link";
import type { FeedbackStatus } from "@changethis/shared";
import { changeThisProjects, providerIntegrations } from "../../lib/demo-project";
import { getFeedbackRepository, type StoredFeedback } from "../../lib/feedback-repository";
import { FeedbackActions } from "./feedback-actions";
import { IssueDestinationSetup } from "./issue-destination-setup";

export const dynamic = "force-dynamic";

const statusLabels: Record<FeedbackStatus, string> = {
  raw: "issue a creer",
  issue_creation_pending: "creation en cours",
  retrying: "retry planifie",
  sent_to_provider: "envoye",
  failed: "echec",
  ignored: "ignore"
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
  const feedbacks = await getFeedbackRepository().list();
  const activeFeedbacks = feedbacks.filter((feedback) => feedback.status !== "ignored");
  const pendingFeedbacks = feedbacks.filter((feedback) => feedback.status === "raw" || feedback.status === "retrying" || feedback.status === "failed");

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">CT</span>
          ChangeThis
        </Link>
        <nav className="nav" aria-label="Project navigation">
          <code>{changeThisProjects[0]?.publicKey ?? "demo_project_key"}</code>
        </nav>
      </header>

      <section className="dashboard">
        <section className="inbox-panel" aria-labelledby="local-inbox-title">
          <div className="inbox-hero">
            <div>
              <p className="eyebrow">Retours collectes</p>
              <h1 id="local-inbox-title">Inbox durable</h1>
              <p className="lede">
                Traitez les retours entrants, verifiez le brouillon d&apos;issue et envoyez-le vers le repo configure.
              </p>
            </div>
            <div className="inbox-summary" aria-label="Etat de l'inbox">
              <strong>{pendingFeedbacks.length}</strong>
              <span>a remonter</span>
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
              <h2>Aucun retour pour le moment</h2>
              <p>Envoyez un feedback depuis la page demo: il restera disponible apres redemarrage du serveur.</p>
            </div>
          ) : (
            activeFeedbacks.map((feedback) => <FeedbackCard feedback={feedback} key={feedback.id} />)
          )}
        </section>

        <IssueDestinationSetup integrations={providerIntegrations} projects={changeThisProjects} />
      </section>
    </main>
  );
}

function FeedbackCard({ feedback }: { feedback: StoredFeedback }) {
  const draftLabels = feedback.issueDraft.labels.join(" / ");

  return (
    <article className="feedback-card">
      <div className="feedback-main">
        <div className="feedback-tags" aria-label="Meta feedback">
          <span className="status-badge connected">{feedback.payload.type}</span>
          <span className={`status-badge ${statusClasses[feedback.status]}`}>
            {statusLabels[feedback.status]}
          </span>
        </div>
        <h2>{feedback.issueDraft.title}</h2>
        <p>{feedback.payload.message || "Aucun message fourni."}</p>
        {feedback.lastError ? <p className="error-text">{feedback.lastError}</p> : null}
        <div className="feedback-meta">
          <span>{feedback.projectName}</span>
          <span>{feedback.payload.metadata.path}</span>
          <span>{formatDate(feedback.createdAt)}</span>
          {feedback.nextRetryAt ? <span>Retry: {formatDate(feedback.nextRetryAt)}</span> : null}
        </div>
      </div>
      <div className="issue-draft">
        <p className="eyebrow">Brouillon issue</p>
        <strong>{feedback.issueTarget.namespace}/{feedback.issueTarget.project}</strong>
        <span>{draftLabels}</span>
        {feedback.screenshotAsset ? <span>Capture: {Math.round(feedback.screenshotAsset.bytes / 1024)} Ko</span> : null}
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
