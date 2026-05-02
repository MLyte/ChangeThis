import { AppFooter } from "../../app-footer";
import { AppHeader } from "../../app-header";
import { T } from "../../i18n";
import { AuthConfirmClient } from "./auth-confirm-client";

export default function AuthConfirmPage() {
  return (
    <main className="auth-shell">
      <AppHeader showAuthLinks />
      <section className="auth-layout">
        <div className="auth-copy">
          <p className="eyebrow"><T k="signup.setPassword.eyebrow" /></p>
          <h1><T k="auth.confirm.title" /></h1>
          <p className="lede"><T k="auth.confirm.copy" /></p>
        </div>
      </section>
      <AuthConfirmClient />
      <AppFooter />
    </main>
  );
}
