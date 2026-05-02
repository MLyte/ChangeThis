import Image from "next/image";
import { redirect } from "next/navigation";
import { CheckCircle2, GitBranch, GitPullRequestCreate, Inbox, Mail, MessageSquare, MousePointerClick, Route, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { joinPublicLaunchWaitlist } from "../lib/supabase-server";
import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";
import logoChangeThis from "./assets/logoChangeThis.png";
import { T } from "./i18n";
import { MarketingConsolePreview } from "./marketing-console-preview";
import { ProviderIcon } from "./provider-badge";

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

const problemPoints = [
  "home.problem.point.1",
  "home.problem.point.2",
  "home.problem.point.3"
];

const workflowSteps: Array<{ titleKey: string; copyKey: string; Icon: LucideIcon }> = [
  { titleKey: "home.workflow.capture.title", copyKey: "home.workflow.capture.copy", Icon: MessageSquare },
  { titleKey: "home.workflow.triage.title", copyKey: "home.workflow.triage.copy", Icon: Inbox },
  { titleKey: "home.workflow.issue.title", copyKey: "home.workflow.issue.copy", Icon: GitPullRequestCreate }
];

const betaNotes = [
  "home.beta.note.1",
  "home.beta.note.2",
  "home.beta.note.3",
  "home.beta.note.4"
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
            <span>ChangeThis</span>
          </h1>
          <HeroStatement />
          <p className="lede">
            <T k="home.hero.lede" />
          </p>
          <WaitlistForm action={waitlistAction} waitlistStatus={waitlistStatus} />
        </div>

        <div className="home-hero-preview">
          <MarketingConsolePreview />
        </div>
      </section>

      <section className="home-section problem-section">
        <div className="home-section-header">
          <p className="eyebrow"><T k="home.problem.eyebrow" /></p>
          <h2><T k="home.problem.title" /></h2>
        </div>
        <div className="problem-list">
          {problemPoints.map((key) => (
            <article className="problem-item" key={key}>
              <span aria-hidden="true" />
              <p><T k={key} /></p>
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
              <p><T k={copyKey} /></p>
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
              <p><T k={copyKey} /></p>
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
          {betaNotes.map((key) => (
            <li key={key}>
              <CheckCircle2 size={17} strokeWidth={2.4} aria-hidden="true" />
              <span><T k={key} /></span>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-section waitlist-closing-section">
        <div>
          <p className="eyebrow"><T k="home.closing.eyebrow" /></p>
          <h2><T k="home.closing.title" /></h2>
          <p className="lede">
            <T k="home.closing.copy" />
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
        <h2 id="mobile-proof-title"><T k="home.mobile.title" /></h2>
        <p className="lede">
          <T k="home.mobile.copy" />
        </p>
        <div className="mobile-proof-points">
          <span><T k="home.mobile.point.visitor" /></span>
          <span><T k="home.mobile.point.team" /></span>
          <span><T k="home.mobile.point.context" /></span>
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

        <div className="iphone-pro-max-mockup admin-mobile-mockup" aria-label="Aperçu mobile équipe ChangeThis">
          <span className="mobile-device-label"><T k="home.mobile.label.team" /></span>
          <div className="iphone-frame">
            <div className="iphone-screen">
              <div className="iphone-dynamic-island" />
              <div className="mobile-browser-bar">
                <span>app.changethis.dev</span>
              </div>
              <div className="mobile-admin-console">
                <div className="mobile-admin-header">
                  <span className="mobile-demo-kicker">Inbox</span>
                  <strong>Retours entrants</strong>
                </div>
                <div className="mobile-admin-tabs">
                  <span className="active">À traiter</span>
                  <span>À revoir</span>
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
                <article className="mobile-admin-feedback review">
                  <div>
                    <strong>Note sur /demo</strong>
                    <span>Atelier Nova · GitHub</span>
                  </div>
                  <em>À revoir</em>
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
          <p><T k="home.waitlist.callout.copy" /></p>
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
      </span>{" "}
      <strong><T k="home.hero.statement.suffix" /></strong>
    </p>
  );
}
