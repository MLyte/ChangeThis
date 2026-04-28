import Link from "next/link";
import Image from "next/image";
import type { StoredFeedback } from "../lib/feedback-repository";
import { getFeedbackRepository } from "../lib/feedback-repository";
import { listConfiguredProjects } from "../lib/project-registry";
import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";
import { T } from "./i18n";

export const dynamic = "force-dynamic";

const workflowKeys = ["home.workflow.1", "home.workflow.2", "home.workflow.3"];

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
    stateKey: project.issueTarget.webUrl ? "home.siteState.ready" : "home.siteState.configure"
  }));
  const liveSignals = [
    { labelKey: "home.metric.actionable", value: String(actionableFeedbacks.length), tone: actionableFeedbacks.length > 0 ? "warning" : "ok" },
    { labelKey: "home.metric.sites", value: String(projects.length), tone: "ok" },
    { labelKey: "home.metric.retries", value: String(retryCount), tone: retryCount > 0 ? "danger" : "ok" }
  ];

  return (
    <main className="shell app-home">
      <AppHeader
        navItems={[
          { href: "/projects", labelKey: "nav.issues" },
          { href: "/settings", labelKey: "nav.settings" }
        ]}
      />

      <section className="workspace-hero" aria-labelledby="product-title">
        <div className="workspace-copy">
          <p className="eyebrow"><T k="home.hero.eyebrow" /></p>
          <h1 id="product-title" className="product-title">
            <Image src="/assets/logo.svg" alt="" aria-hidden="true" className="product-title-logo" width={132} height={132} priority />
            <span>ChangeThis</span>
          </h1>
          <p className="hero-statement">
            <T k="home.hero.statement" />
          </p>
          <p className="lede">
            <T k="home.hero.lede" />
          </p>
          <div className="hero-actions">
            <Link className="button" href="/projects"><T k="home.hero.primary" /></Link>
            <Link className="button secondary-button" href="/demo"><T k="home.hero.secondary" /></Link>
          </div>
        </div>

        <ConsolePreview feedbacks={latestFeedbacks} siteRows={siteRows} />
      </section>

      <section className="ops-strip" aria-label="État opérationnel">
        {liveSignals.map((signal) => (
          <article className={`signal-card ${signal.tone}`} key={signal.labelKey}>
            <span><T k={signal.labelKey} /></span>
            <strong>{signal.value}</strong>
          </article>
        ))}
      </section>

      <section className="section product-section">
        <div className="section-heading compact">
          <p className="eyebrow"><T k="home.product.eyebrow" /></p>
          <h2><T k="home.product.title" /></h2>
        </div>
        <div className="product-grid">
          <article className="product-block">
            <h3><T k="home.product.inbox.title" /></h3>
            <p><T k="home.product.inbox.copy" /></p>
          </article>
          <article className="product-block">
            <h3><T k="home.product.config.title" /></h3>
            <p><T k="home.product.config.copy" /></p>
          </article>
          <article className="product-block">
            <h3><T k="home.product.draft.title" /></h3>
            <p><T k="home.product.draft.copy" /></p>
          </article>
          <article className="product-block">
            <h3><T k="home.product.retry.title" /></h3>
            <p><T k="home.product.retry.copy" /></p>
          </article>
        </div>
      </section>

      <section className="workflow-band">
        <div className="section-heading">
          <p className="eyebrow"><T k="home.workflow.eyebrow" /></p>
          <h2><T k="home.workflow.title" /></h2>
        </div>
        <div className="steps">
          {workflowKeys.map((item, index) => (
            <article className="step" key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p><T k={item} /></p>
            </article>
          ))}
        </div>
      </section>

      <section className="install-section">
        <div>
          <p className="eyebrow"><T k="home.install.eyebrow" /></p>
          <h2><T k="home.install.title" /></h2>
          <p className="lede">
            <T k="home.install.copy" />
          </p>
        </div>
        <pre className="code-block"><code>{`<script
  src="https://app.changethis.dev/widget.js"
  data-project="project_public_key"
  data-button-label="Feedback">
</script>`}</code></pre>
      </section>
      <AppFooter />
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
    stateKey: string;
  }>;
}) {
  return (
    <div className="console-preview" aria-label="Aperçu de la console ChangeThis">
      <div className="preview-topline">
        <span className="window-dot coral" />
        <span className="window-dot amber" />
        <span className="window-dot green" />
        <strong>Console ChangeThis</strong>
      </div>

      <div className="preview-layout">
        <aside className="preview-sidebar">
          <span className="sidebar-item active">Inbox</span>
          <span className="sidebar-item"><T k="home.preview.sidebar.sites" /></span>
          <span className="sidebar-item"><T k="home.preview.sidebar.integrations" /></span>
          <span className="sidebar-item">Retries</span>
        </aside>

        <div className="preview-main">
          <div className="preview-header">
            <div>
              <span className="mini-label">Inbox</span>
              <h2><T k="home.preview.header" /></h2>
            </div>
            <span className="status-badge needs_setup">{feedbacks.length} <T k="home.preview.recent" /></span>
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
                  <h3><T k="home.preview.empty.title" /></h3>
                  <p><T k="home.preview.empty.copy" /></p>
                </div>
                <span><T k="home.preview.ready" /></span>
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
                <em><T k={site.stateKey} /></em>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatStatus(status: StoredFeedback["status"]) {
  return <T k={`status.${status}`} />;
}
