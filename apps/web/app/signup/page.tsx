import { redirect } from "next/navigation";
import { getAuthMode, getCurrentSession, isPublicSignupEnabled } from "../../lib/auth";
import { AppFooter } from "../app-footer";
import { AppHeader } from "../app-header";
import { T } from "../i18n";

export const dynamic = "force-dynamic";

type SignUpPageProps = {
  searchParams?: Promise<{
    email?: string;
    error?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const currentSession = await getCurrentSession();

  if (currentSession?.workspace) {
    redirect("/projects");
  }

  if (currentSession) {
    redirect("/signup/set-password");
  }

  const publicSignupEnabled = isPublicSignupEnabled();

  if (!publicSignupEnabled) {
    return (
      <main className="auth-shell">
        <AppHeader showAuthLinks />

        <section className="auth-layout signup-layout">
          <div className="auth-copy">
            <p className="eyebrow"><T k="login.privateBeta.title" /></p>
            <h1><T k="signup.title" /></h1>
            <p className="lede"><T k="login.privateBeta.copy" /></p>
          </div>

          <div className="auth-panel">
            <div className="local-mode-callout" role="status">
              <strong><T k="login.privateBeta.title" /></strong>
              <span><T k="home.hero.privateBeta" /></span>
            </div>
            <p className="microcopy">
              <T k="signup.loginHint" /> <a className="inline-link" href="/login"><T k="nav.login" /></a>
            </p>
          </div>
        </section>
        <AppFooter />
      </main>
    );
  }

  const params = await searchParams;
  const errorKey = signupErrorKey(params?.error);
  const hasError = Boolean(errorKey);
  const authMode = getAuthMode();
  const isInternalMode = authMode === "internal";
  const isLocalMode = authMode === "local";

  async function signUpAction() {
    "use server";

    const authMode = getAuthMode();
    const currentSession = await getCurrentSession();

    if (currentSession?.workspace) {
      redirect("/projects");
    }

    if (currentSession) {
      redirect("/signup/set-password");
    }

    if (authMode === "local") {
      redirect("/settings/connected-sites");
    }

    redirect("/signup?error=unavailable");
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
              <strong><T k={errorKey} /></strong>
            </div>
          ) : null}

          {isLocalMode ? (
            <div className="local-mode-callout">
              <strong><T k="login.localMode.title" /></strong>
              <span><T k="signup.localMode.copy" /></span>
            </div>
          ) : null}

          <form action={isInternalMode ? "/api/auth/signup" : signUpAction} className="auth-form" method={isInternalMode ? "post" : undefined}>
            <label>
              <T k="login.email" />
              <input autoComplete="email" name="email" required type="email" />
            </label>
            {isInternalMode ? (
              <>
                <label>
                  <T k="signup.password" />
                  <input autoComplete="new-password" minLength={8} name="password" required type="password" />
                </label>
                <label>
                  <T k="signup.passwordConfirm" />
                  <input autoComplete="new-password" minLength={8} name="passwordConfirmation" required type="password" />
                </label>
              </>
            ) : null}
            <p className="microcopy">
              <T k={isInternalMode ? "signup.internalHint" : "signup.redirectHint"} />
            </p>
            <button className="button" type="submit">
              <T k={isLocalMode ? "signup.localSubmit" : "signup.internalSubmit"} />
            </button>
          </form>

          <p className="microcopy">
            <T k="signup.loginHint" /> <a className="inline-link" href="/login"><T k="nav.login" /></a>
          </p>
        </div>
      </section>
      <AppFooter />
    </main>
  );
}

function signupErrorKey(error?: string): string {
  return error === "password_mismatch" ? "signup.passwordMismatch" : error ? "signup.error" : "";
}
