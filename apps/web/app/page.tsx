import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Camera, GitPullRequestCreate, Inbox, MapPin, MessageSquare, MousePointerClick, RefreshCw, Send, Settings2, Webhook, Workflow, type LucideIcon } from "lucide-react";
import { isPublicSignupEnabled } from "../lib/auth";
import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";
import logoChangeThis from "./assets/logoChangeThis.png";
import { T } from "./i18n";
import { ProviderIcon } from "./provider-badge";

export const dynamic = "force-dynamic";

const workflowSteps: Array<{ key: string; emphasisKey: string; Icon: LucideIcon }> = [
  { key: "home.workflow.1", emphasisKey: "home.workflow.1.strong", Icon: MousePointerClick },
  { key: "home.workflow.2", emphasisKey: "home.workflow.2.strong", Icon: Inbox },
  { key: "home.workflow.3", emphasisKey: "home.workflow.3.strong", Icon: GitPullRequestCreate }
];

const productBlocks: Array<{ titleKey: string; copyKey: string; emphasisKey: string; Icon: LucideIcon }> = [
  { titleKey: "home.product.inbox.title", copyKey: "home.product.inbox.copy", emphasisKey: "home.product.inbox.strong", Icon: Inbox },
  { titleKey: "home.product.config.title", copyKey: "home.product.config.copy", emphasisKey: "home.product.config.strong", Icon: Settings2 },
  { titleKey: "home.product.draft.title", copyKey: "home.product.draft.copy", emphasisKey: "home.product.draft.strong", Icon: GitPullRequestCreate },
  { titleKey: "home.product.retry.title", copyKey: "home.product.retry.copy", emphasisKey: "home.product.retry.strong", Icon: RefreshCw }
];

export default async function HomePage() {
  const publicSignupEnabled = isPublicSignupEnabled();
  const siteRows = [
    {
      name: "Cabinet Orion - Espace rendez-vous",
      origin: "rdv.cabinet-orion.example",
      provider: "github",
      repo: "cabinet-orion/booking-portal",
      stateKey: "home.siteState.ready"
    },
    {
      name: "Studio Lumen - Shop vitrine",
      origin: "shop.studio-lumen.example",
      provider: "gitlab",
      repo: "studio-lumen/shopfront",
      stateKey: "home.siteState.ready"
    },
    {
      name: "Atelier Nova - Portail client",
      origin: "staging.portal-atelier-nova.example",
      provider: "github",
      repo: "atelier-nova/portal-staging",
      stateKey: "home.siteState.configure"
    }
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
            <Image src={logoChangeThis} alt="" aria-hidden="true" className="product-title-logo" priority />
            <span>ChangeThis</span>
          </h1>
          <HeroStatement />
          <p className="lede">
            <T k="home.hero.lede" />
          </p>
          {!publicSignupEnabled ? (
            <div className="local-mode-callout">
              <strong><T k="login.privateBeta.title" /></strong>
              <span><T k="home.hero.privateBeta" /></span>
            </div>
          ) : null}
          <div className="hero-actions">
            <Link className="button" href="/projects"><T k="home.hero.primary" /></Link>
            <Link className="button secondary-button" href="/demo"><T k="home.hero.secondary" /></Link>
          </div>
          {!publicSignupEnabled ? (
            <p className="microcopy">
              <Link className="inline-link" href="/login"><T k="home.hero.login" /></Link>
            </p>
          ) : null}
        </div>

        <ConsolePreview siteRows={siteRows} />
      </section>

      <section className="section product-section">
        <div className="section-heading compact">
          <p className="eyebrow"><T k="home.product.eyebrow" /></p>
          <h2><T k="home.product.title" /></h2>
        </div>
        <div className="product-grid">
          {productBlocks.map(({ titleKey, copyKey, emphasisKey, Icon }) => (
            <article className="product-block" key={titleKey}>
              <span className="product-icon" aria-hidden="true">
                <Icon size={22} strokeWidth={2.2} />
              </span>
              <h3><T k={titleKey} /></h3>
              <p><strong><T k={emphasisKey} /></strong> <T k={copyKey} /></p>
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
          {workflowSteps.map(({ key, emphasisKey }, index) => (
            <article className="step" key={key}>
              <span className="step-index">{String(index + 1).padStart(2, "0")}</span>
              <WorkflowReplica index={index} />
              <p><strong><T k={emphasisKey} /></strong> <T k={key} /></p>
            </article>
          ))}
        </div>
      </section>

      <section className="install-section">
        <div>
          <p className="eyebrow"><T k="home.install.eyebrow" /></p>
          <h2><T k="home.install.title" /></h2>
          <p className="lede">
            <strong><T k="home.install.strong" /></strong> <T k="home.install.copy" />
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
      <strong><T k="home.hero.statement.suffix" /></strong>
    </p>
  );
}

function WorkflowReplica({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="workflow-replica capture-replica" aria-hidden="true">
        <div className="replica-widget">
          <div className="replica-widget-header">
            <strong>Feedback</strong>
            <span>Capture</span>
          </div>
          <div className="replica-tabs">
            <span><MessageSquare size={12} /> Note</span>
            <span><MapPin size={12} /> Pin</span>
            <span className="active"><Camera size={12} /> Capture</span>
          </div>
          <div className="replica-textarea">Le bouton valider sort de l&apos;écran mobile.</div>
          <div className="replica-meta">
            <span>/checkout</span>
            <span>390 x 844</span>
          </div>
          <div className="replica-capture-frame">
            <span className="replica-pin">1</span>
          </div>
          <button type="button"><Send size={13} /> Envoyer</button>
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="workflow-replica inbox-replica" aria-hidden="true">
        <div className="replica-inbox-row">
          <span className="replica-status-dot" />
          <div>
            <strong>Capture sur /checkout</strong>
            <p>Envoyé par Jean-Pierre · Atelier Nova</p>
          </div>
          <span className="replica-tag">À créer</span>
        </div>
        <div className="replica-draft-line">
          <span>Brouillon, destination et contexte</span>
          <strong>GitHub</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="workflow-replica issue-replica" aria-hidden="true">
      <div className="replica-issue-card">
        <span className="replica-tag primary">Issue prête</span>
        <strong>[Feedback] /checkout - bouton caché sur iPhone</strong>
        <p>message · page · viewport · capture · pin</p>
      </div>
      <div className="replica-provider-row">
        <ProviderIcon provider="github" className="replica-provider-icon" />
        <span>atelier-nova/portal-staging</span>
      </div>
    </div>
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
