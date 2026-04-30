"use client";

import { useEffect } from "react";
import { T } from "../../i18n";

export default function AuthConfirmPage() {
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ""));
    const nextPath = sanitizeNextPath(currentUrl.searchParams.get("next"));
    const accessToken = hashParams.get("access_token") ?? currentUrl.searchParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token") ?? currentUrl.searchParams.get("refresh_token");
    const expiresIn = hashParams.get("expires_in") ?? currentUrl.searchParams.get("expires_in");
    const error = hashParams.get("error") ?? currentUrl.searchParams.get("error");
    const callbackUrl = new URL("/api/auth/callback", window.location.origin);

    callbackUrl.searchParams.set("next", nextPath);

    if (error) {
      callbackUrl.searchParams.set("error", error);
    }

    if (accessToken) {
      callbackUrl.searchParams.set("access_token", accessToken);
    }

    if (refreshToken) {
      callbackUrl.searchParams.set("refresh_token", refreshToken);
    }

    if (expiresIn) {
      callbackUrl.searchParams.set("expires_in", expiresIn);
    }

    window.location.replace(callbackUrl.toString());
  }, []);

  return (
    <main className="auth-shell">
      <section className="auth-layout">
        <div className="auth-copy">
          <p className="eyebrow"><T k="signup.setPassword.eyebrow" /></p>
          <h1><T k="auth.confirm.title" /></h1>
          <p className="lede"><T k="auth.confirm.copy" /></p>
        </div>
      </section>
    </main>
  );
}

function sanitizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/signup/set-password";
  }

  return value;
}
