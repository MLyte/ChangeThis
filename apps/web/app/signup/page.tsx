import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthMode } from "../../lib/auth";
import { createWorkspaceForUser, signUpWithPassword } from "../../lib/supabase-server";
import { AppHeader } from "../app-header";
import { T } from "../i18n";

export const dynamic = "force-dynamic";

type SignUpPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const hasError = Boolean(params?.error);
  const isLocalMode = getAuthMode() === "local";

  async function signUpAction(formData: FormData) {
    "use server";

    const authMode = getAuthMode();
    const email = formData.get("email")?.toString().trim() ?? "";
    const password = formData.get("password")?.toString().trim() ?? "";
    const organizationName = formData.get("organizationName")?.toString().trim() ?? "";

    if (authMode === "local") {
      redirect("/settings/connected-sites");
    }

    const signUpResult = await signUpWithPassword({ email, password });

    if (!signUpResult.ok) {
      redirect(`/signup?error=${encodeURIComponent(signUpResult.error)}`);
    }

    const workspace = await createWorkspaceForUser({
      userId: signUpResult.userId,
      organizationName
    });

    if (!workspace) {
      redirect("/signup?error=workspace");
    }

    if (signUpResult.accessToken) {
      const cookieStore = await cookies();
      const cookieConfig = {
        httpOnly: true,
        path: "/",
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        maxAge: signUpResult.expiresIn && Number.isFinite(signUpResult.expiresIn) && signUpResult.expiresIn > 0
          ? Math.floor(signUpResult.expiresIn)
          : 60 * 60
      };

      cookieStore.set("changethis_access_token", signUpResult.accessToken, cookieConfig);
      cookieStore.set("supabase-auth-token", signUpResult.accessToken, cookieConfig);
      redirect("/settings/connected-sites");
    }

    redirect("/login?next=/settings/connected-sites");
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

          {isLocalMode ? (
            <div className="local-mode-callout">
              <strong><T k="login.localMode.title" /></strong>
              <span><T k="signup.localMode.copy" /></span>
            </div>
          ) : null}

          <form action={signUpAction} className="auth-form">
            <label>
              <T k="signup.organization" />
              <input autoComplete="organization" name="organizationName" placeholder="Studio, produit, équipe..." required />
            </label>
            <label>
              <T k="login.email" />
              <input autoComplete="email" name="email" required type="email" />
            </label>
            <label>
              <T k="login.password" />
              <input autoComplete="new-password" minLength={8} name="password" required type="password" />
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
