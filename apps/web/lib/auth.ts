import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { getFirstWorkspaceForUser, getSupabaseUser, isSupabaseAuthConfigured } from "./supabase-server";

export type WorkspaceRole = "viewer" | "member" | "admin" | "owner";

export const workspaceRoleOrder: Record<WorkspaceRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3
};

export type AuthSession = {
  user: {
    id: string;
    email: string;
  };
  workspace: {
    id: string;
    name: string;
    role: WorkspaceRole;
  } | null;
};

export type AuthFailure = {
  error: string;
  status: 401 | 403;
};

const localDevSession: AuthSession = {
  user: {
    id: "local-dev-user",
    email: "local-dev@changethis.test"
  },
  workspace: {
    id: "workspace_changethis_local",
    name: "ChangeThis Local",
    role: "owner"
  }
};

export async function getCurrentSession(request?: Request): Promise<AuthSession | null> {
  if (getAuthMode() === "local") {
    return localDevSession;
  }

  if (!isSupabaseAuthConfigured()) {
    return null;
  }

  const accessToken = await readAccessToken(request);

  if (!accessToken) {
    return null;
  }

  const user = await getSupabaseUser(accessToken);

  if (!user) {
    return null;
  }

  const workspace = await getFirstWorkspaceForUser(user.id);

  if (!workspace) {
    return {
      user: {
        id: user.id,
        email: user.email ?? "unknown@changethis.local"
      },
      workspace: null
    };
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? "unknown@changethis.local"
    },
    workspace: {
      id: workspace.id,
      name: workspace.name,
      role: toWorkspaceRole(workspace.role)
    }
  };
}

export async function requireWorkspaceSession(request?: Request): Promise<AuthSession | AuthFailure> {
  const session = await getCurrentSession(request);

  if (!session) {
    return {
      error: "Authentication required",
      status: 401
    };
  }

  if (!session.workspace) {
    return {
      error: "Workspace access required",
      status: 403
    };
  }

  return session;
}

export function isAuthFailure(value: AuthSession | AuthFailure): value is AuthFailure {
  return "status" in value;
}

export function hasWorkspaceRole(session: AuthSession, roles: WorkspaceRole | WorkspaceRole[]): boolean {
  if (!session.workspace) {
    return false;
  }

  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  const currentRole = session.workspace.role;

  return requiredRoles.some((role) => workspaceRoleOrder[currentRole] >= workspaceRoleOrder[role]);
}

export function requireWorkspaceRole(
  sessionOrFailure: AuthSession | AuthFailure,
  roles: WorkspaceRole | WorkspaceRole[]
): AuthSession | AuthFailure {
  if (isAuthFailure(sessionOrFailure)) {
    return sessionOrFailure;
  }

  if (!sessionOrFailure.workspace) {
    return {
      error: "Workspace access required",
      status: 403
    };
  }

  if (!hasWorkspaceRole(sessionOrFailure, roles)) {
    return {
      error: "Insufficient workspace role",
      status: 403
    };
  }

  return sessionOrFailure;
}

export function authFailureResponse(failure: AuthFailure): NextResponse {
  return NextResponse.json({ error: failure.error }, { status: failure.status });
}

export function getAuthMode(): "local" | "supabase" {
  if (process.env.AUTH_MODE === "local" || process.env.AUTH_MODE === "supabase") {
    return process.env.AUTH_MODE;
  }

  return process.env.NODE_ENV === "production" ? "supabase" : "local";
}

function toWorkspaceRole(value: string): WorkspaceRole {
  return isWorkspaceRole(value) ? value : "viewer";
}

function isWorkspaceRole(value: string): value is WorkspaceRole {
  return value === "viewer" || value === "member" || value === "admin" || value === "owner";
}

async function readAccessToken(request?: Request): Promise<string | undefined> {
  const authorization = request?.headers.get("authorization") ?? (await headers()).get("authorization");
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (bearerToken) {
    return bearerToken;
  }

  const cookieStore = await cookies();
  return cookieStore.get("changethis_access_token")?.value
    ?? cookieStore.get("sb-access-token")?.value
    ?? cookieStore.get("supabase-auth-token")?.value;
}
