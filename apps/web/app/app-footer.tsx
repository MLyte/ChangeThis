import Image from "next/image";
import { Database, FileText, LifeBuoy, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { getCurrentSession } from "../lib/auth";
import logoChangeThis from "./assets/logoChangeThis.png";
import { T } from "./i18n";

export async function AppFooter() {
  const authMode = process.env.AUTH_MODE === "supabase" ? "supabase" : "local";
  const dataStore = process.env.DATA_STORE === "supabase" ? "supabase" : "local";
  const footerSession = await loadFooterSession();

  return (
    <footer className="app-footer">
      <div className="footer-brand">
        <strong>ChangeThis</strong>
        <Image src={logoChangeThis} alt="" aria-hidden="true" className="footer-logo" />
        <span className="footer-copy"><T k="footer.copy" /></span>
      </div>
      <div className="footer-ops">
        {footerSession ? (
          <div className="runtime-status" aria-label="Environnement">
            <span className={`runtime-pill ${authMode === "supabase" ? "is-ready" : "is-local"}`}>
              <ShieldCheck aria-hidden="true" className="ui-icon" size={14} strokeWidth={2.2} />
              <span className="footer-pill-label">
                <T k={authMode === "supabase" ? "nav.auth.supabase" : "nav.auth.local"} />
              </span>
            </span>
            <span className={`runtime-pill ${dataStore === "supabase" ? "is-ready" : "is-local"}`}>
              <Database aria-hidden="true" className="ui-icon" size={14} strokeWidth={2.2} />
              <span className="footer-pill-label">
                <T k={dataStore === "supabase" ? "nav.storage.database" : "nav.storage.local"} />
              </span>
            </span>
          </div>
        ) : null}
        {footerSession?.isLocalMode ? (
          <div className="footer-local-tools">
            <span className="runtime-pill is-local">
              <UserRound aria-hidden="true" className="ui-icon" size={14} strokeWidth={2.2} />
              <span className="footer-pill-label"><T k="nav.localMode" /></span>
            </span>
            <div className="session-menu" aria-label="Session">
              <UserRound aria-hidden="true" className="ui-icon muted-icon" size={16} strokeWidth={2.2} />
              <span className="footer-session-email">{footerSession.email}</span>
              <form action="/logout" method="post">
                <button className="link session-link" type="submit">
                  <LogOut aria-hidden="true" className="ui-icon" size={15} strokeWidth={2.2} />
                  <T k="nav.logout" />
                </button>
              </form>
            </div>
          </div>
        ) : null}
        <nav aria-label="Footer">
          <a className="footer-support-link" href="mailto:support@changethis.dev">
            <LifeBuoy aria-hidden="true" className="ui-icon" size={15} strokeWidth={2.2} />
            <T k="footer.support" />
          </a>
          <a
            className="footer-license-link"
            href="https://github.com/MLyte/ChangeThis/blob/main/LICENSE.md"
            rel="noreferrer"
            target="_blank"
          >
            <FileText aria-hidden="true" className="ui-icon" size={15} strokeWidth={2.2} />
            <T k="footer.license" />
          </a>
          <a className="footer-creator-link" href="https://mathieuluyten.be" rel="noreferrer" target="_blank">
            <T k="footer.creator" />
          </a>
        </nav>
      </div>
    </footer>
  );
}

async function loadFooterSession(): Promise<{ email: string; isLocalMode: boolean } | undefined> {
  const session = await getCurrentSession();

  if (!session) {
    return undefined;
  }

  return {
    email: session.user.email,
    isLocalMode: session.user.id === "local-dev-user"
  };
}
