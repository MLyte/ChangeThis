import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

type AuthCookieStore = {
  set(name: string, value: string, cookie: Partial<ResponseCookie>): void;
};

export function setSupabaseSessionCookies(input: {
  cookieStore: AuthCookieStore;
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number;
}) {
  const cookieConfig = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: input.expiresIn && Number.isFinite(input.expiresIn) && input.expiresIn > 0
      ? Math.floor(input.expiresIn)
      : 60 * 60
  };

  input.cookieStore.set("changethis_access_token", input.accessToken, cookieConfig);
  input.cookieStore.set("supabase-auth-token", input.accessToken, cookieConfig);

  if (input.refreshToken) {
    input.cookieStore.set("supabase-refresh-token", input.refreshToken, {
      ...cookieConfig,
      maxAge: 60 * 60 * 24 * 30
    });
  }
}
