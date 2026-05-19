"use client";

import { useEffect, useState } from "react";

export function AuthConfirmClient() {
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ""));
    const nextPath = sanitizeNextPath(currentUrl.searchParams.get("next"));
    const accessToken = hashParams.get("access_token") ?? currentUrl.searchParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token") ?? currentUrl.searchParams.get("refresh_token");
    const expiresIn = hashParams.get("expires_in") ?? currentUrl.searchParams.get("expires_in");
    const confirmationUrl = sanitizeConfirmationUrl(currentUrl.searchParams.get("confirmation_url"));
    const tokenHash = currentUrl.searchParams.get("token_hash");
    const type = currentUrl.searchParams.get("type");
    const error = hashParams.get("error") ?? currentUrl.searchParams.get("error");

    if (error) {
      const callbackUrl = new URL("/api/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);
      callbackUrl.searchParams.set("error", error);
      window.location.replace(callbackUrl.toString());
      return;
    }

    if (confirmationUrl) {
      setCallbackUrl(confirmationUrl);
      return;
    }

    if (!accessToken && !tokenHash) {
      const callbackUrl = new URL("/api/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);
      window.location.replace(callbackUrl.toString());
      return;
    }

    if (tokenHash) {
      const callbackUrl = new URL("/api/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("token_hash", tokenHash);
      callbackUrl.searchParams.set("type", type ?? "email");
      callbackUrl.searchParams.set("next", nextPath);
      setCallbackUrl(callbackUrl.toString());
      return;
    }

    void fetch("/api/auth/callback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        accessToken,
        refreshToken,
        expiresIn,
        tokenHash,
        type,
        next: nextPath
      })
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("auth_callback_failed");
        }

        const body = await response.json().catch(() => null) as { redirectTo?: string } | null;
        window.location.replace(body?.redirectTo ?? nextPath);
      })
      .catch(() => {
        window.location.replace(`/login?error=callback&next=${encodeURIComponent(nextPath)}`);
      });
  }, []);

  if (!callbackUrl) {
    return null;
  }

  return (
    <div className="auth-panel" aria-label="Finaliser la vérification">
      <div className="local-mode-callout" role="status">
        <strong>Adresse e-mail prête à être vérifiée</strong>
        <span>Finalisez la vérification pour choisir votre mot de passe.</span>
      </div>
      <button
        className="button"
        type="button"
        onClick={() => {
          window.location.replace(callbackUrl);
        }}
      >
        Finaliser mon accès
      </button>
    </div>
  );
}

function sanitizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/signup/set-password";
  }

  return value;
}

function sanitizeConfirmationUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || url.origin !== new URL(supabaseUrl).origin) {
      return null;
    }

    if (url.pathname !== "/auth/v1/verify") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
