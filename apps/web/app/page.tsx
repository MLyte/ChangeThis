import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Camera, GitPullRequestCreate, Inbox, MousePointerClick, RefreshCw, Settings2, Webhook, Workflow, type LucideIcon } from "lucide-react";
import { listConfiguredProjects } from "../lib/project-registry";
import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";
import logoChangeThis from "./assets/logoChangeThis.png";
import { T } from "./i18n";
import { ProviderIcon } from "./provider-badge";

export const dynamic = "force-dynamic";

const workflowSteps: Array<{ key: string; Icon: LucideIcon }> = [
  { key: "home.workflow.1", Icon: MousePointerClick },
  { key: "home.workflow.2", Icon: Inbox },
  { key: "home.workflow.3", Icon: GitPullRequestCreate }
];

const productBlocks: Array<{ titleKey: string; copyKey: string; Icon: LucideIcon }> = [
  { titleKey: "home.product.inbox.title", copyKey: "home.product.inbox.copy", Icon: Inbox },
  { titleKey: "home.product.config.title", copyKey: "home.product.config.copy", Icon: Settings2 },
  { titleKey: "home.product.draft.title", copyKey: "home.product.draft.copy", Icon: GitPullRequestCreate },
  { titleKey: "home.product.retry.title", copyKey: "home.product.retry.copy", Icon: RefreshCw }
];

export default async function HomePage() {
  const projects = await listConfiguredProjects();
  const siteRows = projects.map((project) => ({
    name: project.name,
    origin: project.allowedOrigins.find((origin) => !origin.includes("localhost") && !origin.includes("127.0.0.1")) ?? "local demo",
    provider: project.issueTarget.provider,
    repo: `${project.issueTarget.namespace}/${project.issueTarget.project}`,
    stateKey: project.issueTarget.webUrl ? "home.siteState.ready" : "home.siteState.configure"
  }));

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
            <Image src={logoChangeThis} alt="" aria-hidden="true" className="product-title-logo" priority />
            <span>ChangeThis</span>
          </h1>
          <HeroStatement />
          <p className="lede">
            <T k="home.hero.lede" />
          </p>
          <div className="hero-actions">
            <Link className="button" href="/projects"><T k="home.hero.primary" /></Link>
            <Link className="button secondary-button" href="/demo"><T k="home.hero.secondary" /></Link>
          </div>
        </div>

        <ConsolePreview siteRows={siteRows} />
      </section>

      <section className="section product-section">
        <div className="section-heading compact">
          <p className="eyebrow"><T k="home.product.eyebrow" /></p>
          <h2><T k="home.product.title" /></h2>
        </div>
        <div className="product-grid">
          {productBlocks.map(({ titleKey, copyKey, Icon }) => (
            <article className="product-block" key={titleKey}>
              <span className="product-icon" aria-hidden="true">
                <Icon size={22} strokeWidth={2.2} />
              </span>
              <h3><T k={titleKey} /></h3>
              <p><T k={copyKey} /></p>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-band">
        <div className="section-heading">
          <p className="eyebrow"><T k="home.workflow.eyebrow" /></p>
          <h2><T k="home.workflow.title" /></h2>
        </div>
        <div className="steps">
          {workflowSteps.map(({ key, Icon }, index) => (
            <article className="step" key={key}>
              <span className="step-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="step-icon" aria-hidden="true">
                <Icon size={24} strokeWidth={2.2} />
              </span>
              <p><T k={key} /></p>
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

function HeroStatement() {
  return (
    <p className="hero-statement">
      <T k="home.hero.statement.prefix" />{" "}
      <span className="hero-provider github">
        <ProviderIcon provider="github" className="hero-provider-icon" />
        <span>GitHub</span>
      </span>{" "}
      <T k="home.hero.statement.or" />{" "}
      <span className="hero-provider gitlab">
        <ProviderIcon provider="gitlab" className="hero-provider-icon" />
        <span>GitLab</span>
      </span>{" "}
      <T k="home.hero.statement.suffix" />
    </p>
  );
}

function ConsolePreview({
  siteRows
}: {
  siteRows: Array<{
    name: string;
    origin: string;
    provider: string;
    repo: string;
    stateKey: string;
  }>;
}) {
  const previewFeedbacks = [
    {
      title: "[Patrick] /demo - Le bouton devis est trop bas",
      context: "Patrick - page contact - pin - 1920 x 917",
      status: "à créer"
    },
    {
      title: "[Jean-Pierre] /demo - L'espace est trop grand",
      context: "Jean-Pierre - capture écran - 1920 x 917",
      status: "à créer"
    },
    {
      title: "[Feedback] /demo - Crénage du titre",
      context: "Demo ChangeThis - screenshot - 2560 x 1277",
      status: "échec"
    }
  ];
  const sidebarItems: Array<{ key: string; label: ReactNode; Icon: LucideIcon; active?: boolean }> = [
    { key: "inbox", label: "Inbox", Icon: Inbox, active: true },
    { key: "sites", label: <T k="home.preview.sidebar.sites" />, Icon: Webhook },
    { key: "integrations", label: <T k="home.preview.sidebar.integrations" />, Icon: GitPullRequestCreate },
    { key: "retries", label: "Retries", Icon: RefreshCw }
  ];

  return (
    <div className="console-preview" aria-label="Aperçu de la console ChangeThis">
      <div className="preview-topline">
        <span className="window-dot coral" />
        <span className="window-dot amber" />
        <span className="window-dot green" />
        <Workflow className="preview-title-icon" aria-hidden="true" size={16} strokeWidth={2.2} />
        <strong>Console ChangeThis</strong>
      </div>

      <div className="preview-layout">
        <aside className="preview-sidebar">
          {sidebarItems.map(({ key, label, Icon, active }) => (
            <span className={`sidebar-item${active ? " active" : ""}`} key={key}>
              <Icon aria-hidden="true" size={15} strokeWidth={2.2} />
              {label}
            </span>
          ))}
        </aside>

        <div className="preview-main">
          <div className="preview-header">
            <div>
              <span className="mini-label">Inbox</span>
              <h2><T k="home.preview.header" /></h2>
            </div>
            <span className="status-badge needs_setup">{previewFeedbacks.length} <T k="home.preview.recent" /></span>
          </div>

          <div className="preview-list">
            {previewFeedbacks.map((feedback) => (
              <article className="preview-feedback" key={feedback.title}>
                <div>
                  <Camera className="preview-card-icon" aria-hidden="true" size={16} strokeWidth={2.2} />
                  <h3>{feedback.title}</h3>
                  <p>{feedback.context}</p>
                </div>
                <span>{feedback.status}</span>
              </article>
            ))}
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
