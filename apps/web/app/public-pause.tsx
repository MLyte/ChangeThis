import Link from "next/link";
import { Mail, PlayCircle } from "lucide-react";
import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";
import { T } from "./i18n";

export const publicPauseContactHref = "https://mathieuluyten.be";

type PublicPausePageProps = {
  compact?: boolean;
};

// Temporary replacement for the public auth screens while app.changethis.dev is
// paused. The original auth pages stay in place and come back by setting
// PUBLIC_ACCESS_PAUSED=false.
export function PublicPausePage({ compact = false }: PublicPausePageProps) {
  return (
    <main className={compact ? "auth-shell" : "shell app-home"}>
      <AppHeader suppressAuthActions suppressSession />
      <section className={compact ? "auth-layout public-pause-layout" : "home-section home-hero public-pause-hero"} aria-labelledby="public-pause-title">
        <div className="auth-copy public-pause-copy">
          <p className="eyebrow"><T k="pause.eyebrow" /></p>
          <h1 id="public-pause-title"><T k="pause.title" /></h1>
          <p className="lede"><T k="pause.lede" /></p>
        </div>
        <PublicPauseCard />
      </section>
      <AppFooter suppressSession />
    </main>
  );
}

export function PublicPauseCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`waitlist-form public-pause-card${compact ? " compact" : ""}`}>
      {!compact ? (
        <div className="waitlist-form-header">
        <span className="waitlist-icon" aria-hidden="true">
          <Mail size={18} strokeWidth={2.3} />
        </span>
        <div>
          <strong><T k="pause.card.title" /></strong>
          <p><T k="pause.card.copy" /></p>
        </div>
        </div>
      ) : null}
      <div className="hero-actions signup-access-actions">
        <a className="button" href={publicPauseContactHref} rel="noreferrer" target="_blank">
          <Mail aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.3} />
          <span><T k="pause.contact" /></span>
        </a>
        <Link className="button secondary-button" href="/demo">
          <PlayCircle aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.3} />
          <span><T k="pause.demo" /></span>
        </Link>
      </div>
      <p className="microcopy"><T k="pause.noStorage" /></p>
    </div>
  );
}
