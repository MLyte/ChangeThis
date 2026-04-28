import Link from "next/link";
import { GitBranch, Inbox, Settings } from "lucide-react";
import { T } from "./i18n";

export function AppFooter() {
  return (
    <footer className="app-footer">
      <div>
        <strong>ChangeThis</strong>
        <span><T k="footer.copy" /></span>
      </div>
      <nav aria-label="Footer">
        <Link href="/projects">
          <Inbox aria-hidden="true" className="ui-icon" size={15} strokeWidth={2.2} />
          <T k="nav.issues" />
        </Link>
        <Link href="/settings">
          <Settings aria-hidden="true" className="ui-icon" size={15} strokeWidth={2.2} />
          <T k="nav.settings" />
        </Link>
        <a href="https://github.com/settings/installations">
          <GitBranch aria-hidden="true" className="ui-icon" size={15} strokeWidth={2.2} />
          <T k="footer.gitAccounts" />
        </a>
      </nav>
    </footer>
  );
}
