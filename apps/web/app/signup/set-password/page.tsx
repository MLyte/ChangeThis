import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthMode, getCurrentSession } from "../../../lib/auth";
import { createWorkspaceForUser, updateSupabasePassword } from "../../../lib/supabase-server";
import { AppHeader } from "../../app-header";
import { T } from "../../i18n";

export const dynamic = "force-dynamic";

type SetPasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function SetPasswordPage({ searchParams }: SetPasswordPageProps) {
  const params = await searchParams;
  const hasError = Boolean(params?.error);
  const isLocalMode = getAuthMode() === "local";
  const session = await getCurrentSession();

  if (!isLocalMode && !session) {
    redirect("/login?next=/signup/set-password");
  }

  if (!isLocalMode && session?.workspace) {
    redirect("/settings/connected-sites");
  }

  async function setPasswordAction(formData: FormData) {
    "use server";

    const authMode = getAuthMode();
    const password = formData.get("password")?.toString().trim() ?? "";

    if (authMode === "local") {
      redirect("/settings/connected-sites");
    }

    const currentSession = await getCurrentSession();

    if (!currentSession) {
      redirect("/login?next=/signup/set-password");
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("changethis_access_token")?.value
      ?? cookieStore.get("supabase-auth-token")?.value;

    if (!accessToken) {
      redirect("/login?next=/signup/set-password");
    }

    const updateResult = await updateSupabasePassword({
      accessToken,
      password
    });

    if (!updateResult.ok) {
      redirect(`/signup/set-password?error=${encodeURIComponent(updateResult.error)}`);
    }

    const workspace = currentSession.workspace ?? await createWorkspaceForUser({
      userId: currentSession.user.id,
      email: currentSession.user.email
    });

    if (!workspace) {
      redirect("/signup/set-password?error=workspace");
    }

    redirect("/settings/connected-sites");
  }

  return (
    <main className="auth-shell">
      <AppHeader showAuthLinks />

      <section className="auth-layout signup-layout">
        <div className="auth-copy">
          <p className="eyebrow"><T k="signup.setPassword.eyebrow" /></p>
          <h1><T k="signup.setPassword.title" /></h1>
          <p className="lede"><T k="signup.setPassword.lede" /></p>
          <div className="signup-proof-list" aria-label="Premières étapes">
            <span><T k="signup.proof.site" /></span>
            <span><T k="signup.proof.git" /></span>
            <span><T k="signup.proof.widget" /></span>
          </div>
        </div>

        <div className="auth-panel">
          {hasError ? (
            <div className="error-callout" role="alert">
              <strong><T k="signup.setPassword.error" /></strong>
            </div>
          ) : null}

          <form action={setPasswordAction} className="auth-form">
            <label>
              <T k="signup.setPassword.password" />
              <input autoComplete="new-password" minLength={8} name="password" required type="password" />
            </label>
            <p className="microcopy"><T k="signup.setPassword.copy" /></p>
            <button className="button" type="submit">
              <T k="signup.setPassword.submit" />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
