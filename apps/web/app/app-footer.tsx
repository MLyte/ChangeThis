import Image from "next/image";
import { FileText, LifeBuoy, LogOut, Rocket, ShieldCheck, ShipWheel, UserRound } from "lucide-react";
import { getAuthMode, getCurrentSession } from "../lib/auth";
import { getDataStoreMode } from "../lib/runtime";
import logoChangeThis from "./assets/logoChangeThis.png";
import { T } from "./i18n";

type AppFooterProps = {
  suppressSession?: boolean;
};

export async function AppFooter({ suppressSession = false }: AppFooterProps) {
  const authMode = getAuthMode();
  const dataStore = getDataStoreMode();
  const isProductionReadyRuntime = (authMode === "supabase" && dataStore === "supabase")
    || (authMode === "craw" && dataStore === "postgres");
  const footerSession = suppressSession ? undefined : await loadFooterSession();

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
            <span className="runtime-pill is-ready">
              <Rocket aria-hidden="true" className="ui-icon" size={14} strokeWidth={2.2} />
              <span className="footer-pill-label">
                <T k="footer.status.openBeta" />
              </span>
            </span>
            <span className={`runtime-pill ${isProductionReadyRuntime ? "is-ready" : "is-local"}`}>
              <ShieldCheck aria-hidden="true" className="ui-icon" size={14} strokeWidth={2.2} />
              <span className="footer-pill-label">
                <T k={isProductionReadyRuntime ? "footer.runtime.production" : "footer.runtime.local"} />
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
              <a className="link session-link" href="/logout">
                <LogOut aria-hidden="true" className="ui-icon" size={15} strokeWidth={2.2} />
                <T k="nav.logout" />
              </a>
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
            <ShipWheel aria-hidden="true" className="ui-icon" size={15} strokeWidth={2.2} />
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
