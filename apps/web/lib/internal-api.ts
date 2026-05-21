import { cookies, headers } from "next/headers";
import type { AuthSession, WorkspaceRole } from "./auth";

const DEFAULT_INTERNAL_API_URL = "http://back.toolprod:8000";
const INTERNAL_SESSION_COOKIE = "changethis_internal_session";

type InternalLoginResult =
  | {
      ok: true;
      accessToken: string;
      expiresIn?: number;
    }
  | {
      ok: false;
      error: "invalid" | "unavailable" | "missing";
    };

type InternalSessionResponse = {
  user?: {
    id?: unknown;
    email?: unknown;
  };
  workspace?: {
    id?: unknown;
    name?: unknown;
    role?: unknown;
  } | null;
};

export function getInternalApiUrl(): string {
  return (process.env.INTERNAL_API_URL ?? DEFAULT_INTERNAL_API_URL).replace(/\/$/, "");
}

export function isInternalApiConfigured(): boolean {
  return Boolean(process.env.INTERNAL_API_URL);
}

export async function probeInternalApi(path = "/ready"): Promise<boolean> {
  try {
    const response = await fetch(`${getInternalApiUrl()}${path}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function signInWithInternalPassword(input: {
  email: string;
  password: string;
}): Promise<InternalLoginResult> {
  if (!input.email || !input.password) {
    return { ok: false, error: "missing" };
  }

  try {
    const response = await fetch(`${getInternalApiUrl()}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input),
      cache: "no-store"
    });

    if (!response.ok) {
      return { ok: false, error: response.status === 401 ? "invalid" : "unavailable" };
    }

    const body = await response.json() as { access_token?: unknown };
    if (typeof body.access_token !== "string") {
      return { ok: false, error: "unavailable" };
    }

    return {
      ok: true,
      accessToken: body.access_token
    };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

export async function setInternalSessionCookie(accessToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(INTERNAL_SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
}

export async function getInternalCurrentSession(request?: Request): Promise<AuthSession | null> {
  const token = await readInternalSessionToken(request);
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${getInternalApiUrl()}/auth/session`, {
      headers: {
        Cookie: `${INTERNAL_SESSION_COOKIE}=${encodeURIComponent(token)}`,
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return normalizeInternalSession(await response.json() as InternalSessionResponse);
  } catch {
    return null;
  }
}

async function readInternalSessionToken(request?: Request): Promise<string | undefined> {
  const requestCookie = request?.headers.get("cookie");
  const tokenFromRequest = requestCookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${INTERNAL_SESSION_COOKIE}=`))
    ?.slice(INTERNAL_SESSION_COOKIE.length + 1);

  if (tokenFromRequest) {
    return decodeURIComponent(tokenFromRequest);
  }

  const authorization = request?.headers.get("authorization") ?? (await headers()).get("authorization");
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearerToken) {
    return bearerToken;
  }

  return (await cookies()).get(INTERNAL_SESSION_COOKIE)?.value;
}

function normalizeInternalSession(body: InternalSessionResponse): AuthSession | null {
  if (
    typeof body.user?.id !== "string"
    || typeof body.user.email !== "string"
  ) {
    return null;
  }

  const workspace = body.workspace
    && typeof body.workspace.id === "string"
    && typeof body.workspace.name === "string"
    && typeof body.workspace.role === "string"
    ? {
        id: body.workspace.id,
        name: body.workspace.name,
        role: toWorkspaceRole(body.workspace.role)
      }
    : null;

  return {
    user: {
      id: body.user.id,
      email: body.user.email
    },
    workspace
  };
}

function toWorkspaceRole(value: string): WorkspaceRole {
  return (value === "owner" || value === "admin" || value === "member" || value === "viewer")
    ? value
    : "viewer";
}
