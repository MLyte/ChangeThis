import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Accessibility, ClipboardCheck, Code2, FileText, GitBranch, Globe2, Mail, MonitorCheck, Pin, ShieldCheck, SlidersHorizontal, Sparkles, UserPlus, Users, type LucideIcon } from "lucide-react";
import { getCurrentSession, isPublicSignupEnabled } from "../lib/auth";
import { joinPublicLaunchWaitlist } from "../lib/supabase-server";
import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";
import logoChangeThis from "./assets/logoChangeThis.png";
import { T, TRich } from "./i18n";
import { HomeLoginLink } from "./home-login-link";
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
  { key: "home.waitlist.point.1", Icon: Globe2 },
  { key: "home.waitlist.point.2", Icon: Code2 },
  { key: "home.waitlist.point.3", Icon: ClipboardCheck },
  { key: "home.waitlist.point.4", Icon: GitBranch }
];

const heroProofItems = [
  "home.hero.proof.visitor",
  "home.hero.proof.context",
  "home.hero.proof.git",
  "home.hero.proof.browser"
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

const closingActivationItems: Array<{ titleKey: string; copyKey: string; Icon: LucideIcon }> = [
  { titleKey: "home.closing.step.site.title", copyKey: "home.closing.step.site.copy", Icon: Globe2 },
  { titleKey: "home.closing.step.git.title", copyKey: "home.closing.step.git.copy", Icon: GitBranch },
  { titleKey: "home.closing.step.feedback.title", copyKey: "home.closing.step.feedback.copy", Icon: ClipboardCheck }
];

type HomePageProps = {
  searchParams?: Promise<{
    waitlist?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const publicSignupEnabled = isPublicSignupEnabled();
  const session = await getCurrentSession();
  const isSignedIn = Boolean(session);
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
      <AppHeader
        showAuthLinks
        suppressSession={!session}
        session={session ? {
          email: session.user.email,
          isLocalMode: session.user.id === "local-dev-user"
        } : undefined}
      />

      <section className="home-section home-hero" aria-labelledby="product-title">
        <div className="home-hero-copy">
          <p className="eyebrow"><T k="home.hero.eyebrow" /></p>
          <h1 id="product-title" className="product-title">
            <span className="brand-wordmark hero-wordmark" aria-label="ChangeThis">
              <span>Change</span><span className="brand-wordmark-accent">This</span>
            </span>
            <Image src={logoChangeThis} alt="" aria-hidden="true" className="product-title-logo" priority />
          </h1>
          <p className="hero-product-promise"><TRich k="home.hero.promise" /></p>
          <HeroStatement />
          <p className="lede">
            <TRich k="home.hero.lede" />
          </p>
          <span className="sr-only" id="home-hero-proof-label"><T k="home.aria.heroProof" /></span>
          <div className="home-hero-proof-row" aria-labelledby="home-hero-proof-label">
            {heroProofItems.map((key) => (
              <span key={key}><TRich k={key} /></span>
            ))}
          </div>
        </div>

        <div className="home-hero-action">
          {isSignedIn ? (
            <SignupAccessCard isSignedIn />
          ) : publicSignupEnabled ? (
            <SignupAccessCard />
          ) : (
            <WaitlistForm action={waitlistAction} waitlistStatus={waitlistStatus} />
          )}
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

      <section className="home-section problem-section problem-editorial">
        <div className="home-section-header">
          <p className="eyebrow"><T k="home.problem.eyebrow" /></p>
          <h2><T k="home.problem.question" /></h2>
          <p className="problem-intro"><TRich k="home.problem.intro" /></p>
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
                <p><TRich k={copyKey} /></p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <MobilePreviewSection />

      <PublicSectorSection />

      <section className="home-section waitlist-closing-section">
        <div className="closing-copy">
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
          <span className="sr-only" id="closing-proof-label"><T k="home.aria.betaProof" /></span>
          <div className="closing-proof-row" aria-labelledby="closing-proof-label">
            <span><T k="home.closing.proof.beta" /></span>
            <span><T k="home.closing.proof.visitors" /></span>
            <span><T k="home.closing.proof.git" /></span>
          </div>
        </div>
        <div className="closing-access-panel">
          <div className="closing-access-heading">
            <span className="closing-access-icon" aria-hidden="true">
              <Sparkles size={20} strokeWidth={2.3} />
            </span>
            <div>
              <strong><T k="home.closing.panel.title" /></strong>
              <p><T k="home.closing.panel.copy" /></p>
            </div>
          </div>
          <span className="sr-only" id="closing-activation-label"><T k="home.aria.activationSteps" /></span>
          <div className="closing-activation-list" aria-labelledby="closing-activation-label">
            {closingActivationItems.map(({ titleKey, copyKey, Icon }) => (
              <article className="closing-activation-item" key={titleKey}>
                <Icon aria-hidden="true" size={18} strokeWidth={2.3} />
                <div>
                  <strong><T k={titleKey} /></strong>
                  <p><T k={copyKey} /></p>
                </div>
              </article>
            ))}
          </div>
          {publicSignupEnabled ? (
            <SignupAccessCard compact isSignedIn={isSignedIn} />
          ) : (
            <WaitlistForm action={waitlistAction} compact waitlistStatus={waitlistStatus} />
          )}
        </div>
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

      <span className="sr-only" id="mobile-device-pair-label"><T k="home.aria.mobilePair" /></span>
      <div className="mobile-device-pair" aria-labelledby="mobile-device-pair-label">
        <span className="sr-only" id="mobile-visitor-label"><T k="home.aria.mobileVisitor" /></span>
        <div className="iphone-pro-max-mockup user-mobile-mockup" aria-labelledby="mobile-visitor-label">
          <span className="mobile-device-label"><T k="home.mobile.label.visitor" /></span>
          <div className="iphone-frame">
            <div className="iphone-screen">
              <div className="iphone-dynamic-island" />
              <div className="mobile-browser-bar">
                <span>atelier-nova.be</span>
              </div>
              <div className="mobile-demo-page">
                <span className="mobile-demo-kicker">Atelier Nova</span>
                <h3><T k="home.mobile.mock.visitor.title" /></h3>
                <p><T k="home.mobile.mock.visitor.copy" /></p>
                <div className="mobile-demo-card" />
                <div className="mobile-demo-lines">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="mobile-widget-panel">
                <div className="mobile-widget-header">
                  <strong><T k="home.mobile.mock.widget.title" /></strong>
                  <span>Capture</span>
                </div>
                <div className="mobile-widget-tabs">
                  <span><T k="home.loop.widget.note" /></span>
                  <span className="active"><T k="home.loop.widget.marker" /></span>
                  <span><T k="home.loop.widget.capture" /></span>
                </div>
                <div className="mobile-widget-text"><T k="home.loop.widget.copy" /></div>
                <button type="button"><T k="home.loop.widget.send" /></button>
              </div>
              <button className="mobile-feedback-button" type="button"><T k="home.mobile.mock.widget.title" /></button>
            </div>
          </div>
        </div>

        <span className="sr-only" id="mobile-team-label"><T k="home.aria.mobileTeam" /></span>
        <div className="iphone-pro-max-mockup admin-mobile-mockup" aria-labelledby="mobile-team-label">
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
                    <span className="mobile-demo-kicker"><T k="home.mobile.mock.dashboard.kicker" /></span>
                    <strong><T k="home.mobile.mock.dashboard.title" /></strong>
                  </div>
                  <button type="button"><T k="home.mobile.mock.dashboard.test" /></button>
                </div>
                <div className="mobile-dashboard-tabs" aria-hidden="true">
                  <span className="active"><T k="projects.tabs.active" /> <strong>3</strong></span>
                  <span><T k="projects.tabs.history" /> <strong>8</strong></span>
                  <span><T k="projects.tabs.all" /> <strong>11</strong></span>
                </div>
                <div className="mobile-dashboard-filters" aria-hidden="true">
                  <span><T k="home.mobile.mock.dashboard.filterStatus" /></span>
                  <span><T k="home.mobile.mock.dashboard.filterSite" /></span>
                  <span><T k="home.mobile.mock.dashboard.filterGit" /></span>
                </div>
                <div className="mobile-dashboard-feedback-list">
                  <article className="mobile-dashboard-feedback active">
                    <div className="mobile-dashboard-feedback-main">
                      <div className="mobile-dashboard-tags">
                        <span className="status-badge needs_setup"><T k="status.raw" /></span>
                        <ProviderBadge provider="github" />
                      </div>
                      <strong><T k="home.mobile.mock.feedback.first.title" /></strong>
                      <p><T k="home.mobile.mock.feedback.first.copy" /></p>
                      <span><T k="home.mobile.mock.feedback.first.meta" /></span>
                    </div>
                    <div className="mobile-dashboard-issue">
                      <span><T k="projects.feedback.details" /></span>
                      <strong>cabinet-orion/booking-flow</strong>
                    </div>
                  </article>
                  <article className="mobile-dashboard-feedback">
                    <div className="mobile-dashboard-feedback-main">
                      <div className="mobile-dashboard-tags">
                        <span className="status-badge issue_creation_pending"><T k="projects.filters.queued" /></span>
                        <ProviderBadge provider="gitlab" />
                      </div>
                      <strong><T k="home.mobile.mock.feedback.second.title" /></strong>
                      <p><T k="home.mobile.mock.feedback.second.copy" /></p>
                      <span><T k="home.mobile.mock.feedback.second.meta" /></span>
                    </div>
                  </article>
                </div>
                <div className="mobile-dashboard-summary">
                  <div className="mobile-dashboard-summary-header">
                    <span><T k="home.mobile.mock.summary" /></span>
                    <strong><T k="home.mobile.mock.currentQueue" /></strong>
                  </div>
                  <div className="mobile-dashboard-metric-row">
                    <span className="warning"><strong>1</strong> <T k="home.mobile.mock.toTriage" /></span>
                    <span><strong>1</strong> <T k="home.mobile.mock.queued" /></span>
                    <span className="ok"><strong>1</strong> <T k="home.mobile.mock.resolved" /></span>
                  </div>
                  <div className="mobile-dashboard-route">
                    <span><T k="home.mobile.mock.connectedSites" /></span>
                    <strong>3/3</strong>
                    <em><T k="home.mobile.mock.gitReady" /></em>
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

function SignupAccessCard({ compact = false, isSignedIn = false }: { compact?: boolean; isSignedIn?: boolean }) {
  return (
    <div className={`waitlist-form signup-access-card${compact ? " compact" : ""}`}>
      {!compact ? (
        <div className="waitlist-form-header">
          <span className="waitlist-icon" aria-hidden="true">
            <Users size={18} strokeWidth={2.3} />
          </span>
          <div>
            <strong><T k={isSignedIn ? "home.console.callout.title" : "home.signup.callout.title"} /></strong>
            <p><TRich k={isSignedIn ? "home.console.callout.copy" : "home.signup.callout.copy"} /></p>
          </div>
        </div>
      ) : null}
      <div className="hero-actions signup-access-actions">
        {isSignedIn ? (
          <>
            <Link className="button" href="/projects">
              <MonitorCheck aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.3} />
              <span><T k="home.console.primary" /></span>
            </Link>
            <Link className="button secondary-button" href="/settings/connected-sites">
              <SlidersHorizontal aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.3} />
              <span><T k="home.console.secondary" /></span>
            </Link>
          </>
        ) : (
          <>
            <Link className="button" href="/signup">
              <UserPlus aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.3} />
              <span><T k="home.hero.signup" /></span>
            </Link>
            <HomeLoginLink><T k="home.hero.login" /></HomeLoginLink>
          </>
        )}
      </div>
      {!compact ? (
        <>
        <span className="sr-only" id="signup-access-details-label"><T k="home.aria.accessDetails" /></span>
        <ul className="waitlist-points" aria-labelledby="signup-access-details-label">
          {waitlistPoints.map(({ key, Icon }) => (
            <li key={key}>
              <Icon size={15} strokeWidth={2.4} aria-hidden="true" />
              <span><TRich k={key} /></span>
            </li>
          ))}
        </ul>
        </>
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
        <>
        <span className="sr-only" id="waitlist-beta-details-label"><T k="home.aria.betaDetails" /></span>
        <ul className="waitlist-points" aria-labelledby="waitlist-beta-details-label">
          {waitlistPoints.map(({ key, Icon }) => (
            <li key={key}>
              <Icon size={15} strokeWidth={2.4} aria-hidden="true" />
              <span><TRich k={key} /></span>
            </li>
          ))}
        </ul>
        </>
      ) : null}
    </form>
  );
}

function HeroStatement() {
  return (
    <p className="hero-statement">
      <TRich k="home.hero.statement.prefix" />{" "}
      <span className="hero-provider github">
        <ProviderIcon provider="github" className="hero-provider-icon" />
        <span>GitHub</span>
      </span>{" "}
      <T k="home.hero.statement.or" />{" "}
      <span className="hero-provider gitlab">
        <ProviderIcon provider="gitlab" className="hero-provider-icon" />
        <span>GitLab</span>
      </span>
      <span className="hero-statement-emphasis"><T k="home.hero.statement.suffix" /></span>
    </p>
  );
}
