import Image from "next/image";
import { redirect } from "next/navigation";
import { CalendarClock, CheckCircle2, FileText, GitBranch, GitPullRequestCreate, Inbox, Mail, MessageSquare, MonitorCheck, MousePointerClick, Route, ShieldCheck, Smartphone, Sparkles, Users, type LucideIcon } from "lucide-react";
import { joinPublicLaunchWaitlist } from "../lib/supabase-server";
import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";
import logoChangeThis from "./assets/logoChangeThis.png";
import { T, TRich } from "./i18n";
import { MarketingConsolePreview } from "./marketing-console-preview";
import { ProviderBadge, ProviderIcon } from "./provider-badge";

export const dynamic = "force-dynamic";

const betaBlocks: Array<{ titleKey: string; copyKey: string; Icon: LucideIcon }> = [
  { titleKey: "home.beta.capture.title", copyKey: "home.beta.capture.copy", Icon: MousePointerClick },
  { titleKey: "home.beta.inbox.title", copyKey: "home.beta.inbox.copy", Icon: Inbox },
  { titleKey: "home.beta.routing.title", copyKey: "home.beta.routing.copy", Icon: Route },
  { titleKey: "home.beta.access.title", copyKey: "home.beta.access.copy", Icon: ShieldCheck }
];

const waitlistPoints: Array<{ key: string; Icon: LucideIcon }> = [
  { key: "home.waitlist.point.1", Icon: CheckCircle2 },
  { key: "home.waitlist.point.2", Icon: GitBranch },
  { key: "home.waitlist.point.3", Icon: Sparkles }
];

const problemPoints: Array<{ sourceKey: string; realityKey: string; consequenceKey: string }> = [
  {
    sourceKey: "home.problem.example.1.source",
    realityKey: "home.problem.example.1.reality",
    consequenceKey: "home.problem.example.1.consequence"
  },
  {
    sourceKey: "home.problem.example.2.source",
    realityKey: "home.problem.example.2.reality",
    consequenceKey: "home.problem.example.2.consequence"
  },
  {
    sourceKey: "home.problem.example.3.source",
    realityKey: "home.problem.example.3.reality",
    consequenceKey: "home.problem.example.3.consequence"
  }
];

const workflowSteps: Array<{ titleKey: string; copyKey: string; Icon: LucideIcon }> = [
  { titleKey: "home.workflow.capture.title", copyKey: "home.workflow.capture.copy", Icon: MessageSquare },
  { titleKey: "home.workflow.triage.title", copyKey: "home.workflow.triage.copy", Icon: Inbox },
  { titleKey: "home.workflow.issue.title", copyKey: "home.workflow.issue.copy", Icon: GitPullRequestCreate }
];

const betaNotes: Array<{ key: string; Icon: LucideIcon }> = [
  { key: "home.beta.note.1", Icon: MousePointerClick },
  { key: "home.beta.note.2", Icon: Users },
  { key: "home.beta.note.3", Icon: GitBranch },
  { key: "home.beta.note.4", Icon: CalendarClock }
];

const mobileProofPoints: Array<{ key: string; Icon: LucideIcon }> = [
  { key: "home.mobile.point.visitor", Icon: Smartphone },
  { key: "home.mobile.point.team", Icon: MonitorCheck },
  { key: "home.mobile.point.context", Icon: FileText }
];

type HomePageProps = {
  searchParams?: Promise<{
    waitlist?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const waitlistStatus = normalizeWaitlistStatus(params?.waitlist);

  async function waitlistAction(formData: FormData) {
    "use server";

    const email = formData.get("email")?.toString().trim() ?? "";
    const result = await joinPublicLaunchWaitlist({
      email,
      source: "homepage"
    });

    if (!result.ok) {
      redirect(`/?waitlist=${encodeURIComponent(result.error)}`);
    }

    redirect(`/?waitlist=${encodeURIComponent(result.status)}`);
  }

  return (
    <main className="shell app-home">
      <AppHeader suppressAuthActions suppressSession />

      <section className="home-section home-hero home-grid" aria-labelledby="product-title">
        <div className="home-hero-copy">
          <p className="eyebrow"><T k="home.hero.eyebrow" /></p>
          <h1 id="product-title" className="product-title">
            <Image src={logoChangeThis} alt="" aria-hidden="true" className="product-title-logo" priority />
            <span className="brand-wordmark hero-wordmark" aria-label="ChangeThis">
              <span>Change</span><span className="brand-wordmark-accent">This</span>
            </span>
          </h1>
          <HeroStatement />
          <p className="lede">
            <TRich k="home.hero.lede" />
          </p>
          <WaitlistForm action={waitlistAction} waitlistStatus={waitlistStatus} />
        </div>

        <div className="home-hero-preview">
          <MarketingConsolePreview />
        </div>
      </section>

      <section className="home-section problem-section problem-editorial">
        <div className="home-section-header">
          <p className="eyebrow"><T k="home.problem.eyebrow" /></p>
          <h2><T k="home.problem.question" /></h2>
          <p className="problem-intro"><T k="home.problem.intro" /></p>
        </div>
        <div className="problem-list problem-quotes">
          {problemPoints.map(({ sourceKey, realityKey, consequenceKey }) => (
            <article className="problem-item problem-quote" key={realityKey}>
              <div className="problem-item-copy">
                <p className="problem-source"><T k={sourceKey} /></p>
                <blockquote>
                  <span className="quote-mark" aria-hidden="true">“</span>
                  <p><TRich k={realityKey} /></p>
                </blockquote>
                <p className="problem-consequence"><TRich k={consequenceKey} /></p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section product-section">
        <div className="home-section-header compact">
          <p className="eyebrow"><T k="home.beta.eyebrow" /></p>
          <h2><T k="home.beta.title" /></h2>
        </div>
        <div className="home-card-grid product-grid">
          {betaBlocks.map(({ titleKey, copyKey, Icon }) => (
            <article className="product-block" key={titleKey}>
              <span className="product-icon" aria-hidden="true">
                <Icon size={22} strokeWidth={2.2} />
              </span>
              <h3><T k={titleKey} /></h3>
              <p><TRich k={copyKey} /></p>
            </article>
          ))}
        </div>
      </section>

      <MobilePreviewSection />

      <section className="home-section workflow-band">
        <div className="home-section-header">
          <p className="eyebrow"><T k="home.workflow.eyebrow" /></p>
          <h2><T k="home.workflow.title" /></h2>
        </div>
        <div className="steps">
          {workflowSteps.map(({ titleKey, copyKey, Icon }, index) => (
            <article className="step" key={titleKey}>
              <span className="step-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="step-icon" aria-hidden="true">
                <Icon size={22} strokeWidth={2.2} />
              </span>
              <h3><T k={titleKey} /></h3>
              <p><TRich k={copyKey} /></p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section beta-scope-section">
        <div className="home-section-header compact">
          <p className="eyebrow"><T k="home.beta.scope.eyebrow" /></p>
          <h2><T k="home.beta.scope.title" /></h2>
        </div>
        <ul className="beta-scope-list">
          {betaNotes.map(({ key, Icon }) => (
            <li key={key}>
              <Icon size={17} strokeWidth={2.4} aria-hidden="true" />
              <span><TRich k={key} /></span>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-section waitlist-closing-section">
        <div>
          <span className="closing-icon" aria-hidden="true">
            <Sparkles size={22} strokeWidth={2.3} />
          </span>
          <p className="eyebrow"><T k="home.closing.eyebrow" /></p>
          <h2><T k="home.closing.title" /></h2>
          <p className="lede">
            <TRich k="home.closing.copy" />
          </p>
        </div>
        <WaitlistForm action={waitlistAction} compact waitlistStatus={waitlistStatus} />
      </section>
      <AppFooter suppressSession />
    </main>
  );
}

function normalizeWaitlistStatus(value?: string): "joined" | "existing" | "error" | undefined {
  if (value === "joined" || value === "existing") {
    return value;
  }

  if (value === "invalid" || value === "missing" || value === "unavailable") {
    return "error";
  }

  return undefined;
}

function MobilePreviewSection() {
  return (
    <section className="home-section mobile-proof-section" aria-labelledby="mobile-proof-title">
      <div className="mobile-proof-copy">
        <p className="eyebrow"><T k="home.mobile.eyebrow" /></p>
        <h2 id="mobile-proof-title">
          <span className="mobile-title-intro"><T k="home.mobile.title.intro" /></span>
          <span className="mobile-title-impact"><T k="home.mobile.title.impact" /></span>
        </h2>
        <p className="lede">
          <TRich k="home.mobile.copy" />
        </p>
        <div className="mobile-proof-points">
          {mobileProofPoints.map(({ key, Icon }) => (
            <span key={key}>
              <Icon size={15} strokeWidth={2.4} aria-hidden="true" />
              <T k={key} />
            </span>
          ))}
        </div>
      </div>

      <div className="mobile-device-pair" aria-label="Aperçus mobiles ChangeThis côté visiteur et côté équipe">
        <div className="iphone-pro-max-mockup user-mobile-mockup" aria-label="Aperçu mobile visiteur ChangeThis">
          <span className="mobile-device-label"><T k="home.mobile.label.visitor" /></span>
          <div className="iphone-frame">
            <div className="iphone-screen">
              <div className="iphone-dynamic-island" />
              <div className="mobile-browser-bar">
                <span>atelier-nova.be</span>
              </div>
              <div className="mobile-demo-page">
                <span className="mobile-demo-kicker">Atelier Nova</span>
                <h3>Objets calmes pour maisons vivantes.</h3>
                <p>Une page client avec formulaire, collection et zones à commenter.</p>
                <div className="mobile-demo-card" />
                <div className="mobile-demo-lines">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="mobile-widget-panel">
                <div className="mobile-widget-header">
                  <strong>Retour</strong>
                  <span>Capture</span>
                </div>
                <div className="mobile-widget-tabs">
                  <span>Note</span>
                  <span className="active">Repère</span>
                  <span>Capture</span>
                </div>
                <div className="mobile-widget-text">Le bouton devis est trop bas sur mobile.</div>
                <button type="button">Envoyer</button>
              </div>
              <button className="mobile-feedback-button" type="button">Retour</button>
            </div>
          </div>
        </div>

        <div className="iphone-pro-max-mockup admin-mobile-mockup" aria-label="Aperçu mobile équipe ChangeThis">
          <span className="mobile-device-label"><T k="home.mobile.label.team" /></span>
          <div className="iphone-frame">
            <div className="iphone-screen">
              <div className="iphone-dynamic-island" />
              <div className="mobile-browser-bar">
                <span>app.changethis.dev</span>
              </div>
              <div className="mobile-admin-console mobile-dashboard-shell">
                <div className="mobile-dashboard-header">
                  <div>
                    <span className="mobile-demo-kicker">Console opérationnelle</span>
                    <strong>Retours ChangeThis</strong>
                  </div>
                  <button type="button">Tester</button>
                </div>
                <div className="mobile-dashboard-tabs" aria-hidden="true">
                  <span className="active">File active <strong>3</strong></span>
                  <span>Historique <strong>8</strong></span>
                  <span>Tous <strong>11</strong></span>
                </div>
                <div className="mobile-dashboard-filters" aria-hidden="true">
                  <span>Statut: action requise</span>
                  <span>Site: tous</span>
                  <span>Git: tous</span>
                </div>
                <div className="mobile-dashboard-feedback-list">
                  <article className="mobile-dashboard-feedback active">
                    <div className="mobile-dashboard-feedback-main">
                      <div className="mobile-dashboard-tags">
                        <span className="status-badge needs_setup">À créer</span>
                        <ProviderBadge provider="github" />
                      </div>
                      <strong>Repère sur /checkout</strong>
                      <p>Le bouton devis est trop bas sur mobile.</p>
                      <span>Cabinet Orion · /checkout · il y a 4 min</span>
                    </div>
                    <div className="mobile-dashboard-issue">
                      <span>Brouillon, destination et contexte</span>
                      <strong>cabinet-orion/booking-flow</strong>
                    </div>
                  </article>
                  <article className="mobile-dashboard-feedback">
                    <div className="mobile-dashboard-feedback-main">
                      <div className="mobile-dashboard-tags">
                        <span className="status-badge issue_creation_pending">En file</span>
                        <ProviderBadge provider="gitlab" />
                      </div>
                      <strong>Capture sur /pricing</strong>
                      <p>La carte Pro masque le détail du tarif annuel.</p>
                      <span>Studio Lumen · /pricing · il y a 18 min</span>
                    </div>
                  </article>
                </div>
                <div className="mobile-dashboard-summary">
                  <div className="mobile-dashboard-summary-header">
                    <span>Synthèse</span>
                    <strong>File actuelle</strong>
                  </div>
                  <div className="mobile-dashboard-metric-row">
                    <span className="warning"><strong>1</strong> À traiter</span>
                    <span><strong>1</strong> En file</span>
                    <span className="ok"><strong>1</strong> Résolu</span>
                  </div>
                  <div className="mobile-dashboard-route">
                    <span>Sites connectés</span>
                    <strong>3/3</strong>
                    <em>GitHub prêt · GitLab configuré</em>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type WaitlistFormProps = {
  action: (formData: FormData) => Promise<void>;
  compact?: boolean;
  waitlistStatus?: "joined" | "existing" | "error";
};

function WaitlistForm({ action, compact = false, waitlistStatus }: WaitlistFormProps) {
  return (
    <form action={action} className={`waitlist-form${compact ? " compact" : ""}`}>
      <div className="waitlist-form-header">
        <span className="waitlist-icon" aria-hidden="true">
          <Mail size={18} strokeWidth={2.3} />
        </span>
        <div>
          <strong><T k="home.waitlist.callout.title" /></strong>
          <p><TRich k="home.waitlist.callout.copy" /></p>
        </div>
      </div>
      <div className="waitlist-controls">
        <label>
          <span><T k="home.waitlist.label" /></span>
          <input autoComplete="email" name="email" placeholder="you@company.com" required type="email" />
        </label>
        <button className="button" type="submit"><T k="home.waitlist.submit" /></button>
      </div>
      {waitlistStatus ? (
        <p className={`waitlist-status ${waitlistStatus === "error" ? "error" : "success"}`} role="status">
          <T k={`home.waitlist.status.${waitlistStatus}`} />
        </p>
      ) : null}
      {!compact ? (
        <ul className="waitlist-points" aria-label="Détails de la bêta ChangeThis">
          {waitlistPoints.map(({ key, Icon }) => (
            <li key={key}>
              <Icon size={15} strokeWidth={2.4} aria-hidden="true" />
              <span><T k={key} /></span>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
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
      </span>.
    </p>
  );
}
