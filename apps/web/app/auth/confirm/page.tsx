import { isPublicAccessPaused } from "../../../lib/auth";
import { AppFooter } from "../../app-footer";
import { AppHeader } from "../../app-header";
import { T } from "../../i18n";
import { PublicPausePage } from "../../public-pause";
import { AuthConfirmClient } from "./auth-confirm-client";

export default function AuthConfirmPage() {
  if (isPublicAccessPaused()) {
    return <PublicPausePage compact />;
  }

  return (
    <main className="auth-shell">
      <AppHeader showAuthLinks />
      <section className="auth-layout">
        <div className="auth-copy">
          <p className="eyebrow"><T k="signup.setPassword.eyebrow" /></p>
          <h1><T k="auth.confirm.title" /></h1>
          <p className="lede"><T k="auth.confirm.copy" /></p>
        </div>
        <AuthConfirmClient />
      </section>
      <AppFooter />
    </main>
  );
}
