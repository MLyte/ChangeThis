import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Accessibility, CheckCircle2, ClipboardCheck, FileText, GitBranch, Globe2, Mail, MonitorCheck, Pin, ShieldCheck, SlidersHorizontal, Sparkles, Users, type LucideIcon } from "lucide-react";
import { isPublicSignupEnabled } from "../lib/auth";
import { joinPublicLaunchWaitlist } from "../lib/supabase-server";
import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";
import logoChangeThis from "./assets/logoChangeThis.png";
import { T, TRich } from "./i18n";
import { MarketingConsolePreview } from "./marketing-console-preview";
import { ProviderBadge, ProviderIcon } from "./provider-badge";

export const dynamic = "force-dynamic";

const feedbackContextItems: Array<{ titleKey: string; copyKey: string; Icon: LucideIcon }> = [
  { titleKey: "home.context.page.title", copyKey: "home.context.page.copy", Icon: Globe2 },
  { titleKey: "home.context.device.title", copyKey: "home.context.device.copy", Icon: MonitorCheck },
  { titleKey: "home.context.pin.title", copyKey: "home.context.pin.copy", Icon: Pin },
  { titleKey: "home.context.routing.title", copyKey: "home.context.routing.copy", Icon: GitBranch }
];

const waitlistPoints: Array<{ key: string; Icon: LucideIcon }> = [
  { key: "home.waitlist.point.1", Icon: CheckCircle2 },
  { key: "home.waitlist.point.2", Icon: GitBranch }
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

const publicSectorThemes: Array<{ titleKey: string; copyKey: string; Icon: LucideIcon }> = [
  { titleKey: "home.publicSector.theme.accessibility.title", copyKey: "home.publicSector.theme.accessibility.copy", Icon: Accessibility },
  { titleKey: "home.publicSector.theme.data.title", copyKey: "home.publicSector.theme.data.copy", Icon: ShieldCheck },
  { titleKey: "home.publicSector.theme.pilot.title", copyKey: "home.publicSector.theme.pilot.copy", Icon: SlidersHorizontal }
];

const publicSectorDoesNotReplace = [
  "home.publicSector.notReplace.audit",
  "home.publicSector.notReplace.support",
  "home.publicSector.notReplace.certification"
];

const publicSectorPilotScope = [
  "home.publicSector.pilotScope.pages",
  "home.publicSector.pilotScope.screenshots",
  "home.publicSector.pilotScope.retention",
  "home.publicSector.pilotScope.review"
];

type HomePageProps = {
  searchParams?: Promise<{
    waitlist?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const publicSignupEnabled = isPublicSignupEnabled();
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
      <AppHeader suppressAuthActions={!publicSignupEnabled} suppressSession={!publicSignupEnabled} />

      <section className="home-section home-hero" aria-labelledby="product-title">
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
        </div>

        <div className="home-hero-action">
          {publicSignupEnabled ? (
            <SignupAccessCard />
          ) : (
            <WaitlistForm action={waitlistAction} waitlistStatus={waitlistStatus} />
          )}
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

      <section className="home-section product-loop-section" aria-labelledby="product-loop-title">
        <div className="home-section-header compact">
          <p className="eyebrow"><T k="home.loop.section.eyebrow" /></p>
          <h2 id="product-loop-title"><T k="home.loop.section.title" /></h2>
          <p className="section-lede"><T k="home.loop.section.copy" /></p>
        </div>
        <MarketingConsolePreview />
      </section>

      <section className="home-section feedback-context-section" aria-labelledby="feedback-context-title">
        <div className="home-section-header compact">
          <p className="eyebrow"><T k="home.context.eyebrow" /></p>
          <h2 id="feedback-context-title"><T k="home.context.title" /></h2>
          <p className="feedback-context-lede"><T k="home.context.copy" /></p>
        </div>
        <div className="feedback-context-grid">
          {feedbackContextItems.map(({ titleKey, copyKey, Icon }) => (
            <article className="feedback-context-card" key={titleKey}>
              <span className="feedback-context-icon" aria-hidden="true">
                <Icon size={20} strokeWidth={2.3} />
              </span>
              <div>
                <h3><T k={titleKey} /></h3>
                <p><T k={copyKey} /></p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <MobilePreviewSection />

      <PublicSectorSection />

      <section className="home-section waitlist-closing-section">
        <div>
          <p className="eyebrow"><T k="home.closing.eyebrow" /></p>
          <h2 className="closing-title">
            <small>
              <T k="home.closing.title.small" />
            </small>
            <br />
            <T k="home.closing.title.main" />
            <Sparkles className="closing-title-icon" size={24} strokeWidth={2.3} aria-hidden="true" />
          </h2>
          <p className="lede">
            <TRich k="home.closing.copy" />
          </p>
        </div>
        {publicSignupEnabled ? (
          <SignupAccessCard compact />
        ) : (
          <WaitlistForm action={waitlistAction} compact waitlistStatus={waitlistStatus} />
        )}
      </section>
      <AppFooter suppressSession={!publicSignupEnabled} />
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

function PublicSectorSection() {
  return (
    <section className="home-section public-sector-section" aria-labelledby="public-sector-title">
      <div className="public-sector-inner">
        <div className="public-sector-copy">
          <p className="eyebrow"><T k="home.publicSector.eyebrow" /></p>
          <h2 id="public-sector-title"><T k="home.publicSector.title" /></h2>
          <p className="section-lede"><T k="home.publicSector.lede" /></p>
        </div>

        <div className="public-sector-theme-grid">
          {publicSectorThemes.map(({ titleKey, copyKey, Icon }) => (
            <article className="public-sector-theme" key={titleKey}>
              <span className="public-sector-icon" aria-hidden="true">
                <Icon size={20} strokeWidth={2.3} />
              </span>
              <h3><T k={titleKey} /></h3>
              <p><T k={copyKey} /></p>
            </article>
          ))}
        </div>

        <div className="public-sector-scope-grid">
          <section className="public-sector-scope" aria-labelledby="public-sector-not-replace">
            <div className="public-sector-scope-heading">
              <FileText size={18} strokeWidth={2.3} aria-hidden="true" />
              <h3 id="public-sector-not-replace"><T k="home.publicSector.notReplace.title" /></h3>
            </div>
            <ul>
              {publicSectorDoesNotReplace.map((key) => (
                <li key={key}><T k={key} /></li>
              ))}
            </ul>
          </section>

          <section className="public-sector-scope" aria-labelledby="public-sector-pilot-scope">
            <div className="public-sector-scope-heading">
              <ClipboardCheck size={18} strokeWidth={2.3} aria-hidden="true" />
              <h3 id="public-sector-pilot-scope"><T k="home.publicSector.pilotScope.title" /></h3>
            </div>
            <ul>
              {publicSectorPilotScope.map((key) => (
                <li key={key}><T k={key} /></li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
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

function SignupAccessCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`waitlist-form signup-access-card${compact ? " compact" : ""}`}>
      {!compact ? (
        <div className="waitlist-form-header">
          <span className="waitlist-icon" aria-hidden="true">
            <Users size={18} strokeWidth={2.3} />
          </span>
          <div>
            <strong><T k="home.signup.callout.title" /></strong>
            <p><TRich k="home.signup.callout.copy" /></p>
          </div>
        </div>
      ) : null}
      <div className="hero-actions signup-access-actions">
        <Link className="button" href="/signup"><T k="home.hero.signup" /></Link>
        <Link className="button secondary-button" href="/login"><T k="home.hero.login" /></Link>
      </div>
      {!compact ? (
        <ul className="waitlist-points" aria-label="Détails de l'accès ChangeThis">
          {waitlistPoints.map(({ key, Icon }) => (
            <li key={key}>
              <Icon size={15} strokeWidth={2.4} aria-hidden="true" />
              <span><T k={key} /></span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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
