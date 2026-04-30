import Image from "next/image";
import Link from "next/link";
import { Inbox, Settings } from "lucide-react";
import logoChangeThis from "./assets/logoChangeThis.png";
import { T } from "./i18n";
import { ProviderBadge } from "./provider-badge";

export function AppFooter() {
  return (
    <footer className="app-footer">
      <div>
        <strong>ChangeThis</strong>
        <Image src={logoChangeThis} alt="" aria-hidden="true" className="footer-logo" />
        <span><T k="footer.copy" /></span>
      </div>
      <nav aria-label="Footer">
        <a href="https://mathieuluyten.be" rel="noreferrer">
          <T k="footer.creator" />
        </a>
        <Link href="/projects">
          <Inbox aria-hidden="true" className="ui-icon" size={15} strokeWidth={2.2} />
          <T k="nav.issues" />
        </Link>
        <Link href="/settings">
          <Settings aria-hidden="true" className="ui-icon" size={15} strokeWidth={2.2} />
          <T k="nav.settings" />
        </Link>
        <a href="https://github.com/settings/installations">
          <ProviderBadge provider="github" />
          <T k="footer.gitAccounts" />
        </a>
      </nav>
    </footer>
  );
}
