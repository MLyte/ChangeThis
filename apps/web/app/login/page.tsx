import { getAuthMode } from "../../lib/auth";
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
  const loginAction = isLocalMode
    ? nextPath
    : `/login?error=unavailable&next=${encodeURIComponent(nextPath)}`;

  return (
    <main className="auth-shell">
      <AppHeader />

      <section className="auth-layout">
        <div className="auth-copy">
          <p className="eyebrow"><T k="login.eyebrow" /></p>
          <h1><T k="login.title" /></h1>
          <p className="lede"><T k="login.lede" /></p>
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

          <form action={loginAction} className="auth-form" method="get">
            <label>
              <T k="login.email" />
              <input autoComplete="email" type="email" />
            </label>
            <label>
              <T k="login.password" />
              <input autoComplete="current-password" type="password" />
            </label>
            <p className="microcopy"><T k="login.redirectHint" /></p>
            <button className="button" type="submit">
              <T k={isLocalMode ? "login.localSubmit" : "login.submit"} />
            </button>
          </form>

          {!isLocalMode ? (
            <p className="microcopy"><T k="login.noBackend" /></p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function sanitizeNextPath(value?: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/projects";
  }

  return value;
}
