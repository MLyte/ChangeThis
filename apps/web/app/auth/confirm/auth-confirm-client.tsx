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

  return null;
}

function sanitizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/signup/set-password";
  }

  return value;
}
