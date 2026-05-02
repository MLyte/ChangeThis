"use client";

import { useEffect } from "react";

export function AuthConfirmClient() {
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ""));
    const nextPath = sanitizeNextPath(currentUrl.searchParams.get("next"));
    const accessToken = hashParams.get("access_token") ?? currentUrl.searchParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token") ?? currentUrl.searchParams.get("refresh_token");
    const expiresIn = hashParams.get("expires_in") ?? currentUrl.searchParams.get("expires_in");
    const error = hashParams.get("error") ?? currentUrl.searchParams.get("error");

    if (error) {
      const callbackUrl = new URL("/api/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);
      callbackUrl.searchParams.set("error", error);
      window.location.replace(callbackUrl.toString());
      return;
    }

    if (!accessToken) {
      const callbackUrl = new URL("/api/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);
      window.location.replace(callbackUrl.toString());
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
        next: nextPath
      })
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as { redirectTo?: string } | null;
        window.location.replace(body?.redirectTo ?? nextPath);
      })
      .catch(() => {
        window.location.replace(`/login?error=callback&next=${encodeURIComponent(nextPath)}`);
      });
  }, []);

  return null;
}

function sanitizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/signup/set-password";
  }

  return value;
}
