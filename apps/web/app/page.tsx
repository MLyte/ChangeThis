import Link from "next/link";
import type { StoredFeedback } from "../lib/feedback-repository";
import { getFeedbackRepository } from "../lib/feedback-repository";
import { listConfiguredProjects } from "../lib/project-registry";

export const dynamic = "force-dynamic";

const workflow = [
  "Le widget capture le message, l'URL, le viewport, le pin et la capture.",
  "L'inbox qualifie le retour, affiche le brouillon et garde l'historique de retry.",
  "ChangeThis cree l'issue dans le repo GitHub ou GitLab lie au site."
];

export default async function HomePage() {
  const [projects, feedbacks] = await Promise.all([
    listConfiguredProjects(),
    getFeedbackRepository().list()
  ]);
  const actionableFeedbacks = feedbacks.filter((feedback) => feedback.status === "raw" || feedback.status === "retrying" || feedback.status === "failed");
  const retryCount = feedbacks.filter((feedback) => feedback.status === "retrying").length;
  const latestFeedbacks = feedbacks.slice(0, 3);
  const siteRows = projects.map((project) => ({
    name: project.name,
    origin: project.allowedOrigins.find((origin) => !origin.includes("localhost") && !origin.includes("127.0.0.1")) ?? "local demo",
    provider: project.issueTarget.provider,
    repo: `${project.issueTarget.namespace}/${project.issueTarget.project}`,
    state: project.issueTarget.webUrl ? "Pret" : "A configurer"
  }));
  const liveSignals = [
    { label: "Retours a traiter", value: String(actionableFeedbacks.length), tone: actionableFeedbacks.length > 0 ? "warning" : "ok" },
    { label: "Sites configures", value: String(projects.length), tone: "ok" },
    { label: "Retries en attente", value: String(retryCount), tone: retryCount > 0 ? "danger" : "ok" }
  ];

  return (
    <main className="shell app-home">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">CT</span>
          ChangeThis
        </Link>
        <nav className="nav" aria-label="Navigation principale">
          <Link className="link" href="/projects">Inbox</Link>
          <Link className="link" href="/demo">Demo widget</Link>
          <a className="link hide-mobile" href="https://github.com/MLyte/ChangeThis">GitHub</a>
          <Link className="button" href="/projects">Ouvrir la console</Link>
        </nav>
      </header>

      <section className="workspace-hero" aria-labelledby="product-title">
        <div className="workspace-copy">
          <p className="eyebrow">Console feedback</p>
          <h1 id="product-title">ChangeThis</h1>
          <p className="hero-statement">
            Une inbox produit pour transformer les retours clients en issues GitHub ou GitLab exploitables.
          </p>
          <p className="lede">
            Installez le widget sur chaque site, reliez le site a son repo, puis traitez les retours entrants avec
            contexte complet, brouillon d&apos;issue, et retries visibles.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/projects">Traiter l&apos;inbox</Link>
            <Link className="button secondary-button" href="/demo">Envoyer un retour test</Link>
          </div>
        </div>

        <ConsolePreview feedbacks={latestFeedbacks} siteRows={siteRows} />
      </section>

      <section className="ops-strip" aria-label="Etat operationnel">
        {liveSignals.map((signal) => (
          <article className={`signal-card ${signal.tone}`} key={signal.label}>
            <span>{signal.label}</span>
            <strong>{signal.value}</strong>
          </article>
        ))}
      </section>

      <section className="section product-section">
        <div className="section-heading compact">
          <p className="eyebrow">Premiere vue utilisable</p>
          <h2>Tout ce qu&apos;il faut pour passer du signal client a l&apos;action.</h2>
        </div>
        <div className="product-grid">
          <article className="product-block">
            <h3>Inbox durable</h3>
            <p>Les retours restent disponibles apres redemarrage, avec statuts, erreurs provider et prochain retry.</p>
          </article>
          <article className="product-block">
            <h3>Configuration par site</h3>
            <p>Chaque cle publique garde ses origines autorisees et son repo cible GitHub ou GitLab.</p>
          </article>
          <article className="product-block">
            <h3>Brouillon lisible</h3>
            <p>L&apos;issue contient message, page, viewport, langue, labels, pin, capture et donnees techniques.</p>
          </article>
          <article className="product-block">
            <h3>Reprise controlee</h3>
            <p>Les echecs d&apos;API sont visibles, rejouables manuellement, puis automatisables via la route de retries.</p>
          </article>
        </div>
      </section>

      <section className="workflow-band">
        <div className="section-heading">
          <p className="eyebrow">Flux produit</p>
          <h2>Un circuit court, mais tracable.</h2>
        </div>
        <div className="steps">
          {workflow.map((item, index) => (
            <article className="step" key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="install-section">
        <div>
          <p className="eyebrow">Installation widget</p>
          <h2>Une balise par site, une cle publique par projet.</h2>
          <p className="lede">
            Le bundle local expose le meme chemin que la production. La page demo permet de tester le flux complet
            sans compte client.
          </p>
        </div>
        <pre className="code-block"><code>{`<script
  src="https://app.changethis.dev/widget.js"
  data-project="project_public_key"
  data-button-label="Feedback">
</script>`}</code></pre>
      </section>
    </main>
  );
}

function ConsolePreview({
  feedbacks,
  siteRows
}: {
  feedbacks: StoredFeedback[];
  siteRows: Array<{
    name: string;
    origin: string;
    provider: string;
    repo: string;
    state: string;
  }>;
}) {
  return (
    <div className="console-preview" aria-label="Apercu de la console ChangeThis">
      <div className="preview-topline">
        <span className="window-dot coral" />
        <span className="window-dot amber" />
        <span className="window-dot green" />
        <strong>Console ChangeThis</strong>
      </div>

      <div className="preview-layout">
        <aside className="preview-sidebar">
          <span className="sidebar-item active">Inbox</span>
          <span className="sidebar-item">Sites</span>
          <span className="sidebar-item">Integrations</span>
          <span className="sidebar-item">Retries</span>
        </aside>

        <div className="preview-main">
          <div className="preview-header">
            <div>
              <span className="mini-label">Inbox</span>
              <h2>Retours entrants</h2>
            </div>
            <span className="status-badge needs_setup">{feedbacks.length} recents</span>
          </div>

          <div className="preview-list">
            {feedbacks.length > 0 ? (
              feedbacks.map((feedback) => (
                <article className="preview-feedback" key={feedback.id}>
                  <div>
                    <h3>{feedback.issueDraft.title}</h3>
                    <p>{feedback.projectName} - {feedback.payload.type} - {feedback.payload.metadata.viewport.width} x {feedback.payload.metadata.viewport.height}</p>
                  </div>
                  <span>{formatStatus(feedback.status)}</span>
                </article>
              ))
            ) : (
              <article className="preview-feedback">
                <div>
                  <h3>Aucun feedback pour le moment</h3>
                  <p>Envoyez un retour depuis la demo widget pour alimenter cette console.</p>
                </div>
                <span>pret</span>
              </article>
            )}
          </div>

          <div className="preview-sites">
            {siteRows.map((site) => (
              <div className="preview-site-row" key={site.name}>
                <strong>{site.name}</strong>
                <span>{site.origin}</span>
                <span>{site.provider}</span>
                <span>{site.repo}</span>
                <em>{site.state}</em>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatStatus(status: StoredFeedback["status"]): string {
  const labels: Record<StoredFeedback["status"], string> = {
    raw: "a creer",
    issue_creation_pending: "en cours",
    retrying: "retry",
    sent_to_provider: "envoye",
    failed: "echec",
    ignored: "ignore"
  };

  return labels[status];
}
