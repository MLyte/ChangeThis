import { redirect } from "next/navigation";
import { getAuthMode, isPublicSignupEnabled } from "../../lib/auth";
import { requestSignUpEmail } from "../../lib/supabase-server";
import { AppHeader } from "../app-header";
import { T } from "../i18n";

export const dynamic = "force-dynamic";

type SignUpPageProps = {
  searchParams?: Promise<{
    error?: string;
    sent?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  if (!isPublicSignupEnabled()) {
    redirect("/login");
  }

  const params = await searchParams;
  const hasError = Boolean(params?.error);
  const isSent = params?.sent === "1";
  const isLocalMode = getAuthMode() === "local";

  async function signUpAction(formData: FormData) {
    "use server";

    const authMode = getAuthMode();
    const email = formData.get("email")?.toString().trim() ?? "";

    if (authMode === "local") {
      redirect("/settings/connected-sites");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const signUpResult = await requestSignUpEmail({
      email,
      redirectTo: `${appUrl}/auth/confirm?next=${encodeURIComponent("/signup/set-password")}`
    });

    if (!signUpResult.ok) {
      redirect(`/signup?error=${encodeURIComponent(signUpResult.error)}`);
    }

    redirect(`/signup?sent=1&email=${encodeURIComponent(email)}`);
  }

  return (
    <main className="auth-shell">
      <AppHeader showAuthLinks />

      <section className="auth-layout signup-layout">
        <div className="auth-copy">
          <p className="eyebrow"><T k="signup.eyebrow" /></p>
          <h1><T k="signup.title" /></h1>
          <p className="lede"><T k="signup.lede" /></p>
          <div className="signup-proof-list" aria-label="Premières étapes">
            <span><T k="signup.proof.site" /></span>
            <span><T k="signup.proof.git" /></span>
            <span><T k="signup.proof.widget" /></span>
          </div>
        </div>

        <div className="auth-panel">
          {hasError ? (
            <div className="error-callout" role="alert">
              <strong><T k="signup.error" /></strong>
            </div>
          ) : null}

          {isSent ? (
            <div className="local-mode-callout" role="status">
              <strong><T k="signup.sent.title" /></strong>
              <span><T k="signup.sent.copy" /></span>
            </div>
          ) : null}

          {isLocalMode ? (
            <div className="local-mode-callout">
              <strong><T k="login.localMode.title" /></strong>
              <span><T k="signup.localMode.copy" /></span>
            </div>
          ) : null}

          <form action={signUpAction} className="auth-form">
            <label>
              <T k="login.email" />
              <input autoComplete="email" name="email" required type="email" />
            </label>
            <p className="microcopy"><T k="signup.redirectHint" /></p>
            <button className="button" type="submit">
              <T k={isLocalMode ? "signup.localSubmit" : "signup.submit"} />
            </button>
          </form>

          <p className="microcopy">
            <T k="signup.loginHint" /> <a className="inline-link" href="/login"><T k="nav.login" /></a>
          </p>
        </div>
      </section>
    </main>
  );
}
