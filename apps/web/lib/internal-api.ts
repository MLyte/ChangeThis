import { cookies, headers } from "next/headers";
import type { NextResponse } from "next/server";
import type { AuthSession, WorkspaceRole } from "./auth";

const DEFAULT_INTERNAL_API_URL = "http://127.0.0.1:8000";
export const INTERNAL_SESSION_COOKIE = "changethis_internal_session";

// Server-side calls to the internal API must never hang a request thread: if the
// API stalls (e.g. its DB path is wedged), a missing timeout turns into an nginx
// 504. Abort well before the proxy's read timeout so callers get a clean
// "unavailable" instead.
const INTERNAL_API_TIMEOUT_MS = Number(process.env.INTERNAL_API_TIMEOUT_MS ?? 12_000);

function internalApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${getInternalApiUrl()}${path}`, {
    ...init,
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(INTERNAL_API_TIMEOUT_MS)
  });
}

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

type InternalSignUpResult =
  | {
      ok: true;
      accessToken: string;
    }
  | {
      ok: false;
      error: "disabled" | "duplicate" | "invalid" | "unavailable" | "missing";
    };

type InternalChangePasswordResult =
  | {
      ok: true;
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

export type InternalWorkspaceMember = {
  userId: string;
  email: string;
  role: WorkspaceRole;
  status: "invited" | "active" | "disabled";
  joinedAt?: string;
};

type InternalWorkspaceMemberResponse = {
  user_id?: unknown;
  email?: unknown;
  role?: unknown;
  status?: unknown;
  created_at?: unknown;
};

export function getInternalApiUrl(): string {
  return (process.env.INTERNAL_API_URL ?? DEFAULT_INTERNAL_API_URL).replace(/\/$/, "");
}

export function isInternalApiConfigured(): boolean {
  return Boolean(process.env.INTERNAL_API_URL);
}

export async function probeInternalApi(path = "/ready"): Promise<boolean> {
  try {
    const response = await internalApiFetch(path, {
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
    const response = await internalApiFetch("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
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

export async function signUpWithInternalPassword(input: {
  email: string;
  password: string;
  workspaceName: string;
}): Promise<InternalSignUpResult> {
  if (!input.email || !input.password || !input.workspaceName) {
    return { ok: false, error: "missing" };
  }

  try {
    const response = await internalApiFetch("/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        workspace_name: input.workspaceName
      })
    });

    if (!response.ok) {
      if (response.status === 403) {
        return { ok: false, error: "disabled" };
      }

      if (response.status === 409) {
        return { ok: false, error: "duplicate" };
      }

      if (response.status === 422) {
        return { ok: false, error: "invalid" };
      }

      return { ok: false, error: "unavailable" };
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

export function setInternalSessionCookieOnResponse(response: NextResponse, accessToken: string): void {
  response.cookies.set(INTERNAL_SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
}

export async function logoutInternalSession(request?: Request): Promise<void> {
  const cookieHeader = await getInternalSessionCookieHeader(request);
  if (!cookieHeader) {
    return;
  }

  try {
    await internalApiFetch("/auth/logout", {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        Accept: "application/json"
      }
    });
  } catch {
    // Logout must still clear the browser cookie when the internal API is unavailable.
  }
}

export async function changeInternalPassword(input: {
  currentPassword: string;
  newPassword: string;
}, request?: Request): Promise<InternalChangePasswordResult> {
  const token = await readInternalSessionToken(request);
  if (!token || !input.currentPassword || input.newPassword.length < 8) {
    return { ok: false, error: "missing" };
  }

  try {
    const response = await internalApiFetch("/auth/password", {
      method: "POST",
      headers: {
        Cookie: `${INTERNAL_SESSION_COOKIE}=${encodeURIComponent(token)}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        current_password: input.currentPassword,
        new_password: input.newPassword
      })
    });

    if (!response.ok) {
      return { ok: false, error: response.status === 401 ? "invalid" : "unavailable" };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

export async function listInternalWorkspaceMembers(workspaceId: string): Promise<InternalWorkspaceMember[]> {
  const cookieHeader = await getInternalSessionCookieHeader();
  if (!workspaceId || !cookieHeader) {
    return [];
  }

  try {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    const response = await internalApiFetch(`/workspace/members?${params.toString()}`, {
      headers: {
        Cookie: cookieHeader,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return [];
    }

    const body = await response.json() as InternalWorkspaceMemberResponse[];
    return body.flatMap(normalizeInternalWorkspaceMember);
  } catch {
    return [];
  }
}

export async function addInternalWorkspaceMember(input: {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
}, request?: Request): Promise<{ ok: true; member: InternalWorkspaceMember } | { ok: false; error: "already_active" | "not_found" | "invalid" | "unavailable" | "missing" }> {
  const cookieHeader = await getInternalSessionCookieHeader(request);
  if (!cookieHeader || !input.workspaceId || !input.email) {
    return { ok: false, error: "missing" };
  }

  try {
    const response = await internalApiFetch("/workspace/members", {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        workspace_id: input.workspaceId,
        email: input.email,
        role: input.role
      })
    });

    if (!response.ok) {
      return {
        ok: false,
        error: response.status === 409
          ? "already_active"
          : response.status === 404
            ? "not_found"
            : response.status === 422 || response.status === 403
              ? "invalid"
              : "unavailable"
      };
    }

    const [member] = normalizeInternalWorkspaceMember(await response.json() as InternalWorkspaceMemberResponse);
    return member ? { ok: true, member } : { ok: false, error: "unavailable" };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

export async function disableInternalWorkspaceMember(input: {
  workspaceId: string;
  userId: string;
}, request?: Request): Promise<{ ok: true; member: InternalWorkspaceMember } | { ok: false; error: "invalid" | "not_found" | "unavailable" | "missing" }> {
  const cookieHeader = await getInternalSessionCookieHeader(request);
  if (!cookieHeader || !input.workspaceId || !input.userId) {
    return { ok: false, error: "missing" };
  }

  try {
    const response = await internalApiFetch("/workspace/members", {
      method: "PATCH",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        workspace_id: input.workspaceId,
        user_id: input.userId,
        status: "disabled"
      })
    });

    if (!response.ok) {
      return { ok: false, error: response.status === 404 ? "not_found" : response.status === 400 || response.status === 422 || response.status === 403 ? "invalid" : "unavailable" };
    }

    const [member] = normalizeInternalWorkspaceMember(await response.json() as InternalWorkspaceMemberResponse);
    return member ? { ok: true, member } : { ok: false, error: "unavailable" };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

export async function getInternalSessionCookieHeader(request?: Request): Promise<string | undefined> {
  const token = await readInternalSessionToken(request);
  return token ? `${INTERNAL_SESSION_COOKIE}=${encodeURIComponent(token)}` : undefined;
}

export async function getInternalCurrentSession(request?: Request): Promise<AuthSession | null> {
  const cookieHeader = await getInternalSessionCookieHeader(request);
  if (!cookieHeader) {
    return null;
  }

  try {
    const response = await internalApiFetch("/auth/session", {
      headers: {
        Cookie: cookieHeader,
        Accept: "application/json"
      }
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

  const authorization = request
    ? request.headers.get("authorization")
    : (await headers()).get("authorization");
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearerToken) {
    return bearerToken;
  }

  if (request) {
    return undefined;
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

function normalizeInternalWorkspaceMember(body: InternalWorkspaceMemberResponse): InternalWorkspaceMember[] {
  if (
    typeof body.user_id !== "string"
    || typeof body.email !== "string"
    || typeof body.role !== "string"
    || typeof body.status !== "string"
  ) {
    return [];
  }

  const role = toWorkspaceRole(body.role);
  const status = body.status === "invited" || body.status === "active" || body.status === "disabled" ? body.status : "disabled";
  return [{
    userId: body.user_id,
    email: body.email,
    role,
    status,
    joinedAt: typeof body.created_at === "string" ? body.created_at : undefined
  }];
}

function toWorkspaceRole(value: string): WorkspaceRole {
  return (value === "owner" || value === "admin" || value === "member" || value === "viewer")
    ? value
    : "viewer";
}
