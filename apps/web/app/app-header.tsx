import Image from "next/image";
import Link from "next/link";
import { Database, Inbox, LogOut, Settings, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import { AppNavLink } from "./app-nav-link";
import logoChangeThis from "./assets/logoChangeThis.png";
import { LanguageSwitch, T } from "./i18n";
import { isPublicSignupEnabled } from "../lib/auth";

type HeaderNavItem = {
  href: string;
  labelKey: string;
};

type AppHeaderProps = {
  navItems?: HeaderNavItem[];
  showAuthLinks?: boolean;
  session?: {
    email: string;
    isLocalMode: boolean;
  };
};

export function AppHeader({ navItems = [], showAuthLinks = false, session }: AppHeaderProps) {
  const authMode = process.env.AUTH_MODE === "supabase" ? "supabase" : "local";
  const dataStore = process.env.DATA_STORE === "supabase" ? "supabase" : "local";
  const publicSignupEnabled = isPublicSignupEnabled();

  return (
    <header className="topbar app-header">
      <Link className="brand" href="/">
        <span>ChangeThis</span>
        <Image src={logoChangeThis} alt="" aria-hidden="true" className="brand-logo" priority />
      </Link>

      <div className="topbar-actions">
        {navItems.length > 0 ? (
          <nav className="primary-nav" aria-label="Application">
            {navItems.map((item) => (
              <AppNavLink href={item.href} key={item.href}>
                <NavIcon labelKey={item.labelKey} />
                <T k={item.labelKey} />
              </AppNavLink>
            ))}
          </nav>
        ) : null}

        <LanguageSwitch />

        {session ? (
          <div className="runtime-status" aria-label="Environnement">
            <span className={`runtime-pill ${authMode === "supabase" ? "is-ready" : "is-local"}`}>
              <ShieldCheck aria-hidden="true" className="ui-icon" size={14} strokeWidth={2.2} />
              <T k={authMode === "supabase" ? "nav.auth.supabase" : "nav.auth.local"} />
            </span>
            <span className={`runtime-pill ${dataStore === "supabase" ? "is-ready" : "is-local"}`}>
              <Database aria-hidden="true" className="ui-icon" size={14} strokeWidth={2.2} />
              <T k={dataStore === "supabase" ? "nav.storage.database" : "nav.storage.local"} />
            </span>
          </div>
        ) : null}

        {!session && showAuthLinks ? (
          <div className="public-auth-actions">
            <Link className="link" href="/login">
              <T k="nav.login" />
            </Link>
            {publicSignupEnabled ? (
              <Link className="button" href="/signup">
                <T k="nav.signup" />
              </Link>
            ) : null}
          </div>
        ) : null}

        {session ? (
          <>
          {session.isLocalMode ? (
            <Link className="button secondary-button local-signup-cta" href="/signup">
              <T k="nav.signup" />
            </Link>
          ) : null}
          <div className="session-menu" aria-label="Session">
            <UserRound aria-hidden="true" className="ui-icon muted-icon" size={16} strokeWidth={2.2} />
            <span>{session.email}</span>
            {session.isLocalMode ? <strong><T k="nav.localMode" /></strong> : null}
            <form action="/logout" method="post">
              <button className="link session-link" type="submit">
                <LogOut aria-hidden="true" className="ui-icon" size={15} strokeWidth={2.2} />
                <T k="nav.logout" />
              </button>
            </form>
          </div>
          </>
        ) : null}
      </div>
    </header>
  );
}

function NavIcon({ labelKey }: { labelKey: string }) {
  const Icon = navIcons[labelKey];

  if (!Icon) {
    return null;
  }

  return <Icon aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />;
}

const navIcons: Record<string, LucideIcon> = {
  "nav.issues": Inbox,
  "nav.settings": Settings
};
