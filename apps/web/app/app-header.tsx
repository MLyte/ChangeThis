import Image from "next/image";
import Link from "next/link";
import { Inbox, LogOut, Settings, UserRound, type LucideIcon } from "lucide-react";
import { AppNavLink } from "./app-nav-link";
import logoChangeThis from "./assets/logoChangeThis.png";
import { LanguageSwitch, T } from "./i18n";
import { getCurrentSession, isPublicSignupEnabled } from "../lib/auth";

type HeaderNavItem = {
  href: string;
  labelKey: string;
};

type AppHeaderProps = {
  navItems?: HeaderNavItem[];
  showAuthLinks?: boolean;
  suppressAuthActions?: boolean;
  suppressSession?: boolean;
  session?: {
    email: string;
    isLocalMode: boolean;
  };
};

export async function AppHeader({
  navItems = [],
  showAuthLinks = false,
  suppressAuthActions = false,
  suppressSession = false,
  session
}: AppHeaderProps) {
  const publicSignupEnabled = isPublicSignupEnabled();
  const resolvedSession = suppressSession ? undefined : session ?? await loadHeaderSession();
  const showPrimaryNav = resolvedSession && navItems.length > 0;
  const showConsoleShortcut = resolvedSession && !showPrimaryNav;
  const showPublicAuthActions = !suppressAuthActions && !resolvedSession && (showAuthLinks || navItems.length > 0 || publicSignupEnabled);
  const showHeaderSession = resolvedSession && !resolvedSession.isLocalMode;

  return (
    <header className={`topbar app-header${showPrimaryNav ? " app-header-wide" : ""}`}>
      <div className="topbar-inner">
        <Link className="brand" href="/">
          <span className="brand-wordmark" aria-label="ChangeThis">
            <span>Change</span><span className="brand-wordmark-accent">This</span>
          </span>
          <Image src={logoChangeThis} alt="" aria-hidden="true" className="brand-logo" priority />
        </Link>

        <div className="topbar-actions">
          {showPrimaryNav ? (
            <nav className="primary-nav" aria-label="Application">
              {navItems.map((item) => (
                <AppNavLink href={item.href} key={item.href}>
                  <NavIcon labelKey={item.labelKey} />
                  <T k={item.labelKey} />
                </AppNavLink>
              ))}
            </nav>
          ) : null}

          {showConsoleShortcut ? (
            <Link className="button header-console-link" href="/projects">
              <Inbox aria-hidden="true" className="ui-icon" size={16} strokeWidth={2.2} />
              <T k="nav.openConsole" />
            </Link>
          ) : null}

          {showPublicAuthActions ? (
            <div className="public-auth-actions">
              <Link className="link" href="/login">
                <T k="nav.login" />
              </Link>
              {showAuthLinks || publicSignupEnabled ? (
                <Link className="button" href="/signup">
                  <T k="nav.signup" />
                </Link>
              ) : null}
            </div>
          ) : null}

          {showHeaderSession ? (
            <div className="session-menu" aria-label="Session">
              <UserRound aria-hidden="true" className="ui-icon muted-icon" size={16} strokeWidth={2.2} />
              <span>{resolvedSession.email}</span>
              <a className="link session-link" href="/logout">
                <LogOut aria-hidden="true" className="ui-icon" size={15} strokeWidth={2.2} />
                <T k="nav.logout" />
              </a>
            </div>
          ) : null}

          <LanguageSwitch />
        </div>
      </div>
    </header>
  );
}

async function loadHeaderSession(): Promise<AppHeaderProps["session"] | undefined> {
  const session = await getCurrentSession();

  if (!session) {
    return undefined;
  }

  return {
    email: session.user.email,
    isLocalMode: session.user.id === "local-dev-user"
  };
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
