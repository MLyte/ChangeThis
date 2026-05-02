import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthMode, isPublicSignupEnabled } from "../../lib/auth";
import { signInWithPassword } from "../../lib/supabase-server";
import { AppFooter } from "../app-footer";
import { AppHeader } from "../app-header";
import { T } from "../i18n";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
    redirect?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params?.next ?? params?.redirect);
  const hasError = Boolean(params?.error);
  const isLocalMode = getAuthMode() === "local";
  const publicSignupEnabled = isPublicSignupEnabled();

  async function loginAction(formData: FormData) {
    "use server";

    const authMode = getAuthMode();
    const targetPath = sanitizeNextPath(formData.get("next")?.toString());
    const email = formData.get("email")?.toString().trim() ?? "";
    const password = formData.get("password")?.toString().trim() ?? "";

    if (authMode === "local") {
      redirect(targetPath);
    }

    const signInResult = await signInWithPassword({ email, password });

    if (!signInResult.ok) {
      const error = signInResult.error;
      redirect(`/login?error=${encodeURIComponent(error)}&next=${encodeURIComponent(targetPath)}`);
    }

    const cookieStore = await cookies();
    const cookieConfig = {
      httpOnly: true,
      path: "/",
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: signInResult.expiresIn && Number.isFinite(signInResult.expiresIn) && signInResult.expiresIn > 0
        ? Math.floor(signInResult.expiresIn)
        : 60 * 60
    };

    cookieStore.set("changethis_access_token", signInResult.accessToken, cookieConfig);
    cookieStore.set("supabase-auth-token", signInResult.accessToken, cookieConfig);
    redirect(targetPath);
  }

  return (
    <main className="auth-shell">
      <AppHeader />

      <section className="auth-layout">
        <div className="auth-copy">
          <p className="eyebrow"><T k="login.eyebrow" /></p>
          <h1><T k="login.title" /></h1>
          <p className="lede"><T k="login.lede" /></p>
          {!publicSignupEnabled ? (
            <div className="local-mode-callout">
              <strong><T k="login.privateBeta.title" /></strong>
              <span><T k="login.privateBeta.copy" /></span>
            </div>
          ) : null}
        </div>

        <div className="auth-panel">
          {hasError ? (
            <div className="error-callout" role="alert">
              <strong><T k="login.error" /></strong>
            </div>
          ) : null}

          {isLocalMode ? (
            <div className="local-mode-callout">
              <strong><T k="login.localMode.title" /></strong>
              <span><T k="login.localMode.copy" /></span>
            </div>
          ) : null}

          <form action={loginAction} className="auth-form">
            <input name="next" type="hidden" value={nextPath} />
            <label>
              <T k="login.email" />
              <input autoComplete="email" name="email" required type="email" />
            </label>
            <label>
              <T k="login.password" />
              <input autoComplete="current-password" name="password" required type="password" />
            </label>
            <p className="microcopy"><T k="login.redirectHint" /></p>
            <button className="button" type="submit">
              <T k={isLocalMode ? "login.localSubmit" : "login.submit"} />
            </button>
          </form>

          {!isLocalMode ? (
            <p className="microcopy"><T k="login.noBackend" /></p>
          ) : null}

          {publicSignupEnabled ? (
            <p className="microcopy">
              <T k="login.signupHint" /> <a className="inline-link" href="/signup"><T k="nav.signup" /></a>
            </p>
          ) : null}
        </div>
      </section>
      <AppFooter />
    </main>
  );
}

function sanitizeNextPath(value?: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/projects";
  }

  return value;
}
