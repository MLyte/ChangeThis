import Link from "next/link";
import Image from "next/image";
import { Camera, GitPullRequestCreate, Inbox, MapPin, MessageSquare, MousePointerClick, RefreshCw, Send, Settings2, type LucideIcon } from "lucide-react";
import { isPublicSignupEnabled } from "../lib/auth";
import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";
import logoChangeThis from "./assets/logoChangeThis.png";
import { T } from "./i18n";
import { MarketingConsolePreview } from "./marketing-console-preview";
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

        <MarketingConsolePreview />
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

      <MobilePreviewSection />

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

function MobilePreviewSection() {
  return (
    <section className="mobile-proof-section" aria-labelledby="mobile-proof-title">
      <div className="mobile-proof-copy">
        <p className="eyebrow">Works on mobile too</p>
        <h2 id="mobile-proof-title">Le visiteur et l’admin gardent la boucle sous la main.</h2>
        <p className="lede">
          Le widget reste accessible côté client, et l’équipe peut suivre les retours entrants côté console sans attendre d’être revenue sur grand écran.
        </p>
        <div className="mobile-proof-points">
          <span>Côté visiteur</span>
          <span>Côté admin</span>
          <span>Contexte prêt pour issue</span>
        </div>
      </div>

      <div className="mobile-device-pair" aria-label="Aperçus mobiles ChangeThis côté visiteur et côté admin">
        <div className="iphone-pro-max-mockup user-mobile-mockup" aria-label="Aperçu mobile visiteur ChangeThis sur iPhone Pro Max">
          <span className="mobile-device-label">User</span>
          <div className="iphone-frame">
            <div className="iphone-screen">
              <div className="iphone-dynamic-island" />
              <div className="mobile-browser-bar">
                <span>app.changethis.dev/demo</span>
              </div>
              <div className="mobile-demo-page">
                <span className="mobile-demo-kicker">Atelier Nova</span>
                <h3>Objets calmes pour maisons vivantes.</h3>
                <p>Une page client fictive avec un formulaire, une collection et quelques zones à commenter.</p>
                <div className="mobile-demo-card" />
                <div className="mobile-demo-lines">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="mobile-widget-panel">
                <div className="mobile-widget-header">
                  <strong>Feedback</strong>
                  <span>Capture</span>
                </div>
                <div className="mobile-widget-tabs">
                  <span>Note</span>
                  <span className="active">Pin</span>
                  <span>Shot</span>
                </div>
                <div className="mobile-widget-text">Le bouton devis est trop bas sur mobile.</div>
                <button type="button">Envoyer</button>
              </div>
              <button className="mobile-feedback-button" type="button">Feedback</button>
            </div>
          </div>
        </div>

        <div className="iphone-pro-max-mockup admin-mobile-mockup" aria-label="Aperçu mobile admin ChangeThis sur iPhone Pro Max">
          <span className="mobile-device-label">Admin</span>
          <div className="iphone-frame">
            <div className="iphone-screen">
              <div className="iphone-dynamic-island" />
              <div className="mobile-browser-bar">
                <span>app.changethis.dev/projects</span>
              </div>
              <div className="mobile-admin-console">
                <div className="mobile-admin-header">
                  <span className="mobile-demo-kicker">Inbox</span>
                  <strong>3 retours entrants</strong>
                </div>
                <div className="mobile-admin-tabs">
                  <span className="active">À traiter</span>
                  <span>Échecs</span>
                </div>
                <article className="mobile-admin-feedback active">
                  <div>
                    <strong>Pin sur /checkout</strong>
                    <span>Cabinet Orion · mobile</span>
                  </div>
                  <em>À créer</em>
                </article>
                <article className="mobile-admin-feedback">
                  <div>
                    <strong>Capture sur /pricing</strong>
                    <span>Studio Lumen · GitLab</span>
                  </div>
                  <em>En file</em>
                </article>
                <article className="mobile-admin-feedback failed">
                  <div>
                    <strong>Note sur /demo</strong>
                    <span>Atelier Nova · GitHub</span>
                  </div>
                  <em>Échec</em>
                </article>
                <div className="mobile-admin-issue-card">
                  <span>Destination</span>
                  <strong>atelier-nova/portal-staging</strong>
                  <button type="button">Créer l’issue</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
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
