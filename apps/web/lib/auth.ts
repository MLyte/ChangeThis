import { NextResponse } from "next/server";
import { getInternalCurrentSession } from "./internal-api";

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

const isProductionRuntime = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

export async function getCurrentSession(request?: Request): Promise<AuthSession | null> {
  if (getAuthMode() === "local") {
    if (isProductionRuntime) {
      return null;
    }

    return localDevSession;
  }

  if (getAuthMode() === "internal") {
    return getInternalCurrentSession(request);
  }

  return null;
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

export function getAuthMode(): "local" | "internal" {
  if (process.env.AUTH_MODE === "local" || process.env.AUTH_MODE === "internal") {
    return process.env.AUTH_MODE;
  }

  return process.env.NODE_ENV === "production" ? "internal" : "local";
}

export function isPublicSignupEnabled(): boolean {
  const signupFlag = process.env.ENABLE_PUBLIC_SIGNUP?.trim().toLowerCase();
  return signupFlag !== "false" && signupFlag !== "0";
}

function toWorkspaceRole(value: string): WorkspaceRole {
  return isWorkspaceRole(value) ? value : "viewer";
}

function isWorkspaceRole(value: string): value is WorkspaceRole {
  return value === "viewer" || value === "member" || value === "admin" || value === "owner";
}
